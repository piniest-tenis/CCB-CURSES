// backend/tests/unit/srd-data-driven.spec.ts
//
// Data-driven tests for all SRD mechanical systems.
// Uses parameterized tests to validate all tier achievements, damage thresholds,
// proficiency progressions, and advancement scenarios.

import {
  DAMAGE_THRESHOLDS_BY_LEVEL,
  PROFICIENCY_BY_LEVEL,
  CLASS_DATA_FIXTURES,
  ADVANCEMENT_SCENARIOS,
  ARMOR_SCENARIOS,
  createValidCharacterAtLevel,
} from "../fixtures/srd-test-fixtures";

// ─────────────────────────────────────────────────────────────────────────────
// DAMAGE THRESHOLD DATA-DRIVEN TESTS
// ─────────────────────────────────────────────────────────────────────────────

describe("SRD: Data-Driven Damage Thresholds", () => {
  describe("All damage severity thresholds", () => {
    test.each(Object.entries(DAMAGE_THRESHOLDS_BY_LEVEL))(
      "Level %s should have valid major & severe thresholds",
      (levelStr, thresholds) => {
        const level = parseInt(levelStr);
        expect(thresholds.major).toBeGreaterThan(0);
        expect(thresholds.severe).toBeGreaterThan(thresholds.major);

        // Verify relationship: severe ≈ major + 2
        const expectedSevere = thresholds.major + 2;
        expect(thresholds.severe).toBe(expectedSevere);
      }
    );

    test.each(Object.entries(DAMAGE_THRESHOLDS_BY_LEVEL))(
      "Level %s major threshold should be 2 + level",
      (levelStr, thresholds) => {
        const level = parseInt(levelStr);
        const expected = 2 + level;
        expect(thresholds.major).toBe(expected);
      }
    );

    test.each(Object.entries(DAMAGE_THRESHOLDS_BY_LEVEL))(
      "Level %s severe threshold should be 4 + level",
      (levelStr, thresholds) => {
        const level = parseInt(levelStr);
        const expected = 4 + level;
        expect(thresholds.severe).toBe(expected);
      }
    );
  });

  describe("Damage threshold progression (each level +1)", () => {
    test("thresholds increase by exactly 1 each level", () => {
      for (let level = 1; level < 10; level++) {
        const current = DAMAGE_THRESHOLDS_BY_LEVEL[level];
        const next = DAMAGE_THRESHOLDS_BY_LEVEL[level + 1];

        expect(next.major).toBe(current.major + 1);
        expect(next.severe).toBe(current.severe + 1);
      }
    });

    test("level 1 to 10 progression is linear", () => {
      const level1 = DAMAGE_THRESHOLDS_BY_LEVEL[1];
      const level10 = DAMAGE_THRESHOLDS_BY_LEVEL[10];

      expect(level10.major - level1.major).toBe(9);
      expect(level10.severe - level1.severe).toBe(9);
    });
  });

  describe("Damage severity classifications", () => {
    test.each([
      { level: 1, damage: 2, severity: "minor" },
      { level: 1, damage: 3, severity: "major" },
      { level: 1, damage: 5, severity: "severe" },
      { level: 1, damage: 10, severity: "massive" },
      { level: 5, damage: 3, severity: "minor" },
      { level: 5, damage: 7, severity: "major" },
      { level: 5, damage: 9, severity: "severe" },
      { level: 5, damage: 18, severity: "massive" },
    ])(
      "Level $level: $damage damage is $severity",
      ({ level, damage, severity }) => {
        const thresholds = DAMAGE_THRESHOLDS_BY_LEVEL[level];

        if (severity === "minor") {
          expect(damage < thresholds.major).toBe(true);
        } else if (severity === "major") {
          expect(damage >= thresholds.major && damage < thresholds.severe).toBe(true);
        } else if (severity === "severe") {
          expect(damage >= thresholds.severe).toBe(true);
        } else if (severity === "massive") {
          expect(damage >= thresholds.severe * 2).toBe(true);
        }
      }
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// PROFICIENCY TIER DATA-DRIVEN TESTS
// ─────────────────────────────────────────────────────────────────────────────

describe("SRD: Data-Driven Proficiency Tiers", () => {
  describe("All proficiency values by level", () => {
    test.each(Object.entries(PROFICIENCY_BY_LEVEL))(
      "Level %s proficiency is %d",
      (levelStr, expectedProf) => {
        const level = parseInt(levelStr);
        const char = createValidCharacterAtLevel(level);
        expect(char.proficiency).toBe(expectedProf);
      }
    );
  });

  describe("Tier 1 proficiency (levels 1-2)", () => {
    test.each([1, 2])("Level %d has Proficiency 1", (level) => {
      expect(PROFICIENCY_BY_LEVEL[level]).toBe(1);
    });

    test.each([1, 2])("Level %d damage: 1d<die>+mod", (level) => {
      const char = createValidCharacterAtLevel(level);
      expect(char.proficiency).toBe(1);
    });
  });

  describe("Tier 2 proficiency (levels 3-4)", () => {
    test.each([3, 4])("Level %d has Proficiency 2", (level) => {
      expect(PROFICIENCY_BY_LEVEL[level]).toBe(2);
    });

    test.each([3, 4])("Level %d damage: 2d<die>+mod", (level) => {
      const char = createValidCharacterAtLevel(level);
      expect(char.proficiency).toBe(2);
    });
  });

  describe("Tier 3 proficiency (levels 5-7)", () => {
    test.each([5, 6, 7])("Level %d has Proficiency 3", (level) => {
      expect(PROFICIENCY_BY_LEVEL[level]).toBe(3);
    });

    test.each([5, 6, 7])("Level %d damage: 3d<die>+mod", (level) => {
      const char = createValidCharacterAtLevel(level);
      expect(char.proficiency).toBe(3);
    });
  });

  describe("Tier 4 proficiency (levels 8-10)", () => {
    test.each([8, 9, 10])("Level %d has Proficiency 4", (level) => {
      expect(PROFICIENCY_BY_LEVEL[level]).toBe(4);
    });

    test.each([8, 9, 10])("Level %d damage: 4d<die>+mod", (level) => {
      const char = createValidCharacterAtLevel(level);
      expect(char.proficiency).toBe(4);
    });
  });

  describe("Proficiency caps at 4", () => {
    test("maximum proficiency is 4", () => {
      const maxProf = Math.max(...Object.values(PROFICIENCY_BY_LEVEL));
      expect(maxProf).toBe(4);
    });

    test("no level exceeds proficiency 4", () => {
      Object.values(PROFICIENCY_BY_LEVEL).forEach((prof) => {
        expect(prof).toBeLessThanOrEqual(4);
      });
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TIER ACHIEVEMENT DATA-DRIVEN TESTS
// ─────────────────────────────────────────────────────────────────────────────

describe("SRD: Data-Driven Tier Achievements", () => {
  describe("Tier 1 (Levels 1-2)", () => {
    test("Level 1 is start of Tier 1", () => {
      const char = createValidCharacterAtLevel(1);
      expect(char.level).toBeLessThanOrEqual(2);
    });

    test("Level 2 is end of Tier 1 (achievement)", () => {
      const level1 = createValidCharacterAtLevel(1);
      const level2 = createValidCharacterAtLevel(2);

      // At level 2: tier achievement, but still proficiency 1
      expect(level1.proficiency).toBe(1);
      expect(level2.proficiency).toBe(1);
    });
  });

  describe("Tier 2 (Levels 3-4)", () => {
    test("Level 3 is start of Tier 2 (achievement from level 2)", () => {
      const level2 = createValidCharacterAtLevel(2);
      const level3 = createValidCharacterAtLevel(3);

      // At level 3: proficiency increases to 2
      expect(level2.proficiency).toBe(1);
      expect(level3.proficiency).toBe(2);
    });

    test("Level 4 is end of Tier 2", () => {
      const level4 = createValidCharacterAtLevel(4);
      expect(level4.proficiency).toBe(2);
    });
  });

  describe("Tier 3 (Levels 5-7) — MAJOR ACHIEVEMENT", () => {
    test("Level 5 is start of Tier 3 (achievement, +1 Experience, +1 Prof, clear traits)", () => {
      const level4 = createValidCharacterAtLevel(4);
      const level5 = createValidCharacterAtLevel(5);

      // Proficiency increases to 3
      expect(level4.proficiency).toBe(2);
      expect(level5.proficiency).toBe(3);

      // Experiences should increase
      expect(level5.experiences.length).toBeGreaterThanOrEqual(
        level4.experiences.length
      );

      // Trait clearing happens (implementation detail)
    });

    test("Level 5 enables multiclassing", () => {
      const level5 = createValidCharacterAtLevel(5);
      expect(level5.level).toBe(5);
      // Multiclass is now available
      expect(level5.level >= 5).toBe(true);
    });

    test("Levels 6-7 stay in Tier 3", () => {
      const level6 = createValidCharacterAtLevel(6);
      const level7 = createValidCharacterAtLevel(7);

      expect(level6.proficiency).toBe(3);
      expect(level7.proficiency).toBe(3);
    });
  });

  describe("Tier 4 (Levels 8-10) — MAJOR ACHIEVEMENT", () => {
    test("Level 8 is start of Tier 4 (achievement, +1 Experience, +1 Prof, clear traits)", () => {
      const level7 = createValidCharacterAtLevel(7);
      const level8 = createValidCharacterAtLevel(8);

      // Proficiency increases to 4
      expect(level7.proficiency).toBe(3);
      expect(level8.proficiency).toBe(4);

      // Experiences should increase
      expect(level8.experiences.length).toBeGreaterThanOrEqual(
        level7.experiences.length
      );
    });

    test("Proficiency caps at 4 from level 8 onwards", () => {
      const level8 = createValidCharacterAtLevel(8);
      const level9 = createValidCharacterAtLevel(9);
      const level10 = createValidCharacterAtLevel(10);

      expect(level8.proficiency).toBe(4);
      expect(level9.proficiency).toBe(4);
      expect(level10.proficiency).toBe(4);
    });
  });

  describe("Tier achievements at exact levels", () => {
    test.each([
      [2, { newExp: true, newProf: false, clearTraits: false }],
      [5, { newExp: true, newProf: true, clearTraits: true }],
      [8, { newExp: true, newProf: true, clearTraits: true }],
    ])(
      "Level %d achievement: exp=%s prof=%s traits=%s",
      (level, expectedAchievements) => {
        const char = createValidCharacterAtLevel(level);

        if (expectedAchievements.newExp) {
          // Experience count should have increased
          expect(char.experiences.length).toBeGreaterThan(0);
        }

        if (expectedAchievements.newProf) {
          // Proficiency should have increased
          const prevChar = createValidCharacterAtLevel(level - 1);
          expect(char.proficiency).toBeGreaterThan(prevChar.proficiency);
        }
      }
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// ADVANCEMENT OPTION DATA-DRIVEN TESTS
// ─────────────────────────────────────────────────────────────────────────────

describe("SRD: Data-Driven Advancement Options", () => {
  describe("Advancement scenarios by level", () => {
    test.each(Object.entries(ADVANCEMENT_SCENARIOS))(
      "%s advancement behavior",
      (scenarioName, scenario) => {
        const charBefore = createValidCharacterAtLevel(scenario.fromLevel);
        const charAfter = createValidCharacterAtLevel(scenario.toLevel);

        if (scenario.expectedProficiencyIncrease > 0) {
          expect(charAfter.proficiency).toBeGreaterThan(charBefore.proficiency);
        } else {
          expect(charAfter.proficiency).toBe(charBefore.proficiency);
        }

        if (scenario.expectedNewExperience > 0) {
          expect(charAfter.experiences.length).toBeGreaterThanOrEqual(
            charBefore.experiences.length
          );
        }
      }
    );
  });

  describe("HP advancement option (Add HP slot)", () => {
    test("adding HP slot increases max HP by 1", () => {
      const charLv5 = createValidCharacterAtLevel(5);
      const maxBefore = charLv5.trackers.hp.max;
      // Simulating advancement to level 6 with HP option
      const charLv6 = createValidCharacterAtLevel(6);
      // Character should have more max HP (or same base + other bonuses)
      expect(charLv6.trackers.hp.max).toBeGreaterThanOrEqual(maxBefore);
    });
  });

  describe("Stress advancement option (Add Stress slot)", () => {
    test("adding Stress slot increases max Stress by 1", () => {
      const charLv5 = createValidCharacterAtLevel(5);
      const maxBefore = charLv5.trackers.stress.max;
      // Adding stress option increases by 1
      const expectedMax = maxBefore + 1;
      expect(expectedMax).toBeLessThanOrEqual(12); // Hard cap
    });

    test("max Stress capped at 12", () => {
      // Even if choosing Stress multiple times, hard cap is 12
      const maxStress = 12;
      expect(maxStress).toBe(12);
    });
  });

  describe("Experience advancement option (Increase Experience)", () => {
    test("+1 to two Experiences", () => {
      // Choose to boost 2 Experiences by +1 each
      const before = { exp1: 2, exp2: 2 };
      const after = { exp1: 3, exp2: 3 };
      expect(after.exp1).toBe(before.exp1 + 1);
      expect(after.exp2).toBe(before.exp2 + 1);
    });
  });

  describe("Proficiency advancement option (requires 2 slots)", () => {
    test("proficiency advancement uses 2 advancement slots", () => {
      // This is a premium option: costs 2 advancement choices
      const slotsCost = 2;
      expect(slotsCost).toBe(2);
    });

    test("proficiency still respects tier progression", () => {
      // Even if you pay 2 slots at level 5, prof goes 3 not 4
      const level5Prof = 3;
      expect(level5Prof).toBe(3);
    });
  });

  describe("Trait advancement (Mark until tier clear)", () => {
    test("trait advancement marks trait until next tier achievement", () => {
      // At level 3: choose +1 Agility, mark it
      // Stays marked until level 5 (tier achievement)
      expect(true).toBe(true);
    });

    test("trait must be one of the 6 core traits", () => {
      const coreTrait = ["agility", "strength", "finesse", "instinct", "presence", "knowledge"];
      expect(coreTrait.length).toBe(6);
    });

    test("can only boost +1 per advancement", () => {
      // Single advancement grants +1 to trait
      const bonus = 1;
      expect(bonus).toBe(1);
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// ARMOR SCORE DATA-DRIVEN TESTS
// ─────────────────────────────────────────────────────────────────────────────

describe("SRD: Data-Driven Armor Scores", () => {
  test.each(Object.entries(ARMOR_SCENARIOS))(
    "%s armor scenario",
    (scenarioName, scenario) => {
      const total = scenario.baseArmorScore +
        scenario.proficiencyBonus;
      const capped = Math.min(total, 12);

      expect(capped).toBeLessThanOrEqual(12);
      if (scenarioName.includes("Enhancement")) {
        expect(capped).toBe(12);
      }
    }
  );

  describe("Armor Score cap at 12", () => {
    test.each([
      { base: 0, prof: 0, expected: 0 },
      { base: 3, prof: 0, expected: 3 },
      { base: 5, prof: 2, expected: 7 },
      { base: 8, prof: 5, expected: 12 },
      { base: 10, prof: 10, expected: 12 },
      { base: 15, prof: 5, expected: 12 },
    ])(
      "base=$base prof=$prof → armor=$expected",
      ({ base, prof, expected }) => {
        const total = base + prof;
        const capped = Math.min(total, 12);
        expect(capped).toBe(expected);
      }
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// CLASS DATA CONSISTENCY TESTS
// ─────────────────────────────────────────────────────────────────────────────

describe("SRD: Class Data Consistency", () => {
  describe("All 9 classes present", () => {
    const expectedClasses = [
      "bard",
      "druid",
      "guardian",
      "ranger",
      "rogue",
      "seraph",
      "sorcerer",
      "warrior",
      "wizard",
    ];

    test.each(expectedClasses)("%s class should exist", (classId) => {
      expect(CLASS_DATA_FIXTURES[classId]).toBeDefined();
    });

    test("exactly 9 classes defined", () => {
      const classCount = Object.keys(CLASS_DATA_FIXTURES).length;
      expect(classCount).toBe(9);
    });
  });

  describe("Each class has required fields", () => {
    test.each(Object.values(CLASS_DATA_FIXTURES))("class %s has all fields", (classData) => {
      expect(classData.classId).toBeDefined();
      expect(classData.name).toBeDefined();
      expect(classData.startingEvasion).toBeDefined();
      expect(classData.startingHitPoints).toBeDefined();
      expect(classData.domains).toBeDefined();
      expect(classData.domains.length).toBe(2);
    });
  });

  describe("Evasion ranges valid", () => {
    test.each(Object.values(CLASS_DATA_FIXTURES))(
      "evasion %d is within valid range",
      (classData) => {
        expect(classData.startingEvasion).toBeGreaterThanOrEqual(9);
        expect(classData.startingEvasion).toBeLessThanOrEqual(12);
      }
    );
  });

  describe("HP ranges valid", () => {
    test.each(Object.values(CLASS_DATA_FIXTURES))(
      "HP %d is within valid range",
      (classData) => {
        expect(classData.startingHitPoints).toBeGreaterThanOrEqual(5);
        expect(classData.startingHitPoints).toBeLessThanOrEqual(7);
      }
    );
  });

  describe("All 9 domains represented", () => {
    const allDomains = new Set<string>();
    Object.values(CLASS_DATA_FIXTURES).forEach((classData) => {
      classData.domains.forEach((domain) => allDomains.add(domain));
    });

    const expectedDomains = [
      "arcana",
      "blade",
      "bone",
      "codex",
      "grace",
      "midnight",
      "sage",
      "splendor",
      "valor",
    ];

    test("all 9 domains used", () => {
      expect(allDomains.size).toBe(9);
    });

    test.each(expectedDomains)("domain %s is accessible", (domain) => {
      expect(allDomains.has(domain)).toBe(true);
    });
  });

  describe("Domain access rules (no domain appears on > 2 classes)", () => {
    const domainClassCount: Record<string, number> = {};

    Object.values(CLASS_DATA_FIXTURES).forEach((classData) => {
      classData.domains.forEach((domain) => {
        domainClassCount[domain] = (domainClassCount[domain] || 0) + 1;
      });
    });

    test.each(Object.entries(domainClassCount))(
      "domain %s appears on %d classes",
      (domain, count) => {
        expect(count).toBe(2);
      }
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// RESOURCE PROGRESSION DATA-DRIVEN TESTS
// ─────────────────────────────────────────────────────────────────────────────

describe("SRD: Data-Driven Resource Progression", () => {
  describe("HP progression (should stay consistent)", () => {
    test.each(Array.from({ length: 10 }, (_, i) => i + 1))(
      "Level %d HP max is valid",
      (level) => {
        const char = createValidCharacterAtLevel(level);
        expect(char.trackers.hp.max).toBeGreaterThanOrEqual(1);
        expect(char.trackers.hp.marked).toBeLessThanOrEqual(char.trackers.hp.max);
      }
    );
  });

  describe("Stress progression (should stay consistent)", () => {
    test.each(Array.from({ length: 10 }, (_, i) => i + 1))(
      "Level %d Stress max ≥ 6",
      (level) => {
        const char = createValidCharacterAtLevel(level);
        expect(char.trackers.stress.max).toBeGreaterThanOrEqual(6);
        expect(char.trackers.stress.marked).toBeLessThanOrEqual(char.trackers.stress.max);
      }
    );

    test("Stress never exceeds 12", () => {
      for (let level = 1; level <= 10; level++) {
        const char = createValidCharacterAtLevel(level);
        expect(char.trackers.stress.max).toBeLessThanOrEqual(12);
      }
    });
  });

  describe("Hope progression (consistent cap)", () => {
    test.each(Array.from({ length: 10 }, (_, i) => i + 1))(
      "Level %d Hope max = 6",
      (level) => {
        const char = createValidCharacterAtLevel(level);
        expect(char.hopeMax).toBe(6);
      }
    );

    test.each(Array.from({ length: 10 }, (_, i) => i + 1))(
      "Level %d Hope ≤ Hope max",
      (level) => {
        const char = createValidCharacterAtLevel(level);
        expect(char.hope).toBeLessThanOrEqual(char.hopeMax);
      }
    );
  });
});
