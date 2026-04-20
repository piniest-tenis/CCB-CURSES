# Curses! — Landing Page Visual Design System

> **Status**: In progress
> **Version**: 1.0
> **Date**: April 12, 2026

---

## Section 1: Typography Scale

The landing page typography follows the Griflan editorial approach: **oversized headlines, generous leading, dramatic contrast between heading and body sizes**. Headlines should feel monumental — this page is a statement, not a data table. Every text role below is spec'd with exact Tailwind classes for implementation.

### Design Principles

- **Headlines dominate.** The display font (`jetsam-collection-basilea`) appears only in the hero. Everywhere else, `double-pica` carries the weight. These fonts are loud by nature — let them be loud.
- **Body stays quiet.** `mestiza-sans` at comfortable sizes. Never fights the headlines. Reads clean on dark backgrounds.
- **Small caps earn their space.** `double-pica-sc` is reserved for kickers, labels, and navigational taxonomy. It signals structure, not decoration.
- **Condensed sans for UI.** `sofia-pro-narrow` handles buttons, nav, stats — anywhere space is tight and legibility at medium sizes matters.

### Typographic Scale Reference

All sizes are desktop defaults. Mobile overrides noted where applicable.

---

#### Hero Headline (Display)

The single biggest text on the entire site. One line, maybe two. This is the monument.

| Property | Value |
|---|---|
| Font family | `font-display` (`jetsam-collection-basilea`) |
| Tailwind size | `text-7xl` desktop / `text-5xl` tablet / `text-4xl` mobile |
| Size (px / rem) | 72px / 4.5rem desktop, 48px / 3rem tablet, 36px / 2.25rem mobile |
| Weight | `font-normal` (display fonts carry their own weight) |
| Line height | `leading-[1.05]` |
| Letter spacing | `tracking-wide` (+0.025em) |
| Color | `text-parchment-50` (`#fefce8`) |
| Extra | Consider `text-8xl` (96px / 6rem) if headline is ≤4 words. Add subtle `text-shadow` via custom utility: `[text-shadow:_0_0_40px_rgba(74,10,20,0.4)]` for atmospheric depth. |

**Tailwind class string:**
```
font-display text-4xl sm:text-5xl md:text-7xl lg:text-8xl font-normal leading-[1.05] tracking-wide text-parchment-50
```

---

#### Hero Kicker (Small Caps — above headline)

Tiny, structural, atmospheric. Tells you what category you're in before the headline lands.

| Property | Value |
|---|---|
| Font family | `font-serif-sc` (`double-pica-sc`) |
| Tailwind size | `text-sm` desktop / `text-xs` mobile |
| Size (px / rem) | 14px / 0.875rem desktop, 12px / 0.75rem mobile |
| Weight | `font-normal` |
| Line height | `leading-normal` (1.5) |
| Letter spacing | `tracking-[0.2em]` |
| Color | `text-gold-400` (`#fbbf24`) |
| Extra | Uppercase is inherent to the small-caps font. Add `mb-4` below to separate from headline. |

**Tailwind class string:**
```
font-serif-sc text-xs sm:text-sm font-normal leading-normal tracking-[0.2em] text-gold-400 mb-4
```

---

#### Section Headlines (H2)

The workhorse heading. Big enough to anchor a full-viewport section. `double-pica` serif — editorial authority.

| Property | Value |
|---|---|
| Font family | `font-serif` (`double-pica`) |
| Tailwind size | `text-4xl` desktop / `text-3xl` tablet / `text-2xl` mobile |
| Size (px / rem) | 36px / 2.25rem desktop, 30px / 1.875rem tablet, 24px / 1.5rem mobile |
| Weight | `font-bold` (700) |
| Line height | `leading-[1.15]` |
| Letter spacing | `tracking-normal` (0) |
| Color | `text-parchment-50` (`#fefce8`) |
| Extra | Pair with a kicker above (small caps, gold) or a rule below (`border-b border-gold-400/20 pb-4`). |

**Tailwind class string:**
```
font-serif text-2xl sm:text-3xl md:text-4xl font-bold leading-[1.15] text-parchment-50
```

---

#### Section Sub-Headlines

Sits directly below H2. Provides the one-sentence expansion. Lighter weight, warmer color.

