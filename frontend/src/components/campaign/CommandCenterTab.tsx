"use client";

/**
 * src/components/campaign/CommandCenterTab.tsx
 *
 * GM-only "Command Center" tab: party vitals grid with danger-state
 * color coding, auto-sort by HP %, party Hope total, and Fear tracker.
 *
 * Read-only dashboard — tap a card to navigate to that character's sheet.
 */

import React, { useMemo } from "react";
import { useCharacter } from "@/hooks/useCharacter";
import { CommandCenterCard, getHpPercentage } from "@/components/campaign/CommandCenterCard";
import type { CampaignCharacterDetail } from "@/types/campaign";

// ─── Party Hope aggregator ────────────────────────────────────────────────────
// Each card fetches its own character data via useCharacter. To compute the
// party Hope total, we need a small wrapper that reads hope from each character.

function usePartyHope(characterIds: string[]): number {
  // We can't call hooks in a loop, but we can call up to a reasonable number
  // since party size is bounded (typically 3-6 players).
  // Use individual hook calls with stable ID ordering.
  const c0 = useCharacter(characterIds[0]);
  const c1 = useCharacter(characterIds[1]);
  const c2 = useCharacter(characterIds[2]);
  const c3 = useCharacter(characterIds[3]);
  const c4 = useCharacter(characterIds[4]);
  const c5 = useCharacter(characterIds[5]);
  const c6 = useCharacter(characterIds[6]);
  const c7 = useCharacter(characterIds[7]);

  return useMemo(() => {
    const results = [c0, c1, c2, c3, c4, c5, c6, c7];
    let total = 0;
    for (let i = 0; i < characterIds.length && i < 8; i++) {
      total += results[i]?.data?.hope ?? 0;
    }
    return total;
  }, [characterIds, c0.data, c1.data, c2.data, c3.data, c4.data, c5.data, c6.data, c7.data]);
}

// ─── Sorted character list (by damage% descending = most-hurt first) ─────────

function useSortedCharacters(characterIds: string[]): string[] {
  const c0 = useCharacter(characterIds[0]);
  const c1 = useCharacter(characterIds[1]);
  const c2 = useCharacter(characterIds[2]);
  const c3 = useCharacter(characterIds[3]);
  const c4 = useCharacter(characterIds[4]);
  const c5 = useCharacter(characterIds[5]);
  const c6 = useCharacter(characterIds[6]);
  const c7 = useCharacter(characterIds[7]);

  return useMemo(() => {
    const results = [c0, c1, c2, c3, c4, c5, c6, c7];
    const entries = characterIds
      .slice(0, 8)
      .map((id, i) => ({
        id,
        pct: results[i]?.data ? getHpPercentage(results[i].data!) : 1,
      }));
    entries.sort((a, b) => b.pct - a.pct);
    return entries.map((e) => e.id);
  }, [characterIds, c0.data, c1.data, c2.data, c3.data, c4.data, c5.data, c6.data, c7.data]);
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface CommandCenterTabProps {
  campaignId: string;
  /** All characters in the campaign (from campaign detail). */
  characters: CampaignCharacterDetail[];
  /** Current fear value for the compact fear display in the header. */
  currentFear: number;
  /** Callback to navigate to a specific character's sheet. */
  onSelectCharacter: (characterId: string) => void;
  /** Fear tracker component passed from parent (reuses the existing FearTracker). */
  fearTracker: React.ReactNode;
}

// ─── Main component ───────────────────────────────────────────────────────────

export function CommandCenterTab({
  campaignId,
  characters,
  currentFear,
  onSelectCharacter,
  fearTracker,
}: CommandCenterTabProps) {
  const characterIds = useMemo(
    () => characters.map((c) => c.characterId),
    [characters]
  );
  const partyHope = usePartyHope(characterIds);
  const sortedIds = useSortedCharacters(characterIds);

  // Build a lookup for fallback data
  const charLookup = useMemo(() => {
    const map = new Map<string, CampaignCharacterDetail>();
    characters.forEach((c) => map.set(c.characterId, c));
    return map;
  }, [characters]);

  // Empty state
  if (characters.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center space-y-3">
        <div aria-hidden="true" className="text-4xl opacity-20">&#9876;&#65039;</div>
        <p className="font-serif text-lg text-[#f7f7ff]/60">No characters in this campaign yet.</p>
        <p className="text-sm text-[#b9baa3]/40 max-w-xs">
          Invite players from the Characters tab to start building your party.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Thematic header */}
      <div className="space-y-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h2 className="font-body text-lg text-[#f7f7ff]/80 font-semibold">
            Command Center
          </h2>
          {/* Fear tracker */}
          {fearTracker}
        </div>
        {/* Party Hope total */}
        <p className="text-sm font-semibold text-[#DAA520]/80">
          Party Hope: {partyHope}
        </p>
      </div>

      {/* Party vitals grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {sortedIds.map((id) => {
          const member = charLookup.get(id);
          return (
            <div key={id} className="transition-all duration-500">
              <CommandCenterCard
                characterId={id}
                onSelect={onSelectCharacter}
                fallbackName={member?.name}
                fallbackAvatar={member?.avatarUrl ?? member?.portraitUrl}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
