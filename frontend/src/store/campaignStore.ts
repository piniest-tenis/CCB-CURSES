/**
 * src/store/campaignStore.ts
 *
 * Zustand store for campaign-session state.
 * Tracks which campaign is active and which character is selected in the
 * Campaign Detail view. Intentionally lightweight — all server state lives
 * in TanStack Query.
 */

import { create } from "zustand";

// ─── Types ────────────────────────────────────────────────────────────────────

interface CampaignState {
  activeCampaignId:    string | null;
  selectedCharacterId: string | null;
}

interface CampaignActions {
  setActiveCampaign:    (id: string | null) => void;
  setSelectedCharacter: (id: string | null) => void;
  clearCampaignSession: () => void;
}

export type CampaignStore = CampaignState & CampaignActions;

// ─── Store ────────────────────────────────────────────────────────────────────

export const useCampaignStore = create<CampaignStore>((set) => ({
  // ── State ────────────────────────────────────────────────────────────────
  activeCampaignId:    null,
  selectedCharacterId: null,

  // ── Actions ──────────────────────────────────────────────────────────────
  setActiveCampaign: (id) => set({ activeCampaignId: id }),

  setSelectedCharacter: (id) => set({ selectedCharacterId: id }),

  clearCampaignSession: () =>
    set({ activeCampaignId: null, selectedCharacterId: null }),
}));
