/**
 * src/hooks/useStatBreakdowns.ts
 *
 * Builds the tooltip breakdown lines for each of the 7 derived stats on the
 * Daggerheart character sheet:
 *
 *   1. Evasion
 *   2. Armor Score
 *   3. Major Damage Threshold
 *   4. Severe Damage Threshold
 *   5. Hit Points (max slots)
 *   6. Stress (max slots)
 *   7. Hope (max)
 *
 * All values are derived from:
 *   - activeCharacter (store)
 *   - SRD class / ancestry / community records (fetched via useGameData hooks,
 *     cached aggressively, re-used if already in TanStack Query cache)
 *   - ALL_ARMOR from srdEquipment.ts (static, zero cost)
 *
 * Returns a stable object of `TooltipLine[]` arrays, one per stat.
 * Each array is safe to pass directly to <StatTooltip lines={...} />.
 *
 * NOTE: This hook calls useClass, useAncestry, and useCommunity. All three
 * hooks are already called inside CharacterSheet / TrackersPanel — TanStack
 * Query deduplicates requests, so no extra network traffic is incurred.
 */

import { useClass, useAncestry, useCommunity } from "./useGameData";
import { useCharacterStore } from "@/store/characterStore";
import { ALL_ARMOR } from "@/lib/srdEquipment";
import type { TooltipLine } from "@/components/character/StatTooltip";

// ─── Evasion modifier from armor featureType (mirrors backend logic) ──────────

function armorEvasionMod(featureType: string | null | undefined): number {
  if (featureType === "Flexible")   return +1;
  if (featureType === "Heavy")      return -1;
  if (featureType === "Very Heavy") return -2;
  if (featureType === "Difficult")  return -1;
  return 0;
}

// ─── Helper: sum all mechanicalBonuses for a given stat ──────────────────────

function sumMechanicalBonus(
  bonuses: Array<{ stat: string; amount: number }> | undefined,
  stat: string
): number {
  if (!bonuses) return 0;
  return bonuses.filter((b) => b.stat === stat).reduce((acc, b) => acc + b.amount, 0);
}

// ─── Helper: sum mechanicalBonuses for a given stat, filtered by traitIndex ──

function sumMechanicalBonusByTrait(
  bonuses: Array<{ stat: string; amount: number; traitIndex: number }> | undefined,
  stat: string,
  traitIndex: 0 | 1
): number {
  if (!bonuses) return 0;
  return bonuses
    .filter((b) => b.stat === stat && b.traitIndex === traitIndex)
    .reduce((acc, b) => acc + b.amount, 0);
}

// ─── Helper: count level-up advancement choices by type ──────────────────────

function countAdvances(
  levelUpHistory: Record<number, Array<{ type: string }>> | undefined,
  type: string
): number {
  if (!levelUpHistory) return 0;
  let count = 0;
  for (const choices of Object.values(levelUpHistory)) {
    count += choices.filter((c) => c.type === type).length;
  }
  return count;
}

// ─── Helper: check if a domain card ID is in a loadout array ─────────────────
// Card IDs are stored as "Domain/cardId" — we do a case-insensitive suffix match.

function hasCard(loadout: string[] | undefined, cardId: string): boolean {
  if (!loadout) return false;
  const lower = cardId.toLowerCase();
  return loadout.some((id) => id.toLowerCase() === lower);
}

// ─── Proficiency from level (Tier 1=1, Tier 2=2, Tier 3=3, Tier 4=4) ────────

function proficiencyForLevel(level: number): number {
  return Math.floor((level - 1) / 4) + 1;
}

// ─── Main hook ────────────────────────────────────────────────────────────────

export interface StatBreakdowns {
  evasion:      TooltipLine[];
  armor:        TooltipLine[];
  majorThresh:  TooltipLine[];
  severeThresh: TooltipLine[];
  hp:           TooltipLine[];
  stress:       TooltipLine[];
  hope:         TooltipLine[];
}

