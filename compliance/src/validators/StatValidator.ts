// compliance/src/validators/StatValidator.ts
//
// Validates all numeric stat fields against SRD bounds.
// Returns structured ValidationResult objects — never throws.

import type { CoreStats, DamageThresholds, SlotTracker, ValidationResult } from "@shared/types";

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

function isNonNegativeInteger(value: number): boolean {
  return Number.isInteger(value) && value >= 0;
}

// ─── Core Stats ───────────────────────────────────────────────────────────────

const CORE_STAT_NAMES: Array<keyof CoreStats> = [
  "agility",
  "strength",
  "finesse",
  "instinct",
  "presence",
  "knowledge",
];

/**
 * Validates all six core stats.
 *
 * Rules:
 * - At character creation, each stat must be in [0, 5].
 * - With level-up bonuses applied, each stat must be in [0, 8].
 * - This function validates the stored value; callers should pass the
 *   already-resolved total (base + bonuses).
 *
 * We treat values >5 and ≤8 as a warning (possible level-up bonuses applied)
 * and values >8 as a hard error.
 */
export function validateCoreStats(stats: CoreStats): ValidationResult {
  const results: ValidationResult[] = [];

  for (const name of CORE_STAT_NAMES) {
    const value = stats[name];

    if (!Number.isInteger(value) || value < 0) {
      results.push(
        fail(
          `stats.${name}`,
          "STAT_RANGE",
          `${name} must be a non-negative integer, received ${value}`
        )
      );
      continue;
    }

    if (value > 8) {
      results.push(
        fail(
          `stats.${name}`,
          "STAT_MAX_EXCEEDED",
          `${name} exceeds the maximum allowed value of 8 (received ${value})`
        )
      );
      continue;
    }

    // Warn when the stat is above the creation maximum (5) but still legal.
    // This signals level-up bonuses have been applied.
    if (value > 5) {
      results.push({
        valid: true,
        errors: [],
        warnings: [
          {
            field: `stats.${name}`,
            message: `${name} is ${value}, which exceeds the creation maximum of 5 — ensure this reflects valid level-up bonuses`,
          },
        ],
      });
    }
  }

  return results.length > 0 ? merge(...results) : ok();
}

// ─── Hope ─────────────────────────────────────────────────────────────────────

/**
 * Validates the current Hope value.
 *
 * SRD rule: 0 ≤ hope ≤ 6.
 */
export function validateHope(hope: number): ValidationResult {
  if (!Number.isInteger(hope) || hope < 0 || hope > 6) {
    return fail(
      "hope",
      "HOPE_RANGE",
      `Hope must be an integer in [0, 6], received ${hope}`
    );
  }
  return ok();
}

// ─── Stress ───────────────────────────────────────────────────────────────────

/**
 * Validates the current Stress value.
 *
 * SRD rule: 0 ≤ stress ≤ maxStress.
 */
export function validateStress(stress: number, max: number): ValidationResult {
  const results: ValidationResult[] = [];

  if (!Number.isInteger(max) || max < 1) {
    results.push(
      fail(
        "stress.max",
        "STRESS_MAX_INVALID",
        `Max stress must be a positive integer, received ${max}`
      )
    );
  }

  if (!Number.isInteger(stress) || stress < 0) {
    results.push(
      fail(
        "stress",
        "STRESS_NEGATIVE",
        `Stress must be a non-negative integer, received ${stress}`
      )
    );
  } else if (stress > max) {
    results.push(
      fail(
        "stress",
        "STRESS_EXCEEDS_MAX",
        `Stress (${stress}) exceeds maxStress (${max})`
      )
    );
  }

  return results.length > 0 ? merge(...results) : ok();
}

// ─── HP ───────────────────────────────────────────────────────────────────────

/**
 * Validates a Hit Point SlotTracker.
 *
 * Rules:
 * - max must be ≥ 1.
 * - marked must be ≥ 0 and ≤ max.
 */
export function validateHP(hp: SlotTracker): ValidationResult {
  const results: ValidationResult[] = [];

  if (!Number.isInteger(hp.max) || hp.max < 1) {
    results.push(
      fail(
        "trackers.hp.max",
        "HP_MAX_TOO_LOW",
        `HP max must be at least 1, received ${hp.max}`
      )
    );
  }

  if (!Number.isInteger(hp.marked) || hp.marked < 0) {
    results.push(
      fail(
        "trackers.hp.marked",
        "HP_MARKED_NEGATIVE",
        `HP marked must be a non-negative integer, received ${hp.marked}`
      )
    );
  } else if (hp.marked > hp.max) {
    results.push(
      fail(
        "trackers.hp.marked",
        "HP_MARKED_EXCEEDS_MAX",
        `HP marked (${hp.marked}) exceeds HP max (${hp.max})`
      )
    );
  }

  return results.length > 0 ? merge(...results) : ok();
}

// ─── Damage Thresholds ────────────────────────────────────────────────────────

/**
 * Validates damage thresholds.
 *
 * Rules:
 * - All values must be non-negative integers.
 * - minor < major < severe (strictly ascending).
 */
export function validateDamageThresholds(
  thresholds: DamageThresholds
): ValidationResult {
  const results: ValidationResult[] = [];

  const fields: Array<[keyof DamageThresholds, number]> = [
    ["minor", thresholds.minor],
    ["major", thresholds.major],
    ["severe", thresholds.severe],
  ];

  for (const [field, value] of fields) {
    if (!isNonNegativeInteger(value)) {
      results.push(
        fail(
          `damageThresholds.${field}`,
          "THRESHOLD_NOT_NON_NEGATIVE_INTEGER",
          `${field} threshold must be a non-negative integer, received ${value}`
        )
      );
    }
  }

  // Only check ordering when individual values are valid integers
  const allIntegers = fields.every(([, v]) => isNonNegativeInteger(v));
  if (allIntegers) {
    if (thresholds.minor >= thresholds.major) {
      results.push(
        fail(
          "damageThresholds.minor",
          "THRESHOLD_ORDER",
          `minor threshold (${thresholds.minor}) must be strictly less than major (${thresholds.major})`
        )
      );
    }
    if (thresholds.major >= thresholds.severe) {
      results.push(
        fail(
          "damageThresholds.major",
          "THRESHOLD_ORDER",
          `major threshold (${thresholds.major}) must be strictly less than severe (${thresholds.severe})`
        )
      );
    }
  }

  return results.length > 0 ? merge(...results) : ok();
}