| Property | Value |
|---|---|
| Font family | `font-serif` (`double-pica`) |
| Tailwind size | `text-xl` desktop / `text-lg` mobile |
| Size (px / rem) | 20px / 1.25rem desktop, 18px / 1.125rem mobile |
| Weight | `font-normal` (400) |
| Line height | `leading-relaxed` (1.625) |
| Letter spacing | `tracking-normal` |
| Color | `text-parchment-300` (`#f5e6a3`) |
| Extra | `mt-3 max-w-2xl` to constrain line length and space from heading. |

**Tailwind class string:**
```
font-serif text-lg md:text-xl font-normal leading-relaxed text-parchment-300 mt-3 max-w-2xl
```

---

#### Feature Card Titles

Inside cards (value prop grid, feature deep-dives, pricing cards). Needs to punch but not compete with section H2.

| Property | Value |
|---|---|
| Font family | `font-serif` (`double-pica`) |
| Tailwind size | `text-xl` desktop / `text-lg` mobile |
| Size (px / rem) | 20px / 1.25rem desktop, 18px / 1.125rem mobile |
| Weight | `font-semibold` (600) |
| Line height | `leading-snug` (1.375) |
| Letter spacing | `tracking-normal` |
| Color | `text-parchment-100` (`#fef9c3`) |

**Tailwind class string:**
```
font-serif text-lg md:text-xl font-semibold leading-snug text-parchment-100
```

---

#### Body Copy (Paragraphs)

The default reading text. `mestiza-sans` was chosen for this — it's the most legible face in the system at small sizes on dark backgrounds. Generous line height. Constrained measure.

| Property | Value |
|---|---|
| Font family | `font-body` (`mestiza-sans`) |
| Tailwind size | `text-base` (desktop and mobile) |
| Size (px / rem) | 16px / 1rem |
| Weight | `font-normal` (400) |
| Line height | `leading-relaxed` (1.625) |
| Letter spacing | `tracking-normal` |
| Color | `text-parchment-300` (`#f5e6a3`) |
| Extra | `max-w-prose` (65ch) for comfortable reading measure. For feature descriptions sitting beside images, use `max-w-xl`. |

**Tailwind class string:**
```
font-body text-base font-normal leading-relaxed text-parchment-300 max-w-prose
```

---

#### Small / Caption Text

Metadata, timestamps, micro-copy beneath CTAs ("Free forever. No credit card required."), legal, attribution.

| Property | Value |
|---|---|
| Font family | `font-body` (`mestiza-sans`) |
| Tailwind size | `text-sm` |
| Size (px / rem) | 14px / 0.875rem |
| Weight | `font-normal` (400) |
| Line height | `leading-normal` (1.5) |
| Letter spacing | `tracking-normal` |
| Color | `text-slate-400` (`#94a3b8`) |
| Extra | For CTA micro-copy specifically, use `text-parchment-400/70` for warmer tone. |

**Tailwind class string:**
```
font-body text-sm font-normal leading-normal text-slate-400
```

---

#### CTA Button Text — Primary

The main action button ("Create Your First Character"). `sofia-pro-narrow` is condensed — it packs well into buttons without feeling cramped. ALL-CAPS for authority.

| Property | Value |
|---|---|
| Font family | `font-sans` (`sofia-pro-narrow`) |
| Tailwind size | `text-base` desktop / `text-sm` mobile |
| Size (px / rem) | 16px / 1rem desktop, 14px / 0.875rem mobile |
| Weight | `font-bold` (700) |
| Line height | `leading-none` (1) |
| Letter spacing | `tracking-[0.08em]` |
| Transform | `uppercase` |
| Color | `text-slate-950` (`#080d17`) on `bg-gold-400` background |
| Extra | Button padding: `px-8 py-4` desktop, `px-6 py-3` mobile. Rounded: `rounded-md`. |

**Tailwind class string (text only):**
```
font-sans text-sm md:text-base font-bold leading-none tracking-[0.08em] uppercase text-slate-950
```

---

#### CTA Button Text — Secondary

Ghost/outline button ("Watch Curses! Live", "Join the Discord"). Same type treatment, different chrome.

