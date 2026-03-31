"use client";

/**
 * src/components/encounter/EncounterConsole.tsx
 *
 * Main encounter view that assembles the encounter header, adversary rows,
 * defeated section, quick-add panel, roll log, and (optionally) an active
 * environment into a cohesive console.
 *
 * Environments are a subset of an encounter: the GM can load one environment
 * into the current encounter, which surfaces its features as an ambient
 * reference and its suggested adversaries as quick-add chips.
 */

import React, { useCallback, useState } from "react";
import type { Adversary } from "@/types/adversary";
import { useEncounter } from "@/hooks/useEncounter";
import { useAdversaries } from "@/hooks/useAdversaries";
import { useEnvironments } from "@/hooks/useEnvironments";
import { EncounterHeader } from "./EncounterHeader";
import { EncounterAdversaryRow } from "./EncounterAdversaryRow";
import { DefeatedSection } from "./DefeatedSection";
import { QuickAddPanel } from "./QuickAddPanel";
import { EncounterRollLog } from "./EncounterRollLog";
import { TierBadge } from "@/components/adversary/TierBadge";

interface EncounterConsoleProps {
  campaignId: string;
  /** Called when user clicks "Browse Catalog →" — switches to adversaries tab. */
  onOpenCatalog?: () => void;
}

// ─── EnvironmentPicker ────────────────────────────────────────────────────────
// Inline picker rendered inside the encounter when no environment is loaded.

interface EnvironmentPickerProps {
  campaignId: string;
  onLoad: (environmentId: string) => void;
  onDismiss: () => void;
}

