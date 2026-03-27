"use client";

/**
 * src/components/encounter/EncounterConsole.tsx
 *
 * Main encounter view that assembles the encounter header, adversary rows,
 * defeated section, quick-add panel, and roll log into a cohesive console.
 */

import React, { useCallback } from "react";
import type { Adversary } from "@/types/adversary";
import { useEncounter } from "@/hooks/useEncounter";
import { useAdversaries } from "@/hooks/useAdversaries";
import { EncounterHeader } from "./EncounterHeader";
import { EncounterAdversaryRow } from "./EncounterAdversaryRow";
import { DefeatedSection } from "./DefeatedSection";
import { QuickAddPanel } from "./QuickAddPanel";
import { EncounterRollLog } from "./EncounterRollLog";

interface EncounterConsoleProps {
  campaignId: string;
  /** Called when user clicks "Browse Catalog →" — switches to adversaries tab. */
  onOpenCatalog?: () => void;
}

export function EncounterConsole({ campaignId, onOpenCatalog }: EncounterConsoleProps) {
  const {
    encounter,
    activeAdversaries,
    defeatedAdversaries,
    rollLog,
    createEncounter,
    startEncounter,
    endEncounter,
    nextRound,
    addAdversary,
    updateAdversary,
    defeatAdversary,
    restoreAdversary,
    rollAttack,
    rollDamage,
    clearRollLog,
    clearEncounter,
  } = useEncounter();

  const { adversaries } = useAdversaries(campaignId);

  const handleAddAdversary = useCallback(
    (adversary: Adversary) => {
      addAdversary(adversary);
    },
    [addAdversary]
  );

  const handleOpenCatalog = useCallback(() => {
    onOpenCatalog?.();
  }, [onOpenCatalog]);

  // No active encounter — show empty state with "New Encounter" button
  if (!encounter) {
    return (
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-serif text-sm font-semibold uppercase tracking-widest text-[#577399]">
            Encounter
          </h2>
        </div>

        <div
          className="
            flex flex-col items-center justify-center
            min-h-[400px] rounded-2xl
            border border-dashed border-slate-700/50
            text-center space-y-3
          "
          style={{ background: "rgba(254,95,85,0.02)" }}
        >
          <div aria-hidden="true" className="text-4xl opacity-20">
            ⚔️
          </div>
          <p className="font-serif text-lg text-[#f7f7ff]/60">No active encounter</p>
          <p className="text-sm text-[#b9baa3]/40 max-w-xs">
            Start an encounter by adding adversaries from your catalog.
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => createEncounter(campaignId)}
              className="
                rounded-lg border border-[#577399]/40 bg-[#577399]/10
                px-4 py-2 text-sm font-semibold text-[#577399]
                hover:bg-[#577399]/20 hover:border-[#577399] hover:text-[#f7f7ff]
                transition-all duration-150
                focus:outline-none focus:ring-2 focus:ring-[#577399]
              "
            >
              New Encounter
            </button>
            {onOpenCatalog && (
              <button
                type="button"
                onClick={handleOpenCatalog}
                className="
                  rounded-lg border border-slate-700/60 bg-transparent
                  px-4 py-2 text-sm font-medium text-[#b9baa3]/60
                  hover:border-slate-600 hover:text-[#b9baa3]
                  transition-colors
                "
              >
                Browse Adversaries →
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Completed encounter — show summary and option to start new
  if (encounter.status === "completed") {
    return (
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-serif text-sm font-semibold uppercase tracking-widest text-[#577399]">
            Encounter
          </h2>
        </div>

        <div
          className="
            flex flex-col items-center justify-center
            min-h-[300px] rounded-2xl
            border border-dashed border-slate-700/50
            text-center space-y-3
          "
          style={{ background: "rgba(87,115,153,0.03)" }}
        >
          <div aria-hidden="true" className="text-4xl opacity-30">
            🏁
          </div>
          <p className="font-serif text-lg text-[#f7f7ff]/60">
            &ldquo;{encounter.name}&rdquo; — Complete
          </p>
          <p className="text-sm text-[#b9baa3]/40">
            {encounter.round} rounds · {encounter.adversaries.length} adversaries ·{" "}
            {encounter.adversaries.filter((a) => a.isDefeated).length} defeated
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => clearEncounter()}
              className="
                rounded-lg border border-[#577399]/40 bg-[#577399]/10
                px-4 py-2 text-sm font-semibold text-[#577399]
                hover:bg-[#577399]/20 hover:border-[#577399] hover:text-[#f7f7ff]
                transition-all duration-150
                focus:outline-none focus:ring-2 focus:ring-[#577399]
              "
            >
              New Encounter
            </button>
          </div>
        </div>

        {/* Still show roll log from the completed encounter */}
        <EncounterRollLog rollLog={rollLog} onClear={clearRollLog} />
      </div>
    );
  }

  // Active / Preparing encounter
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-serif text-sm font-semibold uppercase tracking-widest text-[#577399]">
          Encounter
        </h2>
      </div>

      {/* Header */}
      <EncounterHeader
        encounter={encounter}
        activeCount={activeAdversaries.length}
        defeatedCount={defeatedAdversaries.length}
        onNextRound={nextRound}
        onStartEncounter={startEncounter}
        onEndEncounter={endEncounter}
      />

      {/* Active adversary rows */}
      {activeAdversaries.length === 0 && (
        <div className="rounded-xl border border-dashed border-slate-700/40 bg-slate-950/20 p-6 text-center">
          <p className="text-sm text-[#b9baa3]/40">
            No adversaries in this encounter yet. Use quick-add below or browse the catalog.
          </p>
        </div>
      )}

      <div className="space-y-3">
        {activeAdversaries.map((instance) => (
          <EncounterAdversaryRow
            key={instance.instanceId}
            instance={instance}
            onUpdate={updateAdversary}
            onRollAttack={rollAttack}
            onRollDamage={rollDamage}
            onDefeat={defeatAdversary}
          />
        ))}
      </div>

      {/* Defeated section */}
      <DefeatedSection
        defeated={defeatedAdversaries}
        onRestore={restoreAdversary}
      />

      {/* Quick-add panel */}
      <QuickAddPanel
        adversaries={adversaries}
        onAddAdversary={handleAddAdversary}
        onOpenCatalog={handleOpenCatalog}
      />

      {/* Roll log */}
      <EncounterRollLog rollLog={rollLog} onClear={clearRollLog} />
    </div>
  );
}
