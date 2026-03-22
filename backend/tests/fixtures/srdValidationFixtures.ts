// backend/tests/fixtures/srdValidationFixtures.ts
//
// Test fixtures for SRD compliance validation.
//
// These fixtures provide:
// 1. Valid characters at each level (1-10)
// 2. Valid advancement scenarios
// 3. Valid combat scenarios
// 4. Invalid scenarios (should be rejected by validators)
//
// Used by both unit tests and integration tests.

import type {
  Character,
  ClassData,
  DomainCard,
  CoreStats,
  DamageThresholds,
  CharacterTrackers,
  AdvancementChoice,
  LevelUpChoices,
} from "@shared/types";

// ─── Mock Class Data ──────────────────────────────────────────────────────────

export const mockWarriorClass: ClassData = {
  classId: "warrior",
  name: "Warrior",
  domains: ["combat", "leadership"],
  startingEvasion: 10,
  startingHitPoints: 8,
  subclasses: [
    {
      subclassId: "titan",
      name: "Titan",
      description: "A mighty warrior of immense power",
      spellcastTrait: "strength",
      foundationFeatures: [
        { name: "Foundation 1", description: "Basic titan ability" },
      ],
      specializationFeature: { name: "Specialization", description: "Specialized titan power" },
      masteryFeature: { name: "Mastery", description: "Master titan ability" },
    },
  ],
  source: "homebrew",
  classItems: ["sword", "shield"],
  hopeFeature: {
    name: "Courageous Strike",
    description: "Spend 1 Hope to add +1 to an attack roll",
    hopeCost: 1,
  },
  classFeature: {
    name: "Battle Ready",
    description: "Warriors gain +1 proficiency when defending",
    options: [],
  },
  backgroundQuestions: [
    "What made you take up arms?",
    "Who taught you to fight?",
  ],
  connectionQuestions: [
    "Who do you fight for?",
    "Who do you fight against?",
  ],
  mechanicalNotes: "Warriors excel in direct combat",
};

export const mockWizardClass: ClassData = {
  classId: "wizard",
  name: "Wizard",
  domains: ["arcane", "knowledge"],
  startingEvasion: 10,
  startingHitPoints: 6,
  subclasses: [
    {
      subclassId: "elementialist",
      name: "Elementialist",
      description: "A wizard who commands the elements",
      spellcastTrait: "knowledge",
      foundationFeatures: [
        { name: "Foundation 1", description: "Basic elemental ability" },
      ],
      specializationFeature: { name: "Specialization", description: "Specialized elemental power" },
      masteryFeature: { name: "Mastery", description: "Master elemental ability" },
    },
  ],
  source: "homebrew",
  classItems: ["spellbook", "staff"],
  hopeFeature: {
    name: "Arcane Surge",
    description: "Spend 1 Hope to add +2 to a spellcast roll",
    hopeCost: 1,
  },
  classFeature: {
    name: "Spell Mastery",
    description: "Wizards gain +1 to spellcast rolls",
    options: [],
  },
  backgroundQuestions: [
    "Where did you learn magic?",
    "What cost has magic exacted from you?",
  ],
  connectionQuestions: [
    "Who trusts your magic?",
    "Who fears your power?",
  ],
  mechanicalNotes: "Wizards excel in spellcasting",
};

// ─── Mock Domain Cards ────────────────────────────────────────────────────────

export const mockCombatCards: DomainCard[] = [
  {
    cardId: "combat-1-slash",
    domain: "combat",
    level: 1,
    recallCost: 1,
    name: "Slash",
    isCursed: false,
    isLinkedCurse: false,
    isGrimoire: false,
    description: "A basic melee attack",
    curseText: null,
    linkedCardIds: [],
    grimoire: [],
    source: "homebrew",
  },
  {
    cardId: "combat-1-defend",
    domain: "combat",
    level: 1,
    recallCost: 1,
    name: "Defend",
    isCursed: false,
    isLinkedCurse: false,
    isGrimoire: false,
    description: "Brace for incoming damage",
    curseText: null,
    linkedCardIds: [],
    grimoire: [],
    source: "homebrew",
  },
  {
    cardId: "combat-2-power-strike",
    domain: "combat",
    level: 2,
    recallCost: 2,
    name: "Power Strike",
    isCursed: false,
    isLinkedCurse: false,
    isGrimoire: false,
    description: "A devastating melee attack",
    curseText: null,
    linkedCardIds: [],
    grimoire: [],
    source: "homebrew",
  },
];

