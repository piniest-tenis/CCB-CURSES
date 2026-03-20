// backend/src/common/middleware.ts
// Lambda middleware utilities — request/response helpers and error handling HOF.

import { randomUUID } from "crypto";
import type { ZodSchema } from "zod";
import type {
  APIGatewayProxyEventV2,
  APIGatewayProxyEventV2WithJWTAuthorizer,
  APIGatewayProxyResultV2,
} from "aws-lambda";

// ─── Shared Response Headers ──────────────────────────────────────────────────

const RESPONSE_HEADERS = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token",
  "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
} as const;

// ─── API Envelope Types ────────────────────────────────────────────────────────

export interface ApiMeta {
  requestId: string;
  timestamp: string;
}

export interface SuccessResponse<T = unknown> {
  data: T;
  meta: ApiMeta;
}

export interface ErrorDetail {
  field?: string;
  issue: string;
}

export interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: ErrorDetail[];
  };
  meta: ApiMeta;
}

// ─── Meta Builder ─────────────────────────────────────────────────────────────

function buildMeta(): ApiMeta {
  return {
    requestId: randomUUID(),
    timestamp: new Date().toISOString(),
  };
}

// ─── AppError ─────────────────────────────────────────────────────────────────

/**
 * Typed application error — thrown anywhere in handler code and caught by
 * `withErrorHandling`.
 */
export class AppError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode: number,
    public readonly details?: ErrorDetail[]
  ) {
    super(message);
    this.name = "AppError";
    Object.setPrototypeOf(this, AppError.prototype);
  }

  static unauthorized(message = "Unauthorized"): AppError {
    return new AppError("UNAUTHORIZED", message, 401);
  }

  static forbidden(message = "Access denied"): AppError {
    return new AppError("FORBIDDEN", message, 403);
  }

  static notFound(resource: string, id?: string): AppError {
    const msg = id ? `${resource} '${id}' not found` : `${resource} not found`;
    return new AppError("NOT_FOUND", msg, 404);
  }

  static conflict(message: string): AppError {
    return new AppError("CONFLICT", message, 409);
  }

  static badRequest(message: string, details?: ErrorDetail[]): AppError {
    return new AppError("BAD_REQUEST", message, 400, details);
  }

  static validationError(message: string, details?: ErrorDetail[]): AppError {
    return new AppError("VALIDATION_ERROR", message, 400, details);
  }

  static srdViolation(message: string, details?: ErrorDetail[]): AppError {
    return new AppError("SRD_VIOLATION", message, 422, details);
  }

  static internal(message = "An unexpected error occurred"): AppError {
    return new AppError("INTERNAL_ERROR", message, 500);
  }
}

// ─── Response Factories ───────────────────────────────────────────────────────

/**
 * Wrap a data payload in the standard success envelope with CORS headers.
 */
export function createSuccessResponse<T>(
  data: T,
  statusCode = 200
): APIGatewayProxyResultV2 {
  const body: SuccessResponse<T> = {
    data,
    meta: buildMeta(),
  };
  return {
    statusCode,
    headers: { ...RESPONSE_HEADERS },
    body: JSON.stringify(body),
  };
}

/**
 * Wrap an error in the standard error envelope with CORS headers.
 */
export function createErrorResponse(
  code: string,
  message: string,
  statusCode: number,
  details?: ErrorDetail[]
): APIGatewayProxyResultV2 {
  const body: ErrorResponse = {
    error: {
      code,
      message,
      ...(details && details.length > 0 ? { details } : {}),
    },
    meta: buildMeta(),
  };
  return {
    statusCode,
    headers: { ...RESPONSE_HEADERS },
    body: JSON.stringify(body),
  };
}

// ─── Error HOF ────────────────────────────────────────────────────────────────

/**
 * Higher-order function that wraps a Lambda handler in try/catch.
 * Catches AppError and maps to HTTP status; catches unknown errors and returns 500.
 * Accepts any Lambda event type so it can wrap both JWT-authorised and public handlers.
 */
