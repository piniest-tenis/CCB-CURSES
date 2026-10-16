"use client";

/**
 * src/components/character/UsageTracker.tsx
 *
 * Reusable "Seal Chip" toggle for the usage / exhaustion tracker.
 *
 * A single pill performs both mark and reset (toggle):
 *   - Available:   `○ Mark used`
 *   - Exhausted:   `✓ Used — tap to reset`
 *
 * The frequency tag communicates cadence: gold `⟳ REST` pill for rest-reset
 * cadences (auto-reset on rest), bare slate text `SCENE` / `SESSION` for
 * manual-reset cadences.
 *
 * Wrapped in DisabledInViewerMode so viewers see state without being able to
 * toggle it.
 */

import React from "react";
import type { UsageFrequency } from "@shared/types";
import { useActionButton, InlineActionError } from "./ActionButton";
import { DisabledInViewerMode } from "./DisabledInViewerMode";

// ─── Props ────────────────────────────────────────────────────────────────────

interface UsageTrackerProps {
  characterId: string;
  usageKey: string;
  frequency: UsageFrequency;
  exhausted: boolean;
  /** Feature / card / ability name for aria-labels and status text. */
  label: string;
  variant?: "pill" | "inline";
}

// ─── Cadence helpers ──────────────────────────────────────────────────────────

type TrackedFrequency = Exclude<UsageFrequency, "none">;

const CADENCE_LABEL: Record<TrackedFrequency, string> = {
  "once-per-rest": "once per rest",
  "once-per-short-rest": "once per short rest",
  "once-per-long-rest": "once per long rest",
  "once-per-scene": "once per scene",
  "once-per-session": "once per session",
};

const FREQUENCY_TAG: Record<TrackedFrequency, string> = {
  "once-per-rest": "⟳ REST",
  "once-per-short-rest": "⟳ SHORT REST",
  "once-per-long-rest": "⟳ LONG REST",
  "once-per-scene": "SCENE",
  "once-per-session": "SESSION",
};

function isRestFrequency(frequency: UsageFrequency): boolean {
  return (
    frequency === "once-per-rest" ||
    frequency === "once-per-short-rest" ||
    frequency === "once-per-long-rest"
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function UsageTracker({
  characterId,
  usageKey,
  frequency,
  exhausted,
  label,
  variant = "pill",
}: UsageTrackerProps) {
  const { fire, isPending, inlineError } = useActionButton(characterId);
  const errorId = React.useId();

  if (frequency === "none") return null;

  const cadence = CADENCE_LABEL[frequency as TrackedFrequency];
  const tagText = FREQUENCY_TAG[frequency as TrackedFrequency];

  const handleToggle = () => {
    if (exhausted) {
      fire("clear-usage", { usageKey });
    } else {
      fire("mark-usage", { usageKey, frequency });
    }
  };

  const ariaLabel = exhausted
    ? `Reset ${label} (${cadence})`
    : `Mark ${label} as used (${cadence})`;

  return (
    <DisabledInViewerMode tooltip="Only the owner can mark usage">
      <div
        className={
          variant === "inline"
            ? "inline-flex items-center gap-2"
            : "flex flex-col gap-1"
        }
      >
        {/* Frequency tag (left) + toggle chip (right) */}
        <div className="flex items-center gap-2">
          {isRestFrequency(frequency) ? (
            <span
              aria-hidden="true"
              className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider bg-gold-900/20 border border-gold-800/40 text-gold-500"
            >
              {tagText}
            </span>
          ) : (
            <span
              aria-hidden="true"
              className="text-[11px] uppercase tracking-wider text-parchment-500"
            >
              {tagText}
            </span>
          )}

          <button
            type="button"
            role="switch"
            aria-pressed={exhausted}
            aria-label={ariaLabel}
            aria-busy={isPending}
            aria-describedby={inlineError ? errorId : undefined}
            onClick={handleToggle}
            disabled={isPending}
            className={`
              inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold
              min-h-[44px] min-w-[6.5rem] transition-all duration-150
              focus:outline-none focus:ring-2 focus:ring-gold-500
              disabled:cursor-wait active:scale-[0.97]
              motion-reduce:transition-none motion-reduce:animate-none
              ${
                exhausted
                  ? "border border-burgundy-700/60 bg-burgundy-900/40 text-burgundy-300 hover:border-burgundy-500/70 hover:bg-burgundy-900/55"
                  : "border border-gold-700/50 bg-gold-900/10 text-parchment-300 hover:border-gold-500/70 hover:bg-gold-900/20 hover:text-parchment-100"
              }
            `}
          >
            {isPending ? (
              <span
                aria-hidden="true"
                className="inline-block h-3 w-3 animate-spin rounded-full border border-current border-t-transparent motion-reduce:animate-none"
              />
            ) : exhausted ? (
              <span aria-hidden="true" className="font-bold">
                ✓
              </span>
            ) : (
              <span aria-hidden="true">○</span>
            )}
            {exhausted ? "Used — tap to reset" : "Mark used"}
          </button>
        </div>

        {/* Live status confirmation */}
        {exhausted && (
          <p
            role="status"
            aria-live="polite"
            className="text-xs text-parchment-500 leading-snug"
          >
            {isRestFrequency(frequency)
              ? `${label} exhausted — resets on rest`
              : `${label} exhausted — reset manually`}
          </p>
        )}

        <InlineActionError message={inlineError} id={errorId} />
      </div>
    </DisabledInViewerMode>
  );
}
