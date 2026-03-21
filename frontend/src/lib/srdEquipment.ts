/**
 * src/lib/srdEquipment.ts
 *
 * Static SRD equipment data for Tier 1 weapons and all armor tiers.
 * Source: Daggerheart SRD pages 23, 27, and 29.
 *
 * Used in the character builder for weapon and armor selection steps.
 * This data is immutable SRD content — do not modify without cross-referencing
 * the canonical SRD document.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type WeaponTrait =
  | "Agility"
  | "Strength"
  | "Finesse"
  | "Instinct"
  | "Presence"
  | "Knowledge";

export type WeaponCategory = "Primary" | "Secondary";
export type WeaponDamageType = "Physical" | "Magic";
export type WeaponBurden = "One-Handed" | "Two-Handed";

export interface SRDWeapon {
  id: string;
  name: string;
  tier: 1;
  category: WeaponCategory;
  trait: WeaponTrait;
  burden: WeaponBurden;
  range: string;
  damageDie: string;
  damageType: WeaponDamageType;
  feature: string | null;
  description: string | null;
  srdPage: 23 | 27;
}

export interface SRDArmor {
  id: string;
  name: string;
  tier: 1 | 2 | 3 | 4;
  baseMajorThreshold: number;
  baseSevereThreshold: number;
  baseArmorScore: number;
  feature: string | null;
  featureType: "Flexible" | "Heavy" | "Very Heavy" | null | string;
  description: string | null;
  srdPage: 29;
}

export interface SubclassSuggestedWeapons {
  /** Two weapon IDs from SRDWeapon.id */
  primaryWeaponIds: [string, string];
}

// ─── Tier 1 Primary Physical Weapons (SRD page 23) ───────────────────────────

