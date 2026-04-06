"use client";

/**
 * src/components/character/StatsPanel.tsx
 *
 * Renders the 6 core stat inputs (−5 to +8 range) with +/- increment buttons.
 * When equipped weapons or armor modify a trait (e.g. Cumbersome: −1 to Finesse),
 * the effective value is shown with a left-border accent and directional arrow badge.
 *
 * Modifier indicators use a left-border accent (red #f87171 for penalty,
 * teal #2dd4bf for bonus) with directional arrow badges (▾/▴) for
 * color-blind friendliness. The nameplate background stays white (#f7f7ff)
 * in all states.
 *
 * Evasion and Armor Score are displayed in the SheetHeader.
 */

import React from "react";
import type { CoreStatName } from "@shared/types";
import { useCharacterStore } from "@/store/characterStore";
import { DiceRollButton } from "@/components/dice/DiceRollButton";
import { StatTooltip } from "@/components/character/StatTooltip";
import type { TooltipLine } from "@/components/character/StatTooltip";
import type { RollRequest } from "@/types/dice";
import { useTraitModifiers } from "@/hooks/useTraitModifiers";
import type { TraitModifierEntry } from "@/hooks/useTraitModifiers";

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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDelta(n: number): string {
  return n >= 0 ? `+${n}` : String(n);
}

/** Build tooltip breakdown lines for a single trait. */
function buildTraitTooltipLines(
  label: string,
  baseValue: number,
  entries: TraitModifierEntry[],
  total: number,
): TooltipLine[] {
  const lines: TooltipLine[] = [
    { label: `Base ${label}`, value: String(baseValue) },
  ];
  for (const entry of entries) {
    lines.push({ label: entry.source, value: fmtDelta(entry.value) });
  }
  lines.push({
    label: `= Effective ${label}`,
    value: String(baseValue + total),
    isTotal: true,
  });
  return lines;
}

// ─── StatInput ────────────────────────────────────────────────────────────────

interface StatInputProps {
  name:           CoreStatName;
  label:          string;
  value:          number;
  effectiveValue: number;
  modTotal:       number;
  modEntries:     TraitModifierEntry[];
  onChange:       (v: number) => void;
  onRollQueued?:  () => void;
  characterName?: string;
}

