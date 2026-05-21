// backend/tests/unit/tokenResolver.test.ts
// Unit tests for the shared Token Cap Resolver:
//   tierForLevel, resolveTokenCap

import { tierForLevel, resolveTokenCap } from "@shared/tokenResolver";
import type { Character } from "@shared/types";
import type { TokenConfig } from "@shared/types";

// ─── Character fixture ────────────────────────────────────────────────────────

function makeCharacter(overrides: Partial<Character> = {}): Character {
  return {
    characterId: "char-1",
    userId: "user-1",
    name: "Test Character",
    classId: "wizard",
    className: "Wizard",
    subclassId: "arcanist",
    subclassName: "Arcanist",
    communityId: null,
    communityName: null,
    ancestryId: null,
    ancestryName: null,
    level: 3,
    avatarUrl: null,
    updatedAt: "2024-01-01T00:00:00Z",
    createdAt: "2024-01-01T00:00:00Z",
    domains: [],
    stats: {
      agility: 1,
      strength: 2,
      finesse: 3,
      instinct: 4,
      presence: 5,
      knowledge: 6,
    },
    derivedStats: { evasion: 11, armor: 0 },
    trackers: {
      hp: { max: 6, marked: 0 },
      stress: { max: 6, marked: 0 },
      armor: { max: 0, marked: 0 },
    },
    damageThresholds: { major: 10, severe: 15 },
    weapons: {
      primary: { weaponId: null },
      secondary: { weaponId: null },
    },
    hope: 2,
    hopeMax: 6,
    proficiency: 1,
    experiences: [],
    conditions: [],
    domainLoadout: [],
    domainVault: [],
    classFeatureState: {},
    traitBonuses: {},
    notes: null,
    avatarKey: null,
    portraitKey: null,
    portraitUrl: null,
    activeArmorId: null,
    gold: { handfuls: 1, bags: 0, chests: 0 },
    inventory: [],
    cardTokens: {},
    downtimeProjects: [],
    activeAuras: [],
    companionState: null,
    reputationBonuses: {},
    favors: {},
    customConditions: [],
    levelUpHistory: {},
    markedTraits: [],
    spellcastTrait: "knowledge",
    campaignId: null,
    multiclassClassId: null,
    multiclassClassName: null,
    multiclassSubclassId: null,
    multiclassDomainId: null,
    multiclassClassFeatureIndex: null,
    ...overrides,
  };
}

// ─── tierForLevel ─────────────────────────────────────────────────────────────

describe("tierForLevel", () => {
  it("returns 1 for level 1", () => expect(tierForLevel(1)).toBe(1));
  it("returns 2 for level 2", () => expect(tierForLevel(2)).toBe(2));
  it("returns 2 for level 4", () => expect(tierForLevel(4)).toBe(2));
  it("returns 3 for level 5", () => expect(tierForLevel(5)).toBe(3));
  it("returns 3 for level 7", () => expect(tierForLevel(7)).toBe(3));
  it("returns 4 for level 8", () => expect(tierForLevel(8)).toBe(4));
  it("returns 4 for level 10", () => expect(tierForLevel(10)).toBe(4));
});

// ─── resolveTokenCap ──────────────────────────────────────────────────────────

describe("resolveTokenCap", () => {
  const char = makeCharacter();

  // CoreStatName variants
  it("resolves maxStat: 'agility'", () => {
    const config: TokenConfig = { maxStat: "agility" };
    expect(resolveTokenCap(config, char)).toBe(1);
  });

  it("resolves maxStat: 'strength'", () => {
    const config: TokenConfig = { maxStat: "strength" };
    expect(resolveTokenCap(config, char)).toBe(2);
  });

  it("resolves maxStat: 'finesse'", () => {
    const config: TokenConfig = { maxStat: "finesse" };
    expect(resolveTokenCap(config, char)).toBe(3);
  });

  it("resolves maxStat: 'instinct'", () => {
    const config: TokenConfig = { maxStat: "instinct" };
    expect(resolveTokenCap(config, char)).toBe(4);
  });

  it("resolves maxStat: 'presence'", () => {
    const config: TokenConfig = { maxStat: "presence" };
    expect(resolveTokenCap(config, char)).toBe(5);
  });

  it("resolves maxStat: 'knowledge'", () => {
    const config: TokenConfig = { maxStat: "knowledge" };
    expect(resolveTokenCap(config, char)).toBe(6);
  });

  // Special keys
  it("resolves maxStat: 'level'", () => {
    const config: TokenConfig = { maxStat: "level" };
    expect(resolveTokenCap(config, char)).toBe(3);
  });

  it("resolves maxStat: 'tier' for level 3 → tier 2", () => {
    const config: TokenConfig = { maxStat: "tier" };
    expect(resolveTokenCap(config, char)).toBe(2);
  });

  it("resolves maxStat: 'tier' for level 8 → tier 4", () => {
    const config: TokenConfig = { maxStat: "tier" };
    const highLevelChar = makeCharacter({ level: 8 });
    expect(resolveTokenCap(config, highLevelChar)).toBe(4);
  });

  it("resolves maxStat: 'spellcast' via character.spellcastTrait (knowledge = 6)", () => {
    const config: TokenConfig = { maxStat: "spellcast" };
    // char.spellcastTrait = "knowledge", char.stats.knowledge = 6
    expect(resolveTokenCap(config, char)).toBe(6);
  });

  it("resolves maxStat: 'spellcast' with different trait (presence = 5)", () => {
    const config: TokenConfig = { maxStat: "spellcast" };
    const bard = makeCharacter({ spellcastTrait: "presence" });
    expect(resolveTokenCap(config, bard)).toBe(5);
  });

  // Fixed number
  it("resolves maxStat: fixed number (4)", () => {
    const config: TokenConfig = { maxStat: 4 };
    expect(resolveTokenCap(config, char)).toBe(4);
  });

  it("resolves maxStat: fixed number (0)", () => {
    const config: TokenConfig = { maxStat: 0 };
    expect(resolveTokenCap(config, char)).toBe(0);
  });

  // null (uncapped)
  it("returns null when maxStat is null (uncapped)", () => {
    const config: TokenConfig = { maxStat: null };
    expect(resolveTokenCap(config, char)).toBeNull();
  });

  // spellcast with null spellcastTrait
  it("returns null when maxStat is 'spellcast' and spellcastTrait is null", () => {
    const config: TokenConfig = { maxStat: "spellcast" };
    const noSubclassChar = makeCharacter({ spellcastTrait: null });
    expect(resolveTokenCap(config, noSubclassChar)).toBeNull();
  });

  // restAction is irrelevant to cap resolution
  it("ignores restAction when resolving cap", () => {
    const config: TokenConfig = {
      maxStat: "level",
      restAction: { trigger: "long-rest", effect: "fill-to-cap" },
    };
    expect(resolveTokenCap(config, char)).toBe(3);
  });
});
