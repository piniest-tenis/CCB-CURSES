"use client";

/**
 * DomainCardSelectionPanel.tsx
 *
 * Step 10 of the character builder — Take Domain Deck Cards.
 *
 * Rules (SRD page 4):
 *   - Character picks exactly 2 domain cards at creation.
 *   - Both must be Level 1 (≤ character level, which is 1 at creation).
 *   - Cards must come from the character's class's two domains.
 *   - Player may take 1 from each domain OR 2 from the same domain.
 *
 * UX pattern:
 *   - SRD cards: `alwaysShowDetail` (full card text inline, no accordion)
 *   - Homebrew cards: accordion-expandable tiles
 *   - Multi-select (toggle) with persistent "Your Picks" tray (2 slots)
 *   - Locked mode (post-Level-1) shows read-only card rows
 *
 * SRD reference: page 4 (Domain Cards), page 5 (Domain Card Anatomy, Recall Cost).
 */

import React, { useState, useMemo, useCallback } from "react";
import { useDomain, type DomainCardsData } from "@/hooks/useGameData";
import type { DomainCard } from "@shared/types";
import { MarkdownContent } from "@/components/MarkdownContent";
import { SourceBadge } from "@/components/SourceBadge";
import { SourceFilter, type SourceFilterValue } from "@/components/SourceFilter";
import { SelectionTile } from "./SelectionTile";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Truncate text to ≤50 characters for collapsed list view. */
function truncate(text: string, max = 50): string {
  if (!text) return "";
  const cleaned = text.replace(/\*\*/g, "").replace(/\n/g, " ").trim();
  return cleaned.length <= max ? cleaned : cleaned.slice(0, max - 1) + "…";
}

// ─── Card Detail (inline content for SelectionTile children) ──────────────────

function CardDetailContent({ card }: { card: DomainCard }) {
  return (
    <div className="space-y-3">
      {/* Recall cost */}
      <div className="flex items-center gap-2 text-sm">
        <span className="text-xs uppercase tracking-wider text-parchment-600">Recall Cost</span>
        <span className="rounded border border-slate-700 bg-slate-900 px-2 py-0.5 font-bold text-[#f7f7ff]">
          {typeof card.level === "number" ? card.level : "—"}⚡
        </span>
      </div>

      {/* Full card text */}
      <div className="rounded-lg border border-slate-700/60 bg-slate-900/40 px-4 py-3">
        {card.isGrimoire && card.grimoire.length > 0 ? (
          <div className="space-y-3">
            {card.grimoire.map((ability, i) => (
              <div key={i}>
                <p className="text-sm font-semibold text-[#f7f7ff] mb-1">{ability.name}</p>
                <MarkdownContent className="text-base text-parchment-500">
                  {ability.description}
                </MarkdownContent>
              </div>
            ))}
          </div>
        ) : (
          <MarkdownContent className="text-base text-parchment-500">
            {card.description}
          </MarkdownContent>
        )}
      </div>

      {card.isCursed && card.curseText && (
        <div className="rounded-lg border border-[#fe5f55]/30 bg-[#fe5f55]/5 px-4 py-3">
          <p className="text-xs uppercase tracking-wider text-[#fe5f55]/70 mb-1">Curse</p>
          <MarkdownContent className="text-base text-parchment-500">
            {card.curseText}
          </MarkdownContent>
        </div>
      )}
    </div>
  );
}

// ─── Locked-mode Card Row (read-only, minimal — kept from original) ───────────

function LockedCardRow({
  card,
  isInVault,
  onDrill,
}: {
  card: DomainCard;
  isInVault: boolean;
  onDrill: () => void;
}) {
  return (
    <div
      data-selected={isInVault ? "true" : undefined}
      className={`
        flex items-center rounded-lg border transition-all
        ${isInVault
          ? "border-[#577399] bg-[#577399]/15"
          : "border-slate-700/40 bg-slate-900/20 opacity-60"
        }
      `}
    >
      {/* Radio indicator */}
      <span
        className={`
          ml-3 flex-shrink-0 h-5 w-5 rounded-full border-2 flex items-center justify-center transition-colors
          ${isInVault ? "border-[#577399] bg-[#577399]" : "border-slate-700/40"}
        `}
        aria-hidden="true"
      >
        {isInVault && <span className="h-2 w-2 rounded-full bg-white" />}
      </span>

      {/* Text */}
      <div className="flex-1 flex items-center gap-3 px-3 py-3 min-w-0">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-[#f7f7ff] truncate">{card.name}</span>
            <SourceBadge source={card.source} size="sm" />
            <span className="text-xs text-parchment-600 shrink-0">{card.domain}</span>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs text-parchment-600">Lvl {card.level}</span>
            <span className="text-parchment-600 text-xs">·</span>
            <span className="text-xs text-parchment-500 truncate">
              {truncate(card.isGrimoire
                ? (card.grimoire[0]?.description ?? card.description)
                : card.description)}
            </span>
          </div>
        </div>
      </div>

      {/* Drill-down */}
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onDrill(); }}
        aria-label={`View details for ${card.name}`}
        className="
          self-stretch shrink-0 flex items-center justify-center
          pl-3 pr-2 border-l border-slate-700/40 rounded-r-lg
          text-parchment-600 hover:text-parchment-500
          transition-colors min-w-[44px]
        "
      >
        <span className="text-lg leading-none">›</span>
      </button>
    </div>
  );
}

