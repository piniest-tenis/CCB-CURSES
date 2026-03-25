/**
 * src/components/campaign/InviteManagementModal.tsx
 *
 * Modal for GMs to view, copy, revoke, and create campaign invite links.
 *
 * Accessibility:
 *   - role="dialog" aria-modal="true" aria-labelledby
 *   - Focus trapped inside (Tab / Shift+Tab cycle stays in modal)
 *   - Escape key closes
 *   - aria-live="polite" region announces copy success / errors
 *   - role="alert" on error messages
 */

"use client";

import React, { useCallback, useEffect, useId, useRef, useState } from "react";
import { useCreateInvite, useRevokeInvite } from "@/hooks/useCampaigns";
import type { CampaignInvite } from "@/types/campaign";

// ─── Props ────────────────────────────────────────────────────────────────────

interface InviteManagementModalProps {
  campaignId: string;
  invites: CampaignInvite[];
  onClose: () => void;
}

// ─── Focus trap utility ───────────────────────────────────────────────────────

const FOCUSABLE_SELECTORS =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function useFocusTrap(ref: React.RefObject<HTMLElement | null>, isOpen: boolean) {
  useEffect(() => {
    if (!isOpen || !ref.current) return;

    const el = ref.current;

    // Focus first focusable element
    const focusable = Array.from(el.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS));
    focusable[0]?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const first = focusable[0];
      const last  = focusable[focusable.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, ref]);
}

// ─── Invite row ───────────────────────────────────────────────────────────────

interface InviteRowProps {
  invite: CampaignInvite;
  campaignId: string;
  onAnnounce: (msg: string) => void;
}

