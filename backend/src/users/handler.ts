// backend/src/users/handler.ts
// Lambda handler for /users/* routes.
// Manages user profiles — creates on first login, updates display name and preferences.

import type {
  APIGatewayProxyEventV2WithJWTAuthorizer,
  APIGatewayProxyResultV2,
} from "aws-lambda";
import { z } from "zod";
import {
  AppError,
  createSuccessResponse,
  createErrorResponse,
  extractUserId,
  extractEmail,
  parseBody,
  withErrorHandling,
} from "../common/middleware";
import {
  getItem,
  putItem,
  updateItem,
  deleteItem,
  USERS_TABLE,
  keys,
} from "../common/dynamodb";
import type { UserProfile, UserPreferences } from "@shared/types";

// ─── DynamoDB Record Shape ────────────────────────────────────────────────────

interface UserDynamoRecord {
  PK: string;
  SK: string;
  userId: string;
  email: string;
  displayName: string;
  avatarKey: string | null;
  preferences: UserPreferences;
  createdAt: string;
  updatedAt: string;
}

// ─── Zod Schemas ──────────────────────────────────────────────────────────────

const DieColorPairSchema = z.object({
  diceColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  labelColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
});

const DiceColorPrefsSchema = z.object({
  hope: DieColorPairSchema.optional(),
  fear: DieColorPairSchema.optional(),
  general: DieColorPairSchema.optional(),
});

const UpdateUserSchema = z.object({
  displayName: z
    .string()
    .min(1, "Display name cannot be empty")
    .max(50, "Display name must be 50 characters or fewer")
    .optional(),
  preferences: z
    .object({
      theme: z.enum(["dark", "light", "system"]).optional(),
      defaultDiceStyle: z.string().min(1).optional(),
      diceColors: DiceColorPrefsSchema.optional(),
    })
    .optional(),
});

// ─── Defaults ─────────────────────────────────────────────────────────────────

