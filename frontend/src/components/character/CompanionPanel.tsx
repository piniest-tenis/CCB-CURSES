"use client";

/**
 * src/components/character/CompanionPanel.tsx
 *
 * Collapsible companion panel for characters with companionState !== null.
 * Supports Wraithcaller / Herder subclasses.
 *
 * - Companion name (editable inline, debounced PATCH via updateField)
 * - Evasion score (read-only; updated via levelup choices)
 * - Stress slot tracker → calls companion-mark-stress / companion-clear-stress
 * - Experiences (two items, editable via updateField)
 * - Attack description, damage die, damage type, range
 * - Levelup choices (chip list, read-only)
 */

import React, { useState } from "react";
import type { CompanionState, Experience } from "@shared/types";
import { useCharacterStore } from "@/store/characterStore";
import { useActionButton, InlineActionError } from "./ActionButton";
import { DiceRollButton } from "@/components/dice/DiceRollButton";
import type { RollRequest, DieSize } from "@/types/dice";

// ─── Companion damage roll builder ────────────────────────────────────────────

function buildCompanionRollRequest(
  damagedie: string,
  proficiency: number,
  companionName: string,
): RollRequest | null {
  const match = damagedie.trim().match(/^d(\d+)$/i);
  if (!match) return null;
  const size = parseInt(match[1], 10);
  const validSizes = [4, 6, 8, 10, 12, 20];
  if (!validSizes.includes(size)) return null;
  const dieSize = `d${size}` as DieSize;
  return {
    label:       `${companionName || "Companion"} Attack`,
    type:        "damage",
    proficiency,
    dice: Array.from({ length: proficiency }, () => ({
      size:  dieSize,
      role:  "damage" as const,
      label: "Companion",
    })),
  };
}

// ─── CompanionSlotTracker ─────────────────────────────────────────────────────

interface CompanionSlotTrackerProps {
  label:         string;
  marked:        number;
  max:           number;
  characterId:   string;
  markActionId:  string;
  clearActionId: string;
}

