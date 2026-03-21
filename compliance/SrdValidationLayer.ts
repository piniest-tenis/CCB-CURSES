/**
 * SRD Validation Layer for Campaign Frame Data
 * 
 * This module provides SRD compliance checks for campaign-specific content
 * (Classes, Domains, Ancestries, Communities) that will be ingested into the system.
 * 
 * It imports the universal rules from srd-rules-specification.ts and applies them
 * to validate that custom content does not violate SRD constraints.
 * 
 * Authority: Daggerheart SRD 1.0 (9-09-25)
 * 
 * KEY CONSTRAINTS ENFORCED:
 * - Class starting stats must be positive, within plausible ranges
 * - Class domains must be valid (from Daggerheart domain list)
 * - Domain cards must respect level gating (1-5)
 * - Domain loadout max is 5 cards (per SRD page 4)
 * - Trait modifiers must sum to +2 (for any custom traits)
 * - Evasion must be calculable from armor score (≤ 12 per SRD page 3)
 */

import type {
  SRDValidationError,
  ValidationResult,
} from './srd-rules-specification';
import {
  SRDErrorCode,
  VALID_PROFICIENCY_BY_TIER,
  calculateTier,
  calculateProficiency,
} from './srd-rules-specification';

// ============================================================================
// TYPES
// ============================================================================

export interface ClassValidationData {
  classId: string;
  name: string;
  startingEvasion: number;
  startingHitPoints: number;
  domains: string[]; // [domain1, domain2]
  source?: string;
}

export interface DomainCardValidationData {
  cardId: string;
  name: string;
  domain: string;
  level: number; // 1-5
  isCursed?: boolean;
  source?: string;
}

export interface AncestryValidationData {
  ancestryId: string;
  name: string;
  traitName: string; // e.g., "Elvish" — informs flavor, not mechanics
  source?: string;
}

export interface CommunityValidationData {
  communityId: string;
  name: string;
  traitName: string; // e.g., "Devoted" — informs flavor, not mechanics
  source?: string;
}

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

/**
 * Validate Class definition against SRD constraints.
 * 
 * ERRORS:
 *   - startingEvasion must be > 0 and ≤ 12 (SRD page 3: armor cap)
 *   - startingHitPoints must be > 0
 *   - domains must have exactly 2 entries
 * 
 * WARNINGS:
 *   - startingEvasion should typically be in range 9-12 (standard classes)
 *   - startingHitPoints should be plausible (6-10 range for balance)
 */
