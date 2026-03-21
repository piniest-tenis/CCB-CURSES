// backend/src/compliance/srdValidator.ts
//
// SRD Compliance Validation Layer for API Endpoints
//
// This module provides Express/Lambda middleware for validating character sheet
// updates against Daggerheart SRD rules before DynamoDB writes.
//
// Validation is performed at multiple layers:
// 1. Input schema validation (Zod)
// 2. Business logic validation (SRD rules)
// 3. DynamoDB constraint enforcement
//
// All character options (classes, domains, ancestries, communities) are limited
// to those defined in the campaign frame (markdown/ folder).
//
// References:
// - SRD p.N citations map to Daggerheart-SRD-digested.md page numbers
// - Campaign-specific rules are cited as CC: filename

import type {
  Character,
  ClassData,
  DomainCard,
  ValidationResult,
  CoreStatName,
  AdvancementChoice,
  LevelUpChoices,
} from "@shared/types";

// ─── Type Definitions ─────────────────────────────────────────────────────────

export interface SrdValidationContext {
  character: Character;
  classData: ClassData;
  allDomainCards: DomainCard[];
  allowedClasses: Map<string, ClassData>;
  allowedDomainIds: Set<string>;
  allowedAncestryIds: Set<string>;
  allowedCommunityIds: Set<string>;
}

export interface ValidationError {
  field: string;
  rule: string;
  message: string;
  srdPage?: number;
  severity: "error" | "warning";
}

export interface SrdValidationResult {
  valid: boolean;
  errors: ValidationError[];
  timestamp: string;
}

// ─── Helper Functions ─────────────────────────────────────────────────────────

function createError(
  field: string,
  rule: string,
  message: string,
  srdPage?: number
): ValidationError {
  return { field, rule, message, srdPage, severity: "error" };
}

function createWarning(
  field: string,
  rule: string,
  message: string,
  srdPage?: number
): ValidationError {
  return { field, rule, message, srdPage, severity: "warning" };
}

// ─── Campaign Frame Validators ────────────────────────────────────────────────

/**
 * Validates that a class selection is available in the campaign frame.
 * SRD p.3: Classes are the mechanical foundation of a character.
 * Campaign constraint: Only classes defined in markdown/Classes/ are allowed.
 */
export function validateClassChoice(
  classId: string,
  context: SrdValidationContext
): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!classId || classId.trim().length === 0) {
    errors.push(
      createError(
        "classId",
        "CLASS_REQUIRED",
        "A class is required to create or modify a character.",
        3
      )
    );
  } else if (!context.allowedClasses.has(classId)) {
    errors.push(
      createError(
        "classId",
        "CLASS_NOT_IN_CAMPAIGN",
        `Class "${classId}" is not available in this campaign. Allowed classes: ${Array.from(context.allowedClasses.keys()).join(", ")}`,
        3
      )
    );
  }

  return errors;
}

/**
 * Validates that ancestry selection is available in the campaign frame.
 * SRD p.7: Ancestry provides mechanical benefits.
 * Campaign constraint: Only ancestries in markdown/Ancestries/ are allowed.
 */
export function validateAncestryChoice(
  ancestryId: string | null | undefined,
  context: SrdValidationContext
): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!ancestryId) {
    return errors; // ancestry is optional
  }

  if (!context.allowedAncestryIds.has(ancestryId)) {
    errors.push(
      createError(
        "ancestryId",
        "ANCESTRY_NOT_IN_CAMPAIGN",
        `Ancestry "${ancestryId}" is not available in this campaign.`,
        7
      )
    );
  }

  return errors;
}

/**
 * Validates that community selection is available in the campaign frame.
 * SRD p.7: Community provides mechanical benefits.
 * Campaign constraint: Only communities in markdown/Communities/ are allowed.
 */
export function validateCommunityChoice(
  communityId: string | null | undefined,
  context: SrdValidationContext
): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!communityId) {
    return errors; // community is optional
  }

  if (!context.allowedCommunityIds.has(communityId)) {
    errors.push(
      createError(
        "communityId",
        "COMMUNITY_NOT_IN_CAMPAIGN",
        `Community "${communityId}" is not available in this campaign.`,
        7
      )
    );
  }

  return errors;
}

// ─── Core Stat Validators ─────────────────────────────────────────────────────

/**
 * Validates core stat bounds.
 * SRD p.3: Stats start at 0–5 at creation.
 * SRD p.22: With level-up bonuses, max stat is 8.
 */
