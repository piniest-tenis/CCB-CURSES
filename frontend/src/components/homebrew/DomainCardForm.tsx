"use client";

/**
 * src/components/homebrew/DomainCardForm.tsx
 *
 * Single-page form for creating a homebrew Domain Card.
 *
 * Features progressive disclosure:
 *   - Base fields: name, domain, level, description/ability, recall cost
 *   - Toggle: "Is Cursed?" → reveals curse description textarea
 *   - Toggle: "Is Linked Curse?" checkbox
 *
 * Assembles a HomebrewMarkdownInput and calls onSubmit.
 */

import React, { useCallback, useId, useMemo, useState } from "react";
import type { HomebrewMarkdownInput } from "@shared/types";
import { useDomains } from "@/hooks/useGameData";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DomainCardFormProps {
  /** Called when the user submits the form with assembled markdown. */
  onSubmit: (input: HomebrewMarkdownInput) => void;
  /** Called for live preview updates. */
  onPreview?: (input: HomebrewMarkdownInput) => void;
  /** Whether the form is currently submitting. */
  isSubmitting?: boolean;
  /** Pre-populated values for edit mode. */
  initialValues?: {
    name?: string;
    domain?: string;
    level?: number;
    description?: string;
    recallCost?: number;
    isCursed?: boolean;
    curseText?: string;
    isLinkedCurse?: boolean;
  };
  /** Label override for the submit button (defaults to "Create Domain Card"). */
  submitLabel?: string;
}

// ─── Styling constants ────────────────────────────────────────────────────────

const INPUT_CLS =
  "w-full rounded-lg border border-slate-700/60 bg-slate-900/60 px-3 py-2 text-sm text-[#f7f7ff] placeholder:text-parchment-600 focus:outline-none focus:ring-2 focus:ring-coral-400/50 focus:border-coral-400/50 transition-colors";

const LABEL_CLS = "block text-sm font-medium text-parchment-500 mb-1";

const TEXTAREA_CLS = `${INPUT_CLS} resize-none`;

const BTN_SECONDARY =
  "rounded-lg border border-slate-700/60 px-4 py-2 text-sm text-parchment-500 hover:text-[#b9baa3] hover:border-slate-600 transition-colors focus:outline-none focus:ring-2 focus:ring-coral-400/50";

// ─── Level options ────────────────────────────────────────────────────────────

const LEVELS = Array.from({ length: 10 }, (_, i) => i + 1);

// ─── Component ────────────────────────────────────────────────────────────────

