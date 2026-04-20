"use client";

/**
 * src/components/srd/SRDProseContent.tsx
 *
 * Renders a collection of SRD chunks as flowing prose sections.
 * Used for the "Rules & Definitions" section where entries are meant to
 * be read sequentially rather than browsed as a list.
 *
 * Layout:
 *   - Each subsection gets an H2 divider
 *   - Chunks within a subsection render with H3 titles + body copy
 *   - Uses .prose-srd CSS class for comfortable long-form reading
 */

import React, { useMemo } from "react";
import { MarkdownContent } from "@/components/MarkdownContent";
import type { SRDChunk } from "@/lib/srdSearch";

// ─── Props ────────────────────────────────────────────────────────────────────

interface SRDProseContentProps {
  chunks: SRDChunk[];
  sectionLabel: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function groupBySubsection(chunks: SRDChunk[]): [string, SRDChunk[]][] {
  const map = new Map<string, SRDChunk[]>();
  for (const chunk of chunks) {
    const key = chunk.subsection ?? "__root__";
    const group = map.get(key);
    if (group) {
      group.push(chunk);
    } else {
      map.set(key, [chunk]);
    }
  }
  return Array.from(map.entries());
}

/** Returns true if a chunk looks like an overview/intro entry. */
function isOverviewEntry(chunk: SRDChunk): boolean {
  const lower = chunk.id.toLowerCase();
  return lower.endsWith("-overview") || lower.includes("introduction") || lower.endsWith("-intro");
}

// ─── Component ────────────────────────────────────────────────────────────────

export function SRDProseContent({ chunks, sectionLabel }: SRDProseContentProps) {
  const groups = useMemo(() => groupBySubsection(chunks), [chunks]);

  if (chunks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <i
           className="fa-solid fa-scroll mb-4 text-4xl text-gold-400/30"
          aria-hidden="true"
        />
        <p className="text-base font-semibold text-[#f7f7ff]/60">
          No {sectionLabel} entries found
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-12">
      {/* Section count header */}
      <div className="flex items-baseline gap-2">
        <h2 className="text-xl font-bold text-[#f7f7ff]">
          {chunks.length}{" "}
           <span className="text-gold-400">{sectionLabel}</span>
        </h2>
      </div>

      {groups.map(([subsection, groupChunks], groupIdx) => (
        <React.Fragment key={subsection}>
          {/* Ornamental divider between groups (not before the first) */}
          {groupIdx > 0 && (
            <div className="flex items-center gap-3 py-2" aria-hidden="true">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-700/50 to-transparent" />
              <span className="text-xs text-gold-400/40 select-none">&#x27E0;</span>
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-700/50 to-transparent" />
            </div>
          )}
          <section
            aria-label={subsection === "__root__" ? sectionLabel : subsection}
            className="scroll-mt-24"
          >
          {/* Subsection H2 header */}
          {subsection !== "__root__" && (
            <div className="mb-6 flex items-center gap-4">
              <h2
                className="font-serif text-2xl font-bold text-[#f7f7ff]"
              >
                {subsection}
              </h2>
              <div className="h-px flex-1 bg-gradient-to-r from-gold-400/40 to-transparent" aria-hidden="true" />
            </div>
          )}

          {/* Chunks within this subsection */}
          <div className="space-y-8">
            {groupChunks.map((chunk, chunkIdx) => (
              <article
                key={chunk.id}
                id={chunk.id}
                className={`
                  scroll-mt-24 rounded-lg border border-slate-700/60 bg-slate-850/50 p-6
                  ${isOverviewEntry(chunk) ? "border-l-[3px] border-l-gold-400/70 bg-gradient-to-r from-gold-400/[0.04] to-transparent" : ""}
                `}
              >
                {/* Chunk title (H3) */}
                <h3
                  className="font-serif mb-4 text-lg font-bold text-[#f7f7ff]"
                >
                  {chunk.title}
                </h3>

                {/* Tags strip */}
                {chunk.tags.length > 0 && (
                  <div className="mb-4 flex flex-wrap gap-1.5" aria-label="Tags">
                    {chunk.tags.slice(0, 6).map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full border border-slate-700/40 bg-slate-800/40 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-[#b9baa3]/60"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Prose body — drop cap on first chunk of each group */}
                <MarkdownContent className={`prose-srd text-sm ${chunkIdx === 0 ? "prose-srd-drop-cap" : ""}`}>
                  {chunk.content}
                </MarkdownContent>
              </article>
            ))}
          </div>
        </section>
        </React.Fragment>
      ))}
    </div>
  );
}