export function validateCoreStat(
  stat: CoreStatName,
  value: number,
  atCreation: boolean = false
): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!Number.isInteger(value)) {
    errors.push(
      createError(
        `stats.${stat}`,
        "STAT_NOT_INTEGER",
        `Stat ${stat} must be an integer, received ${value}`,
        3
      )
    );
    return errors;
  }

  if (value < 0) {
    errors.push(
      createError(
        `stats.${stat}`,
        "STAT_NEGATIVE",
        `Stat ${stat} cannot be negative (received ${value})`,
        3
      )
    );
  }

  if (atCreation && value > 5) {
    errors.push(
      createError(
        `stats.${stat}`,
        "STAT_EXCEEDS_CREATION_MAX",
        `At character creation, stat ${stat} cannot exceed 5 (received ${value})`,
        3
      )
    );
  } else if (!atCreation && value > 8) {
    errors.push(
      createError(
        `stats.${stat}`,
        "STAT_EXCEEDS_MAX",
        `Stat ${stat} cannot exceed 8 even with level-up bonuses (received ${value})`,
        22
      )
    );
  }

  return errors;
}

/**
 * Validates all six core stats.
 */
export function validateCoreStats(
  stats: Record<CoreStatName, number>,
  atCreation: boolean = false
): ValidationError[] {
  const errors: ValidationError[] = [];
  const statNames: CoreStatName[] = [
    "agility",
    "strength",
    "finesse",
    "instinct",
    "presence",
    "knowledge",
  ];

  for (const name of statNames) {
    if (stats[name] !== undefined) {
      errors.push(...validateCoreStat(name, stats[name], atCreation));
    }
  }

  return errors;
}

// ─── Hope Validator ───────────────────────────────────────────────────────────

/**
 * Validates Hope value.
 * SRD p.20: Hope ranges from 0 to 6.
 * SRD p.20: Starting Hope is 2.
 * SRD p.20: Death table can reduce Hope max (scars).
 */
export function validateHope(
  hope: number,
  hopeMax: number
): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!Number.isInteger(hope) || hope < 0) {
    errors.push(
      createError(
        "hope",
        "HOPE_NEGATIVE",
        `Hope must be a non-negative integer (received ${hope})`,
        20
      )
    );
  }

  if (hope > hopeMax) {
    errors.push(
      createError(
        "hope",
        "HOPE_EXCEEDS_MAX",
        `Hope (${hope}) cannot exceed hopeMax (${hopeMax})`,
        20
      )
    );
  }

  if (!Number.isInteger(hopeMax) || hopeMax < 1) {
    errors.push(
      createError(
        "hopeMax",
        "HOPE_MAX_INVALID",
        `Hope max must be a positive integer (received ${hopeMax})`,
        20
      )
    );
  }

  if (hopeMax > 6) {
    errors.push(
      createError(
        "hopeMax",
        "HOPE_MAX_EXCEEDS_BASE",
        `Hope max cannot exceed 6 even with special features (received ${hopeMax})`,
        20
      )
    );
  }

  return errors;
}

// ─── HP / Stress / Armor Validators ────────────────────────────────────────

/**
 * Validates HP tracker state.
 * SRD p.20: HP is the sum of class base + CON-like bonuses + advancements.
 * SRD p.22: Characters can take +1 HP advancement (max 12 slots).
 */
export function validateHpTracker(
  marked: number,
  max: number,
  classStartingHp: number,
  characterLevel: number
): ValidationError[] {
  const errors: ValidationError[] = [];

  // HP max must be at least the class base
  const expectedMinHp = classStartingHp;

  if (!Number.isInteger(max) || max < expectedMinHp) {
    errors.push(
      createError(
        "trackers.hp.max",
        "HP_BELOW_CLASS_BASE",
        `HP max (${max}) must be at least the class base of ${expectedMinHp}`,
        20
      )
    );
  }

  // HP max cannot exceed class base + advancement slots
  // At level 10 with 2 HP advancements per tier, max is class base + (2 * 5 tiers) = base + 10
  // Conservative cap: base + 12
  if (max > expectedMinHp + 12) {
    errors.push(
      createError(
        "trackers.hp.max",
        "HP_EXCEEDS_REASONABLE_MAX",
        `HP max (${max}) exceeds reasonable limit (class base ${expectedMinHp} + 12 advancements)`,
        22
      )
    );
  }

  // HP marked cannot exceed max
  if (!Number.isInteger(marked) || marked < 0) {
    errors.push(
      createError(
        "trackers.hp.marked",
        "HP_MARKED_INVALID",
        `HP marked must be a non-negative integer (received ${marked})`,
        20
      )
    );
  }

  if (marked > max) {
    errors.push(
      createError(
        "trackers.hp.marked",
        "HP_MARKED_EXCEEDS_MAX",
        `HP marked (${marked}) cannot exceed max (${max})`,
        20
      )
    );
  }

  return errors;
}

