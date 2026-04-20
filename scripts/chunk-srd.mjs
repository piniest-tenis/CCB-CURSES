/**
 * scripts/chunk-srd.mjs
 *
 * Daggerheart SRD Chunking & Indexing Script — Canonical Digest Edition
 * =========================================================================
 * DEPRECATED: This Node.js script parsed the OLD raw PDF extraction at:
 *   .opencode/supporting-docs/Daggerheart-SRD-digested.md
 *
 * It has been superseded by the Python-based chunker:
 *   scripts/chunk-srd.py
 * which parses the human-readable digest at:
 *   .opencode/supporting-docs/Daggerheart-SRD-HumanReadable-digested.normalized.md
 *
 * Run the new script with:  python3 scripts/chunk-srd.py
 *
 * Outputs a FLAT ARRAY of SRDChunk objects to:
 *   frontend/public/srd-index.json
 *
 * The old Node.js script is retained for reference only.
 * Run with:  node scripts/chunk-srd.mjs  (if node is available)
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─── Configuration ────────────────────────────────────────────────────────────

const REPO_ROOT = path.resolve(__dirname, "..");
const SRD_SOURCE = path.join(
  REPO_ROOT,
  ".opencode",
  "supporting-docs",
  "Daggerheart-SRD-digested.md"
);
const OUTPUT_PATH = path.join(
  REPO_ROOT,
  "frontend",
  "public",
  "srd-index.json"
);

const FILE_PATH = "Daggerheart-SRD-digested.md";

// ─── Canonical SRD Structure ──────────────────────────────────────────────────

const CLASSES = [
  "Bard", "Druid", "Guardian", "Ranger", "Rogue",
  "Seraph", "Sorcerer", "Warrior", "Wizard",
];

// Each class's unique DOMAINS pairing (used for unambiguous detection)
const CLASS_DOMAINS = {
  Bard:      "Grace & Codex",
  Druid:     "Sage & Arcana",
  Guardian:  "Valor and Blade",
  Ranger:    "Bone & Sage",
  Rogue:     "Midnight & Grace",
  Seraph:    "Splendor & Valor",
  Sorcerer:  "Arcana & Midnight",
  Warrior:   "Blade & Bone",
  Wizard:    "Codex & Splendor",
};

const ANCESTRIES = [
  "Clank", "Drakona", "Dwarf", "Elf", "Faerie", "Faun", "Firbolg",
  "Fungril", "Galapa", "Giant", "Goblin", "Halfling", "Human",
  "Infernis", "Katari", "Orc", "Ribbet", "Simiah",
];

const COMMUNITIES = [
  "Highborne", "Loreborne", "Orderborne", "Ridgeborne", "Seaborne",
  "Slyborne", "Underborne", "Wanderborne", "Wildborne",
];

const DOMAINS = [
  "Arcana", "Blade", "Bone", "Codex", "Grace",
  "Midnight", "Sage", "Splendor", "Valor",
];

// ─── Utilities ────────────────────────────────────────────────────────────────

function slugify(str) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-|-$/g, "");
}

const STOP_WORDS = new Set([
  "a","an","the","and","or","of","in","to","for","is","it","at","by","on",
  "as","be","if","so","do","up","my","we","no","you","can","are","was","has",
  "had","not","its","per","all","any","one","two","but","with","from","that",
  "this","your","they","have","their","will","when","each","make","take",
  "into","roll","once","long","rest","range","near","far","very","close",
  "next","turn","end","also","gain","use","may","must","would","could",
  "should","does","did","more","most","them","these","those","than",
]);

function tokenize(str) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w));
}

function extractTags(section, subsection, title, content) {
  const tags = new Set();

  tokenize(section).forEach((t) => tags.add(t));
  if (subsection) tokenize(subsection).forEach((t) => tags.add(t));
  tokenize(title).forEach((t) => tags.add(t));

  const mechKeywords = [
    "hp", "hit points", "evasion", "stress", "hope", "fear",
    "damage threshold", "thresholds", "reaction", "action roll",
    "spellcast", "melee", "ranged", "close", "far", "very close", "very far",
    "passive", "active", "spotlight", "advantage", "disadvantage",
    "rest", "short rest", "long rest", "foundation", "specialization", "mastery",
    "tier", "leader", "standard", "skull", "solo", "horde",
    "physical", "magical", "prone", "restrained", "frightened",
    "hidden", "invisible", "vulnerable", "stunned", "distracted",
    "beastform", "companion", "domain card", "armor slot",
    "proficiency", "experience", "level up", "multiclass",
    "duality dice", "critical success", "gold", "consumable",
  ];
  const contentLower = content.toLowerCase();
  mechKeywords.forEach((kw) => {
    if (contentLower.includes(kw)) tags.add(kw.replace(/\s+/g, "-"));
  });

  const tierMatch = content.match(/Tier\s+(\d+)/i);
  if (tierMatch) tags.add(`tier-${tierMatch[1]}`);

  tokenize(content.slice(0, 600)).forEach((t) => tags.add(t));

  return Array.from(tags).filter((t) => t.length >= 2 && t.length <= 40).sort();
}

/**
 * Clean extracted content:
 * - Strip page markers
 * - Strip "Daggerheart SRD" repeated headers
 * - Strip horizontal rules (---)
 * - Collapse excessive blank lines
 */
