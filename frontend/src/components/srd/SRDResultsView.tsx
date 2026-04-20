"use client";

/**
 * src/components/srd/SRDResultsView.tsx
 *
 * Displays ranked search results grouped by section.
 *
 * Features:
 *   - Result count header: "N results for 'query'"
 *   - Exact-before-fuzzy filtering with "Show all" escape hatch
 *   - Results grouped by section with coloured section dividers
 *   - Sub-entry results render as detail cards (weapon/armor/loot/adversary/etc.)
 *   - Chunk results render as expandable SRDAccordionItem entries
 *   - "Similar entries" pill strip below each chunk result (via getSimilar callback)
 *   - Empty state with a "Did you mean?" nudge if provided
 *   - Scroll-to-top on query change via key prop on the outer div
 */

import React, { useMemo, useState } from "react";
import { SRDAccordionItem } from "./SRDAccordionItem";
import { SRDDetailCard } from "./SRDDetailCards";
import type { SearchResult, SRDChunk } from "@/lib/srdSearch";

// ─── Section accent colours ───────────────────────────────────────────────────

const SECTION_DIVIDER: Record<string, string> = {
  Introduction:           "border-l-parchment-500/60 text-parchment-400",
  "Character Creation":   "border-l-gold-500/60 text-gold-400",
  Classes:                "border-l-burgundy-500/60 text-burgundy-400",
  Ancestries:             "border-l-amber-500/60 text-amber-400",
  Communities:            "border-l-emerald-500/60 text-emerald-400",
  Domains:                "border-l-violet-500/60 text-violet-400",
  "Core Mechanics":       "border-l-gold-500/60 text-gold-400",
  "Running an Adventure": "border-l-coral-500/60 text-coral-400",
  Appendix:               "border-l-parchment-600/60 text-parchment-500",
};

// ─── Props ────────────────────────────────────────────────────────────────────

interface SRDResultsViewProps {
  query: string;
  results: SearchResult[];
  /** Called when user selects a result (for recording in recent searches). */
  onSelectResult: (chunkId: string) => void;
  /** Returns similar chunks for a given chunk id. */
  getSimilar: (chunkId: string, limit?: number) => SRDChunk[];
  /** "Did you mean?" corrected query. */
  didYouMean?: string | null;
  /** Called when user clicks "Did you mean: X?" */
  onDidYouMean?: (corrected: string) => void;
  /** Called when user clicks "Browse section" link. */
  onBrowseSection?: (section: string) => void;
}

// ─── Similar entries pills ────────────────────────────────────────────────────

