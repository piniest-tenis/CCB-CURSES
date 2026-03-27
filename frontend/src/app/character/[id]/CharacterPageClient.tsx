"use client";

/**
 * src/app/character/[id]/page.tsx
 *
 * Character sheet page — protected, loads the CharacterSheet component.
 */

import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { CharacterSheet } from "@/components/character/CharacterSheet";
import { LoadingInterstitial } from "@/components/LoadingInterstitial";
import { useCharacter } from "@/hooks/useCharacter";
import { useDiceStore } from "@/store/diceStore";
import React, { useEffect } from "react";
import Link from "next/link";

export default function CharacterPage() {
  const pathname = usePathname();
  // Extract the real character ID from the browser URL.
  // useParams() returns "__placeholder__" in a static export because Next.js
  // only pre-renders one HTML file per dynamic segment; usePathname() always
  // reflects the actual browser URL path.
  const characterId = pathname?.split("/")[2] ?? "";
  const router = useRouter();
  const { isAuthenticated, isLoading, isReady, signOut } = useAuthStore();

  // Gate the redirect on isReady: isAuthenticated is false on initial hydration
  // (it isn't persisted) so we must wait for initialize() to complete first.
  useEffect(() => {
    if (isReady && !isAuthenticated) {
      router.replace("/auth/login");
    }
  }, [isReady, isAuthenticated, router]);

  // Character data loading state — used to drive the interstitial overlay.
  const { isLoading: charLoading, data: character } = useCharacter(
    isAuthenticated ? characterId : undefined
  );

  // Scope dice broadcasts to this character's campaign so the campaign-specific
  // OBS overlay (obs/dice?campaign=<id>) receives rolls from this sheet.
  const setCampaignId = useDiceStore((s) => s.setCampaignId);
  useEffect(() => {
    if (character?.campaignId) {
      setCampaignId(character.campaignId);
    }
    return () => { setCampaignId(null); };
  }, [character?.campaignId, setCampaignId]);

  // Show the interstitial while auth is still resolving OR character is loading.
  const showInterstitial = !isReady || isLoading || charLoading;

  if (!isReady || isLoading || !isAuthenticated) {
    return (
      <>
        <div className="min-h-screen bg-[#0a100d]" />
        <LoadingInterstitial isVisible={showInterstitial} />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950">
      {/* ── Fixed full-viewport background ───────────────────────────── */}
      {/* The image covers the viewport and stays put during scroll.     */}
      {/* The overlay uses the same style as the interstitial card scrim */}
      {/* so art reads through while the UI stays legible.               */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/images/JeffBrown_ARCEMSPLASH.webp"
        alt=""
        aria-hidden="true"
        className="fixed inset-0 h-full w-full object-cover pointer-events-none select-none z-0"
      />
      <div
        aria-hidden="true"
        className="fixed inset-0 pointer-events-none z-0"
        style={{
          background:
            "linear-gradient(160deg, #0d1a24cc 0%, #0a100d99 50%, #111a10cc 100%)",
        }}
      />

      {/* Lore interstitial while the character sheet data loads */}
      <LoadingInterstitial isVisible={charLoading} />

      {/* Nav bar */}
      <header className="relative z-10 border-b border-burgundy-900/50 bg-slate-900/80 backdrop-blur-sm sticky top-0">
        <div className="mx-auto flex max-w-4xl items-center gap-4 px-4 py-3">
          <Link
            href="/dashboard"
            className="text-sm text-parchment-500 hover:text-parchment-300 transition-colors"
          >
            ← Dashboard
          </Link>
          <span className="text-parchment-700">|</span>
          <span className="font-serif text-sm text-parchment-400">
            Character Sheet
          </span>
          <button
            type="button"
            onClick={() => signOut().then(() => router.replace("/auth/login"))}
            className="
              ml-auto rounded px-2.5 py-1 text-xs font-medium
              text-parchment-600 border border-burgundy-900/60
              hover:text-parchment-300 hover:border-burgundy-700
              transition-colors
            "
          >
            Sign out
          </button>
        </div>
      </header>

      <main className="relative z-10 px-4 py-6">
        <CharacterSheet characterId={characterId} />
      </main>
    </div>
  );
}
