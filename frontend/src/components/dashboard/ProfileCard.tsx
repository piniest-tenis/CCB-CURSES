"use client";

/**
 * src/components/dashboard/ProfileCard.tsx
 *
 * Right-rail profile card showing user avatar, display name, email,
 * a collapsible default dice color editor, and a sign-out button.
 */

import React, { useState, useCallback, useRef } from "react";
import type { UserProfile, DiceColorPrefs } from "@shared/types";
import { DiceColorEditor } from "@/components/dice/DiceColorEditor";
import { SYSTEM_DEFAULTS, resolveDiceColors } from "@/lib/diceColorResolver";
import { apiClient } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";

interface ProfileCardProps {
  user: UserProfile;
  onSignOut: () => void;
}

export function ProfileCard({ user, onSignOut }: ProfileCardProps) {
  const initial = (user.displayName || user.email).charAt(0).toUpperCase();
  const [diceColorsOpen, setDiceColorsOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleDiceColorChange = useCallback(
    (prefs: DiceColorPrefs) => {
      // Debounce API call — 800ms after last edit
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(async () => {
        setSaving(true);
        try {
          const hasAny = prefs.hope || prefs.fear || prefs.general;
          const updated = await apiClient.put<UserProfile>("/users/me", {
            preferences: { diceColors: hasAny ? prefs : undefined },
          });
          useAuthStore.getState().setUser(updated);
        } catch (err) {
          console.error("[ProfileCard] Failed to save dice colors:", err);
        } finally {
          setSaving(false);
        }
      }, 800);
    },
    [],
  );

  const resolved = resolveDiceColors(undefined, user.preferences?.diceColors);

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
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className={[
              "w-3.5 h-3.5 text-[#577399] transition-transform duration-150",
              diceColorsOpen ? "rotate-90" : "",
            ].join(" ")}
          >
            <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
          </svg>
          <span className="text-xs uppercase tracking-widest text-[#b9baa3]/70 font-medium group-hover:text-[#f7f7ff] transition-colors">
            Default Dice Colors
          </span>
          {/* Quick preview swatches */}
          {!diceColorsOpen && (
            <span className="flex gap-1 ml-auto" aria-hidden="true">
              <span className="w-3.5 h-3.5 rounded-full border border-slate-600" style={{ backgroundColor: resolved.hope.diceColor }} title="Hope" />
              <span className="w-3.5 h-3.5 rounded-full border border-slate-600" style={{ backgroundColor: resolved.fear.diceColor }} title="Fear" />
              <span className="w-3.5 h-3.5 rounded-full border border-slate-600" style={{ backgroundColor: resolved.general.diceColor }} title="General" />
            </span>
          )}
          {saving && (
            <span className="ml-1 text-xs text-[#577399]">Saving...</span>
          )}
        </button>
        {diceColorsOpen && (
          <div className="mt-2">
            <p className="text-xs text-[#b9baa3]/40 mb-2">
              Set default dice colors for all your characters. Individual characters can override these.
            </p>
            <DiceColorEditor
              value={user.preferences?.diceColors}
              defaults={SYSTEM_DEFAULTS}
              onChange={handleDiceColorChange}
            />
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={onSignOut}
        className="
          mt-4 w-full rounded-lg px-3 py-2 text-xs font-medium
          border border-slate-700/60 text-[#b9baa3]/50
          hover:border-slate-600 hover:text-[#b9baa3]
          transition-colors
          focus:outline-none focus:ring-2 focus:ring-[#577399] focus:ring-offset-2 focus:ring-offset-slate-900
        "
      >
        Sign out
      </button>
    </div>
  );
}
