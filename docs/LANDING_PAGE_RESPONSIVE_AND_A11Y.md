# Curses! Landing Page — Responsive Strategy & Accessibility Audit

> **Scope:** Marketing landing page (`src/app/page.tsx`)  
> **Stack:** Next.js, Tailwind CSS, mobile-first  
> **Theme:** Dark-mode, custom color palette, Adobe Typekit fonts  
> **Date:** 2026-04-12

---

## Part 1 — Responsive Breakpoint Strategy

The page already ships mobile-first Tailwind classes. This document codifies the
system so every section follows the same responsive rhythm.

### 1.1 Breakpoint Reference

| Token  | Min-width | Target device       |
|--------|-----------|---------------------|
| _(base)_ | 0 px    | Small phones        |
| `sm:`  | 640 px    | Large phones / small tablets |
| `md:`  | 768 px    | Tablets             |
| `lg:`  | 1024 px   | Small laptops       |
| `xl:`  | 1280 px   | Desktop             |

Tailwind's default breakpoints are used (no custom additions in `tailwind.config.ts`).

---

### 1.2 Typography Scaling

#### Headlines (font-display / font-serif)

| Element              | Base (< 640) | sm:      | md:      | lg:      |
|----------------------|-------------|----------|----------|----------|
| Hero `<h1>`          | `text-5xl`  | `text-6xl` | `text-7xl` | `text-8xl` |
| Final CTA `<h2>`     | `text-4xl`  | `text-5xl` | `text-6xl` | —        |
| Section `<h2>`       | `text-3xl`  | `text-4xl` | —        | —        |
| Card `<h3>`          | `text-lg`   | —        | —        | —        |
| Community box `<h3>` | `text-2xl`  | —        | —        | —        |

**Current status:** ✅ Already implemented in the page. The hero scales across
four breakpoints; section headings jump once at `sm:`. No changes needed.

#### Body / Descriptive Text

| Element              | Base        | sm:        |
|----------------------|-------------|------------|
| Hero subtitle (eyebrow) | `text-sm` | `text-base` |
| Hero body `<p>`      | `text-lg`   | `text-xl`  |
| Section body `<p>`   | `text-base` | `text-lg`  |
| Card body `<p>`      | `text-sm`   | —          |

**Current status:** ✅ Implemented. The `font-body` (mestiza-sans) class handles
small-text readability; sofia-pro-narrow takes over at `text-lg+` via the
global CSS font-family override in `globals.css`.

#### Recommended Tailwind Pattern

```tsx
// Hero headline
className="font-display text-5xl sm:text-6xl md:text-7xl lg:text-8xl leading-[0.95]"

// Section headline
className="font-serif text-3xl sm:text-4xl font-bold"

// Section body
className="text-base sm:text-lg leading-relaxed font-body"
```

---

### 1.3 Section Spacing

Consistent vertical rhythm across breakpoints:

| Section type          | Base       | sm:        | lg:        |
|-----------------------|-----------|------------|------------|
| Standard content      | `py-20`   | `py-28`    | —          |
| Final CTA (dramatic)  | `py-24`   | `py-32`    | —          |
| Footer                | `py-12`   | —          | —          |
| Hero                  | `min-h-screen` (no padding needed — flex-centered) | | |

**Current status:** ✅ Already implemented (`py-20 sm:py-28` on all content
sections, `py-24 sm:py-32` on the final CTA).

#### Container Max-widths

| Section                    | Max-width       |
|----------------------------|-----------------|
| Navbar                     | `max-w-7xl`     |
| Hero content               | `max-w-4xl`     |
| "What is Curses?" section  | `max-w-6xl`     |
| App screenshot wrapper     | `max-w-4xl` (nested) |
| Feature spotlight sections | `max-w-6xl`     |
| Step cards                 | `max-w-4xl` (with `mx-auto`) |
| Pricing                    | `max-w-5xl` outer, `max-w-3xl` card grid |
| Community                  | `max-w-6xl`     |
| Final CTA                  | `max-w-4xl`     |
| Footer                     | `max-w-6xl`     |

