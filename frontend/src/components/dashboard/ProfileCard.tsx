"use client";

/**
 * src/components/dashboard/ProfileCard.tsx
 *
 * Right-rail profile card showing user avatar, display name, email,
 * a collapsible default dice color editor, and a sign-out button.
 */

import React, { useState, useCallback, useRef, useEffect } from "react";
import dynamic from "next/dynamic";
import type { UserProfile, DiceColorPrefs } from "@shared/types";
import { SYSTEM_DEFAULTS, resolveDiceColors } from "@/lib/diceColorResolver";
import { apiClient } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import { usePatreonGate, usePatreonOAuth } from "@/hooks/usePatreonGate";

// Lazy-load DiceColorEditor — it's behind an accordion toggle (default closed).
const DiceColorEditor = dynamic(
  () => import("@/components/dice/DiceColorEditor").then((m) => m.DiceColorEditor),
  { ssr: false }
);

interface ProfileCardProps {
  user: UserProfile;
  onSignOut: () => void;
}

type SaveState = "idle" | "saving" | "saved" | "error";

export function ProfileCard({ user, onSignOut }: ProfileCardProps) {
  const initial = (user.displayName || user.email).charAt(0).toUpperCase();
  const [diceColorsOpen, setDiceColorsOpen] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const { canAccessCampaigns, hasPatreon } = usePatreonGate();
  const { isLinking, startOAuth } = usePatreonOAuth();
  const diceColorsGated = !canAccessCampaigns;

  // ── Curses! content toggle ────────────────────────────────────────────
  const [cursesEnabled, setCursesEnabled] = useState(
    user.preferences?.cursesEnabled ?? false,
  );
  const [cursesSaveState, setCursesSaveState] = useState<SaveState>("idle");
  const cursesTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync from server when user prop changes
  useEffect(() => {
    setCursesEnabled(user.preferences?.cursesEnabled ?? false);
  }, [user.preferences?.cursesEnabled]);

  const handleCursesToggle = useCallback(async () => {
    const next = !cursesEnabled;
    setCursesEnabled(next);
    setCursesSaveState("saving");
    try {
      const updated = await apiClient.put<UserProfile>("/users/me", {
        preferences: { cursesEnabled: next },
      });
      useAuthStore.getState().setUser(updated);
      setCursesSaveState("saved");
      if (cursesTimerRef.current) clearTimeout(cursesTimerRef.current);
      cursesTimerRef.current = setTimeout(() => setCursesSaveState("idle"), 2500);
    } catch {
      setCursesEnabled(!next); // rollback
      setCursesSaveState("error");
      if (cursesTimerRef.current) clearTimeout(cursesTimerRef.current);
      cursesTimerRef.current = setTimeout(() => setCursesSaveState("idle"), 4000);
    }
  }, [cursesEnabled]);

  // ── Editable display name ─────────────────────────────────────────────
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(user.displayName || "");
  const [nameSaveState, setNameSaveState] = useState<SaveState>("idle");
  const nameTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync from server when user prop changes (e.g. after reconciliation)
  useEffect(() => {
    if (!editingName) setNameValue(user.displayName || "");
  }, [user.displayName, editingName]);

  const handleNameSave = useCallback(async () => {
    const trimmed = nameValue.trim();
    if (!trimmed || trimmed === user.displayName) {
      setEditingName(false);
      setNameValue(user.displayName || "");
      return;
    }
    setNameSaveState("saving");
    try {
      const updated = await apiClient.put<UserProfile>("/users/me", {
        displayName: trimmed,
      });
      useAuthStore.getState().setUser(updated);
      setNameSaveState("saved");
      setEditingName(false);
      if (nameTimerRef.current) clearTimeout(nameTimerRef.current);
      nameTimerRef.current = setTimeout(() => setNameSaveState("idle"), 2500);
    } catch {
      setNameSaveState("error");
      if (nameTimerRef.current) clearTimeout(nameTimerRef.current);
      nameTimerRef.current = setTimeout(() => setNameSaveState("idle"), 4000);
    }
  }, [nameValue, user.displayName]);

  const handleNameKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") { e.preventDefault(); handleNameSave(); }
      if (e.key === "Escape") { setEditingName(false); setNameValue(user.displayName || ""); }
    },
    [handleNameSave, user.displayName],
  );

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
      <p className="text-xs font-semibold uppercase tracking-widest text-parchment-500 mb-4">
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
          {editingName ? (
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                value={nameValue}
                onChange={(e) => setNameValue(e.target.value)}
                onKeyDown={handleNameKeyDown}
                onBlur={handleNameSave}
                maxLength={50}
                autoFocus
                className="
                  w-full rounded border border-[#577399]/50 bg-slate-900
                  px-1.5 py-0.5 text-sm font-semibold text-[#f7f7ff]
                  focus:outline-none focus:border-[#577399] transition-colors
                "
              />
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setEditingName(true)}
              className="group flex items-center gap-1 max-w-full text-left"
              title="Click to edit display name"
            >
              <span className="font-semibold text-[#f7f7ff] text-sm truncate">
                {user.displayName || "Adventurer"}
              </span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 16 16"
                fill="currentColor"
                className="w-3 h-3 shrink-0 text-[#b9baa3]/0 group-hover:text-[#b9baa3]/50 transition-colors"
              >
                <path d="M13.488 2.513a1.75 1.75 0 0 0-2.475 0L3.22 10.303a.75.75 0 0 0-.178.31l-.893 3.124a.75.75 0 0 0 .926.926l3.124-.893a.75.75 0 0 0 .31-.178l7.791-7.792a1.75 1.75 0 0 0 0-2.475l-.812-.812ZM11.72 3.22a.25.25 0 0 1 .354 0l.812.812a.25.25 0 0 1 0 .354L5.595 11.68l-1.644.47.47-1.644L11.72 3.22Z" />
              </svg>
            </button>
          )}
          {nameSaveState !== "idle" && (
            <p className={[
              "text-[11px] mt-0.5",
              nameSaveState === "saving" ? "text-[#577399]" : "",
              nameSaveState === "saved"  ? "text-emerald-400/80" : "",
              nameSaveState === "error"  ? "text-red-400/80" : "",
            ].join(" ")}>
              {nameSaveState === "saving" && "Saving..."}
              {nameSaveState === "saved" && "Name updated"}
              {nameSaveState === "error" && "Failed to save"}
            </p>
          )}
          {nameSaveState === "idle" && (
            <p className="text-xs text-parchment-500 truncate">{user.email}</p>
          )}
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
            <span className="text-xs uppercase tracking-widest text-parchment-500 font-medium group-hover:text-[#f7f7ff] transition-colors">
              Default Dice Colors
            </span>
            {!diceColorsOpen && (
              <p className="text-[11px] text-parchment-600 mt-0.5 leading-tight">
                Applies to all characters · tap to customize
              </p>
            )}
          </div>

          {/* Premium badge — inline when gated */}
          {diceColorsGated && (
            <span className="flex items-center gap-1 shrink-0 rounded border border-gold-500/30 bg-gold-500/10 px-1.5 py-0.5">
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3 text-gold-400/80" aria-hidden="true">
                <path d="M2 19h20v3H2v-3zm1-1L6 6l4 4 2-6 2 6 4-4 3 12H3z" />
              </svg>
              <span className="text-[11px] font-semibold text-gold-400/80">Paid</span>
            </span>
          )}

          {/* Quick preview swatches — die-face style */}
          {!diceColorsOpen && !diceColorsGated && (
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

        {/* Editor panel — gated content: dimmed when locked */}
        <div id="profile-dice-colors-panel" hidden={!diceColorsOpen}>
          {diceColorsGated ? (
            <div className="mt-2 space-y-2">
              <div className="flex items-center gap-2 rounded-lg border border-gold-500/25 bg-gold-500/6 px-3 py-2">
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5 shrink-0 text-gold-400/80" aria-hidden="true">
                  <path d="M2 19h20v3H2v-3zm1-1L6 6l4 4 2-6 2 6 4-4 3 12H3z" />
                </svg>
                <p className="flex-1 text-xs text-[#b9baa3]/80 leading-snug">
                  <span className="font-semibold text-gold-400">Paid membership</span>{" "}
                  required for custom dice colors.
                </p>
                <button
                  onClick={startOAuth}
                  disabled={isLinking}
                  className="shrink-0 rounded-md border border-gold-500/40 bg-gold-500/15 px-3 py-1 text-xs font-semibold text-gold-400 hover:bg-gold-500/25 hover:border-gold-500/60 transition-colors focus:outline-none focus:ring-2 focus:ring-gold-400 focus:ring-offset-1 focus:ring-offset-slate-900 disabled:opacity-50"
                >
                  {isLinking ? "Linking\u2026" : "View Tiers"}
                </button>
              </div>
              <div className="pointer-events-none select-none opacity-50" aria-hidden="true" inert>
                <p className="text-xs text-parchment-600 mb-2">
                  Set default dice colors for all your characters. Individual characters can override these.
                </p>
                <DiceColorEditor
                  value={localPrefs}
                  defaults={SYSTEM_DEFAULTS}
                  onChange={() => {}}
                />
              </div>
            </div>
          ) : (
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
          )}
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

      {/* ── Curses! Content ──────────────────────────────────────── */}
      <div className="mt-4 pt-3 border-t border-[#577399]/20">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <span className="text-xs uppercase tracking-widest text-parchment-500 font-medium">
              Curses! Content
            </span>
            <p className="text-[11px] text-parchment-600 mt-0.5 leading-tight">
              Enable homebrew Curses! features (Faction Favors, extra conditions)
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={cursesEnabled}
            aria-label="Enable Curses! content"
            onClick={handleCursesToggle}
            className={[
              "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full",
              "border-2 transition-colors duration-200",
              "focus:outline-none focus:ring-2 focus:ring-coral-400 focus:ring-offset-2 focus:ring-offset-slate-900",
              cursesEnabled
                ? "border-coral-400 bg-coral-400"
                : "border-slate-600 bg-slate-700",
            ].join(" ")}
          >
            <span
              aria-hidden="true"
              className={[
                "pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transition-transform duration-200",
                cursesEnabled ? "translate-x-5" : "translate-x-0",
              ].join(" ")}
            />
          </button>
        </div>
        {cursesSaveState !== "idle" && (
          <p
            role="status"
            aria-live="polite"
            className={[
              "text-[11px] mt-1.5",
              cursesSaveState === "saving" ? "text-[#577399]" : "",
              cursesSaveState === "saved"  ? "text-emerald-400/80" : "",
              cursesSaveState === "error"  ? "text-red-400/80" : "",
            ].join(" ")}
          >
            {cursesSaveState === "saving" && "Saving..."}
            {cursesSaveState === "saved" && "Preference saved"}
            {cursesSaveState === "error" && "Failed to save"}
          </p>
        )}
      </div>

      {/* ── Sign Out ─────────────────────────────────────────────── */}
      {/* Stronger separator distinguishes this from the editor above */}
      <div className="mt-5 pt-4 border-t border-slate-800/60 space-y-2">
        {hasPatreon && (
          <a
            href="https://www.patreon.com/settings/memberships"
            target="_blank"
            rel="noopener noreferrer"
            className="
              block w-full rounded-lg px-3 py-2 text-xs font-medium text-center
              border border-slate-700/30 text-parchment-600
              hover:border-[#f96854]/40 hover:text-[#f96854]/70
              transition-colors
              focus:outline-none focus:ring-2 focus:ring-[#f96854]/40 focus:ring-offset-2 focus:ring-offset-slate-900
            "
          >
            Manage Patreon Membership
          </a>
        )}
        <button
          type="button"
          onClick={onSignOut}
          className="
            w-full rounded-lg px-3 py-2 text-xs font-medium
            border border-slate-700/30 text-parchment-600
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
