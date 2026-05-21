"use client";

/**
 * src/components/marketing/TechSpecList.tsx
 *
 * Technical specifications display with monospace value pills.
 * Used inside FeatureDeepDive blocks for technical details.
 */

import React from "react";

interface TechSpec {
  label: string;
  value: string;
}

interface TechSpecListProps {
  specs: TechSpec[];
  className?: string;
}

export function TechSpecList({ specs, className = "" }: TechSpecListProps) {
  return (
    <div
      className={`rounded-lg border border-slate-700/30 bg-slate-900/40 p-4 ${className}`}
    >
      <p className="text-xs font-sans font-semibold uppercase tracking-[0.15em] text-parchment-600 mb-3">
        Technical Specs
      </p>
      <dl className="space-y-2">
        {specs.map((spec) => (
          <div key={spec.label} className="flex items-center justify-between gap-4">
            <dt className="text-sm text-parchment-400">{spec.label}</dt>
            <dd className="shrink-0 rounded-md bg-slate-800/60 border border-slate-700/30 px-2.5 py-0.5 font-mono text-xs text-gold-400">
              {spec.value}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
