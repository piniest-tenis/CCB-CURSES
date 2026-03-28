"use client";

/**
 * src/components/dashboard/ProfileCard.tsx
 *
 * Right-rail profile card showing user avatar, display name, email,
 * a collapsible default dice color editor, and a sign-out button.
 */

import React, { useState, useCallback, useRef, useEffect } from "react";
import type { UserProfile, DiceColorPrefs } from "@shared/types";
import { DiceColorEditor } from "@/components/dice/DiceColorEditor";
import { SYSTEM_DEFAULTS, resolveDiceColors } from "@/lib/diceColorResolver";
import { apiClient } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";

interface ProfileCardProps {
  user: UserProfile;
  onSignOut: () => void;
}

type SaveState = "idle" | "saving" | "saved" | "error";

export function ProfileCard({ user, onSignOut }: ProfileCardProps) {
  const initial = (user.displayName || user.email).charAt(0).toUpperCase();
  const [diceColorsOpen, setDiceColorsOpen] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("idle");

  // Optimistic local prefs — updated synchronously on every change so the
  // editor never reads stale server data when the accordion is toggled.
  const [localPrefs, setLocalPrefs] = useState<DiceColorPrefs | undefined>(
    user.preferences?.diceColors,
  );
  // Tracks whether an edit is in-flight so we don't clobber it with a server sync.
  const pendingPrefsRef = useRef<DiceColorPrefs | undefined>(undefined);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync localPrefs from the server when no edit is in-flight (e.g. other-tab refresh).
  useEffect(() => {
    if (pendingPrefsRef.current === undefined) {
      setLocalPrefs(user.preferences?.diceColors);
    }
  }, [user.preferences?.diceColors]);

  const handleDiceColorChange = useCallback(
    (prefs: DiceColorPrefs) => {
      // ① Update local state immediately so the editor never resets on reopen.
      setLocalPrefs(prefs);
      pendingPrefsRef.current = prefs;

      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(async () => {
        setSaveState("saving");
        try {
          const hasAny = prefs.hope || prefs.fear || prefs.general;
          const updated = await apiClient.put<UserProfile>("/users/me", {
            preferences: { diceColors: hasAny ? prefs : undefined },
          });
          useAuthStore.getState().setUser(updated);
          pendingPrefsRef.current = undefined;
          setSaveState("saved");
          if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
          savedTimerRef.current = setTimeout(() => setSaveState("idle"), 2500);
        } catch (err) {
          console.error("[ProfileCard] Failed to save dice colors:", err);
          // Roll back optimistic state to last confirmed server value.
          setLocalPrefs(user.preferences?.diceColors);
          pendingPrefsRef.current = undefined;
          setSaveState("error");
          if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
          savedTimerRef.current = setTimeout(() => setSaveState("idle"), 4000);
        }
      }, 800);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user.preferences?.diceColors],
  );

  const resolved = resolveDiceColors(undefined, localPrefs);

  return (
    <div className="rounded-xl border border-[#577399]/30 bg-slate-900/80 p-5 shadow-card-fantasy">
      <p className="text-xs font-semibold uppercase tracking-widest text-[#b9baa3]/50 mb-4">
        Your Profile
      </p>

      <div className="flex items-center gap-3">
        {/* Avatar */}
        <div className="h-11 w-11 shrink-0 rounded-full border-2 border-[#577399]/40 bg-slate-800 flex items-center justify-center overflow-hidden">
          {user.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.avatarUrl}
              alt={user.displayName || user.email}
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="text-lg font-bold text-[#577399]">{initial}</span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p className="font-semibold text-[#f7f7ff] text-sm truncate">
            {user.displayName || "Adventurer"}
          </p>
          <p className="text-xs text-[#b9baa3]/50 truncate">{user.email}</p>
        </div>
      </div>

      {/* ── Default Dice Colors ──────────────────────────────────── */}
      <div className="mt-4 pt-3 border-t border-[#577399]/20">
        <button
          type="button"
          onClick={() => setDiceColorsOpen((o) => !o)}
          className="flex items-center gap-1.5 group w-full text-left"
          aria-expanded={diceColorsOpen}
          aria-controls="profile-dice-colors-panel"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className={[
              "w-3.5 h-3.5 shrink-0 text-[#577399] transition-transform duration-150",
              diceColorsOpen ? "rotate-90" : "",
            ].join(" ")}
          >
            <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
          </svg>

          {/* Two-line label */}
          <div className="flex-1 min-w-0">
            <span className="text-xs uppercase tracking-widest text-[#b9baa3]/70 font-medium group-hover:text-[#f7f7ff] transition-colors">
              Default Dice Colors
            </span>
            {!diceColorsOpen && (
              <p className="text-[10px] text-[#b9baa3]/35 mt-0.5 leading-tight">
                Applies to all characters · tap to customize
              </p>
            )}
          </div>

          {/* Quick preview swatches — die-face style */}
          {!diceColorsOpen && (
            <span className="flex gap-1 shrink-0" aria-hidden="true">
              <span
                className="w-4 h-4 rounded-sm border border-white/10"
                style={{
                  backgroundColor: resolved.hope.diceColor,
                  boxShadow: "inset 0 1px 2px rgba(255,255,255,0.12), 0 1px 2px rgba(0,0,0,0.4)",
                }}
                title="Hope die"
              />
              <span
                className="w-4 h-4 rounded-sm border border-white/10"
                style={{
                  backgroundColor: resolved.fear.diceColor,
                  boxShadow: "inset 0 1px 2px rgba(255,255,255,0.12), 0 1px 2px rgba(0,0,0,0.4)",
                }}
                title="Fear die"
              />
              <span
                className="w-4 h-4 rounded-sm border border-white/10"
                style={{
                  backgroundColor: resolved.general.diceColor,
                  boxShadow: "inset 0 1px 2px rgba(255,255,255,0.12), 0 1px 2px rgba(0,0,0,0.4)",
                }}
                title="General dice"
              />
            </span>
          )}
        </button>

        {/* Editor panel — kept mounted to preserve working state across toggles */}
        <div id="profile-dice-colors-panel" hidden={!diceColorsOpen}>
          <div className="mt-2">
            <p className="text-xs text-[#b9baa3]/40 mb-2">
              Set default dice colors for all your characters. Individual characters can override these.
            </p>
            <DiceColorEditor
              value={localPrefs}
              defaults={SYSTEM_DEFAULTS}
              onChange={handleDiceColorChange}
            />
          </div>
        </div>

        {/* Save status — always visible, outside the accordion button */}
        {saveState !== "idle" && (
          <div
            role="status"
            aria-live="polite"
            className={[
              "mt-1.5 flex items-center gap-1.5 text-xs",
              saveState === "saving" ? "text-[#577399]" : "",
              saveState === "saved"  ? "text-emerald-400/80" : "",
              saveState === "error"  ? "text-red-400/80" : "",
            ].join(" ")}
          >
            {saveState === "saving" && (
              <>
                <span
                  aria-hidden="true"
                  className="h-2.5 w-2.5 animate-spin rounded-full border border-current border-t-transparent"
                />
                Saving default colors…
              </>
            )}
            {saveState === "saved" && (
              <>
                <svg aria-hidden="true" viewBox="0 0 12 12" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="1.5,6 4.5,9 10.5,3" />
                </svg>
                Default colors saved
              </>
            )}
            {saveState === "error" && (
              <>&#9888; Couldn&apos;t save — check your connection</>
            )}
          </div>
        )}
      </div>

      {/* ── Sign Out ─────────────────────────────────────────────── */}
      {/* Stronger separator distinguishes this from the editor above */}
      <div className="mt-5 pt-4 border-t border-slate-800/60">
        <button
          type="button"
          onClick={onSignOut}
          className="
            w-full rounded-lg px-3 py-2 text-xs font-medium
            border border-slate-700/30 text-[#b9baa3]/40
            hover:border-red-900/60 hover:text-red-400/70
            transition-colors
            focus:outline-none focus:ring-2 focus:ring-red-900/60 focus:ring-offset-2 focus:ring-offset-slate-900
          "
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
