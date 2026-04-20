"use client";

/**
 * src/components/srd/SRDSectionTabs.tsx
 *
 * Horizontal tab strip for navigating SRD sections.
 *
 * Accessibility:
 *   - role="tablist" on the scroll container (wrapped in nav for landmark)
 *   - role="tab" on each button, aria-selected, aria-controls pointing at
 *     the content panel id
 *   - ArrowLeft / ArrowRight keyboard navigation (wraps around)
 *   - Home / End jump to first / last tab
 *
 * Layout:
 *   - Horizontally scrollable on mobile (scrollbar-hide)
 *   - Fixed min-width per tab so labels never wrap
 *   - Sticky — parent page owns the sticky positioning + z-index
 */

import React, { useRef, useCallback } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SRDSection {
  /** Internal identifier — matches `SRDChunk.section` (or "all"). */
  id: string;
  /** Label shown in the tab. */
  label: string;
  /** If true, this section renders as an accordion list. */
  isListSection: boolean;
}

interface SRDSectionTabsProps {
  sections: SRDSection[];
  activeSection: string;
  onSectionChange: (sectionId: string) => void;
  /** Per-section chunk counts for the count badge. */
  counts?: Record<string, number>;
  /** Paired content panel id for aria-controls. */
  contentPanelId?: string;
}

// ─── Section badge colours (matches SRDSearchBar for visual consistency) ──────

const SECTION_ACCENT: Record<string, string> = {
  all:               "text-[#f7f7ff]",
  Adversaries:       "text-[#fe5f55]",
  Classes:           "text-steel-accessible",
  Ancestries:        "text-amber-400",
  Communities:       "text-emerald-400",
  Domains:           "text-violet-400",
  Environments:      "text-teal-400",
  "Rules & Definitions": "text-[#b9baa3]",
};

// ─── Component ────────────────────────────────────────────────────────────────

export function SRDSectionTabs({
  sections,
  activeSection,
  onSectionChange,
  counts,
  contentPanelId = "srd-content-panel",
}: SRDSectionTabsProps) {
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
      const total = sections.length;
      let nextIndex = -1;

      if (e.key === "ArrowRight") {
        nextIndex = (index + 1) % total;
      } else if (e.key === "ArrowLeft") {
        nextIndex = (index - 1 + total) % total;
      } else if (e.key === "Home") {
        nextIndex = 0;
      } else if (e.key === "End") {
        nextIndex = total - 1;
      }

      if (nextIndex >= 0) {
        e.preventDefault();
        tabRefs.current[nextIndex]?.focus();
        onSectionChange(sections[nextIndex].id);
      }
    },
    [sections, onSectionChange]
  );

  return (
    <nav aria-label="SRD sections" className="w-full">
      <div
        role="tablist"
        aria-label="SRD sections"
        aria-orientation="horizontal"
        className="flex gap-1.5 overflow-x-auto scrollbar-hide py-1 px-1"
      >
        {sections.map((section, index) => {
          const isActive = activeSection === section.id;
          const count = counts?.[section.id];
          const accentClass = SECTION_ACCENT[section.id] ?? "text-[#b9baa3]";

          return (
            <button
              key={section.id}
              ref={(el) => { tabRefs.current[index] = el; }}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-controls={contentPanelId}
              id={`srd-tab-${section.id}`}
              tabIndex={isActive ? 0 : -1}
              onClick={() => onSectionChange(section.id)}
              onKeyDown={(e) => handleKeyDown(e, index)}
              className={`
                relative flex shrink-0 items-center gap-2 whitespace-nowrap rounded-lg border
                px-4 py-2.5 text-base font-semibold
                min-h-[44px]
                transition-colors duration-150
                focus:outline-none focus:ring-2 focus:ring-steel-400 focus:ring-offset-2 focus:ring-offset-[#0a100d]
                ${isActive
                  ? "border-steel-400 bg-steel-400/20 text-[#f7f7ff] shadow-sm"
                  : "border-slate-700/60 text-[#b9baa3]/80 hover:border-slate-600 hover:text-[#f7f7ff] hover:bg-slate-800/40"
                }
              `}
            >
              {/* Tab label */}
              <span>{section.label}</span>

              {/* Count badge */}
              {count !== undefined && count > 0 && (
                <span
                  aria-label={`${count} entries`}
                  className={`
                    inline-flex items-center justify-center rounded-full px-2 py-0.5
                    text-xs font-bold tabular-nums leading-none
                    ${isActive
                      ? `${accentClass} bg-steel-400/20`
                      : "text-[#b9baa3]/60 bg-slate-800/50"
                    }
                  `}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
