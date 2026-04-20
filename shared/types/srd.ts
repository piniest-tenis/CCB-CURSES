// shared/types/srd.ts
// TypeScript type definitions for the Daggerheart SRD search index.
// Consumed by the frontend search system and produced by the chunk-srd script.

// ─── Section Names ────────────────────────────────────────────────────────────

/**
 * Top-level SRD sections, derived from the markdown directory structure.
 * These map 1:1 to the top-level folders under /markdown/.
 */
export type SRDSectionName =
  | "Adversaries"
  | "Ancestries"
  | "Classes"
  | "Communities"
  | "Domains"
  | "Environments"
  | "Rules & Definitions"
  | "SRD";

// ─── Core Chunk Type ─────────────────────────────────────────────────────────

/**
 * A single searchable unit of SRD content.
 * Each chunk corresponds to one header-delimited section of a markdown file.
 */
export interface SRDChunk {
  /**
   * Unique URL-safe slug identifying this chunk.
   * Format: "{section-slug}-{file-slug}-{heading-slug}"
   * Example: "adversaries-bloom-heart", "srd-classes-bard-troubadour"
   */
  id: string;

  /**
   * Human-readable title for this chunk (the header text, or file name if no header).
   */
  title: string;

  /**
   * Top-level category this chunk belongs to.
   * Derived from the top-level directory name under /markdown/.
   */
  section: SRDSectionName;

  /**
   * Optional sub-heading label.
   * For domain cards: the domain name (e.g. "Arcana").
   * For class files: the subclass name (e.g. "Troubadour").
   * For SRD sub-dirs: the subdirectory name (e.g. "SRD/Classes").
   */
  subsection?: string;

  /**
   * Full markdown text of this chunk, including the header line.
   * Used for full-text search and display.
   */
  content: string;

  /**
   * Relative file path from the /markdown/ root directory.
   * Example: "Adversaries/Bloom Heart.md"
   */
  filePath: string;

  /**
   * Derived search keywords for this chunk.
   * Includes: section name, file name words, heading words, domain/class/subclass names.
   * Normalized to lowercase, deduplicated.
   */
  tags: string[];

  /**
   * The heading level (H1=1, H2=2, H3=3) that opened this chunk.
   * 0 if the chunk represents content before any heading in the file
   * (i.e., the file's preamble / front-matter content).
   */
  level: number;
}

// ─── Sub-Entry Types ─────────────────────────────────────────────────────────

/**
 * A single weapon row extracted from an SRD equipment table.
 */
export interface WeaponFields {
  trait: string;              // "Agility" | "Strength" | "Spellcast" | …
  range: string;              // "Melee" | "Very Close" | "Close" | "Far" | "Very Far"
  damage: string;             // "d8+3 phy" — raw SRD damage string
  burden: string;             // "One-Handed" | "Two-Handed"
  feature: string | null;     // Weapon feature text, or null / "—"
  tier: number;               // 1–4
  category: string;           // "Primary" | "Secondary" | "Wheelchair"
  damageType: string;         // "Physical" | "Magic"
}

/**
 * A single armor row extracted from an SRD equipment table.
 */
export interface ArmorFields {
  baseThresholds: string;     // "7 / 15"
  baseMajorThreshold: number;
  baseSevereThreshold: number;
  baseArmorScore: number;
  feature: string | null;     // Armor feature text, or null / "—"
  featureType: string | null; // "Heavy" | "Flexible" | "Very Heavy" | …
  tier: number;               // 1–4
}

/**
 * A single loot item extracted from an SRD loot/consumable table.
 */
export interface LootFields {
  roll: string;               // "01" | "24" — roll number string
  description: string;        // Full item description text
  lootTable: string;          // "Reusable Items" | "Consumables"
  tier: number | null;        // Null for most loot (not tiered)
}

/**
 * A structured adversary feature with name, type, and description.
 */
export interface AdversaryFeature {
  name: string;               // "Relentless (3)" | "Earth Eruption"
  type: string;               // "Action" | "Reaction" | "Passive"
  description: string;        // Full feature description
}

/**
 * An adversary stat block extracted from the SRD.
 */
export interface AdversaryFields {
  tier: number;               // 1–4
  type: string;               // "Solo" | "Leader" | "Bruiser" | "Horde" | …
  description: string;        // 1-sentence description
  motives: string;            // "Motives & Tactics" or "Impulses" text
  difficulty: number;         // Difficulty number
  thresholds: string;         // "8/15" | "None" | "4/None"
  hp: number;
  stress: number;
  attack: string;             // Full ATK line: "+3 | Claws: Melee | 1d12+2 phy"
  experiences: string[];      // ["Tremor Sense +2", "Keen Senses +2"]
  features: AdversaryFeature[];
}

/**
 * An environment stat block extracted from the SRD.
 * Environments have impulses instead of motives, and lack ATK/HP/Stress.
 */
export interface EnvironmentFields {
  tier: number;
  type: string;               // "Exploration" | "Social" | "Traversal" | "Event"
  description: string;
  impulses: string;
  difficulty: number;
  difficultyRaw: string;      // Raw text, may be "Special (see ...)"
  potentialAdversaries: string;
  features: AdversaryFeature[];
}

/**
 * A sub-section of a GM mechanics chunk, extracted at H3/H4 level.
 */
export interface SubsectionFields {
  heading: string;            // "ADVERSARY ACTION ROLLS"
  headingLevel: number;       // 2, 3, 4, or 5
  content: string;            // Markdown content under the heading
  contentLength: number;      // Character count of content
}