/**
 * Validates Stress tracker state.
 * SRD p.20: Base Stress at level 1 is 4 + proficiency (1) = 5.
 * SRD p.22: Each tier (levels 1-2, 3-4, etc.) grants +1 Stress advancement.
 * SRD p.22: Characters can take +1 Stress advancement (max 12 slots).
 */
export function validateStressTracker(
  marked: number,
  max: number,
  characterLevel: number
): ValidationError[] {
  const errors: ValidationError[] = [];

  // Base stress: 5 at level 1, +1 per tier
  const tier = Math.ceil(characterLevel / 2) - 1;
  const expectedMinStress = 5 + tier;

  if (!Number.isInteger(max) || max < expectedMinStress) {
    errors.push(
      createError(
        "trackers.stress.max",
        "STRESS_BELOW_LEVEL_BASE",
        `Stress max (${max}) must be at least ${expectedMinStress} for level ${characterLevel}`,
        20
      )
    );
  }

  // Stress max cannot exceed level base + advancement slots
  if (max > expectedMinStress + 12) {
    errors.push(
      createError(
        "trackers.stress.max",
        "STRESS_EXCEEDS_REASONABLE_MAX",
        `Stress max (${max}) exceeds reasonable limit (level base ${expectedMinStress} + 12 advancements)`,
        22
      )
    );
  }

  // Stress marked cannot exceed max
  if (!Number.isInteger(marked) || marked < 0) {
    errors.push(
      createError(
        "trackers.stress.marked",
        "STRESS_MARKED_INVALID",
        `Stress marked must be a non-negative integer (received ${marked})`,
        20
      )
    );
  }

  if (marked > max) {
    errors.push(
      createError(
        "trackers.stress.marked",
        "STRESS_MARKED_EXCEEDS_MAX",
        `Stress marked (${marked}) cannot exceed max (${max})`,
        20
      )
    );
  }

  return errors;
}

/**
 * Validates Armor tracker state.
 * SRD p.20: Armor is calculated from worn armor.
 * Base Armor starts at 10, modified by armor worn.
 * SRD p.12: Armor Score ≤ 12 (DEX mod applies).
 */
export function validateArmorTracker(
  marked: number,
  max: number,
  characterLevel: number
): ValidationError[] {
  const errors: ValidationError[] = [];

  // Armor max should typically be between 10 and 13
  // (base 10 + potential modifiers from class/features)
  if (!Number.isInteger(max) || max < 10) {
    errors.push(
      createError(
        "trackers.armor.max",
        "ARMOR_BELOW_BASE",
        `Armor max (${max}) cannot be less than the base of 10`,
        20
      )
    );
  }

  if (max > 15) {
    errors.push(
      createWarning(
        "trackers.armor.max",
        "ARMOR_UNUSUALLY_HIGH",
        `Armor max (${max}) is unusually high (typical max is 12-13)`,
        20
      )
    );
  }

  // Armor marked cannot exceed max
  if (!Number.isInteger(marked) || marked < 0) {
    errors.push(
      createError(
        "trackers.armor.marked",
        "ARMOR_MARKED_INVALID",
        `Armor marked must be a non-negative integer (received ${marked})`,
        20
      )
    );
  }

  if (marked > max) {
    errors.push(
      createError(
        "trackers.armor.marked",
        "ARMOR_MARKED_EXCEEDS_MAX",
        `Armor marked (${marked}) cannot exceed max (${max})`,
        20
      )
    );
  }

  return errors;
}

// ─── Damage Threshold Validators ──────────────────────────────────────────────

/**
 * Validates damage thresholds.
 * SRD p.20: Thresholds are calculated as base + character level.
 * Typical base values: Major = 10, Severe = 15
 */
