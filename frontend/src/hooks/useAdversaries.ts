"use client";

/**
 * src/hooks/useAdversaries.ts
 *
 * Manages the adversary catalog for a campaign.
 * Currently backed by a Zustand store with seed data — will migrate to
 * TanStack Query + backend API when the adversary CRUD endpoints exist.
 */

import { useCallback, useMemo } from "react";
import { create } from "zustand";
import type { Adversary, AdversaryTier, AdversaryType } from "@/types/adversary";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function nanoid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

// ─── Seed Data ────────────────────────────────────────────────────────────────
// Adversaries imported from markdown/Adversaries/ plus Hygiane Order homebrew.

const SEED_ADVERSARIES: Adversary[] = [
  // ── Imported from markdown/Adversaries/ ──────────────────────────────────

  {
    adversaryId: "hb-madanikuputukas-swarm",
    name: "Madanikuputukas (Swarm)",
    tier: 1,
    type: "Horde",
    description:
      "A swarm of silvery, semi-corporeal creatures arranged in a dihedrally symmetrical pattern. Each of its eight legs and body sections appear identical to one another. Its movements come in quick, unexpected bursts, and where it lingers too long, creep seemingly follows.",
    difficulty: 10,
    hp: 6,
    stress: 2,
    damageThresholds: { major: 5, severe: 10 },
    attackModifier: -2,
    attackRange: "Melee",
    attackDamage: "1d4 magical",
    features: [
      {
        name: "Conglomerate",
        description:
          "When 2 swarms of Madanikuptukas meet, they join and replenish. Clear all HP and Stress. Double their attack (e.g. 1d4 Magical => 2d4 Magical). If a third Madanikuputukas swarm joins in this way, replace the swarm with a Kuputuka.",
      },
      {
        name: "Creep",
        description:
          "All targets within melee range must succeed against an Agility reaction roll or mark a Stress. Any character that marks two Stress this way gains the Creep-Touched condition. A Creep-Touched creature has disadvantage on all action rolls until the condition is cleared narratively.",
      },
    ],
    imageUrl: null,
    source: "homebrew",
    campaignId: null,
    createdAt: "2026-03-28T00:00:00Z",
    updatedAt: "2026-03-28T00:00:00Z",
  },

  {
    adversaryId: "hb-kuputuka",
    name: "Kuputuka",
    tier: 2,
    type: "Solo",
    description:
      "A massive, low-slung, elongated eight-legged creature. It is semi-corporeal, and considerably more intelligent than its progenitors.",
    difficulty: 15,
    hp: 9,
    stress: 3,
    damageThresholds: { major: 13, severe: 25 },
    attackModifier: 4,
    attackRange: "Melee",
    attackDamage: "2d20+3 magical",
    features: [
      {
        name: "Semi-Corporeal",
        description: "The Kuputuka halves incoming physical damage.",
      },
      {
        name: "Force Transform",
        description:
          "Spend a Fear to force a target that is Creep-Touched to develop an abnormal transformation. The target takes 2d6+3 magical damage.",
      },
      {
        name: "Disassociation Aura",
        description:
          "Creatures within Close Range must succeed at an Instinct Roll (13) in order to target this creature with an attack.",
      },
      {
        name: "Compounding Dread",
        description:
          "When the Kuputuka successfully attacks a player character, gain a Fear.",
      },
    ],
    imageUrl: null,
    source: "homebrew",
    campaignId: null,
    createdAt: "2026-03-28T00:00:00Z",
    updatedAt: "2026-03-28T00:00:00Z",
  },

  {
    adversaryId: "hb-frightened-villagers",
    name: "Frightened Villagers",
    tier: 2,
    type: "Social",
    description:
      "Panicked villagers desperately trying to escape, but too scared to sensibly follow directions.",
    difficulty: 13,
    hp: 3,
    stress: 4,
    damageThresholds: { major: 6, severe: 13 },
    attackModifier: -1,
    attackRange: "Melee",
    attackDamage: "1d8+2 physical",
    features: [
      {
        name: "Escalating Fear",
        description:
          "Whenever you gain Fear during this encounter, the Frightened Villagers deal an additional d8 damage with their Trample.",
      },
      {
        name: "Unruly Mob",
        description:
          "If the Frightened Villagers move through Melee range of a PC, the PC automatically takes damage from their Trample weapon.",
      },
      {
        name: "Unreasoning",
        description:
          "If the PCs fail a social interaction to calm the mob, they must mark a Stress. When the mob has caused 3 stress to be marked this way, they must Flee.",
      },
      {
        name: "Flee",
        description:
          "The Frightened Villagers move as a group away from the most visible threat at maximum speed.",
      },
    ],
    imageUrl: null,
    source: "homebrew",
    campaignId: null,
    createdAt: "2026-03-28T00:00:00Z",
    updatedAt: "2026-03-28T00:00:00Z",
  },

  {
    adversaryId: "hb-creep-bound-entity-1",
    name: "Creep-Bound Etherotaxic Entity (Lesser)",
    tier: 1,
    type: "Standard",
    description:
      "Any of the numerous body plans of the etherotaxic entities that live in Forestdown. They follow variable body plans and motivations, but like all etherotaxia their motives can be unique to the individual.",
    difficulty: 12,
    hp: 3,
    stress: 3,
    damageThresholds: { major: 5, severe: 9 },
    attackModifier: 1,
    attackRange: "Melee",
    attackDamage: "3d4 magical",
    features: [
      {
        name: "Semi-Corporeal",
        description:
          "Etherotaxic characters take half damage from physical attacks.",
      },
      {
        name: "Flickering Displace",
        description:
          "Spend a Fear to move this creature up to Far distance instantly.",
      },
      {
        name: "Creep",
        description:
          "All targets within melee range must succeed against an Agility reaction roll or mark a Stress. Any character that marks two Stress this way gains the Creep-Touched condition. A Creep-Touched creature has disadvantage on all action rolls until the condition is cleared narratively.",
      },
    ],
    imageUrl: null,
    source: "homebrew",
    campaignId: null,
    createdAt: "2026-03-28T00:00:00Z",
    updatedAt: "2026-03-28T00:00:00Z",
  },

  {
    adversaryId: "hb-creep-bound-entity-2",
    name: "Creep-Bound Etherotaxic Entity (Greater)",
    tier: 2,
    type: "Standard",
    description:
      "Any of the numerous body plans of the etherotaxic entities that live in Forestdown. They follow variable body plans and motivations, but like all etherotaxia their motives can be unique to the individual.",
    difficulty: 15,
    hp: 4,
    stress: 4,
    damageThresholds: { major: 8, severe: 15 },
    attackModifier: 2,
    attackRange: "Melee",
    attackDamage: "6d4 magical",
    features: [
      {
        name: "Semi-Corporeal",
        description:
          "Etherotaxic characters take half damage from physical attacks.",
      },
      {
        name: "Flickering Displace",
        description:
          "Spend a Fear to move this creature up to Far distance instantly.",
      },
      {
        name: "Creep",
        description:
          "All targets within melee range must succeed against an Agility reaction roll or mark a Stress. Any character that marks two Stress this way gains the Creep-Touched condition. A Creep-Touched creature has disadvantage on all action rolls until the condition is cleared narratively.",
      },
      {
        name: "Beckon",
        description:
          "A target within far range must make a Presence Trait Roll (14) or gain the Beckoned condition. A Beckoned target moves immediately towards the adversary which inflicted it with the condition at full speed.",
      },
    ],
    imageUrl: null,
    source: "homebrew",
    campaignId: null,
    createdAt: "2026-03-28T00:00:00Z",
    updatedAt: "2026-03-28T00:00:00Z",
  },

  {
    adversaryId: "hb-trinkanus",
    name: "Trinkanus",
    tier: 1,
    type: "Solo",
    description:
      "A large, flat-headed cave creature. Possesses two long, thin, whip-like forelimbs segmented at its front. It has a broad, saw-like mandible and several dull crusty eyes. It is of an order of creatures that survive by 'ranching,' minding and controlling populations of another population of creatures carefully, picking off only those that it needs to sustain itself.",
    difficulty: 12,
    hp: 9,
    stress: 3,
    damageThresholds: { major: 10, severe: 16 },
    attackModifier: 2,
    attackRange: "Close",
    attackDamage: "1d6+1 physical",
    features: [
      {
        name: "Grab",
        description:
          "On a successful attack with a Pincer, the Trinkanus can move its target up to Close range.",
      },
      {
        name: "Rancher - Passive",
        description:
          "The Trinkanus will not attack creatures it sees as part of its 'herd.' A creature moved by Grab will not attack unless it's moved.",
      },
      {
        name: "Consume",
        description:
          "On a successful attack with a Bite (Melee | 2d8 Physical), the Trinkanus can attempt to swallow the target. The target must make a Strength Roll (11) or be swallowed whole. A target who has been swallowed whole cannot act until they are free from the stomach of the Trinkanus.",
      },
    ],
    imageUrl: null,
    source: "homebrew",
    campaignId: null,
    createdAt: "2026-03-28T00:00:00Z",
    updatedAt: "2026-03-28T00:00:00Z",
  },

  {
    adversaryId: "hb-lanmaoa",
    name: "Lanmaoa",
    tier: 1,
    type: "Standard",
    description:
      "A race of forest dwellers. Pint sized. Known to crawl under doors and through small cracks. Little is known of these, and their appearance is often linked to the early stages of delusions in those affected by the Creep. This may be due to the intense psychotropic effect on those who spend any amount of time in their presence.",
    difficulty: 14,
    hp: 2,
    stress: 4,
    damageThresholds: { major: 4, severe: 8 },
    attackModifier: -1,
    attackRange: "Melee",
    attackDamage: "1d4-1 physical",
    features: [
      {
        name: "Confusion - Passive",
        description:
          "Any target within Close range of a Lanmaoa must make a Presence Roll (14) or become Confused. A Confused creature gains Disadvantage on Presence, Instinct and Knowledge trait rolls.",
      },
      {
        name: "Hallucination",
        description:
          "Spend a Fear to create a shared hallucination for all targets within Close range of the Lanmaoa. A character can dismiss this effect by succeeding in a Presence, Instinct or Knowledge roll against the Lanmaoa's difficulty.",
      },
      {
        name: "Thieve",
        description:
          "Once per scene, a Lanmaoa can steal an item from a Confused target, or a target which is under the effect of a Hallucination.",
      },
    ],
    imageUrl: null,
    source: "homebrew",
    campaignId: null,
    createdAt: "2026-03-30T00:00:00Z",
    updatedAt: "2026-03-30T00:00:00Z",
  },

  // ── Hygiane Order adversaries ─────────────────────────────────────────────

  // Social ×4

  {
    adversaryId: "hb-hospitaller-veteran",
    name: "Hospitaller Veteran",
    tier: 2,
    type: "Social",
    description:
      "An aging knight of the Hygiane Order, past their prime but still commanding. Bears the scars of too many burns and clearings in Forestdown. More likely to lecture than fight, though they will defend their comrades with their last breath.",
    difficulty: 14,
    hp: 4,
    stress: 5,
    damageThresholds: { major: 7, severe: 14 },
    attackModifier: 2,
    attackRange: "Melee",
    attackDamage: "1d10+1 physical",
    features: [
      {
        name: "Old Authority",
        description:
          "When a PC attempts a social roll to intimidate or deceive the Veteran, they must first succeed on a Presence Roll (14) or the attempt automatically fails.",
      },
      {
        name: "Chain of Command",
        description:
          "While the Hospitaller Veteran is present, allied Hygiane Order adversaries cannot be Frightened and add +1 to their attack rolls.",
      },
      {
        name: "Stand Down",
        description:
          "Once per scene, spend a Fear. A PC that has caused harm to a Hospitaller must succeed on a Presence Roll (15) or drop their weapon and freeze for one round.",
      },
    ],
    imageUrl: null,
    source: "homebrew",
    campaignId: null,
    createdAt: "2026-03-30T00:00:00Z",
    updatedAt: "2026-03-30T00:00:00Z",
  },

  {
    adversaryId: "hb-medicament-researcher",
    name: "Medicament Researcher",
    tier: 1,
    type: "Social",
    description:
      "A cleric-scientist of the Hygiane Order's Medicaments wing, studying the forest's effects on living creatures. Hollow-eyed and slightly unsteady, they have been 'cataloging the effects' of prolonged Lanmaoa exposure far longer than is wise.",
    difficulty: 12,
    hp: 2,
    stress: 5,
    damageThresholds: { major: 4, severe: 9 },
    attackModifier: 0,
    attackRange: "Close",
    attackDamage: "1d6 physical",
    features: [
      {
        name: "Dissociative Argument",
        description:
          "When a PC engages the Researcher in conversation, they must succeed on a Presence Roll (12) or become Confused for one round as the Researcher's fragmented reasoning infects their thinking.",
      },
      {
        name: "Field Kit",
        description:
          "Once per scene, the Researcher can administer a tonic that clears 2 Stress from any character, friend or foe, within Melee range.",
      },
      {
        name: "Creep-Addled",
        description:
          "When the Researcher marks 3 or more Stress, they lose track of who is friend or foe and attack the nearest creature for 1d6 physical damage.",
      },
    ],
    imageUrl: null,
    source: "homebrew",
    campaignId: null,
    createdAt: "2026-03-30T00:00:00Z",
    updatedAt: "2026-03-30T00:00:00Z",
  },

  {
    adversaryId: "hb-rearcaptain-grace-kinder",
    name: "Rearcaptain Grace Kinder",
    tier: 2,
    type: "Social",
    description:
      "Head of the Tenders. Short for a human, tall for most other species. Short blonde hair, stern face, deep scar on her right arm covered by her dress uniform. A devout follower of the Church of the Revenant God, she often questions the purpose of their work — but never her duty.",
    difficulty: 15,
    hp: 5,
    stress: 4,
    damageThresholds: { major: 8, severe: 15 },
    attackModifier: 3,
    attackRange: "Melee",
    attackDamage: "1d12+2 physical",
    features: [
      {
        name: "Faithful Duty",
        description:
          "Rearcaptain Kinder cannot be bribed or seduced from her post. Any Deception roll against her is made at Disadvantage.",
      },
      {
        name: "Theological Challenge",
        description:
          "Once per scene, she may invoke the Revenant God's will. A PC must make a Presence Roll (15) or be compelled to explain their actions to her satisfaction before proceeding.",
      },
      {
        name: "Controlled Burn Order",
        description:
          "Spend 2 Fear. Kinder calls for a burn. All creatures in the area must make an Agility Roll (13) or take 2d6 fire damage and gain the Burning condition.",
      },
    ],
    imageUrl: null,
    source: "homebrew",
    campaignId: null,
    createdAt: "2026-03-30T00:00:00Z",
    updatedAt: "2026-03-30T00:00:00Z",
  },

  {
    adversaryId: "hb-rearcaptain-oramora",
    name: "Rearcaptain Oramora",
    tier: 2,
    type: "Social",
    description:
      "Head of the Etherements. A Ghotling missing his right leg who moves in a swinging lope on his arms. Has sewn more buttons than regulation onto his uniform. Dark and brooding, he speaks only the vaguest thoughts before retreating. Has been running unsanctioned experiments with Madanikuputukas in the destroyed northern tower.",
    difficulty: 16,
    hp: 4,
    stress: 6,
    damageThresholds: { major: 7, severe: 13 },
    attackModifier: 1,
    attackRange: "Close",
    attackDamage: "2d4 magical",
    features: [
      {
        name: "Studied Obscurity",
        description:
          "Oramora's true motives are always unclear. A PC that attempts a Knowledge Roll to read his intentions must beat difficulty 16 or receive only false impressions.",
      },
      {
        name: "Experimental Subject",
        description:
          "Spend a Fear. Oramora releases a restrained Madanikuputukas Swarm that has been conditioned to attack on his behalf. Add one Madanikuputukas (Swarm) to the encounter.",
      },
      {
        name: "Paranoid Ward",
        description:
          "When any PC moves within Close range without announcing themselves, they must make an Instinct Roll (15) or Oramora immediately attacks as a reaction.",
      },
      {
        name: "Whisper of Ichida",
        description:
          "Once per scene, Oramora murmurs a phrase. A target within Far range must succeed on a Presence Roll (16) or become Beckoned toward him for one round.",
      },
    ],
    imageUrl: null,
    source: "homebrew",
    campaignId: null,
    createdAt: "2026-03-30T00:00:00Z",
    updatedAt: "2026-03-30T00:00:00Z",
  },

  // Standard ×3

  {
    adversaryId: "hb-hospitaller-knight",
    name: "Hospitaller Knight",
    tier: 2,
    type: "Standard",
    description:
      "A line soldier of the Hygiane Order's oldest sect. Trained for close combat against the Creep and its creatures. Fights with disciplined precision in tight formations.",
    difficulty: 14,
    hp: 5,
    stress: 3,
    damageThresholds: { major: 7, severe: 13 },
    attackModifier: 3,
    attackRange: "Melee",
    attackDamage: "2d6+2 physical",
    features: [
      {
        name: "Creep-Hardened",
        description:
          "The Hospitaller Knight has Resistance to the Creep-Touched condition and does not take Stress from Creep auras.",
      },
      {
        name: "Interdiction Strike",
        description:
          "When a creature within Close range moves away from the Knight, the Knight may make an immediate attack against it as a reaction.",
      },
    ],
    imageUrl: null,
    source: "homebrew",
    campaignId: null,
    createdAt: "2026-03-30T00:00:00Z",
    updatedAt: "2026-03-30T00:00:00Z",
  },

  {
    adversaryId: "hb-tender-patrol",
    name: "Tender on Patrol",
    tier: 1,
    type: "Standard",
    description:
      "A Hygiane Order Tender walking the perimeter of Forestdown, salt-bag over one shoulder and a short blade at the hip. Unglamorous work that breeds cautious, methodical fighters.",
    difficulty: 11,
    hp: 3,
    stress: 3,
    damageThresholds: { major: 5, severe: 10 },
    attackModifier: 1,
    attackRange: "Melee",
    attackDamage: "1d8 physical",
    features: [
      {
        name: "Salt the Ground",
        description:
          "Once per scene, a Tender can scatter salt across a Close-range area. Creep-type creatures entering that area take 1d6 magical damage and must make an Agility Roll (11) or be Slowed.",
      },
      {
        name: "Runner",
        description:
          "Once per encounter, the Tender may disengage and move to Far range without provoking reactions. They may be calling for reinforcements.",
      },
    ],
    imageUrl: null,
    source: "homebrew",
    campaignId: null,
    createdAt: "2026-03-30T00:00:00Z",
    updatedAt: "2026-03-30T00:00:00Z",
  },

  {
    adversaryId: "hb-etherement-acolyte",
    name: "Etherement Acolyte",
    tier: 1,
    type: "Standard",
    description:
      "A junior member of the Etherements, already showing the hollow stare and compulsive note-taking that afflicts their seniors. They study spirits and haunts with clinical detachment — until the spirits start talking back.",
    difficulty: 13,
    hp: 3,
    stress: 4,
    damageThresholds: { major: 5, severe: 10 },
    attackModifier: 0,
    attackRange: "Close",
    attackDamage: "2d4 magical",
    features: [
      {
        name: "Spirit Sight",
        description:
          "The Acolyte can perceive invisible or semi-corporeal creatures. Attacks against Semi-Corporeal adversaries do not have their damage halved when made by this adversary.",
      },
      {
        name: "Obsession Building",
        description:
          "Each time the Acolyte fails a roll, they mark a Stress and deal +1 damage on their next attack as their fixation intensifies.",
      },
    ],
    imageUrl: null,
    source: "homebrew",
    campaignId: null,
    createdAt: "2026-03-30T00:00:00Z",
    updatedAt: "2026-03-30T00:00:00Z",
  },

  // Bruiser ×1

  {
    adversaryId: "hb-hospitaller-purger",
    name: "Hospitaller Purger",
    tier: 2,
    type: "Bruiser",
    description:
      "The heavy arm of the Hospitallers. Encased in scorched, reinforced Order plate and wielding an oversized clearing maul, Purgers are sent in when subtlety has already failed. They do not negotiate.",
    difficulty: 15,
    hp: 9,
    stress: 3,
    damageThresholds: { major: 9, severe: 17 },
    attackModifier: 4,
    attackRange: "Melee",
    attackDamage: "2d8+3 physical",
    features: [
      {
        name: "Cleave",
        description:
          "When the Purger defeats an adversary, it may immediately make a free attack against an adjacent target.",
      },
      {
        name: "Creep-Proof Plate",
        description:
          "The Purger is immune to the Creep-Touched condition and all Creep aura effects.",
      },
      {
        name: "Suppressive Advance",
        description:
          "Spend a Fear. All creatures within Close range must make an Agility Roll (15) or be Knocked Back to Far range.",
      },
    ],
    imageUrl: null,
    source: "homebrew",
    campaignId: null,
    createdAt: "2026-03-30T00:00:00Z",
    updatedAt: "2026-03-30T00:00:00Z",
  },

  // Solo ×1

  {
    adversaryId: "hb-grandmarshal-pogg",
    name: "Grandmarshal Pogg",
    tier: 3,
    type: "Solo",
    description:
      "Head of the Hygiane Order. Details are scarce — a figure of considerable authority who has allowed the Order to fall to its weakest point in living memory. Whoever Pogg is, they have let the rot spread, whether through negligence or design.",
    difficulty: 18,
    hp: 12,
    stress: 6,
    damageThresholds: { major: 11, severe: 20 },
    attackModifier: 5,
    attackRange: "Close",
    attackDamage: "2d10+4 physical",
    features: [
      {
        name: "Authority Absolute",
        description:
          "All Hygiane Order adversaries in the encounter act with +2 to attack rolls and cannot be Frightened while Pogg is present.",
      },
      {
        name: "Redirect Blame",
        description:
          "Once per round as a reaction, when Pogg would take damage, they may deflect it to an allied Hygiane Order adversary within Close range, who takes the damage instead.",
      },
      {
        name: "Marshal's Reprimand",
        description:
          "Spend a Fear. A target within Far range must make a Presence Roll (18) or become Paralyzed for one round as Pogg's voice cuts through the chaos.",
      },
      {
        name: "Negligence or Design",
        description:
          "Once per encounter, when Pogg marks their final HP, they may choose to reveal their true allegiance. If they side with the Creep, they immediately gain the Semi-Corporeal trait and all Creep-Bound Etherotaxic Entities in the encounter clear 2 Stress.",
      },
    ],
    imageUrl: null,
    source: "homebrew",
    campaignId: null,
    createdAt: "2026-03-30T00:00:00Z",
    updatedAt: "2026-03-30T00:00:00Z",
  },

  // Horde ×1

  {
    adversaryId: "hb-tender-perimeter-crew",
    name: "Tender Perimeter Crew",
    tier: 1,
    type: "Horde",
    description:
      "A work detail of Tenders moving along the Forestdown perimeter, bags of salt and short blades at the ready. Individually unremarkable; together they can cordon off a zone and make it very difficult to pass.",
    difficulty: 11,
    hp: 8,
    stress: 3,
    damageThresholds: { major: 5, severe: 10 },
    attackModifier: 1,
    attackRange: "Close",
    attackDamage: "1d6+1 physical",
    features: [
      {
        name: "Cordon",
        description:
          "While the Tender Perimeter Crew is active, any creature attempting to move through their area must succeed on an Agility Roll (11) or be Stopped and take 1d6 physical damage.",
      },
      {
        name: "Broadcast Salt",
        description:
          "Once per round, the Crew scatters salt across the area. Creep-type adversaries within Close range take 1d4 magical damage.",
      },
      {
        name: "Scatter",
        description:
          "If the Crew marks Severe damage in a single hit, they Scatter. Split into two groups of Tender on Patrol adversaries, each at half the original HP.",
      },
    ],
    imageUrl: null,
    source: "homebrew",
    campaignId: null,
    createdAt: "2026-03-30T00:00:00Z",
    updatedAt: "2026-03-30T00:00:00Z",
  },

  // ── Ergantine Lake adversaries ────────────────────────────────────────────

  {
    adversaryId: "hb-skelkandi",
    name: "Skelkandi",
    tier: 1,
    type: "Solo",
    description:
      "A salamander-like creature of immense proportion, nearly forty yards long, its cavernous mouth wide enough to swallow a Teetle Cart whole. Decades of Creep exposure have left its skin mottled with patches of dark, fibrous growth. It bears intelligence — it attacked Gatehouse once, timing its assault for when the garrison was depleted.",
    difficulty: 12,
    hp: 9,
    stress: 3,
    damageThresholds: { major: 10, severe: 16 },
    attackModifier: 2,
    attackRange: "Close",
    attackDamage: "1d10+3 physical",
    features: [
      {
        name: "Submerged Approach - Passive",
        description:
          "The Skelkandi begins any encounter submerged. It cannot be targeted until it surfaces. It surfaces when it attacks or when a PC succeeds on an Instinct Roll (14).",
      },
      {
        name: "Capsize",
        description:
          "On a successful Lunge attack against a target on a watercraft, the Skelkandi can capsize the vessel. All passengers must make an Agility Reaction Roll (12) or be thrown into the water, becoming Vulnerable until their next turn.",
      },
      {
        name: "Drag Under",
        description:
          "Spend a Fear. The Skelkandi seizes a target within Melee range and pulls them beneath the surface. The target must make a Strength Roll (13) at the start of each turn or take 1d6+2 physical damage and remain submerged.",
      },
      {
        name: "Creep-Scarred Hide - Passive",
        description:
          "The first time each scene the Skelkandi takes damage that would mark its Severe threshold, reduce the damage by 4.",
      },
    ],
    imageUrl: null,
    source: "homebrew",
    campaignId: null,
    createdAt: "2026-04-02T00:00:00Z",
    updatedAt: "2026-04-02T00:00:00Z",
  },

  {
    adversaryId: "hb-quaddadura",
    name: "Quaddadura",
    tier: 1,
    type: "Bruiser",
    description:
      "A massive, furred, thick-skinned semi-aquatic creature ranging from ten to thirty feet long. Large spade-like teeth surround four prominent hook-shaped eye teeth. Prolonged Creep exposure has driven some into the shallows where they are far more aggressive than their uncorrupted kin.",
    difficulty: 11,
    hp: 7,
    stress: 2,
    damageThresholds: { major: 7, severe: 13 },
    attackModifier: 0,
    attackRange: "Melee",
    attackDamage: "1d10+2 physical",
    features: [
      {
        name: "Slow",
        description:
          "When you spotlight this adversary and they don't have a token on their stat block, they can't act yet. Place a token. When they have a token, clear it and they can act.",
      },
      {
        name: "Thrash",
        description:
          "On a successful Bite attack, the Quaddadura shakes its target violently. The target is moved to Melee range if not already and is knocked prone.",
      },
      {
        name: "Territorial Bellow",
        description:
          "When a PC moves within Close range for the first time, the Quaddadura lets out a deafening bellow. The PC must make a Presence Reaction Roll (11) or become Frightened, gaining Disadvantage on attacks against the Quaddadura until the end of their next turn.",
      },
    ],
    imageUrl: null,
    source: "homebrew",
    campaignId: null,
    createdAt: "2026-04-02T00:00:00Z",
    updatedAt: "2026-04-02T00:00:00Z",
  },

  {
    adversaryId: "hb-creep-touched-deaconfish",
    name: "Creep-Touched Deaconfish",
    tier: 1,
    type: "Standard",
    description:
      "A semi-aquatic, lunged beast of burden corrupted by the Creep. Where healthy Deaconfish are docile and nimble, these specimens have grown erratic — their pseudopods twitch independently, their humped backs are split with dark growths, and they lash out at anything that enters the water near them.",
    difficulty: 11,
    hp: 4,
    stress: 2,
    damageThresholds: { major: 5, severe: 9 },
    attackModifier: 1,
    attackRange: "Close",
    attackDamage: "1d6+2 physical",
    features: [
      {
        name: "Flailing Pseudopods - Passive",
        description:
          "Any creature that enters Melee range of the Deaconfish for the first time on their turn takes 1d4 physical damage from its uncontrolled thrashing.",
      },
      {
        name: "Panicked Dive",
        description:
          "When the Deaconfish takes damage that marks its Major threshold, it dives beneath the surface and moves up to Far range. It resurfaces at the start of its next spotlight.",
      },
      {
        name: "Remnant Harness",
        description:
          "A PC who succeeds on an Instinct Roll (12) notices the old harness. A subsequent Finesse Roll (13) allows the PC to calm the creature, removing it from combat. A calmed Deaconfish can be used as a mount for the remainder of the scene.",
      },
    ],
    imageUrl: null,
    source: "homebrew",
    campaignId: null,
    createdAt: "2026-04-02T00:00:00Z",
    updatedAt: "2026-04-02T00:00:00Z",
  },

  {
    adversaryId: "hb-glowfry-school",
    name: "Glowfry School",
    tier: 1,
    type: "Horde",
    description:
      "A dense, churning school of small luminous fish that swarm just beneath the surface of Ergantine Lake. The Creep has fused their schooling instinct into something more aggressive — they move as one, their collective glow shifting from pale blue to angry red when agitated.",
    difficulty: 10,
    hp: 6,
    stress: 1,
    damageThresholds: { major: 4, severe: 9 },
    attackModifier: -1,
    attackRange: "Melee",
    attackDamage: "1d8+1 physical",
    features: [
      {
        name: "Horde",
        description:
          "When the Glowfry School has marked half or more of their HP, their Swarming Bite deals 3 damage instead.",
      },
      {
        name: "Blood Frenzy",
        description:
          "When a creature within Close range takes physical damage from any source, the Glowfry School moves to Melee range of that creature and makes a free Swarming Bite attack.",
      },
      {
        name: "Luminous Warning - Passive",
        description:
          "The school's glow shifts color to indicate its state. PCs gain +1 to Instinct rolls to detect hidden creatures in the water while the Glowfry School is visible and calm.",
      },
    ],
    imageUrl: null,
    source: "homebrew",
    campaignId: null,
    createdAt: "2026-04-02T00:00:00Z",
    updatedAt: "2026-04-02T00:00:00Z",
  },

  // ── Proving Ground adversary ──────────────────────────────────────────────

  {
    adversaryId: "hb-captured-etherotaxic-entity",
    name: "Captured Etherotaxic Entity",
    tier: 1,
    type: "Solo",
    description:
      "A towering, semi-corporeal figure that shifts between forms. Unlike the smaller Etherotaxia bound to the Creep, this entity radiates unmistakable intelligence. Its movements are deliberate. It watches. It waits. When it reaches toward you, it is not attacking. It is trying to communicate.",
    difficulty: 12,
    hp: 8,
    stress: 4,
    damageThresholds: { major: 10, severe: 16 },
    attackModifier: 2,
    attackRange: "Close",
    attackDamage: "1d8+2 magical",
    features: [
      {
        name: "Semi-Corporeal",
        description:
          "This entity takes half damage from physical attacks.",
      },
      {
        name: "Relentless (2)",
        description:
          "This adversary can be spotlighted up to 2 times per GM turn. Spend Fear as usual to spotlight them.",
      },
      {
        name: "Resonance - Passive",
        description:
          "PCs within Close range hear fragments of thought — not words, but impressions. A PC who succeeds on a Presence or Instinct Roll (12) understands that the entity is frightened and wants to leave, not fight.",
      },
      {
        name: "Plaintive Reach",
        description:
          "The entity extends a limb toward a PC. The PC must make a Presence Reaction Roll (11). On a failure, the entity recoils, marking a Stress. On a success, the PC receives a vivid flash of memory and gains Advantage on subsequent Presence rolls to communicate with the entity.",
      },
      {
        name: "Cornered Fury",
        description:
          "When the entity has marked half or more of its HP, its attacks deal an additional 1d6 magical damage and it no longer attempts to communicate. A PC who previously succeeded on Resonance or Plaintive Reach can make a Presence Roll (13) to calm it and end Cornered Fury.",
      },
      {
        name: "Release",
        description:
          "If the PCs open the chamber door while the entity is not in Cornered Fury, it departs peacefully. All PCs gain a Hope. The entity pauses at the threshold and projects a final impression — gratitude, and a warning.",
      },
    ],
    imageUrl: null,
    source: "homebrew",
    campaignId: null,
    createdAt: "2026-04-02T00:00:00Z",
    updatedAt: "2026-04-02T00:00:00Z",
  },

  // ── Patrol / Creep Bloom adversaries ──────────────────────────────────────

  {
    adversaryId: "hb-bloom-tendrils",
    name: "Bloom Tendrils",
    tier: 1,
    type: "Horde",
    description:
      "Thick, ropy tendrils of living Creep that erupt from the ground during a Bloom event. They are not creatures in any conventional sense — they are the forest itself, extending its reach with terrifying speed. Cutting them only slows the advance; the stumps regenerate unless burned.",
    difficulty: 10,
    hp: 5,
    stress: 1,
    damageThresholds: { major: 4, severe: 8 },
    attackModifier: -1,
    attackRange: "Melee",
    attackDamage: "1d6+1 physical",
    features: [
      {
        name: "Horde",
        description:
          "When the Bloom Tendrils have marked half or more of their HP, their Lash deals 2 damage instead.",
      },
      {
        name: "Entangle",
        description:
          "When a PC moves within Melee range, the tendrils attempt to grapple them. The PC must make an Agility Reaction Roll (11) or become Restrained. A Restrained PC has Disadvantage on attack rolls until they break free with a Strength Roll (11).",
      },
      {
        name: "Regenerate - Passive",
        description:
          "At the start of each GM turn, if the Bloom Tendrils have not taken fire damage since the last GM turn, clear 1 HP. Fire damage prevents this for one full round.",
      },
    ],
    imageUrl: null,
    source: "homebrew",
    campaignId: null,
    createdAt: "2026-04-02T00:00:00Z",
    updatedAt: "2026-04-02T00:00:00Z",
  },

  {
    adversaryId: "hb-bloom-heart",
    name: "Bloom Heart",
    tier: 1,
    type: "Leader",
    description:
      "At the heart of the Bloom, something pulses. A mass of dense, knotted Creep roughly the size of a wagon, shot through with veins of pale bioluminescence. The tendrils radiate from it. It grows visibly, moment by moment, and with each pulse the Forestdown border lurches another foot outward.",
    difficulty: 12,
    hp: 6,
    stress: 3,
    damageThresholds: { major: 7, severe: 12 },
    attackModifier: 0,
    attackRange: "Close",
    attackDamage: "1d8+2 magical",
    features: [
      {
        name: "Rooted - Passive",
        description:
          "The Bloom Heart cannot move. It does not need to be spotlighted to use its Reaction features.",
      },
      {
        name: "Bloom Expansion - Passive",
        description:
          "At the end of each GM turn, the area of Creep expands. Any PC now within the Creep must make an Agility Reaction Roll (11) or mark a Stress.",
      },
      {
        name: "Call the Swarm",
        description:
          "Spend a Fear. A new Madanikuputukas (Swarm) emerges from the Bloom Heart and is immediately spotlighted.",
      },
      {
        name: "Creep Surge",
        description:
          "When the Bloom Heart takes damage, it releases a wave of Creep energy. All creatures within Close range must make an Agility Reaction Roll (12) or take 1d4 magical damage.",
      },
      {
        name: "Vulnerability - Passive",
        description:
          "The Bloom Heart takes double damage from fire. If destroyed, all Bloom Tendrils lose their Regenerate feature and the Bloom's expansion halts immediately.",
      },
    ],
    imageUrl: null,
    source: "homebrew",
    campaignId: null,
    createdAt: "2026-04-02T00:00:00Z",
    updatedAt: "2026-04-02T00:00:00Z",
  },

  // ── Church of the Revenant God ─────────────────────────────────────────────

  {
    adversaryId: "hb-davidian-knight",
    name: "Davidian Knight",
    tier: 4,
    type: "Bruiser",
    description:
      "A devoted follower of the Revenant God, clad in a white tabard and bearing a single two-handed greatsword. He holds the front line, weathering wounds that would fell lesser men, certain his god will raise him again.",
    difficulty: 20,
    hp: 10,
    stress: 4,
    damageThresholds: { major: 25, severe: 45 },
    attackModifier: 2,
    attackRange: "Melee",
    attackDamage: "4d12+12 physical",
    features: [
      {
        name: "Overwhelming Force - Passive",
        description:
          "Targets who mark HP from the Knight's standard attack are knocked back to Very Close range.",
      },
      {
        name: "Deathless Devotion - Passive",
        description:
          "When the Knight marks HP from an attack, he clears a Stress and gains advantage on his next attack roll.",
      },
      {
        name: "Greatsword Cleave - Action",
        description:
          "Mark a Stress to make a standard attack against all targets within Very Close range.",
      },
      {
        name: "Momentum - Reaction",
        description:
          "When the Knight makes a successful attack against a PC, you gain a Fear.",
      },
    ],
    imageUrl: null,
    source: "homebrew",
    campaignId: null,
    createdAt: "2026-10-01T00:00:00Z",
    updatedAt: "2026-10-01T00:00:00Z",
  },

  {
    adversaryId: "hb-the-petrarch",
    name: "The Petrarch",
    tier: 4,
    type: "Social",
    description:
      "An eight-year-old boy who serves as the figurehead of the Church of the Revenant God. Unremarkable for a child, he is guided — and abused — by his steward, the Chamberlain. His authority is absolute; his will is not his own.",
    difficulty: 20,
    hp: 3,
    stress: 6,
    damageThresholds: { major: 25, severe: 45 },
    attackModifier: 0,
    attackRange: "Melee",
    attackDamage: "4d4 physical",
    features: [
      {
        name: "Boy Prophet - Passive",
        description:
          "The Petrarch's certainty is absolute. PCs have disadvantage on Presence and Deception rolls made against him.",
      },
      {
        name: "Sacrosanct - Passive",
        description:
          "The first time each scene a PC attacks the Petrarch, they must first succeed on an Instinct Reaction Roll (20) or lose the attack and mark a Stress, unable to bring themselves to harm a child.",
      },
      {
        name: "Declare Heresy - Action",
        description:
          "Spend a Fear. The Petrarch names a target within Far range a false prophet. Until the end of the scene, Church adversaries gain advantage on attacks against that target, and that target loses a Hope whenever a Church adversary succeeds on an attack against them.",
      },
      {
        name: "Word of the Revenant - Action",
        description:
          "Mark a Stress. The Petrarch utters a pronouncement. A target within Far range must make a Presence Reaction Roll (20). On a failure, they lose a Hope and become Vulnerable until their next roll with Hope. On a success, they mark a Stress.",
      },
      {
        name: "Sanctified Rebuke - Reaction",
        description:
          "When a PC succeeds on a social action roll against the Petrarch, he responds with unshakeable certainty and you gain a Fear.",
      },
    ],
    imageUrl: null,
    source: "homebrew",
    campaignId: null,
    createdAt: "2026-10-01T00:00:00Z",
    updatedAt: "2026-10-01T00:00:00Z",
  },

  {
    adversaryId: "hb-the-chamberlain",
    name: "The Chamberlain",
    tier: 4,
    type: "Social",
    description:
      "The steward of the Petrarch, who advises the boy on all matters of faith and rules through him. A gaunt, patient manipulator who speaks softly and controls the child completely, using him to root out and punish any false prophet of the Revenant God.",
    difficulty: 20,
    hp: 5,
    stress: 6,
    damageThresholds: { major: 25, severe: 45 },
    attackModifier: 1,
    attackRange: "Melee",
    attackDamage: "4d6 physical",
    features: [
      {
        name: "Voice of the Throne - Passive",
        description:
          "While the Chamberlain is present, PCs have disadvantage on social rolls made against the Petrarch; the Chamberlain intercepts and answers for the boy.",
      },
      {
        name: "Use the Boy as a Shield - Action",
        description:
          "The Chamberlain steps behind the Petrarch. Until the start of the Chamberlain's next spotlight, any PC who attacks the Chamberlain must first succeed on an Instinct Reaction Roll (20). On a failure, their attack targets the Petrarch instead.",
      },
      {
        name: "Interrogation - Action",
        description:
          "Spend a Fear. The Chamberlain interrogates a target within Far range. The target must make an Instinct Reaction Roll (20). On a failure, they reveal a damaging truth — the target marks 2 Stress and all Church adversaries gain advantage on attacks against them until the end of the scene. On a success, the target marks a Stress.",
      },
      {
        name: "Expose the False Prophet - Reaction",
        description:
          "When a PC claims the Revenant God's favor or poses as a prophet, the Chamberlain challenges them. The PC must make a Presence Reaction Roll (20). On a failure, they are exposed as false — they lose 2 Hope and you gain a Fear. On a success, they mark a Stress.",
      },
      {
        name: "Guardian's Wrath - Reaction",
        description:
          "When a PC harms the Petrarch, the Chamberlain marks a Stress and you gain a Fear; the Chamberlain and all Church allies gain advantage on attacks against that PC until the end of the scene.",
      },
    ],
    imageUrl: null,
    source: "homebrew",
    campaignId: null,
    createdAt: "2026-10-01T00:00:00Z",
    updatedAt: "2026-10-01T00:00:00Z",
  },

  {
    adversaryId: "hb-brother-pall",
    name: "Brother Pall",
    tier: 4,
    type: "Solo",
    description:
      "A gaunt, cowled cleric of the Church of the Revenant God. The hollow socket where his Deathseer's Eye once sat is now bandaged and empty — the eye was ripped from his skull. He still carries his long, serpentine dagger, its blade twisting like a corkscrew of bone and black iron.",
    difficulty: 20,
    hp: 11,
    stress: 6,
    damageThresholds: { major: 25, severe: 45 },
    attackModifier: 4,
    attackRange: "Melee",
    attackDamage: "4d10+8 physical",
    features: [
      {
        name: "Relentless (2) - Passive",
        description:
          "Brother Pall can be spotlighted up to two times per GM turn. Spend Fear as usual to spotlight him.",
      },
      {
        name: "Twisted Dagger - Passive",
        description:
          "Brother Pall's corkscrew blade of bone and black iron tears and festers. When he succeeds on a melee attack, the target marks a Stress in addition to taking damage. A target who has marked Stress this way takes an additional d8 damage from his attacks until they clear a Stress.",
      },
      {
        name: "Righteous Flurry - Action",
        description:
          "Mark a Stress to make a standard attack against up to two targets within Melee range.",
      },
      {
        name: "Moment of Revenance - Action",
        description:
          "Spend a Fear. Brother Pall utters a prayer to the Revenant God and dedicates a target within Far range to death. The target must make a Presence Reaction Roll (20). On a failure, they mark 2 Stress and Brother Pall gains advantage on attack rolls against them until the end of the scene. On a success, they mark a Stress.",
      },
      {
        name: "Momentum - Reaction",
        description:
          "When Brother Pall makes a successful attack against a PC, you gain a Fear.",
      },
      {
        name: "Death's Due - Reaction",
        description:
          "When a target within Melee range marks HP from Brother Pall's attack, he twists the blade. They must mark an Armor Slot without gaining its benefit (they can still use armor to reduce the damage).",
      },
    ],
    imageUrl: null,
    source: "homebrew",
    campaignId: null,
    createdAt: "2026-08-12T00:00:00Z",
    updatedAt: "2026-10-01T00:00:00Z",
  },

  // ── Alipinn Aberration ──────────────────────────────────────────────────────

  {
    adversaryId: "hb-mooz",
    name: "Mooz",
    tier: 4,
    type: "Solo",
    description:
      "A horrible, twisted aberration formed from the reformed and reworked bodies of twelve citizens of Alipinn. It shambles on a makeshift skeleton of fallen timbers beneath a stained oil cloth, and when it moves, a chorus of a dozen stolen voices wails from its mass.",
    difficulty: 20,
    hp: 11,
    stress: 7,
    damageThresholds: { major: 25, severe: 45 },
    attackModifier: 6,
    attackRange: "Close",
    attackDamage: "4d12+10 physical",
    features: [
      {
        name: "Relentless (2) - Passive",
        description:
          "Mooz can be spotlighted up to two times per GM turn. Spend Fear as usual to spotlight it.",
      },
      {
        name: "Many Limbs - Passive",
        description:
          "While Mooz has 6 or fewer marked HP, it can make its standard attack against two targets within range.",
      },
      {
        name: "Crushing Bite - Action",
        description:
          "Mark a Stress to make an attack against a target within Melee range. On a success, deal 4d10+12 physical damage and the target is Restrained until they break free with a successful Strength Roll.",
      },
      {
        name: "Flailing Lash - Action",
        description:
          "Mark a Stress to make an attack against all targets within Close range. Targets Mooz succeeds against take 3d12+6 physical damage and are knocked back to Close range.",
      },
      {
        name: "Chorus of Twelve - Action",
        description:
          "Spend a Fear. Twelve voices wail from Mooz's mass. All PCs within Far range must make a Presence Reaction Roll (20). On a failure, they mark a Stress, lose a Hope, and become Vulnerable until their next roll with Hope. On a success, they mark a Stress.",
      },
      {
        name: "Thrash and Regurgitate - Reaction",
        description:
          "When Mooz takes Severe damage, it thrashes and spews a tide of reworked flesh. All creatures within Close range take 3d8 physical damage and must mark a Stress.",
      },
    ],
    imageUrl: null,
    source: "homebrew",
    campaignId: null,
    createdAt: "2026-10-01T00:00:00Z",
    updatedAt: "2026-10-01T00:00:00Z",
  },

  // ── Corrupted Village adversaries ─────────────────────────────────────────

  {
    adversaryId: "hb-the-winnower",
    name: "The Winnower",
    tier: 2,
    type: "Bruiser",
    description:
      "A final-stage reshaped Ayonik the size of a hay-cart, hunched and patient as a reaper. Six arms of fused grain-bone and villager limbs fan from its shoulders; the black crust rings its eyes and mouth, and it moves with the terrible slowness of a body that has already decided what it is. It harvests, and it is not angry — only hungry.",
    difficulty: 14,
    hp: 7,
    stress: 3,
    damageThresholds: { major: 14, severe: 28 },
    attackModifier: 1,
    attackRange: "Very Close",
    attackDamage: "2d12+2 physical",
    features: [
      {
        name: "Noxious Hide - Passive",
        description:
          "The Winnower's skin weeps Creep. All targets within Melee range must succeed on an Agility Reaction Roll (12) or mark a Stress. A character who marks two Stress this way gains the Creep-Touched condition.",
      },
      {
        name: "Reap and Gather - Action",
        description:
          "Mark a Stress to make a standard attack against up to two targets within Very Close range. On a success against a target, that target is also dragged into Melee range and Restrained (break free with a Strength Roll (14)).",
      },
      {
        name: "Momentum - Reaction",
        description:
          "When the Winnower makes a successful attack against a PC, you gain a Fear.",
      },
    ],
    imageUrl: null,
    source: "homebrew",
    campaignId: null,
    createdAt: "2026-10-19T00:00:00Z",
    updatedAt: "2026-10-19T00:00:00Z",
  },

  {
    adversaryId: "hb-the-granary-colossus",
    name: "The Granary Colossus",
    tier: 2,
    type: "Bruiser",
    description:
      "What was once the village granary is now a semi-corporeal column of fused villagers and rotted grain, rooted where it stood, asymmetric and weeping. Faces press up beneath its skin — some still moving their mouths — and the black water it sweats pools in a dark ring around its base. It does not chase; it waits for the Creep to do the chasing.",
    difficulty: 14,
    hp: 7,
    stress: 4,
    damageThresholds: { major: 14, severe: 28 },
    attackModifier: 0,
    attackRange: "Very Close",
    attackDamage: "2d12+3 physical",
    features: [
      {
        name: "Creep Pool - Passive",
        description:
          "At the start of each GM turn, the area within Close range of the Colossus becomes saturated with pooled Creep (this is exposed Creep). A PC who ends their turn within Close range must succeed on an Agility Reaction Roll (12) or mark a Stress; a character who marks two Stress this way gains the Creep-Touched condition. The pool can be ignited by the Ember-Driven Villager or any fire.",
      },
      {
        name: "Semi-Corporeal - Passive",
        description:
          "The Colossus takes half damage from physical attacks.",
      },
      {
        name: "Collapse - Action",
        description:
          "Mark a Stress to sag its whole mass. Make an attack against all targets within Very Close range; targets it succeeds against take 2d6+3 physical damage and are knocked back to Close range.",
      },
      {
        name: "Overflow - Reaction",
        description:
          "When the Colossus takes damage that marks its Major threshold, the Creep Pool surges. All PCs within Close range must succeed on an Agility Reaction Roll (13) or mark a Stress (two Stress → Creep-Touched).",
      },
    ],
    imageUrl: null,
    source: "homebrew",
    campaignId: null,
    createdAt: "2026-10-19T00:00:00Z",
    updatedAt: "2026-10-19T00:00:00Z",
  },

  {
    adversaryId: "hb-the-red-tunic",
    name: "The Red Tunic",
    tier: 2,
    type: "Bruiser",
    description:
      "The child in the red tunic and belt was never resisting — she never needed to drink. She is the forest's own, the one already claimed before the wells were touched, and the village mistook her stillness for innocence. Beneath the tunic she is dihedrally symmetric, too many joints, a face that is only a child's when someone is looking.",
    difficulty: 15,
    hp: 7,
    stress: 3,
    damageThresholds: { major: 14, severe: 28 },
    attackModifier: 2,
    attackRange: "Melee",
    attackDamage: "2d12+4 physical",
    features: [
      {
        name: "Still in Her - Passive",
        description:
          "She wears the image of the village's last innocent: the child who never drank. Until a PC succeeds on an Instinct Reaction Roll (15) to see what she truly is, all PCs have disadvantage on attack rolls against her — they cannot bring themselves to strike a child. Once pierced, the illusion breaks for the whole party, and what remains is worse.",
      },
      {
        name: "Under the Skin - Action",
        description:
          "She presses a too-cold hand to a target within Melee range and leaves a Creep filament beneath the skin. The target must succeed on an Agility Reaction Roll (14) or the filament takes root: at the start of each of the target's turns they mark a Stress and take 1d4 magical damage as it grows toward the heart (two Stress this way → Creep-Touched). The filament can be cut out with a Finesse Roll (15), or burned out (the target takes 1d6 fire damage and the effect ends).",
      },
      {
        name: "Too Many Joints - Action",
        description:
          "Mark a Stress to move up to Far range in a burst of wrong, jointed motion — a crawl that is too fast — then make a standard attack.",
      },
      {
        name: "Noxious Kiss - Reaction",
        description:
          "When a PC within Melee range damages her, she exhales a bloom of Creep into their mouth and eyes. That PC must succeed on an Agility Reaction Roll (14) or take 1d8 magical damage and mark a Stress (two Stress → Creep-Touched).",
      },
    ],
    imageUrl: null,
    source: "homebrew",
    campaignId: null,
    createdAt: "2026-10-19T00:00:00Z",
    updatedAt: "2026-10-19T00:00:00Z",
  },

  {
    adversaryId: "hb-gift-bloated-villager",
    name: "Gift-Bloated Villager",
    tier: 1,
    type: "Minion",
    description:
      "A medial-stage villager whose belly is grossly distended with Creep-touched well-water, lips black-crusted, still muttering \"thank the forest\" as they shamble. They beg you to drink even as they leak. Killing them is the mistake.",
    difficulty: 10,
    hp: 1,
    stress: 1,
    damageThresholds: { major: null, severe: null },
    attackModifier: -2,
    attackRange: "Melee",
    attackDamage: "2 physical",
    features: [
      {
        name: "Minion (3) - Passive",
        description:
          "This adversary is defeated when they take any damage. For every 3 damage a PC deals to them, defeat an additional Minion within range the attack would succeed against.",
      },
      {
        name: "Creep Payload - Passive",
        description:
          "When this adversary is defeated, they burst. All targets within Close range must succeed on an Agility Reaction Roll (12) or mark a Stress (two Stress → Creep-Touched). Their body then leaves exposed Creep in its space, which an Ember-Driven Villager can ignite.",
      },
      {
        name: "Group Attack - Action",
        description:
          "Spend a Fear to choose a target and spotlight all Gift-Bloated Villagers within Close range of them. Those Minions move into Melee range of the target and make one shared attack roll. On a success, they deal 2 physical damage each. Combine this damage.",
      },
    ],
    imageUrl: null,
    source: "homebrew",
    campaignId: null,
    createdAt: "2026-10-19T00:00:00Z",
    updatedAt: "2026-10-19T00:00:00Z",
  },

  {
    adversaryId: "hb-ember-driven-villager",
    name: "Ember-Driven Villager",
    tier: 1,
    type: "Minion",
    description:
      "A medial-stage villager clutching a stolen ember in a cracked clay cup, eyes hollow as lantern-sockets, jaw slack with lockjaw. They are drawn, inexorably and silently, toward any black water they can see — and they mean to set it burning.",
    difficulty: 10,
    hp: 1,
    stress: 1,
    damageThresholds: { major: null, severe: null },
    attackModifier: -2,
    attackRange: "Melee",
    attackDamage: "2 physical",
    features: [
      {
        name: "Minion (3) - Passive",
        description:
          "This adversary is defeated when they take any damage. For every 3 damage a PC deals to them, defeat an additional Minion within range the attack would succeed against.",
      },
      {
        name: "Compelled to Kindle - Passive",
        description:
          "If any exposed Creep is present in the scene, this villager is compelled to ignite it. At the GM's next opportunity it moves to the exposed Creep and lights it, applying the Burning Creep environment's effects to the scene. It cannot be dissuaded except by being slain, restrained, or the party removing or covering all exposed Creep. It will not attack while there is Creep to burn.",
      },
      {
        name: "Group Attack - Action",
        description:
          "Spend a Fear to choose a target and spotlight all Ember-Driven Villagers within Close range of them. Those Minions move into Melee range of the target and make one shared attack roll. On a success, they deal 2 physical damage each. Combine this damage.",
      },
    ],
    imageUrl: null,
    source: "homebrew",
    campaignId: null,
    createdAt: "2026-10-19T00:00:00Z",
    updatedAt: "2026-10-19T00:00:00Z",
  },

  {
    adversaryId: "hb-mooz-keeper-of-the-gift",
    name: "Mooz, Keeper of the Gift",
    tier: 3,
    type: "Social",
    description:
      "Two tons of reshaped flesh, yet she kept her face, her memory, and her voice — because she chose the gift, and the forest lets the willing keep who they were. Mooz is not lying: she genuinely believes the forest is saving this town, and she will press that mercy on you with the tenderness of something that has forgotten you might say no.",
    difficulty: 17,
    hp: 6,
    stress: 5,
    damageThresholds: { major: 16, severe: 32 },
    attackModifier: 0,
    attackRange: "Very Close",
    attackDamage: "3d4+2 physical",
    features: [
      {
        name: "Unbidden Knowing - Passive",
        description:
          "Mooz knows things she was never told. The first time each scene a PC tries to lie to her, conceal a plan, or discuss her in secret, she finishes their sentence or names a memory they never shared. That PC must succeed on a Presence Reaction Roll (17) or mark a Stress and gain disadvantage on their next action roll against her.",
      },
      {
        name: "Sincere as the Rot - Passive",
        description:
          "Mooz is not deceiving anyone. Attempts to detect deception, catch her in a lie, or shake her conviction by exposing a falsehood fail automatically — there is no falsehood to expose. A PC may still negotiate, refuse, or persuade her to wait, but they cannot win by proving her wrong.",
      },
      {
        name: "Offer the Cup - Action",
        description:
          "Mooz proffers the well-water to a target within Close range. The target must succeed on a Presence Reaction Roll (17) or take one step toward the water and mark a Stress. A target may spend 1 Hope before rolling to gain advantage. If the target chooses to drink, resolve with the Aura of Compulsion's \"The Cure Is the Corruption.\"",
      },
      {
        name: "Speak in Their Voice - Action",
        description:
          "Mooz quotes a lost memory or a dead loved one in the character's own remembered voice. The target must succeed on a Presence Reaction Roll (17); on a failure they must spend 1 Hope or mark 2 Stress.",
      },
      {
        name: "A Gift Is a Debt - Reaction",
        description:
          "Once per scene, when a PC who has accepted any gift from Mooz or the forest (including drinking the water) takes an action against her, you may spend a Fear to force that PC to mark a Stress or spend a Hope as the forest asserts its claim.",
      },
    ],
    imageUrl: null,
    source: "homebrew",
    campaignId: null,
    createdAt: "2026-10-19T00:00:00Z",
    updatedAt: "2026-10-19T00:00:00Z",
  },
];

