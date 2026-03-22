// shared/src/types.ts
// Canonical TypeScript types for the Daggerheart Character Platform.
// Used by backend Lambda functions, frontend React components, and ingestion scripts.

// ─── Core Stat Types ──────────────────────────────────────────────────────────

export type CoreStatName =
  | "agility"
  | "strength"
  | "finesse"
  | "instinct"
  | "presence"
  | "knowledge";

export interface CoreStats {
  agility: number;
  strength: number;
  finesse: number;
  instinct: number;
  presence: number;
  knowledge: number;
}

export interface DerivedStats {
  evasion: number;
  armor: number;
  /**
   * Class starting evasion before armor modifiers. Stored once at character
   * creation / builder save so the backend can recompute evasion when armor is
   * swapped without needing to look up the class record.
   * Defaults to derivedStats.evasion if not yet set (legacy characters).
   */
  baseEvasion?: number;
}

// ─── Tracker Types ────────────────────────────────────────────────────────────

export interface SlotTracker {
  max: number;
  marked: number;
}

export interface CharacterTrackers {
  hp: SlotTracker;
  stress: SlotTracker;
  armor: SlotTracker;
}

// SRD page 20: only Major and Severe thresholds are defined numerically.
// Formula: threshold = armor base threshold + character level.
export interface DamageThresholds {
  major: number;
  severe: number;
}

/**
 * A weapon slot on the character. References an SRD weapon by its id string
 * (from srdEquipment.ts ALL_TIER1_WEAPONS). All display stats are derived at
 * read-time from the SRD record — nothing is duplicated on the character.
 * weaponId is null when the slot is empty.
 */
export interface Weapon {
  weaponId: string | null;
}

export interface Weapons {
  primary: Weapon;
  secondary: Weapon;
}

// ─── Gold ─────────────────────────────────────────────────────────────────────

/**
 * SRD page 58: Gold is tracked in three abstract tiers.
 * 10 handfuls = 1 bag; 10 bags = 1 chest (max 1 chest).
 * Starting value at character creation: { handfuls: 1, bags: 0, chests: 0 }.
 */
export interface GoldAmount {
  handfuls: number; // 0–9
  bags: number;     // 0–9
  chests: number;   // 0–1
}

// ─── Experience ───────────────────────────────────────────────────────────────

export interface Experience {
  name: string;
  bonus: number;
}

// ─── Class Feature State ──────────────────────────────────────────────────────

export interface FeatureState {
  tokens: number;
  active: boolean;
  extra?: Record<string, unknown>;
}

export type ClassFeatureState = Record<string, FeatureState>;

// ─── Character Sheet ──────────────────────────────────────────────────────────

export type CharacterSource = "homebrew" | "srd";

export interface CharacterSummary {
  characterId: string;
  userId: string;
  name: string;
  classId: string;
  className: string;
  subclassId: string | null;
  subclassName: string | null;
  communityId: string | null;
  communityName: string | null;
  ancestryId: string | null;
  ancestryName: string | null;
  level: number;
  avatarUrl: string | null;
  /**
   * CDN URL for the character portrait image, or null if no portrait has been
   * uploaded yet. Set by the backend after a successful portrait upload
   * confirmation (POST /characters/{id}/portrait-upload-url → PUT to S3 →
   * PATCH /characters/{id} with { portraitUrl }).
   */
  portraitUrl: string | null;
  updatedAt: string;
}

export interface Character extends CharacterSummary {
  domains: string[];
  stats: CoreStats;
  derivedStats: DerivedStats;
  trackers: CharacterTrackers;
  damageThresholds: DamageThresholds;
  weapons: Weapons;
  hope: number;
  /** SRD page 20: base Hope maximum is 6; can be reduced by scars (death table). */
  hopeMax: number;
  /** SRD page 3 / 22: Proficiency is a scalar integer starting at 1, not a slot resource. */
  proficiency: number;
  experiences: Experience[];
  conditions: string[];
  domainLoadout: string[]; // cardIds, max 5
  domainVault: string[];   // all unlocked cardIds
  classFeatureState: ClassFeatureState;
  traitBonuses: Record<string, number>;
  notes: string | null;
  avatarKey: string | null;
  /**
   * S3 object key for the character portrait image (e.g.
   * `portraits/{userId}/{characterId}.webp`). The CDN URL is derived from
   * this key at read-time and surfaced as `portraitUrl` (inherited from
   * CharacterSummary). Stored separately from `avatarKey` so portrait and
   * user-avatar uploads remain independently managed.
   */
  portraitKey: string | null;
  createdAt: string;

  /**
   * SRD armor id (from srdEquipment.ts ALL_ARMOR) currently equipped by the player.
   * When set, derivedStats.evasion, derivedStats.armor, damageThresholds, and
   * trackers.armor.max are all computed from this armor's SRD stats.
   * Set to null to clear active armor (stats fall back to builder values).
   */
  activeArmorId: string | null;