export const TIER1_PRIMARY_PHYSICAL: SRDWeapon[] = [
  {
    id: "broadsword",
    name: "Broadsword",
    tier: 1,
    category: "Primary",
    trait: "Agility",
    burden: "One-Handed",
    range: "Melee",
    damageDie: "d8",
    damageType: "Physical",
    feature: "Reliable: +1 to attack rolls",
    description: null,
    srdPage: 23,
  },
  {
    id: "longsword",
    name: "Longsword",
    tier: 1,
    category: "Primary",
    trait: "Agility",
    burden: "Two-Handed",
    range: "Melee",
    damageDie: "d10+3",
    damageType: "Physical",
    feature: null,
    description: null,
    srdPage: 23,
  },
  {
    id: "battleaxe",
    name: "Battleaxe",
    tier: 1,
    category: "Primary",
    trait: "Strength",
    burden: "Two-Handed",
    range: "Melee",
    damageDie: "d10+3",
    damageType: "Physical",
    feature: null,
    description: null,
    srdPage: 23,
  },
  {
    id: "greatsword",
    name: "Greatsword",
    tier: 1,
    category: "Primary",
    trait: "Strength",
    burden: "Two-Handed",
    range: "Melee",
    damageDie: "d10+3",
    damageType: "Physical",
    feature: "Massive: −1 to Evasion; on a successful attack, roll an additional damage die and discard the lowest result",
    description: null,
    srdPage: 23,
  },
  {
    id: "mace",
    name: "Mace",
    tier: 1,
    category: "Primary",
    trait: "Strength",
    burden: "One-Handed",
    range: "Melee",
    damageDie: "d8+1",
    damageType: "Physical",
    feature: null,
    description: null,
    srdPage: 23,
  },
  {
    id: "warhammer",
    name: "Warhammer",
    tier: 1,
    category: "Primary",
    trait: "Strength",
    burden: "Two-Handed",
    range: "Melee",
    damageDie: "d12+3",
    damageType: "Physical",
    feature: "Heavy: −1 to Evasion",
    description: null,
    srdPage: 23,
  },
  {
    id: "dagger",
    name: "Dagger",
    tier: 1,
    category: "Primary",
    trait: "Finesse",
    burden: "One-Handed",
    range: "Melee",
    damageDie: "d8+1",
    damageType: "Physical",
    feature: null,
    description: null,
    srdPage: 23,
  },
  {
    id: "quarterstaff",
    name: "Quarterstaff",
    tier: 1,
    category: "Primary",
    trait: "Instinct",
    burden: "Two-Handed",
    range: "Melee",
    damageDie: "d10+3",
    damageType: "Physical",
    feature: null,
    description: null,
    srdPage: 23,
  },
  {
    id: "cutlass",
    name: "Cutlass",
    tier: 1,
    category: "Primary",
    trait: "Presence",
    burden: "One-Handed",
    range: "Melee",
    damageDie: "d8+1",
    damageType: "Physical",
    feature: null,
    description: null,
    srdPage: 23,
  },
  {
    id: "rapier",
    name: "Rapier",
    tier: 1,
    category: "Primary",
    trait: "Presence",
    burden: "One-Handed",
    range: "Melee",
    damageDie: "d8",
    damageType: "Physical",
    feature: "Quick: When you make an attack, you can mark a Stress to target another creature within range",
    description: null,
    srdPage: 23,
  },
  {
    id: "halberd",
    name: "Halberd",
    tier: 1,
    category: "Primary",
    trait: "Strength",
    burden: "Two-Handed",
    range: "Very Close",
    damageDie: "d10+2",
    damageType: "Physical",
    feature: "Cumbersome: −1 to Finesse",
    description: null,
    srdPage: 23,
  },
  {
    id: "spear",
    name: "Spear",
    tier: 1,
    category: "Primary",
    trait: "Finesse",
    burden: "Two-Handed",
    range: "Very Close",
    damageDie: "d8+3",
    damageType: "Physical",
    feature: null,
    description: null,
    srdPage: 23,
  },
  {
    id: "shortbow",
    name: "Shortbow",
    tier: 1,
    category: "Primary",
    trait: "Agility",
    burden: "Two-Handed",
    range: "Far",
    damageDie: "d6+3",
    damageType: "Physical",
    feature: null,
    description: null,
    srdPage: 23,
  },
  {
    id: "crossbow",
    name: "Crossbow",
    tier: 1,
    category: "Primary",
    trait: "Finesse",
    burden: "One-Handed",
    range: "Far",
    damageDie: "d6+1",
    damageType: "Physical",
    feature: null,
    description: null,
    srdPage: 23,
  },
  {
    id: "longbow",
    name: "Longbow",
    tier: 1,
    category: "Primary",
    trait: "Agility",
    burden: "Two-Handed",
    range: "Very Far",
    damageDie: "d8+3",
    damageType: "Physical",
    feature: "Cumbersome: −1 to Finesse",
    description: null,
    srdPage: 23,
  },
];

// ─── Tier 1 Primary Magic Weapons (SRD page 23) ───────────────────────────────

