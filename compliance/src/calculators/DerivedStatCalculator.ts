// compliance/src/calculators/DerivedStatCalculator.ts
//
// All derived-stat formulas as defined by the Daggerheart SRD.
// Pure functions — no side effects, no I/O.

import type { DamageThresholds } from "@shared/types";

// ─── Tier helpers ─────────────────────────────────────────────────────────────

/**
 * Returns the character's tier based on their level.
 *
 * Tier 1 = levels 1–2
 * Tier 2 = levels 3–4
 * Tier 3 = levels 5–10
 */
export function getTier(level: number): 1 | 2 | 3 {
  if (level <= 2) return 1;
  if (level <= 4) return 2;
  return 3;
}

/**
 * Returns true when the given subclass feature type is accessible at the
 * supplied character level.
 *
 * Foundation    → always available (level 1+)
 * Specialization → Tier 2 (level 3+)
 * Mastery        → Tier 3 (level 5+)
 */
export function isFeatureUnlocked(
  featureType: "foundation" | "specialization" | "mastery",
  level: number
): boolean {
  switch (featureType) {
    case "foundation":
      return level >= 1;
    case "specialization":
      return level >= 3;
    case "mastery":
      return level >= 5;
  }
}

// ─── Proficiency ──────────────────────────────────────────────────────────────

/**
 * Returns the proficiency bonus for the character's current level.
 *
 * Tier 1 (levels 1–2): +1
 * Tier 2 (levels 3–4): +2
 * Tier 3 (levels 5–10): +3
 */
export function calculateProficiency(level: number): number {
  return getTier(level);
}

// ─── Evasion ──────────────────────────────────────────────────────────────────

/**
 * Evasion = startingEvasion + sum(modifiers).
 * Minimum value is 0 — evasion cannot go negative.
 *
 * @param startingEvasion  Class base evasion (e.g. Devout = 10, Knave = 9)
 * @param level            Current character level (unused in base formula but
 *                         passed for future level-scaling modifiers)
 * @param modifiers        Flat bonuses or penalties from features / conditions
 */
export function calculateEvasion(
  startingEvasion: number,
  level: number,
  modifiers: number[]
): number {
  void level; // reserved for future tier-scaling rules
  const total = modifiers.reduce((sum, m) => sum + m, startingEvasion);
  return Math.max(0, total);
}

// ─── Hit Points ───────────────────────────────────────────────────────────────

/**
 * Max HP = startingHP + sum(modifiers).
 * Minimum value is 1.
 *
 * The base formula does not include per-level scaling beyond what the class
 * provides via startingHP; modifiers capture any level-up HP bonuses.
 *
 * @param startingHP  Class base hit points (e.g. Devout = 6, Knave = 7)
 * @param level       Current character level (passed for modifier context)
 * @param modifiers   Flat HP bonuses from features, level-ups, ancestry, etc.
 */
export function calculateMaxHP(
  startingHP: number,
  level: number,
  modifiers: number[]
): number {
  void level;
  const total = modifiers.reduce((sum, m) => sum + m, startingHP);
  return Math.max(1, total);
}

// ─── Stress ───────────────────────────────────────────────────────────────────

/**
 * Max Stress = 6 (SRD base) + sum(modifiers).
 * Minimum value is 1.
 *
 * @param level     Current character level (passed for modifier context)
 * @param modifiers Flat stress capacity bonuses from features / conditions
 */
export function calculateMaxStress(
  level: number,
  modifiers: number[]
): number {
  void level;
  const BASE_STRESS = 6;
  const total = modifiers.reduce((sum, m) => sum + m, BASE_STRESS);
  return Math.max(1, total);
}

// ─── Armor ────────────────────────────────────────────────────────────────────

/**
 * Max Armor slots = class base armor + sum(modifiers).
 *
 * Most classes provide 3 armor slots by default; specific class rules or
 * features may override this. Minimum value is 0.
 *
 * @param level     Current character level (passed for modifier context)
 * @param classId   Class identifier (reserved for class-specific overrides)
 * @param modifiers Flat armor bonuses from features / equipment
 */
export function calculateMaxArmor(
  level: number,
  classId: string,
  modifiers: number[]
): number {
  void level;
  void classId; // reserved: some future classes may alter the base
  const BASE_ARMOR = 3;
  const total = modifiers.reduce((sum, m) => sum + m, BASE_ARMOR);
  return Math.max(0, total);
}

// ─── Damage Thresholds ────────────────────────────────────────────────────────

/**
 * Derives default damage thresholds for a character at the given level.
 *
 * These are the SRD reference values used when a class does not supply
 * its own custom threshold table. Individual class data or equipment may
 * override these.
 *
 * Tier 1 (levels 1–2):  minor 4 / major 8  / severe 13
 * Tier 2 (levels 3–4):  minor 5 / major 10 / severe 16
 * Tier 3 (levels 5–10): minor 7 / major 13 / severe 20
 *
 * @param level   Current character level
 * @param classId Class identifier (reserved for class-specific thresholds)
 */
export function calculateDamageThresholds(
  level: number,
  classId: string
): DamageThresholds {
  void classId; // reserved for per-class threshold tables
  const tier = getTier(level);

  switch (tier) {
    case 1:
      return { minor: 4, major: 8, severe: 13 };
    case 2:
      return { minor: 5, major: 10, severe: 16 };
    case 3:
      return { minor: 7, major: 13, severe: 20 };
  }
}
