// ingestion/src/parsers/ClassParser.ts
// Parses a single Daggerheart class markdown file into ClassData + SubclassData[].
//
// Supported class files (read and verified):
//   Devout.md   – well-formed, 2 subclasses with ### headers
//   Knave.md    – well-formed, 2 subclasses with ### headers
//   Naturalist.md – well-formed, 2 subclasses with ### headers
//   Scholar.md  – compressed whitespace; subclasses use bare-word Spellcast Trait
//                 with no ### section headers inside the subclass blocks

import * as fs from "fs";
import * as path from "path";
import type {
  ClassData,
  SubclassData,
  NamedFeature,
  CoreStatName,
  CharacterSource,
} from "@shared/types";
import { toSlug } from "../transformers/SlugTransformer";

// ─── Constants ────────────────────────────────────────────────────────────────

const CORE_STAT_NAMES: CoreStatName[] = [
  "agility",
  "strength",
  "finesse",
  "instinct",
  "presence",
  "knowledge",
];

// ─── Low-level string helpers ─────────────────────────────────────────────────

/** Strip markdown bold/italic emphasis markers (*text*, **text**, _text_) */
function stripEmphasis(s: string): string {
  return s
    .replace(/\*{1,3}([^*]+)\*{1,3}/g, "$1")
    .replace(/_{1,3}([^_]+)_{1,3}/g, "$1")
    .trim();
}

