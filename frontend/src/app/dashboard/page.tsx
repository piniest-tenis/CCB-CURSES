"use client";

/**
 * src/app/dashboard/page.tsx
 *
 * Protected dashboard page. Shows user's character list with create button.
 * Redirects to /auth/login if not authenticated.
 */

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { useCharacters, useCreateCharacter, useDeleteCharacter } from "@/hooks/useCharacter";
import type { CharacterSummary } from "@shared/types";
import { useClasses } from "@/hooks/useGameData";

// ---------------------------------------------------------------------------
// Character card
// ---------------------------------------------------------------------------

interface CharacterCardProps {
  character: CharacterSummary;
  onOpen: () => void;
  onDelete: () => void;
  isDeleting: boolean;
}

function CharacterCard({
  character,
  onOpen,
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
        group relative rounded-xl border border-burgundy-900 bg-slate-900/80
        p-5 shadow-card-fantasy hover:shadow-card-fantasy-hover
        hover:border-burgundy-700 transition-all duration-200
        flex flex-col gap-3
      "
    >
      {/* Avatar / placeholder */}
      <div className="flex items-start gap-4">
        <div
          className="
            h-14 w-14 shrink-0 rounded-full
            border-2 border-burgundy-700 bg-slate-850
            flex items-center justify-center
            text-2xl font-bold text-parchment-500 uppercase select-none
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
          <h3 className="font-serif text-lg font-semibold text-parchment-100 truncate">
            {character.name}
          </h3>
          <p className="text-sm text-parchment-400">
            {character.className}
            {character.subclassName && (
              <span className="text-parchment-600"> · {character.subclassName}</span>
            )}
          </p>
          <p className="text-xs text-parchment-600 mt-0.5">
            Level {character.level} · Updated {updatedDate}
          </p>
        </div>

        <span
          className="
            shrink-0 rounded-full border border-gold-800 bg-gold-950/30
            px-2.5 py-0.5 text-xs font-bold text-gold-400
          "
        >
          Lv {character.level}
        </span>
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        <button
          onClick={onOpen}
          className="
            flex-1 rounded-lg py-2 text-sm font-semibold
            bg-burgundy-800 text-parchment-100 hover:bg-burgundy-700
            transition-colors shadow-sm
          "
        >
          Open Sheet
        </button>

        {confirmDelete ? (
          <div className="flex gap-1">
            <button
              onClick={() => {
                onDelete();
                setConfirmDelete(false);
              }}
              disabled={isDeleting}
              className="
                rounded-lg px-3 py-2 text-xs font-semibold
                bg-burgundy-900 text-burgundy-300 hover:bg-burgundy-800
                disabled:opacity-50 transition-colors
              "
            >
              {isDeleting ? "…" : "Confirm"}
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              className="
                rounded-lg px-3 py-2 text-xs
                bg-slate-800 text-parchment-500 hover:bg-slate-700
                transition-colors
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
              border border-burgundy-900 text-parchment-600
              hover:border-burgundy-700 hover:text-parchment-400
              transition-colors
            "
            aria-label="Delete character"
          >
            Delete
          </button>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Create character modal (simplified inline form)
// ---------------------------------------------------------------------------

interface CreateModalProps {
  onClose: () => void;
}

function CreateCharacterModal({ onClose }: CreateModalProps) {
  const [name, setName] = useState("");
  const [classId, setClassId] = useState("");
  const createMutation = useCreateCharacter();
  const { data: classesData, isLoading: classesLoading, isError: classesError } = useClasses();
  const router = useRouter();

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !classId) return;
    const char = await createMutation.mutateAsync({ name: name.trim(), classId });
    router.push(`/character/${char.characterId}`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl border border-burgundy-800 bg-slate-900 p-6 shadow-card-fantasy-hover">
        <h2 className="mb-4 font-serif text-xl font-semibold text-parchment-100">
          New Character
        </h2>
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-parchment-500">
              Character Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter name…"
              maxLength={60}
              required
              className="
                w-full rounded border border-burgundy-800 bg-slate-850
                px-3 py-2 text-parchment-200 placeholder-parchment-700
                focus:outline-none focus:border-gold-500
              "
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-parchment-500">
              Class
            </label>
            {classesError ? (
              <p className="text-xs text-burgundy-400">
                Failed to load classes. Please close and try again.
              </p>
            ) : (
              <select
                value={classId}
                onChange={(e) => setClassId(e.target.value)}
                required
                disabled={classesLoading}
                className="
                  w-full rounded border border-burgundy-800 bg-slate-850
                  px-3 py-2 text-parchment-200 focus:outline-none focus:border-gold-500
                  disabled:opacity-50
                "
              >
                <option value="">
                  {classesLoading ? "Loading classes…" : "Select a class…"}
                </option>
                {classesData?.classes.map((c) => (
                  <option key={c.classId} value={c.classId}>
                    {c.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {createMutation.isError && (
            <p className="text-xs text-burgundy-400">
              {createMutation.error?.message ?? "Failed to create character."}
            </p>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={createMutation.isPending || !name.trim() || !classId}
              className="
                flex-1 rounded-lg py-2.5 font-semibold text-sm
                bg-burgundy-700 text-parchment-100 hover:bg-burgundy-600
                disabled:opacity-50 disabled:cursor-not-allowed transition-colors
              "
            >
              {createMutation.isPending ? "Creating…" : "Create Character"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="
                rounded-lg px-4 py-2.5 text-sm
                bg-slate-800 text-parchment-400 hover:bg-slate-700 transition-colors
              "
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function DashboardPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading, user } = useAuthStore();
  const { data, isLoading, isError } = useCharacters();
  const deleteMutation = useDeleteCharacter();
  const [showCreate, setShowCreate] = useState(false);

  // Redirect if not authenticated — must be in useEffect to avoid SSR location errors
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace("/auth/login");
    }
  }, [authLoading, isAuthenticated, router]);

  // Don't render content while auth is resolving or redirect is pending
  if (authLoading || !isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-burgundy-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Top bar */}
      <header className="border-b border-burgundy-900/50 bg-slate-900/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <h1 className="font-serif text-xl font-bold text-parchment-100">
            Daggerheart
          </h1>
          {user && (
            <span className="text-sm text-parchment-500">
              {user.displayName || user.email}
            </span>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">
        {/* Page header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="font-serif text-2xl font-semibold text-parchment-100">
              Your Characters
            </h2>
            <p className="mt-0.5 text-sm text-parchment-500">
              {data?.characters.length ?? 0} character
              {(data?.characters.length ?? 0) !== 1 ? "s" : ""}
            </p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="
              rounded-lg border border-gold-700 bg-gold-900/20 px-5 py-2.5
              font-semibold text-sm text-gold-300
              hover:bg-gold-900/40 hover:border-gold-600 transition-colors
              shadow-glow-gold
            "
          >
            + New Character
          </button>
        </div>

        {/* Loading */}
        {(isLoading || authLoading) && (
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-burgundy-500 border-t-transparent" />
          </div>
        )}

        {/* Error */}
        {isError && !isLoading && (
          <div className="rounded-xl border border-burgundy-700 bg-slate-900 p-8 text-center">
            <p className="text-burgundy-300">Failed to load characters.</p>
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !isError && data?.characters.length === 0 && (
          <div className="rounded-xl border border-dashed border-burgundy-900 p-12 text-center">
            <p className="font-serif text-lg text-parchment-400">
              No characters yet
            </p>
            <p className="mt-1 text-sm text-parchment-600">
              Create your first Daggerheart character to get started.
            </p>
            <button
              onClick={() => setShowCreate(true)}
              className="
                mt-4 rounded-lg border border-burgundy-700 bg-burgundy-800/40
                px-6 py-2.5 text-sm font-semibold text-parchment-200
                hover:bg-burgundy-700 transition-colors
              "
            >
              Create Character
            </button>
          </div>
        )}

        {/* Character grid */}
        {!isLoading && !isError && data && data.characters.length > 0 && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.characters.map((char) => (
              <CharacterCard
                key={char.characterId}
                character={char}
                onOpen={() => router.push(`/character/${char.characterId}`)}
                onDelete={() => deleteMutation.mutate(char.characterId)}
                isDeleting={
                  deleteMutation.isPending &&
                  deleteMutation.variables === char.characterId
                }
              />
            ))}
          </div>
        )}
      </main>

      {/* Create modal */}
      {showCreate && (
        <CreateCharacterModal onClose={() => setShowCreate(false)} />
      )}
    </div>
  );
}
