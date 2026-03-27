"use client";

/**
 * src/components/dice/DiceRollerModal.tsx
 *
 * Two-phase modal for the Daggerheart 3D dice roller.
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
import type { RollResult, ActionOutcome, DieSize, DieSpec, RollRequest } from "@/types/dice";

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
          <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#577399] px-1 text-[9px] font-bold text-white leading-none">
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
            className="flex h-4 w-4 items-center justify-center rounded text-[#b9baa3] border border-[#577399]/30 hover:border-[#577399] hover:text-[#f7f7ff] disabled:opacity-30 text-[10px] transition-colors focus:outline-none focus:ring-1 focus:ring-[#577399]"
          >
            −
          </button>
        )}
        <span className="text-[9px] text-[#b9baa3] font-medium">{size}</span>
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
  const totalDice = ALL_SIZES.reduce((s, sz) => s + totalCounts(sz), 0);

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

    onRoll({ ...request, dice: newDice });
  };

  const mod = request.modifier ?? 0;

  return (
    <div className="px-5 pb-5 pt-2 space-y-4">
      {/* Roll label */}
      <p className="text-center text-xs font-semibold uppercase tracking-widest text-[#b9baa3]">
        {request.label}
      </p>

      {/* Dice pool */}
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-[#577399] mb-2">
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

      {/* Modifier row */}
      {mod !== 0 && (
        <p className="text-center text-xs text-[#b9baa3]">
          Modifier: <span className="font-bold text-[#f7f7ff]">{mod > 0 ? "+" : ""}{mod}</span>
        </p>
      )}

      {/* Hint */}
      <p className="text-center text-[10px] text-[#b9baa3]/50">
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
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[#DAA520]">
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
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[#b9baa3]">
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
          {dice.map((d, i) => (
            <div key={i} className="flex flex-col items-center gap-0.5">
              <span
                className="rounded h-8 w-8 flex items-center justify-center text-sm font-bold bg-[#202020] border border-[#aaaaaa]/30 text-[#aaaaaa]"
                aria-label={`${d.size}: ${d.value}`}
              >
                {d.value}
              </span>
              <span className="text-[9px] text-[#b9baa3]">{d.size}</span>
            </div>
          ))}
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
      // Hope wins — goldenrod
      return "shadow-[0_0_28px_6px_rgba(218,165,32,0.40)] ring-2 ring-[#DAA520]/50";
    }
    if (fearValue > hopeValue) {
      // Fear wins — steel-blue / charcoal
      return "shadow-[0_0_28px_6px_rgba(155,181,204,0.35)] ring-2 ring-[#9BB5CC]/40";
    }
  }
  return "";
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface DiceRollerModalProps {
  open: boolean;
  onClose: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function DiceRollerModal({ open, onClose }: DiceRollerModalProps) {
  const { isRolling, lastResult, stagedRequest, requestRoll, clearStagedRoll } = useDiceStore();
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const dialogRef      = useRef<HTMLDivElement>(null);
  const headingId      = React.useId();

  // Determine which phase we're in:
  //   staging  → stagedRequest set, not rolling, no result yet (or result from a previous roll)
  //   rolling  → isRolling === true
  //   result   → !isRolling && lastResult is from this session
  //
  // We track whether we've entered the rolling phase this session so we don't
  // show a stale lastResult in the staging phase.
  const [phase, setPhase] = useState<"staging" | "rolling" | "result">("staging");

  // Reset to staging whenever the modal opens fresh with a new staged request
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

  // Lock body scroll while modal is open (prevents background scroll-jump)
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open]);

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
    if (!open || !dialogRef.current) return;
    const panel = dialogRef.current;
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

  if (!open) return null;

  const handleClose = () => {
    if (isRolling) return;
    clearStagedRoll();
    onClose();
  };

  const handleCommitRoll = (req: RollRequest) => {
    requestRoll(req);
    // phase will advance automatically via the isRolling effect
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
    phase === "rolling" ? "Rolling Dice" :
    "Result";

  return (
    <>
      {/* Backdrop */}
      <div
        aria-hidden="true"
        onClick={() => { if (!isRolling) handleClose(); }}
        className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm"
      />

      {/* Dialog */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={headingId}
        className="
          fixed inset-x-4 top-1/2 z-50 -translate-y-1/2
          mx-auto max-w-xl relative
          rounded-2xl border border-[#577399]/30 bg-[#0f1713] shadow-2xl
          overflow-hidden
        "
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#577399]/25 px-5 py-3">
          <h2
            id={headingId}
            className="font-serif text-base font-semibold text-[#f7f7ff]"
          >
            {headingText}
          </h2>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={handleClose}
            disabled={isRolling}
            aria-label="Close dice roller"
            className="
              flex h-9 w-9 items-center justify-center rounded-lg border border-[#577399]/30
              text-[#b9baa3] hover:bg-[#577399]/12 hover:text-[#f7f7ff]
              disabled:opacity-30 disabled:cursor-not-allowed
              focus:outline-none focus:ring-2 focus:ring-[#577399]
              transition-colors
            "
          >
            ✕
          </button>
        </div>

        {/* Phase 1: Staging */}
        {phase === "staging" && stagedRequest && (
          <StagingPanel
            request={stagedRequest}
            onRoll={handleCommitRoll}
            onCancel={handleCancelStaging}
          />
        )}

        {/* Canvas — only rendered during rolling/result phases.
            Conditional rendering avoids the "canvas is empty" crash that
            occurred when the canvas was always-mounted but hidden. */}
        {(phase === "rolling" || phase === "result") && (
          <div
            className={["transition-all duration-500", glowClass].join(" ")}
          >
            <DiceRoller height={300} transparent={false} />
          </div>
        )}

        {/* Phase 2 & 3: rolling indicator / result */}
        {phase === "rolling" && (
          <div className="flex flex-col items-center gap-2 py-6 px-5">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#577399] border-t-transparent" aria-hidden="true" />
            <p className="text-sm text-[#b9baa3] animate-pulse">Rolling…</p>
          </div>
        )}
        {phase === "result" && lastResult && (
          <ResultPanel result={lastResult} />
        )}
      </div>
    </>
  );
}
