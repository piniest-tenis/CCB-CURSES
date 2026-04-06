"use client";

/**
 * src/components/character/TrackersPanel.tsx
 *
 * Renders:
 * - Damage threshold inputs (Major / Severe only — SRD page 20)
 * - Slot trackers (HP, Stress, Armor) — clickable circles, each click
 *   calls POST /characters/{id}/actions with mark-hp / clear-hp / etc.
 * - Proficiency display — scalar integer (SRD page 3/22)
 * - Primary + secondary weapon cards (full field set)
 * - Hope tracker — +/- buttons call gain-hope / spend-hope
 * - Experiences list
 * - Traits section (Ancestry × 2 + Community traits)
 *
 * Action wiring:
 *   Slot click (mark)   → mark-hp / mark-stress / mark-armor   { n: 1 }
 *   Slot click (clear)  → clear-hp / clear-stress / clear-armor { n: 1 }
 *   Hope + button       → gain-hope  { n: 1 }
 *   Hope - button       → spend-hope { n: 1 }
 *
 * Inline errors (role="alert") appear directly below the tracker group,
 * never as toasts. Buttons are never disabled preemptively.
 */

import React, { useState } from "react";
import { StatTooltip } from "./StatTooltip";
import { useStatBreakdowns } from "@/hooks/useStatBreakdowns";
import { useCharacterStore } from "@/store/characterStore";
import {
  useAncestry,
  useCommunity,
  useClass,
  useDomainCard,
} from "@/hooks/useGameData";
import { useLoadoutDamageBonuses } from "@/hooks/useLoadoutDamageBonuses";
import { useTraitModifiers } from "@/hooks/useTraitModifiers";
import { useActionButton, InlineActionError } from "./ActionButton";
import { EditableField } from "./EditSidebar";
import { experienceNameField } from "./editSidebarConfig";
import { ALL_ARMOR, ALL_TIER1_WEAPONS } from "@/lib/srdEquipment";
import type { SRDArmor, SRDWeapon } from "@/lib/srdEquipment";
import { DiceRollButton } from "@/components/dice/DiceRollButton";
import type { RollRequest, DieSize, RollBonus } from "@/types/dice";
import type { CoreStatName } from "@shared/types";

// ─── Props helper: characterId is provided by TrackersPanel from the store ────

function useCharacterId(): string {
  const { activeCharacter } = useCharacterStore();
  return activeCharacter?.characterId ?? "";
}

// ─── ActionableSlotTracker ────────────────────────────────────────────────────
// Like SlotTracker but each circle click fires a server action.

interface ActionableSlotTrackerProps {
  label: string;
  marked: number;
  max: number;
  /** Action fired when clicking an empty slot (marking) */
  markActionId: string;
  /** Action fired when clicking a filled slot (clearing) */
  clearActionId: string;
  characterId: string;
  onMaxChange: (value: number) => void;
  colorFilled?: string;
  /** Border color for empty (unmarked) circles. Defaults to border-steel-400/30 */
  colorEmpty?: string;
  /** Text color class for the marked count in the numeric summary */
  markedColor?: string;
  hardMax?: number;
  /** Optional tooltip node rendered beside the label. */
  tooltipContent?: React.ReactNode;
}

