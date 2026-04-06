"use client";

/**
 * src/components/PatreonGateOverlay.tsx
 *
 * Inline gate components for gating UI sections behind Patreon membership.
 * Uses subtle inline banners instead of absolute-positioned overlays to
 * prevent escaping container bounds and overlapping adjacent content.
 *
 * Two variants:
 * 1. `PatreonSaveGate` — Wraps sections requiring Patreon membership (free tier).
 *    Shows a compact inline banner with a Patreon link CTA.
 *    Note: Character saving is no longer gated; this is now primarily used
 *    as a fallback by PatreonPaidGate for users with no Patreon link at all.
 *
 * 2. `PatreonPaidGate` — Wraps campaign/dice/session sections requiring
 *    a paid Patreon tier. Shows a subtle gold-accented premium banner.
 *
 * Both variants render children underneath with light dimming and
 * pointer-events-none to give users a preview of gated content.
 *
 * All "Join Patreon" actions trigger the OAuth authorize flow via
 * GET /users/me/patreon/authorize (not a direct link to patreon.com).
 */

import React from "react";
import { usePatreonGate, usePatreonOAuth } from "@/hooks/usePatreonGate";

// ─── Inline Lock Icon (small, 14px) ──────────────────────────────────────────

function LockIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      className={`w-3.5 h-3.5 shrink-0 ${className}`}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
      />
    </svg>
  );
}

// ─── Inline Crown Icon (small, 14px) ─────────────────────────────────────────

function CrownIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={`w-3.5 h-3.5 shrink-0 ${className}`}
      aria-hidden="true"
    >
      <path d="M2 19h20v3H2v-3zm1-1L6 6l4 4 2-6 2 6 4-4 3 12H3z" />
    </svg>
  );
}

// ─── Save Gate ────────────────────────────────────────────────────────────────

interface PatreonSaveGateProps {
  children: React.ReactNode;
  /** Optional class name for the wrapper div. */
  className?: string;
}

/**
 * Wraps children with a non-interactive inline banner when the user cannot save.
 * Children are rendered with light dimming underneath so users can preview the UI.
 * The banner sits WITHIN the document flow — no absolute positioning.
 */
export function PatreonSaveGate({ children, className = "" }: PatreonSaveGateProps) {
  const { canSave } = usePatreonGate();
  const { isLinking, startOAuth } = usePatreonOAuth();

  if (canSave) {
    return <div className={className}>{children}</div>;
  }

  return (
    <div className={`overflow-hidden ${className}`}>
      {/* Inline banner — sits in normal flow at the top of the gated section */}
      <div
        role="status"
        className="flex items-center gap-2 rounded-lg border border-[#f96854]/25 bg-[#f96854]/8 px-3 py-2 mb-2"
      >
        <LockIcon className="text-[#f96854]/70" />
        <p className="flex-1 text-xs text-[#b9baa3]/80 leading-snug">
          Join our{" "}
          <span className="font-semibold text-[#f96854]">free Patreon</span>{" "}
          to unlock this feature.
        </p>
        <button
          type="button"
          onClick={startOAuth}
          disabled={isLinking}
          className="shrink-0 rounded-md bg-[#f96854] px-3 py-1 text-xs font-semibold text-white hover:bg-[#ff8a75] transition-colors focus:outline-none focus:ring-2 focus:ring-[#f96854] focus:ring-offset-1 focus:ring-offset-slate-900 disabled:opacity-60 disabled:cursor-wait"
        >
          {isLinking ? "Linking…" : "Link Patreon"}
        </button>
      </div>

      {/* Children rendered with light dimming — still visible for preview */}
      <div
        className="pointer-events-none select-none opacity-50"
        aria-hidden="true"
        inert
      >
        {children}
      </div>
    </div>
  );
}

// ─── Paid Tier Gate ───────────────────────────────────────────────────────────

interface PatreonPaidGateProps {
  children: React.ReactNode;
  /** Optional class name for the wrapper div. */
  className?: string;
}

/**
 * Wraps campaign/dice/session sections with a subtle inline banner for users
 * who have a free Patreon account but need a paid tier.
 *
 * Shows the banner when:
 * - User is authenticated and has a free Patreon link (but not paid)
 * - User is NOT grandfathered
 *
 * Also defers to `PatreonSaveGate` if the user has no Patreon at all.
 *
 * Design: A compact gold-accented ribbon sitting within normal document flow.
 * No absolute overlays, no backdrop-blur, no escaping container bounds.
 */
export function PatreonPaidGate({ children, className = "" }: PatreonPaidGateProps) {
  const { canAccessCampaigns, needsPaidTier, needsPatreon } = usePatreonGate();

  // If the user can access campaigns, render normally
  if (canAccessCampaigns) {
    return <div className={className}>{children}</div>;
  }

  // If the user has no Patreon at all, defer to the save gate
  if (needsPatreon) {
    return (
      <PatreonSaveGate className={className}>
        {children}
      </PatreonSaveGate>
    );
  }

  // User has free Patreon but needs paid tier
  if (needsPaidTier) {
    return (
      <div className={`overflow-hidden ${className}`}>
        {/* Inline premium banner — compact ribbon in normal flow */}
        <div
          role="status"
          className="flex items-center gap-2 rounded-lg border border-gold-500/25 bg-gold-500/6 px-3 py-2 mb-2"
        >
          <CrownIcon className="text-gold-400/80" />
          <p className="flex-1 text-xs text-[#b9baa3]/80 leading-snug">
            <span className="font-semibold text-gold-400">Paid membership</span>{" "}
            required for this feature.
          </p>
          <a
            href="https://patreon.com/CursesAP"
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 rounded-md border border-gold-500/40 bg-gold-500/15 px-3 py-1 text-xs font-semibold text-gold-400 hover:bg-gold-500/25 hover:border-gold-500/60 transition-colors focus:outline-none focus:ring-2 focus:ring-gold-400 focus:ring-offset-1 focus:ring-offset-slate-900"
          >
            View Tiers
          </a>
        </div>

        {/* Children rendered with light dimming — visible preview, no grayscale */}
        <div
          className="pointer-events-none select-none opacity-[0.55]"
          aria-hidden="true"
          inert
        >
          {children}
        </div>
      </div>
    );
  }

  // Fallback: render children normally (shouldn't happen)
  return <div className={className}>{children}</div>;
}
