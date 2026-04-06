# Icon Button Accessibility Guide — Trait Roll Buttons

**Date:** 2026-03-27
**Auditor:** Usability & Accessibility Agent
**Scope:** `DiceRollButton.tsx` (icon variant) · `StatsPanel.tsx`
**Standards:** WCAG 2.1 AA, WCAG 2.5.5, Apple HIG, Material Design touch targets

---

## Problem Statement

The trait roll button in `StatsPanel.tsx` uses `DiceRollButton` in its default `"icon"` variant. At rest, the button renders at `h-7 w-7` (28 × 28 px) with the icon colored `text-[#577399]/50` — a 50% opacity steel-blue on a `bg-slate-900/80` background. Users report the icons are "barely visible."

This document defines the exact fixes required.

---

## Issue 1A — Contrast Ratio (WCAG 1.4.11 Non-text Contrast)

### The Standard

**WCAG 2.1 Success Criterion 1.4.11 — Non-text Contrast** requires that UI components (including icon buttons) have a contrast ratio of at least **3:1** against adjacent color(s) for **AA compliance**.

There is no WCAG AAA threshold for non-text contrast — 3:1 is both the AA floor *and* the ceiling in WCAG 2.1. However, for small interactive icons (under 24 × 24 px rendered size), best practice is to target **4.5:1** to compensate for the reduced spatial presence of the affordance.

| Standard | Ratio Required | Applies To |
|---|---|---|
| WCAG 2.1 AA — 1.4.11 | **3:1 minimum** | All UI components and graphical objects |
| WCAG 2.1 AAA — 1.4.6 | N/A for non-text | (Text only) |
| Best practice for icons < 24px | **4.5:1 recommended** | Small interactive icons |
| Best practice for primary actions | **7:1 target** | High-frequency interactive elements |

### Current State (Failing)

```
Icon color at rest:  #577399 at 50% opacity → effective color ≈ #2E4A60 blended on #0f172a
Background:          slate-900/80 ≈ #0f172a at 80% opacity on #0a100d
Effective icon:      approximately #4B637A
Contrast ratio:      approximately 1.9:1  ← FAILS 3:1 minimum
```

The `/50` opacity modifier is the primary culprit. It reduces an already borderline color to a contrast ratio that fails WCAG 1.4.11 by a wide margin.

### Required Fix

**Remove the `/50` opacity from the resting state.** Use the full `#577399` color at rest:

```
Full #577399 on #0f1713 background:  approximately 3.8:1  ✅ Passes AA (3:1)
Full #577399 on slate-900 (#0f172a): approximately 3.5:1  ✅ Passes AA (3:1)
```

