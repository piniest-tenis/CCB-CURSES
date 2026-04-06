/**
 * src/hooks/useBuilderSessionStorage.ts
 *
 * Persists and rehydrates character-builder wizard state from sessionStorage so
 * that an accidental page refresh or navigate-away doesn't discard in-progress
 * choices.
 *
 * Key design notes:
 * - Storage key is scoped per character: `daggerheart-builder-{characterId}`
 *   so concurrent drafts for different characters don't collide.
 * - We only rehydrate if sessionStorage holds a draft *and* the character
 *   hasn't already completed the builder (i.e. it has no classId saved on the
 *   server yet).  If the character already has a classId the server data takes
 *   precedence, consistent with the existing recovery logic in the page.
 * - `clearSession()` should be called after a successful save so the draft
 *   doesn't reappear on the next visit.
 */

"use client";

import { useCallback, useEffect, useRef } from "react";
import type { TraitBonuses } from "@/components/character/TraitAssignmentPanel";
import type { StartingEquipmentSelections } from "@/components/character/StartingEquipmentPanel";
import type { Experience } from "@shared/types";

// ─── Persisted Shape ─────────────────────────────────────────────────────────

export interface BuilderDraft {
  step: number;
  classId: string;
  subclassId: string;
  ancestryId: string;
  communityId: string;
  traitBonuses: TraitBonuses;
  primaryWeaponId: string | null;
  secondaryWeaponId: string | null;
  armorId: string | null;
  equipmentSelections: StartingEquipmentSelections;
  selectedDomainCardIds: string[];
  experiences?: Experience[];
  heritageTab: "ancestry" | "community";
  characterName?: string;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

function storageKey(characterId: string) {
  return `daggerheart-builder-${characterId}`;
}

/**
 * Load a saved draft from sessionStorage for the given character.
 * Returns `null` if there is no draft or if parsing fails.
 */
export function loadBuilderDraft(characterId: string): BuilderDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(storageKey(characterId));
    if (!raw) return null;
    return JSON.parse(raw) as BuilderDraft;
  } catch {
    return null;
  }
}

/**
 * Hook that automatically writes the current builder wizard state to
 * sessionStorage on every change and exposes a `clearSession` callback to
 * wipe the draft after a successful save.
 *
 * @param characterId - The character being edited.
 * @param draft       - The current wizard state to persist.
 */
export function useBuilderSessionStorage(
  characterId: string,
  draft: BuilderDraft
): { clearSession: () => void } {
  // We use a ref to avoid re-registering the effect on every render.  We still
  // want the effect to fire whenever *draft* changes, so we pass it as a dep.
  const characterIdRef = useRef(characterId);
  characterIdRef.current = characterId;

  // Persist on every state change.
  useEffect(() => {
    if (!characterId) return;
    try {
      sessionStorage.setItem(storageKey(characterId), JSON.stringify(draft));
    } catch {
      // Quota exceeded or private-browsing restriction — fail silently.
    }
  }, [characterId, draft]);

  const clearSession = useCallback(() => {
    if (!characterIdRef.current) return;
    try {
      sessionStorage.removeItem(storageKey(characterIdRef.current));
    } catch {
      // ignore
    }
  }, []);

  return { clearSession };
}
