"use client";

/**
 * src/components/character/CharacterSheet.tsx
 *
 * Main character sheet component.
 * - Loads character data via useCharacter query.
 * - Syncs server data into the characterStore on load.
 * - Auto-saves dirty state to PATCH /characters/{id} after 1500ms debounce.
 * - Renders: SheetHeader, StatsPanel, TrackersPanel, FeaturesPanel,
 *            DowntimeModal, CompanionPanel, DowntimeProjectsPanel.
 *
 * New features:
 * - Custom conditions alongside SRD conditions (visually distinguished)
 * - Hope-feature action buttons (any HopeFeature with hopeCost)
 * - Class feature action buttons (Veilstep, Recall, etc.)
 * - Companion panel (if character.companionState !== null)
 * - Downtime projects panel
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
import { StatsPanel }               from "./StatsPanel";
import { TrackersPanel }            from "./TrackersPanel";
import { DomainLoadout }            from "./DomainLoadout";
import { DowntimeModal }            from "./DowntimeModal";
import { CompanionPanel }           from "./CompanionPanel";
import { DowntimeProjectsPanel }    from "./DowntimeProjectsPanel";
import { LevelUpWizard }            from "./LevelUpWizard";
import { MarkdownContent }          from "@/components/MarkdownContent";
import { useActionButton, InlineActionError } from "./ActionButton";
import type { Character, ClassData, CustomCondition } from "@shared/types";

// ─── Props ────────────────────────────────────────────────────────────────────

interface CharacterSheetProps {
  characterId: string;
}

// ─── SRD conditions ───────────────────────────────────────────────────────────

// SRD page 21: three standard conditions plus commonly used extras
const SRD_CONDITIONS = [
  "Hidden",
  "Restrained",
  "Vulnerable",
  "Stunned",
  "Cursed",
  "Poisoned",
  "Ignited",
] as const;

// ─── ConditionTag ─────────────────────────────────────────────────────────────

interface ConditionTagProps {
  label:    string;
  active:   boolean;
  onToggle: () => void;
  /** true = custom (campaign) condition; false = SRD condition */
  isCustom?: boolean;
  description?: string;
}

function ConditionTag({ label, active, onToggle, isCustom = false, description }: ConditionTagProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={active}
      title={description}
      className={`
        rounded-full border px-3 py-1 text-xs font-semibold
        transition-all duration-150 focus:outline-none focus:ring-1 focus:ring-gold-500
        ${
          active
            ? isCustom
              ? "border-[#577399] bg-[#577399]/20 text-[#f7f7ff]"
              : "border-burgundy-500 bg-burgundy-700/70 text-parchment-100"
            : isCustom
            ? "border-[#577399]/40 bg-transparent text-parchment-600 hover:border-[#577399] hover:text-parchment-300"
            : "border-burgundy-900 bg-transparent text-parchment-600 hover:border-burgundy-700 hover:text-parchment-300"
        }
      `}
    >
      {isCustom && (
        <span aria-hidden="true" className="mr-1 text-[10px] opacity-60">✦</span>
      )}
      {label}
    </button>
  );
}

// ─── SheetHeader ─────────────────────────────────────────────────────────────

interface SheetHeaderProps {
  classData: ClassData | null | undefined;
  onLevelUp: () => void;
}

