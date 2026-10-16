// shared/src/tokenConfigs.ts
// Curated mapping of domain cards that carry a genuine self-managed token pool.
//
// This is the source of truth used to attach a `TokenConfig` to domain cards
// that need a token tracker (cap + optional rest reset behaviour), independent
// of ingestion frontmatter. See docs/remediation/missing-counters.md for the
// full positive list and the rationale for each entry.
//
// Keys are lowercase "<domain>/<cardId>". Lookups are normalized to lowercase
// via `getDomainTokenConfig` so callers can pass the loadout's display-form
// cardId strings (e.g. "Study/research") without worrying about casing.
//
// Entries with `maxStat: null` are uncapped pools — the card text specifies no
// cap or reset cadence, so the tracker is manual (spend/add/clear via buttons)
// until SRD/homebrew guidance is provided. Do NOT invent caps without approval.
//
// This map can be extended for other token-pool cards from the positive list in
// docs/remediation/missing-counters.md as their cap/reset behaviour is confirmed.

import type { TokenConfig } from "./types";

export const DOMAIN_TOKEN_CONFIGS: Record<string, TokenConfig> = {
  // Research (Study, Level 1): place two tokens; cap 2; clear on short rest.
  "study/research": {
    maxStat: 2,
    restAction: { trigger: "short-rest", effect: "clear" },
  },
  // Inventor (Study, Level 4): after a long rest place tokens equal to
  // Knowledge; clear unspent on long rest.
  "study/inventor": {
    maxStat: "knowledge",
    restAction: { trigger: "long-rest", effect: "fill-to-cap" },
  },
  // Theoretical Magic (Weird): no stated cap or reset — uncapped pool.
  "weird/theoretical-magic": {
    maxStat: null,
  },
};

/**
 * Look up the `TokenConfig` for a domain card by its `domain` and `cardId`.
 *
 * Normalizes both inputs to lowercase before matching against the curated map,
 * so `getDomainTokenConfig("Study", "Research")` and
 * `getDomainTokenConfig("study", "research")` both resolve to the same entry.
 *
 * @param domain - The card's domain name (any casing).
 * @param cardId - The card's id string (any casing).
 * @returns The matching `TokenConfig`, or `undefined` if this card has no pool.
 */
export function getDomainTokenConfig(
  domain: string,
  cardId: string
): TokenConfig | undefined {
  const key = `${domain.toLowerCase()}/${cardId.toLowerCase()}`;
  return DOMAIN_TOKEN_CONFIGS[key];
}
