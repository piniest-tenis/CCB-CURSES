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
// ─── LAMBDA COLD START: Load Campaign Frame Data ──────────────────────────
// ═══════════════════════════════════════════════════════════════════════════

let cachedContext: SrdValidationContext | null = null;

/**
 * Loads campaign frame data once and caches it.
 * Called on Lambda cold start, reused for all subsequent requests.
 */
async function getValidationContext(): Promise<SrdValidationContext> {
  if (cachedContext) {
    return cachedContext; // Reuse cached context
  }

  // Load all classes (used to build allowed classes map)
  const classesResult = await queryPage(CLASSES_TABLE, {
    PK: "campaign#default", // Adjust based on your partition key
  });

  const allowedClasses = new Map<string, ClassData>();
  const allowedDomainIds = new Set<string>();
  const allCards: DomainCard[] = [];

  for (const classItem of classesResult.items) {
    const classData = classItem as ClassData;
    allowedClasses.set(classData.classId, classData);

    // Collect domains from this class
    for (const domain of classData.domains) {
      allowedDomainIds.add(domain);
    }
  }

  // Load all domain cards
  const cardsResult = await queryPage(
    "DomainCards", // Table name (adjust as needed)
    { PK: "campaign#default" }
  );
  allCards.push(...(cardsResult.items as DomainCard[]));

  // Load allowed ancestries
  const ancestriesResult = await queryPage(
    "Ancestries", // Table name (adjust as needed)
    { PK: "campaign#default" }
  );
  const allowedAncestryIds = new Set<string>(
    (ancestriesResult.items as any[]).map((a) => a.ancestryId)
  );

  // Load allowed communities
  const communitiesResult = await queryPage(
    "Communities", // Table name (adjust as needed)
    { PK: "campaign#default" }
  );
  const allowedCommunityIds = new Set<string>(
    (communitiesResult.items as any[]).map((c) => c.communityId)
  );

  // Create and cache context
  cachedContext = buildValidationContext(
    {} as Character, // Placeholder
    {} as ClassData, // Placeholder
    {
      allowedClasses,
      allowedDomainIds,
      allowedAncestryIds,
      allowedCommunityIds,
      allDomainCards: allCards,
    }
  );

  return cachedContext;
}

// ═══════════════════════════════════════════════════════════════════════════
// ─── PATTERN 1: Character Creation (POST /characters) ───────────────────
// ═══════════════════════════════════════════════════════════════════════════

