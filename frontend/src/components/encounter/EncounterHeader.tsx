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

/** Delay (ms) before the End Encounter confirm button auto-reverts. */
const END_CONFIRM_TIMEOUT = 5000;

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

  // Inline end-encounter confirmation state
  const [endConfirming, setEndConfirming] = useState(false);
  const [endProgress, setEndProgress] = useState(100); // 100 → 0 over timeout
  const endTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const endRafRef = useRef<number | null>(null);
  const endStartRef = useRef<number>(0);

  // Animate round counter on change
  useEffect(() => {
    if (encounter.round !== prevRound.current) {
      prevRound.current = encounter.round;
      setRoundFlip(true);
      const timer = setTimeout(() => setRoundFlip(false), 400);
      return () => clearTimeout(timer);
    }
  }, [encounter.round]);

  // Start / stop the 5-second auto-revert for End Encounter confirmation
  useEffect(() => {
    if (!endConfirming) {
      // Clean up animation
      if (endTimerRef.current) clearTimeout(endTimerRef.current);
      if (endRafRef.current) cancelAnimationFrame(endRafRef.current);
      setEndProgress(100);
      return;
    }

    endStartRef.current = performance.now();

    const tick = (now: number) => {
      const elapsed = now - endStartRef.current;
      const pct = Math.max(0, 100 - (elapsed / END_CONFIRM_TIMEOUT) * 100);
      setEndProgress(pct);
      if (elapsed < END_CONFIRM_TIMEOUT) {
        endRafRef.current = requestAnimationFrame(tick);
      }
    };
    endRafRef.current = requestAnimationFrame(tick);

    endTimerRef.current = setTimeout(() => {
      setEndConfirming(false);
    }, END_CONFIRM_TIMEOUT);

    return () => {
      if (endTimerRef.current) clearTimeout(endTimerRef.current);
      if (endRafRef.current) cancelAnimationFrame(endRafRef.current);
    };
  }, [endConfirming]);

  const handleEndClick = () => {
    if (!endConfirming) {
      setEndConfirming(true);
    } else {
      setEndConfirming(false);
      onEndEncounter();
    }
  };

  // Human-readable status labels
  const statusLabel =
    encounter.status === "active"
      ? "In Combat"
      : encounter.status === "preparing"
        ? "Setting Up"
        : encounter.status;

  const statusSubline =
    encounter.status === "preparing"
      ? "Add adversaries below, then tap Start when ready."
      : null;

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
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#fe5f55] opacity-75" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#fe5f55]" />
                </span>
              )}
              {statusLabel}
            </span>
            <span className="text-xs text-[#b9baa3]/50">
              {activeCount} active
              {defeatedCount > 0 && ` · ${defeatedCount} defeated`}
            </span>
          </div>
          {statusSubline && (
            <p className="text-[10px] text-[#b9baa3]/40 mt-0.5 leading-relaxed">
              {statusSubline}
            </p>
          )}
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
            Start ▶
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

      {/* Right: End encounter (inline confirmation) */}
      {encounter.status !== "completed" && (
        <div className="flex items-center gap-2">
          {endConfirming && (
            <button
              type="button"
              onClick={() => setEndConfirming(false)}
              className="
                rounded-lg border border-slate-700/40 bg-slate-800/40
                px-3 py-2 text-xs font-semibold text-[#b9baa3]/60
                hover:text-[#b9baa3] hover:border-slate-600
                transition-colors
                focus:outline-none focus:ring-2 focus:ring-slate-500
              "
            >
              Cancel
            </button>
          )}
          <div className="relative">
            <button
              type="button"
              onClick={handleEndClick}
              aria-label={endConfirming ? "Confirm end encounter" : "End encounter"}
              className={`
                relative overflow-hidden
                rounded-lg border
                px-3 py-2 text-xs font-semibold
                transition-colors
                focus:outline-none focus:ring-2 focus:ring-[#fe5f55]
                ${
                  endConfirming
                    ? "border-[#fe5f55]/60 bg-[#fe5f55]/10 text-[#fe5f55]"
                    : "border-[#fe5f55]/30 bg-transparent text-[#fe5f55]/70 hover:bg-[#fe5f55]/10 hover:text-[#fe5f55] hover:border-[#fe5f55]/50"
                }
              `}
            >
              {endConfirming ? "⚠ End Encounter" : "End Encounter"}
              {/* Depleting progress underline */}
              {endConfirming && (
                <span
                  aria-hidden="true"
                  className="absolute bottom-0 left-0 h-[2px] bg-[#fe5f55]/40 transition-none"
                  style={{ width: `${endProgress}%` }}
                />
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
