# WCAG 2.1 AA Accessibility Audit Report
## Curses! Custom Character Builder — Daggerheart Character Sheet
**Audit Date:** 2026-03-24  
**Auditor:** Usability & Accessibility Agent  
**Standard:** WCAG 2.1 Level AA (with WCAG 2.2 notes where relevant)  
**Status:** ⚠️ CONDITIONAL APPROVAL — 5 mandatory corrections required before implementation

---

## Audit Methodology

All contrast ratios computed using the **WCAG 2.1 relative luminance formula**:

```
L = 0.2126 × sRGB(R) + 0.7152 × sRGB(G) + 0.0722 × sRGB(B)
where sRGB(c) = c/12.92 if c ≤ 0.04045, else ((c + 0.055)/1.055)^2.4

Contrast Ratio = (L_lighter + 0.05) / (L_darker + 0.05)
```

**Semi-transparent backgrounds** are resolved by alpha-compositing over the stated solid base before computing luminance:
```
R_eff = R_overlay × alpha + R_base × (1 - alpha)
```

**Pass thresholds:**
- Normal text (< 18px regular, < 14px bold): **4.5:1**
- Large text (≥ 18px regular OR ≥ 14px bold): **3.0:1**
- Non-text UI components (focus rings, icons, borders): **3.0:1** (WCAG 1.4.11)

---

## Executive Summary: Failures Found

| # | Item | Current Value | Actual Ratio | Required | Status |
|---|------|---------------|-------------|----------|--------|
| F1 | `--burgundy` on `#080d17` | `#cb2d56` | **3.75:1** | 4.5:1 (normal) | ❌ FAIL |
| F2 | `--burgundy-dim` on `#080d17` | `#8e1e3e` | **2.23:1** | 3.0:1 (large) | ❌ FAIL |
| F3 | Level LVL label on blended bg | `#b45309` | **2.85:1** | 3.0:1 (large/bold) | ❌ FAIL |
| F4 | Config placeholder on input bg | `#4a5568` | **2.55:1** | 4.5:1 (normal) | ❌ FAIL |
| F5 | Focus ring opacity form | `rgba(251,191,36,0.70)` | Context-dependent | 3.0:1 solid | ⚠️ RISK |

**Additionally identified:** 4 over-stated contrast claims in the spec, 4 touch-target violations, 3 motion-animation concerns, and 2 semantic/ARIA patterns requiring clarification.

---

## Section 1 — Custom Property Pairs (Corrected)

All values computed on the stated background. Corrected values replace failures inline.

| Property | Value | Background | Computed Ratio | Claimed | Type | Status |
|----------|-------|-----------|---------------|---------|------|--------|
| `--text-primary` | `#fef9c3` | `#080d17` | **18.10:1** | 17.8:1 | Normal | ✅ PASS |
| `--text-dim` | `#d4a94a` | `#0f172a` | **8.14:1** | 6.1:1 | Normal | ✅ PASS |
| `--text-muted` | `#e8c96d` | `#0f172a` | **11.06:1** | 7.4:1 | Normal | ✅ PASS |
| `--text-subtle` | `#966520` | `#0f172a` | **3.55:1** | 4.6:1 ⚠️ | Large/Bold only | ✅ PASS |
| `--gold` | `#fbbf24` | `#151e2d` | **10.02:1** | 8.9:1 | Normal | ✅ PASS |
| `--gold-dim` | `#b45309` | `#0f172a` | **3.56:1** | 4.6:1 ⚠️ | Large/Bold only | ✅ PASS |
| `--burgundy` | ~~`#cb2d56`~~ → **`#e03868`** | `#080d17` | **4.57:1** | 4.9:1 ⚠️ | Normal | ✅ CORRECTED |
| `--burgundy-dim` | ~~`#8e1e3e`~~ → **`#b2264e`** | `#080d17` | **3.04:1** | 3.5:1 ⚠️ | Large/Bold only | ✅ CORRECTED |

> **⚠️ Over-stated claim notes:**  
> `--text-subtle` was claimed at 4.6:1 but actually yields 3.55:1. It still **passes** for large/bold text (≥ 3.0:1). The label "large/bold text only" must be **strictly enforced** in implementation — this color cannot be used for body copy or normal-size text under any circumstance.  
>  
> `--gold-dim` similarly claimed 4.6:1 but yields 3.56:1. Same constraint applies.  
>  
> `--burgundy` claimed 4.9:1 but yields 3.75:1 — **FAILS** normal text. Corrected to `#e03868`.  
>  
> `--burgundy-dim` claimed 3.5:1 but yields 2.23:1 — **FAILS** even large text. Corrected to `#b2264e`.

