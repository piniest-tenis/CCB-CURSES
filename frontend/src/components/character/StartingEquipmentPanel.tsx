"use client";

/**
 * StartingEquipmentPanel.tsx
 *
 * Step 5 of the character builder — Starting Equipment.
 *
 * Three sub-sections:
 *   1. Automatic items (not selectable) — every character gets these.
 *   2. Choose one consumable: Minor Health Potion OR Minor Stamina Potion.
 *   3. Choose one class item: one of the two options for the selected class.
 *
 * SRD references: page 3 (Step 5), page 58 (Equipment & Consumables).
 */

import React, { useState } from "react";
import {
  UNIVERSAL_STARTING_ITEMS,
  STARTING_CONSUMABLES,
  STARTING_GOLD,
  type SRDConsumable,
} from "@/lib/srdEquipment";
import { MarkdownContent } from "@/components/MarkdownContent";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface StartingEquipmentSelections {
  /** id of chosen consumable (e.g. "minor-health-potion") */
  consumableId: string | null;
  /** exact string of chosen class item */
  classItem: string | null;
}

interface Props {
  className: string;
  classItems: string[] | null;
  selections: StartingEquipmentSelections;
  onChange: (next: StartingEquipmentSelections) => void;
}

// ─── Consumable Detail View ───────────────────────────────────────────────────

function ConsumableDetail({
  item,
  onBack,
}: {
  item: SRDConsumable;
  onBack: () => void;
}) {
  return (
    <div className="flex flex-col h-full">
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-1.5 px-4 py-3 min-h-[44px] text-xs text-[#daa520] hover:text-[#e8b830] transition-colors shrink-0 focus:outline-none focus:ring-2 focus:ring-[#577399] focus:ring-inset rounded"
      >
        ← Back
      </button>
      <div className="flex-1 overflow-y-auto px-6 py-2 space-y-4">
        <div>
          <p className="text-xs uppercase tracking-wider text-[#b9baa3]/40 mb-1">
            Consumable · SRD p. {item.srdPage}
          </p>
          <h4 className="font-serif text-xl font-bold text-[#f7f7ff]">{item.name}</h4>
        </div>
        <div className="rounded-lg border border-slate-700/60 bg-slate-900/40 px-4 py-3">
          <MarkdownContent className="text-base text-[#b9baa3]/80 whitespace-pre-line">
            {item.fullText}
          </MarkdownContent>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function StartingEquipmentPanel({
  className,
  classItems,
  selections,
  onChange,
}: Props) {
  const [detailItem, setDetailItem] = useState<SRDConsumable | null>(null);

  // ── Detail drill-down ──
  if (detailItem) {
    return (
      <ConsumableDetail item={detailItem} onBack={() => setDetailItem(null)} />
    );
  }

  return (
    <div className="overflow-y-auto h-full px-4 sm:px-6 py-5 space-y-8">

      {/* ── Section 1: Automatic items ────────────────────────────────── */}
      <section>
        <h4 className="text-xs font-semibold uppercase tracking-wider text-[#b9baa3]/50 mb-3">
          As a new adventurer, you automatically receive:
        </h4>

        <ul className="space-y-2">
          {/* Universal gear */}
          {UNIVERSAL_STARTING_ITEMS.map((item) => (
            <li
              key={item}
              className="flex items-center gap-3 rounded-lg border border-slate-700/40 bg-slate-900/30 px-4 py-2.5 min-w-0"
            >
              <span className="text-[#577399] text-sm">✓</span>
              <span className="text-sm text-[#f7f7ff]">{item}</span>
            </li>
          ))}

          {/* Gold */}
          <li className="flex items-center gap-3 rounded-lg border border-slate-700/40 bg-slate-900/30 px-4 py-2.5 min-w-0">
            <span className="text-[#577399] text-sm">✓</span>
            <div className="flex flex-col">
              <span className="text-sm text-[#f7f7ff]">
                {STARTING_GOLD.handfuls} handful of gold
              </span>
              <span className="text-xs text-[#b9baa3]/40 mt-0.5">
                Tracked as Handfuls · Bags · Chests (SRD p. 58)
              </span>
            </div>
          </li>
        </ul>
      </section>

      {/* ── Section 2: Choose one consumable ──────────────────────────── */}
      <section>
        <h4 className="text-xs font-semibold uppercase tracking-wider text-[#b9baa3]/50 mb-3">
          Choose one of the following:
        </h4>

        <div className="space-y-2">
          {STARTING_CONSUMABLES.map((item) => {
            const isSelected = selections.consumableId === item.id;
            return (
              <div
                key={item.id}
                onClick={() => setDetailItem(item)}
                className={`
                  flex items-center rounded-lg border transition-all cursor-pointer min-w-0
                  ${isSelected
                    ? "border-[#577399] bg-[#577399]/15"
                    : "border-slate-700/60 bg-slate-900/30 hover:border-slate-600"
                  }
                `}
              >
                {/* Circular select button — padded to meet 44px touch target */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onChange({ ...selections, consumableId: item.id });
                  }}
                  className="pl-3 pr-2 py-3 flex-shrink-0 flex items-center min-h-[44px]"
                  aria-label={`Select ${item.name}`}
                >
                  <span
                    className={`
                      h-4 w-4 rounded-full border-2 flex items-center justify-center
                      ${isSelected
                        ? "border-[#577399] bg-[#577399]"
                        : "border-slate-600 hover:border-[#577399]/70"
                      }
                    `}
                  >
                    {isSelected && (
                      <span className="h-1.5 w-1.5 rounded-full bg-white" />
                    )}
                  </span>
                </button>

                {/* Row content */}
                <div className="flex-1 min-w-0 py-3 pr-3">
                  <p className="text-sm font-semibold text-[#f7f7ff] truncate">{item.name}</p>
                  <p className="text-xs text-[#b9baa3]/50 mt-0.5 truncate">{item.shortDescription}</p>
                </div>

                {/* Decorative chevron */}
                <span className="px-3 text-[#b9baa3]/30 text-lg">›</span>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Section 3: Class item ──────────────────────────────────────── */}
      <section>
        <h4 className="text-xs font-semibold uppercase tracking-wider text-[#b9baa3]/50 mb-1">
          And one of your class items
        </h4>
        <p className="text-xs text-[#b9baa3]/40 mb-3">
          From your {className} class guide:
        </p>

        {classItems ? (
          <div className="space-y-2">
            {classItems.map((item) => {
              const isSelected = selections.classItem === item;
              return (
                <button
                  key={item}
                  type="button"
                  onClick={() => onChange({ ...selections, classItem: item })}
                  className={`
                    w-full flex items-center gap-3 px-4 py-3 min-h-[44px] rounded-lg border text-left transition-all min-w-0
                    ${isSelected
                      ? "border-[#577399] bg-[#577399]/15"
                      : "border-slate-700/60 bg-slate-900/30 hover:border-slate-600"
                    }
                  `}
                >
                  <span
                    className={`
                      h-4 w-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center
                      ${isSelected
                        ? "border-[#577399] bg-[#577399]"
                        : "border-slate-600"
                      }
                    `}
                  >
                    {isSelected && (
                      <span className="h-1.5 w-1.5 rounded-full bg-white" />
                    )}
                  </span>
                  <p className="text-sm font-semibold text-[#f7f7ff] min-w-0 truncate">{item}</p>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="rounded-lg border border-slate-700/40 bg-slate-900/30 px-4 py-3">
            <p className="text-sm text-[#b9baa3]/40 italic">
              No class items found for this class.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
