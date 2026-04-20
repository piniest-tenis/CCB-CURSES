"use client";

/**
 * src/components/campaign/PartyOverviewTile.tsx
 *
 * Individual character tile for the Party Overview Sidebar.
 *
 * Renders portrait, name, HP/Stress/Armor bars, Hope, Evasion, and conditions.
 * Applies danger-state color coding (healthy → wounded → critical → down).
 * Adds a secondary "Stress Full" signal distinct from HP danger.
 * Flashes bars briefly when stat values change (red for decrease, green for increase).
 *
 * Read-only — tapping navigates to the character's full sheet.
 */

import React, { useEffect, useRef, useState } from "react";
import { useCharacter } from "@/hooks/useCharacter";
import { SlotBar } from "@/components/campaign/shared/SlotBar";

// ─── Re-exported danger helpers (also used by CommandCenterCard) ──────────────

export type DangerState = "healthy" | "wounded" | "critical" | "down";

export function getDangerState(marked: number, max: number): DangerState {
  if (max === 0) return "healthy";
  const remaining = max - marked;
  if (remaining <= 0) return "down";
  const pct = remaining / max;
  if (pct < 0.25) return "critical";
  if (pct <= 0.5)  return "wounded";
  return "healthy";
}

// ─── Danger-state style maps ──────────────────────────────────────────────────

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

