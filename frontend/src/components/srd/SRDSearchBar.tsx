"use client";

/**
 * src/components/srd/SRDSearchBar.tsx
 *
 * Full-featured SRD search input with an ARIA combobox + listbox pattern.
 *
 * Accessibility (WCAG 2.1 AA):
 *   - role="combobox" on the input wrapper
 *   - aria-expanded, aria-autocomplete="list", aria-controls on the input
 *   - role="listbox" on the dropdown, role="option" on each suggestion
 *   - aria-activedescendant tracks keyboard-highlighted option
 *   - Keyboard: ArrowDown/Up navigate, Enter selects, Escape closes
 *
 * The component is uncontrolled w.r.t. the actual search execution —
 * it calls `onSearch(value)` on every input change (debouncing is the
 * parent's responsibility via useDebounce). It calls `onSelect(chunk)`
 * when the user picks a suggestion.
 */

import React, { useRef, useState, useId, useCallback, useEffect } from "react";
import type { SuggestionResult } from "@/lib/srdSearch";

// ─── Section badge colour map ─────────────────────────────────────────────────

const SECTION_COLOURS: Record<string, string> = {
  Introduction:           "bg-parchment-600/15 text-parchment-400 border-parchment-600/30",
  "Character Creation":   "bg-gold-600/15 text-gold-400 border-gold-600/30",
  Classes:                "bg-burgundy-700/15 text-burgundy-400 border-burgundy-700/30",
  Ancestries:             "bg-amber-900/20 text-amber-400 border-amber-700/30",
  Communities:            "bg-emerald-900/20 text-emerald-400 border-emerald-700/30",
  Domains:                "bg-violet-900/20 text-violet-400 border-violet-700/30",
  "Core Mechanics":       "bg-gold-600/15 text-gold-400 border-gold-600/30",
  "Running an Adventure": "bg-coral-700/15 text-coral-400 border-coral-700/30",
  Appendix:               "bg-parchment-700/15 text-parchment-500 border-parchment-700/30",
};

