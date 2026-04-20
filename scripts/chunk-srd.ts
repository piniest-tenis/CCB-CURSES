#!/usr/bin/env ts-node
/**
 * scripts/chunk-srd.ts
 *
 * Daggerheart SRD Chunking & Indexing Script
 * ============================================
 * Reads all markdown files from /markdown/, splits them into header-delimited
 * chunks, and writes a structured JSON index to /frontend/public/srd-index.json.
 *
 * Run with:
 *   npx ts-node scripts/chunk-srd.ts
 *   -- or --
 *   node scripts/chunk-srd.mjs   (after transpile)
 *
 * Output schema: See shared/types/srd.ts → SRDIndex
 */

import * as fs from "fs";
import * as path from "path";

// ─── Type Definitions (inlined to avoid import resolution issues) ─────────────

type SRDSectionName =
  | "Adversaries"
  | "Ancestries"
  | "Classes"
  | "Communities"
  | "Domains"
  | "Environments"
  | "Rules & Definitions"
  | "SRD";

interface SRDChunk {
  id: string;
  title: string;
  section: SRDSectionName;
  subsection?: string;
  content: string;
  filePath: string;
  tags: string[];
  level: number;
}

interface SRDIndex {
  generatedAt: string;
  totalChunks: number;
  totalFiles: number;
  sections: SRDSectionName[];
  sectionCounts: Record<string, number>;
  chunks: SRDChunk[];
}

// ─── Configuration ────────────────────────────────────────────────────────────

const REPO_ROOT = path.resolve(__dirname, "..");
const MARKDOWN_ROOT = path.join(REPO_ROOT, "markdown");
const OUTPUT_PATH = path.join(REPO_ROOT, "frontend", "public", "srd-index.json");

/**
 * Top-level section directories we want to index.
 * Files outside these directories (compliance/, usability/) are excluded.
 */
const SECTION_DIRS: SRDSectionName[] = [
  "Adversaries",
  "Ancestries",
  "Classes",
  "Communities",
  "Domains",
  "Environments",
  "Rules & Definitions",
  "SRD",
];

/**
 * Section descriptions for navigation context.
 */
const SECTION_DESCRIPTIONS: Record<SRDSectionName, string> = {
  Adversaries: "Enemies, monsters, and NPCs with stat blocks and features",
  Ancestries: "Playable ancestries with traits and features",
  Classes: "Character classes with subclasses, features, and progression",
  Communities: "Community backgrounds that grant starting bonuses",
  Domains:
    "Domain cards organized by domain (Artistry, Charm, Creature, etc.)",
  Environments: "Scene environments with passive hazards and features",
  "Rules & Definitions": "Core game rules, definitions, and mechanics",
  SRD: "Official System Reference Document content (ancestries, classes, communities, domains)",
};

// ─── Utilities ────────────────────────────────────────────────────────────────

/**
 * Convert a string to a URL-safe slug.
 * Strips special characters, replaces spaces with hyphens, lowercases.
 */
function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[★↔æ]/gi, (c) => {
      if (c === "★") return "star";
      if (c === "↔") return "linked";
      if (c.toLowerCase() === "æ") return "ae";
      return c;
    })
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Extract meaningful keywords from a string for tagging.
 * Filters out common stop words and short tokens.
 */
const STOP_WORDS = new Set([
  "a",
  "an",
  "the",
  "and",
  "or",
  "of",
  "in",
  "to",
  "for",
  "is",
  "it",
  "at",
  "by",
  "on",
  "as",
  "be",
  "if",
  "so",
  "do",
  "up",
  "my",
  "we",
  "no",
  "you",
  "can",
  "are",
  "was",
  "has",
  "had",
  "not",
  "its",
  "per",
  "all",
  "any",
  "one",
  "two",
  "but",
  "with",
  "from",
  "that",
  "this",
  "your",
  "they",
  "have",
  "their",
  "will",
  "when",
  "each",
  "make",
  "take",
  "into",
  "roll",
  "once",
  "long",
  "rest",
  "range",
  "near",
  "far",
  "very",
  "close",
  "next",
  "turn",
  "end",
  "also",
  "gain",
]);

function extractKeywords(str: string): string[] {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w));
}

/**
 * Recursively walk a directory, yielding all .md file paths.
 */
