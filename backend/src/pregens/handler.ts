// backend/src/pregens/handler.ts
// Lambda handler for pre-generated character management.
//
// Three scopes:
//   1. System-wide pregens (admin only): POST/GET/DELETE /admin/pregens[/{pregenId}]
//   2. User-scoped pregens (any authenticated GM): POST/GET/DELETE /pregens[/{pregenId}]
//   3. Campaign pool (GM of that campaign): POST/GET/DELETE /campaigns/{id}/pregens/pool[/{pregenId}]
//
// Pregens are stored in the Characters table using:
//   System:   PK=PREGEN#SYSTEM       SK=PREGEN#{pregenId}
//   User:     PK=PREGEN#USER#{userId} SK=PREGEN#{pregenId}
//
// Campaign pool associations stored in the Campaigns table:
//   PK=CAMPAIGN#{campaignId}  SK=PREGENPOOL#{pregenId}
//   Contains: { source: "system" | "user", ownerId: string | null, pregenId }

import { v4 as uuidv4 } from "uuid";
import type {
  APIGatewayProxyEventV2WithJWTAuthorizer,
  APIGatewayProxyResultV2,
} from "aws-lambda";
import { z } from "zod";
import {
  AppError,
  createSuccessResponse,
  createNoContentResponse,
  extractUserId,
  parseBody,
  requirePathParam,
  withErrorHandling,
} from "../common/middleware";
import {
  CAMPAIGNS_TABLE,
  CHARACTERS_TABLE,
  getItem,
  putItem,
  deleteItem,
  queryItems,
} from "../common/dynamodb";
import type { Character, LevelUpChoices } from "@shared/types";
import { applyLevelUp } from "../characters/helpers";

// ─── DynamoDB Record Types ───────────────────────────────────────────────────

interface PregenRecord {
  PK: string;
  SK: string;
  pregenId: string;
  /** "system" for admin-created, "user" for GM-created. */
  scope: "system" | "user";
  /** The userId of the creator. Null for system pregens. */
  ownerId: string | null;
  /** Full Character data blob. */
  character: Character;
  /** Display name (denormalized for list views). */
  name: string;
  className: string;
  subclassName: string | null;
  ancestryName: string | null;
  communityName: string | null;
  domains: string[];
  nativeLevel: number;
  createdAt: string;
  updatedAt: string;
  sourceCharacterId?: string | null;
  /** Level snapshots: map from level number to Character blob at that level. */
  levelSnapshots?: Record<number, Character>;
}

/** Campaign pool pointer — associates a pregen with a campaign. */
interface CampaignPregenPoolRecord {
  PK: string;
  SK: string;
  campaignId: string;
  pregenId: string;
  /** Where the pregen lives — determines lookup PK. */
  source: "system" | "user";
  /** For user-scoped pregens, the owning userId. Null for system. */
  ownerId: string | null;
  addedAt: string;
  /** The level at which this pregen was added to the pool. */
  selectedLevel?: number;
}

// ─── Admin helpers (duplicated from characters/handler — kept local) ─────────

function parseGroups(
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): string[] {
  const claims = event.requestContext?.authorizer?.jwt?.claims;
  if (!claims) return [];
  const raw = claims["cognito:groups"];
  if (Array.isArray(raw)) return raw.map(String);
  if (typeof raw !== "string") return [];
  const stripped = raw.trim().replace(/^\[|\]$/g, "");
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.map(String)
      : stripped.split(/[\s,]+/).filter(Boolean);
  } catch {
    return stripped.split(/[\s,]+/).filter(Boolean);
  }
}

function isAdminGroup(
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): boolean {
  return parseGroups(event).includes("admin");
}

function requireAdminGroup(
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): void {
  if (!isAdminGroup(event)) {
    throw AppError.forbidden("Admin group membership is required");
  }
}

// ─── Campaign helper: assert caller is GM ────────────────────────────────────