export function useStatBreakdowns(): StatBreakdowns {
  const { activeCharacter } = useCharacterStore();

  // Fetch game data — these are cached; duplicate calls are free.
  const { data: classData }      = useClass(activeCharacter?.classId);
  const { data: ancestryData }   = useAncestry(activeCharacter?.ancestryId ?? undefined);
  // Mixed ancestry: fetch the bottom ancestry record when applicable.
  // When isMixedAncestry is false/undefined, mixedAncestryBottomId is null → useAncestry is disabled.
  const { data: bottomAncestryData } = useAncestry(
    activeCharacter?.isMixedAncestry ? (activeCharacter.mixedAncestryBottomId ?? undefined) : undefined
  );
  const { data: communityData }  = useCommunity(activeCharacter?.communityId ?? undefined);

  if (!activeCharacter) {
    return EMPTY_BREAKDOWNS;
  }

  const char = activeCharacter;
  const level = char.level ?? 1;
  const proficiency = char.proficiency ?? proficiencyForLevel(level);
  const loadout = char.domainLoadout ?? [];
  const vault   = char.domainVault   ?? [];
  const traitBonuses = char.traitBonuses ?? {};

  // ── Mixed ancestry helpers ────────────────────────────────────────────────
  // For mixed ancestry, we take traitIndex=0 bonuses from the top ancestry
  // and traitIndex=1 bonuses from the bottom ancestry. For single ancestry,
  // we sum all bonuses from the single ancestry record (backward-compatible).
  const isMixed = Boolean(char.isMixedAncestry);

  /**
   * Computes the combined ancestry mechanical bonus for a given stat.
   * Mixed ancestry: top ancestry traitIndex=0 + bottom ancestry traitIndex=1.
   * Single ancestry: all bonuses from the single ancestry.
   */
  function ancestryBonus(stat: string): number {
    if (isMixed) {
      return (
        sumMechanicalBonusByTrait(ancestryData?.mechanicalBonuses, stat, 0) +
        sumMechanicalBonusByTrait(bottomAncestryData?.mechanicalBonuses, stat, 1)
      );
    }
    return sumMechanicalBonus(ancestryData?.mechanicalBonuses, stat);
  }

  /** Label for ancestry bonus lines in tooltips. */
  function ancestryLabel(stat: string): string {
    if (!isMixed) return `Ancestry (${ancestryData?.name ?? "ancestry"})`;
    // Build label showing which ancestry/trait the bonus comes from
    const topBon = sumMechanicalBonusByTrait(ancestryData?.mechanicalBonuses, stat, 0);
    const botBon = sumMechanicalBonusByTrait(bottomAncestryData?.mechanicalBonuses, stat, 1);
    if (topBon !== 0 && botBon !== 0) {
      return `Ancestry (${ancestryData?.name ?? "top"} + ${bottomAncestryData?.name ?? "bottom"})`;
    }
    if (topBon !== 0) return `Ancestry (${ancestryData?.name ?? "top"})`;
    return `Ancestry (${bottomAncestryData?.name ?? "bottom"})`;
  }

  const activeArmor = char.activeArmorId
    ? ALL_ARMOR.find((a) => a.id === char.activeArmorId) ?? null
    : null;

  const levelHistory = char.levelUpHistory as Record<number, Array<{ type: string }>> | undefined;

  // ── Active subclass (for Guardian Stalwart detection) ──────────────────────
  const activeSubclass = classData?.subclasses?.find(
    (sc) => sc.subclassId === char.subclassId
  ) ?? null;
  const subclassName = activeSubclass?.name ?? "";
  const isStalwart   = subclassName.toLowerCase().includes("stalwart");
  const tierForLevel = level >= 8 ? 4 : level >= 5 ? 3 : level >= 2 ? 2 : 1;

  // ── 1. Evasion ──────────────────────────────────────────────────────────────
  //
  // The server-authoritative value is char.derivedStats.evasion.
  //
  // We CANNOT reliably forward-derive evasion by summing baseEvasion + advances
  // + armor mod + domain bonuses because of a backend quirk: the armor-swap
  // PATCH handler recomputes evasion as `baseEvasion + armorMod`, which silently
  // discards any evasion advances that were previously applied to the evasion
  // field but NOT to baseEvasion.
  //
  // To guarantee the tooltip always matches the displayed value, we show the
  // authoritative final value as "Effective evasion" and annotate it with what
  // the known components are. If the individual components don't add up (due to
  // the backend quirk above), we show a reconciliation line so the user isn't
  // confused by numbers that don't match.
  //
  // Known components:
  //   baseEvasion  (class + ancestry/community bonuses, baked in at creation)
  //   + armor evasion modifier
  //   + level-up "evasion" advances (+1 each)
  //   + domain card bonuses (Slippery, Untouchable)

  const storedBaseEvasion = char.derivedStats.baseEvasion ?? char.derivedStats.evasion;
  const evasionAdvances   = countAdvances(levelHistory, "evasion");
  const armorEvMod        = activeArmor ? armorEvasionMod(activeArmor.featureType) : 0;

  // Domain card evasion bonuses
  const agility = traitBonuses["agility"] ?? (char.stats?.agility ?? 0);
  const slipperyBonus = hasCard(loadout, "Creature/slippery")  ? agility              : 0;
  const untouchBonus  = hasCard(loadout, "Bone/untouchable")   ? Math.floor(agility / 2) : 0;

  // Sum of all known additive components on top of baseEvasion
  const knownEvasionTotal = storedBaseEvasion + evasionAdvances + armorEvMod + slipperyBonus + untouchBonus;
  const authoritative     = char.derivedStats.evasion;

  // Back-derive the "base" so the breakdown always sums to the authoritative value.
  // If there's no mismatch this equals storedBaseEvasion. If the backend lost
  // evasion advances during an armor swap, this absorbs the difference.
  const effectiveBase = authoritative - evasionAdvances - armorEvMod - slipperyBonus - untouchBonus;

  const evasionLines: TooltipLine[] = [
    { label: "Base evasion (class + ancestry/community)", value: String(effectiveBase) },
  ];
  if (evasionAdvances > 0) {
    evasionLines.push({ label: "Level-up advances", value: fmtDelta(evasionAdvances) });
  }
  if (activeArmor) {
    evasionLines.push({
      label: `Armor (${activeArmor.name})`,
      value: armorEvMod === 0 ? "±0" : fmtDelta(armorEvMod),
    });
  } else {
    evasionLines.push({ label: "Armor", value: "none equipped" });
  }
  if (slipperyBonus !== 0) {
    evasionLines.push({ label: "Slippery ★ (Creature, loadout)", value: fmtDelta(slipperyBonus) });
  }
  if (untouchBonus !== 0) {
    evasionLines.push({ label: "Untouchable (Bone, loadout)", value: fmtDelta(untouchBonus) });
  }
  evasionLines.push({ label: "= Evasion", value: String(authoritative), isTotal: true });

  // If evasion advances are in levelUpHistory but aren't reflected in the stored
  // evasion value (backend armor-swap bug), add a warning note.
  if (knownEvasionTotal !== authoritative && evasionAdvances > 0) {
    evasionLines.push({
      label: `⚠ ${evasionAdvances} evasion advance(s) may need re-apply`,
      value: "",
    });
  }

  // ── 2. Armor Score ──────────────────────────────────────────────────────────
  //
  // Formula (SRD p.29):
  //   armor.baseArmorScore
  //   + ancestry mechanical bonus (armor)
  //   + community mechanical bonus (armor)
  //   ─────────────────────────────────────────────────────────────────
  //   = derivedStats.armor  (server-authoritative)

  const ancestryArmorBonus  = ancestryBonus("armor");
  const communityArmorBonus = sumMechanicalBonus(communityData?.mechanicalBonuses, "armor");

  const armorLines: TooltipLine[] = [];
  if (activeArmor) {
    armorLines.push({ label: `${activeArmor.name} base score`, value: String(activeArmor.baseArmorScore) });
  } else {
    armorLines.push({ label: "No armor equipped", value: "0" });
  }
  if (ancestryArmorBonus !== 0) {
    armorLines.push({ label: ancestryLabel("armor"), value: fmtDelta(ancestryArmorBonus) });
  }
  if (communityArmorBonus !== 0) {
    armorLines.push({ label: `Community (${communityData?.name ?? "community"})`, value: fmtDelta(communityArmorBonus) });
  }
  armorLines.push({ label: "= Armor Score", value: String(char.derivedStats.armor), isTotal: true });

  // ── 3 & 4. Damage Thresholds ────────────────────────────────────────────────
  //
  // Formula (SRD p.20, 22):
  //   armorBase + level (automatic per-level +1)
  //   + Guardian Stalwart subclass bonuses
  //   + domain card bonuses:
  //       "Blade/fortified-armor" → +2 to both (while armored + in loadout)
  //       "Valor/rise-up"         → +Proficiency to Severe (loadout)
  //       "Blade/vitality"        → +2 permanent (vault, already baked in)
  //   ─────────────────────────────────────────────────────────────────
  //   = damageThresholds.major / .severe  (server-authoritative)

  // Guardian Stalwart bonuses (subclass tier-based):
  //   Foundation "Unwavering":    +1
  //   Specialization "Unrelenting": +2
  //   Mastery "Undaunted":        +3
  let stalwartThresholdBonus = 0;
  if (isStalwart) {
    if (tierForLevel >= 1) stalwartThresholdBonus += 1; // Foundation: Unwavering
    if (tierForLevel >= 2) stalwartThresholdBonus += 2; // Specialization: Unrelenting
    if (tierForLevel >= 3) stalwartThresholdBonus += 3; // Mastery: Undaunted
  }

  // Fortified Armor (Blade domain, loadout): +2 to both (while wearing armor)
  const fortifiedBonus = (hasCard(loadout, "Blade/fortified-armor") && activeArmor) ? 2 : 0;

  // Vitality (Blade domain, vault): permanent +2 — baked into the server value.
  // We show it only if the card is in vault.
  const vitalityInVault = hasCard(vault, "Blade/vitality");

  // Rise Up (Valor, loadout): +Proficiency to Severe only
  const riseUpBonus = hasCard(loadout, "Valor/rise-up") ? proficiency : 0;

  // Splendor-Touched (Valor, loadout): +3 to Severe when ≥4 Splendor cards
  const splendorCards   = loadout.filter((id) => id.toLowerCase().startsWith("splendor/")).length;
  const splendorTouched = (hasCard(loadout, "Splendor/splendor-touched") && splendorCards >= 4) ? 3 : 0;

  // Blade-Touched (Blade, loadout): +4 to Severe when ≥4 Blade cards
  const bladeCards   = loadout.filter((id) => id.toLowerCase().startsWith("blade/")).length;
  const bladeTouched = (hasCard(loadout, "Blade/blade-touched") && bladeCards >= 4) ? 4 : 0;

  const majorBase  = activeArmor ? activeArmor.baseMajorThreshold  : (char.damageThresholds.major  - level);
  const severeBase = activeArmor ? activeArmor.baseSevereThreshold : (char.damageThresholds.severe - level);

  const majorLines: TooltipLine[] = [
    { label: activeArmor ? `${activeArmor.name} base` : "Armor base (no armor)", value: String(majorBase) },
    { label: "Character level",  value: fmtDelta(level) },
  ];
  if (stalwartThresholdBonus > 0) {
    majorLines.push({ label: `${activeSubclass?.name ?? "Stalwart"} (subclass)`, value: fmtDelta(stalwartThresholdBonus) });
  }
  if (fortifiedBonus > 0) {
    majorLines.push({ label: "Fortified Armor (Blade, loadout)", value: fmtDelta(fortifiedBonus) });
  }
  if (vitalityInVault) {
    majorLines.push({ label: "Vitality (Blade, vault — permanent)", value: "+2" });
  }
  majorLines.push({ label: "= Major Threshold", value: String(char.damageThresholds.major), isTotal: true });

  const severeLines: TooltipLine[] = [
    { label: activeArmor ? `${activeArmor.name} base` : "Armor base (no armor)", value: String(severeBase) },
    { label: "Character level",   value: fmtDelta(level) },
  ];
  if (stalwartThresholdBonus > 0) {
    severeLines.push({ label: `${activeSubclass?.name ?? "Stalwart"} (subclass)`, value: fmtDelta(stalwartThresholdBonus) });
  }
  if (fortifiedBonus > 0) {
    severeLines.push({ label: "Fortified Armor (Blade, loadout)", value: fmtDelta(fortifiedBonus) });
  }
  if (vitalityInVault) {
    severeLines.push({ label: "Vitality (Blade, vault — permanent)", value: "+2" });
  }
  if (riseUpBonus > 0) {
    severeLines.push({ label: `Rise Up (Valor, loadout) — Prof. ${proficiency}`, value: fmtDelta(riseUpBonus) });
  }
  if (splendorTouched > 0) {
    severeLines.push({ label: "Splendor-Touched (≥4 Splendor, loadout)", value: fmtDelta(splendorTouched) });
  }
  if (bladeTouched > 0) {
    severeLines.push({ label: "Blade-Touched (≥4 Blade, loadout)", value: fmtDelta(bladeTouched) });
  }
  severeLines.push({ label: "= Severe Threshold", value: String(char.damageThresholds.severe), isTotal: true });

  // ── 5. Hit Points (max slots) ───────────────────────────────────────────────
  //
  // Formula (server-authoritative breakdown):
  //   classStartingHp  (derived: hp.max - advances - ancestry/community bonuses - vitality)
  //   + level-up "hp-slot" advances (+1 each)
  //   + ancestry mechanical bonus (hp)
  //   + community mechanical bonus (hp)
  //   + "Blade/vitality" vault choice: +1 HP slot (if in vault)
  //   [hard cap: 12]
  //   ─────────────────────────────────────────────────────────────────
  //   = trackers.hp.max  (server-authoritative)
  //
  // NOTE: We do NOT trust classData?.startingHitPoints because the SRD record
  // may not match what was stored when the character was created (class data can
  // change). Instead we back-derive the class base from the authoritative total.

  const ancestryHpBonus  = ancestryBonus("hp");
  const communityHpBonus = sumMechanicalBonus(communityData?.mechanicalBonuses, "hp");
  const hpSlotAdvances   = countAdvances(levelHistory, "hp-slot");
  // Back-derive class base so the breakdown always sums to the authoritative total.
  const classStartingHp = char.trackers.hp.max
    - hpSlotAdvances
    - ancestryHpBonus
    - communityHpBonus
    - (vitalityInVault ? 1 : 0);

  const hpLines: TooltipLine[] = [
    { label: `Class starting HP (${classData?.name ?? "class"})`, value: String(classStartingHp) },
  ];
  if (hpSlotAdvances > 0) {
    hpLines.push({ label: "Level-up HP advances", value: fmtDelta(hpSlotAdvances) });
  }
  if (ancestryHpBonus !== 0) {
    hpLines.push({ label: ancestryLabel("hp"), value: fmtDelta(ancestryHpBonus) });
  }
  if (communityHpBonus !== 0) {
    hpLines.push({ label: `Community (${communityData?.name ?? "community"})`, value: fmtDelta(communityHpBonus) });
  }
  if (vitalityInVault) {
    hpLines.push({ label: "Vitality (Blade, vault — permanent)", value: "+1" });
  }
  hpLines.push({ label: "= Max Hit Points", value: String(char.trackers.hp.max), isTotal: true });
  hpLines.push({ label: "Hard cap", value: "12" });

  // ── 6. Stress (max slots) ───────────────────────────────────────────────────
  //
  // Formula (SRD p.22):
  //   6 (base for all classes)
  //   + level-up "stress-slot" advances (+1 each)
  //   + ancestry mechanical bonus (stress)
  //   + community mechanical bonus (stress)
  //   [hard cap: 12]
  //   ─────────────────────────────────────────────────────────────────
  //   = trackers.stress.max  (server-authoritative)

  const ancestryStressBonus  = ancestryBonus("stress");
  const communityStressBonus = sumMechanicalBonus(communityData?.mechanicalBonuses, "stress");
  const stressSlotAdvances   = countAdvances(levelHistory, "stress-slot");

  const stressLines: TooltipLine[] = [
    { label: "Base Stress (all classes)", value: "6" },
  ];
  if (stressSlotAdvances > 0) {
    stressLines.push({ label: "Level-up Stress advances", value: fmtDelta(stressSlotAdvances) });
  }
  if (ancestryStressBonus !== 0) {
    stressLines.push({ label: ancestryLabel("stress"), value: fmtDelta(ancestryStressBonus) });
  }
  if (communityStressBonus !== 0) {
    stressLines.push({ label: `Community (${communityData?.name ?? "community"})`, value: fmtDelta(communityStressBonus) });
  }
  stressLines.push({ label: "= Max Stress", value: String(char.trackers.stress.max), isTotal: true });
  stressLines.push({ label: "Hard cap", value: "12" });

  // ── 7. Hope (max) ───────────────────────────────────────────────────────────
  //
  // Formula (SRD p.20):
  //   6 (base max Hope for all characters)
  //   + ancestry mechanical bonus (hopeMax)
  //   + community mechanical bonus (hopeMax)
  //   − scars (each scar reduces max Hope by 1)
  //   ─────────────────────────────────────────────────────────────────
  //   = hopeMax  (server-authoritative)

  const hopeMax            = char.hopeMax ?? 6;
  const ancestryHopeBonus  = ancestryBonus("hopeMax");
  const communityHopeBonus = sumMechanicalBonus(communityData?.mechanicalBonuses, "hopeMax");
  // Scar reduction = (6 + bonuses) − actual hopeMax
  const expectedHopeMax = 6 + ancestryHopeBonus + communityHopeBonus;
  const scarReduction   = expectedHopeMax - hopeMax;

  const hopeLines: TooltipLine[] = [
    { label: "Base max Hope (all characters)", value: "6" },
  ];
  if (ancestryHopeBonus !== 0) {
    hopeLines.push({ label: ancestryLabel("hopeMax"), value: fmtDelta(ancestryHopeBonus) });
  }
  if (communityHopeBonus !== 0) {
    hopeLines.push({ label: `Community (${communityData?.name ?? "community"})`, value: fmtDelta(communityHopeBonus) });
  }
  if (scarReduction > 0) {
    hopeLines.push({ label: "Scars (death table)", value: fmtDelta(-scarReduction) });
  }
  hopeLines.push({ label: "= Max Hope", value: String(hopeMax), isTotal: true });

  return {
    evasion:      evasionLines,
    armor:        armorLines,
    majorThresh:  majorLines,
    severeThresh: severeLines,
    hp:           hpLines,
    stress:       stressLines,
    hope:         hopeLines,
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDelta(n: number): string {
  return n >= 0 ? `+${n}` : String(n);
}

const EMPTY_BREAKDOWNS: StatBreakdowns = {
  evasion:      [],
  armor:        [],
  majorThresh:  [],
  severeThresh: [],
  hp:           [],
  stress:       [],
  hope:         [],
};
