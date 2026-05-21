# Runbook: Searchable SRD Feature

> **Feature branch:** `feature/searchable-srd`
> **Phase 1 completed:** 2026-04-11
> **Phase 2 completed:** 2026-04-11
> **Deploy target:** dev (S3 + CloudFront)
> **Reuse for:** Homebrew SRD, Daggerheart Homebrew Kit

---

## Overview

This runbook documents the complete process for building a fully searchable, browsable SRD (System Reference Document) page with fuzzy search, canonical similarity suggestions, and drill-down section navigation. It is designed to be repeatable for homebrew content and future SRD expansions.

Phase 1 built the initial feature with horizontal tab navigation and a 454-chunk index (including homebrew). Phase 2 remediated the index to canonical-only content (110 chunks), replaced tabs with a drill-down card grid, and applied a vibrant gold/burgundy color palette.

---

## Prerequisites

- Node.js 18+ (used for build scripts)
- Python 3 (used for chunking script)
- AWS credentials in `frontend/.env.local` (for dev deploy)
- Dependencies: `fuse.js`, `minisearch` (added to frontend/package.json)

---

## Step-by-Step Process

### 1. Create Feature Branch

```bash
git checkout main && git pull
git checkout -b feature/<feature-name>
```

### 2. Chunk the Source Content into Sections

**Agent:** `db-search`

**Purpose:** Parse all markdown files and produce a structured JSON index, chunked by header level.

**Files created:**
- `scripts/chunk-srd.ts` — TypeScript source (reference)
- `scripts/chunk-srd.mjs` — Executable chunker script
- `frontend/public/srd-index.json` — Output index (flat array of `SRDChunk` objects)
- `shared/types/srd.ts` — Type definitions: `SRDChunk`, `SRDSection`, `SRDIndex`

**Chunk structure (SRDChunk):**
```typescript
{
  id: string;          // e.g. "classes-guardian"
  title: string;       // e.g. "Guardian"
  section: string;     // e.g. "Classes"
  subsection?: string; // e.g. "Adversaries and Environments"
  content: string;     // Full markdown content
  filePath: string;    // Source file path
  tags: string[];      // Auto-generated search tags
  level: number;       // Header level (1-6)
}
```

**To run:**
```bash
cd frontend && npm run build:srd-index
```

**Sections produced (for Daggerheart SRD 1.0 canonical):** Introduction (1), Character Creation (2), Domains (2), Classes (11), Ancestries (20), Communities (10), Core Mechanics (18), Running an Adventure (32), Appendix (14) — 9 top-level sections, 110 chunks total.

**Source:** `.opencode/supporting-docs/Daggerheart-SRD-digested.md` (canonical only — no homebrew markdown files).

### 3. Design the Page

**Agents:** `designer`, `ux-architect`

**Design spec deliverables:**
- Hero section with background image + gradient overlay (`.srd-hero-gradient` CSS class)
- Sticky search bar below AppHeader with ARIA combobox pattern
- Horizontal section tabs (scrollable on mobile) with ARIA tablist
- Accordion items for list sections, prose layout for definitions
- All design tokens aligned with existing Tailwind config

