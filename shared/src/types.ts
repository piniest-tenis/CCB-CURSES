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
  proficiency: SlotTracker;
}

export interface DamageThresholds {
  minor: number;
  major: number;
  severe: number;
}

export type WeaponDamageType = "physical" | "magic";
export type WeaponBurden = "one-handed" | "two-handed";

export interface Weapon {
  name: string | null;
  trait: string | null;
  damage: string | null;
  range: string | null;
  type: WeaponDamageType | null;
  burden: WeaponBurden | null;
}

export interface Weapons {
  primary: Weapon;
  secondary: Weapon;
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
  experiences: Experience[];
  conditions: string[];
  domainLoadout: string[]; // cardIds, max 5
  domainVault: string[];   // all unlocked cardIds
  classFeatureState: ClassFeatureState;
  notes: string | null;
  avatarKey: string | null;
  createdAt: string;
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
