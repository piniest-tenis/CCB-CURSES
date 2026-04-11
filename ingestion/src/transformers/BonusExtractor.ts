// ingestion/src/transformers/BonusExtractor.ts
// Extracts machine-readable MechanicalBonus objects from ancestry/community
// trait description text.
//
// Two-pass approach:
//   1. Regex pattern matching on natural-language trait text (handles common
//      phrasing like "Gain +1 bonus to your Armor score").
//   2. Fallback to explicit YAML-like bonus annotations embedded in the
//      markdown as HTML comments:
//        <!-- bonus: stat=armor amount=1 traitIndex=0 -->
//      These annotations are authoritative and override regex results when
//      present.
//
// Supported stats:
//   armor              → derivedStats.armor (armor score / slots)
//   hp                 → trackers.hp.max
//   stress             → trackers.stress.max
//   evasion            → derivedStats.evasion
//   hope               → hope (starting token count)
//   hopeMax            → hopeMax
//   trait:<statName>   → permanent core trait score delta (e.g. trait:agility)
//   rollAdvantage:<statName>   → advantage on all rolls using that trait
//   rollDisadvantage:<statName> → disadvantage on all rolls using that trait
//
// Only flat numeric creation-time bonuses are extracted. Complex conditional
// effects (once-per-session, etc.) are not represented here.

import type { MechanicalBonus, MechanicalBonusStat, CoreStatName } from "@shared/types";

const CORE_STAT_NAMES: ReadonlySet<string> = new Set([
  "agility", "strength", "finesse", "instinct", "presence", "knowledge",
]);

// ─── Regex patterns ───────────────────────────────────────────────────────────

// Captures: optional "an additional" phrasing or "+N bonus to your X score"
//
// Pattern groups:
//   match[1]: optional sign "-" (absent = positive)
//   match[2]: digit(s) for the bonus amount
//   match[3]: target stat keyword

const STAT_PATTERNS: Array<{
  regex: RegExp;
  stat: MechanicalBonusStat;
  defaultAmount?: number;
}> = [
  // "+1 bonus to your Armor score" / "+2 bonus to your armor score"
  {
    regex: /gain\s+\+(\d+)\s+bonus\s+to\s+your\s+armor\s+score/i,
    stat: "armor",
  },
  // "+1 bonus to your Evasion" / "+1 bonus to your Evasion score"
  {
    regex: /gain\s+\+(\d+)\s+bonus\s+to\s+(?:your\s+)?evasion(?:\s+score)?/i,
    stat: "evasion",
  },
  // "an additional Hit Point at character creation"
  // "gain an additional Hit Point"
  {
    regex: /(?:gain\s+)?an\s+additional\s+(?:hit\s+point|hp)\s+at\s+character\s+creation/i,
    stat: "hp",
    defaultAmount: 1,
  },
  // "an additional Stress Slot at character creation"
  {
    regex: /(?:gain\s+)?an\s+additional\s+stress\s+slot\s+at\s+character\s+creation/i,
    stat: "stress",
    defaultAmount: 1,
  },
  // "Gain an additional Stress Slot" (without explicit "at character creation")
  {
    regex: /gain\s+an\s+additional\s+stress\s+slot/i,
    stat: "stress",
    defaultAmount: 1,
  },
  // "Gain an additional Hit Point" (without "at character creation")
  {
    regex: /gain\s+an\s+additional\s+(?:hit\s+point|hp)/i,
    stat: "hp",
    defaultAmount: 1,
  },
  // Generic "+N bonus to [stat]" catch-all for hope
  {
    regex: /gain\s+\+(\d+)\s+(?:bonus\s+to\s+)?hope/i,
    stat: "hope",
  },
  // "+1 Evasion" (short form used in some community traits)
  {
    regex: /\+(\d+)\s+evasion/i,
    stat: "evasion",
  },
  // "+1 Armor" (short form)
  {
    regex: /\+(\d+)\s+armor(?!\s+score)/i,
    stat: "armor",
  },
];

