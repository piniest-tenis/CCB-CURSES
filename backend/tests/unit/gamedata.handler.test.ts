// backend/tests/unit/gamedata.handler.test.ts
// Tests for the gamedata handler, focusing on serialization correctness.
// DynamoDB calls are mocked at the module level.
//
// Because the serializer functions are private to the handler, we verify them
// by calling the handler with mocked DynamoDB responses and checking the output.

jest.mock("../../src/common/dynamodb", () => {
  const originalModule = jest.requireActual("../../src/common/dynamodb");
  return {
    ...originalModule,
    getItem: jest.fn(),
    queryItems: jest.fn(),
    scanItems: jest.fn(),
    queryPage: jest.fn(),
    // docClient is used directly in getClass/getSubclasses via QueryCommand — mock send()
    docClient: {
      send: jest.fn().mockResolvedValue({ Items: [] }),
    },
  };
});

import { handler } from "../../src/gamedata/handler";
import * as dynamodb from "../../src/common/dynamodb";
import type { APIGatewayProxyStructuredResultV2 } from "aws-lambda";

const mockGetItem = dynamodb.getItem as jest.Mock;
const mockQueryItems = dynamodb.queryItems as jest.Mock;
const mockScanItems = dynamodb.scanItems as jest.Mock;
const mockDocClientSend = (dynamodb.docClient as unknown as { send: jest.Mock }).send;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeEvent(routeKey: string, pathParams: Record<string, string> = {}, query: Record<string, string> = {}) {
  return {
    routeKey,
    pathParameters: pathParams,
    queryStringParameters: query,
    requestContext: {},
  } as unknown as Parameters<typeof handler>[0];
}

function asResult(r: Awaited<ReturnType<typeof handler>>): APIGatewayProxyStructuredResultV2 {
  return r as APIGatewayProxyStructuredResultV2;
}

function parseBody(res: Awaited<ReturnType<typeof handler>>) {
  return JSON.parse((res as { body: string }).body);
}

// ─── Class serialization ──────────────────────────────────────────────────────

const CLASS_META_RECORD = {
  PK: "CLASS#bard",
  SK: "METADATA",
  classId: "bard",
  name: "Bard",
  domains: ["grace", "codex"],
  startingEvasion: 11,
  startingHitPoints: 5,
  classItems: ["Instrument", "Journal"],
  hopeFeature: { name: "Inspire", description: "Spend 1 hope to inspire.", hopeCost: 1 },
  classFeature: { name: "Bardic Knack", description: "Pick one.", options: ["Persuasion", "Performance"] },
  backgroundQuestions: ["What song do you always hum?"],
  connectionQuestions: ["When did you last perform for them?"],
  mechanicalNotes: "Bards use Grace and Codex.",
  source: "homebrew" as const,
};

const SUBCLASS_RECORDS = [
  {
    PK: "CLASS#bard",
    SK: "SUBCLASS#troubadour",
    subclassId: "troubadour",
    name: "Troubadour",
    description: "A wandering performer.",
    spellcastTrait: "presence",
    foundationFeatures: [{ name: "Song of Rest", description: "Allies rest easier." }],
    specializationFeature: { name: "Captive Audience", description: "Hold an audience enraptured." },
    masteryFeature: { name: "Legend", description: "Your name is known everywhere." },
  },
];

