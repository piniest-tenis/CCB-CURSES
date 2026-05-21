# Landing Page — Animation Specs & Component Pattern Library

> **Design philosophy:** Nothing bouncy or springy. Everything emerges from shadow — slow, elegant, purposeful.  
> **Stack:** Next.js + Tailwind CSS. CSS-only animations where possible. No heavy JS libraries.  
> **Color mode:** Dark only. `slate-950` base.

---

## Part 1: Animation & Motion Specs

### 1.1 Scroll-Reveal System

The existing `useScrollReveal` hook is well-tuned. Confirm all values; adjust stagger cadence only.

| Parameter | Value | Rationale |
|---|---|---|
| **Threshold** | `0.12` | Fires early — content begins reveal when 12% visible. Feels anticipatory, not jarring. **Keep.** |
| **Root margin** | `0px 0px -40px 0px` | 40px bottom inset prevents firing at the absolute edge. Creates a "clearing the fog" feel. **Keep.** |
| **Duration** | `700ms` (`duration-700`) | Slow enough to read as deliberate emergence. Fast enough to not feel sluggish. **Keep.** |
| **Easing** | `ease-out` | Decelerating curve — object arrives with weight, then settles. Matches "emerging from shadow." **Keep.** |
| **Transform distance** | `translateY(8px → 0)` / `translate-y-8` for sections | Subtle. No dramatic jumps. **Keep for RevealSection.** |
| **Transform distance (cards)** | `translateY(10px → 0)` / `translate-y-10` for StaggerCard | Slightly more travel for cards — adds depth to stagger groups. **Keep as-is** (2.5rem ≈ 40px total). |
| **Stagger delay** | `index * 120ms` per card | Good cadence. 3-card row completes in 240ms spread. **Keep.** |
| **Section reveal delay** | `0 / 100 / 150 / 200 / 250 / 300ms` | Stepped delays within a section (tagline → heading → body → CTA). **Keep pattern. Cap max at 400ms** to avoid feeling sluggish on slow scrolls. |

#### RevealSection — Tailwind Classes (confirmed)
```
// Hidden state
opacity-0 translate-y-8

// Visible state
opacity-100 translate-y-0

// Transition
transition-all duration-700 ease-out
```

#### StaggerCard — Tailwind Classes (confirmed)
```
// Hidden state
opacity-0 translate-y-10

// Visible state
opacity-100 translate-y-0

// Transition
transition-all duration-600 ease-out

// Delay (inline style)
transition-delay: ${index * 120}ms
```

> **Note on `duration-600`:** Tailwind does not ship `duration-600` by default. This requires the `600` value to exist in the theme or an arbitrary value `duration-[600ms]`. Recommend adding to `tailwind.config.ts`:
> ```ts
> transitionDuration: {
>   '600': '600ms',
> }
> ```
> Or change to `duration-700` for consistency with RevealSection. Either is valid; matching durations creates a more unified rhythm.

---

### 1.2 Hover State Transitions

All hover transitions follow one rule: **slow enough to feel intentional, fast enough to feel responsive.** Nothing under 150ms, nothing over 300ms.

#### Cards (Feature, Step, Testimonial, Pricing)

| Property | Resting | Hover | Transition |
|---|---|---|---|
| `transform` | `translateY(0)` | `translateY(-4px)` / `-translate-y-1` | `duration-300 ease-out` |
| `border-color` | `slate-700/40` | `gold-400/30` | included in `transition-all` |
| `box-shadow` | `shadow-card` | `shadow-glow-gold` (pricing highlighted) or unchanged | included in `transition-all` |

```
// Card hover classes (existing, confirmed)
hover:-translate-y-1 hover:border-gold-400/30 transition-all duration-300
```

#### CTA Button Primary (Gold Gradient)

| Property | Resting | Hover | Transition |
|---|---|---|---|
| `background` | `from-gold-400 to-gold-500` | `from-gold-300 to-gold-400` | `duration-200` |
| Shimmer overlay | `-translate-x-full` | `translate-x-full` | `duration-700 ease-out` |

```
// Shimmer pseudo-element (existing)
absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent
-translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-out
```

#### CTA Button Secondary (Bordered)

| Property | Resting | Hover | Transition |
|---|---|---|---|
| `border-color` | `parchment-400/30` or `parchment-500/30` | `gold-400/50` | `duration-200` |
| `color` | `parchment-300` or `parchment-400` | `gold-400` | `duration-200` |

```
// Secondary button hover (existing, confirmed)
hover:border-gold-400/50 hover:text-gold-400 transition-all duration-200
```

#### CTA Link (Inline with Arrow)

