"use client";

/**
 * src/app/rules/page.tsx
 *
 * Rules of Daggerheart — fully searchable SRD reference page.
 *
 * ─── Architecture ─────────────────────────────────────────────────────────────
 *
 *  ┌─────────────────────────────────────────────────────────┐
 *  │  AppHeader (sticky, z-10)                               │
 *  ├─────────────────────────────────────────────────────────┤
 *  │  SRDHero                                                │
 *  │    └── SRDSearchBar (slotted into hero)                 │
 *  ├─────────────────────────────────────────────────────────┤
 *  │  Content panel (animate-fade-in keyed transitions)      │
 *  │    ├── [isSearching]       SRDResultsView               │
 *  │    ├── [activeSection===null] SRDSectionGrid (Level 0)  │
 *  │    ├── [prose section]     SRDDrillDownHeader + Prose    │
 *  │    └── [list section]      SRDDrillDownHeader + Accordion│
 *  ├─────────────────────────────────────────────────────────┤
 *  │  Footer                                                 │
 *  └─────────────────────────────────────────────────────────┘
 *
 * ─── State model ──────────────────────────────────────────────────────────────
 *
 *  inputValue     — raw keystroke value from the search input
 *  debouncedQuery — 250 ms debounced version fed into useSRDSearch
 *  activeSection  — currently drilled-into section id, or null (Level 0 grid)
 *  allChunks      — flat array from srd-index.json (loaded once)
 *
 * Search takes priority: when debouncedQuery is non-empty the content panel
 * renders SRDResultsView regardless of activeSection. Clearing search restores
 * the previous drill-down level.
 *
 * ─── URL sync ─────────────────────────────────────────────────────────────────
 *
 * State is synced to URL search params (?q=, ?section=) so that:
 *   - Refreshing the page restores the current search/section
 *   - Browser back/forward navigates between searches and drill-down levels
 *   - Keystrokes use replaceState (no history flood); distinct actions use pushState
 */

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";

import { AppHeader } from "@/components/AppHeader";
import { Footer } from "@/components/Footer";
import { SRDHero } from "@/components/srd/SRDHero";
import { SRDSearchBar } from "@/components/srd/SRDSearchBar";
import { SRDSectionGrid } from "@/components/srd/SRDSectionGrid";
import { SRDDrillDownHeader } from "@/components/srd/SRDDrillDownHeader";
import { SRDAccordionList } from "@/components/srd/SRDAccordionList";
import { SRDProseContent } from "@/components/srd/SRDProseContent";
import { SRDResultsView } from "@/components/srd/SRDResultsView";
import { SRDScrollProgress } from "@/components/srd/SRDScrollProgress";

import { useSRDSearch } from "@/hooks/useSRDSearch";
import { useDebounce } from "@/hooks/useDebounce";
import type { SRDChunk, SuggestionResult } from "@/lib/srdSearch";

// ─── Section metadata ─────────────────────────────────────────────────────────

/** Sections that render as flowing prose (sequential reading). */
const PROSE_SECTIONS = new Set(["Introduction", "Character Creation", "Core Mechanics"]);

/** Section labels — used for display in the DrillDownHeader. */
const SECTION_LABELS: Record<string, string> = {
  "Introduction": "Introduction",
  "Character Creation": "Character Creation",
  "Classes": "Classes",
  "Ancestries": "Ancestries",
  "Communities": "Communities",
  "Domains": "Domains",
  "Core Mechanics": "Core Mechanics",
  "Running an Adventure": "Running an Adventure",
  "Appendix": "Appendix",
};

/** Sections that group by subsection in accordion view. */
const GROUP_BY_SUBSECTION = new Set([
  "Classes",
  "Domains",
  "Core Mechanics",
  "Running an Adventure",
  "Appendix",
]);

// ─── URL param helpers ────────────────────────────────────────────────────────

/** Read the current ?q= and ?section= from the URL. */
function readUrlParams(): { q: string; section: string | null } {
  if (typeof window === "undefined") return { q: "", section: null };
  const params = new URLSearchParams(window.location.search);
  const q = params.get("q") ?? "";
  const section = params.get("section") ?? null;
  // Validate section against known labels
  if (section !== null && !(section in SECTION_LABELS)) return { q, section: null };
  return { q, section };
}

/** Build a URL search string from the current state. Returns "" or "?…". */
function buildSearchString(q: string, section: string | null): string {
  const params = new URLSearchParams();
  if (q.trim()) params.set("q", q.trim());
  if (section) params.set("section", section);
  const str = params.toString();
  return str ? `?${str}` : "";
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Loading SRD content">
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="h-16 animate-pulse rounded-lg border border-slate-800/60 bg-slate-800/30"
          style={{ animationDelay: `${i * 60}ms` }}
        />
      ))}
    </div>
  );
}

// ─── Page component ───────────────────────────────────────────────────────────

