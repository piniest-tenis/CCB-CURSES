"use client";

/**
 * src/components/character/DomainLoadout.tsx
 *
 * Domain card management via drag-and-drop (@dnd-kit) between the "Active
 * Loadout" (max 5 cards, tier-locked order) and the "Vault" (all other acquired
 * cards). Replaces the old swap/remove/reorder UI.
 *
 * Rules:
 *   - Loadout → Vault: always allowed, no cost (server action
 *     "move-loadout-to-vault"). Replaces the old "×" remove button.
 *   - Vault → Loadout: only when the loadout is not full ("swap-loadout-card",
 *     Recall Cost stress / Linked Curse rules apply).
 *   - Add a domain card: opens a modal listing all cards grouped by collapsible
 *     domain; adding a non-standard card is flagged as non-compliant (GM
 *     discretion).
 *
 * Accessibility: every drag operation has a keyboard-operable button fallback
 * ("Move to Vault" / "Add to Loadout") and dnd-kit's KeyboardSensor (Space to
 * lift, arrows to move, Space to drop, Escape to cancel).
 */

import React, { useState, useMemo, useCallback, useEffect } from "react";
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  DragOverlay,
  closestCorners,
  type DragStartEvent,
  type DragOverEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import type { DomainCard, TokenConfig } from "@shared/types";
import { resolveTokenCap } from "@shared/tokenResolver";
import { cardHasTokens, statLabel, type StatLabelKey } from "@/lib/tokenUtils";
import { useCharacterStore } from "@/store/characterStore";
import {
  useDomainCard,
  useDomains,
  useDomain,
} from "@/hooks/useGameData";
import { useActionButton, InlineActionError } from "./ActionButton";
import { useCharacterAction } from "@/hooks/useCharacter";
import { UsageTracker } from "./UsageTracker";
import {
  detectUsageFrequency,
  usageKeyForCard,
  usageKeyForGrimoireAbility,
} from "@/lib/usageUtils";
import { MarkdownContent } from "@/components/MarkdownContent";
import { SourceBadge } from "@/components/SourceBadge";
import {
  SourceFilter,
  matchesSourceFilter,
  type SourceFilterValue,
} from "@/components/SourceFilter";
import { useSourceFilterDefault } from "@/hooks/useSourceFilterDefault";
import { useViewerMode } from "./ViewerModeContext";
import { DiceRollButton } from "@/components/dice/DiceRollButton";
import type { RollRequest, DieSize } from "@/types/dice";

// ─── Card text roll parser ────────────────────────────────────────────────────

const TRAIT_MAP: Record<string, string> = {
  agility: "Agility",
  strength: "Strength",
  finesse: "Finesse",
  instinct: "Instinct",
  presence: "Presence",
  knowledge: "Knowledge",
  spellcast: "Spellcast",
};

function parseCardRollRequest(
  cardName: string,
  text: string,
): RollRequest | null {
  const actionMatch = text.match(/make an?\s+(\w+)\s+Roll(?:\s*\((\d+)\))?/i);
  if (actionMatch) {
    const traitKey = actionMatch[1].toLowerCase();
    const traitLabel = TRAIT_MAP[traitKey] ?? actionMatch[1];
    const difficulty = actionMatch[2]
      ? parseInt(actionMatch[2], 10)
      : undefined;
    return {
      label: `${cardName} — ${traitLabel} Roll`,
      type: "action",
      difficulty,
      dice: [
        { size: "d12", role: "hope", label: "Hope" },
        { size: "d12", role: "fear", label: "Fear" },
      ],
    };
  }

  const damageMatch = text.match(
    /deal\s+(\d+)?d(\d+)(?:\+(\d+))?\s+\w*\s*damage/i,
  );
  if (damageMatch) {
    const count = damageMatch[1] ? parseInt(damageMatch[1], 10) : 1;
    const sizeNum = parseInt(damageMatch[2], 10);
    const flatMod = damageMatch[3] ? parseInt(damageMatch[3], 10) : 0;
    const validSizes = [4, 6, 8, 10, 12, 20];
    if (validSizes.includes(sizeNum)) {
      const dieSize = `d${sizeNum}` as DieSize;
      return {
        label: `${cardName} — Damage`,
        type: "damage",
        modifier: flatMod || undefined,
        dice: Array.from({ length: count }, () => ({
          size: dieSize,
          role: "damage" as const,
          label: cardName,
        })),
      };
    }
  }

  const genericMatch = text.match(/roll\s+a?\s*(\d+)?d(\d+)/i);
  if (genericMatch) {
    const count = genericMatch[1] ? parseInt(genericMatch[1], 10) : 1;
    const sizeNum = parseInt(genericMatch[2], 10);
    const validSizes = [4, 6, 8, 10, 12, 20];
    if (validSizes.includes(sizeNum)) {
      const dieSize = `d${sizeNum}` as DieSize;
      return {
        label: `${cardName} — Roll`,
        type: "generic",
        dice: Array.from({ length: count }, () => ({
          size: dieSize,
          role: "generic" as const,
          label: cardName,
        })),
      };
    }
  }

  return null;
}