**Horizontal padding:** `px-4 sm:px-6 lg:px-8` — consistent across all sections. ✅

---

### 1.4 Grid Layouts — Card Restacking

| Grid                      | Base (< 640) | sm: (640+) | md: (768+) | lg: (1024+) |
|---------------------------|-------------|-----------|-----------|------------|
| Streaming feature cards   | 1 col       | —         | 3 col     | —          |
| Step cards (new player)   | 1 col       | 3 col     | —         | —          |
| Pricing cards             | 1 col       | —         | 2 col     | —          |
| Testimonial cards         | 1 col       | 2 col     | —         | 3 col      |
| Featured streams          | 1 col       | 3 col     | —         | —          |
| Footer link columns       | 1 col       | 2 col     | —         | 4 col      |
| Campaign section (text + image) | 1 col (image first) | — | — | 2 col (text left, image right) |

**Tailwind patterns in use:**

```tsx
// 3-col feature cards
className="grid grid-cols-1 md:grid-cols-3 gap-6"

// 2-col pricing
className="grid grid-cols-1 md:grid-cols-2 gap-8"

// Testimonials: 1 → 2 → 3
className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"

// Campaign split layout with reorder
className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center"
// Text: order-2 lg:order-1
// Image: order-1 lg:order-2
```

**Current status:** ✅ All grids are properly restacking.

**Note on step cards:** The 3-col step grid uses `sm:grid-cols-3`, meaning it
jumps to 3 columns at 640 px. On narrow tablets (640–767 px), three cards may
feel tight. Consider `md:grid-cols-3` if user testing shows cramping, but the
current cards are compact enough to work at `sm:`.

---

### 1.5 Navigation — Mobile Hamburger → Desktop Inline

| Breakpoint | Behavior |
|-----------|----------|
| < `md:` (768 px) | Hamburger button visible. Desktop nav + CTA hidden via `hidden md:flex`. Mobile menu panel slides open with `max-height` transition. |
| ≥ `md:` (768 px) | Inline nav links + CTA buttons visible. Hamburger hidden via `md:hidden`. |

**Current status:** ✅ Correctly implemented.

**Keyboard behavior:**
- `Escape` closes mobile menu and returns focus to hamburger ✅
- `aria-expanded` + `aria-controls` on hamburger ✅
- Outside click closes menu ✅

**Recommendation:** Consider trapping focus inside the mobile menu when open
(Tab should not escape into content behind the panel). This is a nice-to-have,
not strictly required since the menu is inline content (not a modal overlay).

---

### 1.6 Hero Section Adaptation

| Aspect               | Base               | sm:                  | md:+      |
|-----------------------|-------------------|----------------------|-----------|
| Min height            | `min-h-screen`    | Same                 | Same      |
| Top padding           | `pt-24` (clear fixed nav) | `pt-0` (flex centers) | Same |
| Bottom padding        | `pb-16`           | `pb-0`               | Same      |
| CTA buttons           | `flex-col` (stacked, `w-full`) | `flex-row` (inline, `w-auto`) | Same |
| Background glow       | 600×600 px blur circle | Same (scales by design) | Same |
| Scroll indicator      | Visible           | Visible              | Visible   |

**Current status:** ✅ The hero uses smart padding overrides (`pt-24 pb-16
sm:pt-0 sm:pb-0`) to handle the fixed navbar on mobile while letting flex
centering take over on larger screens. CTA buttons stack vertically on mobile
with `w-full`, then go inline at `sm:` with `w-auto`.

---

### 1.7 Pricing Cards

| Breakpoint | Layout | Notes |
|-----------|--------|-------|
| < `md:` | Stacked vertically (1-col) | "Recommended" badge still positioned with `-top-3` |
| ≥ `md:` | Side-by-side (2-col) | Cards use `h-full` via `flex flex-col` to equalize height |

