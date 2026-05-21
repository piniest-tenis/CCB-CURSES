// backend/tests/unit/applyRest.test.ts
// Unit tests for the token-processing extension of applyRest.
// Covers: fill-to-cap, clear, add-1, trigger mismatch, uncapped/no-restAction.

import { applyRest } from "../../src/characters/helpers";
import type { Character, TokenConfig } from "@shared/types";

// ─── Fixture ──────────────────────────────────────────────────────────────────

function makeCharacter(overrides: Partial<Character> = {}): Character {
  return {
    characterId: "char-1",
    userId: "user-1",
    name: "Lyra",
    classId: "bard",
    className: "Bard",
    subclassId: null,
    subclassName: null,
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
      agility: 2,
      strength: 1,
      finesse: 1,
      instinct: 1,
      presence: 3,
      knowledge: 1,
    },
    derivedStats: { evasion: 10, armor: 0 },
    trackers: {
      hp:     { max: 6, marked: 3 },
      stress: { max: 6, marked: 4 },
      armor:  { max: 3, marked: 2 },
    },
    damageThresholds: { major: 10, severe: 15 },
    weapons: { primary: { weaponId: null }, secondary: { weaponId: null } },
    hope: 3,
    hopeMax: 6,
    proficiency: 1,
    experiences: [],
    conditions: [],
    domainLoadout: ["card-a", "card-b"],
    domainVault: [],
    classFeatureState: {},
    traitBonuses: {},
    notes: null,
    avatarKey: null,
    gold: { handfuls: 1, bags: 0, chests: 0 },
    inventory: [],
    cardTokens: { "card-a": 1, "card-b": 3 },
    downtimeProjects: [],
    activeAuras: [],
    companionState: null,
    reputationBonuses: {},
    favors: {},
    customConditions: [],
    spellcastTrait: null,
    ...(overrides as Record<string, unknown>),
  } as unknown as Character;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("applyRest — token processing", () => {
  // ── fill-to-cap on long rest ───────────────────────────────────────────────

  it("long-rest fill-to-cap: sets token count to resolved cap", () => {
    const char = makeCharacter({ cardTokens: { "card-a": 1 } });
    // cap = presence stat = 3
    const tokenConfigs: Record<string, TokenConfig> = {
      "card-a": {
        maxStat: "presence",
        restAction: { trigger: "long-rest", effect: "fill-to-cap" },
      },
    };
    const { character: result } = applyRest(char, "long", tokenConfigs);
    expect(result.cardTokens["card-a"]).toBe(3); // presence = 3
  });

  it("long-rest fill-to-cap with fixed numeric cap: sets count to cap", () => {
    const char = makeCharacter({ cardTokens: { "card-a": 0 } });
    const tokenConfigs: Record<string, TokenConfig> = {
      "card-a": {
        maxStat: 5,
        restAction: { trigger: "long-rest", effect: "fill-to-cap" },
      },
    };
    const { character: result } = applyRest(char, "long", tokenConfigs);
    expect(result.cardTokens["card-a"]).toBe(5);
  });

  it("long-rest fill-to-cap with null cap (uncapped): count unchanged", () => {
    const char = makeCharacter({ cardTokens: { "card-a": 2 } });
    const tokenConfigs: Record<string, TokenConfig> = {
      "card-a": {
        maxStat: null,
        restAction: { trigger: "long-rest", effect: "fill-to-cap" },
      },
    };
    const { character: result } = applyRest(char, "long", tokenConfigs);
    // null cap → skip fill-to-cap
    expect(result.cardTokens["card-a"]).toBe(2);
  });

  // ── clear on long rest ─────────────────────────────────────────────────────

  it("long-rest clear: sets token count to 0", () => {
    const char = makeCharacter({ cardTokens: { "card-b": 7 } });
    const tokenConfigs: Record<string, TokenConfig> = {
      "card-b": {
        maxStat: 6,
        restAction: { trigger: "long-rest", effect: "clear" },
      },
    };
    const { character: result } = applyRest(char, "long", tokenConfigs);
    expect(result.cardTokens["card-b"]).toBe(0);
  });

  // ── add-1 on matching rest ─────────────────────────────────────────────────

  it("short-rest add-1: increments token count by 1", () => {
    const char = makeCharacter({ cardTokens: { "card-a": 2 } });
    const tokenConfigs: Record<string, TokenConfig> = {
      "card-a": {
        maxStat: null,
        restAction: { trigger: "short-rest", effect: "add-1" },
      },
    };
    const { character: result } = applyRest(char, "short", tokenConfigs);
    expect(result.cardTokens["card-a"]).toBe(3);
  });

  it("long-rest add-1: increments token count by 1 (uncapped)", () => {
    const char = makeCharacter({ cardTokens: { "card-a": 10 } });
    const tokenConfigs: Record<string, TokenConfig> = {
      "card-a": {
        maxStat: 3,
        restAction: { trigger: "long-rest", effect: "add-1" },
      },
    };
    const { character: result } = applyRest(char, "long", tokenConfigs);
    // add-1 is always uncapped
    expect(result.cardTokens["card-a"]).toBe(11);
  });

  // ── trigger mismatch ──────────────────────────────────────────────────────

  it("short-rest trigger card on a long-rest call: count unchanged", () => {
    const char = makeCharacter({ cardTokens: { "card-a": 2 } });
    const tokenConfigs: Record<string, TokenConfig> = {
      "card-a": {
        maxStat: 5,
        restAction: { trigger: "short-rest", effect: "fill-to-cap" },
      },
    };
    const { character: result } = applyRest(char, "long", tokenConfigs);
    expect(result.cardTokens["card-a"]).toBe(2);
  });

  it("long-rest trigger card on a short-rest call: count unchanged", () => {
    const char = makeCharacter({ cardTokens: { "card-b": 3 } });
    const tokenConfigs: Record<string, TokenConfig> = {
      "card-b": {
        maxStat: 6,
        restAction: { trigger: "long-rest", effect: "clear" },
      },
    };
    const { character: result } = applyRest(char, "short", tokenConfigs);
    expect(result.cardTokens["card-b"]).toBe(3);
  });

  // ── no restAction ─────────────────────────────────────────────────────────

  it("uncapped card with no restAction: count unchanged", () => {
    const char = makeCharacter({ cardTokens: { "card-a": 4 } });
    const tokenConfigs: Record<string, TokenConfig> = {
      "card-a": { maxStat: null },
    };
    const { character: result } = applyRest(char, "long", tokenConfigs);
    expect(result.cardTokens["card-a"]).toBe(4);
  });

  it("card not in tokenConfigs: count unchanged", () => {
    const char = makeCharacter({ cardTokens: { "card-a": 5 } });
    const { character: result } = applyRest(char, "long", {});
    expect(result.cardTokens["card-a"]).toBe(5);
  });

  // ── default empty tokenConfigs (backward compat) ──────────────────────────

  it("no tokenConfigs argument: behaves as before (no token changes)", () => {
    const char = makeCharacter({ cardTokens: { "card-a": 2 } });
    const { character: result } = applyRest(char, "long");
    expect(result.cardTokens["card-a"]).toBe(2);
  });

  // ── multiple cards processed in one rest ──────────────────────────────────

  it("multiple cards: each processed independently", () => {
    const char = makeCharacter({
      cardTokens: { "card-a": 1, "card-b": 5 },
    });
    const tokenConfigs: Record<string, TokenConfig> = {
      "card-a": {
        maxStat: "presence", // presence = 3
        restAction: { trigger: "long-rest", effect: "fill-to-cap" },
      },
      "card-b": {
        maxStat: 6,
        restAction: { trigger: "long-rest", effect: "clear" },
      },
    };
    const { character: result } = applyRest(char, "long", tokenConfigs);
    expect(result.cardTokens["card-a"]).toBe(3);
    expect(result.cardTokens["card-b"]).toBe(0);
  });

  // ── standard rest mechanics still work ───────────────────────────────────

  it("long rest still clears hp/stress/armor and increments hope", () => {
    const char = makeCharacter();
    const { character: result, cleared } = applyRest(char, "long");
    expect(result.trackers.hp.marked).toBe(0);
    expect(result.trackers.stress.marked).toBe(0);
    expect(result.trackers.armor.marked).toBe(0);
    expect(result.hope).toBe(4); // 3 + 1
    expect(cleared.hp).toBe(3);
    expect(cleared.stress).toBe(4);
    expect(cleared.armor).toBe(2);
  });

  it("short rest still clears up to 2 stress", () => {
    const char = makeCharacter();
    const { character: result, cleared } = applyRest(char, "short");
    expect(result.trackers.stress.marked).toBe(2); // 4 - 2
    expect(cleared.stress).toBe(2);
  });
});
