"use client";

/**
 * src/components/character/StatTooltip.tsx
 *
 * Inline stat breakdown tooltip with two trigger modes:
 *
 *   Desktop  — hover over the trigger element (stat value or ⓘ button)
 *              opens the popover; it stays open while the cursor is over
 *              either the trigger or the popover itself.
 *
 *   Mobile   — touchstart begins a 300ms timer; touchend / touchmove before
 *              300ms cancels it; after 300ms the popover opens. Tapping
 *              anywhere outside closes it.
 *
 * Usage (wrapping a stat value):
 *   <StatTooltip lines={[...]} srdRef="SRD p. 22" ariaLabel="Evasion breakdown">
 *     <output className="…">{evasion}</output>
 *   </StatTooltip>
 *
 * Usage (standalone ⓘ button, no children):
 *   <StatTooltip lines={[...]} />
 */

import React from "react";

export interface TooltipLine {
  label: string;
  value: string;
  /** Renders the row in accent colour with a top border separator. */
  isTotal?: boolean;
}

interface StatTooltipProps {
  lines: TooltipLine[];
  /** Optional SRD page reference, e.g. "SRD p. 22" */
  srdRef?: string;
  /** Screen-reader label for the trigger. Defaults to "Show calculation". */
  ariaLabel?: string;
  /**
   * When provided, the children element becomes the hover/long-press trigger
   * and the ⓘ button is omitted. Otherwise a standalone ⓘ button is rendered.
   */
  children?: React.ReactNode;
}

export function StatTooltip({
  lines,
  srdRef,
  ariaLabel = "Show calculation",
  children,
}: StatTooltipProps) {
  const [open, setOpen] = React.useState(false);
  const triggerRef  = React.useRef<HTMLDivElement>(null);
  const popoverRef  = React.useRef<HTMLDivElement>(null);
  const popoverId   = React.useId();

  // Long-press timer ref
  const longPressTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  // Track whether we entered the popover (to keep it open)
  const inPopover = React.useRef(false);

  const openPopover  = () => setOpen(true);
  const closePopover = () => setOpen(false);

  // ── Desktop: mouse-enter / mouse-leave ──────────────────────────────────────

  const handleMouseEnter = () => openPopover();

  const handleMouseLeave = () => {
    // Delay closing slightly so mouse can move into the popover
    setTimeout(() => {
      if (!inPopover.current) closePopover();
    }, 80);
  };

  const handlePopoverMouseEnter = () => {
    inPopover.current = true;
  };

  const handlePopoverMouseLeave = () => {
    inPopover.current = false;
    closePopover();
  };

  // ── Mobile: long-press (≥300ms) ─────────────────────────────────────────────

  const handleTouchStart = (e: React.TouchEvent) => {
    // Don't interfere with scrolling
    longPressTimer.current = setTimeout(() => {
      openPopover();
    }, 300);
  };

  const cancelLongPress = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const handleTouchEnd   = () => cancelLongPress();
  const handleTouchMove  = () => cancelLongPress();

  // ── Keyboard: Escape closes ──────────────────────────────────────────────────
  React.useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") closePopover();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open]);

  // ── Click-outside closes (mobile tap-away) ──────────────────────────────────
  React.useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent | TouchEvent) => {
      const target = (e as MouseEvent).target ?? (e as TouchEvent).target;
      if (
        triggerRef.current?.contains(target as Node) ||
        popoverRef.current?.contains(target as Node)
      ) return;
      closePopover();
    };
    document.addEventListener("mousedown", handler, true);
    document.addEventListener("touchstart", handler, true);
    return () => {
      document.removeEventListener("mousedown", handler, true);
      document.removeEventListener("touchstart", handler, true);
    };
  }, [open]);

  // Shared trigger props
  const triggerProps = {
    onMouseEnter: handleMouseEnter,
    onMouseLeave: handleMouseLeave,
    onTouchStart: handleTouchStart,
    onTouchEnd:   handleTouchEnd,
    onTouchMove:  handleTouchMove,
  };

  const popover = open && (
    <div
      ref={popoverRef}
      id={popoverId}
      role="tooltip"
      onMouseEnter={handlePopoverMouseEnter}
      onMouseLeave={handlePopoverMouseLeave}
      className="
        absolute bottom-full left-1/2 mb-2 z-50
        -translate-x-1/2
        w-56
        rounded-lg border border-[#577399]/40 bg-slate-900 shadow-xl
        text-[#f7f7ff] text-xs
      "
    >
      {/* Arrow */}
      <span
        aria-hidden="true"
        className="
          absolute -bottom-1.5 left-1/2 -translate-x-1/2
          h-3 w-3 rotate-45
          border-b border-r border-[#577399]/40 bg-slate-900
        "
      />

      <dl className="p-3 space-y-1.5">
        {lines.map((line, i) => (
          <div
            key={i}
            className={[
              "flex items-baseline justify-between gap-2",
              line.isTotal
                ? "mt-1.5 pt-1.5 border-t border-[#577399]/30"
                : "",
            ].join(" ")}
          >
            <dt className={line.isTotal ? "text-[#b9cfe8] font-semibold" : "text-[#b9baa3]"}>
              {line.label}
            </dt>
            <dd className={[
              "tabular-nums font-mono shrink-0",
              line.isTotal ? "text-[#f7f7ff] font-bold" : "text-[#f7f7ff]",
            ].join(" ")}>
              {line.value}
            </dd>
          </div>
        ))}
      </dl>

      {srdRef && (
        <p className="px-3 pb-2.5 text-[11px] text-[#577399] border-t border-[#577399]/20 pt-1.5">
          {srdRef}
        </p>
      )}
    </div>
  );

  // ── Mode A: children provided — wrap them as the trigger ────────────────────
  if (children) {
    return (
      <div
        ref={triggerRef}
        className="relative cursor-default select-none"
        aria-describedby={open ? popoverId : undefined}
        {...triggerProps}
      >
        {children}
        {popover}
      </div>
    );
  }

  // ── Mode B: standalone ⓘ button ─────────────────────────────────────────────
  return (
    <span className="relative inline-flex items-center">
      <span
        ref={triggerRef}
        className="relative inline-flex items-center"
        {...triggerProps}
      >
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          aria-label={ariaLabel}
          aria-expanded={open}
          aria-controls={open ? popoverId : undefined}
          className="
            inline-flex h-4 w-4 items-center justify-center rounded-full
            border border-[#577399]/40 bg-slate-800/60
            text-[11px] font-bold text-[#577399]
            hover:border-[#577399] hover:bg-[#577399]/20 hover:text-[#b9cfe8]
            focus:outline-none focus:ring-1 focus:ring-[#577399] focus:ring-offset-1 focus:ring-offset-slate-900
            transition-colors cursor-pointer select-none
            flex-shrink-0
          "
        >
          ⓘ
        </button>
        {popover}
      </span>
    </span>
  );
}
