"use client";

import { useCallback } from "react";
import type { CharacterSource } from "@shared/types";

// ─── SourceFilter ────────────────────────────────────────────────────────────
// Segmented control for filtering content by source: All | SRD | Homebrew.
// Uses role="radiogroup" with arrow-key navigation for a11y.

export type SourceFilterValue = "all" | CharacterSource;

interface SourceFilterProps {
  value: SourceFilterValue;
  onChange: (value: SourceFilterValue) => void;
  className?: string;
}

const SEGMENTS: { value: SourceFilterValue; label: string }[] = [
  { value: "all", label: "All" },
  { value: "srd", label: "SRD" },
  { value: "homebrew", label: "Homebrew" },
];

function getActiveClasses(value: SourceFilterValue): string {
  switch (value) {
    case "all":
      return "bg-slate-700 text-slate-100 shadow-sm";
    case "srd":
      return "bg-steel-400/20 text-steel-accessible shadow-sm";
    case "homebrew":
      return "bg-coral-400/20 text-coral-400 shadow-sm";
  }
}

export function SourceFilter({
  value,
  onChange,
  className = "",
}: SourceFilterProps) {
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const currentIdx = SEGMENTS.findIndex((s) => s.value === value);
      let nextIdx = currentIdx;

      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        e.preventDefault();
        nextIdx = (currentIdx + 1) % SEGMENTS.length;
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        nextIdx = (currentIdx - 1 + SEGMENTS.length) % SEGMENTS.length;
      }

      if (nextIdx !== currentIdx) {
        onChange(SEGMENTS[nextIdx].value);
      }
    },
    [value, onChange]
  );

  return (
    <div
      role="radiogroup"
      aria-label="Content source filter"
      className={`inline-flex rounded-lg border border-slate-700/60 bg-slate-900/80 p-0.5 ${className}`}
      onKeyDown={handleKeyDown}
    >
      {SEGMENTS.map((seg) => {
        const isActive = seg.value === value;
        return (
          <button
            key={seg.value}
            role="radio"
            aria-checked={isActive}
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
