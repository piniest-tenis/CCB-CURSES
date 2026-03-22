"use client";

/**
 * src/components/character/DomainLoadout.tsx
 *
 * Renders the active domain card loadout (max 5 slots).
 * Cards can be removed, reordered via index-swap drag, and added from the vault.
 *
 * New features:
 *
 * Token tracking — shown when card.isCursed OR character.cardTokens[cardId] !== undefined.
 *   − button → spend-token   { cardId }
 *   × button → clear-tokens  { cardId }
 *   + button → add-token     { cardId }
 *
 * Aura toggle — shown when card.description contains "aura" (case-insensitive).
 *   Toggle calls toggle-aura { cardId }.
 *   Active auras display a glowing ring and a reminder message.
 */

import React, { useState, useRef } from "react";
import type { DomainCard } from "@shared/types";
import { useCharacterStore } from "@/store/characterStore";
import { useDomainCard, useClass, useDomain } from "@/hooks/useGameData";
import { useActionButton, InlineActionError } from "./ActionButton";
import { MarkdownContent } from "@/components/MarkdownContent";
import { CollapsibleSRDDescription } from "@/components/character/CollapsibleSRDDescription";

// ─── Helper: parseCardId ──────────────────────────────────────────────────────

function parseCardId(cardId: string): { domain: string | undefined; id: string } {
  const parts = cardId.includes("/") ? cardId.split("/") : null;
  return { domain: parts?.[0], id: parts?.[1] ?? cardId };
}

// ─── AcquireCardPicker ────────────────────────────────────────────────────────
// Shows eligible unacquired domain cards the character can acquire.
// Filters by:
//   - Character's two class domains
//   - Card level ≤ character level
//   - Cards not already in loadout or vault
//
// SRD p. 22-23: "Acquire a new domain card at your level or lower from one of your class's domains"

interface AcquireCardPickerProps {
  classId:           string | undefined;
  characterLevel:    number;
  characterId:       string;
  acquiredCardIds:   Set<string>;
  loadoutIds:        string[];
  onCardAcquired:    () => void;
  onClose:           () => void;
}

