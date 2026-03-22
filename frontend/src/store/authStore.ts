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
import type { AuthTokens } from "@/lib/auth";
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
  /** Complete a Google SSO sign-in with tokens from the callback. */
  signInWithGoogle: (tokens: AuthTokens) => Promise<void>;
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
            // 1. Check for a federated (Google SSO) session first.
            const federatedToken = cognitoAuth.getFederatedIdToken();
            if (federatedToken) {
              set({ idToken: federatedToken, isAuthenticated: true });
              try {
                const user = await apiClient.get<UserProfile>("/users/me");
                set({ user });
              } catch {
                // non-fatal
              }
              return;
            }

            // 2. Try federated refresh if a refresh token exists but id token expired.
            if (cognitoAuth.isFederatedSession()) {
              const refreshed = await cognitoAuth.refreshFederatedTokens();
              if (refreshed) {
                set({ idToken: refreshed.idToken, isAuthenticated: true });
                try {
                  const user = await apiClient.get<UserProfile>("/users/me");
                  set({ user });
                } catch {
                  // non-fatal
                }
                return;
              }
              // Federated refresh failed — clear stale federated state
              await cognitoAuth.signOutFederated();
              set({ user: null, idToken: null, isAuthenticated: false });
              return;
            }

            // 3. Attempt to retrieve a valid id token from the current SRP session.
            const idToken = await cognitoAuth.getIdToken();
            if (idToken) {
              set({ idToken, isAuthenticated: true });
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

        // ── signInWithGoogle ──────────────────────────────────────────────
        signInWithGoogle: async (tokens: AuthTokens) => {
          set({ isLoading: true });
          try {
            set({ idToken: tokens.idToken, isAuthenticated: true });

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
          // Clear federated tokens if any, then SRP session.
          await cognitoAuth.signOutFederated();
          set({
            user:            null,
            idToken:         null,
            isAuthenticated: false,
            isLoading:       false,
          });
        },

        // ── refreshTokens ─────────────────────────────────────────────────
        refreshTokens: async (): Promise<string | null> => {
          // Try federated refresh first if in a Google SSO session.
          if (cognitoAuth.isFederatedSession()) {
            const fedTokens = await cognitoAuth.refreshFederatedTokens();
            if (fedTokens) {
              set({ idToken: fedTokens.idToken, isAuthenticated: true });
              return fedTokens.idToken;
            }
            // Federated refresh failed — force sign-out
            await cognitoAuth.signOutFederated();
            set({ user: null, idToken: null, isAuthenticated: false });
            return null;
          }

          // SRP-based session refresh.
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
