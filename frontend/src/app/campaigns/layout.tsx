"use client";

/**
 * src/app/campaigns/layout.tsx
 *
 * Campaign section layout. Gates all campaign routes behind the paid
 * Patreon tier using a centered interstitial card (Pattern B).
 *
 * Grandfathered users or those with an active paid Patreon membership
 * pass through normally.
 *
 * When gated, children are NOT rendered at all — the user sees a clean
 * centered card with a crown icon, explanation, CTA, and a back link.
 */

import React from "react";
import Link from "next/link";
import { usePatreonGate, usePatreonOAuth } from "@/hooks/usePatreonGate";
import { useAuthStore } from "@/store/authStore";

export default function CampaignsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { canAccessCampaigns, needsPaidTier, needsPatreon } = usePatreonGate();
  const { isLinking, startOAuth } = usePatreonOAuth();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  // If not authenticated the individual pages handle their own auth guards
  // (redirect to login). Don't add the Patreon gate for unauthenticated users.
  if (!isAuthenticated) {
    return <>{children}</>;
  }

  // Users with paid Patreon or grandfathered accounts pass through
  if (canAccessCampaigns) {
    return <>{children}</>;
  }

  // ── Page-level interstitial: Non-Patreon users ────────────────────────
  if (needsPatreon) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a100d] px-4">
        <div className="w-full max-w-md rounded-2xl border border-[#f96854]/20 bg-slate-900/90 p-8 text-center shadow-2xl">
          {/* Lock icon */}
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-[#f96854]/25 bg-[#f96854]/8">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              className="h-7 w-7 text-[#f96854]/70"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
              />
            </svg>
          </div>

          <h1 className="font-serif text-xl font-semibold text-[#f7f7ff]">
            Campaigns Require Patreon
          </h1>
          <p className="mt-2 text-sm text-[#b9baa3]/60 leading-relaxed">
            Link your{" "}
            <span className="font-semibold text-[#f96854]">free Patreon</span>{" "}
            account to unlock campaign access and character saving.
          </p>

          <button
            type="button"
            onClick={startOAuth}
            disabled={isLinking}
            className="mt-6 w-full rounded-lg bg-[#f96854] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#ff8a75] transition-colors focus:outline-none focus:ring-2 focus:ring-[#f96854] focus:ring-offset-2 focus:ring-offset-slate-900 disabled:opacity-60 disabled:cursor-wait"
          >
            {isLinking ? "Connecting..." : "Link Patreon Account"}
          </button>

          <Link
            href="/dashboard"
            className="mt-4 inline-block text-sm text-[#577399] hover:text-[#f7f7ff] transition-colors"
          >
            &larr; Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  // ── Page-level interstitial: Free Patreon users needing paid tier ──────
  if (needsPaidTier) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a100d] px-4">
        <div className="w-full max-w-md rounded-2xl border border-gold-500/20 bg-slate-900/90 p-8 text-center shadow-2xl">
          {/* Crown icon */}
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-gold-500/25 bg-gold-500/8">
            <svg
              viewBox="0 0 24 24"
              fill="currentColor"
              className="h-7 w-7 text-gold-400/80"
              aria-hidden="true"
            >
              <path d="M2 19h20v3H2v-3zm1-1L6 6l4 4 2-6 2 6 4-4 3 12H3z" />
            </svg>
          </div>

          <h1 className="font-serif text-xl font-semibold text-[#f7f7ff]">
            Campaigns Require a Paid Membership
          </h1>
          <p className="mt-2 text-sm text-[#b9baa3]/60 leading-relaxed">
            Access to campaigns, session scheduling, and advanced features is available with a{" "}
            <span className="font-semibold text-gold-400">paid monthly membership</span>{" "}
            to the CursesAP Patreon.
          </p>

          <button
            onClick={startOAuth}
            disabled={isLinking}
            className="mt-6 inline-block w-full rounded-lg border border-gold-500/40 bg-gold-500/15 px-5 py-2.5 text-sm font-bold text-gold-400 hover:bg-gold-500/25 hover:border-gold-500/60 transition-colors focus:outline-none focus:ring-2 focus:ring-gold-400 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:opacity-50"
          >
            {isLinking ? "Linking\u2026" : "View Tiers on Patreon"}
          </button>

          <Link
            href="/dashboard"
            className="mt-4 inline-block text-sm text-[#577399] hover:text-[#f7f7ff] transition-colors"
          >
            &larr; Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  // Fallback (shouldn't reach here)
  return <>{children}</>;
}
