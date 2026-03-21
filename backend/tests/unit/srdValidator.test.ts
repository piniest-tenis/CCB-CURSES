// backend/tests/unit/srdValidator.test.ts
//
// Comprehensive unit tests for SRD compliance validation.
//
// Test coverage:
// 1. Campaign frame constraints (classes, domains, ancestries, communities)
// 2. Core stat bounds validation
// 3. Hope, HP, Stress, Armor validation
// 4. Damage threshold calculation validation
// 5. Domain loadout and vault rules
// 6. Level and proficiency validation
// 7. Advancement slot spending
// 8. Level-up mechanics
// 9. Character creation and update flows

import { describe, it, expect } from "@jest/globals";

import {
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
  validateProficiency,
  validateSubclassFeatureAccess,
  validateCharacterCreation,
  validateCharacterUpdate,
  validateLevelUpEndpoint,
  type SrdValidationContext,
} from "../../src/compliance/srdValidator";

import {
  fixtures,
  mockWarriorClass,
  mockWizardClass,
  mockCombatCards,
  mockArcaneCards,
} from "../fixtures/srdValidationFixtures";

// ─── Setup ────────────────────────────────────────────────────────────────────

const mockContext: SrdValidationContext = {
  character: fixtures.valid.createValidCharacter(1),
  classData: mockWarriorClass,
  allDomainCards: [...mockCombatCards, ...mockArcaneCards],
  allowedClasses: new Map([
    ["warrior", mockWarriorClass],
    ["wizard", mockWizardClass],
  ]),
  allowedDomainIds: new Set([
    "combat",
    "leadership",
    "arcane",
    "knowledge",
  ]),
  allowedAncestryIds: new Set(["human", "elf", "dwarf"]),
  allowedCommunityIds: new Set(["city", "wilderness", "nomadic"]),
};

// ─── Campaign Frame Tests ─────────────────────────────────────────────────────

describe("Campaign Frame Validators", () => {
  describe("validateClassChoice", () => {
    it("should accept a valid class", () => {
      const errors = validateClassChoice("warrior", mockContext);
      expect(errors).toHaveLength(0);
    });

    it("should reject an unknown class", () => {
      const errors = validateClassChoice("necromancer", mockContext);
      expect(errors).toHaveLength(1);
      expect(errors[0].rule).toBe("CLASS_NOT_IN_CAMPAIGN");
    });

    it("should reject an empty class", () => {
      const errors = validateClassChoice("", mockContext);
      expect(errors).toHaveLength(1);
      expect(errors[0].rule).toBe("CLASS_REQUIRED");
    });
  });

  describe("validateAncestryChoice", () => {
    it("should accept a valid ancestry", () => {
      const errors = validateAncestryChoice("human", mockContext);
      expect(errors).toHaveLength(0);
    });

    it("should reject an unknown ancestry", () => {
      const errors = validateAncestryChoice("dragon", mockContext);
      expect(errors).toHaveLength(1);
      expect(errors[0].rule).toBe("ANCESTRY_NOT_IN_CAMPAIGN");
    });

    it("should allow null/undefined ancestry", () => {
      const errors1 = validateAncestryChoice(null, mockContext);
      const errors2 = validateAncestryChoice(undefined, mockContext);
      expect(errors1).toHaveLength(0);
      expect(errors2).toHaveLength(0);
    });
  });

  describe("validateCommunityChoice", () => {
    it("should accept a valid community", () => {
      const errors = validateCommunityChoice("city", mockContext);
      expect(errors).toHaveLength(0);
    });

    it("should reject an unknown community", () => {
      const errors = validateCommunityChoice("underwater", mockContext);
      expect(errors).toHaveLength(1);
      expect(errors[0].rule).toBe("COMMUNITY_NOT_IN_CAMPAIGN");
    });

    it("should allow null/undefined community", () => {
      const errors1 = validateCommunityChoice(null, mockContext);
      const errors2 = validateCommunityChoice(undefined, mockContext);
      expect(errors1).toHaveLength(0);
      expect(errors2).toHaveLength(0);
    });
  });
});

// ─── Core Stat Tests ──────────────────────────────────────────────────────────

