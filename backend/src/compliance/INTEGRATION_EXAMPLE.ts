// backend/src/compliance/INTEGRATION_EXAMPLE.ts
//
// Example: How to integrate SRD validators into existing Lambda handlers.
//
// This file shows the recommended patterns for each endpoint.
// Copy and adapt these patterns into your handler files.

import type {
  APIGatewayProxyEventV2WithJWTAuthorizer,
  APIGatewayProxyResultV2,
} from "aws-lambda";

import { z } from "zod";

import type {
  Character,
  ClassData,
  DomainCard,
  LevelUpChoices,
} from "@shared/types";

import {
  validateCharacterCreation,
  validateCharacterUpdate,
  validateLevelUpEndpoint,
  buildValidationContext,
  formatValidationError,
  type SrdValidationContext,
} from "./index";

import {
  extractUserId,
  parseBody,
  requirePathParam,
  createSuccessResponse,
  createErrorResponse,
  withErrorHandling,
} from "../common/middleware";

import {
  getItem,
  putItem,
  queryPage,
  CHARACTERS_TABLE,
  CLASSES_TABLE,
} from "../common/dynamodb";

// ═══════════════════════════════════════════════════════════════════════════
// ─── Zod schemas for example request bodies ───────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════

const CreateCharacterBodySchema = z.object({
  classId: z.string(),
  name: z.string(),
  subclassId: z.string().optional(),
  ancestryId: z.string().optional(),
  communityId: z.string().optional(),
  experiences: z.array(z.unknown()).optional(),
  stats: z
    .object({
      agility: z.number(),
      strength: z.number(),
      finesse: z.number(),
      instinct: z.number(),
      presence: z.number(),
      knowledge: z.number(),
    })
    .optional(),
});

const ResourcePatchBodySchema = z.object({
  trackers: z
    .object({
      hp: z.object({ max: z.number(), marked: z.number() }).optional(),
      stress: z.object({ max: z.number(), marked: z.number() }).optional(),
      armor: z.object({ max: z.number(), marked: z.number() }).optional(),
    })
    .optional(),
  hope: z.number().optional(),
});

const DomainSwapBodySchema = z.object({
  vaultCardId: z.string(),
  loadoutCardIdToDisplace: z.string().nullable().optional(),
  duringRest: z.boolean().optional(),
  stressToDeduct: z.number().optional(),
});

const UpdateCharacterBodySchema = z.record(z.unknown());

// ═══════════════════════════════════════════════════════════════════════════
// ─── LAMBDA COLD START: Load Campaign Frame Data ──────────────────────────
// ═══════════════════════════════════════════════════════════════════════════

let cachedContext: SrdValidationContext | null = null;

/**
 * Loads campaign frame data once and caches it.
 * Called on Lambda cold start, reused for all subsequent requests.
 */
async function getValidationContext(
  character: Character,
  classData: ClassData
): Promise<SrdValidationContext> {
  if (cachedContext) {
    return cachedContext; // Reuse cached context
  }

  // Load all classes (used to build allowed classes map)
  const classesResult = await queryPage<ClassData>(
    CLASSES_TABLE,
    "PK = :pk",
    { ":pk": "campaign#default" }
  );

  const allowedClasses = new Map<string, ClassData>();
  const allowedDomainIds = new Set<string>();
  const allCards: DomainCard[] = [];

  for (const classItem of classesResult.items) {
    allowedClasses.set(classItem.classId, classItem);
    for (const domain of classItem.domains) {
      allowedDomainIds.add(domain);
    }
  }

  // Load all domain cards
  const cardsResult = await queryPage<DomainCard>(
    "DomainCards", // Table name (adjust as needed)
    "PK = :pk",
    { ":pk": "campaign#default" }
  );
  allCards.push(...cardsResult.items);

  // Load allowed ancestries
  const ancestriesResult = await queryPage<{ ancestryId: string }>(
    "Ancestries", // Table name (adjust as needed)
    "PK = :pk",
    { ":pk": "campaign#default" }
  );
  const allowedAncestryIds = new Set<string>(
    ancestriesResult.items.map((a) => a.ancestryId)
  );

  // Load allowed communities
  const communitiesResult = await queryPage<{ communityId: string }>(
    "Communities", // Table name (adjust as needed)
    "PK = :pk",
    { ":pk": "campaign#default" }
  );
  const allowedCommunityIds = new Set<string>(
    communitiesResult.items.map((c) => c.communityId)
  );

  // Create and cache context
  cachedContext = buildValidationContext(character, classData, {
    allowedClasses,
    allowedDomainIds,
    allowedAncestryIds,
    allowedCommunityIds,
    allDomainCards: allCards,
  });

  return cachedContext;
}