### Approved Custom Properties (Final)

```css
/* APPROVED CORRECTED CUSTOM PROPERTIES */
--text-primary:  #fef9c3;   /* 18.10:1 on #080d17 — all text */
--text-dim:      #d4a94a;   /* 8.14:1 on #0f172a  — all text */
--text-muted:    #e8c96d;   /* 11.06:1 on #0f172a — all text */
--text-subtle:   #966520;   /* 3.55:1 on #0f172a  — LARGE/BOLD ≥18px or bold ≥14px ONLY */
--gold:          #fbbf24;   /* 10.02:1 on #151e2d — all text */
--gold-dim:      #b45309;   /* 3.56:1 on #0f172a  — LARGE/BOLD ≥18px or bold ≥14px ONLY */
--burgundy:      #e03868;   /* 4.57:1 on #080d17  — CORRECTED from #cb2d56 (was 3.75:1 ❌) */
--burgundy-dim:  #b2264e;   /* 3.04:1 on #080d17  — CORRECTED from #8e1e3e (was 2.23:1 ❌) */
                             /* --burgundy-dim: LARGE/BOLD ≥18px or bold ≥14px ONLY */
```

---

## Section 2 — Domain Tag Colors

All domain tag text colors evaluated against their effective blended background (overlay composited onto `#0f172a`).

| Domain | Text | Overlay | Effective BG | Computed Ratio | Status |
|--------|------|---------|-------------|---------------|--------|
| Artistry | `#e9d5ff` | `rgba(88,28,135,0.22)` | `#1f183e` | **12.26:1** | ✅ PASS |
| Charm/Grace | `#fce7f3` | `rgba(131,24,67,0.20)` | `#26172f` | **14.34:1** | ✅ PASS |
| Creature/Sage | `#bbf7d0` | `rgba(20,83,45,0.22)` | `#10242b` | **13.23:1** | ✅ PASS |
| Faithful/Splendor | `#fef9c3` | `rgba(120,53,15,0.22)` | `#261e24` | **15.11:1** | ✅ PASS |
| Oddity/Midnight | `#a5f3fc` | `rgba(14,116,144,0.18)` | `#0f283c` | **12.11:1** | ✅ PASS |
| Study/Codex | `#bae6fd` | `rgba(12,74,110,0.22)` | `#0e2239` | **12.11:1** | ✅ PASS |
| Thievery/Valor | `#fed7aa` | `rgba(154,52,18,0.20)` | `#2b1d25` | **11.89:1** | ✅ PASS |
| Trickery | `#bef264` | `rgba(54,83,20,0.20)` | `#172326` | **12.32:1** | ✅ PASS |
| Valiance/Blade | `#fecaca` | `rgba(153,27,27,0.22)` | `#2d1827` | **11.42:1** | ✅ PASS |
| Violence | `#fda4af` | `rgba(136,19,55,0.20)` | `#27162d` | **8.96:1** | ✅ PASS |
| Weird | `#a5b4fc` | `rgba(49,46,129,0.20)` | `#161c3b` | **8.34:1** | ✅ PASS |

> All eleven domain tag colors pass with substantial margin. The light pastel text on dark composited backgrounds is a well-chosen pattern. No corrections required.

---

## Section 3 — Other Color Pairings (Detailed)

