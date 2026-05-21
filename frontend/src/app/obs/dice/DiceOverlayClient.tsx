"use client";

/**
 * src/app/obs/dice/DiceOverlayClient.tsx
 *
 * OBS transparent overlay — full-bleed 3D dice canvas, nothing else.
 *
 * Flow:
 *   1. Reads ?campaign=<id>.
 *   2a. Connects to WebSocket as obs observer (?campaignId=<id>&role=obs).
 *       On dice_roll message → playAnimation(req, rawValues).
 *   2b. Also subscribes to BroadcastChannel "dh-dice-<id>" as same-browser fallback.
 *       playAnimation does not broadcast, so there is no echo loop.
 *       DiceRoller calls finishAnimation() when physics settle — no result
 *       computed, no ROLL_RESULT emitted, log untouched.
 *   3. When animation completes: hold 3 s → 1 s CSS fade-out → opacity 0
 *   4. On a critical roll (both d12s match): goldenrod inset glow pulses
 *      over the canvas during rolling + holding, then fades out with the rest.
 *
 * The DiceRoller canvas fills 100vw × 100vh with no border, no rounded corners.
 */

import React, { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { DiceRoller } from "@/components/dice/DiceRoller";
import { useDiceStore } from "@/store/diceStore";
import type { DieRole, RollResult } from "@/types/dice";

type ColorOverrides = Record<DieRole, { dice_color: string; label_color: string }>;

const WS_BASE_URL = process.env.NEXT_PUBLIC_WS_URL ?? "";
const BASE_BACKOFF_MS = 1_000;
const MAX_BACKOFF_MS  = 30_000; // cap at 30 s between retries
// AWS API Gateway WebSocket connections idle-timeout at 10 minutes.
// Send a keepalive ping every 9 minutes to prevent the connection from
// being silently closed during a long stream session.
const KEEPALIVE_INTERVAL_MS = 9 * 60 * 1_000;

// Goldenrod crit glow colour
const CRIT_COLOR = "218, 165, 32"; // RGB components of #DAA520

type FadeState = "idle" | "rolling" | "holding" | "fading";

export default function DiceOverlayClient() {
  const searchParams = useSearchParams();
  const campaignId   = searchParams?.get("campaign") ?? null;
  const channelName  = campaignId ? `dh-dice-${campaignId}` : "dh-dice";

  const isRolling    = useDiceStore((s) => s.isRolling);
  const [fade, setFade]   = useState<FadeState>("idle");
  const [isCrit, setIsCrit] = useState(false);
  const [colorOverrides, setColorOverrides] = useState<ColorOverrides | undefined>(undefined);
  const timerRef     = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevRolling  = useRef(false);

  // ── Shared handler for incoming roll results (WS or BroadcastChannel) ────────
  function handleRollResult(result: RollResult, colors?: ColorOverrides) {
    setIsCrit(result.outcome === "critical");
    if (colors) setColorOverrides(colors);
    const rawValues = result.dice.map((d) => d.value);
    useDiceStore.getState().playAnimation(result.request, rawValues);
  }

  // ── WebSocket connection (obs observer — unauthenticated) ─────────────────────
  useEffect(() => {
    if (typeof window === "undefined" || !campaignId || !WS_BASE_URL) return;

    let ws: WebSocket | null = null;
    let reconnectCount = 0;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let keepaliveTimer: ReturnType<typeof setInterval> | null = null;
    let unmounted = false;

    function connect() {
      if (unmounted) return;

      const url = new URL(WS_BASE_URL);
      url.searchParams.set("campaignId", campaignId!);
      url.searchParams.set("role", "obs");

      ws = new WebSocket(url.toString());

      ws.onopen = () => {
        if (unmounted) { ws?.close(); return; }
        reconnectCount = 0; // reset backoff on successful connect

        // Keepalive: send a ping frame every 9 minutes so API Gateway doesn't
        // idle-close the connection during a long OBS session.
        if (keepaliveTimer) clearInterval(keepaliveTimer);
        keepaliveTimer = setInterval(() => {
          if (ws && ws.readyState === WebSocket.OPEN) {
            try { ws.send(JSON.stringify({ action: "ping" })); } catch { /* ignore */ }
          }
        }, KEEPALIVE_INTERVAL_MS);
      };

      ws.onmessage = (evt: MessageEvent) => {
        try {
          const data = JSON.parse(evt.data as string) as Record<string, unknown>;
          if (data.type === "dice_roll" && data.result) {
            const colors = data.colorOverrides as ColorOverrides | undefined;
            handleRollResult(data.result as RollResult, colors);
          }
        } catch {
          // non-JSON frame — ignore
        }
      };

      ws.onclose = () => {
        if (unmounted) return;
        if (keepaliveTimer) { clearInterval(keepaliveTimer); keepaliveTimer = null; }
        // Retry indefinitely with exponential backoff capped at MAX_BACKOFF_MS.
        // This handles both transient failures and AWS's 2-hour forced disconnect.
        const delay = Math.min(BASE_BACKOFF_MS * Math.pow(2, reconnectCount), MAX_BACKOFF_MS);
        reconnectCount += 1;
        reconnectTimer = setTimeout(connect, delay);
      };

      ws.onerror = () => {
        // handled by onclose
      };
    }

    connect();

    return () => {
      unmounted = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (keepaliveTimer) clearInterval(keepaliveTimer);
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
    ch.onmessage = (evt: MessageEvent) => {
      if (evt.data?.type === "ROLL_RESULT" && evt.data.result) {
        handleRollResult(evt.data.result as RollResult);
      }
    };

    return () => ch.close();
  }, [channelName]);

  // Opacity lifecycle: idle(0) → rolling(1) → holding(1) → fading(0)
  useEffect(() => {
    if (isRolling && !prevRolling.current) {
      prevRolling.current = true;
      if (timerRef.current) clearTimeout(timerRef.current);
      setFade("rolling");
    }
    if (!isRolling && prevRolling.current) {
      prevRolling.current = false;
      setFade("holding");
      timerRef.current = setTimeout(() => {
        setFade("fading");
        timerRef.current = setTimeout(() => {
          setFade("idle");
          setIsCrit(false); // reset crit state after full fade
        }, 1000);
      }, 3000);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRolling]);

  // Cleanup timers on unmount
  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  const opacity    = fade === "idle" ? 0 : 1;
  const transition = fade === "fading" ? "opacity 1s ease-out" : "none";

  return (
    <>
      {/* Keyframe for the inset pulse — injected once, no Tailwind needed */}
      <style>{`
        @keyframes crit-pulse {
          0%   { opacity: 0;   box-shadow: inset 0 0 30px 10px rgba(${CRIT_COLOR}, 0.55); }
          15%  { opacity: 0.5;                                                             }
          75%  { opacity: 0.5; box-shadow: inset 0 0 60px 25px rgba(${CRIT_COLOR}, 0.85); }
          100% { opacity: 0;   box-shadow: inset 0 0 30px 10px rgba(${CRIT_COLOR}, 0.55); }
        }
      `}</style>

      <div
        style={{
          position:   "fixed",
          inset:      0,
          background: "transparent",
          overflow:   "hidden",
          opacity,
          transition,
        }}
      >
        <DiceRoller fullBleed transparent animationOnly colorOverrides={colorOverrides} />

        {/* Goldenrod inset glow — only visible on crit */}
        <div
          aria-hidden="true"
          style={{
            position:      "absolute",
            inset:         0,
            pointerEvents: "none",
            animation:     (isCrit && fade !== "idle") ? "crit-pulse 1.4s ease-in-out infinite" : "none",
          }}
        />
      </div>
    </>
  );
}
