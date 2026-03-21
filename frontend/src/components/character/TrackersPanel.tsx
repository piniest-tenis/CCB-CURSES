"use client";

/**
 * src/components/character/TrackersPanel.tsx
 *
 * Renders:
 * - Damage threshold inputs (Major / Severe only — SRD page 20)
 * - Slot trackers (HP, Stress, Armor) — clickable circles, each click
 *   calls POST /characters/{id}/actions with mark-hp / clear-hp / etc.
 * - Proficiency display — scalar integer (SRD page 3/22)
 * - Primary + secondary weapon cards (full field set)
 * - Hope tracker — +/- buttons call gain-hope / spend-hope
 * - Experiences list
 * - Traits section (Ancestry × 2 + Community traits)
 *
 * Action wiring:
 *   Slot click (mark)   → mark-hp / mark-stress / mark-armor   { n: 1 }
 *   Slot click (clear)  → clear-hp / clear-stress / clear-armor { n: 1 }
 *   Hope + button       → gain-hope  { n: 1 }
 *   Hope - button       → spend-hope { n: 1 }
 *
 * Inline errors (role="alert") appear directly below the tracker group,
 * never as toasts. Buttons are never disabled preemptively.
 */

import React, { useState } from "react";
import type { CharacterTrackers, WeaponBurden, WeaponDamageType } from "@shared/types";
import { useCharacterStore } from "@/store/characterStore";
import { useAncestry, useCommunity } from "@/hooks/useGameData";
import { useActionButton, InlineActionError } from "./ActionButton";

// ─── Props helper: characterId is provided by TrackersPanel from the store ────

function useCharacterId(): string {
  const { activeCharacter } = useCharacterStore();
  return activeCharacter?.characterId ?? "";
}

// ─── ActionableSlotTracker ────────────────────────────────────────────────────
// Like SlotTracker but each circle click fires a server action.

interface ActionableSlotTrackerProps {
  label:         string;
  marked:        number;
  max:           number;
  /** Action fired when clicking an empty slot (marking) */
  markActionId:  string;
  /** Action fired when clicking a filled slot (clearing) */
  clearActionId: string;
  characterId:   string;
  onMaxChange:   (value: number) => void;
  colorFilled?:  string;
  hardMax?:      number;
}

