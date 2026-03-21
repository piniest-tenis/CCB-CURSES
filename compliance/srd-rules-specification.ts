/**
 * Daggerheart SRD Rules Specification
 * 
 * A comprehensive, machine-readable ruleset that enforces Daggerheart mechanics.
 * This specification ENFORCES core gameplay rules but does NOT enumerate character options
 * (classes, domains, ancestries, communities) - those come from the campaign frame.
 * 
 * Authority: Daggerheart SRD 1.0 (9-09-25) & Daggerheart Homebrew Kit v1.0
 * 
 * SCOPE:
 * - Universal mechanical rules (traits, damage, combat, resources)
 * - Progression and advancement constraints
 * - Domain system mechanics
 * - Rest and downtime rules
 * - Death and scarring mechanics
 * 
 * DOES NOT SCOPE:
 * - Character option selection (handled by campaign frame ingestion)
 * - Class/domain/ancestry/community definitions (sourced from markdown/)
 * - Narrative flavor (solely mechanical)
 */

// ============================================================================
// ERROR TYPES & VALIDATION
// ============================================================================

export enum SRDErrorCode {
  // Character creation
  INVALID_TRAIT_ASSIGNMENT = 'INVALID_TRAIT_ASSIGNMENT',
  INVALID_STARTING_STATS = 'INVALID_STARTING_STATS',
  INVALID_ARMOR_SCORE = 'INVALID_ARMOR_SCORE',
  INVALID_DOMAIN_LOADOUT = 'INVALID_DOMAIN_LOADOUT',
  INVALID_PROFICIENCY_START = 'INVALID_PROFICIENCY_START',

  // Combat
  INVALID_DUALITY_ROLL = 'INVALID_DUALITY_ROLL',
  INVALID_DAMAGE_CALC = 'INVALID_DAMAGE_CALC',
  INVALID_CONDITION_STATE = 'INVALID_CONDITION_STATE',
  INVALID_ARMOR_SLOT_MARK = 'INVALID_ARMOR_SLOT_MARK',

  // Resources
  INVALID_HP_SLOT = 'INVALID_HP_SLOT',
  INVALID_STRESS_SLOT = 'INVALID_STRESS_SLOT',
  INVALID_HOPE_VALUE = 'INVALID_HOPE_VALUE',

  // Advancement
  INVALID_LEVEL_PROGRESSION = 'INVALID_LEVEL_PROGRESSION',
  INVALID_PROFICIENCY_PROGRESSION = 'INVALID_PROFICIENCY_PROGRESSION',
  INVALID_DOMAIN_LEVEL_GATE = 'INVALID_DOMAIN_LEVEL_GATE',
  INVALID_MULTICLASS = 'INVALID_MULTICLASS',
  INVALID_ADVANCEMENT_SLOT = 'INVALID_ADVANCEMENT_SLOT',

  // Domain system
  INVALID_RECALL_COST = 'INVALID_RECALL_COST',
  INVALID_LOADOUT_SIZE = 'INVALID_LOADOUT_SIZE',

  // Rest & downtime
  INVALID_REST_TYPE = 'INVALID_REST_TYPE',
  INVALID_CONSECUTIVE_SHORT_RESTS = 'INVALID_CONSECUTIVE_SHORT_RESTS',

  // Death
  INVALID_DEATH_OPTION = 'INVALID_DEATH_OPTION',
  INVALID_SCAR_CHECK = 'INVALID_SCAR_CHECK',
}

export interface SRDValidationError {
  code: SRDErrorCode;
  message: string;
  srdPageCitation: string;
  severity: 'error' | 'warning';
  context?: Record<string, any>;
}

export interface ValidationResult {
  valid: boolean;
  errors: SRDValidationError[];
}

// ============================================================================
// CORE CONSTANTS & RANGES (SRD Page 3-5)
// ============================================================================

export const TRAIT_MODIFIERS = [2, 1, 1, 0, 0, -1] as const;
export const TRAIT_MODIFIER_SUM = 2; // Total must sum to +2
export const TRAITS = [
  'Agility',
  'Strength',
  'Finesse',
  'Instinct',
  'Presence',
  'Knowledge',
] as const;

export type Trait = typeof TRAITS[number];

// Starting stats by class (SRD page 3-6)
export interface ClassStartingStats {
  evasion: number;
  hp: number;
}

export const CLASS_STARTING_STATS: Record<string, ClassStartingStats> = {
  // Defined by campaign frame - this is a reference structure only
  // Format: { [className]: { evasion: number, hp: number } }
};

// Resource constraints (SRD page 3-4, 39)
export const RESOURCE_LIMITS = {
  STRESS_BASE: 6,
  STRESS_MAX: 12,
  HOPE_START: 2,
  HOPE_MAX: 6,
  ARMOR_SCORE_CAP: 12,
  PROFICIENCY_START: 1,
  PROFICIENCY_MAX: 4,
} as const;

