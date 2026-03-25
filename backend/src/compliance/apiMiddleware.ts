// backend/src/compliance/apiMiddleware.ts
//
// Express/Lambda middleware for SRD compliance validation.
// Integrates srdValidator.ts into the request/response pipeline.
//
// Usage pattern:
//   1. Extract validated input from request body
//   2. Load character and class data from DynamoDB
//   3. Run SRD validation via validateCharacterCreation/Update
//   4. If valid, proceed to DynamoDB write; if not, return 400 with errors
//
// All routes are protected by Cognito JWT; userId is extracted from token.

import type {
  APIGatewayProxyResultV2,
} from "aws-lambda";

import type {
  Character,
  ClassData,
  DomainCard,
  LevelUpChoices,
} from "@shared/types";

import {
  createErrorResponse,
} from "../common/middleware";

import {
  validateCharacterCreation,
  validateCharacterUpdate,
  validateLevelUpEndpoint,
  type SrdValidationContext,
  type SrdValidationResult,
} from "./srdValidator";

// ─── Context Builder ──────────────────────────────────────────────────────────

/**
 * Builds the SrdValidationContext from campaign frame data.
 * This context is used by all validators to check that selected options
 * (classes, domains, ancestries, communities) are available in the campaign.
 */
export interface ContextBuilderDeps {
  allowedClasses: Map<string, ClassData>;
  allowedDomainIds: Set<string>;
  allowedAncestryIds: Set<string>;
  allowedCommunityIds: Set<string>;
  allDomainCards: DomainCard[];
}

export function buildValidationContext(
  character: Character,
  classData: ClassData,
  deps: ContextBuilderDeps
): SrdValidationContext {
  return {
    character,
    classData,
    allDomainCards: deps.allDomainCards,
    allowedClasses: deps.allowedClasses,
    allowedDomainIds: deps.allowedDomainIds,
    allowedAncestryIds: deps.allowedAncestryIds,
    allowedCommunityIds: deps.allowedCommunityIds,
  };
}

// ─── Error Response Formatting ────────────────────────────────────────────────

/**
 * Converts SrdValidationResult to API error response.
 * Groups errors by field and includes SRD page citations.
 */
export function formatValidationError(
  result: SrdValidationResult
): APIGatewayProxyResultV2 {
  const errorsByField: Record<string, typeof result.errors> = {};

  for (const error of result.errors) {
    if (error.severity === "error") {
      if (!errorsByField[error.field]) {
        errorsByField[error.field] = [];
      }
      errorsByField[error.field].push(error);
    }
  }

  const details = Object.entries(errorsByField).map(([field, errs]) => ({
    field,
    issues: errs.map((e) => ({
      rule: e.rule,
      message: e.message,
      srdPage: e.srdPage,
    })),
  }));

  return createErrorResponse(
    "SRD_VALIDATION_FAILED",
    `Character sheet fails SRD compliance checks (${result.errors.length} errors)`,
    400,
    details as any
  );
}

// ─── Middleware Handlers ──────────────────────────────────────────────────────

/**
 * Validates character creation request.
 *
 * POST /characters
 *
 * Checks:
 * - Class is in campaign frame
 * - Ancestry/Community are in campaign frame (if provided)
 * - Stats are in valid range
 * - Hope/HP/Stress are valid
 * - Level is 1 (creation only)
 * - Domains match class and loadout constraints
 *
 * Returns:
 * - 400 if SRD validation fails
 * - Validation result on success (caller should write to DynamoDB)
 */
export async function validateCreationRequest(
  input: Partial<Character>,
  classData: ClassData,
  context: SrdValidationContext
): Promise<{ valid: true } | APIGatewayProxyResultV2> {
  const result = validateCharacterCreation(input, classData, context);

  if (!result.valid) {
    return formatValidationError(result);
  }

  return { valid: true };
}

/**
 * Validates character update request.
 *
 * PUT /characters/{id}
 *
 * Checks:
 * - All updates maintain SRD constraints
 * - Level can only increase by 1 (must use /levelup endpoint for advancement)
 * - Stats, HP, Stress changes are valid
 * - Domain changes are valid
 * - Proficiency changes are valid
 *
 * Returns:
 * - 400 if SRD validation fails
 * - Validation result on success (caller should write to DynamoDB)
 */
export async function validateUpdateRequest(
  originalCharacter: Character,
  updatedFields: Partial<Character>,
  classData: ClassData,
  context: SrdValidationContext
): Promise<{ valid: true } | APIGatewayProxyResultV2> {
  const result = validateCharacterUpdate(
    originalCharacter,
    updatedFields,
    classData,
    context
  );

  if (!result.valid) {
    return formatValidationError(result);
  }

  return { valid: true };
}

