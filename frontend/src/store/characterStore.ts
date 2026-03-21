/**
 * src/store/characterStore.ts
 *
 * Zustand store for active character sheet editing.
 * Supports dot-notation field updates, tracker mutations, condition toggles,
 * loadout management (max 5), vault management, and debounced auto-save
 * via PATCH /characters/{id}.
 *
 * Also exposes applyAction() which calls POST /characters/{id}/actions
 * and merges the returned character state into the store.
 */

import { create } from "zustand";
import type { Character, CoreStatName, CharacterTrackers } from "@shared/types";
import { apiClient, ApiError } from "@/lib/api";

// ─── Dot-notation deep setter ─────────────────────────────────────────────────
// Supports paths like "stats.agility", "weapons.primary.name", etc.

function setNestedValue(
  obj: Record<string, unknown>,
  path: string,
  value: unknown
): Record<string, unknown> {
  const parts = path.split(".");
  const result = { ...obj };
  let current: Record<string, unknown> = result;

  for (let i = 0; i < parts.length - 1; i++) {
    const key = parts[i];
    current[key] = { ...(current[key] as Record<string, unknown>) };
    current = current[key] as Record<string, unknown>;
  }

  current[parts[parts.length - 1]] = value;
  return result;
}

// ─── Action result ────────────────────────────────────────────────────────────

export interface ActionResult {
  /** The updated character returned by the server after the action. */
  character: Character;
}

/**
 * The discriminated-union result type returned by `applyAction`.
 * Callers can use `if (result.ok)` to branch without catching exceptions.
 */
export type ApplyActionResult =
  | { ok: true }
  | { ok: false; message: string };

// ─── Interface ────────────────────────────────────────────────────────────────

export interface CharacterStore {
  activeCharacter: Character | null;
  /** True when local state differs from last-saved server state. */
  isDirty: boolean;
  /** True while a PATCH request is in-flight. */
  isSaving: boolean;

  // ── Lifecycle ──────────────────────────────────────────────────────────────
  /** Load a character into the store and mark it clean. */
  setCharacter: (char: Character) => void;
  /** Mark the store as clean without saving (e.g. after server confirms). */
  markClean: () => void;

  // ── Field updates ──────────────────────────────────────────────────────────
  /** Update any character field by dot-notation path, e.g. "stats.agility". */
  updateField: (path: string, value: unknown) => void;
  /** Update a core stat value (clamped 0–8). */
  updateStat: (stat: CoreStatName, value: number) => void;
  /** Update a tracker's "marked" or "max" field (clamped ≥ 0). */
  updateTracker: (
    tracker: keyof CharacterTrackers,
    field: "marked" | "max",
    value: number
  ) => void;
  /** Update the hope value (clamped 0–6). */
  updateHope: (value: number) => void;

  // ── Conditions ─────────────────────────────────────────────────────────────
  /** Toggle a condition string on/off. */
  toggleCondition: (condition: string) => void;

  // ── Loadout management ─────────────────────────────────────────────────────
  /** Add a card to the active loadout (max 5 slots; no-op if already present). */
  addToLoadout: (cardId: string) => void;
  /** Remove a card from the active loadout by cardId. */
  removeFromLoadout: (cardId: string) => void;
  /** Swap the positions of two loadout slots by their indices. */
  reorderLoadout: (fromIndex: number, toIndex: number) => void;

  // ── Vault management ───────────────────────────────────────────────────────
  /** Add a card to the domain vault (no-op if already present). */
  addToVault: (cardId: string) => void;

  // ── Server actions ─────────────────────────────────────────────────────────
  /**
   * POST /characters/{characterId}/actions with { actionId, params }.
   * On success:  merges the returned character into the store and returns { ok: true }.
   * On 422 / any error: returns { ok: false, message } — never re-throws.
   * This lets callers display inline errors without a try/catch.
   */
  applyAction: (
    characterId: string,
    actionId: string,
    params?: Record<string, unknown>
  ) => Promise<ApplyActionResult>;

