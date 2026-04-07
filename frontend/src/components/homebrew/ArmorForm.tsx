"use client";

/**
 * src/components/homebrew/ArmorForm.tsx
 *
 * Single-page form for creating a homebrew Armor.
 *
 * Sections:
 *   1. Identity + Defenses (name, tier, major/severe thresholds, armor score)
 *   2. Feature (progressive disclosure via FeatureFieldset)
 *
 * Submits a HomebrewEquipmentInput with contentType="armor".
 */

import React, { useCallback, useId, useMemo, useState } from "react";
import type { HomebrewEquipmentInput } from "@shared/types";
import { INPUT_CLS, LABEL_CLS, BTN_SECONDARY, BTN_PRIMARY, SOFT_WARNING_CLS } from "./styles";
import { TierSelector } from "./TierSelector";
import { FeatureFieldset } from "./FeatureFieldset";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ArmorFormProps {
  onSubmit: (input: HomebrewEquipmentInput) => void;
  onPreview?: (input: HomebrewEquipmentInput) => void;
  isSubmitting?: boolean;
  initialValues?: {
    name?: string;
    tier?: 1 | 2 | 3 | 4;
    baseThresholdMajor?: number;
    baseThresholdSevere?: number;
    baseArmorScore?: number;
    featureName?: string;
    featureDescription?: string;
  };
  submitLabel?: string;
}

// ─── Balance reference (Homebrew Kit p.23) ────────────────────────────────────

const ARMOR_BALANCE: Record<number, { majorMin: number; majorMax: number; severeMin: number; severeMax: number; armorMin: number; armorMax: number }> = {
  1: { majorMin: 3, majorMax: 5, severeMin: 7, severeMax: 10, armorMin: 0, armorMax: 2 },
  2: { majorMin: 5, majorMax: 7, severeMin: 10, severeMax: 14, armorMin: 1, armorMax: 3 },
  3: { majorMin: 7, majorMax: 9, severeMin: 14, severeMax: 18, armorMin: 2, armorMax: 4 },
  4: { majorMin: 9, majorMax: 12, severeMin: 18, severeMax: 24, armorMin: 3, armorMax: 6 },
};

// ─── Component ────────────────────────────────────────────────────────────────