function ActionableSlotTracker({
  label,
  marked,
  max,
  markActionId,
  clearActionId,
  characterId,
  onMaxChange,
  colorFilled = "bg-steel-400",
  colorEmpty = "border-steel-400/30",
  markedColor,
  hardMax,
  tooltipContent,
}: ActionableSlotTrackerProps) {
  const { fire, isPending, inlineError } = useActionButton(characterId);
  const errorId = React.useId();

  const handleToggle = async (index: number) => {
    const isFilled = index < marked;
    if (isFilled) {
      await fire(clearActionId, { n: marked - index });
    } else {
      await fire(markActionId, { n: index + 1 - marked });
    }
  };

  return (
    <div className="flex flex-col gap-1">
      {/* Header row: label + numeric summary + max editor */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-parchment-400">
          {label}
        </span>
        <div className="flex items-center gap-1 text-xs">
          <span
            aria-live="polite"
            aria-label={`${label}: ${marked} of ${max}`}
            className={`font-semibold tabular-nums ${markedColor ?? "text-[#f7f7ff]"}`}
          >
            {marked}
          </span>
          <span className="text-parchment-600">/</span>
          {/* When hardMax is set the max is derived — show as read-only,
              wrapped in tooltip trigger if tooltipContent is provided. */}
          {hardMax != null ? (
            tooltipContent ? (
              // tooltipContent is a StatTooltip wrapping the max value span
              tooltipContent
            ) : (
              <span
                aria-label={`${label} max slots`}
                className="w-7 text-center text-[#b9baa3] tabular-nums"
              >
                {hardMax}
              </span>
            )
          ) : (
            <input
              type="number"
              min={1}
              max={20}
              value={max}
              onChange={(e) => {
                const v = parseInt(e.target.value, 10);
                if (!isNaN(v) && v > 0) onMaxChange(v);
              }}
              aria-label={`${label} max slots`}
              className="
                w-7 bg-transparent text-center text-[#b9baa3]
                border-b border-steel-400/40 focus:outline-none focus:ring-1 focus:ring-steel-400 focus:border-steel-400
                [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none
                transition-colors
              "
            />
          )}
        </div>
      </div>

      {/* Slot circles — 24px circles with sufficient spacing for WCAG 2.5.8 */}
      <div
        className="flex flex-wrap gap-1"
        role="group"
        aria-label={`${label} slots`}
        aria-describedby={inlineError ? errorId : undefined}
      >
        {Array.from({ length: max }, (_, i) => {
          const filled = i < marked;
          return (
            <button
              key={i}
              type="button"
              onClick={() => handleToggle(i)}
              disabled={isPending}
              aria-label={`${label} slot ${i + 1} — ${filled ? "marked" : "empty"}`}
              aria-pressed={filled}
              className={[
                // 24px visible, but min-h/min-w ensures 32px touch target
                "h-6 w-6 min-h-[32px] min-w-[32px] rounded-full border-2 transition-all duration-150",
                "focus:outline-none focus:ring-2 focus:ring-steel-400 focus:ring-offset-1 focus:ring-offset-slate-900",
                "disabled:opacity-60 disabled:cursor-wait",
                filled
                  ? `${colorFilled} border-transparent shadow-sm`
                  : `${colorEmpty} bg-transparent hover:border-steel-400`,
              ].join(" ")}
            />
          );
        })}
      </div>
      <InlineActionError message={inlineError} id={errorId} />
    </div>
  );
}

// ─── DamageCalculatorSidebar ─────────────────────────────────────────────────
// SRD p.20, 29: Player inputs raw damage. Sidebar shows the damage tier and
// HP to mark. Player may optionally mark 1 Armor Slot to drop the tier one
// step. Accept fires mark-hp (and mark-armor if used). Cancel discards.
//
// Damage resolution (SRD p.20):
//   damage >= severe threshold  → Severe  → 3 HP
//   damage >= major threshold   → Major   → 2 HP
//   damage > 0                  → Minor   → 1 HP
//   damage <= 0                 → None    → 0 HP
//
// Armor (SRD p.29): Mark 1 slot → drop severity one tier:
//   Severe → Major, Major → Minor, Minor → None

type DamageTier = "none" | "minor" | "major" | "severe";

function calcTier(damage: number, major: number, severe: number): DamageTier {
  if (damage <= 0) return "none";
  if (damage >= severe) return "severe";
  if (damage >= major) return "major";
  return "minor";
}

function tierDown(tier: DamageTier): DamageTier {
  if (tier === "severe") return "major";
  if (tier === "major") return "minor";
  return "none";
}

const TIER_HP: Record<DamageTier, number> = {
  none: 0,
  minor: 1,
  major: 2,
  severe: 3,
};

const TIER_LABEL: Record<DamageTier, string> = {
  none: "No damage",
  minor: "Minor",
  major: "Major",
  severe: "Severe",
};

const TIER_COLOR: Record<DamageTier, string> = {
  none: "text-[#b9baa3]",
  minor: "text-[#f7f7ff]",
  major: "text-[#b9cfe8]",
  severe: "text-[#fe5f55]",
};

interface DamageCalculatorSidebarProps {
  open: boolean;
  onClose: () => void;
  major: number;
  severe: number;
  armorMarked: number;
  armorMax: number;
  characterId: string;
  /** CardId of the first active aura (e.g. "Valiance/aura-of-bravery"), or null */
  activeAuraCardId: string | null;
  /** The character's spellcast trait key, or null if unknown */
  spellcastTrait: CoreStatName | null;
  /** Resolved value of the spellcast trait stat */
  spellcastTraitValue: number;
}

function DamageCalculatorSidebar({
  open,
  onClose,
  major,
  severe,
  armorMarked,
  armorMax,
  characterId,
  activeAuraCardId,
  spellcastTrait,
  spellcastTraitValue,
}: DamageCalculatorSidebarProps) {
  const [damage, setDamage] = React.useState<string>("");
  const [useArmor, setUseArmor] = React.useState(false);
  const [actionError, setActionError] = React.useState<string | null>(null);
  const [isPending, setIsPending] = React.useState(false);

  // ── Aura maintenance roll ──────────────────────────────────────────────────
  // Parse the domain and card id from the composite cardId string.
  const auraRef = React.useMemo(() => {
    if (!activeAuraCardId) return { domain: undefined, id: undefined };
    const parts = activeAuraCardId.includes("/")
      ? activeAuraCardId.split("/")
      : null;
    return { domain: parts?.[0], id: parts?.[1] ?? activeAuraCardId };
  }, [activeAuraCardId]);

  const { data: auraCard } = useDomainCard(auraRef.domain, auraRef.id);

  // Parse "Maintenance Difficulty (N)" from card description
  const maintenanceDifficulty = React.useMemo(() => {
    if (!auraCard) return null;
    const m = auraCard.description.match(
      /Maintenance\s+Difficulty\s*\((\d+)\)/i,
    );
    return m ? parseInt(m[1], 10) : null;
  }, [auraCard]);

  const maintenanceRollRequest: RollRequest | null =
    maintenanceDifficulty !== null && spellcastTrait !== null
      ? {
          label: `${auraCard?.name ?? "Aura"} Maintenance`,
          type: "action",
          dice: [
            { size: "d12" as const, role: "hope" as const, label: "Hope" },
            { size: "d12" as const, role: "fear" as const, label: "Fear" },
          ],
          modifier: spellcastTraitValue,
          difficulty: maintenanceDifficulty,
        }
      : null;
  const headingId = React.useId();
  const panelRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const { fire } = useActionButton(characterId);

  // Reset state whenever sidebar opens
  React.useEffect(() => {
    if (!open) return;
    setDamage("");
    setUseArmor(false);
    setActionError(null);
    const t = setTimeout(() => inputRef.current?.focus(), 50);
    return () => clearTimeout(t);
  }, [open]);

  // Escape to close
  React.useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };
    document.addEventListener("keydown", handler, true);
    return () => document.removeEventListener("keydown", handler, true);
  }, [open, onClose]);

  // Tab-trap
  React.useEffect(() => {
    if (!open || !panelRef.current) return;
    const panel = panelRef.current;
    const selector =
      'button, input, select, textarea, [tabindex]:not([tabindex="-1"])';
    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const focusable = Array.from(
        panel.querySelectorAll<HTMLElement>(selector),
      ).filter((el) => !el.hasAttribute("disabled"));
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    panel.addEventListener("keydown", handleTab);
    return () => panel.removeEventListener("keydown", handleTab);
  }, [open]);

  const rawDamage = parseInt(damage, 10);
  const validDamage = !isNaN(rawDamage) && rawDamage > 0;
  const baseTier = validDamage ? calcTier(rawDamage, major, severe) : null;
  const finalTier =
    baseTier === null ? null : useArmor ? tierDown(baseTier) : baseTier;
  const hpToMark = finalTier === null ? null : TIER_HP[finalTier];

  // Armor availability
  const armorAvailable = armorMax - armorMarked;
  const canUseArmor =
    armorAvailable > 0 && baseTier !== null && baseTier !== "none";

  const handleAccept = async () => {
    if (hpToMark === null) return;
    setActionError(null);
    setIsPending(true);
    try {
      // Mark armor first if used
      if (useArmor) {
        await fire("mark-armor", { n: 1 });
      }
      // Mark HP (0 HP = no action needed)
      if (hpToMark > 0) {
        await fire("mark-hp", { n: hpToMark });
      }
      onClose();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "An error occurred.");
    } finally {
      setIsPending(false);
    }
  };

  const inputClass = `
    w-full rounded-lg border border-steel-400/35 bg-[#f7f7ff]
    px-4 py-2.5 text-sm text-[#0a100d] placeholder:text-slate-400
    focus:outline-none focus:ring-2 focus:ring-steel-400
    [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none
  `;

  return (
    <>
      {open && (
        <div
          aria-hidden="true"
          onClick={onClose}
          className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-sm lg:hidden"
        />
      )}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={headingId}
        aria-hidden={!open}
        inert={!open ? ("" as unknown as boolean) : undefined}
        className={[
          "fixed inset-y-0 right-0 z-50 flex h-full w-full max-w-[28rem] flex-col",
          "border-l border-steel-400/35 bg-[#0f1713] shadow-2xl",
          "transition-transform duration-300 ease-in-out",
          open ? "translate-x-0" : "translate-x-full",
        ].join(" ")}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-steel-400/25 px-5 py-4">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] sidebar-text">
              Damage
            </p>
            <h2
              id={headingId}
              className="font-serif text-lg font-semibold text-[#f7f7ff]"
            >
              Damage Calculator
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close damage calculator"
            className="flex h-11 w-11 items-center justify-center rounded-lg border border-steel-400/30 text-[#b9baa3] hover:bg-steel-400/12 hover:text-[#f7f7ff] focus:outline-none focus:ring-2 focus:ring-steel-400"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
          {/* Current thresholds reference */}
          <div className="rounded-xl border border-steel-400/20 bg-[#b9baa3]/[0.06] px-4 py-3 space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] sidebar-text">
              Your thresholds
            </p>
            <div className="flex items-center gap-3 text-sm">
              <span className="text-parchment-500">Minor</span>
              <span className="sidebar-text-secondary">·</span>
              <span className="font-bold text-[#b9cfe8] tabular-nums">
                {major}
              </span>
              <span className="text-parchment-500">Major</span>
              <span className="sidebar-text-secondary">·</span>
              <span className="font-bold text-[#f7f7ff] tabular-nums">
                {severe}
              </span>
              <span className="text-parchment-500">Severe</span>
            </div>
            <p className="text-sm sidebar-text-secondary italic">
              Damage ≥ {severe} = Severe · ≥ {major} = Major · &lt; {major} =
              Minor (SRD p. 20)
            </p>
          </div>

          {/* Damage input */}
          <div className="space-y-1.5">
            <label
              htmlFor="damage-calc-input"
              className="text-xs font-semibold uppercase tracking-[0.18em] sidebar-text"
            >
              Damage received
            </label>
            <input
              id="damage-calc-input"
              ref={inputRef}
              type="number"
              min={0}
              value={damage}
              onChange={(e) => setDamage(e.target.value)}
              placeholder="Enter damage amount…"
              className={inputClass}
            />
          </div>

          {/* Armor slot control */}
          <div className="rounded-xl border border-steel-400/20 bg-[#b9baa3]/[0.04] px-4 py-3 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] sidebar-text">
                  Mark armor slot
                </p>
                <p className="text-sm sidebar-text-secondary mt-0.5">
                  {armorAvailable} of {armorMax} available · drops severity 1
                  tier (SRD p. 29)
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={useArmor}
                disabled={!canUseArmor}
                onClick={() => canUseArmor && setUseArmor((v) => !v)}
                aria-label={
                  useArmor
                    ? "Armor slot will be marked"
                    : "Mark an armor slot to reduce damage"
                }
                className={[
                  "relative h-7 w-12 rounded-full border-2 transition-all duration-200",
                  "focus:outline-none focus:ring-2 focus:ring-steel-400 focus:ring-offset-2 focus:ring-offset-[#0f1713]",
                  "disabled:opacity-30 disabled:cursor-not-allowed",
                  useArmor
                    ? "border-parchment-400 bg-parchment-500/30"
                    : "border-steel-400/40 bg-transparent",
                ].join(" ")}
              >
                <span
                  aria-hidden="true"
                  className={[
                    "absolute top-0.5 h-5 w-5 rounded-full transition-all duration-200",
                    useArmor
                      ? "left-[calc(100%-1.375rem)] bg-parchment-400"
                      : "left-0.5 bg-steel-400/50",
                  ].join(" ")}
                />
              </button>
            </div>

            {/* Visual armor slot row */}
            <div
              className="flex flex-wrap gap-1.5"
              role="group"
              aria-label="Armor slots"
            >
              {Array.from({ length: armorMax }, (_, i) => {
                const alreadyMarked = i < armorMarked;
                const willMark =
                  !alreadyMarked && useArmor && i === armorMarked;
                return (
                  <span
                    key={i}
                    aria-hidden="true"
                    className={[
                      "h-5 w-5 rounded-full border-2 transition-all duration-150",
                      alreadyMarked
                        ? "bg-parchment-500 border-transparent"
                        : willMark
                          ? "bg-parchment-500/40 border-parchment-400 animate-pulse"
                          : "border-burgundy-700 bg-transparent",
                    ].join(" ")}
                  />
                );
              })}
            </div>
          </div>

          {/* Result */}
          {finalTier !== null && (
            <div
              className={[
                "rounded-xl border px-4 py-4 space-y-1 text-center",
                finalTier === "none"
                  ? "border-steel-400/20 bg-steel-400/5"
                  : "",
                finalTier === "minor"
                  ? "border-steel-400/30 bg-steel-400/8"
                  : "",
                finalTier === "major"
                  ? "border-steel-400/40 bg-steel-400/10"
                  : "",
                finalTier === "severe"
                  ? "border-[#fe5f55]/40 bg-[#fe5f55]/10"
                  : "",
              ].join(" ")}
            >
              {useArmor && baseTier !== finalTier && (
                <p className="text-sm sidebar-text-secondary line-through">
                  {TIER_LABEL[baseTier!]} → {TIER_HP[baseTier!]} HP (before
                  armor)
                </p>
              )}
              <p
                className={`text-2xl font-bold font-serif ${TIER_COLOR[finalTier]}`}
              >
                {TIER_LABEL[finalTier]}
              </p>
              <p className="text-sm text-[#b9baa3]">
                Mark{" "}
                <span className="font-bold text-[#f7f7ff]">{hpToMark} HP</span>
                {useArmor && " + 1 armor slot"}
              </p>
            </div>
          )}

          {!validDamage && !damage && (
            <p className="text-center text-sm sidebar-text-secondary italic">
              Enter a damage amount above to see the result.
            </p>
          )}

          {/* Maintenance Roll — shown when an aura is active */}
          {maintenanceRollRequest && (
            <div className="rounded-xl border border-steel-400/20 bg-[#b9baa3]/[0.04] px-4 py-3 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] sidebar-text">
                Active Aura — {auraCard?.name}
              </p>
              <p className="text-sm sidebar-text-secondary">
                Difficulty {maintenanceDifficulty} ·{" "}
                {spellcastTrait
                  ? `${spellcastTrait.charAt(0).toUpperCase() + spellcastTrait.slice(1)} +${spellcastTraitValue}`
                  : "Spellcast"}
              </p>
              <DiceRollButton
                rollRequest={maintenanceRollRequest}
                variant="badge"
                label="Maintenance Roll"
              />
            </div>
          )}

          {actionError && (
            <p
              role="alert"
              className="rounded-lg border border-[#fe5f55]/40 bg-[#fe5f55]/10 px-3 py-2 text-sm text-[#fe5f55]"
            >
              {actionError}
            </p>
          )}
        </div>

        {/* Footer — Accept / Cancel */}
        <div className="border-t border-steel-400/25 px-5 py-4 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border border-steel-400/30 bg-transparent px-4 py-3 text-sm font-semibold text-[#b9baa3] hover:bg-steel-400/10 focus:outline-none focus:ring-2 focus:ring-steel-400"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleAccept}
            disabled={hpToMark === null || isPending}
            aria-busy={isPending}
            className="
              flex-1 rounded-xl border border-steel-400/40 bg-steel-400/15 px-4 py-3
              text-sm font-semibold text-[#f7f7ff]
              hover:bg-steel-400/25 hover:border-steel-400
              disabled:opacity-40 disabled:cursor-not-allowed
              focus:outline-none focus:ring-2 focus:ring-steel-400
              transition-colors
            "
          >
            {isPending ? (
              <span
                aria-hidden="true"
                className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
              />
            ) : hpToMark === 0 ? (
              "Accept (no HP)"
            ) : (
              `Accept — mark ${hpToMark} HP${useArmor ? " + armor" : ""}`
            )}
          </button>
        </div>
      </div>
    </>
  );
}