export const mockArcaneCards: DomainCard[] = [
  {
    cardId: "arcane-1-cantrip",
    domain: "arcane",
    level: 1,
    recallCost: 1,
    name: "Cantrip",
    isCursed: false,
    isLinkedCurse: false,
    isGrimoire: false,
    description: "A basic spell",
    curseText: null,
    linkedCardIds: [],
    grimoire: [],
    source: "homebrew",
  },
  {
    cardId: "arcane-2-fireball",
    domain: "arcane",
    level: 2,
    recallCost: 2,
    name: "Fireball",
    isCursed: false,
    isLinkedCurse: false,
    isGrimoire: false,
    description: "A powerful area spell",
    curseText: null,
    linkedCardIds: [],
    grimoire: [],
    source: "homebrew",
  },
];

// ─── Valid Character Fixtures ─────────────────────────────────────────────────

function createCoreStats(overrides: Partial<CoreStats> = {}): CoreStats {
  return {
    agility: 3,
    strength: 3,
    finesse: 3,
    instinct: 2,
    presence: 2,
    knowledge: 2,
    ...overrides,
  };
}

function createTrackers(level: number): CharacterTrackers {
  // HP: class base + level
  const hpMax = 8 + level;
  // Stress: 5 + tier (tier = ceil(level/2) - 1)
  const tier = Math.ceil(level / 2) - 1;
  const stressMax = 5 + tier;

  return {
    hp: { max: hpMax, marked: 0 },
    stress: { max: stressMax, marked: 0 },
    armor: { max: 10, marked: 0 },
  };
}

function createDamageThresholds(level: number): DamageThresholds {
  return {
    major: 10 + level,
    severe: 15 + level,
  };
}

/**
 * Creates a valid character at the specified level.
 */
export function createValidCharacter(
  level: number = 1,
  overrides: Partial<Character> = {}
): Character {
  const baseCharacter: Character = {
    characterId: `char-level-${level}`,
    userId: "user-123",
    name: `Level ${level} Warrior`,
    classId: "warrior",
    className: "Warrior",
    subclassId: null,
    subclassName: null,
    ancestryId: "human",
    ancestryName: "Human",
    communityId: "city",
    communityName: "City Dweller",
    level,
    avatarUrl: null,
    avatarKey: null,
    updatedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    domains: ["combat", "leadership"],
    stats: createCoreStats(),
    derivedStats: {
      evasion: 10 + level,
      armor: 10,
    },
    trackers: createTrackers(level),
    damageThresholds: createDamageThresholds(level),
    weapons: {
      primary: {
        name: "Longsword",
        trait: "strength",
        damage: "1d8+2",
        range: "Melee",
        type: "physical",
        burden: "one-handed",
        tier: 1,
        feature: null,
      },
      secondary: {
        name: "Shield",
        trait: null,
        damage: null,
        range: null,
        type: null,
        burden: "one-handed",
        tier: 1,
        feature: null,
      },
    },
    hope: 2,
    hopeMax: 6,
    proficiency: 1 + Math.floor((level - 1) / 2),
    experiences: [
      { name: "Soldier", bonus: 2 },
    ],
    conditions: [],
    domainLoadout: ["combat-1-slash", "combat-1-defend"],
    domainVault: ["combat-1-slash", "combat-1-defend"],
    classFeatureState: {},
    traitBonuses: {},
    notes: null,
    gold: { handfuls: 1, bags: 0, chests: 0 },
    inventory: ["torch", "rope", "basic supplies"],
    cardTokens: {},
    downtimeProjects: [],
    activeAuras: [],
    companionState: null,
    reputationBonuses: {},
    customConditions: [],
  };

  return { ...baseCharacter, ...overrides };
}