function CompanionSlotTracker({
  label,
  marked,
  max,
  characterId,
  markActionId,
  clearActionId,
}: CompanionSlotTrackerProps) {
  const { fire, isPending, inlineError } = useActionButton(characterId);
  const errorId = React.useId();

  const handleToggle = async (index: number) => {
    const isFilled = index < marked;
    if (isFilled) {
      await fire(clearActionId, { n: marked - index });
    } else {
      await fire(markActionId, { n: index + 1 - marked });
    }
  };

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-parchment-400">
          {label}
        </span>
        <span className="text-xs text-parchment-500" aria-label={`${label} ${marked} of ${max}`}>
          {marked}/{max}
        </span>
      </div>

      <div
        className="flex flex-wrap gap-1.5"
        role="group"
        aria-label={`Companion ${label} slots`}
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
              aria-label={`Companion ${label} slot ${i + 1} — ${filled ? "marked" : "empty"}`}
              aria-pressed={filled}
              className={`
                h-7 w-7 rounded-full border-2 transition-all duration-150
                focus:outline-none focus:ring-2 focus:ring-gold-500 focus:ring-offset-1 focus:ring-offset-slate-900
                disabled:opacity-60 disabled:cursor-wait
                ${
                  filled
                    ? "bg-gold-600 border-transparent shadow-sm"
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

// ─── CompanionPanel ───────────────────────────────────────────────────────────

export function CompanionPanel({ onRollQueued }: { onRollQueued?: () => void }) {
  const { activeCharacter, updateField } = useCharacterStore();
  const [isExpanded, setIsExpanded] = useState(true);

  if (!activeCharacter?.companionState) return null;

  const { companionState, characterId } = activeCharacter;
  const proficiency: number = activeCharacter.proficiency ?? 1;
  const panelId = "companion-panel-content";

  const updateCompanion = (key: keyof CompanionState, value: unknown) => {
    updateField(`companionState.${key}`, value);
  };

  const updateExperience = (index: number, field: keyof Experience, value: unknown) => {
    const exps = [...(companionState.experiences ?? [])];
    exps[index] = { ...exps[index], [field]: value };
    updateCompanion("experiences", exps);
  };

  return (
    <section
      className="rounded-xl border border-[#577399]/40 bg-slate-900/80 p-5 shadow-card"
      aria-label="Companion"
      data-field-key="companion"
    >
      {/* Header */}
      <button
        type="button"
        onClick={() => setIsExpanded((v) => !v)}
        aria-expanded={isExpanded}
        aria-controls={panelId}
        className="
          flex w-full items-center justify-between
          focus:outline-none focus:ring-2 focus:ring-gold-500 rounded
        "
      >
        <h2 className="font-serif-sc text-sm font-semibold tracking-widest text-[#577399]">
          Companion
        </h2>
        <span
          aria-hidden="true"
          className={`text-parchment-500 text-xs transition-transform duration-150 ${
            isExpanded ? "rotate-180" : ""
          }`}
        >
          ▼
        </span>
      </button>

      {isExpanded && (
        <div id={panelId} className="mt-4 space-y-4">
          {/* Name + Evasion row */}
          <div className="flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <label
                htmlFor="companion-name"
                className="text-xs uppercase tracking-widest text-parchment-600 block mb-0.5"
              >
                Name
              </label>
              <input
                id="companion-name"
                type="text"
                value={companionState.name}
                onChange={(e) => updateCompanion("name", e.target.value)}
                placeholder="Companion name…"
                aria-label="Companion name"
                className="
                  w-full rounded bg-slate-850 px-2 py-1.5 text-sm font-semibold text-parchment-100
                  border border-burgundy-800 focus:outline-none focus:ring-2 focus:ring-gold-500
                  placeholder-parchment-700 transition-colors
                "
              />
            </div>
            <div className="shrink-0 flex flex-col items-center gap-0.5">
              <span className="text-xs uppercase tracking-widest text-parchment-600">
                Evasion
              </span>
              <span
                className="text-2xl font-bold text-parchment-100 tabular-nums"
                aria-label={`Companion evasion: ${companionState.evasion}`}
              >
                {companionState.evasion}
              </span>
            </div>
          </div>

          {/* Stress tracker */}
          <CompanionSlotTracker
            label="Stress"
            marked={companionState.stress.marked}
            max={companionState.stress.max}
            characterId={characterId}
            markActionId="companion-mark-stress"
            clearActionId="companion-clear-stress"
          />

          {/* Experiences */}
          <div className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-parchment-400">
              Experiences
            </span>
            {(companionState.experiences ?? []).slice(0, 2).map((exp, i) => (
              <div
                key={i}
                className="flex items-center gap-2 rounded-lg border border-burgundy-900/40 bg-slate-900/50 px-3 py-2"
              >
                <input
                  type="text"
                  value={exp.name}
                  onChange={(e) => updateExperience(i, "name", e.target.value)}
                  placeholder={`Experience ${i + 1}`}
                  aria-label={`Companion experience ${i + 1} name`}
                  className="
                    flex-1 rounded bg-transparent px-1 text-sm text-parchment-200
                    border-b border-transparent focus:border-gold-600 focus:outline-none
                    placeholder-parchment-700 transition-colors
                  "
                />
                <input
                  type="number"
                  value={exp.bonus}
                  onChange={(e) => {
                    const v = parseInt(e.target.value, 10);
                    if (!isNaN(v)) updateExperience(i, "bonus", v);
                  }}
                  aria-label={`Companion experience ${i + 1} bonus`}
                  className="
                    w-12 rounded bg-slate-900 px-1.5 py-0.5 text-sm font-bold text-center
                    text-parchment-200 border border-burgundy-800
                    focus:outline-none focus:ring-1 focus:ring-gold-500 transition-colors
                    [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none
                  "
                />
              </div>
            ))}
          </div>

          {/* Attack info */}
          <div className="grid grid-cols-2 gap-2">
            <div className="col-span-2">
              <label className="text-xs uppercase tracking-widest text-parchment-600 block mb-0.5">
                Attack
              </label>
              <input
                type="text"
                value={companionState.attackDescription}
                onChange={(e) => updateCompanion("attackDescription", e.target.value)}
                placeholder="Attack description…"
                aria-label="Companion attack description"
                className="
                  w-full rounded bg-slate-850 px-2 py-1.5 text-xs text-parchment-300
                  border border-burgundy-800 focus:outline-none focus:ring-2 focus:ring-gold-500
                  placeholder-parchment-700 transition-colors
                "
              />
            </div>

            <div>
              <label className="text-xs uppercase tracking-widest text-parchment-600 block mb-0.5">
                Damage Die
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={companionState.damagedie}
                  onChange={(e) => updateCompanion("damagedie", e.target.value)}
                  placeholder="e.g. d6"
                  aria-label="Companion damage die"
                  className="
                    flex-1 rounded bg-slate-850 px-2 py-1.5 text-xs text-parchment-300
                    border border-burgundy-800 focus:outline-none focus:ring-2 focus:ring-gold-500
                    placeholder-parchment-700 transition-colors
                  "
                />
                {(() => {
                  const req = buildCompanionRollRequest(
                    companionState.damagedie,
                    proficiency,
                    companionState.name,
                  );
                  return req ? <DiceRollButton rollRequest={req} variant="icon" onRollQueued={onRollQueued} /> : null;
                })()}
              </div>
            </div>

            <div>
              <label className="text-xs uppercase tracking-widest text-parchment-600 block mb-0.5">
                Damage Type
              </label>
              <select
                value={companionState.damageType}
                onChange={(e) =>
                  updateCompanion("damageType", e.target.value as "physical" | "magic")
                }
                aria-label="Companion damage type"
                className="
                  w-full rounded bg-slate-850 px-2 py-1.5 text-xs text-parchment-300
                  border border-burgundy-800 focus:outline-none focus:ring-2 focus:ring-gold-500
                  transition-colors
                "
              >
                <option value="physical">Physical</option>
                <option value="magic">Magic</option>
              </select>
            </div>

            <div className="col-span-2">
              <label className="text-xs uppercase tracking-widest text-parchment-600 block mb-0.5">
                Range
              </label>
              <input
                type="text"
                value={companionState.range}
                onChange={(e) => updateCompanion("range", e.target.value)}
                placeholder="e.g. Melee, Far"
                aria-label="Companion range"
                className="
                  w-full rounded bg-slate-850 px-2 py-1.5 text-xs text-parchment-300
                  border border-burgundy-800 focus:outline-none focus:ring-2 focus:ring-gold-500
                  placeholder-parchment-700 transition-colors
                "
              />
            </div>
          </div>

          {/* Levelup choices */}
          {companionState.levelupChoices.length > 0 && (
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-parchment-400 block mb-1.5">
                Levelup Choices
              </span>
              <div className="flex flex-wrap gap-1.5" role="list" aria-label="Companion levelup choices">
                {companionState.levelupChoices.map((choice, i) => (
                  <span
                    key={i}
                    role="listitem"
                    className="
                      rounded-full border border-[#577399]/50 bg-[#577399]/10
                      px-2.5 py-0.5 text-xs text-[#577399]
                    "
                  >
                    {choice}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