| Property | Value |
|---|---|
| Font family | `font-sans` (`sofia-pro-narrow`) |
| Tailwind size | `text-base` desktop / `text-sm` mobile |
| Size (px / rem) | 16px / 1rem desktop, 14px / 0.875rem mobile |
| Weight | `font-semibold` (600) |
| Line height | `leading-none` (1) |
| Letter spacing | `tracking-[0.08em]` |
| Transform | `uppercase` |
| Color | `text-gold-400` (`#fbbf24`) on transparent background, `border border-gold-400/40` |

**Tailwind class string (text only):**
```
font-sans text-sm md:text-base font-semibold leading-none tracking-[0.08em] uppercase text-gold-400
```

---

#### Nav Links

Top navigation. Understated. `sofia-pro-narrow` condensed sans keeps nav items compact.

| Property | Value |
|---|---|
| Font family | `font-sans` (`sofia-pro-narrow`) |
| Tailwind size | `text-sm` |
| Size (px / rem) | 14px / 0.875rem |
| Weight | `font-medium` (500) |
| Line height | `leading-none` (1) |
| Letter spacing | `tracking-[0.05em]` |
| Transform | `uppercase` |
| Color | `text-parchment-400` (`#e8c96d`) — active: `text-gold-400` |
| Extra | Hover: `hover:text-gold-400 transition-colors duration-200`. Active indicator: 2px gold underline offset by 6px (`decoration-gold-400 underline-offset-[6px] decoration-2`). |

**Tailwind class string:**
```
font-sans text-sm font-medium leading-none tracking-[0.05em] uppercase text-parchment-400 hover:text-gold-400 transition-colors duration-200
```

---

#### Stats Strip — Numbers

The social proof numbers (viewer count, characters created, etc.). Big. Impactful. `double-pica` serif for gravitas.

| Property | Value |
|---|---|
| Font family | `font-serif` (`double-pica`) |
| Tailwind size | `text-5xl` desktop / `text-3xl` mobile |
| Size (px / rem) | 48px / 3rem desktop, 30px / 1.875rem mobile |
| Weight | `font-bold` (700) |
| Line height | `leading-none` (1) |
| Letter spacing | `tracking-tight` (-0.025em) |
| Color | `text-gold-400` (`#fbbf24`) |

**Tailwind class string:**
```
font-serif text-3xl md:text-5xl font-bold leading-none tracking-tight text-gold-400
```

---

#### Stats Strip — Labels

Small-caps label beneath each stat number.

| Property | Value |
|---|---|
| Font family | `font-serif-sc` (`double-pica-sc`) |
| Tailwind size | `text-xs` |
| Size (px / rem) | 12px / 0.75rem |
| Weight | `font-normal` |
| Line height | `leading-normal` (1.5) |
| Letter spacing | `tracking-[0.15em]` |
| Color | `text-parchment-400` (`#e8c96d`) |

**Tailwind class string:**
```
font-serif-sc text-xs font-normal leading-normal tracking-[0.15em] text-parchment-400 mt-2
```

---

#### Pricing Card — Tier Title

"Player" / "Game Master" at the top of each pricing card.

| Property | Value |
|---|---|
| Font family | `font-serif-sc` (`double-pica-sc`) |
| Tailwind size | `text-lg` |
| Size (px / rem) | 18px / 1.125rem |
| Weight | `font-normal` |
| Line height | `leading-normal` |
| Letter spacing | `tracking-[0.12em]` |
| Color | `text-gold-400` (`#fbbf24`) |

**Tailwind class string:**
```
font-serif-sc text-lg font-normal leading-normal tracking-[0.12em] text-gold-400
```

---

#### Pricing Card — Price

"FREE" or "$5/mo". The number itself should be large and unmissable.

| Property | Value |
|---|---|
| Font family | `font-serif` (`double-pica`) |
| Tailwind size | `text-5xl` for "FREE", `text-5xl` for "$5" with `text-xl` for "/mo" |
| Size (px / rem) | 48px / 3rem main, 20px / 1.25rem suffix |
| Weight | `font-bold` (700) |
| Line height | `leading-none` (1) |
| Letter spacing | `tracking-tight` |
| Color | `text-parchment-50` (`#fefce8`) for main, `text-parchment-400` for suffix |

**Tailwind class string (price number):**
```
font-serif text-5xl font-bold leading-none tracking-tight text-parchment-50
```