describe("GET /classes/{classId}", () => {
  beforeEach(() => {
    // getClass uses a single docClient.send query to fetch all items for the PK
    // (both METADATA and SUBCLASS# records come back in one response)
    mockDocClientSend.mockResolvedValue({
      Items: [CLASS_META_RECORD, ...SUBCLASS_RECORDS],
    });
  });

  it("returns 200 with full class data", async () => {
    const res = await handler(makeEvent("GET /classes/{classId}", { classId: "bard" }));
    expect(asResult(res).statusCode).toBe(200);
    const body = parseBody(res);
    expect(body.data.classId).toBe("bard");
    expect(body.data.name).toBe("Bard");
    expect(body.data.domains).toEqual(["grace", "codex"]);
    expect(body.data.startingEvasion).toBe(11);
    expect(body.data.startingHitPoints).toBe(5);
  });

  it("includes class items and hope/class features", async () => {
    const res = await handler(makeEvent("GET /classes/{classId}", { classId: "bard" }));
    const body = parseBody(res);
    expect(body.data.classItems).toEqual(["Instrument", "Journal"]);
    expect(body.data.hopeFeature.name).toBe("Inspire");
    expect(body.data.hopeFeature.hopeCost).toBe(1);
    expect(body.data.classFeature.name).toBe("Bardic Knack");
    expect(body.data.classFeature.options).toContain("Persuasion");
  });

  it("includes subclass with full SubclassData shape", async () => {
    const res = await handler(makeEvent("GET /classes/{classId}", { classId: "bard" }));
    const body = parseBody(res);
    const sub = body.data.subclasses[0];
    expect(sub.subclassId).toBe("troubadour");
    expect(sub.name).toBe("Troubadour");
    expect(sub.spellcastTrait).toBe("presence");
    expect(sub.foundationFeatures).toHaveLength(1);
    expect(sub.specializationFeature.name).toBe("Captive Audience");
    expect(sub.masteryFeature.name).toBe("Legend");
  });

  it("returns 404 when class not found", async () => {
    // No METADATA record → class not found
    mockDocClientSend.mockResolvedValue({ Items: [] });
    const res = await handler(makeEvent("GET /classes/{classId}", { classId: "unknown" }));
    expect(asResult(res).statusCode).toBe(404);
  });
});

// ─── Community serialization ──────────────────────────────────────────────────

const COMMUNITY_RECORD = {
  PK: "COMMUNITY#badlander",
  SK: "badlander",
  id: "badlander",
  type: "community",
  name: "Badlander",
  flavorText: "Survivors of the wastes.",
  traitName: "Wasteland Endurance",
  traitDescription: "Gain +1 to Strength rolls.",
  body: "",
  source: "homebrew" as const,
};

describe("GET /communities/{communityId}", () => {
  beforeEach(() => {
    mockGetItem.mockResolvedValue(COMMUNITY_RECORD);
  });

  it("returns 200 with community data", async () => {
    const res = await handler(makeEvent("GET /communities/{communityId}", { communityId: "badlander" }));
    expect(asResult(res).statusCode).toBe(200);
    const body = parseBody(res);
    expect(body.data.communityId).toBe("badlander");
    expect(body.data.name).toBe("Badlander");
    expect(body.data.flavorText).toBe("Survivors of the wastes.");
    expect(body.data.traitName).toBe("Wasteland Endurance");
    expect(body.data.traitDescription).toMatch(/Strength/);
    expect(body.data.source).toBe("homebrew");
  });

  it("returns 404 when community not found", async () => {
    mockGetItem.mockResolvedValue(null);
    const res = await handler(makeEvent("GET /communities/{communityId}", { communityId: "nope" }));
    expect(asResult(res).statusCode).toBe(404);
  });
});

// ─── Ancestry serialization ───────────────────────────────────────────────────

const ANCESTRY_RECORD = {
  PK: "ANCESTRY#elf",
  SK: "elf",
  id: "elf",
  type: "ancestry",
  name: "Elf",
  flavorText: "Ancient and wise.",
  traitName: "Low-Light Vision",
  traitDescription: "See in dim light as if bright.",
  body: "",
  source: "homebrew" as const,
};

describe("GET /ancestries/{ancestryId}", () => {
  beforeEach(() => {
    mockGetItem.mockResolvedValue(ANCESTRY_RECORD);
  });

  it("returns 200 with ancestry data", async () => {
    const res = await handler(makeEvent("GET /ancestries/{ancestryId}", { ancestryId: "elf" }));
    expect(asResult(res).statusCode).toBe(200);
    const body = parseBody(res);
    expect(body.data.ancestryId).toBe("elf");
    expect(body.data.name).toBe("Elf");
    expect(body.data.flavorText).toBe("Ancient and wise.");
    expect(body.data.traitName).toBe("Low-Light Vision");
  });

  it("returns 404 when ancestry not found", async () => {
    mockGetItem.mockResolvedValue(null);
    const res = await handler(makeEvent("GET /ancestries/{ancestryId}", { ancestryId: "nope" }));
    expect(asResult(res).statusCode).toBe(404);
  });
});

// ─── Domain card serialization ────────────────────────────────────────────────

