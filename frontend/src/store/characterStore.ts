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
import { queryClient } from "@/app/providers";

// ─── Auto-save coordination (module-level, non-reactive) ──────────────────────
// A single debounce timer + in-flight promise so field-edit auto-saves and
// server actions can coordinate: domain-card actions flush pending edits before
// firing so a stale debounced PATCH can't overwrite the action's result.

let saveTimer: ReturnType<typeof setTimeout> | null = null;
let inFlightSave: Promise<void> | null = null;

// ─── Dot-notation deep setter ─────────────────────────────────────────────────
// Supports paths like "stats.agility", "weapons.primary.name", etc.

function setNestedValue(
  obj: Record<string, unknown>,
  path: string,
  value: unknown
): Record<string, unknown> {
  const parts = path.split(".");
  const cloneValue = (input: unknown): unknown => {
    if (Array.isArray(input)) return [...input];
    if (input && typeof input === "object") {
      return { ...(input as Record<string, unknown>) };
    }
    return {};
  };

  const getContainerValue = (
    container: Record<string, unknown> | unknown[],
    key: string
  ): unknown => {
    if (Array.isArray(container)) {
      return container[Number(key)];
    }
    return container[key];
  };

  const setContainerValue = (
    container: Record<string, unknown> | unknown[],
    key: string,
    nextValue: unknown
  ) => {
    if (Array.isArray(container)) {
      container[Number(key)] = nextValue;
      return;
    }
    container[key] = nextValue;
  };

  const result = cloneValue(obj) as Record<string, unknown>;
  let current: Record<string, unknown> | unknown[] = result;

  for (let i = 0; i < parts.length - 1; i++) {
    const key = parts[i];
    const next = cloneValue(getContainerValue(current, key));
    setContainerValue(current, key, next);
    current = next as Record<string, unknown> | unknown[];
  }

  setContainerValue(current, parts[parts.length - 1], value);
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
  /** Add a user-created custom condition (name + optional description). */
  addCustomCondition: (name: string, description?: string) => void;
  /** Remove a custom condition by conditionId and deactivate it. */
  removeCustomCondition: (conditionId: string) => void;

  // ── Loadout management ─────────────────────────────────────────────────────
  /** Add a card to the active loadout (max 5 slots; no-op if already present). */
  addToLoadout: (cardId: string) => void;

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
  /** Debounce a save 1500ms after the last dirty change. */
  scheduleAutoSave: () => void;
  /** Cancel any pending debounced save. */
  cancelAutoSave: () => void;
  /**
   * Cancel the pending debounce and flush any dirty edits before a server
   * action fires, so a stale PATCH cannot overwrite the action's result.
   * Never throws — a failed flush only loses the pending edit, the action still
   * proceeds.
   */
  flushPendingSave: () => Promise<void>;
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

  // ── addCustomCondition ──────────────────────────────────────────────────────
  addCustomCondition: (name: string, description = "") => {
    const { activeCharacter } = get();
    if (!activeCharacter) return;

    const customConditions = activeCharacter.customConditions ?? [];
    // Prevent duplicates (case-insensitive name check)
    if (customConditions.some((c) => c.name.toLowerCase() === name.toLowerCase())) return;

    const conditionId = `custom-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const newCond = { conditionId, name, description, sourceCardId: null };

    set({
      activeCharacter: {
        ...activeCharacter,
        customConditions: [...customConditions, newCond],
      },
      isDirty: true,
    });
  },

  // ── removeCustomCondition ───────────────────────────────────────────────────
  removeCustomCondition: (conditionId: string) => {
    const { activeCharacter } = get();
    if (!activeCharacter) return;

    const customConditions = (activeCharacter.customConditions ?? []).filter(
      (c) => c.conditionId !== conditionId,
    );
    // Also remove from active conditions if it was toggled on
    const conditions = (activeCharacter.conditions ?? []).filter(
      (c) => c !== conditionId,
    );

    set({
      activeCharacter: { ...activeCharacter, customConditions, conditions },
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

  // NOTE: Loadout→vault moves are handled by the server action
  // "move-loadout-to-vault" (authoritative, idempotent, deactivates the card's
  // aura). The loadout is tier-locked (no reordering).

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
    const { activeCharacter } = get();
    if (!activeCharacter?.characterId) return;
    if (inFlightSave) return inFlightSave;

    const run = (async () => {
      set({ isSaving: true });
      try {
        const updated = await apiClient.patch<Character>(
          `/characters/${activeCharacter.characterId}`,
          activeCharacter
        );
        // Sync the TanStack cache (like useUpdateCharacter) + the store.
        queryClient.setQueryData(
          ["characters", "detail", activeCharacter.characterId],
          updated
        );
        set({ activeCharacter: updated, isDirty: false });
        queryClient.invalidateQueries({ queryKey: ["characters", "list"] });
      } finally {
        set({ isSaving: false });
        inFlightSave = null;
      }
    })();

    inFlightSave = run;
    return run;
  },

  // ── scheduleAutoSave ────────────────────────────────────────────────────────
  scheduleAutoSave: () => {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      saveTimer = null;
      const { activeCharacter, isDirty } = get();
      if (activeCharacter && isDirty) {
        void get().saveCharacter();
      }
    }, 1500);
  },

  // ── cancelAutoSave ──────────────────────────────────────────────────────────
  cancelAutoSave: () => {
    if (saveTimer) {
      clearTimeout(saveTimer);
      saveTimer = null;
    }
  },

  // ── flushPendingSave ────────────────────────────────────────────────────────
  flushPendingSave: async () => {
    if (saveTimer) {
      clearTimeout(saveTimer);
      saveTimer = null;
    }
    if (inFlightSave) {
      try {
        await inFlightSave;
      } catch {
        // A failed in-flight save should not block the action.
      }
      return;
    }
    if (get().isDirty) {
      try {
        await get().saveCharacter();
      } catch {
        // A failed flush only loses the pending edit; the action still proceeds.
      }
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