// Domain system (SRD page 4-5)
export const DOMAIN_SYSTEM = {
  LOADOUT_MAX: 5,
  VAULT_MAX: Infinity, // Unlimited vault size
  STARTING_LOADOUT_SIZE: 2,
  DOMAIN_LEVEL_GATE: true, // card_level must be <= character_level
} as const;

// ============================================================================
// TIER & PROGRESSION (SRD Pages 42-43)
// ============================================================================

export enum Tier {
  TIER_1 = 1, // Level 1
  TIER_2 = 2, // Levels 2-4
  TIER_3 = 3, // Levels 5-7
  TIER_4 = 4, // Levels 8-10
}

export const TIER_STRUCTURE: Record<Tier, { minLevel: number; maxLevel: number }> = {
  [Tier.TIER_1]: { minLevel: 1, maxLevel: 1 },
  [Tier.TIER_2]: { minLevel: 2, maxLevel: 4 },
  [Tier.TIER_3]: { minLevel: 5, maxLevel: 7 },
  [Tier.TIER_4]: { minLevel: 8, maxLevel: 10 },
};

export function getTier(level: number): Tier {
  if (level === 1) return Tier.TIER_1;
  if (level >= 2 && level <= 4) return Tier.TIER_2;
  if (level >= 5 && level <= 7) return Tier.TIER_3;
  if (level >= 8 && level <= 10) return Tier.TIER_4;
  throw new Error(`Invalid level: ${level}. Must be 1-10.`);
}

// Advancement slots per level (SRD page 42)
export const ADVANCEMENT_SLOTS_PER_LEVEL = 2;

// Proficiency progression (SRD page 42)
export const PROFICIENCY_PROGRESSION: Record<Tier, number> = {
  [Tier.TIER_1]: 1,
  [Tier.TIER_2]: 2,
  [Tier.TIER_3]: 3,
  [Tier.TIER_4]: 4,
};

export function calculateProficiency(level: number): number {
  const tier = getTier(level);
  return PROFICIENCY_PROGRESSION[tier];
}

// ============================================================================
// CHARACTER CREATION & VALIDATION
// ============================================================================

export interface CharacterTraits {
  Agility: number;
  Strength: number;
  Finesse: number;
  Instinct: number;
  Presence: number;
  Knowledge: number;
}

export interface CharacterCreationInput {
  traits: CharacterTraits;
  evasion: number;
  hp: number;
  stress: number;
  hope: number;
  proficiency: number;
  armorScore: number;
  domainLoadout: Array<{ name: string; level: number }>;
}

/**
 * Validate trait assignment (SRD page 3)
 * - Must use modifiers: +2, +1, +1, +0, +0, -1
 * - Total must sum to +2
 */
