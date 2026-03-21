"use client";

/**
 * src/components/character/CharacterSheet.tsx
 *
 * Main character sheet component.
 * - Loads character data via useCharacter query.
 * - Syncs server data into the characterStore on load.
 * - Auto-saves dirty state to PATCH /characters/{id} after 1500ms debounce.
 * - Renders: SheetHeader, StatsPanel, TrackersPanel, FeaturesPanel, DowntimeModal.
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useCharacter, useUpdateCharacter } from "@/hooks/useCharacter";
import {
  useAncestries,
  useClass,
  useClasses,
  useCommunities,
} from "@/hooks/useGameData";
import { useCharacterStore } from "@/store/characterStore";
import { StatsPanel }     from "./StatsPanel";
import { TrackersPanel }  from "./TrackersPanel";
import { DomainLoadout }  from "./DomainLoadout";
import { DowntimeModal }  from "./DowntimeModal";
import { MarkdownContent } from "@/components/MarkdownContent";
import type { Character, ClassData } from "@shared/types";

// ─── Props ────────────────────────────────────────────────────────────────────

interface CharacterSheetProps {
  characterId: string;
}

// ─── SheetHeader ─────────────────────────────────────────────────────────────

// SRD page 21: three standard conditions are Hidden, Restrained, Vulnerable.
// Additional conditions below appear in domain card / adversary text.
const CONDITIONS = [
  "Hidden",
  "Restrained",
  "Vulnerable",
  "Stunned",
  "Cursed",
  "Poisoned",
  "Ignited",
] as const;

interface SheetHeaderProps {
  classData: ClassData | null | undefined;
}

function SheetHeader({ classData }: SheetHeaderProps) {
  const { activeCharacter, updateField, toggleCondition } = useCharacterStore();
  const { data: classesData }     = useClasses();
  const { data: communitiesData } = useCommunities();
  const { data: ancestriesData }  = useAncestries();

  if (!activeCharacter) return null;

  return (
    <div className="space-y-5">
      {/* Name + Level row */}
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="text"
          value={activeCharacter.name}
          onChange={(e) => updateField("name", e.target.value)}
          placeholder="Character Name"
          aria-label="Character name"
          className="
            flex-1 min-w-0 rounded-lg border border-burgundy-700 bg-slate-850
            px-4 py-2 font-serif text-2xl font-bold text-parchment-100
            placeholder-parchment-600 focus:outline-none focus:border-gold-500
            shadow-inner transition-colors
          "
        />
        <div className="flex items-center gap-2 shrink-0">
          <label
            htmlFor="character-level"
            className="text-xs uppercase tracking-wider text-parchment-500 font-medium"
          >
            Level
          </label>
          <input
            id="character-level"
            type="number"
            min={1}
            max={10}
            value={activeCharacter.level}
            onChange={(e) => {
              const v = parseInt(e.target.value, 10);
              if (!isNaN(v) && v >= 1 && v <= 10) updateField("level", v);
            }}
            className="
              w-16 rounded-lg border border-burgundy-700 bg-slate-850
              px-2 py-2 text-center text-xl font-bold text-gold-400
              focus:outline-none focus:border-gold-500 transition-colors
              [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none
              [&::-webkit-outer-spin-button]:appearance-none
            "
          />
        </div>
      </div>

      {/* Class / Subclass / Community / Ancestry row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {/* Class */}
        <div className="flex flex-col gap-1">
          <label
            htmlFor="header-class"
            className="text-[10px] uppercase tracking-widest text-parchment-500 font-medium"
          >
            Class
          </label>
          <select
            id="header-class"
            value={activeCharacter.classId}
            onChange={(e) => updateField("classId", e.target.value)}
            className="
              rounded border border-burgundy-800 bg-slate-900 px-2 py-1.5
              text-sm text-parchment-200 focus:outline-none focus:border-gold-500 transition-colors
            "
          >
            <option value="">Select class…</option>
            {classesData?.classes.map((c) => (
              <option key={c.classId} value={c.classId}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Subclass */}
        <div className="flex flex-col gap-1">
          <label
            htmlFor="header-subclass"
            className="text-[10px] uppercase tracking-widest text-parchment-500 font-medium"
          >
            Subclass
          </label>
          <select
            id="header-subclass"
            value={activeCharacter.subclassId ?? ""}
            onChange={(e) =>
              updateField("subclassId", e.target.value || null)
            }
            className="
              rounded border border-burgundy-800 bg-slate-900 px-2 py-1.5
              text-sm text-parchment-200 focus:outline-none focus:border-gold-500 transition-colors
            "
          >
            <option value="">None</option>
            {classData?.subclasses.map((sc) => (
              <option key={sc.subclassId} value={sc.subclassId}>
                {sc.name}
              </option>
            ))}
          </select>
        </div>

        {/* Community */}
        <div className="flex flex-col gap-1">
          <label
            htmlFor="header-community"
            className="text-[10px] uppercase tracking-widest text-parchment-500 font-medium"
          >
            Community
          </label>
          <select
            id="header-community"
            value={activeCharacter.communityId ?? ""}
            onChange={(e) =>
              updateField("communityId", e.target.value || null)
            }
            className="
              rounded border border-burgundy-800 bg-slate-900 px-2 py-1.5
              text-sm text-parchment-200 focus:outline-none focus:border-gold-500 transition-colors
            "
          >
            <option value="">None</option>
            {communitiesData?.communities.map((c) => (
              <option key={c.communityId} value={c.communityId}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Ancestry */}
        <div className="flex flex-col gap-1">
          <label
            htmlFor="header-ancestry"
            className="text-[10px] uppercase tracking-widest text-parchment-500 font-medium"
          >
            Ancestry
          </label>
          <select
            id="header-ancestry"
            value={activeCharacter.ancestryId ?? ""}
            onChange={(e) =>
              updateField("ancestryId", e.target.value || null)
            }
            className="
              rounded border border-burgundy-800 bg-slate-900 px-2 py-1.5
              text-sm text-parchment-200 focus:outline-none focus:border-gold-500 transition-colors
            "
          >
            <option value="">None</option>
            {ancestriesData?.ancestries.map((a) => (
              <option key={a.ancestryId} value={a.ancestryId}>
                {a.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Condition tags */}
      <div>
        <p className="mb-2 text-[10px] uppercase tracking-widest text-parchment-500 font-medium">
          Conditions
        </p>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Conditions">
          {CONDITIONS.map((cond) => {
            const active = activeCharacter.conditions?.includes(cond) ?? false;
            return (
              <button
                key={cond}
                type="button"
                onClick={() => toggleCondition(cond)}
                aria-pressed={active}
                className={`
                  rounded-full border px-3 py-1 text-xs font-semibold
                  transition-all duration-150 focus:outline-none focus:ring-1 focus:ring-gold-500
                  ${
                    active
                      ? "border-burgundy-500 bg-burgundy-700/70 text-parchment-100"
                      : "border-burgundy-900 bg-transparent text-parchment-600 hover:border-burgundy-700 hover:text-parchment-300"
                  }
                `}
              >
                {cond}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── FeaturesPanel ────────────────────────────────────────────────────────────

interface FeaturesPanelProps {
  classData: ClassData | null | undefined;
}

function FeaturesPanel({ classData }: FeaturesPanelProps) {
  const { activeCharacter } = useCharacterStore();
  if (!activeCharacter || !classData) return null;

  const activeSubclass = classData.subclasses.find(
    (sc) => sc.subclassId === activeCharacter.subclassId
  );
  const level = activeCharacter.level;
  // SRD page 22: Tier 1 = level 1, Tier 2 = levels 2-4, Tier 3 = levels 5-7, Tier 4 = levels 8-10.
  // Specialization unlocks at Tier 2 (level 2+); Mastery unlocks at Tier 3 (level 5+).
  const tier  = level >= 8 ? 4 : level >= 5 ? 3 : level >= 2 ? 2 : 1;

  return (
    <section
      className="rounded-xl border border-burgundy-900 bg-slate-900/80 p-5 shadow-card space-y-4"
      aria-label="Features"
    >
      <h2 className="font-serif text-sm font-semibold uppercase tracking-widest text-gold-600">
        Features
      </h2>

      {/* Class Feature */}
      {classData.classFeature && (
        <div className="rounded-lg border border-burgundy-800 bg-slate-850 p-4">
          <h3 className="mb-1 font-serif text-sm font-semibold text-parchment-200">
            {classData.classFeature.name}
          </h3>
          <MarkdownContent className="text-xs text-parchment-400 leading-relaxed">
            {classData.classFeature.description}
          </MarkdownContent>
          {classData.classFeature.options.length > 0 && (
            <ul className="mt-2 space-y-0.5 list-disc list-inside">
              {classData.classFeature.options.map((opt) => (
                <li key={opt} className="text-xs text-parchment-500">
                  <MarkdownContent className="inline">{opt}</MarkdownContent>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Hope Feature */}
      {classData.hopeFeature && (
        <div className="rounded-lg border border-gold-900 bg-gold-950/20 p-4">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-serif text-sm font-semibold text-gold-300">
              {classData.hopeFeature.name}
            </h3>
            <span className="rounded bg-gold-900/50 px-1.5 text-[10px] font-bold text-gold-500">
              {classData.hopeFeature.hopeCost} Hope
            </span>
          </div>
          <MarkdownContent className="text-xs text-parchment-400 leading-relaxed">
            {classData.hopeFeature.description}
          </MarkdownContent>
        </div>
      )}

      {/* Subclass features */}
      {activeSubclass && (
        <div className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-gold-700">
            {activeSubclass.name} — Subclass Features
          </h3>

          {activeSubclass.foundationFeatures.map((feat) => (
            <div
              key={feat.name}
              className="rounded border border-burgundy-900 bg-slate-900 p-3"
            >
              <p className="text-sm font-medium text-parchment-200">
                {feat.name}
              </p>
              <MarkdownContent className="mt-0.5 text-xs text-parchment-500 leading-relaxed">
                {feat.description}
              </MarkdownContent>
            </div>
          ))}

          {tier >= 2 && (
            <div className="rounded border border-gold-900 bg-slate-900 p-3">
              <div className="flex items-center gap-2 mb-1">
                <p className="text-sm font-medium text-parchment-200">
                  {activeSubclass.specializationFeature.name}
                </p>
                <span className="rounded bg-gold-900/50 px-1.5 text-[10px] font-bold text-gold-400">
                  Specialization
                </span>
              </div>
              <MarkdownContent className="text-xs text-parchment-500 leading-relaxed">
                {activeSubclass.specializationFeature.description}
              </MarkdownContent>
            </div>
          )}

          {tier >= 3 && (
            <div className="rounded border border-burgundy-600 bg-slate-900 p-3">
              <div className="flex items-center gap-2 mb-1">
                <p className="text-sm font-medium text-parchment-200">
                  {activeSubclass.masteryFeature.name}
                </p>
                <span className="rounded bg-burgundy-900/50 px-1.5 text-[10px] font-bold text-burgundy-400">
                  Mastery
                </span>
              </div>
              <MarkdownContent className="text-xs text-parchment-500 leading-relaxed">
                {activeSubclass.masteryFeature.description}
              </MarkdownContent>
            </div>
          )}
        </div>
      )}

      {/* Domain loadout */}
      <div>
        <DomainLoadout />
      </div>

      {activeCharacter.domainVault.length > 0 && (
        <p className="text-xs text-parchment-600 italic">
          Domain vault: {activeCharacter.domainVault.length} card
          {activeCharacter.domainVault.length !== 1 ? "s" : ""} unlocked.
        </p>
      )}
    </section>
  );
}

// ─── Save status indicator ────────────────────────────────────────────────────

interface SaveStatusProps {
  isDirty:  boolean;
  isSaving: boolean;
}

function SaveStatus({ isDirty, isSaving }: SaveStatusProps) {
  if (isSaving) {
    return (
      <span
        role="status"
        aria-live="polite"
        aria-label="Saving character"
        className="flex items-center gap-1.5 text-xs text-parchment-500"
      >
        <span
          aria-hidden="true"
          className="h-2 w-2 animate-spin rounded-full border border-parchment-600 border-t-transparent"
        />
        Saving…
      </span>
    );
  }
  if (isDirty) {
    return (
      <span role="status" aria-live="polite" className="text-xs text-gold-600">
        Unsaved changes
      </span>
    );
  }
  return (
    <span role="status" aria-live="polite" className="text-xs text-parchment-700">
      All changes saved
    </span>
  );
}

// ─── Main CharacterSheet ──────────────────────────────────────────────────────

export function CharacterSheet({ characterId }: CharacterSheetProps) {
  const {
    data: character,
    isLoading,
    isError,
    error,
  } = useCharacter(characterId);

  const updateMutation = useUpdateCharacter(characterId);

  const {
    activeCharacter,
    setCharacter,
    updateField,
    isDirty,
    isSaving,
  } = useCharacterStore();

  const [downtimeOpen, setDowntimeOpen] = useState(false);

  // Pull class data for the header subclass selector + features panel
  const { data: classData } = useClass(activeCharacter?.classId ?? undefined);

  // Sync server → store when query resolves
  useEffect(() => {
    if (character) {
      setCharacter(character);
    }
  }, [character, setCharacter]);

  // Debounced auto-save: fire PATCH 1500ms after the last dirty change
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleAutoSave = useCallback(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      if (activeCharacter) {
        updateMutation.mutate(activeCharacter as Partial<Character>);
      }
    }, 1500);
  }, [activeCharacter, updateMutation]);

  useEffect(() => {
    if (isDirty) scheduleAutoSave();
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [isDirty, scheduleAutoSave]);

  // ── Loading ──────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div
        role="status"
        aria-label="Loading character"
        className="flex min-h-[24rem] items-center justify-center"
      >
        <div className="space-y-3 text-center">
          <div
            aria-hidden="true"
            className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-burgundy-500 border-t-transparent"
          />
          <p className="text-sm text-parchment-500">Loading character…</p>
        </div>
      </div>
    );
  }

  // ── Error ────────────────────────────────────────────────────────────────
  if (isError) {
    return (
      <div
        role="alert"
        className="rounded-xl border border-burgundy-700 bg-slate-900 p-8 text-center"
      >
        <p className="font-serif text-lg text-burgundy-300">
          Failed to load character
        </p>
        <p className="mt-1 text-sm text-parchment-500">
          {(error as Error)?.message ?? "An unexpected error occurred."}
        </p>
      </div>
    );
  }

  if (!activeCharacter) return null;

  return (
    <div className="mx-auto max-w-4xl space-y-4 pb-20">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <SaveStatus isDirty={isDirty} isSaving={isSaving} />
        <button
          type="button"
          onClick={() => setDowntimeOpen(true)}
          aria-haspopup="dialog"
          className="
            rounded-lg border border-burgundy-700 bg-burgundy-800/40 px-4 py-1.5
            text-sm font-semibold text-parchment-200
            hover:bg-burgundy-700 transition-colors shadow-card
            focus:outline-none focus:ring-2 focus:ring-gold-500 focus:ring-offset-2 focus:ring-offset-slate-950
          "
        >
          Downtime / Rest
        </button>
      </div>

      {/* Header card */}
      <section className="rounded-xl border border-burgundy-900 bg-slate-900/80 p-5 shadow-card">
        <SheetHeader classData={classData} />
      </section>

      {/* Core stats */}
      <StatsPanel />

      {/* Trackers, weapons, hope, experiences */}
      <TrackersPanel />

      {/* Features, loadout */}
      <FeaturesPanel classData={classData} />

      {/* Notes */}
      <section
        className="rounded-xl border border-burgundy-900 bg-slate-900/80 p-5 shadow-card"
        aria-label="Notes"
      >
        <h2 className="mb-3 font-serif text-sm font-semibold uppercase tracking-widest text-gold-600">
          Notes
        </h2>
        <textarea
          rows={6}
          value={activeCharacter.notes ?? ""}
          onChange={(e) => updateField("notes", e.target.value)}
          placeholder="Free-form notes, backstory, session reminders…"
          aria-label="Character notes"
          className="
            w-full resize-none rounded border border-burgundy-800 bg-slate-950
            px-3 py-2 text-sm text-parchment-300 placeholder-parchment-700
            focus:outline-none focus:border-gold-600 transition-colors
          "
        />
      </section>

      {/* Downtime / rest modal */}
      <DowntimeModal
        characterId={characterId}
        open={downtimeOpen}
        onClose={() => setDowntimeOpen(false)}
      />
    </div>
  );
}