/**
 * Creates valid characters at levels 1-10.
 */
export function createCharactersAtAllLevels(): Character[] {
  return Array.from({ length: 10 }, (_, i) => {
    const level = i + 1;
    return createValidCharacter(level, {
      characterId: `char-level-${level}`,
      name: `Level ${level} Character`,
    });
  });
}

// ─── Valid Advancement Scenarios ──────────────────────────────────────────────

/**
 * Valid advancement: +1 Trait Bonus
 */
export function createValidTraitBonusAdvancement(): AdvancementChoice {
  return {
    type: "trait-bonus",
    detail: "strength",
  };
}

/**
 * Valid advancement: +1 HP Slot
 */
export function createValidHpAdvancement(): AdvancementChoice {
  return { type: "hp-slot" };
}

/**
 * Valid advancement: +1 Stress Slot
 */
export function createValidStressAdvancement(): AdvancementChoice {
  return { type: "stress-slot" };
}

/**
 * Valid advancement: +1 Experience Bonus
 */
export function createValidExperienceBonusAdvancement(): AdvancementChoice {
  return {
    type: "experience-bonus",
    detail: "Soldier",
  };
}

/**
 * Valid advancement: New Experience
 */
export function createValidNewExperienceAdvancement(): AdvancementChoice {
  return {
    type: "new-experience",
    detail: "Scout",
  };
}

/**
 * Valid advancement: +1 Evasion
 */
export function createValidEvasionAdvancement(): AdvancementChoice {
  return { type: "evasion" };
}

/**
 * Valid advancement: Additional Domain Card
 */
export function createValidDomainCardAdvancement(
  cardId: string = "combat-2-power-strike"
): AdvancementChoice {
  return {
    type: "additional-domain-card",
    detail: cardId,
  };
}

/**
 * Valid advancement: Subclass Upgrade (Foundation -> Specialization)
 */
export function createValidSubclassUpgradeAdvancement(): AdvancementChoice {
  return {
    type: "subclass-upgrade",
    detail: "specialization",
  };
}

/**
 * Valid advancement: Proficiency Increase (costs 2 slots)
 */
export function createValidProficiencyAdvancement(): AdvancementChoice {
  return { type: "proficiency-increase" };
}

/**
 * Valid level-up: Two single-slot advancements
 */
export function createValidLevelUp(
  character: Character,
  targetLevel: number = 2
): LevelUpChoices {
  return {
    targetLevel,
    advancements: [
      createValidTraitBonusAdvancement(),
      createValidHpAdvancement(),
    ],
    newDomainCardId: "combat-2-power-strike",
    exchangeCardId: null,
  };
}

/**
 * Valid level-up: Proficiency increase (single double-slot advancement)
 */
export function createValidProficiencyLevelUp(
  character: Character,
  targetLevel: number = 3
): LevelUpChoices {
  return {
    targetLevel,
    advancements: [createValidProficiencyAdvancement()],
    newDomainCardId: null,
    exchangeCardId: null,
  };
}

// ─── Invalid Character Scenarios ──────────────────────────────────────────────

/**
 * Invalid: Stat exceeds 5 at creation
 */
export function createInvalidCharacterStatTooHigh(): Character {
  return createValidCharacter(1, {
    stats: createCoreStats({ strength: 6 }),
  });
}

/**
 * Invalid: Stat exceeds 8 (absolute max)
 */
export function createInvalidCharacterStatWayTooHigh(): Character {
  return createValidCharacter(5, {
    stats: createCoreStats({ agility: 9 }),
  });
}

/**
 * Invalid: Hope exceeds hopeMax
 */
export function createInvalidCharacterHopeExceedsMax(): Character {
  return createValidCharacter(1, {
    hope: 8,
    hopeMax: 6,
  });
}

/**
 * Invalid: HP marked exceeds max
 */
export function createInvalidCharacterHpMarkedExceedsMax(): Character {
  return createValidCharacter(1, {
    trackers: {
      ...createTrackers(1),
      hp: { max: 9, marked: 10 },
    },
  });
}

