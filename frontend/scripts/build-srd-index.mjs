#!/usr/bin/env node
/**
 * scripts/build-srd-index.mjs
 *
 * Daggerheart SRD — Index Builder
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Reads all Markdown files from /markdown/** and produces a single JSON
 * file at /frontend/public/srd-index.json.
 *
 * Each Markdown file becomes one SRDChunk. Files that are pure navigation
 * indexes (Obsidian waypoints with only [[WikiLinks]]) are skipped.
 *
 * CHUNK SCHEMA
 * ────────────
 *   id          Unique kebab-case slug derived from section + title
 *   title       Human-readable title (filename without extension)
 *   section     Top-level folder (Adversaries, Classes, Domains, …)
 *   subsection  Second-level folder if present (e.g. "Artistry" inside Domains)
 *   content     Full raw markdown text
 *   filePath    Relative path from /markdown root
 *   tags        Auto-derived keywords (see deriveTagsFromChunk)
 *   level       Heading level: 1 if top-level file, 2 if in subfolder, 3 if deeper
 *
 * RUN
 * ───
 *   node scripts/build-srd-index.mjs
 *   # or via npm script: npm run build:srd-index
 *
 * The script is also wired into the Next.js build in build-prod.mjs.
 */

import { readFileSync, readdirSync, statSync, writeFileSync, mkdirSync } from "fs";
import { join, relative, extname, basename, dirname } from "path";
import { fileURLToPath } from "url";

// ─── Paths ────────────────────────────────────────────────────────────────────

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);

const REPO_ROOT    = join(__dirname, "..", "..");           // /CCB-Curses
const MARKDOWN_DIR = join(REPO_ROOT, "markdown");
const OUTPUT_DIR   = join(__dirname, "..", "public");
const OUTPUT_FILE  = join(OUTPUT_DIR, "srd-index.json");

// ─── Section mapping (folder name → canonical section label) ─────────────────

const SECTION_MAP = {
  Adversaries:         "Adversaries",
  Ancestries:          "Ancestries",
  Classes:             "Classes",
  Communities:         "Communities",
  Domains:             "Domains",
  Environments:        "Environments",
  "Rules & Definitions": "Rules & Definitions",
  SRD:                 "SRD",
};

// ─── Folders to completely skip ───────────────────────────────────────────────

const SKIP_FOLDERS = new Set(["compliance", "usability", ".git", ".obsidian"]);

// ─── Files to skip (pure navigation indexes with no content) ─────────────────

/** Returns true if the file is an Obsidian waypoint / pure link list */
function isNavigationOnly(content) {
  const stripped = content
    .replace(/%% Begin Waypoint %%[\s\S]*?%% End Waypoint %%/g, "")
    .replace(/^- \[\[.*\]\]$/gm, "")
    .trim();
  return stripped.length === 0;
}

// ─── Slug generator ───────────────────────────────────────────────────────────

const slugCache = new Map();

function makeSlug(section, title) {
  const raw = `${section}-${title}`
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-|-$/g, "");

  // Ensure uniqueness
  let slug = raw;
  let counter = 2;
  while (slugCache.has(slug) && slugCache.get(slug) !== raw) {
    slug = `${raw}-${counter++}`;
  }
  slugCache.set(slug, raw);
  return slug;
}

// ─── Tag Derivation ───────────────────────────────────────────────────────────

/**
 * Derive a set of searchable tags from the chunk's metadata and content.
 * Tags are lower-cased, de-duplicated, and limited to meaningful terms.
 */
function deriveTags(section, subsection, title, content) {
  const tags = new Set();

  // Always include section/subsection
  if (section)    tokenize(section).forEach(t => tags.add(t));
  if (subsection) tokenize(subsection).forEach(t => tags.add(t));

  // Title words
  tokenize(title).forEach(t => tags.add(t));

  // Extract bold/italic terms (SRD features are often in **bold**)
  const boldMatches = content.match(/\*\*([^*]+)\*\*/g) ?? [];
  boldMatches.slice(0, 20).forEach(m => {
    const term = m.replace(/\*/g, "").trim();
    if (term.length > 2 && term.length < 40) {
      tokenize(term).forEach(t => tags.add(t));
    }
  });

  // Extract Obsidian [[WikiLinks]] as related terms
  const wikiLinks = content.match(/\[\[([^\]]+)\]\]/g) ?? [];
  wikiLinks.slice(0, 15).forEach(m => {
    const term = m.replace(/\[\[|\]\]/g, "").split("/").pop() ?? "";
    if (term.length > 2) tokenize(term).forEach(t => tags.add(t));
  });

  // Daggerheart-specific mechanical keywords to extract from content
  const mechKeywords = [
    "hp", "hit points", "evasion", "stress", "hope", "fear",
    "damage threshold", "thresholds", "reaction", "action roll",
    "spellcast", "melee", "ranged", "close", "far", "very close", "very far",
    "passive", "active", "reaction", "spotlight", "advantage", "disadvantage",
    "rest", "short rest", "long rest", "foundation", "specialization", "mastery",
    "tier", "leader", "standard", "skull", "solo", "horde",
    "creep", "etherotaxia", "bloom", "forestdown",
    "physical", "magical", "fire", "cold", "lightning",
    "prone", "restrained", "frightened", "hidden", "invisible",
    "gmc", "npc", "ally", "adversary",
  ];

  const contentLower = content.toLowerCase();
  mechKeywords.forEach(kw => {
    if (contentLower.includes(kw)) tags.add(kw.replace(/\s+/g, "-"));
  });

  // Tier extraction (Tier 1, Tier 2, etc.)
  const tierMatch = content.match(/Tier\s+(\d+)/i);
  if (tierMatch) tags.add(`tier-${tierMatch[1]}`);

  // Level extraction for domain cards: "(Level 1)", "(Level 2)", etc.
  const levelMatch = title.match(/Level\s+(\d+)/i);
  if (levelMatch) tags.add(`level-${levelMatch[1]}`);

  // Remove very short or very long tags
  return Array.from(tags).filter(t => t.length >= 2 && t.length <= 40);
}