**Tailwind class string (price suffix):**
```
font-serif text-xl font-normal text-parchment-400 ml-1
```

---

#### Pricing Card — Feature List Items

Checklist of included features within each pricing tier.

| Property | Value |
|---|---|
| Font family | `font-body` (`mestiza-sans`) |
| Tailwind size | `text-sm` |
| Size (px / rem) | 14px / 0.875rem |
| Weight | `font-normal` (400) |
| Line height | `leading-relaxed` (1.625) |
| Color | `text-parchment-300` (`#f5e6a3`) |
| Extra | Checkmark icon in `text-gold-400` preceding each item. Spacing: `space-y-3`. |

**Tailwind class string:**
```
font-body text-sm font-normal leading-relaxed text-parchment-300
```

---

#### Footer Text

Copyright, legal links, production credits.

| Property | Value |
|---|---|
| Font family | `font-body` (`mestiza-sans`) |
| Tailwind size | `text-xs` for legal, `text-sm` for links |
| Size (px / rem) | 12px / 0.75rem legal, 14px / 0.875rem links |
| Weight | `font-normal` (400) |
| Line height | `leading-normal` (1.5) |
| Color | `text-slate-400` (`#94a3b8`) for legal, `text-parchment-400` for links |
| Extra | Links: `hover:text-gold-400 transition-colors duration-200`. |

**Tailwind class string (legal):**
```
font-body text-xs font-normal leading-normal text-slate-400
```

**Tailwind class string (footer links):**
```
font-body text-sm font-normal leading-normal text-parchment-400 hover:text-gold-400 transition-colors duration-200
```

---

### Typography Quick-Reference Table

| Role | Font | Size (desktop) | Weight | Color Token |
|---|---|---|---|---|
| Hero headline | `font-display` | 72–96px | normal | `parchment-50` |
| Hero kicker | `font-serif-sc` | 14px | normal | `gold-400` |
| Section H2 | `font-serif` | 36px | bold | `parchment-50` |
| Section sub-head | `font-serif` | 20px | normal | `parchment-300` |
| Card title | `font-serif` | 20px | semibold | `parchment-100` |
| Body copy | `font-body` | 16px | normal | `parchment-300` |
| Small / caption | `font-body` | 14px | normal | `slate-400` |
| Primary CTA | `font-sans` | 16px | bold | `slate-950` |
| Secondary CTA | `font-sans` | 16px | semibold | `gold-400` |
| Nav links | `font-sans` | 14px | medium | `parchment-400` |
| Stat numbers | `font-serif` | 48px | bold | `gold-400` |
| Stat labels | `font-serif-sc` | 12px | normal | `parchment-400` |
| Pricing tier | `font-serif-sc` | 18px | normal | `gold-400` |
| Pricing price | `font-serif` | 48px | bold | `parchment-50` |
| Pricing features | `font-body` | 14px | normal | `parchment-300` |
| Footer legal | `font-body` | 12px | normal | `slate-400` |
| Footer links | `font-body` | 14px | normal | `parchment-400` |

---

## Section 2: Color Usage Guide

The landing page palette is built entirely from the existing `tailwind.config.ts` tokens. No new color values are needed — only deliberate application and a handful of opacity treatments. The palette creates a hierarchy: **dark slate grounds, warm parchment text, gold accents that catch the eye, burgundy undertones that add atmosphere**.

Dark mode only. No light mode. This is the world.

---

### 2.1 Section Background Treatments

The page uses three tiers of background darkness to create depth and rhythm between sections. Sections alternate between these tiers to give the eye natural "chapter breaks."

#### Tier 1: Deepest Dark (Hero, Final CTA)

```css
background-color: #080d17; /* slate-950 */
background-image: radial-gradient(ellipse at top, rgba(74, 10, 20, 0.15) 0%, transparent 60%);
```

**Tailwind:** `bg-slate-950` + custom gradient overlay via `before:` pseudo-element or inline style.

This is the void. Used for the hero section and the final closing CTA. The radial gradient bleeds a faint burgundy warmth from above — just enough to keep the black from feeling sterile. The `#0a100d` noted in the narrative framework is nearly identical to `slate-950` and either can be used; prefer `slate-950` for token consistency.

#### Tier 2: Section Default (Feature blocks, Pricing, Show)