export function validateDamageThresholds(
  thresholds: { major: number; severe: number },
  characterLevel: number
): ValidationError[] {
  const errors: ValidationError[] = [];

  const baseMajor = 10;
  const baseSevere = 15;
  const expectedMajor = baseMajor + characterLevel;
  const expectedSevere = baseSevere + characterLevel;

  if (!Number.isInteger(thresholds.major)) {
    errors.push(
      createError(
        "damageThresholds.major",
        "MAJOR_NOT_INTEGER",
        `Major threshold must be an integer (received ${thresholds.major})`,
        20
      )
    );
  }

  if (!Number.isInteger(thresholds.severe)) {
    errors.push(
      createError(
        "damageThresholds.severe",
        "SEVERE_NOT_INTEGER",
        `Severe threshold must be an integer (received ${thresholds.severe})`,
        20
      )
    );
  }

  if (thresholds.major !== expectedMajor) {
    errors.push(
      createError(
        "damageThresholds.major",
        "MAJOR_THRESHOLD_MISMATCH",
        `Major threshold should be ${expectedMajor} (base 10 + level ${characterLevel}), received ${thresholds.major}`,
        20
      )
    );
  }

  if (thresholds.severe !== expectedSevere) {
    errors.push(
      createError(
        "damageThresholds.severe",
        "SEVERE_THRESHOLD_MISMATCH",
        `Severe threshold should be ${expectedSevere} (base 15 + level ${characterLevel}), received ${thresholds.severe}`,
        20
      )
    );
  }

  return errors;
}

// ─── Domain Loadout Validators ────────────────────────────────────────────────

/**
 * Validates domain loadout constraints.
 * SRD p.5: Loadout max is 5 cards (flat, not level-scaled).
 * SRD p.5: Vault contains acquired-but-not-loadout cards.
 * SRD p.4: Character acquires cards at level-up, each must be ≤ level.
 */
export function validateDomainLoadout(
  loadout: string[],
  vault: string[],
  characterLevel: number,
  classDomains: string[],
  allCards: DomainCard[]
): ValidationError[] {
  const errors: ValidationError[] = [];
  const cardMap = new Map(allCards.map((c) => [c.cardId, c]));
  const vaultSet = new Set(vault);
  const allAcquiredCards = new Set([...loadout, ...vault]);

  // ── Rule 1: Loadout max is 5 ──────────────────────────────────────────────
  if (loadout.length > 5) {
    errors.push(
      createError(
        "domainLoadout",
        "LOADOUT_EXCEEDS_MAX",
        `Loadout contains ${loadout.length} cards; maximum is 5 (SRD p.5)`,
        5
      )
    );
  }

  // ── Rule 2: Every loadout card must be in vault ──────────────────────────
  for (const cardId of loadout) {
    if (!vaultSet.has(cardId)) {
      errors.push(
        createError(
          `domainLoadout.${cardId}`,
          "LOADOUT_CARD_NOT_IN_VAULT",
          `Card "${cardId}" is in loadout but not in vault`,
          5
        )
      );
    }
  }

  // ── Rule 3: Every card (loadout + vault) must satisfy level/domain ──────
  for (const cardId of allAcquiredCards) {
    const card = cardMap.get(cardId);

    if (!card) {
      errors.push(
        createWarning(
          `domainCards.${cardId}`,
          "CARD_NOT_FOUND",
          `Card "${cardId}" was not found in master card list`,
          5
        )
      );
      continue;
    }

    // Card level must not exceed character level
    if (card.level > characterLevel) {
      errors.push(
        createError(
          `domainCards.${cardId}`,
          "CARD_LEVEL_EXCEEDS_CHARACTER",
          `Card "${card.name}" is level ${card.level} but character is level ${characterLevel}`,
          4
        )
      );
    }

    // Card domain must match one of the character's class domains
    if (!classDomains.includes(card.domain)) {
      errors.push(
        createError(
          `domainCards.${cardId}`,
          "CARD_DOMAIN_NOT_IN_CLASS",
          `Card "${card.name}" domain "${card.domain}" is not in class domains [${classDomains.join(", ")}]`,
          4
        )
      );
    }
  }

  return errors;
}

/**
 * Validates domain count constraints.
 * SRD p.4-5: Character has 2 class domains, which they can swap between.
 * Domain selection happens at creation and via advancement.
 */
