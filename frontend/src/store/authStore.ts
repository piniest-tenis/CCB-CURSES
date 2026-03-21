/**
 * src/store/authStore.ts
 *
 * Zustand auth store with Cognito session management.
 * - Persists idToken and user profile to sessionStorage.
 * - Registers token handlers with the API client on store creation.
 * - Fetches the full UserProfile from /users/me after sign-in.
 */

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { UserProfile } from "@shared/types";
import * as cognitoAuth from "@/lib/auth";
import { registerTokenHandlers, apiClient } from "@/lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AuthState {
  user: UserProfile | null;
  idToken: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  /** True once initialize() has finished its first run. */
  isReady: boolean;
}

interface AuthActions {
  /** Called once on app mount to restore session from Cognito. */
  initialize: () => Promise<void>;
  /** Sign in with email + password, fetch profile, update store. */
  signIn: (email: string, password: string) => Promise<void>;
  /** Sign out of Cognito and clear all state. */
  signOut: () => Promise<void>;
  /** Forcibly refresh Cognito tokens and update the stored idToken. */
  refreshTokens: () => Promise<string | null>;
  /** Overwrite the cached user profile (called after PUT /users/me). */
  setUser: (user: UserProfile) => void;
  /** Update the stored id token directly. */
  setIdToken: (token: string | null) => void;
}

export type AuthStore = AuthState & AuthActions;

// ─── Store ────────────────────────────────────────────────────────────────────

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => {
      // Register token handlers immediately at store creation time.
      // The getter reads live from store state so it always returns the
      // latest token after a refresh; the refresher delegates to this store.
      registerTokenHandlers(
        () => get().idToken,
        () => get().refreshTokens()
      );

      return {
        // ── State defaults ────────────────────────────────────────────────
        user:            null,
        idToken:         null,
        isLoading:       false,
        isAuthenticated: false,
        isReady:         false,

        // ── initialize ────────────────────────────────────────────────────
        initialize: async () => {
          set({ isLoading: true });
          try {
            // Attempt to retrieve a valid id token from the current Cognito session.
            const idToken = await cognitoAuth.getIdToken();
            if (idToken) {
              set({ idToken, isAuthenticated: true });

              // Fetch the full profile from the API (token is now set so
              // apiClient will attach the Authorization header).
              try {
                const user = await apiClient.get<UserProfile>("/users/me");
                set({ user });
              } catch {
                // Profile fetch failing is non-fatal — the user is still authed.
              }
            } else {
              // No valid session — try a refresh in case the session cookies exist
              const tokens = await cognitoAuth.refreshTokens();
              if (tokens) {
                set({ idToken: tokens.idToken, isAuthenticated: true });
                try {
                  const user = await apiClient.get<UserProfile>("/users/me");
                  set({ user });
                } catch {
                  // non-fatal
                }
              } else {
                set({ user: null, idToken: null, isAuthenticated: false });
              }
            }
          } catch {
            set({ user: null, idToken: null, isAuthenticated: false });
          } finally {
            set({ isLoading: false, isReady: true });
          }
        },

        // ── signIn ────────────────────────────────────────────────────────
        signIn: async (email: string, password: string) => {
          set({ isLoading: true });
          try {
            const tokens = await cognitoAuth.signIn(email, password);
            // Update the token first so subsequent API calls are authenticated.
            set({ idToken: tokens.idToken, isAuthenticated: true });

            // Fetch user profile from the API.
            try {
              const user = await apiClient.get<UserProfile>("/users/me");
              set({ user });
            } catch {
              // Non-fatal — sign-in succeeded even if profile fetch fails.
            }
          } finally {
            set({ isLoading: false });
          }
        },

        // ── signOut ───────────────────────────────────────────────────────
        signOut: async () => {
          await cognitoAuth.signOut();
          set({
            user:            null,
            idToken:         null,
            isAuthenticated: false,
            isLoading:       false,
          });
        },

        // ── refreshTokens ─────────────────────────────────────────────────
        refreshTokens: async (): Promise<string | null> => {
          const tokens = await cognitoAuth.refreshTokens();
          if (tokens) {
            set({ idToken: tokens.idToken, isAuthenticated: true });
            return tokens.idToken;
          }
          // Refresh failed — force sign-out
          set({ user: null, idToken: null, isAuthenticated: false });
          return null;
        },

        // ── setUser ───────────────────────────────────────────────────────
        setUser: (user: UserProfile) => set({ user }),

        // ── setIdToken ────────────────────────────────────────────────────
        setIdToken: (idToken: string | null) =>
          set({ idToken, isAuthenticated: !!idToken }),
      };
    },
    {
      name: "daggerheart-auth",
      storage: createJSONStorage(() =>
        // Use sessionStorage when available (cleared on tab close).
        // Fall back to a no-op for SSR.
        typeof window !== "undefined"
          ? sessionStorage
          : ({
              getItem:    () => null,
              setItem:    () => {},
              removeItem: () => {},
            } as unknown as Storage)
      ),
      // Only persist the minimal set needed to restore the session.
      partialize: (state) => ({
        user:    state.user,
        idToken: state.idToken,
      }),
    }
  )
);
