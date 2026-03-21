"use client";

/**
 * src/components/character/LoadoutValidationIndicator.tsx
 *
 * Shows real-time validation feedback for the domain loadout.
 * - Capacity indicator (X/5 with visual fill)
 * - Warning when adding to full loadout
 * - Recall cost hint when swapping
 */

import React from "react";
import { validateLoadoutCapacity } from "@/hooks/useCharacterValidation";

interface LoadoutValidationIndicatorProps {
  loadout: string[];
  vault: string[];
  isFull: boolean;
  canAdd: boolean;
}

export function LoadoutValidationIndicator({
  loadout,
  vault,
  isFull,
  canAdd,
}: LoadoutValidationIndicatorProps) {
  const capacity = validateLoadoutCapacity(loadout);

  return (
    <div className="space-y-2">
      {/* Capacity bar */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#b9baa3]">
            Active Loadout
          </span>
          <span
            className={`text-xs font-bold ${
              capacity.current >= capacity.max
                ? "text-[#fe5f55]"
                : capacity.current >= 3
                  ? "text-[#f7b500]"
                  : "text-[#577399]"
            }`}
          >
            {capacity.current}/{capacity.max}
          </span>
        </div>

        {/* Visual capacity indicator */}
        <div className="flex gap-1">
          {Array.from({ length: 5 }, (_, i) => (
            <div
              key={i}
              className={`flex-1 h-2 rounded-sm transition-colors ${
                i < capacity.current
                  ? capacity.current >= capacity.max
                    ? "bg-[#fe5f55]"
                    : "bg-[#577399]"
                  : "bg-slate-800/40"
              }`}
            />
          ))}
        </div>
      </div>

      {/* Status message */}
      <div className="space-y-1.5">
        {isFull && (
          <div className="p-2 rounded-lg border border-[#f7b500]/50 bg-[#f7b500]/8">
            <div className="flex items-start gap-2">
              <span className="text-lg shrink-0 text-[#f7b500]">ℹ</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-[#f7b500]">Loadout is full</p>
                <p className="text-xs text-[#b9baa3] mt-1 opacity-75">
                  {vault.length > 0
                    ? `Swap a card (cost: Recall) or remove one to add more`
                    : "Acquire more cards to unlock the vault"}
                </p>
              </div>
            </div>
          </div>
        )}

        {!isFull && capacity.available <= 2 && (
          <div className="p-2 rounded-lg border border-[#577399]/30 bg-[#577399]/8">
            <p className="text-xs text-[#577399] font-semibold">
              {capacity.available} slot{capacity.available !== 1 ? "s" : ""} available
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * RecallCostHint
 *
 * Shows the recall cost when swapping a card in.
 * SRD page 22: "You may discard a Domain Card from your Active Loadout and Recall it for 1 Hope."
 */
export function RecallCostHint() {
  return (
    <div className="p-3 rounded-lg border border-[#f7b500]/30 bg-[#f7b500]/8 space-y-1">
      <div className="flex items-start gap-2">
        <span className="text-lg shrink-0 text-[#f7b500]">💰</span>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-[#f7b500]">Recall cost: 1 Hope</p>
          <p className="text-xs text-[#b9baa3] mt-0.5 opacity-75">
            SRD page 22: Discarding and Recalling a Domain Card costs 1 Hope
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * LoadoutCardCountHint
 *
 * Shows helpful info about the max loadout size.
 */
export function LoadoutCardCountHint({ count }: { count: number }) {
  if (count !== 0) return null;

  return (
    <div className="p-3 rounded-lg border border-[#577399]/30 bg-[#577399]/8">
      <div className="flex items-start gap-2">
        <span className="text-lg shrink-0 text-[#577399]">ℹ</span>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-[#577399]">Add up to 5 domain cards</p>
          <p className="text-xs text-[#b9baa3] mt-0.5 opacity-75">
            You can modify your loadout at any time (SRD page 22)
          </p>
        </div>
      </div>
    </div>
  );
}