| # | Description | Foreground | Effective BG | Computed | Claimed | Status |
|---|-------------|-----------|-------------|---------|---------|--------|
| 1 | Section header | `#d4a94a` | `#121828` (gradient avg) | **8.07:1** | 6.1:1 | ✅ PASS |
| 2 | Section sub-header | `#966520` | `#0f172a` | **3.55:1** | 4.6:1 ⚠️ | ✅ PASS (large/bold) |
| 3 | Stat badge value | `#fef9c3` | `#101420` | **17.11:1** | 17.8:1 | ✅ PASS |
| 4 | Stat badge label | `#966520` | `#101420` | **3.66:1** | 4.6:1 ⚠️ | ✅ PASS (large/bold) |
| 5 | Class pill text | `#e8c96d` | `#1e192e` (composited) | **10.54:1** | 7.4:1 | ✅ PASS |
| 6 | Level LVL label | ~~`#b45309`~~ → **`#c05b0a`** | `#382622` (composited) | **3.23:1** | 4.6:1 ⚠️ | ✅ CORRECTED |
| 7 | Level number | `#fbbf24` | `#382622` (composited) | **8.57:1** | 8.9:1 | ✅ PASS |
| 8 | Accordion name | `#fef9c3` | `#0f172a` | **16.62:1** | 17.8:1 | ✅ PASS |
| 9 | Accordion meta badge | `#966520` | `#1c1f29` (composited) | **3.27:1** | — | ✅ PASS (large/bold) |
| 10 | Accordion body text | `#d4a94a` | `#0d1424` (composited) | **8.38:1** | 6.1:1 | ✅ PASS |
| 11 | Footer CTA | `#fef9c3` | `#471e37` (composited) | **12.96:1** | 7.2:1 | ✅ PASS |
| 12 | Tracker count | `#d4a94a` | `#0f172a` | **8.14:1** | 6.1:1 | ✅ PASS |
| 13 | Overlay banner | `#d4a94a` | `#400a14` (composited) | **7.53:1** | — | ✅ PASS |
| 14 | char-cta button | `#fef9c3` | `#441d36` (composited) | **13.26:1** | 7.2:1 | ✅ PASS |
| 15 | Config form labels | `#e8c96d` | `#080d17` | **12.04:1** | 7.4:1 | ✅ PASS |
| 16 | Config input text | `#fef9c3` | `#090f1b` (composited) | **17.84:1** | 17.8:1 | ✅ PASS |
| 17 | Config placeholder | ~~`#4a5568`~~ → **`#717d8a`** | `#090f1b` (composited) | **4.57:1** | (none) | ✅ CORRECTED |
| 18 | Live-config title | `#fef9c3` | `#0c1220` | **17.41:1** | — | ✅ PASS |
| 19 | Live indicator dot | `#86efac` | `#0f172a` | **12.71:1** | 8.2:1 | ✅ PASS |
| 20 | Refresh button | `#fbbf24` | `#22242a` (composited) | **9.29:1** | 8.9:1 | ✅ PASS |
| 21 | Secondary button | `#e8c96d` | `#0c1322` (composited) | **11.49:1** | — | ✅ PASS |
| 22 | Destructive button | `#fca5a5` | `#201828` (composited) | **9.05:1** | 7.8:1 | ✅ PASS |

### Failure Detail: Item 6 — Level LVL Label

**Root cause:** The spec claimed `#b45309` on the level badge background achieves 4.6:1. In reality, `rgba(180,83,9,0.25)` composited over `#0f172a` produces an effective background of `#382622`. Against that background, `#b45309` yields only **2.85:1** — failing even the large-text 3.0:1 threshold.

**Correction options (ordered by preference):**

| Option | Color | Ratio vs `#382622` | Notes |
|--------|-------|-------------------|-------|
| A (recommended) | `#e8c96d` (`--text-muted`) | **8.86:1** | Already in system, consistent |
| B | `#d4a94a` (`--text-dim`) | **6.52:1** | Already in system |
| C (minimal delta) | `#c05b0a` | **3.23:1** | Only if branding demands amber; tight margin |

**Recommendation:** Use Option A (`#e8c96d`) for the LVL label. Reserve `--gold-dim` (`#b45309`) for purely decorative, non-interactive, non-text UI elements only.

### Failure Detail: Item 17 — Config Placeholder Text

**Root cause:** `#4a5568` is a standard Tailwind CSS slate-600 gray. On this application's near-black input background (`#090f1b`), it yields only **2.55:1**. WCAG 1.4.3 applies to placeholder text (confirmed by WCAG Understanding 1.4.3 — placeholder text is user-perceivable text).

**Corrected value:** `#717d8a` — **4.57:1** against `#090f1b`.  
**Safer value:** `#7b8694` — **5.18:1** (recommended for comfortable margin above threshold).

```css
/* CORRECTED — Config input placeholder */
::placeholder { color: #7b8694; }  /* 5.18:1 on #090f1b — PASSES */
/* Do NOT use #4a5568 — 2.55:1 — FAILS */
```

---

## Section 4 — Focus Ring Audit