// ─── Locked-mode Detail View ──────────────────────────────────────────────────

function LockedCardDetail({
  card,
  onBack,
}: {
  card: DomainCard;
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
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs uppercase tracking-wider text-parchment-600">{card.domain}</span>
            <span className="text-parchment-600">·</span>
            <span className="text-xs uppercase tracking-wider text-parchment-600">Level {card.level}</span>
            {card.isGrimoire && (
              <>
                <span className="text-parchment-600">·</span>
                <span className="text-xs uppercase tracking-wider text-[#daa520]/60">Grimoire</span>
              </>
            )}
          </div>
          <h4 className="font-serif text-xl font-bold text-[#f7f7ff]">{card.name}</h4>
        </div>
        <CardDetailContent card={card} />
      </div>
    </div>
  );
}

// ─── Your Picks Tray ──────────────────────────────────────────────────────────

function YourPicksTray({
  selectedCardIds,
  allCards,
  onRemove,
}: {
  selectedCardIds: string[];
  allCards: DomainCard[];
  onRemove: (prefixedId: string) => void;
}) {
  const slots = [0, 1]; // Always show 2 slots
  return (
    <div className="shrink-0 border-b border-slate-700/30 px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-wider text-parchment-500 mb-2">
        Your Picks ({selectedCardIds.length}/2)
      </p>
      <div className="grid grid-cols-2 gap-2">
        {slots.map((i) => {
          const prefixedId = selectedCardIds[i];
          if (!prefixedId) {
            return (
              <div
                key={`empty-${i}`}
                className="rounded-lg border-2 border-dashed border-slate-700/40 px-3 py-2.5 flex items-center justify-center min-h-[44px]"
              >
                <span className="text-xs text-parchment-600">Empty slot</span>
              </div>
            );
          }
          // Resolve card
          const parts = prefixedId.split("/");
          const card = allCards.find(
            (c) => c.domain === parts[0] && c.cardId === parts[1]
          );
          return (
            <div
              key={prefixedId}
              className="rounded-lg border border-[#577399]/60 bg-[#577399]/10 px-3 py-2 flex items-center gap-2 min-h-[44px]"
            >
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-[#f7f7ff] truncate">
                  {card?.name ?? prefixedId}
                </p>
                <p className="text-xs text-parchment-600 truncate">
                  {card?.domain ?? ""}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onRemove(prefixedId)}
                className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full text-parchment-500 hover:text-[#fe5f55] hover:bg-[#fe5f55]/10 transition-colors"
                aria-label={`Remove ${card?.name ?? "card"}`}
              >
                ×
              </button>
            </div>
          );
        })}
      </div>
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
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);

  // Fetch both domains in parallel
  const domain1Query = useDomain(classDomains[0]);
  const domain2Query = useDomain(classDomains[1]);

  // In locked mode show ALL cards across all levels; in creation mode filter ≤ characterLevel.
  const allCards: DomainCard[] = useMemo(() => {
    const d1 = (domain1Query.data as DomainCardsData | undefined)?.cards ?? [];
    const d2 = (domain2Query.data as DomainCardsData | undefined)?.cards ?? [];
    const combined = [...d1, ...d2];
    if (isLocked) return combined;
    return combined.filter((c) => c.level <= characterLevel);
  }, [domain1Query.data, domain2Query.data, characterLevel, isLocked]);

  const isLoading = domain1Query.isLoading || domain2Query.isLoading;
  const isError = domain1Query.isError || domain2Query.isError;

  // Toggle card selection — stored as "domain/cardId"
  const toggleCard = useCallback((card: DomainCard) => {
    if (isLocked) return;
    const prefixedId = `${card.domain}/${card.cardId}`;
    if (selectedCardIds.includes(prefixedId)) {
      onSelectionChange(selectedCardIds.filter((id) => id !== prefixedId));
    } else if (selectedCardIds.length < 2) {
      onSelectionChange([...selectedCardIds, prefixedId]);
    }
  }, [isLocked, selectedCardIds, onSelectionChange]);

  const removeCard = useCallback((prefixedId: string) => {
    onSelectionChange(selectedCardIds.filter((id) => id !== prefixedId));
  }, [selectedCardIds, onSelectionChange]);

  const handleToggleExpand = useCallback((cardId: string) => {
    setExpandedCardId((prev) => (prev === cardId ? null : cardId));
  }, []);

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
        <p className="text-sm text-parchment-600 text-center">
          {isError
            ? "Could not load domain cards. Please check your connection."
            : "No Level 1 cards found for these domains."}
        </p>
      </div>
    );
  }

  // ── Locked mode (post-Level-1): read-only card rows with drill-down ──
  if (isLocked) {
    // Keep the drill-down detail view for locked mode
    if (detailCard) {
      return (
        <LockedCardDetail
          card={detailCard}
          onBack={() => setDetailCard(null)}
        />
      );
    }

    const filteredCards = allCards.filter((c) => sourceFilter === "all" || c.source === sourceFilter);
    const acquiredCards = filteredCards.filter((c) => c.level <= characterLevel);
    const futureCards   = filteredCards.filter((c) => c.level >  characterLevel);

    return (
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="shrink-0 px-4 py-3 border-b border-slate-700/30 space-y-2">
          <div className="flex items-start gap-3">
            <p className="text-xs text-parchment-500 flex-1 min-w-0">
              Domain cards are managed via the{" "}
              <strong className="text-[#f7f7ff]">Level Up</strong> wizard.
              {classDomains.length > 0 && (
                <span className="ml-1 text-steel-accessible">
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
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
          {acquiredCards.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-wider text-parchment-600 px-1">
                Levels 1–{characterLevel} (acquired)
              </p>
              {acquiredCards.map((card) => {
                const prefixedId = `${card.domain}/${card.cardId}`;
                const isInVault = lockedCardIds.includes(prefixedId);
                return (
                  <LockedCardRow
                    key={card.cardId}
                    card={card}
                    isInVault={isInVault}
                    onDrill={() => setDetailCard(card)}
                  />
                );
              })}
            </div>
          )}

          {futureCards.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-wider text-parchment-600 px-1">
                Future levels
              </p>
              {futureCards.map((card) => (
                <div key={card.cardId} className="opacity-40">
                  <LockedCardRow
                    card={card}
                    isInVault={false}
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

  // ── Creation mode: accordion tiles with "Your Picks" tray ──
  const selectionCount = selectedCardIds.length;
  const canSelectMore = selectionCount < 2;

  const filteredCards = allCards.filter((c) => sourceFilter === "all" || c.source === sourceFilter);

  return (
    <div className="flex flex-col h-full">
      {/* Your Picks tray */}
      <YourPicksTray
        selectedCardIds={selectedCardIds}
        allCards={allCards}
        onRemove={removeCard}
      />

      {/* Source filter */}
      <div className="shrink-0 px-4 py-3 border-b border-slate-700/30 space-y-2">
        <div className="flex items-start gap-3">
          <p className="text-xs text-parchment-500 flex-1 min-w-0">
            Select exactly <strong className="text-[#f7f7ff]">2</strong> cards from your class domains
            {classDomains.length > 0 && (
              <span className="ml-1 text-steel-accessible">
                ({classDomains.join(" & ")})
              </span>
            )}
          </p>
        </div>
        <SourceFilter value={sourceFilter} onChange={setSourceFilter} />
      </div>

      {/* Card list — accordion tiles */}
      <div className="flex-1 overflow-y-auto">
        {filteredCards.map((card) => {
          const prefixedId = `${card.domain}/${card.cardId}`;
          const isSelected = selectedCardIds.includes(prefixedId);
          const isSRD = card.source === "srd";
          const selectDisabled = !canSelectMore && !isSelected;

          return (
            <SelectionTile
              key={card.cardId}
              id={`domain-card-${card.cardId}`}
              isSelected={isSelected}
              isExpanded={expandedCardId === card.cardId}
              onToggleExpand={() => handleToggleExpand(card.cardId)}
              onSelect={() => toggleCard(card)}
              name={card.name}
              subtitle={`${card.domain} · Lvl ${card.level} · Recall ${card.level}⚡`}
              badges={
                <>
                  <SourceBadge source={card.source} size="sm" />
                  {card.isGrimoire && (
                    <span className="text-xs uppercase tracking-wider text-[#daa520]/70">
                      Grimoire
                    </span>
                  )}
                </>
              }
              selectLabel="Select"
              selectedLabel="Selected"
              selectDisabled={selectDisabled}
              selectDisabledReason="2 cards already selected"
              alwaysShowDetail={isSRD}
            >
              <CardDetailContent card={card} />
            </SelectionTile>
          );
        })}
      </div>
    </div>
  );
}