interface CampaignMemberRecord {
  PK: string;
  SK: string;
  campaignId: string;
  userId: string;
  role: "gm" | "player";
  joinedAt: string;
}

async function assertCampaignGm(
  campaignId: string,
  userId: string
): Promise<void> {
  // Check GM membership
  const gmRecord = await getItem<CampaignMemberRecord>(
    CAMPAIGNS_TABLE,
    { PK: `CAMPAIGN#${campaignId}`, SK: `MEMBER#GM#${userId}` }
  );
  if (gmRecord) return;
  throw AppError.forbidden("Only GMs can manage the pre-gen pool for a campaign");
}

// ─── Zod Schemas ──────────────────────────────────────────────────────────────

const CharacterSchema = z.record(z.unknown()); // Accept any valid Character blob

const CreatePregenSchema = z.object({
  /** Full Character data. */
  character: CharacterSchema,
  /** Optional: the source character ID this pregen was designated from. */
  sourceCharacterId: z.string().optional(),
});

const LevelUpPregenSchema = z.object({
  targetLevel: z.number().int().min(2).max(10),
  advancements: z.array(z.object({
    type: z.string(),
    detail: z.string().optional(),
  })),
  newDomainCardId: z.string().nullable().optional().default(null),
  exchangeCardId: z.string().nullable().optional(),
  tierAchievementExperienceName: z.string().optional(),
});

const AddToPoolSchema = z.object({
  pregenId: z.string().min(1, "pregenId is required"),
  source: z.enum(["system", "user"]),

  ownerId: z.string().optional(),

  selectedLevel: z.number().int().min(1).max(10).optional(),
});

