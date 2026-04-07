"use client";

/**
 * src/components/dice/DiceRollButton.tsx
 *
 * A small, reusable button that queues a roll into the diceStore and opens
 * the DiceRollerModal. Used by StatsPanel (action rolls) and TrackersPanel
 * (damage rolls).
 *
 * The button is visually subtle by default (icon-only with an aria-label),
 * expanding slightly on hover to show the roll type. A loading spinner
 * replaces the icon while isRolling === true.
 */

import React from "react";
import { useDiceStore } from "@/store/diceStore";
import type { RollRequest } from "@/types/dice";

// ─── Die icon SVG ─────────────────────────────────────────────────────────────
// Real d12 pentagon shape from d-12-clean.svg

function DieIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 110 110"
      fill="currentColor"
      className={className}
    >
      <path d="M33.01,70.06c-.12,0-.25-.05-.34-.14l-21.79-20.59c-.16-.15-.2-.4-.1-.6l14.47-27.4c.1-.2.32-.3.54-.26l28.6,5.79c.23.05.39.24.4.47l1.01,26.87c0,.17-.08.33-.22.43l-22.28,15.34c-.09.06-.19.09-.28.09h0ZM11.84,48.86l21.22,20.06,21.73-14.95-.98-26.21-27.84-5.63-14.12,26.74h-.01Z"/>
      <path d="M80.08,67.8c-.08,0-.16-.02-.23-.06l-24.78-13.08c-.16-.08-.26-.25-.27-.42l-1.01-26.87c0-.23.14-.43.36-.5l27.02-7.91c.2-.06.42.02.55.19l17.47,24.53c.13.18.12.43-.02.6l-18.7,23.34c-.1.12-.24.19-.39.19h0ZM55.79,53.91l24.16,12.76,18.21-22.72-17.04-23.93-26.31,7.71.98,26.2v-.02Z"/>
      <path d="M54.29,27.85h-.1l-28.6-5.79c-.2-.04-.36-.2-.39-.4-.04-.2.05-.41.23-.51l12.85-8c.07-.05.16-.07.25-.08l26.55-1.02c.07,0,.15.01.21.04l16.21,6.89c.19.08.32.28.3.49-.01.21-.16.39-.36.45l-27.02,7.91s-.09.02-.14.02h0ZM27.03,21.32l27.24,5.51,25.56-7.49-14.82-6.3-26.31,1.01-11.67,7.26h0Z"/>
      <path d="M41.86,96.4c-.21,0-.41-.14-.47-.34l-8.85-26.34c-.07-.21,0-.44.19-.57l22.28-15.34c.15-.11.35-.12.52-.03l24.78,13.08c.21.11.31.35.25.57l-7.32,27.45c-.06.21-.24.36-.46.37l-30.89,1.15h-.03ZM33.6,69.76l8.61,25.63,30.15-1.12,7.12-26.7-24.16-12.76s-21.72,14.95-21.72,14.95Z"/>
      <path d="M41.86,96.4c-.08,0-.15-.02-.23-.05l-14.43-7.28c-.08-.04-.15-.1-.19-.17l-15.32-23.49c-.05-.07-.08-.16-.08-.25l-.89-16.17c-.01-.21.1-.4.29-.48.19-.09.41-.05.56.1l22.04,21.34c.06.06.1.12.13.2l8.6,25.6c.06.19,0,.4-.15.54-.09.08-.21.12-.33.12h0ZM27.78,88.24l13.22,6.67-8.18-24.33-21.03-20.37.82,14.76,15.17,23.26h0Z"/>
      <path d="M72.76,95.25c-.1,0-.2-.03-.29-.09-.17-.12-.25-.33-.19-.54l7.32-27.45c.02-.07.05-.13.09-.18l18.7-23.34c.13-.17.36-.23.56-.16s.33.26.33.47v18.23c0,.08-.02.16-.06.24l-12.74,23.75c-.04.07-.1.13-.16.18l-13.28,8.81c-.08.06-.18.08-.28.08ZM80.54,67.53l-6.95,26.07,12.07-8.01,12.62-23.52v-16.69s-17.74,22.15-17.74,22.15Z"/>
    </svg>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface DiceRollButtonProps {
  /** The full roll descriptor to pass to diceStore.requestRoll() */
  rollRequest: RollRequest;
  /** Called after the roll is queued, so the parent can open the modal */
  onRollQueued?: () => void;
  /** Visual variant */
  variant?: "icon" | "badge";
  /** Optional extra className */
  className?: string;
  /** Optional short label shown next to icon in badge mode */
  label?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function DiceRollButton({
  rollRequest,
  onRollQueued,
  variant = "icon",
  className = "",
  label,
}: DiceRollButtonProps) {
  const { isRolling, stageRoll } = useDiceStore();

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // don't trigger parent card clicks
    if (isRolling) return;
    stageRoll(rollRequest);
    onRollQueued?.();
  };

  if (variant === "badge") {
    return (
      <button
        type="button"
        onClick={handleClick}
        disabled={isRolling}
        aria-label={`Roll ${rollRequest.label}`}
        aria-busy={isRolling}
        className={[
          "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 min-h-[44px]",
          "text-xs font-semibold transition-all duration-150",
          "border-[#577399]/40 bg-[#577399]/10 text-[#577399]",
          "hover:bg-[#577399]/20 hover:border-[#577399] hover:text-[#f7f7ff]",
          "disabled:opacity-40 disabled:cursor-not-allowed",
          "focus:outline-none focus:ring-2 focus:ring-[#577399] focus:ring-offset-1 focus:ring-offset-slate-900",
          className,
        ].join(" ")}
      >
        {isRolling ? (
          <span className="h-3 w-3 animate-spin rounded-full border border-current border-t-transparent" aria-hidden="true" />
        ) : (
          <DieIcon className="h-3.5 w-3.5" />
        )}
        {label && <span>{label}</span>}
      </button>
    );
  }

  // icon variant — compact, no label text
  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isRolling}
      aria-label={`Roll ${rollRequest.label}`}
      aria-busy={isRolling}
      title={`Roll ${rollRequest.label}`}
      className={[
        "group flex h-9 w-9 items-center justify-center rounded",
        // Resting: goldenrod at 75% opacity
        "border border-transparent text-amber-500/75",
        // Hover: full goldenrod
        "hover:border-amber-500/50 hover:bg-amber-500/10 hover:text-amber-500",
        "disabled:opacity-30 disabled:cursor-not-allowed",
        "transition-all duration-150",
        // ring-offset ensures focus ring is legible against the button border
        "focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-1 focus:ring-offset-slate-900",
        className,
      ].join(" ")}
    >
      {isRolling ? (
        <span className="h-4 w-4 animate-spin rounded-full border border-current border-t-transparent" aria-hidden="true" />
      ) : (
        <DieIcon className="h-5 w-5" />
      )}
    </button>
  );
}
