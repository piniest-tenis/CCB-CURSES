/**
 * src/hooks/useSRDSearch.ts
 *
 * React hook wrapping the SRD search service.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * USAGE
 * ─────
 * const {
 *   results,        // SearchResult[] — ranked search results
 *   suggestions,    // SuggestionResult[] — autocomplete suggestions (debounced)
 *   isLoading,      // true while the SRD index is being fetched/initialized
 *   isIndexReady,   // true once index is ready; false during first load
 *   query,          // current search string (controlled)
 *   search,         // (query: string) => void — triggers a search
 *   selectResult,   // (chunkId: string) => void — records a selection
 *   clearSearch,    // () => void — clears query, results, suggestions
 *   didYouMean,     // string | null — corrected query suggestion
 *   recentSearches, // SuggestionResult[] — shown when query is empty
 *   stats,          // SearchStats — index metadata
 * } = useSRDSearch({ sectionContext: "Classes" });
 *
 * HOW IT WORKS
 * ─────────────
 * 1. On mount, fetches /srd-index.json from the Next.js public folder.
 * 2. Passes the chunks to initializeSRDSearch() (runs once globally via a
 *    module-level flag — safe across StrictMode double-invocations).
 * 3. `search(query)` runs synchronously against the in-memory index.
 *    For queries ≥ 2 chars, suggestions are debounced by 150 ms.
 *    Full results update immediately on each `search()` call.
 * 4. `selectResult(chunkId)` calls recordSearch() to persist recency data.
 *
 * PERFORMANCE
 * ───────────
 * - Index fetch: ~1 network round-trip on first mount, cached by browser.
 * - initializeSRDSearch: ~15–40 ms for 477 chunks (Fuse + MiniSearch build).
 * - searchSRD: <5 ms per query for 477 chunks (both engines + merge).
 * - getSuggestions: <3 ms (delegates to searchSRD with smaller limit).
 * All search operations are synchronous and non-blocking for this corpus size.
 *
 * SSR SAFETY
 * ──────────
 * - localStorage access is guarded by typeof window checks inside the service.
 * - The index fetch is gated on useEffect, never running on the server.
 * - No hydration mismatches: state is initialized to empty arrays.
 */

"use client";

