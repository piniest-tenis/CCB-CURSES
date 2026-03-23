# Font-Size Accessibility & Usability Audit

**Date:** 2026-03-22  
**Auditor:** Usability & Accessibility Agent  
**Scope:** Full codebase — `/mnt/c/Users/joshu/Repos/CCB-Curses`  
**Standards:** WCAG 2.1 AA, modern responsive typography best practices

---

## Executive Summary

The codebase has a **severe, systemic font-size problem**. The overwhelming majority of text across the application is undersized relative to modern accessibility and usability standards.

| Metric | Count |
|---|---|
| **Total font-size declarations found** | **~780+** |
| **Declarations at `text-[10px]` (critically small)** | **~97** |
| **Declarations at `text-[11px]` (critically small)** | **~49** |
| **Declarations at `text-xs` (12px — below minimum)** | **~230+** |
| **Declarations at `text-sm` (14px — marginal)** | **~280+** |
| **Declarations at `text-base` (16px — acceptable)** | **~21** |
| **Declarations at `text-lg` or larger (acceptable)** | **~100+** |
| **Problematic declarations (below 16px body text)** | **~656+ (~84%)** |

**Root cause:** No base font-size is explicitly set on the `<body>` element (it inherits the browser default of 16px, which is fine), but virtually *all* component-level text overrides that 16px default **downward** — to 14px, 12px, 11px, or even 10px. The result is an application where the most-read content (descriptions, feature text, labels, metadata) sits at 12–14px, and critical interactive elements (form labels, error messages, badges) sit at 10–11px.

---

## Tailwind Size Reference

| Tailwind Class | CSS Value | Pixel Equivalent |
|---|---|---|
| `text-[10px]` | `font-size: 10px` | 10px |
| `text-[11px]` | `font-size: 11px` | 11px |
| `text-xs` | `font-size: 0.75rem` | 12px |
| `text-sm` | `font-size: 0.875rem` | 14px |
| `text-base` | `font-size: 1rem` | 16px |
| `text-lg` | `font-size: 1.125rem` | 18px |
| `text-xl` | `font-size: 1.25rem` | 20px |
| `text-2xl` | `font-size: 1.5rem` | 24px |
| `text-3xl` | `font-size: 1.875rem` | 30px |

## WCAG & Best Practice Minimums

| Element Type | Minimum | Recommended | Notes |
|---|---|---|---|
| Body text / descriptions | 16px (1rem) | 16–18px | Must be comfortable to read without zooming |
| Section labels / metadata | 12px (0.75rem) | 14px+ | Acceptable at 12px ONLY if uppercase + bold + wide tracking |
| Interactive labels (buttons, form labels) | 14px | 16px | WCAG 2.1 1.4.4 — must be resizable; 10px labels fail |
| Error messages | 14px | 16px | Must be immediately noticeable; 10px is dangerously small |
| Badges / tags | 11px | 12px+ | Small inline indicators get a slight pass if bold + uppercase |
| Captions / footnotes | 12px (0.75rem) | 12px | Absolute floor — never go below 12px for any visible text |
| Headings (h1) | 24px (1.5rem) | 30px+ (2rem) | ✅ Current `text-3xl` usage is adequate |
| Headings (h2/h3) | 20px (1.25rem) | 24px (1.5rem) | ✅ Current `text-xl`/`text-2xl` usage is adequate |

---

## Detailed Findings by Severity

### 🔴 CRITICAL — `text-[10px]` Declarations (97 instances)

**10px text is unacceptable for any user-facing content.** It falls 37.5% below the WCAG minimum for body text and is unreadable for users with even mild vision impairment. It is the single most urgent fix.

