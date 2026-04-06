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
 *   - Multiclass only available Tier 3+ (level 5+), only once ever
 *   - Multiclass mutually exclusive with subclass-upgrade per tier
 *   - Multiclass grants: class feature + one domain (at ≤ half-level cards) + one subclass Foundation
 *   - When multiclassed, domain card step includes multiclass domain at half-level cap
 *   - Tier achievements at levels 2, 5, 8: +1 proficiency (auto), +1 experience at +2
 *   - Tier achievements at levels 5, 8: clear marked traits
 *   - Damage thresholds +1 (auto)
 *   - Domain card level filter: card.level <= targetLevel (primary), card.level <= ceil(targetLevel/2) (multiclass)
 *   - "Extra Domain Card" advancement grants one extra pick on the Domain Card step
 *   - "+1 to Two Traits" marks both stats; once per tier
 *   - "+1 to Two Experiences" boosts two existing experiences
 *   - HP max 12, Stress max 12
 *   - Domain card acquisition is mandatory (cannot skip)
 *
 * Color scheme matches the base character sheet (#577399 steel-blue).
 */

import React, { useState, useMemo, useCallback, useRef, useEffect } from "react";
import type {
  AdvancementType,
  AdvancementChoice,
  CoreStatName,
  DomainCard,
  Character,
  ClassData,
} from "@shared/types";
import { useCharacterLevelUp, type LevelUpInput } from "@/hooks/useCharacter";
import { useDomain, useClass, useClasses } from "@/hooks/useGameData";
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

/** SRD p.43: multiclass domain cards are capped at ceil(characterLevel / 2). */
function multiclassDomainCardCap(characterLevel: number): number {
  return Math.ceil(characterLevel / 2);
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
    description: "Unlock next subclass tier (Foundation → Specialization → Mastery). Mutually exclusive with Multiclass per tier.",
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

const STEP_NAMES = ["Overview", "Advancements", "Domain Card", "Confirm"];

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex flex-col items-center gap-1 mb-4">
      <div className="flex items-center justify-center gap-2">
        {Array.from({ length: total }, (_, i) => (
          <div
            key={i}
            role="img"
            className={`
              h-2 rounded-full transition-all duration-200
              ${i === current ? "w-8 bg-[#577399]" : i < current ? "w-2 bg-[#577399]/60" : "w-2 bg-slate-700"}
            `}
            aria-label={`Step ${i + 1} of ${total}: ${STEP_NAMES[i] ?? ""}${i === current ? " (current)" : ""}`}
          />
        ))}
      </div>
      <p className="text-sm font-semibold text-parchment-400">
        Step {current + 1} of {total}: {STEP_NAMES[current] ?? ""}
      </p>
    </div>
  );
}

// ─── MulticlassPicker ─────────────────────────────────────────────────────────
// A four-phase inline picker: Class → Domain → Subclass → Class Feature.
// Uses the same card-row drill-down pattern as DomainCardPicker.

interface MulticlassPickerProps {
  currentClassId: string;
  /** Pipe-delimited "classId|domainId|subclassId|classFeatureIndex" or "" */
  value: string;
  onChange: (detail: string) => void;
}

