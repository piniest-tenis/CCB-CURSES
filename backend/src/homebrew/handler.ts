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
  HomebrewEquipmentInput,
  HomebrewWeaponData,
  HomebrewArmorData,
  HomebrewItemData,
  HomebrewConsumableData,
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
  "weapon",
  "armor",
  "item",
  "consumable",
];

/** Content types that use the markdown-based flow. */
const MARKDOWN_CONTENT_TYPES = new Set<HomebrewContentType>([
  "class", "community", "ancestry", "domainCard",
]);

/** Content types that use the structured equipment form flow. */
const EQUIPMENT_CONTENT_TYPES = new Set<HomebrewContentType>([
  "weapon", "armor", "item", "consumable",
]);

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

// ─── Equipment Zod Schemas ────────────────────────────────────────────────────

const featureSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().min(1).max(2000),
}).optional();

const weaponInputSchema = z.object({
  contentType: z.literal("weapon"),
  name: z.string().min(1, "name is required").max(100, "name must be ≤ 100 characters"),
  tier: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
  category: z.enum(["primary", "secondary"]),
  trait: z.string().min(1, "trait is required").max(50),
  range: z.enum(["melee", "ranged", "very close", "close", "far", "very far"]),
  damageDie: z.string().min(1).max(10).regex(/^\d*d\d+$/, "Invalid damage die format (e.g. d6, 2d8)"),
  damageType: z.enum(["physical", "magic"]),
  burden: z.number().int().min(0).max(3),
  featureName: z.string().max(100).optional(),
  featureDescription: z.string().max(2000).optional(),
});

const armorInputSchema = z.object({
  contentType: z.literal("armor"),
  name: z.string().min(1, "name is required").max(100, "name must be ≤ 100 characters"),
  tier: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
  baseThresholdMajor: z.number().int().min(1).max(30),
  baseThresholdSevere: z.number().int().min(1).max(50),
  baseArmorScore: z.number().int().min(0).max(10),
  featureName: z.string().max(100).optional(),
  featureDescription: z.string().max(2000).optional(),
});

const itemInputSchema = z.object({
  contentType: z.literal("item"),
  name: z.string().min(1, "name is required").max(100, "name must be ≤ 100 characters"),
  rarity: z.enum(["common", "uncommon", "rare", "very rare", "legendary"]),
  effect: z.string().min(1, "effect is required").max(5000, "effect must be ≤ 5000 characters"),
});

const consumableInputSchema = z.object({
  contentType: z.literal("consumable"),
  name: z.string().min(1, "name is required").max(100, "name must be ≤ 100 characters"),
  rarity: z.enum(["common", "uncommon", "rare", "very rare", "legendary"]),
  effect: z.string().min(1, "effect is required").max(5000, "effect must be ≤ 5000 characters"),
  uses: z.number().int().min(1).max(10),
});

// ─── Helper: Resolve table name for a content type ────────────────────────────

