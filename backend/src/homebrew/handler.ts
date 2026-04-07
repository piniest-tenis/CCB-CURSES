// backend/src/homebrew/handler.ts
// Lambda handler for all /homebrew/* routes (JWT-protected).
//
// Routes:
//   GET    /homebrew/mine                — list all homebrew by the current user
//   POST   /homebrew/parse               — preview: parse markdown without saving
//   POST   /homebrew                     — create homebrew content (markdown or form)
//   GET    /homebrew/{contentType}/{id}   — get a single homebrew item
//   PUT    /homebrew/{contentType}/{id}   — update a homebrew item
//   DELETE /homebrew/{contentType}/{id}   — delete a homebrew item

import type {
  APIGatewayProxyEventV2WithJWTAuthorizer,
  APIGatewayProxyResultV2,
} from "aws-lambda";
import { z } from "zod";
import {
  AppError,
  createSuccessResponse,
  createErrorResponse,
  extractUserId,
  parseBody,
  requirePathParam,
  getQueryParam,
  withErrorHandling,
} from "../common/middleware";
import {
  CLASSES_TABLE,
  GAME_DATA_TABLE,
  DOMAIN_CARDS_TABLE,
  getItem,
  deleteItem,
  queryItems,
  batchWrite,
  keys,
} from "../common/dynamodb";

import type {
  HomebrewContentType,
  HomebrewSummary,
  HomebrewMarkdownInput,
  ClassData,
  CommunityData,
  AncestryData,
  DomainCard,
  ValidationResult,
  CharacterSource,
} from "@shared/types";

// ── Ingestion parsers (pure functions — no filesystem deps) ─────────────────
import { parseClassString } from "../../../ingestion/src/parsers/ClassParser";
import { parseCommunityString } from "../../../ingestion/src/parsers/CommunityParser";
import { parseAncestryString } from "../../../ingestion/src/parsers/AncestryParser";
import { parseDomainCardString } from "../../../ingestion/src/parsers/DomainCardParser";

// ── Ingestion validators ────────────────────────────────────────────────────
import {
  validateClassWithSRD,
  validateCommunity,
  validateAncestry,
  validateDomainCardWithSRD,
} from "../../../ingestion/src/validators/IngestionValidator";

import { toSlug } from "../../../ingestion/src/transformers/SlugTransformer";

// ── Visibility resolution ───────────────────────────────────────────────────
import {
  queryHomebrewByCreator,
  queryVisibleHomebrew,
} from "./visibility";

// ─── Zod Schemas ──────────────────────────────────────────────────────────────

const VALID_CONTENT_TYPES: HomebrewContentType[] = [
  "class",
  "community",
  "ancestry",
  "domainCard",
];

const markdownInputSchema = z.object({
  contentType: z.enum(["class", "community", "ancestry", "domainCard"]),
  name: z.string().min(1, "name is required").max(100, "name must be ≤ 100 characters"),
  markdown: z.string().min(1, "markdown is required").max(50_000, "markdown must be ≤ 50KB"),
  domain: z.string().max(50).optional(),
  level: z.number().int().min(1).max(10).optional(),
  isCursed: z.boolean().optional(),
  isLinkedCurse: z.boolean().optional(),
  recallCost: z.number().int().min(0).max(10).optional(),
});

// ─── Helper: Resolve table name for a content type ────────────────────────────

function tableForContentType(contentType: HomebrewContentType): string {
  switch (contentType) {
    case "class":
      return CLASSES_TABLE;
    case "community":
    case "ancestry":
      return GAME_DATA_TABLE;
    case "domainCard":
      return DOMAIN_CARDS_TABLE;
  }
}

// ─── Helper: Determine if a domain is an existing SRD domain ──────────────────

const SRD_DOMAINS = new Set([
  "Blade",
  "Bone",
  "Codex",
  "Grace",
  "Midnight",
  "Sage",
  "Splendor",
  "Valor",
  "Arcana",
]);

