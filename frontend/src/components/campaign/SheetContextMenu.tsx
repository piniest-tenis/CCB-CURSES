"use client";

/**
 * src/components/campaign/SheetContextMenu.tsx
 *
 * Custom right-click / long-press context menu for the GM character sheet view.
 * Renders into a React Portal at z-50, viewport-clamped.
 *
 * Items:
 *   • "Ping Player"      — enabled when fieldKey !== null
 *   • "Copy name"        — always enabled (copies characterName to clipboard)
 *
 * Keyboard navigation: ArrowUp/Down move focus, Enter activates, Escape closes.
 * Focus management: first non-disabled item is focused on open; focus returns
 * to the trigger element on close.
 */

import React, {
  useEffect,
  useRef,
  useCallback,
} from "react";
import { createPortal } from "react-dom";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ContextMenuPosition {
  x: number;
  y: number;
}

export interface SheetContextMenuProps {
  position: ContextMenuPosition;
  fieldKey: string | null;
  characterName: string;
  onPing: (fieldKey: string) => void;
  onClose: () => void;
  /** Element to return focus to when the menu closes. */
  triggerRef?: React.RefObject<HTMLElement | null>;
}

// ─── Menu width constant (must match viewport clamp below) ───────────────────

const MENU_WIDTH = 220;
const MENU_OFFSET = 8;

// ─── Component ────────────────────────────────────────────────────────────────

export function SheetContextMenu({
  position,
  fieldKey,
  characterName,
  onPing,
  onClose,
  triggerRef,
}: SheetContextMenuProps) {
  const menuRef   = useRef<HTMLUListElement>(null);
  const hasPing   = fieldKey !== null;

  // Viewport-clamp the left position
  const left = Math.min(
    position.x,
    (typeof window !== "undefined" ? window.innerWidth : 800) - MENU_WIDTH - MENU_OFFSET
  );
  const top = Math.min(
    position.y,
    (typeof window !== "undefined" ? window.innerHeight : 600) - 100
  );

  // Focus the first non-disabled item on mount
  useEffect(() => {
    const first = menuRef.current?.querySelector<HTMLElement>(
      '[role="menuitem"]:not([aria-disabled="true"])'
    );
    first?.focus();
  }, []);

  // Close on outside click or Escape
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        handleClose();
      }
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        const items = Array.from(
          menuRef.current?.querySelectorAll<HTMLElement>(
            '[role="menuitem"]:not([aria-disabled="true"])'
          ) ?? []
        );
        const focused = document.activeElement as HTMLElement;
        const idx = items.indexOf(focused);
        if (e.key === "ArrowDown") {
          items[(idx + 1) % items.length]?.focus();
        } else {
          items[(idx - 1 + items.length) % items.length]?.focus();
        }
      }
    };

    const onPointerDown = (e: PointerEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) {
        handleClose();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleClose = useCallback(() => {
    onClose();
    // Return focus to trigger
    setTimeout(() => {
      triggerRef?.current?.focus();
    }, 0);
  }, [onClose, triggerRef]);

  const handlePing = useCallback(() => {
    if (!fieldKey) return;
    onPing(fieldKey);
    handleClose();
  }, [fieldKey, onPing, handleClose]);

  const handleCopyName = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(characterName);
    } catch {
      // Clipboard unavailable — silently skip
    }
    handleClose();
  }, [characterName, handleClose]);

  const menu = (
    <ul
      ref={menuRef}
      role="menu"
      aria-label="Character sheet actions"
      className="
        fixed z-50 min-w-[220px] rounded-xl
        border border-[#577399]/40 bg-[#0a100d]/95 backdrop-blur-sm
        shadow-2xl py-1 overflow-hidden
      "
      style={{ left, top }}
    >
      {/* Ping Player */}
      <li role="none">
        <button
          role="menuitem"
          aria-disabled={!hasPing}
          tabIndex={hasPing ? 0 : -1}
          onClick={hasPing ? handlePing : undefined}
          className={[
            "flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-left",
            "transition-colors focus:outline-none",
            hasPing
              ? "text-[#f7f7ff] hover:bg-[#577399]/20 focus:bg-[#577399]/20 cursor-pointer"
              : "text-[#b9baa3]/30 cursor-not-allowed",
          ].join(" ")}
        >
          <span aria-hidden="true" className={hasPing ? "text-gold-400" : "text-[#b9baa3]/20"}>
            ♛
          </span>
          Ping Player
          {!hasPing && (
            <span className="ml-auto text-xs text-[#b9baa3]/30">(no field)</span>
          )}
        </button>
      </li>

      {/* Divider */}
      <li role="separator" className="my-1 h-px bg-slate-700/40" />

      {/* Copy character name */}
      <li role="none">
        <button
          role="menuitem"
          tabIndex={0}
          onClick={handleCopyName}
          className="
            flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-left
            text-[#b9baa3] hover:bg-slate-800/60 focus:bg-slate-800/60
            focus:outline-none transition-colors cursor-pointer
          "
        >
          <span aria-hidden="true" className="text-[#577399]/70">⎘</span>
          Copy &ldquo;{characterName}&rdquo;
        </button>
      </li>
    </ul>
  );

  if (typeof document === "undefined") return null;
  return createPortal(menu, document.body);
}
