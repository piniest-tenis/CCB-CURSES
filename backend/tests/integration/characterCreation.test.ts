// backend/tests/integration/characterCreation.test.ts
// Integration test: end-to-end character creation lifecycle.
//
// Mocks DynamoDB at the module level (no real AWS calls).
// Seeds a fake class record and drives the full lifecycle:
//   POST /characters → GET → PATCH → POST /rest (short) → POST /rest (long) → DELETE → GET 404

jest.mock("../../src/common/dynamodb", () => {
  const actualDynamo = jest.requireActual("../../src/common/dynamodb");
  return {
    ...actualDynamo,
    getItem: jest.fn(),
    putItem: jest.fn(),
    deleteItem: jest.fn(),
    queryPage: jest.fn(),
    queryItems: jest.fn(),
    scanItems: jest.fn(),
  };
});

import { handler } from "../../src/characters/handler";
import * as dynamodb from "../../src/common/dynamodb";
import type { APIGatewayProxyStructuredResultV2 } from "aws-lambda";

const mockGetItem = dynamodb.getItem as jest.Mock;
const mockPutItem = dynamodb.putItem as jest.Mock;
const mockDeleteItem = dynamodb.deleteItem as jest.Mock;

// ─── Shared fake data ─────────────────────────────────────────────────────────

const FAKE_CLASS = {
  PK: "CLASS#warrior",
  SK: "METADATA",
  classId: "warrior",
  name: "Warrior",
  domains: ["valiance", "violence"],
  startingEvasion: 12,
  startingHitPoints: 7,
  source: "homebrew",
};

const USER_ID = "user-integration-test";

function makeJwtEvent(
  routeKey: string,
  opts: {
    pathParams?: Record<string, string>;
    query?: Record<string, string>;
    body?: unknown;
  } = {}
) {
  return {
    routeKey,
    pathParameters: opts.pathParams ?? {},
    queryStringParameters: opts.query ?? {},
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    requestContext: {
      authorizer: {
        jwt: {
          claims: { sub: USER_ID },
          scopes: [],
        },
      },
    },
  } as unknown as Parameters<typeof handler>[0];
}

function asResult(r: Awaited<ReturnType<typeof handler>>): APIGatewayProxyStructuredResultV2 {
  return r as APIGatewayProxyStructuredResultV2;
}

function parseBody(res: Awaited<ReturnType<typeof handler>>) {
  return JSON.parse((res as { body: string }).body);
}

// ─── In-memory store (simulated DynamoDB) ─────────────────────────────────────

let characterStore: Record<string, unknown> | null = null;

