"use client";

/**
 * src/components/encounter/EncounterHeader.tsx
 *
 * Header bar for the encounter console.
 * Shows encounter name, status badge, round counter, and control buttons.
 */

import React, { useState, useEffect, useRef } from "react";
import type { Encounter } from "@/types/adversary";

interface EncounterHeaderProps {
  encounter: Encounter;
  activeCount: number;
  defeatedCount: number;
  onNextRound: () => void;
  onStartEncounter: () => void;
  onEndEncounter: () => void;
}

export function EncounterHeader({
  encounter,
  activeCount,
  defeatedCount,
  onNextRound,
  onStartEncounter,
  onEndEncounter,
}: EncounterHeaderProps) {
  const [roundFlip, setRoundFlip] = useState(false);
  const prevRound = useRef(encounter.round);

  // Animate round counter on change
  useEffect(() => {
    if (encounter.round !== prevRound.current) {
      prevRound.current = encounter.round;
      setRoundFlip(true);
      const timer = setTimeout(() => setRoundFlip(false), 400);
      return () => clearTimeout(timer);
    }
  }, [encounter.round]);

  const statusStyles =
    encounter.status === "active"
      ? "bg-[#fe5f55]/15 text-[#fe5f55] border border-[#fe5f55]/30"
      : encounter.status === "preparing"
        ? "bg-[#DAA520]/10 text-[#DAA520] border border-[#DAA520]/30"
        : "bg-slate-700/40 text-[#b9baa3] border border-slate-600/40";

  return (
    <div
      className="
        flex flex-wrap items-center justify-between gap-4
        rounded-xl border border-[#577399]/30 bg-slate-900/80
        p-4 shadow-card mb-4
      "
    >
      {/* Left: Title + Status */}
      <div className="flex items-center gap-3 min-w-0">
        <span aria-hidden="true" className="text-xl">
          ⚡
        </span>
        <div className="min-w-0">
          <h2 className="font-serif text-lg font-semibold text-[#f7f7ff] truncate">
            {encounter.name || "Active Encounter"}
          </h2>
          <div className="flex items-center gap-2 mt-0.5">
            <span
              className={`
                inline-flex items-center gap-1 rounded-full px-2 py-0.5
                text-[10px] font-semibold uppercase tracking-wider
                ${statusStyles}
              `}
            >
              {encounter.status === "active" && (
                <span className="h-1.5 w-1.5 rounded-full bg-[#fe5f55] animate-pulse" />
              )}
              {encounter.status}
            </span>
            <span className="text-xs text-[#b9baa3]/50">
              {activeCount} active
              {defeatedCount > 0 && ` · ${defeatedCount} defeated`}
            </span>
          </div>
        </div>
      </div>

      {/* Center: Round counter */}
      <div className="flex items-center gap-3">
        <div className="flex flex-col items-center">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[#b9baa3]/50">
            Round
          </span>
          <span
            role="status"
            aria-live="polite"
            aria-label={`Round ${encounter.round}`}
            className={`
              font-serif text-2xl font-bold text-[#DAA520] leading-none
              ${roundFlip ? "animate-round-flip" : ""}
            `}
          >
            {encounter.round}
          </span>
        </div>

        {encounter.status === "preparing" ? (
          <button
            type="button"
            onClick={onStartEncounter}
            className="
              rounded-lg border border-[#DAA520]/40 bg-[#DAA520]/10
              px-3 py-2 text-xs font-semibold text-[#DAA520]
              hover:bg-[#DAA520]/20 hover:border-[#DAA520]
              transition-all duration-150
              focus:outline-none focus:ring-2 focus:ring-[#DAA520]
            "
          >
            Start Encounter ▶
          </button>
        ) : encounter.status === "active" ? (
          <button
            type="button"
            onClick={onNextRound}
            className="
              rounded-lg border border-[#DAA520]/40 bg-[#DAA520]/10
              px-3 py-2 text-xs font-semibold text-[#DAA520]
              hover:bg-[#DAA520]/20 hover:border-[#DAA520]
              transition-all duration-150
              focus:outline-none focus:ring-2 focus:ring-[#DAA520]
            "
          >
            Next Round ▶
          </button>
        ) : null}
      </div>

      {/* Right: End encounter */}
      {encounter.status !== "completed" && (
        <button
          type="button"
          onClick={onEndEncounter}
          className="
            rounded-lg border border-[#fe5f55]/30 bg-transparent
            px-3 py-2 text-xs font-semibold text-[#fe5f55]/70
            hover:bg-[#fe5f55]/10 hover:text-[#fe5f55] hover:border-[#fe5f55]/50
            transition-colors
          "
        >
          End Encounter
        </button>
      )}
    </div>
  );
}
