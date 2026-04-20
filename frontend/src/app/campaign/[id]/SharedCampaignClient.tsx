"use client";

/**
 * src/app/campaign/[id]/SharedCampaignClient.tsx
 *
 * Public read-only campaign view.
 * Accessed via /campaign/{id}?token=<campaignShareToken>
 *
 * No auth required - the campaign share token is validated server-side.
 * Lives outside /campaigns (plural) to avoid the Patreon paywall layout.
 *
 * Calls GET /campaigns/{campaignId}/view?token=... which returns:
 *   { campaign: { campaignId, name }, characters: [...], shareTokens: { charId: token } }
 *
 * Each character is rendered as a card linking to /character/{id}/view?token=...
 */

import React, { Suspense } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CampaignViewCharacter {
  characterId: string;
  userId: string;
  name: string;
  className: string;
  level: number;
  avatarUrl: string | null;
  portraitUrl: string | null;
}

interface CampaignViewResponse {
  campaign: {
    campaignId: string;
    name: string;
  };
  characters: CampaignViewCharacter[];
  shareTokens: Record<string, string>;
}

// ---------------------------------------------------------------------------
// Fetch helper - bypasses JWT, uses direct fetch with token query param
// ---------------------------------------------------------------------------

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

async function fetchCampaignView(
  campaignId: string,
  token: string,
): Promise<CampaignViewResponse> {
  const res = await fetch(
    `${API_BASE_URL}/campaigns/${campaignId}/view?token=${encodeURIComponent(token)}`,
    { headers: { Accept: "application/json" } },
  );
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(
      body.error?.message ?? body.message ?? `Request failed (${res.status})`,
    );
  }
  const json = await res.json();
  // Backend wraps in { data: ... } via createSuccessResponse
  return json.data ?? json;
}

function useSharedCampaign(campaignId: string, token: string | null) {
  return useQuery<CampaignViewResponse>({
    queryKey: ["shared-campaign", campaignId, token],
    queryFn: () => fetchCampaignView(campaignId, token!),
    enabled: Boolean(campaignId) && Boolean(token),
    retry: false,
    staleTime: 60_000,
  });
}

// ---------------------------------------------------------------------------
// Character card
// ---------------------------------------------------------------------------

