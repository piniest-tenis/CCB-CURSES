// backend/tests/unit/tokenExtractor.test.ts
// Table-driven unit tests for the pure tokenExtractor function.

import { tokenExtractor } from "@shared/tokenExtractor";
import type { TokenConfig } from "@shared/types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function tc(maxStat: TokenConfig["maxStat"], restAction?: TokenConfig["restAction"]): TokenConfig {
  const c: TokenConfig = { maxStat };
  if (restAction) c.restAction = restAction;
  return c;
}

// ─── Table-driven tests ───────────────────────────────────────────────────────

describe("tokenExtractor", () => {
  // ── Returns null when no token language ────────────────────────────────────
  describe("no token language → null", () => {
    const cases: Array<[string, string]> = [
      ["empty string", ""],
      ["plain description", "You gain +1 to your Agility rolls."],
      ["bare word token", "This card has a token on it."],
      ["unrelated text", "When you roll with Hope, you may reroll one die."],
    ];

    test.each(cases)("%s", (_label, text) => {
      expect(tokenExtractor(text)).toBeNull();
    });
  });

  // ── Action-verb detection patterns ─────────────────────────────────────────
  describe("action-verb detection patterns", () => {
    const cases: Array<[string, string, TokenConfig]> = [
      [
        "place a token",
        "You may place a token on this card.",
        tc(null),
      ],
      [
        "spend a token",
        "Spend a token to activate this ability.",
        tc(null),
      ],
      [
        "tokens equal",
        "The number of tokens equal to your level.",
        tc("level"),
      ],
      [
        "a number of tokens",
        "Place a number of tokens on this card equal to your Agility.",
        tc("agility"),
      ],
      [
        "tokens to this card",
        "Add tokens to this card when you rest.",
        tc(null),
      ],
      [
        "add N tokens",
        "You may add two tokens to this card.",
        tc(null),
      ],
      [
        "two tokens",
        "Place two tokens on this card.",
        tc(null),
      ],
      [
        "three tokens",
        "Place three tokens on this card.",
        tc(null),
      ],
    ];

    test.each(cases)("%s", (_label, text, expected) => {
      expect(tokenExtractor(text)).toEqual(expected);
    });
  });

  // ── Stat normalization ──────────────────────────────────────────────────────
  describe("stat normalization", () => {
    const cases: Array<[string, string, TokenConfig]> = [
      ["Agility", "Place a token equal to your Agility.", tc("agility")],
      ["Strength", "Place a token equal to your Strength.", tc("strength")],
      ["Finesse", "Place a token equal to your Finesse.", tc("finesse")],
      ["Instinct", "Place a token equal to your Instinct.", tc("instinct")],
      ["Presence", "Place a token equal to your Presence.", tc("presence")],
      ["Knowledge", "Place a token equal to your Knowledge.", tc("knowledge")],
      ["level", "Tokens equal to your level.", tc("level")],
      ["tier", "Place a token equal to your tier.", tc("tier")],
      ["spellcast trait", "Place a token equal to your spellcast trait.", tc("spellcast")],
      ["spellcast (bare)", "Tokens equal to your spellcast.", tc("spellcast")],
      [
        "no stat reference → maxStat null",
        "Place a token on this card.",
        tc(null),
      ],
    ];

    test.each(cases)("%s", (_label, text, expected) => {
      expect(tokenExtractor(text)).toEqual(expected);
    });
  });

  // ── Compound formula → maxStat null ────────────────────────────────────────
  describe("compound formula → maxStat null", () => {
    const cases: Array<[string, string]> = [
      [
        "level + cursed cards in loadout",
        "Place a number of tokens equal to your level + cursed cards in loadout.",
      ],
      [
        "level + other stat",
        "Tokens equal to your level + Agility.",
      ],
    ];

    test.each(cases)("%s", (_label, text) => {
      const result = tokenExtractor(text);
      expect(result).not.toBeNull();
      expect(result!.maxStat).toBeNull();
    });
  });

  // ── Once per rest → fixed cap + long-rest fill-to-cap ──────────────────────
  describe("once per rest", () => {
    test("once per rest → maxStat 1, long-rest fill-to-cap", () => {
      const text = "Once per rest, you may spend a token to reroll a die.";
      expect(tokenExtractor(text)).toEqual(
        tc(1, { trigger: "long-rest", effect: "fill-to-cap" })
      );
    });
  });

  // ── Long-rest fill-to-cap ───────────────────────────────────────────────────
  describe("long-rest fill-to-cap", () => {
    const cases: Array<[string, string]> = [
      [
        "after a long rest",
        "Place a number of tokens equal to your Presence. After a long rest, add tokens to this card.",
      ],
      [
        "when you take a long rest",
        "Tokens equal to your level. When you take a long rest, place tokens on this card.",
      ],
    ];

    test.each(cases)("%s", (_label, text) => {
      const result = tokenExtractor(text);
      expect(result).not.toBeNull();
      expect(result!.restAction).toEqual({ trigger: "long-rest", effect: "fill-to-cap" });
    });
  });

  // ── Session-start clear ─────────────────────────────────────────────────────
  describe("session-start clear", () => {
    const cases: Array<[string, string]> = [
      [
        "at the beginning of a session",
        "Place a token on this card. At the beginning of a session, clear all tokens.",
      ],
      [
        "at the start of a session",
        "Spend a token to activate. At the start of a session, clear tokens from this card.",
      ],
    ];

    test.each(cases)("%s", (_label, text) => {
      const result = tokenExtractor(text);
      expect(result).not.toBeNull();
      expect(result!.restAction).toEqual({ trigger: "session-start", effect: "clear" });
    });
  });
});
