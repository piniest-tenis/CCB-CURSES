"use client";

/**
 * src/components/marketing/PricingCard.tsx
 *
 * Pricing tier card with feature list and CTA button.
 * Supports highlighted (recommended) variant with gold glow.
 */

import React from "react";
import Link from "next/link";
import { StaggerCard } from "./StaggerCard";

export function PricingCard({
  title,
  price,
  period,
  features,
  cta,
  ctaHref,
  highlighted,
  index,
}: {
  title: string;
  price: string;
  period?: string;
  features: string[];
  cta: string;
  ctaHref: string;
  highlighted?: boolean;
  index: number;
}) {
  return (
    <StaggerCard index={index} className="h-full">
      <div
        className={`relative h-full rounded-2xl border p-8 flex flex-col transition-all duration-300 hover:-translate-y-1 ${
          highlighted
            ? "border-gold-400/50 bg-gradient-to-b from-slate-850 to-slate-900 shadow-glow-gold"
            : "border-slate-700/40 bg-slate-900/60 shadow-card"
        }`}
      >
        {highlighted && (
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-gold-400 to-gold-500 px-4 py-1 text-xs font-bold uppercase tracking-wider text-slate-950">
            Recommended
          </div>
        )}
        <div className="mb-6">
          <h3 className="font-serif text-xl font-semibold text-parchment-50 mb-2">
            {title}
          </h3>
          <div className="flex items-baseline gap-1">
            <span className="font-display text-4xl text-gold-400">{price}</span>
            {period && (
              <span className="text-sm text-parchment-600">{period}</span>
            )}
          </div>
        </div>
        <ul className="mb-8 flex-1 space-y-3">
          {features.map((f, i) => (
            <li
              key={i}
              className="flex items-start gap-2.5 text-sm text-parchment-400 leading-relaxed"
            >
              <i
                className="fa-solid fa-check mt-0.5 text-gold-400 text-xs shrink-0"
                aria-hidden="true"
              />
              <span>{f}</span>
            </li>
          ))}
        </ul>
        <Link
          href={ctaHref}
          className={`block w-full rounded-xl py-3 text-center font-semibold text-base transition-all duration-200 ${
            highlighted
              ? "bg-gradient-to-r from-gold-400 to-gold-500 text-slate-950 hover:from-gold-300 hover:to-gold-400 shadow-glow-gold"
              : "border border-parchment-500/30 text-parchment-300 hover:border-gold-400/50 hover:text-gold-400"
          }`}
        >
          {cta}
        </Link>
      </div>
    </StaggerCard>
  );
}
