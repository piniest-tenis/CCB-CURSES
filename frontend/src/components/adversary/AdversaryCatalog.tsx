"use client";

/**
 * src/components/adversary/AdversaryCatalog.tsx
 *
 * Full adversary catalog view — filter bar + responsive card grid.
 * Handles search, filter, sort, and empty state.
 */

import React, { useMemo, useState, useCallback } from "react";
import type { Adversary, AdversaryTier, AdversaryType } from "@/types/adversary";
import { useAdversaries } from "@/hooks/useAdversaries";
import { AdversaryCard } from "./AdversaryCard";
import { AdversaryFilters, type SortField } from "./AdversaryFilters";

interface AdversaryCatalogProps {
  campaignId: string;
  onAddToEncounter?: (adversary: Adversary) => void;
}

export function AdversaryCatalog({ campaignId, onAddToEncounter }: AdversaryCatalogProps) {
  const { adversaries, isLoading, deleteAdversary } = useAdversaries(campaignId);

  // Filter + sort state
  const [search, setSearch] = useState("");
  const [tierFilter, setTierFilter] = useState<AdversaryTier | null>(null);
  const [typeFilter, setTypeFilter] = useState<AdversaryType | null>(null);
  const [sortBy, setSortBy] = useState<SortField>("name");

  // Filter + sort logic
  const filtered = useMemo(() => {
    let result = adversaries;

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (a) =>
          a.name.toLowerCase().includes(q) ||
          a.description.toLowerCase().includes(q) ||
          a.type.toLowerCase().includes(q)
      );
    }

    // Tier
    if (tierFilter !== null) {
      result = result.filter((a) => a.tier === tierFilter);
    }

    // Type
    if (typeFilter !== null) {
      result = result.filter((a) => a.type === typeFilter);
    }

    // Sort
    const sorted = [...result];
    switch (sortBy) {
      case "name":
        sorted.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case "tier":
        sorted.sort((a, b) => a.tier - b.tier || a.name.localeCompare(b.name));
        break;
      case "difficulty":
        sorted.sort((a, b) => a.difficulty - b.difficulty || a.name.localeCompare(b.name));
        break;
      case "hp":
        sorted.sort((a, b) => a.hp - b.hp || a.name.localeCompare(b.name));
        break;
    }

    return sorted;
  }, [adversaries, search, tierFilter, typeFilter, sortBy]);

  const handleDelete = useCallback(
    (adversaryId: string) => {
      if (window.confirm("Delete this adversary? This cannot be undone.")) {
        deleteAdversary(adversaryId);
      }
    },
    [deleteAdversary]
  );

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-10 w-full rounded-lg bg-slate-700/40 animate-pulse" />
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-64 rounded-xl bg-slate-700/30 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-serif-sc text-sm font-semibold tracking-widest text-[#577399]">
          Adversaries
        </h2>
        {/* TODO: wire up + New Adversary modal */}
        <button
          type="button"
          className="
            rounded-lg border border-[#577399]/40 bg-[#577399]/10
            px-3 py-1.5 text-xs font-semibold text-[#577399]
            hover:bg-[#577399]/20 hover:border-[#577399] hover:text-[#f7f7ff]
            transition-all duration-150
            focus:outline-none focus:ring-2 focus:ring-[#577399]
          "
        >
          + New Adversary
        </button>
      </div>

      {/* Filters */}
      <AdversaryFilters
        search={search}
        onSearchChange={setSearch}
        tierFilter={tierFilter}
        onTierFilterChange={setTierFilter}
        typeFilter={typeFilter}
        onTypeFilterChange={setTypeFilter}
        sortBy={sortBy}
        onSortChange={setSortBy}
      />

      {/* Card grid or empty state */}
      {filtered.length === 0 ? (
        <div
          className="
            flex flex-col items-center justify-center
            min-h-[400px] rounded-2xl
            border border-dashed border-slate-700/50
            text-center space-y-3
          "
          style={{ background: "rgba(87,115,153,0.03)" }}
        >
          <div aria-hidden="true" className="text-4xl opacity-20">
            👹
          </div>
          <p className="font-serif text-lg text-[#f7f7ff]/60">
            {adversaries.length === 0 ? "No adversaries yet" : "No matches"}
          </p>
          <p className="text-sm text-[#b9baa3]/40 max-w-xs">
            {adversaries.length === 0
              ? "Create your first adversary to start building your bestiary."
              : "Try adjusting your search or filters."}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((a) => (
            <AdversaryCard
              key={a.adversaryId}
              adversary={a}
              onAddToEncounter={onAddToEncounter}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
