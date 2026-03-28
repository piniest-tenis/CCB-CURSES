"use client";

/**
 * src/components/dice/DiceLog.tsx
 *
 * Collapsible dice history overlay fixed at the lower-left of the viewport.
 * Shows the last N rolls from diceStore.log with outcome badges.
 *
 * Design:
 *  - Collapsed: a small die icon button with roll count badge.
 *  - Expanded: a 260px-wide panel listing recent rolls, newest on top.
 *  - "Custom Roll" tray lets users pick arbitrary dice before rolling.
 *  - Clicking any row shows its detail.
 *  - "Clear" button empties the log.
 */

import React, { useState } from "react";
import { useDiceStore } from "@/store/diceStore";
import type { RollResult, ActionOutcome, DieSize, DieSpec } from "@/types/dice";

// ─── Outcome colors ───────────────────────────────────────────────────────────

const OUTCOME_SHORT: Record<ActionOutcome, string> = {
  "critical": "CRIT",
};

const OUTCOME_COLOR: Record<ActionOutcome, string> = {
  "critical": "text-[#FFD700] border-[#FFD700]/40",
};

// ─── Die icon (d12 shape from d-12-clean.svg) ────────────────────────────────

function DieIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 110 110"
      fill="currentColor"
      className={className}
    >
      <path d="M33.01,70.06c-.12,0-.25-.05-.34-.14l-21.79-20.59c-.16-.15-.2-.4-.1-.6l14.47-27.4c.1-.2.32-.3.54-.26l28.6,5.79c.23.05.39.24.4.47l1.01,26.87c0,.17-.08.33-.22.43l-22.28,15.34c-.09.06-.19.09-.28.09h0ZM11.84,48.86l21.22,20.06,21.73-14.95-.98-26.21-27.84-5.63-14.12,26.74h-.01Z"/>
      <path d="M80.08,67.8c-.08,0-.16-.02-.23-.06l-24.78-13.08c-.16-.08-.26-.25-.27-.42l-1.01-26.87c0-.23.14-.43.36-.5l27.02-7.91c.2-.06.42.02.55.19l17.47,24.53c.13.18.12.43-.02.6l-18.7,23.34c-.1.12-.24.19-.39.19h0ZM55.79,53.91l24.16,12.76,18.21-22.72-17.04-23.93-26.31,7.71.98,26.2v-.02Z"/>
      <path d="M54.29,27.85h-.1l-28.6-5.79c-.2-.04-.36-.2-.39-.4-.04-.2.05-.41.23-.51l12.85-8c.07-.05.16-.07.25-.08l26.55-1.02c.07,0,.15.01.21.04l16.21,6.89c.19.08.32.28.3.49-.01.21-.16.39-.36.45l-27.02,7.91s-.09.02-.14.02h0ZM27.03,21.32l27.24,5.51,25.56-7.49-14.82-6.3-26.31,1.01-11.67,7.26h0Z"/>
      <path d="M41.86,96.4c-.21,0-.41-.14-.47-.34l-8.85-26.34c-.07-.21,0-.44.19-.57l22.28-15.34c.15-.11.35-.12.52-.03l24.78,13.08c.21.11.31.35.25.57l-7.32,27.45c-.06.21-.24.36-.46.37l-30.89,1.15h-.03ZM33.6,69.76l8.61,25.63,30.15-1.12,7.12-26.7-24.16-12.76s-21.72,14.95-21.72,14.95Z"/>
      <path d="M41.86,96.4c-.08,0-.15-.02-.23-.05l-14.43-7.28c-.08-.04-.15-.1-.19-.17l-15.32-23.49c-.05-.07-.08-.16-.08-.25l-.89-16.17c-.01-.21.1-.4.29-.48.19-.09.41-.05.56.1l22.04,21.34c.06.06.1.12.13.2l8.6,25.6c.06.19,0,.4-.15.54-.09.08-.21.12-.33.12h0ZM27.78,88.24l13.22,6.67-8.18-24.33-21.03-20.37.82,14.76,15.17,23.26h0Z"/>
      <path d="M72.76,95.25c-.1,0-.2-.03-.29-.09-.17-.12-.25-.33-.19-.54l7.32-27.45c.02-.07.05-.13.09-.18l18.7-23.34c.13-.17.36-.23.56-.16s.33.26.33.47v18.23c0,.08-.02.16-.06.24l-12.74,23.75c-.04.07-.1.13-.16.18l-13.28,8.81c-.08.06-.18.08-.28.08ZM80.54,67.53l-6.95,26.07,12.07-8.01,12.62-23.52v-16.69s-17.74,22.15-17.74,22.15Z"/>
    </svg>
  );
}