function SheetHeader({ classData, onLevelUp }: SheetHeaderProps) {
  const { activeCharacter, updateField, toggleCondition } = useCharacterStore();
  const { data: classesData }     = useClasses();
  const { data: communitiesData } = useCommunities();
  const { data: ancestriesData }  = useAncestries();

  if (!activeCharacter) return null;

  const customConditions: CustomCondition[] = activeCharacter.customConditions ?? [];

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
            className="text-xs uppercase tracking-wider text-parchment-500 font-medium"
          >
            Level
          </label>
          <div
            aria-label={`Level ${activeCharacter.level}`}
            className="
              w-16 rounded-lg border border-burgundy-700 bg-slate-850
              px-2 py-2 text-center text-xl font-bold text-gold-400
            "
          >
            {activeCharacter.level}
          </div>
          {activeCharacter.level < 10 && (
            <button
              type="button"
              onClick={onLevelUp}
              aria-label="Level up character"
              className="
                rounded-lg border border-gold-800/60 bg-gold-950/20 px-3 py-2
                text-xs font-semibold text-gold-300
                hover:bg-gold-900/30 hover:border-gold-700
                transition-all duration-150
                focus:outline-none focus:ring-2 focus:ring-gold-500 focus:ring-offset-1 focus:ring-offset-slate-900
              "
            >
              Level Up
            </button>
          )}
        </div>
      </div>

      {/* Class / Subclass / Community / Ancestry row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
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
              <option key={c.classId} value={c.classId}>{c.name}</option>
            ))}
          </select>
        </div>

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
            onChange={(e) => updateField("subclassId", e.target.value || null)}
            className="
              rounded border border-burgundy-800 bg-slate-900 px-2 py-1.5
              text-sm text-parchment-200 focus:outline-none focus:border-gold-500 transition-colors
            "
          >
            <option value="">None</option>
            {classData?.subclasses.map((sc) => (
              <option key={sc.subclassId} value={sc.subclassId}>{sc.name}</option>
            ))}
          </select>
        </div>

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
            onChange={(e) => updateField("communityId", e.target.value || null)}
            className="
              rounded border border-burgundy-800 bg-slate-900 px-2 py-1.5
              text-sm text-parchment-200 focus:outline-none focus:border-gold-500 transition-colors
            "
          >
            <option value="">None</option>
            {communitiesData?.communities.map((c) => (
              <option key={c.communityId} value={c.communityId}>{c.name}</option>
            ))}
          </select>
        </div>

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
            onChange={(e) => updateField("ancestryId", e.target.value || null)}
            className="
              rounded border border-burgundy-800 bg-slate-900 px-2 py-1.5
              text-sm text-parchment-200 focus:outline-none focus:border-gold-500 transition-colors
            "
          >
            <option value="">None</option>
            {ancestriesData?.ancestries.map((a) => (
              <option key={a.ancestryId} value={a.ancestryId}>{a.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Condition tags: SRD + custom */}
      <div>
        <p className="mb-2 text-[10px] uppercase tracking-widest text-parchment-500 font-medium">
          Conditions
        </p>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Conditions">
          {/* SRD conditions */}
          {SRD_CONDITIONS.map((cond) => {
            const active = activeCharacter.conditions?.includes(cond) ?? false;
            return (
              <ConditionTag
                key={cond}
                label={cond}
                active={active}
                onToggle={() => toggleCondition(cond)}
              />
            );
          })}

          {/* Campaign-specific custom conditions */}
          {customConditions.map((cond) => {
            const active = activeCharacter.conditions?.includes(cond.conditionId) ?? false;
            return (
              <ConditionTag
                key={cond.conditionId}
                label={cond.name}
                active={active}
                onToggle={() => toggleCondition(cond.conditionId)}
                isCustom
                description={cond.description}
              />
            );
          })}
        </div>

        {customConditions.length > 0 && (
          <p className="mt-1.5 text-[10px] text-parchment-700 italic">
            ✦ Campaign conditions from domain cards
          </p>
        )}
      </div>
    </div>
  );
}

// ─── FeatureActionButton ──────────────────────────────────────────────────────
// A button for class features that have a quantifiable mechanical cost.

interface FeatureActionButtonProps {
  characterId: string;
  label:       string;
  actionId:    string;
  params?:     Record<string, unknown>;
  costLabel?:  string;
}

function FeatureActionButton({
  characterId,
  label,
  actionId,
  params,
  costLabel,
}: FeatureActionButtonProps) {
  const { fire, isPending, inlineError } = useActionButton(characterId);
  const errorId = React.useId();

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => fire(actionId, params)}
          disabled={isPending}
          aria-label={label}
          aria-describedby={inlineError ? errorId : undefined}
          aria-busy={isPending}
          className="
            rounded-lg border border-gold-800/60 bg-gold-950/20 px-3 py-1.5
            text-xs font-semibold text-gold-300
            hover:bg-gold-900/30 hover:border-gold-700
            disabled:opacity-50 disabled:cursor-wait
            transition-all duration-150
            focus:outline-none focus:ring-2 focus:ring-gold-500 focus:ring-offset-1 focus:ring-offset-slate-900
          "
        >
          {isPending ? (
            <span
              aria-hidden="true"
              className="inline-block h-3 w-3 animate-spin rounded-full border border-current border-t-transparent"
            />
          ) : (
            label
          )}
        </button>
        {costLabel && (
          <span className="text-[10px] text-gold-600 font-medium">{costLabel}</span>
        )}
      </div>
      <InlineActionError message={inlineError} id={errorId} />
    </div>
  );
}

// ─── FeaturesPanel ────────────────────────────────────────────────────────────

interface FeaturesPanelProps {
  classData:   ClassData | null | undefined;
  characterId: string;
}

