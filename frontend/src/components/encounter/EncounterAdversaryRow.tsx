"use client";

/**
 * src/components/encounter/EncounterAdversaryRow.tsx
 *
 * The most data-dense component in the encounter console.
 * Shows an adversary instance with live HP/Stress slot trackers,
 * damage thresholds, action buttons, and inline roll results.
 */

import React, { useState, useEffect, useCallback, useRef } from "react";
import type { EncounterAdversary, AdversaryRollResult } from "@/types/adversary";
import { TierBadge } from "@/components/adversary/TierBadge";

interface EncounterAdversaryRowProps {
  instance: EncounterAdversary;
  /** Tier from the original adversary template (not stored on instance). */
  tier?: number;
  /** Type from the original adversary template. */
  adversaryType?: string;
  onUpdate: (
    instanceId: string,
    updates: Partial<Pick<EncounterAdversary, "hpMarked" | "stressMarked" | "conditions" | "notes" | "isDefeated">>
  ) => void;
  onRollAttack: (instance: EncounterAdversary) => AdversaryRollResult;
  onRollDamage: (instance: EncounterAdversary) => AdversaryRollResult;
  onDefeat: (instanceId: string) => void;
}

/** Auto-dismiss delay for inline roll results (ms). */
const ROLL_DISMISS_MS = 8000;

