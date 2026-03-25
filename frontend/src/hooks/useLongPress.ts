/**
 * src/hooks/useLongPress.ts
 *
 * Returns pointer-event handlers that fire an `onLongPress` callback after
 * the pointer has been held for `delay` ms without moving more than `threshold`
 * pixels.  Intended for GM "ping" interaction on touch devices.
 *
 * Behaviour:
 *  - Sets `data-long-press-active="true"` on `document.body` while the timer
 *    is pending (allows global CSS feedback ring).
 *  - Cancels the timer on pointer-move > threshold px, pointer-up, or
 *    pointer-cancel.
 *  - `e.preventDefault()` is called only for touch events to avoid interfering
 *    with the native right-click context menu on desktop.
 */

import { useCallback, useRef } from "react";

export interface LongPressOptions {
  /** Duration in ms before the long-press fires. Default: 500. */
  delay?: number;
  /** Movement budget in px before the press is cancelled. Default: 8. */
  threshold?: number;
}

export interface LongPressHandlers {
  onPointerDown: (e: React.PointerEvent) => void;
  onPointerMove: (e: React.PointerEvent) => void;
  onPointerUp: (e: React.PointerEvent) => void;
  onPointerCancel: (e: React.PointerEvent) => void;
}

export function useLongPress(
  onLongPress: (e: React.PointerEvent) => void,
  { delay = 500, threshold = 8 }: LongPressOptions = {}
): LongPressHandlers {
  const timerRef   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startRef   = useRef<{ x: number; y: number } | null>(null);
  const eventRef   = useRef<React.PointerEvent | null>(null);

  const cancel = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    startRef.current = null;
    eventRef.current = null;
    document.body.removeAttribute("data-long-press-active");
  }, []);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      // Only respond to primary pointer (touch / left-button pen)
      if (e.pointerType === "mouse") return;

      // Prevent scroll during hold on touch
      if (e.pointerType === "touch") e.preventDefault();

      startRef.current = { x: e.clientX, y: e.clientY };
      eventRef.current = e;
      document.body.setAttribute("data-long-press-active", "true");

      timerRef.current = setTimeout(() => {
        if (eventRef.current) {
          onLongPress(eventRef.current);
        }
        cancel();
      }, delay);
    },
    [onLongPress, delay, cancel]
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!startRef.current || e.pointerType === "mouse") return;
      const dx = e.clientX - startRef.current.x;
      const dy = e.clientY - startRef.current.y;
      if (Math.sqrt(dx * dx + dy * dy) > threshold) {
        cancel();
      }
    },
    [cancel, threshold]
  );

  const onPointerUp     = useCallback(() => cancel(), [cancel]);
  const onPointerCancel = useCallback(() => cancel(), [cancel]);

  return { onPointerDown, onPointerMove, onPointerUp, onPointerCancel };
}