// ─── Trait score regex patterns (generate dynamically from known stat names) ──

/**
 * Build regex patterns for trait score bonuses/penalties.
 * Matches phrasings like:
 *   "gain a +1 bonus to your Agility"
 *   "gain a permanent +1 bonus to Agility"
 *   "+1 to your Agility"
 *   "-1 penalty to your Strength"
 *   "gain a -1 penalty to your Strength"
 */
function buildTraitScorePatterns(): Array<{
  regex: RegExp;
  stat: MechanicalBonusStat;
  signGroup: number;
  amountGroup: number;
}> {
  return Array.from(CORE_STAT_NAMES).map((traitName) => ({
    regex: new RegExp(
      `(?:gain\\s+(?:a\\s+)?(?:permanent\\s+)?)?([+-]?)(\\d+)\\s+(?:bonus|penalty)?\\s*to\\s+(?:your\\s+)?${traitName}\\b`,
      "i"
    ),
    stat: `trait:${traitName}` as MechanicalBonusStat,
    signGroup: 1,
    amountGroup: 2,
  }));
}

const TRAIT_SCORE_PATTERNS = buildTraitScorePatterns();

// ─── Roll modifier regex patterns ─────────────────────────────────────────────

/**
 * Build regex patterns for roll advantage/disadvantage modifiers.
 * Matches phrasings like:
 *   "gain advantage on Agility Rolls"
 *   "you have advantage on all Agility rolls"
 *   "gain disadvantage on Strength rolls"
 *   "gain advantage on Agility checks"
 */
function buildRollModifierPatterns(): Array<{
  regex: RegExp;
  stat: MechanicalBonusStat;
}> {
  const results: Array<{ regex: RegExp; stat: MechanicalBonusStat }> = [];
  for (const traitName of CORE_STAT_NAMES) {
    results.push({
      regex: new RegExp(
        `(?:gain\\s+|you\\s+have\\s+|have\\s+)?advantage\\s+on\\s+(?:all\\s+)?${traitName}\\s+(?:rolls?|checks?)`,
        "i"
      ),
      stat: `rollAdvantage:${traitName}` as MechanicalBonusStat,
    });
    results.push({
      regex: new RegExp(
        `(?:gain\\s+|you\\s+have\\s+|have\\s+)?disadvantage\\s+on\\s+(?:all\\s+)?${traitName}\\s+(?:rolls?|checks?)`,
        "i"
      ),
      stat: `rollDisadvantage:${traitName}` as MechanicalBonusStat,
    });
  }
  return results;
}

const ROLL_MODIFIER_PATTERNS = buildRollModifierPatterns();

/**
 * Attempt to parse mechanical bonuses from a single trait description string.
 *
 * @param text        The trait description text.
 * @param traitIndex  0 for first/only trait, 1 for second trait (ancestry).
 * @returns           Array of MechanicalBonus objects extracted.
 */
export function extractBonusesFromText(
  text: string,
  traitIndex: 0 | 1
): MechanicalBonus[] {
  const bonuses: MechanicalBonus[] = [];

  // ── Flat stat patterns ────────────────────────────────────────────────────
  for (const { regex, stat, defaultAmount } of STAT_PATTERNS) {
    const match = text.match(regex);
    if (!match) continue;

    // Amount: captured digit group or defaultAmount
    const rawAmount = match[1] ? parseInt(match[1], 10) : (defaultAmount ?? 1);
    if (!isFinite(rawAmount) || rawAmount === 0) continue;

    // Avoid duplicating the same stat from multiple regex hits
    if (bonuses.some((b) => b.stat === stat && b.traitIndex === traitIndex)) {
      continue;
    }

    bonuses.push({ stat, amount: rawAmount, traitIndex });
  }

  // ── Trait score bonus/penalty patterns ────────────────────────────────────
  for (const { regex, stat, signGroup, amountGroup } of TRAIT_SCORE_PATTERNS) {
    const match = text.match(regex);
    if (!match) continue;

    const sign = match[signGroup] === "-" ? -1 : 1;
    const rawAmount = parseInt(match[amountGroup], 10);
    if (!isFinite(rawAmount) || rawAmount === 0) continue;

    if (bonuses.some((b) => b.stat === stat && b.traitIndex === traitIndex)) {
      continue;
    }

    bonuses.push({ stat, amount: sign * rawAmount, traitIndex });
  }

  // ── Roll modifier patterns ────────────────────────────────────────────────
  for (const { regex, stat } of ROLL_MODIFIER_PATTERNS) {
    if (!text.match(regex)) continue;

    // Roll modifiers may appear multiple times (stacking) — allow duplicates
    bonuses.push({ stat, amount: 1, traitIndex });
  }

  return bonuses;
}