function cardRollRequests(card: DomainCard): RollRequest[] {
  const reqs: RollRequest[] = [];
  const seen = new Set<string>();

  const tryAdd = (req: RollRequest | null) => {
    if (!req) return;
    const key = req.label;
    if (seen.has(key)) return;
    seen.add(key);
    reqs.push(req);
  };

  if (card.isGrimoire && card.grimoire.length > 0) {
    for (const ability of card.grimoire) {
      tryAdd(
        parseCardRollRequest(
          `${card.name}: ${ability.name}`,
          ability.description,
        ),
      );
    }
  } else {
    tryAdd(parseCardRollRequest(card.name, card.description));
  }

  return reqs;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseCardId(cardId: string): {
  domain: string | undefined;
  id: string;
} {
  const parts = cardId.includes("/") ? cardId.split("/") : null;
  return { domain: parts?.[0], id: parts?.[1] ?? cardId };
}

function cardHasAura(card: DomainCard | undefined): boolean {
  if (!card) return false;
  return /aura/i.test(card.description);
}

function cardMatchesQuery(card: DomainCard, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const hay = [
    card.name,
    card.domain,
    card.description,
    ...(card.grimoire?.map((a) => a.name) ?? []),
  ]
    .join(" ")
    .toLowerCase();
  return hay.includes(q);
}

// ─── TokenTracker ─────────────────────────────────────────────────────────────

interface TokenTrackerProps {
  cardId: string;
  cardName: string;
  characterId: string;
  count: number;
  resolvedCap?: number | null;
  tokenConfig?: TokenConfig | undefined;
}

function TokenTracker({
  cardId,
  cardName,
  characterId,
  count,
  resolvedCap,
  tokenConfig,
}: TokenTrackerProps) {
  const spendAction = useActionButton(characterId);
  const addAction = useActionButton(characterId);
  const clearAction = useActionButton(characterId);

  const isPending =
    spendAction.isPending || addAction.isPending || clearAction.isPending;
  const inlineError =
    spendAction.inlineError ?? addAction.inlineError ?? clearAction.inlineError;
  const errorId = React.useId();
  const spinnerId = React.useId();

  const pipCount = resolvedCap != null ? resolvedCap : 8;

  const capStatKey =
    tokenConfig?.maxStat != null && typeof tokenConfig.maxStat !== "number"
      ? (tokenConfig.maxStat as StatLabelKey)
      : null;
  const capLabel = capStatKey ? statLabel(capStatKey) : null;

  const countDisplay =
    resolvedCap != null
      ? capLabel
        ? `${count} / ${resolvedCap} (${capLabel})`
        : `${count} / ${resolvedCap}`
      : `${count}`;

  const atCap = resolvedCap != null && count >= resolvedCap;
  const atZero = count <= 0;

  return (
    <div className="mt-2 flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <span className="text-xs uppercase tracking-wider text-parchment-600">
          Tokens
        </span>
        <div
          role="spinbutton"
          aria-valuenow={count}
          aria-valuemin={0}
          aria-valuemax={resolvedCap ?? 99}
          aria-label={`Token count for ${cardName}`}
          aria-describedby={inlineError ? errorId : undefined}
          className="flex items-center gap-1"
        >
          <button
            type="button"
            onClick={() => spendAction.fire("spend-token", { cardId })}
            disabled={isPending || atZero}
            aria-label={`Remove token from ${cardName}`}
            className="
              min-h-[44px] min-w-[44px] rounded border border-burgundy-800 bg-slate-900
              text-sm text-parchment-500 hover:bg-burgundy-900/30
              disabled:opacity-50 disabled:cursor-not-allowed
              transition-colors flex items-center justify-center
              focus:outline-none focus:ring-1 focus:ring-gold-500
            "
          >
            −
          </button>

          <span
            id={spinnerId}
            className="min-w-[4rem] text-center text-sm font-bold text-parchment-200 tabular-nums"
          >
            {countDisplay}
          </span>

          <button
            type="button"
            onClick={() => addAction.fire("add-token", { cardId })}
            disabled={isPending || atCap}
            aria-label={`Add token to ${cardName}`}
            className="
              min-h-[44px] min-w-[44px] rounded border border-gold-800 bg-slate-900
              text-sm text-gold-600 hover:bg-gold-900/20
              disabled:opacity-50 disabled:cursor-not-allowed
              transition-colors flex items-center justify-center
              focus:outline-none focus:ring-1 focus:ring-gold-500
            "
          >
            +
          </button>

          <button
            type="button"
            onClick={() => clearAction.fire("clear-tokens", { cardId })}
            disabled={isPending}
            aria-label={`Clear all tokens from ${cardName}`}
            title="Clear all tokens"
            className="
              min-h-[44px] min-w-[44px] rounded border border-slate-700 bg-slate-900
              text-sm text-parchment-600 hover:bg-coral-400/15 hover:text-coral-400 hover:border-coral-400/40
              disabled:opacity-50 disabled:cursor-wait
              transition-colors flex items-center justify-center
              focus:outline-none focus:ring-1 focus:ring-gold-500
              ml-1
            "
          >
            ×
          </button>
        </div>
      </div>

      {pipCount > 0 && (
        <div className="flex gap-1 ml-0.5" aria-hidden="true">
          {Array.from({ length: pipCount }, (_, i) => (
            <span
              key={i}
              className={`h-2 w-2 rounded-full ${i < count ? "bg-[#DAA520]" : "bg-slate-700"}`}
            />
          ))}
        </div>
      )}

      <InlineActionError message={inlineError} id={errorId} />
    </div>
  );
}

// ─── AuraToggle ───────────────────────────────────────────────────────────────

interface AuraToggleProps {
  cardId: string;
  cardName: string;
  characterId: string;
  isActive: boolean;
  anotherAuraActive: boolean;
}

function AuraToggle({
  cardId,
  cardName,
  characterId,
  isActive,
  anotherAuraActive,
}: AuraToggleProps) {
  const { fire, isPending, inlineError } = useActionButton(characterId);
  const errorId = React.useId();

  return (
    <div className="mt-2 flex flex-col gap-1">
      <button
        type="button"
        onClick={() => fire("toggle-aura", { cardId })}
        disabled={isPending}
        aria-pressed={isActive}
        aria-label={`Toggle aura for ${cardName}: currently ${isActive ? "on" : "off"}`}
        aria-describedby={inlineError ? errorId : undefined}
        className={`
          inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold
          border transition-all duration-150 min-h-[44px]
          focus:outline-none focus:ring-2 focus:ring-gold-500
          disabled:opacity-50 disabled:cursor-wait
          ${
            isActive
              ? "border-[#577399] bg-[#577399]/20 text-[#6a8fb5] shadow-[0_0_8px_rgba(87,115,153,0.5)]"
              : "border-slate-700 bg-transparent text-parchment-500 hover:border-slate-500 hover:text-parchment-300"
          }
        `}
      >
        <span
          aria-hidden="true"
          className={`h-2 w-2 rounded-full ${isActive ? "bg-[#577399] shadow-[0_0_4px_rgba(87,115,153,0.8)]" : "bg-parchment-700"}`}
        />
        Aura: {isActive ? "ON" : "OFF"}
      </button>

      {isActive && (
        <p className="text-sm text-[#6a8fb5] leading-snug" role="status">
          Aura active — when hit, make a Spellcast Roll to maintain.
        </p>
      )}

      {!isActive && anotherAuraActive && (
        <p className="text-sm text-parchment-600 leading-snug">
          Activating will deactivate your current aura.
        </p>
      )}

      <InlineActionError message={inlineError} id={errorId} />
    </div>
  );
}

// ─── DomainCardDetailSidebar ──────────────────────────────────────────────────

interface DomainCardDetailSidebarProps {
  card: DomainCard | null;
  onClose: () => void;
  onRollQueued?: () => void;
  characterName?: string;
}

function DomainCardDetailSidebar({
  card,
  onClose,
  onRollQueued,
  characterName,
}: DomainCardDetailSidebarProps) {
  const { activeCharacter } = useCharacterStore();
  const characterId = activeCharacter?.characterId ?? "";
  const usage = activeCharacter?.usage ?? {};
  const open = card !== null;
  const panelRef = React.useRef<HTMLDivElement>(null);
  const headingId = React.useId();

  const fullCardId = card ? `${card.domain}/${card.cardId}` : "";

  React.useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => {
      const first = panelRef.current?.querySelector<HTMLElement>(
        'button, [tabindex]:not([tabindex="-1"])',
      );
      first?.focus();
    }, 50);
    return () => clearTimeout(t);
  }, [open]);

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
          "fixed inset-y-0 right-0 z-50 flex h-full w-full max-w-[28rem] flex-col py-12",
          "border-l border-[#577399]/35 bg-[#0f1713] shadow-2xl",
          "transition-transform duration-300 ease-in-out",
          open ? "translate-x-0" : "translate-x-full",
        ].join(" ")}
      >
        <div className="flex items-center justify-between border-b border-[#577399]/25 px-5 py-4 shrink-0">
          <div>
            {card && (
              <p className="text-xs uppercase tracking-[0.24em] text-parchment-500">
                {card.domain} · Level {card.level}
              </p>
            )}
            <h2
              id={headingId}
              className="font-serif text-lg font-semibold text-[#f7f7ff]"
            >
              {card?.name ?? "Domain Card"}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close card detail panel"
            className="flex h-11 w-11 items-center justify-center rounded-lg border border-[#577399]/30 text-[#b9baa3] hover:bg-[#577399]/12 hover:text-[#f7f7ff] focus:outline-none focus:ring-2 focus:ring-[#577399]"
          >
            ✕
          </button>
        </div>

        {card && (
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-gold-800 px-2 py-0.5 text-xs font-bold text-gold-500">
                Lv {card.level}
              </span>
              <span className="rounded-full border border-slate-700 px-2 py-0.5 text-xs text-parchment-500 uppercase tracking-wider">
                Recall Cost {card.recallCost}⚡
              </span>
              {card.isGrimoire && (
                <span className="rounded bg-gold-900/50 px-1.5 py-0.5 text-xs font-semibold text-gold-400">
                  Grimoire
                </span>
              )}
              {card.isCursed && (
                <span className="rounded bg-burgundy-900/50 px-1.5 py-0.5 text-xs font-semibold text-burgundy-400">
                  ★ Cursed
                </span>
              )}
              {card.isLinkedCurse && (
                <span className="rounded bg-burgundy-900/50 px-1.5 py-0.5 text-xs font-semibold text-burgundy-400">
                  ↔ Linked Curse
                </span>
              )}
            </div>

            <div className="rounded-lg border border-slate-700/60 bg-slate-900/40 px-4 py-3">
              {card.isGrimoire && card.grimoire.length > 0 ? (
                <div className="space-y-3">
                  {card.grimoire.map((ability, i) => (
                    <div key={i}>
                      <p className="text-sm font-semibold text-[#f7f7ff] mb-1">
                        {ability.name}
                      </p>
                      <MarkdownContent className="text-base text-[#b9baa3]/75">
                        {ability.description}
                      </MarkdownContent>
                      <div className="mt-2">
                        <UsageTracker
                          characterId={characterId}
                          usageKey={usageKeyForGrimoireAbility(fullCardId, i)}
                          frequency={
                            ability.usageFrequency ??
                            detectUsageFrequency(ability.description)
                          }
                          exhausted={Boolean(
                            usage[usageKeyForGrimoireAbility(fullCardId, i)],
                          )}
                          label={`${card.name}: ${ability.name}`}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <>
                  <MarkdownContent className="text-base text-[#b9baa3]/75">
                    {card.description}
                  </MarkdownContent>
                  <div className="mt-3 border-t border-slate-700/40 pt-2">
                    <UsageTracker
                      characterId={characterId}
                      usageKey={usageKeyForCard(fullCardId)}
                      frequency={
                        card.usageFrequency ??
                        detectUsageFrequency(card.description)
                      }
                      exhausted={Boolean(usage[usageKeyForCard(fullCardId)])}
                      label={card.name}
                    />
                  </div>
                </>
              )}
            </div>

            {card.isCursed && card.curseText && (
              <div className="rounded-lg border border-steel-400/30 bg-slate-900/60 px-4 py-3">
                <p className="text-xs uppercase tracking-wider text-steel-accessible mb-1">
                  Curse
                </p>
                <MarkdownContent className="text-base text-[#b9baa3]/70">
                  {card.curseText}
                </MarkdownContent>
              </div>
            )}

            {(() => {
              const rolls = cardRollRequests(card);
              if (rolls.length === 0) return null;
              return (
                <div className="flex flex-wrap gap-2 pt-1">
                  {rolls.map((req) => (
                    <DiceRollButton
                      key={req.label}
                      rollRequest={
                        characterName ? { ...req, characterName } : req
                      }
                      variant="badge"
                      label={req.label
                        .replace(`${card.name} — `, "")
                        .replace(`${card.name}: `, "")}
                      onRollQueued={onRollQueued}
                    />
                  ))}
                </div>
              );
            })()}
          </div>
        )}
      </div>
    </>
  );
}

// ─── Drag data & shared types ─────────────────────────────────────────────────

interface DragData {
  container: "loadout" | "vault";
  cardId: string;
  card?: DomainCard;
}

type ActiveDrag = { container: "loadout" | "vault"; cardId: string } | null;

// ─── LoadoutCard ──────────────────────────────────────────────────────────────

interface LoadoutCardProps {
  cardId: string;
  characterId: string;
  /** True when this card just landed optimistically into the loadout. */
  isLanding?: boolean;
  /** True while the optimistic move for this card is in-flight. */
  isSaving?: boolean;
  onDrill: (card: DomainCard) => void;
  onMoveToVault: (cardId: string) => void;
  onRegisterLevel: (cardId: string, level: number) => void;
}

function LoadoutCard({
  cardId,
  characterId,
  isLanding = false,
  isSaving = false,
  onDrill,
  onMoveToVault,
  onRegisterLevel,
}: LoadoutCardProps) {
  const { activeCharacter } = useCharacterStore();
  const viewerMode = useViewerMode();
  const { domain, id } = parseCardId(cardId);
  const { data: card } = useDomainCard(domain, id);

  const {
    setNodeRef,
    listeners,
    attributes,
    transform,
    isDragging,
  } = useDraggable({
    id: cardId,
    data: { container: "loadout", cardId, card } satisfies DragData,
    disabled: viewerMode,
  });

  useEffect(() => {
    if (card?.level != null) onRegisterLevel(cardId, card.level);
  }, [card, cardId, onRegisterLevel]);

  const cardTokens = activeCharacter?.cardTokens ?? {};
  const activeAuras = activeCharacter?.activeAuras ?? [];
  const tokenCount = cardTokens[cardId] ?? 0;
  const showTokens = cardHasTokens(card, cardTokens, cardId);
  const showAura = cardHasAura(card);
  const isAuraActive = activeAuras.includes(cardId);

  const usage = activeCharacter?.usage ?? {};
  const frequency =
    card?.usageFrequency ?? detectUsageFrequency(card?.description ?? "");
  const usageKey = usageKeyForCard(cardId);
  const exhausted = Boolean(usage[usageKey]);

  const resolvedCap: number | null =
    card?.tokenConfig && activeCharacter
      ? resolveTokenCap(card.tokenConfig, activeCharacter)
      : null;

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform) }}
      role="listitem"
      aria-busy={isSaving || undefined}
      aria-label={card ? `${card.name}, domain card` : cardId}
      className={`
        relative rounded-lg p-3
        transition-colors duration-150
        motion-reduce:transition-none motion-reduce:animate-none motion-reduce:transform-none
        ${isLanding ? "motion-safe:animate-card-land" : ""}
        ${isSaving ? "opacity-85" : isDragging ? "opacity-60" : exhausted ? "opacity-75 saturate-[0.85]" : ""}
        ${
          isAuraActive
            ? "border border-[#577399]/60 bg-slate-850 shadow-[0_0_10px_rgba(87,115,153,0.25)]"
            : "border border-steel-400/30 bg-slate-850 hover:border-steel-400/50"
        }
        shadow-card-fantasy
      `}
    >
      {isLanding && (
        <span
          aria-hidden="true"
          className="absolute inset-0 rounded-lg pointer-events-none shadow-[0_0_0_2px_rgba(251,191,36,0.7),0_0_18px_rgba(251,191,36,0.45)] motion-safe:animate-land-ring"
        />
      )}
      {isSaving && (
        <span
          aria-hidden="true"
          className="absolute inset-0 overflow-hidden rounded-lg pointer-events-none"
        >
          <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-gold-400/10 to-transparent motion-safe:animate-shimmer" />
        </span>
      )}
      <div className="flex items-center gap-3">
        {/* Drag handle */}
        <button
          type="button"
          {...listeners}
          {...attributes}
          disabled={viewerMode}
          className="flex flex-col gap-0.5 items-center justify-center text-parchment-600 select-none shrink-0 cursor-grab active:cursor-grabbing touch-none
            rounded focus:outline-none focus:ring-1 focus:ring-gold-500 disabled:cursor-not-allowed disabled:opacity-40 min-h-[44px] min-w-[44px]"
          aria-label={`Drag ${card?.name ?? cardId} to reorder or move to vault`}
          title={viewerMode ? "View only" : "Drag to move to vault"}
        >
          <span className="block w-4 border-t border-current" />
          <span className="block w-4 border-t border-current" />
          <span className="block w-4 border-t border-current" />
        </button>

        {/* Card info — click to open detail sidebar */}
        <div className="flex-1 min-w-0">
          {card ? (
            <button
              type="button"
              onClick={() => onDrill(card)}
              className="w-full text-left group"
              aria-label={`View details for ${card.name}`}
            >
              <div className="flex items-center gap-2">
                <span
                  className={`text-sm font-semibold truncate group-hover:text-parchment-100 transition-colors ${
                    exhausted
                      ? "line-through decoration-slate-500/70 decoration-[1.5px] text-parchment-300"
                      : "text-parchment-200"
                  }`}
                >
                  {card.name}
                </span>
                {exhausted && (
                  <span
                    title="Used"
                    className="rounded bg-burgundy-900/50 px-1.5 py-0.5 text-[0.6rem] font-semibold uppercase tracking-wider text-burgundy-400"
                  >
                    USED
                  </span>
                )}
                {card.isCursed && (
                  <span title="Cursed" className="text-xs text-burgundy-400 font-bold">
                    ★
                  </span>
                )}
                {card.isLinkedCurse && (
                  <span
                    title="Linked Curse — long rest only, 6 stress to swap"
                    className="text-xs text-burgundy-400 font-bold"
                  >
                    ↔
                  </span>
                )}
                {card.isGrimoire && (
                  <span className="rounded bg-gold-900/50 px-1 text-xs font-semibold text-gold-400">
                    Grimoire
                  </span>
                )}
                <span className="ml-auto text-parchment-600 text-xs opacity-40 group-hover:opacity-100 transition-opacity">
                  ›
                </span>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-parchment-500 uppercase tracking-wider">
                  {card.domain}
                </span>
                <span className="rounded-full border border-gold-800 px-1.5 text-xs font-bold text-gold-500">
                  Lv {card.level}
                </span>
              </div>
              <MarkdownContent
                className="text-xs text-parchment-600 leading-snug mt-1 line-clamp-2"
                inline
              >
                {card.isGrimoire && card.grimoire.length > 0
                  ? card.grimoire.map((a) => a.name).join(", ")
                  : card.description
                      .replace(/\[\[([^\]]+?)\]\]/g, (_m, inner: string) => {
                        const pipe = inner.indexOf("|");
                        return pipe >= 0
                          ? inner.slice(pipe + 1).trim()
                          : inner.split("/").pop()!.trim();
                      })
                      .replace(/\n/g, " ")
                      .trim()}
              </MarkdownContent>
            </button>
          ) : (
            <span className="text-sm text-parchment-500">Loading…</span>
          )}
        </div>

        {/* Move to Vault (keyboard fallback for drag-out) */}
        <button
          type="button"
          onClick={() => onMoveToVault(cardId)}
          disabled={viewerMode}
          className="
            shrink-0 rounded p-2 text-parchment-500 hover:bg-steel-400/15 hover:text-parchment-300
            transition-colors focus:outline-none focus:ring-2 focus:ring-gold-500 min-h-[44px] min-w-[44px]
            disabled:cursor-not-allowed disabled:opacity-40
          "
          aria-label={`Move ${card?.name ?? cardId} to Vault`}
          title={viewerMode ? "View only" : "Move to Vault"}
        >
          <i className="fa-solid fa-box-archive text-sm" aria-hidden="true" />
        </button>
      </div>

      {(frequency !== "none" || showTokens || showAura) && (
        <div className="mt-3 border-t border-slate-700/40 pt-2 space-y-2">
          <UsageTracker
            characterId={characterId}
            usageKey={usageKey}
            frequency={frequency}
            exhausted={exhausted}
            label={card?.name ?? cardId}
          />

          {showTokens && (
            <TokenTracker
              cardId={cardId}
              cardName={card?.name ?? cardId}
              characterId={characterId}
              count={tokenCount}
              resolvedCap={resolvedCap}
              tokenConfig={card?.tokenConfig}
            />
          )}

          {showAura && card && (
            <AuraToggle
              cardId={cardId}
              cardName={card.name}
              characterId={characterId}
              isActive={isAuraActive}
              anotherAuraActive={!isAuraActive && activeAuras.length > 0}
            />
          )}
        </div>
      )}
    </div>
  );
}

