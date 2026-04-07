"use client";

/**
 * src/app/homebrew/page.tsx
 *
 * Homebrew list page — shows all homebrew content created by the current user.
 *
 * Layout:
 *   - AppHeader (shared sticky top bar)
 *   - Type filter tabs: All | Classes | Domains | Ancestries | Communities
 *   - Search bar + sort dropdown
 *   - Grid of homebrew item cards with coral accent
 *   - Empty state with CTA to create first homebrew content
 *   - Footer
 */

import React, { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { useHomebrewList, useDeleteHomebrew } from "@/hooks/useHomebrew";
import type { HomebrewContentType, HomebrewSummary } from "@shared/types";

import { AppHeader } from "@/components/AppHeader";
import { SourceBadge } from "@/components/SourceBadge";
import { Footer } from "@/components/Footer";

// ─── Constants ────────────────────────────────────────────────────────────────

type FilterTab = "all" | HomebrewContentType;

const TABS: { key: FilterTab; label: string }[] = [
  { key: "all",        label: "All" },
  { key: "class",      label: "Classes" },
  { key: "domainCard", label: "Domain Cards" },
  { key: "ancestry",   label: "Ancestries" },
  { key: "community",  label: "Communities" },
];

type SortKey = "updatedAt" | "name" | "contentType";

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "updatedAt",   label: "Recently Updated" },
  { key: "name",        label: "Name" },
  { key: "contentType", label: "Type" },
];

/** Map content type to a human-readable label. */
function contentTypeLabel(ct: HomebrewContentType): string {
  switch (ct) {
    case "class":      return "Class";
    case "domainCard": return "Domain Card";
    case "ancestry":   return "Ancestry";
    case "community":  return "Community";
  }
}

/** Map content type to a badge color class. */
function typeColorClasses(ct: HomebrewContentType): string {
  switch (ct) {
    case "class":
      return "border-burgundy-700/40 bg-burgundy-900/30 text-burgundy-400";
    case "domainCard":
      return "border-steel-400/40 bg-steel-400/10 text-steel-400";
    case "ancestry":
      return "border-gold-500/40 bg-gold-500/10 text-gold-400";
    case "community":
      return "border-emerald-500/40 bg-emerald-500/10 text-emerald-400";
  }
}

// ─── Sort helper ──────────────────────────────────────────────────────────────

function sortItems(items: HomebrewSummary[], key: SortKey): HomebrewSummary[] {
  return [...items].sort((a, b) => {
    switch (key) {
      case "updatedAt":
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      case "name":
        return a.name.localeCompare(b.name);
      case "contentType":
        return a.contentType.localeCompare(b.contentType) || a.name.localeCompare(b.name);
    }
  });
}

// ─── HomebrewCard ─────────────────────────────────────────────────────────────

interface HomebrewCardProps {
  item: HomebrewSummary;
  onEdit: () => void;
  onDelete: () => void;
  isDeleting: boolean;
}