// ─── Explicit annotation parser ───────────────────────────────────────────────

/**
 * Parse explicit bonus annotations embedded as HTML comments in the markdown
 * file content. These annotations take precedence over regex-extracted bonuses
 * for the same (stat, traitIndex) combination.
 *
 * Annotation format (HTML comment on its own line):
 *   <!-- bonus: stat=armor amount=1 traitIndex=0 -->
 *   <!-- bonus: stat=hp amount=1 traitIndex=0 condition="at character creation" -->
 *   <!-- bonus: stat=trait:agility amount=1 traitIndex=0 -->
 *   <!-- bonus: stat=rollAdvantage:agility amount=1 traitIndex=0 -->
 *   <!-- bonus: stat=rollDisadvantage:strength amount=1 traitIndex=0 -->
 *
 * Multiple annotations may appear anywhere in the file.
 *
 * @param raw  The raw file content string.
 * @returns    Array of MechanicalBonus objects from annotations.
 */
export function extractBonusAnnotations(raw: string): MechanicalBonus[] {
  const results: MechanicalBonus[] = [];
  const annotationRe =
    /<!--\s*bonus:\s*(.*?)\s*-->/gi;

  let m: RegExpExecArray | null;
  while ((m = annotationRe.exec(raw)) !== null) {
    const kvString = m[1];
    if (!kvString) continue;

    const kv = parseKV(kvString);

    const stat = kv["stat"] as MechanicalBonusStat | undefined;
    const amountStr = kv["amount"];
    const traitIndexStr = kv["traitIndex"];
    const condition = kv["condition"];

    if (!stat || !isValidStat(stat)) {
      console.warn(`[BonusExtractor] Annotation has unknown stat="${stat ?? "(missing)"}": ${m[0]}`);
      continue;
    }

    const amount = amountStr !== undefined ? parseInt(amountStr, 10) : NaN;
    if (!isFinite(amount)) {
      console.warn(`[BonusExtractor] Annotation has invalid amount="${amountStr ?? "(missing)"}": ${m[0]}`);
      continue;
    }

    const traitIndex = traitIndexStr !== undefined ? parseInt(traitIndexStr, 10) : 0;
    if (traitIndex !== 0 && traitIndex !== 1) {
      console.warn(`[BonusExtractor] Annotation has invalid traitIndex="${traitIndexStr}": ${m[0]}`);
      continue;
    }

    const bonus: MechanicalBonus = {
      stat,
      amount,
      traitIndex: traitIndex as 0 | 1,
    };
    if (condition) bonus.condition = condition;
    results.push(bonus);
  }

  return results;
}

// ─── Merge logic ─────────────────────────────────────────────────────────────

/**
 * Merge regex-extracted bonuses with explicit annotation overrides.
 * For each (stat, traitIndex) pair, annotations win over regex results.
 *
 * @param fromRegex       Bonuses extracted by pattern matching.
 * @param fromAnnotations Bonuses extracted from explicit annotations.
 * @returns               Merged list with no duplicate (stat, traitIndex) pairs.
 */
