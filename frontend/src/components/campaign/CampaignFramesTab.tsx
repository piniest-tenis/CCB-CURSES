"use client";

/**
 * src/components/campaign/CampaignFramesTab.tsx
 *
 * Campaign Frames tab panel: attached frames list with attach/detach flows,
 * and content conflict resolution section.
 *
 * GM can attach frames from their library, detach them, and resolve any
 * content conflicts that arise when multiple frames define overlapping items.
 * Non-GM users see the same data in read-only mode.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  useFrames,
  useCampaignFrames,
  useAttachFrame,
  useDetachFrame,
  useCampaignConflicts,
  useResolveConflict,
} from "@/hooks/useFrames";
import type {
  CampaignFrameAttachment,
  CampaignFrameSummary,
  CampaignConflictResolution,
} from "@shared/types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(isoDate: string): string {
  const date = new Date(isoDate);
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatRelativeTime(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

/** Skeleton card shown while attached frames are loading. */
function AttachedFrameSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="
        flex flex-col gap-3 rounded-xl
        border border-[#577399]/20 bg-slate-900/60
        p-5 animate-pulse
      "
    >
      <div className="flex items-start justify-between gap-3">
        <div className="h-5 w-40 rounded bg-slate-700/60" />
        <div className="h-7 w-16 rounded-lg bg-slate-700/40" />
      </div>
      <div className="space-y-2">
        <div className="h-3.5 w-full rounded bg-slate-700/40" />
        <div className="h-3.5 w-2/3 rounded bg-slate-700/40" />
      </div>
      <div className="flex gap-2">
        <div className="h-5 w-16 rounded-md bg-slate-700/40" />
        <div className="h-5 w-20 rounded-md bg-slate-700/40" />
        <div className="h-5 w-18 rounded-md bg-slate-700/40" />
      </div>
      <div className="h-3 w-28 rounded bg-slate-700/30" />
    </div>
  );
}

