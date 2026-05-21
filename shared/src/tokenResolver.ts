// shared/src/tokenResolver.ts
// Pure functions for the Token Cap Resolver.
// Used by both the backend (applyAction, applyRest) and the frontend
// (TokenTracker display) so that cap resolution is always identical.

import type { TokenConfig } from "./types";
import type { Character } from "./types";

/**
 * Tier for a given character level (SRD p.22).
 * Tier 1 = creation only; Tier 2 = levels 2–4; Tier 3 = 5–7; Tier 4 = 8–10.
 *
 * Exported from the shared package so backend and frontend share one source
 * of truth rather than each maintaining a local copy.
 */
export function tierForLevel(level: number): 1 | 2 | 3 | 4 {
  if (level <= 1) return 1;
  if (level <= 4) return 2;
  if (level <= 7) return 3;
  return 4;
}

/**
 * Token Cap Resolver.
 *
 * Given a `TokenConfig` and a `Character`, returns the resolved integer cap,
 * or `null` when the pool is uncapped (`maxStat: null`) or when `maxStat` is
 * `'spellcast'` and the character has no spellcast trait.
 *
 * @param config    - The `TokenConfig` from the domain card or community.
 * @param character - The full `Character` record.
 * @returns         The resolved numeric cap, or `null` (uncapped / unresolvable).
 */
export function resolveTokenCap(
  config: TokenConfig,
  character: Character
): number | null {
  const { maxStat } = config;

  // Uncapped
  if (maxStat === null) return null;

  // Fixed number
  if (typeof maxStat === "number") return maxStat;

  // Special keys
  if (maxStat === "level") return character.level;

  if (maxStat === "tier") return tierForLevel(character.level);

  if (maxStat === "spellcast") {
    if (character.spellcastTrait === null) return null;
    return character.stats[character.spellcastTrait];
  }

  // CoreStatName (agility | strength | finesse | instinct | presence | knowledge)
  return character.stats[maxStat];
}
