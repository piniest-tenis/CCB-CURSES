"use client";

/**
 * src/components/homebrew/ClassWizard.tsx
 *
 * Multi-step wizard for creating a homebrew Class.
 *
 * Steps:
 *   1. Identity & Stats — name, primary domains (2), base HP, evasion, thresholds
 *   2. Class Features   — repeatable: level + name + description (+ options)
 *   3. Subclasses       — repeatable group: name + description + features
 *   4. Background & Connections — lore text, background questions, connection questions
 *   5. Review & Save    — read-only preview of all data + submit
 *
 * Uses only local state (useState). Final submit assembles markdown and calls onSubmit.
 */

import React, { useCallback, useId, useMemo, useState } from "react";
import type { HomebrewMarkdownInput } from "@shared/types";
import { INPUT_CLS, LABEL_CLS, TEXTAREA_CLS, BTN_PRIMARY, BTN_SECONDARY, SOFT_WARNING_CLS } from "./styles";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ClassWizardProps {
  /** Called when the user submits the final step with assembled markdown. */
  onSubmit: (input: HomebrewMarkdownInput) => void;
  /** Called whenever data changes to update live preview. */
  onPreview?: (input: HomebrewMarkdownInput) => void;
  /** Whether the form is currently submitting. */
  isSubmitting?: boolean;
  /** Pre-populated values for edit mode. */
  initialValues?: {
    name?: string;
    domains?: string[];
    startingHitPoints?: number;
    startingEvasion?: number;
    hopeFeature?: { name: string; description: string; cost: number };
    classFeatures?: Array<{ name: string; description: string; options?: string[] }>;
    subclasses?: Array<{
      name: string;
      description: string;
      spellcastTrait?: string;
      foundationFeatures?: Array<{ name: string; description: string }>;
      specializationFeature?: { name: string; description: string };
      masteryFeature?: { name: string; description: string };
    }>;
    backgroundQuestions?: string[];
    connectionQuestions?: string[];
    classItems?: string[];
    mechanicalNotes?: string;
  };
  /** Label override for the submit button (defaults to "Create Class"). */
  submitLabel?: string;
}

interface ClassFeatureEntry {
  name: string;
  description: string;
  options: string[];
}

