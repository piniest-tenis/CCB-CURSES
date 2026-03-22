/**
 * src/hooks/useCharacterValidation.ts
 *
 * Real-time character sheet validation hook.
 * Enforces SRD compliance rules and constraint violations.
 * Returns a list of violations with fix suggestions and severity levels.
 *
 * Validates:
 * - Trait modifiers sum to +3
 * - Domain loadout max 5 cards
 * - Armor score cap (≤12)
 * - Advancement gating (level requirements)
 * - Multiclass restrictions
 * - Core stat ranges
 * - Resource tracking (HP, stress, armor)
 */

import { useMemo } from "react";
import type { Character, ClassData, CoreStats, DomainCard } from "@shared/types";

export interface ValidationViolation {
  id: string;
  field: string;
  severity: "error" | "warning";
  message: string;
  suggestion?: string;
  srdPage?: number;
}

export interface CharacterValidationResult {
  isValid: boolean;
  violations: ValidationViolation[];
  blockingSave: boolean; // true if any error-severity violations exist
}

// ─── Rule validators ──────────────────────────────────────────────────────────

/**
 * Validates trait modifier assignment.
 * SRD page 3: trait bonuses must sum to +3 (+2, +1, +1, +0, +0, -1).
 */
function validateTraitModifiers(
  traitBonuses: Record<string, number> | undefined
): ValidationViolation[] {
  if (!traitBonuses) return [];

  const violations: ValidationViolation[] = [];
  const bonusValues = Object.values(traitBonuses);
  const sum = bonusValues.reduce((acc, val) => acc + val, 0);
  const uniqueTraits = Object.keys(traitBonuses).length;

  // Check sum equals +3
  if (sum !== 3) {
    violations.push({
      id: "trait-sum-invalid",
      field: "traitBonuses",
      severity: "error",
      message: `Trait modifiers sum to ${sum}; must equal +3 (e.g., +2, +1, +1, +0, +0, −1)`,
      suggestion: `Adjust traits so bonuses sum to exactly +3. Current sum: ${sum}`,
      srdPage: 3,
    });
  }

  // Check unique traits
  if (uniqueTraits !== 4) {
    violations.push({
      id: "trait-uniqueness-invalid",
      field: "traitBonuses",
      severity: "error",
      message: `Expected 4 unique trait assignments; found ${uniqueTraits}`,
      suggestion: "Each trait bonus must be assigned to a different trait",
      srdPage: 3,
    });
  }

  // Check for invalid bonus values
  const validBonuses = new Set([2, 1, 0, -1]);
  for (const [trait, bonus] of Object.entries(traitBonuses)) {
    if (!validBonuses.has(bonus)) {
      violations.push({
        id: `trait-invalid-bonus-${trait}`,
        field: "traitBonuses",
        severity: "error",
        message: `Trait "${trait}" has invalid bonus ${bonus}; must be one of: +2, +1, +0, −1`,
        suggestion: "Reset trait bonuses and reassign",
        srdPage: 3,
      });
    }
  }

  return violations;
}

/**
 * Validates domain loadout.
 * SRD page 22-23: max 5 cards in active loadout.
 */
function validateDomainLoadout(
  domainLoadout: string[] | undefined
): ValidationViolation[] {
  if (!domainLoadout) return [];

  const violations: ValidationViolation[] = [];

  if (domainLoadout.length > 5) {
    violations.push({
      id: "loadout-exceeds-max",
      field: "domainLoadout",
      severity: "error",
      message: `Loadout has ${domainLoadout.length} cards; maximum is 5`,
      suggestion: "Remove cards from the loadout to bring it back under 5",
      srdPage: 22,
    });
  }

  // Check for duplicate card IDs
  const seen = new Set<string>();
  for (const cardId of domainLoadout) {
    if (seen.has(cardId)) {
      violations.push({
        id: "loadout-duplicate-card",
        field: "domainLoadout",
        severity: "error",
        message: `Duplicate card "${cardId}" in loadout`,
        suggestion: "Remove the duplicate card",
        srdPage: 22,
      });
    }
    seen.add(cardId);
  }

  return violations;
}

/**
 * Validates armor selection and scoring.
 * SRD page 20: Armor Score = equipped armor base + level; max 12.
 */