**Current status:** ✅ `grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl mx-auto`

**Note:** The highlighted card's "Recommended" pill uses `absolute -top-3`.
This works correctly in both stacked and side-by-side layouts because the
pill is positioned relative to its card, not the grid. ✅

---

### 1.8 Image Placeholders

| Element                     | Aspect ratio | Responsive notes |
|----------------------------|-------------|-----------------|
| App screenshot              | 16:9        | Fixed via inline `style={{ aspectRatio }}` |
| Campaign command center     | 4:3         | Fixed; on mobile, shown above text (order-1) |
| Featured streams            | 16:9        | Three in a row at `sm:`, stacked at base |
| `ImagePlaceholder` component | Configurable (default 16:9) | Uses inline style |

**Current status:** ✅ Aspect ratios are maintained via CSS `aspect-ratio`,
which is well-supported. No visibility toggling is used (all images render at
all breakpoints), which is correct — the placeholders are lightweight.

---

### 1.9 Stats Strip

The "100% / $5 / Built" stats strip uses:

```tsx
className="flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-0"
```

- **Mobile:** Stacked vertically with `gap-6`
- **sm:+:** Horizontal with gold gradient dividers between items (`hidden sm:block`)

**Current status:** ✅ Clean restack.

---

### 1.10 Marquee Ribbon

The marquee runs at all breakpoints. The CSS animation is defined in
`globals.css` with a 40-second linear loop. It pauses on hover.

**Responsive note:** The ribbon content is `aria-hidden="true"` (decorative),
so it does not affect screen reader flow. The doubled items ensure seamless
wrapping regardless of viewport width. No responsive changes needed.

---

## Part 2 — WCAG Accessibility Audit

### 2.1 Color Contrast Ratios

All ratios computed against the theme's hex values using the WCAG 2.x relative
luminance formula.

#### Primary text on slate-950 (`#080d17`)

| Foreground             | Hex       | Ratio   | AA Normal (4.5:1) | AA Large (3:1) | AAA (7:1) |
|------------------------|-----------|---------|--------------------|----------------|-----------|
| parchment-50           | `#fefce8` | 18.79:1 | ✅ PASS             | ✅ PASS         | ✅ PASS    |
| parchment-300          | `#f5e6a3` | 15.49:1 | ✅ PASS             | ✅ PASS         | ✅ PASS    |
| parchment-400          | `#e8c96d` | 12.04:1 | ✅ PASS             | ✅ PASS         | ✅ PASS    |
| parchment-500          | `#d4a94a` | 8.86:1  | ✅ PASS             | ✅ PASS         | ✅ PASS    |
| parchment-600          | `#b8872c` | 6.05:1  | ✅ PASS             | ✅ PASS         | ❌ FAIL    |
| gold-400               | `#fbbf24` | 11.64:1 | ✅ PASS             | ✅ PASS         | ✅ PASS    |
| gold-400 at 80% opacity | blends to `#ca9b21` | 7.61:1 | ✅ PASS | ✅ PASS | ✅ PASS |

**All primary text combinations pass WCAG AA.** The palette is exceptionally
strong. Parchment-600 misses AAA by a small margin but comfortably passes AA.

#### Opacity-reduced decorative/secondary text

| Foreground               | Blended hex | Ratio   | AA Normal | Notes |
|--------------------------|-------------|---------|-----------|-------|
| gold-400/70              | `#b28920`   | 6.01:1  | ✅ PASS    | Used for marquee text |
| gold-400/40              | `#69541c`   | 2.67:1  | ❌ FAIL    | Decorative quote marks — `aria-hidden`, OK |

#### Text on semi-transparent card backgrounds