export function mergeBonuses(
  fromRegex: MechanicalBonus[],
  fromAnnotations: MechanicalBonus[]
): MechanicalBonus[] {
  // Annotation keys that override regex results
  const annotationKeys = new Set(
    fromAnnotations.map((b) => `${b.stat}:${b.traitIndex}`)
  );

  const filtered = fromRegex.filter(
    (b) => !annotationKeys.has(`${b.stat}:${b.traitIndex}`)
  );

  return [...filtered, ...fromAnnotations];
}

// ─── Top-level extractor ─────────────────────────────────────────────────────

/**
 * Extract all mechanical bonuses from a card's full file content and trait texts.
 *
 * @param raw               Raw markdown file content (used for annotation scanning).
 * @param traitDescription  First trait description text.
 * @param secondTraitDescription  Second trait description (ancestries only; pass "" for communities).
 * @returns                 Merged MechanicalBonus array, or undefined if none found.
 */
export function extractMechanicalBonuses(
  raw: string,
  traitDescription: string,
  secondTraitDescription: string
): MechanicalBonus[] | undefined {
  const fromAnnotations = extractBonusAnnotations(raw);

  const fromRegex = [
    ...extractBonusesFromText(traitDescription, 0),
    ...extractBonusesFromText(secondTraitDescription, 1),
  ];

  const merged = mergeBonuses(fromRegex, fromAnnotations);
  return merged.length > 0 ? merged : undefined;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const VALID_FLAT_STATS: ReadonlySet<string> = new Set([
  "armor",
  "hp",
  "stress",
  "evasion",
  "hope",
  "hopeMax",
]);

function isValidStat(s: string): s is MechanicalBonusStat {
  if (VALID_FLAT_STATS.has(s)) return true;
  if (s.startsWith("trait:")) return CORE_STAT_NAMES.has(s.slice("trait:".length));
  if (s.startsWith("rollAdvantage:")) return CORE_STAT_NAMES.has(s.slice("rollAdvantage:".length));
  if (s.startsWith("rollDisadvantage:")) return CORE_STAT_NAMES.has(s.slice("rollDisadvantage:".length));
  return false;
}

/**
 * Parse a simple key=value string into a plain object.
 * Values wrapped in double quotes have their quotes stripped.
 * Example: `stat=armor amount=1 traitIndex=0 condition="at creation"`
 * Also handles namespaced stat values: `stat=trait:agility`
 */
function parseKV(kvString: string): Record<string, string> {
  const result: Record<string, string> = {};
  // Matches: key=value or key="quoted value"
  // Extended to handle colon in values (e.g. stat=trait:agility)
  const kvRe = /(\w+)=(?:"([^"]*)"|([\w.:-]+))/g;
  let m: RegExpExecArray | null;
  while ((m = kvRe.exec(kvString)) !== null) {
    const key = m[1];
    const value = m[2] !== undefined ? m[2] : m[3];
    if (key && value !== undefined) {
      result[key] = value;
    }
  }
  return result;
}

// ─── Regex patterns ───────────────────────────────────────────────────────────

// Captures: optional "an additional" phrasing or "+N bonus to your X score"
//
// Pattern groups:
//   match[1]: optional sign "-" (absent = positive)
//   match[2]: digit(s) for the bonus amount
//   match[3]: target stat keyword

