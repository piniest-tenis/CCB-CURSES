/**
 * src/hooks/useGameWebSocket.ts
 *
 * WebSocket hook for the Daggerheart campaign game channel.
 *
 * - Connects to NEXT_PUBLIC_WS_URL with ?token=&campaignId=&characterId= params.
 * - Auto-reconnects on disconnect with exponential backoff (max 3 retries).
 * - Handles incoming PingEvent messages and dispatches to caller.
 * - Cleans up WebSocket on unmount.
 * - Only connects when campaignId, characterId, and idToken are all truthy.
 */

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuthStore } from "@/store/authStore";
import type { PingEvent } from "@/types/campaign";
import type { RollResult } from "@/types/dice";

// ─── Constants ────────────────────────────────────────────────────────────────

const WS_BASE_URL = process.env.NEXT_PUBLIC_WS_URL ?? "";
const MAX_RECONNECT_ATTEMPTS = 3;
const BASE_BACKOFF_MS = 1_000; // 1s → 2s → 4s

// ─── Types ────────────────────────────────────────────────────────────────────

/** Inbound force_crit event broadcast to all campaign connections. */
export interface ForceCritEvent {
  type: "force_crit";
  campaignId: string;
  targetCharacterId: string;
  /** true = armed, false = disarmed */
  active: boolean;
}

export interface UseGameWebSocketOptions {
  onPing?: (event: PingEvent) => void;
  /** Called when a dice roll result is broadcast from another client */
  onDiceRoll?: (result: RollResult) => void;
  /** Called when the GM arms or disarms a force-crit for a character */
  onForceCrit?: (event: ForceCritEvent) => void;
}

export interface UseGameWebSocketReturn {
  /**
   * Send a ping to a specific character's sheet field.
   * @param targetCharacterId - The character ID of the player being pinged.
   * @param fieldKey          - The data-field-key of the sheet element to highlight.
   */
  sendPing: (targetCharacterId: string, fieldKey: string) => void;
  /** Broadcast a dice roll result to all campaign participants */
  sendDiceRoll: (result: RollResult) => void;
  /**
   * GM only: arm or disarm a forced critical for a character's next roll.
   * @param targetCharacterId - The character whose next roll will be forced.
   * @param active            - true to arm, false to disarm.
   */
  sendForceCrit: (targetCharacterId: string, active: boolean) => void;
  isConnected: boolean;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useGameWebSocket(
  campaignId: string,
  characterId: string,
  options?: UseGameWebSocketOptions
): UseGameWebSocketReturn {
  const idToken = useAuthStore((state) => state.idToken);

  const wsRef             = useRef<WebSocket | null>(null);
  const reconnectCountRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isUnmountedRef    = useRef(false);

  // Keep options callback fresh without re-running connect effect
  const onPingRef       = useRef(options?.onPing);
  const onDiceRollRef   = useRef(options?.onDiceRoll);
  const onForceCritRef  = useRef(options?.onForceCrit);
  useEffect(() => { onPingRef.current      = options?.onPing;      }, [options?.onPing]);
  useEffect(() => { onDiceRollRef.current  = options?.onDiceRoll;  }, [options?.onDiceRoll]);
  useEffect(() => { onForceCritRef.current = options?.onForceCrit; }, [options?.onForceCrit]);

  const [isConnected, setIsConnected] = useState(false);

  // ── connect ─────────────────────────────────────────────────────────────────
  const connect = useCallback(() => {
    if (!campaignId || !characterId || !idToken || !WS_BASE_URL) return;
    if (isUnmountedRef.current) return;

    const url = new URL(WS_BASE_URL);
    url.searchParams.set("token",       idToken);
    url.searchParams.set("campaignId",  campaignId);
    url.searchParams.set("characterId", characterId);

    const ws = new WebSocket(url.toString());
    wsRef.current = ws;

    ws.onopen = () => {
      if (isUnmountedRef.current) { ws.close(); return; }
      setIsConnected(true);
      reconnectCountRef.current = 0; // reset backoff on successful connect
    };

    ws.onmessage = (evt: MessageEvent) => {
      let data: unknown;
      try {
        data = JSON.parse(evt.data as string);
      } catch {
        // Non-JSON frame — silently ignore
        return;
      }

      if (
        data !== null &&
        typeof data === "object" &&
        (data as Record<string, unknown>).type === "ping"
      ) {
        onPingRef.current?.(data as PingEvent);
      }

      if (
        data !== null &&
        typeof data === "object" &&
        (data as Record<string, unknown>).type === "dice_roll"
      ) {
        const payload = (data as Record<string, unknown>).result as RollResult;
        if (payload) onDiceRollRef.current?.(payload);
      }

      if (
        data !== null &&
        typeof data === "object" &&
        (data as Record<string, unknown>).type === "force_crit"
      ) {
        onForceCritRef.current?.(data as ForceCritEvent);
      }
    };

    ws.onerror = () => {
      // onerror is always followed by onclose — let onclose handle reconnect
    };

    ws.onclose = () => {
      if (isUnmountedRef.current) return;
      setIsConnected(false);

      if (reconnectCountRef.current < MAX_RECONNECT_ATTEMPTS) {
        const delay = BASE_BACKOFF_MS * Math.pow(2, reconnectCountRef.current);
        reconnectCountRef.current += 1;

        reconnectTimerRef.current = setTimeout(() => {
          if (!isUnmountedRef.current) connect();
        }, delay);
      }
    };
  }, [campaignId, characterId, idToken]);

  // ── lifecycle ────────────────────────────────────────────────────────────────
  useEffect(() => {
    isUnmountedRef.current = false;

    if (campaignId && characterId && idToken) {
      connect();
    }

    return () => {
      isUnmountedRef.current = true;

      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }

      if (wsRef.current) {
        wsRef.current.onclose = null; // prevent reconnect logic on intentional close
        wsRef.current.close();
        wsRef.current = null;
      }

      setIsConnected(false);
    };
  }, [campaignId, characterId, idToken, connect]);

