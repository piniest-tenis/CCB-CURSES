"use client";

/**
 * src/components/homebrew/RaritySelector.tsx
 *
 * Dropdown selector for item/consumable rarity.
 * Used by LootForm.
 */

import React from "react";
import type { LootRarity } from "@shared/types";
import { INPUT_CLS, LABEL_CLS } from "./styles";

export interface RaritySelectorProps {
  value: LootRarity;
  onChange: (rarity: LootRarity) => void;
  id?: string;
}

const RARITY_OPTIONS: { value: LootRarity; label: string; colorClass: string }[] = [
  { value: "common",    label: "Common",    colorClass: "text-parchment-500" },
  { value: "uncommon",  label: "Uncommon",  colorClass: "text-emerald-400" },
  { value: "rare",      label: "Rare",      colorClass: "text-blue-400" },
  { value: "very rare", label: "Very Rare", colorClass: "text-purple-400" },
  { value: "legendary", label: "Legendary", colorClass: "text-gold-400" },
];

export function RaritySelector({ value, onChange, id }: RaritySelectorProps) {
  return (
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value as LootRarity)}
      className={INPUT_CLS}
    >
      {RARITY_OPTIONS.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}

/** Returns a Tailwind color class for a given rarity. */
export function rarityColorClass(rarity: LootRarity): string {
  return RARITY_OPTIONS.find((o) => o.value === rarity)?.colorClass ?? "text-parchment-500";
}