export const TIER1_PRIMARY_MAGIC: SRDWeapon[] = [
  {
    id: "arcane-gauntlets",
    name: "Arcane Gauntlets",
    tier: 1,
    category: "Primary",
    trait: "Strength",
    burden: "Two-Handed",
    range: "Melee",
    damageDie: "d10+3",
    damageType: "Magic",
    feature: null,
    description: "Requires a Spellcast trait.",
    srdPage: 23,
  },
  {
    id: "hallowed-axe",
    name: "Hallowed Axe",
    tier: 1,
    category: "Primary",
    trait: "Strength",
    burden: "One-Handed",
    range: "Melee",
    damageDie: "d8+1",
    damageType: "Magic",
    feature: null,
    description: "Requires a Spellcast trait.",
    srdPage: 23,
  },
  {
    id: "glowing-rings",
    name: "Glowing Rings",
    tier: 1,
    category: "Primary",
    trait: "Agility",
    burden: "Two-Handed",
    range: "Very Close",
    damageDie: "d10+2",
    damageType: "Magic",
    feature: null,
    description: "Requires a Spellcast trait.",
    srdPage: 23,
  },
  {
    id: "hand-runes",
    name: "Hand Runes",
    tier: 1,
    category: "Primary",
    trait: "Instinct",
    burden: "One-Handed",
    range: "Very Close",
    damageDie: "d10",
    damageType: "Magic",
    feature: null,
    description: "Requires a Spellcast trait.",
    srdPage: 23,
  },
  {
    id: "returning-blade",
    name: "Returning Blade",
    tier: 1,
    category: "Primary",
    trait: "Finesse",
    burden: "One-Handed",
    range: "Close",
    damageDie: "d8",
    damageType: "Magic",
    feature: "Returning: When this weapon is thrown within its range, it appears in your hand immediately after the attack",
    description: "Requires a Spellcast trait.",
    srdPage: 23,
  },
  {
    id: "shortstaff",
    name: "Shortstaff",
    tier: 1,
    category: "Primary",
    trait: "Instinct",
    burden: "One-Handed",
    range: "Close",
    damageDie: "d8+1",
    damageType: "Magic",
    feature: null,
    description: "Requires a Spellcast trait.",
    srdPage: 23,
  },
  {
    id: "dualstaff",
    name: "Dualstaff",
    tier: 1,
    category: "Primary",
    trait: "Instinct",
    burden: "Two-Handed",
    range: "Far",
    damageDie: "d6+3",
    damageType: "Magic",
    feature: null,
    description: "Requires a Spellcast trait.",
    srdPage: 23,
  },
  {
    id: "scepter",
    name: "Scepter",
    tier: 1,
    category: "Primary",
    trait: "Presence",
    burden: "Two-Handed",
    range: "Far",
    damageDie: "d6",
    damageType: "Magic",
    feature: "Versatile: This weapon can also be used with these statistics — Presence, Melee, d8",
    description: "Requires a Spellcast trait.",
    srdPage: 23,
  },
  {
    id: "wand",
    name: "Wand",
    tier: 1,
    category: "Primary",
    trait: "Knowledge",
    burden: "One-Handed",
    range: "Far",
    damageDie: "d6+1",
    damageType: "Magic",
    feature: null,
    description: "Requires a Spellcast trait.",
    srdPage: 23,
  },
  {
    id: "greatstaff",
    name: "Greatstaff",
    tier: 1,
    category: "Primary",
    trait: "Knowledge",
    burden: "Two-Handed",
    range: "Very Far",
    damageDie: "d6",
    damageType: "Magic",
    feature: "Powerful: On a successful attack, roll an additional damage die and discard the lowest result",
    description: "Requires a Spellcast trait.",
    srdPage: 23,
  },
];

// ─── Tier 1 Secondary Weapons (SRD page 27) ───────────────────────────────────