| Property | Resting | Hover | Transition |
|---|---|---|---|
| `color` | `gold-400` | `gold-300` | `transition-colors` (default 150ms) |
| Arrow icon `transform` | `translateX(0)` | `translateX(4px)` / `translate-x-1` | `transition-transform` (default 150ms) |

```
// Link with arrow (existing, confirmed)
text-gold-400 hover:text-gold-300 transition-colors group
// Arrow child:
fa-arrow-right text-xs group-hover:translate-x-1 transition-transform
```

#### Nav Links (Header + Footer)

| Property | Resting | Hover | Transition |
|---|---|---|---|
| `color` | `parchment-400` (header) / `parchment-500` (footer) | `gold-400` | `transition-colors` |

```
text-parchment-400 hover:text-gold-400 transition-colors
```

#### Social Icon Buttons (Footer)

| Property | Resting | Hover | Transition |
|---|---|---|---|
| `color` | `parchment-600` | `gold-400` | `transition-all` |
| `border-color` | `slate-700/40` | `gold-400/30` | included |

```
text-parchment-600 hover:text-gold-400 hover:border-gold-400/30 transition-all
```

---

### 1.3 New Keyframe Animations

These are **new** animations not yet in `tailwind.config.ts` or `globals.css`. Each one is purpose-built for the landing page.

#### 1.3.1 Hero Text Entrance — `hero-emerge`

The hero heading and subtext should feel like they're materializing from deep shadow. Slightly longer duration than standard reveals, with a subtle scale.

```css
/* globals.css */
@keyframes hero-emerge {
  from {
    opacity: 0;
    transform: translateY(12px) scale(0.985);
    filter: blur(2px);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
    filter: blur(0);
  }
}

.animate-hero-emerge {
  animation: hero-emerge 1000ms cubic-bezier(0.16, 1, 0.3, 1) both;
}

@media (prefers-reduced-motion: reduce) {
  .animate-hero-emerge {
    animation: none;
    opacity: 1;
  }
}
```

**Tailwind config addition:**
```ts
keyframes: {
  "hero-emerge": {
    from: { opacity: "0", transform: "translateY(12px) scale(0.985)", filter: "blur(2px)" },
    to:   { opacity: "1", transform: "translateY(0) scale(1)", filter: "blur(0)" },
  },
},
animation: {
  "hero-emerge": "hero-emerge 1000ms cubic-bezier(0.16, 1, 0.3, 1) both",
},
```

**Usage:** Apply to hero `<h1>` with staggered `animation-delay` on child elements:
- Tagline: `animation-delay: 200ms`
- Heading: `animation-delay: 400ms`
- Subtext: `animation-delay: 600ms`
- CTA buttons: `animation-delay: 800ms`

> **Why cubic-bezier(0.16, 1, 0.3, 1)?** This is an "expo-out" curve — aggressive deceleration. Objects emerge fast, then glide to rest. No spring. No bounce. Pure deceleration.

---

#### 1.3.2 Gold Shimmer on Section Dividers — `divider-shimmer`

The ornamental `h-px` gradient dividers between sections should have a slow, ambient gold shimmer — like candlelight catching a gilded edge.

```css
/* globals.css */
@keyframes divider-shimmer {
  0% {
    background-position: -200% center;
  }
  100% {
    background-position: 200% center;
  }
}

.animate-divider-shimmer {
  background: linear-gradient(
    90deg,
    transparent 0%,
    transparent 35%,
    rgba(212, 169, 74, 0.3) 48%,
    rgba(251, 191, 36, 0.5) 50%,
    rgba(212, 169, 74, 0.3) 52%,
    transparent 65%,
    transparent 100%
  );
  background-size: 200% 100%;
  animation: divider-shimmer 8s ease-in-out infinite;
}

@media (prefers-reduced-motion: reduce) {
  .animate-divider-shimmer {
    animation: none;
    background: linear-gradient(
      90deg,
      transparent 0%,
      rgba(251, 191, 36, 0.2) 50%,
      transparent 100%
    );
    background-size: 100% 100%;
  }
}
```

**Tailwind config addition:**
```ts
keyframes: {
  "divider-shimmer": {
    "0%":   { backgroundPosition: "-200% center" },
    "100%": { backgroundPosition: "200% center" },
  },
},
animation: {
  "divider-shimmer": "divider-shimmer 8s ease-in-out infinite",
},
```

**Usage:** Replace the existing static dividers:
```diff
- <div className="relative h-px bg-gradient-to-r from-transparent via-gold-400/20 to-transparent" />
+ <div className="relative h-px animate-divider-shimmer" />
```

---

#### 1.3.3 Atmospheric Background Drift — `bg-drift`

For `FantasyBgSection` areas and the hero: a very slow, ambient drift on the radial glow to simulate living light. Imperceptible unless you stare — which is the point.