  // ── Starting inventory ────────────────────────────────────────────────────
  /** SRD page 58: Gold amount in abstract tiers. */
  gold: GoldAmount;
  /**
   * Named inventory items (strings). Includes universal starting gear,
   * the chosen potion, and the chosen class item.
   * e.g. ["a torch", "50 feet of rope", "basic supplies", "Minor Health Potion", "A romance novel"]
   */
  inventory: string[];

  // ── Campaign mechanics ────────────────────────────────────────────────────
  /** Per-card token counts. Keys are cardIds; values are non-negative integers. */
  cardTokens: Record<string, number>;
  /** Active downtime projects. */
  downtimeProjects: DowntimeProject[];
  /** cardIds of auras that are currently toggled on. */
  activeAuras: string[];
  /** Companion state for Wraithcaller / Herder subclasses, or null. */
  companionState: CompanionState | null;
  /**
   * Per-character additive reputation bonuses keyed by factionId.
   * Stacked on top of the GM-tracked party score.
   */
  reputationBonuses: Record<string, number>;
  /** Conditions beyond SRD's Hidden / Restrained / Vulnerable. */
  customConditions: CustomCondition[];
  /**
   * Level-up history: records which advancements were chosen at each level.
   * Keyed by target level (2–10). Used to enforce per-tier restrictions
   * (e.g. trait-bonus once per tier, subclass/multiclass mutual exclusion).
   */
  levelUpHistory: Record<number, AdvancementChoice[]>;
  /**
   * Traits that are "marked" from trait-bonus advancements (SRD p.22).
   * Marked traits are cleared at tier achievements (levels 5 and 8).
   * Stored as stat names, e.g. ["agility", "strength"].
   */
  markedTraits: string[];
}

// ─── Class & Subclass ─────────────────────────────────────────────────────────

export interface HopeFeature {
  name: string;
  description: string;
  hopeCost: number;
}

export interface ClassFeature {
  name: string;
  description: string;
  options: string[];
}

export interface NamedFeature {
  name: string;
  description: string;
}

export interface SubclassData {
  subclassId: string;
  name: string;
  description: string;
  spellcastTrait: CoreStatName;
  foundationFeatures: NamedFeature[];
  specializationFeature: NamedFeature;
  masteryFeature: NamedFeature;
}

export interface ClassSummary {
  classId: string;
  name: string;
  domains: string[];
  startingEvasion: number;
  startingHitPoints: number;
  subclasses: Pick<SubclassData, "subclassId" | "name" | "description">[];
  source: CharacterSource;
}

export interface ClassData extends ClassSummary {
  classItems: string[];
  hopeFeature: HopeFeature;
  classFeature: ClassFeature;
  backgroundQuestions: string[];
  connectionQuestions: string[];
  subclasses: SubclassData[];
  mechanicalNotes: string;
}

// ─── Community & Ancestry ─────────────────────────────────────────────────────

export interface CommunityData {
  communityId: string;
  name: string;
  flavorText: string;
  traitName: string;
  traitDescription: string;
  source: CharacterSource;
}

export interface AncestryData {
  ancestryId: string;
  name: string;
  flavorText: string;
  traitName: string;
  traitDescription: string;
  secondTraitName: string;
  secondTraitDescription: string;
  source: CharacterSource;
}

// ─── Domain Cards ─────────────────────────────────────────────────────────────

export interface GrimoireAbility {
  name: string;
  description: string;
}

export interface DomainCard {
  cardId: string;
  domain: string;
  level: number;
  name: string;
  isCursed: boolean;
  isLinkedCurse: boolean;
  isGrimoire: boolean;
  description: string;
  curseText: string | null;
  linkedCardIds: string[];
  grimoire: GrimoireAbility[];
  source: CharacterSource;
}

export interface DomainSummary {
  domain: string;
  description: string | null;
  cardCount: number;
  cardsByLevel: Record<string, number>;
}

// ─── Rules & Definitions ──────────────────────────────────────────────────────

export type RuleType = "rule" | "faction" | "reputation" | "curse";

export interface RuleEntry {
  ruleId: string;
  name: string;
  body: string;
  type: RuleType;
}

// ─── Reputation System ────────────────────────────────────────────────────────

export interface AttitudeLevel {
  value: number; // -6 to +6
  description: string;
}

export interface FactionData {
  factionId: string;
  name: string;
  primaryGoals: string[];
  reputationScore: number; // -3 to +3
}

// ─── User ─────────────────────────────────────────────────────────────────────

export interface UserPreferences {
  theme: "dark" | "light" | "system";
  defaultDiceStyle: string;
}

export interface UserProfile {
  userId: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  preferences: UserPreferences;
  createdAt: string;
  updatedAt: string;
}

// ─── Media ────────────────────────────────────────────────────────────────────

export type MediaLinkType = "character" | "user";

export interface MediaRecord {
  mediaId: string;
  userId: string;
  s3Key: string;
  contentType: string;
  filename: string;
  linkedTo: {
    type: MediaLinkType;
    id: string;
  };
  cdnUrl: string | null;
  createdAt: string;
}

// ─── API Response Envelopes ───────────────────────────────────────────────────