| File | Lines (sample) | Element Purpose | Current | Recommended | Rationale |
|---|---|---|---|---|---|
| **CharacterSheet.tsx** | 400, 411, 425, 468 | Section labels ("Level", "Class", "Ancestry", "Community") | `text-[10px]` | `text-xs` (12px) | These are section headers — critical navigation landmarks on the sheet |
| **CharacterSheet.tsx** | 453, 459, 485, 500, 570 | Domain card chips, subclass label, cost labels | `text-[10px]` | `text-xs` (12px) | Content the player needs to read during play |
| **CharacterSheet.tsx** | 699, 759, 789, 821, 872 | Feature recall-cost badges | `text-[10px]` | `text-[11px]` or `text-xs` | Badges can be slightly smaller but 10px is below floor |
| **CharacterSheet.tsx** | 381 | Tooltip text | `text-[10px]` | `text-xs` (12px) | Tooltips must be readable |
| **CharacterSheet.tsx** | 138, 155, 192 | — | `text-[11px]` | `text-xs` (12px) | Sidebar section legends |
| **TrackersPanel.tsx** | 805, 810, 878, 908, 913, 920 | Weapon/armor type badges, guidance text | `text-[10px]` | `text-xs` (12px) | Game rule text must be legible |
| **DomainLoadout.tsx** | 184, 185, 261, 323, 638, 645, 648, 904, 909, 913, 914, 962, 963 | Card domain name, level, curse/linked indicators | `text-[10px]` | `text-xs` (12px) | Domain cards are core gameplay — unreadable metadata defeats purpose |
| **LevelUpWizard.tsx** | 612, 629, 647, 654, 671 | **Form labels** ("First stat", "Second stat", "First experience") | `text-[10px]` | `text-sm` (14px) | **Form labels at 10px is a WCAG failure.** Labels must be clearly readable |
| **LevelUpWizard.tsx** | 647 | **Error message** ("Must select two different stats") | `text-[10px]` | `text-sm` (14px) | **Error messages at 10px is dangerous UX.** Users will miss them |
| **LevelUpWizard.tsx** | 776, 810, 1010, 1013, 1016, 1019 | Slot count, MC/Cursed/Linked/Grimoire badges | `text-[10px]` | `text-xs` (12px) | Status indicators must be scannable |
| **LevelUpWizard.tsx** | 1409, 1613, 1621, 1632, 1639, 1661 | Summary section labels | `text-[10px]` | `text-xs` (12px) | Information architecture labels |
| **WeaponSelectionPanel.tsx** | 243, 248, 338, 343, 389 | Weapon type badges, stat labels | `text-[10px]` | `text-xs` (12px) | Equipment badges during character creation |
| **ArmorSelectionPanel.tsx** | 130, 177, 258, 317 | Armor type badges, stat labels | `text-[10px]` | `text-xs` (12px) | Equipment badges during character creation |
| **CharacterBuilderPageClient.tsx** | 523, 1267, 1296 | Step hints, section headers, sidebar descriptions | `text-[10px]` | `text-xs` (12px) | Builder navigation text |
| **ClassDetailClient.tsx** | 61 | Level indicator labels | `text-[10px]` | `text-xs` (12px) | Reference information |
| **LoadingInterstitial.tsx** | 278, 293, 326 | "Lore & Legend" label, title, "Loading" label | `text-[10px]` | `text-xs` (12px) | Decorative but still visible text |
| **admin/characters/page.tsx** | 99 | Admin tab labels | `text-[10px]` | `text-xs` (12px) | Admin interface text |

### 🔴 CRITICAL — `text-[11px]` Declarations (49 instances)

**11px text is below the absolute 12px floor.** While only 1px above 10px, it still fails to meet minimum readability standards.

| File | Lines (sample) | Element Purpose | Current | Recommended | Rationale |
|---|---|---|---|---|---|
| **TrackersPanel.tsx** | 348, 365, 375, 382, 401, 404, 469, 606, 741, 758, 794, 798, 1037, 1054, 1087, 1091 | **Section headings, form labels, guidance text, body descriptions** | `text-[11px]` | `text-xs` (12px) min, `text-sm` (14px) for labels | The Trackers panel is used *during gameplay* — every pixel matters for quick scanning |
| **DomainLoadout.tsx** | 383, 389, 460, 483, 486, 490, 495, 500, 798, 818 | Status messages, card type badges, body text | `text-[11px]` | `text-xs` (12px) for badges, `text-sm` (14px) for body text | Loadout text players read repeatedly during sessions |
| **LevelUpWizard.tsx** | 253, 311, 370, 425, 815, 1205, 1459 | Step descriptions, option descriptions | `text-[11px]` | `text-sm` (14px) | Level-up descriptions are instructional — must be easily read by new players |
| **CharacterSheet.tsx** | 138, 155, 192 | Sidebar section legends | `text-[11px]` | `text-xs` (12px) | Sidebar navigation headings |

### 🟠 WARNING — `text-xs` (12px) Declarations (~230 instances)

**12px text is at the absolute floor.** It is acceptable *only* for secondary metadata with uppercase + bold + wide tracking. For body text, descriptions, or interactive content it is too small.

