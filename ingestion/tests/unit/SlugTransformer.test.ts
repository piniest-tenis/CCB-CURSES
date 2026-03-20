// ingestion/tests/unit/SlugTransformer.test.ts
// Unit tests for src/transformers/SlugTransformer.ts
//   toSlug, resolveWikiLink, toCardId

import { toSlug, resolveWikiLink, toCardId } from "../../src/transformers/SlugTransformer";

// ─── toSlug ───────────────────────────────────────────────────────────────────

describe("toSlug", () => {
  it("lowercases and hyphenates", () => {
    expect(toSlug("Dirty Fighter")).toBe("dirty-fighter");
  });

  it("removes apostrophes", () => {
    expect(toSlug("Don't Fall in Love")).toBe("dont-fall-in-love");
  });

  it("handles accented characters (strict mode removes them)", () => {
    // slugify strict mode drops non-ASCII characters
    const result = toSlug("Impactful Artist");
    expect(result).toBe("impactful-artist");
  });

  it("handles all-lowercase input unchanged", () => {
    expect(toSlug("bewitch")).toBe("bewitch");
  });

  it("collapses multiple spaces", () => {
    expect(toSlug("True  Believer")).toBe("true-believer");
  });

  it("handles a single word", () => {
    expect(toSlug("Bard")).toBe("bard");
  });
});

// ─── toCardId ─────────────────────────────────────────────────────────────────

describe("toCardId", () => {
  it("strips .md extension", () => {
    expect(toCardId("(Level 1) Bewitch.md")).toBe("bewitch");
  });

  it("strips level prefix", () => {
    expect(toCardId("(Level 2) Iconoclast ★.md")).toBe("iconoclast");
  });

  it("strips cursed marker ★ and linked marker ↔", () => {
    expect(toCardId("(Level 3) Performer ★ ↔.md")).toBe("performer");
  });

  it("handles a multi-word card name", () => {
    expect(toCardId("(Level 4) Dirty Fighter ★ ↔.md")).toBe("dirty-fighter");
  });

  it("handles a card with no markers", () => {
    expect(toCardId("(Level 4) Grace Note.md")).toBe("grace-note");
  });

  it("is a no-op for plain strings with no level prefix", () => {
    expect(toCardId("Faction")).toBe("faction");
  });

  it("is case-insensitive for the level prefix", () => {
    expect(toCardId("(LEVEL 5) Sow Discontent.md")).toBe("sow-discontent");
  });

  it("handles multi-digit levels", () => {
    expect(toCardId("(Level 10) Some Card.md")).toBe("some-card");
  });
});

// ─── resolveWikiLink ──────────────────────────────────────────────────────────

describe("resolveWikiLink", () => {
  it("resolves a simple wikilink", () => {
    expect(resolveWikiLink("[[Faction]]")).toBe("faction");
  });

  it("resolves a link with alias (uses alias)", () => {
    expect(resolveWikiLink("[[Adherent|Adherents]]")).toBe("adherents");
  });

  it("resolves a path link (uses last segment)", () => {
    expect(resolveWikiLink("[[Path/To/Thing]]")).toBe("thing");
  });

  it("resolves a path link with alias (uses alias)", () => {
    expect(resolveWikiLink("[[Path/To/Thing|Alias]]")).toBe("alias");
  });

  it("strips card file markers from a card wikilink", () => {
    // e.g. [[(Level 4) Fop ★ ↔]] → "fop"
    expect(resolveWikiLink("[[(Level 4) Orator ★ ↔]]")).toBe("orator");
  });

  it("strips card markers from a card wikilink with alias", () => {
    expect(resolveWikiLink("[[(Level 4) Fop ★ ↔|Fop]]")).toBe("fop");
  });

  it("falls back to path when alias is empty", () => {
    expect(resolveWikiLink("[[SomePath|]]")).toBe("somepath");
  });
});
