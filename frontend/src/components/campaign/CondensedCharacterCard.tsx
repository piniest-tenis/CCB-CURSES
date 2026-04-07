"use client";

/**
 * src/components/campaign/CondensedCharacterCard.tsx
 *
 * A compact "stat block" view of a character for GM campaign view on mobile.
 * Displays key stats at a glance without requiring a full character sheet load.
 *
 * Shows:
 *   - Name, Class, Level
 *   - Avatar/portrait (small)
 *   - Evasion, Armor Score
 *   - HP, Stress, Armor (current/max slot counts)
 *   - Damage thresholds (Major, Severe)
 *   - Hope (current/max)
 *   - Active conditions count
 *   - Domain loadout card names
 *
 * Design:
 *   - Single rounded card, fits within campaign mobile view
 *   - Matches existing dark theme (slate-900, steel-400, parchment, gold)
 *   - 44px minimum touch target on the "Expand" button (WCAG 2.5.5)
 *   - No interactive controls — purely read-only display
 */

import React from "react";
import { useCharacter } from "@/hooks/useCharacter";
import { useCharacterStore } from "@/store/characterStore";
import { useDomainCard } from "@/hooks/useGameData";
import { StatChip } from "@/components/campaign/shared/StatChip";
import { SlotBar } from "@/components/campaign/shared/SlotBar";

// ─── DomainCardName ───────────────────────────────────────────────────────────
// Resolves a composite card ID (e.g. "blade:1") to a card name.