**Context matters here:** Many of these are used for section labels with `uppercase tracking-wider font-semibold`, which is the one scenario where 12px is defensible. However, a significant number are used for:

- **Feature descriptions** (body text) — should be `text-sm` (14px) minimum
- **Error validation messages** — should be `text-sm` (14px) minimum
- **Form labels** — should be `text-sm` (14px) minimum
- **Interactive back-navigation links** — should be `text-sm` (14px) minimum
- **Informational content the player needs to read** — should be `text-sm` (14px) minimum

| Pattern | Files | Instances | Current | Recommended |
|---|---|---|---|---|
| Body/description text at `text-xs` | Builder, DomainCardSelection, Weapon/ArmorSelection, multiple components | ~60 | `text-xs` (12px) | `text-sm` (14px) |
| Form labels at `text-xs` | auth/register, auth/login, builder panels | ~20 | `text-xs` (12px) | `text-sm` (14px) |
| Error messages at `text-xs` | auth/register, auth/login, ValidationDisplay | ~10 | `text-xs` (12px) | `text-sm` (14px) |
| Interactive links at `text-xs` | admin/characters, dashboard, builder nav | ~15 | `text-xs` (12px) | `text-sm` (14px) |
| Section header labels (uppercase + bold + tracking) | All components | ~80 | `text-xs` (12px) | ✅ Acceptable as-is |
| Badge/tag text (uppercase + bold) | Domain cards, equipment panels | ~45 | `text-xs` (12px) | ✅ Acceptable as-is |

### 🟡 CAUTION — `text-sm` (14px) Declarations (~280 instances)

**14px is marginal.** It is acceptable for secondary content but should not be the *primary* body text size. The current codebase uses `text-sm` as its de facto body text — this is 2px below the modern recommended minimum of 16px.

| Pattern | Files | Instances | Current | Recommended |
|---|---|---|---|---|
| **Primary body/description text** | CharacterBuilder, WeaponSelection, ArmorSelection, DomainCardSelection, ClassDetail, DomainDetail, MarkdownContent rendered descriptions | ~120 | `text-sm` (14px) | `text-base` (16px) |
| **Form input text** | auth/login, auth/register, builder inputs | ~15 | `text-sm` (14px) | `text-base` (16px) |
| **Error/alert text** | auth pages, builder, dashboard | ~10 | `text-sm` (14px) | `text-base` (16px) |
| **Button text** | auth pages, builder, dashboard | ~20 | `text-sm` (14px) | `text-base` (16px) |
| Secondary metadata / supportive text | Various | ~115 | `text-sm` (14px) | ✅ Acceptable as-is for secondary content |

### ✅ ACCEPTABLE — `text-base` (16px) and Larger

Only **~21 instances** of `text-base` were found across the entire frontend codebase, and **~100 instances** of `text-lg` or larger. The larger sizes are used appropriately for headings (`text-xl`, `text-2xl`, `text-3xl`). The problem is that `text-base` — the **recommended default body size** — is barely used at all.

---

## Most Affected Components (by severity)

### 1. CharacterSheet.tsx — 🔴🔴🔴
The most-used view in the application. Contains **~25 instances of `text-[10px]`** and **~4 instances of `text-[11px]`**. Players look at this screen during every game session. Section labels, domain card metadata, subclass names, and feature costs are all at 10px — essentially invisible to users with impaired vision.

### 2. TrackersPanel.tsx — 🔴🔴🔴
The real-time game panel for damage, weapons, and armor. Contains **~12 instances of `text-[10px]`** and **~16 instances of `text-[11px]`**. Damage threshold labels, weapon/armor guidance text, and section headers are all critically undersized.

### 3. LevelUpWizard.tsx — 🔴🔴🔴
Used at every level-up. Contains **~20 instances of `text-[10px]`** and **~8 instances of `text-[11px]`**. **Form labels and error messages at 10px is a direct WCAG 2.1 failure** (Success Criteria 1.4.4, 3.3.2).

### 4. DomainLoadout.tsx — 🔴🔴
Core gameplay component. Contains **~15 instances of `text-[10px]`** and **~12 instances of `text-[11px]`**. Card metadata, curse indicators, and status messages are undersized.