function ActionableSlotTracker({
  label,
  marked,
  max,
  markActionId,
  clearActionId,
  characterId,
  onMaxChange,
  colorFilled = "bg-burgundy-600",
  hardMax,
}: ActionableSlotTrackerProps) {
  const { fire, isPending, inlineError } = useActionButton(characterId);
  const errorId = React.useId();

  const handleToggle = async (index: number) => {
    const isFilled = index < marked;
    if (isFilled) {
      // Clear down to this index: n = marked - index
      await fire(clearActionId, { n: marked - index });
    } else {
      // Mark up to index + 1: n = index + 1 - marked
      await fire(markActionId, { n: index + 1 - marked });
    }
  };

  return (
    <div className="flex flex-col gap-1.5">
      {/* Header row: label + marked/max counter */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-parchment-400">
          {label}
        </span>
        <div className="flex items-center gap-1 text-xs text-parchment-500">
          <span aria-label={`${label} marked`}>{marked}</span>
          <span>/</span>
          <input
            type="number"
            min={1}
            max={hardMax ?? 20}
            value={max}
            onChange={(e) => {
              const v = parseInt(e.target.value, 10);
              if (!isNaN(v) && v > 0) onMaxChange(hardMax ? Math.min(v, hardMax) : v);
            }}
            aria-label={`${label} max slots`}
            className="
              w-8 bg-transparent text-center text-parchment-300
              border-b border-burgundy-800 focus:outline-none focus:ring-1 focus:ring-gold-500 focus:border-gold-500
              [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none
              transition-colors
            "
          />
          {hardMax && (
            <span className="text-parchment-700 text-[10px]">/{hardMax}</span>
          )}
        </div>
      </div>

      {/* Slot circles */}
      <div
        className="flex flex-wrap gap-1.5"
        role="group"
        aria-label={`${label} slots`}
        aria-describedby={inlineError ? errorId : undefined}
      >
        {Array.from({ length: max }, (_, i) => {
          const filled = i < marked;
          return (
            <button
              key={i}
              type="button"
              onClick={() => handleToggle(i)}
              disabled={isPending}
              aria-label={`${label} slot ${i + 1} — ${filled ? "marked" : "empty"}`}
              aria-pressed={filled}
              className={`
                h-8 w-8 rounded-full border-2 transition-all duration-150
                focus:outline-none focus:ring-2 focus:ring-gold-500 focus:ring-offset-1 focus:ring-offset-slate-900
                disabled:opacity-60 disabled:cursor-wait
                ${
                  filled
                    ? `${colorFilled} border-transparent shadow-sm`
                    : "border-burgundy-700 bg-transparent hover:border-gold-500"
                }
              `}
            />
          );
        })}
      </div>
      <InlineActionError message={inlineError} id={errorId} />
    </div>
  );
}

// ─── ThresholdInput ───────────────────────────────────────────────────────────

interface ThresholdInputProps {
  label:    string;
  value:    number;
  onChange: (v: number) => void;
}

function ThresholdInput({ label, value, onChange }: ThresholdInputProps) {
  const inputId = `threshold-${label.toLowerCase()}`;
  return (
    <div className="flex flex-col items-center gap-1">
      <input
        id={inputId}
        type="number"
        min={0}
        max={99}
        value={value}
        onChange={(e) => {
          const v = parseInt(e.target.value, 10);
          if (!isNaN(v) && v >= 0) onChange(v);
        }}
        aria-label={`${label} damage threshold`}
        className="
          h-10 w-14 rounded border border-burgundy-700 bg-slate-850
          text-center text-lg font-bold text-parchment-200
          focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-gold-500 transition-colors
          [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none
          [&::-webkit-outer-spin-button]:appearance-none
        "
      />
      <label htmlFor={inputId} className="text-[10px] uppercase tracking-widest text-parchment-500 cursor-pointer">
        {label}
      </label>
    </div>
  );
}

// ─── WeaponCard ───────────────────────────────────────────────────────────────

interface WeaponCardProps {
  slot: "primary" | "secondary";
}

const DAMAGE_TYPES: WeaponDamageType[] = ["physical", "magic"];
const BURDENS: WeaponBurden[]          = ["one-handed", "two-handed"];

function WeaponCard({ slot }: WeaponCardProps) {
  const { activeCharacter, updateField } = useCharacterStore();
  if (!activeCharacter) return null;

  const weapon = activeCharacter.weapons[slot];
  const base   = `weapons.${slot}`;
  const tierId = `${slot}-weapon-tier`;

  return (
    <div className="rounded-lg border border-burgundy-800 bg-slate-850 p-3 shadow-card space-y-2">
      <h4 className="text-xs font-semibold uppercase tracking-wider text-gold-600">
        {slot === "primary" ? "Primary Weapon" : "Secondary Weapon"}
      </h4>

      {/* Weapon name */}
      <input
        type="text"
        placeholder="Weapon name"
        value={weapon.name ?? ""}
        onChange={(e) => updateField(`${base}.name`, e.target.value || null)}
        aria-label={`${slot} weapon name`}
        className="
          w-full rounded bg-slate-900 px-2 py-1 text-sm text-parchment-200
          border border-burgundy-800 focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-gold-500
          placeholder-parchment-700 transition-colors
        "
      />

      <div className="grid grid-cols-2 gap-2">
        {/* Trait */}
        <input
          type="text"
          placeholder="Trait (e.g. Agility)"
          value={weapon.trait ?? ""}
          onChange={(e) => updateField(`${base}.trait`, e.target.value || null)}
          aria-label={`${slot} weapon trait`}
          className="
            rounded bg-slate-900 px-2 py-1 text-xs text-parchment-300
            border border-burgundy-800 focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-gold-500
            placeholder-parchment-700 transition-colors
          "
        />

        {/* Damage */}
        <input
          type="text"
          placeholder="Damage (e.g. 2d6+2)"
          value={weapon.damage ?? ""}
          onChange={(e) => updateField(`${base}.damage`, e.target.value || null)}
          aria-label={`${slot} weapon damage`}
          className="
            rounded bg-slate-900 px-2 py-1 text-xs text-parchment-300
            border border-burgundy-800 focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-gold-500
            placeholder-parchment-700 transition-colors
          "
        />

        {/* Range */}
        <input
          type="text"
          placeholder="Range (e.g. Melee)"
          value={weapon.range ?? ""}
          onChange={(e) => updateField(`${base}.range`, e.target.value || null)}
          aria-label={`${slot} weapon range`}
          className="
            rounded bg-slate-900 px-2 py-1 text-xs text-parchment-300
            border border-burgundy-800 focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-gold-500
            placeholder-parchment-700 transition-colors
          "
        />

        {/* Damage type */}
        <select
          value={weapon.type ?? ""}
          onChange={(e) =>
            updateField(`${base}.type`, (e.target.value as WeaponDamageType) || null)
          }
          aria-label={`${slot} weapon type`}
          className="
            rounded bg-slate-900 px-2 py-1 text-xs text-parchment-300
            border border-burgundy-800 focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-gold-500
            transition-colors
          "
        >
          <option value="">Type…</option>
          {DAMAGE_TYPES.map((t) => (
            <option key={t} value={t}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </option>
          ))}
        </select>

        {/* Burden */}
        <select
          value={weapon.burden ?? ""}
          onChange={(e) =>
            updateField(`${base}.burden`, (e.target.value as WeaponBurden) || null)
          }
          aria-label={`${slot} weapon burden`}
          className="
            col-span-2 rounded bg-slate-900 px-2 py-1 text-xs text-parchment-300
            border border-burgundy-800 focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-gold-500
            transition-colors
          "
        >
          <option value="">Burden…</option>
          {BURDENS.map((b) => (
            <option key={b} value={b}>
              {b.replace("-", " ")}
            </option>
          ))}
        </select>

        {/* Tier — SRD page 23 */}
        <div className="flex items-center gap-2">
          <label htmlFor={tierId} className="text-[10px] uppercase tracking-wider text-parchment-600 shrink-0">
            Tier
          </label>
          <select
            id={tierId}
            value={weapon.tier ?? ""}
            onChange={(e) =>
              updateField(`${base}.tier`, e.target.value ? parseInt(e.target.value, 10) : null)
            }
            aria-label={`${slot} weapon tier`}
            className="
              flex-1 rounded bg-slate-900 px-2 py-1 text-xs text-parchment-300
              border border-burgundy-800 focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-gold-500
              transition-colors
            "
          >
            <option value="">—</option>
            {[1, 2, 3, 4].map((t) => (
              <option key={t} value={t}>Tier {t}</option>
            ))}
          </select>
        </div>

        {/* Feature — SRD page 23 */}
        <input
          type="text"
          placeholder="Feature (e.g. Reliable)"
          value={weapon.feature ?? ""}
          onChange={(e) => updateField(`${base}.feature`, e.target.value || null)}
          aria-label={`${slot} weapon feature`}
          className="
            rounded bg-slate-900 px-2 py-1 text-xs text-parchment-300
            border border-burgundy-800 focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-gold-500
            placeholder-parchment-700 transition-colors
          "
        />
      </div>
    </div>
  );
}

// ─── ActionableHopeTracker ────────────────────────────────────────────────────
// Hope +/- buttons call gain-hope / spend-hope via the actions endpoint.

function ActionableHopeTracker({ characterId }: { characterId: string }) {
  const { activeCharacter } = useCharacterStore();
  if (!activeCharacter) return null;

  const { hope } = activeCharacter;
  // SRD page 20: base max Hope is 6; reduced by scars.
  const hopeMax = activeCharacter.hopeMax ?? 6;

  return (
    <HopeTrackerInner
      hope={hope}
      hopeMax={hopeMax}
      characterId={characterId}
    />
  );
}

function HopeTrackerInner({
  hope,
  hopeMax,
  characterId,
}: {
  hope: number;
  hopeMax: number;
  characterId: string;
}) {
  const gainAction  = useActionButton(characterId);
  const spendAction = useActionButton(characterId);
  const errorId = React.useId();

  // Merge errors from both actions
  const combinedError = gainAction.inlineError ?? spendAction.inlineError;
  const isPending     = gainAction.isPending || spendAction.isPending;

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-semibold uppercase tracking-wider text-parchment-400">
        Hope
      </span>

      {/* +/- controls */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => spendAction.fire("spend-hope", { n: 1 })}
          disabled={isPending}
          aria-label="Spend 1 Hope"
          className="
            h-9 w-9 rounded border border-burgundy-800 bg-slate-900
            text-sm text-parchment-500 hover:bg-burgundy-900/30 hover:text-parchment-200
            disabled:opacity-50 disabled:cursor-wait
            transition-colors flex items-center justify-center
            focus:outline-none focus:ring-2 focus:ring-gold-500
          "
        >
          −
        </button>

        {/* Hope pips (read-only visual; mutations are handled by +/-) */}
        <div
          className="flex flex-wrap gap-2"
          role="meter"
          aria-valuenow={hope}
          aria-valuemin={0}
          aria-valuemax={hopeMax}
          aria-label={`Hope: ${hope} of ${hopeMax}`}
        >
          {Array.from({ length: hopeMax }, (_, i) => {
            const filled = i < hope;
            return (
              <span
                key={i}
                aria-hidden="true"
                className={`
                  h-8 w-8 rounded-full border-2 text-xs font-bold
                  flex items-center justify-center select-none
                  transition-all duration-150
                  ${
                    filled
                      ? "bg-gold-500 border-gold-400 text-slate-900 shadow-glow-gold"
                      : "border-gold-800 bg-transparent text-gold-700"
                  }
                `}
              >
                {i + 1}
              </span>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => gainAction.fire("gain-hope", { n: 1 })}
          disabled={isPending}
          aria-label="Gain 1 Hope"
          className="
            h-9 w-9 rounded border border-gold-800 bg-slate-900
            text-sm text-gold-600 hover:bg-gold-900/20 hover:text-gold-300
            disabled:opacity-50 disabled:cursor-wait
            transition-colors flex items-center justify-center
            focus:outline-none focus:ring-2 focus:ring-gold-500
          "
        >
          +
        </button>
      </div>

      <InlineActionError
        message={combinedError}
        id={errorId}
      />
    </div>
  );
}

// ─── BonusDisplay ─────────────────────────────────────────────────────────────

function BonusDisplay({ bonus }: { bonus: number }) {
  const label = bonus >= 0 ? `+${bonus}` : `${bonus}`;
  const color =
    bonus > 0
      ? "text-emerald-400"
      : bonus < 0
      ? "text-red-400"
      : "text-parchment-500";
  return (
    <span className={`font-bold text-sm tabular-nums min-w-[2.5rem] text-center ${color}`}>
      {label}
    </span>
  );
}

// ─── IncrementControls ────────────────────────────────────────────────────────

interface IncrementControlsProps {
  value:    number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  ariaLabel?: string;
}

function IncrementControls({ value, onChange, min, max, ariaLabel }: IncrementControlsProps) {
  const canDec = min === undefined || value > min;
  const canInc = max === undefined || value < max;
  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={() => onChange(value - 1)}
        disabled={!canDec}
        aria-label={ariaLabel ? `Decrease ${ariaLabel}` : "Decrease"}
        className="
          h-9 w-9 rounded border border-burgundy-800 bg-slate-900
          text-xs text-parchment-500 hover:bg-burgundy-900/30 hover:text-parchment-200
          disabled:opacity-25 disabled:cursor-not-allowed
          transition-colors flex items-center justify-center leading-none select-none
          focus:outline-none focus:ring-2 focus:ring-gold-500
        "
      >
        −
      </button>
      <BonusDisplay bonus={value} />
      <button
        type="button"
        onClick={() => onChange(value + 1)}
        disabled={!canInc}
        aria-label={ariaLabel ? `Increase ${ariaLabel}` : "Increase"}
        className="
          h-9 w-9 rounded border border-burgundy-800 bg-slate-900
          text-xs text-parchment-500 hover:bg-gold-900/20 hover:text-gold-300
          disabled:opacity-25 disabled:cursor-not-allowed
          transition-colors flex items-center justify-center leading-none select-none
          focus:outline-none focus:ring-2 focus:ring-gold-500
        "
      >
        +
      </button>
    </div>
  );
}

// ─── ExperiencesList ──────────────────────────────────────────────────────────

function ExperiencesList() {
  const { activeCharacter, updateField } = useCharacterStore();
  const [newName,  setNewName]  = useState("");
  const [newBonus, setNewBonus] = useState(2);

  if (!activeCharacter) return null;

  const { experiences } = activeCharacter;

  const addExperience = () => {
    if (!newName.trim()) return;
    updateField("experiences", [
      ...experiences,
      { name: newName.trim(), bonus: newBonus },
    ]);
    setNewName("");
    setNewBonus(2);
  };

  const removeExperience = (index: number) => {
    updateField(
      "experiences",
      experiences.filter((_, i) => i !== index)
    );
  };

  const updateExpName = (index: number, value: string) => {
    updateField(
      "experiences",
      experiences.map((exp, i) => (i === index ? { ...exp, name: value } : exp))
    );
  };

  const updateExpBonus = (index: number, value: number) => {
    updateField(
      "experiences",
      experiences.map((exp, i) => (i === index ? { ...exp, bonus: value } : exp))
    );
  };

  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs font-semibold uppercase tracking-wider text-parchment-400">
        Experiences
      </span>

      {experiences.length === 0 && (
        <p className="text-xs text-parchment-600 italic">No experiences yet.</p>
      )}

      {experiences.map((exp, i) => (
        <div
          key={i}
          className="flex items-center gap-2 rounded-lg border border-burgundy-900/40 bg-slate-900/50 px-3 py-2"
        >
          <input
            type="text"
            value={exp.name}
            onChange={(e) => updateExpName(i, e.target.value)}
            placeholder="Experience name"
            aria-label={`Experience ${i + 1} name`}
            className="
              flex-1 rounded bg-transparent px-1 py-0 text-sm text-parchment-200
              border-b border-transparent focus:border-gold-600 focus:outline-none
              placeholder-parchment-700 transition-colors
            "
          />
          <IncrementControls
            value={exp.bonus}
            onChange={(v) => updateExpBonus(i, v)}
            ariaLabel={`experience ${exp.name || i + 1} bonus`}
          />
          <button
            type="button"
            onClick={() => removeExperience(i)}
            aria-label={`Remove experience: ${exp.name || `#${i + 1}`}`}
            className="ml-1 h-9 w-9 flex items-center justify-center rounded text-burgundy-500 hover:text-burgundy-300 hover:bg-burgundy-900/30 transition-colors text-xs leading-none focus:outline-none focus:ring-2 focus:ring-burgundy-500"
          >
            ✕
          </button>
        </div>
      ))}

      {/* Add new experience row */}
      <div className="mt-1 flex items-center gap-2">
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addExperience()}
          placeholder="New experience…"
          aria-label="New experience name"
          className="
            flex-1 rounded bg-slate-900 px-2 py-1.5 text-sm text-parchment-300
            border border-dashed border-burgundy-800 focus:outline-none
            focus:ring-2 focus:ring-gold-500 focus:border-gold-600 placeholder-parchment-700 transition-colors
          "
        />
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setNewBonus((b) => Math.max(2, b - 1))}
            disabled={newBonus <= 2}
            aria-label="Decrease new experience starting bonus"
            className="
              h-9 w-9 rounded border border-burgundy-800 bg-slate-900
              text-xs text-parchment-600 hover:bg-burgundy-900/30
              disabled:opacity-25 disabled:cursor-not-allowed
              transition-colors flex items-center justify-center leading-none
              focus:outline-none focus:ring-2 focus:ring-gold-500
            "
          >
            −
          </button>
          <BonusDisplay bonus={newBonus} />
          <button
            type="button"
            onClick={() => setNewBonus((b) => b + 1)}
            aria-label="Increase new experience starting bonus"
            className="
              h-9 w-9 rounded border border-burgundy-800 bg-slate-900
              text-xs text-parchment-600 hover:bg-gold-900/20
              transition-colors flex items-center justify-center leading-none
              focus:outline-none focus:ring-2 focus:ring-gold-500
            "
          >
            +
          </button>
        </div>
        <button
          type="button"
          onClick={addExperience}
          disabled={!newName.trim()}
          aria-label="Add experience"
          className="
            rounded px-2.5 py-2 text-xs font-semibold
            bg-burgundy-800 text-parchment-200 hover:bg-burgundy-700
            disabled:opacity-40 disabled:cursor-not-allowed
            transition-colors focus:outline-none focus:ring-2 focus:ring-gold-500
          "
        >
          Add
        </button>
      </div>
    </div>
  );
}

// ─── TraitsSection ────────────────────────────────────────────────────────────

function TraitsSection() {
  const { activeCharacter, updateField } = useCharacterStore();

  if (!activeCharacter) return null;

  const ancestryId  = activeCharacter.ancestryId  ?? undefined;
  const communityId = activeCharacter.communityId ?? undefined;

  const { data: ancestryData  } = useAncestry(ancestryId);
  const { data: communityData } = useCommunity(communityId);

  if (!ancestryId && !communityId) return null;

  const getTraitBonus = (key: string): number => {
    const traitBonuses = activeCharacter.traitBonuses ?? {};
    if (key in traitBonuses) return traitBonuses[key];
    const featureKey = key === "ancestry" ? "trait_ancestry" : "trait_community";
    return activeCharacter.classFeatureState?.[featureKey]?.tokens ?? 0;
  };

  const setTraitBonus = (key: string, value: number) => {
    const traitBonuses = { ...(activeCharacter.traitBonuses ?? {}) };
    traitBonuses[key] = value;
    updateField("traitBonuses", traitBonuses);
  };

  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs font-semibold uppercase tracking-wider text-parchment-400">
        Traits
      </span>
      <p className="text-[11px] text-parchment-600 italic -mt-1">
        Ancestry and community traits — increment as you level up.
      </p>

      {ancestryData && (
        <div className="flex items-center gap-2 rounded-lg border border-burgundy-900/40 bg-slate-900/50 px-3 py-2">
          <div className="flex-1 min-w-0">
            <span className="text-[10px] uppercase tracking-wider text-parchment-600 block">
              Ancestry — {ancestryData.name}
            </span>
            <span className="text-sm font-semibold text-parchment-200">
              {ancestryData.traitName}
            </span>
          </div>
          <IncrementControls
            value={getTraitBonus("ancestry")}
            onChange={(v) => setTraitBonus("ancestry", v)}
            ariaLabel="ancestry trait bonus"
          />
        </div>
      )}

      {ancestryData?.secondTraitName && (
        <div className="flex items-center gap-2 rounded-lg border border-burgundy-900/40 bg-slate-900/50 px-3 py-2">
          <div className="flex-1 min-w-0">
            <span className="text-[10px] uppercase tracking-wider text-parchment-600 block">
              Ancestry (2nd) — {ancestryData.name}
            </span>
            <span className="text-sm font-semibold text-parchment-200">
              {ancestryData.secondTraitName}
            </span>
          </div>
          <IncrementControls
            value={getTraitBonus("ancestry2")}
            onChange={(v) => setTraitBonus("ancestry2", v)}
            ariaLabel="second ancestry trait bonus"
          />
        </div>
      )}

      {communityData && (
        <div className="flex items-center gap-2 rounded-lg border border-burgundy-900/40 bg-slate-900/50 px-3 py-2">
          <div className="flex-1 min-w-0">
            <span className="text-[10px] uppercase tracking-wider text-parchment-600 block">
              Community — {communityData.name}
            </span>
            <span className="text-sm font-semibold text-parchment-200">
              {communityData.traitName}
            </span>
          </div>
          <IncrementControls
            value={getTraitBonus("community")}
            onChange={(v) => setTraitBonus("community", v)}
            ariaLabel="community trait bonus"
          />
        </div>
      )}
    </div>
  );
}

// ─── TrackersPanel ────────────────────────────────────────────────────────────

export function TrackersPanel() {
  const { activeCharacter, updateTracker, updateField } = useCharacterStore();
  const characterId = useCharacterId();

  if (!activeCharacter) return null;

  const { trackers, damageThresholds } = activeCharacter;

  return (
    <section
      className="rounded-xl border border-burgundy-900 bg-slate-900/80 p-5 shadow-card space-y-6"
      aria-label="Character Trackers"
    >
      <h2 className="font-serif text-sm font-semibold uppercase tracking-widest text-gold-600">
        Trackers
      </h2>

      {/* Damage Thresholds */}
      <div>
        <h3 className="mb-3 text-xs font-medium uppercase tracking-wider text-parchment-500">
          Damage Thresholds
        </h3>
        <p className="mb-2 text-[11px] text-parchment-600 italic">
          Formula: armor base threshold + character level (SRD p. 20).
        </p>
        <div className="flex gap-5">
          <ThresholdInput
            label="Major"
            value={damageThresholds.major}
            onChange={(v) => updateField("damageThresholds.major", v)}
          />
          <ThresholdInput
            label="Severe"
            value={damageThresholds.severe}
            onChange={(v) => updateField("damageThresholds.severe", v)}
          />
        </div>
      </div>

      {/* Slot trackers — each slot click calls the actions endpoint */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <ActionableSlotTracker
          label="Hit Points"
          marked={trackers.hp.marked}
          max={trackers.hp.max}
          markActionId="mark-hp"
          clearActionId="clear-hp"
          characterId={characterId}
          onMaxChange={(v) => updateTracker("hp", "max", v)}
          colorFilled="bg-burgundy-600"
          hardMax={12}
        />
        <ActionableSlotTracker
          label="Stress"
          marked={trackers.stress.marked}
          max={trackers.stress.max}
          markActionId="mark-stress"
          clearActionId="clear-stress"
          characterId={characterId}
          onMaxChange={(v) => updateTracker("stress", "max", v)}
          colorFilled="bg-gold-600"
          hardMax={12}
        />
        <ActionableSlotTracker
          label="Armor"
          marked={trackers.armor.marked}
          max={trackers.armor.max}
          markActionId="mark-armor"
          clearActionId="clear-armor"
          characterId={characterId}
          onMaxChange={(v) => updateTracker("armor", "max", v)}
          colorFilled="bg-parchment-500"
        />

        {/* Proficiency — scalar integer, not a slot resource */}
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold uppercase tracking-wider text-parchment-400">
            Proficiency
          </span>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                const v = Math.max(1, (activeCharacter.proficiency ?? 1) - 1);
                updateField("proficiency", v);
              }}
              disabled={(activeCharacter.proficiency ?? 1) <= 1}
              aria-label="Decrease proficiency"
              className="h-9 w-9 rounded border border-burgundy-800 bg-slate-900 text-xs text-parchment-500 hover:bg-burgundy-900/30 disabled:opacity-25 disabled:cursor-not-allowed transition-colors flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-gold-500"
            >
              −
            </button>
            <span
              className="text-2xl font-bold text-parchment-100 w-8 text-center tabular-nums"
              aria-label={`Proficiency: ${activeCharacter.proficiency ?? 1}`}
            >
              {activeCharacter.proficiency ?? 1}
            </span>
            <button
              type="button"
              onClick={() => {
                const v = Math.min(4, (activeCharacter.proficiency ?? 1) + 1);
                updateField("proficiency", v);
              }}
              disabled={(activeCharacter.proficiency ?? 1) >= 4}
              aria-label="Increase proficiency"
              className="h-9 w-9 rounded border border-burgundy-800 bg-slate-900 text-xs text-parchment-500 hover:bg-gold-900/20 hover:text-gold-300 disabled:opacity-25 disabled:cursor-not-allowed transition-colors flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-gold-500"
            >
              +
            </button>
          </div>
          <p className="text-[10px] text-parchment-600 italic">
            Starts at 1; increases at tiers 2, 3, 4.
          </p>
        </div>
      </div>

      {/* Weapons */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <WeaponCard slot="primary" />
        <WeaponCard slot="secondary" />
      </div>

      {/* Hope — server-authoritative +/- */}
      <ActionableHopeTracker characterId={characterId} />

      {/* Traits (ancestry + community) */}
      <TraitsSection />

      {/* Experiences */}
      <ExperiencesList />
    </section>
  );
}
