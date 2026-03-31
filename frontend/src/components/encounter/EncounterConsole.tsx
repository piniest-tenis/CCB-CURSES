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
 *
 * Environment features support three interaction modes:
 *   - View-only: click to expand description + flavor text
 *   - Activate (no roll): GM narrates; optionally auto-deducts Fear cost
 *   - Activate (player roll): target picker opens, GM chooses a character,
 *     a roll_request WS message stages the roll on the player's character sheet
 */

import React, { useCallback, useState } from "react";
import type { Adversary, EnvironmentFeature } from "@/types/adversary";
import type { CampaignCharacterDetail } from "@/types/campaign";
import { useEncounter } from "@/hooks/useEncounter";
import { useAdversaries } from "@/hooks/useAdversaries";
import { useEnvironments } from "@/hooks/useEnvironments";
import { EncounterHeader } from "./EncounterHeader";
import { EncounterAdversaryRow } from "./EncounterAdversaryRow";
import { DefeatedSection } from "./DefeatedSection";
import { QuickAddPanel } from "./QuickAddPanel";
import { EncounterRollLog } from "./EncounterRollLog";
import { TierBadge } from "@/components/adversary/TierBadge";
import type { RollRequestPayload } from "@/types/campaign";

// ─── EncounterConsole public props ────────────────────────────────────────────

export interface EncounterConsoleProps {
  campaignId: string;
  /** Called when user clicks "Browse Catalog →" — switches to adversaries tab. */
  onOpenCatalog?: () => void;
  /**
   * GM only: sends a roll prompt to a specific player's character sheet.
   * When omitted the "Request Roll" button is disabled.
   */
  onSendRollRequest?: (targetCharacterId: string, rollRequest: RollRequestPayload) => void;
  /**
   * GM only: deducts Fear from the campaign counter.
   * When omitted the Fear auto-deduct step is skipped.
   */
  onDeductFear?: (amount: number) => void;
  /**
   * List of player characters in the campaign, used to populate the target picker.
   * Only characters with a real characterId are shown.
   */
  partyCharacters?: CampaignCharacterDetail[];
}

// ─── EnvironmentPicker ────────────────────────────────────────────────────────
// Inline picker rendered inside the encounter when no environment is loaded.

