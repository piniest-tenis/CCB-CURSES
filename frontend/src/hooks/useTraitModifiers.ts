/**
 * src/hooks/useTraitModifiers.ts
 *
 * Computes trait modifiers from equipped weapons and armor by parsing the
 * `feature` text on SRDWeapon / SRDArmor records.
 *
 * Known trait-affecting features (SRD):
 *
 *   Weapons:
 *     "Cumbersome: −1 to Finesse"       (Halberd, Longbow)
 *
 *   Armor:
 *     "Very Heavy: −2 to Evasion; −1 to Agility"   (Full Plate, all tiers)
 *     "Gilded: +1 to Presence"                       (Bellamoi Fine Armor, T3)
 *     "Difficult: −1 to all character traits and Evasion"  (Savior Chainmail, T4)
 *
 * Per SRD line 2694: all effects beside conditions and advantage/disadvantage
 * can stack. No numeric cap on trait values is stated.
 *
 * Returns:
 *   - modifiers:  Record<CoreStatName, TraitModifierEntry[]>  — per-trait list of sources
 *   - totals:     Record<CoreStatName, number>                — net modifier per trait
 *   - effective:  Record<CoreStatName, number>                — base + total modifier
 */

import { useMemo } from "react";
import type { CoreStatName } from "@shared/types";
import { useCharacterStore } from "@/store/characterStore";
import { ALL_TIER1_WEAPONS, ALL_ARMOR } from "@/lib/srdEquipment";
import type { SRDWeapon, SRDArmor } from "@/lib/srdEquipment";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TraitModifierEntry {
  /** Human-readable source, e.g. "Longbow (Cumbersome)" or "Full Plate Armor (Very Heavy)" */
  source: string;
  /** Which trait is affected */
  trait: CoreStatName;
  /** Numeric modifier, e.g. -1, +1 */
  value: number;
}

export interface TraitModifiers {
  /** Per-trait list of modifier sources */
  modifiers: Record<CoreStatName, TraitModifierEntry[]>;
  /** Net modifier per trait (sum of all entries) */
  totals: Record<CoreStatName, number>;
  /** Effective trait value: base stat + total modifier */
  effective: Record<CoreStatName, number>;
}

// ─── All six core trait names ─────────────────────────────────────────────────

const ALL_TRAITS: CoreStatName[] = [
  "agility", "strength", "finesse", "instinct", "presence", "knowledge",
];

// ─── Feature-text parsers ─────────────────────────────────────────────────────

/**
 * Parse weapon feature text for trait modifiers.
 *
 * Pattern: "FeatureName: [−-+]N to TraitName"
 * Example: "Cumbersome: −1 to Finesse"
 *
 * We only extract modifiers that target one of the 6 core traits.
 * Modifiers to Evasion, Armor Score, attack rolls, etc. are handled elsewhere.
 */
function parseWeaponTraitModifiers(weapon: SRDWeapon): TraitModifierEntry[] {
  if (!weapon.feature) return [];

  const entries: TraitModifierEntry[] = [];

  // Match patterns like "Label: +/-N to TraitName"
  // The minus sign may be an en-dash (−, U+2212) or a regular hyphen (-)
  const pattern = /([A-Za-z][A-Za-z\s]*):\s*([+\u2212-]?\d+)\s+to\s+(\w+)/gi;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(weapon.feature)) !== null) {
    const featureLabel = match[1].trim();
    const rawSign = match[2].replace("\u2212", "-");  // Normalise en-dash
    const value = parseInt(rawSign, 10);
    const targetRaw = match[3].toLowerCase();

    // Only capture if it targets a core trait
    if (ALL_TRAITS.includes(targetRaw as CoreStatName) && !isNaN(value)) {
      entries.push({
        source: `${weapon.name} (${featureLabel})`,
        trait: targetRaw as CoreStatName,
        value,
      });
    }
  }

  return entries;
}

/**
 * Parse armor feature text for trait modifiers.
 *
 * Known patterns:
 *   "Very Heavy: −2 to Evasion; −1 to Agility"   → -1 Agility (evasion handled elsewhere)
 *   "Gilded: +1 to Presence"                       → +1 Presence
 *   "Difficult: −1 to all character traits and Evasion" → -1 to all 6 traits
 */