export const TIER1_SECONDARY: SRDWeapon[] = [
  {
    id: "shortsword",
    name: "Shortsword",
    tier: 1,
    category: "Secondary",
    trait: "Agility",
    burden: "One-Handed",
    range: "Melee",
    damageDie: "d8",
    damageType: "Physical",
    feature: "Paired: +2 to primary weapon damage to targets within Melee range",
    description: null,
    srdPage: 27,
  },
  {
    id: "round-shield",
    name: "Round Shield",
    tier: 1,
    category: "Secondary",
    trait: "Strength",
    burden: "One-Handed",
    range: "Melee",
    damageDie: "d4",
    damageType: "Physical",
    feature: "Protective: +1 to Armor Score",
    description: null,
    srdPage: 27,
  },
  {
    id: "tower-shield",
    name: "Tower Shield",
    tier: 1,
    category: "Secondary",
    trait: "Strength",
    burden: "One-Handed",
    range: "Melee",
    damageDie: "d6",
    damageType: "Physical",
    feature: "Barrier: +2 to Armor Score; −1 to Evasion",
    description: null,
    srdPage: 27,
  },
  {
    id: "small-dagger",
    name: "Small Dagger",
    tier: 1,
    category: "Secondary",
    trait: "Finesse",
    burden: "One-Handed",
    range: "Melee",
    damageDie: "d8",
    damageType: "Physical",
    feature: "Paired: +2 to primary weapon damage to targets within Melee range",
    description: null,
    srdPage: 27,
  },
  {
    id: "whip",
    name: "Whip",
    tier: 1,
    category: "Secondary",
    trait: "Presence",
    burden: "One-Handed",
    range: "Very Close",
    damageDie: "d6",
    damageType: "Physical",
    feature: "Startling: Mark a Stress to crack the whip and force all adversaries within Melee range back to Close range",
    description: null,
    srdPage: 27,
  },
  {
    id: "grappler",
    name: "Grappler",
    tier: 1,
    category: "Secondary",
    trait: "Finesse",
    burden: "One-Handed",
    range: "Close",
    damageDie: "d6",
    damageType: "Physical",
    feature: "Hooked: On a successful attack, you can pull the target into Melee range",
    description: null,
    srdPage: 27,
  },
  {
    id: "hand-crossbow",
    name: "Hand Crossbow",
    tier: 1,
    category: "Secondary",
    trait: "Finesse",
    burden: "One-Handed",
    range: "Far",
    damageDie: "d6+1",
    damageType: "Physical",
    feature: null,
    description: null,
    srdPage: 27,
  },
];

// ─── All Tier 1 Weapons Combined ──────────────────────────────────────────────

export const ALL_TIER1_WEAPONS: SRDWeapon[] = [
  ...TIER1_PRIMARY_PHYSICAL,
  ...TIER1_PRIMARY_MAGIC,
  ...TIER1_SECONDARY,
];

// ─── Armor (All Tiers, SRD page 29) ──────────────────────────────────────────

