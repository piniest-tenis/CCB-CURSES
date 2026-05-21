"use client";

/**
 * src/components/campaign/PartyOverviewSidebar.tsx
 *
 * Party Overview Sidebar — a toggleable panel (right panel on desktop,
 * bottom sheet on mobile) that shows all party members' vitals at a glance.
 *
 * - Fear strip pinned at top (read-only for all roles)
 * - Character tiles sorted most-hurt first (debounced to avoid combat thrash)
 * - Danger states: healthy / wounded / critical / down + Stress Full
 * - Real-time polling (refetchInterval via React Query) while open
 * - ARIA: role="dialog", inert when closed, Escape to close
 * - Mobile: bottom sheet with drag handle + scrim
 * - Desktop: right-side fixed panel, z-40 (behind EditSidebar z-50)
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useCharacter } from "@/hooks/useCharacter";
import { PartyOverviewTile, getDangerState } from "@/components/campaign/PartyOverviewTile";
import type { CampaignCharacterDetail } from "@/types/campaign";

// ─── Constants ────────────────────────────────────────────────────────────────

const FEAR_MAX = 12;
const SORT_DEBOUNCE_MS = 3000;

// ─── Fear strip ───────────────────────────────────────────────────────────────

interface FearStripProps {
  currentFear: number;
}

function FearStrip({ currentFear }: FearStripProps) {
  const isHigh = currentFear >= 10;

  return (
    <div
      className={[
        "flex items-center gap-3 rounded-xl px-4 py-2.5 mb-4 transition-colors duration-500",
        "border bg-[#fe5f55]/5",
        isHigh ? "border-[#fe5f55]/60" : "border-[#fe5f55]/25",
      ].join(" ")}
      aria-label={`GM Fear: ${currentFear} of ${FEAR_MAX}`}
    >
      {/* Icon */}
      <span aria-hidden="true" className="text-base shrink-0">🔥</span>

      {/* Label */}
      <span className="text-xs font-semibold uppercase tracking-widest text-[#fe5f55]/70 shrink-0 select-none">
        Fear
      </span>

      {/* Pip track */}
      <div className="flex gap-0.5 flex-1" role="presentation">
        {Array.from({ length: FEAR_MAX }).map((_, i) => (
          <span
            key={i}
            className={[
              "flex-1 h-3 rounded-sm transition-colors duration-300",
              i < currentFear ? "bg-[#fe5f55]" : "bg-slate-700/60",
            ].join(" ")}
          />
        ))}
      </div>

      {/* Numeric */}
      <span
        className={[
          "text-sm font-display font-bold tabular-nums text-[#fe5f55] shrink-0",
          isHigh ? "animate-coral-pulse" : "",
        ].join(" ")}
        aria-live="polite"
        aria-atomic="true"
      >
        {currentFear}/{FEAR_MAX}
      </span>
    </div>
  );
}

// ─── Sort hook ────────────────────────────────────────────────────────────────
// Sorts character IDs most-hurt first, but debounces re-sorting during rapid
// stat changes to avoid jarring tile reorders during combat.

function useCharacterDangerScore(id: string | undefined): number {
  const { data } = useCharacter(id ?? "");
  return useMemo(() => {
    if (!data) return 0;
    const max = data.trackers?.hp?.max ?? 0;
    if (max === 0) return 0;
    return (data.trackers?.hp?.marked ?? 0) / max;
  }, [data]);
}

function useDebouncedSortedIds(characterIds: string[]): string[] {
  // Stable hook calls for up to 8 characters
  const s0 = useCharacterDangerScore(characterIds[0]);
  const s1 = useCharacterDangerScore(characterIds[1]);
  const s2 = useCharacterDangerScore(characterIds[2]);
  const s3 = useCharacterDangerScore(characterIds[3]);
  const s4 = useCharacterDangerScore(characterIds[4]);
  const s5 = useCharacterDangerScore(characterIds[5]);
  const s6 = useCharacterDangerScore(characterIds[6]);
  const s7 = useCharacterDangerScore(characterIds[7]);

  const scores = useMemo(
    () => [s0, s1, s2, s3, s4, s5, s6, s7],
    [s0, s1, s2, s3, s4, s5, s6, s7]
  );

  // The "committed" sort order — only updated after SORT_DEBOUNCE_MS of quiet
  const [sortedIds, setSortedIds] = useState<string[]>(characterIds);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Recompute when scores or ids change, but only commit after debounce
  useEffect(() => {
    const entries = characterIds.slice(0, 8).map((id, i) => ({
      id,
      score: scores[i] ?? 0,
    }));
    const sorted = [...entries].sort((a, b) => b.score - a.score).map((e) => e.id);

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setSortedIds(sorted);
    }, SORT_DEBOUNCE_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scores, characterIds.join(",")]);

  // Seed initial order synchronously (no debounce on first render)
  const initialised = useRef(false);
  if (!initialised.current && characterIds.length > 0) {
    initialised.current = true;
    const entries = characterIds.slice(0, 8).map((id, i) => ({ id, score: scores[i] ?? 0 }));
    const sorted = [...entries].sort((a, b) => b.score - a.score).map((e) => e.id);
    // Only update state if it differs from the initial placeholder
    if (sorted.join(",") !== sortedIds.join(",")) {
      // Safe: called synchronously before first paint
      // eslint-disable-next-line react-hooks/exhaustive-deps
      setSortedIds(sorted);
    }
  }

  return sortedIds;
}

