"use client";

/**
 * src/components/character/ArmorSelectionPanel.tsx
 *
 * Step 4 of the character builder: Choose Starting Armor.
 *
 * Features:
 * - Filterable list (by name, tier, feature type, armor score, thresholds)
 * - "Suggested" badge on armor derived from class's Starting Evasion:
 *     Evasion 9–10 → Flexible (Gambeson)
 *     Evasion 8    → No feature (Leather)
 *     Evasion 7    → Heavy (Chainmail)
 *     Evasion < 7  → Very Heavy (Full Plate)
 * - Suggested armor sorts to the top by default
 * - Drill-down detail view with full SRD stats + page reference
 * - Shows all tiers (for reference), but Tier 1 items are highlighted as
 *   the only equippable options at character creation
 */

import React, { useState, useMemo } from "react";
import {
  TIER1_ARMOR,
  getSuggestedArmorId,
  type SRDArmor,
} from "@/lib/srdEquipment";

interface ArmorSelectionPanelProps {
  armorId: string | null;
  onArmorChange: (id: string | null) => void;
  /** Class's starting evasion value — determines suggested armor */
  startingEvasion: number;
}

export function ArmorSelectionPanel({
  armorId,
  onArmorChange,
  startingEvasion,
}: ArmorSelectionPanelProps) {
  const [filterText, setFilterText] = useState("");
  const [drillArmor, setDrillArmor] = useState<SRDArmor | null>(null);

  const suggestedId = getSuggestedArmorId(startingEvasion);

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

  // Sort: suggested first, then by armor score descending
  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const aSug = a.id === suggestedId ? 0 : 1;
      const bSug = b.id === suggestedId ? 0 : 1;
      if (aSug !== bSug) return aSug - bSug;
      return a.name.localeCompare(b.name);
    });
  }, [filtered, suggestedId]);

  const selectedArmor = TIER1_ARMOR.find((a) => a.id === armorId) ?? null;

  if (drillArmor) {
    return (
      <ArmorDrillDown
        armor={drillArmor}
        isSuggested={drillArmor.id === suggestedId}
        onBack={() => setDrillArmor(null)}
      />
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Suggested armor banner */}
      <div className="shrink-0 px-4 py-2.5 border-b border-slate-700/30 bg-[#577399]/5">
        <p className="text-xs text-[#b9baa3]/60">
          <span className="text-[#577399] font-medium">Suggested for your class</span>
          {" "}(Starting Evasion {startingEvasion}):
          {" "}<span className="text-[#f7f7ff] font-medium">
            {TIER1_ARMOR.find((a) => a.id === suggestedId)?.name ?? "—"}
          </span>
        </p>
      </div>

      {/* Filter bar */}
      <div className="shrink-0 px-4 py-3 border-b border-slate-700/30">
        <input
          type="text"
          value={filterText}
          onChange={(e) => setFilterText(e.target.value)}
          placeholder="Filter armor…"
          className="
            w-full rounded px-3 py-2 bg-slate-900 border border-slate-700
            text-sm text-[#f7f7ff] placeholder-[#b9baa3]/30
            focus:outline-none focus:ring-2 focus:ring-[#577399] focus:border-transparent
            transition-colors
          "
        />
        <p className="text-[10px] text-[#b9baa3]/30 mt-1.5">
          Filter by name, feature, or armor score
        </p>
      </div>

      {/* Armor list */}
      <div className="flex-1 overflow-y-auto">
        {sorted.length === 0 ? (
          <div className="flex items-center justify-center h-32">
            <p className="text-sm text-[#b9baa3]/40 italic">No armor matches your filter</p>
          </div>
        ) : (
          sorted.map((armor) => {
            const isSelected = armor.id === armorId;
            const isSuggested = armor.id === suggestedId;
            return (
              <div
                key={armor.id}
                className={`
                  border-l-2 transition-colors cursor-pointer
                  ${isSelected
                    ? "bg-[#577399]/20 border-[#577399]"
                    : "border-transparent hover:bg-slate-800/60 hover:border-slate-600"
                  }
                `}
              >
                <div className="flex items-start gap-2 px-4 py-3">
                  {/* Main content — click to select */}
                  <button
                    type="button"
                    className="flex-1 text-left min-w-0"
                    onClick={() => onArmorChange(armor.id)}
                  >
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-[#f7f7ff]">{armor.name}</span>
                      {isSuggested && (
                        <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-[#577399]/30 text-[#577399] border border-[#577399]/40 whitespace-nowrap">
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
                  </button>

                  {/* Drill-down button */}
                  <button
                    type="button"
                    onClick={() => setDrillArmor(armor)}
                    className="shrink-0 text-[#b9baa3]/30 hover:text-[#b9baa3]/70 text-lg leading-none transition-colors p-1"
                    aria-label={`View details for ${armor.name}`}
                    title="View full details"
                  >
                    ›
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Selected summary */}
      {selectedArmor && (
        <div className="shrink-0 border-t border-slate-700/30 px-4 py-3">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-[#b9baa3]/50 w-14 shrink-0">Armor:</span>
            <span className="text-[#f7f7ff] font-medium">{selectedArmor.name}</span>
            <span className="text-[#b9baa3]/40">Score {selectedArmor.baseArmorScore}</span>
            {selectedArmor.feature && (
              <span className="text-[#b9baa3]/40 truncate">· {selectedArmor.featureType}</span>
            )}
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
          className="text-xs text-[#577399] hover:text-[#7a9fc2] transition-colors flex items-center gap-1"
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
              <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-[#577399]/30 text-[#577399] border border-[#577399]/40">
                Suggested Armor
              </span>
            )}
          </div>
          <p className="text-xs text-[#b9baa3]/50">
            Tier {armor.tier} Armor · SRD page {armor.srdPage}
          </p>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-3 gap-3">
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
            <p className="text-sm text-[#b9baa3]/70">{armor.description}</p>
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
      <p className="text-[10px] uppercase tracking-wider text-[#b9baa3]/50 mb-0.5">{label}</p>
      <p className="text-sm font-semibold text-[#f7f7ff]">{value}</p>
    </div>
  );
}
