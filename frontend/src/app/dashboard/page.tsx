"use client";

/**
 * src/app/dashboard/page.tsx
 *
 * Protected dashboard page. Shows user's character list with create button.
 * Redirects to /auth/login if not authenticated.
 *
 * CreateCharacterModal is a 3-step wizard:
 *   Step 1 — Choose Class
 *   Step 2 — Heritage (name, ancestry, community)
 *   Step 3 — Define Experiences
 */

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuthStore } from "@/store/authStore";
import { useCharacters, useCreateCharacter, useDeleteCharacter } from "@/hooks/useCharacter";
import type { CharacterSummary, AncestryData, CommunityData } from "@shared/types";
import { useClasses, useClass, useAncestries, useCommunities } from "@/hooks/useGameData";
import type { SubclassData, NamedFeature } from "@shared/types";

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
          className="
            flex-1 rounded-lg py-2 text-sm font-semibold
            bg-[#577399] text-[#f7f7ff] hover:bg-[#577399]/80
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
                bg-[#fe5f55]/20 text-[#fe5f55] hover:bg-[#fe5f55]/30
                disabled:opacity-50 transition-colors
              "
            >
              {isDeleting ? "…" : "Confirm"}
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              className="
                rounded-lg px-3 py-2 text-xs
                bg-slate-800 text-[#b9baa3]/60 hover:bg-slate-700
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
              border border-slate-700 text-[#b9baa3]/50
              hover:border-[#fe5f55]/50 hover:text-[#fe5f55]/70
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
// Shared modal sub-components (used by ClassPreviewPanel)
// ---------------------------------------------------------------------------

const DOMAIN_COLOURS: Record<string, string> = {
  Artistry:  "border-purple-700  bg-purple-950/40  text-purple-300",
  Charm:     "border-pink-700    bg-pink-950/40    text-pink-300",
  Creature:  "border-green-700   bg-green-950/40   text-green-300",
  Faithful:  "border-yellow-700  bg-yellow-950/40  text-yellow-300",
  Oddity:    "border-teal-700    bg-teal-950/40    text-teal-300",
  Study:     "border-blue-700    bg-blue-950/40    text-blue-300",
  Thievery:  "border-orange-700  bg-orange-950/40  text-orange-300",
  Trickery:  "border-lime-700    bg-lime-950/40    text-lime-300",
  Valiance:  "border-red-700     bg-red-950/40     text-red-300",
  Violence:  "border-rose-800    bg-rose-950/40    text-rose-300",
  Weird:     "border-indigo-700  bg-indigo-950/40  text-indigo-300",
};

function ModalDomainBadge({ domain }: { domain: string }) {
  const colour =
    DOMAIN_COLOURS[domain] ??
    "border-[#577399]/50 bg-[#577399]/10 text-[#577399]";
  return (
    <span
      className={`inline-block rounded border px-2.5 py-0.5 text-sm font-medium ${colour}`}
    >
      {domain}
    </span>
  );
}

function ModalFeatureBlock({ name, description }: NamedFeature) {
  return (
    <div className="rounded-lg border border-slate-700/60 bg-slate-850/50 px-4 py-3">
      <p className="text-sm font-semibold text-[#f7f7ff]/90 mb-1">{name}</p>
      <p className="text-sm text-[#b9baa3]/70 leading-relaxed whitespace-pre-wrap">
        {description}
      </p>
    </div>
  );
}

function ModalSubclassPanel({ subclass }: { subclass: SubclassData }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-xl border border-slate-700/60 bg-slate-900/60">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-slate-850/30 transition-colors rounded-xl"
      >
        <div>
          <h4 className="font-serif text-base font-semibold text-[#f7f7ff]">
            {subclass.name}
          </h4>
          {subclass.description && (
            <p className="mt-0.5 text-xs text-[#b9baa3]/50 line-clamp-1">
              {subclass.description}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="hidden sm:block text-xs text-[#b9baa3]/40 uppercase tracking-wider">
            Spellcast: {subclass.spellcastTrait}
          </span>
          <span className="text-[#b9baa3]/40 text-lg leading-none select-none">
            {open ? "▲" : "▼"}
          </span>
        </div>
      </button>

      {open && (
        <div className="px-5 pb-5 space-y-4 border-t border-slate-700/30">
          {subclass.description && (
            <p className="pt-4 text-sm text-[#b9baa3]/60 italic">
              {subclass.description}
            </p>
          )}

          <p className="text-xs text-[#b9baa3]/40 uppercase tracking-wider pt-2">
            Spellcast Trait:{" "}
            <span className="text-[#b9baa3]/70 normal-case tracking-normal font-medium">
              {subclass.spellcastTrait}
            </span>
          </p>

          {subclass.foundationFeatures.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wider text-[#577399]">
                Foundation (Level 1)
              </p>
              <div className="space-y-2">
                {subclass.foundationFeatures.map((f) => (
                  <ModalFeatureBlock key={f.name} {...f} />
                ))}
              </div>
            </div>
          )}

          {subclass.specializationFeature && (
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wider text-[#577399]">
                Specialization (Level 3)
              </p>
              <ModalFeatureBlock {...subclass.specializationFeature} />
            </div>
          )}

          {subclass.masteryFeature && (
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wider text-[#577399]">
                Mastery (Level 5)
              </p>
              <ModalFeatureBlock {...subclass.masteryFeature} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Left-pane list row ──────────────────────────────────────────────────────

interface ClassListRowProps {
  classId: string;
  name: string;
  selected: boolean;
  onClick: () => void;
}

function ClassListRow({ classId, name, selected, onClick }: ClassListRowProps) {
  const { data: cls, isLoading: clsLoading } = useClass(classId);

  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        w-full text-left px-4 py-3 transition-colors
        ${
          selected
            ? "bg-[#577399]/20 border-l-2 border-[#577399]"
            : "border-l-2 border-transparent hover:bg-slate-800/60"
        }
      `}
    >
      <p className="text-sm font-semibold text-[#f7f7ff] leading-snug">
        {name}
      </p>
      <p className="text-xs italic text-[#b9baa3]/50 mt-0.5 line-clamp-2 leading-snug">
        {clsLoading ? (
          <span className="inline-block h-3 w-32 rounded bg-slate-700 animate-pulse align-middle" />
        ) : (
          cls?.mechanicalNotes || "\u00a0"
        )}
      </p>
    </button>
  );
}

// ── Right-pane class preview ────────────────────────────────────────────────

function ClassPreviewPanel({ classId }: { classId: string }) {
  const { data: cls, isLoading } = useClass(classId);

  if (isLoading || !cls) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#577399] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Name + mechanical notes blurb */}
      <div>
        <h3 className="font-serif text-2xl font-bold text-[#f7f7ff] mb-1">
          {cls.name}
        </h3>
        {cls.mechanicalNotes && (
          <p className="text-sm italic text-[#b9baa3]/60 leading-relaxed">
            {cls.mechanicalNotes}
          </p>
        )}
      </div>

      {/* Stats */}
      <div className="flex gap-4 text-sm">
        <div className="flex items-center gap-2">
          <span className="text-xs uppercase tracking-wider text-[#b9baa3]/50">
            Evasion
          </span>
          <span className="rounded border border-slate-700 bg-slate-900 px-2.5 py-0.5 font-bold text-[#f7f7ff]">
            {cls.startingEvasion}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs uppercase tracking-wider text-[#b9baa3]/50">
            Hit Points
          </span>
          <span className="rounded border border-slate-700 bg-slate-900 px-2.5 py-0.5 font-bold text-[#f7f7ff]">
            {cls.startingHitPoints}
          </span>
        </div>
      </div>

      {/* Domains */}
      {cls.domains.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {cls.domains.map((d) => (
            <ModalDomainBadge key={d} domain={d} />
          ))}
        </div>
      )}

      {/* Class Feature */}
      <section>
        <h2 className="mb-3 font-serif text-xl font-semibold text-[#f7f7ff] border-b border-slate-700/50 pb-2">
          Class Feature
        </h2>
        <div className="rounded-lg border border-slate-700/60 bg-slate-850/50 px-4 py-4 space-y-2">
          <p className="text-sm font-semibold text-[#f7f7ff]/90">
            {cls.classFeature.name}
          </p>
          <p className="text-sm text-[#b9baa3]/70 leading-relaxed whitespace-pre-wrap">
            {cls.classFeature.description}
          </p>
          {cls.classFeature.options.length > 0 && (
            <ul className="mt-2 space-y-1">
              {cls.classFeature.options.map((opt, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-sm text-[#b9baa3]/60"
                >
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#577399]" />
                  {opt}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* Subclasses */}
      {cls.subclasses.length > 0 && (
        <section>
          <h2 className="mb-3 font-serif text-xl font-semibold text-[#f7f7ff] border-b border-slate-700/50 pb-2">
            Subclasses
          </h2>
          <div className="space-y-3">
            {cls.subclasses.map((sub) => (
              <ModalSubclassPanel key={sub.subclassId} subclass={sub} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step indicator
// ---------------------------------------------------------------------------

interface StepIndicatorProps {
  currentStep: 1 | 2 | 3;
}

const STEPS = [
  { n: 1, label: "Choose Class" },
  { n: 2, label: "Heritage" },
  { n: 3, label: "Experiences" },
] as const;

function StepIndicator({ currentStep }: StepIndicatorProps) {
  return (
    <div className="flex items-center gap-0 shrink-0">
      {STEPS.map((step, idx) => (
        <React.Fragment key={step.n}>
          {/* Step bubble */}
          <div className="flex flex-col items-center">
            <div
              className={`
                h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold
                transition-all duration-200
                ${
                  currentStep === step.n
                    ? "bg-[#577399] text-[#f7f7ff] shadow-md"
                    : currentStep > step.n
                    ? "bg-[#577399]/30 text-[#577399] border border-[#577399]/50"
                    : "bg-slate-800 text-[#b9baa3]/40 border border-slate-700"
                }
              `}
            >
              {currentStep > step.n ? "✓" : step.n}
            </div>
            <span
              className={`
                mt-1 text-[10px] font-medium uppercase tracking-wider whitespace-nowrap
                ${currentStep === step.n ? "text-[#577399]" : "text-[#b9baa3]/40"}
              `}
            >
              {step.label}
            </span>
          </div>
          {/* Connector line */}
          {idx < STEPS.length - 1 && (
            <div
              className={`
                h-px w-12 mx-1 mb-4 transition-colors duration-200
                ${currentStep > step.n ? "bg-[#577399]/50" : "bg-slate-700"}
              `}
            />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Heritage trait display (ancestry / community)
// ---------------------------------------------------------------------------

function TraitCard({
  label,
  traitName,
  traitDescription,
}: {
  label: string;
  traitName: string;
  traitDescription: string;
}) {
  return (
    <div className="rounded-lg border border-[#577399]/30 bg-[#577399]/5 px-4 py-3 space-y-1">
      <div className="flex items-center gap-2">
        <span className="text-[10px] uppercase tracking-widest text-[#577399] font-semibold">
          {label} Trait
        </span>
        <span className="font-semibold text-sm text-[#f7f7ff]">{traitName}</span>
      </div>
      <p className="text-xs text-[#b9baa3]/70 leading-relaxed">{traitDescription}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Create character modal — 3-step wizard
// ---------------------------------------------------------------------------

interface CreateModalProps {
  onClose: () => void;
}

function CreateCharacterModal({ onClose }: CreateModalProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Step 1 state
  const [classId, setClassId] = useState("");

  // Step 2 state
  const [name, setName] = useState("");
  const [ancestryId, setAncestryId] = useState("");
  const [communityId, setCommunityId] = useState("");

  // Step 3 state
  const [exp1Name, setExp1Name] = useState("");
  const [exp2Name, setExp2Name] = useState("");

  const createMutation = useCreateCharacter();
  const { data: classesData, isLoading: classesLoading, isError: classesError } = useClasses();
  const { data: ancestriesData } = useAncestries();
  const { data: communitiesData } = useCommunities();
  const router = useRouter();

  // Derived: selected objects for trait display
  const selectedAncestry: AncestryData | undefined =
    ancestriesData?.ancestries.find((a) => a.ancestryId === ancestryId);
  const selectedCommunity: CommunityData | undefined =
    communitiesData?.communities.find((c) => c.communityId === communityId);

  // Step guards
  const canGoNext1 = Boolean(classId);
  const canGoNext2 = Boolean(name.trim()) && Boolean(ancestryId) && Boolean(communityId);
  const canCreate  = Boolean(exp1Name.trim()) && Boolean(exp2Name.trim());

  const handleCreate = async () => {
    if (!canCreate || createMutation.isPending) return;
    const char = await createMutation.mutateAsync({
      name: name.trim(),
      classId,
      ancestryId: ancestryId || undefined,
      communityId: communityId || undefined,
      experiences: [
        { name: exp1Name.trim(), bonus: 2 },
        { name: exp2Name.trim(), bonus: 2 },
      ],
    });
    router.push(`/character/${char.characterId}`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div
        className="
          w-full max-w-4xl rounded-2xl border border-slate-700/60
          bg-[#0a100d] shadow-2xl flex flex-col
          max-h-[92vh]
        "
        style={{ boxShadow: "0 0 60px rgba(87,115,153,0.15), 0 24px 48px rgba(0,0,0,0.6)" }}
      >
        {/* ── Modal Header ────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700/40 shrink-0">
          <div className="flex flex-col gap-0.5">
            <h2 className="font-serif text-xl font-semibold text-[#f7f7ff]">
              New Character
            </h2>
            <p className="text-xs text-[#b9baa3]/40">
              Step {step} of 3
            </p>
          </div>

          {/* Step indicator */}
          <div className="hidden sm:flex">
            <StepIndicator currentStep={step} />
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-[#b9baa3]/40 hover:text-[#b9baa3] text-2xl leading-none transition-colors ml-4"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Mobile step indicator */}
        <div className="sm:hidden flex justify-center py-3 border-b border-slate-700/30 shrink-0">
          <StepIndicator currentStep={step} />
        </div>

        {/* ── Step 1: Choose Class ─────────────────────────────────────── */}
        {step === 1 && (
          <div className="flex flex-1 min-h-0">
            {/* Left: class list */}
            <div className="w-64 sm:w-72 shrink-0 border-r border-slate-700/40 flex flex-col">
              <div className="px-4 pt-3 pb-2 shrink-0">
                <p className="text-xs font-medium uppercase tracking-wider text-[#b9baa3]/50">
                  Choose a Class
                </p>
              </div>
              <div className="flex-1 overflow-y-auto">
                {classesError && (
                  <p className="px-4 py-3 text-xs text-[#fe5f55]/70">
                    Failed to load classes.
                  </p>
                )}
                {classesLoading && !classesError && (
                  <div className="flex items-center justify-center py-8">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#577399] border-t-transparent" />
                  </div>
                )}
                {classesData?.classes.map((c) => (
                  <ClassListRow
                    key={c.classId}
                    classId={c.classId}
                    name={c.name}
                    selected={classId === c.classId}
                    onClick={() => setClassId(c.classId)}
                  />
                ))}
              </div>
            </div>

            {/* Right: class preview */}
            <div className="flex-1 overflow-y-auto p-6">
              {!classId ? (
                <div className="flex h-full items-center justify-center">
                  <div className="text-center space-y-3">
                    <div className="text-4xl opacity-20">⚔️</div>
                    <p className="text-sm text-[#b9baa3]/40 italic">
                      Select a class to see details
                    </p>
                  </div>
                </div>
              ) : (
                <ClassPreviewPanel classId={classId} />
              )}
            </div>
          </div>
        )}

        {/* ── Step 2: Heritage ─────────────────────────────────────────── */}
        {step === 2 && (
          <div className="flex-1 overflow-y-auto p-6">
            <div className="max-w-xl mx-auto space-y-6">
              {/* Section heading */}
              <div>
                <h3 className="font-serif text-xl font-semibold text-[#f7f7ff]">
                  Who are you?
                </h3>
                <p className="mt-1 text-sm text-[#b9baa3]/50">
                  Give your character a name, choose their ancestry and the community that shaped them.
                </p>
              </div>

              {/* Character name */}
              <div className="space-y-1.5">
                <label
                  htmlFor="char-name"
                  className="block text-xs font-semibold uppercase tracking-wider text-[#b9baa3]/60"
                >
                  Character Name <span className="text-[#fe5f55]">*</span>
                </label>
                <input
                  id="char-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your character's name…"
                  maxLength={60}
                  autoFocus
                  className="
                    w-full rounded-lg border border-slate-700/60 bg-slate-900
                    px-4 py-3 font-serif text-xl text-[#f7f7ff]
                    placeholder-[#b9baa3]/30
                    focus:outline-none focus:border-[#577399] transition-colors
                  "
                />
              </div>

              {/* Ancestry */}
              <div className="space-y-2">
                <label
                  htmlFor="char-ancestry"
                  className="block text-xs font-semibold uppercase tracking-wider text-[#b9baa3]/60"
                >
                  Ancestry <span className="text-[#fe5f55]">*</span>
                </label>
                <select
                  id="char-ancestry"
                  value={ancestryId}
                  onChange={(e) => setAncestryId(e.target.value)}
                  className="
                    w-full rounded-lg border border-slate-700/60 bg-slate-900
                    px-3 py-2.5 text-sm text-[#f7f7ff]
                    focus:outline-none focus:border-[#577399] transition-colors
                    appearance-none
                  "
                >
                  <option value="">Select ancestry…</option>
                  {ancestriesData?.ancestries.map((a) => (
                    <option key={a.ancestryId} value={a.ancestryId}>
                      {a.name}
                    </option>
                  ))}
                </select>

                {selectedAncestry && (
                  <TraitCard
                    label="Ancestry"
                    traitName={selectedAncestry.traitName}
                    traitDescription={selectedAncestry.traitDescription}
                  />
                )}
              </div>

              {/* Community */}
              <div className="space-y-2">
                <label
                  htmlFor="char-community"
                  className="block text-xs font-semibold uppercase tracking-wider text-[#b9baa3]/60"
                >
                  Community <span className="text-[#fe5f55]">*</span>
                </label>
                <select
                  id="char-community"
                  value={communityId}
                  onChange={(e) => setCommunityId(e.target.value)}
                  className="
                    w-full rounded-lg border border-slate-700/60 bg-slate-900
                    px-3 py-2.5 text-sm text-[#f7f7ff]
                    focus:outline-none focus:border-[#577399] transition-colors
                    appearance-none
                  "
                >
                  <option value="">Select community…</option>
                  {communitiesData?.communities.map((c) => (
                    <option key={c.communityId} value={c.communityId}>
                      {c.name}
                    </option>
                  ))}
                </select>

                {selectedCommunity && (
                  <TraitCard
                    label="Community"
                    traitName={selectedCommunity.traitName}
                    traitDescription={selectedCommunity.traitDescription}
                  />
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Step 3: Define Experiences ───────────────────────────────── */}
        {step === 3 && (
          <div className="flex-1 overflow-y-auto p-6">
            <div className="max-w-xl mx-auto space-y-6">
              {/* Heading */}
              <div>
                <h3 className="font-serif text-xl font-semibold text-[#f7f7ff]">
                  Define Your Experiences
                </h3>
                <p className="mt-2 text-sm text-[#b9baa3]/50 leading-relaxed">
                  You have 2 experiences that define your character&apos;s background.
                  Each starts at{" "}
                  <span className="font-semibold text-[#577399]">+2</span>{" "}
                  and can be incremented as you level up.
                </p>
              </div>

              {/* Experience rows */}
              <div className="space-y-4">
                {[
                  { value: exp1Name, setter: setExp1Name, label: "First Experience" },
                  { value: exp2Name, setter: setExp2Name, label: "Second Experience" },
                ].map(({ value, setter, label }, idx) => (
                  <div key={idx} className="space-y-1.5">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-[#b9baa3]/60">
                      {label} <span className="text-[#fe5f55]">*</span>
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="text"
                        value={value}
                        onChange={(e) => setter(e.target.value)}
                        placeholder="e.g. Sailor, Scholar, Street Fighter…"
                        maxLength={60}
                        autoFocus={idx === 0}
                        className="
                          flex-1 rounded-lg border border-slate-700/60 bg-slate-900
                          px-4 py-2.5 text-sm text-[#f7f7ff]
                          placeholder-[#b9baa3]/30
                          focus:outline-none focus:border-[#577399] transition-colors
                        "
                      />
                      {/* Fixed +2 badge */}
                      <div
                        className="
                          shrink-0 rounded-lg border border-[#577399]/40
                          bg-[#577399]/10 px-3 py-2.5
                          text-sm font-bold text-[#577399]
                          select-none min-w-[3rem] text-center
                        "
                      >
                        +2
                      </div>
                    </div>
                    {value.trim() && (
                      <p className="text-xs text-[#b9baa3]/40 pl-1">
                        &ldquo;{value.trim()}&rdquo; — this will define how your character rolls related checks.
                      </p>
                    )}
                  </div>
                ))}
              </div>

              {/* Summary preview */}
              {(exp1Name.trim() || exp2Name.trim()) && (
                <div className="rounded-lg border border-slate-700/40 bg-slate-900/60 p-4 space-y-2">
                  <p className="text-xs uppercase tracking-wider text-[#b9baa3]/40 font-medium">
                    Character Preview
                  </p>
                  <p className="font-serif text-lg font-semibold text-[#f7f7ff]">
                    {name}
                  </p>
                  <p className="text-xs text-[#b9baa3]/50">
                    {[selectedAncestry?.name, selectedCommunity?.name].filter(Boolean).join(" · ")}
                  </p>
                  {exp1Name.trim() && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-[#b9baa3]/70">{exp1Name.trim()}</span>
                      <span className="font-bold text-[#577399]">+2</span>
                    </div>
                  )}
                  {exp2Name.trim() && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-[#b9baa3]/70">{exp2Name.trim()}</span>
                      <span className="font-bold text-[#577399]">+2</span>
                    </div>
                  )}
                </div>
              )}

              {createMutation.isError && (
                <div className="rounded-lg border border-[#fe5f55]/40 bg-[#fe5f55]/10 px-4 py-3">
                  <p className="text-sm text-[#fe5f55]">
                    {createMutation.error?.message ?? "Failed to create character. Please try again."}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Footer nav ───────────────────────────────────────────────── */}
        <div className="shrink-0 border-t border-slate-700/40 px-6 py-4 flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => {
              if (step === 1) {
                onClose();
              } else {
                setStep((s) => (s - 1) as 1 | 2 | 3);
              }
            }}
            className="
              rounded-lg px-4 py-2.5 text-sm font-medium
              border border-slate-700/60 text-[#b9baa3]/60
              hover:border-slate-600 hover:text-[#b9baa3]
              transition-colors
            "
          >
            {step === 1 ? "Cancel" : "← Back"}
          </button>

          <div className="flex items-center gap-3">
            {/* Step dots (mobile only) */}
            <div className="flex gap-1.5 sm:hidden">
              {[1, 2, 3].map((n) => (
                <div
                  key={n}
                  className={`h-1.5 rounded-full transition-all ${
                    step === n
                      ? "w-4 bg-[#577399]"
                      : step > n
                      ? "w-1.5 bg-[#577399]/40"
                      : "w-1.5 bg-slate-700"
                  }`}
                />
              ))}
            </div>

            {step < 3 ? (
              <button
                type="button"
                onClick={() => setStep((s) => (s + 1) as 1 | 2 | 3)}
                disabled={step === 1 ? !canGoNext1 : !canGoNext2}
                className="
                  rounded-lg px-6 py-2.5 font-semibold text-sm
                  bg-[#577399] text-[#f7f7ff]
                  hover:bg-[#577399]/80
                  disabled:opacity-40 disabled:cursor-not-allowed
                  transition-colors shadow-sm
                "
              >
                Next →
              </button>
            ) : (
              <button
                type="button"
                onClick={handleCreate}
                disabled={!canCreate || createMutation.isPending}
                className="
                  rounded-lg px-6 py-2.5 font-semibold text-sm
                  bg-[#577399] text-[#f7f7ff]
                  hover:bg-[#577399]/80
                  disabled:opacity-40 disabled:cursor-not-allowed
                  transition-colors shadow-sm
                "
              >
                {createMutation.isPending ? (
                  <span className="flex items-center gap-2">
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border border-[#f7f7ff] border-t-transparent" />
                    Creating…
                  </span>
                ) : (
                  "Create Character ✦"
                )}
              </button>
            )}
          </div>
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
  const { isAuthenticated, isLoading: authLoading, isReady, user } = useAuthStore();
  const { data, isLoading, isError } = useCharacters();
  const deleteMutation = useDeleteCharacter();
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    if (isReady && !isAuthenticated) {
      router.replace("/auth/login");
    }
  }, [isReady, isAuthenticated, router]);

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
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <h1 className="font-serif text-xl font-bold text-[#f7f7ff]">
            ✦ Daggerheart
          </h1>
          {user && (
            <span className="text-sm text-[#b9baa3]/50">
              {user.displayName || user.email}
            </span>
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
              px-5 py-2.5 font-semibold text-sm text-[#577399]
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
              <p className="text-sm text-[#b9baa3]/40 max-w-xs mx-auto leading-relaxed">
                Create your first Daggerheart character and begin your adventure.
              </p>
            </div>
            <button
              onClick={() => setShowCreate(true)}
              className="
                mt-2 inline-flex items-center gap-2 rounded-xl
                border border-[#577399]/60 bg-[#577399]/10
                px-7 py-3 text-sm font-semibold text-[#577399]
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