**Key design decisions:**
- Background image: `frontend/public/images/JeffBrown_ARCEMSPLASH.webp` (placeholder; swap `fantasy-monster-bg.webp` when available)
- Gradient: 0.4 alpha at top → 0.9 alpha by 20% → full dark, with warm burgundy-900 tint
- Container pattern: `border-slate-700/60 bg-slate-850/50 rounded-lg` (matches existing `CollapsibleSRDDescription`)
- Primary accent: `gold-400` (#fbbf24) — replaced steel-400 across all SRD components
- Per-section card colors: burgundy (Classes), amber (Ancestries), emerald (Communities), violet (Domains), coral (Running an Adventure), gold (Character Creation, Core Mechanics), parchment (Introduction, Appendix)
- Badge pattern: `/30` border opacity, `/10` bg opacity (matches `SourceBadge`)
- Navigation: Drill-down card grid (Level 0 → Level 1) replaces horizontal tabs

**UX architecture spec saved to:** `markdown/usability/rules-page-ux-architecture.md` (897 lines)

### 4. Build the Search Engine

**Agent:** `search`

**Files created:**
- `frontend/src/lib/srdSearch.ts` (906 lines) — Dual-engine search: Fuse.js (40% weight, typo tolerance) + MiniSearch (60% weight, BM25 ranking)
- `frontend/src/hooks/useSRDSearch.ts` (387 lines) — React hook with debounced suggestions, recent searches, section context
- `frontend/scripts/build-srd-index.mjs` — Index builder
- `frontend/scripts/test-srd-search.mjs` — 16-test smoke suite

**Dependencies added to frontend/package.json:**
```json
"fuse.js": "^7.3.0",
"minisearch": "^7.2.0"
```

**Search API:**
- `initializeSRDSearch()` — Fetches index, builds Fuse + MiniSearch indexes (~15-40ms)
- `searchSRD(query, options)` — Returns ranked results with score explanations
- `getSuggestions(query, limit)` — Debounce-safe autocomplete (section-grouped, max 3 per section)
- `getSimilarChunks(chunkId, limit)` — Canonical + Jaccard tag similarity
- `recordSearch(query)` — Persists to localStorage for recent searches

**Ranking formula:**
```
finalScore = (fuseScore × 0.4) + (miniScore × 0.6)
           × titleExactBoost(3.0) × titleFuzzyBoost(2.0) × tagMatchBoost(1.5)
           × sectionContext(1.3) × recentlyViewed(1.2)
```

**Hook returns:** `results`, `suggestions`, `recentSearches`, `isLoading`, `isIndexReady`, `query`, `didYouMean`, `stats`, `search()`, `selectResult()`, `clearSearch()`, `clearHistory()`, `getSimilar()`

### 5. Build the Canonical Similarity Map

**Agent:** `srd-compliance`

**File created:** `frontend/src/lib/srdSimilarityMap.ts` (978 lines)

**Exports:**
- `CANONICAL_SIMILARITY_MAP` — 110 curated entries (one per canonical chunk) mapping chunk IDs to related chunk IDs
- `getCanonicalSimilar(chunkId, limit?)` — Lookup function (default limit 4)

**Relationship categories encoded:**
1. Classes ↔ Domain Card Appendix entries (per SRD class-domain assignments)
2. Domain Card Appendix ↔ Classes (reverse links + domain-pair siblings)
3. Domains Overview ↔ all Appendix domain card entries
4. Classes ↔ Ancestries (thematic: e.g. Drakona→Sorcerer, Dwarf→Guardian)
5. Communities ↔ Ancestries (thematic: e.g. Ridgeborne→Dwarf/Firbolg/Giant)
6. Core Mechanics cross-references (weapons↔armor, stress↔death, action rolls↔combat)
7. Character Creation ↔ core materials (ancestries, communities, domains, equipment)
8. Running an Adventure ↔ Core Mechanics
9. Multi-part chunk continuations (all adjacent parts linked)

**Integration:** `getSimilarChunks()` in `srdSearch.ts` uses canonical map first, fills remaining slots with Jaccard similarity.

**To adapt for homebrew:** Create a new similarity map for homebrew content following the same pattern. The `getCanonicalSimilar()` function interface stays the same.

### 6. Build the UI Components

**Agent:** `front-end`

**Files created:**

| File | Purpose | Lines |
|------|---------|-------|
| `frontend/src/app/rules/page.tsx` | Main Rules page (drill-down + search modes) | ~305 |
| `frontend/src/components/srd/SRDHero.tsx` | Hero with bg image + gradient + search slot | 70 |
| `frontend/src/components/srd/SRDSearchBar.tsx` | ARIA combobox with keyboard nav, suggestions | 348 |
| `frontend/src/components/srd/SRDSectionGrid.tsx` | Drill-down Level 0: section card grid (9 sections) | ~100 |
| `frontend/src/components/srd/SRDDrillDownHeader.tsx` | Back button + section heading for Level 1 | ~50 |
| `frontend/src/components/srd/SRDAccordionItem.tsx` | CSS grid 0fr→1fr accordion, lazy render | 157 |
| `frontend/src/components/srd/SRDAccordionList.tsx` | Groups by subsection, stagger animation | 123 |
| `frontend/src/components/srd/SRDProseContent.tsx` | Flowing prose for Introduction/CharCreation/Core | 132 |
| `frontend/src/components/srd/SRDResultsView.tsx` | Grouped search results + similar pills | 200 |
| `frontend/src/hooks/useDebounce.ts` | Generic debounce hook | ~15 |

**Deprecated (no longer imported):**
| `frontend/src/components/srd/SRDSectionTabs.tsx` | Was horizontal tablist; replaced by SRDSectionGrid |

**Files modified:**

| File | Change |
|------|--------|
| `frontend/src/components/AppHeader.tsx` | Added "Rules" to `NAV_LINKS` array (line 49-56) |
| `frontend/src/app/globals.css` | Added `.srd-hero-gradient`, `.srd-accordion-grid`, `.prose-srd` (lines 280-331) |

**Key UI patterns:**
- **Navigation:** "Rules of Daggerheart" added as nav link in AppHeader; opens `/rules` page with drill-down section grid
- **Drill-down:** Level 0 = 9-card section grid; Level 1 = section detail with back button; search mode overrides drill-down but preserves `activeSection` state
- **State:** `activeSection: string | null` (null = Level 0 grid). React state for v1, not URL params.
- **Transitions:** `key={contentKey}` with `animate-fade-in` (0.2s ease-out, 4px translateY) for view swaps
- **Search:** Large search bar in hero, sticky below header; ARIA combobox + listbox; 250ms debounced suggestions; recent searches on empty focus
- **Accordion:** CSS grid `0fr→1fr` animation (not `max-height`); lazy render (null until first expand); section badge pills
- **Prose mode:** Auto-selected for Introduction, Character Creation, and Core Mechanics sections; subsection grouping with anchored headers
- **Section card colors:** Each section card has a distinctive color (burgundy, amber, emerald, violet, gold, coral, parchment) with matching icon

### 7. UX Coherence Pass + Phase 2 Color Remediation

**Agent:** `ux-architect`, `front-end`

**Purpose:** Ensure all new components use existing design tokens, patterns, and accessibility conventions. Phase 2 replaced the steel-400 accent with gold-400 and added per-section card colors.

**Changes applied across all SRD components:**
- Replaced all `steel-400` / `text-steel-accessible` with `gold-400` / `text-gold-400` (primary accent)
- Per-section `SECTION_COLOURS` maps updated in SRDSearchBar, SRDAccordionItem, SRDResultsView to use 9 canonical sections
- Section badges use distinctive colors: burgundy (Classes), amber (Ancestries), emerald (Communities), violet (Domains), coral (Running an Adventure), gold (Character Creation, Core Mechanics), parchment (Introduction, Appendix)
- Open accordion border changed from `slate-700/80` to `burgundy-800/60`
- Subsection prefix text changed from `steel-400/70` to `parchment-600`
- Hero gradient now includes warm burgundy-900 tint at top
- Aligned container patterns with `CollapsibleSRDDescription` (`border-slate-700/60 bg-slate-850/50`)
- Verified ARIA patterns, font families, border-radius, and animation classes

### 8. Build and Deploy

**Build:**
```bash
cd frontend
npx next build    # Compiles + type-checks + generates static export to out/
```

**Verify route appears in build output:**
```
├ ○ /rules    29.9 kB    204 kB
```

**Deploy to dev:**
```bash
cd frontend
npm run deploy:dev
```

This runs `next build` then `node scripts/deploy-s3.mjs`, which:
1. Uploads all files from `out/` to the dev S3 bucket
2. Deletes stale objects no longer in `out/`
3. Creates a CloudFront invalidation (`/*`)

**Required env vars in `frontend/.env.local`:**
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `FRONTEND_S3_BUCKET`
- `CF_DISTRIBUTION_ID`
- `AWS_REGION`

**Production deploy (when ready):**
```bash
cd frontend
npm run deploy:prod
```

---

## File Inventory (All New/Modified Files)

### New files (19)
```
shared/types/srd.ts
scripts/chunk-srd.ts
scripts/chunk-srd.mjs
frontend/public/srd-index.json
frontend/scripts/build-srd-index.mjs
frontend/scripts/test-srd-search.mjs
frontend/src/lib/srdSearch.ts
frontend/src/lib/srdSimilarityMap.ts
frontend/src/hooks/useSRDSearch.ts
frontend/src/hooks/useDebounce.ts
frontend/src/app/rules/page.tsx
frontend/src/components/srd/SRDHero.tsx
frontend/src/components/srd/SRDSearchBar.tsx
frontend/src/components/srd/SRDSectionGrid.tsx
frontend/src/components/srd/SRDDrillDownHeader.tsx
frontend/src/components/srd/SRDAccordionItem.tsx
frontend/src/components/srd/SRDAccordionList.tsx
frontend/src/components/srd/SRDProseContent.tsx
frontend/src/components/srd/SRDResultsView.tsx
```

### Deprecated files (still present, no longer imported)
```
frontend/src/components/srd/SRDSectionTabs.tsx   (replaced by SRDSectionGrid)
```

### Modified files (4)
```
frontend/src/components/AppHeader.tsx      (added nav link)
frontend/src/app/globals.css               (added 3 CSS utilities)
frontend/package.json                      (added deps + scripts)
frontend/scripts/build-prod.mjs            (added SRD index build step)
```

### Design docs (3)
```
markdown/usability/rules-page-ux-architecture.md   (Phase 1 UX spec)
markdown/usability/rules-page-drill-down-spec.md   (Phase 2 drill-down + color spec)
.opencode/runbooks/searchable-srd.md (this file)
```

---

## Adapting for Homebrew / Homebrew Kit

To repeat this process for homebrew content:

1. **Chunker:** Modify `scripts/chunk-srd.mjs` to scan homebrew markdown directories. Output to `frontend/public/homebrew-index.json`.

2. **Types:** Reuse `SRDChunk` from `shared/types/srd.ts` (the structure is generic).

3. **Search engine:** `srdSearch.ts` already accepts any `SRDChunk[]` array. Create a parallel `useHomebrewSearch.ts` hook or add a `source` parameter to the existing hook.

4. **Similarity map:** Create `frontend/src/lib/homebrewSimilarityMap.ts` following the same `getCanonicalSimilar()` interface. Focus on homebrew-specific relationships.

5. **UI components:** All `SRD*` components in `frontend/src/components/srd/` are reusable. Either:
   - Rename the directory to something generic (e.g., `content-browser/`) and parameterize the section list, OR
   - Duplicate the page at `frontend/src/app/homebrew-rules/page.tsx` with homebrew-specific config.

6. **Navigation:** Add another entry to `NAV_LINKS` in `AppHeader.tsx`.

7. **Build + deploy:** Same process — `npm run deploy:dev` for dev, `npm run deploy:prod` for production.

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Build fails with missing `srd-index.json` | Run `npm run build:srd-index` first, or use `npm run build:prod` which does it automatically |
| Search returns no results | Check that `frontend/public/srd-index.json` exists and has content |
| Deploy fails with missing AWS vars | Ensure all 5 AWS env vars are set in `frontend/.env.local` |
| Type errors in `srdSearch.ts` | Run `npx tsc --noEmit` from `frontend/` to identify issues |
| Stale CloudFront cache | Wait 5-10 min for invalidation or check AWS console for invalidation status |
| `node` not available in CI | Use `python3` for scripting fallbacks; the chunker has a `.mjs` variant |
