"use client";

/**
 * src/components/srd/SRDSectionGrid.tsx
 *
 * Level 0 of the drill-down navigation — displays a responsive grid of
 * section cards. Each card shows an icon, entry count badge, section name,
 * and a short description. Clicking a card calls `onSelectSection(sectionId)`.
 *
 * Colour mapping uses the existing burgundy/gold/coral/parchment palette
 * so every section has a distinctive but harmonious accent.
 */

import React from "react";

// ─── Section card configuration ──────────────────────────────────────────────

interface SectionCardConfig {
  id: string;
  label: string;
  icon: string;
  description: string;
  /** Tailwind classes for the card's icon colour + border accent. */
  accent: string;
  /** Tailwind class for the count badge bg. */
  badgeBg: string;
}

const SECTION_CARD_CONFIG: SectionCardConfig[] = [
  {
    id: "Introduction",
    label: "Introduction",
    icon: "fa-solid fa-scroll",
    description: "Welcome to the world of Daggerheart and how to use this document.",
    accent: "text-parchment-400 border-parchment-600/30",
    badgeBg: "bg-parchment-600/20",
  },
  {
    id: "Character Creation",
    label: "Character Creation",
    icon: "fa-solid fa-user-pen",
    description: "Step-by-step guide to building your hero from scratch.",
    accent: "text-gold-400 border-gold-600/30",
    badgeBg: "bg-gold-600/20",
  },
  {
    id: "Classes",
    label: "Classes",
    icon: "fa-solid fa-hat-wizard",
    description: "The nine classes that define your hero's abilities and role.",
    accent: "text-burgundy-400 border-burgundy-700/30",
    badgeBg: "bg-burgundy-700/20",
  },
  {
    id: "Ancestries",
    label: "Ancestries",
    icon: "fa-solid fa-dna",
    description: "Heritage options that shape your character's unique traits.",
    accent: "text-amber-400 border-amber-700/30",
    badgeBg: "bg-amber-700/20",
  },
  {
    id: "Communities",
    label: "Communities",
    icon: "fa-solid fa-people-group",
    description: "The societies that raised your character and granted their skills.",
    accent: "text-emerald-400 border-emerald-700/30",
    badgeBg: "bg-emerald-700/20",
  },
  {
    id: "Domains",
    label: "Domains",
    icon: "fa-solid fa-hand-sparkles",
    description: "Magical domains that grant cards, abilities, and spells.",
    accent: "text-violet-400 border-violet-700/30",
    badgeBg: "bg-violet-700/20",
  },
  {
    id: "Core Mechanics",
    label: "Core Mechanics",
    icon: "fa-solid fa-gears",
    description: "Action rolls, damage, stress, armor, rest, and the core rules engine.",
    accent: "text-gold-400 border-gold-600/30",
    badgeBg: "bg-gold-600/20",
  },
  {
    id: "Running an Adventure",
    label: "Running an Adventure",
    icon: "fa-solid fa-compass",
    description: "GM tools: adversaries, environments, encounters, and session guidance.",
    accent: "text-coral-400 border-coral-700/30",
    badgeBg: "bg-coral-700/20",
  },
  {
    id: "Appendix",
    label: "Appendix",
    icon: "fa-solid fa-table-list",
    description: "Domain card lists, quick-reference tables, and supplemental data.",
    accent: "text-parchment-500 border-parchment-700/30",
    badgeBg: "bg-parchment-700/20",
  },
];

// ─── Props ────────────────────────────────────────────────────────────────────

interface SRDSectionGridProps {
  /** Per-section entry counts, keyed by section id (e.g. { Classes: 11 }). */
  sectionCounts: Record<string, number>;
  /** Called when the user clicks a section card. */
  onSelectSection: (sectionId: string) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function SRDSectionGrid({
  sectionCounts,
  onSelectSection,
}: SRDSectionGridProps) {
  return (
    <div className="space-y-6">
      {/* Section heading */}
      <h2 className="text-xl font-bold text-[#f7f7ff]">
        Browse the SRD
      </h2>

      {/* Card grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {SECTION_CARD_CONFIG.map((cfg) => {
          const count = sectionCounts[cfg.id] ?? 0;
          // Extract the icon color from the accent classes (first class)
          const accentParts = cfg.accent.split(" ");
          const iconColor = accentParts[0]; // e.g. "text-burgundy-400"

          return (
            <button
              key={cfg.id}
              type="button"
              onClick={() => onSelectSection(cfg.id)}
              className={`
                group relative flex flex-col items-start gap-3 rounded-lg border
                border-slate-700/60 bg-slate-850/50 p-5
                text-left transition-all duration-200
                shadow-card hover:shadow-card-fantasy-hover
                active:scale-[0.98]
                focus:outline-none focus:ring-2 focus:ring-gold-400 focus:ring-inset
                last:sm:col-span-2 last:lg:col-span-1
              `}
            >
              {/* Icon + count row */}
              <div className="flex w-full items-center justify-between">
                <i
                  className={`${cfg.icon} text-2xl ${iconColor} transition-colors group-hover:text-gold-300`}
                  aria-hidden="true"
                />
                {count > 0 && (
                  <span
                    className={`rounded-full ${cfg.badgeBg} px-2.5 py-0.5 text-xs font-bold tabular-nums text-[#f7f7ff]/80`}
                  >
                    {count}
                  </span>
                )}
              </div>

              {/* Label */}
              <h3 className="font-serif text-lg font-bold text-[#f7f7ff] group-hover:text-gold-300 transition-colors">
                {cfg.label}
              </h3>

              {/* Description */}
              <p className="text-sm leading-relaxed text-[#b9baa3]/70">
                {cfg.description}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