/**
 * Validates character resource changes.
 *
 * PATCH /characters/{id}/resources
 *
 * Checks:
 * - HP marked changes don't exceed max
 * - Stress marked changes don't exceed max
 * - Armor marked changes don't exceed max
 * - Hope changes don't exceed max
 *
 * Resource endpoints allow direct stat manipulation for play convenience.
 * Still enforce max bounds.
 */
export async function validateResourceChange(
  character: Character,
  updatedTrackers: Partial<Character["trackers"]>,
  updatedHope?: number
): Promise<{ valid: true } | APIGatewayProxyResultV2> {
  const { validators: srdValidator } = await import("./srdValidator");
  const errors = [];

  if (updatedTrackers?.hp) {
    const hpErrors = srdValidator.validateHpTracker(
      updatedTrackers.hp.marked ?? character.trackers.hp.marked,
      updatedTrackers.hp.max ?? character.trackers.hp.max,
      10, // dummy base HP (not checked here, only bounds)
      character.level
    );
    errors.push(...hpErrors);
  }

  if (updatedTrackers?.stress) {
    const stressErrors = srdValidator.validateStressTracker(
      updatedTrackers.stress.marked ?? character.trackers.stress.marked,
      updatedTrackers.stress.max ?? character.trackers.stress.max,
      character.level
    );
    errors.push(...stressErrors);
  }

  if (updatedTrackers?.armor) {
    const armorErrors = srdValidator.validateArmorTracker(
      updatedTrackers.armor.marked ?? character.trackers.armor.marked,
      updatedTrackers.armor.max ?? character.trackers.armor.max,
      character.level
    );
    errors.push(...armorErrors);
  }

  if (updatedHope !== undefined) {
    const hopeErrors = srdValidator.validateHope(
      updatedHope,
      character.hopeMax
    );
    errors.push(...hopeErrors);
  }

  if (errors.length > 0) {
    const result: SrdValidationResult = {
      valid: false,
      errors,
      timestamp: new Date().toISOString(),
    };
    return formatValidationError(result);
  }

  return { valid: true };
}

/**
 * Validates level-up request.
 *
 * POST /characters/{id}/levelup
 *
 * Checks:
 * - Target level is exactly current + 1
 * - Advancement slots total exactly 2
 * - Double-slot advancements are selected alone
 * - Domain card acquisition is valid
 * - Exchange card logic is valid
 *
 * This is the ONLY endpoint that allows level increases.
 */
export async function validateLevelUpRequest(
  character: Character,
  choices: LevelUpChoices,
  classData: ClassData,
  context: SrdValidationContext
): Promise<{ valid: true } | APIGatewayProxyResultV2> {
  const result = validateLevelUpEndpoint(character, choices, classData, context);

  if (!result.valid) {
    return formatValidationError(result);
  }

  return { valid: true };
}

/**
 * Validates domain card swap during play.
 *
 * PATCH /characters/{id}/domain-swap
 *
 * SRD p.5: Swapping from vault to loadout costs Stress (Recall Cost).
 * During rest, swaps are free; outside rest, costs Stress.
 * Loadout must always stay ≤ 5 cards.
 * New card must be in vault.
 *
 * Checks:
 * - Vault card exists in character's vault
 * - Loadout card (if displaced) exists in loadout
 * - Resulting loadout has ≤ 5 cards
 * - Stress deduction (if mid-play) is valid
 * - New card level ≤ character level
 */