| Foreground     | Background (blended)        | Ratio   | AA Normal |
|----------------|-----------------------------|---------|-----------|
| parchment-500  | slate-900/60 on slate-950 (`#0c1322`) | 8.46:1 | ✅ PASS |
| parchment-400  | slate-900/60 on slate-950 (`#0c1322`) | 11.49:1 | ✅ PASS |

#### Placeholder / hint text (non-essential)

| Foreground  | Hex       | Background   | Ratio  | AA Normal | Notes |
|-------------|-----------|-------------|--------|-----------|-------|
| slate-600   | `#475569` | slate-950   | 2.57:1 | ❌ FAIL    | Image placeholder captions |
| slate-600   | `#475569` | slate-900   | 2.36:1 | ❌ FAIL    | Browser bar URL text |
| slate-700   | `#334155` | slate-900   | ~1.7:1 | ❌ FAIL    | Placeholder icons |

> **⚠️ Issue — Placeholder text contrast.** The `text-slate-600` and
> `text-slate-700` classes used inside `ImagePlaceholder` and the faux browser
> chrome fail WCAG AA. These are placeholder-only elements that will be replaced
> by real images, so this is **acceptable for now**. When real screenshots are
> added, remove the text entirely or upgrade to `text-slate-400` (`#94a3b8`,
> ~4.7:1) if any caption text remains.

---

### 2.2 Minimum Touch Targets (44 × 44 px)

| Element                      | Current size           | Status    |
|------------------------------|------------------------|-----------|
| Hamburger button             | `w-11 h-11` (44×44)   | ✅ PASS    |
| Mobile nav buttons           | `min-h-[44px]` + full width | ✅ PASS |
| Mobile CTA links             | `min-h-[44px]` + full width | ✅ PASS |
| Hero CTA buttons             | `py-4 px-8` + `w-full` on mobile | ✅ PASS |
| Final CTA buttons            | `py-4 px-10` + `w-full` on mobile | ✅ PASS |
| Footer social icon buttons   | `w-9 h-9` (36×36)     | **⚠️ FAIL** |
| Footer text links            | No min-height set      | **⚠️ WARN** |
| Desktop nav buttons          | Text only, no min-size | ✅ OK (desktop pointer) |

> **⚠️ Fix required — Footer social icons.** The Discord and Twitter/X icon
> buttons in the footer are `w-9 h-9` (36×36 px), below the 44×44 WCAG minimum.
>
> **Fix:**
> ```tsx
> // Change from:
> className="... w-9 h-9 ..."
> // To:
> className="... w-11 h-11 ..."
> ```
>
> Alternatively, add `min-w-[44px] min-h-[44px]` to preserve the visual border
> at `w-9 h-9` while expanding the tap target with padding.

> **⚠️ Soft warning — Footer text links.** The footer nav links (`Features`,
> `Pricing`, `Discord`, etc.) are `text-sm` with no explicit height. On mobile
> they rely on default line-height (~22 px) plus the `space-y-2.5` gap. The
> **effective tap target including gap** is roughly 32–34 px, which is below 44 px.
>
> **Recommended fix:** Add `min-h-[44px] flex items-center` to each footer nav
> link, or wrap them in a touch-target-expanding container.

---

### 2.3 Focus Indicators

The page uses a two-layer focus strategy:

1. **Global fallback** (`globals.css`):
   ```css
   *:focus-visible {
     outline: 2px solid #fbbf24;
     outline-offset: 2px;
   }
   ```

2. **Component-level ring** (Tailwind):
   ```tsx
   focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-400
   ```
   Some elements add `focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950`.

**Assessment:** ✅ **Excellent.** The gold ring on dark background is
unmistakable. Gold-400 (`#fbbf24`) on slate-950 yields **11.64:1** contrast —
far exceeding the 3:1 minimum for UI components.

The `ring-offset` on primary CTA buttons prevents the ring from merging with
the gold gradient background. ✅

**One note:** The global `outline` fallback and the Tailwind `ring` system
don't conflict because the component classes explicitly set
`focus:outline-none` before applying `focus-visible:ring-*`. This is correct.