const DOMAIN_CARD_RECORD = {
  PK: "DOMAIN#grace",
  SK: "CARD#dirty-fighter",
  cardId: "dirty-fighter",
  domain: "grace",
  level: 4,
  name: "Dirty Fighter",
  isCursed: false,
  isLinkedCurse: false,
  isGrimoire: false,
  description: "Make a sneaky attack.",
  curseText: null,
  linkedCardIds: [],
  grimoire: [],
  source: "homebrew" as const,
};

const CURSED_CARD_RECORD = {
  ...DOMAIN_CARD_RECORD,
  cardId: "iconoclast",
  name: "Iconoclast",
  isCursed: true,
  curseText: "You become marked.",
};

describe("GET /domains/{domain}/cards/{cardId}", () => {
  it("returns a basic domain card", async () => {
    mockGetItem.mockResolvedValue(DOMAIN_CARD_RECORD);
    const res = await handler(makeEvent("GET /domains/{domain}/cards/{cardId}", { domain: "grace", cardId: "dirty-fighter" }));
    expect(asResult(res).statusCode).toBe(200);
    const body = parseBody(res);
    expect(body.data.cardId).toBe("dirty-fighter");
    expect(body.data.domain).toBe("grace");
    expect(body.data.level).toBe(4);
    expect(body.data.isCursed).toBe(false);
    expect(body.data.curseText).toBeNull();
    expect(body.data.grimoire).toEqual([]);
  });

  it("returns a cursed card with curseText", async () => {
    mockGetItem.mockResolvedValue(CURSED_CARD_RECORD);
    const res = await handler(makeEvent("GET /domains/{domain}/cards/{cardId}", { domain: "grace", cardId: "iconoclast" }));
    expect(asResult(res).statusCode).toBe(200);
    const body = parseBody(res);
    expect(body.data.isCursed).toBe(true);
    expect(body.data.curseText).toBe("You become marked.");
  });

  it("defaults missing array fields to empty arrays", async () => {
    mockGetItem.mockResolvedValue({
      ...DOMAIN_CARD_RECORD,
      linkedCardIds: undefined,
      grimoire: undefined,
    });
    const res = await handler(makeEvent("GET /domains/{domain}/cards/{cardId}", { domain: "grace", cardId: "dirty-fighter" }));
    const body = parseBody(res);
    expect(body.data.linkedCardIds).toEqual([]);
    expect(body.data.grimoire).toEqual([]);
  });

  it("returns 404 when card not found", async () => {
    mockGetItem.mockResolvedValue(null);
    const res = await handler(makeEvent("GET /domains/{domain}/cards/{cardId}", { domain: "grace", cardId: "nope" }));
    expect(asResult(res).statusCode).toBe(404);
  });
});

// ─── Rules serialization ──────────────────────────────────────────────────────

const RULE_RECORD = {
  PK: "RULE#short-rest",
  SK: "short-rest",
  id: "short-rest",
  type: "rule",
  name: "Short Rest",
  body: "Clear 2 stress marks.",
  flavorText: "",
  traitName: "",
  traitDescription: "",
  source: "homebrew" as const,
};

describe("GET /rules/{ruleId}", () => {
  it("returns rule data", async () => {
    mockGetItem.mockResolvedValue(RULE_RECORD);
    const res = await handler(makeEvent("GET /rules/{ruleId}", { ruleId: "short-rest" }));
    expect(asResult(res).statusCode).toBe(200);
    const body = parseBody(res);
    expect(body.data.ruleId).toBe("short-rest");
    expect(body.data.name).toBe("Short Rest");
    expect(body.data.body).toBe("Clear 2 stress marks.");
    expect(body.data.type).toBe("rule");
  });

  it("returns 404 when rule not found", async () => {
    mockGetItem.mockResolvedValue(null);
    const res = await handler(makeEvent("GET /rules/{ruleId}", { ruleId: "nope" }));
    expect(asResult(res).statusCode).toBe(404);
  });
});

// ─── Unknown route ────────────────────────────────────────────────────────────

describe("unknown route", () => {
  it("returns 404 for unrecognized routeKey", async () => {
    const res = await handler(makeEvent("DELETE /classes/{classId}", { classId: "bard" }));
    expect(asResult(res).statusCode).toBe(404);
  });
});