function tableForContentType(contentType: HomebrewContentType): string {
  switch (contentType) {
    case "class":
      return CLASSES_TABLE;
    case "community":
    case "ancestry":
    case "weapon":
    case "armor":
    case "item":
    case "consumable":
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
    case "weapon":
      return keys.homebrewWeapon(userId, slug);
    case "armor":
      return keys.homebrewArmor(userId, slug);
    case "item":
      return keys.homebrewItem(userId, slug);
    case "consumable":
      return keys.homebrewConsumable(userId, slug);
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

// ─── Equipment Validation ─────────────────────────────────────────────────────

/** Damage die scaling reference per tier (Homebrew Kit p.22). */
const WEAPON_DAMAGE_SCALING: Record<number, string[]> = {
  1: ["d6", "d8"],
  2: ["d8", "d10", "2d6"],
  3: ["d10", "d12", "2d8"],
  4: ["d12", "2d10", "2d12"],
};

/** Armor balance ranges per tier (Homebrew Kit p.23). */
const ARMOR_BALANCE: Record<number, { majorMin: number; majorMax: number; severeMin: number; severeMax: number; armorMin: number; armorMax: number }> = {
  1: { majorMin: 3, majorMax: 5, severeMin: 7, severeMax: 10, armorMin: 0, armorMax: 2 },
  2: { majorMin: 5, majorMax: 7, severeMin: 10, severeMax: 14, armorMin: 1, armorMax: 3 },
  3: { majorMin: 7, majorMax: 9, severeMin: 14, severeMax: 18, armorMin: 2, armorMax: 4 },
  4: { majorMin: 9, majorMax: 12, severeMin: 18, severeMax: 24, armorMin: 3, armorMax: 6 },
};

function validateEquipment(input: HomebrewEquipmentInput): ValidationResult {
  const errors: ValidationResult["errors"] = [];
  const warnings: ValidationResult["warnings"] = [];

  switch (input.contentType) {
    case "weapon": {
      // Hard validation
      if (input.category === "secondary" && (input.burden ?? 0) > 0) {
        errors.push({ field: "burden", rule: "secondary-burden", message: "Secondary weapons must have burden 0." });
      }
      if (input.category === "primary" && (input.burden ?? 1) < 1) {
        errors.push({ field: "burden", rule: "primary-burden", message: "Primary weapons must have burden ≥ 1." });
      }
      if (!input.tier || !input.damageDie) break;
      if (input.baseThresholdSevere !== undefined && input.baseThresholdMajor !== undefined) {
        if (input.baseThresholdSevere <= input.baseThresholdMajor) {
          errors.push({ field: "baseThresholdSevere", rule: "threshold-order", message: "Severe threshold must be greater than Major threshold." });
        }
      }

      // Soft warnings — damage die vs tier
      const expectedDice = WEAPON_DAMAGE_SCALING[input.tier];
      if (expectedDice && input.damageDie && !expectedDice.includes(input.damageDie)) {
        warnings.push({ field: "damageDie", message: `Tier ${input.tier} weapons typically use ${expectedDice.join(" or ")}. Your choice of ${input.damageDie} may be unbalanced.` });
      }
      break;
    }

    case "armor": {
      if (!input.tier) break;
      // Hard: severe must be > major
      if (input.baseThresholdMajor !== undefined && input.baseThresholdSevere !== undefined) {
        if (input.baseThresholdSevere <= input.baseThresholdMajor) {
          errors.push({ field: "baseThresholdSevere", rule: "threshold-order", message: "Severe threshold must be greater than Major threshold." });
        }
      }

      // Soft warnings — balance ranges
      const range = ARMOR_BALANCE[input.tier];
      if (range && input.baseThresholdMajor !== undefined) {
        if (input.baseThresholdMajor < range.majorMin || input.baseThresholdMajor > range.majorMax) {
          warnings.push({ field: "baseThresholdMajor", message: `Tier ${input.tier} armor typically has Major threshold ${range.majorMin}–${range.majorMax}. Your value of ${input.baseThresholdMajor} may be unbalanced.` });
        }
      }
      if (range && input.baseThresholdSevere !== undefined) {
        if (input.baseThresholdSevere < range.severeMin || input.baseThresholdSevere > range.severeMax) {
          warnings.push({ field: "baseThresholdSevere", message: `Tier ${input.tier} armor typically has Severe threshold ${range.severeMin}–${range.severeMax}. Your value of ${input.baseThresholdSevere} may be unbalanced.` });
        }
      }
      if (range && input.baseArmorScore !== undefined) {
        if (input.baseArmorScore < range.armorMin || input.baseArmorScore > range.armorMax) {
          warnings.push({ field: "baseArmorScore", message: `Tier ${input.tier} armor typically has Armor Score ${range.armorMin}–${range.armorMax}. Your value of ${input.baseArmorScore} may be unbalanced.` });
        }
      }
      break;
    }

    case "item": {
      // No hard errors beyond schema validation; soft warnings only
      if (input.effect && input.effect.length < 20) {
        warnings.push({ field: "effect", message: "Effect description is very short. Consider adding more detail." });
      }
      break;
    }

    case "consumable": {
      if (input.effect && input.effect.length < 20) {
        warnings.push({ field: "effect", message: "Effect description is very short. Consider adding more detail." });
      }
      if ((input.uses ?? 1) > 3) {
        warnings.push({ field: "uses", message: `${input.uses} uses is unusually high for a consumable. Most have 1–3 uses.` });
      }
      break;
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}

// ─── Helper: Build DynamoDB items from equipment input ────────────────────────

function buildEquipmentDynamoItem(
  input: HomebrewEquipmentInput,
  userId: string,
  now: string,
  createdAt?: string
): { table: string; item: Record<string, unknown> } {
  const slug = toSlug(input.name);
  const meta = {
    creatorUserId: userId,
    source: "homebrew" as const,
    updatedAt: now,
    createdAt: createdAt ?? now,
  };

  const feature =
    input.featureName && input.featureDescription
      ? { name: input.featureName, description: input.featureDescription }
      : undefined;

  switch (input.contentType) {
    case "weapon": {
      const key = keys.homebrewWeapon(userId, slug);
      return {
        table: GAME_DATA_TABLE,
        item: {
          ...key,
          id: `hb-${userId}-${slug}`,
          type: "weapon",
          name: input.name,
          tier: input.tier,
          category: input.category,
          trait: input.trait,
          range: input.range,
          damageDie: input.damageDie,
          damageType: input.damageType,
          burden: input.burden,
          ...(feature ? { feature } : {}),
          ...meta,
        },
      };
    }

    case "armor": {
      const key = keys.homebrewArmor(userId, slug);
      return {
        table: GAME_DATA_TABLE,
        item: {
          ...key,
          id: `hb-${userId}-${slug}`,
          type: "armor",
          name: input.name,
          tier: input.tier,
          baseThresholds: {
            major: input.baseThresholdMajor,
            severe: input.baseThresholdSevere,
          },
          baseArmorScore: input.baseArmorScore,
          ...(feature ? { feature } : {}),
          ...meta,
        },
      };
    }

    case "item": {
      const key = keys.homebrewItem(userId, slug);
      return {
        table: GAME_DATA_TABLE,
        item: {
          ...key,
          id: `hb-${userId}-${slug}`,
          type: "item",
          name: input.name,
          rarity: input.rarity,
          effect: input.effect,
          ...meta,
        },
      };
    }

    case "consumable": {
      const key = keys.homebrewConsumable(userId, slug);
      return {
        table: GAME_DATA_TABLE,
        item: {
          ...key,
          id: `hb-${userId}-${slug}`,
          type: "consumable",
          name: input.name,
          rarity: input.rarity,
          effect: input.effect,
          uses: input.uses,
          ...meta,
        },
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
    (!contentTypeFilter || contentTypeFilter === "community" || contentTypeFilter === "ancestry" ||
     contentTypeFilter === "weapon" || contentTypeFilter === "armor" ||
     contentTypeFilter === "item" || contentTypeFilter === "consumable")
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

  // Process game-data items (communities, ancestries, weapons, armor, items, consumables)
  for (const item of gameDataItems) {
    const sk = item["SK"] as string;
    if (sk !== "METADATA") continue;

    const type = item["type"] as string;
    let ct: HomebrewContentType;
    if (type === "community") ct = "community";
    else if (type === "ancestry") ct = "ancestry";
    else if (type === "weapon") ct = "weapon";
    else if (type === "armor") ct = "armor";
    else if (type === "item") ct = "item";
    else if (type === "consumable") ct = "consumable";
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
 * For equipment types, validates the structured input and returns it.
 */
async function parsePreview(
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> {
  // Auth is required but we don't need the userId for preview
  extractUserId(event);

  const rawBody = JSON.parse(event.body ?? "{}");
  const contentType = rawBody.contentType as string;

  if (EQUIPMENT_CONTENT_TYPES.has(contentType as HomebrewContentType)) {
    // Equipment preview — validate and return the input data directly
    let equipmentSchema: z.ZodType;
    switch (contentType) {
      case "weapon": equipmentSchema = weaponInputSchema; break;
      case "armor": equipmentSchema = armorInputSchema; break;
      case "item": equipmentSchema = itemInputSchema; break;
      case "consumable": equipmentSchema = consumableInputSchema; break;
      default: throw AppError.badRequest(`Invalid equipment type: ${contentType}`);
    }

    const input = parseBody<HomebrewEquipmentInput>(event, equipmentSchema);
    const validation = validateEquipment(input);

    return createSuccessResponse({ data: input, validation });
  }

  const input = parseBody<HomebrewMarkdownInput>(event, markdownInputSchema);
  const { data, validation } = parseAndValidate(input);

  return createSuccessResponse({
    data,
    validation,
  });
}

/**
 * POST /homebrew — create new homebrew content.
 * Accepts HomebrewMarkdownInput (for classes, communities, ancestries, domainCards)
 * or HomebrewEquipmentInput (for weapons, armor, items, consumables).
 */
async function createHomebrew(
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> {
  const userId = extractUserId(event);

  // Peek at contentType to determine which schema to use
  const rawBody = JSON.parse(event.body ?? "{}");
  const contentType = rawBody.contentType as string;

  if (EQUIPMENT_CONTENT_TYPES.has(contentType as HomebrewContentType)) {
    // ── Equipment flow (structured form input) ──────────────────────────
    let equipmentSchema: z.ZodType;
    switch (contentType) {
      case "weapon": equipmentSchema = weaponInputSchema; break;
      case "armor": equipmentSchema = armorInputSchema; break;
      case "item": equipmentSchema = itemInputSchema; break;
      case "consumable": equipmentSchema = consumableInputSchema; break;
      default: throw AppError.badRequest(`Invalid equipment type: ${contentType}`);
    }

    const input = parseBody<HomebrewEquipmentInput>(event, equipmentSchema);
    const validation = validateEquipment(input);

    if (!validation.valid) {
      throw AppError.validationError(
        `Homebrew ${contentType} failed validation with ${validation.errors.length} error(s)`,
        validation.errors.map((e) => ({
          field: e.field,
          issue: `[${e.rule}] ${e.message}`,
        }))
      );
    }

    const now = new Date().toISOString();
    const { table, item } = buildEquipmentDynamoItem(input, userId, now);

    // Check for existing item with the same key
    const existing = await getItem<Record<string, unknown>>(
      table,
      { PK: item["PK"], SK: item["SK"] }
    );
    if (existing) {
      throw AppError.conflict(
        `Homebrew ${contentType} named "${input.name}" already exists. Use PUT to update.`
      );
    }

    await batchWrite(table, [item]);

    return createSuccessResponse(
      {
        message: `Homebrew ${contentType} created successfully`,
        contentType,
        pk: item["PK"],
        sk: item["SK"],
        validation: { warnings: validation.warnings },
      },
      201
    );
  }

  // ── Markdown flow (existing content types) ────────────────────────────
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

  // Equipment types don't need domain
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
 * Accepts HomebrewMarkdownInput (markdown types) or HomebrewEquipmentInput (equipment types).
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

  const domain = getQueryParam(event, "domain");
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

  const originalCreatedAt = existing["createdAt"] as string | undefined;
  const now = new Date().toISOString();

  if (EQUIPMENT_CONTENT_TYPES.has(contentType)) {
    // ── Equipment update flow ───────────────────────────────────────────
    let equipmentSchema: z.ZodType;
    switch (contentType) {
      case "weapon": equipmentSchema = weaponInputSchema; break;
      case "armor": equipmentSchema = armorInputSchema; break;
      case "item": equipmentSchema = itemInputSchema; break;
      case "consumable": equipmentSchema = consumableInputSchema; break;
      default: throw AppError.badRequest(`Invalid equipment type: ${contentType}`);
    }

    const input = parseBody<HomebrewEquipmentInput>(event, equipmentSchema);

    if (input.contentType !== contentType) {
      throw AppError.badRequest(
        `contentType in path (${contentType}) does not match body (${input.contentType})`
      );
    }

    const validation = validateEquipment(input);

    if (!validation.valid) {
      throw AppError.validationError(
        `Homebrew ${contentType} failed validation with ${validation.errors.length} error(s)`,
        validation.errors.map((e) => ({
          field: e.field,
          issue: `[${e.rule}] ${e.message}`,
        }))
      );
    }

    const { table: newTable, item } = buildEquipmentDynamoItem(
      input, userId, now, originalCreatedAt
    );

    await batchWrite(newTable, [item]);

    return createSuccessResponse({
      message: `Homebrew ${contentType} updated successfully`,
      contentType,
      pk: item["PK"],
      sk: item["SK"],
      validation: { warnings: validation.warnings },
    });
  }

  // ── Markdown update flow ────────────────────────────────────────────────
  const input = parseBody<HomebrewMarkdownInput>(event, markdownInputSchema);

  // Ensure contentType in path matches body
  if (input.contentType !== contentType) {
    throw AppError.badRequest(
      `contentType in path (${contentType}) does not match body (${input.contentType})`
    );
  }

  const effectiveDomain = domain ?? input.domain;

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