### Current Spec
```css
outline: 2px solid rgba(251,191,36,0.70);
outline-offset: 2px;
```

### Analysis

The semi-transparent form works acceptably on the application's own dark surfaces (all pass 3.0:1 non-text threshold):

| Background | Effective Ring Color | Contrast vs BG | Status |
|-----------|---------------------|---------------|--------|
| `#080d17` | `#b28a20` | **6.06:1** | ✅ |
| `#0f172a` | `#b48d26` | **5.76:1** | ✅ |
| `#151e2d` | `#b68f27` | **5.53:1** | ✅ |
| `#1e293b` | `#b9922b` | **5.02:1** | ✅ |

**However, this approach carries a structural risk:** If any component is ever rendered on a light surface (modal overlay, tooltip, third-party embed), the 70% opacity ring blends toward that background and may fail. The ring also reads as a muted amber rather than bright gold, reducing its visual prominence.

### Corrected Specification

```css
/* CORRECTED — Solid focus ring; reliable on all surfaces */
outline: 2px solid #fbbf24;
outline-offset: 2px;
```

`#fbbf24` (solid) achieves:
- `#080d17`: **11.64:1** ✅
- `#0f172a`: **10.69:1** ✅  
- `#151e2d`: **10.02:1** ✅  
- `#1e293b`: **8.76:1** ✅

> **Additional focus requirements (WCAG 1.4.11, 2.4.7):**
> - Focus must be visible on **all** focusable elements: links, buttons, inputs, accordions, pip toggles, tracker slots.
> - The 2px offset is correct. Do not use `outline: none` without providing an equivalent custom focus indicator.
> - For elements with a dark border immediately adjacent to the focus ring, consider `outline-offset: 3px` to ensure the ring is not obscured by the component border.

---

## Section 5 — Interactive Pattern Evaluations

### 5.1 Domain Card Accordion Toggle — Chevron Only

**Issue:** Unicode characters `▲`/`▼` at 16px font-size with no explicit minimum hit area.

**WCAG criteria:** 2.5.5 (AAA, 44×44px) and WCAG 2.2 2.5.8 (AA, 24×24px minimum). Also 4.1.2 (name, role, value).

**Violations:**
1. A 16px character glyph has an effective interactive area smaller than its font-size — far below 24px.
2. The toggle button needs `aria-expanded="true|false"` and `aria-controls="[panel-id]"`.
3. The `▲`/`▼` span must have `aria-hidden="true"` if button text provides context.

**Required implementation:**
```html
<button
  type="button"
  aria-expanded="false"
  aria-controls="section-artistry-panel"
  class="accordion-toggle"
  style="min-height: 44px; width: 100%; text-align: left; padding: 0 16px;"
>
  <span aria-hidden="true">▼</span>
  Artistry
</button>
<div id="section-artistry-panel" role="region" aria-labelledby="...">
  <!-- content -->
</div>
```

The entire row must be the button target — not just the chevron. This naturally provides a 44px+ hit area.

---

### 5.2 Stat Badges — Hover Without Focus State

**Issue:** Spec describes hover state only; no separate focus state documented.

**WCAG 2.4.7:** Focus visible is a Level AA requirement.

**Required:** Stat badges that are interactive (e.g., editable, clickable) must have a visible focus state. Apply the standard focus ring. If stat badges are purely presentational (no interaction), they require no focus state — but verify intent.

**Recommendation:**
```css
.stat-badge:focus-visible {
  outline: 2px solid #fbbf24;
  outline-offset: 2px;
}
```

---

### 5.3 Animation — `prefers-reduced-motion`

**WCAG 2.3.3** (Level AAA) covers animation from interactions. While AAA, compliance with `prefers-reduced-motion` is required for **US Section 508** conformance and expected under WCAG 2.2.

| Animation | Type | Action Required |
|-----------|------|-----------------|
| `pulse-live` | Continuous loop | **MUST** disable or reduce to opacity toggle under reduced-motion |
| `shimmer-bar` | Continuous sweep | **MUST** disable; show static loading state |
| Overlay card enter/exit | Triggered transition | **SHOULD** reduce to instant display (no transform/fade) |

**Required CSS pattern:**
```css
@keyframes pulse-live {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.4; }
}

@media (prefers-reduced-motion: reduce) {
  .pulse-live         { animation: none; opacity: 1; }
  .shimmer-bar        { animation: none; }
  .overlay-card       { transition: none; }
  [data-enter-anim]   { animation: none; }
}
```

