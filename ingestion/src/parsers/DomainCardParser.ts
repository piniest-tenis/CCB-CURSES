// ingestion/src/parsers/DomainCardParser.ts
// Parses a Daggerheart domain card markdown file into a DomainCard object.
//
// Filename format: `(Level N) Card Name [★] [↔].md`
//
// Content variants (verified against actual files):
//
// A. Simple card (no ★, no grimoire):
//    Plain description prose, possibly with [[WikiLink]] references.
//    Example: (Level 1) Bewitch.md
//
// B. Cursed card (★ in filename):
//    Description prose
//    *** or --- horizontal rule separator
//    **Curse**: Curse text prose (may span multiple lines)
//    Example: (Level 2) Iconoclast ★.md
//
// C. Grimoire card (first content line is "**Grimoire**"):
//    **Grimoire**
//    [blank]
//    **AbilityName**: description
//    **AbilityName**: description
//    ...
//    Example: (Level 1) Any Means Necessary.md
//
// D. Grimoire + Cursed (★ + Grimoire header + separator):
//    **Grimoire**
//    **AbilityName**: description
//    **AbilityName**: description
//    ---
//    **Curse**: Curse text
//    Example: (Level 4) Dirty Fighter ★ ↔.md
//
// [[WikiLink]] patterns anywhere in description or curseText are extracted
// and resolved to slugs for the linkedCardIds array.

import * as fs from "fs";
import * as path from "path";
import type { DomainCard, GrimoireAbility } from "@shared/types";
import { toCardId, resolveWikiLink } from "../transformers/SlugTransformer";

// ─── Filename parsing ─────────────────────────────────────────────────────────

interface FilenameInfo {
  level: number;
  name: string;
  isCursed: boolean;
  isLinkedCurse: boolean;
}

/**
 * Extract structured metadata from a domain-card filename.
 *
 * Examples:
 *   "(Level 1) Bewitch.md"              → {level:1, name:"Bewitch", isCursed:false, isLinkedCurse:false}
 *   "(Level 2) Iconoclast ★.md"         → {level:2, name:"Iconoclast", isCursed:true, isLinkedCurse:false}
 *   "(Level 4) Dirty Fighter ★ ↔.md"   → {level:4, name:"Dirty Fighter", isCursed:true, isLinkedCurse:true}
 *   "(Level 4) Grace Note.md"            → {level:4, name:"Grace Note", isCursed:false, isLinkedCurse:false}
 */
function parseFilename(filename: string): FilenameInfo {
  const base = path.basename(filename, path.extname(filename));

  const levelMatch = base.match(/^\(Level\s+(\d+)\)/i);
  const level = levelMatch ? parseInt(levelMatch[1], 10) : 1;

  const isCursed = base.includes("★");
  const isLinkedCurse = base.includes("↔");

  // Card display name: strip level prefix and symbols
  let name = base;
  name = name.replace(/^\(Level\s+\d+\)\s*/i, "");
  name = name.replace(/\s*[★↔]\s*/g, " ").trim();

  return { level, name, isCursed, isLinkedCurse };
}

// ─── Content classification helpers ──────────────────────────────────────────

/**
 * Returns true when `line` is a thematic-break separator (`***` or `---`).
 * Handles optional surrounding whitespace and any number of repetitions ≥ 3.
 */
function isSeparator(line: string): boolean {
  return /^\s*(\*{3,}|-{3,})\s*$/.test(line);
}

/**
 * Returns true when `line` begins with the `**Curse**:` or `**Curse**` label
 * that introduces the curse text block.
 */
function isCurseLabel(line: string): boolean {
  return /^\s*\*\*Curse\*\*:?\s*/i.test(line);
}

/** Strip the `**Curse**:` prefix from a line, returning the remainder. */
function stripCurseLabel(line: string): string {
  return line.replace(/^\s*\*\*Curse\*\*:?\s*/i, "").trim();
}

// ─── Wiki-link extraction ─────────────────────────────────────────────────────

/**
 * Scan `text` for all `[[...]]` wiki-link patterns, resolve each to a slug
 * via `resolveWikiLink()`, and return a deduplicated array.
 */
function extractLinkedCardIds(text: string): string[] {
  const ids: string[] = [];
  const re = /\[\[[^\]]+\]\]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    ids.push(resolveWikiLink(m[0]));
  }
  return [...new Set(ids)];
}

// ─── Grimoire parsing ─────────────────────────────────────────────────────────

/**
 * Parse grimoire ability entries from the body lines that follow the
 * `**Grimoire**` marker line.
 *
 * Each entry is `**AbilityName**: description text` on one or more lines.
 * Parsing stops when a separator (`***` / `---`) or a `**Curse**:` label is
 * encountered, which signals the start of the curse block.
 */
function parseGrimoireEntries(lines: string[]): GrimoireAbility[] {
  const entries: GrimoireAbility[] = [];
  let currentName: string | null = null;
  const currentDesc: string[] = [];

  const flush = () => {
    if (currentName !== null) {
      entries.push({
        name: currentName,
        description: currentDesc.join(" ").trim(),
      });
      currentDesc.length = 0;
      currentName = null;
    }
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (line.length === 0) continue;

    // Stop at the separator that divides grimoire from curse text
    if (isSeparator(line)) break;

    // Stop when we hit the **Curse**: label directly (no separator)
    if (isCurseLabel(line)) break;

    // New grimoire entry: **AbilityName**: description
    const boldMatch = line.match(/^\*\*([^*]+)\*\*\s*:\s*(.*)$/);
    if (boldMatch) {
      flush();
      currentName = boldMatch[1].trim();
      const rest = boldMatch[2].trim();
      if (rest) currentDesc.push(rest);
    } else if (currentName !== null) {
      // Continuation line for the current entry
      currentDesc.push(line);
    }
  }
  flush();
  return entries;
}

