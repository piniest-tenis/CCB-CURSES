"use client";

/**
 * src/components/adversary/AdversaryCard.tsx
 *
 * Self-contained, scannable stat block card for the adversary catalog.
 * Shows all vital stats at a glance: tier, type, difficulty, HP, stress,
 * attack info, damage thresholds, and collapsible features.
 */

import React, { useState, useCallback } from "react";
import type { Adversary } from "@/types/adversary";
import { TierBadge } from "./TierBadge";
import { TypeBadge } from "./TypeBadge";
import { DifficultyDiamond } from "./DifficultyDiamond";

interface AdversaryCardProps {
  adversary: Adversary;
  onAddToEncounter?: (adversary: Adversary) => void;
  onEdit?: (adversary: Adversary) => void;
  onDelete?: (adversaryId: string) => void;
}

export function AdversaryCard({
  adversary,
  onAddToEncounter,
  onEdit,
  onDelete,
}: AdversaryCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [addedFeedback, setAddedFeedback] = useState(false);

  const handleAdd = useCallback(() => {
    onAddToEncounter?.(adversary);
    setAddedFeedback(true);
    setTimeout(() => setAddedFeedback(false), 1200);
  }, [adversary, onAddToEncounter]);

  return (
    <article
      className="
        group flex flex-col rounded-xl
        border border-burgundy-900/40 bg-slate-900/80
        shadow-card hover:shadow-card-fantasy-hover
        hover:border-[#577399]/50
        transition-all duration-200
        overflow-hidden
      "
    >
      {/* Header: Tier badge + Name + Difficulty */}
      <div className="flex items-start gap-3 p-4 pb-0">
        <TierBadge tier={adversary.tier} />

        <div className="flex-1 min-w-0">
          <h3 className="font-serif text-base font-semibold text-[#f7f7ff] leading-tight">
            {adversary.name}
          </h3>
          <div className="mt-1">
            <TypeBadge type={adversary.type} />
          </div>
        </div>

        <DifficultyDiamond difficulty={adversary.difficulty} />
      </div>

      {/* Description */}
      {adversary.description && (
        <p className="px-4 pt-2 text-sm text-[#b9baa3]/70 leading-relaxed line-clamp-2">
          {adversary.description}
        </p>
      )}

      {/* Divider */}
      <div className="mx-4 my-3 border-t border-slate-800/60" />

      {/* Stats row — HP, Stress, Attack, Damage */}
      <div className="px-4 grid grid-cols-2 sm:grid-cols-4 gap-2">
        {/* HP */}
        <div className="flex flex-col items-center">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#fe5f55]/70">
            HP
          </span>
          <span className="text-lg font-bold font-serif text-[#f7f7ff]">
            {adversary.hp}
          </span>
        </div>
        {/* Stress */}
        <div className="flex flex-col items-center">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#577399]/70">
            Stress
          </span>
          <span className="text-lg font-bold font-serif text-[#f7f7ff]">
            {adversary.stress}
          </span>
        </div>
        {/* Attack */}
        <div className="flex flex-col items-center">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#b9baa3]/50">
            Atk
          </span>
          <span className="text-lg font-bold font-serif text-[#f7f7ff]">
            +{adversary.attackModifier}
          </span>
        </div>
        {/* Damage */}
        <div className="flex flex-col items-center">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#b9baa3]/50">
            Dmg
          </span>
          <span className="font-mono text-xs font-medium text-parchment-400 text-center leading-tight">
            {adversary.attackDamage.split(" ")[0]}
          </span>
          <span className="text-[10px] text-[#b9baa3]/40">
            {adversary.attackRange}
          </span>
        </div>
      </div>

      {/* Thresholds */}
      <div className="px-4 mt-2 flex items-center justify-center gap-2 text-[11px]">
        {adversary.damageThresholds.major !== null ? (
          <>
            <span className="text-[#DAA520]">
              {adversary.damageThresholds.major}{" "}
              <span className="text-[#b9baa3]/40">major</span>
            </span>
            <span className="text-[#b9baa3]/20">·</span>
            <span className="text-[#fe5f55]">
              {adversary.damageThresholds.severe}{" "}
              <span className="text-[#b9baa3]/40">severe</span>
            </span>
          </>
        ) : (
          <span className="text-[#b9baa3]/40 italic">No thresholds (Minion)</span>
        )}
      </div>

      {/* Features (collapsible) */}
      {adversary.features.length > 0 && (
        <div className="px-4 mt-3">
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
            className="
              flex items-center gap-1.5 w-full text-left
              text-xs font-semibold text-[#577399] hover:text-[#f7f7ff]
              transition-colors
            "
          >
            <svg
              className={`h-3 w-3 transition-transform duration-200 ${
                expanded ? "rotate-90" : ""
              }`}
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <path d="M6 4l4 4-4 4" />
            </svg>
            {adversary.features.length} Feature
            {adversary.features.length !== 1 ? "s" : ""}
          </button>

          {expanded && (
            <div className="mt-2 space-y-2 animate-fade-in">
              {adversary.features.map((f) => (
                <div
                  key={f.name}
                  className="rounded border border-slate-800/60 bg-slate-950/40 px-3 py-2"
                >
                  <p className="text-xs font-medium text-[#f7f7ff]">{f.name}</p>
                  <p className="mt-0.5 text-xs text-[#b9baa3]/70 leading-relaxed">
                    {f.description}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Actions footer */}
      <div className="mt-auto px-4 py-3 flex items-center justify-between border-t border-slate-800/40 mt-3">
        {onAddToEncounter && (
          <button
            type="button"
            onClick={handleAdd}
            disabled={addedFeedback}
            className="
              flex items-center gap-1.5 rounded-lg
              border border-[#577399]/40 bg-[#577399]/10
              px-3 py-1.5 text-xs font-semibold text-[#577399]
              hover:bg-[#577399]/20 hover:border-[#577399] hover:text-[#f7f7ff]
              disabled:opacity-60
              transition-all duration-150
              focus:outline-none focus:ring-2 focus:ring-[#577399]
            "
          >
            {addedFeedback ? (
              <>
                <span aria-hidden="true">✓</span>
                Added
              </>
            ) : (
              <>
                <span aria-hidden="true">⚔️</span>
                Add to Encounter
              </>
            )}
          </button>
        )}

        {/* Overflow menu */}
        <div className="relative ml-auto">
          <button
            type="button"
            aria-label="More options"
            aria-haspopup="true"
            aria-expanded={showMenu}
            onClick={() => setShowMenu((v) => !v)}
            className="
              rounded p-1.5 text-[#b9baa3]/40
              hover:text-[#b9baa3] hover:bg-slate-800
              transition-colors
            "
          >
            ···
          </button>

          {showMenu && (
            <div
              className="
                absolute right-0 bottom-full mb-1 z-20
                rounded-lg border border-slate-700/60 bg-slate-900
                shadow-card py-1 min-w-[120px]
                animate-fade-in
              "
            >
              {onEdit && (
                <button
                  type="button"
                  onClick={() => {
                    setShowMenu(false);
                    onEdit(adversary);
                  }}
                  className="
                    w-full text-left px-3 py-1.5 text-xs text-[#b9baa3]
                    hover:bg-slate-800 hover:text-[#f7f7ff] transition-colors
                  "
                >
                  Edit
                </button>
              )}
              {onDelete && (
                <button
                  type="button"
                  onClick={() => {
                    setShowMenu(false);
                    onDelete(adversary.adversaryId);
                  }}
                  className="
                    w-full text-left px-3 py-1.5 text-xs text-[#fe5f55]/70
                    hover:bg-[#fe5f55]/10 hover:text-[#fe5f55] transition-colors
                  "
                >
                  Delete
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
