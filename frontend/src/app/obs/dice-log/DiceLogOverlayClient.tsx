"use client";

/**
 * src/app/obs/dice-log/DiceLogOverlayClient.tsx
 *
 * OBS-compatible dice log overlay.
 * Receives roll events via:
 *   1. WebSocket (obs observer connection) — works in OBS, incognito, any context.
 *   2. BroadcastChannel("dh-dice-<campaignId>") — same-browser fallback only.
 * Shows the last 10 rolls, newest at top. Displays character name prominently.
 *
 * Designed for transparent OBS Browser Source at 380×500px.
 */

import React, { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { RollResult, ActionOutcome } from "@/types/dice";

const WS_BASE_URL = process.env.NEXT_PUBLIC_WS_URL ?? "";
const MAX_RECONNECT_ATTEMPTS = 3;
const BASE_BACKOFF_MS = 1_000;

// ─── Outcome helpers ──────────────────────────────────────────────────────────

const OUTCOME_SHORT: Record<ActionOutcome, string> = {
  "critical": "CRIT ✦",
};

const OUTCOME_COLOR: Record<ActionOutcome, string> = {
  "critical": "#FFD700",
};

// ─── Log entry ────────────────────────────────────────────────────────────────

interface LogEntry {
  result: RollResult;
  characterName?: string;
}

function LogRow({ entry }: { entry: LogEntry }) {
  const { result, characterName } = entry;
  const { request, total, outcome, hopeValue, fearValue, dice } = result;
  const timeStr = new Date(result.timestamp).toLocaleTimeString([], {
    hour:   "2-digit",
    minute: "2-digit",
  });
  const mod = request.modifier ?? 0;

  return (
    <div
      className="rounded-xl border border-[#577399]/25 px-3 py-2.5 space-y-1.5"
      style={{ background: "rgba(13,22,16,0.90)" }}
    >
      {/* Character name — prominent if present */}
      {characterName && (
        <p className="text-[11px] font-bold uppercase tracking-widest" style={{ color: "#DAA520" }}>
          {characterName}
        </p>
      )}

      {/* Top row: roll label + time */}
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
  const searchParams = useSearchParams();
  const campaignId   = searchParams?.get("campaign") ?? null;
  const channelName  = campaignId ? `dh-dice-${campaignId}` : "dh-dice";

  const [log, setLog] = useState<LogEntry[]>([]);

  function appendResult(result: RollResult) {
    const characterName = (result.request.characterName as string | undefined) ?? undefined;
    setLog((prev) => [{ result, characterName }, ...prev].slice(0, MAX_LOG));
  }

  // ── WebSocket connection (obs observer — unauthenticated) ─────────────────────
  useEffect(() => {
    if (typeof window === "undefined" || !campaignId || !WS_BASE_URL) return;

    let ws: WebSocket | null = null;
    let reconnectCount = 0;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let unmounted = false;

    function connect() {
      if (unmounted) return;

      const url = new URL(WS_BASE_URL);
      url.searchParams.set("campaignId", campaignId!);
      url.searchParams.set("role", "obs");

      ws = new WebSocket(url.toString());

      ws.onmessage = (evt: MessageEvent) => {
        try {
          const data = JSON.parse(evt.data as string) as Record<string, unknown>;
          if (data.type === "dice_roll" && data.result) {
            appendResult(data.result as RollResult);
          }
        } catch {
          // non-JSON frame — ignore
        }
      };

      ws.onclose = () => {
        if (unmounted) return;
        if (reconnectCount < MAX_RECONNECT_ATTEMPTS) {
          const delay = BASE_BACKOFF_MS * Math.pow(2, reconnectCount);
          reconnectCount += 1;
          reconnectTimer = setTimeout(connect, delay);
        }
      };

      ws.onerror = () => {
        // handled by onclose
      };
    }

    connect();

    return () => {
      unmounted = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (ws) {
        ws.onclose = null;
        ws.close();
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaignId]);

  // ── BroadcastChannel fallback (same-browser-instance only) ───────────────────
  useEffect(() => {
    if (typeof window === "undefined" || !("BroadcastChannel" in window)) return;

    const ch = new BroadcastChannel(channelName);
    ch.onmessage = (evt) => {
      if (evt.data?.type === "ROLL_RESULT" && evt.data.result) {
        appendResult(evt.data.result as RollResult);
      }
    };
    return () => ch.close();
  }, [channelName]);

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
        {log.map((entry) => (
          <LogRow key={entry.result.id} entry={entry} />
        ))}
      </div>
    </div>
  );
}