export const ALL_ARMOR: SRDArmor[] = [
  // ── Tier 1 ──
  {
    id: "gambeson",
    name: "Gambeson Armor",
    tier: 1,
    baseMajorThreshold: 5,
    baseSevereThreshold: 11,
    baseArmorScore: 2,
    feature: "Flexible: +1 to Evasion",
    featureType: "Flexible",
    description: null,
    srdPage: 29,
  },
  {
    id: "leather",
    name: "Leather Armor",
    tier: 1,
    baseMajorThreshold: 6,
    baseSevereThreshold: 13,
    baseArmorScore: 3,
    feature: null,
    featureType: null,
    description: null,
    srdPage: 29,
  },
  {
    id: "chainmail",
    name: "Chainmail Armor",
    tier: 1,
    baseMajorThreshold: 7,
    baseSevereThreshold: 15,
    baseArmorScore: 4,
    feature: "Heavy: −1 to Evasion",
    featureType: "Heavy",
    description: null,
    srdPage: 29,
  },
  {
    id: "full-plate",
    name: "Full Plate Armor",
    tier: 1,
    baseMajorThreshold: 8,
    baseSevereThreshold: 17,
    baseArmorScore: 5,
    feature: "Very Heavy: −2 to Evasion; −1 to Agility",
    featureType: "Very Heavy",
    description: null,
    srdPage: 29,
  },
  // ── Tier 2 ──
  {
    id: "improved-gambeson",
    name: "Improved Gambeson Armor",
    tier: 2,
    baseMajorThreshold: 7,
    baseSevereThreshold: 16,
    baseArmorScore: 3,
    feature: "Flexible: +1 to Evasion",
    featureType: "Flexible",
    description: null,
    srdPage: 29,
  },
  {
    id: "improved-leather",
    name: "Improved Leather Armor",
    tier: 2,
    baseMajorThreshold: 9,
    baseSevereThreshold: 20,
    baseArmorScore: 4,
    feature: null,
    featureType: null,
    description: null,
    srdPage: 29,
  },
  {
    id: "improved-chainmail",
    name: "Improved Chainmail Armor",
    tier: 2,
    baseMajorThreshold: 11,
    baseSevereThreshold: 24,
    baseArmorScore: 5,
    feature: "Heavy: −1 to Evasion",
    featureType: "Heavy",
    description: null,
    srdPage: 29,
  },
  {
    id: "improved-full-plate",
    name: "Improved Full Plate Armor",
    tier: 2,
    baseMajorThreshold: 13,
    baseSevereThreshold: 28,
    baseArmorScore: 6,
    feature: "Very Heavy: −2 to Evasion; −1 to Agility",
    featureType: "Very Heavy",
    description: null,
    srdPage: 29,
  },
  {
    id: "elundrian-chain",
    name: "Elundrian Chain Armor",
    tier: 2,
    baseMajorThreshold: 9,
    baseSevereThreshold: 21,
    baseArmorScore: 4,
    feature: "Warded: You reduce incoming magic damage by your Armor Score before applying it to your damage thresholds",
    featureType: "Warded",
    description: null,
    srdPage: 29,
  },
  {
    id: "harrowbone",
    name: "Harrowbone Armor",
    tier: 2,
    baseMajorThreshold: 9,
    baseSevereThreshold: 21,
    baseArmorScore: 4,
    feature: "Resilient: Before you mark your last Armor Slot, roll a d6. On a result of 6, reduce the severity by one threshold without marking an Armor Slot",
    featureType: "Resilient",
    description: null,
    srdPage: 29,
  },
  {
    id: "irontree-breastplate",
    name: "Irontree Breastplate Armor",
    tier: 2,
    baseMajorThreshold: 9,
    baseSevereThreshold: 20,
    baseArmorScore: 4,
    feature: "Reinforced: When you mark your last Armor Slot, increase your damage thresholds by +2 until you clear at least 1 Armor Slot",
    featureType: "Reinforced",
    description: null,
    srdPage: 29,
  },
  {
    id: "runetan-floating",
    name: "Runetan Floating Armor",
    tier: 2,
    baseMajorThreshold: 9,
    baseSevereThreshold: 20,
    baseArmorScore: 3,
    feature: "Shifting: When you are targeted for an attack, you can mark an Armor Slot to give the attack roll against you disadvantage",
    featureType: "Shifting",
    description: null,
    srdPage: 29,
  },
  {
    id: "tyris-soft",
    name: "Tyris Soft Armor",
    tier: 2,
    baseMajorThreshold: 8,
    baseSevereThreshold: 18,
    baseArmorScore: 3,
    feature: "Quiet: You gain a +2 bonus to rolls you make to move silently",
    featureType: "Quiet",
    description: null,
    srdPage: 29,
  },
  {
    id: "rosewild",
    name: "Rosewild Armor",
    tier: 2,
    baseMajorThreshold: 11,
    baseSevereThreshold: 23,
    baseArmorScore: 5,
    feature: "Hopeful: When you would spend a Hope, you can mark an Armor Slot instead",
    featureType: "Hopeful",
    description: null,
    srdPage: 29,
  },
  // ── Tier 3 ──
  {
    id: "advanced-gambeson",
    name: "Advanced Gambeson Armor",
    tier: 3,
    baseMajorThreshold: 9,
    baseSevereThreshold: 23,
    baseArmorScore: 4,
    feature: "Flexible: +1 to Evasion",
    featureType: "Flexible",
    description: null,
    srdPage: 29,
  },
  {
    id: "advanced-leather",
    name: "Advanced Leather Armor",
    tier: 3,
    baseMajorThreshold: 11,
    baseSevereThreshold: 27,
    baseArmorScore: 5,
    feature: null,
    featureType: null,
    description: null,
    srdPage: 29,
  },
  {
    id: "advanced-chainmail",
    name: "Advanced Chainmail Armor",
    tier: 3,
    baseMajorThreshold: 13,
    baseSevereThreshold: 31,
    baseArmorScore: 6,
    feature: "Heavy: −1 to Evasion",
    featureType: "Heavy",
    description: null,
    srdPage: 29,
  },
  {
    id: "advanced-full-plate",
    name: "Advanced Full Plate Armor",
    tier: 3,
    baseMajorThreshold: 15,
    baseSevereThreshold: 35,
    baseArmorScore: 7,
    feature: "Very Heavy: −2 to Evasion; −1 to Agility",
    featureType: "Very Heavy",
    description: null,
    srdPage: 29,
  },
  {
    id: "bellamoi-fine",
    name: "Bellamoi Fine Armor",
    tier: 3,
    baseMajorThreshold: 11,
    baseSevereThreshold: 27,
    baseArmorScore: 5,
    feature: "Gilded: +1 to Presence",
    featureType: "Gilded",
    description: null,
    srdPage: 29,
  },
  {
    id: "dragonscale",
    name: "Dragonscale Armor",
    tier: 3,
    baseMajorThreshold: 11,
    baseSevereThreshold: 27,
    baseArmorScore: 5,
    feature: "Impenetrable: Once per short rest, when you would mark your last Hit Point, you can instead mark a Stress",
    featureType: "Impenetrable",
    description: null,
    srdPage: 29,
  },
  {
    id: "spiked-plate",
    name: "Spiked Plate Armor",
    tier: 3,
    baseMajorThreshold: 10,
    baseSevereThreshold: 25,
    baseArmorScore: 5,
    feature: "Sharp: On a successful attack against a target within Melee range, add a d4 to the damage roll",
    featureType: "Sharp",
    description: null,
    srdPage: 29,
  },
  {
    id: "bladefare",
    name: "Bladefare Armor",
    tier: 3,
    baseMajorThreshold: 16,
    baseSevereThreshold: 39,
    baseArmorScore: 6,
    feature: "Physical: You can't mark an Armor Slot to reduce magic damage",
    featureType: "Physical",
    description: null,
    srdPage: 29,
  },
  {
    id: "monetts-cloak",
    name: "Monett's Cloak",
    tier: 3,
    baseMajorThreshold: 16,
    baseSevereThreshold: 39,
    baseArmorScore: 6,
    feature: "Magic: You can't mark an Armor Slot to reduce physical damage",
    featureType: "Magic",
    description: null,
    srdPage: 29,
  },
  {
    id: "runes-of-fortification",
    name: "Runes of Fortification",
    tier: 3,
    baseMajorThreshold: 17,
    baseSevereThreshold: 43,
    baseArmorScore: 7,
    feature: "Painful: Each time you mark an Armor Slot, you must mark a Stress",
    featureType: "Painful",
    description: null,
    srdPage: 29,
  },
  // ── Tier 4 ──
  {
    id: "legendary-gambeson",
    name: "Legendary Gambeson Armor",
    tier: 4,
    baseMajorThreshold: 11,
    baseSevereThreshold: 32,
    baseArmorScore: 5,
    feature: "Flexible: +1 to Evasion",
    featureType: "Flexible",
    description: null,
    srdPage: 29,
  },
  {
    id: "legendary-leather",
    name: "Legendary Leather Armor",
    tier: 4,
    baseMajorThreshold: 13,
    baseSevereThreshold: 36,
    baseArmorScore: 6,
    feature: null,
    featureType: null,
    description: null,
    srdPage: 29,
  },
  {
    id: "legendary-chainmail",
    name: "Legendary Chainmail Armor",
    tier: 4,
    baseMajorThreshold: 15,
    baseSevereThreshold: 40,
    baseArmorScore: 7,
    feature: "Heavy: −1 to Evasion",
    featureType: "Heavy",
    description: null,
    srdPage: 29,
  },
  {
    id: "legendary-full-plate",
    name: "Legendary Full Plate Armor",
    tier: 4,
    baseMajorThreshold: 17,
    baseSevereThreshold: 44,
    baseArmorScore: 8,
    feature: "Very Heavy: −2 to Evasion; −1 to Agility",
    featureType: "Very Heavy",
    description: null,
    srdPage: 29,
  },
  {
    id: "dunamis-silkchain",
    name: "Dunamis Silkchain",
    tier: 4,
    baseMajorThreshold: 13,
    baseSevereThreshold: 36,
    baseArmorScore: 6,
    feature: "Timeslowing: Mark an Armor Slot to roll a d4 and add its result as a bonus to your Evasion against an incoming attack",
    featureType: "Timeslowing",
    description: null,
    srdPage: 29,
  },
  {
    id: "channeling-armor",
    name: "Channeling Armor",
    tier: 4,
    baseMajorThreshold: 13,
    baseSevereThreshold: 36,
    baseArmorScore: 6,
    feature: "Channeling: +1 to Spellcast Rolls",
    featureType: "Channeling",
    description: null,
    srdPage: 29,
  },
  {
    id: "emberwoven",
    name: "Emberwoven Armor",
    tier: 4,
    baseMajorThreshold: 13,
    baseSevereThreshold: 36,
    baseArmorScore: 6,
    feature: "Burning: When an adversary attacks you within Melee range, they mark a Stress",
    featureType: "Burning",
    description: null,
    srdPage: 29,
  },
  {
    id: "full-fortified",
    name: "Full Fortified Armor",
    tier: 4,
    baseMajorThreshold: 15,
    baseSevereThreshold: 40,
    baseArmorScore: 7,
    feature: "Fortified: When you mark an Armor Slot, you reduce the severity of an attack by two thresholds instead of one",
    featureType: "Fortified",
    description: null,
    srdPage: 29,
  },
  {
    id: "veritas-opal",
    name: "Veritas Opal Armor",
    tier: 4,
    baseMajorThreshold: 13,
    baseSevereThreshold: 36,
    baseArmorScore: 6,
    feature: "Truthseeking: This armor glows when another creature within Close range tells a lie",
    featureType: "Truthseeking",
    description: null,
    srdPage: 29,
  },
  {
    id: "savior-chainmail",
    name: "Savior Chainmail",
    tier: 4,
    baseMajorThreshold: 18,
    baseSevereThreshold: 48,
    baseArmorScore: 8,
    feature: "Difficult: −1 to all character traits and Evasion",
    featureType: "Difficult",
    description: null,
    srdPage: 29,
  },
];