// ─── Live region ──────────────────────────────────────────────────────────────

const LIVE_REGION_ID = "party-stat-updates";

// ─── Sidebar ──────────────────────────────────────────────────────────────────

interface PartyOverviewSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  characters: CampaignCharacterDetail[];
  currentFear: number;
  onSelectCharacter: (characterId: string) => void;
}

export function PartyOverviewSidebar({
  isOpen,
  onClose,
  characters,
  currentFear,
  onSelectCharacter,
}: PartyOverviewSidebarProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const firstTileRef = useRef<HTMLButtonElement | null>(null);

  // Build a lookup for fallback avatar/name
  const charLookup = useMemo(() => {
    const map = new Map<string, CampaignCharacterDetail>();
    characters.forEach((c) => map.set(c.characterId, c));
    return map;
  }, [characters]);

  const characterIds = useMemo(() => characters.map((c) => c.characterId), [characters]);
  const sortedIds = useDebouncedSortedIds(characterIds);

  // ── Escape key handler ───────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  // ── Focus management ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;
    // Small delay to let the CSS transition start before stealing focus
    const t = setTimeout(() => {
      firstTileRef.current?.focus();
    }, 50);
    return () => clearTimeout(t);
  }, [isOpen]);

  // ── Mobile swipe-down to close ───────────────────────────────────────────
  const touchStartY = useRef<number | null>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  }, []);

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (touchStartY.current === null) return;
      const delta = e.changedTouches[0].clientY - touchStartY.current;
      if (delta >= 48) onClose();
      touchStartY.current = null;
    },
    [onClose]
  );

  const handleSelectCharacter = useCallback(
    (charId: string) => {
      onSelectCharacter(charId);
      onClose();
    },
    [onSelectCharacter, onClose]
  );

  // ── Panel content ─────────────────────────────────────────────────────────
  const panelContent = (
    <>
      {/* Panel header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-slate-800/60 shrink-0">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-[#b9baa3]/60">
          Party
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close party overview"
          className="
            h-8 w-8 rounded-lg flex items-center justify-center
            text-[#b9baa3]/40 hover:text-[#b9baa3] hover:bg-slate-800/60
            transition-colors focus:outline-none focus:ring-2 focus:ring-[#577399]
          "
        >
          ✕
        </button>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {/* Fear strip */}
        <FearStrip currentFear={currentFear} />

        {/* Character tiles */}
        {characters.length === 0 ? (
          <p className="text-sm text-[#b9baa3]/40 italic text-center py-8">
            No characters in this campaign yet.
          </p>
        ) : (
          sortedIds.map((id, idx) => {
            const member = charLookup.get(id);
            return (
              <div key={id}>
                <PartyOverviewTile
                  characterId={id}
                  fallbackName={member?.name}
                  fallbackAvatar={member?.avatarUrl ?? member?.portraitUrl}
                  onSelect={handleSelectCharacter}
                />
              </div>
            );
          })
        )}
      </div>

      {/* Screen reader live region for stat announcements */}
      <div
        id={LIVE_REGION_ID}
        aria-live="polite"
        aria-atomic="false"
        className="sr-only"
      />
    </>
  );

  return (
    <>
      {/* ── Mobile scrim ─────────────────────────────────────────────────── */}
      <div
        aria-hidden="true"
        onClick={onClose}
        className={[
          "fixed inset-0 z-[38] bg-black/50 backdrop-blur-sm sm:hidden",
          "transition-opacity duration-300",
          isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none",
        ].join(" ")}
      />

      {/* ── Mobile bottom sheet ───────────────────────────────────────────── */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Party Overview"
        aria-hidden={!isOpen}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        inert={!isOpen ? ("" as unknown as boolean) : undefined}
        className={[
          // Mobile: bottom sheet
          "fixed bottom-0 left-0 right-0 z-[39] sm:hidden",
          "max-h-[70vh] flex flex-col",
          "bg-slate-900 border-t border-slate-700/50 rounded-t-2xl",
          "transition-transform duration-300",
          "[transition-timing-function:cubic-bezier(0.32,0.72,0,1)]",
          isOpen ? "translate-y-0" : "translate-y-full",
        ].join(" ")}
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-2.5 pb-1 shrink-0">
          <div className="h-1 w-10 rounded-full bg-slate-600/60" aria-hidden="true" />
        </div>
        {panelContent}
      </div>

      {/* ── Desktop right panel ───────────────────────────────────────────── */}
      <div
        role="dialog"
        aria-modal="false"
        aria-label="Party Overview"
        aria-hidden={!isOpen}
        inert={!isOpen ? ("" as unknown as boolean) : undefined}
        className={[
          // Desktop: right-side fixed panel
          "hidden sm:flex flex-col",
          "fixed top-0 right-0 bottom-0 z-40",
          "w-[22rem] max-w-[22rem]",
          "bg-slate-900 border-l border-slate-800/60",
          "transition-transform duration-300 ease-out",
          isOpen ? "translate-x-0" : "translate-x-full",
        ].join(" ")}
      >
        {panelContent}
      </div>
    </>
  );
}
