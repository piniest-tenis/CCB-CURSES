"use client";

/**
 * src/components/character/CharacterValidationBanner.tsx
 *
 * Prominently displays validation errors that block character save.
 * Shows as a banner at the top of the character sheet when violations exist.
 * Can be dismissed; reappears when user edits a field.
 */

import React, { useState } from "react";
import { ValidationDisplay, ValidationBadge } from "./ValidationDisplay";
import type { ValidationViolation } from "@/hooks/useCharacterValidation";

interface CharacterValidationBannerProps {
  violations: ValidationViolation[];
  blockingSave: boolean;
  isDismissible?: boolean;
}

export function CharacterValidationBanner({
  violations,
  blockingSave,
  isDismissible = true,
}: CharacterValidationBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  const errors = violations.filter((v) => v.severity === "error");
  const warnings = violations.filter((v) => v.severity === "warning");

  if (violations.length === 0 || dismissed) return null;

  return (
    <div
      role="alert"
      className={`
        border-l-4 p-4 rounded-r-lg space-y-3
        ${
          blockingSave
            ? "border-l-[#fe5f55] bg-[#fe5f55]/8"
            : "border-l-[#f7b500] bg-[#f7b500]/8"
        }
      `}
    >
      {/* Header with icon and close button */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div
            className={`text-2xl shrink-0 mt-0.5 ${
              blockingSave ? "text-[#fe5f55]" : "text-[#f7b500]"
            }`}
          >
            {blockingSave ? "⚠" : "ℹ"}
          </div>
          <div className="flex-1 min-w-0">
            <h2
              className={`text-sm font-bold ${
                blockingSave ? "text-[#fe5f55]" : "text-[#f7b500]"
              }`}
            >
              {blockingSave ? "Character is invalid" : "Character has warnings"}
            </h2>
            <p className="text-xs text-[#b9baa3] mt-1 opacity-75">
              {blockingSave
                ? "Fix the errors below before you can save"
                : "Review the warnings to ensure your character meets SRD requirements"}
            </p>
          </div>
        </div>

        {isDismissible && (
          <button
            type="button"
            onClick={() => setDismissed(true)}
            aria-label="Dismiss validation banner"
            className={`
              flex-shrink-0 p-1.5 rounded transition-colors
              ${
                blockingSave
                  ? "hover:bg-[#fe5f55]/12 text-[#fe5f55]"
                  : "hover:bg-[#f7b500]/12 text-[#f7b500]"
              }
            `}
          >
            ✕
          </button>
        )}
      </div>

      {/* Violations list */}
      <ValidationDisplay violations={violations} blockingSave={blockingSave} />
    </div>
  );
}

/**
 * SaveButtonValidationIndicator
 *
 * Badge shown on the save button when there are violations.
 * Used inside the save button to indicate blocked status.
 */
export function SaveButtonValidationIndicator({
  violations,
  blockingSave,
}: {
  violations: ValidationViolation[];
  blockingSave: boolean;
}) {
  const errors = violations.filter((v) => v.severity === "error");
  const warnings = violations.filter((v) => v.severity === "warning");

  if (violations.length === 0) return null;

  return (
    <div className="flex items-center gap-1.5">
      {errors.length > 0 && (
        <ValidationBadge count={errors.length} severity="error" />
      )}
      {warnings.length > 0 && !blockingSave && (
        <ValidationBadge count={warnings.length} severity="warning" />
      )}
    </div>
  );
}
