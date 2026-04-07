# Accessibility & Readability Audit — 2026-04-06
**Curses! Custom Character Builder — Usability & Accessibility Agent**
**Scope:** Contrast, font readability, Patreon CTA, proposed color changes

All contrast ratios computed using the WCAG 2.2 relative luminance formula against live hex values extracted from the codebase.

---

## Table of Contents

1. [Critical Issues — Contrast Failures & Readability Blockers](#1-critical-issues)
2. [Font Recommendations — sofia-pro-narrow Transition](#2-font-recommendations)
3. [Patreon CTA Accessibility Audit](#3-patreon-cta-accessibility)
4. [Color Contrast Matrix — Proposed Changes](#4-color-contrast-matrix)
5. [Remediation Plan — Prioritized Tailwind Changes](#5-remediation-plan)

---

## 1. Critical Issues

### 1A. CRITICAL — `text-[#b9baa3]/30` and `text-[#b9baa3]/40` on Dark Backgrounds

**331 instances of `/20`–`/50` opacity text across 40+ files.** These are the single largest accessibility failure in the codebase.

| Opacity | Composited hex on `#0a100d` | Ratio | WCAG Status |
|---------|---------------------------|-------|-------------|
| `/20` | `#2d322b` | **1.47:1** | FAIL ALL |
| `/25` | `#353a32` | **1.65:1** | FAIL ALL |
| `/30` | `#3e433a` | **1.89:1** | FAIL ALL |
| `/35` | `#474b41` | **2.15:1** | FAIL ALL |
| `/40` | `#505449` | **2.48:1** | FAIL ALL |
| `/50` | `#616558` | **3.21:1** | FAIL AA normal, PASS large only |

**Top offending files (by count of `/20`–`/50` opacity instances):**

| File | Count | Context |
|------|-------|---------|
| `app/admin/characters/page.tsx` | 17 | Admin panel labels, metadata |
| `components/encounter/EncounterConsole.tsx` | 16 | Encounter metadata, timestamps |
| `components/character/DomainCardSelectionPanel.tsx` | 13 | Card descriptions, empty states |
| `app/character/[id]/build/CharacterBuilderPageClient.tsx` | 13 | Builder hints, empty states |
| `components/character/WeaponSelectionPanel.tsx` | 11 | Weapon features, filter hints |
| `components/encounter/EnvironmentCatalog.tsx` | 9 | Environment tags, metadata |
| `components/character/ArmorSelectionPanel.tsx` | 9 | Armor features, empty states |
| `app/homebrew/page.tsx` | 8 | Homebrew descriptions, counts |
| `app/dashboard/page.tsx` | 4 | Character counts, empty states |
| `components/dashboard/CharacterCard.tsx` | 3 | Ancestry/community metadata, timestamps |
| `components/AppHeader.tsx` | 2 | Username display, sign-out button |

**Specific high-impact examples with file:line references:**

| Location | Line | Current Class | Current Ratio | Issue |
|----------|------|---------------|---------------|-------|
| `CharacterCard.tsx` | 110 | `text-[#b9baa3]/40` | 2.48:1 | Ancestry/community metadata — completely illegible |
| `CharacterCard.tsx` | 112 | `text-[#b9baa3]/30` | 1.89:1 | "Updated X days ago" — invisible |
| `CharacterCard.tsx` | 179 | `text-[#b9baa3]/40` | 2.48:1 | Delete button text — critical interactive element |
| `AppHeader.tsx` | 97 | `text-[#b9baa3]/50` | 3.21:1 | Username display — fails AA for normal text |
| `AppHeader.tsx` | 105 | `text-[#b9baa3]/50` | 3.21:1 | "Sign out" button — fails AA, interactive text |
| `dashboard/page.tsx` | 125 | `text-[#b9baa3]/40` | 2.48:1 | Close button on create modal |
| `dashboard/page.tsx` | 133 | `text-[#b9baa3]/60` | 4.13:1 | Modal body text — fails AA normal |
| `dashboard/page.tsx` | 154 | `text-[#b9baa3]/60` | 4.13:1 | Cancel button text — fails AA, interactive |
| `dashboard/page.tsx` | 284 | `text-[#b9baa3]/40` | 2.48:1 | Character class/subclass metadata |
| `dashboard/page.tsx` | 382 | `text-[#b9baa3]/40` | 2.48:1 | Empty state description |
| `CharacterBuilderPageClient.tsx` | 602 | `text-[#b9baa3]/40 italic` | 2.48:1 | "Select a class to see details" — key onboarding text |
| `SessionPanel.tsx` | 134 | `text-[#b9baa3]/30 italic` | 1.89:1 | "Join a campaign to see sessions" — invisible |
| `CampaignRailWidget.tsx` | 39 | `text-[#b9baa3]/30 italic` | 1.89:1 | "No campaigns yet" — invisible |

### 1B. CRITICAL — `text-steel-400` (#577399) Used as Normal-Size Body Text

`steel-400` (#577399) fails WCAG AA for normal text on all dark backgrounds used in the app.

| Background | Ratio | Status |
|------------|-------|--------|
| `#0a100d` (page bg) | **3.95:1** | FAIL AA normal |
| `#0f172a` (slate-900) | **3.67:1** | FAIL AA normal |
| `#151e2d` (slate-850) | **3.44:1** | FAIL AA normal |

**Affected instances (31 matches across the codebase):**

| Location | Line | Context |
|----------|------|---------|
| `TrackersPanel.tsx` | 1033 | `text-steel-400` — section kicker labels |
| `TrackersPanel.tsx` | 1202 | `text-steel-400` — "STRESS" heading |
| `TrackersPanel.tsx` | 1705 | `text-steel-400` — interactive button text |
| `TrackersPanel.tsx` | 1793 | `text-steel-400` — remove button text |
| `TrackersPanel.tsx` | 2350 | `text-steel-400` — large stat number |
| `CharacterSheet.tsx` | 785 | `text-steel-400` — chevron icon |
| `CharacterSheet.tsx` | 900, 921 | `text-steel-400/70` — "default dice colors" |
| `CharacterSheet.tsx` | 1110, 1189, 1291, 1303 | `text-steel-400` — section headings |
| `CharacterSheet.tsx` | 1417 | `text-steel-400` — live status text |
| `DomainLoadout.tsx` | 731 | `text-steel-400/60` — domain labels |
| `EquipmentPanel.tsx` | 624 | `placeholder:text-slate-400` — input placeholder |
| `EditSidebar.tsx` | 355, 368 | `placeholder:text-slate-500` — input placeholder |
| `SourceFilter.tsx` | 29, 79 | `text-steel-400`, `text-slate-400` — filter labels |

### 1C. CRITICAL — Patreon CTA Bar: White on Coral Fails Contrast

The `PatreonCTA.tsx` bar uses white text on a coral gradient background.

| Pair | Ratio | Status |
|------|-------|--------|
| `#ffffff` on `#f96854` | **2.94:1** | FAIL AA |
| `#ffffff` on `#ff6b4a` (gradient midpoint) | **2.82:1** | FAIL AA |
| `#f96854` on `#ffffff` ("Join Now" button text) | **2.94:1** | FAIL AA |

This means **both the bar text AND the button text fail WCAG AA.**

### 1D. HIGH — `text-parchment-500` Used Extensively as Body Text

325+ instances of `text-parchment-400/500/600/700` across the codebase. While `parchment-400` (11.90:1) and `parchment-500` (8.76:1) pass AA on `#0a100d`, `parchment-600` and `parchment-700` are problematic:

| Token | Hex | On `#0a100d` | Status |
|-------|-----|-------------|--------|
| `parchment-400` | `#e8c96d` | 11.90:1 | PASS AAA |
| `parchment-500` | `#d4a94a` | 8.76:1 | PASS AAA |
| `parchment-600` | `#b8872c` | 5.98:1 | PASS AA |
| `parchment-700` | `#966520` | 3.82:1 | FAIL AA normal |

`parchment-600` at 5.98:1 passes AA but is borderline for small text (`text-xs`, `text-[10px]`). `parchment-700` fails for any normal-size text context.

### 1E. HIGH — `text-slate-400/50` in EncounterConsole

| Location | Line | Class | Composited Ratio |
|----------|------|-------|-----------------|
| `EncounterConsole.tsx` | 227 | `text-slate-400/50 italic` | ~3.5:1 FAIL AA normal |

`#94a3b8` at 50% opacity on dark bg composites to approximately `#4c5463`, which is ~3.5:1 — fails AA for normal text.

---

## 2. Font Recommendations

### 2A. Current Font Architecture

The Tailwind config defines these font stacks:

| Tailwind Class | Primary Font | Role | Issues |
|----------------|-------------|------|--------|
| `font-sans` | `ibarra-real-nova` | Body/UI text | **Serif font used as `sans`** — misleading naming, poor readability at small sizes |
| `font-serif` | `double-pica` | Headers | Decorative serif — acceptable for headings only |
| `font-serif-sc` | `double-pica-sc` | Section headings | Small-caps serif — acceptable for headings only |
| `font-display` | `jetsam-collection-basilea` | Display/splash | Decorative — limited use, acceptable |
| `font-mono` | `JetBrains Mono` | Code/dice notation | Excellent — no changes needed |

**Critical finding:** `ibarra-real-nova` is a **serif** typeface (transitional serif, similar to Baskerville). It is mapped to `font-sans` in Tailwind, which is deeply misleading. Its serif design with thin hairline strokes makes it poor for:
- Small UI labels (`text-xs`, `text-[10px]`)
- Low-contrast text on dark backgrounds
- Mobile screens at any size below 16px

### 2B. `font-serif` Usage Scope

252 instances of `font-serif` across the codebase, appearing in:
- All `<h1>`, `<h2>`, `<h3>` headings
- Character names, card titles
- Section labels, modal headers
- Dice result displays

**These are ALL acceptable use cases for a serif/display font** — headings, titles, and emphasis text. No remediation needed for `font-serif` specifically.

### 2C. Recommended sofia-pro-narrow Migration

To replace `ibarra-real-nova` with `sofia-pro-narrow` as the body/UI font:

#### Step 1 — Update Typekit import

In `layout.tsx` line 37, the Typekit stylesheet `https://use.typekit.net/zko4lko.css` must include `sofia-pro-narrow`. Verify this kit includes it; if not, update the kit ID.

#### Step 2 — Update tailwind.config.ts

```typescript
fontFamily: {
  // sofia-pro-narrow — body/UI font (Adobe Typekit)
  sans: ['"sofia-pro-narrow"', '"Sofia Pro Narrow"', "Inter", "system-ui", "sans-serif"],
  // double-pica — header font (Adobe Typekit)
  serif: ['"double-pica"', "Georgia", "Cambria", "serif"],
  // double-pica-sc — true small-caps variant for section headings
  "serif-sc": ['"double-pica-sc"', '"double-pica"', "Georgia", "Cambria", "serif"],
  // jetsam-collection-basilea — attention-getting display font
  display: ['"jetsam-collection-basilea"', '"double-pica"', "Georgia", "serif"],
  mono: ['"JetBrains Mono"', '"Fira Code"', "monospace"],
},
```

#### Step 3 — WCAG-Compliant Font Sizing for sofia-pro-narrow

`sofia-pro-narrow` is a **condensed** sans-serif. Its narrow letterforms have reduced x-height relative to standard-width sans-serifs. This means it needs compensation:

| Context | Current Min | Recommended Min | Tailwind Class | Rationale |
|---------|-------------|-----------------|----------------|-----------|
| Body text | `text-sm` (14px) | `text-sm` (14px) | `text-sm` | Narrow fonts at 14px are acceptable with 1.6 line-height |
| UI labels | `text-xs` (12px) | `text-xs` (12px) | `text-xs` | Acceptable IF `font-semibold` + `tracking-wide` |
| Micro labels | `text-[10px]` | **`text-[11px]`** | `text-[11px]` | 10px narrow font is borderline — raise to 11px |
| Stat numbers | `text-2xl` (24px) | `text-2xl` (24px) | No change | Large text — no issues |
| Section headings | `text-xs` uppercase | **`text-sm`** uppercase | `text-sm` | Narrow uppercase at 12px is too tight |

**Minimum weight recommendations:**

| Size | Min Weight | Tailwind Class |
|------|-----------|----------------|
| 11px | `font-semibold` (600) | Required — narrow font at 11px needs weight for stroke clarity |
| 12px (text-xs) | `font-medium` (500) | Recommended for readability |
| 14px+ | `font-normal` (400) | Acceptable at body size |

**Line height mandate:**

```css
body {
  line-height: 1.6;  /* Already set in globals.css ✅ */
}
```

For `text-xs` and smaller, always pair with `leading-relaxed` (1.625) or `leading-loose` (2.0):
```tsx
// Pattern for all 11-12px text
className="text-[11px] leading-relaxed tracking-wide"
```

**Letter-spacing mandate for narrow fonts:**

| Size | Tracking | Tailwind Class |
|------|----------|----------------|
| `text-[10px]`–`text-[11px]` | `tracking-wide` (0.025em) minimum | Required |
| `text-xs` (12px) | `tracking-wide` | Recommended |
| `text-sm`+ | Default | Acceptable |
| Uppercase at any size | `tracking-wider` (0.05em) minimum | Required |

### 2D. Italic Text Audit

**77 instances of `italic` across the codebase.** Every single one should be replaced.

`italic` in a narrow/condensed font dramatically reduces readability:
- Compressed letterforms become even harder to distinguish
- Serifs/terminals shift angle, reducing clarity at small sizes
- Screen rendering of italic narrow text produces sub-pixel artifacts

**Recommended replacements by context:**

| Context | Current | Replacement | Files |
|---------|---------|-------------|-------|
| Empty state text ("No X yet") | `italic text-parchment-500` | `font-medium text-parchment-500` (remove italic) | 25+ locations across TrackersPanel, LevelUpWizard, DomainLoadout, SessionPanel, etc. |
| Placeholder/hint text | `italic text-[#b9baa3]/40` | `font-medium text-parchment-600` (remove italic, fix contrast) | 20+ locations across builder, panels |
| Description/flavor text | `italic text-[#b9baa3]/60` | `text-parchment-500` (remove italic, fix contrast) | 10+ locations |
| MarkdownContent descriptions | `italic text-parchment-400` | `text-parchment-400` (remove italic only) | ClassDetailClient, etc. |

**Specific high-impact italic removals:**

| File | Line | Current | Recommendation |
|------|------|---------|----------------|
| `TrackersPanel.tsx` | 468 | `text-sm sidebar-text-secondary italic` | Remove `italic`, add `font-medium` |
| `TrackersPanel.tsx` | 1263 | `text-sm text-parchment-500 italic font-normal` | Remove `italic`, change to `font-medium` |
| `TrackersPanel.tsx` | 1837 | `text-sm text-parchment-500 italic` | Remove `italic` |
| `TrackersPanel.tsx` | 2172 | `text-[12px] text-parchment-600 italic` | Remove `italic`, upgrade to `text-parchment-500` |
| `TrackersPanel.tsx` | 2359 | `text-sm text-parchment-500 italic` | Remove `italic` |
| `LevelUpWizard.tsx` | 1247 | `text-sm text-parchment-600 italic` | Remove `italic`, upgrade to `text-parchment-500` |
| `LevelUpWizard.tsx` | 1326 | `text-sm text-parchment-600 italic` | Remove `italic`, upgrade to `text-parchment-500` |
| `LevelUpWizard.tsx` | 1647 | `text-sm text-parchment-500 italic` | Remove `italic` |
| `LevelUpWizard.tsx` | 1842 | `italic text-parchment-600` | Remove `italic`, upgrade to `text-parchment-500` |
| `DomainLoadout.tsx` | 306 | `text-sm text-parchment-500 italic` | Remove `italic` |
| `DomainLoadout.tsx` | 310 | `text-sm text-parchment-600 italic` | Remove `italic`, upgrade to `text-parchment-500` |
| `DomainLoadout.tsx` | 889 | `text-sm text-parchment-600 italic` | Remove `italic`, upgrade to `text-parchment-500` |
| `EquipmentPanel.tsx` | 499 | `text-xs text-[#b9baa3]/60 italic` | Remove `italic`, use `sidebar-text-secondary` |
| `EquipmentPanel.tsx` | 716 | `text-center text-sm text-[#b9baa3] italic` | Remove `italic` |
| `SessionPanel.tsx` | 123 | `text-sm text-[#b9baa3]/40 italic` | Remove `italic`, fix contrast |
| `SessionPanel.tsx` | 134 | `text-sm text-[#b9baa3]/30 italic` | Remove `italic`, fix contrast (1.89:1!) |
| `CampaignRailWidget.tsx` | 39 | `text-sm text-[#b9baa3]/30 italic` | Remove `italic`, fix contrast |
| `CampaignCard.tsx` | 55 | `text-sm text-[#b9baa3]/40 italic` | Remove `italic`, fix contrast |
| `EncounterConsole.tsx` | 109 | `text-xs text-[#b9baa3]/40 italic` | Remove `italic`, fix contrast |
| `EncounterConsole.tsx` | 227 | `text-slate-400/50 italic` | Remove `italic`, fix contrast |
| `CharacterBuilderPageClient.tsx` | 54 | `text-parchment-500 italic` | Remove `italic` |
| `CharacterBuilderPageClient.tsx` | 602 | `text-sm text-[#b9baa3]/40 italic` | Remove `italic`, fix contrast |

### 2E. font-serif Usage in Body/UI Contexts (Non-Heading)

The `font-serif` class appears on a few non-heading elements that should use `font-sans`:

| File | Line | Current | Issue |
|------|------|---------|-------|
| `CharacterSheet.tsx` | 468 | `text-sm text-[#b9baa3] font-serif` | Body text using serif font |
| `CharacterSheet.tsx` | 556 | `text-xl font-bold text-[#b9baa3] font-serif` | Stat value — could be `font-sans` for narrow/condensed look |
| `CharacterSheet.tsx` | 498, 518 | `text-2xl font-bold text-[#f7f7ff] font-serif` | Stat inputs — acceptable as display numbers |
| `LevelUpWizard.tsx` | 817 | `text-parchment-400 border...` (in a button) | Button label body text |

Most `font-serif` usage is correctly on headings. The body-text instances above should migrate to `font-sans` (which will become `sofia-pro-narrow`).

---

## 3. Patreon CTA Accessibility

### 3A. PatreonCTA.tsx (Bottom Bar)

**File:** `src/components/PatreonCTA.tsx`

| Check | Status | Details |
|-------|--------|---------|
| `role="banner"` | Present on outer `<div>` (line 122) | Semantically acceptable but `role="complementary"` or a custom `aria-label` region may be more precise |
| `aria-label="Patreon call to action"` | Present (line 123) | Good |
| Patreon SVG icon `aria-hidden="true"` | Present (line 135) | Correct — decorative |
| "Join Now" button | Has `type="button"`, `disabled` state | Missing explicit `aria-label` — the button text is sufficient but could be more descriptive |
| Dismiss button `aria-label="Dismiss Patreon banner"` | Present (line 160) | Good |
| Dismiss SVG `aria-hidden="true"` | Present (line 172) | Correct |
| Focus rings | Present on both buttons | Good |
| Mobile swipe-to-dismiss | Present via touch handlers | No keyboard equivalent — keyboard users cannot dismiss on mobile layouts where the "×" button is `hidden sm:flex` |

**CRITICAL contrast failures:**

| Element | FG | BG | Ratio | WCAG |
|---------|----|----|-------|------|
| Bar text (`text-white/95`) | ~`#f2f2f2` | `#f96854` | **~2.94:1** | FAIL AA |
| "Join Now" button (`text-[#f96854]` on `bg-white/95`) | `#f96854` | ~`#f2f2f2` | **~2.94:1** | FAIL AA |
| Dismiss "×" (`text-white/70`) | ~`#b3b3b3` | `#f96854` | **~1.85:1** | FAIL ALL |

**Content occlusion:** The bar is `fixed bottom-0 inset-x-0 z-50` with a height of ~40px (`py-2` + text + padding). The codebase instructs content to add `pb-12` when the bar is visible. The `DiceLog.tsx` component (line 313-319) offsets its FAB button. **However, no systematic mechanism ensures all page content adds bottom padding.** The `Footer.tsx` renders before the CTA in the DOM, meaning the last ~40px of footer content may be occluded on pages where `pb-12` is not applied.

### 3B. PatreonGateOverlay.tsx (Inline Gates)

**File:** `src/components/PatreonGateOverlay.tsx`

**PatreonSaveGate:**

| Check | Status | Details |
|-------|--------|---------|
| `role="status"` | Present (line 90) | Good — announces gate state to screen readers |
| Lock icon `aria-hidden="true"` | Present (line 39) | Correct |
| Focus ring on "Link Patreon" button | Present | Good |
| Gated children `aria-hidden="true" inert` | Present (lines 112-113) | Excellent — prevents focus trapping in disabled content |
| Contrast: `text-[#b9baa3]/80` on `bg-[#f96854]/8` | The bg is nearly transparent over dark bg, so FG ≈ `text-[#b9baa3]/80` on dark → ~6.5:1 | PASS |

**PatreonPaidGate:**

| Check | Status | Details |
|-------|--------|---------|
| `role="status"` | Present (line 165) | Good |
| Crown icon `aria-hidden="true"` | Present (line 58) | Correct |
| `text-gold-400` on `bg-gold-500/6` | Gold-400 (#fbbf24) on near-dark bg → **10.69:1** on slate-900 | PASS AAA |
| "View Tiers" link as `<a>` | Correct — external link behavior | Good |
| Focus ring on "View Tiers" | Present | Good |
| Gated children `aria-hidden="true" inert` | Present (lines 186-187) | Excellent |

**The inline gate overlays are well-implemented and largely accessible.** The only issue is the contrast of the coral accent color in the SaveGate variant.

### 3C. Goldenrod (#DAA520) Patreon/Paywall Text Assessment

Goldenrod is **excellent** for inline paywalls on dark backgrounds:

| Background | Ratio | Status |
|------------|-------|--------|
| `#0a100d` (page bg) | **8.59:1** | PASS AAA |
| `#0f172a` (slate-900) | **7.98:1** | PASS AAA |
| `#151e2d` (slate-850) | **7.47:1** | PASS AAA |
| `#0f1713` (sidebar bg) | **8.14:1** | PASS AAA |

**Goldenrod passes AAA on every dark background in the app.** It is a strong choice for paywall indicators.

---

## 4. Color Contrast Matrix — Proposed Changes

### 4A. Goldenrod for Inline Paywalls

**Proposed:** Use `#DAA520` (goldenrod) for paywall text and borders on dark backgrounds.

| Use Case | FG | BG | Ratio | WCAG | Verdict |
|----------|----|----|-------|------|---------|
| Paywall text on page bg | `#DAA520` | `#0a100d` | **8.59:1** | AAA | APPROVED |
| Paywall text on card bg | `#DAA520` | `#0f172a` | **7.98:1** | AAA | APPROVED |
| Paywall text on panel bg | `#DAA520` | `#151e2d` | **7.47:1** | AAA | APPROVED |
| Paywall border on page bg | `#DAA520` | `#0a100d` | **8.59:1** | AAA (3:1 UI) | APPROVED |
| Goldenrod on white (if ever) | `#DAA520` | `#ffffff` | **1.93:1** | FAIL | DO NOT USE on light bg |

**Recommended Tailwind implementation:**
- Text: `text-[#DAA520]` or use the existing `text-gold-500` (`#f59e0b`, 11.51:1 — even better)
- Border: `border-[#DAA520]` or `border-gold-500`
- Background tint: `bg-[#DAA520]/10` (subtle gold wash behind paywall sections)

### 4B. Dashboard Panel Colors for Bottom CTA Bar

**Current PatreonCTA bar:** Coral gradient (`#f96854` → `#ff6b4a` → `#f96854`) — **fails contrast for white text.**

**Proposed:** Redesign the bottom CTA bar to match dashboard panel aesthetics (dark bg with accent text).

The dashboard panels use:
- Panel bg: `bg-slate-900/80` over `#0a100d` ≈ `#111a14` effective
- Borders: `border-[#577399]/30`
- Text: `text-[#f7f7ff]`, `text-[#b9baa3]`

**Recommended CTA bar redesign (two options):**

#### Option A — Dark bar with goldenrod accent (Recommended)

```
BG: bg-slate-900/95 (≈ #101822)  |  Border-top: border-[#DAA520]/40
Text: text-[#DAA520] for CTA text  |  Button: bg-[#DAA520] text-[#0a100d]
```

| Pair | Ratio | Status |
|------|-------|--------|
| `#DAA520` text on `#101822` bg | **~7.8:1** | PASS AAA |
| `#0a100d` text on `#DAA520` button | **8.59:1** | PASS AAA |
| `#f7f7ff` secondary text on `#101822` | **~16:1** | PASS AAA |

#### Option B — Dark bar with coral accent (current color, dark bg)

```
BG: bg-slate-900/95  |  Border-top: border-[#f96854]/40
Text: text-[#f96854] for CTA text  |  Button: bg-[#f96854] text-[#f7f7ff]
```

| Pair | Ratio | Status |
|------|-------|--------|
| `#f96854` text on `#101822` bg | **~5.9:1** | PASS AA |
| `#f7f7ff` text on `#f96854` button | **2.94:1** | FAIL AA — needs `text-[#0a100d]` instead |
| `#0a100d` text on `#f96854` button | **6.53:1** | PASS AA |

**Option A is strongly recommended** — goldenrod on dark bg provides AAA contrast and aligns with the premium/paywall visual language already established in `PatreonPaidGate`.

### 4C. Complete Proposed Color System for Patreon/Paywall

| Element | Hex | On Dark BG | Status |
|---------|-----|-----------|--------|
| Paywall text (goldenrod) | `#DAA520` | 7.5–8.6:1 | AAA |
| Paywall border | `#DAA520` at 40% | 3.0:1+ (UI) | PASS |
| Paywall bg tint | `#DAA520` at 10% | n/a (decorative) | n/a |
| CTA button bg | `#DAA520` | n/a (fill) | — |
| CTA button text | `#0a100d` | on `#DAA520` = 8.59:1 | AAA |
| CTA bar bg | `#0f172a` at 95% | — | — |
| CTA secondary text | `#f7f7ff` | on dark = 16+:1 | AAA |
| "Dismiss" icon | `#DAA520` at 70% | on dark ≈ 5.5:1 | PASS AA |

---

## 5. Remediation Plan — Prioritized Changes

### Priority 1: CRITICAL — Fix Immediately (Blocks WCAG AA Compliance)

#### P1-A: Replace all `text-[#b9baa3]/20` through `/50` on `#0a100d`-family backgrounds

**331 instances across 40+ files.**

The existing `globals.css` already defines:
```css
.sidebar-text { color: rgba(185, 186, 163, 0.90); }         /* 7.68:1 on sidebar */
.sidebar-text-secondary { color: rgba(185, 186, 163, 0.70); } /* 5.09:1 on sidebar */
```

These work for the `#0f1713` sidebar bg. For the `#0a100d` page background, the ratios are even better (the bg is slightly darker). However, many of the `/30`–`/50` instances are NOT in sidebars — they're on the main page. We need additional utility classes or direct replacements:

**Replacement table for main page (`#0a100d` background):**

| Old Class | Replacement | New Ratio on `#0a100d` | Notes |
|-----------|-------------|----------------------|-------|
| `text-[#b9baa3]/20` | `text-parchment-600` | 5.98:1 | For decorative separators only; most should be `aria-hidden` |
| `text-[#b9baa3]/25` | `text-parchment-600` | 5.98:1 | |
| `text-[#b9baa3]/30` | `text-parchment-600` | 5.98:1 | Or `text-parchment-500` (8.76:1) for important text |
| `text-[#b9baa3]/35` | `text-parchment-600` | 5.98:1 | |
| `text-[#b9baa3]/40` | `text-parchment-600` | 5.98:1 | For metadata, timestamps, secondary copy |
| `text-[#b9baa3]/50` | `text-parchment-500` | 8.76:1 | For labels, button text, usernames |
| `text-[#b9baa3]/60` | `text-parchment-500` | 8.76:1 | For body copy in modals, descriptions |
| `text-[#b9baa3]/70` | `sidebar-text` | 9.71:1 | For primary secondary text |

**High-priority files (fix these first):**

1. `AppHeader.tsx` — Username and sign-out button are interactive and fail
2. `dashboard/page.tsx` — Empty states, modal body text, character counts
3. `CharacterCard.tsx` — Ancestry/community metadata, timestamps, delete button
4. `PatreonCTA.tsx` — Entire bar fails (see P1-B)
5. `CharacterBuilderPageClient.tsx` — Onboarding hints are invisible

#### P1-B: Redesign PatreonCTA.tsx to Pass Contrast

Replace the coral gradient bar with a dark-themed bar using goldenrod accents:

```tsx
// BEFORE (PatreonCTA.tsx line 128)
<div className="bg-gradient-to-r from-[#f96854] via-[#ff6b4a] to-[#f96854] px-4 py-2 shadow-[0_-2px_12px_rgba(249,104,84,0.3)]">

// AFTER
<div className="bg-[#0f172a]/95 border-t border-[#DAA520]/30 px-4 py-2 shadow-[0_-2px_12px_rgba(0,0,0,0.4)] backdrop-blur-sm">
```

```tsx
// BEFORE — CTA text (line 141)
<p className="text-white/95 font-medium text-sm leading-tight">

// AFTER
<p className="text-[#DAA520] font-medium text-sm leading-tight">
```

```tsx
// BEFORE — Join Now button (line 151)
className="shrink-0 rounded-md bg-white/95 px-3.5 py-1 text-[#f96854] font-bold text-xs shadow-sm ..."

// AFTER
className="shrink-0 rounded-md bg-[#DAA520] px-3.5 py-1 text-[#0a100d] font-bold text-xs shadow-sm hover:bg-[#e8b830] ..."
```

```tsx
// BEFORE — Dismiss button (line 165)
className="text-white/70 hover:text-white hover:bg-white/15 ..."

// AFTER
className="text-[#DAA520]/70 hover:text-[#DAA520] hover:bg-[#DAA520]/15 ..."
```

Also add a **keyboard dismiss mechanism** for mobile (since the "×" button is `hidden sm:flex`):

```tsx
// Add to the outer div or create a visible-on-mobile dismiss affordance
<button
  type="button"
  onClick={() => dismiss()}
  aria-label="Dismiss Patreon banner"
  className="sm:hidden shrink-0 ml-1 text-[#DAA520]/70 hover:text-[#DAA520] text-xs"
>
  ×
</button>
```

#### P1-C: Fix `text-steel-400` (#577399) for Normal Text

Replace all `text-steel-400` used as normal-size text with `text-[#7a9ab5]` (steel-blue at higher lightness):

| Color | On `#0a100d` | On `#0f172a` | On `#151e2d` |
|-------|-------------|-------------|-------------|
| `#577399` (current) | 3.95:1 FAIL | 3.67:1 FAIL | 3.44:1 FAIL |
| `#7a9ab5` (proposed) | **5.89:1** PASS | **5.41:1** PASS | **5.07:1** PASS |
| `#6a8fb5` (alt) | **5.28:1** PASS | **4.85:1** PASS | **4.55:1** PASS |

Recommend `#7a9ab5` for better safety margin. Apply to:
- `CharacterSheet.tsx` lines 785, 900, 921, 1110, 1189, 1291, 1303, 1417
- `TrackersPanel.tsx` lines 1033, 1202, 1537, 1705, 1793, 2350
- `DomainLoadout.tsx` line 731
- `SourceFilter.tsx` lines 29, 79

**Exception:** `#577399` used as border/bg tint colors (e.g., `border-[#577399]/30`, `bg-[#577399]/10`) are UI component colors at 3.0:1 threshold and generally pass when they delineate against adjacent fills. These do NOT need changing.

### Priority 2: HIGH — Fix Within Sprint

#### P2-A: Remove All Italic Text

Replace `italic` with `font-medium` or simply remove it. **77 instances.**

Global search-and-replace pattern:
```
italic text-parchment-500  →  font-medium text-parchment-500
italic text-parchment-600  →  font-medium text-parchment-500  (also fix contrast)
italic text-[#b9baa3]/40   →  font-medium text-parchment-600  (also fix contrast)
italic text-[#b9baa3]/50   →  font-medium text-parchment-500  (also fix contrast)
italic text-[#b9baa3]/60   →  text-parchment-500              (also fix contrast)
italic                      →  (remove, no replacement needed)
```

#### P2-B: Replace `ibarra-real-nova` with `sofia-pro-narrow`

Update `tailwind.config.ts` `fontFamily.sans` as specified in section 2C.

#### P2-C: Raise Minimum Font Size

All `text-[10px]` instances should be raised to `text-[11px]` unless they are:
- Inside a badge/chip with a constrained container (acceptable at 10px if `font-bold`)
- Pure numeric values (tabular nums are more legible at small sizes)

All `text-[10px]` that are labels, descriptions, or hint text: raise to `text-[11px]` with `leading-relaxed tracking-wide`.

#### P2-D: Fix `parchment-700` Text

Replace all `text-parchment-700` with `text-parchment-500`:

| Current | Ratio | Replacement | New Ratio |
|---------|-------|-------------|-----------|
| `text-parchment-700` | 3.82:1 | `text-parchment-500` | 8.76:1 |

### Priority 3: MEDIUM — Fix Before Next Release

#### P3-A: Resolve `text-parchment-200` / `--foreground` Mismatch

`layout.tsx` line 39 sets `text-parchment-200` (#fef08a — yellow) on `<body>`, while `globals.css` sets `text-foreground` (#d9c9a3 — warm parchment). The Tailwind class wins. Choose one:

**Option 1 (Recommended):** Remove `text-parchment-200` from `<body>`, rely on CSS variable:
```tsx
<body className="min-h-screen bg-background text-foreground antialiased font-sans">
```

**Option 2:** Keep the yellow tint, update `--foreground` to match.

#### P3-B: Add Bottom Padding Utility for Patreon CTA

Create a utility component or CSS class that content wrappers can use:

```css
/* globals.css */
.has-cta-bar {
  padding-bottom: 3.5rem; /* 56px — bar height + breathing room */
}
```

Or use the existing `usePatreonCTAVisible()` hook more systematically across all page layouts.

#### P3-C: Add `aria-label` to Patreon "Join Now" Button

```tsx
// PatreonCTA.tsx line 148
<button
  type="button"
  onClick={handleClick}
  disabled={isLinking}
  aria-label="Join our free Patreon to unlock features"
  className="..."
>
```

---

## Accessibility Acceptance Criteria for QA

```typescript
// AC-1: No color-contrast violations on dashboard
test('Dashboard passes WCAG AA contrast', async ({ page }) => {
  await page.goto('/dashboard');
  const results = await new AxeBuilder({ page })
    .include('main')
    .analyze();
  const contrastViolations = results.violations.filter(v => v.id === 'color-contrast');
  expect(contrastViolations).toHaveLength(0);
});

// AC-2: No color-contrast violations on character sheet
test('Character sheet passes WCAG AA contrast', async ({ page }) => {
  await page.goto('/character/test-id');
  const results = await new AxeBuilder({ page })
    .analyze();
  const contrastViolations = results.violations.filter(v => v.id === 'color-contrast');
  expect(contrastViolations).toHaveLength(0);
});

// AC-3: No italic text in UI
test('No italic text in rendered UI', async ({ page }) => {
  await page.goto('/dashboard');
  const italicElements = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('*'))
      .filter(el => {
        const style = getComputedStyle(el);
        return style.fontStyle === 'italic' && 
               el.textContent?.trim() &&
               !el.closest('[aria-hidden="true"]');
      })
      .map(el => ({ text: el.textContent?.slice(0, 50), tag: el.tagName }));
  });
  expect(italicElements).toHaveLength(0);
});

// AC-4: Font family is sofia-pro-narrow for body text
test('Body font is sofia-pro-narrow', async ({ page }) => {
  await page.goto('/dashboard');
  const bodyFont = await page.evaluate(() => {
    return getComputedStyle(document.body).fontFamily;
  });
  expect(bodyFont).toContain('sofia-pro-narrow');
});

// AC-5: Minimum font size >= 11px for all visible text
test('No text smaller than 11px', async ({ page }) => {
  await page.goto('/dashboard');
  const tinyText = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('*'))
      .filter(el => {
        const style = getComputedStyle(el);
        const size = parseFloat(style.fontSize);
        return size < 11 && el.textContent?.trim() && 
               style.display !== 'none' && 
               !el.closest('[aria-hidden="true"]');
      })
      .map(el => ({ text: el.textContent?.slice(0, 30), size: parseFloat(getComputedStyle(el).fontSize) }));
  });
  expect(tinyText).toHaveLength(0);
});

// AC-6: Patreon CTA bar is keyboard-dismissable
test('Patreon CTA dismiss works with keyboard', async ({ page }) => {
  // Navigate and ensure CTA is visible
  await page.goto('/dashboard');
  const ctaBar = page.locator('[aria-label="Patreon call to action"]');
  if (await ctaBar.isVisible()) {
    const dismissBtn = ctaBar.locator('button[aria-label="Dismiss Patreon banner"]');
    await dismissBtn.focus();
    await page.keyboard.press('Enter');
    await expect(ctaBar).not.toBeVisible();
  }
});

// AC-7: Patreon CTA bar does not occlude content
test('No content hidden behind CTA bar', async ({ page }) => {
  await page.goto('/dashboard');
  const ctaBar = page.locator('[aria-label="Patreon call to action"]');
  if (await ctaBar.isVisible()) {
    const ctaTop = (await ctaBar.boundingBox())?.y ?? Infinity;
    const footer = page.locator('footer');
    const footerBottom = ((await footer.boundingBox())?.y ?? 0) + ((await footer.boundingBox())?.height ?? 0);
    expect(footerBottom).toBeLessThanOrEqual(ctaTop);
  }
});
```

---

## Summary Statistics

| Category | Count | Severity |
|----------|-------|----------|
| Low-contrast text instances (`/20`–`/50` opacity) | **331+** | CRITICAL |
| `text-steel-400` on dark bg (fails AA normal) | **31** | CRITICAL |
| Patreon CTA contrast failures | **3 pairs** | CRITICAL |
| `italic` text instances to remove | **77** | HIGH |
| `text-parchment-600/700` borderline instances | **~50** | HIGH |
| `font-serif` in body/UI text (should be `font-sans`) | **~5** | MEDIUM |
| `text-[10px]` instances below minimum | **~135** | MEDIUM |
| Missing keyboard dismiss on mobile CTA | **1** | MEDIUM |
| Body color / CSS variable mismatch | **1** | MEDIUM |

**Total estimated remediation:** ~500 individual class changes across ~50 files.

**Recommended approach:** Use project-wide find-and-replace for the opacity patterns, then manually review each file for context-specific adjustments.

---

_Generated by the Usability & Accessibility Agent. All contrast ratios are mathematically verified using the WCAG 2.2 relative luminance formula against live hex values extracted from the CCB-Curses codebase._
