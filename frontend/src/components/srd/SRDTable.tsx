"use client";

/**
 * src/components/srd/SRDTable.tsx
 *
 * Renders raw HTML `<table>` content from SRD equipment chunks as styled,
 * accessible, dark-themed tables with a mobile card-stack layout.
 *
 * Features:
 *   - Parses raw HTML table markup into structured header + row data
 *   - Desktop/tablet: full scrollable HTML table with sticky NAME column
 *   - Mobile: card-stack layout with inline field labels
 *   - Column-specific formatting (die icon for DAMAGE, pill for BURDEN, etc.)
 *   - Row-click interaction with optional onRowSelect callback
 *   - Full ARIA roles for accessibility; keyboard navigable rows
 *   - Memoised parsing to avoid repeated regex work on re-render
 */

import React, { useMemo, useCallback } from "react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface SRDTableProps {
  /** Raw HTML string containing `<table>` markup from SRD chunk content. */
  html: string;
  /** Determines column-specific formatting heuristics. */
  tableType: "weapon" | "armor" | "loot";
  /** Tier number for the ARIA label (e.g. "Tier 1 Primary Weapons"). */
  tier?: number;
  /** Category label such as "Primary Weapons", "Secondary Weapons", etc. */
  category?: string;
  /** Called when a row is selected; receives a slugified sub-entry ID. */
  onRowSelect?: (subEntryId: string) => void;
}

// ─── Parsed structures ───────────────────────────────────────────────────────

