// compliance/src/validators/AdvancementValidator.ts
//
// Validates level advancement and feature unlock rules per the Daggerheart SRD.

import type { ValidationResult } from "@shared/types";
import { isFeatureUnlocked } from "../calculators/DerivedStatCalculator";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function ok(): ValidationResult {
  return { valid: true, errors: [], warnings: [] };
}

function fail(
  field: string,
  rule: string,
  message: string
): ValidationResult {
  return {
    valid: false,
    errors: [{ field, rule, message }],
    warnings: [],
  };
}

function merge(...results: ValidationResult[]): ValidationResult {
  const errors = results.flatMap((r) => r.errors);
  const warnings = results.flatMap((r) => r.warnings);
  return { valid: errors.length === 0, errors, warnings };
}

// ─── Constants ────────────────────────────────────────────────────────────────

const MIN_LEVEL = 1;
const MAX_LEVEL = 10;

// ─── Subclass access ──────────────────────────────────────────────────────────

/**
 * Validates whether a subclass feature type is accessible at the given level.
 *
 * SRD rules:
 *   Foundation     → available from level 1 (Tier 1)
 *   Specialization → available at level 3+ (Tier 2)
 *   Mastery        → available at level 5+ (Tier 3)
 */
export function validateSubclassAccess(
  subclassFeatureType: "foundation" | "specialization" | "mastery",
  characterLevel: number
): ValidationResult {
  const levelResult = validateLevelBounds(characterLevel, "characterLevel");
  if (!levelResult.valid) return levelResult;

  if (!isFeatureUnlocked(subclassFeatureType, characterLevel)) {
    const requirements: Record<
      "foundation" | "specialization" | "mastery",
      string
    > = {
      foundation: "level 1 (Tier 1)",
      specialization: "level 3 (Tier 2)",
      mastery: "level 5 (Tier 3)",
    };

    return fail(
      "subclassFeatureType",
      "SUBCLASS_FEATURE_LOCKED",
      `"${subclassFeatureType}" requires ${requirements[subclassFeatureType]}; character is level ${characterLevel}`
    );
  }

  return ok();
}

// ─── Level up ─────────────────────────────────────────────────────────────────

/**
 * Validates a level-up transition.
 *
 * Rules:
 * - Both levels must be integers in [1, 10].
 * - toLevel must equal fromLevel + 1 (single-step advancement only).
 */
export function validateLevelUp(
  fromLevel: number,
  toLevel: number
): ValidationResult {
  const results: ValidationResult[] = [];

  const fromResult = validateLevelBounds(fromLevel, "fromLevel");
  if (!fromResult.valid) results.push(fromResult);

  const toResult = validateLevelBounds(toLevel, "toLevel");
  if (!toResult.valid) results.push(toResult);

  // Only check the step constraint when both levels are individually valid
  if (fromResult.valid && toResult.valid) {
    if (fromLevel === MAX_LEVEL) {
      results.push(
        fail(
          "fromLevel",
          "ALREADY_MAX_LEVEL",
          `Character is already at the maximum level (${MAX_LEVEL}); cannot level up further`
        )
      );
    } else if (toLevel !== fromLevel + 1) {
      results.push(
        fail(
          "toLevel",
          "LEVEL_SKIP_NOT_ALLOWED",
          `Level advancement must be a single step; expected ${fromLevel + 1}, received ${toLevel}`
        )
      );
    }
  }

  return results.length > 0 ? merge(...results) : ok();
}

// ─── Domain card unlock ───────────────────────────────────────────────────────

/**
 * Validates that a domain card's level does not exceed the character's level.
 *
 * SRD rule: a card can only be added to a character's vault when the character
 * has reached a level equal to or greater than the card's level.
 */
export function validateDomainCardUnlock(
  cardLevel: number,
  characterLevel: number
): ValidationResult {
  const charLevelResult = validateLevelBounds(characterLevel, "characterLevel");
  if (!charLevelResult.valid) return charLevelResult;

  if (!Number.isInteger(cardLevel) || cardLevel < 1 || cardLevel > MAX_LEVEL) {
    return fail(
      "cardLevel",
      "CARD_LEVEL_INVALID",
      `Card level must be an integer in [1, ${MAX_LEVEL}], received ${cardLevel}`
    );
  }

  if (cardLevel > characterLevel) {
    return fail(
      "cardLevel",
      "CARD_LEVEL_EXCEEDS_CHARACTER",
      `Card level (${cardLevel}) exceeds character level (${characterLevel}); this card is not yet unlocked`
    );
  }

  return ok();
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

function validateLevelBounds(
  level: number,
  fieldName: string
): ValidationResult {
  if (
    !Number.isInteger(level) ||
    level < MIN_LEVEL ||
    level > MAX_LEVEL
  ) {
    return fail(
      fieldName,
      "LEVEL_OUT_OF_RANGE",
      `${fieldName} must be an integer in [${MIN_LEVEL}, ${MAX_LEVEL}], received ${level}`
    );
  }
  return ok();
}
