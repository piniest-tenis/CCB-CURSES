"use client";

/**
 * src/components/marketing/CTABlock.tsx
 *
 * Reusable bottom-of-page call-to-action section.
 * Wraps in FantasyBgSection with the standard CTA layout.
 */

import React from "react";
import Link from "next/link";
import { FantasyBgSection } from "./FantasyBgSection";
import { RevealSection } from "./RevealSection";

interface CTABlockProps {
  /** Headline text — can include JSX for gradient spans */
  headline: React.ReactNode;
  /** Subtitle paragraph text */
  subtitle: string;
  /** Primary CTA button text */
  primaryCta?: string;
  /** Primary CTA href */
  primaryHref?: string;
  /** Secondary CTA button text */
  secondaryCta?: string;
  /** Secondary CTA href */
  secondaryHref?: string;
  /** FantasyBgSection alt text */
  alt?: string;
}

export function CTABlock({
  headline,
  subtitle,
  primaryCta = "Create Your Character",
  primaryHref = "/auth/register",
  secondaryCta = "Explore the Features",
  secondaryHref = "/#features",
  alt = "Fantasy painting: An epic vista of a vast enchanted realm at golden hour",
}: CTABlockProps) {
  return (
    <FantasyBgSection
      alt={alt}
      className="py-20 sm:py-28"
      overlayClassName="bg-gradient-to-b from-slate-950/80 via-slate-950/90 to-slate-950"
    >
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
        <RevealSection>
          <h2 className="font-display text-4xl sm:text-5xl md:text-6xl leading-[0.95] text-parchment-50 mb-6">
            {headline}
          </h2>
        </RevealSection>

        <RevealSection delay={100}>
          <p className="mx-auto max-w-xl text-lg text-parchment-400 leading-relaxed mb-10 font-body">
            {subtitle}
          </p>
        </RevealSection>

        <RevealSection delay={200}>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href={primaryHref}
              className="group relative inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-gold-400 to-gold-500 px-10 py-4 text-lg font-bold text-slate-950 shadow-glow-gold hover:from-gold-300 hover:to-gold-400 transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 overflow-hidden w-full sm:w-auto"
            >
              <span
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-out"
                aria-hidden="true"
              />
              <span className="relative">{primaryCta}</span>
            </Link>
            <Link
              href={secondaryHref}
              className="inline-flex items-center justify-center rounded-xl border border-parchment-400/30 px-10 py-4 text-lg font-semibold text-parchment-300 hover:border-gold-400/50 hover:text-gold-400 transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-400 w-full sm:w-auto"
            >
              {secondaryCta}
            </Link>
          </div>
        </RevealSection>
      </div>
    </FantasyBgSection>
  );
}
