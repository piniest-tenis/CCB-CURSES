"use client";

import { useCallback, useMemo } from "react";
import type { CharacterSource } from "@shared/types";

// ─── SourceFilter ────────────────────────────────────────────────────────────
// Segmented control for filtering content by source.
// Segment order adapts so the user's preferred default is always first.
// Uses role="radiogroup" with arrow-key navigation for a11y.
//
// Filter taxonomy:
//   "srd"      — Official Daggerheart SRD content
//   "curses"   — Curses! platform community content (mapped from legacy source="homebrew")
//   "all"      — Unfiltered (show everything)
//   "homebrew" — User-authored, campaign-scoped content (future, conditional)

export type SourceFilterValue = "srd" | "curses" | "all" | "homebrew";
export type SourceFilterDefault = "srd" | "curses" | "all";

interface SourceSegment {
  value: SourceFilterValue;
  label: string;
  ariaLabel: string;
}

interface SourceFilterProps {
  /** Currently active filter value. */
  value: SourceFilterValue;
  /** Called when user selects a new filter. */
  onChange: (value: SourceFilterValue) => void;
  /** User's preferred default — controls segment ordering. Defaults to "srd". */
  defaultFilter?: SourceFilterDefault;
  /** Whether to show the "My Homebrew" segment. Defaults to false. */
  showHomebrew?: boolean;
  /** Additional CSS classes for the container. */
  className?: string;
}

// ─── Segment definitions ─────────────────────────────────────────────────────

const BASE_SEGMENTS: SourceSegment[] = [
  { value: "srd",    label: "SRD",     ariaLabel: "Show only SRD content" },
  { value: "curses", label: "Curses!", ariaLabel: "Show only Curses! community content" },
  { value: "all",    label: "All",     ariaLabel: "Show all content" },
];

const HOMEBREW_SEGMENT: SourceSegment = {
  value: "homebrew",
  label: "My Homebrew",
  ariaLabel: "Show only my homebrew content",
};

function buildSegments(
  defaultFilter: SourceFilterDefault,
  showHomebrew: boolean
): SourceSegment[] {
  const defaultSeg = BASE_SEGMENTS.find((s) => s.value === defaultFilter)!;
  const rest = BASE_SEGMENTS.filter((s) => s.value !== defaultFilter);
  const segments = [defaultSeg, ...rest];
  if (showHomebrew) segments.push(HOMEBREW_SEGMENT);
  return segments;
}

// ─── Active state colors ─────────────────────────────────────────────────────

function getActiveClasses(value: SourceFilterValue): string {
  switch (value) {
    case "srd":
      return "bg-steel-400/20 text-steel-accessible shadow-sm";
    case "curses":
      return "bg-coral-400/20 text-coral-400 shadow-sm";
    case "all":
      return "bg-slate-700 text-slate-100 shadow-sm";
    case "homebrew":
      return "bg-gold-400/20 text-gold-400 shadow-sm";
  }
}

// ─── Compatibility helper ────────────────────────────────────────────────────
// During Phase 1 migration, existing data uses source="homebrew" for platform
// content. This helper matches both "homebrew" and "curses" values when the
// "curses" filter is active.

export function matchesSourceFilter(
  source: CharacterSource,
  filter: SourceFilterValue
): boolean {
  if (filter === "all") return true;
  if (filter === "curses") return source === "homebrew" || (source as string) === "curses";
  return source === filter;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function SourceFilter({
  value,
  onChange,
  defaultFilter = "srd",
  showHomebrew = false,
  className = "",
}: SourceFilterProps) {
  const segments = useMemo(
    () => buildSegments(defaultFilter, showHomebrew),
    [defaultFilter, showHomebrew]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const currentIdx = segments.findIndex((s) => s.value === value);
      let nextIdx = currentIdx;

      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        e.preventDefault();
        nextIdx = (currentIdx + 1) % segments.length;
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        nextIdx = (currentIdx - 1 + segments.length) % segments.length;
      }

      if (nextIdx !== currentIdx) {
        onChange(segments[nextIdx].value);
      }
    },
    [value, onChange, segments]
  );

  return (
    <div
      role="radiogroup"
      aria-label="Filter by content source"
      className={`inline-flex rounded-lg border border-slate-700/60 bg-slate-900/80 p-0.5 ${className}`}
      onKeyDown={handleKeyDown}
    >
      {segments.map((seg) => {
        const isActive = seg.value === value;
        return (
          <button
            key={seg.value}
            role="radio"
            aria-checked={isActive}
            aria-label={seg.ariaLabel}
            tabIndex={isActive ? 0 : -1}
            onClick={() => onChange(seg.value)}
            className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
              isActive
                ? getActiveClasses(seg.value)
                : "text-parchment-500 hover:text-parchment-400"
            }`}
          >
            {seg.label}
          </button>
        );
      })}
    </div>
  );
}
