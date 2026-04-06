"use client";

/**
 * src/components/character/WeaponSelectionPanel.tsx
 *
 * Step 6 of the character builder: Choose Starting Weapons.
 *
 * Features:
 * - Two weapon slots: Primary and Secondary
 * - Filterable list (by name, trait, burden, damage type, range, feature)
 * - "Suggested" badge on weapons that match the subclass's spellcast trait
 * - Suggested weapons sort to the top by default
 * - Accordion-expandable detail tiles (SelectionTile) with full stats
 * - Enforces SRD rule: magic weapons require a Spellcast trait
 * - Enforces SRD rule: Two-Handed primary disables secondary selection
 */

import React, { useState, useMemo, useRef, useEffect, useCallback } from "react";
import {
  ALL_TIER1_WEAPONS,
  SUBCLASS_SUGGESTED_WEAPONS,
  type SRDWeapon,
  type WeaponCategory,
} from "@/lib/srdEquipment";
import { SelectionTile } from "./SelectionTile";

interface WeaponSelectionPanelProps {
  primaryWeaponId: string | null;
  secondaryWeaponId: string | null;
  onPrimaryChange: (id: string | null) => void;
  onSecondaryChange: (id: string | null) => void;
  /** subclassId (lowercase, hyphenated) for suggested weapons */
  subclassId: string;
  /** Whether the subclass grants a Spellcast trait (gates magic weapons) */
  hasSpellcastTrait: boolean;
  /** Character trait bonuses — used to sort weapons by the character's best traits */
  traitBonuses?: Record<string, number>;
}

type ActiveSlot = "primary" | "secondary";