```css
/* globals.css */
@keyframes bg-drift {
  0%, 100% {
    transform: translate(0, 0) scale(1);
  }
  25% {
    transform: translate(2%, -1%) scale(1.02);
  }
  50% {
    transform: translate(-1%, 2%) scale(1.01);
  }
  75% {
    transform: translate(1%, -2%) scale(1.03);
  }
}

.animate-bg-drift {
  animation: bg-drift 30s ease-in-out infinite;
}

@media (prefers-reduced-motion: reduce) {
  .animate-bg-drift {
    animation: none;
  }
}
```

**Tailwind config addition:**
```ts
keyframes: {
  "bg-drift": {
    "0%, 100%": { transform: "translate(0, 0) scale(1)" },
    "25%":      { transform: "translate(2%, -1%) scale(1.02)" },
    "50%":      { transform: "translate(-1%, 2%) scale(1.01)" },
    "75%":      { transform: "translate(1%, -2%) scale(1.03)" },
  },
},
animation: {
  "bg-drift": "bg-drift 30s ease-in-out infinite",
},
```

**Usage:** Apply to the hero's atmospheric glow element:
```tsx
<div
  className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2
             w-[600px] h-[600px] rounded-full opacity-20 blur-[120px]
             pointer-events-none animate-bg-drift"
  style={{
    background: "radial-gradient(circle, rgba(251,191,36,0.3) 0%, rgba(170,32,71,0.15) 50%, transparent 70%)"
  }}
  aria-hidden="true"
/>
```

---

#### 1.3.4 Scroll Indicator Pulse — `scroll-hint` (replace `animate-bounce`)

The existing `animate-bounce` on the scroll indicator is too playful for this brand. Replace with a slow vertical float.

```css
/* globals.css */
@keyframes scroll-hint {
  0%, 100% {
    transform: translateX(-50%) translateY(0);
    opacity: 0.5;
  }
  50% {
    transform: translateX(-50%) translateY(6px);
    opacity: 0.3;
  }
}

.animate-scroll-hint {
  animation: scroll-hint 3s ease-in-out infinite;
}

@media (prefers-reduced-motion: reduce) {
  .animate-scroll-hint {
    animation: none;
    opacity: 0.4;
  }
}
```

**Tailwind config addition:**
```ts
keyframes: {
  "scroll-hint": {
    "0%, 100%": { transform: "translateX(-50%) translateY(0)", opacity: "0.5" },
    "50%":      { transform: "translateX(-50%) translateY(6px)", opacity: "0.3" },
  },
},
animation: {
  "scroll-hint": "scroll-hint 3s ease-in-out infinite",
},
```

**Usage:** Replace current scroll indicator:
```diff
- <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 animate-bounce opacity-50">
+ <div className="absolute bottom-8 left-1/2 flex flex-col items-center gap-2 animate-scroll-hint">
```

Note: The `-translate-x-1/2` is now baked into the keyframe to prevent transform conflicts.

---

#### 1.3.5 Navbar Materialize — `nav-materialize`

When the sticky nav gains its backdrop on scroll, it should feel like it condenses from mist — not just toggle classes.

This is already handled well with `transition-all duration-300` on the header. **No new keyframe needed.** The existing transition between `bg-transparent` and `bg-slate-950/95 backdrop-blur-md` is correct.

**Confirmed existing implementation — no changes.**

---

### 1.4 Parallax / Background Motion

True parallax (scroll-linked transform) is intentionally avoided — it creates performance issues and accessibility concerns.

Instead, use these ambient techniques:

| Technique | Where | Implementation |
|---|---|---|
| **`animate-bg-drift`** | Hero glow orb, FantasyBgSection gradient overlays | CSS keyframe (see 1.3.3). Slow, imperceptible ambient movement. |
| **Fixed background attachment** | **Not recommended.** | `background-attachment: fixed` is janky on mobile and breaks on iOS Safari. Avoid. |
| **Layered gradient opacity** | Hero section, Final CTA | Already implemented with stacked `<div>` gradient overlays. Good. Keep as-is. |

---

### 1.5 `prefers-reduced-motion` Strategy

Every animation on this page must degrade gracefully. The strategy:

| Animation Type | Reduced-Motion Behavior |
|---|---|
| **Scroll reveal (`useScrollReveal`)** | `setIsVisible(true)` immediately. No transition. ✅ Already implemented. |
| **Marquee ribbon** | `animation: none`. Static text, visible and readable. ✅ Already implemented. |
| **Hero emerge** | `animation: none; opacity: 1`. Content visible immediately. |
| **Divider shimmer** | Static gold gradient. No motion. Aesthetic preserved. |
| **Background drift** | `animation: none`. Static glow position. |
| **Scroll indicator** | `animation: none; opacity: 0.4`. Visible but still. |
| **Card hover transforms** | **Keep.** `hover:-translate-y-1` is user-initiated and small enough to be exempt from WCAG 2.3.3. Users who hover expect feedback. |
| **Button shimmer** | The shimmer is hover-triggered (`group-hover`), so it's user-initiated. **Keep.** |
| **Transition properties** | All `transition-*` properties are **kept** even in reduced-motion. These are sub-300ms user-initiated responses and are not considered animation under WCAG. |

**Implementation pattern in `globals.css`:** Every `@keyframes` block that runs autonomously (not user-triggered) must have a corresponding `@media (prefers-reduced-motion: reduce)` rule that sets `animation: none` and provides a static fallback state.

---

### 1.6 Complete Tailwind Config Additions

Add these to `tailwind.config.ts` under `theme.extend`:

```ts
// Inside theme.extend
transitionDuration: {
  '600': '600ms',
},
keyframes: {
  // ... existing keyframes ...
  "hero-emerge": {
    from: { opacity: "0", transform: "translateY(12px) scale(0.985)", filter: "blur(2px)" },
    to:   { opacity: "1", transform: "translateY(0) scale(1)", filter: "blur(0)" },
  },
  "divider-shimmer": {
    "0%":   { backgroundPosition: "-200% center" },
    "100%": { backgroundPosition: "200% center" },
  },
  "bg-drift": {
    "0%, 100%": { transform: "translate(0, 0) scale(1)" },
    "25%":      { transform: "translate(2%, -1%) scale(1.02)" },
    "50%":      { transform: "translate(-1%, 2%) scale(1.01)" },
    "75%":      { transform: "translate(1%, -2%) scale(1.03)" },
  },
  "scroll-hint": {
    "0%, 100%": { transform: "translateX(-50%) translateY(0)", opacity: "0.5" },
    "50%":      { transform: "translateX(-50%) translateY(6px)", opacity: "0.3" },
  },
},
animation: {
  // ... existing animations ...
  "hero-emerge":     "hero-emerge 1000ms cubic-bezier(0.16, 1, 0.3, 1) both",
  "divider-shimmer": "divider-shimmer 8s ease-in-out infinite",
  "bg-drift":        "bg-drift 30s ease-in-out infinite",
  "scroll-hint":     "scroll-hint 3s ease-in-out infinite",
},
```

---

---

## Part 2: Component Pattern Library

Each component below lists its exact Tailwind classes and any custom CSS needed.

---

### 2.1 Feature Card

> Icon + title + description. Used in 3-column grids (streaming, campaign features).

#### Structure
```
StaggerCard (scroll reveal wrapper)
  └─ Card container
       ├─ Icon container
       │    └─ FontAwesome icon
       ├─ Title (h3)
       └─ Description (p)
```

#### Specs

| Element | Classes |
|---|---|
| **Outer wrapper** | `h-full` (ensures equal-height cards in grid) |
| **Card container** | `group h-full rounded-xl border border-slate-700/40 bg-slate-900/60 p-6 backdrop-blur-sm shadow-card hover:-translate-y-1 hover:border-gold-400/30 hover:shadow-glow-gold transition-all duration-300` |
| **Icon container** | `mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-burgundy-900/60 to-slate-900 border border-burgundy-800/30` |
| **Icon** | `fa-solid ${icon} text-gold-400` (text-2xl inherits from container size) |
| **Title** | `font-serif text-lg font-semibold text-parchment-50 mb-2` |
| **Description** | `text-sm text-parchment-500 leading-relaxed` |

#### Anatomy Notes
- **Border:** 1px `slate-700/40` → `gold-400/30` on hover. Subtle enough to not cage the content; visible enough to define the card boundary.
- **Background:** `slate-900/60` with `backdrop-blur-sm`. Semi-transparent — allows layered backgrounds to breathe through.
- **Shadow:** `shadow-card` resting → `shadow-glow-gold` on hover. The gold glow is the signature hover state.
- **Icon container gradient:** Burgundy-to-slate diagonal. Grounds the icon in the brand palette without competing with the gold icon color.
- **Hover lift:** `-translate-y-1` (4px). Small, precise, no bounce.

---

### 2.2 Step Card

> Numbered circle + title + description. Used for the 3-step new-player flow.

#### Specs

| Element | Classes |
|---|---|
| **Outer wrapper** | `relative` (allows potential connector line between steps) |
| **Card container** | `group rounded-xl border border-slate-700/40 bg-slate-900/60 p-6 hover:-translate-y-1 hover:border-gold-400/30 transition-all duration-300` |
| **Number badge** | `mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-gold-400 to-gold-600 text-slate-950 font-display text-xl font-bold` |
| **Title** | `font-serif text-lg font-semibold text-parchment-50 mb-2` |
| **Description** | `text-sm text-parchment-500 leading-relaxed` |

