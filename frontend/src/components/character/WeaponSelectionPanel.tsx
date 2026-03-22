"use client";

/**
 * src/components/character/WeaponSelectionPanel.tsx
 *
 * Step 3 of the character builder: Choose Starting Weapons.
 *
 * Features:
 * - Two weapon slots: Primary and Secondary
 * - Filterable list (by name, trait, burden, damage type, range, feature)
 * - "Suggested" badge on weapons that match the subclass's spellcast trait
 * - Suggested weapons sort to the top by default
 * - Drill-down detail view with full SRD stats + page reference
 * - Enforces SRD rule: magic weapons require a Spellcast trait
 * - Enforces SRD rule: Two-Handed primary disables secondary selection
 */

import React, { useState, useMemo } from "react";
import {
  ALL_TIER1_WEAPONS,
  SUBCLASS_SUGGESTED_WEAPONS,
  type SRDWeapon,
  type WeaponCategory,
} from "@/lib/srdEquipment";

interface WeaponSelectionPanelProps {
  primaryWeaponId: string | null;
  secondaryWeaponId: string | null;
  onPrimaryChange: (id: string | null) => void;
  onSecondaryChange: (id: string | null) => void;
  /** subclassId (lowercase, hyphenated) for suggested weapons */
  subclassId: string;
  /** Whether the subclass grants a Spellcast trait (gates magic weapons) */
  hasSpellcastTrait: boolean;
}

type ActiveSlot = "primary" | "secondary";