function CharacterCard({
  character,
  shareToken,
}: {
  character: CampaignViewCharacter;
  shareToken: string | undefined;
}) {
  const hasLink = Boolean(shareToken);
  const href = hasLink
    ? `/character/${character.characterId}/view?token=${encodeURIComponent(shareToken!)}`
    : "#";

  return (
    <Link
      href={href}
      className={`group flex items-center gap-4 rounded-xl border bg-slate-900 p-4 transition-colors ${
        hasLink
          ? "border-burgundy-900 hover:border-burgundy-700 hover:bg-slate-900/80 cursor-pointer"
          : "border-burgundy-900/50 opacity-60 pointer-events-none"
      }`}
      aria-label={
        hasLink
          ? `View ${character.name}'s character sheet`
          : `${character.name}'s character sheet is not available`
      }
      aria-disabled={!hasLink}
      tabIndex={hasLink ? undefined : -1}
    >
      {/* Avatar */}
      <div className="h-14 w-14 shrink-0 rounded-full border-2 border-burgundy-700 bg-slate-850 flex items-center justify-center text-xl font-bold text-parchment-500 uppercase overflow-hidden">
        {character.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={character.avatarUrl}
            alt={character.name}
            className="h-full w-full object-cover"
          />
        ) : (
          character.name.charAt(0)
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="font-serif text-lg font-semibold text-parchment-100 truncate group-hover:text-gold-300 transition-colors">
          {character.name}
        </p>
        <p className="text-sm text-parchment-400 truncate">
          {character.className}
        </p>
      </div>

      {/* Level */}
      <div className="shrink-0 text-center">
        <p className="text-[10px] uppercase tracking-wider text-parchment-600">
          Lvl
        </p>
        <p className="text-xl font-bold text-gold-400">{character.level}</p>
      </div>

      {/* Arrow */}
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        className="h-5 w-5 shrink-0 text-parchment-700 group-hover:text-parchment-400 transition-colors"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M8.25 4.5l7.5 7.5-7.5 7.5"
        />
      </svg>
    </Link>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function SharedCampaignClient() {
  return (
    <Suspense
      fallback={
        <div
          role="status"
          aria-label="Loading campaign"
          className="flex min-h-screen items-center justify-center bg-slate-950"
        >
          <div
            aria-hidden="true"
            className="h-8 w-8 animate-spin rounded-full border-2 border-burgundy-500 border-t-transparent"
          />
          <span className="sr-only">Loading campaign&hellip;</span>
        </div>
      }
    >
      <SharedCampaignContent />
    </Suspense>
  );
}

function SharedCampaignContent() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const token = searchParams?.get("token");
  const campaignId = pathname?.split("/")[2] ?? "";

  const { data, isLoading, isError, error } = useSharedCampaign(
    campaignId,
    token ?? null,
  );

  // Error message logic
  const isTokenMissing = !token;
  const errorMessage = (() => {
    if (isTokenMissing) return "This link is missing its share token.";
    if (!isError || !error) return null;
    const msg = (error as Error).message ?? "";
    if (msg.includes("expired")) return "This share link has expired.";
    if (msg.includes("Invalid") || msg.includes("Unauthorized"))
      return "This share link is invalid.";
    if (msg.includes("not found") || msg.includes("NOT_FOUND"))
      return "This campaign could not be found.";
    return "Failed to load the shared campaign.";
  })();

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Top bar */}
      <header className="border-b border-burgundy-900/50 bg-slate-900/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <Link
            href="/"
            className="font-serif text-lg font-bold text-parchment-100 hover:text-gold-300 transition-colors"
          >
            Daggerheart
          </Link>
          <span className="rounded border border-burgundy-800 bg-burgundy-950/30 px-2.5 py-1 text-xs font-medium text-burgundy-400">
            Shared campaign
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-6">
        {/* Loading */}
        {isLoading && (
          <div
            role="status"
            aria-label="Loading campaign"
            className="flex items-center justify-center py-20"
          >
            <div
              aria-hidden="true"
              className="h-8 w-8 animate-spin rounded-full border-2 border-burgundy-500 border-t-transparent"
            />
            <span className="sr-only">Loading campaign&hellip;</span>
          </div>
        )}

        {/* Error / missing token */}
        {(isError || isTokenMissing) && !isLoading && (
          <div className="mx-auto max-w-md rounded-xl border border-burgundy-700 bg-slate-900 p-8 text-center">
            <p className="font-serif text-lg text-parchment-300 mb-2">
              Unable to load campaign
            </p>
            <p className="text-sm text-parchment-500 mb-4">{errorMessage}</p>
            <Link
              href="/"
              className="inline-block rounded-lg border border-burgundy-800 px-4 py-2 text-sm text-parchment-400 hover:text-parchment-200 transition-colors"
            >
              Go to Daggerheart
            </Link>
          </div>
        )}

        {/* Campaign content */}
        {data && !isLoading && (
          <div className="space-y-6">
            {/* Campaign header */}
            <div className="rounded-xl border border-burgundy-900 bg-slate-900 p-6 text-center">
              <h1 className="font-serif text-2xl font-bold text-parchment-100">
                {data.campaign.name}
              </h1>
              <p className="mt-1 text-sm text-parchment-500">
                {data.characters.length}{" "}
                {data.characters.length === 1 ? "character" : "characters"}
              </p>
            </div>

            {/* Characters */}
            {data.characters.length > 0 ? (
              <div className="space-y-3">
                <h2 className="font-serif text-lg font-semibold text-parchment-200">
                  Characters
                </h2>
                {data.characters.map((char) => (
                  <CharacterCard
                    key={char.characterId}
                    character={char}
                    shareToken={data.shareTokens[char.characterId]}
                  />
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-burgundy-900 bg-slate-900 p-8 text-center">
                <p className="text-sm text-parchment-500">
                  No characters have joined this campaign yet.
                </p>
              </div>
            )}

            {/* Footer */}
            <p className="text-center text-xs text-parchment-700 pb-4">
              Shared via Daggerheart Character Platform &middot;{" "}
              <Link
                href="/auth/register"
                className="hover:text-parchment-500 transition-colors"
              >
                Create your own character
              </Link>
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