```
bg-slate-900  →  #0f172a
```

The standard section background. Dark enough to feel continuous with the hero, light enough to read as a distinct surface when bordered by Tier 1 or Tier 3 sections.

#### Tier 3: Elevated Surface (Cards, Command Center demo, interactive elements)

```
bg-slate-850  →  #151e2d
```

Used for cards, panels, and interactive embed areas. Creates lift without needing a drop shadow on every element. The `850` custom shade is the quiet workhorse of the card system.

#### Section Transition Gradients

Between major sections, use a 120px gradient blend to avoid hard color cuts:

```css
/* Top of a slate-900 section following a slate-950 section */
background: linear-gradient(to bottom, #080d17 0%, #0f172a 100%);
height: 120px; /* or use padding with gradient on the section itself */
```

**Tailwind approach:** Apply gradient directly to section padding area:
```
bg-gradient-to-b from-slate-950 to-slate-900
```

For sections that need atmospheric depth (the Show section, social proof), add a subtle burgundy radial:
```
bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950
```
With an overlaid:
```css
radial-gradient(ellipse at bottom left, rgba(74, 10, 20, 0.08) 0%, transparent 50%)
```

---

### 2.2 Text Color Hierarchy

Four tiers of text luminance. Each tier has a defined role. Don't mix them.

| Tier | Token | Hex | Role | WCAG on slate-950 |
|---|---|---|---|---|
| **Tier 1 — Brightest** | `text-parchment-50` | `#fefce8` | Hero headline, section H2s, pricing prices. The loudest text. | 18.79:1 — AAA ✅ |
| **Tier 2 — Warm** | `text-parchment-100` to `text-parchment-300` | `#fef9c3` – `#f5e6a3` | Card titles (`-100`), body copy and sub-headlines (`-300`). The comfortable reading range. | 15.49–18.10:1 — AAA ✅ |
| **Tier 3 — Muted Warm** | `text-parchment-400` | `#e8c96d` | Nav links, stat labels, secondary information. Warm but receded. | 12.04:1 — AAA ✅ |
| **Tier 4 — Cool Muted** | `text-slate-400` | `#94a3b8` | Captions, legal text, metadata, disabled states. Intentionally quiet. | 7.58:1 — AAA ✅ |

**Important:** Never use `parchment-500` or darker for body text on `slate-950`. While they pass AA, the warmth becomes muddied and readability drops at paragraph length. Reserve `parchment-500` (`#d4a94a`, 8.86:1 on slate-950) for decorative or short-form use only.

---

### 2.3 Accent Color Usage

#### Gold (`gold-400` / `#fbbf24`) — Action & Highlight

Gold is the CTA color and primary accent. It means: **this is important, interact with me**.

| Use | Application |
|---|---|
| Primary CTA background | `bg-gold-400` with `text-slate-950` — **11.64:1 contrast** ✅ AAA |
| Kicker text | `text-gold-400` above section headlines |
| Stat numbers | `text-gold-400` in the stats strip |
| Pricing tier labels | `text-gold-400` in pricing cards |
| Highlight underlines | `decoration-gold-400` or `border-b-2 border-gold-400` |
| Icon accents | Checkmarks in pricing lists, feature icons |
| Hover glow | `shadow-glow-gold` on interactive cards |

**Gold-500** (`#f59e0b`, 9.05:1) for hover/active states on gold text — slightly darker, still AAA.

**Gold-300** (`#fcd34d`, 13.48:1) for text that needs to feel lighter/more ethereal — sparkle moments.

**Rule:** Gold never appears on backgrounds. It's a foreground and accent color only. The only exception is CTA buttons, where it becomes the background with dark text.

#### Burgundy (`burgundy-700` – `burgundy-950`) — Atmosphere & Depth

Burgundy is the soul color. It doesn't shout — it lingers. Used for atmospheric effects, borders, and background warmth.

| Use | Application |
|---|---|
| Gradient overlays | `rgba(74, 10, 20, 0.08–0.15)` in radial gradients on dark sections |
| Card border glow (hover) | `shadow-glow-burgundy` / `box-shadow: 0 0 12px rgba(157,35,71,0.5)` |
| Divider lines | `border-burgundy-900/30` (`rgba(74,10,20,0.3)`) — barely visible, adds warmth |
| Card subtle glow | `bg-card-glow` — `linear-gradient(135deg, rgba(157,35,71,0.15) 0%, transparent 60%)` |
| Active section indicator | `border-l-2 border-burgundy-600` for side accents |

