# Rules of Daggerheart — UX Architecture Specification
**Branch:** `feature/searchable-srd`  
**Author:** UX Architect Agent  
**Date:** 2026-04-11  
**Status:** Authoritative — ready for Front-End Agent implementation

---

## Table of Contents
1. [Grounding Observations](#1-grounding-observations)
2. [Component Architecture Diagram](#2-component-architecture-diagram)
3. [Information Architecture Map](#3-information-architecture-map)
4. [Interaction Specifications](#4-interaction-specifications)
   - 4.1 Sub-Navigation Panel (REQ 2)
   - 4.2 Search UX (REQ 5)
   - 4.3 Accordion List Sections (REQ 8)
5. [State Management Design](#5-state-management-design)
6. [Accessibility Requirements](#6-accessibility-requirements)
7. [Mobile UX Adaptations](#7-mobile-ux-adaptations)
8. [Component Reuse Catalogue](#8-component-reuse-catalogue)
9. [Implementation Priority Order](#9-implementation-priority-order)
10. [CSS / Animation Addenda](#10-css--animation-addenda)

---

## 1. Grounding Observations

### What the codebase already does well
After reviewing all key files, the following existing patterns are directly reusable or
extendable without replacement:

| Pattern | File | Quality | Verdict |
|---|---|---|---|
| Hamburger mobile menu w/ `max-height` slide | `AppHeader.tsx:199–264` | ✅ Solid — Escape key, outside-click, focus-return | **Extend in-place** |
| Accordion w/ height detection | `CollapsibleSRDDescription.tsx` | ✅ Works, lazy image; has fixed `max-h-48` cap | **Extend: lift max-height cap, add count badge, add lazy render gate** |
| Search input + clear button | `CharacterSearchSortBar.tsx:82–118` | ✅ Full-featured base; missing dropdown | **Extend: add suggestions dropdown** |
| Keyboard listbox nav | `CharacterSearchSortBar.tsx:62–75` | ✅ Arrow keys, Escape, Enter | **Copy pattern for suggestion list** |
| Source filter segmented control | `SourceFilter.tsx` | ✅ `role="radiogroup"` + arrow-key nav | **Reuse as-is for section scope filter** |
| MarkdownContent w/ WikiLink + GFM | `MarkdownContent.tsx` | ✅ Full-featured | **Reuse as-is inside accordion panels** |
| `fade-in` + `slide-in-left` animations | `globals.css:169–258` | ✅ `prefers-reduced-motion` safe | **Reuse for panel animations** |
| Domain colour tokens | `tailwind.config.ts:46–131` | ✅ Full palette | **Reuse for section accent colours** |

### Critical gaps identified
1. **No `useSearchParams` / `useRouter` URL-sync pattern** for this kind of sub-page nav — needs to be built
2. **`CollapsibleSRDDescription` hard-caps at `max-h-96`** on sm+ — inadequate for full SRD entries
3. **No debounce utility** in `hooks/` — needs `useDebounce`
4. **No `recently-searched` storage pattern** — needs `localStorage` hook
5. **Sub-nav section concept does not exist** — net-new component

### Content scale (informs pagination/virtualization decisions)
| Section | Item count |
|---|---|
| Adversaries | 15 items |
| Ancestries | 11 items |
| Classes | 31 items |
| Communities | 18 items |
| Domains (folders) | 11 domains × avg 18 cards = ~200 cards |
| Environments | 9 items |
| Rules & Definitions | ~14 items across sub-folders |
| **Total searchable entries** | **~300 items** |

> **Decision:** 300 items does NOT require server-side pagination or virtualization.
> Full client-side filtering on a pre-fetched dataset is appropriate and aligns
> with the existing `useClasses` / `useDomains` pattern (aggressive stale/gc times).
> Infinite scroll is unnecessary; a "Show all" toggle after 20 visible results is sufficient.

---

## 2. Component Architecture Diagram

```
app/rules/page.tsx  (Server Component shell — no auth required)
│
└── RulesPageClient.tsx  ["use client"]  ← PRIMARY ORCHESTRATOR
    │   Props: none. Owns all URL-sync state.
    │
    ├── AppHeader.tsx  [REUSE AS-IS]
    │   └── (Rules of Daggerheart nav link added to NAV_LINKS array)
    │
    ├── RulesSubNav.tsx  [NEW]
    │   ├── SectionPill × 7  (Classes, Adversaries, Ancestries,
    │   │                      Communities, Domains, Environments,
    │   │                      Rules & Definitions)
    │   └── Animated slide-down panel (mirrors AppHeader mobile panel)
    │
    ├── RulesSearchBar.tsx  [NEW — extends CharacterSearchSortBar pattern]
    │   ├── SearchInput  (debounced, 250ms)
    │   │   └── ClearButton  (conditionally rendered)
    │   ├── SuggestionDropdown.tsx  [NEW]
    │   │   ├── RecentSearchesList  (localStorage)
    │   │   ├── SuggestionGroup × N  (grouped by section)
    │   │   │   └── SuggestionItem × 8 max  (name + section label)
    │   │   └── NoResultsMessage
    │   └── SectionScopeFilter  (SourceFilter.tsx pattern, REUSE/ADAPT)
    │
    ├── RulesContentArea.tsx  [NEW — conditional render based on activeSection]
    │   │
    │   ├── [section === null]  →  RulesLandingGrid.tsx  [NEW]
    │   │       └── SectionCard × 7  (icon, title, item count, description)
    │   │
    │   ├── [section === "classes"]  →  ClassesSection.tsx  [NEW]
    │   │   └── SRDAccordionList.tsx  [NEW — wraps CollapsibleSRDDescription]
    │   │       └── SRDAccordionItem × N  [EXTENDS CollapsibleSRDDescription]
    │   │           ├── AccordionHeader  (title + count badge + chevron)
    │   │           ├── [lazy gate — renders null until first expand]
    │   │           └── AccordionBody  → MarkdownContent  [REUSE AS-IS]
    │   │
    │   ├── [section === "adversaries"]  →  AdversariesSection.tsx  [NEW]
    │   │   └── SRDAccordionList.tsx  [SAME component, different data]
    │   │
    │   ├── [section === "ancestries"]   →  AncestriesSection.tsx   [NEW]
    │   ├── [section === "communities"]  →  CommunitiesSection.tsx  [NEW]
    │   ├── [section === "domains"]      →  DomainsSection.tsx      [NEW]
    │   ├── [section === "environments"] →  EnvironmentsSection.tsx [NEW]
    │   └── [section === "rules"]        →  RulesDefsSection.tsx    [NEW]
    │
    └── SearchResultsOverlay.tsx  [NEW — shown when query.length >= 2]
        ├── ResultsHeader  ("N results for 'query'" + Clear button)
        ├── ResultGroup × N  (grouped by section)
        │   ├── ResultGroupHeader  (section name + count badge)
        │   └── ResultCard × N  [NEW]
        │       ├── HighlightedTitle  (bold matched substring)
        │       ├── MatchedChunk  (context excerpt, terms highlighted)
        │       ├── SectionBreadcrumb  ("Adversaries · Tier 1 Leader")
        │       └── SimilarEntries  (max 3 chips)  [REQ 7]
        └── ShowMoreButton  (reveal next 10 results per group)
```

---

## 3. Information Architecture Map

### Mental model: "the rulebook as a filing cabinet"
Players think of game rules as a reference book with tabbed sections.
They don't think in database terms — they think:
> "I want to look up how Communities work" → go to Communities tab  
> "I want to find a specific spell name" → search for it  
> "I'm browsing, I want to explore Adversaries" → expand a few to read  

This dictates the IA: **section-first navigation, search as an override**.

### Section hierarchy
```
Rules of Daggerheart
├── Classes  (31 items)
│   ├── [Class Name]
│   │   ├── Overview / description
│   │   ├── Starting stats (EVA, HP)
│   │   ├── Subclasses (collapsible)
│   │   ├── Hope Feature
│   │   ├── Class Features
│   │   └── Background Questions
│   └── ...
│
├── Adversaries  (15 items)
│   ├── [Adversary Name]  +  tier badge
│   │   ├── Motives & Tactics
│   │   ├── Stats block (Difficulty, Thresholds, HP, Stress, Attack)
│   │   └── Features
│   └── ...
│
├── Ancestries  (11 items)
│   └── [Ancestry Name]  +  full markdown content
│
├── Communities  (18 items)
│   └── [Community Name]  +  full markdown content
│
├── Domains  (11 domains → ~200 cards)
│   └── [Domain Name]  +  domain colour accent
│       └── Cards by level (Level 1–10)
│
├── Environments  (9 items)
│   └── [Environment Name]  +  full markdown content
│
└── Rules & Definitions  (~14 items, some sub-grouped)
    ├── Core Terms  (Character, Creature, Player, Aura…)
    ├── Curses  (Curse, Linked Curse)
    └── Reputation  (Adherent, Attitude, Faction…)
```

### Navigation labelling decisions
- Use **"Rules of Daggerheart"** as the top-level nav link label (matches the ask)
- Use **section names verbatim** from markdown folders for cognitive alignment
- "Rules & Definitions" → display as **"Rules & Glossary"** in nav pills for brevity
  (users scan faster for "Glossary" than "Definitions")
- The landing grid shows all 7 sections as large scannable cards — zero clicks needed
  to understand what is available

### Progressive disclosure hierarchy
```
Level 0:  Landing grid — 7 section cards, item counts, one-sentence descriptions
Level 1:  Section view — all items listed, collapsed (title + type badge only)
Level 2:  Item expanded — full content rendered (lazy, on first open)
Level 3:  Search active — content replaced by cross-section results + Similar entries
```

---

## 4. Interaction Specifications

### 4.1 Sub-Navigation Panel (REQ 2)

#### Where it lives
The sub-nav panel sits **below the AppHeader sticky bar**, appearing when the user
is on `/rules` (or any `/rules?section=*` URL). It is NOT a second header — it is the
first content row of the page, visually separated from the AppHeader by a subtle
border, and sticky at `top: [AppHeader height]` so it remains visible while scrolling.

> **Rationale:** Making it a separate page-level sticky row (rather than a flyout from
> the nav link) avoids z-index collision with the AppHeader, keeps the AppHeader
> unmodified, and gives the section pills generous tap-target real estate on mobile.

#### Desktop layout (≥640px)
```
┌─────────────────────────────────────────────────────────────────┐
│  AppHeader (sticky, z-10)                                       │
├─────────────────────────────────────────────────────────────────┤
│  [Classes] [Adversaries] [Ancestries] [Communities]             │
│  [Domains] [Environments] [Rules & Glossary]          ← sticky  │
│  sub-nav (z-9, top: AppHeader height)                           │
├─────────────────────────────────────────────────────────────────┤
│  Search bar + scope filter                                      │
├─────────────────────────────────────────────────────────────────┤
│  Content area (scrolls)                                         │
└─────────────────────────────────────────────────────────────────┘
```

#### Mobile layout (<640px)
The 7 section pills are rendered as a **horizontally scrollable pill row**,
using `scrollbar-hide` (already in `globals.css:272`). No hamburger needed — the
pills are compact enough and the row is always visible.

```
┌─────────────────────────────────────┐
│  AppHeader (sticky)                 │
├─────────────────────────────────────┤
│  ← [Classes][Adversaries][Ancestries]→  (scroll horizontally)
│  sub-nav (sticky, top: AppHeader h) │
├─────────────────────────────────────┤
│  Search bar (full width)            │
├─────────────────────────────────────┤
│  Content (scrolls)                  │
└─────────────────────────────────────┘
```

#### Animation: appearing
- The sub-nav is always rendered on the `/rules` route — no "animate in on click"
- When the user **changes section**, the content area animates using the existing
  `animate-slide-in-left` class (`globals.css:251–258`) with `prefers-reduced-motion` support
- The active pill transitions its border/bg colour with `transition-colors duration-200`

#### Section pill anatomy
```
[  Classes  ]    ← active pill
 ↑ rounded-full border-2 border-[accent] bg-[accent]/15 text-[accent]

[  Adversaries  ]   ← inactive pill
 ↑ rounded-full border border-slate-700/60 bg-slate-900/60 text-parchment-500
   hover:border-[accent]/50 hover:text-parchment-300
```

Each section has a **designated accent colour** drawn from the existing
`tailwind.config.ts` palette:

| Section | Accent Token | Colour |
|---|---|---|
| Classes | `gold-400` | `#fbbf24` |
| Adversaries | `burgundy-500` | `#e0486e` |
| Ancestries | `coral-400` | `#f96854` |
| Communities | `parchment-400` | `#e8c96d` |
| Domains | `steel-400` | `#577399` |
| Environments | green (Tailwind `green-600`) | `#16a34a` |
| Rules & Glossary | `parchment-600` | `#b8872c` |

#### Interaction: clicking a section pill
1. URL updates: `router.push('/rules?section=classes')` (no full page reload)
2. Active pill receives accent border + bg
3. Content area swaps with `animate-slide-in-left` animation
4. Search input clears (section change = fresh context)
5. Page scroll position resets to content top
6. `aria-current="true"` moves to new active pill

#### Integration with AppHeader
Add a new entry to `NAV_LINKS` in `AppHeader.tsx`:
```typescript
{
  href: "/rules",
  label: "Rules of Daggerheart",
  baseColor: "border-parchment-600/40 bg-parchment-600/10 text-parchment-500 hover:bg-parchment-600/20 hover:border-parchment-600 focus:ring-parchment-600",
  activeColor: "border-parchment-600 bg-parchment-600/25 text-[#f7f7ff] focus:ring-parchment-600",
}
```

> **Mobile hamburger note:** The mobile panel in AppHeader already renders `NAV_LINKS`
> dynamically — adding the entry above automatically adds "Rules of Daggerheart" to the
> mobile menu at NO additional implementation cost.

---

### 4.2 Search UX (REQ 5)

#### Full interaction flow diagram
```
User focuses search input
        │
        ├─[input empty]─→  Show "Recently Searched" dropdown
        │                   (localStorage, max 5 terms, most recent first)
        │                   [↑↓ arrows navigate, Enter selects, Esc closes]
        │
        └─[user types]─→  Debounce timer starts (250ms)
                │
                ├─[< 2 chars]─→  No suggestions, no search
                │
                └─[≥ 2 chars, timer fires]─→  Client-side filter runs
                        │
                        ├─[suggestions]─→  SuggestionDropdown appears
                        │   • Max 8 suggestions
                        │   • Grouped by section (max 2 per section)
                        │   • Format: "[Entry Name]  ·  [Section]"
                        │   • Keyboard: ↑↓ navigate, Enter selects, Esc closes
                        │
                        └─[user hits Enter / clicks suggestion]
                                │
                                ├─  Term saved to localStorage recent searches
                                ├─  URL updates: /rules?q=bloom+heart&section=adversaries
                                ├─  SuggestionDropdown closes
                                └─  SearchResultsOverlay replaces content area
```

#### Suggestion dropdown anatomy
```
┌─────────────────────────────────────────────────────┐
│  🔍 [bloom heart              ] [✕]                 │  ← input row
├─────────────────────────────────────────────────────┤
│  ┌───────────────────────────────────────────────┐  │
│  │  ADVERSARIES                                  │  │
│  │  ● Bloom Heart                     Adversary  │  │ ← focused item
│  │    Bloom Tendrils                  Adversary  │  │
│  │  CLASSES                                      │  │
│  │    Blossom Ward (subclass)         Classes    │  │
│  └───────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

Dropdown specs:
- `position: absolute`, `z-index: 50` (above content, below AppHeader `z-10`)
- `min-width: 100%` of input, `max-width: 480px`
- `max-height: 320px`, `overflow-y: auto` with styled scrollbar
- Background: `bg-[#0a100d]/97 backdrop-blur-sm`
- Border: `border border-slate-700/60 rounded-xl shadow-xl`
- Appears with `animate-fade-in` (already in `globals.css` as `tailwind.config.ts` keyframe)

Suggestion item anatomy:
```
[●] Bloom Heart                          Adversaries
 ↑   ↑ font-medium text-[#f7f7ff]         ↑ text-xs text-steel-accessible
 selected indicator dot (accent color)
```

#### Recently searched row (input focused, empty)
```
┌────────────────────────────────────────┐
│  RECENTLY SEARCHED                     │  ← text-xs uppercase tracking-wider
│  ○ Bloom Heart         [Adversaries]  │
│  ○ Ranger Companions   [Rules]        │
│  ○ Splendor            [Domains]      │
│                                        │
│  [Clear history]                       │  ← text-xs parchment-600
└────────────────────────────────────────┘
```

#### Search results overlay anatomy
```
┌──────────────────────────────────────────────────────────────┐
│  14 results for "bloom"                    [Clear search ✕]  │
├──────────────────────────────────────────────────────────────┤
│  ADVERSARIES  · 2 results                                    │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  🗡 Bloom Heart                      Tier 1 Leader   │   │
│  │     "…a mass of dense, knotted Creep roughly the…"  │   │  ← excerpt
│  │     Matched: "bloom" in title + features            │   │
│  │     Similar: [Bloom Tendrils] [Madanikuputukas]     │   │  ← REQ 7
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  🗡 Bloom Tendrils                    Tier 1 Solo    │   │
│  │     "…the tendrils are a natural extension of…"     │   │
│  │     Similar: [Bloom Heart] [Quaddadura]              │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  DOMAINS  · 12 results                                       │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  [Bloom] (Domain card excerpt preview)               │   │
│  └──────────────────────────────────────────────────────┘   │
│  [Show 9 more Domains results ↓]                             │
└──────────────────────────────────────────────────────────────┘
```

#### Highlight algorithm
Use a simple mark-and-replace on the matched substring:
- Input: `"bloom"`, text: `"Bloom Heart"`
- Output: `<mark className="bg-gold-400/25 text-gold-200 rounded-sm px-0.5">Bloom</mark> Heart`
- Case-insensitive match; only the matched portion is wrapped
- Do NOT use `dangerouslySetInnerHTML` — use a split-and-wrap utility function

---

### 4.3 Accordion for List Sections (REQ 8)

#### Extended `CollapsibleSRDDescription` — delta from existing

The existing component (`CollapsibleSRDDescription.tsx`) uses a **scroll-height
detection** approach that auto-collapses if content exceeds 175px. For the SRD
accordion, we need the opposite default — **always start collapsed**, and only render
content after first expansion.

Create `SRDAccordionItem.tsx` as a **sibling** (not replacement) of
`CollapsibleSRDDescription.tsx`:

```
CollapsibleSRDDescription.tsx   ← UNCHANGED — character sheet use
SRDAccordionItem.tsx            ← NEW — SRD page use
```

Key differences:

| Behaviour | CollapsibleSRDDescription | SRDAccordionItem |
|---|---|---|
| Default state | Auto-detects (expands if short) | Always collapsed |
| Lazy render | No — content always in DOM | Yes — null until first expand |
| Count badge | No | Yes — `"14 Adversaries"` |
| Max height cap | `max-h-96` hard cap | None — full content height |
| Filtering sub-items | No | Yes — inline text filter |
| Section accent colour | None | Yes — per section |

#### Lazy render gate pattern
```tsx
const [hasExpanded, setHasExpanded] = useState(false);
const [isOpen, setIsOpen] = useState(false);

function handleToggle() {
  if (!hasExpanded) setHasExpanded(true);
  setIsOpen(o => !o);
}

// In JSX:
<div style={{ maxHeight: isOpen ? contentHeight : 0, overflow: 'hidden', transition: '...' }}>
  {hasExpanded && <MarkdownContent>{content}</MarkdownContent>}
</div>
```

> **Why this matters:** 300 items × MarkdownContent (react-markdown parse + remark-gfm)
> would be extremely heavy on initial render. Lazy gating keeps the initial paint fast.

#### Count badge placement
```
┌─────────────────────────────────────────────────────────────┐
│  Bloom Heart                           [Tier 1 Leader] [▼] │  ← collapsed
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  ADVERSARIES                              14 items    [▲]   │  ← section header
│  ┌──────────────────────────────────────────────────────┐   │
│  │  🔍 Filter within Adversaries…                       │   │  ← inline filter
│  └──────────────────────────────────────────────────────┘   │
│  [Bloom Heart]  [Tier 1 Leader]  [▼]                        │
│  [Bloom Tendrils]  [Tier 1 Solo]  [▼]                       │
│  [Captured Etherotaxic Entity]  [Tier 2 Solo]  [▼]          │
│  ...                                                         │
└─────────────────────────────────────────────────────────────┘
```

The **section-level** "Adversaries · 14 items" header is not itself an accordion —
it is a permanent `<h2>` section heading. The individual items ARE the accordion rows.

#### Animation spec
```css
/* Content expand */
transition: max-height 280ms cubic-bezier(0.4, 0, 0.2, 1),
            opacity 200ms ease-out;

/* Open: max-height → measured scrollHeight */
/* Closed: max-height → 0; opacity: 0 after 100ms delay */
```

Use `useRef` + `scrollHeight` measurement (same pattern as `CollapsibleSRDDescription`)
but without the auto-collapse height threshold. After expand, release `max-height: none`
(set in a `transitionend` handler) so the content is never clipped if the viewport resizes.

---

## 5. State Management Design

### Design principle: URL-first, React state for ephemeral UI

The guiding rule is: **anything a user might want to share, bookmark, or return to
lives in the URL. Everything else lives in React state.**

```
URL params (next/navigation → useRouter + useSearchParams)
│
├── ?section=adversaries     ← active section (null = landing grid)
├── ?q=bloom+heart           ← search query (when search is committed)
└── ?item=bloom-heart        ← deep-linked open accordion item (future)

React state (useState — ephemeral, not bookmarkable)
│
├── inputValue: string       ← live value of search input (pre-debounce)
├── suggestionOpen: boolean  ← whether dropdown is visible
├── expandedItems: Set<id>   ← which accordion items are open
└── hasExpandedItems: Set<id> ← which have ever been expanded (lazy gate)

localStorage (useLocalStorage hook — new utility)
│
└── "rules_recent_searches": string[]   ← max 5, FIFO push
```

### Hook composition

```typescript
// In RulesPageClient.tsx:

const searchParams = useSearchParams();
const router = useRouter();

// Derived from URL
const activeSection = searchParams.get('section') as SectionKey | null;
const committedQuery = searchParams.get('q') ?? '';

// Local ephemeral state
const [inputValue, setInputValue] = useState(committedQuery);
const debouncedInput = useDebounce(inputValue, 250);   // NEW HOOK

// Sync: when debounced input changes, update URL
useEffect(() => {
  const params = new URLSearchParams(searchParams.toString());
  if (debouncedInput.length >= 2) {
    params.set('q', debouncedInput);
  } else {
    params.delete('q');
  }
  router.replace(`/rules?${params.toString()}`, { scroll: false });
}, [debouncedInput]);
```

### Section navigation
```typescript
function navigateToSection(section: SectionKey | null) {
  const params = new URLSearchParams();
  if (section) params.set('section', section);
  // Clear search when changing section
  router.push(`/rules?${params.toString()}`, { scroll: false });
  setInputValue('');
}
```

### State isolation principle
- `expandedItems` and `hasExpandedItems` are local to `SRDAccordionList.tsx`
  (not lifted to page level). Each section renders its own accordion list.
- This prevents unnecessary re-renders: expanding an Adversary does not re-render
  the search bar or the section pills.

---

## 6. Accessibility Requirements

### 6.1 Section pill navigation (sub-nav)
```
role="tablist" aria-label="SRD Sections"
  → each pill: role="tab"
                aria-selected={isActive}
                aria-controls="rules-content-panel"
                tabIndex={isActive ? 0 : -1}

→ content area: role="tabpanel"
                id="rules-content-panel"
                aria-labelledby={activePillId}

→ Keyboard: Left/Right arrows move between tabs (like SourceFilter pattern)
            Home = first tab, End = last tab
            Escape = return focus to AppHeader nav
```

> Using `role="tablist"` instead of a generic `nav` here is deliberate: the pills
> swap a content panel in the same page, which is the textbook tab widget pattern.
> A `<nav>` would be appropriate if they navigated to different URLs.

### 6.2 Search input
```
<input
  type="search"          ← announces "search field" in screen readers
  role="combobox"        ← because it controls a popup listbox
  aria-expanded={suggestionOpen}
  aria-haspopup="listbox"
  aria-autocomplete="list"
  aria-controls="search-suggestions"
  aria-activedescendant={focusedSuggestionId}  ← tracks keyboard focus
  aria-label="Search Rules of Daggerheart"
/>

<ul
  id="search-suggestions"
  role="listbox"
  aria-label="Search suggestions"
>
  <li role="option" aria-selected={isFocused} id="suggestion-0">
    Bloom Heart · Adversaries
  </li>
  ...
</ul>
```

ARIA live region for result count:
```html
<p
  role="status"
  aria-live="polite"
  aria-atomic="true"
  className="sr-only"
>
  {results.length} results for "{query}"
</p>
```

### 6.3 Accordion items
```
<button
  type="button"
  aria-expanded={isOpen}
  aria-controls={`accordion-body-${id}`}
  id={`accordion-header-${id}`}
>
  {title}  <span aria-hidden="true">{isOpen ? "▲" : "▼"}</span>
</button>

<div
  id={`accordion-body-${id}`}
  role="region"
  aria-labelledby={`accordion-header-${id}`}
  hidden={!isOpen}   ← IMPORTANT: use hidden attr, not only CSS, so screen readers skip closed content
>
  {hasExpanded && <MarkdownContent>...</MarkdownContent>}
</div>
```

> **Note on `hidden` vs `max-height:0`:** Use both: set `hidden` attribute when
> closed (skips screen reader tree) AND use `max-height` CSS for the visual
> animation. Remove `hidden` immediately on open (before the transition starts)
> so the transition is visible. Add `hidden` after the close transition ends
> (via `transitionend` listener).

### 6.4 Search result highlight
```html
<!-- Do NOT use dangerouslySetInnerHTML -->
<span>
  <mark className="bg-gold-400/25 text-gold-200 rounded-sm px-0.5">
    Bloom
  </mark>
  {" Heart"}
</span>
```
The `<mark>` element carries semantic meaning ("highlighted text") that screen readers
announce, which is appropriate here — the highlight IS meaningful.

### 6.5 Focus management
| Trigger | Focus target |
|---|---|
| Section pill click | First accordion item in new section |
| Search suggestion selected | Search input (kept focused for further typing) |
| Accordion item expanded | Content of that item's `<div role="region">` |
| Search cleared | Search input |
| Escape in dropdown | Search input |
| Escape in mobile hamburger | Hamburger toggle button (existing pattern) |

### 6.6 Minimum tap targets
All interactive elements must be `min-h-[44px] min-w-[44px]` per WCAG 2.5.5.
- Section pills: `px-4 py-2.5 min-h-[44px]`
- Accordion headers: `px-4 py-4 min-h-[44px]`
- Suggestion items: `px-4 py-3 min-h-[44px]`

---

## 7. Mobile UX Adaptations

### Breakpoint strategy
This page uses the same `sm: 640px` breakpoint as AppHeader.

### Layout shifts at mobile

#### Sub-nav (< 640px)
```
[Classes][Adversaries][Ancestries][Communities]→  (horizontal scroll)
```
- `display: flex; flex-wrap: nowrap; overflow-x: auto; scrollbar-hide`
- Active pill has a bottom border indicator to remain visible even when partially scrolled
- Pills use shorter labels at mobile: "Classes", "Adversaries" — no truncation needed
  given the pill counts; all 7 fit at 375px width with 8px gap if font-size is 13px

#### Search (< 640px)
- Search input: `width: 100%` (no adjacent sort dropdown to share row)
- SuggestionDropdown: `max-width: 100vw - 32px`, positioned with care to not overflow
  the right viewport edge on narrow screens

#### Search results (< 640px)
- Result cards: full-width, single column
- Excerpt text capped at 3 lines (`line-clamp-3`) to avoid dominating the viewport
- "Similar entries" chips appear below the excerpt as a wrapping flex row

#### Accordion (< 640px)
- Accordion headers: `py-4` for generous touch target
- Content area: no `max-height` cap (existing `max-h-48` cap in `CollapsibleSRDDescription`
  is the problem — new `SRDAccordionItem` does NOT inherit this)
- At mobile, expanded content is `max-height: none` (fully expanded, user scrolls)

### Scroll behaviour
- Sub-nav bar: `position: sticky; top: [AppHeader height]` — both bars scroll away
  together when the user flicks up fast, but return when scrolling up slightly
  (standard sticky behaviour)
- No separate "back to top" button needed at this content scale

---

## 8. Component Reuse Catalogue

### ✅ REUSE AS-IS (zero changes)

| Component | Path | Why |
|---|---|---|
| `MarkdownContent` | `src/components/MarkdownContent.tsx` | Full-featured; renders all SRD markdown |
| `SourceBadge` | `src/components/SourceBadge.tsx` | Used on result cards for SRD attribution |
| `WarblerText` | `src/components/WarblerText.tsx` | If animated text is needed in section headings |
| `LoadingInterstitial` | `src/components/LoadingInterstitial.tsx` | For initial data fetch loading states |
| CSS animations | `globals.css: fade-in, slide-in-left, animate-lore-in` | All are `prefers-reduced-motion` safe |
| `scrollbar-hide` utility | `globals.css:272–278` | Horizontal-scroll pill row |
| `gameDataKeys` + `useRules` | `hooks/useGameData.ts` | `useRules()` hook already exists |
| `useClasses`, `useCommunities`, `useAncestries`, `useDomains`, `useAncestries` | `hooks/useGameData.ts` | All data hooks exist |

### 🔧 EXTEND (minor changes, same file)

| Component | Change needed | Risk |
|---|---|---|
| `AppHeader.tsx` | Add `"Rules of Daggerheart"` to `NAV_LINKS` array | Low — purely additive |
| `CollapsibleSRDDescription.tsx` | No changes to file; create sibling `SRDAccordionItem.tsx` | None |
| `CharacterSearchSortBar.tsx` | Extract the search input + clear button as a standalone `SearchInput.tsx` primitive; `CharacterSearchSortBar` then composes it | Medium — requires internal refactor of one file |
| `SourceFilter.tsx` | Used as-is for section-scope filter inside search bar; no changes | None |

### 🆕 NET-NEW COMPONENTS

| Component | Location | Size estimate |
|---|---|---|
| `RulesPageClient.tsx` | `src/app/rules/page.tsx` (client boundary) | Large — orchestrator |
| `RulesSubNav.tsx` | `src/components/rules/RulesSubNav.tsx` | Medium |
| `RulesSearchBar.tsx` | `src/components/rules/RulesSearchBar.tsx` | Medium |
| `SuggestionDropdown.tsx` | `src/components/rules/SuggestionDropdown.tsx` | Medium |
| `SearchResultsOverlay.tsx` | `src/components/rules/SearchResultsOverlay.tsx` | Large |
| `ResultCard.tsx` | `src/components/rules/ResultCard.tsx` | Small |
| `SRDAccordionList.tsx` | `src/components/rules/SRDAccordionList.tsx` | Medium |
| `SRDAccordionItem.tsx` | `src/components/rules/SRDAccordionItem.tsx` | Medium |
| `RulesLandingGrid.tsx` | `src/components/rules/RulesLandingGrid.tsx` | Small |
| `HighlightedText.tsx` | `src/components/rules/HighlightedText.tsx` | Small utility |

### 🆕 NET-NEW HOOKS

| Hook | Location | Purpose |
|---|---|---|
| `useDebounce.ts` | `src/hooks/useDebounce.ts` | 250ms debounce for search input |
| `useLocalStorage.ts` | `src/hooks/useLocalStorage.ts` | Typed localStorage with SSR safety |
| `useRulesSearch.ts` | `src/hooks/useRulesSearch.ts` | Cross-section client-side search + similarity |

---

## 9. Implementation Priority Order

Work in strict order — each phase produces a shippable, testable increment.

### Phase 1 — Foundation (unblocks all other work)
1. **`useDebounce.ts`** — 10 lines, zero dependencies. Everything else depends on it.
2. **`useLocalStorage.ts`** — SSR-safe (checks `typeof window`). Required for recent searches.
3. **Add "Rules of Daggerheart" to `AppHeader.tsx` `NAV_LINKS`** — ship the nav link first.
4. **`app/rules/page.tsx` shell** — Server component wrapper, no logic. Proves routing works.
5. **`RulesPageClient.tsx` skeleton** — URL param reading, section state, no content yet.

### Phase 2 — Navigation skeleton (visible progress)
6. **`RulesSubNav.tsx`** — Section pills with URL-sync. No content yet, but navigation works.
7. **`RulesLandingGrid.tsx`** — The 7 section cards landing view. Static, no data fetch.
8. **Wire `RulesPageClient` → SubNav → LandingGrid** — Full navigation flow works.

### Phase 3 — Content rendering (per section, one at a time)
9. **`SRDAccordionItem.tsx`** — Core lazy accordion. Build and test with static mock data.
10. **`SRDAccordionList.tsx`** — Wraps accordion items, adds count badge + inline filter.
11. **`AdversariesSection.tsx`** — First real section. Wire `useAdversaries` hook (or
    direct markdown fetch) → `SRDAccordionList`.
12. **Repeat for** `AncestriesSection`, `CommunitiesSection`, `EnvironmentsSection`,
    `RulesDefsSection`, `ClassesSection`, `DomainsSection`.

### Phase 4 — Search (the most complex feature)
13. **`HighlightedText.tsx`** — Small utility. Needed before result cards.
14. **`useRulesSearch.ts`** — Cross-section client-side search engine:
    - Index all loaded data by name + content snippet
    - Return top N matches with section label + similar entries
15. **`RulesSearchBar.tsx`** — Input + debounce + clear button. No dropdown yet.
16. **`SuggestionDropdown.tsx`** — Keyboard nav, groups, recent searches.
17. **`ResultCard.tsx`** — Single result with excerpt, breadcrumb, similar chips.
18. **`SearchResultsOverlay.tsx`** — Groups results by section, "show more" per group.
19. **Wire full search flow** — Input → debounce → filter → dropdown → results overlay.

### Phase 5 — Polish & deep-linking
20. **`?item=` URL param** for deep-linked open accordion item.
21. **Scroll-to-item** on URL load (if `?item=` is present, expand + scroll to that item).
22. **Similar entries algorithm** — implement cosine similarity or shared-tag grouping.
23. **`prefers-reduced-motion` audit** — verify all animations respect the flag.
24. **QA / Playwright tests** — keyboard nav, search flow, URL sync.

---

## 10. CSS / Animation Addenda

### Additions to `globals.css`
These are the ONLY CSS additions needed — everything else uses existing Tailwind utilities.

```css
/* ─── Rules page: accordion content expand ────────────────────────────────────
   Used by SRDAccordionItem. Separate from CollapsibleSRDDescription's
   max-height approach — this uses a grid trick for smooth height animation
   to/from auto without needing JS-measured scrollHeight.
   prefers-reduced-motion: instant open/close.
   ─────────────────────────────────────────────────────────────────────────── */
.accordion-grid {
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows 280ms cubic-bezier(0.4, 0, 0.2, 1);
}
.accordion-grid[data-open="true"] {
  grid-template-rows: 1fr;
}
.accordion-grid > div {
  overflow: hidden;
}

@media (prefers-reduced-motion: reduce) {
  .accordion-grid {
    transition: none;
  }
}

/* ─── Rules page: suggestion dropdown fade ────────────────────────────────────
   The Tailwind config fade-in keyframe works here but needs a separate
   class because it's used on an absolute-positioned element.
   ─────────────────────────────────────────────────────────────────────────── */
.animate-dropdown-in {
  animation: fade-in 0.15s ease-out;
}

@media (prefers-reduced-motion: reduce) {
  .animate-dropdown-in {
    animation: none;
  }
}

/* ─── Rules page: mark highlight ──────────────────────────────────────────────
   Applied to <mark> elements in search result text.
   ─────────────────────────────────────────────────────────────────────────── */
.search-highlight {
  background-color: rgba(251, 191, 36, 0.20);   /* gold-400/20 */
  color: #fde68a;                                /* gold-200 */
  border-radius: 2px;
  padding: 0 2px;
  font-weight: 500;
}
```

### Accordion grid trick — why it's better than `max-height`
The CSS grid `0fr → 1fr` trick animates to/from **true content height** without
requiring JavaScript to measure `scrollHeight`. This means:
- No layout shift on resize
- No content clipping if the entry is very long (Adversary with many features)
- Simpler code — no `useRef` + `ResizeObserver` + `scrollHeight` tracking
- Works correctly when the content changes length (e.g., filtered)

The trade-off: slightly less browser support, but `grid-template-rows` animation
is supported in all modern browsers (Chrome 107+, Firefox 110+, Safari 16+) and
degrades gracefully (instant open) in older browsers.

---

## Appendix: UX Decision Log

| Decision | Rationale |
|---|---|
| Sub-nav as sticky page row, not flyout | Avoids z-index conflicts with AppHeader; gives pills more space; mobile scroll row is simpler than a flyout |
| Client-side search, not server | 300 items fits comfortably; matches existing `useClasses` pattern; zero API changes |
| `SRDAccordionItem` as sibling (not replacement) of `CollapsibleSRDDescription` | Character sheet components must not be disturbed; SRD page needs fundamentally different defaults |
| `role="tablist"` for section pills | Semantically correct — pills swap a content panel on the same page; `<nav>` would be wrong here |
| No server-side pagination | 300 items; "Show 10 more" soft limit per group is sufficient |
| `?section=` + `?q=` in URL | Bookmarkable, shareable, Back-button friendly; cost is minimal URL-sync boilerplate |
| Accent colour per section | Gives each section a distinct visual identity without adding new colour tokens (uses existing palette) |
| Recently searched from localStorage | No backend needed; matches user's personal context; privacy-respecting (never sent to server) |
```