function isSrdDomain(domain: string): boolean {
  // Case-insensitive match against known SRD domains
  for (const srd of SRD_DOMAINS) {
    if (srd.toLowerCase() === domain.toLowerCase()) return true;
  }
  return false;
}

// ─── Helper: Build DynamoDB keys for homebrew items ───────────────────────────

function buildHomebrewKey(
  contentType: HomebrewContentType,
  userId: string,
  slug: string,
  domain?: string
): { PK: string; SK: string } {
  switch (contentType) {
    case "class":
      return keys.homebrewClassMetadata(userId, slug);
    case "community":
      return keys.homebrewCommunity(userId, slug);
    case "ancestry":
      return keys.homebrewAncestry(userId, slug);
    case "domainCard": {
      if (!domain) throw AppError.badRequest("domain is required for domainCard");
      if (isSrdDomain(domain)) {
        return keys.homebrewDomainCard(userId, domain, slug);
      }
      return keys.homebrewCustomDomainCard(userId, domain, slug);
    }
  }
}

// ─── Helper: Parse markdown by content type ───────────────────────────────────

interface ParseResult {
  data: ClassData | CommunityData | AncestryData | DomainCard;
  validation: ValidationResult;
}

function parseAndValidate(input: HomebrewMarkdownInput): ParseResult {
  const source: CharacterSource = "homebrew";

  switch (input.contentType) {
    case "class": {
      const data = parseClassString(input.markdown, input.name, source);
      const validation = validateClassWithSRD(data);
      return { data, validation };
    }
    case "community": {
      const data = parseCommunityString(input.markdown, input.name, source);
      const validation = validateCommunity(data);
      return { data, validation };
    }
    case "ancestry": {
      const data = parseAncestryString(input.markdown, input.name, source);
      const validation = validateAncestry(data);
      return { data, validation };
    }
    case "domainCard": {
      if (!input.domain) throw AppError.badRequest("domain is required for domainCard");
      if (input.level === undefined) throw AppError.badRequest("level is required for domainCard");
      const data = parseDomainCardString(
        input.markdown,
        input.domain,
        input.name,
        input.level,
        {
          isCursed: input.isCursed,
          isLinkedCurse: input.isLinkedCurse,
          recallCost: input.recallCost,
        },
        source
      );
      const validation = validateDomainCardWithSRD(data);
      return { data, validation };
    }
  }
}

// ─── Helper: Build DynamoDB items from parsed data ────────────────────────────

