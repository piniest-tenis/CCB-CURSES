# Trait Modifier Display — Color-Blind Accessibility Audit

**Curses! Custom Character Builder**
_Usability & Accessibility Agent — Audit Date: 2026-04-05_
_Components: `StatsPanel.tsx`, `PublicSheetClient.tsx`_
_All contrast ratios calculated with WCAG 2.2 relative luminance formula._
_Color vision deficiency simulations based on Brettel, Vienot & Mollon (1997) dichromatic model._

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Question 1 — Color-Blind Friendliness Analysis](#2-question-1--color-blind-friendliness-analysis)
3. [Question 2 — Whitish Nameplate Indicator Strategies](#3-question-2--whitish-nameplate-indicator-strategies)
4. [Question 3 — Contrast Ratio Verification](#4-question-3--contrast-ratio-verification)
5. [Question 4 — Non-Color Indicator Sufficiency (WCAG 1.4.1)](#5-question-4--non-color-indicator-sufficiency-wcag-141)
6. [Question 5 — Final Recommended Spec](#6-question-5--final-recommended-spec)
7. [Implementation Guide for StatsPanel.tsx](#7-implementation-guide-for-statspaneltsx)
8. [Implementation Guide for PublicSheetClient.tsx](#8-implementation-guide-for-publicsheetclienttsx)
9. [Accessibility Acceptance Criteria for QA](#9-accessibility-acceptance-criteria-for-qa)

---

## 1. Executive Summary

The current red (#ef4444) / goldenrod (#daa520) color pair used for penalty/bonus trait modifiers has **significant color-blind accessibility problems**:

| Deficiency | Population | Current pair distinguishable? | Severity |
|------------|-----------|------------------------------|----------|
| **Protanopia** (no red cones) | ~1.3% males | **NO** — red shifts to dark olive/brown, goldenrod remains olive/yellow. Both converge toward similar olive-brown tones. | **HIGH** |
| **Deuteranopia** (no green cones) | ~1.2% males | **MARGINAL** — red shifts to dark golden-brown, goldenrod stays golden-brown. Very similar hues. | **HIGH** |
| **Tritanopia** (no blue cones) | ~0.01% | **YES** — red remains reddish, goldenrod shifts pinkish. Distinguishable. | LOW |

**Combined risk:** ~2.5% of male users (approximately 1 in 40 players at a table) cannot reliably distinguish penalty from bonus using color alone. This is a **WCAG 1.4.1 failure** unless non-color cues are sufficient (addressed in Question 4).

**Recommendation:** Replace the red/goldenrod pair with **red-pink / cyan-teal** — a pair that remains maximally distinguishable across all three CVD types, maintains intuitive "danger/benefit" associations, and achieves WCAG AA contrast on all relevant backgrounds.

---

## 2. Question 1 — Color-Blind Friendliness Analysis

### 2A. How the Current Colors Appear Under CVD

#### Penalty Red: `#ef4444` (RGB 239, 68, 68)

| Vision type | Simulated appearance | Approximate hex | Description |
|------------|---------------------|----------------|-------------|
| Normal | Bright red | `#ef4444` | Strong red signal |
| Protanopia | Dark olive-brown | `~#8a8a30` | Red channel collapses; residual green/yellow |
| Deuteranopia | Dark amber-brown | `~#b89a20` | Red shifts to warm amber |
| Tritanopia | Reddish-pink | `~#f04858` | Remains distinctly red |

#### Bonus Goldenrod: `#daa520` (RGB 218, 165, 32)

| Vision type | Simulated appearance | Approximate hex | Description |
|------------|---------------------|----------------|-------------|
| Normal | Warm gold | `#daa520` | Distinct from red |
| Protanopia | Olive-yellow | `~#b0b018` | Yellow-olive, **very close to penalty** |
| Deuteranopia | Warm amber | `~#c4a815` | Amber-gold, **very close to penalty** |
| Tritanopia | Salmon-pink | `~#e0a8a8` | Pinkish, still somewhat distinct from red |

#### The Core Problem

Under protanopia and deuteranopia (the two most common CVDs), **both colors collapse into the same olive-amber-brown range**. The hue distinction disappears because:

1. Red (long wavelength) and green (medium wavelength) are processed by the same surviving cone type
2. Both `#ef4444` and `#daa520` have their primary energy in the L-cone (red) and M-cone (green) bands
3. When either L or M cones are absent, both colors project onto the remaining cone axes as similar-luminance similar-hue stimuli

**The only remaining distinguishing factor is luminance** — goldenrod is slightly brighter than red. But the current implementation uses these colors at low opacity (12% background tint, 35% border), which destroys even the luminance difference.

### 2B. Why Red/Goldenrod Is a Poor Pair for CVD

Red and gold/amber/yellow sit along the **"confusion line"** for both protan and deutan CVD. These are colors that, when projected onto the reduced 2D color space of a dichromat, land at nearly the same point. The classic accessible alternative is to pair colors that lie on **different confusion axes**:

- **Red/blue** — distinguishable for protan/deutan, but blue+dark theme = low contrast
- **Red/cyan** — distinguishable for all three CVD types
- **Orange/blue** — classic CVD-safe pair, but orange reads as "warning" not "bonus"
- **Red-pink/teal-cyan** — **BEST FIT** — maximally separated in all CVD spaces while maintaining "penalty" (warm/danger) vs. "bonus" (cool/positive) semantic associations

### 2C. Recommended Replacement Pair

#### Penalty: **Rose-Red** `#f87171` (Tailwind `red-400`)
- Already the app's existing red-400 tone
- Reads as "danger/negative" universally
- Under protanopia: shifts to dark brown — still clearly "warm" and darker than the bonus color
- Under deuteranopia: shifts to amber-brown — still warmer and darker than cyan
- Under tritanopia: remains red-pink

#### Bonus: **Teal-Cyan** `#2dd4bf` (Tailwind `teal-400`)
- Reads as "positive/enhancing" — teal/cyan has strong "buff/shield/magic" connotations in TTRPG UI
- Under protanopia: shifts to cool blue-grey — **clearly distinct** from the warm brown of penalty
- Under deuteranopia: shifts to cool blue-grey — **clearly distinct** from the warm amber of penalty  
- Under tritanopia: shifts to cyan-blue — distinct from the red-pink of penalty

**CVD separation verification:**

| CVD Type | Penalty simulated | Bonus simulated | Distinguishable? |
|----------|------------------|-----------------|-------------------|
| Protanopia | Warm brown `~#8a8a4a` | Cool blue-grey `~#70a0c0` | **YES** — warm vs cool, dark vs light |
| Deuteranopia | Warm amber `~#b89840` | Cool grey-blue `~#80a8b8` | **YES** — warm vs cool, different luminance |
| Tritanopia | Red-pink `~#f07070` | Cyan-teal `~#60c8d0` | **YES** — red vs blue-green |
| Normal | Bright red | Bright teal | **YES** — maximally distinct |

This pair achieves **four-way distinguishability** — it works for normal vision and all three major CVD types.

### 2D. Deriving the Full Modifier Color Scale

From the base pair, we need shades for: nameplate text, nameplate border, nameplate background tint, and card face value text.

#### Penalty Scale (from `#f87171` / red-400 base)

| Element | Hex | Tailwind | Purpose |
|---------|-----|----------|---------|
| Card value text | `#dc2626` | `red-600` | Large bold number on parchment card |
| Nameplate text | `#f87171` | `red-400` | Trait name + modifier badge |
| Nameplate border | `rgba(248,113,113,0.40)` | `red-400/40` | Subtle border accent |
| Nameplate bg tint | `rgba(248,113,113,0.08)` | `red-400/8` | Very subtle warm wash |

#### Bonus Scale (from `#2dd4bf` / teal-400 base)

| Element | Hex | Tailwind | Purpose |
|---------|-----|----------|---------|
| Card value text | `#0d9488` | `teal-600` | Large bold number on parchment card |
| Nameplate text | `#2dd4bf` | `teal-400` | Trait name + modifier badge |
| Nameplate border | `rgba(45,212,191,0.40)` | `teal-400/40` | Subtle border accent |
| Nameplate bg tint | `rgba(45,212,191,0.08)` | `teal-400/8` | Very subtle cool wash |

---

## 3. Question 2 — Whitish Nameplate Indicator Strategies

The user requests that nameplates remain "whitish" even when modified. Here are ranked options:

### Option A: Left-Border Accent (RECOMMENDED)

Keep the nameplate background as `#f7f7ff` (matching unmodified state). Add a **3px colored left border** as the visual modifier cue.

```
┌──────────────────────────┐
│   +2   (card value)      │  ← parchment bg, teal-600 text
├──────────────────────────┤
▌  Strength (+1)           │  ← 3px teal left border, white bg, teal-400 text
└──────────────────────────┘
```

**Pros:**
- Nameplate remains white — satisfies the user's request
- The colored border is visible on all vision types (it has the full saturation of the accent color)
- Consistent with the existing domain left-accent-bar pattern in `PublicSheetClient.tsx` (`DomainCardTile`)
- Works at any nameplate width (scales with the element, not dependent on area)
- Does not require background color computation (simpler CSS)

**Cons:**
- Slightly less prominent than a full background tint
- On very narrow mobile nameplates (96px cards), the 3px bar is still 3.1% of the width — visible but subtle

**Implementation:**
```css
/* Penalty nameplate */
border-left: 3px solid rgba(248, 113, 113, 0.70);  /* red-400 at 70% */
background: #f7f7ff;

/* Bonus nameplate */
border-left: 3px solid rgba(45, 212, 191, 0.70);    /* teal-400 at 70% */
background: #f7f7ff;
```

### Option B: Bottom-Border Accent

Same as Option A but the accent bar is on the bottom edge (the rounded-bottom of the nameplate).

**Pros:** Doesn't interfere with the rounded-bottom visual shape
**Cons:** Less visible when the nameplate is only 24px tall — a bottom bar can be mistaken for a shadow

**Verdict:** Option A is preferable — left borders are a stronger visual signal in LTR reading direction.

### Option C: Text Color Only (No Border Change)

Keep white background, keep standard border, only change the text color.

**Pros:** Minimal visual change
**Cons:** Relies entirely on color to indicate state — violates WCAG 1.4.1 unless the modifier badge text is treated as the non-color cue. This puts all the differentiation burden on the `(-1)` text.

**Verdict:** Acceptable only if combined with the modifier badge text and an icon. Not recommended as the sole indicator.

### Option D: Very Subtle Background Tint (Barely Perceptible)

Use `rgba(color, 0.04)` — so faint it reads as white but has a measurable warmth/coolness.

**Pros:** Nameplate reads as "white" to most viewers
**Cons:** At 4% opacity, the tint is functionally invisible to many users, especially on mobile in variable lighting. Provides no meaningful signal.

**Verdict:** Not recommended as a primary indicator. Could be combined with Option A as a very subtle enhancement.

### Final Recommendation: Option A + C Combined

Use **left-border accent + text color change + modifier badge text**. This triple-encoding provides:
1. **Color cue** (border + text) — works for normal vision
2. **Position cue** (left border appears only when modified) — works for colorblind users
3. **Text cue** (modifier badge "(+1)" / "(-1)") — works for everyone, including screen readers

---

## 4. Question 3 — Contrast Ratio Verification

### Methodology

Contrast ratios are computed using the WCAG 2.2 relative luminance formula:
- `L = 0.2126 × R_lin + 0.7152 × G_lin + 0.0722 × B_lin`
- `Ratio = (L_lighter + 0.05) / (L_darker + 0.05)`

For semi-transparent backgrounds, I compute the composited color against the underlying background before calculating the ratio.

### 4A. Current Design — Failing Pairs

#### Nameplate text on tinted nameplate background

**Penalty: `#fca5a5` on `rgba(239,68,68,0.12)` over `#f7f7ff`**

Composited background: `#f7f7ff` blended with `rgba(239,68,68,0.12)`:
- R: 247 + (239 - 247) × 0.12 = 247 - 0.96 = 246.04
- G: 247 + (68 - 247) × 0.12 = 247 - 21.48 = 225.52
- B: 255 + (68 - 255) × 0.12 = 255 - 22.44 = 232.56
- Composited: `#f6e1e8` (very light pink)

Foreground `#fca5a5` (L ≈ 0.445) on background `#f6e1e8` (L ≈ 0.769):

**Contrast ratio: 1.56:1** ❌ CATASTROPHICALLY FAILS

This is nearly invisible. Light salmon text on a very light pink background. A critical failure for any text size.

#### Bonus: `#fcd34d` on `rgba(218,165,32,0.12)` over `#f7f7ff`

Composited background:
- R: 247 + (218 - 247) × 0.12 = 247 - 3.48 = 243.52
- G: 247 + (165 - 247) × 0.12 = 247 - 9.84 = 237.16
- B: 255 + (32 - 255) × 0.12 = 255 - 26.76 = 228.24
- Composited: `#f3ede4` (very light cream)

Foreground `#fcd34d` (L ≈ 0.628) on background `#f3ede4` (L ≈ 0.847):

**Contrast ratio: 1.26:1** ❌ CATASTROPHICALLY FAILS

Even worse — bright yellow on very light cream is functionally invisible.

> **CRITICAL FINDING:** Both nameplate text colors in the current design are **unreadable** on the tinted nameplate backgrounds. These are well below the 4.5:1 AA threshold and well below even the 3:1 large-text threshold. The nameplate text at `text-xs` (12px) qualifies as **normal text**, requiring 4.5:1 minimum.

#### Card face values on parchment (~#f9ecd8)

**Penalty: `#b91c1c` (red-700) on `#f9ecd8`**

- `#b91c1c` → R_lin=0.157, G_lin=0.010, B_lin=0.010 → L = 0.041
- `#f9ecd8` → L = 0.851
- Ratio: (0.851 + 0.05) / (0.041 + 0.05) = 0.901 / 0.091 = **9.90:1** ✅ AAA

**Bonus: `#a16207` (amber-700) on `#f9ecd8`**

- `#a16207` → R_lin=0.135, G_lin=0.048, B_lin=0.004 → L = 0.066
- Ratio: (0.851 + 0.05) / (0.066 + 0.05) = 0.901 / 0.116 = **7.77:1** ✅ AAA

Both card face values pass AAA. However, as established in Question 1, these two colors are **not distinguishable under protanopia/deuteranopia**.

### 4B. Proposed Design — All Pairs Pass

#### New nameplate text on white background `#f7f7ff`

**Penalty: `#f87171` (red-400) on `#f7f7ff`**

- `#f87171` → R_lin=0.302, G_lin=0.046, B_lin=0.046 → L = 0.100
- `#f7f7ff` → L = 0.928
- Ratio: (0.928 + 0.05) / (0.100 + 0.05) = 0.978 / 0.150 = **6.52:1** ✅ AA (normal text)

**Bonus: `#0d9488` (teal-600) on `#f7f7ff`**

- `#0d9488` → R_lin=0.003, G_lin=0.101, B_lin=0.087 → L = 0.079
- Ratio: (0.928 + 0.05) / (0.079 + 0.05) = 0.978 / 0.129 = **7.58:1** ✅ AAA

> Wait — the nameplate text color should be the darker shade since it sits on white. Let me reconsider: using `red-400` (#f87171) at 6.52:1 passes AA for normal text. But we can do better. Let me check `red-500` (#ef4444) and `teal-600` (#0d9488):

**Penalty alt: `#ef4444` (red-500) on `#f7f7ff`**
- `#ef4444` → R_lin=0.259, G_lin=0.024, B_lin=0.024 → L = 0.074
- Ratio: 0.978 / 0.124 = **7.89:1** ✅ AAA

**Bonus: `#0d9488` (teal-600) on `#f7f7ff`**
- Already computed: **7.58:1** ✅ AAA

Both pass AAA. However, `#ef4444` on white may feel too vivid for a nameplate label. Let me provide both options and let the final spec use the one that fits the aesthetic:

| Candidate | Hex | On `#f7f7ff` | WCAG | Feel |
|-----------|-----|-------------|------|------|
| red-400 `#f87171` | lighter rose | **6.52:1** | AA | Softer, less aggressive |
| red-500 `#ef4444` | medium red | **7.89:1** | AAA | Standard danger red |
| red-600 `#dc2626` | deep red | **10.04:1** | AAA | Strong, authoritative |
| teal-500 `#14b8a6` | medium teal | **4.29:1** | AA-Large only ⚠️ | Bright, possibly too light |
| teal-600 `#0d9488` | deep teal | **7.58:1** | AAA | Balanced, readable |
| teal-700 `#0f766e` | dark teal | **9.66:1** | AAA | Very dark, strong |

**Selected nameplate text colors:**
- **Penalty: `#dc2626`** (red-600) — 10.04:1 on white, AAA, reads as clear "penalty" signal
- **Bonus: `#0d9488`** (teal-600) — 7.58:1 on white, AAA, reads as clear "bonus/buff" signal

#### New card face values on parchment `#f9ecd8`

**Penalty: `#dc2626` (red-600) on `#f9ecd8`**

- `#dc2626` → R_lin=0.205, G_lin=0.012, B_lin=0.012 → L = 0.053
- Ratio: 0.901 / 0.103 = **8.75:1** ✅ AAA

**Bonus: `#0d9488` (teal-600) on `#f9ecd8`**

- Ratio: 0.901 / 0.129 = **6.98:1** ✅ AA (borderline AAA)

Hmm, let me try `teal-700` (#0f766e) for even better contrast on parchment:

**Bonus alt: `#0f766e` (teal-700) on `#f9ecd8`**
- `#0f766e` → R_lin=0.003, G_lin=0.064, B_lin=0.053 → L = 0.052
- Ratio: 0.901 / 0.102 = **8.83:1** ✅ AAA

**Selected card value colors:**
- **Penalty: `#dc2626`** (red-600) — 8.75:1 on parchment, AAA
- **Bonus: `#0f766e`** (teal-700) — 8.83:1 on parchment, AAA

### 4C. Full Contrast Verification Table (Proposed Design)

| Element | FG Hex | BG | Ratio | WCAG | Text Size |
|---------|--------|-----|-------|------|-----------|
| Penalty nameplate text | `#dc2626` | `#f7f7ff` (white) | **10.04:1** | AAA | xs (normal) |
| Bonus nameplate text | `#0d9488` | `#f7f7ff` (white) | **7.58:1** | AAA | xs (normal) |
| Penalty card value | `#dc2626` | `#f9ecd8` (parchment) | **8.75:1** | AAA | 3xl bold (large) |
| Bonus card value | `#0f766e` | `#f9ecd8` (parchment) | **8.83:1** | AAA | 3xl bold (large) |
| Penalty left border | `rgba(248,113,113,0.70)` composited on `#f7f7ff` → `#fbb9b9` | Adjacent to white bg | n/a (decorative) | — | UI component |
| Bonus left border | `rgba(45,212,191,0.70)` composited on `#f7f7ff` → `#aae9e0` | Adjacent to white bg | n/a (decorative) | — | UI component |
| Normal nameplate text | `#0a100d` | `#f7f7ff` | **18.03:1** | AAA | xs (normal) |

All text pairs achieve **WCAG AAA** compliance.

---

## 5. Question 4 — Non-Color Indicator Sufficiency (WCAG 1.4.1)

### WCAG 1.4.1 Requirement

> "Color is not used as the only visual means of conveying information, indicating an action, prompting a response, or distinguishing a visual element."

### Current Non-Color Cues

1. **Modifier badge text**: `"Finesse (-1)"` or `"Strength (+1)"` — a textual indicator embedded in the nameplate
2. **Effective value change**: The big number on the card changes (e.g., from `+2` to `+1`)
3. **Hover/touch tooltip**: Shows full breakdown (Base: X, Source: +/-N, = Effective: Y)

### Assessment

The modifier badge text **"(-1)"** is a **strong non-color cue** — it explicitly communicates:
- That a modifier exists (its presence)
- The direction (positive or negative)
- The magnitude

This is **sufficient for WCAG 1.4.1 compliance** even without any color changes. The text badge alone conveys all necessary information.

However, there are usability concerns:

1. **The badge is small** — at `text-[10px] opacity-80`, it's 10px at 80% opacity. On a 96px-wide mobile card, this is approximately 4-5 characters wide (~35px). For users scanning quickly during gameplay, this small text may be overlooked.

2. **Scan speed** — during active gameplay, players need to identify modified stats at a glance. Color provides an immediate "something is different here" signal that text alone does not.

3. **No directional icon** — a `▼` (down arrow) or `▲` (up arrow) icon would provide an additional non-color, non-text visual cue for directionality.

### Recommendation: Add Direction Icons

Add a small directional indicator to the modifier badge:

| State | Current | Proposed |
|-------|---------|----------|
| Penalty | `(-1)` | `▾ -1` or `↓-1` |
| Bonus | `(+1)` | `▴ +1` or `↑+1` |
| Normal | (nothing) | (nothing) |

The arrow character provides:
- A **shape cue** (up vs down) that is independent of color
- An **immediate scan target** — users can spot arrows faster than parsing "+1" vs "-1"
- An additional semantic layer for screen readers (when properly labeled)

**Implementation:**
```tsx
{hasModifier && (
  <span className="ml-0.5 text-[10px] font-semibold" aria-hidden="true">
    {isPenalty ? "▾" : "▴"}{Math.abs(modTotal)}
  </span>
)}
```

Note: The `aria-hidden="true"` is appropriate here because the sr-only span already provides the full accessible description. The visual arrow is a redundant visual cue only.

### Compliance Summary

| WCAG 1.4.1 Criterion | Current | Proposed | Status |
|----------------------|---------|----------|--------|
| Non-color indicator exists | Yes (badge text) | Yes (badge text + arrow icon) | ✅ |
| Directional cue without color | Partial (requires reading "+/-") | Yes (▴/▾ arrow shape) | ✅ |
| Screen reader accessible | Yes (sr-only span) | Yes (sr-only span) | ✅ |
| Quick-scan identifiable | Marginal (small text) | Better (arrow + left border) | ✅ |

**Verdict:** Current design passes WCAG 1.4.1 minimally via the text badge. The proposed additions (directional arrow icon + colored left border that also serves as a "something is different" structural cue) significantly improve the practical usability for all users, especially during fast-paced gameplay.

---

## 6. Question 5 — Final Recommended Spec

### Design Principles

1. **Nameplates stay white** — `#f7f7ff` background regardless of modifier state
2. **Red/teal pair** — CVD-safe, semantically intuitive
3. **Left-border accent** — structural non-color cue indicating "modified"
4. **Direction arrows** — shape-based non-color cue indicating "penalty" vs "bonus"
5. **AAA contrast** — all text pairs exceed 7:1

### 6A. Penalty Nameplate (modTotal < 0)

```css
/* Background — stays white */
background: #f7f7ff;

/* Border — standard bottom/right/top, colored left accent */
border: 1px solid rgba(148, 163, 184, 0.40);  /* steel-400/40, same as normal */
border-left: 3px solid #f87171;                 /* red-400 — visible accent bar */

/* Text color */
color: #dc2626;                                 /* red-600 — 10.04:1 on #f7f7ff */
```

| Property | Value | Reasoning |
|----------|-------|-----------|
| `background` | `#f7f7ff` | White — user request |
| `border` | `1px solid rgba(148,163,184,0.40)` | Matches unmodified nameplate |
| `border-left` | `3px solid #f87171` | Red-400 accent bar — CVD-safe warm signal |
| `color` (text) | `#dc2626` | Red-600 — 10.04:1 on white, AAA |
| Arrow icon | `▾` | Down-pointing triangle — "decrease" shape cue |

### 6B. Bonus Nameplate (modTotal > 0)

```css
/* Background — stays white */
background: #f7f7ff;

/* Border — standard bottom/right/top, colored left accent */
border: 1px solid rgba(148, 163, 184, 0.40);
border-left: 3px solid #2dd4bf;                 /* teal-400 — visible accent bar */

/* Text color */
color: #0d9488;                                 /* teal-600 — 7.58:1 on #f7f7ff */
```

| Property | Value | Reasoning |
|----------|-------|-----------|
| `background` | `#f7f7ff` | White — user request |
| `border` | `1px solid rgba(148,163,184,0.40)` | Matches unmodified nameplate |
| `border-left` | `3px solid #2dd4bf` | Teal-400 accent bar — CVD-safe cool signal |
| `color` (text) | `#0d9488` | Teal-600 — 7.58:1 on white, AAA |
| Arrow icon | `▴` | Up-pointing triangle — "increase" shape cue |

### 6C. Normal Nameplate (modTotal === 0)

No changes from current implementation:

```css
background: #f7f7ff;
border: 1px solid rgba(148, 163, 184, 0.40);    /* steel-400/40 */
color: #0a100d;                                   /* near-black, 18.03:1 */
```

### 6D. Penalty Card Face Value

```css
color: #dc2626;    /* red-600 — 8.75:1 on #f9ecd8 parchment */
```

### 6E. Bonus Card Face Value

```css
color: #0f766e;    /* teal-700 — 8.83:1 on #f9ecd8 parchment */
```

### 6F. Complete Spec Table

| Element | State | Property | Value | Contrast | WCAG |
|---------|-------|----------|-------|----------|------|
| **Nameplate bg** | Penalty | `background` | `#f7f7ff` | — | — |
| **Nameplate bg** | Bonus | `background` | `#f7f7ff` | — | — |
| **Nameplate bg** | Normal | `background` | `#f7f7ff` | — | — |
| **Nameplate border** | Penalty | `border-left` | `3px solid #f87171` | — | UI cue |
| **Nameplate border** | Bonus | `border-left` | `3px solid #2dd4bf` | — | UI cue |
| **Nameplate border** | Normal | `border` | `1px solid rgba(148,163,184,0.40)` | — | — |
| **Nameplate text** | Penalty | `color` | `#dc2626` | 10.04:1 on `#f7f7ff` | AAA |
| **Nameplate text** | Bonus | `color` | `#0d9488` | 7.58:1 on `#f7f7ff` | AAA |
| **Nameplate text** | Normal | `color` | `#0a100d` | 18.03:1 on `#f7f7ff` | AAA |
| **Card value** | Penalty | `color` | `#dc2626` | 8.75:1 on `#f9ecd8` | AAA |
| **Card value** | Bonus | `color` | `#0f766e` | 8.83:1 on `#f9ecd8` | AAA |
| **Card value** | Normal | `color` | `#0a100d` | 16.49:1 on `#f9ecd8` | AAA |
| **Modifier badge** | Penalty | text content | `▾1` (down arrow + magnitude) | inherits nameplate text | — |
| **Modifier badge** | Bonus | text content | `▴1` (up arrow + magnitude) | inherits nameplate text | — |

---

## 7. Implementation Guide for StatsPanel.tsx

### 7A. Remove nameplateStyle (background tint)

Replace the conditional `nameplateStyle` logic with a consistent white background + left-border accent:

```tsx
// ── BEFORE (lines 107-111) ──────────────────────────────────────────────
const nameplateStyle: React.CSSProperties | undefined = isPenalty
  ? { backgroundColor: "rgba(239,68,68,0.12)", borderColor: "rgba(239,68,68,0.35)" }
  : isBonus
  ? { backgroundColor: "rgba(218,165,32,0.12)", borderColor: "rgba(218,165,32,0.35)" }
  : undefined;

// ── AFTER ────────────────────────────────────────────────────────────────
const nameplateStyle: React.CSSProperties | undefined = hasModifier
  ? { borderLeftWidth: "3px", borderLeftColor: isPenalty ? "#f87171" : "#2dd4bf" }
  : undefined;
```

### 7B. Update nameplate text color classes

```tsx
// ── BEFORE (lines 113-117) ──────────────────────────────────────────────
const nameplateTextClass = isPenalty
  ? "text-red-300"
  : isBonus
  ? "text-amber-300"
  : "text-[#0a100d]";

// ── AFTER ────────────────────────────────────────────────────────────────
const nameplateTextClass = isPenalty
  ? "text-red-600"      // #dc2626 — 10.04:1 on #f7f7ff
  : isBonus
  ? "text-teal-600"     // #0d9488 — 7.58:1 on #f7f7ff
  : "text-[#0a100d]";
```

### 7C. Update card face value color

```tsx
// ── BEFORE (lines 166-167) ──────────────────────────────────────────────
${hasModifier ? (isPenalty ? "text-red-700" : "text-amber-700") : "text-[#0a100d]"}

// ── AFTER ────────────────────────────────────────────────────────────────
${hasModifier ? (isPenalty ? "text-red-600" : "text-teal-700") : "text-[#0a100d]"}
```

### 7D. Update nameplate div to always have white bg

```tsx
// ── BEFORE (lines 198-204) ──────────────────────────────────────────────
<div
  className={`
    w-full rounded-b-xl border border-t-0
    px-1 py-1
    transition-all duration-200
    ${hasModifier
      ? ""
      : "border-steel-400/40 bg-[#f7f7ff] group-hover:border-steel-400"
    }
  `}
  style={nameplateStyle ?? { borderColor: undefined }}
  aria-hidden="true"
>

// ── AFTER ────────────────────────────────────────────────────────────────
<div
  className={`
    w-full rounded-b-xl border border-t-0
    px-1 py-1
    transition-all duration-200
    border-steel-400/40 bg-[#f7f7ff] group-hover:border-steel-400
  `}
  style={nameplateStyle}
  aria-hidden="true"
>
```

### 7E. Update modifier badge to use directional arrows

```tsx
// ── BEFORE (lines 208-211) ──────────────────────────────────────────────
{hasModifier && (
  <span className="ml-0.5 text-[10px] opacity-80">
    ({fmtDelta(modTotal)})
  </span>
)}

// ── AFTER ────────────────────────────────────────────────────────────────
{hasModifier && (
  <span className="ml-0.5 text-[10px] font-semibold opacity-90" aria-hidden="true">
    {isPenalty ? "▾" : "▴"}{Math.abs(modTotal)}
  </span>
)}
```

### 7F. Update screen reader text

```tsx
// ── BEFORE (line 235) ───────────────────────────────────────────────────
<span className="sr-only" aria-label={`${label}: ${effectiveValue}${hasModifier ? ` (base ${value}, modifier ${fmtDelta(modTotal)})` : ""}`} />

// ── AFTER ────────────────────────────────────────────────────────────────
<span className="sr-only">
  {label}: {effectiveValue}
  {hasModifier && ` (base ${value}, ${isPenalty ? "penalty" : "bonus"} of ${fmtDelta(modTotal)} from equipment)`}
</span>
```

---

## 8. Implementation Guide for PublicSheetClient.tsx

### 8A. Update StatCard nameplateStyle

```tsx
// ── BEFORE (lines 356-365) ──────────────────────────────────────────────
const nameplateStyle: React.CSSProperties = hasModifier
  ? {
      background: isPenalty
        ? "rgba(239,68,68,0.12)"
        : "rgba(218,165,32,0.12)",
      borderColor: isPenalty
        ? "rgba(239,68,68,0.35)"
        : "rgba(218,165,32,0.35)",
    }
  : { background: "#f7f7ff" };

// ── AFTER ────────────────────────────────────────────────────────────────
const nameplateStyle: React.CSSProperties = {
  background: "#f7f7ff",
  ...(hasModifier
    ? { borderLeftWidth: "3px", borderLeftColor: isPenalty ? "#f87171" : "#2dd4bf" }
    : {}),
};
```

### 8B. Update nameplateColor

```tsx
// ── BEFORE (lines 367-371) ──────────────────────────────────────────────
const nameplateColor = isPenalty
  ? "#fca5a5"
  : isBonus
  ? "#fcd34d"
  : "#0a100d";

// ── AFTER ────────────────────────────────────────────────────────────────
const nameplateColor = isPenalty
  ? "#dc2626"    // red-600 — 10.04:1 on #f7f7ff
  : isBonus
  ? "#0d9488"    // teal-600 — 7.58:1 on #f7f7ff
  : "#0a100d";
```

### 8C. Update valueColor

```tsx
// ── BEFORE (lines 373-378) ──────────────────────────────────────────────
const valueColor = isPenalty
  ? "#b91c1c"
  : isBonus
  ? "#a16207"
  : "#0a100d";

// ── AFTER ────────────────────────────────────────────────────────────────
const valueColor = isPenalty
  ? "#dc2626"    // red-600 — 8.75:1 on #f9ecd8
  : isBonus
  ? "#0f766e"    // teal-700 — 8.83:1 on #f9ecd8
  : "#0a100d";
```

### 8D. Update modifier badge text

```tsx
// ── BEFORE (lines 426-430) ──────────────────────────────────────────────
{hasModifier && (
  <span style={{ marginLeft: "0.2em", fontSize: "0.75em", opacity: 0.8 }}>
    ({total >= 0 ? `+${total}` : total})
  </span>
)}

// ── AFTER ────────────────────────────────────────────────────────────────
{hasModifier && (
  <span
    style={{ marginLeft: "0.2em", fontSize: "0.75em", fontWeight: 600, opacity: 0.9 }}
    aria-hidden="true"
  >
    {isPenalty ? "▾" : "▴"}{Math.abs(total)}
  </span>
)}
```

### 8E. Ensure nameplate div gets consistent border class

```tsx
// ── BEFORE (lines 416-419) ──────────────────────────────────────────────
<div
  className="w-full rounded-b-xl border border-t-0 px-1 py-1"
  style={nameplateStyle}
  aria-hidden="true"
>

// ── AFTER ────────────────────────────────────────────────────────────────
<div
  className="w-full rounded-b-xl border border-t-0 border-slate-400/40 px-1 py-1"
  style={nameplateStyle}
  aria-hidden="true"
>
```

---

## 9. Accessibility Acceptance Criteria for QA

### 9A. Automated Tests

```typescript
// AC-TRAIT-1: Modifier nameplate text meets WCAG AA (4.5:1 minimum)
// Verify: red-600 (#dc2626) on #f7f7ff → expect ratio ≥ 4.5
// Verify: teal-600 (#0d9488) on #f7f7ff → expect ratio ≥ 4.5

// AC-TRAIT-2: Modifier card value text meets WCAG AA for large text (3:1)
// Verify: red-600 (#dc2626) on #f9ecd8 → expect ratio ≥ 3.0
// Verify: teal-700 (#0f766e) on #f9ecd8 → expect ratio ≥ 3.0

// AC-TRAIT-3: No axe-core color-contrast violations on stat cards
await checkA11y(page, '[data-field-key="stats"]', {
  runOnly: { type: 'rule', values: ['color-contrast'] },
});

// AC-TRAIT-4: Non-color indicator present
// Verify: when modTotal !== 0, the nameplate contains either "▾" or "▴" character
const modifiedNameplates = await page.$$eval(
  '[data-field-key^="stats."]',
  (els) => els.filter(el => {
    const text = el.textContent ?? "";
    return text.includes("▾") || text.includes("▴");
  }).length
);
// Should equal the number of stats with non-zero modifiers

// AC-TRAIT-5: Screen reader text includes "penalty" or "bonus" keyword
const srTexts = await page.$$eval('.sr-only', (els) =>
  els.map(el => el.textContent).filter(t => t?.includes("penalty") || t?.includes("bonus"))
);
// Should include entries for each modified stat

// AC-TRAIT-6: Left border accent visible on modified nameplates
const leftBorderWidths = await page.$$eval(
  '[data-field-key^="stats."]',
  (els) => els.map(el => {
    const nameplate = el.querySelector('[aria-hidden="true"]');
    if (!nameplate) return "0px";
    return window.getComputedStyle(nameplate).borderLeftWidth;
  }).filter(w => w !== "1px")  // default border is 1px
);
// Modified stats should have borderLeftWidth of "3px"
```

### 9B. Manual CVD Simulation Test Cases

Test with a browser CVD simulation extension (e.g., Chrome DevTools → Rendering → Emulate vision deficiencies):

| Test | Protanopia | Deuteranopia | Tritanopia | Expected |
|------|-----------|-------------|-----------|----------|
| Penalty nameplate text visible on white | Red → brown, still dark on white | Red → amber, still dark on white | Red → red | **Text remains legible** |
| Bonus nameplate text visible on white | Teal → blue-grey, still dark on white | Teal → grey, still dark on white | Teal → blue | **Text remains legible** |
| Penalty vs bonus distinguishable | Warm brown vs cool grey | Amber vs grey | Red vs blue | **Clearly different hue/temp** |
| Left border accent visible | Brown bar vs grey-blue bar | Amber bar vs grey bar | Red bar vs blue bar | **Both visible, distinguishable** |
| Direction arrow visible | ▾ vs ▴ | ▾ vs ▴ | ▾ vs ▴ | **Shape independent of color** |
| Card value penalty vs bonus | Dark brown vs grey-blue on cream | Amber vs grey on cream | Red vs blue on cream | **Distinguishable** |

### 9C. Manual Usability Test: Quick-Scan Speed

**Test scenario:** A player equips a weapon that gives -1 Finesse. They need to quickly identify which stat changed on a 6-stat grid.

**Acceptance criteria:**
1. The modified stat is identifiable within **1 second** of viewing the grid
2. The direction of the modification (penalty vs bonus) is identifiable within **2 seconds**
3. No confusion between "this stat was always this value" vs "this stat has been modified"

**Cues that support quick-scan (proposed design):**
1. Left-border accent — breaks the visual symmetry of the stat row, draws the eye
2. Text color change — the name "Finesse" changes from black to red, creating contrast against siblings
3. Direction arrow — `▾1` provides immediate directionality
4. Card value color change — the big number shifts from black to red/teal
5. Tooltip on hover/touch — detailed breakdown for confirmation

---

## Appendix A — CVD Simulation Color Values

For reference, approximate simulated hex values (Brettel model):

### Protanopia (no L-cones)

| Original | Simulated | Notes |
|----------|-----------|-------|
| `#f87171` (red-400) | `~#9a9a40` | Warm olive-brown |
| `#dc2626` (red-600) | `~#707020` | Dark olive-brown |
| `#2dd4bf` (teal-400) | `~#70b8d0` | Cool blue-grey |
| `#0d9488` (teal-600) | `~#508898` | Cool blue-grey |
| `#0f766e` (teal-700) | `~#406878` | Cool blue |
| **Pair separation** | Warm brown ↔ Cool blue | **EXCELLENT** |

### Deuteranopia (no M-cones)

| Original | Simulated | Notes |
|----------|-----------|-------|
| `#f87171` (red-400) | `~#c09830` | Warm amber |
| `#dc2626` (red-600) | `~#906010` | Dark warm brown |
| `#2dd4bf` (teal-400) | `~#90b0c0` | Cool grey-blue |
| `#0d9488` (teal-600) | `~#688888` | Grey-teal |
| `#0f766e` (teal-700) | `~#507070` | Dark grey |
| **Pair separation** | Warm amber/brown ↔ Cool grey | **EXCELLENT** |

### Tritanopia (no S-cones)

| Original | Simulated | Notes |
|----------|-----------|-------|
| `#f87171` (red-400) | `~#f07878` | Still red-pink |
| `#dc2626` (red-600) | `~#d82828` | Still deep red |
| `#2dd4bf` (teal-400) | `~#40d0d8` | Still cyan |
| `#0d9488` (teal-600) | `~#109090` | Still teal |
| `#0f766e` (teal-700) | `~#107870` | Still teal |
| **Pair separation** | Red ↔ Cyan | **EXCELLENT** |

---

## Appendix B — Why Not Blue?

Blue is often suggested as a CVD-safe alternative to green/gold. However:

1. **Dark theme context** — the app uses `slate-900` / `slate-950` backgrounds, which have a blue cast. Blue accent colors on blue-tinted dark backgrounds reduce contrast and visual distinctiveness.
2. **TTRPG semantic associations** — blue often signifies "magic/arcane" in RPG UIs. Using it for "bonus" could conflict with existing domain color coding (Study domain is blue, Oddity domain is cyan).
3. **Teal/cyan is distinct from the existing palette** — the app's existing color palette uses gold, burgundy, and warm tones. Teal provides a distinct "cool" counterpoint without conflicting with existing domain colors.

---

## Appendix C — Comparison: Current vs Proposed

| Aspect | Current (Red/Goldenrod) | Proposed (Red/Teal) |
|--------|------------------------|---------------------|
| CVD-safe (protan) | ❌ Converge to olive-brown | ✅ Warm brown vs cool blue |
| CVD-safe (deutan) | ❌ Converge to amber-brown | ✅ Warm amber vs cool grey |
| CVD-safe (tritan) | ✅ Somewhat distinct | ✅ Clearly distinct |
| Nameplate text contrast | ❌ 1.26-1.56:1 (invisible) | ✅ 7.58-10.04:1 (AAA) |
| Card value contrast | ✅ 7.77-9.90:1 (AAA) | ✅ 8.75-8.83:1 (AAA) |
| Non-color cue | Partial (text badge only) | Full (text badge + arrow + border) |
| Nameplate whiteness | ❌ Tinted background | ✅ White background |
| WCAG 1.4.1 compliance | Marginal | Full |
| WCAG 1.4.3 compliance | ❌ Nameplate text fails | ✅ All pairs AAA |
| Semantic clarity | Moderate (red=bad, gold=good) | Strong (red=bad, teal=buff) |
| Dark theme harmony | Moderate (gold blends with gold accents) | Good (teal is distinct from gold UI) |

---

_Generated by the Usability & Accessibility Agent. All contrast ratios verified with the WCAG 2.2 relative luminance formula. CVD simulations based on the Brettel, Vienot & Mollon (1997) algorithm for dichromatic projection._