function tokenize(str) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(t => t.length >= 2 && !STOP_WORDS.has(t));
}

const STOP_WORDS = new Set([
  "a", "an", "the", "and", "or", "but", "in", "on", "at", "to", "for",
  "of", "with", "by", "from", "is", "it", "as", "be", "was", "are",
  "has", "have", "had", "do", "does", "did", "will", "would", "could",
  "should", "may", "might", "not", "no", "if", "then", "than", "that",
  "this", "these", "those", "all", "any", "each", "more", "most",
  "your", "you", "they", "them", "their", "its", "one", "two", "can",
]);

// ─── Recursive file walker ────────────────────────────────────────────────────

function walkDir(dir) {
  const entries = readdirSync(dir);
  const files = [];
  for (const entry of entries) {
    if (entry.startsWith(".")) continue;
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      if (!SKIP_FOLDERS.has(entry)) {
        files.push(...walkDir(full));
      }
    } else if (extname(entry) === ".md") {
      files.push(full);
    }
  }
  return files;
}

// ─── Section + Level from path ───────────────────────────────────────────────

function parsePath(filePath) {
  const rel       = relative(MARKDOWN_DIR, filePath);           // e.g. "Domains/Artistry/(Level 1) Bewitch.md"
  const parts     = rel.split(/[\\/]/);                         // ["Domains", "Artistry", "(Level 1) Bewitch.md"]
  const topFolder = parts[0];
  const section   = SECTION_MAP[topFolder] ?? topFolder;
  const subsection = parts.length > 2
    ? parts[parts.length - 2]                                    // e.g. "Artistry"
    : undefined;
  const level = parts.length === 2 ? 1 : parts.length === 3 ? 2 : 3;
  const title = basename(filePath, ".md");                      // strip extension
  return { section, subsection, level, title, rel };
}

// ─── Main build ───────────────────────────────────────────────────────────────

function build() {
  console.log(`\n🔍 Daggerheart SRD Index Builder`);
  console.log(`   Source : ${MARKDOWN_DIR}`);
  console.log(`   Output : ${OUTPUT_FILE}\n`);

  const allFiles = walkDir(MARKDOWN_DIR);
  console.log(`   Found  : ${allFiles.length} markdown files`);

  const chunks = [];
  let skipped = 0;

  for (const filePath of allFiles) {
    const content = readFileSync(filePath, "utf-8");

    // Skip pure navigation files
    if (isNavigationOnly(content)) {
      skipped++;
      continue;
    }

    const { section, subsection, level, title, rel } = parsePath(filePath);

    const id   = makeSlug(section, title);
    const tags = deriveTags(section, subsection, title, content);

    const chunk = {
      id,
      title,
      section,
      ...(subsection ? { subsection } : {}),
      content: content.trim(),
      filePath: rel,
      tags,
      level,
    };

    chunks.push(chunk);
  }

  // Sort for deterministic output: section → title
  chunks.sort((a, b) => {
    if (a.section !== b.section) return a.section.localeCompare(b.section);
    return a.title.localeCompare(b.title);
  });

  // Ensure output directory exists
  mkdirSync(OUTPUT_DIR, { recursive: true });

  writeFileSync(OUTPUT_FILE, JSON.stringify(chunks, null, 2), "utf-8");

  console.log(`   Indexed: ${chunks.length} chunks`);
  console.log(`   Skipped: ${skipped} navigation-only files`);

  // Section breakdown
  const bySection = {};
  chunks.forEach(c => {
    bySection[c.section] = (bySection[c.section] ?? 0) + 1;
  });
  console.log(`\n   Section breakdown:`);
  Object.entries(bySection)
    .sort(([,a], [,b]) => b - a)
    .forEach(([s, n]) => console.log(`     ${s.padEnd(24)} ${n}`));

  console.log(`\n✅  Written to ${OUTPUT_FILE}\n`);
}

build();
