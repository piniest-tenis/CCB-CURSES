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

// ─── Constants ────────────────────────────────────────────────────────────────

const WS_BASE_URL = process.env.NEXT_PUBLIC_WS_URL ?? "";
const MAX_RECONNECT_ATTEMPTS = 3;
const BASE_BACKOFF_MS = 1_000; // 1s → 2s → 4s

// ─── Types ────────────────────────────────────────────────────────────────────

export interface UseGameWebSocketOptions {
  onPing?: (event: PingEvent) => void;
}

export interface UseGameWebSocketReturn {
  /** Send a ping targeting this session's character at the given field key. */
  sendPing: (fieldKey: string) => void;
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
  const onPingRef = useRef(options?.onPing);
  useEffect(() => { onPingRef.current = options?.onPing; }, [options?.onPing]);

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
  const sendPing = useCallback(
    (fieldKey: string) => {
      const ws = wsRef.current;
      if (!ws || ws.readyState !== WebSocket.OPEN) return;

      const message = {
        action:      "ping",
        campaignId,
        characterId,
        fieldKey,
      };

      try {
        ws.send(JSON.stringify(message));
      } catch {
        // Send failed — connection dropped between check and send
      }
    },
    [campaignId, characterId]
  );

  return { sendPing, isConnected };
}