// ─── Tier 1 Armor Only (for character creation) ───────────────────────────────

export const TIER1_ARMOR: SRDArmor[] = ALL_ARMOR.filter((a) => a.tier === 1);

// ─── Subclass → Suggested Weapons ─────────────────────────────────────────────
// Keyed by subclassId (lowercase, hyphenated). Two primary weapon IDs per subclass.
// These are permanent SRD selections — do not change without SRD compliance review.

export const SUBCLASS_SUGGESTED_WEAPONS: Record<string, [string, string]> = {
  // Presence subclasses
  nightsong:    ["scepter", "cutlass"],
  lightkeeper:  ["scepter", "rapier"],
  puppeteer:    ["scepter", "rapier"],
  "spirit-speaker": ["scepter", "cutlass"],
  // Instinct subclasses
  siphon:       ["hand-runes", "dualstaff"],
  tactician:    ["shortstaff", "quarterstaff"],
  "primal-origin": ["hand-runes", "dualstaff"],
  // Strength subclasses
  stalwart:     ["arcane-gauntlets", "hallowed-axe"],
  wildblood:    ["arcane-gauntlets", "greatsword"],
  warden:       ["arcane-gauntlets", "warhammer"],
  veteran:      ["hallowed-axe", "greatsword"],
  // Knowledge subclasses
  lorekeeper:   ["wand", "greatstaff"],
  "arcane-warrior": ["wand", "greatstaff"],
  magus:        ["greatstaff", "wand"],
  "leyline-walker": ["greatstaff", "wand"],
  // Agility subclasses
  "winged-sentinel": ["glowing-rings", "longbow"],
  venomfang:    ["glowing-rings", "broadsword"],
  stalker:      ["glowing-rings", "shortbow"],
  "pack-runner": ["glowing-rings", "broadsword"],
  // Finesse subclasses
  conduit:      ["returning-blade", "dagger"],
  syndicate:    ["returning-blade", "crossbow"],
  blademaster:  ["returning-blade", "dagger"],
};