---

### 5.4 Touch Target Sizes

**Standard applied:** WCAG 2.2 §2.5.8 (AA) = 24×24 CSS px minimum. WCAG 2.1 §2.5.5 (AAA) = 44×44 CSS px.

| Element | Current Size | Min Required (AA) | Min Recommended (AAA) | Status |
|---------|-------------|------------------|----------------------|--------|
| Tracker slot (public) | 20×20px | 24×24px | 44×44px | ⚠️ Below AA |
| Tracker slot (Twitch) | 16×16px | 24×24px | 44×44px | ❌ Below AA |
| Hope pip (public) | 16px | 24×24px | 44×44px | ⚠️ Below AA |
| Hope pip (Twitch) | 14px | 24×24px | 44×44px | ❌ Below AA |
| Accordion chevron only | ~16px | 44px (full row) | 44px (full row) | ❌ Must use full row |

**Implementation guidance — inflate without changing visual appearance:**
```css
/* Pattern: small visual, adequate touch target */
.tracker-slot,
.hope-pip {
  /* Visual dimensions (unchanged) */
  width: 16px;
  height: 16px;
  
  /* Touch target inflation */
  position: relative;
}

.tracker-slot::after,
.hope-pip::after {
  content: '';
  position: absolute;
  inset: -4px;           /* expands touch area by 4px on each side = 24×24 total */
  min-width: 24px;
  min-height: 24px;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}

/* Or use padding approach */
.pip-button {
  min-width: 24px;
  min-height: 24px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 4px;
}
```

> **Note:** WCAG 2.1 technically only mandates 44×44 at AAA (2.5.5). However, given the Twitch panel's touch-first environment, we recommend treating 24×24 as a hard minimum and 44×44 as the production target for all interactive pip/tracker elements.

---

### 5.5 Banner Bar — `pointer-events: none`

**Issue:** A banner overlay with `pointer-events: none` will silently swallow no mouse events, but it will prevent any child elements from being interactable.

**WCAG concern:** If the banner contains any text that could be selected, any links, or any interactive elements, they become inaccessible to pointer users — a potential 1.4.13 or 2.1.1 violation.

**Required pattern:**
```html
<!-- If banner is decorative only: -->
<div class="banner-bar" aria-hidden="true" style="pointer-events: none;">
  <!-- Only decorative content -->
</div>

<!-- If banner contains text users might want to read/copy: -->
<div class="banner-bar" role="status" aria-live="polite">
  <!-- Readable content; do NOT set pointer-events:none -->
</div>
```

**Action required:** Verify that no selectable text, links, or interactive elements are children of the pointer-blocked banner. If present, remove `pointer-events: none`.

---

### 5.6 Portrait Images — `aria-hidden="true"` Pattern

**Current pattern:** `<img aria-hidden="true">` with no `alt` attribute, adjacent to character name in a heading.

**Assessment:** ✅ **PASS** — this is the correct pattern when:
1. The image is purely decorative (the character portrait adds visual flavor but no unique information).
2. The adjacent heading identifies the character by name.
3. The `img` element either has `alt=""` or `aria-hidden="true"` (both are valid; `aria-hidden="true"` on the img suppresses it from the accessibility tree entirely).

**Confirmation checklist for implementation:**
- [ ] `<img aria-hidden="true" alt="">` (belt-and-suspenders: both attributes)
- [ ] Character name is in an `<h1>` or equivalent heading nearby
- [ ] No other unique identifying information is conveyed only through the portrait
- [ ] The portrait does not contain overlaid text (e.g., character class watermark)

---

## Section 6 — Claimed vs. Actual Ratio Discrepancy Analysis

The spec contains **8 inaccurate contrast ratio claims**. Four are under-stated (conservative — safe); four are over-stated (dangerous — these led to failures).

