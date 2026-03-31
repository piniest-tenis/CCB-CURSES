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
        name: "Thick Smoke",
        description:
          "While in Burning Creep, players must make an Instinct roll (DC 10) to travel more than Close Range.",
        flavorText:
          "The thick black smoke obscures everything beyond a distance, making navigation impossible.",
        isPassive: true,
        rollSpec: {
          label: "Instinct — Navigate Thick Smoke",
          type: "action",
          dice: [
            { size: "d12", role: "hope",  label: "Hope" },
            { size: "d12", role: "fear",  label: "Fear" },
          ],
          difficulty: 10,
        },
      },
      {
        name: "Toxic Smoke",
        description:
          "While in Burning Creep, players take d6 magical damage before they make any action roll. This cannot be reduced by Armor.",
        flavorText:
          "The toxic fumes burn and scar tissues and the acidic accretions etch even hard carapaces. Staying too long is a dangerous proposition for all but the most hardy creatures.",
        isPassive: true,
      },
      {
        name: "Etherotaxic Defender",
        description:
          "Once per scene, spend 2 Fear to summon an enraged Creep-Bound Etherotaxic creature appropriate to the party's tier.",
        flavorText:
          "Disturbing the piles of matted, burning Creep can cause trapped Etherotaxia to spring free in an angered and panicked state.",
        isPassive: false,
        fearCost: 2,
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
        name: "Distortion Field",
        description:
          "While in a Creep Infestation, players must make a Presence roll (DC 13) or move further into the Creep.",
        flavorText:
          "Rescued children reported that they were walking out of the woods for hours, despite wandering the whole time ever deeper into Forestdown.",
        isPassive: true,
        rollSpec: {
          label: "Presence — Resist Distortion Field",
          type: "action",
          dice: [
            { size: "d12", role: "hope",  label: "Hope" },
            { size: "d12", role: "fear",  label: "Fear" },
          ],
          difficulty: 13,
        },
      },
      {
        name: "Ethereal Presence",
        description:
          "While in a Creep Infestation, players are unnaturally calm. For every two actions taken in the Creep, they clear 1 Stress.",
        flavorText:
          "The deeper the wanderers were found, the more at peace they seemed with their surroundings despite the horrible changes inflicted upon them.",
        isPassive: true,
      },
      {
        name: "Transformative Stab",
        description:
          "Spend a Fear. A target that has cleared 2 Stress while in a Creep Infestation must make a Presence roll (DC 15) or take 2d6 magical damage and gain a permanent alteration to their body.",
        flavorText:
          "Only after we'd burned out most of the incursion did we find Commander Orillee. Or, what we assumed was her. It wore her uniform, but the carcass resembled no living thing any of the Hospitallers present had ever seen.",
        isPassive: false,
        fearCost: 1,
        rollSpec: {
          label: "Presence — Resist Transformative Stab",
          type: "action",
          dice: [
            { size: "d12", role: "hope",  label: "Hope" },
            { size: "d12", role: "fear",  label: "Fear" },
          ],
          difficulty: 15,
        },
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
