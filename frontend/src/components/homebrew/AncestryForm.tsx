"use client";

/**
 * src/components/homebrew/AncestryForm.tsx
 *
 * Single-page form for creating a homebrew Ancestry.
 *
 * Fields:
 *   - Name (required)
 *   - Description / flavor text
 *   - First trait: name + description (required)
 *   - Second trait: name + description (optional)
 *   - Mechanical bonuses (repeatable, optional)
 *
 * Assembles markdown in the background and calls the provided onSubmit callback
 * with a HomebrewMarkdownInput payload. Also exposes a "Preview" action that
 * invokes the parse-preview hook so the parent can render a live preview.
 */

import React, { useCallback, useId, useMemo, useState } from "react";
import type { HomebrewMarkdownInput, MechanicalBonus } from "@shared/types";
import { INPUT_CLS, LABEL_CLS, TEXTAREA_CLS, BTN_SECONDARY, SOFT_WARNING_CLS } from "./styles";
import { SHOW_PREVIEW_EVENT } from "./WorkshopLayout";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AncestryFormProps {
  /** Called when the user submits the form with assembled markdown. */
  onSubmit: (input: HomebrewMarkdownInput) => void;
  /** Called whenever form data changes — passes the assembled markdown input for preview. */
  onPreview?: (input: HomebrewMarkdownInput) => void;
  /** Whether the form is currently submitting. */
  isSubmitting?: boolean;
  /** Pre-populated values for edit mode. */
  initialValues?: {
    name?: string;
    flavorText?: string;
    traitName?: string;
    traitDescription?: string;
    secondTraitName?: string;
    secondTraitDescription?: string;
  };
  /** Label override for the submit button (defaults to "Create Ancestry"). */
  submitLabel?: string;
}

interface BonusRow {
  stat: MechanicalBonus["stat"];
  amount: number;
  traitIndex: 0 | 1;
  condition: string;
}

// ─── Stat options ─────────────────────────────────────────────────────────────

const STAT_OPTIONS: MechanicalBonus["stat"][] = [
  "armor",
  "hp",
  "stress",
  "evasion",
  "hope",
  "hopeMax",
];

// ─── Component ────────────────────────────────────────────────────────────────

