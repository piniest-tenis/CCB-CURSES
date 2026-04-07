"use client";

/**
 * src/components/homebrew/FeatureFieldset.tsx
 *
 * Reusable progressive-disclosure fieldset for an optional equipment feature.
 * Used by WeaponForm and ArmorForm.
 *
 * Renders a checkbox toggle; when enabled, reveals name + description fields.
 */

import React from "react";
import { INPUT_CLS, LABEL_CLS, TEXTAREA_CLS } from "./styles";

export interface FeatureFieldsetProps {
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  name: string;
  onNameChange: (name: string) => void;
  description: string;
  onDescriptionChange: (description: string) => void;
  /** Error messages keyed by field name. */
  errors?: Record<string, string>;
  /** Id prefix for unique label htmlFor bindings. */
  idPrefix: string;
  /** Callback for preview on blur. */
  onBlur?: () => void;
}

export function FeatureFieldset({
  enabled,
  onToggle,
  name,
  onNameChange,
  description,
  onDescriptionChange,
  errors = {},
  idPrefix,
  onBlur,
}: FeatureFieldsetProps) {
  return (
    <fieldset className="space-y-3 rounded-lg border border-slate-700/40 p-4">
      <legend className="font-serif text-lg font-semibold text-[#f7f7ff] px-1">
        Special Feature
      </legend>

      {/* Toggle */}
      <label className="flex items-center gap-3 cursor-pointer group">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => {
            onToggle(e.target.checked);
            if (!e.target.checked) {
              onNameChange("");
              onDescriptionChange("");
            }
          }}
          className="
            h-4 w-4 rounded border-slate-600 bg-slate-900
            text-coral-400 focus:ring-2 focus:ring-coral-400/50
            accent-coral-400
          "
        />
        <span className="text-sm text-parchment-500 group-hover:text-[#b9baa3] transition-colors">
          This has a special feature
        </span>
      </label>

      {/* Revealed fields */}
      {enabled && (
        <div className="space-y-3 animate-fade-in pl-7">
          <div>
            <label htmlFor={`${idPrefix}-feat-name`} className={LABEL_CLS}>
              Feature Name <span className="text-[#fe5f55]" aria-hidden="true">*</span>
            </label>
            <input
              id={`${idPrefix}-feat-name`}
              type="text"
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
              onBlur={onBlur}
              placeholder="e.g. Brutal, Lightweight"
              maxLength={100}
              className={INPUT_CLS}
            />
            {errors.featureName && (
              <p role="alert" className="mt-1 text-xs text-[#fe5f55]">{errors.featureName}</p>
            )}
          </div>
          <div>
            <label htmlFor={`${idPrefix}-feat-desc`} className={LABEL_CLS}>
              Feature Description <span className="text-[#fe5f55]" aria-hidden="true">*</span>
            </label>
            <textarea
              id={`${idPrefix}-feat-desc`}
              value={description}
              onChange={(e) => onDescriptionChange(e.target.value)}
              onBlur={onBlur}
              rows={3}
              placeholder="Describe the mechanical effect of this feature..."
              className={TEXTAREA_CLS}
            />
            {errors.featureDescription && (
              <p role="alert" className="mt-1 text-xs text-[#fe5f55]">{errors.featureDescription}</p>
            )}
          </div>
        </div>
      )}
    </fieldset>
  );
}