// ─── Log entry row ────────────────────────────────────────────────────────────

function LogEntry({
  result,
  onClick,
  isSelected,
}: {
  result: RollResult;
  onClick: () => void;
  isSelected: boolean;
}) {
  const { request, total, outcome, dice } = result;
  const timeStr = new Date(result.timestamp).toLocaleTimeString([], {
    hour:   "2-digit",
    minute: "2-digit",
  });

  const diceLabel = dice.map((d) => d.size).join("+");

  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "w-full text-left rounded-lg border px-3 py-2 transition-all duration-100",
        isSelected
          ? "border-[#577399] bg-[#577399]/15"
          : "border-[#577399]/15 bg-slate-900/60 hover:border-[#577399]/40 hover:bg-slate-900",
      ].join(" ")}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-[#f7f7ff] truncate">{request.label}</p>
          <p className="text-[10px] text-[#b9baa3]">
            {diceLabel}{request.modifier ? ` ${request.modifier > 0 ? "+" : ""}${request.modifier}` : ""} = <strong className="text-[#f7f7ff]">{total}</strong>
          </p>
        </div>
        <div className="flex flex-col items-end gap-0.5 shrink-0">
          {outcome ? (
            <span className={`text-[9px] font-bold uppercase border rounded px-1 py-px ${OUTCOME_COLOR[outcome]}`}>
              {OUTCOME_SHORT[outcome]}
            </span>
          ) : (
            <span className="text-sm font-bold text-[#f7f7ff] leading-none">{total}</span>
          )}
          <span className="text-[9px] text-[#b9baa3]">{timeStr}</span>
        </div>
      </div>
    </button>
  );
}

// ─── Detail panel ─────────────────────────────────────────────────────────────