function SectionBadge({ section }: { section: string }) {
  const classes = SECTION_COLOURS[section] ?? "bg-slate-700/30 text-[#b9baa3] border-slate-600/30";
  return (
    <span className={`inline-flex shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${classes}`}>
      {section}
    </span>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface SRDSearchBarProps {
  /** Current input value (controlled). */
  value: string;
  /** Called on every keystroke. */
  onChange: (value: string) => void;
  /** Suggestions to display in the dropdown (already debounced by parent). */
  suggestions: SuggestionResult[];
  /** Recent searches — displayed when input is focused but empty. */
  recentSearches: SuggestionResult[];
  /** Called when the user selects a suggestion from the dropdown. */
  onSelect: (suggestion: SuggestionResult) => void;
  /** Called when the user clears the input. */
  onClear: () => void;
  /** Called when the user requests to clear their search history. */
  onClearHistory: () => void;
  /** Whether the search index is still loading. */
  isLoading?: boolean;
  /** "Did you mean?" corrected query, if any. */
  didYouMean?: string | null;
  /** Called when the user clicks "Did you mean: X?" */
  onDidYouMean?: (corrected: string) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function SRDSearchBar({
  value,
  onChange,
  suggestions,
  recentSearches,
  onSelect,
  onClear,
  onClearHistory,
  isLoading = false,
  didYouMean,
  onDidYouMean,
}: SRDSearchBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const listboxRef = useRef<HTMLUListElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [isFocused, setIsFocused] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const uid = useId();
  const inputId = `${uid}-srd-search`;
  const listboxId = `${uid}-srd-listbox`;

  // Which list to show: suggestions (when typing) or recent (when empty+focused)
  const showSuggestions = isFocused && value.trim().length > 0 && suggestions.length > 0;
  const showRecent = isFocused && value.trim().length === 0 && recentSearches.length > 0;
  const isOpen = showSuggestions || showRecent;

  const displayList: SuggestionResult[] = showSuggestions ? suggestions : (showRecent ? recentSearches : []);

  // Reset active index whenever the list changes
  useEffect(() => {
    setActiveIndex(-1);
  }, [displayList.length, isOpen]);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsFocused(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isOpen]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (!isOpen) {
        if (e.key === "ArrowDown") {
          setIsFocused(true);
        }
        return;
      }

      switch (e.key) {
        case "ArrowDown": {
          e.preventDefault();
          setActiveIndex((prev) => Math.min(prev + 1, displayList.length - 1));
          break;
        }
        case "ArrowUp": {
          e.preventDefault();
          setActiveIndex((prev) => (prev <= 0 ? -1 : prev - 1));
          break;
        }
        case "Enter": {
          if (activeIndex >= 0 && displayList[activeIndex]) {
            e.preventDefault();
            onSelect(displayList[activeIndex]);
            setIsFocused(false);
            setActiveIndex(-1);
          }
          break;
        }
        case "Escape": {
          e.preventDefault();
          setIsFocused(false);
          setActiveIndex(-1);
          inputRef.current?.blur();
          break;
        }
        case "Tab": {
          setIsFocused(false);
          setActiveIndex(-1);
          break;
        }
      }
    },
    [isOpen, activeIndex, displayList, onSelect]
  );

  const handleSelect = useCallback(
    (suggestion: SuggestionResult) => {
      onSelect(suggestion);
      setIsFocused(false);
      setActiveIndex(-1);
      inputRef.current?.focus();
    },
    [onSelect]
  );

  const activeOptionId =
    activeIndex >= 0 ? `${listboxId}-option-${activeIndex}` : undefined;

  return (
    <div ref={containerRef} className="relative w-full">
      {/* ── Combobox wrapper ── */}
      <div
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-owns={listboxId}
        className={`
          relative flex items-center rounded-lg border bg-[#0a100d]/80 backdrop-blur-sm
          transition-colors duration-200
          ${isOpen || isFocused
            ? "border-gold-400 shadow-[0_0_0_3px_rgba(251,191,36,0.20)]"
            : "border-slate-700/60 hover:border-slate-600"
          }
        `}
      >
        {/* Search icon */}
        <span className="pointer-events-none flex shrink-0 items-center pl-4 text-gold-500">
          {isLoading ? (
            <i className="fa-solid fa-circle-notch fa-spin text-lg" aria-hidden="true" />
          ) : (
            <i className="fa-solid fa-magnifying-glass text-lg" aria-hidden="true" />
          )}
        </span>

        {/* Input */}
        <input
          ref={inputRef}
          id={inputId}
          type="search"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          role="searchbox"
          aria-label="Search the Daggerheart SRD"
          aria-autocomplete="list"
          aria-controls={listboxId}
          aria-activedescendant={activeOptionId}
          value={value}
          placeholder={isLoading ? "Loading SRD index…" : "Search rules, classes, adversaries…"}
          disabled={isLoading}
          onChange={(e) => {
            onChange(e.target.value);
            setActiveIndex(-1);
          }}
          onFocus={() => setIsFocused(true)}
          onKeyDown={handleKeyDown}
          className="
            w-full flex-1 bg-transparent py-4 pl-3 pr-4 text-base text-[#f7f7ff]
            placeholder:text-[#b9baa3]/50
            focus:outline-none
            disabled:cursor-not-allowed disabled:opacity-50
          "
        />

        {/* Clear button — only visible when there is a value */}
        {value.length > 0 && (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => {
              onClear();
              inputRef.current?.focus();
            }}
            className="
              mr-3 flex h-7 w-7 shrink-0 items-center justify-center rounded-full
              text-[#b9baa3]/60 transition-colors
              hover:bg-slate-700/60 hover:text-[#f7f7ff]
              focus:outline-none focus:ring-2 focus:ring-gold-400 focus:ring-offset-2 focus:ring-offset-[#0a100d]
            "
          >
            <i className="fa-solid fa-xmark text-sm" aria-hidden="true" />
          </button>
        )}
      </div>

      {/* ── "Did you mean?" banner ── */}
      {didYouMean && onDidYouMean && !isOpen && (
        <p className="mt-2 text-sm text-[#b9baa3]/70">
          Did you mean:{" "}
           <button
            type="button"
            onClick={() => onDidYouMean(didYouMean)}
            className="font-semibold text-gold-400 underline decoration-gold-400/50 hover:decoration-gold-400 focus:outline-none focus:ring-2 focus:ring-gold-400 focus:ring-offset-1 focus:ring-offset-[#0a100d] rounded"
          >
            {didYouMean}
          </button>
          ?
        </p>
      )}

      {/* ── Dropdown listbox ── */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-50 overflow-hidden rounded-xl border border-slate-700/60 bg-[#0d1510] shadow-2xl shadow-black/60">
          {/* Header row */}
          <div className="flex items-center justify-between border-b border-slate-800/60 px-4 py-2">
             <p className="text-xs font-semibold uppercase tracking-widest text-gold-500/80">
              {showRecent ? "Recently searched" : `${displayList.length} suggestion${displayList.length !== 1 ? "s" : ""}`}
            </p>
            {showRecent && recentSearches.length > 0 && (
              <button
                type="button"
                onClick={onClearHistory}
                className="text-xs text-[#b9baa3]/50 hover:text-[#b9baa3] transition-colors focus:outline-none focus:ring-1 focus:ring-gold-400 rounded"
              >
                Clear history
              </button>
            )}
          </div>

          {/* Options */}
          <ul
            ref={listboxRef}
            id={listboxId}
            role="listbox"
            aria-label={showRecent ? "Recent searches" : "Search suggestions"}
            className="max-h-80 overflow-y-auto py-1"
          >
            {displayList.map((suggestion, index) => {
              const isActive = index === activeIndex;
              const optionId = `${listboxId}-option-${index}`;
              return (
                <li
                  key={suggestion.id}
                  id={optionId}
                  role="option"
                  aria-selected={isActive}
                  onMouseDown={(e) => {
                    // Prevent input blur before the click registers
                    e.preventDefault();
                    handleSelect(suggestion);
                  }}
                  onMouseEnter={() => setActiveIndex(index)}
                  className={`
                    flex cursor-pointer items-center gap-3 px-4 py-3
                    transition-colors duration-100
                    ${isActive
                      ? "bg-gold-400/10 text-[#f7f7ff]"
                      : "text-[#b9baa3] hover:bg-slate-800/50 hover:text-[#f7f7ff]"
                    }
                  `}
                >
                  {/* Section badge */}
                  <SectionBadge section={suggestion.section} />

                  {/* Title */}
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">
                    {suggestion.title}
                  </span>

                  {/* Relevance score pill (subtle, for power users) */}
                  {suggestion.score > 0 && (
                    <span className="shrink-0 text-[10px] text-steel-400/50">
                      {Math.round(suggestion.score * 100)}%
                    </span>
                  )}

                  {/* Arrow hint on active */}
                  {isActive && (
                    <i className="fa-solid fa-arrow-right shrink-0 text-xs text-gold-400" aria-hidden="true" />
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
