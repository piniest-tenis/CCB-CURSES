"use client";

/**
 * src/components/dice/DiceRollerPanel.tsx
 *
 * Right-slide panel for the Daggerheart 3D dice roller.
 * Uses the same slide-in pattern as EditSidebar / ConditionsSidebar.
 *
 * Phase 1 — Staging:
 *   Shows the pre-populated dice pool from the roll request.
 *   User can add / remove extra dice (advantage, abilities, etc.).
 *   Clicking "Roll!" calls requestRoll() and advances to Phase 2.
 *
 * Phase 2 — Rolling / Result:
 *   Shows the 3D canvas animation, then the result with:
 *   - Hope/Fear canvas glow (goldenrod or steel-blue)
 *   - Critical gold glow
 *   - Total, Hope/Fear values, per-die breakdown
 */

import React, { useEffect, useRef, useState } from "react";
import { useDiceStore } from "@/store/diceStore";
import { DiceRoller } from "./DiceRoller";
import type { RollResult, ActionOutcome, DieSize, DieSpec, RollRequest, RollBonus, DieRole } from "@/types/dice";

// ─── Constants ────────────────────────────────────────────────────────────────

const ALL_SIZES: DieSize[] = ["d4", "d6", "d8", "d10", "d12", "d20"];

// Maps die size to public image path (no d20 clean image available)
const DIE_IMAGE: Partial<Record<DieSize, string>> = {
  d4:  "/images/dice/d4-clean.png",
  d6:  "/images/dice/d6-clean.png",
  d8:  "/images/dice/d8-clean.png",
  d10: "/images/dice/d10-clean.png",
  d12: "/images/dice/d12-clean.png",
};

// ─── Outcome display helpers ──────────────────────────────────────────────────

const OUTCOME_LABEL: Record<ActionOutcome, string> = {
  critical: "CRITICAL!",
};

const OUTCOME_COLOR: Record<ActionOutcome, string> = {
  critical: "text-[#FFD700]",
};

const OUTCOME_BORDER: Record<ActionOutcome, string> = {
  critical: "border-[#FFD700]/40",
};

// ─── Die image button ─────────────────────────────────────────────────────────

function DieImageButton({
  size,
  count,
  onAdd,
  onRemove,
  disabled,
}: {
  size: DieSize;
  count: number;
  onAdd: () => void;
  onRemove: () => void;
  disabled?: boolean;
}) {
  const imgSrc = DIE_IMAGE[size];
  const active = count > 0;

  return (
    <div className="flex flex-col items-center gap-1">
      {/* Die image / tap to add */}
      <button
        type="button"
        onClick={onAdd}
        disabled={disabled || count >= 9}
        aria-label={`Add a ${size}`}
        className={[
          "relative flex h-12 w-12 items-center justify-center rounded-lg border transition-all duration-150",
          "focus:outline-none focus:ring-2 focus:ring-[#577399]",
          active
            ? "border-[#577399] bg-[#577399]/20"
            : "border-[#577399]/25 bg-slate-900/60 hover:border-[#577399]/60 hover:bg-[#577399]/10",
          disabled || count >= 9 ? "opacity-30 cursor-not-allowed" : "cursor-pointer",
        ].join(" ")}
      >
        {imgSrc ? (
          <img
            src={imgSrc}
            alt={size}
            className={["h-8 w-8 object-contain select-none", active ? "opacity-100" : "opacity-60"].join(" ")}
            draggable={false}
          />
        ) : (
          <span className="text-xs font-bold text-[#b9baa3]">{size}</span>
        )}
        {/* Count badge */}
        {count > 0 && (
          <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#577399] px-1 text-[10px] font-bold text-white leading-none">
            {count}
          </span>
        )}
      </button>

      {/* Label + minus button */}
      <div className="flex items-center gap-0.5">
        {count > 0 && (
          <button
            type="button"
            onClick={onRemove}
            disabled={disabled || count === 0}
            aria-label={`Remove a ${size}`}
            className="flex h-4 w-4 items-center justify-center rounded text-[#b9baa3] border border-[#577399]/30 hover:border-[#577399] hover:text-[#f7f7ff] disabled:opacity-30 text-[11px] transition-colors focus:outline-none focus:ring-1 focus:ring-[#577399]"
          >
            −
          </button>
        )}
        <span className="text-[10px] text-[#b9baa3] font-medium">{size}</span>
      </div>
    </div>
  );
}

