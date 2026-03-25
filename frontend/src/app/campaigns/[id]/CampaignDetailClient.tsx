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
import { useCampaignDetail, useRemoveMember } from "@/hooks/useCampaigns";
import { useCampaignStore } from "@/store/campaignStore";
import { useGameWebSocket } from "@/hooks/useGameWebSocket";
import { usePingEffect } from "@/hooks/usePingEffect";
import type { PingEvent } from "@/types/campaign";
import { MemberCard } from "@/components/campaign/MemberCard";
import { InviteManagementModal } from "@/components/campaign/InviteManagementModal";
import { CharacterSheet } from "@/components/character/CharacterSheet";

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
// Wraps the CharacterSheet to intercept middle-click + Alt+P for GM pinging.
// Also adds data-field-key attributes to the wrapper itself for player-side pings.

interface SheetPingWrapperProps {
  characterId: string;
  isGm: boolean;
  onPingField: (fieldKey: string) => void;
}

function SheetPingWrapper({ characterId, isGm, onPingField }: SheetPingWrapperProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Middle-click → ping
  const handleAuxClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!isGm || e.button !== 1) return;
      e.preventDefault();

      const target = e.target as Element;
      const fieldEl = target.closest("[data-field-key]");
      const fieldKey = fieldEl?.getAttribute("data-field-key");
      if (fieldKey) onPingField(fieldKey);
    },
    [isGm, onPingField]
  );

  // Alt+P when any sheet element is focused → ping
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (!isGm || !(e.altKey && e.key === "p")) return;
      e.preventDefault();

      const activeEl = document.activeElement;
      if (!activeEl) return;

      const fieldEl = activeEl.closest("[data-field-key]");
      const fieldKey = fieldEl?.getAttribute("data-field-key");
      if (fieldKey) onPingField(fieldKey);
    },
    [isGm, onPingField]
  );

  return (
    <div
      ref={wrapperRef}
      onAuxClick={isGm ? handleAuxClick : undefined}
      onKeyDown={isGm ? handleKeyDown : undefined}
      // Prevent context menu on middle-click on supported browsers
      onContextMenu={isGm ? (e) => e.button === 1 && e.preventDefault() : undefined}
      className="relative"
      aria-label={
        isGm
          ? "Character sheet — middle-click or Alt+P on any element to ping a player"
          : undefined
      }
    >
      {isGm && (
        <div className="mb-3 rounded-lg border border-gold-800/40 bg-gold-950/20 px-4 py-2">
          <p className="text-xs text-gold-400">
            <span aria-hidden="true">♛ </span>
            GM View — Middle-click any element to ping the player.
            Keyboard: focus an element then press{" "}
            <kbd className="font-mono bg-slate-800 border border-slate-700 rounded px-1">Alt+P</kbd>
          </p>
        </div>
      )}
      <CharacterSheet characterId={characterId} />
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

  const { selectedCharacterId, setActiveCampaign, setSelectedCharacter } = useCampaignStore();
  const [showInviteModal, setShowInviteModal] = useState(false);

  const titleId = useId();

  // Auth guard
  useEffect(() => {
    if (isReady && !isAuthenticated) router.replace("/auth/login");
  }, [isReady, isAuthenticated, router]);

  // Track active campaign in store
  useEffect(() => {
    if (campaignId) setActiveCampaign(campaignId);
    return () => setActiveCampaign(null);
  }, [campaignId, setActiveCampaign]);

  // ── Derived state ───────────────────────────────────────────────────────────
  const isGm        = campaign?.callerRole === "gm";
  const callerChar  = campaign?.members.find((m) => m.userId === user?.userId);
  const myCharId    = callerChar?.characterId ?? null;

  // Character the current player is viewing (for WebSocket)
  const wsCharacterId = selectedCharacterId ?? myCharId ?? "";

  // ── WebSocket: ping sending (GM) & receiving (player) ───────────────────────
  const { triggerPing } = usePingEffect();

  const { sendPing, isConnected } = useGameWebSocket(
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
    }
  );

  // GM: send ping to the selected character
  const handlePingField = useCallback(
    (fieldKey: string) => {
      if (!isGm || !selectedCharacterId) return;
      sendPing(fieldKey);
    },
    [isGm, selectedCharacterId, sendPing]
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
                <MemberCard
                  key={member.userId}
                  member={member}
                  primaryGmId={campaign.primaryGmId}
                  characterName={memberChar?.name ?? null}
                  isSelected={selectedCharacterId === charId}
                  isGm={isGm}
                  isRemoving={
                    removeMemberMutation.isPending &&
                    removeMemberMutation.variables === member.userId
                  }
                  onSelect={() => {
                    if (charId) setSelectedCharacter(charId);
                  }}
                  onRemove={
                    isGm && !member.characterId?.startsWith(campaign.primaryGmId)
                      ? () => removeMemberMutation.mutate(member.userId)
                      : undefined
                  }
                />
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

          {!isLoading && !isError && !selectedCharacterId && (
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

          {!isLoading && !isError && selectedCharacterId && (
            <SheetPingWrapper
              characterId={selectedCharacterId}
              isGm={isGm}
              onPingField={handlePingField}
            />
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
    </div>
  );
}