| Property / Pairing | Claimed | Actual | Direction | Risk |
|-------------------|---------|--------|-----------|------|
| `--text-primary` on `#080d17` | 17.8:1 | **18.10:1** | Under-stated | Safe |
| `--text-dim` on `#0f172a` | 6.1:1 | **8.14:1** | Under-stated | Safe |
| `--text-muted` on `#0f172a` | 7.4:1 | **11.06:1** | Under-stated | Safe |
| `--text-subtle` on `#0f172a` | 4.6:1 | **3.55:1** | **Over-stated** | ⚠️ Passed only because large-text threshold is 3.0:1 |
| `--gold` on `#151e2d` | 8.9:1 | **10.02:1** | Under-stated | Safe |
| `--gold-dim` on `#0f172a` | 4.6:1 | **3.56:1** | **Over-stated** | ⚠️ Passed only because large-text threshold is 3.0:1 |
| `--burgundy` on `#080d17` | 4.9:1 | **3.75:1** | **Over-stated** | ❌ FAIL |
| `--burgundy-dim` on `#080d17` | 3.5:1 | **2.23:1** | **Over-stated** | ❌ FAIL |
| `--live-indicator` on `#0f172a` | 8.2:1 | **12.71:1** | Under-stated | Safe |

**Root cause of over-stated values:** The burgundy colors (`#cb2d56`, `#8e1e3e`) appear to have been checked against a lighter background than `#080d17`. When checked correctly, both fail. The `--text-subtle` and `--gold-dim` over-statements are minor (0.04 and 0.01 above threshold respectively) and pass only due to the lower large-text threshold.

**Recommendation for future spec work:** Use the WCAG-standard luminance formula directly (not browser DevTools pickers, which interpolate), and always composite semi-transparent overlays before measuring.

---

## Section 7 — Consolidated Approved Spec

### Approved Custom Properties

```css
:root {
  /* ── Text colors ─────────────────────────────────────────── */
  --text-primary:  #fef9c3;   /* 18.10:1 on #080d17 */
  --text-dim:      #d4a94a;   /*  8.14:1 on #0f172a */
  --text-muted:    #e8c96d;   /* 11.06:1 on #0f172a */
  --text-subtle:   #966520;   /*  3.55:1 on #0f172a — LARGE/BOLD (≥18px reg or ≥14px bold) ONLY */
  
  /* ── Accent colors ───────────────────────────────────────── */
  --gold:          #fbbf24;   /* 10.02:1 on #151e2d */
  --gold-dim:      #b45309;   /*  3.56:1 on #0f172a — LARGE/BOLD ONLY — decorative use */
  
  /* ── Brand accent — CORRECTED ────────────────────────────── */
  --burgundy:      #e03868;   /*  4.57:1 on #080d17 — CORRECTED from #cb2d56 (was 3.75:1) */
  --burgundy-dim:  #b2264e;   /*  3.04:1 on #080d17 — CORRECTED from #8e1e3e (was 2.23:1) */
                               /* --burgundy-dim: LARGE/BOLD ONLY */
}
```

### Approved Focus Ring

```css
/* CORRECTED — applies to ALL focusable elements globally */
:focus-visible {
  outline: 2px solid #fbbf24;   /* solid; 10.69:1 on #0f172a */
  outline-offset: 2px;
}
/* Remove legacy opacity form: rgba(251,191,36,0.70) */
```

### Approved Placeholder Color

```css
/* CORRECTED — config inputs, all text inputs in Twitch extension */
::placeholder {
  color: #7b8694;   /* 5.18:1 on #090f1b (composited input bg) */
}
/* Do NOT use #4a5568 (was 2.55:1) */
```

### Approved Level LVL Badge Label

```css
/* CORRECTED — Level badge "LVL" label color */
.level-badge-label {
  color: #e8c96d;   /* --text-muted; 8.86:1 on blended #382622 bg */
}
/* Do NOT use #b45309 (was 2.85:1 on this specific blended bg) */
```

### Approved Domain Tag Colors

No corrections required. All eleven domain tags pass with ratios between **8.34:1** and **15.11:1**.

```css
/* Domain tag colors — APPROVED AS SPECIFIED */
.tag-artistry   { color: #e9d5ff; /* 12.26:1 */ }
.tag-charm      { color: #fce7f3; /* 14.34:1 */ }
.tag-creature   { color: #bbf7d0; /* 13.23:1 */ }
.tag-faithful   { color: #fef9c3; /* 15.11:1 */ }
.tag-oddity     { color: #a5f3fc; /* 12.11:1 */ }
.tag-study      { color: #bae6fd; /* 12.11:1 */ }
.tag-thievery   { color: #fed7aa; /* 11.89:1 */ }
.tag-trickery   { color: #bef264; /* 12.32:1 */ }
.tag-valiance   { color: #fecaca; /* 11.42:1 */ }
.tag-violence   { color: #fda4af; /*  8.96:1 */ }
.tag-weird      { color: #a5b4fc; /*  8.34:1 */ }
```

