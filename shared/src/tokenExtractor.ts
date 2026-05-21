// shared/src/tokenExtractor.ts
// Pure function that detects token language in card/trait description text
// and returns a structured TokenConfig, or null if no token language is found.
//
// No I/O, no imports from backend. Safe to use in both backend and frontend.

import type { TokenConfig } from "./types";

// ─── Detection patterns ───────────────────────────────────────────────────────

/**
 * Action-verb based token detection patterns.
 * Bare "token" alone is NOT sufficient — must match one of these phrases.
 */
const TOKEN_ACTION_PATTERNS: RegExp[] = [
  /place a token/i,
  /spend a token/i,
  /tokens equal/i,
  /a number of tokens/i,
  /tokens to this card/i,
  /add \w+ tokens?/i,
  /two tokens/i,
  /three tokens/i,
  /once per rest/i,
];

/**
 * Returns true if the text contains token language.
 */
function hasTokenLanguage(text: string): boolean {
  return TOKEN_ACTION_PATTERNS.some((re) => re.test(text));
}

// ─── Stat normalization ───────────────────────────────────────────────────────

type MaxStat = TokenConfig["maxStat"];

/**
 * Compound formula patterns — these resolve to `{ maxStat: null }`.
 */
const COMPOUND_FORMULA_PATTERNS: RegExp[] = [
  /level\s*\+/i,
  /\+\s*level/i,
  /level\s*and\s/i,
  /cursed cards/i,
];

/**
 * Ordered stat extraction patterns. Each entry maps a regex to a MaxStat value.
 * Checked in order; first match wins.
 */
const STAT_PATTERNS: Array<{ re: RegExp; stat: MaxStat }> = [
  // Compound formulas → uncapped
  { re: /level\s*\+\s*\w/i, stat: null },
  { re: /cursed cards in loadout/i, stat: null },
  // Spellcast trait
  { re: /spellcast(?:ing)?\s+trait/i, stat: "spellcast" },
  { re: /\bspellcast\b/i, stat: "spellcast" },
  // Level / tier
  { re: /\byour level\b/i, stat: "level" },
  { re: /\blevel\b/i, stat: "level" },
  { re: /\btier\b/i, stat: "tier" },
  // Core stats
  { re: /\bagility\b/i, stat: "agility" },
  { re: /\bstrength\b/i, stat: "strength" },
  { re: /\bfinesse\b/i, stat: "finesse" },
  { re: /\binstinct\b/i, stat: "instinct" },
  { re: /\bpresence\b/i, stat: "presence" },
  { re: /\bknowledge\b/i, stat: "knowledge" },
];

/**
 * Attempt to extract a MaxStat from the text.
 * Returns `null` (uncapped) for compound formulas or when no stat is found.
 * Returns `undefined` when no stat reference is present at all (caller should
 * use `{ maxStat: null }` as the fallback).
 */
function extractMaxStat(text: string): MaxStat | undefined {
  // Check compound formulas first
  if (COMPOUND_FORMULA_PATTERNS.some((re) => re.test(text))) {
    return null;
  }

  for (const { re, stat } of STAT_PATTERNS) {
    if (re.test(text)) return stat;
  }

  // No stat reference found
  return undefined;
}

// ─── Rest trigger / effect patterns ──────────────────────────────────────────

type RestTrigger = NonNullable<TokenConfig["restAction"]>["trigger"];
type RestEffect = NonNullable<TokenConfig["restAction"]>["effect"];

interface RestAction {
  trigger: RestTrigger;
  effect: RestEffect;
}

const LONG_REST_TRIGGER_PATTERNS: RegExp[] = [
  /after a long rest/i,
  /when you take a long rest/i,
];

const SESSION_START_TRIGGER_PATTERNS: RegExp[] = [
  /at the beginning of a session/i,
  /at the start of a session/i,
];

/**
 * Extract a rest trigger from text, or null if none found.
 */
function extractRestTrigger(text: string): RestTrigger | null {
  if (LONG_REST_TRIGGER_PATTERNS.some((re) => re.test(text))) return "long-rest";
  if (SESSION_START_TRIGGER_PATTERNS.some((re) => re.test(text))) return "session-start";
  return null;
}

/**
 * Extract a rest effect from text given a trigger is present.
 * "place/add/gain N tokens" → fill-to-cap
 * "clear" → clear
 */
function extractRestEffect(text: string): RestEffect | null {
  if (/\bclear\b/i.test(text)) return "clear";
  if (/\b(place|add|gain)\b.*\btokens?\b/i.test(text)) return "fill-to-cap";
  return null;
}

/**
 * Detect "Once per rest" single-use pattern.
 * Returns a full RestAction or null.
 */
function detectOncePerRest(text: string): RestAction | null {
  if (/once per rest/i.test(text)) {
    return { trigger: "long-rest", effect: "fill-to-cap" };
  }
  return null;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Analyse `text` for Daggerheart token language and return a `TokenConfig`
 * if token mechanics are detected, or `null` otherwise.
 *
 * This function is pure — no I/O, no side effects.
 *
 * @param text  Card description or community trait description.
 * @returns     A `TokenConfig` object, or `null` if no token language is found.
 */
export function tokenExtractor(text: string): TokenConfig | null {
  if (!hasTokenLanguage(text)) return null;

  // ── "Once per rest" single-use shorthand ─────────────────────────────────
  const oncePerRest = detectOncePerRest(text);
  if (oncePerRest) {
    return {
      maxStat: 1,
      restAction: oncePerRest,
    };
  }

  // ── Determine maxStat ────────────────────────────────────────────────────
  const extracted = extractMaxStat(text);
  // extracted === undefined means no stat reference → fall back to null (uncapped)
  const maxStat: MaxStat = extracted !== undefined ? extracted : null;

  // ── Determine restAction ─────────────────────────────────────────────────
  const trigger = extractRestTrigger(text);
  let restAction: TokenConfig["restAction"];

  if (trigger) {
    const effect = extractRestEffect(text);
    if (effect) {
      restAction = { trigger, effect };
    }
  }

  const config: TokenConfig = { maxStat };
  if (restAction) config.restAction = restAction;

  return config;
}