interface ParsedTable {
  headers: string[];
  rows: string[][];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Converts a name string into a URL-safe slug for sub-entry IDs.
 *
 * @example slugify("Longbow (Ranged)") → "longbow-ranged"
 */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Normalise header text by collapsing newlines / whitespace into a single
 * space. Handles cases like "BASE\nTHRESHOLDS" → "BASE THRESHOLDS".
 */
function normalizeHeader(raw: string): string {
  return raw.replace(/\s+/g, " ").trim();
}

/**
 * Extracts the inner text of an HTML element string, stripping all tags.
 */
function innerText(html: string): string {
  return html.replace(/<[^>]*>/g, "").trim();
}

/**
 * Parses raw HTML table markup into a structured { headers, rows } object.
 *
 * 1. Extracts all `<tr>` elements via regex
 * 2. First `<tr>` → header row (using <th> or <td> cells)
 * 3. Remaining `<tr>` elements → data rows
 */
function parseHtmlTable(html: string): ParsedTable {
  // Extract all <tr>…</tr> blocks (dotAll via [\s\S])
  const trRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  const trMatches: string[] = [];
  let trMatch: RegExpExecArray | null;
  while ((trMatch = trRegex.exec(html)) !== null) {
    trMatches.push(trMatch[1]);
  }

  if (trMatches.length === 0) {
    return { headers: [], rows: [] };
  }

  // Cell regex — matches <th> or <td>
  const cellRegex = /<(?:th|td)[^>]*>([\s\S]*?)<\/(?:th|td)>/gi;

  // Parse header row (first <tr>)
  const headerCells: string[] = [];
  let cellMatch: RegExpExecArray | null;
  while ((cellMatch = cellRegex.exec(trMatches[0])) !== null) {
    headerCells.push(normalizeHeader(innerText(cellMatch[1])));
  }

  // Parse data rows (remaining <tr>s)
  const dataRows: string[][] = [];
  for (let i = 1; i < trMatches.length; i++) {
    const cells: string[] = [];
    // Reset the regex lastIndex for each row
    const rowCellRegex = /<(?:th|td)[^>]*>([\s\S]*?)<\/(?:th|td)>/gi;
    let rowCellMatch: RegExpExecArray | null;
    while ((rowCellMatch = rowCellRegex.exec(trMatches[i])) !== null) {
      cells.push(innerText(rowCellMatch[1]).trim());
    }
    if (cells.length > 0) {
      dataRows.push(cells);
    }
  }

  return { headers: headerCells, rows: dataRows };
}

// ─── Column index finders ────────────────────────────────────────────────────

function findColumnIndex(headers: string[], ...candidates: string[]): number {
  const upper = headers.map((h) => h.toUpperCase());
  for (const c of candidates) {
    const idx = upper.indexOf(c.toUpperCase());
    if (idx !== -1) return idx;
  }
  return -1;
}

// ─── Cell formatters ─────────────────────────────────────────────────────────

/**
 * Renders a cell value with column-specific formatting.
 */
function FormattedCell({
  value,
  columnHeader,
  isName,
  isInteractive,
}: {
  value: string;
  columnHeader: string;
  isName: boolean;
  isInteractive: boolean;
}) {
  const upper = columnHeader.toUpperCase();

  // ── NAME column ─────────────────────────────────────────────────────────
  if (isName) {
    return (
      <span className="flex items-center gap-1">
        <span className="font-serif font-medium text-[#f7f7ff]">{value}</span>
        {isInteractive && (
          <span className="opacity-0 group-hover:opacity-100 text-gold-400 text-xs ml-2 transition-opacity">
            View detail
          </span>
        )}
      </span>
    );
  }

  // ── DAMAGE column ───────────────────────────────────────────────────────
  if (upper === "DAMAGE") {
    if (!value || value === "—") {
      return <span className="text-parchment-600">—</span>;
    }
    return (
      <span className="inline-flex items-center">
        <span className="text-gold-400/60 mr-1" aria-hidden="true">⚄</span>
        {value}
      </span>
    );
  }

  // ── BURDEN column ───────────────────────────────────────────────────────
  if (upper === "BURDEN") {
    if (!value || value === "—") {
      return <span className="text-parchment-600">—</span>;
    }
    const isTwoHanded = value.toLowerCase().includes("two-handed");
    return (
      <span
        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
          isTwoHanded
            ? "bg-coral-900/20 text-coral-300"
            : "bg-slate-700/50 text-parchment-400"
        }`}
      >
        {value}
      </span>
    );
  }

  // ── FEATURE column ──────────────────────────────────────────────────────
  if (upper === "FEATURE") {
    if (!value || value === "—") {
      return <span className="text-parchment-600">—</span>;
    }
    const truncated = value.length > 40 ? `${value.slice(0, 40)}…` : value;
    return (
      <span title={value.length > 40 ? value : undefined}>
        {truncated}
      </span>
    );
  }

  // ── Default: plain text ─────────────────────────────────────────────────
  if (!value || value === "—") {
    return <span className="text-parchment-600">—</span>;
  }
  return <>{value}</>;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function SRDTable({
  html,
  tableType,
  tier,
  category,
  onRowSelect,
}: SRDTableProps) {
  // ── Parse table HTML (memoised) ─────────────────────────────────────────
  const { headers, rows } = useMemo(() => parseHtmlTable(html), [html]);

  // ── Column index lookups ────────────────────────────────────────────────
  const nameIdx = useMemo(
    () => findColumnIndex(headers, "NAME"),
    [headers],
  );

  // ── ARIA label for the table ────────────────────────────────────────────
  const ariaLabel = useMemo(() => {
    const parts: string[] = [];
    if (tier != null) parts.push(`Tier ${tier}`);
    if (category) parts.push(category);
    if (parts.length === 0) {
      parts.push(`${tableType} table`);
    }
    return parts.join(" ");
  }, [tier, category, tableType]);

  // ── Row click handler ───────────────────────────────────────────────────
  const handleRowAction = useCallback(
    (row: string[]) => {
      if (!onRowSelect) return;
      const nameValue = nameIdx >= 0 ? row[nameIdx] : row[0];
      if (nameValue) {
        onRowSelect(slugify(nameValue));
      }
    },
    [onRowSelect, nameIdx],
  );

  // ── Keyboard handler (Enter / Space) ────────────────────────────────────
  const handleRowKeyDown = useCallback(
    (e: React.KeyboardEvent, row: string[]) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        handleRowAction(row);
      }
    },
    [handleRowAction],
  );

  // ── Guard: nothing parsed ───────────────────────────────────────────────
  if (headers.length === 0 && rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <i
          className="fa-solid fa-table mb-3 text-3xl text-gold-400/30"
          aria-hidden="true"
        />
        <p className="text-sm font-medium text-parchment-600">
          No table data available
        </p>
      </div>
    );
  }

  // ── Determine if NAME column exists ─────────────────────────────────────
  const hasName = nameIdx >= 0;

  return (
    <div className="animate-fade-in">
      {/* ────────────────────────────────────────────────────────────────────
          DESKTOP / TABLET TABLE (≥640px)
      ──────────────────────────────────────────────────────────────────── */}
      <div
        className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 hidden sm:block"
        role="table"
        aria-label={ariaLabel}
      >
        <table className="w-full border-collapse text-sm text-parchment-200">
          {/* ── Header ─────────────────────────────────────────────────── */}
          <thead>
            <tr role="row" className="bg-slate-800/60">
              {headers.map((header, colIdx) => {
                const isNameCol = colIdx === nameIdx;
                return (
                  <th
                    key={colIdx}
                    role="columnheader"
                    scope="col"
                    className={`
                      px-3 py-2.5 text-left text-xs font-semibold
                      text-gold-400/80 uppercase tracking-wider
                      ${isNameCol ? "sticky left-0 bg-slate-800/60 z-10" : ""}
                    `}
                  >
                    {header}
                  </th>
                );
              })}
            </tr>
          </thead>

          {/* ── Body ───────────────────────────────────────────────────── */}
          <tbody>
            {rows.map((row, rowIdx) => (
              <tr
                key={rowIdx}
                role="row"
                aria-rowindex={rowIdx + 2}
                tabIndex={onRowSelect ? 0 : undefined}
                onClick={() => handleRowAction(row)}
                onKeyDown={
                  onRowSelect ? (e) => handleRowKeyDown(e, row) : undefined
                }
                className={`
                  transition-colors duration-150
                  ${rowIdx % 2 === 0 ? "bg-slate-900/30" : "bg-transparent"}
                  ${onRowSelect ? "hover:bg-gold-400/5 cursor-pointer group" : ""}
                  focus:outline-none focus:ring-2 focus:ring-inset focus:ring-gold-400
                `}
              >
                {row.map((cell, colIdx) => {
                  const isNameCol = colIdx === nameIdx;
                  const header = headers[colIdx] ?? "";

                  return isNameCol ? (
                    <td
                      key={colIdx}
                      role="rowheader"
                      scope="row"
                      className="px-3 py-2 font-serif font-medium text-[#f7f7ff] whitespace-nowrap sticky left-0 bg-inherit z-10"
                    >
                      <FormattedCell
                        value={cell}
                        columnHeader={header}
                        isName
                        isInteractive={!!onRowSelect}
                      />
                    </td>
                  ) : (
                    <td
                      key={colIdx}
                      role="cell"
                      className="px-3 py-2 text-parchment-300 whitespace-nowrap"
                    >
                      <FormattedCell
                        value={cell}
                        columnHeader={header}
                        isName={false}
                        isInteractive={false}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ────────────────────────────────────────────────────────────────────
          MOBILE CARD STACK (<640px)
      ──────────────────────────────────────────────────────────────────── */}
      <div
        className="flex flex-col gap-2 sm:hidden"
        role="table"
        aria-label={ariaLabel}
      >
        {/* Screen-reader-only header row */}
        <div className="sr-only" role="row">
          {headers.map((header, colIdx) => (
            <span key={colIdx} role="columnheader">
              {header}
            </span>
          ))}
        </div>

        {rows.map((row, rowIdx) => {
          const nameValue = hasName ? row[nameIdx] : null;

          return (
            <div
              key={rowIdx}
              role="row"
              aria-rowindex={rowIdx + 2}
              tabIndex={onRowSelect ? 0 : undefined}
              onClick={() => handleRowAction(row)}
              onKeyDown={
                onRowSelect ? (e) => handleRowKeyDown(e, row) : undefined
              }
              className={`
                rounded-lg bg-slate-900/40 p-3 border border-slate-700/20
                ${onRowSelect ? "cursor-pointer active:bg-gold-400/5" : ""}
                focus:outline-none focus:ring-2 focus:ring-gold-400
              `}
            >
              {/* Card header — NAME */}
              {nameValue && (
                <div
                  role="rowheader"
                  className="font-serif text-base text-[#f7f7ff] font-medium mb-2"
                >
                  {nameValue}
                </div>
              )}

              {/* Field list */}
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                {headers.map((header, colIdx) => {
                  // Skip the NAME column — already rendered as card header
                  if (colIdx === nameIdx) return null;

                  const cellValue = row[colIdx] ?? "";

                  return (
                    <div key={colIdx} role="cell" className="min-w-0">
                      <div className="text-xs text-parchment-600 uppercase tracking-wider">
                        {header}
                      </div>
                      <div className="text-sm text-parchment-300 mt-0.5">
                        <FormattedCell
                          value={cellValue}
                          columnHeader={header}
                          isName={false}
                          isInteractive={false}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
