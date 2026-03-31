"use client";

/**
 * src/app/campaigns/[id]/CampaignDetailClient.tsx
 *
 * Campaign Detail Page — the main session view.
 *
 * Layout:
 *   Header  → campaign name, [Invite] [Settings] buttons (GM only)
 *   Sidebar → member roster (280px), each card selects a character
 *   Main    → selected character's sheet (read-only via CharacterSheet),
 *             or placeholder when nothing is selected
 *
 * GM interactions:
 *   - Middle-click (onAuxClick, button=1) OR Alt+P on a focused element
 *     within the character sheet wrapper fires a ping via useGameWebSocket.
 *
 * Player interactions:
 *   - useGameWebSocket receives PingEvent → usePingEffect.triggerPing()
 *     scrolls & highlights the targeted element.
 *
 * data-field-key: The sheet wrapper intercepts pointer events and reads
 * data-field-key from the closest ancestor, then maps it to a ping.
 */

import React, { useCallback, useEffect, useId, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { useCampaignDetail, useRemoveMember, useAddCharacterToCampaign, useRemoveCharacterFromCampaign, useUpdateCampaign } from "@/hooks/useCampaigns";
import { useCampaignStore, type CampaignTab } from "@/store/campaignStore";
import { useGameWebSocket, type DiceColorOverrides } from "@/hooks/useGameWebSocket";
import { usePingEffect } from "@/hooks/usePingEffect";
import { useDiceStore } from "@/store/diceStore";
import { useEncounterStore } from "@/store/encounterStore";
import { useCharacterStore } from "@/store/characterStore";
import type { PingEvent } from "@/types/campaign";
import type { Adversary } from "@/types/adversary";
import type { RollResult } from "@/types/dice";
import { MemberCard } from "@/components/campaign/MemberCard";
import { InviteManagementModal } from "@/components/campaign/InviteManagementModal";
import { CharacterSheet } from "@/components/character/CharacterSheet";
import { AdversaryCatalog } from "@/components/adversary/AdversaryCatalog";
import { EncounterConsole } from "@/components/encounter/EncounterConsole";
import { EnvironmentCatalog } from "@/components/encounter/EnvironmentCatalog";
import { DiceLog } from "@/components/dice/DiceLog";
import { DiceRollerPanel } from "@/components/dice/DiceRollerPanel";
import { useCharacters } from "@/hooks/useCharacter";
import { SheetContextMenu, type ContextMenuPosition } from "@/components/campaign/SheetContextMenu";
import { useLongPress } from "@/hooks/useLongPress";
import type { ForceCritEvent } from "@/hooks/useGameWebSocket";
import { resolveDiceColors, resolveGmDiceColor, buildColorOverrides } from "@/lib/diceColorResolver";

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function CampaignDetailSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-8 w-48 rounded bg-slate-700/60 mb-6" />
      <div className="flex gap-6">
        <div className="w-[280px] shrink-0 space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 rounded-lg bg-slate-700/40" />
          ))}
        </div>
        <div className="flex-1 h-64 rounded-xl bg-slate-700/40" />
      </div>
    </div>
  );
}

// ─── CharacterSheet ping wrapper ──────────────────────────────────────────────
// Wraps the CharacterSheet to intercept right-click, long-press, and Alt+P
// for GM pinging. Middle-click (onAuxClick) is retained as a legacy fallback.

interface SheetPingWrapperProps {
  characterId: string;
  characterName: string;
  isGm: boolean;
  onPingField: (fieldKey: string) => void;
}

