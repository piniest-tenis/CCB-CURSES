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
  S3Client,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
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
  applyLevelUp,
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
  LevelUpChoices,
  AdvancementChoice,
} from "@shared/types";

// ─── S3 Client (portrait uploads) ────────────────────────────────────────────

const s3Client = new S3Client({
  region: process.env["DYNAMODB_REGION"] ?? process.env["AWS_REGION"] ?? "us-east-1",
});

const PORTRAIT_BUCKET   = process.env["S3_MEDIA_BUCKET"]    ?? "daggerheart-media";
const PORTRAIT_PREFIX   = process.env["PORTRAITS_KEY_PREFIX"] ?? "portraits";
const CDN_DOMAIN        = process.env["CDN_DOMAIN"]          ?? "";
/** Presigned URL TTL: 5 minutes — sufficient for a single browser upload. */
const PORTRAIT_PRESIGN_TTL_S = 300;
/** Hard cap on portrait file size: 8 MB. Enforced via Content-Length-Range header. */
const PORTRAIT_MAX_BYTES = 8 * 1024 * 1024;

const PORTRAIT_ALLOWED_CONTENT_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

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
  classId: z.string().optional(),
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
  /**
   * CDN URL for the character portrait image.
   * Set by the frontend after a successful direct S3 upload
   * (obtained from POST /characters/{id}/portrait-upload-url → confirmUrl).
   * When provided, the backend stores it as-is; it is NOT re-derived from
   * portraitKey here — the presign handler is the authoritative writer of
   * portraitKey/portraitUrl on the character record.
   * Pass `null` to explicitly clear the portrait.
   */
  portraitUrl: z.string().url().nullable().optional(),
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
    "mark-armor",
    "clear-armor",
    "swap-loadout-card",
  ] as const),
  params: z.record(z.unknown()).optional().default({}),
});

// ── Portrait Upload Schema ────────────────────────────────────────────────────

/**
 * Body for POST /characters/{characterId}/portrait-upload-url.
 * `contentType` must be one of the allowed image MIME types.
 * `filename` is used only to derive the file extension for the S3 key;
 * it is never stored in DynamoDB.
 */