describe("Core Stat Validators", () => {
  describe("validateCoreStat", () => {
    it("should accept valid stats at creation (0-5)", () => {
      for (let i = 0; i <= 5; i++) {
        const errors = validateCoreStat("strength", i, true);
        expect(errors).toHaveLength(0);
      }
    });

    it("should reject stats above 5 at creation", () => {
      const errors = validateCoreStat("strength", 6, true);
      expect(errors).toHaveLength(1);
      expect(errors[0].rule).toBe("STAT_EXCEEDS_CREATION_MAX");
    });

    it("should accept valid stats during play (0-8)", () => {
      for (let i = 0; i <= 8; i++) {
        const errors = validateCoreStat("strength", i, false);
        expect(errors).toHaveLength(0);
      }
    });

    it("should reject stats above 8 during play", () => {
      const errors = validateCoreStat("strength", 9, false);
      expect(errors).toHaveLength(1);
      expect(errors[0].rule).toBe("STAT_EXCEEDS_MAX");
    });

    it("should reject negative stats", () => {
      const errors = validateCoreStat("strength", -1, false);
      expect(errors).toHaveLength(1);
      expect(errors[0].rule).toBe("STAT_NEGATIVE");
    });

    it("should reject non-integer stats", () => {
      const errors = validateCoreStat("strength", 2.5, false);
      expect(errors).toHaveLength(1);
      expect(errors[0].rule).toBe("STAT_NOT_INTEGER");
    });
  });

  describe("validateCoreStats", () => {
    it("should accept all valid stats at creation", () => {
      const errors = validateCoreStats({
        agility: 3,
        strength: 4,
        finesse: 2,
        instinct: 3,
        presence: 2,
        knowledge: 1,
      }, true);
      expect(errors).toHaveLength(0);
    });

    it("should reject if any stat is invalid", () => {
      const errors = validateCoreStats({
        agility: 3,
        strength: 6, // invalid at creation
        finesse: 2,
        instinct: 3,
        presence: 2,
        knowledge: 1,
      }, true);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].rule).toBe("STAT_EXCEEDS_CREATION_MAX");
    });
  });
});

// ─── Hope Tests ────────────────────────────────────────────────────────────────

describe("Hope Validator", () => {
  it("should accept valid hope values (0-6)", () => {
    for (let i = 0; i <= 6; i++) {
      const errors = validateHope(i, 6);
      expect(errors).toHaveLength(0);
    }
  });

  it("should reject hope exceeding hopeMax", () => {
    const errors = validateHope(7, 6);
    expect(errors).toHaveLength(1);
    expect(errors[0].rule).toBe("HOPE_EXCEEDS_MAX");
  });

  it("should reject negative hope", () => {
    const errors = validateHope(-1, 6);
    expect(errors).toHaveLength(1);
    expect(errors[0].rule).toBe("HOPE_NEGATIVE");
  });

  it("should reject hopeMax above 6", () => {
    const errors = validateHope(5, 7);
    expect(errors).toHaveLength(1);
    expect(errors[0].rule).toBe("HOPE_MAX_EXCEEDS_BASE");
  });
});

// ─── Tracker Tests ─────────────────────────────────────────────────────────────

describe("HP Tracker Validator", () => {
  it("should accept valid HP at level 1", () => {
    const errors = validateHpTracker(0, 8, 8, 1);
    expect(errors).toHaveLength(0);
  });

  it("should accept valid HP at level 10", () => {
    const errors = validateHpTracker(0, 20, 8, 10);
    expect(errors).toHaveLength(0);
  });

  it("should reject HP below class base", () => {
    const errors = validateHpTracker(0, 7, 8, 1);
    expect(errors).toHaveLength(1);
    expect(errors[0].rule).toBe("HP_BELOW_CLASS_BASE");
  });

  it("should reject marked HP exceeding max", () => {
    const errors = validateHpTracker(10, 9, 8, 1);
    expect(errors).toHaveLength(1);
    expect(errors[0].rule).toBe("HP_MARKED_EXCEEDS_MAX");
  });
});

describe("Stress Tracker Validator", () => {
  it("should accept valid stress at level 1 (5)", () => {
    const errors = validateStressTracker(0, 5, 1);
    expect(errors).toHaveLength(0);
  });

  it("should accept valid stress at level 3 (6)", () => {
    const errors = validateStressTracker(0, 6, 3);
    expect(errors).toHaveLength(0);
  });

  it("should accept valid stress at level 10 (10)", () => {
    const errors = validateStressTracker(0, 10, 10);
    expect(errors).toHaveLength(0);
  });

  it("should reject stress below level base", () => {
    const errors = validateStressTracker(0, 4, 3); // Should be at least 6
    expect(errors).toHaveLength(1);
    expect(errors[0].rule).toBe("STRESS_BELOW_LEVEL_BASE");
  });

  it("should reject marked stress exceeding max", () => {
    const errors = validateStressTracker(10, 9, 5);
    expect(errors).toHaveLength(1);
    expect(errors[0].rule).toBe("STRESS_MARKED_EXCEEDS_MAX");
  });
});