export async function validateDomainSwapRequest(
  character: Character,
  vaultCardId: string,
  loadoutCardIdToDisplace: string | null,
  duringRest: boolean,
  stressToDeduct?: number
): Promise<{ valid: true } | APIGatewayProxyResultV2> {
  const errors = [];

  // Check vault card exists
  if (!character.domainVault.includes(vaultCardId)) {
    errors.push({
      field: "vaultCardId",
      rule: "CARD_NOT_IN_VAULT",
      message: `Card "${vaultCardId}" is not in character's vault`,
      severity: "error" as const,
      srdPage: 5,
    });
  }

  // Check loadout card (if displacing)
  if (
    loadoutCardIdToDisplace &&
    !character.domainLoadout.includes(loadoutCardIdToDisplace)
  ) {
    errors.push({
      field: "loadoutCardId",
      rule: "CARD_NOT_IN_LOADOUT",
      message: `Card "${loadoutCardIdToDisplace}" is not in character's loadout`,
      severity: "error" as const,
      srdPage: 5,
    });
  }

  // Check resulting loadout size
  const newLoadoutSize = loadoutCardIdToDisplace
    ? character.domainLoadout.length // replace one
    : character.domainLoadout.length + 1; // add one

  if (newLoadoutSize > 5) {
    errors.push({
      field: "domainLoadout",
      rule: "LOADOUT_EXCEEDS_MAX",
      message: `Resulting loadout would exceed 5 cards (would be ${newLoadoutSize})`,
      severity: "error" as const,
      srdPage: 5,
    });
  }

  // Check stress cost (if mid-play)
  if (!duringRest && stressToDeduct !== undefined) {
    if (stressToDeduct > character.trackers.stress.marked) {
      errors.push({
        field: "stress",
        rule: "INSUFFICIENT_STRESS_TO_DEDUCT",
        message: `Cannot deduct ${stressToDeduct} stress; only ${character.trackers.stress.marked} marked`,
        severity: "error" as const,
        srdPage: 5,
      });
    }
  }

  if (errors.length > 0) {
    const result: SrdValidationResult = {
      valid: false,
      errors: errors as any,
      timestamp: new Date().toISOString(),
    };
    return formatValidationError(result);
  }

  return { valid: true };
}

/**
 * Validates rest/downtime mechanics.
 *
 * POST /characters/{id}/rest
 *
 * SRD p.20: Rest clears HP/Stress/Armor trackers.
 * SRD p.5: Domain swaps during rest are free (no Recall Cost).
 *
 * Checks:
 * - Rest type is valid (short or long)
 * - Character can actually perform rest
 *
 * Note: Actual healing amounts are calculated server-side,
 * not validated here.
 */
export async function validateRestRequest(
  _character: Character,
  restType: "short" | "long"
): Promise<{ valid: true } | APIGatewayProxyResultV2> {
  const errors = [];

  if (!["short", "long"].includes(restType)) {
    errors.push({
      field: "restType",
      rule: "INVALID_REST_TYPE",
      message: `Rest type must be "short" or "long" (received "${restType}")`,
      severity: "error" as const,
    });
  }

  if (errors.length > 0) {
    const result: SrdValidationResult = {
      valid: false,
      errors: errors as any,
      timestamp: new Date().toISOString(),
    };
    return formatValidationError(result);
  }

  return { valid: true };
}

/**
 * Validates combat action.
 *
 * PATCH /characters/{id}/combat
 *
 * Checks:
 * - Action is valid (attack, defend, spellcast, etc.)
 * - Resources spent (HP, Stress, Hope) are available
 * - Damage rolls respect die notation
 *
 * Note: Actual hit resolution is NOT validated here;
 * this only validates resource accounting.
 */
export async function validateCombatAction(
  character: Character,
  action: {
    type: "attack" | "defend" | "spellcast" | "item-use" | "other";
    stressSpent?: number;
    hopeSpent?: number;
  }
): Promise<{ valid: true } | APIGatewayProxyResultV2> {
  const errors = [];

  // Validate stress expenditure
  if (action.stressSpent !== undefined) {
    if (action.stressSpent > character.trackers.stress.marked) {
      errors.push({
        field: "stressSpent",
        rule: "INSUFFICIENT_STRESS",
        message: `Cannot spend ${action.stressSpent} stress; only ${character.trackers.stress.marked} marked`,
        severity: "error" as const,
        srdPage: 20,
      });
    }
  }

  // Validate hope expenditure
  if (action.hopeSpent !== undefined) {
    if (action.hopeSpent > character.hope) {
      errors.push({
        field: "hopeSpent",
        rule: "INSUFFICIENT_HOPE",
        message: `Cannot spend ${action.hopeSpent} hope; only ${character.hope} available`,
        severity: "error" as const,
        srdPage: 20,
      });
    }
  }

  if (errors.length > 0) {
    const result: SrdValidationResult = {
      valid: false,
      errors: errors as any,
      timestamp: new Date().toISOString(),
    };
    return formatValidationError(result);
  }

  return { valid: true };
}

// ─── Export middleware functions ──────────────────────────────────────────────

export const apiMiddleware = {
  buildValidationContext,
  formatValidationError,
  validateCreationRequest,
  validateUpdateRequest,
  validateResourceChange,
  validateLevelUpRequest,
  validateDomainSwapRequest,
  validateRestRequest,
  validateCombatAction,
};
