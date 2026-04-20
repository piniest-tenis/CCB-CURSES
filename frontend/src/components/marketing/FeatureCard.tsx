"use client";

/**
 * src/components/marketing/FeatureCard.tsx
 *
 * Compact feature card with icon, title, and description.
 * Used in grid layouts on the landing page and sub-pages.
 */

import React from "react";
import { StaggerCard } from "./StaggerCard";

export function FeatureCard({
  icon,
  title,
  description,
  index,
}: {
  icon: string;
  title: string;
  description: string;
  index: number;
}) {
  return (
    <StaggerCard index={index} className="h-full">
      <div className="group h-full rounded-xl border border-slate-700/40 bg-slate-900/60 p-6 backdrop-blur-sm shadow-card hover:-translate-y-1 hover:border-gold-400/30 hover:shadow-glow-gold transition-all duration-300">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-burgundy-900/60 to-slate-900 border border-burgundy-800/30 text-2xl">
          <i className={`fa-solid ${icon} text-gold-400`} aria-hidden="true" />
        </div>
        <h3 className="font-serif text-lg font-semibold text-parchment-50 mb-2">
          {title}
        </h3>
        <p className="text-sm text-parchment-500 leading-relaxed">
          {description}
        </p>
      </div>
    </StaggerCard>
  );
}
