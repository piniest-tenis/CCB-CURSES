"use client";

/**
 * src/components/encounter/EnvironmentCatalog.tsx
 *
 * Standalone environment catalog — browse and load environments into the
 * active encounter. "Load into Encounter" writes to the encounter store so
 * the environment is accessible from the Encounter tab.
 */

import React, { useState, useCallback, useMemo } from "react";
import type { Environment, EnvironmentFeature } from "@/types/adversary";
import type { Adversary } from "@/types/adversary";
import { useEnvironments } from "@/hooks/useEnvironments";
import { useAdversaries } from "@/hooks/useAdversaries";
import { useEncounterStore } from "@/store/encounterStore";
import { TierBadge } from "@/components/adversary/TierBadge";

interface EnvironmentCatalogProps {
  campaignId: string;
  /** Called when the GM quick-adds a suggested adversary to the encounter. */
  onAddAdversaryToEncounter?: (adversary: Adversary) => void;
}

// ─── Feature Row ─────────────────────────────────────────────────────────────

function FeatureRow({ feature }: { feature: EnvironmentFeature }) {
  return (
    <div className="rounded border border-slate-800/60 bg-slate-950/40 px-3 py-2">
      <div className="flex items-start gap-2">
        <span
          aria-label={feature.isPassive ? "Passive" : "Activated"}
          title={feature.isPassive ? "Passive (always active)" : "Activated ability"}
          className={`
            mt-0.5 shrink-0 rounded px-1 py-0.5
            text-[9px] font-bold uppercase tracking-wider
            ${feature.isPassive
              ? "bg-[#577399]/20 text-[#577399]"
              : "bg-[#fe5f55]/15 text-[#fe5f55]"}
          `}
        >
          {feature.isPassive ? "Passive" : "Active"}
        </span>
        <div>
          <p className="text-xs font-semibold text-[#f7f7ff]">{feature.name}</p>
          <p className="mt-0.5 text-xs text-[#b9baa3]/70 leading-relaxed">
            {feature.description}
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Environment Card ─────────────────────────────────────────────────────────

interface EnvironmentCardProps {
  environment: Environment;
  suggestedAdversaries: Adversary[];
  /** Whether this environment is currently loaded into the encounter. */
  isLoaded: boolean;
  onLoad: (env: Environment) => void;
  onUnload: () => void;
  onAddAdversary?: (adversary: Adversary) => void;
}

function EnvironmentCard({
  environment,
  suggestedAdversaries,
  isLoaded,
  onLoad,
  onUnload,
  onAddAdversary,
}: EnvironmentCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());

  const handleAdd = useCallback(
    (adversary: Adversary) => {
      onAddAdversary?.(adversary);
      setAddedIds((prev) => new Set(prev).add(adversary.adversaryId));
      setTimeout(() => {
        setAddedIds((prev) => {
          const next = new Set(prev);
          next.delete(adversary.adversaryId);
          return next;
        });
      }, 1500);
    },
    [onAddAdversary]
  );

  return (
    <article
      className={`
        flex flex-col rounded-xl
        border bg-slate-900/80
        shadow-card transition-all duration-200 overflow-hidden
        ${isLoaded
          ? "border-[#577399] ring-1 ring-[#577399]/40"
          : "border-slate-700/50 hover:border-[#577399]/50"}
      `}
    >
      {/* Header */}
      <div className="flex items-start gap-3 p-4 pb-2">
        <TierBadge tier={environment.tier} />

        <div className="flex-1 min-w-0">
          <h3 className="font-serif text-base font-semibold text-[#f7f7ff] leading-tight">
            {environment.name}
          </h3>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className="rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider bg-slate-800 text-[#b9baa3]/60">
              {environment.type}
            </span>
            {environment.tone.map((t) => (
              <span key={t} className="text-[10px] italic text-[#b9baa3]/40">
                {t}
              </span>
            ))}
          </div>
        </div>

        <div className="flex flex-col items-end gap-1 shrink-0">
          <span className="text-[10px] text-[#b9baa3]/40">
            DC {environment.difficulty}
          </span>
          {isLoaded && (
            <span className="rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-[#577399]/20 text-[#577399]">
              In Encounter
            </span>
          )}
        </div>
      </div>

      {/* Description */}
      <p className="px-4 pb-2 text-sm text-[#b9baa3]/70 leading-relaxed line-clamp-2">
        {environment.description}
      </p>

      {/* Divider */}
      <div className="mx-4 border-t border-slate-800/60" />

      {/* Features toggle */}
      {environment.features.length > 0 && (
        <div className="px-4 pt-3">
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
            className="
              flex items-center gap-1.5 text-xs font-semibold text-[#577399]
              hover:text-[#f7f7ff] transition-colors
            "
          >
            <svg
              className={`h-3 w-3 transition-transform duration-200 ${expanded ? "rotate-90" : ""}`}
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <path d="M6 4l4 4-4 4" />
            </svg>
            {environment.features.length} Feature
            {environment.features.length !== 1 ? "s" : ""}
          </button>

          {expanded && (
            <div className="mt-2 space-y-2 animate-fade-in">
              {environment.features.map((f) => (
                <FeatureRow key={f.name} feature={f} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Suggested Adversaries */}
      {suggestedAdversaries.length > 0 && (
        <div className="px-4 pt-3">
          <div className="flex items-center gap-2 mb-2">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[#b9baa3]/50">
              Potential Adversaries
            </p>
            {onAddAdversary && (
              <span className="text-[9px] italic text-[#b9baa3]/30">
                Tap to add to encounter
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {suggestedAdversaries.map((adv) => {
              const added = addedIds.has(adv.adversaryId);
              return (
                <button
                  key={adv.adversaryId}
                  type="button"
                  disabled={!onAddAdversary || added}
                  onClick={() => handleAdd(adv)}
                  title={`Add ${adv.name} to encounter (T${adv.tier} ${adv.type})`}
                  aria-label={added ? `${adv.name} added` : `Add ${adv.name} to encounter`}
                  className={`
                    flex items-center gap-1.5 rounded-full
                    border px-2.5 py-1 text-xs font-medium
                    transition-all duration-150
                    focus:outline-none focus:ring-2 focus:ring-[#577399]
                    ${added
                      ? "border-emerald-700/60 bg-emerald-900/20 text-emerald-400"
                      : onAddAdversary
                        ? "border-slate-700/60 bg-slate-800/60 text-[#b9baa3] hover:border-[#577399]/60 hover:bg-[#577399]/10 hover:text-[#f7f7ff]"
                        : "border-slate-800/40 bg-slate-900/30 text-[#b9baa3]/30 cursor-default"}
                  `}
                >
                  {added ? (
                    <span aria-hidden="true">✓</span>
                  ) : (
                    onAddAdversary && <span aria-hidden="true" className="text-[9px]">+</span>
                  )}
                  {adv.name}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Unmatched suggested adversary names */}
      {(() => {
        const matchedNames = new Set(suggestedAdversaries.map((a) => a.name));
        const unmatched = environment.potentialAdversaryNames.filter(
          (n) => !matchedNames.has(n)
        );
        if (unmatched.length === 0) return null;
        return (
          <div className="px-4 pt-1.5">
            <div className="flex flex-wrap gap-1.5">
              {unmatched.map((name) => (
                <span
                  key={name}
                  title="Not yet in the adversary catalog"
                  className="rounded-full border border-slate-800/40 bg-slate-900/30 px-2.5 py-1 text-xs text-[#b9baa3]/30 italic"
                >
                  {name}
                </span>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Footer actions */}
      <div className="mt-auto px-4 py-3 flex items-center justify-between border-t border-slate-800/40 mt-3">
        {isLoaded ? (
          <button
            type="button"
            onClick={onUnload}
            className="
              rounded-lg border border-[#fe5f55]/30 bg-transparent
              px-3 py-1.5 text-xs font-semibold text-[#fe5f55]/70
              hover:bg-[#fe5f55]/10 hover:text-[#fe5f55] hover:border-[#fe5f55]/50
              transition-all duration-150
              focus:outline-none focus:ring-2 focus:ring-[#fe5f55]
            "
          >
            Remove from Encounter
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onLoad(environment)}
            className="
              rounded-lg border border-[#577399]/40 bg-[#577399]/10
              px-3 py-1.5 text-xs font-semibold text-[#577399]
              hover:bg-[#577399]/20 hover:border-[#577399] hover:text-[#f7f7ff]
              transition-all duration-150
              focus:outline-none focus:ring-2 focus:ring-[#577399]
            "
          >
            Load into Encounter
          </button>
        )}
        <span className="text-[10px] text-[#b9baa3]/30">
          {environment.potentialAdversaryNames.length} suggested adversar
          {environment.potentialAdversaryNames.length !== 1 ? "ies" : "y"}
        </span>
      </div>
    </article>
  );
}

// ─── Environment Catalog ──────────────────────────────────────────────────────

export function EnvironmentCatalog({
  campaignId,
  onAddAdversaryToEncounter,
}: EnvironmentCatalogProps) {
  const { environments, isLoading } = useEnvironments();
  const { adversaries } = useAdversaries(campaignId);
  const [search, setSearch] = useState("");

  // Read active environment from the encounter store (single source of truth)
  const activeEnvironmentId = useEncounterStore(
    (s) => s.encounter?.activeEnvironmentId ?? null
  );
  const setEnvironment = useEncounterStore((s) => s.setEnvironment);
  const clearEnvironment = useEncounterStore((s) => s.clearEnvironment);
  const encounter = useEncounterStore((s) => s.encounter);
  const createEncounter = useEncounterStore((s) => s.createEncounter);

  const handleLoad = useCallback(
    (env: Environment) => {
      // Create an encounter if one doesn't exist yet
      if (!encounter) {
        createEncounter(campaignId);
      }
      setEnvironment(env.environmentId);
    },
    [encounter, createEncounter, campaignId, setEnvironment]
  );

  /** Resolve suggested adversary objects for a given environment. */
  const resolveSuggestions = useCallback(
    (env: Environment): Adversary[] => {
      return env.potentialAdversaryNames
        .map((name) =>
          adversaries.find((a) => a.name.toLowerCase() === name.toLowerCase())
        )
        .filter((a): a is Adversary => a !== undefined);
    },
    [adversaries]
  );

  const filtered = useMemo(() => {
    if (!search.trim()) return environments;
    const q = search.toLowerCase();
    return environments.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        e.type.toLowerCase().includes(q) ||
        e.tone.some((t) => t.toLowerCase().includes(q)) ||
        e.description.toLowerCase().includes(q)
    );
  }, [environments, search]);

  const activeEnvironment = useMemo(
    () =>
      activeEnvironmentId
        ? environments.find((e) => e.environmentId === activeEnvironmentId) ?? null
        : null,
    [environments, activeEnvironmentId]
  );

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-10 w-full rounded-lg bg-slate-700/40 animate-pulse" />
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-64 rounded-xl bg-slate-700/30 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-serif text-sm font-semibold uppercase tracking-widest text-[#577399]">
          Environments
        </h2>
        {activeEnvironment && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#b9baa3]/50">In encounter:</span>
            <span className="text-xs font-semibold text-[#577399]">
              {activeEnvironment.name}
            </span>
            <button
              type="button"
              onClick={clearEnvironment}
              aria-label="Remove environment from encounter"
              className="
                rounded p-0.5 text-[#b9baa3]/30
                hover:text-[#fe5f55] transition-colors text-xs
              "
            >
              ✕
            </button>
          </div>
        )}
      </div>

      {/* Search */}
      <div className="mb-4">
        <input
          type="search"
          placeholder="Search environments…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="
            w-full rounded-lg border border-slate-700/40 bg-slate-900/60
            px-3 py-2 text-sm text-[#f7f7ff] placeholder:text-[#b9baa3]/30
            focus:outline-none focus:ring-2 focus:ring-[#577399]
          "
        />
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div
          className="
            flex flex-col items-center justify-center
            min-h-[300px] rounded-2xl
            border border-dashed border-slate-700/50
            text-center space-y-3
          "
          style={{ background: "rgba(87,115,153,0.03)" }}
        >
          <div aria-hidden="true" className="text-4xl opacity-20">🌲</div>
          <p className="font-serif text-lg text-[#f7f7ff]/60">
            {environments.length === 0 ? "No environments yet" : "No matches"}
          </p>
          <p className="text-sm text-[#b9baa3]/40 max-w-xs">
            {environments.length === 0
              ? "Environments will appear here once added."
              : "Try a different search term."}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
          {filtered.map((env) => (
            <EnvironmentCard
              key={env.environmentId}
              environment={env}
              suggestedAdversaries={resolveSuggestions(env)}
              isLoaded={env.environmentId === activeEnvironmentId}
              onLoad={handleLoad}
              onUnload={clearEnvironment}
              onAddAdversary={onAddAdversaryToEncounter}
            />
          ))}
        </div>
      )}
    </div>
  );
}
