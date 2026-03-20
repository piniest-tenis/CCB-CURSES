// backend/tests/unit/middleware.test.ts
// Unit tests for common/middleware.ts — AppError, response factories, parseBody,
// requirePathParam, getQueryParam, getQueryParamInt, withErrorHandling.

import { z } from "zod";
import {
  AppError,
  createSuccessResponse,
  createErrorResponse,
  withErrorHandling,
  extractUserId,
  parseBody,
  requirePathParam,
  getQueryParam,
  getQueryParamInt,
} from "../../src/common/middleware";
import type { APIGatewayProxyStructuredResultV2 } from "aws-lambda";

/** Narrow the union return type so we can access .statusCode / .body / .headers */
function asResult(r: unknown): APIGatewayProxyStructuredResultV2 {
  return r as APIGatewayProxyStructuredResultV2;
}

// ─── AppError ─────────────────────────────────────────────────────────────────

describe("AppError", () => {
  describe("static factories", () => {
    it("unauthorized() → 401 UNAUTHORIZED", () => {
      const err = AppError.unauthorized();
      expect(err.statusCode).toBe(401);
      expect(err.code).toBe("UNAUTHORIZED");
      expect(err.message).toBe("Unauthorized");
      expect(err).toBeInstanceOf(AppError);
    });

    it("unauthorized(custom) uses custom message", () => {
      const err = AppError.unauthorized("Token expired");
      expect(err.message).toBe("Token expired");
    });

    it("forbidden() → 403 FORBIDDEN", () => {
      const err = AppError.forbidden();
      expect(err.statusCode).toBe(403);
      expect(err.code).toBe("FORBIDDEN");
    });

    it("notFound(resource, id) → 404 NOT_FOUND with interpolated message", () => {
      const err = AppError.notFound("Character", "abc-123");
      expect(err.statusCode).toBe(404);
      expect(err.code).toBe("NOT_FOUND");
      expect(err.message).toBe("Character 'abc-123' not found");
    });

    it("notFound(resource) without id uses short message", () => {
      const err = AppError.notFound("Character");
      expect(err.message).toBe("Character not found");
    });

    it("conflict() → 409 CONFLICT", () => {
      const err = AppError.conflict("Already exists");
      expect(err.statusCode).toBe(409);
      expect(err.code).toBe("CONFLICT");
    });

    it("badRequest() → 400 BAD_REQUEST", () => {
      const err = AppError.badRequest("Bad input");
      expect(err.statusCode).toBe(400);
      expect(err.code).toBe("BAD_REQUEST");
    });

    it("badRequest() with details exposes details", () => {
      const details = [{ field: "name", issue: "required" }];
      const err = AppError.badRequest("Validation failed", details);
      expect(err.details).toEqual(details);
    });

    it("validationError() → 400 VALIDATION_ERROR", () => {
      const err = AppError.validationError("Schema failed");
      expect(err.statusCode).toBe(400);
      expect(err.code).toBe("VALIDATION_ERROR");
    });

    it("srdViolation() → 422 SRD_VIOLATION", () => {
      const err = AppError.srdViolation("Hope out of range");
      expect(err.statusCode).toBe(422);
      expect(err.code).toBe("SRD_VIOLATION");
    });

    it("internal() → 500 INTERNAL_ERROR", () => {
      const err = AppError.internal();
      expect(err.statusCode).toBe(500);
      expect(err.code).toBe("INTERNAL_ERROR");
    });

    it("is instanceof AppError and instanceof Error", () => {
      const err = AppError.badRequest("test");
      expect(err).toBeInstanceOf(AppError);
      expect(err).toBeInstanceOf(Error);
      expect(err.name).toBe("AppError");
    });
  });
});

// ─── createSuccessResponse ────────────────────────────────────────────────────

describe("createSuccessResponse", () => {
  it("returns statusCode 200 by default", () => {
    const res = asResult(createSuccessResponse({ foo: "bar" }));
    expect(res.statusCode).toBe(200);
  });

  it("accepts custom statusCode", () => {
    const res = asResult(createSuccessResponse({}, 201));
    expect(res.statusCode).toBe(201);
  });

  it("wraps data in { data, meta } envelope", () => {
    const res = asResult(createSuccessResponse({ id: "123" }));
    const body = JSON.parse(res.body as string);
    expect(body.data).toEqual({ id: "123" });
    expect(body.meta).toHaveProperty("requestId");
    expect(body.meta).toHaveProperty("timestamp");
  });

  it("includes CORS headers", () => {
    const res = asResult(createSuccessResponse({}));
    expect((res.headers as Record<string, string>)["Access-Control-Allow-Origin"]).toBe("*");
    expect((res.headers as Record<string, string>)["Content-Type"]).toBe("application/json");
  });
});

