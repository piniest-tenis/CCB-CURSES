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
import { ApiError } from "@/lib/api";
import { LoadingInterstitial } from "@/components/LoadingInterstitial";

// ── Global auth-error handler ────────────────────────────────────────────────
// 401 = unauthenticated (bad/missing token) → sign out and send to login.
// 403 = authenticated but not authorised (wrong group, etc.) → do NOT sign out;
//       the session is still valid. Just redirect to the dashboard so the user
//       isn't stuck, but keep all stored credentials intact.

function handle403(error: unknown): void {
  if (!(error instanceof ApiError)) return;
  if (!useAuthStore.getState().isReady) return;

  if (error.status === 401) {
    // Token is invalid or expired and couldn't be refreshed — clear the session.
    useAuthStore.getState().signOut();
    window.location.href = "/auth/login";
    return;
  }

  if (error.status === 403) {
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
  queryCache: new QueryCache({ onError: handle403 }),
  mutationCache: new MutationCache({ onError: handle403 }),
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
  const pathname   = usePathname();

  // OBS overlay pages are standalone — no auth required, no interstitial.
  const isObs = pathname?.startsWith("/obs") ?? false;

  useEffect(() => {
    if (isObs) return;
    initialize();
  }, [initialize, isObs]);

  return (
    <>
      {children}
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