function LogEntryDetail({ result }: { result: RollResult }) {
  const { dice, total, outcome, hopeValue, fearValue, request } = result;
  const mod = request.modifier ?? 0;

  return (
    <div className="border-t border-[#577399]/20 px-3 py-3 space-y-2 bg-slate-950/60">
      {/* Dice values */}
      <div className="flex flex-wrap gap-1.5">
        {dice.map((d, i) => {
          const isHope = d.role === "hope";
          const isFear = d.role === "fear";
          return (
            <div key={i} className="flex flex-col items-center gap-0.5">
              <span
                className="h-7 w-7 rounded flex items-center justify-center text-xs font-bold border"
                style={
                  isHope
                    ? { background: "#DAA520", borderColor: "#DAA520", color: "#36454F" }
                    : isFear
                    ? { background: "#36454F", borderColor: "#36454F", color: "#DAA520" }
                    : { background: "#202020", borderColor: "#555", color: "#aaa" }
                }
              >
                {d.value}
              </span>
              <span className="text-[8px] text-[#b9baa3]">{d.size}</span>
            </div>
          );
        })}
        {mod !== 0 && (
          <div className="flex flex-col items-center justify-center gap-0.5">
            <span className="text-xs font-bold text-[#b9baa3]">
              {mod > 0 ? "+" : ""}{mod}
            </span>
            <span className="text-[8px] text-[#b9baa3]">mod</span>
          </div>
        )}
      </div>

      {/* Hope vs Fear */}
      {hopeValue !== undefined && fearValue !== undefined && (
        <p className="text-[10px] text-[#b9baa3]">
          <span style={{ color: "#DAA520" }}>Hope {hopeValue}</span>
          {" · "}
          <span style={{ color: "#9BB5CC" }}>Fear {fearValue}</span>
        </p>
      )}

      {/* Total */}
      <p className="text-xs font-semibold text-[#f7f7ff]">
        Total: {total}
        {request.difficulty !== undefined && (
          <span className="text-[#b9baa3] font-normal"> (vs. {request.difficulty})</span>
        )}
      </p>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

// ─── CustomRollTray ───────────────────────────────────────────────────────────
// Inline tray for building an arbitrary dice pool and rolling it.

const ALL_SIZES: DieSize[] = ["d4", "d6", "d8", "d10", "d12", "d20"];

// Die image paths (no d20-clean.png available)
const DIE_IMAGE: Partial<Record<DieSize, string>> = {
  d4:  "/images/dice/d4-clean.png",
  d6:  "/images/dice/d6-clean.png",
  d8:  "/images/dice/d8-clean.png",
  d10: "/images/dice/d10-clean.png",
  d12: "/images/dice/d12-clean.png",
};

function CustomRollTray({ onRoll, characterName }: { onRoll: () => void; characterName?: string }) {
  const { stageRoll, isRolling } = useDiceStore();
  const [counts, setCounts] = useState<Record<DieSize, number>>({
    d4: 0, d6: 0, d8: 0, d10: 0, d12: 0, d20: 0,
  });
  const [modifier, setModifier] = useState(0);

  const adjust = (size: DieSize, delta: number) => {
    setCounts((prev) => ({
      ...prev,
      [size]: Math.max(0, Math.min(9, (prev[size] ?? 0) + delta)),
    }));
  };

  const totalDice = Object.values(counts).reduce((s, c) => s + c, 0);

  const handleRoll = () => {
    if (totalDice === 0 || isRolling) return;
    const dice: DieSpec[] = [];
    for (const size of ALL_SIZES) {
      const n = counts[size];
      for (let i = 0; i < n; i++) {
        dice.push({ size, role: characterName === "GM" ? "gm" : "generic", label: size });
      }
    }
    stageRoll({
      label:    characterName ? `${characterName} Roll` : "Custom Roll",
      type:     "generic",
      dice,
      modifier: modifier || undefined,
      ...(characterName ? { characterName } : {}),
    });
    onRoll();
  };

  return (
    <div className="border-t border-[#577399]/20 px-3 py-3 space-y-3 bg-slate-950/40">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-[#577399]">
        Custom Roll
      </p>

      {/* Die image selectors */}
      <div className="flex flex-wrap gap-2">
        {ALL_SIZES.map((size) => {
          const imgSrc = DIE_IMAGE[size];
          const count = counts[size];
          const active = count > 0;
          return (
            <div key={size} className="flex flex-col items-center gap-0.5">
              {/* Tap to add */}
              <button
                type="button"
                onClick={() => adjust(size, 1)}
                disabled={count >= 9 || isRolling}
                aria-label={`Add a ${size}`}
                className={[
                  "relative flex h-10 w-10 items-center justify-center rounded-lg border transition-all duration-150",
                  "focus:outline-none focus:ring-1 focus:ring-[#577399]",
                  active
                    ? "border-[#577399] bg-[#577399]/20"
                    : "border-[#577399]/25 bg-slate-900/60 hover:border-[#577399]/60 hover:bg-[#577399]/10",
                  count >= 9 || isRolling ? "opacity-30 cursor-not-allowed" : "cursor-pointer",
                ].join(" ")}
              >
                {imgSrc ? (
                  <img
                    src={imgSrc}
                    alt={size}
                    className={["h-7 w-7 object-contain select-none", active ? "opacity-100" : "opacity-60"].join(" ")}
                    draggable={false}
                  />
                ) : (
                  <span className="text-[9px] font-bold text-[#b9baa3]">{size}</span>
                )}
                {count > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-[#577399] px-0.5 text-[8px] font-bold text-white leading-none">
                    {count}
                  </span>
                )}
              </button>
              {/* Label + minus */}
              <div className="flex items-center gap-0.5">
                {count > 0 && (
                  <button
                    type="button"
                    onClick={() => adjust(size, -1)}
                    disabled={count === 0 || isRolling}
                    aria-label={`Remove a ${size}`}
                    className="flex h-3.5 w-3.5 items-center justify-center rounded text-[#b9baa3] border border-[#577399]/30 hover:border-[#577399] hover:text-[#f7f7ff] disabled:opacity-30 text-[9px] transition-colors focus:outline-none focus:ring-1 focus:ring-[#577399]"
                  >−</button>
                )}
                <span className="text-[8px] text-[#b9baa3]">{size}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modifier */}
      <div className="flex items-center gap-2">
        <label className="text-[10px] text-[#b9baa3] uppercase tracking-wider">Modifier</label>
        <input
          type="number"
          value={modifier}
          onChange={(e) => setModifier(parseInt(e.target.value, 10) || 0)}
          aria-label="Flat modifier"
          className="w-14 rounded border border-[#577399]/30 bg-slate-900 px-1.5 py-0.5 text-xs text-center text-[#f7f7ff] focus:outline-none focus:ring-1 focus:ring-[#577399] [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
        />
      </div>

      {/* Roll button */}
      <button
        type="button"
        onClick={handleRoll}
        disabled={totalDice === 0 || isRolling}
        aria-label="Roll custom dice"
        className="w-full rounded-lg border border-[#577399]/40 bg-[#577399]/15 px-3 py-1.5 text-xs font-semibold text-[#f7f7ff] hover:bg-[#577399]/25 disabled:opacity-30 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-[#577399]"
      >
        {isRolling ? "Rolling…" : totalDice === 0 ? "Pick dice above" : `Roll ${totalDice} ${totalDice === 1 ? "die" : "dice"}`}
      </button>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function DiceLog({ characterName }: { characterName?: string } = {}) {
  const { log, clearLog } = useDiceStore();
  const [isExpanded,    setIsExpanded]    = useState(false);
  const [selectedId,    setSelectedId]    = useState<string | null>(null);
  const [showCustom,    setShowCustom]    = useState(false);

  // Auto-expand when a new roll arrives and auto-select the latest
  const lastId = log[0]?.id;
  const prevLastIdRef = React.useRef<string | null>(null);
  React.useEffect(() => {
    if (lastId && lastId !== prevLastIdRef.current) {
      prevLastIdRef.current = lastId;
      setSelectedId(lastId);
      setIsExpanded(true);
    }
  }, [lastId]);

  // Always render — the FAB gives access to the custom roll tray
  // even when the log is empty.

  return (
    <div
      className="fixed bottom-4 left-4 z-40 flex flex-col items-start"
      aria-label="Dice roll log"
    >
      {/* Expanded panel */}
      {isExpanded && (
        <div
          className="
            mb-2 w-64 rounded-xl border border-[#577399]/30
            bg-[#0d1610] shadow-2xl
            flex flex-col overflow-hidden
            max-h-[70vh]
          "
        >
          {/* Panel header */}
          <div className="flex items-center justify-between border-b border-[#577399]/20 px-3 py-2">
            <span className="text-xs font-semibold uppercase tracking-widest text-[#577399]">
              Dice Log
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setShowCustom((v) => !v)}
                aria-label={showCustom ? "Hide custom roll" : "Custom roll"}
                aria-pressed={showCustom}
                title="Custom roll"
                className={[
                  "rounded px-2 py-0.5 text-[10px] font-semibold transition-colors focus:outline-none focus:ring-1 focus:ring-[#577399]",
                  showCustom
                    ? "bg-[#577399]/20 text-[#577399]"
                    : "text-[#b9baa3]/60 hover:text-[#f7f7ff] hover:bg-[#577399]/10",
                ].join(" ")}
              >
                + Custom
              </button>
              {log.length > 0 && (
                <button
                  type="button"
                  onClick={clearLog}
                  aria-label="Clear dice log"
                  className="rounded px-2 py-0.5 text-[10px] font-semibold text-[#b9baa3]/60 hover:text-[#fe5f55] hover:bg-[#fe5f55]/10 transition-colors focus:outline-none focus:ring-1 focus:ring-[#fe5f55]"
                >
                  Clear
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsExpanded(false)}
                aria-label="Collapse dice log"
                className="rounded p-0.5 text-[#b9baa3]/60 hover:text-[#f7f7ff] transition-colors focus:outline-none focus:ring-1 focus:ring-[#577399]"
              >
                <svg aria-hidden="true" viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
                  <path d="M4 10l4-4 4 4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
          </div>

          {/* Custom roll tray */}
          {showCustom && (
            <CustomRollTray onRoll={() => setShowCustom(false)} characterName={characterName} />
          )}

          {/* Roll list */}
          <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1.5">
            {log.length === 0 ? (
              <p className="text-xs text-[#b9baa3]/50 italic text-center py-4">
                No rolls yet.
              </p>
            ) : (
              log.map((result) => (
                <div key={result.id}>
                  <LogEntry
                    result={result}
                    isSelected={selectedId === result.id}
                    onClick={() =>
                      setSelectedId((prev) => (prev === result.id ? null : result.id))
                    }
                  />
                  {selectedId === result.id && (
                    <LogEntryDetail result={result} />
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Collapse toggle button */}
      <button
        type="button"
        onClick={() => setIsExpanded((v) => !v)}
        aria-label={isExpanded ? "Collapse dice log" : "Open dice log"}
        aria-expanded={isExpanded}
        className="
          relative flex h-10 w-10 items-center justify-center rounded-full
          border border-[#577399]/40 bg-[#0d1610] shadow-lg
          text-[#577399] hover:border-[#577399] hover:text-[#f7f7ff] hover:bg-[#0f1d17]
          transition-all duration-150
          focus:outline-none focus:ring-2 focus:ring-[#577399]
        "
      >
        <DieIcon className="h-[26px] w-[26px]" />
        {/* Roll count badge */}
        {log.length > 0 && (
          <span
            aria-hidden="true"
            className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#577399] px-1 text-[9px] font-bold text-white leading-none"
          >
            {log.length > 99 ? "99+" : log.length}
          </span>
        )}
      </button>
    </div>
  );
}
