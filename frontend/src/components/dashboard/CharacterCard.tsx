"use client";

/**
 * src/components/dashboard/CharacterCard.tsx
 *
 * Portrait-first character tile for the dashboard grid.
 * Shows a 3:4 portrait image (or avatar / initial fallback) with a level
 * badge overlay, character name, class/subclass, and action buttons.
 */

import React, { useState } from "react";
import type { CharacterSummary } from "@shared/types";
import { isHomebrewId } from "@/lib/homebrewUtils";

// ─── helpers ──────────────────────────────────────────────────────────────────

function relativeDate(iso: string): string {
  const now = Date.now();
  const then = new Date(iso).getTime();
  const diffMs = now - then;
  const diffDays = Math.floor(diffMs / 86_400_000);

  if (diffDays === 0) return "Updated today";
  if (diffDays === 1) return "Updated yesterday";
  if (diffDays < 7)  return `Updated ${diffDays} days ago`;
  if (diffDays < 30) return `Updated ${Math.floor(diffDays / 7)} wk ago`;
  return `Updated ${Math.floor(diffDays / 30)} mo ago`;
}

// ─── CharacterCard ────────────────────────────────────────────────────────────

interface CharacterCardProps {
  character: CharacterSummary;
  onOpen: () => void;
  onEdit: () => void;
  onDelete: () => void;
  isDeleting: boolean;
}

export function CharacterCard({
  character,
  onOpen,
  onEdit,
  onDelete,
  isDeleting,
}: CharacterCardProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  const portraitSrc = character.portraitUrl ?? character.avatarUrl ?? null;
  const initial = character.name.charAt(0).toUpperCase();

  const subtitle = [character.className, character.subclassName]
    .filter(Boolean)
    .join(" · ");

  const meta = [character.ancestryName, character.communityName]
    .filter(Boolean)
    .join(" · ");

  // Check if any denormalized name is actually a raw homebrew ID (backend fallback
  // when the referenced homebrew has been deleted)
  const hasDeletedHomebrew =
    isHomebrewId(character.className) ||
    isHomebrewId(character.ancestryName) ||
    isHomebrewId(character.communityName);

  return (
    <div
      className="
        group relative rounded-xl border border-[#577399]/30 bg-slate-900/80
        shadow-card-fantasy hover:shadow-card-fantasy-hover
        hover:border-[#577399]/60 transition-all duration-200
        flex flex-col overflow-hidden
      "
    >
      {/* Portrait */}
      <div className="relative aspect-[3/4] w-full overflow-hidden bg-slate-800">
        {portraitSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={portraitSrc}
            alt={character.name}
            className="h-full w-full object-cover group-hover:scale-[1.02] transition-transform duration-500"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-b from-slate-800 to-slate-900">
            <span className="text-6xl font-bold text-[#577399]/30 select-none">
              {initial}
            </span>
          </div>
        )}

        {/* Gradient overlay at bottom of portrait */}
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-slate-900/90 to-transparent pointer-events-none" />

        {/* Level badge */}
        <span
          className="
            absolute top-2.5 right-2.5
            rounded-full border border-[#577399]/60 bg-[#0a100d]/80
            backdrop-blur-sm px-2.5 py-1 text-xs font-bold text-[#577399]
          "
        >
          Lv {character.level}
        </span>
      </div>

      {/* Card body */}
      <div className="flex flex-col gap-3 p-4">
        <div>
          <h3 className="font-serif text-base font-semibold text-[#f7f7ff] truncate">
            {character.name}
          </h3>
          {subtitle && (
            <p className="text-xs text-parchment-500 truncate">{subtitle}</p>
          )}
          {meta && (
            <p className="text-xs text-parchment-600 mt-0.5 truncate">{meta}</p>
          )}
          {hasDeletedHomebrew && (
            <p className="text-xs text-amber-400/80 mt-0.5 truncate" title="Some homebrew content used by this character has been deleted">
              Missing homebrew content
            </p>
          )}
          <p className="text-xs text-parchment-600 mt-0.5">
            {relativeDate(character.updatedAt)}
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={onOpen}
            aria-label={`Open character sheet for ${character.name}`}
            className="
              flex-1 rounded-lg py-2 text-sm font-semibold
              bg-[#577399] text-[#f7f7ff] hover:bg-[#577399]/80
              transition-colors shadow-sm
              focus:outline-none focus:ring-2 focus:ring-[#577399] focus:ring-offset-2 focus:ring-offset-slate-900
            "
          >
            Open Sheet
          </button>

          <button
            onClick={onEdit}
            aria-label={`Edit ${character.name}`}
            className="
              rounded-lg px-3 py-2 text-sm font-semibold
              border border-gold-800/60 bg-gold-950/20 text-gold-300
              hover:bg-gold-900/30 hover:border-gold-700
              transition-colors
              focus:outline-none focus:ring-2 focus:ring-gold-500
            "
          >
            Edit
          </button>

          {confirmDelete ? (
            <div className="flex gap-1">
              <button
                onClick={() => { onDelete(); setConfirmDelete(false); }}
                disabled={isDeleting}
                aria-label={`Confirm delete ${character.name}`}
                className="
                  rounded-lg px-2.5 py-2 text-xs font-semibold
                  bg-[#fe5f55]/20 text-[#fe5f55] hover:bg-[#fe5f55]/30
                  disabled:opacity-50 transition-colors
                  focus:outline-none focus:ring-2 focus:ring-[#fe5f55]
                "
              >
                {isDeleting ? "…" : "OK"}
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                aria-label="Cancel delete"
                className="
                  rounded-lg px-2 py-2 text-xs
                  bg-slate-800 text-parchment-500 hover:bg-slate-700
                  transition-colors
                  focus:outline-none focus:ring-2 focus:ring-slate-500
                "
              >
                ✕
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              className="
                rounded-lg px-3 py-2 text-xs
                border border-slate-700 text-parchment-600
                hover:border-[#fe5f55]/50 hover:text-[#fe5f55]/70
                transition-colors
                focus:outline-none focus:ring-2 focus:ring-[#fe5f55]/50
              "
              aria-label={`Delete ${character.name}`}
            >
              ✕
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