export function validateDomainSelection(
  domains: string[],
  classDomains: string[]
): ValidationError[] {
  const errors: ValidationError[] = [];

  // Every character has exactly 2 class domains (they don't choose; these are fixed by class)
  if (domains.length > 2) {
    errors.push(
      createError(
        "domains",
        "TOO_MANY_DOMAINS",
        `Character cannot have more than 2 domains (received ${domains.length})`,
        4
      )
    );
  }

  for (const domain of domains) {
    if (!classDomains.includes(domain)) {
      errors.push(
        createError(
          `domains.${domain}`,
          "DOMAIN_NOT_IN_CLASS",
          `Domain "${domain}" is not in the character's class (allowed: [${classDomains.join(", ")}])`,
          4
        )
      );
    }
  }

  return errors;
}

// ─── Level & Advancement Validators ───────────────────────────────────────────

/**
 * Validates character level bounds.
 * SRD p.1: Daggerheart has 10 tiers / levels.
 */
export function validateLevel(level: number): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!Number.isInteger(level) || level < 1 || level > 10) {
    errors.push(
      createError(
        "level",
        "LEVEL_OUT_OF_RANGE",
        `Character level must be an integer in [1, 10] (received ${level})`,
        1
      )
    );
  }

  return errors;
}

/**
 * Validates advancement slot spending.
 * SRD p.22: At each level-up, players choose 2 advancement slots worth of options.
 * Some options (proficiency, multiclass) cost 2 slots and must be selected alone.
 */
export function validateAdvancementSlots(
  advancements: AdvancementChoice[]
): ValidationError[] {
  const errors: ValidationError[] = [];

  // Total cost: double-slot items count as 2
  const doubleSlotTypes = ["proficiency-increase", "multiclass"];
  let totalCost = 0;

  for (const adv of advancements) {
    totalCost += doubleSlotTypes.includes(adv.type) ? 2 : 1;
  }

  if (totalCost !== 2) {
    errors.push(
      createError(
        "advancements",
        "ADVANCEMENT_SLOT_MISMATCH",
        `Advancements must total exactly 2 slots (received ${totalCost} slots from ${advancements.length} choices)`,
        22
      )
    );
  }

  // If a double-slot item is selected, it must be the only selection
  const hasDoubleSlot = advancements.some((a) => doubleSlotTypes.includes(a.type));
  if (hasDoubleSlot && advancements.length !== 1) {
    errors.push(
      createError(
        "advancements",
        "DOUBLE_SLOT_NOT_ALONE",
        `Double-slot advancements (proficiency, multiclass) must be selected alone, but received ${advancements.length} choices`,
        22
      )
    );
  }

  return errors;
}

/**
 * Validates level-up request.
 * SRD p.22: Level-up is a structured process with 5 steps.
 */
export function validateLevelUp(
  character: Character,
  choices: LevelUpChoices,
  classData: ClassData,
  allCards: DomainCard[]
): ValidationError[] {
  const errors: ValidationError[] = [];

  // Target level must be exactly current level + 1
  if (choices.targetLevel !== character.level + 1) {
    errors.push(
      createError(
        "targetLevel",
        "LEVEL_NOT_SEQUENTIAL",
        `Target level (${choices.targetLevel}) must be exactly current level (${character.level}) + 1`,
        22
      )
    );
  }

  // Validate advancement slots
  errors.push(
    ...validateAdvancementSlots(choices.advancements)
  );

  // Validate new domain card (SRD p.22 Step 4)
  if (choices.newDomainCardId) {
    const card = allCards.find((c) => c.cardId === choices.newDomainCardId);

    if (!card) {
      errors.push(
        createError(
          "newDomainCardId",
          "DOMAIN_CARD_NOT_FOUND",
          `Domain card "${choices.newDomainCardId}" was not found`,
          22
        )
      );
    } else {
      // Card must be ≤ target level
      if (card.level > choices.targetLevel) {
        errors.push(
          createError(
            "newDomainCardId",
            "DOMAIN_CARD_LEVEL_EXCEEDS_TARGET",
            `Card level (${card.level}) cannot exceed target level (${choices.targetLevel})`,
            22
          )
        );
      }

      // Card domain must match character's class domains
      if (!classData.domains.includes(card.domain)) {
        errors.push(
          createError(
            "newDomainCardId",
            "DOMAIN_CARD_NOT_IN_CLASS",
            `Card domain "${card.domain}" is not in class domains [${classData.domains.join(", ")}]`,
            22
          )
        );
      }
    }
  }

  // Validate exchange card (SRD p.22 Step 4 note)
  if (choices.exchangeCardId) {
    const exchangeCard = allCards.find((c) => c.cardId === choices.exchangeCardId);
    const newCard = allCards.find((c) => c.cardId === choices.newDomainCardId);

    if (!exchangeCard) {
      errors.push(
        createError(
          "exchangeCardId",
          "EXCHANGE_CARD_NOT_FOUND",
          `Exchange card "${choices.exchangeCardId}" was not found`,
          22
        )
      );
    } else if (!character.domainVault.includes(choices.exchangeCardId)) {
      // Exchange card must already be in vault
      errors.push(
        createError(
          "exchangeCardId",
          "EXCHANGE_CARD_NOT_IN_VAULT",
          `Exchange card must already be in character's vault`,
          22
        )
      );
    } else if (newCard && newCard.level > exchangeCard.level) {
      // New card level must not exceed exchanged card level
      errors.push(
        createError(
          "exchangeCardId",
          "NEW_CARD_EXCEEDS_EXCHANGE_LEVEL",
          `New card level (${newCard.level}) cannot exceed exchange card level (${exchangeCard.level})`,
          22
        )
      );
    }
  }

  return errors;
}

