/**
 * src/lib/diceColorResolver.ts
 *
 * Resolves effective dice colors from the cascade:
 *   character-scoped → user default → system default
 *
 * Used by DiceRoller to build COLOR_OVERRIDES at render time,
 * and by the DiceColorEditor to show "inherited" defaults.
 */

import type { DiceColorPrefs, DieColorPair } from "@shared/types";
import type { DieRole } from "@/types/dice";

// ─── System defaults (match the hardcoded COLOR_OVERRIDES in DiceRoller) ──────

export const SYSTEM_DEFAULTS: Required<DiceColorPrefs> = {
  hope:    { diceColor: "#DAA520", labelColor: "#36454F" },
  fear:    { diceColor: "#36454F", labelColor: "#DAA520" },
  general: { diceColor: "#202020", labelColor: "#aaaaaa" },
};

/** System defaults for GM dice. */
export const GM_SYSTEM_DEFAULTS: DieColorPair = {
  diceColor: "#150d6f",
  labelColor: "#ee766b",
};

// ─── Resolution ──────────────────────────────────────────────────────────────

export interface ResolvedDiceColors {
  hope:    DieColorPair;
  fear:    DieColorPair;
  general: DieColorPair;
}

/**
 * Resolve effective dice colors from the cascade.
 * @param characterPrefs Character-scoped prefs (highest priority)
 * @param userPrefs      User-level default prefs (fallback)
 */
export function resolveDiceColors(
  characterPrefs?: DiceColorPrefs,
  userPrefs?: DiceColorPrefs,
): ResolvedDiceColors {
  return {
    hope:    characterPrefs?.hope    ?? userPrefs?.hope    ?? SYSTEM_DEFAULTS.hope,
    fear:    characterPrefs?.fear    ?? userPrefs?.fear    ?? SYSTEM_DEFAULTS.fear,
    general: characterPrefs?.general ?? userPrefs?.general ?? SYSTEM_DEFAULTS.general,
  };
}

/**
 * Resolve GM dice colors. GMs use the user's "general" preference
 * if set, otherwise the GM system default.
 */
export function resolveGmDiceColor(userPrefs?: DiceColorPrefs): DieColorPair {
  return userPrefs?.general ?? GM_SYSTEM_DEFAULTS;
}

/**
 * Build a full DieRole → color map suitable for passing as colorOverrides
 * to the dice.js dice_box constructor.
 */
export function buildColorOverrides(
  resolved: ResolvedDiceColors,
  gmColor?: DieColorPair,
): Record<DieRole, { dice_color: string; label_color: string }> {
  const toJs = (p: DieColorPair) => ({ dice_color: p.diceColor, label_color: p.labelColor });
  return {
    hope:         toJs(resolved.hope),
    fear:         toJs(resolved.fear),
    advantage:    toJs(resolved.general),
    disadvantage: toJs(resolved.general),
    damage:       toJs(resolved.general),
    generic:      toJs(resolved.general),
    gm:           toJs(gmColor ?? GM_SYSTEM_DEFAULTS),
  };
}