// ─── Phase 1: Staging panel ───────────────────────────────────────────────────

function StagingPanel({
  request,
  onRoll,
  onCancel,
}: {
  request: RollRequest;
  onRoll: (req: RollRequest) => void;
  onCancel: () => void;
}) {
  // Build initial counts from the request's dice pool
  const initialCounts = (): Record<DieSize, number> => {
    const c: Record<DieSize, number> = { d4: 0, d6: 0, d8: 0, d10: 0, d12: 0, d20: 0 };
    for (const d of request.dice) {
      c[d.size] = (c[d.size] ?? 0) + 1;
    }
    return c;
  };

  const [extraCounts, setExtraCounts] = useState<Record<DieSize, number>>({
    d4: 0, d6: 0, d8: 0, d10: 0, d12: 0, d20: 0,
  });
  const [baseCounts] = useState<Record<DieSize, number>>(initialCounts);

  // Advantage die toggle (SRD p.20: add d6 to total)
  const [advantage, setAdvantage] = useState(false);
  // Disadvantage die toggle (SRD p.20: subtract d6 from total). Mutually exclusive.
  const [disadvantage, setDisadvantage] = useState(false);

  const toggleAdvantage = () => {
    setAdvantage((v) => !v);
    setDisadvantage(false);
  };
  const toggleDisadvantage = () => {
    setDisadvantage((v) => !v);
    setAdvantage(false);
  };

  // Bonus toggles — one boolean per bonus in request.bonuses
  const bonuses: RollBonus[] = request.bonuses ?? [];
  const [activeBonuses, setActiveBonuses] = useState<boolean[]>(() =>
    bonuses.map(() => false)
  );

  const toggleBonus = (i: number) => {
    setActiveBonuses((prev) => prev.map((v, j) => (j === i ? !v : v)));
  };

  const adjustExtra = (size: DieSize, delta: number) => {
    setExtraCounts((prev) => ({
      ...prev,
      [size]: Math.max(
        -(baseCounts[size] ?? 0), // can remove base dice too (down to 0 total)
        Math.min(9, (prev[size] ?? 0) + delta)
      ),
    }));
  };

  const totalCounts = (size: DieSize) => Math.max(0, (baseCounts[size] ?? 0) + (extraCounts[size] ?? 0));
  const totalDice = ALL_SIZES.reduce((s, sz) => s + totalCounts(sz), 0) + (advantage || disadvantage ? 1 : 0)
    + activeBonuses.reduce((s, on, i) => s + (on ? (bonuses[i]?.extraDice?.length ?? 0) : 0), 0);

  // Compute the active bonus sum
  const bonusTotal = bonuses.reduce((sum, b, i) => sum + (activeBonuses[i] ? b.value : 0), 0);
  const mod = (request.modifier ?? 0) + bonusTotal;

  const handleRoll = () => {
    if (totalDice === 0) return;

    // Rebuild dice array: keep original roles for base dice, mark extras as "advantage"
    const newDice: DieSpec[] = [];

    // Preserve original dice first (with their roles — hope, fear, damage, etc.)
    const origBySize: Partial<Record<DieSize, DieSpec[]>> = {};
    for (const d of request.dice) {
      if (!origBySize[d.size]) origBySize[d.size] = [];
      origBySize[d.size]!.push(d);
    }

    for (const size of ALL_SIZES) {
      const origPool = origBySize[size] ?? [];
      const total = totalCounts(size);
      for (let i = 0; i < total; i++) {
        if (i < origPool.length) {
          newDice.push(origPool[i]);
        } else {
          newDice.push({ size, role: "advantage", label: size });
        }
      }
    }

    // Inject advantage die if toggled (SRD p.20: adds d6)
    if (advantage) {
      newDice.push({ size: "d6", role: "advantage", label: "Advantage" });
    }
    // Inject disadvantage die if toggled (SRD p.20: subtracts d6)
    if (disadvantage) {
      newDice.push({ size: "d6", role: "disadvantage", label: "Disadvantage" });
    }

    // Inject extra dice from active bonuses
    for (let i = 0; i < bonuses.length; i++) {
      if (activeBonuses[i] && bonuses[i].extraDice?.length) {
        newDice.push(...bonuses[i].extraDice!);
      }
    }

    onRoll({ ...request, dice: newDice, modifier: mod });
  };

  const baseMod = request.modifier ?? 0;

  return (
    <div className="px-5 pb-5 pt-4 space-y-4">
      {/* Roll label */}
      <p className="text-center text-xs font-semibold uppercase tracking-widest text-[#b9baa3]">
        {request.label}
      </p>

      {/* Dice pool */}
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-[#577399] mb-2">
          Dice Pool
          {totalDice > 0 && (
            <span className="ml-1.5 font-normal text-[#b9baa3] normal-case tracking-normal">
              — {totalDice} {totalDice === 1 ? "die" : "dice"}
              {mod !== 0 ? ` ${mod > 0 ? "+" : ""}${mod}` : ""}
            </span>
          )}
        </p>

        {/* Die image buttons */}
        <div className="flex flex-wrap justify-center gap-3">
          {ALL_SIZES.map((size) => (
            <DieImageButton
              key={size}
              size={size}
              count={totalCounts(size)}
              onAdd={() => adjustExtra(size, 1)}
              onRemove={() => adjustExtra(size, -1)}
            />
          ))}
        </div>
      </div>

      {/* Advantage / Disadvantage toggles (SRD p.20) */}
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-[#577399] mb-2">
          Modifiers
        </p>
        <div className="flex gap-1.5">
          {/* Advantage */}
          <button
            type="button"
            role="switch"
            aria-checked={advantage}
            onClick={toggleAdvantage}
            aria-label={advantage ? "Advantage active — adds d6 to roll" : "Add advantage die (d6)"}
            className={[
              "flex flex-1 items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-all duration-150",
              "focus:outline-none focus:ring-2 focus:ring-[#577399]",
              advantage
                ? "border-[#577399] bg-[#577399]/20 text-[#f7f7ff]"
                : "border-[#577399]/25 bg-transparent text-[#b9baa3] hover:border-[#577399]/50 hover:text-[#f7f7ff]",
            ].join(" ")}
          >
            {DIE_IMAGE["d6"] ? (
              <img
                src={DIE_IMAGE["d6"]}
                alt="d6"
                className={["h-5 w-5 object-contain select-none shrink-0", advantage ? "opacity-100" : "opacity-50"].join(" ")}
                draggable={false}
              />
            ) : (
              <span className="text-xs font-bold shrink-0">d6</span>
            )}
            <span className="flex-1 text-left font-medium text-xs">Advantage</span>
            {advantage && (
              <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-[#577399] px-1 text-[10px] font-bold text-white leading-none shrink-0">
                +d6
              </span>
            )}
          </button>

          {/* Disadvantage */}
          <button
            type="button"
            role="switch"
            aria-checked={disadvantage}
            onClick={toggleDisadvantage}
            aria-label={disadvantage ? "Disadvantage active — subtracts d6 from roll" : "Add disadvantage die (−d6)"}
            className={[
              "flex flex-1 items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-all duration-150",
              "focus:outline-none focus:ring-2 focus:ring-[#577399]",
              disadvantage
                ? "border-[#fe5f55]/60 bg-[#fe5f55]/10 text-[#f7f7ff]"
                : "border-[#577399]/25 bg-transparent text-[#b9baa3] hover:border-[#fe5f55]/40 hover:text-[#f7f7ff]",
            ].join(" ")}
          >
            {DIE_IMAGE["d6"] ? (
              <img
                src={DIE_IMAGE["d6"]}
                alt="d6"
                className={["h-5 w-5 object-contain select-none shrink-0 opacity-50", disadvantage ? "opacity-70" : ""].join(" ")}
                draggable={false}
              />
            ) : (
              <span className="text-xs font-bold shrink-0">d6</span>
            )}
            <span className="flex-1 text-left font-medium text-xs">Disadvantage</span>
            {disadvantage && (
              <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-[#fe5f55]/70 px-1 text-[10px] font-bold text-white leading-none shrink-0">
                −d6
              </span>
            )}
          </button>
        </div>

        {/* Bonus toggles from weapon features / domain cards */}
        {bonuses.map((bonus, i) => (
          <button
            key={i}
            type="button"
            role="switch"
            aria-checked={activeBonuses[i]}
            onClick={() => toggleBonus(i)}
            aria-label={`${bonus.label}${bonus.cost ? ` (costs ${bonus.cost})` : ""}: ${bonus.value > 0 ? "+" : ""}${bonus.value > 0 || bonus.extraDice?.length ? "" : bonus.value} to roll`}
            className={[
              "mt-1.5 flex items-center gap-2 w-full rounded-lg border px-3 py-2 text-sm transition-all duration-150",
              "focus:outline-none focus:ring-2 focus:ring-[#577399]",
              activeBonuses[i]
                ? "border-[#DAA520]/60 bg-[#DAA520]/10 text-[#f7f7ff]"
                : "border-[#577399]/25 bg-transparent text-[#b9baa3] hover:border-[#577399]/50 hover:text-[#f7f7ff]",
            ].join(" ")}
          >
            <span className="text-[11px] shrink-0" aria-hidden="true">✦</span>
            <span className="flex-1 text-left font-medium text-xs">{bonus.label}</span>
            {bonus.cost && (
              <span className={["text-[10px] shrink-0 rounded px-1 py-0.5 border", activeBonuses[i] ? "border-[#DAA520]/40 text-[#DAA520]" : "border-[#577399]/20 text-[#b9baa3]/60"].join(" ")}>
                {bonus.cost}
              </span>
            )}
            <span className={["text-xs font-bold shrink-0", activeBonuses[i] ? "text-[#DAA520]" : "text-[#b9baa3]"].join(" ")}>
              {bonus.extraDice?.length
                ? `+${bonus.extraDice.length}${bonus.extraDice[0]?.size ?? ""}${bonus.value !== 0 ? (bonus.value > 0 ? `+${bonus.value}` : `${bonus.value}`) : ""}`
                : `${bonus.value > 0 ? "+" : ""}${bonus.value}`}
            </span>
          </button>
        ))}
      </div>

      {/* Modifier row — only show if non-zero */}
      {baseMod !== 0 && bonusTotal === 0 && (
        <p className="text-center text-xs text-[#b9baa3]">
          Modifier: <span className="font-bold text-[#f7f7ff]">{baseMod > 0 ? "+" : ""}{baseMod}</span>
        </p>
      )}
      {bonusTotal !== 0 && (
        <p className="text-center text-xs text-[#b9baa3]">
          Modifier: <span className="font-bold text-[#f7f7ff]">{baseMod > 0 ? "+" : ""}{baseMod}</span>
          {bonusTotal !== 0 && (
            <span className="text-[#DAA520]"> {bonusTotal > 0 ? "+" : ""}{bonusTotal} bonus</span>
          )}
          {" "}<span className="font-bold text-[#f7f7ff]">= {mod > 0 ? "+" : ""}{mod}</span>
        </p>
      )}
      {disadvantage && (
        <p className="text-center text-[11px] text-[#fe5f55]/70">
          Disadvantage d6 will be subtracted from total
        </p>
      )}

      {/* Hint */}
      <p className="text-center text-[11px] text-[#b9baa3]/50">
        Tap a die to add · tap − to remove
      </p>

      {/* Roll / Cancel buttons */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 rounded-lg border border-[#577399]/25 bg-transparent px-3 py-2 text-sm text-[#b9baa3] hover:bg-[#577399]/10 hover:text-[#f7f7ff] transition-colors focus:outline-none focus:ring-2 focus:ring-[#577399]"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleRoll}
          disabled={totalDice === 0}
          className="flex-[2] rounded-lg border border-[#577399]/60 bg-[#577399]/20 px-3 py-2 text-sm font-semibold text-[#f7f7ff] hover:bg-[#577399]/35 hover:border-[#577399] disabled:opacity-30 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-[#577399]"
        >
          Roll!
        </button>
      </div>
    </div>
  );
}

// ─── Result display ───────────────────────────────────────────────────────────

function ResultPanel({ result }: { result: RollResult }) {
  const { request, total, outcome, hopeValue, fearValue, dice } = result;
  const mod = request.modifier ?? 0;

  return (
    <div className="space-y-3 px-5 pb-5 pt-2">
      {/* Roll label */}
      <p className="text-center text-xs font-semibold uppercase tracking-widest text-[#b9baa3]">
        {request.label}
      </p>

      {/* Outcome badge */}
      {outcome && (
        <div
          className={[
            "rounded-xl border px-4 py-3 text-center transition-all duration-500",
            OUTCOME_BORDER[outcome],
            outcome === "critical"
              ? "bg-[#FFD700]/10 shadow-[0_0_24px_4px_rgba(255,215,0,0.25)]"
              : "bg-slate-900/60",
          ].join(" ")}
        >
          <p className={`text-2xl font-bold font-serif ${OUTCOME_COLOR[outcome]}`}>
            {OUTCOME_LABEL[outcome]}
          </p>
          {outcome === "critical" && (
            <p className="mt-0.5 text-xs text-[#b9baa3]">
              Both dice match — gain 1 Hope, clear 1 Stress (SRD p.14)
            </p>
          )}
        </div>
      )}

      {/* Hope / Fear values for action rolls */}
      {(hopeValue !== undefined || fearValue !== undefined) && (
        <div className="flex items-center justify-center gap-4">
          {hopeValue !== undefined && (
            <div className="flex flex-col items-center gap-0.5">
              <span
                className="rounded-full h-10 w-10 flex items-center justify-center text-lg font-bold border-2"
                style={{ background: "#DAA520", borderColor: "#DAA520", color: "#36454F" }}
                aria-label={`Hope die: ${hopeValue}`}
              >
                {hopeValue}
              </span>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#DAA520]">
                Hope
              </span>
            </div>
          )}
          {fearValue !== undefined && (
            <div className="flex flex-col items-center gap-0.5">
              <span
                className="rounded-full h-10 w-10 flex items-center justify-center text-lg font-bold border-2"
                style={{ background: "#36454F", borderColor: "#36454F", color: "#DAA520" }}
                aria-label={`Fear die: ${fearValue}`}
              >
                {fearValue}
              </span>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#b9baa3]">
                Fear
              </span>
            </div>
          )}
        </div>
      )}

      {/* Hope / Fear outcome label */}
      {hopeValue !== undefined && fearValue !== undefined && !outcome && (
        <p className="text-center text-sm font-bold">
          {hopeValue > fearValue ? (
            <span style={{ color: "#DAA520" }}>HOPE</span>
          ) : fearValue > hopeValue ? (
            <span style={{ color: "#9BB5CC" }}>FEAR</span>
          ) : null}
        </p>
      )}

      {/* Individual die results (for damage / generic rolls) */}
      {!hopeValue && !fearValue && dice.length > 0 && (
        <div className="flex flex-wrap items-center justify-center gap-2">
          {dice.map((d, i) => {
            const isDisadv = d.role === "disadvantage";
            return (
              <div key={i} className="flex flex-col items-center gap-0.5">
                <span
                  className={[
                    "rounded h-8 w-8 flex items-center justify-center text-sm font-bold border",
                    isDisadv
                      ? "bg-[#fe5f55]/10 border-[#fe5f55]/40 text-[#fe5f55]"
                      : "bg-[#202020] border-[#aaaaaa]/30 text-[#aaaaaa]",
                  ].join(" ")}
                  aria-label={`${d.size}: ${isDisadv ? "-" : ""}${d.value}`}
                >
                  {isDisadv ? `-${d.value}` : d.value}
                </span>
                <span className="text-[10px] text-[#b9baa3]">{isDisadv ? `−${d.size}` : d.size}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Total */}
      <div className="text-center">
        <span className="text-xs text-[#b9baa3]">Total</span>
        <p className="text-4xl font-bold font-serif text-[#f7f7ff] leading-none mt-0.5">
          {total}
        </p>
        {mod !== 0 && (
          <p className="text-xs text-[#b9baa3] mt-1">
            Dice {total - mod} {mod > 0 ? "+" : ""}{mod} modifier
          </p>
        )}
        {request.difficulty !== undefined && !outcome && (
          <p className="text-xs text-[#b9baa3] mt-1">
            vs. Difficulty {request.difficulty}
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Canvas glow helper ───────────────────────────────────────────────────────

function canvasGlowClass(result: RollResult | null): string {
  if (!result) return "";

  const { outcome, hopeValue, fearValue } = result;

  if (outcome === "critical") {
    return "shadow-[0_0_32px_8px_rgba(255,215,0,0.35)] ring-2 ring-[#FFD700]/50";
  }
  if (hopeValue !== undefined && fearValue !== undefined) {
    if (hopeValue > fearValue) {
      return "shadow-[0_0_28px_6px_rgba(218,165,32,0.40)] ring-2 ring-[#DAA520]/50";
    }
    if (fearValue > hopeValue) {
      return "shadow-[0_0_28px_6px_rgba(155,181,204,0.35)] ring-2 ring-[#9BB5CC]/40";
    }
  }
  return "";
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface DiceRollerPanelProps {
  open: boolean;
  onClose: () => void;
  /** Custom color overrides for dice.js — resolved from character/user prefs. */
  colorOverrides?: Record<DieRole, { dice_color: string; label_color: string }>;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function DiceRollerPanel({ open, onClose, colorOverrides }: DiceRollerPanelProps) {
  const { isRolling, lastResult, stagedRequest, requestRoll, clearStagedRoll } = useDiceStore();
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const panelRef       = useRef<HTMLDivElement>(null);
  const headingId      = React.useId();

  const [phase, setPhase] = useState<"staging" | "rolling" | "result">("staging");

  // Reset to staging whenever the panel opens fresh with a new staged request
  useEffect(() => {
    if (open && stagedRequest) {
      setPhase("staging");
    }
  }, [open, stagedRequest]);

  // Advance phase when rolling starts / finishes
  useEffect(() => {
    if (isRolling) {
      setPhase("rolling");
    } else if (phase === "rolling" && lastResult) {
      setPhase("result");
    }
  }, [isRolling, lastResult]); // eslint-disable-line react-hooks/exhaustive-deps

  // Focus close button on open (a11y)
  useEffect(() => {
    if (open) {
      const t = setTimeout(() => closeButtonRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [open]);

  // Escape to close (only when not rolling)
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isRolling) handleClose();
    };
    document.addEventListener("keydown", handler, true);
    return () => document.removeEventListener("keydown", handler, true);
  }, [open, isRolling]); // eslint-disable-line react-hooks/exhaustive-deps

  // Tab trap
  useEffect(() => {
    if (!open || !panelRef.current) return;
    const panel = panelRef.current;
    const selector = 'button, [tabindex]:not([tabindex="-1"])';
    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const focusable = Array.from(panel.querySelectorAll<HTMLElement>(selector)).filter(
        (el) => !el.hasAttribute("disabled")
      );
      if (!focusable.length) return;
      const first = focusable[0];
      const last  = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault(); last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault(); first.focus();
      }
    };
    panel.addEventListener("keydown", handleTab);
    return () => panel.removeEventListener("keydown", handleTab);
  }, [open]);

  const handleClose = () => {
    if (isRolling) return;
    clearStagedRoll();
    onClose();
  };

  const handleCommitRoll = (req: RollRequest) => {
    requestRoll(req);
  };

  const handleCancelStaging = () => {
    clearStagedRoll();
    onClose();
  };

  // Canvas glow based on most recent result (only in result phase)
  const glowClass = phase === "result" ? canvasGlowClass(lastResult) : "";

  // Header title changes per phase
  const headingText =
    phase === "staging" ? (stagedRequest?.label ?? "Roll Dice") :
    phase === "rolling" ? "Rolling..." :
    "Result";

  return (
    <>
      {/* Backdrop — visible on mobile, dimmed on desktop */}
      {open && (
        <div
          aria-hidden="true"
          onClick={() => { if (!isRolling) handleClose(); }}
          className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-sm transition-opacity duration-300"
        />
      )}

      {/* Slide-in panel from the right */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={headingId}
        aria-hidden={!open}
        inert={!open ? ("" as unknown as boolean) : undefined}
        className={[
          "fixed inset-y-0 right-0 z-50 flex h-full w-full max-w-[28rem] flex-col",
          "border-l border-[#577399]/35 bg-[#0f1713] shadow-2xl",
          "transition-transform duration-300 ease-in-out",
          open ? "translate-x-0" : "translate-x-full",
        ].join(" ")}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#577399]/25 px-4 py-4 sm:px-5">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-[#b9baa3]/70">Dice Roller</p>
            <h2
              id={headingId}
              className="font-serif text-lg font-semibold text-[#f7f7ff]"
            >
              {headingText}
            </h2>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={handleClose}
            disabled={isRolling}
            aria-label="Close dice roller"
            className="
              flex h-10 w-10 items-center justify-center rounded-lg border border-[#577399]/30
              text-[#b9baa3] hover:bg-[#577399]/12 hover:text-[#f7f7ff]
              disabled:opacity-30 disabled:cursor-not-allowed
              focus:outline-none focus:ring-2 focus:ring-[#577399]
              transition-colors
            "
          >
            ✕
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto">
          {/* Phase 1: Staging */}
          {phase === "staging" && stagedRequest && (
            <StagingPanel
              request={stagedRequest}
              onRoll={handleCommitRoll}
              onCancel={handleCancelStaging}
            />
          )}

          {/*
            Canvas — always mounted so the dice_box stays alive across rolls.
            Hidden during staging so the empty canvas isn't visible.
            Uses h-0 overflow-hidden instead of display:none so the container
            retains its width and the WebGL renderer initialises at the correct
            resolution. The WebGL renderer + Three.js scene + Cannon.js world
            are expensive to create, so keeping them alive avoids the slow
            re-init that was causing delayed / missing dice on every throw.
          */}
          <div
            className={[
              "transition-all duration-500 rounded-lg mx-4 mt-4 overflow-hidden",
              phase === "staging" ? "h-0 !mt-0" : "",
              glowClass,
            ].join(" ")}
          >
            <DiceRoller height={300} transparent={false} colorOverrides={colorOverrides} />
          </div>

          {/* Rolling indicator */}
          {phase === "rolling" && (
            <div className="flex flex-col items-center gap-2 py-6 px-5">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#577399] border-t-transparent" aria-hidden="true" />
              <p className="text-sm text-[#b9baa3] animate-pulse">Rolling...</p>
            </div>
          )}

          {/* Result */}
          {phase === "result" && lastResult && (
            <ResultPanel result={lastResult} />
          )}
        </div>

        {/* Footer — close / roll again */}
        {phase === "result" && (
          <div className="border-t border-[#577399]/25 px-4 py-4 sm:px-5">
            <button
              type="button"
              onClick={handleClose}
              className="w-full rounded-xl border border-[#577399]/40 bg-[#577399]/15 px-4 py-3 text-sm font-semibold text-[#f7f7ff] transition-colors hover:bg-[#577399]/25 focus:outline-none focus:ring-2 focus:ring-[#577399]"
            >
              Done
            </button>
          </div>
        )}
      </div>
    </>
  );
}
