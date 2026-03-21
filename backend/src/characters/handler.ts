// backend/src/characters/handler.ts
// Lambda handler for all /characters/* routes.
// Route dispatch pattern on event.routeKey (HTTP API v2).

import type {
  APIGatewayProxyEventV2WithJWTAuthorizer,
  APIGatewayProxyResultV2,
} from "aws-lambda";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";
import {
  AppError,
  createSuccessResponse,
  createErrorResponse,
  extractUserId,
  parseBody,
  requirePathParam,
  getQueryParam,
  getQueryParamInt,
  withErrorHandling,
} from "../common/middleware";
import {
  deepMerge,
  encodeCursor,
  decodeCursor,
  signShareToken,
  verifyShareToken,
  validateSrdRules,
  applyRest,
  normalizeWeapons,
  applyAction,
  type ActionId,
} from "./helpers";
import {
  CHARACTERS_TABLE,
  CLASSES_TABLE,
  GAME_DATA_TABLE,
  getItem,
  putItem,
  deleteItem,
  queryPage,
  keys,
} from "../common/dynamodb";
import type {
  Character,
  CharacterSummary,
  CoreStats,
  DerivedStats,
  CharacterTrackers,
  DamageThresholds,
  Weapons,
  ClassFeatureState,
  DowntimeAction,
  RestResult,
  DowntimeProject,
} from "@shared/types";

// ─── Zod Schemas ──────────────────────────────────────────────────────────────

const WeaponSchema = z.object({
  name: z.string().nullable().default(null),
  trait: z.string().nullable().default(null),
  damage: z.string().nullable().default(null),
  range: z.string().nullable().default(null),
  type: z.enum(["physical", "magic"]).nullable().default(null),
  burden: z.enum(["one-handed", "two-handed"]).nullable().default(null),
  // SRD page 23: weapons have a tier; characters cannot equip weapons above their tier.
  tier: z.number().int().min(1).max(4).nullable().default(null),
  // SRD page 23: optional weapon feature text.
  feature: z.string().nullable().default(null),
});

// SRD page 3: starting trait range is -1 to +2; allow -5 for penalty modifiers, up to +8 via advancement.
const CoreStatsSchema = z.object({
  agility: z.number().int().min(-5).max(8),
  strength: z.number().int().min(-5).max(8),
  finesse: z.number().int().min(-5).max(8),
  instinct: z.number().int().min(-5).max(8),
  presence: z.number().int().min(-5).max(8),
  knowledge: z.number().int().min(-5).max(8),
});

const SlotTrackerSchema = z.object({
  max: z.number().int().min(0),
  marked: z.number().int().min(0),
});

// ── Campaign Mechanics Schemas ─────────────────────────────────────────────────

const DowntimeProjectSchema = z.object({
  projectId: z.string().uuid(),
  cardId: z.string().nullable(),
  name: z.string().min(1).max(120),
  countdownMax: z.number().int().min(1),
  countdownCurrent: z.number().int().min(0),
  repeatable: z.boolean(),
  completed: z.boolean(),
  completedAt: z.string().nullable(),
  notes: z.string().nullable(),
});

const CompanionStateSchema = z.object({
  name: z.string().min(1).max(80),
  evasion: z.number().int().min(0),
  stress: SlotTrackerSchema,
  experiences: z.array(
    z.object({ name: z.string(), bonus: z.number().int() })
  ),
  attackDescription: z.string(),
  damagedie: z.string().regex(/^d\d+$/, "Must be a die notation like d6 or d8"),
  damageType: z.enum(["physical", "magic"]),
  range: z.string(),
  levelupChoices: z.array(z.string()),
});

const CustomConditionSchema = z.object({
  conditionId: z.string(),
  name: z.string().min(1).max(60),
  description: z.string(),
  sourceCardId: z.string().nullable(),
});

// ─────────────────────────────────────────────────────────────────────────────

const CreateCharacterSchema = z.object({
  name: z.string().min(1, "Name is required").max(60, "Name must be 60 characters or fewer"),
  classId: z.string().min(1, "classId is required"),
  subclassId: z.string().optional(),
  communityId: z.string().optional(),
  ancestryId: z.string().optional(),
  level: z.number().int().min(1).max(10).default(1),
  experiences: z
    .array(
      z.object({
        name: z.string().min(1, "Experience name cannot be empty").max(100),
        bonus: z.number().int().default(2),
      })
    )
    .max(2, "At most 2 experiences may be provided at creation")
    .optional()
    .default([]),
});