export function WeaponSelectionPanel({
  primaryWeaponId,
  secondaryWeaponId,
  onPrimaryChange,
  onSecondaryChange,
  subclassId,
  hasSpellcastTrait,
  traitBonuses = {},
}: WeaponSelectionPanelProps) {
  const [activeSlot, setActiveSlot] = useState<ActiveSlot>("primary");
  const [filterText, setFilterText] = useState("");
  const [expandedWeaponId, setExpandedWeaponId] = useState<string | null>(null);

  // Suggested weapon IDs for this subclass
  const suggestedIds: Set<string> = useMemo(() => {
    const key = subclassId.toLowerCase();
    const pair = SUBCLASS_SUGGESTED_WEAPONS[key];
    return pair ? new Set(pair) : new Set();
  }, [subclassId]);

  const categoryForSlot: WeaponCategory = activeSlot === "primary" ? "Primary" : "Secondary";

  // Weapons eligible for the current slot
  const eligible = useMemo(() => {
    return ALL_TIER1_WEAPONS.filter((w) => {
      if (w.category !== categoryForSlot) return false;
      // Magic weapons require a Spellcast trait
      if (w.damageType === "Magic" && !hasSpellcastTrait) return false;
      return true;
    });
  }, [categoryForSlot, hasSpellcastTrait]);

  // Apply text filter across all visible fields
  const filtered = useMemo(() => {
    const q = filterText.toLowerCase().trim();
    if (!q) return eligible;
    return eligible.filter(
      (w) =>
        w.name.toLowerCase().includes(q) ||
        w.trait.toLowerCase().includes(q) ||
        w.burden.toLowerCase().includes(q) ||
        w.range.toLowerCase().includes(q) ||
        w.damageType.toLowerCase().includes(q) ||
        (w.feature ?? "").toLowerCase().includes(q) ||
        w.damageDie.toLowerCase().includes(q)
    );
  }, [eligible, filterText]);

  // Sort: suggested first → then by character's trait bonus (highest first) → then alphabetical
  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      // 1. Suggested weapons float to the top
      const aSug = suggestedIds.has(a.id) ? 0 : 1;
      const bSug = suggestedIds.has(b.id) ? 0 : 1;
      if (aSug !== bSug) return aSug - bSug;

      // 2. Sort by the character's bonus for the weapon's trait (higher = better)
      const aBonus = traitBonuses[a.trait.toLowerCase()] ?? 0;
      const bBonus = traitBonuses[b.trait.toLowerCase()] ?? 0;
      if (bBonus !== aBonus) return bBonus - aBonus;

      // 3. Alphabetical tiebreak
      return a.name.localeCompare(b.name);
    });
  }, [filtered, suggestedIds, traitBonuses]);

  const selectedId = activeSlot === "primary" ? primaryWeaponId : secondaryWeaponId;
  const primaryWeapon = ALL_TIER1_WEAPONS.find((w) => w.id === primaryWeaponId) ?? null;
  const secondaryWeapon = ALL_TIER1_WEAPONS.find((w) => w.id === secondaryWeaponId) ?? null;

  // Pre-expand the currently selected weapon when returning to this step or switching tabs
  const hasPreExpanded = useRef<string | null>(null);
  useEffect(() => {
    if (selectedId && hasPreExpanded.current !== activeSlot) {
      setExpandedWeaponId(selectedId);
      hasPreExpanded.current = activeSlot;
    }
  }, [selectedId, activeSlot]);

  // Reset expanded weapon when switching slots
  useEffect(() => {
    if (selectedId) {
      setExpandedWeaponId(selectedId);
    } else {
      setExpandedWeaponId(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSlot]);

  // SRD rule: Two-Handed primary disables secondary slot
  const primaryIsTwoHanded = primaryWeapon?.burden === "Two-Handed";

  const handleToggleExpand = useCallback((id: string) => {
    setExpandedWeaponId((prev) => (prev === id ? null : id));
  }, []);

  function handleSelect(weapon: SRDWeapon) {
    if (activeSlot === "primary") {
      onPrimaryChange(weapon.id);
      // Clear secondary if switching to Two-Handed primary
      if (weapon.burden === "Two-Handed") {
        onSecondaryChange(null);
      }
    } else {
      onSecondaryChange(weapon.id);
    }
  }

  const selectLabel = activeSlot === "primary" ? "Set as Primary" : "Set as Secondary";

  return (
    <div className="flex flex-col h-full">
      {/* Slot tabs */}
      <div className="flex shrink-0 border-b border-slate-700/30" role="tablist" aria-label="Weapon slot">
        {(["primary", "secondary"] as ActiveSlot[]).map((slot) => {
          const weapon = slot === "primary" ? primaryWeapon : secondaryWeapon;
          const disabled = slot === "secondary" && primaryIsTwoHanded;
          return (
            <button
              key={slot}
              type="button"
              role="tab"
              aria-selected={activeSlot === slot}
              disabled={disabled}
              onClick={() => setActiveSlot(slot)}
              className={`
                flex-1 min-h-[44px] py-3 px-3 text-xs font-semibold uppercase tracking-wider transition-colors
                ${activeSlot === slot
                  ? "text-steel-accessible border-b-2 border-[#577399]"
                  : "text-parchment-600 hover:text-parchment-500 border-b-2 border-transparent"
                }
                ${disabled ? "opacity-50 cursor-not-allowed" : ""}
              `}
            >
              {slot === "primary" ? "Primary" : "Secondary"}
              {weapon && <span className="ml-1.5 text-steel-accessible">✓</span>}
              {disabled && <span className="ml-1 text-parchment-600 text-xs normal-case font-normal hidden sm:inline" aria-hidden="true">(2H)</span>}
            </button>
          );
        })}
      </div>

      {/* Filter bar */}
      <div className="shrink-0 px-4 py-3 border-b border-slate-700/30">
        <label htmlFor="weapon-filter" className="sr-only">
          Filter {categoryForSlot.toLowerCase()} weapons
        </label>
        <input
          id="weapon-filter"
          type="text"
          value={filterText}
          onChange={(e) => setFilterText(e.target.value)}
          placeholder={`Filter ${categoryForSlot.toLowerCase()} weapons…`}
          className="
            w-full rounded px-3 py-2 bg-slate-900 border border-slate-700
            text-base sm:text-sm text-[#f7f7ff] placeholder-parchment-600
            focus:outline-none focus:ring-2 focus:ring-[#577399] focus:border-transparent
            transition-colors
          "
        />
        <p className="text-xs text-parchment-600 mt-1.5" aria-hidden="true">
          Filter by name, trait, burden, range, damage type, or feature
        </p>
      </div>

      {/* Weapon list — accordion tiles */}
      <div className="flex-1 overflow-y-auto">
        {sorted.length === 0 ? (
          <div className="flex items-center justify-center h-32">
            <p className="text-sm text-parchment-600">No weapons match your filter</p>
          </div>
        ) : (
          sorted.map((weapon) => {
            const isSelected = weapon.id === selectedId;
            const isSuggested = suggestedIds.has(weapon.id);
            return (
              <SelectionTile
                key={weapon.id}
                id={`weapon-${activeSlot}-${weapon.id}`}
                isSelected={isSelected}
                isExpanded={expandedWeaponId === weapon.id}
                onToggleExpand={() => handleToggleExpand(weapon.id)}
                onSelect={() => handleSelect(weapon)}
                name={weapon.name}
                subtitle={`${weapon.trait} · ${weapon.burden} · ${weapon.range} · ${weapon.damageDie}`}
                badges={
                  <>
                    {isSuggested && (
                      <span className="text-xs font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-[#577399]/30 text-[#577399] border border-[#577399]/40 whitespace-nowrap">
                        Suggested
                      </span>
                    )}
                    {weapon.damageType === "Magic" && (
                      <span className="text-xs uppercase tracking-wider px-1.5 py-0.5 rounded bg-purple-900/30 text-purple-400 border border-purple-700/40">
                        Magic
                      </span>
                    )}
                  </>
                }
                selectLabel={selectLabel}
                selectedLabel={activeSlot === "primary" ? "Primary" : "Secondary"}
              >
                {/* Expanded detail content */}
                <WeaponDetail weapon={weapon} />
              </SelectionTile>
            );
          })
        )}
      </div>

      {/* Selected summary footer */}
      {(primaryWeapon || secondaryWeapon) && (
        <div className="shrink-0 border-t border-slate-700/30 px-4 py-3 space-y-1">
          {primaryWeapon && (
            <div className="flex items-center gap-2 text-xs min-w-0">
              <span className="text-parchment-500 w-14 shrink-0">Primary:</span>
              <span className="text-[#f7f7ff] font-medium truncate">{primaryWeapon.name}</span>
              <span className="text-parchment-600 shrink-0 whitespace-nowrap ml-auto">{primaryWeapon.damageDie} · {primaryWeapon.range}</span>
            </div>
          )}
          {secondaryWeapon && (
            <div className="flex items-center gap-2 text-xs min-w-0">
              <span className="text-parchment-500 w-14 shrink-0">Secondary:</span>
              <span className="text-[#f7f7ff] font-medium truncate">{secondaryWeapon.name}</span>
              <span className="text-parchment-600 shrink-0 whitespace-nowrap ml-auto">{secondaryWeapon.damageDie} · {secondaryWeapon.range}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Weapon Detail Content (shown inside expanded tile) ────────────────────────

function WeaponDetail({ weapon }: { weapon: SRDWeapon }) {
  return (
    <div className="space-y-4">
      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3">
        <StatBlock label="Trait" value={weapon.trait} />
        <StatBlock label="Burden" value={weapon.burden} />
        <StatBlock label="Range" value={weapon.range} />
        <StatBlock label="Damage" value={`${weapon.damageDie} (${weapon.damageType})`} />
      </div>

      {/* Feature */}
      {weapon.feature && (
        <div className="rounded-lg border border-[#577399]/40 bg-[#577399]/10 px-4 py-3">
          <p className="text-xs font-semibold uppercase text-[#577399] mb-1">Feature</p>
          <p className="text-sm text-[#f7f7ff]">{weapon.feature}</p>
        </div>
      )}

      {/* Description / notes */}
      {weapon.description && (
        <div className="rounded-lg border border-slate-700/60 bg-slate-850/50 px-4 py-3">
          <p className="text-xs font-semibold uppercase text-parchment-500 mb-1">Notes</p>
          <p className="text-sm text-parchment-500">{weapon.description}</p>
        </div>
      )}

      {/* SRD citation */}
      <p className="text-xs text-parchment-600">
        Source: Daggerheart SRD, page {weapon.srdPage}
      </p>
    </div>
  );
}

function StatBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-700/60 bg-slate-900/40 px-3 py-2">
      <p className="text-xs uppercase tracking-wider text-parchment-500 mb-0.5">{label}</p>
      <p className="text-sm font-semibold text-[#f7f7ff]">{value}</p>
    </div>
  );
}
