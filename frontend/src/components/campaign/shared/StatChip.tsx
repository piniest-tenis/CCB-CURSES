"use client";

/**
 * src/components/campaign/shared/StatChip.tsx
 *
 * A small labeled value chip used across campaign views
 * (CondensedCharacterCard, CommandCenterCard).
 */

import React from "react";

interface StatChipProps {
  label: string;
  value: string | number;
  color?: string;
  borderColor?: string;
}

export function StatChip({
  label,
  value,
  color = "text-[#f7f7ff]",
  borderColor = "border-[#577399]/30",
}: StatChipProps) {
  return (
    <div className={`flex flex-col items-center gap-0.5 rounded-lg border ${borderColor} bg-slate-900/60 px-2.5 py-1.5`}>
      <span className="text-[10px] uppercase tracking-wider text-parchment-500 font-medium leading-none">{label}</span>
      <span className={`text-lg font-bold leading-none tabular-nums ${color}`}>{value}</span>
    </div>
  );
}