function SheetPingWrapper({ characterId, characterName, isGm, onPingField }: SheetPingWrapperProps) {
  const wrapperRef  = useRef<HTMLDivElement>(null);
  const triggerRef  = useRef<HTMLElement | null>(null);

  const [contextMenu, setContextMenu] = useState<{
    position: ContextMenuPosition;
    fieldKey: string | null;
  } | null>(null);

  // ── Helpers ─────────────────────────────────────────────────────────────────

  const openContextMenu = useCallback(
    (x: number, y: number, fieldKey: string | null) => {
      setContextMenu({ position: { x, y }, fieldKey });
    },
    []
  );

  const closeContextMenu = useCallback(() => setContextMenu(null), []);

  const getFieldKey = useCallback((target: Element): string | null => {
    return target.closest("[data-field-key]")?.getAttribute("data-field-key") ?? null;
  }, []);

  // ── Right-click ─────────────────────────────────────────────────────────────

  const handleContextMenu = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!isGm) return;
      e.preventDefault();
      triggerRef.current = e.target as HTMLElement;
      openContextMenu(e.clientX, e.clientY, getFieldKey(e.target as Element));
    },
    [isGm, openContextMenu, getFieldKey]
  );

  // ── Middle-click (legacy fallback) ──────────────────────────────────────────

  const handleAuxClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!isGm || e.button !== 1) return;
      e.preventDefault();
      const fieldKey = getFieldKey(e.target as Element);
      if (fieldKey) onPingField(fieldKey);
    },
    [isGm, onPingField, getFieldKey]
  );

  // ── Alt+P ────────────────────────────────────────────────────────────────────

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (!isGm || !(e.altKey && e.key === "p")) return;
      e.preventDefault();
      const activeEl = document.activeElement;
      if (!activeEl) return;
      const fieldKey = getFieldKey(activeEl as Element);
      if (fieldKey) onPingField(fieldKey);
    },
    [isGm, onPingField, getFieldKey]
  );

  // ── Long-press (touch / pen) ─────────────────────────────────────────────────

  const handleLongPress = useCallback(
    (e: React.PointerEvent) => {
      if (!isGm) return;
      const fieldKey = getFieldKey(e.target as Element);
      // Position the menu below the element's bounding rect
      const rect = (e.target as Element).getBoundingClientRect();
      openContextMenu(rect.left, rect.bottom + 4, fieldKey);
    },
    [isGm, openContextMenu, getFieldKey]
  );

  const longPressHandlers = useLongPress(handleLongPress);

  // ── GM info banner (dismissible, persisted to localStorage) ─────────────────
  const GM_BANNER_KEY = "gm-ping-banner-dismissed";
  const [bannerDismissed, setBannerDismissed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(GM_BANNER_KEY) === "1";
  });

  const handleDismissBanner = useCallback(() => {
    localStorage.setItem(GM_BANNER_KEY, "1");
    setBannerDismissed(true);
  }, []);

  return (
    <div
      ref={wrapperRef}
      onContextMenu={isGm ? handleContextMenu : undefined}
      onAuxClick={isGm ? handleAuxClick : undefined}
      onKeyDown={isGm ? handleKeyDown : undefined}
      {...(isGm ? longPressHandlers : {})}
      className={isGm ? "relative select-none touch-manipulation" : "relative"}
      aria-label={
        isGm
          ? "Character sheet — right-click or long-press any element to ping a player"
          : undefined
      }
    >
      {isGm && !bannerDismissed && (
        <div className="mb-3 rounded-lg border border-[#DAA520]/30 bg-[#DAA520]/5 px-4 py-2 flex items-start justify-between gap-3">
          <p className="text-xs text-[#DAA520]/80">
            <span aria-hidden="true">♛ </span>
            GM View — Right-click or long-press any element to ping the player.
            Keyboard: focus an element then press{" "}
            <kbd className="font-mono bg-slate-800 border border-slate-700 rounded px-1">Alt+P</kbd>
          </p>
          <button
            type="button"
            onClick={handleDismissBanner}
            aria-label="Dismiss GM hint"
            className="shrink-0 text-[#b9baa3]/30 hover:text-[#b9baa3] transition-colors text-sm leading-none"
          >
            ✕
          </button>
        </div>
      )}
      {isGm && bannerDismissed && (
        <div className="mb-3">
          <button
            type="button"
            onClick={() => setBannerDismissed(false)}
            className="text-[10px] text-[#b9baa3]/30 hover:text-[#b9baa3]/60 transition-colors"
          >
            ⓘ Ping help
          </button>
        </div>
      )}
      <CharacterSheet characterId={characterId} />

      {contextMenu && (
        <SheetContextMenu
          position={contextMenu.position}
          fieldKey={contextMenu.fieldKey}
          characterName={characterName}
          onPing={onPingField}
          onClose={closeContextMenu}
          triggerRef={triggerRef}
        />
      )}
    </div>
  );
}

// ─── AssignCharacterPanel ──────────────────────────────────────────────────────
// Shown to players who have joined a campaign but not yet assigned a character.

interface AssignCharacterPanelProps {
  campaignId: string;
}

