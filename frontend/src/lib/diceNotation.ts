/**
 * src/lib/diceNotation.ts
 *
 * Dice notation parser and roller for adversary attack/damage dice.
 * Handles standard notation: "2d4+2 physical", "d12+1", "3d6", "1d8-1 magical".
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ParsedDice {
  /** Number of dice to roll (default 1 if omitted, e.g. "d12" → 1). */
  count: number;
  /** Die size (number of faces): 4, 6, 8, 10, 12, 20, etc. */
  size: number;
  /** Flat modifier added after summing dice (can be negative; default 0). */
  modifier: number;
  /** Damage type text after the notation, e.g. "physical" (empty string if none). */
  type: string;
}

export interface RollOutput {
  /** Individual die values. */
  values: number[];
  /** Sum of all dice + modifier. */
  total: number;
}

// ─── Regex ────────────────────────────────────────────────────────────────────

/**
 * Matches dice notation like:
 *   "2d4+2 physical"  → count=2, size=4, sign="+", mod=2, type="physical"
 *   "d12+1"           → count=undefined, size=12, sign="+", mod=1, type=""
 *   "3d6"             → count=3, size=6, sign=undefined, mod=undefined, type=""
 *   "1d8-1 magical"   → count=1, size=8, sign="-", mod=1, type="magical"
 */
const DICE_RE = /^(\d*)d(\d+)(?:([+-])(\d+))?\s*(.*)$/i;

// ─── Parser ───────────────────────────────────────────────────────────────────

/**
 * Parse a dice notation string into its component parts.
 *
 * @throws {Error} If the notation string doesn't match expected format.
 */
export function parseDiceNotation(notation: string): ParsedDice {
  const trimmed = notation.trim();
  const match = DICE_RE.exec(trimmed);

  if (!match) {
    throw new Error(`Invalid dice notation: "${notation}"`);
  }

  const [, rawCount, rawSize, sign, rawMod, rawType] = match;

  const count    = rawCount ? parseInt(rawCount, 10) : 1;
  const size     = parseInt(rawSize, 10);
  const modifier = rawMod
    ? (sign === "-" ? -1 : 1) * parseInt(rawMod, 10)
    : 0;
  const type     = rawType?.trim() ?? "";

  return { count, size, modifier, type };
}

// ─── Roller ───────────────────────────────────────────────────────────────────

/**
 * Roll dice according to parsed notation.
 * Uses Math.random() — adequate for non-cryptographic tabletop use.
 */
export function rollDice(parsed: ParsedDice): RollOutput {
  const values: number[] = [];
  for (let i = 0; i < parsed.count; i++) {
    values.push(Math.floor(Math.random() * parsed.size) + 1);
  }
  const total = values.reduce((sum, v) => sum + v, 0) + parsed.modifier;
  return { values, total };
}

// ─── Formatter ────────────────────────────────────────────────────────────────

/**
 * Format parsed dice back into a compact notation string (without type).
 * e.g. { count: 2, size: 4, modifier: 2, type: "" } → "2d4+2"
 */
export function formatDiceNotation(parsed: ParsedDice): string {
  let result = `${parsed.count}d${parsed.size}`;
  if (parsed.modifier > 0)  result += `+${parsed.modifier}`;
  if (parsed.modifier < 0)  result += `${parsed.modifier}`;
  return result;
}