### 5. CharacterBuilderPageClient.tsx — 🔴🔴
The entire character creation flow. Uses `text-sm` (14px) as its primary body text and `text-xs` (12px) for nearly all labels and metadata. The builder is where *new players* spend the most time — it should be the most readable part of the application.

### 6. Auth Pages (login, register) — 🟠
Form labels at `text-xs` (12px), error messages at `text-xs` (12px), input text at `text-sm` (14px). All should be bumped up by one size step.

---

## Specific WCAG 2.1 AA Violations

| WCAG Criterion | Violation | Instances |
|---|---|---|
| **1.4.4 Resize Text** | Text set in absolute `px` values (`text-[10px]`, `text-[11px]`) cannot scale with user font-size preferences | ~146 |
| **1.4.12 Text Spacing** | 10–11px text with `tracking-wider`/`tracking-widest` leaves inadequate whitespace per-character | ~60 |
| **3.3.2 Labels or Instructions** | Form labels at 10px are functionally invisible to low-vision users | ~8 |
| **3.3.1 Error Identification** | Error messages at 10–12px may be missed entirely | ~15 |

---

## Recommendations

### Strategy: Introduce a Design Token System

Rather than fixing 780+ individual class declarations, the recommended approach is:

#### Phase 1 — Establish a Type Scale in `tailwind.config.ts`

Add semantic font-size utility classes via `@layer utilities` in `globals.css` or extend the Tailwind theme:

```css
/* globals.css — @layer utilities */
@layer utilities {
  /* Body text — readable default */
  .type-body { @apply text-base leading-relaxed; }           /* 16px */
  .type-body-sm { @apply text-sm leading-relaxed; }          /* 14px — secondary only */
  
  /* Labels — uppercase section headers */
  .type-label { @apply text-xs font-semibold uppercase tracking-wider; }  /* 12px — OK for labels */
  .type-label-sm { @apply text-[11px] font-bold uppercase tracking-[0.2em]; } /* 11px — floor for uppercase labels */
  
  /* UI elements — buttons, form labels, interactive text */
  .type-ui { @apply text-base font-medium; }                 /* 16px */
  .type-ui-sm { @apply text-sm font-medium; }                /* 14px — minimum for interactive */
  
  /* Caption — absolute minimum */
  .type-caption { @apply text-xs; }                          /* 12px — never go below */
  
  /* Badges — small inline indicators */
  .type-badge { @apply text-[11px] font-bold uppercase tracking-wider; }  /* 11px — acceptable for bold uppercase badges */
}
```

#### Phase 2 — Component-Level Fixes (Priority Order)

**P0 — Fix immediately (WCAG violations):**

1. **LevelUpWizard.tsx** — Change all form `<label>` elements from `text-[10px]` → `text-sm` (14px)
2. **LevelUpWizard.tsx** — Change error messages from `text-[10px]` → `text-sm` (14px)
3. **Auth pages** — Change form labels from `text-xs` → `text-sm` (14px)
4. **Auth pages** — Change error messages from `text-xs` → `text-sm` (14px)
5. **Auth pages** — Change input text from `text-sm` → `text-base` (16px)

**P1 — Fix in next sprint (core gameplay readability):**

6. **CharacterSheet.tsx** — Change section labels from `text-[10px]` → `text-xs` (12px)
7. **TrackersPanel.tsx** — Change section labels from `text-[11px]` → `text-xs` (12px); body text from `text-[11px]` → `text-sm` (14px)
8. **DomainLoadout.tsx** — Change card metadata from `text-[10px]` → `text-xs` (12px); body text from `text-[11px]` → `text-sm` (14px)
9. **All components** — Change primary body/description text from `text-sm` → `text-base` (16px)

**P2 — Fix over time (polish):**

10. **Builder panels** — Change description text from `text-sm` → `text-base` (16px)
11. **MarkdownContent** consumers — Ensure wrapper `className` uses `text-base` not `text-sm` for primary descriptions
12. **Dashboard** — Ensure character card text is at least `text-sm` (14px)
13. **CMS admin** — Apply same minimum standards

#### Phase 3 — Eliminate All Arbitrary Sub-12px Values

**Search & replace globally:**
- `text-[10px]` → `text-xs` (minimum) with case-by-case evaluation
- `text-[11px]` → `text-xs` (minimum) with case-by-case evaluation
- No pixel value below 12px should exist in the codebase

---

## Additional Typography Recommendations

### Line Height

