"use client";

/**
 * src/components/PatreonCTA.tsx
 *
 * Slim, persistent call-to-action bar displayed at the bottom of the viewport
 * for authenticated users who have not linked a valid Patreon account.
 *
 * Design: Cookie-consent-bar height (~40px), compact layout, Patreon coral
 * branding. Unobtrusive but visible. Content should add `pb-12` when this
 * banner is visible to avoid being hidden behind it.
 *
 * Requirements:
 * - Small, persistent bar visible at all times
 * - Text: "Unlock leveling up & unlimited characters by joining our FREE Patreon"
 * - "Join Now" button triggers the Patreon OAuth flow via
 *   GET /users/me/patreon/authorize → opens Patreon authorize URL
 * - After the Patreon callback redirects the user back, the app refetches
 *   the user profile (handled by providers/dashboard)
 * - Focus-based re-check is kept as a backup for edge cases
 */

import React, { useCallback, useEffect, useRef } from "react";
import { usePatreonGate, usePatreonOAuth } from "@/hooks/usePatreonGate";
import { useAuthStore } from "@/store/authStore";
import { apiClient } from "@/lib/api";
import type { PatreonLink } from "@shared/types";

export function PatreonCTA() {
  const { needsPatreon } = usePatreonGate();
  const { isLinking, startOAuth } = usePatreonOAuth();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const setUser = useAuthStore((s) => s.setUser);
  const user = useAuthStore((s) => s.user);

  // Track whether the user has clicked the Patreon link so we only
  // re-check on focus when relevant
  const clickedPatreonRef = useRef(false);

  // ── Focus-based re-check ─────────────────────────────────────────────────
  // Backup mechanism: if the user switches away (e.g. to complete Patreon
  // signup in another tab) and comes back without going through the callback,
  // we re-check the status from DynamoDB.
  const recheckPatreonStatus = useCallback(async () => {
    if (!clickedPatreonRef.current) return;
    if (!isAuthenticated || !user) return;

    try {
      const result = await apiClient.get<{
        patreon: PatreonLink | null;
        createdAt: string;
      }>("/users/me/patreon/status");

      // If the Patreon status changed, update the user profile in the store
      if (result.patreon && !user.patreon) {
        setUser({ ...user, patreon: result.patreon });
      } else if (
        result.patreon &&
        user.patreon &&
        result.patreon.membershipStatus !== user.patreon.membershipStatus
      ) {
        setUser({ ...user, patreon: result.patreon });
      }
    } catch {
      // Non-fatal — silently retry next time
    }

    clickedPatreonRef.current = false;
  }, [isAuthenticated, user, setUser]);

  useEffect(() => {
    const onFocus = () => {
      recheckPatreonStatus();
    };

    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [recheckPatreonStatus]);

  // ── Click handler ────────────────────────────────────────────────────────
  const handleClick = useCallback(() => {
    clickedPatreonRef.current = true;
    startOAuth();
  }, [startOAuth]);

  // Don't render if the user doesn't need Patreon
  if (!isAuthenticated || !needsPatreon) return null;

  return (
    <div
      className="fixed bottom-0 inset-x-0 z-50"
      role="banner"
      aria-label="Patreon call to action"
    >
      {/* Slim bar — compact, single-line layout */}
      <div className="bg-gradient-to-r from-[#f96854] via-[#ff6b4a] to-[#f96854] px-4 py-2 shadow-[0_-2px_12px_rgba(249,104,84,0.3)]">
        <div className="mx-auto max-w-4xl flex items-center justify-center gap-3">
          {/* Patreon icon — small */}
          <svg
            viewBox="0 0 24 24"
            fill="currentColor"
            className="h-4 w-4 shrink-0 text-white/90"
            aria-hidden="true"
          >
            <path d="M14.82 2.41c3.96 0 7.18 3.24 7.18 7.21 0 3.96-3.22 7.18-7.18 7.18-3.97 0-7.21-3.22-7.21-7.18 0-3.97 3.24-7.21 7.21-7.21M2 21.6h3.5V2.41H2V21.6z" />
          </svg>

          {/* CTA text — compact */}
          <p className="text-white/95 font-medium text-sm leading-tight">
            Unlock leveling up &amp; unlimited characters by joining our{" "}
            <span className="font-bold">FREE</span> Patreon
          </p>

          {/* CTA button — small pill */}
          <button
            type="button"
            onClick={handleClick}
            disabled={isLinking}
            className="shrink-0 rounded-md bg-white/95 px-3.5 py-1 text-[#f96854] font-bold text-xs shadow-sm hover:bg-white transition-colors focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-1 focus:ring-offset-[#f96854] disabled:opacity-60 disabled:cursor-wait"
          >
            {isLinking ? "Connecting…" : "Join Now"}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Utility hook: returns whether the PatreonCTA banner is currently visible.
 * Use this to conditionally add bottom padding to page content so it
 * isn't hidden behind the fixed-bottom CTA bar.
 */
export function usePatreonCTAVisible(): boolean {
  const { needsPatreon } = usePatreonGate();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return isAuthenticated && needsPatreon;
}
