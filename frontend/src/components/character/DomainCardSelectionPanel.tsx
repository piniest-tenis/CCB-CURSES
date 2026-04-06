"use client";

/**
 * DomainCardSelectionPanel.tsx
 *
 * Step 6 of the character builder — Take Domain Deck Cards.
 *
 * Rules (SRD page 4):
 *   - Character picks exactly 2 domain cards at creation.
 *   - Both must be Level 1 (≤ character level, which is 1 at creation).
 *   - Cards must come from the character's class's two domains.
 *   - Player may take 1 from each domain OR 2 from the same domain.
 *
 * SRD reference: page 4 (Domain Cards), page 5 (Domain Card Anatomy, Recall Cost).
 */

import React, { useState, useMemo, useRef, useEffect } from "react";
import { useDomain, type DomainCardsData } from "@/hooks/useGameData";
import type { DomainCard } from "@shared/types";
import { MarkdownContent } from "@/components/MarkdownContent";
import { SourceBadge } from "@/components/SourceBadge";
import { SourceFilter, type SourceFilterValue } from "@/components/SourceFilter";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Truncate text to ≤50 characters for collapsed list view. */
function truncate(text: string, max = 50): string {
  if (!text) return "";
  const cleaned = text.replace(/\*\*/g, "").replace(/\n/g, " ").trim();
  return cleaned.length <= max ? cleaned : cleaned.slice(0, max - 1) + "…";
}

// ─── Detail View ──────────────────────────────────────────────────────────────

