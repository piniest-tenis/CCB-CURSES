"use client";

/**
 * src/app/frames/[id]/FrameDetailClient.tsx
 *
 * Campaign Frame Detail Page — displays full metadata, contents, restrictions,
 * and extensions for a single campaign frame. Supports delete with confirmation
 * and tabbed navigation between content sections.
 *
 * Layout follows the established detail-page pattern:
 *   - Auth guard with redirect
 *   - AppHeader
 *   - Back link to /frames
 *   - Loading / error / not-found states
 *   - Header card with metadata
 *   - Tabbed content sections (Contents, Restrictions, Extensions)
 */

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { AppHeader } from "@/components/AppHeader";
import {
  useFrameDetail,
  useDeleteFrame,
  useRemoveFrameContent,
  useRemoveFrameRestriction,
  useRemoveFrameExtension,
} from "@/hooks/useFrames";
import type {
  CampaignFrameDetail,
  FrameContentRef,
  FrameRestriction,
  FrameExtension,
  FrameComplexityRating,
} from "@shared/types";

// ─── Constants ────────────────────────────────────────────────────────────────

type TabId = "contents" | "restrictions" | "extensions";

const TABS: { id: TabId; label: string }[] = [
  { id: "contents", label: "Contents" },
  { id: "restrictions", label: "Restrictions" },
  { id: "extensions", label: "Extensions" },
];

const COMPLEXITY_STYLES: Record<
  FrameComplexityRating,
  { bg: string; text: string; border: string }
> = {
  low: {
    bg: "bg-green-500/10",
    text: "text-green-400",
    border: "border-green-500/30",
  },
  moderate: {
    bg: "bg-yellow-500/10",
    text: "text-yellow-400",
    border: "border-yellow-500/30",
  },
  high: {
    bg: "bg-orange-500/10",
    text: "text-orange-400",
    border: "border-orange-500/30",
  },
  extreme: {
    bg: "bg-[#fe5f55]/10",
    text: "text-[#fe5f55]",
    border: "border-[#fe5f55]/30",
  },
};

const CONTENT_TYPE_STYLES: Record<string, string> = {
  class: "bg-[#577399]/15 text-[#577399] border-[#577399]/30",
  ancestry: "bg-purple-500/15 text-purple-400 border-purple-500/30",
  community: "bg-teal-500/15 text-teal-400 border-teal-500/30",
  domainCard: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  weapon: "bg-red-500/15 text-red-400 border-red-500/30",
  armor: "bg-slate-500/15 text-slate-400 border-slate-500/30",
  item: "bg-green-500/15 text-green-400 border-green-500/30",
  consumable: "bg-pink-500/15 text-pink-400 border-pink-500/30",
};

const EXTENSION_TYPE_STYLES: Record<string, string> = {
  damageType: "bg-[#fe5f55]/15 text-[#fe5f55] border-[#fe5f55]/30",
  adversaryType: "bg-purple-500/15 text-purple-400 border-purple-500/30",
  condition: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  domain: "bg-[#577399]/15 text-[#577399] border-[#577399]/30",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

function formatContentType(type: string): string {
  switch (type) {
    case "domainCard":
      return "Domain Card";
    case "damageType":
      return "Damage Type";
    case "adversaryType":
      return "Adversary Type";
    default:
      return type.charAt(0).toUpperCase() + type.slice(1);
  }
}

// ─── Complexity Badge ─────────────────────────────────────────────────────────

function ComplexityBadge({
  complexity,
}: {
  complexity: FrameComplexityRating;
}) {
  const style = COMPLEXITY_STYLES[complexity];
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize ${style.bg} ${style.text} ${style.border}`}
    >
      {complexity}
    </span>
  );
}

// ─── Type Badge ───────────────────────────────────────────────────────────────

function TypeBadge({
  type,
  styleMap,
}: {
  type: string;
  styleMap: Record<string, string>;
}) {
  const style =
    styleMap[type] ?? "bg-slate-500/15 text-slate-400 border-slate-500/30";
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${style}`}
    >
      {formatContentType(type)}
    </span>
  );
}

// ─── Remove Button ────────────────────────────────────────────────────────────