describe("Armor Tracker Validator", () => {
  it("should accept valid armor (10-13 typical)", () => {
    const errors = validateArmorTracker(0, 12, 5);
    expect(errors).toHaveLength(0);
  });

  it("should reject armor below base (10)", () => {
    const errors = validateArmorTracker(0, 9, 5);
    expect(errors).toHaveLength(1);
    expect(errors[0].rule).toBe("ARMOR_BELOW_BASE");
  });

  it("should warn for unusually high armor", () => {
    const errors = validateArmorTracker(0, 20, 5);
    expect(errors).toHaveLength(1);
    expect(errors[0].severity).toBe("warning");
  });

  it("should reject marked armor exceeding max", () => {
    const errors = validateArmorTracker(10, 9, 5);
    expect(errors.length).toBeGreaterThanOrEqual(1);
    expect(errors.some(e => e.rule === "ARMOR_MARKED_EXCEEDS_MAX")).toBe(true);
  });
});

// ─── Damage Threshold Tests ───────────────────────────────────────────────────

describe("Damage Threshold Validator", () => {
  it("should accept valid thresholds at level 1", () => {
    const errors = validateDamageThresholds({ major: 11, severe: 16 }, 1);
    expect(errors).toHaveLength(0);
  });

  it("should accept valid thresholds at level 10", () => {
    const errors = validateDamageThresholds({ major: 20, severe: 25 }, 10);
    expect(errors).toHaveLength(0);
  });

  it("should reject invalid major threshold", () => {
    const errors = validateDamageThresholds({ major: 10, severe: 16 }, 1);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.rule === "MAJOR_THRESHOLD_MISMATCH")).toBe(true);
  });

  it("should reject non-integer thresholds", () => {
    const errors = validateDamageThresholds({ major: 11.5, severe: 16 }, 1);
    expect(errors.length).toBeGreaterThanOrEqual(1);
    expect(errors.some(e => e.rule === "MAJOR_NOT_INTEGER")).toBe(true);
  });
});

// ─── Domain Tests ──────────────────────────────────────────────────────────────

describe("Domain Loadout Validator", () => {
  it("should accept valid loadout with 2 cards", () => {
    const errors = validateDomainLoadout(
      ["combat-1-slash", "combat-1-defend"],
      ["combat-1-slash", "combat-1-defend", "combat-2-power-strike"],
      2,
      ["combat", "leadership"],
      mockCombatCards
    );
    expect(errors).toHaveLength(0);
  });

  it("should accept valid loadout at max (5 cards)", () => {
    const loadout = Array.from({ length: 5 }, (_, i) =>
      mockCombatCards[i % mockCombatCards.length]?.cardId
    ).filter(Boolean) as string[];

    const errors = validateDomainLoadout(
      loadout,
      loadout,
      5,
      ["combat", "leadership"],
      mockCombatCards
    );
    expect(errors.filter((e) => e.rule === "LOADOUT_EXCEEDS_MAX")).toHaveLength(0);
  });

  it("should reject loadout exceeding 5 cards", () => {
    const errors = validateDomainLoadout(
      Array(6).fill("dummy-card"),
      Array(6).fill("dummy-card"),
      5,
      ["combat", "leadership"],
      mockCombatCards
    );
    expect(errors.some((e) => e.rule === "LOADOUT_EXCEEDS_MAX")).toBe(true);
  });

  it("should reject loadout card not in vault", () => {
    const errors = validateDomainLoadout(
      ["combat-1-slash"],
      ["combat-2-power-strike"], // slash not in vault
      1,
      ["combat", "leadership"],
      mockCombatCards
    );
    expect(errors.some((e) => e.rule === "LOADOUT_CARD_NOT_IN_VAULT")).toBe(true);
  });

  it("should reject card level exceeding character level", () => {
    const errors = validateDomainLoadout(
      ["combat-2-power-strike"],
      ["combat-2-power-strike"],
      1, // level 1, but card is level 2
      ["combat", "leadership"],
      mockCombatCards
    );
    expect(errors.some((e) => e.rule === "CARD_LEVEL_EXCEEDS_CHARACTER")).toBe(true);
  });

  it("should reject card domain not in class", () => {
    const errors = validateDomainLoadout(
      ["arcane-1-cantrip"],
      ["arcane-1-cantrip"],
      1,
      ["combat", "leadership"], // wizard domains, not arcane
      mockArcaneCards
    );
    expect(errors.some((e) => e.rule === "CARD_DOMAIN_NOT_IN_CLASS")).toBe(true);
  });
});

