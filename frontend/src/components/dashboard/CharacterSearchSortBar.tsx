"use client";

/**
 * src/components/dashboard/CharacterSearchSortBar.tsx
 *
 * Search + sort toolbar for the character grid.
 * Custom listbox-based sort dropdown (role="listbox") sorted by:
 *   - Last Modified (default, DESC)
 *   - Name (A → Z)
 *   - Class
 */

import React, { useState, useRef, useEffect, useCallback } from "react";

export type SortKey = "updatedAt" | "name" | "className";

export interface SearchSortState {
  query: string;
  sortKey: SortKey;
}

interface CharacterSearchSortBarProps {
  state: SearchSortState;
  onChange: (next: SearchSortState) => void;
  totalCount: number;
  filteredCount: number;
  onNewCharacter: () => void;
}

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "updatedAt", label: "Last Modified" },
  { key: "name",      label: "Name" },
  { key: "className", label: "Class" },
];

export function CharacterSearchSortBar({
  state,
  onChange,
  totalCount,
  filteredCount,
  onNewCharacter,
}: CharacterSearchSortBarProps) {
  const [sortOpen, setSortOpen] = useState(false);
  const sortRef = useRef<HTMLDivElement>(null);

  const currentLabel =
    SORT_OPTIONS.find((o) => o.key === state.sortKey)?.label ?? "Sort";

  // Close dropdown on outside click
  useEffect(() => {
    if (!sortOpen) return;
    const handler = (e: MouseEvent) => {
      if (!sortRef.current?.contains(e.target as Node)) {
        setSortOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [sortOpen]);

  // Keyboard nav in listbox
  const handleListboxKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") { setSortOpen(false); return; }
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        const idx = SORT_OPTIONS.findIndex((o) => o.key === state.sortKey);
        const next = e.key === "ArrowDown"
          ? SORT_OPTIONS[(idx + 1) % SORT_OPTIONS.length]!
          : SORT_OPTIONS[(idx - 1 + SORT_OPTIONS.length) % SORT_OPTIONS.length]!;
        onChange({ ...state, sortKey: next.key });
      }
    },
    [state, onChange]
  );

  const hasFilter = state.query.length > 0;

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Search input */}
      <div className="relative flex-1 min-w-[180px]">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#577399]/50 pointer-events-none"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z"
            clipRule="evenodd"
          />
        </svg>
        <input
          type="search"
          value={state.query}
          onChange={(e) => onChange({ ...state, query: e.target.value })}
          placeholder="Search characters…"
          aria-label="Search characters"
          className="
            w-full rounded-lg border border-slate-700/60 bg-slate-900
            pl-9 pr-3 py-2 text-sm text-[#f7f7ff] placeholder-[#b9baa3]/30
            focus:outline-none focus:border-[#577399] transition-colors
          "
        />
        {hasFilter && (
          <button
            type="button"
            onClick={() => onChange({ ...state, query: "" })}
            aria-label="Clear search"
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#b9baa3]/40 hover:text-[#b9baa3] transition-colors"
          >
            ✕
          </button>
        )}
      </div>

      {/* Sort dropdown */}
      <div ref={sortRef} className="relative">
        <button
          type="button"
          aria-haspopup="listbox"
          aria-expanded={sortOpen}
          onClick={() => setSortOpen((v) => !v)}
          className="
            flex items-center gap-2 rounded-lg border border-slate-700/60
            bg-slate-900 px-3 py-2 text-sm text-[#b9baa3]/70
            hover:border-[#577399]/40 hover:text-[#b9baa3]
            transition-colors
            focus:outline-none focus:ring-2 focus:ring-[#577399] focus:ring-offset-2 focus:ring-offset-slate-900
          "
        >
          <svg className="h-3.5 w-3.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path fillRule="evenodd" d="M2 3.75A.75.75 0 012.75 3h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 3.75zm0 4.167a.75.75 0 01.75-.75h9.5a.75.75 0 010 1.5h-9.5A.75.75 0 012 7.917zm0 4.166a.75.75 0 01.75-.75h5.5a.75.75 0 010 1.5h-5.5a.75.75 0 01-.75-.75z" clipRule="evenodd"/>
          </svg>
          {currentLabel}
          <svg className={`h-3 w-3 transition-transform ${sortOpen ? "rotate-180" : ""}`} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd"/>
          </svg>
        </button>

        {sortOpen && (
          <ul
            role="listbox"
            aria-label="Sort characters by"
            onKeyDown={handleListboxKeyDown}
            className="
              absolute right-0 top-full mt-1 z-20
              min-w-[160px] rounded-xl border border-slate-700/60
              bg-[#0a100d]/95 backdrop-blur-sm shadow-xl py-1
            "
          >
            {SORT_OPTIONS.map((opt) => (
              <li
                key={opt.key}
                role="option"
                aria-selected={state.sortKey === opt.key}
                tabIndex={0}
                onClick={() => { onChange({ ...state, sortKey: opt.key }); setSortOpen(false); }}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { onChange({ ...state, sortKey: opt.key }); setSortOpen(false); } }}
                className={[
                  "flex items-center gap-2.5 px-4 py-2.5 text-sm cursor-pointer",
                  "focus:outline-none transition-colors",
                  state.sortKey === opt.key
                    ? "text-[#577399] bg-[#577399]/10"
                    : "text-[#b9baa3]/70 hover:bg-slate-800/60 hover:text-[#f7f7ff] focus:bg-slate-800/60",
                ].join(" ")}
              >
                {state.sortKey === opt.key && (
                  <svg className="h-3.5 w-3.5 shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd"/>
                  </svg>
                )}
                {state.sortKey !== opt.key && <span className="w-3.5 shrink-0" />}
                {opt.label}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Status text */}
      {hasFilter && (
        <p className="text-xs text-[#b9baa3]/40">
          {filteredCount === 0
            ? `No characters matching "${state.query}"`
            : `${filteredCount} of ${totalCount}`}
        </p>
      )}

      {/* New character CTA */}
      <button
        type="button"
        onClick={onNewCharacter}
        className="
          sm:hidden
          rounded-lg border border-[#577399]/60 bg-[#577399]/10
          px-3 py-2 text-sm font-semibold text-[#577399]
          hover:bg-[#577399]/20 hover:border-[#577399]
          transition-all
          focus:outline-none focus:ring-2 focus:ring-[#577399] focus:ring-offset-2 focus:ring-offset-slate-900
        "
        aria-label="New character"
      >
        +
      </button>
    </div>
  );
}
