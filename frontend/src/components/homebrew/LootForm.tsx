"use client";

/**
 * src/components/homebrew/LootForm.tsx
 *
 * Shared single-page form for creating a homebrew Item (reusable) or
 * Consumable (limited-use). A segmented toggle at the top lets the user
 * switch between the two types. Pre-selected based on the route.
 *
 * Both /homebrew/item/new and /homebrew/consumable/new render this
 * component with the appropriate defaultType.
 */

import React, { useCallback, useId, useMemo, useState } from "react";
import type { HomebrewEquipmentInput, LootRarity } from "@shared/types";
import { INPUT_CLS, LABEL_CLS, TEXTAREA_CLS, BTN_SECONDARY, BTN_PRIMARY, SOFT_WARNING_CLS } from "./styles";
import { RaritySelector } from "./RaritySelector";

// ─── Types ────────────────────────────────────────────────────────────────────

export type LootType = "item" | "consumable";

export interface LootFormProps {
  /** Called when the user submits the form with assembled equipment input. */
  onSubmit: (input: HomebrewEquipmentInput) => void;
  /** Called whenever form data changes — passes assembled input for preview. */
  onPreview?: (input: HomebrewEquipmentInput) => void;
  /** Whether the form is currently submitting. */
  isSubmitting?: boolean;
  /** Which loot type to default to. */
  defaultType?: LootType;
  /** Pre-populated values for edit mode. */
  initialValues?: {
    name?: string;
    rarity?: LootRarity;
    effect?: string;
    uses?: number;
    lootType?: LootType;
  };
  /** Label override for the submit button. */
  submitLabel?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function LootForm({
  onSubmit,
  onPreview,
  isSubmitting = false,
  defaultType = "item",
  initialValues,
  submitLabel,
}: LootFormProps) {
  const idPrefix = useId();

  // ── Form state ──────────────────────────────────────────────────────────
  const [lootType, setLootType] = useState<LootType>(initialValues?.lootType ?? defaultType);
  const [name, setName] = useState(initialValues?.name ?? "");
  const [rarity, setRarity] = useState<LootRarity>(initialValues?.rarity ?? "common");
  const [effect, setEffect] = useState(initialValues?.effect ?? "");
  const [uses, setUses] = useState(initialValues?.uses ?? 1);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // ── Build input ─────────────────────────────────────────────────────────
  const buildInput = useCallback((): HomebrewEquipmentInput => {
    const base: HomebrewEquipmentInput = {
      contentType: lootType,
      name: name.trim(),
      rarity,
      effect: effect.trim(),
    };
    if (lootType === "consumable") {
      base.uses = uses;
    }
    return base;
  }, [lootType, name, rarity, effect, uses]);

  const triggerPreview = useCallback(() => {
    if (onPreview && name.trim()) {
      onPreview(buildInput());
    }
  }, [onPreview, name, buildInput]);

  // ── Validation ──────────────────────────────────────────────────────────
  const validate = useCallback((): boolean => {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = "Name is required.";
    if (!effect.trim()) errs.effect = "Effect description is required.";
    if (lootType === "consumable" && (uses < 1 || uses > 10)) {
      errs.uses = "Uses must be between 1 and 10.";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }, [name, effect, lootType, uses]);

  const handleSubmit = useCallback(() => {
    if (!validate()) return;
    onSubmit(buildInput());
  }, [validate, onSubmit, buildInput]);

  const canPreview = useMemo(() => !!name.trim(), [name]);

  // ── Derive label ────────────────────────────────────────────────────────
  const typeLabel = lootType === "item" ? "Item" : "Consumable";
  const defaultSubmitLabel = submitLabel ?? `Create ${typeLabel}`;

  return (
    <div className="space-y-6">
      {/* ── Type toggle ──────────────────────────────────────────────── */}
      <div>
        <label className={LABEL_CLS}>Type</label>
        <div className="inline-flex rounded-lg border border-slate-700/60 overflow-hidden">
          {(["item", "consumable"] as LootType[]).map((t) => {
            const isActive = lootType === t;
            return (
              <button
                key={t}
                type="button"
                role="radio"
                aria-checked={isActive}
                onClick={() => setLootType(t)}
                className={`
                  px-5 py-2 text-sm font-semibold transition-colors
                  focus:outline-none focus:ring-2 focus:ring-coral-400/50 focus:z-10
                  ${
                    isActive
                      ? "bg-coral-400/20 text-coral-400"
                      : "bg-slate-900/60 text-parchment-500 hover:bg-slate-800/60 hover:text-[#b9baa3]"
                  }
                  ${t === "consumable" ? "border-l border-slate-700/60" : ""}
                `}
              >
                {t === "item" ? "Reusable Item" : "Consumable"}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Name ──────────────────────────────────────────────────────── */}
      <div>
        <label htmlFor={`${idPrefix}-name`} className={LABEL_CLS}>
          {typeLabel} Name <span className="text-[#fe5f55]" aria-hidden="true">*</span>
        </label>
        <input
          id={`${idPrefix}-name`}
          type="text"
          value={name}
          onChange={(e) => { setName(e.target.value); setErrors((p) => ({ ...p, name: "" })); }}
          onBlur={triggerPreview}
          placeholder={lootType === "item" ? "e.g. Cloak of Shadows" : "e.g. Minor Health Potion"}
          maxLength={100}
          required
          className={INPUT_CLS}
        />
        {errors.name && (
          <p role="alert" className="mt-1 text-xs text-[#fe5f55]">{errors.name}</p>
        )}
      </div>

      {/* ── Rarity + Uses row ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor={`${idPrefix}-rarity`} className={LABEL_CLS}>
            Rarity
          </label>
          <RaritySelector
            id={`${idPrefix}-rarity`}
            value={rarity}
            onChange={(r) => { setRarity(r); triggerPreview(); }}
          />
        </div>

        {lootType === "consumable" && (
          <div>
            <label htmlFor={`${idPrefix}-uses`} className={LABEL_CLS}>
              Uses
            </label>
            <input
              id={`${idPrefix}-uses`}
              type="number"
              min={1}
              max={10}
              value={uses}
              onChange={(e) => { setUses(Number(e.target.value)); setErrors((p) => ({ ...p, uses: "" })); }}
              onBlur={triggerPreview}
              className={INPUT_CLS}
            />
            {errors.uses && (
              <p role="alert" className="mt-1 text-xs text-[#fe5f55]">{errors.uses}</p>
            )}
          </div>
        )}
      </div>

      {/* ── Effect description ─────────────────────────────────────────── */}
      <div>
        <label htmlFor={`${idPrefix}-effect`} className={LABEL_CLS}>
          Effect <span className="text-[#fe5f55]" aria-hidden="true">*</span>
        </label>
        <textarea
          id={`${idPrefix}-effect`}
          value={effect}
          onChange={(e) => { setEffect(e.target.value); setErrors((p) => ({ ...p, effect: "" })); }}
          onBlur={triggerPreview}
          rows={5}
          placeholder="Describe what this does when used or activated..."
          className={TEXTAREA_CLS}
        />
        {errors.effect && (
          <p role="alert" className="mt-1 text-xs text-[#fe5f55]">{errors.effect}</p>
        )}
      </div>

      {/* ── Balance guardrails (soft warnings) ──────────────────────── */}
      {(() => {
        const warnings: string[] = [];
        if (effect.trim() && effect.trim().length < 20) {
          warnings.push("Effect description is very short. Consider adding more detail for clarity.");
        }
        if (lootType === "consumable" && uses > 3) {
          warnings.push(`${uses} uses is unusually high for a consumable. Most have 1–3 uses.`);
        }
        if (rarity === "legendary" && effect.trim().length < 50) {
          warnings.push("Legendary items typically have substantial, detailed effects.");
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
          {isSubmitting ? "Saving\u2026" : defaultSubmitLabel}
        </button>
      </div>
    </div>
  );
}