export function EncounterAdversaryRow({
  instance,
  tier,
  adversaryType,
  onUpdate,
  onRollAttack,
  onRollDamage,
  onDefeat,
}: EncounterAdversaryRowProps) {
  const [lastRoll, setLastRoll] = useState<AdversaryRollResult | null>(null);
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-dismiss roll result
  useEffect(() => {
    if (!lastRoll) return;
    dismissTimerRef.current = setTimeout(() => setLastRoll(null), ROLL_DISMISS_MS);
    return () => {
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    };
  }, [lastRoll]);

  const handleRollAttack = useCallback(() => {
    const result = onRollAttack(instance);
    setLastRoll(result);
  }, [instance, onRollAttack]);

  const handleRollDamage = useCallback(() => {
    const result = onRollDamage(instance);
    setLastRoll(result);
  }, [instance, onRollDamage]);

  const handleToggleHp = useCallback(
    (slotIndex: number) => {
      // If clicking an already-marked slot, clear it and all after it.
      // If clicking an unmarked slot, mark it and all before it.
      const newMarked = slotIndex < instance.hpMarked ? slotIndex : slotIndex + 1;
      onUpdate(instance.instanceId, { hpMarked: newMarked });
    },
    [instance.instanceId, instance.hpMarked, onUpdate]
  );

  const handleToggleStress = useCallback(
    (slotIndex: number) => {
      const newMarked = slotIndex < instance.stressMarked ? slotIndex : slotIndex + 1;
      onUpdate(instance.instanceId, { stressMarked: newMarked });
    },
    [instance.instanceId, instance.stressMarked, onUpdate]
  );

  // Check for natural 20 (critical) on attack rolls
  const isCrit = lastRoll?.isCritical ?? false;

  return (
    <div
      className={`
        rounded-xl border bg-slate-900/80 shadow-card
        transition-all duration-200 overflow-hidden
        ${
          instance.isDefeated
            ? "border-slate-800/40 opacity-50"
            : "border-burgundy-900/40 hover:border-[#577399]/40"
        }
      `}
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Status icon */}
          <span className="text-lg shrink-0 mt-0.5" aria-hidden="true">
            {instance.isDefeated ? "☠" : "💀"}
          </span>

          {/* Identity + trackers */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-serif text-sm font-semibold text-[#f7f7ff]">
                {instance.name}
                {instance.label && (
                  <span className="ml-1 text-[#DAA520]">{instance.label}</span>
                )}
              </h3>
              <span className="text-[10px] text-[#b9baa3]/50">
                {tier != null && `T${tier} · `}
                {adversaryType && `${adversaryType} · `}
                Diff {instance.difficulty}
              </span>
            </div>

            {/* HP Bar — slot tracker */}
            <div className="mt-2 space-y-1.5">
              {/* HP */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[#fe5f55]/70 w-10 shrink-0">
                  HP
                </span>
                <div
                  className="flex-1 flex items-center gap-0.5"
                  role="group"
                  aria-label={`Hit Points: ${instance.hpMarked} of ${instance.hpMax} marked`}
                >
                  {Array.from({ length: instance.hpMax }).map((_, i) => {
                    const isMarked = i < instance.hpMarked;
                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() => handleToggleHp(i)}
                        aria-label={`HP slot ${i + 1}: ${isMarked ? "marked" : "empty"}`}
                        className={`
                          flex-1 flex items-center justify-center h-11
                          focus:outline-none focus:ring-1 focus:ring-[#fe5f55]
                        `}
                      >
                        <span
                          className={`
                            h-4 w-full max-w-[1.25rem] rounded-sm border transition-all duration-100
                            ${
                              isMarked
                                ? "bg-[#fe5f55] border-[#fe5f55]/60"
                                : "bg-slate-800 border-slate-700/40 hover:border-[#fe5f55]/40"
                            }
                          `}
                        />
                      </button>
                    );
                  })}
                  <span className="ml-1.5 text-[10px] font-bold text-[#b9baa3] tabular-nums shrink-0">
                    {instance.hpMarked}/{instance.hpMax}
                  </span>
                </div>
              </div>

              {/* Stress */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[#577399]/70 w-10 shrink-0">
                  Stress
                </span>
                <div
                  className="flex-1 flex items-center gap-0.5"
                  role="group"
                  aria-label={`Stress: ${instance.stressMarked} of ${instance.stressMax} marked`}
                >
                  {Array.from({ length: instance.stressMax }).map((_, i) => {
                    const isMarked = i < instance.stressMarked;
                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() => handleToggleStress(i)}
                        aria-label={`Stress slot ${i + 1}: ${isMarked ? "marked" : "empty"}`}
                        className={`
                          flex-1 flex items-center justify-center h-11
                          focus:outline-none focus:ring-1 focus:ring-[#577399]
                        `}
                      >
                        <span
                          className={`
                            h-4 w-full max-w-[1.25rem] rounded-sm border transition-all duration-100
                            ${
                              isMarked
                                ? "bg-[#577399] border-[#577399]/60"
                                : "bg-slate-800 border-slate-700/40 hover:border-[#577399]/40"
                            }
                          `}
                        />
                      </button>
                    );
                  })}
                  <span className="ml-1.5 text-[10px] font-bold text-[#b9baa3] tabular-nums shrink-0">
                    {instance.stressMarked}/{instance.stressMax}
                  </span>
                </div>
              </div>
            </div>

            {/* Thresholds — inline, color-coded */}
            <div className="mt-1.5 flex items-center gap-2 text-[10px]">
              <span className="text-[#b9baa3]/40 uppercase tracking-wider font-semibold">
                Thresholds
              </span>
              {instance.damageThresholds.major !== null ? (
                <>
                  <span className="text-[#DAA520] font-medium">
                    {instance.damageThresholds.major}
                  </span>
                  <span className="text-[#b9baa3]/20">/</span>
                  <span className="text-[#fe5f55] font-medium">
                    {instance.damageThresholds.severe}
                  </span>
                </>
              ) : (
                <span className="text-[#b9baa3]/40 italic">None (Minion)</span>
              )}
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="mt-3 flex flex-wrap items-center gap-2 pl-8">
          {/* Roll Attack */}
          <button
            type="button"
            onClick={handleRollAttack}
            className="
              inline-flex items-center gap-1.5 rounded-lg border
              px-2.5 py-1.5 text-xs font-semibold transition-all duration-150
              border-[#577399]/40 bg-[#577399]/10 text-[#577399]
              hover:bg-[#577399]/20 hover:border-[#577399] hover:text-[#f7f7ff]
              focus:outline-none focus:ring-2 focus:ring-[#577399]
            "
          >
            🎲 Roll Attack
          </button>

          {/* Roll Damage */}
          <button
            type="button"
            onClick={handleRollDamage}
            className="
              inline-flex items-center gap-1.5 rounded-lg border
              px-2.5 py-1.5 text-xs font-semibold transition-all duration-150
              border-[#fe5f55]/30 bg-[#fe5f55]/5 text-[#fe5f55]/70
              hover:bg-[#fe5f55]/10 hover:border-[#fe5f55]/50 hover:text-[#fe5f55]
              focus:outline-none focus:ring-2 focus:ring-[#fe5f55]
            "
          >
            🎲{" "}
            <span className="font-mono text-[10px]">
              {instance.attackDamage.split(" ")[0]}
            </span>
          </button>

          {/* Quick damage buttons */}
          <div className="flex items-center gap-1 border-l border-slate-800/60 pl-2 ml-1">
            <span className="text-[9px] text-[#b9baa3]/40 uppercase tracking-wider mr-1">
              Mark
            </span>
            <button
              type="button"
              onClick={() =>
                onUpdate(instance.instanceId, {
                  hpMarked: instance.hpMarked + 1,
                })
              }
              title="Mark 1 HP (below major)"
              className="
                rounded border border-parchment-400/20 bg-parchment-400/5
                px-1.5 py-0.5 text-[10px] font-bold text-parchment-400
                hover:bg-parchment-400/15 transition-colors
                focus:outline-none focus:ring-1 focus:ring-parchment-400
              "
            >
              +1
            </button>
            <button
              type="button"
              onClick={() =>
                onUpdate(instance.instanceId, {
                  hpMarked: instance.hpMarked + 2,
                })
              }
              title="Mark 2 HP (major)"
              className="
                rounded border border-[#DAA520]/20 bg-[#DAA520]/5
                px-1.5 py-0.5 text-[10px] font-bold text-[#DAA520]
                hover:bg-[#DAA520]/15 transition-colors
                focus:outline-none focus:ring-1 focus:ring-[#DAA520]
              "
            >
              +2
            </button>
            <button
              type="button"
              onClick={() =>
                onUpdate(instance.instanceId, {
                  hpMarked: instance.hpMarked + 3,
                })
              }
              title="Mark 3 HP (severe)"
              className="
                rounded border border-[#fe5f55]/20 bg-[#fe5f55]/5
                px-1.5 py-0.5 text-[10px] font-bold text-[#fe5f55]
                hover:bg-[#fe5f55]/15 transition-colors
                focus:outline-none focus:ring-1 focus:ring-[#fe5f55]
              "
            >
              +3
            </button>
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Defeat / Remove */}
          {!instance.isDefeated && (
            <button
              type="button"
              onClick={() => onDefeat(instance.instanceId)}
              title="Mark as defeated"
              className="
                rounded-lg px-2 py-1 text-xs
                text-[#fe5f55]/50 hover:text-[#fe5f55] hover:bg-[#fe5f55]/10
                transition-colors
                focus:outline-none focus:ring-1 focus:ring-[#fe5f55]
              "
            >
              ✕ Defeat
            </button>
          )}
        </div>

        {/* Inline roll result */}
        {lastRoll && (
          <div
            role="status"
            aria-live="polite"
            className="
              mt-2 ml-8 rounded-lg border border-[#577399]/25 bg-slate-950/60
              px-3 py-2 flex items-center gap-3
              animate-slide-in-left
            "
          >
            <span className="text-[10px] text-[#b9baa3]/50 uppercase tracking-wider shrink-0">
              {lastRoll.label.includes("Attack") ? "Atk" : "Dmg"}
            </span>
            <span
              className={`
                font-mono text-lg font-bold text-[#f7f7ff] animate-scale-up
                ${isCrit ? "text-[#DAA520]" : ""}
              `}
            >
              {lastRoll.total}
            </span>
            {isCrit && (
              <span className="rounded-full bg-[#DAA520]/20 border border-[#DAA520]/40 px-1.5 py-0.5 text-[10px] font-bold text-[#DAA520] uppercase tracking-wider">
                Crit
              </span>
            )}
            <span className="text-[10px] text-[#b9baa3]/50 font-mono">
              ({lastRoll.diceValues.join(" + ")}
              {lastRoll.modifier !== 0 &&
                ` ${lastRoll.modifier > 0 ? "+" : ""}${lastRoll.modifier}`}
              )
            </span>
            <button
              type="button"
              onClick={() => setLastRoll(null)}
              aria-label="Dismiss roll result"
              className="ml-auto text-[#b9baa3]/30 hover:text-[#b9baa3] transition-colors"
            >
              ✕
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