#### Anatomy Notes
- **Number badge:** Gold gradient circle (`from-gold-400 to-gold-600`), dark text (`slate-950`). `font-display` (jetsam-collection-basilea) gives the numbers a decorative, manuscript feel.
- **Badge size:** 40×40px (`h-10 w-10`). Large enough to anchor the card, small enough to not dominate.
- **No shadow on card** (unlike Feature Card) — cleaner for sequential flow. Hover border change provides sufficient feedback.

---

### 2.3 Pricing Card

> Title + price + feature list + CTA button. Two variants: normal and highlighted.

#### Normal Variant

| Element | Classes |
|---|---|
| **Card container** | `relative h-full rounded-2xl border border-slate-700/40 bg-slate-900/60 shadow-card p-8 flex flex-col transition-all duration-300 hover:-translate-y-1` |
| **Title** | `font-serif text-xl font-semibold text-parchment-50 mb-2` |
| **Price** | `font-display text-4xl text-gold-400` |
| **Period** | `text-sm text-parchment-600` |
| **Feature list** | `mb-8 flex-1 space-y-3` |
| **Feature item** | `flex items-start gap-2.5 text-sm text-parchment-400 leading-relaxed` |
| **Check icon** | `fa-solid fa-check mt-0.5 text-gold-400 text-xs shrink-0` |
| **CTA button** | `block w-full rounded-xl py-3 text-center font-semibold text-base border border-parchment-500/30 text-parchment-300 hover:border-gold-400/50 hover:text-gold-400 transition-all duration-200` |

#### Highlighted Variant (Recommended)

| Element | Override Classes |
|---|---|
| **Card container** | `border-gold-400/50 bg-gradient-to-b from-slate-850 to-slate-900 shadow-glow-gold` |
| **"Recommended" badge** | `absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-gold-400 to-gold-500 px-4 py-1 text-xs font-bold uppercase tracking-wider text-slate-950` |
| **CTA button** | `bg-gradient-to-r from-gold-400 to-gold-500 text-slate-950 hover:from-gold-300 hover:to-gold-400 shadow-glow-gold` |

#### Anatomy Notes
- **Rounded-2xl** (16px): Larger radius than feature cards (`rounded-xl` / 12px). Pricing cards are visually heavier — the softer corners counterbalance that weight.
- **`flex flex-col` + `flex-1` on feature list:** Pushes the CTA button to the bottom regardless of feature count. Critical for equal-height two-card layouts.
- **Highlighted card:** `bg-gradient-to-b from-slate-850 to-slate-900` creates a subtle top-to-bottom lightening. The `shadow-glow-gold` provides the premium aura.
- **Badge position:** `absolute -top-3` overlaps the card border. `left-1/2 -translate-x-1/2` centers it. The pill shape (`rounded-full`) and gold gradient make it unmissable.

---

### 2.4 Testimonial Card

> Quote + author + role. Used in 3-column grid.

#### Specs

| Element | Classes |
|---|---|
| **Card container** | `rounded-xl border border-slate-700/40 bg-slate-900/60 p-6 shadow-card` |
| **Quote icon** | `mb-4 text-gold-400/40 text-2xl` — `fa-solid fa-quote-left` |
| **Blockquote text** | `text-sm text-parchment-400 leading-relaxed mb-4 italic` |
| **Author row** | `flex items-center gap-3` |
| **Avatar placeholder** | `h-10 w-10 rounded-full bg-gradient-to-br from-burgundy-800 to-slate-800 border border-slate-700/40 flex items-center justify-center text-parchment-500 text-sm font-bold` |
| **Author name** | `text-sm font-semibold text-parchment-300` |
| **Author role** | `text-xs text-parchment-600` |

#### Anatomy Notes
- **No hover transform** on testimonial cards. Testimonials are passive content — they should feel stable and trustworthy, not interactive.
- **Quote icon** at `gold-400/40` (40% opacity): Present but muted. Decorative, not attention-stealing.
- **Avatar:** Gradient circle with first-letter initial. `from-burgundy-800 to-slate-800` ties it to the brand without introducing new colors.
- **Italic blockquote:** Signals "this is someone else's voice." The `&ldquo;` / `&rdquo;` smart quotes add typographic polish.

---

### 2.5 CTA Button Primary (Gold Gradient)

> The primary call-to-action. Used in hero, final CTA, pricing (highlighted).

#### Specs

