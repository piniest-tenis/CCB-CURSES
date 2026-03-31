"use client";

/**
 * src/hooks/useEnvironments.ts
 *
 * Manages the environment catalog.
 * Currently backed by a Zustand store with seed data from
 * markdown/Environments/ — will migrate to TanStack Query + backend API
 * when environment CRUD endpoints exist.
 */

import { useCallback, useMemo } from "react";
import { create } from "zustand";
import type { Environment } from "@/types/adversary";

// ─── Seed Data ────────────────────────────────────────────────────────────────
// Imported from markdown/Environments/

const SEED_ENVIRONMENTS: Environment[] = [
  {
    environmentId: "hb-burning-creep",
    name: "Burning Creep",
    tier: 1,
    type: "Hazard",
    description:
      "Something here has lit the Creep on fire. The thick black acrid smoke is damaging to the lungs, and prolonged exposure may lead to onset of Creep sickness. The agitated Creep has led to a greater chance of encountering enraged Etherotaxia.",
    tone: ["Violent", "Mournful"],
    difficulty: 10,
    features: [
      {
        name: "Thick Smoke - Passive",
        description:
          "While in Burning Creep, players must make Instinct rolls to travel more than Close Range. The thick black smoke obscures everything beyond a distance, making navigation impossible.",
        isPassive: true,
      },
      {
        name: "Toxic Smoke - Passive",
        description:
          "While in Burning Creep, players take d6 magical damage before they make any action roll. This cannot be reduced by Armor. The toxic fumes burn and scar tissues and the acidic accretions etch even hard carapaces.",
        isPassive: true,
      },
      {
        name: "Etherotaxic Defender",
        description:
          "Once per scene, you can summon an enraged Creep-Bound Etherotaxic entity. Spend 2 Fear to have an Etherotaxic creature added to the encounter appropriate to the party's tier. Disturbing the piles of the matted and burning Creep can cause trapped Etherotaxia to spring free in an angered and panicked state.",
        isPassive: false,
      },
    ],
    potentialAdversaryNames: [
      "Madanikuputukas (Swarm)",
      "Kuputuka",
      "Creep-Bound Etherotaxic Entity (Lesser)",
      "Creep-Bound Etherotaxic Entity (Greater)",
    ],
    source: "homebrew",
    createdAt: "2026-03-29T00:00:00Z",
    updatedAt: "2026-03-29T00:00:00Z",
  },
  {
    environmentId: "hb-creep-infestation",
    name: "Creep Infestation",
    tier: 1,
    type: "Hazard",
    description:
      "The gnarled dark undergrowth of Forestdown has spread itself into this area, and it carries with it all the dangers of its progenitor.",
    tone: ["Otherworldly", "Psychedelic", "Quietly Threatening"],
    difficulty: 12,
    features: [
      {
        name: "Distortion Field - Passive",
        description:
          "While in a Creep Infestation, players must make a Presence Roll (13) or move further into the Creep. Rescued children reported that they were walking out of the woods for hours, despite wandering the whole time ever deeper into Forestdown.",
        isPassive: true,
      },
      {
        name: "Ethereal Presence - Passive",
        description:
          "While in a Creep Infestation, players are unnaturally calm. For every two actions taken in the Creep, they clear 1 Stress. The deeper the wanderers were found, the more at peace they seemed with their surroundings despite the horrible changes inflicted upon them.",
        isPassive: true,
      },
      {
        name: "Transformative Stab",
        description:
          "Spend a Fear. A target that has cleared 2 Stress while in a Creep Infestation must make a Presence Roll (15) or take 2d6 magical damage and gain a permanent alteration to their body.",
        isPassive: false,
      },
    ],
    potentialAdversaryNames: [
      "Madanikuputukas (Swarm)",
      "Kuputuka",
    ],
    source: "homebrew",
    createdAt: "2026-03-29T00:00:00Z",
    updatedAt: "2026-03-29T00:00:00Z",
  },
];

// ─── Environment Catalog Store ────────────────────────────────────────────────

interface EnvironmentCatalogState {
  environments: Environment[];
  add: (data: Omit<Environment, "environmentId" | "createdAt" | "updatedAt">) => void;
  update: (environmentId: string, data: Partial<Environment>) => void;
  remove: (environmentId: string) => void;
}

function nanoid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

const useEnvironmentCatalogStore = create<EnvironmentCatalogState>((set) => ({
  environments: SEED_ENVIRONMENTS,

  add: (data) => {
    const now = new Date().toISOString();
    const env: Environment = {
      ...data,
      environmentId: nanoid(),
      createdAt: now,
      updatedAt: now,
    };
    set((state) => ({
      environments: [...state.environments, env],
    }));
  },

  update: (environmentId, data) => {
    set((state) => ({
      environments: state.environments.map((e) =>
        e.environmentId === environmentId
          ? { ...e, ...data, updatedAt: new Date().toISOString() }
          : e
      ),
    }));
  },

  remove: (environmentId) => {
    set((state) => ({
      environments: state.environments.filter(
        (e) => e.environmentId !== environmentId
      ),
    }));
  },
}));

// ─── Public Hook ──────────────────────────────────────────────────────────────

export function useEnvironments() {
  const { environments, add, update, remove } = useEnvironmentCatalogStore();

  const addEnvironment = useCallback(
    (data: Omit<Environment, "environmentId" | "createdAt" | "updatedAt">) => {
      add(data);
    },
    [add]
  );

  const updateEnvironment = useCallback(
    (environmentId: string, data: Partial<Environment>) => {
      update(environmentId, data);
    },
    [update]
  );

  const deleteEnvironment = useCallback(
    (environmentId: string) => {
      remove(environmentId);
    },
    [remove]
  );

  return {
    environments,
    isLoading: false,
    addEnvironment,
    updateEnvironment,
    deleteEnvironment,
  };
}