// ═══════════════════════════════════════════════════════════════════════════
// ─── PATTERN 1: Character Creation (POST /characters) ───────────────────
// ═══════════════════════════════════════════════════════════════════════════

export const handlePostCharacter = withErrorHandling(
  async (event: APIGatewayProxyEventV2WithJWTAuthorizer): Promise<APIGatewayProxyResultV2> => {
    // 1. Extract auth and parse input
    const userId = extractUserId(event);
    const body = parseBody(event, CreateCharacterBodySchema);

    // 2. Load class data
    const classData = await getItem<ClassData>(CLASSES_TABLE, {
      PK: `CLASS#${body.classId}`,
      SK: "METADATA",
    });

    if (!classData) {
      return createErrorResponse("CLASS_NOT_FOUND", `Class "${body.classId}" not found`, 404);
    }

    // 3. Build a skeleton character for context construction
    const skeletonCharacter = { classId: body.classId, level: 1 } as unknown as Character;

    // 4. Get validation context
    const context = await getValidationContext(skeletonCharacter, classData);

    // 5. ⭐ SRD VALIDATION
    const validationResult = validateCharacterCreation(
      body as Partial<Character>,
      classData,
      context
    );

    if (!validationResult.valid) {
      return formatValidationError(validationResult);
    }

    // 6. If validation passes, create character in DynamoDB
    const now = new Date().toISOString();
    const character: Character = {
      characterId: `char-${Date.now()}`,
      userId,
      campaignId: null,
      name: body.name,
      classId: body.classId,
      className: classData.name,
      subclassId: body.subclassId ?? null,
      subclassName: null,
      multiclassClassId:           null,
      multiclassClassName:         null,
      multiclassSubclassId:        null,
      multiclassDomainId:          null,
      multiclassClassFeatureIndex: null,
      ancestryId: body.ancestryId ?? null,
      ancestryName: null,
      communityId: body.communityId ?? null,
      communityName: null,
      level: 1,
      avatarUrl: null,
      avatarKey: null,
      portraitKey: null,
      portraitUrl: null,
      updatedAt: now,
      createdAt: now,
      domains: classData.domains,
      stats: body.stats ?? {
        agility: 0,
        strength: 0,
        finesse: 0,
        instinct: 0,
        presence: 0,
        knowledge: 0,
      },
      derivedStats: {
        evasion: classData.startingEvasion,
        armor: 10,
      },
      trackers: {
        hp: { max: classData.startingHitPoints, marked: 0 },
        stress: { max: 5, marked: 0 },
        armor: { max: 10, marked: 0 },
      },
      damageThresholds: { major: 11, severe: 16 },
      weapons: {
        primary: { weaponId: null },
        secondary: { weaponId: null },
      },
      hope: 2,
      hopeMax: 6,
      proficiency: 1,
      experiences: (body.experiences ?? []) as Character["experiences"],
      conditions: [],
      domainLoadout: [],
      domainVault: [],
      classFeatureState: {},
      traitBonuses: {},
      notes: null,
      gold: { handfuls: 1, bags: 0, chests: 0 },
      inventory: [],
      cardTokens: {},
      downtimeProjects: [],
      activeAuras: [],
      companionState: null,
      reputationBonuses: {},
      favors: {},
      customConditions: [],
      activeArmorId: null,
      levelUpHistory: {},
      markedTraits: [],
    };

    // 7. Save to DynamoDB
    await putItem(CHARACTERS_TABLE, character as unknown as Record<string, unknown>);

    return createSuccessResponse(character, 201);
  }
);

// ═══════════════════════════════════════════════════════════════════════════
// ─── PATTERN 2: Character Update (PUT /characters/{id}) ──────────────────
// ═══════════════════════════════════════════════════════════════════════════

