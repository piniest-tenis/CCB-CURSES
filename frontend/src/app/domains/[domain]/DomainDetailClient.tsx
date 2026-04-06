"use client";

/**
 * src/app/domains/[domain]/page.tsx
 *
 * Domain detail page. Shows all cards for a single domain grouped by level.
 * Supports optional ?level= filter. Renders cursed/grimoire card variants.
 * No auth required.
 */

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useDomain } from "@/hooks/useGameData";
import type { DomainCard } from "@shared/types";
import { MarkdownContent } from "@/components/MarkdownContent";
import { SourceBadge } from "@/components/SourceBadge";
import { SourceFilter, matchesSourceFilter, type SourceFilterValue } from "@/components/SourceFilter";
import { useSourceFilterDefault } from "@/hooks/useSourceFilterDefault";

// ---------------------------------------------------------------------------
// Domain colours
// ---------------------------------------------------------------------------

const DOMAIN_COLOUR: Record<string, string> = {
  Artistry:  "text-purple-300  border-purple-700",
  Charm:     "text-pink-300    border-pink-700",
  Creature:  "text-green-300   border-green-700",
  Faithful:  "text-yellow-300  border-yellow-700",
  Oddity:    "text-teal-300    border-teal-700",
  Study:     "text-blue-300    border-blue-700",
  Thievery:  "text-orange-300  border-orange-700",
  Trickery:  "text-lime-300    border-lime-700",
  Valiance:  "text-red-300     border-red-700",
  Violence:  "text-rose-300    border-rose-800",
  Weird:     "text-indigo-300  border-indigo-700",
};

// ---------------------------------------------------------------------------
// Domain card tile
// ---------------------------------------------------------------------------