const STAT_PATTERNS: Array<{
  regex: RegExp;
  stat: MechanicalBonus["stat"];
  defaultAmount?: number;
}> = [
  // "+1 bonus to your Armor score" / "+2 bonus to your armor score"
  {
    regex: /gain\s+\+(\d+)\s+bonus\s+to\s+your\s+armor\s+score/i,
    stat: "armor",
  },
  // "+1 bonus to your Evasion" / "+1 bonus to your Evasion score"
  {
    regex: /gain\s+\+(\d+)\s+bonus\s+to\s+(?:your\s+)?evasion(?:\s+score)?/i,
    stat: "evasion",
  },
  // "an additional Hit Point at character creation"
  // "gain an additional Hit Point"
  {
    regex: /(?:gain\s+)?an\s+additional\s+(?:hit\s+point|hp)\s+at\s+character\s+creation/i,
    stat: "hp",
    defaultAmount: 1,
  },
  // "an additional Stress Slot at character creation"
  {
    regex: /(?:gain\s+)?an\s+additional\s+stress\s+slot\s+at\s+character\s+creation/i,
    stat: "stress",
    defaultAmount: 1,
  },
  // "Gain an additional Stress Slot" (without explicit "at character creation")
  {
    regex: /gain\s+an\s+additional\s+stress\s+slot/i,
    stat: "stress",
    defaultAmount: 1,
  },
  // "Gain an additional Hit Point" (without "at character creation")
  {
    regex: /gain\s+an\s+additional\s+(?:hit\s+point|hp)/i,
    stat: "hp",
    defaultAmount: 1,
  },
  // Generic "+N bonus to [stat]" catch-all for hope
  {
    regex: /gain\s+\+(\d+)\s+(?:bonus\s+to\s+)?hope/i,
    stat: "hope",
  },
  // "+1 Evasion" (short form used in some community traits)
  {
    regex: /\+(\d+)\s+evasion/i,
    stat: "evasion",
  },
  // "+1 Armor" (short form)
  {
    regex: /\+(\d+)\s+armor(?!\s+score)/i,
    stat: "armor",
  },
];

/**
 * Attempt to parse mechanical bonuses from a single trait description string.
 *
 * @param text        The trait description text.
 * @param traitIndex  0 for first/only trait, 1 for second trait (ancestry).
 * @returns           Array of MechanicalBonus objects extracted.
 */
export function extractBonusesFromText(
  text: string,
  traitIndex: 0 | 1
): MechanicalBonus[] {
  const bonuses: MechanicalBonus[] = [];

  for (const { regex, stat, defaultAmount } of STAT_PATTERNS) {
    const match = text.match(regex);
    if (!match) continue;

    // Amount: captured digit group or defaultAmount
    const rawAmount = match[1] ? parseInt(match[1], 10) : (defaultAmount ?? 1);
    if (!isFinite(rawAmount) || rawAmount === 0) continue;

    // Avoid duplicating the same stat from multiple regex hits
    if (bonuses.some((b) => b.stat === stat && b.traitIndex === traitIndex)) {
      continue;
    }

    bonuses.push({ stat, amount: rawAmount, traitIndex });
  }

  return bonuses;
}

// ─── Explicit annotation parser ───────────────────────────────────────────────

/**
 * Parse explicit bonus annotations embedded as HTML comments in the markdown
 * file content. These annotations take precedence over regex-extracted bonuses
 * for the same (stat, traitIndex) combination.
 *
 * Annotation format (HTML comment on its own line):
 *   <!-- bonus: stat=armor amount=1 traitIndex=0 -->
 *   <!-- bonus: stat=hp amount=1 traitIndex=0 condition="at character creation" -->
 *
 * Multiple annotations may appear anywhere in the file.
 *
 * @param raw  The raw file content string.
 * @returns    Array of MechanicalBonus objects from annotations.
 */
