"use client";

import type { CharacterSource } from "@shared/types";

// ─── SourceBadge ─────────────────────────────────────────────────────────────
// Visual indicator for homebrew content.  SRD content gets NO badge (it's the
// expected default).  Three size variants:
//   xs — tiny dot only, for compact list rows
//   sm — small pill badge, for cards and tiles
//   md — larger pill badge, for detail-page headers

type BadgeSize = "xs" | "sm" | "md";

interface SourceBadgeProps {
  source: CharacterSource | undefined;
  size?: BadgeSize;
  className?: string;
}

export function SourceBadge({
  source,
  size = "sm",
  className = "",
}: SourceBadgeProps) {
  // SRD content (or missing source) gets no badge
  if (!source || source !== "homebrew") return null;

  if (size === "xs") {
    return (
      <span
        className={`inline-block h-1.5 w-1.5 rounded-full bg-coral-400 shrink-0 ${className}`}
        aria-hidden="true"
        title="Homebrew"
      >
        <span className="sr-only">Homebrew</span>
      </span>
    );
  }

  if (size === "md") {
    return (
      <span
        className={`inline-flex items-center gap-1.5 rounded-md border border-coral-400/30 bg-coral-400/10 px-2.5 py-1 text-xs font-semibold uppercase tracking-wider text-coral-400 ${className}`}
      >
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-coral-400" aria-hidden="true" />
        Homebrew
      </span>
    );
  }

  // sm (default)
  return (
    <span
      className={`inline-flex items-center gap-1 rounded border border-coral-400/30 bg-coral-400/10 px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-coral-400 ${className}`}
    >
      Homebrew
    </span>
  );
}
