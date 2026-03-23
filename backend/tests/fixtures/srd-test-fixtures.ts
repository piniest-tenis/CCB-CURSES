// backend/tests/fixtures/srd-test-fixtures.ts
//
// Comprehensive test data fixtures for SRD compliance testing.
// Includes valid characters at all levels, advancement paths, and edge cases.

import type { Character, ClassData, CoreStats, DamageThresholds } from "@shared/types";

// ─── Class Data Fixtures ──────────────────────────────────────────────────────

export const CLASS_DATA_FIXTURES: Record<string, ClassData> = {
  bard: {
    classId: "bard",
    name: "Bard",
    description: "Master of performance and social manipulation",
    startingEvasion: 10,
    startingHitPoints: 5,
    domains: ["grace", "codex"],
    features: [],
    spellcastTrait: "presence",
  },
  druid: {
    classId: "druid",
    name: "Druid",
    description: "Guardian of nature and shapeshifter",
    startingEvasion: 10,
    startingHitPoints: 6,
    domains: ["sage", "arcana"],
    features: [],
    spellcastTrait: "instinct",
  },
  guardian: {
    classId: "guardian",
    name: "Guardian",
    description: "Stalwart protector and force of valor",
    startingEvasion: 9,
    startingHitPoints: 7,
    domains: ["blade", "valor"],
    features: [],
    spellcastTrait: "strength",
  },
  ranger: {
    classId: "ranger",
    name: "Ranger",
    description: "Skilled tracker and focused hunter",
    startingEvasion: 12,
    startingHitPoints: 6,
    domains: ["bone", "sage"],
    features: [],
    spellcastTrait: "agility",
  },
  rogue: {
    classId: "rogue",
    name: "Rogue",
    description: "Cunning shadow and master of subterfuge",
    startingEvasion: 12,
    startingHitPoints: 6,
    domains: ["grace", "midnight"],
    features: [],
    spellcastTrait: "finesse",
  },
  seraph: {
    classId: "seraph",
    name: "Seraph",
    description: "Divine warrior with celestial power",
    startingEvasion: 9,
    startingHitPoints: 7,
    domains: ["splendor", "valor"],
    features: [],
    spellcastTrait: "presence",
  },
  sorcerer: {
    classId: "sorcerer",
    name: "Sorcerer",
    description: "Wielder of innate arcane power",
    startingEvasion: 10,
    startingHitPoints: 6,
    domains: ["arcana", "midnight"],
    features: [],
    spellcastTrait: "knowledge",
  },
  warrior: {
    classId: "warrior",
    name: "Warrior",
    description: "Master of combat and weapon expertise",
    startingEvasion: 11,
    startingHitPoints: 6,
    domains: ["blade", "bone"],
    features: [],
    spellcastTrait: "strength",
  },
  wizard: {
    classId: "wizard",
    name: "Wizard",
    description: "Learned scholar of studied magic",
    startingEvasion: 11,
    startingHitPoints: 5,
    domains: ["codex", "splendor"],
    features: [],
    spellcastTrait: "knowledge",
  },
};

// ─── Core Stat Fixtures ────────────────────────────────────────────────────────

export const VALID_CORE_STATS: CoreStats = {
  agility: 2,
  strength: 1,
  finesse: 1,
  instinct: 0,
  presence: 0,
  knowledge: -1,
};

export const VALID_CORE_STATS_ALT: CoreStats = {
  agility: 0,
  strength: 2,
  finesse: 1,
  instinct: 1,
  presence: -1,
  knowledge: 0,
};

export const INVALID_CORE_STATS_SUM: CoreStats = {
  agility: 3,
  strength: 2,
  finesse: 1,
  instinct: 0,
  presence: 0,
  knowledge: -1,
};

export const INVALID_CORE_STATS_NEGATIVE: CoreStats = {
  agility: 2,
  strength: 1,
  finesse: 1,
  instinct: 0,
  presence: -2,
  knowledge: -2,
};

// ─── Damage Threshold Fixtures ────────────────────────────────────────────────

export const DAMAGE_THRESHOLDS_BY_LEVEL: Record<number, DamageThresholds> = {
  1: { major: 3, severe: 5 },
  2: { major: 4, severe: 6 },
  3: { major: 5, severe: 7 },
  4: { major: 6, severe: 8 },
  5: { major: 7, severe: 9 },
  6: { major: 8, severe: 10 },
  7: { major: 9, severe: 11 },
  8: { major: 10, severe: 12 },
  9: { major: 11, severe: 13 },
  10: { major: 12, severe: 14 },
};

// ─── Character Creation Fixtures (by level) ───────────────────────────────────