export default function RulesPage() {
  // ── Raw chunk storage (browse mode) ────────────────────────────────────────
  const [allChunks, setAllChunks] = useState<SRDChunk[]>([]);

  useEffect(() => {
    fetch("/srd-index.json")
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data: unknown) => {
        // srd-index.json is a flat array of chunks
        if (Array.isArray(data)) {
          setAllChunks(data as SRDChunk[]);
        }
      })
      .catch((err) => {
        console.error("[RulesPage] Failed to load SRD index:", err);
      });
  }, []);

  // ── Search state (initialized from URL params) ─────────────────────────────
  const [inputValue, setInputValue] = useState(() => {
    if (typeof window === "undefined") return "";
    return readUrlParams().q;
  });
  const debouncedQuery = useDebounce(inputValue, 250);

  // ── Active section (drill-down, initialized from URL params) ────────────────
  // null = Level 0 (section grid), string = Level 1 (section drilled-in)
  const [activeSection, setActiveSection] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return readUrlParams().section;
  });

  // ── URL sync refs ──────────────────────────────────────────────────────────
  // Track whether we're handling a popstate event to avoid re-pushing state
  const isPopstateRef = useRef(false);
  // Track the last URL we wrote to avoid redundant replaceState calls
  const lastUrlRef = useRef<string>("");

  // ── Sync state → URL (replaceState for keystrokes, pushState for actions) ──
  // This effect fires on every debouncedQuery or activeSection change.
  // We use replaceState so typing doesn't flood history. Discrete actions
  // (drill-down, clear, did-you-mean) call pushState directly via the handlers.
  useEffect(() => {
    if (typeof window === "undefined") return;
    // Skip URL update if we're responding to a popstate event
    if (isPopstateRef.current) {
      isPopstateRef.current = false;
      return;
    }
    const search = buildSearchString(debouncedQuery, activeSection);
    const url = `${window.location.pathname}${search}`;
    if (url !== lastUrlRef.current) {
      window.history.replaceState(null, "", url);
      lastUrlRef.current = url;
    }
  }, [debouncedQuery, activeSection]);

  // ── Listen to browser back/forward (popstate) ──────────────────────────────
  useEffect(() => {
    if (typeof window === "undefined") return;
    const handlePopstate = () => {
      isPopstateRef.current = true;
      const { q, section } = readUrlParams();
      setInputValue(q);
      setActiveSection(section);
      lastUrlRef.current = `${window.location.pathname}${window.location.search}`;
    };
    window.addEventListener("popstate", handlePopstate);
    // Initialize lastUrlRef
    lastUrlRef.current = `${window.location.pathname}${window.location.search}`;
    return () => window.removeEventListener("popstate", handlePopstate);
  }, []);

  // ── useSRDSearch — provides results, suggestions, recent searches ───────────
  const {
    results,
    suggestions,
    recentSearches,
    isLoading,
    isIndexReady,
    query: searchQuery,
    didYouMean,
    search,
    selectResult,
    clearSearch,
    clearHistory,
    getSimilar,
  } = useSRDSearch({
    sectionContext: activeSection ?? undefined,
    resultLimit: 30,
    suggestionLimit: 8,
  });

  // Propagate debounced value into the search engine
  useEffect(() => {
    search(debouncedQuery);
  }, [debouncedQuery, search]);

  // ── Derived: is the user in active search mode? ─────────────────────────────
  const isSearching = debouncedQuery.trim().length > 0;

  // ── Filtered chunks for browse mode ────────────────────────────────────────
  const filteredChunks = useMemo<SRDChunk[]>(() => {
    if (activeSection === null) return allChunks;
    return allChunks.filter((c) => c.section === activeSection);
  }, [allChunks, activeSection]);

  // ── Per-section counts for card badges ─────────────────────────────────────
  const sectionCounts = useMemo<Record<string, number>>(() => {
    const counts: Record<string, number> = {};
    for (const chunk of allChunks) {
      counts[chunk.section] = (counts[chunk.section] ?? 0) + 1;
    }
    return counts;
  }, [allChunks]);

  // ── pushState helper — used by discrete navigation actions ─────────────────
  const pushUrl = useCallback((q: string, section: string | null) => {
    if (typeof window === "undefined") return;
    const search = buildSearchString(q, section);
    const url = `${window.location.pathname}${search}`;
    if (url !== lastUrlRef.current) {
      window.history.pushState(null, "", url);
      lastUrlRef.current = url;
    }
  }, []);

  // ── Handlers ────────────────────────────────────────────────────────────────
  const handleSearchChange = useCallback((value: string) => {
    setInputValue(value);
    // URL sync is handled by the replaceState effect on debouncedQuery change
  }, []);

  const handleSelectSuggestion = useCallback(
    (suggestion: SuggestionResult) => {
      setInputValue(suggestion.title);
      selectResult(suggestion.id);
      // Push a history entry for the selected suggestion
      pushUrl(suggestion.title, activeSection);
    },
    [selectResult, pushUrl, activeSection]
  );

  const handleClear = useCallback(() => {
    setInputValue("");
    clearSearch();
    // Push a history entry so the user can go back to their search
    pushUrl("", activeSection);
  }, [clearSearch, pushUrl, activeSection]);

  const handleDidYouMean = useCallback(
    (corrected: string) => {
      setInputValue(corrected);
      // Push a history entry for the corrected query
      pushUrl(corrected, activeSection);
    },
    [pushUrl, activeSection]
  );

  // ── Drill-down navigation ──────────────────────────────────────────────────
  const drillIntoSection = useCallback((sectionId: string) => {
    setActiveSection(sectionId);
    // Push a history entry so back button returns to the grid
    pushUrl(inputValue, sectionId);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [pushUrl, inputValue]);

  const goToSectionGrid = useCallback(() => {
    setActiveSection(null);
    // Push a history entry so forward button returns to the section
    pushUrl(inputValue, null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [pushUrl, inputValue]);

  // ── Content transition key ──────────────────────────────────────────────────
  const contentKey = isSearching ? "search" : (activeSection ?? "grid");

  // ── Section display helpers ─────────────────────────────────────────────────
  const sectionLabel = activeSection ? (SECTION_LABELS[activeSection] ?? activeSection) : "";
  const isProseSection = activeSection !== null && PROSE_SECTIONS.has(activeSection);
  const shouldGroupBySubsection = activeSection !== null && GROUP_BY_SUBSECTION.has(activeSection);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex min-h-screen flex-col bg-[#0a100d]">
      {/* ── Scroll progress (only in drill-down mode) ── */}
      {!isSearching && activeSection !== null && (
        <SRDScrollProgress section={activeSection} />
      )}

      {/* ── App Header ── */}
      <AppHeader />

      {/* ── Hero + Search bar ── */}
      <SRDHero
        searchSlot={
          <SRDSearchBar
            value={inputValue}
            onChange={handleSearchChange}
            suggestions={suggestions}
            recentSearches={recentSearches}
            onSelect={handleSelectSuggestion}
            onClear={handleClear}
            onClearHistory={clearHistory}
            isLoading={isLoading}
            didYouMean={isSearching ? null : didYouMean}
            onDidYouMean={handleDidYouMean}
          />
        }
      />

      {/* ── Main content (keyed transition) ── */}
      <main
        className="mx-auto w-full max-w-[1200px] flex-1 px-4 py-8"
        aria-live="polite"
      >
        {/* ── Index loading spinner ── */}
        {!isIndexReady && isLoading && (
          <div className="mb-8 flex items-center gap-3 rounded-lg border border-gold-400/25 bg-gold-400/10 px-4 py-3">
            <i
              className="fa-solid fa-circle-notch fa-spin text-gold-400"
              aria-hidden="true"
            />
            <p className="text-sm text-gold-400">
              Loading search index ({allChunks.length > 0 ? `${allChunks.length} entries` : "…"})
            </p>
          </div>
        )}

        {/* Animated content swap */}
        <div key={contentKey} className="animate-fade-in">
          {/* ── SEARCH MODE — show results ── */}
          {isSearching && (
            <SRDResultsView
              query={searchQuery || debouncedQuery}
              results={results}
              onSelectResult={selectResult}
              getSimilar={getSimilar}
              didYouMean={didYouMean}
              onDidYouMean={handleDidYouMean}
              onBrowseSection={(section) => {
                setInputValue("");
                clearSearch();
                drillIntoSection(section);
              }}
            />
          )}

          {/* ── BROWSE MODE — Level 0: Section Grid ── */}
          {!isSearching && activeSection === null && (
            <>
              {allChunks.length === 0 ? (
                <LoadingSkeleton />
              ) : (
                <SRDSectionGrid
                  sectionCounts={sectionCounts}
                  onSelectSection={drillIntoSection}
                />
              )}
            </>
          )}

          {/* ── BROWSE MODE — Level 1: Drilled-in section ── */}
          {!isSearching && activeSection !== null && (
            <>
              {allChunks.length === 0 ? (
                <LoadingSkeleton />
              ) : (
                <>
                  <SRDDrillDownHeader
                    sectionLabel={sectionLabel}
                    count={filteredChunks.length}
                    onBack={goToSectionGrid}
                  />

                  {isProseSection ? (
                    <SRDProseContent
                      chunks={filteredChunks}
                      sectionLabel={sectionLabel}
                    />
                  ) : (
                    <SRDAccordionList
                      sectionLabel={sectionLabel}
                      chunks={filteredChunks}
                      groupBySubsection={shouldGroupBySubsection}
                    />
                  )}
                </>
              )}
            </>
          )}
        </div>
      </main>

      {/* ── Footer ── */}
      <Footer />
    </div>
  );
}
