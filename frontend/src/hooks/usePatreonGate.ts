/**
 * src/hooks/usePatreonGate.ts
 *
 * Central hook for determining Patreon-gated feature access.
 * Derives permissions from the authenticated user's profile:
 *   - `canSave`:            Legacy alias for canLevelUp (save is no longer gated).
 *   - `canLevelUp`:         Can the user level up characters? (free+ Patreon or grandfathered)
 *   - `canAccessCampaigns`: Can the user access campaigns, dice colors, and sessions?
 *   - `isGrandfathered`:    Was the account created before the Patreon gate cutoff?
 *   - `hasPatreon`:         Has the user linked a Patreon account (any tier)?
 *   - `isPaidPatron`:       Is the user an active paid patron?
 *   - `needsPatreon`:       Should the Patreon CTA banner be shown?
 *
 * Usage:
 *   const { canLevelUp, needsPatreon } = usePatreonGate();
 */

import { useCallback, useMemo, useState } from "react";
import { useAuthStore } from "@/store/authStore";
import { apiClient } from "@/lib/api";
import type { PatreonMembershipStatus } from "@shared/types";

// ─── Cutoff Date ──────────────────────────────────────────────────────────────
// Must match the backend PATREON_GATE_CUTOFF_DATE env var.
// Set to the deployment date. All accounts created before this are exempt.

const PATREON_GATE_CUTOFF_DATE =
  process.env.NEXT_PUBLIC_PATREON_GATE_CUTOFF_DATE ?? "1970-01-01T00:00:00.000Z";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PatreonGate {
  /**
   * True if the user can level up characters (grandfathered OR free+ Patreon member).
   * Saving is no longer gated — this is the primary Patreon permission.
   */
  canLevelUp: boolean;
  /**
   * @deprecated Use `canLevelUp` instead. Kept for backward compat with PatreonSaveGate.
   * Alias for canLevelUp (save is no longer gated behind Patreon).
   */
  canSave: boolean;
  /**
   * True if the user can create unlimited characters. False for non-Patreon,
   * non-grandfathered users who are subject to the FREE_CHARACTER_LIMIT.
   */
  hasUnlimitedCharacters: boolean;
  /**
   * True if the user can access campaigns, dice colors, and session scheduling.
   * Currently requires a paid Patreon tier (to be configured later).
   * Grandfathered users also get access.
   */
  canAccessCampaigns: boolean;
  /** True if the user's account predates the Patreon gate cutoff. */
  isGrandfathered: boolean;
  /** True if the user has linked any Patreon account with at least "free" membership. */
  hasPatreon: boolean;
  /** True if the user is an active paid patron. */
  isPaidPatron: boolean;
  /**
   * True if the CTA banner should be shown (user is authenticated but cannot level up).
   * False for unauthenticated users (they see the login page instead).
   */
  needsPatreon: boolean;
  /**
   * True if the paid-tier overlay should be shown on campaign controls
   * (user has Patreon but is on the free tier, NOT grandfathered).
   */
  needsPaidTier: boolean;
  /** The user's Patreon membership status, or null if not linked. */
  membershipStatus: PatreonMembershipStatus | null;
  /** Patreon tier title for paid patrons, or null. */
  tierTitle: string | null;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function usePatreonGate(): PatreonGate {
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  return useMemo<PatreonGate>(() => {
    // Not logged in — everything is false, no CTA
    if (!isAuthenticated || !user) {
      return {
        canLevelUp: false,
        canSave: false,
        hasUnlimitedCharacters: false,
        canAccessCampaigns: false,
        isGrandfathered: false,
        hasPatreon: false,
        isPaidPatron: false,
        needsPatreon: false,
        needsPaidTier: false,
        membershipStatus: null,
        tierTitle: null,
      };
    }

    const isGrandfathered =
      new Date(user.createdAt) < new Date(PATREON_GATE_CUTOFF_DATE);

    const patreon = user.patreon;
    const membershipStatus = patreon?.membershipStatus ?? null;
    const hasPatreon =
      membershipStatus === "free" || membershipStatus === "active_patron";
    const isPaidPatron = membershipStatus === "active_patron";

    // Can level up: grandfathered OR has at least a free Patreon membership
    // (Saving is no longer gated — all authenticated users can save.)
    const canLevelUp = isGrandfathered || hasPatreon;

    // Can access campaigns: grandfathered OR paid patron
    // (Tier-specific unlocks will be added later)
    const canAccessCampaigns = isGrandfathered || isPaidPatron;

    // Show CTA: authenticated, not grandfathered, and no valid Patreon
    const needsPatreon = !isGrandfathered && !hasPatreon;

    // Show paid-tier overlay: has Patreon (free), not grandfathered, not paid
    const needsPaidTier = !isGrandfathered && hasPatreon && !isPaidPatron;

    return {
      canLevelUp,
      canSave: canLevelUp, // backward-compat alias
      hasUnlimitedCharacters: isGrandfathered || hasPatreon,
      canAccessCampaigns,
      isGrandfathered,
      hasPatreon,
      isPaidPatron,
      needsPatreon,
      needsPaidTier,
      membershipStatus,
      tierTitle: patreon?.tierTitle ?? null,
    };
  }, [user, isAuthenticated]);
}

// ─── OAuth Navigation Hook ────────────────────────────────────────────────────

export interface PatreonOAuth {
  /** True while fetching the authorize URL from the backend. */
  isLinking: boolean;
  /**
   * Initiates the Patreon OAuth flow. Calls `GET /users/me/patreon/authorize`
   * to get the Patreon authorize URL, then navigates the current window there.
   * Patreon will redirect back to our callback Lambda, which writes the
   * membership to DynamoDB and redirects to the frontend dashboard.
   */
  startOAuth: () => Promise<void>;
}

/**
 * Hook that provides a function to start the Patreon OAuth linking flow.
 * Used by the CTA banner, gate overlays, and any other component that needs
 * a "Link Patreon" button.
 */
export function usePatreonOAuth(): PatreonOAuth {
  const [isLinking, setIsLinking] = useState(false);

  const startOAuth = useCallback(async () => {
    if (isLinking) return;
    setIsLinking(true);

    try {
      const { authorizeUrl } = await apiClient.get<{ authorizeUrl: string }>(
        "/users/me/patreon/authorize"
      );
      // Navigate the current window — Patreon will redirect back via callback
      window.location.href = authorizeUrl;
    } catch {
      // If fetching the authorize URL fails, fall back to the Patreon page
      // so the user can at least see the campaign.
      window.open("https://patreon.com/CursesAP", "_blank");
      setIsLinking(false);
    }
  }, [isLinking]);

  return { isLinking, startOAuth };
}
