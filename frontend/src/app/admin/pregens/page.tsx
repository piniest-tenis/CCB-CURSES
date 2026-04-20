"use client";

/**
 * src/app/admin/pregens/page.tsx
 *
 * Admin-only page for managing system-wide pre-generated characters.
 * Supports listing, creating (via JSON paste), and deleting pregens.
 */

import React, { useState, useMemo, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import {
  useAdminPregens,
  useCreateAdminPregen,
  useDeleteAdminPregen,
  type PregenManagementSummary,
} from "@/hooks/usePregens";
import type { Character } from "@shared/types";

// ─── Types ─────────────────────────────────────────────────────────────────────

type SortDir = "asc" | "desc";

// ─── Create Modal ──────────────────────────────────────────────────────────────

function CreatePregenModal({ onClose }: { onClose: () => void }) {
  const [json, setJson] = useState("");
  const [parseError, setParseError] = useState<string | null>(null);
  const createMutation = useCreateAdminPregen();

  const handleSubmit = useCallback(() => {
    setParseError(null);
    let character: Character;
    try {
      character = JSON.parse(json);
    } catch {
      setParseError("Invalid JSON. Please check the format and try again.");
      return;
    }
    if (!character || typeof character !== "object") {
      setParseError("Parsed value is not a valid Character object.");
      return;
    }
    createMutation.mutate(
      { character },
      {
        onSuccess: () => onClose(),
        onError: (err) =>
          setParseError(err.message || "Failed to create pre-gen."),
      }
    );
  }, [json, createMutation, onClose]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const handleBackdrop = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.target === e.currentTarget) onClose();
    },
    [onClose]
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={handleBackdrop}
    >
      <div className="w-full max-w-2xl mx-4 rounded-xl border border-slate-700/60 bg-[#0f1a14] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700/40">
          <h2 className="font-serif text-lg font-semibold text-[#f7f7ff]">
            Create Pre-gen
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-[#b9baa3] hover:text-[#f7f7ff] transition-colors p-1"
            aria-label="Close"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="w-4 h-4"
            >
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-4">
          <label className="block text-xs text-[#b9baa3] uppercase tracking-wider mb-1.5">
            Paste Character JSON
          </label>
          <textarea
            value={json}
            onChange={(e) => setJson(e.target.value)}
            rows={16}
            spellCheck={false}
            placeholder='{ "name": "...", "className": "...", ... }'
            className="
              w-full rounded-lg border border-slate-700/60 bg-slate-900/60
              px-3 py-2 text-sm text-[#f7f7ff] font-mono
              placeholder:text-[#b9baa3]/40
              focus:outline-none focus:border-[#577399]/60
              transition-colors resize-y
            "
          />
          {parseError && (
            <p className="text-xs text-[#fe5f55] bg-[#fe5f55]/10 border border-[#fe5f55]/20 rounded px-3 py-2">
              {parseError}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-slate-700/40">
          <button
            type="button"
            onClick={onClose}
            disabled={createMutation.isPending}
            className="px-3 py-1.5 text-sm text-[#b9baa3] hover:text-[#f7f7ff] border border-slate-700/40 hover:border-slate-600 rounded transition-colors disabled:opacity-40"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!json.trim() || createMutation.isPending}
            className="px-3 py-1.5 text-sm font-medium bg-[#577399]/20 hover:bg-[#577399]/30 text-[#577399] border border-[#577399]/40 hover:border-[#577399]/60 rounded transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {createMutation.isPending ? "Creating..." : "Create"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Delete Confirmation Modal ─────────────────────────────────────────────────

function DeleteConfirmModal({
  pregen,
  onClose,
}: {
  pregen: PregenManagementSummary;
  onClose: () => void;
}) {
  const deleteMutation = useDeleteAdminPregen();

  const handleDelete = useCallback(() => {
    deleteMutation.mutate(pregen.pregenId, {
      onSuccess: () => onClose(),
    });
  }, [deleteMutation, pregen.pregenId, onClose]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const handleBackdrop = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.target === e.currentTarget) onClose();
    },
    [onClose]
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={handleBackdrop}
    >
      <div className="w-full max-w-sm mx-4 rounded-xl border border-slate-700/60 bg-[#0f1a14] shadow-2xl">
        <div className="px-5 py-4 border-b border-slate-700/40">
          <h2 className="font-serif text-lg font-semibold text-[#f7f7ff]">
            Delete Pre-gen
          </h2>
        </div>
        <div className="px-5 py-4">
          <p className="text-sm text-[#b9baa3]">
            Permanently delete{" "}
            <span className="font-medium text-[#f7f7ff]">{pregen.name}</span>?
            This cannot be undone.
          </p>
          {deleteMutation.isError && (
            <p className="mt-3 text-xs text-[#fe5f55] bg-[#fe5f55]/10 border border-[#fe5f55]/20 rounded px-3 py-2">
              {deleteMutation.error?.message || "Failed to delete."}
            </p>
          )}
        </div>
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-slate-700/40">
          <button
            type="button"
            onClick={onClose}
            disabled={deleteMutation.isPending}
            className="px-3 py-1.5 text-sm text-[#b9baa3] hover:text-[#f7f7ff] border border-slate-700/40 hover:border-slate-600 rounded transition-colors disabled:opacity-40"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
            className="px-3 py-1.5 text-sm font-medium bg-[#fe5f55]/20 hover:bg-[#fe5f55]/30 text-[#fe5f55] border border-[#fe5f55]/40 hover:border-[#fe5f55]/60 rounded transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {deleteMutation.isPending ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function AdminPregensPage() {
  const router = useRouter();
  const { isAuthenticated, isReady, user, idToken, signOut, refreshTokens } =
    useAuthStore();

  // ── Force a token refresh on mount so the JWT contains up-to-date group
  // claims. Group membership added after the last sign-in won't appear in a
  // cached token until it is refreshed.
  const [refreshState, setRefreshState] = useState<
    "pending" | "done" | "failed"
  >("pending");

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
                return Array.isArray(p)
                  ? p
                  : raw.split(/[\s,]+/).filter(Boolean);
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
      router.replace("/auth/login?return_to=/admin/pregens");
      return;
    }
    if (refreshState === "pending") return;
    if (!isAdmin) {
      const t = setTimeout(() => {
        if (!isAdmin) router.replace("/dashboard");
      }, 500);
      return () => clearTimeout(t);
    }
  }, [isReady, isAuthenticated, isAdmin, refreshState, router]);

  // ── Data ───────────────────────────────────────────────────────────────────

  const { data, isLoading, isError, refetch } = useAdminPregens();

  // ── Sort state ─────────────────────────────────────────────────────────────

  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const displayed = useMemo(() => {
    const pregens = data?.pregens ?? [];
    const sorted = [...pregens].sort((a, b) => {
      const result = a.name.localeCompare(b.name, undefined, {
        sensitivity: "base",
      });
      return sortDir === "asc" ? result : -result;
    });
    return sorted;
  }, [data, sortDir]);

  // ── Modal state ────────────────────────────────────────────────────────────

  const [showCreate, setShowCreate] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<PregenManagementSummary | null>(null);

  // ── Render guards ──────────────────────────────────────────────────────────

  if (!isReady || !isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a100d]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#577399] border-t-transparent" />
      </div>
    );
  }

  if (refreshState === "pending") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a100d]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#577399] border-t-transparent" />
          <p className="text-xs text-[#b9baa3] font-mono">
            refreshing session...
          </p>
        </div>
      </div>
    );
  }

  if (isReady && !isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a100d]">
        <p className="text-[#b9baa3] text-sm">Access denied.</p>
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
            <span className="text-xs font-semibold uppercase tracking-widest text-[#577399]/70 border border-[#577399]/30 rounded px-2 py-0.5">
              Admin
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/admin/characters"
              className="text-xs text-[#b9baa3] hover:text-[#f7f7ff] transition-colors"
            >
              Characters
            </Link>
            <Link
              href="/dashboard"
              className="text-xs text-[#b9baa3] hover:text-[#f7f7ff] transition-colors"
            >
              Dashboard
            </Link>
            {user && (
              <>
                <span className="text-sm text-[#b9baa3]">
                  {user.displayName || user.email}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    signOut().then(() => router.replace("/auth/login"))
                  }
                  className="rounded px-2.5 py-1 text-xs font-medium text-[#b9baa3] border border-slate-700/60 hover:text-[#f7f7ff] hover:border-slate-600 transition-colors"
                >
                  Sign out
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">
        {/* Page title + actions */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-end gap-3 justify-between">
          <div>
            <h1 className="font-serif text-3xl font-semibold text-[#f7f7ff]">
              System Pre-gens
            </h1>
            <p className="mt-1 text-sm text-[#b9baa3]">
              {isLoading
                ? "Loading..."
                : `${displayed.length} pre-gen${displayed.length !== 1 ? "s" : ""}`}
            </p>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => refetch()}
              className="text-xs text-[#b9baa3] hover:text-[#f7f7ff] transition-colors"
            >
              Refresh
            </button>
            <button
              type="button"
              onClick={() => setShowCreate(true)}
              className="rounded px-3 py-1.5 text-sm font-medium bg-[#577399]/20 hover:bg-[#577399]/30 text-[#577399] border border-[#577399]/40 hover:border-[#577399]/60 transition-colors"
            >
              Create Pre-gen
            </button>
          </div>
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
              Failed to load pre-gens. You may not have admin access, or the
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
            <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_auto_auto] gap-x-4 px-4 py-2.5 border-b border-slate-700/40 bg-slate-900/60">
              <button
                type="button"
                onClick={() =>
                  setSortDir((d) => (d === "asc" ? "desc" : "asc"))
                }
                className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-[#f7f7ff] hover:text-[#577399] transition-colors select-none"
              >
                Name
                <span className="text-xs leading-none">
                  {sortDir === "asc" ? "^" : "v"}
                </span>
              </button>
              <span className="text-xs font-semibold uppercase tracking-wider text-[#b9baa3] select-none">
                Class
              </span>
              <span className="text-xs font-semibold uppercase tracking-wider text-[#b9baa3] select-none">
                Ancestry
              </span>
              <span className="text-xs font-semibold uppercase tracking-wider text-[#b9baa3] select-none">
                Community
              </span>
              <span className="text-xs font-semibold uppercase tracking-wider text-[#b9baa3] select-none">
                Domains
              </span>
              <span className="text-xs font-semibold uppercase tracking-wider text-[#b9baa3] select-none">
                Lvl
              </span>
              <span className="text-xs font-semibold uppercase tracking-wider text-[#b9baa3] select-none">
                Actions
              </span>
            </div>

            {/* Rows */}
            {displayed.length === 0 ? (
              <div className="py-16 text-center text-sm text-[#b9baa3]">
                No pre-gens found. Create one to get started.
              </div>
            ) : (
              <div className="divide-y divide-slate-800/60">
                {displayed.map((p) => (
                  <div
                    key={p.pregenId}
                    className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_auto_auto] gap-x-4 px-4 py-3 items-center hover:bg-slate-800/30 transition-colors"
                  >
                    <span className="text-sm font-medium text-[#f7f7ff] truncate">
                      {p.name}
                    </span>
                    <span className="text-sm text-[#b9baa3] truncate">
                      {p.className}
                      {p.subclassName ? ` (${p.subclassName})` : ""}
                    </span>
                    <span className="text-sm text-[#b9baa3] truncate">
                      {p.ancestryName ?? (
                        <span className="text-[#b9baa3]/50">-</span>
                      )}
                    </span>
                    <span className="text-sm text-[#b9baa3] truncate">
                      {p.communityName ?? (
                        <span className="text-[#b9baa3]/50">-</span>
                      )}
                    </span>
                    <span className="text-sm text-[#b9baa3] truncate">
                      {p.domains.length > 0
                        ? p.domains.join(", ")
                        : <span className="text-[#b9baa3]/50">-</span>}
                    </span>
                    <span className="text-xs font-semibold text-[#577399] text-right tabular-nums">
                      {p.nativeLevel}
                    </span>
                    <div className="flex items-center justify-end">
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(p)}
                        className="rounded border border-slate-700/60 px-2 py-1 text-xs text-[#fe5f55]/70 hover:text-[#fe5f55] hover:border-[#fe5f55]/40 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Modals */}
      {showCreate && <CreatePregenModal onClose={() => setShowCreate(false)} />}
      {deleteTarget && (
        <DeleteConfirmModal
          pregen={deleteTarget}
          onClose={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
