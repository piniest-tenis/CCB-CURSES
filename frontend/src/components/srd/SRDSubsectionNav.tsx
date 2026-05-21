"use client";

/**
 * src/components/srd/SRDSubsectionNav.tsx
 *
 * Sticky horizontal pill strip showing subsection names within a drilled-in
 * section. Uses IntersectionObserver to track which subsection is currently
 * in view and highlights the corresponding pill.
 *
 * Only renders when a section has 2+ subsections.
 */

import React, { useEffect, useRef, useState, useCallback } from "react";
import { SECTION_LEFT_BORDER } from "./SRDAccordionItem";

// ─── Section accent pill colours ──────────────────────────────────────────────

const SECTION_PILL_COLOURS: Record<string, string> = {
  Introduction:           "bg-parchment-400/15 text-parchment-400 border-parchment-400/30",
  "Character Creation":   "bg-gold-400/15 text-gold-400 border-gold-400/30",
  Classes:                "bg-burgundy-400/15 text-burgundy-400 border-burgundy-400/30",
  Ancestries:             "bg-amber-400/15 text-amber-400 border-amber-400/30",
  Communities:            "bg-emerald-400/15 text-emerald-400 border-emerald-400/30",
  Domains:                "bg-violet-400/15 text-violet-400 border-violet-400/30",
  "Core Mechanics":       "bg-gold-400/15 text-gold-400 border-gold-400/30",
  "Running an Adventure": "bg-coral-400/15 text-coral-400 border-coral-400/30",
  Appendix:               "bg-parchment-500/15 text-parchment-500 border-parchment-500/30",
};

const DEFAULT_PILL = "bg-gold-400/15 text-gold-400 border-gold-400/30";
const INACTIVE_PILL = "bg-transparent text-[#b9baa3]/50 border-transparent";

// ─── Props ────────────────────────────────────────────────────────────────────

interface SRDSubsectionNavProps {
  /** List of subsection names in display order. */
  subsections: string[];
  /** The section name (for colour matching). */
  section: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function SRDSubsectionNav({ subsections, section }: SRDSubsectionNavProps) {
  const [activeSubsection, setActiveSubsection] = useState<string>(subsections[0] ?? "");
  const navRef = useRef<HTMLDivElement>(null);
  const pillRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  // Scroll active pill into view in the nav strip
  const scrollPillIntoView = useCallback((name: string) => {
    const pill = pillRefs.current.get(name);
    if (pill && navRef.current) {
      pill.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
    }
  }, []);

  // ── IntersectionObserver scrollspy ──
  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;

    const sectionEls = subsections
      .map((name) => document.querySelector(`[aria-label="${name}"]`))
      .filter(Boolean) as Element[];

    if (sectionEls.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        // Find the topmost visible section
        let topEntry: IntersectionObserverEntry | null = null;
        for (const entry of entries) {
          if (entry.isIntersecting) {
            if (!topEntry || entry.boundingClientRect.top < topEntry.boundingClientRect.top) {
              topEntry = entry;
            }
          }
        }
        if (topEntry) {
          const label = topEntry.target.getAttribute("aria-label") ?? "";
          setActiveSubsection(label);
          scrollPillIntoView(label);
        }
      },
      {
        rootMargin: "-80px 0px -60% 0px",
        threshold: 0,
      }
    );

    for (const el of sectionEls) observer.observe(el);
    return () => observer.disconnect();
  }, [subsections, scrollPillIntoView]);

  // ── Click handler — smooth scroll to target section ──
  const handleClick = useCallback((name: string) => {
    const el = document.querySelector(`[aria-label="${name}"]`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      setActiveSubsection(name);
    }
  }, []);

  if (subsections.length < 2) return null;

  const activeColour = SECTION_PILL_COLOURS[section] ?? DEFAULT_PILL;

  return (
    <nav
      ref={navRef}
      aria-label="Subsection navigation"
      className="
        sticky top-14 z-10 -mx-4 mb-6 overflow-x-auto
        border-b border-slate-800/60 bg-[#0a100d]/95 backdrop-blur-sm
        px-4 py-2.5
        scrollbar-none
      "
    >
      <div className="flex gap-2">
        {subsections.map((name) => {
          const isActive = name === activeSubsection;
          return (
            <button
              key={name}
              ref={(el) => {
                if (el) pillRefs.current.set(name, el);
                else pillRefs.current.delete(name);
              }}
              type="button"
              onClick={() => handleClick(name)}
              className={`
                shrink-0 rounded-full border px-3 py-1 text-xs font-medium
                transition-colors duration-150
                focus:outline-none focus:ring-2 focus:ring-gold-400 focus:ring-offset-1 focus:ring-offset-[#0a100d]
                ${isActive ? activeColour : INACTIVE_PILL}
                ${isActive ? "" : "hover:text-[#b9baa3]/80 hover:bg-slate-800/40"}
              `}
              aria-current={isActive ? "true" : undefined}
            >
              {name}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
