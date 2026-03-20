"use client";

/**
 * src/components/character/TrackersPanel.tsx
 *
 * Renders:
 * - Damage threshold inputs (Minor / Major / Severe)
 * - Slot trackers (HP, Stress, Armor, Proficiency) — clickable circles
 * - Primary + secondary weapon cards (full field set)
 * - Hope tracker (6 fill-from-left dots)
 * - Experiences list (add / edit / remove)
 */

import React, { useState } from "react";
import type { CharacterTrackers, WeaponBurden, WeaponDamageType } from "@shared/types";
import { useCharacterStore } from "@/store/characterStore";

// ─── SlotTracker ──────────────────────────────────────────────────────────────

interface SlotTrackerProps {
  label:        string;
  marked:       number;
  max:          number;
  /** Called with the slot index that was clicked. */
  onToggle:     (index: number) => void;
  onMaxChange:  (value: number) => void;
  colorFilled?: string;
}

function SlotTracker({
  label,
  marked,
  max,
  onToggle,
  onMaxChange,
  colorFilled = "bg-burgundy-600",
}: SlotTrackerProps) {
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
            max={20}
            value={max}
            onChange={(e) => {
              const v = parseInt(e.target.value, 10);
              if (!isNaN(v) && v > 0) onMaxChange(v);
            }}
            aria-label={`${label} max slots`}
            className="
              w-8 bg-transparent text-center text-parchment-300
              border-b border-burgundy-800 focus:outline-none focus:border-gold-500
              [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none
              transition-colors
            "
          />
        </div>
      </div>

      {/* Slot circles */}
      <div className="flex flex-wrap gap-1.5" role="group" aria-label={`${label} slots`}>
        {Array.from({ length: max }, (_, i) => {
          const filled = i < marked;
          return (
            <button
              key={i}
              type="button"
              onClick={() => onToggle(i)}
              aria-label={`${label} slot ${i + 1} — ${filled ? "marked" : "empty"}`}
              aria-pressed={filled}
              className={`
                h-6 w-6 rounded-full border-2 transition-all duration-150
                focus:outline-none focus:ring-1 focus:ring-gold-500
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
  return (
    <div className="flex flex-col items-center gap-1">
      <input
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
          focus:outline-none focus:border-gold-500 transition-colors
          [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none
          [&::-webkit-outer-spin-button]:appearance-none
        "
      />
      <span className="text-[10px] uppercase tracking-widest text-parchment-500">
        {label}
      </span>
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
          border border-burgundy-800 focus:outline-none focus:border-gold-500
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
            border border-burgundy-800 focus:outline-none focus:border-gold-500
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
            border border-burgundy-800 focus:outline-none focus:border-gold-500
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
            border border-burgundy-800 focus:outline-none focus:border-gold-500
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
            border border-burgundy-800 focus:outline-none focus:border-gold-500
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
            border border-burgundy-800 focus:outline-none focus:border-gold-500
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
      </div>
    </div>
  );
}

// ─── HopeTracker ──────────────────────────────────────────────────────────────

function HopeTracker() {
  const { activeCharacter, updateHope } = useCharacterStore();
  if (!activeCharacter) return null;

  const { hope } = activeCharacter;

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-semibold uppercase tracking-wider text-parchment-400">
        Hope
      </span>
      <div className="flex gap-2" role="group" aria-label="Hope tracker">
        {Array.from({ length: 6 }, (_, i) => {
          const filled = i < hope;
          return (
            <button
              key={i}
              type="button"
              // Clicking a filled dot resets to i (clear to that dot)
              // Clicking an empty dot fills to i+1
              onClick={() => updateHope(filled ? i : i + 1)}
              aria-label={`Hope ${i + 1} — ${filled ? "filled" : "empty"}`}
              aria-pressed={filled}
              className={`
                h-8 w-8 rounded-full border-2 transition-all duration-150 text-xs font-bold
                focus:outline-none focus:ring-1 focus:ring-gold-500
                ${
                  filled
                    ? "bg-gold-500 border-gold-400 text-slate-900 shadow-glow-gold"
                    : "border-gold-800 bg-transparent text-gold-700 hover:border-gold-500 hover:text-gold-400"
                }
              `}
            >
              {i + 1}
            </button>
          );
        })}
      </div>
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

  const updateExpField = (
    index: number,
    field: "name" | "bonus",
    value: string | number
  ) => {
    updateField(
      "experiences",
      experiences.map((exp, i) => (i === index ? { ...exp, [field]: value } : exp))
    );
  };

  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs font-semibold uppercase tracking-wider text-parchment-400">
        Experiences
      </span>

      {experiences.map((exp, i) => (
        <div key={i} className="flex items-center gap-2">
          <input
            type="text"
            value={exp.name}
            onChange={(e) => updateExpField(i, "name", e.target.value)}
            placeholder="Experience name"
            aria-label={`Experience ${i + 1} name`}
            className="
              flex-1 rounded bg-slate-900 px-2 py-1 text-sm text-parchment-200
              border border-burgundy-800 focus:outline-none focus:border-gold-500
              placeholder-parchment-700 transition-colors
            "
          />
          <input
            type="number"
            value={exp.bonus}
            onChange={(e) =>
              updateExpField(i, "bonus", parseInt(e.target.value, 10) || 0)
            }
            aria-label={`Experience ${i + 1} bonus`}
            className="
              w-14 rounded bg-slate-900 px-2 py-1 text-sm text-center text-parchment-200
              border border-burgundy-800 focus:outline-none focus:border-gold-500
              [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none
              transition-colors
            "
          />
          <button
            type="button"
            onClick={() => removeExperience(i)}
            aria-label={`Remove experience: ${exp.name}`}
            className="px-1 text-burgundy-400 hover:text-burgundy-200 transition-colors text-sm leading-none"
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
            flex-1 rounded bg-slate-900 px-2 py-1 text-sm text-parchment-300
            border border-dashed border-burgundy-800 focus:outline-none
            focus:border-gold-600 placeholder-parchment-700 transition-colors
          "
        />
        <input
          type="number"
          value={newBonus}
          onChange={(e) => setNewBonus(parseInt(e.target.value, 10) || 0)}
          aria-label="New experience bonus"
          className="
            w-14 rounded bg-slate-900 px-2 py-1 text-sm text-center text-parchment-300
            border border-dashed border-burgundy-800 focus:outline-none
            [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none
            transition-colors
          "
        />
        <button
          type="button"
          onClick={addExperience}
          disabled={!newName.trim()}
          className="
            rounded px-2 py-1 text-xs font-semibold
            bg-burgundy-800 text-parchment-200 hover:bg-burgundy-700
            disabled:opacity-40 disabled:cursor-not-allowed
            transition-colors
          "
        >
          Add
        </button>
      </div>
    </div>
  );
}

// ─── TrackersPanel ────────────────────────────────────────────────────────────

export function TrackersPanel() {
  const { activeCharacter, updateTracker, updateField } = useCharacterStore();

  if (!activeCharacter) return null;

  const { trackers, damageThresholds } = activeCharacter;

  const handleTrackerToggle = (key: keyof CharacterTrackers, index: number) => {
    const current = trackers[key].marked;
    // Clicking a filled slot → unmark down to that index
    // Clicking an empty slot → mark up to index + 1
    const next = index < current ? index : index + 1;
    updateTracker(key, "marked", Math.min(next, trackers[key].max));
  };

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
        <div className="flex gap-5">
          <ThresholdInput
            label="Minor"
            value={damageThresholds.minor}
            onChange={(v) => updateField("damageThresholds.minor", v)}
          />
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

      {/* Slot trackers */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <SlotTracker
          label="Hit Points"
          marked={trackers.hp.marked}
          max={trackers.hp.max}
          onToggle={(i) => handleTrackerToggle("hp", i)}
          onMaxChange={(v) => updateTracker("hp", "max", v)}
          colorFilled="bg-burgundy-600"
        />
        <SlotTracker
          label="Stress"
          marked={trackers.stress.marked}
          max={trackers.stress.max}
          onToggle={(i) => handleTrackerToggle("stress", i)}
          onMaxChange={(v) => updateTracker("stress", "max", v)}
          colorFilled="bg-gold-600"
        />
        <SlotTracker
          label="Armor"
          marked={trackers.armor.marked}
          max={trackers.armor.max}
          onToggle={(i) => handleTrackerToggle("armor", i)}
          onMaxChange={(v) => updateTracker("armor", "max", v)}
          colorFilled="bg-parchment-500"
        />
        <SlotTracker
          label="Proficiency"
          marked={trackers.proficiency.marked}
          max={trackers.proficiency.max}
          onToggle={(i) => handleTrackerToggle("proficiency", i)}
          onMaxChange={(v) => updateTracker("proficiency", "max", v)}
          colorFilled="bg-burgundy-400"
        />
      </div>

      {/* Weapons */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <WeaponCard slot="primary" />
        <WeaponCard slot="secondary" />
      </div>

      {/* Hope */}
      <HopeTracker />

      {/* Experiences */}
      <ExperiencesList />
    </section>
  );
}
