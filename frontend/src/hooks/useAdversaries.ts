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

const SEED_ADVERSARIES: Adversary[] = [
  {
    adversaryId: "seed-goblin-skirmisher",
    name: "Goblin Skirmisher",
    tier: 1,
    type: "Minion",
    description:
      "A scrappy, sharp-toothed goblin that fights dirty with jagged blades and stolen weapons. Cowardly alone but vicious in packs.",
    difficulty: 10,
    hp: 3,
    stress: 1,
    damageThresholds: { major: null, severe: null },
    attackModifier: 1,
    attackRange: "Melee",
    attackDamage: "1d6 physical",
    features: [
      {
        name: "Pack Tactics",
        description:
          "When another Goblin Skirmisher is within Close range, this adversary deals +1 damage on attacks.",
      },
    ],
    imageUrl: null,
    source: "homebrew",
    campaignId: null,
    createdAt: "2026-01-15T10:00:00Z",
    updatedAt: "2026-01-15T10:00:00Z",
  },
  {
    adversaryId: "seed-shadowvine-creeper",
    name: "Shadowvine Creeper",
    tier: 1,
    type: "Horde",
    description:
      "A mass of writhing, thorned vines that lurk in darkened ruins, grasping at anything that wanders too close.",
    difficulty: 11,
    hp: 6,
    stress: 2,
    damageThresholds: { major: 4, severe: 7 },
    attackModifier: 2,
    attackRange: "Close",
    attackDamage: "1d4+1 physical",
    features: [
      {
        name: "Entangle",
        description:
          "On a successful attack, the target must make a difficulty 11 Finesse check or become Restrained until the end of their next turn.",
      },
      {
        name: "Rooted",
        description: "Cannot be moved against its will. Immune to the Prone condition.",
      },
    ],
    imageUrl: null,
    source: "homebrew",
    campaignId: null,
    createdAt: "2026-01-15T10:00:00Z",
    updatedAt: "2026-01-15T10:00:00Z",
  },
  {
    adversaryId: "seed-skeletal-knight",
    name: "Skeletal Knight",
    tier: 2,
    type: "Bruiser",
    description:
      "An undead warrior encased in corroded plate, endlessly patrolling ancient crypts. Strikes with relentless precision.",
    difficulty: 14,
    hp: 8,
    stress: 3,
    damageThresholds: { major: 6, severe: 10 },
    attackModifier: 4,
    attackRange: "Melee",
    attackDamage: "2d4+2 physical",
    features: [
      {
        name: "Shield Wall",
        description:
          "Once per round, when hit by a Melee attack, the Skeletal Knight can increase its difficulty by 2 until the start of its next turn.",
      },
      {
        name: "Relentless",
        description:
          "When this adversary would be defeated by Stress, it instead remains at 1 Stress and marks 2 HP. This feature can only trigger once per encounter.",
      },
    ],
    imageUrl: null,
    source: "homebrew",
    campaignId: null,
    createdAt: "2026-01-20T10:00:00Z",
    updatedAt: "2026-01-20T10:00:00Z",
  },
  {
    adversaryId: "seed-plague-rat-swarm",
    name: "Plague Rat Swarm",
    tier: 2,
    type: "Horde",
    description:
      "A chittering mass of diseased vermin that floods through corridors in a living wave. Their bites carry a wasting sickness.",
    difficulty: 12,
    hp: 10,
    stress: 2,
    damageThresholds: { major: 5, severe: 8 },
    attackModifier: 3,
    attackRange: "Melee",
    attackDamage: "1d6+2 physical",
    features: [
      {
        name: "Swarming",
        description:
          "This adversary can occupy the same space as other creatures. Attacks against it that deal less than the minor threshold have no effect.",
      },
      {
        name: "Plague Carrier",
        description:
          "When a creature takes major or severe damage from this adversary, they must succeed on a difficulty 12 Presence check or gain the Poisoned condition.",
      },
    ],
    imageUrl: null,
    source: "homebrew",
    campaignId: null,
    createdAt: "2026-01-22T10:00:00Z",
    updatedAt: "2026-01-22T10:00:00Z",
  },
  {
    adversaryId: "seed-shadow-wraith",
    name: "Shadow Wraith",
    tier: 3,
    type: "Skulk",
    description:
      "A malevolent spirit cloaked in living darkness, drifting silently through walls and stone. Its touch drains the warmth from living flesh.",
    difficulty: 17,
    hp: 12,
    stress: 5,
    damageThresholds: { major: 8, severe: 14 },
    attackModifier: 5,
    attackRange: "Close",
    attackDamage: "1d8+4 magical",
    features: [
      {
        name: "Incorporeal",
        description:
          "Physical attacks deal half damage (round down). This adversary can move through solid objects but cannot end its turn inside one.",
      },
      {
        name: "Life Drain",
        description:
          "When this adversary deals severe damage, it clears 2 of its own marked HP.",
      },
      {
        name: "Shadow Step",
        description:
          "Once per round, this adversary can teleport to any space within Far range that is in dim light or darkness.",
      },
    ],
    imageUrl: null,
    source: "homebrew",
    campaignId: null,
    createdAt: "2026-02-01T10:00:00Z",
    updatedAt: "2026-02-01T10:00:00Z",
  },
  {
    adversaryId: "seed-war-priest-khor",
    name: "War Priest of Khor",
    tier: 3,
    type: "Leader",
    description:
      "A zealot commander wreathed in divine flame, bolstering allies with war chants while smiting heretics with a blazing morningstar.",
    difficulty: 16,
    hp: 14,
    stress: 6,
    damageThresholds: { major: 7, severe: 12 },
    attackModifier: 5,
    attackRange: "Melee",
    attackDamage: "2d6+3 magical",
    features: [
      {
        name: "Battle Hymn",
        description:
          "At the start of each round, all allied adversaries within Close range clear 1 Stress.",
      },
      {
        name: "Divine Smite",
        description:
          "Once per round, when this adversary hits with an attack, it may deal an additional 1d6 magical damage.",
      },
      {
        name: "Aura of Zeal",
        description:
          "Allied adversaries within Close range add +1 to their attack modifier.",
      },
      {
        name: "Last Stand",
        description:
          "When this adversary is defeated, it immediately makes one final attack against a target within range.",
      },
    ],
    imageUrl: null,
    source: "homebrew",
    campaignId: null,
    createdAt: "2026-02-05T10:00:00Z",
    updatedAt: "2026-02-05T10:00:00Z",
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
