// ingestion/tests/unit/DomainCardParser.test.ts
// Unit tests for src/parsers/DomainCardParser.ts
//
// Uses real markdown fixture files from /markdown/Domains/Artistry/.

import * as path from "path";
import * as fs from "fs";
import { parseDomainCardFile } from "../../src/parsers/DomainCardParser";

const ARTISTRY_DIR = path.resolve(__dirname, "../../../markdown/Domains/Artistry");

// ─── Simple card (no curse, no grimoire) ──────────────────────────────────────

describe("parseDomainCardFile — (Level 1) Bewitch.md", () => {
  const filePath = path.join(ARTISTRY_DIR, "(Level 1) Bewitch.md");
  let result: ReturnType<typeof parseDomainCardFile>;

  beforeAll(() => {
    result = parseDomainCardFile(filePath, "artistry");
  });

  it("cardId is slug of the name", () => {
    expect(result.cardId).toBe("bewitch");
  });

  it("domain is correct", () => {
    expect(result.domain).toBe("artistry");
  });

  it("level is 1", () => {
    expect(result.level).toBe(1);
  });

  it("name is Bewitch", () => {
    expect(result.name).toBe("Bewitch");
  });

  it("is not cursed", () => {
    expect(result.isCursed).toBe(false);
  });

  it("is not a linked curse", () => {
    expect(result.isLinkedCurse).toBe(false);
  });

  it("description is non-empty", () => {
    expect(result.description.trim().length).toBeGreaterThan(0);
  });

  it("curseText is null", () => {
    expect(result.curseText).toBeNull();
  });

  it("linkedCardIds reflects wikilinks found in the description", () => {
    // Bewitch's description contains [[Character]] and [[Creature]] wikilinks,
    // which the parser extracts as linked card slugs.
    expect(result.linkedCardIds).toContain("character");
    expect(result.linkedCardIds).toContain("creature");
  });

  it("grimoire is empty", () => {
    expect(result.grimoire).toEqual([]);
  });

  it("source is homebrew", () => {
    expect(result.source).toBe("homebrew");
  });
});

// ─── Cursed card (★) ──────────────────────────────────────────────────────────

describe("parseDomainCardFile — (Level 2) Iconoclast ★.md", () => {
  const filePath = path.join(ARTISTRY_DIR, "(Level 2) Iconoclast ★.md");
  let result: ReturnType<typeof parseDomainCardFile>;

  beforeAll(() => {
    result = parseDomainCardFile(filePath, "artistry");
  });

  it("cardId is 'iconoclast'", () => {
    expect(result.cardId).toBe("iconoclast");
  });

  it("level is 2", () => {
    expect(result.level).toBe(2);
  });

  it("isCursed is true", () => {
    expect(result.isCursed).toBe(true);
  });

  it("description is non-empty (content before ***)", () => {
    expect(result.description.trim().length).toBeGreaterThan(0);
  });

  it("curseText is non-empty (content after ***)", () => {
    expect(result.curseText).not.toBeNull();
    expect(result.curseText!.trim().length).toBeGreaterThan(0);
  });

  it("curseText starts with the Curse label content", () => {
    // The curse section starts with **Curse**: …
    expect(result.curseText).toMatch(/Curse|negative/i);
  });
});

// ─── Cursed + linked card (★ ↔) ───────────────────────────────────────────────

describe("parseDomainCardFile — (Level 4) Orator ★ ↔.md", () => {
  const filePath = path.join(ARTISTRY_DIR, "(Level 4) Orator ★ ↔.md");
  let result: ReturnType<typeof parseDomainCardFile>;

  beforeAll(() => {
    result = parseDomainCardFile(filePath, "artistry");
  });

  it("cardId is 'orator'", () => {
    expect(result.cardId).toBe("orator");
  });

  it("level is 4", () => {
    expect(result.level).toBe(4);
  });

  it("isCursed is true", () => {
    expect(result.isCursed).toBe(true);
  });

  it("isLinkedCurse is true", () => {
    expect(result.isLinkedCurse).toBe(true);
  });

  it("curseText contains the linked card reference", () => {
    expect(result.curseText).toMatch(/Predator|favor/i);
  });

  it("linkedCardIds contains the referenced card slug", () => {
    // The curse text references [[(Level 3) Predator ★ ↔]]
    expect(result.linkedCardIds).toContain("predator");
  });
});

// ─── All Artistry cards parse without throwing ────────────────────────────────

describe("parseDomainCardFile — all Artistry cards", () => {
  const cardFiles = fs
    .readdirSync(ARTISTRY_DIR)
    .filter((f) => f.endsWith(".md") && f !== "Artistry.md");

  it(`found at least 10 cards`, () => {
    expect(cardFiles.length).toBeGreaterThanOrEqual(10);
  });

  cardFiles.forEach((filename) => {
    it(`parses ${filename} without throwing`, () => {
      const filePath = path.join(ARTISTRY_DIR, filename);
      expect(() => parseDomainCardFile(filePath, "artistry")).not.toThrow();
    });

    it(`${filename}: cardId is a non-empty slug`, () => {
      const filePath = path.join(ARTISTRY_DIR, filename);
      const card = parseDomainCardFile(filePath, "artistry");
      expect(card.cardId).toMatch(/^[a-z0-9-]+$/);
      expect(card.cardId.length).toBeGreaterThan(0);
    });

    it(`${filename}: level is between 1 and 5`, () => {
      const filePath = path.join(ARTISTRY_DIR, filename);
      const card = parseDomainCardFile(filePath, "artistry");
      expect(card.level).toBeGreaterThanOrEqual(1);
      expect(card.level).toBeLessThanOrEqual(5);
    });
  });
});
