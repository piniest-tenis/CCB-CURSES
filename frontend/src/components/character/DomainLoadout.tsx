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
import { useDomainCard } from "@/hooks/useGameData";
import { useActionButton, InlineActionError } from "./ActionButton";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseCardId(cardId: string): { domain: string | undefined; id: string } {
  const parts = cardId.includes("/") ? cardId.split("/") : null;
  return { domain: parts?.[0], id: parts?.[1] ?? cardId };
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
              ? "border-[#577399] bg-[#577399]/20 text-[#577399] shadow-[0_0_8px_rgba(87,115,153,0.5)]"
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
        <p className="text-[11px] text-[#577399] leading-snug" role="status">
          Aura active — when hit, make a Spellcast Roll to maintain.
        </p>
      )}

      <InlineActionError message={inlineError} id={errorId} />
    </div>
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

        {/* Card info */}
        <div className="flex-1 min-w-0">
          {card ? (
            <>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-parchment-200 truncate">
                  {card.name}
                </span>
                {card.isCursed && (
                  <span title="Cursed" className="text-xs text-burgundy-400 font-bold">
                    ★
                  </span>
                )}
                {card.isGrimoire && (
                  <span className="rounded bg-gold-900/50 px-1 text-[10px] font-semibold text-gold-400">
                    Grimoire
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[10px] text-parchment-500 uppercase tracking-wider">
                  {card.domain}
                </span>
                <span className="rounded-full border border-gold-800 px-1.5 text-[10px] font-bold text-gold-500">
                  Lv {card.level}
                </span>
              </div>
            </>
          ) : (
            <span className="text-sm text-parchment-600 italic">{cardId}</span>
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

interface VaultPickerProps {
  vaultIds:   string[];
  loadoutIds: string[];
  onAdd:      (cardId: string) => void;
  onClose:    () => void;
}

function VaultPicker({ vaultIds, loadoutIds, onAdd, onClose }: VaultPickerProps) {
  const available = vaultIds.filter((id) => !loadoutIds.includes(id));

  return (
    <div className="rounded-lg border border-gold-800 bg-slate-900 shadow-card-fantasy-hover p-4 space-y-2">
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

      {available.length === 0 ? (
        <p className="text-xs text-parchment-600 italic">
          No more cards in vault (all are already in loadout or vault is empty).
        </p>
      ) : (
        <ul className="space-y-1 max-h-48 overflow-y-auto pr-1">
          {available.map((cardId) => (
            <VaultPickerItem
              key={cardId}
              cardId={cardId}
              onAdd={() => {
                onAdd(cardId);
                onClose();
              }}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function VaultPickerItem({ cardId, onAdd }: { cardId: string; onAdd: () => void }) {
  const { domain, id } = parseCardId(cardId);
  const { data: card } = useDomainCard(domain, id);

  return (
    <li>
      <button
        onClick={onAdd}
        aria-label={
          card
            ? `Add ${card.name} (${card.domain}, Level ${card.level}) to loadout`
            : `Add ${cardId} to loadout`
        }
        className="
          w-full flex items-center gap-2 rounded px-2 py-1.5
          hover:bg-burgundy-900/40 text-left transition-colors
          focus:outline-none focus:ring-1 focus:ring-gold-500
        "
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
  const { activeCharacter, removeFromLoadout, reorderLoadout, addToLoadout } =
    useCharacterStore();
  const [showPicker, setShowPicker] = useState(false);

  // Drag state
  const dragIndex = useRef<number | null>(null);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);

  if (!activeCharacter) return null;

  const { domainLoadout, domainVault, characterId } = activeCharacter;

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

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-parchment-400">
          Active Loadout{" "}
          <span className="text-parchment-600">({domainLoadout.length}/5)</span>
        </h3>
        {domainLoadout.length < 5 && domainVault.length > 0 && (
          <button
            type="button"
            onClick={() => setShowPicker((v) => !v)}
            aria-expanded={showPicker}
            aria-controls="domain-vault-picker"
            className="
              rounded px-2 py-0.5 text-xs font-semibold
              bg-burgundy-800/60 text-parchment-300 border border-burgundy-700
              hover:bg-burgundy-700 transition-colors
              focus:outline-none focus:ring-2 focus:ring-gold-500
            "
          >
            {showPicker ? "Hide Vault" : "+ Add Card"}
          </button>
        )}
      </div>

      {/* Loadout slots */}
      {domainLoadout.length === 0 ? (
        <p className="text-xs text-parchment-600 italic">
          No cards in loadout. Add cards from your vault above.
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

      {/* Vault picker */}
      {showPicker && (
        <div id="domain-vault-picker">
          <VaultPicker
            vaultIds={domainVault}
            loadoutIds={domainLoadout}
            onAdd={addToLoadout}
            onClose={() => setShowPicker(false)}
          />
        </div>
      )}
    </div>
  );
}