interface SubclassEntry {
  name: string;
  description: string;
  spellcastTrait: string;
  foundationName: string;
  foundationDescription: string;
  specializationName: string;
  specializationDescription: string;
  masteryName: string;
  masteryDescription: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STEP_LABELS = [
  "Identity & Stats",
  "Class Features",
  "Subclasses",
  "Background",
  "Review & Save",
];

const DOMAIN_OPTIONS = [
  "Arcana",
  "Blade",
  "Bone",
  "Codex",
  "Grace",
  "Midnight",
  "Sage",
  "Splendor",
  "Valor",
];

const TRAIT_OPTIONS = [
  "agility",
  "strength",
  "finesse",
  "instinct",
  "presence",
  "knowledge",
];

const EMPTY_FEATURE: ClassFeatureEntry = {
  name: "",
  description: "",
  options: [],
};

// ─── SRD stat ranges (SRD p.30) ──────────────────────────────────────────────
// All official SRD classes fall within these bounds.
// The form enforces these as hard limits on inputs.

const SRD_HP_MIN = 5;
const SRD_HP_MAX = 7;
const SRD_EVASION_MIN = 9;
const SRD_EVASION_MAX = 12;
const SRD_SUM_MIN = 15;
const SRD_SUM_MAX = 18;

const EMPTY_SUBCLASS: SubclassEntry = {
  name: "",
  description: "",
  spellcastTrait: "knowledge",
  foundationName: "",
  foundationDescription: "",
  specializationName: "",
  specializationDescription: "",
  masteryName: "",
  masteryDescription: "",
};

// ─── Component ────────────────────────────────────────────────────────────────

export function ClassWizard({
  onSubmit,
  onPreview,
  isSubmitting = false,
  initialValues,
  submitLabel,
}: ClassWizardProps) {
  const idPrefix = useId();
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // ── Step 1: Identity & Stats ────────────────────────────────────────────
  const [name, setName] = useState(initialValues?.name ?? "");
  const [domain1, setDomain1] = useState(initialValues?.domains?.[0] ?? "");
  const [domain2, setDomain2] = useState(initialValues?.domains?.[1] ?? "");
  const [baseHp, setBaseHp] = useState(initialValues?.startingHitPoints ?? 6);
  const [evasion, setEvasion] = useState(initialValues?.startingEvasion ?? 10);
  const [majorThreshold, setMajorThreshold] = useState(7);
  const [severeThreshold, setSevereThreshold] = useState(14);
  const [hopeName, setHopeName] = useState(initialValues?.hopeFeature?.name ?? "");
  const [hopeDescription, setHopeDescription] = useState(initialValues?.hopeFeature?.description ?? "");
  const [hopeCost, setHopeCost] = useState(initialValues?.hopeFeature?.cost ?? 1);
  const [mechanicalNotes, setMechanicalNotes] = useState(initialValues?.mechanicalNotes ?? "");

  // ── Step 2: Class Features ──────────────────────────────────────────────
  const [features, setFeatures] = useState<ClassFeatureEntry[]>(
    initialValues?.classFeatures?.map(f => ({
      name: f.name,
      description: f.description,
      options: f.options ?? [],
    })) ?? [{ ...EMPTY_FEATURE }]
  );

  // ── Step 3: Subclasses ──────────────────────────────────────────────────
  const [subclasses, setSubclasses] = useState<SubclassEntry[]>(
    initialValues?.subclasses?.map(sc => ({
      name: sc.name,
      description: sc.description,
      spellcastTrait: sc.spellcastTrait ?? "knowledge",
      foundationName: sc.foundationFeatures?.[0]?.name ?? "",
      foundationDescription: sc.foundationFeatures?.[0]?.description ?? "",
      specializationName: sc.specializationFeature?.name ?? "",
      specializationDescription: sc.specializationFeature?.description ?? "",
      masteryName: sc.masteryFeature?.name ?? "",
      masteryDescription: sc.masteryFeature?.description ?? "",
    })) ?? [{ ...EMPTY_SUBCLASS }]
  );

  // ── Step 4: Background & Connections ────────────────────────────────────
  const [backgroundQuestions, setBackgroundQuestions] = useState<string[]>(
    initialValues?.backgroundQuestions?.length ? initialValues.backgroundQuestions : [""]
  );
  const [connectionQuestions, setConnectionQuestions] = useState<string[]>(
    initialValues?.connectionQuestions?.length ? initialValues.connectionQuestions : [""]
  );
  const [classItems, setClassItems] = useState<string[]>(
    initialValues?.classItems?.length ? initialValues.classItems : [""]
  );

  // ── Markdown assembly ───────────────────────────────────────────────────
  // Generate markdown in the format the ClassParser expects:
  //   Stats table with [[Domain]] wikilinks
  //   ### Class Items (italic items joined by "or")
  //   ### Hope Feature (_Name_: description with "Spend N Hope")
  //   ### Class Feature (**Name** standalone + description + options)
  //   ### Subclasses (overview with **Name** + _description_)
  //   ### Background Questions (bullet list)
  //   ### Connections (bullet list)
  //   # Subclasses (detail section)
  //   ## **SubclassName** -> ### Spellcast Trait, ### Foundation Feature, etc.
  const assembleMarkdown = useCallback((): string => {
    const lines: string[] = [];

    // Stats table
    const domains = [domain1, domain2].filter(Boolean);
    const domainCell = domains.map(d => `[[${d}]]`).join(" & ") || "[[Unknown]]";
    lines.push("| Domains | Starting Evasion | Starting Hit Points |");
    lines.push("| :---: | :---: | :---: |");
    lines.push(`| ${domainCell} | ${evasion} | ${baseHp} |`);
    lines.push("");

    // Class Items
    const items = classItems.filter((item) => item.trim());
    if (items.length > 0) {
      lines.push("### Class Items");
      lines.push("");
      lines.push(items.map(item => `_${item.trim()}_`).join(" or "));
      lines.push("");
    }

    // Hope feature
    if (hopeName.trim()) {
      lines.push("### Hope Feature");
      lines.push("");
      const desc = hopeDescription.trim();
      lines.push(`_${hopeName.trim()}_: ${desc ? desc + " " : ""}Spend ${hopeCost} Hope.`);
      lines.push("");
    }

    // Class features
    const validFeatures = features.filter(f => f.name.trim());
    if (validFeatures.length > 0) {
      lines.push(validFeatures.length === 1 ? "### Class Feature" : "### Class Features");
      lines.push("");
      for (const f of validFeatures) {
        lines.push(`**${f.name.trim()}**`);
        if (f.description.trim()) lines.push(f.description.trim());
        for (const opt of f.options) {
          if (opt.trim()) lines.push(`- ${opt.trim()}`);
        }
        lines.push("");
      }
    }

    // Subclasses overview
    const validSubclasses = subclasses.filter(sc => sc.name.trim());
    if (validSubclasses.length > 0) {
      lines.push("### Subclasses");
      lines.push("");
      for (const sc of validSubclasses) {
        lines.push(`**${sc.name.trim()}**`);
        if (sc.description.trim()) {
          lines.push(`_${sc.description.trim()}_`);
        }
        lines.push("");
      }
    }

    // Background questions
    const bqs = backgroundQuestions.filter((q) => q.trim());
    if (bqs.length > 0) {
      lines.push("### Background Questions");
      lines.push("");
      for (const q of bqs) lines.push(`- ${q.trim()}`);
      lines.push("");
    }

    // Connection questions
    const cqs = connectionQuestions.filter((q) => q.trim());
    if (cqs.length > 0) {
      lines.push("### Connections");
      lines.push("");
      for (const q of cqs) lines.push(`- ${q.trim()}`);
      lines.push("");
    }

    // Subclass detail section
    if (validSubclasses.length > 0) {
      lines.push("# Subclasses");
      lines.push("");
      for (const sc of validSubclasses) {
        lines.push(`## **${sc.name.trim()}**`);
        lines.push("");
        if (sc.description.trim()) {
          lines.push(`_${sc.description.trim()}_`);
          lines.push("");
        }

        lines.push("### Spellcast Trait");
        lines.push("");
        lines.push(sc.spellcastTrait || "Presence");
        lines.push("");

        if (sc.foundationName.trim()) {
          lines.push("### Foundation Feature");
          lines.push("");
          lines.push(`_${sc.foundationName.trim()}_: ${sc.foundationDescription.trim()}`);
          lines.push("");
        }

        if (sc.specializationName.trim()) {
          lines.push("### Specialization Feature");
          lines.push("");
          lines.push(`**${sc.specializationName.trim()}**: ${sc.specializationDescription.trim()}`);
          lines.push("");
        }

        if (sc.masteryName.trim()) {
          lines.push("### Mastery Feature");
          lines.push("");
          lines.push(`**${sc.masteryName.trim()}**: ${sc.masteryDescription.trim()}`);
          lines.push("");
        }
      }
    }

    // Mechanical notes as hidden comment (if present)
    if (mechanicalNotes.trim()) {
      lines.push("## Mechanical Notes");
      lines.push("");
      lines.push(mechanicalNotes.trim());
      lines.push("");
    }

    return lines.join("\n");
  }, [
    domain1, domain2, baseHp, evasion,
    mechanicalNotes, hopeName, hopeDescription, hopeCost,
    features, subclasses, backgroundQuestions, connectionQuestions, classItems,
  ]);

  const buildInput = useCallback((): HomebrewMarkdownInput => ({
    contentType: "class",
    name: name.trim(),
    markdown: assembleMarkdown(),
  }), [name, assembleMarkdown]);

  const triggerPreview = useCallback(() => {
    if (onPreview && name.trim()) {
      onPreview(buildInput());
    }
  }, [onPreview, name, buildInput]);

  // ── Step validation ─────────────────────────────────────────────────────
  const validateStep = useCallback((s: number): boolean => {
    const errs: Record<string, string> = {};
    switch (s) {
      case 0:
        if (!name.trim()) errs.name = "Class name is required.";
        if (!domain1) errs.domain1 = "At least one domain is required.";
        break;
      case 1:
        if (!features.some((f) => f.name.trim())) {
          errs.features = "At least one class feature is required.";
        }
        break;
      case 2:
        // Subclasses are optional but if added, must have a name
        for (let i = 0; i < subclasses.length; i++) {
          const sc = subclasses[i];
          if (i === 0 && !sc.name.trim()) {
            errs[`sc-${i}-name`] = "First subclass name is required.";
          }
        }
        break;
      case 3:
        // Background step is optional
        break;
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }, [name, domain1, features, subclasses]);

  // ── Navigation ──────────────────────────────────────────────────────────
  const goNext = useCallback(() => {
    if (!validateStep(step)) return;
    triggerPreview();
    setStep((s) => Math.min(s + 1, STEP_LABELS.length - 1));
  }, [step, validateStep, triggerPreview]);

  const goBack = useCallback(() => {
    setStep((s) => Math.max(s - 1, 0));
  }, []);

  const handleFinalSubmit = useCallback(() => {
    onSubmit(buildInput());
  }, [onSubmit, buildInput]);

  // ── Feature list helpers ────────────────────────────────────────────────
  const addFeature = () => setFeatures((p) => [...p, { ...EMPTY_FEATURE }]);
  const removeFeature = (idx: number) => setFeatures((p) => p.filter((_, i) => i !== idx));
  const updateFeature = (idx: number, patch: Partial<ClassFeatureEntry>) =>
    setFeatures((p) => p.map((f, i) => (i === idx ? { ...f, ...patch } : f)));
  const addOption = (featureIdx: number) =>
    updateFeature(featureIdx, { options: [...features[featureIdx].options, ""] });
  const removeOption = (featureIdx: number, optIdx: number) =>
    updateFeature(featureIdx, {
      options: features[featureIdx].options.filter((_, i) => i !== optIdx),
    });
  const updateOption = (featureIdx: number, optIdx: number, val: string) =>
    updateFeature(featureIdx, {
      options: features[featureIdx].options.map((o, i) => (i === optIdx ? val : o)),
    });

  // ── Subclass list helpers ───────────────────────────────────────────────
  const addSubclass = () => setSubclasses((p) => [...p, { ...EMPTY_SUBCLASS }]);
  const removeSubclass = (idx: number) => setSubclasses((p) => p.filter((_, i) => i !== idx));
  const updateSubclass = (idx: number, patch: Partial<SubclassEntry>) =>
    setSubclasses((p) => p.map((sc, i) => (i === idx ? { ...sc, ...patch } : sc)));

  // ── String-list helpers ─────────────────────────────────────────────────
  const updateStringList = (
    setter: React.Dispatch<React.SetStateAction<string[]>>,
    idx: number,
    value: string
  ) => setter((p) => p.map((v, i) => (i === idx ? value : v)));
  const addStringItem = (setter: React.Dispatch<React.SetStateAction<string[]>>) =>
    setter((p) => [...p, ""]);
  const removeStringItem = (setter: React.Dispatch<React.SetStateAction<string[]>>, idx: number) =>
    setter((p) => p.filter((_, i) => i !== idx));

  // ── Render helpers ──────────────────────────────────────────────────────

  const hasAnyError = Object.values(errors).some(Boolean);

  // Summary for step 5
  const summaryDomains = useMemo(() => [domain1, domain2].filter(Boolean), [domain1, domain2]);
  const summaryFeatures = useMemo(() => features.filter((f) => f.name.trim()), [features]);
  const summarySubclasses = useMemo(() => subclasses.filter((sc) => sc.name.trim()), [subclasses]);

  return (
    <div className="space-y-6">
      {/* ── Step breadcrumb ────────────────────────────────────────────── */}
      <nav aria-label="Wizard steps" className="flex items-center gap-1 overflow-x-auto pb-2">
        {STEP_LABELS.map((label, i) => {
          const isActive = i === step;
          const isComplete = i < step;
          return (
            <button
              key={i}
              type="button"
              onClick={() => {
                // Allow going back to any completed step, or current
                if (i <= step) setStep(i);
              }}
              disabled={i > step}
              className={`
                flex items-center gap-1.5 shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors
                focus:outline-none focus:ring-2 focus:ring-coral-400/50
                ${isActive
                  ? "bg-coral-400/15 text-coral-400 border border-coral-400/50"
                  : isComplete
                    ? "text-parchment-500 border border-slate-700/40 hover:text-[#b9baa3] hover:border-slate-600 cursor-pointer"
                    : "text-parchment-600 border border-transparent cursor-not-allowed"
                }
              `}
            >
              <span
                className={`
                  inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold
                  ${isActive
                    ? "bg-coral-400/30 text-coral-400"
                    : isComplete
                      ? "bg-emerald-500/20 text-emerald-400"
                      : "bg-slate-700/30 text-parchment-600"
                  }
                `}
              >
                {isComplete ? "\u2713" : i + 1}
              </span>
              <span className="hidden sm:inline">{label}</span>
            </button>
          );
        })}
      </nav>

      {/* ── Error banner ───────────────────────────────────────────────── */}
      {hasAnyError && (
        <div role="alert" className="rounded-lg border border-[#fe5f55]/30 bg-[#fe5f55]/10 px-4 py-2">
          <p className="text-sm text-[#fe5f55]">
            Please fix the errors below before continuing.
          </p>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          STEP 1: Identity & Stats
         ══════════════════════════════════════════════════════════════════ */}
      {step === 0 && (
        <div className="space-y-5 animate-fade-in">
          <h2 className="font-serif text-lg font-semibold text-[#f7f7ff]">Identity & Stats</h2>

          <div>
            <label htmlFor={`${idPrefix}-name`} className={LABEL_CLS}>
              Class Name <span className="text-[#fe5f55]" aria-hidden="true">*</span>
            </label>
            <input
              id={`${idPrefix}-name`}
              type="text"
              value={name}
              onChange={(e) => { setName(e.target.value); setErrors((p) => ({ ...p, name: "" })); }}
              placeholder="e.g. Battlemage"
              maxLength={80}
              className={INPUT_CLS}
            />
            {errors.name && <p role="alert" className="mt-1 text-xs text-[#fe5f55]">{errors.name}</p>}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor={`${idPrefix}-d1`} className={LABEL_CLS}>
                Primary Domain 1 <span className="text-[#fe5f55]" aria-hidden="true">*</span>
              </label>
              <select
                id={`${idPrefix}-d1`}
                value={domain1}
                onChange={(e) => { setDomain1(e.target.value); setErrors((p) => ({ ...p, domain1: "" })); }}
                className={INPUT_CLS}
              >
                <option value="">Select...</option>
                {DOMAIN_OPTIONS.filter((d) => d !== domain2).map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
              {errors.domain1 && <p role="alert" className="mt-1 text-xs text-[#fe5f55]">{errors.domain1}</p>}
            </div>
            <div>
              <label htmlFor={`${idPrefix}-d2`} className={LABEL_CLS}>
                Primary Domain 2
              </label>
              <select
                id={`${idPrefix}-d2`}
                value={domain2}
                onChange={(e) => setDomain2(e.target.value)}
                className={INPUT_CLS}
              >
                <option value="">Select...</option>
                {DOMAIN_OPTIONS.filter((d) => d !== domain1).map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <label htmlFor={`${idPrefix}-hp`} className={LABEL_CLS}>
                Base HP <span className="font-normal text-parchment-600">({SRD_HP_MIN}-{SRD_HP_MAX})</span>
              </label>
              <input
                id={`${idPrefix}-hp`}
                type="number"
                min={SRD_HP_MIN}
                max={SRD_HP_MAX}
                value={baseHp}
                onChange={(e) => setBaseHp(Math.max(SRD_HP_MIN, Math.min(SRD_HP_MAX, Number(e.target.value))))}
                className={INPUT_CLS}
              />
            </div>
            <div>
              <label htmlFor={`${idPrefix}-ev`} className={LABEL_CLS}>
                Evasion <span className="font-normal text-parchment-600">({SRD_EVASION_MIN}-{SRD_EVASION_MAX})</span>
              </label>
              <input
                id={`${idPrefix}-ev`}
                type="number"
                min={SRD_EVASION_MIN}
                max={SRD_EVASION_MAX}
                value={evasion}
                onChange={(e) => setEvasion(Math.max(SRD_EVASION_MIN, Math.min(SRD_EVASION_MAX, Number(e.target.value))))}
                className={INPUT_CLS}
              />
            </div>
            <div>
              <label htmlFor={`${idPrefix}-maj`} className={LABEL_CLS}>Major Threshold</label>
              <input
                id={`${idPrefix}-maj`}
                type="number"
                min={1}
                value={majorThreshold}
                onChange={(e) => setMajorThreshold(Number(e.target.value))}
                className={INPUT_CLS}
              />
            </div>
            <div>
              <label htmlFor={`${idPrefix}-sev`} className={LABEL_CLS}>Severe Threshold</label>
              <input
                id={`${idPrefix}-sev`}
                type="number"
                min={1}
                value={severeThreshold}
                onChange={(e) => setSevereThreshold(Number(e.target.value))}
                className={INPUT_CLS}
              />
            </div>
          </div>

          {/* ── Balance guardrails (soft warnings) ──────────────────── */}
          {(() => {
            const statSum = baseHp + evasion;
            const warnings: string[] = [];
            if (statSum < SRD_SUM_MIN || statSum > SRD_SUM_MAX) {
              warnings.push(
                `HP + Evasion total is ${statSum}. SRD classes range from ${SRD_SUM_MIN} to ${SRD_SUM_MAX}; consider adjusting for balance.`
              );
            }
            if (baseHp === SRD_HP_MAX && evasion === SRD_EVASION_MAX) {
              warnings.push(
                "Both HP and Evasion are at their maximums. This may make the class overly durable."
              );
            }
            if (majorThreshold >= severeThreshold) {
              warnings.push(
                "Major threshold should be lower than severe threshold."
              );
            }
            if (warnings.length === 0) return null;
            return (
              <div className={SOFT_WARNING_CLS}>
                <p className="font-semibold mb-1">Balance Notes</p>
                <ul className="list-disc pl-4 space-y-0.5">
                  {warnings.map((w, i) => <li key={i}>{w}</li>)}
                </ul>
              </div>
            );
          })()}

          {/* Hope Feature */}
          <fieldset className="space-y-3 rounded-lg border border-slate-700/40 p-4">
            <legend className="font-serif text-base font-semibold text-[#f7f7ff] px-1">
              Hope Feature
            </legend>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_80px]">
              <div>
                <label htmlFor={`${idPrefix}-hn`} className={LABEL_CLS}>Feature Name</label>
                <input
                  id={`${idPrefix}-hn`}
                  type="text"
                  value={hopeName}
                  onChange={(e) => setHopeName(e.target.value)}
                  placeholder="e.g. Arcane Surge"
                  className={INPUT_CLS}
                />
              </div>
              <div>
                <label htmlFor={`${idPrefix}-hc`} className={LABEL_CLS}>Hope Cost</label>
                <input
                  id={`${idPrefix}-hc`}
                  type="number"
                  min={0}
                  max={6}
                  value={hopeCost}
                  onChange={(e) => setHopeCost(Number(e.target.value))}
                  className={INPUT_CLS}
                />
              </div>
            </div>
            <div>
              <label htmlFor={`${idPrefix}-hd`} className={LABEL_CLS}>Feature Description</label>
              <textarea
                id={`${idPrefix}-hd`}
                value={hopeDescription}
                onChange={(e) => setHopeDescription(e.target.value)}
                rows={2}
                placeholder="Describe the hope feature effect..."
                className={TEXTAREA_CLS}
              />
            </div>
          </fieldset>

          <div>
            <label htmlFor={`${idPrefix}-mn`} className={LABEL_CLS}>Mechanical Notes</label>
            <textarea
              id={`${idPrefix}-mn`}
              value={mechanicalNotes}
              onChange={(e) => setMechanicalNotes(e.target.value)}
              rows={2}
              placeholder="Any additional mechanical notes for the class..."
              className={TEXTAREA_CLS}
            />
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          STEP 2: Class Features
         ══════════════════════════════════════════════════════════════════ */}
      {step === 1 && (
        <div className="space-y-5 animate-fade-in">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-lg font-semibold text-[#f7f7ff]">Class Features</h2>
            <button type="button" onClick={addFeature} className={BTN_SECONDARY}>
              + Add Feature
            </button>
          </div>

          {errors.features && (
            <p role="alert" className="text-xs text-[#fe5f55]">{errors.features}</p>
          )}

          {features.map((feature, fi) => (
            <div key={fi} className="space-y-3 rounded-lg border border-slate-700/40 p-4">
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-sm font-semibold text-parchment-500">
                  Feature {fi + 1}
                </h3>
                {features.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeFeature(fi)}
                    className="text-xs text-[#fe5f55]/60 hover:text-[#fe5f55] transition-colors"
                  >
                    Remove
                  </button>
                )}
              </div>

              <div>
                <label className={LABEL_CLS}>Feature Name</label>
                <input
                  type="text"
                  value={feature.name}
                  onChange={(e) => updateFeature(fi, { name: e.target.value })}
                  placeholder="e.g. Elemental Attunement"
                  className={INPUT_CLS}
                />
              </div>
              <div>
                <label className={LABEL_CLS}>Description</label>
                <textarea
                  value={feature.description}
                  onChange={(e) => updateFeature(fi, { description: e.target.value })}
                  rows={3}
                  placeholder="Describe the feature..."
                  className={TEXTAREA_CLS}
                />
              </div>

              {/* Options list */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className={LABEL_CLS}>Options <span className="font-normal text-parchment-600">(optional)</span></label>
                  <button
                    type="button"
                    onClick={() => addOption(fi)}
                    className="text-xs text-coral-400 hover:text-coral-300 transition-colors"
                  >
                    + Add Option
                  </button>
                </div>
                {feature.options.map((opt, oi) => (
                  <div key={oi} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={opt}
                      onChange={(e) => updateOption(fi, oi, e.target.value)}
                      placeholder={`Option ${oi + 1}`}
                      className={`${INPUT_CLS} flex-1`}
                    />
                    <button
                      type="button"
                      onClick={() => removeOption(fi, oi)}
                      className="text-xs text-[#fe5f55]/60 hover:text-[#fe5f55] transition-colors px-2 py-1"
                      aria-label={`Remove option ${oi + 1}`}
                    >
                      &times;
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          STEP 3: Subclasses
         ══════════════════════════════════════════════════════════════════ */}
      {step === 2 && (
        <div className="space-y-5 animate-fade-in">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-lg font-semibold text-[#f7f7ff]">Subclasses</h2>
            <button type="button" onClick={addSubclass} className={BTN_SECONDARY}>
              + Add Subclass
            </button>
          </div>

          {subclasses.map((sc, si) => (
            <div key={si} className="space-y-4 rounded-lg border border-slate-700/40 p-4">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-serif text-base font-semibold text-[#f7f7ff]">
                  Subclass {si + 1}
                </h3>
                {subclasses.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeSubclass(si)}
                    className="text-xs text-[#fe5f55]/60 hover:text-[#fe5f55] transition-colors"
                  >
                    Remove
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className={LABEL_CLS}>Subclass Name</label>
                  <input
                    type="text"
                    value={sc.name}
                    onChange={(e) => updateSubclass(si, { name: e.target.value })}
                    placeholder="e.g. Stormcaller"
                    className={INPUT_CLS}
                  />
                  {errors[`sc-${si}-name`] && (
                    <p role="alert" className="mt-1 text-xs text-[#fe5f55]">{errors[`sc-${si}-name`]}</p>
                  )}
                </div>
                <div>
                  <label className={LABEL_CLS}>Spellcast Trait</label>
                  <select
                    value={sc.spellcastTrait}
                    onChange={(e) => updateSubclass(si, { spellcastTrait: e.target.value })}
                    className={INPUT_CLS}
                  >
                    {TRAIT_OPTIONS.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className={LABEL_CLS}>Description</label>
                <textarea
                  value={sc.description}
                  onChange={(e) => updateSubclass(si, { description: e.target.value })}
                  rows={2}
                  placeholder="Describe this subclass..."
                  className={TEXTAREA_CLS}
                />
              </div>

              {/* Foundation */}
              <fieldset className="space-y-2 border-l-2 border-coral-400/20 pl-3">
                <legend className="text-xs font-semibold uppercase tracking-wider text-parchment-500 px-1">
                  Foundation Feature
                </legend>
                <input
                  type="text"
                  value={sc.foundationName}
                  onChange={(e) => updateSubclass(si, { foundationName: e.target.value })}
                  placeholder="Foundation feature name"
                  className={INPUT_CLS}
                />
                <textarea
                  value={sc.foundationDescription}
                  onChange={(e) => updateSubclass(si, { foundationDescription: e.target.value })}
                  rows={2}
                  placeholder="Foundation feature description..."
                  className={TEXTAREA_CLS}
                />
              </fieldset>

              {/* Specialization */}
              <fieldset className="space-y-2 border-l-2 border-coral-400/20 pl-3">
                <legend className="text-xs font-semibold uppercase tracking-wider text-parchment-500 px-1">
                  Specialization Feature
                </legend>
                <input
                  type="text"
                  value={sc.specializationName}
                  onChange={(e) => updateSubclass(si, { specializationName: e.target.value })}
                  placeholder="Specialization feature name"
                  className={INPUT_CLS}
                />
                <textarea
                  value={sc.specializationDescription}
                  onChange={(e) => updateSubclass(si, { specializationDescription: e.target.value })}
                  rows={2}
                  placeholder="Specialization feature description..."
                  className={TEXTAREA_CLS}
                />
              </fieldset>

              {/* Mastery */}
              <fieldset className="space-y-2 border-l-2 border-coral-400/20 pl-3">
                <legend className="text-xs font-semibold uppercase tracking-wider text-parchment-500 px-1">
                  Mastery Feature
                </legend>
                <input
                  type="text"
                  value={sc.masteryName}
                  onChange={(e) => updateSubclass(si, { masteryName: e.target.value })}
                  placeholder="Mastery feature name"
                  className={INPUT_CLS}
                />
                <textarea
                  value={sc.masteryDescription}
                  onChange={(e) => updateSubclass(si, { masteryDescription: e.target.value })}
                  rows={2}
                  placeholder="Mastery feature description..."
                  className={TEXTAREA_CLS}
                />
              </fieldset>
            </div>
          ))}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          STEP 4: Background & Connections
         ══════════════════════════════════════════════════════════════════ */}
      {step === 3 && (
        <div className="space-y-5 animate-fade-in">
          <h2 className="font-serif text-lg font-semibold text-[#f7f7ff]">
            Background & Connections
          </h2>

          {/* Background questions */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className={LABEL_CLS}>Background Questions</label>
              <button
                type="button"
                onClick={() => addStringItem(setBackgroundQuestions)}
                className="text-xs text-coral-400 hover:text-coral-300 transition-colors"
              >
                + Add Question
              </button>
            </div>
            {backgroundQuestions.map((q, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  type="text"
                  value={q}
                  onChange={(e) => updateStringList(setBackgroundQuestions, i, e.target.value)}
                  placeholder={`Background question ${i + 1}`}
                  className={`${INPUT_CLS} flex-1`}
                />
                {backgroundQuestions.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeStringItem(setBackgroundQuestions, i)}
                    className="text-xs text-[#fe5f55]/60 hover:text-[#fe5f55] transition-colors px-2 py-1"
                    aria-label={`Remove question ${i + 1}`}
                  >
                    &times;
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Connection questions */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className={LABEL_CLS}>Connection Questions</label>
              <button
                type="button"
                onClick={() => addStringItem(setConnectionQuestions)}
                className="text-xs text-coral-400 hover:text-coral-300 transition-colors"
              >
                + Add Question
              </button>
            </div>
            {connectionQuestions.map((q, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  type="text"
                  value={q}
                  onChange={(e) => updateStringList(setConnectionQuestions, i, e.target.value)}
                  placeholder={`Connection question ${i + 1}`}
                  className={`${INPUT_CLS} flex-1`}
                />
                {connectionQuestions.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeStringItem(setConnectionQuestions, i)}
                    className="text-xs text-[#fe5f55]/60 hover:text-[#fe5f55] transition-colors px-2 py-1"
                    aria-label={`Remove question ${i + 1}`}
                  >
                    &times;
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Class items */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className={LABEL_CLS}>Class Items</label>
              <button
                type="button"
                onClick={() => addStringItem(setClassItems)}
                className="text-xs text-coral-400 hover:text-coral-300 transition-colors"
              >
                + Add Item
              </button>
            </div>
            {classItems.map((item, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  type="text"
                  value={item}
                  onChange={(e) => updateStringList(setClassItems, i, e.target.value)}
                  placeholder={`Class item ${i + 1}`}
                  className={`${INPUT_CLS} flex-1`}
                />
                {classItems.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeStringItem(setClassItems, i)}
                    className="text-xs text-[#fe5f55]/60 hover:text-[#fe5f55] transition-colors px-2 py-1"
                    aria-label={`Remove item ${i + 1}`}
                  >
                    &times;
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          STEP 5: Review & Save
         ══════════════════════════════════════════════════════════════════ */}
      {step === 4 && (
        <div className="space-y-5 animate-fade-in">
          <h2 className="font-serif text-lg font-semibold text-[#f7f7ff]">Review & Save</h2>

          <div className="rounded-lg border border-slate-700/40 bg-slate-900/40 p-5 space-y-4">
            {/* Identity */}
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-parchment-500">
                Class Name
              </p>
              <p className="font-serif text-xl font-bold text-[#f7f7ff]">{name || "\u2014"}</p>
            </div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 text-sm">
              <div>
                <p className="text-xs text-parchment-500">Domains</p>
                <p className="text-[#f7f7ff]">{summaryDomains.join(", ") || "\u2014"}</p>
              </div>
              <div>
                <p className="text-xs text-parchment-500">HP</p>
                <p className="text-[#f7f7ff]">{baseHp}</p>
              </div>
              <div>
                <p className="text-xs text-parchment-500">Evasion</p>
                <p className="text-[#f7f7ff]">{evasion}</p>
              </div>
              <div>
                <p className="text-xs text-parchment-500">Thresholds</p>
                <p className="text-[#f7f7ff]">{majorThreshold} / {severeThreshold}</p>
              </div>
            </div>

            {/* Hope feature */}
            {hopeName && (
              <div className="space-y-1 border-t border-slate-700/30 pt-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-parchment-500">
                  Hope Feature
                </p>
                <p className="text-sm text-[#f7f7ff]">
                  {hopeName} <span className="text-gold-400">({hopeCost} Hope)</span>
                </p>
                {hopeDescription && (
                  <p className="text-xs text-parchment-500">{hopeDescription}</p>
                )}
              </div>
            )}

            {/* Features summary */}
            {summaryFeatures.length > 0 && (
              <div className="space-y-1 border-t border-slate-700/30 pt-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-parchment-500">
                  Class Features ({summaryFeatures.length})
                </p>
                <ul className="space-y-0.5 text-sm text-parchment-500">
                  {summaryFeatures.map((f, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <span className="inline-block h-1.5 w-1.5 rounded-full bg-coral-400/50" />
                      {f.name}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Subclasses summary */}
            {summarySubclasses.length > 0 && (
              <div className="space-y-1 border-t border-slate-700/30 pt-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-parchment-500">
                  Subclasses ({summarySubclasses.length})
                </p>
                <ul className="space-y-0.5 text-sm text-parchment-500">
                  {summarySubclasses.map((sc, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <span className="inline-block h-1.5 w-1.5 rounded-full bg-coral-400/50" />
                      {sc.name}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* ── Review balance warnings ────────────────────────────── */}
          {(() => {
            const warnings: string[] = [];
            const statSum = baseHp + evasion;
            if (statSum < SRD_SUM_MIN || statSum > SRD_SUM_MAX) {
              warnings.push(
                `HP + Evasion total is ${statSum} (SRD range: ${SRD_SUM_MIN}-${SRD_SUM_MAX}).`
              );
            }
            if (majorThreshold >= severeThreshold) {
              warnings.push("Major threshold should be lower than severe threshold.");
            }
            if (summaryFeatures.length === 0) {
              warnings.push("No class features defined. All SRD classes have at least one.");
            }
            if (summarySubclasses.length < 2) {
              warnings.push(
                `Only ${summarySubclasses.length} subclass(es). SRD classes typically have 2-3.`
              );
            }
            if (!hopeName.trim()) {
              warnings.push("No Hope feature defined. All SRD classes have a Hope feature.");
            }
            if (warnings.length === 0) return null;
            return (
              <div className={SOFT_WARNING_CLS}>
                <p className="font-semibold mb-1">Balance Summary</p>
                <ul className="list-disc pl-4 space-y-0.5">
                  {warnings.map((w, i) => <li key={i}>{w}</li>)}
                </ul>
              </div>
            );
          })()}

          {/* Final submit */}
          <div className="text-center">
            <button
              type="button"
              onClick={handleFinalSubmit}
              disabled={isSubmitting}
              className={BTN_PRIMARY}
            >
              {isSubmitting ? "Saving Class\u2026" : (submitLabel ?? "Create Class")}
            </button>
          </div>
        </div>
      )}

      {/* ── Step navigation ────────────────────────────────────────────── */}
      {step < 4 && (
        <div className="flex items-center justify-between gap-3 border-t border-slate-700/40 pt-5">
          <button
            type="button"
            onClick={goBack}
            disabled={step === 0}
            className={`${BTN_SECONDARY} disabled:opacity-30 disabled:cursor-not-allowed`}
          >
            &larr; Back
          </button>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={triggerPreview}
              disabled={!name.trim()}
              className={`${BTN_SECONDARY} disabled:opacity-30 disabled:cursor-not-allowed`}
            >
              Preview
            </button>
            <button type="button" onClick={goNext} className={BTN_PRIMARY}>
              Next &rarr;
            </button>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="flex items-center justify-start border-t border-slate-700/40 pt-5">
          <button type="button" onClick={goBack} className={BTN_SECONDARY}>
            &larr; Back
          </button>
        </div>
      )}
    </div>
  );
}
