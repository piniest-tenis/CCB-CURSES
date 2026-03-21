"use client";

/**
 * src/components/character/TraitAssignmentPanel.tsx
 *
 * Component for assigning trait bonuses (+2, +1, +1, -1).
 * Each trait can only be selected once.
 * Allows setting a default +2 trait (typically spellcastTrait from subclass).
 *
 * Uses the project's CoreStatName trait set:
 *   agility | strength | finesse | instinct | presence | knowledge
 */

import React, { useMemo } from "react";
import type { CoreStatName } from "@shared/types";
import { validateTraitsForAssignment } from "@/hooks/useCharacterValidation";

export type TraitName = CoreStatName;

export interface TraitBonuses {
  [key: string]: number; // e.g. { "agility": 2, "presence": 1, "finesse": 1, "knowledge": -1 }
}

interface TraitAssignmentPanelProps {
  traits: TraitBonuses;
  onTraitsChange: (traits: TraitBonuses) => void;
  /** Optional trait to pre-populate in the +2 slot (spellcastTrait from subclass) */
  defaultPlus2Trait?: string;
}

const AVAILABLE_TRAITS: TraitName[] = [
  "agility",
  "strength",
  "finesse",
  "instinct",
  "presence",
  "knowledge",
];

const TRAIT_LABELS: Record<TraitName, string> = {
  agility:   "Agility",
  strength:  "Strength",
  finesse:   "Finesse",
  instinct:  "Instinct",
  presence:  "Presence",
  knowledge: "Knowledge",
};

const TRAIT_DESCRIPTIONS: Record<TraitName, string> = {
  agility:   "Sprint, leap, maneuver",
  strength:  "Lift, break, grapple",
  finesse:   "Precise attacks, sleight of hand",
  instinct:  "React, track, sense danger",
  presence:  "Inspire, intimidate, persuade",
  knowledge: "Recall lore, investigate, deduce",
};

// Each slot is identified by a stable key so the two +1 slots are independent.
const BONUS_SLOTS = [
  { key: "plus2",   bonus: 2,  label: "+2" },
  { key: "plus1a",  bonus: 1,  label: "+1" },
  { key: "plus1b",  bonus: 1,  label: "+1" },
  { key: "minus1",  bonus: -1, label: "−1" },
] as const;

type SlotKey = typeof BONUS_SLOTS[number]["key"];

/**
 * Internal representation: map each slot key → assigned trait (or "").
 * This avoids the ambiguity of two slots both having bonus === 1.
 */
function traitBonusesToSlots(traits: TraitBonuses): Record<SlotKey, TraitName | ""> {
  // Collect all entries sorted descending by bonus value so +2 fills first,
  // then +1, then -1.
  const entries = Object.entries(traits).sort((a, b) => b[1] - a[1]);

  const slots: Record<SlotKey, TraitName | ""> = {
    plus2:  "",
    plus1a: "",
    plus1b: "",
    minus1: "",
  };

  let plus1Filled = false;
  for (const [trait, bonus] of entries) {
    if (bonus === 2  && !slots.plus2)  { slots.plus2  = trait as TraitName; }
    else if (bonus === 1  && !plus1Filled) { slots.plus1a = trait as TraitName; plus1Filled = true; }
    else if (bonus === 1)              { slots.plus1b = trait as TraitName; }
    else if (bonus === -1 && !slots.minus1) { slots.minus1 = trait as TraitName; }
  }
  return slots;
}

function slotsToTraitBonuses(slots: Record<SlotKey, TraitName | "">): TraitBonuses {
  const result: TraitBonuses = {};
  if (slots.plus2)  result[slots.plus2]  = (result[slots.plus2]  ?? 0) + 2;
  if (slots.plus1a) result[slots.plus1a] = (result[slots.plus1a] ?? 0) + 1;
  if (slots.plus1b) result[slots.plus1b] = (result[slots.plus1b] ?? 0) + 1;
  if (slots.minus1) result[slots.minus1] = (result[slots.minus1] ?? 0) - 1;
  return result;
}

