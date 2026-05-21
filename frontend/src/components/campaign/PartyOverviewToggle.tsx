"use client";

/**
 * src/components/campaign/PartyOverviewToggle.tsx
 *
 * Toggle button for the Party Overview Sidebar.
 *
 * - Desktop: vertical tab handle fixed to the right viewport edge
 *   (z-30, behind the sidebar itself at z-40)
 * - Mobile: floating action button (FAB) above the bottom nav bar
 *
 * Both variants use a group silhouette icon (SVG) for instant recognition.
 */

import React from "react";

interface PartyOverviewToggleProps {
  isOpen: boolean;
  onToggle: () => void;
}

/** Simple group/party SVG icon */
function PartyIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className ?? "h-5 w-5"}
    >
      {/* Two overlapping person silhouettes */}
      <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
    </svg>
  );
}

export function PartyOverviewToggle({ isOpen, onToggle }: PartyOverviewToggleProps) {
  return (
    <>
      {/* ── Desktop: vertical tab handle (right edge) ─────────────────────── */}
      <button
        type="button"
        onClick={onToggle}
        aria-label={isOpen ? "Close party overview" : "Open party overview"}
        aria-expanded={isOpen}
        aria-controls="party-overview-panel"
        className={[
          // Hidden on mobile
          "hidden sm:flex",
          // Positioning: right edge, centered vertically, behind sidebar z-40
          "fixed right-0 top-1/2 -translate-y-1/2 z-30",
          // When sidebar is open, shift the handle left so it sits flush against the panel
          isOpen ? "-translate-x-[22rem]" : "translate-x-0",
          "transition-transform duration-300",
          // Shape: narrow vertical pill
          "flex-col items-center justify-center gap-2",
          "w-8 h-28 rounded-l-xl",
          // Colors
          "bg-slate-900 border-l border-t border-b border-[#577399]/35",
          "text-[#577399]",
          "hover:bg-slate-800 hover:border-[#577399]/60 hover:text-[#577399]",
          "focus:outline-none focus:ring-2 focus:ring-[#577399] focus:ring-inset",
          "transition-colors",
        ].join(" ")}
      >
        {/* Icon */}
        <PartyIcon className="h-4 w-4 shrink-0" />
        {/* Vertical label */}
        <span
          className="text-[9px] font-semibold uppercase tracking-widest leading-none"
          style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
        >
          Party
        </span>
      </button>

      {/* ── Mobile: FAB (bottom-right, above bottom nav) ─────────────────── */}
      <button
        type="button"
        onClick={onToggle}
        aria-label={isOpen ? "Close party overview" : "Open party overview"}
        aria-expanded={isOpen}
        aria-controls="party-overview-panel"
        className={[
          // Desktop hidden
          "sm:hidden",
          // Fixed above bottom nav (56px) + safe area + gap
          "fixed z-30",
          "bottom-[calc(56px+env(safe-area-inset-bottom)+12px)] right-4",
          // Circle
          "h-12 w-12 rounded-full",
          "flex items-center justify-center",
          // Colors — active state shifts to coral tint when open
          isOpen
            ? "bg-[#fe5f55]/15 border border-[#fe5f55]/50 text-[#fe5f55]"
            : "bg-slate-800 border border-[#577399]/40 text-[#577399]",
          "shadow-lg",
          "hover:scale-105 active:scale-95",
          "transition-all duration-200",
          "focus:outline-none focus:ring-2 focus:ring-[#577399]",
        ].join(" ")}
      >
        {isOpen ? (
          <span aria-hidden="true" className="text-base font-bold leading-none">✕</span>
        ) : (
          <PartyIcon className="h-5 w-5" />
        )}
      </button>
    </>
  );
}
