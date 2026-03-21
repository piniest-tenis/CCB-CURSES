/**
 * tests/fixtures/characters.ts
 *
 * Seeded character fixture data used across all test suites.
 * This mirrors the shape returned by the real API (the { data: T } envelope
 * is unwrapped by apiClient, so fixtures contain the unwrapped shape).
 */

export const FIXTURE_CHARACTER_ID = "char_test_abc123";
export const FIXTURE_NEW_CHARACTER_ID = "char_test_newxyz";

/** A fully-formed character suitable for the character sheet and builder. */
export const characterFixture = {
  characterId: FIXTURE_CHARACTER_ID,
  userId: "user_test_001",
  name: "Aldric Stonehallow",
  level: 1,
  classId: "class_guardian",
  className: "Guardian",
  subclassId: "subclass_stalwart",
  subclassName: "Stalwart",
  ancestryId: "ancestry_dwarf",
  ancestryName: "Dwarf",
  communityId: "community_mountainhome",
  communityName: "Mountainhome",
  experiences: [
    { name: "Miner", bonus: 2 },
    { name: "Soldier", bonus: 2 },
  ],
  traitBonuses: {
    agility: -1,
    cunning: 0,
    presence: 1,
    spellcast: 0,
    toughness: 2,
    wit: 1,
  },
  hp: { current: 6, max: 6 },
  stress: { current: 0, max: 6 },
  hope: 2,
  armor: { score: 3, slots: [false, false, false] },
  evasion: 9,
  damageThresholds: { minor: 4, major: 8, severe: 12 },
  weapons: {
    primary: {
      name: "Longsword",
      trait: "agility",
      damage: "d8",
      range: "melee",
      type: "physical",
      burden: "one-handed",
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
  domainLoadout: ["card_guardian_shield_bash", "card_guardian_hold_the_line"],
  domainVault: ["card_guardian_shield_bash", "card_guardian_hold_the_line"],
  inventory: ["Torch", "50 feet of rope", "Basic supplies", "Minor Health Potion"],
  gold: { handfuls: 1, bags: 0, chests: 0 },
  conditions: [],
  customConditions: [],
  notes: "",
  avatarUrl: null,
  companionState: null,
  downtimeProjects: [],
  createdAt: "2026-01-15T10:00:00Z",
  updatedAt: "2026-01-15T10:00:00Z",
};

/** Minimal character returned immediately after creation (pre-build-step). */
export const newCharacterFixture = {
  characterId: FIXTURE_NEW_CHARACTER_ID,
  userId: "user_test_001",
  name: "Sylvara Moonwhisper",
  level: 1,
  classId: "class_sorcerer",
  className: "Sorcerer",
  subclassId: null,
  subclassName: null,
  ancestryId: "ancestry_elf",
  ancestryName: "Elf",
  communityId: "community_wandering",
  communityName: "Wandering",
  experiences: [
    { name: "Scholar", bonus: 2 },
    { name: "Street Performer", bonus: 2 },
  ],
  traitBonuses: {},
  hp: { current: 5, max: 5 },
  stress: { current: 0, max: 6 },
  hope: 2,
  armor: { score: 0, slots: [] },
  evasion: 11,
  damageThresholds: { minor: 3, major: 6, severe: 9 },
  weapons: {
    primary: { name: null, trait: null, damage: null, range: null, type: null, burden: null, tier: null, feature: null },
    secondary: { name: null, trait: null, damage: null, range: null, type: null, burden: null, tier: null, feature: null },
  },
  domainLoadout: [],
  domainVault: [],
  inventory: [],
  gold: { handfuls: 0, bags: 0, chests: 0 },
  conditions: [],
  customConditions: [],
  notes: "",
  avatarUrl: null,
  companionState: null,
  downtimeProjects: [],
  createdAt: "2026-01-15T12:00:00Z",
  updatedAt: "2026-01-15T12:00:00Z",
};

/** List response for GET /characters */
export const characterListFixture = {
  characters: [
    {
      characterId: FIXTURE_CHARACTER_ID,
      name: "Aldric Stonehallow",
      className: "Guardian",
      subclassName: "Stalwart",
      ancestryName: "Dwarf",
      communityName: "Mountainhome",
      level: 1,
      avatarUrl: null,
      updatedAt: "2026-01-15T10:00:00Z",
    },
  ],
  cursor: null,
};

/** Single-class data for Guardian */
export const classFixture = {
  classId: "class_guardian",
  name: "Guardian",
  startingEvasion: 9,
  startingHitPoints: 6,
  domains: ["Valor", "Blade"],
  classFeature: {
    name: "Stalwart Defense",
    description: "You can mark an armor slot to reduce incoming damage by one threshold.",
    options: [],
  },
  mechanicalNotes: "Play Guardian when you want to be the immovable object.",
  subclasses: [
    {
      subclassId: "subclass_stalwart",
      name: "Stalwart",
      description: "You protect your allies by standing firm.",
      spellcastTrait: "toughness",
      foundationFeatures: [
        { name: "Iron Will", description: "Once per session, ignore a Severe damage result." },
      ],
      specializationFeature: { name: "Bulwark", description: "Allies behind you gain +1 Evasion." },
      masteryFeature: { name: "Fortress", description: "You cannot be moved without your consent." },
    },
  ],
};

/** Classes list response */
export const classesListFixture = {
  classes: [
    {
      classId: "class_guardian",
      name: "Guardian",
      subclasses: [{ subclassId: "subclass_stalwart", name: "Stalwart" }],
    },
    {
      classId: "class_sorcerer",
      name: "Sorcerer",
      subclasses: [{ subclassId: "subclass_arcane", name: "Arcane" }],
    },
  ],
};

/** Ancestries list */
export const ancestriesFixture = {
  ancestries: [
    {
      ancestryId: "ancestry_dwarf",
      name: "Dwarf",
      flavorText: "Stout and sturdy.",
      traitName: "Dwarven Resilience",
      traitDescription: "Mark a stress to ignore a Minor damage result.",
      secondTraitName: null,
      secondTraitDescription: null,
    },
    {
      ancestryId: "ancestry_elf",
      name: "Elf",
      flavorText: "Graceful and swift.",
      traitName: "Elven Swiftness",
      traitDescription: "Once per rest, move without spending an action.",
      secondTraitName: null,
      secondTraitDescription: null,
    },
  ],
};

/** Communities list */
export const communitiesFixture = {
  communities: [
    {
      communityId: "community_mountainhome",
      name: "Mountainhome",
      flavorText: "Carved from living stone.",
      traitName: "Mountain Knowledge",
      traitDescription: "Advantage on Presence rolls underground.",
    },
    {
      communityId: "community_wandering",
      name: "Wandering",
      flavorText: "No fixed roots.",
      traitName: "Road Wisdom",
      traitDescription: "Advantage on Wit rolls when navigating.",
    },
  ],
};

/** Domain cards list */
export const domainCardsFixture = {
  cards: [
    {
      cardId: "card_guardian_shield_bash",
      name: "Shield Bash",
      domain: "Valor",
      level: 1,
      recallCost: 1,
      description: "Make a Melee attack. On a success, push the target 1 space.",
    },
    {
      cardId: "card_guardian_hold_the_line",
      name: "Hold the Line",
      domain: "Blade",
      level: 1,
      recallCost: 1,
      description: "No enemies can pass through your space this turn.",
    },
  ],
};

/** User profile */
export const userProfileFixture = {
  userId: "user_test_001",
  email: "test@daggerheart.test",
  displayName: "Test User",
  createdAt: "2026-01-01T00:00:00Z",
};