function EnvironmentPicker({ onLoad, onDismiss }: EnvironmentPickerProps) {
  const { environments, isLoading } = useEnvironments();
  const [search, setSearch] = useState("");

  const filtered = search.trim()
    ? environments.filter(
        (e) =>
          e.name.toLowerCase().includes(search.toLowerCase()) ||
          e.type.toLowerCase().includes(search.toLowerCase())
      )
    : environments;

  return (
    <div className="mt-3 rounded-xl border border-[#577399]/25 bg-slate-950/40 p-3 space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-[#577399]/70">
          Choose Environment
        </p>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Cancel environment selection"
          className="text-[#b9baa3]/30 hover:text-[#b9baa3] transition-colors text-xs"
        >
          ✕
        </button>
      </div>

      {isLoading ? (
        <div className="h-8 rounded-lg bg-slate-700/30 animate-pulse" />
      ) : (
        <>
          {environments.length > 4 && (
            <input
              type="search"
              placeholder="Search…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="
                w-full rounded-lg border border-slate-700/40 bg-slate-900/60
                px-3 py-1.5 text-xs text-[#f7f7ff] placeholder:text-[#b9baa3]/30
                focus:outline-none focus:ring-2 focus:ring-[#577399]
              "
            />
          )}
          {filtered.length === 0 ? (
            <p className="text-xs text-[#b9baa3]/40 italic py-2 text-center">
              No environments found.
            </p>
          ) : (
            <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
              {filtered.map((env) => (
                <button
                  key={env.environmentId}
                  type="button"
                  onClick={() => onLoad(env.environmentId)}
                  className="
                    w-full flex items-center gap-2.5 rounded-lg
                    border border-slate-700/40 bg-slate-900/50
                    px-3 py-2 text-left
                    hover:border-[#577399]/50 hover:bg-[#577399]/5
                    transition-colors
                    focus:outline-none focus:ring-2 focus:ring-[#577399]
                  "
                >
                  <TierBadge tier={env.tier} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-[#f7f7ff] truncate">{env.name}</p>
                    <p className="text-[10px] text-[#b9baa3]/40">{env.type} · DC {env.difficulty}</p>
                  </div>
                  <span className="text-[10px] text-[#577399]/60 shrink-0">Load →</span>
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── ActiveEnvironmentBanner ──────────────────────────────────────────────────
// Shown inside the encounter when an environment is loaded.

interface ActiveEnvironmentBannerProps {
  campaignId: string;
  environmentId: string;
  onAddAdversary: (adversary: Adversary) => void;
  onClear: () => void;
}

function ActiveEnvironmentBanner({
  campaignId,
  environmentId,
  onAddAdversary,
  onClear,
}: ActiveEnvironmentBannerProps) {
  const { environments } = useEnvironments();
  const { adversaries } = useAdversaries(campaignId);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());

  const env = environments.find((e) => e.environmentId === environmentId);
  if (!env) return null;

  const suggested = env.potentialAdversaryNames
    .map((name) => adversaries.find((a) => a.name.toLowerCase() === name.toLowerCase()))
    .filter((a): a is Adversary => a !== undefined);

  const handleAdd = (adv: Adversary) => {
    onAddAdversary(adv);
    setAddedIds((prev) => new Set(prev).add(adv.adversaryId));
    setTimeout(() => {
      setAddedIds((prev) => {
        const next = new Set(prev);
        next.delete(adv.adversaryId);
        return next;
      });
    }, 1500);
  };

  return (
    <div className="mb-4 rounded-xl border border-[#577399]/30 bg-[#577399]/5 px-4 py-3 space-y-2">
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <TierBadge tier={env.tier} />
          <div className="min-w-0">
            <p className="text-xs font-semibold text-[#577399] uppercase tracking-wider truncate">
              Scene: {env.name}
            </p>
            <p className="text-[10px] text-[#b9baa3]/50">{env.type} · DC {env.difficulty}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClear}
          aria-label="Remove environment from encounter"
          className="shrink-0 text-[#b9baa3]/30 hover:text-[#fe5f55] transition-colors text-xs"
        >
          ✕
        </button>
      </div>

      {/* Description */}
      <p className="text-xs text-[#b9baa3]/60 leading-relaxed">{env.description}</p>

      {/* Passive features */}
      {env.features.filter((f) => f.isPassive).length > 0 && (
        <div className="flex flex-wrap gap-x-3 gap-y-1">
          {env.features
            .filter((f) => f.isPassive)
            .map((f) => (
              <span
                key={f.name}
                title={f.description}
                className="text-[10px] font-medium text-[#577399]/70 italic"
              >
                {f.name.replace(" - Passive", "")} (passive)
              </span>
            ))}
        </div>
      )}

      {/* Active features */}
      {env.features.filter((f) => !f.isPassive).length > 0 && (
        <div className="flex flex-wrap gap-x-3 gap-y-1">
          {env.features
            .filter((f) => !f.isPassive)
            .map((f) => (
              <span
                key={f.name}
                title={f.description}
                className="text-[10px] font-medium text-[#fe5f55]/60 italic"
              >
                {f.name} (active)
              </span>
            ))}
        </div>
      )}

      {/* Suggested adversary chips */}
      {suggested.length > 0 && (
        <div>
          <p className="text-[9px] font-semibold uppercase tracking-wider text-[#b9baa3]/40 mb-1">
            Suggested adversaries
          </p>
          <div className="flex flex-wrap gap-1.5">
            {suggested.map((adv) => {
              const added = addedIds.has(adv.adversaryId);
              return (
                <button
                  key={adv.adversaryId}
                  type="button"
                  onClick={() => handleAdd(adv)}
                  disabled={added}
                  title={`Add ${adv.name} to encounter (T${adv.tier} ${adv.type})`}
                  aria-label={added ? `${adv.name} added` : `Add ${adv.name} to encounter`}
                  className={`
                    flex items-center gap-1 rounded-full
                    border px-2.5 py-0.5 text-xs font-medium
                    transition-all duration-150
                    focus:outline-none focus:ring-2 focus:ring-[#577399]
                    ${added
                      ? "border-emerald-700/60 bg-emerald-900/20 text-emerald-400"
                      : "border-slate-700/60 bg-slate-800/60 text-[#b9baa3] hover:border-[#577399]/60 hover:bg-[#577399]/10 hover:text-[#f7f7ff]"}
                  `}
                >
                  <span aria-hidden="true">{added ? "✓" : "+"}</span>
                  {adv.name}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── EncounterConsole ─────────────────────────────────────────────────────────

export function EncounterConsole({ campaignId, onOpenCatalog }: EncounterConsoleProps) {
  const {
    encounter,
    activeAdversaries,
    defeatedAdversaries,
    rollLog,
    createEncounter,
    startEncounter,
    endEncounter,
    nextRound,
    addAdversary,
    updateAdversary,
    defeatAdversary,
    restoreAdversary,
    rollAttack,
    rollDamage,
    clearRollLog,
    clearEncounter,
    setEnvironment,
    clearEnvironment,
  } = useEncounter();

  const { adversaries } = useAdversaries(campaignId);

  const [showEnvPicker, setShowEnvPicker] = useState(false);

  const handleAddAdversary = useCallback(
    (adversary: Adversary) => {
      addAdversary(adversary);
    },
    [addAdversary]
  );

  const handleOpenCatalog = useCallback(() => {
    onOpenCatalog?.();
  }, [onOpenCatalog]);

  const handleLoadEnvironment = useCallback(
    (envId: string) => {
      setEnvironment(envId);
      setShowEnvPicker(false);
    },
    [setEnvironment]
  );

  // No active encounter — show empty state with "New Encounter" button
  if (!encounter) {
    return (
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-serif text-sm font-semibold uppercase tracking-widest text-[#577399]">
            Encounter
          </h2>
        </div>

        <div
          className="
            flex flex-col items-center justify-center
            min-h-[400px] rounded-2xl
            border border-dashed border-slate-700/50
            text-center space-y-3
          "
          style={{ background: "rgba(254,95,85,0.02)" }}
        >
          <div aria-hidden="true" className="text-4xl opacity-20">
            ⚔️
          </div>
          <p className="font-serif text-lg text-[#f7f7ff]/60">No active encounter</p>
          <p className="text-sm text-[#b9baa3]/40 max-w-xs">
            Start an encounter by adding adversaries from your catalog.
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => createEncounter(campaignId)}
              className="
                rounded-lg border border-[#577399]/40 bg-[#577399]/10
                px-4 py-2 text-sm font-semibold text-[#577399]
                hover:bg-[#577399]/20 hover:border-[#577399] hover:text-[#f7f7ff]
                transition-all duration-150
                focus:outline-none focus:ring-2 focus:ring-[#577399]
              "
            >
              New Encounter
            </button>
            {onOpenCatalog && (
              <button
                type="button"
                onClick={handleOpenCatalog}
                className="
                  rounded-lg border border-slate-700/60 bg-transparent
                  px-4 py-2 text-sm font-medium text-[#b9baa3]/60
                  hover:border-slate-600 hover:text-[#b9baa3]
                  transition-colors
                "
              >
                Browse Adversaries →
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Completed encounter — show summary and option to start new
  if (encounter.status === "completed") {
    return (
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-serif text-sm font-semibold uppercase tracking-widest text-[#577399]">
            Encounter
          </h2>
        </div>

        <div
          className="
            flex flex-col items-center justify-center
            min-h-[300px] rounded-2xl
            border border-dashed border-slate-700/50
            text-center space-y-3
          "
          style={{ background: "rgba(87,115,153,0.03)" }}
        >
          <div aria-hidden="true" className="text-4xl opacity-30">
            🏁
          </div>
          <p className="font-serif text-lg text-[#f7f7ff]/60">
            &ldquo;{encounter.name}&rdquo; — Complete
          </p>
          <p className="text-sm text-[#b9baa3]/40">
            {encounter.round} rounds · {encounter.adversaries.length} adversaries ·{" "}
            {encounter.adversaries.filter((a) => a.isDefeated).length} defeated
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => clearEncounter()}
              className="
                rounded-lg border border-[#577399]/40 bg-[#577399]/10
                px-4 py-2 text-sm font-semibold text-[#577399]
                hover:bg-[#577399]/20 hover:border-[#577399] hover:text-[#f7f7ff]
                transition-all duration-150
                focus:outline-none focus:ring-2 focus:ring-[#577399]
              "
            >
              New Encounter
            </button>
          </div>
        </div>

        {/* Still show roll log from the completed encounter */}
        <EncounterRollLog rollLog={rollLog} onClear={clearRollLog} />
      </div>
    );
  }

  // Active / Preparing encounter
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-serif text-sm font-semibold uppercase tracking-widest text-[#577399]">
          Encounter
        </h2>
      </div>

      {/* Header */}
      <EncounterHeader
        encounter={encounter}
        activeCount={activeAdversaries.length}
        defeatedCount={defeatedAdversaries.length}
        onNextRound={nextRound}
        onStartEncounter={startEncounter}
        onEndEncounter={endEncounter}
      />

      {/* ── Environment section ─────────────────────────────────────────── */}
      {encounter.activeEnvironmentId ? (
        <ActiveEnvironmentBanner
          campaignId={campaignId}
          environmentId={encounter.activeEnvironmentId}
          onAddAdversary={handleAddAdversary}
          onClear={clearEnvironment}
        />
      ) : (
        <div className="mb-4">
          <button
            type="button"
            onClick={() => setShowEnvPicker((v) => !v)}
            aria-expanded={showEnvPicker}
            className="
              inline-flex items-center gap-1.5 rounded-full
              border border-slate-700/40 bg-transparent
              px-3 py-1 text-xs font-medium text-[#b9baa3]/50
              hover:border-[#577399]/40 hover:text-[#577399]
              transition-colors
              focus:outline-none focus:ring-2 focus:ring-[#577399]
            "
          >
            <span aria-hidden="true">🌲</span>
            {showEnvPicker ? "Cancel" : "Set Scene Environment"}
          </button>

          {showEnvPicker && (
            <EnvironmentPicker
              campaignId={campaignId}
              onLoad={handleLoadEnvironment}
              onDismiss={() => setShowEnvPicker(false)}
            />
          )}
        </div>
      )}

      {/* Active adversary rows */}
      {activeAdversaries.length === 0 && (
        <div className="rounded-xl border border-dashed border-slate-700/40 bg-slate-950/20 p-6 text-center">
          <p className="text-sm text-[#b9baa3]/40">
            No adversaries in this encounter yet. Use quick-add below or browse the catalog.
          </p>
        </div>
      )}

      <div className="space-y-3">
        {activeAdversaries.map((instance) => (
          <EncounterAdversaryRow
            key={instance.instanceId}
            instance={instance}
            onUpdate={updateAdversary}
            onRollAttack={rollAttack}
            onRollDamage={rollDamage}
            onDefeat={defeatAdversary}
          />
        ))}
      </div>

      {/* Defeated section */}
      <DefeatedSection
        defeated={defeatedAdversaries}
        onRestore={restoreAdversary}
      />

      {/* Quick-add panel */}
      <QuickAddPanel
        adversaries={adversaries}
        onAddAdversary={handleAddAdversary}
        onOpenCatalog={handleOpenCatalog}
      />

      {/* Roll log */}
      <EncounterRollLog rollLog={rollLog} onClear={clearRollLog} />
    </div>
  );
}
