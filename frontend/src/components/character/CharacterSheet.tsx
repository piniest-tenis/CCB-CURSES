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
import dynamic from "next/dynamic";
import { useCharacter, useUpdateCharacter } from "@/hooks/useCharacter";
import {
  useAncestries,
  useClass,
  useClasses,
  useCommunities,
} from "@/hooks/useGameData";
import { useCampaignDetail } from "@/hooks/useCampaigns";
import { useCharacterStore } from "@/store/characterStore";
import { apiClient } from "@/lib/api";
import { StatsPanel } from "./StatsPanel";
import { TrackersPanel } from "./TrackersPanel";
import { DomainLoadout } from "./DomainLoadout";
import { CompanionPanel } from "./CompanionPanel";
import { DowntimeProjectsPanel } from "./DowntimeProjectsPanel";
import { useActionButton, InlineActionError } from "./ActionButton";
import { EditSidebarProvider, EditableField } from "./EditSidebar";
import {
  CHARACTER_NAME_FIELD,
  CHARACTER_NOTES_FIELD,
} from "./editSidebarConfig";
import { EquipmentPanel } from "./EquipmentPanel";
import { FavorsPanel } from "./FavorsPanel";
import { PortraitDisplay } from "./PortraitUpload";
import { isHomebrewId, deletedHomebrewLabel } from "@/lib/homebrewUtils";
import { useDiceStore } from "@/store/diceStore";
import type {
  Character,
  ClassData,
  CoreStatName,
  CustomCondition,
  DiceColorPrefs,
} from "@shared/types";
import {
  SYSTEM_DEFAULTS,
  resolveDiceColors,
  resolveGmDiceColor,
  buildColorOverrides,
} from "@/lib/diceColorResolver";
import { useAuthStore } from "@/store/authStore";
import { StatTooltip } from "./StatTooltip";

// ── Lazy-loaded components (modals / panels not needed for first paint) ──────

const DowntimeModal = dynamic(
  () => import("./DowntimeModal").then((m) => m.DowntimeModal),
  { ssr: false }
);

const LevelUpWizard = dynamic(
  () => import("./LevelUpWizard").then((m) => m.LevelUpWizard),
  { ssr: false }
);

const MarkdownContent = dynamic(
  () => import("@/components/MarkdownContent").then((m) => m.MarkdownContent),
  { ssr: false }
);

const DiceRollerPanel = dynamic(
  () => import("@/components/dice/DiceRollerPanel").then((m) => m.DiceRollerPanel),
  { ssr: false }
);

const DiceLog = dynamic(
  () => import("@/components/dice/DiceLog").then((m) => m.DiceLog),
  { ssr: false }
);

const DiceColorEditor = dynamic(
  () => import("@/components/dice/DiceColorEditor").then((m) => m.DiceColorEditor),
  { ssr: false }
);
import { useStatBreakdowns } from "@/hooks/useStatBreakdowns";
import { usePatreonGate, usePatreonOAuth } from "@/hooks/usePatreonGate";
import { useSourceFilterDefault } from "@/hooks/useSourceFilterDefault";
import { ViewerModeProvider } from "./ViewerModeContext";
import { DisabledInViewerMode } from "./DisabledInViewerMode";

// ─── Props ────────────────────────────────────────────────────────────────────

