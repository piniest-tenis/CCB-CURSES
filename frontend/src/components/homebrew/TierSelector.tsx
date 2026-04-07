"use client";

/**
 * src/components/homebrew/TierSelector.tsx
 *
 * Segmented button control for selecting a tier (1–4).
 * Used by WeaponForm and ArmorForm.
 */

import React from "react";

export interface TierSelectorProps {
  value: 1 | 2 | 3 | 4;
  onChange: (tier: 1 | 2 | 3 | 4) => void;
  id?: string;
}

const TIERS: (1 | 2 | 3 | 4)[] = [1, 2, 3, 4];

export function TierSelector({ value, onChange, id }: TierSelectorProps) {
  return (
    <div id={id} role="radiogroup" aria-label="Tier" className="inline-flex rounded-lg border border-slate-700/60 overflow-hidden">
      {TIERS.map((tier) => {
        const isActive = value === tier;
        return (
          <button
            key={tier}
            type="button"
            role="radio"
            aria-checked={isActive}
            onClick={() => onChange(tier)}
            className={`
              px-4 py-2 text-sm font-semibold transition-colors
              focus:outline-none focus:ring-2 focus:ring-coral-400/50 focus:z-10
              ${
                isActive
                  ? "bg-coral-400/20 text-coral-400 border-coral-400/50"
                  : "bg-slate-900/60 text-parchment-500 hover:bg-slate-800/60 hover:text-[#b9baa3]"
              }
              ${tier > 1 ? "border-l border-slate-700/60" : ""}
            `}
          >
            {tier}
          </button>
        );
      })}
    </div>
  );
}
