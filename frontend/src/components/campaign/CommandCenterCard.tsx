"use client";

/**
 * src/components/campaign/CommandCenterCard.tsx
 *
 * Individual party-member card for the Command Center grid.
 * Displays HP/Stress/Armor bars, Hope, Evasion, and active conditions
 * with danger-state color coding based on HP percentage.
 *
 * Read-only — tapping navigates to the character's full sheet.
 */

import React from "react";
import { useCharacter } from "@/hooks/useCharacter";
import { SlotBar } from "@/components/campaign/shared/SlotBar";

type ShareState = "idle" | "loading" | "copied" | "error";

// ─── Danger states ────────────────────────────────────────────────────────────

type DangerState = "healthy" | "wounded" | "critical" | "down";

function getDangerState(marked: number, max: number): DangerState {
  if (max === 0) return "healthy";
  // marked = damage taken (count-up). remaining = max - marked.
  const remaining = max - marked;
  if (remaining <= 0) return "down";
  const remainingPct = remaining / max;
  if (remainingPct < 0.25) return "critical";   // <25% HP remaining
  if (remainingPct <= 0.5) return "wounded";     // 25-50% HP remaining
  return "healthy";                              // >50% HP remaining
}

const DANGER_BORDER: Record<DangerState, string> = {
  healthy:  "border-[#577399]/20",
  wounded:  "border-amber-400/40",
  critical: "border-[#fe5f55]/40 animate-danger-pulse",
  down:     "border-[#fe5f55]/60",
};

const DANGER_HP_FILL: Record<DangerState, string> = {
  healthy:  "bg-emerald-500",
  wounded:  "bg-amber-400",
  critical: "bg-[#fe5f55]",
  down:     "bg-[#fe5f55]",
};

const DANGER_BG: Record<DangerState, string> = {
  healthy:  "bg-slate-900/80",
  wounded:  "bg-slate-900/80",
  critical: "bg-slate-900/80",
  down:     "bg-[#fe5f55]/5",
};

const DANGER_GLOW: Record<DangerState, string> = {
  healthy:  "",
  wounded:  "",
  critical: "shadow-[0_0_8px_rgba(254,95,85,0.15)]",
  down:     "shadow-[0_0_8px_rgba(254,95,85,0.15)]",
};

// ─── Props ────────────────────────────────────────────────────────────────────