/** Card for a single attached frame. */
function AttachedFrameCard({
  attachment,
  frameSummary,
  isGm,
  onDetach,
  isDetaching,
}: {
  attachment: CampaignFrameAttachment;
  frameSummary: CampaignFrameSummary | undefined;
  isGm: boolean;
  onDetach: () => void;
  isDetaching: boolean;
}) {
  const [showConfirm, setShowConfirm] = useState(false);

  const handleDetachClick = useCallback(() => {
    setShowConfirm(true);
  }, []);

  const handleConfirm = useCallback(() => {
    onDetach();
    setShowConfirm(false);
  }, [onDetach]);

  const handleCancel = useCallback(() => {
    setShowConfirm(false);
  }, []);

  return (
    <article
      className="
        group relative flex flex-col gap-3 rounded-xl
        border border-[#577399]/30 bg-slate-900/80
        p-5 shadow-card-fantasy
        transition-all duration-200
      "
    >
      {/* Header: frame name + detach button */}
      <div className="flex items-start justify-between gap-3">
        <Link
          href={`/homebrew/frames/${attachment.frameId}`}
          className="
            font-serif text-lg font-semibold text-[#f7f7ff]
            leading-tight min-w-0 truncate
            hover:text-[#577399] transition-colors
            focus:outline-none focus:underline
          "
        >
          {attachment.frameName}
        </Link>

        {isGm && !showConfirm && (
          <button
            type="button"
            onClick={handleDetachClick}
            disabled={isDetaching}
            aria-label={`Detach ${attachment.frameName} from campaign`}
            className="
              shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold
              text-[#fe5f55]/60 border border-[#fe5f55]/20
              hover:text-[#fe5f55] hover:border-[#fe5f55]/40 hover:bg-[#fe5f55]/5
              disabled:opacity-40 disabled:cursor-wait
              transition-colors
              focus:outline-none focus:ring-2 focus:ring-[#fe5f55]/60
            "
          >
            {isDetaching ? (
              <span
                aria-hidden="true"
                className="inline-block h-3 w-3 animate-spin rounded-full border border-current border-t-transparent"
              />
            ) : (
              "Detach"
            )}
          </button>
        )}
      </div>

      {/* Detach confirmation inline */}
      {showConfirm && (
        <div
          role="alert"
          className="
            flex items-center gap-3 rounded-lg
            border border-[#fe5f55]/30 bg-[#fe5f55]/5
            px-3 py-2
          "
        >
          <p className="flex-1 text-xs text-[#fe5f55]/80">
            Remove <strong>{attachment.frameName}</strong>?
          </p>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isDetaching}
            className="
              rounded px-2.5 py-1 text-xs font-semibold
              bg-[#fe5f55] text-white
              hover:bg-[#fe5f55]/80
              disabled:opacity-40 disabled:cursor-wait
              transition-colors
              focus:outline-none focus:ring-2 focus:ring-[#fe5f55]
            "
          >
            {isDetaching ? "Removing..." : "Remove"}
          </button>
          <button
            type="button"
            onClick={handleCancel}
            className="
              rounded px-2.5 py-1 text-xs font-semibold
              text-[#b9baa3]/60
              hover:text-[#b9baa3] hover:bg-slate-800/40
              transition-colors
              focus:outline-none focus:ring-2 focus:ring-[#577399]
            "
          >
            Cancel
          </button>
        </div>
      )}

      {/* Pitch */}
      {frameSummary?.pitch ? (
        <p className="text-sm text-[#b9baa3] leading-relaxed line-clamp-2">
          {frameSummary.pitch}
        </p>
      ) : (
        <p className="text-sm text-[#b9baa3]/40 italic">No description</p>
      )}

      {/* Stats row */}
      {frameSummary && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-md bg-[#577399]/10 px-2 py-0.5 text-xs font-medium text-[#577399]">
            {frameSummary.contentCount} content
          </span>
          <span className="inline-flex items-center gap-1 rounded-md bg-[#fe5f55]/10 px-2 py-0.5 text-xs font-medium text-[#fe5f55]/80">
            {frameSummary.restrictionCount} restriction{frameSummary.restrictionCount !== 1 ? "s" : ""}
          </span>
          <span className="inline-flex items-center gap-1 rounded-md bg-gold-500/10 px-2 py-0.5 text-xs font-medium text-gold-400">
            {frameSummary.extensionCount} extension{frameSummary.extensionCount !== 1 ? "s" : ""}
          </span>
        </div>
      )}

      {/* Author + attached date */}
      <div className="flex items-center gap-3 text-xs text-[#b9baa3]/50">
        {frameSummary?.author && (
          <span>by {frameSummary.author}</span>
        )}
        <span>Attached {formatDate(attachment.attachedAt)}</span>
      </div>
    </article>
  );
}

// ─── Attach Frame Dropdown ────────────────────────────────────────────────────

function AttachFrameDropdown({
  campaignId,
  attachedFrameIds,
}: {
  campaignId: string;
  attachedFrameIds: Set<string>;
}) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { data: allFrames, isLoading: framesLoading } = useFrames();
  const attachMutation = useAttachFrame(campaignId);
  const [conflictMessage, setConflictMessage] = useState<string | null>(null);

  // Filter out already-attached frames
  const availableFrames = useMemo(
    () => (allFrames ?? []).filter((f) => !attachedFrameIds.has(f.frameId)),
    [allFrames, attachedFrameIds],
  );

  // Close dropdown on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Close dropdown on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open]);

  const handleAttach = useCallback(
    (frame: CampaignFrameSummary) => {
      setConflictMessage(null);
      attachMutation.mutate(
        { frameId: frame.frameId },
        {
          onSuccess: (response) => {
            setOpen(false);
            if (response.conflicts && response.conflicts.length > 0) {
              setConflictMessage(
                `${frame.name} attached with ${response.conflicts.length} content conflict${response.conflicts.length !== 1 ? "s" : ""} to resolve.`,
              );
            }
          },
        },
      );
    },
    [attachMutation],
  );

  // Clear conflict message after timeout
  useEffect(() => {
    if (!conflictMessage) return;
    const timer = setTimeout(() => setConflictMessage(null), 6000);
    return () => clearTimeout(timer);
  }, [conflictMessage]);

  return (
    <div ref={dropdownRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="listbox"
        className="
          inline-flex items-center gap-1.5
          rounded-lg px-3 py-2 text-sm font-semibold
          border border-[#577399]/50 bg-[#577399]/10 text-[#577399]
          hover:bg-[#577399]/20 hover:border-[#577399]
          transition-colors
          focus:outline-none focus:ring-2 focus:ring-[#577399]
          focus:ring-offset-2 focus:ring-offset-slate-900
        "
      >
        <span aria-hidden="true" className="text-base leading-none">+</span>
        Attach Frame
      </button>

      {/* Conflict toast */}
      {conflictMessage && (
        <div
          role="status"
          className="
            absolute top-[calc(100%+8px)] right-0 z-40
            w-72 rounded-lg border border-gold-500/30 bg-slate-800
            px-3 py-2.5 shadow-xl
            text-xs text-gold-400
            animate-fade-in
          "
        >
          {conflictMessage}
        </div>
      )}

      {/* Dropdown popover */}
      {open && (
        <div
          role="listbox"
          aria-label="Available frames to attach"
          className="
            absolute top-[calc(100%+4px)] right-0 z-50
            w-80 max-h-80 overflow-y-auto
            rounded-xl border border-[#577399]/30 bg-slate-800
            shadow-xl
            py-1
          "
        >
          {framesLoading && (
            <div className="px-4 py-6 text-center">
              <div className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-[#577399] border-t-transparent" />
            </div>
          )}

          {!framesLoading && availableFrames.length === 0 && (
            <div className="px-4 py-6 text-center">
              <p className="text-sm text-[#b9baa3]/50">
                {(allFrames ?? []).length === 0
                  ? "You haven't created any frames yet."
                  : "All your frames are already attached."}
              </p>
              {(allFrames ?? []).length === 0 && (
                <Link
                  href="/homebrew/frames/new"
                  className="
                    mt-2 inline-block text-xs font-semibold text-[#577399]
                    hover:text-[#577399]/80 transition-colors
                  "
                >
                  Create your first frame
                </Link>
              )}
            </div>
          )}

          {!framesLoading &&
            availableFrames.map((frame) => (
              <button
                key={frame.frameId}
                type="button"
                role="option"
                aria-selected={false}
                onClick={() => handleAttach(frame)}
                disabled={attachMutation.isPending}
                className="
                  w-full text-left px-4 py-3
                  hover:bg-[#577399]/10 transition-colors
                  disabled:opacity-40 disabled:cursor-wait
                  focus:outline-none focus:bg-[#577399]/15
                  border-b border-slate-700/30 last:border-b-0
                "
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-[#f7f7ff] truncate">
                      {frame.name}
                    </p>
                    {frame.pitch && (
                      <p className="mt-0.5 text-xs text-[#b9baa3]/60 line-clamp-1">
                        {frame.pitch}
                      </p>
                    )}
                  </div>
                  <div className="shrink-0 flex items-center gap-1.5 text-[10px] text-[#b9baa3]/40">
                    <span>{frame.contentCount}C</span>
                    <span>{frame.restrictionCount}R</span>
                    <span>{frame.extensionCount}E</span>
                  </div>
                </div>
              </button>
            ))}
        </div>
      )}
    </div>
  );
}

// ─── Conflict Resolution Row ──────────────────────────────────────────────────

function ConflictRow({
  conflict,
  attachments,
  frameLookup,
  isGm,
  campaignId,
}: {
  conflict: CampaignConflictResolution;
  attachments: CampaignFrameAttachment[];
  frameLookup: Map<string, CampaignFrameSummary>;
  isGm: boolean;
  campaignId: string;
}) {
  const isResolved = Boolean(conflict.winningFrameId);
  const resolveMutation = useResolveConflict(campaignId);
  const [selectedWinner, setSelectedWinner] = useState(conflict.winningFrameId ?? "");

  // Build a map of frameId -> name from attachments + frame summaries
  const competingFrames = useMemo(() => {
    return conflict.competingFrameIds.map((fid) => {
      const attachment = attachments.find((a) => a.frameId === fid);
      const summary = frameLookup.get(fid);
      return {
        frameId: fid,
        name: attachment?.frameName ?? summary?.name ?? fid,
      };
    });
  }, [conflict.competingFrameIds, attachments, frameLookup]);

  const winningFrameName = useMemo(() => {
    if (!conflict.winningFrameId) return null;
    const match = competingFrames.find((f) => f.frameId === conflict.winningFrameId);
    return match?.name ?? conflict.winningFrameId;
  }, [conflict.winningFrameId, competingFrames]);

  const handleResolve = useCallback(() => {
    if (!selectedWinner) return;
    resolveMutation.mutate({
      contentType: conflict.contentType as any,
      contentName: conflict.contentName,
      winningFrameId: selectedWinner,
      competingFrameIds: conflict.competingFrameIds,
    });
  }, [selectedWinner, conflict, resolveMutation]);

  return (
    <div
      className={[
        "rounded-lg border p-4 transition-colors",
        isResolved
          ? "border-slate-700/30 bg-slate-900/40"
          : "border-gold-500/30 bg-gold-500/5",
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-3 flex-wrap">
        {/* Left: content type badge + name */}
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <span
            className="
              shrink-0 rounded-md px-2 py-0.5
              text-[10px] font-bold uppercase tracking-wider
              bg-[#577399]/15 text-[#577399] border border-[#577399]/20
            "
          >
            {conflict.contentType}
          </span>
          <span className="text-sm font-semibold text-[#f7f7ff] truncate">
            {conflict.contentName}
          </span>
        </div>

        {/* Right: status badge */}
        {isResolved && (
          <span
            className="
              shrink-0 inline-flex items-center gap-1
              rounded-full px-2.5 py-0.5
              text-[10px] font-bold uppercase tracking-wider
              bg-green-900/40 text-green-400 border border-green-500/30
            "
          >
            Resolved
          </span>
        )}
      </div>

      {/* Resolved: show winning frame */}
      {isResolved && winningFrameName && (
        <p className="mt-2 text-xs text-[#b9baa3]/50">
          Winner: <span className="text-[#b9baa3]/80 font-medium">{winningFrameName}</span>
          <span className="ml-2">
            {conflict.resolvedAt && formatRelativeTime(conflict.resolvedAt)}
          </span>
        </p>
      )}

      {/* Unresolved: show selector + resolve button (GM only) */}
      {!isResolved && (
        <div className="mt-3 space-y-2">
          <p className="text-xs text-gold-400/70">
            {competingFrames.length} frames define this item:
          </p>
          <div className="flex flex-wrap gap-1.5">
            {competingFrames.map((f) => (
              <span
                key={f.frameId}
                className="
                  rounded-full px-2.5 py-0.5
                  text-xs text-[#b9baa3]/70
                  bg-[#b9baa3]/10
                "
              >
                {f.name}
              </span>
            ))}
          </div>

          {isGm && (
            <div className="flex items-center gap-2 pt-1">
              <select
                value={selectedWinner}
                onChange={(e) => setSelectedWinner(e.target.value)}
                aria-label={`Choose winning frame for ${conflict.contentName}`}
                className="
                  flex-1 rounded-lg border border-slate-700/60 bg-slate-800
                  px-3 py-1.5 text-sm text-[#f7f7ff]
                  focus:outline-none focus:ring-2 focus:ring-[#577399]
                  focus:ring-offset-1 focus:ring-offset-slate-900
                "
              >
                <option value="">Pick a frame...</option>
                {competingFrames.map((f) => (
                  <option key={f.frameId} value={f.frameId}>
                    {f.name}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={handleResolve}
                disabled={!selectedWinner || resolveMutation.isPending}
                className="
                  shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold
                  bg-gold-500 text-slate-900
                  hover:bg-gold-400
                  disabled:opacity-40 disabled:cursor-wait
                  transition-colors
                  focus:outline-none focus:ring-2 focus:ring-gold-500
                  focus:ring-offset-1 focus:ring-offset-slate-900
                "
              >
                {resolveMutation.isPending ? (
                  <span
                    aria-hidden="true"
                    className="inline-block h-3 w-3 animate-spin rounded-full border border-current border-t-transparent"
                  />
                ) : (
                  "Resolve"
                )}
              </button>
            </div>
          )}

          {resolveMutation.isError && (
            <p role="alert" className="text-xs text-[#fe5f55]">
              {(resolveMutation.error as Error)?.message ?? "Failed to resolve conflict."}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface CampaignFramesTabProps {
  campaignId: string;
  isGm: boolean;
}

export function CampaignFramesTab({ campaignId, isGm }: CampaignFramesTabProps) {
  const {
    data: attachments,
    isLoading: attachmentsLoading,
    isError: attachmentsError,
  } = useCampaignFrames(campaignId);

  const {
    data: conflicts,
    isLoading: conflictsLoading,
  } = useCampaignConflicts(campaignId);

  const { data: allFrames } = useFrames();

  const detachMutation = useDetachFrame(campaignId);

  // Build lookup maps
  const attachedFrameIds = useMemo(
    () => new Set((attachments ?? []).map((a) => a.frameId)),
    [attachments],
  );

  const frameLookup = useMemo(() => {
    const map = new Map<string, CampaignFrameSummary>();
    (allFrames ?? []).forEach((f) => map.set(f.frameId, f));
    return map;
  }, [allFrames]);

  // Partition conflicts into resolved / unresolved
  const { resolvedConflicts, unresolvedConflicts } = useMemo(() => {
    const resolved: CampaignConflictResolution[] = [];
    const unresolved: CampaignConflictResolution[] = [];
    (conflicts ?? []).forEach((c) => {
      if (c.winningFrameId) {
        resolved.push(c);
      } else {
        unresolved.push(c);
      }
    });
    return { resolvedConflicts: resolved, unresolvedConflicts: unresolved };
  }, [conflicts]);

  const totalConflicts = (conflicts ?? []).length;
  const hasConflicts = totalConflicts > 0;

  return (
    <div className="space-y-8">
      {/* ── Section 1: Attached Frames ────────────────────────────────────── */}
      <section aria-labelledby="frames-heading">
        <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
          <div className="flex items-center gap-2">
            <h2
              id="frames-heading"
              className="font-body text-lg text-[#f7f7ff]/80 font-semibold"
            >
              Campaign Frames
            </h2>
            {!attachmentsLoading && (
              <span
                className="
                  inline-flex items-center justify-center
                  h-5 min-w-[1.25rem] rounded-full px-1.5
                  text-[11px] font-bold tabular-nums
                  bg-[#577399]/20 text-[#577399]
                "
              >
                {(attachments ?? []).length}
              </span>
            )}
          </div>

          {isGm && (
            <AttachFrameDropdown
              campaignId={campaignId}
              attachedFrameIds={attachedFrameIds}
            />
          )}
        </div>

        {/* Loading */}
        {attachmentsLoading && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {Array.from({ length: 2 }).map((_, i) => (
              <AttachedFrameSkeleton key={i} />
            ))}
          </div>
        )}

        {/* Error */}
        {attachmentsError && !attachmentsLoading && (
          <div
            role="alert"
            className="
              rounded-xl border border-[#fe5f55]/30 bg-slate-900/80
              p-6 text-center
            "
          >
            <p className="text-sm text-[#fe5f55]/80">
              Failed to load campaign frames.
            </p>
          </div>
        )}

        {/* Empty state */}
        {!attachmentsLoading && !attachmentsError && (attachments ?? []).length === 0 && (
          <div
            className="
              flex flex-col items-center justify-center
              min-h-[200px] rounded-2xl
              border border-dashed border-slate-700/50
              text-center space-y-3
            "
            style={{ background: "rgba(87,115,153,0.03)" }}
          >
            <p className="font-serif text-lg text-[#f7f7ff]/60">
              No frames attached to this campaign yet
            </p>
            <p className="text-sm text-[#b9baa3]/40 max-w-xs">
              {isGm
                ? "Attach a frame to customize rules, content, and restrictions for this campaign."
                : "The GM has not attached any frames to this campaign."}
            </p>
            {isGm && (
              <Link
                href="/homebrew/frames"
                className="
                  mt-1 text-sm font-semibold text-[#577399]
                  hover:text-[#577399]/80 transition-colors
                "
              >
                Browse your frames
              </Link>
            )}
          </div>
        )}

        {/* Frame cards grid */}
        {!attachmentsLoading && !attachmentsError && (attachments ?? []).length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {(attachments ?? []).map((attachment) => (
              <AttachedFrameCard
                key={attachment.frameId}
                attachment={attachment}
                frameSummary={frameLookup.get(attachment.frameId)}
                isGm={isGm}
                onDetach={() => detachMutation.mutate(attachment.frameId)}
                isDetaching={
                  detachMutation.isPending &&
                  detachMutation.variables === attachment.frameId
                }
              />
            ))}
          </div>
        )}
      </section>

      {/* ── Section 2: Content Conflicts ──────────────────────────────────── */}
      {(hasConflicts || conflictsLoading) && (
        <section aria-labelledby="conflicts-heading">
          <div className="flex items-center gap-2 mb-4">
            <h2
              id="conflicts-heading"
              className="font-body text-lg text-[#f7f7ff]/80 font-semibold"
            >
              Content Conflicts
            </h2>
            {!conflictsLoading && totalConflicts > 0 && (
              <span
                className="
                  inline-flex items-center justify-center
                  h-5 min-w-[1.25rem] rounded-full px-1.5
                  text-[11px] font-bold tabular-nums
                  bg-gold-500/20 text-gold-400
                "
              >
                {totalConflicts}
              </span>
            )}
          </div>

          {conflictsLoading && (
            <div className="space-y-3">
              {Array.from({ length: 2 }).map((_, i) => (
                <div
                  key={i}
                  aria-hidden="true"
                  className="h-16 rounded-lg border border-slate-700/20 bg-slate-900/40 animate-pulse"
                />
              ))}
            </div>
          )}

          {!conflictsLoading && hasConflicts && (
            <div className="space-y-3">
              {/* Unresolved first */}
              {unresolvedConflicts.length > 0 && (
                <div className="space-y-3">
                  {unresolvedConflicts.map((conflict) => (
                    <ConflictRow
                      key={`${conflict.contentType}-${conflict.contentName}`}
                      conflict={conflict}
                      attachments={attachments ?? []}
                      frameLookup={frameLookup}
                      isGm={isGm}
                      campaignId={campaignId}
                    />
                  ))}
                </div>
              )}

              {/* Resolved conflicts with muted styling */}
              {resolvedConflicts.length > 0 && (
                <div className="space-y-3">
                  {unresolvedConflicts.length > 0 && resolvedConflicts.length > 0 && (
                    <p className="text-xs text-[#b9baa3]/30 uppercase tracking-widest font-semibold pt-2">
                      Previously resolved
                    </p>
                  )}
                  {resolvedConflicts.map((conflict) => (
                    <ConflictRow
                      key={`${conflict.contentType}-${conflict.contentName}`}
                      conflict={conflict}
                      attachments={attachments ?? []}
                      frameLookup={frameLookup}
                      isGm={isGm}
                      campaignId={campaignId}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