function StatInput({
  name, label, value, effectiveValue, modTotal, modEntries,
  onChange, onRollQueued, characterName,
}: StatInputProps) {
  // SRD page 3: valid starting traits include -1; floor of -5 allows penalty modifiers.
  const decrement = () => onChange(Math.max(-5, value - 1));
  const increment = () => onChange(Math.min(8, value + 1));

  const cardImage = STAT_CARD_IMAGES[name];
  const hasModifier = modTotal !== 0;
  const isBonus  = modTotal > 0;
  const isPenalty = modTotal < 0;

  // Build tooltip lines only when there are modifiers
  const tooltipLines = hasModifier
    ? buildTraitTooltipLines(label, value, modEntries, modTotal)
    : [];

  // ── Nameplate styles ───────────────────────────────────────────────────────
  // Background stays white (#f7f7ff) in all states.
  // Penalty  → 3px red left-border accent, red text
  // Bonus    → 3px teal left-border accent, teal text
  const nameplateStyle: React.CSSProperties | undefined = isPenalty
    ? { borderLeftWidth: "3px", borderLeftColor: "#f87171" }
    : isBonus
    ? { borderLeftWidth: "3px", borderLeftColor: "#2dd4bf" }
    : undefined;

  const nameplateTextClass = isPenalty
    ? "text-[#dc2626]"
    : isBonus
    ? "text-[#0d9488]"
    : "text-[#0a100d]";

  // The entire card + nameplate + dice button should be a tooltip trigger when modified
  const cardContent = (
    <div className="group flex flex-col items-center" data-field-key={`stats.${name}`}>
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
            bg-parchment-300
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
              w-full py-3 text-center text-sm text-[#3d2c1a]
              hover:bg-[#aa7b1b]/15 hover:text-[#1a1a2e]
              disabled:opacity-20 disabled:cursor-not-allowed
              transition-colors leading-none select-none
              focus:outline-none focus:ring-2 focus:ring-inset focus:ring-steel-400
            "
          >
            &#9650;
          </button>

          {/* Value display — shows effective value when modified */}
          <div className="py-2 flex items-center justify-center">
            <span
              className={`
                text-3xl font-bold
                w-10 text-center leading-none select-none
                drop-shadow-[0_1px_0_rgba(249,236,216,0.6)]
                ${hasModifier ? (isPenalty ? "text-[#dc2626]" : "text-[#0f766e]") : "text-[#0a100d]"}
              `}
              aria-hidden="true"
            >
              {effectiveValue}
            </span>
          </div>

          {/* Decrement button */}
          <button
            type="button"
            onClick={decrement}
            disabled={value <= -5}
            aria-label={`Decrease ${label}`}
            className="
              w-full py-3 text-center text-sm text-[#3d2c1a]
              hover:bg-[#aa7b1b]/15 hover:text-[#1a1a2e]
              disabled:opacity-20 disabled:cursor-not-allowed
              transition-colors leading-none select-none
              focus:outline-none focus:ring-2 focus:ring-inset focus:ring-steel-400
            "
          >
            &#9660;
          </button>
        </div>

        {/* Label tab -- visually attached to bottom of dial */}
        <div
          className={`
            w-full rounded-b-xl border border-t-0
            px-1 py-1
            transition-all duration-200
            border-steel-400/40 bg-[#f7f7ff] group-hover:border-steel-400
          `}
          style={nameplateStyle}
          aria-hidden="true"
        >
          <span className={`block text-center text-xs font-semibold leading-tight tracking-wide ${nameplateTextClass}`}>
            {label}
            {hasModifier && (
              <span className="ml-0.5 text-[10px] opacity-80">
                ({isPenalty ? "▾" : "▴"}{Math.abs(modTotal)})
              </span>
            )}
          </span>
        </div>

        {/* Roll button — action roll with effective trait value as modifier */}
        <div className="flex justify-center pt-1">
          <DiceRollButton
            rollRequest={{
              label:    `${label} Action Roll`,
              type:     "action",
              dice:     [
                { size: "d12", role: "hope", label: "Hope" },
                { size: "d12", role: "fear", label: "Fear" },
              ],
              modifier: effectiveValue,
              ...(characterName ? { characterName } : {}),
            } satisfies RollRequest}
            onRollQueued={onRollQueued}
          />
        </div>
      </div>

      {/* Accessible full label for screen readers */}
      <span className="sr-only" aria-label={`${label}: ${effectiveValue}${hasModifier ? ` (base ${value}, modifier ${fmtDelta(modTotal)})` : ""}`} />
    </div>
  );

  // Wrap in StatTooltip when there are modifiers
  if (hasModifier) {
    return (
      <StatTooltip
        lines={tooltipLines}
        srdRef="SRD p. 3, 23, 29"
        ariaLabel={`${label} breakdown`}
      >
        {cardContent}
      </StatTooltip>
    );
  }

  return cardContent;
}

// ─── StatsPanel ───────────────────────────────────────────────────────────────

interface StatsPanelProps {
  onRollQueued?: () => void;
}

export function StatsPanel({ onRollQueued }: StatsPanelProps) {
  const { activeCharacter, updateStat } = useCharacterStore();
  const { modifiers, totals, effective } = useTraitModifiers();

  if (!activeCharacter) return null;

  const { stats } = activeCharacter;

  return (
    <section
      className="rounded-xl border border-steel-400/30 bg-slate-900/80 p-5 shadow-card"
      aria-label="Core Statistics"
      data-field-key="stats"
    >
      <h2
        className="mb-5 font-serif-sc text-[0.975rem] font-semibold tracking-widest text-[#7a9ab5]"
        title="SRD p. 3: Six core traits define your character's capabilities"
      >
        Traits
      </h2>

      {/* 6 stat inputs in a responsive grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6 sm:gap-4">
        {CORE_STATS.map(({ name, label }) => (
          <StatInput
            key={name}
            name={name}
            label={label}
            value={stats[name]}
            effectiveValue={effective[name]}
            modTotal={totals[name]}
            modEntries={modifiers[name]}
            onChange={(v) => updateStat(name, v)}
            onRollQueued={onRollQueued}
            characterName={activeCharacter.name}
          />
        ))}
      </div>
    </section>
  );
}