// ─── DamageThresholdBar (read-only) ───────────────────────────────────────────
// SRD p.3/22: Damage thresholds are derived (armor base + level), not editable.
// Format: Minor Damage | <value> | Major Damage | <value> | Severe Damage
// A calculator button opens DamageCalculatorSidebar.

interface DamageThresholdBarProps {
  major: number;
  severe: number;
  armorMarked: number;
  armorMax: number;
  characterId: string;
  activeAuraCardId: string | null;
  spellcastTrait: CoreStatName | null;
  spellcastTraitValue: number;
}

function DamageThresholdBar({
  major,
  severe,
  armorMarked,
  armorMax,
  characterId,
  activeAuraCardId,
  spellcastTrait,
  spellcastTraitValue,
  majorTooltip,
  severeTooltip,
}: DamageThresholdBarProps & {
  majorTooltip?: React.ReactNode;
  severeTooltip?: React.ReactNode;
}) {
  const [calcOpen, setCalcOpen] = React.useState(false);

  return (
    <>
      <div className="flex items-center gap-3 flex-wrap">
        <dl
          className="flex flex-wrap items-center gap-x-0 gap-y-1 flex-1"
          aria-label="Damage thresholds"
        >
          {/* Minor — no threshold number, just the label */}
          <div className="flex items-center">
            <dt className="text-xs text-parchment-500 whitespace-nowrap">
              <abbr title="Minor Damage" className="no-underline">
                <span className="hidden sm:inline">Minor Damage</span>
                <span className="sm:hidden">Minor</span>
              </abbr>
            </dt>
          </div>

          <span
            aria-hidden="true"
            className="mx-2 text-steel-400/40 select-none font-light"
          >
            |
          </span>

          {/* Major threshold value */}
          <div className="flex items-center gap-1.5">
            <dt className="text-xs text-parchment-500 whitespace-nowrap">
              <abbr title="Major Damage" className="no-underline">
                <span className="hidden sm:inline">Major Damage</span>
                <span className="sm:hidden">Major</span>
              </abbr>
            </dt>
            {majorTooltip ? (
              // majorTooltip is a StatTooltip wrapping the <dd> value
              majorTooltip
            ) : (
              <dd className="rounded bg-steel-400/20 border border-steel-400/40 px-2 py-0.5 text-base font-bold text-[#b9cfe8] tabular-nums leading-none">
                {major}
              </dd>
            )}
          </div>

          <span
            aria-hidden="true"
            className="mx-2 text-steel-400/40 select-none font-light"
          >
            |
          </span>

          {/* Severe threshold value */}
          <div className="flex items-center gap-1.5">
            <dt className="text-xs text-parchment-500 whitespace-nowrap">
              <abbr title="Severe Damage" className="no-underline">
                <span className="hidden sm:inline">Severe Damage</span>
                <span className="sm:hidden">Severe</span>
              </abbr>
            </dt>
            {severeTooltip ? (
              // severeTooltip is a StatTooltip wrapping the <dd> value
              severeTooltip
            ) : (
              <dd className="rounded bg-steel-400/15 border border-steel-400/50 px-2 py-0.5 text-base font-bold text-[#f7f7ff] tabular-nums leading-none">
                {severe}
              </dd>
            )}
          </div>
        </dl>

        {/* Calculator button */}
        <button
          type="button"
          onClick={() => setCalcOpen(true)}
          aria-label="Open damage calculator"
          aria-haspopup="dialog"
          className="
            flex items-center gap-1.5 rounded-lg border border-steel-400/30 bg-slate-900
            px-2.5 py-1.5 text-xs font-semibold text-[#b9baa3]
            hover:border-steel-400 hover:text-[#f7f7ff] hover:bg-slate-800
            focus:outline-none focus:ring-2 focus:ring-steel-400 focus:ring-offset-1 focus:ring-offset-slate-900
            transition-colors flex-shrink-0
          "
        >
          <svg
            aria-hidden="true"
            className="h-3.5 w-3.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 11h.01M12 11h.01M15 11h.01M4 5h16a1 1 0 011 1v12a1 1 0 01-1 1H4a1 1 0 01-1-1V6a1 1 0 011-1z"
            />
          </svg>
          Calculate Damage
        </button>
      </div>

      <DamageCalculatorSidebar
        open={calcOpen}
        onClose={() => setCalcOpen(false)}
        major={major}
        severe={severe}
        armorMarked={armorMarked}
        armorMax={armorMax}
        characterId={characterId}
        activeAuraCardId={activeAuraCardId}
        spellcastTrait={spellcastTrait}
        spellcastTraitValue={spellcastTraitValue}
      />
    </>
  );
}

// ─── WeaponSidebar ────────────────────────────────────────────────────────────
// Inventory-only weapon selector. Derives all stats from the SRD record.
// Custom/homebrew weapon creation is a future CMS feature (TODO).

interface WeaponSidebarProps {
  open: boolean;
  onClose: () => void;
  slot: "primary" | "secondary";
}

function WeaponSidebar({ open, onClose, slot }: WeaponSidebarProps) {
  const { activeCharacter, updateField } = useCharacterStore();
  const headingId = React.useId();
  const panelRef = React.useRef<HTMLDivElement>(null);

  // Focus first focusable element when opened
  React.useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => {
      const first = panelRef.current?.querySelector<HTMLElement>(
        'button, input, [tabindex]:not([tabindex="-1"])',
      );
      first?.focus();
    }, 50);
    return () => clearTimeout(t);
  }, [open]);

  // Escape to close
  React.useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };
    document.addEventListener("keydown", handler, true);
    return () => document.removeEventListener("keydown", handler, true);
  }, [open, onClose]);

  // Tab-trap
  React.useEffect(() => {
    if (!open || !panelRef.current) return;
    const panel = panelRef.current;
    const selector = 'button, input, [tabindex]:not([tabindex="-1"])';
    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const focusable = Array.from(
        panel.querySelectorAll<HTMLElement>(selector),
      ).filter((el) => !el.hasAttribute("disabled"));
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    panel.addEventListener("keydown", handleTab);
    return () => panel.removeEventListener("keydown", handleTab);
  }, [open]);

  if (!activeCharacter) return null;

  const title = slot === "primary" ? "Primary Weapon" : "Secondary Weapon";
  const otherSlot = slot === "primary" ? "secondary" : "primary";
  const otherWeaponId = activeCharacter.weapons[otherSlot].weaponId;
  const currentWeaponId = activeCharacter.weapons[slot].weaponId;

  // Build inventory weapon list: SRD weapons whose names match something in inventory
  const inventory = activeCharacter.inventory ?? [];
  const inventoryWeaponOptions: SRDWeapon[] = ALL_TIER1_WEAPONS.filter((w) =>
    inventory.some((item) => item.toLowerCase() === w.name.toLowerCase()),
  );

  const handleSelect = (w: SRDWeapon) => {
    updateField(`weapons.${slot}.weaponId`, w.id);
    onClose();
  };

  const handleClear = () => {
    updateField(`weapons.${slot}.weaponId`, null);
    onClose();
  };

  return (
    <>
      {open && (
        <div
          aria-hidden="true"
          onClick={onClose}
          className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-sm lg:hidden"
        />
      )}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={headingId}
        aria-hidden={!open}
        inert={!open ? ("" as unknown as boolean) : undefined}
        className={[
          "fixed inset-y-0 right-0 z-50 flex h-full w-full max-w-[28rem] flex-col",
          "border-l border-steel-400/35 bg-[#0f1713] shadow-2xl",
          "transition-transform duration-300 ease-in-out",
          open ? "translate-x-0" : "translate-x-full",
        ].join(" ")}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-steel-400/25 px-5 py-4">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] sidebar-text">
              Weapon
            </p>
            <h2
              id={headingId}
              className="font-serif text-lg font-semibold text-[#f7f7ff]"
            >
              {title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={`Close ${title} editor`}
            className="flex h-11 w-11 items-center justify-center rounded-lg border border-steel-400/30 text-[#b9baa3] hover:bg-steel-400/12 hover:text-[#f7f7ff] focus:outline-none focus:ring-2 focus:ring-steel-400"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
          {/* SRD guidance */}
          <div className="rounded-xl border border-steel-400/20 bg-[#b9baa3]/[0.06] px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] sidebar-text mb-1">
              SRD guidance
            </p>
            <p className="text-sm leading-relaxed text-[#f7f7ff]">
              Select a weapon from your inventory. Add weapons via the Equipment
              panel to make them available here. (SRD p. 23)
            </p>
          </div>

          {inventoryWeaponOptions.length === 0 ? (
            <p className="text-sm text-[#b9baa3]/60 italic text-center pt-4">
              No weapons found in inventory. Add weapons via the Equipment panel
              first.
            </p>
          ) : (
            <ul
              className="space-y-2"
              role="listbox"
              aria-label="Inventory weapon options"
            >
              {inventoryWeaponOptions.map((w) => {
                const isSelected = w.id === currentWeaponId;
                const isOtherSlot = w.id === otherWeaponId;
                return (
                  <li key={w.id}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      disabled={isOtherSlot}
                      onClick={() => handleSelect(w)}
                      title={
                        isOtherSlot
                          ? `Already equipped as ${otherSlot} weapon`
                          : undefined
                      }
                      className={[
                        "w-full text-left rounded-xl border px-4 py-3 transition-all",
                        "focus:outline-none focus:ring-2 focus:ring-steel-400",
                        "disabled:opacity-40 disabled:cursor-not-allowed",
                        isSelected
                          ? "border-steel-400 bg-steel-400/20 shadow-md"
                          : "border-steel-400/25 bg-slate-900/60 hover:border-steel-400/60 hover:bg-steel-400/10",
                      ].join(" ")}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-[#f7f7ff]">
                            {w.name}
                          </p>
                          <p className="text-sm text-[#b9baa3] mt-0.5">
                            {w.damageDie} · {w.range} · {w.trait} ·{" "}
                            {w.burden === "Two-Handed"
                              ? "Two-handed"
                              : "One-handed"}
                          </p>
                          {w.feature && (
                            <p className="text-sm text-gold-500 mt-0.5">
                              <span className="mr-1" aria-hidden="true">
                                ✦
                              </span>
                              {w.feature}
                            </p>
                          )}
                        </div>
                        {isSelected && (
                          <span className="text-xs font-bold text-steel-400 uppercase tracking-wider mt-0.5 shrink-0">
                            Equipped
                          </span>
                        )}
                        {isOtherSlot && (
                          <span className="text-xs font-bold text-[#b9baa3] uppercase tracking-wider mt-0.5 shrink-0">
                            {otherSlot}
                          </span>
                        )}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          {currentWeaponId && (
            <button
              type="button"
              onClick={handleClear}
              className="w-full rounded-xl border border-[#fe5f55]/30 bg-[#fe5f55]/10 px-4 py-2.5 text-sm font-semibold text-[#fe5f55] hover:bg-[#fe5f55]/20 focus:outline-none focus:ring-2 focus:ring-[#fe5f55]/40"
            >
              Unequip weapon
            </button>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-steel-400/25 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-xl border border-steel-400/40 bg-steel-400/15 px-4 py-3 text-sm font-semibold text-[#f7f7ff] hover:bg-steel-400/25 focus:outline-none focus:ring-2 focus:ring-steel-400"
          >
            Done
          </button>
        </div>
      </div>
    </>
  );
}

// ─── parseDamageDie ──────────────────────────────────────────────────────────
// Splits a damageDie string like "d8", "d10+3", "2d6" into a valid DieSize and
// an optional flat bonus.  Returns null if the string is unrecognisable.
function parseDamageDie(raw: string): { size: DieSize; flat: number } | null {
  const m = raw.match(/^(?:\d+)?(d(?:4|6|8|10|12|20))(([+-]\d+))?$/i);
  if (!m) return null;
  return {
    size: m[1].toLowerCase() as DieSize,
    flat: m[3] ? parseInt(m[3], 10) : 0,
  };
}

// ─── parseWeaponAttackBonuses ────────────────────────────────────────────────
// Parses known weapon feature strings for attack roll bonuses.
// Returns an array of RollBonus objects (may be empty).
//
// Recognised patterns (SRD):
//   "Reliable: +1 to attack rolls"  → { label: "Reliable", value: 1 }
//   Any "FeatureName: [+/-]N to attack rolls" pattern
function parseWeaponAttackBonuses(feature: string | null): RollBonus[] {
  if (!feature) return [];
  const bonuses: RollBonus[] = [];
  // Match patterns like "Label: +N to attack rolls" or "Label: -N to attack rolls"
  const attackBonusPattern =
    /([A-Za-z][A-Za-z\s]*):\s*([+-]?\d+)\s+to\s+attack\s+rolls?/gi;
  let match: RegExpExecArray | null;
  while ((match = attackBonusPattern.exec(feature)) !== null) {
    const label = match[1].trim();
    const value = parseInt(match[2], 10);
    if (!isNaN(value)) {
      bonuses.push({ label, value });
    }
  }
  return bonuses;
}

// ─── WeaponCard ───────────────────────────────────────────────────────────────
// Looks up the SRD record by weaponId and renders it. Opens WeaponSidebar.

interface WeaponCardProps {
  slot: "primary" | "secondary";
  onRollQueued?: () => void;
}

function WeaponCard({ slot, onRollQueued }: WeaponCardProps) {
  const { activeCharacter } = useCharacterStore();
  const { effective } = useTraitModifiers();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (!activeCharacter) return null;

  const weaponId = activeCharacter.weapons[slot].weaponId;
  const srdWeapon = weaponId
    ? (ALL_TIER1_WEAPONS.find((w) => w.id === weaponId) ?? null)
    : null;

  const kickerParts = srdWeapon
    ? [
        srdWeapon.damageDie,
        srdWeapon.range,
        srdWeapon.trait,
        srdWeapon.burden === "Two-Handed" ? "Two-handed" : "One-handed",
      ]
        .filter(Boolean)
        .join(" · ")
    : null;

  const ariaLabel = srdWeapon
    ? `Edit ${slot} weapon: ${srdWeapon.name}${kickerParts ? `. ${kickerParts}` : ""}`
    : `Add ${slot} weapon — tap to select from inventory`;

  // Build roll requests if a weapon is equipped
  const proficiency = activeCharacter.proficiency ?? 1;

  // Loadout-derived damage bonuses (from domain cards with resource costs)
  const loadoutBonuses = useLoadoutDamageBonuses(
    activeCharacter.domainLoadout,
    proficiency,
  );

  // Parse the damage die safely (e.g. "d10+3" → size:"d10", flat:3)
  const parsedDie = srdWeapon ? parseDamageDie(srdWeapon.damageDie) : null;

  const damageRollRequest: RollRequest | null =
    srdWeapon && parsedDie
      ? {
          label: `${srdWeapon.name} Damage`,
          type: "damage",
          dice: Array.from({ length: proficiency }, () => ({
            size: parsedDie.size,
            role: "damage" as const,
            label: srdWeapon.name,
          })),
          modifier: parsedDie.flat,
          ...(loadoutBonuses.length > 0 ? { bonuses: loadoutBonuses } : {}),
          characterName: activeCharacter.name,
        }
      : null;

  // Attack roll: 2×d12 (hope + fear) with the weapon's trait stat as modifier
  const traitKey = srdWeapon
    ? (srdWeapon.trait.toLowerCase() as CoreStatName)
    : null;
  const traitValue = traitKey ? (effective[traitKey] ?? 0) : 0;
  const attackBonuses = srdWeapon
    ? parseWeaponAttackBonuses(srdWeapon.feature)
    : [];
  const attackRollRequest: RollRequest | null = srdWeapon
    ? {
        label: `${srdWeapon.name} Attack`,
        type: "action",
        dice: [
          { size: "d12" as const, role: "hope" as const, label: "Hope" },
          { size: "d12" as const, role: "fear" as const, label: "Fear" },
        ],
        modifier: traitValue,
        ...(attackBonuses.length > 0 ? { bonuses: attackBonuses } : {}),
        characterName: activeCharacter.name,
      }
    : null;

  return (
    <>
      <div className="rounded-lg border border-steel-400/20 bg-slate-850 shadow-card overflow-hidden">
        {/* Slot label + roll buttons */}
        <div className="px-3 pt-2 pb-1 border-b border-steel-400/20 flex items-center justify-between gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-steel-400">
            {slot === "primary" ? "Primary Weapon" : "Secondary Weapon"}
          </span>
          <div className="flex items-center gap-1">
            {attackRollRequest && (
              <DiceRollButton
                rollRequest={attackRollRequest}
                onRollQueued={onRollQueued}
                variant="badge"
                label="Attack"
              />
            )}
            {damageRollRequest && (
              <DiceRollButton
                rollRequest={damageRollRequest}
                onRollQueued={onRollQueued}
                variant="badge"
                label="Damage"
              />
            )}
          </div>
        </div>

        {/* Single clickable body */}
        <button
          type="button"
          onClick={() => setSidebarOpen(true)}
          aria-label={ariaLabel}
          aria-haspopup="dialog"
          aria-expanded={sidebarOpen}
          className="
            w-full text-left px-3 py-3
            hover:bg-slate-800/60 focus:outline-none focus-visible:ring-2
            focus-visible:ring-steel-400 focus-visible:ring-inset
            transition-colors cursor-pointer group
          "
        >
          {srdWeapon ? (
            <>
              <p className="text-sm font-semibold text-parchment-100 group-hover:text-parchment-50 leading-snug">
                {srdWeapon.name}
              </p>
              {kickerParts && (
                <p className="mt-0.5 text-xs text-parchment-500 truncate leading-snug">
                  {kickerParts}
                </p>
              )}
              {srdWeapon.feature && (
                <p className="mt-0.5 text-xs text-gold-600 truncate">
                  <span aria-label="Has feature" className="mr-1">
                    ✦
                  </span>
                  {srdWeapon.feature}
                </p>
              )}
              <p className="mt-1 text-xs text-parchment-500 opacity-0 group-hover:opacity-100 transition-opacity">
                Tap to change
              </p>
            </>
          ) : (
            <>
              <p className="text-sm text-parchment-500 italic font-normal">
                No weapon selected…
              </p>
              <p className="mt-1 text-xs text-parchment-500 opacity-0 group-hover:opacity-100 transition-opacity">
                Tap to select from inventory
              </p>
            </>
          )}
        </button>
      </div>

      <WeaponSidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        slot={slot}
      />
    </>
  );
}

// ─── ArmorSidebar ─────────────────────────────────────────────────────────────
// Slide-in panel for selecting active armor from inventory.
// Only armor items present in character.inventory are shown.

function ArmorSidebar({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { activeCharacter, updateField } = useCharacterStore();
  const headingId = React.useId();
  const panelRef = React.useRef<HTMLDivElement>(null);

  // Focus first focusable element when opened
  React.useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => {
      const first = panelRef.current?.querySelector<HTMLElement>(
        'button, input, [tabindex]:not([tabindex="-1"])',
      );
      first?.focus();
    }, 50);
    return () => clearTimeout(t);
  }, [open]);

  // Escape to close
  React.useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };
    document.addEventListener("keydown", handler, true);
    return () => document.removeEventListener("keydown", handler, true);
  }, [open, onClose]);

  // Tab trap
  React.useEffect(() => {
    if (!open || !panelRef.current) return;
    const panel = panelRef.current;
    const selector = 'button, input, [tabindex]:not([tabindex="-1"])';
    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const focusable = Array.from(
        panel.querySelectorAll<HTMLElement>(selector),
      ).filter((el) => !el.hasAttribute("disabled"));
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    panel.addEventListener("keydown", handleTab);
    return () => panel.removeEventListener("keydown", handleTab);
  }, [open]);

  if (!activeCharacter) return null;

  const inventory = activeCharacter.inventory ?? [];
  const activeArmorId = activeCharacter.activeArmorId ?? null;

  // Find SRD armor entries whose names appear in inventory
  const inventoryArmorOptions: SRDArmor[] = ALL_ARMOR.filter((a) =>
    inventory.some((item) => item.toLowerCase() === a.name.toLowerCase()),
  );

  const handleSelect = (armorId: string) => {
    updateField("activeArmorId", armorId);
    onClose();
  };

  const handleClear = () => {
    updateField("activeArmorId", null);
    onClose();
  };

  return (
    <>
      {open && (
        <div
          aria-hidden="true"
          onClick={onClose}
          className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-sm lg:hidden"
        />
      )}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={headingId}
        aria-hidden={!open}
        inert={!open ? ("" as unknown as boolean) : undefined}
        className={[
          "fixed inset-y-0 right-0 z-50 flex h-full w-full max-w-[28rem] flex-col",
          "border-l border-steel-400/35 bg-[#0f1713] shadow-2xl",
          "transition-transform duration-300 ease-in-out",
          open ? "translate-x-0" : "translate-x-full",
        ].join(" ")}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-steel-400/25 px-5 py-4">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] sidebar-text">
              Armor
            </p>
            <h2
              id={headingId}
              className="font-serif text-lg font-semibold text-[#f7f7ff]"
            >
              Active Armor
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close armor selector"
            className="flex h-11 w-11 items-center justify-center rounded-lg border border-steel-400/30 text-[#b9baa3] hover:bg-steel-400/12 hover:text-[#f7f7ff] focus:outline-none focus:ring-2 focus:ring-steel-400"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
          {/* SRD guidance */}
          <div className="rounded-xl border border-steel-400/20 bg-[#b9baa3]/[0.06] px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] sidebar-text mb-1">
              SRD guidance
            </p>
            <p className="text-sm leading-relaxed text-[#f7f7ff]">
              Your active armor determines your Armor Score (slots), Evasion
              modifier, and Damage Thresholds. Only armor items currently in
              your inventory can be selected. (SRD p. 29)
            </p>
          </div>

          {inventoryArmorOptions.length === 0 ? (
            <p className="text-sm text-[#b9baa3]/60 italic text-center pt-4">
              No armor found in your inventory. Add armor via the Equipment
              panel first.
            </p>
          ) : (
            <ul
              className="space-y-2"
              role="listbox"
              aria-label="Inventory armor options"
            >
              {inventoryArmorOptions.map((armor) => {
                const isActive = armor.id === activeArmorId;
                return (
                  <li key={armor.id}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={isActive}
                      onClick={() => handleSelect(armor.id)}
                      className={[
                        "w-full text-left rounded-xl border px-4 py-3 transition-all",
                        "focus:outline-none focus:ring-2 focus:ring-steel-400",
                        isActive
                          ? "border-steel-400 bg-steel-400/20 shadow-md"
                          : "border-steel-400/25 bg-slate-900/60 hover:border-steel-400/60 hover:bg-steel-400/10",
                      ].join(" ")}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-[#f7f7ff]">
                            {armor.name}
                          </p>
                          <p className="text-sm text-[#b9baa3] mt-0.5">
                            Tier {armor.tier} · Score {armor.baseArmorScore} ·
                            Major {armor.baseMajorThreshold}+ · Severe{" "}
                            {armor.baseSevereThreshold}+
                          </p>
                          {armor.feature && (
                            <p className="text-sm text-gold-500 mt-0.5">
                              <span className="mr-1" aria-hidden="true">
                                ✦
                              </span>
                              {armor.feature}
                            </p>
                          )}
                        </div>
                        {isActive && (
                          <span className="text-xs font-bold text-steel-400 uppercase tracking-wider mt-0.5 shrink-0">
                            Active
                          </span>
                        )}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          {activeArmorId && (
            <button
              type="button"
              onClick={handleClear}
              className="w-full rounded-xl border border-[#fe5f55]/30 bg-[#fe5f55]/10 px-4 py-2.5 text-sm font-semibold text-[#fe5f55] hover:bg-[#fe5f55]/20 focus:outline-none focus:ring-2 focus:ring-[#fe5f55]/40"
            >
              Clear active armor
            </button>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-steel-400/25 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-xl border border-steel-400/40 bg-steel-400/15 px-4 py-3 text-sm font-semibold text-[#f7f7ff] hover:bg-steel-400/25 focus:outline-none focus:ring-2 focus:ring-steel-400"
          >
            Done
          </button>
        </div>
      </div>
    </>
  );
}

// ─── ArmorCard ────────────────────────────────────────────────────────────────
// Displays the currently active armor. Clicking opens ArmorSidebar.

function ArmorCard() {
  const { activeCharacter } = useCharacterStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (!activeCharacter) return null;

  const activeArmorId = activeCharacter.activeArmorId ?? null;
  const activeArmor = activeArmorId
    ? (ALL_ARMOR.find((a) => a.id === activeArmorId) ?? null)
    : null;

  const ariaLabel = activeArmor
    ? `Edit active armor: ${activeArmor.name}`
    : "Select active armor — tap to choose from inventory";

  return (
    <>
      <div className="rounded-lg border border-steel-400/20 bg-slate-850 shadow-card overflow-hidden">
        {/* Slot label */}
        <div className="px-3 pt-2 pb-1 border-b border-steel-400/20">
          <span className="text-xs font-semibold uppercase tracking-wider text-steel-400">
            Armor
          </span>
        </div>

        {/* Clickable body */}
        <button
          type="button"
          onClick={() => setSidebarOpen(true)}
          aria-label={ariaLabel}
          aria-haspopup="dialog"
          aria-expanded={sidebarOpen}
          className="
            w-full text-left px-3 py-3
            hover:bg-slate-800/60 focus:outline-none focus-visible:ring-2
            focus-visible:ring-steel-400 focus-visible:ring-inset
            transition-colors cursor-pointer group
          "
        >
          {activeArmor ? (
            <>
              <p className="text-sm font-semibold text-parchment-100 group-hover:text-parchment-50 leading-snug">
                {activeArmor.name}
              </p>
              <p className="mt-0.5 text-xs text-parchment-500 truncate leading-snug">
                Tier {activeArmor.tier} · Score {activeArmor.baseArmorScore} ·
                Major {activeArmor.baseMajorThreshold}+ · Severe{" "}
                {activeArmor.baseSevereThreshold}+
              </p>
              {activeArmor.feature && (
                <p className="mt-0.5 text-xs text-gold-600 truncate">
                  <span aria-label="Has feature" className="mr-1">
                    ✦
                  </span>
                  {activeArmor.feature}
                </p>
              )}
              <p className="mt-1 text-xs text-parchment-500 opacity-0 group-hover:opacity-100 transition-opacity">
                Tap to change
              </p>
            </>
          ) : (
            <>
              <p className="text-sm text-parchment-500 italic font-normal">
                No armor selected…
              </p>
              <p className="mt-1 text-xs text-parchment-500 opacity-0 group-hover:opacity-100 transition-opacity">
                Tap to select from inventory
              </p>
            </>
          )}
        </button>
      </div>

      <ArmorSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
    </>
  );
}

// ─── ActionableHopeTracker ────────────────────────────────────────────────────
// Hope +/- buttons call gain-hope / spend-hope via the actions endpoint.

function ActionableHopeTracker({
  characterId,
  hopeTooltip,
}: {
  characterId: string;
  hopeTooltip?: React.ReactNode;
}) {
  const { activeCharacter } = useCharacterStore();
  if (!activeCharacter) return null;

  const { hope } = activeCharacter;
  // SRD page 20: base max Hope is 6; reduced by scars.
  const hopeMax = activeCharacter.hopeMax ?? 6;

  return (
    <HopeTrackerInner
      hope={hope}
      hopeMax={hopeMax}
      characterId={characterId}
      hopeTooltip={hopeTooltip}
    />
  );
}

function HopeTrackerInner({
  hope,
  hopeMax,
  characterId,
  hopeTooltip,
}: {
  hope: number;
  hopeMax: number;
  characterId: string;
  hopeTooltip?: React.ReactNode;
}) {
  const gainAction = useActionButton(characterId);
  const spendAction = useActionButton(characterId);
  const errorId = React.useId();

  // Merge errors from both actions
  const combinedError = gainAction.inlineError ?? spendAction.inlineError;
  const isPending = gainAction.isPending || spendAction.isPending;

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-semibold uppercase tracking-wider text-parchment-400">
        Hope
      </span>

      {/* +/- controls */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => spendAction.fire("spend-hope", { n: 1 })}
          disabled={isPending}
          aria-label="Spend 1 Hope"
          className="
            h-9 w-9 rounded border border-steel-400/30 bg-slate-900
            text-sm text-[#b9baa3] hover:bg-steel-400/15 hover:text-[#f7f7ff]
            disabled:opacity-50 disabled:cursor-wait
            transition-colors flex items-center justify-center
            focus:outline-none focus:ring-2 focus:ring-steel-400
          "
        >
          −
        </button>

        {/* Hope pips (read-only visual; mutations are handled by +/-) */}
        <div
          className="flex flex-wrap gap-2"
          role="meter"
          aria-valuenow={hope}
          aria-valuemin={0}
          aria-valuemax={hopeMax}
          aria-label={`Hope: ${hope} of ${hopeMax}`}
        >
          {Array.from({ length: hopeMax }, (_, i) => {
            const filled = i < hope;
            return (
              <span
                key={i}
                aria-hidden="true"
                className={`
                  h-8 w-8 rounded-lg border-2 text-xs font-bold
                  flex items-center justify-center select-none
                  transition-all duration-150
                   ${
                     filled
                       ? "bg-[#DAA520] border-[#DAA520] text-[#f7f7ff] shadow-lg"
                       : "border-amber-400/30 bg-transparent text-steel-400/40"
                   }
                `}
              >
                {i + 1}
              </span>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => gainAction.fire("gain-hope", { n: 1 })}
          disabled={isPending}
          aria-label="Gain 1 Hope"
          className="
            h-9 w-9 rounded border border-steel-400/40 bg-slate-900
            text-sm text-steel-400 hover:bg-steel-400/20 hover:text-[#f7f7ff]
            disabled:opacity-50 disabled:cursor-wait
            transition-colors flex items-center justify-center
            focus:outline-none focus:ring-2 focus:ring-steel-400
          "
        >
          +
        </button>

        {/* Hope max — hoverable stat trigger */}
        <span className="ml-auto text-xs text-parchment-600 flex items-center gap-1">
          max
          {hopeTooltip ? (
            hopeTooltip
          ) : (
            <span className="tabular-nums text-[#b9baa3]">{hopeMax}</span>
          )}
        </span>
      </div>

      <InlineActionError message={combinedError} id={errorId} />
    </div>
  );
}

// ─── BonusDisplay ─────────────────────────────────────────────────────────────

function BonusDisplay({ bonus }: { bonus: number }) {
  const label = bonus >= 0 ? `+${bonus}` : `${bonus}`;
  const color =
    bonus > 0
      ? "text-emerald-400"
      : bonus < 0
        ? "text-red-400"
        : "text-parchment-500";
  return (
    <span
      className={`font-bold text-sm tabular-nums min-w-[2.5rem] text-center ${color}`}
    >
      {label}
    </span>
  );
}

// ─── IncrementControls ────────────────────────────────────────────────────────

interface IncrementControlsProps {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  ariaLabel?: string;
}

function IncrementControls({
  value,
  onChange,
  min,
  max,
  ariaLabel,
}: IncrementControlsProps) {
  const canDec = min === undefined || value > min;
  const canInc = max === undefined || value < max;
  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={() => onChange(value - 1)}
        disabled={!canDec}
        aria-label={ariaLabel ? `Decrease ${ariaLabel}` : "Decrease"}
        className="
          h-9 w-9 rounded border border-steel-400/30 bg-slate-900
          text-xs text-[#b9baa3] hover:bg-steel-400/15 hover:text-[#f7f7ff]
          disabled:opacity-25 disabled:cursor-not-allowed
          transition-colors flex items-center justify-center leading-none select-none
          focus:outline-none focus:ring-2 focus:ring-steel-400
        "
      >
        −
      </button>
      <BonusDisplay bonus={value} />
      <button
        type="button"
        onClick={() => onChange(value + 1)}
        disabled={!canInc}
        aria-label={ariaLabel ? `Increase ${ariaLabel}` : "Increase"}
        className="
          h-9 w-9 rounded border border-steel-400/40 bg-slate-900
          text-xs text-steel-400 hover:bg-steel-400/20 hover:text-[#f7f7ff]
          disabled:opacity-25 disabled:cursor-not-allowed
          transition-colors flex items-center justify-center leading-none select-none
          focus:outline-none focus:ring-2 focus:ring-steel-400
        "
      >
        +
      </button>
    </div>
  );
}

// ─── ExperiencesList ──────────────────────────────────────────────────────────

function ExperiencesList() {
  const { activeCharacter, updateField } = useCharacterStore();

  if (!activeCharacter) return null;

  const { experiences } = activeCharacter;

  const removeExperience = (index: number) => {
    updateField(
      "experiences",
      experiences.filter((_, i) => i !== index),
    );
  };

  const updateExpBonus = (index: number, value: number) => {
    updateField(
      "experiences",
      experiences.map((exp, i) =>
        i === index ? { ...exp, bonus: value } : exp,
      ),
    );
  };

  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs font-semibold uppercase tracking-wider text-parchment-400">
        Experiences
      </span>

      {experiences.length === 0 && (
        <p className="text-sm text-parchment-500 italic">No experiences yet.</p>
      )}

      {experiences.map((exp, i) => (
        <div
          key={i}
          className="flex items-center gap-2 rounded-lg border border-steel-400/20 bg-slate-900/50 px-3 py-2"
        >
          {/* Experience name — opens sidebar for editing */}
          <EditableField
            field={experienceNameField(i)}
            className="flex-1 min-w-0 text-left"
            activeClassName="ring-2 ring-gold-500/60 rounded"
          >
            <div className="rounded px-1 py-0.5 text-sm text-parchment-200 min-h-[1.5rem] truncate">
              {exp.name || (
                <span className="text-parchment-500">Experience name…</span>
              )}
            </div>
          </EditableField>
          <IncrementControls
            value={exp.bonus}
            onChange={(v) => updateExpBonus(i, v)}
            ariaLabel={`experience ${exp.name || i + 1} bonus`}
          />
          <span
            className="ml-3 border-l border-steel-400/30 h-6"
            aria-hidden="true"
          />
          <button
            type="button"
            onClick={() => removeExperience(i)}
            aria-label={`Remove experience: ${exp.name || `#${i + 1}`}`}
            className="h-9 w-9 flex items-center justify-center rounded text-steel-400/60 hover:text-[#fe5f55] hover:bg-[#fe5f55]/10 transition-colors text-xs leading-none focus:outline-none focus:ring-2 focus:ring-steel-400"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}

// ─── TraitsSection ────────────────────────────────────────────────────────────
// Displays ancestry and community features as read-only named text.
// Per SRD, these are not "Traits" — Traits are the six core stats.
// Ancestry/Community confer named Features, not numerical Trait bonuses.

interface HeritageFeatureProps {
  featureName: string; // e.g. "Scales", "Thick Skin"
  featureText: string; // rule text describing the feature
  sourceName: string; // e.g. "Drakona", "Seaborne"
  sourceLabel: string; // "Ancestry" or "Community"
}

function HeritageFeature({
  featureName,
  featureText,
  sourceName,
  sourceLabel,
}: HeritageFeatureProps) {
  return (
    <article
      className="
        h-full rounded-xl border border-steel-400/30 bg-slate-900/80
        p-3 space-y-1.5 shadow-card
      "
    >
      {/* Source pill */}
      <p className="text-[12px] uppercase tracking-widest text-[#aa7b1b] font-semibold leading-none">
        {sourceLabel} · {sourceName}
      </p>

      {/* Feature name */}
      <p className="text-sm font-bold text-[#f9ecd8] leading-snug">
        {featureName}
      </p>

      {/* Feature text — the actual rule description */}
      <p className="text-sm text-[#b9baa3] leading-snug">{featureText}</p>
    </article>
  );
}

function HeritageSection() {
  const { activeCharacter } = useCharacterStore();

  if (!activeCharacter) return null;

  const ancestryId = activeCharacter.ancestryId ?? undefined;
  const communityId = activeCharacter.communityId ?? undefined;

  const { data: ancestryData } = useAncestry(ancestryId);
  const { data: communityData } = useCommunity(communityId);

  if (!ancestryId && !communityId) return null;

  const features: {
    key: string;
    featureName: string;
    featureText: string;
    sourceName: string;
    sourceLabel: string;
  }[] = [];

  if (ancestryData) {
    features.push({
      key: "ancestry1",
      featureName: ancestryData.traitName,
      featureText: ancestryData.traitDescription,
      sourceName: ancestryData.name,
      sourceLabel: "Ancestry",
    });
    if (ancestryData.secondTraitName) {
      features.push({
        key: "ancestry2",
        featureName: ancestryData.secondTraitName,
        featureText: ancestryData.secondTraitDescription ?? "",
        sourceName: ancestryData.name,
        sourceLabel: "Ancestry",
      });
    }
  }

  if (communityData) {
    features.push({
      key: "community",
      featureName: communityData.traitName,
      featureText: communityData.traitDescription,
      sourceName: communityData.name,
      sourceLabel: "Community",
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <span className="text-xs font-semibold uppercase tracking-wider text-parchment-400">
        Heritage Features
      </span>
      <div
        className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3"
        role="list"
        aria-label="Ancestry and Community Features"
      >
        {features.map((feature) => (
          <div
            key={feature.key}
            role="listitem"
            className="h-full"
            data-field-key={`trackers.heritage.${feature.key}`}
          >
            <HeritageFeature
              featureName={feature.featureName}
              featureText={feature.featureText}
              sourceName={feature.sourceName}
              sourceLabel={feature.sourceLabel}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── TrackersPanel ────────────────────────────────────────────────────────────

interface TrackersPanelProps {
  onRollQueued?: () => void;
}

export function TrackersPanel({ onRollQueued }: TrackersPanelProps) {
  const { activeCharacter, updateTracker, updateField } = useCharacterStore();
  const characterId = useCharacterId();
  const { effective: effectiveTraits } = useTraitModifiers();

  // Spellcast trait — needed for aura maintenance rolls.
  // useClass must be called unconditionally (Rules of Hooks).
  const { data: classData } = useClass(activeCharacter?.classId ?? undefined);
  const spellcastTrait: CoreStatName | null = React.useMemo(() => {
    if (!activeCharacter || !classData) return null;
    return (
      classData.subclasses.find(
        (s) => s.subclassId === activeCharacter.subclassId,
      )?.spellcastTrait ?? null
    );
  }, [classData, activeCharacter]);
  const spellcastTraitValue =
    spellcastTrait && activeCharacter
      ? (effectiveTraits[spellcastTrait] ?? 0)
      : 0;

  // First active aura card id (composite "Domain/cardId" format)
  const activeAuraCardId = activeCharacter?.activeAuras?.[0] ?? null;

  if (!activeCharacter) return null;

  const { trackers, damageThresholds, derivedStats } = activeCharacter;
  const statBreakdowns = useStatBreakdowns();

  // ── HP danger zone computation (#3.1 / #3.12) ──
  const hpMarked = trackers.hp.marked;
  const hpMax = trackers.hp.max;
  const hpPercent = hpMax > 0 ? (hpMarked / hpMax) * 100 : 0;
  const hpDangerLevel: "normal" | "warning" | "danger" =
    hpPercent >= 75 ? "danger" : hpPercent >= 50 ? "warning" : "normal";

  const hpContainerClass = {
    normal: "",
    warning: "ring-1 ring-amber-500/30",
    danger: "ring-2 ring-[#fe5f55]/50 bg-[#fe5f55]/[0.04]",
  }[hpDangerLevel];

  const hpNumericColor = {
    normal: "text-[#b9baa3]",
    warning: "text-amber-400",
    danger: "text-[#fe5f55]",
  }[hpDangerLevel];

  return (
    <section
      className="space-y-6"
      aria-label="Character Trackers"
      data-field-key="trackers"
    >
      {/* ═══ Combat Status Card ═══ */}
      <div className="rounded-xl border border-steel-400/30 bg-slate-900/80 p-4 shadow-card space-y-5">
        <h3 className="text-[0.887rem] font-semibold uppercase tracking-widest text-[#7a9ab5]/70">
          Combat Status
        </h3>

        {/* ═══ Combat Quick-Scan Strip (#4.1) — moved inside card ═══ */}
        {(() => {
          const stressMarked = trackers.stress.marked;
          const stressMax = trackers.stress.max;
          const stressPercent =
            stressMax > 0 ? (stressMarked / stressMax) * 100 : 0;
          const stressDanger = stressPercent > 50;

          const hopeVal = activeCharacter.hope;
          const hopeMax = activeCharacter.hopeMax ?? 6;
          const armorSlotMarked = trackers.armor.marked;
          const armorSlotMax = derivedStats.armor;

          const hpValueColor = {
            normal: "text-[#f7f7ff]",
            warning: "text-amber-400",
            danger: "text-[#fe5f55]",
          }[hpDangerLevel];

          return (
            <div
              className="grid grid-cols-3 gap-2 sm:grid-cols-6"
              role="status"
              aria-label="Combat quick-scan: key stats at a glance"
            >
              {/* HP */}
              <div className="flex flex-col items-center rounded-lg bg-slate-800/80 border border-steel-400/20 px-3 py-2.5 gap-1">
                <span className="text-[20px] uppercase tracking-wider text-parchment-400 leading-none">
                  HP
                </span>
                <span
                  className={`text-2xl font-bold tabular-nums leading-none ${hpValueColor}`}
                >
                  {hpMarked}/{hpMax}
                </span>
              </div>

              {/* Stress */}
              <div className="flex flex-col items-center rounded-lg bg-slate-800/80 border border-steel-400/20 px-3 py-2.5 gap-1">
                <span className="text-[20px] uppercase tracking-wider text-parchment-400 leading-none">
                  Stress
                </span>
                <span
                  className={`text-2xl font-bold tabular-nums leading-none ${stressDanger ? "text-steel-400" : "text-[#f7f7ff]"}`}
                >
                  {stressMarked}/{stressMax}
                </span>
              </div>

              {/* Armor Slots */}
              <div className="flex flex-col items-center rounded-lg bg-slate-800/80 border border-steel-400/20 px-3 py-2.5 gap-1">
                <span className="text-[20px] uppercase tracking-wider text-parchment-400 leading-none">
                  Armor
                </span>
                <span className="text-2xl font-bold tabular-nums leading-none text-[#f7f7ff]">
                  {armorSlotMarked}/{armorSlotMax}
                </span>
              </div>

              {/* Hope */}
              <div className="flex flex-col items-center rounded-lg bg-slate-800/80 border border-steel-400/20 px-3 py-2.5 gap-1">
                <span className="text-[20px] uppercase tracking-wider text-parchment-400 leading-none">
                  Hope
                </span>
                <span className="text-2xl font-bold tabular-nums leading-none text-[#DAA520]">
                  {hopeVal}/{hopeMax}
                </span>
              </div>

              {/* Evasion */}
              <StatTooltip
                lines={statBreakdowns.evasion}
                srdRef="SRD p. 22"
                ariaLabel="How Evasion is calculated"
              >
                <div className="flex flex-col items-center rounded-lg bg-slate-800/80 border border-steel-400/20 px-3 py-2.5 gap-1 hover:border-steel-400 transition-colors cursor-default">
                  <span className="text-[20px] uppercase tracking-wider text-parchment-400 leading-none">
                    Evasion
                  </span>
                  <span className="text-2xl font-bold tabular-nums leading-none text-[#f7f7ff]">
                    {derivedStats.evasion}
                  </span>
                </div>
              </StatTooltip>

              {/* Armor Score */}
              <StatTooltip
                lines={statBreakdowns.armor}
                srdRef="SRD p. 29"
                ariaLabel="How Armor Score is calculated"
              >
                <div className="flex flex-col items-center rounded-lg bg-slate-800/80 border border-steel-400/20 px-3 py-2.5 gap-1 hover:border-steel-400 transition-colors cursor-default">
                  <span className="text-[20px] uppercase tracking-wider text-parchment-400 leading-none">
                    Score
                  </span>
                  <span className="text-2xl font-bold tabular-nums leading-none text-[#f7f7ff]">
                    {derivedStats.armor}
                  </span>
                </div>
              </StatTooltip>
            </div>
          );
        })()}

        {/* Slot legend */}
        <p className="text-[12px] text-parchment-600 italic">
          Filled circles = damage taken / slots used
        </p>

        {/* Damage Thresholds — inline bar */}
        <div data-field-key="trackers.damage">
          <h4 className="mb-2 text-xs font-medium uppercase tracking-wider text-parchment-500">
            Damage Thresholds
          </h4>
          <DamageThresholdBar
            major={damageThresholds.major}
            severe={damageThresholds.severe}
            armorMarked={trackers.armor.marked}
            armorMax={derivedStats.armor}
            characterId={characterId}
            activeAuraCardId={activeAuraCardId}
            spellcastTrait={spellcastTrait}
            spellcastTraitValue={spellcastTraitValue}
            majorTooltip={
              <StatTooltip
                lines={statBreakdowns.majorThresh}
                srdRef="SRD p. 20, 22"
                ariaLabel="How Major Damage Threshold is calculated"
              >
                <dd className="rounded bg-steel-400/20 border border-steel-400/40 px-2 py-0.5 text-base font-bold text-[#b9cfe8] tabular-nums leading-none hover:border-steel-400 transition-colors cursor-default">
                  {damageThresholds.major}
                </dd>
              </StatTooltip>
            }
            severeTooltip={
              <StatTooltip
                lines={statBreakdowns.severeThresh}
                srdRef="SRD p. 20, 22"
                ariaLabel="How Severe Damage Threshold is calculated"
              >
                <dd className="rounded bg-steel-400/15 border border-steel-400/50 px-2 py-0.5 text-base font-bold text-[#f7f7ff] tabular-nums leading-none hover:border-steel-400 transition-colors cursor-default">
                  {damageThresholds.severe}
                </dd>
              </StatTooltip>
            }
          />
          <p className="sr-only">
            Derived from armor base threshold + level (SRD p. 3, 22).
          </p>
          <span
            className="inline-block mt-1.5 text-parchment-600 cursor-help"
            title="Derived from armor base threshold + level (SRD p. 3, 22)"
            aria-label="Threshold derivation info"
          >
            <svg
              aria-hidden="true"
              className="h-3.5 w-3.5 inline-block"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 100 20 10 10 0 000-20z"
              />
            </svg>
          </span>
        </div>

        {/* Trackers grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* ── Left: HP / Stress / Armor / Hope ── */}
          <div className="flex flex-col gap-4">
            {/* HP with danger zone visual escalation */}
            <div
              data-field-key="trackers.hp"
              className={`rounded-lg p-2 -m-2 transition-all duration-300 ${hpContainerClass}`}
            >
              <ActionableSlotTracker
                label="Hit Points"
                marked={hpMarked}
                max={hpMax}
                markActionId="mark-hp"
                clearActionId="clear-hp"
                characterId={characterId}
                onMaxChange={(v) => updateTracker("hp", "max", v)}
                colorFilled="bg-[#fe5f55]"
                colorEmpty="border-[#fe5f55]/30"
                markedColor={hpNumericColor}
                hardMax={12}
                tooltipContent={
                  <StatTooltip
                    lines={statBreakdowns.hp}
                    srdRef="SRD p. 22"
                    ariaLabel="How max Hit Points is calculated"
                  >
                    <span
                      aria-label="Hit Points max slots"
                      className={`w-7 text-center tabular-nums hover:text-[#f7f7ff] transition-colors cursor-default ${hpNumericColor}`}
                    >
                      {hpMax}
                    </span>
                  </StatTooltip>
                }
              />
            </div>

            <div data-field-key="trackers.stress">
              <ActionableSlotTracker
                label="Stress"
                marked={trackers.stress.marked}
                max={trackers.stress.max}
                markActionId="mark-stress"
                clearActionId="clear-stress"
                characterId={characterId}
                onMaxChange={(v) => updateTracker("stress", "max", v)}
                colorFilled="bg-steel-400"
                colorEmpty="border-steel-400/30"
                hardMax={12}
                tooltipContent={
                  <StatTooltip
                    lines={statBreakdowns.stress}
                    srdRef="SRD p. 22"
                    ariaLabel="How max Stress is calculated"
                  >
                    <span
                      aria-label="Stress max slots"
                      className="w-7 text-center text-[#b9baa3] tabular-nums hover:text-[#f7f7ff] transition-colors cursor-default"
                    >
                      {trackers.stress.max}
                    </span>
                  </StatTooltip>
                }
              />
            </div>

            <div data-field-key="trackers.armor">
              <ActionableSlotTracker
                label="Armor"
                marked={trackers.armor.marked}
                max={trackers.armor.max}
                markActionId="mark-armor"
                clearActionId="clear-armor"
                characterId={characterId}
                onMaxChange={(v) => updateTracker("armor", "max", v)}
                colorFilled="bg-[#b9baa3]"
                colorEmpty="border-[#b9baa3]/30"
                hardMax={derivedStats.armor}
              />
            </div>

            {/* Hope — server-authoritative +/- */}
            <div data-field-key="trackers.hope">
              <ActionableHopeTracker
                characterId={characterId}
                hopeTooltip={
                  <StatTooltip
                    lines={statBreakdowns.hope}
                    srdRef="SRD p. 20"
                    ariaLabel="How max Hope is calculated"
                  >
                    <span className="tabular-nums text-[#b9baa3] hover:text-[#f7f7ff] transition-colors cursor-default">
                      {activeCharacter.hopeMax ?? 6}
                    </span>
                  </StatTooltip>
                }
              />
            </div>
          </div>

          {/* ── Right: Proficiency ── */}
          <div className="flex flex-col gap-4">
            {/* Proficiency — styled prominently */}
            <div
              className="rounded-lg border border-steel-400/30 bg-slate-900/60 p-3 flex items-center gap-3"
              data-field-key="trackers.proficiency"
            >
              <div
                className="h-12 w-12 rounded-lg border-2 border-steel-400/50 bg-slate-800 flex items-center justify-center shadow-inner"
                aria-label={`Proficiency: ${activeCharacter.proficiency ?? 1}`}
              >
                <span className="text-2xl font-bold text-steel-400 tabular-nums">
                  {activeCharacter.proficiency ?? 1}
                </span>
              </div>
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-parchment-400 block">
                  Proficiency
                </span>
                <p
                  className="text-sm text-parchment-500 italic"
                  title="Proficiency increases at levels 2, 5, and 8 (SRD p. 22)"
                >
                  Increases at levels 2, 5, 8
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ Equipment Card ═══ */}
      <div className="rounded-xl border border-steel-400/30 bg-slate-900/80 p-4 shadow-card space-y-3">
        <h3 className="text-[0.887rem] font-semibold uppercase tracking-widest text-[#7a9ab5]/70">
          Equipment
        </h3>
        <div className="flex flex-col gap-3">
          <div data-field-key="trackers.weapons.primary">
            <WeaponCard slot="primary" onRollQueued={onRollQueued} />
          </div>
          <div data-field-key="trackers.weapons.secondary">
            <WeaponCard slot="secondary" onRollQueued={onRollQueued} />
          </div>
          <div data-field-key="trackers.weapons.armor">
            <ArmorCard />
          </div>
        </div>
      </div>

      {/* ═══ Heritage & Experiences Card ═══ */}
      <div className="rounded-xl border border-steel-400/30 bg-slate-900/80 p-4 shadow-card space-y-5">
        <h3 className="text-[0.887rem] font-semibold uppercase tracking-widest text-[#7a9ab5]/70">
          Heritage &amp; Experiences
        </h3>

        {/* Heritage Features (ancestry + community) */}
        <div data-field-key="trackers.heritage">
          <HeritageSection />
        </div>

        {/* Experiences */}
        <ExperiencesList />
      </div>
    </section>
  );
}
