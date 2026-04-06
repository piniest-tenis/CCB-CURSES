"use client";

/**
 * SelectionTile.tsx
 * ─────────────────
 * A reusable accordion-style selection tile for the character builder wizard.
 *
 * Replaces the old master-detail split and drill-down-replace patterns with a
 * unified expandable tile that supports:
 *   - Collapsed summary row with name, subtitle, badges, quick-select
 *   - "click to expand" hover hint (60% opacity, hidden when expanded)
 *   - Animated expand/collapse of detail content (children)
 *   - Full-width action button inside the expanded panel
 *   - `alwaysShowDetail` mode for SRD domain cards (no accordion, always visible)
 *   - Mobile-first responsive design with 44x44 touch targets
 *   - Full ARIA accordion pattern for accessibility
 *   - Auto-scroll on expand so the tile header stays visible
 *
 * @example
 * ```tsx
 * <SelectionTile
 *   id="class-guardian"
 *   isSelected={selectedClass === "guardian"}
 *   isExpanded={expandedId === "class-guardian"}
 *   onToggleExpand={() => toggleExpand("class-guardian")}
 *   onSelect={() => selectClass("guardian")}
 *   name="Guardian"
 *   subtitle="Blade · Valor · HP 6 · Evasion 8"
 *   badges={<><SourceBadge /><SuggestedBadge /></>}
 *   selectLabel="Select"
 *   selectedLabel="Selected"
 * >
 *   <ClassDetailCard class={guardianData} />
 * </SelectionTile>
 * ```
 */

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  type ReactNode,
} from "react";

/* ─────────────────────────── Types ─────────────────────────── */

export interface SelectionTileProps {
  /** Unique ID for this tile (used for ARIA) */
  id: string;
  /** Whether this tile is currently selected */
  isSelected: boolean;
  /** Whether this tile is currently expanded (accordion open) */
  isExpanded: boolean;
  /** Called when the tile header is clicked (toggle expand/collapse) */
  onToggleExpand: () => void;
  /** Called when the user wants to select this item (quick-select or detail button) */
  onSelect: () => void;
  /** Label for the select action button. Default "Select". */
  selectLabel?: string;
  /** Label shown when already selected. Default "Selected". */
  selectedLabel?: string;
  /** Whether selection is disabled (e.g., multi-select at max capacity) */
  selectDisabled?: boolean;
  /** Tooltip/reason shown when selectDisabled is true */
  selectDisabledReason?: string;
  /** Optional badge elements (e.g., SourceBadge, "Suggested", "Magic") */
  badges?: ReactNode;
  /** The primary display name */
  name: string;
  /** Secondary metadata line (shown on collapsed tile beneath the name) */
  subtitle?: string;
  /** The expanded detail content (rendered only when expanded) */
  children: ReactNode;
  /**
   * If true, shows detail content inline beneath the header always
   * (no accordion, no expand/collapse). Used for SRD domain cards.
   */
  alwaysShowDetail?: boolean;
}

/* ─────────────────────────── Component ─────────────────────────── */