// ─── VaultCard ────────────────────────────────────────────────────────────────

interface VaultCardProps {
  cardId: string;
  /** Disables dragging into the loadout (loadout is full). */
  disabled: boolean;
  /** Active rest state — drives the cost chip and ↔ blocking. */
  restType: "short" | "long" | "none";
  /** True when this card just landed optimistically into the vault. */
  isLanding?: boolean;
  /** True while the optimistic move for this card is in-flight. */
  isSaving?: boolean;
  onAddToLoadout: (card: DomainCard) => void;
}

function VaultCard({
  cardId,
  disabled,
  restType,
  isLanding = false,
  isSaving = false,
  onAddToLoadout,
}: VaultCardProps) {
  const viewerMode = useViewerMode();
  const { domain, id } = parseCardId(cardId);
  const { data: card } = useDomainCard(domain, id);

  // ↔ Linked Curse cards can only be moved into the loadout during a long rest.
  const linkedBlocked = card?.isLinkedCurse && restType !== "long";
  const dragDisabled = disabled || viewerMode || linkedBlocked;

  const {
    setNodeRef,
    listeners,
    attributes,
    transform,
    isDragging,
  } = useDraggable({
    id: cardId,
    data: { container: "vault", cardId, card } satisfies DragData,
    disabled: dragDisabled,
  });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform) }}
      role="listitem"
      aria-busy={isSaving || undefined}
      aria-label={card ? `${card.name}, vault card` : cardId}
      className={`
        relative rounded-lg border p-2.5 transition-colors duration-150
        motion-reduce:transition-none motion-reduce:animate-none motion-reduce:transform-none
        ${isLanding ? "motion-safe:animate-card-land" : ""}
        ${isSaving ? "opacity-85" : isDragging ? "opacity-60" : ""}
        ${
          dragDisabled
            ? "border-steel-400/20 bg-slate-900/40 opacity-60"
            : "border-steel-400/30 bg-slate-850 hover:border-steel-400/50"
        }
      `}
    >
      {isLanding && (
        <span
          aria-hidden="true"
          className="absolute inset-0 rounded-lg pointer-events-none shadow-[0_0_0_2px_rgba(87,115,153,0.7),0_0_14px_rgba(87,115,153,0.4)] motion-safe:animate-land-ring"
        />
      )}
      {isSaving && (
        <span
          aria-hidden="true"
          className="absolute inset-0 overflow-hidden rounded-lg pointer-events-none"
        >
          <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-gold-400/10 to-transparent motion-safe:animate-shimmer" />
        </span>
      )}
      <div className="flex items-center gap-2">
        {/* Drag handle */}
        <button
          type="button"
          {...listeners}
          {...attributes}
          disabled={dragDisabled}
          className="flex flex-col gap-0.5 items-center justify-center text-parchment-600 select-none shrink-0 cursor-grab active:cursor-grabbing touch-none
            rounded focus:outline-none focus:ring-1 focus:ring-gold-500 disabled:cursor-not-allowed disabled:opacity-40 min-h-[44px] min-w-[44px]"
          aria-label={`Drag ${card?.name ?? cardId} into the loadout`}
          title={
            viewerMode
              ? "View only"
              : disabled
                ? "Loadout is full"
                : linkedBlocked
                  ? "Linked Curse — long rest only"
                  : "Drag to add to loadout"
          }
        >
          <span className="block w-4 border-t border-current" />
          <span className="block w-4 border-t border-current" />
          <span className="block w-4 border-t border-current" />
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-sm font-semibold text-parchment-200 truncate">
              {card?.name ?? cardId}
            </span>
            {card?.isCursed && (
              <span title="Cursed" className="text-xs text-burgundy-400 font-bold">
                ★
              </span>
            )}
            {card?.isLinkedCurse && (
              <span
                title="Linked Curse"
                className="text-xs text-burgundy-400 font-bold"
              >
                ↔
              </span>
            )}
          </div>
          {card && (
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-xs text-parchment-500 uppercase tracking-wider">
                {card.domain}
              </span>
              <span className="rounded-full border border-gold-800 px-1.5 text-xs font-bold text-gold-500">
                Lv {card.level}
              </span>
              {card.isLinkedCurse ? (
                restType === "long" ? (
                  <span className="rounded border border-burgundy-800/60 bg-burgundy-900/40 px-1.5 py-0.5 text-[0.65rem] font-semibold text-burgundy-300">
                    ↔ ⚡ 6 Stress
                  </span>
                ) : (
                  <span className="rounded border border-burgundy-800/50 bg-burgundy-950/40 px-1.5 py-0.5 text-[0.65rem] font-semibold text-burgundy-400 opacity-80">
                    ↔ Long rest only
                  </span>
                )
              ) : card.isCursed ? (
                <span className="rounded border border-burgundy-800/60 bg-burgundy-900/40 px-1.5 py-0.5 text-[0.65rem] font-semibold text-burgundy-300">
                  ★ ⚡ {card.recallCost} Stress
                </span>
              ) : restType === "none" ? (
                <span className="rounded border border-slate-700/60 bg-slate-900/60 px-1.5 py-0.5 text-[0.65rem] font-semibold text-parchment-400 tabular-nums">
                  ⚡ {card.recallCost} Stress
                </span>
              ) : (
                <span className="rounded border border-gold-500/40 bg-gold-500/15 px-1.5 py-0.5 text-[0.65rem] font-bold uppercase tracking-wider text-gold-300">
                  FREE
                </span>
              )}
            </div>
          )}
        </div>

        {/* Add to Loadout (keyboard fallback for drag-in) */}
        <button
          type="button"
          onClick={() => card && onAddToLoadout(card)}
          disabled={dragDisabled || !card}
          aria-disabled={dragDisabled || !card}
          title={linkedBlocked ? "Linked Curse — long rest only" : undefined}
          className="
            shrink-0 rounded px-2 py-1.5 text-xs font-semibold
            border border-gold-800/60 bg-gold-950/20 text-gold-300
            hover:bg-gold-900/30 hover:border-gold-700
            disabled:opacity-40 disabled:cursor-not-allowed
            transition-colors focus:outline-none focus:ring-2 focus:ring-gold-500 min-h-[44px]
            flex items-center gap-1
          "
          aria-label={`Add ${card?.name ?? cardId} to Loadout`}
        >
          <i className="fa-solid fa-arrow-up-from-bracket text-xs" aria-hidden="true" />
          <span>Add</span>
        </button>
      </div>
    </div>
  );
}