function HomebrewCard({ item, onEdit, onDelete, isDeleting }: HomebrewCardProps) {
  const [showConfirm, setShowConfirm] = useState(false);

  return (
    <div
      className="
        group relative rounded-xl border border-slate-700/60 bg-slate-900/60
        hover:border-coral-400/40 hover:shadow-glow-coral
        transition-all duration-200
        flex flex-col
        border-l-[3px] border-l-coral-400/50
      "
      style={{
        backgroundImage: "linear-gradient(135deg, rgba(249,104,84,0.04) 0%, transparent 60%)",
      }}
    >
      <div className="flex-1 p-4 space-y-2">
        {/* Header: type badge + name */}
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${typeColorClasses(item.contentType)}`}
              >
                {contentTypeLabel(item.contentType)}
              </span>
              <SourceBadge source="homebrew" size="xs" />
            </div>
            <h3 className="font-serif text-lg font-semibold text-[#f7f7ff] leading-tight truncate">
              {item.name}
            </h3>
          </div>
        </div>

        {/* Timestamp */}
        <p className="text-xs text-parchment-600">
          Updated{" "}
          {new Date(item.updatedAt).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
        </p>
      </div>

      {/* Actions */}
      <div className="border-t border-slate-700/40 px-4 py-3 flex items-center gap-2">
        <button
          type="button"
          onClick={onEdit}
          className="
            flex-1 rounded-lg px-3 py-1.5 text-sm font-medium
            border border-coral-400/40 bg-coral-400/10 text-coral-400
            hover:bg-coral-400/20 hover:border-coral-400
            transition-colors
            focus:outline-none focus:ring-2 focus:ring-coral-400 focus:ring-offset-2 focus:ring-offset-slate-900
          "
        >
          Edit
        </button>
        {showConfirm ? (
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => { onDelete(); setShowConfirm(false); }}
              disabled={isDeleting}
              className="rounded-lg px-2.5 py-1.5 text-xs font-medium bg-[#fe5f55]/20 border border-[#fe5f55]/40 text-[#fe5f55] hover:bg-[#fe5f55]/30 transition-colors disabled:opacity-40"
            >
              {isDeleting ? "..." : "Confirm"}
            </button>
            <button
              type="button"
              onClick={() => setShowConfirm(false)}
              className="rounded-lg px-2 py-1.5 text-xs text-parchment-500 hover:text-[#b9baa3] transition-colors"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowConfirm(true)}
            className="
              rounded-lg px-3 py-1.5 text-sm font-medium
              text-parchment-600 border border-slate-700/40
              hover:text-[#fe5f55] hover:border-[#fe5f55]/40
              transition-colors
              focus:outline-none focus:ring-2 focus:ring-[#fe5f55] focus:ring-offset-2 focus:ring-offset-slate-900
            "
          >
            Delete
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function HomebrewListPage() {
  const router = useRouter();
  const { isAuthenticated, isReady, isLoading: authLoading } = useAuthStore();
  const { data: items, isLoading, isError } = useHomebrewList();
  const deleteMutation = useDeleteHomebrew();

  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("updatedAt");

  // Auth guard
  useEffect(() => {
    if (isReady && !isAuthenticated) {
      router.replace("/auth/login");
    }
  }, [isReady, isAuthenticated, router]);

  // Derived: filtered + sorted
  const allItems = items ?? [];
  const filteredAndSorted = useMemo(() => {
    let filtered = activeTab === "all"
      ? allItems
      : allItems.filter((item) => item.contentType === activeTab);

    const q = query.toLowerCase().trim();
    if (q) {
      filtered = filtered.filter((item) => item.name.toLowerCase().includes(q));
    }

    return sortItems(filtered, sortKey);
  }, [allItems, activeTab, query, sortKey]);

  if (!isReady || authLoading || !isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a100d]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-coral-400 border-t-transparent" />
      </div>
    );
  }

  const totalCount = allItems.length;
  const filteredCount = filteredAndSorted.length;

  return (
    <div className="flex min-h-screen flex-col bg-[#0a100d]">
      <AppHeader />

      <main className="flex-1 mx-auto max-w-[1200px] w-full px-4 py-8">
        {/* Page header */}
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <h1 className="font-serif text-3xl font-semibold text-[#f7f7ff]">
              Homebrew Workshop
            </h1>
            {!isLoading && (
              <p className="mt-1 text-sm text-parchment-600">
                {totalCount} item{totalCount !== 1 ? "s" : ""} created
              </p>
            )}
          </div>

          {/* New button */}
          <div className="relative group">
            <button
              type="button"
              onClick={() => router.push("/homebrew/new")}
              className="
                shrink-0 flex items-center gap-2
                rounded-xl border border-coral-400/60 bg-coral-400/10
                px-5 py-2.5 font-semibold text-base text-coral-400
                hover:bg-coral-400/20 hover:border-coral-400
                transition-all duration-150 shadow-sm
                focus:outline-none focus:ring-2 focus:ring-coral-400
                focus:ring-offset-2 focus:ring-offset-[#0a100d]
              "
            >
              <span aria-hidden="true">+</span>
              <span className="hidden sm:inline">New Homebrew</span>
              <span className="sm:hidden">New</span>
            </button>
          </div>
        </div>

        {/* Type filter tabs */}
        <div className="mb-5 flex items-center gap-1 overflow-x-auto pb-1 scrollbar-hide">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            const count = tab.key === "all"
              ? totalCount
              : allItems.filter((i) => i.contentType === tab.key).length;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`
                  shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors
                  focus:outline-none focus:ring-2 focus:ring-coral-400 focus:ring-offset-2 focus:ring-offset-[#0a100d]
                  ${
                    isActive
                      ? "bg-coral-400/15 text-coral-400 border border-coral-400/50"
                      : "text-parchment-500 hover:text-[#b9baa3]/80 hover:bg-slate-800/50 border border-transparent"
                  }
                `}
              >
                {tab.label}
                {!isLoading && (
                  <span className={`ml-1.5 text-xs ${isActive ? "text-coral-400/60" : "text-parchment-600"}`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Search + sort bar */}
        {!isLoading && !isError && totalCount > 0 && (
          <div className="mb-5 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* Search */}
            <div className="relative flex-1">
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search homebrew..."
                className="
                  w-full rounded-lg border border-slate-700/60 bg-slate-900/60
                  px-3 py-2 pl-9 text-sm text-[#f7f7ff]
                  placeholder:text-parchment-600
                  focus:outline-none focus:ring-2 focus:ring-coral-400/50 focus:border-coral-400/50
                  transition-colors
                "
              />
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-parchment-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>

            {/* Sort */}
            <select
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as SortKey)}
              className="
                rounded-lg border border-slate-700/60 bg-slate-900/60
                px-3 py-2 text-sm text-parchment-500
                focus:outline-none focus:ring-2 focus:ring-coral-400/50
                cursor-pointer
              "
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.key} value={opt.key}>
                  {opt.label}
                </option>
              ))}
            </select>

            {/* Result count */}
            {query && (
              <span className="text-xs text-parchment-600 self-center shrink-0">
                {filteredCount} of {totalCount}
              </span>
            )}
          </div>
        )}

        {/* Loading */}
        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-coral-400 border-t-transparent" />
          </div>
        )}

        {/* Error */}
        {isError && !isLoading && (
          <div className="rounded-xl border border-[#fe5f55]/30 bg-slate-900/80 p-8 text-center">
            <p className="font-serif text-lg text-[#fe5f55]/80">
              Failed to load homebrew content
            </p>
            <p className="mt-1 text-sm text-parchment-500">
              Please try refreshing the page.
            </p>
          </div>
        )}

        {/* Empty state — no items at all */}
        {!isLoading && !isError && totalCount === 0 && (
          <div
            className="rounded-2xl border border-dashed border-coral-400/30 p-16 text-center space-y-5"
            style={{ background: "rgba(249,104,84,0.03)" }}
          >
            <div aria-hidden="true" className="text-5xl opacity-15 select-none">
              &#9881;
            </div>
            <div className="space-y-2">
              <p className="font-serif text-xl text-[#f7f7ff]/70">
                No homebrew content yet
              </p>
              <p className="text-base text-parchment-600 max-w-sm mx-auto leading-relaxed">
                Create custom Classes, Ancestries, Communities, and Domain Cards
                for your Daggerheart campaigns.
              </p>
            </div>
            <button
              type="button"
              onClick={() => router.push("/homebrew/new")}
              className="
                mt-2 inline-flex items-center gap-2 rounded-xl
                border border-coral-400/60 bg-coral-400/10
                px-7 py-3 text-base font-semibold text-coral-400
                hover:bg-coral-400/20 hover:border-coral-400
                transition-all duration-150
                focus:outline-none focus:ring-2 focus:ring-coral-400
                focus:ring-offset-2 focus:ring-offset-[#0a100d]
              "
            >
              <span aria-hidden="true">+</span> Create Your First Homebrew
            </button>
          </div>
        )}

        {/* Empty filter state */}
        {!isLoading && !isError && totalCount > 0 && filteredCount === 0 && (
          <div className="rounded-xl border border-slate-700/40 bg-slate-900/40 p-8 text-center space-y-3">
            <p className="text-parchment-500">
              No homebrew matching{" "}
              {query && <>&ldquo;{query}&rdquo;</>}
              {activeTab !== "all" && !query && <>{contentTypeLabel(activeTab as HomebrewContentType)}s</>}
              {activeTab !== "all" && query && <> in {contentTypeLabel(activeTab as HomebrewContentType)}s</>}
            </p>
            <button
              type="button"
              onClick={() => { setQuery(""); setActiveTab("all"); }}
              className="text-xs text-coral-400 hover:underline"
            >
              Clear filters
            </button>
          </div>
        )}

        {/* Item grid */}
        {!isLoading && !isError && filteredCount > 0 && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredAndSorted.map((item) => (
              <HomebrewCard
                key={`${item.contentType}-${item.pk}-${item.sk}`}
                item={item}
                onEdit={() =>
                  router.push(
                    `/homebrew/${item.contentType}/${encodeURIComponent(item.slug)}/edit` +
                    (item.domain ? `?domain=${encodeURIComponent(item.domain)}` : "")
                  )
                }
                onDelete={() =>
                  deleteMutation.mutate({
                    contentType: item.contentType,
                    id: item.slug,
                    ...(item.domain ? { domain: item.domain } : {}),
                  })
                }
                isDeleting={
                  deleteMutation.isPending &&
                  deleteMutation.variables?.contentType === item.contentType &&
                  deleteMutation.variables?.id === item.slug
                }
              />
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
