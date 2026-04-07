"use client";

/**
 * src/components/homebrew/CommunityForm.tsx
 *
 * Single-page form for creating a homebrew Community.
 *
 * Fields:
 *   - Name (required)
 *   - Description / flavor text
 *   - Cultural trait: name + description
 *   - Mechanical bonuses (repeatable, optional)
 *
 * Assembles markdown in the background and calls the provided onSubmit callback
 * with a HomebrewMarkdownInput payload.
 */

import React, { useCallback, useId, useMemo, useState } from "react";
import type { HomebrewMarkdownInput, MechanicalBonus } from "@shared/types";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CommunityFormProps {
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
  };
  /** Label override for the submit button (defaults to "Create Community"). */
  submitLabel?: string;
}

interface BonusRow {
  stat: MechanicalBonus["stat"];
  amount: number;
  traitIndex: 0 | 1;
  condition: string;
}

// ─── Styling constants ────────────────────────────────────────────────────────

const INPUT_CLS =
  "w-full rounded-lg border border-slate-700/60 bg-slate-900/60 px-3 py-2 text-sm text-[#f7f7ff] placeholder:text-parchment-600 focus:outline-none focus:ring-2 focus:ring-coral-400/50 focus:border-coral-400/50 transition-colors";

const LABEL_CLS = "block text-sm font-medium text-parchment-500 mb-1";

const TEXTAREA_CLS = `${INPUT_CLS} resize-none`;

const BTN_SECONDARY =
  "rounded-lg border border-slate-700/60 px-4 py-2 text-sm text-parchment-500 hover:text-[#b9baa3] hover:border-slate-600 transition-colors focus:outline-none focus:ring-2 focus:ring-coral-400/50";

const STAT_OPTIONS: MechanicalBonus["stat"][] = [
  "armor",
  "hp",
  "stress",
  "evasion",
  "hope",
  "hopeMax",
];

// ─── Component ────────────────────────────────────────────────────────────────

export function CommunityForm({
  onSubmit,
  onPreview,
  isSubmitting = false,
  initialValues,
  submitLabel,
}: CommunityFormProps) {
  const idPrefix = useId();

  // ── Form state ──────────────────────────────────────────────────────────
  const [name, setName] = useState(initialValues?.name ?? "");
  const [description, setDescription] = useState(initialValues?.flavorText ?? "");
  const [traitName, setTraitName] = useState(initialValues?.traitName ?? "");
  const [traitDescription, setTraitDescription] = useState(initialValues?.traitDescription ?? "");
  const [bonuses, setBonuses] = useState<BonusRow[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // ── Markdown assembly ───────────────────────────────────────────────────
  // Generate markdown in the format the CommunityParser expects:
  //   _<flavor text>_
  //   **TraitName**: Trait description
  const assembleMarkdown = useCallback((): string => {
    const lines: string[] = [];
    if (description.trim()) {
      lines.push(`_${description.trim()}_`);
      lines.push("");
    }
    if (traitName.trim()) {
      const desc = traitDescription.trim();
      lines.push(`**${traitName.trim()}**: ${desc}`);
      lines.push("");
    }
    return lines.join("\n");
  }, [description, traitName, traitDescription]);

  const buildInput = useCallback((): HomebrewMarkdownInput => ({
    contentType: "community",
    name: name.trim(),
    markdown: assembleMarkdown(),
  }), [name, assembleMarkdown]);

  const triggerPreview = useCallback(() => {
    if (onPreview && name.trim()) {
      onPreview(buildInput());
    }
  }, [onPreview, name, buildInput]);

  // ── Validation ──────────────────────────────────────────────────────────
  const validate = useCallback((): boolean => {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = "Name is required.";
    if (!traitName.trim()) errs.traitName = "Cultural trait name is required.";
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

  const canPreview = useMemo(() => !!name.trim(), [name]);

  return (
    <div className="space-y-6">
      {/* ── Name ──────────────────────────────────────────────────────── */}
      <div>
        <label htmlFor={`${idPrefix}-name`} className={LABEL_CLS}>
          Community Name <span className="text-[#fe5f55]" aria-hidden="true">*</span>
        </label>
        <input
          id={`${idPrefix}-name`}
          type="text"
          value={name}
          onChange={(e) => { setName(e.target.value); setErrors((p) => ({ ...p, name: "" })); }}
          onBlur={triggerPreview}
          placeholder="e.g. Wandering Caravan"
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
          placeholder="Describe the culture, history, and character of this community..."
          className={TEXTAREA_CLS}
        />
      </div>

      {/* ── Cultural Trait ─────────────────────────────────────────────── */}
      <fieldset className="space-y-3 rounded-lg border border-slate-700/40 p-4">
        <legend className="font-serif text-lg font-semibold text-[#f7f7ff] px-1">
          Cultural Trait <span className="text-[#fe5f55] text-xs" aria-hidden="true">*</span>
        </legend>
        <div>
          <label htmlFor={`${idPrefix}-tname`} className={LABEL_CLS}>
            Trait Name
          </label>
          <input
            id={`${idPrefix}-tname`}
            type="text"
            value={traitName}
            onChange={(e) => { setTraitName(e.target.value); setErrors((p) => ({ ...p, traitName: "" })); }}
            onBlur={triggerPreview}
            placeholder="e.g. Road-Hardened"
            maxLength={80}
            className={INPUT_CLS}
          />
          {errors.traitName && (
            <p role="alert" className="mt-1 text-xs text-[#fe5f55]">{errors.traitName}</p>
          )}
        </div>
        <div>
          <label htmlFor={`${idPrefix}-tdesc`} className={LABEL_CLS}>
            Trait Description
          </label>
          <textarea
            id={`${idPrefix}-tdesc`}
            value={traitDescription}
            onChange={(e) => setTraitDescription(e.target.value)}
            onBlur={triggerPreview}
            rows={3}
            placeholder="Describe the mechanical or narrative effect of this cultural trait..."
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

      {/* ── Actions ────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3 border-t border-slate-700/40 pt-5">
        <button
          type="button"
          onClick={triggerPreview}
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
          {isSubmitting ? "Saving\u2026" : (submitLabel ?? "Create Community")}
        </button>
      </div>
    </div>
  );
}