// ─── Frontmatter parsing ──────────────────────────────────────────────────────

interface CardFrontmatter {
  recall_cost?: number;
}

/**
 * If the file starts with YAML frontmatter (`---`), extract known fields.
 * Returns the parsed frontmatter and the remaining body lines.
 */
function extractFrontmatter(lines: string[]): { frontmatter: CardFrontmatter; bodyLines: string[] } {
  if (lines.length === 0 || lines[0].trim() !== "---") {
    return { frontmatter: {}, bodyLines: lines };
  }

  const closingIdx = lines.findIndex((l, i) => i > 0 && l.trim() === "---");
  if (closingIdx < 0) {
    // Malformed frontmatter — treat entire content as body
    return { frontmatter: {}, bodyLines: lines };
  }

  const fm: CardFrontmatter = {};
  for (let i = 1; i < closingIdx; i++) {
    const match = lines[i].match(/^\s*(\w+)\s*:\s*(.+)$/);
    if (match) {
      const key = match[1].trim();
      const val = match[2].trim();
      if (key === "recall_cost") {
        const parsed = parseInt(val, 10);
        if (!isNaN(parsed)) fm.recall_cost = parsed;
      }
    }
  }

  return { frontmatter: fm, bodyLines: lines.slice(closingIdx + 1) };
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Parse a single domain card markdown file into a `DomainCard` object.
 *
 * @param filePath  Absolute path to the `.md` file.
 * @param domain    Domain name (typically the parent directory name, e.g. "Artistry").
 */
export function parseDomainCardFile(filePath: string, domain: string): DomainCard {
  const raw = fs.readFileSync(filePath, "utf-8");
  const filename = path.basename(filePath);
  const { level, name, isCursed, isLinkedCurse } = parseFilename(filename);
  const cardId = toCardId(filename);

  const lines = raw.split(/\r?\n/);

  // ── Extract optional YAML frontmatter ─────────────────────────────────────
  const { frontmatter, bodyLines } = extractFrontmatter(lines);

  const nonEmptyLines = bodyLines.map((l) => l.trim()).filter((l) => l.length > 0);

  // Empty file — return a minimal record
  if (nonEmptyLines.length === 0) {
    return {
      cardId,
      domain,
      level,
      recallCost: frontmatter.recall_cost ?? level,
      name,
      isCursed,
      isLinkedCurse,
      isGrimoire: false,
      description: "",
      curseText: null,
      linkedCardIds: [],
      grimoire: [],
      source: "homebrew",
    };
  }

  // ── Detect Grimoire ───────────────────────────────────────────────────────
  // A grimoire card's first non-empty content line is exactly `**Grimoire**`
  const isGrimoire = /^\*\*Grimoire\*\*\s*$/.test(nonEmptyLines[0]);

  // ── Split content on the separator for cursed cards ───────────────────────
  // Find the first horizontal-rule separator in the body lines array
  const separatorIdx = bodyLines.findIndex(isSeparator);

  let descriptionLines: string[];
  let curseLines: string[];

  if (isCursed && separatorIdx >= 0) {
    // Normal case: *** or --- divides description from curse block
    descriptionLines = bodyLines.slice(0, separatorIdx);
    curseLines = bodyLines.slice(separatorIdx + 1);
  } else if (isCursed) {
    // Fallback: no separator — look for a **Curse**: label inline
    const curseLabelIdx = bodyLines.findIndex((l) => isCurseLabel(l));
    if (curseLabelIdx >= 0) {
      descriptionLines = bodyLines.slice(0, curseLabelIdx);
      curseLines = bodyLines.slice(curseLabelIdx);
    } else {
      // Cursed card with no discernible curse block — treat all as description
      descriptionLines = bodyLines;
      curseLines = [];
    }
  } else {
    descriptionLines = bodyLines;
    curseLines = [];
  }

  // ── Build description and grimoire entries ────────────────────────────────
  let description = "";
  let grimoire: GrimoireAbility[] = [];

  if (isGrimoire) {
    // Skip the `**Grimoire**` marker and any immediately following blank line;
    // then parse ability entries from the remaining description block.
    const bodyStart = descriptionLines.findIndex(
      (l, i) => i > 0 && l.trim().length > 0
    );
    const grimoireBodyLines =
      bodyStart >= 0 ? descriptionLines.slice(bodyStart) : [];
    grimoire = parseGrimoireEntries(grimoireBodyLines);
    description = ""; // Grimoire cards have no standalone description prose
  } else {
    description = descriptionLines
      .map((l) => l.trim())
      .filter((l) => l.length > 0)
      .join("\n");
  }

  // ── Build curseText ───────────────────────────────────────────────────────
  let curseText: string | null = null;

  if (isCursed && curseLines.length > 0) {
    const processedCurseLines = curseLines.map((l) => {
      if (isCurseLabel(l)) return stripCurseLabel(l);
      return l.trim();
    });

    const curseBody = processedCurseLines
      .filter((l) => l.length > 0)
      .join("\n")
      .trim();

    curseText = curseBody.length > 0 ? curseBody : null;
  }

  // ── Extract linked card IDs from description and curse text ───────────────
  const allText = [description, curseText ?? ""].join("\n");
  const linkedCardIds = extractLinkedCardIds(allText);

  return {
    cardId,
    domain,
    level,
    recallCost: frontmatter.recall_cost ?? level,
    name,
    isCursed,
    isLinkedCurse,
    isGrimoire,
    description,
    curseText,
    linkedCardIds,
    grimoire,
    source: "homebrew",
  };
}
