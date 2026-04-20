"use client";

/**
 * src/app/dashboard/page.tsx
 *
 * Unified dashboard landing page.
 *
 * Layout:
 *   - Top bar (sticky): logo, Campaigns nav link, user name + sign-out
 *   - Two-column at xl+: main column (characters + campaigns) + right rail
 *   - Right rail (xl+, sticky): ProfileCard → CampaignRailWidget → SessionPanel → LorePanel
 *   - Right rail panels collapse into inline sections below the character grid on mobile
 *
 * Character grid:
 *   - Portrait-first cards, sorted by updatedAt DESC by default
 *   - Filterable by name / class / subclass (case-insensitive)
 *   - Custom sort dropdown (name / class / updatedAt)
 */

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuthStore } from "@/store/authStore";
import {
  useCharacters,
  useCreateCharacter,
  useDeleteCharacter,
} from "@/hooks/useCharacter";
import { useCampaigns } from "@/hooks/useCampaigns";
import type { CharacterSummary, CampaignSummary } from "@shared/types";

import { AppHeader } from "@/components/AppHeader";
import { CharacterCard } from "@/components/dashboard/CharacterCard";
import {
  CharacterSearchSortBar,
  type SearchSortState,
  type SortKey,
} from "@/components/dashboard/CharacterSearchSortBar";
import { ProfileCard } from "@/components/dashboard/ProfileCard";
import { CampaignRailWidget } from "@/components/dashboard/CampaignRailWidget";
import { SessionPanel } from "@/components/dashboard/SessionPanel";
import { LorePanel } from "@/components/dashboard/LorePanel";
import { Footer } from "@/components/Footer";
import { PatreonPaidGate } from "@/components/PatreonGateOverlay";
import { usePatreonGate, usePatreonOAuth } from "@/hooks/usePatreonGate";

// ─── Constants ────────────────────────────────────────────────────────────────

/** Must match backend FREE_CHARACTER_LIMIT in characters/handler.ts */
const FREE_CHARACTER_LIMIT = 5;

// ─── Sort helper ──────────────────────────────────────────────────────────────

function sortCharacters(
  chars: CharacterSummary[],
  key: SortKey,
): CharacterSummary[] {
  return [...chars].sort((a, b) => {
    switch (key) {
      case "updatedAt":
        return (
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        );
      case "name":
        return a.name.localeCompare(b.name);
      case "className":
        return a.className.localeCompare(b.className);
    }
  });
}

// ─── CreateCharacterModal ─────────────────────────────────────────────────────

interface CreateModalProps {
  onClose: () => void;
  defaultName: string;
}