export function DomainCardForm({
  onSubmit,
  onPreview,
  isSubmitting = false,
  initialValues,
  submitLabel,
}: DomainCardFormProps) {
  const idPrefix = useId();

  // Fetch existing domains for the selector
  const { data: domainsData } = useDomains();
  const domainNames = useMemo(
    () => (domainsData?.domains ?? []).map((d) => d.domain).sort(),
    [domainsData]
  );

  // ── Form state ──────────────────────────────────────────────────────────
  const [name, setName] = useState(initialValues?.name ?? "");
  const [domain, setDomain] = useState(initialValues?.domain ?? "");
  const [customDomain, setCustomDomain] = useState("");
  const [level, setLevel] = useState(initialValues?.level ?? 1);
  const [description, setDescription] = useState(initialValues?.description ?? "");
  const [recallCost, setRecallCost] = useState<number | "">(initialValues?.recallCost ?? 1);
  const [isCursed, setIsCursed] = useState(initialValues?.isCursed ?? false);
  const [curseDescription, setCurseDescription] = useState(initialValues?.curseText ?? "");
  const [isLinkedCurse, setIsLinkedCurse] = useState(initialValues?.isLinkedCurse ?? false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Resolve effective domain (custom or selected)
  const effectiveDomain = domain === "__custom__" ? customDomain.trim() : domain;

  // ── Markdown assembly ───────────────────────────────────────────────────
  // Generate markdown in the format the DomainCardParser expects:
  //   <description text>
  //   ***
  //   **Curse**: <curse text>    (only if cursed)
  const assembleMarkdown = useCallback((): string => {
    const lines: string[] = [];
    if (description.trim()) {
      lines.push(description.trim());
    }
    if (isCursed && curseDescription.trim()) {
      lines.push("***");
      lines.push(`**Curse**: ${curseDescription.trim()}`);
    }
    return lines.join("\n");
  }, [description, isCursed, curseDescription]);

  const buildInput = useCallback((): HomebrewMarkdownInput => ({
    contentType: "domainCard",
    name: name.trim(),
    markdown: assembleMarkdown(),
    domain: effectiveDomain,
    level,
    isCursed,
    isLinkedCurse,
    recallCost: recallCost === "" ? level : recallCost,
  }), [name, assembleMarkdown, effectiveDomain, level, isCursed, isLinkedCurse, recallCost]);

  const triggerPreview = useCallback(() => {
    if (onPreview && name.trim()) {
      onPreview(buildInput());
    }
  }, [onPreview, name, buildInput]);

  // ── Validation ──────────────────────────────────────────────────────────
  const validate = useCallback((): boolean => {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = "Card name is required.";
    if (!effectiveDomain) errs.domain = "Domain is required.";
    if (!description.trim()) errs.description = "Ability description is required.";
    if (isCursed && !curseDescription.trim()) errs.curseDescription = "Curse description is required when card is cursed.";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }, [name, effectiveDomain, description, isCursed, curseDescription]);

  const handleSubmit = useCallback(() => {
    if (!validate()) return;
    onSubmit(buildInput());
  }, [validate, onSubmit, buildInput]);

  // Auto-update recall cost when level changes (if user hasn't overridden)
  const handleLevelChange = useCallback((newLevel: number) => {
    setLevel(newLevel);
    // Only auto-update recall cost if it matches the previous level
    setRecallCost((prev) => {
      if (prev === "" || prev === level) return newLevel;
      return prev;
    });
  }, [level]);

  const canPreview = useMemo(() => !!name.trim(), [name]);

  return (
    <div className="space-y-6">
      {/* ── Name ──────────────────────────────────────────────────────── */}
      <div>
        <label htmlFor={`${idPrefix}-name`} className={LABEL_CLS}>
          Card Name <span className="text-[#fe5f55]" aria-hidden="true">*</span>
        </label>
        <input
          id={`${idPrefix}-name`}
          type="text"
          value={name}
          onChange={(e) => { setName(e.target.value); setErrors((p) => ({ ...p, name: "" })); }}
          onBlur={triggerPreview}
          placeholder="e.g. Shadow Step"
          maxLength={80}
          required
          className={INPUT_CLS}
        />
        {errors.name && (
          <p role="alert" className="mt-1 text-xs text-[#fe5f55]">{errors.name}</p>
        )}
      </div>

      {/* ── Domain + Level row ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor={`${idPrefix}-domain`} className={LABEL_CLS}>
            Domain <span className="text-[#fe5f55]" aria-hidden="true">*</span>
          </label>
          <select
            id={`${idPrefix}-domain`}
            value={domain}
            onChange={(e) => { setDomain(e.target.value); setErrors((p) => ({ ...p, domain: "" })); }}
            onBlur={triggerPreview}
            className={INPUT_CLS}
          >
            <option value="">Select a domain...</option>
            {domainNames.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
            <option value="__custom__">Custom domain...</option>
          </select>
          {domain === "__custom__" && (
            <input
              type="text"
              value={customDomain}
              onChange={(e) => setCustomDomain(e.target.value)}
              onBlur={triggerPreview}
              placeholder="Enter custom domain name"
              className={`${INPUT_CLS} mt-2`}
            />
          )}
          {errors.domain && (
            <p role="alert" className="mt-1 text-xs text-[#fe5f55]">{errors.domain}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor={`${idPrefix}-level`} className={LABEL_CLS}>
              Level
            </label>
            <select
              id={`${idPrefix}-level`}
              value={level}
              onChange={(e) => handleLevelChange(Number(e.target.value))}
              onBlur={triggerPreview}
              className={INPUT_CLS}
            >
              {LEVELS.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor={`${idPrefix}-recall`} className={LABEL_CLS}>
              Recall Cost
            </label>
            <input
              id={`${idPrefix}-recall`}
              type="number"
              min={0}
              max={20}
              value={recallCost}
              onChange={(e) => setRecallCost(e.target.value === "" ? "" : Number(e.target.value))}
              onBlur={triggerPreview}
              placeholder={String(level)}
              className={INPUT_CLS}
            />
          </div>
        </div>
      </div>

      {/* ── Ability text ───────────────────────────────────────────────── */}
      <div>
        <label htmlFor={`${idPrefix}-desc`} className={LABEL_CLS}>
          Ability Description <span className="text-[#fe5f55]" aria-hidden="true">*</span>
        </label>
        <textarea
          id={`${idPrefix}-desc`}
          value={description}
          onChange={(e) => { setDescription(e.target.value); setErrors((p) => ({ ...p, description: "" })); }}
          onBlur={triggerPreview}
          rows={5}
          placeholder="Describe the card's ability, costs, and effects..."
          className={TEXTAREA_CLS}
        />
        {errors.description && (
          <p role="alert" className="mt-1 text-xs text-[#fe5f55]">{errors.description}</p>
        )}
      </div>

      {/* ── Curse section (progressive disclosure) ─────────────────────── */}
      <div className="space-y-3 rounded-lg border border-slate-700/40 p-4">
        <h3 className="font-serif text-lg font-semibold text-[#f7f7ff]">
          Curse Options
        </h3>

        {/* Is Cursed toggle */}
        <label className="flex items-center gap-3 cursor-pointer group">
          <input
            type="checkbox"
            checked={isCursed}
            onChange={(e) => {
              setIsCursed(e.target.checked);
              if (!e.target.checked) {
                setCurseDescription("");
                setIsLinkedCurse(false);
                setErrors((p) => ({ ...p, curseDescription: "" }));
              }
            }}
            className="
              h-4 w-4 rounded border-slate-600 bg-slate-900
              text-coral-400 focus:ring-2 focus:ring-coral-400/50
              accent-coral-400
            "
          />
          <span className="text-sm text-parchment-500 group-hover:text-[#b9baa3] transition-colors">
            This card has a curse effect
          </span>
        </label>

        {/* Curse description (revealed when isCursed) */}
        {isCursed && (
          <div className="space-y-3 animate-fade-in pl-7">
            <div>
              <label htmlFor={`${idPrefix}-curse`} className={LABEL_CLS}>
                Curse Description <span className="text-[#fe5f55]" aria-hidden="true">*</span>
              </label>
              <textarea
                id={`${idPrefix}-curse`}
                value={curseDescription}
                onChange={(e) => { setCurseDescription(e.target.value); setErrors((p) => ({ ...p, curseDescription: "" })); }}
                onBlur={triggerPreview}
                rows={3}
                placeholder="Describe the curse effect that activates..."
                className={`${TEXTAREA_CLS} border-[#fe5f55]/20 focus:ring-[#fe5f55]/30 focus:border-[#fe5f55]/30`}
              />
              {errors.curseDescription && (
                <p role="alert" className="mt-1 text-xs text-[#fe5f55]">{errors.curseDescription}</p>
              )}
            </div>

            {/* Is Linked Curse toggle */}
            <label className="flex items-center gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={isLinkedCurse}
                onChange={(e) => setIsLinkedCurse(e.target.checked)}
                className="
                  h-4 w-4 rounded border-slate-600 bg-slate-900
                  text-purple-400 focus:ring-2 focus:ring-purple-400/50
                  accent-purple-400
                "
              />
              <span className="text-sm text-parchment-500 group-hover:text-[#b9baa3] transition-colors">
                This is a linked curse (paired with another card)
              </span>
            </label>
          </div>
        )}
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
          {isSubmitting ? "Saving\u2026" : (submitLabel ?? "Create Domain Card")}
        </button>
      </div>
    </div>
  );
}
