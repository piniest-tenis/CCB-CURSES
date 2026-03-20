// ingestion/tests/unit/ClassParser.test.ts
// Unit tests for src/parsers/ClassParser.ts
//
// Uses real markdown fixture files from the /markdown/Classes/ directory.
// No fabrication of game content — fixtures are read from disk.

import * as path from "path";
import { parseClassFile } from "../../src/parsers/ClassParser";

const CLASSES_DIR = path.resolve(__dirname, "../../../markdown/Classes");

// ─── Devout ───────────────────────────────────────────────────────────────────

describe("parseClassFile — Devout.md", () => {
  const devoutPath = path.join(CLASSES_DIR, "Devout.md");
  let result: ReturnType<typeof parseClassFile>;

  beforeAll(() => {
    result = parseClassFile(devoutPath, "Devout");
  });

  it("classId is the slug of the name", () => {
    expect(result.classId).toBe("devout");
  });

  it("name matches the provided name", () => {
    expect(result.name).toBe("Devout");
  });

  it("parses the two domains from the stats table", () => {
    // The table contains [[Artistry]] & [[Faithful]] — parser preserves casing from wikilinks
    expect(result.domains).toHaveLength(2);
    expect(result.domains).toContain("Artistry");
    expect(result.domains).toContain("Faithful");
  });

  it("parses startingEvasion from the stats table", () => {
    expect(result.startingEvasion).toBe(10);
  });

  it("parses startingHitPoints from the stats table", () => {
    expect(result.startingHitPoints).toBe(6);
  });

  it("parses the hope feature", () => {
    expect(result.hopeFeature).toBeDefined();
    expect(result.hopeFeature.name).toBe("Perseverance");
    expect(result.hopeFeature.hopeCost).toBe(3);
    expect(result.hopeFeature.description).toMatch(/Hope/);
  });

  it("parses the class feature name and options", () => {
    expect(result.classFeature.name).toBe("Inspiration");
    expect(result.classFeature.options.length).toBeGreaterThan(0);
  });

  it("parses subclass summaries", () => {
    expect(result.subclasses.length).toBe(2);
    const names = result.subclasses.map((s) => s.name);
    expect(names).toContain("Impactful Artist");
    expect(names).toContain("True Believer");
  });

  it("parses subclass spellcast trait", () => {
    const impactful = result.subclasses.find((s) => s.name === "Impactful Artist");
    expect(impactful).toBeDefined();
    expect(impactful!.spellcastTrait).toBe("presence");
  });

  it("parses subclass foundation features", () => {
    const impactful = result.subclasses.find((s) => s.name === "Impactful Artist");
    expect(impactful!.foundationFeatures.length).toBeGreaterThan(0);
    expect(impactful!.foundationFeatures[0].name).toBeTruthy();
  });

  it("parses subclass specialization and mastery features", () => {
    const impactful = result.subclasses.find((s) => s.name === "Impactful Artist");
    expect(impactful!.specializationFeature.name).toBeTruthy();
    expect(impactful!.masteryFeature.name).toBeTruthy();
  });

  it("parses background questions", () => {
    expect(result.backgroundQuestions.length).toBeGreaterThan(0);
    expect(result.backgroundQuestions[0]).toMatch(/deity|art|perform|influence/i);
  });

  it("parses connection questions", () => {
    expect(result.connectionQuestions.length).toBeGreaterThan(0);
  });

  it("parses mechanical notes", () => {
    expect(result.mechanicalNotes.length).toBeGreaterThan(0);
    expect(result.mechanicalNotes).toMatch(/Inspiration|Devout|Bard|Impactful|True/i);
  });

  it("source is homebrew", () => {
    expect(result.source).toBe("homebrew");
  });
});

// ─── Filename-stem inference ──────────────────────────────────────────────────

describe("parseClassFile — classId inferred from filename", () => {
  it("infers classId from filename when no name is provided", () => {
    const devoutPath = path.join(CLASSES_DIR, "Devout.md");
    const result = parseClassFile(devoutPath); // no name arg
    expect(result.classId).toBe("devout");
    expect(result.name).toBe("Devout");
  });
});

// ─── A second class for coverage ─────────────────────────────────────────────

describe("parseClassFile — Knave.md", () => {
  const knavePath = path.join(CLASSES_DIR, "Knave.md");

  it("parses without throwing", () => {
    expect(() => parseClassFile(knavePath)).not.toThrow();
  });

  it("has at least one subclass", () => {
    const result = parseClassFile(knavePath);
    expect(result.subclasses.length).toBeGreaterThan(0);
  });

  it("has a valid startingEvasion > 0", () => {
    const result = parseClassFile(knavePath);
    expect(result.startingEvasion).toBeGreaterThan(0);
  });
});

// ─── All 30 classes parse without throwing ───────────────────────────────────

import * as fs from "fs";

describe("parseClassFile — all class files", () => {
  const allFiles = fs.readdirSync(CLASSES_DIR).filter((f) => f.endsWith(".md"));
  // "Classes.md" is a Waypoint index file, not a real class — skip it
  const classFiles = allFiles.filter((f) => f !== "Classes.md");

  it(`found at least 10 class files in ${CLASSES_DIR}`, () => {
    expect(classFiles.length).toBeGreaterThanOrEqual(10);
  });

  classFiles.forEach((filename) => {
    it(`parses ${filename} without throwing`, () => {
      const filePath = path.join(CLASSES_DIR, filename);
      expect(() => parseClassFile(filePath)).not.toThrow();
    });

    it(`${filename}: has at least 1 subclass`, () => {
      const filePath = path.join(CLASSES_DIR, filename);
      const result = parseClassFile(filePath);
      expect(result.subclasses.length).toBeGreaterThanOrEqual(1);
    });
  });
});
