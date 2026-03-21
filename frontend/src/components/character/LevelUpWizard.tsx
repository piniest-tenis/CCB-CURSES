"use client";

/**
 * src/components/character/LevelUpWizard.tsx
 *
 * Multi-step wizard for leveling a character from level N to N+1.
 *
 * Steps:
 *   1. Overview — shows target level, tier info, automatic bonuses
 *   2. Advancements — pick 2 slots worth of advancement choices
 *   3. Domain Card — pick a new domain card to acquire (or skip)
 *   4. Confirm — review all choices and submit
 *
 * SRD rules enforced:
 *   - Exactly 2 advancement slots (proficiency-increase and multiclass cost 2)
 *   - Multiclass only available Tier 3+ (level 5+)
 *   - Tier achievements at levels 2, 5, 8: +1 proficiency (auto), +1 experience at +2
 *   - Damage thresholds +1 (auto)
 *   - Domain card level filter: card.level <= targetLevel
 */

import React, { useState, useMemo, useCallback } from "react";
import type {
  AdvancementType,
  AdvancementChoice,
  CoreStatName,
  DomainCard,
  Character,
} from "@shared/types";
import { useCharacterLevelUp, type LevelUpInput } from "@/hooks/useCharacter";
import { useDomain } from "@/hooks/useGameData";
import { ApiError } from "@/lib/api";

// ─── Constants ────────────────────────────────────────────────────────────────

const CORE_STATS: CoreStatName[] = [
  "agility",
  "strength",
  "finesse",
  "instinct",
  "presence",
  "knowledge",
];

function tierForLevel(level: number): number {
  if (level <= 1) return 1;
  if (level <= 4) return 2;
  if (level <= 7) return 3;
  return 4;
}

function isTierAchievement(toLevel: number): boolean {
  return toLevel === 2 || toLevel === 5 || toLevel === 8;
}

function advancementSlotCost(type: AdvancementType): number {
  return type === "proficiency-increase" || type === "multiclass" ? 2 : 1;
}

// All advancement options with labels and descriptions
interface AdvancementOption {
  type: AdvancementType;
  label: string;
  description: string;
  slotCost: number;
  needsDetail: boolean;
  /** Minimum target level to unlock this option */
  minLevel: number;
}

const ADVANCEMENT_OPTIONS: AdvancementOption[] = [
  {
    type: "trait-bonus",
    label: "+1 Trait Bonus",
    description: "Increase one core stat by 1.",
    slotCost: 1,
    needsDetail: true,
    minLevel: 2,
  },
  {
    type: "hp-slot",
    label: "+1 HP Slot",
    description: "Add 1 Hit Point slot (max 12).",
    slotCost: 1,
    needsDetail: false,
    minLevel: 2,
  },
  {
    type: "stress-slot",
    label: "+1 Stress Slot",
    description: "Add 1 Stress slot (max 12).",
    slotCost: 1,
    needsDetail: false,
    minLevel: 2,
  },
  {
    type: "experience-bonus",
    label: "+1 Experience Bonus",
    description: "Increase an existing experience by 1.",
    slotCost: 1,
    needsDetail: true,
    minLevel: 2,
  },
  {
    type: "new-experience",
    label: "New Experience",
    description: "Add a new experience at +2.",
    slotCost: 1,
    needsDetail: true,
    minLevel: 2,
  },
  {
    type: "evasion",
    label: "+1 Evasion",
    description: "Permanently increase evasion by 1.",
    slotCost: 1,
    needsDetail: false,
    minLevel: 2,
  },
  {
    type: "additional-domain-card",
    label: "Extra Domain Card",
    description: "Take an additional domain card from your domains.",
    slotCost: 1,
    needsDetail: true,
    minLevel: 2,
  },
  {
    type: "subclass-upgrade",
    label: "Subclass Upgrade",
    description: "Unlock next subclass tier (Foundation -> Specialization -> Mastery).",
    slotCost: 1,
    needsDetail: false,
    minLevel: 2,
  },
  {
    type: "proficiency-increase",
    label: "+1 Proficiency",
    description: "Increase proficiency by 1 (costs both advancement slots).",
    slotCost: 2,
    needsDetail: false,
    minLevel: 2,
  },
  {
    type: "multiclass",
    label: "Multiclass",
    description: "Add a second class (costs both slots; Tier 3+ only).",
    slotCost: 2,
    needsDetail: true,
    minLevel: 5,
  },
];

