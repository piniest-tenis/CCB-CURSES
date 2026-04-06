"use client";

/**
 * src/app/twitch-overlay/TwitchOverlayClient.tsx
 *
 * Compact Twitch stream overlay widget.
 *
 * Designed to be added as a Browser Source in OBS/Streamlabs at ~380×220 px
 * with a transparent/chroma-key background. It reads two query-string
 * parameters:
 *
 *   ?id=<characterId>   — the character's UUID
 *   &token=<shareToken> — the 7-day share JWT from GET /characters/{id}/share
 *
 * What it shows (no PII ever):
 *   • Character portrait / avatar (or initial)
 *   • Character name — displayed large
 *   • Class · Subclass · Level
 *   • Ancestry / Community badges
 *   • Active conditions
 *   • HP, Stress, Armor slot rows
 *   • Hope pips
 *   • Damage thresholds (Major / Severe)
 *   • Domain tags
 *   • "Full sheet ↗" link → /character/<id>/public?token=<token>
 *
 * The Twitch API Client ID (ajls8isp75nequgerzql4vipnfrzzi) is stored
 * as the constant TWITCH_CLIENT_ID for future channel-context enrichment
 * (e.g. displaying stream title or currently-playing game). It is NOT used
 * to authenticate users — the Daggerheart share token handles that.
 */

