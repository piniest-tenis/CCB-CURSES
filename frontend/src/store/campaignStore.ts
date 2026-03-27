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

/** Tabs available in the Campaign Detail main content area. */
export type CampaignTab = "characters" | "adversaries" | "encounter";

interface CampaignState {
  activeCampaignId:    string | null;
  selectedCharacterId: string | null;
  /** Currently active tab in the Campaign Detail main panel (GM only). */
  activeTab:           CampaignTab;
}

interface CampaignActions {
  setActiveCampaign:    (id: string | null) => void;
  setSelectedCharacter: (id: string | null) => void;
  setActiveTab:         (tab: CampaignTab) => void;
  clearCampaignSession: () => void;
}

export type CampaignStore = CampaignState & CampaignActions;

// ─── Store ────────────────────────────────────────────────────────────────────

export const useCampaignStore = create<CampaignStore>((set) => ({
  // ── State ────────────────────────────────────────────────────────────────
  activeCampaignId:    null,
  selectedCharacterId: null,
  activeTab:           "characters",

  // ── Actions ──────────────────────────────────────────────────────────────
  setActiveCampaign: (id) => set({ activeCampaignId: id }),

  setSelectedCharacter: (id) => set({ selectedCharacterId: id }),

  setActiveTab: (tab) => set({ activeTab: tab }),

  clearCampaignSession: () =>
    set({ activeCampaignId: null, selectedCharacterId: null, activeTab: "characters" }),
}));
