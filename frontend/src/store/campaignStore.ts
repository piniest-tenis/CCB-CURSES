/**
 * src/store/campaignStore.ts
 *
 * Zustand store for campaign-session state.
 *
 * Only tracks which campaign is currently active — used by WebSocket,
 * dice BroadcastChannel, and other non-visual systems.
 *
 * Tab navigation, character selection, and full-sheet state have been
 * moved to URL search params via useCampaignNav so that the browser
 * back / forward buttons work.
 */

import { create } from "zustand";

// ─── Types ────────────────────────────────────────────────────────────────────

interface CampaignState {
  activeCampaignId: string | null;
}

interface CampaignActions {
  setActiveCampaign: (id: string | null) => void;
  clearCampaignSession: () => void;
}

export type CampaignStore = CampaignState & CampaignActions;

// ─── Store ────────────────────────────────────────────────────────────────────

export const useCampaignStore = create<CampaignStore>((set) => ({
  activeCampaignId: null,

  setActiveCampaign: (id) => set({ activeCampaignId: id }),

  clearCampaignSession: () => set({ activeCampaignId: null }),
}));