| Property | Value |
|---|---|
| **Border radius** | `rounded-xl` (12px) |
| **Padding** | `px-8 py-4` (hero/final CTA) or `px-5 py-2` (nav) |
| **Font** | `text-base font-bold` (hero) or `text-sm font-bold` (nav) |
| **Text color** | `text-slate-950` |
| **Background** | `bg-gradient-to-r from-gold-400 to-gold-500` |
| **Shadow** | `shadow-glow-gold` |
| **Hover background** | `hover:from-gold-300 hover:to-gold-400` |
| **Transition** | `transition-all duration-200` |
| **Focus** | `focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950` |
| **Overflow** | `overflow-hidden` (contains shimmer) |
| **Width** | `w-full sm:w-auto` (full-width on mobile) |

#### Shimmer Effect (Pseudo-element)
```
<span
  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent
             -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-out"
  aria-hidden="true"
/>
```

#### Full Class String (Hero variant)
```
group relative inline-flex items-center justify-center rounded-xl
bg-gradient-to-r from-gold-400 to-gold-500
px-8 py-4 text-base font-bold text-slate-950
shadow-glow-gold
hover:from-gold-300 hover:to-gold-400
transition-all duration-200
focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-400
focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950
overflow-hidden w-full sm:w-auto
```

#### Anatomy Notes
- **`group` class** on the button enables `group-hover` on the shimmer child.
- **Shimmer travels left-to-right** on hover: `-translate-x-full → translate-x-full` over 700ms. The `via-white/20` creates a 20% white band — enough to catch the eye, not enough to look like a loading state.
- **`shadow-glow-gold`:** `0 0 14px rgba(212,169,74,0.45), 0 0 4px rgba(212,169,74,0.25)`. Warm ambient glow. Reinforces "this is the thing to click."
- **Focus ring:** Gold ring with `ring-offset-slate-950` ensures visibility against the dark background. 2px ring with 2px offset = 4px total visible indicator.

---

### 2.6 CTA Button Secondary (Bordered)

> Secondary action. Used alongside primary CTA.

#### Specs

| Property | Value |
|---|---|
| **Border radius** | `rounded-xl` (12px) |
| **Padding** | `px-8 py-4` (hero/CTA) or `px-4 py-2` (nav) |
| **Font** | `text-base font-semibold` (hero) or `text-sm font-semibold` (nav) |
| **Text color** | `text-parchment-300` → `hover:text-gold-400` |
| **Background** | None (transparent) |
| **Border** | `border border-parchment-400/30` → `hover:border-gold-400/50` |
| **Transition** | `transition-all duration-200` |
| **Focus** | `focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-400` |
| **Width** | `w-full sm:w-auto` |

#### Full Class String (Hero variant)
```
inline-flex items-center justify-center rounded-xl
border border-parchment-400/30
px-8 py-4 text-base font-semibold text-parchment-300
hover:border-gold-400/50 hover:text-gold-400
transition-all duration-200
focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-400
w-full sm:w-auto
```

#### Anatomy Notes
- **No background, no shadow.** The secondary button is intentionally weightless — it provides an alternative without competing with the primary CTA.
- **Border opacity:** `parchment-400/30` resting (barely visible) → `gold-400/50` hover (catches the gold system). The border "activates" on hover.
- **No shimmer.** Reserved for primary only.

---

### 2.7 CTA Link (Inline Text Link with Arrow)

> Used for "Learn more about..." links below feature sections.

#### Specs

| Property | Value |
|---|---|
| **Text color** | `text-gold-400` → `hover:text-gold-300` |
| **Font** | `text-sm font-semibold` |
| **Arrow** | `fa-solid fa-arrow-right text-xs` |
| **Arrow hover** | `group-hover:translate-x-1 transition-transform` |
| **Gap** | `gap-2` between text and arrow |
| **Focus** | `focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-400 rounded` |

#### Full Class String
```
inline-flex items-center gap-2 text-sm font-semibold
text-gold-400 hover:text-gold-300 transition-colors
group
focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-400 rounded
```

#### Arrow Element
```
<i className="fa-solid fa-arrow-right text-xs group-hover:translate-x-1 transition-transform" aria-hidden="true" />
```

#### Anatomy Notes
- **Gold-on-dark** for links. Not underlined — the gold color and arrow icon are sufficient affordance in this context.
- **Arrow movement:** 4px (`translate-x-1`) on hover. Directional cue that says "go deeper." The `transition-transform` default (150ms) is snappy and responsive.
- **`rounded`** on the link itself ensures the focus ring wraps tightly around the text, not the full-width container.

---

### 2.8 Stat Strip Item

> Number + label. Used in the "What is Curses?" section (e.g., "100% — Free for Players").

#### Specs

