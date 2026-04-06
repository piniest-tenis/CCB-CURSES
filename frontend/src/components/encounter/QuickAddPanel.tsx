"use client";

/**
 * src/components/encounter/QuickAddPanel.tsx
 *
 * Compact search/add widget at the bottom of the encounter console.
 * Provides typeahead search over the adversary catalog and a link
 * to switch to the full catalog tab.
 */

import React, { useState, useMemo, useCallback } from "react";
import type { Adversary } from "@/types/adversary";
import { TierBadge } from "@/components/adversary/TierBadge";

interface QuickAddPanelProps {
  adversaries: Adversary[];
  onAddAdversary: (adversary: Adversary) => void;
  onOpenCatalog: () => void;
}

export function QuickAddPanel({
  adversaries,
  onAddAdversary,
  onOpenCatalog,
}: QuickAddPanelProps) {
  const [search, setSearch] = useState("");

  const searchResults = useMemo(() => {
    if (!search.trim()) return [];
    const q = search.toLowerCase();
    return adversaries
      .filter(
        (a) =>
          a.name.toLowerCase().includes(q) ||
          a.type.toLowerCase().includes(q)
      )
      .slice(0, 5);
  }, [adversaries, search]);

  const handleAdd = useCallback(
    (adversary: Adversary) => {
      onAddAdversary(adversary);
      setSearch("");
    },
    [onAddAdversary]
  );

  return (
    <div
      className="
        rounded-xl border border-dashed border-slate-700/50
        bg-slate-950/30 p-4 mt-4
        flex flex-col gap-3
      "
    >
      <div className="flex items-center gap-3">
        <input
          type="search"
          placeholder="Quick add adversary…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="
            flex-1 rounded-lg border border-slate-700/40 bg-slate-900/60
            px-3 py-2 text-sm text-[#f7f7ff] placeholder:text-[#b9baa3]/30
            focus:outline-none focus:ring-2 focus:ring-[#577399]
          "
        />
        <button
          type="button"
          onClick={onOpenCatalog}
          className="
            rounded-lg border border-[#577399]/30 bg-[#577399]/10
            px-3 py-2 text-xs font-semibold text-[#577399]
            hover:bg-[#577399]/20 transition-colors
            shrink-0
          "
        >
          Browse Catalog →
        </button>
      </div>

      {/* Search results dropdown */}
      {searchResults.length > 0 && (
        <div className="space-y-1">
          {searchResults.map((a) => (
            <button
              key={a.adversaryId}
              type="button"
              onClick={() => handleAdd(a)}
              className="
                w-full flex items-center gap-3 rounded-lg border
                border-slate-800/60 bg-slate-900/60 px-3 py-2
                hover:border-[#577399]/40 hover:bg-slate-900
                transition-all text-left
              "
            >
              <TierBadge tier={a.tier} size="sm" />
              <span className="text-sm font-medium text-[#f7f7ff]">{a.name}</span>
              <span className="text-[11px] text-[#b9baa3]/50 ml-auto">
                {a.type} · HP {a.hp}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
