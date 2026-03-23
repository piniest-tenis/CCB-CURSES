"use client";

/**
 * src/components/character/StatsPanel.tsx
 *
 * Renders the 6 core stat inputs (−5 to +8 range) with +/- increment buttons.
 * Evasion and Armor Score are displayed in the SheetHeader.
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

// Maps each core stat to its decorative SVG card background.
const STAT_CARD_IMAGES: Record<CoreStatName, string> = {
  agility:   "/images/ui-elements/agility-card.svg",
  strength:  "/images/ui-elements/strength-card.svg",
  finesse:   "/images/ui-elements/finesse-card.svg",
  instinct:  "/images/ui-elements/instinct-card.svg",
  presence:  "/images/ui-elements/presence-card.svg",
  knowledge: "/images/ui-elements/knowledge-card.svg",
};

// ─── StatInput ────────────────────────────────────────────────────────────────

interface StatInputProps {
  name:     CoreStatName;
  label:    string;
  value:    number;
  onChange: (v: number) => void;
}

function StatInput({ name, label, value, onChange }: StatInputProps) {
  // SRD page 3: valid starting traits include -1; floor of -5 allows penalty modifiers.
  const decrement = () => onChange(Math.max(-5, value - 1));
  const increment = () => onChange(Math.min(8, value + 1));

  const cardImage = STAT_CARD_IMAGES[name];

  return (
    <div className="group flex flex-col items-center">
      {/* Dial + label as a single visually-connected unit */}
      <div className="flex flex-col items-center w-24">
        {/* Dial with SVG card background and +/- controls */}
        <div
          className="
            relative flex flex-col items-center justify-center w-full
            rounded-t-xl
            shadow-card
            group-hover:shadow-glow-gold
            transition-all duration-200 overflow-hidden
          "
          style={{
            backgroundImage: `url(${cardImage})`,
            backgroundSize: "contain",
            backgroundRepeat: "no-repeat",
            backgroundPosition: "center",
            aspectRatio: "521.87 / 865.9",
          }}
        >
          {/* Increment button */}
          <button
            type="button"
            onClick={increment}
            disabled={value >= 8}
            aria-label={`Increase ${label}`}
            className="
              w-full py-2 text-center text-sm text-[#3d2c1a]
              hover:bg-[#aa7b1b]/15 hover:text-[#1a1a2e]
              disabled:opacity-20 disabled:cursor-not-allowed
              transition-colors leading-none select-none
              focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[#577399]
            "
          >
            &#9650;
          </button>

          {/* Value display */}
          <div className="py-2 flex items-center justify-center">
            <span
              className="
                text-3xl font-bold text-[#0a100d]
                w-10 text-center leading-none select-none
                drop-shadow-[0_1px_0_rgba(249,236,216,0.6)]
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
              w-full py-2 text-center text-sm text-[#3d2c1a]
              hover:bg-[#aa7b1b]/15 hover:text-[#1a1a2e]
              disabled:opacity-20 disabled:cursor-not-allowed
              transition-colors leading-none select-none
              focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[#577399]
            "
          >
            &#9660;
          </button>
        </div>

        {/* Label tab -- visually attached to bottom of dial */}
        <div
          className="
            w-full rounded-b-xl border border-t-0 border-[#577399]/40
            bg-[#f7f7ff] px-1 py-1
            group-hover:border-[#577399]
            transition-all duration-200
          "
          aria-hidden="true"
        >
          <span className="block text-center text-xs font-semibold text-[#0a100d] leading-tight tracking-wide">
            {label}
          </span>
        </div>
      </div>

      {/* Accessible full label for screen readers */}
      <span className="sr-only" aria-label={`${label}: ${value}`} />
    </div>
  );
}

// ─── StatsPanel ───────────────────────────────────────────────────────────────

export function StatsPanel() {
  const { activeCharacter, updateStat } = useCharacterStore();

  if (!activeCharacter) return null;

  const { stats } = activeCharacter;

  return (
    <section
      className="rounded-xl border border-[#577399]/30 bg-slate-900/80 p-5 shadow-card"
      aria-label="Core Statistics"
    >
      <h2 className="mb-5 font-serif text-sm font-semibold uppercase tracking-widest text-[#577399]">
        Traits
      </h2>

      {/* 6 stat inputs in a responsive grid */}
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-6 sm:gap-4">
        {CORE_STATS.map(({ name, label }) => (
          <StatInput
            key={name}
            name={name}
            label={label}
            value={stats[name]}
            onChange={(v) => updateStat(name, v)}
          />
        ))}
      </div>
    </section>
  );
}
