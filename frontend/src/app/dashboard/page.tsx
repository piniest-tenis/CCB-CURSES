"use client";

/**
 * src/app/dashboard/page.tsx
 *
 * Protected dashboard page. Shows user's character list with create button.
 * Redirects to /auth/login if not authenticated.
 *
 * "New Character" opens a simple name prompt, creates a minimal character,
 * and navigates directly to the 9-step character builder.
 */

import React, { useState, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuthStore } from "@/store/authStore";
import { useCharacters, useCreateCharacter, useDeleteCharacter } from "@/hooks/useCharacter";
import { useCampaignDetail } from "@/hooks/useCampaigns";
import type { CharacterSummary } from "@shared/types";

// ---------------------------------------------------------------------------
// Color palette constants (matching the design system)
// ---------------------------------------------------------------------------
// #0a100d — deep forest black-green (primary bg)
// #b9baa3 — weathered parchment neutral (surfaces)
// #577399 — steel-blue accent
// #f7f7ff — soft moonlight white
// #fe5f55 — ember red

// ---------------------------------------------------------------------------
// Character card
// ---------------------------------------------------------------------------

interface CharacterCardProps {
  character: CharacterSummary;
  onOpen: () => void;
  onEdit: () => void;
  onDelete: () => void;
  isDeleting: boolean;
}