export function TraitAssignmentPanel({
  traits,
  onTraitsChange,
  defaultPlus2Trait,
}: TraitAssignmentPanelProps) {
  // Pre-populate the +2 slot with the subclass's spellcast trait when empty.
  // Guard: only apply when traits are empty AND defaultPlus2Trait is a valid trait.
  React.useEffect(() => {
    if (
      defaultPlus2Trait &&
      AVAILABLE_TRAITS.includes(defaultPlus2Trait as TraitName) &&
      Object.keys(traits).length === 0
    ) {
      onTraitsChange({ [defaultPlus2Trait]: 2 });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultPlus2Trait]);

  const slots = useMemo(() => traitBonusesToSlots(traits), [traits]);

  const assignedTraits = useMemo(() => new Set(Object.values(slots).filter(Boolean)), [slots]);

  const handleSlotChange = (slotKey: SlotKey, selectedTrait: TraitName | "") => {
    const newSlots = { ...slots, [slotKey]: selectedTrait };
    onTraitsChange(slotsToTraitBonuses(newSlots));
  };

  const assignedCount = Object.values(slots).filter(Boolean).length;

  // Real-time validation
  const validation = useMemo(() => validateTraitsForAssignment(traits), [traits]);

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-semibold text-[#f7f7ff] mb-3">Assign Trait Bonuses</h3>
        <p className="text-xs text-[#b9baa3]/60 mb-4">
          Select which trait gets each bonus. Each trait can only be assigned once.
          <br />
          <span className="block mt-1">
            {validation.isValid ? (
              <span className="text-[#577399]">✓ Valid assignment (+{validation.sum})</span>
            ) : (
              <span className="text-[#fe5f55]">⚠ {validation.message}</span>
            )}
          </span>
        </p>
      </div>

      <div className="space-y-3">
        {BONUS_SLOTS.map((slot) => {
          const currentTrait = slots[slot.key];
          // Available = unassigned traits + whatever is currently in this slot
          const availableOptions = AVAILABLE_TRAITS.filter(
            (t) => !assignedTraits.has(t) || t === currentTrait
          );

          return (
            <div
              key={slot.key}
              className="flex items-center gap-3 p-3 rounded-lg border border-slate-700/60 bg-slate-850/50"
            >
              {/* Bonus label */}
              <div className="w-12 shrink-0">
                <span className="text-sm font-bold text-[#577399] bg-slate-900 px-2.5 py-1 rounded border border-slate-700">
                  {slot.label}
                </span>
              </div>

              {/* Dropdown */}
              <select
                value={currentTrait}
                onChange={(e) =>
                  handleSlotChange(slot.key, (e.target.value as TraitName) || "")
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

              {/* Hint */}
              {currentTrait && (
                <div className="hidden sm:block text-xs text-[#b9baa3]/60 w-40 shrink-0">
                  {TRAIT_DESCRIPTIONS[currentTrait]}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Real-time validation feedback */}
      {!validation.isValid && (
        <div className="p-3 rounded-lg border border-[#fe5f55]/50 bg-[#fe5f55]/8 space-y-1">
          <div className="flex items-start gap-2">
            <span className="text-lg shrink-0 text-[#fe5f55]">⚠</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-[#fe5f55]">
                {validation.message}
              </p>
              {validation.sum !== 2 && (
                <p className="text-xs text-[#b9baa3] mt-1 opacity-75">
                  💡 Adjust bonuses so they sum to exactly +2
                </p>
              )}
              {validation.assigned < 4 && (
                <p className="text-xs text-[#b9baa3] mt-1 opacity-75">
                  💡 {4 - validation.assigned} more trait{validation.assigned < 3 ? "s" : ""} to assign
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {validation.isValid && (
        <div className="p-3 rounded-lg border border-[#577399]/50 bg-[#577399]/8">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-[#577399] font-bold">✓</span>
            <span className="text-[#577399]">All traits assigned correctly</span>
          </div>
        </div>
      )}
    </div>
  );
}
