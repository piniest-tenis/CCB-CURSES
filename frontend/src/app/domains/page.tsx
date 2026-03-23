"use client";

/**
 * src/app/domains/page.tsx
 *
 * Public domain browser. Lists all 11 domains with card counts per level.
 * No auth required.
 */

import React from "react";
import Link from "next/link";
import { useDomains } from "@/hooks/useGameData";
import type { DomainSummary } from "@shared/types";

// ---------------------------------------------------------------------------
// Domain colour + description map
// ---------------------------------------------------------------------------

const DOMAIN_META: Record<string, { colour: string; description: string }> = {
  Artistry:  { colour: "border-purple-700 bg-purple-950/20 text-purple-300 hover:border-purple-500", description: "Uses performance, craft, and influence to shape how others feel and act." },
  Charm:     { colour: "border-pink-700   bg-pink-950/20   text-pink-300   hover:border-pink-500",   description: "Gets things done through social leverage — flattery, deception, and presence." },
  Creature:  { colour: "border-green-700  bg-green-950/20  text-green-300  hover:border-green-500",  description: "Leans into raw instinct — keen senses, physical toughness, and predatory cunning." },
  Faithful:  { colour: "border-yellow-700 bg-yellow-950/20 text-yellow-300 hover:border-yellow-500", description: "Draws power from devotion — divine grace, sacred oaths, and the weight of belief." },
  Oddity:    { colour: "border-teal-700   bg-teal-950/20   text-teal-300   hover:border-teal-500",   description: "Reflects bodies and minds that don't work like everyone else's." },
  Study:     { colour: "border-blue-700   bg-blue-950/20   text-blue-300   hover:border-blue-500",   description: "Applies research, invention, and analysis to solve problems." },
  Thievery:  { colour: "border-orange-700 bg-orange-950/20 text-orange-300 hover:border-orange-500", description: "Covers burglary, pickpocketing, infiltration, and targeted takedowns." },
  Trickery:  { colour: "border-lime-700   bg-lime-950/20   text-lime-300   hover:border-lime-500",   description: "Cons, misdirection, and social sabotage." },
  Valiance:  { colour: "border-red-700    bg-red-950/20    text-red-300    hover:border-red-500",    description: "Projects courage and moral authority — inspiring allies and standing firm when others break." },
  Violence:  { colour: "border-rose-800   bg-rose-950/20   text-rose-300   hover:border-rose-500",   description: "About fighting dirty, fighting hard, and not stopping." },
  Weird:     { colour: "border-indigo-700 bg-indigo-950/20 text-indigo-300 hover:border-indigo-500", description: "Taps into magic that doesn't follow the rules — conjured weapons, psychic abilities, and spectral forces." },
};

// ---------------------------------------------------------------------------
// Domain card
// ---------------------------------------------------------------------------

function DomainCard({ summary }: { summary: DomainSummary }) {
  const meta = DOMAIN_META[summary.domain] ?? {
    colour: "border-burgundy-800 bg-slate-900/50 text-parchment-300 hover:border-burgundy-600",
    description: "",
  };

    const description = summary.description ?? meta.description;

  const levelEntries = Object.entries(summary.cardsByLevel)
    .map(([level, count]) => ({ level: Number(level), count }))
    .sort((a, b) => a.level - b.level);

  return (
    <Link
      href={`/domains/${encodeURIComponent(summary.domain)}`}
      className={`
        group block rounded-xl border p-5 transition-all duration-200
        shadow-card-fantasy hover:shadow-card-fantasy-hover
        ${meta.colour}
      `}
    >
      <div className="flex items-start justify-between mb-2">
        <h3 className="font-serif text-xl font-semibold group-hover:opacity-90 transition-opacity">
          {summary.domain}
        </h3>
        <span className="shrink-0 rounded border border-current/30 bg-current/10 px-2 py-0.5 text-xs font-bold opacity-70">
          {summary.cardCount} cards
        </span>
      </div>

      {description && (
        <p className="text-sm opacity-60 mb-3">{description}</p>
      )}

      {/* Per-level breakdown */}
      <div className="flex flex-wrap gap-1.5">
        {levelEntries.map(({ level, count }) => (
          <span
            key={level}
            className="rounded border border-current/20 bg-current/5 px-1.5 py-0.5 text-xs opacity-70"
          >
            Lv{level}: {count}
          </span>
        ))}
      </div>
    </Link>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function DomainsPage() {
  const { data, isLoading, isError } = useDomains();
  const domains = data?.domains ?? [];

  const totalCards = domains.reduce((sum, d) => sum + d.cardCount, 0);

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Top bar */}
      <header className="border-b border-burgundy-900/50 bg-slate-900/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Link href="/dashboard" className="font-serif text-xl font-bold text-parchment-100 hover:text-gold-300 transition-colors focus:outline-none focus:ring-2 focus:ring-gold-500 rounded">
            Daggerheart
          </Link>
          <nav aria-label="Site navigation" className="flex gap-5 text-sm text-parchment-500">
            <Link href="/classes" className="hover:text-parchment-300 transition-colors focus:outline-none focus:ring-2 focus:ring-gold-500 rounded">Classes</Link>
            <Link href="/domains" aria-current="page" className="text-parchment-200 font-medium focus:outline-none focus:ring-2 focus:ring-gold-500 rounded">Domains</Link>
            <Link href="/dashboard" className="hover:text-parchment-300 transition-colors focus:outline-none focus:ring-2 focus:ring-gold-500 rounded">My Characters</Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">
        {/* Page header */}
        <div className="mb-6">
          <h1 className="font-serif text-3xl font-bold text-parchment-100">Domains</h1>
          <p className="mt-1 text-sm text-parchment-500">
            {domains.length} domains · {totalCards} domain cards in The Land of Tidwell
          </p>
        </div>

        {/* Loading */}
        {isLoading && (
          <div role="status" className="flex items-center justify-center py-20">
            <div aria-hidden="true" className="h-8 w-8 animate-spin rounded-full border-2 border-burgundy-500 border-t-transparent" />
            <span className="sr-only">Loading domains…</span>
          </div>
        )}

        {/* Error */}
        {isError && !isLoading && (
          <div role="alert" className="rounded-xl border border-burgundy-700 bg-slate-900 p-8 text-center">
            <p className="text-burgundy-300">Failed to load domains.</p>
          </div>
        )}

        {/* Grid */}
        {!isLoading && !isError && domains.length > 0 && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {domains.map((d) => (
              <DomainCard key={d.domain} summary={d} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