// ─── Adversary Catalog Store ──────────────────────────────────────────────────

interface AdversaryCatalogState {
  adversaries: Adversary[];
  add: (data: Omit<Adversary, "adversaryId" | "createdAt" | "updatedAt">) => void;
  update: (adversaryId: string, data: Partial<Adversary>) => void;
  remove: (adversaryId: string) => void;
}

const useAdversaryCatalogStore = create<AdversaryCatalogState>((set) => ({
  adversaries: SEED_ADVERSARIES,

  add: (data) => {
    const now = new Date().toISOString();
    const adversary: Adversary = {
      ...data,
      adversaryId: nanoid(),
      createdAt: now,
      updatedAt: now,
    };
    set((state) => ({
      adversaries: [...state.adversaries, adversary],
    }));
  },

  update: (adversaryId, data) => {
    set((state) => ({
      adversaries: state.adversaries.map((a) =>
        a.adversaryId === adversaryId
          ? { ...a, ...data, updatedAt: new Date().toISOString() }
          : a
      ),
    }));
  },

  remove: (adversaryId) => {
    set((state) => ({
      adversaries: state.adversaries.filter((a) => a.adversaryId !== adversaryId),
    }));
  },
}));

// ─── Public Hook ──────────────────────────────────────────────────────────────

/**
 * Hook providing the adversary catalog for a campaign.
 * Filters to show both global (SRD) adversaries and campaign-specific homebrew.
 *
 * When a backend API exists, this will be replaced with TanStack Query calls.
 */
export function useAdversaries(campaignId: string) {
  const { adversaries: all, add, update, remove } = useAdversaryCatalogStore();

  // Show adversaries that are either global (campaignId=null) or belong to this campaign
  const adversaries = useMemo(
    () => all.filter((a) => a.campaignId === null || a.campaignId === campaignId),
    [all, campaignId]
  );

  const addAdversary = useCallback(
    (data: Omit<Adversary, "adversaryId" | "createdAt" | "updatedAt">) => {
      add(data);
    },
    [add]
  );

  const updateAdversary = useCallback(
    (adversaryId: string, data: Partial<Adversary>) => {
      update(adversaryId, data);
    },
    [update]
  );

  const deleteAdversary = useCallback(
    (adversaryId: string) => {
      remove(adversaryId);
    },
    [remove]
  );

  return {
    adversaries,
    isLoading: false, // Stub — will be driven by TanStack Query later
    addAdversary,
    updateAdversary,
    deleteAdversary,
  };
}