export const handlePutCharacter = withErrorHandling(
  async (event: APIGatewayProxyEventV2WithJWTAuthorizer): Promise<APIGatewayProxyResultV2> => {
    // 1. Extract auth and parse input
    const userId = extractUserId(event);
    const characterId = requirePathParam(event, "characterId");
    const body = parseBody(event, UpdateCharacterBodySchema);

    // 2. Load existing character
    const character = await getItem<Character>(CHARACTERS_TABLE, {
      PK: `USER#${userId}`,
      SK: `CHARACTER#${characterId}`,
    });

    if (!character) {
      return createErrorResponse("NOT_FOUND", "Character not found", 404);
    }

    // 3. Load class data
    const classData = await getItem<ClassData>(CLASSES_TABLE, {
      PK: `CLASS#${character.classId}`,
      SK: "METADATA",
    });

    // 4. Get validation context
    const context = await getValidationContext(character, classData ?? ({} as ClassData));

    // 5. ⭐ SRD VALIDATION (updates)
    const validationResult = validateCharacterUpdate(
      character,
      body as Partial<Character>,
      classData as ClassData,
      context
    );

    if (!validationResult.valid) {
      return formatValidationError(validationResult);
    }

    // 6. Merge updates
    const updated: Character = {
      ...character,
      ...(body as Partial<Character>),
      updatedAt: new Date().toISOString(),
    };

    // 7. Save to DynamoDB
    await putItem(CHARACTERS_TABLE, updated as unknown as Record<string, unknown>);

    return createSuccessResponse(updated, 200);
  }
);

// ═══════════════════════════════════════════════════════════════════════════
// ─── PATTERN 3: Level-Up (POST /characters/{id}/levelup) ───────────────
// ═══════════════════════════════════════════════════════════════════════════

export const handlePostLevelUp = withErrorHandling(
  async (event: APIGatewayProxyEventV2WithJWTAuthorizer): Promise<APIGatewayProxyResultV2> => {
    // 1. Extract auth and parse input
    const userId = extractUserId(event);
    const characterId = requirePathParam(event, "characterId");
    const body = parseBody(event) as LevelUpChoices;

    // 2. Load character
    const character = await getItem<Character>(CHARACTERS_TABLE, {
      PK: `USER#${userId}`,
      SK: `CHARACTER#${characterId}`,
    });

    if (!character) {
      return createErrorResponse("NOT_FOUND", "Character not found", 404);
    }

    // 3. Load class data
    const classData = await getItem<ClassData>(CLASSES_TABLE, {
      PK: `CLASS#${character.classId}`,
      SK: "METADATA",
    });

    // 4. Get validation context
    const context = await getValidationContext(character, classData ?? ({} as ClassData));

    // 5. ⭐ SRD VALIDATION (level-up)
    const validationResult = validateLevelUpEndpoint(
      character,
      body,
      classData as ClassData,
      context
    );

    if (!validationResult.valid) {
      return formatValidationError(validationResult);
    }

    // 6. Apply level-up (implement this function)
    const upgraded = await applyLevelUp(character, body);

    // 7. Save to DynamoDB
    await putItem(CHARACTERS_TABLE, upgraded as unknown as Record<string, unknown>);

    return createSuccessResponse(upgraded, 200);
  }
);