// ─── AddCardModal ─────────────────────────────────────────────────────────────

interface AddCardModalProps {
  characterId: string;
  loadoutIds: string[];
  vaultIds: string[];
  onClose: () => void;
}

function AddCardModal({
  characterId,
  loadoutIds,
  vaultIds,
  onClose,
}: AddCardModalProps) {
  const { data: domainsData } = useDomains();
  const domains = domainsData?.domains ?? [];
  const [expandedDomain, setExpandedDomain] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const sourceFilterDefault = useSourceFilterDefault();
  // Default to "all" so every card in the system is visible (the modal is the
  // GM-discretion "add any card" surface, per product decision).
  const [sourceFilter, setSourceFilter] = useState<SourceFilterValue>("all");
  const headingId = React.useId();

  useEffect(() => {
    const t = setTimeout(() => {
      const first = document.querySelector<HTMLElement>(
        '[data-addcard-modal] button, [data-addcard-modal] input, [data-addcard-modal] [tabindex]:not([tabindex="-1"])',
      );
      first?.focus();
    }, 50);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };
    document.addEventListener("keydown", handler, true);
    return () => document.removeEventListener("keydown", handler, true);
  }, [onClose]);

  const sortedDomains = useMemo(
    () => [...domains].sort((a, b) => a.domain.localeCompare(b.domain)),
    [domains],
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={headingId}
      data-addcard-modal
    >
      <div
        aria-hidden="true"
        onClick={onClose}
        className="fixed inset-0 z-[-1] bg-slate-950/70 backdrop-blur-sm"
      />

      <div className="relative flex h-full max-h-[85vh] w-full max-w-2xl flex-col rounded-xl border border-[#577399]/30 bg-[#0f1713] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#577399]/25 px-5 py-4 shrink-0">
          <h2
            id={headingId}
            className="font-serif text-lg font-semibold text-[#f7f7ff]"
          >
            Add a Domain Card
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close add card dialog"
            className="flex h-11 w-11 items-center justify-center rounded-lg border border-[#577399]/30 text-[#b9baa3] hover:bg-[#577399]/12 hover:text-[#f7f7ff] focus:outline-none focus:ring-2 focus:ring-[#577399]"
          >
            ✕
          </button>
        </div>

        {/* Non-compliant warning */}
        <div
          role="alert"
          className="border-b border-[#f7b500]/25 px-5 py-2.5 flex items-start gap-2 bg-[#f7b500]/5"
        >
          <i
            className="fa-solid fa-triangle-exclamation text-[#f7b500] mt-0.5"
            aria-hidden="true"
          />
          <p className="text-xs sidebar-text-secondary">
            Adding a domain card this way may create a character sheet that is
            not compliant with the standard rules. Check with your GM before
            using this method to add a domain card.
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-2 border-b border-[#577399]/20 px-5 py-3 shrink-0 sm:flex-row sm:items-center">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search cards…"
            aria-label="Search domain cards"
            className="flex-1 rounded-md border border-steel-400/40 bg-slate-850 px-3 py-2 text-sm text-[#f7f7ff] placeholder:text-[#b9baa3]/40 focus:outline-none focus:ring-2 focus:ring-[#577399] focus:border-[#577399]"
          />
          <SourceFilter
            value={sourceFilter}
            onChange={setSourceFilter}
            defaultFilter={sourceFilterDefault}
          />
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2">
          {sortedDomains.length === 0 ? (
            <p className="text-sm text-parchment-500">Loading domains…</p>
          ) : (
            sortedDomains.map((d) => (
              <DomainGroup
                key={d.domain}
                domain={d.domain}
                characterId={characterId}
                loadoutIds={loadoutIds}
                vaultIds={vaultIds}
                query={query}
                sourceFilter={sourceFilter}
                expanded={expandedDomain === d.domain}
                onToggle={() =>
                  setExpandedDomain((prev) =>
                    prev === d.domain ? null : d.domain,
                  )
                }
              />
            ))
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-[#577399]/25 px-5 py-4 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-xl border border-steel-400/40 bg-steel-400/15 px-4 py-3 text-sm font-semibold text-[#f7f7ff] hover:bg-steel-400/25 focus:outline-none focus:ring-2 focus:ring-[#577399]"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

interface DomainGroupProps {
  domain: string;
  characterId: string;
  loadoutIds: string[];
  vaultIds: string[];
  query: string;
  sourceFilter: SourceFilterValue;
  expanded: boolean;
  onToggle: () => void;
}

function DomainGroup({
  domain,
  characterId,
  loadoutIds,
  vaultIds,
  query,
  sourceFilter,
  expanded,
  onToggle,
}: DomainGroupProps) {
  const { data } = useDomain(domain);
  const cards = (data?.cards ?? []).filter((c) =>
    matchesSourceFilter(c.source, sourceFilter),
  );
  const filtered = query ? cards.filter((c) => cardMatchesQuery(c, query)) : cards;
  const sorted = [...filtered].sort((a, b) => a.level - b.level);

  return (
    <div className="rounded-lg border border-steel-400/20 bg-slate-900/30 overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        aria-controls={`domain-group-${domain}`}
        className="w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-slate-800/40 transition-colors focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[#577399]"
      >
        <i
          className={`fa-solid fa-chevron-right w-3.5 h-3.5 shrink-0 text-center text-[0.6rem] leading-[0.875rem] text-steel-accessible transition-transform duration-150 ${
            expanded ? "rotate-90" : ""
          }`}
          aria-hidden="true"
        />
        <span className="flex-1 text-sm font-semibold uppercase tracking-wider text-parchment-200">
          {domain}
        </span>
        <span className="text-xs text-parchment-600">{sorted.length}</span>
      </button>

      {expanded && (
        <div id={`domain-group-${domain}`} className="border-t border-slate-700/30 px-3 py-2 space-y-1.5">
          {sorted.length === 0 ? (
            <p className="text-xs text-parchment-500">No matching cards.</p>
          ) : (
            sorted.map((card) => {
              const fullId = `${card.domain}/${card.cardId}`;
              return (
                <ModalCardRow
                  key={card.cardId}
                  card={card}
                  characterId={characterId}
                  isInLoadout={loadoutIds.includes(fullId)}
                  isInVault={vaultIds.includes(fullId)}
                />
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

interface ModalCardRowProps {
  card: DomainCard;
  characterId: string;
  isInLoadout: boolean;
  isInVault: boolean;
}

function ModalCardRow({
  card,
  characterId,
  isInLoadout,
  isInVault,
}: ModalCardRowProps) {
  const { fire, isPending, inlineError } = useActionButton(characterId);
  const flushPendingSave = useCharacterStore((s) => s.flushPendingSave);
  const viewerMode = useViewerMode();
  const [expanded, setExpanded] = useState(false);
  const errorId = React.useId();

  const handleAddToVault = async () => {
    if (viewerMode) return;
    await flushPendingSave();
    fire("acquire-domain-card", { cardId: `${card.domain}/${card.cardId}` });
  };

  return (
    <div className="rounded-lg border border-steel-400/20 bg-slate-900/50">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-slate-800/40 transition-colors focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[#577399]"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-sm font-medium text-parchment-100 truncate">
              {card.name}
            </span>
            <SourceBadge source={card.source} size="sm" />
            {card.isGrimoire && (
              <span className="text-xs uppercase tracking-wider text-[#daa520]/70">
                Grimoire
              </span>
            )}
            {card.isCursed && (
              <span title="Cursed" className="text-xs text-burgundy-400 font-bold">
                ★
              </span>
            )}
            {card.isLinkedCurse && (
              <span title="Linked Curse" className="text-xs text-burgundy-400 font-bold">
                ↔
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs text-parchment-500 uppercase">{card.domain}</span>
            <span className="rounded-full border border-gold-800 px-1.5 text-xs font-bold text-gold-500">
              Lv {card.level}
            </span>
            <span className="text-xs text-parchment-600">⚡{card.recallCost}</span>
          </div>
        </div>
        <i
          className={`fa-solid fa-chevron-right text-parchment-600 text-xs transition-transform duration-150 ${
            expanded ? "rotate-90" : ""
          }`}
          aria-hidden="true"
        />
      </button>

      {expanded && (
        <div className="border-t border-slate-700/30 px-3 py-2 space-y-2">
          <div className="rounded-lg border border-slate-700/60 bg-slate-900/40 px-3 py-2">
            {card.isGrimoire && card.grimoire.length > 0 ? (
              <div className="space-y-2">
                {card.grimoire.map((ability, i) => (
                  <div key={i}>
                    <p className="text-xs font-semibold text-[#f7f7ff]">{ability.name}</p>
                    <MarkdownContent className="text-xs text-parchment-500">
                      {ability.description}
                    </MarkdownContent>
                  </div>
                ))}
              </div>
            ) : (
              <MarkdownContent className="text-xs text-parchment-500">
                {card.description}
              </MarkdownContent>
            )}
          </div>

          <div className="flex items-center gap-2">
            {isInLoadout ? (
              <span className="rounded border border-[#577399]/40 bg-[#577399]/10 px-2 py-1 text-xs font-semibold text-[#6a8fb5]">
                In loadout
              </span>
            ) : isInVault ? (
              <span className="rounded border border-steel-400/30 bg-slate-800 px-2 py-1 text-xs text-parchment-400">
                In vault
              </span>
            ) : (
              <button
                type="button"
                onClick={handleAddToVault}
                disabled={isPending}
                aria-busy={isPending}
                className="rounded px-3 py-1.5 text-xs font-semibold bg-[#577399] text-[#f7f7ff] hover:bg-[#577399]/80
                  disabled:opacity-40 disabled:cursor-not-allowed
                  focus:outline-none focus:ring-2 focus:ring-gold-500 transition-colors"
              >
                {isPending ? "Adding…" : "Add to vault"}
              </button>
            )}
          </div>

          <InlineActionError message={inlineError} id={errorId} />
        </div>
      )}
    </div>
  );
}

// ─── Help text ────────────────────────────────────────────────────────────────

function FullLoadoutHelp() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="rounded-lg border border-[#577399]/30 bg-[#577399]/8 px-3 py-2.5 flex items-start gap-2"
    >
      <i className="fa-solid fa-circle-info text-steel-accessible mt-0.5" aria-hidden="true" />
      <p className="text-xs sidebar-text-secondary">
        To add a domain card from the vault, first put a domain card from your
        loadout back into the Vault.
      </p>
    </div>
  );
}

function RoomAvailableHelp() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="rounded-lg border border-[#f7b500]/50 bg-[#f7b500]/8 px-3 py-2.5 flex items-start gap-2"
    >
      <i
        className="fa-solid fa-triangle-exclamation text-[#f7b500] mt-0.5"
        aria-hidden="true"
      />
      <p className="text-xs sidebar-text-secondary">
        You have available space in your loadout to add additional domain cards
        from the Vault.
      </p>
    </div>
  );
}

function RestModeBanner({
  restType,
  onFinishRest,
}: {
  restType: "short" | "long";
  onFinishRest?: () => void;
}) {
  return (
    <div className="rounded-lg border border-gold-500/40 bg-gold-500/10 px-3 py-2.5 space-y-2">
      <div role="status" aria-live="polite" className="flex items-start gap-2">
        <i className="fa-solid fa-moon text-gold-400 mt-0.5" aria-hidden="true" />
        <div className="space-y-0.5">
          <p className="text-xs font-semibold uppercase tracking-wider text-gold-300">
            Rest mode — {restType}
          </p>
          <p className="text-xs text-parchment-200">
            {restType === "long"
              ? "Swaps are FREE, except ★ Cursed cards (always pay Recall Cost). ↔ Linked Curse cards cost 6 Stress."
              : "Swaps are FREE, except ★ Cursed cards (always pay Recall Cost). ↔ Linked Curse cards require a long rest."}
          </p>
        </div>
      </div>
      {onFinishRest && (
        <button
          type="button"
          onClick={onFinishRest}
          className="
            rounded border border-gold-500/40 bg-gold-500/10 px-2 py-1 text-xs font-semibold
            text-gold-300 hover:bg-gold-500/20 transition-colors
            focus:outline-none focus:ring-2 focus:ring-gold-500
          "
        >
          Finish rest
        </button>
      )}
    </div>
  );
}

// ─── DomainLoadout (main export) ──────────────────────────────────────────────

export function DomainLoadout({
  onRollQueued,
  restType = "none",
  onFinishRest,
}: {
  onRollQueued?: () => void;
  restType?: "short" | "long" | "none";
  onFinishRest?: () => void;
} = {}) {
  const { activeCharacter, flushPendingSave, optimisticMoveCard } =
    useCharacterStore();
  const viewerMode = useViewerMode();
  const [drillCard, setDrillCard] = useState<DomainCard | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(true);
  const [vaultOpen, setVaultOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  // Drag state
  const [activeDrag, setActiveDrag] = useState<ActiveDrag>(null);
  const [dragCard, setDragCard] = useState<DomainCard | null>(null);
  const [overTarget, setOverTarget] = useState<"loadout" | "vault" | null>(null);

  // Optimistic drop state — the card that just landed and where it went.
  const [optimistic, setOptimistic] = useState<{
    cardId: string;
    to: "loadout" | "vault";
  } | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor),
  );

  const actionMutation = useCharacterAction(activeCharacter?.characterId ?? "");
  const [actionError, setActionError] = useState<string | null>(null);

  const domainLoadout = activeCharacter?.domainLoadout ?? [];
  const domainVault = activeCharacter?.domainVault ?? [];
  const characterId = activeCharacter?.characterId ?? "";

  const isFull = domainLoadout.length >= 5;
  const loadoutNotFull = !isFull;
  const restActive = restType !== "none";

  // The vault shows only cards not currently in the loadout. Filtering here
  // keeps a cardId from being a draggable in both containers at once (which
  // caused dnd-kit to pick up both cards when the data was momentarily shared).
  const vaultOnlyIds = useMemo(
    () => domainVault.filter((id) => !domainLoadout.includes(id)),
    [domainVault, domainLoadout],
  );

  // Lock loadout order into tier (level ascending).
  const [cardLevels, setCardLevels] = useState<Record<string, number>>({});
  const registerLevel = useCallback((cardId: string, lvl: number) => {
    setCardLevels((prev) => (prev[cardId] === lvl ? prev : { ...prev, [cardId]: lvl }));
  }, []);
  const sortedLoadout = useMemo(() => {
    return [...domainLoadout].sort(
      (a, b) => (cardLevels[a] ?? 0) - (cardLevels[b] ?? 0),
    );
  }, [domainLoadout, cardLevels]);

  const handleMoveToVault = useCallback(
    async (cardId: string) => {
      if (viewerMode) return;
      // Flush any pending field edits first (does NOT include the card move),
      // then optimistically move the card so it lands immediately.
      await flushPendingSave();
      setOptimistic({ cardId, to: "vault" });
      setActionError(null);
      optimisticMoveCard(cardId, "vault");
      try {
        await actionMutation.mutateAsync({
          actionId: "move-loadout-to-vault",
          params: { cardId },
        });
        setOptimistic(null);
      } catch (err) {
        optimisticMoveCard(cardId, "loadout"); // roll back
        setActionError(
          err instanceof Error ? err.message : "Failed to move card to vault.",
        );
        setOptimistic(null);
      }
    },
    [viewerMode, flushPendingSave, optimisticMoveCard, actionMutation],
  );

  const handleAddToLoadout = useCallback(
    async (card: DomainCard) => {
      if (viewerMode) return;
      const cardId = `${card.domain}/${card.cardId}`;
      await flushPendingSave();
      setOptimistic({ cardId, to: "loadout" });
      setActionError(null);
      optimisticMoveCard(cardId, "loadout");
      try {
        await actionMutation.mutateAsync({
          actionId: "swap-loadout-card",
          params: {
            vaultCardId: cardId,
            restType,
            n: card.recallCost ?? card.level ?? 0,
            isCursed: card.isCursed ?? false,
            isLinkedCurse: card.isLinkedCurse ?? false,
          },
        });
        setOptimistic(null);
      } catch (err) {
        optimisticMoveCard(cardId, "vault"); // roll back
        setActionError(
          err instanceof Error ? err.message : "Failed to add card to loadout.",
        );
        setOptimistic(null);
      }
    },
    [viewerMode, restType, flushPendingSave, optimisticMoveCard, actionMutation],
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const data = event.active.data.current as DragData | undefined;
    if (!data) return;
    setActiveDrag({ container: data.container, cardId: data.cardId });
    setDragCard(data.card ?? null);
    setOverTarget(null);
    // Auto-expand the vault so a loadout→vault drag has a visible drop target.
    if (data.container === "loadout") {
      setVaultOpen(true);
    }
  }, []);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const overId = event.over?.id;
    if (overId === "vault") setOverTarget("vault");
    else if (overId === "loadout") setOverTarget("loadout");
    else setOverTarget(null);
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const data = event.active.data.current as DragData | undefined;
      const overId = event.over?.id;
      if (data?.container === "loadout" && overId === "vault") {
        handleMoveToVault(data.cardId);
      } else if (
        data?.container === "vault" &&
        overId === "loadout" &&
        data.card
      ) {
        handleAddToLoadout(data.card);
      }
      setActiveDrag(null);
      setDragCard(null);
      setOverTarget(null);
    },
    [handleMoveToVault, handleAddToLoadout],
  );

  const handleDragCancel = useCallback(() => {
    setActiveDrag(null);
    setDragCard(null);
    setOverTarget(null);
  }, []);

  const cardNameOf = useCallback((id: string) => {
    const parts = id.includes("/") ? id.split("/") : null;
    return parts?.[1] ?? id;
  }, []);

  if (!activeCharacter) return null;

  return (
    <>
      <DomainCardDetailSidebar
        card={drillCard}
        onClose={() => setDrillCard(null)}
        onRollQueued={onRollQueued}
        characterName={activeCharacter?.name}
      />

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
        accessibility={{
          screenReaderInstructions: {
            draggable:
              "To pick up this domain card, press Space or Enter. While dragging, use the arrow keys to move it between the loadout and vault. Press Space or Enter to drop, or Escape to cancel.",
          },
          announcements: {
            onDragStart: ({ active }) =>
              `Picked up ${cardNameOf(String(active.id))}.`,
            onDragOver: ({ active, over }) =>
              over
                ? `${cardNameOf(String(active.id))} is over ${over.id === "vault" ? "the vault" : "the loadout"}.`
                : `${cardNameOf(String(active.id))} is not over a drop area.`,
            onDragEnd: ({ active, over }) =>
              over
                ? `${cardNameOf(String(active.id))} was dropped in ${over.id === "vault" ? "the vault" : "the loadout"}.`
                : `${cardNameOf(String(active.id))} was returned to its original location.`,
            onDragCancel: ({ active }) =>
              `Move cancelled. ${cardNameOf(String(active.id))} returned to its original location.`,
          },
        }}
      >
        <div className="space-y-3">
          {/* Drawer header */}
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setDrawerOpen((o) => !o)}
              aria-expanded={drawerOpen}
              aria-controls="domain-cards-drawer"
              className="flex items-center gap-2 group"
            >
              <i
                className={`fa-solid fa-chevron-right w-3.5 h-3.5 shrink-0 text-center text-[0.6rem] leading-[0.875rem] text-steel-accessible transition-transform duration-150 ${
                  drawerOpen ? "rotate-90" : ""
                }`}
                aria-hidden="true"
              />
              <h3 className="text-xs font-semibold uppercase tracking-wider text-parchment-400 group-hover:text-parchment-200 transition-colors">
                Domain Cards{" "}
                <span className="text-parchment-600">
                  ({domainLoadout.length}/5 · {vaultOnlyIds.length} in vault)
                </span>
              </h3>
            </button>
            {!viewerMode && (
              <button
                type="button"
                onClick={() => setModalOpen(true)}
                data-field-key="loadout.add"
                className="
                  rounded-lg border border-gold-800/60 bg-gold-950/20 px-3 py-1.5
                  text-xs font-semibold text-gold-300
                  hover:bg-gold-900/30 hover:border-gold-700
                  focus:outline-none focus:ring-2 focus:ring-gold-500
                  transition-colors
                "
              >
                ＋ Add a domain card
              </button>
            )}
          </div>

          {drawerOpen && (
            <div id="domain-cards-drawer" className="space-y-4">
              {/* Rest-mode banner (reflects the active rest; replaces the
                  "space available" hint while resting) */}
              {restActive && (
                <RestModeBanner
                  restType={restType}
                  onFinishRest={onFinishRest}
                />
              )}

              {/* Warning help (not full) above loadout — suppressed while resting */}
              {loadoutNotFull && !restActive && <RoomAvailableHelp />}

              {/* Loadout zone (droppable) */}
              <LoadoutDropZone
                isOver={overTarget === "loadout"}
                dimmed={activeDrag?.container === "vault"}
                restActive={restActive}
              >
                {sortedLoadout.length === 0 ? (
                  <p className="text-sm text-parchment-500">
                    No cards in loadout.
                  </p>
                ) : (
                  <div role="list" className="space-y-2">
                    {sortedLoadout.map((cardId, index) => (
                      <div key={`${cardId}-${index}`} data-field-key={`loadout.card.${index}`}>
                        <LoadoutCard
                          cardId={cardId}
                          characterId={characterId}
                          isLanding={
                            optimistic?.cardId === cardId &&
                            optimistic.to === "loadout"
                          }
                          isSaving={
                            optimistic?.cardId === cardId &&
                            optimistic.to === "loadout" &&
                            actionMutation.isPending
                          }
                          onDrill={setDrillCard}
                          onMoveToVault={handleMoveToVault}
                          onRegisterLevel={registerLevel}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </LoadoutDropZone>

              {/* Vault section (collapsible + droppable) */}
              <section>
                <button
                  type="button"
                  onClick={() => setVaultOpen((o) => !o)}
                  aria-expanded={vaultOpen}
                  aria-controls="domain-vault-panel"
                  className="flex items-center gap-2 group w-full text-left"
                >
                  <i
                    className={`fa-solid fa-chevron-right w-3.5 h-3.5 shrink-0 text-center text-[0.6rem] leading-[0.875rem] text-steel-accessible transition-transform duration-150 ${
                      vaultOpen ? "rotate-90" : ""
                    }`}
                    aria-hidden="true"
                  />
                  <span className="text-xs uppercase tracking-widest text-[#b9baa3] font-medium group-hover:text-[#f7f7ff] transition-colors">
                    Vault
                  </span>
                  <span className="text-xs text-parchment-600">
                    {vaultOnlyIds.length} card{vaultOnlyIds.length !== 1 ? "s" : ""}
                  </span>
                </button>

                {vaultOpen && (
                  <div id="domain-vault-panel" className="mt-2 space-y-2">
                    {/* Legend — once per vault, not per card */}
                    <p className="text-xs text-parchment-600">
                      <span aria-hidden="true" className="text-gold-400">⚡</span>{" "}
                      = Stress cost to add to loadout
                    </p>

                    {/* Info help (full) above vault */}
                    {isFull && <FullLoadoutHelp />}

                    <VaultDropZone
                      isOver={overTarget === "vault"}
                      dimmed={activeDrag?.container === "loadout"}
                    >
                      {vaultOnlyIds.length === 0 ? (
                        <p className="text-sm text-parchment-500">
                          Vault is empty.
                        </p>
                      ) : (
                        <div role="list" className="grid gap-2 sm:grid-cols-2">
                          {vaultOnlyIds.map((cardId) => (
                            <VaultCard
                              key={cardId}
                              cardId={cardId}
                              disabled={isFull}
                              restType={restType}
                              isLanding={
                                optimistic?.cardId === cardId &&
                                optimistic.to === "vault"
                              }
                              isSaving={
                                optimistic?.cardId === cardId &&
                                optimistic.to === "vault" &&
                                actionMutation.isPending
                              }
                              onAddToLoadout={handleAddToLoadout}
                            />
                          ))}
                        </div>
                      )}
                    </VaultDropZone>
                  </div>
                )}
              </section>
            </div>
          )}

          <InlineActionError message={actionError} />
        </div>

        <DragOverlay>
          {dragCard ? (
            <div className="rounded-lg border border-gold-500 bg-slate-800 shadow-card-fantasy-hover p-3 w-64 cursor-grabbing">
              <div className="text-sm font-semibold text-parchment-100 truncate">
                {dragCard.name}
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-parchment-500 uppercase">
                  {dragCard.domain}
                </span>
                <span className="rounded-full border border-gold-800 px-1.5 text-xs font-bold text-gold-500">
                  Lv {dragCard.level}
                </span>
              </div>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {modalOpen && (
        <AddCardModal
          characterId={characterId}
          loadoutIds={domainLoadout}
          vaultIds={domainVault}
          onClose={() => setModalOpen(false)}
        />
      )}
    </>
  );
}

// ─── Drop zone wrappers ───────────────────────────────────────────────────────

function LoadoutDropZone({
  children,
  isOver,
  dimmed,
  restActive = false,
}: {
  children: React.ReactNode;
  isOver: boolean;
  dimmed: boolean;
  restActive?: boolean;
}) {
  const { setNodeRef } = useDroppable({ id: "loadout" });
  return (
    <section
      ref={setNodeRef}
      aria-label="Active loadout"
      className={[
        "rounded-lg transition-all duration-150",
        isOver
          ? "border-2 border-dashed border-gold-400/80 bg-gold-500/10"
          : restActive
            ? "border-2 border-dashed border-gold-500/25"
            : "border-2 border-dashed border-transparent",
        dimmed ? "opacity-40 pointer-events-none saturate-[0.85]" : "",
      ].join(" ")}
    >
      {restActive && !isOver && (
        <p className="px-1 pb-1 text-[0.65rem] font-semibold uppercase tracking-wider text-gold-400">
          Free swaps
        </p>
      )}
      {children}
    </section>
  );
}

function VaultDropZone({
  children,
  isOver,
  dimmed,
}: {
  children: React.ReactNode;
  isOver: boolean;
  dimmed: boolean;
}) {
  const { setNodeRef } = useDroppable({ id: "vault" });
  return (
    <div
      ref={setNodeRef}
      aria-label="Domain vault"
      className={[
        "rounded-lg p-2 transition-all duration-150",
        isOver
          ? "border-2 border-dashed border-gold-400/80 bg-gold-500/10"
          : "border-2 border-dashed border-transparent",
        dimmed ? "opacity-40 pointer-events-none saturate-[0.85]" : "",
      ].join(" ")}
    >
      {children}
    </div>
  );
}