// ─── Suggested Armor by Starting Evasion ─────────────────────────────────────
// Per builder rules:
//   Evasion 9–10 → Flexible (Gambeson)
//   Evasion 8    → No feature (Leather)
//   Evasion 7    → Heavy (Chainmail)
//   Evasion < 7  → Very Heavy (Full Plate)

export function getSuggestedArmorId(startingEvasion: number): string {
  if (startingEvasion >= 9) return "gambeson";
  if (startingEvasion === 8) return "leather";
  if (startingEvasion === 7) return "chainmail";
  return "full-plate";
}

// ─── Starting Consumables (SRD page 58) ──────────────────────────────────────

export interface SRDConsumable {
  id: string;
  name: string;
  /** Brief (≤50 char) description for collapsed list view */
  shortDescription: string;
  /** Full SRD rules text */
  fullText: string;
  srdPage: 58;
}

export const STARTING_CONSUMABLES: SRDConsumable[] = [
  {
    id: "minor-health-potion",
    name: "Minor Health Potion",
    shortDescription: "Clear 1d4 HP.",
    fullText:
      "Clear 1d4 HP.\n\nYou can hold up to five of each consumable at a time. Using a consumable doesn't require a roll unless required by the GM or the demands of the fiction.",
    srdPage: 58,
  },
  {
    id: "minor-stamina-potion",
    name: "Minor Stamina Potion",
    shortDescription: "Clear 1d4 Stress.",
    fullText:
      "Clear 1d4 Stress.\n\nYou can hold up to five of each consumable at a time. Using a consumable doesn't require a roll unless required by the GM or the demands of the fiction.",
    srdPage: 58,
  },
];

