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
import { ApiError } from "@/lib/api";
import { LoadingInterstitial } from "@/components/LoadingInterstitial";

// ── Global 403 handler ───────────────────────────────────────────────────────
// A 403 means the server is actively refusing the request for this user
// (expired session, revoked account, etc.).  Mirror the 401 path: sign out to
// clear all stored credentials, then hard-navigate to login so every page is
// covered without needing per-page error handling.

function handle403(error: unknown): void {
  if (error instanceof ApiError && error.status === 403) {
    // Only redirect after initialize() has completed. During initialization
    // the app may fire queries with a stale persisted token before the session
    // has been fully validated; we don't want to boot the user in that window.
    if (!useAuthStore.getState().isReady) return;
    useAuthStore.getState().signOut();
    window.location.href = "/auth/login";
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

  useEffect(() => {
    initialize();
  }, [initialize]);

  return (
    <>
      {children}
      {/* Full-screen lore interstitial while auth is initialising.
          Fades out automatically once isReady becomes true. */}
      <LoadingInterstitial isVisible={!isReady} />
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
