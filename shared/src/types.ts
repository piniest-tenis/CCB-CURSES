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
  /**
   * When true, this character uses mixed ancestry (SRD p.16).
   * `ancestryId` stores the Top Feature ancestry; `mixedAncestryBottomId` stores
   * the Bottom Feature ancestry. The player-authored heritage display name is in
   * `mixedAncestryDisplayName`.
   */
  isMixedAncestry?: boolean;
  /**
   * The ancestryId of the ancestry providing the Bottom Feature (second-listed).
   * Only meaningful when `isMixedAncestry` is true.
   * Null for single-ancestry characters.
   */
  mixedAncestryBottomId?: string | null;
  /**
   * Free-text heritage display name chosen by the player (SRD p.16).
   * Used as the display name instead of `ancestryName` when `isMixedAncestry` is true.
   * Examples: "Elf-Goblin", "Toothling", "Goblin"
   */
  mixedAncestryDisplayName?: string | null;
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
  /** The campaign this character is currently assigned to, or null if unassigned. */
  campaignId: string | null;

  // ── Multiclass fields (SRD p.43: available Tier 3+, costs both slots) ────
  /**
   * The classId of the character's second class, if they have multiclassed.
   * Null until the multiclass advancement is taken (level 5+).
   */
  multiclassClassId: string | null;
  /**
   * Display name of the multiclass class (denormalized for list views).
   * Null until multiclassed.
   */
  multiclassClassName: string | null;
  /**
   * The subclassId chosen from the multiclass class's subclasses.
   * Only the Foundation feature of this subclass is granted (SRD p.43).
   * Null until multiclassed.
   */
  multiclassSubclassId: string | null;
  /**
   * The domain name chosen from the multiclass class's two domains.
   * Cards from this domain are available at up to half character level (rounded up).
   * Null until multiclassed.
   */
  multiclassDomainId: string | null;
  /**
   * The classFeature index (0-based) chosen from the multiclass class's classFeatures array,
   * or null if not yet chosen / legacy character. Stored as a numeric index into ClassData.classFeatures.
   * Null until multiclassed or if the class has no choosable class features.
   */
  multiclassClassFeatureIndex: number | null;
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
  /**
   * Per-character Favor tokens keyed by factionId (or a freeform source label).
   * Favors are consumable social currency: spend one to make a reasonable request
   * of a faction or adherent (+2 Attitude). Retained if denied, consumed on success.
   * No cap; cannot go negative. Earned narratively at GM discretion or via
   * domain cards (Orator, Fence) and class features (Evangelist Altar Call).
   */
  favors: Record<string, number>;
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
  /**
   * Character-scoped dice color overrides. Takes precedence over
   * UserPreferences.diceColors and the system defaults.
   */
  diceColors?: DiceColorPrefs;
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
  classFeatures: ClassFeature[];
  backgroundQuestions: string[];
  connectionQuestions: string[];
  subclasses: SubclassData[];
  mechanicalNotes: string;
  /** Armor IDs recommended for this class (1–2 items). Derived from the
   *  `%% armor rec: <tier> %%` comment in the class markdown file.
   *  Falls back to evasion-based suggestion if absent. */
  armorRec: string[];
}

// ─── Community & Ancestry ─────────────────────────────────────────────────────

/**
 * A flat, numeric stat bonus granted at character creation by an ancestry or
 * community trait. Only creation-time bonuses are represented here; conditional
 * or once-per-session effects are described in traitDescription prose instead.
 *
 * stat:        Which character stat is modified.
 * amount:      Additive integer delta (positive = increase).
 * traitIndex:  0 for first/only trait, 1 for second trait (ancestries only).
 * condition:   Optional human-readable qualifier (stored for display; does NOT
 *              change the flat-bonus semantics — if a condition is present and
 *              non-trivial, the bonus should NOT be in this list).
 */
