/**
 * src/lib/srdSearch.ts
 *
 * Daggerheart SRD — Comprehensive Fuzzy Search Service
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * ARCHITECTURE OVERVIEW
 * ─────────────────────
 * Two complementary engines run in parallel and their scores are merged:
 *
 *  1. Fuse.js  — Levenshtein-distance fuzzy matching on title + tags.
 *               Best for short, typo-prone queries ("blom hart" → "Bloom Heart").
 *               Config: threshold 0.4, includeScore, min-match 1.
 *
 *  2. MiniSearch — Inverted-index full-text search with BM25 ranking.
 *               Best for content-level keyword recall ("creep expansion halts").
 *               Config: prefix + fuzzy fallback, field-weight boosting.
 *
 * RANKING FORMULA
 * ───────────────
 *   finalScore = (fuseScore × fuseWeight) + (miniScore × miniWeight)
 *              × titleExactBoost × titleFuzzyBoost × tagBoost
 *              × sectionContextBoost × recencyBoost
 *
 * Weights (tuneable via SearchOptions):
 *   fuseWeight   = 0.4   (stronger for short/misspelled queries)
 *   miniWeight   = 0.6   (stronger for content-level recall)
 *   titleExact   = 3.0×  (exact title match)
 *   titleFuzzy   = 2.0×  (fuzzy title match)
 *   tagMatch     = 1.5×  (tag hit)
 *   sectionBoost = 1.3×  (active section context)
 *   recencyBoost = 1.2×  (recently searched items)
 *
 * SYNONYM / ALIAS DICTIONARY
 * ──────────────────────────
 * Canonical SRD terms → aliases are expanded at query-parse time so that
 * "HP" searches "Hit Points", "evasion" also surfaces "armor class", etc.
 *
 * SIMILAR CHUNKS
 * ──────────────
 * Jaccard similarity on the tags sets; falls back to section membership.
 * Results are memoized in a WeakMap keyed by the chunk reference.
 *
 * RECENT SEARCHES
 * ───────────────
 * Stored in localStorage at key `srd_recent_searches` (max 20 entries).
 * `recordSearch()` writes; `getSuggestions("")` reads them.
 */

import Fuse, { type FuseResult, type IFuseOptions } from "fuse.js";
import MiniSearch, { type SearchResult as MiniSearchResult } from "minisearch";
import { getCanonicalSimilar } from "./srdSimilarityMap";
import type { SRDSubEntry, SRDSubEntryIndex } from "@shared/types/srd";

// ─── Public Types ─────────────────────────────────────────────────────────────

export interface SRDChunk {
  /** Unique slug, e.g. "classes-guardian" */
  id: string;
  /** Human-readable title, e.g. "Guardian" */
  title: string;
  /** Top-level section: "Classes" | "Ancestries" | "Core Mechanics" | … */
  section: string;
  /** Optional sub-section, e.g. "Adversaries and Environments" within Running an Adventure */
  subsection?: string;
  /** Full markdown text of this chunk */
  content: string;
  /** Source file path relative to /markdown */
  filePath: string;
  /** Derived keywords / topic tags */
  tags: string[];
  /** Heading level that originated this chunk (1, 2, or 3) */
  level: number;
}

export interface SearchOptions {
  /** Limit results (default: 20) */
  limit?: number;
  /**
   * If set, results from this section receive a score boost.
   * Pass the section name the user is currently browsing.
   */
  sectionContext?: string;
  /** Minimum score threshold 0–1 (default: 0.1) */
  minScore?: number;
  /** Override fuse weight 0–1 (default: 0.4) */
  fuseWeight?: number;
  /** Override mini weight 0–1 (default: 0.6) */
  miniWeight?: number;
}

export interface SearchResult {
  chunk: SRDChunk;
  /** Normalized relevance score 0–1, higher = better */
  score: number;
  /** Primary field the match was found in */
  matchedOn: "title" | "tags" | "content";
  /** Human-readable explanation of why this result ranked here */
  explanation: string;
  /** Match quality classification for exact-before-fuzzy filtering */
  matchQuality?: 'exact' | 'fuzzy';
  /** If this result is a sub-entry rather than a full chunk */
  subEntry?: SRDSubEntry;
}

export interface SuggestionResult {
  id: string;
  title: string;
  section: string;
  subsection?: string;
  /** Primary field the suggestion matched against */
  matchedOn: "title" | "tag" | "content";
  /** Normalized relevance score 0–1 */
  score: number;
}

// ─── Internal State ───────────────────────────────────────────────────────────

let fuseInstance: Fuse<SRDChunk> | null = null;
let miniInstance: MiniSearch<SRDChunk> | null = null;
let chunkMap: Map<string, SRDChunk> = new Map();
let isInitialized = false;