---

### 2.4 Skip Navigation

**Current status:** ❌ **Not implemented.**

The page has no "Skip to main content" link. With the fixed sticky header, a
keyboard user must tab through 5–8 nav/CTA links before reaching page content.

**Recommended implementation:**

```tsx
{/* Add as the very first child inside the root <div> */}
<a
  href="#main-content"
  className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:rounded-lg focus:bg-gold-400 focus:px-4 focus:py-2 focus:text-sm focus:font-bold focus:text-slate-950 focus:shadow-glow-gold"
>
  Skip to content
</a>

{/* Then add id="main-content" to the hero section */}
<section id="main-content" className="relative min-h-screen ...">
```

This gives keyboard users a single Tab press to jump past the entire nav bar.
The link is invisible until focused, then renders as a gold pill in the top-left.

---

### 2.5 ARIA Landmarks & Labelling

| Section                    | Element      | ARIA labelling               | Status    |
|----------------------------|-------------|------------------------------|-----------|
| Sticky header              | `<header>`  | (implicit `banner`)          | ✅ OK     |
| Desktop nav                | `<nav>`     | `aria-label="Main navigation"` | ✅ PASS |
| Mobile nav                 | `<nav>`     | `aria-label="Mobile navigation"` | ✅ PASS |
| Hero                       | `<section>` | `aria-label="Hero"`          | ✅ PASS   |
| What is Curses?            | `<section>` | `aria-labelledby="about-heading"` | ✅ PASS |
| Streaming features         | via `FantasyBgSection` | `aria-label` on `<section>` | ✅ PASS |
| Campaign tools             | `<section>` | `aria-labelledby="campaigns-heading"` | ✅ PASS |
| New player experience      | via `FantasyBgSection` | `aria-label` (descriptive) | ✅ PASS |
| Pricing                    | `<section>` | `aria-labelledby="pricing-heading"` | ✅ PASS |
| Community                  | `<section>` | `aria-labelledby="community-heading"` | ✅ PASS |
| Final CTA                  | via `FantasyBgSection` | `aria-label` (descriptive) | ✅ PASS |
| Footer                     | `<footer>`  | (implicit `contentinfo`)     | ✅ OK     |
| Footer product links       | `<nav>`     | `aria-label="Product links"` | ✅ PASS   |
| Footer community links     | `<nav>`     | `aria-label="Community links"` | ✅ PASS |
| Footer legal links         | `<nav>`     | `aria-label="Legal links"`   | ✅ PASS   |

**Assessment:** ✅ **Excellent landmark coverage.** Every section has either
`aria-label` or `aria-labelledby`. Footer sub-navs are individually labelled.

**Minor note:** The Marquee Ribbon has `aria-hidden="true"` — correct, since
it's purely decorative. ✅

**Missing `<main>` landmark:** The page has no `<main>` element. The content
lives inside a `<div>`. This means screen reader landmark navigation won't
find a "main" region.

> **Recommended fix:** Wrap the page content (from hero through final CTA) in
> a `<main id="main-content">` element. This also provides the skip-nav target.

---

### 2.6 Motion & `prefers-reduced-motion`

| Animation                        | Reduced-motion handling   | Status    |
|----------------------------------|--------------------------|-----------|
| Scroll reveal (`useScrollReveal`) | Sets `isVisible = true` immediately if `prefers-reduced-motion: reduce` | ✅ PASS |
| Marquee ribbon                   | `animation: none` in `globals.css` | ✅ PASS |
| Hero CTA shimmer                 | CSS `group-hover:translate-x-full` — user-initiated, not auto | ✅ OK |
| Card hover lift                  | CSS `hover:-translate-y-1` — user-initiated | ✅ OK |
| Scroll indicator bounce          | `animate-bounce` — **not suppressed** | **⚠️ WARN** |
| Loading spinner                  | `animate-spin` — **not suppressed** | **⚠️ WARN** |
| Button hover/focus transitions   | User-initiated, < 100ms effective | ✅ OK |
| Smooth scroll (`scrollIntoView`) | Uses `behavior: "smooth"` — **not suppressed** | **⚠️ WARN** |