// ─── Universal Starting Items (SRD page 3, Step 5) ───────────────────────────

/**
 * Items every new character receives automatically, per SRD page 3.
 * These are not selectable — they are added unconditionally.
 */
export const UNIVERSAL_STARTING_ITEMS: string[] = [
  "a torch",
  "50 feet of rope",
  "basic supplies",
];

// ─── Starting Gold (SRD page 3 + page 58) ────────────────────────────────────

/**
 * SRD page 3: Every character starts with 1 handful of gold.
 * SRD page 58: Gold tiers are Handfuls (0–9) → Bags (0–9) → Chests (0–1).
 */
export const STARTING_GOLD = { handfuls: 1, bags: 0, chests: 0 };

// ─── Class Starting Items (SRD pages 6–14) ───────────────────────────────────
// Player chooses ONE of the two options per class.

/**
 * Keyed by classId (lowercase, hyphenated to match API).
 * Two string options per class (player picks one).
 */
export const CLASS_STARTING_ITEMS: Record<string, [string, string]> = {
  bard:     ["A romance novel", "A letter never opened"],
  druid:    ["A small bag of rocks and bones", "A strange pendant found in the dirt"],
  guardian: ["A totem from your mentor", "A secret key"],
  ranger:   ["A trophy from your first kill", "A seemingly broken compass"],
  rogue:    ["A set of forgery tools", "A grappling hook"],
  seraph:   ["A bundle of offerings", "A sigil of your god"],
  sorcerer: ["A whispering orb", "A family heirloom"],
  warrior:  ["The drawing of a lover", "A sharpening stone"],
  wizard:   ["A book you're trying to translate", "A tiny, harmless elemental pet"],
};
