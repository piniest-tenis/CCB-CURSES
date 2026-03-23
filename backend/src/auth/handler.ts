// backend/src/auth/handler.ts
// Lambda handler for /admin/auth/* routes.
// Cognito admin operations — for internal/admin use only.
// All routes require a JWT with the "admin" group claim.
//
// Routes (all protected by JWT + admin group check):
//   GET    /admin/auth/users              — paginated user list
//   GET    /admin/auth/users/{userId}     — get a single user
//   POST   /admin/auth/users/{userId}/confirm          — admin confirm sign-up
//   POST   /admin/auth/users/{userId}/reset-password   — admin reset password
//   DELETE /admin/auth/users/{userId}     — admin delete user from Cognito + profile

import type {
  APIGatewayProxyEventV2WithJWTAuthorizer,
  APIGatewayProxyResultV2,
} from "aws-lambda";
import {
  CognitoIdentityProviderClient,
  AdminGetUserCommand,
  AdminConfirmSignUpCommand,
  AdminResetUserPasswordCommand,
  AdminDeleteUserCommand,
  ListUsersCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import {
  AppError,
  createSuccessResponse,
  createErrorResponse,
  extractUserId,
  requirePathParam,
  getQueryParam,
  getQueryParamInt,
  withErrorHandling,
} from "../common/middleware";
import { deleteItem, getItem, USERS_TABLE, keys } from "../common/dynamodb";

// ─── Cognito Client ───────────────────────────────────────────────────────────

const cognitoClient = new CognitoIdentityProviderClient({
  region: process.env["AWS_REGION"] ?? "us-east-1",
});

const USER_POOL_ID =
  process.env["COGNITO_USER_POOL_ID"] ?? "";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Assert the caller is a member of the Cognito "admin" group.
 * The JWT authorizer populates cognito:groups as a space-delimited string.
 */
function requireAdminGroup(
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): void {
  const claims = event.requestContext?.authorizer?.jwt?.claims;
  if (!claims) throw AppError.unauthorized();

  // API GW HTTP API v2 serialises Cognito group arrays as "[group1 group2]" —
  // literal square brackets around space-separated values. Strip them before splitting.
  const raw = claims["cognito:groups"];
  let groups: string[] = [];

  if (Array.isArray(raw)) {
    // Native array — pass through directly
    groups = raw.map(String);
  } else if (typeof raw === "string") {
    const stripped = raw.trim().replace(/^\[|\]$/g, "");
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        groups = parsed.map(String);
      } else {
        groups = stripped.split(/[\s,]+/).filter(Boolean);
      }
    } catch {
      groups = stripped.split(/[\s,]+/).filter(Boolean);
    }
  }

  if (!groups.includes("admin")) {
    throw AppError.forbidden("Admin group membership is required");
  }
}

/** Map a Cognito UserType attribute array to a plain object. */
function attrsToObject(
  attributes?: Array<{ Name?: string; Value?: string }>
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const attr of attributes ?? []) {
    if (attr.Name) result[attr.Name] = attr.Value ?? "";
  }
  return result;
}

// ─── Route Handlers ───────────────────────────────────────────────────────────

/**
 * GET /admin/auth/users
 * Returns a paginated list of Cognito users.
 * Query params: limit (1–60, default 20), paginationToken (opaque cursor)
 */