function SimilarPills({
  chunkId,
  getSimilar,
  onSelect,
}: {
  chunkId: string;
  getSimilar: (id: string, limit?: number) => SRDChunk[];
  onSelect: (id: string) => void;
}) {
  const similar = getSimilar(chunkId, 4);
  if (similar.length === 0) return null;

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      <span className="text-xs text-[#b9baa3]/50 font-medium">Similar:</span>
      {similar.map((chunk) => (
        <a
          key={chunk.id}
          href={`#${chunk.id}`}
          onClick={() => onSelect(chunk.id)}
          className="
            inline-flex items-center rounded-full border border-gold-400/25
            bg-gold-400/10 px-3 py-1 text-xs font-medium text-gold-400
            transition-colors hover:border-gold-400/50 hover:bg-gold-400/20 hover:text-[#f7f7ff]
            focus:outline-none focus:ring-2 focus:ring-gold-400 focus:ring-offset-1 focus:ring-offset-[#0a100d]
          "
        >
          {chunk.title}
        </a>
      ))}
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function SRDResultsView({
  query,
  results,
  onSelectResult,
  getSimilar,
  didYouMean,
  onDidYouMean,
  onBrowseSection,
}: SRDResultsViewProps) {
  // ── Exact-before-fuzzy filtering (§3a) ──────────────────────────────────
  const [showAllResults, setShowAllResults] = useState(false);

  const { displayResults, exactCount, totalCount, isFiltered } = useMemo(() => {
    const total = results.length;
    const exactResults = results.filter(r => r.matchQuality === 'exact');
    const exact = exactResults.length;

    // Show all if: user toggled, no exact matches, or all are exact
    if (showAllResults || exact === 0 || exact === total) {
      return { displayResults: results, exactCount: exact, totalCount: total, isFiltered: false };
    }

    return { displayResults: exactResults, exactCount: exact, totalCount: total, isFiltered: true };
  }, [results, showAllResults]);

  // Reset "show all" when query changes
  useMemo(() => {
    setShowAllResults(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  // Group results by section, preserving rank order within each group
  const grouped = useMemo<[string, SearchResult[]][]>(() => {
    const map = new Map<string, SearchResult[]>();
    for (const result of displayResults) {
      const key = result.chunk.section;
      const group = map.get(key);
      if (group) {
        group.push(result);
      } else {
        map.set(key, [result]);
      }
    }
    return Array.from(map.entries());
  }, [displayResults]);

  // ── Empty state ──────────────────────────────────────────────────────────────
  if (results.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <i
          className="fa-solid fa-magnifying-glass mb-4 text-4xl text-gold-400/30"
          aria-hidden="true"
        />
        <p className="text-lg font-bold text-[#f7f7ff]/70">
          No results for{" "}
           <span className="text-gold-400">&ldquo;{query}&rdquo;</span>
        </p>
        <p className="mt-2 text-sm text-[#b9baa3]/50">
          Try different keywords or browse a section below.
        </p>

        {/* Did you mean? */}
        {didYouMean && onDidYouMean && (
          <div className="mt-5 rounded-lg border border-gold-400/30 bg-gold-400/10 px-5 py-3 text-sm">
            <span className="text-[#b9baa3]/70">Did you mean: </span>
            <button
              type="button"
              onClick={() => onDidYouMean(didYouMean)}
              className="font-bold text-gold-400 underline decoration-gold-400/50 hover:decoration-gold-400 focus:outline-none focus:ring-2 focus:ring-gold-400 rounded"
            >
              {didYouMean}
            </button>
            <span className="text-[#b9baa3]/70">?</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-10" aria-live="polite" aria-atomic="false">
      {/* ── Result count header ── */}
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <p className="text-lg font-bold text-[#f7f7ff]">
          <span className="text-gold-400">{displayResults.length}</span>{" "}
          {isFiltered ? "exact " : ""}
          result{displayResults.length !== 1 ? "s" : ""} for{" "}
          <span className="text-[#b9baa3]">&ldquo;{query}&rdquo;</span>
        </p>

        {/* Show all escape hatch (§3a) */}
        {isFiltered && (
          <button
            type="button"
            onClick={() => setShowAllResults(true)}
            className="text-xs font-medium text-gold-400/60 hover:text-gold-400 transition-colors focus:outline-none focus:ring-2 focus:ring-gold-400 rounded"
          >
            Show all {totalCount} results
          </button>
        )}
      </div>

      {/* ── Grouped results ── */}
      {grouped.map(([section, sectionResults]) => {
        const dividerClass = SECTION_DIVIDER[section] ?? "border-l-slate-600/50 text-[#b9baa3]";

        return (
          <section key={section} aria-label={`${section} results`}>
            {/* Section divider */}
            <div className={`mb-4 flex items-center justify-between border-l-4 pl-4 ${dividerClass}`}>
              <h2 className="text-sm font-bold uppercase tracking-widest">
                {section}
                <span className="ml-2 font-normal opacity-60">
                  ({sectionResults.length})
                </span>
              </h2>
              {onBrowseSection && (
                <button
                  type="button"
                  onClick={() => onBrowseSection(section)}
                  className="text-xs font-medium text-gold-400/60 hover:text-gold-400 transition-colors focus:outline-none focus:ring-2 focus:ring-gold-400 rounded"
                >
                  Browse section &rarr;
                </button>
              )}
            </div>

            {/* Result items */}
            <div className="space-y-3">
              {sectionResults.map((result, resultIdx) => (
                <div
                  key={result.subEntry?.id ?? result.chunk.id}
                  id={result.subEntry?.id ?? result.chunk.id}
                  className={resultIdx % 2 === 1 ? "bg-slate-900/20 rounded-lg" : ""}
                  style={{ animationDelay: `${Math.min(resultIdx * 30, 300)}ms` }}
                >
                  {result.subEntry ? (
                    /* ── Sub-entry: render detail card ── */
                    <SRDDetailCard
                      subEntry={result.subEntry}
                      onBreadcrumbClick={() => onSelectResult(result.chunk.id)}
                    />
                  ) : (
                    /* ── Chunk: render accordion item ── */
                    <>
                      {/* Breadcrumb: Section > Subsection */}
                      {result.chunk.subsection && (
                        <p className="px-4 pt-2 text-[11px] text-[#b9baa3]/40">
                          <span>{result.chunk.section}</span>
                          <span className="mx-1.5">&rsaquo;</span>
                          <span>{result.chunk.subsection}</span>
                        </p>
                      )}
                      <SRDAccordionItem
                        chunk={result.chunk}
                        defaultOpen={false}
                        showSectionBadge={false}
                        className="border-slate-700/50"
                      />
                      <SimilarPills
                        chunkId={result.chunk.id}
                        getSimilar={getSimilar}
                        onSelect={onSelectResult}
                      />
                    </>
                  )}
                </div>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