interface CommandCenterCardProps {
  characterId: string;
  /** Callback when card is tapped — navigate to character sheet. */
  onSelect: (characterId: string) => void;
  /** Fallback data from campaign member list (instant header while data loads). */
  fallbackName?: string;
  fallbackAvatar?: string | null;
  shareToken?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CommandCenterCard({
  characterId,
  onSelect,
  fallbackName,
  fallbackAvatar,
  shareToken,
}: CommandCenterCardProps) {
  const { data: character, isLoading } = useCharacter(characterId);
  const [shareState, setShareState] = React.useState<ShareState>("idle");

  const handleCopyShareUrl = React.useCallback(
    async (event: React.MouseEvent<HTMLButtonElement>) => {
      event.stopPropagation();
      if (!shareToken || shareState === "loading") return;

      setShareState("loading");
      try {
        const origin = typeof window !== "undefined" ? window.location.origin : "";
        const url = `${origin}/character/${characterId}/public?token=${shareToken}`;
        await navigator.clipboard.writeText(url);
        setShareState("copied");
        setTimeout(() => setShareState("idle"), 2500);
      } catch {
        setShareState("error");
        setTimeout(() => setShareState("idle"), 2500);
      }
    },
    [characterId, shareState, shareToken]
  );

  // Loading skeleton
  if (isLoading && !character) {
    return (
      <div className="animate-pulse rounded-xl border border-[#577399]/20 bg-slate-900/80 p-3 space-y-2">
        <div className="flex items-center gap-2.5">
          <div className="h-10 w-10 rounded-full bg-slate-700/60 shrink-0" />
          <div className="space-y-1.5 flex-1">
            <div className="h-4 w-24 rounded bg-slate-700/60" />
            <div className="h-2.5 w-full rounded bg-slate-700/40" />
          </div>
        </div>
      </div>
    );
  }

  // Minimal fallback when character data hasn't arrived
  if (!character) {
    return (
      <div
        role="button"
        tabIndex={0}
        onClick={() => onSelect(characterId)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onSelect(characterId);
          }
        }}
        className="w-full rounded-xl border border-[#577399]/20 bg-slate-900/80 p-3 text-left transition-colors hover:bg-slate-800/80"
      >
        <div className="flex items-center gap-2.5">
          {fallbackAvatar && (
            <img src={fallbackAvatar} alt="" className="h-10 w-10 rounded-full object-cover border border-[#577399]/30" />
          )}
          <p className="text-sm font-serif font-semibold text-parchment-100 truncate">
            {fallbackName ?? "Unknown"}
          </p>
          <ShareButton
            characterId={characterId}
            shareToken={shareToken}
            shareState={shareState}
            onCopy={handleCopyShareUrl}
          />
        </div>
      </div>
    );
  }

  const { trackers, derivedStats, hope, conditions = [] } = character;
  const hpMarked = trackers?.hp?.marked ?? 0;
  const hpMax    = trackers?.hp?.max ?? 0;
  const danger   = getDangerState(hpMarked, hpMax);
  const evasion  = derivedStats?.evasion ?? 0;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect(characterId)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect(characterId);
        }
      }}
      className={`
        w-full rounded-xl border p-3 text-left space-y-2
        transition-all duration-300
        hover:bg-slate-800/80 focus:outline-none focus:ring-2 focus:ring-[#577399]
        ${DANGER_BORDER[danger]} ${DANGER_BG[danger]} ${DANGER_GLOW[danger]}
      `}
      aria-label={`${character.name} — ${hpMax - hpMarked} of ${hpMax} HP remaining`}
    >
      {/* Header: avatar + name */}
        <div className="flex items-center gap-2.5">
          {/* Avatar */}
          {(character.portraitUrl || character.avatarUrl || fallbackAvatar) ? (
            <img
              src={character.portraitUrl || character.avatarUrl || fallbackAvatar || ""}
            alt=""
            className="h-10 w-10 rounded-full object-cover border border-[#577399]/30 shrink-0"
          />
        ) : (
          <div className="h-10 w-10 rounded-full bg-[#577399]/20 border border-[#577399]/30 shrink-0 flex items-center justify-center">
            <span className="text-sm font-bold text-[#577399]">
              {(character.name ?? "?")[0]?.toUpperCase()}
            </span>
          </div>
        )}
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-serif font-semibold truncate ${danger === "down" ? "line-through text-[#fe5f55]/70" : "text-parchment-100"}`}>
              {character.name}
            </p>
          </div>
          <ShareButton
            characterId={characterId}
            shareToken={shareToken}
            shareState={shareState}
            onCopy={handleCopyShareUrl}
          />
          {/* Danger warning icon */}
          {(danger === "critical" || danger === "down") && (
            <span aria-label="Danger" className="text-[#fe5f55] text-sm shrink-0">&#9888;</span>
          )}
        </div>

      {/* Slot bars: HP, Stress, Armor */}
      <div className="space-y-1">
        <SlotBar
          label="HP"
          marked={hpMarked}
          max={hpMax}
          fillColor={DANGER_HP_FILL[danger]}
          markedColor={danger === "healthy" ? "text-emerald-400" : danger === "wounded" ? "text-amber-400" : "text-[#fe5f55]"}
          barHeight="h-2.5"
        />
        <SlotBar
          label="STR"
          marked={trackers?.stress?.marked ?? 0}
          max={trackers?.stress?.max ?? 0}
          fillColor="bg-violet-500"
          markedColor="text-violet-400"
          barHeight="h-2.5"
        />
        <SlotBar
          label="ARM"
          marked={trackers?.armor?.marked ?? 0}
          max={trackers?.armor?.max ?? 0}
          fillColor="bg-[#577399]"
          barHeight="h-2.5"
        />
      </div>

      {/* Hope + Evasion inline */}
      <div className="flex items-center gap-3 text-xs">
        <span className="font-semibold text-[#DAA520]">Hope: {hope ?? 0}</span>
        <span className="font-semibold text-[#f7f7ff]">Eva: {evasion}</span>
      </div>

      {/* Conditions (compact, max 3 + overflow) */}
      {conditions.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {conditions.slice(0, 3).map((cond) => (
            <span
              key={cond}
              className="rounded-full border border-[#fe5f55]/30 bg-[#fe5f55]/5 px-1.5 py-0.5 text-[10px] text-[#fe5f55] font-medium"
            >
              {cond}
            </span>
          ))}
          {conditions.length > 3 && (
            <span className="rounded-full border border-[#577399]/30 bg-slate-900/60 px-1.5 py-0.5 text-[10px] text-[#b9baa3]/60 font-medium">
              +{conditions.length - 3}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Returns the damage fraction (0-1) for sorting. Higher = more danger.
 * marked/max where marked = damage taken (count-up system).
 * Exported for use by CommandCenterTab's sort logic.
 */
export function getHpPercentage(character: { trackers?: { hp?: { marked?: number; max?: number } } }): number {
  const max = character.trackers?.hp?.max ?? 0;
  if (max === 0) return 0; // no HP tracked → treat as healthy (0 danger)
  return (character.trackers?.hp?.marked ?? 0) / max;
}

function ShareButton({
  characterId,
  shareToken,
  shareState,
  onCopy,
}: {
  characterId: string;
  shareToken?: string;
  shareState: ShareState;
  onCopy: (event: React.MouseEvent<HTMLButtonElement>) => void;
}) {
  const label =
    shareState === "copied"
      ? "Copied!"
      : shareState === "error"
        ? "Failed"
        : "Copy share URL";

  return (
    <button
      type="button"
      onClick={(event) => {
        event.preventDefault();
        onCopy(event);
      }}
      disabled={!shareToken || shareState === "loading"}
      aria-label={label}
      title={label}
      className={[
        "ml-auto flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border transition-colors",
        "focus:outline-none focus:ring-2 focus:ring-[#577399]",
        "disabled:cursor-not-allowed disabled:opacity-40",
        shareState === "copied"
          ? "border-green-500/50 bg-green-500/10 text-green-400"
          : shareState === "error"
            ? "border-red-500/50 bg-red-500/10 text-red-400"
            : "border-[#577399]/30 bg-slate-950/40 text-[#b9baa3]/70 hover:border-[#577399]/60 hover:text-[#577399]",
      ].join(" ")}
      data-character-id={characterId}
    >
      {shareState === "loading" ? (
        <i className="fa-solid fa-arrows-rotate animate-spin text-[11px]" aria-hidden="true" />
      ) : shareState === "copied" ? (
        <i className="fa-solid fa-check text-[11px]" aria-hidden="true" />
      ) : shareState === "error" ? (
        <i className="fa-solid fa-circle-exclamation text-[11px]" aria-hidden="true" />
      ) : (
        <i className="fa-solid fa-link text-[11px]" aria-hidden="true" />
      )}
    </button>
  );
}