function cleanContent(rawText) {
  let text = rawText;
  // Strip page markers
  text = text.replace(/<!-- page \d+ -->/g, "");
  // Strip repeated "Daggerheart SRD" headers (as H1 or H2)
  text = text.replace(/^#{1,6}\s*Daggerheart SRD\s*$/gm, "");
  // Strip bare horizontal rules
  text = text.replace(/^-{3,}\s*$/gm, "");
  // Collapse runs of 3+ blank lines into 2
  text = text.replace(/\n{4,}/g, "\n\n\n");
  return text.trim();
}

// ─── Character-offset based boundary detection ────────────────────────────────
// The digested PDF puts many entries MID-LINE, so we use character offsets
// in the full text (not line numbers) to accurately slice content.

/**
 * Find a text pattern in the source and return its character offset.
 * Returns -1 if not found.
 */
function findOffset(text, pattern, fromOffset = 0) {
  if (pattern instanceof RegExp) {
    const searchText = text.slice(fromOffset);
    const match = searchText.match(pattern);
    if (!match) return -1;
    return fromOffset + match.index;
  }
  const idx = text.indexOf(pattern, fromOffset);
  return idx;
}

/**
 * Find the character offset of a class entry by:
 * 1. Finding its unique DOMAINS line
 * 2. Searching backward for "CLASSNAME Classnamepl ..." (the description start)
 */
function findClassOffset(text, className) {
  const domainPairing = CLASS_DOMAINS[className];
  if (!domainPairing) return -1;

  // Find the DOMAINS line with this class's specific domain pairing
  const domainsPattern = `DOMAINS - ${domainPairing}`;
  const domainsOffset = text.indexOf(domainsPattern);
  if (domainsOffset < 0) return -1;

  // Search backward from the DOMAINS line for the class name in uppercase
  // The class description typically starts as: "CLASSNAME Description..."
  const upperName = className.toUpperCase();
  const searchStart = Math.max(0, domainsOffset - 3000);
  const windowBefore = text.slice(searchStart, domainsOffset);

  // Find the LAST occurrence of "CLASSNAME " before the DOMAINS line
  // (closest to the DOMAINS line)
  let lastIdx = -1;
  let searchPos = 0;
  while (true) {
    const idx = windowBefore.indexOf(upperName + " ", searchPos);
    if (idx < 0) break;
    lastIdx = idx;
    searchPos = idx + 1;
  }

  if (lastIdx >= 0) {
    return searchStart + lastIdx;
  }

  // Fallback: use 200 chars before DOMAINS line
  return Math.max(0, domainsOffset - 200);
}

/**
 * Find an ancestry entry offset. Ancestry entries start with "ANCESTRYNAME Ancestrynamepl are..."
 */
function findAncestryOffset(text, ancestryName, fromOffset = 0) {
  const upper = ancestryName.toUpperCase();
  // Ancestry entries: "CLANK Clanks are..." or "ELF Elves are..."
  // The plural form varies, so just look for "UPPERNAME " followed by a capital letter
  const searchText = text.slice(fromOffset);

  // Try exact pattern: UPPERNAME followed by a space and capital letter (start of description)
  const pattern = new RegExp(`${upper} [A-Z][a-z]`);
  const match = searchText.match(pattern);
  if (match) {
    return fromOffset + match.index;
  }
  return -1;
}

/**
 * Find a community entry offset. Communities start with:
 * "COMMUNITYNAME Being part of a ..." or "COMMUNITYNAME description..."
 */
function findCommunityOffset(text, communityName, fromOffset = 0) {
  const upper = communityName.toUpperCase();
  const searchText = text.slice(fromOffset);
  const pattern = new RegExp(`${upper} [A-Z][a-z]`);
  const match = searchText.match(pattern);
  if (match) {
    return fromOffset + match.index;
  }
  return -1;
}

/**
 * Build the ordered boundary list as character offsets.
 * Each boundary: { offset, section, subsection, title }
 */
function detectBoundaries(text) {
  const boundaries = [];

  // ── Major section markers (after the TOC) ──────────────────────────────
  // TOC ends around "## APPENDIX 119" at line ~37.
  // Find the real sections (not TOC entries which have page numbers).

  // Find INTRODUCTION (the real one, not the TOC entry "INTRODUCTION 3")
  // The real one is "## INTRODUCTION" followed by a newline and then content
  const tocEnd = text.indexOf("Domain Card Reference 119");
  // Start searching from the line containing "Domain Card Reference 119"
  // but NOT past the actual "## INTRODUCTION" header that immediately follows
  const afterToc = tocEnd >= 0 ? tocEnd : 300;

  const introOffset = findOffset(text, "## INTRODUCTION\n", afterToc);
  const charCreationOffset = findOffset(text, "## CHARACTER CREATION\n", afterToc);
  const coreMaterialsOffset = findOffset(text, "## CORE MATERIALS\n", afterToc);
  const coreMechanicsOffset = findOffset(text, "## CORE MECHANICS\n", afterToc);
  const runningAdventureOffset = findOffset(text, "## RUNNING AN ADVENTURE\n", afterToc);
  const appendixOffset = findOffset(text, "## APPENDIX\n", afterToc);

  // ── INTRODUCTION ──────────────────────────────────────────────────────
  if (introOffset >= 0) {
    boundaries.push({
      offset: introOffset,
      endOffset: charCreationOffset >= 0 ? charCreationOffset : coreMaterialsOffset,
      section: "Introduction",
      subsection: undefined,
      title: "Introduction",
    });
  }

  // ── CHARACTER CREATION ────────────────────────────────────────────────
  if (charCreationOffset >= 0) {
    boundaries.push({
      offset: charCreationOffset,
      endOffset: coreMaterialsOffset >= 0 ? coreMaterialsOffset : coreMechanicsOffset,
      section: "Character Creation",
      subsection: undefined,
      title: "Character Creation",
    });
  }

  // ── DOMAINS OVERVIEW ──────────────────────────────────────────────────
  // From CORE MATERIALS to the first class (Bard)
  if (coreMaterialsOffset >= 0) {
    const firstClassOffset = findClassOffset(text, "Bard");
    boundaries.push({
      offset: coreMaterialsOffset,
      endOffset: firstClassOffset >= 0 ? firstClassOffset : coreMechanicsOffset,
      section: "Domains",
      subsection: "Overview",
      title: "Domains Overview",
    });
  }

  // ── CLASSES ───────────────────────────────────────────────────────────
  const classOffsets = [];
  for (const cls of CLASSES) {
    const offset = findClassOffset(text, cls);
    if (offset >= 0) {
      classOffsets.push({ name: cls, offset });
    } else {
      console.warn(`  [WARN] Could not find class: ${cls}`);
    }
  }
  // Sort by offset to determine end boundaries
  classOffsets.sort((a, b) => a.offset - b.offset);

  for (let i = 0; i < classOffsets.length; i++) {
    const cls = classOffsets[i];
    const nextEnd = (i < classOffsets.length - 1)
      ? classOffsets[i + 1].offset
      : findOffset(text, "ANCESTRIES\n", cls.offset); // End at ANCESTRIES section

    boundaries.push({
      offset: cls.offset,
      endOffset: nextEnd >= 0 ? nextEnd : coreMechanicsOffset,
      section: "Classes",
      subsection: cls.name,
      title: cls.name,
    });
  }

  // ── ANCESTRIES ────────────────────────────────────────────────────────
  // Find the ANCESTRIES header (the real section, not a reference)
  const ancestriesHeaderOffset = findAncestryHeader(text, classOffsets.length > 0
    ? classOffsets[classOffsets.length - 1].offset
    : (coreMaterialsOffset || 0));

  if (ancestriesHeaderOffset >= 0) {
    // Find first ancestry entry
    const firstAncOffset = findAncestryOffset(text, "Clank", ancestriesHeaderOffset);
    if (firstAncOffset > ancestriesHeaderOffset) {
      boundaries.push({
        offset: ancestriesHeaderOffset,
        endOffset: firstAncOffset,
        section: "Ancestries",
        subsection: "Overview",
        title: "Ancestries Overview",
      });
    }

    // Each ancestry
    const ancOffsets = [];
    for (const anc of ANCESTRIES) {
      const offset = findAncestryOffset(text, anc, ancestriesHeaderOffset);
      if (offset >= 0) {
        ancOffsets.push({ name: anc, offset });
      } else {
        console.warn(`  [WARN] Could not find ancestry: ${anc}`);
      }
    }
    ancOffsets.sort((a, b) => a.offset - b.offset);

    for (let i = 0; i < ancOffsets.length; i++) {
      const anc = ancOffsets[i];
      let nextEnd;
      if (i < ancOffsets.length - 1) {
        nextEnd = ancOffsets[i + 1].offset;
      } else {
        // After last ancestry, look for Mixed Ancestry or COMMUNITIES
        nextEnd = findOffset(text, "MIXED ANCESTRY", anc.offset + 10);
        if (nextEnd < 0) nextEnd = findOffset(text, "Mixed Ancestry", anc.offset + 10);
      }
      boundaries.push({
        offset: anc.offset,
        endOffset: nextEnd >= 0 ? nextEnd : coreMechanicsOffset,
        section: "Ancestries",
        subsection: anc.name,
        title: anc.name,
      });
    }

    // Mixed Ancestry
    let mixedOffset = findOffset(text, "MIXED ANCESTRY", ancestriesHeaderOffset);
    if (mixedOffset < 0) mixedOffset = findOffset(text, "Mixed Ancestry", ancestriesHeaderOffset);
    const communitiesOffset = findCommunitiesHeader(text, ancestriesHeaderOffset);
    if (mixedOffset >= 0) {
      boundaries.push({
        offset: mixedOffset,
        endOffset: communitiesOffset >= 0 ? communitiesOffset : coreMechanicsOffset,
        section: "Ancestries",
        subsection: "Mixed Ancestry",
        title: "Mixed Ancestry",
      });
    }
  }

  // ── COMMUNITIES ───────────────────────────────────────────────────────
  const commHeaderOffset = findCommunitiesHeader(text, ancestriesHeaderOffset || (coreMaterialsOffset || 0));
  if (commHeaderOffset >= 0) {
    const firstCommOffset = findCommunityOffset(text, "Highborne", commHeaderOffset);
    if (firstCommOffset > commHeaderOffset) {
      boundaries.push({
        offset: commHeaderOffset,
        endOffset: firstCommOffset,
        section: "Communities",
        subsection: "Overview",
        title: "Communities Overview",
      });
    }

    const commOffsets = [];
    for (const comm of COMMUNITIES) {
      const offset = findCommunityOffset(text, comm, commHeaderOffset);
      if (offset >= 0) {
        commOffsets.push({ name: comm, offset });
      } else {
        console.warn(`  [WARN] Could not find community: ${comm}`);
      }
    }
    commOffsets.sort((a, b) => a.offset - b.offset);

    for (let i = 0; i < commOffsets.length; i++) {
      const comm = commOffsets[i];
      const nextEnd = (i < commOffsets.length - 1)
        ? commOffsets[i + 1].offset
        : coreMechanicsOffset;
      boundaries.push({
        offset: comm.offset,
        endOffset: nextEnd >= 0 ? nextEnd : coreMechanicsOffset,
        section: "Communities",
        subsection: comm.name,
        title: comm.name,
      });
    }
  }

  // ── CORE MECHANICS ────────────────────────────────────────────────────
  if (coreMechanicsOffset >= 0) {
    const endSection = runningAdventureOffset >= 0 ? runningAdventureOffset : appendixOffset;
    detectOffsetSubsections(text, coreMechanicsOffset, endSection, "Core Mechanics", [
      { name: "Flow of the Game", trigger: "FLOW OF THE GAME" },
      { name: "Action Rolls", trigger: "MAKING MOVES & TAKING ACTION" },
      { name: "Combat", trigger: /COMBAT\n/i },
      { name: "Stress", trigger: /\nSTRESS\b/i },
      { name: "Attacking", trigger: /\nATTACKING\b/i },
      { name: "Maps, Range & Movement", trigger: "MAPS, RANGE" },
      { name: "Conditions", trigger: /\nCONDITIONS\b/i },
      { name: "Downtime", trigger: /\nDOWNTIME\b/i },
      { name: "Death", trigger: /\nDEATH\b/i },
      { name: "Leveling Up", trigger: "LEVELING UP" },
      { name: "Multiclassing", trigger: "MULTICLASSING" },
      { name: "Equipment", trigger: /\nEQUIPMENT\b/i },
      { name: "Weapons", trigger: /\nWEAPONS\b/i },
      { name: "Combat Wheelchair", trigger: "Combat Wheelchair" },
      { name: "Armor", trigger: /\nARMOR Every armor/i },
      { name: "Loot", trigger: /\nLOOT\b/i },
      { name: "Consumables", trigger: /\nCONSUMABLES\b/i },
    ], boundaries);
  }

  // ── RUNNING AN ADVENTURE ──────────────────────────────────────────────
  if (runningAdventureOffset >= 0) {
    const endSection = appendixOffset >= 0 ? appendixOffset : text.length;
    detectOffsetSubsections(text, runningAdventureOffset, endSection, "Running an Adventure", [
      { name: "GM Guidance", trigger: "GM GUIDANCE" },
      { name: "Core GM Mechanics", trigger: "CORE GM MECHANICS" },
      { name: "Adversaries and Environments", trigger: "ADVERSARIES AND ENVIRONMENTS" },
      { name: "Additional GM Guidance", trigger: "ADDITIONAL GM GUIDANCE" },
      { name: "The Witherwild", trigger: "The Witherwild\n" },
    ], boundaries);
  }

  // ── APPENDIX ──────────────────────────────────────────────────────────
  if (appendixOffset >= 0) {
    const domainTriggers = DOMAINS.map((d) => ({
      name: `${d} Domain Cards`,
      trigger: `${d.toUpperCase()} DOMAIN`,
    }));
    detectOffsetSubsections(text, appendixOffset, text.length, "Appendix",
      domainTriggers, boundaries);
  }

  // Sort by offset
  boundaries.sort((a, b) => a.offset - b.offset);
  return boundaries;
}

/**
 * Find the ANCESTRIES section header.
 */
function findAncestryHeader(text, fromOffset) {
  // Look for "ANCESTRIES" on its own line or ending a line before the ancestry descriptions
  // Pattern: line ending with "ANCESTRIES\n" followed by ancestry descriptions
  const searchText = text.slice(fromOffset);
  // Match the word ANCESTRIES that's a section header, NOT a reference
  // The real section is preceded by a CONNECTIONS answer text
  const match = searchText.match(/ANCESTRIES\n\n## Ancestries represent/);
  if (match) return fromOffset + match.index;

  // Fallback: find "ANCESTRIES" not followed by digits
  const idx = searchText.indexOf("ANCESTRIES\n");
  if (idx >= 0) {
    // Verify it's the section header (should be followed by ancestry content)
    const after = searchText.slice(idx, idx + 200);
    if (after.includes("ancestry") || after.includes("lineage")) {
      return fromOffset + idx;
    }
  }
  return -1;
}

/**
 * Find the COMMUNITIES section header.
 */
function findCommunitiesHeader(text, fromOffset) {
  const searchText = text.slice(fromOffset);
  const match = searchText.match(/\nCOMMUNITIES\n/);
  if (match) {
    // Verify it's followed by community descriptions
    const after = searchText.slice(match.index, match.index + 300);
    if (after.includes("communit") || after.includes("culture") || after.includes("environment")) {
      return fromOffset + match.index + 1; // +1 to skip the leading \n
    }
  }
  return -1;
}

/**
 * Detect subsections within a range using triggers.
 */
function detectOffsetSubsections(text, startOffset, endOffset, sectionName, subsectionDefs, boundaries) {
  const sectionText = text.slice(startOffset, endOffset || text.length);
  const found = [];

  for (const sub of subsectionDefs) {
    let matchOffset = -1;
    if (typeof sub.trigger === "string") {
      const idx = sectionText.indexOf(sub.trigger);
      if (idx >= 0) matchOffset = startOffset + idx;
    } else if (sub.trigger instanceof RegExp) {
      const match = sectionText.match(sub.trigger);
      if (match) matchOffset = startOffset + match.index;
    }
    if (matchOffset >= 0) {
      found.push({ name: sub.name, offset: matchOffset });
    }
  }

  found.sort((a, b) => a.offset - b.offset);

  if (found.length === 0) {
    boundaries.push({
      offset: startOffset,
      endOffset: endOffset || text.length,
      section: sectionName,
      subsection: undefined,
      title: sectionName,
    });
    return;
  }

  // Preamble
  if (found[0].offset > startOffset + 50) {
    boundaries.push({
      offset: startOffset,
      endOffset: found[0].offset,
      section: sectionName,
      subsection: "Overview",
      title: `${sectionName} Overview`,
    });
  }

  // Each subsection
  for (let i = 0; i < found.length; i++) {
    const nextEnd = (i < found.length - 1) ? found[i + 1].offset : (endOffset || text.length);
    boundaries.push({
      offset: found[i].offset,
      endOffset: nextEnd,
      section: sectionName,
      subsection: found[i].name,
      title: found[i].name,
    });
  }
}

// ─── Chunk builder ────────────────────────────────────────────────────────────

function buildChunks(text, boundaries) {
  const chunks = [];
  const idSet = new Map();

  for (const boundary of boundaries) {
    const rawContent = text.slice(boundary.offset, boundary.endOffset || text.length);
    const content = cleanContent(rawContent);

    if (!content || content.length < 10) continue;

    // Build unique ID
    const sectionSlug = slugify(boundary.section);
    const subsectionSlug = boundary.subsection ? slugify(boundary.subsection) : "";
    let baseId = subsectionSlug
      ? `${sectionSlug}-${subsectionSlug}`
      : sectionSlug;

    // Ensure uniqueness
    const count = idSet.get(baseId) ?? 0;
    idSet.set(baseId, count + 1);
    const id = count === 0 ? baseId : `${baseId}-${count + 1}`;

    const tags = extractTags(boundary.section, boundary.subsection, boundary.title, content);

    chunks.push({
      id,
      title: boundary.title,
      section: boundary.section,
      ...(boundary.subsection ? { subsection: boundary.subsection } : {}),
      content,
      filePath: FILE_PATH,
      tags,
      level: boundary.subsection ? 2 : 1,
    });
  }

  return chunks;
}

// ─── Chunk splitting for oversized entries ────────────────────────────────────

const MAX_CHUNK_SIZE = 8000;

function splitOversizedChunks(chunks) {
  const result = [];
  for (const chunk of chunks) {
    if (chunk.content.length <= MAX_CHUNK_SIZE) {
      result.push(chunk);
      continue;
    }

    const paragraphs = chunk.content.split(/\n\n+/);
    let currentContent = "";
    let partNum = 1;

    for (const para of paragraphs) {
      if (currentContent.length + para.length > MAX_CHUNK_SIZE && currentContent.length > 0) {
        result.push({
          ...chunk,
          id: `${chunk.id}-part-${partNum}`,
          title: `${chunk.title} (Part ${partNum})`,
          content: currentContent.trim(),
          tags: extractTags(chunk.section, chunk.subsection, chunk.title, currentContent),
        });
        partNum++;
        currentContent = para;
      } else {
        currentContent += (currentContent ? "\n\n" : "") + para;
      }
    }

    if (currentContent.trim()) {
      if (partNum === 1) {
        result.push(chunk);
      } else {
        result.push({
          ...chunk,
          id: `${chunk.id}-part-${partNum}`,
          title: `${chunk.title} (Part ${partNum})`,
          content: currentContent.trim(),
          tags: extractTags(chunk.section, chunk.subsection, chunk.title, currentContent),
        });
      }
    }
  }
  return result;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

function main() {
  console.log("═".repeat(60));
  console.log("  Daggerheart SRD Chunking Pipeline — Canonical Digest");
  console.log("  " + new Date().toISOString());
  console.log("═".repeat(60));
  console.log(`  Source:  ${SRD_SOURCE}`);
  console.log(`  Output:  ${OUTPUT_PATH}`);
  console.log();

  if (!fs.existsSync(SRD_SOURCE)) {
    console.error(`  ❌ Source file not found: ${SRD_SOURCE}`);
    process.exit(1);
  }

  // Normalize CRLF → LF (the digest file uses Windows line endings)
  const text = fs.readFileSync(SRD_SOURCE, "utf-8").replace(/\r\n/g, "\n");
  console.log(`  Source file size: ${Math.round(text.length / 1024)} KB`);

  // Detect boundaries
  const boundaries = detectBoundaries(text);
  console.log(`  Detected ${boundaries.length} logical sections/subsections`);
  console.log();

  // Build chunks
  let chunks = buildChunks(text, boundaries);
  console.log(`  Raw chunks: ${chunks.length}`);

  // Split oversized chunks
  chunks = splitOversizedChunks(chunks);
  console.log(`  After splitting oversized: ${chunks.length}`);

  // Sort: section order → subsection → id
  const sectionOrder = [
    "Introduction", "Character Creation", "Domains", "Classes", "Ancestries",
    "Communities", "Core Mechanics", "Running an Adventure", "Appendix",
  ];
  const sectionRank = {};
  sectionOrder.forEach((s, i) => sectionRank[s] = i);

  chunks.sort((a, b) => {
    const rankA = sectionRank[a.section] ?? 99;
    const rankB = sectionRank[b.section] ?? 99;
    if (rankA !== rankB) return rankA - rankB;
    if ((a.subsection || "") !== (b.subsection || "")) {
      return (a.subsection || "").localeCompare(b.subsection || "");
    }
    return a.id.localeCompare(b.id);
  });

  // Write output as FLAT ARRAY
  const outputDir = path.dirname(OUTPUT_PATH);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
    console.log(`  Created output dir: ${outputDir}`);
  }

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(chunks, null, 2), "utf-8");

  const outputSizeKB = Math.round(fs.statSync(OUTPUT_PATH).size / 1024);

  // ── Report ──────────────────────────────────────────────────────────────
  console.log();
  console.log("─".repeat(60));
  console.log(`  ✓ Written to: ${OUTPUT_PATH}`);
  console.log(`  ✓ File size:  ~${outputSizeKB} KB`);
  console.log(`  ✓ Output format: FLAT ARRAY (Array.isArray compatible)`);
  console.log();

  const sectionCounts = {};
  for (const chunk of chunks) {
    sectionCounts[chunk.section] = (sectionCounts[chunk.section] || 0) + 1;
  }

  console.log("  Per-Section Summary:");
  console.log("  " + "─".repeat(45));
  for (const section of sectionOrder) {
    const count = sectionCounts[section] || 0;
    const padding = " ".repeat(Math.max(0, 30 - section.length));
    console.log(`    ${section}${padding} ${String(count).padStart(4)} chunks`);
  }
  console.log("  " + "─".repeat(45));
  console.log(
    `    ${"TOTAL".padEnd(30)} ${String(chunks.length).padStart(4)} chunks`
  );
  console.log();

  // List all unique sections and subsections
  console.log("  All Section → Subsection Entries:");
  console.log("  " + "─".repeat(45));
  const sectionSubs = {};
  for (const chunk of chunks) {
    const key = chunk.section;
    if (!sectionSubs[key]) sectionSubs[key] = new Set();
    if (chunk.subsection) sectionSubs[key].add(chunk.subsection);
  }
  for (const section of sectionOrder) {
    const subs = sectionSubs[section];
    if (!subs || subs.size === 0) {
      console.log(`    ${section}`);
    } else {
      console.log(`    ${section}:`);
      for (const sub of [...subs].sort()) {
        console.log(`      → ${sub}`);
      }
    }
  }

  // Content quality checks
  console.log();
  console.log("  Content Quality Checks:");
  console.log("  " + "─".repeat(45));

  // Check class content starts with the right text
  for (const cls of CLASSES) {
    const chunk = chunks.find((c) => c.section === "Classes" && c.subsection === cls);
    if (chunk) {
      const startsCorrectly = chunk.content.toUpperCase().startsWith(cls.toUpperCase());
      const status = startsCorrectly ? "✓" : "⚠";
      console.log(`    ${status} ${cls}: ${chunk.content.length} chars, starts: "${chunk.content.slice(0, 40)}..."`);
    } else {
      console.log(`    ✗ ${cls}: MISSING`);
    }
  }

  console.log();
  console.log("═".repeat(60));
}

main();
