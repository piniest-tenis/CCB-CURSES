"use client";

/**
 * src/hooks/useUnsavedChanges.ts
 *
 * Tracks whether a homebrew form has unsaved changes and:
 *   1. Shows a native browser "Leave site?" dialog on `beforeunload`
 *   2. Optionally persists the latest form snapshot to `sessionStorage`
 *      so that accidental refreshes don't lose work.
 *
 * Usage:
 *   const { markDirty, markClean, isDirty, loadDraft, clearDraft } =
 *     useUnsavedChanges("homebrew-ancestry-new");
 *
 *   // Call markDirty() on every meaningful field change.
 *   // Call markClean() right before or after a successful submit.
 *   // Call loadDraft<T>() on mount to restore a previous session.
 */

import { useCallback, useEffect, useRef, useState } from "react";

interface UseUnsavedChangesOptions {
  /** SessionStorage key for draft persistence. Omit to disable drafts. */
  storageKey?: string;
  /** How many ms to debounce before writing to sessionStorage. Default 1000. */
  debounceMs?: number;
}

export function useUnsavedChanges(opts: UseUnsavedChangesOptions = {}) {
  const { storageKey, debounceMs = 1_000 } = opts;
  const [isDirty, setIsDirty] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── beforeunload guard ──────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (!isDirty) return;
      e.preventDefault();
      // Chrome requires returnValue to be set (even though the value is ignored).
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  // ── Mark form as dirty (with optional draft save) ───────────────────────
  const markDirty = useCallback(
    <T,>(snapshot?: T) => {
      setIsDirty(true);
      if (storageKey && snapshot !== undefined) {
        // Debounce the sessionStorage write
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
          try {
            sessionStorage.setItem(storageKey, JSON.stringify(snapshot));
          } catch {
            // Storage quota exceeded — silently ignore
          }
        }, debounceMs);
      }
    },
    [storageKey, debounceMs],
  );

  // ── Mark form as clean (e.g. after successful save) ─────────────────────
  const markClean = useCallback(() => {
    setIsDirty(false);
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  // ── Load a persisted draft from sessionStorage ──────────────────────────
  const loadDraft = useCallback(<T,>(): T | null => {
    if (!storageKey) return null;
    try {
      const raw = sessionStorage.getItem(storageKey);
      if (!raw) return null;
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }, [storageKey]);

  // ── Clear the stored draft ──────────────────────────────────────────────
  const clearDraft = useCallback(() => {
    if (storageKey) {
      try {
        sessionStorage.removeItem(storageKey);
      } catch {
        // ignore
      }
    }
  }, [storageKey]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return { isDirty, markDirty, markClean, loadDraft, clearDraft } as const;
}