### Required Motion Preferences CSS

```css
@media (prefers-reduced-motion: reduce) {
  /* Continuous animations — disable entirely */
  .pulse-live,
  [class*="pulse"]    { animation: none !important; opacity: 1; }
  
  .shimmer-bar,
  [class*="shimmer"]  { animation: none !important; }
  
  /* Triggered transitions — collapse to instant */
  .overlay-card,
  [data-animate],
  .accordion-panel    { transition: none !important; animation: none !important; }
}
```

### Required Touch Target CSS

```css
/* Minimum touch targets — WCAG 2.2 §2.5.8 */
.tracker-slot,
.hope-pip,
.domain-tag-toggle {
  /* Visual size may remain small; hit area must be minimum 24×24px */
  position: relative;
}

/* Pseudo-element touch expansion */
.tracker-slot::before,
.hope-pip::before {
  content: '';
  position: absolute;
  top: 50%; left: 50%;
  transform: translate(-50%, -50%);
  min-width: 24px;
  min-height: 24px;
  /* Twitch extension: expand further for touch */
}

/* Accordion rows — full row as button target */
.accordion-toggle {
  min-height: 44px;
  width: 100%;
  display: flex;
  align-items: center;
  text-align: left;
}
```

---

## Section 8 — QA Acceptance Criteria

The following acceptance criteria must be validated by the QA Automation Agent before any release:

### Color Contrast (WCAG 1.4.3, 1.4.11)

- [ ] **AC-A01:** All normal-size text elements using `--burgundy` render with `#e03868`, verified to achieve ≥ 4.5:1 on `#080d17`.
- [ ] **AC-A02:** All large/bold text elements using `--burgundy-dim` render with `#b2264e`, verified ≥ 3.0:1 on `#080d17`. Element font-size must be ≥ 18px regular or ≥ 14px bold.
- [ ] **AC-A03:** Level badge "LVL" label color is `#e8c96d`, not `#b45309`. Verify ≥ 3.0:1 on blended level-bg.
- [ ] **AC-A04:** Config/extension input placeholder color is `#7b8694` or darker-equivalent. Verify ≥ 4.5:1 on input effective background.
- [ ] **AC-A05:** `--text-subtle` (`#966520`) and `--gold-dim` (`#b45309`) are never applied to text elements below 18px regular or 14px bold. Automated linting check required.
- [ ] **AC-A06:** All 11 domain tag text colors verified by Playwright visual screenshot + contrast scan.

### Focus Ring (WCAG 2.4.7)

- [ ] **AC-B01:** Focus ring on all interactive elements uses solid `#fbbf24` outline (not semi-transparent form). Verified by computed styles check.
- [ ] **AC-B02:** Tab through entire character sheet — all focusable elements show visible gold ring.
- [ ] **AC-B03:** Focus ring is visible on both light and dark adjacent surfaces.

### Interactive Patterns (WCAG 2.4.3, 4.1.2)

- [ ] **AC-C01:** All accordion toggles have `aria-expanded` attribute toggling `"true"`/`"false"`.
- [ ] **AC-C02:** All accordion toggles have `aria-controls` pointing to the correct panel `id`.
- [ ] **AC-C03:** Chevron spans `▲`/`▼` have `aria-hidden="true"`.
- [ ] **AC-C04:** Accordion button rows have `min-height: 44px`.

### Touch Targets (WCAG 2.5.5 / 2.2 §2.5.8)

- [ ] **AC-D01:** Tracker slots have minimum 24×24px interactive area (visual or via pseudo-element expansion).
- [ ] **AC-D02:** Hope pips have minimum 24×24px interactive area.
- [ ] **AC-D03:** All accordion rows have minimum 44px height.
- [ ] **AC-D04:** Touch target test on a 375px viewport (iPhone SE) — no interactive element smaller than 24px.

### Motion (WCAG 2.3.3 / best practice)

- [ ] **AC-E01:** With `prefers-reduced-motion: reduce` set in OS, `pulse-live` animation is absent (element opacity: 1, no keyframe).
- [ ] **AC-E02:** With reduced-motion, `shimmer-bar` animation is absent; static loading bar shown.
- [ ] **AC-E03:** With reduced-motion, overlay card transitions are instantaneous (no fade/scale).