import React, { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import type { Character } from "@shared/types";

// ─── Twitch integration constant ─────────────────────────────────────────────
// Used for future Twitch channel-context calls (e.g. GET /helix/streams).
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const TWITCH_CLIENT_ID = "ajls8isp75nequgerzql4vipnfrzzi";

// ─── Shared-character query ───────────────────────────────────────────────────

function useSharedCharacter(characterId: string, token: string | null) {
  return useQuery<Character>({
    queryKey: ["shared-character", characterId, token],
    queryFn: () =>
      apiClient.get<Character>(
        `/characters/${characterId}/view?token=${encodeURIComponent(token ?? "")}`
      ),
    enabled: Boolean(characterId) && Boolean(token),
    retry: false,
    staleTime: 60_000,
    // Refresh every 90 s so HP / Stress / Hope stay live on stream.
    refetchInterval: 90_000,
    refetchIntervalInBackground: false,
  });
}

// ─── Domain colour map (matches existing app palette) ────────────────────────

const DOMAIN_TEXT: Record<string, string> = {
  Artistry: "text-purple-300",
  Charm:    "text-pink-300",
  Creature: "text-green-300",
  Faithful: "text-yellow-300",
  Oddity:   "text-teal-300",
  Study:    "text-blue-300",
  Thievery: "text-orange-300",
  Trickery: "text-lime-300",
  Valiance: "text-red-300",
  Violence: "text-rose-300",
  Weird:    "text-indigo-300",
};

// ─── Slot tracker bar ─────────────────────────────────────────────────────────

function SlotBar({
  label,
  marked,
  max,
  filledClass,
}: {
  label: string;
  marked: number;
  max: number;
  filledClass: string;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="w-10 shrink-0 text-right text-[11px] font-semibold uppercase tracking-wider text-parchment-500">
        {label}
      </span>
      <div
        className="flex gap-0.5"
        role="meter"
        aria-valuenow={marked}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-label={`${label}: ${marked} of ${max}`}
      >
        {Array.from({ length: max }).map((_, i) => (
          <span
            key={i}
            aria-hidden="true"
            className={`h-3 w-3 rounded-[2px] border transition-colors ${
              i < marked
                ? `${filledClass} border-transparent`
                : "bg-transparent border-slate-700"
            }`}
          />
        ))}
      </div>
      <span className="text-[11px] text-parchment-700">
        {marked}/{max}
      </span>
    </div>
  );
}

// ─── Hope pips ────────────────────────────────────────────────────────────────

function HopePips({ hope, max }: { hope: number; max: number }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="w-10 shrink-0 text-right text-[11px] font-semibold uppercase tracking-wider text-parchment-500">
        Hope
      </span>
      <div
        className="flex gap-0.5"
        role="meter"
        aria-valuenow={hope}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-label={`Hope: ${hope} of ${max}`}
      >
        {Array.from({ length: max }).map((_, i) => (
          <span
            key={i}
            aria-hidden="true"
            className={`h-3 w-3 rounded-full border transition-colors ${
              i < hope
                ? "bg-gold-500 border-gold-400 shadow-[0_0_4px_rgba(212,169,74,0.6)]"
                : "bg-transparent border-slate-700"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Main overlay widget ──────────────────────────────────────────────────────

function OverlayContent() {
  const searchParams = useSearchParams();
  const characterId = searchParams?.get("id") ?? "";
  const token       = searchParams?.get("token") ?? null;

  const { data: character, isLoading, isError } = useSharedCharacter(
    characterId,
    token
  );

  // Build the public full-sheet URL
  const publicUrl = characterId && token
    ? `/character/${characterId}/public/?token=${encodeURIComponent(token)}`
    : "/";

  // ── Loading state ──────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div
        role="status"
        aria-label="Loading character"
        className="flex items-center justify-center h-full"
      >
        <div
          aria-hidden="true"
          className="h-6 w-6 animate-spin rounded-full border-2 border-burgundy-500 border-t-transparent"
        />
        <span className="sr-only">Loading character…</span>
      </div>
    );
  }

  // ── Error / missing token ──────────────────────────────────────────────────
  if (isError || !token || !character) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-xs text-parchment-600 text-center px-4">
          {!token
            ? "Overlay requires ?id= and ?token= query params."
            : "Unable to load character. Check that the share token is valid."}
        </p>
      </div>
    );
  }

  // ── Kicker line ───────────────────────────────────────────────────────────
  const kicker = [
    character.className,
    character.subclassName,
    character.communityName,
    character.ancestryName,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <article
      aria-label={`${character.name} character overlay`}
      className="w-full h-full flex flex-col gap-2.5 p-3"
    >
      {/* ── Header row: portrait + name + level ──────────────────────────── */}
      <div className="flex items-center gap-2.5">
        {/* Portrait / avatar */}
        <div
          aria-hidden="true"
          className="
            h-12 w-12 shrink-0 rounded-full
            border-2 border-burgundy-700
            bg-slate-900 overflow-hidden
            flex items-center justify-center
            text-lg font-bold text-parchment-500 uppercase
          "
        >
          {character.portraitUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={character.portraitUrl}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : character.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={character.avatarUrl}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            character.name.charAt(0)
          )}
        </div>

        {/* Name + kicker */}
        <div className="flex-1 min-w-0">
          <h1 className="font-display text-xl font-bold leading-tight text-parchment-100 truncate">
            {character.name}
          </h1>
          <p className="text-[12px] text-parchment-500 truncate">{kicker}</p>
        </div>

        {/* Level badge + full-sheet link */}
        <div className="flex flex-col items-end gap-1 shrink-0">
          <div
            aria-label={`Level ${character.level}`}
            className="
              flex items-center gap-0.5
              rounded border border-gold-800 bg-gold-950/30
              px-2 py-0.5
            "
          >
            <span className="text-[11px] font-semibold uppercase tracking-wider text-gold-600">
              Lv
            </span>
            <span className="text-sm font-bold text-gold-400 leading-none">
              {character.level}
            </span>
          </div>

          <Link
            href={publicUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Open full character sheet in new tab"
            className="
              text-[11px] font-medium text-parchment-600
              hover:text-gold-400 transition-colors
              underline underline-offset-2 decoration-parchment-800
              hover:decoration-gold-700 focus:outline-none
              focus:ring-1 focus:ring-gold-500 rounded
            "
          >
            Full sheet ↗
          </Link>
        </div>
      </div>

      {/* ── Conditions ───────────────────────────────────────────────────── */}
      {character.conditions.length > 0 && (
        <div className="flex flex-wrap gap-1" role="list" aria-label="Conditions">
          {character.conditions.map((c) => (
            <span
              key={c}
              role="listitem"
              className="
                rounded border border-burgundy-700 bg-burgundy-950/50
                px-1.5 py-0.5 text-[11px] font-medium text-burgundy-300
              "
            >
              {c}
            </span>
          ))}
        </div>
      )}

      {/* ── Domain badges ────────────────────────────────────────────────── */}
      {character.domains.length > 0 && (
        <div className="flex flex-wrap gap-1" role="list" aria-label="Domains">
          {character.domains.map((d) => (
            <span
              key={d}
              role="listitem"
              className={`
                rounded border border-gold-900/60 bg-slate-900/50
                px-1.5 py-0.5 text-[11px] font-semibold
                ${DOMAIN_TEXT[d] ?? "text-gold-400"}
              `}
            >
              {d}
            </span>
          ))}
        </div>
      )}

      {/* ── Resource trackers ────────────────────────────────────────────── */}
      <div className="space-y-1">
        <SlotBar
          label="HP"
          marked={character.trackers.hp.marked}
          max={character.trackers.hp.max}
          filledClass="bg-burgundy-500"
        />
        <SlotBar
          label="Stress"
          marked={character.trackers.stress.marked}
          max={character.trackers.stress.max}
          filledClass="bg-purple-500"
        />
        {character.trackers.armor.max > 0 && (
          <SlotBar
            label="Armor"
            marked={character.trackers.armor.marked}
            max={character.trackers.armor.max}
            filledClass="bg-slate-400"
          />
        )}
        <HopePips
          hope={character.hope}
          max={character.hopeMax ?? 6}
        />
      </div>

      {/* ── Damage thresholds ────────────────────────────────────────────── */}
      <div
        className="flex gap-4 text-[11px] text-parchment-600"
        aria-label="Damage thresholds"
      >
        <span>
          Major{" "}
          <span className="font-bold text-parchment-300">
            {character.damageThresholds.major}
          </span>
        </span>
        <span>
          Severe{" "}
          <span className="font-bold text-parchment-300">
            {character.damageThresholds.severe}
          </span>
        </span>
        <span>
          Evasion{" "}
          <span className="font-bold text-parchment-300">
            {character.derivedStats.evasion}
          </span>
        </span>
      </div>
    </article>
  );
}

// ─── Root export (Suspense boundary for useSearchParams) ─────────────────────

export default function TwitchOverlayClient() {
  return (
    /*
     * The overlay body is intentionally transparent so OBS can composite it
     * directly onto the stream without a colour-key step. The parchment-texture
     * gradient gives a subtle dark vignette while still allowing chroma-key.
     * Width/height are set to 100vw/100vh so the OBS browser source controls
     * the exact crop.
     */
    <div
      className="
        w-screen h-screen overflow-hidden
        bg-slate-950/80 backdrop-blur-sm
        border border-burgundy-900/60 rounded-xl
        text-parchment-200 font-sans
      "
      style={{ background: "rgba(8,13,23,0.82)" }}
    >
      <Suspense
        fallback={
          <div
            role="status"
            aria-label="Loading overlay"
            className="flex h-full items-center justify-center"
          >
            <div
              aria-hidden="true"
              className="h-5 w-5 animate-spin rounded-full border-2 border-burgundy-500 border-t-transparent"
            />
            <span className="sr-only">Loading…</span>
          </div>
        }
      >
        <OverlayContent />
      </Suspense>
    </div>
  );
}
