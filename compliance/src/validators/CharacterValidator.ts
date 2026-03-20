// compliance/src/validators/CharacterValidator.ts
//
// The top-level compliance entry point.  Orchestrates all sub-validators and
// returns a single merged ValidationResult for a complete Character document.

import type {
  Character,
  ClassData,
  DomainCard,
  ValidationResult,
} from "@shared/types";

import {
  validateCoreStats,
  validateDamageThresholds,
  validateHP,
  validateHope,
  validateStress,
} from "./StatValidator";

import { validateLoadout } from "./DomainLoadoutValidator";

import {
  validateLevelUp,
  validateSubclassAccess,
} from "./AdvancementValidator";

import {
  calculateMaxHP,
  calculateMaxStress,
  calculateEvasion,
} from "../calculators/DerivedStatCalculator";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function ok(): ValidationResult {
  return { valid: true, errors: [], warnings: [] };
}

function merge(...results: ValidationResult[]): ValidationResult {
  const errors = results.flatMap((r) => r.errors);
  const warnings = results.flatMap((r) => r.warnings);
  return { valid: errors.length === 0, errors, warnings };
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

// ─── Full character validation ────────────────────────────────────────────────

/**
 * Runs every SRD compliance check against a fully-hydrated Character document.
 *
 * Checks performed (in order):
 *  1. Level bounds (1–10)
 *  2. Core stats
 *  3. Hope
 *  4. HP tracker (marks vs. calculated max)
 *  5. Stress tracker (marks vs. calculated max)
 *  6. Damage thresholds
 *  7. Domain loadout
 *  8. Domains match class domains
 *  9. Subclass feature access (if subclassId is set)
 * 10. Derived stat consistency (evasion floor)
 *
 * @param character  The full character document to validate.
 * @param classData  The class record for the character's classId.
 * @param domainCards All domain card records (used for loadout checks).
 */
export function validateCharacter(
  character: Character,
  classData: ClassData,
  domainCards: DomainCard[]
): ValidationResult {
  const results: ValidationResult[] = [];

  // ── 1. Level ──────────────────────────────────────────────────────────────
  if (
    !Number.isInteger(character.level) ||
    character.level < 1 ||
    character.level > 10
  ) {
    results.push(
      fail(
        "level",
        "LEVEL_OUT_OF_RANGE",
        `Character level must be an integer in [1, 10], received ${character.level}`
      )
    );
  }

  // ── 2. Core stats ─────────────────────────────────────────────────────────
  results.push(validateCoreStats(character.stats));

  // ── 3. Hope ───────────────────────────────────────────────────────────────
  results.push(validateHope(character.hope));

  // ── 4. HP tracker ─────────────────────────────────────────────────────────
  const expectedMaxHP = calculateMaxHP(
    classData.startingHitPoints,
    character.level,
    [] // modifiers tracked externally; we validate the stored max here
  );
  if (character.trackers.hp.max < expectedMaxHP) {
    results.push({
      valid: true,
      errors: [],
      warnings: [
        {
          field: "trackers.hp.max",
          message: `HP max (${character.trackers.hp.max}) is below the calculated base of ${expectedMaxHP} — modifiers may be missing`,
        },
      ],
    });
  }
  results.push(validateHP(character.trackers.hp));

  // ── 5. Stress tracker ─────────────────────────────────────────────────────
  const expectedMaxStress = calculateMaxStress(character.level, []);
  results.push(
    validateStress(character.trackers.stress.marked, character.trackers.stress.max)
  );
  if (character.trackers.stress.max > expectedMaxStress + 4) {
    // Allow generous headroom for feature bonuses; flag extreme values
    results.push({
      valid: true,
      errors: [],
      warnings: [
        {
          field: "trackers.stress.max",
          message: `Max stress (${character.trackers.stress.max}) is significantly above base (${expectedMaxStress}) — verify bonuses`,
        },
      ],
    });
  }

  // ── 6. Damage thresholds ──────────────────────────────────────────────────
  results.push(validateDamageThresholds(character.damageThresholds));

  // ── 7. Domain loadout ─────────────────────────────────────────────────────
  results.push(
    validateLoadout(
      character.domainLoadout,
      character.domainVault,
      character.level,
      character.domains,
      domainCards
    )
  );

  // ── 8. Domains match class ────────────────────────────────────────────────
  for (const domain of character.domains) {
    if (!classData.domains.includes(domain)) {
      results.push(
        fail(
          "domains",
          "DOMAIN_NOT_IN_CLASS",
          `Domain "${domain}" is not one of the class's domains (${classData.domains.join(", ")})`
        )
      );
    }
  }
  if (character.domains.length > 2) {
    results.push(
      fail(
        "domains",
        "TOO_MANY_DOMAINS",
        `Character has ${character.domains.length} domains; maximum is 2`
      )
    );
  }

  // ── 9. Subclass feature access ────────────────────────────────────────────
  if (character.subclassId) {
    const subclass = classData.subclasses.find(
      (s) => s.subclassId === character.subclassId
    );
    if (!subclass) {
      results.push(
        fail(
          "subclassId",
          "SUBCLASS_NOT_FOUND",
          `Subclass "${character.subclassId}" was not found in class "${character.classId}"`
        )
      );
    } else {
      // Foundation is always accessible at level 1+; only validate Spec/Mastery
      results.push(
        validateSubclassAccess("specialization", character.level)
        // Only report if the character actually has specialization unlocked
        // (this warns rather than hard-errors; merge handles that)
      );
    }
  }

  // ── 10. Evasion floor ─────────────────────────────────────────────────────
  const minEvasion = calculateEvasion(classData.startingEvasion, character.level, []);
  if (character.derivedStats.evasion < minEvasion) {
    results.push(
      fail(
        "derivedStats.evasion",
        "EVASION_BELOW_BASE",
        `Evasion (${character.derivedStats.evasion}) is below the class base of ${minEvasion}`
      )
    );
  }

  return results.length > 0 ? merge(...results) : ok();
}

// ─── Character creation validation ───────────────────────────────────────────

/**
 * Validates input for character creation (POST /characters).
 *
 * A subset of full character validation — only fields that are required and
 * settable at creation time are checked.  Derived fields (evasion, loadout,
 * etc.) are not expected in the creation payload.
 *
 * @param input     Partial character data from the creation request body.
 * @param classData The class record for the chosen classId.
 */
export function validateCharacterCreate(
  input: Partial<Character>,
  classData: ClassData
): ValidationResult {
  const results: ValidationResult[] = [];
  const errors: ValidationResult["errors"] = [];

  // ── Required fields ───────────────────────────────────────────────────────
  if (!input.name || input.name.trim().length === 0) {
    errors.push({
      field: "name",
      rule: "NAME_REQUIRED",
      message: "Character name is required",
    });
  } else if (input.name.trim().length > 100) {
    errors.push({
      field: "name",
      rule: "NAME_TOO_LONG",
      message: `Character name must be 100 characters or fewer (received ${input.name.trim().length})`,
    });
  }

  if (!input.classId) {
    errors.push({
      field: "classId",
      rule: "CLASS_REQUIRED",
      message: "A classId is required to create a character",
    });
  } else if (input.classId !== classData.classId) {
    errors.push({
      field: "classId",
      rule: "CLASS_MISMATCH",
      message: `classId "${input.classId}" does not match provided classData "${classData.classId}"`,
    });
  }

  if (errors.length > 0) {
    results.push({ valid: false, errors, warnings: [] });
  }

  // ── Level: creation always starts at 1 ───────────────────────────────────
  if (input.level !== undefined && input.level !== 1) {
    results.push(
      fail(
        "level",
        "CREATION_LEVEL_MUST_BE_ONE",
        `New characters must start at level 1, received ${input.level}`
      )
    );
  }

  // ── Stats ─────────────────────────────────────────────────────────────────
  if (input.stats) {
    const statsResult = validateCoreStats(input.stats);
    // At creation, stats above 5 are a hard error (not just a warning)
    const creationErrors = statsResult.errors;
    const creationWarnings = statsResult.warnings;
    const creationStatErrors: ValidationResult["errors"] = [
      ...creationErrors,
      // Promote "above 5" warnings to errors at creation time
      ...creationWarnings
        .filter((w) => w.field.startsWith("stats."))
        .map((w) => ({
          field: w.field,
          rule: "STAT_EXCEEDS_CREATION_MAX",
          message: w.message.replace(
            "ensure this reflects valid level-up bonuses",
            "stats cannot exceed 5 at character creation"
          ),
        })),
    ];
    const remainingWarnings = creationWarnings.filter(
      (w) => !w.field.startsWith("stats.")
    );
    results.push({
      valid: creationStatErrors.length === 0,
      errors: creationStatErrors,
      warnings: remainingWarnings,
    });
  }

  // ── Hope: creation starts at 2 ────────────────────────────────────────────
  if (input.hope !== undefined) {
    if (input.hope !== 2) {
      results.push({
        valid: true,
        errors: [],
        warnings: [
          {
            field: "hope",
            message: `Characters start with 2 Hope; received ${input.hope}`,
          },
        ],
      });
    }
    results.push(validateHope(input.hope));
  }

  // ── Domains must match class ───────────────────────────────────────────────
  if (input.domains) {
    for (const domain of input.domains) {
      if (!classData.domains.includes(domain)) {
        results.push(
          fail(
            "domains",
            "DOMAIN_NOT_IN_CLASS",
            `Domain "${domain}" is not one of ${classData.classId}'s domains (${classData.domains.join(", ")})`
          )
        );
      }
    }
  }

  return results.length > 0 ? merge(...results) : ok();
}