function DomainCardName({ cardId }: { cardId: string }) {
  const [domain, id] = cardId.includes(":") ? cardId.split(":") : ["", cardId];
  const { data: card } = useDomainCard(domain, id);
  return <>{card?.name ?? cardId}</>;
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface CondensedCharacterCardProps {
  characterId: string;
  /** Callback to expand to full sheet view */
  onExpand: () => void;
  /** Pre-loaded character name from campaign data (used while full data loads) */
  fallbackName?: string;
  fallbackClass?: string;
  fallbackLevel?: number;
  fallbackAvatar?: string | null;
}

// ─── Main component ───────────────────────────────────────────────────────────

export function CondensedCharacterCard({
  characterId,
  onExpand,
  fallbackName,
  fallbackClass,
  fallbackLevel,
  fallbackAvatar,
}: CondensedCharacterCardProps) {
  const { data: character, isLoading } = useCharacter(characterId);

  // Loading skeleton
  if (isLoading && !character) {
    return (
      <div className="animate-pulse rounded-xl border border-[#577399]/20 bg-slate-900/80 p-4 space-y-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-slate-700/60" />
          <div className="space-y-1.5 flex-1">
            <div className="h-4 w-32 rounded bg-slate-700/60" />
            <div className="h-3 w-20 rounded bg-slate-700/40" />
          </div>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="h-12 rounded-lg bg-slate-700/40" />
          ))}
        </div>
      </div>
    );
  }

  if (!character) {
    // Fallback minimal card while data loads
    return (
      <div className="rounded-xl border border-[#577399]/20 bg-slate-900/80 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {fallbackAvatar && (
              <img src={fallbackAvatar} alt="" className="h-10 w-10 rounded-full object-cover border border-[#577399]/30" />
            )}
            <div>
              <p className="text-sm font-semibold text-parchment-100">{fallbackName ?? "Unknown"}</p>
              <p className="text-xs text-parchment-500">
                {fallbackClass ?? "—"}{fallbackLevel ? ` · Lv ${fallbackLevel}` : ""}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onExpand}
            className="min-h-[44px] min-w-[44px] rounded-lg border border-[#577399]/30 bg-[#577399]/10 px-3 py-2 text-xs font-semibold text-[#b9baa3] hover:bg-[#577399]/20 hover:border-[#577399] transition-colors focus:outline-none focus:ring-2 focus:ring-[#577399]"
          >
            View Sheet
          </button>
        </div>
      </div>
    );
  }

  const { stats, trackers, damageThresholds, hope, hopeMax = 6, conditions = [], derivedStats } = character;
  const evasion = derivedStats?.evasion ?? 0;
  const armorScore = derivedStats?.armor ?? 0;

  return (
    <div
      className="rounded-xl border border-[#577399]/20 bg-slate-900/80 p-4 space-y-3 shadow-card"
      role="region"
      aria-label={`${character.name} stat block`}
    >
      {/* Header: avatar, name, class/level, expand button */}
      <div className="flex items-center gap-3">
        {/* Avatar */}
        {(character.portraitUrl || character.avatarUrl || fallbackAvatar) && (
          <img
            src={character.portraitUrl || character.avatarUrl || fallbackAvatar || ""}
            alt=""
            className="h-10 w-10 rounded-full object-cover border border-[#577399]/30 shrink-0"
          />
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-parchment-100 truncate">{character.name}</p>
          <p className="text-xs text-parchment-500 truncate">
            {character.className ?? "—"} · Lv {character.level}
          </p>
        </div>
        <button
          type="button"
          onClick={onExpand}
          aria-label={`View full sheet for ${character.name}`}
          className="min-h-[44px] min-w-[44px] rounded-lg border border-[#577399]/30 bg-[#577399]/10 px-3 py-2 text-xs font-semibold text-[#b9baa3] hover:bg-[#577399]/20 hover:border-[#577399] transition-colors focus:outline-none focus:ring-2 focus:ring-steel-400 shrink-0"
        >
          Full View
        </button>
      </div>

      {/* Key derived stats row: Evasion, Armor Score, Hope, Conditions */}
      <div className="grid grid-cols-4 gap-1.5">
        <StatChip label="Evasion" value={evasion} borderColor="border-amber-500/30" color="text-amber-400" />
        <StatChip label="Armor" value={armorScore} borderColor="border-[#577399]/40" />
        <StatChip
          label="Hope"
          value={`${hope}/${hopeMax}`}
          borderColor="border-[#DAA520]/30"
          color="text-[#DAA520]"
        />
        <StatChip
          label="Cond."
          value={conditions.length}
          borderColor={conditions.length > 0 ? "border-[#fe5f55]/40" : "border-[#577399]/30"}
          color={conditions.length > 0 ? "text-[#fe5f55]" : "text-[#b9baa3]"}
        />
      </div>

      {/* Slot trackers: HP, Stress, Armor */}
      <div className="space-y-1.5">
        <SlotBar
          label="HP"
          marked={trackers?.hp?.marked ?? 0}
          max={trackers?.hp?.max ?? 0}
          fillColor="bg-emerald-500"
          markedColor="text-emerald-400"
        />
        <SlotBar
          label="Stress"
          marked={trackers?.stress?.marked ?? 0}
          max={trackers?.stress?.max ?? 0}
          fillColor="bg-violet-500"
          markedColor="text-violet-400"
        />
        <SlotBar
          label="Armor"
          marked={trackers?.armor?.marked ?? 0}
          max={trackers?.armor?.max ?? 0}
          fillColor="bg-[#577399]"
        />
      </div>

      {/* Damage thresholds */}
      <div className="flex items-center gap-3 text-xs">
        <span className="text-parchment-500 uppercase tracking-wider font-medium">Thresholds</span>
        <span className="text-parchment-300">
          Major <strong className="text-[#b9cfe8]">{damageThresholds?.major ?? "—"}</strong>
        </span>
        <span className="text-[#b9baa3]/40">|</span>
        <span className="text-parchment-300">
          Severe <strong className="text-[#f7f7ff]">{damageThresholds?.severe ?? "—"}</strong>
        </span>
      </div>

      {/* Domain loadout card names */}
      {character.domainLoadout && character.domainLoadout.length > 0 && (
        <div>
          <span className="text-[10px] uppercase tracking-wider text-parchment-500 font-medium">Domains</span>
          <div className="flex flex-wrap gap-1 mt-1">
            {character.domainLoadout.map((cardId) => (
              <span
                key={cardId}
                className="rounded-full border border-[#577399]/20 bg-slate-850 px-2 py-0.5 text-[11px] text-parchment-400"
              >
                <DomainCardName cardId={cardId} />
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Conditions */}
      <div>
        <span className="text-[10px] uppercase tracking-wider text-parchment-500 font-medium">Conditions</span>
        <div className="mt-1">
          {conditions.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {conditions.map((cond) => (
                <span
                  key={cond}
                  className="rounded-full border border-[#fe5f55]/30 bg-[#fe5f55]/5 px-2 py-0.5 text-[11px] text-[#fe5f55] font-medium"
                >
                  {cond}
                </span>
              ))}
            </div>
          ) : (
            <span className="text-xs text-[#b9baa3]/40 italic">None active</span>
          )}
        </div>
      </div>
    </div>
  );
}