const DEFAULT_PREFERENCES: UserPreferences = {
  theme: "system",
  defaultDiceStyle: "standard",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildAvatarUrl(avatarKey: string | null | undefined): string | null {
  if (!avatarKey) return null;
  const cdnBase =
    process.env["CDN_BASE_URL"] ?? "https://cdn.curses-ccb.example.com";
  return `${cdnBase}/${avatarKey}`;
}

function toUserProfile(record: UserDynamoRecord): UserProfile {
  return {
    userId: record.userId,
    email: record.email,
    displayName: record.displayName,
    avatarUrl: buildAvatarUrl(record.avatarKey),
    preferences: {
      theme: record.preferences?.theme ?? DEFAULT_PREFERENCES.theme,
      defaultDiceStyle:
        record.preferences?.defaultDiceStyle ??
        DEFAULT_PREFERENCES.defaultDiceStyle,
      ...(record.preferences?.diceColors !== undefined
        ? { diceColors: record.preferences.diceColors }
        : {}),
    },
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

function deriveDisplayName(email: string): string {
  return email.split("@")[0] ?? "Adventurer";
}

// ─── Route Handlers ───────────────────────────────────────────────────────────

/**
 * GET /users/me
 * Returns the current user's profile. Creates the profile record on first login
 * using the JWT claims (upsert-on-read pattern).
 */
async function getMe(
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> {
  const userId = extractUserId(event);

  let record = await getItem<UserDynamoRecord>({
    TableName: USERS_TABLE,
    Key: keys.user(userId),
  });

  if (!record) {
    const email = extractEmail(event) ?? "";
    const now = new Date().toISOString();

    record = {
      PK: `USER#${userId}`,
      SK: "PROFILE",
      userId,
      email,
      displayName: deriveDisplayName(email),
      avatarKey: null,
      preferences: { ...DEFAULT_PREFERENCES },
      createdAt: now,
      updatedAt: now,
    };

    try {
      await putItem({
        TableName: USERS_TABLE,
        Item: record,
        // Guard against a concurrent first-login race
        ConditionExpression:
          "attribute_not_exists(PK) AND attribute_not_exists(SK)",
      });
    } catch (err: unknown) {
      // ConditionalCheckFailedException — another request already created it; re-fetch
      const awsErr = err as { name?: string };
      if (awsErr.name === "ConditionalCheckFailedException") {
        const existing = await getItem<UserDynamoRecord>({
          TableName: USERS_TABLE,
          Key: keys.user(userId),
        });
        if (!existing) throw AppError.internal("Failed to create user profile");
        record = existing;
      } else {
        throw err;
      }
    }
  }

  return createSuccessResponse(toUserProfile(record));
}

/**
 * PUT /users/me
 * Partially update the current user's displayName and/or preferences.
 * Returns the full updated profile. Creates the profile if it doesn't yet exist.
 */
async function updateMe(
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> {
  const userId = extractUserId(event);
  const { displayName, preferences: prefPatch } = parseBody(
    event,
    UpdateUserSchema
  );

  if (!displayName && !prefPatch) {
    throw AppError.badRequest(
      "At least one of displayName or preferences must be provided"
    );
  }

  // Fetch existing record; create on first access (edge case where GET /me was never called)
  let existing = await getItem<UserDynamoRecord>({
    TableName: USERS_TABLE,
    Key: keys.user(userId),
  });

  const now = new Date().toISOString();

  if (!existing) {
    const email = extractEmail(event) ?? "";
    existing = {
      PK: `USER#${userId}`,
      SK: "PROFILE",
      userId,
      email,
      displayName: displayName ?? deriveDisplayName(email),
      avatarKey: null,
      preferences: { ...DEFAULT_PREFERENCES },
      createdAt: now,
      updatedAt: now,
    };
    await putItem({ TableName: USERS_TABLE, Item: existing });
  }

  // Build a dynamic update expression — only touch fields provided in the patch
  const setExpressions: string[] = ["updatedAt = :now"];
  const expressionAttributeValues: Record<string, unknown> = { ":now": now };
  const expressionAttributeNames: Record<string, string> = {};

  if (displayName !== undefined) {
    setExpressions.push("displayName = :displayName");
    expressionAttributeValues[":displayName"] = displayName;
  }

  if (prefPatch) {
    // Merge individual preference keys without clobbering unrelated ones
    if (prefPatch.theme !== undefined) {
      setExpressions.push("preferences.#theme = :theme");
      expressionAttributeNames["#theme"] = "theme";
      expressionAttributeValues[":theme"] = prefPatch.theme;
    }
    if (prefPatch.defaultDiceStyle !== undefined) {
      setExpressions.push(
        "preferences.defaultDiceStyle = :diceStyle"
      );
      expressionAttributeValues[":diceStyle"] = prefPatch.defaultDiceStyle;
    }
    if (prefPatch.diceColors !== undefined) {
      setExpressions.push("preferences.diceColors = :diceColors");
      expressionAttributeValues[":diceColors"] = prefPatch.diceColors;
    }
  }

  const updateResult = await updateItem({
    TableName: USERS_TABLE,
    Key: keys.user(userId),
    UpdateExpression: `SET ${setExpressions.join(", ")}`,
    ExpressionAttributeValues: expressionAttributeValues,
    ...(Object.keys(expressionAttributeNames).length > 0
      ? { ExpressionAttributeNames: expressionAttributeNames }
      : {}),
    ReturnValues: "ALL_NEW",
    ConditionExpression: "attribute_exists(PK)",
  });

  // Use the returned attributes to avoid a second GetItem round-trip
  const updated =
    (updateResult.Attributes as UserDynamoRecord | undefined) ?? {
      ...existing,
      ...(displayName !== undefined ? { displayName } : {}),
      preferences: {
        ...existing.preferences,
        ...(prefPatch?.theme !== undefined
          ? { theme: prefPatch.theme }
          : {}),
        ...(prefPatch?.defaultDiceStyle !== undefined
          ? { defaultDiceStyle: prefPatch.defaultDiceStyle }
          : {}),
        ...(prefPatch?.diceColors !== undefined
          ? { diceColors: prefPatch.diceColors }
          : {}),
      },
      updatedAt: now,
    };

  return createSuccessResponse(toUserProfile(updated));
}

/**
 * PATCH /users/me
 * Alias for PUT /users/me — same partial-update logic, different HTTP verb.
 * Provided for clients that prefer PATCH semantics for partial updates.
 */
async function patchMe(
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> {
  return updateMe(event);
}

/**
 * DELETE /users/me
 * Soft-deletes the user's DynamoDB profile record.
 * Does NOT remove the Cognito account or cascade to characters/media —
 * use DELETE /compliance/account for full GDPR erasure.
 */
async function deleteMe(
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> {
  const userId = extractUserId(event);

  const existing = await getItem<UserDynamoRecord>({
    TableName: USERS_TABLE,
    Key: keys.user(userId),
  });

  if (!existing) {
    // Already gone — idempotent success
    return { statusCode: 204, body: "" };
  }

  await deleteItem({
    TableName: USERS_TABLE,
    Key: keys.user(userId),
    ConditionExpression: "attribute_exists(PK)",
  });

  return { statusCode: 204, body: "" };
}

// ─── Route Dispatcher ─────────────────────────────────────────────────────────

export const handler = withErrorHandling(
  async (
    event: APIGatewayProxyEventV2WithJWTAuthorizer
  ): Promise<APIGatewayProxyResultV2> => {
    const routeKey = event.routeKey;

    switch (routeKey) {
      case "GET /users/me":
        return getMe(event);
      case "PUT /users/me":
        return updateMe(event);
      case "PATCH /users/me":
        return patchMe(event);
      case "DELETE /users/me":
        return deleteMe(event);
      default:
        return createErrorResponse("NOT_FOUND", "Route not found", 404);
    }
  }
);
