/**
 * src/lib/tokenUtils.ts
 *
 * Pure helpers for token-related logic, extracted so they can be unit-tested
 * independently of the React component tree.
 */

import type { DomainCard, CoreStatName } from "@shared/types";

/**
 * Returns true when a domain card should show a TokenTracker.
 *
 * Conditions (any one is sufficient):
 *   - card.isCursed
 *   - card.tokenConfig !== undefined
 *   - cardId is already present in the character's cardTokens map
 */
export function cardHasTokens(
  card: DomainCard | undefined,
  cardTokens: Record<string, number>,
  cardId: string,
): boolean {
  if (!card) return false;
  return card.isCursed || card.tokenConfig !== undefined || cardId in cardTokens;
}

// ─── Stat label helper ────────────────────────────────────────────────────────

export type StatLabelKey = CoreStatName | "level" | "tier" | "spellcast";

export const STAT_LABEL_MAP: Record<StatLabelKey, string> = {
  agility: "Agility",
  strength: "Strength",
  finesse: "Finesse",
  instinct: "Instinct",
  presence: "Presence",
  knowledge: "Knowledge",
  level: "Level",
  tier: "Tier",
  spellcast: "Spellcast",
};

/**
 * Maps a CoreStatName / 'level' / 'tier' / 'spellcast' to a display string.
 * Returns null for null/undefined input.
 */
export function statLabel(key: StatLabelKey | null | undefined): string | null {
  if (key == null) return null;
  return STAT_LABEL_MAP[key] ?? null;
}
