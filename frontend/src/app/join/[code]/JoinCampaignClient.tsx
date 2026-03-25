"use client";

/**
 * src/app/join/[code]/JoinCampaignClient.tsx
 *
 * Join Campaign via invite link.
 *
 * States handled:
 *   loading          — fetching invite info (public endpoint)
 *   ready            — shows campaign name + "Join" button
 *   already_member   — user is already in the campaign (from API error)
 *   expired_invalid  — invite is expired or invalid (from API error)
 *   success          — joined; redirects to /campaigns/{id}
 *   auth_required    — not logged in; redirects to /auth/login
 *
 * Error states use role="alert" for immediate SR announcement.
 */

import React, { useEffect, useId, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { useAcceptInvite } from "@/hooks/useCampaigns";
import { apiClient, ApiError } from "@/lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────

interface InvitePreview {
  campaignId:   string;
  campaignName: string;
  description:  string | null;
  grantRole:    "gm" | "player";
  expiresAt:    string | null;
  useCount:     number;
  maxUses:      number | null;
}

type PageState =
  | { status: "loading" }
  | { status: "ready";         preview: InvitePreview }
  | { status: "joining" }
  | { status: "success";       campaignId: string; campaignName: string }
  | { status: "already_member"; campaignId: string }
  | { status: "expired_invalid"; message: string }
  | { status: "error";          message: string };

// ─── Client component ─────────────────────────────────────────────────────────

export default function JoinCampaignClient() {
  const pathname = usePathname();
  // Extract the real invite code from the browser URL.
  // useParams() returns "__placeholder__" in a static export; usePathname()
  // always reflects the actual browser URL path.
  // Path: /join/[code] → segment index 2
  const code = pathname?.split("/")[2] ?? "";
  const router = useRouter();

  const { isAuthenticated, isReady, isLoading: authLoading } = useAuthStore();
  const acceptMutation = useAcceptInvite();
  const errorId = useId();

  const [state, setState] = useState<PageState>({ status: "loading" });

  // Auth guard — redirect to login with return_to param
  useEffect(() => {
    if (isReady && !isAuthenticated) {
      router.replace(`/auth/login?return_to=/join/${code}`);
    }
  }, [isReady, isAuthenticated, code, router]);

  // Fetch invite preview once authenticated
  useEffect(() => {
    if (!isReady || !isAuthenticated || !code) return;

    let cancelled = false;

    (async () => {
      try {
        const preview = await apiClient.get<InvitePreview>(`/invites/${code}`);
        if (!cancelled) setState({ status: "ready", preview });
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiError) {
          if (err.status === 409 || err.code === "ALREADY_MEMBER") {
            // Try to extract campaignId from details
            const campaignId = (err.details as Record<string, unknown> | undefined)?.campaignId as string | undefined;
            setState({ status: "already_member", campaignId: campaignId ?? "" });
          } else if (err.status === 404 || err.status === 410 || err.code === "INVITE_EXPIRED" || err.code === "INVITE_NOT_FOUND") {
            setState({ status: "expired_invalid", message: err.message });
          } else {
            setState({ status: "error", message: err.message });
          }
        } else {
          setState({ status: "error", message: "An unexpected error occurred." });
        }
      }
    })();

    return () => { cancelled = true; };
  }, [isReady, isAuthenticated, code]);

  // Auto-redirect on success
  useEffect(() => {
    if (state.status !== "success") return;
    const timer = setTimeout(() => {
      router.replace(`/campaigns/${state.campaignId}`);
    }, 2_000);
    return () => clearTimeout(timer);
  }, [state, router]);

  const handleJoin = async () => {
    if (state.status !== "ready") return;
    setState({ status: "joining" });

    try {
      const result = await acceptMutation.mutateAsync(code);
      // Use the campaignName from the already-fetched preview (the backend accept
      // response does not return campaignName; it returns { joined, campaignId, role }).
      setState({ status: "success", campaignId: result.campaignId, campaignName: state.preview.campaignName });
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 409 || err.code === "ALREADY_MEMBER") {
          const campaignId = (err.details as Record<string, unknown> | undefined)?.campaignId as string | undefined;
          setState({ status: "already_member", campaignId: campaignId ?? "" });
        } else if (err.status === 404 || err.status === 410) {
          setState({ status: "expired_invalid", message: err.message });
        } else {
          setState({ status: "error", message: err.message });
        }
      } else {
        setState({ status: "error", message: "Failed to join campaign. Please try again." });
      }
    }
  };

  // Auth / boot loader
  if (!isReady || authLoading) {
    return (
      <JoinShell>
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#577399] border-t-transparent" />
        </div>
      </JoinShell>
    );
  }

  if (!isAuthenticated) return null; // redirect is in-flight

  return (
    <JoinShell>
      {/* Loading invite preview */}
      {state.status === "loading" && (
        <div className="flex items-center justify-center py-16">
          <div className="space-y-3 text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#577399] border-t-transparent mx-auto" />
            <p className="text-sm text-[#b9baa3]/60">Loading invite…</p>
          </div>
        </div>
      )}

      {/* Ready — show campaign preview + join button */}
      {(state.status === "ready" || state.status === "joining") && state.status !== "joining" && (
        <JoinPreview preview={state.preview} onJoin={handleJoin} isJoining={false} />
      )}
      {state.status === "joining" && (
        // Keep the preview visible with a loading state while submitting
        <div className="space-y-6 text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#577399] border-t-transparent mx-auto" />
          <p className="text-sm text-[#b9baa3]/60">Joining campaign…</p>
        </div>
      )}

      {/* Success */}
      {state.status === "success" && (
        <div className="space-y-4 text-center">
          <div
            aria-live="polite"
            className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-green-900/30 border border-green-700/60 mx-auto"
          >
            <span className="text-3xl" aria-hidden="true">✓</span>
          </div>
          <div>
            <h2 className="font-serif text-2xl font-semibold text-[#f7f7ff]">
              You&apos;re in!
            </h2>
            <p className="mt-2 text-sm text-[#b9baa3]/60">
              Joined <strong className="text-[#f7f7ff]">{state.campaignName}</strong>.
              Redirecting…
            </p>
          </div>
          <button
            type="button"
            onClick={() => router.push(`/campaigns/${state.campaignId}`)}
            className="
              rounded-lg px-6 py-2.5 font-semibold text-sm
              bg-[#577399] text-[#f7f7ff] hover:bg-[#577399]/80
              transition-colors
              focus:outline-none focus:ring-2 focus:ring-[#577399]
            "
          >
            Go to Campaign
          </button>
        </div>
      )}

      {/* Already a member */}
      {state.status === "already_member" && (
        <div role="alert" className="space-y-4 text-center">
          <div className="text-4xl" aria-hidden="true">🛡️</div>
          <div>
            <h2 className="font-serif text-xl font-semibold text-[#f7f7ff]">
              Already a member
            </h2>
            <p className="mt-2 text-sm text-[#b9baa3]/60">
              You&apos;re already in this campaign.
            </p>
          </div>
          {state.campaignId && (
            <button
              type="button"
              onClick={() => router.push(`/campaigns/${state.campaignId}`)}
              className="
                rounded-lg px-6 py-2.5 font-semibold text-sm
                bg-[#577399] text-[#f7f7ff] hover:bg-[#577399]/80
                transition-colors
                focus:outline-none focus:ring-2 focus:ring-[#577399]
              "
            >
              Go to Campaign
            </button>
          )}
        </div>
      )}

      {/* Expired / invalid */}
      {state.status === "expired_invalid" && (
        <div role="alert" id={errorId} className="space-y-4 text-center">
          <div className="text-4xl" aria-hidden="true">⏰</div>
          <div>
            <h2 className="font-serif text-xl font-semibold text-[#fe5f55]">
              Invite expired or invalid
            </h2>
            <p className="mt-2 text-sm text-[#b9baa3]/60">
              {state.message}
            </p>
          </div>
          <button
            type="button"
            onClick={() => router.push("/campaigns")}
            className="
              rounded-lg px-5 py-2.5 text-sm font-medium
              border border-slate-700/60 text-[#b9baa3]/60
              hover:text-[#b9baa3] hover:border-slate-600
              transition-colors
              focus:outline-none focus:ring-2 focus:ring-[#577399]
            "
          >
            Back to Campaigns
          </button>
        </div>
      )}

      {/* General error */}
      {state.status === "error" && (
        <div role="alert" id={errorId} className="space-y-4 text-center">
          <div className="text-4xl" aria-hidden="true">⚠️</div>
          <div>
            <h2 className="font-serif text-xl font-semibold text-[#fe5f55]">
              Something went wrong
            </h2>
            <p className="mt-2 text-sm text-[#b9baa3]/60">{state.message}</p>
          </div>
          <div className="flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => setState({ status: "loading" })}
              className="
                rounded-lg px-5 py-2.5 text-sm font-semibold
                bg-[#577399] text-[#f7f7ff] hover:bg-[#577399]/80
                transition-colors
                focus:outline-none focus:ring-2 focus:ring-[#577399]
              "
            >
              Retry
            </button>
            <button
              type="button"
              onClick={() => router.push("/campaigns")}
              className="
                rounded-lg px-4 py-2.5 text-sm font-medium
                border border-slate-700/60 text-[#b9baa3]/60
                hover:text-[#b9baa3] hover:border-slate-600
                transition-colors
                focus:outline-none focus:ring-2 focus:ring-[#577399]
              "
            >
              Back
            </button>
          </div>
        </div>
      )}
    </JoinShell>
  );
}

// ─── JoinShell ────────────────────────────────────────────────────────────────

function JoinShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0a100d] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div
          className="
            rounded-2xl border border-[#577399]/30 bg-slate-900/80
            p-8 shadow-card-fantasy
          "
        >
          {children}
        </div>
      </div>
    </div>
  );
}

// ─── JoinPreview ──────────────────────────────────────────────────────────────

interface JoinPreviewProps {
  preview: InvitePreview;
  onJoin: () => void;
  isJoining: boolean;
}

function JoinPreview({ preview, onJoin, isJoining }: JoinPreviewProps) {
  const roleLabel = preview.grantRole === "gm" ? "Game Master" : "Player";
  const usesLabel = preview.maxUses === null
    ? "Unlimited uses"
    : `${preview.maxUses - preview.useCount} use${preview.maxUses - preview.useCount !== 1 ? "s" : ""} remaining`;
  const expiryLabel = preview.expiresAt
    ? `Expires ${new Date(preview.expiresAt).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}`
    : null;

  return (
    <div className="space-y-6">
      {/* Campaign info */}
      <div className="text-center space-y-2">
        <p className="text-xs uppercase tracking-widest text-[#b9baa3]/50 font-medium">
          You&apos;ve been invited to join
        </p>
        <h1 className="font-serif text-2xl font-semibold text-[#f7f7ff]">
          {preview.campaignName}
        </h1>
        {preview.description && (
          <p className="text-sm text-[#b9baa3]/70 leading-relaxed">
            {preview.description}
          </p>
        )}
      </div>

      {/* Invite meta */}
      <div className="flex items-center justify-center gap-4 flex-wrap text-xs text-[#b9baa3]/50">
        <span className="flex items-center gap-1">
          <span aria-hidden="true">◆</span>
          Joining as <strong className="text-[#b9baa3]/80 ml-1">{roleLabel}</strong>
        </span>
        <span>{usesLabel}</span>
        {expiryLabel && <span>{expiryLabel}</span>}
      </div>

      {/* CTA */}
      <button
        type="button"
        onClick={onJoin}
        disabled={isJoining}
        className="
          w-full rounded-xl py-3 font-semibold text-base
          bg-[#577399] text-[#f7f7ff]
          hover:bg-[#577399]/80
          disabled:opacity-40 disabled:cursor-not-allowed
          transition-colors shadow-sm
          focus:outline-none focus:ring-2 focus:ring-[#577399]
          focus:ring-offset-2 focus:ring-offset-slate-900
        "
      >
        {isJoining ? (
          <span className="flex items-center justify-center gap-2">
            <span aria-hidden="true" className="h-4 w-4 animate-spin rounded-full border-2 border-[#f7f7ff] border-t-transparent" />
            Joining…
          </span>
        ) : (
          `Join as ${roleLabel}`
        )}
      </button>
    </div>
  );
}