export function WeaponSelectionPanel({
  primaryWeaponId,
  secondaryWeaponId,
  onPrimaryChange,
  onSecondaryChange,
  subclassId,
  hasSpellcastTrait,
}: WeaponSelectionPanelProps) {
  const [activeSlot, setActiveSlot] = useState<ActiveSlot>("primary");
  const [filterText, setFilterText] = useState("");
  const [drillWeapon, setDrillWeapon] = useState<SRDWeapon | null>(null);

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

  // Sort: suggested first, then alphabetical
  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const aSug = suggestedIds.has(a.id) ? 0 : 1;
      const bSug = suggestedIds.has(b.id) ? 0 : 1;
      if (aSug !== bSug) return aSug - bSug;
      return a.name.localeCompare(b.name);
    });
  }, [filtered, suggestedIds]);

  const selectedId = activeSlot === "primary" ? primaryWeaponId : secondaryWeaponId;
  const primaryWeapon = ALL_TIER1_WEAPONS.find((w) => w.id === primaryWeaponId) ?? null;
  const secondaryWeapon = ALL_TIER1_WEAPONS.find((w) => w.id === secondaryWeaponId) ?? null;

  // SRD rule: Two-Handed primary disables secondary slot
  const primaryIsTwoHanded = primaryWeapon?.burden === "Two-Handed";

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

  if (drillWeapon) {
    return (
      <WeaponDrillDown
        weapon={drillWeapon}
        isSuggested={suggestedIds.has(drillWeapon.id)}
        onBack={() => setDrillWeapon(null)}
      />
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Slot tabs */}
      <div className="flex shrink-0 border-b border-slate-700/30">
        {(["primary", "secondary"] as ActiveSlot[]).map((slot) => {
          const weapon = slot === "primary" ? primaryWeapon : secondaryWeapon;
          const disabled = slot === "secondary" && primaryIsTwoHanded;
          return (
            <button
              key={slot}
              type="button"
              disabled={disabled}
              onClick={() => setActiveSlot(slot)}
              className={`
                flex-1 py-3 px-3 text-xs font-semibold uppercase tracking-wider transition-colors
                ${activeSlot === slot
                  ? "text-[#577399] border-b-2 border-[#577399]"
                  : "text-[#b9baa3]/40 hover:text-[#b9baa3]/70 border-b-2 border-transparent"
                }
                ${disabled ? "opacity-40 cursor-not-allowed" : ""}
              `}
            >
              {slot === "primary" ? "Primary" : "Secondary"}
              {weapon && <span className="ml-1.5 text-[#577399]">✓</span>}
              {disabled && <span className="ml-1.5 text-[#b9baa3]/30 text-[10px] normal-case font-normal">(Two-Handed equipped)</span>}
            </button>
          );
        })}
      </div>

      {/* Filter bar */}
      <div className="shrink-0 px-4 py-3 border-b border-slate-700/30">
        <input
          type="text"
          value={filterText}
          onChange={(e) => setFilterText(e.target.value)}
          placeholder={`Filter ${categoryForSlot.toLowerCase()} weapons…`}
          className="
            w-full rounded px-3 py-2 bg-slate-900 border border-slate-700
            text-sm text-[#f7f7ff] placeholder-[#b9baa3]/30
            focus:outline-none focus:ring-2 focus:ring-[#577399] focus:border-transparent
            transition-colors
          "
        />
        <p className="text-[10px] text-[#b9baa3]/30 mt-1.5">
          Filter by name, trait, burden, range, damage type, or feature
        </p>
      </div>

      {/* Weapon list */}
      <div className="flex-1 overflow-y-auto">
        {sorted.length === 0 ? (
          <div className="flex items-center justify-center h-32">
            <p className="text-sm text-[#b9baa3]/40 italic">No weapons match your filter</p>
          </div>
        ) : (
          sorted.map((weapon) => {
            const isSelected = weapon.id === selectedId;
            const isSuggested = suggestedIds.has(weapon.id);
            return (
              <div
                key={weapon.id}
                onClick={() => setDrillWeapon(weapon)}
                className={`
                  flex items-start gap-2 px-4 py-3 border-l-2 transition-colors cursor-pointer
                  ${isSelected
                    ? "bg-[#577399]/20 border-[#577399]"
                    : "border-transparent hover:bg-slate-800/60 hover:border-slate-600"
                  }
                `}
              >
                {/* Circular select button */}
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); handleSelect(weapon); }}
                  aria-label={`Select ${weapon.name}`}
                  className={`
                    mt-0.5 h-5 w-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors
                    ${isSelected
                      ? "border-[#577399] bg-[#577399]"
                      : "border-slate-600 hover:border-[#577399]/70"
                    }
                  `}
                >
                  {isSelected && <span className="h-2 w-2 rounded-full bg-white" />}
                </button>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-[#f7f7ff]">{weapon.name}</span>
                    {isSuggested && (
                      <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-[#577399]/30 text-[#577399] border border-[#577399]/40 whitespace-nowrap">
                        Suggested Weapon
                      </span>
                    )}
                    {weapon.damageType === "Magic" && (
                      <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-purple-900/30 text-purple-400 border border-purple-700/40">
                        Magic
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2 mt-1">
                    <span className="text-xs text-[#b9baa3]/60">{weapon.trait}</span>
                    <span className="text-xs text-[#b9baa3]/40">·</span>
                    <span className="text-xs text-[#b9baa3]/60">{weapon.burden}</span>
                    <span className="text-xs text-[#b9baa3]/40">·</span>
                    <span className="text-xs text-[#b9baa3]/60">{weapon.range}</span>
                    <span className="text-xs text-[#b9baa3]/40">·</span>
                    <span className="text-xs font-mono text-[#b9baa3]/80">{weapon.damageDie}</span>
                  </div>
                  {weapon.feature && (
                    <p className="text-xs text-[#b9baa3]/50 mt-1 italic truncate">{weapon.feature}</p>
                  )}
                </div>

                {/* Drill-down chevron (visual hint only, row itself is clickable) */}
                <span className="shrink-0 text-[#b9baa3]/30 text-lg leading-none self-center">›</span>
              </div>
            );
          })
        )}
      </div>

      {/* Selected summary */}
      {(primaryWeapon || secondaryWeapon) && (
        <div className="shrink-0 border-t border-slate-700/30 px-4 py-3 space-y-1">
          {primaryWeapon && (
            <div className="flex items-center gap-2 text-xs">
              <span className="text-[#b9baa3]/50 w-16 shrink-0">Primary:</span>
              <span className="text-[#f7f7ff] font-medium">{primaryWeapon.name}</span>
              <span className="text-[#b9baa3]/40">{primaryWeapon.damageDie} · {primaryWeapon.range}</span>
            </div>
          )}
          {secondaryWeapon && (
            <div className="flex items-center gap-2 text-xs">
              <span className="text-[#b9baa3]/50 w-16 shrink-0">Secondary:</span>
              <span className="text-[#f7f7ff] font-medium">{secondaryWeapon.name}</span>
              <span className="text-[#b9baa3]/40">{secondaryWeapon.damageDie} · {secondaryWeapon.range}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Drill-Down Detail View ────────────────────────────────────────────────────

interface WeaponDrillDownProps {
  weapon: SRDWeapon;
  isSuggested: boolean;
  onBack: () => void;
}

function WeaponDrillDown({ weapon, isSuggested, onBack }: WeaponDrillDownProps) {
  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Back button */}
      <div className="shrink-0 px-4 pt-4 pb-2">
        <button
          type="button"
          onClick={onBack}
          className="text-xs text-[#577399] hover:text-[#7a9fc2] transition-colors flex items-center gap-1"
        >
          ← Back to list
        </button>
      </div>

      <div className="px-6 pb-6 space-y-5">
        {/* Header */}
        <div>
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h3 className="font-serif text-2xl font-bold text-[#f7f7ff]">{weapon.name}</h3>
            {isSuggested && (
              <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-[#577399]/30 text-[#577399] border border-[#577399]/40">
                Suggested Weapon
              </span>
            )}
            {weapon.damageType === "Magic" && (
              <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-purple-900/30 text-purple-400 border border-purple-700/40">
                Magic
              </span>
            )}
          </div>
          <p className="text-xs text-[#b9baa3]/50">
            Tier {weapon.tier} {weapon.category} Weapon · SRD page {weapon.srdPage}
          </p>
        </div>

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

        {/* Description */}
        {weapon.description && (
          <div className="rounded-lg border border-slate-700/60 bg-slate-850/50 px-4 py-3">
            <p className="text-xs font-semibold uppercase text-[#b9baa3]/50 mb-1">Notes</p>
            <p className="text-sm text-[#b9baa3]/70">{weapon.description}</p>
          </div>
        )}

        {/* SRD citation */}
        <p className="text-xs text-[#b9baa3]/30 italic">
          Source: Daggerheart SRD, page {weapon.srdPage}
        </p>
      </div>
    </div>
  );
}

function StatBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-700/60 bg-slate-900/40 px-3 py-2">
      <p className="text-[10px] uppercase tracking-wider text-[#b9baa3]/50 mb-0.5">{label}</p>
      <p className="text-sm font-semibold text-[#f7f7ff]">{value}</p>
    </div>
  );
}
