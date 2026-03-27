"use client";

/**
 * src/app/obs/dice-log/DiceLogOverlayClient.tsx
 *
 * OBS-compatible dice log overlay.
 * Receives roll events from the main app via BroadcastChannel("dh-dice-log").
 * Shows the last 10 rolls, newest at top.
 *
 * Designed for transparent OBS Browser Source at 380×500px.
 */

import React, { useEffect, useState } from "react";
import type { RollResult, ActionOutcome } from "@/types/dice";

// ─── Outcome helpers ──────────────────────────────────────────────────────────

const OUTCOME_SHORT: Record<ActionOutcome, string> = {
  "critical": "CRIT ✦",
};

const OUTCOME_COLOR: Record<ActionOutcome, string> = {
  "critical": "#FFD700",
};

// ─── Log entry ────────────────────────────────────────────────────────────────

function LogRow({ result }: { result: RollResult }) {
  const { request, total, outcome, hopeValue, fearValue, dice } = result;
  const timeStr = new Date(result.timestamp).toLocaleTimeString([], {
    hour:   "2-digit",
    minute: "2-digit",
  });
  const diceLabel = dice.map((d) => d.size).join("+");
  const mod       = request.modifier ?? 0;

  return (
    <div
      className="rounded-xl border border-[#577399]/25 px-3 py-2.5 space-y-1.5"
      style={{ background: "rgba(13,22,16,0.90)" }}
    >
      {/* Top row: label + time */}
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-bold text-[#f7f7ff] truncate">{request.label}</p>
        <span className="text-[9px] text-[#b9baa3] shrink-0">{timeStr}</span>
      </div>

      {/* Die breakdown */}
      <div className="flex flex-wrap items-center gap-1.5">
        {dice.map((d, i) => {
          const isHope = d.role === "hope";
          const isFear = d.role === "fear";
          return (
            <span
              key={i}
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
          );
        })}
        {mod !== 0 && (
          <span className="text-xs font-bold text-[#b9baa3]">
            {mod > 0 ? "+" : ""}{mod}
          </span>
        )}
        <span className="text-lg font-bold text-[#f7f7ff] ml-1">= {total}</span>
      </div>

      {/* Hope vs Fear inline */}
      {hopeValue !== undefined && fearValue !== undefined && (
        <p className="text-[10px]">
          <span style={{ color: "#DAA520" }}>Hope {hopeValue}</span>
          <span className="text-[#b9baa3]"> · </span>
          <span style={{ color: "#9BB5CC" }}>Fear {fearValue}</span>
        </p>
      )}

      {/* Outcome */}
      {outcome && (
        <p
          className="text-sm font-bold font-serif"
          style={{ color: OUTCOME_COLOR[outcome] }}
        >
          {OUTCOME_SHORT[outcome]}
        </p>
      )}
    </div>
  );
}

// ─── Main client ──────────────────────────────────────────────────────────────

const MAX_LOG = 10;

export default function DiceLogOverlayClient() {
  const [log, setLog] = useState<RollResult[]>([]);

  useEffect(() => {
    if (typeof window === "undefined" || !("BroadcastChannel" in window)) return;

    const ch = new BroadcastChannel("dh-dice-log");
    ch.onmessage = (evt) => {
      if (evt.data?.type === "ROLL_RESULT" && evt.data.result) {
        const result = evt.data.result as RollResult;
        setLog((prev) => [result, ...prev].slice(0, MAX_LOG));
      }
    };
    return () => ch.close();
  }, []);

  return (
    <div
      className="w-screen h-screen overflow-hidden p-3 flex flex-col gap-2"
      style={{ background: "transparent" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <span
          className="text-xs font-bold uppercase tracking-widest"
          style={{ color: "#577399" }}
        >
          Dice Log
        </span>
        {log.length === 0 && (
          <span className="text-[10px] text-[#b9baa3]/50 italic">No rolls yet</span>
        )}
      </div>

      {/* Log entries */}
      <div className="flex flex-col gap-2 overflow-hidden">
        {log.map((result) => (
          <LogRow key={result.id} result={result} />
        ))}
      </div>
    </div>
  );
}
