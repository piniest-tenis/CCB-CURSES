"use client";

/**
 * src/components/character/DomainLoadout.tsx
 *
 * Renders the active domain card loadout (max 5 slots).
 * Cards can be removed, reordered via index-swap drag, and added from the vault.
 */

import React, { useState, useRef } from "react";
import type { DomainCard } from "@shared/types";
import { useCharacterStore } from "@/store/characterStore";
import { useDomainCard } from "@/hooks/useGameData";

// ---------------------------------------------------------------------------
// Single loadout card
// ---------------------------------------------------------------------------

interface LoadoutCardProps {
  cardId: string;
  index: number;
  total: number;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  isDragging: boolean;
  onDragStart: () => void;
  onDragEnter: () => void;
  onDragEnd: () => void;
}

function LoadoutCardSlot({
  cardId,
  index,
  total,
  onRemove,
  onMoveUp,
  onMoveDown,
  isDragging,
  onDragStart,
  onDragEnter,
  onDragEnd,
}: LoadoutCardProps) {
  // Determine the first domain the character has — we need both
  // domain and cardId for the query. Since cardId is prefixed by domain
  // in the vault (e.g. "artistry/bewitch"), we parse it if possible,
  // otherwise leave domain undefined and query will be disabled.
  const parts = cardId.includes("/") ? cardId.split("/") : null;
  const domain = parts?.[0];
  const id = parts?.[1] ?? cardId;

  const { data: card } = useDomainCard(domain, id);

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnter={onDragEnter}
      onDragEnd={onDragEnd}
      role="listitem"
      aria-label={card ? `${card.name}, domain card` : cardId}
      className={`
        relative flex items-center gap-3 rounded-lg border p-3 cursor-grab active:cursor-grabbing
        transition-all duration-150
        ${
          isDragging
            ? "opacity-40 border-gold-500 bg-slate-800"
            : "border-burgundy-800 bg-slate-850 hover:border-burgundy-600"
        }
        shadow-card-fantasy
      `}
    >
      {/* Drag handle */}
      <div className="flex flex-col gap-0.5 text-parchment-600 select-none">
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
                <span
                  title="Cursed"
                  className="text-xs text-burgundy-400 font-bold"
                >
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
              <span
                className="
                  rounded-full border border-gold-800 px-1.5 text-[10px]
                  font-bold text-gold-500
                "
              >
                Lv {card.level}
              </span>
            </div>
          </>
        ) : (
          <span className="text-sm text-parchment-600 italic">{cardId}</span>
        )}
      </div>

      {/* Reorder buttons */}
      <div className="flex flex-col gap-0.5">
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
          ml-1 rounded p-2 text-burgundy-500 hover:bg-burgundy-900/40 hover:text-burgundy-300
          transition-colors focus:outline-none focus:ring-2 focus:ring-burgundy-500
        "
        aria-label={`Remove ${card?.name ?? cardId} from loadout`}
      >
        ✕
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Vault card picker (inline popover-style panel)
// ---------------------------------------------------------------------------

interface VaultPickerProps {
  vaultIds: string[];
  loadoutIds: string[];
  onAdd: (cardId: string) => void;
  onClose: () => void;
}

function VaultPicker({ vaultIds, loadoutIds, onAdd, onClose }: VaultPickerProps) {
  const available = vaultIds.filter((id) => !loadoutIds.includes(id));

  return (
    <div
      className="
        rounded-lg border border-gold-800 bg-slate-900 shadow-card-fantasy-hover
        p-4 space-y-2
      "
    >
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

function VaultPickerItem({
  cardId,
  onAdd,
}: {
  cardId: string;
  onAdd: () => void;
}) {
  const parts = cardId.includes("/") ? cardId.split("/") : null;
  const domain = parts?.[0];
  const id = parts?.[1] ?? cardId;
  const { data: card } = useDomainCard(domain, id);

  return (
    <li>
      <button
        onClick={onAdd}
        aria-label={card ? `Add ${card.name} (${card.domain}, Level ${card.level}) to loadout` : `Add ${cardId} to loadout`}
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

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function DomainLoadout() {
  const { activeCharacter, removeFromLoadout, reorderLoadout, addToLoadout } =
    useCharacterStore();
  const [showPicker, setShowPicker] = useState(false);

  // Drag state
  const dragIndex = useRef<number | null>(null);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);

  if (!activeCharacter) return null;

  const { domainLoadout, domainVault } = activeCharacter;

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
          <span className="text-parchment-600">
            ({domainLoadout.length}/5)
          </span>
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
              className="
                h-8 flex-1 rounded border border-dashed border-burgundy-900/60
                bg-slate-900/30
              "
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
