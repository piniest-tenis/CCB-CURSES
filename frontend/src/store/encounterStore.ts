/**
 * src/store/encounterStore.ts
 *
 * Zustand store for the Encounter Console.
 * Manages the live encounter state: adversary instances, HP/Stress tracking,
 * round counter, and inline dice rolls. Entirely client-side for now.
 *
 * Pattern mirrors campaignStore.ts and diceStore.ts.
 */

import { create } from "zustand";
import type {
  Adversary,
  EncounterAdversary,
  Encounter,
  EncounterStatus,
  AdversaryRollResult,
} from "@/types/adversary";
import { parseDiceNotation, rollDice } from "@/lib/diceNotation";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function nanoid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface EncounterState {
  /** The currently active encounter, or null. */
  encounter: Encounter | null;
  /** Roll history for the encounter (most-recent first, capped at 50). */
  rollLog: AdversaryRollResult[];
}

interface EncounterActions {
  /** Create a new encounter in "preparing" status. */
  createEncounter: (campaignId: string, name?: string) => void;
  /** Transition to "active" status. */
  startEncounter: () => void;
  /** Transition to "completed" status. */
  endEncounter: () => void;
  /** Increment the round counter. */
  nextRound: () => void;
  /** Add an adversary instance from a catalog template. */
  addAdversary: (adversary: Adversary, label?: string) => void;
  /** Remove an adversary instance entirely. */
  removeAdversary: (instanceId: string) => void;
  /** Partially update a live adversary instance (HP, Stress, conditions, etc.). */
  updateAdversary: (
    instanceId: string,
    updates: Partial<
      Pick<EncounterAdversary, "hpMarked" | "stressMarked" | "conditions" | "notes" | "isDefeated">
    >
  ) => void;
  /** Mark an adversary as defeated. */
  defeatAdversary: (instanceId: string) => void;
  /** Restore a defeated adversary to active. */
  restoreAdversary: (instanceId: string) => void;
  /** Roll 2d12 + attackModifier for an adversary. Returns the result. */
  rollAttack: (instance: EncounterAdversary) => AdversaryRollResult;
  /** Roll damage dice (parsed from attackDamage notation). Returns the result. */
  rollDamage: (instance: EncounterAdversary) => AdversaryRollResult;
  /** Clear the encounter roll log. */
  clearRollLog: () => void;
  /** Reset encounter to null. */
  clearEncounter: () => void;
}

export type EncounterStore = EncounterState & EncounterActions;

// ─── Store ────────────────────────────────────────────────────────────────────

