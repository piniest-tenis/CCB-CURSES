"use client";

/**
 * MixedAncestryFlow.tsx
 * ─────────────────────
 * Three-phase guided selection flow for Mixed Ancestry (SRD p.16).
 *
 * Phase A: Choose first ancestry → gets its Top Feature (first-listed trait)
 * Phase B: Choose second ancestry (different) → gets its Bottom Feature (second-listed trait)
 * Phase C: Name your heritage (free-text input)
 *
 * The flow naturally enforces the SRD constraint that mixed ancestry characters
 * must take one Top Feature and one Bottom Feature from different ancestries,
 * without exposing "Top/Bottom" terminology to the user.
 */

import React, { useCallback, useMemo } from "react";
import type { AncestryData } from "@shared/types";
import { MarkdownContent } from "@/components/MarkdownContent";
import { SourceBadge } from "@/components/SourceBadge";
import { matchesSourceFilter, type SourceFilterValue } from "@/components/SourceFilter";

// ─── Types ────────────────────────────────────────────────────────────────────

export type MixedAncestryPhase = "A" | "B" | "C" | "done";

export interface MixedAncestryFlowProps {
  ancestries: AncestryData[];
  topAncestryId: string;
  bottomAncestryId: string;
  displayName: string;
  phase: MixedAncestryPhase;
  onTopSelect: (ancestryId: string) => void;
  onBottomSelect: (ancestryId: string) => void;
  onDisplayNameChange: (name: string) => void;
  onPhaseChange: (phase: MixedAncestryPhase) => void;
  onCancel: () => void;
  sourceFilter: SourceFilterValue;
}

// ─── Phase Indicator ──────────────────────────────────────────────────────────

