"use client";

/**
 * src/components/character/ArmorSelectionPanel.tsx
 *
 * Step 4 of the character builder: Choose Starting Armor.
 *
 * Features:
 * - Filterable list (by name, tier, feature type, armor score, thresholds)
 * - "Suggested" badge on armor derived from class armorRec (`%% armor rec: ... %%`):
 *     light       → Gambeson (Flexible)
 *     med/medium  → Leather  (No feature)
 *     heavy       → Chainmail
 *     extra heavy → Full Plate
 * - Up to 2 items can be suggested (pipe-separated in markdown)
 * - Suggested armor sorts to the top by default
 * - Drill-down detail view with full SRD stats + page reference
 * - Shows all tiers (for reference), but Tier 1 items are highlighted as
 *   the only equippable options at character creation
 */

import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  TIER1_ARMOR,
  getSuggestedArmorIds,
  type SRDArmor,
} from "@/lib/srdEquipment";

interface ArmorSelectionPanelProps {
  armorId: string | null;
  onArmorChange: (id: string | null) => void;
  /** Explicit armor recommendations from class markdown (may be empty) */
  armorRec: string[];
}

export function ArmorSelectionPanel({
  armorId,
  onArmorChange,
  armorRec,
}: ArmorSelectionPanelProps) {
  const [filterText, setFilterText] = useState("");
  const [drillArmor, setDrillArmor] = useState<SRDArmor | null>(null);

  const suggestedIds = getSuggestedArmorIds(armorRec);

  // Apply text filter
  const filtered = useMemo(() => {
    const q = filterText.toLowerCase().trim();
    if (!q) return TIER1_ARMOR;
    return TIER1_ARMOR.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        String(a.tier).includes(q) ||
        (a.feature ?? "").toLowerCase().includes(q) ||
        (a.featureType ?? "").toLowerCase().includes(q) ||
        String(a.baseArmorScore).includes(q) ||
        String(a.baseMajorThreshold).includes(q) ||
        String(a.baseSevereThreshold).includes(q)
    );
  }, [filterText]);

  // Sort: suggested first (preserving their relative order), then alphabetical
  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const aIdx = suggestedIds.indexOf(a.id);
      const bIdx = suggestedIds.indexOf(b.id);
      const aRank = aIdx === -1 ? suggestedIds.length : aIdx;
      const bRank = bIdx === -1 ? suggestedIds.length : bIdx;
      if (aRank !== bRank) return aRank - bRank;
      return a.name.localeCompare(b.name);
    });
  }, [filtered, suggestedIds]);

  const selectedArmor = TIER1_ARMOR.find((a) => a.id === armorId) ?? null;

  // Scroll selected item into view when the list first renders with a pre-selection.
  const listRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!armorId || !listRef.current) return;
    const el = listRef.current.querySelector<HTMLElement>("[data-selected='true']");
    if (el) el.scrollIntoView({ block: "nearest", behavior: "instant" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (drillArmor) {
    return (
      <ArmorDrillDown
        armor={drillArmor}
        isSuggested={suggestedIds.includes(drillArmor.id)}
        onBack={() => setDrillArmor(null)}
      />
    );
  }

  // Build the banner label
  const suggestedNames = suggestedIds
    .map((id) => TIER1_ARMOR.find((a) => a.id === id)?.name)
    .filter(Boolean)
    .join(" or ");

  return (
    <div className="flex flex-col h-full">
      {/* Suggested armor banner */}
      <div className="shrink-0 px-4 py-2.5 border-b border-slate-700/30 bg-[#577399]/5">
        <p className="text-xs text-[#b9baa3]/60">
          <span className="text-[#577399] font-medium">Suggested for your class</span>
          {suggestedNames
            ? <>{": "}<span className="text-[#f7f7ff] font-medium">{suggestedNames}</span></>
            : <span className="text-[#b9baa3]/40"> — no recommendation defined</span>
          }
        </p>
      </div>

      {/* Filter bar */}
      <div className="shrink-0 px-4 py-3 border-b border-slate-700/30">
        <label htmlFor="armor-filter" className="sr-only">Filter armor</label>
        <input
          id="armor-filter"
          type="text"
          value={filterText}
          onChange={(e) => setFilterText(e.target.value)}
          placeholder="Filter armor…"
          className="
            w-full rounded px-3 py-2 bg-slate-900 border border-slate-700
            text-base sm:text-sm text-[#f7f7ff] placeholder-[#b9baa3]/30
            focus:outline-none focus:ring-2 focus:ring-[#577399] focus:border-transparent
            transition-colors
          "
        />
        <p className="text-xs text-[#b9baa3]/30 mt-1.5" aria-hidden="true">
          Filter by name, feature, or armor score
        </p>
      </div>

      {/* Armor list */}
      <div className="flex-1 overflow-y-auto" ref={listRef}>
        {sorted.length === 0 ? (
          <div className="flex items-center justify-center h-32">
            <p className="text-sm text-[#b9baa3]/40 italic">No armor matches your filter</p>
          </div>
        ) : (
          sorted.map((armor) => {
            const isSelected = armor.id === armorId;
            const isSuggested = suggestedIds.includes(armor.id);
            return (
              <div
                key={armor.id}
                data-selected={isSelected ? "true" : undefined}
                onClick={() => onArmorChange(armor.id)}
                className={`
                  flex items-start gap-2 px-4 py-3 border-l-2 transition-colors cursor-pointer
                  ${isSelected
                    ? "bg-[#577399]/20 border-[#577399]"
                    : "border-transparent hover:bg-slate-800/60 hover:border-slate-600"
                  }
                `}
              >
                {/* Circular radio indicator (visual only, tile click selects) */}
                <span
                  className={`
                    mt-0.5 flex-shrink-0 h-5 w-5 rounded-full border-2 flex items-center justify-center transition-colors
                    ${isSelected
                      ? "border-[#577399] bg-[#577399]"
                      : "border-slate-600"
                    }
                  `}
                  aria-hidden="true"
                >
                  {isSelected && <span className="h-2 w-2 rounded-full bg-white" />}
                </span>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-[#f7f7ff]">{armor.name}</span>
                    {isSuggested && (
                      <span className="text-xs font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-[#577399]/30 text-[#577399] border border-[#577399]/40 whitespace-nowrap">
                        Suggested Armor
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2 mt-1">
                    <span className="text-xs text-[#b9baa3]/60">Armor Score {armor.baseArmorScore}</span>
                    <span className="text-xs text-[#b9baa3]/40">·</span>
                    <span className="text-xs text-[#b9baa3]/60">Major {armor.baseMajorThreshold}</span>
                    <span className="text-xs text-[#b9baa3]/40">·</span>
                    <span className="text-xs text-[#b9baa3]/60">Severe {armor.baseSevereThreshold}</span>
                  </div>
                  {armor.feature ? (
                    <p className="text-xs text-[#b9baa3]/50 mt-1 italic truncate">{armor.feature}</p>
                  ) : (
                    <p className="text-xs text-[#b9baa3]/30 mt-1 italic">No feature</p>
                  )}
                </div>

                {/* Drill-down strip — clicking this area opens detail; delineated from select area */}
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setDrillArmor(armor); }}
                  aria-label={`View details for ${armor.name}`}
                  className="
                    self-stretch shrink-0 flex items-center justify-center
                    pl-3 pr-1 -mr-4 border-l border-slate-700/40
                    text-[#b9baa3]/30 hover:text-[#b9baa3]/70
                    transition-colors min-w-[44px]
                  "
                >
                  <span className="text-lg leading-none">›</span>
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* Selected summary */}
      {selectedArmor && (
        <div className="shrink-0 border-t border-slate-700/30 px-4 py-3">
          <div className="flex items-center gap-2 text-xs min-w-0">
            <span className="text-[#b9baa3]/50 w-14 shrink-0">Armor:</span>
            <span className="text-[#f7f7ff] font-medium truncate">{selectedArmor.name}</span>
            <span className="text-[#b9baa3]/40 shrink-0 whitespace-nowrap ml-auto">Score {selectedArmor.baseArmorScore}</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Drill-Down Detail View ────────────────────────────────────────────────────

interface ArmorDrillDownProps {
  armor: SRDArmor;
  isSuggested: boolean;
  onBack: () => void;
}

function ArmorDrillDown({ armor, isSuggested, onBack }: ArmorDrillDownProps) {
  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Back button */}
      <div className="shrink-0 px-4 pt-4 pb-2">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 px-4 py-3 -mx-4 text-xs text-[#daa520] hover:text-[#e8b830] transition-colors min-h-[44px]"
        >
          ← Back to list
        </button>
      </div>

      <div className="px-6 pb-6 space-y-5">
        {/* Header */}
        <div>
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h3 className="font-serif text-2xl font-bold text-[#f7f7ff]">{armor.name}</h3>
            {isSuggested && (
              <span className="text-xs font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-[#577399]/30 text-[#577399] border border-[#577399]/40">
                Suggested Armor
              </span>
            )}
          </div>
          <p className="text-xs text-[#b9baa3]/50">
            Tier {armor.tier} Armor · SRD page {armor.srdPage}
          </p>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <StatBlock label="Armor Score" value={String(armor.baseArmorScore)} />
          <StatBlock label="Major Threshold" value={`${armor.baseMajorThreshold}+`} />
          <StatBlock label="Severe Threshold" value={`${armor.baseSevereThreshold}+`} />
        </div>

        {/* Feature */}
        {armor.feature ? (
          <div className="rounded-lg border border-[#577399]/40 bg-[#577399]/10 px-4 py-3">
            <p className="text-xs font-semibold uppercase text-[#577399] mb-1">Feature</p>
            <p className="text-sm text-[#f7f7ff]">{armor.feature}</p>
          </div>
        ) : (
          <div className="rounded-lg border border-slate-700/60 bg-slate-850/50 px-4 py-3">
            <p className="text-xs font-semibold uppercase text-[#b9baa3]/50 mb-1">Feature</p>
            <p className="text-sm text-[#b9baa3]/60 italic">No feature</p>
          </div>
        )}

        {/* Threshold note */}
        <div className="rounded-lg border border-slate-700/40 bg-slate-900/40 px-4 py-3">
          <p className="text-xs font-semibold uppercase text-[#b9baa3]/50 mb-2">At Level 1</p>
          <div className="space-y-1 text-xs text-[#b9baa3]/70">
            <p>Major threshold: <span className="text-[#f7f7ff] font-medium">{armor.baseMajorThreshold + 1}+</span> (base {armor.baseMajorThreshold} + level 1)</p>
            <p>Severe threshold: <span className="text-[#f7f7ff] font-medium">{armor.baseSevereThreshold + 1}+</span> (base {armor.baseSevereThreshold} + level 1)</p>
          </div>
        </div>

        {/* Description */}
        {armor.description && (
          <div className="rounded-lg border border-slate-700/60 bg-slate-850/50 px-4 py-3">
            <p className="text-xs font-semibold uppercase text-[#b9baa3]/50 mb-1">Notes</p>
            <p className="text-base text-[#b9baa3]/70">{armor.description}</p>
          </div>
        )}

        {/* SRD citation */}
        <p className="text-xs text-[#b9baa3]/30 italic">
          Source: Daggerheart SRD, page {armor.srdPage}
        </p>
      </div>
    </div>
  );
}

function StatBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-700/60 bg-slate-900/40 px-3 py-2">
      <p className="text-xs uppercase tracking-wider text-[#b9baa3]/50 mb-0.5">{label}</p>
      <p className="text-sm font-semibold text-[#f7f7ff]">{value}</p>
    </div>
  );
}
