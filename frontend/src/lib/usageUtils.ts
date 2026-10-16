/**
 * src/lib/usageUtils.ts
 *
 * Pure helpers for the usage / exhaustion tracker. Extracted so they can be
 * unit-tested independently of the React component tree.
 *
 * `detectUsageFrequency` bridges the gap until ingestion emits a stable
 * `usageFrequency` field: it scans feature/card/ability prose for cadence
 * phrases ("once per rest", "per scene", …) and returns the matching
 * `UsageFrequency`.
 *
 * `usageKeyFor*` helpers centralise the stable usageKey scheme so callers
 * never hand-roll keys and drift from the backend.
 */

import type { UsageFrequency } from "@shared/types";

/**
 * Detect the usage cadence implied by a block of prose.
 *
 * Precedence matters: long rest → short rest → generic rest → scene →
 * session. The specific "once/twice/three times per long/short rest" patterns
 * win over the generic "per X rest" patterns so "once per long rest" is not
 * misclassified as a generic rest cadence.
 *
 * Returns "none" when no cadence phrase is found.
 */
export function detectUsageFrequency(text: string): UsageFrequency {
  const t = text.toLowerCase();
  if (/(once|twice|three times)\s+per\s+long\s+rest/.test(t))
    return "once-per-long-rest";
  if (/(once|twice)\s+per\s+short\s+rest/.test(t)) return "once-per-short-rest";
  if (/per\s+long\s+rest/.test(t)) return "once-per-long-rest";
  if (/per\s+short\s+rest/.test(t)) return "once-per-short-rest";
  if (/(once|twice)\s+per\s+rest|\bper\s+rest\b/.test(t)) return "once-per-rest";
  if (/(once|twice)\s+per\s+scene|\bper\s+scene\b/.test(t))
    return "once-per-scene";
  if (/(once|twice)\s+per\s+session|\bper\s+session\b/.test(t))
    return "once-per-session";
  return "none";
}

/**
 * Stable usageKey for a whole domain card. Returns the cardId unchanged.
 */
export function usageKeyForCard(cardId: string): string {
  return cardId;
}

/**
 * Stable usageKey for a single grimoire ability within a grimoire card.
 * `index` is 0-based within `card.grimoire`.
 */
export function usageKeyForGrimoireAbility(cardId: string, index: number): string {
  return `${cardId}#grimoire:${index}`;
}

/**
 * Stable usageKey for a class feature.
 */
export function usageKeyForClassFeature(classId: string, name: string): string {
  return `class:${classId}:${name}`;
}

/**
 * Stable usageKey for a subclass feature (foundation/specialization/mastery).
 */
export function usageKeyForSubclassFeature(subclassId: string, name: string): string {
  return `subclass:${subclassId}:${name}`;
}

/**
 * Stable usageKey for a hope feature (one per class).
 */
export function usageKeyForHopeFeature(classId: string): string {
  return `hope:${classId}`;
}
