"use client";

/**
 * src/app/admin/characters/page.tsx
 *
 * Admin-only view: lists every character in the system.
 * Accessible only to users in the Cognito "admin" group.
 * Sortable by name, class, ancestry, and date created.
 * Filterable by free-text search across name, class, and ancestry.
 */

import React, { useState, useMemo, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import {
  useAdminAllCharacters,
  type AdminCharacterSummary,
} from "@/hooks/useCharacter";

// ─── Types ─────────────────────────────────────────────────────────────────────

type SortField = "name" | "className" | "ancestryId" | "createdAt";
type SortDir = "asc" | "desc";

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
      <span className="text-[10px] leading-none">
        {active ? (dir === "asc" ? "▲" : "▼") : "⇅"}
      </span>
    </button>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function AdminCharactersPage() {
  const router = useRouter();
  const { isAuthenticated, isReady, user, idToken, signOut } = useAuthStore();

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
    if (isAdmin === false && isReady) {
      // Wait a tick in case the token just loaded — isAdmin derives from idToken
      // which may lag isAuthenticated by one render.
      const t = setTimeout(() => {
        if (!isAdmin) router.replace("/dashboard");
      }, 500);
      return () => clearTimeout(t);
    }
  }, [isReady, isAuthenticated, isAdmin, router]);

  // Sort + filter state
  const [sortField, setSortField] = useState<SortField>("createdAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [filter, setFilter] = useState("");

  const { data, isLoading, isError, refetch } = useAdminAllCharacters();

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
            (c.ancestryId ?? "").toLowerCase().includes(q)
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
              alt="Curses!"
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
            placeholder="Filter by name, class, or ancestry…"
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
        {!isLoading && !isError && (
          <div className="rounded-xl border border-slate-700/40 bg-slate-900/40 overflow-hidden">
            {/* Table header */}
            <div className="grid grid-cols-[1fr_1fr_1fr_auto_auto] gap-x-4 px-4 py-2.5 border-b border-slate-700/40 bg-slate-900/60">
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
                field="createdAt"
                label="Created"
                current={sortField}
                dir={sortDir}
                onSort={handleSort}
              />
              <span className="text-xs font-semibold uppercase tracking-wider text-[#b9baa3]/40 select-none">
                Lvl
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
                  <Link
                    key={c.characterId}
                    href={`/character/${c.characterId}`}
                    className="
                      grid grid-cols-[1fr_1fr_1fr_auto_auto] gap-x-4
                      px-4 py-3 items-center
                      hover:bg-slate-800/30 transition-colors
                      group
                    "
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
                    <span className="text-xs text-[#b9baa3]/40 whitespace-nowrap">
                      {formatDate(c.createdAt)}
                    </span>
                    <span className="text-xs font-semibold text-[#577399] text-right">
                      {c.level}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
