/**
 * src/hooks/useCampaignNav.ts
 *
 * URL-search-param–driven navigation state for the Campaign Detail page.
 *
 * Encodes three pieces of GM session state as query parameters so that the
 * browser back / forward buttons retrace every navigation step:
 *
 *   ?tab=characters&character=abc123&view=full
 *
 * - tab       — CampaignTab  ("command" | "characters" | "adversaries" | "encounter" | "environments")
 * - character — selected character ID (omitted when null)
 * - view      — "full" when mobile full-sheet is shown (omitted otherwise)
 *
 * Navigation helpers push new history entries by default, allowing the user to
 * press Back to return to the previous state.
 */

import { useSearchParams, usePathname, useRouter } from "next/navigation";
import { useCallback, useMemo } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

export type CampaignTab = "command" | "characters" | "adversaries" | "encounter" | "environments";

const VALID_TABS = new Set<CampaignTab>(["command", "characters", "adversaries", "encounter", "environments"]);

function isValidTab(v: string | null): v is CampaignTab {
  return v !== null && VALID_TABS.has(v as CampaignTab);
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
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  // ── Read state from URL ─────────────────────────────────────────────────────

  const activeTab: CampaignTab = useMemo(() => {
    const raw = searchParams.get("tab");
    return isValidTab(raw) ? raw : "command";
  }, [searchParams]);

  const selectedCharacterId = searchParams.get("character") ?? null;

  const showFullSheet = searchParams.get("view") === "full";

  // ── Helpers ─────────────────────────────────────────────────────────────────

  /**
   * Build a new URL string from the current pathname + the given params.
   * Omits keys whose value is null/undefined/empty to keep URLs clean.
   */
  const buildUrl = useCallback(
    (overrides: { tab?: CampaignTab; character?: string | null; view?: string | null }) => {
      const params = new URLSearchParams(searchParams.toString());

      for (const [key, value] of Object.entries(overrides)) {
        if (value === null || value === undefined || value === "") {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      }

      // Clean up defaults: omit tab=command (it's the default)
      if (params.get("tab") === "command") params.delete("tab");
      // Omit view unless it's "full"
      if (params.get("view") !== "full") params.delete("view");

      const qs = params.toString();
      return qs ? `${pathname}?${qs}` : pathname ?? "";
    },
    [searchParams, pathname]
  );

  // ── Navigation actions ──────────────────────────────────────────────────────

  const setActiveTab = useCallback(
    (tab: CampaignTab) => {
      // When switching tabs, clear character selection and full-sheet view.
      // The user can press Back to return to whatever they had before.
      router.push(buildUrl({ tab, character: null, view: null }));
    },
    [router, buildUrl]
  );

  const setSelectedCharacter = useCallback(
    (id: string | null) => {
      // Selecting a character resets full-sheet view (condensed first on mobile).
      router.push(buildUrl({ character: id, view: null }));
    },
    [router, buildUrl]
  );

  const setShowFullSheet = useCallback(
    (show: boolean) => {
      router.push(buildUrl({ view: show ? "full" : null }));
    },
    [router, buildUrl]
  );

  const navigateToCharacter = useCallback(
    (charId: string) => {
      router.push(buildUrl({ tab: "characters", character: charId, view: null }));
    },
    [router, buildUrl]
  );

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
