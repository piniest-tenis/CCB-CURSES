// backend/tests/unit/characters.helpers.test.ts
// Unit tests for the pure helper functions in src/characters/helpers.ts:
//   deepMerge, encodeCursor, decodeCursor, signShareToken, verifyShareToken,
//   validateSrdRules, applyRest, normalizeWeapons

import {
  deepMerge,
  encodeCursor,
  decodeCursor,
  signShareToken,
  verifyShareToken,
  validateSrdRules,
  applyRest,
  normalizeWeapons,
} from "../../src/characters/helpers";
import { AppError } from "../../src/common/middleware";
import type { Character } from "@shared/types";

// ─── Shared test fixtures ─────────────────────────────────────────────────────

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
    level: 1,
    avatarUrl: null,
    updatedAt: "2024-01-01T00:00:00Z",
    createdAt: "2024-01-01T00:00:00Z",
    domains: [],
    stats: { agility: 1, strength: 1, finesse: 1, instinct: 1, presence: 1, knowledge: 1 },
    derivedStats: { evasion: 10, armor: 0 },
    trackers: {
      hp: { max: 6, marked: 3 },
      stress: { max: 6, marked: 4 },
      armor: { max: 3, marked: 2 },
      proficiency: { max: 2, marked: 1 },
    },
    damageThresholds: { minor: 5, major: 10, severe: 15 },
    weapons: {
      primary: { name: "Dagger", trait: "finesse", damage: "1d6", range: "melee", type: "physical", burden: "one-handed" },
      secondary: { name: null, trait: null, damage: null, range: null, type: null, burden: null },
    },
    hope: 3,
    experiences: [],
    conditions: [],
    domainLoadout: [],
    domainVault: [],
    classFeatureState: {},
    notes: null,
    avatarKey: null,
    ...overrides,
  };
}

// ─── deepMerge ────────────────────────────────────────────────────────────────

describe("deepMerge", () => {
  it("primitive overwrite", () => {
    const result = deepMerge({ a: 1, b: 2 } as Record<string, unknown>, { a: 99 } as Record<string, unknown>);
    expect(result).toEqual({ a: 99, b: 2 });
  });

  it("nested objects merged recursively", () => {
    const base = { stats: { agility: 1, strength: 2 } } as Record<string, unknown>;
    const patch = { stats: { agility: 5 } } as Record<string, unknown>;
    const result = deepMerge(base, patch);
    expect(result.stats).toEqual({ agility: 5, strength: 2 });
  });

  it("arrays replaced outright (not merged)", () => {
    const base = { tags: ["a", "b", "c"] } as Record<string, unknown>;
    const patch = { tags: ["x"] } as Record<string, unknown>;
    const result = deepMerge(base, patch);
    expect(result.tags).toEqual(["x"]);
  });

  it("null patch value overwrites base", () => {
    const base = { notes: "hello" } as Record<string, unknown>;
    const patch = { notes: null } as Record<string, unknown>;
    const result = deepMerge(base, patch);
    expect(result.notes).toBeNull();
  });

  it("undefined patch values are ignored (base preserved)", () => {
    const base = { name: "Lyra" } as Record<string, unknown>;
    const patch = { name: undefined } as Record<string, unknown>;
    const result = deepMerge(base, patch);
    expect(result.name).toBe("Lyra");
  });

  it("deeply nested merge three levels", () => {
    const base = { a: { b: { c: 1, d: 2 } } } as Record<string, unknown>;
    const patch = { a: { b: { c: 99 } } } as Record<string, unknown>;
    const result = deepMerge(base, patch);
    expect((result.a as Record<string, unknown>).b).toEqual({ c: 99, d: 2 });
  });

  it("patch with null nested object replaces (does not merge into) the base", () => {
    const base = { stats: { agility: 1 } } as Record<string, unknown>;
    const patch = { stats: null } as Record<string, unknown>;
    const result = deepMerge(base, patch);
    expect(result.stats).toBeNull();
  });
});

// ─── encodeCursor / decodeCursor ──────────────────────────────────────────────

describe("encodeCursor / decodeCursor", () => {
  it("roundtrips a simple key", () => {
    const key = { PK: "USER#u1", SK: "CHARACTER#c1" };
    expect(decodeCursor(encodeCursor(key))).toEqual(key);
  });

  it("roundtrips a complex key with numbers", () => {
    const key = { id: "abc", page: 3, nested: { x: true } };
    expect(decodeCursor(encodeCursor(key as Record<string, unknown>))).toEqual(key);
  });

  it("decodeCursor throws AppError.badRequest on garbage input", () => {
    expect(() => decodeCursor("!!!not-base64-json!!!")).toThrow(AppError);
    try {
      decodeCursor("!!!not-base64-json!!!");
    } catch (e) {
      expect((e as AppError).statusCode).toBe(400);
    }
  });

  it("decodeCursor throws on base64 that is not JSON", () => {
    const notJson = Buffer.from("hello world").toString("base64");
    expect(() => decodeCursor(notJson)).toThrow(AppError);
  });
});

