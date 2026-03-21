"use client";

/**
 * src/components/character/TraitAssignmentPanel.tsx
 * 
 * Component for assigning trait bonuses (+2, +1, +1, -1).
 * Each trait can only be selected once.
 * Allows setting a default +2 trait (typically spellcastTrait from subclass).
 */

import React, { useMemo } from "react";

export type TraitName = "agility" | "cunning" | "presence" | "spellcast" | "toughness" | "wit";

export interface TraitBonuses {
  [key: string]: number; // e.g. { "agility": 2, "presence": 1, "cunning": 1, "wit": -1 }
}

interface TraitAssignmentPanelProps {
  traits: TraitBonuses;
  onTraitsChange: (traits: TraitBonuses) => void;
  /** Optional trait to pre-populate in the +2 slot */
  defaultPlus2Trait?: string;
}

const AVAILABLE_TRAITS: TraitName[] = [
  "agility",
  "cunning",
  "presence",
  "spellcast",
  "toughness",
  "wit",
];

const TRAIT_LABELS = {
  agility: "Agility",
  cunning: "Cunning",
  presence: "Presence",
  spellcast: "Spellcast",
  toughness: "Toughness",
  wit: "Wit",
};

const TRAIT_DESCRIPTIONS = {
  agility: "Sprint, Leap, Maneuver",
  cunning: "Finesse, Investigate, Deceive",
  presence: "Inspire, Intimidate, Persuade",
  spellcast: "Magic rolls",
  toughness: "Resist",
  wit: "Wit rolls",
};

const BONUS_SLOTS = [
  { bonus: 2, label: "+2" },
  { bonus: 1, label: "+1" },
  { bonus: 1, label: "+1" },
  { bonus: -1, label: "-1" },
];

export function TraitAssignmentPanel({
  traits,
  onTraitsChange,
  defaultPlus2Trait,
}: TraitAssignmentPanelProps) {
  // Initialize traits with default if needed
  React.useEffect(() => {
    if (defaultPlus2Trait && Object.keys(traits).length === 0) {
      onTraitsChange({
        [defaultPlus2Trait]: 2,
      });
    }
  }, [defaultPlus2Trait, traits, onTraitsChange]);

  // Get traits already assigned (but allow showing default before selection)
  const assignedTraits = useMemo(() => {
    return new Set(Object.keys(traits));
  }, [traits]);

  // Get traits still available for selection
  const availableForSelection = useMemo(() => {
    return AVAILABLE_TRAITS.filter((t) => !assignedTraits.has(t));
  }, [assignedTraits]);

  const handleTraitChange = (bonusValue: number, selectedTrait: TraitName | "") => {
    const newTraits = { ...traits };

    // Remove old assignment for this bonus if any
    for (const [trait, bonus] of Object.entries(newTraits)) {
      if (bonus === bonusValue) {
        delete newTraits[trait];
        break;
      }
    }

    // Add new assignment if trait selected
    if (selectedTrait) {
      newTraits[selectedTrait] = bonusValue;
    }

    onTraitsChange(newTraits);
  };

  const getTraitForBonus = (bonusValue: number): TraitName | "" => {
    for (const [trait, bonus] of Object.entries(traits)) {
      if (bonus === bonusValue) {
        return trait as TraitName;
      }
    }
    return "";
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-semibold text-[#f7f7ff] mb-3">Assign Trait Bonuses</h3>
        <p className="text-xs text-[#b9baa3]/60 mb-4">
          Select which trait gets each bonus. Each trait can only be assigned once.
        </p>
      </div>

      <div className="space-y-3">
        {BONUS_SLOTS.map((slot, idx) => {
          const currentTrait = getTraitForBonus(slot.bonus);
          const availableOptions = [
            ...availableForSelection,
            ...(currentTrait ? [currentTrait] : []),
          ];

          return (
            <div
              key={`${slot.bonus}-${idx}`}
              className="flex items-center gap-3 p-3 rounded-lg border border-slate-700/60 bg-slate-850/50"
            >
              {/* Label */}
              <div className="w-12 shrink-0">
                <span className="text-sm font-bold text-[#577399] bg-slate-900 px-2.5 py-1 rounded border border-slate-700">
                  {slot.label}
                </span>
              </div>

              {/* Dropdown */}
              <select
                value={currentTrait}
                onChange={(e) =>
                  handleTraitChange(slot.bonus, (e.target.value as TraitName) || "")
                }
                className="
                  flex-1 rounded px-3 py-2 bg-slate-900 border border-slate-700
                  text-[#f7f7ff] text-sm font-medium
                  hover:border-slate-600 focus:outline-none focus:ring-2 focus:ring-[#577399]
                  transition-colors
                "
              >
                <option value="">— Select trait —</option>
                {availableOptions.map((trait) => (
                  <option key={trait} value={trait}>
                    {TRAIT_LABELS[trait]}
                  </option>
                ))}
              </select>

              {/* Description */}
              {currentTrait && (
                <div className="text-xs text-[#b9baa3]/60">
                  {TRAIT_DESCRIPTIONS[currentTrait]}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Validation message */}
      {Object.keys(traits).length < 4 && (
        <div className="text-xs text-[#b9baa3]/50 italic">
          {4 - Object.keys(traits).length} more trait{Object.keys(traits).length < 3 ? "s" : ""} to assign
        </div>
      )}
    </div>
  );
}
