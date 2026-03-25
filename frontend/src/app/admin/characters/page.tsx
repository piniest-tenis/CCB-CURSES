"use client";

/**
 * src/app/admin/characters/page.tsx
 *
 * Admin-only view: lists every character in the system.
 * Accessible only to users in the Cognito "admin" group.
 * Sortable by name, class, ancestry, owner, and date created.
 * Filterable by free-text search across name, class, ancestry, and owner.
 */

import React, { useState, useMemo, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { apiClient } from "@/lib/api";
import {
  useAdminAllCharacters,
  type AdminCharacterSummary,
} from "@/hooks/useCharacter";
import {
  useCampaigns,
  useAddCharacterToCampaign,
  useRemoveCharacterFromCampaign,
} from "@/hooks/useCampaigns";
import { useQueryClient } from "@tanstack/react-query";

// ─── Types ─────────────────────────────────────────────────────────────────────

type SortField = "name" | "className" | "ancestryId" | "ownerName" | "createdAt";
type SortDir = "asc" | "desc";
type ShareState = "idle" | "loading" | "copied" | "error";

// ─── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

function cmp(a: string, b: string): number {
  return a.localeCompare(b, undefined, { sensitivity: "base" });
}

function sortCharacters(
  chars: AdminCharacterSummary[],
  field: SortField,
  dir: SortDir
): AdminCharacterSummary[] {
  const sorted = [...chars].sort((a, b) => {
    let result = 0;
    switch (field) {
      case "name":
        result = cmp(a.name, b.name);
        break;
      case "className":
        result = cmp(a.className, b.className);
        break;
      case "ancestryId":
        result = cmp(a.ancestryId ?? "", b.ancestryId ?? "");
        break;
      case "ownerName":
        result = cmp(a.ownerName, b.ownerName);
        break;
      case "createdAt":
        result =
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        break;
    }
    return dir === "asc" ? result : -result;
  });
  return sorted;
}

// ─── SortHeader ────────────────────────────────────────────────────────────────

function SortHeader({
  field,
  label,
  current,
  dir,
  onSort,
}: {
  field: SortField;
  label: string;
  current: SortField;
  dir: SortDir;
  onSort: (f: SortField) => void;
}) {
  const active = current === field;
  return (
    <button
      type="button"
      onClick={() => onSort(field)}
      className={`
        flex items-center gap-1 text-xs font-semibold uppercase tracking-wider
        transition-colors select-none
        ${active ? "text-[#daa520]" : "text-[#b9baa3]/40 hover:text-[#b9baa3]/70"}
      `}
    >
      {label}
      <span className="text-xs leading-none">
        {active ? (dir === "asc" ? "▲" : "▼") : "⇅"}
      </span>
    </button>
  );
}

// ─── ShareButton ───────────────────────────────────────────────────────────────

function ShareButton({ characterId }: { characterId: string }) {
  const [state, setState] = useState<ShareState>("idle");

  const handleShare = useCallback(
    async (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (state === "loading") return;
      setState("loading");
      try {
        const data = await apiClient.get<{ shareToken: string; shareUrl: string }>(
          `/admin/characters/${characterId}/share`
        );
        // Build the public URL using the share token — rewrite to /public path
        // regardless of what FRONTEND_URL the API was configured with.
        const origin = typeof window !== "undefined" ? window.location.origin : "";
        const url = `${origin}/character/${characterId}/public?token=${data.shareToken}`;
        await navigator.clipboard.writeText(url);
        setState("copied");
        setTimeout(() => setState("idle"), 2500);
      } catch {
        setState("error");
        setTimeout(() => setState("idle"), 2500);
      }
    },
    [characterId, state]
  );

  const label =
    state === "copied" ? "Copied!" :
    state === "error"  ? "Failed"  :
    "Copy share link";

  return (
    <button
      type="button"
      onClick={handleShare}
      disabled={state === "loading"}
      aria-label={label}
      title={label}
      className={[
        "group relative flex items-center justify-center",
        "w-7 h-7 rounded border transition-colors",
        "focus:outline-none focus:ring-2 focus:ring-[#577399]",
        "disabled:opacity-50 disabled:cursor-wait",
        state === "copied"
          ? "border-green-700/60 bg-green-900/20 text-green-400"
          : state === "error"
          ? "border-red-700/60 bg-red-900/20 text-red-400"
          : "border-slate-700/60 bg-transparent text-[#b9baa3]/40 hover:border-[#577399]/60 hover:text-[#577399]",
      ].join(" ")}
    >
      {state === "loading" ? (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 animate-spin">
          <path fillRule="evenodd" d="M15.312 11.424a5.5 5.5 0 01-9.201 2.466l-.312-.311h2.433a.75.75 0 000-1.5H3.989a.75.75 0 00-.75.75v4.242a.75.75 0 001.5 0v-2.43l.31.31a7 7 0 0011.712-3.138.75.75 0 00-1.449-.389zm1.23-3.723a.75.75 0 00.219-.53V2.929a.75.75 0 00-1.5 0V5.36l-.31-.31A7 7 0 003.239 8.188a.75.75 0 101.448.389A5.5 5.5 0 0113.89 6.11l.311.31h-2.432a.75.75 0 000 1.5h4.243a.75.75 0 00.53-.219z" clipRule="evenodd" />
        </svg>
      ) : state === "copied" ? (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
          <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
        </svg>
      ) : state === "error" ? (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
        </svg>
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
          <path d="M13 4.5a2.5 2.5 0 11.702 1.737L6.97 9.604a2.518 2.518 0 010 .792l6.733 3.367a2.5 2.5 0 11-.671 1.341l-6.733-3.367a2.5 2.5 0 110-3.474l6.733-3.366A2.52 2.52 0 0113 4.5z" />
        </svg>
      )}
      {/* Tooltip */}
      <span className={[
        "pointer-events-none absolute right-full mr-2 top-1/2 -translate-y-1/2",
        "whitespace-nowrap rounded px-2 py-1 text-xs",
        "opacity-0 group-hover:opacity-100 transition-opacity z-10",
        "border",
        state === "copied"
          ? "bg-green-900 border-green-700 text-green-200"
          : state === "error"
          ? "bg-red-900 border-red-700 text-red-200"
          : "bg-slate-800 border-slate-700 text-[#f7f7ff]",
      ].join(" ")}>
        {label}
      </span>
    </button>
  );
}

// ─── AddToCampaignModal ─────────────────────────────────────────────────────────

interface AddToCampaignModalProps {
  character: AdminCharacterSummary;
  onClose: () => void;
  onSuccess: () => void;
}

function AddToCampaignModal({ character, onClose, onSuccess }: AddToCampaignModalProps) {
  const { data: campaigns, isLoading: campaignsLoading } = useCampaigns();
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  const addMutation = useAddCharacterToCampaign(selectedCampaignId);
  const removeMutation = useRemoveCharacterFromCampaign(character.campaignId ?? "");

  const currentCampaign = useMemo(
    () => campaigns?.find((c) => c.campaignId === character.campaignId),
    [campaigns, character.campaignId]
  );

  const handleAdd = useCallback(async () => {
    if (!selectedCampaignId) return;
    setError(null);
    try {
      await addMutation.mutateAsync({ characterId: character.characterId });
      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add character to campaign");
    }
  }, [selectedCampaignId, addMutation, character.characterId, onSuccess, onClose]);

  const handleRemove = useCallback(async () => {
    if (!character.campaignId) return;
    setError(null);
    try {
      await removeMutation.mutateAsync(character.characterId);
      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove character from campaign");
    }
  }, [character, removeMutation, onSuccess, onClose]);

  const isBusy = addMutation.isPending || removeMutation.isPending;

  // Close on backdrop click
  const handleBackdrop = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  }, [onClose]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={handleBackdrop}
    >
      <div className="w-full max-w-md mx-4 rounded-xl border border-slate-700/60 bg-[#0f1a14] shadow-2xl">
        {/* Modal header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700/40">
          <div>
            <h2 className="font-serif text-lg font-semibold text-[#f7f7ff]">Campaign Assignment</h2>
            <p className="text-xs text-[#b9baa3]/50 mt-0.5 truncate max-w-xs">{character.name}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[#b9baa3]/40 hover:text-[#b9baa3] transition-colors p-1"
            aria-label="Close"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        </div>

        {/* Modal body */}
        <div className="px-5 py-4 space-y-4">
          {/* Current campaign */}
          {character.campaignId && (
            <div className="rounded-lg border border-slate-700/40 bg-slate-900/40 px-3 py-3">
              <p className="text-xs text-[#b9baa3]/50 uppercase tracking-wider mb-1">Currently in</p>
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-[#f7f7ff] font-medium truncate">
                  {currentCampaign?.name ?? character.campaignId}
                </span>
                <button
                  type="button"
                  onClick={handleRemove}
                  disabled={isBusy}
                  className="shrink-0 text-xs text-[#fe5f55]/70 hover:text-[#fe5f55] border border-[#fe5f55]/30 hover:border-[#fe5f55]/60 rounded px-2 py-1 transition-colors disabled:opacity-40"
                >
                  {removeMutation.isPending ? "Removing…" : "Remove"}
                </button>
              </div>
            </div>
          )}

          {/* Campaign selector */}
          <div>
            <label className="block text-xs text-[#b9baa3]/50 uppercase tracking-wider mb-1.5">
              {character.campaignId ? "Move to campaign" : "Add to campaign"}
            </label>
            {campaignsLoading ? (
              <div className="flex items-center gap-2 py-2 text-sm text-[#b9baa3]/40">
                <div className="h-4 w-4 animate-spin rounded-full border border-[#577399] border-t-transparent" />
                Loading campaigns…
              </div>
            ) : !campaigns || campaigns.length === 0 ? (
              <p className="text-sm text-[#b9baa3]/40 italic">No campaigns found.</p>
            ) : (
              <select
                value={selectedCampaignId}
                onChange={(e) => setSelectedCampaignId(e.target.value)}
                disabled={isBusy}
                className="w-full rounded-lg border border-slate-700/60 bg-slate-900/60 px-3 py-2 text-sm text-[#f7f7ff] focus:outline-none focus:border-[#577399]/60 transition-colors disabled:opacity-40"
              >
                <option value="">Select a campaign…</option>
                {campaigns.map((campaign) => (
                  <option key={campaign.campaignId} value={campaign.campaignId}>
                    {campaign.name}
                    {campaign.campaignId === character.campaignId ? " (current)" : ""}
                  </option>
                ))}
              </select>
            )}
          </div>

          {error && (
            <p className="text-xs text-[#fe5f55]/80 bg-[#fe5f55]/10 border border-[#fe5f55]/20 rounded px-3 py-2">
              {error}
            </p>
          )}
        </div>

        {/* Modal footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-slate-700/40">
          <button
            type="button"
            onClick={onClose}
            disabled={isBusy}
            className="px-3 py-1.5 text-sm text-[#b9baa3]/60 hover:text-[#b9baa3] border border-slate-700/40 hover:border-slate-600 rounded transition-colors disabled:opacity-40"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleAdd}
            disabled={!selectedCampaignId || isBusy || selectedCampaignId === character.campaignId}
            className="px-3 py-1.5 text-sm font-medium bg-[#577399]/20 hover:bg-[#577399]/30 text-[#577399] border border-[#577399]/40 hover:border-[#577399]/60 rounded transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {addMutation.isPending ? "Saving…" : character.campaignId ? "Move" : "Add"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── CampaignCell ───────────────────────────────────────────────────────────────

function CampaignCell({
  character,
  onRefetch,
}: {
  character: AdminCharacterSummary;
  onRefetch: () => void;
}) {
  const [showModal, setShowModal] = useState(false);
  const { data: campaigns } = useCampaigns();

  const campaignName = useMemo(
    () => campaigns?.find((c) => c.campaignId === character.campaignId)?.name ?? null,
    [campaigns, character.campaignId]
  );

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setShowModal(true);
        }}
        title={character.campaignId ? `Campaign: ${campaignName ?? character.campaignId}` : "Add to campaign"}
        className={[
          "group relative flex items-center justify-center gap-1.5",
          "max-w-[120px] rounded border px-2 py-1 text-xs transition-colors",
          "focus:outline-none focus:ring-2 focus:ring-[#577399]",
          character.campaignId
            ? "border-[#daa520]/30 bg-[#daa520]/10 text-[#daa520]/80 hover:border-[#daa520]/60 hover:text-[#daa520]"
            : "border-slate-700/40 text-[#b9baa3]/30 hover:border-[#577399]/40 hover:text-[#577399]/60",
        ].join(" ")}
      >
        {character.campaignId ? (
          <>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3 shrink-0">
              <path d="M8 9.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z" />
              <path fillRule="evenodd" d="M1.38 8.28a.87.87 0 0 1 0-.566 7.003 7.003 0 0 1 13.238.006.87.87 0 0 1 0 .566A7.003 7.003 0 0 1 1.379 8.28ZM11 8a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" clipRule="evenodd" />
            </svg>
            <span className="truncate">{campaignName ?? "Assigned"}</span>
          </>
        ) : (
          <>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3 shrink-0">
              <path d="M8.75 3.75a.75.75 0 0 0-1.5 0v3.5h-3.5a.75.75 0 0 0 0 1.5h3.5v3.5a.75.75 0 0 0 1.5 0v-3.5h3.5a.75.75 0 0 0 0-1.5h-3.5v-3.5Z" />
            </svg>
            <span>Campaign</span>
          </>
        )}
      </button>

      {showModal && (
        <AddToCampaignModal
          character={character}
          onClose={() => setShowModal(false)}
          onSuccess={onRefetch}
        />
      )}
    </>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function AdminCharactersPage() {
  const router = useRouter();
  const { isAuthenticated, isReady, user, idToken, signOut, refreshTokens } = useAuthStore();

  // ── Force a token refresh on mount so the JWT contains up-to-date group
  // claims. Group membership added after the last sign-in won't appear in a
  // cached token until it is refreshed.
  const [refreshState, setRefreshState] = useState<"pending" | "done" | "failed">("pending");

  useEffect(() => {
    if (!isReady || !isAuthenticated) return;
    refreshTokens()
      .then((newToken) => setRefreshState(newToken ? "done" : "failed"))
      .catch(() => setRefreshState("failed"));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReady, isAuthenticated]);

  // Derive admin status from the JWT claim
  const isAdmin = useMemo(() => {
    if (!idToken) return false;
    try {
      const payload = JSON.parse(atob(idToken.split(".")[1]));
      const raw = payload["cognito:groups"];
      const groups: string[] = Array.isArray(raw)
        ? raw
        : typeof raw === "string"
        ? (() => {
            try {
              const p = JSON.parse(raw);
              return Array.isArray(p) ? p : raw.split(/[\s,]+/).filter(Boolean);
            } catch {
              return raw.split(/[\s,]+/).filter(Boolean);
            }
          })()
        : [];
      return groups.includes("admin");
    } catch {
      return false;
    }
  }, [idToken]);

  // Redirect unauthenticated or non-admin users
  useEffect(() => {
    if (!isReady) return;
    if (!isAuthenticated) {
      router.replace("/auth/login");
      return;
    }
    // Only redirect away from admin once the refresh has settled — the token
    // may not contain the cognito:groups claim until after refresh completes.
    if (refreshState === "pending") return;
    if (!isAdmin) {
      const t = setTimeout(() => {
        if (!isAdmin) router.replace("/dashboard");
      }, 500);
      return () => clearTimeout(t);
    }
  }, [isReady, isAuthenticated, isAdmin, refreshState, router]);

  // Sort + filter state
  const [sortField, setSortField] = useState<SortField>("createdAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [filter, setFilter] = useState("");

  const { data, isLoading, isError, refetch } = useAdminAllCharacters(
    isReady && isAuthenticated && isAdmin && refreshState === "done"
  );

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  }

  const displayed = useMemo(() => {
    const chars = data?.characters ?? [];
    const q = filter.trim().toLowerCase();
    const filtered = q
      ? chars.filter(
          (c) =>
            c.name.toLowerCase().includes(q) ||
            c.className.toLowerCase().includes(q) ||
            (c.ancestryId ?? "").toLowerCase().includes(q) ||
            c.ownerName.toLowerCase().includes(q)
        )
      : chars;
    return sortCharacters(filtered, sortField, sortDir);
  }, [data, filter, sortField, sortDir]);

  // ── Render guards ──────────────────────────────────────────────────────────

  if (!isReady || !isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a100d]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#577399] border-t-transparent" />
      </div>
    );
  }

  // Hold the spinner until the forced token refresh settles — the admin claim
  // may not be present in the old token, causing a false "Access denied".
  if (refreshState === "pending") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a100d]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#577399] border-t-transparent" />
          <p className="text-xs text-[#b9baa3]/30 font-mono">refreshing session…</p>
        </div>
      </div>
    );
  }

  if (isReady && !isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a100d]">
        <p className="text-[#b9baa3]/50 text-sm">Access denied.</p>
      </div>
    );
  }

  // ── Main render ────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#0a100d]">
      {/* Header */}
      <header
        className="border-b border-slate-800/60 sticky top-0 z-10 backdrop-blur-sm"
        style={{ backgroundColor: "rgba(10,16,13,0.90)" }}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-4">
            <Image
              src="/images/curses-isolated-logo.png"
              alt="Curses! Custom Character Builder"
              width={120}
              height={34}
              className="object-contain"
              priority
            />
            <span className="text-xs font-semibold uppercase tracking-widest text-[#daa520]/70 border border-[#daa520]/30 rounded px-2 py-0.5">
              Admin
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="text-xs text-[#b9baa3]/50 hover:text-[#b9baa3] transition-colors"
            >
              ← Dashboard
            </Link>
            {user && (
              <>
                <span className="text-sm text-[#b9baa3]/40">
                  {user.displayName || user.email}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    signOut().then(() => router.replace("/auth/login"))
                  }
                  className="rounded px-2.5 py-1 text-xs font-medium text-[#b9baa3]/50 border border-slate-700/60 hover:text-[#f7f7ff] hover:border-slate-600 transition-colors"
                >
                  Sign out
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">
        {/* Page title + stats */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-end gap-3 justify-between">
          <div>
            <h1 className="font-serif text-3xl font-semibold text-[#f7f7ff]">
              All Characters
            </h1>
            <p className="mt-1 text-sm text-[#b9baa3]/40">
              {isLoading
                ? "Loading…"
                : `${displayed.length} of ${data?.characters.length ?? 0} character${(data?.characters.length ?? 0) !== 1 ? "s" : ""}`}
            </p>
          </div>
          <button
            type="button"
            onClick={() => refetch()}
            className="text-xs text-[#b9baa3]/40 hover:text-[#b9baa3] transition-colors self-start sm:self-auto"
          >
            ↺ Refresh
          </button>
        </div>

        {/* Filter bar */}
        <div className="mb-4">
          <input
            type="search"
            placeholder="Filter by name, class, ancestry, or owner…"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="
              w-full sm:w-80 rounded-lg border border-slate-700/60 bg-slate-900/60
              px-3 py-2 text-sm text-[#f7f7ff] placeholder:text-[#b9baa3]/30
              focus:outline-none focus:border-[#577399]/60
              transition-colors
            "
          />
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#577399] border-t-transparent" />
          </div>
        )}

        {/* Error */}
        {isError && !isLoading && (
          <div className="rounded-xl border border-[#fe5f55]/30 bg-slate-900/80 p-8 text-center">
            <p className="text-[#fe5f55]/70 text-sm">
              Failed to load characters. You may not have admin access, or the
              session may have expired.
            </p>
            <button
              type="button"
              onClick={() => refetch()}
              className="mt-3 text-xs text-[#577399] hover:underline"
            >
              Try again
            </button>
          </div>
        )}

        {/* Table */}
        {!isLoading && !isError && data && (
          <div className="rounded-xl border border-slate-700/40 bg-slate-900/40 overflow-hidden">
            {/* Table header */}
            <div className="grid grid-cols-[1fr_1fr_1fr_1fr_auto_auto_auto_auto] gap-x-4 px-4 py-2.5 border-b border-slate-700/40 bg-slate-900/60">
              <SortHeader
                field="name"
                label="Name"
                current={sortField}
                dir={sortDir}
                onSort={handleSort}
              />
              <SortHeader
                field="className"
                label="Class"
                current={sortField}
                dir={sortDir}
                onSort={handleSort}
              />
              <SortHeader
                field="ancestryId"
                label="Ancestry"
                current={sortField}
                dir={sortDir}
                onSort={handleSort}
              />
              <SortHeader
                field="ownerName"
                label="Owner"
                current={sortField}
                dir={sortDir}
                onSort={handleSort}
              />
              <SortHeader
                field="createdAt"
                label="Created"
                current={sortField}
                dir={sortDir}
                onSort={handleSort}
              />
              <span className="text-xs font-semibold uppercase tracking-wider text-[#b9baa3]/40 select-none">
                Lvl
              </span>
              <span className="text-xs font-semibold uppercase tracking-wider text-[#b9baa3]/40 select-none">
                Campaign
              </span>
              <span className="text-xs font-semibold uppercase tracking-wider text-[#b9baa3]/40 select-none">
                Share
              </span>
            </div>

            {/* Rows */}
            {displayed.length === 0 ? (
              <div className="py-16 text-center text-sm text-[#b9baa3]/30">
                {filter ? "No characters match that filter." : "No characters found."}
              </div>
            ) : (
              <div className="divide-y divide-slate-800/60">
                {displayed.map((c) => (
                  <div
                    key={c.characterId}
                    className="
                      grid grid-cols-[1fr_1fr_1fr_1fr_auto_auto_auto_auto] gap-x-4
                      px-4 py-3 items-center
                      hover:bg-slate-800/30 transition-colors
                      group
                    "
                  >
                    {/* Clickable cells — navigate to character sheet */}
                    <Link
                      href={`/character/${c.characterId}`}
                      className="contents"
                    >
                      <span className="text-sm font-medium text-[#f7f7ff] truncate group-hover:text-[#daa520] transition-colors">
                        {c.name}
                      </span>
                      <span className="text-sm text-[#b9baa3]/70 truncate">
                        {c.className}
                      </span>
                      <span className="text-sm text-[#b9baa3]/50 truncate">
                        {c.ancestryId
                          ? c.ancestryId
                              .replace(/-/g, " ")
                              .replace(/\b\w/g, (ch) => ch.toUpperCase())
                          : <span className="text-[#b9baa3]/25 italic">—</span>}
                      </span>
                      <span className="text-sm text-[#b9baa3]/50 truncate">
                        {c.ownerName}
                      </span>
                      <span className="text-xs text-[#b9baa3]/40 whitespace-nowrap">
                        {formatDate(c.createdAt)}
                      </span>
                      <span className="text-xs font-semibold text-[#577399] text-right">
                        {c.level}
                      </span>
                    </Link>
                    {/* Campaign cell — outside the Link so click doesn't navigate */}
                    <div className="flex items-center justify-start">
                      <CampaignCell character={c} onRefetch={() => refetch()} />
                    </div>
                    {/* Share button — outside the Link so click doesn't navigate */}
                    <div className="flex items-center justify-end">
                      <ShareButton characterId={c.characterId} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