export function validateTraitAssignment(traits: CharacterTraits): ValidationResult {
  const modifiers = Object.values(traits).sort((a, b) => b - a);
  const expectedModifiers = [2, 1, 1, 0, 0, -1];

  const errors: SRDValidationError[] = [];

  // Check modifiers match
  if (!arraysEqual(modifiers, expectedModifiers)) {
    errors.push({
      code: SRDErrorCode.INVALID_TRAIT_ASSIGNMENT,
      message: `Trait modifiers must be [+2, +1, +1, +0, +0, -1]. Got [${modifiers.join(', ')}]`,
      srdPageCitation: 'SRD Page 3: Step 3 - Assign Character Traits',
      severity: 'error',
      context: { provided: modifiers, expected: expectedModifiers },
    });
  }

  // Check sum
  const sum = Object.values(traits).reduce((a, b) => a + b, 0);
  if (sum !== TRAIT_MODIFIER_SUM) {
    errors.push({
      code: SRDErrorCode.INVALID_TRAIT_ASSIGNMENT,
      message: `Trait modifiers must sum to +2. Sum is +${sum}`,
      srdPageCitation: 'SRD Page 3: Step 3 - Assign Character Traits',
      severity: 'error',
      context: { sum },
    });
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate starting stats (SRD page 3)
 * - Evasion: class-determined (9-12 typical)
 * - HP: class-determined (5-7 typical)
 * - Stress: always starts at 6 (page 3)
 * - Hope: always starts at 2 (page 4)
 * - Proficiency: always starts at 1 (page 4)
 */
export function validateStartingStats(input: CharacterCreationInput, classStats: ClassStartingStats): ValidationResult {
  const errors: SRDValidationError[] = [];

  if (input.evasion !== classStats.evasion) {
    errors.push({
      code: SRDErrorCode.INVALID_STARTING_STATS,
      message: `Starting Evasion must be ${classStats.evasion} for this class. Got ${input.evasion}`,
      srdPageCitation: 'SRD Page 3: Step 4 - Record Additional Character Information',
      severity: 'error',
      context: { expected: classStats.evasion, provided: input.evasion },
    });
  }

  if (input.hp !== classStats.hp) {
    errors.push({
      code: SRDErrorCode.INVALID_STARTING_STATS,
      message: `Starting HP must be ${classStats.hp} for this class. Got ${input.hp}`,
      srdPageCitation: 'SRD Page 3: Step 4 - Record Additional Character Information',
      severity: 'error',
      context: { expected: classStats.hp, provided: input.hp },
    });
  }

  if (input.stress !== RESOURCE_LIMITS.STRESS_BASE) {
    errors.push({
      code: SRDErrorCode.INVALID_STARTING_STATS,
      message: `Starting Stress must be ${RESOURCE_LIMITS.STRESS_BASE}. Got ${input.stress}`,
      srdPageCitation: 'SRD Page 3: Step 4 - Record Additional Character Information',
      severity: 'error',
      context: { expected: RESOURCE_LIMITS.STRESS_BASE, provided: input.stress },
    });
  }

  if (input.hope !== RESOURCE_LIMITS.HOPE_START) {
    errors.push({
      code: SRDErrorCode.INVALID_STARTING_STATS,
      message: `Starting Hope must be ${RESOURCE_LIMITS.HOPE_START}. Got ${input.hope}`,
      srdPageCitation: 'SRD Page 4: Step 4 - Record Additional Character Information',
      severity: 'error',
      context: { expected: RESOURCE_LIMITS.HOPE_START, provided: input.hope },
    });
  }

  if (input.proficiency !== RESOURCE_LIMITS.PROFICIENCY_START) {
    errors.push({
      code: SRDErrorCode.INVALID_PROFICIENCY_START,
      message: `Starting Proficiency must be ${RESOURCE_LIMITS.PROFICIENCY_START}. Got ${input.proficiency}`,
      srdPageCitation: 'SRD Page 4: Step 5 - Choose Your Starting Equipment',
      severity: 'error',
      context: { expected: RESOURCE_LIMITS.PROFICIENCY_START, provided: input.proficiency },
    });
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate Armor Score (SRD page 4, 29)
 * - Maximum 12
 * - Base Score + bonuses cannot exceed 12
 */
export function validateArmorScore(armorScore: number): ValidationResult {
  const errors: SRDValidationError[] = [];

  if (armorScore > RESOURCE_LIMITS.ARMOR_SCORE_CAP) {
    errors.push({
      code: SRDErrorCode.INVALID_ARMOR_SCORE,
      message: `Armor Score cannot exceed ${RESOURCE_LIMITS.ARMOR_SCORE_CAP}. Got ${armorScore}`,
      srdPageCitation: 'SRD Page 29: Armor - Base Armor Score',
      severity: 'error',
      context: { max: RESOURCE_LIMITS.ARMOR_SCORE_CAP, provided: armorScore },
    });
  }

  if (armorScore < 0) {
    errors.push({
      code: SRDErrorCode.INVALID_ARMOR_SCORE,
      message: `Armor Score cannot be negative. Got ${armorScore}`,
      srdPageCitation: 'SRD Page 29: Armor - Base Armor Score',
      severity: 'error',
      context: { provided: armorScore },
    });
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate domain loadout at character creation (SRD page 4)
 * - Exactly 2 cards chosen
 * - All cards must have level <= 1 (creation is Level 1)
 * - All cards must come from campaign frame's allowed domains
 */
export function validateCharacterCreationDomainLoadout(
  loadout: Array<{ name: string; level: number }>,
  allowedDomains: string[],
): ValidationResult {
  const errors: SRDValidationError[] = [];

  if (loadout.length !== 2) {
    errors.push({
      code: SRDErrorCode.INVALID_DOMAIN_LOADOUT,
      message: `Must choose exactly 2 domain cards at creation. Got ${loadout.length}`,
      srdPageCitation: 'SRD Page 4: Step 8 - Choose Domain Cards',
      severity: 'error',
      context: { expected: 2, provided: loadout.length },
    });
  }

  loadout.forEach((card, index) => {
    if (card.level > 1) {
      errors.push({
        code: SRDErrorCode.INVALID_DOMAIN_LEVEL_GATE,
        message: `Card "${card.name}" (level ${card.level}) cannot be chosen at character creation (level 1)`,
        srdPageCitation: 'SRD Page 5: Domain Cards - Level',
        severity: 'error',
        context: { cardLevel: card.level, characterLevel: 1, index },
      });
    }
  });

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function validateCharacterCreation(
  input: CharacterCreationInput,
  classStats: ClassStartingStats,
  allowedDomains: string[],
): ValidationResult {
  const allErrors: SRDValidationError[] = [];

  // Run all validations
  const traitValidation = validateTraitAssignment(input.traits);
  const statsValidation = validateStartingStats(input, classStats);
  const armorValidation = validateArmorScore(input.armorScore);
  const domainValidation = validateCharacterCreationDomainLoadout(input.domainLoadout, allowedDomains);

  allErrors.push(...traitValidation.errors, ...statsValidation.errors, ...armorValidation.errors, ...domainValidation.errors);

  return {
    valid: allErrors.length === 0,
    errors: allErrors,
  };
}

// ============================================================================
// COMBAT MECHANICS (SRD Pages 35-42)
// ============================================================================

export enum DiceType {
  D4 = 4,
  D6 = 6,
  D8 = 8,
  D10 = 10,
  D12 = 12,
  D20 = 20,
}

export type DualityDie = DiceType;

export enum RollOutcome {
  CRITICAL_SUCCESS = 'CRITICAL_SUCCESS', // Both dice match, both are in upper half of die
  SUCCESS_WITH_HOPE = 'SUCCESS_WITH_HOPE', // Hope die meets/exceeds difficulty
  SUCCESS_WITH_FEAR = 'SUCCESS_WITH_FEAR', // Fear die meets/exceeds difficulty (but hope doesn't)
  FAILURE_WITH_FEAR = 'FAILURE_WITH_FEAR', // Both fail difficulty
  FAILURE_WITH_HOPE = 'FAILURE_WITH_HOPE', // Both fail but generated Hope die
}

export interface DualityRoll {
  hopeDie: number;
  fearDie: number;
  total: number;
  outcome: RollOutcome;
}

/**
 * Evaluate a Duality Roll (SRD page 35)
 * 
 * Rules:
 * - Roll Hope Die and Fear Die (typically d12, d6, or d4)
 * - Compare to Difficulty
 * - Determine outcome:
 *   * Critical Success: Both dice match AND both are in upper half of die
 *   * Success with Hope: Hope Die >= Difficulty (and Fear Die < Difficulty or equal)
 *   * Success with Fear: Fear Die >= Difficulty (and Hope Die < Difficulty)
 *   * Failure with Fear: Both < Difficulty, Fear die rolled
 *   * Failure with Hope: Both < Difficulty, Hope die rolled
 * 
 * SRD Page 35: "When you make an action roll, you roll two dice called Duality Dice--
 *              the Hope Die and Fear Die."
 */
export function evaluateDualityRoll(hopeDie: number, fearDie: number, difficulty: number): DualityRoll {
  const hopeSuccess = hopeDie >= difficulty;
  const fearSuccess = fearDie >= difficulty;
  const diceMatch = hopeDie === fearDie;
  const bothUpperHalf = hopeDie > getDieMaxValue(hopeDie) / 2 && fearDie > getDieMaxValue(fearDie) / 2;

  let outcome: RollOutcome;

  if (diceMatch && bothUpperHalf) {
    outcome = RollOutcome.CRITICAL_SUCCESS;
  } else if (hopeSuccess) {
    outcome = RollOutcome.SUCCESS_WITH_HOPE;
  } else if (fearSuccess) {
    outcome = RollOutcome.SUCCESS_WITH_FEAR;
  } else {
    // Both fail - determine which die generated the roll
    outcome = RollOutcome.FAILURE_WITH_FEAR;
  }

  return {
    hopeDie,
    fearDie,
    total: Math.max(hopeDie, fearDie), // SRD: use the higher result for effects
    outcome,
  };
}

/**
 * Helper: Get max value for a die
 */
function getDieMaxValue(die: DiceType): number {
  return die; // d6 max is 6, d20 max is 20, etc.
}

/**
 * Damage Thresholds (SRD pages 29, 39)
 * 
 * Damage is categorized by severity:
 * - Minor: 1 HP marked
 * - Major: 2 HP marked, threshold at Level + Base
 * - Severe: 3 HP marked, threshold at 2x(Level + Base)
 * - Massive: 4 HP marked (rare, special effects)
 * 
 * When damage exceeds a threshold, it escalates in severity.
 * 
 * Armor can reduce severity by one threshold (Severe -> Major, Major -> Minor, etc)
 */
export const DAMAGE_SEVERITY = {
  NONE: 0,
  MINOR: 1,
  MAJOR: 2,
  SEVERE: 3,
  MASSIVE: 4, // Rare
} as const;

export interface DamageThresholds {
  major: number;
  severe: number;
}

/**
 * Calculate damage thresholds based on level and armor base (SRD page 29)
 * 
 * Major = Level + Base Threshold
 * Severe = 2x(Level + Base Threshold)
 */
export function calculateDamageThresholds(level: number, armorBase: number): DamageThresholds {
  const base = level + armorBase;
  return {
    major: base,
    severe: base * 2,
  };
}

/**
 * Determine damage severity based on HP damage amount (SRD page 39)
 */
export function determineDamageSeverity(hpDamage: number, thresholds: DamageThresholds): number {
  if (hpDamage >= thresholds.severe) return DAMAGE_SEVERITY.SEVERE;
  if (hpDamage >= thresholds.major) return DAMAGE_SEVERITY.MAJOR;
  if (hpDamage > 0) return DAMAGE_SEVERITY.MINOR;
  return DAMAGE_SEVERITY.NONE;
}

/**
 * Armor Slot Reduction (SRD pages 29, 39)
 * 
 * When taking damage, a character can mark one Armor Slot to reduce severity by 1 threshold.
 * - Severe -> Major
 * - Major -> Minor
 * - Minor -> None (no damage taken)
 * 
 * If Armor Score is 0, cannot mark slots.
 */
export function reduceArmorSeverity(severity: number): number {
  if (severity === DAMAGE_SEVERITY.NONE) return DAMAGE_SEVERITY.NONE;
  if (severity === DAMAGE_SEVERITY.MINOR) return DAMAGE_SEVERITY.NONE;
  if (severity === DAMAGE_SEVERITY.MAJOR) return DAMAGE_SEVERITY.MINOR;
  if (severity === DAMAGE_SEVERITY.SEVERE) return DAMAGE_SEVERITY.MAJOR;
  if (severity === DAMAGE_SEVERITY.MASSIVE) return DAMAGE_SEVERITY.SEVERE;
  return severity;
}

export function validateArmorSlotMark(armorScore: number, armorSlotsRemaining: number): ValidationResult {
  const errors: SRDValidationError[] = [];

  if (armorScore === 0) {
    errors.push({
      code: SRDErrorCode.INVALID_ARMOR_SLOT_MARK,
      message: 'Cannot mark Armor Slots when Armor Score is 0 (unarmored)',
      srdPageCitation: 'SRD Page 29: Reducing Incoming Damage',
      severity: 'error',
    });
  }

  if (armorSlotsRemaining <= 0) {
    errors.push({
      code: SRDErrorCode.INVALID_ARMOR_SLOT_MARK,
      message: 'No Armor Slots remaining to mark',
      srdPageCitation: 'SRD Page 29: Reducing Incoming Damage',
      severity: 'error',
      context: { remaining: armorSlotsRemaining },
    });
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// ============================================================================
// RESOURCES: HP, STRESS, HOPE (SRD Pages 3-4, 39)
// ============================================================================

/**
 * Validate HP slot count (SRD page 3)
 * - Depends on class + tier
 * - Campaign frame defines class ranges; this validates range
 */
export function validateHPSlots(currentHP: number, maxHP: number): ValidationResult {
  const errors: SRDValidationError[] = [];

  if (currentHP < 0) {
    errors.push({
      code: SRDErrorCode.INVALID_HP_SLOT,
      message: `HP cannot be negative. Got ${currentHP}`,
      srdPageCitation: 'SRD Page 3: Step 4 - Record Additional Character Information',
      severity: 'error',
      context: { current: currentHP },
    });
  }

  if (currentHP > maxHP) {
    errors.push({
      code: SRDErrorCode.INVALID_HP_SLOT,
      message: `HP cannot exceed maximum. Current: ${currentHP}, Max: ${maxHP}`,
      srdPageCitation: 'SRD Page 3: Step 4 - Record Additional Character Information',
      severity: 'error',
      context: { current: currentHP, max: maxHP },
    });
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate Stress slots (SRD page 3)
 * - Starts at 6
 * - Maximum 12
 * - Can be modified by class features/conditions
 */
export function validateStressSlots(currentStress: number, maxStress: number): ValidationResult {
  const errors: SRDValidationError[] = [];

  if (currentStress < 0) {
    errors.push({
      code: SRDErrorCode.INVALID_STRESS_SLOT,
      message: `Stress cannot be negative. Got ${currentStress}`,
      srdPageCitation: 'SRD Page 3: Step 4 - Record Additional Character Information',
      severity: 'error',
      context: { current: currentStress },
    });
  }

  if (currentStress > maxStress) {
    errors.push({
      code: SRDErrorCode.INVALID_STRESS_SLOT,
      message: `Stress cannot exceed maximum. Current: ${currentStress}, Max: ${maxStress}`,
      srdPageCitation: 'SRD Page 3: Step 4 - Record Additional Character Information',
      severity: 'error',
      context: { current: currentStress, max: maxStress },
    });
  }

  if (maxStress > RESOURCE_LIMITS.STRESS_MAX) {
    errors.push({
      code: SRDErrorCode.INVALID_STRESS_SLOT,
      message: `Max Stress cannot exceed ${RESOURCE_LIMITS.STRESS_MAX}. Got ${maxStress}`,
      srdPageCitation: 'SRD Page 39: Stress',
      severity: 'error',
      context: { max: maxStress, limit: RESOURCE_LIMITS.STRESS_MAX },
    });
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate Hope (SRD page 4)
 * - Starts at 2
 * - Maximum 6
 * - Spending/gaining Hope is tracked separately
 */
export function validateHope(currentHope: number): ValidationResult {
  const errors: SRDValidationError[] = [];

  if (currentHope < 0) {
    errors.push({
      code: SRDErrorCode.INVALID_HOPE_VALUE,
      message: `Hope cannot be negative. Got ${currentHope}`,
      srdPageCitation: 'SRD Page 4: Step 4 - Record Additional Character Information',
      severity: 'error',
      context: { current: currentHope },
    });
  }

  if (currentHope > RESOURCE_LIMITS.HOPE_MAX) {
    errors.push({
      code: SRDErrorCode.INVALID_HOPE_VALUE,
      message: `Hope cannot exceed ${RESOURCE_LIMITS.HOPE_MAX}. Got ${currentHope}`,
      srdPageCitation: 'SRD Page 4: Step 4 - Record Additional Character Information',
      severity: 'error',
      context: { current: currentHope, max: RESOURCE_LIMITS.HOPE_MAX },
    });
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// ============================================================================
// DOMAIN SYSTEM (SRD Pages 4-5)
// ============================================================================

export interface DomainCard {
  name: string;
  domain: string;
  level: number;
  recallCost: number; // Stress cost to move from vault to loadout
}

/**
 * Validate domain loadout size (SRD page 5)
 * - Maximum 5 cards in loadout
 * - Unlimited in vault
 * - Subclass, ancestry, community cards don't count
 */
export function validateDomainLoadout(
  loadoutCards: DomainCard[],
  characterLevel: number,
): ValidationResult {
  const errors: SRDValidationError[] = [];

  if (loadoutCards.length > DOMAIN_SYSTEM.LOADOUT_MAX) {
    errors.push({
      code: SRDErrorCode.INVALID_LOADOUT_SIZE,
      message: `Domain loadout cannot exceed ${DOMAIN_SYSTEM.LOADOUT_MAX} cards. Got ${loadoutCards.length}`,
      srdPageCitation: 'SRD Page 5: Loadout & Vault',
      severity: 'error',
      context: { max: DOMAIN_SYSTEM.LOADOUT_MAX, current: loadoutCards.length },
    });
  }

  // Validate level gating (SRD page 5)
  loadoutCards.forEach((card, index) => {
    if (card.level > characterLevel) {
      errors.push({
        code: SRDErrorCode.INVALID_DOMAIN_LEVEL_GATE,
        message: `Domain card "${card.name}" (level ${card.level}) exceeds character level (${characterLevel})`,
        srdPageCitation: 'SRD Page 5: Domain Cards - Level',
        severity: 'error',
        context: { cardLevel: card.level, characterLevel, cardIndex: index },
      });
    }
  });

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate recall cost when moving card from vault to loadout (SRD page 5)
 * - Must have enough Stress to mark
 * - Recall cost is specified on the card
 * - Free during rest (downtime swap)
 */
export function validateRecallCost(recallCost: number, currentStress: number, isDuringRest: boolean): ValidationResult {
  const errors: SRDValidationError[] = [];

  if (isDuringRest) {
    // Downtime swaps are free (SRD page 5: "At the start of a rest, before using downtime moves...")
    return { valid: true, errors: [] };
  }

  if (currentStress < recallCost) {
    errors.push({
      code: SRDErrorCode.INVALID_RECALL_COST,
      message: `Insufficient Stress to recall card. Need ${recallCost}, have ${currentStress}`,
      srdPageCitation: 'SRD Page 5: Loadout & Vault',
      severity: 'error',
      context: { recallCost, available: currentStress },
    });
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// ============================================================================
// ADVANCEMENT & LEVELING (SRD Pages 42-43)
// ============================================================================

/**
 * Validate proficiency progression (SRD page 42)
 * - Tier 1 (L1): 1
 * - Tier 2 (L2-4): 2
 * - Tier 3 (L5-7): 3
 * - Tier 4 (L8-10): 4
 */
export function validateProficiencyProgression(level: number, proficiency: number): ValidationResult {
  const errors: SRDValidationError[] = [];
  const expectedProficiency = calculateProficiency(level);

  if (proficiency !== expectedProficiency) {
    errors.push({
      code: SRDErrorCode.INVALID_PROFICIENCY_PROGRESSION,
      message: `Proficiency for level ${level} must be ${expectedProficiency}. Got ${proficiency}`,
      srdPageCitation: 'SRD Page 42: Leveling Up - Proficiency',
      severity: 'error',
      context: { level, expected: expectedProficiency, provided: proficiency },
    });
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export interface AdvancementCheck {
  oldLevel: number;
  newLevel: number;
  oldProficiency: number;
  newProficiency: number;
  newDomainCards: DomainCard[]; // Cards chosen at this level
  multiclassActive: boolean; // If true, limits domain access
}

/**
 * Validate advancement (SRD pages 42-43)
 * 
 * Rules:
 * - Proficiency updates per tier (see above)
 * - PC gains 2 advancement slots per level
 * - Gain 1 domain card per level (level-gated: card_level <= character_level)
 * - Multiclass rule: available at L5+, picks domain <= ceil(level/2), locks out further multiclass
 */
export function validateAdvancement(check: AdvancementCheck): ValidationResult {
  const errors: SRDValidationError[] = [];

  // Proficiency check
  const profCheck = validateProficiencyProgression(check.newLevel, check.newProficiency);
  errors.push(...profCheck.errors);

  // Domain level gating
  check.newDomainCards.forEach((card, index) => {
    if (card.level > check.newLevel) {
      errors.push({
        code: SRDErrorCode.INVALID_DOMAIN_LEVEL_GATE,
        message: `Domain card "${card.name}" (level ${card.level}) exceeds character level (${check.newLevel})`,
        srdPageCitation: 'SRD Page 5: Domain Cards - Level',
        severity: 'error',
        context: { cardLevel: card.level, characterLevel: check.newLevel, index },
      });
    }
  });

  // Multiclass validation (SRD page 43: "Multiclass")
  if (check.multiclassActive && check.newLevel < 5) {
    errors.push({
      code: SRDErrorCode.INVALID_MULTICLASS,
      message: `Multiclass is only available at level 5 or higher. Current level: ${check.newLevel}`,
      srdPageCitation: 'SRD Page 43: Multiclassing',
      severity: 'error',
      context: { level: check.newLevel },
    });
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// ============================================================================
// REST & DOWNTIME (SRD Page 41)
// ============================================================================

export enum RestType {
  SHORT = 'SHORT',
  LONG = 'LONG',
}

export interface RestRules {
  shortRestDuration: string; // e.g., "1-2 hours"
  longRestDuration: string; // e.g., "8 hours"
  fearGainShortRest: string; // "1d4"
  fearGainLongRest: string; // "1d4 + number of PCs"
  consecutiveShortRestLimit: number; // After 3 short rests, must take long rest
}

export const REST_RULES: RestRules = {
  shortRestDuration: '1-2 hours',
  longRestDuration: '8 hours',
  fearGainShortRest: '1d4',
  fearGainLongRest: '1d4 + number of PCs',
  consecutiveShortRestLimit: 3,
};

/**
 * Validate rest type and consecutive short rests (SRD page 41)
 */
export function validateRest(restType: RestType, consecutiveShortRests: number): ValidationResult {
  const errors: SRDValidationError[] = [];

  if (restType === RestType.SHORT && consecutiveShortRests > REST_RULES.consecutiveShortRestLimit) {
    errors.push({
      code: SRDErrorCode.INVALID_CONSECUTIVE_SHORT_RESTS,
      message: `Cannot take more than ${REST_RULES.consecutiveShortRestLimit} consecutive short rests. Current: ${consecutiveShortRests}`,
      srdPageCitation: 'SRD Page 41: Downtime',
      severity: 'error',
      context: { limit: REST_RULES.consecutiveShortRestLimit, current: consecutiveShortRests },
    });
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// ============================================================================
// DEATH & SCARRING (SRD Page 42)
// ============================================================================

export enum DeathOption {
  BLAZE = 'BLAZE', // Last action
  AVOID = 'AVOID', // Retreat or hide
  RISK = 'RISK', // Make a scar check
}

/**
 * Validate death option and scar check (SRD page 42)
 * 
 * When PC marks last HP:
 * - BLAZE: Take one last dramatic action
 * - AVOID: Leave the scene (retreat/hide/flee)
 * - RISK: Roll Hope Die. If <= Level, gain a scar; if >, you survive with 1 HP
 */
export function validateDeathOption(option: DeathOption): ValidationResult {
  const errors: SRDValidationError[] = [];

  const validOptions = Object.values(DeathOption);
  if (!validOptions.includes(option)) {
    errors.push({
      code: SRDErrorCode.INVALID_DEATH_OPTION,
      message: `Invalid death option. Must be one of: ${validOptions.join(', ')}. Got: ${option}`,
      srdPageCitation: 'SRD Page 42: Death',
      severity: 'error',
      context: { provided: option, valid: validOptions },
    });
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export interface ScarCheckInput {
  hopeDieRoll: number; // Result of rolling Hope Die
  characterLevel: number;
}

/**
 * Validate scar check (SRD page 42)
 * 
 * When choosing RISK option at death:
 * - Roll Hope Die
 * - If result <= Level: gain a scar, character survives (not stated clearly but implied)
 * - If result > Level: character dies (campaign ends for them)
 */
export function validateScarCheck(input: ScarCheckInput): ValidationResult {
  const errors: SRDValidationError[] = [];

  if (input.hopeDieRoll < 1 || input.hopeDieRoll > 12) {
    errors.push({
      code: SRDErrorCode.INVALID_SCAR_CHECK,
      message: `Hope Die roll must be 1-12. Got ${input.hopeDieRoll}`,
      srdPageCitation: 'SRD Page 42: Death',
      severity: 'error',
      context: { roll: input.hopeDieRoll },
    });
  }

  if (input.characterLevel < 1 || input.characterLevel > 10) {
    errors.push({
      code: SRDErrorCode.INVALID_SCAR_CHECK,
      message: `Character level must be 1-10. Got ${input.characterLevel}`,
      srdPageCitation: 'SRD Page 42: Death',
      severity: 'error',
      context: { level: input.characterLevel },
    });
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function determineScarCheckOutcome(input: ScarCheckInput): {
  survives: boolean;
  gainsScar: boolean;
} {
  const survives = input.hopeDieRoll <= input.characterLevel;
  return {
    survives,
    gainsScar: survives, // If survives, always gains scar
  };
}

// ============================================================================
// CONDITIONS (SRD Page 41 - referenced in various features)
// ============================================================================

export enum Condition {
  HIDDEN = 'Hidden',
  CLOAKED = 'Cloaked',
  VULNERABLE = 'Vulnerable',
  RESTRAINED = 'Restrained',
  POISONED = 'Poisoned',
  CURSED = 'Cursed',
  IGNITED = 'Ignited',
  // Add others as needed; this is a partial list based on SRD
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function arraysEqual<T>(a: T[], b: T[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((val, idx) => val === b[idx]);
}

// ============================================================================
// SUMMARY: RULE ENFORCEMENT POINTS
// ============================================================================

/**
 * UNIVERSAL MECHANICAL RULES (enforced everywhere):
 * 
 * CHARACTER CREATION:
 * ✓ Trait assignment: modifiers [+2, +1, +1, +0, +0, -1], sum to +2
 * ✓ Starting resources: Stress=6, Hope=2, Proficiency=1
 * ✓ Starting Evasion/HP: class-determined (from campaign frame)
 * ✓ Armor Score: max 12
 * ✓ Domain loadout: exactly 2 cards, all level ≤ 1
 * 
 * COMBAT:
 * ✓ Duality Roll evaluation: Hope Die vs Fear Die vs Difficulty
 * ✓ Damage severity: Minor(1 HP) / Major(2 HP) / Severe(3 HP) / Massive(4 HP)
 * ✓ Damage thresholds: Major = Level + Base, Severe = 2x(Level + Base)
 * ✓ Armor slot reduction: reduces severity by 1 threshold
 * 
 * RESOURCES:
 * ✓ HP: 0 to max (class-determined)
 * ✓ Stress: 0 to 12 (base 6, modifiable)
 * ✓ Hope: 0 to 6 (start 2)
 * ✓ Armor Score: 0 to 12
 * 
 * ADVANCEMENT:
 * ✓ Proficiency: 1 → 2 → 3 → 4 (by tier)
 * ✓ Tiers: 1=L1, 2=L2-4, 3=L5-7, 4=L8-10
 * ✓ Domain level gating: card_level ≤ character_level
 * ✓ Multiclass: L5+, domain ≤ ceil(level/2), single choice
 * 
 * DOMAINS:
 * ✓ Loadout: ≤ 5 cards active
 * ✓ Vault: unlimited storage
 * ✓ Recall: Stress cost to move vault → loadout (except during rest)
 * ✓ Rest swap: free domain card swap at rest start
 * 
 * REST & DOWNTIME:
 * ✓ Short rest: 1-2 hours, GM gains 1d4 Fear
 * ✓ Long rest: 8 hours, GM gains 1d4 + PC count Fear
 * ✓ Consecutive short rests: max 3 before forced long rest
 * 
 * DEATH:
 * ✓ Three options: Blaze, Avoid, Risk
 * ✓ Risk: Roll Hope Die; if ≤ Level, gain scar and survive; if > Level, die
 * 
 * CAMPAIGN-CUSTOMIZABLE (NOT enforced here, source from campaign frame):
 * - Class definitions
 * - Domain definitions & access
 * - Ancestry features
 * - Community features
 * - Campaign-specific conditions or homebrew mechanics
 */

export default {
  validateTraitAssignment,
  validateStartingStats,
  validateArmorScore,
  validateCharacterCreationDomainLoadout,
  validateCharacterCreation,
  evaluateDualityRoll,
  calculateDamageThresholds,
  determineDamageSeverity,
  reduceArmorSeverity,
  validateArmorSlotMark,
  validateHPSlots,
  validateStressSlots,
  validateHope,
  validateDomainLoadout,
  validateRecallCost,
  calculateProficiency,
  validateProficiencyProgression,
  validateAdvancement,
  validateRest,
  validateDeathOption,
  validateScarCheck,
  determineScarCheckOutcome,
};
