"use client";

/**
 * src/components/marketing/FeatureDeepDive.tsx
 *
 * Alternating zigzag layout for detailed feature blocks on sub-pages.
 * Odd-indexed blocks: text left, image right.
 * Even-indexed blocks: image left, text right.
 * On mobile, image always appears above text.
 */

import React from "react";
import { RevealSection } from "./RevealSection";
import { ScreenshotContainer } from "./ScreenshotContainer";

interface FeatureDeepDiveProps {
  /** Zero-based index — controls zigzag direction */
  index: number;
  /** Font Awesome icon class (e.g. "fa-tv") */
  icon: string;
  /** Small caps kicker text above the headline */
  kicker: string;
  /** Section headline (H3) */
  headline: string;
  /** Body content — paragraphs, tech specs, etc. */
  children: React.ReactNode;
  /** Alt text / description for the screenshot */
  screenshot: string;
  /**
   * Path to the desktop screenshot (served from /public).
   * When omitted the placeholder interior is shown.
   */
  screenshotDesktopSrc?: string;
  /**
   * Path to the mobile screenshot.
   * Falls back to `screenshotDesktopSrc` when omitted.
   */
  screenshotMobileSrc?: string;
  /** Override kicker color class (default: "text-gold-400/80") */
  kickerColor?: string;
}

export function FeatureDeepDive({
  index,
  icon,
  kicker,
  headline,
  children,
  screenshot,
  screenshotDesktopSrc,
  screenshotMobileSrc,
  kickerColor = "text-gold-400/80",
}: FeatureDeepDiveProps) {
  const isEven = index % 2 === 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
      {/* Text column */}
      <div className={isEven ? "order-2 lg:order-1" : "order-2 lg:order-2"}>
        <RevealSection>
          {/* Icon badge */}
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-burgundy-900/60 to-slate-900 border border-burgundy-800/30">
            <i
              className={`fa-solid ${icon} text-gold-400 text-lg`}
              aria-hidden="true"
            />
          </div>
          {/* Kicker */}
          <p
            className={`text-xs font-sans font-semibold uppercase tracking-[0.2em] ${kickerColor} mb-2`}
          >
            {kicker}
          </p>
          {/* Headline */}
          <h3 className="font-serif text-2xl sm:text-3xl font-bold text-parchment-50 mb-4 leading-[1.15]">
            {headline}
          </h3>
          {/* Body content */}
          <div className="space-y-4">{children}</div>
        </RevealSection>
      </div>

      {/* Image column */}
      <div className={isEven ? "order-1 lg:order-2" : "order-1 lg:order-1"}>
        <RevealSection delay={200}>
          <ScreenshotContainer
            alt={screenshot}
            desktopSrc={screenshotDesktopSrc}
            mobileSrc={screenshotMobileSrc}
          />
        </RevealSection>
      </div>
    </div>
  );
}
