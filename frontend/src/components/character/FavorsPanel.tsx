"use client";

/**
 * src/components/character/FavorsPanel.tsx
 *
 * Favors tracker panel for the Daggerheart character sheet.
 *
 * Favors are per-faction social currency (SRD reputation system). Each entry
 * maps a factionId / freeform source label to a non-negative integer count.
 *
 * Server actions:
 *   gain-favor  { factionId, n }  — increments favor count
 *   spend-favor { factionId, n }  — decrements (errors if insufficient)
 *
 * Data lives in `character.favors: Record<string, number>`.
 */

import React, { useState } from "react";
import { useCharacterStore } from "@/store/characterStore";
import { useActionButton, InlineActionError } from "./ActionButton";

// ─── FavorRow ─────────────────────────────────────────────────────────────────
// A single faction/source entry with +/- controls matching the Hope tracker.

interface FavorRowProps {
  factionId: string;
  count: number;
  characterId: string;
  onRemove: (factionId: string) => void;
}

function FavorRow({ factionId, count, characterId, onRemove }: FavorRowProps) {
  const gainAction = useActionButton(characterId);
  const spendAction = useActionButton(characterId);
  const errorId = React.useId();

  const combinedError = gainAction.inlineError ?? spendAction.inlineError;
  const isPending = gainAction.isPending || spendAction.isPending;

  return (
    <div className="space-y-1">
      <div
        className="flex items-center gap-3 rounded-lg border border-[#577399]/20 bg-slate-850 px-3 py-2.5"
        role="group"
        aria-label={`Favors with ${factionId}: ${count}`}
      >
        {/* Faction name */}
        <span className="flex-1 min-w-0 truncate text-sm font-medium text-[#f7f7ff]">
          {factionId}
        </span>

        {/* -/count/+ controls */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => spendAction.fire("spend-favor", { factionId })}
            disabled={isPending}
            aria-label={`Spend 1 favor with ${factionId}`}
            aria-describedby={combinedError ? errorId : undefined}
            className="
              h-9 w-9 rounded border border-[#577399]/30 bg-slate-900
              text-sm text-[#b9baa3] hover:bg-[#577399]/15 hover:text-[#f7f7ff]
              disabled:opacity-50 disabled:cursor-wait
              transition-colors flex items-center justify-center
              focus:outline-none focus:ring-2 focus:ring-[#577399]
            "
          >
            −
          </button>

          <output
            aria-label={`${factionId} favor count`}
            className="w-8 text-center text-2xl font-bold text-[#f7f7ff] font-serif tabular-nums"
          >
            {count}
          </output>

          <button
            type="button"
            onClick={() => gainAction.fire("gain-favor", { factionId })}
            disabled={isPending}
            aria-label={`Gain 1 favor with ${factionId}`}
            aria-describedby={combinedError ? errorId : undefined}
            className="
              h-9 w-9 rounded border border-[#577399]/30 bg-slate-900
              text-sm text-[#b9baa3] hover:bg-[#577399]/15 hover:text-[#f7f7ff]
              disabled:opacity-50 disabled:cursor-wait
              transition-colors flex items-center justify-center
              focus:outline-none focus:ring-2 focus:ring-[#577399]
            "
          >
            +
          </button>
        </div>

        {/* Remove button (only visible at 0 favors) */}
        {count === 0 && (
          <button
            type="button"
            onClick={() => onRemove(factionId)}
            aria-label={`Remove ${factionId} from favors`}
            className="
              h-9 w-9 rounded border border-[#fe5f55]/30 bg-transparent
              text-sm text-[#fe5f55]/60 hover:bg-[#fe5f55]/10 hover:text-[#fe5f55]
              transition-colors flex items-center justify-center shrink-0
              focus:outline-none focus:ring-2 focus:ring-[#fe5f55]/40
            "
          >
            <svg
              aria-hidden="true"
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </div>

      <InlineActionError message={combinedError} id={errorId} />
    </div>
  );
}

// ─── FavorsPanel ──────────────────────────────────────────────────────────────

export function FavorsPanel() {
  const { activeCharacter, updateField } = useCharacterStore();
  const [newFaction, setNewFaction] = useState("");
  const [addError, setAddError] = useState<string | null>(null);
  const addInputId = React.useId();
  const addErrorId = React.useId();

  if (!activeCharacter) return null;

  const characterId = activeCharacter.characterId;
  const favors: Record<string, number> = activeCharacter.favors ?? {};
  const entries = Object.entries(favors).sort(([a], [b]) =>
    a.localeCompare(b)
  );

  // Add a new faction via the gain-favor action
  const addAction = useActionButton(characterId);

  const handleAdd = async () => {
    const trimmed = newFaction.trim();
    if (!trimmed) {
      setAddError("Enter a faction or source name.");
      return;
    }
    if (favors[trimmed] !== undefined) {
      setAddError(`"${trimmed}" is already tracked.`);
      return;
    }
    setAddError(null);
    addAction.clearError();
    await addAction.fire("gain-favor", { factionId: trimmed });
    // fire() catches errors internally and sets inlineError state.
    // On success it resolves without throwing, so we can clear the input.
    // If it failed, inlineError will be set on the next render.
    setNewFaction("");
  };

  const handleAddKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAdd();
    }
  };

  // Remove a zero-count entry by optimistically updating local state
  const handleRemove = (factionId: string) => {
    const next = { ...favors };
    delete next[factionId];
    updateField("favors", next);
  };

  return (
    <section
      className="rounded-xl border border-[#577399]/30 bg-slate-900/80 p-5 shadow-card space-y-4"
      aria-label="Favors"
      data-field-key="favors"
    >
      {/* Header */}
      <h2 className="font-serif text-sm font-semibold uppercase tracking-widest text-[#577399]">
        Favors
      </h2>

      {/* SRD reference note */}
      <div className="rounded-lg border border-[#577399]/15 bg-[#577399]/5 px-3 py-2">
        <p className="text-xs leading-relaxed text-[#b9baa3] italic">
          Spend a Favor to make a reasonable request of a faction or adherent.
          +2 Attitude on the request. Retained if denied.
        </p>
      </div>

      {/* Favor entries */}
      {entries.length === 0 ? (
        <p className="text-sm text-[#b9baa3]/60 italic">
          No favors earned yet. Favors are earned narratively through faction
          interactions.
        </p>
      ) : (
        <div className="space-y-2">
          {entries.map(([factionId, count]) => (
            <FavorRow
              key={factionId}
              factionId={factionId}
              count={count}
              characterId={characterId}
              onRemove={handleRemove}
            />
          ))}
        </div>
      )}

      {/* Add new faction/source */}
      <div className="space-y-1.5">
        <label
          htmlFor={addInputId}
          className="text-xs font-semibold uppercase tracking-wider text-parchment-400"
        >
          Add Favor
        </label>
        <div className="flex gap-2">
          <input
            id={addInputId}
            type="text"
            value={newFaction}
            onChange={(e) => {
              setNewFaction(e.target.value);
              if (addError) setAddError(null);
            }}
            onKeyDown={handleAddKeyDown}
            placeholder="Faction or source name…"
            aria-describedby={addError || addAction.inlineError ? addErrorId : undefined}
            className="
              flex-1 min-w-0 rounded-lg border border-[#577399]/30 bg-slate-950
              px-3 py-2 text-sm text-[#f7f7ff] placeholder:text-[#b9baa3]/40
              focus:outline-none focus:ring-2 focus:ring-[#577399] focus:border-[#577399]
              transition-colors
            "
          />
          <button
            type="button"
            onClick={handleAdd}
            disabled={addAction.isPending}
            aria-busy={addAction.isPending}
            className="
              rounded-lg border border-[#577399]/40 bg-[#577399]/15 px-4 py-2
              text-sm font-semibold text-[#f7f7ff] whitespace-nowrap
              hover:bg-[#577399]/25 hover:border-[#577399]
              disabled:opacity-50 disabled:cursor-wait
              transition-all duration-150
              focus:outline-none focus:ring-2 focus:ring-[#577399] focus:ring-offset-1 focus:ring-offset-slate-900
            "
          >
            {addAction.isPending ? (
              <span
                aria-hidden="true"
                className="inline-block h-3 w-3 animate-spin rounded-full border border-current border-t-transparent"
              />
            ) : (
              "Add"
            )}
          </button>
        </div>

        {/* Inline errors for add row */}
        {(addError || addAction.inlineError) && (
          <p
            id={addErrorId}
            role="alert"
            aria-live="assertive"
            className="text-sm text-[#fe5f55] leading-snug"
          >
            {addError ?? addAction.inlineError}
          </p>
        )}
      </div>
    </section>
  );
}