async function applyLevelUp(
  character: Character,
  choices: LevelUpChoices
): Promise<Character> {
  // Implementation of level-up mechanics (not shown here)
  // This is where you apply advancements, add domain cards, etc.
  return {
    ...character,
    level: choices.targetLevel,
    updatedAt: new Date().toISOString(),
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// ─── PATTERN 4: Resource Changes (PATCH /characters/{id}/resources) ─────
// ═══════════════════════════════════════════════════════════════════════════

export const handlePatchResources = withErrorHandling(
  async (event: APIGatewayProxyEventV2WithJWTAuthorizer): Promise<APIGatewayProxyResultV2> => {
    // 1. Extract auth and parse input
    const userId = extractUserId(event);
    const characterId = requirePathParam(event, "characterId");
    const body = parseBody(event, ResourcePatchBodySchema);

    // 2. Load character
    const character = await getItem<Character>(CHARACTERS_TABLE, {
      PK: `USER#${userId}`,
      SK: `CHARACTER#${characterId}`,
    });

    if (!character) {
      return createErrorResponse("NOT_FOUND", "Character not found", 404);
    }

    // 3. ⭐ RESOURCE VALIDATION
    const { validateResourceChange } = await import("./apiMiddleware");

    const validationResult = await validateResourceChange(
      character,
      body.trackers ?? {},
      body.hope
    );

    if (typeof validationResult !== "object" || !("valid" in validationResult)) {
      return validationResult as APIGatewayProxyResultV2;
    }

    // 4. Apply changes
    const updated: Character = {
      ...character,
      trackers: { ...character.trackers, ...(body.trackers ?? {}) },
      hope: body.hope ?? character.hope,
      updatedAt: new Date().toISOString(),
    };

    // 5. Save to DynamoDB
    await putItem(CHARACTERS_TABLE, updated as unknown as Record<string, unknown>);

    return createSuccessResponse(updated, 200);
  }
);

// ═══════════════════════════════════════════════════════════════════════════
// ─── PATTERN 5: Domain Swap (PATCH /characters/{id}/domain-swap) ────────
// ═══════════════════════════════════════════════════════════════════════════

export const handlePatchDomainSwap = withErrorHandling(
  async (event: APIGatewayProxyEventV2WithJWTAuthorizer): Promise<APIGatewayProxyResultV2> => {
    // 1. Extract auth and parse input
    const userId = extractUserId(event);
    const characterId = requirePathParam(event, "characterId");
    const body = parseBody(event, DomainSwapBodySchema);

    // 2. Load character
    const character = await getItem<Character>(CHARACTERS_TABLE, {
      PK: `USER#${userId}`,
      SK: `CHARACTER#${characterId}`,
    });

    if (!character) {
      return createErrorResponse("NOT_FOUND", "Character not found", 404);
    }

    // 3. ⭐ DOMAIN SWAP VALIDATION
    const { validateDomainSwapRequest } = await import("./apiMiddleware");

    const validationResult = await validateDomainSwapRequest(
      character,
      body.vaultCardId,
      body.loadoutCardIdToDisplace ?? null,
      body.duringRest ?? false,
      body.stressToDeduct
    );

    if (typeof validationResult !== "object" || !("valid" in validationResult)) {
      return validationResult as APIGatewayProxyResultV2;
    }

    // 4. Apply swap
    const newLoadout = [...(character.domainLoadout ?? [])];
    const newVault = [...(character.domainVault ?? [])];

    // Remove from vault
    const vaultIdx = newVault.indexOf(body.vaultCardId);
    if (vaultIdx !== -1) newVault.splice(vaultIdx, 1);

    // Add to loadout
    newLoadout.push(body.vaultCardId);

    // Displace if needed
    if (body.loadoutCardIdToDisplace) {
      const loadoutIdx = newLoadout.indexOf(body.loadoutCardIdToDisplace);
      if (loadoutIdx !== -1) newLoadout.splice(loadoutIdx, 1);
      newVault.push(body.loadoutCardIdToDisplace);
    }

    // Deduct stress if mid-play
    let updated: Character = { ...character, domainLoadout: newLoadout, domainVault: newVault };
    if (!body.duringRest && body.stressToDeduct) {
      updated = {
        ...updated,
        trackers: {
          ...updated.trackers,
          stress: {
            max: updated.trackers.stress.max,
            marked: updated.trackers.stress.marked + body.stressToDeduct,
          },
        },
      };
    }

    updated.updatedAt = new Date().toISOString();

    // 5. Save to DynamoDB
    await putItem(CHARACTERS_TABLE, updated as unknown as Record<string, unknown>);

    return createSuccessResponse(updated, 200);
  }
);

// ═══════════════════════════════════════════════════════════════════════════
// ─── Integration Checklist ──────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════

/*
 * ✅ Step 1: Copy these handlers into your handler files
 * ✅ Step 2: Update table names (CHARACTERS_TABLE, CLASSES_TABLE, etc.)
 * ✅ Step 3: Adapt campaigns context loading for your data structure
 * ✅ Step 4: Test with fixtures: npm test -- srdValidator.test.ts
 * ✅ Step 5: Run integration tests with actual Lambda
 * ✅ Step 6: Deploy to staging and verify
 * ✅ Step 7: Monitor validation errors in CloudWatch logs
 * ✅ Step 8: Deploy to production
 */
