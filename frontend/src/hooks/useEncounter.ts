"use client";

/**
 * src/hooks/useEncounter.ts
 *
 * Convenience hook wrapping the encounterStore.
 * Provides derived state (active/defeated splits, status booleans)
 * and re-exports all store actions for component consumption.
 */

import { useMemo } from "react";
import { useEncounterStore } from "@/store/encounterStore";

export function useEncounter() {
  const store = useEncounterStore();

  const activeAdversaries = useMemo(
    () => store.encounter?.adversaries.filter((a) => !a.isDefeated) ?? [],
    [store.encounter?.adversaries]
  );

  const defeatedAdversaries = useMemo(
    () => store.encounter?.adversaries.filter((a) => a.isDefeated) ?? [],
    [store.encounter?.adversaries]
  );

  const isActive    = store.encounter?.status === "active";
  const isPreparing = store.encounter?.status === "preparing";
  const isCompleted = store.encounter?.status === "completed";

  return {
    encounter: store.encounter,
    activeAdversaries,
    defeatedAdversaries,
    rollLog: store.rollLog,
    isActive,
    isPreparing,
    isCompleted,

    // Actions — pass through from store
    createEncounter:  store.createEncounter,
    startEncounter:   store.startEncounter,
    endEncounter:     store.endEncounter,
    nextRound:        store.nextRound,
    addAdversary:     store.addAdversary,
    removeAdversary:  store.removeAdversary,
    updateAdversary:  store.updateAdversary,
    defeatAdversary:  store.defeatAdversary,
    restoreAdversary: store.restoreAdversary,
    rollAttack:       store.rollAttack,
    rollDamage:       store.rollDamage,
    clearRollLog:     store.clearRollLog,
    clearEncounter:   store.clearEncounter,
  };
}