export function createValidCharacterAtLevel(level: number, classId: string = "bard"): Character {
  const classData = CLASS_DATA_FIXTURES[classId];
  if (!classData) throw new Error(`Unknown class: ${classId}`);

  const baseHP = classData.startingHitPoints;
  const damageThresholds = DAMAGE_THRESHOLDS_BY_LEVEL[level] || {
    major: 2 + level,
    severe: 4 + level,
  };

  return {
    characterId: `char-level-${level}-${classId}`,
    userId: "user-123",
    name: `Test ${classData.name} Level ${level}`,
    classId,
    className: classData.name,
    subclassId: level >= 1 ? `${classId}-subclass-1` : null,
    subclassName: level >= 1 ? `${classData.name} Subclass 1` : null,
    communityId: "community-test",
    communityName: "Test Community",
    ancestryId: "ancestry-human",
    ancestryName: "Human",
    level,
    avatarUrl: null,
    updatedAt: new Date().toISOString(),

    // Core stats (valid distribution)
    stats: VALID_CORE_STATS,
    derivedStats: {
      evasion: classData.startingEvasion,
      armor: 0,
    },

    // Trackers
    trackers: {
      hp: { max: baseHP + Math.max(0, level - 1), marked: 0 },
      stress: { max: 6, marked: 0 },
      armor: { max: 3, marked: 0 },
    },

    // Damage thresholds
    damageThresholds,

    // Weapons (dummy data)
    weapons: {
      primary: {
        name: "Longsword",
        trait: "strength",
        damage: "d10+3",
        range: "melee",
        type: "physical",
        burden: "two-handed",
        tier: 1,
        feature: null,
      },
      secondary: {
        name: null,
        trait: null,
        damage: null,
        range: null,
        type: null,
        burden: null,
        tier: null,
        feature: null,
      },
    },

    // Resources
    hope: 2,
    hopeMax: 6,
    proficiency: Math.min(1 + Math.floor((level - 1) / 3), 4),

    // Features
    experiences: [
      { name: "Experience 1", bonus: 2 },
      { name: "Experience 2", bonus: 2 },
    ],
    conditions: [],
    domainLoadout: ["domain-grace-1", "domain-codex-1"],
    domainVault: [],
    classFeatureState: {},
    traitBonuses: {},
    notes: null,
    avatarKey: null,
    createdAt: new Date().toISOString(),

    // Inventory
    gold: { handfuls: 1, bags: 0, chests: 0 },
    inventory: [
      "a torch",
      "50 feet of rope",
      "basic supplies",
      "Minor Health Potion",
    ],

    // Campaign mechanics
    cardTokens: {},
    downtimeProjects: [],
    activeAuras: [],
    companionState: null,
    reputationBonuses: {},
    favors: {},
    customConditions: [],

    domains: classData.domains,
  };
}

// ─── Character at each tier ────────────────────────────────────────────────────

export const CHARACTER_LEVEL_1 = createValidCharacterAtLevel(1, "bard");
export const CHARACTER_LEVEL_2 = createValidCharacterAtLevel(2, "bard");
export const CHARACTER_LEVEL_3 = createValidCharacterAtLevel(3, "druid");
export const CHARACTER_LEVEL_4 = createValidCharacterAtLevel(4, "guardian");
export const CHARACTER_LEVEL_5 = createValidCharacterAtLevel(5, "ranger");
export const CHARACTER_LEVEL_6 = createValidCharacterAtLevel(6, "rogue");
export const CHARACTER_LEVEL_7 = createValidCharacterAtLevel(7, "seraph");
export const CHARACTER_LEVEL_8 = createValidCharacterAtLevel(8, "sorcerer");
export const CHARACTER_LEVEL_9 = createValidCharacterAtLevel(9, "warrior");
export const CHARACTER_LEVEL_10 = createValidCharacterAtLevel(10, "wizard");

// ─── Proficiency Fixtures ─────────────────────────────────────────────────────

export const PROFICIENCY_BY_LEVEL: Record<number, number> = {
  1: 1,
  2: 1,
  3: 2,
  4: 2,
  5: 3,
  6: 3,
  7: 3,
  8: 4,
  9: 4,
  10: 4,
};

// ─── Trait Assignment Scenarios ────────────────────────────────────────────────

export const TRAIT_SCENARIOS = {
  valid: [
    { agility: 2, strength: 1, finesse: 1, instinct: 0, presence: 0, knowledge: -1 },
    { agility: 1, strength: 2, finesse: 1, instinct: 0, presence: 0, knowledge: -1 },
    { agility: 1, strength: 1, finesse: 2, instinct: 0, presence: 0, knowledge: -1 },
    { agility: 0, strength: 0, finesse: 0, instinct: 2, presence: 1, knowledge: -1 },
  ],
  invalid: [
    { agility: 3, strength: 1, finesse: 1, instinct: 0, presence: 0, knowledge: -1 },
    { agility: 2, strength: 2, finesse: 1, instinct: 0, presence: 0, knowledge: -1 },
    { agility: 2, strength: 1, finesse: 1, instinct: 1, presence: 0, knowledge: -1 },
    { agility: 2, strength: 1, finesse: 1, instinct: 0, presence: 0, knowledge: 0 },
  ],
};

// ─── Combat Scenarios ─────────────────────────────────────────────────────────

