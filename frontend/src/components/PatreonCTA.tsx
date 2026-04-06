"use client";

/**
 * src/components/PatreonCTA.tsx
 *
 * Slim, dismissable call-to-action bar displayed at the bottom of the viewport
 * for authenticated users who have not linked a valid Patreon account.
 *
 * Design: Cookie-consent-bar height (~40px), compact layout, Patreon coral
 * branding. Unobtrusive but visible. Content should add `pb-12` when this
 * banner is visible to avoid being hidden behind it.
 *
 * Requirements:
 * - Small bar visible at all times (until dismissed)
 * - Text: "Unlock leveling up & unlimited characters by joining our FREE Patreon"
 * - Desktop: "×" dismiss button on the far right
 * - Mobile: swipe down to dismiss
 * - "Join Now" button triggers the Patreon OAuth flow via
 *   GET /users/me/patreon/authorize → opens Patreon authorize URL
 * - After the Patreon callback redirects the user back, the app refetches
 *   the user profile (handled by providers/dashboard)
 * - Focus-based re-check is kept as a backup for edge cases
 * - Dismissed state is session-only (bar re-appears on hard reload / new session)
 */

import React, { useCallback, useEffect, useRef } from "react";
import { create } from "zustand";
import { usePatreonGate, usePatreonOAuth } from "@/hooks/usePatreonGate";
import { useAuthStore } from "@/store/authStore";
import { apiClient } from "@/lib/api";
import type { PatreonLink } from "@shared/types";

// ── Tiny store for banner dismissed state ────────────────────────────────────
// Shared so DiceLog (and any other consumer) can react to dismissal.
interface PatreonBannerStore {
  dismissed: boolean;
  dismiss: () => void;
}

export const usePatreonBannerStore = create<PatreonBannerStore>((set) => ({
  dismissed: false,
  dismiss: () => set({ dismissed: true }),
}));

export function PatreonCTA() {
  const { needsPatreon } = usePatreonGate();
  const { isLinking, startOAuth } = usePatreonOAuth();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const setUser = useAuthStore((s) => s.setUser);
  const user = useAuthStore((s) => s.user);

  const dismissed = usePatreonBannerStore((s) => s.dismissed);
  const dismiss = usePatreonBannerStore((s) => s.dismiss);

  // Touch-swipe tracking for mobile dismiss
  const touchStartYRef = useRef<number | null>(null);

  // Track whether the user has clicked the Patreon link so we only
  // re-check on focus when relevant
  const clickedPatreonRef = useRef(false);

  // ── Focus-based re-check ─────────────────────────────────────────────────
  const recheckPatreonStatus = useCallback(async () => {
    if (!clickedPatreonRef.current) return;
    if (!isAuthenticated || !user) return;

    try {
      const result = await apiClient.get<{
        patreon: PatreonLink | null;
        createdAt: string;
      }>("/users/me/patreon/status");

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
    const onFocus = () => recheckPatreonStatus();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [recheckPatreonStatus]);

  // ── Click handler ────────────────────────────────────────────────────────
  const handleClick = useCallback(() => {
    clickedPatreonRef.current = true;
    startOAuth();
  }, [startOAuth]);

  // ── Swipe-down to dismiss (mobile) ───────────────────────────────────────
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartYRef.current = e.touches[0]?.clientY ?? null;
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (touchStartYRef.current === null) return;
    const deltaY = (e.changedTouches[0]?.clientY ?? 0) - touchStartYRef.current;
    // Swipe down ≥ 30px → dismiss
    if (deltaY >= 30) {
      dismiss();
    }
    touchStartYRef.current = null;
  }, [dismiss]);

  // Don't render if the user doesn't need Patreon or has dismissed
  if (!isAuthenticated || !needsPatreon || dismissed) return null;

  return (
    <div
      className="fixed bottom-0 inset-x-0 z-50"
      role="banner"
      aria-label="Patreon call to action"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Slim bar — dark theme with goldenrod accents for WCAG AA+ compliance */}
      <div className="bg-[#0f172a]/95 border-t border-[#DAA520]/30 px-4 py-2 shadow-[0_-2px_12px_rgba(0,0,0,0.4)] backdrop-blur-sm">
        <div className="mx-auto max-w-4xl flex items-center justify-center gap-3">
          {/* Patreon icon — small */}
          <svg
            viewBox="0 0 24 24"
            fill="currentColor"
            className="h-4 w-4 shrink-0 text-[#DAA520]"
            aria-hidden="true"
          >
            <path d="M14.82 2.41c3.96 0 7.18 3.24 7.18 7.21 0 3.96-3.22 7.18-7.18 7.18-3.97 0-7.21-3.22-7.21-7.18 0-3.97 3.24-7.21 7.21-7.21M2 21.6h3.5V2.41H2V21.6z" />
          </svg>

          {/* CTA text — compact */}
          <p className="text-[#DAA520] font-medium text-sm leading-tight">
            Unlock leveling up &amp; unlimited characters by joining our{" "}
            <span className="font-bold">FREE</span> Patreon
          </p>

          {/* CTA button — small pill */}
          <button
            type="button"
            onClick={handleClick}
            disabled={isLinking}
            aria-label="Join our free Patreon to unlock features"
            className="shrink-0 rounded-md bg-[#DAA520] px-3.5 py-1 text-[#0a100d] font-bold text-xs shadow-sm hover:bg-[#e8b830] transition-colors focus:outline-none focus:ring-2 focus:ring-[#DAA520] focus:ring-offset-1 focus:ring-offset-[#0f172a] disabled:opacity-60 disabled:cursor-wait"
          >
            {isLinking ? "Connecting…" : "Join Now"}
          </button>

          {/* Dismiss button — visible on all screen sizes for keyboard accessibility */}
          <button
            type="button"
            onClick={() => dismiss()}
            aria-label="Dismiss Patreon banner"
            className="
              shrink-0 ml-1 flex items-center justify-center
              h-6 w-6 rounded-full
              text-[#DAA520]/70 hover:text-[#DAA520] hover:bg-[#DAA520]/15
              transition-colors
              focus:outline-none focus:ring-2 focus:ring-[#DAA520] focus:ring-offset-1 focus:ring-offset-[#0f172a]
            "
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              className="h-3.5 w-3.5"
            >
              <path d="M3 3l10 10M13 3L3 13" />
            </svg>
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
 *
 * NOTE: This does not track the dismissed state — it only reflects whether
 * the user needs Patreon. Components that need to respond to dismissal
 * should use `usePatreonCTAVisible` from PatreonCTA directly or subscribe
 * to a shared context. For the DiceLog offset we use a CSS-only approach
 * keyed off the same needsPatreon boolean; once dismissed the bar unmounts
 * and CSS transitions handle the animation.
 */
export function usePatreonCTAVisible(): boolean {
  const { needsPatreon } = usePatreonGate();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return isAuthenticated && needsPatreon;
}
