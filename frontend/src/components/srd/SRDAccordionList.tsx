"use client";

/**
 * src/components/srd/SRDAccordionList.tsx
 *
 * Renders a full section of SRD chunks as a list of collapsible accordions.
 * Used for entity-centric sections (Classes, Ancestries, Communities, etc.)
 * where each chunk is an individual named entry.
 *
 * Features:
 *   - Entry count header: "14 Adversaries"
 *   - Groups chunks by subsection if subsections are present
 *   - Subsection group containers with small-caps headers + entry counts
 *   - Ornamental flourish dividers between subsection groups
 *   - "Show more" pagination for groups exceeding 10 items
 *   - Overview entry hero treatment (gold gradient, defaultOpen)
 *   - Empty-state message when no chunks are available
 *   - Subtle stagger animation via inline style delay
 */

import React, { useMemo, useState, useCallback } from "react";
import { SRDAccordionItem } from "./SRDAccordionItem";
import { SRDSubsectionNav } from "./SRDSubsectionNav";
import type { SRDChunk } from "@/lib/srdSearch";

// ─── Constants ────────────────────────────────────────────────────────────────

/** Max items shown before "Show more" button appears. */
const INITIAL_VISIBLE = 10;

// ─── Props ────────────────────────────────────────────────────────────────────

interface SRDAccordionListProps {
  /** The section label shown in the count header, e.g. "Adversaries". */
  sectionLabel: string;
  /** Chunks to render. */
  chunks: SRDChunk[];
  /** If true, group entries by their subsection field. */
  groupBySubsection?: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function groupChunks(chunks: SRDChunk[]): Map<string, SRDChunk[]> {
  const map = new Map<string, SRDChunk[]>();
  for (const chunk of chunks) {
    const key = chunk.subsection ?? "";
    const group = map.get(key);
    if (group) {
      group.push(chunk);
    } else {
      map.set(key, [chunk]);
    }
  }
  return map;
}

/** Returns true if a chunk looks like an overview/intro entry. */
function isOverviewChunk(chunk: SRDChunk): boolean {
  const lower = chunk.id.toLowerCase();
  return lower.endsWith("-overview") || lower.includes("introduction") || lower.endsWith("-intro");
}

// ─── Ornamental flourish divider ──────────────────────────────────────────────

function OrnamentalDivider() {
  return (
    <div className="flex items-center gap-3 py-2" aria-hidden="true">
      <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-700/50 to-transparent" />
      <span className="text-xs text-gold-400/40 select-none">&#x27E0;</span>
      <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-700/50 to-transparent" />
    </div>
  );
}

// ─── Paginated subsection group ───────────────────────────────────────────────

function SubsectionGroup({
  subsection,
  chunks,
  sectionLabel,
  startIndex,
}: {
  subsection: string;
  chunks: SRDChunk[];
  sectionLabel: string;
  startIndex: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const needsPagination = chunks.length > INITIAL_VISIBLE;
  const visibleChunks = expanded ? chunks : chunks.slice(0, INITIAL_VISIBLE);
  const hiddenCount = chunks.length - INITIAL_VISIBLE;

  const handleExpand = useCallback(() => setExpanded(true), []);

  return (
    <section
      aria-label={subsection || sectionLabel}
      className={
        subsection
          ? "rounded-lg bg-slate-900/40 ring-1 ring-slate-700/30 p-4 sm:p-5"
          : ""
      }
    >
      {/* Subsection header with small-caps + entry count */}
      {subsection && (
        <div className="mb-3 flex items-center gap-3">
          <h3 className="font-serif-sc text-sm font-bold uppercase tracking-widest text-gold-500/80">
            {subsection}
          </h3>
          <span className="text-xs text-[#b9baa3]/40">
            {chunks.length} {chunks.length === 1 ? "entry" : "entries"}
          </span>
          <div className="h-px flex-1 bg-slate-800/60" aria-hidden="true" />
        </div>
      )}

      {/* Accordion items */}
      <div className="space-y-2" role="list" aria-label={subsection || sectionLabel}>
        {visibleChunks.map((chunk, i) => {
          const overview = isOverviewChunk(chunk);
          return (
            <div
              key={chunk.id}
              role="listitem"
              style={{ animationDelay: `${(startIndex + i) * 20}ms` }}
              className="animate-fade-in"
            >
              <SRDAccordionItem
                chunk={chunk}
                defaultOpen={overview}
                className={overview ? "border-l-gold-400/70 border-l-[3px] bg-gradient-to-r from-gold-400/[0.04] to-transparent" : ""}
              />
            </div>
          );
        })}
      </div>

      {/* Show more button */}
      {needsPagination && !expanded && (
        <button
          type="button"
          onClick={handleExpand}
          className="
            mt-3 w-full rounded-lg border border-dashed border-slate-700/50
            py-2.5 text-sm font-medium text-gold-400/70
            transition-colors hover:border-gold-400/40 hover:text-gold-400
            focus:outline-none focus:ring-2 focus:ring-gold-400 focus:ring-inset
          "
        >
          Show {hiddenCount} more {hiddenCount === 1 ? "entry" : "entries"}
        </button>
      )}
    </section>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function SRDAccordionList({
  sectionLabel,
  chunks,
  groupBySubsection = false,
}: SRDAccordionListProps) {
  // Determine whether subsections are meaningfully present
  const hasSubsections = useMemo(
    () => groupBySubsection && chunks.some((c) => !!c.subsection),
    [chunks, groupBySubsection]
  );

  const grouped = useMemo<Map<string, SRDChunk[]>>(
    () => (hasSubsections ? groupChunks(chunks) : new Map([["", chunks]])),
    [chunks, hasSubsections]
  );

  if (chunks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <i
           className="fa-solid fa-book-open mb-4 text-4xl text-gold-400/30"
          aria-hidden="true"
        />
        <p className="text-base font-semibold text-[#f7f7ff]/60">
          No entries found
        </p>
        <p className="mt-1 text-sm text-[#b9baa3]/50">
          Try selecting a different section or searching for a term.
        </p>
      </div>
    );
  }

  const groupEntries = Array.from(grouped.entries());
  const subsectionNames = hasSubsections
    ? groupEntries.map(([name]) => name).filter(Boolean)
    : [];
  let runningIndex = 0;

  return (
    <div className="space-y-6">
      {/* Count header */}
      <div className="flex items-baseline gap-2">
        <h2 className="text-xl font-bold text-[#f7f7ff]">
          {chunks.length}{" "}
           <span className="text-gold-400">{sectionLabel}</span>
        </h2>
      </div>

      {/* Subsection mini-nav (sticky pill strip) */}
      {subsectionNames.length >= 2 && (
        <SRDSubsectionNav subsections={subsectionNames} section={sectionLabel} />
      )}

      {/* Accordion groups with ornamental dividers between them */}
      {groupEntries.map(([subsection, groupChunks], groupIdx) => {
        const element = (
          <React.Fragment key={subsection || "__root__"}>
            {/* Ornamental divider between groups (not before the first) */}
            {groupIdx > 0 && hasSubsections && <OrnamentalDivider />}
            <SubsectionGroup
              subsection={subsection}
              chunks={groupChunks}
              sectionLabel={sectionLabel}
              startIndex={runningIndex}
            />
          </React.Fragment>
        );
        runningIndex += groupChunks.length;
        return element;
      })}
    </div>
  );
}