export const COMBAT_SCENARIOS = {
  damageRolls: [
    { proficiency: 1, weaponDamage: "d6+1", expected: "1d6+1" },
    { proficiency: 2, weaponDamage: "d8+2", expected: "2d8+2" },
    { proficiency: 3, weaponDamage: "d10+3", expected: "3d10+3" },
    { proficiency: 4, weaponDamage: "d12+1", expected: "4d12+1" },
  ],
  criticalDamage: [
    {
      proficiency: 1,
      weaponDamage: "1d6+1",
      maxDieResult: 6,
      expectedAddition: 6,
    },
    {
      proficiency: 2,
      weaponDamage: "2d8+2",
      maxDieResult: 8,
      expectedAddition: 16,
    },
  ],
};

// ─── Multiclass Scenarios ─────────────────────────────────────────────────────

export const MULTICLASS_SCENARIOS = {
  validAtLevel5: {
    currentLevel: 5,
    currentClass: "bard",
    newClass: "druid",
    maxNewDomainLevel: 3, // Math.ceil(5 / 2)
  },
  validAtLevel7: {
    currentLevel: 7,
    currentClass: "bard",
    newClass: "warrior",
    maxNewDomainLevel: 4, // Math.ceil(7 / 2)
  },
  invalidAtLevel4: {
    currentLevel: 4,
    isValid: false,
  },
  invalidAtLevel3: {
    currentLevel: 3,
    isValid: false,
  },
};

// ─── Advancement Scenarios ────────────────────────────────────────────────────

export const ADVANCEMENT_SCENARIOS = {
  level1To2: {
    fromLevel: 1,
    toLevel: 2,
    expectedNewExperience: 1,
    expectedProficiencyIncrease: 0,
    expectedTraitMarking: false,
    expectedTraitClearing: false,
  },
  level2To3: {
    fromLevel: 2,
    toLevel: 3,
    expectedNewExperience: 0,
    expectedProficiencyIncrease: 1,
    expectedTraitMarking: false,
    expectedTraitClearing: false,
  },
  level4To5: {
    fromLevel: 4,
    toLevel: 5,
    expectedNewExperience: 1,
    expectedProficiencyIncrease: 1,
    expectedTraitMarking: false,
    expectedTraitClearing: true,
  },
  level7To8: {
    fromLevel: 7,
    toLevel: 8,
    expectedNewExperience: 1,
    expectedProficiencyIncrease: 1,
    expectedTraitMarking: false,
    expectedTraitClearing: true,
  },
};

// ─── HP & Stress Slot Scenarios ────────────────────────────────────────────────

export const HP_PROGRESSION = {
  bard: { base: 5, perLevel: 0 },
  druid: { base: 6, perLevel: 0 },
  guardian: { base: 7, perLevel: 0 },
  ranger: { base: 6, perLevel: 0 },
  rogue: { base: 6, perLevel: 0 },
  seraph: { base: 7, perLevel: 0 },
  sorcerer: { base: 6, perLevel: 0 },
  warrior: { base: 6, perLevel: 0 },
  wizard: { base: 5, perLevel: 0 },
};

export const STRESS_PROGRESSION = {
  base: 6,
  maxAtLevel10: 12,
};

// ─── Domain Loadout Scenarios ─────────────────────────────────────────────────

export const DOMAIN_LOADOUT_SCENARIOS = {
  characterCreation: {
    cardsAcquired: 2,
    maxLoadout: 5,
    shouldBeInLoadout: 2,
    shouldBeInVault: 0,
  },
  level2Advancement: {
    cardsAcquired: 3,
    maxLoadout: 5,
    shouldBeInLoadout: 3,
    shouldBeInVault: 0,
  },
  level5Advancement: {
    cardsAcquired: 6,
    maxLoadout: 5,
    shouldBeInLoadout: 5,
    shouldBeInVault: 1,
  },
  level10Advancement: {
    cardsAcquired: 11,
    maxLoadout: 5,
    shouldBeInLoadout: 5,
    shouldBeInVault: 6,
  },
};

// ─── Death Scenarios ──────────────────────────────────────────────────────────

export const DEATH_SCENARIOS = {
  blaze: {
    name: "Blaze",
    description: "Go out in a blaze of glory",
    consequences: ["Heroic death", "Role-play out"],
  },
  avoid: {
    name: "Avoid",
    description: "Narrowly escape death",
    consequences: ["Gain scar", "Reduce Hope max by 1"],
  },
  risk: {
    name: "Risk",
    description: "Take a dangerous risk",
    consequences: ["Potentially severe consequences", "GM determines outcome"],
  },
};

// ─── Armor Score Scenarios ────────────────────────────────────────────────────

export const ARMOR_SCENARIOS = {
  level1NoArmor: {
    baseArmorScore: 0,
    level: 1,
    proficiencyBonus: 0,
    expectedMax: 12,
  },
  level5FullPlate: {
    baseArmorScore: 5,
    level: 5,
    proficiencyBonus: 0,
    expectedMax: 12,
  },
  level10WithEnhancements: {
    baseArmorScore: 7,
    level: 10,
    proficiencyBonus: 2,
    expectedMax: 12,
  },
};