export function ArmorForm({
  onSubmit,
  onPreview,
  isSubmitting = false,
  initialValues,
  submitLabel,
}: ArmorFormProps) {
  const idPrefix = useId();

  // ── Form state ──────────────────────────────────────────────────────────
  const [name, setName] = useState(initialValues?.name ?? "");
  const [tier, setTier] = useState<1 | 2 | 3 | 4>(initialValues?.tier ?? 1);
  const [major, setMajor] = useState(initialValues?.baseThresholdMajor ?? 3);
  const [severe, setSevere] = useState(initialValues?.baseThresholdSevere ?? 7);
  const [armorScore, setArmorScore] = useState(initialValues?.baseArmorScore ?? 0);
  const [hasFeature, setHasFeature] = useState(!!initialValues?.featureName);
  const [featureName, setFeatureName] = useState(initialValues?.featureName ?? "");
  const [featureDesc, setFeatureDesc] = useState(initialValues?.featureDescription ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});

  // ── Build input ─────────────────────────────────────────────────────────
  const buildInput = useCallback((): HomebrewEquipmentInput => ({
    contentType: "armor",
    name: name.trim(),
    tier,
    baseThresholdMajor: major,
    baseThresholdSevere: severe,
    baseArmorScore: armorScore,
    ...(hasFeature && featureName.trim() ? {
      featureName: featureName.trim(),
      featureDescription: featureDesc.trim(),
    } : {}),
  }), [name, tier, major, severe, armorScore, hasFeature, featureName, featureDesc]);

  const triggerPreview = useCallback(() => {
    if (onPreview && name.trim()) {
      onPreview(buildInput());
    }
  }, [onPreview, name, buildInput]);

  // ── Validation ──────────────────────────────────────────────────────────
  const validate = useCallback((): boolean => {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = "Armor name is required.";
    if (severe <= major) errs.severe = "Severe threshold must be greater than Major.";
    if (hasFeature && !featureName.trim()) errs.featureName = "Feature name is required when enabled.";
    if (hasFeature && !featureDesc.trim()) errs.featureDescription = "Feature description is required when enabled.";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }, [name, major, severe, hasFeature, featureName, featureDesc]);

  const handleSubmit = useCallback(() => {
    if (!validate()) return;
    onSubmit(buildInput());
  }, [validate, onSubmit, buildInput]);

  // ── Auto-suggest defaults when tier changes ─────────────────────────────
  const handleTierChange = useCallback((newTier: 1 | 2 | 3 | 4) => {
    const range = ARMOR_BALANCE[newTier];
    // Only auto-adjust if current values matched the old tier's defaults
    const oldRange = ARMOR_BALANCE[tier];
    if (major === oldRange.majorMin) setMajor(range.majorMin);
    if (severe === oldRange.severeMin) setSevere(range.severeMin);
    if (armorScore === oldRange.armorMin) setArmorScore(range.armorMin);
    setTier(newTier);
  }, [tier, major, severe, armorScore]);

  const canPreview = useMemo(() => !!name.trim(), [name]);

  // ── Balance warnings ────────────────────────────────────────────────────
  const warnings = useMemo(() => {
    const w: string[] = [];
    const range = ARMOR_BALANCE[tier];
    if (major < range.majorMin || major > range.majorMax) {
      w.push(`Tier ${tier} armor typically has Major threshold ${range.majorMin}–${range.majorMax}. Your value: ${major}.`);
    }
    if (severe < range.severeMin || severe > range.severeMax) {
      w.push(`Tier ${tier} armor typically has Severe threshold ${range.severeMin}–${range.severeMax}. Your value: ${severe}.`);
    }
    if (armorScore < range.armorMin || armorScore > range.armorMax) {
      w.push(`Tier ${tier} armor typically has Armor Score ${range.armorMin}–${range.armorMax}. Your value: ${armorScore}.`);
    }
    return w;
  }, [tier, major, severe, armorScore]);

  return (
    <div className="space-y-6">
      {/* ── Name ──────────────────────────────────────────────────────── */}
      <div>
        <label htmlFor={`${idPrefix}-name`} className={LABEL_CLS}>
          Armor Name <span className="text-[#fe5f55]" aria-hidden="true">*</span>
        </label>
        <input
          id={`${idPrefix}-name`}
          type="text"
          value={name}
          onChange={(e) => { setName(e.target.value); setErrors((p) => ({ ...p, name: "" })); }}
          onBlur={triggerPreview}
          placeholder="e.g. Chainmail of Resolve"
          maxLength={100}
          required
          className={INPUT_CLS}
        />
        {errors.name && (
          <p role="alert" className="mt-1 text-xs text-[#fe5f55]">{errors.name}</p>
        )}
      </div>

      {/* ── Tier ──────────────────────────────────────────────────────── */}
      <div>
        <label className={LABEL_CLS}>Tier</label>
        <TierSelector value={tier} onChange={handleTierChange} id={`${idPrefix}-tier`} />
      </div>

      {/* ── Defenses section ───────────────────────────────────────────── */}
      <fieldset className="space-y-4 rounded-lg border border-slate-700/40 p-4">
        <legend className="font-serif text-lg font-semibold text-[#f7f7ff] px-1">
          Defenses
        </legend>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor={`${idPrefix}-major`} className={LABEL_CLS}>
              Major Threshold
            </label>
            <input
              id={`${idPrefix}-major`}
              type="number"
              min={1}
              max={30}
              value={major}
              onChange={(e) => { setMajor(Number(e.target.value)); setErrors((p) => ({ ...p, severe: "" })); }}
              onBlur={triggerPreview}
              className={INPUT_CLS}
            />
          </div>
          <div>
            <label htmlFor={`${idPrefix}-severe`} className={LABEL_CLS}>
              Severe Threshold
            </label>
            <input
              id={`${idPrefix}-severe`}
              type="number"
              min={1}
              max={50}
              value={severe}
              onChange={(e) => { setSevere(Number(e.target.value)); setErrors((p) => ({ ...p, severe: "" })); }}
              onBlur={triggerPreview}
              className={INPUT_CLS}
            />
            {errors.severe && (
              <p role="alert" className="mt-1 text-xs text-[#fe5f55]">{errors.severe}</p>
            )}
          </div>
          <div>
            <label htmlFor={`${idPrefix}-armor`} className={LABEL_CLS}>
              Armor Score
            </label>
            <input
              id={`${idPrefix}-armor`}
              type="number"
              min={0}
              max={10}
              value={armorScore}
              onChange={(e) => setArmorScore(Number(e.target.value))}
              onBlur={triggerPreview}
              className={INPUT_CLS}
            />
          </div>
        </div>
      </fieldset>

      {/* ── Feature (progressive disclosure) ───────────────────────────── */}
      <FeatureFieldset
        enabled={hasFeature}
        onToggle={setHasFeature}
        name={featureName}
        onNameChange={setFeatureName}
        description={featureDesc}
        onDescriptionChange={setFeatureDesc}
        errors={errors}
        idPrefix={idPrefix}
        onBlur={triggerPreview}
      />

      {/* ── Balance warnings ───────────────────────────────────────────── */}
      {warnings.length > 0 && (
        <div className={SOFT_WARNING_CLS}>
          <p className="font-semibold mb-1">Balance Notes</p>
          <ul className="list-disc pl-4 space-y-0.5">
            {warnings.map((w, i) => <li key={i}>{w}</li>)}
          </ul>
        </div>
      )}

      {/* ── Actions ────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3 border-t border-slate-700/40 pt-5">
        <button
          type="button"
          onClick={triggerPreview}
          disabled={!canPreview}
          className={`${BTN_SECONDARY} disabled:opacity-30 disabled:cursor-not-allowed`}
        >
          Preview
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isSubmitting}
          className={BTN_PRIMARY}
        >
          {isSubmitting ? "Saving\u2026" : (submitLabel ?? "Create Armor")}
        </button>
      </div>
    </div>
  );
}
