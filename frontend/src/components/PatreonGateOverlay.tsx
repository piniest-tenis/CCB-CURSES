"use client";

/**
 * src/components/PatreonGateOverlay.tsx
 *
 * Overlay components for gating UI sections behind Patreon membership.
 *
 * Two variants:
 * 1. `PatreonSaveGate` — Wraps sections that require save capability.
 *    Shows a semi-transparent overlay with the Patreon CTA for users
 *    who cannot save (no Patreon, not grandfathered).
 *
 * 2. `PatreonPaidGate` — Wraps campaign/dice/session sections that
 *    require a paid Patreon tier. Shows a prominent overlay message
 *    for free Patreon members explaining paid access is needed.
 *
 * Both variants render children underneath (visible but greyed out and
 * non-interactive) to give users a preview of what they're missing.
 */

import React from "react";
import { usePatreonGate } from "@/hooks/usePatreonGate";

const PATREON_URL = "https://patreon.com/CursesAP";

// ─── Save Gate ────────────────────────────────────────────────────────────────

interface PatreonSaveGateProps {
  children: React.ReactNode;
  /** Optional class name for the wrapper div. */
  className?: string;
}

/**
 * Wraps children with a non-interactive overlay when the user cannot save.
 * Children are rendered greyed-out underneath so users can preview the UI.
 */
export function PatreonSaveGate({ children, className = "" }: PatreonSaveGateProps) {
  const { canSave } = usePatreonGate();

  if (canSave) {
    return <div className={className}>{children}</div>;
  }

  return (
    <div className={`relative ${className}`}>
      {/* Children rendered but greyed out and non-interactive */}
      <div
        className="pointer-events-none select-none opacity-40 grayscale"
        aria-hidden="true"
        inert
      >
        {children}
      </div>

      {/* Overlay message */}
      <div className="absolute inset-0 flex items-center justify-center bg-slate-950/60 backdrop-blur-[2px] rounded-lg">
        <div className="text-center px-6 py-4 max-w-sm">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            className="mx-auto h-10 w-10 text-gold-400 mb-3"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
            />
          </svg>
          <p className="text-parchment-200 font-semibold text-sm leading-snug">
            Join our{" "}
            <a
              href={PATREON_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#f96854] underline underline-offset-2 hover:text-[#ff8a75] transition-colors"
            >
              FREE Patreon
            </a>{" "}
            to unlock this feature.
          </p>
        </div>
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
 * Wraps campaign/dice/session sections with a prominent overlay for users
 * who have a free Patreon account but need a paid tier.
 *
 * Shows the overlay when:
 * - User is authenticated and has a free Patreon link (but not paid)
 * - User is NOT grandfathered
 *
 * Also shows the `PatreonSaveGate` overlay if the user has no Patreon at all.
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
      <div className={`relative ${className}`}>
        {/* Children rendered greyed out */}
        <div
          className="pointer-events-none select-none opacity-30 grayscale"
          aria-hidden="true"
          inert
        >
          {children}
        </div>

        {/* Paid tier overlay */}
        <div className="absolute inset-0 flex items-center justify-center bg-slate-950/70 backdrop-blur-[3px] rounded-lg">
          <div className="text-center px-6 py-5 max-w-md rounded-xl bg-slate-900/90 border border-gold-600/30 shadow-glow-gold">
            {/* Crown / premium icon */}
            <svg
              viewBox="0 0 24 24"
              fill="currentColor"
              className="mx-auto h-10 w-10 text-gold-400 mb-3"
              aria-hidden="true"
            >
              <path d="M2 19h20v3H2v-3zm1-1L6 6l4 4 2-6 2 6 4-4 3 12H3z" />
            </svg>
            <p className="text-gold-300 font-bold text-base sm:text-lg leading-snug mb-2">
              Premium Feature
            </p>
            <p className="text-parchment-300 text-sm leading-relaxed mb-4">
              Access to campaigns, session scheduling, and dice customization is
              available with a{" "}
              <span className="font-semibold text-gold-400">
                paid monthly membership
              </span>{" "}
              to the CursesAP Patreon.
            </p>
            <a
              href={PATREON_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block rounded-lg bg-gradient-to-r from-gold-600 to-gold-500 px-6 py-2.5 text-slate-950 font-bold text-sm shadow-lg hover:from-gold-500 hover:to-gold-400 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-gold-400 focus:ring-offset-2 focus:ring-offset-slate-900"
            >
              View Tiers on Patreon
            </a>
          </div>
        </div>
      </div>
    );
  }

  // Fallback: render children normally (shouldn't happen)
  return <div className={className}>{children}</div>;
}
