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

const CORE_STATS: { name: CoreStatName; label: string; abbr: string }[] = [
  { name: "agility",   label: "Agility",   abbr: "AGI" },
  { name: "strength",  label: "Strength",  abbr: "STR" },
  { name: "finesse",   label: "Finesse",   abbr: "FIN" },
  { name: "instinct",  label: "Instinct",  abbr: "INS" },
  { name: "presence",  label: "Presence",  abbr: "PRE" },
  { name: "knowledge", label: "Knowledge", abbr: "KNO" },
];

// ─── StatInput ────────────────────────────────────────────────────────────────

interface StatInputProps {
  label:    string;
  abbr:     string;
  value:    number;
  onChange: (v: number) => void;
}

function StatInput({ label, abbr, value, onChange }: StatInputProps) {
  // SRD page 3: valid starting traits include -1; floor of -5 allows penalty modifiers.
  const decrement = () => onChange(Math.max(-5, value - 1));
  const increment = () => onChange(Math.min(8, value + 1));

  return (
    <div className="group flex flex-col items-center gap-1.5">
      {/* Dial with +/- controls */}
      <div
        className="
          relative flex flex-col items-center
          rounded-xl border border-burgundy-700 bg-slate-850
          shadow-card
          group-hover:border-gold-500 group-hover:shadow-glow-gold
          transition-all duration-200 overflow-hidden
          w-16
        "
      >
        {/* Increment button */}
        <button
          type="button"
          onClick={increment}
          disabled={value >= 8}
          aria-label={`Increase ${label}`}
          className="
            w-full py-1 text-center text-xs text-parchment-600
            hover:bg-gold-900/20 hover:text-gold-400
            disabled:opacity-20 disabled:cursor-not-allowed
            transition-colors leading-none select-none
            focus:outline-none focus:ring-2 focus:ring-inset focus:ring-gold-500
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
            w-full py-1 text-center text-xs text-parchment-600
            hover:bg-burgundy-900/30 hover:text-burgundy-300
            disabled:opacity-20 disabled:cursor-not-allowed
            transition-colors leading-none select-none
            focus:outline-none focus:ring-2 focus:ring-inset focus:ring-gold-500
          "
        >
          ▼
        </button>
      </div>

      {/* Abbreviation (always visible) */}
      <span className="text-xs font-semibold tracking-widest text-gold-600 uppercase" aria-hidden="true">
        {abbr}
      </span>

      {/* Full label — always present for AT, visually shown on hover */}
      <span
        className="h-4 text-[10px] text-parchment-500 group-hover:opacity-100 opacity-0 transition-opacity duration-150"
        aria-label={`${label}: ${value}`}
      >
        {label}
      </span>
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
          border border-gold-800 bg-slate-900
          flex items-center justify-center
          shadow-inner
        "
        aria-hidden="true"
      >
        <span className="text-2xl font-bold text-gold-400">{value}</span>
      </div>
      <span className="text-xs font-medium text-parchment-400 uppercase tracking-wide" aria-hidden="true">
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
      className="rounded-xl border border-burgundy-900 bg-slate-900/80 p-5 shadow-card"
      aria-label="Core Statistics"
    >
      <h2 className="mb-5 font-serif text-sm font-semibold uppercase tracking-widest text-gold-600">
        Core Stats
      </h2>

      {/* 6 stat inputs in a responsive grid */}
      <div className="grid grid-cols-3 gap-4 sm:grid-cols-6">
        {CORE_STATS.map(({ name, label, abbr }) => (
          <StatInput
            key={name}
            label={label}
            abbr={abbr}
            value={stats[name]}
            onChange={(v) => updateStat(name, v)}
          />
        ))}
      </div>

      {/* Divider */}
      <div className="my-5 border-t border-burgundy-900/60" />

      {/* Derived stats */}
      <div>
        <h3 className="mb-3 font-serif text-xs font-semibold uppercase tracking-widest text-gold-700">
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
        <p className="mt-3 text-[11px] text-parchment-600 italic">
          Derived stats are calculated by the server based on class, level, and modifiers.
        </p>
      </div>
    </section>
  );
}
