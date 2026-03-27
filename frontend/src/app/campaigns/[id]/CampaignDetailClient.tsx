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
import { useGameWebSocket } from "@/hooks/useGameWebSocket";
import { usePingEffect } from "@/hooks/usePingEffect";
import { useDiceStore } from "@/store/diceStore";
import { useEncounterStore } from "@/store/encounterStore";
import type { PingEvent } from "@/types/campaign";
import type { Adversary } from "@/types/adversary";
import type { RollResult } from "@/types/dice";
import { MemberCard } from "@/components/campaign/MemberCard";
import { InviteManagementModal } from "@/components/campaign/InviteManagementModal";
import { CharacterSheet } from "@/components/character/CharacterSheet";
import { AdversaryCatalog } from "@/components/adversary/AdversaryCatalog";
import { EncounterConsole } from "@/components/encounter/EncounterConsole";
import { DiceLog } from "@/components/dice/DiceLog";
import { useCharacters } from "@/hooks/useCharacter";
import { SheetContextMenu, type ContextMenuPosition } from "@/components/campaign/SheetContextMenu";
import { useLongPress } from "@/hooks/useLongPress";
import type { ForceCritEvent } from "@/hooks/useGameWebSocket";

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
      {isGm && (
        <div className="mb-3 rounded-lg border border-gold-800/40 bg-gold-950/20 px-4 py-2">
          <p className="text-xs text-gold-400">
            <span aria-hidden="true">♛ </span>
            GM View — Right-click or long-press any element to ping the player.
            Keyboard: focus an element then press{" "}
            <kbd className="font-mono bg-slate-800 border border-slate-700 rounded px-1">Alt+P</kbd>
          </p>
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
          <p className="text-sm text-[#b9baa3]/40 italic text-center">
            You have no available characters. Create one from your dashboard first.
          </p>
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

// ─── GM Tab Bar ───────────────────────────────────────────────────────────────
// Allows the GM to switch between Characters, Adversaries, and Encounter tabs.
// Players only see the Characters view (no tab bar shown).

const GM_TABS: { id: CampaignTab; label: string; icon: string }[] = [
  { id: "characters", label: "Characters", icon: "👤" },
  { id: "adversaries", label: "Adversaries", icon: "👹" },
  { id: "encounter", label: "Encounter", icon: "⚔️" },
];

interface GmTabBarProps {
  activeTab: CampaignTab;
  onTabChange: (tab: CampaignTab) => void;
  /** Number of adversaries in the active encounter (shown as badge). */
  encounterCount: number;
}

function GmTabBar({ activeTab, onTabChange, encounterCount }: GmTabBarProps) {
  return (
    <div
      role="tablist"
      aria-label="Campaign view"
      className="
        flex overflow-x-auto scrollbar-hide gap-0.5
        -mx-4 px-4 sm:mx-0 sm:px-0 sm:gap-1
        mb-4 border-b border-slate-800/60 pb-2
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

// ─── FearTracker ─────────────────────────────────────────────────────────────
// GM-only SRD Fear counter. Range 0–12, persisted via PATCH /campaigns/{id}.

const FEAR_MAX = 12;

interface FearTrackerProps {
  campaignId: string;
  currentFear: number;
}

function FearTracker({ campaignId, currentFear }: FearTrackerProps) {
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
              "h-3.5 flex-1 rounded-sm transition-colors",
              "focus:outline-none focus:ring-1 focus:ring-[#fe5f55]",
              i < localFear
                ? "bg-[#fe5f55]"
                : "bg-slate-700/60 hover:bg-[#fe5f55]/30",
            ].join(" ")}
          />
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

// ─── GmDicePanel ──────────────────────────────────────────────────────────────
// GM-only quick dice roller. Rolls are broadcast via WS with characterName "GM".

const GM_DICE: { label: string; faces: number }[] = [
  { label: "d4",  faces: 4  },
  { label: "d6",  faces: 6  },
  { label: "d8",  faces: 8  },
  { label: "d10", faces: 10 },
  { label: "d12", faces: 12 },
  { label: "d20", faces: 20 },
];

function gmNanoid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

interface GmDicePanelProps {
  wsCharacterId: string;
  onRoll: (result: RollResult) => void;
}

function GmDicePanel({ wsCharacterId, onRoll }: GmDicePanelProps) {
  const [bonus, setBonus] = useState(0);
  const bonusId = useId();

  const roll = useCallback(
    (faces: number) => {
      const value = Math.floor(Math.random() * faces) + 1;
      const total = value + bonus;
      const result: RollResult = {
        id: gmNanoid(),
        timestamp: new Date().toISOString(),
        request: {
          label: `GM d${faces}`,
          type: "generic",
          dice: [{ size: `d${faces}` as import("@/types/dice").DieSize, role: "generic" }],
          modifier: bonus || undefined,
          characterName: "GM",
        },
        dice: [{ size: `d${faces}` as import("@/types/dice").DieSize, role: "generic", value }],
        total,
      };
      onRoll(result);
    },
    [bonus, onRoll]
  );

  return (
    <div
      className="
        rounded-xl border border-[#577399]/25 bg-[#577399]/5
        px-4 py-2.5 mb-4
      "
      aria-label="GM dice roller"
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-widest text-[#577399]/70 shrink-0 select-none">
          GM Roll
        </span>

        {GM_DICE.map(({ label, faces }) => (
          <button
            key={label}
            type="button"
            onClick={() => roll(faces)}
            className="
              rounded-lg px-3 py-1 text-xs font-semibold
              border border-[#577399]/40 text-[#577399]
              hover:bg-[#577399]/20 hover:border-[#577399]
              transition-colors
              focus:outline-none focus:ring-2 focus:ring-[#577399]
            "
          >
            {label}
          </button>
        ))}

        {/* Bonus input */}
        <label htmlFor={bonusId} className="flex items-center gap-1 ml-auto text-xs text-[#b9baa3]/50">
          <span className="select-none">+bonus</span>
          <input
            id={bonusId}
            type="number"
            value={bonus}
            onChange={(e) => setBonus(Number(e.target.value))}
            className="
              w-14 rounded border border-slate-700/60 bg-slate-800
              px-1.5 py-0.5 text-xs text-[#f7f7ff] text-center
              focus:outline-none focus:ring-1 focus:ring-[#577399]
            "
          />
        </label>
      </div>
    </div>
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
  /** GM-only: which character (by characterId) has force-crit armed. null = none. */
  const [forceCritCharId, setForceCritCharId] = useState<string | null>(null);

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

  // ── Derived state ───────────────────────────────────────────────────────────
  const isGm        = campaign?.callerRole === "gm";
  const callerChar  = campaign?.members.find((m) => m.userId === user?.userId);
  const myCharId    = callerChar?.characterId ?? null;

  // Character the current player is viewing (for WebSocket)
  const wsCharacterId = selectedCharacterId ?? myCharId ?? "";

  // ── WebSocket: ping sending (GM) & receiving (player) ───────────────────────
  const { triggerPing } = usePingEffect();

  const { sendPing, sendDiceRoll, sendForceCrit, isConnected } = useGameWebSocket(
    campaignId,
    wsCharacterId,
    {
      // Player: received ping → highlight their own sheet element
      onPing: useCallback(
        (evt: PingEvent) => {
          if (evt.targetCharacterId === myCharId) {
            triggerPing(evt.fieldKey);
          }
        },
        [myCharId, triggerPing]
      ),
      // GM screen: received dice roll from a player → add to local log display.
      onDiceRoll: useCallback(
        (_result: RollResult) => {
          // (Future: show whose roll it was in the GM view.)
        },
        []
      ),
      // Keep local forceCritCharId in sync when another GM window sends force_crit
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
    sendDiceRoll(diceLog[0]);
  }, [lastRollId, diceLog, sendDiceRoll]);

  // GM: send ping to the selected character
  const handlePingField = useCallback(
    (fieldKey: string) => {
      if (!isGm || !selectedCharacterId) return;
      sendPing(selectedCharacterId, fieldKey);
    },
    [isGm, selectedCharacterId, sendPing]
  );

  // GM: toggle force-crit for a character. Arming one automatically disarms any
  // previously armed character so only one is ever active at a time.
  const handleForceCritToggle = useCallback(
    (charId: string) => {
      if (!isGm) return;
      const isCurrentlyArmed = forceCritCharId === charId;
      // Disarm old target if different
      if (forceCritCharId && forceCritCharId !== charId) {
        sendForceCrit(forceCritCharId, false);
      }
      const nextActive = !isCurrentlyArmed;
      sendForceCrit(charId, nextActive);
      setForceCritCharId(nextActive ? charId : null);
    },
    [isGm, forceCritCharId, sendForceCrit]
  );

  // GM: roll a die from the quick panel and broadcast it via WS
  const handleGmRoll = useCallback(
    (result: RollResult) => {
      sendDiceRoll(result);
    },
    [sendDiceRoll]
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
      {/* Header */}
      <header
        className="sticky top-0 z-10 border-b border-slate-800/60 backdrop-blur-sm"
        style={{ backgroundColor: "rgba(10,16,13,0.92)" }}
      >
        <div className="mx-auto flex max-w-[1400px] items-center justify-between px-4 py-3 gap-4">
          <div className="flex items-center gap-3 min-w-0">
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
              <div className="h-6 w-40 rounded bg-slate-700/60 animate-pulse" />
            ) : (
              <h1
                id={titleId}
                className="font-serif text-xl font-semibold text-[#f7f7ff] truncate"
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
          </div>

          {/* GM actions */}
          {isGm && campaign && (
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setShowInviteModal(true)}
                aria-haspopup="dialog"
                className="
                  rounded-lg px-4 py-2 text-sm font-semibold
                  border border-[#577399]/50 bg-[#577399]/10 text-[#577399]
                  hover:bg-[#577399]/20 hover:border-[#577399]
                  transition-colors
                  focus:outline-none focus:ring-2 focus:ring-[#577399]
                "
              >
                Invite
              </button>
              <a
                href={`/obs/dice?campaign=${campaignId}`}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Open OBS dice roller overlay in new tab"
                className="
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
                  rounded-lg px-4 py-2 text-sm font-medium
                  border border-slate-700/60 text-[#b9baa3]/60
                  hover:border-slate-600 hover:text-[#b9baa3]
                  transition-colors
                  focus:outline-none focus:ring-2 focus:ring-[#577399]
                "
              >
                Settings
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Main layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside
          className="
            w-full sm:w-[280px] shrink-0
            border-r border-slate-800/60
            overflow-y-auto
          "
          aria-label="Campaign roster"
        >
          <div className="p-4 space-y-2">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-[#b9baa3]/50 px-1 mb-3">
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
              // Find this member's character
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
                                // Clear selection if we just unassigned the viewed character
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
        </aside>

        {/* Main panel */}
        <main className="flex-1 overflow-y-auto px-4 py-6">
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
              {/* GM-only tools: Fear tracker + quick dice roller */}
              {isGm && (
                <>
                  <FearTracker
                    campaignId={campaignId}
                    currentFear={campaign.currentFear ?? 0}
                  />
                  <GmDicePanel
                    wsCharacterId={wsCharacterId}
                    onRoll={handleGmRoll}
                  />
                </>
              )}

              {/* GM Tab Bar — only shown to GM */}
              {isGm && (
                <GmTabBar
                  activeTab={activeTab}
                  onTabChange={setActiveTab}
                  encounterCount={encounterAdversaries}
                />
              )}

              {/* Tab Panels */}

              {/* Characters tab (default for players, first tab for GM) */}
              {(activeTab === "characters" || !isGm) && (
                <div
                  id="tabpanel-characters"
                  role={isGm ? "tabpanel" : undefined}
                  aria-labelledby={isGm ? "tab-characters" : undefined}
                >
                  {!selectedCharacterId && (
                    <>
                      {/* Player with no character yet → show assignment UI */}
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
                            Click a member card on the left to view their character sheet.
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
                      // Add to encounter — create one if none exists
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
            </>
          )}
        </main>
      </div>

      {/* Invite modal */}
      {showInviteModal && campaign && (
        <InviteManagementModal
          campaignId={campaignId}
          invites={campaign.invites ?? []}
          onClose={() => setShowInviteModal(false)}
        />
      )}

      {/* Dice log overlay (fixed lower-left) — visible to GM and players */}
      <DiceLog />
    </div>
  );
}
