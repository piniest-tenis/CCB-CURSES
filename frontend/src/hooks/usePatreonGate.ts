/**
 * src/hooks/usePatreonGate.ts
 *
 * Central hook for determining Patreon-gated feature access.
 * Derives permissions from the authenticated user's profile:
 *   - `canSave`:            Can the user persist character changes to the DB?
 *   - `canAccessCampaigns`: Can the user access campaigns, dice colors, and sessions?
 *   - `isGrandfathered`:    Was the account created before the Patreon gate cutoff?
 *   - `hasPatreon`:         Has the user linked a Patreon account (any tier)?
 *   - `isPaidPatron`:       Is the user an active paid patron?
 *   - `needsPatreon`:       Should the Patreon CTA banner be shown?
 *
 * Usage:
 *   const { canSave, needsPatreon } = usePatreonGate();
 */

import { useMemo } from "react";
import { useAuthStore } from "@/store/authStore";
import type { PatreonMembershipStatus } from "@shared/types";

// ─── Cutoff Date ──────────────────────────────────────────────────────────────
// Must match the backend PATREON_GATE_CUTOFF_DATE env var.
// Set to the deployment date. All accounts created before this are exempt.

const PATREON_GATE_CUTOFF_DATE =
  process.env.NEXT_PUBLIC_PATREON_GATE_CUTOFF_DATE ?? "1970-01-01T00:00:00.000Z";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PatreonGate {
  /** True if the user can save characters (grandfathered OR free+ Patreon member). */
  canSave: boolean;
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
   * True if the CTA banner should be shown (user is authenticated but cannot save).
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
        canSave: false,
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

    // Can save: grandfathered OR has at least a free Patreon membership
    const canSave = isGrandfathered || hasPatreon;

    // Can access campaigns: grandfathered OR paid patron
    // (Tier-specific unlocks will be added later)
    const canAccessCampaigns = isGrandfathered || isPaidPatron;

    // Show CTA: authenticated, not grandfathered, and no valid Patreon
    const needsPatreon = !isGrandfathered && !hasPatreon;

    // Show paid-tier overlay: has Patreon (free), not grandfathered, not paid
    const needsPaidTier = !isGrandfathered && hasPatreon && !isPaidPatron;

    return {
      canSave,
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