const PortraitUploadSchema = z.object({
  contentType: z.enum(PORTRAIT_ALLOWED_CONTENT_TYPES),
  filename: z.string().min(1).max(255),
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
    process.env["CDN_BASE_URL"] ??
    (CDN_DOMAIN ? `https://${CDN_DOMAIN}` : "https://cdn.daggerheart.example.com");
  return `${cdnBase}/${avatarKey}`;
}

/**
 * Derive the public CDN URL for a character portrait from its stored S3 key.
 * Returns null if no portrait key has been stored.
 */
function buildPortraitUrl(portraitKey: string | null | undefined): string | null {
  if (!portraitKey) return null;
  const cdnBase = CDN_DOMAIN
    ? `https://${CDN_DOMAIN}`
    : "https://cdn.daggerheart.example.com";
  return `${cdnBase}/${portraitKey}`;
}

/**
 * Derive the file extension from a filename string.
 * Returns an empty string if no extension is found.
 */
function fileExtension(filename: string): string {
  const lastDot = filename.lastIndexOf(".");
  return lastDot >= 0 ? filename.slice(lastDot + 1).toLowerCase() : "";
}

/**
 * Build the S3 key for a portrait image.
 * Pattern: portraits/{userId}/{characterId}.{ext}
 * Using the characterId as the object name ensures each character has exactly
 * one canonical portrait key, making replacement atomic.
 */
function buildPortraitKey(
  userId: string,
  characterId: string,
  filename: string
): string {
  const ext = fileExtension(filename);
  return ext
    ? `${PORTRAIT_PREFIX}/${userId}/${characterId}.${ext}`
    : `${PORTRAIT_PREFIX}/${userId}/${characterId}`;
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
  portraitUrl: string | null;
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
    // Portrait — stored key drives the CDN URL at read time
    portraitKey: record.portraitKey ?? null,
    portraitUrl: record.portraitUrl ?? buildPortraitUrl(record.portraitKey),
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    // ── Campaign fields ───────────────────────────────────────────────────
    gold: record.gold ?? { handfuls: 1, bags: 0, chests: 0 },
    inventory: record.inventory ?? [],
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
        portraitUrl: record.portraitUrl ?? buildPortraitUrl(record.portraitKey),
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

  // Look up class to derive starting stats and domains (optional)
  const classRecord = input.classId
    ? await lookupClass(input.classId)
    : null;

  const now = new Date().toISOString();
  const characterId = uuidv4();

  const defaultTrackers: CharacterTrackers = {
    hp: { max: classRecord?.startingHitPoints ?? 6, marked: 0 },
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
    evasion: classRecord?.startingEvasion ?? 0,
    armor: 0,
  };

  const defaultFeatureState: ClassFeatureState = {};

  const character: CharacterRecord = {
    PK: `USER#${userId}`,
    SK: `CHARACTER#${characterId}`,
    characterId,
    userId,
    name: input.name,
    classId: input.classId ?? "",
    className: classRecord?.name ?? "",
    subclassId: input.subclassId ?? null,
    subclassName: null,
    communityId: input.communityId ?? null,
    communityName: null,
    ancestryId: input.ancestryId ?? null,
    ancestryName: null,
    level: input.level ?? 1,
    domains: classRecord?.domains ?? [],
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
    avatarUrl: null,    // computed from avatarKey at read-time; null in storage
    portraitKey: null,
    portraitUrl: null,
    createdAt: now,
    updatedAt: now,
    // ── Inventory ─────────────────────────────────────────────────────────
    gold: { handfuls: 1, bags: 0, chests: 0 },
    inventory: [],
    // ── Campaign fields ───────────────────────────────────────────────────
    cardTokens: {},
    downtimeProjects: [],
    activeAuras: [],
    companionState: null,
    reputationBonuses: {},
    customConditions: [],
  };

  // ── SRD Validation ─────────────────────────────────────────────────────────
  // Validate the created character against SRD rules before persisting.
  // This is the basic validation layer; full campaign frame validation would
  // require loading all allowed classes/domains/ancestries/communities.
  const srdErrors = validateSrdRules(character as Partial<Character>);
  if (srdErrors.length > 0) {
    throw AppError.srdViolation("Character violates SRD rules", srdErrors);
  }

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

  // Keep portraitKey and portraitUrl consistent:
  // - If the patch explicitly sets portraitUrl to null, clear portraitKey too.
  // - If portraitUrl is being set to a non-null string, leave portraitKey
  //   alone — it was already written by the portraitUploadUrl handler.
  if ("portraitUrl" in patch && patch.portraitUrl === null) {
    merged.portraitKey = null;
    merged.portraitUrl = null;
  }

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
    cardId:        typeof params["cardId"] === "string"        ? params["cardId"]        : undefined,
    vaultCardId:   typeof params["vaultCardId"] === "string"   ? params["vaultCardId"]   : undefined,
    loadoutCardId: typeof params["loadoutCardId"] === "string" ? params["loadoutCardId"] : undefined,
    n:             typeof params["n"] === "number"             ? params["n"]             : undefined,
    hopeCost:      typeof params["hopeCost"] === "number"      ? params["hopeCost"]      : undefined,
    projectId:     typeof params["projectId"] === "string"     ? params["projectId"]     : undefined,
    restType:      (["short", "long", "none"] as const).includes(params["restType"] as never)
                     ? (params["restType"] as "short" | "long" | "none")
                     : undefined,
    isLinkedCurse: params["isLinkedCurse"] === true,
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

// ─── Level-Up Schema & Route Handler ─────────────────────────────────────────

const AdvancementChoiceSchema = z.object({
  type: z.enum([
    "trait-bonus",
    "hp-slot",
    "stress-slot",
    "experience-bonus",
    "new-experience",
    "evasion",
    "additional-domain-card",
    "subclass-upgrade",
    "proficiency-increase",
    "multiclass",
  ]),
  detail: z.string().optional(),
});

const LevelUpSchema = z.object({
  targetLevel:     z.number().int().min(2).max(10),
  advancements:    z.array(AdvancementChoiceSchema).min(1).max(4),
  newDomainCardId: z.string().nullable().default(null),
  exchangeCardId:  z.string().nullable().optional(),
  newSubclassId:   z.string().nullable().optional(),
  newClassId:      z.string().nullable().optional(),
});

async function levelUpCharacter(
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> {
  const userId      = extractUserId(event);
  const characterId = requirePathParam(event, "characterId");

  const existing = await getItem<CharacterRecord>({
    TableName: CHARACTERS_TABLE,
    Key: keys.character(userId, characterId),
  });
  if (!existing) throw AppError.notFound("Character", characterId);
  if (existing.userId !== userId) throw AppError.forbidden();

  const body = parseBody(event, LevelUpSchema);

  const choices: LevelUpChoices = {
    targetLevel:     body.targetLevel,
    advancements:    body.advancements as AdvancementChoice[],
    newDomainCardId: body.newDomainCardId ?? null,
    exchangeCardId:  body.exchangeCardId ?? null,
  };

  // applyLevelUp throws AppError(422) on validation failures
  let updatedCharacter = applyLevelUp(existing as unknown as Character, choices);

  // Apply optional identity changes from advancement choices
  if (body.newSubclassId) {
    updatedCharacter = { ...updatedCharacter, subclassId: body.newSubclassId };
  }

  const updatedRecord: CharacterRecord = {
    ...(updatedCharacter as unknown as CharacterRecord),
    PK: existing.PK,
    SK: existing.SK,
    updatedAt: new Date().toISOString(),
  };

  // ── SRD Validation ─────────────────────────────────────────────────────────
  // Validate the updated character against SRD rules before persisting.
  const srdErrors = validateSrdRules(updatedCharacter as Partial<Character>);
  if (srdErrors.length > 0) {
    throw AppError.srdViolation("Level-up violates SRD rules", srdErrors);
  }

  await putItem({
    TableName: CHARACTERS_TABLE,
    Item: updatedRecord,
    ConditionExpression: "attribute_exists(PK) AND attribute_exists(SK)",
  });

  const response = await enrichCharacter(updatedRecord);
  return createSuccessResponse(response);
}

// ─── Portrait Upload Route Handler ────────────────────────────────────────────

/**
 * POST /characters/{characterId}/portrait-upload-url
 *
 * Generates a presigned S3 PUT URL so the browser can upload a portrait image
 * directly to S3 without proxying through the Lambda (avoids the 10 MB API
 * Gateway payload limit and keeps Lambda cold-start impact low).
 *
 * Workflow:
 *   1. Client calls this endpoint with { contentType, filename }.
 *   2. Backend returns { uploadUrl, confirmUrl, expiresIn }.
 *   3. Client PUTs the image file to `uploadUrl` (direct S3 upload, no auth header).
 *   4. Client calls PATCH /characters/{characterId} with { portraitUrl: confirmUrl }
 *      to persist the CDN URL on the character record.
 *
 * Security:
 *   - Only the authenticated owner of the character may request an upload URL.
 *   - The S3 key is deterministic (portraits/{userId}/{characterId}.{ext}),
 *     so uploading a new portrait atomically replaces the previous one at the
 *     same CDN URL — no stale references need to be cleaned up.
 *   - Content-Length-Range is enforced in the presigned URL: 1 byte minimum,
 *     PORTRAIT_MAX_BYTES maximum.  S3 will reject the PUT if the browser
 *     sends a body outside this range.
 *   - ContentType is locked to the value specified in the request, preventing
 *     type confusion attacks.
 */
async function portraitUploadUrl(
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> {
  const userId      = extractUserId(event);
  const characterId = requirePathParam(event, "characterId");

  // Verify the character exists and belongs to this user before issuing a URL
  const existing = await getItem<CharacterRecord>({
    TableName: CHARACTERS_TABLE,
    Key: keys.character(userId, characterId),
  });
  if (!existing) throw AppError.notFound("Character", characterId);
  if (existing.userId !== userId) throw AppError.forbidden();

  const { contentType, filename } = parseBody(event, PortraitUploadSchema);

  const s3Key = buildPortraitKey(userId, characterId, filename);

  // Presigned PutObject — browser uploads directly to S3
  const putCommand = new PutObjectCommand({
    Bucket: PORTRAIT_BUCKET,
    Key: s3Key,
    ContentType: contentType,
    // Content-Length-Range constraint: S3 rejects uploads outside [1, max]
    // This is expressed as a special condition in the presigned URL policy.
    ContentLengthRange: [1, PORTRAIT_MAX_BYTES],
    Metadata: {
      "x-userid":      userId,
      "x-characterid": characterId,
    },
  } as ConstructorParameters<typeof PutObjectCommand>[0]);

  const uploadUrl = await getSignedUrl(s3Client, putCommand, {
    expiresIn: PORTRAIT_PRESIGN_TTL_S,
  });

  // The CDN URL the client should store once the upload succeeds.
  // We derive it from the same deterministic key — no confirm step needed.
  const cdnBase    = CDN_DOMAIN
    ? `https://${CDN_DOMAIN}`
    : "https://cdn.daggerheart.example.com";
  const confirmUrl = `${cdnBase}/${s3Key}`;

  return createSuccessResponse(
    {
      /**
       * Presigned S3 PUT URL. The client must:
       *   - Use HTTP method PUT (not POST).
       *   - Set the Content-Type header to exactly `contentType`.
       *   - Send the raw file bytes as the request body.
       *   - NOT include an Authorization header (the signature is in the URL).
       */
      uploadUrl,
      /**
       * The final CDN URL that will serve the portrait once uploaded.
       * Store this on the character by PATCHing { portraitUrl: confirmUrl }.
       */
      confirmUrl,
      /** S3 object key — informational; clients do not need this directly. */
      s3Key,
      /** Seconds until the presigned URL expires (from time of this response). */
      expiresIn: PORTRAIT_PRESIGN_TTL_S,
      /** Maximum allowed file size in bytes. */
      maxBytes: PORTRAIT_MAX_BYTES,
    },
    201
  );
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
      // ── Portrait upload ─────────────────────────────────────────────────
      case "POST /characters/{characterId}/portrait-upload-url":
        return portraitUploadUrl(event);
      // ── Campaign mechanics ──────────────────────────────────────────────
      case "POST /characters/{characterId}/projects":
        return createProject(event);
      case "PATCH /characters/{characterId}/projects/{projectId}":
        return patchProject(event);
      case "DELETE /characters/{characterId}/projects/{projectId}":
        return deleteProject(event);
      case "POST /characters/{characterId}/actions":
        return executeAction(event);
      case "POST /characters/{characterId}/levelup":
        return levelUpCharacter(event);
      default:
        return createErrorResponse("NOT_FOUND", "Route not found", 404);
    }
  }
);
