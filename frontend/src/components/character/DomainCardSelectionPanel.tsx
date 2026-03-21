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

import React, { useState, useMemo } from "react";
import { useDomain, type DomainCardsData } from "@/hooks/useGameData";
import type { DomainCard } from "@shared/types";
import { MarkdownContent } from "@/components/MarkdownContent";

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
        className="flex items-center gap-1.5 px-4 py-3 text-xs text-[#b9baa3]/50 hover:text-[#b9baa3] transition-colors shrink-0"
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

        {card.isCursed && card.curseText && (
          <div className="rounded-lg border border-[#fe5f55]/30 bg-[#fe5f55]/5 px-4 py-3">
            <p className="text-xs uppercase tracking-wider text-[#fe5f55]/60 mb-1">Curse</p>
            <MarkdownContent className="text-sm text-[#b9baa3]/70">
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
      className={`
        flex items-center rounded-lg border transition-all
        ${isSelected
          ? "border-[#577399] bg-[#577399]/15"
          : "border-slate-700/60 bg-slate-900/30 hover:border-slate-600"
        }
      `}
    >
      {/* Select area */}
      <button
        type="button"
        onClick={onToggle}
        disabled={!canSelect && !isSelected}
        className="flex-1 flex items-center gap-3 px-4 py-3 text-left min-w-0"
      >
        {/* Checkbox */}
        <span
          className={`
            h-4 w-4 rounded border-2 flex-shrink-0 flex items-center justify-center transition-colors
            ${isSelected
              ? "border-[#577399] bg-[#577399]"
              : !canSelect
                ? "border-slate-700/40"
                : "border-slate-600"
            }
          `}
        >
          {isSelected && <span className="text-white text-[10px] leading-none">✓</span>}
        </span>

        {/* Text */}
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-[#f7f7ff] truncate">{card.name}</span>
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
      </button>

      {/* Drill-down arrow */}
      <button
        type="button"
        onClick={onDrill}
        className="px-3 py-3 text-[#b9baa3]/30 hover:text-[#b9baa3] transition-colors text-lg shrink-0"
        aria-label={`View details for ${card.name}`}
      >
        ›
      </button>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface Props {
  /** Two domain names from the class (e.g. ["Blade", "Valor"]) */
  classDomains: string[];
  /** Currently selected cardIds (0–2) */
  selectedCardIds: string[];
  onSelectionChange: (cardIds: string[]) => void;
  /** Character's current level — cards must be ≤ this level */
  characterLevel?: number;
}

export function DomainCardSelectionPanel({
  classDomains,
  selectedCardIds,
  onSelectionChange,
  characterLevel = 1,
}: Props) {
  const [detailCard, setDetailCard] = useState<DomainCard | null>(null);

  // Fetch both domains in parallel
  const domain1Query = useDomain(classDomains[0]);
  const domain2Query = useDomain(classDomains[1]);

  // Combine and filter to level ≤ characterLevel
  const allCards: DomainCard[] = useMemo(() => {
    const d1 = (domain1Query.data as DomainCardsData | undefined)?.cards ?? [];
    const d2 = (domain2Query.data as DomainCardsData | undefined)?.cards ?? [];
    return [...d1, ...d2].filter((c) => c.level <= characterLevel);
  }, [domain1Query.data, domain2Query.data, characterLevel]);

  const isLoading = domain1Query.isLoading || domain2Query.isLoading;
  const isError = domain1Query.isError || domain2Query.isError;

  // Toggle card selection
  function toggleCard(cardId: string) {
    if (selectedCardIds.includes(cardId)) {
      onSelectionChange(selectedCardIds.filter((id) => id !== cardId));
    } else if (selectedCardIds.length < 2) {
      onSelectionChange([...selectedCardIds, cardId]);
    }
  }

  // ── Detail view ──
  if (detailCard) {
    const isSelected = selectedCardIds.includes(detailCard.cardId);
    const canSelect = selectedCardIds.length < 2;
    return (
      <CardDetail
        card={detailCard}
        isSelected={isSelected}
        canSelect={canSelect}
        onToggle={() => toggleCard(detailCard.cardId)}
        onBack={() => setDetailCard(null)}
      />
    );
  }

  // ── Loading / error states ──
  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#577399] border-t-transparent" />
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

  // ── List view ──
  const selectionCount = selectedCardIds.length;
  const canSelectMore = selectionCount < 2;

  return (
    <div className="flex flex-col h-full">
      {/* Selection counter */}
      <div className="shrink-0 px-4 py-3 border-b border-slate-700/30 flex items-center justify-between">
        <p className="text-xs text-[#b9baa3]/50">
          Select exactly <strong className="text-[#f7f7ff]">2</strong> cards from your class domains
          {classDomains.length > 0 && (
            <span className="ml-1 text-[#577399]">
              ({classDomains.join(" & ")})
            </span>
          )}
        </p>
        <span
          className={`
            text-sm font-bold px-2 py-0.5 rounded
            ${selectionCount === 2 ? "text-[#4ade80]" : "text-[#b9baa3]/50"}
          `}
        >
          {selectionCount}/2
        </span>
      </div>

      {/* Card list */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
        {allCards.map((card) => {
          const isSelected = selectedCardIds.includes(card.cardId);
          return (
            <CardRow
              key={card.cardId}
              card={card}
              isSelected={isSelected}
              canSelect={canSelectMore}
              onToggle={() => toggleCard(card.cardId)}
              onDrill={() => setDetailCard(card)}
            />
          );
        })}
      </div>
    </div>
  );
}