function setupMocks() {
  mockPutItem.mockImplementation(async (params: { Item: Record<string, unknown> }) => {
    characterStore = params.Item;
    return {};
  });

  mockDeleteItem.mockImplementation(async () => {
    characterStore = null;
    return {};
  });

  mockGetItem.mockImplementation(
    async (params: { TableName: string; Key: Record<string, unknown> }) => {
      // Return the class record
      if (params.TableName === dynamodb.CLASSES_TABLE) {
        const sk = params.Key["SK"];
        if (sk === "METADATA") return FAKE_CLASS;
        // Subclass lookups return null
        return null;
      }
      // Return the character from our store
      if (params.TableName === dynamodb.CHARACTERS_TABLE) {
        return characterStore;
      }
      // Game data (community, ancestry) — return null (optional fields)
      return null;
    }
  );
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("Character creation happy path", () => {
  let characterId: string;

  beforeEach(() => {
    setupMocks();
    characterStore = null;
  });

  // ── 1. POST /characters ─────────────────────────────────────────────────────

  it("POST /characters → 201 with correct defaults", async () => {
    const res = await handler(
      makeJwtEvent("POST /characters", {
        body: { name: "Aeris the Brave", classId: "warrior" },
      })
    );

    expect(asResult(res).statusCode).toBe(201);
    const body = parseBody(res);
    expect(body.data.name).toBe("Aeris the Brave");
    expect(body.data.classId).toBe("warrior");
    expect(body.data.className).toBe("Warrior");
    expect(body.data.userId).toBe(USER_ID);
    expect(body.data.characterId).toBeTruthy();

    // Defaults from class
    expect(body.data.trackers.hp.max).toBe(7);
    expect(body.data.trackers.hp.marked).toBe(0);
    expect(body.data.trackers.stress.max).toBe(6);
    expect(body.data.derivedStats.evasion).toBe(12);
    expect(body.data.hope).toBe(2);
    expect(body.data.domains).toContain("valiance");
    expect(body.data.level).toBe(1);

    // Empty collections
    expect(body.data.experiences).toEqual([]);
    expect(body.data.conditions).toEqual([]);
    expect(body.data.domainLoadout).toEqual([]);

    characterId = body.data.characterId;
    expect(characterId).toBeTruthy();
  });

  // ── 2. GET /characters/{characterId} ────────────────────────────────────────

  it("GET /characters/{characterId} → 200 returns same character", async () => {
    // First create
    const createRes = await handler(
      makeJwtEvent("POST /characters", {
        body: { name: "Aeris the Brave", classId: "warrior" },
      })
    );
    characterId = parseBody(createRes).data.characterId;

    const res = await handler(
      makeJwtEvent("GET /characters/{characterId}", {
        pathParams: { characterId },
      })
    );

    expect(asResult(res).statusCode).toBe(200);
    const body = parseBody(res);
    expect(body.data.characterId).toBe(characterId);
    expect(body.data.name).toBe("Aeris the Brave");
  });

  // ── 3. PATCH /characters/{characterId} ──────────────────────────────────────

  it("PATCH /characters/{characterId} → 200 updates hope", async () => {
    // Create first
    const createRes = await handler(
      makeJwtEvent("POST /characters", {
        body: { name: "Aeris", classId: "warrior" },
      })
    );
    characterId = parseBody(createRes).data.characterId;

    const res = await handler(
      makeJwtEvent("PATCH /characters/{characterId}", {
        pathParams: { characterId },
        body: { hope: 5 },
      })
    );

    expect(asResult(res).statusCode).toBe(200);
    const body = parseBody(res);
    expect(body.data.hope).toBe(5);
  });

  it("PATCH /characters/{characterId} → 400 when hope > 6 (Zod rejects at parse time)", async () => {
    // Create first
    const createRes = await handler(
      makeJwtEvent("POST /characters", {
        body: { name: "Aeris", classId: "warrior" },
      })
    );
    characterId = parseBody(createRes).data.characterId;

    const res = await handler(
      makeJwtEvent("PATCH /characters/{characterId}", {
        pathParams: { characterId },
        body: { hope: 9 },
      })
    );

    // The PATCH schema enforces hope max(6) via Zod, so it returns 400 BAD_REQUEST
    // (not 422 SRD_VIOLATION — SRD validation runs after the body is parsed)
    expect(asResult(res).statusCode).toBe(400);
    const body = parseBody(res);
    expect(body.error.code).toBe("BAD_REQUEST");
  });

  // ── 4. POST /characters/{characterId}/rest (short) ──────────────────────────

  it("POST /rest short → clears 2 stress", async () => {
    // Create with some stress
    const createRes = await handler(
      makeJwtEvent("POST /characters", {
        body: { name: "Aeris", classId: "warrior" },
      })
    );
    characterId = parseBody(createRes).data.characterId;

    // Manually set stress.marked = 4 in the store
    characterStore = {
      ...(characterStore as Record<string, unknown>),
      trackers: {
        hp: { max: 7, marked: 2 },
        stress: { max: 6, marked: 4 },
        armor: { max: 3, marked: 1 },
        proficiency: { max: 2, marked: 0 },
      },
    };

    const res = await handler(
      makeJwtEvent("POST /characters/{characterId}/rest", {
        pathParams: { characterId },
        body: { restType: "short" },
      })
    );

    expect(asResult(res).statusCode).toBe(200);
    const body = parseBody(res);
    expect(body.data.restType).toBe("short");
    expect(body.data.cleared.stress).toBe(2);
    expect(body.data.character.trackers.stress.marked).toBe(2); // 4 - 2
    // HP and armor unchanged
    expect(body.data.character.trackers.hp.marked).toBe(2);
    expect(body.data.character.trackers.armor.marked).toBe(1);
  });

  // ── 5. POST /characters/{characterId}/rest (long) ───────────────────────────

  it("POST /rest long → clears all trackers and increments hope", async () => {
    const createRes = await handler(
      makeJwtEvent("POST /characters", {
        body: { name: "Aeris", classId: "warrior" },
      })
    );
    characterId = parseBody(createRes).data.characterId;

    // Set up character with marked trackers and hope=3
    characterStore = {
      ...(characterStore as Record<string, unknown>),
      hope: 3,
      trackers: {
        hp: { max: 7, marked: 5 },
        stress: { max: 6, marked: 3 },
        armor: { max: 3, marked: 2 },
        proficiency: { max: 2, marked: 1 },
      },
    };

    const res = await handler(
      makeJwtEvent("POST /characters/{characterId}/rest", {
        pathParams: { characterId },
        body: { restType: "long" },
      })
    );

    expect(asResult(res).statusCode).toBe(200);
    const body = parseBody(res);
    expect(body.data.restType).toBe("long");
    expect(body.data.cleared.hp).toBe(5);
    expect(body.data.cleared.stress).toBe(3);
    expect(body.data.cleared.armor).toBe(2);
    expect(body.data.character.trackers.hp.marked).toBe(0);
    expect(body.data.character.trackers.stress.marked).toBe(0);
    expect(body.data.character.trackers.armor.marked).toBe(0);
    expect(body.data.character.hope).toBe(4); // 3 + 1
    expect(body.data.actionsAvailable.length).toBeGreaterThan(0);
  });

  // ── 6. DELETE /characters/{characterId} ─────────────────────────────────────

  it("DELETE /characters/{characterId} → 204", async () => {
    const createRes = await handler(
      makeJwtEvent("POST /characters", {
        body: { name: "Aeris", classId: "warrior" },
      })
    );
    characterId = parseBody(createRes).data.characterId;

    const res = await handler(
      makeJwtEvent("DELETE /characters/{characterId}", {
        pathParams: { characterId },
      })
    );

    expect(asResult(res).statusCode).toBe(204);
  });

  // ── 7. GET after DELETE → 404 ────────────────────────────────────────────────

  it("GET after DELETE → 404", async () => {
    // Create and immediately delete
    const createRes = await handler(
      makeJwtEvent("POST /characters", {
        body: { name: "Aeris", classId: "warrior" },
      })
    );
    characterId = parseBody(createRes).data.characterId;

    await handler(
      makeJwtEvent("DELETE /characters/{characterId}", {
        pathParams: { characterId },
      })
    );

    // characterStore is now null from the delete mock
    const res = await handler(
      makeJwtEvent("GET /characters/{characterId}", {
        pathParams: { characterId },
      })
    );

    expect(asResult(res).statusCode).toBe(404);
  });

  // ── 8. POST /characters → 400 missing classId ────────────────────────────────

  it("POST /characters → 400 when classId is missing", async () => {
    const res = await handler(
      makeJwtEvent("POST /characters", {
        body: { name: "Aeris" }, // no classId
      })
    );
    expect(asResult(res).statusCode).toBe(400);
  });

  // ── 9. POST /characters → 400 when class not found in DB ─────────────────────

  it("POST /characters → 400 when classId not found", async () => {
    mockGetItem.mockResolvedValueOnce(null); // class lookup returns null
    const res = await handler(
      makeJwtEvent("POST /characters", {
        body: { name: "Aeris", classId: "nonexistent" },
      })
    );
    expect(asResult(res).statusCode).toBe(400);
  });

  // ── 10. Unauthenticated request → 401 ─────────────────────────────────────────

  it("GET /characters without JWT sub → 401", async () => {
    const res = await handler({
      routeKey: "GET /characters",
      pathParameters: {},
      queryStringParameters: {},
      requestContext: {
        authorizer: { jwt: { claims: {}, scopes: [] } },
      },
    } as unknown as Parameters<typeof handler>[0]);

    expect(asResult(res).statusCode).toBe(401);
  });
});
