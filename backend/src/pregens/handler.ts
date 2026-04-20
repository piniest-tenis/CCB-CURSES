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
import type { Character } from "@shared/types";

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
});

const AddToPoolSchema = z.object({
  pregenId: z.string().min(1, "pregenId is required"),
  source: z.enum(["system", "user"]),
  /** Required when source="user". The owner userId of the pregen. */
  ownerId: z.string().optional(),
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

function buildPregenRecord(
  scope: "system" | "user",
  ownerId: string | null,
  character: Character,
  pregenId: string,
  now: string
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
    createdAt: rec.createdAt,
    updatedAt: rec.updatedAt,
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

  const pregenId = `PREGEN-USR-${uuidv4().slice(0, 8).toUpperCase()}`;
  const now = new Date().toISOString();

  character.characterId = pregenId;
  character.userId = userId;
  character.campaignId = null;

  const record = buildPregenRecord("user", userId, character, pregenId, now);
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
    case "DELETE /admin/pregens/{pregenId}":
      return adminDeletePregen(event);

    // User — GM-scoped pregens
    case "POST /pregens":
      return userCreatePregen(event);
    case "GET /pregens":
      return userListPregens(event);
    case "GET /pregens/{pregenId}":
      return userGetPregen(event);
    case "DELETE /pregens/{pregenId}":
      return userDeletePregen(event);

    // Campaign pool
    case "POST /campaigns/{campaignId}/pregens/pool":
      return addToPool(event);
    case "GET /campaigns/{campaignId}/pregens/pool":
      return listPool(event);
    case "DELETE /campaigns/{campaignId}/pregens/pool/{pregenId}":
      return removeFromPool(event);

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
