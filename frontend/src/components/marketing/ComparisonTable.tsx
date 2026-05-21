"use client";

/**
 * src/components/marketing/ComparisonTable.tsx
 *
 * Responsive comparison table: desktop renders as a full <table>,
 * mobile renders stacked cards. Optional gold wash on a highlighted column.
 */

import React from "react";
import { RevealSection } from "./RevealSection";

interface ComparisonColumn {
  /** Column header label */
  label: string;
  /** Whether this column gets the gold highlight treatment */
  highlighted?: boolean;
}

interface ComparisonRow {
  /** Feature name */
  feature: string;
  /** Values for each column, in column order. Accepts string or boolean (renders ✓/—) */
  values: (string | boolean)[];
}

interface ComparisonTableProps {
  columns: ComparisonColumn[];
  rows: ComparisonRow[];
  className?: string;
}

function CellValue({ value }: { value: string | boolean }) {
  if (typeof value === "boolean") {
    return value ? (
      <i
        className="fa-solid fa-check text-gold-400 text-sm"
        aria-label="Included"
      />
    ) : (
      <span className="text-slate-600" aria-label="Not included">
        —
      </span>
    );
  }
  return <span>{value}</span>;
}

export function ComparisonTable({
  columns,
  rows,
  className = "",
}: ComparisonTableProps) {
  return (
    <RevealSection className={className}>
      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700/40">
              <th className="text-left py-4 pr-6 font-sans font-semibold uppercase tracking-wider text-parchment-500 text-xs">
                Feature
              </th>
              {columns.map((col) => (
                <th
                  key={col.label}
                  className={`text-center py-4 px-4 font-sans font-semibold uppercase tracking-wider text-xs ${
                    col.highlighted
                      ? "text-gold-400 bg-gold-400/5"
                      : "text-parchment-500"
                  }`}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.feature}
                className="border-b border-slate-800/30 hover:bg-slate-900/40 transition-colors"
              >
                <td className="py-3 pr-6 text-parchment-300">{row.feature}</td>
                {row.values.map((val, i) => (
                  <td
                    key={i}
                    className={`text-center py-3 px-4 text-parchment-400 ${
                      columns[i]?.highlighted ? "bg-gold-400/5" : ""
                    }`}
                  >
                    <CellValue value={val} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile stacked cards */}
      <div className="md:hidden space-y-4">
        {rows.map((row) => (
          <div
            key={row.feature}
            className="rounded-lg border border-slate-700/30 bg-slate-900/40 p-4"
          >
            <p className="font-semibold text-parchment-200 mb-3 text-sm">
              {row.feature}
            </p>
            <div className="space-y-2">
              {columns.map((col, i) => (
                <div
                  key={col.label}
                  className={`flex items-center justify-between gap-3 text-sm ${
                    col.highlighted
                      ? "bg-gold-400/5 -mx-2 px-2 py-1 rounded"
                      : ""
                  }`}
                >
                  <span
                    className={`text-xs uppercase tracking-wider ${
                      col.highlighted
                        ? "text-gold-400 font-semibold"
                        : "text-parchment-600"
                    }`}
                  >
                    {col.label}
                  </span>
                  <span className="text-parchment-400">
                    <CellValue value={row.values[i]} />
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </RevealSection>
  );
}