The `globals.css` sets `line-height: 1.6` on `body`, which is good. However, many Tailwind classes override this with `leading-none` (1.0) or `leading-tight` (1.25) on small text, which compounds the readability problem.

**Recommendation:** For any text below 16px, enforce `leading-relaxed` (1.625) or `leading-normal` (1.5) minimum. Never use `leading-none` or `leading-tight` on body text or descriptions.

### Letter Spacing

The codebase correctly uses `tracking-wider` and `tracking-widest` on uppercase labels, which is good practice for small uppercase text. However, at 10–11px even generous tracking isn't enough — the characters are simply too small to render crisply on most screens.

### Font Choice Considerations

The body font is `ibarra-real-nova` (a serif-adjacent font from Adobe Typekit). Serif and semi-serif fonts generally require *larger* sizes for comfortable reading than sans-serif fonts, particularly on screens. This amplifies the undersizing problem.

**Recommendation:** If `ibarra-real-nova` is retained as the body font, body text should be at least **17–18px** (`text-lg`) to account for the font's narrower x-height and thinner strokes compared to system sans-serif fonts.

### Contrast with Small Text

Small text requires *higher* contrast ratios than large text. WCAG 2.1 AA requires:
- **4.5:1** for normal text (< 18px / < 14px bold)
- **3:1** for large text (≥ 18px / ≥ 14px bold)

Many of the `text-[10px]` and `text-[11px]` declarations use opacity modifiers (`text-[#b9baa3]/40`, `/50`, `/60`) which further reduce contrast on the already-small text. This double penalty (small + low-contrast) is the worst possible combination for accessibility.

**Recommendation:** For any text below 14px, ensure contrast ratio is at least **7:1** (WCAG AAA for normal text) to compensate for the small size. Never apply opacity below `/70` to text smaller than 14px.

---

## Implementation Instructions for Front-End Engineer

### Quick Win — Global Minimum via CSS

Add to `globals.css` inside `@layer base`:

```css
/* Establish a minimum readable font-size for all non-decorative text.
   This is a safety net — component-level sizes should still be set properly. */
body {
  font-size: 16px;  /* Already the browser default, but make it explicit */
  line-height: 1.6;
}
```

### Search & Replace Guide

Execute these Tailwind class replacements across the `frontend/src/` directory. Each should be reviewed in context — some `text-[10px]` on `aria-hidden="true"` decorative elements can remain.

| Search | Replace | Scope | Notes |
|---|---|---|---|
| `text-[10px]` on `<label>` elements | `text-sm` | All files | WCAG violation — form labels must be readable |
| `text-[10px]` on error/alert messages | `text-sm` | All files | WCAG violation — errors must be noticeable |
| `text-[10px]` on uppercase section labels | `text-xs` | All files | Minimum bump — uppercase+bold makes 12px acceptable |
| `text-[10px]` on badges/tags | `text-[11px]` | All files | Absolute floor for bold uppercase badges |
| `text-[10px]` on body/description text | `text-xs` minimum, `text-sm` preferred | All files | Body text should never be below 12px |
| `text-[11px]` on body/description text | `text-sm` | All files | Body text should be at least 14px |
| `text-[11px]` on section labels | `text-xs` | All files | Uppercase+bold labels acceptable at 12px |
| `text-xs` on body/description text | `text-sm` | Feature descriptions, MarkdownContent wrappers | Primary readable content needs 14px+ |
| `text-sm` on primary body text | `text-base` | MarkdownContent, class/domain descriptions | Main content deserves 16px |
| `text-sm` on form inputs | `text-base` | Auth pages, builder inputs | Inputs should be 16px (also prevents iOS zoom) |
| `text-sm` on buttons | `text-base` | Auth pages, builder buttons | Interactive elements need prominence |

### iOS Zoom Prevention Bonus

Inputs with `font-size` below 16px trigger automatic zoom on iOS Safari. The codebase already has `text-base sm:text-sm` on some inputs (WeaponSelectionPanel, ArmorSelectionPanel), which is the right pattern — but it should be extended to ALL input elements. Currently, auth form inputs are `text-sm` on all breakpoints, which will cause zoom on iOS.

### Testing Checklist

After implementing changes:

- [ ] Verify no text anywhere in the app is below 12px
- [ ] Verify all form labels are at least 14px
- [ ] Verify all error messages are at least 14px
- [ ] Verify all primary body text is at least 16px
- [ ] Verify all interactive button text is at least 14px
- [ ] Test on iPhone SE (smallest common viewport) — no text should require zooming
- [ ] Test with browser zoom at 200% — layout should not break
- [ ] Test with OS-level large text settings — text should respond
- [ ] Run axe-core or Lighthouse accessibility audit — no font-size violations

---

## Files Affected (Complete List)

### Frontend — Critical (10px/11px violations)
- `frontend/src/components/character/CharacterSheet.tsx`
- `frontend/src/components/character/TrackersPanel.tsx`
- `frontend/src/components/character/LevelUpWizard.tsx`
- `frontend/src/components/character/DomainLoadout.tsx`
- `frontend/src/components/character/WeaponSelectionPanel.tsx`
- `frontend/src/components/character/ArmorSelectionPanel.tsx`
- `frontend/src/app/character/[id]/build/CharacterBuilderPageClient.tsx`
- `frontend/src/app/classes/[classId]/ClassDetailClient.tsx`
- `frontend/src/app/admin/characters/page.tsx`
- `frontend/src/components/LoadingInterstitial.tsx`

### Frontend — Warning (text-xs/text-sm as body text)
- `frontend/src/components/character/StartingEquipmentPanel.tsx`
- `frontend/src/components/character/DomainCardSelectionPanel.tsx`
- `frontend/src/components/character/CollapsibleSRDDescription.tsx`
- `frontend/src/components/character/TraitAssignmentPanel.tsx`
- `frontend/src/components/character/ValidationDisplay.tsx`
- `frontend/src/components/character/StatsPanel.tsx`
- `frontend/src/components/character/PortraitUpload.tsx`
- `frontend/src/components/character/EquipmentPanel.tsx`
- `frontend/src/components/character/EditSidebar.tsx`
- `frontend/src/components/character/DowntimeProjectsPanel.tsx`
- `frontend/src/components/character/DowntimeModal.tsx`
- `frontend/src/components/character/CompanionPanel.tsx`
- `frontend/src/components/character/CharacterValidationBanner.tsx`
- `frontend/src/components/character/ArmorValidationDisplay.tsx`
- `frontend/src/components/character/ActionButton.tsx`
- `frontend/src/components/character/LoadoutValidationIndicator.tsx`
- `frontend/src/app/auth/login/page.tsx`
- `frontend/src/app/auth/register/page.tsx`
- `frontend/src/app/auth/forgot-password/page.tsx`
- `frontend/src/app/auth/confirm/page.tsx`
- `frontend/src/app/auth/callback/page.tsx`
- `frontend/src/app/dashboard/page.tsx`
- `frontend/src/app/classes/page.tsx`
- `frontend/src/app/domains/page.tsx`
- `frontend/src/app/domains/[domain]/page.tsx`
- `frontend/src/app/domains/[domain]/DomainDetailClient.tsx`
- `frontend/src/app/character/[id]/view/SharedViewClient.tsx`
- `frontend/src/app/character/[id]/CharacterPageClient.tsx`
- `frontend/src/app/page.tsx`

### CMS — Warning (text-xs/text-sm patterns)
- `cms/src/components/Nav.tsx`
- `cms/src/components/ImageUploader.tsx`
- `cms/src/components/CmsItemForm.tsx`
- `cms/src/components/CmsItemCard.tsx`
- `cms/src/components/AuthGate.tsx`
- `cms/src/app/splash/page.tsx`
- `cms/src/app/page.tsx`
- `cms/src/app/interstitial/page.tsx`
- `cms/src/app/help/page.tsx`
- `cms/src/app/auth/callback/page.tsx`

### Configuration
- `frontend/tailwind.config.ts` — No custom font-size scale defined
- `frontend/src/app/globals.css` — No base font-size rule
- `cms/tailwind.config.js` — No custom font-size scale defined
- `cms/src/app/globals.css` — No base font-size rule

---

## Conclusion

This is not a minor polish issue — it is a fundamental readability and accessibility problem that affects every screen in the application. The good news is that the fix is mechanical: a systematic bump of font-size classes across components, guided by the priority list above. The most impactful improvement would be:

1. **Eliminate all `text-[10px]`** — no exceptions for visible text
2. **Promote `text-sm` to `text-base`** as the default body text size
3. **Promote `text-xs` to `text-sm`** for all non-label, non-badge content

These three changes alone would transform the application from "squinting to read" to "comfortable and modern."