function PhaseIndicator({ phase }: { phase: MixedAncestryPhase }) {
  const phases: Array<{ key: MixedAncestryPhase; label: string }> = [
    { key: "A", label: "First Trait" },
    { key: "B", label: "Second Trait" },
    { key: "C", label: "Name Heritage" },
  ];
  const currentIndex = phase === "done" ? 3 : phases.findIndex((p) => p.key === phase);

  return (
    <div className="flex items-center gap-2" role="group" aria-label="Mixed ancestry selection progress">
      {phases.map((p, i) => {
        const isActive = p.key === phase;
        const isComplete = i < currentIndex;
        return (
          <React.Fragment key={p.key}>
            {i > 0 && (
              <div
                className={`flex-1 h-px max-w-8 ${isComplete ? "bg-[#577399]" : "bg-slate-700/60"}`}
                aria-hidden="true"
              />
            )}
            <div className="flex items-center gap-1.5">
              <span
                className={`
                  w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold
                  ${isComplete
                    ? "bg-[#577399] text-[#f7f7ff]"
                    : isActive
                      ? "bg-[#577399]/20 border border-[#577399] text-[#577399]"
                      : "bg-slate-800 border border-slate-700/60 text-parchment-600"
                  }
                `}
                aria-hidden="true"
              >
                {isComplete ? (
                  <svg className="w-3 h-3" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M13.485 3.929a1 1 0 0 1 .086 1.412l-6 7a1 1 0 0 1-1.46.038l-3-3a1 1 0 1 1 1.414-1.414L6.8 10.24l5.273-6.147a1 1 0 0 1 1.412-.164Z" />
                  </svg>
                ) : (
                  String(i + 1)
                )}
              </span>
              <span
                className={`text-xs font-medium hidden sm:inline ${
                  isActive ? "text-[#f7f7ff]" : isComplete ? "text-[#577399]" : "text-parchment-600"
                }`}
              >
                {p.label}
              </span>
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ─── Selected Feature Chip ────────────────────────────────────────────────────

function SelectedFeatureChip({
  label,
  ancestryName,
  featureName,
  onClear,
}: {
  label: string;
  ancestryName: string;
  featureName: string;
  onClear: () => void;
}) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-[#577399]/40 bg-[#577399]/10 px-3 py-2">
      <div className="flex-1 min-w-0">
        <p className="text-[10px] uppercase tracking-wider text-[#577399] font-semibold">{label}</p>
        <p className="text-sm text-[#f7f7ff] font-medium truncate">
          {ancestryName} — {featureName}
        </p>
      </div>
      <button
        type="button"
        onClick={onClear}
        className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center
                   text-parchment-500 hover:text-[#fe5f55] hover:bg-[#fe5f55]/10
                   transition-colors"
        aria-label={`Remove ${ancestryName} selection`}
      >
        <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor">
          <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708Z" />
        </svg>
      </button>
    </div>
  );
}

// ─── Ancestry Trait Tile ──────────────────────────────────────────────────────

function AncestryTraitTile({
  ancestry,
  traitType,
  isSelected,
  onSelect,
}: {
  ancestry: AncestryData;
  traitType: "top" | "bottom";
  isSelected: boolean;
  onSelect: () => void;
}) {
  const traitName = traitType === "top" ? ancestry.traitName : ancestry.secondTraitName;
  const traitDesc = traitType === "top" ? ancestry.traitDescription : ancestry.secondTraitDescription;

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={isSelected}
      className={`
        w-full text-left rounded-lg transition-all duration-150 p-3 sm:p-4
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#577399]
        focus-visible:ring-offset-1 focus-visible:ring-offset-[#0a100d]
        ${isSelected
          ? "border-2 border-[#577399] bg-[#577399]/10 shadow-[0_0_12px_rgba(87,115,153,0.15)]"
          : "border-2 border-slate-700/50 bg-slate-900/40 hover:border-slate-600 hover:bg-slate-800/40"
        }
      `}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-sm font-semibold ${isSelected ? "text-[#f7f7ff]" : "text-[#f7f7ff]/70"}`}>
            {ancestry.name}
          </span>
          <SourceBadge source={ancestry.source} size="xs" />
        </div>
        {isSelected && (
          <span className="shrink-0 w-5 h-5 rounded-full bg-[#577399] flex items-center justify-center">
            <svg className="w-3 h-3 text-white" viewBox="0 0 16 16" fill="currentColor">
              <path d="M13.485 3.929a1 1 0 0 1 .086 1.412l-6 7a1 1 0 0 1-1.46.038l-3-3a1 1 0 1 1 1.414-1.414L6.8 10.24l5.273-6.147a1 1 0 0 1 1.412-.164Z" />
            </svg>
          </span>
        )}
      </div>

      <div className="rounded-md border border-slate-700/40 bg-slate-900/30 px-3 py-2 space-y-1">
        <p className="text-xs font-semibold uppercase text-[#577399]">
          {traitType === "top" ? "Primary Trait" : "Secondary Trait"}
        </p>
        <p className={`text-sm font-semibold ${isSelected ? "text-[#f7f7ff]" : "text-[#f7f7ff]/80"}`}>
          {traitName}
        </p>
        {traitDesc && (
          <MarkdownContent className={`text-xs ${isSelected ? "text-[#b9baa3]/80" : "text-[#b9baa3]/60"}`}>
            {traitDesc}
          </MarkdownContent>
        )}
      </div>
    </button>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function MixedAncestryFlow({
  ancestries,
  topAncestryId,
  bottomAncestryId,
  displayName,
  phase,
  onTopSelect,
  onBottomSelect,
  onDisplayNameChange,
  onPhaseChange,
  onCancel,
  sourceFilter,
}: MixedAncestryFlowProps) {
  const topAncestry = ancestries.find((a) => a.ancestryId === topAncestryId);
  const bottomAncestry = ancestries.find((a) => a.ancestryId === bottomAncestryId);

  // Phase A: all ancestries with a valid top trait, filtered by source
  const phaseAAncestries = useMemo(
    () =>
      ancestries
        .filter((a) => a.traitName && matchesSourceFilter(a.source, sourceFilter))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [ancestries, sourceFilter]
  );

  // Phase B: all ancestries with a valid bottom trait, excluding Phase A selection
  const phaseBAncestries = useMemo(
    () =>
      ancestries
        .filter(
          (a) =>
            a.secondTraitName &&
            a.ancestryId !== topAncestryId &&
            matchesSourceFilter(a.source, sourceFilter)
        )
        .sort((a, b) => a.name.localeCompare(b.name)),
    [ancestries, topAncestryId, sourceFilter]
  );

  // Auto-generate suggestion chips for heritage name
  const suggestions = useMemo(() => {
    const chips: string[] = [];
    if (topAncestry && bottomAncestry) {
      chips.push(`${topAncestry.name}-${bottomAncestry.name}`);
      chips.push(`${bottomAncestry.name}-${topAncestry.name}`);
      chips.push(topAncestry.name);
      chips.push(bottomAncestry.name);
    }
    return chips;
  }, [topAncestry, bottomAncestry]);

  const handleTopSelect = useCallback(
    (ancestryId: string) => {
      onTopSelect(ancestryId);
      onPhaseChange("B");
    },
    [onTopSelect, onPhaseChange]
  );

  const handleBottomSelect = useCallback(
    (ancestryId: string) => {
      onBottomSelect(ancestryId);
      // Auto-populate display name with default
      const top = ancestries.find((a) => a.ancestryId === topAncestryId);
      const bot = ancestries.find((a) => a.ancestryId === ancestryId);
      if (top && bot && !displayName) {
        onDisplayNameChange(`${top.name}-${bot.name}`);
      }
      onPhaseChange("C");
    },
    [onBottomSelect, onPhaseChange, ancestries, topAncestryId, displayName, onDisplayNameChange]
  );

  const handleClearTop = useCallback(() => {
    onTopSelect("");
    onBottomSelect("");
    onDisplayNameChange("");
    onPhaseChange("A");
  }, [onTopSelect, onBottomSelect, onDisplayNameChange, onPhaseChange]);

  const handleClearBottom = useCallback(() => {
    onBottomSelect("");
    onDisplayNameChange("");
    onPhaseChange("B");
  }, [onBottomSelect, onDisplayNameChange, onPhaseChange]);

  const handleBackFromB = useCallback(() => {
    onBottomSelect("");
    onDisplayNameChange("");
    onPhaseChange("A");
  }, [onBottomSelect, onDisplayNameChange, onPhaseChange]);

  const handleBackFromC = useCallback(() => {
    onDisplayNameChange("");
    onPhaseChange("B");
  }, [onDisplayNameChange, onPhaseChange]);

  const handleConfirm = useCallback(() => {
    onPhaseChange("done");
  }, [onPhaseChange]);

  return (
    <div
      className="space-y-4"
      role="group"
      aria-label={`Mixed ancestry selection, phase ${phase === "done" ? "complete" : phase} of 3`}
    >
      {/* Phase indicator */}
      <PhaseIndicator phase={phase} />

      {/* Selected feature chips (show previous selections) */}
      {topAncestry && phase !== "A" && (
        <SelectedFeatureChip
          label="Primary Trait"
          ancestryName={topAncestry.name}
          featureName={topAncestry.traitName}
          onClear={handleClearTop}
        />
      )}
      {bottomAncestry && (phase === "C" || phase === "done") && (
        <SelectedFeatureChip
          label="Secondary Trait"
          ancestryName={bottomAncestry.name}
          featureName={bottomAncestry.secondTraitName}
          onClear={handleClearBottom}
        />
      )}

      {/* ── Phase A: Select Top Feature ancestry ── */}
      {phase === "A" && (
        <div className="space-y-3" aria-live="polite">
          <div>
            <h4 className="text-sm font-semibold text-[#f7f7ff]">
              Choose the ancestry for your character's first trait
            </h4>
            <p className="text-xs text-[#b9baa3]/60 mt-0.5">
              This ancestry provides your primary trait.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-2 max-h-[50vh] overflow-y-auto pr-1">
            {phaseAAncestries.map((a) => (
              <AncestryTraitTile
                key={a.ancestryId}
                ancestry={a}
                traitType="top"
                isSelected={topAncestryId === a.ancestryId}
                onSelect={() => handleTopSelect(a.ancestryId)}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="text-sm text-parchment-500 hover:text-parchment-400 transition-colors"
          >
            Cancel mixed ancestry
          </button>
        </div>
      )}

      {/* ── Phase B: Select Bottom Feature ancestry ── */}
      {phase === "B" && (
        <div className="space-y-3" aria-live="polite">
          <div>
            <h4 className="text-sm font-semibold text-[#f7f7ff]">
              Now choose a different ancestry for your character's second trait
            </h4>
            <p className="text-xs text-[#b9baa3]/60 mt-0.5">
              This ancestry provides your secondary trait.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-2 max-h-[50vh] overflow-y-auto pr-1">
            {phaseBAncestries.map((a) => (
              <AncestryTraitTile
                key={a.ancestryId}
                ancestry={a}
                traitType="bottom"
                isSelected={bottomAncestryId === a.ancestryId}
                onSelect={() => handleBottomSelect(a.ancestryId)}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={handleBackFromB}
            className="text-sm text-parchment-500 hover:text-parchment-400 transition-colors"
          >
            Back to first trait
          </button>
        </div>
      )}

      {/* ── Phase C: Heritage Name ── */}
      {(phase === "C" || phase === "done") && (
        <div className="space-y-3" aria-live="polite">
          <div>
            <h4 className="text-sm font-semibold text-[#f7f7ff]">
              What does your character call their ancestry?
            </h4>
            <p className="text-xs text-[#b9baa3]/60 mt-0.5">
              You can use a hyphenated name, a single ancestry name, or invent a new term.
            </p>
          </div>

          <input
            type="text"
            value={displayName}
            onChange={(e) => onDisplayNameChange(e.target.value)}
            placeholder="e.g. Elf-Goblin, Toothling, etc."
            maxLength={60}
            className="
              w-full rounded-lg border border-slate-700/60 bg-[#0a100d]
              px-4 py-2.5 text-base text-[#f7f7ff]
              placeholder:text-parchment-600
              focus:outline-none focus:ring-2 focus:ring-[#577399] focus:border-transparent
              transition-colors
            "
            aria-label="Heritage display name"
          />

          {/* Suggestion chips */}
          <div className="flex flex-wrap gap-2">
            {suggestions.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => onDisplayNameChange(s)}
                className={`
                  rounded-full px-3 py-1.5 text-xs font-medium transition-colors
                  ${displayName === s
                    ? "bg-[#577399]/20 border border-[#577399] text-[#577399]"
                    : "bg-slate-800 border border-slate-700/60 text-parchment-500 hover:border-[#577399]/50 hover:text-[#577399]"
                  }
                `}
              >
                {s}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3 pt-2">
            {phase === "C" && (
              <>
                <button
                  type="button"
                  onClick={handleBackFromC}
                  className="text-sm text-parchment-500 hover:text-parchment-400 transition-colors"
                >
                  Back to second trait
                </button>
                <button
                  type="button"
                  onClick={handleConfirm}
                  disabled={!displayName.trim()}
                  className="
                    ml-auto rounded-lg px-4 py-2 text-sm font-semibold
                    bg-[#577399] text-[#f7f7ff] hover:bg-[#577399]/80
                    disabled:opacity-50 disabled:cursor-not-allowed
                    transition-colors
                  "
                >
                  Confirm Heritage
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