const PutCharacterSchema = z.object({
  name: z.string().min(1).max(60),
  classId: z.string().min(1),
  subclassId: z.string().nullable().optional(),
  communityId: z.string().nullable().optional(),
  ancestryId: z.string().nullable().optional(),
  level: z.number().int().min(1).max(10),
  stats: CoreStatsSchema,
  derivedStats: z.object({
    evasion: z.number().int().min(0),
    armor: z.number().int().min(0),
  }),
  trackers: z.object({
    hp: SlotTrackerSchema,
    stress: SlotTrackerSchema,
    armor: SlotTrackerSchema,
  }),
  damageThresholds: z.object({
    // SRD page 20: only Major and Severe thresholds are defined numerically.
    major: z.number().int().min(0),
    severe: z.number().int().min(0),
  }),
  weapons: z
    .object({
      primary: WeaponSchema,
      secondary: WeaponSchema,
    })
    .optional(),
  // SRD page 20: hope is capped at hopeMax (default 6); hopeMax can be reduced by death scars.
  hope: z.number().int().min(0).max(6),
  hopeMax: z.number().int().min(0).max(6).optional().default(6),
  // SRD page 3/22: Proficiency is a scalar integer starting at 1, max 4.
  proficiency: z.number().int().min(1).max(4).optional().default(1),
  experiences: z
    .array(z.object({ name: z.string(), bonus: z.number().int() }))
    .optional(),
  conditions: z.array(z.string()).optional(),
  domainLoadout: z.array(z.string()).max(5).optional(),
  domainVault: z.array(z.string()).optional(),
  classFeatureState: z
    .record(
      z.object({
        tokens: z.number().int().min(0),
        active: z.boolean(),
        extra: z.record(z.unknown()).optional(),
      })
    )
    .optional(),
  notes: z.string().nullable().optional(),
  avatarKey: z.string().nullable().optional(),
  traitBonuses: z.record(z.string(), z.number().int()).optional().default({}),
  // ── Campaign fields ───────────────────────────────────────────────────────
  cardTokens: z.record(z.string(), z.number().int().min(0)).optional().default({}),
  downtimeProjects: z.array(DowntimeProjectSchema).optional().default([]),
  activeAuras: z.array(z.string()).optional().default([]),
  companionState: CompanionStateSchema.nullable().optional().default(null),
  reputationBonuses: z.record(z.string(), z.number().int()).optional().default({}),
  customConditions: z.array(CustomConditionSchema).optional().default([]),
});

const PatchCharacterSchema = PutCharacterSchema.partial();

const RestSchema = z.object({
  restType: z.enum(["short", "long"]),
});

// ── Downtime Project Schemas ──────────────────────────────────────────────────

const CreateProjectSchema = z.object({
  cardId: z.string().nullable().optional().default(null),
  name: z.string().min(1).max(120),
  countdownMax: z.number().int().min(1),
  repeatable: z.boolean().optional().default(false),
  notes: z.string().nullable().optional().default(null),
});

const PatchProjectSchema = z.object({
  /** Tick the countdown by 1. */
  tick: z.boolean().optional(),
  /** Manually set countdownCurrent (clamped to [0, countdownMax]). */
  countdownCurrent: z.number().int().min(0).optional(),
  /** Mark as completed. */
  completed: z.boolean().optional(),
  notes: z.string().nullable().optional(),
});

// ── Action Schema ─────────────────────────────────────────────────────────────

const ActionSchema = z.object({
  actionId: z.enum([
    "use-hope-feature",
    "spend-token",
    "add-token",
    "clear-tokens",
    "toggle-aura",
    "tick-project",
    "clear-stress",
    "clear-hp",
    "mark-stress",
    "mark-hp",
    "gain-hope",
    "spend-hope",
    "companion-clear-stress",
    "companion-mark-stress",
  ] as const),
  params: z.record(z.unknown()).optional().default({}),
});

// ─── DynamoDB Record Shape ────────────────────────────────────────────────────

interface CharacterRecord extends Character {
  PK: string;
  SK: string;
}

