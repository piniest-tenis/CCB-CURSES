# Rules Page Redesign — Drill-Down Navigation & Vibrant Color Spec

**Author:** UX Architect Agent  
**Date:** 2026-04-11  
**Status:** Ready for Front-End Agent implementation  
**Supersedes:** Tab-bar portion of `rules-page-ux-architecture.md`

---

## Table of Contents

1. [Design Intent](#1-design-intent)
2. [Drill-Down Navigation UX](#2-drill-down-navigation-ux)
   - 2.1 Level 0 — Section Cards Landing
   - 2.2 Level 1 — Section Drill-In
   - 2.3 Level 2 — Accordion Detail (existing)
   - 2.4 Search Mode — Cross-Cutting Override
   - 2.5 State Management
   - 2.6 Transitions & Animations
3. [Color Assignments](#3-color-assignments)
   - 3.1 Primary Page Accent Change
   - 3.2 Section Card Color Map
   - 3.3 Hero Gradient Adjustments
   - 3.4 Search Bar Color Updates
   - 3.5 Accordion Item Color Updates
   - 3.6 Results View Color Updates
4. [Section Card Design](#4-section-card-design)
   - 4.1 Card Grid Layout
   - 4.2 Card Anatomy
   - 4.3 Hover & Active States
   - 4.4 Mobile Responsive Behavior
5. [Component Changes Required](#5-component-changes-required)
   - 5.1 Files to Modify
   - 5.2 Files to Create
   - 5.3 Files to Delete / Deprecate

---

## 1. Design Intent

### Problem

The current Rules page surfaces all content through a **horizontal tab bar** (`SRDSectionTabs.tsx`) pinned below the hero. This has three UX issues:

1. **Information overload on entry.** The user lands on the "All" tab, which dumps 454 entries into a flat accordion list. There's no table-of-contents moment — no opportunity to orient before diving in.

2. **The tab bar competes with the hero.** The sticky tabs sit in a neutral gray band that visually flattens the page. The user's eye has nowhere to rest between the atmospheric hero image and the monotone content below.

3. **Drab color identity.** The page relies almost exclusively on `steel-400` (`#577399`) as its accent color — a cool muted blue-gray. The rest of the app uses **burgundy** and **gold** as its primary identity palette. The Rules page feels disconnected, like a different product.

### Solution

Replace the tab bar with a **drill-down pattern** and infuse the page with the app's existing warm palette:

- **Level 0 (landing):** Large, colorful section cards act as a visual table of contents. The user sees the 7–9 top-level sections and chooses where to go. This is the "front cover" of the digital rulebook.
- **Level 1 (section view):** Drilling into a section shows its sub-entries as an accordion list, with a breadcrumb/back button to return to Level 0. The tab bar is gone — spatial memory (forward/back) replaces label scanning (which-tab-am-I-on).
- **Search mode:** Typing in the search bar replaces whatever drill-down level is visible with ranked results. Clearing search restores the user to their previous drill-down position.
- **Color shift:** Gold becomes the primary page accent (replacing steel). Each section card gets a distinctive accent from the existing palette. Burgundy appears in borders, dividers, and the hero gradient.

---

## 2. Drill-Down Navigation UX

### 2.1 Level 0 — Section Cards Landing

This is the **default view** when the user navigates to `/rules` with no URL params.

#### Component tree

```
<main> (content area)
  └── <SRDSectionGrid>
        ├── <SRDSectionCard section="Classes"           count={31}  />
        ├── <SRDSectionCard section="Adversaries"       count={15}  />
        ├── <SRDSectionCard section="Ancestries"        count={11}  />
        ├── <SRDSectionCard section="Communities"       count={18}  />
        ├── <SRDSectionCard section="Domains"           count={~200} />
        ├── <SRDSectionCard section="Environments"      count={9}   />
        └── <SRDSectionCard section="Rules & Definitions" count={14} />
```

> **Note on section list:** The user mentioned "Introduction, Character Creation, Core Mechanics, Running an Adventure, Appendix" as desired top-level cards. The current SRD data has section values of `Classes`, `Adversaries`, `Ancestries`, `Communities`, `Domains`, `Environments`, and `Rules & Definitions`. The card grid should show **all sections that exist in the loaded SRD data**, dynamically derived from `allChunks`. If the SRD data expands to include those additional sections (Introduction, etc.), they will appear automatically. For now, the 7 existing sections are the top-level cards.

#### Behavior

- Cards are laid out in a responsive grid (see [§4 Section Card Design](#4-section-card-design))
- Clicking a card transitions to Level 1 for that section
- Each card shows: section icon, section name, entry count, one-line description
- No "All" option at Level 0 — the landing IS the "all" view, conceptually
- The hero + search bar remain visible above the grid

#### When shown

- URL has no `?section=` parameter
- No active search query

---

### 2.2 Level 1 — Section Drill-In

When the user clicks a section card, the content area transitions to show the entries within that section.

#### Component tree

```
<main> (content area)
  ├── <SRDDrillDownHeader>
  │     ├── <BackButton onClick={goToLevel0}>
  │     │     └── "← All Sections"
  │     └── <h2> "Classes" <span className="count-badge">31</span> </h2>
  │
  └── [isListSection]
        <SRDAccordionList sectionLabel="Classes" chunks={...} />
      [!isListSection]
        <SRDProseContent sectionLabel="Rules & Definitions" chunks={...} />
```

#### Breadcrumb / Back button

A **back button** replaces the tab bar's role of "show me where I am." It sits at the top of the content area, left-aligned:

```
← All Sections
──────────────────────────────────
Classes                        31
```

- Text: `← All Sections` (uses the left-arrow character `←` or a FontAwesome `fa-arrow-left` icon)
- Font: `text-sm font-semibold` in `gold-400` to match the new page accent
- On click: navigates back to Level 0 (removes `?section=` from URL)
- On keyboard: Enter or Space activates. Focus ring uses `gold-400`.
- Below the back button: a section heading (`<h2>`) with the section name and entry count badge

#### Section heading

```html
<h2 class="font-serif text-2xl font-bold text-parchment-100">
  Classes
  <span class="ml-3 rounded-full bg-gold-400/15 px-2.5 py-0.5 text-sm font-bold text-gold-400">
    31
  </span>
</h2>
```

#### Content rendering

Identical to the current behavior:
- List sections → `SRDAccordionList` (accordion items)
- Prose sections → `SRDProseContent` (flowing articles)

The only difference is that the section is determined by the drill-down state, not a tab.

---

### 2.3 Level 2 — Accordion Detail (existing behavior)

Clicking an accordion item expands its content inline. This is **unchanged** from the current implementation in `SRDAccordionItem.tsx`. The lazy-render gate, CSS grid animation, and MarkdownContent rendering all remain as-is.

---

### 2.4 Search Mode — Cross-Cutting Override

#### Core rule

> **When the user types in the search bar, the entire content area below is replaced by search results. The drill-down cards/list disappear. Clearing search restores the previous drill-down level.**

#### Interaction flow

```
User is on Level 0 (section cards visible)
  │
  ├── User types "bloom" in search bar
  │     └── Content area: section cards FADE OUT
  │         Search results FADE IN (SRDResultsView)
  │
  ├── User clears search (clicks ✕ or deletes all text)
  │     └── Content area: search results FADE OUT
  │         Section cards FADE IN (restored to Level 0)
  │
User is on Level 1 (Classes accordion visible)
  │
  ├── User types "ranger" in search bar
  │     └── Content area: Classes accordion FADE OUT
  │         Search results FADE IN
  │
  ├── User clears search
  │     └── Content area: search results FADE OUT
  │         Classes accordion FADE IN (restored to Level 1, same section)
```

#### State preservation

The `activeSection` state (which drill-down level the user was on) is **not cleared** when search is active. It is merely visually overridden. When search clears, the previous `activeSection` is restored:

```typescript
// Pseudocode
const isSearching = debouncedQuery.trim().length > 0;

// Content rendering:
if (isSearching) {
  return <SRDResultsView />;
} else if (activeSection === null) {
  return <SRDSectionGrid />;    // Level 0
} else {
  return <SRDSectionDrillIn />;  // Level 1
}
```

This means `activeSection` is NOT touched by search. The URL also preserves both:
- `?section=Classes&q=ranger` — user is in Classes, searching for "ranger"
- Clearing search → `?section=Classes` — back to Classes accordion
- Going back to Level 0 → `/rules` — no params

---

### 2.5 State Management

#### URL parameters (bookmarkable, shareable)

| Param | Values | Default | Purpose |
|---|---|---|---|
| `section` | `"Classes"`, `"Adversaries"`, `"Ancestries"`, `"Communities"`, `"Domains"`, `"Environments"`, `"Rules & Definitions"` | _(absent = Level 0)_ | Which section is drilled into |
| `q` | Any string | _(absent = no search)_ | Active search query |

#### React state (ephemeral)

```typescript
// In page.tsx:

// Raw chunk storage — loaded once from srd-index.json
const [allChunks, setAllChunks] = useState<SRDChunk[]>([]);

// Search input value (pre-debounce)
const [inputValue, setInputValue] = useState("");
const debouncedQuery = useDebounce(inputValue, 250);

// Active section — null means Level 0
// OPTION A: React state (simpler, current approach)
const [activeSection, setActiveSection] = useState<string | null>(null);
// OPTION B: URL param via useSearchParams (bookmarkable)
// Recommendation: Use React state for v1, migrate to URL params in v2

// Derived
const isSearching = debouncedQuery.trim().length > 0;
```

**Recommendation: React state for v1.** The current implementation uses `useState` for `activeSection` and does not sync to URL params. Keeping this approach for the drill-down redesign minimizes risk. URL-param sync (`?section=`) can be added later as an enhancement without changing the component structure.

#### Navigation handlers

```typescript
// Go to Level 0 (back to section cards)
const goToSectionGrid = useCallback(() => {
  setActiveSection(null);
  window.scrollTo({ top: 0, behavior: "smooth" });
}, []);

// Go to Level 1 (drill into a section)
const drillIntoSection = useCallback((sectionId: string) => {
  setActiveSection(sectionId);
  window.scrollTo({ top: 0, behavior: "smooth" });
}, []);
```

---

### 2.6 Transitions & Animations

#### Level 0 → Level 1 (drill in)

```
Section cards → slide out left + fade out (200ms)
Section accordion → slide in from right + fade in (200ms, 50ms delay)
```

Use the existing `animate-fade-in` keyframe from `tailwind.config.ts` for the incoming content. For the outgoing content, simply unmount — the incoming animation provides enough visual continuity.

#### Level 1 → Level 0 (back)

```
Section accordion → fade out (150ms)
Section cards → fade in (200ms)
```

#### Search mode enter/exit

```
Content area → fade out (150ms)
Search results → animate-fade-in (200ms)
```

When search clears:
```
Search results → fade out (150ms)
Previous content → animate-fade-in (200ms)
```

#### Implementation

Wrap the content area in a keyed container that triggers the `animate-fade-in` animation on mount:

```tsx
<div
  key={isSearching ? "search" : (activeSection ?? "grid")}
  className="animate-fade-in"
>
  {/* content */}
</div>
```

The `key` change forces React to unmount/remount, which re-triggers the CSS animation. This is the same pattern used by the Lore carousel (`animate-lore-in`).

#### Reduced motion

All transitions are already gated by `prefers-reduced-motion: reduce` in `globals.css`. The `animate-fade-in` keyframe has an existing `prefers-reduced-motion` block in the Tailwind config. No additional work needed.

---

## 3. Color Assignments

### 3.1 Primary Page Accent Change

**Before:** `steel-400` (`#577399`) — cool, muted blue-gray  
**After:** `gold-400` (`#fbbf24`) — warm, vibrant gold

This is the single highest-impact change. Gold is already the app's accent color (`--accent: 42 87% 45%` in `globals.css`), used for XP dots, focus rings, highlights, and the global `*:focus-visible` outline. Making it the primary Rules page accent brings the page into visual alignment with the rest of the app.

#### Where gold replaces steel

| Element | Before (steel) | After (gold) |
|---|---|---|
| Hero eyebrow badge border/bg/text | `border-steel-400/40 bg-steel-400/10 text-steel-accessible` | `border-gold-400/40 bg-gold-400/10 text-gold-400` |
| Search bar focus border | `border-steel-400` | `border-gold-400` |
| Search bar focus ring shadow | `rgba(87,115,153,0.20)` | `rgba(251,191,36,0.20)` |
| Search icon color | `text-steel-400` | `text-gold-500` |
| Clear button focus ring | `focus:ring-steel-400` | `focus:ring-gold-400` |
| Accordion chevron color | `text-steel-400/70` | `text-gold-500/70` |
| Accordion focus ring | `focus:ring-steel-400` | `focus:ring-gold-400` |
| Section count header accent | `text-steel-accessible` | `text-gold-400` |
| Loading indicator text/icon | `text-steel-accessible` | `text-gold-400` |
| Prose section divider gradient | `from-steel-400/40` | `from-gold-400/40` |
| Subsection header text | `text-steel-400/80` | `text-gold-500/80` |
| "Did you mean?" link | `text-steel-accessible underline decoration-steel-400/50` | `text-gold-400 underline decoration-gold-400/50` |
| Suggestion dropdown header text | `text-steel-400/80` | `text-gold-500/80` |
| Similar pills border/bg/text | `border-steel-400/25 bg-steel-400/10 text-steel-accessible` | `border-gold-400/25 bg-gold-400/10 text-gold-400` |

#### Where steel is KEPT

Steel is **not eliminated** — it is retained where a cooler, subordinate accent is appropriate:

| Element | Keep steel? | Rationale |
|---|---|---|
| `SRDSearchBar` suggestion active bg | Yes, `bg-steel-400/15` | Subtle highlight, not a brand accent |
| Relevance score pill | Yes, `text-steel-400/50` | De-emphasized metadata |
| Subsection prefix text in accordion trigger | Yes, `text-steel-400/70` → **change to** `text-parchment-600` | Warmer neutral for metadata |

---

### 3.2 Section Card Color Map

Each top-level section card gets a **distinctive accent color** drawn from the existing palette. The goal is variety without cacophony — each card should feel like a chapter divider in a beautifully illustrated rulebook.

| Section | Accent Token | Hex | Icon (FontAwesome) | Border | Background | Text |
|---|---|---|---|---|---|---|
| **Classes** | `burgundy-500` | `#e0486e` | `fa-hat-wizard` | `border-burgundy-700` | `bg-burgundy-900/30` | `text-burgundy-300` |
| **Adversaries** | `coral-400` | `#f96854` | `fa-skull` | `border-coral-600` | `bg-coral-900/20` | `text-coral-300` |
| **Ancestries** | `gold-400` | `#fbbf24` | `fa-dna` | `border-gold-600` | `bg-gold-900/20` | `text-gold-300` |
| **Communities** | `parchment-400` | `#e8c96d` | `fa-people-group` | `border-parchment-600` | `bg-parchment-800/20` | `text-parchment-300` |
| **Domains** | `burgundy-400` | `#ec7592` | `fa-bolt` | `border-burgundy-600` | `bg-burgundy-900/20` | `text-burgundy-300` |
| **Environments** | `gold-500` | `#f59e0b` | `fa-mountain-sun` | `border-gold-700` | `bg-gold-900/20` | `text-gold-400` |
| **Rules & Definitions** | `parchment-500` | `#d4a94a` | `fa-scale-balanced` | `border-parchment-700` | `bg-parchment-900/20` | `text-parchment-400` |

#### Design rationale

- **Burgundy and gold dominate** — 5 of 7 cards use burgundy or gold family colors, anchoring the page in the app's identity
- **Coral appears once** (Adversaries) — the same color used for the Homebrew badge, giving Adversaries a sense of danger/uniqueness
- **Parchment appears twice** (Communities, Rules) — warm cream tones that read as "informational" rather than "action"
- **No steel, emerald, violet, teal, or amber** on the cards — these are Tailwind built-ins not in the custom palette; removing them eliminates the "random color chart" feel
- **All colors are from `tailwind.config.ts`** — no new tokens invented

#### Section descriptions (shown on cards)

| Section | Description |
|---|---|
| Classes | The 9 playable classes — their features, subclasses, and abilities. |
| Adversaries | Monsters, villains, and threats for Game Masters to wield. |
| Ancestries | The peoples of the world — their traits, cultures, and abilities. |
| Communities | Where your character comes from — the bonds that shaped them. |
| Domains | The 11 sources of power — domain cards from Level 1 through 10. |
| Environments | Terrains, weather, and hazards that shape the battlefield. |
| Rules & Definitions | Core mechanics, key terms, and how the game works. |

---

### 3.3 Hero Gradient Adjustments

The current hero gradient (`srd-hero-gradient` in `globals.css`) uses a cold dark-green base (`rgba(10, 16, 13, ...)`). This is fine — the background image itself provides warmth. But the eyebrow badge and subtitle text should be warmed up.

#### Changes to `SRDHero.tsx`

```diff
  {/* Eyebrow badge */}
  <p className="mb-3 inline-flex items-center gap-2 rounded-full
-   border border-steel-400/40 bg-steel-400/10 px-3 py-1
-   text-xs font-semibold uppercase tracking-widest text-steel-accessible">
+   border border-gold-400/40 bg-gold-400/10 px-3 py-1
+   text-xs font-semibold uppercase tracking-widest text-gold-400">
-   <i className="fa-solid fa-book-open text-[10px]" aria-hidden="true" />
+   <i className="fa-solid fa-book-open text-[10px] text-gold-500" aria-hidden="true" />
    System Reference Document
  </p>
```

The `srd-hero-gradient` CSS class itself does NOT need to change — the dark overlay blends well with any accent color. The gradient fades the atmospheric image; the accent colors live in the foreground text/badges.

#### Optional enhancement: add a subtle warm tint

If the team wants the gradient itself to feel warmer, add a faint burgundy layer:

```css
.srd-hero-gradient {
  background: linear-gradient(
    to bottom,
    rgba(74, 10, 20, 0.15)   0%,    /* burgundy-900 at 15% — barely visible warm tint */
    rgba(10, 16, 13, 0.90) 20%,
    rgba(10, 16, 13, 0.95) 55%,
    rgba(10, 16, 13, 1.00) 100%
  );
}
```

This is a low-risk, high-impact change — it makes the hero feel like it belongs to the same app as the Classes page without altering the dark base.

---

### 3.4 Search Bar Color Updates

#### `SRDSearchBar.tsx` — Exact class changes

**Combobox wrapper border (focused/open):**
```diff
- border-steel-400 shadow-[0_0_0_3px_rgba(87,115,153,0.20)]
+ border-gold-400 shadow-[0_0_0_3px_rgba(251,191,36,0.15)]
```

**Search icon:**
```diff
- <span className="pointer-events-none flex shrink-0 items-center pl-4 text-steel-400">
+ <span className="pointer-events-none flex shrink-0 items-center pl-4 text-gold-500">
```

**Clear button focus ring:**
```diff
- focus:ring-steel-400
+ focus:ring-gold-400
```

**"Did you mean?" link:**
```diff
- className="font-semibold text-steel-accessible underline decoration-steel-400/50
-   hover:decoration-steel-400 focus:ring-steel-400"
+ className="font-semibold text-gold-400 underline decoration-gold-400/50
+   hover:decoration-gold-400 focus:ring-gold-400"
```

**Dropdown header text:**
```diff
- text-steel-400/80
+ text-gold-500/80
```

**Dropdown active option background:**
```diff
- bg-steel-400/15 text-[#f7f7ff]
+ bg-gold-400/10 text-[#f7f7ff]
```

**Dropdown arrow hint:**
```diff
- text-steel-400
+ text-gold-400
```

**Section badge colors** (`SECTION_COLOURS` map): Keep per-section colors as-is — these provide useful categorical distinction within the dropdown. But change the "Classes" entry from steel to burgundy:

```diff
- Classes: "bg-steel-400/10 text-steel-accessible border-steel-400/30",
+ Classes: "bg-burgundy-900/20 text-burgundy-300 border-burgundy-700/30",
```

---

### 3.5 Accordion Item Color Updates

#### `SRDAccordionItem.tsx` — Exact class changes

**Outer border (open state):**
```diff
- ${isOpen ? "border-slate-700/80" : "hover:border-slate-700/60"}
+ ${isOpen ? "border-burgundy-800/60" : "hover:border-slate-600"}
```

**Focus ring:**
```diff
- focus:ring-steel-400
+ focus:ring-gold-400
```

**Chevron color:**
```diff
- text-steel-400/70
+ text-gold-500/60
```

**Subsection prefix text:**
```diff
- text-steel-400/70
+ text-parchment-600
```

**Content panel mobile subsection label:**
```diff
- text-steel-400/60
+ text-parchment-600/80
```

**Section badge colors** (`SECTION_COLOURS` map): Update the "Classes" entry:
```diff
- Classes: "bg-steel-400/10 text-steel-accessible border-steel-400/30",
+ Classes: "bg-burgundy-900/20 text-burgundy-300 border-burgundy-700/30",
```

---

### 3.6 Results View Color Updates

#### `SRDResultsView.tsx` — Exact class changes

**Result count accent:**
```diff
- <span className="text-steel-accessible">{results.length}</span>
+ <span className="text-gold-400">{results.length}</span>
```

**Empty state icon:**
```diff
- text-steel-400/30
+ text-gold-400/30
```

**Empty state query highlight:**
```diff
- <span className="text-steel-accessible">
+ <span className="text-gold-400">
```

**"Did you mean?" box border/bg:**
```diff
- border-steel-400/30 bg-steel-400/10
+ border-gold-400/30 bg-gold-400/10
```

**"Did you mean?" link:**
```diff
- text-steel-accessible underline decoration-steel-400/50
-   hover:decoration-steel-400 focus:ring-steel-400
+ text-gold-400 underline decoration-gold-400/50
+   hover:decoration-gold-400 focus:ring-gold-400
```

**Section divider colors** (`SECTION_DIVIDER` map): Update "Classes":
```diff
- Classes: "border-l-steel-accessible/60 text-steel-accessible",
+ Classes: "border-l-burgundy-400/60 text-burgundy-300",
```

**Similar pills:**
```diff
- border-steel-400/25 bg-steel-400/10 text-steel-accessible
-   hover:border-steel-400/50 hover:bg-steel-400/20
-   focus:ring-steel-400
+ border-gold-400/25 bg-gold-400/10 text-gold-400
+   hover:border-gold-400/50 hover:bg-gold-400/20
+   focus:ring-gold-400
```

#### `SRDAccordionList.tsx` — Exact class changes

**Count header accent:**
```diff
- <span className="text-steel-accessible">{sectionLabel}</span>
+ <span className="text-gold-400">{sectionLabel}</span>
```

**Empty state icon:**
```diff
- text-steel-400/30
+ text-gold-400/30
```

**Subsection divider header:**
```diff
- text-steel-400/80
+ text-gold-500/80
```

#### `SRDProseContent.tsx` — Exact class changes

**Count header accent:**
```diff
- <span className="text-steel-accessible">{sectionLabel}</span>
+ <span className="text-gold-400">{sectionLabel}</span>
```

**Empty state icon:**
```diff
- text-steel-400/30
+ text-gold-400/30
```

**Subsection divider gradient:**
```diff
- from-steel-400/40
+ from-gold-400/40
```

---

## 4. Section Card Design

### 4.1 Card Grid Layout

```
Desktop (≥1024px): 3 columns
Tablet  (≥640px):  2 columns
Mobile  (<640px):  1 column
```

Tailwind classes on the grid container:

```html
<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
  {sections.map(section => <SRDSectionCard key={section.id} ... />)}
</div>
```

This mirrors the `ClassesPage` card grid (`grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3`) for visual consistency across the app.

### 4.2 Card Anatomy

Each card is a `<button>` (not a link, since it changes in-page state, not a route):

```
┌──────────────────────────────────────────────┐
│                                              │
│  [icon]                          [count]     │
│                                              │
│  Section Name                                │
│                                              │
│  One-line description of what's inside       │
│  this section.                               │
│                                              │
└──────────────────────────────────────────────┘
```

#### Full JSX for a single card

```tsx
<button
  type="button"
  onClick={() => drillIntoSection(section.id)}
  className={`
    group relative block w-full rounded-xl border p-5 text-left
    transition-all duration-200
    shadow-card
    hover:shadow-card-fantasy-hover
    focus:outline-none focus:ring-2 focus:ring-gold-400 focus:ring-offset-2 focus:ring-offset-[#0a100d]
    min-h-[140px]
    ${section.borderClass}
    ${section.bgClass}
  `}
>
  {/* Top row: icon + count badge */}
  <div className="flex items-start justify-between mb-3">
    <span className={`flex h-10 w-10 items-center justify-center rounded-lg ${section.iconBgClass}`}>
      <i className={`fa-solid ${section.icon} text-lg ${section.iconTextClass}`} aria-hidden="true" />
    </span>
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${section.countBadgeClass}`}>
      {count} {count === 1 ? "entry" : "entries"}
    </span>
  </div>

  {/* Section name */}
  <h3 className="font-serif text-xl font-bold text-parchment-100 group-hover:text-gold-300 transition-colors">
    {section.label}
  </h3>

  {/* Description */}
  <p className="mt-1.5 text-sm text-parchment-500 leading-relaxed line-clamp-2">
    {section.description}
  </p>
</button>
```

#### Per-section card styling data

```typescript
const SECTION_CARD_CONFIG: Record<string, SectionCardConfig> = {
  Classes: {
    icon: "fa-hat-wizard",
    description: "The 9 playable classes — their features, subclasses, and abilities.",
    borderClass: "border-burgundy-800 hover:border-burgundy-600",
    bgClass: "bg-burgundy-950/20",
    iconBgClass: "bg-burgundy-900/40",
    iconTextClass: "text-burgundy-400",
    countBadgeClass: "bg-burgundy-900/40 text-burgundy-300",
  },
  Adversaries: {
    icon: "fa-skull",
    description: "Monsters, villains, and threats for Game Masters to wield.",
    borderClass: "border-coral-700 hover:border-coral-500",
    bgClass: "bg-coral-950/15",
    iconBgClass: "bg-coral-900/30",
    iconTextClass: "text-coral-400",
    countBadgeClass: "bg-coral-900/30 text-coral-300",
  },
  Ancestries: {
    icon: "fa-dna",
    description: "The peoples of the world — their traits, cultures, and abilities.",
    borderClass: "border-gold-700 hover:border-gold-500",
    bgClass: "bg-gold-950/15",
    iconBgClass: "bg-gold-900/30",
    iconTextClass: "text-gold-400",
    countBadgeClass: "bg-gold-900/30 text-gold-300",
  },
  Communities: {
    icon: "fa-people-group",
    description: "Where your character comes from — the bonds that shaped them.",
    borderClass: "border-parchment-700 hover:border-parchment-500",
    bgClass: "bg-parchment-900/10",
    iconBgClass: "bg-parchment-800/20",
    iconTextClass: "text-parchment-400",
    countBadgeClass: "bg-parchment-800/20 text-parchment-400",
  },
  Domains: {
    icon: "fa-bolt",
    description: "The 11 sources of power — domain cards from Level 1 through 10.",
    borderClass: "border-burgundy-700 hover:border-burgundy-500",
    bgClass: "bg-burgundy-950/15",
    iconBgClass: "bg-burgundy-900/30",
    iconTextClass: "text-burgundy-300",
    countBadgeClass: "bg-burgundy-900/30 text-burgundy-300",
  },
  Environments: {
    icon: "fa-mountain-sun",
    description: "Terrains, weather, and hazards that shape the battlefield.",
    borderClass: "border-gold-800 hover:border-gold-600",
    bgClass: "bg-gold-950/10",
    iconBgClass: "bg-gold-900/20",
    iconTextClass: "text-gold-500",
    countBadgeClass: "bg-gold-900/20 text-gold-400",
  },
  "Rules & Definitions": {
    icon: "fa-scale-balanced",
    description: "Core mechanics, key terms, and how the game works.",
    borderClass: "border-parchment-800 hover:border-parchment-600",
    bgClass: "bg-parchment-900/10",
    iconBgClass: "bg-parchment-800/15",
    iconTextClass: "text-parchment-500",
    countBadgeClass: "bg-parchment-800/20 text-parchment-400",
  },
};
```

### 4.3 Hover & Active States

**Hover:**
- Border brightens (each card has a hover border in the config above)
- Title text shifts to `text-gold-300` via `group-hover:text-gold-300`
- Shadow transitions from `shadow-card` to `shadow-card-fantasy-hover`
- Transition: `transition-all duration-200`

**Active (press):**
- `active:scale-[0.98]` — subtle press-in effect
- `active:shadow-card` — shadow drops back to resting state

**Focus (keyboard):**
- `focus:ring-2 focus:ring-gold-400 focus:ring-offset-2 focus:ring-offset-[#0a100d]`
- Uses the global gold focus style consistent with the rest of the app

### 4.4 Mobile Responsive Behavior

At mobile (`<640px`):
- Cards stack in a single column, full width
- Card minimum height: `min-h-[120px]` (reduced from 140px)
- Description text: `line-clamp-2` to prevent cards from becoming too tall
- Icon size: unchanged (40×40 is within comfortable touch target)
- The entire card is a single tap target (already a `<button>`)
- Tap targets meet WCAG 2.5.5: `min-h-[120px]` exceeds the 44px minimum

At tablet (`640px–1023px`):
- 2-column grid
- If 7 sections, the last card spans full width: add `last:sm:col-span-2 last:lg:col-span-1` to handle the odd count

At desktop (`≥1024px`):
- 3-column grid
- 7 cards: 2 full rows + 1 card on the third row (natural grid behavior)

---

## 5. Component Changes Required

### 5.1 Files to Modify

#### `frontend/src/app/rules/page.tsx` — MAJOR REWRITE

**Remove:**
- Import of `SRDSectionTabs` and `SRDSection` type
- The `SECTIONS` constant array (replaced by dynamic section derivation)
- The sticky tab strip `<div>` (lines 226–240)
- The `role="tabpanel"` and `aria-labelledby` attributes on `<main>` (no longer a tab panel — it's a drill-down region)

**Add:**
- Import of new `SRDSectionGrid` component
- Import of new `SRDDrillDownHeader` component
- `activeSection` state changed from `"all"` default to `null` default
- `drillIntoSection(sectionId)` handler
- `goToSectionGrid()` handler (back to Level 0)
- Dynamic `sectionCounts` derivation (already exists, keep it)
- Conditional content rendering with three branches:
  1. `isSearching` → `<SRDResultsView />`
  2. `activeSection === null` → `<SRDSectionGrid />`
  3. `activeSection !== null` → `<SRDDrillDownHeader />` + `<SRDAccordionList />` or `<SRDProseContent />`
- Wrapping the content in a keyed `<div>` for transition animation

**New page structure:**

```tsx
export default function RulesPage() {
  const [allChunks, setAllChunks] = useState<SRDChunk[]>([]);
  const [inputValue, setInputValue] = useState("");
  const debouncedQuery = useDebounce(inputValue, 250);
  const [activeSection, setActiveSection] = useState<string | null>(null);

  // ... useSRDSearch hook (unchanged) ...

  const isSearching = debouncedQuery.trim().length > 0;

  const filteredChunks = useMemo(() => {
    if (!activeSection) return allChunks;
    return allChunks.filter(c => c.section === activeSection);
  }, [allChunks, activeSection]);

  const sectionCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const chunk of allChunks) {
      counts[chunk.section] = (counts[chunk.section] ?? 0) + 1;
    }
    return counts;
  }, [allChunks]);

  // Determine if active section is a list section
  const isListSection = activeSection !== "Rules & Definitions";

  const drillIntoSection = useCallback((sectionId: string) => {
    setActiveSection(sectionId);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const goToSectionGrid = useCallback(() => {
    setActiveSection(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-[#0a100d]">
      <AppHeader />

      <SRDHero
        searchSlot={<SRDSearchBar ... />}
      />

      {/* NO TAB BAR — drill-down replaces it */}

      <main className="mx-auto w-full max-w-[1200px] flex-1 px-4 py-8">
        {/* Loading indicator (unchanged) */}

        <div
          key={isSearching ? "search" : (activeSection ?? "grid")}
          className="animate-fade-in"
        >
          {isSearching ? (
            <SRDResultsView ... />
          ) : activeSection === null ? (
            <SRDSectionGrid
              sectionCounts={sectionCounts}
              onSelectSection={drillIntoSection}
            />
          ) : (
            <>
              <SRDDrillDownHeader
                sectionLabel={activeSection}
                count={sectionCounts[activeSection] ?? 0}
                onBack={goToSectionGrid}
              />
              {isListSection ? (
                <SRDAccordionList
                  sectionLabel={activeSection}
                  chunks={filteredChunks}
                  groupBySubsection={
                    activeSection === "Domains" || activeSection === "Classes"
                  }
                />
              ) : (
                <SRDProseContent
                  chunks={filteredChunks}
                  sectionLabel={activeSection}
                />
              )}
            </>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
```

---

#### `frontend/src/components/srd/SRDHero.tsx` — MINOR

Replace steel accent colors with gold (see [§3.3](#33-hero-gradient-adjustments)):

| Line | Change |
|---|---|
| 42 | `border-steel-400/40` → `border-gold-400/40` |
| 42 | `bg-steel-400/10` → `bg-gold-400/10` |
| 42 | `text-steel-accessible` → `text-gold-400` |

---

#### `frontend/src/components/srd/SRDSearchBar.tsx` — MODERATE

All steel → gold accent swaps detailed in [§3.4](#34-search-bar-color-updates). Also update the `Classes` entry in `SECTION_COLOURS`.

---

#### `frontend/src/components/srd/SRDAccordionItem.tsx` — MODERATE

All steel → gold accent swaps detailed in [§3.5](#35-accordion-item-color-updates). Also update the `Classes` entry in `SECTION_COLOURS`.

---

#### `frontend/src/components/srd/SRDAccordionList.tsx` — MINOR

Steel → gold color swaps on count header and subsection dividers (see [§3.6](#36-results-view-color-updates)).

---

#### `frontend/src/components/srd/SRDResultsView.tsx` — MODERATE

Steel → gold swaps throughout. Update `Classes` in `SECTION_DIVIDER`. Update `SimilarPills` colors (see [§3.6](#36-results-view-color-updates)).

---

#### `frontend/src/components/srd/SRDProseContent.tsx` — MINOR

Steel → gold on count header, empty state icon, divider gradient (see [§3.6](#36-results-view-color-updates)).

---

#### `frontend/src/app/globals.css` — OPTIONAL

If the warm hero gradient tint is desired, modify `.srd-hero-gradient` (see [§3.3](#33-hero-gradient-adjustments)). Otherwise no changes needed.

---

### 5.2 Files to Create

#### `frontend/src/components/srd/SRDSectionGrid.tsx` — NEW

The Level 0 section cards grid.

**Props:**
```typescript
interface SRDSectionGridProps {
  /** Per-section entry counts, e.g. { Classes: 31, Adversaries: 15, ... } */
  sectionCounts: Record<string, number>;
  /** Called when the user clicks a section card */
  onSelectSection: (sectionId: string) => void;
}
```

**Responsibilities:**
- Renders the card grid using the `SECTION_CARD_CONFIG` data
- Displays dynamically: only sections that appear in `sectionCounts` are shown
- Each card is a `<button>` with the anatomy described in [§4.2](#42-card-anatomy)
- Grid layout: `grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3`

**Estimated size:** ~100 lines

---

#### `frontend/src/components/srd/SRDDrillDownHeader.tsx` — NEW

The back button + section heading shown at Level 1.

**Props:**
```typescript
interface SRDDrillDownHeaderProps {
  /** Section label, e.g. "Classes" */
  sectionLabel: string;
  /** Entry count for this section */
  count: number;
  /** Called when the user clicks the back button */
  onBack: () => void;
}
```

**JSX structure:**
```tsx
<div className="mb-6 space-y-3">
  {/* Back button */}
  <button
    type="button"
    onClick={onBack}
    className="
      group flex items-center gap-2 rounded-lg px-3 py-2
      text-sm font-semibold text-gold-400
      transition-colors hover:text-gold-300 hover:bg-gold-400/10
      focus:outline-none focus:ring-2 focus:ring-gold-400 focus:ring-offset-2 focus:ring-offset-[#0a100d]
      min-h-[44px]
    "
  >
    <i className="fa-solid fa-arrow-left text-xs transition-transform group-hover:-translate-x-0.5" aria-hidden="true" />
    All Sections
  </button>

  {/* Section heading + count */}
  <div className="flex items-baseline gap-3">
    <h2 className="font-serif text-2xl font-bold text-parchment-100">
      {sectionLabel}
    </h2>
    <span className="rounded-full bg-gold-400/15 px-2.5 py-0.5 text-sm font-bold text-gold-400">
      {count}
    </span>
  </div>

  {/* Divider */}
  <div className="h-px bg-gradient-to-r from-gold-400/30 to-transparent" aria-hidden="true" />
</div>
```

**Estimated size:** ~50 lines

---

### 5.3 Files to Delete / Deprecate

#### `frontend/src/components/srd/SRDSectionTabs.tsx` — DEPRECATE

This component is no longer rendered by the Rules page. However, it should NOT be deleted immediately:

1. **Check for other importers:** Grep for `SRDSectionTabs` across the codebase. Currently only imported by `rules/page.tsx`.
2. If no other importers exist, add a deprecation comment at the top of the file and remove the import from `page.tsx`.
3. Delete the file in a follow-up PR after confirming no regressions.

The `SRDSection` type export from this file is also imported by `page.tsx` — remove that import since the type is no longer needed (the active section is just a `string | null`).

---

## Appendix: Complete Color Migration Checklist

Use this as a QA checklist during implementation. Every `steel-400`, `steel-accessible`, or `#577399` reference on the Rules page and its SRD components should be evaluated:

| File | Token | Action |
|---|---|---|
| `SRDHero.tsx` | `border-steel-400/40` | → `border-gold-400/40` |
| `SRDHero.tsx` | `bg-steel-400/10` | → `bg-gold-400/10` |
| `SRDHero.tsx` | `text-steel-accessible` | → `text-gold-400` |
| `SRDSearchBar.tsx` | `border-steel-400` (focus) | → `border-gold-400` |
| `SRDSearchBar.tsx` | `shadow-[...rgba(87,115,153...)]` | → `shadow-[...rgba(251,191,36...)]` |
| `SRDSearchBar.tsx` | `text-steel-400` (icon) | → `text-gold-500` |
| `SRDSearchBar.tsx` | `focus:ring-steel-400` (clear btn) | → `focus:ring-gold-400` |
| `SRDSearchBar.tsx` | `text-steel-accessible` (did-you-mean) | → `text-gold-400` |
| `SRDSearchBar.tsx` | `decoration-steel-400/50` | → `decoration-gold-400/50` |
| `SRDSearchBar.tsx` | `text-steel-400/80` (dropdown hdr) | → `text-gold-500/80` |
| `SRDSearchBar.tsx` | `bg-steel-400/15` (active option) | → `bg-gold-400/10` |
| `SRDSearchBar.tsx` | `text-steel-400` (arrow hint) | → `text-gold-400` |
| `SRDSearchBar.tsx` | `SECTION_COLOURS.Classes` | → burgundy variant |
| `SRDSearchBar.tsx` | `focus:ring-steel-400` (did-you-mean) | → `focus:ring-gold-400` |
| `SRDAccordionItem.tsx` | `focus:ring-steel-400` | → `focus:ring-gold-400` |
| `SRDAccordionItem.tsx` | `text-steel-400/70` (chevron) | → `text-gold-500/60` |
| `SRDAccordionItem.tsx` | `text-steel-400/70` (subsection) | → `text-parchment-600` |
| `SRDAccordionItem.tsx` | `text-steel-400/60` (mobile sub) | → `text-parchment-600/80` |
| `SRDAccordionItem.tsx` | `SECTION_COLOURS.Classes` | → burgundy variant |
| `SRDAccordionList.tsx` | `text-steel-accessible` (header) | → `text-gold-400` |
| `SRDAccordionList.tsx` | `text-steel-400/30` (empty icon) | → `text-gold-400/30` |
| `SRDAccordionList.tsx` | `text-steel-400/80` (subsection hdr) | → `text-gold-500/80` |
| `SRDResultsView.tsx` | `text-steel-accessible` (count) | → `text-gold-400` |
| `SRDResultsView.tsx` | `text-steel-400/30` (empty icon) | → `text-gold-400/30` |
| `SRDResultsView.tsx` | `text-steel-accessible` (empty query) | → `text-gold-400` |
| `SRDResultsView.tsx` | `border-steel-400/30 bg-steel-400/10` (dym box) | → gold variant |
| `SRDResultsView.tsx` | `text-steel-accessible` (dym link) | → `text-gold-400` |
| `SRDResultsView.tsx` | `SECTION_DIVIDER.Classes` | → burgundy variant |
| `SRDResultsView.tsx` | `border-steel-400/25` etc. (similar pills) | → gold variant |
| `SRDProseContent.tsx` | `text-steel-accessible` (header) | → `text-gold-400` |
| `SRDProseContent.tsx` | `text-steel-400/30` (empty icon) | → `text-gold-400/30` |
| `SRDProseContent.tsx` | `from-steel-400/40` (divider) | → `from-gold-400/40` |
| `rules/page.tsx` | `border-steel-400/25 bg-steel-400/10` (loading) | → gold variant |
| `rules/page.tsx` | `text-steel-accessible` (loading text) | → `text-gold-400` |

**Total changes:** ~35 class string edits across 7 files + 2 new component files.

---

## Appendix: UX Decision Log

| Decision | Rationale |
|---|---|
| Drill-down via React state, not URL params | Simpler for v1; URL param sync can be layered later without structural changes. Avoids Next.js `useSearchParams` Suspense boundary complexity. |
| Back button instead of breadcrumb trail | Only 2 levels deep — a breadcrumb ("Rules > Classes") is visually heavier than "← All Sections" for the same information. |
| `<button>` cards instead of `<Link>` | Drill-down is in-page state change, not route navigation. Using `<button>` is semantically correct and avoids unnecessary route transitions. |
| Gold as primary accent (not burgundy) | Burgundy is the *brand identity* color (headers, borders, card glows) while gold is the *action/interaction* color (focus rings, XP, highlights). The Rules page is primarily interactive (search, click, drill), so gold is the correct lead accent. Burgundy appears in section card borders and structural elements. |
| Keep per-section colors in search badges | Categorical color coding in the dropdown helps users distinguish which section a suggestion comes from. These are small, subordinate elements — the variety is useful, not cluttering. |
| Warm hero tint is optional | The hero image already provides warmth. Adding `rgba(74,10,20,0.15)` to the gradient is a cosmetic enhancement, not a structural necessity. Ship without it, evaluate, add if it feels right. |
| No "All" option at Level 0 | The section grid IS the "all" view — showing everything organized by category. An "All entries" dump of 454 items is an anti-pattern; it provides quantity without structure. Users who want cross-section discovery use search. |
| `animate-fade-in` via key swap | The existing Tailwind keyframe animation is `prefers-reduced-motion`-safe and requires zero new CSS. Swapping the `key` prop forces React to remount, replaying the animation naturally. |
