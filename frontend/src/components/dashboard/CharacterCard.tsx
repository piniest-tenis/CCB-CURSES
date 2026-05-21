"use client";

/**
 * src/components/dashboard/CharacterCard.tsx
 *
 * Portrait-first character tile for the dashboard grid.
 * Shows a 3:4 portrait image (or avatar / initial fallback) with a level
 * badge overlay, character name, class/subclass, and action buttons.
 *
 * The entire card is the "Open Sheet" trigger — individual action buttons
 * call e.stopPropagation() so they don't bubble up to the card click.
 */

import React, { useState, useEffect, useRef } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPencil,
  faBookmark,
  faTrash,
  faCheck,
  faXmark,
} from "@fortawesome/free-solid-svg-icons";
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
  if (diffDays < 7) return `Updated ${diffDays} days ago`;
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
  /** Whether this character has already been saved as a pregen. */
  isAlreadyPregen?: boolean;
  /** Callback to save this character as a pregen. Parent handles the fetch+create logic. */
  onSaveAsPregen?: () => Promise<void>;
}

export function CharacterCard({
  character,
  onOpen,
  onEdit,
  onDelete,
  isDeleting,
  isAlreadyPregen = false,
  onSaveAsPregen,
}: CharacterCardProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Refs for focus management in the confirm-delete flow
  const confirmButtonRef = useRef<HTMLButtonElement>(null);
  const confirmBarRef = useRef<HTMLDivElement>(null);

  // Reset "saved" flash after 2 seconds
  useEffect(() => {
    if (!saved) return;
    const timer = setTimeout(() => setSaved(false), 2000);
    return () => clearTimeout(timer);
  }, [saved]);

  // Move focus to the confirm button when the confirm bar appears
  useEffect(() => {
    if (confirmDelete) {
      confirmButtonRef.current?.focus();
    }
  }, [confirmDelete]);

  const handleSaveAsPregen = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onSaveAsPregen || saving || isAlreadyPregen) return;
    setSaving(true);
    try {
      await onSaveAsPregen();
      setSaved(true);
    } finally {
      setSaving(false);
    }
  };

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
      role="button"
      tabIndex={0}
      aria-label={`Open character sheet for ${character.name}`}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
        }
      }}
      className="
        group relative rounded-xl border border-[#577399]/30 bg-slate-900/80
        shadow-card-fantasy
        flex flex-col overflow-hidden
        cursor-pointer transition-all duration-200
        hover:shadow-card-fantasy-hover hover:border-[#577399]/60
        hover:ring-2 hover:ring-[#577399] hover:ring-offset-2 hover:ring-offset-slate-900
        hover:-translate-y-0.5
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f7f7ff]
        focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900
        active:scale-[0.99]
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
            <p
              className="text-xs text-amber-400/80 mt-0.5 truncate"
              title="Some homebrew content used by this character has been deleted"
            >
              Missing homebrew content
            </p>
          )}
          <p className="text-xs text-parchment-600 mt-0.5">
            {relativeDate(character.updatedAt)}
          </p>
        </div>
      </div>

      {/* Action bar — always visible at bottom of card */}
      {confirmDelete ? (
        /* Confirm state — replaces entire bar */
        <div
          ref={confirmBarRef}
          className="flex items-center justify-between px-4 py-3 border-t border-[#fe5f55]/40 bg-[#fe5f55]/5"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => {
            if (e.key === "Escape") setConfirmDelete(false);
          }}
        >
          <span className="text-xs text-[#fe5f55] font-medium truncate mr-2">
            Delete {character.name}?
          </span>
          <div className="flex items-center gap-2 shrink-0">
            <button
              ref={confirmButtonRef}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
                setConfirmDelete(false);
              }}
              disabled={isDeleting}
              aria-label={`Confirm delete ${character.name}`}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md text-[#fe5f55] bg-[#fe5f55]/10 border border-[#fe5f55] hover:bg-[#fe5f55]/20 disabled:opacity-50 disabled:cursor-wait transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#fe5f55]"
            >
              <FontAwesomeIcon icon={faCheck} className="w-3 h-3" />
              Delete
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setConfirmDelete(false);
              }}
              aria-label="Cancel delete"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md text-[#b9baa3] border border-slate-600 hover:border-[#f7f7ff] hover:text-[#f7f7ff] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#f7f7ff]"
            >
              <FontAwesomeIcon icon={faXmark} className="w-3 h-3" />
              Cancel
            </button>
          </div>
        </div>
      ) : (
        /* Normal state */
        <div
          className="flex items-center gap-2 px-4 py-3 border-t border-slate-700/60 bg-slate-900/40"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Left cluster: constructive actions */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            aria-label={`Edit ${character.name}`}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md text-[#b9baa3] border border-slate-600 hover:border-[#f7f7ff] hover:text-[#f7f7ff] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#f7f7ff]"
          >
            <FontAwesomeIcon icon={faPencil} className="w-3 h-3" />
            Edit
          </button>

          {onSaveAsPregen && (
            <button
              type="button"
              onClick={handleSaveAsPregen}
              disabled={saving || isAlreadyPregen || saved}
              aria-label={
                isAlreadyPregen || saved
                  ? `${character.name} is already saved as a pre-gen`
                  : `Save ${character.name} as a pre-gen`
              }
              className={[
                "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border transition-colors",
                "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#577399] [white-space:nowrap]",
                saving
                  ? "border-slate-700/60 text-[#b9baa3] opacity-60 cursor-wait"
                  : isAlreadyPregen || saved
                    ? "border-[#577399]/30 text-[#577399]/50 opacity-60 cursor-not-allowed"
                    : "border-[#577399]/50 text-[#577399] hover:border-[#577399] hover:bg-[#577399]/10",
              ].join(" ")}
            >
              {saving ? (
                <span
                  aria-hidden="true"
                  className="inline-block h-3 w-3 animate-spin rounded-full border border-current border-t-transparent"
                />
              ) : (
                <FontAwesomeIcon icon={faBookmark} className="w-3 h-3" />
              )}
              {saving
                ? "Saving..."
                : saved || isAlreadyPregen
                  ? "Saved"
                  : "Pre-gen"}
            </button>
          )}

          {/* Right cluster: destructive action */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setConfirmDelete(true);
            }}
            aria-label={`Delete ${character.name}`}
            className="ml-auto flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md text-[#fe5f55]/70 border border-[#fe5f55]/30 hover:border-[#fe5f55] hover:text-[#fe5f55] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#fe5f55]"
          >
            <FontAwesomeIcon icon={faTrash} className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  );
}