| Element | Classes |
|---|---|
| **Container** | `flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-0` |
| **Item wrapper** | `text-center sm:px-8` |
| **Number/value** | `font-display text-3xl text-gold-400` |
| **Label** | `text-sm text-parchment-500 font-sans uppercase tracking-wider mt-1` |
| **Vertical divider** (between items, desktop only) | `hidden sm:block w-px h-12 bg-gradient-to-b from-transparent via-gold-400/30 to-transparent` |

#### Anatomy Notes
- **`font-display`** (jetsam-collection-basilea) for the stat numbers. Display typeface at large size creates visual impact — these numbers are meant to arrest scanning.
- **`text-3xl`** (30px): Large enough to anchor the stat strip, proportional to the label text below.
- **Gold numbers, parchment labels.** The hierarchy is unmistakable — number first, context second.
- **Divider gradient:** Fades in from transparent, peaks at `gold-400/30`, fades out. 48px tall (`h-12`). This prevents hard lines between items while still providing visual separation.
- **`hidden sm:block`** on dividers: On mobile, items stack vertically with `gap-6`— dividers aren't needed. On desktop, they appear between inline items.

---

### 2.9 Marquee Ribbon

> Infinite horizontal scroll of feature keywords with diamond separators.

#### Specs

| Property | Value |
|---|---|
| **Container** | `overflow-hidden bg-gradient-to-r from-burgundy-900/60 via-burgundy-950/80 to-burgundy-900/60 border-y border-burgundy-800/30 py-3` |
| **Track** | `marquee-track flex whitespace-nowrap gap-8 text-sm font-sans font-semibold tracking-wider uppercase text-gold-400/70` |
| **Item** | `flex items-center gap-8 shrink-0` |
| **Diamond separator** | `text-gold-400/30` — `◆` character |
| **Animation speed** | `40s` (full cycle). Linear. Infinite. |
| **Pause on hover** | `animation-play-state: paused` |
| **Reduced motion** | `animation: none` — static, all items visible |

#### CSS (in globals.css, existing)
```css
@keyframes marquee-scroll {
  from { transform: translateX(0); }
  to   { transform: translateX(-50%); }
}

.marquee-track {
  animation: marquee-scroll 40s linear infinite;
}

.marquee-track:hover {
  animation-play-state: paused;
}
```

#### Anatomy Notes
- **Doubled items array** (`[...items, ...items]`): Creates a seamless loop. The `-50%` endpoint aligns with the seam. 12 items × 2 = 24 rendered elements.
- **40-second duration:** Slow enough to read every item. Fast enough that it clearly reads as motion, not static text.
- **`burgundy-900/60 → burgundy-950/80 → burgundy-900/60`** background: Creates a vignette effect. The ribbon is darker in the center, lighter at edges. This draws the eye inward and masks the loop seam.
- **`border-y border-burgundy-800/30`:** Subtle horizontal rules above and below. Defines the ribbon as a distinct zone without heavy visual weight.
- **`tracking-wider uppercase`:** All-caps with wide tracking is the canonical treatment for ticker/marquee text. Enhances scanability at speed.

---

### 2.10 Section Divider (Ornamental Gradient Line)

> Decorative horizontal rule between major sections.

#### Current Implementation (Static)
```html
<div className="relative h-px bg-gradient-to-r from-transparent via-gold-400/20 to-transparent" aria-hidden="true" />
```

#### Enhanced Implementation (With Shimmer)
```html
<div className="relative h-px animate-divider-shimmer" aria-hidden="true" />
```

#### Specs

| Property | Value |
|---|---|
| **Height** | `h-px` (1px) |
| **Spacing** | Sits between sections. No additional margin — adjacent sections provide their own `py-20 sm:py-28` padding. |
| **Color** | Gold-tinted gradient: transparent → `gold-400/20` → transparent (static) or animated shimmer (see 1.3.2). |
| **Animation** | `divider-shimmer 8s ease-in-out infinite` — slow traveling highlight. |
| **Reduced motion** | Static center-peaked gradient. No motion. |
| **Accessibility** | `aria-hidden="true"` — purely decorative. |

#### Custom CSS for Shimmer Variant
```css
.animate-divider-shimmer {
  background: linear-gradient(
    90deg,
    transparent 0%,
    transparent 35%,
    rgba(212, 169, 74, 0.3) 48%,
    rgba(251, 191, 36, 0.5) 50%,
    rgba(212, 169, 74, 0.3) 52%,
    transparent 65%,
    transparent 100%
  );
  background-size: 200% 100%;
  animation: divider-shimmer 8s ease-in-out infinite;
}
```