function MulticlassPicker({ currentClassId, value, onChange }: MulticlassPickerProps) {
  const { data: classListData, isLoading: classListLoading } = useClasses();

  // Parse current value
  const [selectedClassId, selectedDomainId, selectedSubclassId, selectedFeatureIndex] = useMemo(() => {
    if (!value) return ["", "", "", ""];
    const parts = value.split("|");
    return [parts[0] ?? "", parts[1] ?? "", parts[2] ?? "", parts[3] ?? ""];
  }, [value]);

  const [phase, setPhase] = useState<"class" | "domain" | "subclass" | "feature">(
    selectedSubclassId ? (selectedFeatureIndex !== "" ? "feature" : "subclass") : selectedDomainId ? "domain" : "class"
  );

  // Fetch data for the chosen class (for domain and subclass steps)
  const { data: chosenClassData, isLoading: chosenClassLoading } = useClass(
    selectedClassId || undefined
  );

  // ── Phase: Class selection ────────────────────────────────────────────────

  const availableClasses = useMemo(() => {
    if (!classListData?.classes) return [];
    // Cannot multiclass into the same class
    return classListData.classes.filter((c) => c.classId !== currentClassId);
  }, [classListData, currentClassId]);

  if (classListLoading) {
    return (
      <div className="flex items-center gap-2 py-4">
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#577399] border-t-transparent" aria-hidden="true" />
        <span className="text-sm text-parchment-500">Loading classes...</span>
      </div>
    );
  }

  // ── Phase: Class ──────────────────────────────────────────────────────────

  if (phase === "class") {
    return (
      <div className="space-y-2">
        <p className="text-sm text-parchment-500">
          Select the class you want to multiclass into. You will choose one of its domains and one of its subclass Foundation features.
        </p>
        <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
          {availableClasses.map((cls) => {
            const isSelected = cls.classId === selectedClassId;
            return (
              <button
                key={cls.classId}
                type="button"
                onClick={() => {
                  // Reset domain/subclass/feature when class changes
                  onChange(`${cls.classId}|||`);
                  setPhase("domain");
                }}
                className={`
                  w-full flex items-center rounded-lg border transition-all text-left px-3 py-2.5
                  ${isSelected
                    ? "border-[#577399] bg-[#577399]/15"
                    : "border-slate-700/60 bg-slate-900/30 hover:border-slate-600"
                  }
                `}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-[#f7f7ff]">{cls.name}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-parchment-500 truncate">
                      {cls.domains.join(" & ")}
                    </span>
                  </div>
                </div>
                {isSelected && (
                  <span className="ml-2 text-[#577399] text-lg leading-none shrink-0" aria-hidden="true">✓</span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // ── Phase: Domain ─────────────────────────────────────────────────────────

  if (phase === "domain") {
    const domains = chosenClassData?.domains ?? [];

    return (
      <div className="space-y-2">
        <button
          type="button"
          onClick={() => setPhase("class")}
          className="flex items-center gap-1.5 text-sm text-parchment-500 hover:text-parchment-300 transition-colors focus:outline-none focus:ring-2 focus:ring-[#577399] rounded"
        >
          <span aria-hidden="true">←</span> Change class
        </button>
        <p className="text-sm text-parchment-500">
          Choose <span className="font-semibold text-[#f7f7ff]">one domain</span> from{" "}
          <span className="font-semibold text-[#f7f7ff]">{chosenClassData?.name ?? selectedClassId}</span>.
          Cards from this domain will be available at up to half your character level (rounded up).
        </p>
        {chosenClassLoading ? (
          <div className="flex items-center gap-2 py-2">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#577399] border-t-transparent" aria-hidden="true" />
            <span className="text-sm text-parchment-500">Loading class details...</span>
          </div>
        ) : (
          <div className="space-y-1.5">
            {domains.map((domain) => {
              const isSelected = domain === selectedDomainId;
              return (
                <button
                  key={domain}
                  type="button"
                  onClick={() => {
                    onChange(`${selectedClassId}|${domain}||`);
                    setPhase("subclass");
                  }}
                  className={`
                    w-full flex items-center rounded-lg border transition-all text-left px-3 py-2.5
                    ${isSelected
                      ? "border-[#577399] bg-[#577399]/15"
                      : "border-slate-700/60 bg-slate-900/30 hover:border-slate-600"
                    }
                  `}
                >
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-semibold text-[#f7f7ff]">{domain}</span>
                    <p className="text-xs text-parchment-500 mt-0.5">Domain</p>
                  </div>
                  {isSelected && (
                    <span className="ml-2 text-[#577399] text-lg leading-none shrink-0" aria-hidden="true">✓</span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ── Phase: Subclass ────────────────────────────────────────────────────────

  if (phase === "subclass") {
    const subclasses = chosenClassData?.subclasses ?? [];

    return (
      <div className="space-y-2">
        <button
          type="button"
          onClick={() => setPhase("domain")}
          className="flex items-center gap-1.5 text-sm text-parchment-500 hover:text-parchment-300 transition-colors focus:outline-none focus:ring-2 focus:ring-[#577399] rounded"
        >
          <span aria-hidden="true">←</span> Change domain
        </button>
        <p className="text-sm text-parchment-500">
          Choose a <span className="font-semibold text-[#f7f7ff]">subclass</span> from{" "}
          <span className="font-semibold text-[#f7f7ff]">{chosenClassData?.name ?? selectedClassId}</span>{" "}
          to take its <span className="font-semibold text-[#f7f7ff]">Foundation</span> feature card.
          You cannot upgrade this subclass beyond Foundation.
        </p>
        {chosenClassLoading ? (
          <div className="flex items-center gap-2 py-2">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#577399] border-t-transparent" aria-hidden="true" />
             <span className="text-sm text-parchment-500">Loading class details...</span>
          </div>
        ) : (
          <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
            {subclasses.map((sc) => {
              const isSelected = sc.subclassId === selectedSubclassId;
              return (
                <button
                  key={sc.subclassId}
                  type="button"
                  onClick={() => {
                    onChange(`${selectedClassId}|${selectedDomainId}|${sc.subclassId}|`);
                    setPhase("feature");
                  }}
                  className={`
                    w-full flex items-center rounded-lg border transition-all text-left px-3 py-2.5
                    ${isSelected
                      ? "border-[#577399] bg-[#577399]/15"
                      : "border-slate-700/60 bg-slate-900/30 hover:border-slate-600"
                    }
                  `}
                >
                  {/* Selection circle */}
                  <span
                    className={`
                      mr-3 h-6 w-6 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors
                      ${isSelected ? "border-[#577399] bg-[#577399]" : "border-slate-600"}
                    `}
                  >
                    {isSelected && <span className="h-2 w-2 rounded-full bg-white" />}
                  </span>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-semibold text-[#f7f7ff]">{sc.name}</span>
                    {sc.description && (
                      <p className="text-sm text-parchment-500 mt-0.5 truncate">{sc.description}</p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ── Phase: Class Feature ──────────────────────────────────────────────────

  const classFeatures = chosenClassData?.classFeatures ?? [];

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => setPhase("subclass")}
        className="flex items-center gap-1.5 text-sm text-parchment-500 hover:text-parchment-300 transition-colors focus:outline-none focus:ring-2 focus:ring-[#577399] rounded"
      >
        <span aria-hidden="true">←</span> Change subclass
      </button>
      <p className="text-sm text-parchment-500">
        Choose a <span className="font-semibold text-[#f7f7ff]">class feature</span> from{" "}
        <span className="font-semibold text-[#f7f7ff]">{chosenClassData?.name ?? selectedClassId}</span>.
        {classFeatures.length === 0 && " (This class has no choosable class features — skip this step.)"}
      </p>
      {chosenClassLoading ? (
        <div className="flex items-center gap-2 py-2">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#577399] border-t-transparent" aria-hidden="true" />
          <span className="text-sm text-parchment-500">Loading class details...</span>
        </div>
      ) : classFeatures.length === 0 ? (
        <div className="rounded border border-[#577399]/30 bg-[#577399]/10 px-3 py-2">
          <p className="text-sm text-parchment-400">No class features to choose — your multiclass selection is complete.</p>
          {/* Auto-set feature index to empty and mark as done */}
          {selectedFeatureIndex === "" && (() => {
            // Side-effect: mark complete with empty feature index
            // We can't call onChange here directly in render; use a button instead
            return null;
          })()}
        </div>
      ) : (
        <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
          {classFeatures.map((cf, idx) => {
            const isSelected = selectedFeatureIndex === String(idx);
            return (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  onChange(`${selectedClassId}|${selectedDomainId}|${selectedSubclassId}|${idx}`);
                }}
                className={`
                  w-full flex items-start rounded-lg border transition-all text-left px-3 py-2.5
                  ${isSelected
                    ? "border-[#577399] bg-[#577399]/15"
                    : "border-slate-700/60 bg-slate-900/30 hover:border-slate-600"
                  }
                `}
              >
                <span
                  className={`
                    mt-0.5 mr-3 h-5 w-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors
                    ${isSelected ? "border-[#577399] bg-[#577399]" : "border-slate-600"}
                  `}
                >
                  {isSelected && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                </span>
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-semibold text-[#f7f7ff]">{cf.name}</span>
                  {cf.description && (
                    <p className="text-xs text-parchment-500 mt-0.5 line-clamp-2">{cf.description}</p>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Summary when all four are chosen */}
      {selectedClassId && selectedDomainId && selectedSubclassId && (selectedFeatureIndex !== "" || classFeatures.length === 0) && (
        <div className="rounded border border-[#577399]/40 bg-[#577399]/10 px-3 py-2 mt-2">
          <p className="text-sm text-[#b9baa3]">
            <span className="font-semibold text-[#f7f7ff]">Multiclass Summary:</span>{" "}
            {chosenClassData?.name ?? selectedClassId} ·{" "}
            <span className="text-[#577399]">{selectedDomainId}</span> domain ·{" "}
            {chosenClassData?.subclasses.find((s) => s.subclassId === selectedSubclassId)?.name ?? selectedSubclassId} Foundation
            {classFeatures.length > 0 && selectedFeatureIndex !== "" && (
              <> · {classFeatures[parseInt(selectedFeatureIndex, 10)]?.name ?? `Feature ${selectedFeatureIndex}`}</>
            )}
          </p>
        </div>
      )}
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
  // For multiclass: the pipe-delimited "classId|domainId|subclassId" string
  const [multiclassDetail, setMulticlassDetail] = useState("");

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

  // Count total subclass-upgrades across all history (Foundation→Spec = 1, Spec→Mastery = 2; max 2)
  const totalSubclassUpgradesEver = useMemo(() => {
    return Object.values(history).flat().filter((a) => a.type === "subclass-upgrade").length;
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
      // Cannot exceed Mastery (max 2 total upgrades ever)
      if (totalSubclassUpgradesEver >= 2) return false;
    }
    if (opt.type === "multiclass") {
      if (subclassUsedThisTier || choosingSubclass) return false;
      // Multiclass is permanently once only
      if (multiclassUsedEver || choosingMulticlass) return false;
    }

    // experience-bonus: requires at least 2 experiences to pick from
    if (opt.type === "experience-bonus" && character.experiences.length < 2) return false;

    return true;
  });

  const handleAdd = (opt: AdvancementOption) => {
    if (opt.needsDetail) {
      setPendingType(opt.type);
      setDetailValue1("");
      setDetailValue2("");
      setMulticlassDetail("");
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
    } else if (pendingType === "multiclass") {
      const parts = multiclassDetail.split("|");
      // Accept 3 or 4 parts; first 3 must be non-empty
      if ((parts.length !== 3 && parts.length !== 4) || parts.slice(0, 3).some((p) => !p.trim())) return;
      onChange([...choices, { type: pendingType, detail: multiclassDetail }]);
    } else {
      // Fallback (should not be reached for current option set)
      if (!detailValue1.trim()) return;
      onChange([...choices, { type: pendingType, detail: detailValue1.trim() }]);
    }

    setPendingType(null);
    setDetailValue1("");
    setDetailValue2("");
    setMulticlassDetail("");
  };

  const handleRemove = (index: number) => {
    onChange(choices.filter((_, i) => i !== index));
  };

  const handleCancelDetail = () => {
    setPendingType(null);
    setDetailValue1("");
    setDetailValue2("");
    setMulticlassDetail("");
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
    if (pendingType === "multiclass") {
      const parts = multiclassDetail.split("|");
      // Accept 3 or 4 parts; first 3 required non-empty; 4th (featureIndex) optional
      return (parts.length === 3 || parts.length === 4) && parts.slice(0, 3).every((p) => p.trim().length > 0);
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
        <p className="text-sm text-parchment-400">
          {opt.label}: specify details
        </p>

        {pendingType === "trait-bonus" && (
          <>
            <label className="block text-sm text-parchment-500 uppercase tracking-wider">First stat</label>
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
            <label className="block text-sm text-parchment-500 uppercase tracking-wider mt-1">Second stat</label>
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
              <p className="text-sm text-[#fe5f55]">Must select two different stats</p>
            )}
          </>
        )}

        {pendingType === "experience-bonus" && (
          <>
            <label className="block text-sm text-parchment-500 uppercase tracking-wider">First experience</label>
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
            <label className="block text-sm text-parchment-500 uppercase tracking-wider mt-1">Second experience</label>
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
              {character.experiences.filter((exp) => exp.name !== detailValue1).map((exp) => (
                <option key={exp.name} value={exp.name}>
                  {exp.name} (+{exp.bonus})
                </option>
              ))}
            </select>
          </>
        )}

        {pendingType === "multiclass" && (
          <MulticlassPicker
            currentClassId={character.classId}
            value={multiclassDetail}
            onChange={setMulticlassDetail}
          />
        )}

        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={handleConfirmDetail}
            disabled={!isDetailValid()}
            aria-label={`Add ${opt?.label ?? "advancement"}`}
            className="
              rounded px-3 py-1.5 text-sm font-semibold
              bg-[#577399]/80 text-[#f7f7ff] border border-[#577399]
              hover:bg-[#577399] transition-colors
              disabled:opacity-60 disabled:cursor-not-allowed
              focus:outline-none focus:ring-2 focus:ring-[#577399]
            "
          >
            Add
          </button>
          <button
            type="button"
            onClick={handleCancelDetail}
            aria-label={`Cancel ${opt?.label ?? "advancement"}`}
            className="
              rounded px-3 py-1.5 text-sm font-semibold
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

  /** Format the detail string for display */
  const formatDetail = (choice: AdvancementChoice): string | null => {
    if (!choice.detail) return null;
    if (choice.type === "trait-bonus" || choice.type === "experience-bonus") {
      return choice.detail
        .split(",")
        .map((s) => s.trim())
        .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
        .join(", ");
    }
    if (choice.type === "multiclass") {
      // Display first 3 parts (classId · domainId · subclassId); skip empty feature index
      const parts = choice.detail.split("|").slice(0, 3);
      return parts.filter(Boolean).join(" · ");
    }
    return choice.detail;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-parchment-200">
          Choose Advancements
        </h3>
        <span aria-live="polite" className={`text-xs font-bold ${slotsRemaining === 0 ? "text-emerald-400" : "text-[#577399]"}`}>
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
                    <span className="ml-2 text-sm text-parchment-500">({displayDetail})</span>
                  )}
                  {opt && opt.slotCost === 2 && (
                    <span className="ml-2 text-xs text-[#577399] font-bold">2 SLOTS</span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => handleRemove(i)}
                  aria-label={`Remove ${opt?.label ?? choice.type}`}
                  className="text-[#fe5f55] hover:text-[#fe5f55]/80 text-sm px-2 py-1 transition-colors focus:outline-none focus:ring-1 focus:ring-[#577399] rounded"
                >
                  Remove
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Available options (only when slots remain and no pending detail input) */}
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
                  <span className="rounded bg-[#577399]/20 px-1.5 text-xs font-bold text-[#577399]">
                    2 slots
                  </span>
                )}
              </div>
              <span className="mt-0.5 text-sm text-parchment-500">{opt.description}</span>
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
// Matches the drilldown selection pattern used in DomainCardSelectionPanel.
// Also includes multiclass domain (capped at half-level) when applicable.

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
        className="flex items-center gap-1.5 px-4 py-3 text-sm text-parchment-500 hover:text-parchment-300 transition-colors shrink-0 focus:outline-none focus:ring-2 focus:ring-[#577399] rounded"
      >
        <span aria-hidden="true">←</span> Back to cards
      </button>
      <div className="flex-1 overflow-y-auto px-6 py-2 space-y-4">
        {/* Header */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs uppercase tracking-wider text-parchment-500">
              {card.domain}
            </span>
            <span className="text-parchment-700" aria-hidden="true">·</span>
            <span className="text-xs uppercase tracking-wider text-parchment-500">
              Level {card.level}
            </span>
            {card.isGrimoire && (
              <>
                <span className="text-parchment-700" aria-hidden="true">·</span>
                <span className="text-xs uppercase tracking-wider text-[#daa520]">Grimoire</span>
              </>
            )}
            {card.isCursed && (
              <>
                <span className="text-parchment-700" aria-hidden="true">·</span>
                <span className="text-xs uppercase tracking-wider text-[#fe5f55]">Cursed</span>
              </>
            )}
            {card.isLinkedCurse && (
              <>
                <span className="text-parchment-700" aria-hidden="true">·</span>
                <span className="text-xs uppercase tracking-wider text-[#fe5f55]">Linked Curse</span>
              </>
            )}
          </div>
          <h4 className="font-serif text-xl font-bold text-[#f7f7ff]">{card.name}</h4>
        </div>

        {/* Recall cost */}
        <div className="flex gap-4 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase tracking-wider text-parchment-500">Recall Cost</span>
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
                  <MarkdownContent className="text-base text-parchment-300">
                    {ability.description}
                  </MarkdownContent>
                </div>
              ))}
            </div>
          ) : (
            <MarkdownContent className="text-base text-parchment-300">
              {card.description}
            </MarkdownContent>
          )}
        </div>

        {card.isCursed && card.curseText && (
          <div className="rounded-lg border border-[#fe5f55]/30 bg-[#fe5f55]/5 px-4 py-3">
            <p className="text-xs uppercase tracking-wider text-[#fe5f55] mb-1">Curse</p>
            <MarkdownContent className="text-base text-parchment-400">
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
                : "bg-slate-800/50 border border-slate-700/40 text-parchment-600 cursor-not-allowed"
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
  isMulticlassDomain,
  onToggle,
  onDrill,
}: {
  card: DomainCard;
  isSelected: boolean;
  canSelect: boolean;
  isMulticlassDomain?: boolean;
  onToggle: () => void;
  onDrill: () => void;
}) {
  return (
    <div
      className={`
        flex items-center rounded-lg border transition-all
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
          ml-3 h-6 w-6 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors
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

      {/* Text — drill-down button */}
      <button
        type="button"
        onClick={onDrill}
        aria-label={`View details for ${card.name}`}
        className="flex-1 flex items-center gap-3 px-3 py-3 min-w-0 text-left focus:outline-none focus:ring-2 focus:ring-[#577399] rounded-r-lg"
      >
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-[#f7f7ff] truncate">{card.name}</span>
            <span className="text-xs text-parchment-500 shrink-0">{card.domain}</span>
            {isMulticlassDomain && (
              <span className="text-xs text-[#577399] font-bold shrink-0 border border-[#577399]/30 rounded px-1">MC</span>
            )}
            {card.isCursed && (
              <span className="text-xs text-[#fe5f55] font-bold shrink-0">Cursed</span>
            )}
            {card.isLinkedCurse && (
              <span className="text-xs text-[#fe5f55] font-bold shrink-0">Linked</span>
            )}
            {card.isGrimoire && (
              <span className="text-xs text-[#daa520] font-bold shrink-0">Grimoire</span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs text-parchment-500">Lvl {card.level}</span>
            <span className="text-parchment-700 text-xs" aria-hidden="true">·</span>
            <span className="text-xs text-parchment-500 truncate">
              {truncateCardText(card.isGrimoire
                ? (card.grimoire[0]?.description ?? card.description)
                : card.description)}
            </span>
          </div>
        </div>
      </button>

      {/* Drill-down chevron */}
      <span className="pr-3 text-parchment-600 text-lg leading-none shrink-0" aria-hidden="true">›</span>
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
  /**
   * If the character is actively multiclassing THIS level-up (not yet persisted),
   * provide the pending multiclass domain name here so the picker can include
   * those cards at the half-level cap.
   */
  pendingMulticlassDomain?: string | null;
}

function DomainCardPicker({ character, targetLevel, maxSelections, selectedCardIds, onSelect, pendingMulticlassDomain }: DomainCardPickerProps) {
  const [detailCard, setDetailCard] = useState<DomainCard | null>(null);

  // Fetch the class data to get authoritative domain names (matches DomainLoadout pattern)
  const { data: classData, isLoading: classLoading } = useClass(character.classId || undefined);
  const classDomains = classData?.domains ?? [];
  const domain0 = classDomains[0];
  const domain1 = classDomains[1];

  const { data: domainData0, isLoading: loading0 } = useDomain(domain0);
  const { data: domainData1, isLoading: loading1 } = useDomain(domain1);

  // Multiclass domain: either already persisted on the character, or pending from this level-up
  const multiclassDomain = pendingMulticlassDomain ?? character.multiclassDomainId ?? null;
  const { data: multiclassDomainData, isLoading: multiclassLoading } = useDomain(multiclassDomain || undefined);

  const isLoading = classLoading
    || (!!domain0 && loading0)
    || (!!domain1 && loading1)
    || (!!multiclassDomain && multiclassLoading);

  // Half-level cap for multiclass domain cards (SRD p.43)
  const mcCardCap = multiclassDomainCardCap(targetLevel);

  // Combine and filter cards
  // Primary domain cards: level ≤ targetLevel
  // Multiclass domain cards: level ≤ ceil(targetLevel/2)
  const allCards = useMemo(() => {
    const cards: DomainCard[] = [];
    if (domainData0?.cards) cards.push(...domainData0.cards);
    if (domainData1?.cards) cards.push(...domainData1.cards);
    return cards;
  }, [domainData0, domainData1]);

  const multiclassCards = useMemo(() => {
    if (!multiclassDomainData?.cards) return [];
    return multiclassDomainData.cards;
  }, [multiclassDomainData]);

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
    const primary = allCards
      .filter((c) => {
        if (c.level > targetLevel) return false;
        if (ownedSet.has(`${c.domain}/${c.cardId}`) || ownedSet.has(c.cardId)) return false;
        return true;
      })
      .map((c) => ({ card: c, isMulticlass: false }));

    const mc = multiclassCards
      .filter((c) => {
        if (c.level > mcCardCap) return false; // SRD: half-level cap for multiclass domain
        if (ownedSet.has(`${c.domain}/${c.cardId}`) || ownedSet.has(c.cardId)) return false;
        return true;
      })
      .map((c) => ({ card: c, isMulticlass: true }));

    return [...primary, ...mc]
      .sort((a, b) => a.card.level - b.card.level || a.card.domain.localeCompare(b.card.domain) || a.card.name.localeCompare(b.card.name));
  }, [allCards, multiclassCards, targetLevel, mcCardCap, ownedSet]);

  const handleToggle = (card: DomainCard) => {
    const prefixedId = `${card.domain}/${card.cardId}`;
    if (selectedCardIds.includes(prefixedId)) {
      onSelect(selectedCardIds.filter((id) => id !== prefixedId));
    } else if (selectedCardIds.length < maxSelections) {
      onSelect([...selectedCardIds, prefixedId]);
    }
  };

  if (!domain0 && !domain1) {
    return (
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-parchment-200">
          Acquire Domain Card
        </h3>
        <p className="text-sm text-parchment-600 italic">
          No domains assigned. This character&apos;s class may not have domains configured.
        </p>
      </div>
    );
  }

  // Describe which domains are available
  const primaryDomainLabel = [domain0, domain1].filter(Boolean).join(" & ");
  const domainDescription = multiclassDomain
    ? `${primaryDomainLabel} (up to level ${targetLevel}) · ${multiclassDomain} (up to level ${mcCardCap}, multiclass)`
    : `${primaryDomainLabel} (up to level ${targetLevel})`;

  // ── Detail view (drill-down) ──
  if (detailCard) {
    const isSelected = selectedCardIds.includes(`${detailCard.domain}/${detailCard.cardId}`);
    const canSelect = selectedCardIds.length < maxSelections;
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-parchment-200">
            Acquire Domain Card{maxSelections > 1 ? "s" : ""}
          </h3>
          <span aria-live="polite" className={`text-xs font-bold ${selectedCardIds.length >= 1 ? "text-emerald-400" : "text-[#fe5f55]"}`}>
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
          <span aria-live="polite" className={`text-xs font-bold ${selectedCardIds.length >= 1 ? "text-emerald-400" : "text-[#fe5f55]"}`}>
            {selectedCardIds.length}/{maxSelections} selected
          </span>
          {selectedCardIds.length > 0 && (
            <button
              type="button"
              onClick={() => onSelect([])}
              className="text-sm text-parchment-500 hover:text-parchment-300 transition-colors focus:outline-none focus:ring-1 focus:ring-[#577399] rounded px-1"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      <p className="text-sm text-parchment-500">
        Choose {maxSelections > 1 ? `up to ${maxSelections} cards` : "one card"} from your domains
        ({domainDescription}).
        {maxSelections > 1 && " You chose Extra Domain Card as an advancement, granting one extra pick."}
        {" "}Cards you already own are excluded.
        {" "}Domain card acquisition is required.
        {" "}Tap a card to view its full details.
        {multiclassDomain && (
          <span className="ml-1 text-[#577399]">Cards marked <span className="font-bold">MC</span> are from your multiclass domain.</span>
        )}
      </p>

      {isLoading ? (
        <div className="flex items-center gap-2 py-4">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#577399] border-t-transparent" aria-hidden="true" />
          <span className="text-sm text-parchment-500">Loading domain cards...</span>
        </div>
      ) : availableCards.length === 0 ? (
        <p className="text-sm text-parchment-600 italic">
          No new cards available at this level. You may proceed without selecting a card.
        </p>
      ) : (
        <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
          {availableCards.map(({ card, isMulticlass }) => {
            const isSelected = selectedCardIds.includes(`${card.domain}/${card.cardId}`);
            const atMax = selectedCardIds.length >= maxSelections && !isSelected;
            return (
              <LevelUpCardRow
                key={card.cardId}
                card={card}
                isSelected={isSelected}
                canSelect={!atMax}
                isMulticlassDomain={isMulticlass}
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
  // Maps cardId → human-readable card name for display in the confirm step
  const [cardNameMap, setCardNameMap] = useState<Record<string, string>>({});
  // Maps cardId → level number for encoding additional-domain-card detail
  const [cardLevelMap, setCardLevelMap] = useState<Record<string, number>>({});
  // Tier Achievement: player names the new experience at +2 (SRD p.22)
  const [tierAchievementExperienceName, setTierAchievementExperienceName] = useState("");

  const levelUpMutation = useCharacterLevelUp(character.characterId);

  const slotsUsed = advancements.reduce((sum, c) => sum + advancementSlotCost(c.type), 0);
  const advancementsComplete = slotsUsed === 2;

  // Check if user chose the "additional-domain-card" advancement
  const hasExtraDomainCard = advancements.some((a) => a.type === "additional-domain-card");
  const maxDomainCardSelections = hasExtraDomainCard ? 2 : 1;

  // Derive the pending multiclass domain from this level-up's advancement choices
  // (the multiclass is not yet persisted on character, but we need it for the domain card step)
  const pendingMulticlassDetail = advancements.find((a) => a.type === "multiclass")?.detail ?? null;
  const pendingMulticlassDomain = useMemo(() => {
    if (!pendingMulticlassDetail) return null;
    const parts = pendingMulticlassDetail.split("|");
    return parts[1]?.trim() || null;
  }, [pendingMulticlassDetail]);

  // Domain card acquisition is mandatory — but if no cards are available, allow proceeding
  const [noCardsAvailable, setNoCardsAvailable] = useState(false);
  const domainCardSatisfied = selectedDomainCardIds.length >= 1 || noCardsAvailable;

  const STEPS = ["Overview", "Advancements", "Domain Card", "Confirm"];

  // ── Refs for focus management ──────────────────────────────────────────────
  const dialogRef = useRef<HTMLDivElement>(null);
  const stepHeadingRef = useRef<HTMLHeadingElement>(null);

  // ── Focus trap + Escape key handler ────────────────────────────────────────
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    // Focus dialog on mount
    dialog.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key === "Tab") {
        const focusable = dialog.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };

    dialog.addEventListener("keydown", handleKeyDown);
    return () => dialog.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  // ── Focus step heading on step change ──────────────────────────────────────
  useEffect(() => {
    // Small delay to ensure the DOM has updated with new step content
    const timer = setTimeout(() => {
      stepHeadingRef.current?.focus();
    }, 50);
    return () => clearTimeout(timer);
  }, [step]);

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
    // Build advancements with extra domain card detail filled in as "cardId|level"
    // Card IDs are in "domain/cardId" format — send as-is; backend stores them prefixed.
    const finalAdvancements = advancements.map((adv) => {
      if (adv.type === "additional-domain-card" && selectedDomainCardIds.length > 1) {
        const rawId = selectedDomainCardIds[1]!;
        const cardLevel = cardLevelMap[rawId];
        const detail = cardLevel !== undefined ? `${rawId}|${cardLevel}` : rawId;
        return { ...adv, detail };
      }
      return adv;
    });

    const input: LevelUpInput = {
      targetLevel,
      advancements: finalAdvancements,
      newDomainCardId: selectedDomainCardIds[0] ?? null,
      ...(hasTierAchievement && tierAchievementExperienceName.trim()
        ? { tierAchievementExperienceName: tierAchievementExperienceName.trim() }
        : {}),
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
      ref={dialogRef}
      tabIndex={-1}
      className="rounded-xl border border-[#577399]/40 bg-slate-900 p-6 shadow-card-fantasy-hover space-y-5 outline-none"
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
          className="text-parchment-600 hover:text-parchment-300 text-sm transition-colors focus:outline-none focus:ring-1 focus:ring-[#577399] rounded px-3 py-2"
        >
          Cancel
        </button>
      </div>

      <StepIndicator current={step} total={STEPS.length} />

      {/* Step content */}
      <div className="min-h-[200px]">
        {/* Focusable step heading for screen reader + focus management */}
        <h3
          ref={stepHeadingRef}
          tabIndex={-1}
          className="text-sm font-semibold text-parchment-200 outline-none mb-3"
        >
          {STEPS[step]}
        </h3>

        {/* Step 0: Overview */}
        {step === 0 && (
          <div className="space-y-4">

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
                  {targetLevel === 5 && (
                    <p className="text-sm text-parchment-400 mt-1">
                      Multiclassing becomes available at Tier 3 (level 5+).
                    </p>
                  )}
                </div>
              )}

              {/* Automatic bonuses */}
              <div className="space-y-1.5 pt-2">
                <p className="text-xs uppercase tracking-wider text-parchment-500 font-medium">
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
                      <li className="flex flex-col gap-1 pt-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[#577399] text-xs font-bold">+1</span>
                          <span className="text-[#b9baa3]">New Experience at +2 (Tier Achievement)</span>
                        </div>
                        <input
                          type="text"
                          value={tierAchievementExperienceName}
                          onChange={(e) => setTierAchievementExperienceName(e.target.value)}
                          placeholder="Name your new experience (optional)"
                          maxLength={60}
                          aria-label="Name for new Tier Achievement experience"
                          className="
                            mt-1 w-full rounded bg-slate-900 px-2 py-1.5 text-sm text-parchment-200
                            border border-[#577399]/40 focus:outline-none focus:ring-1 focus:ring-[#577399]
                            placeholder:text-parchment-700
                          "
                        />
                        <p className="text-xs text-parchment-600 italic">
                          Leave blank to name it later via character edit.
                        </p>
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
              <div className="mt-2 text-sm text-parchment-500 italic">
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
            onCardNameMap={setCardNameMap}
            onCardLevelMap={setCardLevelMap}
            pendingMulticlassDomain={pendingMulticlassDomain}
          />
        )}

        {/* Step 3: Confirm */}
        {step === 3 && (
          <ConfirmStep
            character={character}
            targetLevel={targetLevel}
            hasTierAchievement={hasTierAchievement}
            clearsMarkedTraits={clearsMarkedTraits}
            advancements={advancements}
            slotsUsed={slotsUsed}
            selectedDomainCardIds={selectedDomainCardIds}
            cardNameMap={cardNameMap}
            tierAchievementExperienceName={tierAchievementExperienceName}
            levelUpError={levelUpMutation.isError ? levelUpMutation.error : null}
          />
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
              disabled:opacity-60 disabled:cursor-not-allowed
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
              bg-emerald-600 text-white border border-emerald-500
              hover:bg-emerald-500 transition-colors
              disabled:opacity-60 disabled:cursor-not-allowed
              focus:outline-none focus:ring-2 focus:ring-emerald-400
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

// ─── ConfirmStep ──────────────────────────────────────────────────────────────

function ConfirmStep({
  character,
  targetLevel,
  hasTierAchievement,
  clearsMarkedTraits,
  advancements,
  slotsUsed,
  selectedDomainCardIds,
  cardNameMap,
  tierAchievementExperienceName,
  levelUpError,
}: {
  character: Character;
  targetLevel: number;
  hasTierAchievement: boolean;
  clearsMarkedTraits: boolean;
  advancements: AdvancementChoice[];
  slotsUsed: number;
  selectedDomainCardIds: string[];
  cardNameMap: Record<string, string>;
  tierAchievementExperienceName: string;
  levelUpError: unknown;
}) {
  const formatAdvancementDetail = (adv: AdvancementChoice): string | null => {
    if (!adv.detail) return null;
    if (adv.type === "trait-bonus" || adv.type === "experience-bonus") {
      return adv.detail
        .split(",")
        .map((s) => s.trim().charAt(0).toUpperCase() + s.trim().slice(1))
        .join(", ");
    }
    if (adv.type === "multiclass") {
      // Show first 3 parts (class · domain · subclass); skip empty feature index
      const parts = adv.detail.split("|").slice(0, 3);
      return parts.filter(Boolean).join(" · ");
    }
    if (adv.type === "additional-domain-card") {
      // Detail may be "cardId|level"; show only the cardId part
      const pipIdx = adv.detail.indexOf("|");
      return pipIdx !== -1 ? adv.detail.slice(0, pipIdx) : adv.detail;
    }
    return adv.detail;
  };

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-parchment-200">
        Confirm Level Up
      </h3>

      <div className="rounded-lg border border-[#577399]/30 bg-slate-900/80 p-4 space-y-3">
        <div>
          <p className="text-xs uppercase tracking-wider text-parchment-500 font-medium mb-1">
            Target Level
          </p>
          <p className="text-lg font-bold text-[#f7f7ff]">{targetLevel}</p>
        </div>

        {hasTierAchievement && (
          <div>
            <p className="text-xs uppercase tracking-wider text-parchment-500 font-medium mb-1">
              Tier Achievement
            </p>
            <p className="text-sm text-[#b9baa3]">
              +1 Proficiency
              {clearsMarkedTraits && ", Clear Marked Traits"}
            </p>
            <p className="text-sm text-[#b9baa3] mt-0.5">
              +1 Experience at +2:{" "}
              {tierAchievementExperienceName.trim()
                ? <span className="font-semibold text-[#f7f7ff]">&ldquo;{tierAchievementExperienceName.trim()}&rdquo;</span>
                : <span className="italic text-parchment-600">unnamed (fill in later)</span>
              }
            </p>
          </div>
        )}

        <div>
          <p className="text-xs uppercase tracking-wider text-parchment-500 font-medium mb-1">
            Automatic
          </p>
          <p className="text-sm text-parchment-400">+1 Major Threshold, +1 Severe Threshold</p>
        </div>

        <div>
          <p className="text-xs uppercase tracking-wider text-parchment-500 font-medium mb-1">
            Advancements ({slotsUsed}/2 slots)
          </p>
          {advancements.length === 0 ? (
            <p className="text-sm text-parchment-600 italic">None selected</p>
          ) : (
            <ul className="space-y-1">
              {advancements.map((adv, i) => {
                const opt = ADVANCEMENT_OPTIONS.find((o) => o.type === adv.type);
                const displayDetail = formatAdvancementDetail(adv);
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
          <p className="text-xs uppercase tracking-wider text-parchment-500 font-medium mb-1">
            New Domain Card{selectedDomainCardIds.length > 1 ? "s" : ""}
          </p>
          {selectedDomainCardIds.length === 0 ? (
            <p className="text-sm text-parchment-500 italic">None (no cards available)</p>
          ) : (
            <ul className="space-y-0.5">
              {selectedDomainCardIds.map((id, i) => (
                <li key={id} className="text-sm text-parchment-300">
                  {cardNameMap[id] ?? id}
                  {i === 1 && <span className="ml-1 text-xs text-[#577399]">(extra)</span>}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Error display */}
      {!!levelUpError && (
        <div role="alert" className="rounded border border-[#fe5f55]/60 bg-[#fe5f55]/10 px-3 py-2">
          <p className="text-xs text-[#fe5f55]">
            {levelUpError instanceof ApiError
              ? levelUpError.message
              : (levelUpError as Error)?.message ?? "Level up failed."}
          </p>
        </div>
      )}
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
  onCardNameMap,
  onCardLevelMap,
  pendingMulticlassDomain,
}: {
  character: Character;
  targetLevel: number;
  maxDomainCardSelections: number;
  hasExtraDomainCard: boolean;
  selectedDomainCardIds: string[];
  setSelectedDomainCardIds: (ids: string[]) => void;
  onNoCardsAvailable: (v: boolean) => void;
  onCardNameMap: (map: Record<string, string>) => void;
  onCardLevelMap: (map: Record<string, number>) => void;
  pendingMulticlassDomain?: string | null;
}) {
  // Fetch authoritative domain names from class data (matches DomainCardPicker/DomainLoadout pattern)
  const { data: classData } = useClass(character.classId || undefined);
  const classDomains = classData?.domains ?? [];
  const domain0 = classDomains[0];
  const domain1 = classDomains[1];
  const { data: d0 } = useDomain(domain0);
  const { data: d1 } = useDomain(domain1);

  // Multiclass domain: either pending from this level-up, or already persisted on the character
  const multiclassDomain = pendingMulticlassDomain ?? character.multiclassDomainId ?? null;
  const { data: dmc } = useDomain(multiclassDomain || undefined);

  const mcCardCap = multiclassDomainCardCap(targetLevel);

  // Build card name map and card level map from loaded domain data and propagate to parent
  React.useEffect(() => {
    const nameMap: Record<string, string> = {};
    const levelMap: Record<string, number> = {};
    for (const cards of [d0?.cards, d1?.cards, dmc?.cards]) {
      if (cards) {
        for (const card of cards) {
          const key = `${card.domain}/${card.cardId}`;
          nameMap[key] = card.name;
          levelMap[key] = card.level;
          // Also index by bare cardId for convenience
          nameMap[card.cardId] = card.name;
          levelMap[card.cardId] = card.level;
        }
      }
    }
    if (Object.keys(nameMap).length > 0) {
      onCardNameMap(nameMap);
      onCardLevelMap(levelMap);
    }
  }, [d0, d1, dmc, onCardNameMap, onCardLevelMap]);

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
    // If multiclass domain is expected but data hasn't loaded, wait
    if (multiclassDomain && !dmc) return;

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

    // Also check multiclass domain cards (capped at half-level)
    const mcAvailable = (dmc?.cards ?? []).filter((c) => {
      if (c.level > mcCardCap) return false;
      if (ownedSet.has(`${c.domain}/${c.cardId}`) || ownedSet.has(c.cardId)) return false;
      return true;
    });

    onNoCardsAvailable(available.length === 0 && mcAvailable.length === 0);
  }, [classData, domain0, domain1, d0, d1, dmc, multiclassDomain, mcCardCap,
      character.domainVault, character.domainLoadout, targetLevel, onNoCardsAvailable]);

  return (
    <DomainCardPicker
      character={character}
      targetLevel={targetLevel}
      maxSelections={maxDomainCardSelections}
      selectedCardIds={selectedDomainCardIds}
      onSelect={setSelectedDomainCardIds}
      pendingMulticlassDomain={pendingMulticlassDomain}
    />
  );
}
