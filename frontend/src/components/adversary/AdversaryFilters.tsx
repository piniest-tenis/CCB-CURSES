"use client";

/**
 * src/components/adversary/AdversaryFilters.tsx
 *
 * Filter bar for the adversary catalog. Provides search, tier filter,
 * type filter, and sort controls.
 */

import React from "react";
import type { AdversaryTier, AdversaryType } from "@/types/adversary";

const ADVERSARY_TYPES: AdversaryType[] = [
  "Bruiser",
  "Horde",
  "Leader",
  "Minion",
  "Ranged",
  "Skulk",
  "Social",
  "Solo",
  "Standard",
  "Support",
];

export type SortField = "name" | "tier" | "difficulty" | "hp";

interface AdversaryFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  tierFilter: AdversaryTier | null;
  onTierFilterChange: (tier: AdversaryTier | null) => void;
  typeFilter: AdversaryType | null;
  onTypeFilterChange: (type: AdversaryType | null) => void;
  sortBy: SortField;
  onSortChange: (sort: SortField) => void;
}

export function AdversaryFilters({
  search,
  onSearchChange,
  tierFilter,
  onTierFilterChange,
  typeFilter,
  onTypeFilterChange,
  sortBy,
  onSortChange,
}: AdversaryFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-3 mb-6">
      {/* Search */}
      <div className="relative flex-1 min-w-[200px] max-w-sm">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#b9baa3]/40"
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z"
            clipRule="evenodd"
          />
        </svg>
        <input
          type="search"
          placeholder="Search adversaries…"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="
            w-full rounded-lg border border-slate-700/60 bg-slate-900/80
            pl-9 pr-3 py-2 text-sm text-[#f7f7ff]
            placeholder:text-[#b9baa3]/30
            focus:outline-none focus:ring-2 focus:ring-[#577399] focus:border-[#577399]
            transition-colors
          "
        />
      </div>

      {/* Tier filter */}
      <select
        value={tierFilter ?? ""}
        onChange={(e) =>
          onTierFilterChange(e.target.value ? (Number(e.target.value) as AdversaryTier) : null)
        }
        aria-label="Filter by tier"
        className="
          rounded-lg border border-slate-700/60 bg-slate-900/80
          px-3 py-2 text-sm text-[#b9baa3]
          focus:outline-none focus:ring-2 focus:ring-[#577399]
        "
      >
        <option value="">All Tiers</option>
        <option value="1">Tier 1</option>
        <option value="2">Tier 2</option>
        <option value="3">Tier 3</option>
        <option value="4">Tier 4</option>
      </select>

      {/* Type filter */}
      <select
        value={typeFilter ?? ""}
        onChange={(e) =>
          onTypeFilterChange(e.target.value ? (e.target.value as AdversaryType) : null)
        }
        aria-label="Filter by type"
        className="
          rounded-lg border border-slate-700/60 bg-slate-900/80
          px-3 py-2 text-sm text-[#b9baa3]
          focus:outline-none focus:ring-2 focus:ring-[#577399]
        "
      >
        <option value="">All Types</option>
        {ADVERSARY_TYPES.map((t) => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
      </select>

      {/* Sort */}
      <select
        value={sortBy}
        onChange={(e) => onSortChange(e.target.value as SortField)}
        aria-label="Sort adversaries"
        className="
          rounded-lg border border-slate-700/60 bg-slate-900/80
          px-3 py-2 text-sm text-[#b9baa3]
          focus:outline-none focus:ring-2 focus:ring-[#577399]
        "
      >
        <option value="name">Name</option>
        <option value="tier">Tier</option>
        <option value="difficulty">Difficulty</option>
        <option value="hp">Hit Points</option>
      </select>
    </div>
  );
}