export interface MechanicalBonus {
  stat: "armor" | "hp" | "stress" | "evasion" | "hope" | "hopeMax";
  amount: number;
  traitIndex: 0 | 1;
  condition?: string;
}

export interface CommunityData {
  communityId: string;
  name: string;
  flavorText: string;
  traitName: string;
  traitDescription: string;
  source: CharacterSource;
  /** Flat stat bonuses granted at character creation. Absent when there are none. */
  mechanicalBonuses?: MechanicalBonus[];
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
  /** Flat stat bonuses granted at character creation. Absent when there are none. */
  mechanicalBonuses?: MechanicalBonus[];
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
  recallCost: number;
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

// ─── Dice Color Preferences ───────────────────────────────────────────────────

/** Face + label (number) color pair for a single die category. */
export interface DieColorPair {
  /** Hex color for the die body/face (e.g. "#DAA520"). */
  diceColor: string;
  /** Hex color for the number/label on the die (e.g. "#36454F"). */
  labelColor: string;
}

/**
 * Per-category dice color preferences. Each key is optional — when absent the
 * system falls back to user-level defaults, then to hardcoded system defaults.
 */
export interface DiceColorPrefs {
  hope?: DieColorPair;
  fear?: DieColorPair;
  general?: DieColorPair;
}

// ─── User ─────────────────────────────────────────────────────────────────────

export interface UserPreferences {
  theme: "dark" | "light" | "system";
  defaultDiceStyle: string;
  /** User-level default dice colors applied to all owned characters without character-scoped overrides. */
  diceColors?: DiceColorPrefs;
  /** Default content source filter for browsing views. Defaults to "srd" if unset. */
  defaultSourceFilter?: "srd" | "curses" | "all";
  /**
   * Whether the user has opted-in to Curses! content (our homebrew extensions).
   * Controls visibility of Curses!-specific features like Faction Favors, Curses!
   * conditions, etc. Defaults to false if unset.
   */
  cursesEnabled?: boolean;
}

// ─── Patreon Integration ──────────────────────────────────────────────────────

/**
 * Membership status for a user's linked Patreon account on the CursesAP campaign.
 *
 * "none"           — No Patreon account linked, or the linked account is NOT a
 *                    member/follower of CursesAP.
 * "free"           — User is a free follower of the CursesAP Patreon page.
 *                    Unlocks: character saving.
 *                    Does NOT unlock: campaigns, sessions, dice colors.
 * "active_patron"  — User is an active paid patron of CursesAP.
 *                    Tier-specific unlocks (campaigns, etc.) are gated by
 *                    `patreonTier` when tier configuration is provided.
 */
export type PatreonMembershipStatus = "none" | "free" | "active_patron";

/**
 * Patreon account linkage and membership information stored on the user profile.
 * Present only after a user has completed the Patreon OAuth flow.
 */
export interface PatreonLink {
  /** The Patreon user ID returned by the Patreon Identity API. */
  patreonUserId: string;
  /** Membership status relative to the CursesAP Patreon campaign. */
  membershipStatus: PatreonMembershipStatus;
  /**
   * Patreon tier title (e.g. "Free", "Adventurer", "Hero") for paid patrons.
   * Null when membershipStatus is "none" or "free".
   * The actual tier names and their feature gates will be configured later.
   */
  tierTitle: string | null;
  /**
   * Patreon tier amount in cents (e.g. 500 = $5/month).
   * Null when membershipStatus is "none" or "free".
   */
  tierAmountCents: number | null;
  /** ISO 8601 timestamp when the Patreon account was linked. */
  linkedAt: string;
  /** ISO 8601 timestamp of the last membership status refresh from the Patreon API. */
  lastCheckedAt: string;
}

export interface UserProfile {
  userId: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  preferences: UserPreferences;
  /**
   * Patreon account linkage, or null if no Patreon account has been connected.
   * When null, the frontend checks `createdAt` against the Patreon gate cutoff
   * date to determine if the user is grandfathered.
   */
  patreon: PatreonLink | null;
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

// ─── Homebrew Content System ──────────────────────────────────────────────────

export type HomebrewContentType = "class" | "community" | "ancestry" | "domainCard" | "weapon" | "armor" | "item" | "consumable";

/**
 * A lightweight summary of a homebrew content item, returned by the list
 * endpoint (GET /homebrew/mine). Contains just enough to render a card in the
 * homebrew list page — full data is fetched on demand via GET /homebrew/{type}/{id}.
 */
export interface HomebrewSummary {
  contentType: HomebrewContentType;
  pk: string;
  sk: string;
  /** URL-safe slug used as the {id} path parameter for GET/PUT/DELETE. */
  slug: string;
  name: string;
  source: "homebrew";
  creatorUserId: string;
  updatedAt: string;
  createdAt: string;
  /** For domainCard items, the domain this card belongs to. */
  domain?: string;
}

/**
 * Input payload for creating or updating homebrew content via markdown.
 * Sent as the body of POST /homebrew and PUT /homebrew/{contentType}/{id}.
 */
export interface HomebrewMarkdownInput {
  contentType: HomebrewContentType;
  name: string;
  markdown: string;
  /** Required for domainCard content type — the domain this card belongs to. */
  domain?: string;
  /** Required for domainCard — card level (1–10). */
  level?: number;
  /** Whether this domain card has a curse (★). */
  isCursed?: boolean;
  /** Whether this is a linked curse card (↔). */
  isLinkedCurse?: boolean;
  /** Override recall cost (defaults to card level). */
  recallCost?: number;
}

// ─── Homebrew Equipment & Loot Types ──────────────────────────────────────

/**
 * SRD weapon features (Homebrew Kit p.22).
 * Primary weapon features affect the main attack properties.
 */
export type WeaponFeatureName =
  | "Brutal"
  | "Burning"
  | "Cumbersome"
  | "Deadly"
  | "Disarming"
  | "Entangling"
  | "Forceful"
  | "Keen"
  | "Piercing"
  | "Quickdraw"
  | "Reaching"
  | "Throwing"
  | "Versatile";

/**
 * Secondary weapon features.
 */
export type SecondaryWeaponFeatureName =
  | "Paired"
  | "Protective"
  | "Barrier";

export type WeaponCategory = "primary" | "secondary";
export type DamageType = "physical" | "magic";
export type WeaponRange = "melee" | "ranged" | "very close" | "close" | "far" | "very far";

/**
 * Homebrew weapon data — submitted via the WeaponForm.
 * Stored in GAME_DATA_TABLE with PK=WEAPON#hb-{userId}-{slug}, SK=METADATA.
 */
export interface HomebrewWeaponData {
  weaponId: string;
  name: string;
  tier: 1 | 2 | 3 | 4;
  category: WeaponCategory;
  trait: string;            // e.g. "Agility" — the stat trait used to attack
  range: WeaponRange;
  damageDie: string;        // e.g. "d6", "d8", "d10", "d12", "2d6"
  damageType: DamageType;
  burden: number;           // 1-3 for primary, 0 for secondary
  feature?: {
    name: string;
    description: string;
  };
  source: CharacterSource;
}

/**
 * Homebrew armor data — submitted via the ArmorForm.
 * Stored in GAME_DATA_TABLE with PK=ARMOR#hb-{userId}-{slug}, SK=METADATA.
 */
export interface HomebrewArmorData {
  armorId: string;
  name: string;
  tier: 1 | 2 | 3 | 4;
  baseThresholds: {
    major: number;
    severe: number;
  };
  baseArmorScore: number;
  feature?: {
    name: string;
    description: string;
  };
  source: CharacterSource;
}

/** Rarity for items and consumables (Homebrew Kit). */
export type LootRarity = "common" | "uncommon" | "rare" | "very rare" | "legendary";

/**
 * Homebrew item data — a reusable item.
 * Stored in GAME_DATA_TABLE with PK=ITEM#hb-{userId}-{slug}, SK=METADATA.
 */
export interface HomebrewItemData {
  itemId: string;
  name: string;
  rarity: LootRarity;
  effect: string;
  source: CharacterSource;
}

/**
 * Homebrew consumable data — a single-use (or limited-use) item.
 * Stored in GAME_DATA_TABLE with PK=CONSUMABLE#hb-{userId}-{slug}, SK=METADATA.
 */
export interface HomebrewConsumableData {
  consumableId: string;
  name: string;
  rarity: LootRarity;
  effect: string;
  uses: number;             // Number of uses before consumed (typically 1-3)
  source: CharacterSource;
}

// ─── Homebrew Equipment Form Input ────────────────────────────────────────────

/**
 * Input payload for creating/updating homebrew equipment (weapons, armor, items,
 * consumables) via structured forms rather than markdown.
 * Sent as the body of POST /homebrew and PUT /homebrew/{contentType}/{id}.
 */
export interface HomebrewEquipmentInput {
  contentType: "weapon" | "armor" | "item" | "consumable";
  name: string;