const DANGER_HP_MARKED: Record<DangerState, string> = {
  healthy:  "text-emerald-400",
  wounded:  "text-amber-400",
  critical: "text-[#fe5f55]",
  down:     "text-[#fe5f55]",
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

// ─── Flash hook ───────────────────────────────────────────────────────────────

type FlashState = "down" | "up" | null;

function useFlash(value: number): FlashState {
  const prev = useRef(value);
  const [flash, setFlash] = useState<FlashState>(null);

  useEffect(() => {
    if (value === prev.current) return;
    const direction = value < prev.current ? "down" : "up";
    prev.current = value;
    setFlash(direction);
    const t = setTimeout(() => setFlash(null), 420);
    return () => clearTimeout(t);
  }, [value]);

  return flash;
}

// ─── FlashBar wrapper ─────────────────────────────────────────────────────────
// Wraps a SlotBar with a brief color flash when the value changes.

interface FlashBarProps {
  label: string;
  marked: number;
  max: number;
  fillColor: string;
  markedColor?: string;
  /** Override fill to coral when stress is full */
  stressFull?: boolean;
}

function FlashBar({ label, marked, max, fillColor, markedColor, stressFull }: FlashBarProps) {
  const flash = useFlash(marked);
  const effectiveFill = stressFull ? "bg-[#fe5f55]" : fillColor;

  return (
    <div
      className={[
        "rounded transition-colors duration-200",
        flash === "down" ? "animate-stat-flash-down" : "",
        flash === "up"   ? "animate-stat-flash-up"   : "",
      ].join(" ")}
    >
      <SlotBar
        label={label}
        marked={marked}
        max={max}
        fillColor={effectiveFill}
        markedColor={markedColor}
        barHeight="h-2.5"
        labelWidth="w-8"
      />
    </div>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface PartyOverviewTileProps {
  characterId: string;
  fallbackName?: string;
  fallbackAvatar?: string | null;
  onSelect: (characterId: string) => void;
  /** Live region element id for announcing stat changes to screen readers */
  liveRegionId?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function PartyOverviewTile({
  characterId,
  fallbackName,
  fallbackAvatar,
  onSelect,
}: PartyOverviewTileProps) {
  const { data: character, isLoading } = useCharacter(characterId);

  // ── Loading skeleton ─────────────────────────────────────────────────────
  if (isLoading && !character) {
    return (
      <div className="animate-pulse rounded-xl border border-[#577399]/20 bg-slate-900/80 p-3 space-y-2.5">
        <div className="flex items-center gap-2.5">
          <div className="h-10 w-10 rounded-full bg-slate-700/60 shrink-0" />
          <div className="space-y-1.5 flex-1">
            <div className="h-3.5 w-28 rounded bg-slate-700/60" />
            <div className="h-2 w-full rounded bg-slate-700/40" />
          </div>
        </div>
        <div className="space-y-1.5">
          <div className="h-2.5 w-full rounded bg-slate-700/40" />
          <div className="h-2.5 w-full rounded bg-slate-700/40" />
          <div className="h-2.5 w-3/4 rounded bg-slate-700/40" />
        </div>
      </div>
    );
  }

  // ── Minimal fallback ─────────────────────────────────────────────────────
  if (!character) {
    return (
      <button
        type="button"
        onClick={() => onSelect(characterId)}
        className="w-full rounded-xl border border-[#577399]/20 bg-slate-900/80 p-3 text-left hover:bg-slate-800/80 transition-colors focus:outline-none focus:ring-2 focus:ring-[#577399]"
      >
        <div className="flex items-center gap-2.5">
          {fallbackAvatar && (
            <img src={fallbackAvatar} alt="" className="h-10 w-10 rounded-full object-cover border border-[#577399]/30 shrink-0" />
          )}
          <p className="text-sm font-serif font-semibold text-parchment-100 truncate">
            {fallbackName ?? "Unknown"}
          </p>
        </div>
      </button>
    );
  }

  // ── Derived values ───────────────────────────────────────────────────────
  const { trackers, derivedStats, hope, conditions = [] } = character;

  const hpMarked     = trackers?.hp?.marked     ?? 0;
  const hpMax        = trackers?.hp?.max        ?? 0;
  const stressMarked = trackers?.stress?.marked ?? 0;
  const stressMax    = trackers?.stress?.max    ?? 0;
  const armorMarked  = trackers?.armor?.marked  ?? 0;
  const armorMax     = trackers?.armor?.max     ?? 0;
  const evasion      = derivedStats?.evasion    ?? 0;

  const danger     = getDangerState(hpMarked, hpMax);
  const stressFull = stressMax > 0 && stressMarked >= stressMax;
  const isDown     = danger === "down";
  const isCritical = danger === "critical";

  // ── Aria label ───────────────────────────────────────────────────────────
  const hpRemaining  = hpMax - hpMarked;
  const dangerLabel  = isDown ? "Down" : isCritical ? "Critical" : danger === "wounded" ? "Wounded" : "";
  const stressLabel  = stressFull ? " — Stress full" : "";
  const ariaLabel    = [
    character.name,
    dangerLabel ? `— ${dangerLabel}: ${hpRemaining} of ${hpMax} HP remaining` : `— ${hpRemaining} of ${hpMax} HP remaining`,
    stressLabel,
  ].join("");

  return (
    <button
      type="button"
      onClick={() => onSelect(characterId)}
      aria-label={ariaLabel}
      className={[
        "w-full rounded-xl border p-3 text-left space-y-2",
        "transition-all duration-300",
        "hover:bg-slate-800/80 focus:outline-none focus:ring-2 focus:ring-[#577399]",
        DANGER_BORDER[danger],
        DANGER_BG[danger],
        DANGER_GLOW[danger],
      ].join(" ")}
    >
      {/* ── Identity row ──────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2.5">
        {/* Portrait */}
        {(character.portraitUrl || character.avatarUrl || fallbackAvatar) ? (
          <img
            src={character.portraitUrl || character.avatarUrl || fallbackAvatar || ""}
            alt=""
            className={[
              "h-10 w-10 rounded-full object-cover border border-[#577399]/30 shrink-0",
              isDown ? "opacity-60 grayscale-[40%]" : "",
            ].join(" ")}
          />
        ) : (
          <div className="h-10 w-10 rounded-full bg-[#577399]/20 border border-[#577399]/30 shrink-0 flex items-center justify-center">
            <span className="text-sm font-bold text-[#577399]">
              {(character.name ?? "?")[0]?.toUpperCase()}
            </span>
          </div>
        )}

        {/* Name + danger badge */}
        <div className="flex-1 min-w-0">
          <p className={[
            "text-sm font-serif font-semibold truncate",
            isDown ? "line-through text-[#fe5f55]/70" : "text-parchment-100",
          ].join(" ")}>
            {character.name}
          </p>
        </div>

        {/* Warning icon — HP critical or down */}
        {(isCritical || isDown) && (
          <span aria-label="Danger" className="text-[#fe5f55] text-sm shrink-0">&#9888;</span>
        )}
      </div>

      {/* ── Survival bars: HP, Stress, Armor ──────────────────────────────── */}
      <div className="space-y-1">
        {/* HP */}
        <FlashBar
          label="HP"
          marked={hpMarked}
          max={hpMax}
          fillColor={DANGER_HP_FILL[danger]}
          markedColor={DANGER_HP_MARKED[danger]}
        />

        {/* Stress — with stress-full signal */}
        <div className="flex items-center gap-1">
          <div className="flex-1">
            <FlashBar
              label="STR"
              marked={stressMarked}
              max={stressMax}
              fillColor="bg-violet-500"
              markedColor={stressFull ? "text-[#fe5f55]" : "text-violet-400"}
              stressFull={stressFull}
            />
          </div>
          {stressFull && (
            <span
              aria-label="Stress full"
              title="Stress full"
              className="text-[#fe5f55] text-xs shrink-0 leading-none"
            >
              &#9888;
            </span>
          )}
        </div>

        {/* Armor */}
        <FlashBar
          label="ARM"
          marked={armorMarked}
          max={armorMax}
          fillColor="bg-[#577399]"
          markedColor="text-[#577399]"
        />
      </div>

      {/* ── Action economy: Hope + Evasion ────────────────────────────────── */}
      <div className="flex items-center gap-3 text-xs">
        <span className="font-semibold text-[#DAA520]">Hope: {hope ?? 0}</span>
        <span className="font-semibold text-[#f7f7ff]/80">Eva: {evasion}</span>
      </div>

      {/* ── Conditions (max 2 + overflow) ─────────────────────────────────── */}
      {conditions.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {conditions.slice(0, 2).map((cond) => (
            <span
              key={cond}
              className="rounded-full border border-[#fe5f55]/30 bg-[#fe5f55]/5 px-1.5 py-0.5 text-[10px] text-[#fe5f55] font-medium"
            >
              {cond}
            </span>
          ))}
          {conditions.length > 2 && (
            <span className="rounded-full border border-[#577399]/30 bg-slate-900/60 px-1.5 py-0.5 text-[10px] text-[#b9baa3]/60 font-medium">
              +{conditions.length - 2}
            </span>
          )}
        </div>
      )}
    </button>
  );
}