#### Anatomy Notes
- **1px height:** Any thicker and it becomes a border, not a divider. At 1px, it reads as a gilded thread woven between sections.
- **8-second cycle:** Long enough that the shimmer travels slowly — like candlelight on a gold wire. Imperceptible at first, then rewarding when noticed.
- **Narrow highlight band** (35%→65%): The shimmer is concentrated. Most of the line is transparent at any given frame. This prevents the divider from ever looking "fully lit" — it's always emerging, always passing.

---

## Appendix: Full `globals.css` Additions

All new CSS for the landing page, collected in one block. Add after the existing marquee section.

```css
/* ─── Landing Page: Hero Emergence ────────────────────────────────────────────
   Slow materialization for hero content. Uses expo-out deceleration curve.
   Applied with staggered animation-delay on hero child elements.
   ─────────────────────────────────────────────────────────────────────────── */

@keyframes hero-emerge {
  from {
    opacity: 0;
    transform: translateY(12px) scale(0.985);
    filter: blur(2px);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
    filter: blur(0);
  }
}

.animate-hero-emerge {
  animation: hero-emerge 1000ms cubic-bezier(0.16, 1, 0.3, 1) both;
}

@media (prefers-reduced-motion: reduce) {
  .animate-hero-emerge {
    animation: none;
    opacity: 1;
    filter: none;
  }
}

/* ─── Landing Page: Section Divider Shimmer ───────────────────────────────────
   Slow-traveling gold highlight across ornamental divider lines.
   8s cycle, ease-in-out. Looks like candlelight on a gilded thread.
   ─────────────────────────────────────────────────────────────────────────── */

@keyframes divider-shimmer {
  0%   { background-position: -200% center; }
  100% { background-position: 200% center; }
}

.animate-divider-shimmer {
  background: linear-gradient(
    90deg,
    transparent 0%,
    transparent 35%,
    rgba(212, 169, 74, 0.3) 48%,
    rgba(251, 191, 36, 0.5) 50%,
    rgba(212, 169, 74, 0.3) 52%,
    transparent 65%,
    transparent 100%
  );
  background-size: 200% 100%;
  animation: divider-shimmer 8s ease-in-out infinite;
}

@media (prefers-reduced-motion: reduce) {
  .animate-divider-shimmer {
    animation: none;
    background: linear-gradient(
      90deg,
      transparent 0%,
      rgba(251, 191, 36, 0.2) 50%,
      transparent 100%
    );
    background-size: 100% 100%;
  }
}

/* ─── Landing Page: Atmospheric Background Drift ──────────────────────────────
   Imperceptible ambient movement on hero glow orb and background elements.
   30s cycle. Creates living-light effect without triggering motion sensitivity.
   ─────────────────────────────────────────────────────────────────────────── */

@keyframes bg-drift {
  0%, 100% { transform: translate(0, 0) scale(1); }
  25%      { transform: translate(2%, -1%) scale(1.02); }
  50%      { transform: translate(-1%, 2%) scale(1.01); }
  75%      { transform: translate(1%, -2%) scale(1.03); }
}

.animate-bg-drift {
  animation: bg-drift 30s ease-in-out infinite;
}

@media (prefers-reduced-motion: reduce) {
  .animate-bg-drift {
    animation: none;
  }
}

/* ─── Landing Page: Scroll Indicator ──────────────────────────────────────────
   Replaces animate-bounce with a slow, dignified vertical float.
   3s cycle. Opacity shifts between 0.5 and 0.3 for a breathing feel.
   ─────────────────────────────────────────────────────────────────────────── */

@keyframes scroll-hint {
  0%, 100% {
    transform: translateX(-50%) translateY(0);
    opacity: 0.5;
  }
  50% {
    transform: translateX(-50%) translateY(6px);
    opacity: 0.3;
  }
}

.animate-scroll-hint {
  animation: scroll-hint 3s ease-in-out infinite;
}

@media (prefers-reduced-motion: reduce) {
  .animate-scroll-hint {
    animation: none;
    opacity: 0.4;
    transform: translateX(-50%);
  }
}
```

---

## Appendix: Implementation Checklist

When applying this spec to `page.tsx`, make these changes:

- [ ] Replace `animate-bounce` on scroll indicator with `animate-scroll-hint`
- [ ] Add `animate-bg-drift` to hero atmospheric glow element
- [ ] Replace static divider `bg-gradient-to-r from-transparent via-gold-400/20 to-transparent` with `animate-divider-shimmer`
- [ ] Optionally convert hero RevealSections to use `animate-hero-emerge` with staggered `animation-delay` for a more cinematic entrance
- [ ] Add `transitionDuration: { '600': '600ms' }` to Tailwind config (or change StaggerCard to `duration-700`)
- [ ] Add all new keyframes and animations to `tailwind.config.ts`
- [ ] Add all new CSS to `globals.css`
