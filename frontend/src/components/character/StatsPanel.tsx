"use client";

/**
 * src/components/character/StatsPanel.tsx
 *
 * Renders the 6 core stat inputs (−5 to +8 range) with +/- increment buttons
 * and derived stat displays (evasion, armor — read-only, computed server-side).
 */

import React from "react";
import type { CoreStatName } from "@shared/types";
import { useCharacterStore } from "@/store/characterStore";

// ─── Stat definitions ─────────────────────────────────────────────────────────

const CORE_STATS: { name: CoreStatName; label: string }[] = [
  { name: "agility",   label: "Agility"   },
  { name: "strength",  label: "Strength"  },
  { name: "finesse",   label: "Finesse"   },
  { name: "instinct",  label: "Instinct"  },
  { name: "presence",  label: "Presence"  },
  { name: "knowledge", label: "Knowledge" },
];

// ─── StatInput ────────────────────────────────────────────────────────────────

interface StatInputProps {
  label:    string;
  value:    number;
  onChange: (v: number) => void;
}

function StatInput({ label, value, onChange }: StatInputProps) {
  // SRD page 3: valid starting traits include -1; floor of -5 allows penalty modifiers.
  const decrement = () => onChange(Math.max(-5, value - 1));
  const increment = () => onChange(Math.min(8, value + 1));

  return (
    <div className="group flex flex-col items-center">
      {/* Dial + label as a single visually-connected unit */}
      <div className="flex flex-col items-center w-16">
        {/* Dial with +/- controls */}
        <div
          className="
            relative flex flex-col items-center w-full
            rounded-t-xl border border-b-0 border-[#577399]/40 bg-slate-850
            shadow-card
            group-hover:border-[#577399] group-hover:shadow-glow-gold
            transition-all duration-200 overflow-hidden
          "
        >
          {/* Increment button */}
          <button
            type="button"
            onClick={increment}
            disabled={value >= 8}
            aria-label={`Increase ${label}`}
            className="
              w-full py-1 text-center text-xs text-[#b9baa3]
              hover:bg-[#577399]/20 hover:text-[#f7f7ff]
              disabled:opacity-20 disabled:cursor-not-allowed
              transition-colors leading-none select-none
              focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[#577399]
            "
          >
            ▲
          </button>

          {/* Value display */}
          <div className="py-1 flex items-center justify-center">
            <span
              className="
                text-xl font-bold text-parchment-100
                w-8 text-center leading-none select-none
              "
              aria-hidden="true"
            >
              {value}
            </span>
          </div>

          {/* Decrement button */}
          <button
            type="button"
            onClick={decrement}
            disabled={value <= -5}
            aria-label={`Decrease ${label}`}
            className="
              w-full py-1 text-center text-xs text-[#b9baa3]
              hover:bg-[#577399]/20 hover:text-[#f7f7ff]
              disabled:opacity-20 disabled:cursor-not-allowed
              transition-colors leading-none select-none
              focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[#577399]
            "
          >
            ▼
          </button>
        </div>

        {/* Label tab — visually attached to bottom of dial */}
        <div
          className="
            w-full rounded-b-xl border border-t-0 border-[#577399]/40
            bg-[#f7f7ff] px-1 py-1
            group-hover:border-[#577399]
            transition-all duration-200
          "
          aria-hidden="true"
        >
          <span className="block text-center text-[10px] font-semibold text-[#0a100d] leading-tight tracking-wide">
            {label}
          </span>
        </div>
      </div>

      {/* Accessible full label for screen readers */}
      <span className="sr-only" aria-label={`${label}: ${value}`} />
    </div>
  );
}

// ─── DerivedStatDisplay ───────────────────────────────────────────────────────

interface DerivedStatDisplayProps {
  label: string;
  value: number;
  tooltip?: string;
}

function DerivedStatDisplay({ label, value, tooltip }: DerivedStatDisplayProps) {
  return (
    <div
      className="flex flex-col items-center gap-1.5"
      title={tooltip}
      aria-label={tooltip ?? `${label}: ${value}`}
    >
      <div
        className="
          h-16 w-16 rounded-lg
          border border-[#577399]/40 bg-slate-900
          flex items-center justify-center
          shadow-inner
        "
        aria-hidden="true"
      >
        <span className="text-2xl font-bold text-[#577399]">{value}</span>
      </div>
      <span className="text-xs font-medium text-[#b9baa3] uppercase tracking-wide" aria-hidden="true">
        {label}
      </span>
    </div>
  );
}

// ─── StatsPanel ───────────────────────────────────────────────────────────────

export function StatsPanel() {
  const { activeCharacter, updateStat } = useCharacterStore();

  if (!activeCharacter) return null;

  const { stats, derivedStats } = activeCharacter;

  return (
    <section
      className="rounded-xl border border-[#577399]/30 bg-slate-900/80 p-5 shadow-card"
      aria-label="Core Statistics"
    >
      <h2 className="mb-5 font-serif text-sm font-semibold uppercase tracking-widest text-[#577399]">
        Core Stats
      </h2>

      {/* 6 stat inputs in a responsive grid */}
      <div className="grid grid-cols-3 gap-4 sm:grid-cols-6">
        {CORE_STATS.map(({ name, label }) => (
          <StatInput
            key={name}
            label={label}
            value={stats[name]}
            onChange={(v) => updateStat(name, v)}
          />
        ))}
      </div>

      {/* Divider */}
      <div className="my-5 border-t border-[#577399]/20" />

      {/* Derived stats */}
      <div>
        <h3 className="mb-3 font-serif text-sm font-semibold uppercase tracking-widest text-[#577399]">
          Derived
        </h3>
        <div className="flex gap-6">
          <DerivedStatDisplay
            label="Evasion"
            value={derivedStats.evasion}
            tooltip="Evasion: calculated from class and modifiers by the server"
          />
          <DerivedStatDisplay
            label="Armor Score"
            value={derivedStats.armor}
            tooltip="Armor Score: calculated from class and equipped items"
          />
        </div>
        <p className="mt-3 text-[11px] text-[#b9baa3] italic">
          Derived stats are calculated by the server based on class, level, and modifiers.
        </p>
      </div>
    </section>
  );
}
