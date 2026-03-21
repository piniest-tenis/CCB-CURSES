"use client";

/**
 * src/app/character/[id]/view/page.tsx
 *
 * Read-only shared character sheet view.
 * Accessed via /character/{id}/view?token=<shareToken>
 * No auth required — the share token is validated server-side.
 */

import React, { Suspense } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import type { Character, CoreStatName } from "@shared/types";
import { MarkdownContent } from "@/components/MarkdownContent";

// ---------------------------------------------------------------------------
// Fetch helper — bypasses JWT, passes token as query param
// ---------------------------------------------------------------------------

function useSharedCharacter(characterId: string, token: string | null) {
  return useQuery<Character>({
    queryKey: ["shared-character", characterId, token],
    queryFn: () =>
      apiClient.get<Character>(
        `/characters/${characterId}/view?token=${encodeURIComponent(token ?? "")}`
      ),
    enabled: Boolean(characterId) && Boolean(token),
    retry: false, // Don't retry on 401/403 — token is invalid or expired
    staleTime: 60_000,
  });
}

// ---------------------------------------------------------------------------
// Display helpers
// ---------------------------------------------------------------------------

const STAT_LABELS: Record<CoreStatName, string> = {
  agility:   "Agility",
  strength:  "Strength",
  finesse:   "Finesse",
  instinct:  "Instinct",
  presence:  "Presence",
  knowledge: "Knowledge",
};

const CORE_STATS: CoreStatName[] = [
  "agility",
  "strength",
  "finesse",
  "instinct",
  "presence",
  "knowledge",
];

function StatBadge({ label, value }: { label: string; value: number }) {
  return (
    <div
      className="flex flex-col items-center rounded-lg border border-burgundy-800 bg-slate-900 px-3 py-2.5 min-w-[64px]"
      aria-label={`${label}: ${value >= 0 ? `+${value}` : value}`}
    >
      <span className="text-xs uppercase tracking-wider text-parchment-600 mb-1" aria-hidden="true">{label.slice(0, 3)}</span>
      <span className="text-xl font-bold text-parchment-100" aria-hidden="true">{value >= 0 ? `+${value}` : value}</span>
    </div>
  );
}

