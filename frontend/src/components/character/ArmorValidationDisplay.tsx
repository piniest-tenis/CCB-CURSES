"use client";

/**
 * src/components/character/ArmorValidationDisplay.tsx
 *
 * Shows armor score validation and cap warnings.
 * SRD page 20: Armor Score = equipped armor base + level; max 12.
 */

import React from "react";
import { validateArmorForEquip } from "@/hooks/useCharacterValidation";

interface ArmorValidationDisplayProps {
  baseArmor: number;
  level: number;
  selectedArmorName?: string;
}

export function ArmorValidationDisplay({
  baseArmor,
  level,
  selectedArmorName,
}: ArmorValidationDisplayProps) {
  const validation = React.useMemo(
    () => validateArmorForEquip(baseArmor, level),
    [baseArmor, level]
  );

  return (
    <div className="space-y-2">
      {/* Score display */}
      <div className="flex items-center justify-between p-3 rounded-lg border border-slate-700 bg-slate-900/50">
        <div>
          <p className="text-xs uppercase tracking-wider text-[#b9baa3] font-semibold">
            Armor Score
          </p>
          {selectedArmorName && (
            <p className="text-xs text-[#b9baa3]/60 mt-0.5">
              {selectedArmorName} + Level {level}
            </p>
          )}
        </div>
        <div className="text-right">
          <div
            className={`text-2xl font-bold ${
              validation.isValid ? "text-[#577399]" : "text-[#fe5f55]"
            }`}
          >
            {validation.score}
          </div>
          <p className="text-xs text-[#b9baa3]/60 mt-1">max {validation.max}</p>
        </div>
      </div>

      {/* Warning if over cap */}
      {!validation.isValid && (
        <div className="p-3 rounded-lg border border-[#fe5f55]/50 bg-[#fe5f55]/8 space-y-1">
          <div className="flex items-start gap-2">
            <span className="text-lg shrink-0 text-[#fe5f55]">⚠</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-[#fe5f55]">
                Armor Score exceeds cap
              </p>
              <p className="text-xs text-[#b9baa3] mt-1 opacity-75">
                💡 {validation.warning}. Select lower-tier armor or consult the SRD for armor selection rules.
              </p>
              <p className="text-xs text-[#b9baa3]/50 mt-2 italic">
                SRD page 20: Armor Score maximum is 12
              </p>
            </div>
          </div>
        </div>
      )}

      {validation.isValid && validation.score === validation.max && (
        <div className="p-3 rounded-lg border border-[#f7b500]/50 bg-[#f7b500]/8">
          <div className="flex items-start gap-2">
            <span className="text-lg shrink-0 text-[#f7b500]">⚡</span>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-[#f7b500]">At maximum armor</p>
              <p className="text-xs text-[#b9baa3] mt-1 opacity-75">
                You've reached the armor cap. Any future level increases will boost your armor further.
              </p>
            </div>
          </div>
        </div>
      )}

      {validation.isValid && validation.score < validation.max - 2 && (
        <div className="p-3 rounded-lg border border-[#577399]/30 bg-[#577399]/8">
          <p className="text-xs text-[#577399]">
            ✓ Valid armor selection
          </p>
        </div>
      )}
    </div>
  );
}

/**
 * ArmorSelectionConstraint
 *
 * Inline validation for armor choice dropdowns.
 * Shows whether selecting an armor would violate the cap.
 */
interface ArmorSelectionConstraintProps {
  baseArmor: number;
  level: number;
  armorName: string;
  canSelect: boolean;
}

export function ArmorSelectionConstraint({
  baseArmor,
  level,
  armorName,
  canSelect,
}: ArmorSelectionConstraintProps) {
  const validation = React.useMemo(
    () => validateArmorForEquip(baseArmor, level),
    [baseArmor, level]
  );

  if (validation.isValid) {
    return (
      <div className="flex items-center gap-1.5 text-xs">
        <span className="text-[#577399]">✓</span>
        <span className="text-[#b9baa3] opacity-75">Score: {validation.score}</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 text-xs">
      <span className="text-[#fe5f55]">✕</span>
      <span className="text-[#fe5f55] opacity-75">
        Would exceed cap ({validation.score} > {validation.max})
      </span>
    </div>
  );
}