**Burgundy as text:** Use sparingly. `burgundy-400` (`#ec7592`, 6.97:1 on slate-950) passes AA and works for accent text (badges, tags) but should never carry body content.

#### Coral (`coral-400` / `#f96854`) — Homebrew & Badges

Reserved for its existing role: homebrew content indicators. On the landing page, it appears only in the homebrew workshop feature callout.

| Use | Application |
|---|---|
| Homebrew badge | `bg-coral-400/10 text-coral-400 border border-coral-400/20` |
| Coral pulse | `animate-coral-pulse` for attention on homebrew feature |
| Contrast | 6.61:1 on slate-950 — AA ✅ for normal text |

#### Steel (`steel-400` / `#577399`) — Secondary Interactive

Steel is the cool complement to gold's warmth. Used for secondary links and informational elements.

| Use | Application |
|---|---|
| Secondary links (non-CTA) | `text-steel-400 hover:text-steel-300` |
| Informational badges (SRD) | `bg-steel-400/10 text-steel-400 border border-steel-400/20` |
| Contrast note | 4.00:1 on slate-950 — **passes AA Large only** ⚠️. Use at ≥18px or ≥14px bold. For smaller text, use `steel-300` (`#a3b6cf`, better contrast). |

---

### 2.4 Border Treatments

Borders are subtle. They define space without drawing attention. Three border recipes:

#### Default Card Border
```
border border-slate-700/50
```
`rgba(51, 65, 85, 0.5)` — a cool, nearly invisible edge that separates cards from background.

#### Warm Accent Border (Pricing cards, featured content)
```
border border-burgundy-900/30
```
`rgba(74, 10, 20, 0.3)` — warm, atmospheric, barely there. The burgundy tint matches the radial gradient overlays.

#### Gold Highlight Border (GM tier pricing card, active states)
```
border border-gold-400/30
```
`rgba(251, 191, 36, 0.3)` — draws the eye. Use on the GM pricing card to signal "this is the premium option."

#### Hover Border Escalation
Cards transition from default to warm on hover:
```
border border-slate-700/50 hover:border-burgundy-700/40 transition-colors duration-300
```

#### Horizontal Rules / Section Dividers
Use a gradient fade-out rule rather than a solid border:
```html
<div class="h-px bg-gradient-to-r from-transparent via-burgundy-900/40 to-transparent" />
```
This creates an elegant divider that appears to emerge from and dissolve back into the dark background.

---

### 2.5 Gradient Recipes

Exact gradient values for common landing page patterns.

#### Hero Background Atmosphere
```css
background:
  radial-gradient(ellipse at top center, rgba(74, 10, 20, 0.18) 0%, transparent 55%),
  radial-gradient(ellipse at bottom right, rgba(87, 115, 153, 0.06) 0%, transparent 40%),
  #080d17;
```
Burgundy warmth from above, the faintest cool steel from below-right. Creates depth without visible color — it just feels *alive*.

#### Card Surface Glow (Feature Cards)
```css
background:
  linear-gradient(135deg, rgba(157, 35, 71, 0.10) 0%, transparent 50%),
  #151e2d;
```
**Tailwind:** `bg-slate-850` with overlay via `before:absolute before:inset-0 before:bg-card-glow`.

#### Pricing Card — GM Tier (Premium Feel)
```css
background:
  linear-gradient(180deg, rgba(251, 191, 36, 0.04) 0%, transparent 40%),
  linear-gradient(135deg, rgba(157, 35, 71, 0.08) 0%, transparent 50%),
  #151e2d;
```
A whisper of gold at the top + burgundy warmth. Signals "this is the special one" without being garish.

#### Stats Strip Background
```css
background:
  linear-gradient(180deg, rgba(15, 23, 42, 0.0) 0%, rgba(15, 23, 42, 1.0) 8%, rgba(15, 23, 42, 1.0) 92%, rgba(15, 23, 42, 0.0) 100%);
```
Fades in and out of the surrounding section, so the strip feels integrated rather than boxed.