function FeaturesPanel({ classData, characterId }: FeaturesPanelProps) {
  const { activeCharacter } = useCharacterStore();
  if (!activeCharacter || !classData) return null;

  const activeSubclass = classData.subclasses.find(
    (sc) => sc.subclassId === activeCharacter.subclassId
  );
  const level = activeCharacter.level;
  // SRD page 22: Tier 1=level 1, Tier 2=levels 2-4, Tier 3=levels 5-7, Tier 4=levels 8-10.
  const tier = level >= 8 ? 4 : level >= 5 ? 3 : level >= 2 ? 2 : 1;

  // Determine if a named class or subclass feature has a known actionable
  // mechanical effect with a Hope cost.
  //
  // Rules for inclusion:
  //   - The feature's own description (not the Hope Feature block) mentions
  //     spending a specific number of Hope as part of its activation.
  //   - Pure roleplay / passive features and downtime-project grants are excluded.
  //
  // Feature → { actionId, params, costLabel }
  //
  // Sources verified against /markdown/Classes/*.md:
  //   Wraithcaller   — Veilstep (spend 1 Hope once per scene)
  //   Scholar        — Impressive Recall (spend 1 Hope once per rest)
  //   Pugilist       — Not Done Yet (passive; no button)
  //   Æther Engineer — The Apparatus (activate once per scene; no Hope cost)
  //   All others     — passive, downtime-project-based, or have no Hope cost
  //     in the class feature block itself (their Hope spend is in the
  //     Hope Feature block and is already covered by the universal button).
  const classFeatureHasAction = (
    name: string
  ): { actionId: string; params: Record<string, unknown>; costLabel: string } | null => {
    const lower = name.toLowerCase().trim();

    // Wraithcaller: Veilstep — "spend 1 Hope to move…"
    if (lower === "veilstep" || lower.includes("veilstep")) {
      return { actionId: "spend-hope", params: { n: 1 }, costLabel: "1 Hope" };
    }

    // Scholar: Impressive Recall — "spend a Hope to learn an inconsequential detail…"
    if (lower === "impressive recall" || lower.includes("impressive recall")) {
      return { actionId: "spend-hope", params: { n: 1 }, costLabel: "1 Hope" };
    }

    return null;
  };

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
        <div className="rounded-lg border border-burgundy-800 bg-slate-850 p-4 space-y-3">
          <div>
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

          {/* Action button if this feature has a known mechanic */}
          {(() => {
            const action = classFeatureHasAction(classData.classFeature.name);
            return action ? (
              <FeatureActionButton
                characterId={characterId}
                label={`Use ${classData.classFeature.name}`}
                actionId={action.actionId}
                params={action.params}
                costLabel={action.costLabel}
              />
            ) : null;
          })()}
        </div>
      )}

      {/* Hope Feature — always has a hopeCost; always gets an action button */}
      {classData.hopeFeature && (
        <div className="rounded-lg border border-gold-900 bg-gold-950/20 p-4 space-y-3">
          <div>
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

          {/* Every Hope Feature gets a "Use [Name]" button spending hopeCost */}
          <FeatureActionButton
            characterId={characterId}
            label={`Use ${classData.hopeFeature.name}`}
            actionId="spend-hope"
            params={{ n: classData.hopeFeature.hopeCost }}
            costLabel={`${classData.hopeFeature.hopeCost} Hope`}
          />
        </div>
      )}

      {/* Subclass features */}
      {activeSubclass && (
        <div className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-gold-700">
            {activeSubclass.name} — Subclass Features
          </h3>

          {activeSubclass.foundationFeatures.map((feat) => {
            const action = classFeatureHasAction(feat.name);
            return (
              <div
                key={feat.name}
                className="rounded border border-burgundy-900 bg-slate-900 p-3 space-y-2"
              >
                <div>
                  <p className="text-sm font-medium text-parchment-200">{feat.name}</p>
                  <MarkdownContent className="mt-0.5 text-xs text-parchment-500 leading-relaxed">
                    {feat.description}
                  </MarkdownContent>
                </div>
                {action && (
                  <FeatureActionButton
                    characterId={characterId}
                    label={`Use ${feat.name}`}
                    actionId={action.actionId}
                    params={action.params}
                    costLabel={action.costLabel}
                  />
                )}
              </div>
            );
          })}

          {tier >= 2 && (
            <div className="rounded border border-gold-900 bg-slate-900 p-3 space-y-2">
              <div>
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
              {(() => {
                const action = classFeatureHasAction(activeSubclass.specializationFeature.name);
                return action ? (
                  <FeatureActionButton
                    characterId={characterId}
                    label={`Use ${activeSubclass.specializationFeature.name}`}
                    actionId={action.actionId}
                    params={action.params}
                    costLabel={action.costLabel}
                  />
                ) : null;
              })()}
            </div>
          )}

          {tier >= 3 && (
            <div className="rounded border border-burgundy-600 bg-slate-900 p-3 space-y-2">
              <div>
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
              {(() => {
                const action = classFeatureHasAction(activeSubclass.masteryFeature.name);
                return action ? (
                  <FeatureActionButton
                    characterId={characterId}
                    label={`Use ${activeSubclass.masteryFeature.name}`}
                    actionId={action.actionId}
                    params={action.params}
                    costLabel={action.costLabel}
                  />
                ) : null;
              })()}
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
  const [levelUpOpen,  setLevelUpOpen]  = useState(false);

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
        <SheetHeader classData={classData} onLevelUp={() => setLevelUpOpen(true)} />
      </section>

      {/* Level-up wizard (modal overlay) */}
      {levelUpOpen && activeCharacter && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <LevelUpWizard
              character={activeCharacter}
              onClose={() => setLevelUpOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Core stats */}
      <StatsPanel />

      {/* Trackers, weapons, hope, experiences */}
      <TrackersPanel />

      {/* Features, loadout */}
      <FeaturesPanel classData={classData} characterId={characterId} />

      {/* Companion (shown only if companionState is not null) */}
      <CompanionPanel />

      {/* Downtime projects */}
      <DowntimeProjectsPanel />

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
