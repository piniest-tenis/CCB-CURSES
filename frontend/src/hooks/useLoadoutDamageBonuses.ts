/**
 * src/hooks/useLoadoutDamageBonuses.ts
 *
 * Returns RollBonus[] entries derived from domain cards in the character's
 * active loadout that grant extra damage dice at a resource cost.
 *
 * Supported SRD patterns (case-insensitive):
 *   "spend a Hope to deal an additional dX … damage … using your Proficiency"
 *     → cost "1 Hope", proficiency × dX extra damage dice
 *   "mark a Stress to do an additional dX damage using your Proficiency"
 *     → cost "1 Stress", proficiency × dX extra damage dice
 *
 * Because hooks cannot be called inside a loop we pre-declare five fixed
 * useDomainCard calls (the loadout max is 5 cards).
 */

import { useMemo } from "react";
import { useDomainCard } from "@/hooks/useGameData";
import type { DomainCard } from "@shared/types";
import type { RollBonus, DieSpec, DieSize } from "@/types/dice";

// ─── Pattern helpers ──────────────────────────────────────────────────────────

/**
 * Checks a single text string for a "spend [resource] → extra dX damage × Proficiency" pattern.
 * Returns a RollBonus or null.
 */
function parseDamageBonusFromText(
  label: string,
  text: string,
  proficiency: number,
): RollBonus | null {
  // Pattern: "spend a Hope" / "spend a Stress" / "spend 1 Hope" etc.
  //          followed (anywhere later) by "additional dX … damage … (using your Proficiency)"
  const spendMatch = text.match(
    /spend\s+(?:a\s+)?(\d+\s+)?(Hope|Stress|Fear)\s+to\s+(?:deal|do)\s+an?\s+additional\s+(?:\d+)?(d(?:4|6|8|10|12|20))\s+\w*\s*damage.*?(?:using\s+your\s+Proficiency)?/i,
  );
  if (spendMatch) {
    const resource  = spendMatch[2];
    const dieStr    = spendMatch[3].toLowerCase() as DieSize;
    const costNum   = spendMatch[1] ? parseInt(spendMatch[1].trim(), 10) : 1;
    const extraDice: DieSpec[] = Array.from({ length: proficiency }, () => ({
      size:  dieStr,
      role:  "damage" as const,
      label: label,
    }));
    return {
      label,
      value:    0,
      extraDice,
      cost:     `${costNum} ${resource}`,
    };
  }

  // Pattern: "mark a Stress to do an additional dX damage using your Proficiency"
  const markMatch = text.match(
    /mark\s+(?:a\s+)?(\d+\s+)?(Stress|Hit\s+Point)\s+to\s+(?:deal|do)\s+an?\s+additional\s+(?:\d+)?(d(?:4|6|8|10|12|20))\s+\w*\s*damage.*?(?:using\s+your\s+Proficiency)?/i,
  );
  if (markMatch) {
    const resource  = markMatch[2].replace(/\s+/, " ");
    const dieStr    = markMatch[3].toLowerCase() as DieSize;
    const costNum   = markMatch[1] ? parseInt(markMatch[1].trim(), 10) : 1;
    const costLabel = resource.toLowerCase().startsWith("hit") ? "HP" : resource;
    const extraDice: DieSpec[] = Array.from({ length: proficiency }, () => ({
      size:  dieStr,
      role:  "damage" as const,
      label: label,
    }));
    return {
      label,
      value:    0,
      extraDice,
      cost:     `${costNum} ${costLabel}`,
    };
  }

  return null;
}

/**
 * Extract all RollBonus entries from a single DomainCard.
 */
function cardDamageBonuses(card: DomainCard, proficiency: number): RollBonus[] {
  const bonuses: RollBonus[] = [];

  if (card.isGrimoire && card.grimoire.length > 0) {
    for (const ability of card.grimoire) {
      const bonus = parseDamageBonusFromText(
        `${card.name}: ${ability.name}`,
        ability.description,
        proficiency,
      );
      if (bonus) bonuses.push(bonus);
    }
  } else {
    const bonus = parseDamageBonusFromText(card.name, card.description, proficiency);
    if (bonus) bonuses.push(bonus);
  }

  return bonuses;
}

// ─── parseCardRef ─────────────────────────────────────────────────────────────

function parseCardRef(cardId: string): { domain: string | undefined; id: string } {
  const parts = cardId.includes("/") ? cardId.split("/") : null;
  return { domain: parts?.[0], id: parts?.[1] ?? cardId };
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Returns RollBonus[] entries for all loadout cards that grant conditional
 * extra damage dice. Safe to call even with an empty loadout.
 *
 * @param loadout     The character's domainLoadout (max 5 string card IDs)
 * @param proficiency The character's current proficiency scalar
 */
export function useLoadoutDamageBonuses(
  loadout:     string[],
  proficiency: number,
): RollBonus[] {
  // Pre-declare exactly 5 fixed hooks — never call hooks conditionally.
  const ref0 = parseCardRef(loadout[0] ?? "");
  const ref1 = parseCardRef(loadout[1] ?? "");
  const ref2 = parseCardRef(loadout[2] ?? "");
  const ref3 = parseCardRef(loadout[3] ?? "");
  const ref4 = parseCardRef(loadout[4] ?? "");

  const { data: card0 } = useDomainCard(ref0.domain, ref0.id || undefined);
  const { data: card1 } = useDomainCard(ref1.domain, ref1.id || undefined);
  const { data: card2 } = useDomainCard(ref2.domain, ref2.id || undefined);
  const { data: card3 } = useDomainCard(ref3.domain, ref3.id || undefined);
  const { data: card4 } = useDomainCard(ref4.domain, ref4.id || undefined);

  return useMemo(() => {
    const cards: (DomainCard | undefined)[] = [card0, card1, card2, card3, card4];
    const bonuses: RollBonus[] = [];
    for (const card of cards) {
      if (card) {
        bonuses.push(...cardDamageBonuses(card, proficiency));
      }
    }
    return bonuses;
  }, [card0, card1, card2, card3, card4, proficiency]);
}