#### Scroll Fade Overlay (Top/Bottom of Hero)
```css
/* Bottom of hero, fading into next section */
background: linear-gradient(to bottom, transparent 0%, #0f172a 100%);
height: 120px;
```
**Tailwind:** `bg-gradient-to-b from-transparent to-slate-900 h-[120px]`

#### Text Gradient (Optional — Hero Headline Accent)
For a subtle shimmer on the hero headline, apply a gold-to-parchment text gradient:
```css
background: linear-gradient(135deg, #fbbf24 0%, #fefce8 50%, #fbbf24 100%);
-webkit-background-clip: text;
-webkit-text-fill-color: transparent;
```
**Tailwind:** `bg-gradient-to-r from-gold-400 via-parchment-50 to-gold-400 bg-clip-text text-transparent`

Use sparingly. If the display font already commands attention, solid `parchment-50` is better.

---

### 2.6 Hover & Focus State Colors

All interactive elements follow a consistent state model:

#### Buttons — Primary (Gold)

| State | Background | Text | Border | Shadow |
|---|---|---|---|---|
| Default | `bg-gold-400` | `text-slate-950` | none | none |
| Hover | `bg-gold-300` | `text-slate-950` | none | `shadow-glow-gold` |
| Active/Press | `bg-gold-500` | `text-slate-950` | none | none |
| Focus | `bg-gold-400` | `text-slate-950` | `ring-2 ring-gold-300 ring-offset-2 ring-offset-slate-950` | none |

#### Buttons — Secondary (Ghost/Outline)

| State | Background | Text | Border |
|---|---|---|---|
| Default | `transparent` | `text-gold-400` | `border border-gold-400/40` |
| Hover | `bg-gold-400/10` | `text-gold-300` | `border-gold-400/60` |
| Active/Press | `bg-gold-400/15` | `text-gold-500` | `border-gold-400/60` |
| Focus | `transparent` | `text-gold-400` | `ring-2 ring-gold-400/50 ring-offset-2 ring-offset-slate-950` |

#### Cards (Feature, Pricing)

| State | Border | Shadow | Background |
|---|---|---|---|
| Default | `border-slate-700/50` | `shadow-card` | `bg-slate-850` |
| Hover | `border-burgundy-700/40` | `shadow-card-fantasy-hover` | `bg-slate-850` + brighter `bg-card-glow` |

#### Text Links (Inline)

| State | Color | Decoration |
|---|---|---|
| Default | `text-gold-400` | `underline decoration-gold-400/30 underline-offset-4` |
| Hover | `text-gold-300` | `decoration-gold-300/60` |

#### Nav Links

| State | Color | Indicator |
|---|---|---|
| Default | `text-parchment-400` | none |
| Hover | `text-gold-400` | none |
| Active (current section) | `text-gold-400` | `border-b-2 border-gold-400` offset 6px |

---

### 2.7 Opacity Treatments & Special Utilities

These are not new colors but new *applications* of existing colors. Add these as needed in components — no tailwind.config.ts changes required.

#### Background Overlays (Inline or via `before:` pseudo)
| Token | Value | Use |
|---|---|---|
| `burgundy-900/8` | `rgba(74, 10, 20, 0.08)` | Subtle atmospheric radials |
| `burgundy-900/15` | `rgba(74, 10, 20, 0.15)` | Hero-level atmospheric radials |
| `burgundy-700/10` | `rgba(170, 32, 71, 0.10)` | Card glow overlays |
| `gold-400/4` | `rgba(251, 191, 36, 0.04)` | Premium card top shimmer |
| `gold-400/10` | `rgba(251, 191, 36, 0.10)` | Ghost button hover fill |
| `steel-400/6` | `rgba(87, 115, 153, 0.06)` | Cool-tone background variation |

#### Text Opacity Variants
| Token | Use |
|---|---|
| `text-parchment-400/70` | CTA micro-copy (warmer than slate-400) |
| `text-parchment-300/80` | De-emphasized body text in cards |
| `text-gold-400/60` | Decorative gold text (e.g., ornamental divider characters) |

---

### 2.8 WCAG Contrast Ratio Reference

All primary text-on-background combinations measured against WCAG 2.1 standards.