function AcquireCardPicker({
  classId,
  characterLevel,
  characterId,
  acquiredCardIds,
  loadoutIds,
  onCardAcquired,
  onClose,
}: AcquireCardPickerProps) {
  const { data: classData } = useClass(classId);
  const [selectedCard, setSelectedCard] = React.useState<{ domain: string; id: string } | null>(null);
  const [isPending, setIsPending] = React.useState(false);
  const [actionError, setActionError] = React.useState<string | null>(null);

  const { fire } = useActionButton(characterId);

  // Get eligible domains from the class
  const domains = React.useMemo(() => {
    if (!classData) return [];
    return classData.domains ?? [];
  }, [classData]);

  // Fetch cards for each domain
  const domainCardsResults = domains.map((d) =>
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useDomain(d, characterLevel)
  );

  // Collect all eligible, unacquired cards
  const eligibleCards = React.useMemo(() => {
    const cards: (DomainCard & { domain: string })[] = [];
    domains.forEach((domain, idx) => {
      const result = domainCardsResults[idx];
      if (result.data?.cards) {
        result.data.cards
          .filter((card) => {
            const cardId = `${domain}/${card.cardId}`;
            return !acquiredCardIds.has(cardId) && card.level <= characterLevel;
          })
          .forEach((card) => {
            cards.push({ ...card, domain });
          });
      }
    });
    return cards.sort((a, b) => a.level - b.level || a.domain.localeCompare(b.domain) || a.name.localeCompare(b.name));
  }, [domains, domainCardsResults, acquiredCardIds, characterLevel]);

  const handleAcquire = async () => {
    if (!selectedCard) return;
    setActionError(null);
    setIsPending(true);
    try {
      const cardId = `${selectedCard.domain}/${selectedCard.id}`;
      await fire("acquire-domain-card", { cardId });
      onCardAcquired();
      setSelectedCard(null);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to acquire card.");
    } finally {
      setIsPending(false);
    }
  };

  const isLoading = domainCardsResults.some((r) => r.isLoading);

  return (
    <div className="rounded-xl border border-burgundy-800 bg-slate-900/50 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-parchment-200">Acquire a card</h4>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close acquire card picker"
          className="text-parchment-500 hover:text-parchment-200 focus:outline-none"
        >
          ✕
        </button>
      </div>

      <p className="text-xs text-parchment-600">
        Level {characterLevel} or below from your domains
        {domains.length > 0 && ` (${domains.join(", ")})`}
      </p>

      {isLoading ? (
        <p className="text-xs text-parchment-500 italic">Loading available cards…</p>
      ) : eligibleCards.length === 0 ? (
        <p className="text-xs text-parchment-600 italic">
          No new cards available. Level up to unlock more!
        </p>
      ) : (
        <ul className="space-y-1 max-h-48 overflow-y-auto" role="listbox" aria-label="Available domain cards">
          {eligibleCards.map((card) => {
            const cardId = `${card.domain}/${card.cardId}`;
            const isSelected = selectedCard?.id === card.cardId && selectedCard?.domain === card.domain;
            return (
              <li key={cardId}>
                <button
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() =>
                    setSelectedCard(
                      isSelected ? null : { domain: card.domain, id: card.cardId }
                    )
                  }
                  className={[
                    "w-full text-left rounded-lg px-3 py-2 text-sm transition-colors",
                    "focus:outline-none focus:ring-2 focus:ring-gold-500",
                    isSelected
                      ? "bg-burgundy-800 text-parchment-100 border border-burgundy-600"
                      : "border border-burgundy-900/40 text-parchment-300 hover:bg-slate-800/50 hover:border-burgundy-700",
                  ].join(" ")}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">{card.name}</span>
                    <span className="flex items-center gap-1.5 flex-shrink-0">
                      <span className="text-[10px] text-parchment-600 uppercase">{card.domain}</span>
                      <span className="text-[10px] font-bold text-gold-600">Lv{card.level}</span>
                    </span>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {actionError && (
        <p role="alert" className="text-xs text-[#fe5f55]">
          {actionError}
        </p>
      )}

      {selectedCard && (
        <button
          type="button"
          onClick={handleAcquire}
          disabled={isPending}
          aria-busy={isPending}
          className="
            w-full rounded-lg border border-gold-800/60 bg-gold-950/20 px-3 py-2
            text-sm font-semibold text-gold-300
            hover:bg-gold-900/30 hover:border-gold-700
            disabled:opacity-40 disabled:cursor-not-allowed
            focus:outline-none focus:ring-2 focus:ring-gold-500
            transition-colors
          "
        >
          {isPending ? (
            <span aria-hidden="true" className="inline-block h-3 w-3 animate-spin rounded-full border border-current border-t-transparent" />
          ) : (
            `Acquire card`
          )}
        </button>
      )}
    </div>
  );
}

function cardHasTokens(card: DomainCard | undefined, cardTokens: Record<string, number>, cardId: string): boolean {
  if (!card) return false;
  return card.isCursed || cardId in cardTokens;
}

function cardHasAura(card: DomainCard | undefined): boolean {
  if (!card) return false;
  return /aura/i.test(card.description);
}

// ─── TokenTracker ─────────────────────────────────────────────────────────────

interface TokenTrackerProps {
  cardId:      string;
  /** Human-readable card name for aria-labels (falls back to cardId). */
  cardName:    string;
  characterId: string;
  count:       number;
}

function TokenTracker({ cardId, cardName, characterId, count }: TokenTrackerProps) {
  const spendAction = useActionButton(characterId);
  const addAction   = useActionButton(characterId);
  const clearAction = useActionButton(characterId);

  const isPending = spendAction.isPending || addAction.isPending || clearAction.isPending;
  const inlineError =
    spendAction.inlineError ?? addAction.inlineError ?? clearAction.inlineError;
  const errorId   = React.useId();
  const spinnerId = React.useId();

  return (
    <div className="mt-2 flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <span className="text-[10px] uppercase tracking-wider text-parchment-600">
          Tokens
        </span>
        <div
          role="spinbutton"
          aria-valuenow={count}
          aria-valuemin={0}
          aria-valuemax={99}
          aria-label={`Token count for ${cardName}`}
          aria-describedby={inlineError ? errorId : undefined}
          className="flex items-center gap-1"
        >
          {/* − Remove token */}
          <button
            type="button"
            onClick={() => spendAction.fire("spend-token", { cardId })}
            disabled={isPending}
            aria-label={`Remove token from ${cardName}`}
            className="
              h-6 w-6 rounded border border-burgundy-800 bg-slate-900
              text-xs text-parchment-500 hover:bg-burgundy-900/30
              disabled:opacity-50 disabled:cursor-wait
              transition-colors flex items-center justify-center
              focus:outline-none focus:ring-1 focus:ring-gold-500
            "
          >
            −
          </button>

          {/* Count display */}
          <span
            id={spinnerId}
            className="min-w-[1.75rem] text-center text-sm font-bold text-parchment-200 tabular-nums"
          >
            {count}
          </span>

          {/* + Add token */}
          <button
            type="button"
            onClick={() => addAction.fire("add-token", { cardId })}
            disabled={isPending}
            aria-label={`Add token to ${cardName}`}
            className="
              h-6 w-6 rounded border border-gold-800 bg-slate-900
              text-xs text-gold-600 hover:bg-gold-900/20
              disabled:opacity-50 disabled:cursor-wait
              transition-colors flex items-center justify-center
              focus:outline-none focus:ring-1 focus:ring-gold-500
            "
          >
            +
          </button>

          {/* × Clear all tokens */}
          <button
            type="button"
            onClick={() => clearAction.fire("clear-tokens", { cardId })}
            disabled={isPending}
            aria-label={`Clear all tokens from ${cardName}`}
            className="
              h-6 w-6 rounded border border-slate-700 bg-slate-900
              text-[10px] text-parchment-600 hover:bg-slate-800 hover:text-parchment-300
              disabled:opacity-50 disabled:cursor-wait
              transition-colors flex items-center justify-center
              focus:outline-none focus:ring-1 focus:ring-gold-500
            "
          >
            ×
          </button>
        </div>
      </div>

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
}

function AuraToggle({ cardId, cardName, characterId, isActive }: AuraToggleProps) {
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
          border transition-all duration-150
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
        <p className="text-[11px] text-[#6a8fb5] leading-snug" role="status">
          Aura active — when hit, make a Spellcast Roll to maintain.
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
}

function DomainCardDetailSidebar({ card, onClose }: DomainCardDetailSidebarProps) {
  const open = card !== null;
  const panelRef = React.useRef<HTMLDivElement>(null);
  const headingId = React.useId();

  // Focus first focusable element when opened
  React.useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => {
      const first = panelRef.current?.querySelector<HTMLElement>(
        'button, [tabindex]:not([tabindex="-1"])'
      );
      first?.focus();
    }, 50);
    return () => clearTimeout(t);
  }, [open]);

  // Escape to close
  React.useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.stopPropagation(); onClose(); }
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
          "fixed inset-y-0 right-0 z-50 flex h-full w-full max-w-[28rem] flex-col",
          "border-l border-[#577399]/35 bg-[#0f1713] shadow-2xl",
          "transition-transform duration-300 ease-in-out",
          open ? "translate-x-0" : "translate-x-full",
        ].join(" ")}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#577399]/25 px-5 py-4 shrink-0">
          <div>
            {card && (
              <p className="text-[11px] uppercase tracking-[0.24em] text-parchment-500">
                {card.domain} · Level {card.level}
              </p>
            )}
            <h2 id={headingId} className="font-serif text-lg font-semibold text-[#f7f7ff]">
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

        {/* Body */}
        {card && (
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
            {/* Badges */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-gold-800 px-2 py-0.5 text-[11px] font-bold text-gold-500">
                Lv {card.level}
              </span>
              <span className="rounded-full border border-slate-700 px-2 py-0.5 text-[11px] text-parchment-500 uppercase tracking-wider">
                Recall Cost {card.level}⚡
              </span>
              {card.isGrimoire && (
                <span className="rounded bg-gold-900/50 px-1.5 py-0.5 text-[11px] font-semibold text-gold-400">
                  Grimoire
                </span>
              )}
              {card.isCursed && (
                <span className="rounded bg-burgundy-900/50 px-1.5 py-0.5 text-[11px] font-semibold text-burgundy-400">
                  ★ Cursed
                </span>
              )}
              {card.isLinkedCurse && (
                <span className="rounded bg-burgundy-900/50 px-1.5 py-0.5 text-[11px] font-semibold text-burgundy-400">
                  ↔ Linked Curse
                </span>
              )}
            </div>

            {/* Card text */}
            <div className="rounded-lg border border-slate-700/60 bg-slate-900/40 px-4 py-3">
              {card.isGrimoire && card.grimoire.length > 0 ? (
                <div className="space-y-3">
                  {card.grimoire.map((ability, i) => (
                    <div key={i}>
                      <p className="text-sm font-semibold text-[#f7f7ff] mb-1">{ability.name}</p>
                      <MarkdownContent className="text-sm text-[#b9baa3]/75">
                        {ability.description}
                      </MarkdownContent>
                    </div>
                  ))}
                </div>
              ) : (
                <MarkdownContent className="text-sm text-[#b9baa3]/75">
                  {card.description}
                </MarkdownContent>
              )}
            </div>

            {/* Curse text */}
            {card.isCursed && card.curseText && (
              <div className="rounded-lg border border-[#fe5f55]/30 bg-[#fe5f55]/5 px-4 py-3">
                <p className="text-xs uppercase tracking-wider text-[#fe5f55]/60 mb-1">Curse</p>
                <MarkdownContent className="text-sm text-[#b9baa3]/70">
                  {card.curseText}
                </MarkdownContent>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}

// ─── LoadoutCardSlot ──────────────────────────────────────────────────────────

interface LoadoutCardSlotProps {
  cardId:      string;
  index:       number;
  total:       number;
  characterId: string;
  onRemove:    () => void;
  onMoveUp:    () => void;
  onMoveDown:  () => void;
  onDrill:     (card: DomainCard) => void;
  isDragging:  boolean;
  onDragStart: () => void;
  onDragEnter: () => void;
  onDragEnd:   () => void;
}

function LoadoutCardSlot({
  cardId,
  index,
  total,
  characterId,
  onRemove,
  onMoveUp,
  onMoveDown,
  onDrill,
  isDragging,
  onDragStart,
  onDragEnter,
  onDragEnd,
}: LoadoutCardSlotProps) {
  const { activeCharacter } = useCharacterStore();
  const { domain, id } = parseCardId(cardId);
  const { data: card } = useDomainCard(domain, id);

  const cardTokens     = activeCharacter?.cardTokens ?? {};
  const activeAuras    = activeCharacter?.activeAuras ?? [];
  const tokenCount     = cardTokens[cardId] ?? 0;
  const showTokens     = cardHasTokens(card, cardTokens, cardId);
  const showAura       = cardHasAura(card);
  const isAuraActive   = activeAuras.includes(cardId);

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnter={onDragEnter}
      onDragEnd={onDragEnd}
      role="listitem"
      aria-label={card ? `${card.name}, domain card` : cardId}
      className={`
        relative rounded-lg border p-3 cursor-grab active:cursor-grabbing
        transition-all duration-150
        ${
          isDragging
            ? "opacity-40 border-gold-500 bg-slate-800"
            : isAuraActive
            ? "border-[#577399]/60 bg-slate-850 shadow-[0_0_10px_rgba(87,115,153,0.25)]"
            : "border-burgundy-800 bg-slate-850 hover:border-burgundy-600"
        }
        shadow-card-fantasy
      `}
    >
      {/* Top row: drag handle + card info + reorder + remove */}
      <div className="flex items-center gap-3">
        {/* Drag handle */}
        <div className="flex flex-col gap-0.5 text-parchment-600 select-none shrink-0">
          <span className="block w-4 border-t border-current" />
          <span className="block w-4 border-t border-current" />
          <span className="block w-4 border-t border-current" />
        </div>

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
                <span className="text-sm font-semibold text-parchment-200 truncate group-hover:text-parchment-100 transition-colors">
                  {card.name}
                </span>
                {card.isCursed && (
                  <span title="Cursed" className="text-xs text-burgundy-400 font-bold">
                    ★
                  </span>
                )}
                {card.isLinkedCurse && (
                  <span title="Linked Curse — long rest only, 6 stress to swap" className="text-xs text-burgundy-400 font-bold">
                    ↔
                  </span>
                )}
                {card.isGrimoire && (
                  <span className="rounded bg-gold-900/50 px-1 text-[10px] font-semibold text-gold-400">
                    Grimoire
                  </span>
                )}
                <span className="ml-auto text-parchment-600 text-xs opacity-0 group-hover:opacity-100 transition-opacity">›</span>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[10px] text-parchment-500 uppercase tracking-wider">
                  {card.domain}
                </span>
                <span className="rounded-full border border-gold-800 px-1.5 text-[10px] font-bold text-gold-500">
                  Lv {card.level}
                </span>
              </div>
            </button>
          ) : (
            <span className="text-sm text-parchment-600 italic">Loading…</span>
          )}
        </div>

        {/* Reorder buttons */}
        <div className="flex flex-col gap-0.5 shrink-0">
          <button
            onClick={onMoveUp}
            disabled={index === 0}
            className="
              text-parchment-600 hover:text-gold-400 disabled:opacity-20
              transition-colors text-xs px-1 py-1
              focus:outline-none focus:ring-1 focus:ring-gold-500 rounded
            "
            aria-label={`Move ${card?.name ?? cardId} up`}
          >
            ▲
          </button>
          <button
            onClick={onMoveDown}
            disabled={index === total - 1}
            className="
              text-parchment-600 hover:text-gold-400 disabled:opacity-20
              transition-colors text-xs px-1 py-1
              focus:outline-none focus:ring-1 focus:ring-gold-500 rounded
            "
            aria-label={`Move ${card?.name ?? cardId} down`}
          >
            ▼
          </button>
        </div>

        {/* Remove button */}
        <button
          onClick={onRemove}
          className="
            shrink-0 rounded p-2 text-burgundy-500 hover:bg-burgundy-900/40 hover:text-burgundy-300
            transition-colors focus:outline-none focus:ring-2 focus:ring-burgundy-500
          "
          aria-label={`Remove ${card?.name ?? cardId} from loadout`}
        >
          ✕
        </button>
      </div>

      {/* Token tracker (shown for cursed cards or cards that already have tokens) */}
      {showTokens && (
        <TokenTracker
          cardId={cardId}
          cardName={card?.name ?? cardId}
          characterId={characterId}
          count={tokenCount}
        />
      )}

      {/* Aura toggle (shown when description mentions "aura") */}
      {showAura && card && (
        <AuraToggle
          cardId={cardId}
          cardName={card.name}
          characterId={characterId}
          isActive={isAuraActive}
        />
      )}
    </div>
  );
}

// ─── VaultPicker ─────────────────────────────────────────────────────────────

/**
 * The vault picker now:
 *   1) Filters cards by level (card.level <= character.level)
 *   2) Shows Recall Cost and Linked Curse indicators
 *   3) When loadout is full, requires picking a card to displace
 *   4) Uses the swap-loadout-card server action (with stress cost)
 */

interface VaultPickerProps {
  vaultIds:      string[];
  loadoutIds:    string[];
  characterId:   string;
  characterLevel: number;
  onClose:       () => void;
}

function VaultPicker({ vaultIds, loadoutIds, characterId, characterLevel, onClose }: VaultPickerProps) {
  const available = vaultIds.filter((id) => !loadoutIds.includes(id));
  const isFull    = loadoutIds.length >= 5;
  const [selectedVaultCard,   setSelectedVaultCard]   = React.useState<string | null>(null);
  const [selectedLoadoutCard, setSelectedLoadoutCard] = React.useState<string | null>(null);
  const swapAction = useActionButton(characterId);

  const handleSwap = () => {
    if (!selectedVaultCard) return;
    if (isFull && !selectedLoadoutCard) return;

    swapAction.fire("swap-loadout-card", {
      vaultCardId:   selectedVaultCard,
      loadoutCardId: isFull ? selectedLoadoutCard : undefined,
      // During normal play (not rest), Recall Cost applies. The card's recallCost
      // is passed via n so the backend knows how much stress to charge.
      // For now, we pass restType: "none" — the DowntimeModal will use "short"/"long".
      restType: "none",
      n: 0, // Placeholder: actual recallCost would be looked up from card data
    });

    setSelectedVaultCard(null);
    setSelectedLoadoutCard(null);
    onClose();
  };

  return (
    <div className="rounded-lg border border-gold-800 bg-slate-900 shadow-card-fantasy-hover p-4 space-y-3">
      <div className="flex items-center justify-between mb-1">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-gold-600">
          Domain Vault
        </h4>
        <button
          onClick={onClose}
          aria-label="Close domain vault picker"
          className="text-parchment-600 hover:text-parchment-300 text-xs focus:outline-none focus:ring-1 focus:ring-gold-500 rounded px-1"
        >
          Close
        </button>
      </div>

      {/* Vault card selection */}
      {available.length === 0 ? (
        <p className="text-xs text-parchment-600 italic">
          No more cards in vault (all are already in loadout or vault is empty).
        </p>
      ) : (
        <>
          <p className="text-[11px] text-parchment-500">
            Select a card to add to your loadout{isFull ? ". Your loadout is full — you must also choose a card to displace." : "."}
          </p>
          <ul className="space-y-1 max-h-48 overflow-y-auto pr-1" role="listbox" aria-label="Vault cards">
            {available.map((cardId) => (
              <VaultPickerItem
                key={cardId}
                cardId={cardId}
                characterLevel={characterLevel}
                isSelected={selectedVaultCard === cardId}
                onSelect={() => setSelectedVaultCard(cardId === selectedVaultCard ? null : cardId)}
              />
            ))}
          </ul>
        </>
      )}

      {/* Loadout displacement selection (only when loadout is full) */}
      {isFull && selectedVaultCard && (
        <div className="border-t border-burgundy-900/40 pt-3">
          <p className="text-[11px] text-parchment-500 mb-2">
            Choose a card to move from loadout to vault:
          </p>
          <ul className="space-y-1 max-h-36 overflow-y-auto pr-1" role="listbox" aria-label="Loadout cards to displace">
            {loadoutIds.map((cardId) => (
              <DisplacePickerItem
                key={cardId}
                cardId={cardId}
                isSelected={selectedLoadoutCard === cardId}
                onSelect={() => setSelectedLoadoutCard(cardId === selectedLoadoutCard ? null : cardId)}
              />
            ))}
          </ul>
        </div>
      )}

      {/* Swap button */}
      {selectedVaultCard && (!isFull || selectedLoadoutCard) && (
        <button
          type="button"
          onClick={handleSwap}
          disabled={swapAction.isPending}
          className="
            w-full rounded px-3 py-2 text-sm font-semibold
            bg-gold-800/80 text-parchment-100 border border-gold-600
            hover:bg-gold-700 transition-colors
            disabled:opacity-50 disabled:cursor-wait
            focus:outline-none focus:ring-2 focus:ring-gold-500
          "
        >
          {swapAction.isPending ? "Swapping..." : "Swap Card"}
        </button>
      )}

      <InlineActionError message={swapAction.inlineError} />
    </div>
  );
}

function VaultPickerItem({
  cardId,
  characterLevel,
  isSelected,
  onSelect,
}: {
  cardId: string;
  characterLevel: number;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const { domain, id } = parseCardId(cardId);
  const { data: card } = useDomainCard(domain, id);

  // Level filter: dim cards above character level (SRD p.5)
  const aboveLevel = card ? card.level > characterLevel : false;

  return (
    <li>
      <button
        onClick={onSelect}
        disabled={aboveLevel}
        role="option"
        aria-selected={isSelected}
        aria-label={
          card
            ? `${card.name} (${card.domain}, Level ${card.level})${card.isLinkedCurse ? " — Linked Curse" : ""}${aboveLevel ? " — above your level" : ""}`
            : cardId
        }
        className={`
          w-full flex items-center gap-2 rounded px-2 py-1.5
          text-left transition-colors
          focus:outline-none focus:ring-1 focus:ring-gold-500
          ${aboveLevel
            ? "opacity-40 cursor-not-allowed"
            : isSelected
            ? "bg-gold-900/40 border border-gold-600"
            : "hover:bg-burgundy-900/40"
          }
        `}
      >
        <span className="flex-1 text-sm text-parchment-300 truncate">
          {card?.name ?? cardId}
        </span>
        {card && (
          <>
            {card.isLinkedCurse && (
              <span title="Linked Curse — long rest only, 6 stress" className="text-[10px] text-burgundy-400 font-bold">
                ↔
              </span>
            )}
            {card.isCursed && (
              <span title="Cursed" className="text-[10px] text-burgundy-400 font-bold">
                ★
              </span>
            )}
            <span className="text-[10px] text-parchment-600 uppercase">{card.domain}</span>
            <span className={`text-[10px] font-bold ${aboveLevel ? "text-burgundy-500" : "text-gold-600"}`}>
              Lv{card.level}
            </span>
          </>
        )}
      </button>
    </li>
  );
}

function DisplacePickerItem({
  cardId,
  isSelected,
  onSelect,
}: {
  cardId: string;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const { domain, id } = parseCardId(cardId);
  const { data: card } = useDomainCard(domain, id);

  return (
    <li>
      <button
        onClick={onSelect}
        role="option"
        aria-selected={isSelected}
        aria-label={
          card
            ? `Displace ${card.name} (${card.domain}, Level ${card.level})`
            : `Displace ${cardId}`
        }
        className={`
          w-full flex items-center gap-2 rounded px-2 py-1.5
          text-left transition-colors
          focus:outline-none focus:ring-1 focus:ring-gold-500
          ${isSelected
            ? "bg-burgundy-900/50 border border-burgundy-600"
            : "hover:bg-burgundy-900/30"
          }
        `}
      >
        <span className="flex-1 text-sm text-parchment-300 truncate">
          {card?.name ?? cardId}
        </span>
        {card && (
          <>
            <span className="text-[10px] text-parchment-600 uppercase">{card.domain}</span>
            <span className="text-[10px] font-bold text-gold-600">Lv{card.level}</span>
          </>
        )}
      </button>
    </li>
  );
}

// ─── DomainLoadout (main export) ──────────────────────────────────────────────

export function DomainLoadout() {
  const { activeCharacter, removeFromLoadout, reorderLoadout } =
    useCharacterStore();
  const [showPicker, setShowPicker] = useState(false);
  const [pickerMode, setPickerMode] = useState<"swap" | "acquire">("swap");
  const [drillCard, setDrillCard] = useState<DomainCard | null>(null);

  // Drag state
  const dragIndex = useRef<number | null>(null);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);

  if (!activeCharacter) return null;

  const { domainLoadout, domainVault, characterId, classId, level } = activeCharacter;

  const handleDragStart = (index: number) => {
    dragIndex.current = index;
    setDraggingIndex(index);
  };

  const handleDragEnter = (index: number) => {
    if (dragIndex.current === null || dragIndex.current === index) return;
    reorderLoadout(dragIndex.current, index);
    dragIndex.current = index;
    setDraggingIndex(index);
  };

  const handleDragEnd = () => {
    dragIndex.current = null;
    setDraggingIndex(null);
  };

  // Determine which mode to show and what button text to use
  const canSwap = domainVault.length > 0;
  const canAcquire = classId !== undefined; // Need class to determine eligible domains
  const isFull = domainLoadout.length >= 5;

  const handleTogglePicker = () => {
    if (showPicker) {
      setShowPicker(false);
    } else {
      // If vault is empty but can acquire, start with acquire mode
      // If vault has cards, start with swap mode
      setPickerMode(canSwap ? "swap" : "acquire");
      setShowPicker(true);
    }
  };

  const handleModeSwitch = (newMode: "swap" | "acquire") => {
    setPickerMode(newMode);
  };

  // Collected acquired card IDs (loadout + vault)
  const acquiredCardIds = new Set(domainLoadout.concat(domainVault));

  return (
    <>
    <DomainCardDetailSidebar card={drillCard} onClose={() => setDrillCard(null)} />
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-parchment-400">
          Active Loadout{" "}
          <span className="text-parchment-600">({domainLoadout.length}/5)</span>
        </h3>
        <button
          type="button"
          onClick={handleTogglePicker}
          aria-expanded={showPicker}
          aria-controls="domain-card-picker"
          className="
            rounded px-2 py-0.5 text-xs font-semibold
            bg-burgundy-800/60 text-parchment-300 border border-burgundy-700
            hover:bg-burgundy-700 transition-colors
            focus:outline-none focus:ring-2 focus:ring-gold-500
          "
        >
          {showPicker
            ? "Hide"
            : isFull && canSwap
            ? "Swap Card"
            : domainLoadout.length > 0
            ? "Change Loadout"
            : "Add Card"}
        </button>
      </div>

      {/* Loadout slots */}
      {domainLoadout.length === 0 ? (
        <p className="text-xs text-parchment-600 italic">
          No cards in loadout.
        </p>
      ) : (
        <div role="list" className="space-y-2">
          {domainLoadout.map((cardId, index) => (
            <LoadoutCardSlot
              key={`${cardId}-${index}`}
              cardId={cardId}
              index={index}
              total={domainLoadout.length}
              characterId={characterId}
              onRemove={() => removeFromLoadout(cardId)}
              onMoveUp={() => index > 0 && reorderLoadout(index, index - 1)}
              onMoveDown={() =>
                index < domainLoadout.length - 1 &&
                reorderLoadout(index, index + 1)
              }
              onDrill={setDrillCard}
              isDragging={draggingIndex === index}
              onDragStart={() => handleDragStart(index)}
              onDragEnter={() => handleDragEnter(index)}
              onDragEnd={handleDragEnd}
            />
          ))}
        </div>
      )}

      {/* Empty slots visual */}
      {domainLoadout.length < 5 && (
        <div className="flex gap-1.5">
          {Array.from({ length: 5 - domainLoadout.length }, (_, i) => (
            <div
              key={i}
              className="h-8 flex-1 rounded border border-dashed border-burgundy-900/60 bg-slate-900/30"
            />
          ))}
        </div>
      )}

      {/* Card picker — toggles between Swap and Acquire modes */}
      {showPicker && (
        <div id="domain-card-picker">
          {/* SRD explanation */}
          <CollapsibleSRDDescription
            title="Vault & Loadout"
            content={
              "Your **Vault** holds every domain card you have unlocked. Your **Loadout** is the subset of up to 5 cards you can use during play. " +
              "During a **rest**, you may freely swap cards between your vault and loadout at no cost. " +
              "Outside of a rest, swapping a card from your vault into your loadout costs **Stress** equal to the card's Recall Cost (the lightning bolt number)."
            }
          />

          {/* Mode toggle buttons */}
          <div className="flex gap-2 mb-3">
            {canSwap && (
              <button
                type="button"
                onClick={() => handleModeSwitch("swap")}
                aria-pressed={pickerMode === "swap"}
                className={`
                  flex-1 px-3 py-2 rounded-lg text-xs font-semibold transition-colors
                  focus:outline-none focus:ring-2 focus:ring-gold-500
                  ${
                    pickerMode === "swap"
                      ? "bg-gold-800/80 text-parchment-100 border border-gold-600"
                      : "bg-slate-800 text-parchment-400 border border-slate-700 hover:bg-slate-700"
                  }
                `}
              >
                Swap from Vault ({domainVault.length})
              </button>
            )}
            {canAcquire && (
              <button
                type="button"
                onClick={() => handleModeSwitch("acquire")}
                aria-pressed={pickerMode === "acquire"}
                className={`
                  flex-1 px-3 py-2 rounded-lg text-xs font-semibold transition-colors
                  focus:outline-none focus:ring-2 focus:ring-gold-500
                  ${
                    pickerMode === "acquire"
                      ? "bg-gold-800/80 text-parchment-100 border border-gold-600"
                      : "bg-slate-800 text-parchment-400 border border-slate-700 hover:bg-slate-700"
                  }
                `}
              >
                Acquire New Card
              </button>
            )}
          </div>

          {/* Swap mode — show vault picker */}
          {pickerMode === "swap" && canSwap && (
            <VaultPicker
              vaultIds={domainVault}
              loadoutIds={domainLoadout}
              characterId={characterId}
              characterLevel={level}
              onClose={() => setShowPicker(false)}
            />
          )}

          {/* Acquire mode — show acquire picker */}
          {pickerMode === "acquire" && classId !== undefined && (
            <AcquireCardPicker
              classId={classId}
              characterLevel={level}
              characterId={characterId}
              acquiredCardIds={acquiredCardIds}
              loadoutIds={domainLoadout}
              onCardAcquired={() => {
                setShowPicker(false);
              }}
              onClose={() => setShowPicker(false)}
            />
          )}
        </div>
      )}
    </div>
    </>
  );
}
