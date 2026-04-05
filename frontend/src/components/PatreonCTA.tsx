"use client";

/**
 * src/components/PatreonCTA.tsx
 *
 * Persistent call-to-action banner displayed at the bottom of the viewport
 * for authenticated users who have not linked a valid Patreon account.
 *
 * Requirements:
 * - Large, impossible-to-miss banner visible at all times
 * - Links to https://patreon.com/CursesAP
 * - Text: "Unlock saving characters by joining our FREE Patreon!"
 * - When the user clicks the link and returns (window regains focus),
 *   the app re-checks their Patreon status
 */

import React, { useCallback, useEffect, useRef } from "react";
import { usePatreonGate } from "@/hooks/usePatreonGate";
import { useAuthStore } from "@/store/authStore";
import { apiClient } from "@/lib/api";
import type { PatreonLink } from "@shared/types";

const PATREON_URL = "https://patreon.com/CursesAP";

export function PatreonCTA() {
  const { needsPatreon } = usePatreonGate();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const setUser = useAuthStore((s) => s.setUser);
  const user = useAuthStore((s) => s.user);

  // Track whether the user has clicked the Patreon link so we only
  // re-check on focus when relevant
  const clickedPatreonRef = useRef(false);

  // ── Focus-based re-check ─────────────────────────────────────────────────
  const recheckPatreonStatus = useCallback(async () => {
    if (!clickedPatreonRef.current) return;
    if (!isAuthenticated || !user) return;

    try {
      const result = await apiClient.get<{
        patreon: PatreonLink | null;
        createdAt: string;
      }>("/users/me/patreon/status");

      // If the Patreon status changed, update the user profile in the store
      if (result.patreon && !user.patreon) {
        setUser({ ...user, patreon: result.patreon });
      } else if (
        result.patreon &&
        user.patreon &&
        result.patreon.membershipStatus !== user.patreon.membershipStatus
      ) {
        setUser({ ...user, patreon: result.patreon });
      }
    } catch {
      // Non-fatal — silently retry next time
    }

    clickedPatreonRef.current = false;
  }, [isAuthenticated, user, setUser]);

  useEffect(() => {
    const onFocus = () => {
      recheckPatreonStatus();
    };

    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [recheckPatreonStatus]);

  // ── Click handler ────────────────────────────────────────────────────────
  const handleClick = useCallback(() => {
    clickedPatreonRef.current = true;
  }, []);

  // Don't render if the user doesn't need Patreon
  if (!isAuthenticated || !needsPatreon) return null;

  return (
    <div
      className="fixed bottom-0 inset-x-0 z-50"
      role="banner"
      aria-label="Patreon call to action"
    >
      {/* Gradient backdrop */}
      <div className="bg-gradient-to-r from-[#f96854] via-[#ff6b4a] to-[#f96854] px-4 py-4 shadow-[0_-4px_20px_rgba(249,104,84,0.4)]">
        <div className="mx-auto max-w-4xl flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
          {/* Patreon icon */}
          <svg
            viewBox="0 0 24 24"
            fill="currentColor"
            className="h-8 w-8 flex-shrink-0 text-white"
            aria-hidden="true"
          >
            <path d="M14.82 2.41c3.96 0 7.18 3.24 7.18 7.21 0 3.96-3.22 7.18-7.18 7.18-3.97 0-7.21-3.22-7.21-7.18 0-3.97 3.24-7.21 7.21-7.21M2 21.6h3.5V2.41H2V21.6z" />
          </svg>

          {/* CTA text */}
          <p className="text-center sm:text-left text-white font-semibold text-lg sm:text-xl leading-tight">
            Unlock saving characters by joining our{" "}
            <span className="font-bold underline decoration-2 underline-offset-2">
              FREE
            </span>{" "}
            Patreon!
          </p>

          {/* CTA button */}
          <a
            href={PATREON_URL}
            target="_blank"
            rel="noopener noreferrer"
            onClick={handleClick}
            className="flex-shrink-0 rounded-lg bg-white px-6 py-2.5 text-[#f96854] font-bold text-base sm:text-lg shadow-lg hover:bg-gray-100 hover:shadow-xl transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-[#f96854]"
          >
            Join Now
          </a>
        </div>
      </div>
    </div>
  );
}
