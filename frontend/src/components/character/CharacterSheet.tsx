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
 * - EditSidebar for editable text fields with SRD explanations
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useCharacter, useUpdateCharacter } from "@/hooks/useCharacter";
import {
  useAncestries,
  useClass,
  useClasses,
  useCommunities,
} from "@/hooks/useGameData";
import { useCharacterStore } from "@/store/characterStore";
import { apiClient } from "@/lib/api";
import { StatsPanel }               from "./StatsPanel";
import { TrackersPanel }            from "./TrackersPanel";
import { DomainLoadout }            from "./DomainLoadout";
import { DowntimeModal }            from "./DowntimeModal";
import { CompanionPanel }           from "./CompanionPanel";
import { DowntimeProjectsPanel }    from "./DowntimeProjectsPanel";
import { LevelUpWizard }            from "./LevelUpWizard";
import { MarkdownContent }          from "@/components/MarkdownContent";
import { useActionButton, InlineActionError } from "./ActionButton";
import { EditSidebarProvider, EditableField } from "./EditSidebar";
import { CHARACTER_NAME_FIELD, CHARACTER_NOTES_FIELD } from "./editSidebarConfig";
import { EquipmentPanel }           from "./EquipmentPanel";
import { FavorsPanel }              from "./FavorsPanel";
import { PortraitDisplay }          from "./PortraitUpload";
import type { Character, ClassData, CoreStatName, CustomCondition } from "@shared/types";

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

// ─── ConditionsSidebar ────────────────────────────────────────────────────────
// A self-contained slide-in panel for toggling conditions, separate from the
// generic EditSidebar so it can render a checkbox list rather than a text input.

interface ConditionsSidebarProps {
  open: boolean;
  onClose: () => void;
  conditions: readonly string[];
  customConditions: CustomCondition[];
  activeConditions: string[];
  onToggle: (id: string) => void;
}

