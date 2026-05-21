/**
 * src/components/frames/FrameCard.tsx
 *
 * Card component for the campaign frames list grid.
 * Shows: name, complexity badge, pitch, content/restriction/extension counts,
 * theme tags, and a "View" link.
 */

"use client";

import React from "react";
import Link from "next/link";
import type { CampaignFrameSummary, FrameComplexityRating } from "@shared/types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const COMPLEXITY_STYLES: Record<FrameComplexityRating, string> = {
  low:      "bg-green-900/40 text-green-400 border-green-500/30",
  moderate: "bg-yellow-900/40 text-yellow-400 border-yellow-500/30",
  high:     "bg-orange-900/40 text-orange-400 border-orange-500/30",
  extreme:  "bg-red-900/40 text-red-400 border-red-500/30",
};

function formatRelativeTime(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

// ─── FrameCard ────────────────────────────────────────────────────────────────

interface FrameCardProps {
  frame: CampaignFrameSummary;
}

export function FrameCard({ frame }: FrameCardProps) {
  const complexityStyle = frame.complexity
    ? COMPLEXITY_STYLES[frame.complexity]
    : null;

  const themes = frame.themes?.slice(0, 3) ?? [];

  return (
    <article
      className="
        group relative flex flex-col gap-4 rounded-xl
        border border-[#577399]/30 bg-slate-900/80
        p-5 shadow-card-fantasy
        hover:shadow-card-fantasy-hover hover:border-[#577399]/60
        transition-all duration-200
      "
    >
      {/* Header row: name + complexity badge */}
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-serif text-lg font-semibold text-[#f7f7ff] leading-tight min-w-0 truncate">
          {frame.name}
        </h3>
        {frame.complexity && complexityStyle && (
          <span
            className={`shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize ${complexityStyle}`}
          >
            {frame.complexity}
          </span>
        )}
      </div>

      {/* Pitch */}
      {frame.pitch ? (
        <p className="text-sm text-[#b9baa3] leading-relaxed line-clamp-2">
          {frame.pitch}
        </p>
      ) : (
        <p className="text-sm text-[#b9baa3]/40 italic">No pitch</p>
      )}

      {/* Stats row: content / restrictions / extensions */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1 rounded-md bg-[#577399]/10 px-2 py-0.5 text-xs font-medium text-[#577399]">
          {frame.contentCount} content
        </span>
        <span className="inline-flex items-center gap-1 rounded-md bg-[#fe5f55]/10 px-2 py-0.5 text-xs font-medium text-[#fe5f55]/80">
          {frame.restrictionCount} restriction{frame.restrictionCount !== 1 ? "s" : ""}
        </span>
        <span className="inline-flex items-center gap-1 rounded-md bg-gold-500/10 px-2 py-0.5 text-xs font-medium text-gold-400">
          {frame.extensionCount} extension{frame.extensionCount !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Theme tags */}
      {themes.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {themes.map((theme) => (
            <span
              key={theme}
              className="rounded-full bg-[#b9baa3]/10 px-2.5 py-0.5 text-xs text-[#b9baa3]/70"
            >
              {theme}
            </span>
          ))}
          {(frame.themes?.length ?? 0) > 3 && (
            <span className="rounded-full bg-[#b9baa3]/10 px-2.5 py-0.5 text-xs text-[#b9baa3]/50">
              +{(frame.themes?.length ?? 0) - 3}
            </span>
          )}
        </div>
      )}

      {/* Footer: updated time + View button */}
      <div className="mt-auto flex items-center justify-between gap-3">
        <span className="text-xs text-[#b9baa3]/50">
          Updated {formatRelativeTime(frame.updatedAt)}
        </span>

        <Link
          href={`/homebrew/frames/${frame.frameId}`}
          aria-label={`Details for frame: ${frame.name}`}
          className="
            rounded-lg px-4 py-2 text-sm font-semibold
            bg-[#577399] text-[#f7f7ff]
            hover:bg-[#577399]/80
            transition-colors shadow-sm
            focus:outline-none focus:ring-2 focus:ring-[#577399]
            focus:ring-offset-2 focus:ring-offset-slate-900
          "
        >
          Details
        </Link>
      </div>
    </article>
  );
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────

export function FrameCardSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="
        flex flex-col gap-4 rounded-xl
        border border-[#577399]/20 bg-slate-900/60
        p-5 animate-pulse
      "
    >
      {/* Header: name + badge */}
      <div className="flex items-start justify-between gap-3">
        <div className="h-5 w-40 rounded bg-slate-700/60" />
        <div className="h-5 w-16 rounded-full bg-slate-700/60" />
      </div>
      {/* Pitch lines */}
      <div className="space-y-2">
        <div className="h-3.5 w-full rounded bg-slate-700/40" />
        <div className="h-3.5 w-3/4 rounded bg-slate-700/40" />
      </div>
      {/* Stats pills */}
      <div className="flex gap-2">
        <div className="h-5 w-16 rounded-md bg-slate-700/40" />
        <div className="h-5 w-20 rounded-md bg-slate-700/40" />
        <div className="h-5 w-18 rounded-md bg-slate-700/40" />
      </div>
      {/* Theme tags */}
      <div className="flex gap-1.5">
        <div className="h-5 w-14 rounded-full bg-slate-700/30" />
        <div className="h-5 w-12 rounded-full bg-slate-700/30" />
      </div>
      {/* Footer */}
      <div className="flex items-center justify-between">
        <div className="h-3 w-20 rounded bg-slate-700/40" />
        <div className="h-8 w-16 rounded-lg bg-slate-700/60" />
      </div>
    </div>
  );
}