/**
 * Discriminated union of all sub-entry field types.
 */
export type SRDSubEntryFields =
  | WeaponFields
  | ArmorFields
  | LootFields
  | AdversaryFields
  | EnvironmentFields
  | SubsectionFields;

/**
 * Type discriminator for SRDSubEntry.
 */
export type SRDSubEntryType =
  | "weapon"
  | "armor"
  | "loot"
  | "adversary"
  | "environment"
  | "subsection";

/**
 * A granular sub-entry extracted from an SRD chunk.
 * Each represents a single weapon, armor, loot item, adversary, environment,
 * or subsection that can be searched and displayed individually.
 *
 * ID format: "{parentChunkId}--{slug}"
 * Example: "core-mechanics-equipment-part-1--broadsword"
 */
export interface SRDSubEntry {
  id: string;
  parentChunkId: string;
  breadcrumb: string;         // "Equipment → Primary Weapons → Tier 2"
  name: string;               // "Broadsword" | "Acid Burrower" | "ROLLING DICE"
  type: SRDSubEntryType;
  fields: SRDSubEntryFields;
  tags: string[];
  section: string;            // Maps to SRDSectionName
}

/**
 * The envelope for srd-sub-entries.json.
 */
export interface SRDSubEntryIndex {
  version: string;
  generatedAt: string;
  entries: SRDSubEntry[];
}

// ─── Type Guards ─────────────────────────────────────────────────────────────

export function isWeaponFields(fields: SRDSubEntryFields, type: SRDSubEntryType): fields is WeaponFields {
  return type === "weapon";
}

export function isArmorFields(fields: SRDSubEntryFields, type: SRDSubEntryType): fields is ArmorFields {
  return type === "armor";
}

export function isLootFields(fields: SRDSubEntryFields, type: SRDSubEntryType): fields is LootFields {
  return type === "loot";
}

export function isAdversaryFields(fields: SRDSubEntryFields, type: SRDSubEntryType): fields is AdversaryFields {
  return type === "adversary";
}

export function isEnvironmentFields(fields: SRDSubEntryFields, type: SRDSubEntryType): fields is EnvironmentFields {
  return type === "environment";
}

export function isSubsectionFields(fields: SRDSubEntryFields, type: SRDSubEntryType): fields is SubsectionFields {
  return type === "subsection";
}

// ─── Section Aggregate Type ───────────────────────────────────────────────────

/**
 * Aggregated metadata for a top-level SRD section, plus all its chunks.
 * Useful for building navigation trees.
 */
export interface SRDSection {
  /**
   * URL-safe slug for this section.
   * Example: "rules-and-definitions"
   */
  id: string;

  /**
   * Display name for this section.
   * Example: "Rules & Definitions"
   */
  label: string;

  /**
   * Optional short description of this section's content.
   */
  description?: string;

  /**
   * Total number of chunks in this section.
   */
  chunkCount: number;

  /**
   * All chunks belonging to this section.
   */
  chunks: SRDChunk[];
}

// ─── Top-Level Index Type ─────────────────────────────────────────────────────

/**
 * The complete SRD search index, as written to srd-index.json.
 * This is the primary data structure consumed by the frontend.
 */
export interface SRDIndex {
  /**
   * ISO 8601 timestamp of when this index was generated.
   * Example: "2026-04-11T00:00:00.000Z"
   */
  generatedAt: string;

  /**
   * Total number of chunks across all sections.
   */
  totalChunks: number;

  /**
   * Total number of source markdown files processed.
   */
  totalFiles: number;

  /**
   * Ordered list of top-level section names present in this index.
   * Matches the `section` field of SRDChunk.
   */
  sections: SRDSectionName[];

  /**
   * Per-section chunk counts, keyed by section name.
   * Useful for navigation badges and section summaries.
   */
  sectionCounts: Record<SRDSectionName, number>;

  /**
   * Flat array of all SRDChunk objects.
   * Primary array consumed by the search engine.
   */
  chunks: SRDChunk[];
}

// ─── Search Query & Result Types ──────────────────────────────────────────────

/**
 * Parameters for a search query against the SRD index.
 */
export interface SRDSearchQuery {
  /**
   * Free-text search string. Matched against title, content, and tags.
   */
  query: string;

  /**
   * Optional filter: restrict results to one or more sections.
   */
  sections?: SRDSectionName[];

  /**
   * Optional filter: restrict to chunks at or above this heading level.
   * E.g., `maxLevel: 2` returns only H1 and H2 chunks.
   */
  maxLevel?: number;

  /**
   * Maximum number of results to return. Defaults to 20.
   */
  limit?: number;
}

/**
 * A single search result, wrapping an SRDChunk with relevance metadata.
 */
export interface SRDSearchResult {
  /**
   * The matching chunk.
   */
  chunk: SRDChunk;

  /**
   * Relevance score (higher = more relevant). Implementation-defined.
   */
  score: number;

  /**
   * Which field(s) the match was found in.
   * Useful for highlighting.
   */
  matchedFields: ("title" | "content" | "tags")[];

  /**
   * Whether this result was matched exactly or via fuzzy matching.
   * "exact" = title/name includes query, tag match, or heading match.
   * "fuzzy" = matched only via edit-distance or synonym expansion.
   */
  matchQuality?: "exact" | "fuzzy";

  /**
   * If the result is a sub-entry match (weapon, armor, loot, adversary,
   * environment, or subsection), the matching sub-entry is attached here.
   * When present, detail card components should render this instead of the chunk.
   */
  subEntry?: SRDSubEntry;
}
