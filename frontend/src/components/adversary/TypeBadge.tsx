"use client";

/**
 * src/components/adversary/TypeBadge.tsx
 *
 * Small inline badge showing the adversary's combat archetype.
 * Uses a muted, uniform style to avoid competing with the tier badge.
 */

import React from "react";
import type { AdversaryType } from "@/types/adversary";

interface TypeBadgeProps {
  type: AdversaryType;
}

export function TypeBadge({ type }: TypeBadgeProps) {
  return (
    <span
      className="
        inline-block rounded border px-1.5 py-0.5
        text-[11px] font-semibold uppercase tracking-wider
        bg-slate-800/60 text-[#b9baa3]/80 border-slate-700/40
      "
    >
      {type}
    </span>
  );
}