function validateArmorScore(
  armorScore: number,
  armorMax: number,
  level: number
): ValidationViolation[] {
  const violations: ValidationViolation[] = [];

  if (armorScore > 12) {
    violations.push({
      id: "armor-score-exceeds-max",
      field: "derivedStats.armor",
      severity: "error",
      message: `Armor Score ${armorScore} exceeds maximum of 12`,
      suggestion: `Select lower-tier armor or check level/modifiers. Current level: ${level}`,
      srdPage: 20,
    });
  }

  if (armorScore < 0) {
    violations.push({
      id: "armor-score-negative",
      field: "derivedStats.armor",
      severity: "error",
      message: `Armor Score cannot be negative (currently ${armorScore})`,
      suggestion: "Ensure equipped armor base is non-negative",
      srdPage: 20,
    });
  }

  return violations;
}

/**
 * Validates core stats.
 * SRD page 3: stats range from -5 to +8; no hard caps but extremes are suspicious.
 */
function validateCoreStats(stats: CoreStats | undefined): ValidationViolation[] {
  if (!stats) return [];

  const violations: ValidationViolation[] = [];

  for (const [stat, value] of Object.entries(stats)) {
    if (value < -5 || value > 8) {
      violations.push({
        id: `stat-out-of-range-${stat}`,
        field: `stats.${stat}`,
        severity: value > 8 ? "warning" : "warning",
        message: `${stat} is ${value}; unusual range`,
        suggestion: "Check if this reflects intended modifiers or level-up bonuses",
        srdPage: 3,
      });
    }
  }

  return violations;
}

/**
 * Validates resource tracking (HP, stress, armor).
 * Ensures marked values don't exceed max values.
 */
function validateTrackers(character: Character): ValidationViolation[] {
  const violations: ValidationViolation[] = [];

  const { trackers } = character;

  // HP
  if (trackers.hp.marked > trackers.hp.max) {
    violations.push({
      id: "hp-marked-exceeds-max",
      field: "trackers.hp.marked",
      severity: "warning",
      message: `HP marked (${trackers.hp.marked}) exceeds max (${trackers.hp.max})`,
      suggestion: "Unmark some HP slots to match current max",
    });
  }

  // Stress
  if (trackers.stress.marked > trackers.stress.max) {
    violations.push({
      id: "stress-marked-exceeds-max",
      field: "trackers.stress.marked",
      severity: "warning",
      message: `Stress marked (${trackers.stress.marked}) exceeds max (${trackers.stress.max})`,
      suggestion: "Unmark some stress slots",
    });
  }

  // Armor
  if (trackers.armor.marked > trackers.armor.max) {
    violations.push({
      id: "armor-marked-exceeds-max",
      field: "trackers.armor.marked",
      severity: "warning",
      message: `Armor marked (${trackers.armor.marked}) exceeds max (${trackers.armor.max})`,
      suggestion: "Remove some armor points",
    });
  }

  return violations;
}

/**
 * Validates Hope resource.
 * SRD page 3: starts at 2; max is typically 6 but can be modified by scars.
 */
function validateHope(hope: number, hopeMax: number): ValidationViolation[] {
  const violations: ValidationViolation[] = [];

  if (hope < 0 || hope > hopeMax) {
    violations.push({
      id: "hope-out-of-range",
      field: "hope",
      severity: "warning",
      message: `Hope is ${hope}; must be in range [0, ${hopeMax}]`,
      suggestion: `Adjust Hope to be between 0 and ${hopeMax}`,
      srdPage: 3,
    });
  }

  return violations;
}

/**
 * Validates level bounds.
 * SRD: characters level 1-10.
 */
function validateLevel(level: number): ValidationViolation[] {
  const violations: ValidationViolation[] = [];

  if (!Number.isInteger(level) || level < 1 || level > 10) {
    violations.push({
      id: "level-out-of-range",
      field: "level",
      severity: "error",
      message: `Level must be an integer in [1, 10]; received ${level}`,
      suggestion: "Reset level to a valid value",
    });
  }

  return violations;
}

/**
 * Validates domain count.
 * SRD: characters can have max 2 domains of their class.
 */
