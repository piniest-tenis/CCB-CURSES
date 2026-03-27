"use client";

/**
 * src/components/encounter/DefeatedSection.tsx
 *
 * Collapsed section listing defeated adversaries with restore option.
 * Uses native <details>/<summary> for accessibility.
 */

import React from "react";
import type { EncounterAdversary } from "@/types/adversary";

interface DefeatedSectionProps {
  defeated: EncounterAdversary[];
  onRestore: (instanceId: string) => void;
}

export function DefeatedSection({ defeated, onRestore }: DefeatedSectionProps) {
  if (defeated.length === 0) return null;

  return (
    <details
      className="
        rounded-xl border border-slate-800/40 bg-slate-950/40
        overflow-hidden mt-4
      "
    >
      <summary
        className="
          px-4 py-3 text-xs font-semibold uppercase tracking-widest
          text-[#b9baa3]/40 cursor-pointer
          hover:text-[#b9baa3]/60 hover:bg-slate-900/30
          transition-colors list-none
          flex items-center gap-2
          [&::-webkit-details-marker]:hidden
        "
      >
        <svg
          className="h-3 w-3 transition-transform [[open]>&]:rotate-90"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <path d="M6 4l4 4-4 4" />
        </svg>
        ☠ Defeated ({defeated.length})
      </summary>
      <div className="px-4 py-2 space-y-1 border-t border-slate-800/40">
        {defeated.map((a) => (
          <div
            key={a.instanceId}
            className="flex items-center gap-2 py-1 text-sm text-[#b9baa3]/40 line-through"
          >
            <span>☠</span>
            <span>
              {a.name} {a.label}
            </span>
            <button
              type="button"
              onClick={() => onRestore(a.instanceId)}
              className="ml-auto text-[10px] text-[#577399]/50 hover:text-[#577399] transition-colors"
            >
              Restore
            </button>
          </div>
        ))}
      </div>
    </details>
  );
}
