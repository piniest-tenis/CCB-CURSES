# Curses! — Sub-Pages Visual Design Specifications

> **Status**: Active  
> **Version**: 1.0  
> **Date**: April 14, 2026  
> **Scope**: `/features/streaming`, `/features/campaigns`, `/features/new-players`, `/pricing`  
> **Prerequisite**: Read `LANDING_PAGE_DESIGN_SYSTEM.md` and `LANDING_PAGE_SECTION_TREATMENTS.md` first. This document extends — never contradicts — those specs.

---

## Table of Contents

1. [Shared Sub-Page Template](#1-shared-sub-page-template)
2. [New Component Patterns](#2-new-component-patterns)
3. [Page-Specific Visual Treatments](#3-page-specific-visual-treatments)
4. [Animation Specs](#4-animation-specs-for-sub-pages)
5. [Responsive Adaptations](#5-responsive-adaptations)

---

## 1. Shared Sub-Page Template

All four sub-pages share the same visual skeleton. Same bones. Same blood. Different scars.

---

### 1.1 Navigation Bar

**Identical to landing page.** Same sticky header, same scroll-triggered backdrop, same breakpoints.

One change: nav links become proper `<Link>` elements pointing to routes instead of `scrollToId()` calls.

| Nav Item | Link Target |
|---|---|
| Features | `/` + scroll anchor `#features` (back to landing) |
| Pricing | `/pricing` |
| Community | `/` + scroll anchor `#community` |

**Active state:** Current page's nav link gets `text-gold-400 border-b-2 border-gold-400 pb-1` to signal location. Same `underline-offset-[6px]` treatment from design system.

**Back-to-home affordance:** Logo always links to `/`. No additional breadcrumb needed — these are shallow pages, not deep hierarchies.

---

### 1.2 Sub-Page Hero Section

The landing page hero is a full-viewport monument (`min-h-screen`). Sub-page heroes are **shorter, denser, more utilitarian**. They orient the visitor and get out of the way.

| Property | Value |
|---|---|
| **Height** | `min-h-[50vh]` on desktop, `min-h-[60vh]` on mobile (taller relative to screen on small devices for breathing room) |
| **Vertical padding** | `pt-32 pb-16 sm:pt-40 sm:pb-20` — extra top padding clears the fixed nav |
| **Content max-width** | `max-w-4xl` — same intimate width as landing hero |
| **Alignment** | Center-aligned, single column |
| **Background** | Page-specific (see §3). Always `FantasyBgSection` wrapper with unique overlay treatment per page. |

#### Typography Hierarchy

```
Kicker (above headline)
  font-serif-sc text-xs sm:text-sm font-normal leading-normal tracking-[0.2em] text-gold-400 mb-4

Headline (H1)
  font-display text-4xl sm:text-5xl md:text-6xl font-normal leading-[1.05] tracking-wide text-parchment-50

Subtitle (below headline)
  font-body text-lg sm:text-xl text-parchment-400 leading-relaxed max-w-xl mx-auto mt-6

CTA (optional — only on some heroes)
  Same primary/secondary button patterns as landing page. mt-8.
```

**Key difference from landing page hero:** No `jetsam-collection-basilea` at `text-8xl`. Sub-page heroes cap at `text-6xl` (desktop). The landing page hero is THE monument; sub-page heroes are chapter headings.

**No scroll indicator.** These pages are clearly scrollable — content visible below the fold signals this naturally.

---

### 1.3 Section Spacing Rhythm

| Section Type | Padding |
|---|---|
| Standard content section | `py-20 sm:py-28` (matches landing page) |
| Hero section | `pt-32 pb-16 sm:pt-40 sm:pb-20` |
| Final CTA section | `py-20 sm:py-28` (lighter than landing's `py-24 sm:py-32` — these pages are shorter, don't need the same crescendo weight) |
| Footer | `py-12` (identical to landing) |

**Content max-widths:**

| Section Type | Max-width |
|---|---|
| Hero content | `max-w-4xl` |
| Feature deep-dives | `max-w-6xl` |
| Comparison table | `max-w-5xl` |
| FAQ accordion | `max-w-4xl` |
| Step visualization | `max-w-5xl` |
| Final CTA | `max-w-4xl` |

**Horizontal padding:** `px-4 sm:px-6 lg:px-8` — consistent everywhere.

---

### 1.4 Section Background Alternation

Sub-pages follow the same three-tier background system as the landing page, but with a simpler rhythm since they have fewer sections:

```
Hero              → FantasyBgSection (page-specific overlay)
Section 1         → bg-slate-950 (clean)
Section 2         → bg-slate-900 (elevated)
Section 3         → bg-slate-950 (clean)
...alternate...
Final CTA         → FantasyBgSection (warmer overlay, same as landing Final CTA)
Footer            → bg-slate-950 + border-t
```

**Between fantasy-bg and clean sections:** Same ornamental gold divider: `h-px bg-gradient-to-r from-transparent via-gold-400/20 to-transparent` (or `animate-divider-shimmer`).

**Between clean sections:** No divider. The background shade shift is sufficient.

---

### 1.5 Footer

**Identical to landing page.** Same 4-column layout, same links, same social icons. Reuse the exact same component. No changes.

---

### 1.6 Breadcrumb / Page Context (Optional)

For sub-pages nested under `/features/`, a subtle breadcrumb below the nav provides wayfinding:

```
<nav aria-label="Breadcrumb" class="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 pt-20 sm:pt-24">
  <ol class="flex items-center gap-2 text-xs font-sans uppercase tracking-[0.1em] text-parchment-600">
    <li><a href="/" class="hover:text-gold-400 transition-colors">Home</a></li>
    <li aria-hidden="true" class="text-parchment-600/40">›</li>
    <li><a href="/#features" class="hover:text-gold-400 transition-colors">Features</a></li>
    <li aria-hidden="true" class="text-parchment-600/40">›</li>
    <li class="text-gold-400" aria-current="page">Streaming</li>
  </ol>
</nav>
```

**Positioning:** Rendered inside the hero section, above the kicker text. `absolute` or static depending on hero layout — should not interfere with the centered content block.

**On `/pricing`:** No breadcrumb needed. It's a top-level page, not nested under features.

---

## 2. New Component Patterns

These components don't exist on the landing page. They extend the design system with the same visual DNA.

---

### 2.1 Feature Deep-Dive Block

The landing page has small `FeatureCard` components (icon + title + 1-2 sentences). Sub-pages need **larger, more detailed feature blocks** with images, multi-paragraph descriptions, and technical specifications.

#### Layout Pattern: Alternating Image/Text

Deep-dive blocks alternate image placement: odd blocks have image on the right, even blocks have image on the left. This creates a **zigzag reading pattern** that keeps the eye engaged and prevents visual monotony.

```
Block 1:  [ Text Content    |    Image/Screenshot ]
Block 2:  [ Image/Screenshot |    Text Content     ]
Block 3:  [ Text Content    |    Image/Screenshot ]
```

#### Structure

```
FeatureDeepDive
  ├─ Grid container (2-col on desktop, 1-col on mobile)
  │    ├─ Text column
  │    │    ├─ Icon badge (optional — reuses FeatureCard icon container)
  │    │    ├─ Kicker (small caps, gold)
  │    │    ├─ Headline (H3)
  │    │    ├─ Description (1-3 paragraphs)
  │    │    ├─ TechSpecList (optional — see §2.2)
  │    │    └─ CTA link (optional — "Learn more" arrow pattern)
  │    └─ Image column
  │         └─ ScreenshotContainer (see §2.6)
```

#### Tailwind Specs

| Element | Classes |
|---|---|
| **Grid container** | `grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center` |
| **Text column (odd blocks)** | `order-2 lg:order-1` |
| **Image column (odd blocks)** | `order-1 lg:order-2` |
| **Text column (even blocks)** | `order-2 lg:order-2` |
| **Image column (even blocks)** | `order-1 lg:order-1` |
| **Icon badge** | `mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-burgundy-900/60 to-slate-900 border border-burgundy-800/30` |
| **Icon** | `fa-solid ${icon} text-gold-400 text-lg` |
| **Kicker** | `text-xs font-sans font-semibold uppercase tracking-[0.2em] text-gold-400/80 mb-2` |
| **Headline (H3)** | `font-serif text-2xl sm:text-3xl font-bold text-parchment-50 mb-4 leading-[1.15]` |
| **Description paragraphs** | `font-body text-base text-parchment-300 leading-relaxed mb-4 max-w-xl` |
| **Description — first paragraph** | Same as above but `text-parchment-400` (slightly brighter for the lede) |

#### Mobile Behavior

On mobile (`< lg`), image always appears first (`order-1`), text second (`order-2`). This is consistent with the landing page's campaign section pattern — image first provides visual context before the text explanation.

#### Spacing Between Deep-Dive Blocks

`py-16 sm:py-20` between consecutive deep-dive blocks. This is less than full section spacing (`py-20 sm:py-28`) because these blocks are siblings within the same section, not separate sections.

Separate blocks with a subtle divider:
```
<div class="h-px bg-gradient-to-r from-transparent via-slate-700/30 to-transparent my-16 sm:my-20" aria-hidden="true" />
```

Note: This is a **slate** divider (structural), not a **gold** divider (ornamental). Gold dividers are reserved for section boundaries.

---

### 2.2 Technical Spec List

For displaying specific technical details about a feature (e.g., overlay dimensions, refresh rates, supported platforms).

#### Structure

```
TechSpecList
  └─ <ul>
       ├─ TechSpecItem
       │    ├─ Icon (monospace/technical feel)
       │    └─ Spec text
       ├─ TechSpecItem
       └─ ...
```

#### Tailwind Specs

| Element | Classes |
|---|---|
| **Container** | `mt-6 space-y-2.5` |
| **Item** | `flex items-start gap-3 text-sm` |
| **Icon** | `mt-0.5 text-gold-400/60 text-xs shrink-0` — use `fa-solid fa-terminal` or `fa-solid fa-gear` or `fa-solid fa-ruler-combined` depending on context |
| **Text label** | `font-body text-parchment-400 leading-relaxed` |
| **Text value** | Within the label, wrap values in `<span class="font-mono text-parchment-200 text-xs bg-slate-800/60 rounded px-1.5 py-0.5 ml-1">380×220px</span>` |

#### Example Rendering

```
⚙  Overlay size: [380×220px]  ·  Transparent background
⚙  Refresh rate: [90 seconds]  auto-refresh
⚙  Compatible with: [OBS]  ·  [Streamlabs]  ·  [XSplit]
```

The monospace-styled value pills create a "technical readout" aesthetic that contrasts with the editorial body copy. They signal precision.

#### Full Class String for Value Pill

```
font-mono text-parchment-200 text-xs bg-slate-800/60 rounded px-1.5 py-0.5 border border-slate-700/30
```

---

### 2.3 Comparison Table (Pricing Page)

A feature-by-feature comparison between the Player and GM tiers. This is the core component of the `/pricing` page.

#### Desktop Layout: Traditional Table

| Property | Value |
|---|---|
| **Container** | `overflow-x-auto rounded-2xl border border-slate-700/40 bg-slate-900/40 shadow-card` |
| **Table** | `w-full text-left` |
| **Header row** | `bg-slate-900/80 border-b border-slate-700/40` |
| **Header cells — tier names** | `px-6 py-4 font-serif-sc text-lg font-normal tracking-[0.12em] text-gold-400 text-center` |
| **Header cell — feature column** | `px-6 py-4 font-sans text-sm font-semibold uppercase tracking-wider text-parchment-400` |
| **Body rows** | `border-b border-slate-800/30 last:border-b-0` |
| **Row hover** | `hover:bg-slate-850/50 transition-colors duration-150` |
| **Row alternation** | No zebra striping. The hover state and border treatment provide sufficient visual distinction. Zebra striping would introduce visual noise on dark backgrounds. |
| **Feature name cell** | `px-6 py-4 text-sm font-body text-parchment-300 leading-relaxed` |
| **Check mark** | `text-center text-gold-400` — use `fa-solid fa-check` |
| **X mark (not included)** | `text-center text-slate-600` — use `fa-solid fa-xmark` with `opacity-40` |
| **Dash (not applicable)** | `text-center text-slate-600` — use `—` character |

#### Category Sub-Headers Within Table

Group features into categories (e.g., "Character Building", "Streaming Tools", "Campaign Management"). Category rows span all columns:

```
<tr>
  <td colspan="3" class="px-6 pt-6 pb-2 text-xs font-sans font-semibold uppercase tracking-[0.15em] text-gold-400/70 border-b border-gold-400/10">
    Streaming & Content Creation
  </td>
</tr>
```

#### GM Column Highlight

The GM column should feel visually elevated — same "premium" signaling as the landing page's highlighted pricing card:

```
/* Apply to the GM column's <th> and all <td> in that column */
bg-gradient-to-b from-gold-400/[0.03] to-transparent
```

This is a near-imperceptible gold wash that differentiates the GM column without being heavy-handed.

#### Mobile Layout: Stacked Feature Cards

Tables don't work on mobile. At `< md` breakpoint, transform the comparison table into stacked feature cards:

```
<div class="md:hidden space-y-3">
  {features.map(feature => (
    <div class="rounded-xl border border-slate-700/40 bg-slate-900/60 p-4">
      <div class="font-body text-sm text-parchment-300 font-medium mb-2">{feature.name}</div>
      <div class="flex items-center gap-4">
        <div class="flex items-center gap-1.5 text-xs">
          <span class="text-parchment-500">Player:</span>
          {feature.player ? <CheckIcon /> : <XIcon />}
        </div>
        <div class="flex items-center gap-1.5 text-xs">
          <span class="text-gold-400/70">GM:</span>
          {feature.gm ? <CheckIcon /> : <XIcon />}
        </div>
      </div>
    </div>
  ))}
</div>
```

The desktop table is wrapped in `hidden md:block`.

---

### 2.4 FAQ Accordion (Pricing Page)

Expandable Q&A pairs for common pricing and feature questions.

#### Structure

```
FAQAccordion
  └─ <div> container
       ├─ FAQItem (collapsed)
       │    ├─ Trigger button
       │    │    ├─ Question text
       │    │    └─ Chevron icon (rotates on expand)
       │    └─ Answer panel (hidden, animates open)
       ├─ FAQItem (expanded)
       └─ ...
```

#### Tailwind Specs

| Element | Classes |
|---|---|
| **Container** | `divide-y divide-slate-800/40` |
| **Item wrapper** | `py-0` (padding is on trigger/content, not wrapper) |
| **Trigger button** | `w-full flex items-center justify-between py-5 text-left group transition-colors` |
| **Question text** | `font-serif text-base sm:text-lg font-semibold text-parchment-100 group-hover:text-parchment-50 transition-colors pr-4` |
| **Chevron icon** | `fa-solid fa-chevron-down text-gold-400/60 text-xs transition-transform duration-300 shrink-0` |
| **Chevron — expanded** | `rotate-180` |
| **Answer panel** | Uses CSS Grid `0fr → 1fr` animation (same technique as SRD accordion in `globals.css`) |
| **Answer text** | `pb-5 font-body text-sm sm:text-base text-parchment-400 leading-relaxed max-w-prose` |

#### Expand/Collapse Animation

Reuse the existing `srd-accordion-grid` pattern from `globals.css`:

```css
.faq-accordion-grid {
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows 300ms ease-in-out;
}
.faq-accordion-grid.open {
  grid-template-rows: 1fr;
}
.faq-accordion-grid > div {
  overflow: hidden;
}
```

This is the same CSS-grid accordion technique already proven in the SRD page. No JS height measurement needed.

#### Focus & Accessibility

| Requirement | Implementation |
|---|---|
| Trigger is a `<button>` | Not a div, not a link. Semantic button. |
| `aria-expanded` | `true` / `false` on the trigger button |
| `aria-controls` | Points to the answer panel's `id` |
| Answer panel `id` | Unique per item |
| `role="region"` | On the answer panel, with `aria-labelledby` pointing to trigger |
| Keyboard | `Enter` / `Space` toggles. Standard button behavior — no custom key handling needed. |
| Focus ring | `focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-400 rounded` on trigger |

---

### 2.5 Step Visualization (New Players Page)

The landing page has `StepCard` — numbered gold circles with a title and description in a 3-column grid. The new players page needs a **more detailed version** with visual connectors showing progression.

#### Enhanced Step Card

Same card base as landing page `StepCard`, but larger and with more content:

| Element | Classes |
|---|---|
| **Card container** | `relative rounded-2xl border border-slate-700/40 bg-slate-900/60 p-8 hover:-translate-y-1 hover:border-gold-400/30 transition-all duration-300` |
| **Number badge** | `mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-gold-400 to-gold-600 text-slate-950 font-display text-2xl font-bold shadow-glow-gold` |
| **Title** | `font-serif text-xl sm:text-2xl font-bold text-parchment-50 mb-3 leading-[1.15]` |
| **Description** | `font-body text-base text-parchment-300 leading-relaxed mb-4` |
| **Sub-details** | Optional bulleted list: `space-y-2 text-sm text-parchment-400` with `fa-check text-gold-400/60 text-xs` bullets |

Badge is larger (`h-14 w-14` vs `h-10 w-10`) and has `shadow-glow-gold` — these are showcase elements, not summary cards.

#### Connecting Lines (Desktop Only)

Between step cards on desktop, a gold gradient connector line bridges the gap:

```html
<!-- Positioned between cards in the grid, hidden on mobile -->
<div class="hidden lg:flex items-center justify-center" aria-hidden="true">
  <div class="w-full h-px bg-gradient-to-r from-gold-400/30 via-gold-400/50 to-gold-400/30 relative">
    <!-- Arrow head -->
    <div class="absolute right-0 top-1/2 -translate-y-1/2 -translate-x-1">
      <i class="fa-solid fa-chevron-right text-gold-400/50 text-[8px]"></i>
    </div>
  </div>
</div>
```

#### Desktop Layout

Use a 5-column grid to accommodate the connectors:

```
grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr_auto_1fr] gap-6 lg:gap-0 lg:items-start
```

Columns: `[StepCard 1] [Connector] [StepCard 2] [Connector] [StepCard 3]`

Connector column width: `lg:w-16` (64px) — enough for the gradient line + arrow.

#### Mobile Layout

On mobile (`< lg`), cards stack vertically. Connectors are hidden (`hidden lg:flex`). The numbered badges (1, 2, 3) provide sufficient sequential reading on mobile without explicit connectors.

---

### 2.6 Screenshot/Mockup Container

A styled frame for app screenshots that matches the landing page's faux browser chrome treatment.

#### Structure

```
ScreenshotContainer
  ├─ Browser chrome bar
  │    ├─ Traffic light dots (burgundy, gold, steel)
  │    └─ URL bar
  └─ Content area (image or placeholder)
```

#### Tailwind Specs

| Element | Classes |
|---|---|
| **Outer frame** | `rounded-2xl border border-slate-700/30 bg-gradient-to-br from-slate-850 to-slate-900 shadow-sheet overflow-hidden` |
| **Chrome bar** | `px-4 py-3 border-b border-slate-700/30 flex items-center gap-2` |
| **Traffic light dots container** | `flex gap-1.5` + `aria-hidden="true"` |
| **Dot — close (burgundy)** | `w-2.5 h-2.5 rounded-full bg-burgundy-700/60` |
| **Dot — minimize (gold)** | `w-2.5 h-2.5 rounded-full bg-gold-600/40` |
| **Dot — maximize (steel)** | `w-2.5 h-2.5 rounded-full bg-steel-400/40` |
| **URL bar** | `flex-1 text-center text-xs text-slate-600 font-sans` |
| **Content area** | `bg-gradient-to-br from-slate-900 via-slate-850 to-slate-900` + appropriate `aspect-ratio` |

This is identical to the landing page's app screenshot container (§4 in `page.tsx`). **Reuse the exact same component.**

#### Aspect Ratios by Context

| Screenshot Type | Aspect Ratio |
|---|---|
| Full app view (character builder) | `16/9` |
| Overlay preview (Twitch card) | `16/9` or `4/3` |
| Dice overlay preview | `16/9` |
| Campaign dashboard | `4/3` |
| Mobile screenshot | `9/16` (displayed smaller, `max-w-xs mx-auto`) |

#### Real Screenshots vs. Placeholders

Until real screenshots exist, use the `ImagePlaceholder` component from the landing page. The container styling (chrome bar, dots, shadow) wraps around either real images or placeholders identically.

When real screenshots are added:
```html
<img
  src="/images/screenshots/twitch-overlay.webp"
  alt="Twitch character card overlay showing HP, Stress, and Hope values live on stream"
  class="w-full h-auto"
  loading="lazy"
  decoding="async"
/>
```

Note `loading="lazy"` — sub-page screenshots are below the fold and should lazy-load.

---

## 3. Page-Specific Visual Treatments

Each page has a distinct emotional register. The palette stays the same, but the emphasis shifts.

---

### 3.1 `/features/streaming` — Streaming & Content Creation

**Emotional register:** Spotlight. Broadcast. Performance.

#### Hero Background

```
FantasyBgSection with overlay:
  bg-gradient-to-b from-slate-950/60 via-slate-950/75 to-slate-950

Lighter overlay than other pages — let more of the burgundy warmth through.
This page should feel warm and theatrical, like stage lighting.
```

**Atmospheric glow element:** Same CSS-only glow orb as landing hero, but shifted warmer:

```css
background: radial-gradient(
  circle,
  rgba(251, 191, 36, 0.25) 0%,    /* More gold than landing hero */
  rgba(170, 32, 71, 0.10) 50%,
  transparent 70%
);
```

Position: `top-1/3 left-1/2 -translate-x-1/2` — centered in the hero.

#### Hero Content

| Element | Content |
|---|---|
| Kicker | `STREAMING & CONTENT CREATION` |
| Headline | `Built for the Spotlight` |
| Subtitle | Description of streaming tools purpose |
| CTA | Primary: "Start Streaming Free" → `/auth/register`. Secondary: "Watch Curses! Live" → external link |

#### Accent Color Emphasis

This page leans harder on **gold** than any other sub-page. Gold = spotlight, broadcast energy, "you're live."

- Feature deep-dive kickers: `text-gold-400` (full opacity, not `/80`)
- Technical spec icons: `text-gold-400` (not `/60`)
- Screenshot container border on hover: `hover:border-gold-400/30`

#### Section Flow

```
1. Hero (FantasyBgSection, warm overlay)
   ─ Gold ornamental divider ─
2. Deep-Dive: Live Character Cards (bg-slate-950)
   ─ Slate structural divider ─
3. Deep-Dive: OBS Dice Log Overlay (bg-slate-900)
   ─ Slate structural divider ─
4. Deep-Dive: Public Character Sheets (bg-slate-950)
   ─ Gold ornamental divider ─
5. Technical Requirements Summary (bg-slate-900)
6. Final CTA (FantasyBgSection, warm overlay)
7. Footer
```

#### Technical Requirements Summary

A horizontal strip summarizing platform requirements. Uses the Stats Strip pattern from the landing page's "What is Curses?" section:

```
[ OBS 28+ ]    [ Twitch Affiliate+ ]    [ Any Modern Browser ]
```

Same `font-display text-xl text-gold-400` for values, `text-sm text-parchment-500 uppercase tracking-wider` for labels. Separated by gold gradient dividers on desktop, stacked on mobile.

---

### 3.2 `/features/campaigns` — Campaign Management

**Emotional register:** Command. Control. Strategic overview.

#### Hero Background

```
FantasyBgSection with overlay:
  bg-gradient-to-b from-slate-950/70 via-slate-950/85 to-slate-950

Heavier overlay than streaming — campaigns are about clarity and precision,
not warmth. The dark overlay creates a serious, focused mood.
```

**Atmospheric glow element:** Cooler tone. Steel tint instead of pure gold:

```css
background: radial-gradient(
  circle,
  rgba(87, 115, 153, 0.15) 0%,      /* Steel blue center */
  rgba(170, 32, 71, 0.10) 50%,       /* Burgundy rim */
  transparent 70%
);
```

#### Hero Content

| Element | Content |
|---|---|
| Kicker | `CAMPAIGN MANAGEMENT` |
| Headline | `Your Campaign Command Center` |
| Subtitle | One sentence about unified GM tools |
| CTA | Primary: "Start Your Campaign" → `/auth/register` |

#### Accent Color Emphasis

This page uses the **standard gold accent** but introduces more **steel-blue** (`steel-300` / `steel-400`) for informational and technical elements:

- WebSocket real-time badge: `bg-steel-400/10 text-steel-300 border border-steel-400/20 rounded-full px-3 py-0.5 text-xs font-sans`
- Technical spec values that relate to real-time features: `text-steel-300` instead of `text-parchment-200`

**Important:** Steel-400 (`#577399`) fails AA Normal at small sizes. Use `steel-300` (`#a3b6cf`, ~8.5:1) for any text under 18px.

#### Section Flow

```
1. Hero (FantasyBgSection, cool overlay)
   ─ Gold ornamental divider ─
2. Deep-Dive: Encounter Designer (bg-slate-950, image right)
   ─ Slate structural divider ─
3. Deep-Dive: Session Logs (bg-slate-900, image left)
   ─ Slate structural divider ─
4. Deep-Dive: Session Scheduling (bg-slate-950, image right)
   ─ Slate structural divider ─
5. Deep-Dive: GM Command HUD (bg-slate-900, image left)
   ─ Slate structural divider ─
6. Deep-Dive: Homebrew Workshop (bg-slate-950, image right)
   ─ Slate structural divider ─
7. Deep-Dive: Real-Time Features / WebSocket (bg-slate-900, image left)
   ─ Gold ornamental divider ─
8. Final CTA (FantasyBgSection)
9. Footer
```

This is the longest sub-page (6 deep-dives). The alternating image/text zigzag and background alternation (`slate-950 → slate-900 → slate-950 → ...`) prevent visual fatigue over the long scroll.

#### Homebrew Workshop Special Treatment

The homebrew deep-dive block gets a subtle **coral** accent to match the landing page's homebrew badge system:

- Kicker: `text-coral-400` instead of `text-gold-400`
- Icon badge: `bg-gradient-to-br from-coral-400/15 to-slate-900 border-coral-400/20` instead of burgundy
- Optional badge next to title: `<span class="bg-coral-400/10 text-coral-400 border border-coral-400/20 rounded-full px-3 py-0.5 text-xs font-sans ml-3">GM Only</span>`

---

### 3.3 `/features/new-players` — New Player Experience

**Emotional register:** Warm. Inviting. Approachable. Confidence-building.

#### Hero Background

```
FantasyBgSection with overlay:
  bg-gradient-to-b from-slate-950/50 via-slate-950/70 to-slate-950

Lightest overlay of all sub-pages — maximum warmth. This page is about welcome.
The burgundy background warmth should feel like candlelight, not darkness.
```

**Atmospheric glow element:** Warmest variant. Burgundy-dominant:

```css
background: radial-gradient(
  circle,
  rgba(251, 191, 36, 0.20) 0%,
  rgba(170, 32, 71, 0.20) 50%,    /* More burgundy than other pages */
  transparent 70%
);
```

#### Hero Content

| Element | Content |
|---|---|
| Kicker | `NEW TO DAGGERHEART?` |
| Headline | `Start Here` |
| Subtitle | Inviting message about ease of entry |
| CTA | Primary: "Create Your First Character" → `/auth/register`. Secondary: "Read the Quick Start Guide" → SRD anchor |

#### Accent Color Emphasis

Standard gold accent. No secondary accent colors. This page should feel simple and unintimidating — no steel-blue technical vibes, no coral badges. Just gold warmth and parchment readability.

#### Section Flow

```
1. Hero (FantasyBgSection, warmest overlay)
   ─ Gold ornamental divider ─
2. Step Visualization: 3-Step Guided Walkthrough (bg-slate-950)
   ─ Slate structural divider ─
3. GM Teaching Tools Section (bg-slate-900)
   ─ Slate structural divider ─
4. SRD Reference Section (bg-slate-950)
   ─ Gold ornamental divider ─
5. Final CTA (FantasyBgSection)
6. Footer
```

#### GM Teaching Tools Section

Not a deep-dive block — this is a **2-column layout** similar to the landing page's campaign section:

- Left column: Text (how GMs can use the ping system, guided creation, etc.)
- Right column: `ScreenshotContainer` showing the ping system in action

Same `grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center` layout.

#### SRD Reference Section

A centered section with:
- Heading: "Rules at Your Fingertips"
- 3-column grid of small feature cards (same `FeatureCard` pattern as landing page) highlighting SRD features: full-text search, inline tooltips, class/domain reference

This reuses the landing page's `FeatureCard` component exactly.

---

### 3.4 `/pricing` — Pricing Detail Page

**Emotional register:** Trust. Clarity. Confidence. No-nonsense.

#### Hero Background

```
FantasyBgSection with overlay:
  bg-gradient-to-b from-slate-950/80 via-slate-950/90 to-slate-950

Heaviest overlay. Pricing demands maximum background suppression.
Content clarity is paramount — no atmospheric distractions.
```

**Atmospheric glow element:** Minimal. Barely visible:

```css
background: radial-gradient(
  circle,
  rgba(251, 191, 36, 0.10) 0%,      /* Very subtle gold */
  rgba(74, 10, 20, 0.06) 50%,        /* Barely-there burgundy */
  transparent 70%
);
```

#### Hero Content

| Element | Content |
|---|---|
| Kicker | `PRICING` |
| Headline | `Simple, Honest Pricing` |
| Subtitle | "Players never pay. GMs get everything for less than a cup of coffee." |
| CTA | None in hero. The pricing cards ARE the CTA. |

#### Section Flow

```
1. Hero (FantasyBgSection, heavy overlay)
   ─ Gold ornamental divider ─
2. Pricing Cards (bg-slate-950) — same 2-card layout as landing page
3. Comparison Table (bg-slate-900) — full feature breakdown
4. FAQ Accordion (bg-slate-950) — common questions
   ─ Gold ornamental divider ─
5. Final CTA (FantasyBgSection)
6. Footer
```

#### Pricing Cards Section

**Reuse the exact `PricingCard` component from the landing page.** Same 2-column grid, same highlighted GM card, same "Recommended" badge. No changes.

The `/pricing` page shows the same cards as the landing page but with the full comparison table and FAQ below.

#### Accent Color Emphasis

Standard gold accent. The comparison table's GM column gets the subtle gold wash treatment (§2.3). FAQ section is neutral — no extra accent colors.

---

## 4. Animation Specs for Sub-Pages

### 4.1 Animations That Carry Over (No Changes)

| Animation | Usage on Sub-Pages |
|---|---|
| **Scroll reveal** (`useScrollReveal`) | Every section, every deep-dive block, every card. Same thresholds, same `duration-700 ease-out`. |
| **Stagger cards** (`StaggerCard`) | Feature card grids, step cards, pricing cards. Same `120ms` offset per index. |
| **Card hover** (`hover:-translate-y-1`) | All card variants. Same `duration-300`. |
| **CTA button shimmer** | Primary gold buttons. Same `via-white/20 translate-x-full duration-700`. |
| **CTA link arrow** | All "Learn more" links. Same `group-hover:translate-x-1`. |
| **Divider shimmer** (`animate-divider-shimmer`) | All ornamental gold dividers. |
| **Background drift** (`animate-bg-drift`) | Hero atmospheric glow elements. |
| **Nav materialize** | Same scroll-triggered backdrop transition. |

### 4.2 New Animation: FAQ Accordion Expand

Already covered by the CSS Grid `0fr → 1fr` technique in §2.4. Add this to `globals.css` if not already present:

```css
/* ─── FAQ Accordion ───────────────────────────────────────────────────────────
   Same CSS grid trick as SRD accordion. Smooth, performant, no JS.
   ─────────────────────────────────────────────────────────────────────────── */

.faq-accordion-grid {
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows 300ms ease-in-out;
}
.faq-accordion-grid.open {
  grid-template-rows: 1fr;
}
.faq-accordion-grid > div {
  overflow: hidden;
}
```

The chevron rotation uses Tailwind transition: `transition-transform duration-300`. When expanded, add `rotate-180`.

### 4.3 New Animation: Step Connector Draw-In (Optional Enhancement)

When step cards reveal on scroll, the connecting line between them could "draw in" from left to right:

```css
@keyframes connector-draw {
  from {
    transform: scaleX(0);
    transform-origin: left center;
  }
  to {
    transform: scaleX(1);
    transform-origin: left center;
  }
}

.animate-connector-draw {
  animation: connector-draw 600ms ease-out both;
}

@media (prefers-reduced-motion: reduce) {
  .animate-connector-draw {
    animation: none;
    transform: scaleX(1);
  }
}
```

**Usage:** Apply to the connector element, triggered when the parent step card becomes visible. Delay: `200ms` after the card's reveal completes.

**This is optional.** The page works fine without it. Only add if the static connector feels too abrupt when cards stagger in.

**Tailwind config addition (if used):**
```ts
keyframes: {
  "connector-draw": {
    from: { transform: "scaleX(0)", transformOrigin: "left center" },
    to:   { transform: "scaleX(1)", transformOrigin: "left center" },
  },
},
animation: {
  "connector-draw": "connector-draw 600ms ease-out both",
},
```

### 4.4 Animations NOT Needed

- **No page transition animations.** Next.js `<Link>` handles navigation. Adding cross-page transitions would require `framer-motion` or the experimental Next.js `View Transitions API`. Not worth the complexity for marketing pages.
- **No parallax on sub-page heroes.** The landing page hero has a layered parallax illustration. Sub-page heroes use simple gradient backgrounds — no parallax layers, no scroll-linked motion. Simpler, faster, cleaner.
- **No hero-emerge on sub-pages.** The `animate-hero-emerge` (blur + scale) is reserved for the landing page's first impression. Sub-page heroes use standard `RevealSection` scroll reveals.

---

## 5. Responsive Adaptations

### 5.1 Feature Deep-Dive Block

| Breakpoint | Behavior |
|---|---|
| `< lg` (< 1024px) | Single column. Image first (`order-1`), text second (`order-2`). All blocks show image-above-text regardless of the desktop alternation pattern. |
| `≥ lg` (1024px+) | Two columns. Alternating image placement per §2.1. |

Gap reduces: `gap-12 lg:gap-16` → effective `gap-12` (48px) on tablet, `gap-16` (64px) on desktop.

### 5.2 Technical Spec List

No responsive changes. The list is single-column content that reflows naturally. Value pills may wrap to new lines on very narrow screens — this is acceptable.

### 5.3 Comparison Table

| Breakpoint | Behavior |
|---|---|
| `< md` (< 768px) | Table hidden (`hidden md:block`). Stacked feature cards shown instead (`md:hidden`). See §2.3. |
| `≥ md` (768px+) | Full table visible. |

On narrow tablets (768–900px), the table may feel tight with three columns. Add `text-xs` to body cells at this range if needed: `md:text-xs lg:text-sm`.

### 5.4 FAQ Accordion

| Breakpoint | Behavior |
|---|---|
| All | Single-column, full-width. No responsive changes needed — accordions are inherently mobile-friendly. |

Padding adjusts slightly: `py-5` on trigger, `pb-5` on answer. On mobile, these provide sufficient touch target height (question text at `text-base` + `py-5` = well above 44px).

### 5.5 Step Visualization

| Breakpoint | Behavior |
|---|---|
| `< lg` (< 1024px) | Single column. Cards stack vertically with `gap-6`. Connector lines hidden (`hidden lg:flex`). |
| `≥ lg` (1024px+) | 5-column grid with connectors between cards. |

The numbered badges (1, 2, 3) provide sequential reading cues on mobile, making explicit connectors unnecessary.

### 5.6 Screenshot Container

| Breakpoint | Behavior |
|---|---|
| All | Fluid width, respects parent container. Aspect ratio maintained via `style={{ aspectRatio }}`. |
| Mobile screenshots (`9/16`) | Capped at `max-w-xs mx-auto` to prevent full-width portrait frames. |

### 5.7 Sub-Page Hero

| Breakpoint | Behavior |
|---|---|
| `< sm` (< 640px) | `min-h-[60vh]`, `pt-32 pb-16`. Headline at `text-4xl`. CTA buttons stack (`flex-col`, `w-full`). |
| `sm` (640px+) | `min-h-[50vh]`, `pt-40 pb-20`. Headline at `text-5xl`. CTA buttons inline (`flex-row`, `w-auto`). |
| `md` (768px+) | Headline at `text-6xl`. |

### 5.8 Typography Scaling on Sub-Pages

Sub-pages inherit the landing page's typography scale entirely. New elements scale as follows:

| Element | Base (< 640) | sm: | md: | lg: |
|---|---|---|---|---|
| Sub-page hero H1 | `text-4xl` | `text-5xl` | `text-6xl` | — |
| Deep-dive H3 | `text-2xl` | `text-3xl` | — | — |
| FAQ question text | `text-base` | `text-lg` | — | — |
| Step card title | `text-xl` | `text-2xl` | — | — |
| Comparison table body | — | — | `text-xs` | `text-sm` |

---

## Appendix A: Component Reuse Summary

| Component | Source | Reuse on Sub-Pages |
|---|---|---|
| `FantasyBgSection` | Landing page | Hero backgrounds, Final CTA backgrounds |
| `RevealSection` | Landing page | Every section |
| `StaggerCard` | Landing page | Card grids, deep-dive blocks |
| `FeatureCard` | Landing page | SRD feature grid (new players page) |
| `PricingCard` | Landing page | Pricing cards (pricing page) |
| `ImagePlaceholder` | Landing page | Screenshot containers until real images |
| `MarqueeRibbon` | Landing page | **Not reused.** Sub-pages don't have a marquee. |
| `StepCard` | Landing page | **Not reused.** New players page uses the enhanced `StepVisualization` variant. |
| `TestimonialCard` | Landing page | **Not reused.** No testimonial sections on sub-pages (yet). |

---

## Appendix B: New CSS Additions for globals.css

```css
/* ─── Sub-Page: FAQ Accordion ─────────────────────────────────────────────────
   CSS grid 0fr → 1fr trick, same as SRD accordion.
   ─────────────────────────────────────────────────────────────────────────── */

.faq-accordion-grid {
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows 300ms ease-in-out;
}
.faq-accordion-grid.open {
  grid-template-rows: 1fr;
}
.faq-accordion-grid > div {
  overflow: hidden;
}

/* ─── Sub-Page: Step Connector Draw-In (optional) ─────────────────────────────
   Line draws from left to right when step cards reveal.
   ─────────────────────────────────────────────────────────────────────────── */

@keyframes connector-draw {
  from {
    transform: scaleX(0);
    transform-origin: left center;
  }
  to {
    transform: scaleX(1);
    transform-origin: left center;
  }
}

.animate-connector-draw {
  animation: connector-draw 600ms ease-out both;
}

@media (prefers-reduced-motion: reduce) {
  .faq-accordion-grid {
    transition: none;
  }
  .faq-accordion-grid.open {
    grid-template-rows: 1fr;
  }
  .animate-connector-draw {
    animation: none;
    transform: scaleX(1);
  }
}
```

---

## Appendix C: New Tailwind Config Additions

```ts
// Inside theme.extend.keyframes
"connector-draw": {
  from: { transform: "scaleX(0)", transformOrigin: "left center" },
  to:   { transform: "scaleX(1)", transformOrigin: "left center" },
},

// Inside theme.extend.animation
"connector-draw": "connector-draw 600ms ease-out both",
```

No new colors, shadows, or fonts required. The existing design system covers everything.
