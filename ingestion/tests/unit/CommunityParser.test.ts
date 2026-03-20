// ingestion/tests/unit/CommunityParser.test.ts
// Unit tests for src/parsers/CommunityParser.ts and AncestryParser.ts
//
// Uses real markdown fixtures from /markdown/Communities/.

import * as path from "path";
import * as fs from "fs";
import { parseCommunityFile } from "../../src/parsers/CommunityParser";
import { parseAncestryFile, parseAncestryDirectory } from "../../src/parsers/AncestryParser";

const COMMUNITIES_DIR = path.resolve(__dirname, "../../../markdown/Communities");
const ANCESTRIES_DIR = path.resolve(__dirname, "../../../markdown/Ancestries");

// ─── CommunityParser ──────────────────────────────────────────────────────────

describe("parseCommunityFile — Badlander.md", () => {
  const filePath = path.join(COMMUNITIES_DIR, "Badlander.md");
  let result: ReturnType<typeof parseCommunityFile>;

  beforeAll(() => {
    result = parseCommunityFile(filePath, "Badlander");
  });

  it("communityId is the slug of the name", () => {
    expect(result.communityId).toBe("badlander");
  });

  it("name is Badlander", () => {
    expect(result.name).toBe("Badlander");
  });

  it("flavorText is non-empty", () => {
    expect(result.flavorText.trim().length).toBeGreaterThan(0);
  });

  it("traitName is Staunch", () => {
    expect(result.traitName).toBe("Staunch");
  });

  it("traitDescription mentions Strength", () => {
    expect(result.traitDescription).toMatch(/Strength/);
  });

  it("source is homebrew", () => {
    expect(result.source).toBe("homebrew");
  });
});

describe("parseCommunityFile — name inferred from filename", () => {
  it("infers communityId from filename when no name provided", () => {
    const filePath = path.join(COMMUNITIES_DIR, "Badlander.md");
    const result = parseCommunityFile(filePath);
    expect(result.communityId).toBe("badlander");
    expect(result.name).toBe("Badlander");
  });
});

describe("parseCommunityFile — all community files", () => {
  const files = fs
    .readdirSync(COMMUNITIES_DIR)
    .filter((f) => f.endsWith(".md"));

  it("found at least 10 community files", () => {
    expect(files.length).toBeGreaterThanOrEqual(10);
  });

  files.forEach((filename) => {
    it(`parses ${filename} without throwing`, () => {
      expect(() => parseCommunityFile(path.join(COMMUNITIES_DIR, filename))).not.toThrow();
    });

    it(`${filename}: communityId is a non-empty slug`, () => {
      const result = parseCommunityFile(path.join(COMMUNITIES_DIR, filename));
      expect(result.communityId).toMatch(/^[a-z0-9-]+$/);
    });
  });
});

// ─── AncestryParser ───────────────────────────────────────────────────────────

describe("parseAncestryDirectory — missing directory", () => {
  it("returns empty array when directory does not exist", () => {
    const result = parseAncestryDirectory("/nonexistent/path/to/ancestries");
    expect(result).toEqual([]);
  });
});

// Only run these tests if the Ancestries directory exists on disk
const ancestriesExist = fs.existsSync(ANCESTRIES_DIR);

describe("parseAncestryFile — basic shape", () => {
  if (!ancestriesExist) {
    it.skip("Ancestries directory not found — skipping ancestry file tests", () => {});
    return;
  }

  const files = fs
    .readdirSync(ANCESTRIES_DIR)
    .filter((f) => f.endsWith(".md"))
    .slice(0, 3); // test first 3

  files.forEach((filename) => {
    it(`parses ${filename}`, () => {
      const result = parseAncestryFile(path.join(ANCESTRIES_DIR, filename));
      expect(result.ancestryId).toMatch(/^[a-z0-9-]+$/);
      expect(result.name).toBeTruthy();
      expect(result.source).toBe("homebrew");
    });
  });
});

describe("parseAncestryFile — empty file", () => {
  it("returns minimal record for empty file without throwing", () => {
    // Create a temp empty file
    const tmpFile = path.join(COMMUNITIES_DIR, "_test_empty.md");
    fs.writeFileSync(tmpFile, "");
    try {
      const { parseAncestryFile: paf } = require("../../src/parsers/AncestryParser");
      const result = paf(tmpFile, "TestAncestry");
      expect(result.ancestryId).toBe("testancestry");
      expect(result.flavorText).toBe("");
      expect(result.traitName).toBe("");
    } finally {
      fs.unlinkSync(tmpFile);
    }
  });
});