export interface ApiMeta {
  requestId: string;
  timestamp: string;
}

export interface ApiSuccess<T> {
  data: T;
  meta: ApiMeta;
}

export interface ApiErrorDetail {
  field?: string;
  issue: string;
}

export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: ApiErrorDetail[];
  };
  meta: ApiMeta;
}

// ─── Campaign Mechanics ───────────────────────────────────────────────────────

/**
 * A single active downtime project tracked on a character sheet.
 * countdownCurrent counts ticks completed; when >= countdownMax the project is
 * marked completed automatically by the `tick-project` action.
 */
export interface DowntimeProject {
  projectId: string;
  /** cardId that granted this project, or null for class-feature grants. */
  cardId: string | null;
  name: string;
  countdownMax: number;
  countdownCurrent: number;
  repeatable: boolean;
  completed: boolean;
  completedAt: string | null;
  notes: string | null;
}

/**
 * Slot-tracker + experiences for a companion (Wraithcaller / Herder subclasses).
 */
export interface CompanionState {
  name: string;
  /** Starting evasion is 10; updated via levelup choices. */
  evasion: number;
  stress: SlotTracker;
  experiences: Experience[];
  attackDescription: string;
  /** e.g. "d6", "d8" */
  damagedie: string;
  damageType: "physical" | "magic";
  range: string;
  /** Chosen options from the companion levelup list. */
  levelupChoices: string[];
}

/**
 * A campaign-specific condition beyond the SRD set (Hidden / Restrained / Vulnerable).
 */
export interface CustomCondition {
  conditionId: string;
  name: string;
  description: string;
  /** The cardId that inflicted / defined this condition, if any. */
  sourceCardId: string | null;
}

// ─── Rest / Downtime ──────────────────────────────────────────────────────────

export type RestType = "short" | "long";

export interface DowntimeAction {
  id: string;
  name: string;
  description: string;
  available: boolean;
}

export interface RestResult {
  restType: RestType;
  actionsAvailable: DowntimeAction[];
  cleared: {
    hp: number;
    stress: number;
    armor: number;
  };
  character: Character;
}

// ─── CMS Content ─────────────────────────────────────────────────────────────

export type CmsContentType = "interstitial" | "splash";

export interface CmsContent {
  id: string;
  type: CmsContentType;
  title: string;
  body: string;
  imageKey: string | null;
  imageUrl: string | null;
  active: boolean;
  order: number;
  createdAt: string;
  updatedAt: string;
}

// ─── SRD Validation ───────────────────────────────────────────────────────────

export interface ValidationResult {
  valid: boolean;
  errors: Array<{
    field: string;
    rule: string;
    message: string;
  }>;
  warnings: Array<{
    field: string;
    message: string;
  }>;
}

// ─── Level-Up System ──────────────────────────────────────────────────────────

/**
 * Advancement types available in the Tier 2/3/4 advancement pool (SRD p.22).
 * "proficiency-increase" costs both advancement slots.
 * "multiclass" costs both advancement slots (Tier 3+ only).
 */
export type AdvancementType =
  | "trait-bonus"          // +1 to TWO chosen stats (marks them; cleared at tier achievements lv5, lv8). Once per tier.
  | "hp-slot"              // +1 HP slot (max 12)
  | "stress-slot"          // +1 Stress slot (max 12)
  | "experience-bonus"     // +1 to TWO chosen experiences
  | "evasion"              // +1 Evasion (permanent)
  | "additional-domain-card" // Take an additional domain card (level ≤ current)
  | "subclass-upgrade"     // Upgrade subclass: Foundation → Specialization → Mastery. Mutually exclusive with multiclass per tier.
  | "proficiency-increase" // +1 Proficiency (costs both slots)
  | "multiclass";          // Multiclass (costs both slots; Tier 3+ only). Mutually exclusive with subclass-upgrade per tier.

export interface AdvancementChoice {
  type: AdvancementType;
  /**
   * Depending on type:
   * - trait-bonus: comma-separated pair of stat names, e.g. "agility,strength"
   * - experience-bonus: comma-separated pair of experience names, e.g. "Stealth,Athletics"
   * - additional-domain-card: cardId
   * - subclass-upgrade: "specialization" | "mastery"
   * - multiclass: classId of the new class
   * All others: no detail needed.
   */
  detail?: string;
}

/**
 * The full set of choices a player makes when leveling up to a specific level.
 * Sent to POST /characters/{id}/levelup.
 */
export interface LevelUpChoices {
  /** The target level (must equal character.level + 1). */
  targetLevel: number;
  /** Exactly 2 advancement slots worth of choices. Double-slot advancements count as 2. */
  advancements: AdvancementChoice[];
  /**
   * The cardId of the domain card acquired this level.
   * Must be in character's domainVault at level ≤ targetLevel.
   * If the card is newly available (not yet in vault), the backend adds it to the vault first.
   */
  newDomainCardId: string | null;
  /**
   * If provided, exchange this existing card for the new one (card must be in vault,
   * new card level ≤ exchanged card level; SRD p.22).
   */
  exchangeCardId?: string | null;
}