// ─── signShareToken / verifyShareToken ────────────────────────────────────────

describe("signShareToken / verifyShareToken", () => {
  const charId = "char-abc";
  const userId = "user-xyz";

  it("produces a three-part dot-separated token", () => {
    const exp = Math.floor(Date.now() / 1000) + 3600;
    const token = signShareToken(charId, userId, exp);
    expect(token.split(".")).toHaveLength(3);
  });

  it("verifyShareToken returns payload for a valid token", () => {
    const exp = Math.floor(Date.now() / 1000) + 3600;
    const token = signShareToken(charId, userId, exp);
    const payload = verifyShareToken(token, charId);
    expect(payload.characterId).toBe(charId);
    expect(payload.userId).toBe(userId);
    expect(payload.exp).toBe(exp);
  });

  it("rejects a tampered payload", () => {
    const exp = Math.floor(Date.now() / 1000) + 3600;
    const token = signShareToken(charId, userId, exp);
    const [h, , sig] = token.split(".");
    const tamperedPayload = Buffer.from(
      JSON.stringify({ type: "share", characterId: "evil-char", userId, exp })
    ).toString("base64url");
    const tamperedToken = `${h}.${tamperedPayload}.${sig}`;
    expect(() => verifyShareToken(tamperedToken, "evil-char")).toThrow(AppError);
  });

  it("rejects an expired token", () => {
    const exp = Math.floor(Date.now() / 1000) - 1; // 1 second ago
    const token = signShareToken(charId, userId, exp);
    expect(() => verifyShareToken(token, charId)).toThrow(AppError);
    try {
      verifyShareToken(token, charId);
    } catch (e) {
      expect((e as AppError).message).toMatch(/expired/i);
    }
  });

  it("rejects a token for a different character", () => {
    const exp = Math.floor(Date.now() / 1000) + 3600;
    const token = signShareToken(charId, userId, exp);
    expect(() => verifyShareToken(token, "other-char")).toThrow(AppError);
    try {
      verifyShareToken(token, "other-char");
    } catch (e) {
      expect((e as AppError).statusCode).toBe(403);
    }
  });

  it("rejects a malformed (non-3-part) token", () => {
    expect(() => verifyShareToken("only.two", charId)).toThrow(AppError);
  });
});

// ─── validateSrdRules ─────────────────────────────────────────────────────────

describe("validateSrdRules", () => {
  it("returns empty array for valid character", () => {
    expect(validateSrdRules(makeCharacter())).toHaveLength(0);
  });

  it("flags hope < 0", () => {
    const errors = validateSrdRules({ hope: -1 });
    expect(errors).toContainEqual(
      expect.objectContaining({ field: "hope" })
    );
  });

  it("flags hope > 6", () => {
    const errors = validateSrdRules({ hope: 7 });
    expect(errors).toContainEqual(expect.objectContaining({ field: "hope" }));
  });

  it("allows hope at boundaries 0 and 6", () => {
    expect(validateSrdRules({ hope: 0 })).toHaveLength(0);
    expect(validateSrdRules({ hope: 6 })).toHaveLength(0);
  });

  it("flags domainLoadout > 5 cards", () => {
    const errors = validateSrdRules({ domainLoadout: ["a", "b", "c", "d", "e", "f"] });
    expect(errors).toContainEqual(expect.objectContaining({ field: "domainLoadout" }));
  });

  it("allows domainLoadout with exactly 5 cards", () => {
    expect(validateSrdRules({ domainLoadout: ["a", "b", "c", "d", "e"] })).toHaveLength(0);
  });

  it("flags a stat < 0", () => {
    const errors = validateSrdRules({
      stats: { agility: -1, strength: 0, finesse: 0, instinct: 0, presence: 0, knowledge: 0 },
    });
    expect(errors).toContainEqual(expect.objectContaining({ field: "stats.agility" }));
  });

  it("flags a stat > 10", () => {
    const errors = validateSrdRules({
      stats: { agility: 11, strength: 0, finesse: 0, instinct: 0, presence: 0, knowledge: 0 },
    });
    expect(errors).toContainEqual(expect.objectContaining({ field: "stats.agility" }));
  });

  it("flags tracker marked > max", () => {
    const errors = validateSrdRules({
      trackers: {
        hp: { max: 6, marked: 7 },
        stress: { max: 6, marked: 0 },
        armor: { max: 3, marked: 0 },
        proficiency: { max: 2, marked: 0 },
      },
    });
    expect(errors).toContainEqual(expect.objectContaining({ field: "trackers.hp.marked" }));
  });

  it("does not flag tracker marked === max", () => {
    const errors = validateSrdRules({
      trackers: {
        hp: { max: 6, marked: 6 },
        stress: { max: 6, marked: 6 },
        armor: { max: 3, marked: 3 },
        proficiency: { max: 2, marked: 2 },
      },
    });
    expect(errors).toHaveLength(0);
  });

  it("flags level < 1", () => {
    const errors = validateSrdRules({ level: 0 });
    expect(errors).toContainEqual(expect.objectContaining({ field: "level" }));
  });

  it("flags level > 10", () => {
    const errors = validateSrdRules({ level: 11 });
    expect(errors).toContainEqual(expect.objectContaining({ field: "level" }));
  });

  it("allows level at boundaries 1 and 10", () => {
    expect(validateSrdRules({ level: 1 })).toHaveLength(0);
    expect(validateSrdRules({ level: 10 })).toHaveLength(0);
  });

  it("accumulates multiple errors", () => {
    const errors = validateSrdRules({ hope: -1, level: 0 });
    expect(errors.length).toBeGreaterThanOrEqual(2);
  });
});

