// backend/src/frames/handler.ts
// Lambda handler for all /frames/* and /campaigns/{campaignId}/frames/*
// and /campaigns/{campaignId}/conflicts/* routes.
// Route dispatch pattern on event.routeKey (HTTP API v2).

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
  FRAMES_TABLE,
  CAMPAIGNS_TABLE,
  getItem,
  putItem,
  updateItem,
  deleteItem,
  queryItems,
  batchWrite,
  keys,
} from "../common/dynamodb";
import type {
  CampaignFrame,
  CampaignFrameSummary,
  CampaignFrameDetail,
  FrameContentRef,
  FrameRestriction,
  FrameExtension,
  CampaignFrameAttachment,
  CampaignConflictResolution,
  HomebrewContentType,
  FrameRestrictableContentType,
  FrameExtensionType,
  FrameComplexityRating,
} from "@shared/types";

// ─── Internal DynamoDB Record Types ──────────────────────────────────────────

interface FrameRecord extends CampaignFrame {
  PK: string; // FRAME#{frameId}
  SK: string; // METADATA
  creatorUserId: string; // also used as GSI PK (creator-index)
}

interface FrameContentRecord extends FrameContentRef {
  PK: string; // FRAME#{frameId}
  SK: string; // CONTENT#{contentType}#{contentId}
  frameId: string;
}

interface FrameRestrictionRecord extends FrameRestriction {
  PK: string; // FRAME#{frameId}
  SK: string; // RESTRICTION#{contentType}#{contentId}
  frameId: string;
}

interface FrameExtensionRecord extends FrameExtension {
  PK: string; // FRAME#{frameId}
  SK: string; // EXTENSION#{extensionType}#{slug}
  frameId: string;
}

interface CampaignFrameAttachmentRecord extends CampaignFrameAttachment {
  PK: string; // CAMPAIGN#{campaignId}
  SK: string; // FRAME#{frameId}
}

interface CampaignConflictRecord extends CampaignConflictResolution {
  PK: string; // CAMPAIGN#{campaignId}
  SK: string; // CONFLICT#{contentType}#{normalizedName}
}

// ─── DynamoDB partition item union (for getFrame partition query) ─────────────

type FramePartitionItem =
  | (FrameRecord & { SK: string })
  | (FrameContentRecord & { SK: string })
  | (FrameRestrictionRecord & { SK: string })
  | (FrameExtensionRecord & { SK: string });

// ─── Zod Schemas ──────────────────────────────────────────────────────────────

const CreateFrameSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(120, "Name must be 120 characters or fewer"),
  author: z.string().max(120).nullable().optional().default(null),
  pitch: z.string().max(500).nullable().optional().default(null),
  overview: z.string().max(5000).nullable().optional().default(null),
  toneAndFeel: z.string().max(200).nullable().optional().default(null),
  complexity: z
    .enum(["low", "moderate", "high", "extreme"])
    .nullable()
    .optional()
    .default(null),
  themes: z.array(z.string().max(50)).max(10).optional().default([]),
  touchstones: z.array(z.string().max(100)).max(10).optional().default([]),
});

const UpdateFrameSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  author: z.string().max(120).nullable().optional(),
  pitch: z.string().max(500).nullable().optional(),
  overview: z.string().max(5000).nullable().optional(),
  toneAndFeel: z.string().max(200).nullable().optional(),
  complexity: z
    .enum(["low", "moderate", "high", "extreme"])
    .nullable()
    .optional(),
  themes: z.array(z.string().max(50)).max(10).optional(),
  touchstones: z.array(z.string().max(100)).max(10).optional(),
});

const HOMEBREW_CONTENT_TYPES = [
  "class",
  "community",
  "ancestry",
  "domainCard",
  "weapon",
  "armor",
  "item",
  "consumable",
] as const;

const RESTRICTABLE_CONTENT_TYPES = [
  "class",
  "community",
  "ancestry",
  "domainCard",
] as const;

const EXTENSION_TYPES = [
  "damageType",
  "adversaryType",
  "condition",
  "domain",
] as const;

const AddContentSchema = z.object({
  contentType: z.enum(HOMEBREW_CONTENT_TYPES),
  contentId: z.string().min(1),
  name: z.string().min(1).max(200),
});

const AddRestrictionSchema = z.object({
  contentType: z.enum(RESTRICTABLE_CONTENT_TYPES),
  contentId: z.string().min(1),
  name: z.string().min(1).max(200),
  mode: z.enum(["restricted", "altered"]),
  alterationNotes: z.string().max(5000).nullable().optional().default(null),
  alterationData: z.record(z.unknown()).nullable().optional().default(null),
});

const UpdateRestrictionSchema = z.object({
  mode: z.enum(["restricted", "altered"]).optional(),
  alterationNotes: z.string().max(5000).nullable().optional(),
  alterationData: z.record(z.unknown()).nullable().optional(),
});

const AddExtensionSchema = z.object({
  extensionType: z.enum(EXTENSION_TYPES),
  name: z.string().min(1).max(120),
  description: z.string().max(2000).nullable().optional().default(null),
  data: z.record(z.unknown()).nullable().optional().default(null),
});

const UpdateExtensionSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  description: z.string().max(2000).nullable().optional(),
  data: z.record(z.unknown()).nullable().optional(),
});

const AttachFrameSchema = z.object({
  frameId: z.string().uuid("frameId must be a valid UUID"),
});

const ResolveConflictSchema = z.object({
  contentType: z.string().min(1),
  contentName: z.string().min(1),
  winningFrameId: z.string().uuid(),
  competingFrameIds: z.array(z.string().uuid()).min(2),
});

// ─── Helper: slugify ──────────────────────────────────────────────────────────

/**
 * Convert a display name to a URL-safe slug.
 * Lowercase, trim, replace spaces/special chars with hyphens, collapse runs.
 */
function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// ─── Helper: strip DynamoDB keys from response objects ───────────────────────

/**
 * Remove PK, SK, and other internal DynamoDB attributes from an object
 * before returning it in an API response.
 */
function stripKeys<T extends { PK: string; SK: string }>(
  item: T
): Omit<T, "PK" | "SK"> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { PK, SK, ...rest } = item;
  return rest as Omit<T, "PK" | "SK">;
}

// ─── Helper: get frame or throw 404 ──────────────────────────────────────────

async function getFrameOrThrow(frameId: string): Promise<FrameRecord> {
  const frame = await getItem<FrameRecord>(
    FRAMES_TABLE,
    keys.frame(frameId)
  );
  if (!frame) {
    throw AppError.notFound("Frame", frameId);
  }
  return frame;
}

// ─── Helper: assert frame ownership ──────────────────────────────────────────

function assertFrameOwner(frame: FrameRecord, userId: string): void {
  if (frame.creatorUserId !== userId) {
    throw AppError.forbidden("You do not own this frame");
  }
}

// ─── Helper: assert campaign GM ──────────────────────────────────────────────

async function assertCampaignGm(
  campaignId: string,
  userId: string
): Promise<void> {
  const record = await getItem(
    CAMPAIGNS_TABLE,
    keys.campaignMember(campaignId, "GM", userId)
  );
  if (!record) {
    throw AppError.forbidden("You must be a GM of this campaign");
  }
}

// ─── Helper: assert campaign member (GM or PLAYER) ───────────────────────────

async function assertCampaignMember(
  campaignId: string,
  userId: string
): Promise<void> {
  const gmRecord = await getItem(
    CAMPAIGNS_TABLE,
    keys.campaignMember(campaignId, "GM", userId)
  );
  if (gmRecord) return;

  const playerRecord = await getItem(
    CAMPAIGNS_TABLE,
    keys.campaignMember(campaignId, "PLAYER", userId)
  );
  if (playerRecord) return;

  throw AppError.forbidden("You are not a member of this campaign");
}

// ─── Route Handlers: Frame CRUD ──────────────────────────────────────────────