function CreateCharacterModal({ onClose, defaultName }: CreateModalProps) {
  const createMutation = useCreateCharacter();
  const router = useRouter();

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const handleCreate = async () => {
    if (createMutation.isPending) return;
    const char = await createMutation.mutateAsync({ name: defaultName });
    router.push(`/character/${char.characterId}/build`);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-modal-title"
        className="w-full max-w-md rounded-2xl border border-slate-700/60 bg-[#0a100d] shadow-2xl flex flex-col"
        style={{
          boxShadow:
            "0 0 60px rgba(87,115,153,0.15), 0 24px 48px rgba(0,0,0,0.6)",
        }}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700/40">
          <h2
            id="create-modal-title"
            className="font-serif text-xl font-semibold text-[#f7f7ff]"
          >
            New Character
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-parchment-600 hover:text-parchment-400 text-2xl leading-none transition-colors ml-4 focus:outline-none focus:ring-2 focus:ring-[#577399] rounded"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="px-6 py-6 space-y-4">
          <p className="text-base text-parchment-500 leading-relaxed">
            Ready to create a new character? You&apos;ll choose your class,
            heritage, equipment, and name in the builder.
          </p>
          {createMutation.isError && (
            <div
              role="alert"
              className="rounded-lg border border-[#fe5f55]/40 bg-[#fe5f55]/10 px-4 py-3"
            >
              <p className="text-sm text-[#fe5f55]">
                {createMutation.error?.message ??
                  "Failed to create character. Please try again."}
              </p>
            </div>
          )}
        </div>

        <div className="border-t border-slate-700/40 px-6 py-4 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-4 py-2.5 text-base font-medium border border-slate-700/60 text-parchment-500 hover:border-slate-600 hover:text-parchment-400 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleCreate}
            disabled={createMutation.isPending}
            className="rounded-lg px-6 py-2.5 font-semibold text-base bg-[#577399] text-[#f7f7ff] hover:bg-[#577399]/80 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm"
          >
            {createMutation.isPending ? (
              <span className="flex items-center gap-2">
                <span className="h-3.5 w-3.5 animate-spin rounded-full border border-[#f7f7ff] border-t-transparent" />
                Creating...
              </span>
            ) : (
              "Continue to Builder"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const router = useRouter();
  const {
    isAuthenticated,
    isLoading: authLoading,
    isReady,
    user,
    signOut,
  } = useAuthStore();
  const {
    data: characterData,
    isLoading: charsLoading,
    isError: charsError,
  } = useCharacters();
  const { data: campaignList = [] } = useCampaigns();
  const deleteMutation = useDeleteCharacter();
  const { hasUnlimitedCharacters, needsPatreon } = usePatreonGate();
  const { startOAuth, isLinking } = usePatreonOAuth();
  const [showCreate, setShowCreate] = useState(false);

  const [searchSort, setSearchSort] = useState<SearchSortState>({
    query: "",
    sortKey: "updatedAt",
  });

  // Auth guard
  useEffect(() => {
    if (isReady && !isAuthenticated) {
      router.replace("/auth/login");
    }
  }, [isReady, isAuthenticated, router]);

  // Derived: filtered + sorted characters
  const allChars = characterData?.characters ?? [];
  const filteredAndSorted = useMemo(() => {
    const q = searchSort.query.toLowerCase().trim();
    const filtered = q
      ? allChars.filter(
          (c) =>
            c.name.toLowerCase().includes(q) ||
            c.className.toLowerCase().includes(q) ||
            (c.subclassName ?? "").toLowerCase().includes(q),
        )
      : allChars;
    return sortCharacters(filtered, searchSort.sortKey);
  }, [allChars, searchSort]);

  // Whether to show the World Lore section:
  // visible if the user has "Curses! Content" enabled in their preferences,
  // OR if they have at least one character in a campaign that has cursesContentEnabled.
  const showLorePanel = useMemo(() => {
    if (user?.preferences?.cursesEnabled === true) return true;
    const campaignMap = new Map(campaignList.map((c) => [c.campaignId, c]));
    return allChars.some(
      (char) =>
        char.campaignId != null &&
        campaignMap.get(char.campaignId)?.cursesContentEnabled === true,
    );
  }, [user, allChars, campaignList]);

  // Most recently updated campaign for session panel
  const topCampaign: CampaignSummary | null = useMemo(() => {
    if (!campaignList.length) return null;
    return (
      [...campaignList].sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      )[0] ?? null
    );
  }, [campaignList]);

  if (!isReady || authLoading || !isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a100d]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#577399] border-t-transparent" />
      </div>
    );
  }

  const characterCount = allChars.length;
  const isLoading = charsLoading || authLoading;
  const atCharacterLimit =
    !hasUnlimitedCharacters && characterCount >= FREE_CHARACTER_LIMIT;

  const handlePatreonLink = () => {
    startOAuth();
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#0a100d] relative">
      {/* ── Top bar ─────────────────────────────────────────────────────── */}
      <AppHeader />

      {/* ── Page body ───────────────────────────────────────────────────── */}
      <div
        className="relative z-[1] flex-1 bg-[#0a100d] py-8"
        style={{
          background:
            "radial-gradient(100vw 80vw at center, rgba(0,0,0,0) 0%, rgba(0,0,0,0.05) 40%, rgba(0,0,0,0.35) 75%, rgba(0, 0, 0, .5) 100%), #0a100d;",
        }}
      >
        <div className="mx-auto max-w-[1200px] px-4 flex gap-8 items-start">
          {/* ── Main column ─────────────────────────────────────────────── */}
          <main className="flex-1 min-w-0 space-y-10">
            {/* Characters section */}
            <section aria-labelledby="chars-heading">
              {/* Section header */}
              <div className="mb-5 flex items-end justify-between gap-4">
                <div>
                  <h1
                    id="chars-heading"
                    className="font-serif text-3xl font-semibold text-[#f7f7ff]"
                  >
                    Your Characters
                  </h1>
                  {!isLoading && (
                    <p className="mt-1 text-sm text-parchment-600">
                      {hasUnlimitedCharacters
                        ? `${characterCount} character${characterCount !== 1 ? "s" : ""}`
                        : `${characterCount} / ${FREE_CHARACTER_LIMIT} characters`}
                    </p>
                  )}
                </div>
                {/* Desktop CTA */}
                {atCharacterLimit ? (
                  <div className="hidden sm:flex flex-col items-end gap-1.5 shrink-0">
                    <span className="text-xs text-parchment-600">
                      Character limit reached
                    </span>
                    <button
                      onClick={handlePatreonLink}
                      disabled={isLinking}
                      className="
                        inline-flex items-center gap-1.5
                        rounded-xl border border-[#f96854]/50 bg-[#f96854]/10
                        px-4 py-2 text-sm font-semibold text-[#f96854]
                        hover:bg-[#f96854]/20 hover:border-[#f96854]
                        transition-all duration-150
                        focus:outline-none focus:ring-2 focus:ring-[#f96854] focus:ring-offset-2 focus:ring-offset-slate-900
                        disabled:opacity-60 disabled:cursor-wait
                      "
                    >
                      {isLinking
                        ? "Connecting..."
                        : "Join FREE Patreon for Unlimited"}
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowCreate(true)}
                    className="
                    hidden sm:flex items-center gap-2
                    rounded-xl border border-[#577399]/60 bg-[#577399]/10
                    px-5 py-2.5 font-semibold text-base text-[#577399]
                    hover:bg-[#577399]/20 hover:border-[#577399]
                    transition-all duration-150 shadow-sm shrink-0
                    focus:outline-none focus:ring-2 focus:ring-[#577399] focus:ring-offset-2 focus:ring-offset-slate-900
                  "
                  >
                    <span aria-hidden="true">+</span>
                    New Character
                  </button>
                )}
              </div>

              {/* Search + sort bar */}
              {!isLoading && !charsError && characterCount > 0 && (
                <div className="mb-5">
                  <CharacterSearchSortBar
                    state={searchSort}
                    onChange={setSearchSort}
                    totalCount={characterCount}
                    filteredCount={filteredAndSorted.length}
                    onNewCharacter={
                      atCharacterLimit
                        ? handlePatreonLink
                        : () => setShowCreate(true)
                    }
                  />
                </div>
              )}

              {/* Loading */}
              {isLoading && (
                <div className="flex items-center justify-center py-20">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#577399] border-t-transparent" />
                </div>
              )}

              {/* Error */}
              {charsError && !isLoading && (
                <div className="rounded-xl border border-[#fe5f55]/30 bg-slate-900/80 p-8 text-center">
                  <p className="text-[#fe5f55]/70">
                    Failed to load characters.
                  </p>
                </div>
              )}

              {/* Empty state */}
              {!isLoading && !charsError && characterCount === 0 && (
                <div
                  className="rounded-2xl border border-dashed border-slate-700/60 p-16 text-center space-y-5"
                  style={{ background: "rgba(87,115,153,0.03)" }}
                >
                  <div
                    className="text-5xl opacity-15 select-none"
                    aria-hidden="true"
                  >
                    ⚔️
                  </div>
                  <div className="space-y-2">
                    <p className="font-serif text-xl text-[#f7f7ff]/70">
                      No characters yet
                    </p>
                    <p className="text-base text-parchment-600 max-w-xs mx-auto leading-relaxed">
                      Create your first Daggerheart character and begin your
                      adventure.
                    </p>
                  </div>
                  <button
                    onClick={() => setShowCreate(true)}
                    className="
                      mt-2 inline-flex items-center gap-2 rounded-xl
                      border border-[#577399]/60 bg-[#577399]/10
                      px-7 py-3 text-base font-semibold text-[#577399]
                      hover:bg-[#577399]/20 hover:border-[#577399]
                      transition-all duration-150
                      focus:outline-none focus:ring-2 focus:ring-[#577399] focus:ring-offset-2 focus:ring-offset-slate-900
                    "
                  >
                    <span aria-hidden="true">+</span> Create Your First
                    Character
                  </button>
                </div>
              )}

              {/* Empty filter state */}
              {!isLoading &&
                !charsError &&
                characterCount > 0 &&
                filteredAndSorted.length === 0 && (
                  <div className="rounded-xl border border-slate-700/40 bg-slate-900/40 p-8 text-center space-y-3">
                    <p className="text-parchment-500">
                      No characters matching &ldquo;{searchSort.query}&rdquo;
                    </p>
                    <button
                      onClick={() =>
                        setSearchSort((s) => ({ ...s, query: "" }))
                      }
                      className="text-xs text-[#577399] hover:underline"
                    >
                      Clear search
                    </button>
                  </div>
                )}

              {/* Character grid */}
              {!isLoading && !charsError && filteredAndSorted.length > 0 && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {filteredAndSorted.map((char) => (
                    <CharacterCard
                      key={char.characterId}
                      character={char}
                      onOpen={() =>
                        router.push(`/character/${char.characterId}`)
                      }
                      onEdit={() =>
                        router.push(`/character/${char.characterId}/build`)
                      }
                      onDelete={() => deleteMutation.mutate(char.characterId)}
                      isDeleting={
                        deleteMutation.isPending &&
                        deleteMutation.variables === char.characterId
                      }
                    />
                  ))}
                </div>
              )}
            </section>

            {/* ── Mobile-only rail panels ───────────────────────────────── */}
            <div className="xl:hidden space-y-4">
              {user && (
                <ProfileCard
                  user={user}
                  onSignOut={() =>
                    signOut().then(() => router.replace("/auth/login"))
                  }
                />
              )}
              <PatreonPaidGate>
                <div className="space-y-4">
                  {campaignList.length > 0 && (
                    <CampaignRailWidget campaigns={campaignList} />
                  )}
                  <SessionPanel campaign={topCampaign} />
                </div>
              </PatreonPaidGate>
              {showLorePanel && <LorePanel />}
            </div>
          </main>

          {/* ── Right rail (xl+) ─────────────────────────────────────────── */}
          <aside
            className="w-80 shrink-0 hidden xl:block sticky top-[72px] space-y-4"
            aria-label="Dashboard sidebar"
          >
            {user && (
              <ProfileCard
                user={user}
                onSignOut={() =>
                  signOut().then(() => router.replace("/auth/login"))
                }
              />
            )}
            <PatreonPaidGate>
              <div className="space-y-4">
                {campaignList.length > 0 && (
                  <CampaignRailWidget campaigns={campaignList} />
                )}
                <SessionPanel campaign={topCampaign} />
              </div>
            </PatreonPaidGate>
            {showLorePanel && <LorePanel />}
          </aside>
        </div>
      </div>

      {/* ── Create character modal ───────────────────────────────────────── */}
      {showCreate && (
        <CreateCharacterModal
          onClose={() => setShowCreate(false)}
          defaultName={`${user?.displayName ?? "New"}'s Character ${characterCount + 1}`}
        />
      )}

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <Footer />
    </div>
  );
}
