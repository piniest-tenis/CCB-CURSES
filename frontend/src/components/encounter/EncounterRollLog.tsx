"use client";

/**
 * src/components/encounter/EncounterRollLog.tsx
 *
 * Collapsible roll history section at the bottom of the encounter console.
 * Records all GM adversary rolls with timestamps.
 */

import React from "react";
import type { AdversaryRollResult } from "@/types/adversary";

interface EncounterRollLogProps {
  rollLog: AdversaryRollResult[];
  onClear: () => void;
}

function formatTime(isoString: string): string {
  try {
    const d = new Date(isoString);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

export function EncounterRollLog({ rollLog, onClear }: EncounterRollLogProps) {
  if (rollLog.length === 0) return null;

  return (
    <section
      className="
        rounded-xl border border-slate-800/60 bg-slate-950/40
        overflow-hidden mt-4
      "
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800/40">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-[#577399]">
          Roll History
        </h3>
        <button
          type="button"
          onClick={onClear}
          className="text-[10px] text-[#b9baa3]/40 hover:text-[#fe5f55] transition-colors"
        >
          Clear
        </button>
      </div>
      <div className="max-h-48 overflow-y-auto px-4 py-2 space-y-1">
        {rollLog.map((roll, i) => (
          <div
            key={`${roll.timestamp}-${i}`}
            className="flex items-center gap-2 text-xs py-1"
          >
            <span className="text-[#b9baa3]/30 font-mono text-[10px] tabular-nums shrink-0">
              {formatTime(roll.timestamp)}
            </span>
            <span className="text-[#b9baa3]/60 truncate">{roll.label}</span>
            <span className="ml-auto font-mono font-bold text-[#f7f7ff] shrink-0">
              {roll.total}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