function parseArmorTraitModifiers(armor: SRDArmor): TraitModifierEntry[] {
  if (!armor.feature) return [];

  const entries: TraitModifierEntry[] = [];
  const feature = armor.feature;

  // Special case: "Difficult: −1 to all character traits"
  if (/all character traits/i.test(feature)) {
    // Extract the numeric value
    const allMatch = feature.match(/([+\u2212-]?\d+)\s+to\s+all character traits/i);
    if (allMatch) {
      const rawSign = allMatch[1].replace("\u2212", "-");
      const value = parseInt(rawSign, 10);
      if (!isNaN(value)) {
        for (const trait of ALL_TRAITS) {
          entries.push({
            source: `${armor.name} (${armor.featureType ?? "Difficult"})`,
            trait,
            value,
          });
        }
      }
    }
    return entries;
  }

  // General pattern: "Label: +/-N to TraitName" (may appear multiple times,
  // separated by semicolons)
  const pattern = /([+\u2212-]?\d+)\s+to\s+(\w+)/gi;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(feature)) !== null) {
    const rawSign = match[1].replace("\u2212", "-");
    const value = parseInt(rawSign, 10);
    const targetRaw = match[2].toLowerCase();

    // Only capture core traits (skip "evasion", "armor", etc.)
    if (ALL_TRAITS.includes(targetRaw as CoreStatName) && !isNaN(value)) {
      entries.push({
        source: `${armor.name} (${armor.featureType ?? "armor"})`,
        trait: targetRaw as CoreStatName,
        value,
      });
    }
  }

  return entries;
}

// ─── Empty result (stable reference) ──────────────────────────────────────────

function emptyModifiers(): Record<CoreStatName, TraitModifierEntry[]> {
  return {
    agility: [], strength: [], finesse: [],
    instinct: [], presence: [], knowledge: [],
  };
}

function emptyTotals(): Record<CoreStatName, number> {
  return {
    agility: 0, strength: 0, finesse: 0,
    instinct: 0, presence: 0, knowledge: 0,
  };
}

const EMPTY_RESULT: TraitModifiers = {
  modifiers: emptyModifiers(),
  totals: emptyTotals(),
  effective: emptyTotals(),
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useTraitModifiers(): TraitModifiers {
  const { activeCharacter } = useCharacterStore();

  return useMemo(() => {
    if (!activeCharacter) return EMPTY_RESULT;

    const entries: TraitModifierEntry[] = [];

    // ── Equipped weapons ────────────────────────────────────────────────────
    const primaryId   = activeCharacter.weapons?.primary?.weaponId;
    const secondaryId = activeCharacter.weapons?.secondary?.weaponId;

    if (primaryId) {
      const weapon = ALL_TIER1_WEAPONS.find((w) => w.id === primaryId);
      if (weapon) entries.push(...parseWeaponTraitModifiers(weapon));
    }
    if (secondaryId) {
      const weapon = ALL_TIER1_WEAPONS.find((w) => w.id === secondaryId);
      if (weapon) entries.push(...parseWeaponTraitModifiers(weapon));
    }

    // ── Equipped armor ──────────────────────────────────────────────────────
    if (activeCharacter.activeArmorId) {
      const armor = ALL_ARMOR.find((a) => a.id === activeCharacter.activeArmorId);
      if (armor) entries.push(...parseArmorTraitModifiers(armor));
    }

    // ── Aggregate ───────────────────────────────────────────────────────────
    const modifiers = emptyModifiers();
    const totals = emptyTotals();

    for (const entry of entries) {
      modifiers[entry.trait].push(entry);
      totals[entry.trait] += entry.value;
    }

    // ── Effective values ────────────────────────────────────────────────────
    const stats = activeCharacter.stats;
    const effective: Record<CoreStatName, number> = {
      agility:   stats.agility   + totals.agility,
      strength:  stats.strength  + totals.strength,
      finesse:   stats.finesse   + totals.finesse,
      instinct:  stats.instinct  + totals.instinct,
      presence:  stats.presence  + totals.presence,
      knowledge: stats.knowledge + totals.knowledge,
    };

    return { modifiers, totals, effective };
  }, [activeCharacter]);
}

// ─── Standalone utility (for PublicSheetClient and other non-hook contexts) ──

export function computeTraitModifiers(
  weapons: { primary: { weaponId: string | null }; secondary: { weaponId: string | null } },
  activeArmorId: string | null,
): { modifiers: Record<CoreStatName, TraitModifierEntry[]>; totals: Record<CoreStatName, number> } {
  const entries: TraitModifierEntry[] = [];

  if (weapons.primary.weaponId) {
    const weapon = ALL_TIER1_WEAPONS.find((w) => w.id === weapons.primary.weaponId);
    if (weapon) entries.push(...parseWeaponTraitModifiers(weapon));
  }
  if (weapons.secondary.weaponId) {
    const weapon = ALL_TIER1_WEAPONS.find((w) => w.id === weapons.secondary.weaponId);
    if (weapon) entries.push(...parseWeaponTraitModifiers(weapon));
  }
  if (activeArmorId) {
    const armor = ALL_ARMOR.find((a) => a.id === activeArmorId);
    if (armor) entries.push(...parseArmorTraitModifiers(armor));
  }

  const modifiers = emptyModifiers();
  const totals = emptyTotals();

  for (const entry of entries) {
    modifiers[entry.trait].push(entry);
    totals[entry.trait] += entry.value;
  }

  return { modifiers, totals };
}