/** Memoization cache for getSimilarChunks (keyed by chunkId) */
const similarCache = new Map<string, SRDChunk[]>();

/** Sub-entry lookup map (keyed by sub-entry ID) */
let subEntryMap: Map<string, SRDSubEntry> = new Map();
/** Sub-entries grouped by parent chunk ID */
let subEntriesByParent: Map<string, SRDSubEntry[]> = new Map();
/** Fuse index over sub-entries for fuzzy name matching */
let subEntryFuse: Fuse<SRDSubEntry> | null = null;

// ─── Synonym / Alias Dictionary ───────────────────────────────────────────────
// Maps common shorthands, abbreviations, and player-speak to canonical SRD terms.
// Query expansion runs on the raw query string before feeding both engines.

const SYNONYM_MAP: Record<string, string[]> = {
  // Stats & mechanics
  hp: ["hit points", "hp"],
  "hit points": ["hp", "hit points"],
  evasion: ["evasion", "armor", "defense", "ac"],
  ac: ["evasion", "armor class", "ac"],
  dt: ["damage thresholds", "dt", "thresholds"],
  "damage threshold": ["dt", "damage thresholds", "thresholds"],
  thresholds: ["damage thresholds", "dt", "thresholds"],
  str: ["strength", "str"],
  strength: ["strength", "str"],
  agi: ["agility", "agi"],
  agility: ["agility", "agi"],
  fin: ["finesse", "fin"],
  finesse: ["finesse", "fin"],
  ins: ["instinct", "ins"],
  instinct: ["instinct", "ins"],
  pre: ["presence", "pre"],
  presence: ["presence", "pre"],
  kno: ["knowledge", "kno"],
  knowledge: ["knowledge", "kno"],
  // Gameplay terms
  hope: ["hope", "hope points"],
  fear: ["fear", "fear points", "gm fear"],
  stress: ["stress", "stress marks"],
  rest: ["rest", "short rest", "long rest", "downtime"],
  "short rest": ["rest", "short rest", "downtime"],
  "long rest": ["rest", "long rest", "downtime"],
  // Range vocabulary
  melee: ["very close", "close", "melee"],
  ranged: ["far", "very far", "ranged", "range"],
  close: ["close", "melee range"],
  far: ["far", "ranged"],
  // Action types
  action: ["action", "action roll"],
  reaction: ["reaction", "reaction roll"],
  attack: ["attack", "attack roll", "weapon attack"],
  spellcast: ["spellcast", "spellcast roll", "spell", "magic"],
  // Condition shorthands
  prone: ["prone", "fall prone"],
  restrained: ["restrained", "immobilized"],
  frightened: ["frightened", "fear condition"],
  hidden: ["hidden", "stealth"],
  // Content type aliases
  class: ["class", "character class", "subclass"],
  subclass: ["subclass", "class feature", "specialization", "mastery"],
  ancestry: ["ancestry", "ancestries", "race", "species"],
  community: ["community", "background", "upbringing"],
  domain: ["domain", "domains", "card", "domain card"],
  adversary: ["adversary", "adversaries", "enemy", "monster", "creature", "npc"],
  monster: ["adversary", "adversaries", "enemy", "monster"],
  environment: ["environment", "encounter environment", "scene"],
  // Common abbreviations
  gm: ["gm", "game master", "guide"],
  pc: ["pc", "player character", "character"],
  gmc: ["gmc", "game master character", "npc"],
  npc: ["npc", "gmc", "non-player character"],
  srd: ["srd", "system reference document", "rules"],
  // Daggerheart-specific terms
  creep: ["creep", "corruption", "etherotaxia"],
  etherotaxia: ["etherotaxia", "creep", "corruption", "supernatural"],
  bloom: ["bloom", "bloom heart", "bloom tendrils", "forestdown"],
  // Damage types
  physical: ["physical", "physical damage"],
  magical: ["magical", "magical damage", "magic damage"],
  fire: ["fire", "fire damage"],
};

/** Common misspellings → corrected form (used for "did you mean?" hints) */
const MISSPELLING_MAP: Record<string, string> = {
  adversery: "adversary",
  adverseries: "adversaries",
  ancestery: "ancestry",
  ancesteries: "ancestries",
  comunity: "community",
  comunities: "communities",
  doamin: "domain",
  domian: "domain",
  envorinment: "environment",
  enviroment: "environment",
  spellcst: "spellcast",
  spellcsat: "spellcast",
  etherotaxic: "etherotaxia",
  etherotaxian: "etherotaxia",
  blom: "bloom",
  creap: "creep",
  tresholds: "thresholds",
  threasholds: "thresholds",
  evasoin: "evasion",
  strenght: "strength",
  agilitiy: "agility",
  presense: "presence",
  knowlege: "knowledge",
};

