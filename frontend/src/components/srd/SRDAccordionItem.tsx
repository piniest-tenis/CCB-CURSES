"use client";

/**
 * src/components/srd/SRDAccordionItem.tsx
 *
 * Single collapsible SRD entry. Uses the CSS grid 0fr → 1fr trick
 * (via .srd-accordion-grid / .open classes defined in globals.css) for
 * smooth, GPU-friendly expand/collapse animation — no JS height measurement.
 *
 * Lazy render: the MarkdownContent is null until the item has been expanded
 * at least once, preventing expensive parsing of all 454 chunks on page load.
 *
 * Accessibility:
 *   - <button> trigger with aria-expanded, aria-controls
 *   - Content panel with matching id, role="region", aria-labelledby
 *   - Fully keyboard navigable
 *
 * Section badge colours mirror SRDSearchBar for visual consistency.
 */

import React, { useState, useId } from "react";
import { MarkdownContent } from "@/components/MarkdownContent";
import type { SRDChunk } from "@/lib/srdSearch";

// ─── Section badge colour map ─────────────────────────────────────────────────

const SECTION_COLOURS: Record<string, string> = {
  Introduction:           "bg-parchment-600/10 text-parchment-400 border-parchment-600/30",
  "Character Creation":   "bg-gold-600/10 text-gold-400 border-gold-600/30",
  Classes:                "bg-burgundy-700/10 text-burgundy-400 border-burgundy-700/30",
  Ancestries:             "bg-amber-900/20 text-amber-400 border-amber-700/30",
  Communities:            "bg-emerald-900/20 text-emerald-400 border-emerald-700/30",
  Domains:                "bg-violet-900/20 text-violet-400 border-violet-700/30",
  "Core Mechanics":       "bg-gold-600/10 text-gold-400 border-gold-600/30",
  "Running an Adventure": "bg-coral-700/10 text-coral-400 border-coral-700/30",
  Appendix:               "bg-parchment-700/10 text-parchment-500 border-parchment-700/30",
};

// ─── Section left-border accent colours ───────────────────────────────────────
// Closed state uses 40% opacity; open state brightens to 70%.

export const SECTION_LEFT_BORDER: Record<string, { closed: string; open: string }> = {
  Introduction:           { closed: "border-l-parchment-400/40", open: "border-l-parchment-400/70" },
  "Character Creation":   { closed: "border-l-gold-400/40",      open: "border-l-gold-400/70" },
  Classes:                { closed: "border-l-burgundy-400/40",   open: "border-l-burgundy-400/70" },
  Ancestries:             { closed: "border-l-amber-400/40",      open: "border-l-amber-400/70" },
  Communities:            { closed: "border-l-emerald-400/40",    open: "border-l-emerald-400/70" },
  Domains:                { closed: "border-l-violet-400/40",     open: "border-l-violet-400/70" },
  "Core Mechanics":       { closed: "border-l-gold-400/40",       open: "border-l-gold-400/70" },
  "Running an Adventure": { closed: "border-l-coral-400/40",      open: "border-l-coral-400/70" },
  Appendix:               { closed: "border-l-parchment-500/40",  open: "border-l-parchment-500/70" },
};

// ─── Props ────────────────────────────────────────────────────────────────────

interface SRDAccordionItemProps {
  chunk: SRDChunk;
  /** If true, render the item in an already-open state (e.g. search results). */
  defaultOpen?: boolean;
  /** Show the section badge next to the title. */
  showSectionBadge?: boolean;
  /** Additional classes on the outer wrapper. */
  className?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function SRDAccordionItem({
  chunk,
  defaultOpen = false,
  showSectionBadge = false,
  className = "",
}: SRDAccordionItemProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  // Lazy render guard — never mount MarkdownContent until first expansion
  const [hasExpanded, setHasExpanded] = useState(defaultOpen);

  const uid = useId();
  const triggerId = `${uid}-trigger`;
  const panelId = `${uid}-panel`;

  const toggle = () => {
    const next = !isOpen;
    setIsOpen(next);
    if (next) setHasExpanded(true);
  };

  const badgeClasses = SECTION_COLOURS[chunk.section] ?? "bg-slate-700/30 text-[#b9baa3] border-slate-600/30";
  const leftBorder = SECTION_LEFT_BORDER[chunk.section];
  const leftBorderClass = leftBorder
    ? (isOpen ? leftBorder.open : leftBorder.closed)
    : "";

  return (
    <div
      className={`
        rounded-lg border bg-slate-850/50
        transition-colors duration-150
        ${leftBorderClass ? `border-l-[3px] ${leftBorderClass}` : ""}
        ${isOpen ? "border-burgundy-800/60" : "border-slate-700/60 hover:border-slate-700/60"}
        ${className}
      `}
    >
      {/* ── Trigger button ── */}
      <button
        id={triggerId}
        type="button"
        aria-expanded={isOpen}
        aria-controls={panelId}
        onClick={toggle}
        className="
          flex w-full items-center justify-between gap-3 px-4 py-4
          text-left
          focus:outline-none focus:ring-2 focus:ring-gold-400 focus:ring-inset
          rounded-lg
        "
      >
        {/* Left: badge + title */}
        <div className="flex min-w-0 flex-1 items-center gap-3">
          {showSectionBadge && (
            <span
              className={`inline-flex shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${badgeClasses}`}
            >
              {chunk.section}
            </span>
          )}

          {/* Subsection prefix */}
          {chunk.subsection && !showSectionBadge && (
            <span className="hidden shrink-0 text-xs font-medium text-parchment-600 sm:inline-block">
              {chunk.subsection}
            </span>
          )}

          <span className="min-w-0 truncate text-base font-semibold text-[#f7f7ff]">
            {chunk.title}
          </span>
        </div>

        {/* Right: chevron */}
        <span
          aria-hidden="true"
          className={`
            flex shrink-0 items-center justify-center text-gold-500/60
            transition-transform duration-300
            ${isOpen ? "rotate-180" : "rotate-0"}
          `}
        >
          <i className="fa-solid fa-chevron-down text-sm" />
        </span>
      </button>

      {/* ── Accordion content (CSS grid animation) ── */}
      <div
        id={panelId}
        role="region"
        aria-labelledby={triggerId}
        className={`srd-accordion-grid ${isOpen ? "open" : ""}`}
      >
        <div>
          {/* Only render markdown when the panel has been opened at least once */}
          {hasExpanded && (
              <div className="border-t border-slate-700/40 px-4 pb-5 pt-4">
              {/* Subsection label (mobile — shown below title in content) */}
              {chunk.subsection && !showSectionBadge && (
                <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-parchment-600/80 sm:hidden">
                  {chunk.subsection}
                </p>
              )}
              <MarkdownContent className="prose-srd text-sm" isClassEntry={chunk.section === "Classes"}>
                {chunk.content}
              </MarkdownContent>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