// ─── createErrorResponse ──────────────────────────────────────────────────────

describe("createErrorResponse", () => {
  it("wraps error in { error: { code, message }, meta } envelope", () => {
    const res = asResult(createErrorResponse("NOT_FOUND", "Thing not found", 404));
    expect(res.statusCode).toBe(404);
    const body = JSON.parse(res.body as string);
    expect(body.error.code).toBe("NOT_FOUND");
    expect(body.error.message).toBe("Thing not found");
    expect(body.meta).toHaveProperty("requestId");
  });

  it("includes details when provided", () => {
    const res = asResult(createErrorResponse("BAD_REQUEST", "Invalid", 400, [
      { field: "name", issue: "too short" },
    ]));
    const body = JSON.parse(res.body as string);
    expect(body.error.details).toEqual([{ field: "name", issue: "too short" }]);
  });

  it("omits details key when not provided", () => {
    const res = asResult(createErrorResponse("NOT_FOUND", "x", 404));
    const body = JSON.parse(res.body as string);
    expect(body.error.details).toBeUndefined();
  });
});

// ─── withErrorHandling ────────────────────────────────────────────────────────

describe("withErrorHandling", () => {
  it("passes through the successful handler result", async () => {
    const wrapped = withErrorHandling(async () => ({ statusCode: 200, body: "ok" }));
    const result = asResult(await wrapped({} as never));
    expect(result.statusCode).toBe(200);
  });

  it("converts AppError to the correct HTTP status", async () => {
    const wrapped = withErrorHandling(async () => {
      throw AppError.notFound("Character", "xyz");
    });
    const result = asResult(await wrapped({} as never));
    expect(result.statusCode).toBe(404);
    const body = JSON.parse(result.body as string);
    expect(body.error.code).toBe("NOT_FOUND");
    expect(body.error.message).toContain("xyz");
  });

  it("converts unknown Error to 500 INTERNAL_ERROR", async () => {
    const wrapped = withErrorHandling(async () => {
      throw new Error("kaboom");
    });
    const result = asResult(await wrapped({} as never));
    expect(result.statusCode).toBe(500);
    const body = JSON.parse(result.body as string);
    expect(body.error.code).toBe("INTERNAL_ERROR");
  });

  it("converts non-Error throws to 500", async () => {
    const wrapped = withErrorHandling(async () => {
      // eslint-disable-next-line @typescript-eslint/no-throw-literal
      throw "string error";
    });
    const result = asResult(await wrapped({} as never));
    expect(result.statusCode).toBe(500);
  });

  it("maps AppError.srdViolation to 422", async () => {
    const wrapped = withErrorHandling(async () => {
      throw AppError.srdViolation("Hope too high");
    });
    const result = asResult(await wrapped({} as never));
    expect(result.statusCode).toBe(422);
  });

  it("maps AppError.conflict to 409", async () => {
    const wrapped = withErrorHandling(async () => {
      throw AppError.conflict("Duplicate");
    });
    const result = asResult(await wrapped({} as never));
    expect(result.statusCode).toBe(409);
  });
});

// ─── extractUserId ────────────────────────────────────────────────────────────

describe("extractUserId", () => {
  function makeEvent(sub: unknown): Parameters<typeof extractUserId>[0] {
    return {
      requestContext: {
        authorizer: {
          jwt: {
            claims: sub !== undefined ? { sub } : {},
            scopes: [],
          },
        },
      },
    } as unknown as Parameters<typeof extractUserId>[0];
  }

  it("returns the sub claim when present", () => {
    const userId = extractUserId(makeEvent("user-abc"));
    expect(userId).toBe("user-abc");
  });

  it("throws AppError.unauthorized when sub is missing", () => {
    expect(() => extractUserId(makeEvent(undefined))).toThrow(AppError);
    try {
      extractUserId(makeEvent(undefined));
    } catch (e) {
      expect((e as AppError).statusCode).toBe(401);
    }
  });

  it("throws when sub is not a string", () => {
    expect(() => extractUserId(makeEvent(42))).toThrow(AppError);
  });

  it("throws when requestContext is absent", () => {
    expect(() =>
      extractUserId({} as Parameters<typeof extractUserId>[0])
    ).toThrow(AppError);
  });
});

