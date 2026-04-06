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