/** Canonical SRD section → weight multiplier for ranking */
const SECTION_WEIGHTS: Record<string, number> = {
  Introduction: 1.0,
  "Character Creation": 1.05,
  Domains: 1.0,
  Classes: 1.0,
  Ancestries: 1.0,
  Communities: 1.0,
  "Core Mechanics": 1.1, // slightly prioritize rules over lore
  "Running an Adventure": 1.0,
  Appendix: 0.95, // domain card lists slightly lower
};

// ─── localStorage Key ──────────────────────────────────────────────────────────

const RECENT_SEARCHES_KEY = "srd_recent_searches";
const MAX_RECENT_SEARCHES = 20;

interface RecentSearch {
  query: string;
  selectedChunkId: string;
  timestamp: number;
}

// ─── Utility Functions ────────────────────────────────────────────────────────

/**
 * Normalize a string to lowercase, trim whitespace, and collapse internal spaces.
 */
function normalize(str: string): string {
  return str.toLowerCase().trim().replace(/\s+/g, " ");
}

/**
 * Expand a query string using the synonym map.
 * Returns a de-duplicated array of terms to search, including the original.
 */
function expandQuery(query: string): string[] {
  const norm = normalize(query);
  const terms = new Set<string>([norm]);

  // Check exact key match
  if (SYNONYM_MAP[norm]) {
    SYNONYM_MAP[norm].forEach((syn) => terms.add(syn));
  }

  // Check partial word matches (each token in the query)
  norm.split(" ").forEach((token) => {
    if (SYNONYM_MAP[token]) {
      SYNONYM_MAP[token].forEach((syn) => terms.add(syn));
    }
  });

  return Array.from(terms);
}

/**
 * Apply misspelling correction hints.
 * Returns { corrected, wasCorrected } for "did you mean?" UX.
 */
export function correctQuery(query: string): {
  corrected: string;
  wasCorrected: boolean;
} {
  const norm = normalize(query);
  if (MISSPELLING_MAP[norm]) {
    return { corrected: MISSPELLING_MAP[norm], wasCorrected: true };
  }
  // Check per-token corrections
  const tokens = norm.split(" ");
  const corrected = tokens.map((t) => MISSPELLING_MAP[t] ?? t).join(" ");
  return { corrected, wasCorrected: corrected !== norm };
}

/**
 * Generate a slug from a title + section for use as a chunk ID.
 */
export function makeChunkId(section: string, title: string): string {
  return `${section}-${title}`
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Compute Jaccard similarity between two sets of strings.
 * Returns a value between 0 (disjoint) and 1 (identical).
 */
function jaccardSimilarity(a: string[], b: string[]): number {
  if (a.length === 0 && b.length === 0) return 1;
  const setA = new Set(a.map(normalize));
  const setB = new Set(b.map(normalize));
  let intersection = 0;
  setA.forEach((v) => {
    if (setB.has(v)) intersection++;
  });
  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

/**
 * Load recent searches from localStorage safely (SSR-compatible).
 */
function loadRecentSearches(): RecentSearch[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(RECENT_SEARCHES_KEY);
    return raw ? (JSON.parse(raw) as RecentSearch[]) : [];
  } catch {
    return [];
  }
}

/**
 * Persist recent searches to localStorage safely.
 */
function saveRecentSearches(searches: RecentSearch[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      RECENT_SEARCHES_KEY,
      JSON.stringify(searches.slice(0, MAX_RECENT_SEARCHES))
    );
  } catch {
    // Ignore localStorage quota errors
  }
}

// ─── Engine Initialization ────────────────────────────────────────────────────

const FUSE_OPTIONS: IFuseOptions<SRDChunk> = {
  // Fields to search, weighted by importance
  keys: [
    { name: "title", weight: 0.5 },
    { name: "tags", weight: 0.3 },
    { name: "content", weight: 0.15 },
    { name: "section", weight: 0.05 },
  ],
  // Fuzzy matching configuration
  threshold: 0.4,          // 0 = exact, 1 = match anything; 0.4 is forgiving but not wild
  distance: 200,            // How far from the start of the string to search
  minMatchCharLength: 2,    // Don't fuzz single characters
  includeScore: true,       // We need scores for merging
  includeMatches: true,     // Useful for highlighting later
  ignoreLocation: true,     // Score by quality of match, not position in string
  useExtendedSearch: false, // Keep it simple; extended syntax is for power users
  shouldSort: true,
  findAllMatches: false,    // Return best match per chunk, not all positions
};

/**
 * Initialize both search engines with the provided SRD chunks.
 * Must be called before any search functions.
 * Safe to call multiple times — will reinitialize cleanly.
 */