export function AncestryForm({
  onSubmit,
  onPreview,
  isSubmitting = false,
  initialValues,
  submitLabel,
}: AncestryFormProps) {
  const idPrefix = useId();

  // ── Form state ──────────────────────────────────────────────────────────
  const [name, setName] = useState(initialValues?.name ?? "");
  const [description, setDescription] = useState(initialValues?.flavorText ?? "");
  const [traitName, setTraitName] = useState(initialValues?.traitName ?? "");
  const [traitDescription, setTraitDescription] = useState(initialValues?.traitDescription ?? "");
  const [secondTraitName, setSecondTraitName] = useState(initialValues?.secondTraitName ?? "");
  const [secondTraitDescription, setSecondTraitDescription] = useState(initialValues?.secondTraitDescription ?? "");
  const [bonuses, setBonuses] = useState<BonusRow[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // ── Markdown assembly ───────────────────────────────────────────────────
  // Generate markdown in the format the AncestryParser expects:
  //   <flavor text>
  //   **TraitName**: Trait description
  //   **SecondTraitName**: Second trait description
  const assembleMarkdown = useCallback((): string => {
    const lines: string[] = [];
    if (description.trim()) {
      lines.push(description.trim());
      lines.push("");
    }
    if (traitName.trim()) {
      const desc = traitDescription.trim();
      lines.push(`**${traitName.trim()}**: ${desc}`);
      lines.push("");
    }
    if (secondTraitName.trim()) {
      const desc = secondTraitDescription.trim();
      lines.push(`**${secondTraitName.trim()}**: ${desc}`);
      lines.push("");
    }
    return lines.join("\n");
  }, [description, traitName, traitDescription, secondTraitName, secondTraitDescription]);

  const buildInput = useCallback((): HomebrewMarkdownInput => ({
    contentType: "ancestry",
    name: name.trim(),
    markdown: assembleMarkdown(),
  }), [name, assembleMarkdown]);

  // Trigger preview on meaningful field change
  const triggerPreview = useCallback(() => {
    if (onPreview && name.trim()) {
      onPreview(buildInput());
    }
  }, [onPreview, name, buildInput]);

  // ── Validation ──────────────────────────────────────────────────────────
  const validate = useCallback((): boolean => {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = "Name is required.";
    if (!traitName.trim()) errs.traitName = "At least one feature (trait) is required.";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }, [name, traitName]);

  // ── Handlers ────────────────────────────────────────────────────────────
  const handleSubmit = useCallback(() => {
    if (!validate()) return;
    onSubmit(buildInput());
  }, [validate, onSubmit, buildInput]);

  const addBonus = useCallback(() => {
    setBonuses((prev) => [
      ...prev,
      { stat: "hp", amount: 1, traitIndex: 0, condition: "" },
    ]);
  }, []);

  const removeBonus = useCallback((idx: number) => {
    setBonuses((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  const updateBonus = useCallback(
    (idx: number, patch: Partial<BonusRow>) => {
      setBonuses((prev) =>
        prev.map((b, i) => (i === idx ? { ...b, ...patch } : b))
      );
    },
    []
  );

  // ── Memoized preview availability ───────────────────────────────────────
  const canPreview = useMemo(() => !!name.trim(), [name]);

  return (
    <div className="space-y-6">
      {/* ── Name ──────────────────────────────────────────────────────── */}
      <div>
        <label htmlFor={`${idPrefix}-name`} className={LABEL_CLS}>
          Ancestry Name <span className="text-[#fe5f55]" aria-hidden="true">*</span>
        </label>
        <input
          id={`${idPrefix}-name`}
          type="text"
          value={name}
          onChange={(e) => { setName(e.target.value); setErrors((p) => ({ ...p, name: "" })); }}
          onBlur={triggerPreview}
          placeholder="e.g. Firbolg"
          maxLength={80}
          required
          className={INPUT_CLS}
        />
        {errors.name && (
          <p role="alert" className="mt-1 text-xs text-[#fe5f55]">{errors.name}</p>
        )}
      </div>

      {/* ── Description ───────────────────────────────────────────────── */}
      <div>
        <label htmlFor={`${idPrefix}-desc`} className={LABEL_CLS}>
          Description / Flavor Text
        </label>
        <textarea
          id={`${idPrefix}-desc`}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onBlur={triggerPreview}
          rows={3}
          placeholder="A paragraph of flavor text describing this ancestry..."
          className={TEXTAREA_CLS}
        />
      </div>

      {/* ── Feature 1 (required) ──────────────────────────────────────── */}
      <fieldset className="space-y-3 rounded-lg border border-slate-700/40 p-4">
        <legend className="font-serif text-lg font-semibold text-[#f7f7ff] px-1">
          Feature 1 <span className="text-[#fe5f55] text-xs" aria-hidden="true">*</span>
        </legend>
        <div>
          <label htmlFor={`${idPrefix}-t1name`} className={LABEL_CLS}>
            Feature Name
          </label>
          <input
            id={`${idPrefix}-t1name`}
            type="text"
            value={traitName}
            onChange={(e) => { setTraitName(e.target.value); setErrors((p) => ({ ...p, traitName: "" })); }}
            onBlur={triggerPreview}
            placeholder="e.g. Giant Kin"
            maxLength={80}
            className={INPUT_CLS}
          />
          {errors.traitName && (
            <p role="alert" className="mt-1 text-xs text-[#fe5f55]">{errors.traitName}</p>
          )}
        </div>
        <div>
          <label htmlFor={`${idPrefix}-t1desc`} className={LABEL_CLS}>
            Feature Description
          </label>
          <textarea
            id={`${idPrefix}-t1desc`}
            value={traitDescription}
            onChange={(e) => setTraitDescription(e.target.value)}
            onBlur={triggerPreview}
            rows={3}
            placeholder="Describe the mechanical or narrative effect..."
            className={TEXTAREA_CLS}
          />
        </div>
      </fieldset>

      {/* ── Feature 2 (optional) ──────────────────────────────────────── */}
      <fieldset className="space-y-3 rounded-lg border border-slate-700/40 p-4">
        <legend className="font-serif text-lg font-semibold text-[#f7f7ff] px-1">
          Feature 2 <span className="text-xs font-normal text-parchment-500">(optional)</span>
        </legend>
        <div>
          <label htmlFor={`${idPrefix}-t2name`} className={LABEL_CLS}>
            Feature Name
          </label>
          <input
            id={`${idPrefix}-t2name`}
            type="text"
            value={secondTraitName}
            onChange={(e) => setSecondTraitName(e.target.value)}
            onBlur={triggerPreview}
            placeholder="e.g. Woodland Stride"
            maxLength={80}
            className={INPUT_CLS}
          />
        </div>
        <div>
          <label htmlFor={`${idPrefix}-t2desc`} className={LABEL_CLS}>
            Feature Description
          </label>
          <textarea
            id={`${idPrefix}-t2desc`}
            value={secondTraitDescription}
            onChange={(e) => setSecondTraitDescription(e.target.value)}
            onBlur={triggerPreview}
            rows={3}
            placeholder="Describe the mechanical or narrative effect..."
            className={TEXTAREA_CLS}
          />
        </div>
      </fieldset>

      {/* ── Mechanical Bonuses ─────────────────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-serif text-lg font-semibold text-[#f7f7ff]">
            Mechanical Bonuses
          </h3>
          <button type="button" onClick={addBonus} className={BTN_SECONDARY}>
            + Add Bonus
          </button>
        </div>

        {bonuses.length === 0 && (
          <p className="text-xs text-parchment-600">
            No mechanical bonuses defined. These are optional.
          </p>
        )}

        {bonuses.map((bonus, idx) => (
          <div
            key={idx}
            className="flex flex-wrap items-end gap-2 rounded-lg border border-slate-700/40 bg-slate-900/40 p-3"
          >
            <div className="min-w-[100px] flex-1">
              <label className={LABEL_CLS}>Stat</label>
              <select
                value={bonus.stat}
                onChange={(e) => updateBonus(idx, { stat: e.target.value as MechanicalBonus["stat"] })}
                className={INPUT_CLS}
              >
                {STAT_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div className="w-20">
              <label className={LABEL_CLS}>Amount</label>
              <input
                type="number"
                value={bonus.amount}
                onChange={(e) => updateBonus(idx, { amount: Number(e.target.value) })}
                className={INPUT_CLS}
              />
            </div>
            <div className="w-20">
              <label className={LABEL_CLS}>Trait #</label>
              <select
                value={bonus.traitIndex}
                onChange={(e) => updateBonus(idx, { traitIndex: Number(e.target.value) as 0 | 1 })}
                className={INPUT_CLS}
              >
                <option value={0}>0</option>
                <option value={1}>1</option>
              </select>
            </div>
            <div className="flex-1 min-w-[120px]">
              <label className={LABEL_CLS}>Condition</label>
              <input
                type="text"
                value={bonus.condition}
                onChange={(e) => updateBonus(idx, { condition: e.target.value })}
                placeholder="Optional"
                className={INPUT_CLS}
              />
            </div>
            <button
              type="button"
              onClick={() => removeBonus(idx)}
              className="rounded-lg border border-[#fe5f55]/30 px-3 py-2 text-xs text-[#fe5f55]/60 hover:text-[#fe5f55] hover:border-[#fe5f55]/50 transition-colors"
              aria-label={`Remove bonus ${idx + 1}`}
            >
              Remove
            </button>
          </div>
        ))}
      </div>

      {/* ── Balance guardrails (soft warnings) ──────────────────────── */}
      {(() => {
        const warnings: string[] = [];
        if (traitName.trim() && !traitDescription.trim()) {
          warnings.push(
            "Feature 1 has a name but no description. Players will need to know what it does."
          );
        }
        if (secondTraitName.trim() && !secondTraitDescription.trim()) {
          warnings.push(
            "Feature 2 has a name but no description. Players will need to know what it does."
          );
        }
        if (!secondTraitName.trim() && traitName.trim()) {
          warnings.push(
            "SRD ancestries have exactly 2 features. Consider adding a second feature for balance parity."
          );
        }
        if (bonuses.length > 3) {
          warnings.push(
            `${bonuses.length} mechanical bonuses is unusually high. SRD ancestries typically have 0-2 bonuses.`
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

      {/* ── Actions ────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3 border-t border-slate-700/40 pt-5">
        <button
          type="button"
          onClick={() => { triggerPreview(); window.dispatchEvent(new Event(SHOW_PREVIEW_EVENT)); }}
          disabled={!canPreview}
          className={`${BTN_SECONDARY} disabled:opacity-30 disabled:cursor-not-allowed`}
        >
          Preview Markdown
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="
            rounded-xl border border-coral-400/60 bg-coral-400/10
            px-5 py-2.5 font-semibold text-base text-coral-400
            hover:bg-coral-400/20 hover:border-coral-400
            disabled:opacity-40 disabled:cursor-not-allowed
            transition-all
            focus:outline-none focus:ring-2 focus:ring-coral-400
            focus:ring-offset-2 focus:ring-offset-[#0a100d]
          "
        >
          {isSubmitting ? "Saving\u2026" : (submitLabel ?? "Create Ancestry")}
        </button>
      </div>
    </div>
  );
}