/** Return the number of leading # characters in a heading line. */
function countLeadingHashes(line: string): number {
  const m = line.match(/^(#{1,6})\s/);
  return m ? m[1].length : 0;
}

/** Strip leading # characters from a heading line, also removes **bold** wrapping. */
function stripHeading(line: string): string {
  return line
    .replace(/^#+\s*/, "")
    .replace(/\*{1,3}([^*]+)\*{1,3}/g, "$1")
    .trim();
}

/**
 * Return true when `line` is a meta-instruction that should be excluded from
 * questions/items arrays.  These lines tell players what to do rather than
 * providing actual content.
 */
function isMetaInstruction(text: string): boolean {
  return (
    /answer any of the following/i.test(text) ||
    /you can also create your own/i.test(text) ||
    /ask your fellow players/i.test(text) ||
    /any of the following background questions/i.test(text)
  );
}

// ─── Section extraction ───────────────────────────────────────────────────────

/**
 * Extract the body lines of a markdown section identified by `sectionPattern`.
 *
 * Returns lines from the line after the matched heading up to (but not
 * including) the next heading whose depth is ≤ the matched heading's depth.
 *
 * Returns null when the section is not found.
 *
 * @param lines           Full file lines array
 * @param sectionPattern  Regex that matches the section heading line
 */
function extractSection(lines: string[], sectionPattern: RegExp): string[] | null {
  const startIdx = lines.findIndex((l) => sectionPattern.test(l));
  if (startIdx < 0) return null;

  const depth = countLeadingHashes(lines[startIdx]);
  const result: string[] = [];

  for (let i = startIdx + 1; i < lines.length; i++) {
    const l = lines[i];
    if (/^#{1,6}\s/.test(l) && countLeadingHashes(l) <= depth) break;
    result.push(l);
  }
  return result;
}

// ─── Stats table ──────────────────────────────────────────────────────────────

/**
 * Parse the opening markdown table:
 *   | Domains | Starting Evasion | Starting Hit Points |
 *   | :---:   | :---:            | :---:               |
 *   | [[A]] & [[B]] | 10        | 6                   |
 *
 * Extracts domain names from [[WikiLink]] references and the two numeric stats.
 */
function parseStatsTable(
  lines: string[]
): { domains: string[]; startingEvasion: number; startingHitPoints: number } | null {
  // Locate the header row by content
  const headerIdx = lines.findIndex((l) =>
    /Domains.*Starting Evasion.*Starting Hit Points/i.test(l)
  );
  if (headerIdx < 0) return null;

  // Data row is header + 2 (skip the separator row)
  const dataLine = lines[headerIdx + 2];
  if (!dataLine) return null;

  // Protect escaped pipes inside [[WikiLink\|Alias]] before splitting on |
  const PIPE_PLACEHOLDER = "\x00PIPE\x00";
  const safeLine = dataLine.replace(/\\\|/g, PIPE_PLACEHOLDER);

  const cells = safeLine
    .split("|")
    .map((c) => c.replace(new RegExp(PIPE_PLACEHOLDER, "g"), "|").trim())
    .filter((c) => c.length > 0);

  if (cells.length < 3) return null;

  const [domainCell, evasionCell, hpCell] = cells;

  // Extract domain names from [[WikiLink]] references in the domain cell
  const wikiLinkRe = /\[\[([^\]|]+?)(?:\|[^\]]*)?\]\]/g;
  const domains: string[] = [];
  let wm: RegExpExecArray | null;
  while ((wm = wikiLinkRe.exec(domainCell)) !== null) {
    // Take the last path segment as the domain name
    const inner = wm[1].trim();
    const segments = inner.split("/");
    domains.push(segments[segments.length - 1].trim());
  }

  // Fallback: split on & if no wiki links found
  if (domains.length === 0) {
    domains.push(...domainCell.split("&").map((d) => d.trim()).filter(Boolean));
  }

  const startingEvasion = parseInt(evasionCell, 10);
  const startingHitPoints = parseInt(hpCell, 10);

  if (isNaN(startingEvasion) || isNaN(startingHitPoints)) return null;

  return { domains, startingEvasion, startingHitPoints };
}

// ─── Class Items ──────────────────────────────────────────────────────────────

/**
 * Parse `_item A_ or _item B_` into ["item A", "item B"].
 * Handles any number of italic spans separated by "or".
 */
function parseClassItems(sectionLines: string[]): string[] {
  const text = sectionLines.join(" ");
  const items: string[] = [];
  const re = /_([^_]+?)_/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const t = m[1].trim();
    if (t) items.push(t);
  }
  return items;
}

// ─── Hope Feature ─────────────────────────────────────────────────────────────

/**
 * Parse `_FeatureName_: description text mentioning spending N Hope.`
 *
 * Extracts:
 *   name        – the italic span before the colon
 *   description – everything after the colon
 *   hopeCost    – the first integer N found before "Hope" in the description
 */
function parseHopeFeature(
  sectionLines: string[]
): { name: string; description: string; hopeCost: number } {
  const text = sectionLines
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
    .join(" ");

  // Pattern: _Name_: rest of description
  const nameMatch = text.match(/^_([^_]+?)_\s*:\s*(.+)$/s);
  if (!nameMatch) {
    return { name: "Unknown", description: text, hopeCost: 0 };
  }

  const name = nameMatch[1].trim();
  const description = nameMatch[2].trim();

  // Cost: prefer "Spend N Hope" phrasing; fall back to any "N Hope" pattern
  const costMatch =
    description.match(/Spend\s+(\d+)\s+Hope/i) ??
    description.match(/(\d+)\s+Hope/i);
  const hopeCost = costMatch ? parseInt(costMatch[1], 10) : 0;

  return { name, description, hopeCost };
}

// ─── Class Feature(s) ─────────────────────────────────────────────────────────

/**
 * Parse the ### Class Feature(s) section into an array of ClassFeature objects.
 *
 * Supports both single-feature and multi-feature formats:
 *
 *   Single (### Class Feature):
 *     **FeatureName**
 *     Description text (possibly multi-paragraph).
 *     - option A
 *     - _option B_ (italic)
 *     - option C
 *
 *   Multiple (### Class Features):
 *     **FeatureOne**
 *     Description for feature one.
 *
 *     **FeatureTwo**
 *     Description for feature two.
 *     - option A
 *
 * Algorithm:
 *   1. Scan non-empty lines.
 *   2. A `**BoldName**` standalone line starts a new feature (flushing any
 *      current feature-in-progress to the results array).
 *   3. Bullet lines (`- ` or `* `) accumulate as `options` for the current feature.
 *   4. All other non-empty lines accumulate as `description` for the current feature.
 *   5. At end-of-input the last in-progress feature is flushed.
 */
function parseClassFeatures(
  sectionLines: string[]
): Array<{ name: string; description: string; options: string[] }> {
  const nonEmpty = sectionLines.map((l) => l.trim()).filter((l) => l.length > 0);
  if (nonEmpty.length === 0) return [{ name: "", description: "", options: [] }];

  const results: Array<{ name: string; description: string; options: string[] }> = [];

  let currentName: string | null = null;
  let descLines: string[] = [];
  let options: string[] = [];

  const flush = () => {
    if (currentName !== null) {
      results.push({
        name: currentName,
        description: descLines.join(" ").trim(),
        options,
      });
    }
    currentName = null;
    descLines = [];
    options = [];
  };

  for (const l of nonEmpty) {
    const nameMatch = l.match(/^\*\*([^*]+)\*\*\s*$/);
    if (nameMatch) {
      // A new bold-name line: flush the previous feature and start the next
      flush();
      currentName = nameMatch[1].trim();
    } else if (currentName !== null) {
      // We are inside a feature block
      if (/^[-*]\s/.test(l)) {
        options.push(stripEmphasis(l.replace(/^[-*]\s*/, "").trim()));
      } else {
        descLines.push(l);
      }
    } else {
      // No feature started yet — treat the first non-bold line as the name
      // (fallback for malformed sections)
      currentName = stripEmphasis(l);
    }
  }

  // Flush the last in-progress feature
  flush();

  // Guard: always return at least one entry
  if (results.length === 0) {
    return [{ name: "", description: "", options: [] }];
  }

  return results;
}

// ─── Subclass overview ────────────────────────────────────────────────────────

/**
 * Parse the ### Subclasses overview block into summary pairs:
 *
 *   **SubclassName**
 *   _Play if you want to ..._
 */
function parseSubclassSummaries(
  sectionLines: string[]
): Array<{ name: string; description: string }> {
  const results: Array<{ name: string; description: string }> = [];
  const nonEmpty = sectionLines.map((l) => l.trim()).filter((l) => l.length > 0);

  for (let i = 0; i < nonEmpty.length; i++) {
    const l = nonEmpty[i];
    // Skip prose introduction lines
    const nameMatch = l.match(/^\*\*([^*]+)\*\*\s*$/);
    if (!nameMatch) continue;

    const name = nameMatch[1].trim();
    let description = "";

    if (i + 1 < nonEmpty.length) {
      const next = nonEmpty[i + 1];
      const descMatch = next.match(/^_(.+?)_\s*$/);
      if (descMatch) {
        description = descMatch[1].trim();
        i++; // consume description line
      }
    }
    results.push({ name, description });
  }
  return results;
}

// ─── Question / item list parsing ─────────────────────────────────────────────

/**
 * Parse a bullet-list of questions, filtering out meta-instruction lines.
 *
 * Accepts:
 *   - _italic text_
 *   - plain bullet text
 *   Skips lines containing meta-instructions.
 */
function parseQuestionList(sectionLines: string[]): string[] {
  const results: string[] = [];

  for (const line of sectionLines) {
    const l = line.trim();
    if (l.length === 0) continue;

    // Match "- _italic_" or "- plain text"
    const bulletMatch = l.match(/^[-*]\s+(.+)$/);
    if (bulletMatch) {
      const text = stripEmphasis(bulletMatch[1].trim());
      if (!isMetaInstruction(text)) results.push(text);
      continue;
    }

    // Bare italic line (no bullet)
    const bareItalic = l.match(/^_(.+?)_\s*$/);
    if (bareItalic) {
      const text = bareItalic[1].trim();
      if (!isMetaInstruction(text)) results.push(text);
    }
  }
  return results;
}

// ─── Named feature helpers ────────────────────────────────────────────────────

/**
 * Parse `_Name_: description text` into a NamedFeature.
 * Returns null when the line does not match the expected format.
 */
function parseItalicNamedFeature(line: string): NamedFeature | null {
  const m = line.match(/^_([^_]+?)_\s*:\s*(.+)$/s);
  if (!m) return null;
  return { name: m[1].trim(), description: m[2].trim() };
}

/**
 * Parse `**Name**: description text` into a NamedFeature.
 * Returns null when the line does not match.
 */
function parseBoldNamedFeature(line: string): NamedFeature | null {
  const m = line.match(/^\*\*([^*]+)\*\*\s*:\s*(.+)$/s);
  if (!m) return null;
  return { name: m[1].trim(), description: m[2].trim() };
}

/**
 * Parse the Foundation Features section body into an array of NamedFeature.
 *
 * Each feature starts with `_Name_: description` and may wrap across lines.
 * Multiple features are separated when a new `_Name_:` pattern is encountered.
 */
function parseFoundationFeatures(sectionLines: string[]): NamedFeature[] {
  const features: NamedFeature[] = [];
  const nonEmpty = sectionLines.map((l) => l.trim()).filter((l) => l.length > 0);

  let current: string[] = [];

  const flush = () => {
    if (current.length === 0) return;
    const ff = parseItalicNamedFeature(current.join(" "));
    if (ff) features.push(ff);
    current = [];
  };

  for (const line of nonEmpty) {
    if (/^_[^_]+_\s*:/.test(line)) {
      flush();
      current = [line];
    } else if (current.length > 0) {
      current.push(line);
    }
  }
  flush();
  return features;
}

/**
 * Parse the Specialization or Mastery Feature section body.
 * Content is typically `**Name**: description` on one or more lines.
 */
function parseNamedFeature(sectionLines: string[]): NamedFeature {
  const nonEmpty = sectionLines.map((l) => l.trim()).filter((l) => l.length > 0);

  // Join with a single space only for the name-extraction match; preserve
  // newlines in the description so markdown lists remain intact.
  const firstLine = nonEmpty[0] ?? "";

  // Bold format: **Name**: description (name must be on the first line)
  const boldMatch = firstLine.match(/^\*\*([^*]+)\*\*\s*:\s*(.*)$/s);
  if (boldMatch) {
    const nameStr = boldMatch[1].trim();
    // Remainder of first line + subsequent lines, joined with newlines
    const restOfFirstLine = boldMatch[2].trim();
    const tail = nonEmpty.slice(1).join("\n");
    const description = restOfFirstLine
      ? tail ? `${restOfFirstLine}\n${tail}` : restOfFirstLine
      : tail;
    return { name: nameStr, description: description.trim() };
  }

  // Italic format: _Name_: description
  const italicMatch = firstLine.match(/^_([^_]+?)_\s*:\s*(.*)$/s);
  if (italicMatch) {
    const nameStr = italicMatch[1].trim();
    const restOfFirstLine = italicMatch[2].trim();
    const tail = nonEmpty.slice(1).join("\n");
    const description = restOfFirstLine
      ? tail ? `${restOfFirstLine}\n${tail}` : restOfFirstLine
      : tail;
    return { name: nameStr, description: description.trim() };
  }

  return { name: firstLine, description: nonEmpty.slice(1).join("\n") };
}

/** Extract CoreStatName from the Spellcast Trait section body. */
function parseSpellcastTrait(sectionLines: string[]): CoreStatName {
  for (const line of sectionLines) {
    const word = line.trim().toLowerCase() as CoreStatName;
    if (CORE_STAT_NAMES.includes(word)) return word;
  }
  return "presence"; // sensible default
}

// ─── Subclass detail parsing ──────────────────────────────────────────────────

/**
 * Parse the "Scholar-style" subclass block that has no ### section headers.
 *
 * Expected document order (non-empty lines):
 *   0+  : _description_ italic lines  (already captured in summaries — skip)
 *   next: TraitWord                   (single word matching a CoreStatName)
 *   next: _FeatureName_: description  (foundation feature 1)
 *   next: _FeatureName_: description  (foundation feature 2)
 *   next: **SpecName**: description   (specialization)
 *   next: **MasteryName**: description(mastery)
 *   rest: prose (mechanical notes — ignored at this level)
 *
 * Scholar.md also omits blank lines between sections, so we rely entirely on
 * the text format of each line rather than line position.
 */
function parseScholarStyleSubclass(
  subclassId: string,
  name: string,
  description: string,
  nonEmpty: string[]
): SubclassData {
  let cursor = 0;

  // Skip leading italic description lines (already captured via summaries)
  while (
    cursor < nonEmpty.length &&
    /^_[^*]+_$/.test(nonEmpty[cursor])
  ) {
    cursor++;
  }

  // Spellcast Trait: bare word matching a CoreStatName
  let spellcastTrait: CoreStatName = "presence";
  if (
    cursor < nonEmpty.length &&
    CORE_STAT_NAMES.includes(nonEmpty[cursor].toLowerCase() as CoreStatName)
  ) {
    spellcastTrait = nonEmpty[cursor].toLowerCase() as CoreStatName;
    cursor++;
  }

  // Foundation features: _Name_: description
  const foundationFeatures: NamedFeature[] = [];
  while (cursor < nonEmpty.length && /^_[^_]+_\s*:/.test(nonEmpty[cursor])) {
    const ff = parseItalicNamedFeature(nonEmpty[cursor]);
    if (ff) foundationFeatures.push(ff);
    cursor++;
  }

  // Specialization feature: **Name**: description
  let specializationFeature: NamedFeature = { name: "", description: "" };
  if (cursor < nonEmpty.length && /^\*\*/.test(nonEmpty[cursor])) {
    specializationFeature =
      parseBoldNamedFeature(nonEmpty[cursor]) ?? specializationFeature;
    cursor++;
  }

  // Mastery feature: **Name**: description
  let masteryFeature: NamedFeature = { name: "", description: "" };
  if (cursor < nonEmpty.length && /^\*\*/.test(nonEmpty[cursor])) {
    masteryFeature =
      parseBoldNamedFeature(nonEmpty[cursor]) ?? masteryFeature;
    // cursor++ not needed — nothing consumed after this
  }

  return {
    subclassId,
    name,
    description,
    spellcastTrait,
    foundationFeatures,
    specializationFeature,
    masteryFeature,
  };
}

/**
 * Parse the full subclass detail blocks found after the `# Subclasses` h1.
 *
 * Each block begins with `## SubclassName` and ends at the next `## ` heading
 * or at `## Mechanical Notes`.
 *
 * Two parsing strategies are attempted per block:
 *   1. Structured (Devout/Knave/Naturalist): ### section headers present.
 *   2. Fallback (Scholar): no ### headers — parse by document order / format.
 */
function parseSubclassDetails(
  lines: string[],
  subclassSummaries: Array<{ name: string; description: string }>
): SubclassData[] {
  // Find the `# Subclasses` h1
  const h1Idx = lines.findIndex((l) => /^#\s+Subclasses\s*$/i.test(l));
  if (h1Idx < 0) return [];

  const subclassLines = lines.slice(h1Idx + 1);

  // Split into blocks at each `## ` (but not `### `)
  const blocks: Array<{ heading: string; body: string[] }> = [];
  let current: { heading: string; body: string[] } | null = null;

  for (const line of subclassLines) {
    const isH2 = /^#{2}\s/.test(line) && !/^#{3}/.test(line);
    if (isH2) {
      const heading = stripHeading(line);
      // Mechanical Notes is not a subclass block
      if (/^Mechanical Notes$/i.test(heading)) {
        if (current) blocks.push(current);
        current = null;
        break;
      }
      if (current) blocks.push(current);
      current = { heading, body: [] };
    } else if (current) {
      current.body.push(line);
    }
  }
  if (current) blocks.push(current);

  return blocks.map((block) => {
    const name = block.heading;
    const subclassId = toSlug(name);

    // Find matching summary description
    const summary = subclassSummaries.find(
      (s) => toSlug(s.name) === subclassId
    );
    const description = summary?.description ?? "";

    const bodyLines = block.body;

    // ── Strategy 1: Structured (### headers present) ──────────────────────
    const spellcastSection = extractSection(bodyLines, /^###\s+Spellcast Trait/i);
    if (spellcastSection !== null) {
      const foundationSection = extractSection(bodyLines, /^###\s+Foundation Features?/i);
      const specSection = extractSection(bodyLines, /^###\s+Specialization Features?/i);
      const masterySection = extractSection(bodyLines, /^###\s+Mastery Features?/i);

      return {
        subclassId,
        name,
        description,
        spellcastTrait: parseSpellcastTrait(spellcastSection),
        foundationFeatures: foundationSection
          ? parseFoundationFeatures(foundationSection)
          : [],
        specializationFeature: specSection
          ? parseNamedFeature(specSection)
          : { name: "", description: "" },
        masteryFeature: masterySection
          ? parseNamedFeature(masterySection)
          : { name: "", description: "" },
      };
    }

    // ── Strategy 2: Scholar-style fallback ────────────────────────────────
    const nonEmpty = bodyLines.map((l) => l.trim()).filter((l) => l.length > 0);
    return parseScholarStyleSubclass(subclassId, name, description, nonEmpty);
  });
}

// ─── Mechanical Notes ─────────────────────────────────────────────────────────

/**
 * Extract the prose body of the `## Mechanical Notes` section.
 * This section is at h2 or h3 level and appears after all subclass blocks.
 */
function parseMechanicalNotes(lines: string[]): string {
  const section = extractSection(lines, /^#{2,3}\s+Mechanical Notes/i);
  if (!section) return "";
  return section
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
    .join(" ");
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Map a tier label from `%% armor rec: <label> %%` to a Tier-1 armor ID.
 * Returns null for unrecognised labels (they are silently skipped).
 */
function armorTierToId(label: string): string | null {
  switch (label.trim().toLowerCase()) {
    case "light":       return "gambeson";
    case "med":
    case "medium":      return "leather";
    case "heavy":       return "chainmail";
    case "extra heavy":
    case "full plate":
    case "xheavy":      return "full-plate";
    default:            return null;
  }
}

/**
 * Extract `armorRec` IDs from the raw file content.
 * Looks for `%% armor rec: light | med %%` (pipe-separated, any whitespace).
 * Returns an empty array when no comment is present.
 */
function parseArmorRec(raw: string): string[] {
  const match = raw.match(/%{2}\s*armor rec\s*:\s*([^%]+?)\s*%{2}/i);
  if (!match) return [];
  return match[1]
    .split("|")
    .map((t) => armorTierToId(t))
    .filter((id): id is string => id !== null);
}

/**
 * Parse a single class markdown file into a `ClassData` object (which embeds
 * `SubclassData[]` for the `subclasses` field).
 *
 * The `className` parameter defaults to the filename stem (without `.md`).
 * `classId` is derived via `toSlug(className)`.
 *
 * @param filePath   Absolute path to the .md file
 * @param className  Override for the class display name
 * @param source     Content source — "srd" or "homebrew" (default: "homebrew")
 */
export function parseClassFile(filePath: string, className?: string, source: CharacterSource = "homebrew"): ClassData {
  const raw = fs.readFileSync(filePath, "utf-8");
  const lines = raw.split(/\r?\n/);

  const name = className ?? path.basename(filePath, path.extname(filePath));
  const classId = toSlug(name);

  // 1. Stats table
  const statsResult = parseStatsTable(lines);
  const domains = statsResult?.domains ?? [];
  const startingEvasion = statsResult?.startingEvasion ?? 0;
  const startingHitPoints = statsResult?.startingHitPoints ?? 0;

  // 2. Class Items
  const classItemsSection = extractSection(lines, /^###\s+Class Items/i);
  const classItems = classItemsSection ? parseClassItems(classItemsSection) : [];

  // 3. Hope Feature
  const hopeSectionLines = extractSection(lines, /^###\s+Hope Feature/i);
  const hopeFeature = hopeSectionLines
    ? parseHopeFeature(hopeSectionLines)
    : { name: "", description: "", hopeCost: 0 };

  // 4. Class Feature(s) — matches both "### Class Feature" and "### Class Features"
  const classFeatureSection = extractSection(lines, /^###\s+Class Features?/i);
  const classFeatures = classFeatureSection
    ? parseClassFeatures(classFeatureSection)
    : [{ name: "", description: "", options: [] }];

  // 5. Subclass summaries (from ### Subclasses overview)
  const subclassSummarySection = extractSection(lines, /^###\s+Subclasses/i);
  const subclassSummaries = subclassSummarySection
    ? parseSubclassSummaries(subclassSummarySection)
    : [];

  // 6. Background Questions
  const bgSection = extractSection(lines, /^###\s+Background Questions/i);
  const backgroundQuestions = bgSection ? parseQuestionList(bgSection) : [];

  // 7. Connections
  const connSection = extractSection(lines, /^###\s+Connections/i);
  const connectionQuestions = connSection ? parseQuestionList(connSection) : [];

  // 8. Full subclass detail blocks (after # Subclasses h1)
  const subclasses = parseSubclassDetails(lines, subclassSummaries);

  // 9. Mechanical Notes
  const mechanicalNotes = parseMechanicalNotes(lines);

  // 10. Armor recommendation
  const armorRec = parseArmorRec(raw);

  return {
    classId,
    name,
    domains,
    startingEvasion,
    startingHitPoints,
    classItems,
    hopeFeature,
    classFeatures,
    backgroundQuestions,
    connectionQuestions,
    subclasses,
    mechanicalNotes,
    armorRec,
    source,
  };
}
