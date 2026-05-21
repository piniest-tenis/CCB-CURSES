"use client";

/**
 * src/components/srd/SRDDrillDownHeader.tsx
 *
 * Level 1 header for the drill-down navigation — shows a "← All Sections"
 * back button, the current section name with an entry count badge, and a
 * gold gradient divider line.
 */

import React from "react";

// ─── Props ────────────────────────────────────────────────────────────────────

interface SRDDrillDownHeaderProps {
  /** Display label for the current section (e.g. "Ancestries"). */
  sectionLabel: string;
  /** Number of entries in this section. */
  count: number;
  /** Called when the user clicks the back button to return to Level 0. */
  onBack: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function SRDDrillDownHeader({
  sectionLabel,
  count,
  onBack,
}: SRDDrillDownHeaderProps) {
  return (
    <div className="mb-6 space-y-3">
      {/* Back button */}
      <button
        type="button"
        onClick={onBack}
        className="
          inline-flex items-center gap-2 rounded-md px-2 py-1
          text-sm font-medium text-gold-400
          transition-colors hover:text-gold-300 hover:bg-gold-400/10
          focus:outline-none focus:ring-2 focus:ring-gold-400 focus:ring-offset-2 focus:ring-offset-[#0a100d]
        "
      >
        <i className="fa-solid fa-arrow-left text-xs" aria-hidden="true" />
        All Sections
      </button>

      {/* Section heading + count */}
      <div className="flex items-baseline gap-3">
        <h2 className="font-serif text-2xl font-bold text-[#f7f7ff]">
          {sectionLabel}
        </h2>
        {count > 0 && (
          <span className="rounded-full bg-gold-400/15 px-2.5 py-0.5 text-xs font-bold tabular-nums text-gold-400">
            {count}
          </span>
        )}
      </div>

      {/* Gold gradient divider */}
      <div
        className="h-px bg-gradient-to-r from-gold-400/40 to-transparent"
        aria-hidden="true"
      />
    </div>
  );
}