> **⚠️ Recommendations:**
>
> 1. **Scroll indicator bounce:** Add a reduced-motion override. The `animate-bounce`
>    class runs continuously and can cause discomfort.
>    ```css
>    @media (prefers-reduced-motion: reduce) {
>      .animate-bounce { animation: none; }
>    }
>    ```
>    _Note: Tailwind v3.4+ may already suppress this if using the `motion-reduce:`
>    variant, but confirm the Tailwind version in use handles it._
>
> 2. **Loading spinner:** The `animate-spin` is short-lived (auth redirect).
>    Acceptable per WCAG — loading indicators are an allowed exception. But
>    adding `motion-reduce:animate-none` with a static "Loading…" text visible
>    would be ideal.
>
> 3. **Smooth scroll:** Wrap `scrollIntoView` calls:
>    ```ts
>    function scrollToId(id: string) {
>      const el = document.getElementById(id);
>      if (!el) return;
>      const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
>      el.scrollIntoView({ behavior: prefersReduced ? "auto" : "smooth", block: "start" });
>    }
>    ```

---

### 2.7 Color-Alone Information

| Element                   | Uses color alone? | Alternative cue        | Status    |
|---------------------------|-------------------|------------------------|-----------|
| Highlighted pricing card  | Gold border + glow | "Recommended" text pill | ✅ PASS   |
| Feature check marks       | Gold color         | Checkmark icon shape   | ✅ PASS   |
| Step number circles       | Gold gradient bg   | Number inside circle   | ✅ PASS   |
| Stats strip values        | Gold text          | Paired with label text | ✅ PASS   |
| Ornamental dividers       | Gold gradient line | `aria-hidden="true"`   | ✅ OK (decorative) |
| Testimonial quote mark    | Gold/40 opacity    | `aria-hidden="true"`   | ✅ OK (decorative) |

**Assessment:** ✅ **No information is conveyed by color alone.** The highlighted
pricing card has both a visual treatment (gold border + glow shadow) AND a text
badge ("Recommended"). Checkmarks use iconography in addition to color.

---

### 2.8 Screen Reader & Alt Text

#### Image Alt Text

| Image                    | Current alt / aria-label                                    | Status |
|--------------------------|-------------------------------------------------------------|--------|
| Logo (header)            | `alt="Curses!"`                                             | ✅      |
| Logo (footer)            | `alt="Curses!"`                                             | ✅      |
| MIJ logo (footer)        | `alt="Man in Jumpsuit"`                         | ✅      |
| Hero background          | `role="img" aria-label="Fantasy painting: ..."` (descriptive) | ✅    |
| App screenshot placeholder | `role="img" aria-label="Screenshot of the Curses! character builder..."` | ✅ |
| Campaign placeholder     | `role="img" aria-label="Screenshot of the Curses! campaign..."` | ✅   |
| Featured stream placeholders | `role="img" aria-label="Featured stream: ..."` (×3)     | ✅      |
| Fantasy section backgrounds | `role="img" aria-label` on gradient div                  | ✅      |

#### Screen Reader-Only Text

