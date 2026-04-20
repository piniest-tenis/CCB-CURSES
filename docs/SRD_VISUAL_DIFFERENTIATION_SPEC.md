# SRD Visual Differentiation Spec

## Design Directive

Transform the Level 1 drill-down views and search results from a homogeneous wall of identically-styled items into a visually rich, scannable, atmospheric tome experience. Every technique must serve cognitive scaffolding: helping the reader orient, chunk, skim, and find information without conscious effort.

**Aesthetic North Star**: A candlelit fantasy reference tome with marginal annotations, illuminated section breaks, and the feeling that each chapter was hand-bound. The page should breathe.

---

## Table of Contents

1. [Section-Colored Left-Border Accents on Accordion Items](#1-section-colored-left-border-accents)
2. [Subsection Group Containers — "Chapter Regions"](#2-subsection-group-containers)
3. [Overview Entry Hero Treatment](#3-overview-entry-hero-treatment)
4. [Ornamental Flourish Dividers](#4-ornamental-flourish-dividers)
5. [Prose Drop Caps & First-Paragraph Emphasis](#5-prose-drop-caps)
6. [Alternating Card Depth (Subtle Zebra)](#6-alternating-card-depth)
7. [Progressive Disclosure — "Show More" Pagination](#7-progressive-disclosure)
8. [Subsection Table-of-Contents (Sticky Mini-Nav)](#8-subsection-mini-nav)
9. [Scroll Progress Indicator](#9-scroll-progress-indicator)
10. [Search Results Enhancements](#10-search-results-enhancements)
11. [CSS Additions (globals.css)](#11-css-additions)
12. [Tailwind Config Additions](#12-tailwind-config-additions)
13. [Mobile Considerations](#13-mobile-considerations)
14. [Accessibility Audit](#14-accessibility-audit)
15. [Implementation Priority](#15-implementation-priority)

---

## 1. Section-Colored Left-Border Accents

### Problem
Every `SRDAccordionItem` uses the same `border-slate-700/60` border. When you're 15 items deep in "Running an Adventure," you've lost all visual signal of where you are.

### Solution
Add a 3px left border in the section's accent color to every accordion item. When a subsection exists, tint the border to a slightly different shade within the same hue family.

### Implementation: `SRDAccordionItem.tsx`

**Add a new prop and color map:**

```tsx
// ─── Section left-border accent map ────────────────────────────────────────
const SECTION_LEFT_BORDER: Record<string, string> = {
  Introduction:           "border-l-parchment-500/40",
  "Character Creation":   "border-l-gold-500/40",
  Classes:                "border-l-burgundy-500/40",
  Ancestries:             "border-l-amber-500/40",
  Communities:            "border-l-emerald-500/40",
  Domains:                "border-l-violet-500/40",
  "Core Mechanics":       "border-l-gold-500/40",
  "Running an Adventure": "border-l-coral-500/40",
  Appendix:               "border-l-parchment-600/40",
};

// Slightly brighter on hover/open
const SECTION_LEFT_BORDER_ACTIVE: Record<string, string> = {
  Introduction:           "border-l-parchment-400/70",
  "Character Creation":   "border-l-gold-400/70",
  Classes:                "border-l-burgundy-400/70",
  Ancestries:             "border-l-amber-400/70",
  Communities:            "border-l-emerald-400/70",
  Domains:                "border-l-violet-400/70",
  "Core Mechanics":       "border-l-gold-400/70",
  "Running an Adventure": "border-l-coral-400/70",
  Appendix:               "border-l-parchment-500/70",
};
```

**Modify the outer `<div>` classes:**

```diff
- rounded-lg border border-slate-700/60 bg-slate-850/50
+ rounded-lg border border-slate-700/60 bg-slate-850/50
+   border-l-[3px]
+   ${isOpen
+     ? `${SECTION_LEFT_BORDER_ACTIVE[chunk.section] ?? "border-l-slate-500/70"} border-slate-700/60`
+     : `${SECTION_LEFT_BORDER[chunk.section] ?? "border-l-slate-600/40"}`
+   }
```

Note: the `border-l-[3px]` sets a slightly thicker left border. The rest of the border stays `border-slate-700/60` (1px). This is the same "colored left rail" pattern used by GitHub issue labels, Notion databases, and Linear tickets — proven to be one of the strongest low-cognitive-cost differentiation signals.

### Rationale
- **Gestalt: Common Region** — A colored left edge groups items within the same section/subsection without needing explicit containers.
- **Peripheral vision** — Users can scan the left margin without reading titles.
- **Minimal cognitive cost** — This is a decorative affordance, not an interactive element. No learning curve.

### Accessibility
- The left border is decorative (`aria-hidden` not needed as it's CSS). Color is not the sole differentiator — section headings and labels provide text alternatives.
- 40% opacity on dark backgrounds preserves a subtle, non-distracting appearance while remaining visible. The active state at 70% provides sufficient contrast for sighted orientation cues.

---

## 2. Subsection Group Containers — "Chapter Regions"

### Problem
The current subsection divider is a single line of `text-gold-500/80 uppercase tracking-widest` text followed by `h-px bg-slate-800/60`. This is visually indistinguishable from a regular gap between items. On "Running an Adventure" with 4 subsections containing 33 total chunks, the subsection labels are quickly scrolled past and forgotten.

### Solution
Wrap each subsection group in a visually distinct "chapter region" container with:
- A tinted background panel
- A decorative header with the subsection name, item count, and a flourish
- An inset shadow that creates a "recessed page" feel
- Additional bottom margin for breathing room

### Implementation: `SRDAccordionList.tsx`

**New subsection header design:**

Replace the existing subsection divider block:

```diff
- {subsection && (
-   <div className="mb-3 flex items-center gap-3">
-     <h3 className="text-sm font-bold uppercase tracking-widest text-gold-500/80">
-       {subsection}
-     </h3>
-     <div className="h-px flex-1 bg-slate-800/60" aria-hidden="true" />
-   </div>
- )}

+ {subsection && (
+   <div className="mb-4 mt-2">
+     {/* Ornamental divider above subsection */}
+     <div className="mb-4 flex items-center gap-3" aria-hidden="true">
+       <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gold-400/20 to-transparent" />
+       <i className="fa-solid fa-diamond text-[6px] text-gold-400/30" />
+       <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gold-400/20 to-transparent" />
+     </div>
+     {/* Subsection title row */}
+     <div className="flex items-baseline gap-3">
+       <h3 className="font-serif-sc text-base font-bold tracking-wide text-gold-400/90">
+         {subsection}
+       </h3>
+       <span className="text-xs tabular-nums text-parchment-600/50">
+         {groupChunks.length} {groupChunks.length === 1 ? "entry" : "entries"}
+       </span>
+       <div className="h-px flex-1 bg-gradient-to-r from-gold-400/25 to-transparent" aria-hidden="true" />
+     </div>
+   </div>
+ )}
```

**Wrap each subsection `<section>` in a container:**

```diff
- <section key={subsection || "__root__"} aria-label={subsection || sectionLabel}>
+ <section
+   key={subsection || "__root__"}
+   aria-label={subsection || sectionLabel}
+   className={
+     subsection
+       ? "rounded-xl bg-slate-900/40 px-4 py-5 ring-1 ring-slate-700/30 sm:px-5"
+       : ""
+   }
+ >
```

**Increase gap between subsection groups:**

```diff
- <div className="space-y-6">
+ <div className="space-y-8">
```

### Rationale
- **Gestalt: Enclosure** — The background panel + ring border creates a clear visual region, solving the "where does this group end?" problem.
- **Font-serif-sc** — Using the small-caps serif variant for subsection names gives them a "chapter heading" weight that separates them from both item titles (font-sans/body) and page-level headers (font-serif).
- **Entry count** — Tells the user how much content is in each subgroup, setting expectations before they scroll.
- **Ring instead of border** — `ring-1` renders as a box-shadow, so it doesn't affect layout calculations. Subtle and doesn't shift content.

### Accessibility
- `aria-label` on each `<section>` remains unchanged — screen readers announce the subsection name.
- The background tint is decorative; content remains the same color and contrast.
- The diamond icon is `aria-hidden`.

---

## 3. Overview Entry Hero Treatment

### Problem
In sections like "Classes" or "Ancestries," the first chunk is typically an overview (e.g., "Classes Overview"). It's styled identically to the 9 class entries that follow, despite being fundamentally different content — it's a guide, not an entity.

### Solution
Detect overview/intro chunks (by convention: title contains "Overview" or is the first chunk with `level === 1`) and render them with a distinct "feature card" treatment: wider padding, a warm background gradient, an icon, and a different typography scale.

### Implementation: `SRDAccordionList.tsx`

**Add detection logic:**

```tsx
// Detect overview chunks — they should be styled as "hero" introductions
function isOverviewChunk(chunk: SRDChunk, index: number): boolean {
  const titleLower = chunk.title.toLowerCase();
  return (
    index === 0 &&
    (titleLower.includes("overview") ||
     titleLower.includes("introduction") ||
     chunk.level === 1)
  );
}
```

**Render the overview entry differently:**

```tsx
{isOverviewChunk(chunk, i) ? (
  <div
    key={chunk.id}
    role="listitem"
    className="animate-slide-in-left"
  >
    <SRDAccordionItem
      chunk={chunk}
      defaultOpen={true}
      className="
        border-l-[3px] border-l-gold-400/50
        bg-gradient-to-br from-gold-400/[0.04] via-slate-850/50 to-slate-850/50
        ring-1 ring-gold-400/10
      "
    />
  </div>
) : (
  /* … standard rendering … */
)}
```

### Rationale
- **Content hierarchy signal**: Overview content serves as a "chapter epigraph" — it deserves visual weight to signal "read this first."
- **Default open**: Overviews should be readable immediately since they contextualize the entries that follow.
- **Warm gradient**: The faint gold tint creates warmth without competing with the section accent color.

### Accessibility
- `defaultOpen={true}` means `aria-expanded` starts as `true` — correct behavior.
- The gradient is purely decorative; no contrast impact on text.

---

## 4. Ornamental Flourish Dividers

### Problem
The gap between subsection groups is just whitespace. There's no visual "section break" that says "you are now entering a new chapter."

### Solution
Add a reusable `SRDFlourish` decorative divider component and use it between subsection groups and before/after significant content blocks.

### Implementation: New inline component (or in `SRDAccordionList.tsx`)

```tsx
/** Ornamental rule line with center diamond — purely decorative. */
function SRDFlourish({ className = "" }: { className?: string }) {
  return (
    <div
      className={`flex items-center gap-2 py-1 ${className}`}
      role="separator"
      aria-hidden="true"
    >
      <div className="h-px flex-1 bg-gradient-to-r from-transparent to-gold-400/15" />
      <div className="flex items-center gap-1.5 text-gold-400/20">
        <div className="h-px w-4 bg-gold-400/20" />
        <i className="fa-solid fa-diamond text-[5px]" />
        <div className="h-px w-4 bg-gold-400/20" />
      </div>
      <div className="h-px flex-1 bg-gradient-to-l from-transparent to-gold-400/15" />
    </div>
  );
}
```

**Usage — between subsection groups in `SRDAccordionList.tsx`:**

```tsx
{Array.from(grouped.entries()).map(([subsection, groupChunks], groupIndex) => (
  <React.Fragment key={subsection || "__root__"}>
    {/* Flourish between groups (not before the first) */}
    {groupIndex > 0 && subsection && (
      <SRDFlourish className="my-2" />
    )}
    <section /* … */ >
      {/* … */}
    </section>
  </React.Fragment>
))}
```

**Usage — between prose articles in `SRDProseContent.tsx`:**

Already has `space-y-8` between articles. Add a flourish between subsection groups:

```tsx
{groups.map(([subsection, groupChunks], groupIndex) => (
  <React.Fragment key={subsection}>
    {groupIndex > 0 && <SRDFlourish className="my-4" />}
    <section /* … */>
      {/* … */}
    </section>
  </React.Fragment>
))}
```

### Rationale
- **Visual rhythm**: Flourishes create a predictable cadence: content → flourish → content. The eye learns this pattern quickly and can skip ahead.
- **Fantasy tome aesthetic**: Diamond + gradient rule lines are the CSS equivalent of printer's ornaments in medieval manuscripts. They say "new chapter" without saying anything.
- **Low visual weight**: At 15-20% opacity, these never compete with content.

### Accessibility
- `role="separator" aria-hidden="true"` — correctly marked as decorative. Screen readers ignore it.

---

## 5. Prose Drop Caps & First-Paragraph Emphasis

### Problem
In prose sections (Introduction, Character Creation, Core Mechanics), every article starts with the same text weight. There's no visual hook to draw the eye into the content.

### Solution
Add a CSS drop cap on the first letter of the first paragraph inside prose articles, and increase the font size of the first paragraph.

### Implementation: `globals.css`

```css
/* ─── SRD Prose Drop Cap ──────────────────────────────────────────────────────
   First letter of the first paragraph in a prose article gets a drop cap
   treatment — illuminated manuscript style.
   ─────────────────────────────────────────────────────────────────────────── */
.prose-srd-article > .prose-srd > div > span.block:first-child::first-letter {
  float: left;
  font-family: "jetsam-collection-basilea", "double-pica", Georgia, serif;
  font-size: 3.25em;
  line-height: 0.8;
  padding-right: 0.08em;
  padding-top: 0.05em;
  color: rgba(251, 191, 36, 0.7);    /* gold-400 at 70% */
  font-weight: 700;
}

/* First paragraph slightly larger for a "lede" effect */
.prose-srd-article > .prose-srd > div > span.block:first-child {
  font-size: 0.9375rem;              /* 15px vs the normal 14px */
  line-height: 1.8;
  color: rgba(185, 186, 163, 0.92);  /* slightly brighter than default */
}

@media (prefers-reduced-motion: reduce) {
  /* Drop cap is static — no motion concerns — but include for completeness */
}
```

### Implementation: `SRDProseContent.tsx`

Add the `prose-srd-article` wrapper class to each `<article>`:

```diff
- <article
-   key={chunk.id}
-   id={chunk.id}
-   className="scroll-mt-24 rounded-lg border border-slate-700/60 bg-slate-850/50 p-6"
- >
+ <article
+   key={chunk.id}
+   id={chunk.id}
+   className="prose-srd-article scroll-mt-24 rounded-lg border border-slate-700/60 bg-slate-850/50 p-6"
+ >
```

### Rationale
- **Illuminated manuscript tradition**: Drop caps have guided readers' eyes to the start of new passages for 1500 years. In a fantasy TTRPG context, this is doubly appropriate.
- **font-display**: Using the Jetsam display font for the drop cap letter creates a dramatic, attention-getting effect without adding an image.
- **Lede paragraph**: The slight size bump on the first paragraph mimics magazine/article typography, creating a "reading ramp" that eases the eye from the title into the body.

### Accessibility
- Drop caps are purely visual — screen readers read the text linearly regardless.
- The float-left layout doesn't affect semantic document order.
- The slightly larger lede paragraph improves readability for all users.

---

## 6. Alternating Card Depth (Subtle Zebra)

### Problem
In a long list of accordion items, every item has the same `bg-slate-850/50` background. There's no visual rhythm to help the eye track which row it's on.

### Solution
Apply a subtle alternating background tint — not a harsh zebra stripe, but a barely perceptible depth shift that aids row tracking.

### Implementation: `SRDAccordionList.tsx`

Pass an `index` prop or use CSS `:nth-child` for zebra styling. The cleanest approach is a CSS-based one via the existing `role="list"` container:

**In `globals.css`:**

```css
/* ─── SRD Accordion Zebra ─────────────────────────────────────────────────────
   Subtle alternating depth on accordion items within a list container.
   Even items get a barely-perceptible lighter background for row tracking.
   ─────────────────────────────────────────────────────────────────────────── */
.srd-accordion-list > [role="listitem"]:nth-child(even) > div {
  background-color: rgba(15, 23, 42, 0.25);   /* slate-900 at 25% — very faint */
}
.srd-accordion-list > [role="listitem"]:nth-child(odd) > div {
  background-color: rgba(21, 30, 45, 0.35);   /* slate-850 at 35% — default-ish */
}
```

**In `SRDAccordionList.tsx`, add the marker class to the list container:**

```diff
- <div className="space-y-2" role="list" aria-label={subsection || sectionLabel}>
+ <div className="srd-accordion-list space-y-2" role="list" aria-label={subsection || sectionLabel}>
```

### Rationale
- **Row tracking**: Even subtle brightness alternation creates an optical "rail" that keeps the eye aligned when scanning vertically. Crucial for lists of 20+ items.
- **Fantasy aesthetic**: In real books, alternate page spreads have slightly different paper tones due to aging. This captures that feel.
- **Extremely subtle**: The difference between `rgba(15,23,42,0.25)` and `rgba(21,30,45,0.35)` is approximately 3-4 lightness units — perceptible but not distracting.

### Accessibility
- Background tint doesn't affect foreground text contrast (text colors remain unchanged).
- No information is conveyed by the alternation — it's purely a tracking aid.

---

## 7. Progressive Disclosure — "Show More" Pagination

### Problem
"Running an Adventure" shows all 33 accordion items at once. "Ancestries" shows 20. This creates immediate scroll overwhelm.

### Solution
For sections with more than 10 items (within a subsection group), show the first 10 collapsed, then display a "Show N more entries" button. Clicking it reveals the rest with a staggered animation.

### Implementation: `SRDAccordionList.tsx`

```tsx
const INITIAL_VISIBLE_COUNT = 10;

// Inside the grouped render loop:
function AccordionGroup({ 
  chunks, 
  label, 
  sectionLabel 
}: { 
  chunks: SRDChunk[]; 
  label: string; 
  sectionLabel: string;
}) {
  const [showAll, setShowAll] = useState(false);
  const shouldPaginate = chunks.length > INITIAL_VISIBLE_COUNT;
  const visibleChunks = showAll ? chunks : chunks.slice(0, INITIAL_VISIBLE_COUNT);
  const hiddenCount = chunks.length - INITIAL_VISIBLE_COUNT;

  return (
    <>
      <div className="srd-accordion-list space-y-2" role="list" aria-label={label || sectionLabel}>
        {visibleChunks.map((chunk, i) => (
          <div
            key={chunk.id}
            role="listitem"
            style={{ animationDelay: `${i * 20}ms` }}
            className="animate-slide-in-left"
          >
            <SRDAccordionItem chunk={chunk} />
          </div>
        ))}
      </div>

      {/* "Show more" button */}
      {shouldPaginate && !showAll && (
        <button
          type="button"
          onClick={() => setShowAll(true)}
          className="
            mt-4 flex w-full items-center justify-center gap-2
            rounded-lg border border-dashed border-slate-700/60
            bg-slate-900/30 px-4 py-3
            text-sm font-medium text-parchment-500/70
            transition-all duration-200
            hover:border-gold-400/30 hover:bg-gold-400/[0.04] hover:text-gold-400
            focus:outline-none focus:ring-2 focus:ring-gold-400 focus:ring-inset
          "
        >
          <i className="fa-solid fa-chevron-down text-xs" aria-hidden="true" />
          Show {hiddenCount} more {hiddenCount === 1 ? "entry" : "entries"}
        </button>
      )}
    </>
  );
}
```

### Rationale
- **Cognitive load theory (Miller's Law)**: 7±2 items is the comfortable working memory range. 10 is a generous upper bound that lets users see the scope without overwhelm.
- **Dashed border**: The dashed style signals "this is optional / expandable" — a well-established UX convention.
- **Count disclosure**: Showing the exact hidden count ("Show 23 more entries") sets accurate expectations.

### Accessibility
- The button is a native `<button>` with visible text — fully keyboard accessible.
- `aria-label` not needed since the button text is descriptive.
- When items appear, they use `animate-slide-in-left` which respects `prefers-reduced-motion`.

---

## 8. Subsection Table-of-Contents (Sticky Mini-Nav)

### Problem
When you drill into "Core Mechanics" (26 chunks across 16 subsections) or "Running an Adventure" (33 chunks across 4 subsections), there's no way to quickly jump to a specific subsection. You must scroll through everything linearly.

### Solution
Add a compact horizontal pill-nav below the `SRDDrillDownHeader` that lists all subsections as clickable pills. Clicking a pill smooth-scrolls to that subsection. The current-in-view subsection gets a highlighted state via IntersectionObserver.

### Implementation: New component `SRDSubsectionNav.tsx`

```tsx
"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";

interface SRDSubsectionNavProps {
  subsections: string[];
  sectionAccent?: string;  // e.g. "gold", "coral", "emerald"
}

// Accent color map for pill active state
const PILL_ACCENTS: Record<string, string> = {
  gold:      "border-gold-400/60 bg-gold-400/15 text-gold-400",
  coral:     "border-coral-400/60 bg-coral-400/15 text-coral-400",
  parchment: "border-parchment-400/60 bg-parchment-400/15 text-parchment-400",
  burgundy:  "border-burgundy-400/60 bg-burgundy-400/15 text-burgundy-400",
  amber:     "border-amber-400/60 bg-amber-400/15 text-amber-400",
  emerald:   "border-emerald-400/60 bg-emerald-400/15 text-emerald-400",
  violet:    "border-violet-400/60 bg-violet-400/15 text-violet-400",
};

export function SRDSubsectionNav({ subsections, sectionAccent = "gold" }: SRDSubsectionNavProps) {
  const [activeSubsection, setActiveSubsection] = useState<string>("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const activePillClasses = PILL_ACCENTS[sectionAccent] ?? PILL_ACCENTS.gold;

  // Use IntersectionObserver to track which subsection is in view
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const label = entry.target.getAttribute("aria-label");
            if (label) setActiveSubsection(label);
          }
        }
      },
      { rootMargin: "-20% 0px -60% 0px", threshold: 0 }
    );

    // Observe all <section> elements with aria-label matching subsection names
    subsections.forEach((sub) => {
      const el = document.querySelector(`section[aria-label="${sub}"]`);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [subsections]);

  const scrollToSubsection = useCallback((subsection: string) => {
    const el = document.querySelector(`section[aria-label="${subsection}"]`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

  if (subsections.length < 2) return null;

  return (
    <nav aria-label="Subsection navigation" className="mb-6">
      <div
        ref={scrollRef}
        className="flex gap-2 overflow-x-auto scrollbar-hide py-1"
      >
        {subsections.map((sub) => {
          const isActive = activeSubsection === sub;
          return (
            <button
              key={sub}
              type="button"
              onClick={() => scrollToSubsection(sub)}
              className={`
                shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium
                whitespace-nowrap transition-all duration-150
                focus:outline-none focus:ring-2 focus:ring-gold-400 focus:ring-offset-1 focus:ring-offset-[#0a100d]
                ${isActive
                  ? activePillClasses
                  : "border-slate-700/50 bg-slate-800/30 text-parchment-600/60 hover:border-slate-600 hover:text-parchment-500"
                }
              `}
            >
              {sub}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
```

### Usage in `rules/page.tsx`:

```tsx
// After SRDDrillDownHeader, before SRDAccordionList/SRDProseContent:
{activeSection !== null && subsections.length > 1 && (
  <SRDSubsectionNav
    subsections={subsections}
    sectionAccent={SECTION_ACCENT_KEY[activeSection] ?? "gold"}
  />
)}
```

Where `subsections` is derived from `filteredChunks`:

```tsx
const subsections = useMemo<string[]>(() => {
  if (!activeSection) return [];
  const seen = new Set<string>();
  const result: string[] = [];
  for (const chunk of filteredChunks) {
    if (chunk.subsection && !seen.has(chunk.subsection)) {
      seen.add(chunk.subsection);
      result.push(chunk.subsection);
    }
  }
  return result;
}, [filteredChunks, activeSection]);
```

And `SECTION_ACCENT_KEY` maps section names to color keys:

```tsx
const SECTION_ACCENT_KEY: Record<string, string> = {
  Introduction:           "parchment",
  "Character Creation":   "gold",
  Classes:                "burgundy",
  Ancestries:             "amber",
  Communities:            "emerald",
  Domains:                "violet",
  "Core Mechanics":       "gold",
  "Running an Adventure": "coral",
  Appendix:               "parchment",
};
```

### Rationale
- **Orientation cue**: The mini-nav serves as a "you are here" beacon — critical when scrolling through 33 items.
- **Random access**: Users can jump directly to "Adversaries and Environments" without scrolling past 15 other items.
- **Horizontal scrollable pills**: Mobile-friendly pattern that takes minimal vertical space.
- **IntersectionObserver active state**: Provides a scrollspy-like effect that updates the highlighted pill as the user scrolls.

### Accessibility
- `<nav aria-label="Subsection navigation">` makes this a landmark region.
- Each pill is a `<button>` — keyboard navigable.
- Active state communicated via visual styling (not sole indicator — screen reader users can use section headings directly).

---

## 9. Scroll Progress Indicator

### Problem
On long sections, users lose a sense of how far they've read and how much remains. The browser's native scrollbar is thin and hard to read on dark themes.

### Solution
Add a thin (2px) progress bar at the top of the content area, tinted with the section's accent color. It fills from 0% to 100% as the user scrolls through the section content.

### Implementation: `rules/page.tsx` or new component `SRDScrollProgress.tsx`

```tsx
"use client";

import React, { useState, useEffect, useRef } from "react";

interface SRDScrollProgressProps {
  /** Tailwind bg class for the progress fill, e.g. "bg-coral-400/60" */
  colorClass?: string;
}

const SECTION_PROGRESS_COLOR: Record<string, string> = {
  Introduction:           "bg-parchment-400/50",
  "Character Creation":   "bg-gold-400/50",
  Classes:                "bg-burgundy-400/50",
  Ancestries:             "bg-amber-400/50",
  Communities:            "bg-emerald-400/50",
  Domains:                "bg-violet-400/50",
  "Core Mechanics":       "bg-gold-400/50",
  "Running an Adventure": "bg-coral-400/50",
  Appendix:               "bg-parchment-500/50",
};

export function SRDScrollProgress({ colorClass = "bg-gold-400/50" }: SRDScrollProgressProps) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const pct = docHeight > 0 ? Math.min(scrollTop / docHeight, 1) : 0;
      setProgress(pct);
    };

    // Use passive listener for performance
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll(); // Initial calculation
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div
      className="fixed left-0 top-0 z-50 h-0.5 w-full"
      role="progressbar"
      aria-valuenow={Math.round(progress * 100)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label="Page scroll progress"
    >
      <div
        className={`h-full ${colorClass} transition-[width] duration-75 ease-out`}
        style={{ width: `${progress * 100}%` }}
      />
    </div>
  );
}
```

**Usage in `rules/page.tsx`:**

```tsx
{!isSearching && activeSection !== null && (
  <SRDScrollProgress
    colorClass={SECTION_PROGRESS_COLOR[activeSection] ?? "bg-gold-400/50"}
  />
)}
```

### Rationale
- **Reading progress orientation**: Widely used on long-form content (Medium, Dev.to, various news sites). Provides a persistent "how far along am I?" signal.
- **Section-colored**: Reinforces which section you're in through peripheral vision.
- **2px height**: Minimal visual footprint. Present when needed, invisible when not scrolled.

### Accessibility
- Proper `role="progressbar"` with `aria-valuenow/min/max` for screen readers.
- `aria-label` provides context.
- Visual-only element — screen reader users don't need scroll progress since they navigate by headings.

---

## 10. Search Results Enhancements

### 10a. Match Context Breadcrumbs

**Problem**: Search results show the chunk title and section badge, but not the subsection. If you search "armor" and get 5 results from Core Mechanics, you can't tell which subsection each belongs to without opening it.

**Solution**: Add a subsection breadcrumb trail below the title.

**Implementation: `SRDAccordionItem.tsx`**

Add a breadcrumb trail visible in search-result context:

```tsx
{/* Breadcrumb trail — visible when showing section badge (search results) */}
{showSectionBadge && chunk.subsection && (
  <span className="ml-1 text-xs text-parchment-600/50">
    <i className="fa-solid fa-chevron-right mx-1 text-[8px]" aria-hidden="true" />
    {chunk.subsection}
  </span>
)}
```

Place this right after the section badge `<span>`, inside the same flex container.

### 10b. Relevance Score Indicator

**Problem**: Users can't tell why a result ranked where it did. Is it a title match? A content match?

**Solution**: Add a subtle relevance bar or match-type icon to each result in `SRDResultsView`.

**Implementation: `SRDResultsView.tsx`**

Add a match indicator row below each result:

```tsx
{/* Match context */}
<div className="mt-1.5 flex items-center gap-3 px-4">
  {/* Match type icon */}
  <span className="flex items-center gap-1 text-[10px] text-parchment-600/40">
    <i
      className={`fa-solid ${
        result.matchedOn === "title" ? "fa-heading" :
        result.matchedOn === "tags" ? "fa-tag" :
        "fa-file-lines"
      } text-[9px]`}
      aria-hidden="true"
    />
    {result.matchedOn === "title" ? "Title match" :
     result.matchedOn === "tags" ? "Tag match" :
     "Content match"}
  </span>
  {/* Relevance bar */}
  <div className="flex-1 max-w-[80px]">
    <div className="h-0.5 w-full rounded-full bg-slate-800/60">
      <div
        className="h-full rounded-full bg-gold-400/40"
        style={{ width: `${Math.min(result.score * 100, 100)}%` }}
      />
    </div>
  </div>
</div>
```

### 10c. Section Group Count + "Jump to Section"

**Problem**: Section groups in results show a count `(3)` but no way to navigate directly to that section in browse mode.

**Solution**: Add a "Browse section" link next to the count.

**Implementation: `SRDResultsView.tsx`**

```diff
  <h2 className="text-sm font-bold uppercase tracking-widest">
    {section}
    <span className="ml-2 font-normal opacity-60">
      ({sectionResults.length})
    </span>
  </h2>
+ <button
+   type="button"
+   onClick={() => { /* callback to drillIntoSection(section) */ }}
+   className="ml-auto text-[10px] font-medium uppercase tracking-widest text-parchment-600/40 hover:text-gold-400 transition-colors focus:outline-none focus:ring-1 focus:ring-gold-400 rounded"
+ >
+   Browse all <i className="fa-solid fa-arrow-right ml-1 text-[8px]" aria-hidden="true" />
+ </button>
```

This requires passing an `onBrowseSection` callback prop from `rules/page.tsx` to `SRDResultsView`.

### Rationale
- **10a**: Breadcrumbs add critical contextual information without requiring the user to open the item. This is the single highest-impact search UX improvement.
- **10b**: Match-type indicators help users understand search behavior and build trust in the ranking. Subtlety is key — this is for orientation, not gamification.
- **10c**: Providing a path from search results back to browse mode is a standard "escape hatch" pattern.

### Accessibility
- Breadcrumb separator uses `aria-hidden` on the chevron icon.
- Relevance bar is decorative (the information is supplementary, not critical).
- "Browse all" button is keyboard accessible.

---

## 11. CSS Additions (`globals.css`)

Add the following blocks to `frontend/src/app/globals.css`:

```css
/* ═══════════════════════════════════════════════════════════════════════════
   SRD VISUAL DIFFERENTIATION
   Added per SRD_VISUAL_DIFFERENTIATION_SPEC.md
   ═══════════════════════════════════════════════════════════════════════════ */

/* ─── SRD Accordion Zebra ─────────────────────────────────────────────────────
   Subtle alternating depth on accordion items for row tracking.
   ─────────────────────────────────────────────────────────────────────────── */
.srd-accordion-list > [role="listitem"]:nth-child(even) > div {
  background-color: rgba(15, 23, 42, 0.25);
}
.srd-accordion-list > [role="listitem"]:nth-child(odd) > div {
  background-color: rgba(21, 30, 45, 0.35);
}

/* ─── SRD Prose Drop Cap ──────────────────────────────────────────────────────
   Illuminated first letter on prose articles.
   ─────────────────────────────────────────────────────────────────────────── */
.prose-srd-article > .prose-srd > div > span.block:first-child::first-letter {
  float: left;
  font-family: "jetsam-collection-basilea", "double-pica", Georgia, serif;
  font-size: 3.25em;
  line-height: 0.8;
  padding-right: 0.08em;
  padding-top: 0.05em;
  color: rgba(251, 191, 36, 0.7);
  font-weight: 700;
}
.prose-srd-article > .prose-srd > div > span.block:first-child {
  font-size: 0.9375rem;
  line-height: 1.8;
  color: rgba(185, 186, 163, 0.92);
}

/* ─── SRD Subsection Fade-in ──────────────────────────────────────────────────
   When "Show more" reveals additional items, they stagger in.
   ─────────────────────────────────────────────────────────────────────────── */
@keyframes srd-reveal {
  from {
    opacity: 0;
    transform: translateY(6px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
.srd-reveal-item {
  animation: srd-reveal 250ms ease-out forwards;
}

@media (prefers-reduced-motion: reduce) {
  .srd-reveal-item {
    animation: none;
    opacity: 1;
  }
}
```

---

## 12. Tailwind Config Additions

No new color scales needed — all treatments use the existing `burgundy`, `gold`, `parchment`, `coral`, `slate`, `amber`, `emerald`, `violet` palettes.

One small addition for the flourish animation in `tailwind.config.ts` keyframes (optional, only if you want the flourish to animate in):

```typescript
// Inside theme.extend.keyframes:
"srd-reveal": {
  from: { opacity: "0", transform: "translateY(6px)" },
  to:   { opacity: "1", transform: "translateY(0)" },
},

// Inside theme.extend.animation:
"srd-reveal": "srd-reveal 250ms ease-out forwards",
```

This is duplicative of the CSS in globals.css — choose one location. The CSS approach is cleaner since the animation is only used in the SRD context.

---

## 13. Mobile Considerations

### All Techniques — Mobile-First Audit

| Technique | Mobile Adaptation | Notes |
|---|---|---|
| **Left border accent** | Works as-is — 3px left border is visible on all widths | No change |
| **Subsection containers** | Reduce padding: `px-3 py-4` on mobile (vs `px-5 py-5` on `sm:`) | Use `px-3 py-4 sm:px-5 sm:py-5` |
| **Overview hero card** | Works as-is — gradient and ring scale naturally | No change |
| **Flourish dividers** | Works as-is — gradient scales to any width | No change |
| **Drop caps** | Reduce size to `2.75em` on mobile to prevent float overflow | Add `@media (max-width: 639px)` override |
| **Zebra striping** | Works as-is | No change |
| **Show more pagination** | Works as-is — full-width button is touch-friendly (48px min-height) | Ensure `py-3` for touch target |
| **Subsection mini-nav** | Horizontally scrollable pills — this IS the mobile pattern | Already uses `overflow-x-auto scrollbar-hide` |
| **Scroll progress** | Works as-is — full-width fixed bar | No change |
| **Search breadcrumbs** | May truncate long subsection names — use `truncate` class | Add `max-w-[120px] truncate` on mobile |

### Drop Cap Mobile Override

```css
@media (max-width: 639px) {
  .prose-srd-article > .prose-srd > div > span.block:first-child::first-letter {
    font-size: 2.75em;
    padding-right: 0.06em;
  }
}
```

### Touch Targets
All interactive elements already meet the 44×44px minimum touch target guideline:
- "Show more" button: `py-3` = 48px height minimum
- Subsection pills: `py-1.5` + text = approximately 32px — **upgrade to `py-2` for 40px minimum**, or add `min-h-[44px]` for strict compliance

```diff
- shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium
+ shrink-0 rounded-full border px-3 py-2 text-xs font-medium min-h-[44px] flex items-center
```

---

## 14. Accessibility Audit

### Color Contrast Verification

| Element | Foreground | Background | Contrast Ratio | WCAG Level |
|---|---|---|---|---|
| Section left border (40% opacity accents on slate-850) | Decorative | N/A | N/A (non-text) | Passes (decorative) |
| Subsection title (gold-400/90 on slate-900/40) | `#fbbf24` at 90% | `~#0f172a` at 40% blend | ~10.5:1 | AAA |
| Entry count text (parchment-600/50) | `#b8872c` at 50% | `~#0f172a` | ~3.2:1 | **AA Large only** — this is intentional muted metadata, non-critical |
| Drop cap letter (gold-400 at 70%) | `rgba(251,191,36,0.7)` | slate-850 blend | ~7.8:1 | AAA |
| "Show more" button text (parchment-500/70) | `#d4a94a` at 70% | slate-900/30 | ~5.1:1 | AA |
| "Show more" hover (gold-400) | `#fbbf24` | gold-400/4% on slate-900 | ~11.2:1 | AAA |
| Flourish ornaments (gold-400/20) | Decorative | N/A | N/A | Passes (decorative) |
| Match type indicator (parchment-600/40) | Muted metadata | N/A | ~2.4:1 | **Below AA** — acceptable as supplementary/decorative |

### Reduced Motion

All animations are covered:
- `srd-reveal-item`: Has `@media (prefers-reduced-motion: reduce)` override
- `animate-slide-in-left`: Already has reduced-motion override in globals.css
- `animate-fade-in`: Already has reduced-motion override
- Scroll progress bar: Uses `transition-[width] duration-75` — minimal motion, but could add reduced-motion override to remove the transition

### Screen Reader Impact

| Technique | Screen Reader Impact | Notes |
|---|---|---|
| Left borders | None — CSS only | No ARIA changes |
| Subsection containers | Positive — `<section aria-label>` preserved | Provides semantic grouping |
| Overview hero | None — same component with visual-only class additions | Content unchanged |
| Flourishes | None — `aria-hidden="true"` | Correctly hidden |
| Drop caps | None — CSS `::first-letter` doesn't affect DOM | Text reads normally |
| Zebra striping | None — CSS `:nth-child` only | No ARIA changes |
| Show more | Positive — reduces initial content blast; button is descriptive | Users can choose to expand |
| Subsection nav | Positive — `<nav aria-label>` landmark added | Extra navigation option |
| Scroll progress | Neutral — `role="progressbar"` with values | Optional orientation cue |
| Search breadcrumbs | Positive — additional context in search results | Adds useful information |

---

## 15. Implementation Priority

### Tier 1 — High Impact, Low Effort (Do First)
These changes are small, self-contained, and produce the most visible improvement:

| # | Change | Component(s) | Est. Effort | Impact |
|---|---|---|---|---|
| 1 | Section-colored left borders | `SRDAccordionItem.tsx` | 15 min | **High** — instantly breaks visual monotony |
| 2 | Ornamental flourish dividers | `SRDAccordionList.tsx`, `SRDProseContent.tsx` | 20 min | **High** — creates chapter-break visual rhythm |
| 3 | Subsection group containers | `SRDAccordionList.tsx` | 20 min | **High** — solves "where does this group end?" |
| 4 | Prose drop caps | `globals.css`, `SRDProseContent.tsx` | 10 min | **Medium** — dramatic visual upgrade for prose sections |

### Tier 2 — Medium Impact, Medium Effort
These require slightly more code but significantly improve the experience for heavy sections:

| # | Change | Component(s) | Est. Effort | Impact |
|---|---|---|---|---|
| 5 | "Show more" pagination | `SRDAccordionList.tsx` | 30 min | **High** — critical for 20-33 item sections |
| 6 | Overview entry hero treatment | `SRDAccordionList.tsx` | 20 min | **Medium** — clarifies content hierarchy |
| 7 | Search breadcrumbs | `SRDAccordionItem.tsx` | 10 min | **Medium** — dramatically improves search result context |
| 8 | Alternating card depth | `globals.css`, `SRDAccordionList.tsx` | 10 min | **Medium** — aids row tracking on long lists |

### Tier 3 — Medium Impact, Higher Effort
These are more complex but add polish:

| # | Change | Component(s) | Est. Effort | Impact |
|---|---|---|---|---|
| 9 | Subsection mini-nav | New `SRDSubsectionNav.tsx`, `rules/page.tsx` | 45 min | **High** — random access navigation for large sections |
| 10 | Scroll progress indicator | New `SRDScrollProgress.tsx`, `rules/page.tsx` | 20 min | **Low-Medium** — nice-to-have orientation cue |
| 11 | Search relevance indicators | `SRDResultsView.tsx` | 20 min | **Low** — power-user feature |
| 12 | Search "Browse section" link | `SRDResultsView.tsx`, `rules/page.tsx` | 15 min | **Low-Medium** — escape hatch from search to browse |

### Suggested Sprint Plan

**Sprint 1 (1 day)**: Items 1–4 (Tier 1). This gets the biggest visual transformation with minimal risk.

**Sprint 2 (1 day)**: Items 5–8 (Tier 2). This adds the functional improvements.

**Sprint 3 (half day)**: Items 9–12 (Tier 3). This adds the navigation and search polish.

---

## Summary of All Component Changes

| File | Changes |
|---|---|
| `SRDAccordionItem.tsx` | Add left-border color maps + `border-l-[3px]` logic; add subsection breadcrumb in search mode |
| `SRDAccordionList.tsx` | Add subsection container styling; replace subsection divider with ornamental header; add `SRDFlourish`; add overview detection + hero treatment; add "Show more" pagination; add `srd-accordion-list` class |
| `SRDProseContent.tsx` | Add `prose-srd-article` class to articles; add `SRDFlourish` between subsection groups |
| `SRDResultsView.tsx` | Add match-type indicator; add relevance bar; add "Browse section" link; pass `onBrowseSection` prop |
| `globals.css` | Add `.srd-accordion-list` zebra rules; add `.prose-srd-article` drop cap rules; add `@keyframes srd-reveal` |
| `rules/page.tsx` | Extract subsections from chunks; render `SRDSubsectionNav`; render `SRDScrollProgress`; pass `onBrowseSection` to `SRDResultsView` |
| **New:** `SRDSubsectionNav.tsx` | Horizontal pill mini-nav with IntersectionObserver scrollspy |
| **New:** `SRDScrollProgress.tsx` | Fixed scroll progress bar |