export const useEncounterStore = create<EncounterStore>((set, get) => ({
  // ── State ────────────────────────────────────────────────────────────────
  encounter: null,
  rollLog: [],

  // ── createEncounter ──────────────────────────────────────────────────────
  createEncounter: (campaignId, name) => {
    const now = new Date().toISOString();
    set({
      encounter: {
        encounterId: nanoid(),
        campaignId,
        name: name ?? "Encounter",
        status: "preparing",
        adversaries: [],
        round: 1,
        createdAt: now,
        updatedAt: now,
      },
      rollLog: [],
    });
  },

  // ── startEncounter ───────────────────────────────────────────────────────
  startEncounter: () => {
    set((state) => {
      if (!state.encounter) return state;
      return {
        encounter: {
          ...state.encounter,
          status: "active" as EncounterStatus,
          updatedAt: new Date().toISOString(),
        },
      };
    });
  },

  // ── endEncounter ─────────────────────────────────────────────────────────
  endEncounter: () => {
    set((state) => {
      if (!state.encounter) return state;
      return {
        encounter: {
          ...state.encounter,
          status: "completed" as EncounterStatus,
          updatedAt: new Date().toISOString(),
        },
      };
    });
  },

  // ── nextRound ────────────────────────────────────────────────────────────
  nextRound: () => {
    set((state) => {
      if (!state.encounter) return state;
      return {
        encounter: {
          ...state.encounter,
          round: state.encounter.round + 1,
          updatedAt: new Date().toISOString(),
        },
      };
    });
  },

  // ── addAdversary ─────────────────────────────────────────────────────────
  addAdversary: (adversary, label) => {
    set((state) => {
      if (!state.encounter) return state;

      // Auto-label: count existing instances of the same template
      const existingCount = state.encounter.adversaries.filter(
        (a) => a.adversaryId === adversary.adversaryId
      ).length;
      const autoLabel =
        label ?? String.fromCharCode(65 + existingCount); // A, B, C…

      const instance: EncounterAdversary = {
        instanceId: nanoid(),
        adversaryId: adversary.adversaryId,
        name: adversary.name,
        label: autoLabel,
        difficulty: adversary.difficulty,
        hpMarked: 0,
        hpMax: adversary.hp,
        stressMarked: 0,
        stressMax: adversary.stress,
        damageThresholds: { ...adversary.damageThresholds },
        attackModifier: adversary.attackModifier,
        attackRange: adversary.attackRange,
        attackDamage: adversary.attackDamage,
        features: adversary.features.map((f) => ({ ...f })),
        conditions: [],
        isDefeated: false,
        notes: "",
      };

      return {
        encounter: {
          ...state.encounter,
          adversaries: [...state.encounter.adversaries, instance],
          updatedAt: new Date().toISOString(),
        },
      };
    });
  },

  // ── removeAdversary ──────────────────────────────────────────────────────
  removeAdversary: (instanceId) => {
    set((state) => {
      if (!state.encounter) return state;
      return {
        encounter: {
          ...state.encounter,
          adversaries: state.encounter.adversaries.filter(
            (a) => a.instanceId !== instanceId
          ),
          updatedAt: new Date().toISOString(),
        },
      };
    });
  },

  // ── updateAdversary ──────────────────────────────────────────────────────
  updateAdversary: (instanceId, updates) => {
    set((state) => {
      if (!state.encounter) return state;
      return {
        encounter: {
          ...state.encounter,
          adversaries: state.encounter.adversaries.map((a) => {
            if (a.instanceId !== instanceId) return a;
            const updated = { ...a, ...updates };
            // Clamp HP and Stress to valid ranges
            updated.hpMarked = Math.max(0, Math.min(updated.hpMarked, updated.hpMax));
            updated.stressMarked = Math.max(0, Math.min(updated.stressMarked, updated.stressMax));
            return updated;
          }),
          updatedAt: new Date().toISOString(),
        },
      };
    });
  },

  // ── defeatAdversary ──────────────────────────────────────────────────────
  defeatAdversary: (instanceId) => {
    get().updateAdversary(instanceId, { isDefeated: true });
  },

  // ── restoreAdversary ─────────────────────────────────────────────────────
  restoreAdversary: (instanceId) => {
    get().updateAdversary(instanceId, { isDefeated: false });
  },

  // ── rollAttack ───────────────────────────────────────────────────────────
  // Daggerheart adversary attacks: 1d20 + attackModifier vs PC Evasion (GM's Die).
  // Natural 20 = critical (auto-success + bonus damage).
  rollAttack: (instance) => {
    const d20 = Math.floor(Math.random() * 20) + 1;
    const total = d20 + instance.attackModifier;
    const isCritical = d20 === 20;

    const result: AdversaryRollResult = {
      instanceId: instance.instanceId,
      label: `Attack — ${instance.name} ${instance.label}`.trim(),
      diceValues: [d20],
      diceNotation: `1d20+${instance.attackModifier}`,
      modifier: instance.attackModifier,
      total,
      isCritical,
      timestamp: new Date().toISOString(),
    };

    set((state) => ({
      rollLog: [result, ...state.rollLog].slice(0, 50),
    }));

    return result;
  },

  // ── rollDamage ───────────────────────────────────────────────────────────
  rollDamage: (instance) => {
    const parsed = parseDiceNotation(instance.attackDamage);
    const { values, total } = rollDice(parsed);

    const result: AdversaryRollResult = {
      instanceId: instance.instanceId,
      label: `Damage — ${instance.name} ${instance.label}`.trim(),
      diceValues: values,
      diceNotation: instance.attackDamage.split(" ")[0], // e.g. "2d4+2"
      modifier: parsed.modifier,
      total,
      isCritical: false,
      timestamp: new Date().toISOString(),
    };

    set((state) => ({
      rollLog: [result, ...state.rollLog].slice(0, 50),
    }));

    return result;
  },

  // ── clearRollLog ─────────────────────────────────────────────────────────
  clearRollLog: () => set({ rollLog: [] }),

  // ── clearEncounter ───────────────────────────────────────────────────────
  clearEncounter: () => set({ encounter: null, rollLog: [] }),
}));