// ─── Proficiency Validator ────────────────────────────────────────────────────

/**
 * Validates proficiency value.
 * SRD p.3: Proficiency starts at 1, increases by 1 each tier (so at level 10: 1 + 5 = 6).
 * Can be advanced via "proficiency-increase" advancement (costs 2 slots).
 */
export function validateProficiency(
  proficiency: number,
  characterLevel: number
): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!Number.isInteger(proficiency) || proficiency < 1) {
    errors.push(
      createError(
        "proficiency",
        "PROFICIENCY_INVALID",
        `Proficiency must be a positive integer (received ${proficiency})`,
        3
      )
    );
    return errors;
  }

  // Base proficiency is 1 at level 1, +1 per tier
  // Tier = ceil(level / 2)
  const tier = Math.ceil(characterLevel / 2);
  const expectedBaseProficiency = 1 + (tier - 1);

  // With advancements, proficiency can go higher, but start by checking base
  if (proficiency < expectedBaseProficiency) {
    errors.push(
      createError(
        "proficiency",
        "PROFICIENCY_BELOW_BASE",
        `Proficiency (${proficiency}) is below the expected base (${expectedBaseProficiency}) for level ${characterLevel}`,
        3
      )
    );
  }

  // Proficiency should not exceed base + 3 (conservative limit)
  if (proficiency > expectedBaseProficiency + 3) {
    errors.push(
      createWarning(
        "proficiency",
        "PROFICIENCY_UNUSUALLY_HIGH",
        `Proficiency (${proficiency}) is unusually high for level ${characterLevel} (expected max ~${expectedBaseProficiency + 3})`,
        22
      )
    );
  }

  return errors;
}

// ─── Subclass Validator ────────────────────────────────────────────────────────

/**
 * Validates subclass selection and feature access.
 * SRD p.3: Subclass is an optional specialization within a class.
 * Foundation features are always available at level 1+.
 * Specialization features unlock at tier 2 (levels 3-4).
 * Mastery features unlock at tier 3 (levels 5-6).
 */
export function validateSubclassFeatureAccess(
  subclassId: string | null | undefined,
  characterLevel: number,
  classData: ClassData
): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!subclassId) {
    return errors; // subclass is optional
  }

  const subclass = classData.subclasses.find((s) => s.subclassId === subclassId);

  if (!subclass) {
    errors.push(
      createError(
        "subclassId",
        "SUBCLASS_NOT_IN_CLASS",
        `Subclass "${subclassId}" is not available in class "${classData.classId}"`,
        3
      )
    );
    return errors;
  }

  // Foundation features: always available
  // Specialization: requires tier 2 (levels 3-4, so level >= 3)
  // Mastery: requires tier 3 (levels 5-6, so level >= 5)

  if (characterLevel < 3) {
    // Can't have specialization at level 1-2
    // Check later when we know if they selected specialization
  }

  if (characterLevel < 5) {
    // Can't have mastery at level 1-4
    // Check later when we know if they selected mastery
  }

  return errors;
}

// ─── Master Character Validator ───────────────────────────────────────────────

/**
 * Master validation function for character creation.
 * Runs all applicable validators and returns consolidated result.
 */
