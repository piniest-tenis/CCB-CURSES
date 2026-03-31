/**
 * src/types/adversary.ts
 *
 * Type definitions for the Adversary Catalog, Encounter Console, and
 * Environment Catalog.
 * Adversaries are GM-managed creatures/NPCs from Daggerheart's bestiary.
 * Encounters are live combat sessions where the GM tracks adversary state.
 * Environments are hazardous locations that suggest adversary compositions.
 */

// ─── Adversary Catalog ────────────────────────────────────────────────────────

/** Tier 1–4 maps to Daggerheart's difficulty scaling. */
export type AdversaryTier = 1 | 2 | 3 | 4;

/**
 * Adversary archetype — determines combat role and behavior patterns.
 * Solo:    boss-level threat, acts multiple times per round
 * Bruiser: high-HP melee combatant
 * Horde:   multiple creatures represented as a single stat block
 * Skulk:   stealthy/evasive adversary
 * Leader:  buffs other adversaries, mid-range stats
 * Ranged:  attacks from Far range
 * Support: healer/buffer, low direct threat
 * Minion:  low HP, trivial individually but dangerous in groups
 */
export type AdversaryType =
  | "Bruiser"
  | "Horde"
  | "Leader"
  | "Minion"
  | "Ranged"
  | "Skulk"
  | "Social"
  | "Solo"
  | "Standard"
  | "Support";

/** Attack range classification (Daggerheart SRD — six tiers). */
export type AttackRange = "Melee" | "Very Close" | "Close" | "Far" | "Very Far";

/**
 * Damage thresholds for adversaries (major and severe only).
 * Below Major = 1 HP, at/above Major = 2 HP, at/above Severe = 3 HP.
 * Minions have null thresholds (defeated by any damage).
 */
export interface AdversaryDamageThresholds {
  major: number | null;
  severe: number | null;
}

/** A special feature or ability on an adversary stat block. */
export interface AdversaryFeature {
  name: string;
  description: string;
}

/**
 * Full adversary stat block — the "template" from the catalog.
 * Immutable once created; encounter instances copy from this.
 */
export interface Adversary {
  adversaryId: string;
  /** Display name, e.g. "Skeletal Knight" */
  name: string;
  /** Difficulty tier 1–4 */
  tier: AdversaryTier;
  /** Combat archetype */
  type: AdversaryType;
  /** Short flavor description */
  description: string;
  /** Difficulty number for checks against this adversary */
  difficulty: number;
  /** Hit Points maximum */
  hp: number;
  /** Stress maximum */
  stress: number;
  /** Damage thresholds — determines HP marked per hit */
  damageThresholds: AdversaryDamageThresholds;
  /** Attack modifier added to attack rolls */
  attackModifier: number;
  /** Attack range */
  attackRange: AttackRange;
  /** Attack damage in dice notation, e.g. "2d4+2 physical" */
  attackDamage: string;
  /** Special features and abilities */
  features: AdversaryFeature[];
  /** Optional image/icon URL */
  imageUrl?: string | null;
  /** Whether this is from the SRD or homebrew */
  source: "srd" | "homebrew";
  /** Campaign that owns this adversary (null = global SRD) */
  campaignId: string | null;
  createdAt: string;
  updatedAt: string;
}

// ─── Encounter Console ────────────────────────────────────────────────────────

/**
 * A single adversary instance within a live encounter.
 * Tracks mutable state (current HP, stress, conditions) separate
 * from the immutable adversary template.
 */
export interface EncounterAdversary {
  /** Unique instance ID (multiple of the same adversary can exist) */
  instanceId: string;
  /** Reference to the source adversary template */
  adversaryId: string;
  /** Snapshot of the adversary name (for display even if template is deleted) */
  name: string;
  /** Optional suffix for multiples, e.g. "A", "B", "#1", "#2" */
  label: string;
  /** Difficulty number for checks against this adversary (snapshot from template) */
  difficulty: number;
  /** Current HP marked (0 = untouched, >= maxHp = defeated) */
  hpMarked: number;
  /** Maximum HP (copied from template at creation) */
  hpMax: number;
  /** Current Stress marked */
  stressMarked: number;
  /** Maximum Stress (copied from template) */
  stressMax: number;
  /** Snapshot of damage thresholds (from template) */
  damageThresholds: AdversaryDamageThresholds;
  /** Snapshot of attack stats (from template) */
  attackModifier: number;
  attackRange: AttackRange;
  attackDamage: string;
  /** Snapshot of features (from template) */
  features: AdversaryFeature[];
  /** Active conditions on this instance */
  conditions: string[];
  /** Whether this adversary has been defeated / removed */
  isDefeated: boolean;
  /** Optional notes the GM adds during combat */
  notes: string;
}

/** Encounter status lifecycle. */
export type EncounterStatus = "preparing" | "active" | "completed";

/**
 * A full encounter — a set of adversary instances the GM is tracking.
 * One encounter at a time per campaign (could be extended later).
 */
export interface Encounter {
  encounterId: string;
  campaignId: string;
  /** Optional encounter name, e.g. "Ambush at the Bridge" */
  name: string;
  status: EncounterStatus;
  /** All adversary instances in this encounter */
  adversaries: EncounterAdversary[];
  /** Round counter (GM increments manually) */
  round: number;
  createdAt: string;
  updatedAt: string;
}

// ─── Dice Roll Result for Adversary Attacks ───────────────────────────────────

/**
 * Result of an adversary attack roll, displayed inline in the encounter.
 * Lighter than the full player RollResult — no hope/fear, no staging.
 */
export interface AdversaryRollResult {
  /** Instance that rolled */
  instanceId: string;
  /** "Attack — Skeletal Knight A" */
  label: string;
  /** Individual die values */
  diceValues: number[];
  /** Dice notation rolled, e.g. "1d20+4" */
  diceNotation: string;
  /** Flat modifier applied */
  modifier: number;
  /** Final total */
  total: number;
  /** Whether a natural 20 was rolled (auto-success + bonus damage). */
  isCritical: boolean;
  /** Timestamp */
  timestamp: string;
}

// ─── Environment Catalog ──────────────────────────────────────────────────────

/** Tone descriptors used in Obsidian environment files. */
export type EnvironmentTone = string;

/** An environment feature / hazard passive or active effect. */
export interface EnvironmentFeature {
  name: string;
  description: string;
  /** Whether this feature is a passive (always active) or an activated ability. */
  isPassive: boolean;
}

/**
 * A playable environment — a hazardous location that imposes ongoing effects
 * on the encounter and suggests a pool of potential adversaries.
 */
export interface Environment {
  environmentId: string;
  /** Display name, e.g. "Burning Creep" */
  name: string;
  /** Daggerheart tier 1–4 */
  tier: AdversaryTier;
  /** Environment category — hazard, dungeon, wilderness, etc. */
  type: string;
  /** Short atmospheric description */
  description: string;
  /** Tone keywords, e.g. ["violent", "mournful"] */
  tone: string[];
  /** Base difficulty number for checks made within this environment */
  difficulty: number;
  /** Features / effects active while in this environment */
  features: EnvironmentFeature[];
  /**
   * Adversary IDs (or names used as loose keys) that commonly appear here.
   * When loading an environment these are surfaced as quick-add suggestions.
   */
  potentialAdversaryNames: string[];
  /** Source — homebrew or SRD */
  source: "srd" | "homebrew";
  createdAt: string;
  updatedAt: string;
}