function CardDetail({
  card,
  isSelected,
  canSelect,
  onToggle,
  onBack,
}: {
  card: DomainCard;
  isSelected: boolean;
  canSelect: boolean;
  onToggle: () => void;
  onBack: () => void;
}) {
  return (
    <div className="flex flex-col h-full">
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-1.5 px-4 py-3 min-h-[44px] text-xs text-[#daa520] hover:text-[#e8b830] transition-colors shrink-0 focus:outline-none focus:ring-2 focus:ring-[#577399] focus:ring-inset rounded"
      >
        ← Back to cards
      </button>
      <div className="flex-1 overflow-y-auto px-6 py-2 space-y-4">
        {/* Header */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs uppercase tracking-wider text-[#b9baa3]/40">
              {card.domain}
            </span>
            <span className="text-[#b9baa3]/20">·</span>
            <span className="text-xs uppercase tracking-wider text-[#b9baa3]/40">
              Level {card.level}
            </span>
            {card.isGrimoire && (
              <>
                <span className="text-[#b9baa3]/20">·</span>
                <span className="text-xs uppercase tracking-wider text-[#daa520]/60">Grimoire</span>
              </>
            )}
          </div>
          <h4 className="font-serif text-xl font-bold text-[#f7f7ff]">{card.name}</h4>
        </div>

        {/* Recall cost */}
        <div className="flex gap-4 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase tracking-wider text-[#b9baa3]/40">Recall Cost</span>
            <span className="rounded border border-slate-700 bg-slate-900 px-2 py-0.5 font-bold text-[#f7f7ff]">
              {typeof card.level === "number" ? card.level : "—"}⚡
            </span>
          </div>
        </div>

        {/* Full card text */}
        <div className="rounded-lg border border-slate-700/60 bg-slate-900/40 px-4 py-3">
          {card.isGrimoire && card.grimoire.length > 0 ? (
            <div className="space-y-3">
              {card.grimoire.map((ability, i) => (
                <div key={i}>
                  <p className="text-sm font-semibold text-[#f7f7ff] mb-1">{ability.name}</p>
                  <MarkdownContent className="text-base text-[#b9baa3]/75">
                    {ability.description}
                  </MarkdownContent>
                </div>
              ))}
            </div>
          ) : (
            <MarkdownContent className="text-base text-[#b9baa3]/75">
              {card.description}
            </MarkdownContent>
          )}
        </div>

        {card.isCursed && card.curseText && (
          <div className="rounded-lg border border-[#fe5f55]/30 bg-[#fe5f55]/5 px-4 py-3">
            <p className="text-xs uppercase tracking-wider text-[#fe5f55]/60 mb-1">Curse</p>
            <MarkdownContent className="text-base text-[#b9baa3]/70">
              {card.curseText}
            </MarkdownContent>
          </div>
        )}

        {/* Select / deselect */}
        <button
          type="button"
          onClick={onToggle}
          disabled={!canSelect && !isSelected}
          className={`
            w-full rounded-lg px-4 py-3 font-semibold text-sm transition-colors
            ${isSelected
              ? "bg-[#577399]/20 border-2 border-[#577399] text-[#577399] hover:bg-[#577399]/30"
              : canSelect
                ? "bg-[#577399] text-white hover:bg-[#577399]/80"
                : "bg-slate-800/50 border border-slate-700/40 text-[#b9baa3]/30 cursor-not-allowed"
            }
          `}
        >
          {isSelected ? "✓ Selected — click to deselect" : canSelect ? "Select this card" : "2 cards already selected"}
        </button>
      </div>
    </div>
  );
}

// ─── Card Row ─────────────────────────────────────────────────────────────────

function CardRow({
  card,
  isSelected,
  canSelect,
  onToggle,
  onDrill,
}: {
  card: DomainCard;
  isSelected: boolean;
  canSelect: boolean;
  onToggle: () => void;
  onDrill: () => void;
}) {
  return (
    <div
      data-selected={isSelected ? "true" : undefined}
      onClick={() => { if (canSelect || isSelected) onToggle(); }}
      className={`
        flex items-center rounded-lg border transition-all cursor-pointer
        ${isSelected
          ? "border-[#577399] bg-[#577399]/15"
          : canSelect
            ? "border-slate-700/60 bg-slate-900/30 hover:border-slate-600"
            : "border-slate-700/40 bg-slate-900/20 opacity-60 cursor-not-allowed"
        }
      `}
    >
      {/* Circular radio indicator (visual only, tile click selects) */}
      <span
        className={`
          ml-3 flex-shrink-0 h-5 w-5 rounded-full border-2 flex items-center justify-center transition-colors
          ${isSelected
            ? "border-[#577399] bg-[#577399]"
            : !canSelect
              ? "border-slate-700/40"
              : "border-slate-600"
          }
        `}
        aria-hidden="true"
      >
        {isSelected && <span className="h-2 w-2 rounded-full bg-white" />}
      </span>

      {/* Text — fills remaining space */}
      <div className="flex-1 flex items-center gap-3 px-3 py-3 min-w-0">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-[#f7f7ff] truncate">{card.name}</span>
            <SourceBadge source={card.source} size="sm" />
            <span className="text-xs text-[#b9baa3]/40 shrink-0">{card.domain}</span>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs text-[#b9baa3]/40">Lvl {card.level}</span>
            <span className="text-[#b9baa3]/20 text-xs">·</span>
            <span className="text-xs text-[#b9baa3]/50 truncate">
              {truncate(card.isGrimoire
                ? (card.grimoire[0]?.description ?? card.description)
                : card.description)}
            </span>
          </div>
        </div>
      </div>

      {/* Drill-down strip — clicking this area opens detail; delineated from select area */}
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onDrill(); }}
        aria-label={`View details for ${card.name}`}
        className="
          self-stretch shrink-0 flex items-center justify-center
          pl-3 pr-2 border-l border-slate-700/40 rounded-r-lg
          text-[#b9baa3]/30 hover:text-[#b9baa3]/70
          transition-colors min-w-[44px]
        "
      >
        <span className="text-lg leading-none">›</span>
      </button>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface Props {
  /** Two domain names from the class (e.g. ["Blade", "Valor"]) */
  classDomains: string[];
  /** Currently selected cardIds (0–2) — used in creation mode only */
  selectedCardIds: string[];
  onSelectionChange: (cardIds: string[]) => void;
  /** Character's current level — cards must be ≤ this level (creation mode) */
  characterLevel?: number;
  /**
   * When provided, the panel enters "locked" mode (post-Level-1 characters).
   * These are the card IDs already in the character's domainVault.
   * All toggling is disabled; vault cards show as locked-selected;
   * cards above characterLevel show as future/greyed.
   */
  lockedCardIds?: string[];
}

export function DomainCardSelectionPanel({
  classDomains,
  selectedCardIds,
  onSelectionChange,
  characterLevel = 1,
  lockedCardIds,
}: Props) {
  const isLocked = lockedCardIds !== undefined;

  const [detailCard, setDetailCard] = useState<DomainCard | null>(null);
  const [sourceFilter, setSourceFilter] = useState<SourceFilterValue>("all");

  // Scroll first selected/locked card into view when the list renders with pre-selections.
  const listRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const ids = isLocked ? lockedCardIds : selectedCardIds;
    if (!ids.length || !listRef.current) return;
    const el = listRef.current.querySelector<HTMLElement>("[data-selected='true']");
    if (el) el.scrollIntoView({ block: "nearest", behavior: "instant" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch both domains in parallel
  const domain1Query = useDomain(classDomains[0]);
  const domain2Query = useDomain(classDomains[1]);

  // In locked mode show ALL cards across all levels; in creation mode filter ≤ characterLevel.
  const allCards: DomainCard[] = useMemo(() => {
    const d1 = (domain1Query.data as DomainCardsData | undefined)?.cards ?? [];
    const d2 = (domain2Query.data as DomainCardsData | undefined)?.cards ?? [];
    const combined = [...d1, ...d2];
    if (isLocked) return combined; // show everything — sorted by level then name
    return combined.filter((c) => c.level <= characterLevel);
  }, [domain1Query.data, domain2Query.data, characterLevel, isLocked]);

  const isLoading = domain1Query.isLoading || domain2Query.isLoading;
  const isError = domain1Query.isError || domain2Query.isError;

  // Toggle card selection — stored as "domain/cardId" so LoadoutCardSlot and
  // DowntimeProjectsPanel can resolve the card via useDomainCard(domain, id).
  function toggleCard(card: DomainCard) {
    if (isLocked) return; // no-op in locked mode
    const prefixedId = `${card.domain}/${card.cardId}`;
    if (selectedCardIds.includes(prefixedId)) {
      onSelectionChange(selectedCardIds.filter((id) => id !== prefixedId));
    } else if (selectedCardIds.length < 2) {
      onSelectionChange([...selectedCardIds, prefixedId]);
    }
  }

  // ── Detail view ──
  if (detailCard) {
    const prefixedId = `${detailCard.domain}/${detailCard.cardId}`;
    const isSelected = isLocked
      ? lockedCardIds.includes(prefixedId)
      : selectedCardIds.includes(prefixedId);
    const canSelect = isLocked ? false : selectedCardIds.length < 2;
    return (
      <CardDetail
        card={detailCard}
        isSelected={isSelected}
        canSelect={canSelect}
        onToggle={() => toggleCard(detailCard)}
        onBack={() => setDetailCard(null)}
      />
    );
  }

  // ── Loading / error states ──
  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div
          className="h-6 w-6 animate-spin rounded-full border-2 border-[#577399] border-t-transparent"
          role="status"
          aria-label="Loading domain cards"
        >
          <span className="sr-only">Loading domain cards…</span>
        </div>
      </div>
    );
  }

  if (isError || allCards.length === 0) {
    return (
      <div className="flex h-full items-center justify-center px-6">
        <p className="text-sm text-[#b9baa3]/40 italic text-center">
          {isError
            ? "Could not load domain cards. Please check your connection."
            : "No Level 1 cards found for these domains."}
        </p>
      </div>
    );
  }

  // ── Locked mode: group cards by level tier ──
  if (isLocked) {
    const filteredCards = allCards.filter((c) => sourceFilter === "all" || c.source === sourceFilter);
    const acquiredCards = filteredCards.filter((c) => c.level <= characterLevel);
    const futureCards   = filteredCards.filter((c) => c.level >  characterLevel);

    return (
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="shrink-0 px-4 py-3 border-b border-slate-700/30 space-y-2">
          <div className="flex items-start gap-3">
            <p className="text-xs text-[#b9baa3]/50 flex-1 min-w-0">
              Domain cards are managed via the{" "}
              <strong className="text-[#f7f7ff]">Level Up</strong> wizard.
              {classDomains.length > 0 && (
                <span className="ml-1 text-[#577399]">
                  ({classDomains.join(" & ")})
                </span>
              )}
            </p>
            <span className="text-sm font-bold px-2 py-0.5 rounded shrink-0 text-[#4ade80]">
              {lockedCardIds.length} acquired
            </span>
          </div>
          <SourceFilter value={sourceFilter} onChange={setSourceFilter} />
        </div>

        {/* Card list */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4" ref={listRef}>
          {/* Acquired / current-level cards */}
          {acquiredCards.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-wider text-[#b9baa3]/30 px-1">
                Levels 1–{characterLevel} (acquired)
              </p>
              {acquiredCards.map((card) => {
                const prefixedId = `${card.domain}/${card.cardId}`;
                const isInVault = lockedCardIds.includes(prefixedId);
                return (
                  <CardRow
                    key={card.cardId}
                    card={card}
                    isSelected={isInVault}
                    canSelect={false}
                    onToggle={() => {}}
                    onDrill={() => setDetailCard(card)}
                  />
                );
              })}
            </div>
          )}

          {/* Future cards — greyed, drill-able but not selectable */}
          {futureCards.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-wider text-[#b9baa3]/30 px-1">
                Future levels
              </p>
              {futureCards.map((card) => (
                <div key={card.cardId} className="opacity-40">
                  <CardRow
                    card={card}
                    isSelected={false}
                    canSelect={false}
                    onToggle={() => {}}
                    onDrill={() => setDetailCard(card)}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Creation mode list view ──
  const selectionCount = selectedCardIds.length;
  const canSelectMore = selectionCount < 2;

  return (
    <div className="flex flex-col h-full">
      {/* Selection counter + source filter */}
      <div className="shrink-0 px-4 py-3 border-b border-slate-700/30 space-y-2">
        <div className="flex items-start gap-3">
          <p className="text-xs text-[#b9baa3]/50 flex-1 min-w-0">
            Select exactly <strong className="text-[#f7f7ff]">2</strong> cards from your class domains
            {classDomains.length > 0 && (
              <span className="ml-1 text-[#577399]">
                ({classDomains.join(" & ")})
              </span>
            )}
          </p>
          <span
            className={`
              text-sm font-bold px-2 py-0.5 rounded shrink-0
              ${selectionCount === 2 ? "text-[#4ade80]" : "text-[#b9baa3]/50"}
            `}
          >
            {selectionCount}/2
          </span>
        </div>
        <SourceFilter value={sourceFilter} onChange={setSourceFilter} />
      </div>

      {/* Card list */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2" ref={listRef}>
        {allCards
          .filter((card) => sourceFilter === "all" || card.source === sourceFilter)
          .map((card) => {
          const isSelected = selectedCardIds.includes(`${card.domain}/${card.cardId}`);
          return (
            <CardRow
              key={card.cardId}
              card={card}
              isSelected={isSelected}
              canSelect={canSelectMore}
              onToggle={() => toggleCard(card)}
              onDrill={() => setDetailCard(card)}
            />
          );
        })}
      </div>
    </div>
  );
}
