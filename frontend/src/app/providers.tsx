"use client";

/**
 * src/app/providers.tsx
 *
 * Client-side providers wrapper.
 * Initialises TanStack Query and Cognito auth session on mount.
 */

import React, { useEffect } from "react";
import { QueryClient, QueryClientProvider, QueryCache, MutationCache } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useAuthStore } from "@/store/authStore";
import { usePathname } from "next/navigation";
import { ApiError, apiClient } from "@/lib/api";
import { LoadingInterstitial } from "@/components/LoadingInterstitial";
import { PatreonCTA, usePatreonCTAVisible } from "@/components/PatreonCTA";
import type { UserProfile } from "@shared/types";

// ── Global auth-error handler ────────────────────────────────────────────────
// 401 = unauthenticated (bad/missing token) → sign out and send to login.
// 403 = authenticated but not authorised (wrong group, etc.) → do NOT sign out;
//       the session is still valid. Just redirect to the dashboard so the user
//       isn't stuck, but keep all stored credentials intact.

function handleAuthError(error: unknown): void {
  if (!(error instanceof ApiError)) return;
  if (!useAuthStore.getState().isReady) return;

  if (error.status === 401) {
    // Token is invalid or expired and couldn't be refreshed — clear the session.
    useAuthStore.getState().signOut();
    window.location.href = "/auth/login";
    return;
  }

  if (error.status === 403) {
    // Patreon-gate and character-limit 403s are handled locally by the
    // mutation hooks / UI — do NOT redirect away from the page.
    if (error.code === "PATREON_REQUIRED") return;
    if (error.code === "CHARACTER_LIMIT_REACHED") return;

    // The user is authenticated but lacks permission for this resource.
    // Do NOT call signOut() — that would destroy the refresh token and force a
    // full re-login even though the session is perfectly valid.
    // Redirect to dashboard; page-level guards handle further access control.
    window.location.href = "/dashboard";
  }
}

// Create a stable QueryClient instance outside the component so it isn't
// recreated on every render.
const queryClient = new QueryClient({
  queryCache: new QueryCache({ onError: handleAuthError }),
  mutationCache: new MutationCache({ onError: handleAuthError }),
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function AuthInitializer({ children }: { children: React.ReactNode }) {
  const initialize = useAuthStore((s) => s.initialize);
  const isReady    = useAuthStore((s) => s.isReady);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const setUser    = useAuthStore((s) => s.setUser);
  const pathname   = usePathname();

  // OBS overlay pages are standalone — no auth required, no interstitial.
  const isObs = pathname?.startsWith("/obs") ?? false;
  // Auth pages don't need the Patreon CTA banner
  const isAuthPage = pathname?.startsWith("/auth") ?? false;

  useEffect(() => {
    if (isObs) return;
    initialize();
  }, [initialize, isObs]);

  // ── Patreon callback handling ──────────────────────────────────────────
  // After the Patreon OAuth callback redirects to /dashboard?patreon=linked,
  // refetch the user profile so the Zustand store gets the new patreon field.
  // This makes the CTA disappear and unlocks saving immediately.
  // Uses window.location.search directly to avoid requiring a Suspense boundary.
  useEffect(() => {
    if (!isReady || !isAuthenticated) return;
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    if (params.get("patreon") !== "linked") return;

    // Refetch the user profile to pick up the newly-stored Patreon link
    apiClient
      .get<UserProfile>("/users/me")
      .then((updatedUser) => {
        setUser(updatedUser);
        // Clean up the query params so a page refresh doesn't re-trigger
        const url = new URL(window.location.href);
        url.searchParams.delete("patreon");
        url.searchParams.delete("status");
        window.history.replaceState({}, "", url.pathname);
      })
      .catch(() => {
        // Non-fatal — the next page load or focus event will pick it up
      });
  }, [isReady, isAuthenticated, setUser]);

  const isDashboard = pathname === "/dashboard";
  const showCTA = usePatreonCTAVisible() && isDashboard;

  return (
    <>
      {/* Add bottom padding when fixed CTA bar is visible so content isn't hidden */}
      <div className={showCTA ? "pb-12" : ""}>
        {children}
      </div>
      {isDashboard && <PatreonCTA />}
      {!isObs && (
        <LoadingInterstitial isVisible={!isReady} />
      )}
    </>
  );
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthInitializer>{children}</AuthInitializer>
      {process.env.NODE_ENV === "development" && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
    </QueryClientProvider>
  );
}
