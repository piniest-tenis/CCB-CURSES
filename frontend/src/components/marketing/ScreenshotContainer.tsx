"use client";

/**
 * src/components/marketing/ScreenshotContainer.tsx
 *
 * Faux browser-chrome frame (traffic-light dots + URL bar) that wraps
 * a marketing screenshot.
 *
 * When `desktopSrc` (and optionally `mobileSrc`) are provided the component
 * renders a responsive <picture> element inside the chrome:
 *   • mobile viewport  (≤ 639 px)  → mobileSrc  (falls back to desktopSrc)
 *   • desktop viewport (≥ 640 px)  → desktopSrc
 *
 * When no src props are supplied the original placeholder interior is shown
 * so the layout never breaks during development.
 *
 * The `children` escape hatch is preserved for bespoke content.
 */

import React from "react";

interface ScreenshotContainerProps {
  /** Accessible description of the screenshot */
  alt: string;
  /** CSS aspect-ratio for the placeholder interior (default "16/9") */
  aspectRatio?: string;
  /** Extra Tailwind classes on the outer wrapper */
  className?: string;
  /**
   * Path to the desktop screenshot (served from /public).
   * When omitted the placeholder interior is rendered.
   */
  desktopSrc?: string;
  /**
   * Path to the mobile screenshot.
   * Falls back to `desktopSrc` when omitted.
   */
  mobileSrc?: string;
  /** Bespoke children override — takes priority over src props */
  children?: React.ReactNode;
}

export function ScreenshotContainer({
  alt,
  aspectRatio = "16/9",
  className = "",
  desktopSrc,
  mobileSrc,
  children,
}: ScreenshotContainerProps) {
  const hasSrc = Boolean(desktopSrc);

  return (
    <div
      className={`rounded-2xl border border-slate-700/30 bg-gradient-to-br from-slate-850 to-slate-900 shadow-sheet overflow-hidden ${className}`}
    >
      {/* ── Browser chrome bar ── */}
      <div className="px-4 py-3 border-b border-slate-700/30 flex items-center gap-2">
        <div className="flex gap-1.5" aria-hidden="true">
          <div className="w-2.5 h-2.5 rounded-full bg-burgundy-700/60" />
          <div className="w-2.5 h-2.5 rounded-full bg-gold-600/40" />
          <div className="w-2.5 h-2.5 rounded-full bg-steel-400/40" />
        </div>
        <div className="flex-1 text-center">
          <span className="text-xs text-slate-600 font-sans">
            ccb.curses.show
          </span>
        </div>
      </div>

      {/* ── Content area ── */}
      {children ? (
        children
      ) : hasSrc ? (
        /* Real screenshot — responsive picture element */
        <picture>
          {/* Mobile source — only served when viewport ≤ 639 px */}
          <source
            media="(max-width: 639px)"
            srcSet={mobileSrc ?? desktopSrc}
          />
          {/* Default / desktop source */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={desktopSrc}
            alt={alt}
            className="block w-full h-auto"
            loading="lazy"
            decoding="async"
          />
        </picture>
      ) : (
        /* ── Placeholder interior — shown when no screenshot available yet ── */
        <div
          className="flex items-center justify-center bg-slate-900/60"
          style={{ aspectRatio }}
          role="img"
          aria-label={alt}
        >
          <div className="text-center p-6">
            <i
              className="fa-solid fa-image text-3xl text-slate-700 mb-2 block"
              aria-hidden="true"
            />
            <p className="text-xs text-slate-600 max-w-[200px] leading-relaxed">
              {alt}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