describe("Domain Selection Validator", () => {
  it("should accept valid domain selection (2 domains)", () => {
    const errors = validateDomainSelection(["combat", "leadership"], [
      "combat",
      "leadership",
    ]);
    expect(errors).toHaveLength(0);
  });

  it("should reject more than 2 domains", () => {
    const errors = validateDomainSelection(
      ["combat", "leadership", "arcane"],
      ["combat", "leadership"]
    );
    expect(errors.length).toBeGreaterThanOrEqual(1);
    expect(errors.some(e => e.rule === "TOO_MANY_DOMAINS")).toBe(true);
  });

  it("should reject domain not in class", () => {
    const errors = validateDomainSelection(["combat", "arcane"], [
      "combat",
      "leadership",
    ]);
    expect(errors).toHaveLength(1);
    expect(errors[0].rule).toBe("DOMAIN_NOT_IN_CLASS");
  });
});

// ─── Level & Proficiency Tests ─────────────────────────────────────────────────

describe("Level Validator", () => {
  it("should accept valid levels (1-10)", () => {
    for (let i = 1; i <= 10; i++) {
      const errors = validateLevel(i);
      expect(errors).toHaveLength(0);
    }
  });

  it("should reject level 0", () => {
    const errors = validateLevel(0);
    expect(errors).toHaveLength(1);
    expect(errors[0].rule).toBe("LEVEL_OUT_OF_RANGE");
  });

  it("should reject level 11", () => {
    const errors = validateLevel(11);
    expect(errors).toHaveLength(1);
    expect(errors[0].rule).toBe("LEVEL_OUT_OF_RANGE");
  });

  it("should reject non-integer levels", () => {
    const errors = validateLevel(5.5);
    expect(errors).toHaveLength(1);
    expect(errors[0].rule).toBe("LEVEL_OUT_OF_RANGE");
  });
});

describe("Proficiency Validator", () => {
  it("should accept valid proficiency at level 1 (base 1)", () => {
    const errors = validateProficiency(1, 1);
    expect(errors).toHaveLength(0);
  });

  it("should accept valid proficiency at level 5 (base 3)", () => {
    const errors = validateProficiency(3, 5);
    expect(errors).toHaveLength(0);
  });

  it("should accept valid proficiency at level 10 (base 6)", () => {
    const errors = validateProficiency(6, 10);
    expect(errors).toHaveLength(0);
  });

  it("should reject proficiency below base", () => {
    const errors = validateProficiency(1, 5); // Should be at least 3
    expect(errors).toHaveLength(1);
    expect(errors[0].rule).toBe("PROFICIENCY_BELOW_BASE");
  });

  it("should reject proficiency 0", () => {
    const errors = validateProficiency(0, 1);
    expect(errors).toHaveLength(1);
    expect(errors[0].rule).toBe("PROFICIENCY_INVALID");
  });
});

// ─── Advancement Tests ─────────────────────────────────────────────────────────