import {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from "react";

import {
  initializeSRDSearch,
  registerSubEntries,
  searchSRD,
  getSuggestions,
  getSimilarChunks,
  recordSearch,
  clearRecentSearches,
  correctQuery,
  isSearchReady,
  getSearchStats,
  type SRDChunk,
  type SearchResult,
  type SuggestionResult,
  type SearchStats,
  type SearchOptions,
} from "@/lib/srdSearch";
import type { SRDSubEntryIndex } from "@shared/types/srd";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface UseSRDSearchOptions {
  /**
   * Path to the pre-built SRD index JSON file.
   * Defaults to "/srd-index.json" (served from Next.js public/).
   */
  indexPath?: string;
  /**
   * If set, results from this section receive a 1.3× score boost.
   * Pass the section the user is currently browsing.
   */
  sectionContext?: string;
  /**
   * Milliseconds to debounce suggestion updates (default: 150).
   * Full results (via `search()`) are always immediate.
   */
  suggestionDebounceMs?: number;
  /**
   * Maximum number of full results to return (default: 20).
   */
  resultLimit?: number;
  /**
   * Maximum number of autocomplete suggestions (default: 8).
   */
  suggestionLimit?: number;
}

export interface UseSRDSearchReturn {
  /** Ranked search results for the current query */
  results: SearchResult[];
  /** Autocomplete suggestions (debounced, grouped by section) */
  suggestions: SuggestionResult[];
  /** Recent searches shown when query is empty */
  recentSearches: SuggestionResult[];
  /** true while the index JSON is being fetched or parsed */
  isLoading: boolean;
  /** true once the index is fully built and searches can run */
  isIndexReady: boolean;
  /** Any error that occurred during index loading */
  error: Error | null;
  /** The current search query string */
  query: string;
  /** Corrected query ("did you mean?"), or null if no correction needed */
  didYouMean: string | null;
  /** Index metadata */
  stats: SearchStats;
  /**
   * Run a search. Updates `results` immediately and `suggestions` after debounce.
   * Pass an empty string to clear.
   */
  search: (query: string) => void;
  /**
   * Record that the user selected a result. Persists to localStorage.
   * Call this when the user clicks/navigates to a result.
   */
  selectResult: (chunkId: string) => void;
  /** Clear the current query, results, and suggestions */
  clearSearch: () => void;
  /** Clear persisted recent searches from localStorage */
  clearHistory: () => void;
  /**
   * Get similar chunks for a given chunk ID.
   * Results are memoized — safe to call in render.
   */
  getSimilar: (chunkId: string, limit?: number) => SRDChunk[];
}

// ─── Module-level initialization guard ───────────────────────────────────────
// Prevents double-initialization across React StrictMode's double-invoking
// of useEffect in development. Shared across all hook instances.

let _globalInitPromise: Promise<void> | null = null;
let _globalInitialized = false;

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useSRDSearch(
  options: UseSRDSearchOptions = {}
): UseSRDSearchReturn {
  const {
    indexPath = "/srd-index.json",
    sectionContext,
    suggestionDebounceMs = 150,
    resultLimit = 20,
    suggestionLimit = 8,
  } = options;

  // ── State ────────────────────────────────────────────────────────────────
  const [results, setResults] = useState<SearchResult[]>([]);
  const [suggestions, setSuggestions] = useState<SuggestionResult[]>([]);
  const [recentSearches, setRecentSearches] = useState<SuggestionResult[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isIndexReady, setIsIndexReady] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [query, setQuery] = useState<string>("");
  const [didYouMean, setDidYouMean] = useState<string | null>(null);
  const [stats, setStats] = useState<SearchStats>({
    totalChunks: 0,
    totalSubEntries: 0,
    sectionCounts: {},
    isReady: false,
  });

  // Ref for suggestion debounce timer
  const suggestionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Ref for the last query that triggered a full search (avoids stale closures)
  const lastQueryRef = useRef<string>("");

  // ── Build SearchOptions ──────────────────────────────────────────────────
  const searchOptions = useMemo<SearchOptions>(
    () => ({
      limit: resultLimit,
      sectionContext,
      minScore: 0.05,
    }),
    [resultLimit, sectionContext]
  );

  // ── Load & Initialize Index ───────────────────────────────────────────────
  useEffect(() => {
    // If already initialized globally, just update local state
    if (_globalInitialized && isSearchReady()) {
      setIsLoading(false);
      setIsIndexReady(true);
      setStats(getSearchStats());
      return;
    }

    // If initialization is in progress (another hook instance started it),
    // wait for it to complete
    if (_globalInitPromise) {
      _globalInitPromise
        .then(() => {
          setIsLoading(false);
          setIsIndexReady(true);
          setStats(getSearchStats());
        })
        .catch((err: unknown) => {
          setError(
            err instanceof Error ? err : new Error("SRD index load failed")
          );
          setIsLoading(false);
        });
      return;
    }

    // First mount — start the initialization
    _globalInitPromise = (async () => {
      try {
        // ── Phase 1: Load and index chunks ──────────────────────────────
        const response = await fetch(indexPath);
        if (!response.ok) {
          throw new Error(
            `Failed to load SRD index: HTTP ${response.status} from ${indexPath}`
          );
        }
        const chunks = (await response.json()) as SRDChunk[];
        if (!Array.isArray(chunks)) {
          throw new Error(
            `SRD index at ${indexPath} is not an array. Got: ${typeof chunks}`
          );
        }
        initializeSRDSearch(chunks);

        // ── Phase 2: Load and register sub-entries ──────────────────────
        try {
          const subResponse = await fetch("/srd-sub-entries.json");
          if (subResponse.ok) {
            const subData = (await subResponse.json()) as SRDSubEntryIndex;
            if (subData && Array.isArray(subData.entries)) {
              registerSubEntries(subData.entries);
            }
          }
        } catch (subErr) {
          // Sub-entry loading is non-fatal — search still works with chunks only
          console.warn("[useSRDSearch] Failed to load sub-entries:", subErr);
        }

        _globalInitialized = true;
      } catch (err) {
        _globalInitPromise = null; // Allow retry on next mount
        throw err;
      }
    })();

    _globalInitPromise
      .then(() => {
        setIsLoading(false);
        setIsIndexReady(true);
        setStats(getSearchStats());
        // Populate recent searches for empty-state display
        setRecentSearches(getSuggestions("", suggestionLimit));
      })
      .catch((err: unknown) => {
        setError(
          err instanceof Error ? err : new Error("SRD index load failed")
        );
        setIsLoading(false);
      });
  }, [indexPath, suggestionLimit]);

  // ── search() ─────────────────────────────────────────────────────────────
  const search = useCallback(
    (newQuery: string): void => {
      const trimmed = newQuery.trim();
      setQuery(newQuery);
      lastQueryRef.current = trimmed;

      // Clear debounce timer on each new keystroke
      if (suggestionTimer.current) {
        clearTimeout(suggestionTimer.current);
        suggestionTimer.current = null;
      }

      // Empty query → clear results, show recent searches
      if (trimmed.length === 0) {
        setResults([]);
        setDidYouMean(null);
        if (isIndexReady) {
          setSuggestions([]);
          setRecentSearches(getSuggestions("", suggestionLimit));
        }
        return;
      }

      if (!isIndexReady) return;

      // ── Full results (immediate, synchronous) ─────────────────────────
      const searchResults = searchSRD(trimmed, searchOptions);
      setResults(searchResults);

      // ── Did you mean? ─────────────────────────────────────────────────
      const { corrected, wasCorrected } = correctQuery(trimmed);
      if (wasCorrected && searchResults.length === 0) {
        setDidYouMean(corrected);
      } else {
        setDidYouMean(null);
      }

      // ── Suggestions (debounced) ───────────────────────────────────────
      suggestionTimer.current = setTimeout(() => {
        // Guard against stale query after debounce delay
        if (lastQueryRef.current !== trimmed) return;
        const newSuggestions = getSuggestions(trimmed, suggestionLimit);
        setSuggestions(newSuggestions);
      }, suggestionDebounceMs);
    },
    [isIndexReady, searchOptions, suggestionDebounceMs, suggestionLimit]
  );

  // ── selectResult() ────────────────────────────────────────────────────────
  const selectResult = useCallback(
    (chunkId: string): void => {
      const currentQuery = lastQueryRef.current;
      if (currentQuery) {
        recordSearch(currentQuery, chunkId);
        // Update recent searches state so the UI refreshes immediately
        setRecentSearches(getSuggestions("", suggestionLimit));
      }
    },
    [suggestionLimit]
  );

  // ── clearSearch() ─────────────────────────────────────────────────────────
  const clearSearch = useCallback((): void => {
    if (suggestionTimer.current) {
      clearTimeout(suggestionTimer.current);
      suggestionTimer.current = null;
    }
    setQuery("");
    setResults([]);
    setSuggestions([]);
    setDidYouMean(null);
    lastQueryRef.current = "";
    if (isIndexReady) {
      setRecentSearches(getSuggestions("", suggestionLimit));
    }
  }, [isIndexReady, suggestionLimit]);

  // ── clearHistory() ────────────────────────────────────────────────────────
  const clearHistory = useCallback((): void => {
    clearRecentSearches();
    setRecentSearches([]);
  }, []);

  // ── getSimilar() ──────────────────────────────────────────────────────────
  // Stable reference — getSimilarChunks is already memoized inside the service
  const getSimilar = useCallback(
    (chunkId: string, limit = 4): SRDChunk[] => {
      if (!isIndexReady) return [];
      return getSimilarChunks(chunkId, limit);
    },
    [isIndexReady]
  );

  // ── Cleanup debounce timer on unmount ─────────────────────────────────────
  useEffect(() => {
    return () => {
      if (suggestionTimer.current) {
        clearTimeout(suggestionTimer.current);
      }
    };
  }, []);

  // ── Re-run search when sectionContext changes (user navigates sections) ───
  useEffect(() => {
    if (!isIndexReady || !lastQueryRef.current) return;
    const newResults = searchSRD(lastQueryRef.current, searchOptions);
    setResults(newResults);
  }, [sectionContext, isIndexReady, searchOptions]);

  // ── Return ────────────────────────────────────────────────────────────────
  return {
    results,
    suggestions,
    recentSearches,
    isLoading,
    isIndexReady,
    error,
    query,
    didYouMean,
    stats,
    search,
    selectResult,
    clearSearch,
    clearHistory,
    getSimilar,
  };
}