/**
 * Invalid: Stress below level base
 */
export function createInvalidCharacterStressBelowBase(): Character {
  return createValidCharacter(3, {
    trackers: {
      ...createTrackers(3),
      stress: { max: 4, marked: 0 }, // Should be at least 6 at level 3
    },
  });
}

/**
 * Invalid: Loadout exceeds 5 cards
 */
export function createInvalidCharacterLoadoutTooMany(): Character {
  return createValidCharacter(5, {
    domainLoadout: [
      "combat-1-slash",
      "combat-1-defend",
      "combat-2-power-strike",
      "arcane-1-cantrip",
      "arcane-2-fireball",
      "extra-card",
    ],
  });
}

/**
 * Invalid: Loadout card not in vault
 */
export function createInvalidCharacterLoadoutNotInVault(): Character {
  return createValidCharacter(1, {
    domainLoadout: ["fake-card"],
    domainVault: ["combat-1-slash", "combat-1-defend"],
  });
}

/**
 * Invalid: Domain not in class
 */
export function createInvalidCharacterDomainNotInClass(): Character {
  return createValidCharacter(1, {
    domains: ["necromancy"], // Not in warrior's combat/leadership
  });
}

/**
 * Invalid: Level out of range
 */
export function createInvalidCharacterLevelTooHigh(): Character {
  return createValidCharacter(11);
}

/**
 * Invalid: Proficiency doesn't match level
 */
export function createInvalidCharacterProficiencyWrong(): Character {
  return createValidCharacter(5, {
    proficiency: 1, // Should be at least 1 + floor((5-1)/2) = 3
  });
}

// ─── Invalid Advancement Scenarios ────────────────────────────────────────────

/**
 * Invalid: Too many advancement slots
 */
export function createInvalidAdvancementTooManySlots(): AdvancementChoice[] {
  return [
    createValidTraitBonusAdvancement(),
    createValidHpAdvancement(),
    createValidStressAdvancement(), // 3 slots!
  ];
}

/**
 * Invalid: Double-slot with another advancement
 */
export function createInvalidAdvancementDoubleslotWithOther(): AdvancementChoice[] {
  return [
    createValidProficiencyAdvancement(), // 2 slots
    createValidTraitBonusAdvancement(), // 1 slot (total 3)
  ];
}

/**
 * Invalid: Not enough advancement slots
 */
export function createInvalidAdvancementNotEnoughSlots(): AdvancementChoice[] {
  return [createValidTraitBonusAdvancement()]; // Only 1 slot
}

// ─── Export all fixtures ──────────────────────────────────────────────────────

export const validFixtures = {
  mockWarriorClass,
  mockWizardClass,
  mockCombatCards,
  mockArcaneCards,
  createValidCharacter,
  createCharactersAtAllLevels,
  createValidTraitBonusAdvancement,
  createValidHpAdvancement,
  createValidStressAdvancement,
  createValidExperienceBonusAdvancement,
  createValidNewExperienceAdvancement,
  createValidEvasionAdvancement,
  createValidDomainCardAdvancement,
  createValidSubclassUpgradeAdvancement,
  createValidProficiencyAdvancement,
  createValidLevelUp,
  createValidProficiencyLevelUp,
};

export const invalidFixtures = {
  createInvalidCharacterStatTooHigh,
  createInvalidCharacterStatWayTooHigh,
  createInvalidCharacterHopeExceedsMax,
  createInvalidCharacterHpMarkedExceedsMax,
  createInvalidCharacterStressBelowBase,
  createInvalidCharacterLoadoutTooMany,
  createInvalidCharacterLoadoutNotInVault,
  createInvalidCharacterDomainNotInClass,
  createInvalidCharacterLevelTooHigh,
  createInvalidCharacterProficiencyWrong,
  createInvalidAdvancementTooManySlots,
  createInvalidAdvancementDoubleslotWithOther,
  createInvalidAdvancementNotEnoughSlots,
};

export const fixtures = {
  valid: validFixtures,
  invalid: invalidFixtures,
};