function buildDynamoItems(
  contentType: HomebrewContentType,
  data: ClassData | CommunityData | AncestryData | DomainCard,
  userId: string,
  now: string,
  createdAt?: string,
  sourceMarkdown?: string
): { table: string; items: Record<string, unknown>[] } {
  const meta = {
    creatorUserId: userId,
    source: "homebrew" as const,
    updatedAt: now,
    createdAt: createdAt ?? now,
    ...(sourceMarkdown !== undefined ? { sourceMarkdown } : {}),
  };

  switch (contentType) {
    case "class": {
      const cls = data as ClassData;
      const slug = toSlug(cls.name);
      const pk = `CLASS#hb-${userId}-${slug}`;
      const items: Record<string, unknown>[] = [];

      // Metadata item
      items.push({
        PK: pk,
        SK: "METADATA",
        classId: `hb-${userId}-${slug}`,
        name: cls.name,
        domains: cls.domains,
        startingEvasion: cls.startingEvasion,
        startingHitPoints: cls.startingHitPoints,
        classItems: cls.classItems,
        hopeFeature: cls.hopeFeature,
        classFeatures: cls.classFeatures,
        backgroundQuestions: cls.backgroundQuestions,
        connectionQuestions: cls.connectionQuestions,
        mechanicalNotes: cls.mechanicalNotes,
        armorRec: cls.armorRec,
        ...meta,
      });

      // Subclass items
      for (const sc of cls.subclasses) {
        items.push({
          PK: pk,
          SK: `SUBCLASS#${sc.subclassId}`,
          subclassId: sc.subclassId,
          name: sc.name,
          description: sc.description,
          spellcastTrait: sc.spellcastTrait,
          foundationFeatures: sc.foundationFeatures,
          specializationFeature: sc.specializationFeature,
          masteryFeature: sc.masteryFeature,
          ...meta,
        });
      }

      return { table: CLASSES_TABLE, items };
    }

    case "community": {
      const comm = data as CommunityData;
      const slug = toSlug(comm.name);
      const pk = `COMMUNITY#hb-${userId}-${slug}`;

      return {
        table: GAME_DATA_TABLE,
        items: [
          {
            PK: pk,
            SK: "METADATA",
            id: `hb-${userId}-${slug}`,
            type: "community",
            name: comm.name,
            flavorText: comm.flavorText,
            traitName: comm.traitName,
            traitDescription: comm.traitDescription,
            ...(comm.mechanicalBonuses ? { mechanicalBonuses: comm.mechanicalBonuses } : {}),
            ...meta,
          },
        ],
      };
    }

    case "ancestry": {
      const anc = data as AncestryData;
      const slug = toSlug(anc.name);
      const pk = `ANCESTRY#hb-${userId}-${slug}`;

      return {
        table: GAME_DATA_TABLE,
        items: [
          {
            PK: pk,
            SK: "METADATA",
            id: `hb-${userId}-${slug}`,
            type: "ancestry",
            name: anc.name,
            flavorText: anc.flavorText,
            traitName: anc.traitName,
            traitDescription: anc.traitDescription,
            secondTraitName: anc.secondTraitName,
            secondTraitDescription: anc.secondTraitDescription,
            ...(anc.mechanicalBonuses ? { mechanicalBonuses: anc.mechanicalBonuses } : {}),
            ...meta,
          },
        ],
      };
    }

    case "domainCard": {
      const card = data as DomainCard;
      const slug = toSlug(card.name);
      const domain = card.domain;
      const useSrdDomain = isSrdDomain(domain);
      const pk = useSrdDomain
        ? `DOMAIN#${domain}`
        : `DOMAIN#hb-${userId}-${domain}`;
      const sk = `CARD#hb-${userId}-${slug}`;

      return {
        table: DOMAIN_CARDS_TABLE,
        items: [
          {
            PK: pk,
            SK: sk,
            cardId: `hb-${userId}-${slug}`,
            domain: card.domain,
            level: card.level,
            recallCost: card.recallCost,
            name: card.name,
            isCursed: card.isCursed,
            isLinkedCurse: card.isLinkedCurse,
            isGrimoire: card.isGrimoire,
            description: card.description,
            curseText: card.curseText,
            linkedCardIds: card.linkedCardIds,
            grimoire: card.grimoire,
            ...meta,
          },
        ],
      };
    }
  }
}

// ─── Route Handlers ───────────────────────────────────────────────────────────

/**
 * GET /homebrew/mine — list all homebrew content created by the authenticated user.
 * Returns a flat array of HomebrewSummary items across all 3 tables.
 */