export async function handlePostCharacter(
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> {
  return withErrorHandling(async () => {
    // 1. Extract auth and parse input
    const userId = extractUserId(event);
    const body = parseBody(event);

    // 2. Schema validation (Zod) — move to middleware or separate function
    // const input = CreateCharacterSchema.parse(body);

    // 3. Load class data
    const classData = await getItem(CLASSES_TABLE, {
      PK: `class#${body.classId}`,
    });

    if (!classData) {
      return createErrorResponse(
        {
          code: "CLASS_NOT_FOUND",
          message: `Class "${body.classId}" not found`,
        },
        404
      );
    }

    // 4. Get validation context
    const context = await getValidationContext();

    // 5. ⭐ SRD VALIDATION
    const validationResult = validateCharacterCreation(
      body as Partial<Character>,
      classData as ClassData,
      context
    );

    if (!validationResult.valid) {
      // Return 400 with structured errors
      return formatValidationError(validationResult);
    }

    // 6. If validation passes, create character in DynamoDB
    const character: Character = {
      characterId: `char-${Date.now()}`,
      userId,
      name: body.name,
      classId: body.classId,
      className: classData.name,
      subclassId: body.subclassId || null,
      subclassName: null,
      ancestryId: body.ancestryId || null,
      ancestryName: null,
      communityId: body.communityId || null,
      communityName: null,
      level: 1,
      avatarUrl: null,
      avatarKey: null,
      portraitKey: null,
      portraitUrl: null,
      updatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      domains: classData.domains,
      stats: body.stats || {
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
      weapons: { primary: { name: null } as any, secondary: { name: null } as any },
      hope: 2,
      hopeMax: 6,
      proficiency: 1,
      experiences: body.experiences || [],
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
      customConditions: [],
    };

    // 7. Save to DynamoDB
    await putItem(CHARACTERS_TABLE, character);

    return createSuccessResponse(character, 201);
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// ─── PATTERN 2: Character Update (PUT /characters/{id}) ──────────────────
// ═══════════════════════════════════════════════════════════════════════════

export async function handlePutCharacter(
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> {
  return withErrorHandling(async () => {
    // 1. Extract auth and parse input
    const userId = extractUserId(event);
    const characterId = requirePathParam(event, "characterId");
    const body = parseBody(event);

    // 2. Load existing character
    const character = await getItem(CHARACTERS_TABLE, {
      PK: `user#${userId}`,
      SK: `character#${characterId}`,
    });

    if (!character) {
      return createErrorResponse(
        { code: "NOT_FOUND", message: "Character not found" },
        404
      );
    }

    // 3. Load class data
    const classData = await getItem(CLASSES_TABLE, {
      PK: `class#${character.classId}`,
    });

    // 4. Get validation context
    const context = await getValidationContext();

    // 5. ⭐ SRD VALIDATION (updates)
    const validationResult = validateCharacterUpdate(
      character as Character,
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
      ...body,
      updatedAt: new Date().toISOString(),
    };

    // 7. Save to DynamoDB
    await putItem(CHARACTERS_TABLE, updated);

    return createSuccessResponse(updated, 200);
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// ─── PATTERN 3: Level-Up (POST /characters/{id}/levelup) ───────────────
// ═══════════════════════════════════════════════════════════════════════════

export async function handlePostLevelUp(
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> {
  return withErrorHandling(async () => {
    // 1. Extract auth and parse input
    const userId = extractUserId(event);
    const characterId = requirePathParam(event, "characterId");
    const body = parseBody(event) as LevelUpChoices;

    // 2. Load character
    const character = await getItem(CHARACTERS_TABLE, {
      PK: `user#${userId}`,
      SK: `character#${characterId}`,
    });

    if (!character) {
      return createErrorResponse(
        { code: "NOT_FOUND", message: "Character not found" },
        404
      );
    }

    // 3. Load class data
    const classData = await getItem(CLASSES_TABLE, {
      PK: `class#${character.classId}`,
    });

    // 4. Get validation context
    const context = await getValidationContext();

    // 5. ⭐ SRD VALIDATION (level-up)
    const validationResult = validateLevelUpEndpoint(
      character as Character,
      body,
      classData as ClassData,
      context
    );

    if (!validationResult.valid) {
      return formatValidationError(validationResult);
    }

    // 6. Apply level-up (implement this function)
    const upgraded = await applyLevelUp(character as Character, body);

    // 7. Save to DynamoDB
    await putItem(CHARACTERS_TABLE, upgraded);

    return createSuccessResponse(upgraded, 200);
  });
}

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

export async function handlePatchResources(
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> {
  return withErrorHandling(async () => {
    // 1. Extract auth and parse input
    const userId = extractUserId(event);
    const characterId = requirePathParam(event, "characterId");
    const body = parseBody(event);

    // 2. Load character
    const character = await getItem(CHARACTERS_TABLE, {
      PK: `user#${userId}`,
      SK: `character#${characterId}`,
    });

    if (!character) {
      return createErrorResponse(
        { code: "NOT_FOUND", message: "Character not found" },
        404
      );
    }

    // 3. ⭐ RESOURCE VALIDATION
    // Import this from apiMiddleware
    const { validateResourceChange } = await import("./apiMiddleware");

    const validationResult = await validateResourceChange(
      character as Character,
      body.trackers,
      body.hope
    );

    if (validationResult !== true && "error" in validationResult) {
      return validationResult;
    }

    // 4. Apply changes
    const updated: Character = {
      ...character,
      trackers: { ...character.trackers, ...body.trackers },
      hope: body.hope ?? character.hope,
      updatedAt: new Date().toISOString(),
    };

    // 5. Save to DynamoDB
    await putItem(CHARACTERS_TABLE, updated);

    return createSuccessResponse(updated, 200);
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// ─── PATTERN 5: Domain Swap (PATCH /characters/{id}/domain-swap) ────────
// ═══════════════════════════════════════════════════════════════════════════

export async function handlePatchDomainSwap(
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> {
  return withErrorHandling(async () => {
    // 1. Extract auth and parse input
    const userId = extractUserId(event);
    const characterId = requirePathParam(event, "characterId");
    const body = parseBody(event) as {
      vaultCardId: string;
      loadoutCardIdToDisplace?: string | null;
      duringRest?: boolean;
      stressToDeduct?: number;
    };

    // 2. Load character
    const character = await getItem(CHARACTERS_TABLE, {
      PK: `user#${userId}`,
      SK: `character#${characterId}`,
    });

    if (!character) {
      return createErrorResponse(
        { code: "NOT_FOUND", message: "Character not found" },
        404
      );
    }

    // 3. ⭐ DOMAIN SWAP VALIDATION
    // Import this from apiMiddleware
    const { validateDomainSwapRequest } = await import("./apiMiddleware");

    const validationResult = await validateDomainSwapRequest(
      character as Character,
      body.vaultCardId,
      body.loadoutCardIdToDisplace || null,
      body.duringRest || false,
      body.stressToDeduct
    );

    if (validationResult !== true && "error" in validationResult) {
      return validationResult;
    }

    // 4. Apply swap
    const newLoadout = [...(character.domainLoadout || [])];
    const newVault = [...(character.domainVault || [])];

    // Remove from vault
    newVault.splice(newVault.indexOf(body.vaultCardId), 1);

    // Add to loadout
    newLoadout.push(body.vaultCardId);

    // Displace if needed
    if (body.loadoutCardIdToDisplace) {
      newLoadout.splice(newLoadout.indexOf(body.loadoutCardIdToDisplace), 1);
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
    await putItem(CHARACTERS_TABLE, updated);

    return createSuccessResponse(updated, 200);
  });
}

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
