"use client";

/**
 * src/components/campaign/shared/SlotBar.tsx
 *
 * A compact horizontal bar showing filled/total slots.
 * Used across campaign views (CondensedCharacterCard, CommandCenterCard).
 */

import React from "react";

interface SlotBarProps {
  label: string;
  marked: number;
  max: number;
  fillColor?: string;
  markedColor?: string;
  /** Bar height class (default: "h-3"). CommandCenterCard uses "h-2.5". */
  barHeight?: string;
  /** Label width class (default: "w-12"). */
  labelWidth?: string;
}

export function SlotBar({
  label,
  marked,
  max,
  fillColor = "bg-[#577399]",
  markedColor = "text-[#f7f7ff]",
  barHeight = "h-3",
  labelWidth = "w-12",
}: SlotBarProps) {
  return (
    <div className="flex items-center gap-2">
      <span className={`text-[10px] uppercase tracking-wider text-parchment-500 font-medium ${labelWidth} shrink-0`}>{label}</span>
      <div className="flex gap-0.5 flex-1">
        {Array.from({ length: max }, (_, i) => (
          <span
            key={i}
            className={[
              `${barHeight} flex-1 rounded-sm border`,
              i < marked
                ? `${fillColor} border-transparent`
                : "border-[#577399]/30 bg-transparent",
            ].join(" ")}
          />
        ))}
      </div>
      <span className={`text-xs font-semibold tabular-nums ${markedColor}`}>
        {marked}/{max}
      </span>
    </div>
  );
}