function InviteRow({ invite, campaignId, onAnnounce }: InviteRowProps) {
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">("idle");
  const revokeMutation = useRevokeInvite(campaignId);

  const inviteUrl = typeof window !== "undefined"
    ? `${window.location.origin}/join/${invite.inviteCode}`
    : `/join/${invite.inviteCode}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopyState("copied");
      onAnnounce("Invite link copied to clipboard!");
      setTimeout(() => setCopyState("idle"), 2_500);
    } catch {
      setCopyState("error");
      onAnnounce("Failed to copy invite link.");
      setTimeout(() => setCopyState("idle"), 2_500);
    }
  };

  const handleRevoke = () => {
    if (revokeMutation.isPending) return;
    revokeMutation.mutate(invite.inviteCode);
  };

  const usesLabel = invite.maxUses === null
    ? `${invite.useCount} / unlimited`
    : `${invite.useCount} / ${invite.maxUses}`;

  const expiryLabel = invite.expiresAt
    ? new Date(invite.expiresAt).toLocaleDateString(undefined, {
        year: "numeric", month: "short", day: "numeric",
      })
    : "Never";

  return (
    <li className="rounded-lg border border-[#577399]/20 bg-slate-900/60 p-3 space-y-2">
      {/* Code */}
      <div className="flex items-center gap-2 flex-wrap">
        <code className="font-mono text-xs text-gold-400 bg-gold-950/20 border border-gold-800/40 rounded px-2 py-0.5 select-all">
          {invite.inviteCode}
        </code>
        <span className="text-xs text-[#b9baa3]/60">
          Uses: {usesLabel}
        </span>
        <span className="text-xs text-[#b9baa3]/60">
          Expires: {expiryLabel}
        </span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleCopy}
          aria-label={
            copyState === "copied" ? "Link copied!" :
            copyState === "error"  ? "Copy failed" :
            `Copy invite link for code ${invite.inviteCode}`
          }
          className={[
            "rounded px-3 py-1.5 text-xs font-semibold transition-colors",
            "focus:outline-none focus:ring-2 focus:ring-[#577399]",
            copyState === "copied"
              ? "bg-green-900/40 border border-green-700/60 text-green-400"
              : copyState === "error"
              ? "bg-[#fe5f55]/10 border border-[#fe5f55]/40 text-[#fe5f55]"
              : "bg-[#577399]/15 border border-[#577399]/40 text-[#f7f7ff] hover:bg-[#577399]/25",
          ].join(" ")}
        >
          {copyState === "copied" ? "✓ Copied!" : copyState === "error" ? "✗ Failed" : "Copy Link"}
        </button>

        <button
          type="button"
          onClick={handleRevoke}
          disabled={revokeMutation.isPending}
          aria-label={`Revoke invite code ${invite.inviteCode}`}
          className="
            rounded px-3 py-1.5 text-xs font-semibold
            bg-[#fe5f55]/10 border border-[#fe5f55]/30 text-[#fe5f55]
            hover:bg-[#fe5f55]/20
            disabled:opacity-40 disabled:cursor-wait
            transition-colors
            focus:outline-none focus:ring-2 focus:ring-[#fe5f55]/60
          "
        >
          {revokeMutation.isPending ? "Revoking…" : "Revoke"}
        </button>
      </div>

      {revokeMutation.isError && (
        <p role="alert" className="text-xs text-[#fe5f55]">
          {revokeMutation.error?.message ?? "Failed to revoke invite."}
        </p>
      )}
    </li>
  );
}

// ─── Create invite form ───────────────────────────────────────────────────────

interface CreateInviteFormProps {
  campaignId: string;
  onAnnounce: (msg: string) => void;
}

function CreateInviteForm({ campaignId, onAnnounce }: CreateInviteFormProps) {
  const [maxUses, setMaxUses]   = useState<"1" | "5" | "10" | "unlimited">("unlimited");
  const [expiresAt, setExpiresAt] = useState("");
  const createMutation = useCreateInvite(campaignId);

  const maxUsesId   = useId();
  const expiresAtId = useId();
  const errorId     = useId();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (createMutation.isPending) return;

    await createMutation.mutateAsync({
      maxUses:   maxUses === "unlimited" ? null : Number(maxUses),
      expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
    });

    onAnnounce("New invite link created.");
    setMaxUses("unlimited");
    setExpiresAt("");
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h3 className="text-sm font-semibold text-[#f7f7ff]">Create New Invite</h3>

      <div className="grid grid-cols-2 gap-3">
        {/* Max uses */}
        <div>
          <label
            htmlFor={maxUsesId}
            className="block text-xs font-medium text-[#b9baa3]/70 mb-1.5"
          >
            Max Uses
          </label>
          <select
            id={maxUsesId}
            value={maxUses}
            onChange={(e) => setMaxUses(e.target.value as typeof maxUses)}
            className="
              w-full rounded-lg border border-slate-700/60 bg-slate-900
              px-3 py-2 text-sm text-[#f7f7ff]
              focus:outline-none focus:ring-2 focus:ring-[#577399]
            "
          >
            <option value="1">1 use</option>
            <option value="5">5 uses</option>
            <option value="10">10 uses</option>
            <option value="unlimited">Unlimited</option>
          </select>
        </div>

        {/* Expiry */}
        <div>
          <label
            htmlFor={expiresAtId}
            className="block text-xs font-medium text-[#b9baa3]/70 mb-1.5"
          >
            Expires (optional)
          </label>
          <input
            id={expiresAtId}
            type="date"
            value={expiresAt}
            onChange={(e) => setExpiresAt(e.target.value)}
            min={new Date().toISOString().split("T")[0]}
            className="
              w-full rounded-lg border border-slate-700/60 bg-slate-900
              px-3 py-2 text-sm text-[#f7f7ff]
              focus:outline-none focus:ring-2 focus:ring-[#577399]
              [color-scheme:dark]
            "
          />
        </div>
      </div>

      {createMutation.isError && (
        <div id={errorId} role="alert" className="rounded-lg border border-[#fe5f55]/40 bg-[#fe5f55]/10 px-3 py-2">
          <p className="text-xs text-[#fe5f55]">
            {createMutation.error?.message ?? "Failed to create invite."}
          </p>
        </div>
      )}

      <button
        type="submit"
        disabled={createMutation.isPending}
        aria-describedby={createMutation.isError ? errorId : undefined}
        className="
          w-full rounded-lg py-2.5 font-semibold text-sm
          bg-[#577399] text-[#f7f7ff]
          hover:bg-[#577399]/80
          disabled:opacity-40 disabled:cursor-not-allowed
          transition-colors
          focus:outline-none focus:ring-2 focus:ring-[#577399]
          focus:ring-offset-2 focus:ring-offset-slate-900
        "
      >
        {createMutation.isPending ? (
          <span className="flex items-center justify-center gap-2">
            <span className="h-3.5 w-3.5 animate-spin rounded-full border border-[#f7f7ff] border-t-transparent" aria-hidden="true" />
            Creating…
          </span>
        ) : (
          "Generate Invite Link"
        )}
      </button>
    </form>
  );
}

// ─── Modal ────────────────────────────────────────────────────────────────────

export function InviteManagementModal({
  campaignId,
  invites,
  onClose,
}: InviteManagementModalProps) {
  const titleId      = useId();
  const liveRegionId = useId();
  const modalRef     = useRef<HTMLDivElement>(null);
  const [announcement, setAnnouncement] = useState("");

  useFocusTrap(modalRef, true);

  // Escape key to close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  // Reset announcement on each new message so aria-live re-announces
  const announce = useCallback((msg: string) => {
    setAnnouncement("");
    requestAnimationFrame(() => setAnnouncement(msg));
  }, []);

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
      role="presentation"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* aria-live announcement region */}
      <div
        id={liveRegionId}
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {announcement}
      </div>

      {/* Dialog */}
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="
          w-full max-w-lg rounded-2xl border border-slate-700/60
          bg-[#0a100d] shadow-2xl flex flex-col max-h-[90vh]
        "
        style={{ boxShadow: "0 0 60px rgba(87,115,153,0.15), 0 24px 48px rgba(0,0,0,0.6)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700/40 shrink-0">
          <h2 id={titleId} className="font-serif text-xl font-semibold text-[#f7f7ff]">
            Invite Links
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close invite management"
            className="
              text-[#b9baa3]/40 hover:text-[#b9baa3] text-2xl leading-none
              transition-colors ml-4
              focus:outline-none focus:ring-2 focus:ring-[#577399] rounded
            "
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {/* Existing invites */}
          {invites.length > 0 ? (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-[#f7f7ff]">
                Active Invites ({invites.length})
              </h3>
              <ul className="space-y-2" aria-label="Existing invite links">
                {invites.map((invite) => (
                  <InviteRow
                    key={invite.inviteCode}
                    invite={invite}
                    campaignId={campaignId}
                    onAnnounce={announce}
                  />
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-sm text-[#b9baa3]/50 italic">
              No active invite links.
            </p>
          )}

          <hr className="border-slate-700/40" />

          {/* Create new invite */}
          <CreateInviteForm campaignId={campaignId} onAnnounce={announce} />
        </div>
      </div>
    </div>
  );
}