describe("Advancement Slot Validator", () => {
  it("should accept two single-slot advancements", () => {
    const errors = validateAdvancementSlots([
      fixtures.valid.createValidTraitBonusAdvancement(),
      fixtures.valid.createValidHpAdvancement(),
    ]);
    expect(errors).toHaveLength(0);
  });

  it("should accept one double-slot advancement", () => {
    const errors = validateAdvancementSlots([
      fixtures.valid.createValidProficiencyAdvancement(),
    ]);
    expect(errors).toHaveLength(0);
  });

  it("should reject three single-slot advancements", () => {
    const errors = validateAdvancementSlots([
      fixtures.valid.createValidTraitBonusAdvancement(),
      fixtures.valid.createValidHpAdvancement(),
      fixtures.valid.createValidStressAdvancement(),
    ]);
    expect(errors).toHaveLength(1);
    expect(errors[0].rule).toBe("ADVANCEMENT_SLOT_MISMATCH");
  });

  it("should reject one single-slot advancement", () => {
    const errors = validateAdvancementSlots([
      fixtures.valid.createValidTraitBonusAdvancement(),
    ]);
    expect(errors).toHaveLength(1);
    expect(errors[0].rule).toBe("ADVANCEMENT_SLOT_MISMATCH");
  });

  it("should reject double-slot with another advancement", () => {
    const errors = validateAdvancementSlots([
      fixtures.valid.createValidProficiencyAdvancement(),
      fixtures.valid.createValidTraitBonusAdvancement(),
    ]);
    expect(errors.length).toBeGreaterThanOrEqual(1);
    expect(errors.some(e => e.rule === "DOUBLE_SLOT_NOT_ALONE")).toBe(true);
  });
});

// ─── Character Creation Tests ──────────────────────────────────────────────────

describe("Character Creation Validator", () => {
  it("should accept a valid level 1 character", () => {
    const character = fixtures.valid.createValidCharacter(1);
    const result = validateCharacterCreation(character, mockWarriorClass, mockContext);
    expect(result.valid).toBe(true);
  });

  it("should reject creation above level 1", () => {
    const character = fixtures.valid.createValidCharacter(2);
    const result = validateCharacterCreation(character, mockWarriorClass, mockContext);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.rule === "CREATION_LEVEL_NOT_ONE")).toBe(true);
  });

  it("should reject invalid stats at creation", () => {
    const character = fixtures.invalid.createInvalidCharacterStatTooHigh();
    const result = validateCharacterCreation(character, mockWarriorClass, mockContext);
    expect(result.valid).toBe(false);
  });

  it("should reject invalid class", () => {
    const character = fixtures.valid.createValidCharacter(1, { classId: "unknown" });
    const result = validateCharacterCreation(character, mockWarriorClass, mockContext);
    expect(result.valid).toBe(false);
  });
});

// ─── Character Update Tests ────────────────────────────────────────────────────

describe("Character Update Validator", () => {
  it("should accept valid stat update", () => {
    const original = fixtures.valid.createValidCharacter(5);
    const updated = { stats: { ...original.stats, strength: 6 } };
    const result = validateCharacterUpdate(original, updated, mockWarriorClass, mockContext);
    expect(result.valid).toBe(true);
  });

  it("should reject level change that isn't +1", () => {
    const original = fixtures.valid.createValidCharacter(5);
    const updated = { level: 7 };
    const result = validateCharacterUpdate(original, updated, mockWarriorClass, mockContext);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.rule === "LEVEL_NOT_SEQUENTIAL")).toBe(true);
  });

  it("should allow level increase of exactly +1", () => {
    const original = fixtures.valid.createValidCharacter(5);
    const updated = { level: 6 };
    const result = validateCharacterUpdate(original, updated, mockWarriorClass, mockContext);
    // May have other errors, but not LEVEL_NOT_SEQUENTIAL
    expect(result.errors.some((e) => e.rule === "LEVEL_NOT_SEQUENTIAL")).toBe(false);
  });
});

// ─── Level-Up Tests ───────────────────────────────────────────────────────────

describe("Level-Up Validator", () => {
  it("should accept valid level-up", () => {
    const character = fixtures.valid.createValidCharacter(1);
    const choices = fixtures.valid.createValidLevelUp(character, 2);
    const result = validateLevelUpEndpoint(character, choices, mockWarriorClass, mockContext);
    expect(result.valid).toBe(true);
  });

  it("should reject non-sequential level", () => {
    const character = fixtures.valid.createValidCharacter(5);
    const choices = fixtures.valid.createValidLevelUp(character, 8);
    const result = validateLevelUpEndpoint(character, choices, mockWarriorClass, mockContext);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.rule === "LEVEL_NOT_SEQUENTIAL")).toBe(true);
  });

  it("should reject invalid advancement slots", () => {
    const character = fixtures.valid.createValidCharacter(1);
    const choices = {
      ...fixtures.valid.createValidLevelUp(character, 2),
      advancements: fixtures.invalid.createInvalidAdvancementTooManySlots(),
    };
    const result = validateLevelUpEndpoint(character, choices, mockWarriorClass, mockContext);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.rule === "ADVANCEMENT_SLOT_MISMATCH")).toBe(true);
  });
});
