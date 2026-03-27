/**
 * src/types/dice.ts
 *
 * Type definitions for the Daggerheart 3D dice roller system.
 * All roll logic derives from SRD rules (see comments below).
 */

// ─── Die faces ─────────────────────────────────────────────────────────────────

export type DieSize = "d4" | "d6" | "d8" | "d10" | "d12" | "d20";

/**
 * A die's role controls its visual color scheme in dice.js and resolve logic.
 * - "hope"        → Goldenrod body (#DAA520), Charcoal numbers (#36454F)
 * - "fear"        → Charcoal body (#36454F), Goldenrod numbers (#DAA520)
 * - "advantage"   → Dark body, light numbers; value ADDED to total
 * - "disadvantage"→ Dark body, light numbers; value SUBTRACTED from total (SRD p.20)
 * - "damage"      → Dark body, light numbers
 * - "generic"     → Dark body, light numbers
 */
export type DieRole = "hope" | "fear" | "advantage" | "disadvantage" | "damage" | "generic";

// ─── Roll request ──────────────────────────────────────────────────────────────

/**
 * Describes a single die to roll.
 */
export interface DieSpec {
  size: DieSize;
  role: DieRole;
  /** Optional label shown in the log (e.g. "Agility") */
  label?: string;
}

/**
 * An optional toggleable bonus shown in the staging panel.
 * Each bonus has a label (e.g. "Reliable") and either a flat numeric value
 * or a set of extra dice to inject (or both). An optional `cost` string is
 * shown in the UI as a reminder of what the player must spend to activate it.
 */
export interface RollBonus {
  label: string;
  /** Flat modifier to add to the roll total (may be 0 if bonus is dice-only). */
  value: number;
  /** Extra dice to inject into the pool when this bonus is active. */
  extraDice?: DieSpec[];
  /** Human-readable resource cost shown in the UI (e.g. "1 Hope", "1 Stress"). */
  cost?: string;
}

/**
 * A full roll request passed to the dice engine.
 */
export interface RollRequest {
  /** Human-readable label for the whole roll (e.g. "Action Roll", "Damage") */
  label: string;
  /** Type categorises how SRD outcome is calculated */
  type: "action" | "damage" | "reaction" | "generic";
  /** Dice to roll */
  dice: DieSpec[];
  /** Flat numeric modifier added to the total */
  modifier?: number;
  /** For action/reaction rolls: the difficulty to beat */
  difficulty?: number;
  /** Character proficiency (used for damage roll notation) */
  proficiency?: number;
  /**
   * Optional toggleable bonuses shown in the staging panel.
   * Each one can be toggled on/off by the player before rolling.
   * When toggled on, its value is added to the modifier.
   */
  bonuses?: RollBonus[];
  /** Character name — carried through to OBS log overlay for display. */
  characterName?: string;
}

// ─── Roll result ───────────────────────────────────────────────────────────────

/**
 * Result of one die.
 */
export interface DieResult {
  size: DieSize;
  role: DieRole;
  value: number;
  label?: string;
}

/**
 * SRD outcome for an action roll:
 * - "critical" → both d12s show the same number (SRD p.14)
 * No success/failure classification — that requires the GM's difficulty target.
 */
export type ActionOutcome = "critical";

/**
 * Fully resolved roll result stored in the dice log.
 */
export interface RollResult {
  /** Unique roll ID */
  id: string;
  /** ISO timestamp */
  timestamp: string;
  /** Copy of the original request */
  request: RollRequest;
  /** Individual die results */
  dice: DieResult[];
  /** Sum of all dice + modifier */
  total: number;
  /** For action/reaction: SRD outcome classification */
  outcome?: ActionOutcome;
  /** Hope die value (first d12) */
  hopeValue?: number;
  /** Fear die value (second d12) */
  fearValue?: number;
}

// ─── Store shape ───────────────────────────────────────────────────────────────

export interface DiceStoreState {
  /** True while dice.js is physically animating */
  isRolling: boolean;
  /** Pending request waiting for animation to complete */
  pendingRequest: RollRequest | null;
  /** Staged request waiting in the pre-roll modal (Phase 1) */
  stagedRequest: RollRequest | null;
  /** Most recently completed roll */
  lastResult: RollResult | null;
  /** Full history of rolls (most-recent first, capped at 50) */
  log: RollResult[];
}

export interface DiceStoreActions {
  /** Stage a roll request — opens the pre-roll modal without rolling yet */
  stageRoll: (req: RollRequest) => void;
  /** Clear the staged request (e.g. when modal is cancelled) */
  clearStagedRoll: () => void;
  /** Queue a roll request. Ignored if a roll is already in progress. */
  requestRoll: (req: RollRequest) => void;
  /** Called by DiceRoller when animation completes with raw die values */
  resolveRoll: (rawValues: number[]) => void;
  /**
   * Drive a visual-only animation — sets isRolling/pendingRequest but does NOT
   * broadcast and does NOT compute a result. Used exclusively by the OBS dice
   * overlay so it mirrors the player's animation without producing its own roll.
   * Pass rawValues to seed the dice faces to exact values from the player's result.
   */
  playAnimation: (req: RollRequest, rawValues?: number[]) => void;
  /**
   * Clear animation state after a visual-only roll finishes.
   * Paired with playAnimation — clears isRolling/pendingRequest without
   * computing a result or broadcasting anything.
   */
  finishAnimation: () => void;
  /** Clear the full log */
  clearLog: () => void;
  /** Reset rolling state (e.g. on error) */
  resetRolling: () => void;
}

export type DiceStore = DiceStoreState & DiceStoreActions;