function CardTile({ card }: { card: DomainCard }) {
  const [expanded, setExpanded] = useState(false);
  const bodyId = `card-body-${card.cardId}`;

  const badges: React.ReactNode[] = [];
  if (card.isCursed) {
    badges.push(
      <span key="cursed" className="rounded border border-burgundy-700 bg-burgundy-950/40 px-1.5 py-0.5 text-xs text-burgundy-300">
        ★ Cursed
      </span>
    );
  }
  if (card.isLinkedCurse) {
    badges.push(
      <span key="linked" className="rounded border border-indigo-700 bg-indigo-950/40 px-1.5 py-0.5 text-xs text-indigo-300">
        ↔ Linked
      </span>
    );
  }
  if (card.isGrimoire) {
    badges.push(
      <span key="grimoire" className="rounded border border-teal-700 bg-teal-950/40 px-1.5 py-0.5 text-xs text-teal-300">
        Grimoire
      </span>
    );
  }

  return (
    <div
      className={`
        rounded-lg border bg-slate-900/60 overflow-hidden
        ${card.isCursed ? "border-burgundy-800/70" : "border-slate-700/60"}
      `}
    >
      {/* Card header */}
      <button
        onClick={() => setExpanded((e) => !e)}
        aria-expanded={expanded}
        aria-controls={bodyId}
        className="w-full flex items-start justify-between gap-3 px-4 py-3 text-left hover:bg-slate-850/30 transition-colors focus:outline-none focus:ring-2 focus:ring-inset focus:ring-gold-500"
      >
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-1.5 mb-1">
            <span className="font-semibold text-sm text-parchment-200">{card.name}</span>
            <SourceBadge source={card.source} size="sm" />
            {badges}
          </div>
        </div>
        <span aria-hidden="true" className="shrink-0 text-parchment-700 select-none">{expanded ? "▲" : "▼"}</span>
      </button>

      {/* Expanded body */}
      {expanded && (
        <div id={bodyId} className="px-4 pb-4 space-y-3 border-t border-slate-700/40">
          {/* Simple description */}
          {!card.isGrimoire && card.description && (
            <MarkdownContent className="text-base text-parchment-400 leading-relaxed pt-3">
              {card.description}
            </MarkdownContent>
          )}

          {/* Grimoire sub-abilities */}
          {card.isGrimoire && card.grimoire.length > 0 && (
            <div className="pt-3 space-y-3">
              {card.grimoire.map((ability) => (
                <div key={ability.name} className="rounded border border-teal-900/50 bg-teal-950/10 px-3 py-2">
                  <p className="text-xs font-semibold text-teal-300 mb-1">{ability.name}</p>
                  <MarkdownContent className="text-base text-parchment-400 leading-relaxed">
                    {ability.description}
                  </MarkdownContent>
                </div>
              ))}
            </div>
          )}

          {/* Curse text */}
          {card.isCursed && card.curseText && (
            <div className="rounded border border-burgundy-800/60 bg-burgundy-950/20 px-3 py-2">
              <p className="text-xs font-semibold text-burgundy-400 mb-1">Curse</p>
              <MarkdownContent
                className="text-sm text-burgundy-300 leading-relaxed"
                linkClassName="underline decoration-burgundy-500/60 hover:decoration-burgundy-400 text-burgundy-200 hover:text-burgundy-100 transition-colors"
              >
                {card.curseText}
              </MarkdownContent>
            </div>
          )}

          {/* Linked card IDs */}
          {card.isLinkedCurse && card.linkedCardIds.length > 0 && (
            <div className="text-xs text-parchment-600">
              <span className="font-medium text-parchment-500">Linked to: </span>
              {card.linkedCardIds.join(", ")}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function DomainDetailPage() {
  return (
    <Suspense
      fallback={
        <div role="status" className="flex min-h-screen items-center justify-center bg-slate-950">
          <div aria-hidden="true" className="h-8 w-8 animate-spin rounded-full border-2 border-burgundy-500 border-t-transparent" />
          <span className="sr-only">Loading domain…</span>
        </div>
      }
    >
      <DomainDetailContent />
    </Suspense>
  );
}

function DomainDetailContent() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const levelParam = searchParams?.get("level");

  const domainName = decodeURIComponent(pathname?.split("/")[2] ?? "");
  const levelFilter = levelParam ? Number(levelParam) : undefined;

  const { data, isLoading, isError } = useDomain(domainName, levelFilter);
  const [search, setSearch] = useState("");
  const sourceFilterDefault = useSourceFilterDefault();
  const [sourceOverride, setSourceOverride] = useState<SourceFilterValue | null>(null);
  const sourceFilter = sourceOverride ?? sourceFilterDefault;

  const cards = data?.cards ?? [];

  // Group by level
  const byLevel = cards.reduce<Record<number, DomainCard[]>>((acc, card) => {
    if (!acc[card.level]) acc[card.level] = [];
    acc[card.level].push(card);
    return acc;
  }, {});

  const levels = Object.keys(byLevel).map(Number).sort((a, b) => a - b);

  // Apply search + source filter
  const filteredByLevel = levels.reduce<Record<number, DomainCard[]>>((acc, level) => {
    const filtered = byLevel[level].filter(
      (c) =>
        (search === "" ||
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.description.toLowerCase().includes(search.toLowerCase())) &&
        matchesSourceFilter(c.source, sourceFilter)
    );
    if (filtered.length > 0) acc[level] = filtered;
    return acc;
  }, {});

  const domainColour = DOMAIN_COLOUR[domainName] ?? "text-parchment-300 border-burgundy-700";

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Top bar */}
      <header className="border-b border-burgundy-900/50 bg-slate-900/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-4">
          <button
            onClick={() => router.back()}
            aria-label="Go back"
            className="text-parchment-600 hover:text-parchment-300 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-gold-500 rounded"
          >
            ← Back
          </button>
          <span className="text-burgundy-800 select-none">/</span>
          <Link href="/domains" className="text-sm text-parchment-500 hover:text-parchment-300 transition-colors focus:outline-none focus:ring-2 focus:ring-gold-500 rounded">
            Domains
          </Link>
          <span className="text-burgundy-800 select-none">/</span>
          <span className={`text-sm font-medium ${domainColour.split(" ")[0]}`}>{domainName}</span>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8">
        {/* Page header */}
        <div className="mb-6">
          <h1 className={`font-serif text-3xl font-bold mb-1 ${domainColour.split(" ")[0]}`}>
            {domainName}
          </h1>
          <p className="text-sm text-parchment-500">
            {cards.length} domain card{cards.length !== 1 ? "s" : ""}
            {levelFilter !== undefined && ` at level ${levelFilter}`}
          </p>
        </div>

        {/* Loading */}
        {isLoading && (
          <div role="status" className="flex items-center justify-center py-20">
            <div aria-hidden="true" className="h-8 w-8 animate-spin rounded-full border-2 border-burgundy-500 border-t-transparent" />
            <span className="sr-only">Loading domain cards…</span>
          </div>
        )}

        {/* Error */}
        {isError && !isLoading && (
          <div role="alert" className="rounded-xl border border-burgundy-700 bg-slate-900 p-8 text-center">
            <p className="text-burgundy-300">Domain not found or failed to load.</p>
            <Link href="/domains" className="mt-3 inline-block text-sm text-gold-500 hover:text-gold-400 focus:outline-none focus:ring-2 focus:ring-gold-500 rounded">
              Back to domains
            </Link>
          </div>
        )}

        {!isLoading && !isError && cards.length > 0 && (
          <>
            {/* Search + level filter + source filter */}
            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
              <label htmlFor="card-search" className="sr-only">Search cards</label>
              <input
                id="card-search"
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search cards…"
                className="
                  w-full sm:w-64 rounded-lg border border-burgundy-800 bg-slate-900
                  px-3 py-2 text-sm text-parchment-200 placeholder-parchment-700
                  focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-gold-500
                "
              />
              <SourceFilter value={sourceFilter} onChange={setSourceOverride} defaultFilter={sourceFilterDefault} />
              <div role="group" aria-label="Filter by level" className="flex gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => router.push(`/domains/${encodeURIComponent(domainName)}`)}
                  aria-pressed={levelFilter === undefined}
                  className={`rounded px-3 py-1.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-gold-500 ${
                    levelFilter === undefined
                      ? "bg-burgundy-700 text-parchment-100"
                      : "border border-burgundy-800 text-parchment-500 hover:text-parchment-300"
                  }`}
                >
                  All
                </button>
                {levels.map((l) => (
                  <button
                    key={l}
                    type="button"
                    onClick={() =>
                      router.push(`/domains/${encodeURIComponent(domainName)}?level=${l}`)
                    }
                    aria-pressed={levelFilter === l}
                    className={`rounded px-3 py-1.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-gold-500 ${
                      levelFilter === l
                        ? "bg-burgundy-700 text-parchment-100"
                        : "border border-burgundy-800 text-parchment-500 hover:text-parchment-300"
                    }`}
                  >
                    Lv {l}
                  </button>
                ))}
              </div>
            </div>

            {/* Cards by level */}
            {Object.keys(filteredByLevel).length === 0 ? (
              <p className="text-parchment-500 text-sm">No cards match your search.</p>
            ) : (
              <div className="space-y-8">
                {Object.keys(filteredByLevel)
                  .map(Number)
                  .sort((a, b) => a - b)
                  .map((level) => (
                    <div key={level}>
                      <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-parchment-600 flex items-center gap-2">
                        <span className={`h-px flex-1 ${domainColour.split(" ")[1]} border-t`} />
                        Level {level}
                        <span className={`h-px flex-1 ${domainColour.split(" ")[1]} border-t`} />
                      </h2>
                      <div className="space-y-2">
                        {filteredByLevel[level].map((card) => (
                          <CardTile key={card.cardId} card={card} />
                        ))}
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