function AssignCharacterPanel({ campaignId }: AssignCharacterPanelProps) {
  const selectId = useId();
  const router = useRouter();
  const [selectedId, setSelectedId] = useState("");
  const { data: myChars, isLoading: charsLoading } = useCharacters();
  const addMutation = useAddCharacterToCampaign(campaignId);

  // Only show characters not already assigned to another campaign
  const available = (myChars?.characters ?? []).filter(
    (c) => !c.campaignId || c.campaignId === campaignId
  );

  const handleAssign = useCallback(() => {
    if (!selectedId) return;
    addMutation.mutate({ characterId: selectedId });
  }, [selectedId, addMutation]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] px-4">
      <div
        className="
          w-full max-w-sm rounded-2xl border border-[#577399]/30
          bg-slate-900/80 p-8 shadow-card-fantasy space-y-5
        "
      >
        <div className="space-y-1 text-center">
          <p className="font-serif text-xl text-[#f7f7ff]">Assign your character</p>
          <p className="text-sm text-[#b9baa3]/60">
            Choose which of your characters joins this campaign.
          </p>
        </div>

        {charsLoading ? (
          <div className="h-10 rounded-lg bg-slate-700/40 animate-pulse" />
        ) : available.length === 0 ? (
          <div className="space-y-3">
            <p className="text-sm text-[#b9baa3]/40 italic text-center">
              You have no available characters.
            </p>
            <button
              type="button"
              onClick={() => router.push("/characters/new")}
              className="
                w-full rounded-lg border border-[#577399]/40 bg-[#577399]/10
                px-4 py-2 text-sm font-semibold text-[#577399]
                hover:bg-[#577399]/20 transition-colors
                focus:outline-none focus:ring-2 focus:ring-[#577399]
              "
            >
              Create a character →
            </button>
          </div>
        ) : (
          <>
            <div className="space-y-1">
              <label
                htmlFor={selectId}
                className="block text-xs font-semibold uppercase tracking-widest text-[#b9baa3]/50"
              >
                Character
              </label>
              <select
                id={selectId}
                value={selectedId}
                onChange={(e) => setSelectedId(e.target.value)}
                className="
                  w-full rounded-lg border border-slate-700/60 bg-slate-800
                  px-3 py-2 text-sm text-[#f7f7ff]
                  focus:outline-none focus:ring-2 focus:ring-[#577399] focus:ring-offset-2
                  focus:ring-offset-slate-900
                "
              >
                <option value="">Select a character…</option>
                {available.map((c) => (
                  <option key={c.characterId} value={c.characterId}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {addMutation.isError && (
              <p role="alert" className="text-sm text-[#fe5f55]">
                {(addMutation.error as Error)?.message ?? "Failed to assign character."}
              </p>
            )}

            <button
              type="button"
              onClick={handleAssign}
              disabled={!selectedId || addMutation.isPending}
              className="
                w-full rounded-lg bg-[#577399] px-4 py-2
                text-sm font-semibold text-white
                hover:bg-[#577399]/80 disabled:opacity-40
                transition-colors
                focus:outline-none focus:ring-2 focus:ring-[#577399] focus:ring-offset-2
                focus:ring-offset-slate-900
              "
            >
              {addMutation.isPending ? "Assigning…" : "Assign Character"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ─── GM Tab Bar (desktop) ─────────────────────────────────────────────────────
// Allows the GM to switch between Characters, Adversaries, Encounter, and
// Environments tabs. Players only see the Characters view (no tab bar shown).
// On mobile, replaced by the bottom nav — this bar is hidden on sm and below.

const GM_TABS: { id: CampaignTab; label: string; icon: string }[] = [
  { id: "characters", label: "Characters", icon: "👤" },
  { id: "adversaries", label: "Adversaries", icon: "👹" },
  { id: "encounter", label: "Encounter", icon: "⚔️" },
];

interface GmTabBarProps {
  activeTab: CampaignTab;
  onTabChange: (tab: CampaignTab) => void;
  /** Number of active (non-defeated) adversaries in the encounter. */
  encounterCount: number;
}

function GmTabBar({ activeTab, onTabChange, encounterCount }: GmTabBarProps) {
  return (
    <div
      role="tablist"
      aria-label="Campaign view"
      className="
        hidden sm:flex overflow-x-auto scrollbar-hide gap-0.5
        sm:gap-1 mb-4 border-b border-slate-800/60 pb-2
      "
    >
      {GM_TABS.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            aria-controls={`tabpanel-${tab.id}`}
            id={`tab-${tab.id}`}
            onClick={() => onTabChange(tab.id)}
            className={`
              flex items-center gap-1.5 rounded-lg px-3 py-2
              text-xs font-semibold whitespace-nowrap
              transition-all duration-150
              focus:outline-none focus:ring-2 focus:ring-[#577399]
              ${
                isActive
                  ? "bg-[#577399]/15 text-[#577399] border border-[#577399]/40"
                  : "text-[#b9baa3]/50 hover:text-[#b9baa3] hover:bg-slate-800/40 border border-transparent"
              }
            `}
          >
            <span aria-hidden="true">{tab.icon}</span>
            {tab.label}
            {tab.id === "encounter" && encounterCount > 0 && (
              <span
                className="
                  ml-1 inline-flex items-center justify-center
                  h-4 min-w-[1rem] rounded-full px-1
                  text-[10px] font-bold tabular-nums
                  bg-[#fe5f55]/20 text-[#fe5f55]
                "
              >
                {encounterCount}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ─── Mobile Bottom Nav ────────────────────────────────────────────────────────
// Fixed bottom bar for GM on mobile only (sm:hidden).

interface MobileBottomNavProps {
  activeTab: CampaignTab;
  onTabChange: (tab: CampaignTab) => void;
  encounterCount: number;
}

function MobileBottomNav({ activeTab, onTabChange, encounterCount }: MobileBottomNavProps) {
  return (
    <nav
      aria-label="Campaign tabs"
      className="
        fixed bottom-0 left-0 right-0 z-50
        h-14 flex sm:hidden
        bg-slate-900 border-t border-slate-700/50
        pb-[env(safe-area-inset-bottom)]
      "
    >
      {GM_TABS.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onTabChange(tab.id)}
            aria-label={tab.label}
            aria-current={isActive ? "page" : undefined}
            className={`
              relative flex-1 flex flex-col items-center justify-center gap-0.5
              text-[10px] font-semibold transition-colors
              focus:outline-none focus-visible:ring-2 focus-visible:ring-[#577399]
              ${isActive ? "text-[#577399]" : "text-[#b9baa3]/50 hover:text-[#b9baa3]"}
            `}
          >
            {/* Active indicator bar at top */}
            {isActive && (
              <span
                aria-hidden="true"
                className="absolute top-0 left-1/2 -translate-x-1/2 h-0.5 w-8 rounded-full bg-[#577399]"
              />
            )}
            <span aria-hidden="true" className="text-base leading-none">{tab.icon}</span>
            <span>{tab.label}</span>
            {/* Encounter badge */}
            {tab.id === "encounter" && encounterCount > 0 && (
              <span
                aria-label={`${encounterCount} adversaries in encounter`}
                className="
                  absolute top-1.5 right-[calc(50%-20px)]
                  inline-flex items-center justify-center
                  h-4 min-w-[1rem] rounded-full px-1
                  text-[9px] font-bold tabular-nums
                  bg-[#fe5f55] text-white
                "
              >
                {encounterCount}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
}

// ─── FearTracker ─────────────────────────────────────────────────────────────
// GM-only SRD Fear counter. Range 0–12, persisted via PATCH /campaigns/{id}.

const FEAR_MAX = 12;

interface FearTrackerProps {
  campaignId: string;
  currentFear: number;
  /** When true, render a compact chip instead of the full tracker. */
  compact?: boolean;
}

function FearTracker({ campaignId, currentFear, compact }: FearTrackerProps) {
  const updateMutation = useUpdateCampaign(campaignId);
  const [localFear, setLocalFear] = useState(currentFear);

  // Keep local state in sync if the server value changes (e.g. another GM window)
  useEffect(() => {
    setLocalFear(currentFear);
  }, [currentFear]);

  const setFear = useCallback(
    (next: number) => {
      const clamped = Math.max(0, Math.min(FEAR_MAX, next));
      setLocalFear(clamped);
      updateMutation.mutate({ fear: clamped });
    },
    [updateMutation]
  );

  // Compact chip variant for non-encounter tabs on sm+
  if (compact) {
    return (
      <button
        type="button"
        aria-label={`Fear: ${localFear} of ${FEAR_MAX}. Click to increase.`}
        onClick={() => setFear(localFear + 1)}
        className="
          inline-flex items-center gap-1.5 rounded-full
          border border-[#fe5f55]/30 bg-[#fe5f55]/5
          px-2.5 py-1 text-xs font-semibold text-[#fe5f55]/80
          hover:bg-[#fe5f55]/15 transition-colors
          focus:outline-none focus:ring-2 focus:ring-[#fe5f55]
        "
      >
        🔥 Fear: {localFear}/{FEAR_MAX}
      </button>
    );
  }

  return (
    <div
      className="
        flex items-center gap-3 rounded-xl
        border border-[#fe5f55]/25 bg-[#fe5f55]/5
        px-4 py-2.5 mb-4
      "
      aria-label={`Fear tracker: ${localFear} of ${FEAR_MAX}`}
    >
      {/* Label */}
      <span className="text-xs font-semibold uppercase tracking-widest text-[#fe5f55]/70 shrink-0 select-none">
        Fear
      </span>

      {/* Pip track */}
      <div className="flex gap-1 flex-1" role="presentation">
        {Array.from({ length: FEAR_MAX }).map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setFear(i < localFear ? i : i + 1)}
            aria-label={`Set fear to ${i + 1}`}
            className={[
              // 44px touch target wrapper using flex trick
              "flex-1 flex items-center justify-center h-11",
              "focus:outline-none focus:ring-1 focus:ring-[#fe5f55]",
            ].join(" ")}
          >
            <span
              className={[
                "h-3.5 w-full rounded-sm transition-colors",
                i < localFear
                  ? "bg-[#fe5f55]"
                  : "bg-slate-700/60 hover:bg-[#fe5f55]/30",
              ].join(" ")}
            />
          </button>
        ))}
      </div>

      {/* Numeric readout + stepper */}
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          type="button"
          onClick={() => setFear(localFear - 1)}
          disabled={localFear === 0 || updateMutation.isPending}
          aria-label="Decrease fear"
          className="
            h-6 w-6 rounded flex items-center justify-center
            text-[#fe5f55] text-sm font-bold
            border border-[#fe5f55]/30
            hover:bg-[#fe5f55]/15 disabled:opacity-30
            transition-colors focus:outline-none focus:ring-1 focus:ring-[#fe5f55]
          "
        >
          −
        </button>
        <span
          className="w-8 text-center text-sm font-bold tabular-nums text-[#fe5f55]"
          aria-live="polite"
          aria-atomic="true"
        >
          {localFear}/{FEAR_MAX}
        </span>
        <button
          type="button"
          onClick={() => setFear(localFear + 1)}
          disabled={localFear === FEAR_MAX || updateMutation.isPending}
          aria-label="Increase fear"
          className="
            h-6 w-6 rounded flex items-center justify-center
            text-[#fe5f55] text-sm font-bold
            border border-[#fe5f55]/30
            hover:bg-[#fe5f55]/15 disabled:opacity-30
            transition-colors focus:outline-none focus:ring-1 focus:ring-[#fe5f55]
          "
        >
          +
        </button>
      </div>
    </div>
  );
}

// ─── Party Drawer (mobile) ────────────────────────────────────────────────────
// Slide-in panel from the left, rendered as a full-screen overlay on mobile.

interface PartyDrawerProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

function PartyDrawer({ open, onClose, children }: PartyDrawerProps) {
  // Escape key to close
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  // Swipe-left to close
  const touchStartX = useRef<number | null>(null);
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  }, []);
  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (touchStartX.current === null) return;
      const delta = touchStartX.current - e.changedTouches[0].clientX;
      if (delta >= 40) onClose();
      touchStartX.current = null;
    },
    [onClose]
  );

  return (
    <>
      {/* Scrim */}
      <div
        aria-hidden="true"
        onClick={onClose}
        className={`
          fixed inset-0 z-[55] bg-black/60 backdrop-blur-sm
          transition-opacity duration-300
          ${open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}
        `}
      />

      {/* Drawer panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Party roster"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className={`
          fixed top-0 left-0 bottom-0 z-[60]
          w-[280px] max-w-[85vw]
          bg-slate-900 border-r border-slate-800/60
          overflow-y-auto
          transition-transform duration-300
          [transition-timing-function:cubic-bezier(0.32,0.72,0,1)]
          ${open ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        {/* Close button */}
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-[#b9baa3]/50">
            Party
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close party drawer"
            className="
              h-8 w-8 rounded-lg flex items-center justify-center
              text-[#b9baa3]/40 hover:text-[#b9baa3] hover:bg-slate-800/60
              transition-colors focus:outline-none focus:ring-2 focus:ring-[#577399]
            "
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </>
  );
}

// ─── Main client component ────────────────────────────────────────────────────

export default function CampaignDetailClient() {
  const pathname = usePathname();
  // Extract the real campaign ID from the browser URL.
  // useParams() returns "__placeholder__" in a static export; usePathname()
  // always reflects the actual browser URL path.
  const campaignId = pathname?.split("/")[2] ?? "";
  const router = useRouter();

  const { isAuthenticated, isReady, isLoading: authLoading, user } = useAuthStore();
  const { data: campaign, isLoading, isError, error } = useCampaignDetail(campaignId);
  const removeMemberMutation = useRemoveMember(campaignId);
  const removeCharacterMutation = useRemoveCharacterFromCampaign(campaignId);
  const { selectedCharacterId, activeTab, setActiveCampaign, setSelectedCharacter, setActiveTab } = useCampaignStore();
  const [showInviteModal, setShowInviteModal] = useState(false);
  /** GM-only: open the 3D dice roller panel. */
  const [gmDiceOpen, setGmDiceOpen] = useState(false);
  /** GM-only: which character (by characterId) has force-crit armed. null = none. */
  const [forceCritCharId, setForceCritCharId] = useState<string | null>(null);
  /** Mobile: party drawer open state. */
  const [drawerOpen, setDrawerOpen] = useState(false);
  /** GM-only: overflow menu open state on mobile. */
  const [overflowOpen, setOverflowOpen] = useState(false);
  const overflowRef = useRef<HTMLDivElement>(null);

  const titleId = useId();

  // Encounter count for tab badge
  const encounterAdversaries = useEncounterStore(
    (s) => s.encounter?.adversaries.filter((a) => !a.isDefeated).length ?? 0
  );

  // Auth guard
  useEffect(() => {
    if (isReady && !isAuthenticated) router.replace("/auth/login");
  }, [isReady, isAuthenticated, router]);

  // Track active campaign in store
  useEffect(() => {
    if (campaignId) setActiveCampaign(campaignId);
    return () => setActiveCampaign(null);
  }, [campaignId, setActiveCampaign]);

  // Scope the dice BroadcastChannel to this campaign
  const { log: diceLog, setCampaignId: setDiceCampaignId } = useDiceStore();
  useEffect(() => {
    if (campaignId) setDiceCampaignId(campaignId);
    return () => setDiceCampaignId(null);
  }, [campaignId, setDiceCampaignId]);

  // Close overflow menu on outside click
  useEffect(() => {
    if (!overflowOpen) return;
    const handler = (e: MouseEvent) => {
      if (overflowRef.current && !overflowRef.current.contains(e.target as Node)) {
        setOverflowOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [overflowOpen]);

  // Close drawer when tab changes (UX: navigating to content closes the panel)
  useEffect(() => {
    setDrawerOpen(false);
  }, [selectedCharacterId]);

  // ── Derived state ───────────────────────────────────────────────────────────
  const isGm        = campaign?.callerRole === "gm";
  const callerChar  = campaign?.members.find((m) => m.userId === user?.userId);
  const myCharId    = callerChar?.characterId ?? null;

  // Character the current player is viewing (for WebSocket)
  const wsCharacterId = selectedCharacterId ?? myCharId ?? (isGm ? "gm" : "");

  // Name of the armed force-crit character
  const forceCritCharName = forceCritCharId
    ? campaign?.characters.find((c) => c.characterId === forceCritCharId)?.name ?? null
    : null;

  // ── Dice color overrides ────────────────────────────────────────────────────
  const activeCharacter = useCharacterStore((s) => s.activeCharacter);

  const gmOwnColorOverrides = React.useMemo((): DiceColorOverrides | undefined => {
    if (!isGm) return undefined;
    const userDiceColors = user?.preferences?.diceColors;
    const resolved = resolveDiceColors(undefined, userDiceColors);
    const gmColor = resolveGmDiceColor(userDiceColors);
    return buildColorOverrides(resolved, gmColor);
  }, [isGm, user?.preferences?.diceColors]);

  const effectiveDiceColorOverrides = React.useMemo((): DiceColorOverrides | undefined => {
    if (!isGm) {
      const charDiceColors = activeCharacter?.diceColors;
      const userDiceColors = user?.preferences?.diceColors;
      const resolved = resolveDiceColors(charDiceColors, userDiceColors);
      return buildColorOverrides(resolved);
    }
    if (selectedCharacterId && activeCharacter?.characterId === selectedCharacterId) {
      const resolved = resolveDiceColors(activeCharacter.diceColors, undefined);
      return buildColorOverrides(resolved);
    }
    return gmOwnColorOverrides;
  }, [isGm, selectedCharacterId, activeCharacter, user?.preferences?.diceColors, gmOwnColorOverrides]);

  // ── WebSocket: ping sending (GM) & receiving (player) ───────────────────────
  const { triggerPing } = usePingEffect();

  const { sendPing, sendDiceRoll, sendForceCrit, isConnected } = useGameWebSocket(
    campaignId,
    wsCharacterId,
    {
      onPing: useCallback(
        (evt: PingEvent) => {
          if (evt.targetCharacterId === myCharId) {
            triggerPing(evt.fieldKey);
          }
        },
        [myCharId, triggerPing]
      ),
      onDiceRoll: useCallback(
        (_result: RollResult) => {},
        []
      ),
      onForceCrit: useCallback(
        (evt: ForceCritEvent) => {
          setForceCritCharId(evt.active ? evt.targetCharacterId : null);
        },
        []
      ),
    }
  );

  // Broadcast completed rolls to the campaign WebSocket
  const lastRollId = diceLog[0]?.id;
  const prevBroadcastIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (!lastRollId || lastRollId === prevBroadcastIdRef.current) return;
    prevBroadcastIdRef.current = lastRollId;
    sendDiceRoll(diceLog[0], effectiveDiceColorOverrides);
  }, [lastRollId, diceLog, sendDiceRoll, effectiveDiceColorOverrides]);

  // GM: send ping to the selected character
  const handlePingField = useCallback(
    (fieldKey: string) => {
      if (!isGm || !selectedCharacterId) return;
      sendPing(selectedCharacterId, fieldKey);
    },
    [isGm, selectedCharacterId, sendPing]
  );

  // GM: toggle force-crit for a character.
  const handleForceCritToggle = useCallback(
    (charId: string) => {
      if (!isGm) return;
      const isCurrentlyArmed = forceCritCharId === charId;
      if (forceCritCharId && forceCritCharId !== charId) {
        sendForceCrit(forceCritCharId, false);
      }
      const nextActive = !isCurrentlyArmed;
      sendForceCrit(charId, nextActive);
      setForceCritCharId(nextActive ? charId : null);
    },
    [isGm, forceCritCharId, sendForceCrit]
  );

  // ── Sidebar / drawer content (shared between drawer and desktop aside) ───────
  const rosterContent = (
    <div className="p-4 space-y-2">
      <h2 className="text-xs font-semibold uppercase tracking-widest text-[#b9baa3]/50 px-1 mb-3 sm:block hidden">
        Members
      </h2>

      {isLoading && (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-16 rounded-lg bg-slate-700/30 animate-pulse" />
          ))}
        </div>
      )}

      {campaign?.members.map((member) => {
        const memberChar = campaign.characters.find(
          (c) => c.userId === member.userId
        );
        const charId = member.characterId;

        return (
          <div key={member.userId}>
            <MemberCard
              member={member}
              primaryGmId={campaign.primaryGmId}
              characterName={memberChar?.name ?? null}
              isSelected={selectedCharacterId === charId}
              isGm={isGm}
              isRemoving={
                removeMemberMutation.isPending &&
                removeMemberMutation.variables === member.userId
              }
              isUnassigning={
                removeCharacterMutation.isPending &&
                removeCharacterMutation.variables === charId
              }
              onSelect={() => {
                if (charId) setSelectedCharacter(charId);
              }}
              onRemove={
                isGm && member.userId !== campaign.primaryGmId
                  ? () => removeMemberMutation.mutate(member.userId)
                  : undefined
              }
              onUnassignCharacter={
                isGm && charId
                  ? () => {
                      removeCharacterMutation.mutate(charId, {
                        onSuccess: () => {
                          if (selectedCharacterId === charId) setSelectedCharacter(null);
                        },
                      });
                    }
                  : undefined
              }
            />

            {/* Force-crit toggle — GM only, players with a character only */}
            {isGm && charId && member.role === "player" && (
              <button
                type="button"
                onClick={() => handleForceCritToggle(charId)}
                title={
                  forceCritCharId === charId
                    ? `Disarm forced critical for ${memberChar?.name ?? "this player"}`
                    : `Force next roll to critical for ${memberChar?.name ?? "this player"}`
                }
                aria-pressed={forceCritCharId === charId}
                className={[
                  "mt-1 w-full flex items-center justify-center gap-1.5",
                  "rounded-md px-2 py-1 text-xs font-semibold",
                  "border transition-colors",
                  "focus:outline-none focus:ring-2 focus:ring-[#DAA520] focus:ring-offset-1 focus:ring-offset-slate-900",
                  forceCritCharId === charId
                    ? "border-[#DAA520] bg-[#DAA520]/20 text-[#DAA520]"
                    : "border-slate-700/50 bg-transparent text-[#b9baa3]/40 hover:border-[#DAA520]/50 hover:text-[#DAA520]/60",
                ].join(" ")}
              >
                <span aria-hidden="true">⚡</span>
                {forceCritCharId === charId ? "Crit Armed" : "Force Crit"}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );

  // ── Render guards ───────────────────────────────────────────────────────────
  if (!isReady || authLoading || !isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a100d]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#577399] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a100d] flex flex-col">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header
        className="sticky top-0 z-10 border-b border-slate-800/60 backdrop-blur-sm"
        style={{ backgroundColor: "rgba(10,16,13,0.92)" }}
      >
        <div className="mx-auto flex max-w-[1400px] items-center justify-between px-4 py-3 gap-2 sm:gap-4">
          {/* Left: back + name + WS indicator */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <button
              type="button"
              onClick={() => router.push("/campaigns")}
              aria-label="Back to campaigns"
              className="
                shrink-0 text-[#b9baa3]/50 hover:text-[#b9baa3]
                text-lg leading-none transition-colors
                focus:outline-none focus:ring-2 focus:ring-[#577399] rounded
              "
            >
              ←
            </button>

            {isLoading ? (
              <div className="h-6 w-32 sm:w-40 rounded bg-slate-700/60 animate-pulse" />
            ) : (
              <h1
                id={titleId}
                className="font-serif text-base sm:text-xl font-semibold text-[#f7f7ff] truncate"
              >
                {campaign?.name ?? "Campaign"}
              </h1>
            )}

            {/* WS connection indicator */}
            {wsCharacterId && (
              <span
                aria-label={isConnected ? "Live session connected" : "Session disconnected"}
                title={isConnected ? "Live session connected" : "Reconnecting…"}
                className={[
                  "shrink-0 h-2 w-2 rounded-full",
                  isConnected ? "bg-green-400" : "bg-yellow-500 animate-pulse",
                ].join(" ")}
              />
            )}

            {/* Crit Armed pill — shown in header when a crit is armed */}
            {isGm && forceCritCharId && (
              <button
                type="button"
                onClick={() => handleForceCritToggle(forceCritCharId)}
                title={`Disarm forced critical for ${forceCritCharName ?? "player"}`}
                aria-label={`Crit armed for ${forceCritCharName ?? "player"}. Click to disarm.`}
                className="
                  inline-flex items-center gap-1.5 px-2.5 py-1
                  rounded-full bg-[#DAA520]/15 border border-[#DAA520]/40
                  text-[#DAA520] text-xs font-semibold
                  hover:bg-[#DAA520]/25 transition-colors shrink-0
                  focus:outline-none focus:ring-2 focus:ring-[#DAA520]
                "
              >
                <span aria-hidden="true">⚡</span>
                <span className="hidden sm:inline">Crit: </span>
                <span className="max-w-[80px] sm:max-w-[120px] truncate">
                  {forceCritCharName ?? "Player"}
                </span>
              </button>
            )}
          </div>

          {/* Right: GM actions */}
          {isGm && campaign && (
            <div className="flex items-center gap-2 shrink-0">
              {/* On mobile: show only Roll Dice + overflow ⋯ */}
              <button
                type="button"
                onClick={() => { useDiceStore.getState().stageRoll({ label: "GM Roll", type: "generic", dice: [], characterName: "GM" }); setGmDiceOpen(true); }}
                aria-haspopup="dialog"
                className="
                  rounded-lg px-3 sm:px-4 py-2 text-sm font-semibold
                  border border-[#577399]/50 bg-[#577399]/10 text-[#577399]
                  hover:bg-[#577399]/20 hover:border-[#577399]
                  transition-colors
                  focus:outline-none focus:ring-2 focus:ring-[#577399]
                "
              >
                <span className="hidden sm:inline">Roll Dice</span>
                <span className="sm:hidden" aria-hidden="true">🎲</span>
              </button>

              {/* Invite — hidden on mobile (in overflow) */}
              <button
                type="button"
                onClick={() => setShowInviteModal(true)}
                aria-haspopup="dialog"
                className="
                  hidden sm:inline-flex
                  rounded-lg px-4 py-2 text-sm font-semibold
                  border border-[#577399]/50 bg-[#577399]/10 text-[#577399]
                  hover:bg-[#577399]/20 hover:border-[#577399]
                  transition-colors
                  focus:outline-none focus:ring-2 focus:ring-[#577399]
                "
              >
                Invite
              </button>

              {/* OBS links + Settings — hidden on mobile (in overflow) */}
              <a
                href={`/obs/dice?campaign=${campaignId}`}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Open OBS dice roller overlay in new tab"
                className="
                  hidden lg:inline-flex
                  rounded-lg px-4 py-2 text-sm font-medium
                  border border-slate-700/60 text-[#b9baa3]/60
                  hover:border-slate-600 hover:text-[#b9baa3]
                  transition-colors
                  focus:outline-none focus:ring-2 focus:ring-[#577399]
                "
              >
                OBS Dice
              </a>
              <a
                href={`/obs/dice-log?campaign=${campaignId}`}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Open OBS dice log overlay in new tab"
                className="
                  hidden lg:inline-flex
                  rounded-lg px-4 py-2 text-sm font-medium
                  border border-slate-700/60 text-[#b9baa3]/60
                  hover:border-slate-600 hover:text-[#b9baa3]
                  transition-colors
                  focus:outline-none focus:ring-2 focus:ring-[#577399]
                "
              >
                OBS Log
              </a>
              <button
                type="button"
                onClick={() => router.push(`/campaigns/${campaignId}/settings`)}
                aria-label="Campaign settings"
                className="
                  hidden sm:inline-flex
                  rounded-lg px-4 py-2 text-sm font-medium
                  border border-slate-700/60 text-[#b9baa3]/60
                  hover:border-slate-600 hover:text-[#b9baa3]
                  transition-colors
                  focus:outline-none focus:ring-2 focus:ring-[#577399]
                "
              >
                Settings
              </button>

              {/* Mobile overflow ⋯ menu */}
              <div ref={overflowRef} className="relative sm:hidden">
                <button
                  type="button"
                  onClick={() => setOverflowOpen((v) => !v)}
                  aria-label="More options"
                  aria-expanded={overflowOpen}
                  aria-haspopup="menu"
                  className="
                    h-9 w-9 rounded-lg flex items-center justify-center
                    border border-slate-700/60 text-[#b9baa3]/60
                    hover:border-slate-600 hover:text-[#b9baa3]
                    transition-colors
                    focus:outline-none focus:ring-2 focus:ring-[#577399]
                  "
                >
                  ⋯
                </button>
                {overflowOpen && (
                  <div
                    role="menu"
                    className="
                      absolute top-[calc(100%+4px)] right-0 z-50
                      w-48 bg-slate-800 rounded-lg
                      border border-slate-700/50 shadow-xl
                      py-1 overflow-hidden
                    "
                  >
                    <button
                      role="menuitem"
                      type="button"
                      onClick={() => { setShowInviteModal(true); setOverflowOpen(false); }}
                      className="w-full text-left px-4 py-2.5 text-sm text-[#f7f7ff] hover:bg-slate-700/60 transition-colors"
                    >
                      Invite players
                    </button>
                    <a
                      role="menuitem"
                      href={`/obs/dice?campaign=${campaignId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => setOverflowOpen(false)}
                      className="block px-4 py-2.5 text-sm text-[#f7f7ff] hover:bg-slate-700/60 transition-colors"
                    >
                      OBS Dice overlay ↗
                    </a>
                    <a
                      role="menuitem"
                      href={`/obs/dice-log?campaign=${campaignId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => setOverflowOpen(false)}
                      className="block px-4 py-2.5 text-sm text-[#f7f7ff] hover:bg-slate-700/60 transition-colors"
                    >
                      OBS Log overlay ↗
                    </a>
                    <button
                      role="menuitem"
                      type="button"
                      onClick={() => { router.push(`/campaigns/${campaignId}/settings`); setOverflowOpen(false); }}
                      className="w-full text-left px-4 py-2.5 text-sm text-[#f7f7ff] hover:bg-slate-700/60 transition-colors"
                    >
                      Settings
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </header>

      {/* ── Main layout ─────────────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Desktop sidebar (hidden on mobile) */}
        <aside
          className="
            hidden sm:block
            w-[280px] shrink-0
            border-r border-slate-800/60
            overflow-y-auto
          "
          aria-label="Campaign roster"
        >
          {rosterContent}
        </aside>

        {/* Mobile drawer */}
        <PartyDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)}>
          {rosterContent}
        </PartyDrawer>

        {/* Main panel */}
        <main className="flex-1 overflow-y-auto px-4 py-6 pb-[calc(56px+env(safe-area-inset-bottom)+16px)] sm:pb-6">
          {isLoading && <CampaignDetailSkeleton />}

          {isError && !isLoading && (
            <div role="alert" className="rounded-xl border border-[#fe5f55]/30 bg-slate-900/80 p-8 text-center">
              <p className="font-serif text-lg text-[#fe5f55]/80">
                Failed to load campaign
              </p>
              <p className="mt-1 text-sm text-[#b9baa3]/50">
                {(error as Error)?.message ?? "An unexpected error occurred."}
              </p>
            </div>
          )}

          {!isLoading && !isError && campaign && (
            <>
              {/* GM-only tools */}
              {isGm && (
                <div className="mb-4 flex items-center justify-between gap-3 flex-wrap">
                  {/* Full Fear Tracker on Encounter tab (mobile + desktop) */}
                  {activeTab === "encounter" ? (
                    <FearTracker
                      campaignId={campaignId}
                      currentFear={campaign.currentFear ?? 0}
                    />
                  ) : (
                    <>
                      {/* Compact chip on non-encounter tabs (sm+ only) */}
                      <div className="hidden sm:block">
                        <FearTracker
                          campaignId={campaignId}
                          currentFear={campaign.currentFear ?? 0}
                          compact
                        />
                      </div>
                      {/* Full tracker always visible on Encounter tab (desktop) — skip on other tabs on mobile */}
                      <div className="block sm:hidden" />
                    </>
                  )}
                </div>
              )}

              {/* GM Tab Bar — desktop only (sm+) */}
              {isGm && (
                <GmTabBar
                  activeTab={activeTab}
                  onTabChange={setActiveTab}
                  encounterCount={encounterAdversaries}
                />
              )}

              {/* Tab Panels */}

              {/* Characters tab */}
              {(activeTab === "characters" || !isGm) && (
                <div
                  id="tabpanel-characters"
                  role={isGm ? "tabpanel" : undefined}
                  aria-labelledby={isGm ? "tab-characters" : undefined}
                >
                  {!selectedCharacterId && (
                    <>
                      {!isGm && !myCharId ? (
                        <AssignCharacterPanel campaignId={campaignId} />
                      ) : (
                        <div
                          className="
                            flex flex-col items-center justify-center
                            min-h-[400px] rounded-2xl
                            border border-dashed border-slate-700/50
                            text-center space-y-3
                          "
                          style={{ background: "rgba(87,115,153,0.03)" }}
                        >
                          <div aria-hidden="true" className="text-4xl opacity-20">⚔️</div>
                          <p className="font-serif text-lg text-[#f7f7ff]/60">
                            Select a character from the roster
                          </p>
                          <p className="text-sm text-[#b9baa3]/40 max-w-xs">
                            {/* Mobile hint */}
                            <span className="sm:hidden">Tap the 👥 Party button to open the roster.</span>
                            <span className="hidden sm:inline">Click a member card on the left to view their character sheet.</span>
                          </p>
                        </div>
                      )}
                    </>
                  )}

                  {selectedCharacterId && (
                    <SheetPingWrapper
                      characterId={selectedCharacterId}
                      characterName={
                        campaign?.characters.find((c) => c.characterId === selectedCharacterId)?.name ?? "Character"
                      }
                      isGm={isGm}
                      onPingField={handlePingField}
                    />
                  )}
                </div>
              )}

              {/* Adversaries tab (GM only) */}
              {isGm && activeTab === "adversaries" && (
                <div
                  id="tabpanel-adversaries"
                  role="tabpanel"
                  aria-labelledby="tab-adversaries"
                >
                  <AdversaryCatalog
                    campaignId={campaignId}
                    onAddToEncounter={(adversary: Adversary) => {
                      const store = useEncounterStore.getState();
                      if (!store.encounter) {
                        store.createEncounter(campaignId);
                      }
                      store.addAdversary(adversary);
                    }}
                  />
                </div>
              )}

              {/* Encounter tab (GM only) */}
              {isGm && activeTab === "encounter" && (
                <div
                  id="tabpanel-encounter"
                  role="tabpanel"
                  aria-labelledby="tab-encounter"
                >
                  <EncounterConsole
                    campaignId={campaignId}
                    onOpenCatalog={() => setActiveTab("adversaries")}
                  />
                </div>
              )}

              {/* Environments tab (GM only) */}
              {isGm && activeTab === "environments" && (
                <div
                  id="tabpanel-environments"
                  role="tabpanel"
                  aria-labelledby="tab-environments"
                >
                  <EnvironmentCatalog
                    campaignId={campaignId}
                    onAddAdversaryToEncounter={(adversary: Adversary) => {
                      const store = useEncounterStore.getState();
                      if (!store.encounter) {
                        store.createEncounter(campaignId);
                      }
                      store.addAdversary(adversary);
                      setActiveTab("encounter");
                    }}
                  />
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {/* ── Mobile: floating Party drawer trigger ───────────────────────────── */}
      {isGm && activeTab === "characters" && (
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          aria-label="Open party roster"
          className="
            fixed z-40
            bottom-[calc(56px+env(safe-area-inset-bottom)+12px)]
            left-4
            sm:hidden
            inline-flex items-center gap-2
            rounded-full px-4 py-2
            bg-slate-800 border border-slate-700/60
            text-sm font-semibold text-[#b9baa3]
            shadow-lg
            hover:bg-slate-700 hover:border-slate-600
            transition-colors
            focus:outline-none focus:ring-2 focus:ring-[#577399]
          "
        >
          👥 Party
        </button>
      )}

      {/* ── Mobile bottom nav (GM only) ─────────────────────────────────────── */}
      {isGm && (
        <MobileBottomNav
          activeTab={activeTab}
          onTabChange={setActiveTab}
          encounterCount={encounterAdversaries}
        />
      )}

      {/* Invite modal */}
      {showInviteModal && campaign && (
        <InviteManagementModal
          campaignId={campaignId}
          invites={campaign.invites ?? []}
          onClose={() => setShowInviteModal(false)}
        />
      )}

      {/* Dice log overlay (fixed lower-left) */}
      <DiceLog characterName={isGm ? "GM" : undefined} />

      {/* GM 3D dice roller panel */}
      {isGm && (
        <DiceRollerPanel
          open={gmDiceOpen}
          onClose={() => setGmDiceOpen(false)}
          colorOverrides={effectiveDiceColorOverrides}
        />
      )}
    </div>
  );
}