async function listUsers(
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> {
  requireAdminGroup(event);

  const limit = Math.min(
    Math.max(getQueryParamInt(event, "limit", 20) ?? 20, 1),
    60
  );
  const paginationToken = getQueryParam(event, "paginationToken");

  const response = await cognitoClient.send(
    new ListUsersCommand({
      UserPoolId: USER_POOL_ID,
      Limit: limit,
      ...(paginationToken ? { PaginationToken: paginationToken } : {}),
    })
  );

  const users = (response.Users ?? []).map((u) => {
    const attrs = attrsToObject(u.Attributes);
    return {
      userId: attrs["sub"] ?? "",
      email: attrs["email"] ?? "",
      displayName: attrs["custom:displayName"] ?? "",
      status: u.UserStatus ?? "UNKNOWN",
      enabled: u.Enabled ?? true,
      createdAt: u.UserCreateDate?.toISOString() ?? null,
      updatedAt: u.UserLastModifiedDate?.toISOString() ?? null,
    };
  });

  return createSuccessResponse({
    users,
    paginationToken: response.PaginationToken ?? null,
  });
}

/**
 * GET /admin/auth/users/{userId}
 * Returns details for a single Cognito user by their sub (userId).
 */
async function getUser(
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> {
  requireAdminGroup(event);
  const userId = requirePathParam(event, "userId");

  // Cognito AdminGetUser requires a username — for email-based pools the
  // username equals the sub. We attempt the sub first, then fall through.
  let cognitoUser;
  try {
    cognitoUser = await cognitoClient.send(
      new AdminGetUserCommand({
        UserPoolId: USER_POOL_ID,
        Username: userId,
      })
    );
  } catch (err: unknown) {
    const awsErr = err as { name?: string };
    if (awsErr.name === "UserNotFoundException") {
      throw AppError.notFound("User", userId);
    }
    throw err;
  }

  const attrs = attrsToObject(cognitoUser.UserAttributes);

  const profile = await getItem(USERS_TABLE, keys.user(userId));

  return createSuccessResponse({
    userId: attrs["sub"] ?? userId,
    email: attrs["email"] ?? "",
    displayName: attrs["custom:displayName"] ?? "",
    status: cognitoUser.UserStatus ?? "UNKNOWN",
    enabled: cognitoUser.Enabled ?? true,
    mfaEnabled: (cognitoUser.MFAOptions ?? []).length > 0,
    createdAt: cognitoUser.UserCreateDate?.toISOString() ?? null,
    updatedAt: cognitoUser.UserLastModifiedDate?.toISOString() ?? null,
    profile: profile ?? null,
  });
}

/**
 * POST /admin/auth/users/{userId}/confirm
 * Force-confirms a user's sign-up without requiring email verification.
 * Idempotent — safe to call on an already-confirmed user.
 */
async function confirmUser(
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> {
  requireAdminGroup(event);
  const userId = requirePathParam(event, "userId");

  try {
    await cognitoClient.send(
      new AdminConfirmSignUpCommand({
        UserPoolId: USER_POOL_ID,
        Username: userId,
      })
    );
  } catch (err: unknown) {
    const awsErr = err as { name?: string };
    if (awsErr.name === "UserNotFoundException") {
      throw AppError.notFound("User", userId);
    }
    if (awsErr.name === "NotAuthorizedException") {
      // Already confirmed — treat as success
    } else {
      throw err;
    }
  }

  return createSuccessResponse({ userId, confirmed: true });
}

/**
 * POST /admin/auth/users/{userId}/reset-password
 * Triggers an admin-initiated password reset. Cognito sends a temporary
 * password or code to the user's verified email.
 */
async function resetPassword(
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> {
  requireAdminGroup(event);
  const userId = requirePathParam(event, "userId");

  try {
    await cognitoClient.send(
      new AdminResetUserPasswordCommand({
        UserPoolId: USER_POOL_ID,
        Username: userId,
      })
    );
  } catch (err: unknown) {
    const awsErr = err as { name?: string };
    if (awsErr.name === "UserNotFoundException") {
      throw AppError.notFound("User", userId);
    }
    throw err;
  }

  return createSuccessResponse({
    userId,
    message: "Password reset initiated. User will receive an email.",
  });
}

/**
 * DELETE /admin/auth/users/{userId}
 * Permanently removes the user from Cognito.
 * Also deletes their profile record from DynamoDB if present.
 * Does NOT cascade-delete characters or media — use the compliance handler for that.
 */
async function deleteUser(
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> {
  requireAdminGroup(event);
  const callerId = extractUserId(event);
  const userId = requirePathParam(event, "userId");

  // Prevent admins from deleting themselves via this endpoint
  if (callerId === userId) {
    throw AppError.badRequest(
      "You cannot delete your own account via the admin endpoint. Use DELETE /users/me instead."
    );
  }

  // Delete from Cognito (best effort — may already be gone)
  try {
    await cognitoClient.send(
      new AdminDeleteUserCommand({
        UserPoolId: USER_POOL_ID,
        Username: userId,
      })
    );
  } catch (err: unknown) {
    const awsErr = err as { name?: string };
    if (awsErr.name !== "UserNotFoundException") throw err;
    // Already gone from Cognito — continue to clean up DynamoDB
  }

  // Remove profile record from DynamoDB (best effort)
  try {
    await deleteItem(USERS_TABLE, keys.user(userId));
  } catch (err: unknown) {
    console.warn("Failed to delete user profile from DynamoDB:", userId, err);
  }

  return { statusCode: 204, body: "" };
}

// ─── Route Dispatcher ─────────────────────────────────────────────────────────

export const handler = withErrorHandling(
  async (
    event: APIGatewayProxyEventV2WithJWTAuthorizer
  ): Promise<APIGatewayProxyResultV2> => {
    const routeKey = event.routeKey;

    switch (routeKey) {
      case "GET /admin/auth/users":
        return listUsers(event);
      case "GET /admin/auth/users/{userId}":
        return getUser(event);
      case "POST /admin/auth/users/{userId}/confirm":
        return confirmUser(event);
      case "POST /admin/auth/users/{userId}/reset-password":
        return resetPassword(event);
      case "DELETE /admin/auth/users/{userId}":
        return deleteUser(event);
      default:
        return createErrorResponse("NOT_FOUND", "Route not found", 404);
    }
  }
);