async function listMyHomebrew(
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> {
  const userId = extractUserId(event);
  const contentTypeFilter = getQueryParam(event, "contentType") as HomebrewContentType | undefined;

  // Query all 3 tables in parallel — includes own content + campaign GM content
  const [classItems, gameDataItems, domainCardItems] = await Promise.all([
    (!contentTypeFilter || contentTypeFilter === "class")
      ? queryVisibleHomebrew<Record<string, unknown>>(CLASSES_TABLE, userId)
      : Promise.resolve([]),
    (!contentTypeFilter || contentTypeFilter === "community" || contentTypeFilter === "ancestry")
      ? queryVisibleHomebrew<Record<string, unknown>>(GAME_DATA_TABLE, userId)
      : Promise.resolve([]),
    (!contentTypeFilter || contentTypeFilter === "domainCard")
      ? queryVisibleHomebrew<Record<string, unknown>>(DOMAIN_CARDS_TABLE, userId)
      : Promise.resolve([]),
  ]);

  const summaries: HomebrewSummary[] = [];

  // Process class items (only METADATA, skip SUBCLASS# items)
  for (const item of classItems) {
    const sk = item["SK"] as string;
    if (sk !== "METADATA") continue;
    if (contentTypeFilter && contentTypeFilter !== "class") continue;

    summaries.push({
      contentType: "class",
      pk: item["PK"] as string,
      sk,
      slug: toSlug(item["name"] as string),
      name: item["name"] as string,
      source: "homebrew",
      creatorUserId: item["creatorUserId"] as string,
      updatedAt: item["updatedAt"] as string,
      createdAt: item["createdAt"] as string,
    });
  }

  // Process game-data items (communities + ancestries)
  for (const item of gameDataItems) {
    const sk = item["SK"] as string;
    if (sk !== "METADATA") continue;

    const type = item["type"] as string;
    let ct: HomebrewContentType;
    if (type === "community") ct = "community";
    else if (type === "ancestry") ct = "ancestry";
    else continue;

    if (contentTypeFilter && contentTypeFilter !== ct) continue;

    summaries.push({
      contentType: ct,
      pk: item["PK"] as string,
      sk,
      slug: toSlug(item["name"] as string),
      name: item["name"] as string,
      source: "homebrew",
      creatorUserId: item["creatorUserId"] as string,
      updatedAt: item["updatedAt"] as string,
      createdAt: item["createdAt"] as string,
    });
  }

  // Process domain card items
  for (const item of domainCardItems) {
    const sk = item["SK"] as string;
    if (!sk.startsWith("CARD#")) continue;
    if (contentTypeFilter && contentTypeFilter !== "domainCard") continue;

    summaries.push({
      contentType: "domainCard",
      pk: item["PK"] as string,
      sk,
      slug: toSlug(item["name"] as string),
      name: item["name"] as string,
      source: "homebrew",
      creatorUserId: item["creatorUserId"] as string,
      updatedAt: item["updatedAt"] as string,
      createdAt: item["createdAt"] as string,
      domain: item["domain"] as string,
    });
  }

  // Sort by updatedAt descending (most recent first)
  summaries.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  return createSuccessResponse({ items: summaries });
}

/**
 * POST /homebrew/parse — preview: parse markdown without saving.
 * Returns the parsed data and validation results.
 */
async function parsePreview(
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> {
  // Auth is required but we don't need the userId for preview
  extractUserId(event);

  const input = parseBody<HomebrewMarkdownInput>(event, markdownInputSchema);
  const { data, validation } = parseAndValidate(input);

  return createSuccessResponse({
    data,
    validation,
  });
}

/**
 * POST /homebrew — create new homebrew content.
 * Accepts HomebrewMarkdownInput in the request body.
 */
async function createHomebrew(
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> {
  const userId = extractUserId(event);

  const input = parseBody<HomebrewMarkdownInput>(event, markdownInputSchema);
  const { data, validation } = parseAndValidate(input);

  // Block on validation errors (warnings are allowed)
  if (!validation.valid) {
    throw AppError.validationError(
      `Homebrew content failed validation with ${validation.errors.length} error(s)`,
      validation.errors.map((e) => ({
        field: e.field,
        issue: `[${e.rule}] ${e.message}`,
      }))
    );
  }

  const now = new Date().toISOString();
  const { table, items } = buildDynamoItems(
    input.contentType, data, userId, now, undefined, input.markdown
  );

  // Check for existing item with the same key (conflict detection)
  const primaryItem = items[0];
  const existing = await getItem<Record<string, unknown>>(
    table,
    { PK: primaryItem["PK"], SK: primaryItem["SK"] }
  );
  if (existing) {
    throw AppError.conflict(
      `Homebrew ${input.contentType} named "${input.name}" already exists. Use PUT to update.`
    );
  }

  // Write all items (metadata + subclasses for classes)
  await batchWrite(table, items);

  return createSuccessResponse(
    {
      message: `Homebrew ${input.contentType} created successfully`,
      contentType: input.contentType,
      pk: primaryItem["PK"],
      sk: primaryItem["SK"],
      validation: {
        warnings: validation.warnings,
      },
    },
    201
  );
}

/**
 * GET /homebrew/{contentType}/{id} — get a single homebrew item.
 *
 * For classes, the `id` is the slug (e.g. "mystic").
 * The full classId is `hb-{userId}-{slug}`.
 * Returns the class metadata + all subclasses.
 */
async function getHomebrew(
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> {
  const userId = extractUserId(event);
  const contentType = requirePathParam(event, "contentType") as HomebrewContentType;
  const id = requirePathParam(event, "id");

  if (!VALID_CONTENT_TYPES.includes(contentType)) {
    throw AppError.badRequest(`Invalid contentType: ${contentType}`);
  }

  // For domain cards, id format is "domain/cardSlug" or we can use query params
  const domain = getQueryParam(event, "domain");

  const key = buildHomebrewKey(contentType, userId, id, domain);
  const table = tableForContentType(contentType);

  if (contentType === "class") {
    // Fetch all items for the class (METADATA + SUBCLASS#*)
    const classItems = await queryItems<Record<string, unknown>>(
      table,
      "PK = :pk",
      { ":pk": key.PK }
    );

    if (classItems.length === 0) {
      throw AppError.notFound("Homebrew class", id);
    }

    const metadata = classItems.find((i) => i["SK"] === "METADATA");
    const subclasses = classItems.filter((i) =>
      (i["SK"] as string).startsWith("SUBCLASS#")
    );

    // Verify ownership — only the creator can fetch by this route
    if (metadata && metadata["creatorUserId"] !== userId) {
      throw AppError.forbidden("You can only access your own homebrew content");
    }

    return createSuccessResponse({ metadata, subclasses });
  }

  // Single-item content types
  const item = await getItem<Record<string, unknown>>(table, key);
  if (!item) {
    throw AppError.notFound(`Homebrew ${contentType}`, id);
  }

  // Verify ownership
  if (item["creatorUserId"] !== userId) {
    throw AppError.forbidden("You can only access your own homebrew content");
  }

  return createSuccessResponse(item);
}

/**
 * PUT /homebrew/{contentType}/{id} — update an existing homebrew item.
 * Accepts HomebrewMarkdownInput (same as create).
 */
async function updateHomebrew(
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> {
  const userId = extractUserId(event);
  const contentType = requirePathParam(event, "contentType") as HomebrewContentType;
  const id = requirePathParam(event, "id");

  if (!VALID_CONTENT_TYPES.includes(contentType)) {
    throw AppError.badRequest(`Invalid contentType: ${contentType}`);
  }

  const input = parseBody<HomebrewMarkdownInput>(event, markdownInputSchema);

  // Ensure contentType in path matches body
  if (input.contentType !== contentType) {
    throw AppError.badRequest(
      `contentType in path (${contentType}) does not match body (${input.contentType})`
    );
  }

  const domain = getQueryParam(event, "domain") ?? input.domain;
  const key = buildHomebrewKey(contentType, userId, id, domain);
  const table = tableForContentType(contentType);

  // Verify existing item exists and is owned by this user
  const existing = await getItem<Record<string, unknown>>(table, key);
  if (!existing) {
    throw AppError.notFound(`Homebrew ${contentType}`, id);
  }
  if (existing["creatorUserId"] !== userId) {
    throw AppError.forbidden("You can only update your own homebrew content");
  }

  // Parse and validate the new content
  const { data, validation } = parseAndValidate(input);

  if (!validation.valid) {
    throw AppError.validationError(
      `Homebrew content failed validation with ${validation.errors.length} error(s)`,
      validation.errors.map((e) => ({
        field: e.field,
        issue: `[${e.rule}] ${e.message}`,
      }))
    );
  }

  const originalCreatedAt = existing["createdAt"] as string | undefined;
  const now = new Date().toISOString();
  const { table: newTable, items } = buildDynamoItems(
    contentType,
    data,
    userId,
    now,
    originalCreatedAt,
    input.markdown
  );

  // For classes: delete old subclass items before writing new ones
  // (subclass set may have changed)
  if (contentType === "class") {
    const oldItems = await queryItems<{ PK: string; SK: string }>(
      table,
      "PK = :pk",
      { ":pk": key.PK }
    );

    const oldSubclassKeys = oldItems
      .filter((i) => i.SK.startsWith("SUBCLASS#"))
      .map((i) => ({ PK: i.PK, SK: i.SK }));

    if (oldSubclassKeys.length > 0) {
      await batchWrite(table, [], oldSubclassKeys);
    }
  }

  // Write updated items
  await batchWrite(newTable, items);

  return createSuccessResponse({
    message: `Homebrew ${contentType} updated successfully`,
    contentType,
    pk: items[0]["PK"],
    sk: items[0]["SK"],
    validation: {
      warnings: validation.warnings,
    },
  });
}

/**
 * DELETE /homebrew/{contentType}/{id} — delete a homebrew item.
 * For classes, deletes the METADATA + all SUBCLASS# items.
 */
async function deleteHomebrew(
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> {
  const userId = extractUserId(event);
  const contentType = requirePathParam(event, "contentType") as HomebrewContentType;
  const id = requirePathParam(event, "id");

  if (!VALID_CONTENT_TYPES.includes(contentType)) {
    throw AppError.badRequest(`Invalid contentType: ${contentType}`);
  }

  const domain = getQueryParam(event, "domain");
  const key = buildHomebrewKey(contentType, userId, id, domain);
  const table = tableForContentType(contentType);

  // Verify existing item exists and is owned by this user
  const existing = await getItem<Record<string, unknown>>(table, key);
  if (!existing) {
    throw AppError.notFound(`Homebrew ${contentType}`, id);
  }
  if (existing["creatorUserId"] !== userId) {
    throw AppError.forbidden("You can only delete your own homebrew content");
  }

  if (contentType === "class") {
    // Delete METADATA + all SUBCLASS# items for this class
    const allItems = await queryItems<{ PK: string; SK: string }>(
      table,
      "PK = :pk",
      { ":pk": key.PK }
    );

    const keysToDelete = allItems.map((i) => ({ PK: i.PK, SK: i.SK }));
    if (keysToDelete.length > 0) {
      await batchWrite(table, [], keysToDelete);
    }
  } else {
    await deleteItem(table, key);
  }

  return createSuccessResponse({
    message: `Homebrew ${contentType} deleted successfully`,
  });
}

// ─── Route Dispatcher ─────────────────────────────────────────────────────────

export const handler = withErrorHandling(
  async (
    event: APIGatewayProxyEventV2WithJWTAuthorizer
  ): Promise<APIGatewayProxyResultV2> => {
    const routeKey = event.routeKey;

    switch (routeKey) {
      case "GET /homebrew/mine":
        return listMyHomebrew(event);
      case "POST /homebrew/parse":
        return parsePreview(event);
      case "POST /homebrew":
        return createHomebrew(event);
      case "GET /homebrew/{contentType}/{id}":
        return getHomebrew(event);
      case "PUT /homebrew/{contentType}/{id}":
        return updateHomebrew(event);
      case "DELETE /homebrew/{contentType}/{id}":
        return deleteHomebrew(event);
      default:
        return createErrorResponse("NOT_FOUND", "Route not found", 404);
    }
  }
);