  // ── sendPing ─────────────────────────────────────────────────────────────────
  // GMs call this to ping a specific player character's sheet field.
  // targetCharacterId is the character the GM is currently viewing (not the GM's own).
  const sendPing = useCallback(
    (targetCharacterId: string, fieldKey: string) => {
      const ws = wsRef.current;
      if (!ws || ws.readyState !== WebSocket.OPEN) return;

      const message = {
        action:            "ping",
        campaignId,
        targetCharacterId,
        fieldKey,
      };

      try {
        ws.send(JSON.stringify(message));
      } catch {
        // Send failed — connection dropped between check and send
      }
    },
    [campaignId]
  );

  // ── sendDiceRoll ──────────────────────────────────────────────────────────────
  // Broadcasts a resolved roll result to all campaign participants via WebSocket.
  const sendDiceRoll = useCallback(
    (result: RollResult) => {
      const ws = wsRef.current;
      if (!ws || ws.readyState !== WebSocket.OPEN) return;

      const message = {
        action:     "dice_roll",
        campaignId,
        characterId,
        result,
      };

      try {
        ws.send(JSON.stringify(message));
      } catch {
        // Send failed — connection dropped between check and send
      }
    },
    [campaignId, characterId]
  );

  // ── sendForceCrit ─────────────────────────────────────────────────────────────
  // GM only: arms or disarms a forced critical for a character's next roll.
  const sendForceCrit = useCallback(
    (targetCharacterId: string, active: boolean) => {
      const ws = wsRef.current;
      if (!ws || ws.readyState !== WebSocket.OPEN) return;

      const message = {
        action: "force_crit",
        campaignId,
        targetCharacterId,
        active,
      };

      try {
        ws.send(JSON.stringify(message));
      } catch {
        // Send failed — connection dropped between check and send
      }
    },
    [campaignId]
  );

  return { sendPing, sendDiceRoll, sendForceCrit, isConnected };
}
