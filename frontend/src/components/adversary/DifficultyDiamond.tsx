"use client";

/**
 * src/components/adversary/DifficultyDiamond.tsx
 *
 * Rotated-square diamond displaying the adversary's difficulty number.
 * The only non-rectangular element on the card — designed for instant
 * visual identification in peripheral vision.
 */

import React from "react";

interface DifficultyDiamondProps {
  difficulty: number;
}

export function DifficultyDiamond({ difficulty }: DifficultyDiamondProps) {
  return (
    <div className="shrink-0 flex flex-col items-center gap-0.5">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-[#b9baa3]/50">
        Diff
      </span>
      <div
        className="
          h-9 w-9 rotate-45 rounded-sm
          border border-[#DAA520]/40 bg-[#DAA520]/10
          flex items-center justify-center
        "
      >
        <span className="-rotate-45 text-sm font-bold font-serif text-[#DAA520]">
          {difficulty}
        </span>
      </div>
    </div>
  );
}