export function extractBonusAnnotations(raw: string): MechanicalBonus[] {
  const results: MechanicalBonus[] = [];
  const annotationRe =
    /<!--\s*bonus:\s*(.*?)\s*-->/gi;

  let m: RegExpExecArray | null;
  while ((m = annotationRe.exec(raw)) !== null) {
    const kvString = m[1];
    if (!kvString) continue;

    const kv = parseKV(kvString);

    const stat = kv["stat"] as MechanicalBonus["stat"] | undefined;
    const amountStr = kv["amount"];
    const traitIndexStr = kv["traitIndex"];
    const condition = kv["condition"];

    if (!stat || !isValidStat(stat)) {
      console.warn(`[BonusExtractor] Annotation has unknown stat="${stat ?? "(missing)"}": ${m[0]}`);
      continue;
    }

    const amount = amountStr !== undefined ? parseInt(amountStr, 10) : NaN;
    if (!isFinite(amount)) {
      console.warn(`[BonusExtractor] Annotation has invalid amount="${amountStr ?? "(missing)"}": ${m[0]}`);
      continue;
    }

    const traitIndex = traitIndexStr !== undefined ? parseInt(traitIndexStr, 10) : 0;
    if (traitIndex !== 0 && traitIndex !== 1) {
      console.warn(`[BonusExtractor] Annotation has invalid traitIndex="${traitIndexStr}": ${m[0]}`);
      continue;
    }

    const bonus: MechanicalBonus = {
      stat,
      amount,
      traitIndex: traitIndex as 0 | 1,
    };
    if (condition) bonus.condition = condition;
    results.push(bonus);
  }

  return results;
}

// ─── Merge logic ─────────────────────────────────────────────────────────────

/**
 * Merge regex-extracted bonuses with explicit annotation overrides.
 * For each (stat, traitIndex) pair, annotations win over regex results.
 *
 * @param fromRegex       Bonuses extracted by pattern matching.
 * @param fromAnnotations Bonuses extracted from explicit annotations.
 * @returns               Merged list with no duplicate (stat, traitIndex) pairs.
 */
export function mergeBonuses(
  fromRegex: MechanicalBonus[],
  fromAnnotations: MechanicalBonus[]
): MechanicalBonus[] {
  // Annotation keys that override regex results
  const annotationKeys = new Set(
    fromAnnotations.map((b) => `${b.stat}:${b.traitIndex}`)
  );

  const filtered = fromRegex.filter(
    (b) => !annotationKeys.has(`${b.stat}:${b.traitIndex}`)
  );

  return [...filtered, ...fromAnnotations];
}

// ─── Top-level extractor ─────────────────────────────────────────────────────

/**
 * Extract all mechanical bonuses from a card's full file content and trait texts.
 *
 * @param raw               Raw markdown file content (used for annotation scanning).
 * @param traitDescription  First trait description text.
 * @param secondTraitDescription  Second trait description (ancestries only; pass "" for communities).
 * @returns                 Merged MechanicalBonus array, or undefined if none found.
 */
export function extractMechanicalBonuses(
  raw: string,
  traitDescription: string,
  secondTraitDescription: string
): MechanicalBonus[] | undefined {
  const fromAnnotations = extractBonusAnnotations(raw);

  const fromRegex = [
    ...extractBonusesFromText(traitDescription, 0),
    ...extractBonusesFromText(secondTraitDescription, 1),
  ];

  const merged = mergeBonuses(fromRegex, fromAnnotations);
  return merged.length > 0 ? merged : undefined;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const VALID_STATS: ReadonlySet<string> = new Set([
  "armor",
  "hp",
  "stress",
  "evasion",
  "hope",
  "hopeMax",
]);

function isValidStat(s: string): s is MechanicalBonus["stat"] {
  return VALID_STATS.has(s);
}

/**
 * Parse a simple key=value string into a plain object.
 * Values wrapped in double quotes have their quotes stripped.
 * Example: `stat=armor amount=1 traitIndex=0 condition="at creation"`
 */
function parseKV(kvString: string): Record<string, string> {
  const result: Record<string, string> = {};
  // Matches: key=value or key="quoted value"
  const kvRe = /(\w+)=(?:"([^"]*)"|([\w.-]+))/g;
  let m: RegExpExecArray | null;
  while ((m = kvRe.exec(kvString)) !== null) {
    const key = m[1];
    const value = m[2] !== undefined ? m[2] : m[3];
    if (key && value !== undefined) {
      result[key] = value;
    }
  }
  return result;
}