function RemoveButton({
  label,
  onClick,
  isPending,
}: {
  label: string;
  onClick: () => void;
  isPending: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isPending}
      aria-label={label}
      className="
        ml-auto shrink-0 h-7 w-7 rounded-md
        flex items-center justify-center
        text-[#b9baa3]/40 hover:text-[#fe5f55] hover:bg-[#fe5f55]/10
        disabled:opacity-30 transition-colors
        focus:outline-none focus:ring-2 focus:ring-[#fe5f55]
      "
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 14 14"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        aria-hidden="true"
      >
        <path d="M3 3l8 8M11 3l-8 8" />
      </svg>
    </button>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center py-12">
      <p className="text-sm text-[#b9baa3]/40 italic">{message}</p>
    </div>
  );
}

// ─── Content Item Row ─────────────────────────────────────────────────────────

function ContentRow({
  item,
  onRemove,
  isRemoving,
  isOwner,
}: {
  item: FrameContentRef;
  onRemove: () => void;
  isRemoving: boolean;
  isOwner: boolean;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-slate-700/40 bg-slate-800/40 px-4 py-3">
      <TypeBadge type={item.contentType} styleMap={CONTENT_TYPE_STYLES} />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-[#f7f7ff] truncate">
          {item.name}
        </p>
        <p className="text-xs text-[#b9baa3]/50">
          Added {formatDate(item.addedAt)}
        </p>
      </div>
      {isOwner && (
        <RemoveButton
          label={`Remove ${item.name} from contents`}
          onClick={onRemove}
          isPending={isRemoving}
        />
      )}
    </div>
  );
}

// ─── Restriction Item Row ─────────────────────────────────────────────────────

function RestrictionRow({
  item,
  onRemove,
  isRemoving,
  isOwner,
}: {
  item: FrameRestriction;
  onRemove: () => void;
  isRemoving: boolean;
  isOwner: boolean;
}) {
  const modeStyle =
    item.mode === "restricted"
      ? "bg-[#fe5f55]/10 text-[#fe5f55] border-[#fe5f55]/30"
      : "bg-yellow-500/10 text-yellow-400 border-yellow-500/30";

  return (
    <div className="rounded-lg border border-slate-700/40 bg-slate-800/40 px-4 py-3">
      <div className="flex items-center gap-3">
        <TypeBadge type={item.contentType} styleMap={CONTENT_TYPE_STYLES} />
        <p className="text-sm font-medium text-[#f7f7ff] truncate flex-1 min-w-0">
          {item.name}
        </p>
        <span
          className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold capitalize ${modeStyle}`}
        >
          {item.mode}
        </span>
        {isOwner && (
          <RemoveButton
            label={`Remove ${item.name} restriction`}
            onClick={onRemove}
            isPending={isRemoving}
          />
        )}
      </div>
      {item.alterationNotes && (
        <p className="mt-2 text-sm text-[#b9baa3]/70 pl-1 border-l-2 border-yellow-500/30 ml-1">
          {item.alterationNotes}
        </p>
      )}
    </div>
  );
}

// ─── Extension Item Row ───────────────────────────────────────────────────────

function ExtensionRow({
  item,
  onRemove,
  isRemoving,
  isOwner,
}: {
  item: FrameExtension;
  onRemove: () => void;
  isRemoving: boolean;
  isOwner: boolean;
}) {
  return (
    <div className="rounded-lg border border-slate-700/40 bg-slate-800/40 px-4 py-3">
      <div className="flex items-center gap-3">
        <TypeBadge
          type={item.extensionType}
          styleMap={EXTENSION_TYPE_STYLES}
        />
        <p className="text-sm font-medium text-[#f7f7ff] truncate flex-1 min-w-0">
          {item.name}
        </p>
        {isOwner && (
          <RemoveButton
            label={`Remove ${item.name} extension`}
            onClick={onRemove}
            isPending={isRemoving}
          />
        )}
      </div>
      {item.description && (
        <p className="mt-2 text-sm text-[#b9baa3]/70">
          {item.description}
        </p>
      )}
    </div>
  );
}

// ─── Delete Confirmation ──────────────────────────────────────────────────────

function DeleteConfirmation({
  onConfirm,
  onCancel,
  isPending,
}: {
  onConfirm: () => void;
  onCancel: () => void;
  isPending: boolean;
}) {
  return (
    <div className="rounded-lg border border-[#fe5f55]/30 bg-[#fe5f55]/5 px-4 py-3">
      <p className="text-sm font-medium text-[#fe5f55]">
        Are you sure? This cannot be undone.
      </p>
      <div className="mt-3 flex items-center gap-3">
        <button
          type="button"
          onClick={onCancel}
          disabled={isPending}
          className="
            rounded-lg border border-slate-600 bg-transparent
            px-4 py-2 text-sm font-medium text-[#b9baa3]
            hover:bg-slate-800 disabled:opacity-40 transition-colors
            focus:outline-none focus:ring-2 focus:ring-[#577399]
          "
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={isPending}
          className="
            rounded-lg bg-[#fe5f55] px-4 py-2
            text-sm font-semibold text-white
            hover:bg-[#fe5f55]/80 disabled:opacity-40 transition-colors
            focus:outline-none focus:ring-2 focus:ring-[#fe5f55]
          "
        >
          {isPending ? "Deleting..." : "Delete Frame"}
        </button>
      </div>
    </div>
  );
}

// ─── Tab Bar ──────────────────────────────────────────────────────────────────

function TabBar({
  activeTab,
  onTabChange,
  counts,
}: {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  counts: Record<TabId, number>;
}) {
  return (
    <div
      role="tablist"
      aria-label="Frame content sections"
      className="flex border-b border-[#577399]/30"
    >
      {TABS.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            aria-controls={`tabpanel-${tab.id}`}
            id={`tab-${tab.id}`}
            type="button"
            onClick={() => onTabChange(tab.id)}
            className={`
              relative px-4 py-3 text-sm font-medium transition-colors
              focus:outline-none focus:ring-2 focus:ring-[#577399] focus:ring-inset
              ${
                isActive
                  ? "border-b-2 border-[#577399] text-[#f7f7ff] font-medium"
                  : "text-[#b9baa3] hover:text-[#f7f7ff]"
              }
            `}
          >
            {tab.label}
            {counts[tab.id] > 0 && (
              <span
                className={`
                  ml-2 inline-flex items-center justify-center
                  h-5 min-w-[1.25rem] rounded-full px-1.5
                  text-xs font-bold tabular-nums
                  ${
                    isActive
                      ? "bg-[#577399]/20 text-[#577399]"
                      : "bg-slate-700/60 text-[#b9baa3]/60"
                  }
                `}
              >
                {counts[tab.id]}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ─── Add Placeholder Button ───────────────────────────────────────────────────

function AddPlaceholderButton({ label }: { label: string }) {
  return (
    <button
      type="button"
      disabled
      className="
        rounded-lg border border-dashed border-[#577399]/30
        px-4 py-2.5 text-sm text-[#b9baa3]/40
        cursor-not-allowed
      "
      title="Coming soon"
    >
      + {label}
    </button>
  );
}

// ─── Loading Skeleton ─────────────────────────────────────────────────────────

function FrameDetailSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      {/* Header card skeleton */}
      <div className="rounded-xl border border-[#577399]/30 bg-slate-900/80 p-6 shadow-card-fantasy space-y-4">
        <div className="h-8 w-64 rounded bg-slate-700/60" />
        <div className="h-4 w-40 rounded bg-slate-700/40" />
        <div className="h-4 w-full max-w-md rounded bg-slate-700/40" />
        <div className="flex gap-3">
          <div className="h-4 w-24 rounded bg-slate-700/30" />
          <div className="h-4 w-24 rounded bg-slate-700/30" />
        </div>
      </div>
      {/* Tab bar skeleton */}
      <div className="flex gap-4 border-b border-[#577399]/30 pb-3">
        <div className="h-5 w-20 rounded bg-slate-700/40" />
        <div className="h-5 w-24 rounded bg-slate-700/40" />
        <div className="h-5 w-20 rounded bg-slate-700/40" />
      </div>
      {/* Content skeleton */}
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="h-14 rounded-lg bg-slate-700/30"
          />
        ))}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function FrameDetailClient() {
  const pathname = usePathname();
  // Extract the real frame ID from the browser URL.
  // useParams() returns "__placeholder__" in a static export; usePathname()
  // always reflects the actual browser URL path.
  const frameId = pathname?.split("/")[2] ?? "";
  const router = useRouter();

  const { isAuthenticated, isReady, isLoading: authLoading, user } =
    useAuthStore();

  // ── Data hooks ────────────────────────────────────────────────────────────
  const {
    data: frame,
    isLoading,
    isError,
    error,
  } = useFrameDetail(frameId || undefined);

  const deleteMutation = useDeleteFrame();
  const removeContentMutation = useRemoveFrameContent(frameId);
  const removeRestrictionMutation = useRemoveFrameRestriction(frameId);
  const removeExtensionMutation = useRemoveFrameExtension(frameId);

  // ── Local state ───────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<TabId>("contents");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // ── Auth guard ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (isReady && !isAuthenticated) router.replace("/auth/login");
  }, [isReady, isAuthenticated, router]);

  // ── Derived ───────────────────────────────────────────────────────────────
  const isOwner = Boolean(
    user?.userId && frame?.creatorUserId === user.userId,
  );

  const tabCounts = useMemo<Record<TabId, number>>(
    () => ({
      contents: frame?.contents.length ?? 0,
      restrictions: frame?.restrictions.length ?? 0,
      extensions: frame?.extensions.length ?? 0,
    }),
    [frame],
  );

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleDelete = useCallback(() => {
    if (!frameId) return;
    deleteMutation.mutate(frameId, {
      onSuccess: () => {
        router.push("/frames");
      },
    });
  }, [frameId, deleteMutation, router]);

  const handleRemoveContent = useCallback(
    (item: FrameContentRef) => {
      removeContentMutation.mutate({
        contentType: item.contentType,
        contentId: item.contentId,
      });
    },
    [removeContentMutation],
  );

  const handleRemoveRestriction = useCallback(
    (item: FrameRestriction) => {
      removeRestrictionMutation.mutate({
        contentType: item.contentType,
        contentId: item.contentId,
      });
    },
    [removeRestrictionMutation],
  );

  const handleRemoveExtension = useCallback(
    (item: FrameExtension) => {
      removeExtensionMutation.mutate({
        extensionType: item.extensionType,
        slug: item.slug,
      });
    },
    [removeExtensionMutation],
  );

  // ── Render guards ─────────────────────────────────────────────────────────

  if (!isReady || authLoading || !isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a100d]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#577399] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a100d]">
      <AppHeader />

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        {/* ── Back link ──────────────────────────────────────────────────── */}
        <Link
          href="/frames"
          className="
            inline-flex items-center gap-1.5 text-sm text-[#b9baa3]/60
            hover:text-[#b9baa3] transition-colors mb-6
            focus:outline-none focus:ring-2 focus:ring-[#577399] rounded
          "
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M10 12L6 8l4-4" />
          </svg>
          Campaign Frames
        </Link>

        {/* ── Loading ────────────────────────────────────────────────────── */}
        {isLoading && <FrameDetailSkeleton />}

        {/* ── Error ──────────────────────────────────────────────────────── */}
        {isError && !isLoading && (
          <div
            role="alert"
            className="rounded-xl border border-[#fe5f55]/30 bg-slate-900/80 p-8 text-center"
          >
            <p className="font-serif text-lg text-[#fe5f55]/80">
              Failed to load frame
            </p>
            <p className="mt-1 text-sm text-[#b9baa3]/50">
              {(error as Error)?.message ??
                "An unexpected error occurred."}
            </p>
            <Link
              href="/frames"
              className="
                mt-4 inline-block text-sm text-[#577399]
                hover:text-[#577399]/80 underline underline-offset-2
                focus:outline-none focus:ring-2 focus:ring-[#577399] rounded
              "
            >
              Back to Campaign Frames
            </Link>
          </div>
        )}

        {/* ── Not found ──────────────────────────────────────────────────── */}
        {!isLoading && !isError && !frame && frameId && (
          <div className="rounded-xl border border-slate-700/40 bg-slate-900/80 p-8 text-center">
            <p className="font-serif text-lg text-[#b9baa3]/60">
              Frame not found
            </p>
            <p className="mt-1 text-sm text-[#b9baa3]/40">
              This campaign frame may have been deleted or the link is
              invalid.
            </p>
            <Link
              href="/frames"
              className="
                mt-4 inline-block text-sm text-[#577399]
                hover:text-[#577399]/80 underline underline-offset-2
                focus:outline-none focus:ring-2 focus:ring-[#577399] rounded
              "
            >
              Back to Campaign Frames
            </Link>
          </div>
        )}

        {/* ── Main detail content ────────────────────────────────────────── */}
        {!isLoading && !isError && frame && (
          <div className="space-y-6">
            {/* ── Header Card ──────────────────────────────────────────── */}
            <section className="rounded-xl border border-[#577399]/30 bg-slate-900/80 p-6 shadow-card-fantasy">
              {/* Title row */}
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1">
                  <h1 className="font-serif text-3xl font-semibold text-[#f7f7ff] leading-tight">
                    {frame.name}
                  </h1>
                  {frame.author && (
                    <p className="mt-1 text-sm text-[#b9baa3]/60">
                      by {frame.author}
                    </p>
                  )}
                </div>
                {frame.complexity && (
                  <div className="shrink-0">
                    <ComplexityBadge complexity={frame.complexity} />
                  </div>
                )}
              </div>

              {/* Pitch */}
              {frame.pitch && (
                <p className="mt-4 text-base text-[#b9baa3] leading-relaxed">
                  {frame.pitch}
                </p>
              )}

              {/* Metadata row */}
              <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#b9baa3]/40">
                <span>
                  Created {formatDate(frame.createdAt)}
                </span>
                <span aria-hidden="true" className="hidden sm:inline">
                  |
                </span>
                <span>
                  Updated {formatDate(frame.updatedAt)}
                </span>
              </div>

              {/* Action buttons (owner only) */}
              {isOwner && (
                <div className="mt-5 space-y-3">
                  {!showDeleteConfirm && (
                    <div className="flex flex-wrap gap-3">
                      <Link
                        href={`/frames/${frameId}/edit`}
                        className="
                          inline-flex items-center rounded-lg border
                          border-[#577399]/50 bg-[#577399]/10
                          px-4 py-2 text-sm font-semibold text-[#577399]
                          hover:bg-[#577399]/20 hover:border-[#577399]
                          transition-colors
                          focus:outline-none focus:ring-2 focus:ring-[#577399]
                        "
                      >
                        Edit Frame
                      </Link>
                      <button
                        type="button"
                        onClick={() => setShowDeleteConfirm(true)}
                        className="
                          inline-flex items-center rounded-lg border
                          border-[#fe5f55]/30 bg-transparent
                          px-4 py-2 text-sm font-medium text-[#fe5f55]/70
                          hover:bg-[#fe5f55]/10 hover:border-[#fe5f55]/50
                          hover:text-[#fe5f55]
                          transition-colors
                          focus:outline-none focus:ring-2 focus:ring-[#fe5f55]
                        "
                      >
                        Delete
                      </button>
                    </div>
                  )}

                  {showDeleteConfirm && (
                    <DeleteConfirmation
                      onConfirm={handleDelete}
                      onCancel={() => setShowDeleteConfirm(false)}
                      isPending={deleteMutation.isPending}
                    />
                  )}

                  {deleteMutation.isError && (
                    <p
                      role="alert"
                      className="text-sm text-[#fe5f55]"
                    >
                      {(deleteMutation.error as Error)?.message ??
                        "Failed to delete frame."}
                    </p>
                  )}
                </div>
              )}
            </section>

            {/* ── Metadata Section ─────────────────────────────────────── */}
            {(frame.toneAndFeel ||
              frame.overview ||
              frame.themes.length > 0 ||
              frame.touchstones.length > 0) && (
              <section className="rounded-xl border border-[#577399]/30 bg-slate-900/80 p-6 shadow-card-fantasy space-y-5">
                {/* Tone & Feel */}
                {frame.toneAndFeel && (
                  <div>
                    <h2 className="text-xs font-semibold uppercase tracking-widest text-[#b9baa3]/50 mb-2">
                      Tone & Feel
                    </h2>
                    <div className="border-l-2 border-[#577399]/40 pl-4">
                      <p className="text-sm text-[#f7f7ff]/80 italic leading-relaxed">
                        {frame.toneAndFeel}
                      </p>
                    </div>
                  </div>
                )}

                {/* Overview */}
                {frame.overview && (
                  <div>
                    <h2 className="text-xs font-semibold uppercase tracking-widest text-[#b9baa3]/50 mb-2">
                      Overview
                    </h2>
                    <p className="text-sm text-[#b9baa3] leading-relaxed whitespace-pre-wrap">
                      {frame.overview}
                    </p>
                  </div>
                )}

                {/* Themes */}
                {frame.themes.length > 0 && (
                  <div>
                    <h2 className="text-xs font-semibold uppercase tracking-widest text-[#b9baa3]/50 mb-2">
                      Themes
                    </h2>
                    <div className="flex flex-wrap gap-2">
                      {frame.themes.map((theme) => (
                        <span
                          key={theme}
                          className="
                            inline-flex items-center rounded-full
                            border border-[#577399]/25 bg-[#577399]/10
                            px-3 py-1 text-xs font-medium text-[#577399]
                          "
                        >
                          {theme}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Touchstones */}
                {frame.touchstones.length > 0 && (
                  <div>
                    <h2 className="text-xs font-semibold uppercase tracking-widest text-[#b9baa3]/50 mb-2">
                      Touchstones
                    </h2>
                    <div className="flex flex-wrap gap-2">
                      {frame.touchstones.map((touchstone) => (
                        <span
                          key={touchstone}
                          className="
                            inline-flex items-center rounded-full
                            border border-[#b9baa3]/20 bg-[#b9baa3]/5
                            px-3 py-1 text-xs italic text-[#b9baa3]/70
                          "
                        >
                          &ldquo;{touchstone}&rdquo;
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </section>
            )}

            {/* ── Tabbed Sections ──────────────────────────────────────── */}
            <section>
              <TabBar
                activeTab={activeTab}
                onTabChange={setActiveTab}
                counts={tabCounts}
              />

              <div className="pt-4">
                {/* ── Contents Tab ──────────────────────────────────── */}
                {activeTab === "contents" && (
                  <div
                    role="tabpanel"
                    id="tabpanel-contents"
                    aria-labelledby="tab-contents"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-sm font-semibold text-[#f7f7ff]">
                        Homebrew Content
                      </h2>
                      {isOwner && (
                        <AddPlaceholderButton label="Add Content" />
                      )}
                    </div>

                    {frame.contents.length === 0 ? (
                      <EmptyState message="No homebrew content linked to this frame yet." />
                    ) : (
                      <div className="space-y-2">
                        {frame.contents.map((item) => (
                          <ContentRow
                            key={`${item.contentType}-${item.contentId}`}
                            item={item}
                            onRemove={() => handleRemoveContent(item)}
                            isRemoving={
                              removeContentMutation.isPending &&
                              removeContentMutation.variables?.contentType ===
                                item.contentType &&
                              removeContentMutation.variables?.contentId ===
                                item.contentId
                            }
                            isOwner={isOwner}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* ── Restrictions Tab ─────────────────────────────── */}
                {activeTab === "restrictions" && (
                  <div
                    role="tabpanel"
                    id="tabpanel-restrictions"
                    aria-labelledby="tab-restrictions"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-sm font-semibold text-[#f7f7ff]">
                        SRD Restrictions
                      </h2>
                      {isOwner && (
                        <AddPlaceholderButton label="Add Restriction" />
                      )}
                    </div>

                    {frame.restrictions.length === 0 ? (
                      <EmptyState message="No SRD restrictions defined in this frame." />
                    ) : (
                      <div className="space-y-2">
                        {frame.restrictions.map((item) => (
                          <RestrictionRow
                            key={`${item.contentType}-${item.contentId}`}
                            item={item}
                            onRemove={() =>
                              handleRemoveRestriction(item)
                            }
                            isRemoving={
                              removeRestrictionMutation.isPending &&
                              removeRestrictionMutation.variables
                                ?.contentType === item.contentType &&
                              removeRestrictionMutation.variables
                                ?.contentId === item.contentId
                            }
                            isOwner={isOwner}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* ── Extensions Tab ───────────────────────────────── */}
                {activeTab === "extensions" && (
                  <div
                    role="tabpanel"
                    id="tabpanel-extensions"
                    aria-labelledby="tab-extensions"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-sm font-semibold text-[#f7f7ff]">
                        Custom Type Extensions
                      </h2>
                      {isOwner && (
                        <AddPlaceholderButton label="Add Extension" />
                      )}
                    </div>

                    {frame.extensions.length === 0 ? (
                      <EmptyState message="No custom type extensions defined in this frame." />
                    ) : (
                      <div className="space-y-2">
                        {frame.extensions.map((item) => (
                          <ExtensionRow
                            key={`${item.extensionType}-${item.slug}`}
                            item={item}
                            onRemove={() =>
                              handleRemoveExtension(item)
                            }
                            isRemoving={
                              removeExtensionMutation.isPending &&
                              removeExtensionMutation.variables
                                ?.extensionType ===
                                item.extensionType &&
                              removeExtensionMutation.variables
                                ?.slug === item.slug
                            }
                            isOwner={isOwner}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