function SlotRow({
  label,
  marked,
  max,
}: {
  label: string;
  marked: number;
  max: number;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-24 text-xs text-parchment-500 uppercase tracking-wider">{label}</span>
      <div className="flex gap-1" role="group" aria-label={`${label}: ${marked} of ${max} marked`}>
        {Array.from({ length: max }).map((_, i) => (
          <span
            key={i}
            aria-label={i < marked ? `${label} slot ${i + 1} marked` : `${label} slot ${i + 1} empty`}
            className={`h-4 w-4 rounded-sm border ${
              i < marked
                ? "bg-burgundy-600 border-burgundy-500"
                : "bg-transparent border-burgundy-900"
            }`}
          />
        ))}
      </div>
      <span className="text-xs text-parchment-600" aria-hidden="true">
        {marked}/{max}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function SharedCharacterViewPage() {
  return (
    <Suspense
      fallback={
        <div
          role="status"
          aria-label="Loading character sheet"
          className="flex min-h-screen items-center justify-center bg-slate-950"
        >
          <div aria-hidden="true" className="h-8 w-8 animate-spin rounded-full border-2 border-burgundy-500 border-t-transparent" />
          <span className="sr-only">Loading character sheet…</span>
        </div>
      }
    >
      <SharedCharacterViewContent />
    </Suspense>
  );
}

function SharedCharacterViewContent() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const token = searchParams?.get("token");

  const { data: character, isLoading, isError, error } = useSharedCharacter(
    pathname?.split("/")[2] ?? "",
    token ?? null
  );

  // Determine if token is missing vs invalid/expired
  const isTokenMissing = !token;
  const errorMessage = (() => {
    if (isTokenMissing) return "This link is missing its share token.";
    if (!isError || !error) return null;
    const msg = (error as Error).message ?? "";
    if (msg.includes("expired")) return "This share link has expired.";
    if (msg.includes("Invalid") || msg.includes("Unauthorized"))
      return "This share link is invalid.";
    if (msg.includes("not found") || msg.includes("NOT_FOUND"))
      return "This character sheet could not be found.";
    return "Failed to load the shared character sheet.";
  })();

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Top bar */}
      <header className="border-b border-burgundy-900/50 bg-slate-900/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
          <Link
            href="/"
            className="font-serif text-lg font-bold text-parchment-100 hover:text-gold-300 transition-colors"
          >
            Daggerheart
          </Link>
          <span className="rounded border border-burgundy-800 bg-burgundy-950/30 px-2.5 py-1 text-xs font-medium text-burgundy-400">
            Read-only view
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-6">
        {/* Loading */}
        {isLoading && (
          <div
            role="status"
            aria-label="Loading character"
            className="flex items-center justify-center py-20"
          >
            <div aria-hidden="true" className="h-8 w-8 animate-spin rounded-full border-2 border-burgundy-500 border-t-transparent" />
            <span className="sr-only">Loading character…</span>
          </div>
        )}

        {/* Error / invalid token */}
        {(isError || isTokenMissing) && !isLoading && (
          <div className="mx-auto max-w-md rounded-xl border border-burgundy-700 bg-slate-900 p-8 text-center">
            <p className="font-serif text-lg text-parchment-300 mb-2">
              Unable to load sheet
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

        {/* Sheet */}
        {character && !isLoading && (
          <div className="space-y-6">
            {/* ── Header ─────────────────────────────────────────────────── */}
            <div className="rounded-xl border border-burgundy-900 bg-slate-900 p-5">
              <div className="flex flex-wrap items-start gap-4">
                {/* Avatar */}
                <div className="h-16 w-16 shrink-0 rounded-full border-2 border-burgundy-700 bg-slate-850 flex items-center justify-center text-2xl font-bold text-parchment-500 uppercase overflow-hidden">
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

                <div className="flex-1 min-w-0">
                  <h1 className="font-serif text-2xl font-bold text-parchment-100">
                    {character.name}
                  </h1>
                  <div className="mt-1 flex flex-wrap gap-2 text-sm text-parchment-400">
                    <span>{character.className}</span>
                    {character.subclassName && (
                      <>
                        <span className="text-parchment-700">·</span>
                        <span>{character.subclassName}</span>
                      </>
                    )}
                    {character.communityName && (
                      <>
                        <span className="text-parchment-700">·</span>
                        <span>{character.communityName}</span>
                      </>
                    )}
                    {character.ancestryName && (
                      <>
                        <span className="text-parchment-700">·</span>
                        <span>{character.ancestryName}</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-center">
                    <p className="text-xs uppercase tracking-wider text-parchment-600">Level</p>
                    <p className="text-2xl font-bold text-gold-400">{character.level}</p>
                  </div>
                </div>
              </div>

              {/* Conditions */}
              {character.conditions.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {character.conditions.map((c) => (
                    <span
                      key={c}
                      className="rounded border border-burgundy-700 bg-burgundy-950/40 px-2 py-0.5 text-xs text-burgundy-300"
                    >
                      {c}
                    </span>
                  ))}
                </div>
              )}

              {/* Domains */}
              {character.domains.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {character.domains.map((d) => (
                    <span
                      key={d}
                      className="rounded border border-gold-800 bg-gold-950/20 px-2 py-0.5 text-xs text-gold-400"
                    >
                      {d}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* ── Stats ──────────────────────────────────────────────────── */}
            <div className="rounded-xl border border-burgundy-900 bg-slate-900 p-5">
              <h2 className="mb-4 font-serif text-lg font-semibold text-parchment-200">
                Stats
              </h2>

              {/* Derived */}
              <div className="mb-4 flex gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-xs uppercase tracking-wider text-parchment-600">Evasion</span>
                  <span className="rounded border border-burgundy-700 bg-slate-850 px-2.5 py-0.5 font-bold text-parchment-100">
                    {character.derivedStats.evasion}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs uppercase tracking-wider text-parchment-600">Armor</span>
                  <span className="rounded border border-burgundy-700 bg-slate-850 px-2.5 py-0.5 font-bold text-parchment-100">
                    {character.derivedStats.armor}
                  </span>
                </div>
              </div>

              {/* Core stats */}
              <div className="flex flex-wrap gap-2">
                {CORE_STATS.map((stat) => (
                  <StatBadge
                    key={stat}
                    label={STAT_LABELS[stat]}
                    value={character.stats[stat]}
                  />
                ))}
              </div>
            </div>

            {/* ── Trackers ───────────────────────────────────────────────── */}
            <div className="rounded-xl border border-burgundy-900 bg-slate-900 p-5">
              <h2 className="mb-4 font-serif text-lg font-semibold text-parchment-200">
                Trackers
              </h2>
              <div className="space-y-2.5">
                <SlotRow
                  label="HP"
                  marked={character.trackers.hp.marked}
                  max={character.trackers.hp.max}
                />
                <SlotRow
                  label="Stress"
                  marked={character.trackers.stress.marked}
                  max={character.trackers.stress.max}
                />
                <SlotRow
                  label="Armor"
                  marked={character.trackers.armor.marked}
                  max={character.trackers.armor.max}
                />
                {/* Proficiency — scalar integer */}
                <div className="flex items-center gap-3">
                  <span className="text-xs uppercase tracking-wider text-parchment-600 w-24">Proficiency</span>
                  <span className="font-bold text-parchment-200">{character.proficiency ?? 1}</span>
                </div>
              </div>

              {/* Hope */}
              <div className="mt-4 flex items-center gap-3">
                <span className="text-xs uppercase tracking-wider text-parchment-600 w-24">Hope</span>
                <div className="flex gap-1" role="group" aria-label={`Hope: ${character.hope} of ${character.hopeMax ?? 6}`}>
                  {Array.from({ length: character.hopeMax ?? 6 }).map((_, i) => (
                    <span
                      key={i}
                      aria-label={i < character.hope ? `Hope ${i + 1} filled` : `Hope ${i + 1} empty`}
                      className={`h-4 w-4 rounded-full border ${
                        i < character.hope
                          ? "bg-gold-600 border-gold-500"
                          : "bg-transparent border-gold-900"
                      }`}
                    />
                  ))}
                </div>
                <span className="text-xs text-parchment-600" aria-hidden="true">{character.hope}/{character.hopeMax ?? 6}</span>
              </div>

              {/* Damage thresholds — SRD page 20: only Major and Severe */}
              <div className="mt-4 flex flex-wrap gap-4">
                <div className="text-center">
                  <p className="text-xs uppercase tracking-wider text-parchment-600">Major</p>
                  <p className="font-bold text-parchment-200">{character.damageThresholds.major}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs uppercase tracking-wider text-parchment-600">Severe</p>
                  <p className="font-bold text-parchment-200">{character.damageThresholds.severe}</p>
                </div>
              </div>
            </div>

            {/* ── Experiences ────────────────────────────────────────────── */}
            {character.experiences.length > 0 && (
              <div className="rounded-xl border border-burgundy-900 bg-slate-900 p-5">
                <h2 className="mb-3 font-serif text-lg font-semibold text-parchment-200">
                  Experiences
                </h2>
                <div className="space-y-1">
                  {character.experiences.map((exp, i) => (
                    <div key={i} className="flex items-center gap-3 text-sm">
                      <span className="text-parchment-300">{exp.name}</span>
                      <span className={`font-bold ${exp.bonus >= 0 ? "text-gold-400" : "text-burgundy-400"}`}>
                        {exp.bonus >= 0 ? `+${exp.bonus}` : exp.bonus}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Domain Loadout ─────────────────────────────────────────── */}
            {character.domainLoadout.length > 0 && (
              <div className="rounded-xl border border-burgundy-900 bg-slate-900 p-5">
                <h2 className="mb-3 font-serif text-lg font-semibold text-parchment-200">
                  Domain Loadout
                </h2>
                <div className="flex flex-wrap gap-2">
                  {character.domainLoadout.map((cardId) => (
                    <span
                      key={cardId}
                      className="rounded border border-burgundy-800 bg-slate-850 px-3 py-1 text-xs text-parchment-400"
                    >
                      {cardId}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* ── Notes ──────────────────────────────────────────────────── */}
            {character.notes && (
              <div className="rounded-xl border border-burgundy-900 bg-slate-900 p-5">
                <h2 className="mb-3 font-serif text-lg font-semibold text-parchment-200">
                  Notes
                </h2>
                <MarkdownContent className="text-sm text-parchment-400 leading-relaxed">
                  {character.notes}
                </MarkdownContent>
              </div>
            )}

            {/* Footer */}
            <p className="text-center text-xs text-parchment-700 pb-4">
              Shared via Daggerheart Character Platform ·{" "}
              <Link href="/auth/register" className="hover:text-parchment-500 transition-colors">
                Create your own character
              </Link>
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