function ConditionsSidebar({
  open,
  onClose,
  conditions,
  customConditions,
  activeConditions,
  onToggle,
}: ConditionsSidebarProps) {
  const headingId = React.useId();
  const panelRef  = React.useRef<HTMLDivElement>(null);

  // Focus first focusable element when opened
  React.useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => {
      const first = panelRef.current?.querySelector<HTMLElement>(
        'button, input, [tabindex]:not([tabindex="-1"])'
      );
      first?.focus();
    }, 50);
    return () => clearTimeout(t);
  }, [open]);

  // Escape to close
  React.useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.stopPropagation(); onClose(); }
    };
    document.addEventListener("keydown", handler, true);
    return () => document.removeEventListener("keydown", handler, true);
  }, [open, onClose]);

  return (
    <>
      {open && (
        <div
          aria-hidden="true"
          onClick={onClose}
          className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-sm lg:hidden"
        />
      )}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={headingId}
        aria-hidden={!open}
        inert={!open ? ("" as unknown as boolean) : undefined}
        className={[
          "fixed inset-y-0 right-0 z-50 flex h-full w-full max-w-[28rem] flex-col",
          "border-l border-[#577399]/35 bg-[#0f1713] shadow-2xl",
          "transition-transform duration-300 ease-in-out",
          open ? "translate-x-0" : "translate-x-full",
        ].join(" ")}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#577399]/25 px-5 py-4">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] sidebar-text-secondary">Character</p>
            <h2 id={headingId} className="font-serif text-lg font-semibold text-[#f7f7ff]">Conditions</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close conditions panel"
            className="flex h-11 w-11 items-center justify-center rounded-lg border border-[#577399]/30 text-[#b9baa3] hover:bg-[#577399]/12 hover:text-[#f7f7ff] focus:outline-none focus:ring-2 focus:ring-[#577399]"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6">
          {/* SRD conditions */}
          <fieldset>
            <legend className="text-xs font-semibold uppercase tracking-[0.2em] sidebar-text-secondary mb-3">
              SRD Conditions
            </legend>
            <ul className="space-y-1" role="list">
              {conditions.map((cond) => {
                const checked = activeConditions.includes(cond);
                const inputId = `cond-srd-${cond}`;
                return (
                  <li key={cond}>
                    <label
                      htmlFor={inputId}
                      className={[
                        "flex items-center gap-3 rounded-lg px-3 py-3 cursor-pointer",
                        "border transition-colors",
                        checked
                          ? "border-[#577399] bg-[#577399]/20 text-[#f7f7ff]"
                          : "border-transparent hover:border-[#577399]/40 hover:bg-slate-800/50 text-[#b9baa3]",
                      ].join(" ")}
                    >
                      <input
                        id={inputId}
                        type="checkbox"
                        checked={checked}
                        onChange={() => onToggle(cond)}
                        className="h-4 w-4 rounded border-[#577399]/60 bg-slate-900 accent-[#577399] focus:ring-2 focus:ring-[#577399]"
                      />
                      <span className="text-sm font-medium">{cond}</span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </fieldset>

          {/* Campaign conditions */}
          {customConditions.length > 0 && (
            <fieldset>
              <legend className="text-xs font-semibold uppercase tracking-[0.2em] sidebar-text-secondary mb-3">
                Campaign Conditions <span className="normal-case font-normal opacity-60">(domain cards)</span>
              </legend>
              <ul className="space-y-1" role="list">
                {customConditions.map((cond) => {
                  const checked = activeConditions.includes(cond.conditionId);
                  const inputId = `cond-custom-${cond.conditionId}`;
                  return (
                    <li key={cond.conditionId}>
                      <label
                        htmlFor={inputId}
                        className={[
                          "flex items-start gap-3 rounded-lg px-3 py-3 cursor-pointer",
                          "border transition-colors",
                          checked
                            ? "border-[#577399] bg-[#577399]/20 text-[#f7f7ff]"
                            : "border-transparent hover:border-[#577399]/40 hover:bg-slate-800/50 text-parchment-400",
                        ].join(" ")}
                      >
                        <input
                          id={inputId}
                          type="checkbox"
                          checked={checked}
                          onChange={() => onToggle(cond.conditionId)}
                          className="mt-0.5 h-4 w-4 rounded border-[#577399]/60 bg-slate-900 accent-[#577399] focus:ring-2 focus:ring-[#577399]"
                        />
                        <span className="flex flex-col gap-0.5">
                          <span className="text-sm font-medium">
                            <span aria-hidden="true" className="mr-1 text-xs sidebar-text-secondary">✦</span>
                            {cond.name}
                          </span>
                          {cond.description && (
                            <span className="text-sm sidebar-text-secondary">{cond.description}</span>
                          )}
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            </fieldset>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-[#577399]/25 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-xl border border-[#577399]/40 bg-[#577399]/15 px-4 py-3 text-sm font-semibold text-[#f7f7ff] hover:bg-[#577399]/25 focus:outline-none focus:ring-2 focus:ring-[#577399]"
          >
            Done
          </button>
        </div>
      </div>
    </>
  );
}

// ─── SheetDivider ─────────────────────────────────────────────────────────────
// Renders the correct SVG divider based on subclass spellcast trait.
// Mapping (SRD-confirmed):
//   presence | agility → divider-presence-agility.svg  (Bard, Ranger)
//   strength | finesse → divider-strength-finesse.svg  (Seraph, Rogue)
//   knowledge| instinct→ divider-knowledge-instinct.svg (Wizard, Druid, Sorcerer)
//   null / undefined   → plain hr (Guardian, Warrior)

const DIVIDER_MAP: Partial<Record<CoreStatName, string>> = {
  presence:  "/images/ui-elements/divider-presence-agility.svg",
  agility:   "/images/ui-elements/divider-presence-agility.svg",
  strength:  "/images/ui-elements/divider-strength-finesse.svg",
  finesse:   "/images/ui-elements/divider-strength-finesse.svg",
  knowledge: "/images/ui-elements/divider-knowledge-instinct.svg",
  instinct:  "/images/ui-elements/divider-knowledge-instinct.svg",
};

function SheetDivider({ spellcastTrait }: { spellcastTrait?: CoreStatName | null }) {
  const src = spellcastTrait ? DIVIDER_MAP[spellcastTrait] : null;
  if (!src) {
    return <div className="my-1 border-t border-[#577399]/15" aria-hidden="true" />;
  }
  return (
    <div className="my-1 w-full overflow-hidden" aria-hidden="true">
      <img
        src={src}
        alt=""
        className="w-full object-contain opacity-70"
        draggable={false}
        style={{ maxHeight: 48 }}
      />
    </div>
  );
}

// ─── SheetHeader ─────────────────────────────────────────────────────────────

interface SheetHeaderProps {
  characterId: string;
  classData: ClassData | null | undefined;
  onLevelUp: () => void;
}

type ShareState = "idle" | "loading" | "copied" | "error";

function SheetHeader({ characterId, classData, onLevelUp }: SheetHeaderProps) {
  const router = useRouter();
  const { activeCharacter, toggleCondition } = useCharacterStore();
  const { data: classesData }     = useClasses();
  const { data: communitiesData } = useCommunities();
  const { data: ancestriesData }  = useAncestries();
  const [conditionsOpen, setConditionsOpen] = React.useState(false);
  const [shareState, setShareState] = React.useState<ShareState>("idle");

  const handleShare = React.useCallback(async () => {
    if (shareState === "loading") return;
    setShareState("loading");
    try {
      const data = await apiClient.get<{ shareToken: string; shareUrl: string }>(
        `/characters/${characterId}/share`
      );
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const url = `${origin}/character/${characterId}/public?token=${data.shareToken}`;
      await navigator.clipboard.writeText(url);
      setShareState("copied");
      setTimeout(() => setShareState("idle"), 2500);
    } catch {
      setShareState("error");
      setTimeout(() => setShareState("idle"), 2500);
    }
  }, [characterId, shareState]);

  if (!activeCharacter) return null;

  const customConditions: CustomCondition[] = activeCharacter.customConditions ?? [];
  const activeConditions: string[] = activeCharacter.conditions ?? [];

  // Build the kicker line: Community · Ancestry · Class
  const communityName = communitiesData?.communities.find(
    (c) => c.communityId === activeCharacter.communityId
  )?.name ?? "Unknown";

  const ancestryName = ancestriesData?.ancestries.find(
    (a) => a.ancestryId === activeCharacter.ancestryId
  )?.name ?? "Unknown";

  const className = classesData?.classes.find(
    (c) => c.classId === activeCharacter.classId
  )?.name ?? "Unknown";

  const multiclassClassName = activeCharacter.multiclassClassId
    ? (classesData?.classes.find(
        (c) => c.classId === activeCharacter.multiclassClassId
      )?.name ?? activeCharacter.multiclassClassName ?? null)
    : null;

  // Build class display: "Warrior" or "Warrior / Bard" when multiclassed
  const classDisplay = multiclassClassName
    ? `${className} / ${multiclassClassName}`
    : className;

  const kickerParts: string[] = [];
  if (activeCharacter.communityId) kickerParts.push(communityName);
  if (activeCharacter.ancestryId)  kickerParts.push(ancestryName);
  if (activeCharacter.classId)     kickerParts.push(classDisplay);

  // Conditions collapsed display
  const activeConditionLabels = activeConditions.map((id) => {
    const custom = customConditions.find((c) => c.conditionId === id);
    return custom ? custom.name : id;
  });
  const MAX_CHIPS = 3;
  const visibleChips   = activeConditionLabels.slice(0, MAX_CHIPS);
  const overflowCount  = activeConditionLabels.length - MAX_CHIPS;

  return (
    <div className="space-y-4">
      {/* Portrait */}
      <PortraitDisplay characterId={characterId} />

      {/* ── Name row + Conditions + Level inline ───────────────────── */}
      <div className="flex items-start gap-3">
        {/* Name (flex-1 so it takes remaining space) */}
        <div className="flex-1 min-w-0 flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <EditableField
              field={CHARACTER_NAME_FIELD}
              activeClassName="ring-2 ring-[#577399]/60 rounded-lg"
            >
              <h1 className="text-4xl font-bold font-serif text-[#f7f7ff] leading-normal">
                {activeCharacter.name || "Unnamed Character"}
              </h1>
            </EditableField>

            {/* Pencil icon → builder */}
            <button
              type="button"
              onClick={() => router.push(`/character/${characterId}/build`)}
              className="
                group relative shrink-0 p-1.5 rounded-md
                text-[#b9baa3]/40 hover:text-[#577399] hover:bg-[#577399]/10
                transition-colors
                focus:outline-none focus:ring-2 focus:ring-[#577399]
              "
              aria-label="Open Character Builder"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path d="M2.695 14.763l-1.262 3.154a.5.5 0 00.65.65l3.155-1.262a4 4 0 001.343-.885L17.5 5.5a2.121 2.121 0 00-3-3L3.58 13.42a4 4 0 00-.885 1.343z" />
              </svg>
              <span className="
                pointer-events-none absolute -bottom-8 left-1/2 -translate-x-1/2
                whitespace-nowrap rounded bg-slate-800 px-2 py-1 text-xs text-[#f7f7ff]
                opacity-0 group-hover:opacity-100 transition-opacity
                border border-slate-700
              ">
                Character Builder
              </span>
            </button>

            {/* Share icon → copy public sheet URL */}
            <button
              type="button"
              onClick={handleShare}
              disabled={shareState === "loading"}
              className="
                group relative shrink-0 p-1.5 rounded-md
                text-[#b9baa3]/40 hover:text-[#577399] hover:bg-[#577399]/10
                transition-colors
                focus:outline-none focus:ring-2 focus:ring-[#577399]
                disabled:opacity-50 disabled:cursor-wait
              "
              aria-label={
                shareState === "copied" ? "Link copied!" :
                shareState === "error"  ? "Copy failed" :
                "Copy public sheet link"
              }
            >
              {shareState === "loading" ? (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 animate-spin">
                  <path fillRule="evenodd" d="M15.312 11.424a5.5 5.5 0 01-9.201 2.466l-.312-.311h2.433a.75.75 0 000-1.5H3.989a.75.75 0 00-.75.75v4.242a.75.75 0 001.5 0v-2.43l.31.31a7 7 0 0011.712-3.138.75.75 0 00-1.449-.389zm1.23-3.723a.75.75 0 00.219-.53V2.929a.75.75 0 00-1.5 0V5.36l-.31-.31A7 7 0 003.239 8.188a.75.75 0 101.448.389A5.5 5.5 0 0113.89 6.11l.311.31h-2.432a.75.75 0 000 1.5h4.243a.75.75 0 00.53-.219z" clipRule="evenodd" />
                </svg>
              ) : shareState === "copied" ? (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-green-400">
                  <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                </svg>
              ) : shareState === "error" ? (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-red-400">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                  <path d="M13 4.5a2.5 2.5 0 11.702 1.737L6.97 9.604a2.518 2.518 0 010 .792l6.733 3.367a2.5 2.5 0 11-.671 1.341l-6.733-3.367a2.5 2.5 0 110-3.474l6.733-3.366A2.52 2.52 0 0113 4.5z" />
                </svg>
              )}
              <span className={[
                "pointer-events-none absolute -bottom-8 left-1/2 -translate-x-1/2",
                "whitespace-nowrap rounded px-2 py-1 text-xs",
                "opacity-0 group-hover:opacity-100 transition-opacity",
                "border",
                shareState === "copied"
                  ? "bg-green-900 border-green-700 text-green-200"
                  : shareState === "error"
                  ? "bg-red-900 border-red-700 text-red-200"
                  : "bg-slate-800 border-slate-700 text-[#f7f7ff]",
              ].join(" ")}>
                {shareState === "copied" ? "Copied!" : shareState === "error" ? "Copy failed" : "Copy public link"}
              </span>
            </button>
          </div>

          {kickerParts.length > 0 && (
            <p className="text-sm text-[#b9baa3] font-serif">
              {kickerParts.join(" · ")}
            </p>
          )}
        </div>

        {/* Evasion + Armor Score — derived stats in the header */}
        <div className="flex-shrink-0 flex gap-2">
          <div className="flex flex-col items-center gap-1">
            <span className="text-xs uppercase tracking-widest text-parchment-500 font-medium hidden sm:block">
              Evasion
            </span>
            <output
              aria-label={`Evasion ${activeCharacter.derivedStats.evasion}`}
              className="w-12 rounded-lg border border-[#577399]/40 bg-slate-850 py-1.5 text-center text-2xl font-bold text-[#f7f7ff] font-serif leading-none"
            >
              {activeCharacter.derivedStats.evasion}
            </output>
          </div>
          <div className="flex flex-col items-center gap-1">
            <span className="text-xs uppercase tracking-widest text-parchment-500 font-medium hidden sm:block">
              Armor
            </span>
            <output
              aria-label={`Armor Score ${activeCharacter.derivedStats.armor}`}
              className="w-12 rounded-lg border border-[#577399]/40 bg-slate-850 py-1.5 text-center text-2xl font-bold text-[#f7f7ff] font-serif leading-none"
            >
              {activeCharacter.derivedStats.armor}
            </output>
          </div>
        </div>

        {/* Conditions — compact column, same width as Level */}
        <div className="flex-shrink-0 flex flex-col items-center gap-1">
          <span className="text-xs uppercase tracking-widest text-parchment-500 font-medium hidden sm:block">
            Conditions
          </span>
          <button
            type="button"
            onClick={() => setConditionsOpen(true)}
            aria-label={
              activeConditions.length === 0
                ? "Conditions: none active. Click to manage."
                : `Active conditions: ${activeConditionLabels.join(", ")}. Click to manage.`
            }
            aria-haspopup="dialog"
            aria-expanded={conditionsOpen}
            className="
              w-12 min-h-[2.75rem] rounded-lg border border-[#577399]/40 bg-slate-850 px-1 py-1.5
              flex flex-col items-center justify-center gap-0.5
              hover:border-[#577399] hover:bg-slate-800
              focus:outline-none focus:ring-2 focus:ring-[#577399] focus:ring-offset-1 focus:ring-offset-slate-900
              transition-colors cursor-pointer
            "
          >
            {activeConditions.length === 0 ? (
              <span className="text-xl font-bold text-[#b9baa3] font-serif leading-none">—</span>
            ) : (
              <>
                {visibleChips.map((label) => (
                  <span
                    key={label}
                    className="w-full text-center truncate rounded border border-[#577399]/60 bg-[#577399]/20 px-1 py-px text-xs font-semibold text-[#f7f7ff] leading-tight"
                  >
                    {label}
                  </span>
                ))}
                {overflowCount > 0 && (
                <span className="text-xs text-[#b9baa3] leading-tight">+{overflowCount}</span>
                )}
              </>
            )}
          </button>
        </div>

        {/* Level — flex-shrink-0 so it never wraps into the name */}
        <div className="flex-shrink-0 flex flex-col items-center gap-1" role="group" aria-label="Character Level">
          <span className="text-xs uppercase tracking-widest text-parchment-500 font-medium hidden sm:block">
            Level
          </span>
          <output
            aria-live="polite"
            aria-label={`Level ${activeCharacter.level}`}
            className="w-12 rounded-lg border border-[#577399]/40 bg-slate-850 py-1.5 text-center text-2xl font-bold text-[#f7f7ff] font-serif leading-none"
          >
            {activeCharacter.level}
          </output>
          {activeCharacter.level < 10 && (
            <button
              type="button"
              onClick={onLevelUp}
              aria-label="Level up character"
              className="
                min-h-[36px] rounded border border-[#577399]/40 bg-[#577399]/10 px-2 py-1
                text-xs font-semibold text-[#f7f7ff] whitespace-nowrap
                hover:bg-[#577399]/20 hover:border-[#577399]
                transition-all duration-150
                focus:outline-none focus:ring-2 focus:ring-[#577399] focus:ring-offset-1 focus:ring-offset-slate-900
              "
            >
              Level Up
            </button>
          )}
        </div>
      </div>

      {/* ── Subclass ─────────────────────────────────────────────── */}
      {!!classData?.subclasses.length && activeCharacter.subclassId && (
        <div className="pt-2 border-t border-[#577399]/20">
          <p className="text-xs uppercase tracking-widest text-[#b9baa3] font-medium">Subclass</p>
          <p className="mt-0.5 text-sm font-medium text-[#f7f7ff]">
            {classData.subclasses.find((sc) => sc.subclassId === activeCharacter.subclassId)?.name ?? "Unknown"}
          </p>
        </div>
      )}

      {/* Conditions slide-in panel */}
      <ConditionsSidebar
        open={conditionsOpen}
        onClose={() => setConditionsOpen(false)}
        conditions={SRD_CONDITIONS}
        customConditions={customConditions}
        activeConditions={activeConditions}
        onToggle={toggleCondition}
      />
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
            rounded-lg border border-[#577399]/40 bg-[#577399]/15 px-3 py-1.5
            text-xs font-semibold text-[#f7f7ff]
            hover:bg-[#577399]/25 hover:border-[#577399]
            disabled:opacity-50 disabled:cursor-wait
            transition-all duration-150
            focus:outline-none focus:ring-2 focus:ring-[#577399] focus:ring-offset-1 focus:ring-offset-slate-900
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
          <span className="text-xs text-[#b9baa3] font-medium">{costLabel}</span>
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

  // Fetch multiclass class data when the character has multiclassed
  const { data: multiclassData } = useClass(
    activeCharacter?.multiclassClassId ?? undefined
  );

  if (!activeCharacter || !classData) return null;

  const activeSubclass = classData.subclasses.find(
    (sc) => sc.subclassId === activeCharacter.subclassId
  );

  // Resolve multiclass subclass (Foundation features only — SRD: multiclassing
  // never grants Specialization or Mastery)
  const mcSubclass = multiclassData?.subclasses.find(
    (sc) => sc.subclassId === activeCharacter.multiclassSubclassId
  ) ?? null;

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
      className="rounded-xl border border-[#577399]/30 bg-slate-900/80 p-5 shadow-card space-y-4"
      aria-label="Features"
      data-field-key="features"
    >
      <h2 className="font-serif text-sm font-semibold uppercase tracking-widest text-[#577399]">
        Features
      </h2>

      {/* Class Features */}
      {(classData.classFeatures?.length ?? 0) > 0 && (
        <div className="space-y-2">
          {classData.classFeatures.length > 1 && (
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#577399]">
              Class Features
            </h3>
          )}
          {classData.classFeatures.map((feature) => (
            <div
              key={feature.name}
              className="rounded-lg border border-[#577399]/20 bg-slate-850 p-4 space-y-3"
            >
              <div>
                <h3 className="mb-1 font-serif text-sm font-semibold text-[#f7f7ff]">
                  {feature.name}
                </h3>
                <MarkdownContent className="text-sm text-[#b9baa3] leading-relaxed">
                  {feature.description}
                </MarkdownContent>
                {feature.options.length > 0 && (
                  <ul className="mt-2 space-y-0.5 list-disc list-outside pl-4">
                    {feature.options.map((opt) => (
                      <li key={opt} className="text-sm text-[#b9baa3]">
                        <MarkdownContent inline>{opt}</MarkdownContent>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Action button if this feature has a known mechanic */}
              {(() => {
                const action = classFeatureHasAction(feature.name);
                return action ? (
                  <FeatureActionButton
                    characterId={characterId}
                    label={`Use ${feature.name}`}
                    actionId={action.actionId}
                    params={action.params}
                    costLabel={action.costLabel}
                  />
                ) : null;
              })()}
            </div>
          ))}
        </div>
      )}

      {/* Hope Feature — always has a hopeCost; always gets an action button */}
      {classData.hopeFeature && (
        <div className="rounded-lg border border-[#577399]/30 bg-[#577399]/8 p-4 space-y-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-serif text-sm font-semibold text-[#f7f7ff]">
                {classData.hopeFeature.name}
              </h3>
              <span className="rounded bg-[#577399]/30 px-1.5 text-xs font-bold text-[#f7f7ff]">
                {classData.hopeFeature.hopeCost} Hope
              </span>
            </div>
            <MarkdownContent className="text-sm text-[#b9baa3] leading-relaxed">
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
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[#577399]">
            {activeSubclass.name} — Subclass Features
          </h3>

          {activeSubclass.foundationFeatures.map((feat) => {
            const action = classFeatureHasAction(feat.name);
            return (
              <div
                key={feat.name}
                className="rounded border border-[#577399]/20 bg-slate-900 p-3 space-y-2"
              >
                <div>
                  <p className="text-sm font-medium text-[#f7f7ff]">{feat.name}</p>
                  <MarkdownContent className="mt-0.5 text-sm text-[#b9baa3] leading-relaxed">
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
            <div className="rounded border border-[#577399]/30 bg-slate-900 p-3 space-y-2">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-sm font-medium text-[#f7f7ff]">
                    {activeSubclass.specializationFeature.name}
                  </p>
                  <span className="rounded bg-[#577399]/25 px-1.5 text-xs font-bold text-[#f7f7ff]">
                    Specialization
                  </span>
                </div>
                <MarkdownContent className="text-sm text-[#b9baa3] leading-relaxed">
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
            <div className="rounded border border-[#577399]/40 bg-slate-900 p-3 space-y-2">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-sm font-medium text-[#f7f7ff]">
                    {activeSubclass.masteryFeature.name}
                  </p>
                  <span className="rounded bg-[#577399]/35 px-1.5 text-xs font-bold text-[#f7f7ff]">
                    Mastery
                  </span>
                </div>
                <MarkdownContent className="text-sm text-[#b9baa3] leading-relaxed">
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

      {/* ── Multiclass features ───────────────────────────────────────────── */}
      {multiclassData && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#577399]">
              {multiclassData.name} — Multiclass Features
            </h3>
            <span className="rounded bg-[#577399]/20 px-1.5 text-xs font-bold text-[#f7f7ff]">
              Multiclass
            </span>
          </div>

          {/* Multiclass class features */}
          {(multiclassData.classFeatures?.length ?? 0) > 0 && (
            <div className="space-y-2">
              {multiclassData.classFeatures.length > 1 && (
                <h4 className="text-xs font-semibold uppercase tracking-wider text-[#577399]">
                  Class Features
                </h4>
              )}
              {multiclassData.classFeatures.map((feature) => (
                <div
                  key={feature.name}
                  className="rounded-lg border border-[#577399]/20 bg-slate-850 p-4 space-y-3"
                >
                  <div>
                    <h4 className="mb-1 font-serif text-sm font-semibold text-[#f7f7ff]">
                      {feature.name}
                    </h4>
                    <MarkdownContent className="text-sm text-[#b9baa3] leading-relaxed">
                      {feature.description}
                    </MarkdownContent>
                    {feature.options.length > 0 && (
                      <ul className="mt-2 space-y-0.5 list-disc list-outside pl-4">
                        {feature.options.map((opt) => (
                          <li key={opt} className="text-sm text-[#b9baa3]">
                            <MarkdownContent inline>{opt}</MarkdownContent>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  {(() => {
                    const action = classFeatureHasAction(feature.name);
                    return action ? (
                      <FeatureActionButton
                        characterId={characterId}
                        label={`Use ${feature.name}`}
                        actionId={action.actionId}
                        params={action.params}
                        costLabel={action.costLabel}
                      />
                    ) : null;
                  })()}
                </div>
              ))}
            </div>
          )}

          {/* Multiclass subclass Foundation features (no Specialization / Mastery) */}
          {mcSubclass && mcSubclass.foundationFeatures.map((feat) => {
            const action = classFeatureHasAction(feat.name);
            return (
              <div
                key={feat.name}
                className="rounded border border-[#577399]/20 bg-slate-900 p-3 space-y-2"
              >
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-sm font-medium text-[#f7f7ff]">{feat.name}</p>
                    <span className="rounded bg-[#577399]/15 px-1.5 text-xs font-semibold text-[#b9baa3]">
                      Foundation
                    </span>
                  </div>
                  <MarkdownContent className="text-sm text-[#b9baa3] leading-relaxed">
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
        </div>
      )}

      {/* Domain loadout */}
      <div>
        <DomainLoadout />
      </div>
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
      <span role="status" aria-live="polite" className="text-xs text-[#577399]">
        Unsaved changes
      </span>
    );
  }
  return (
    <span role="status" aria-live="polite" className="text-xs text-[#b9baa3]">
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
        className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-[#577399] border-t-transparent"
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
        className="rounded-xl border border-[#577399]/40 bg-slate-900 p-8 text-center"
      >
        <p className="font-serif text-lg text-[#f7f7ff]">
          Failed to load character
        </p>
        <p className="mt-1 text-sm text-[#b9baa3]">
          {(error as Error)?.message ?? "An unexpected error occurred."}
        </p>
      </div>
    );
  }

  if (!activeCharacter) return null;

  return (
    <EditSidebarProvider characterId={characterId}>
      <CharacterSheetContent 
        characterId={characterId}
        classData={classData}
        isDirty={isDirty}
        isSaving={isSaving}
        downtimeOpen={downtimeOpen}
        setDowntimeOpen={setDowntimeOpen}
        levelUpOpen={levelUpOpen}
        setLevelUpOpen={setLevelUpOpen}
      />
    </EditSidebarProvider>
  );
}

// ─── Inner content component (wrapped by provider) ────────────────────────────

interface CharacterSheetContentProps {
  characterId: string;
  classData: ClassData | null | undefined;
  isDirty: boolean;
  isSaving: boolean;
  downtimeOpen: boolean;
  setDowntimeOpen: (open: boolean) => void;
  levelUpOpen: boolean;
  setLevelUpOpen: (open: boolean) => void;
}

function CharacterSheetContent({
  characterId,
  classData,
  isDirty,
  isSaving,
  downtimeOpen,
  setDowntimeOpen,
  levelUpOpen,
  setLevelUpOpen,
}: CharacterSheetContentProps) {
  const { activeCharacter } = useCharacterStore();

  if (!activeCharacter) return null;

  // Determine spellcast trait for dividers
  const spellcastTrait = classData?.subclasses.find(
    (sc) => sc.subclassId === activeCharacter.subclassId
  )?.spellcastTrait ?? null;

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
            rounded-lg border border-[#577399]/40 bg-[#577399]/15 px-4 py-1.5
            text-sm font-semibold text-[#f7f7ff]
            hover:bg-[#577399]/25 hover:border-[#577399] transition-colors shadow-card
            focus:outline-none focus:ring-2 focus:ring-[#577399] focus:ring-offset-2 focus:ring-offset-slate-950
          "
        >
          Downtime / Rest
        </button>
      </div>

      {/* Header card */}
      <section
        className="rounded-xl border border-[#577399]/30 bg-slate-900/80 p-5 shadow-card"
        data-field-key="header"
      >
        <SheetHeader characterId={characterId} classData={classData} onLevelUp={() => setLevelUpOpen(true)} />
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

      <SheetDivider spellcastTrait={spellcastTrait} />

      {/* Trackers, weapons, hope, experiences */}
      <TrackersPanel />

      <SheetDivider spellcastTrait={spellcastTrait} />

      {/* Features, loadout */}
      <FeaturesPanel classData={classData} characterId={characterId} />

      <SheetDivider spellcastTrait={spellcastTrait} />

      {/* Equipment and gold */}
      <EquipmentPanel />

      <SheetDivider spellcastTrait={spellcastTrait} />

      {/* Favors — per-faction social currency */}
      <FavorsPanel />

      <SheetDivider spellcastTrait={spellcastTrait} />

      {/* Companion (shown only if companionState is not null) */}
      <CompanionPanel />

      {/* Downtime projects */}
      <DowntimeProjectsPanel />

      {/* Notes */}
      <section
        className="rounded-xl border border-[#577399]/30 bg-slate-900/80 p-5 shadow-card"
        aria-label="Notes"
        data-field-key="notes"
      >
        <h2 className="mb-3 font-serif text-sm font-semibold uppercase tracking-widest text-[#577399]">
          Notes
        </h2>
        <EditableField
          field={CHARACTER_NOTES_FIELD}
          className="block w-full text-left"
          activeClassName="ring-2 ring-[#577399]/60 rounded-lg"
        >
          <div
            className="
              w-full rounded border border-[#577399]/20 bg-slate-950
              px-3 py-2 text-sm text-[#b9baa3] 
              min-h-[8rem] whitespace-pre-wrap break-words
            "
          >
            {activeCharacter.notes ?? (
              <span className="text-[#b9baa3]/50">
                Free-form notes, backstory, session reminders…
              </span>
            )}
          </div>
        </EditableField>
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