export function SelectionTile({
  id,
  isSelected,
  isExpanded,
  onToggleExpand,
  onSelect,
  selectLabel = "Select",
  selectedLabel = "Selected",
  selectDisabled = false,
  selectDisabledReason,
  badges,
  name,
  subtitle,
  children,
  alwaysShowDetail = false,
}: SelectionTileProps) {
  /* ── Refs ── */
  const panelRef = useRef<HTMLDivElement>(null);
  const panelInnerRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLButtonElement>(null);

  /* ── Expand/collapse animation state ── */
  const [panelStyle, setPanelStyle] = useState<React.CSSProperties>(
    isExpanded || alwaysShowDetail
      ? { maxHeight: "none", opacity: 1 }
      : { maxHeight: 0, opacity: 0 }
  );
  const [isAnimating, setIsAnimating] = useState(false);
  const prevExpandedRef = useRef(isExpanded);

  /**
   * Auto-scroll: when a tile expands, nudge it into view if it's not
   * already near the top of the scrollable ancestor.
   */
  const scrollIntoViewIfNeeded = useCallback(() => {
    if (!headerRef.current) return;

    const header = headerRef.current;

    /* Walk up the DOM to find the nearest scrollable ancestor. */
    let scrollParent: HTMLElement | null = header.parentElement;
    while (scrollParent) {
      const style = getComputedStyle(scrollParent);
      if (
        scrollParent.scrollHeight > scrollParent.clientHeight &&
        (style.overflowY === "auto" || style.overflowY === "scroll")
      ) {
        break;
      }
      scrollParent = scrollParent.parentElement;
    }

    const viewport = scrollParent ?? document.documentElement;
    const viewportRect = viewport.getBoundingClientRect();
    const headerRect = header.getBoundingClientRect();

    /* Only scroll if header top is NOT within the top 25% of viewport. */
    const threshold = viewportRect.top + viewportRect.height * 0.25;
    if (headerRect.top > threshold || headerRect.top < viewportRect.top) {
      header.scrollIntoView({ block: "start", behavior: "smooth" });
    }
  }, []);

  /**
   * Animate expand/collapse when `isExpanded` changes.
   * Strategy:
   *   Expand → set maxHeight to scrollHeight, opacity 1.
   *            On transitionend → maxHeight: none (allow dynamic resize).
   *   Collapse → snapshot current scrollHeight, set maxHeight to that,
   *              force reflow, then set maxHeight 0, opacity 0.
   */
  useEffect(() => {
    if (alwaysShowDetail) return; // no animation needed

    const wasExpanded = prevExpandedRef.current;
    prevExpandedRef.current = isExpanded;

    if (wasExpanded === isExpanded) return; // no change

    const inner = panelInnerRef.current;
    if (!inner) return;

    if (isExpanded) {
      /* ── EXPAND ── */
      setIsAnimating(true);
      const height = inner.scrollHeight;
      setPanelStyle({
        maxHeight: 0,
        opacity: 0,
        overflow: "hidden",
        transition: "none",
      });

      /* Force reflow so the browser sees the 0-height state first. */
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      inner.offsetHeight;

      requestAnimationFrame(() => {
        setPanelStyle({
          maxHeight: height + 32, // buffer for padding / rounding
          opacity: 1,
          overflow: "hidden",
          transition:
            "max-height 300ms cubic-bezier(0.4, 0, 0.2, 1), opacity 300ms cubic-bezier(0.4, 0, 0.2, 1) 50ms",
        });
      });

      /* Auto-scroll after a brief settle. */
      const scrollTimer = setTimeout(scrollIntoViewIfNeeded, 50);
      return () => clearTimeout(scrollTimer);
    } else {
      /* ── COLLAPSE ── */
      setIsAnimating(true);
      const height = inner.scrollHeight;

      /* Snapshot current height so we can transition FROM it. */
      setPanelStyle({
        maxHeight: height,
        opacity: 1,
        overflow: "hidden",
        transition: "none",
      });

      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      inner.offsetHeight;

      requestAnimationFrame(() => {
        setPanelStyle({
          maxHeight: 0,
          opacity: 0,
          overflow: "hidden",
          transition:
            "max-height 200ms cubic-bezier(0.4, 0, 1, 1), opacity 200ms cubic-bezier(0.4, 0, 1, 1)",
        });
      });
    }
  }, [isExpanded, alwaysShowDetail, scrollIntoViewIfNeeded]);

  /**
   * On `transitionend` for the panel, if we just finished expanding
   * set `max-height: none` so that dynamic content inside can resize freely.
   */
  const handleTransitionEnd = useCallback(
    (e: React.TransitionEvent<HTMLDivElement>) => {
      if (e.propertyName !== "max-height") return;
      setIsAnimating(false);
      if (isExpanded) {
        setPanelStyle({ maxHeight: "none", opacity: 1 });
      }
    },
    [isExpanded]
  );

  /* ── Quick-select click handler (stop propagation to avoid toggling accordion) ── */
  const handleQuickSelect = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation();
      if (!selectDisabled) {
        onSelect();
      }
    },
    [selectDisabled, onSelect]
  );

  /* ── Derived classes ── */
  const isDetailVisible = alwaysShowDetail || isExpanded;

  /* Left border + background states */
  const tileContainerClasses = (() => {
    const base = "border-b border-slate-700/30 border-l-[3px] transition-colors duration-150";
    if (isExpanded && isSelected) {
      return `${base} border-l-[#daa520] bg-[#577399]/10`;
    }
    if (isExpanded && !isSelected) {
      return `${base} border-l-[#daa520]/60 bg-slate-800/30`;
    }
    if (isSelected) {
      return `${base} border-l-[#577399] bg-[#577399]/10`;
    }
    return `${base} border-l-transparent hover:bg-slate-800/60`;
  })();

  /* ── ARIA IDs ── */
  const headerId = `tile-header-${id}`;
  const panelId = `tile-panel-${id}`;

  /* ─────────────────────── Render ─────────────────────── */

  return (
    <div role="region" className={tileContainerClasses}>
      {/* ─── Tile Header ─── */}
      <div className="flex items-start">
        {/*
         * The header content area.
         * In accordion mode this is a <button> inside an <h3>.
         * In alwaysShowDetail mode it's a plain <div>.
         */}
         {alwaysShowDetail ? (
          /* ── Always-show-detail header (non-interactive) ── */
          <div className="flex-1 min-w-0 flex items-start gap-3 px-3 py-3 sm:px-4">
            {/* Name + subtitle + badges */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-semibold text-[#f7f7ff] leading-tight">
                  {name}
                </span>
                {badges && (
                  <span className="flex items-center gap-2 flex-shrink-0">
                    {badges}
                  </span>
                )}
              </div>
              {subtitle && (
                <p className="text-xs text-parchment-500 truncate mt-0.5">
                  {subtitle}
                </p>
              )}
            </div>
          </div>
        ) : (
          /* ── Accordion header (interactive) ── */
          <h3 className="flex-1 min-w-0 m-0 group/tile">
            <button
              ref={headerRef}
              id={headerId}
              type="button"
              aria-expanded={isExpanded}
              aria-controls={panelId}
              onClick={onToggleExpand}
              className="w-full flex items-start gap-3 px-3 py-3 sm:px-4 text-left
                         bg-transparent border-0 cursor-pointer
                         focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#577399]
                         focus-visible:ring-offset-1 focus-visible:ring-offset-[#0a100d]
                         rounded-sm group/btn"
            >
              {/* Name + subtitle + badges */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-[#f7f7ff] leading-tight">
                    {name}
                  </span>
                  {badges && (
                    <span className="flex items-center gap-2 flex-shrink-0">
                      {badges}
                    </span>
                  )}
                </div>
                {subtitle && (
                  <p className="text-xs text-parchment-500 truncate mt-0.5">
                    {subtitle}
                  </p>
                )}
              </div>

              {/* Hover hint — hidden when expanded, shown on hover */}
              <span
                className={`
                  text-xs whitespace-nowrap flex-shrink-0 mt-0.5
                  transition-opacity duration-150 select-none
                  ${isExpanded
                    ? "opacity-0 pointer-events-none"
                    : "opacity-0 group-hover/btn:opacity-60"
                  }
                `}
                style={{ color: "#b9baa3" }}
                aria-hidden="true"
              >
                click to expand
              </span>
            </button>
          </h3>
        )}

        {/* ─── Quick-select button ─── */}
        <div className="flex items-center pr-3 py-3 sm:pr-4 flex-shrink-0">
          {/* Desktop text button (hidden < sm) */}
          <button
            type="button"
            onClick={handleQuickSelect}
            disabled={selectDisabled}
            aria-label={
              isSelected
                ? `${name} is selected`
                : selectDisabled
                ? selectDisabledReason ?? "Selection unavailable"
                : `Select ${name}`
            }
            title={selectDisabled ? selectDisabledReason : undefined}
            className={`
              hidden sm:inline-flex items-center gap-1.5
              text-sm font-medium whitespace-nowrap
              px-3 py-1.5 rounded-md
              transition-colors duration-150
              focus-visible:outline-none focus-visible:ring-2
              focus-visible:ring-[#577399] focus-visible:ring-offset-1
              focus-visible:ring-offset-[#0a100d]
              ${
                selectDisabled
                  ? "opacity-50 cursor-not-allowed text-parchment-600"
                  : isSelected
                  ? "text-[#577399] cursor-pointer"
                  : "text-parchment-500 hover:text-[#577399] cursor-pointer"
              }
            `}
          >
            {isSelected && (
              <svg
                className="w-3.5 h-3.5"
                viewBox="0 0 16 16"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M13.485 3.929a1 1 0 0 1 .086 1.412l-6 7a1 1 0 0 1-1.46.038l-3-3a1 1 0 1 1 1.414-1.414L6.8 10.24l5.273-6.147a1 1 0 0 1 1.412-.164Z" />
              </svg>
            )}
            {isSelected ? selectedLabel : selectLabel}
          </button>

          {/* Mobile icon button (hidden >= sm) */}
          <button
            type="button"
            onClick={handleQuickSelect}
            disabled={selectDisabled}
            aria-label={
              isSelected
                ? `${name} is selected`
                : selectDisabled
                ? selectDisabledReason ?? "Selection unavailable"
                : `Select ${name}`
            }
            title={selectDisabled ? selectDisabledReason : undefined}
            className={`
              flex sm:hidden items-center justify-center
              w-11 h-11 rounded-full
              transition-colors duration-150
              focus-visible:outline-none focus-visible:ring-2
              focus-visible:ring-[#577399] focus-visible:ring-offset-1
              focus-visible:ring-offset-[#0a100d]
              ${
                selectDisabled
                  ? "opacity-50 cursor-not-allowed"
                  : "cursor-pointer"
              }
            `}
          >
            {isSelected ? (
              /* ✓ circle */
              <span
                className="flex items-center justify-center w-7 h-7 rounded-full
                           bg-[#577399] text-[#f7f7ff]"
                aria-hidden="true"
              >
                <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M13.485 3.929a1 1 0 0 1 .086 1.412l-6 7a1 1 0 0 1-1.46.038l-3-3a1 1 0 1 1 1.414-1.414L6.8 10.24l5.273-6.147a1 1 0 0 1 1.412-.164Z" />
                </svg>
              </span>
            ) : (
              /* + circle */
              <span
                className="flex items-center justify-center w-7 h-7 rounded-full
                           border-2 border-parchment-500 text-parchment-500
                           hover:border-[#577399] hover:text-[#577399]
                           transition-colors duration-150"
                aria-hidden="true"
              >
                <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M8 2a1 1 0 0 1 1 1v4h4a1 1 0 1 1 0 2H9v4a1 1 0 1 1-2 0V9H3a1 1 0 0 1 0-2h4V3a1 1 0 0 1 1-1Z" />
                </svg>
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ─── Detail Panel ─── */}
      {alwaysShowDetail ? (
        /* Always-visible detail — no animation, no collapse. */
        <div
          id={panelId}
          role="region"
          aria-labelledby={headerId}
          className="px-3 pb-3 sm:px-4 sm:pb-4"
        >
          <div className="border-t border-slate-700/30 pt-3">
            {children}
          </div>
          {/* No full-width action button in alwaysShowDetail mode. */}
        </div>
      ) : (
        /* Accordion-animated detail panel. */
        <div
          ref={panelRef}
          id={panelId}
          role="region"
          aria-labelledby={headerId}
          hidden={!isExpanded && !isAnimating}
          onTransitionEnd={handleTransitionEnd}
          style={panelStyle}
        >
          <div ref={panelInnerRef}>
            {/* Separator */}
            <div className="mx-3 sm:mx-4 border-t border-slate-700/30" />

            {/* Content wrapper — mobile: capped height with fade, desktop: natural */}
            <div
              className="px-3 pt-3 pb-2 sm:px-4 sm:pt-3 sm:pb-2
                         max-h-[280px] overflow-y-auto sm:max-h-none sm:overflow-y-visible
                         relative"
            >
              {children}

              {/*
               * Bottom fade gradient for mobile scroll overflow.
               * Only visible when content actually overflows on mobile.
               */}
              <div
                className="sticky bottom-0 left-0 right-0 h-6
                           bg-gradient-to-t from-[#0a100d]/80 to-transparent
                           pointer-events-none
                           sm:hidden"
                aria-hidden="true"
              />
            </div>

            {/* Full-width action button at bottom of expanded detail */}
            <div className="px-3 pb-3 pt-1 sm:px-4 sm:pb-4">
              <button
                type="button"
                onClick={onSelect}
                disabled={selectDisabled}
                title={selectDisabled ? selectDisabledReason : undefined}
                className={`
                  w-full min-h-[44px] rounded-md
                  text-sm font-semibold
                  transition-colors duration-150
                  focus-visible:outline-none focus-visible:ring-2
                  focus-visible:ring-[#577399] focus-visible:ring-offset-2
                  focus-visible:ring-offset-[#0a100d]
                  ${
                    selectDisabled
                      ? "bg-slate-800 text-parchment-600 cursor-not-allowed"
                      : isSelected
                      ? "bg-[#577399]/20 border border-[#577399] text-[#577399] cursor-pointer hover:bg-[#577399]/30"
                      : "bg-[#577399] text-[#f7f7ff] cursor-pointer hover:bg-[#577399]/80"
                  }
                `}
              >
                {selectDisabled
                  ? selectDisabledReason || "Unavailable"
                  : isSelected
                  ? `✓ ${selectedLabel}`
                  : `${selectLabel} ${name}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────── End ─────────────────────── */