function EnvironmentPicker({ onLoad, onDismiss }: {
  campaignId: string;
  onLoad: (environmentId: string) => void;
  onDismiss: () => void;
}) {
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
              className="w-full rounded-lg border border-slate-700/40 bg-slate-900/60
                px-3 py-1.5 text-xs text-[#f7f7ff] placeholder:text-[#b9baa3]/30
                focus:outline-none focus:ring-2 focus:ring-[#577399]"
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
                  className="w-full flex items-center gap-2.5 rounded-lg
                    border border-slate-700/40 bg-slate-900/50 px-3 py-2 text-left
                    hover:border-[#577399]/50 hover:bg-[#577399]/5 transition-colors
                    focus:outline-none focus:ring-2 focus:ring-[#577399]"
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

// ─── FeatureCard ──────────────────────────────────────────────────────────────
// Expandable card for a single environment feature inside the banner.

function FeatureCard({
  feature,
  partyCharacters,
  onSendRollRequest,
  onDeductFear,
}: {
  feature: EnvironmentFeature;
  partyCharacters: CampaignCharacterDetail[];
  onSendRollRequest?: (targetCharacterId: string, rollRequest: RollRequestPayload) => void;
  onDeductFear?: (amount: number) => void;
}) {
  const [expanded, setExpanded]             = useState(false);
  const [showTargetPicker, setShowTargetPicker] = useState(false);
  const [sentTo, setSentTo]                 = useState<string | null>(null); // characterId just sent to

  const isPassive     = feature.isPassive;
  const hasRoll       = !!feature.rollSpec;
  const fearCost      = feature.fearCost ?? 0;
  const canActivate   = !isPassive;
  const canSendRoll   = canActivate && hasRoll && !!onSendRollRequest;
  const hasFearCost   = fearCost > 0;

  const handleActivateNoRoll = () => {
    // For non-roll active features just expand the details so GM can narrate,
    // and auto-deduct Fear if applicable.
    if (hasFearCost && onDeductFear) {
      onDeductFear(fearCost);
    }
    setExpanded(true);
  };

  const handleSendRoll = (char: CampaignCharacterDetail) => {
    if (!feature.rollSpec || !onSendRollRequest) return;
    if (hasFearCost && onDeductFear) {
      onDeductFear(fearCost);
    }
    const payload: RollRequestPayload = {
      ...feature.rollSpec,
      characterName: char.name,
    };
    onSendRollRequest(char.characterId, payload);
    setSentTo(char.characterId);
    setShowTargetPicker(false);
    // Reset sent confirmation after 2s
    setTimeout(() => setSentTo(null), 2000);
  };

  return (
    <div
      className={`rounded-lg border transition-colors ${
        isPassive
          ? "border-[#577399]/20 bg-slate-950/30"
          : "border-[#fe5f55]/20 bg-[#fe5f55]/3"
      }`}
    >
      {/* ── Feature header row ── */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 text-left
          focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[#577399]
          rounded-lg"
      >
        <div className="flex items-center gap-2 min-w-0">
          {/* Passive / Active indicator dot */}
          <span
            className={`shrink-0 inline-block w-1.5 h-1.5 rounded-full mt-px ${
              isPassive ? "bg-[#577399]/60" : "bg-[#fe5f55]/70"
            }`}
            aria-hidden="true"
          />
          <span className={`text-xs font-semibold truncate ${
            isPassive ? "text-[#577399]/80" : "text-[#fe5f55]/80"
          }`}>
            {feature.name}
          </span>
          {hasFearCost && (
            <span className="shrink-0 text-[9px] font-bold uppercase tracking-wider
              text-amber-500/70 border border-amber-500/30 rounded px-1 py-px">
              {fearCost} Fear
            </span>
          )}
          {hasRoll && (
            <span className="shrink-0 text-[9px] font-medium text-slate-400/50 italic">
              roll required
            </span>
          )}
        </div>
        <span className={`shrink-0 text-[10px] transition-transform duration-150 text-[#b9baa3]/30 ${
          expanded ? "rotate-180" : ""
        }`} aria-hidden="true">▾</span>
      </button>

      {/* ── Expanded body ── */}
      {expanded && (
        <div className="px-3 pb-3 space-y-2 border-t border-slate-700/20 pt-2">
          {/* Mechanical description */}
          <p className="text-xs text-[#b9baa3]/70 leading-relaxed">{feature.description}</p>

          {/* Flavor / lore text */}
          {feature.flavorText && (
            <p className="text-xs text-[#b9baa3]/40 italic leading-relaxed border-l-2
              border-[#577399]/20 pl-2">
              {feature.flavorText}
            </p>
          )}

          {/* Roll spec preview */}
          {feature.rollSpec && (
            <div className="flex items-center gap-2 text-[10px] text-[#b9baa3]/40">
              <span className="font-mono bg-slate-800/60 px-1.5 py-0.5 rounded">
                {feature.rollSpec.dice.map((d) => d.size).join(" + ")}
              </span>
              {feature.rollSpec.difficulty && (
                <span>vs DC {feature.rollSpec.difficulty}</span>
              )}
            </div>
          )}

          {/* Action buttons for active features */}
          {canActivate && (
            <div className="flex flex-wrap gap-2 pt-1">
              {canSendRoll ? (
                <>
                  <button
                    type="button"
                    onClick={() => setShowTargetPicker((v) => !v)}
                    aria-expanded={showTargetPicker}
                    className="inline-flex items-center gap-1.5 rounded-lg
                      border border-[#fe5f55]/30 bg-[#fe5f55]/8 px-2.5 py-1
                      text-xs font-semibold text-[#fe5f55]/80
                      hover:border-[#fe5f55]/60 hover:bg-[#fe5f55]/15 hover:text-[#fe5f55]
                      transition-all duration-150
                      focus:outline-none focus:ring-2 focus:ring-[#fe5f55]/50"
                  >
                    <span aria-hidden="true">🎲</span>
                    {showTargetPicker ? "Cancel" : "Request Roll"}
                    {hasFearCost && <span className="text-amber-500/70">−{fearCost} Fear</span>}
                  </button>

                  {/* Target picker */}
                  {showTargetPicker && (
                    <div className="w-full rounded-lg border border-slate-700/40
                      bg-slate-900/60 p-2 space-y-1">
                      <p className="text-[9px] font-semibold uppercase tracking-wider
                        text-[#b9baa3]/40 mb-1">
                        Choose target
                      </p>
                      {partyCharacters.length === 0 ? (
                        <p className="text-xs text-[#b9baa3]/30 italic py-1">
                          No players in campaign.
                        </p>
                      ) : (
                        partyCharacters.map((char) => {
                          const isSent = sentTo === char.characterId;
                          return (
                            <button
                              key={char.characterId}
                              type="button"
                              onClick={() => handleSendRoll(char)}
                              disabled={isSent}
                              aria-label={
                                isSent
                                  ? `Roll sent to ${char.name}`
                                  : `Send roll request to ${char.name}`
                              }
                              className={`w-full flex items-center gap-2 rounded-lg
                                border px-2.5 py-1.5 text-left text-xs font-medium
                                transition-all duration-150
                                focus:outline-none focus:ring-2 focus:ring-[#577399]
                                ${isSent
                                  ? "border-emerald-700/50 bg-emerald-900/20 text-emerald-400"
                                  : "border-slate-700/50 bg-slate-800/50 text-[#b9baa3] hover:border-[#577399]/50 hover:bg-[#577399]/10 hover:text-[#f7f7ff]"
                                }`}
                            >
                              <span aria-hidden="true" className="text-[10px]">
                                {isSent ? "✓" : "→"}
                              </span>
                              <span className="flex-1 truncate">{char.name}</span>
                              <span className="text-[10px] text-[#b9baa3]/30 shrink-0">
                                {char.className} {char.level}
                              </span>
                            </button>
                          );
                        })
                      )}
                    </div>
                  )}
                </>
              ) : (
                /* No roll needed — just an "Activate" button that narrates + deducts Fear */
                <button
                  type="button"
                  onClick={handleActivateNoRoll}
                  className="inline-flex items-center gap-1.5 rounded-lg
                    border border-[#fe5f55]/30 bg-[#fe5f55]/8 px-2.5 py-1
                    text-xs font-semibold text-[#fe5f55]/80
                    hover:border-[#fe5f55]/60 hover:bg-[#fe5f55]/15 hover:text-[#fe5f55]
                    transition-all duration-150
                    focus:outline-none focus:ring-2 focus:ring-[#fe5f55]/50"
                >
                  <span aria-hidden="true">⚡</span>
                  Activate
                  {hasFearCost && <span className="text-amber-500/70">−{fearCost} Fear</span>}
                </button>
              )}
            </div>
          )}
        </div>
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
  onSendRollRequest?: (targetCharacterId: string, rollRequest: RollRequestPayload) => void;
  onDeductFear?: (amount: number) => void;
  partyCharacters?: CampaignCharacterDetail[];
}

function ActiveEnvironmentBanner({
  campaignId,
  environmentId,
  onAddAdversary,
  onClear,
  onSendRollRequest,
  onDeductFear,
  partyCharacters = [],
}: ActiveEnvironmentBannerProps) {
  const { environments } = useEnvironments();
  const { adversaries }  = useAdversaries(campaignId);
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

  const passiveFeatures = env.features.filter((f) => f.isPassive);
  const activeFeatures  = env.features.filter((f) => !f.isPassive);

  return (
    <div className="mb-4 rounded-xl border border-[#577399]/30 bg-[#577399]/5 px-4 py-3 space-y-3">
      {/* ── Header row ── */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <TierBadge tier={env.tier} />
          <div className="min-w-0">
            <p className="text-xs font-semibold text-[#577399] uppercase tracking-wider truncate">
              Scene: {env.name}
            </p>
            <p className="text-[10px] text-[#b9baa3]/50">
              {env.type} · DC {env.difficulty}
              {env.tone.length > 0 && (
                <span className="text-[#b9baa3]/30"> · {env.tone.join(", ")}</span>
              )}
            </p>
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

      {/* ── Description ── */}
      <p className="text-xs text-[#b9baa3]/60 leading-relaxed">{env.description}</p>

      {/* ── Passive features ── */}
      {passiveFeatures.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[9px] font-semibold uppercase tracking-wider text-[#577399]/50">
            Passive Effects
          </p>
          {passiveFeatures.map((f) => (
            <FeatureCard
              key={f.name}
              feature={f}
              partyCharacters={partyCharacters}
              onSendRollRequest={onSendRollRequest}
              onDeductFear={onDeductFear}
            />
          ))}
        </div>
      )}

      {/* ── Active features ── */}
      {activeFeatures.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[9px] font-semibold uppercase tracking-wider text-[#fe5f55]/50">
            Activated Effects
          </p>
          {activeFeatures.map((f) => (
            <FeatureCard
              key={f.name}
              feature={f}
              partyCharacters={partyCharacters}
              onSendRollRequest={onSendRollRequest}
              onDeductFear={onDeductFear}
            />
          ))}
        </div>
      )}

      {/* ── Suggested adversary chips ── */}
      {suggested.length > 0 && (
        <div>
          <p className="text-[9px] font-semibold uppercase tracking-wider text-[#b9baa3]/40 mb-1.5">
            Suggested Adversaries
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
                  className={`flex items-center gap-1 rounded-full border px-2.5 py-0.5
                    text-xs font-medium transition-all duration-150
                    focus:outline-none focus:ring-2 focus:ring-[#577399]
                    ${added
                      ? "border-emerald-700/60 bg-emerald-900/20 text-emerald-400"
                      : "border-slate-700/60 bg-slate-800/60 text-[#b9baa3] hover:border-[#577399]/60 hover:bg-[#577399]/10 hover:text-[#f7f7ff]"
                    }`}
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

export function EncounterConsole({
  campaignId,
  onOpenCatalog,
  onSendRollRequest,
  onDeductFear,
  partyCharacters = [],
}: EncounterConsoleProps) {
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
    (adversary: Adversary) => addAdversary(adversary),
    [addAdversary]
  );
  const handleOpenCatalog = useCallback(() => onOpenCatalog?.(), [onOpenCatalog]);
  const handleLoadEnvironment = useCallback(
    (envId: string) => {
      setEnvironment(envId);
      setShowEnvPicker(false);
    },
    [setEnvironment]
  );

  // ── Empty state ──────────────────────────────────────────────────────────────
  if (!encounter) {
    return (
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-serif text-sm font-semibold uppercase tracking-widest text-[#577399]">
            Encounter
          </h2>
        </div>
        <div
          className="flex flex-col items-center justify-center min-h-[400px] rounded-2xl
            border border-dashed border-slate-700/50 text-center space-y-3"
          style={{ background: "rgba(254,95,85,0.02)" }}
        >
          <div aria-hidden="true" className="text-4xl opacity-20">⚔️</div>
          <p className="font-serif text-lg text-[#f7f7ff]/60">No active encounter</p>
          <p className="text-sm text-[#b9baa3]/40 max-w-xs">
            Start an encounter by adding adversaries from your catalog.
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => createEncounter(campaignId)}
              className="rounded-lg border border-[#577399]/40 bg-[#577399]/10
                px-4 py-2 text-sm font-semibold text-[#577399]
                hover:bg-[#577399]/20 hover:border-[#577399] hover:text-[#f7f7ff]
                transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-[#577399]"
            >
              New Encounter
            </button>
            {onOpenCatalog && (
              <button
                type="button"
                onClick={handleOpenCatalog}
                className="rounded-lg border border-slate-700/60 bg-transparent
                  px-4 py-2 text-sm font-medium text-[#b9baa3]/60
                  hover:border-slate-600 hover:text-[#b9baa3] transition-colors"
              >
                Browse Adversaries →
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── Completed state ──────────────────────────────────────────────────────────
  if (encounter.status === "completed") {
    return (
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-serif text-sm font-semibold uppercase tracking-widest text-[#577399]">
            Encounter
          </h2>
        </div>
        <div
          className="flex flex-col items-center justify-center min-h-[300px] rounded-2xl
            border border-dashed border-slate-700/50 text-center space-y-3"
          style={{ background: "rgba(87,115,153,0.03)" }}
        >
          <div aria-hidden="true" className="text-4xl opacity-30">🏁</div>
          <p className="font-serif text-lg text-[#f7f7ff]/60">
            &ldquo;{encounter.name}&rdquo; — Complete
          </p>
          <p className="text-sm text-[#b9baa3]/40">
            {encounter.round} rounds · {encounter.adversaries.length} adversaries ·{" "}
            {encounter.adversaries.filter((a) => a.isDefeated).length} defeated
          </p>
          <button
            type="button"
            onClick={() => clearEncounter()}
            className="rounded-lg border border-[#577399]/40 bg-[#577399]/10
              px-4 py-2 text-sm font-semibold text-[#577399]
              hover:bg-[#577399]/20 hover:border-[#577399] hover:text-[#f7f7ff]
              transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-[#577399]"
          >
            New Encounter
          </button>
        </div>
        <EncounterRollLog rollLog={rollLog} onClear={clearRollLog} />
      </div>
    );
  }

  // ── Active / Preparing ───────────────────────────────────────────────────────
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-serif text-sm font-semibold uppercase tracking-widest text-[#577399]">
          Encounter
        </h2>
      </div>

      <EncounterHeader
        encounter={encounter}
        activeCount={activeAdversaries.length}
        defeatedCount={defeatedAdversaries.length}
        onNextRound={nextRound}
        onStartEncounter={startEncounter}
        onEndEncounter={endEncounter}
      />

      {/* ── Environment section ── */}
      {encounter.activeEnvironmentId ? (
        <ActiveEnvironmentBanner
          campaignId={campaignId}
          environmentId={encounter.activeEnvironmentId}
          onAddAdversary={handleAddAdversary}
          onClear={clearEnvironment}
          onSendRollRequest={onSendRollRequest}
          onDeductFear={onDeductFear}
          partyCharacters={partyCharacters}
        />
      ) : (
        <div className="mb-4">
          <button
            type="button"
            onClick={() => setShowEnvPicker((v) => !v)}
            aria-expanded={showEnvPicker}
            className="inline-flex items-center gap-1.5 rounded-full
              border border-slate-700/40 bg-transparent
              px-3 py-1 text-xs font-medium text-[#b9baa3]/50
              hover:border-[#577399]/40 hover:text-[#577399]
              transition-colors focus:outline-none focus:ring-2 focus:ring-[#577399]"
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

      {/* ── Active adversary rows ── */}
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

      <DefeatedSection defeated={defeatedAdversaries} onRestore={restoreAdversary} />
      <QuickAddPanel adversaries={adversaries} onAddAdversary={handleAddAdversary} onOpenCatalog={handleOpenCatalog} />
      <EncounterRollLog rollLog={rollLog} onClear={clearRollLog} />
    </div>
  );
}
