import { describe, it, expect } from "vitest";
import { cardHasTokens } from "../tokenUtils";
import type { DomainCard } from "@shared/types";

function makeCard(overrides: Partial<DomainCard> = {}): DomainCard {
  return {
    cardId: "test-card",
    domain: "arcana",
    level: 1,
    recallCost: 0,
    name: "Test Card",
    isCursed: false,
    isLinkedCurse: false,
    isGrimoire: false,
    description: "A test card.",
    curseText: null,
    linkedCardIds: [],
    grimoire: [],
    source: "srd" as const,
    ...overrides,
  };
}

describe("cardHasTokens", () => {
  it("returns false for a plain card with no tokens", () => {
    const card = makeCard();
    expect(cardHasTokens(card, {}, "test-card")).toBe(false);
  });

  it("returns false for a cursed card with no token pool", () => {
    const card = makeCard({ isCursed: true });
    expect(cardHasTokens(card, {}, "test-card")).toBe(false);
  });

  it("returns true for a card with tokenConfig", () => {
    const card = makeCard({ tokenConfig: { maxStat: "presence" } });
    expect(cardHasTokens(card, {}, "test-card")).toBe(true);
  });

  it("returns true when cardId exists in cardTokens", () => {
    const card = makeCard();
    expect(cardHasTokens(card, { "test-card": 2 }, "test-card")).toBe(true);
  });

  it("returns false when undefined card is passed", () => {
    expect(cardHasTokens(undefined, {}, "test-card")).toBe(false);
  });
});