export function initializeSRDSearch(chunks: SRDChunk[]): void {
  // Build the chunk lookup map
  chunkMap = new Map(chunks.map((c) => [c.id, c]));

  // Clear caches on re-initialization
  similarCache.clear();

  // ── Fuse.js ─────────────────────────────────────────────────────────────
  fuseInstance = new Fuse(chunks, FUSE_OPTIONS);

  // ── MiniSearch ───────────────────────────────────────────────────────────
  miniInstance = new MiniSearch<SRDChunk>({
    idField: "id",
    fields: ["title", "tags", "content", "section", "subsection"],
    storeFields: ["id"], // We use the chunkMap for full data; only store id
    searchOptions: {
      boost: {
        title: 3,      // Title hits score 3× more than content
        tags: 2,       // Tag hits score 2×
        section: 1.2,  // Section/subsection minor boost
        subsection: 1.2,
        content: 1,    // Baseline
      },
      prefix: true,    // "bloom" matches "blooming", "bloomheart"
      fuzzy: (term) => (term.length > 4 ? 0.2 : false), // Fuzzy on longer terms only
    },
    // Preprocess fields: normalize, strip markdown syntax, expand tags
    processTerm: (term: string) =>
      term
        .toLowerCase()
        .replace(/[*_`[\]()#>]/g, "") // Strip common markdown chars
        .replace(/[^\w\s-]/g, "")
        .trim() || null,
  });

  // Index all chunks — MiniSearch needs each document as a plain object.
  // We spread the chunk but replace the tags array with a space-joined string
  // so MiniSearch can tokenize it as prose. We use a looser type here
  // intentionally since this internal representation differs from SRDChunk.
  type MiniDoc = Omit<SRDChunk, "tags"> & { tags: string };
  const miniDocs: MiniDoc[] = chunks.map((c) => ({
    ...c,
    tags: c.tags.join(" "),
  }));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  miniInstance.addAll(miniDocs as any);

  isInitialized = true;
}

// ─── Sub-Entry Registration ───────────────────────────────────────────────────

/**
 * Register sub-entries (weapons, armor, loot, adversaries, environments, subsections)
 * as additional searchable items. Called after initializeSRDSearch().
 */
export function registerSubEntries(entries: SRDSubEntry[]): void {
  subEntryMap = new Map(entries.map(e => [e.id, e]));

  // Group by parent chunk
  subEntriesByParent = new Map();
  for (const entry of entries) {
    const group = subEntriesByParent.get(entry.parentChunkId) ?? [];
    group.push(entry);
    subEntriesByParent.set(entry.parentChunkId, group);
  }

  // Build a Fuse index over sub-entries for fuzzy name matching
  subEntryFuse = new Fuse(entries, {
    keys: [
      { name: 'name', weight: 0.6 },
      { name: 'tags', weight: 0.3 },
      { name: 'breadcrumb', weight: 0.1 },
    ],
    threshold: 0.4,
    distance: 100,
    minMatchCharLength: 2,
    includeScore: true,
    includeMatches: true,
    ignoreLocation: true,
    shouldSort: true,
  });
}

// ─── Core: Score Merging ──────────────────────────────────────────────────────

interface MergedScore {
  chunk: SRDChunk;
  rawScore: number;
  matchedOn: "title" | "tags" | "content";
  fuseContribution: number;
  miniContribution: number;
}

/**
 * Run both engines and merge their scores.
 * Fuse scores are inverted (0 = perfect in Fuse) and normalized to [0,1].
 * MiniSearch scores are normalized by dividing by the top score in the result set.
 */
function mergeEngineResults(
  query: string,
  options: SearchOptions
): MergedScore[] {
  if (!fuseInstance || !miniInstance || !isInitialized) return [];

  const { fuseWeight = 0.4, miniWeight = 0.6 } = options;
  const expandedTerms = expandQuery(query);
  const primaryQuery = expandedTerms[0];

  // ── Fuse results ─────────────────────────────────────────────────────────
  const fuseResults: Map<string, number> = new Map();
  // Run Fuse for both the primary query and each synonym expansion
  expandedTerms.slice(0, 3).forEach((term) => {
    const results: FuseResult<SRDChunk>[] = fuseInstance!.search(term, {
      limit: 60,
    });
    results.forEach((r) => {
      if (r.item && r.score !== undefined) {
        // Fuse score: 0 = perfect, 1 = no match → invert to [0,1]
        const normalized = 1 - r.score;
        const existing = fuseResults.get(r.item.id) ?? 0;
        fuseResults.set(r.item.id, Math.max(existing, normalized));
      }
    });
  });

  // ── MiniSearch results ───────────────────────────────────────────────────
  const miniResults: Map<string, number> = new Map();
  let maxMiniScore = 0;

  try {
    const rawMini: MiniSearchResult[] = miniInstance!.search(primaryQuery);
    // Collect scores first to find max for normalization
    rawMini.forEach((r) => {
      if (r.score > maxMiniScore) maxMiniScore = r.score;
    });
    rawMini.forEach((r) => {
      const normalized = maxMiniScore > 0 ? r.score / maxMiniScore : 0;
      miniResults.set(r.id as string, normalized);
    });
    // Also search each synonym expansion and take the max per chunk
    expandedTerms.slice(1, 3).forEach((term) => {
      try {
        const synResults: MiniSearchResult[] = miniInstance!.search(term);
        let synMax = 0;
        synResults.forEach((r) => {
          if (r.score > synMax) synMax = r.score;
        });
        synResults.forEach((r) => {
          const normalized = synMax > 0 ? r.score / synMax : 0;
          const existing = miniResults.get(r.id as string) ?? 0;
          miniResults.set(r.id as string, Math.max(existing, normalized * 0.7)); // discount synonyms slightly
        });
      } catch {
        // MiniSearch can throw on very short/malformed queries — ignore
      }
    });
  } catch {
    // MiniSearch throws on some single-character queries
  }

  // ── Merge ────────────────────────────────────────────────────────────────
  const allIds = new Set<string>([
    ...Array.from(fuseResults.keys()),
    ...Array.from(miniResults.keys()),
  ]);
  const merged: MergedScore[] = [];

  allIds.forEach((id) => {
    const chunk = chunkMap.get(id);
    if (!chunk) return;

    const fuseScore = fuseResults.get(id) ?? 0;
    const miniScore = miniResults.get(id) ?? 0;
    const rawScore = fuseScore * fuseWeight + miniScore * miniWeight;

    // Determine primary match field
    let matchedOn: "title" | "tags" | "content" = "content";
    const normTitle = normalize(chunk.title);
    const normQuery = normalize(primaryQuery);
    if (normTitle.includes(normQuery) || normQuery.includes(normTitle)) {
      matchedOn = "title";
    } else if (chunk.tags.some((t) => normalize(t).includes(normQuery))) {
      matchedOn = "tags";
    }

    merged.push({
      chunk,
      rawScore,
      matchedOn,
      fuseContribution: fuseScore * fuseWeight,
      miniContribution: miniScore * miniWeight,
    });
  });

  return merged;
}

// ─── Core: Ranking Boosts ─────────────────────────────────────────────────────

/**
 * Apply all ranking boost multipliers to a merged score.
 * Returns the final boosted score.
 */
function applyBoosts(
  merged: MergedScore,
  query: string,
  options: SearchOptions,
  recentChunkIds: Set<string>
): { finalScore: number; explanation: string } {
  const { sectionContext } = options;
  const { chunk, rawScore, matchedOn } = merged;
  const normQuery = normalize(query);
  const normTitle = normalize(chunk.title);

  let score = rawScore;
  const boostLog: string[] = [];

  // 1. Exact title match → 3× boost
  if (normTitle === normQuery) {
    score *= 3.0;
    boostLog.push("exact title match (3×)");
  }
  // 2. Title contains query (or vice versa) → 2× boost
  else if (normTitle.includes(normQuery) || normQuery.includes(normTitle)) {
    score *= 2.0;
    boostLog.push("title fuzzy match (2×)");
  }

  // 3. Tag match → 1.5× boost
  if (
    matchedOn === "tags" ||
    chunk.tags.some((t) => normalize(t).includes(normQuery))
  ) {
    score *= 1.5;
    boostLog.push("tag match (1.5×)");
  }

  // 4. Section context boost → 1.3× (user is browsing this section)
  if (sectionContext && normalize(chunk.section) === normalize(sectionContext)) {
    score *= 1.3;
    boostLog.push(`section context "${chunk.section}" (1.3×)`);
  }

  // 5. Recency boost → 1.2× (user recently viewed this chunk)
  if (recentChunkIds.has(chunk.id)) {
    score *= 1.2;
    boostLog.push("recently searched (1.2×)");
  }

  // 6. Global section weight (rules slightly prioritized)
  const sectionMult = SECTION_WEIGHTS[chunk.section] ?? 1.0;
  if (sectionMult !== 1.0) {
    score *= sectionMult;
    boostLog.push(`section weight ${chunk.section} (${sectionMult}×)`);
  }

  // 7. Level 1 headings (section overviews) get a slight bump when query is broad
  if (chunk.level === 1 && normQuery.split(" ").length === 1) {
    score *= 1.1;
    boostLog.push("section overview heading (1.1×)");
  }

  const explanation =
    boostLog.length > 0
      ? `Matched on ${matchedOn}. Boosts: ${boostLog.join(", ")}.`
      : `Matched on ${matchedOn}. Base score only.`;

  return { finalScore: score, explanation };
}

// ─── Public: searchSRD ────────────────────────────────────────────────────────

/**
 * Classify match quality as 'exact' or 'fuzzy'.
 * A match is 'exact' if:
 *   - The query appears as a substring of the title (case-insensitive), OR
 *   - The title appears as a substring of the query, OR
 *   - Any tag exactly matches the query
 */
function classifyMatchQuality(
  query: string,
  title: string,
  tags: string[]
): 'exact' | 'fuzzy' {
  const normQ = normalize(query);
  const normT = normalize(title);

  if (normT.includes(normQ) || normQ.includes(normT)) return 'exact';
  if (tags.some(t => normalize(t) === normQ)) return 'exact';

  return 'fuzzy';
}

/**
 * Search sub-entries and return results with scores.
 * Applies a 2.5× name-match boost for sub-entry results.
 */
function searchSubEntries(query: string): SearchResult[] {
  if (!subEntryFuse || subEntryMap.size === 0) return [];

  const normQuery = normalize(query);
  const fuseResults = subEntryFuse.search(query, { limit: 40 });
  const results: SearchResult[] = [];

  for (const fr of fuseResults) {
    const entry = fr.item;
    if (fr.score === undefined) continue;

    // Invert Fuse score (0 = perfect → 1 = perfect)
    let score = 1 - fr.score;

    // Determine match quality
    const matchQuality = classifyMatchQuality(normQuery, entry.name, entry.tags);

    // 2.5× name-match boost for sub-entries (spec §3c)
    const normName = normalize(entry.name);
    if (normName.includes(normQuery) || normQuery.includes(normName)) {
      score *= 2.5;
    }

    // Title-exact boost (3.0×) stacks with name-match for effective 7.5×
    if (normName === normQuery) {
      score *= 3.0;
    }

    // Find parent chunk to use as the display chunk
    const parentChunk = chunkMap.get(entry.parentChunkId);
    if (!parentChunk) continue;

    results.push({
      chunk: parentChunk,
      score,
      matchedOn: 'title',
      explanation: `Sub-entry "${entry.name}" match. ${matchQuality === 'exact' ? 'Exact' : 'Fuzzy'} match.`,
      matchQuality,
      subEntry: entry,
    });
  }

  return results;
}

/**
 * Apply parent suppression: if any sub-entry of a parent chunk matches,
 * suppress the parent chunk UNLESS the parent has an exact title match.
 * (Spec §3d)
 */
function applyParentSuppression(
  results: SearchResult[],
  query: string
): SearchResult[] {
  const normQuery = normalize(query);

  // Collect parent chunk IDs that have matching sub-entries
  const parentsWithSubEntryMatches = new Set<string>();
  for (const r of results) {
    if (r.subEntry) {
      parentsWithSubEntryMatches.add(r.subEntry.parentChunkId);
    }
  }

  if (parentsWithSubEntryMatches.size === 0) return results;

  return results.filter(r => {
    // Keep all sub-entry results
    if (r.subEntry) return true;

    // Keep parent if it has an exact title match
    if (parentsWithSubEntryMatches.has(r.chunk.id)) {
      const normTitle = normalize(r.chunk.title);
      return normTitle === normQuery || normQuery === normTitle;
    }

    // Keep everything else
    return true;
  });
}

/**
 * Primary search function.
 * Returns ranked SearchResult[] sorted by descending score.
 *
 * @example
 * const results = searchSRD("guardian", { sectionContext: "Classes" });
 * // → [ { chunk: Guardian, score: 0.94, matchedOn: "title", explanation: "..." }, … ]
 */
export function searchSRD(
  query: string,
  options: SearchOptions = {}
): SearchResult[] {
  if (!isInitialized) {
    console.warn("[srdSearch] searchSRD called before initializeSRDSearch()");
    return [];
  }

  const trimmed = query.trim();
  if (trimmed.length < 1) return [];

  const { limit = 20, minScore = 0.05 } = options;

  // Load recent chunk IDs for recency boost
  const recent = loadRecentSearches();
  const recentChunkIds = new Set(recent.map((r) => r.selectedChunkId));

  // ── Phase 1: Chunk search (existing dual-engine) ──────────────────────
  const merged = mergeEngineResults(trimmed, options);
  const chunkResults: SearchResult[] = [];
  merged.forEach((m) => {
    const { finalScore, explanation } = applyBoosts(
      m,
      trimmed,
      options,
      recentChunkIds
    );
    if (finalScore >= minScore) {
      const matchQuality = classifyMatchQuality(trimmed, m.chunk.title, m.chunk.tags);
      chunkResults.push({
        chunk: m.chunk,
        score: finalScore,
        matchedOn: m.matchedOn,
        explanation,
        matchQuality,
      });
    }
  });

  // ── Phase 2: Sub-entry search ─────────────────────────────────────────
  const subResults = searchSubEntries(trimmed);

  // ── Phase 3: Merge all results ────────────────────────────────────────
  let allResults = [...chunkResults, ...subResults];

  // ── Phase 4: Parent suppression (§3d) ─────────────────────────────────
  allResults = applyParentSuppression(allResults, trimmed);

  // ── Phase 5: Exact-before-fuzzy trimming (§3a) ────────────────────────
  const hasExact = allResults.some(r => r.matchQuality === 'exact');
  if (hasExact) {
    // When exact matches exist, remove fuzzy-only results
    // But keep a flag so UI can offer "Show all results"
    allResults = allResults.filter(r => r.matchQuality === 'exact');
  }

  // Sort by score descending, then alphabetically by title for deterministic ties
  allResults.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    const titleA = a.subEntry?.name ?? a.chunk.title;
    const titleB = b.subEntry?.name ?? b.chunk.title;
    return titleA.localeCompare(titleB);
  });

  return allResults.slice(0, limit);
}

// ─── Public: getSuggestions ───────────────────────────────────────────────────

/**
 * Fast suggestion function optimized for autocomplete.
 * Requires ≥2 characters; returns up to `limit` results (default 8).
 * When query is empty, returns recently searched chunks instead.
 *
 * Pure function — no side effects. Debounce-safe.
 *
 * @example
 * const suggestions = getSuggestions("blo", 8);
 * // → [ { id: "classes-guardian", title: "Guardian", section: "Classes", matchedOn: "title", score: 0.91 }, … ]
 */
export function getSuggestions(
  query: string,
  limit = 8
): SuggestionResult[] {
  if (!isInitialized) return [];

  const trimmed = query.trim();

  // Empty query → return recent searches
  if (trimmed.length === 0) {
    const recent = loadRecentSearches();
    const seen = new Set<string>();
    return recent
      .filter((r) => {
        if (seen.has(r.selectedChunkId)) return false;
        seen.add(r.selectedChunkId);
        return chunkMap.has(r.selectedChunkId);
      })
      .slice(0, limit)
      .map((r) => {
        const chunk = chunkMap.get(r.selectedChunkId)!;
        return {
          id: chunk.id,
          title: chunk.title,
          section: chunk.section,
          subsection: chunk.subsection,
          matchedOn: "title" as const,
          score: 1.0, // Recent searches are always high-priority
        };
      });
  }

  if (trimmed.length < 2) return [];

  // Run a lightweight search specifically for suggestions (title-biased)
  const results = searchSRD(trimmed, { limit: limit * 2, minScore: 0.05 });

  // Group by section, then flatten (max 2 per section to avoid fragmentation)
  const bySectionCount: Record<string, number> = {};
  const suggestions: SuggestionResult[] = [];

  for (const r of results) {
    const sectionKey = r.chunk.section;
    if (!bySectionCount[sectionKey]) bySectionCount[sectionKey] = 0;
    if (bySectionCount[sectionKey] >= 3) continue; // max 3 per section

    bySectionCount[sectionKey]++;
    suggestions.push({
      id: r.chunk.id,
      title: r.chunk.title,
      section: r.chunk.section,
      subsection: r.chunk.subsection,
      matchedOn: r.matchedOn === "content" ? "content" : r.matchedOn === "tags" ? "tag" : "title",
      score: r.score,
    });

    if (suggestions.length >= limit) break;
  }

  return suggestions;
}

// ─── Public: getSimilarChunks ─────────────────────────────────────────────────

/**
 * Returns the 3–5 most similar chunks to the given chunkId.
 * Uses Jaccard similarity on tags; falls back to section membership.
 * Results are memoized per chunkId.
 *
 * @example
 * const similar = getSimilarChunks("adversaries-bloom-heart", 4);
 * // → [ BloomTendrils, Madanikuputukas, CreepBoundEntity1, … ]
 */
export function getSimilarChunks(
  chunkId: string,
  limit = 4
): SRDChunk[] {
  if (!isInitialized) return [];

  // Check cache first
  const cacheKey = `${chunkId}:${limit}`;
  if (similarCache.has(cacheKey)) {
    return similarCache.get(cacheKey)!;
  }

  const source = chunkMap.get(chunkId);
  if (!source) return [];

  // ── Phase 1: Canonical curated similarities ────────────────────────────────
  // These are hand-curated by the SRD compliance layer and take priority.
  const canonicalIds = getCanonicalSimilar(chunkId, limit);
  const canonicalChunks: SRDChunk[] = [];
  const usedIds = new Set<string>([chunkId]);

  for (const id of canonicalIds) {
    const chunk = chunkMap.get(id);
    if (chunk) {
      canonicalChunks.push(chunk);
      usedIds.add(id);
    }
  }

  // If we already have enough from the canonical map, return early
  if (canonicalChunks.length >= limit) {
    const result = canonicalChunks.slice(0, limit);
    similarCache.set(cacheKey, result);
    return result;
  }

  // ── Phase 2: Fill remaining slots with Jaccard tag similarity ──────────────
  const remaining = limit - canonicalChunks.length;

  interface Scored {
    chunk: SRDChunk;
    score: number;
  }

  const scored: Scored[] = [];

  chunkMap.forEach((candidate) => {
    if (usedIds.has(candidate.id)) return;

    // Primary: Jaccard similarity on tags
    const tagSim = jaccardSimilarity(source.tags, candidate.tags);

    // Secondary: section membership bonus
    const sectionBonus = candidate.section === source.section ? 0.2 : 0;

    // Tertiary: subsection exact match bonus
    const subsectionBonus =
      source.subsection &&
      candidate.subsection &&
      source.subsection === candidate.subsection
        ? 0.1
        : 0;

    const totalScore = tagSim + sectionBonus + subsectionBonus;

    // Only include if there's some meaningful similarity
    if (totalScore > 0.05) {
      scored.push({ chunk: candidate, score: totalScore });
    }
  });

  // Sort by score descending; break ties by title
  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.chunk.title.localeCompare(b.chunk.title);
  });

  const jaccardFill = scored.slice(0, remaining).map((s) => s.chunk);
  const result = [...canonicalChunks, ...jaccardFill];

  // Memoize
  similarCache.set(cacheKey, result);

  return result;
}

// ─── Public: recordSearch ─────────────────────────────────────────────────────

/**
 * Record that a user searched for `query` and selected `selectedChunkId`.
 * Persists to localStorage for recency boosting and empty-query suggestions.
 * Safe to call in any order — deduplicates by chunkId (most-recent wins).
 */
export function recordSearch(query: string, selectedChunkId: string): void {
  const existing = loadRecentSearches();

  // Remove any prior entry for this chunk so it bubbles to the top
  const filtered = existing.filter((r) => r.selectedChunkId !== selectedChunkId);

  const updated: RecentSearch[] = [
    { query: normalize(query), selectedChunkId, timestamp: Date.now() },
    ...filtered,
  ];

  saveRecentSearches(updated);
}

// ─── Public: clearRecentSearches ─────────────────────────────────────────────

/** Clear all recent searches from localStorage. */
export function clearRecentSearches(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(RECENT_SEARCHES_KEY);
  } catch {
    // ignore
  }
}

// ─── Public: getChunkById ─────────────────────────────────────────────────────

/** Retrieve a chunk directly by its ID. O(1) map lookup. */
export function getChunkById(id: string): SRDChunk | undefined {
  return chunkMap.get(id);
}

// ─── Public: getAllChunks ─────────────────────────────────────────────────────

/** Return all indexed chunks (useful for browsing/listing pages). */
export function getAllChunks(): SRDChunk[] {
  return Array.from(chunkMap.values());
}

// ─── Public: getChunksBySection ───────────────────────────────────────────────

/** Return all chunks belonging to a given section. */
export function getChunksBySection(section: string): SRDChunk[] {
  const norm = normalize(section);
  return Array.from(chunkMap.values()).filter(
    (c) => normalize(c.section) === norm
  );
}

// ─── Public: isSearchReady ────────────────────────────────────────────────────

/** Returns true once initializeSRDSearch has completed successfully. */
export function isSearchReady(): boolean {
  return isInitialized;
}

// ─── Public: getSearchStats ───────────────────────────────────────────────────

export interface SearchStats {
  totalChunks: number;
  totalSubEntries: number;
  sectionCounts: Record<string, number>;
  isReady: boolean;
}

/** Return metadata about the current index state. */
export function getSearchStats(): SearchStats {
  const sectionCounts: Record<string, number> = {};
  chunkMap.forEach((c) => {
    sectionCounts[c.section] = (sectionCounts[c.section] ?? 0) + 1;
  });
  return {
    totalChunks: chunkMap.size,
    totalSubEntries: subEntryMap.size,
    sectionCounts,
    isReady: isInitialized,
  };
}

// ─── Public: Sub-Entry Accessors ──────────────────────────────────────────────

/** Retrieve a sub-entry directly by its ID. */
export function getSubEntryById(id: string): SRDSubEntry | undefined {
  return subEntryMap.get(id);
}

/** Get all sub-entries for a given parent chunk ID. */
export function getSubEntriesForChunk(parentChunkId: string): SRDSubEntry[] {
  return subEntriesByParent.get(parentChunkId) ?? [];
}

/** Return all registered sub-entries. */
export function getAllSubEntries(): SRDSubEntry[] {
  return Array.from(subEntryMap.values());
}

// ─── Public: SYNONYM_MAP & MISSPELLING_MAP (exported for tests/tooling) ───────

export { SYNONYM_MAP, MISSPELLING_MAP };
