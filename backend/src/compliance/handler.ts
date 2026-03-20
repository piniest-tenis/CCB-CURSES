// backend/src/compliance/handler.ts
// Lambda handler for /compliance/* routes.
// GDPR/CCPA account operations:
//   GET    /compliance/export   — export all user data (profile, characters, media records)
//   DELETE /compliance/account  — permanently delete all user data + Cognito account
//
// Both routes are self-service (caller acts on their own account) and require a JWT.

import type {
  APIGatewayProxyEventV2WithJWTAuthorizer,
  APIGatewayProxyResultV2,
} from "aws-lambda";
import {
  CognitoIdentityProviderClient,
  AdminDeleteUserCommand,
  AdminGetUserCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import {
  createSuccessResponse,
  createErrorResponse,
  extractUserId,
  withErrorHandling,
} from "../common/middleware";
import {
  docClient,
  getItem,
  deleteItem,
  queryItems,
  USERS_TABLE,
  CHARACTERS_TABLE,
  MEDIA_TABLE,
  keys,
} from "../common/dynamodb";
import {
  BatchWriteCommand,
} from "@aws-sdk/lib-dynamodb";
import type { Character, MediaRecord } from "@shared/types";

// ─── Cognito Client ───────────────────────────────────────────────────────────

const cognitoClient = new CognitoIdentityProviderClient({
  region: process.env["AWS_REGION"] ?? "us-east-1",
});

const USER_POOL_ID = process.env["COGNITO_USER_POOL_ID"] ?? "";

// ─── Internal Types ───────────────────────────────────────────────────────────

interface UserDynamoRecord {
  PK: string;
  SK: string;
  userId: string;
  email: string;
  displayName: string;
  avatarKey: string | null;
  preferences: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

interface CharacterDynamoRecord extends Character {
  PK: string;
  SK: string;
}

interface MediaDynamoRecord extends MediaRecord {
  PK: string;
  SK: string;
  status: "pending" | "confirmed";
  updatedAt: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Fetch all items for a user from a table where PK = USER#<userId>
 * and SK begins with a given prefix. Auto-paginates.
 */
async function fetchAllUserItems<T>(
  tableName: string,
  userId: string,
  skPrefix: string
): Promise<T[]> {
  return queryItems<T>(
    tableName,
    "PK = :pk AND begins_with(SK, :skPrefix)",
    { ":pk": `USER#${userId}`, ":skPrefix": skPrefix },
    undefined,
    undefined,
    undefined
  );
}

/**
 * Delete all items for a user from a table in batches of 25.
 * Returns the count of deleted items.
 */
async function deleteAllUserItems(
  tableName: string,
  userId: string,
  skPrefix: string
): Promise<number> {
  // We need both PK and SK to build delete requests, so query first.
  const items = await queryItems<{ PK: string; SK: string }>(
    tableName,
    "PK = :pk AND begins_with(SK, :skPrefix)",
    { ":pk": `USER#${userId}`, ":skPrefix": skPrefix },
    undefined,
    undefined,
    undefined
  );

  if (items.length === 0) return 0;

  const CHUNK_SIZE = 25;
  for (let i = 0; i < items.length; i += CHUNK_SIZE) {
    const chunk = items.slice(i, i + CHUNK_SIZE);
    let unprocessed = chunk.map((item) => ({
      DeleteRequest: { Key: { PK: item.PK, SK: item.SK } },
    }));
    let delay = 100;

    do {
      const result = await docClient.send(
        new BatchWriteCommand({
          RequestItems: { [tableName]: unprocessed },
        })
      );
      const leftover = result.UnprocessedItems?.[tableName];
      unprocessed = (leftover ?? []) as typeof unprocessed;
      if (unprocessed.length > 0) {
        await new Promise<void>((r) => setTimeout(r, delay));
        delay = Math.min(delay * 2, 3000);
      }
    } while (unprocessed.length > 0);
  }

  return items.length;
}

// ─── Route Handlers ───────────────────────────────────────────────────────────

/**
 * GET /compliance/export
 * Returns all data stored for the authenticated user:
 *   - Cognito account attributes
 *   - DynamoDB profile record
 *   - All character records
 *   - All media records
 *
 * The response is a single JSON object — callers should save it as a file.
 */
async function exportUserData(
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> {
  const userId = extractUserId(event);

  // Fetch all data sources concurrently
  const [cognitoUser, profile, characters, mediaRecords] = await Promise.all([
    // Cognito account info (best effort — may be missing in edge cases)
    cognitoClient
      .send(
        new AdminGetUserCommand({
          UserPoolId: USER_POOL_ID,
          Username: userId,
        })
      )
      .catch(() => null),

    // DynamoDB profile
    getItem<UserDynamoRecord>(USERS_TABLE, keys.user(userId)),

    // All characters
    fetchAllUserItems<CharacterDynamoRecord>(
      CHARACTERS_TABLE,
      userId,
      "CHARACTER#"
    ),

    // All media records
    fetchAllUserItems<MediaDynamoRecord>(MEDIA_TABLE, userId, "MEDIA#"),
  ]);

  // Strip DynamoDB internal keys from the exported payload
  const cleanCharacters = characters.map(({ PK: _PK, SK: _SK, ...rest }) => rest);
  const cleanMedia = mediaRecords.map(({ PK: _PK, SK: _SK, ...rest }) => rest);

  const cognitoAttrs: Record<string, string> = {};
  for (const attr of cognitoUser?.UserAttributes ?? []) {
    if (attr.Name) cognitoAttrs[attr.Name] = attr.Value ?? "";
  }

  const exportPayload = {
    exportedAt: new Date().toISOString(),
    userId,
    cognito: cognitoUser
      ? {
          username: cognitoUser.Username ?? userId,
          status: cognitoUser.UserStatus ?? null,
          enabled: cognitoUser.Enabled ?? true,
          createdAt: cognitoUser.UserCreateDate?.toISOString() ?? null,
          updatedAt: cognitoUser.UserLastModifiedDate?.toISOString() ?? null,
          attributes: cognitoAttrs,
        }
      : null,
    profile: profile
      ? {
          userId: profile.userId,
          email: profile.email,
          displayName: profile.displayName,
          avatarKey: profile.avatarKey,
          preferences: profile.preferences,
          createdAt: profile.createdAt,
          updatedAt: profile.updatedAt,
        }
      : null,
    characters: cleanCharacters,
    media: cleanMedia,
    summary: {
      characterCount: cleanCharacters.length,
      mediaCount: cleanMedia.length,
    },
  };

  return createSuccessResponse(exportPayload);
}

/**
 * DELETE /compliance/account
 * Permanently and irreversibly deletes all user data:
 *   1. All character records from the characters table
 *   2. All media records from the media table (S3 objects are NOT deleted here —
 *      a separate S3 lifecycle rule or background job should handle orphaned objects)
 *   3. The user profile from the users table
 *   4. The Cognito user account
 *
 * Returns a summary of what was deleted. 204 is not used so the caller can
 * confirm the deletion counts.
 */
async function deleteAccount(
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> {
  const userId = extractUserId(event);

  // Step 1 & 2: Delete characters and media records concurrently
  const [deletedCharacters, deletedMedia] = await Promise.all([
    deleteAllUserItems(CHARACTERS_TABLE, userId, "CHARACTER#"),
    deleteAllUserItems(MEDIA_TABLE, userId, "MEDIA#"),
  ]);

  // Step 3: Delete user profile (single item)
  let profileDeleted = false;
  try {
    await deleteItem(USERS_TABLE, keys.user(userId));
    profileDeleted = true;
  } catch (err: unknown) {
    console.warn("Failed to delete user profile during account deletion:", userId, err);
  }

  // Step 4: Delete Cognito user account (best effort)
  let cognitoDeleted = false;
  try {
    await cognitoClient.send(
      new AdminDeleteUserCommand({
        UserPoolId: USER_POOL_ID,
        Username: userId,
      })
    );
    cognitoDeleted = true;
  } catch (err: unknown) {
    const awsErr = err as { name?: string };
    if (awsErr.name === "UserNotFoundException") {
      cognitoDeleted = true; // already gone
    } else {
      // Log but don't fail — DynamoDB data is already deleted
      console.error("Failed to delete Cognito user during account deletion:", userId, err);
    }
  }

  return createSuccessResponse({
    userId,
    deletedAt: new Date().toISOString(),
    deleted: {
      characters: deletedCharacters,
      mediaRecords: deletedMedia,
      profile: profileDeleted,
      cognitoAccount: cognitoDeleted,
    },
    warning: cognitoDeleted
      ? null
      : "Cognito account deletion failed. Please contact support to complete removal.",
  });
}

// ─── Route Dispatcher ─────────────────────────────────────────────────────────

export const handler = withErrorHandling(
  async (
    event: APIGatewayProxyEventV2WithJWTAuthorizer
  ): Promise<APIGatewayProxyResultV2> => {
    const routeKey = event.routeKey;

    switch (routeKey) {
      case "GET /compliance/export":
        return exportUserData(event);
      case "DELETE /compliance/account":
        return deleteAccount(event);
      default:
        return createErrorResponse("NOT_FOUND", "Route not found", 404);
    }
  }
);