interface CharacterSheetProps {
  characterId: string;
  /** When true, interactive controls (edits, dice rolls, actions) are hidden or disabled. */
  viewerMode?: boolean;
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
//
// Sections:
//   1. SRD Conditions    — always visible (7 standard conditions)
//   2. Curses! Conditions — visible when user's source filter includes "curses" content
//   3. Campaign Conditions — domain-card conditions already on the character
//   4. Custom Conditions   — user-created ad-hoc conditions with add/remove
//   (Homebrew conditions — future-proof; shown when available from campaign)

interface ConditionsSidebarProps {
  open: boolean;
  onClose: () => void;
  conditions: readonly string[];
  customConditions: CustomCondition[];
  activeConditions: string[];
  onToggle: (id: string) => void;
  onAddCustom: (name: string, description?: string) => void;
  onRemoveCustom: (conditionId: string) => void;
}

function ConditionsSidebar({
  open,
  onClose,
  conditions,
  customConditions,
  activeConditions,
  onToggle,
  onAddCustom,
  onRemoveCustom,
}: ConditionsSidebarProps) {
  const headingId = React.useId();
  const panelRef = React.useRef<HTMLDivElement>(null);
  const sourceDefault = useSourceFilterDefault();
  const showCurses = sourceDefault === "curses" || sourceDefault === "all";

  // ── "Add Custom" form state ──────────────────────────────────────────────
  const [addingCustom, setAddingCustom] = React.useState(false);
  const [customName, setCustomName] = React.useState("");
  const [customDesc, setCustomDesc] = React.useState("");
  const nameInputRef = React.useRef<HTMLInputElement>(null);

  // Separate campaign conditions (from domain cards) vs user-created customs
  const campaignConditions = customConditions.filter((c) => c.sourceCardId !== null);
  const userCustomConditions = customConditions.filter((c) => c.sourceCardId === null);

  const handleAddCustom = () => {
    const trimmed = customName.trim();
    if (!trimmed) return;
    onAddCustom(trimmed, customDesc.trim() || undefined);
    setCustomName("");
    setCustomDesc("");
    setAddingCustom(false);
  };

  const handleCancelAdd = () => {
    setCustomName("");
    setCustomDesc("");
    setAddingCustom(false);
  };

  // Focus the name input when the add form opens
  React.useEffect(() => {
    if (addingCustom) {
      const t = setTimeout(() => nameInputRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [addingCustom]);

  // Focus first focusable element when opened
  React.useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => {
      const first = panelRef.current?.querySelector<HTMLElement>(
        'button, input, [tabindex]:not([tabindex="-1"])',
      );
      first?.focus();
    }, 50);
    return () => clearTimeout(t);
  }, [open]);

  // Escape to close
  React.useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        if (addingCustom) {
          handleCancelAdd();
        } else {
          onClose();
        }
      }
    };
    document.addEventListener("keydown", handler, true);
    return () => document.removeEventListener("keydown", handler, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, onClose, addingCustom]);

  // Reset add form when sidebar closes
  React.useEffect(() => {
    if (!open) {
      setAddingCustom(false);
      setCustomName("");
      setCustomDesc("");
    }
  }, [open]);

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
          "fixed inset-y-0 right-0 z-50 flex h-full w-full max-w-[28rem] flex-col py-12",
          "border-l border-steel-400/35 bg-[#0f1713] shadow-2xl",
          "transition-transform duration-300 ease-in-out",
          open ? "translate-x-0" : "translate-x-full",
        ].join(" ")}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-steel-400/25 px-5 py-4">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] sidebar-text-secondary">
              Character
            </p>
            <h2
              id={headingId}
              className="font-serif text-lg font-semibold text-[#f7f7ff]"
            >
              Conditions
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close conditions panel"
            className="flex h-11 w-11 items-center justify-center rounded-lg border border-steel-400/30 text-[#b9baa3] hover:bg-steel-400/12 hover:text-[#f7f7ff] focus:outline-none focus:ring-2 focus:ring-steel-400"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6">
          {/* ── 1. SRD Conditions ── */}
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
                          ? "border-steel-400 bg-steel-400/20 text-[#f7f7ff]"
                          : "border-transparent hover:border-steel-400/40 hover:bg-slate-800/50 text-[#b9baa3]",
                      ].join(" ")}
                    >
                      <input
                        id={inputId}
                        type="checkbox"
                        checked={checked}
                        onChange={() => onToggle(cond)}
                        className="h-4 w-4 rounded border-steel-400/60 bg-slate-900 accent-steel-400 focus:ring-2 focus:ring-steel-400"
                      />
                      <span className="text-sm font-medium">{cond}</span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </fieldset>

          {/* ── 2. Curses! Conditions (gated by source filter) ── */}
          {showCurses && (
            <fieldset>
              <legend className="text-xs font-semibold uppercase tracking-[0.2em] text-coral-400/80 mb-3">
                <i className="fa-solid fa-fire mr-1.5 text-[0.6rem]" aria-hidden="true" />
                Curses! Conditions
              </legend>
              <p className="text-xs text-[#b9baa3]/60 italic px-3">
                No Curses! conditions available yet. Check back after a future update.
              </p>
            </fieldset>
          )}

          {/* ── 3. Campaign Conditions (from domain cards) ── */}
          {campaignConditions.length > 0 && (
            <fieldset>
              <legend className="text-xs font-semibold uppercase tracking-[0.2em] sidebar-text-secondary mb-3">
                Campaign Conditions{" "}
                <span className="normal-case font-normal opacity-60">
                  (domain cards)
                </span>
              </legend>
              <ul className="space-y-1" role="list">
                {campaignConditions.map((cond) => {
                  const checked = activeConditions.includes(cond.conditionId);
                  const inputId = `cond-campaign-${cond.conditionId}`;
                  return (
                    <li key={cond.conditionId}>
                      <label
                        htmlFor={inputId}
                        className={[
                          "flex items-start gap-3 rounded-lg px-3 py-3 cursor-pointer",
                          "border transition-colors",
                          checked
                            ? "border-steel-400 bg-steel-400/20 text-[#f7f7ff]"
                            : "border-transparent hover:border-steel-400/40 hover:bg-slate-800/50 text-parchment-400",
                        ].join(" ")}
                      >
                        <input
                          id={inputId}
                          type="checkbox"
                          checked={checked}
                          onChange={() => onToggle(cond.conditionId)}
                          className="mt-0.5 h-4 w-4 rounded border-steel-400/60 bg-slate-900 accent-steel-400 focus:ring-2 focus:ring-steel-400"
                        />
                        <span className="flex flex-col gap-0.5">
                          <span className="text-sm font-medium">
                            <span
                              aria-hidden="true"
                              className="mr-1 text-xs sidebar-text-secondary"
                            >
                              ✦
                            </span>
                            {cond.name}
                          </span>
                          {cond.description && (
                            <span className="text-sm sidebar-text-secondary">
                              {cond.description}
                            </span>
                          )}
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            </fieldset>
          )}

          {/* ── 4. Custom Conditions (user-created) ── */}
          <fieldset>
            <legend className="text-xs font-semibold uppercase tracking-[0.2em] sidebar-text-secondary mb-3">
              Custom Conditions
            </legend>

            {/* Existing user-created customs */}
            {userCustomConditions.length > 0 && (
              <ul className="space-y-1 mb-3" role="list">
                {userCustomConditions.map((cond) => {
                  const checked = activeConditions.includes(cond.conditionId);
                  const inputId = `cond-user-${cond.conditionId}`;
                  return (
                    <li key={cond.conditionId} className="group relative">
                      <label
                        htmlFor={inputId}
                        className={[
                          "flex items-start gap-3 rounded-lg px-3 py-3 pr-9 cursor-pointer",
                          "border transition-colors",
                          checked
                            ? "border-amber-500/50 bg-amber-500/10 text-[#f7f7ff]"
                            : "border-transparent hover:border-steel-400/40 hover:bg-slate-800/50 text-parchment-400",
                        ].join(" ")}
                      >
                        <input
                          id={inputId}
                          type="checkbox"
                          checked={checked}
                          onChange={() => onToggle(cond.conditionId)}
                          className="mt-0.5 h-4 w-4 rounded border-steel-400/60 bg-slate-900 accent-steel-400 focus:ring-2 focus:ring-steel-400"
                        />
                        <span className="flex flex-col gap-0.5 flex-1 min-w-0">
                          <span className="text-sm font-medium truncate">{cond.name}</span>
                          {cond.description && (
                            <span className="text-sm sidebar-text-secondary">
                              {cond.description}
                            </span>
                          )}
                        </span>
                      </label>
                      {/* Delete button — visible on hover/focus */}
                      <button
                        type="button"
                        onClick={() => onRemoveCustom(cond.conditionId)}
                        aria-label={`Remove custom condition: ${cond.name}`}
                        className="absolute right-2 top-1/2 -translate-y-1/2 flex h-6 w-6 items-center justify-center rounded text-[#b9baa3]/40 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 hover:text-coral-400 hover:bg-coral-400/10 transition-all focus:outline-none focus:ring-2 focus:ring-coral-400 focus:opacity-100"
                      >
                        <i className="fa-solid fa-xmark text-xs" aria-hidden="true" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}

            {/* Add Custom form / button */}
            {addingCustom ? (
              <div className="rounded-lg border border-steel-400/30 bg-slate-900/60 p-3 space-y-3">
                <div>
                  <label
                    htmlFor="custom-cond-name"
                    className="block text-xs font-medium text-[#b9baa3] mb-1"
                  >
                    Name <span className="text-coral-400">*</span>
                  </label>
                  <input
                    ref={nameInputRef}
                    id="custom-cond-name"
                    type="text"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleAddCustom();
                    }}
                    placeholder="e.g. Blinded"
                    maxLength={60}
                    className="w-full rounded-md border border-steel-400/40 bg-slate-850 px-3 py-2 text-sm text-[#f7f7ff] placeholder:text-[#b9baa3]/40 focus:outline-none focus:ring-2 focus:ring-steel-400 focus:border-steel-400"
                  />
                </div>
                <div>
                  <label
                    htmlFor="custom-cond-desc"
                    className="block text-xs font-medium text-[#b9baa3] mb-1"
                  >
                    Description <span className="text-[#b9baa3]/40">(optional)</span>
                  </label>
                  <input
                    id="custom-cond-desc"
                    type="text"
                    value={customDesc}
                    onChange={(e) => setCustomDesc(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleAddCustom();
                    }}
                    placeholder="Brief effect description"
                    maxLength={200}
                    className="w-full rounded-md border border-steel-400/40 bg-slate-850 px-3 py-2 text-sm text-[#f7f7ff] placeholder:text-[#b9baa3]/40 focus:outline-none focus:ring-2 focus:ring-steel-400 focus:border-steel-400"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleAddCustom}
                    disabled={!customName.trim()}
                    className="flex-1 rounded-md border border-steel-400/40 bg-steel-400/15 px-3 py-2 text-xs font-semibold text-[#f7f7ff] hover:bg-steel-400/25 disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-steel-400 transition-colors"
                  >
                    Add Condition
                  </button>
                  <button
                    type="button"
                    onClick={handleCancelAdd}
                    className="rounded-md border border-steel-400/20 px-3 py-2 text-xs text-[#b9baa3] hover:text-[#f7f7ff] hover:border-steel-400/40 focus:outline-none focus:ring-2 focus:ring-steel-400 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setAddingCustom(true)}
                className="flex items-center gap-2 rounded-lg border border-dashed border-steel-400/30 px-3 py-3 text-sm text-[#b9baa3]/70 hover:border-steel-400/50 hover:text-[#b9baa3] hover:bg-slate-800/30 transition-colors w-full focus:outline-none focus:ring-2 focus:ring-steel-400"
              >
                <i className="fa-solid fa-plus text-xs" aria-hidden="true" />
                Add Custom Condition
              </button>
            )}
          </fieldset>
        </div>

        {/* Footer */}
        <div className="border-t border-steel-400/25 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-xl border border-steel-400/40 bg-steel-400/15 px-4 py-3 text-sm font-semibold text-[#f7f7ff] hover:bg-steel-400/25 focus:outline-none focus:ring-2 focus:ring-steel-400"
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
  presence: "/images/ui-elements/divider-presence-agility.svg",
  agility: "/images/ui-elements/divider-presence-agility.svg",
  strength: "/images/ui-elements/divider-strength-finesse.svg",
  finesse: "/images/ui-elements/divider-strength-finesse.svg",
  knowledge: "/images/ui-elements/divider-knowledge-instinct.svg",
  instinct: "/images/ui-elements/divider-knowledge-instinct.svg",
};

function SheetDivider({
  spellcastTrait,
}: {
  spellcastTrait?: CoreStatName | null;
}) {
  const src = spellcastTrait ? DIVIDER_MAP[spellcastTrait] : null;
  if (!src) {
    return (
      <div className="my-1 border-t border-steel-400/15" aria-hidden="true" />
    );
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
  isDirty?: boolean;
  isSaving?: boolean;
}

type ShareState = "idle" | "loading" | "copied" | "error";

function SheetHeader({
  characterId,
  classData,
  onLevelUp,
  isDirty = false,
}: SheetHeaderProps) {
  const router = useRouter();
  const { activeCharacter, toggleCondition, updateField, addCustomCondition, removeCustomCondition } = useCharacterStore();
  const { data: classesData } = useClasses();
  const { data: communitiesData } = useCommunities();
  const statBreakdowns = useStatBreakdowns();
  const { data: ancestriesData } = useAncestries();
  const [conditionsOpen, setConditionsOpen] = React.useState(false);
  const [shareState, setShareState] = React.useState<ShareState>("idle");
  const [diceColorsOpen, setDiceColorsOpen] = React.useState(false);
  const userPrefs = useAuthStore((s) => s.user?.preferences);
  const { canAccessCampaigns, canLevelUp, needsPatreon } = usePatreonGate();
  const { startOAuth, isLinking } = usePatreonOAuth();
  const diceColorsGated = !canAccessCampaigns;

  const handleShare = React.useCallback(async () => {
    if (shareState === "loading") return;
    setShareState("loading");
    try {
      const data = await apiClient.get<{
        shareToken: string;
        shareUrl: string;
      }>(`/characters/${characterId}/share`);
      const origin =
        typeof window !== "undefined" ? window.location.origin : "";
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

  const customConditions: CustomCondition[] =
    activeCharacter.customConditions ?? [];
  const activeConditions: string[] = activeCharacter.conditions ?? [];

  // Build the kicker line: Community · Ancestry · Class
  const communityName =
    communitiesData?.communities.find(
      (c) => c.communityId === activeCharacter.communityId,
    )?.name ??
    (isHomebrewId(activeCharacter.communityId)
      ? deletedHomebrewLabel(activeCharacter.communityName, activeCharacter.communityId)
      : "Unknown");

  const ancestryName =
    ancestriesData?.ancestries.find(
      (a) => a.ancestryId === activeCharacter.ancestryId,
    )?.name ??
    (isHomebrewId(activeCharacter.ancestryId)
      ? deletedHomebrewLabel(activeCharacter.ancestryName, activeCharacter.ancestryId)
      : "Unknown");

  const className =
    classesData?.classes.find((c) => c.classId === activeCharacter.classId)
      ?.name ??
    (isHomebrewId(activeCharacter.classId)
      ? deletedHomebrewLabel(activeCharacter.className, activeCharacter.classId)
      : "Unknown");

  const multiclassClassName = activeCharacter.multiclassClassId
    ? (classesData?.classes.find(
        (c) => c.classId === activeCharacter.multiclassClassId,
      )?.name ??
      activeCharacter.multiclassClassName ??
      null)
    : null;

  // Build class display: "Warrior" or "Warrior / Bard" when multiclassed
  const classDisplay = multiclassClassName
    ? `${className} / ${multiclassClassName}`
    : className;

  const kickerParts: string[] = [];
  if (activeCharacter.communityId) kickerParts.push(communityName);
  if (activeCharacter.ancestryId) kickerParts.push(ancestryName);

  // Resolve subclass name for the kicker line
  const subclassName =
    (classData?.subclasses ?? []).find(
      (sc) => sc.subclassId === activeCharacter.subclassId,
    )?.name ?? null;

  // Build class display with subclass appended: "Warrior (Stalwart)"
  const classWithSubclass = subclassName
    ? `${classDisplay} (${subclassName})`
    : classDisplay;

  // Detect deleted homebrew references
  const deletedHomebrewItems: string[] = [];
  if (
    activeCharacter.classId &&
    isHomebrewId(activeCharacter.classId) &&
    !classesData?.classes.find((c) => c.classId === activeCharacter.classId)
  ) {
    deletedHomebrewItems.push(`Class: ${activeCharacter.className || activeCharacter.classId}`);
  }
  if (
    activeCharacter.ancestryId &&
    isHomebrewId(activeCharacter.ancestryId) &&
    !ancestriesData?.ancestries.find((a) => a.ancestryId === activeCharacter.ancestryId)
  ) {
    deletedHomebrewItems.push(`Ancestry: ${activeCharacter.ancestryName || activeCharacter.ancestryId}`);
  }
  if (
    activeCharacter.communityId &&
    isHomebrewId(activeCharacter.communityId) &&
    !communitiesData?.communities.find((c) => c.communityId === activeCharacter.communityId)
  ) {
    deletedHomebrewItems.push(`Community: ${activeCharacter.communityName || activeCharacter.communityId}`);
  }

  // Conditions collapsed display
  const activeConditionLabels = activeConditions.map((id) => {
    const custom = customConditions.find((c) => c.conditionId === id);
    return custom ? custom.name : id;
  });
  const MAX_CHIPS = 3;
  const visibleChips = activeConditionLabels.slice(0, MAX_CHIPS);
  const overflowCount = activeConditionLabels.length - MAX_CHIPS;

  return (
    <div className="space-y-4">
      {/* Deleted homebrew warning banner */}
      {deletedHomebrewItems.length > 0 && (
        <div
          role="alert"
          className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm text-amber-400/90"
        >
          <p className="font-semibold">Some homebrew content used by this character has been deleted:</p>
          <ul className="list-disc pl-5 mt-1 space-y-0.5 text-xs">
            {deletedHomebrewItems.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <p className="mt-1.5 text-xs text-amber-400/70">
            Use the character builder to select replacement content, or re-create the homebrew.
          </p>
        </div>
      )}

      {/* Portrait */}
      <PortraitDisplay characterId={characterId} />

      {/* ── Name row + Conditions + Level inline ───────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        {/* Name (flex-1 so it takes remaining space) */}
        <div className="flex-1 min-w-0 flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <EditableField
              field={CHARACTER_NAME_FIELD}
              activeClassName="ring-2 ring-steel-400/60 rounded-lg"
            >
              <h1 className="text-4xl font-bold font-serif text-[#f7f7ff] leading-normal">
                {activeCharacter.name || "Unnamed Character"}
              </h1>
            </EditableField>
          </div>

          {(kickerParts.length > 0 || activeCharacter.classId) && (
            <p className="text-sm text-[#b9baa3] font-serif">
              {kickerParts.join(" · ")}
              {activeCharacter.classId && (
                <>
                  {kickerParts.length > 0 && " · "}
                  <span className="font-semibold text-[#f7f7ff]">
                    {classWithSubclass}
                  </span>
                </>
              )}
            </p>
          )}
        </div>

        {/* Evasion + Armor Score — defensive stats group */}
        <div
          className="flex-shrink-0 flex items-center gap-3 rounded-xl bg-steel-400/[0.06] px-2 py-0.5"
          role="group"
          aria-label="Defensive Stats"
        >
          <div
            className="flex flex-col items-center gap-1.5"
            data-field-key="sheet.evasion"
          >
            <span className="flex items-center gap-1 text-[11px] sm:text-xs uppercase tracking-widest text-steel-accessible font-semibold">
              <i className="fa-solid fa-shield-halved text-[10px] sm:text-[11px] opacity-80" aria-hidden="true"></i>
              Evasion
            </span>
            <StatTooltip
              lines={statBreakdowns.evasion}
              srdRef="SRD p. 22"
              ariaLabel="How Evasion is calculated"
            >
              <span
                role="status"
                aria-label={`Evasion ${activeCharacter.derivedStats.evasion}`}
                className="flex items-center justify-center w-14 min-h-[2.75rem] rounded-lg border-2 border-steel-400/50 bg-slate-850 py-2 text-center text-3xl font-bold text-[#f7f7ff] leading-none hover:border-steel-400 hover:bg-steel-400/[0.08] transition-colors tabular-nums"
              >
                {activeCharacter.derivedStats.evasion}
              </span>
            </StatTooltip>
          </div>
          <div
            className="flex flex-col items-center gap-1.5"
            data-field-key="sheet.armor"
          >
            <span className="flex items-center gap-1 text-[11px] sm:text-xs uppercase tracking-widest text-steel-accessible font-semibold">
              <i className="fa-solid fa-shield text-[10px] sm:text-[11px] opacity-80" aria-hidden="true"></i>
              Armor
            </span>
            <StatTooltip
              lines={statBreakdowns.armor}
              srdRef="SRD p. 29"
              ariaLabel="How Armor Score is calculated"
            >
              <span
                role="status"
                aria-label={`Armor Score ${activeCharacter.derivedStats.armor}`}
                className="flex items-center justify-center w-14 min-h-[2.75rem] rounded-lg border-2 border-steel-400/50 bg-slate-850 py-2 text-center text-3xl font-bold text-[#f7f7ff] leading-none hover:border-steel-400 hover:bg-steel-400/[0.08] transition-colors tabular-nums"
              >
                {activeCharacter.derivedStats.armor}
              </span>
            </StatTooltip>
          </div>
        </div>

        {/* Conditions — matches defensive-stat visual language, gold/coral theme */}
        <DisabledInViewerMode tooltip="Only the owner can toggle conditions">
        <div
          className="flex-shrink-0 flex flex-col items-center gap-1.5"
          data-field-key="sheet.conditions"
        >
          <span className="flex items-center gap-1 text-[11px] sm:text-xs uppercase tracking-widest text-gold-400 font-semibold">
            <i className="fa-solid fa-bolt text-[10px] sm:text-[11px] opacity-80" aria-hidden="true"></i>
            Cond.
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
            className={[
              "flex items-center justify-center w-14 min-h-[2.75rem] rounded-lg border-2 py-2",
              "text-center text-2xl font-bold leading-none tabular-nums",
              "focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-offset-slate-900",
              "transition-colors cursor-pointer",
              activeConditions.length === 0
                ? "border-gold-400/40 bg-slate-850 text-[#b9baa3] hover:border-gold-400/70 hover:bg-gold-400/[0.06] focus:ring-gold-400"
                : activeConditions.length >= 3
                  ? "border-coral-400/60 bg-coral-400/[0.12] text-coral-400 hover:border-coral-400/80 hover:bg-coral-400/[0.16] focus:ring-coral-400 animate-coral-pulse"
                  : "border-coral-400/50 bg-coral-400/[0.08] text-[#f7f7ff] hover:border-coral-400/70 hover:bg-coral-400/[0.12] focus:ring-coral-400",
            ].join(" ")}
          >
            {activeConditions.length === 0 ? "—" : activeConditions.length}
          </button>
        </div>
        </DisabledInViewerMode>

        {/* Level — matches defensive-stat visual language, gold/amber theme */}
        <div
          className="flex-shrink-0 flex flex-col items-center gap-1.5"
          role="group"
          aria-label="Character Level"
          data-field-key="sheet.level"
        >
          <span className="flex items-center gap-1 text-[11px] sm:text-xs uppercase tracking-widest text-gold-400 font-semibold">
            <i className="fa-solid fa-circle-up text-[10px] sm:text-[11px] opacity-80" aria-hidden="true"></i>
            Level
          </span>
          <span
            role="status"
            aria-live="polite"
            aria-label={`Level ${activeCharacter.level}`}
            className="flex items-center justify-center w-14 min-h-[2.75rem] rounded-lg border-2 border-amber-500/40 bg-slate-850 py-2 text-center text-2xl font-bold text-[#f7f7ff] leading-none tabular-nums"
          >
            {activeCharacter.level}
          </span>
        </div>
      </div>

      {/* ── Actions Toolbar (Edit, Share, Level Up) ──── */}
      <div className="flex items-center gap-2 rounded-lg border border-steel-400/20 bg-slate-900/60 px-3 py-2">
        {/* Edit — pill button */}
        <DisabledInViewerMode hideInstead>
        <button
          type="button"
          onClick={() => router.push(`/character/${characterId}/build`)}
          data-field-key="sheet.edit"
          className="
            flex items-center gap-1.5 rounded-full border border-steel-400/30 bg-transparent
            px-3 py-1.5 text-xs font-semibold text-[#b9baa3]
            hover:border-amber-500 hover:text-amber-500
            transition-all duration-150 sm:[transition-delay:0.5s]
            focus:outline-none focus:ring-2 focus:ring-amber-500
          "
          aria-label="Open Character Builder"
        >
          <i className="fa-solid fa-pen text-[11px]" aria-hidden="true"></i>
          <span>Edit</span>
        </button>
        </DisabledInViewerMode>

        {/* Share — pill button */}
        <DisabledInViewerMode hideInstead>
        <button
          type="button"
          onClick={handleShare}
          disabled={shareState === "loading"}
          data-field-key="sheet.share"
          className={[
            "flex items-center gap-1.5 rounded-full border bg-transparent",
            "px-3 py-1.5 text-xs font-semibold",
            "transition-all duration-150 sm:[transition-delay:0.5s]",
            "focus:outline-none focus:ring-2 focus:ring-amber-500",
            "disabled:opacity-50 disabled:cursor-wait",
            shareState === "copied"
              ? "border-green-500/50 text-green-400"
              : shareState === "error"
                ? "border-red-500/50 text-red-400"
                : "border-steel-400/30 text-[#b9baa3] hover:border-amber-500 hover:text-amber-500",
          ].join(" ")}
          aria-label={
            shareState === "copied"
              ? "Link copied!"
              : shareState === "error"
                ? "Copy failed"
                : "Copy public sheet link"
          }
        >
          {shareState === "loading" ? (
            <i className="fa-solid fa-arrows-rotate text-[11px] animate-spin" aria-hidden="true"></i>
          ) : shareState === "copied" ? (
            <i className="fa-solid fa-check text-[11px]" aria-hidden="true"></i>
          ) : shareState === "error" ? (
            <i className="fa-solid fa-circle-exclamation text-[11px]" aria-hidden="true"></i>
          ) : (
            <i className="fa-solid fa-share-nodes text-[11px]" aria-hidden="true"></i>
          )}
          <span>
            {shareState === "copied"
              ? "Copied!"
              : shareState === "error"
                ? "Failed"
                : "Share"}
          </span>
        </button>
        </DisabledInViewerMode>

        {/* Level Up — right-aligned, with Patreon gate */}
        <DisabledInViewerMode tooltip="Only the owner can level up">
        {activeCharacter.level < 10 &&
          (canLevelUp ? (
            <button
              type="button"
              onClick={onLevelUp}
              data-field-key="sheet.levelup"
              className="
                ml-auto flex items-center gap-1.5 rounded-full border border-steel-400/30 bg-transparent
                px-3 py-1.5 text-xs font-semibold text-[#b9baa3]
                hover:border-amber-500 hover:text-amber-500
                transition-all duration-150 sm:[transition-delay:0.5s]
                focus:outline-none focus:ring-2 focus:ring-amber-500
              "
              aria-label="Level up character"
            >
              <i className="fa-solid fa-arrow-up w-3.5 h-3.5 text-center text-[0.7rem] leading-[0.875rem]" aria-hidden="true" />
              <span>Level Up</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={startOAuth}
              disabled={isLinking}
              data-field-key="sheet.levelup"
              className="
                ml-auto flex items-center gap-1.5 rounded-full border border-coral-400/30 bg-transparent
                px-3 py-1.5 text-xs font-semibold text-coral-400/80
                hover:border-coral-400/50 hover:text-coral-400
                transition-all duration-150
                focus:outline-none focus:ring-2 focus:ring-coral-400
                disabled:opacity-60 disabled:cursor-wait
              "
              aria-label="Link Patreon to unlock leveling up"
              title="Join our free Patreon to unlock leveling up"
            >
              <i className="fa-solid fa-lock w-3.5 h-3.5 text-center text-[0.7rem] leading-[0.875rem]" aria-hidden="true" />
              <span>{isLinking ? "Linking\u2026" : "Level Up"}</span>
            </button>
          ))}
        </DisabledInViewerMode>
      </div>

      {/* ── Dice Colors (visually separate from header stats) ──── */}
      <DisabledInViewerMode tooltip="Dice colors are personal to the owner">
      <div className="rounded-lg border border-steel-400/20 bg-slate-900/60 px-3 py-2">
        <button
          type="button"
          onClick={() => setDiceColorsOpen((o) => !o)}
          className="flex items-center gap-1.5 group w-full text-left"
          aria-expanded={diceColorsOpen}
          aria-controls="sheet-dice-colors-panel"
        >
          <i className={[
              "fa-solid fa-chevron-right w-3.5 h-3.5 shrink-0 text-center text-[0.6rem] leading-[0.875rem] text-steel-accessible transition-transform duration-150",
              diceColorsOpen ? "rotate-90" : "",
            ].join(" ")} aria-hidden="true" />
          <span className="text-xs uppercase tracking-widest text-[#b9baa3] font-medium group-hover:text-[#f7f7ff] transition-colors">
            Dice Colors
          </span>
          {/* Pending-save dot — visible while the global auto-save is in flight */}
          {isDirty && !diceColorsOpen && (
            <span
              aria-hidden="true"
              className="ml-1 h-1.5 w-1.5 rounded-full bg-steel-400 opacity-60"
              title="Changes pending save"
            />
          )}
          {/* Premium badge — inline when gated */}
          {diceColorsGated && (
            <span className="flex items-center gap-1 shrink-0 ml-auto rounded border border-gold-500/30 bg-gold-500/10 px-1.5 py-0.5">
              <i className="fa-solid fa-crown w-3 h-3 text-center text-[0.6rem] leading-3 text-gold-400/80" aria-hidden="true" />
              <span className="text-[11px] font-semibold text-gold-400/80">
                Paid
              </span>
            </span>
          )}
          {/* Quick preview swatches — die-face style */}
          {!diceColorsOpen && !diceColorsGated && (
            <span className="flex gap-1 ml-auto" aria-hidden="true">
              {(() => {
                const resolved = resolveDiceColors(
                  activeCharacter.diceColors,
                  userPrefs?.diceColors,
                );
                return (
                  <>
                    <span
                      className="w-4 h-4 rounded-sm border border-white/10"
                      style={{
                        backgroundColor: resolved.hope.diceColor,
                        boxShadow:
                          "inset 0 1px 2px rgba(255,255,255,0.12), 0 1px 2px rgba(0,0,0,0.4)",
                      }}
                      title="Hope die"
                    />
                    <span
                      className="w-4 h-4 rounded-sm border border-white/10"
                      style={{
                        backgroundColor: resolved.fear.diceColor,
                        boxShadow:
                          "inset 0 1px 2px rgba(255,255,255,0.12), 0 1px 2px rgba(0,0,0,0.4)",
                      }}
                      title="Fear die"
                    />
                    <span
                      className="w-4 h-4 rounded-sm border border-white/10"
                      style={{
                        backgroundColor: resolved.general.diceColor,
                        boxShadow:
                          "inset 0 1px 2px rgba(255,255,255,0.12), 0 1px 2px rgba(0,0,0,0.4)",
                      }}
                      title="General dice"
                    />
                  </>
                );
              })()}
            </span>
          )}
        </button>
        {/* Kept mounted (hidden attr) so the editor retains working state across toggles */}
        <div id="sheet-dice-colors-panel" hidden={!diceColorsOpen}>
          {diceColorsGated ? (
            <div className="mt-2 space-y-2">
              <div className="flex items-center gap-2 rounded-lg border border-gold-500/25 bg-gold-500/6 px-3 py-2">
                <i className="fa-solid fa-crown w-3.5 h-3.5 shrink-0 text-center text-[0.65rem] leading-[0.875rem] text-gold-400/80" aria-hidden="true" />
                <p className="flex-1 text-xs text-[#b9baa3]/80 leading-snug">
                  <span className="font-semibold text-gold-400">
                    Paid membership
                  </span>{" "}
                  required for custom dice colors.
                </p>
                <button
                  onClick={startOAuth}
                  disabled={isLinking}
                  className="shrink-0 rounded-md border border-gold-500/40 bg-gold-500/15 px-3 py-1 text-xs font-semibold text-gold-400 hover:bg-gold-500/25 hover:border-gold-500/60 transition-colors focus:outline-none focus:ring-2 focus:ring-gold-400 focus:ring-offset-1 focus:ring-offset-slate-900 disabled:opacity-50"
                >
                  {isLinking ? "Linking\u2026" : "View Tiers"}
                </button>
              </div>
              <div
                className="pointer-events-none select-none opacity-50"
                aria-hidden="true"
                inert
              >
                <p className="text-xs text-parchment-600 mb-2">
                  Overrides your{" "}
                  <span className="text-steel-accessible">default dice colors</span>{" "}
                  for this character only. Changes save automatically.
                </p>
                <DiceColorEditor
                  value={activeCharacter.diceColors}
                  defaults={(() => {
                    const up = userPrefs?.diceColors;
                    return {
                      hope: up?.hope ?? SYSTEM_DEFAULTS.hope,
                      fear: up?.fear ?? SYSTEM_DEFAULTS.fear,
                      general: up?.general ?? SYSTEM_DEFAULTS.general,
                    };
                  })()}
                  onChange={() => {}}
                />
              </div>
            </div>
          ) : (
            <div className="mt-2">
              <p className="text-xs text-[#b9baa3]/40 mb-2">
                Overrides your{" "}
                <span className="text-steel-400/70">default dice colors</span>{" "}
                for this character only. Changes save automatically.
              </p>
              <DiceColorEditor
                value={activeCharacter.diceColors}
                defaults={(() => {
                  // Defaults come from user preferences, falling back to system defaults
                  const up = userPrefs?.diceColors;
                  return {
                    hope: up?.hope ?? SYSTEM_DEFAULTS.hope,
                    fear: up?.fear ?? SYSTEM_DEFAULTS.fear,
                    general: up?.general ?? SYSTEM_DEFAULTS.general,
                  };
                })()}
                onChange={(prefs: DiceColorPrefs) => {
                  // Store the full prefs object (or undefined if all defaults)
                  const hasAny = prefs.hope || prefs.fear || prefs.general;
                  updateField("diceColors", hasAny ? prefs : undefined);
                }}
              />
            </div>
          )}
        </div>
      </div>
      </DisabledInViewerMode>

      {/* Conditions slide-in panel */}
      <ConditionsSidebar
        open={conditionsOpen}
        onClose={() => setConditionsOpen(false)}
        conditions={SRD_CONDITIONS}
        customConditions={customConditions}
        activeConditions={activeConditions}
        onToggle={toggleCondition}
        onAddCustom={addCustomCondition}
        onRemoveCustom={removeCustomCondition}
      />
    </div>
  );
}

// ─── FeatureActionButton ──────────────────────────────────────────────────────
// A button for class features that have a quantifiable mechanical cost.

interface FeatureActionButtonProps {
  characterId: string;
  label: string;
  actionId: string;
  params?: Record<string, unknown>;
  costLabel?: string;
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
    <DisabledInViewerMode>
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2.5">
        <button
          type="button"
          onClick={() => fire(actionId, params)}
          disabled={isPending}
          aria-label={label}
          aria-describedby={inlineError ? errorId : undefined}
          aria-busy={isPending}
          className="
            flex items-center gap-1.5
            rounded-lg border border-steel-400/40 bg-steel-400/15 px-3.5 py-2
            text-xs font-semibold text-[#f7f7ff]
            hover:bg-steel-400/25 hover:border-steel-400
            active:bg-steel-400/30
            disabled:opacity-50 disabled:cursor-wait
            transition-all duration-150
            focus:outline-none focus:ring-2 focus:ring-steel-400 focus:ring-offset-1 focus:ring-offset-slate-900
            min-h-[44px]
          "
        >
          {isPending ? (
            <span
              aria-hidden="true"
              className="inline-block h-3 w-3 animate-spin rounded-full border border-current border-t-transparent"
            />
          ) : (
            <>
              <i className="fa-solid fa-bolt text-[0.6rem] opacity-70" aria-hidden="true" />
              {label}
            </>
          )}
        </button>
        {costLabel && (
          <span className="text-xs text-steel-accessible font-medium">
            {costLabel}
          </span>
        )}
      </div>
      <InlineActionError message={inlineError} id={errorId} />
    </div>
    </DisabledInViewerMode>
  );
}

// ─── FeaturesPanel ────────────────────────────────────────────────────────────

interface FeaturesPanelProps {
  classData: ClassData | null | undefined;
  characterId: string;
  onRollQueued?: () => void;
}

function FeaturesPanel({
  classData,
  characterId,
  onRollQueued,
}: FeaturesPanelProps) {
  const { activeCharacter } = useCharacterStore();

  // Fetch multiclass class data when the character has multiclassed
  const { data: multiclassData } = useClass(
    activeCharacter?.multiclassClassId ?? undefined,
  );

  if (!activeCharacter || !classData) return null;

  const activeSubclass = classData.subclasses.find(
    (sc) => sc.subclassId === activeCharacter.subclassId,
  );

  // Resolve multiclass subclass (Foundation features only — SRD: multiclassing
  // never grants Specialization or Mastery)
  const mcSubclass =
    multiclassData?.subclasses.find(
      (sc) => sc.subclassId === activeCharacter.multiclassSubclassId,
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
    name: string,
  ): {
    actionId: string;
    params: Record<string, unknown>;
    costLabel: string;
  } | null => {
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
      className="rounded-xl border border-steel-400/30 bg-slate-900/80 p-5 shadow-card space-y-5"
      aria-label="Features"
      data-field-key="features"
    >
      <h2 className="font-serif-sc text-[0.975rem] font-semibold tracking-widest text-[#7a9ab5]">
        Features
      </h2>

      {/* Class Features */}
      {(classData.classFeatures?.length ?? 0) > 0 && (
        <div className="space-y-3" data-field-key="features.class">
          {classData.classFeatures.length > 1 && (
            <h3 className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-steel-accessible">
              Class Features
            </h3>
          )}
          {classData.classFeatures.map((feature) => (
            <div
              key={feature.name}
              className="rounded-lg border border-steel-400/20 bg-slate-850 p-4 space-y-3 min-h-[44px]"
            >
              <div>
                <h3 className="mb-1 font-serif text-[0.938rem] font-semibold text-[#f7f7ff] leading-snug">
                  {feature.name}
                </h3>
                <MarkdownContent className="text-sm text-[#b9baa3] leading-relaxed">
                  {feature.description}
                </MarkdownContent>
                {feature.options.length > 0 && (
                  <ul className="mt-2.5 space-y-1 list-disc list-outside pl-4">
                    {feature.options.map((opt) => (
                      <li key={opt} className="text-sm text-[#b9baa3] leading-relaxed">
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
        <div
          className="rounded-lg border border-gold-400/25 bg-gold-400/[0.06] p-4 space-y-3 min-h-[44px]"
          data-field-key="features.hope"
        >
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-serif text-[0.938rem] font-semibold text-[#f7f7ff] leading-snug">
                {classData.hopeFeature.name}
              </h3>
              <span
                className="rounded-md bg-gold-400/20 border border-gold-400/30 px-2 py-0.5 text-xs font-bold text-gold-400"
                aria-label={`Costs ${classData.hopeFeature.hopeCost} Hope`}
              >
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
        <div className="space-y-3" data-field-key="features.subclass">
          <h3 className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-steel-accessible">
            {activeSubclass.name}
            <span className="text-steel-accessible/60"> — </span>
            Subclass Features
          </h3>

          {/* Foundation features — always visible */}
          {activeSubclass.foundationFeatures.map((feat) => {
            const action = classFeatureHasAction(feat.name);
            return (
              <div
                key={feat.name}
                className="rounded-lg border border-steel-400/20 bg-slate-850 p-4 space-y-3 min-h-[44px]"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-serif text-[0.938rem] font-semibold text-[#f7f7ff] leading-snug">
                      {feat.name}
                    </h4>
                    <span
                      className="rounded-md bg-steel-400/15 border border-steel-400/20 px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wider text-steel-accessible"
                      aria-label="Foundation tier feature"
                    >
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

          {/* Specialization feature — shown when unlocked (tier >= 2), teased when locked */}
          {tier >= 2 ? (
            <div className="rounded-lg border border-steel-400/25 bg-slate-850 p-4 space-y-3 min-h-[44px]">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-serif text-[0.938rem] font-semibold text-[#f7f7ff] leading-snug">
                    {activeSubclass.specializationFeature.name}
                  </h4>
                  <span
                    className="rounded-md bg-steel-400/20 border border-steel-400/30 px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wider text-[#f7f7ff]"
                    aria-label="Specialization tier feature, unlocked at level 2"
                  >
                    Specialization
                  </span>
                </div>
                <MarkdownContent className="text-sm text-[#b9baa3] leading-relaxed">
                  {activeSubclass.specializationFeature.description}
                </MarkdownContent>
              </div>
              {(() => {
                const action = classFeatureHasAction(
                  activeSubclass.specializationFeature.name,
                );
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
          ) : (
            <div
              className="rounded-lg border border-steel-400/10 bg-slate-900/40 p-4 opacity-50 select-none"
              aria-hidden="true"
            >
              <div className="flex items-center gap-2">
                <i className="fa-solid fa-lock text-[0.6rem] text-steel-accessible/50" aria-hidden="true" />
                <span className="font-serif text-[0.938rem] font-semibold text-[#f7f7ff]/40 leading-snug">
                  {activeSubclass.specializationFeature.name}
                </span>
                <span className="rounded-md bg-steel-400/10 border border-steel-400/15 px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wider text-steel-accessible/50">
                  Specialization
                </span>
              </div>
              <p className="mt-1 text-xs text-[#b9baa3]/40">
                Unlocked at Level 2
              </p>
            </div>
          )}

          {/* Mastery feature — shown when unlocked (tier >= 3), teased when locked */}
          {tier >= 3 ? (
            <div className="rounded-lg border border-steel-400/30 bg-slate-850 p-4 space-y-3 min-h-[44px]">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-serif text-[0.938rem] font-semibold text-[#f7f7ff] leading-snug">
                    {activeSubclass.masteryFeature.name}
                  </h4>
                  <span
                    className="rounded-md bg-gold-400/15 border border-gold-400/25 px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wider text-gold-400"
                    aria-label="Mastery tier feature, unlocked at level 5"
                  >
                    Mastery
                  </span>
                </div>
                <MarkdownContent className="text-sm text-[#b9baa3] leading-relaxed">
                  {activeSubclass.masteryFeature.description}
                </MarkdownContent>
              </div>
              {(() => {
                const action = classFeatureHasAction(
                  activeSubclass.masteryFeature.name,
                );
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
          ) : (
            <div
              className="rounded-lg border border-steel-400/10 bg-slate-900/40 p-4 opacity-50 select-none"
              aria-hidden="true"
            >
              <div className="flex items-center gap-2">
                <i className="fa-solid fa-lock text-[0.6rem] text-steel-accessible/50" aria-hidden="true" />
                <span className="font-serif text-[0.938rem] font-semibold text-[#f7f7ff]/40 leading-snug">
                  {activeSubclass.masteryFeature.name}
                </span>
                <span className="rounded-md bg-steel-400/10 border border-steel-400/15 px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wider text-steel-accessible/50">
                  Mastery
                </span>
              </div>
              <p className="mt-1 text-xs text-[#b9baa3]/40">
                Unlocked at Level 5
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── Multiclass features ───────────────────────────────────────────── */}
      {multiclassData && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <h3 className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-steel-accessible">
              {multiclassData.name} — Multiclass Features
            </h3>
            <span
              className="rounded-md bg-steel-400/15 border border-steel-400/20 px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wider text-steel-accessible"
              aria-label="Multiclass features"
            >
              Multiclass
            </span>
          </div>

          {/* Multiclass class features */}
          {(multiclassData.classFeatures?.length ?? 0) > 0 && (
            <div className="space-y-3">
              {multiclassData.classFeatures.length > 1 && (
                <h4 className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-steel-accessible">
                  Class Features
                </h4>
              )}
              {multiclassData.classFeatures.map((feature) => (
                <div
                  key={feature.name}
                  className="rounded-lg border border-steel-400/20 bg-slate-850 p-4 space-y-3 min-h-[44px]"
                >
                  <div>
                    <h4 className="mb-1 font-serif text-[0.938rem] font-semibold text-[#f7f7ff] leading-snug">
                      {feature.name}
                    </h4>
                    <MarkdownContent className="text-sm text-[#b9baa3] leading-relaxed">
                      {feature.description}
                    </MarkdownContent>
                    {feature.options.length > 0 && (
                      <ul className="mt-2.5 space-y-1 list-disc list-outside pl-4">
                        {feature.options.map((opt) => (
                          <li key={opt} className="text-sm text-[#b9baa3] leading-relaxed">
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
          {mcSubclass &&
            mcSubclass.foundationFeatures.map((feat) => {
              const action = classFeatureHasAction(feat.name);
              return (
                <div
                  key={feat.name}
                  className="rounded-lg border border-steel-400/20 bg-slate-850 p-4 space-y-3 min-h-[44px]"
                >
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-serif text-[0.938rem] font-semibold text-[#f7f7ff] leading-snug">
                        {feat.name}
                      </h4>
                      <span
                        className="rounded-md bg-steel-400/15 border border-steel-400/20 px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wider text-steel-accessible"
                        aria-label="Foundation tier feature"
                      >
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
      <div data-field-key="loadout.domains">
        <DomainLoadout onRollQueued={onRollQueued} />
      </div>
    </section>
  );
}

// ─── Save status indicator ────────────────────────────────────────────────────

interface SaveStatusProps {
  isDirty: boolean;
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
      <span role="status" aria-live="polite" className="text-xs text-steel-accessible">
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

export function CharacterSheet({ characterId, viewerMode = false }: CharacterSheetProps) {
  const {
    data: character,
    isLoading,
    isError,
    error,
  } = useCharacter(characterId);

  const updateMutation = useUpdateCharacter(characterId);

  const { activeCharacter, setCharacter, updateField, isDirty, isSaving } =
    useCharacterStore();

  const [downtimeOpen, setDowntimeOpen] = useState(false);
  const [levelUpOpen, setLevelUpOpen] = useState(false);

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
            className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-steel-400 border-t-transparent"
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
        className="rounded-xl border border-steel-400/40 bg-slate-900 p-8 text-center"
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
    <ViewerModeProvider viewerMode={viewerMode}>
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
    </ViewerModeProvider>
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
  const { stagedRequest } = useDiceStore();
  const [diceModalOpen, setDiceModalOpen] = useState(false);
  const userPrefs = useAuthStore((s) => s.user?.preferences);

  // Fetch campaign data (if character belongs to one) to check cursesContentEnabled
  const { data: campaignData } = useCampaignDetail(
    activeCharacter?.campaignId ?? undefined,
  );

  // Show Curses! content when:
  //   a) the user has explicitly enabled it in their profile preferences, OR
  //   b) the character belongs to a campaign AND that campaign has Curses! content enabled.
  // The campaign flag only applies when campaign data is present — it never defaults to true
  // for characters outside a campaign, which would bypass the user's own preference.
  const showCursesContent =
    userPrefs?.cursesEnabled === true ||
    (activeCharacter?.campaignId != null &&
      campaignData?.cursesContentEnabled === true);

  // Compute dice color overrides from character → user → system cascade
  const diceColorOverrides = React.useMemo(() => {
    const resolved = resolveDiceColors(
      activeCharacter?.diceColors,
      userPrefs?.diceColors,
    );
    const gmColor = resolveGmDiceColor(userPrefs?.diceColors);
    return buildColorOverrides(resolved, gmColor);
  }, [activeCharacter?.diceColors, userPrefs?.diceColors]);

  // Auto-open the dice modal whenever something stages a roll
  useEffect(() => {
    if (stagedRequest) {
      setDiceModalOpen(true);
    }
  }, [stagedRequest]);

  if (!activeCharacter) return null;

  // Determine spellcast trait for dividers
  const spellcastTrait =
    classData?.subclasses.find(
      (sc) => sc.subclassId === activeCharacter.subclassId,
    )?.spellcastTrait ?? null;

  const handleRollQueued = () => setDiceModalOpen(true);

  return (
    <div className="mx-auto max-w-4xl space-y-4 pb-20">
      {/* Level restriction warning banner */}
      {campaignData?.requiredLevel != null &&
        activeCharacter.level !== campaignData.requiredLevel && (
        <div
          role="alert"
          className="
            flex items-start gap-3 rounded-xl border border-amber-600/40
            bg-amber-950/40 px-4 py-3 text-sm
          "
        >
          <span className="mt-0.5 text-amber-400 flex-shrink-0" aria-hidden="true">&#x26A0;</span>
          <div>
            <p className="font-semibold text-amber-300">
              Level Mismatch
            </p>
            <p className="mt-0.5 text-amber-200/70">
              This campaign requires Level {campaignData.requiredLevel} characters,
              but this character is Level {activeCharacter.level}.
              {activeCharacter.level < campaignData.requiredLevel
                ? " Use the level-up wizard to advance your character."
                : " Your character exceeds the campaign's level requirement."}
            </p>
            {activeCharacter.level < campaignData.requiredLevel && (
              <DisabledInViewerMode hideInstead>
              <button
                type="button"
                onClick={() => setLevelUpOpen(true)}
                className="
                  mt-2 rounded-lg bg-amber-700/50 border border-amber-600/50
                  px-4 py-1.5 text-xs font-semibold text-amber-100
                  hover:bg-amber-700/70 transition-colors
                  focus:outline-none focus:ring-2 focus:ring-amber-500
                "
              >
                Open Level-Up Wizard
              </button>
              </DisabledInViewerMode>
            )}
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <DisabledInViewerMode hideInstead>
        <SaveStatus isDirty={isDirty} isSaving={isSaving} />
        </DisabledInViewerMode>
        <DisabledInViewerMode tooltip="Downtime is personal">
        <button
          type="button"
          onClick={() => setDowntimeOpen(true)}
          aria-haspopup="dialog"
          data-field-key="sheet.downtime"
          className="
            rounded-lg border border-steel-400/40 bg-steel-400/15 px-4 py-1.5
            text-sm font-semibold text-[#f7f7ff]
            hover:bg-steel-400/25 hover:border-steel-400 transition-colors shadow-card
            focus:outline-none focus:ring-2 focus:ring-steel-400 focus:ring-offset-2 focus:ring-offset-slate-950
          "
        >
          Downtime / Rest
        </button>
        </DisabledInViewerMode>
      </div>

      {/* Header card */}
      <section
        className="rounded-xl border border-steel-400/30 bg-slate-900/80 p-5 shadow-card"
        data-field-key="header"
      >
        <SheetHeader
          characterId={characterId}
          classData={classData}
          onLevelUp={() => setLevelUpOpen(true)}
          isDirty={isDirty}
          isSaving={isSaving}
        />
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
      <StatsPanel onRollQueued={handleRollQueued} />

      <SheetDivider spellcastTrait={spellcastTrait} />

      {/* Trackers, weapons, hope, experiences */}
      <TrackersPanel onRollQueued={handleRollQueued} />

      <SheetDivider spellcastTrait={spellcastTrait} />

      {/* Features, loadout */}
      <FeaturesPanel
        classData={classData}
        characterId={characterId}
        onRollQueued={handleRollQueued}
      />

      <SheetDivider spellcastTrait={spellcastTrait} />

      {/* Equipment and gold */}
      <EquipmentPanel onRollQueued={handleRollQueued} />

      <SheetDivider spellcastTrait={spellcastTrait} />

      {/* Favors — per-faction social currency (Curses! content) */}
      {showCursesContent && (
        <>
          <FavorsPanel />
          <SheetDivider spellcastTrait={spellcastTrait} />
        </>
      )}

      {/* Companion (shown only if companionState is not null) */}
      <CompanionPanel onRollQueued={handleRollQueued} />

      {/* Downtime projects */}
      <DowntimeProjectsPanel />

      {/* Notes */}
      <section
        className="rounded-xl border border-steel-400/30 bg-slate-900/80 p-5 shadow-card"
        aria-label="Notes"
        data-field-key="notes"
      >
        <h2 className="mb-3 font-serif-sc text-[0.975rem] font-semibold tracking-widest text-[#7a9ab5]">
          Notes
        </h2>
        <EditableField
          field={CHARACTER_NOTES_FIELD}
          className="block w-full text-left"
          activeClassName="ring-2 ring-steel-400/60 rounded-lg"
        >
          <div
            className="
              w-full rounded border border-steel-400/20 bg-slate-950
              px-3 py-2 text-sm text-[#b9baa3] 
              min-h-[8rem] whitespace-pre-wrap break-words
            "
          >
            {activeCharacter.notes ?? (
              <span className="text-parchment-500">
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

      {/* Dice roller side-panel */}
      <DiceRollerPanel
        open={diceModalOpen}
        onClose={() => setDiceModalOpen(false)}
        colorOverrides={diceColorOverrides}
      />

      {/* Dice log overlay (fixed lower-left) */}
      <DiceLog />
    </div>
  );
}