  // ── Persistence ────────────────────────────────────────────────────────────
  /** PATCH the character to the server with the full current state. */
  saveCharacter: () => Promise<void>;
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useCharacterStore = create<CharacterStore>()((set, get) => ({
  activeCharacter: null,
  isDirty:         false,
  isSaving:        false,

  // ── setCharacter ────────────────────────────────────────────────────────────
  setCharacter: (char: Character) => {
    set({ activeCharacter: char, isDirty: false, isSaving: false });
  },

  // ── markClean ───────────────────────────────────────────────────────────────
  markClean: () => set({ isDirty: false }),

  // ── updateField ─────────────────────────────────────────────────────────────
  updateField: (path: string, value: unknown) => {
    const { activeCharacter } = get();
    if (!activeCharacter) return;

    const updated = setNestedValue(
      activeCharacter as unknown as Record<string, unknown>,
      path,
      value
    ) as unknown as Character;

    set({ activeCharacter: updated, isDirty: true });
  },

  // ── updateStat ──────────────────────────────────────────────────────────────
  updateStat: (stat: CoreStatName, value: number) => {
    const { activeCharacter } = get();
    if (!activeCharacter) return;

    // SRD page 3: starting traits range from -1 to +2; -5 floor allows penalty modifiers.
    const clamped = Math.max(-5, Math.min(8, value));
    set({
      activeCharacter: {
        ...activeCharacter,
        stats: { ...activeCharacter.stats, [stat]: clamped },
      },
      isDirty: true,
    });
  },

  // ── updateTracker ────────────────────────────────────────────────────────────
  updateTracker: (
    tracker: keyof CharacterTrackers,
    field: "marked" | "max",
    value: number
  ) => {
    const { activeCharacter } = get();
    if (!activeCharacter) return;

    const existing = activeCharacter.trackers[tracker];
    const clamped  = Math.max(0, value);

    // If changing max, ensure marked doesn't exceed new max
    const newMarked =
      field === "max"
        ? Math.min(existing.marked, clamped)
        : Math.min(clamped, existing.max);

    set({
      activeCharacter: {
        ...activeCharacter,
        trackers: {
          ...activeCharacter.trackers,
          [tracker]: {
            max:    field === "max"    ? clamped    : existing.max,
            marked: field === "marked" ? newMarked  : Math.min(existing.marked, clamped),
          },
        },
      },
      isDirty: true,
    });
  },

  // ── updateHope ───────────────────────────────────────────────────────────────
  updateHope: (value: number) => {
    const { activeCharacter } = get();
    if (!activeCharacter) return;

    const hopeMax = activeCharacter.hopeMax ?? 6;
    const clamped = Math.max(0, Math.min(hopeMax, value));
    set({
      activeCharacter: { ...activeCharacter, hope: clamped },
      isDirty: true,
    });
  },

  // ── toggleCondition ─────────────────────────────────────────────────────────
  toggleCondition: (condition: string) => {
    const { activeCharacter } = get();
    if (!activeCharacter) return;

    const conditions = activeCharacter.conditions ?? [];
    const next = conditions.includes(condition)
      ? conditions.filter((c) => c !== condition)
      : [...conditions, condition];

    set({
      activeCharacter: { ...activeCharacter, conditions: next },
      isDirty: true,
    });
  },

  // ── addToLoadout ─────────────────────────────────────────────────────────────
  addToLoadout: (cardId: string) => {
    const { activeCharacter } = get();
    if (!activeCharacter) return;

    const { domainLoadout } = activeCharacter;
    if (domainLoadout.length >= 5)           return; // max 5
    if (domainLoadout.includes(cardId))      return; // already present

    set({
      activeCharacter: {
        ...activeCharacter,
        domainLoadout: [...domainLoadout, cardId],
      },
      isDirty: true,
    });
  },

  // ── removeFromLoadout ────────────────────────────────────────────────────────
  removeFromLoadout: (cardId: string) => {
    const { activeCharacter } = get();
    if (!activeCharacter) return;

    set({
      activeCharacter: {
        ...activeCharacter,
        domainLoadout: activeCharacter.domainLoadout.filter((id) => id !== cardId),
      },
      isDirty: true,
    });
  },

  // ── reorderLoadout ───────────────────────────────────────────────────────────
  reorderLoadout: (fromIndex: number, toIndex: number) => {
    const { activeCharacter } = get();
    if (!activeCharacter) return;

    const loadout = [...activeCharacter.domainLoadout];
    if (
      fromIndex < 0 || fromIndex >= loadout.length ||
      toIndex   < 0 || toIndex   >= loadout.length
    ) return;

    const [moved] = loadout.splice(fromIndex, 1);
    loadout.splice(toIndex, 0, moved);

    set({
      activeCharacter: { ...activeCharacter, domainLoadout: loadout },
      isDirty: true,
    });
  },

  // ── addToVault ───────────────────────────────────────────────────────────────
  addToVault: (cardId: string) => {
    const { activeCharacter } = get();
    if (!activeCharacter) return;

    if (activeCharacter.domainVault.includes(cardId)) return;

    set({
      activeCharacter: {
        ...activeCharacter,
        domainVault: [...activeCharacter.domainVault, cardId],
      },
      isDirty: true,
    });
  },

  // ── saveCharacter ────────────────────────────────────────────────────────────
  saveCharacter: async () => {
    const { activeCharacter, isSaving } = get();
    if (!activeCharacter?.characterId) return;
    if (isSaving) return; // Prevent overlapping saves

    set({ isSaving: true });
    try {
      const updated = await apiClient.patch<Character>(
        `/characters/${activeCharacter.characterId}`,
        activeCharacter
      );
      // Sync store with server's authoritative response
      set({ activeCharacter: updated, isDirty: false });
    } finally {
      set({ isSaving: false });
    }
  },

  // ── applyAction ──────────────────────────────────────────────────────────────
  applyAction: async (
    characterId: string,
    actionId: string,
    params?: Record<string, unknown>
  ): Promise<ApplyActionResult> => {
    try {
      // POST the action — on success the server returns { character: Character }
      const result = await apiClient.post<ActionResult>(
        `/characters/${characterId}/actions`,
        { actionId, ...(params ? { params } : {}) }
      );
      // Merge the authoritative server state back into the store.
      // We do NOT mark isDirty=true here because the server is the source of truth.
      set({ activeCharacter: result.character, isDirty: false });
      return { ok: true };
    } catch (err) {
      // Return a structured error instead of re-throwing, so callers can
      // display inline errors without a try/catch.
      if (err instanceof ApiError) {
        return { ok: false, message: err.message };
      }
      if (err instanceof Error) {
        return { ok: false, message: err.message };
      }
      return { ok: false, message: "An unexpected error occurred." };
    }
  },
}));
