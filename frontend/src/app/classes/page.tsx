"use client";

/**
 * src/app/classes/page.tsx
 *
 * Public class browser. Lists all available Daggerheart classes with
 * their domain colours, starting stats, and subclass count.
 * No auth required — uses the public /classes endpoint.
 */

import React, { useState } from "react";
import Link from "next/link";
import { useClasses } from "@/hooks/useGameData";
import type { ClassSummary } from "@shared/types";

// ---------------------------------------------------------------------------
// Domain badge colour map
// ---------------------------------------------------------------------------

const DOMAIN_COLOURS: Record<string, string> = {
  Artistry:  "border-purple-700  bg-purple-950/40  text-purple-300",
  Charm:     "border-pink-700    bg-pink-950/40    text-pink-300",
  Creature:  "border-green-700   bg-green-950/40   text-green-300",
  Faithful:  "border-yellow-700  bg-yellow-950/40  text-yellow-300",
  Oddity:    "border-teal-700    bg-teal-950/40    text-teal-300",
  Study:     "border-blue-700    bg-blue-950/40    text-blue-300",
  Thievery:  "border-orange-700  bg-orange-950/40  text-orange-300",
  Trickery:  "border-lime-700    bg-lime-950/40    text-lime-300",
  Valiance:  "border-red-700     bg-red-950/40     text-red-300",
  Violence:  "border-rose-800    bg-rose-950/40    text-rose-300",
  Weird:     "border-indigo-700  bg-indigo-950/40  text-indigo-300",
};

function DomainBadge({ domain }: { domain: string }) {
  const colour = DOMAIN_COLOURS[domain] ?? "border-burgundy-800 bg-burgundy-950/30 text-burgundy-400";
  return (
    <span className={`inline-block rounded border px-2 py-0.5 text-xs font-medium ${colour}`}>
      {domain}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Class card
// ---------------------------------------------------------------------------

function ClassCard({ cls }: { cls: ClassSummary }) {
  return (
    <Link
      href={`/classes/${cls.classId}`}
      className="
        group block rounded-xl border border-burgundy-900 bg-slate-900/80
        p-5 shadow-card-fantasy hover:shadow-card-fantasy-hover
        hover:border-burgundy-700 transition-all duration-200
      "
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <h3 className="font-serif text-xl font-semibold text-parchment-100 group-hover:text-gold-300 transition-colors">
          {cls.name}
        </h3>
        <span className="shrink-0 rounded border border-gold-800 bg-gold-950/20 px-2 py-0.5 text-xs font-bold text-gold-400">
          {cls.subclasses.length} subclass{cls.subclasses.length !== 1 ? "es" : ""}
        </span>
      </div>

      {/* Domains */}
      <div className="mb-3 flex flex-wrap gap-1.5">
        {cls.domains.map((d) => (
          <DomainBadge key={d} domain={d} />
        ))}
      </div>

      {/* Starting stats */}
      <div className="flex gap-4 text-sm text-parchment-400">
        <span>
          <span className="text-parchment-600 uppercase tracking-wider mr-1 text-xs">EVA</span>
          <span className="font-semibold text-parchment-200">{cls.startingEvasion}</span>
        </span>
        <span>
          <span className="text-parchment-600 uppercase tracking-wider mr-1 text-xs">HP</span>
          <span className="font-semibold text-parchment-200">{cls.startingHitPoints}</span>
        </span>
      </div>

      {/* Subclass preview */}
      {cls.subclasses.length > 0 && (
        <div className="mt-3 border-t border-burgundy-900/50 pt-3">
          <p className="text-xs text-parchment-700 mb-1.5 uppercase tracking-wider">
            Subclasses
          </p>
          <p className="text-sm text-parchment-500 line-clamp-1">
            {cls.subclasses.map((s) => s.name).join(" · ")}
          </p>
        </div>
      )}
    </Link>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function ClassesPage() {
  const { data, isLoading, isError } = useClasses();
  const [search, setSearch] = useState("");
  const [filterDomain, setFilterDomain] = useState<string>("");

  const classes = data?.classes ?? [];

  const allDomains = Array.from(
    new Set(classes.flatMap((c) => c.domains))
  ).sort();

  const filtered = classes.filter((c) => {
    const matchesSearch =
      search === "" ||
      c.name.toLowerCase().includes(search.toLowerCase());
    const matchesDomain =
      filterDomain === "" || c.domains.includes(filterDomain);
    return matchesSearch && matchesDomain;
  });

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Top bar */}
      <header className="border-b border-burgundy-900/50 bg-slate-900/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Link href="/dashboard" className="font-serif text-xl font-bold text-parchment-100 hover:text-gold-300 transition-colors">
            Daggerheart
          </Link>
          <nav className="flex gap-5 text-sm text-parchment-500">
            <Link href="/classes" className="text-parchment-200 font-medium">Classes</Link>
            <Link href="/domains" className="hover:text-parchment-300 transition-colors">Domains</Link>
            <Link href="/dashboard" className="hover:text-parchment-300 transition-colors">My Characters</Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">
        {/* Page header */}
        <div className="mb-6">
          <h1 className="font-serif text-3xl font-bold text-parchment-100">Classes</h1>
          <p className="mt-1 text-sm text-parchment-500">
            {classes.length} classes available in The Land of Tidwell
          </p>
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search classes…"
            className="
              w-full sm:w-64 rounded-lg border border-burgundy-800 bg-slate-900
              px-3 py-2 text-sm text-parchment-200 placeholder-parchment-700
              focus:outline-none focus:border-gold-500
            "
          />
          <select
            value={filterDomain}
            onChange={(e) => setFilterDomain(e.target.value)}
            className="
              rounded-lg border border-burgundy-800 bg-slate-900
              px-3 py-2 text-sm text-parchment-200
              focus:outline-none focus:border-gold-500
            "
          >
            <option value="">All domains</option>
            {allDomains.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
          {(search || filterDomain) && (
            <button
              onClick={() => { setSearch(""); setFilterDomain(""); }}
              className="text-xs text-parchment-600 hover:text-parchment-400 transition-colors"
            >
              Clear filters
            </button>
          )}
          <span className="text-xs text-parchment-600 sm:ml-auto">
            {filtered.length} result{filtered.length !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-burgundy-500 border-t-transparent" />
          </div>
        )}

        {/* Error */}
        {isError && !isLoading && (
          <div className="rounded-xl border border-burgundy-700 bg-slate-900 p-8 text-center">
            <p className="text-burgundy-300">Failed to load classes.</p>
          </div>
        )}

        {/* Empty filter result */}
        {!isLoading && !isError && filtered.length === 0 && classes.length > 0 && (
          <div className="rounded-xl border border-dashed border-burgundy-900 p-12 text-center">
            <p className="text-parchment-500">No classes match your filters.</p>
          </div>
        )}

        {/* Grid */}
        {!isLoading && !isError && filtered.length > 0 && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((cls) => (
              <ClassCard key={cls.classId} cls={cls} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