export function withErrorHandling<TEvent>(
  handler: (event: TEvent) => Promise<APIGatewayProxyResultV2>
): (event: TEvent) => Promise<APIGatewayProxyResultV2> {
  return async (event: TEvent): Promise<APIGatewayProxyResultV2> => {
    try {
      return await handler(event);
    } catch (err: unknown) {
      console.error("Unhandled Lambda error:", err);

      if (err instanceof AppError) {
        return createErrorResponse(
          err.code,
          err.message,
          err.statusCode,
          err.details
        );
      }

      const message =
        err instanceof Error ? err.message : "An unexpected error occurred";

      // Map by .code property if present (legacy path)
      const errCode =
        err instanceof Error && "code" in err
          ? String((err as NodeJS.ErrnoException).code)
          : "";

      switch (errCode) {
        case "UNAUTHORIZED":
          return createErrorResponse("UNAUTHORIZED", message, 401);
        case "FORBIDDEN":
          return createErrorResponse("FORBIDDEN", message, 403);
        case "NOT_FOUND":
          return createErrorResponse("NOT_FOUND", message, 404);
        case "VALIDATION_ERROR":
        case "BAD_REQUEST":
          return createErrorResponse(errCode, message, 400);
        case "SRD_VIOLATION":
          return createErrorResponse("SRD_VIOLATION", message, 422);
        case "CONFLICT":
          return createErrorResponse("CONFLICT", message, 409);
        default:
          return createErrorResponse(
            "INTERNAL_ERROR",
            "An unexpected error occurred",
            500
          );
      }
    }
  };
}

// ─── JWT Claim Extractors ─────────────────────────────────────────────────────

/**
 * Extract the Cognito `sub` claim from an HTTP API v2 JWT-authorised event.
 * Throws AppError.unauthorized if the claim is missing.
 */
export function extractUserId(
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): string {
  const claims = event.requestContext?.authorizer?.jwt?.claims;
  if (!claims || typeof claims["sub"] !== "string" || !claims["sub"]) {
    throw AppError.unauthorized("Missing or invalid JWT sub claim");
  }
  return claims["sub"];
}

/**
 * Extract the caller's email from JWT claims (best-effort; may be undefined).
 */
export function extractEmail(
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): string | undefined {
  const claims = event.requestContext?.authorizer?.jwt?.claims;
  if (!claims) return undefined;
  const email = claims["email"];
  return typeof email === "string" ? email : undefined;
}

// ─── Parsing Utilities ────────────────────────────────────────────────────────

/**
 * Parse and Zod-validate a JSON request body.
 * Throws AppError.badRequest on JSON parse failure or schema validation failure.
 */
export function parseBody<T>(
  event: APIGatewayProxyEventV2 | APIGatewayProxyEventV2WithJWTAuthorizer | { body?: string | null },
  schema?: ZodSchema<T>
): T {
  if (!event.body) {
    throw AppError.badRequest("Request body is required");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(event.body);
  } catch {
    throw AppError.badRequest("Request body must be valid JSON");
  }

  if (schema !== undefined) {
    const result = schema.safeParse(parsed);
    if (!result.success) {
      const details: ErrorDetail[] = result.error.errors.map((e) => ({
        field: e.path.join("."),
        issue: e.message,
      }));
      throw AppError.badRequest("Request body failed validation", details);
    }
    return result.data;
  }

  return parsed as T;
}

/**
 * Extract a required path parameter; throws AppError.badRequest if missing.
 */
export function requirePathParam(
  event: { pathParameters?: Record<string, string | undefined> | null },
  name: string
): string {
  const value = event.pathParameters?.[name];
  if (!value) {
    throw AppError.badRequest(`Missing required path parameter: ${name}`);
  }
  return value;
}

/**
 * Get an optional query string parameter as a string.
 */
export function getQueryParam(
  event: {
    queryStringParameters?: Record<string, string | undefined> | null;
  },
  name: string
): string | undefined {
  return event.queryStringParameters?.[name];
}

/**
 * Get an optional query string parameter parsed as an integer.
 * Returns undefined (or defaultValue) if absent or not a valid integer.
 */
export function getQueryParamInt(
  event: {
    queryStringParameters?: Record<string, string | undefined> | null;
  },
  name: string,
  defaultValue?: number
): number | undefined {
  const raw = event.queryStringParameters?.[name];
  if (raw === undefined || raw === "") return defaultValue;
  const parsed = parseInt(raw, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}