function walkMdFiles(dir: string): string[] {
  const results: string[] = [];
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return results;
  }
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkMdFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      results.push(fullPath);
    }
  }
  return results;
}

/**
 * Determine the section name from a file's path relative to MARKDOWN_ROOT.
 */
function getSectionFromPath(relativePath: string): SRDSectionName {
  const parts = relativePath.split(path.sep);
  const topDir = parts[0] as SRDSectionName;
  return topDir;
}

/**
 * Determine the subsection from a file path.
 * For files in SRD/: SRD/{Category} → subsection = Category
 * For domain cards: Domains/{DomainName}/ → subsection = DomainName
 * For Classes subdirs, etc.
 */
function getSubsection(relativePath: string): string | undefined {
  const parts = relativePath.split(path.sep);
  // If there are at least 3 parts (section/subsection/file.md), use part[1]
  if (parts.length >= 3) {
    return parts[1];
  }
  return undefined;
}

// ─── Markdown Header Parsing ──────────────────────────────────────────────────

interface HeaderLine {
  level: number;
  text: string;
  lineIndex: number;
}

/**
 * Parse all ATX-style headers from markdown content.
 * Matches lines starting with 1-6 # chars followed by space.
 */
function parseHeaders(lines: string[]): HeaderLine[] {
  const headers: HeaderLine[] = [];
  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(/^(#{1,6})\s+(.+)$/);
    if (match) {
      headers.push({
        level: match[1].length,
        text: match[2].trim().replace(/\*\*/g, "").replace(/[*_]/g, "").trim(),
        lineIndex: i,
      });
    }
  }
  return headers;
}

// ─── Chunk Builder ────────────────────────────────────────────────────────────

interface ChunkBuilderInput {
  lines: string[];
  filePath: string; // absolute path
  relativePath: string; // relative to MARKDOWN_ROOT
  section: SRDSectionName;
  subsection?: string;
}

/**
 * Derives a display title from a file name, stripping extension and
 * cleaning up level prefixes like "(Level 3)".
 */
function titleFromFileName(fileName: string): string {
  return fileName
    .replace(/\.md$/, "")
    .replace(/^\(Level \d+\)\s*/i, "")
    .replace(/[★↔]/g, "")
    .trim();
}

/**
 * Determines whether a file is a "waypoint index" file (Obsidian-style)
 * that contains only `%% Begin Waypoint %%` and link lists.
 * These contain no searchable content and should be skipped.
 */
function isWaypointFile(content: string): boolean {
  return content.includes("%% Begin Waypoint %%");
}

/**
 * Build a unique chunk ID from section, file name, and heading text.
 */
function buildChunkId(
  section: SRDSectionName,
  relativePath: string,
  headingText: string,
  index: number
): string {
  const sectionSlug = slugify(section);
  // Use the file's directory structure after the section for context
  const parts = relativePath.split(path.sep);
  // Drop the section (parts[0]) and the filename (last part)
  const middleParts = parts.slice(1, -1);
  const fileBase = path.basename(relativePath, ".md");

  const pathSlug = [...middleParts, fileBase]
    .map(slugify)
    .filter(Boolean)
    .join("-");

  const headingSlug = slugify(headingText);

  // Avoid duplicate path in heading (e.g. "bard-bard-troubadour")
  const idBase = `${sectionSlug}-${pathSlug}`;
  const fullId = headingSlug && headingSlug !== slugify(fileBase)
    ? `${idBase}-${headingSlug}`
    : idBase;

  // Append index only when truly needed (resolved after dedup)
  return fullId || `chunk-${index}`;
}

/**
 * Build tags for a chunk from its context.
 */
function buildTags(
  section: SRDSectionName,
  subsection: string | undefined,
  fileBase: string,
  headingText: string,
  content: string
): string[] {
  const raw = new Set<string>();

  // Always include section (normalized)
  raw.add(section.toLowerCase().replace(/\s*&\s*/g, "-and-"));
  if (subsection) {
    raw.add(subsection.toLowerCase());
  }

  // File name keywords
  extractKeywords(titleFromFileName(fileBase)).forEach((k) => raw.add(k));

  // Heading keywords
  extractKeywords(headingText).forEach((k) => raw.add(k));

  // Content keywords (first 500 chars to keep tags concise)
  extractKeywords(content.slice(0, 500)).forEach((k) => raw.add(k));

  // Special enrichment: parse level from "(Level N)" filename pattern
  const levelMatch = fileBase.match(/\(Level (\d+)\)/i);
  if (levelMatch) {
    raw.add(`level-${levelMatch[1]}`);
    raw.add("domain-card");
  }

  // Star symbol = "starred" card
  if (fileBase.includes("★")) raw.add("starred");

  // Linked symbol
  if (fileBase.includes("↔")) raw.add("linked");

  return Array.from(raw).filter(Boolean).sort();
}

/**
 * Core chunking function. Splits a file's content by H1/H2 headers.
 * Returns an array of SRDChunk objects.
 *
 * Chunking strategy:
 *  - Files without any headers: produce a single chunk using the file name as title
 *  - Files with headers: split at every H1 or H2 boundary
 *  - Content before the first header becomes a "preamble" chunk (level 0)
 *    only if it's non-empty after stripping whitespace
 *  - H3+ headers are NOT split points; they remain in the parent chunk's content
 */
function chunkFile(input: ChunkBuilderInput): SRDChunk[] {
  const {
    lines,
    relativePath,
    section,
    subsection,
  } = input;

  const content = lines.join("\n");
  const fileBase = path.basename(relativePath, ".md");
  const displayTitle = titleFromFileName(fileBase);

  // Skip pure waypoint/index files
  if (isWaypointFile(content)) {
    return [];
  }

  // Strip YAML front-matter (--- ... ---) from lines for processing
  let processLines = lines;
  let frontMatterEnd = 0;
  if (lines.length > 0 && lines[0].trim() === "---") {
    for (let i = 1; i < lines.length; i++) {
      if (lines[i].trim() === "---") {
        frontMatterEnd = i + 1;
        break;
      }
    }
    processLines = lines.slice(frontMatterEnd);
  }

  const headers = parseHeaders(processLines);

  // Filter to split-worthy headers: H1 and H2 only
  const splitHeaders = headers.filter((h) => h.level <= 2);

  // If there are no meaningful headers, make one chunk for the whole file
  if (splitHeaders.length === 0) {
    const chunkContent = processLines.join("\n").trim();
    if (!chunkContent) return [];

    const id = buildChunkId(section, relativePath, displayTitle, 0);
    const tags = buildTags(
      section,
      subsection,
      fileBase,
      displayTitle,
      chunkContent
    );
    return [
      {
        id,
        title: displayTitle,
        section,
        subsection,
        content: chunkContent,
        filePath: relativePath,
        tags,
        level: 0,
      },
    ];
  }

  const chunks: SRDChunk[] = [];

  // Preamble: content before the first split header
  const firstSplitIdx = splitHeaders[0].lineIndex;
  if (firstSplitIdx > 0) {
    const preamble = processLines.slice(0, firstSplitIdx).join("\n").trim();
    if (preamble) {
      const id = buildChunkId(section, relativePath, displayTitle + "-preamble", 0);
      chunks.push({
        id,
        title: displayTitle,
        section,
        subsection,
        content: preamble,
        filePath: relativePath,
        tags: buildTags(section, subsection, fileBase, displayTitle, preamble),
        level: 0,
      });
    }
  }

  // Build chunks from each H1/H2 split header
  for (let i = 0; i < splitHeaders.length; i++) {
    const header = splitHeaders[i];
    const nextSplit = splitHeaders[i + 1];

    // Content runs from this header to the line before the next split header
    const startLine = header.lineIndex;
    const endLine = nextSplit ? nextSplit.lineIndex : processLines.length;
    const chunkLines = processLines.slice(startLine, endLine);
    const chunkContent = chunkLines.join("\n").trim();

    if (!chunkContent) continue;

    const id = buildChunkId(section, relativePath, header.text, chunks.length);
    const tags = buildTags(
      section,
      subsection,
      fileBase,
      header.text,
      chunkContent
    );

    chunks.push({
      id,
      title: header.text,
      section,
      subsection,
      content: chunkContent,
      filePath: relativePath,
      tags,
      level: header.level,
    });
  }

  return chunks;
}

// ─── Deduplication ────────────────────────────────────────────────────────────

/**
 * Ensure all chunk IDs are unique within the index.
 * Appends a numeric suffix to collisions: "my-chunk", "my-chunk-2", etc.
 */
function deduplicateIds(chunks: SRDChunk[]): SRDChunk[] {
  const seen = new Map<string, number>();
  return chunks.map((chunk) => {
    const base = chunk.id;
    const count = seen.get(base) ?? 0;
    seen.set(base, count + 1);
    if (count === 0) return chunk;
    return { ...chunk, id: `${base}-${count + 1}` };
  });
}

// ─── Main Ingestion Pipeline ──────────────────────────────────────────────────

function main(): void {
  console.log("═".repeat(60));
  console.log("  Daggerheart SRD Chunking Pipeline");
  console.log("  " + new Date().toISOString());
  console.log("═".repeat(60));
  console.log(`  Markdown root: ${MARKDOWN_ROOT}`);
  console.log(`  Output path:   ${OUTPUT_PATH}`);
  console.log();

  const allChunks: SRDChunk[] = [];
  const sectionCounts: Record<string, number> = {};
  let totalFiles = 0;
  let skippedFiles = 0;

  for (const sectionName of SECTION_DIRS) {
    const sectionDir = path.join(MARKDOWN_ROOT, sectionName);

    if (!fs.existsSync(sectionDir)) {
      console.warn(`  [WARN] Section directory not found: ${sectionDir}`);
      continue;
    }

    const mdFiles = walkMdFiles(sectionDir);
    let sectionChunkCount = 0;
    let sectionFileCount = 0;

    console.log(
      `  Processing section: ${sectionName} (${mdFiles.length} files)`
    );

    for (const absPath of mdFiles) {
      totalFiles++;
      sectionFileCount++;

      const relativePath = path.relative(MARKDOWN_ROOT, absPath);
      const rawContent = fs.readFileSync(absPath, "utf-8");
      const lines = rawContent.split("\n");

      const subsection = getSubsection(relativePath);

      const chunks = chunkFile({
        lines,
        filePath: absPath,
        relativePath,
        section: sectionName,
        subsection,
      });

      if (chunks.length === 0) {
        skippedFiles++;
      }

      allChunks.push(...chunks);
      sectionChunkCount += chunks.length;
    }

    sectionCounts[sectionName] = sectionChunkCount;
    console.log(
      `    → ${sectionFileCount} files → ${sectionChunkCount} chunks`
    );
  }

  console.log();
  console.log(`  Total files processed:   ${totalFiles}`);
  console.log(
    `  Files skipped (waypoint/empty): ${skippedFiles}`
  );
  console.log(`  Total raw chunks:        ${allChunks.length}`);

  // Deduplicate IDs
  const dedupedChunks = deduplicateIds(allChunks);
  const collisions = allChunks.length - new Set(allChunks.map((c) => c.id)).size;
  if (collisions > 0) {
    console.log(`  ID collisions resolved:  ${collisions}`);
  }

  console.log(`  Final chunk count:       ${dedupedChunks.length}`);

  // Build index
  const index: SRDIndex = {
    generatedAt: new Date().toISOString(),
    totalChunks: dedupedChunks.length,
    totalFiles,
    sections: SECTION_DIRS,
    sectionCounts: sectionCounts as Record<SRDSectionName, number>,
    chunks: dedupedChunks,
  };

  // Ensure output directory exists
  const outputDir = path.dirname(OUTPUT_PATH);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
    console.log(`  Created output dir: ${outputDir}`);
  }

  // Write output
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(index, null, 2), "utf-8");

  const outputSizeKB = Math.round(
    fs.statSync(OUTPUT_PATH).size / 1024
  );

  console.log();
  console.log("─".repeat(60));
  console.log(`  ✓ Written to: ${OUTPUT_PATH}`);
  console.log(`  ✓ File size:  ~${outputSizeKB} KB`);
  console.log();

  // Per-section summary table
  console.log("  Per-Section Summary:");
  console.log("  " + "─".repeat(40));
  for (const [section, count] of Object.entries(sectionCounts)) {
    const padding = " ".repeat(Math.max(0, 25 - section.length));
    console.log(`    ${section}${padding} ${count.toString().padStart(4)} chunks`);
  }
  console.log("  " + "─".repeat(40));
  console.log(
    `    ${"TOTAL".padEnd(25)} ${dedupedChunks.length.toString().padStart(4)} chunks`
  );
  console.log("═".repeat(60));
}

main();