| Text Color | Background | Ratio | AA Normal (≥4.5) | AA Large (≥3.0) | AAA Normal (≥7.0) |
|---|---|---|---|---|---|
| `parchment-50` on `slate-950` | `#fefce8` / `#080d17` | **18.79:1** | ✅ | ✅ | ✅ |
| `parchment-100` on `slate-950` | `#fef9c3` / `#080d17` | **18.10:1** | ✅ | ✅ | ✅ |
| `parchment-300` on `slate-950` | `#f5e6a3` / `#080d17` | **15.49:1** | ✅ | ✅ | ✅ |
| `parchment-400` on `slate-950` | `#e8c96d` / `#080d17` | **12.04:1** | ✅ | ✅ | ✅ |
| `parchment-500` on `slate-950` | `#d4a94a` / `#080d17` | **8.86:1** | ✅ | ✅ | ✅ |
| `parchment-600` on `slate-950` | `#b8872c` / `#080d17` | **6.05:1** | ✅ | ✅ | ❌ |
| `gold-400` on `slate-950` | `#fbbf24` / `#080d17` | **11.64:1** | ✅ | ✅ | ✅ |
| `gold-500` on `slate-950` | `#f59e0b` / `#080d17` | **9.05:1** | ✅ | ✅ | ✅ |
| `gold-300` on `slate-950` | `#fcd34d` / `#080d17` | **13.48:1** | ✅ | ✅ | ✅ |
| `slate-400` on `slate-950` | `#94a3b8` / `#080d17` | **7.58:1** | ✅ | ✅ | ✅ |
| `slate-300` on `slate-950` | `#cbd5e1` / `#080d17` | **13.09:1** | ✅ | ✅ | ✅ |
| `burgundy-400` on `slate-950` | `#ec7592` / `#080d17` | **6.97:1** | ✅ | ✅ | ❌ |
| `burgundy-500` on `slate-950` | `#e0486e` / `#080d17` | **4.93:1** | ✅ | ✅ | ❌ |
| `coral-400` on `slate-950` | `#f96854` / `#080d17` | **6.61:1** | ✅ | ✅ | ❌ |
| `steel-400` on `slate-950` | `#577399` / `#080d17` | **4.00:1** | ❌ | ✅ | ❌ |
| `steel-300` on `slate-950` | `#a3b6cf` / `#080d17` | ~8.5:1* | ✅ | ✅ | ✅ |
| `slate-950` on `gold-400` (CTA btn) | `#080d17` / `#fbbf24` | **11.64:1** | ✅ | ✅ | ✅ |
| `burgundy-950` on `gold-400` | `#2d0509` / `#fbbf24` | **11.06:1** | ✅ | ✅ | ✅ |
| `parchment-50` on `burgundy-900` | `#fefce8` / `#4a0a14` | **15.10:1** | ✅ | ✅ | ✅ |
| `gold-400` on `burgundy-900` | `#fbbf24` / `#4a0a14` | **9.36:1** | ✅ | ✅ | ✅ |
| `parchment-50` on `slate-900` | `#fefce8` / `#0f172a` | **17.26:1** | ✅ | ✅ | ✅ |
| `parchment-300` on `slate-900` | `#f5e6a3` / `#0f172a` | **14.22:1** | ✅ | ✅ | ✅ |
| `gold-400` on `slate-900` | `#fbbf24` / `#0f172a` | **10.69:1** | ✅ | ✅ | ✅ |
| `slate-400` on `slate-900` | `#94a3b8` / `#0f172a` | **6.96:1** | ✅ | ✅ | ❌ |
| `parchment-50` on `slate-850` | `#fefce8` / `#151e2d` | **16.17:1** | ✅ | ✅ | ✅ |
| `parchment-400` on `slate-850` | `#e8c96d` / `#151e2d` | **10.36:1** | ✅ | ✅ | ✅ |
| `gold-400` on `slate-850` | `#fbbf24` / `#151e2d` | **10.02:1** | ✅ | ✅ | ✅ |

> **⚠️ Watch out:** `steel-400` (`#577399`) at 4.00:1 on `slate-950` **fails AA Normal**. Only use for large text (≥18px / ≥14px bold) or switch to `steel-300` for smaller sizes.

> *Ratios marked with `*` are interpolated estimates. All others are computed from exact hex values.*