// ─── applyRest ────────────────────────────────────────────────────────────────

describe("applyRest", () => {
  describe("short rest", () => {
    it("clears exactly 2 stress when stress.marked >= 2", () => {
      const char = makeCharacter({ trackers: { hp: { max: 6, marked: 3 }, stress: { max: 6, marked: 4 }, armor: { max: 3, marked: 2 }, proficiency: { max: 2, marked: 0 } } });
      const { character: result, cleared } = applyRest(char, "short");
      expect(result.trackers.stress.marked).toBe(2); // 4 - 2
      expect(cleared.stress).toBe(2);
    });

    it("clears all stress when stress.marked < 2", () => {
      const char = makeCharacter({ trackers: { hp: { max: 6, marked: 3 }, stress: { max: 6, marked: 1 }, armor: { max: 3, marked: 2 }, proficiency: { max: 2, marked: 0 } } });
      const { character: result, cleared } = applyRest(char, "short");
      expect(result.trackers.stress.marked).toBe(0);
      expect(cleared.stress).toBe(1);
    });

    it("does not change hp or armor", () => {
      const char = makeCharacter();
      const { character: result } = applyRest(char, "short");
      expect(result.trackers.hp.marked).toBe(char.trackers.hp.marked);
      expect(result.trackers.armor.marked).toBe(char.trackers.armor.marked);
    });

    it("does not change hope", () => {
      const char = makeCharacter({ hope: 3 });
      const { character: result } = applyRest(char, "short");
      expect(result.hope).toBe(3);
    });

    it("cleared.hp and cleared.armor are 0", () => {
      const char = makeCharacter();
      const { cleared } = applyRest(char, "short");
      expect(cleared.hp).toBe(0);
      expect(cleared.armor).toBe(0);
    });
  });

  describe("long rest", () => {
    it("clears all hp, stress, and armor marks", () => {
      const char = makeCharacter();
      const { character: result, cleared } = applyRest(char, "long");
      expect(result.trackers.hp.marked).toBe(0);
      expect(result.trackers.stress.marked).toBe(0);
      expect(result.trackers.armor.marked).toBe(0);
      expect(cleared.hp).toBe(char.trackers.hp.marked);
      expect(cleared.stress).toBe(char.trackers.stress.marked);
      expect(cleared.armor).toBe(char.trackers.armor.marked);
    });

    it("increments hope by 1", () => {
      const char = makeCharacter({ hope: 3 });
      const { character: result } = applyRest(char, "long");
      expect(result.hope).toBe(4);
    });

    it("caps hope at 6", () => {
      const char = makeCharacter({ hope: 6 });
      const { character: result } = applyRest(char, "long");
      expect(result.hope).toBe(6);
    });

    it("hope at 5 increments to 6", () => {
      const char = makeCharacter({ hope: 5 });
      const { character: result } = applyRest(char, "long");
      expect(result.hope).toBe(6);
    });

    it("preserves max values for all trackers", () => {
      const char = makeCharacter();
      const { character: result } = applyRest(char, "long");
      expect(result.trackers.hp.max).toBe(char.trackers.hp.max);
      expect(result.trackers.stress.max).toBe(char.trackers.stress.max);
      expect(result.trackers.armor.max).toBe(char.trackers.armor.max);
    });
  });
});

// ─── normalizeWeapons ─────────────────────────────────────────────────────────

describe("normalizeWeapons", () => {
  it("coerces undefined fields to null", () => {
    const result = normalizeWeapons({ primary: {}, secondary: {} });
    expect(result.primary.name).toBeNull();
    expect(result.primary.type).toBeNull();
    expect(result.secondary.burden).toBeNull();
  });

  it("preserves provided non-null values", () => {
    const result = normalizeWeapons({
      primary: { name: "Sword", type: "physical", burden: "one-handed", damage: "1d8", range: "melee", trait: "strength" },
    });
    expect(result.primary.name).toBe("Sword");
    expect(result.primary.type).toBe("physical");
  });

  it("preserves null values as null", () => {
    const result = normalizeWeapons({
      primary: { name: null, type: null },
    });
    expect(result.primary.name).toBeNull();
    expect(result.primary.type).toBeNull();
  });

  it("handles completely undefined slots", () => {
    const result = normalizeWeapons({});
    expect(result.primary).toEqual({
      name: null, trait: null, damage: null, range: null, type: null, burden: null,
    });
    expect(result.secondary).toEqual({
      name: null, trait: null, damage: null, range: null, type: null, burden: null,
    });
  });
});