### Banner Pointer Events (WCAG 1.4.13 / 2.1.1)

- [ ] **AC-F01:** Banner bar with `pointer-events: none` has `aria-hidden="true"` and contains no text, links, or interactive children.

### Portrait Images (WCAG 1.1.1)

- [ ] **AC-G01:** All character portrait `<img>` elements have `alt=""` and `aria-hidden="true"`.
- [ ] **AC-G02:** Character name appears in an adjacent `<h1>` or equivalent heading on the same page.

---

## Section 9 — Risk Register

| Risk | Severity | Likelihood | Mitigation |
|------|---------|-----------|------------|
| `--text-subtle` used on normal-size text | High | Medium | Add ESLint/Stylelint rule; document in design tokens |
| `--gold-dim` used on non-large text | High | Medium | Same as above |
| Future component added without contrast check | High | High | Integrate axe-core into CI/CD (see QA Agent) |
| Touch targets on mobile Twitch panel | Medium | High | Pad all interactive elements to 24px minimum |
| Animations causing vestibular disorder issues | Medium | Low | `prefers-reduced-motion` already required above |
| New team members using `#4a5568` from Tailwind defaults | Medium | High | Document approved placeholder color explicitly |

---

## Approval Decision

| Domain | Decision |
|--------|---------|
| Domain tag colors (11 total) | ✅ **APPROVED** |
| Custom properties (6 of 8) | ✅ **APPROVED** |
| `--burgundy` | ✅ **APPROVED WITH CORRECTION** (`#e03868`) |
| `--burgundy-dim` | ✅ **APPROVED WITH CORRECTION** (`#b2264e`) |
| Other color pairings (21 of 22) | ✅ **APPROVED** |
| Config placeholder | ✅ **APPROVED WITH CORRECTION** (`#7b8694`) |
| Level LVL label | ✅ **APPROVED WITH CORRECTION** (`#e8c96d`) |
| Focus ring | ✅ **APPROVED WITH CORRECTION** (solid `#fbbf24`) |
| Domain tag system | ✅ **APPROVED** |
| Animation patterns | ⚠️ **CONDITIONAL** — `prefers-reduced-motion` implementation required |
| Touch targets | ⚠️ **CONDITIONAL** — 24px minimum implementation required |
| ARIA/semantic patterns | ⚠️ **CONDITIONAL** — accordion ARIA attributes and chevron aria-hidden required |

**Overall Verdict: ⚠️ CONDITIONAL APPROVAL**

This spec is approved for implementation **subject to the 5 mandatory corrections** listed below. All other color pairings are confirmed compliant. Implementation may proceed in parallel with corrections on the failing items, provided failing elements are not shipped until corrected.

### Mandatory Corrections Summary

| # | File(s) Affected | Change |
|---|-----------------|--------|
| C1 | All CSS files | `--burgundy: #cb2d56` → `--burgundy: #e03868` |
| C2 | All CSS files | `--burgundy-dim: #8e1e3e` → `--burgundy-dim: #b2264e` |
| C3 | `config.html`, `live_config.html` | Level LVL label color `#b45309` → `#e8c96d` |
| C4 | `config.html`, `live_config.html` | Placeholder `#4a5568` → `#7b8694` |
| C5 | All CSS files | Focus ring `rgba(251,191,36,0.70)` → `#fbbf24` (solid) |

### Strongly Recommended (Non-Blocking for Initial Ship)

| # | Item | Priority |
|---|------|---------|
| R1 | Add `prefers-reduced-motion` block for all animations | P1 |
| R2 | Inflate tracker slots and hope pips to 24px touch targets | P1 |
| R3 | Add `aria-expanded` + `aria-controls` to accordion toggles | P1 |
| R4 | Verify banner `pointer-events:none` has no interactive children | P2 |
| R5 | Confirm portrait `<img>` elements have `alt=""` + `aria-hidden="true"` | P2 |
| R6 | Add design-token documentation noting `--text-subtle` and `--gold-dim` size restrictions | P2 |

---

*This report is the authoritative accessibility reference for the Curses! Custom Character Builder v1.x Daggerheart character sheet. All future design changes to color, typography, or interaction should be re-audited against this document's methodology before implementation.*