// GET /frames — list the caller's frames
async function listFrames(
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> {
  const userId = extractUserId(event);

  // Query the creator-index GSI for all METADATA records owned by this user
  const frameRecords = await queryItems<FrameRecord>(
    FRAMES_TABLE,
    "creatorUserId = :uid",
    { ":uid": userId },
    undefined,
    "creator-index"
  );

  // For each frame, query its partition to count nested items.
  // Acceptable for MVP — users won't have hundreds of frames.
  const summaries: CampaignFrameSummary[] = await Promise.all(
    frameRecords.map(async (frame) => {
      const partitionItems = await queryItems<{ SK: string }>(
        FRAMES_TABLE,
        "PK = :pk",
        { ":pk": `FRAME#${frame.frameId}` }
      );

      let contentCount = 0;
      let restrictionCount = 0;
      let extensionCount = 0;

      for (const item of partitionItems) {
        if (item.SK.startsWith("CONTENT#")) contentCount++;
        else if (item.SK.startsWith("RESTRICTION#")) restrictionCount++;
        else if (item.SK.startsWith("EXTENSION#")) extensionCount++;
      }

      return {
        frameId: frame.frameId,
        name: frame.name,
        creatorUserId: frame.creatorUserId,
        author: frame.author,
        pitch: frame.pitch,
        complexity: frame.complexity,
        themes: frame.themes ?? [],
        contentCount,
        restrictionCount,
        extensionCount,
        createdAt: frame.createdAt,
        updatedAt: frame.updatedAt,
      };
    })
  );

  // Sort by updatedAt descending
  summaries.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  return createSuccessResponse(summaries);
}

// POST /frames — create a new frame
async function createFrame(
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> {
  const userId = extractUserId(event);
  const body = parseBody(event, CreateFrameSchema);

  const frameId = uuidv4();
  const now = new Date().toISOString();

  const frameRecord: FrameRecord = {
    PK: `FRAME#${frameId}`,
    SK: "METADATA",
    frameId,
    name: body.name,
    creatorUserId: userId,
    author: body.author ?? null,
    pitch: body.pitch ?? null,
    overview: body.overview ?? null,
    toneAndFeel: body.toneAndFeel ?? null,
    complexity: (body.complexity as FrameComplexityRating | null) ?? null,
    themes: body.themes ?? [],
    touchstones: body.touchstones ?? [],
    createdAt: now,
    updatedAt: now,
  };

  await putItem(
    FRAMES_TABLE,
    frameRecord as unknown as Record<string, unknown>
  );

  return createSuccessResponse(stripKeys(frameRecord), 201);
}

// GET /frames/{frameId} — full detail view
async function getFrame(
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> {
  // Any authenticated user can view a frame detail (for attachment preview).
  void extractUserId(event); // ensure authenticated
  const frameId = requirePathParam(event, "frameId");

  // Query the entire FRAME#{frameId} partition
  const allItems = await queryItems<FramePartitionItem>(
    FRAMES_TABLE,
    "PK = :pk",
    { ":pk": `FRAME#${frameId}` }
  );

  let frameMeta: FrameRecord | null = null;
  const contents: FrameContentRef[] = [];
  const restrictions: FrameRestriction[] = [];
  const extensions: FrameExtension[] = [];

  for (const item of allItems) {
    if (item.SK === "METADATA") {
      frameMeta = item as FrameRecord;
    } else if (item.SK.startsWith("CONTENT#")) {
      const rec = item as FrameContentRecord;
      contents.push({
        contentType: rec.contentType,
        contentId: rec.contentId,
        name: rec.name,
        addedAt: rec.addedAt,
      });
    } else if (item.SK.startsWith("RESTRICTION#")) {
      const rec = item as FrameRestrictionRecord;
      restrictions.push({
        contentType: rec.contentType,
        contentId: rec.contentId,
        name: rec.name,
        mode: rec.mode,
        alterationNotes: rec.alterationNotes,
        alterationData: rec.alterationData,
      });
    } else if (item.SK.startsWith("EXTENSION#")) {
      const rec = item as FrameExtensionRecord;
      extensions.push({
        extensionType: rec.extensionType,
        slug: rec.slug,
        name: rec.name,
        description: rec.description,
        data: rec.data,
      });
    }
  }

  if (!frameMeta) {
    throw AppError.notFound("Frame", frameId);
  }

  const detail: CampaignFrameDetail = {
    frameId: frameMeta.frameId,
    name: frameMeta.name,
    creatorUserId: frameMeta.creatorUserId,
    author: frameMeta.author,
    pitch: frameMeta.pitch,
    overview: frameMeta.overview,
    toneAndFeel: frameMeta.toneAndFeel,
    complexity: frameMeta.complexity,
    themes: frameMeta.themes ?? [],
    touchstones: frameMeta.touchstones ?? [],
    createdAt: frameMeta.createdAt,
    updatedAt: frameMeta.updatedAt,
    contents,
    restrictions,
    extensions,
  };

  return createSuccessResponse(detail);
}

// PATCH /frames/{frameId} — update frame metadata (owner only)
async function updateFrame(
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> {
  const userId = extractUserId(event);
  const frameId = requirePathParam(event, "frameId");
  const body = parseBody(event, UpdateFrameSchema);

  const frame = await getFrameOrThrow(frameId);
  assertFrameOwner(frame, userId);

  const now = new Date().toISOString();
  const updates: string[] = ["updatedAt = :now"];
  const vals: Record<string, unknown> = { ":now": now };
  const names: Record<string, string> = {};

  if (body.name !== undefined) {
    updates.push("#n = :name");
    vals[":name"] = body.name;
    names["#n"] = "name";
  }
  if (body.author !== undefined) {
    updates.push("author = :author");
    vals[":author"] = body.author;
  }
  if (body.pitch !== undefined) {
    updates.push("pitch = :pitch");
    vals[":pitch"] = body.pitch;
  }
  if (body.overview !== undefined) {
    updates.push("overview = :overview");
    vals[":overview"] = body.overview;
  }
  if (body.toneAndFeel !== undefined) {
    updates.push("toneAndFeel = :toneAndFeel");
    vals[":toneAndFeel"] = body.toneAndFeel;
  }
  if (body.complexity !== undefined) {
    updates.push("complexity = :complexity");
    vals[":complexity"] = body.complexity;
  }
  if (body.themes !== undefined) {
    updates.push("themes = :themes");
    vals[":themes"] = body.themes;
  }
  if (body.touchstones !== undefined) {
    updates.push("touchstones = :touchstones");
    vals[":touchstones"] = body.touchstones;
  }

  if (updates.length === 1) {
    // Only updatedAt — no actual fields to update
    throw AppError.badRequest("No updatable fields provided");
  }

  const updateExpr = `SET ${updates.join(", ")}`;
  await updateItem(
    FRAMES_TABLE,
    keys.frame(frameId),
    updateExpr,
    vals,
    Object.keys(names).length > 0 ? names : undefined
  );

  // Return the updated frame by re-fetching
  const updated = await getFrameOrThrow(frameId);
  return createSuccessResponse(stripKeys(updated));
}

// DELETE /frames/{frameId} — delete frame and all nested records (owner only)
async function deleteFrame(
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> {
  const userId = extractUserId(event);
  const frameId = requirePathParam(event, "frameId");

  const frame = await getFrameOrThrow(frameId);
  assertFrameOwner(frame, userId);

  // Query ALL items in the FRAME#{frameId} partition
  const allItems = await queryItems<{ PK: string; SK: string }>(
    FRAMES_TABLE,
    "PK = :pk",
    { ":pk": `FRAME#${frameId}` }
  );

  if (allItems.length > 0) {
    // Build delete requests for every item in the partition
    const deleteRequests = allItems.map((item) => ({
      PK: item.PK,
      SK: item.SK,
    }));
    await batchWrite(FRAMES_TABLE, [], deleteRequests);
  }

  // Note: we do not chase down CAMPAIGN#{campaignId}/FRAME#{frameId} attachment
  // records across all campaigns. When a campaign loads its frames, it will
  // gracefully handle a missing frame (filter out / return null).

  return createNoContentResponse();
}

// ─── Route Handlers: Content References ──────────────────────────────────────

// POST /frames/{frameId}/contents — add a homebrew content reference
async function addContent(
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> {
  const userId = extractUserId(event);
  const frameId = requirePathParam(event, "frameId");
  const body = parseBody(event, AddContentSchema);

  const frame = await getFrameOrThrow(frameId);
  assertFrameOwner(frame, userId);

  const now = new Date().toISOString();

  const contentRecord: FrameContentRecord = {
    PK: `FRAME#${frameId}`,
    SK: `CONTENT#${body.contentType}#${body.contentId}`,
    frameId,
    contentType: body.contentType as HomebrewContentType,
    contentId: body.contentId,
    name: body.name,
    addedAt: now,
  };

  await putItem(
    FRAMES_TABLE,
    contentRecord as unknown as Record<string, unknown>
  );

  // Update the frame's updatedAt timestamp
  await updateItem(
    FRAMES_TABLE,
    keys.frame(frameId),
    "SET updatedAt = :now",
    { ":now": now }
  );

  return createSuccessResponse(
    {
      contentType: contentRecord.contentType,
      contentId: contentRecord.contentId,
      name: contentRecord.name,
      addedAt: contentRecord.addedAt,
    },
    201
  );
}

// DELETE /frames/{frameId}/contents/{contentType}/{contentId} — remove content ref
async function removeContent(
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> {
  const userId = extractUserId(event);
  const frameId = requirePathParam(event, "frameId");
  const contentType = requirePathParam(event, "contentType");
  const contentId = requirePathParam(event, "contentId");

  const frame = await getFrameOrThrow(frameId);
  assertFrameOwner(frame, userId);

  await deleteItem(
    FRAMES_TABLE,
    keys.frameContent(frameId, contentType, contentId)
  );

  // Update the frame's updatedAt timestamp
  await updateItem(
    FRAMES_TABLE,
    keys.frame(frameId),
    "SET updatedAt = :now",
    { ":now": new Date().toISOString() }
  );

  return createNoContentResponse();
}

// ─── Route Handlers: Restrictions ────────────────────────────────────────────

// POST /frames/{frameId}/restrictions — add an SRD restriction/alteration
async function addRestriction(
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> {
  const userId = extractUserId(event);
  const frameId = requirePathParam(event, "frameId");
  const body = parseBody(event, AddRestrictionSchema);

  const frame = await getFrameOrThrow(frameId);
  assertFrameOwner(frame, userId);

  // If mode is "altered", require at least alterationNotes or alterationData
  if (
    body.mode === "altered" &&
    !body.alterationNotes &&
    !body.alterationData
  ) {
    throw AppError.badRequest(
      "Altered restrictions require at least alterationNotes or alterationData"
    );
  }

  const now = new Date().toISOString();

  const restrictionRecord: FrameRestrictionRecord = {
    PK: `FRAME#${frameId}`,
    SK: `RESTRICTION#${body.contentType}#${body.contentId}`,
    frameId,
    contentType: body.contentType as FrameRestrictableContentType,
    contentId: body.contentId,
    name: body.name,
    mode: body.mode,
    alterationNotes: body.alterationNotes ?? null,
    alterationData: body.alterationData ?? null,
  };

  await putItem(
    FRAMES_TABLE,
    restrictionRecord as unknown as Record<string, unknown>
  );

  // Update the frame's updatedAt timestamp
  await updateItem(
    FRAMES_TABLE,
    keys.frame(frameId),
    "SET updatedAt = :now",
    { ":now": now }
  );

  return createSuccessResponse(
    {
      contentType: restrictionRecord.contentType,
      contentId: restrictionRecord.contentId,
      name: restrictionRecord.name,
      mode: restrictionRecord.mode,
      alterationNotes: restrictionRecord.alterationNotes,
      alterationData: restrictionRecord.alterationData,
    },
    201
  );
}

// PUT /frames/{frameId}/restrictions/{contentType}/{contentId} — update restriction
async function updateRestriction(
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> {
  const userId = extractUserId(event);
  const frameId = requirePathParam(event, "frameId");
  const contentType = requirePathParam(event, "contentType");
  const contentId = requirePathParam(event, "contentId");
  const body = parseBody(event, UpdateRestrictionSchema);

  const frame = await getFrameOrThrow(frameId);
  assertFrameOwner(frame, userId);

  // Fetch existing restriction record
  const existing = await getItem<FrameRestrictionRecord>(
    FRAMES_TABLE,
    keys.frameRestriction(frameId, contentType, contentId)
  );
  if (!existing) {
    throw AppError.notFound(
      "Restriction",
      `${contentType}/${contentId}`
    );
  }

  // Merge changes onto the existing record
  const merged: FrameRestrictionRecord = {
    ...existing,
    ...(body.mode !== undefined ? { mode: body.mode } : {}),
    ...(body.alterationNotes !== undefined
      ? { alterationNotes: body.alterationNotes }
      : {}),
    ...(body.alterationData !== undefined
      ? { alterationData: body.alterationData }
      : {}),
  };

  // Validate: if the resulting mode is "altered", require notes or data
  if (
    merged.mode === "altered" &&
    !merged.alterationNotes &&
    !merged.alterationData
  ) {
    throw AppError.badRequest(
      "Altered restrictions require at least alterationNotes or alterationData"
    );
  }

  await putItem(
    FRAMES_TABLE,
    merged as unknown as Record<string, unknown>
  );

  // Update the frame's updatedAt timestamp
  await updateItem(
    FRAMES_TABLE,
    keys.frame(frameId),
    "SET updatedAt = :now",
    { ":now": new Date().toISOString() }
  );

  return createSuccessResponse({
    contentType: merged.contentType,
    contentId: merged.contentId,
    name: merged.name,
    mode: merged.mode,
    alterationNotes: merged.alterationNotes,
    alterationData: merged.alterationData,
  });
}

// DELETE /frames/{frameId}/restrictions/{contentType}/{contentId} — remove restriction
async function removeRestriction(
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> {
  const userId = extractUserId(event);
  const frameId = requirePathParam(event, "frameId");
  const contentType = requirePathParam(event, "contentType");
  const contentId = requirePathParam(event, "contentId");

  const frame = await getFrameOrThrow(frameId);
  assertFrameOwner(frame, userId);

  await deleteItem(
    FRAMES_TABLE,
    keys.frameRestriction(frameId, contentType, contentId)
  );

  // Update the frame's updatedAt timestamp
  await updateItem(
    FRAMES_TABLE,
    keys.frame(frameId),
    "SET updatedAt = :now",
    { ":now": new Date().toISOString() }
  );

  return createNoContentResponse();
}

// ─── Route Handlers: Extensions ──────────────────────────────────────────────

// POST /frames/{frameId}/extensions — add a custom type extension
async function addExtension(
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> {
  const userId = extractUserId(event);
  const frameId = requirePathParam(event, "frameId");
  const body = parseBody(event, AddExtensionSchema);

  const frame = await getFrameOrThrow(frameId);
  assertFrameOwner(frame, userId);

  const slug = slugify(body.name);
  if (!slug) {
    throw AppError.badRequest(
      "Name must contain at least one alphanumeric character"
    );
  }

  // Check for duplicate extension within this frame
  const existing = await getItem<FrameExtensionRecord>(
    FRAMES_TABLE,
    keys.frameExtension(frameId, body.extensionType, slug)
  );
  if (existing) {
    throw AppError.conflict(
      `An extension with slug '${slug}' already exists for type '${body.extensionType}'`
    );
  }

  const now = new Date().toISOString();

  const extensionRecord: FrameExtensionRecord = {
    PK: `FRAME#${frameId}`,
    SK: `EXTENSION#${body.extensionType}#${slug}`,
    frameId,
    extensionType: body.extensionType as FrameExtensionType,
    slug,
    name: body.name,
    description: body.description ?? null,
    data: body.data ?? null,
  };

  await putItem(
    FRAMES_TABLE,
    extensionRecord as unknown as Record<string, unknown>
  );

  // Update the frame's updatedAt timestamp
  await updateItem(
    FRAMES_TABLE,
    keys.frame(frameId),
    "SET updatedAt = :now",
    { ":now": now }
  );

  return createSuccessResponse(
    {
      extensionType: extensionRecord.extensionType,
      slug: extensionRecord.slug,
      name: extensionRecord.name,
      description: extensionRecord.description,
      data: extensionRecord.data,
    },
    201
  );
}

// PUT /frames/{frameId}/extensions/{extensionType}/{slug} — update extension
async function updateExtension(
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> {
  const userId = extractUserId(event);
  const frameId = requirePathParam(event, "frameId");
  const extensionType = requirePathParam(event, "extensionType");
  const slug = requirePathParam(event, "slug");
  const body = parseBody(event, UpdateExtensionSchema);

  const frame = await getFrameOrThrow(frameId);
  assertFrameOwner(frame, userId);

  // Fetch existing extension record
  const existing = await getItem<FrameExtensionRecord>(
    FRAMES_TABLE,
    keys.frameExtension(frameId, extensionType, slug)
  );
  if (!existing) {
    throw AppError.notFound("Extension", `${extensionType}/${slug}`);
  }

  // Merge changes onto the existing record
  const merged: FrameExtensionRecord = {
    ...existing,
    ...(body.name !== undefined ? { name: body.name } : {}),
    ...(body.description !== undefined
      ? { description: body.description }
      : {}),
    ...(body.data !== undefined ? { data: body.data } : {}),
  };

  await putItem(
    FRAMES_TABLE,
    merged as unknown as Record<string, unknown>
  );

  // Update the frame's updatedAt timestamp
  await updateItem(
    FRAMES_TABLE,
    keys.frame(frameId),
    "SET updatedAt = :now",
    { ":now": new Date().toISOString() }
  );

  return createSuccessResponse({
    extensionType: merged.extensionType,
    slug: merged.slug,
    name: merged.name,
    description: merged.description,
    data: merged.data,
  });
}

// DELETE /frames/{frameId}/extensions/{extensionType}/{slug} — remove extension
async function removeExtension(
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> {
  const userId = extractUserId(event);
  const frameId = requirePathParam(event, "frameId");
  const extensionType = requirePathParam(event, "extensionType");
  const slug = requirePathParam(event, "slug");

  const frame = await getFrameOrThrow(frameId);
  assertFrameOwner(frame, userId);

  await deleteItem(
    FRAMES_TABLE,
    keys.frameExtension(frameId, extensionType, slug)
  );

  // Update the frame's updatedAt timestamp
  await updateItem(
    FRAMES_TABLE,
    keys.frame(frameId),
    "SET updatedAt = :now",
    { ":now": new Date().toISOString() }
  );

  return createNoContentResponse();
}

// ─── Route Handlers: Campaign ↔ Frame Attachment ─────────────────────────────

// POST /campaigns/{campaignId}/frames — attach a frame to a campaign
async function attachFrame(
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> {
  const userId = extractUserId(event);
  const campaignId = requirePathParam(event, "campaignId");
  const body = parseBody(event, AttachFrameSchema);

  await assertCampaignGm(campaignId, userId);

  // Verify the frame exists
  const frame = await getFrameOrThrow(body.frameId);

  // Check if the frame is already attached
  const existingAttachment = await getItem<CampaignFrameAttachmentRecord>(
    CAMPAIGNS_TABLE,
    keys.campaignFrame(campaignId, body.frameId)
  );
  if (existingAttachment) {
    throw AppError.conflict(
      `Frame '${frame.name}' is already attached to this campaign`
    );
  }

  const now = new Date().toISOString();

  // Write the attachment record to the Campaigns table
  const attachmentRecord: CampaignFrameAttachmentRecord = {
    PK: `CAMPAIGN#${campaignId}`,
    SK: `FRAME#${body.frameId}`,
    campaignId,
    frameId: body.frameId,
    frameName: frame.name,
    attachedByUserId: userId,
    attachedAt: now,
  };

  await putItem(
    CAMPAIGNS_TABLE,
    attachmentRecord as unknown as Record<string, unknown>
  );

  // ── Conflict detection ─────────────────────────────────────────────────────
  // Query all FRAME# attachment records for this campaign to find other frames
  const allAttachments = await queryItems<CampaignFrameAttachmentRecord>(
    CAMPAIGNS_TABLE,
    "PK = :pk AND begins_with(SK, :prefix)",
    {
      ":pk": `CAMPAIGN#${campaignId}`,
      ":prefix": "FRAME#",
    }
  );

  // Gather CONTENT# records for every attached frame (including the new one)
  const frameContentMap = new Map<string, FrameContentRecord[]>();

  await Promise.all(
    allAttachments.map(async (att) => {
      const contentItems = await queryItems<FrameContentRecord>(
        FRAMES_TABLE,
        "PK = :pk AND begins_with(SK, :prefix)",
        {
          ":pk": `FRAME#${att.frameId}`,
          ":prefix": "CONTENT#",
        }
      );
      frameContentMap.set(att.frameId, contentItems);
    })
  );

  // Group content by normalized key: "contentType|name.toLowerCase()"
  const contentKeyToFrames = new Map<
    string,
    { contentType: string; contentName: string; frameIds: string[] }
  >();

  for (const [fId, contentItems] of frameContentMap) {
    for (const item of contentItems) {
      const normalizedKey = `${item.contentType}|${item.name.toLowerCase()}`;
      const entry = contentKeyToFrames.get(normalizedKey);
      if (entry) {
        entry.frameIds.push(fId);
      } else {
        contentKeyToFrames.set(normalizedKey, {
          contentType: item.contentType,
          contentName: item.name,
          frameIds: [fId],
        });
      }
    }
  }

  // Identify conflicts: items that appear in 2+ frames
  const detectedConflicts: Array<{
    contentType: string;
    contentName: string;
    frameIds: string[];
  }> = [];

  for (const entry of contentKeyToFrames.values()) {
    if (entry.frameIds.length >= 2) {
      // Check whether a conflict resolution already exists for this item
      const normalizedName = entry.contentName.toLowerCase();
      const existingResolution = await getItem<CampaignConflictRecord>(
        CAMPAIGNS_TABLE,
        keys.campaignConflict(campaignId, entry.contentType, normalizedName)
      );
      if (!existingResolution) {
        detectedConflicts.push({
          contentType: entry.contentType,
          contentName: entry.contentName,
          frameIds: entry.frameIds,
        });
      }
    }
  }

  const attachment: CampaignFrameAttachment = {
    campaignId: attachmentRecord.campaignId,
    frameId: attachmentRecord.frameId,
    frameName: attachmentRecord.frameName,
    attachedByUserId: attachmentRecord.attachedByUserId,
    attachedAt: attachmentRecord.attachedAt,
  };

  return createSuccessResponse(
    { attachment, conflicts: detectedConflicts },
    201
  );
}

// GET /campaigns/{campaignId}/frames — list attached frames
async function listCampaignFrames(
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> {
  const userId = extractUserId(event);
  const campaignId = requirePathParam(event, "campaignId");

  await assertCampaignMember(campaignId, userId);

  const attachmentRecords = await queryItems<CampaignFrameAttachmentRecord>(
    CAMPAIGNS_TABLE,
    "PK = :pk AND begins_with(SK, :prefix)",
    {
      ":pk": `CAMPAIGN#${campaignId}`,
      ":prefix": "FRAME#",
    }
  );

  // Strip PK/SK and return clean attachment objects
  const attachments: CampaignFrameAttachment[] = attachmentRecords.map(
    (rec) => ({
      campaignId: rec.campaignId,
      frameId: rec.frameId,
      frameName: rec.frameName,
      attachedByUserId: rec.attachedByUserId,
      attachedAt: rec.attachedAt,
    })
  );

  return createSuccessResponse(attachments);
}

// DELETE /campaigns/{campaignId}/frames/{frameId} — detach frame from campaign
async function detachFrame(
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> {
  const userId = extractUserId(event);
  const campaignId = requirePathParam(event, "campaignId");
  const frameId = requirePathParam(event, "frameId");

  await assertCampaignGm(campaignId, userId);

  // Delete the attachment record
  await deleteItem(
    CAMPAIGNS_TABLE,
    keys.campaignFrame(campaignId, frameId)
  );

  // Delete any conflict resolutions that reference this frame.
  // We query all CONFLICT# records and remove any where the detached frame
  // is listed in competingFrameIds.
  const conflictRecords = await queryItems<CampaignConflictRecord>(
    CAMPAIGNS_TABLE,
    "PK = :pk AND begins_with(SK, :prefix)",
    {
      ":pk": `CAMPAIGN#${campaignId}`,
      ":prefix": "CONFLICT#",
    }
  );

  const deletePromises: Promise<void>[] = [];
  for (const conflict of conflictRecords) {
    if (conflict.competingFrameIds.includes(frameId)) {
      // If the winning frame is the one being detached, or if only one
      // competitor remains, delete the resolution entirely
      const remaining = conflict.competingFrameIds.filter(
        (id) => id !== frameId
      );
      if (remaining.length < 2 || conflict.winningFrameId === frameId) {
        deletePromises.push(
          deleteItem(CAMPAIGNS_TABLE, {
            PK: conflict.PK,
            SK: conflict.SK,
          })
        );
      } else {
        // Update the competing frame list (remove the detached frame)
        deletePromises.push(
          updateItem(
            CAMPAIGNS_TABLE,
            { PK: conflict.PK, SK: conflict.SK },
            "SET competingFrameIds = :ids",
            { ":ids": remaining }
          ).then(() => undefined)
        );
      }
    }
  }

  if (deletePromises.length > 0) {
    await Promise.all(deletePromises);
  }

  return createNoContentResponse();
}

// ─── Route Handlers: Conflict Resolution ─────────────────────────────────────

// GET /campaigns/{campaignId}/conflicts — list all conflict resolutions
async function listConflicts(
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> {
  const userId = extractUserId(event);
  const campaignId = requirePathParam(event, "campaignId");

  await assertCampaignMember(campaignId, userId);

  const conflictRecords = await queryItems<CampaignConflictRecord>(
    CAMPAIGNS_TABLE,
    "PK = :pk AND begins_with(SK, :prefix)",
    {
      ":pk": `CAMPAIGN#${campaignId}`,
      ":prefix": "CONFLICT#",
    }
  );

  // Strip PK/SK and return clean resolution objects
  const conflicts: CampaignConflictResolution[] = conflictRecords.map(
    (rec) => ({
      campaignId: rec.campaignId,
      contentType: rec.contentType,
      contentName: rec.contentName,
      winningFrameId: rec.winningFrameId,
      competingFrameIds: rec.competingFrameIds,
      resolvedByUserId: rec.resolvedByUserId,
      resolvedAt: rec.resolvedAt,
    })
  );

  return createSuccessResponse(conflicts);
}

// POST /campaigns/{campaignId}/conflicts — resolve a conflict
async function resolveConflict(
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> {
  const userId = extractUserId(event);
  const campaignId = requirePathParam(event, "campaignId");
  const body = parseBody(event, ResolveConflictSchema);

  await assertCampaignGm(campaignId, userId);

  // Validate that winningFrameId is among competingFrameIds
  if (!body.competingFrameIds.includes(body.winningFrameId)) {
    throw AppError.badRequest(
      "winningFrameId must be one of the competingFrameIds"
    );
  }

  const now = new Date().toISOString();
  const normalizedName = body.contentName.toLowerCase();

  const conflictRecord: CampaignConflictRecord = {
    PK: `CAMPAIGN#${campaignId}`,
    SK: `CONFLICT#${body.contentType}#${normalizedName}`,
    campaignId,
    contentType: body.contentType as
      | HomebrewContentType
      | FrameRestrictableContentType,
    contentName: body.contentName,
    winningFrameId: body.winningFrameId,
    competingFrameIds: body.competingFrameIds,
    resolvedByUserId: userId,
    resolvedAt: now,
  };

  await putItem(
    CAMPAIGNS_TABLE,
    conflictRecord as unknown as Record<string, unknown>
  );

  return createSuccessResponse(
    {
      campaignId: conflictRecord.campaignId,
      contentType: conflictRecord.contentType,
      contentName: conflictRecord.contentName,
      winningFrameId: conflictRecord.winningFrameId,
      competingFrameIds: conflictRecord.competingFrameIds,
      resolvedByUserId: conflictRecord.resolvedByUserId,
      resolvedAt: conflictRecord.resolvedAt,
    },
    201
  );
}

// DELETE /campaigns/{campaignId}/conflicts/{contentType}/{contentName} — delete resolution
async function deleteConflictResolution(
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> {
  const userId = extractUserId(event);
  const campaignId = requirePathParam(event, "campaignId");
  const contentType = requirePathParam(event, "contentType");
  const contentName = requirePathParam(event, "contentName");

  await assertCampaignGm(campaignId, userId);

  const normalizedName = contentName.toLowerCase();

  await deleteItem(
    CAMPAIGNS_TABLE,
    keys.campaignConflict(campaignId, contentType, normalizedName)
  );

  return createNoContentResponse();
}

// ─── Main Handler ─────────────────────────────────────────────────────────────

async function framesHandler(
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> {
  const routeKey = event.routeKey;

  switch (routeKey) {
    // ── Frame CRUD ──────────────────────────────────────────────────────────
    case "GET /frames":
      return listFrames(event);

    case "POST /frames":
      return createFrame(event);

    case "GET /frames/{frameId}":
      return getFrame(event);

    case "PATCH /frames/{frameId}":
      return updateFrame(event);

    case "DELETE /frames/{frameId}":
      return deleteFrame(event);

    // ── Content references ──────────────────────────────────────────────────
    case "POST /frames/{frameId}/contents":
      return addContent(event);

    case "DELETE /frames/{frameId}/contents/{contentType}/{contentId}":
      return removeContent(event);

    // ── Restrictions ────────────────────────────────────────────────────────
    case "POST /frames/{frameId}/restrictions":
      return addRestriction(event);

    case "PUT /frames/{frameId}/restrictions/{contentType}/{contentId}":
      return updateRestriction(event);

    case "DELETE /frames/{frameId}/restrictions/{contentType}/{contentId}":
      return removeRestriction(event);

    // ── Extensions ──────────────────────────────────────────────────────────
    case "POST /frames/{frameId}/extensions":
      return addExtension(event);

    case "PUT /frames/{frameId}/extensions/{extensionType}/{slug}":
      return updateExtension(event);

    case "DELETE /frames/{frameId}/extensions/{extensionType}/{slug}":
      return removeExtension(event);

    // ── Campaign ↔ Frame attachment ─────────────────────────────────────────
    case "POST /campaigns/{campaignId}/frames":
      return attachFrame(event);

    case "GET /campaigns/{campaignId}/frames":
      return listCampaignFrames(event);

    case "DELETE /campaigns/{campaignId}/frames/{frameId}":
      return detachFrame(event);

    // ── Conflict resolution ─────────────────────────────────────────────────
    case "GET /campaigns/{campaignId}/conflicts":
      return listConflicts(event);

    case "POST /campaigns/{campaignId}/conflicts":
      return resolveConflict(event);

    case "DELETE /campaigns/{campaignId}/conflicts/{contentType}/{contentName}":
      return deleteConflictResolution(event);

    default:
      return {
        statusCode: 404,
        body: JSON.stringify({
          error: {
            code: "NOT_FOUND",
            message: `Route not found: ${routeKey}`,
          },
        }),
      };
  }
}

export const handler = withErrorHandling(framesHandler);
