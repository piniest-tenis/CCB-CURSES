"use client";

/**
 * src/components/homebrew/WeaponForm.tsx
 *
 * Single-page form for creating a homebrew Weapon.
 *
 * Sections:
 *   1. Identity (name)
 *   2. Combat Profile (tier, category, trait, range, damage die, damage type, burden)
 *   3. Feature (progressive disclosure via FeatureFieldset)
 *
 * Submits a HomebrewEquipmentInput with contentType="weapon".
 */

import React, { useCallback, useId, useMemo, useState } from "react";
import type { HomebrewEquipmentInput, WeaponCategory, DamageType, WeaponRange } from "@shared/types";
import { INPUT_CLS, LABEL_CLS, BTN_SECONDARY, BTN_PRIMARY, SOFT_WARNING_CLS } from "./styles";
import { TierSelector } from "./TierSelector";
import { FeatureFieldset } from "./FeatureFieldset";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface WeaponFormProps {
  onSubmit: (input: HomebrewEquipmentInput) => void;
  onPreview?: (input: HomebrewEquipmentInput) => void;
  isSubmitting?: boolean;
  initialValues?: {
    name?: string;
    tier?: 1 | 2 | 3 | 4;
    category?: WeaponCategory;
    trait?: string;
    range?: WeaponRange;
    damageDie?: string;
    damageType?: DamageType;
    burden?: number;
    featureName?: string;
    featureDescription?: string;
  };
  submitLabel?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TRAIT_OPTIONS = [
  "Agility", "Strength", "Finesse", "Instinct", "Presence", "Knowledge",
];

const RANGE_OPTIONS: { value: WeaponRange; label: string }[] = [
  { value: "melee",      label: "Melee" },
  { value: "very close", label: "Very Close" },
  { value: "close",      label: "Close" },
  { value: "ranged",     label: "Ranged" },
  { value: "far",        label: "Far" },
  { value: "very far",   label: "Very Far" },
];

const DIE_OPTIONS = ["d4", "d6", "d8", "d10", "d12", "2d6", "2d8", "2d10", "2d12"];

/** Damage die scaling reference per tier (Homebrew Kit p.22). */
const WEAPON_DAMAGE_SCALING: Record<number, string[]> = {
  1: ["d6", "d8"],
  2: ["d8", "d10", "2d6"],
  3: ["d10", "d12", "2d8"],
  4: ["d12", "2d10", "2d12"],
};

// ─── Component ────────────────────────────────────────────────────────────────

export function WeaponForm({
  onSubmit,
  onPreview,
  isSubmitting = false,
  initialValues,
  submitLabel,
}: WeaponFormProps) {
  const idPrefix = useId();

  // ── Form state ──────────────────────────────────────────────────────────
  const [name, setName] = useState(initialValues?.name ?? "");
  const [tier, setTier] = useState<1 | 2 | 3 | 4>(initialValues?.tier ?? 1);
  const [category, setCategory] = useState<WeaponCategory>(initialValues?.category ?? "primary");
  const [trait, setTrait] = useState(initialValues?.trait ?? "Strength");
  const [range, setRange] = useState<WeaponRange>(initialValues?.range ?? "melee");
  const [damageDie, setDamageDie] = useState(initialValues?.damageDie ?? "d6");
  const [damageType, setDamageType] = useState<DamageType>(initialValues?.damageType ?? "physical");
  const [burden, setBurden] = useState(initialValues?.burden ?? 1);
  const [hasFeature, setHasFeature] = useState(!!initialValues?.featureName);
  const [featureName, setFeatureName] = useState(initialValues?.featureName ?? "");
  const [featureDesc, setFeatureDesc] = useState(initialValues?.featureDescription ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});

  // ── Build input ─────────────────────────────────────────────────────────
  const buildInput = useCallback((): HomebrewEquipmentInput => ({
    contentType: "weapon",
    name: name.trim(),
    tier,
    category,
    trait: trait.toLowerCase(),
    range,
    damageDie,
    damageType,
    burden: category === "secondary" ? 0 : burden,
    ...(hasFeature && featureName.trim() ? {
      featureName: featureName.trim(),
      featureDescription: featureDesc.trim(),
    } : {}),
  }), [name, tier, category, trait, range, damageDie, damageType, burden, hasFeature, featureName, featureDesc]);

  const triggerPreview = useCallback(() => {
    if (onPreview && name.trim()) {
      onPreview(buildInput());
    }
  }, [onPreview, name, buildInput]);

  // ── Validation ──────────────────────────────────────────────────────────
  const validate = useCallback((): boolean => {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = "Weapon name is required.";
    if (!trait) errs.trait = "Attack trait is required.";
    if (category === "primary" && burden < 1) errs.burden = "Primary weapons must have burden >= 1.";
    if (hasFeature && !featureName.trim()) errs.featureName = "Feature name is required when enabled.";
    if (hasFeature && !featureDesc.trim()) errs.featureDescription = "Feature description is required when enabled.";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }, [name, trait, category, burden, hasFeature, featureName, featureDesc]);

  const handleSubmit = useCallback(() => {
    if (!validate()) return;
    onSubmit(buildInput());
  }, [validate, onSubmit, buildInput]);

  // Auto-enforce: secondary weapons have burden 0
  const handleCategoryChange = useCallback((newCat: WeaponCategory) => {
    setCategory(newCat);
    if (newCat === "secondary") {
      setBurden(0);
    } else if (burden === 0) {
      setBurden(1);
    }
  }, [burden]);

  const canPreview = useMemo(() => !!name.trim(), [name]);

  // ── Balance warnings ────────────────────────────────────────────────────
  const warnings = useMemo(() => {
    const w: string[] = [];
    const expected = WEAPON_DAMAGE_SCALING[tier];
    if (expected && !expected.includes(damageDie)) {
      w.push(`Tier ${tier} weapons typically use ${expected.join(" or ")}. Your choice of ${damageDie} may be unbalanced.`);
    }
    if (category === "primary" && burden > 2) {
      w.push(`Burden ${burden} is very high. Most primary weapons have burden 1–2.`);
    }
    return w;
  }, [tier, damageDie, category, burden]);

  return (
    <div className="space-y-6">
      {/* ── Name ──────────────────────────────────────────────────────── */}
      <div>
        <label htmlFor={`${idPrefix}-name`} className={LABEL_CLS}>
          Weapon Name <span className="text-[#fe5f55]" aria-hidden="true">*</span>
        </label>
        <input
          id={`${idPrefix}-name`}
          type="text"
          value={name}
          onChange={(e) => { setName(e.target.value); setErrors((p) => ({ ...p, name: "" })); }}
          onBlur={triggerPreview}
          placeholder="e.g. Flamebrand Greatsword"
          maxLength={100}
          required
          className={INPUT_CLS}
        />
        {errors.name && (
          <p role="alert" className="mt-1 text-xs text-[#fe5f55]">{errors.name}</p>
        )}
      </div>

      {/* ── Combat Profile section ─────────────────────────────────────── */}
      <fieldset className="space-y-4 rounded-lg border border-slate-700/40 p-4">
        <legend className="font-serif text-lg font-semibold text-[#f7f7ff] px-1">
          Combat Profile
        </legend>

        {/* Tier */}
        <div>
          <label className={LABEL_CLS}>Tier</label>
          <TierSelector value={tier} onChange={setTier} id={`${idPrefix}-tier`} />
        </div>

        {/* Category — radio buttons */}
        <div>
          <label className={LABEL_CLS}>Category</label>
          <div className="flex items-center gap-6 mt-1">
            {(["primary", "secondary"] as WeaponCategory[]).map((cat) => (
              <label key={cat} className="flex items-center gap-2 cursor-pointer group">
                <input
                  type="radio"
                  name={`${idPrefix}-category`}
                  checked={category === cat}
                  onChange={() => handleCategoryChange(cat)}
                  className="h-4 w-4 border-slate-600 bg-slate-900 text-coral-400 focus:ring-2 focus:ring-coral-400/50 accent-coral-400"
                />
                <span className="text-sm text-parchment-500 group-hover:text-[#b9baa3] transition-colors capitalize">
                  {cat}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Trait + Range row */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor={`${idPrefix}-trait`} className={LABEL_CLS}>
              Attack Trait <span className="text-[#fe5f55]" aria-hidden="true">*</span>
            </label>
            <select
              id={`${idPrefix}-trait`}
              value={trait}
              onChange={(e) => { setTrait(e.target.value); setErrors((p) => ({ ...p, trait: "" })); }}
              onBlur={triggerPreview}
              className={INPUT_CLS}
            >
              {TRAIT_OPTIONS.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            {errors.trait && (
              <p role="alert" className="mt-1 text-xs text-[#fe5f55]">{errors.trait}</p>
            )}
          </div>
          <div>
            <label htmlFor={`${idPrefix}-range`} className={LABEL_CLS}>
              Range
            </label>
            <select
              id={`${idPrefix}-range`}
              value={range}
              onChange={(e) => setRange(e.target.value as WeaponRange)}
              onBlur={triggerPreview}
              className={INPUT_CLS}
            >
              {RANGE_OPTIONS.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Damage die + Damage type + Burden row */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor={`${idPrefix}-die`} className={LABEL_CLS}>
              Damage Die
            </label>
            <select
              id={`${idPrefix}-die`}
              value={damageDie}
              onChange={(e) => setDamageDie(e.target.value)}
              onBlur={triggerPreview}
              className={INPUT_CLS}
            >
              {DIE_OPTIONS.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor={`${idPrefix}-dmgtype`} className={LABEL_CLS}>
              Damage Type
            </label>
            <select
              id={`${idPrefix}-dmgtype`}
              value={damageType}
              onChange={(e) => setDamageType(e.target.value as DamageType)}
              onBlur={triggerPreview}
              className={INPUT_CLS}
            >
              <option value="physical">Physical</option>
              <option value="magic">Magic</option>
            </select>
          </div>
          <div>
            <label htmlFor={`${idPrefix}-burden`} className={LABEL_CLS}>
              Burden
            </label>
            <input
              id={`${idPrefix}-burden`}
              type="number"
              min={category === "secondary" ? 0 : 1}
              max={3}
              value={category === "secondary" ? 0 : burden}
              disabled={category === "secondary"}
              onChange={(e) => { setBurden(Number(e.target.value)); setErrors((p) => ({ ...p, burden: "" })); }}
              onBlur={triggerPreview}
              className={`${INPUT_CLS} ${category === "secondary" ? "opacity-50 cursor-not-allowed" : ""}`}
            />
            {category === "secondary" && (
              <p className="mt-1 text-xs text-parchment-600">Secondary weapons always have burden 0.</p>
            )}
            {errors.burden && (
              <p role="alert" className="mt-1 text-xs text-[#fe5f55]">{errors.burden}</p>
            )}
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
          {isSubmitting ? "Saving\u2026" : (submitLabel ?? "Create Weapon")}
        </button>
      </div>
    </div>
  );
}
