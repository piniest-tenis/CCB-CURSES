// backend/tests/unit/applyAction.test.ts
// Unit tests for applyAction — specifically:
//   - add-token cap enforcement (with tokenConfig injected)
//   - fill-tokens action

import { applyAction } from "../../src/characters/helpers";
import { AppError } from "../../src/common/middleware";
import type { Character, TokenConfig } from "@shared/types";

// ─── Fixture ──────────────────────────────────────────────────────────────────

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

// ─── add-token ────────────────────────────────────────────────────────────────

describe("applyAction — add-token", () => {
  const CARD_ID = "shadow-step";

  it("increments token count normally (no tokenConfig)", () => {
    const char = makeCharacter({ cardTokens: { [CARD_ID]: 2 } });
    const result = applyAction(char, "add-token", { cardId: CARD_ID });
    expect(result.cardTokens[CARD_ID]).toBe(3);
  });

  it("increments on first token when no prior cardTokens entry", () => {
    const char = makeCharacter(); // cardTokens: {}
    const result = applyAction(char, "add-token", { cardId: CARD_ID });
    expect(result.cardTokens[CARD_ID]).toBe(1);
  });

  it("succeeds when cap is null (uncapped)", () => {
    const config: TokenConfig = { maxStat: null };
    const char = makeCharacter({ cardTokens: { [CARD_ID]: 999 } });
    const result = applyAction(char, "add-token", { cardId: CARD_ID }, config);
    expect(result.cardTokens[CARD_ID]).toBe(1000);
  });

  it("succeeds when newCount equals the resolved cap exactly", () => {
    // cap = fixed 3; current = 2 → newCount = 3 = cap → allowed
    const config: TokenConfig = { maxStat: 3 };
    const char = makeCharacter({ cardTokens: { [CARD_ID]: 2 } });
    const result = applyAction(char, "add-token", { cardId: CARD_ID }, config);
    expect(result.cardTokens[CARD_ID]).toBe(3);
  });

  it("rejects with domain error when newCount exceeds resolved cap (fixed number)", () => {
    // cap = fixed 3; current = 3 → newCount = 4 > cap → error
    const config: TokenConfig = { maxStat: 3 };
    const char = makeCharacter({ cardTokens: { [CARD_ID]: 3 } });
    expect(() =>
      applyAction(char, "add-token", { cardId: CARD_ID }, config)
    ).toThrow(AppError);
  });

  it("rejects with INVALID_ACTION code when cap exceeded", () => {
    const config: TokenConfig = { maxStat: 2 };
    const char = makeCharacter({ cardTokens: { [CARD_ID]: 2 } });
    let caught: AppError | undefined;
    try {
      applyAction(char, "add-token", { cardId: CARD_ID }, config);
    } catch (e) {
      caught = e as AppError;
    }
    expect(caught).toBeInstanceOf(AppError);
    expect(caught?.code).toBe("INVALID_ACTION");
    expect(caught?.statusCode).toBe(422);
  });

  it("rejects when cap is derived from a stat (presence = 5) and current = 5", () => {
    // char.stats.presence = 5; current = 5 → newCount = 6 > 5 → error
    const config: TokenConfig = { maxStat: "presence" };
    const char = makeCharacter({ cardTokens: { [CARD_ID]: 5 } });
    expect(() =>
      applyAction(char, "add-token", { cardId: CARD_ID }, config)
    ).toThrow(AppError);
  });

  it("succeeds when cap is derived from a stat and newCount is within cap", () => {
    // char.stats.presence = 5; current = 3 → newCount = 4 ≤ 5 → ok
    const config: TokenConfig = { maxStat: "presence" };
    const char = makeCharacter({ cardTokens: { [CARD_ID]: 3 } });
    const result = applyAction(char, "add-token", { cardId: CARD_ID }, config);
    expect(result.cardTokens[CARD_ID]).toBe(4);
  });

  it("succeeds when spellcastTrait is null (resolvedCap = null → uncapped)", () => {
    const config: TokenConfig = { maxStat: "spellcast" };
    const char = makeCharacter({ spellcastTrait: null, cardTokens: { [CARD_ID]: 99 } });
    const result = applyAction(char, "add-token", { cardId: CARD_ID }, config);
    expect(result.cardTokens[CARD_ID]).toBe(100);
  });
});

// ─── fill-tokens ──────────────────────────────────────────────────────────────

describe("applyAction — fill-tokens", () => {
  const CARD_ID = "arcane-ward";

  it("sets cardTokens[cardId] to the resolved cap (fixed number)", () => {
    const config: TokenConfig = { maxStat: 4 };
    const char = makeCharacter({ cardTokens: { [CARD_ID]: 1 } });
    const result = applyAction(char, "fill-tokens", { cardId: CARD_ID }, config);
    expect(result.cardTokens[CARD_ID]).toBe(4);
  });

  it("sets cardTokens[cardId] to the resolved cap (stat-based)", () => {
    // char.stats.knowledge = 6
    const config: TokenConfig = { maxStat: "knowledge" };
    const char = makeCharacter({ cardTokens: { [CARD_ID]: 0 } });
    const result = applyAction(char, "fill-tokens", { cardId: CARD_ID }, config);
    expect(result.cardTokens[CARD_ID]).toBe(6);
  });

  it("sets cardTokens[cardId] to the resolved cap (level-based)", () => {
    // char.level = 3
    const config: TokenConfig = { maxStat: "level" };
    const char = makeCharacter();
    const result = applyAction(char, "fill-tokens", { cardId: CARD_ID }, config);
    expect(result.cardTokens[CARD_ID]).toBe(3);
  });

  it("is a no-op when maxStat is null (uncapped)", () => {
    const config: TokenConfig = { maxStat: null };
    const char = makeCharacter({ cardTokens: { [CARD_ID]: 2 } });
    const result = applyAction(char, "fill-tokens", { cardId: CARD_ID }, config);
    expect(result.cardTokens[CARD_ID]).toBe(2);
  });

  it("is a no-op when tokenConfig is not provided", () => {
    const char = makeCharacter({ cardTokens: { [CARD_ID]: 2 } });
    const result = applyAction(char, "fill-tokens", { cardId: CARD_ID });
    expect(result.cardTokens[CARD_ID]).toBe(2);
  });

  it("is a no-op when spellcastTrait is null (resolvedCap = null)", () => {
    const config: TokenConfig = { maxStat: "spellcast" };
    const char = makeCharacter({ spellcastTrait: null, cardTokens: { [CARD_ID]: 3 } });
    const result = applyAction(char, "fill-tokens", { cardId: CARD_ID }, config);
    expect(result.cardTokens[CARD_ID]).toBe(3);
  });

  it("fills from 0 when no prior cardTokens entry", () => {
    const config: TokenConfig = { maxStat: 5 };
    const char = makeCharacter(); // cardTokens: {}
    const result = applyAction(char, "fill-tokens", { cardId: CARD_ID }, config);
    expect(result.cardTokens[CARD_ID]).toBe(5);
  });
});
