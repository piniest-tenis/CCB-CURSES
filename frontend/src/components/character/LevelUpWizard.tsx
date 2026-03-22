"use client";

/**
 * src/components/character/LevelUpWizard.tsx
 *
 * Multi-step wizard for leveling a character from level N to N+1.
 *
 * Steps:
 *   1. Overview — shows target level, tier info, automatic bonuses, tier achievements
 *   2. Advancements — pick 2 slots worth of advancement choices (SRD-compliant)
 *   3. Domain Card — pick new domain card(s) to acquire (mandatory, not skippable)
 *   4. Confirm — review all choices and submit
 *
 * SRD rules enforced:
 *   - Exactly 2 advancement slots (proficiency-increase and multiclass cost 2)
 *   - Multiclass only available Tier 3+ (level 5+)
 *   - Tier achievements at levels 2, 5, 8: +1 proficiency (auto), +1 experience at +2
 *   - Tier achievements at levels 5, 8: clear marked traits
 *   - Damage thresholds +1 (auto)
 *   - Domain card level filter: card.level <= targetLevel
 *   - "Extra Domain Card" advancement grants one extra pick on the Domain Card step
 *   - "+1 to Two Traits" marks both stats; once per tier
 *   - "+1 to Two Experiences" boosts two existing experiences
 *   - Subclass upgrade and multiclass are mutually exclusive within a tier
 *   - HP max 12, Stress max 12
 *   - Domain card acquisition is mandatory (cannot skip)
 *
 * Color scheme matches the base character sheet (#577399 steel-blue).
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
import { useDomain, useClass } from "@/hooks/useGameData";
import { MarkdownContent } from "@/components/MarkdownContent";
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

/** Returns the range of levels in a given tier. */
function levelsInTier(tier: number): number[] {
  switch (tier) {
    case 1: return [1];
    case 2: return [2, 3, 4];
    case 3: return [5, 6, 7];
    case 4: return [8, 9, 10];
    default: return [];
  }
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
    label: "+1 to Two Traits",
    description: "Increase two core stats by 1 each (marks them). Once per tier.",
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
    label: "+1 to Two Experiences",
    description: "Increase two existing experiences by 1 each.",
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
    description: "Pick one additional domain card on the Domain Card step.",
    slotCost: 1,
    needsDetail: false,
    minLevel: 2,
  },
  {
    type: "subclass-upgrade",
    label: "Subclass Upgrade",
    description: "Unlock next subclass tier (Foundation -> Specialization -> Mastery). Mutually exclusive with Multiclass per tier.",
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
    description: "Add a second class (costs both slots; Tier 3+ only). Mutually exclusive with Subclass Upgrade per tier.",
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
            ${i === current ? "w-8 bg-[#577399]" : i < current ? "w-2 bg-[#577399]/60" : "w-2 bg-slate-700"}
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
  // For trait-bonus: two stat selections. For experience-bonus: two experience selections.
  const [detailValue1, setDetailValue1] = useState("");
  const [detailValue2, setDetailValue2] = useState("");

  // ── Per-tier restriction helpers ────────────────────────────────────────
  const targetTier = tierForLevel(targetLevel);
  const tierLevels = levelsInTier(targetTier);
  const history = character.levelUpHistory ?? {};

  // Collect prior advancements in this tier
  const priorTierAdvancements = useMemo(() => {
    const result: AdvancementChoice[] = [];
    for (const lv of tierLevels) {
      if (lv < targetLevel && history[lv]) {
        result.push(...history[lv]!);
      }
    }
    return result;
  }, [tierLevels, targetLevel, history]);

  // Check if trait-bonus was already used this tier (in prior levels)
  const traitBonusUsedThisTier = priorTierAdvancements.some((a) => a.type === "trait-bonus");
  // Check if subclass-upgrade was used this tier (in prior levels)
  const subclassUsedThisTier = priorTierAdvancements.some((a) => a.type === "subclass-upgrade");
  // Check if multiclass was used this tier (in prior levels)
  const multiclassUsedThisTier = priorTierAdvancements.some((a) => a.type === "multiclass");
  // Check if multiclass was used ever (in ALL history)
  const multiclassUsedEver = useMemo(() => {
    return Object.values(history).flat().some((a) => a.type === "multiclass");
  }, [history]);

  // Check current selections in this level-up
  const choosingSubclass = choices.some((a) => a.type === "subclass-upgrade");
  const choosingMulticlass = choices.some((a) => a.type === "multiclass");
  const choosingTraitBonus = choices.some((a) => a.type === "trait-bonus");

  const availableOptions = ADVANCEMENT_OPTIONS.filter((opt) => {
    if (opt.minLevel > targetLevel) return false;
    if (opt.slotCost > slotsRemaining) return false;

    // ── SRD Restrictions ────────────────────────────────────────────────

    // trait-bonus: once per tier (across all level-ups in this tier)
    if (opt.type === "trait-bonus") {
      if (traitBonusUsedThisTier || choosingTraitBonus) return false;
    }

    // HP cap: max 12
    if (opt.type === "hp-slot" && character.trackers.hp.max >= 12) return false;
    // Also account for HP slots already chosen in this level-up
    if (opt.type === "hp-slot") {
      const hpSlotsChosen = choices.filter((c) => c.type === "hp-slot").length;
      if (character.trackers.hp.max + hpSlotsChosen >= 12) return false;
    }

    // Stress cap: max 12
    if (opt.type === "stress-slot" && character.trackers.stress.max >= 12) return false;
    if (opt.type === "stress-slot") {
      const stressSlotsChosen = choices.filter((c) => c.type === "stress-slot").length;
      if (character.trackers.stress.max + stressSlotsChosen >= 12) return false;
    }

    // Subclass/multiclass mutual exclusion within a tier
    if (opt.type === "subclass-upgrade") {
      if (multiclassUsedThisTier || choosingMulticlass) return false;
      // Also only 1 subclass-upgrade per tier
      const subclassInTierOrChoices = subclassUsedThisTier || choosingSubclass;
      if (subclassInTierOrChoices) return false;
    }
    if (opt.type === "multiclass") {
      if (subclassUsedThisTier || choosingSubclass) return false;
      // Multiclass is permanently once only
      if (multiclassUsedEver || choosingMulticlass) return false;
    }

    return true;
  });

  const handleAdd = (opt: AdvancementOption) => {
    if (opt.needsDetail) {
      setPendingType(opt.type);
      setDetailValue1("");
      setDetailValue2("");
      return;
    }
    onChange([...choices, { type: opt.type }]);
  };

  const handleConfirmDetail = () => {
    if (!pendingType) return;

    if (pendingType === "trait-bonus") {
      if (!detailValue1 || !detailValue2 || detailValue1 === detailValue2) return;
      onChange([...choices, { type: pendingType, detail: `${detailValue1},${detailValue2}` }]);
    } else if (pendingType === "experience-bonus") {
      if (!detailValue1 || !detailValue2) return;
      onChange([...choices, { type: pendingType, detail: `${detailValue1},${detailValue2}` }]);
    } else {
      // multiclass — single text detail
      if (!detailValue1.trim()) return;
      onChange([...choices, { type: pendingType, detail: detailValue1.trim() }]);
    }

    setPendingType(null);
    setDetailValue1("");
    setDetailValue2("");
  };

  const handleRemove = (index: number) => {
    onChange(choices.filter((_, i) => i !== index));
  };

  const handleCancelDetail = () => {
    setPendingType(null);
    setDetailValue1("");
    setDetailValue2("");
  };

  // Check if confirm button should be enabled for detail input
  const isDetailValid = () => {
    if (!pendingType) return false;
    if (pendingType === "trait-bonus") {
      return !!detailValue1 && !!detailValue2 && detailValue1 !== detailValue2;
    }
    if (pendingType === "experience-bonus") {
      return !!detailValue1 && !!detailValue2;
    }
    return !!detailValue1.trim();
  };

  // Detail input rendering based on type
  const renderDetailInput = () => {
    if (!pendingType) return null;

    const opt = ADVANCEMENT_OPTIONS.find((o) => o.type === pendingType);
    if (!opt) return null;

    return (
      <div className="mt-3 rounded-lg border border-[#577399]/40 bg-slate-850 p-3 space-y-2">
        <p className="text-xs text-parchment-400">
          {opt.label}: specify details
        </p>

        {pendingType === "trait-bonus" && (
          <>
            <label className="block text-[10px] text-parchment-500 uppercase tracking-wider">First stat</label>
            <select
              value={detailValue1}
              onChange={(e) => setDetailValue1(e.target.value)}
              aria-label="Select first stat to increase"
              className="
                w-full rounded bg-slate-900 px-2 py-1.5 text-sm text-parchment-200
                border border-[#577399]/40 focus:outline-none focus:ring-1 focus:ring-[#577399]
              "
            >
              <option value="">Select stat...</option>
              {CORE_STATS.filter((s) => s !== detailValue2).map((stat) => (
                <option key={stat} value={stat}>
                  {stat.charAt(0).toUpperCase() + stat.slice(1)} (currently {character.stats[stat]})
                </option>
              ))}
            </select>
            <label className="block text-[10px] text-parchment-500 uppercase tracking-wider mt-1">Second stat</label>
            <select
              value={detailValue2}
              onChange={(e) => setDetailValue2(e.target.value)}
              aria-label="Select second stat to increase"
              className="
                w-full rounded bg-slate-900 px-2 py-1.5 text-sm text-parchment-200
                border border-[#577399]/40 focus:outline-none focus:ring-1 focus:ring-[#577399]
              "
            >
              <option value="">Select stat...</option>
              {CORE_STATS.filter((s) => s !== detailValue1).map((stat) => (
                <option key={stat} value={stat}>
                  {stat.charAt(0).toUpperCase() + stat.slice(1)} (currently {character.stats[stat]})
                </option>
              ))}
            </select>
            {detailValue1 && detailValue2 && detailValue1 === detailValue2 && (
              <p className="text-[10px] text-[#fe5f55]">Must select two different stats</p>
            )}
          </>
        )}

        {pendingType === "experience-bonus" && (
          <>
            <label className="block text-[10px] text-parchment-500 uppercase tracking-wider">First experience</label>
            <select
              value={detailValue1}
              onChange={(e) => setDetailValue1(e.target.value)}
              aria-label="Select first experience to increase"
              className="
                w-full rounded bg-slate-900 px-2 py-1.5 text-sm text-parchment-200
                border border-[#577399]/40 focus:outline-none focus:ring-1 focus:ring-[#577399]
              "
            >
              <option value="">Select experience...</option>
              {character.experiences.map((exp) => (
                <option key={exp.name} value={exp.name}>
                  {exp.name} (+{exp.bonus})
                </option>
              ))}
            </select>
            <label className="block text-[10px] text-parchment-500 uppercase tracking-wider mt-1">Second experience</label>
            <select
              value={detailValue2}
              onChange={(e) => setDetailValue2(e.target.value)}
              aria-label="Select second experience to increase"
              className="
                w-full rounded bg-slate-900 px-2 py-1.5 text-sm text-parchment-200
                border border-[#577399]/40 focus:outline-none focus:ring-1 focus:ring-[#577399]
              "
            >
              <option value="">Select experience...</option>
              {character.experiences.map((exp) => (
                <option key={exp.name} value={exp.name}>
                  {exp.name} (+{exp.bonus})
                </option>
              ))}
            </select>
          </>
        )}

        {pendingType === "multiclass" && (
          <input
            type="text"
            value={detailValue1}
            onChange={(e) => setDetailValue1(e.target.value)}
            placeholder="Class ID for multiclass"
            aria-label="Multiclass target class"
            className="
              w-full rounded bg-slate-900 px-2 py-1.5 text-sm text-parchment-200
              border border-[#577399]/40 focus:outline-none focus:ring-1 focus:ring-[#577399]
              placeholder-parchment-700
            "
          />
        )}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleConfirmDetail}
            disabled={!isDetailValid()}
            className="
              rounded px-3 py-1.5 text-xs font-semibold
              bg-[#577399]/80 text-[#f7f7ff] border border-[#577399]
              hover:bg-[#577399] transition-colors
              disabled:opacity-40 disabled:cursor-not-allowed
              focus:outline-none focus:ring-2 focus:ring-[#577399]
            "
          >
            Add
          </button>
          <button
            type="button"
            onClick={handleCancelDetail}
            className="
              rounded px-3 py-1.5 text-xs font-semibold
              bg-slate-800 text-parchment-400 border border-slate-700
              hover:bg-slate-700 transition-colors
              focus:outline-none focus:ring-2 focus:ring-[#577399]
            "
          >
            Cancel
          </button>
        </div>
      </div>
    );
  };

  /** Format the detail string for display (turn "agility,strength" into "Agility, Strength") */
  const formatDetail = (choice: AdvancementChoice): string | null => {
    if (!choice.detail) return null;
    if (choice.type === "trait-bonus" || choice.type === "experience-bonus") {
      return choice.detail
        .split(",")
        .map((s) => s.trim())
        .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
        .join(", ");
    }
    return choice.detail;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-parchment-200">
          Choose Advancements
        </h3>
        <span className={`text-xs font-bold ${slotsRemaining === 0 ? "text-emerald-400" : "text-[#577399]"}`}>
          {slotsUsed}/2 slots used
        </span>
      </div>

      {/* Current choices */}
      {choices.length > 0 && (
        <div className="space-y-1">
          {choices.map((choice, i) => {
            const opt = ADVANCEMENT_OPTIONS.find((o) => o.type === choice.type);
            const displayDetail = formatDetail(choice);
            return (
              <div
                key={i}
                className="flex items-center justify-between rounded border border-[#577399]/30 bg-[#577399]/10 px-3 py-2"
              >
                <div>
                  <span className="text-sm text-parchment-200">{opt?.label ?? choice.type}</span>
                  {displayDetail && (
                    <span className="ml-2 text-xs text-parchment-500">({displayDetail})</span>
                  )}
                  {opt && opt.slotCost === 2 && (
                    <span className="ml-2 text-[10px] text-[#577399] font-bold">2 SLOTS</span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => handleRemove(i)}
                  aria-label={`Remove ${opt?.label ?? choice.type}`}
                  className="text-[#fe5f55] hover:text-[#fe5f55]/80 text-xs px-1 transition-colors focus:outline-none focus:ring-1 focus:ring-[#577399] rounded"
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
                flex flex-col items-start rounded-lg border border-[#577399]/30 bg-slate-900/80 p-3
                text-left transition-colors hover:border-[#577399]/60 hover:bg-slate-800
                focus:outline-none focus:ring-2 focus:ring-[#577399]
              "
            >
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-parchment-200">{opt.label}</span>
                {opt.slotCost === 2 && (
                  <span className="rounded bg-[#577399]/20 px-1.5 text-[10px] font-bold text-[#577399]">
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
// Matches the drilldown selection pattern used in DomainCardSelectionPanel
// (character builder): list of CardRow items → CardDetail drill-down with full
// markdown-rendered card text and a select/deselect button.

/** Truncate text to ≤50 characters for collapsed list view. */
function truncateCardText(text: string, max = 50): string {
  if (!text) return "";
  const cleaned = text.replace(/\*\*/g, "").replace(/\n/g, " ").trim();
  return cleaned.length <= max ? cleaned : cleaned.slice(0, max - 1) + "…";
}

// ── Card Detail (drill-down view) ─────────────────────────────────────────────

function LevelUpCardDetail({
  card,
  isSelected,
  canSelect,
  onToggle,
  onBack,
}: {
  card: DomainCard;
  isSelected: boolean;
  canSelect: boolean;
  onToggle: () => void;
  onBack: () => void;
}) {
  return (
    <div className="flex flex-col">
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-1.5 px-4 py-3 text-xs text-[#b9baa3]/50 hover:text-[#b9baa3] transition-colors shrink-0"
      >
        ← Back to cards
      </button>
      <div className="flex-1 overflow-y-auto px-6 py-2 space-y-4">
        {/* Header */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs uppercase tracking-wider text-[#b9baa3]/40">
              {card.domain}
            </span>
            <span className="text-[#b9baa3]/20">·</span>
            <span className="text-xs uppercase tracking-wider text-[#b9baa3]/40">
              Level {card.level}
            </span>
            {card.isGrimoire && (
              <>
                <span className="text-[#b9baa3]/20">·</span>
                <span className="text-xs uppercase tracking-wider text-[#daa520]/60">Grimoire</span>
              </>
            )}
            {card.isCursed && (
              <>
                <span className="text-[#b9baa3]/20">·</span>
                <span className="text-xs uppercase tracking-wider text-[#fe5f55]/60">Cursed</span>
              </>
            )}
            {card.isLinkedCurse && (
              <>
                <span className="text-[#b9baa3]/20">·</span>
                <span className="text-xs uppercase tracking-wider text-[#fe5f55]/60">Linked Curse</span>
              </>
            )}
          </div>
          <h4 className="font-serif text-xl font-bold text-[#f7f7ff]">{card.name}</h4>
        </div>

        {/* Recall cost */}
        <div className="flex gap-4 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase tracking-wider text-[#b9baa3]/40">Recall Cost</span>
            <span className="rounded border border-slate-700 bg-slate-900 px-2 py-0.5 font-bold text-[#f7f7ff]">
              {typeof card.level === "number" ? card.level : "—"}
            </span>
          </div>
        </div>

        {/* Full card text — markdown rendered */}
        <div className="rounded-lg border border-slate-700/60 bg-slate-900/40 px-4 py-3">
          {card.isGrimoire && card.grimoire.length > 0 ? (
            <div className="space-y-3">
              {card.grimoire.map((ability, i) => (
                <div key={i}>
                  <p className="text-sm font-semibold text-[#f7f7ff] mb-1">{ability.name}</p>
                  <MarkdownContent className="text-sm text-[#b9baa3]/75">
                    {ability.description}
                  </MarkdownContent>
                </div>
              ))}
            </div>
          ) : (
            <MarkdownContent className="text-sm text-[#b9baa3]/75">
              {card.description}
            </MarkdownContent>
          )}
        </div>

        {card.isCursed && card.curseText && (
          <div className="rounded-lg border border-[#fe5f55]/30 bg-[#fe5f55]/5 px-4 py-3">
            <p className="text-xs uppercase tracking-wider text-[#fe5f55]/60 mb-1">Curse</p>
            <MarkdownContent className="text-sm text-[#b9baa3]/70">
              {card.curseText}
            </MarkdownContent>
          </div>
        )}

        {/* Select / deselect */}
        <button
          type="button"
          onClick={onToggle}
          disabled={!canSelect && !isSelected}
          className={`
            w-full rounded-lg px-4 py-3 font-semibold text-sm transition-colors
            ${isSelected
              ? "bg-[#577399]/20 border-2 border-[#577399] text-[#577399] hover:bg-[#577399]/30"
              : canSelect
                ? "bg-[#577399] text-white hover:bg-[#577399]/80"
                : "bg-slate-800/50 border border-slate-700/40 text-[#b9baa3]/30 cursor-not-allowed"
            }
          `}
        >
          {isSelected ? "Selected — click to deselect" : canSelect ? "Select this card" : "Maximum cards already selected"}
        </button>
      </div>
    </div>
  );
}

// ── Card Row (list item) ──────────────────────────────────────────────────────

function LevelUpCardRow({
  card,
  isSelected,
  canSelect,
  onToggle,
  onDrill,
}: {
  card: DomainCard;
  isSelected: boolean;
  canSelect: boolean;
  onToggle: () => void;
  onDrill: () => void;
}) {
  return (
    <div
      onClick={onDrill}
      className={`
        flex items-center rounded-lg border transition-all cursor-pointer
        ${isSelected
          ? "border-[#577399] bg-[#577399]/15"
          : "border-slate-700/60 bg-slate-900/30 hover:border-slate-600"
        }
      `}
    >
      {/* Circular select button */}
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); if (canSelect || isSelected) onToggle(); }}
        disabled={!canSelect && !isSelected}
        aria-label={isSelected ? `Deselect ${card.name}` : `Select ${card.name}`}
        className={`
          ml-3 h-5 w-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors
          ${isSelected
            ? "border-[#577399] bg-[#577399]"
            : !canSelect
              ? "border-slate-700/40 cursor-not-allowed"
              : "border-slate-600 hover:border-[#577399]/70"
          }
        `}
      >
        {isSelected && <span className="h-2 w-2 rounded-full bg-white" />}
      </button>

      {/* Text — fills remaining space, clicking goes to drill-down via parent */}
      <div className="flex-1 flex items-center gap-3 px-3 py-3 min-w-0">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-[#f7f7ff] truncate">{card.name}</span>
            <span className="text-xs text-[#b9baa3]/40 shrink-0">{card.domain}</span>
            {card.isCursed && (
              <span className="text-[10px] text-[#fe5f55] font-bold shrink-0">Cursed</span>
            )}
            {card.isLinkedCurse && (
              <span className="text-[10px] text-[#fe5f55] font-bold shrink-0">Linked</span>
            )}
            {card.isGrimoire && (
              <span className="text-[10px] text-[#daa520]/60 font-bold shrink-0">Grimoire</span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs text-[#b9baa3]/40">Lvl {card.level}</span>
            <span className="text-[#b9baa3]/20 text-xs">·</span>
            <span className="text-xs text-[#b9baa3]/50 truncate">
              {truncateCardText(card.isGrimoire
                ? (card.grimoire[0]?.description ?? card.description)
                : card.description)}
            </span>
          </div>
        </div>
      </div>

      {/* Drill-down chevron */}
      <span className="pr-3 text-[#b9baa3]/30 text-lg leading-none shrink-0">›</span>
    </div>
  );
}

// ── Main DomainCardPicker ─────────────────────────────────────────────────────

interface DomainCardPickerProps {
  character: Character;
  targetLevel: number;
  /** How many cards the user may select (1 = normal, 2 = has Extra Domain Card advancement) */
  maxSelections: number;
  selectedCardIds: string[];
  onSelect: (cardIds: string[]) => void;
}

function DomainCardPicker({ character, targetLevel, maxSelections, selectedCardIds, onSelect }: DomainCardPickerProps) {
  const [detailCard, setDetailCard] = useState<DomainCard | null>(null);

  // Fetch the class data to get authoritative domain names (matches DomainLoadout pattern)
  const { data: classData, isLoading: classLoading } = useClass(character.classId || undefined);
  const classDomains = classData?.domains ?? [];
  const domain0 = classDomains[0];
  const domain1 = classDomains[1];

  const { data: domainData0, isLoading: loading0 } = useDomain(domain0);
  const { data: domainData1, isLoading: loading1 } = useDomain(domain1);

  const isLoading = classLoading || (!!domain0 && loading0) || (!!domain1 && loading1);

  // Combine and filter cards
  const allCards = useMemo(() => {
    const cards: DomainCard[] = [];
    if (domainData0?.cards) cards.push(...domainData0.cards);
    if (domainData1?.cards) cards.push(...domainData1.cards);
    return cards;
  }, [domainData0, domainData1]);

  // Build owned set using the same prefixed format as the builder: "domain/cardId"
  const ownedSet = useMemo(() => {
    const set = new Set<string>();
    for (const id of [...character.domainVault, ...character.domainLoadout]) {
      set.add(id);
      // Also add the raw cardId portion so both formats match
      const slash = id.indexOf("/");
      if (slash !== -1) set.add(id.slice(slash + 1));
    }
    return set;
  }, [character.domainVault, character.domainLoadout]);

  const availableCards = useMemo(() => {
    return allCards
      .filter((c) => {
        if (c.level > targetLevel) return false;
        // Check both "domain/cardId" prefixed and raw "cardId" against owned set
        if (ownedSet.has(`${c.domain}/${c.cardId}`) || ownedSet.has(c.cardId)) return false;
        return true;
      })
      .sort((a, b) => a.level - b.level || a.domain.localeCompare(b.domain) || a.name.localeCompare(b.name));
  }, [allCards, targetLevel, ownedSet]);

  const handleToggle = (card: DomainCard) => {
    const cardId = card.cardId;
    if (selectedCardIds.includes(cardId)) {
      onSelect(selectedCardIds.filter((id) => id !== cardId));
    } else if (selectedCardIds.length < maxSelections) {
      onSelect([...selectedCardIds, cardId]);
    }
  };

  if (!domain0 && !domain1) {
    return (
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-parchment-200">
          Acquire Domain Card
        </h3>
        <p className="text-xs text-parchment-600 italic">
          No domains assigned. This character&apos;s class may not have domains configured.
        </p>
      </div>
    );
  }

  // ── Detail view (drill-down) ──
  if (detailCard) {
    const isSelected = selectedCardIds.includes(detailCard.cardId);
    const canSelect = selectedCardIds.length < maxSelections;
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-parchment-200">
            Acquire Domain Card{maxSelections > 1 ? "s" : ""}
          </h3>
          <span className={`text-xs font-bold ${selectedCardIds.length >= 1 ? "text-emerald-400" : "text-[#fe5f55]"}`}>
            {selectedCardIds.length}/{maxSelections} selected
          </span>
        </div>
        <LevelUpCardDetail
          card={detailCard}
          isSelected={isSelected}
          canSelect={canSelect}
          onToggle={() => handleToggle(detailCard)}
          onBack={() => setDetailCard(null)}
        />
      </div>
    );
  }

  // ── List view ──
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-parchment-200">
          Acquire Domain Card{maxSelections > 1 ? "s" : ""}
        </h3>
        <div className="flex items-center gap-3">
          <span className={`text-xs font-bold ${selectedCardIds.length >= 1 ? "text-emerald-400" : "text-[#fe5f55]"}`}>
            {selectedCardIds.length}/{maxSelections} selected
          </span>
          {selectedCardIds.length > 0 && (
            <button
              type="button"
              onClick={() => onSelect([])}
              className="text-xs text-parchment-500 hover:text-parchment-300 transition-colors focus:outline-none focus:ring-1 focus:ring-[#577399] rounded px-1"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      <p className="text-[11px] text-parchment-500">
        Choose {maxSelections > 1 ? `up to ${maxSelections} cards` : "one card"} from your domains
        ({domain0 && domain1 ? `${domain0} & ${domain1}` : domain0 ?? domain1}, level {targetLevel} or below).
        {maxSelections > 1 && " You chose Extra Domain Card as an advancement, granting one extra pick."}
        {" "}Cards you already own are excluded.
        {" "}Domain card acquisition is required.
        {" "}Tap a card to view its full details.
      </p>

      {isLoading ? (
        <div className="flex items-center gap-2 py-4">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#577399] border-t-transparent" aria-hidden="true" />
          <span className="text-xs text-parchment-500">Loading domain cards...</span>
        </div>
      ) : availableCards.length === 0 ? (
        <p className="text-xs text-parchment-600 italic">
          No new cards available at this level. You may proceed without selecting a card.
        </p>
      ) : (
        <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
          {availableCards.map((card) => {
            const isSelected = selectedCardIds.includes(card.cardId);
            const atMax = selectedCardIds.length >= maxSelections && !isSelected;
            return (
              <LevelUpCardRow
                key={card.cardId}
                card={card}
                isSelected={isSelected}
                canSelect={!atMax}
                onToggle={() => handleToggle(card)}
                onDrill={() => setDetailCard(card)}
              />
            );
          })}
        </div>
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
  const clearsMarkedTraits = targetLevel === 5 || targetLevel === 8;
  const markedTraits = character.markedTraits ?? [];

  const [step, setStep]           = useState(0);
  const [advancements, setAdvancements] = useState<AdvancementChoice[]>([]);
  // Tracks selected domain card IDs on the Domain Card step.
  // First entry = newDomainCardId, second (if extra domain card advancement) = additional card.
  const [selectedDomainCardIds, setSelectedDomainCardIds] = useState<string[]>([]);

  const levelUpMutation = useCharacterLevelUp(character.characterId);

  const slotsUsed = advancements.reduce((sum, c) => sum + advancementSlotCost(c.type), 0);
  const advancementsComplete = slotsUsed === 2;

  // Check if user chose the "additional-domain-card" advancement
  const hasExtraDomainCard = advancements.some((a) => a.type === "additional-domain-card");
  const maxDomainCardSelections = hasExtraDomainCard ? 2 : 1;

  // Domain card acquisition is mandatory — but if no cards are available, allow proceeding
  const [noCardsAvailable, setNoCardsAvailable] = useState(false);
  const domainCardSatisfied = selectedDomainCardIds.length >= 1 || noCardsAvailable;

  const STEPS = ["Overview", "Advancements", "Domain Card", "Confirm"];

  const canProceed = useCallback((): boolean => {
    switch (step) {
      case 0: return true; // overview
      case 1: return advancementsComplete;
      case 2: return domainCardSatisfied; // mandatory
      case 3: return true; // confirm
      default: return false;
    }
  }, [step, advancementsComplete, domainCardSatisfied]);

  const handleSubmit = () => {
    // Build advancements with extra domain card detail filled in
    const finalAdvancements = advancements.map((adv) => {
      if (adv.type === "additional-domain-card" && selectedDomainCardIds.length > 1) {
        return { ...adv, detail: selectedDomainCardIds[1] };
      }
      return adv;
    });

    const input: LevelUpInput = {
      targetLevel,
      advancements: finalAdvancements,
      newDomainCardId: selectedDomainCardIds[0] ?? null,
    };

    levelUpMutation.mutate(input, {
      onSuccess: () => {
        onClose();
      },
    });
  };

  // When advancements change, trim extra domain card selections if no longer applicable
  const handleAdvancementsChange = (newAdvancements: AdvancementChoice[]) => {
    setAdvancements(newAdvancements);
    const stillHasExtra = newAdvancements.some((a) => a.type === "additional-domain-card");
    if (!stillHasExtra && selectedDomainCardIds.length > 1) {
      setSelectedDomainCardIds(selectedDomainCardIds.slice(0, 1));
    }
  };

  if (targetLevel > 10) {
    return (
      <div className="rounded-xl border border-[#577399]/30 bg-slate-900/95 p-6 shadow-card-fantasy-hover">
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
            bg-slate-800 text-parchment-200 border border-[#577399]/40
            hover:bg-slate-700 transition-colors
            focus:outline-none focus:ring-2 focus:ring-[#577399]
          "
        >
          Close
        </button>
      </div>
    );
  }

  return (
    <div
      className="rounded-xl border border-[#577399]/40 bg-slate-900/98 p-6 shadow-card-fantasy-hover space-y-5"
      role="dialog"
      aria-label={`Level up to level ${targetLevel}`}
      aria-modal="true"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="font-serif text-lg font-semibold text-[#f7f7ff]">
          Level Up: {character.level} &rarr; {targetLevel}
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Cancel level up"
          className="text-parchment-600 hover:text-parchment-300 text-sm transition-colors focus:outline-none focus:ring-1 focus:ring-[#577399] rounded px-2 py-1"
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

            <div className="rounded-lg border border-[#577399]/30 bg-slate-900/80 p-4 space-y-2">
              <p className="text-sm text-parchment-300">
                <span className="font-semibold text-parchment-200">{character.name}</span> will advance to level {targetLevel}.
              </p>

              {/* Tier info */}
              {newTier !== currentTier && (
                <div className="rounded border border-[#577399]/50 bg-[#577399]/10 p-3">
                  <p className="text-sm font-semibold text-[#f7f7ff]">
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
                        <span className="text-[#577399] text-xs font-bold">+1</span>
                        <span className="text-[#b9baa3]">Proficiency (Tier Achievement)</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="text-[#577399] text-xs font-bold">+1</span>
                        <span className="text-[#b9baa3]">New Experience at +2 (Tier Achievement)</span>
                      </li>
                    </>
                  )}
                </ul>
              </div>

              {/* Tier Achievement: Clear Marked Traits */}
              {clearsMarkedTraits && (
                <div className="rounded border border-[#577399]/50 bg-[#577399]/10 p-3 mt-2">
                  <p className="text-xs font-semibold text-[#b9baa3] uppercase tracking-wider mb-1">
                    Tier Achievement: Clear Marked Traits
                  </p>
                  {markedTraits.length > 0 ? (
                    <p className="text-sm text-parchment-300">
                      The following marked traits will be cleared:{" "}
                      <span className="font-semibold text-[#f7f7ff]">
                        {markedTraits.map((t) => t.charAt(0).toUpperCase() + t.slice(1)).join(", ")}
                      </span>
                      . These stats keep their bonuses but are no longer marked, allowing them to be chosen again in future tiers.
                    </p>
                  ) : (
                    <p className="text-sm text-parchment-500 italic">
                      No traits are currently marked. This tier achievement will have no effect on traits.
                    </p>
                  )}
                </div>
              )}

              {/* Domain card mandatory notice */}
              <div className="mt-2 text-[11px] text-parchment-500 italic">
                You will be required to select a domain card in step 3.
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
            onChange={handleAdvancementsChange}
          />
        )}

        {/* Step 2: Domain Card */}
        {step === 2 && (
          <DomainCardPickerWrapper
            character={character}
            targetLevel={targetLevel}
            maxDomainCardSelections={maxDomainCardSelections}
            hasExtraDomainCard={hasExtraDomainCard}
            selectedDomainCardIds={selectedDomainCardIds}
            setSelectedDomainCardIds={setSelectedDomainCardIds}
            onNoCardsAvailable={setNoCardsAvailable}
          />
        )}

        {/* Step 3: Confirm */}
        {step === 3 && (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-parchment-200">
              Confirm Level Up
            </h3>

            <div className="rounded-lg border border-[#577399]/30 bg-slate-900/80 p-4 space-y-3">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-parchment-600 font-medium mb-1">
                  Target Level
                </p>
                <p className="text-lg font-bold text-[#f7f7ff]">{targetLevel}</p>
              </div>

              {hasTierAchievement && (
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-parchment-600 font-medium mb-1">
                    Tier Achievement
                  </p>
                  <p className="text-sm text-[#b9baa3]">
                    +1 Proficiency, +1 Experience at +2
                    {clearsMarkedTraits && ", Clear Marked Traits"}
                  </p>
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
                      let displayDetail: string | null;
                      if (adv.type === "additional-domain-card" && selectedDomainCardIds.length > 1) {
                        displayDetail = selectedDomainCardIds[1] ?? null;
                      } else if (adv.detail && (adv.type === "trait-bonus" || adv.type === "experience-bonus")) {
                        displayDetail = adv.detail
                          .split(",")
                          .map((s) => s.trim().charAt(0).toUpperCase() + s.trim().slice(1))
                          .join(", ");
                      } else {
                        displayDetail = adv.detail ?? null;
                      }
                      return (
                        <li key={i} className="text-sm text-parchment-300">
                          {opt?.label ?? adv.type}
                          {displayDetail && <span className="text-parchment-500"> ({displayDetail})</span>}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              <div>
                <p className="text-[10px] uppercase tracking-wider text-parchment-600 font-medium mb-1">
                  New Domain Card{selectedDomainCardIds.length > 1 ? "s" : ""}
                </p>
                {selectedDomainCardIds.length === 0 ? (
                  <p className="text-sm text-parchment-500 italic">None (no cards available)</p>
                ) : (
                  <ul className="space-y-0.5">
                    {selectedDomainCardIds.map((id, i) => (
                      <li key={id} className="text-sm text-parchment-300">
                        {id}
                        {i === 1 && <span className="ml-1 text-xs text-[#577399]">(extra)</span>}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {/* Error display */}
            {levelUpMutation.isError && (
              <div role="alert" className="rounded border border-[#fe5f55]/60 bg-[#fe5f55]/10 px-3 py-2">
                <p className="text-xs text-[#fe5f55]">
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
      <div className="flex items-center justify-between border-t border-[#577399]/20 pt-4">
        <button
          type="button"
          onClick={() => step === 0 ? onClose() : setStep(step - 1)}
          disabled={levelUpMutation.isPending}
          className="
            rounded-lg px-4 py-2 text-sm font-semibold
            bg-slate-800 text-parchment-400 border border-slate-700
            hover:bg-slate-700 transition-colors
            disabled:opacity-50
            focus:outline-none focus:ring-2 focus:ring-[#577399]
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
              bg-[#577399]/80 text-[#f7f7ff] border border-[#577399]
              hover:bg-[#577399] transition-colors
              disabled:opacity-40 disabled:cursor-not-allowed
              focus:outline-none focus:ring-2 focus:ring-[#577399]
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
              bg-[#577399] text-[#f7f7ff] border border-[#577399]
              hover:bg-[#577399]/80 transition-colors
              disabled:opacity-40 disabled:cursor-not-allowed
              focus:outline-none focus:ring-2 focus:ring-[#577399]
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

// ─── DomainCardPickerWrapper ──────────────────────────────────────────────────
// Thin wrapper that detects when no cards are available to signal the parent.

function DomainCardPickerWrapper({
  character,
  targetLevel,
  maxDomainCardSelections,
  hasExtraDomainCard,
  selectedDomainCardIds,
  setSelectedDomainCardIds,
  onNoCardsAvailable,
}: {
  character: Character;
  targetLevel: number;
  maxDomainCardSelections: number;
  hasExtraDomainCard: boolean;
  selectedDomainCardIds: string[];
  setSelectedDomainCardIds: (ids: string[]) => void;
  onNoCardsAvailable: (v: boolean) => void;
}) {
  // Fetch authoritative domain names from class data (matches DomainCardPicker/DomainLoadout pattern)
  const { data: classData } = useClass(character.classId || undefined);
  const classDomains = classData?.domains ?? [];
  const domain0 = classDomains[0];
  const domain1 = classDomains[1];
  const { data: d0 } = useDomain(domain0);
  const { data: d1 } = useDomain(domain1);

  // Detect no-cards scenario
  React.useEffect(() => {
    // No domains at all (or class data not loaded yet)
    if (!domain0 && !domain1) {
      // Only flag no-cards if class data has loaded (classDomains is populated)
      if (classData) onNoCardsAvailable(true);
      return;
    }
    // If data hasn't loaded yet, don't flag
    if ((domain0 && !d0) || (domain1 && !d1)) return;
    // Check if there are any available cards
    const ownedSet = new Set<string>();
    for (const id of [...character.domainVault, ...character.domainLoadout]) {
      ownedSet.add(id);
      const slash = id.indexOf("/");
      if (slash !== -1) ownedSet.add(id.slice(slash + 1));
    }
    const allCards: DomainCard[] = [];
    if (d0?.cards) allCards.push(...d0.cards);
    if (d1?.cards) allCards.push(...d1.cards);
    const available = allCards.filter((c) => {
      if (c.level > targetLevel) return false;
      if (ownedSet.has(`${c.domain}/${c.cardId}`) || ownedSet.has(c.cardId)) return false;
      return true;
    });
    onNoCardsAvailable(available.length === 0);
  }, [classData, domain0, domain1, d0, d1, character.domainVault, character.domainLoadout, targetLevel, onNoCardsAvailable]);

  return (
    <DomainCardPicker
      character={character}
      targetLevel={targetLevel}
      maxSelections={maxDomainCardSelections}
      selectedCardIds={selectedDomainCardIds}
      onSelect={setSelectedDomainCardIds}
    />
  );
}