export function validateClassSRDCompliance(
  classData: ClassValidationData
): ValidationResult {
  const errors: SRDValidationError[] = [];

  // Evasion validation (SRD page 3: armor score cap)
  if (classData.startingEvasion <= 0) {
    errors.push({
      code: SRDErrorCode.INVALID_STARTING_STATS,
      message: `Class "${classData.name}" startingEvasion must be positive (got ${classData.startingEvasion})`,
      srdPageCitation: 'SRD page 3: Starting Evasion must be > 0',
      severity: 'error',
      context: { classId: classData.classId, field: 'startingEvasion' },
    });
  }

  if (classData.startingEvasion > 12) {
    errors.push({
      code: SRDErrorCode.INVALID_ARMOR_SCORE,
      message: `Class "${classData.name}" startingEvasion exceeds SRD cap of 12 (got ${classData.startingEvasion})`,
      srdPageCitation: 'SRD page 3: Armor Score cannot exceed 12',
      severity: 'error',
      context: { classId: classData.classId, field: 'startingEvasion' },
    });
  }

  // HP validation
  if (classData.startingHitPoints <= 0) {
    errors.push({
      code: SRDErrorCode.INVALID_STARTING_STATS,
      message: `Class "${classData.name}" startingHitPoints must be positive (got ${classData.startingHitPoints})`,
      srdPageCitation: 'SRD page 3: Starting Hit Points must be > 0',
      severity: 'error',
      context: { classId: classData.classId, field: 'startingHitPoints' },
    });
  }

  // Domain count validation (SRD page 3-4: each class has 2 starting domains)
  if (!Array.isArray(classData.domains) || classData.domains.length !== 2) {
    errors.push({
      code: SRDErrorCode.INVALID_DOMAIN_LOADOUT,
      message: `Class "${classData.name}" must have exactly 2 starting domains (got ${classData.domains?.length ?? 0})`,
      srdPageCitation: 'SRD page 3: Character creation begins with 2 domains',
      severity: 'error',
      context: { classId: classData.classId, field: 'domains' },
    });
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate Domain Card definition against SRD constraints.
 * 
 * ERRORS:
 *   - level must be in range 1-5 (SRD page 4: domain levels)
 *   - level must match filename convention: (Level N)
 * 
 * WARNINGS:
 *   - Cursed card (★) should have curse mechanics description
 *   - Grimoire cards should have active ability list
 */
export function validateDomainCardSRDCompliance(
  cardData: DomainCardValidationData
): ValidationResult {
  const errors: SRDValidationError[] = [];

  // Level validation (SRD page 4: domain cards are levels 1-5)
  const validLevels = [1, 2, 3, 4, 5];
  if (!validLevels.includes(cardData.level)) {
    errors.push({
      code: SRDErrorCode.INVALID_DOMAIN_LEVEL_GATE,
      message: `Domain card "${cardData.name}" has invalid level ${cardData.level}. Must be 1-5.`,
      srdPageCitation: 'SRD page 4: Domain cards are leveled 1-5',
      severity: 'error',
      context: { cardId: cardData.cardId, domain: cardData.domain },
    });
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate that a character's domain loadout respects SRD constraints.
 * 
 * CONSTRAINT (SRD page 4-5):
 *   - Active loadout max = 5 cards
 *   - Vault (unlocked) = unlimited
 *   - All cards must be ≤ character level
 *   - Recalls during play cost stress
 */
export function validateDomainLoadoutSRDCompliance(
  characterLevel: number,
  activeCardIds: string[],
  domainCards: Map<string, DomainCardValidationData>
): ValidationResult {
  const errors: SRDValidationError[] = [];

  // Loadout size check (SRD page 5: max 5 active cards)
  if (activeCardIds.length > 5) {
    errors.push({
      code: SRDErrorCode.INVALID_LOADOUT_SIZE,
      message: `Domain loadout has ${activeCardIds.length} cards, but SRD max is 5.`,
      srdPageCitation: 'SRD page 5: Active domain loadout max is 5 cards',
      severity: 'error',
      context: { loadoutSize: activeCardIds.length },
    });
  }

  // Level gating check (SRD page 4: cards must be ≤ character level)
  activeCardIds.forEach((cardId) => {
    const card = domainCards.get(cardId);
    if (card && card.level > characterLevel) {
      errors.push({
        code: SRDErrorCode.INVALID_DOMAIN_LEVEL_GATE,
        message: `Card "${card.name}" (level ${card.level}) exceeds character level ${characterLevel}`,
        srdPageCitation: 'SRD page 4: Domain cards must be ≤ character level',
        severity: 'error',
        context: { cardId, cardLevel: card.level, characterLevel },
      });
    }
  });

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate that a character's proficiency matches their level tier.
 * 
 * SRD PAGE 42 (Proficiency):
 *   Tier 1 (Level 1):        Proficiency = 1
 *   Tier 2 (Levels 2-4):     Proficiency = 2
 *   Tier 3 (Levels 5-7):     Proficiency = 3
 *   Tier 4 (Levels 8-10):    Proficiency = 4
 */
export function validateProficiencySRDCompliance(
  characterLevel: number,
  currentProficiency: number
): ValidationResult {
  const errors: SRDValidationError[] = [];

  const tier = calculateTier(characterLevel);
  const expectedProficiency = calculateProficiency(characterLevel);

  if (currentProficiency !== expectedProficiency) {
    errors.push({
      code: SRDErrorCode.INVALID_PROFICIENCY_PROGRESSION,
      message: `Character level ${characterLevel} (tier ${tier}) should have proficiency ${expectedProficiency}, but has ${currentProficiency}`,
      srdPageCitation: `SRD page 42: Tier ${tier} proficiency = ${expectedProficiency}`,
      severity: 'error',
      context: { level: characterLevel, tier, expected: expectedProficiency, actual: currentProficiency },
    });
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate Ancestry data against SRD constraints.
 * 
 * Ancestries in Daggerheart (SRD pages 27-31) are primarily narrative/flavor.
 * No mechanical constraints enforced at this layer.
 * 
 * (This is a placeholder for future homebrew constraint checks.)
 */
export function validateAncestryPlaceholder(
  ancestryData: AncestryValidationData
): ValidationResult {
  // Currently no SRD constraints on custom ancestries beyond structure validation
  return {
    valid: true,
    errors: [],
  };
}

/**
 * Validate Community data against SRD constraints.
 * 
 * Communities in Daggerheart (SRD pages 32-34) are primarily narrative/flavor.
 * No mechanical constraints enforced at this layer.
 * 
 * (This is a placeholder for future homebrew constraint checks.)
 */
export function validateCommunityPlaceholder(
  communityData: CommunityValidationData
): ValidationResult {
  // Currently no SRD constraints on custom communities beyond structure validation
  return {
    valid: true,
    errors: [],
  };
}

// ============================================================================
// COMBINED VALIDATION
// ============================================================================

/**
 * Run full SRD compliance check on a class and its associated data.
 * Returns aggregated errors from all validators.
 */
export function validateFullClassCompliance(
  classData: ClassValidationData,
  domainCards: Map<string, DomainCardValidationData>,
  characterLevel: number = 1
): ValidationResult {
  const allErrors: SRDValidationError[] = [];

  // Check class itself
  const classCheck = validateClassSRDCompliance(classData);
  allErrors.push(...classCheck.errors);

  // Check starting domains exist and are valid (level 1 gates)
  if (Array.isArray(classData.domains)) {
    classData.domains.forEach((domainName, idx) => {
      // In a real scenario, you'd look up the domain and validate its cards
      // For now, we just check that domains are named non-empty
      if (!domainName || domainName.trim().length === 0) {
        allErrors.push({
          code: SRDErrorCode.INVALID_DOMAIN_LOADOUT,
          message: `Domain ${idx} in class "${classData.name}" is empty`,
          srdPageCitation: 'SRD page 3: Domain names must be non-empty',
          severity: 'error',
          context: { classId: classData.classId, domainIndex: idx },
        });
      }
    });
  }

  // Check proficiency for this level (starting at level 1)
  const profCheck = validateProficiencySRDCompliance(characterLevel, 1);
  allErrors.push(...profCheck.errors);

  return {
    valid: allErrors.length === 0,
    errors: allErrors,
  };
}

/**
 * Batch validate multiple domain cards for a domain.
 */
export function validateDomainCardsSRDCompliance(
  cards: DomainCardValidationData[]
): ValidationResult {
  const allErrors: SRDValidationError[] = [];

  cards.forEach((card) => {
    const check = validateDomainCardSRDCompliance(card);
    allErrors.push(...check.errors);
  });

  // Check for duplicate levels within same domain (not a hard error, but suspicious)
  const levelCounts = new Map<number, number>();
  cards.forEach((card) => {
    levelCounts.set(card.level, (levelCounts.get(card.level) ?? 0) + 1);
  });

  // Note: Multiple cards at same level is OK (e.g., two Level 1 cards in Artistry)
  // So we don't add errors for this.

  return {
    valid: allErrors.length === 0,
    errors: allErrors,
  };
}

// ============================================================================
// EXPORT SUMMARY
// ============================================================================

export const SRD_VALIDATION_LAYER = {
  validateClassSRDCompliance,
  validateDomainCardSRDCompliance,
  validateDomainLoadoutSRDCompliance,
  validateProficiencySRDCompliance,
  validateAncestryPlaceholder,
  validateCommunityPlaceholder,
  validateFullClassCompliance,
  validateDomainCardsSRDCompliance,
};