For the **hover state**, target `#f7f7ff` (the app's near-white) which gives:
```
#f7f7ff on #0f1713:  approximately 16.8:1  ✅ Passes AAA
```

### Recommended Token Values

```tsx
// DiceRollButton.tsx — icon variant className (current vs. recommended)

// CURRENT (failing):
"border border-transparent text-[#577399]/50",
"hover:border-[#577399]/40 hover:bg-[#577399]/10 hover:text-[#577399]",

// RECOMMENDED (passing):
"border border-[#577399]/30 text-[#577399]",          // Rest: full color, visible border
"hover:border-[#577399] hover:bg-[#577399]/15 hover:text-[#f7f7ff]",  // Hover: bright
"active:bg-[#577399]/25 active:scale-95",              // Press: tactile feedback
```

---

## Issue 1B — Touch Target Size (WCAG 2.5.5, WCAG 2.5.8)

### The Standards

| Standard | Minimum Size | Notes |
|---|---|---|
| **WCAG 2.1 AA — 2.5.5 Target Size** | **44 × 44 CSS px** | AAA requirement in 2.1; AA in 2.2 |
| **WCAG 2.2 AA — 2.5.8 Target Size (Minimum)** | **24 × 24 CSS px** with adequate spacing | Relaxed AA floor in WCAG 2.2 |
| **Apple HIG** | **44 × 44 pt** | Recommended minimum for touch |
| **Material Design 3** | **48 × 48 dp** | Recommended minimum for touch |
| **Google Android** | **48 × 48 dp** | Hard minimum for touch targets |

**Our recommendation: target 44 × 44 px** for all interactive icon buttons. This satisfies WCAG 2.5.5 (AAA in 2.1, AA in 2.2) and Apple/Android guidelines simultaneously.

### Current State (Failing)

The icon variant renders at `h-7 w-7` = **28 × 28 px**. This is:
- 36% below the 44 px Apple/WCAG 2.5.5 target
- 42% below the 48 px Material/Android target
- Marginally above the 24 px WCAG 2.5.8 floor

On a mobile screen with a fingertip of ~9–10 mm (≈ 34–38 CSS px), a 28 px target requires careful precision tap. This is particularly bad during play when the user may be excited or distracted.

### Required Fix

**Option A — Increase rendered size to 44 × 44 px:**
```tsx
// Simple: make the button itself 44×44
className="flex h-11 w-11 items-center justify-center ..."
// Icon stays h-5 w-5 (20px) — the padding absorbs the extra space
```

**Option B — Keep visual size, expand hit target with padding (preferred in compact layouts):**
```tsx
// The button is still visually h-7 w-7, but the touchable area is 44×44
className="relative flex h-7 w-7 items-center justify-center ..."
// Add an invisible expanded hit target via ::before pseudo-element:
// before:absolute before:inset-[-8px] before:content-['']
// In Tailwind: before:absolute before:-inset-2 before:content-['']
```

**Option B is recommended** for the StatsPanel layout because `h-11 w-11` would expand the stat card below the dial, disrupting the tight 6-column grid on mobile (`grid-cols-3`). The pseudo-element approach keeps visual density while expanding the touchable region.

```tsx
// DiceRollButton.tsx — icon variant (recommended implementation)
<button
  type="button"
  onClick={handleClick}
  disabled={isRolling}
  aria-label={`Roll ${rollRequest.label}`}
  aria-busy={isRolling}
  title={`Roll ${rollRequest.label}`}
  className={[
    // Visual container — stays compact
    "group relative flex h-7 w-7 items-center justify-center rounded",
    // Expanded invisible hit target (44×44 via -8px inset)
    "before:absolute before:-inset-2 before:content-['']",
    // Rest state — full contrast, not ghosted
    "border border-[#577399]/30 text-[#577399]",
    // Hover — elevated contrast and fill
    "hover:border-[#577399] hover:bg-[#577399]/15 hover:text-[#f7f7ff]",
    // Active/press — tactile scale
    "active:bg-[#577399]/25 active:scale-95",
    // Disabled
    "disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100",
    // Transition
    "transition-all duration-150",
    // Focus ring
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#577399] focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900",
    className,
  ].join(" ")}
>
```

---

## Issue 1C — Focus Ring (WCAG 2.4.7, 2.4.11)

### The Standard

**WCAG 2.1 AA — 2.4.7 Focus Visible:** Any keyboard-focusable interface component must have a visible focus indicator.

**WCAG 2.2 AA — 2.4.11 Focus Appearance:** The focus indicator must:
- Have a contrast ratio of at least **3:1** between focused and unfocused states
- Enclose at least a perimeter of **2 CSS px** offset from the component

### Current State — Partially Passing, One Issue

The current focus ring:
```
focus:outline-none focus:ring-2 focus:ring-[#577399]
```

✅ **Passes 2.4.7** — a ring is visible on keyboard focus  
⚠️ **Potential failure of 2.4.11** — `focus:ring-[#577399]` (steel-blue) on `bg-slate-900` gives ~3.5:1, which passes 3:1. However, the ring has **no offset**, meaning it sits flush against the button border, making it hard to distinguish from a hover border state.

### Required Fix

Use `focus-visible:` (not `focus:`) to avoid showing the ring on mouse click, and add `ring-offset-2` to create breathing room:

```tsx
// Replace:
"focus:outline-none focus:ring-2 focus:ring-[#577399]"

// With:
"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#577399] focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
```

**Why `focus-visible` instead of `focus`:**
- `focus:` shows the ring on mouse clicks too, which is unnecessary and slightly jarring
- `focus-visible:` only shows the ring for keyboard navigation and programmatic focus
- The global `*:focus-visible` rule in `globals.css` already sets a gold (`#fbbf24`) fallback outline — the component-level `ring-[#577399]` overrides this to steel-blue, which is fine but you may consider using the global gold for consistency

**Recommended: use the gold focus ring for maximum contrast:**
```
#fbbf24 (gold) on slate-900 (#0f172a): 9.2:1 contrast  ✅ Passes AAA
#577399 (steel-blue) on slate-900:     3.5:1 contrast  ✅ Passes AA (barely)
```

The gold ring matches the existing global focus style from `globals.css` and is more visible, especially over the dark background.

---

## Issue 1D — Additional Affordances

Beyond contrast and size, the following affordances are critical for an interactive icon button:

### 1. `cursor: pointer`

Icon buttons must show `cursor: pointer` on hover. The current implementation doesn't explicitly set this — it inherits from the browser default for `<button>` elements, which is `default` cursor in some browsers.

```tsx
// Add explicitly:
"cursor-pointer disabled:cursor-not-allowed"
```

### 2. `aria-label` — ✅ Already Correct

The current code correctly uses `aria-label={`Roll ${rollRequest.label}`}`. This is essential — the icon has no visible text, so the label is the only thing a screen reader user will hear. **Keep this as-is.**

Verify label content is specific: `"Roll Agility Action Roll"` is clear. ✅

### 3. `aria-busy` — ✅ Already Correct

`aria-busy={isRolling}` is set correctly. This tells screen readers the button is processing. ✅

### 4. `title` Tooltip — ✅ Present, One Enhancement

`title={`Roll ${rollRequest.label}`}` provides a native tooltip on hover for mouse users. This is good. However, native `title` tooltips:
- Don't show on touch devices
- Don't show immediately (300ms+ delay)
- Can't be styled

**Enhancement (optional but recommended):** Add a CSS-driven tooltip that appears on hover, positioned below the button, visible immediately:

```tsx
// In the button container wrapper:
<div className="group/roll relative flex justify-center pt-1">
  <DiceRollButton ... />
  {/* Tooltip — appears on group hover, aria-hidden so it doesn't duplicate the label */}
  <span
    aria-hidden="true"
    className="
      pointer-events-none absolute bottom-full mb-1.5 left-1/2 -translate-x-1/2
      whitespace-nowrap rounded bg-slate-800 px-2 py-0.5
      text-[11px] font-medium text-[#f7f7ff]
      border border-[#577399]/30
      opacity-0 group-hover/roll:opacity-100
      transition-opacity duration-150 delay-300
      z-10
    "
  >
    Roll
  </span>
</div>
```

### 5. Hover State — Background Fill Required

The current hover adds only a `10%` opacity fill (`hover:bg-[#577399]/10`). This is nearly invisible on a dark background. **Increase to 15–20%** to make the interactive affordance unmistakable:

```
hover:bg-[#577399]/15  →  slightly visible teal wash
hover:bg-[#577399]/20  →  clearly visible teal wash (recommended)
```

### 6. Loading State — Spinner Contrast

When `isRolling`, the spinner is rendered as `border-current border-t-transparent`. The `current` color inherits from the button text color — at rest that was `#577399/50` (dim). With the fix applied, `current` will be `#577399` (full), which is fine. ✅

---

## Summary of Changes for `DiceRollButton.tsx` (icon variant)

| Issue | Current | Fix | WCAG Criterion |
|---|---|---|---|
| Rest icon contrast | `#577399` at 50% ≈ 1.9:1 ❌ | `#577399` at 100% ≈ 3.8:1 ✅ | 1.4.11 |
| Touch target size | 28 × 28 px ❌ | 44 × 44 px via pseudo-element ✅ | 2.5.5 |
| Focus ring offset | Flush against border | `ring-offset-2` ✅ | 2.4.11 |
| Focus ring trigger | `focus:` (includes mouse) | `focus-visible:` ✅ | 2.4.7 |
| Hover fill | `/10` (barely visible) | `/20` (clearly visible) ✅ | UX best practice |
| Cursor | Inherited | Explicit `cursor-pointer` ✅ | UX best practice |
| Visible border at rest | `border-transparent` (invisible) | `border-[#577399]/30` (subtle) ✅ | 1.4.11 (boundary) |

---

## QA Acceptance Criteria

- [ ] Rest state icon contrast ratio ≥ 3:1 against background (measure with browser DevTools or axe)
- [ ] Rest state icon contrast ratio ≥ 3:1 (target ≥ 4.5:1 for small icons)
- [ ] Keyboard focus ring is visible on Tab — `ring-2 ring-offset-2` applied
- [ ] Focus ring only appears on keyboard navigation, not mouse click
- [ ] Hover state shows visible background fill and full-contrast icon color
- [ ] Active/pressed state shows `scale-95` tactile response
- [ ] Touch target effective size is at least 44 × 44 px (measure with DevTools → touch emulation)
- [ ] `aria-label` is descriptive ("Roll Agility Action Roll") — test with screen reader (NVDA/VoiceOver)
- [ ] `aria-busy=true` announced while dice are rolling
- [ ] Disabled state: `opacity-40`, `cursor-not-allowed`, no interaction possible
- [ ] Works at 200% browser zoom without overlap or layout breakage