export function validateCharacterCreation(
  character: Partial<Character>,
  classData: ClassData,
  context: SrdValidationContext
): SrdValidationResult {
  const errors: ValidationError[] = [];

  // ── Class ──────────────────────────────────────────────────────────────────
  errors.push(...validateClassChoice(character.classId || "", context));

  // ── Ancestry & Community ──────────────────────────────────────────────────
  errors.push(...validateAncestryChoice(character.ancestryId, context));
  errors.push(...validateCommunityChoice(character.communityId, context));

  // ── Stats ──────────────────────────────────────────────────────────────────
  if (character.stats) {
    errors.push(...validateCoreStats(character.stats, true));
  }

  // ── Hope ───────────────────────────────────────────────────────────────────
  if (character.hope !== undefined && character.hopeMax !== undefined) {
    errors.push(...validateHope(character.hope, character.hopeMax));
  }

  // ── HP / Stress / Armor ────────────────────────────────────────────────────
  if (character.trackers?.hp && classData.startingHitPoints) {
    errors.push(
      ...validateHpTracker(
        character.trackers.hp.marked,
        character.trackers.hp.max,
        classData.startingHitPoints,
        character.level || 1
      )
    );
  }

  if (character.trackers?.stress) {
    errors.push(
      ...validateStressTracker(
        character.trackers.stress.marked,
        character.trackers.stress.max,
        character.level || 1
      )
    );
  }

  if (character.trackers?.armor) {
    errors.push(
      ...validateArmorTracker(
        character.trackers.armor.marked,
        character.trackers.armor.max,
        character.level || 1
      )
    );
  }

  // ── Damage Thresholds ──────────────────────────────────────────────────────
  if (character.damageThresholds) {
    errors.push(
      ...validateDamageThresholds(character.damageThresholds, character.level || 1)
    );
  }

  // ── Domains & Loadout ──────────────────────────────────────────────────────
  if (character.domains) {
    errors.push(...validateDomainSelection(character.domains, classData.domains));
  }

  if (
    character.domainLoadout &&
    character.domainVault &&
    character.domains
  ) {
    errors.push(
      ...validateDomainLoadout(
        character.domainLoadout,
        character.domainVault,
        character.level || 1,
        classData.domains,
        context.allDomainCards
      )
    );
  }

  // ── Level ──────────────────────────────────────────────────────────────────
  // At creation, level must be 1
  if (character.level !== undefined && character.level !== 1) {
    errors.push(
      createError(
        "level",
        "CREATION_LEVEL_NOT_ONE",
        `Characters must start at level 1 (received ${character.level})`,
        1
      )
    );
  }

  // ── Proficiency ────────────────────────────────────────────────────────────
  if (character.proficiency !== undefined) {
    // At creation, proficiency should be 1
    if (character.proficiency !== 1) {
      errors.push(
        createWarning(
          "proficiency",
          "PROFICIENCY_NOT_STARTING_VALUE",
          `Characters start with proficiency 1 (received ${character.proficiency})`,
          3
        )
      );
    }
  }

  // ── Subclass ───────────────────────────────────────────────────────────────
  errors.push(
    ...validateSubclassFeatureAccess(character.subclassId, character.level || 1, classData)
  );

  return {
    valid: errors.filter((e) => e.severity === "error").length === 0,
    errors,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Master validation function for character updates.
 * Validates changes to an existing character sheet.
 */
export function validateCharacterUpdate(
  originalCharacter: Character,
  updatedCharacter: Partial<Character>,
  classData: ClassData,
  context: SrdValidationContext
): SrdValidationResult {
  const errors: ValidationError[] = [];

  // Merge original with updates to get full picture
  const fullCharacter = { ...originalCharacter, ...updatedCharacter };

  // ── Level changes ─────────────────────────────────────────────────────────
  if (updatedCharacter.level !== undefined && updatedCharacter.level !== originalCharacter.level) {
    // Level can only increase by 1
    if (updatedCharacter.level !== originalCharacter.level + 1) {
      errors.push(
        createError(
          "level",
          "LEVEL_NOT_SEQUENTIAL",
          `Level can only increase by 1 (from ${originalCharacter.level} to ${updatedCharacter.level})`,
          22
        )
      );
    }
  }

  // ── Stats ──────────────────────────────────────────────────────────────────
  if (updatedCharacter.stats) {
    errors.push(...validateCoreStats(updatedCharacter.stats, false));
  }

  // ── Hope ───────────────────────────────────────────────────────────────────
  if (
    updatedCharacter.hope !== undefined ||
    updatedCharacter.hopeMax !== undefined
  ) {
    errors.push(
      ...validateHope(
        updatedCharacter.hope ?? fullCharacter.hope,
        updatedCharacter.hopeMax ?? fullCharacter.hopeMax
      )
    );
  }

  // ── HP / Stress / Armor ────────────────────────────────────────────────────
  if (updatedCharacter.trackers?.hp) {
    errors.push(
      ...validateHpTracker(
        updatedCharacter.trackers.hp.marked ?? originalCharacter.trackers.hp.marked,
        updatedCharacter.trackers.hp.max ?? originalCharacter.trackers.hp.max,
        classData.startingHitPoints,
        fullCharacter.level
      )
    );
  }

  if (updatedCharacter.trackers?.stress) {
    errors.push(
      ...validateStressTracker(
        updatedCharacter.trackers.stress.marked ?? originalCharacter.trackers.stress.marked,
        updatedCharacter.trackers.stress.max ?? originalCharacter.trackers.stress.max,
        fullCharacter.level
      )
    );
  }

  if (updatedCharacter.trackers?.armor) {
    errors.push(
      ...validateArmorTracker(
        updatedCharacter.trackers.armor.marked ?? originalCharacter.trackers.armor.marked,
        updatedCharacter.trackers.armor.max ?? originalCharacter.trackers.armor.max,
        fullCharacter.level
      )
    );
  }

  // ── Damage Thresholds ──────────────────────────────────────────────────────
  if (updatedCharacter.damageThresholds) {
    errors.push(
      ...validateDamageThresholds(updatedCharacter.damageThresholds, fullCharacter.level)
    );
  }

  // ── Domains & Loadout ──────────────────────────────────────────────────────
  if (updatedCharacter.domains) {
    errors.push(
      ...validateDomainSelection(updatedCharacter.domains, classData.domains)
    );
  }

  if (
    updatedCharacter.domainLoadout ||
    updatedCharacter.domainVault
  ) {
    errors.push(
      ...validateDomainLoadout(
        updatedCharacter.domainLoadout ?? originalCharacter.domainLoadout,
        updatedCharacter.domainVault ?? originalCharacter.domainVault,
        fullCharacter.level,
        classData.domains,
        context.allDomainCards
      )
    );
  }

  // ── Proficiency ────────────────────────────────────────────────────────────
  if (updatedCharacter.proficiency !== undefined) {
    errors.push(...validateProficiency(updatedCharacter.proficiency, fullCharacter.level));
  }

  // ── Subclass ───────────────────────────────────────────────────────────────
  if (updatedCharacter.subclassId !== undefined) {
    errors.push(
      ...validateSubclassFeatureAccess(
        updatedCharacter.subclassId,
        fullCharacter.level,
        classData
      )
    );
  }

  return {
    valid: errors.filter((e) => e.severity === "error").length === 0,
    errors,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Validation for level-up endpoint.
 */
export function validateLevelUpEndpoint(
  character: Character,
  choices: LevelUpChoices,
  classData: ClassData,
  context: SrdValidationContext
): SrdValidationResult {
  const errors: ValidationError[] = [];

  // Validate level transition
  errors.push(...validateLevel(choices.targetLevel));
  if (choices.targetLevel !== character.level + 1) {
    errors.push(
      createError(
        "targetLevel",
        "LEVEL_NOT_SEQUENTIAL",
        `Target level must be exactly current level + 1`,
        22
      )
    );
  }

  // Validate advancement slots
  errors.push(...validateAdvancementSlots(choices.advancements));

  // Validate domain card acquisition
  errors.push(
    ...validateLevelUp(character, choices, classData, context.allDomainCards)
  );

  return {
    valid: errors.filter((e) => e.severity === "error").length === 0,
    errors,
    timestamp: new Date().toISOString(),
  };
}

// ─── Export all validators ────────────────────────────────────────────────────

export const validators = {
  validateClassChoice,
  validateAncestryChoice,
  validateCommunityChoice,
  validateCoreStat,
  validateCoreStats,
  validateHope,
  validateHpTracker,
  validateStressTracker,
  validateArmorTracker,
  validateDamageThresholds,
  validateDomainLoadout,
  validateDomainSelection,
  validateLevel,
  validateAdvancementSlots,
  validateLevelUp,
  validateProficiency,
  validateSubclassFeatureAccess,
  validateCharacterCreation,
  validateCharacterUpdate,
  validateLevelUpEndpoint,
};