function CharacterCard({
  character,
  onOpen,
  onEdit,
  onDelete,
  isDeleting,
}: CharacterCardProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  const updatedDate = new Date(character.updatedAt).toLocaleDateString(
    undefined,
    { year: "numeric", month: "short", day: "numeric" }
  );

  return (
    <div
      className="
        group relative rounded-xl border border-[#577399]/30 bg-slate-900/80
        p-5 shadow-card-fantasy hover:shadow-card-fantasy-hover
        hover:border-[#577399]/60 transition-all duration-200
        flex flex-col gap-3
      "
    >
      {/* Avatar / placeholder */}
      <div className="flex items-start gap-4">
        <div
          className="
            h-14 w-14 shrink-0 rounded-full
            border-2 border-[#577399]/50 bg-slate-850
            flex items-center justify-center
            text-2xl font-bold text-[#b9baa3] uppercase select-none
          "
        >
          {character.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={character.avatarUrl}
              alt={character.name}
              className="h-full w-full rounded-full object-cover"
            />
          ) : (
            character.name.charAt(0)
          )}
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="font-serif text-lg font-semibold text-[#f7f7ff] truncate">
            {character.name}
          </h3>
          <p className="text-sm text-[#b9baa3]">
            {character.className}
            {character.subclassName && (
              <span className="text-[#b9baa3]/60"> · {character.subclassName}</span>
            )}
          </p>
          {(character.ancestryName || character.communityName) && (
            <p className="text-xs text-[#b9baa3]/50 mt-0.5">
              {[character.ancestryName, character.communityName].filter(Boolean).join(" · ")}
            </p>
          )}
          <p className="text-xs text-[#b9baa3]/40 mt-0.5">
            Level {character.level} · Updated {updatedDate}
          </p>
        </div>

        <span
          className="
            shrink-0 rounded-full border border-[#577399]/50 bg-[#577399]/10
            px-2.5 py-0.5 text-xs font-bold text-[#577399]
          "
        >
          Lv {character.level}
        </span>
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        <button
          onClick={onOpen}
          aria-label={`Open character sheet for ${character.name}`}
          className="
            flex-1 rounded-lg py-2 text-base font-semibold
            bg-[#577399] text-[#f7f7ff] hover:bg-[#577399]/80
            transition-colors shadow-sm
            focus:outline-none focus:ring-2 focus:ring-[#577399] focus:ring-offset-2 focus:ring-offset-slate-900
          "
        >
          Open Sheet
        </button>

        <button
          onClick={onEdit}
          aria-label={`Edit ${character.name}`}
          className="
            rounded-lg px-3 py-2 text-base font-semibold
            border border-gold-800/60 bg-gold-950/20 text-gold-300
            hover:bg-gold-900/30 hover:border-gold-700
            transition-colors
            focus:outline-none focus:ring-2 focus:ring-gold-500
          "
        >
          Edit
        </button>

        {confirmDelete ? (
          <div className="flex gap-1">
            <button
              onClick={() => {
                onDelete();
                setConfirmDelete(false);
              }}
              disabled={isDeleting}
              aria-label={`Confirm delete ${character.name}`}
              className="
                rounded-lg px-3 py-2 text-xs font-semibold
                bg-[#fe5f55]/20 text-[#fe5f55] hover:bg-[#fe5f55]/30
                disabled:opacity-50 transition-colors
                focus:outline-none focus:ring-2 focus:ring-[#fe5f55]
              "
            >
              {isDeleting ? "…" : "Confirm"}
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              aria-label="Cancel delete"
              className="
                rounded-lg px-3 py-2 text-xs
                bg-slate-800 text-[#b9baa3]/60 hover:bg-slate-700
                transition-colors
                focus:outline-none focus:ring-2 focus:ring-slate-500
              "
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmDelete(true)}
            className="
              rounded-lg px-3 py-2 text-xs
              border border-slate-700 text-[#b9baa3]/50
              hover:border-[#fe5f55]/50 hover:text-[#fe5f55]/70
              transition-colors
              focus:outline-none focus:ring-2 focus:ring-[#fe5f55]/50
            "
            aria-label={`Delete ${character.name}`}
          >
            Delete
          </button>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Campaign section — shows fellow party members for campaigns your characters
// belong to, with a link to the full campaign detail page.
// ---------------------------------------------------------------------------

interface CampaignSectionCardProps {
  campaignId: string;
  myCharacterIds: Set<string>;
}

function CampaignSectionCard({ campaignId, myCharacterIds }: CampaignSectionCardProps) {
  const { data: campaign, isLoading } = useCampaignDetail(campaignId);

  if (isLoading) {
    return (
      <div className="rounded-xl border border-slate-700/30 bg-slate-900/40 p-5 space-y-3 animate-pulse">
        <div className="h-5 w-40 rounded bg-slate-700/60" />
        <div className="h-3 w-64 rounded bg-slate-700/40" />
      </div>
    );
  }

  if (!campaign) return null;

  const otherCharacters = campaign.characters.filter(
    (c) => !myCharacterIds.has(c.characterId)
  );

  const scheduleText = (() => {
    const s = campaign.schedule;
    if (!s || s.slots.length === 0) return null;
    const freq = s.frequency === "weekly" ? "Weekly" : s.frequency === "biweekly" ? "Biweekly" : "Monthly";
    const slotLabels = s.slots.map((slot) => {
      const day = slot.day.charAt(0).toUpperCase() + slot.day.slice(1);
      const time = slot.time ? ` at ${slot.time}${slot.timezone ? ` ${slot.timezone.split("/")[1]?.replace(/_/g, " ") ?? ""}` : ""}` : "";
      return `${day}${time}`;
    });
    return `${freq} · ${slotLabels.join(", ")}`;
  })();

  return (
    <div className="rounded-xl border border-[#577399]/20 bg-slate-900/50 p-5 space-y-4">
      {/* Campaign header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Link
            href={`/campaigns/${campaignId}`}
            className="font-serif text-lg font-semibold text-[#f7f7ff] hover:text-[#daa520] transition-colors truncate block"
          >
            {campaign.name}
          </Link>
          {campaign.description && (
            <p className="text-sm text-[#b9baa3]/50 mt-0.5 line-clamp-2">
              {campaign.description}
            </p>
          )}
          {scheduleText && (
            <p className="text-xs text-[#577399]/70 mt-1 flex items-center gap-1.5">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3 shrink-0">
                <path fillRule="evenodd" d="M4 1.75a.75.75 0 0 1 1.5 0V3h5V1.75a.75.75 0 0 1 1.5 0V3A2 2 0 0 1 14 5v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2V1.75Zm-.5 5.5A.75.75 0 0 1 4.25 6.5h7.5a.75.75 0 0 1 0 1.5h-7.5A.75.75 0 0 1 3.5 7.25Z" clipRule="evenodd" />
              </svg>
              {scheduleText}
            </p>
          )}
        </div>
        <Link
          href={`/campaigns/${campaignId}`}
          className="shrink-0 text-xs text-[#577399]/60 hover:text-[#577399] border border-[#577399]/20 hover:border-[#577399]/50 rounded px-2 py-1 transition-colors whitespace-nowrap"
        >
          View →
        </Link>
      </div>

      {/* Other party members */}
      {otherCharacters.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[#b9baa3]/40 mb-2">
            Party Members
          </p>
          <div className="space-y-2">
            {otherCharacters.map((c) => (
              <div
                key={c.characterId}
                className="flex items-center gap-2.5 rounded-lg border border-slate-700/30 bg-slate-800/30 px-3 py-2"
              >
                {c.portraitUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={c.portraitUrl}
                    alt={c.name}
                    className="h-7 w-7 rounded-full object-cover border border-slate-700/60 shrink-0"
                  />
                ) : (
                  <div className="h-7 w-7 rounded-full bg-slate-700/60 border border-slate-700/40 flex items-center justify-center text-xs font-semibold text-[#b9baa3]/60 shrink-0">
                    {c.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[#f7f7ff] truncate">{c.name}</p>
                  <p className="text-xs text-[#b9baa3]/40 truncate">
                    {c.className} · Lv {c.level}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {otherCharacters.length === 0 && (
        <p className="text-sm text-[#b9baa3]/30 italic">No other characters in this campaign yet.</p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Create character modal — name-only prompt
// ---------------------------------------------------------------------------

interface CreateModalProps {
  onClose: () => void;
}

function CreateCharacterModal({ onClose }: CreateModalProps) {
  const [name, setName] = useState("");
  const createMutation = useCreateCharacter();
  const router = useRouter();

  // Close on Escape key
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const canCreate = Boolean(name.trim());

  const handleCreate = async () => {
    if (!canCreate || createMutation.isPending) return;
    const char = await createMutation.mutateAsync({
      name: name.trim(),
    });
    router.push(`/character/${char.characterId}/build`);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleCreate();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
      role="presentation"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-modal-title"
        className="
          w-full max-w-md rounded-2xl border border-slate-700/60
          bg-[#0a100d] shadow-2xl flex flex-col
        "
        style={{ boxShadow: "0 0 60px rgba(87,115,153,0.15), 0 24px 48px rgba(0,0,0,0.6)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700/40">
          <h2 id="create-modal-title" className="font-serif text-xl font-semibold text-[#f7f7ff]">
            New Character
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-[#b9baa3]/40 hover:text-[#b9baa3] text-2xl leading-none transition-colors ml-4 focus:outline-none focus:ring-2 focus:ring-[#577399] rounded"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-6 space-y-4">
          <p className="text-base text-[#b9baa3]/60 leading-relaxed">
            Name your character to begin. You&apos;ll choose your class, heritage, and equipment next.
          </p>

          <div>
            <label
              htmlFor="char-name"
              className="block text-xs font-semibold uppercase tracking-widest text-[#b9baa3]/50 mb-1.5"
            >
              Character Name <span className="text-[#fe5f55]">*</span>
            </label>
            <input
              id="char-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Enter a name..."
              maxLength={60}
              autoFocus
              className="
                w-full rounded-lg border border-slate-700/60 bg-slate-900
                px-3 py-2.5 font-serif text-base text-[#f7f7ff]
                placeholder-[#b9baa3]/30
                focus:outline-none focus:border-[#577399] transition-colors
              "
            />
          </div>

          {createMutation.isError && (
            <div
              role="alert"
              className="rounded-lg border border-[#fe5f55]/40 bg-[#fe5f55]/10 px-4 py-3"
            >
              <p className="text-sm text-[#fe5f55]">
                {createMutation.error?.message ?? "Failed to create character. Please try again."}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-700/40 px-6 py-4 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="
              rounded-lg px-4 py-2.5 text-base font-medium
              border border-slate-700/60 text-[#b9baa3]/60
              hover:border-slate-600 hover:text-[#b9baa3]
              transition-colors
            "
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleCreate}
            disabled={!canCreate || createMutation.isPending}
            className="
              rounded-lg px-6 py-2.5 font-semibold text-base
              bg-[#577399] text-[#f7f7ff]
              hover:bg-[#577399]/80
              disabled:opacity-40 disabled:cursor-not-allowed
              transition-colors shadow-sm
            "
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

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function DashboardPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading, isReady, user, signOut } = useAuthStore();
  const { data, isLoading, isError } = useCharacters();
  const deleteMutation = useDeleteCharacter();
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    if (isReady && !isAuthenticated) {
      router.replace("/auth/login");
    }
  }, [isReady, isAuthenticated, router]);

  // Collect unique campaign IDs from user's characters
  const campaignIds = useMemo(() => {
    const chars = data?.characters ?? [];
    const ids = new Set<string>();
    for (const c of chars) {
      if (c.campaignId) ids.add(c.campaignId);
    }
    return Array.from(ids);
  }, [data]);

  // Set of the user's own character IDs (to exclude from "party members")
  const myCharacterIds = useMemo(() => {
    const chars = data?.characters ?? [];
    return new Set(chars.map((c) => c.characterId));
  }, [data]);

  if (!isReady || authLoading || !isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a100d]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#577399] border-t-transparent" />
      </div>
    );
  }

  const characterCount = data?.characters.length ?? 0;

  return (
    <div className="min-h-screen bg-[#0a100d]">
      {/* Top bar */}
      <header
        className="border-b border-slate-800/60 sticky top-0 z-10 backdrop-blur-sm"
        style={{ backgroundColor: "rgba(10,16,13,0.90)" }}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-6">
            <Image
              src="/images/curses-isolated-logo.png"
              alt="Curses! Custom Character Builder"
              width={140}
              height={40}
              className="object-contain"
              priority
            />
            <nav aria-label="Main navigation">
              <Link
                href="/campaigns"
                className="
                  rounded-lg border border-[#577399]/40 bg-[#577399]/10
                  px-3 py-1.5 text-sm font-semibold text-[#577399]
                  hover:bg-[#577399]/20 hover:border-[#577399]
                  transition-colors
                  focus:outline-none focus:ring-2 focus:ring-[#577399] focus:ring-offset-2 focus:ring-offset-slate-900
                "
              >
                Campaigns
              </Link>
            </nav>
          </div>
          {user && (
            <div className="flex items-center gap-3">
              <span className="text-sm text-[#b9baa3]/50">
                {user.displayName || user.email}
              </span>
              <button
                type="button"
                onClick={() => signOut().then(() => router.replace("/auth/login"))}
                className="
                  rounded px-2.5 py-1 text-xs font-medium
                  text-[#b9baa3]/50 border border-slate-700/60
                  hover:text-[#f7f7ff] hover:border-slate-600
                  transition-colors
                "
              >
                Sign out
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">
        {/* Page header */}
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <h2 className="font-serif text-3xl font-semibold text-[#f7f7ff]">
              Your Characters
            </h2>
            <p className="mt-1 text-sm text-[#b9baa3]/40">
              {characterCount} character{characterCount !== 1 ? "s" : ""}
            </p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="
              rounded-xl border border-[#577399]/60 bg-[#577399]/10
              px-5 py-2.5 font-semibold text-base text-[#577399]
              hover:bg-[#577399]/20 hover:border-[#577399]
              transition-all duration-150 shadow-sm
              flex items-center gap-2 shrink-0
            "
          >
            <span className="text-base leading-none">+</span>
            New Character
          </button>
        </div>

        {/* Loading */}
        {(isLoading || authLoading) && (
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#577399] border-t-transparent" />
          </div>
        )}

        {/* Error */}
        {isError && !isLoading && (
          <div className="rounded-xl border border-[#fe5f55]/30 bg-slate-900/80 p-8 text-center">
            <p className="text-[#fe5f55]/70">Failed to load characters.</p>
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !isError && characterCount === 0 && (
          <div
            className="
              rounded-2xl border border-dashed border-slate-700/60
              p-16 text-center space-y-5
            "
            style={{ background: "rgba(87,115,153,0.03)" }}
          >
            <div className="text-5xl opacity-15 select-none">⚔️</div>
            <div className="space-y-2">
              <p className="font-serif text-xl text-[#f7f7ff]/70">
                No characters yet
              </p>
               <p className="text-base text-[#b9baa3]/40 max-w-xs mx-auto leading-relaxed">
                Create your first Daggerheart character and begin your adventure.
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
              "
            >
              <span>+</span> Create Your First Character
            </button>
          </div>
        )}

        {/* Character grid */}
        {!isLoading && !isError && characterCount > 0 && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data!.characters.map((char) => (
              <CharacterCard
                key={char.characterId}
                character={char}
                onOpen={() => router.push(`/character/${char.characterId}`)}
                onEdit={() => router.push(`/character/${char.characterId}/build`)}
                onDelete={() => deleteMutation.mutate(char.characterId)}
                isDeleting={
                  deleteMutation.isPending &&
                  deleteMutation.variables === char.characterId
                }
              />
            ))}
          </div>
        )}

        {/* Campaign section — only shown when at least one character is in a campaign */}
        {!isLoading && !isError && campaignIds.length > 0 && (
          <section aria-label="Your campaigns" className="mt-12">
            <div className="mb-5 flex items-end justify-between gap-4">
              <div>
                <h2 className="font-serif text-2xl font-semibold text-[#f7f7ff]">
                  Active Campaigns
                </h2>
                <p className="mt-1 text-sm text-[#b9baa3]/40">
                  Campaigns your characters are part of
                </p>
              </div>
              <Link
                href="/campaigns"
                className="text-xs text-[#577399]/70 hover:text-[#577399] transition-colors"
              >
                All campaigns →
              </Link>
            </div>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {campaignIds.map((id) => (
                <CampaignSectionCard
                  key={id}
                  campaignId={id}
                  myCharacterIds={myCharacterIds}
                />
              ))}
            </div>
          </section>
        )}
      </main>

      {/* Create modal */}
      {showCreate && (
        <CreateCharacterModal onClose={() => setShowCreate(false)} />
      )}

      {/* Footer */}
      <footer className="mt-16 border-t border-slate-800/40 py-6">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4">
          <button
            type="button"
            onClick={() => alert("Then ask Josh in Discord, you nerd. You thought this would actually do something?")}
            className="text-xs text-[#b9baa3]/30 hover:text-[#b9baa3]/60 transition-colors"
          >
            Need Help?
          </button>
          <a
            href="https://maninjumpsuit.com"
            target="_blank"
            rel="noopener noreferrer"
            className="opacity-30 hover:opacity-60 transition-opacity"
          >
            <Image
              src="/images/man-in-jumpsuit-logo-white-transparent.png"
              alt="Man in Jumpsuit Productions"
              width={80}
              height={24}
              className="object-contain"
            />
          </a>
        </div>
      </footer>
    </div>
  );
}