interface ClassRecord {
  PK: string;
  SK: string;
  classId: string;
  name: string;
  domains: string[];
  startingEvasion: number;
  startingHitPoints: number;
  classItems?: string[];
  hopeFeature?: Record<string, unknown>;
  classFeature?: Record<string, unknown>;
  backgroundQuestions?: string[];
  connectionQuestions?: string[];
  mechanicalNotes?: string;
  source?: string;
}

interface GameDataRecord {
  PK: string;
  SK: string;
  id: string;
  name: string;
  type: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function emptyWeapon(): Weapons["primary"] {
  return {
    name: null,
    trait: null,
    damage: null,
    range: null,
    type: null,
    burden: null,
    tier: null,
    feature: null,
  };
}

/** Normalize a Zod-parsed weapon (which may have undefined fields) to the canonical Weapons type.
 * Imported from ./helpers */

function defaultStats(): CoreStats {
  return {
    agility: 0,
    strength: 0,
    finesse: 0,
    instinct: 0,
    presence: 0,
    knowledge: 0,
  };
}

function buildAvatarUrl(avatarKey: string | null | undefined): string | null {
  if (!avatarKey) return null;
  const cdnBase =
    process.env["CDN_BASE_URL"] ?? "https://cdn.daggerheart.example.com";
  return `${cdnBase}/${avatarKey}`;
}

// deepMerge, encodeCursor, decodeCursor, signShareToken, validateSrdRules,
// applyRest, normalizeWeapons are imported from ./helpers above.

// ─── Lookup Helpers ───────────────────────────────────────────────────────────

async function lookupClass(classId: string): Promise<ClassRecord> {
  const record = await getItem<ClassRecord>({
    TableName: CLASSES_TABLE,
    Key: keys.classMetadata(classId),
  });
  if (!record) {
    throw AppError.badRequest("Class not found", [
      { field: "classId", issue: `Unknown classId: ${classId}` },
    ]);
  }
  return record;
}

async function lookupGameData(
  prefix: string,
  id: string
): Promise<GameDataRecord | null> {
  return getItem<GameDataRecord>({
    TableName: GAME_DATA_TABLE,
    Key: keys.gameData(prefix, id),
  });
}

// ─── Rest Logic ───────────────────────────────────────────────────────────────

const SHORT_REST_ACTIONS: DowntimeAction[] = [
  {
    id: "clear-stress",
    name: "Clear Stress",
    description: "Remove 2 stress marks.",
    available: true,
  },
  {
    id: "tend-wounds",
    name: "Tend Wounds",
    description: "Restore 1 HP mark.",
    available: true,
  },
];

const LONG_REST_ACTIONS: DowntimeAction[] = [
  {
    id: "full-recovery",
    name: "Full Recovery",
    description: "Clear all HP, stress, and armor slots.",
    available: true,
  },
  {
    id: "train",
    name: "Train",
    description: "Work toward your next level advancement.",
    available: true,
  },
  {
    id: "connect",
    name: "Connect",
    description: "Strengthen a bond with a companion.",
    available: true,
  },
  {
    id: "craft",
    name: "Craft",
    description: "Create or repair an item.",
    available: true,
  },
  {
    id: "seek-knowledge",
    name: "Seek Knowledge",
    description: "Research a topic or seek guidance.",
    available: true,
  },
];

// applyRest is imported from ./helpers above.

// ─── Character Serialization ──────────────────────────────────────────────────

function toCharacterResponse(
  record: CharacterRecord,
  enrichment?: {
    className?: string;
    subclassName?: string | null;
    communityName?: string | null;
    ancestryName?: string | null;
  }
): Character & {
  className: string;
  subclassName: string | null;
  communityName: string | null;
  ancestryName: string | null;
  avatarUrl: string | null;
} {
  return {
    characterId: record.characterId,
    userId: record.userId,
    name: record.name,
    classId: record.classId,
    className: enrichment?.className ?? record.classId,
    subclassId: record.subclassId ?? null,
    subclassName: enrichment?.subclassName ?? null,
    communityId: record.communityId ?? null,
    communityName: enrichment?.communityName ?? null,
    ancestryId: record.ancestryId ?? null,
    ancestryName: enrichment?.ancestryName ?? null,
    level: record.level,
    domains: record.domains ?? [],
    stats: record.stats,
    derivedStats: record.derivedStats,
    trackers: record.trackers,
    damageThresholds: record.damageThresholds,
    weapons: record.weapons,
    hope: record.hope,
    hopeMax: record.hopeMax ?? 6,
    proficiency: record.proficiency ?? 1,
    experiences: record.experiences ?? [],
    conditions: record.conditions ?? [],
    domainLoadout: record.domainLoadout ?? [],
    domainVault: record.domainVault ?? [],
    classFeatureState: record.classFeatureState ?? {},
    traitBonuses: record.traitBonuses ?? {},
    notes: record.notes ?? null,
    avatarKey: record.avatarKey ?? null,
    avatarUrl: buildAvatarUrl(record.avatarKey),
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    // ── Campaign fields ───────────────────────────────────────────────────
    cardTokens: record.cardTokens ?? {},
    downtimeProjects: record.downtimeProjects ?? [],
    activeAuras: record.activeAuras ?? [],
    companionState: record.companionState ?? null,
    reputationBonuses: record.reputationBonuses ?? {},
    customConditions: record.customConditions ?? [],
  };
}

async function enrichCharacter(record: CharacterRecord): Promise<
  Character & {
    className: string;
    subclassName: string | null;
    communityName: string | null;
    ancestryName: string | null;
    avatarUrl: string | null;
  }
> {
  const [classRecord, communityRecord, ancestryRecord] = await Promise.all([
    getItem<ClassRecord>({
      TableName: CLASSES_TABLE,
      Key: keys.classMetadata(record.classId),
    }),
    record.communityId
      ? lookupGameData("COMMUNITY", record.communityId)
      : Promise.resolve(null),
    record.ancestryId
      ? lookupGameData("ANCESTRY", record.ancestryId)
      : Promise.resolve(null),
  ]);

  let subclassName: string | null = null;
  if (record.subclassId && classRecord) {
    const subclassRecord = await getItem<{ name: string }>({
      TableName: CLASSES_TABLE,
      Key: keys.classSubclass(record.classId, record.subclassId),
    });
    subclassName = subclassRecord?.name ?? null;
  }

  return toCharacterResponse(record, {
    className: classRecord?.name ?? record.classId,
    subclassName,
    communityName: communityRecord?.name ?? null,
    ancestryName: ancestryRecord?.name ?? null,
  });
}

// ─── Route Handlers ───────────────────────────────────────────────────────────

async function listCharacters(
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> {
  const userId = extractUserId(event);
  const limit = Math.min(
    Math.max(getQueryParamInt(event, "limit", 20) ?? 20, 1),
    100
  );
  const cursorRaw = getQueryParam(event, "cursor");
  const exclusiveStartKey = cursorRaw ? decodeCursor(cursorRaw) : undefined;

  const { items, lastEvaluatedKey } = await queryPage<CharacterRecord>({
    TableName: CHARACTERS_TABLE,
    KeyConditionExpression: "PK = :pk AND begins_with(SK, :skPrefix)",
    ExpressionAttributeValues: {
      ":pk": `USER#${userId}`,
      ":skPrefix": "CHARACTER#",
    },
    Limit: limit,
    ExclusiveStartKey: exclusiveStartKey,
  });

  // Resolve class names in parallel for all results
  const summaries: CharacterSummary[] = await Promise.all(
    items.map(async (record) => {
      const classRecord = await getItem<ClassRecord>({
        TableName: CLASSES_TABLE,
        Key: keys.classMetadata(record.classId),
      });
      return {
        characterId: record.characterId,
        userId: record.userId,
        name: record.name,
        classId: record.classId,
        className: classRecord?.name ?? record.classId,
        subclassId: record.subclassId ?? null,
        subclassName: null,
        communityId: record.communityId ?? null,
        communityName: null,
        ancestryId: record.ancestryId ?? null,
        ancestryName: null,
        level: record.level,
        avatarUrl: buildAvatarUrl(record.avatarKey),
        updatedAt: record.updatedAt,
      };
    })
  );

  return createSuccessResponse({
    characters: summaries,
    cursor: lastEvaluatedKey ? encodeCursor(lastEvaluatedKey) : null,
  });
}

async function createCharacter(
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> {
  const userId = extractUserId(event);
  const input = parseBody(event, CreateCharacterSchema);

  // Look up class to derive starting stats and domains
  const classRecord = await lookupClass(input.classId);

  const now = new Date().toISOString();
  const characterId = uuidv4();

  const defaultTrackers: CharacterTrackers = {
    hp: { max: classRecord.startingHitPoints, marked: 0 },
    stress: { max: 6, marked: 0 },
    armor: { max: 3, marked: 0 },
  };

  const defaultDamageThresholds: DamageThresholds = {
    // SRD page 20: only Major and Severe defined; user fills in based on armor + level.
    major: 0,
    severe: 0,
  };

  const defaultWeapons: Weapons = {
    primary: emptyWeapon(),
    secondary: emptyWeapon(),
  };

  const derivedStats: DerivedStats = {
    evasion: classRecord.startingEvasion,
    armor: 0,
  };

  const defaultFeatureState: ClassFeatureState = {};

  const character: CharacterRecord = {
    PK: `USER#${userId}`,
    SK: `CHARACTER#${characterId}`,
    characterId,
    userId,
    name: input.name,
    classId: input.classId,
    className: classRecord.name,
    subclassId: input.subclassId ?? null,
    subclassName: null,
    communityId: input.communityId ?? null,
    communityName: null,
    ancestryId: input.ancestryId ?? null,
    ancestryName: null,
    level: input.level ?? 1,
    domains: classRecord.domains ?? [],
    stats: defaultStats(),
    derivedStats,
    trackers: defaultTrackers,
    damageThresholds: defaultDamageThresholds,
    weapons: defaultWeapons,
    hope: 2,
    hopeMax: 6,
    proficiency: 1,
    experiences: (input.experiences ?? []).map((e) => ({
      name: e.name,
      bonus: e.bonus ?? 2,
    })),
    conditions: [],
    domainLoadout: [],
    domainVault: [],
    classFeatureState: defaultFeatureState,
    traitBonuses: {},
    notes: null,
    avatarKey: null,
    avatarUrl: null,
    createdAt: now,
    updatedAt: now,
    // ── Campaign fields ───────────────────────────────────────────────────
    cardTokens: {},
    downtimeProjects: [],
    activeAuras: [],
    companionState: null,
    reputationBonuses: {},
    customConditions: [],
  };

  await putItem({
    TableName: CHARACTERS_TABLE,
    Item: character,
    ConditionExpression:
      "attribute_not_exists(PK) AND attribute_not_exists(SK)",
  });

  const response = await enrichCharacter(character);
  return createSuccessResponse(response, 201);
}

async function getCharacter(
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> {
  const userId = extractUserId(event);
  const characterId = requirePathParam(event, "characterId");

  const record = await getItem<CharacterRecord>({
    TableName: CHARACTERS_TABLE,
    Key: keys.character(userId, characterId),
  });

  if (!record) throw AppError.notFound("Character", characterId);
  if (record.userId !== userId) throw AppError.forbidden();

  const response = await enrichCharacter(record);
  return createSuccessResponse(response);
}

async function updateCharacter(
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> {
  const userId = extractUserId(event);
  const characterId = requirePathParam(event, "characterId");

  const existing = await getItem<CharacterRecord>({
    TableName: CHARACTERS_TABLE,
    Key: keys.character(userId, characterId),
  });
  if (!existing) throw AppError.notFound("Character", characterId);
  if (existing.userId !== userId) throw AppError.forbidden();

  const input = parseBody(event, PutCharacterSchema);

  const srdErrors = validateSrdRules(input as Partial<Character>);
  if (srdErrors.length > 0) {
    throw AppError.srdViolation("Character data violates SRD rules", srdErrors);
  }

  const now = new Date().toISOString();

  const updated: CharacterRecord = {
    ...existing,
    ...input,
    characterId: existing.characterId,
    userId: existing.userId,
    PK: existing.PK,
    SK: existing.SK,
    createdAt: existing.createdAt,
    updatedAt: now,
    experiences: input.experiences ?? existing.experiences,
    conditions: input.conditions ?? existing.conditions,
    domainLoadout: input.domainLoadout ?? existing.domainLoadout,
    domainVault: input.domainVault ?? existing.domainVault,
    classFeatureState: input.classFeatureState ?? existing.classFeatureState,
    weapons: input.weapons
      ? normalizeWeapons(input.weapons)
      : existing.weapons,
  };

  await putItem({
    TableName: CHARACTERS_TABLE,
    Item: updated,
    ConditionExpression: "attribute_exists(PK) AND attribute_exists(SK)",
  });

  const response = await enrichCharacter(updated);
  return createSuccessResponse(response);
}

async function patchCharacter(
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> {
  const userId = extractUserId(event);
  const characterId = requirePathParam(event, "characterId");

  const existing = await getItem<CharacterRecord>({
    TableName: CHARACTERS_TABLE,
    Key: keys.character(userId, characterId),
  });
  if (!existing) throw AppError.notFound("Character", characterId);
  if (existing.userId !== userId) throw AppError.forbidden();

  // Parse and validate the patch (Zod partial schema)
  const patch = parseBody(event, PatchCharacterSchema);

  // Deep merge: objects merged recursively, arrays replaced outright, primitives overwritten
  const merged = deepMerge(
    existing as unknown as Record<string, unknown>,
    patch as Record<string, unknown>
  ) as unknown as CharacterRecord;

  // Restore immutable fields
  merged.characterId = existing.characterId;
  merged.userId = existing.userId;
  merged.PK = existing.PK;
  merged.SK = existing.SK;
  merged.createdAt = existing.createdAt;
  merged.updatedAt = new Date().toISOString();

  const srdErrors = validateSrdRules(merged as Partial<Character>);
  if (srdErrors.length > 0) {
    throw AppError.srdViolation("Character data violates SRD rules", srdErrors);
  }

  await putItem({
    TableName: CHARACTERS_TABLE,
    Item: merged,
    ConditionExpression: "attribute_exists(PK) AND attribute_exists(SK)",
  });

  const response = await enrichCharacter(merged);
  return createSuccessResponse(response);
}

async function deleteCharacter(
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> {
  const userId = extractUserId(event);
  const characterId = requirePathParam(event, "characterId");

  const existing = await getItem<CharacterRecord>({
    TableName: CHARACTERS_TABLE,
    Key: keys.character(userId, characterId),
  });
  if (!existing) throw AppError.notFound("Character", characterId);
  if (existing.userId !== userId) throw AppError.forbidden();

  await deleteItem({
    TableName: CHARACTERS_TABLE,
    Key: keys.character(userId, characterId),
    ConditionExpression: "attribute_exists(PK)",
  });

  return { statusCode: 204, body: "" };
}

async function takeRest(
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> {
  const userId = extractUserId(event);
  const characterId = requirePathParam(event, "characterId");

  const existing = await getItem<CharacterRecord>({
    TableName: CHARACTERS_TABLE,
    Key: keys.character(userId, characterId),
  });
  if (!existing) throw AppError.notFound("Character", characterId);
  if (existing.userId !== userId) throw AppError.forbidden();

  const { restType } = parseBody(event, RestSchema);

  const { character: updatedCharacter, cleared } = applyRest(
    existing as unknown as Character,
    restType
  );

  const updatedRecord: CharacterRecord = {
    ...existing,
    ...(updatedCharacter as Partial<CharacterRecord>),
    PK: existing.PK,
    SK: existing.SK,
  };

  await putItem({
    TableName: CHARACTERS_TABLE,
    Item: updatedRecord,
  });

  const enriched = await enrichCharacter(updatedRecord);

  const actionsAvailable: DowntimeAction[] =
    restType === "short" ? SHORT_REST_ACTIONS : LONG_REST_ACTIONS;

  const result: RestResult = {
    restType,
    actionsAvailable,
    cleared,
    character: enriched,
  };

  return createSuccessResponse(result);
}

async function getShareToken(
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> {
  const userId = extractUserId(event);
  const characterId = requirePathParam(event, "characterId");

  const existing = await getItem<CharacterRecord>({
    TableName: CHARACTERS_TABLE,
    Key: keys.character(userId, characterId),
  });
  if (!existing) throw AppError.notFound("Character", characterId);
  if (existing.userId !== userId) throw AppError.forbidden();

  // exp = now + 7 days, in Unix epoch seconds
  const exp = Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60;
  const expiresAt = new Date(exp * 1000).toISOString();

  const shareToken = signShareToken(characterId, userId, exp);

  const frontendUrl =
    process.env["FRONTEND_URL"] ?? "https://app.daggerheart.example.com";
  const shareUrl = `${frontendUrl}/character/${characterId}/view?token=${shareToken}`;

  return createSuccessResponse({ shareToken, shareUrl, expiresAt });
}

/**
 * Public (no-auth) read of a shared character sheet.
 * Accepts a share token in the query string and verifies its HMAC signature
 * before returning the read-only character snapshot.
 */
async function getSharedCharacter(
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> {
  const characterId = requirePathParam(event, "characterId");
  const token = event.queryStringParameters?.["token"];

  if (!token) {
    return createErrorResponse("UNAUTHORIZED", "Share token is required", 401);
  }

  let payload: { characterId: string; userId: string; exp: number };
  try {
    payload = verifyShareToken(token, characterId);
  } catch (err) {
    if (err instanceof AppError) {
      return createErrorResponse(err.code, err.message, err.statusCode);
    }
    return createErrorResponse("UNAUTHORIZED", "Invalid share token", 401);
  }

  // Fetch the character (no userId check — token proves ownership)
  const record = await getItem<CharacterRecord>({
    TableName: CHARACTERS_TABLE,
    Key: keys.character(payload.userId, characterId),
  });

  if (!record) {
    return createErrorResponse("NOT_FOUND", "Character not found", 404);
  }

  const response = await enrichCharacter(record);
  return createSuccessResponse(response);
}

// ─── Downtime Project Route Handlers ─────────────────────────────────────────

async function createProject(
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> {
  const userId = extractUserId(event);
  const characterId = requirePathParam(event, "characterId");

  const existing = await getItem<CharacterRecord>({
    TableName: CHARACTERS_TABLE,
    Key: keys.character(userId, characterId),
  });
  if (!existing) throw AppError.notFound("Character", characterId);
  if (existing.userId !== userId) throw AppError.forbidden();

  const input = parseBody(event, CreateProjectSchema);
  const now = new Date().toISOString();

  const project: DowntimeProject = {
    projectId: uuidv4(),
    cardId: input.cardId ?? null,
    name: input.name,
    countdownMax: input.countdownMax,
    countdownCurrent: 0,
    repeatable: input.repeatable ?? false,
    completed: false,
    completedAt: null,
    notes: input.notes ?? null,
  };

  const updatedRecord: CharacterRecord = {
    ...existing,
    downtimeProjects: [...(existing.downtimeProjects ?? []), project],
    updatedAt: now,
  };

  await putItem({
    TableName: CHARACTERS_TABLE,
    Item: updatedRecord,
    ConditionExpression: "attribute_exists(PK) AND attribute_exists(SK)",
  });

  const response = await enrichCharacter(updatedRecord);
  return createSuccessResponse(response, 201);
}

async function patchProject(
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> {
  const userId = extractUserId(event);
  const characterId = requirePathParam(event, "characterId");
  const projectId = requirePathParam(event, "projectId");

  const existing = await getItem<CharacterRecord>({
    TableName: CHARACTERS_TABLE,
    Key: keys.character(userId, characterId),
  });
  if (!existing) throw AppError.notFound("Character", characterId);
  if (existing.userId !== userId) throw AppError.forbidden();

  const input = parseBody(event, PatchProjectSchema);
  const projects = existing.downtimeProjects ?? [];
  const idx = projects.findIndex((p) => p.projectId === projectId);
  if (idx === -1) throw AppError.notFound("DowntimeProject", projectId);

  const project = projects[idx]!;
  const now = new Date().toISOString();

  let updated = { ...project };

  if (input.notes !== undefined) updated.notes = input.notes;
  if (input.countdownCurrent !== undefined) {
    updated.countdownCurrent = Math.min(input.countdownCurrent, project.countdownMax);
  }
  if (input.tick === true) {
    updated.countdownCurrent = Math.min(updated.countdownCurrent + 1, project.countdownMax);
  }
  // Auto-complete if current reached max, or explicit flag
  const nowCompleted =
    input.completed === true || updated.countdownCurrent >= updated.countdownMax;
  if (nowCompleted && !updated.completed) {
    updated.completed = true;
    updated.completedAt = now;
  }

  const updatedProjects = [...projects];
  updatedProjects[idx] = updated;

  const updatedRecord: CharacterRecord = {
    ...existing,
    downtimeProjects: updatedProjects,
    updatedAt: now,
  };

  await putItem({
    TableName: CHARACTERS_TABLE,
    Item: updatedRecord,
    ConditionExpression: "attribute_exists(PK) AND attribute_exists(SK)",
  });

  const response = await enrichCharacter(updatedRecord);
  return createSuccessResponse(response);
}

async function deleteProject(
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> {
  const userId = extractUserId(event);
  const characterId = requirePathParam(event, "characterId");
  const projectId = requirePathParam(event, "projectId");

  const existing = await getItem<CharacterRecord>({
    TableName: CHARACTERS_TABLE,
    Key: keys.character(userId, characterId),
  });
  if (!existing) throw AppError.notFound("Character", characterId);
  if (existing.userId !== userId) throw AppError.forbidden();

  const projects = existing.downtimeProjects ?? [];
  const idx = projects.findIndex((p) => p.projectId === projectId);
  if (idx === -1) throw AppError.notFound("DowntimeProject", projectId);

  const updatedRecord: CharacterRecord = {
    ...existing,
    downtimeProjects: projects.filter((p) => p.projectId !== projectId),
    updatedAt: new Date().toISOString(),
  };

  await putItem({
    TableName: CHARACTERS_TABLE,
    Item: updatedRecord,
    ConditionExpression: "attribute_exists(PK) AND attribute_exists(SK)",
  });

  return { statusCode: 204, body: "" };
}

// ─── Actions Route Handler ────────────────────────────────────────────────────

async function executeAction(
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> {
  const userId = extractUserId(event);
  const characterId = requirePathParam(event, "characterId");

  const existing = await getItem<CharacterRecord>({
    TableName: CHARACTERS_TABLE,
    Key: keys.character(userId, characterId),
  });
  if (!existing) throw AppError.notFound("Character", characterId);
  if (existing.userId !== userId) throw AppError.forbidden();

  const { actionId, params: rawParams } = parseBody(event, ActionSchema);
  const params = rawParams ?? {};

  // Normalise raw params from the schema's Record<string, unknown> to ActionParams
  const actionParams = {
    cardId: typeof params["cardId"] === "string" ? params["cardId"] : undefined,
    n: typeof params["n"] === "number" ? params["n"] : undefined,
    hopeCost: typeof params["hopeCost"] === "number" ? params["hopeCost"] : undefined,
    projectId: typeof params["projectId"] === "string" ? params["projectId"] : undefined,
  };

  // applyAction throws AppError(422) on validity failure
  const updatedCharacter = applyAction(
    existing as unknown as Character,
    actionId as ActionId,
    actionParams
  );

  const updatedRecord: CharacterRecord = {
    ...(updatedCharacter as unknown as CharacterRecord),
    PK: existing.PK,
    SK: existing.SK,
    updatedAt: new Date().toISOString(),
  };

  await putItem({
    TableName: CHARACTERS_TABLE,
    Item: updatedRecord,
    ConditionExpression: "attribute_exists(PK) AND attribute_exists(SK)",
  });

  const response = await enrichCharacter(updatedRecord);
  return createSuccessResponse(response);
}

// ─── Route Dispatcher ─────────────────────────────────────────────────────────

export const handler = withErrorHandling(
  async (
    event: APIGatewayProxyEventV2WithJWTAuthorizer
  ): Promise<APIGatewayProxyResultV2> => {
    const routeKey = event.routeKey;

    switch (routeKey) {
      case "GET /characters":
        return listCharacters(event);
      case "POST /characters":
        return createCharacter(event);
      case "GET /characters/{characterId}":
        return getCharacter(event);
      case "PUT /characters/{characterId}":
        return updateCharacter(event);
      case "PATCH /characters/{characterId}":
        return patchCharacter(event);
      case "DELETE /characters/{characterId}":
        return deleteCharacter(event);
      case "POST /characters/{characterId}/rest":
        return takeRest(event);
      case "GET /characters/{characterId}/share":
        return getShareToken(event);
      case "GET /characters/{characterId}/view":
        return getSharedCharacter(event);
      // ── Campaign mechanics ──────────────────────────────────────────────
      case "POST /characters/{characterId}/projects":
        return createProject(event);
      case "PATCH /characters/{characterId}/projects/{projectId}":
        return patchProject(event);
      case "DELETE /characters/{characterId}/projects/{projectId}":
        return deleteProject(event);
      case "POST /characters/{characterId}/actions":
        return executeAction(event);
      default:
        return createErrorResponse("NOT_FOUND", "Route not found", 404);
    }
  }
);
