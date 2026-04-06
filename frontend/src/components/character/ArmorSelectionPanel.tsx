"use client";

/**
 * src/components/character/ArmorSelectionPanel.tsx
 *
 * Step 7 of the character builder: Choose Starting Armor.
 *
 * Features:
 * - Filterable list (by name, tier, feature type, armor score, thresholds)
 * - "Suggested" badge on armor derived from class armorRec
 * - Suggested armor sorts to the top by default
 * - Accordion-expandable detail tiles (SelectionTile) with full stats
 * - Shows Tier 1 items as the only equippable options at character creation
 */

import React, { useState, useMemo, useRef, useEffect, useCallback } from "react";
import {
  TIER1_ARMOR,
  getSuggestedArmorIds,
  type SRDArmor,
} from "@/lib/srdEquipment";
import { SelectionTile } from "./SelectionTile";

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
  const [expandedArmorId, setExpandedArmorId] = useState<string | null>(null);

  const suggestedIds = getSuggestedArmorIds(armorRec);

  // Pre-expand the currently selected armor when returning to this step
  const hasPreExpanded = useRef(false);
  useEffect(() => {
    if (!hasPreExpanded.current && armorId) {
      setExpandedArmorId(armorId);
      hasPreExpanded.current = true;
    }
  }, [armorId]);

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

  // Toggle expand: if already expanded, collapse; otherwise expand the new one
  const handleToggleExpand = useCallback((id: string) => {
    setExpandedArmorId((prev) => (prev === id ? null : id));
  }, []);

  // Scroll selected item into view when the list first renders with a pre-selection.
  const listRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!armorId || !listRef.current) return;
    const el = listRef.current.querySelector<HTMLElement>("[data-selected='true']");
    if (el) el.scrollIntoView({ block: "nearest", behavior: "instant" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Build the banner label
  const suggestedNames = suggestedIds
    .map((id) => TIER1_ARMOR.find((a) => a.id === id)?.name)
    .filter(Boolean)
    .join(" or ");

  return (
    <div className="flex flex-col h-full">
      {/* Suggested armor banner */}
      <div className="shrink-0 px-4 py-2.5 border-b border-slate-700/30 bg-[#577399]/5">
        <p className="text-xs text-parchment-500">
          <span className="text-steel-accessible font-medium">Suggested for your class</span>
          {suggestedNames
            ? <>{": "}<span className="text-[#f7f7ff] font-medium">{suggestedNames}</span></>
            : <span className="text-parchment-600"> — no recommendation defined</span>
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
            text-base sm:text-sm text-[#f7f7ff] placeholder-parchment-600
            focus:outline-none focus:ring-2 focus:ring-[#577399] focus:border-transparent
            transition-colors
          "
        />
        <p className="text-xs text-parchment-600 mt-1.5" aria-hidden="true">
          Filter by name, feature, or armor score
        </p>
      </div>

      {/* Armor list — accordion tiles */}
      <div className="flex-1 overflow-y-auto" ref={listRef}>
        {sorted.length === 0 ? (
          <div className="flex items-center justify-center h-32">
            <p className="text-sm text-parchment-600">No armor matches your filter</p>
          </div>
        ) : (
          sorted.map((armor) => {
            const isSelected = armor.id === armorId;
            const isSuggested = suggestedIds.includes(armor.id);
            return (
              <div key={armor.id} data-selected={isSelected ? "true" : undefined}>
                <SelectionTile
                  id={`armor-${armor.id}`}
                  isSelected={isSelected}
                  isExpanded={expandedArmorId === armor.id}
                  onToggleExpand={() => handleToggleExpand(armor.id)}
                  onSelect={() => onArmorChange(armor.id)}
                  name={armor.name}
                  subtitle={`Armor Score ${armor.baseArmorScore} · Major ${armor.baseMajorThreshold}+ · Severe ${armor.baseSevereThreshold}+`}
                  badges={
                    isSuggested ? (
                      <span className="text-xs font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-[#577399]/30 text-[#577399] border border-[#577399]/40 whitespace-nowrap">
                        Suggested
                      </span>
                    ) : undefined
                  }
                  selectLabel="Select"
                  selectedLabel="Selected"
                >
                  {/* ─── Expanded detail content ─── */}
                  <ArmorDetail armor={armor} />
                </SelectionTile>
              </div>
            );
          })
        )}
      </div>

      {/* Selected summary footer */}
      {selectedArmor && (
        <div className="shrink-0 border-t border-slate-700/30 px-4 py-3">
          <div className="flex items-center gap-2 text-xs min-w-0">
            <span className="text-parchment-500 w-14 shrink-0">Armor:</span>
            <span className="text-[#f7f7ff] font-medium truncate">{selectedArmor.name}</span>
            <span className="text-parchment-600 shrink-0 whitespace-nowrap ml-auto">Score {selectedArmor.baseArmorScore}</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Armor Detail Content (shown inside expanded tile) ─────────────────────────

function ArmorDetail({ armor }: { armor: SRDArmor }) {
  return (
    <div className="space-y-4">
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
          <p className="text-xs font-semibold uppercase text-parchment-500 mb-1">Feature</p>
          <p className="text-sm text-parchment-500">No feature</p>
        </div>
      )}

      {/* Threshold note at level 1 */}
      <div className="rounded-lg border border-slate-700/40 bg-slate-900/40 px-4 py-3">
        <p className="text-xs font-semibold uppercase text-parchment-500 mb-2">At Level 1</p>
        <div className="space-y-1 text-xs text-parchment-500">
          <p>Major threshold: <span className="text-[#f7f7ff] font-medium">{armor.baseMajorThreshold + 1}+</span> (base {armor.baseMajorThreshold} + level 1)</p>
          <p>Severe threshold: <span className="text-[#f7f7ff] font-medium">{armor.baseSevereThreshold + 1}+</span> (base {armor.baseSevereThreshold} + level 1)</p>
        </div>
      </div>

      {/* Description / notes */}
      {armor.description && (
        <div className="rounded-lg border border-slate-700/60 bg-slate-850/50 px-4 py-3">
          <p className="text-xs font-semibold uppercase text-parchment-500 mb-1">Notes</p>
          <p className="text-sm text-parchment-500">{armor.description}</p>
        </div>
      )}

      {/* SRD citation */}
      <p className="text-xs text-parchment-600">
        Source: Daggerheart SRD, page {armor.srdPage}
      </p>
    </div>
  );
}

function StatBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-700/60 bg-slate-900/40 px-3 py-2">
      <p className="text-xs uppercase tracking-wider text-parchment-500 mb-0.5">{label}</p>
      <p className="text-sm font-semibold text-[#f7f7ff]">{value}</p>
    </div>
  );
}
