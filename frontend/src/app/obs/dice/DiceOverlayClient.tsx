"use client";

/**
 * src/app/obs/dice/DiceOverlayClient.tsx
 *
 * OBS-compatible transparent overlay that shows the 3D dice animation
 * and the last roll result. Receives roll events from the main app via
 * BroadcastChannel("dh-dice-log").
 *
 * Layout: 800×400 canvas with result panel on the right side.
 */

import React, { useEffect, useState } from "react";
import { DiceRoller } from "@/components/dice/DiceRoller";
import { useDiceStore } from "@/store/diceStore";
import type { RollResult, ActionOutcome } from "@/types/dice";

// ─── Outcome display ──────────────────────────────────────────────────────────

const OUTCOME_LABEL: Record<ActionOutcome, string> = {
  "critical": "CRITICAL!",
};

const OUTCOME_COLOR: Record<ActionOutcome, string> = {
  "critical": "#FFD700",
};

// ─── Result display ───────────────────────────────────────────────────────────

function OverlayResult({ result }: { result: RollResult }) {
  const { request, total, outcome, hopeValue, fearValue } = result;
  const outcomeColor = outcome ? OUTCOME_COLOR[outcome] : "#f7f7ff";

  return (
    <div
      className="flex flex-col items-center justify-center gap-2 px-4 py-4 rounded-xl h-full"
      style={{ background: "rgba(10,16,13,0.85)" }}
    >
      <p className="text-xs font-semibold uppercase tracking-widest text-[#b9baa3] text-center">
        {request.label}
      </p>

      {/* Hope / Fear pips */}
      {(hopeValue !== undefined || fearValue !== undefined) && (
        <div className="flex gap-3">
          {hopeValue !== undefined && (
            <div className="flex flex-col items-center gap-1">
              <span
                className="h-12 w-12 rounded-full flex items-center justify-center text-xl font-bold border-2"
                style={{ background: "#DAA520", borderColor: "#DAA520", color: "#36454F" }}
              >
                {hopeValue}
              </span>
              <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: "#DAA520" }}>
                Hope
              </span>
            </div>
          )}
          {fearValue !== undefined && (
            <div className="flex flex-col items-center gap-1">
              <span
                className="h-12 w-12 rounded-full flex items-center justify-center text-xl font-bold border-2"
                style={{ background: "#36454F", borderColor: "#36454F", color: "#DAA520" }}
              >
                {fearValue}
              </span>
              <span className="text-[9px] font-bold uppercase tracking-wider text-[#b9baa3]">
                Fear
              </span>
            </div>
          )}
        </div>
      )}

      {/* Outcome label */}
      {outcome && (
        <p
          className="text-xl font-bold font-serif text-center leading-tight"
          style={{ color: outcomeColor }}
        >
          {OUTCOME_LABEL[outcome]}
        </p>
      )}

      {/* Total */}
      <p className="text-4xl font-bold font-serif text-[#f7f7ff] leading-none">
        {total}
      </p>
    </div>
  );
}

// ─── Main client ──────────────────────────────────────────────────────────────

export default function DiceOverlayClient() {
  const { lastResult } = useDiceStore();
  const [broadcastResult, setBroadcastResult] = useState<RollResult | null>(null);

  // Listen for rolls broadcast from the main app window
  useEffect(() => {
    if (typeof window === "undefined" || !("BroadcastChannel" in window)) return;

    const ch = new BroadcastChannel("dh-dice-log");
    ch.onmessage = (evt) => {
      if (evt.data?.type === "ROLL_RESULT" && evt.data.result) {
        setBroadcastResult(evt.data.result as RollResult);
      }
    };
    return () => ch.close();
  }, []);

  // Prefer live store result (same-page rolls), fall back to broadcast
  const displayResult = lastResult ?? broadcastResult;

  return (
    <div
      className="w-screen h-screen overflow-hidden flex"
      style={{ background: "transparent" }}
    >
      {/* Dice canvas — takes most of the width */}
      <div className="flex-1">
        <DiceRoller height={400} transparent width={600} />
      </div>

      {/* Result panel — right 200px */}
      <div className="w-[200px] shrink-0 flex items-center justify-center">
        {displayResult ? (
          <OverlayResult result={displayResult} />
        ) : (
          <div
            className="flex items-center justify-center w-full h-full rounded-xl"
            style={{ background: "rgba(10,16,13,0.6)" }}
          >
            <p className="text-xs text-[#b9baa3]/50 text-center px-4">
              Waiting for a roll…
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
