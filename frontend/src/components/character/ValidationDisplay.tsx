"use client";

/**
 * src/components/character/ValidationDisplay.tsx
 *
 * Displays SRD compliance violations with color-coded severity.
 * Shows as:
 * - Inline error box (if errors exist and component is mounted)
 * - Dismissible warning callout (if warnings exist)
 * - Icon badge on "Save" button (to indicate blocking violations)
 *
 * Usage:
 *   <ValidationDisplay violations={validation.violations} blockingSave={validation.blockingSave} />
 */

import React from "react";
import type { ValidationViolation } from "@/hooks/useCharacterValidation";

interface ValidationDisplayProps {
  violations: ValidationViolation[];
  blockingSave: boolean;
  compact?: boolean; // if true, show only count; used in save button
}

const SeverityStyles = {
  error: {
    container: "border-[#fe5f55]/50 bg-[#fe5f55]/8",
    icon: "text-[#fe5f55]",
    label: "text-[#fe5f55] font-semibold",
    badge: "bg-[#fe5f55] text-[#f7f7ff]",
  },
  warning: {
    container: "border-[#f7b500]/50 bg-[#f7b500]/8",
    icon: "text-[#f7b500]",
    label: "text-[#f7b500]",
    badge: "bg-[#f7b500] text-[#0a100d]",
  },
};

/**
 * ViolationItem — renders a single violation message
 */
function ViolationItem({ violation }: { violation: ValidationViolation }) {
  const styles = SeverityStyles[violation.severity];
  const icon = violation.severity === "error" ? "⚠" : "ℹ";

  return (
    <div className={`flex gap-3 p-3 rounded border ${styles.container}`}>
      <div className={`flex-shrink-0 text-lg ${styles.icon}`}>{icon}</div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm ${styles.label}`}>
          {violation.message}
        </p>
        {violation.suggestion && (
          <p className="text-xs text-[#b9baa3] mt-1 opacity-75">
            💡 {violation.suggestion}
          </p>
        )}
        {violation.srdPage && (
          <p className="text-xs text-[#b9baa3]/50 mt-1 italic">
            SRD page {violation.srdPage}
          </p>
        )}
      </div>
    </div>
  );
}

/**
 * ValidationBadge — small badge for "Save" button
 */
export function ValidationBadge({ count, severity }: { count: number; severity: "error" | "warning" }) {
  if (count === 0) return null;

  const styles = SeverityStyles[severity];
  const icon = severity === "error" ? "⚠" : "ℹ";

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${styles.badge}`}
      title={`${count} ${severity}${count !== 1 ? "s" : ""} to fix`}
    >
      <span>{icon}</span>
      <span>{count}</span>
    </span>
  );
}

/**
 * ValidationDisplay — full error/warning display
 */
export function ValidationDisplay({
  violations,
  blockingSave,
  compact = false,
}: ValidationDisplayProps) {
  const errors = violations.filter((v) => v.severity === "error");
  const warnings = violations.filter((v) => v.severity === "warning");

  if (compact) {
    // Show badge count only
    if (errors.length === 0 && warnings.length === 0) return null;
    return (
      <div className="flex gap-2">
        {errors.length > 0 && <ValidationBadge count={errors.length} severity="error" />}
        {warnings.length > 0 && <ValidationBadge count={warnings.length} severity="warning" />}
      </div>
    );
  }

  // Full display
  if (violations.length === 0) return null;

  return (
    <div className="space-y-4">
      {/* Errors */}
      {errors.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-semibold text-[#fe5f55]">
              ⚠ {errors.length} Error{errors.length !== 1 ? "s" : ""}
            </h4>
            {blockingSave && (
              <span className="text-xs text-[#fe5f55]/70 italic">
                (Blocking save)
              </span>
            )}
          </div>
          <div className="space-y-2">
            {errors.map((v) => (
              <ViolationItem key={v.id} violation={v} />
            ))}
          </div>
        </div>
      )}

      {/* Warnings */}
      {warnings.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-semibold text-[#f7b500]">
              ℹ {warnings.length} Warning{warnings.length !== 1 ? "s" : ""}
            </h4>
          </div>
          <div className="space-y-2">
            {warnings.map((v) => (
              <ViolationItem key={v.id} violation={v} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
