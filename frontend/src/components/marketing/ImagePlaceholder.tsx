"use client";

/**
 * src/components/marketing/ImagePlaceholder.tsx
 *
 * Screenshot image component for the marketing site.
 *
 * When `desktopSrc` (and optionally `mobileSrc`) are provided the component
 * renders a responsive <picture> element:
 *   • mobile viewport  (≤ 639 px)  → mobileSrc  (falls back to desktopSrc)
 *   • desktop viewport (≥ 640 px)  → desktopSrc
 *
 * When no src props are supplied the original placeholder UI is shown so
 * the layout never breaks during development.
 */

import React from "react";

interface ImagePlaceholderProps {
  /** Accessible description — always required for a11y */
  alt: string;
  /** CSS aspect-ratio value (default "16/9") */
  aspectRatio?: string;
  /** Extra Tailwind classes on the outer wrapper */
  className?: string;
  /**
   * Path to the desktop screenshot (served from /public).
   * When omitted the placeholder UI is rendered instead.
   */
  desktopSrc?: string;
  /**
   * Path to the mobile screenshot.
   * Falls back to `desktopSrc` when omitted.
   */
  mobileSrc?: string;
}

export function ImagePlaceholder({
  alt,
  aspectRatio = "16/9",
  className = "",
  desktopSrc,
  mobileSrc,
}: ImagePlaceholderProps) {
  const hasSrc = Boolean(desktopSrc);

  return (
    <div
      className={`rounded-xl border border-slate-700/30 overflow-hidden ${
        hasSrc ? "" : "bg-gradient-to-br from-slate-850 to-slate-900 flex items-center justify-center"
      } ${className}`}
      style={hasSrc ? undefined : { aspectRatio }}
    >
      {hasSrc ? (
        <picture>
          {/* Mobile source — only served when viewport ≤ 639 px */}
          {(mobileSrc ?? desktopSrc) && (
            <source
              media="(max-width: 639px)"
              srcSet={mobileSrc ?? desktopSrc}
            />
          )}
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
        /* ── Placeholder UI — shown when no screenshot is available yet ── */
        <div className="text-center p-6" role="img" aria-label={alt}>
          <i
            className="fa-solid fa-image text-3xl text-slate-700 mb-2 block"
            aria-hidden="true"
          />
          <p className="text-xs text-slate-600 max-w-[200px] leading-relaxed">
            {alt}
          </p>
        </div>
      )}
    </div>
  );
}