| Element                                      | sr-only text                         | Status |
|----------------------------------------------|--------------------------------------|--------|
| Loading spinner                              | `<span className="sr-only">Loading…</span>` | ✅ |
| Redirect spinner                             | `<span className="sr-only">Redirecting to dashboard…</span>` | ✅ |
| Discord link (community section)             | `<span className="sr-only"> (opens in new tab)</span>` | ✅ |
| Discord link (footer)                        | Full `aria-label` with "(opens in new tab)" | ✅ |
| Twitter/X link (footer)                      | Full `aria-label` with "(opens in new tab)" | ✅ |
| MIJ logo link (footer)                       | Full `aria-label` with "(opens in new tab)" | ✅ |
| Footer text Discord link                     | `<span className="sr-only"> (opens in new tab)</span>` | ✅ |
| Footer text Twitter link                     | `<span className="sr-only"> (opens in new tab)</span>` | ✅ |
| Icon-only hamburger button                   | `aria-label` dynamically set          | ✅      |
| Feature card icons                           | `aria-hidden="true"` on `<i>`         | ✅      |
| Decorative elements (dividers, dots, glows)  | `aria-hidden="true"`                  | ✅      |

**Assessment:** ✅ **Thorough.** Every decorative icon has `aria-hidden="true"`,
every meaningful image has descriptive alt text, and all external links announce
"opens in new tab".

#### Link Context

| Link text                          | Destination         | Unique?  | Notes |
|------------------------------------|---------------------|----------|-------|
| "Create Your Character — Free"     | `/auth/register`    | ✅       |       |
| "See What GMs Get"                 | `#pricing`          | ✅       |       |
| "Learn more about streaming features" | `/features/streaming` | ✅   |       |
| "Explore campaign tools"           | `/features/campaigns` | ✅     |       |
| "Learn about the new player experience" | `/features/new-players` | ✅ |    |
| "Create Your Character"            | `/auth/register`    | ✅       | Pricing card CTA |
| "Start Your Campaign"              | `/auth/register`    | ✅       | Pricing card CTA |
| "Join the Discord"                 | External Discord    | ✅       |       |
| "Start Free — Create a Character"  | `/auth/register`    | ✅       | Final CTA |
| "Log In"                           | `/auth/login`       | Appears 3× | ⚠️ Acceptable — different sections, same destination |

All link texts are descriptive and distinguishable. ✅

---

## Summary of Issues & Recommendations

### Must Fix (Accessibility Violations)

| # | Issue | Severity | Section |
|---|-------|----------|---------|
| 1 | **Footer social icons below 44×44 px touch target** — `w-9 h-9` (36×36) | WCAG 2.5.8 failure | §2.2 |
| 2 | **No skip navigation link** — keyboard users must tab through all nav items | WCAG 2.4.1 failure | §2.4 |
| 3 | **No `<main>` landmark** — screen reader landmark nav won't find main content | WCAG 1.3.1 (best practice) | §2.5 |

### Should Fix (Enhancements)

| # | Issue | Severity | Section |
|---|-------|----------|---------|
| 4 | `animate-bounce` on scroll indicator not suppressed for reduced motion | Comfort | §2.6 |
| 5 | `scrollIntoView({ behavior: "smooth" })` not respecting reduced motion | Comfort | §2.6 |
| 6 | Footer text links lack 44 px touch targets on mobile | Usability | §2.2 |

### No Action Required

| Area | Status |
|------|--------|
| All primary text contrast ratios | ✅ Pass WCAG AA (most pass AAA) |
| Gold-400 on slate-950 (accent text) | ✅ 11.64:1 |
| Parchment-500 on card backgrounds | ✅ 8.46:1+ |
| Focus ring visibility | ✅ 11.64:1 contrast, 2 px ring |
| Color-alone information | ✅ All color-coded elements have text alternatives |
| Screen reader text / alt text | ✅ Comprehensive coverage |
| ARIA landmarks and labelling | ✅ Every section labelled |
| `prefers-reduced-motion` for scroll reveals | ✅ Immediate visibility |
| `prefers-reduced-motion` for marquee | ✅ Suppressed |
| Responsive typography | ✅ Scales at 4 breakpoints |
| Grid restacking | ✅ All grids properly reflow |
| Mobile nav keyboard support | ✅ Escape, aria-expanded, outside click |
| Touch targets on mobile nav | ✅ min-h-[44px] |