  // ── Weapon fields ─────────────────────────────────────────────────────
  tier?: 1 | 2 | 3 | 4;
  category?: WeaponCategory;
  trait?: string;
  range?: WeaponRange;
  damageDie?: string;
  damageType?: DamageType;
  burden?: number;

  // ── Armor fields ──────────────────────────────────────────────────────
  baseThresholdMajor?: number;
  baseThresholdSevere?: number;
  baseArmorScore?: number;

  // ── Item / Consumable fields ──────────────────────────────────────────
  rarity?: LootRarity;
  effect?: string;
  uses?: number;

  // ── Shared optional feature ───────────────────────────────────────────
  featureName?: string;
  featureDescription?: string;
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
   * - additional-domain-card: pipe-delimited "cardId|level", e.g. "shadowStep|3"
   *     cardId = the chosen card; level = card.level (for backend level-cap validation)
   * - subclass-upgrade: "specialization" | "mastery"
   * - multiclass: pipe-delimited string "classId|domainId|subclassId|classFeatureIndex"
   *     e.g. "bard|codex|luminary|0"
   *     classId           = the chosen secondary class
   *     domainId          = which of that class's two domains was chosen
   *     subclassId        = the subclass whose Foundation card was taken
   *     classFeatureIndex = 0-based index into ClassData.classFeatures (omit or "" if none)
   *     Note: 3-part format "classId|domainId|subclassId" remains valid for legacy data.
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
  /**
   * SRD p.22: Tier Achievement (+2, +5, +8) grants a new Experience at +2.
   * The player names it here. If omitted or blank, the experience is not added
   * (player can name it later via a character edit). Must be non-empty to be stored.
   */
  tierAchievementExperienceName?: string;
  /**
   * Level of the new domain card being acquired (newDomainCardId).
   * Passed by the frontend so the backend can validate exchange level cap (SRD p.22).
   */
  newDomainCardLevel?: number;
  /**
   * Level of the card being exchanged (exchangeCardId).
   * Used to enforce: new card level ≤ exchanged card level (SRD p.22).
   */
  exchangeCardLevel?: number;
}

// ─── Campaign System ──────────────────────────────────────────────────────────

export type CampaignMemberRole = "gm" | "player";

export interface Campaign {
  campaignId: string;
  name: string;
  description: string | null;
  primaryGmId: string;
  /** Recurring session schedule, or null if none has been configured. */
  schedule: SessionSchedule | null;
  /**
   * SRD Fear resource tracked by the GM. Range 0–12.
   * Starts at 1 per PC at the beginning of a session; max 12; min 0.
   * Defaults to 0 if never set.
   */
  currentFear?: number;
  /**
   * Whether this campaign uses the Curses! campaign frame (our homebrew
   * extensions: Faction Favors, Curses! conditions, etc.). Defaults to true
   * for existing campaigns; new campaigns inherit the GM's cursesEnabled pref.
   */
  cursesContentEnabled?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CampaignMember {
  campaignId: string;
  userId: string;
  role: CampaignMemberRole;
  joinedAt: string;
}

export interface CampaignSummary extends Campaign {
  memberCount: number;
  callerRole: CampaignMemberRole | null;
  callerCharacterId: string | null;
  /**
   * ISO 8601 timestamp of the next upcoming session, computed server-side
   * from the campaign's SessionSchedule. Null if no schedule is set or no
   * future occurrence can be determined.
   */
  nextSessionAt: string | null;
}

export interface CampaignDetail extends Campaign {
  members: CampaignMemberDetail[];
  characters: CampaignCharacterDetail[];
  callerRole: CampaignMemberRole | null;
  invites?: CampaignInvite[];
}

export interface CampaignMemberDetail {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  role: CampaignMemberRole;
  joinedAt: string;
  characterId: string | null;
}

export interface CampaignCharacterDetail {
  characterId: string;
  userId: string;
  name: string;
  className: string;
  level: number;
  avatarUrl: string | null;
  portraitUrl: string | null;
}

export interface CampaignInvite {
  campaignId: string;
  inviteCode: string;
  createdByUserId: string;
  maxUses: number | null;
  useCount: number;
  expiresAt: string | null;
  grantRole: CampaignMemberRole;
  createdAt: string;
}

export interface PingEvent {
  type: "ping";
  campaignId: string;
  targetCharacterId: string;
  fieldKey: string;
  senderUserId: string;
  timestamp: string;
}

/**
 * Sent by the GM to trigger a dice roll prompt on a specific player's character sheet.
 * The player's sheet receives this and calls stageRoll() with the provided RollRequestPayload.
 */
export interface RollRequestEvent {
  type: "roll_request";
  campaignId: string;
  targetCharacterId: string;
  senderUserId: string;
  timestamp: string;
  /** The roll to stage on the target character's sheet. */
  rollRequest: RollRequestPayload;
}

/**
 * A serialisable roll request suitable for transmission over WebSocket.
 * Mirrors the frontend RollRequest type but avoids importing frontend-only modules.
 */
export interface RollRequestPayload {
  label: string;
  type: "action" | "damage" | "reaction" | "generic";
  dice: Array<{ size: "d4" | "d6" | "d8" | "d10" | "d12" | "d20"; role: string; label?: string }>;
  modifier?: number;
  difficulty?: number;
  /** Optional flavor text shown as a subtitle in the roll modal. */
  flavorText?: string;
  characterName?: string;
}

// ─── Session Schedule ─────────────────────────────────────────────────────────

export type DayOfWeek =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";

export type RecurrenceFrequency = "weekly" | "biweekly" | "monthly";

/**
 * A single scheduled session slot — one day/time combination.
 * A campaign may have multiple slots (e.g. Mon at 7pm + Fri at 8pm).
 */
export interface SessionSlot {
  /** Day of the week this slot falls on. */
  day: DayOfWeek;
  /** 24-hour local time string ("HH:MM"), or null if no specific time is set. */
  time: string | null;
  /** IANA timezone identifier, e.g. "America/New_York". Null = unspecified. */
  timezone: string | null;
  /** Optional human-readable label, e.g. "Evening session". */
  description: string | null;
}

/**
 * The full recurring session schedule for a campaign.
 * Stored as a JSON blob on the campaign METADATA record.
 */
export interface SessionSchedule {
  frequency: RecurrenceFrequency;
  /** One entry per scheduled day. Most campaigns will have exactly one. */
  slots: SessionSlot[];
  /**
   * How many minutes before the session to send reminder emails.
   * 0 = midnight GMT the night before (default).
   * Negative values are not valid.
   */
  reminderOffsetMinutes: number;
  /** Whether reminder emails are enabled for this campaign. */
  reminderEnabled: boolean;
}

// (Homebrew types defined above at line ~636 — do not duplicate here.)