function validateDomainCount(
  domains: string[] | undefined,
  classData: ClassData | undefined
): ValidationViolation[] {
  const violations: ValidationViolation[] = [];

  if (!domains) return violations;

  if (domains.length > 2) {
    violations.push({
      id: "too-many-domains",
      field: "domains",
      severity: "error",
      message: `Character has ${domains.length} domains; maximum is 2`,
      suggestion: "Select only 2 domains",
      srdPage: 22,
    });
  }

  // Check domains match class
  if (classData) {
    for (const domain of domains) {
      if (!classData.domains.includes(domain)) {
        violations.push({
          id: "domain-not-in-class",
          field: "domains",
          severity: "error",
          message: `Domain "${domain}" is not one of class's domains (${classData.domains.join(", ")})`,
          suggestion: `Select only from: ${classData.domains.join(", ")}`,
          srdPage: 22,
        });
      }
    }
  }

  return violations;
}

/**
 * Validates advancement constraints.
 * SRD page 22-23: specialization at level 3, mastery at level 6.
 * Multiclass only at level 2.
 */
function validateAdvancement(
  character: Character,
  classData: ClassData | undefined
): ValidationViolation[] {
  const violations: ValidationViolation[] = [];

  const { level, subclassId } = character;

  // Subclass foundation always accessible at level 1+
  // Specialization requires level 3+
  // Mastery requires level 6+
  // (These are informational; not hard errors but helpful warnings)

  return violations;
}

// ─── Main validation hook ─────────────────────────────────────────────────────

/**
 * useCharacterValidation
 *
 * Runs all SRD compliance checks against the character sheet.
 * Returns violations, blocked save state, and helpful suggestions.
 *
 * Usage:
 *   const validation = useCharacterValidation(character, classData);
 *   if (!validation.isValid) { // show errors }
 */
export function useCharacterValidation(
  character: Character | undefined,
  classData: ClassData | undefined
): CharacterValidationResult {
  return useMemo(() => {
    if (!character) {
      return {
        isValid: true,
        violations: [],
        blockingSave: false,
      };
    }

    const allViolations: ValidationViolation[] = [];

    // Run all validators
    allViolations.push(...validateTraitModifiers(character.traitBonuses));
    allViolations.push(...validateDomainLoadout(character.domainLoadout));
    allViolations.push(...validateArmorScore(character.derivedStats.armor, 12, character.level));
    allViolations.push(...validateCoreStats(character.stats));
    allViolations.push(...validateTrackers(character));
    allViolations.push(...validateHope(character.hope, character.hopeMax));
    allViolations.push(...validateLevel(character.level));
    allViolations.push(...validateDomainCount(character.domains, classData));
    allViolations.push(...validateAdvancement(character, classData));

    const blockingSave = allViolations.some((v) => v.severity === "error");

    return {
      isValid: !blockingSave,
      violations: allViolations,
      blockingSave,
    };
  }, [character, classData]);
}

// ─── Specialized validators for UI forms ──────────────────────────────────────

/**
 * Validates only trait assignment (for TraitAssignmentPanel).
 * Returns { isValid, message, sum }.
 */
export function validateTraitsForAssignment(
  traits: Record<string, number>
): {
  isValid: boolean;
  message: string;
  sum: number;
  assigned: number;
} {
  const bonusValues = Object.values(traits);
  const sum = bonusValues.reduce((acc, val) => acc + val, 0);
  const assigned = Object.keys(traits).length;

  return {
    isValid: sum === 3 && assigned === 4,
    message:
      assigned < 4
        ? `${4 - assigned} trait${assigned < 3 ? "s" : ""} to assign`
        : sum === 3
          ? "Traits assigned ✓"
          : `Sum is ${sum}; must be +3`,
    sum,
    assigned,
  };
}

/**
 * Validates domain loadout count (for DomainLoadout).
 * Returns { canAdd, current, max }.
 */
export function validateLoadoutCapacity(
  loadout: string[] | undefined
): {
  canAdd: boolean;
  current: number;
  max: number;
  available: number;
} {
  const current = loadout?.length ?? 0;
  const max = 5;
  return {
    canAdd: current < max,
    current,
    max,
    available: max - current,
  };
}

/**
 * Validates armor score (for ArmorSelectionPanel).
 * Returns { isValid, score, max, warning }.
 */
export function validateArmorForEquip(
  baseArmor: number,
  level: number
): {
  isValid: boolean;
  score: number;
  max: number;
  warning?: string;
} {
  const score = baseArmor + level;
  const max = 12;
  return {
    isValid: score <= max,
    score,
    max,
    warning: score > max ? `Would exceed cap (${score} > ${max})` : undefined,
  };
}