const UpdatePoolSchema = z.object({
  selectedLevel: z.number().int().min(1).max(10),
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function pregenPk(scope: "system" | "user", userId?: string): string {
  return scope === "system"
    ? "PREGEN#SYSTEM"
    : `PREGEN#USER#${userId}`;
}

function pregenSk(pregenId: string): string {
  return `PREGEN#${pregenId}`;
}

/**
 * Build level snapshots for a pregen character.
 *
 * Fresh builder-created pregens arrive at level 1, so replaying levelUpHistory from
 * that base works naturally. But edited or leveled pregens may already be at a higher
 * native level, and we no longer have a reversible way to reconstruct level 1 from the
 * current blob alone. In that case we must at minimum preserve an authoritative snapshot
 * for the character's current level so campaign imports can resolve that level directly.
 */
function buildLevelSnapshots(character: Character): Record<number, Character> {
  const snapshots: Record<number, Character> = {};
  const history = character.levelUpHistory ?? {};

  // Always preserve the current character at its actual level.
  snapshots[character.level] = JSON.parse(JSON.stringify(character));

  // If this is a builder-created level 1 character, it is also the true base snapshot.
  if (character.level === 1) {
    snapshots[1] = JSON.parse(JSON.stringify(character));
  }

  // Replay level-up history for levels 2..N when starting from a real level 1 base.
  if (character.level !== 1) {
    return snapshots;
  }

  let current: Character = JSON.parse(JSON.stringify(character));
  const sortedLevels = Object.keys(history).map(Number).sort((a, b) => a - b);

  for (const targetLevel of sortedLevels) {
    const advancements = history[targetLevel];
    if (!advancements) continue;
    const choices: LevelUpChoices = { targetLevel, advancements, newDomainCardId: null };
    try {
      current = applyLevelUp(current, choices);
      snapshots[targetLevel] = JSON.parse(JSON.stringify(current));
    } catch {
      // Stop at first invalid level-up
      break;
    }
  }

  return snapshots;
}

function buildPregenRecord(
  scope: "system" | "user",
  ownerId: string | null,
  character: Character,
  pregenId: string,
  now: string,
  sourceCharacterId?: string | null
): PregenRecord {
  return {
    PK: pregenPk(scope, ownerId ?? undefined),
    SK: pregenSk(pregenId),
    pregenId,
    scope,
    ownerId,
    character,
    name: character.name,
    className: character.className,
    subclassName: character.subclassName ?? null,
    ancestryName: character.ancestryName ?? null,
    communityName: character.communityName ?? null,
    domains: character.domains ?? [],
    nativeLevel: character.level,
    createdAt: now,
    updatedAt: now,
    sourceCharacterId: sourceCharacterId ?? null,
    levelSnapshots: buildLevelSnapshots(character),
  };
}

function toSummary(rec: PregenRecord) {
  return {
    pregenId: rec.pregenId,
    scope: rec.scope,
    ownerId: rec.ownerId,
    name: rec.name,
    className: rec.className,
    subclassName: rec.subclassName,
    ancestryName: rec.ancestryName,
    communityName: rec.communityName,
    domains: rec.domains,
    nativeLevel: rec.nativeLevel,
    availableLevels: rec.levelSnapshots
      ? Object.keys(rec.levelSnapshots).map(Number).sort((a, b) => a - b)
      : [rec.nativeLevel],
    createdAt: rec.createdAt,
    updatedAt: rec.updatedAt,
    sourceCharacterId: rec.sourceCharacterId ?? null,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// 1. ADMIN — System-wide Pregens
// ═══════════════════════════════════════════════════════════════════════════════

// POST /admin/pregens
async function adminCreatePregen(
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> {
  requireAdminGroup(event);
  const body = parseBody(event, CreatePregenSchema);
  const character = body.character as unknown as Character;

  const pregenId = `PREGEN-SYS-${uuidv4().slice(0, 8).toUpperCase()}`;
  const now = new Date().toISOString();

  // Stamp the character with the pregen ID
  character.characterId = pregenId;
  character.userId = "PREGEN-SYSTEM";
  character.campaignId = null;

  const record = buildPregenRecord("system", null, character, pregenId, now);
  await putItem(CHARACTERS_TABLE, record as unknown as Record<string, unknown>);

  return createSuccessResponse({ pregen: toSummary(record) }, 201);
}

// GET /admin/pregens
async function adminListPregens(
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> {
  requireAdminGroup(event);

  const records = await queryItems<PregenRecord>(
    CHARACTERS_TABLE,
    "PK = :pk AND begins_with(SK, :prefix)",
    { ":pk": "PREGEN#SYSTEM", ":prefix": "PREGEN#" }
  );

  return createSuccessResponse({
    pregens: records.map(toSummary),
  });
}

// GET /admin/pregens/{pregenId}
async function adminGetPregen(
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> {
  requireAdminGroup(event);
  const pregenId = requirePathParam(event, "pregenId");

  const record = await getItem<PregenRecord>(
    CHARACTERS_TABLE,
    { PK: "PREGEN#SYSTEM", SK: pregenSk(pregenId) }
  );
  if (!record) throw AppError.notFound("System pregen", pregenId);

  return createSuccessResponse({ pregen: { ...toSummary(record), character: record.character } });
}

// DELETE /admin/pregens/{pregenId}
async function adminDeletePregen(
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> {
  requireAdminGroup(event);
  const pregenId = requirePathParam(event, "pregenId");

  // Verify it exists
  const record = await getItem<PregenRecord>(
    CHARACTERS_TABLE,
    { PK: "PREGEN#SYSTEM", SK: pregenSk(pregenId) }
  );
  if (!record) throw AppError.notFound("System pregen", pregenId);

  await deleteItem(CHARACTERS_TABLE, { PK: "PREGEN#SYSTEM", SK: pregenSk(pregenId) });

  return createNoContentResponse();
}

// PUT /admin/pregens/{pregenId}
async function adminUpdatePregen(
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> {
  requireAdminGroup(event);
  const pregenId = requirePathParam(event, "pregenId");
  const body = parseBody(event, CreatePregenSchema);
  const character = body.character as unknown as Character;

  const existing = await getItem<PregenRecord>(
    CHARACTERS_TABLE,
    { PK: "PREGEN#SYSTEM", SK: pregenSk(pregenId) }
  );
  if (!existing) throw AppError.notFound("System pregen", pregenId);

  const now = new Date().toISOString();
  character.characterId = pregenId;
  character.userId = "PREGEN-SYSTEM";
  character.campaignId = null;

  const record: PregenRecord = {
    ...existing,
    character,
    name: character.name,
    className: character.className,
    subclassName: character.subclassName ?? null,
    ancestryName: character.ancestryName ?? null,
    communityName: character.communityName ?? null,
    domains: character.domains ?? [],
    nativeLevel: character.level,
    updatedAt: now,
    levelSnapshots: {
      ...(existing.levelSnapshots ?? {}),
      ...buildLevelSnapshots(character),
    },
  };

  await putItem(CHARACTERS_TABLE, record as unknown as Record<string, unknown>);
  return createSuccessResponse({ pregen: toSummary(record) });
}

// ═══════════════════════════════════════════════════════════════════════════════
// 2. USER — GM-scoped Pregens
// ═══════════════════════════════════════════════════════════════════════════════

// POST /pregens
async function userCreatePregen(
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> {
  const userId = extractUserId(event);
  const body = parseBody(event, CreatePregenSchema);
  const character = body.character as unknown as Character;
  const sourceCharacterId = body.sourceCharacterId ?? null;

  const pregenId = `PREGEN-USR-${uuidv4().slice(0, 8).toUpperCase()}`;
  const now = new Date().toISOString();

  character.characterId = pregenId;
  character.userId = userId;
  character.campaignId = null;

  const record = buildPregenRecord("user", userId, character, pregenId, now, sourceCharacterId);
  await putItem(CHARACTERS_TABLE, record as unknown as Record<string, unknown>);

  return createSuccessResponse({ pregen: toSummary(record) }, 201);
}

// GET /pregens
async function userListPregens(
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> {
  const userId = extractUserId(event);

  const records = await queryItems<PregenRecord>(
    CHARACTERS_TABLE,
    "PK = :pk AND begins_with(SK, :prefix)",
    { ":pk": pregenPk("user", userId), ":prefix": "PREGEN#" }
  );

  return createSuccessResponse({
    pregens: records.map(toSummary),
  });
}

// GET /pregens/{pregenId}
async function userGetPregen(
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> {
  const userId = extractUserId(event);
  const pregenId = requirePathParam(event, "pregenId");

  const record = await getItem<PregenRecord>(
    CHARACTERS_TABLE,
    { PK: pregenPk("user", userId), SK: pregenSk(pregenId) }
  );
  if (!record) throw AppError.notFound("Pregen character", pregenId);

  return createSuccessResponse({ pregen: { ...toSummary(record), character: record.character } });
}

// DELETE /pregens/{pregenId}
async function userDeletePregen(
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> {
  const userId = extractUserId(event);
  const pregenId = requirePathParam(event, "pregenId");

  const record = await getItem<PregenRecord>(
    CHARACTERS_TABLE,
    { PK: pregenPk("user", userId), SK: pregenSk(pregenId) }
  );
  if (!record) throw AppError.notFound("Pregen character", pregenId);

  await deleteItem(CHARACTERS_TABLE, {
    PK: pregenPk("user", userId),
    SK: pregenSk(pregenId),
  });

  return createNoContentResponse();
}

// PUT /pregens/{pregenId}
async function userUpdatePregen(
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> {
  const userId = extractUserId(event);
  const pregenId = requirePathParam(event, "pregenId");
  const body = parseBody(event, CreatePregenSchema);
  const character = body.character as unknown as Character;

  const existing = await getItem<PregenRecord>(
    CHARACTERS_TABLE,
    { PK: pregenPk("user", userId), SK: pregenSk(pregenId) }
  );
  if (!existing) throw AppError.notFound("Pregen character", pregenId);

  const now = new Date().toISOString();
  character.characterId = pregenId;
  character.userId = userId;
  character.campaignId = null;

  const record: PregenRecord = {
    ...existing,
    character,
    name: character.name,
    className: character.className,
    subclassName: character.subclassName ?? null,
    ancestryName: character.ancestryName ?? null,
    communityName: character.communityName ?? null,
    domains: character.domains ?? [],
    nativeLevel: character.level,
    updatedAt: now,
    levelSnapshots: {
      ...(existing.levelSnapshots ?? {}),
      ...buildLevelSnapshots(character),
    },
  };

  await putItem(CHARACTERS_TABLE, record as unknown as Record<string, unknown>);
  return createSuccessResponse({ pregen: toSummary(record) });
}

// POST /admin/pregens/{pregenId}/levelup
async function adminLevelUpPregen(
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> {
  requireAdminGroup(event);
  const pregenId = requirePathParam(event, "pregenId");
  const body = parseBody(event, LevelUpPregenSchema);

  const existing = await getItem<PregenRecord>(
    CHARACTERS_TABLE,
    { PK: "PREGEN#SYSTEM", SK: pregenSk(pregenId) }
  );
  if (!existing) throw AppError.notFound("System pregen", pregenId);

  const choices: LevelUpChoices = {
    targetLevel: body.targetLevel,
    advancements: body.advancements as LevelUpChoices["advancements"],
    newDomainCardId: body.newDomainCardId ?? null,
    exchangeCardId: body.exchangeCardId ?? null,
    tierAchievementExperienceName: body.tierAchievementExperienceName,
  };
  const updatedCharacter = applyLevelUp(existing.character, choices);
  const now = new Date().toISOString();

  const record: PregenRecord = {
    ...existing,
    character: updatedCharacter,
    name: updatedCharacter.name,
    className: updatedCharacter.className,
    subclassName: updatedCharacter.subclassName ?? null,
    ancestryName: updatedCharacter.ancestryName ?? null,
    communityName: updatedCharacter.communityName ?? null,
    domains: updatedCharacter.domains ?? [],
    nativeLevel: updatedCharacter.level,
    updatedAt: now,
    levelSnapshots: {
      ...(existing.levelSnapshots ?? {}),
      ...buildLevelSnapshots(updatedCharacter),
    },
  };

  await putItem(CHARACTERS_TABLE, record as unknown as Record<string, unknown>);
  return createSuccessResponse({ pregen: toSummary(record) });
}

// POST /pregens/{pregenId}/levelup
async function userLevelUpPregen(
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> {
  const userId = extractUserId(event);
  const pregenId = requirePathParam(event, "pregenId");
  const body = parseBody(event, LevelUpPregenSchema);

  const existing = await getItem<PregenRecord>(
    CHARACTERS_TABLE,
    { PK: pregenPk("user", userId), SK: pregenSk(pregenId) }
  );
  if (!existing) throw AppError.notFound("Pregen character", pregenId);

  const choices: LevelUpChoices = {
    targetLevel: body.targetLevel,
    advancements: body.advancements as LevelUpChoices["advancements"],
    newDomainCardId: body.newDomainCardId ?? null,
    exchangeCardId: body.exchangeCardId ?? null,
    tierAchievementExperienceName: body.tierAchievementExperienceName,
  };
  const updatedCharacter = applyLevelUp(existing.character, choices);
  const now = new Date().toISOString();

  const record: PregenRecord = {
    ...existing,
    character: updatedCharacter,
    name: updatedCharacter.name,
    className: updatedCharacter.className,
    subclassName: updatedCharacter.subclassName ?? null,
    ancestryName: updatedCharacter.ancestryName ?? null,
    communityName: updatedCharacter.communityName ?? null,
    domains: updatedCharacter.domains ?? [],
    nativeLevel: updatedCharacter.level,
    updatedAt: now,
    levelSnapshots: {
      ...(existing.levelSnapshots ?? {}),
      ...buildLevelSnapshots(updatedCharacter),
    },
  };

  await putItem(CHARACTERS_TABLE, record as unknown as Record<string, unknown>);
  return createSuccessResponse({ pregen: toSummary(record) });
}

// ═══════════════════════════════════════════════════════════════════════════════
// 3. CAMPAIGN POOL — Associate pregens with a campaign
// ═══════════════════════════════════════════════════════════════════════════════

// POST /campaigns/{campaignId}/pregens/pool
async function addToPool(
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> {
  const userId = extractUserId(event);
  const campaignId = requirePathParam(event, "campaignId");
  await assertCampaignGm(campaignId, userId);

  const body = parseBody(event, AddToPoolSchema);

  // Validate the pregen exists
  const lookupPk = body.source === "system"
    ? "PREGEN#SYSTEM"
    : `PREGEN#USER#${body.ownerId ?? userId}`;

  const pregen = await getItem<PregenRecord>(
    CHARACTERS_TABLE,
    { PK: lookupPk, SK: pregenSk(body.pregenId) }
  );
  if (!pregen) {
    throw AppError.notFound("Pre-generated character", body.pregenId);
  }

  // Check it's not already in the pool
  const existing = await getItem<CampaignPregenPoolRecord>(
    CAMPAIGNS_TABLE,
    { PK: `CAMPAIGN#${campaignId}`, SK: `PREGENPOOL#${body.pregenId}` }
  );
  if (existing) {
    throw AppError.conflict("This pre-generated character is already in the campaign pool");
  }

  const now = new Date().toISOString();
  const poolRecord: CampaignPregenPoolRecord = {
    PK: `CAMPAIGN#${campaignId}`,
    SK: `PREGENPOOL#${body.pregenId}`,
    campaignId,
    pregenId: body.pregenId,
    source: body.source,
    ownerId: body.source === "user" ? (body.ownerId ?? userId) : null,
    addedAt: now,
    selectedLevel: body.selectedLevel,
  };

  await putItem(CAMPAIGNS_TABLE, poolRecord as unknown as Record<string, unknown>);

  return createSuccessResponse({
    added: true,
    pregenId: body.pregenId,
    campaignId,
    source: body.source,
  }, 201);
}

// GET /campaigns/{campaignId}/pregens/pool
async function listPool(
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> {
  const userId = extractUserId(event);
  const campaignId = requirePathParam(event, "campaignId");
  await assertCampaignGm(campaignId, userId);

  const poolRecords = await queryItems<CampaignPregenPoolRecord>(
    CAMPAIGNS_TABLE,
    "PK = :pk AND begins_with(SK, :prefix)",
    {
      ":pk": `CAMPAIGN#${campaignId}`,
      ":prefix": "PREGENPOOL#",
    }
  );

  // Resolve each pool record to its pregen summary
  const pregens = [];
  for (const pr of poolRecords) {
    const lookupPk = pr.source === "system"
      ? "PREGEN#SYSTEM"
      : `PREGEN#USER#${pr.ownerId}`;

    const record = await getItem<PregenRecord>(
      CHARACTERS_TABLE,
      { PK: lookupPk, SK: pregenSk(pr.pregenId) }
    );
    if (record) {
        pregens.push({
          ...toSummary(record),
          addedAt: pr.addedAt,
          selectedLevel: pr.selectedLevel ?? record.nativeLevel,
        });
      }
  }

  return createSuccessResponse({ pregens, campaignId });
}

// DELETE /campaigns/{campaignId}/pregens/pool/{pregenId}
async function removeFromPool(
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> {
  const userId = extractUserId(event);
  const campaignId = requirePathParam(event, "campaignId");
  const pregenId = requirePathParam(event, "pregenId");
  await assertCampaignGm(campaignId, userId);

  const existing = await getItem<CampaignPregenPoolRecord>(
    CAMPAIGNS_TABLE,
    { PK: `CAMPAIGN#${campaignId}`, SK: `PREGENPOOL#${pregenId}` }
  );
  if (!existing) {
    throw AppError.notFound("Pre-gen in campaign pool", pregenId);
  }

  await deleteItem(CAMPAIGNS_TABLE, {
    PK: `CAMPAIGN#${campaignId}`,
    SK: `PREGENPOOL#${pregenId}`,
  });

  return createNoContentResponse();
}

// PATCH /campaigns/{campaignId}/pregens/pool/{pregenId}
async function updatePoolEntry(
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> {
  const userId = extractUserId(event);
  const campaignId = requirePathParam(event, "campaignId");
  const pregenId = requirePathParam(event, "pregenId");
  await assertCampaignGm(campaignId, userId);

  const body = parseBody(event, UpdatePoolSchema);

  const existing = await getItem<CampaignPregenPoolRecord>(
    CAMPAIGNS_TABLE,
    { PK: `CAMPAIGN#${campaignId}`, SK: `PREGENPOOL#${pregenId}` }
  );
  if (!existing) {
    throw AppError.notFound("Pre-gen in campaign pool", pregenId);
  }

  // Validate the selectedLevel is actually available on the pregen
  const lookupPk = existing.source === "system"
    ? "PREGEN#SYSTEM"
    : `PREGEN#USER#${existing.ownerId}`;
  const pregen = await getItem<PregenRecord>(
    CHARACTERS_TABLE,
    { PK: lookupPk, SK: pregenSk(pregenId) }
  );
  if (!pregen) {
    throw AppError.notFound("Pre-generated character", pregenId);
  }
  const available = Object.keys(pregen.levelSnapshots ?? {}).map(Number);
  if (available.length > 0 && !available.includes(body.selectedLevel)) {
    throw AppError.badRequest(`Level ${body.selectedLevel} is not available for this pre-gen`);
  }

  await putItem(CAMPAIGNS_TABLE, {
    ...existing,
    selectedLevel: body.selectedLevel,
  } as unknown as Record<string, unknown>);

  return createSuccessResponse({ updated: true, pregenId, campaignId, selectedLevel: body.selectedLevel });
}

// ═══════════════════════════════════════════════════════════════════════════════
// Main Handler
// ═══════════════════════════════════════════════════════════════════════════════

async function pregensHandler(
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> {
  const routeKey = event.routeKey;

  switch (routeKey) {
    // Admin — system-wide pregens
    case "POST /admin/pregens":
      return adminCreatePregen(event);
    case "GET /admin/pregens":
      return adminListPregens(event);
    case "GET /admin/pregens/{pregenId}":
      return adminGetPregen(event);
    case "PUT /admin/pregens/{pregenId}":
      return adminUpdatePregen(event);
    case "POST /admin/pregens/{pregenId}/levelup":
      return adminLevelUpPregen(event);
    case "DELETE /admin/pregens/{pregenId}":
      return adminDeletePregen(event);

    // User — GM-scoped pregens
    case "POST /pregens":
      return userCreatePregen(event);
    case "GET /pregens":
      return userListPregens(event);
    case "GET /pregens/{pregenId}":
      return userGetPregen(event);
    case "PUT /pregens/{pregenId}":
      return userUpdatePregen(event);
    case "POST /pregens/{pregenId}/levelup":
      return userLevelUpPregen(event);
    case "DELETE /pregens/{pregenId}":
      return userDeletePregen(event);

    // Campaign pool
    case "POST /campaigns/{campaignId}/pregens/pool":
      return addToPool(event);
    case "GET /campaigns/{campaignId}/pregens/pool":
      return listPool(event);
    case "DELETE /campaigns/{campaignId}/pregens/pool/{pregenId}":
      return removeFromPool(event);
    case "PATCH /campaigns/{campaignId}/pregens/pool/{pregenId}":
      return updatePoolEntry(event);

    default:
      return {
        statusCode: 404,
        body: JSON.stringify({
          error: { code: "NOT_FOUND", message: `Route not found: ${routeKey}` },
        }),
      };
  }
}

export const handler = withErrorHandling(pregensHandler);
