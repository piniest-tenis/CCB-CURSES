"use client";

/**
 * src/components/adversary/TierBadge.tsx
 *
 * Vertical pill badge showing the adversary's tier (1–4).
 * Color-coded per the design spec tier color system.
 */

import React from "react";
import type { AdversaryTier } from "@/types/adversary";

const TIER_STYLES: Record<AdversaryTier, string> = {
  1: "bg-slate-700/40 text-[#b9baa3] border-slate-600/40",
  2: "bg-[#577399]/15 text-[#577399] border-[#577399]/40",
  3: "bg-[#DAA520]/10 text-[#DAA520] border-[#DAA520]/30",
  4: "bg-[#fe5f55]/10 text-[#fe5f55] border-[#fe5f55]/30",
};

interface TierBadgeProps {
  tier: AdversaryTier;
  /** "sm" for compact inline use, "md" (default) for card headers. */
  size?: "sm" | "md";
}

export function TierBadge({ tier, size = "md" }: TierBadgeProps) {
  if (size === "sm") {
    return (
      <span
        className={`
          inline-flex items-center gap-0.5 rounded border
          px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider
          ${TIER_STYLES[tier]}
        `}
      >
        T{tier}
      </span>
    );
  }

  return (
    <div
      className={`
        shrink-0 flex flex-col items-center justify-center
        rounded-lg border px-2 py-1.5 min-w-[2.5rem]
        ${TIER_STYLES[tier]}
      `}
    >
      <span className="text-[10px] font-semibold uppercase tracking-wider leading-none">
        Tier
      </span>
      <span className="text-lg font-bold font-serif leading-none">
        {tier}
      </span>
    </div>
  );
}
