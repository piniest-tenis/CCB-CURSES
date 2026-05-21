"use client";

/**
 * src/components/marketing/MobileStickyCtaBar.tsx
 *
 * Fixed-bottom mobile CTA bar. Shows when the hero CTA scrolls out of view,
 * hides when the bottom CTA section enters the viewport.
 * Only visible on mobile (md:hidden).
 */

import React, { useEffect, useState } from "react";
import Link from "next/link";

interface MobileStickyCtaBarProps {
  /** ID of the hero CTA element to watch */
  heroCtaId?: string;
  /** ID of the bottom CTA section to watch */
  bottomCtaId?: string;
  /** CTA button text */
  ctaText?: string;
  /** CTA href */
  ctaHref?: string;
}

export function MobileStickyCtaBar({
  heroCtaId = "hero-cta",
  bottomCtaId = "bottom-cta",
  ctaText = "Start Free",
  ctaHref = "/auth/register",
}: MobileStickyCtaBarProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const heroEl = document.getElementById(heroCtaId);
    const bottomEl = document.getElementById(bottomCtaId);

    if (!heroEl) return;

    let heroPastView = false;
    let bottomInView = false;

    const update = () => {
      setVisible(heroPastView && !bottomInView);
    };

    const heroObserver = new IntersectionObserver(
      ([entry]) => {
        heroPastView = !entry.isIntersecting;
        update();
      },
      { threshold: 0 },
    );

    const bottomObserver = new IntersectionObserver(
      ([entry]) => {
        bottomInView = entry.isIntersecting;
        update();
      },
      { threshold: 0 },
    );

    heroObserver.observe(heroEl);
    if (bottomEl) bottomObserver.observe(bottomEl);

    return () => {
      heroObserver.disconnect();
      bottomObserver.disconnect();
    };
  }, [heroCtaId, bottomCtaId]);

  return (
    <div
      className={`fixed bottom-0 left-0 right-0 z-40 md:hidden transition-transform duration-300 ${
        visible ? "translate-y-0" : "translate-y-full"
      }`}
    >
      <div className="bg-slate-950/95 backdrop-blur-md border-t border-slate-800/60 px-4 py-3">
        <Link
          href={ctaHref}
          className="flex items-center justify-center w-full rounded-xl bg-gradient-to-r from-gold-400 to-gold-500 py-3.5 text-base font-bold text-slate-950 hover:from-gold-300 hover:to-gold-400 transition-all shadow-glow-gold focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-400"
        >
          {ctaText}
        </Link>
      </div>
    </div>
  );
}
