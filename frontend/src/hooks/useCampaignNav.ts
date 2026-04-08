/**
 * src/hooks/useCampaignNav.ts
 *
 * Client-side navigation state for the Campaign Detail page.
 *
 * Uses React `useState` + `history.pushState()` instead of Next.js
 * `router.push()` to avoid full navigation cycles, Suspense boundary
 * flashes, and unnecessary re-renders from `useSearchParams()`.
 *
 * Encodes three pieces of GM session state as query parameters so that
 * the browser back / forward buttons retrace every navigation step:
 *
 *   ?tab=characters&character=abc123&view=full
 *
 * - tab       — CampaignTab  ("command" | "characters" | "adversaries" | "encounter" | "environments")
 * - character — selected character ID (omitted when null)
 * - view      — "full" when mobile full-sheet is shown (omitted otherwise)
 */

import { useCallback, useEffect, useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

export type CampaignTab = "command" | "characters" | "adversaries" | "encounter" | "environments" | "frames";

const VALID_TABS = new Set<CampaignTab>(["command", "characters", "adversaries", "encounter", "environments", "frames"]);

function isValidTab(v: string | null): v is CampaignTab {
  return v !== null && VALID_TABS.has(v as CampaignTab);
}

// ─── URL helpers ──────────────────────────────────────────────────────────────

interface NavState {
  tab: CampaignTab;
  character: string | null;
  view: boolean;
}

/** Parse navigation state from a URLSearchParams instance. */
function parseParams(params: URLSearchParams): NavState {
  const rawTab = params.get("tab");
  return {
    tab: isValidTab(rawTab) ? rawTab : "command",
    character: params.get("character") ?? null,
    view: params.get("view") === "full",
  };
}

/** Parse navigation state from the current window.location.search. */
function parseCurrentUrl(): NavState {
  if (typeof window === "undefined") {
    return { tab: "command", character: null, view: false };
  }
  return parseParams(new URLSearchParams(window.location.search));
}

/**
 * Build a URL string from the current pathname + the given nav state.
 * Omits keys whose value is the default to keep URLs clean.
 */
function buildUrl(state: NavState): string {
  const pathname = typeof window !== "undefined" ? window.location.pathname : "";
  const params = new URLSearchParams();

  // Only include tab if not the default ("command")
  if (state.tab !== "command") {
    params.set("tab", state.tab);
  }

  // Only include character if set
  if (state.character) {
    params.set("character", state.character);
  }

  // Only include view if "full"
  if (state.view) {
    params.set("view", "full");
  }

  const qs = params.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export interface CampaignNav {
  /** Current active tab (defaults to "command"). */
  activeTab: CampaignTab;
  /** Currently selected character ID, or null. */
  selectedCharacterId: string | null;
  /** Whether mobile full-sheet view is active. */
  showFullSheet: boolean;

  /** Switch the active GM tab. Pushes a new history entry. */
  setActiveTab: (tab: CampaignTab) => void;
  /** Select a character (or null to deselect). Pushes a new history entry. */
  setSelectedCharacter: (id: string | null) => void;
  /** Toggle or set the mobile full-sheet view. Pushes a new history entry. */
  setShowFullSheet: (show: boolean) => void;

  /**
   * Navigate to a character's sheet (selects character + switches to
   * "characters" tab). Pushes a single history entry.
   */
  navigateToCharacter: (charId: string) => void;
}

export function useCampaignNav(): CampaignNav {
  // ── React state, initialized from the current URL ───────────────────────────

  const [activeTab, setActiveTabState] = useState<CampaignTab>(() => parseCurrentUrl().tab);
  const [selectedCharacterId, setSelectedCharacterState] = useState<string | null>(
    () => parseCurrentUrl().character
  );
  const [showFullSheet, setShowFullSheetState] = useState<boolean>(() => parseCurrentUrl().view);

  // ── Internal: update URL via history.pushState ──────────────────────────────

  const pushState = useCallback((state: NavState) => {
    const url = buildUrl(state);
    const historyState = {
      tab: state.tab,
      character: state.character,
      view: state.view,
    };
    history.pushState(historyState, "", url);
  }, []);

  // ── Navigation actions ──────────────────────────────────────────────────────

  const setActiveTab = useCallback(
    (tab: CampaignTab) => {
      // When switching tabs, clear character selection and full-sheet view.
      const state: NavState = { tab, character: null, view: false };
      setActiveTabState(tab);
      setSelectedCharacterState(null);
      setShowFullSheetState(false);
      pushState(state);
    },
    [pushState]
  );

  const setSelectedCharacter = useCallback(
    (id: string | null) => {
      // Selecting a character resets full-sheet view (condensed first on mobile).
      setSelectedCharacterState(id);
      setShowFullSheetState(false);
      // Read current tab from a function updater to avoid stale closures
      setActiveTabState((currentTab) => {
        const state: NavState = { tab: currentTab, character: id, view: false };
        pushState(state);
        return currentTab;
      });
    },
    [pushState]
  );

  const setShowFullSheet = useCallback(
    (show: boolean) => {
      setShowFullSheetState(show);
      // Read current tab and character to avoid stale closures
      setActiveTabState((currentTab) => {
        setSelectedCharacterState((currentChar) => {
          const state: NavState = { tab: currentTab, character: currentChar, view: show };
          pushState(state);
          return currentChar;
        });
        return currentTab;
      });
    },
    [pushState]
  );

  const navigateToCharacter = useCallback(
    (charId: string) => {
      const state: NavState = { tab: "characters", character: charId, view: false };
      setActiveTabState("characters");
      setSelectedCharacterState(charId);
      setShowFullSheetState(false);
      pushState(state);
    },
    [pushState]
  );

  // ── Listen for popstate (browser back/forward) ──────────────────────────────

  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      // Prefer state from the history entry, fall back to parsing the URL
      let nav: NavState;
      if (event.state && typeof event.state.tab === "string") {
        nav = {
          tab: isValidTab(event.state.tab) ? event.state.tab : "command",
          character: event.state.character ?? null,
          view: !!event.state.view,
        };
      } else {
        nav = parseCurrentUrl();
      }

      setActiveTabState(nav.tab);
      setSelectedCharacterState(nav.character);
      setShowFullSheetState(nav.view);
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  return {
    activeTab,
    selectedCharacterId,
    showFullSheet,
    setActiveTab,
    setSelectedCharacter,
    setShowFullSheet,
    navigateToCharacter,
  };
}