// ─── parseBody ────────────────────────────────────────────────────────────────

describe("parseBody", () => {
  it("throws when body is absent", () => {
    expect(() => parseBody({ body: undefined })).toThrow(AppError);
    try {
      parseBody({ body: undefined });
    } catch (e) {
      expect((e as AppError).statusCode).toBe(400);
      expect((e as AppError).message).toMatch(/required/i);
    }
  });

  it("throws when body is null", () => {
    expect(() => parseBody({ body: null })).toThrow(AppError);
  });

  it("throws on invalid JSON", () => {
    expect(() => parseBody({ body: "not json" })).toThrow(AppError);
    try {
      parseBody({ body: "not json" });
    } catch (e) {
      expect((e as AppError).message).toMatch(/JSON/i);
    }
  });

  it("returns parsed object when no schema given", () => {
    const result = parseBody({ body: '{"name":"Aether"}' });
    expect(result).toEqual({ name: "Aether" });
  });

  it("validates against schema when provided", () => {
    const schema = z.object({ level: z.number().min(1) });
    const result = parseBody({ body: '{"level":5}' }, schema);
    expect(result).toEqual({ level: 5 });
  });

  it("throws BAD_REQUEST on Zod schema violation", () => {
    const schema = z.object({ level: z.number().min(1) });
    expect(() => parseBody({ body: '{"level":-1}' }, schema)).toThrow(AppError);
    try {
      parseBody({ body: '{"level":-1}' }, schema);
    } catch (e) {
      expect((e as AppError).code).toBe("BAD_REQUEST");
      expect((e as AppError).details).toBeDefined();
    }
  });
});

// ─── requirePathParam ─────────────────────────────────────────────────────────

describe("requirePathParam", () => {
  it("returns the parameter value when present", () => {
    const event = { pathParameters: { characterId: "abc-123" } };
    expect(requirePathParam(event, "characterId")).toBe("abc-123");
  });

  it("throws BAD_REQUEST when parameter is missing", () => {
    expect(() => requirePathParam({ pathParameters: {} }, "characterId")).toThrow(AppError);
    try {
      requirePathParam({ pathParameters: {} }, "characterId");
    } catch (e) {
      expect((e as AppError).statusCode).toBe(400);
      expect((e as AppError).message).toMatch(/characterId/);
    }
  });

  it("throws when pathParameters is null", () => {
    expect(() => requirePathParam({ pathParameters: null }, "id")).toThrow(AppError);
  });

  it("throws when pathParameters is undefined", () => {
    expect(() => requirePathParam({}, "id")).toThrow(AppError);
  });
});

// ─── getQueryParam ────────────────────────────────────────────────────────────

describe("getQueryParam", () => {
  it("returns the value when present", () => {
    const event = { queryStringParameters: { cursor: "abc" } };
    expect(getQueryParam(event, "cursor")).toBe("abc");
  });

  it("returns undefined when absent", () => {
    expect(getQueryParam({ queryStringParameters: {} }, "cursor")).toBeUndefined();
  });

  it("returns undefined when queryStringParameters is null", () => {
    expect(getQueryParam({ queryStringParameters: null }, "cursor")).toBeUndefined();
  });
});

// ─── getQueryParamInt ─────────────────────────────────────────────────────────

describe("getQueryParamInt", () => {
  it("parses a valid integer string", () => {
    const event = { queryStringParameters: { limit: "50" } };
    expect(getQueryParamInt(event, "limit")).toBe(50);
  });

  it("returns defaultValue when param is absent", () => {
    expect(getQueryParamInt({ queryStringParameters: {} }, "limit", 20)).toBe(20);
  });

  it("returns defaultValue when param is NaN", () => {
    const event = { queryStringParameters: { limit: "abc" } };
    expect(getQueryParamInt(event, "limit", 20)).toBe(20);
  });

  it("returns defaultValue when param is empty string", () => {
    const event = { queryStringParameters: { limit: "" } };
    expect(getQueryParamInt(event, "limit", 20)).toBe(20);
  });

  it("returns undefined when absent and no default", () => {
    expect(getQueryParamInt({ queryStringParameters: {} }, "limit")).toBeUndefined();
  });

  it("handles negative integers", () => {
    const event = { queryStringParameters: { offset: "-5" } };
    expect(getQueryParamInt(event, "offset")).toBe(-5);
  });
});