// ─── Props ────────────────────────────────────────────────────────────────────

interface LevelUpWizardProps {
  character: Character;
  onClose: () => void;
}

// ─── Step indicator ───────────────────────────────────────────────────────────

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-4">
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          className={`
            h-2 rounded-full transition-all duration-200
            ${i === current ? "w-8 bg-gold-500" : i < current ? "w-2 bg-gold-700" : "w-2 bg-burgundy-800"}
          `}
          aria-label={`Step ${i + 1} of ${total}${i === current ? " (current)" : ""}`}
        />
      ))}
    </div>
  );
}

// ─── AdvancementPicker ────────────────────────────────────────────────────────

interface AdvancementPickerProps {
  targetLevel: number;
  character: Character;
  choices: AdvancementChoice[];
  onChange: (choices: AdvancementChoice[]) => void;
}

function AdvancementPicker({ targetLevel, character, choices, onChange }: AdvancementPickerProps) {
  const slotsUsed = choices.reduce((sum, c) => sum + advancementSlotCost(c.type), 0);
  const slotsRemaining = 2 - slotsUsed;

  const [pendingType, setPendingType] = useState<AdvancementType | null>(null);
  const [detailValue, setDetailValue] = useState("");

  const availableOptions = ADVANCEMENT_OPTIONS.filter((opt) => {
    if (opt.minLevel > targetLevel) return false;
    if (opt.slotCost > slotsRemaining) return false;
    return true;
  });

  const handleAdd = (opt: AdvancementOption) => {
    if (opt.needsDetail) {
      setPendingType(opt.type);
      setDetailValue("");
      return;
    }
    onChange([...choices, { type: opt.type }]);
  };

  const handleConfirmDetail = () => {
    if (!pendingType || !detailValue.trim()) return;
    onChange([...choices, { type: pendingType, detail: detailValue.trim() }]);
    setPendingType(null);
    setDetailValue("");
  };

  const handleRemove = (index: number) => {
    onChange(choices.filter((_, i) => i !== index));
  };

  const handleCancelDetail = () => {
    setPendingType(null);
    setDetailValue("");
  };

  // Detail input rendering based on type
  const renderDetailInput = () => {
    if (!pendingType) return null;

    const opt = ADVANCEMENT_OPTIONS.find((o) => o.type === pendingType);
    if (!opt) return null;

    return (
      <div className="mt-3 rounded-lg border border-gold-800 bg-slate-850 p-3 space-y-2">
        <p className="text-xs text-parchment-400">
          {opt.label}: specify detail
        </p>

        {pendingType === "trait-bonus" && (
          <select
            value={detailValue}
            onChange={(e) => setDetailValue(e.target.value)}
            aria-label="Select stat to increase"
            className="
              w-full rounded bg-slate-900 px-2 py-1.5 text-sm text-parchment-200
              border border-burgundy-800 focus:outline-none focus:ring-1 focus:ring-gold-500
            "
          >
            <option value="">Select stat...</option>
            {CORE_STATS.map((stat) => (
              <option key={stat} value={stat}>
                {stat.charAt(0).toUpperCase() + stat.slice(1)} (currently {character.stats[stat]})
              </option>
            ))}
          </select>
        )}

        {pendingType === "experience-bonus" && (
          <select
            value={detailValue}
            onChange={(e) => setDetailValue(e.target.value)}
            aria-label="Select experience to increase"
            className="
              w-full rounded bg-slate-900 px-2 py-1.5 text-sm text-parchment-200
              border border-burgundy-800 focus:outline-none focus:ring-1 focus:ring-gold-500
            "
          >
            <option value="">Select experience...</option>
            {character.experiences.map((exp) => (
              <option key={exp.name} value={exp.name}>
                {exp.name} (+{exp.bonus})
              </option>
            ))}
          </select>
        )}

        {(pendingType === "new-experience" || pendingType === "multiclass" || pendingType === "additional-domain-card") && (
          <input
            type="text"
            value={detailValue}
            onChange={(e) => setDetailValue(e.target.value)}
            placeholder={
              pendingType === "new-experience"
                ? "Experience name"
                : pendingType === "multiclass"
                ? "Class ID for multiclass"
                : "Card ID"
            }
            aria-label={
              pendingType === "new-experience"
                ? "New experience name"
                : pendingType === "multiclass"
                ? "Multiclass target class"
                : "Additional domain card ID"
            }
            className="
              w-full rounded bg-slate-900 px-2 py-1.5 text-sm text-parchment-200
              border border-burgundy-800 focus:outline-none focus:ring-1 focus:ring-gold-500
              placeholder-parchment-700
            "
          />
        )}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleConfirmDetail}
            disabled={!detailValue.trim()}
            className="
              rounded px-3 py-1.5 text-xs font-semibold
              bg-gold-800/80 text-parchment-100 border border-gold-600
              hover:bg-gold-700 transition-colors
              disabled:opacity-40 disabled:cursor-not-allowed
              focus:outline-none focus:ring-2 focus:ring-gold-500
            "
          >
            Add
          </button>
          <button
            type="button"
            onClick={handleCancelDetail}
            className="
              rounded px-3 py-1.5 text-xs font-semibold
              bg-slate-800 text-parchment-400 border border-burgundy-800
              hover:bg-slate-700 transition-colors
              focus:outline-none focus:ring-2 focus:ring-gold-500
            "
          >
            Cancel
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-parchment-200">
          Choose Advancements
        </h3>
        <span className={`text-xs font-bold ${slotsRemaining === 0 ? "text-emerald-400" : "text-gold-500"}`}>
          {slotsUsed}/2 slots used
        </span>
      </div>

      {/* Current choices */}
      {choices.length > 0 && (
        <div className="space-y-1">
          {choices.map((choice, i) => {
            const opt = ADVANCEMENT_OPTIONS.find((o) => o.type === choice.type);
            return (
              <div
                key={i}
                className="flex items-center justify-between rounded border border-gold-800/40 bg-gold-950/20 px-3 py-2"
              >
                <div>
                  <span className="text-sm text-parchment-200">{opt?.label ?? choice.type}</span>
                  {choice.detail && (
                    <span className="ml-2 text-xs text-parchment-500">({choice.detail})</span>
                  )}
                  {opt && opt.slotCost === 2 && (
                    <span className="ml-2 text-[10px] text-gold-600 font-bold">2 SLOTS</span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => handleRemove(i)}
                  aria-label={`Remove ${opt?.label ?? choice.type}`}
                  className="text-burgundy-500 hover:text-burgundy-300 text-xs px-1 transition-colors focus:outline-none focus:ring-1 focus:ring-gold-500 rounded"
                >
                  Remove
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Available options (only when slots remain) */}
      {slotsRemaining > 0 && !pendingType && (
        <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
          {availableOptions.map((opt) => (
            <button
              key={opt.type}
              type="button"
              onClick={() => handleAdd(opt)}
              className="
                flex flex-col items-start rounded-lg border border-burgundy-800 bg-slate-850 p-3
                text-left transition-colors hover:border-gold-700 hover:bg-slate-800
                focus:outline-none focus:ring-2 focus:ring-gold-500
              "
            >
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-parchment-200">{opt.label}</span>
                {opt.slotCost === 2 && (
                  <span className="rounded bg-gold-900/50 px-1.5 text-[10px] font-bold text-gold-500">
                    2 slots
                  </span>
                )}
              </div>
              <span className="mt-0.5 text-[11px] text-parchment-500">{opt.description}</span>
            </button>
          ))}
        </div>
      )}

      {/* Detail input overlay */}
      {renderDetailInput()}
    </div>
  );
}

// ─── DomainCardPicker ─────────────────────────────────────────────────────────

interface DomainCardPickerProps {
  character: Character;
  targetLevel: number;
  selectedCardId: string | null;
  onSelect: (cardId: string | null) => void;
}

function DomainCardPicker({ character, targetLevel, selectedCardId, onSelect }: DomainCardPickerProps) {
  // Fetch cards for each domain the character has
  const domain0 = character.domains[0];
  const domain1 = character.domains[1];

  const { data: domainData0 } = useDomain(domain0);
  const { data: domainData1 } = useDomain(domain1);

  // Combine and filter cards
  const allCards = useMemo(() => {
    const cards: DomainCard[] = [];
    if (domainData0?.cards) cards.push(...domainData0.cards);
    if (domainData1?.cards) cards.push(...domainData1.cards);
    return cards;
  }, [domainData0, domainData1]);

  // Filter: card.level <= targetLevel and not already owned
  const ownedSet = useMemo(() => new Set([...character.domainVault, ...character.domainLoadout]), [character.domainVault, character.domainLoadout]);

  const availableCards = useMemo(() => {
    return allCards
      .filter((c) => c.level <= targetLevel && !ownedSet.has(c.cardId))
      .sort((a, b) => a.level - b.level || a.domain.localeCompare(b.domain) || a.name.localeCompare(b.name));
  }, [allCards, targetLevel, ownedSet]);

  if (!domain0 && !domain1) {
    return (
      <p className="text-xs text-parchment-600 italic">
        No domains assigned. Select a class first.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-parchment-200">
          Acquire Domain Card
        </h3>
        {selectedCardId && (
          <button
            type="button"
            onClick={() => onSelect(null)}
            className="text-xs text-parchment-500 hover:text-parchment-300 transition-colors focus:outline-none focus:ring-1 focus:ring-gold-500 rounded px-1"
          >
            Clear selection
          </button>
        )}
      </div>

      <p className="text-[11px] text-parchment-500">
        Choose one card from your domains (level {targetLevel} or below).
        Cards you already own are excluded. You may skip this step.
      </p>

      {availableCards.length === 0 ? (
        <p className="text-xs text-parchment-600 italic">
          No new cards available at this level.
        </p>
      ) : (
        <ul className="space-y-1 max-h-64 overflow-y-auto pr-1" role="listbox" aria-label="Available domain cards">
          {availableCards.map((card) => (
            <li key={card.cardId}>
              <button
                type="button"
                onClick={() => onSelect(card.cardId === selectedCardId ? null : card.cardId)}
                role="option"
                aria-selected={selectedCardId === card.cardId}
                className={`
                  w-full flex items-center gap-2 rounded px-3 py-2
                  text-left transition-colors
                  focus:outline-none focus:ring-1 focus:ring-gold-500
                  ${selectedCardId === card.cardId
                    ? "bg-gold-900/40 border border-gold-600"
                    : "border border-transparent hover:bg-burgundy-900/30 hover:border-burgundy-800"
                  }
                `}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-parchment-200 truncate">
                      {card.name}
                    </span>
                    {card.isCursed && (
                      <span title="Cursed" className="text-xs text-burgundy-400 font-bold">Cursed</span>
                    )}
                    {card.isLinkedCurse && (
                      <span title="Linked Curse" className="text-xs text-burgundy-400 font-bold">Linked</span>
                    )}
                  </div>
                  <span className="text-[10px] text-parchment-500 line-clamp-1">
                    {card.description}
                  </span>
                </div>
                <span className="text-[10px] text-parchment-600 uppercase shrink-0">{card.domain}</span>
                <span className="rounded-full border border-gold-800 px-1.5 text-[10px] font-bold text-gold-500 shrink-0">
                  Lv{card.level}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ─── LevelUpWizard (main export) ──────────────────────────────────────────────

export function LevelUpWizard({ character, onClose }: LevelUpWizardProps) {
  const targetLevel = character.level + 1;
  const currentTier = tierForLevel(character.level);
  const newTier     = tierForLevel(targetLevel);
  const hasTierAchievement = isTierAchievement(targetLevel);

  const [step, setStep]           = useState(0);
  const [advancements, setAdvancements] = useState<AdvancementChoice[]>([]);
  const [newDomainCardId, setNewDomainCardId] = useState<string | null>(null);

  const levelUpMutation = useCharacterLevelUp(character.characterId);

  const slotsUsed = advancements.reduce((sum, c) => sum + advancementSlotCost(c.type), 0);
  const advancementsComplete = slotsUsed === 2;

  const STEPS = ["Overview", "Advancements", "Domain Card", "Confirm"];

  const canProceed = useCallback((): boolean => {
    switch (step) {
      case 0: return true; // overview
      case 1: return advancementsComplete;
      case 2: return true; // domain card is optional
      case 3: return true; // confirm
      default: return false;
    }
  }, [step, advancementsComplete]);

  const handleSubmit = () => {
    const input: LevelUpInput = {
      targetLevel,
      advancements,
      newDomainCardId,
    };

    levelUpMutation.mutate(input, {
      onSuccess: () => {
        onClose();
      },
    });
  };

  if (targetLevel > 10) {
    return (
      <div className="rounded-xl border border-burgundy-900 bg-slate-900/95 p-6 shadow-card-fantasy-hover">
        <h2 className="font-serif text-lg font-semibold text-parchment-200 mb-3">
          Maximum Level Reached
        </h2>
        <p className="text-sm text-parchment-400 mb-4">
          Your character is already at level 10, the maximum level.
        </p>
        <button
          type="button"
          onClick={onClose}
          className="
            rounded-lg px-4 py-2 text-sm font-semibold
            bg-burgundy-800 text-parchment-200 border border-burgundy-700
            hover:bg-burgundy-700 transition-colors
            focus:outline-none focus:ring-2 focus:ring-gold-500
          "
        >
          Close
        </button>
      </div>
    );
  }

  return (
    <div
      className="rounded-xl border border-gold-800/60 bg-slate-900/98 p-6 shadow-card-fantasy-hover space-y-5"
      role="dialog"
      aria-label={`Level up to level ${targetLevel}`}
      aria-modal="true"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="font-serif text-lg font-semibold text-gold-400">
          Level Up: {character.level} &rarr; {targetLevel}
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Cancel level up"
          className="text-parchment-600 hover:text-parchment-300 text-sm transition-colors focus:outline-none focus:ring-1 focus:ring-gold-500 rounded px-2 py-1"
        >
          Cancel
        </button>
      </div>

      <StepIndicator current={step} total={STEPS.length} />

      {/* Step content */}
      <div className="min-h-[200px]">
        {/* Step 0: Overview */}
        {step === 0 && (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-parchment-200">
              {STEPS[0]}
            </h3>

            <div className="rounded-lg border border-burgundy-800 bg-slate-850 p-4 space-y-2">
              <p className="text-sm text-parchment-300">
                <span className="font-semibold text-parchment-200">{character.name}</span> will advance to level {targetLevel}.
              </p>

              {/* Tier info */}
              {newTier !== currentTier && (
                <div className="rounded border border-gold-800 bg-gold-950/30 p-3">
                  <p className="text-sm font-semibold text-gold-400">
                    Tier {currentTier} &rarr; Tier {newTier}
                  </p>
                </div>
              )}

              {/* Automatic bonuses */}
              <div className="space-y-1.5 pt-2">
                <p className="text-[10px] uppercase tracking-wider text-parchment-600 font-medium">
                  Automatic Bonuses
                </p>
                <ul className="space-y-1 text-sm text-parchment-400">
                  <li className="flex items-center gap-2">
                    <span className="text-emerald-400 text-xs font-bold">+1</span>
                    Major Damage Threshold ({character.damageThresholds.major} &rarr; {character.damageThresholds.major + 1})
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-emerald-400 text-xs font-bold">+1</span>
                    Severe Damage Threshold ({character.damageThresholds.severe} &rarr; {character.damageThresholds.severe + 1})
                  </li>
                  {hasTierAchievement && (
                    <>
                      <li className="flex items-center gap-2">
                        <span className="text-gold-400 text-xs font-bold">+1</span>
                        <span className="text-gold-300">Proficiency (Tier Achievement)</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="text-gold-400 text-xs font-bold">+1</span>
                        <span className="text-gold-300">New Experience at +2 (Tier Achievement)</span>
                      </li>
                    </>
                  )}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Step 1: Advancements */}
        {step === 1 && (
          <AdvancementPicker
            targetLevel={targetLevel}
            character={character}
            choices={advancements}
            onChange={setAdvancements}
          />
        )}

        {/* Step 2: Domain Card */}
        {step === 2 && (
          <DomainCardPicker
            character={character}
            targetLevel={targetLevel}
            selectedCardId={newDomainCardId}
            onSelect={setNewDomainCardId}
          />
        )}

        {/* Step 3: Confirm */}
        {step === 3 && (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-parchment-200">
              Confirm Level Up
            </h3>

            <div className="rounded-lg border border-burgundy-800 bg-slate-850 p-4 space-y-3">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-parchment-600 font-medium mb-1">
                  Target Level
                </p>
                <p className="text-lg font-bold text-gold-400">{targetLevel}</p>
              </div>

              {hasTierAchievement && (
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-parchment-600 font-medium mb-1">
                    Tier Achievement
                  </p>
                  <p className="text-sm text-gold-300">+1 Proficiency, +1 Experience at +2</p>
                </div>
              )}

              <div>
                <p className="text-[10px] uppercase tracking-wider text-parchment-600 font-medium mb-1">
                  Automatic
                </p>
                <p className="text-sm text-parchment-400">+1 Major Threshold, +1 Severe Threshold</p>
              </div>

              <div>
                <p className="text-[10px] uppercase tracking-wider text-parchment-600 font-medium mb-1">
                  Advancements ({slotsUsed}/2 slots)
                </p>
                {advancements.length === 0 ? (
                  <p className="text-xs text-parchment-600 italic">None selected</p>
                ) : (
                  <ul className="space-y-1">
                    {advancements.map((adv, i) => {
                      const opt = ADVANCEMENT_OPTIONS.find((o) => o.type === adv.type);
                      return (
                        <li key={i} className="text-sm text-parchment-300">
                          {opt?.label ?? adv.type}
                          {adv.detail && <span className="text-parchment-500"> ({adv.detail})</span>}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              <div>
                <p className="text-[10px] uppercase tracking-wider text-parchment-600 font-medium mb-1">
                  New Domain Card
                </p>
                <p className="text-sm text-parchment-300">
                  {newDomainCardId ?? "None (skipped)"}
                </p>
              </div>
            </div>

            {/* Error display */}
            {levelUpMutation.isError && (
              <div role="alert" className="rounded border border-burgundy-600 bg-burgundy-950/50 px-3 py-2">
                <p className="text-xs text-burgundy-300">
                  {levelUpMutation.error instanceof ApiError
                    ? levelUpMutation.error.message
                    : levelUpMutation.error?.message ?? "Level up failed."}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Navigation buttons */}
      <div className="flex items-center justify-between border-t border-burgundy-900/40 pt-4">
        <button
          type="button"
          onClick={() => step === 0 ? onClose() : setStep(step - 1)}
          disabled={levelUpMutation.isPending}
          className="
            rounded-lg px-4 py-2 text-sm font-semibold
            bg-slate-800 text-parchment-400 border border-burgundy-800
            hover:bg-slate-700 transition-colors
            disabled:opacity-50
            focus:outline-none focus:ring-2 focus:ring-gold-500
          "
        >
          {step === 0 ? "Cancel" : "Back"}
        </button>

        {step < STEPS.length - 1 ? (
          <button
            type="button"
            onClick={() => setStep(step + 1)}
            disabled={!canProceed()}
            className="
              rounded-lg px-4 py-2 text-sm font-semibold
              bg-gold-800/80 text-parchment-100 border border-gold-600
              hover:bg-gold-700 transition-colors
              disabled:opacity-40 disabled:cursor-not-allowed
              focus:outline-none focus:ring-2 focus:ring-gold-500
            "
          >
            Next
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!advancementsComplete || levelUpMutation.isPending}
            aria-busy={levelUpMutation.isPending}
            className="
              rounded-lg px-6 py-2 text-sm font-bold
              bg-gold-600 text-slate-900 border border-gold-500
              hover:bg-gold-500 transition-colors
              disabled:opacity-40 disabled:cursor-not-allowed
              focus:outline-none focus:ring-2 focus:ring-gold-500
              shadow-glow-gold
            "
          >
            {levelUpMutation.isPending ? (
              <span className="flex items-center gap-2">
                <span
                  aria-hidden="true"
                  className="h-3 w-3 animate-spin rounded-full border border-current border-t-transparent"
                />
                Leveling up...
              </span>
            ) : (
              "Confirm Level Up"
            )}
          </button>
        )}
      </div>
    </div>
  );
}
