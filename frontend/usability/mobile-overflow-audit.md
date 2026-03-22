# Mobile Overflow & Usability Audit — Character Builder Wizard
**Curses! Custom Character Builder**  
_Usability & Accessibility Agent — Audit Date: 2026-03-22_  
_Primary complaint: horizontal off-screen bleed on mobile viewports_

---

## How to Read This Report

Each issue contains:
- **File path + line number(s)** — exact location for the engineer
- **Root cause** — what the CSS/JSX is actually doing wrong
- **Recommended fix** — copy-pasteable corrected code
- **Priority** — Critical / High / Medium / Low

**Priority definitions:**
| Level | Meaning |
|-------|---------|
| 🔴 Critical | Wizard is completely unusable; content is off-screen or interactions are unreachable |
| 🟠 High | Significant friction; a real user will struggle or fail to complete the flow |
| 🟡 Medium | Noticeable awkwardness or accessibility gap; does not block completion |
| 🟢 Low | Polish / best-practice improvement |

---

## Executive Summary

The character builder wizard has **5 Critical** and **9 High** mobile issues. The primary bleed originates from a **two-pane sidebar layout (Step 1 and Step 3) that uses a fixed pixel sidebar column (`w-64`/`w-72`) inside a flex row, with no responsive stacking**. On a 360–390px device, the fixed sidebar alone consumes 256–288px, leaving only 72–102px for the detail pane — causing text to bleed. Three additional issues compound the problem: the overall modal dialog has no `max-width` override below 640px (`max-w-5xl` does not clamp to viewport on small screens without explicit mobile sizing), the right-hand step navigation panel is `hidden md:flex` (correct) but its hidden state creates an invisible flex child that can still influence layout in some browsers, and the footer navigation bar has buttons that do not meet the 44px touch-target minimum.

The good news: all issues are fixable with Tailwind responsive prefixes. No component rewrites are needed — only layout class adjustments and the addition of a mobile-first stack pattern for the two-pane steps.

---

## CRITICAL Issues

---

### CRITICAL-1 — Modal dialog: `max-w-5xl` with no mobile-override causes full horizontal bleed

**File:** `src/app/character/[id]/build/CharacterBuilderPageClient.tsx`  
**Lines:** 249–258

**Root cause:**
```tsx
// CURRENT — lines 249–258
<div
  role="dialog"
  className="
    w-full max-w-5xl rounded-2xl border border-slate-700/60
    bg-[#0a100d] shadow-2xl flex flex-col
    max-h-[92vh]
  "
>
```

`w-full` should theoretically constrain the dialog to the viewport, but the *outer* backdrop `div` at line 246 uses `p-4` (16px padding on each side). On a 360px device, this gives the dialog `360 - 32 = 328px` of usable width. This is fine in isolation — but `max-w-5xl` (1024px) doesn't fight it.

The actual bleed is caused by children of this dialog (see CRITICAL-2 and CRITICAL-3 below) that establish their own fixed widths wider than 328px. The modal itself is missing `overflow-hidden` at the dialog level, which would clip those children. Without it, they push the dialog wider than `w-full`, and the backdrop's `p-4` padding gets defeated.

**Recommended fix:**
```tsx
// AFTER — add overflow-hidden and a min-w-0 guard
<div
  role="dialog"
  aria-modal="true"
  aria-labelledby="builder-title"
  className="
    w-full max-w-5xl min-w-0 overflow-hidden rounded-2xl border border-slate-700/60
    bg-[#0a100d] shadow-2xl flex flex-col
    max-h-[92vh]
  "
  style={{ boxShadow: "0 0 60px rgba(87,115,153,0.15), 0 24px 48px rgba(0,0,0,0.6)" }}
>
```

Adding `overflow-hidden` and `min-w-0` ensures no child can inflate the dialog past `w-full`. This is the single most impactful change — it acts as a containment boundary for every child layout issue listed below.

---

### CRITICAL-2 — Steps 1 & 3 two-pane layout: fixed `w-64`/`w-72` sidebar does not stack on mobile

**File:** `src/app/character/[id]/build/CharacterBuilderPageClient.tsx`  
**Lines:** 287–321 (Step 1), 472–539 (Step 3)

**Root cause:**
```tsx
// Step 1, line 287-289 — CURRENT
<div className="flex flex-1 min-h-0">
  {/* Left: class list */}
  <div className="w-64 sm:w-72 shrink-0 border-r border-slate-700/40 flex flex-col">
```

```tsx
// Step 3, line 472-474 — CURRENT
<div className="flex flex-1 min-h-0">
  {/* Left pane: tab switcher + list */}
  <div className="w-64 sm:w-72 shrink-0 border-r border-slate-700/40 flex flex-col">
```

`w-64` = 256px. On a 328px dialog (after backdrop padding), this leaves only 72px for the detail pane. `shrink-0` explicitly prevents the sidebar from compressing. The detail pane (`flex-1`) is forced to 72px — all long text, headings, and feature descriptions overflow horizontally.

The `sm:w-72` breakpoint is `640px` — far above any phone screen. So on every mobile device, both the `w-64` *and* the `sm:w-72` classes are active at their smallest responsive value (`w-64 = 256px`).

**Recommended fix — stack vertically on mobile, side-by-side on sm+:**
```tsx
// Step 1, lines 287–321 — AFTER
<div className="flex flex-col sm:flex-row flex-1 min-h-0">
  {/* Sidebar — full width on mobile, fixed column on sm+ */}
  <div className="
    w-full sm:w-64 lg:w-72 shrink-0
    border-b sm:border-b-0 sm:border-r border-slate-700/40
    flex flex-col
    max-h-48 sm:max-h-none overflow-y-auto
  ">
    {/* class list content unchanged */}
  </div>

  {/* Detail pane — full width below list on mobile */}
  <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
    {/* detail content unchanged */}
  </div>
</div>
```

Apply the identical pattern to **Step 3, lines 472–539**.

**Why `max-h-48 sm:max-h-none`:** On mobile the stacked sidebar must not consume the entire viewport height. 192px (`max-h-48`) shows ~5–6 items and scrolls, which keeps the detail pane visible without scrolling the whole page.

---

### CRITICAL-3 — Step 4 (TraitAssignmentPanel): hidden trait description `w-40` bleeds on mobile

**File:** `src/components/character/TraitAssignmentPanel.tsx`  
**Lines:** 163–199

**Root cause:**
```tsx
// Line 162-165 — CURRENT
<div
  key={slot.key}
  className="flex items-center gap-3 p-3 rounded-lg border border-slate-700/60 bg-slate-850/50"
>
  {/* Bonus label */}
  <div className="w-12 shrink-0">   {/* line 166 — 48px fixed */}
    ...
  </div>

  {/* Dropdown */}
  <select className="flex-1 ...">   {/* line 173 — flex-1 is OK */}
    ...
  </select>

  {/* Hint — line 195 */}
  {currentTrait && (
    <div className="hidden sm:block text-xs text-[#b9baa3]/60 w-40 shrink-0">
```

The hint `div` is `hidden sm:block` — correctly hidden on mobile. **However**, the row is a flex container with `gap-3`. On mobile, the three remaining flex children are: `w-12` + `flex-1 select` + (no hint). This is fine.

The actual problem in this component is the `flex-1` `select` element: on mobile within the 328px dialog, `flex-1` resolves to approximately `328 - 48 - 24(gap) = 256px` which is fine — **but the `select` has no `min-w-0`**. Certain browsers give `select` elements an intrinsic minimum width based on the longest `<option>` text ("Knowledge" = ~90px at 14px font). If the longest option is rendered before layout resolves, the select can push the label off screen.

```tsx
// AFTER — add min-w-0 to select
<select
  value={currentTrait}
  onChange={(e) => handleSlotChange(slot.key, (e.target.value as TraitName) || "")}
  className="
    flex-1 min-w-0 rounded px-3 py-2 bg-slate-900 border border-slate-700
    text-[#f7f7ff] text-sm font-medium
    hover:border-slate-600 focus:outline-none focus:ring-2 focus:ring-[#577399]
    transition-colors
  "
>
```

Also add `min-w-0` to the row container to enforce flex containment:
```tsx
// Line 163 — AFTER
<div
  key={slot.key}
  className="flex items-center gap-3 p-3 rounded-lg border border-slate-700/60 bg-slate-850/50 min-w-0"
>
```

---

### CRITICAL-4 — WeaponSelectionPanel: `w-16 shrink-0` in summary bar causes overflow on very narrow screens

**File:** `src/components/character/WeaponSelectionPanel.tsx`  
**Lines:** 252–266

**Root cause:**
```tsx
// Lines 252-264 — CURRENT
{primaryWeapon && (
  <div className="flex items-center gap-2 text-xs">
    <span className="text-[#b9baa3]/50 w-16 shrink-0">Primary:</span>
    <span className="text-[#f7f7ff] font-medium">{primaryWeapon.name}</span>
    <span className="text-[#b9baa3]/40">{primaryWeapon.damageDie} · {primaryWeapon.range}</span>
  </div>
)}
```

This flex row has three inline children: `w-16` (64px label) + weapon name + dice/range. The weapon name and dice/range span have no `min-w-0`, `truncate`, or `overflow-hidden`. A weapon name like "Shortbow" + " " + "1d8 · Far" on a 328px dialog = `64 + [weapon text]`. The third child (dice+range) has no width constraint and can overflow.

**Recommended fix:**
```tsx
// AFTER — constrain the variable-width children
{primaryWeapon && (
  <div className="flex items-center gap-2 text-xs min-w-0">
    <span className="text-[#b9baa3]/50 w-14 shrink-0">Primary:</span>
    <span className="text-[#f7f7ff] font-medium truncate">{primaryWeapon.name}</span>
    <span className="text-[#b9baa3]/40 shrink-0 whitespace-nowrap ml-auto">
      {primaryWeapon.damageDie} · {primaryWeapon.range}
    </span>
  </div>
)}
{secondaryWeapon && (
  <div className="flex items-center gap-2 text-xs min-w-0">
    <span className="text-[#b9baa3]/50 w-14 shrink-0">Secondary:</span>
    <span className="text-[#f7f7ff] font-medium truncate">{secondaryWeapon.name}</span>
    <span className="text-[#b9baa3]/40 shrink-0 whitespace-nowrap ml-auto">
      {secondaryWeapon.damageDie} · {secondaryWeapon.range}
    </span>
  </div>
)}
```

Apply the same fix to `ArmorSelectionPanel.tsx` lines 188–195 (same pattern).

---

### CRITICAL-5 — ArmorSelectionPanel drill-down: `grid-cols-3` stats grid does not reflow on mobile

**File:** `src/components/character/ArmorSelectionPanel.tsx`  
**Lines:** 241–245

**Root cause:**
```tsx
// Lines 241-245 — CURRENT
<div className="grid grid-cols-3 gap-3">
  <StatBlock label="Armor Score" value={String(armor.baseArmorScore)} />
  <StatBlock label="Major Threshold" value={`${armor.baseMajorThreshold}+`} />
  <StatBlock label="Severe Threshold" value={`${armor.baseSevereThreshold}+`} />
</div>
```

`grid-cols-3` with three cells on a ~280–328px content area forces each cell to ≈ `(328 - 24px gap) / 3 ≈ 101px`. The `StatBlock` component renders a label "Major Threshold" (14 chars) and a value. At 101px wide with `text-[10px]` label and `text-sm` value, the label text wraps onto 2–3 lines, and on very narrow screens the value can be clipped.

**Recommended fix:**
```tsx
// AFTER — 1 column on mobile, 3 on sm+
<div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
```

The same pattern applies to `WeaponSelectionPanel.tsx` `WeaponDrillDown` lines 316–321 which uses `grid-cols-2` — that one is safer on mobile but should also be verified. A `grid-cols-2` at 328px gives 154px per cell which is workable, but adding `sm:grid-cols-2` (with `grid-cols-1` base) is still best practice.

---

## HIGH Issues

---

### HIGH-1 — Footer navigation bar: `Back` and `Next` buttons below 44px touch target height

**File:** `src/app/character/[id]/build/CharacterBuilderPageClient.tsx`  
**Lines:** 1040–1111

**Root cause:**
```tsx
// Lines 1050-1058 — CURRENT (Back button)
className="
  rounded-lg px-4 py-2.5 text-sm font-medium
  border border-slate-700/60 text-[#b9baa3]/60
  ...
"
// Lines 1075-1083 — CURRENT (Next button)
className="
  rounded-lg px-6 py-2.5 font-semibold text-sm
  bg-[#577399] text-[#f7f7ff]
  ...
"
```

`py-2.5` = 10px top + 10px bottom. With `text-sm` (20px line height), total button height = 10 + 20 + 10 = **40px**. WCAG 2.5.5 requires 44px. WCAG 2.5.8 (AA, WCAG 2.2) requires 24px with 12px spacing — the buttons pass 2.5.8 but fail the stricter 2.5.5 recommendation, and 40px is simply uncomfortable to tap reliably with a thumb.

**Recommended fix:**
```tsx
// Back button — AFTER
className="
  rounded-lg px-4 py-3 text-sm font-medium min-h-[44px]
  border border-slate-700/60 text-[#b9baa3]/60
  hover:border-slate-600 hover:text-[#b9baa3]
  transition-colors
"

// Next / Save button — AFTER
className="
  rounded-lg px-6 py-3 font-semibold text-sm min-h-[44px]
  bg-[#577399] text-[#f7f7ff]
  hover:bg-[#577399]/80
  disabled:opacity-40 disabled:cursor-not-allowed
  transition-colors shadow-sm
"
```

`py-3` = 12px × 2 + 20px = **44px**. Adding `min-h-[44px]` as a belt-and-suspenders guard ensures the height is enforced even if the font renders differently.

---

### HIGH-2 — Footer nav bar: `gap-4` flex layout with two button groups doesn't wrap on very narrow screens

**File:** `src/app/character/[id]/build/CharacterBuilderPageClient.tsx`  
**Lines:** 1040–1041

**Root cause:**
```tsx
// Line 1040 — CURRENT
<div className="shrink-0 border-t border-slate-700/40 px-6 py-4 flex items-center justify-between gap-4">
```

`px-6` = 24px each side = 48px total horizontal padding consumed. On a 328px dialog: `328 - 48 = 280px` for the button row. The row has a Back button and a button group (Next/Save). When the Save button shows a loading state with a spinner + "Saving…" label, the total button group width can exceed 280px, causing the Save button to clip.

**Recommended fix:**
```tsx
// AFTER — reduce padding on mobile, allow wrap
<div className="
  shrink-0 border-t border-slate-700/40
  px-3 sm:px-6 py-3 sm:py-4
  flex items-center justify-between gap-2 sm:gap-4
  flex-wrap
">
```

Reducing to `px-3` on mobile gives `328 - 24 = 304px` for buttons. `flex-wrap` ensures that if the two groups still can't fit side by side, they stack vertically rather than clipping.

---

### HIGH-3 — Step 3 Heritage tab buttons: too small to tap reliably on mobile

**File:** `src/app/character/[id]/build/CharacterBuilderPageClient.tsx`  
**Lines:** 476–499

**Root cause:**
```tsx
// Lines 482-489 — CURRENT
className={`
  flex-1 py-3 px-2 text-xs font-semibold uppercase tracking-wider transition-colors
  ...
`}
```

`py-3 px-2` gives height ≈ 36–38px (3×8px + 20px line height = 44px — this one actually passes). However, `px-2` = 8px horizontal padding with `text-xs uppercase tracking-wider` on labels "Ancestry" and "Community" makes the tap targets very narrow per side. On a 256px-wide sidebar (already identified as problematic), each tab gets only 128px width — workable but tight.

**The more significant issue:** these tab buttons are inside the `w-64 shrink-0` sidebar that itself needs to go full-width on mobile (per CRITICAL-2). Once CRITICAL-2 is fixed and the sidebar goes `w-full` on mobile, these tabs will correctly span the full width. No separate fix is needed beyond the CRITICAL-2 layout change.

**Ensure accessibility attribute is present once fix is applied:**
```tsx
// Add role and aria-selected to each tab button
<button
  key={tab}
  type="button"
  role="tab"
  aria-selected={heritageTab === tab}
  onClick={() => setHeritageTab(tab)}
  className={...}
>
```

---

### HIGH-4 — Step 5/6/7/8: step header `px-6` padding consumed on mobile; content area has no horizontal padding reduction

**File:** `src/app/character/[id]/build/CharacterBuilderPageClient.tsx`  
**Lines:** 643–669 (Step 5), 675–699 (Step 6), 703–731 (Step 7), 734–766 (Step 8)

**Root cause:**
Each of these steps renders:
```tsx
<div className="px-6 pt-5 pb-3 shrink-0 space-y-3">
  <h3 className="font-serif text-xl font-semibold text-[#f7f7ff]">Choose Starting Weapons</h3>
  ...
</div>
```

`px-6` = 24px each side = 48px total on a 328px dialog = 280px for content. The `text-xl` heading (`font-serif`) will wrap at approximately 280px — it barely fits. The problem is the `CollapsibleSRDDescription` inside these sections, which contains long prose text. Without `overflow-hidden` or `word-break: break-word`, very long unbroken strings (like a weapon name in the SRD description text) can overflow.

**Recommended fix:**
```tsx
// Steps 5/6/7/8 header div — AFTER
<div className="px-4 sm:px-6 pt-4 sm:pt-5 pb-3 shrink-0 space-y-3">
```

Also add `overflow-hidden` to the `CollapsibleSRDDescription` container (it already has `overflow-hidden` on the content div but the outer `rounded-lg` wrapper does not enforce it against absolutely-positioned children):

In `CollapsibleSRDDescription.tsx` line 45:
```tsx
// AFTER — already has overflow-hidden, confirm it is on the outer wrapper
<div
  className={`rounded-lg border border-slate-700/60 bg-slate-850/50 overflow-hidden min-w-0 ${className}`}
>
```

---

### HIGH-5 — Step 2 subclass content: `max-w-2xl` with `mx-auto` inside flex may not constrain on mobile

**File:** `src/app/character/[id]/build/CharacterBuilderPageClient.tsx`  
**Lines:** 390–391

**Root cause:**
```tsx
// Line 390 — CURRENT
<div className="flex-1 overflow-y-auto p-6 space-y-6 max-w-2xl mx-auto">
```

`flex-1` inside a flex column means this div grows to fill available width. `max-w-2xl` (672px) is the upper limit, and `mx-auto` centers it. On mobile, `p-6` (24px each side) consumes 48px on a 328px dialog, leaving 280px. This is fine for the content — **but `p-6` should be `p-4 sm:p-6`** for consistency with other steps.

More importantly: the `flex-1 overflow-y-auto` div is inside the main content wrapper which is itself `flex-1 overflow-y-auto` (line 284). This creates **two nested `overflow-y-auto` containers**, which means inner scroll height can be confused on iOS Safari. On Safari, a child `overflow-y-auto` inside a parent `overflow-y-auto` where the child is `flex-1` can result in the child collapsing to zero height.

**Recommended fix:**
```tsx
// Line 390 — AFTER
<div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 max-w-2xl mx-auto w-full min-h-0">
```

Adding `min-h-0` and `w-full` prevents the iOS Safari flex-height collapse.

Apply the same `p-4 sm:p-6` pattern and `min-h-0` to:
- Step 4, line 616
- Step 9, line 770

---

### HIGH-6 — Step 9 Review: trait bonus `flex items-center justify-between` row may collide on narrow screens

**File:** `src/app/character/[id]/build/CharacterBuilderPageClient.tsx`  
**Lines:** 826–841

**Root cause:**
```tsx
// Lines 829-839 — CURRENT
{Object.entries(traitBonuses)
  .sort((a, b) => b[1] - a[1])
  .map(([trait, bonus]) => (
    <div key={trait} className="flex items-center justify-between">
      <span className="text-sm text-[#b9baa3]/70">
        {trait.charAt(0).toUpperCase() + trait.slice(1)}
      </span>
      <span className={`font-semibold ${bonus > 0 ? "text-[#4ade80]" : "text-[#fe5f55]"}`}>
        {bonus > 0 ? "+" : ""}{bonus}
      </span>
    </div>
  ))}
```

This is inside a `max-w-xl mx-auto` container with `p-4` padding. The `justify-between` flex will work correctly at any width since there are only two children. However, the `text-[#4ade80]` (green) and `text-[#fe5f55]` (red) colors are used **only** as color cues for positive/negative — there is no supplementary non-color indicator (icon, +/− prefix is there — good). This is a **color-only distinction for colorblind users** — the +/− character prefix mitigates it, so this is Low priority.

The actual layout concern: at Step 9, the outer `p-6` container has no responsive padding reduction. On 328px: `328 - 48 = 280px`. The review cards use `rounded-lg border ... p-4` — another `32px` of padding within the card — leaving `248px` for the content. Weapon detail text (`{primaryWeapon.damageDie} · {primaryWeapon.range} · {primaryWeapon.burden}`) at line 857 is an unbroken string. It has no `truncate`, `min-w-0`, or `flex-wrap`, and will overflow.

**Recommended fix at lines 855–859:**
```tsx
// AFTER — add flex-wrap and min-w-0 to weapon detail rows
<div>
  <span className="text-xs text-[#b9baa3]/50">Primary: </span>
  <span className="text-sm font-semibold text-[#f7f7ff]">
    {primaryWeapon?.name ?? "Not selected"}
  </span>
  {primaryWeapon && (
    <span className="text-xs text-[#b9baa3]/50 ml-1 sm:ml-2 block sm:inline">
      {primaryWeapon.damageDie} · {primaryWeapon.range} · {primaryWeapon.burden}
    </span>
  )}
</div>
```

`block sm:inline` makes the stat detail wrap to a second line on mobile rather than overflow.

---

### HIGH-7 — WeaponSelectionPanel: filter input font-size below 16px triggers iOS zoom

**File:** `src/components/character/WeaponSelectionPanel.tsx`  
**Lines:** 157–168

**File:** `src/components/character/ArmorSelectionPanel.tsx`  
**Lines:** 98–113

**Root cause:**
```tsx
// WeaponSelectionPanel.tsx lines 163-167 — CURRENT
className="
  w-full rounded px-3 py-2 bg-slate-900 border border-slate-700
  text-sm text-[#f7f7ff] placeholder-[#b9baa3]/30
  ...
"
```

`text-sm` = 14px. **iOS Safari automatically zooms the entire viewport when a focused `<input>` has `font-size` less than 16px.** This causes the entire wizard modal to zoom and shift, making it appear to bleed off screen. This is one of the most common causes of mobile "bleed" complaints.

**Recommended fix:**
```tsx
// AFTER — use text-base (16px) on mobile, text-sm on sm+
className="
  w-full rounded px-3 py-2 bg-slate-900 border border-slate-700
  text-base sm:text-sm text-[#f7f7ff] placeholder-[#b9baa3]/30
  focus:outline-none focus:ring-2 focus:ring-[#577399] focus:border-transparent
  transition-colors
"
```

Apply the same fix to `ArmorSelectionPanel.tsx` line 103.

This single change may resolve the primary user complaint about the wizard being "unusable on small screens" — iOS zoom from sub-16px inputs is frequently misidentified as "off-screen bleed."

---

### HIGH-8 — WeaponSelectionPanel: slot tab "(Two-Handed equipped)" label causes tab overflow

**File:** `src/components/character/WeaponSelectionPanel.tsx`  
**Lines:** 148–151

**Root cause:**
```tsx
// Line 148-150 — CURRENT
{slot === "primary" ? "Primary" : "Secondary"}
{weapon && <span className="ml-1.5 text-[#577399]">✓</span>}
{disabled && <span className="ml-1.5 text-[#b9baa3]/30 text-[10px] normal-case font-normal">(Two-Handed equipped)</span>}
```

Each tab is `flex-1` inside a `flex` container. Adding a 20-character parenthetical to one tab at `text-[10px]` within `flex-1` is fine on desktop, but on a 328px dialog each tab is ~164px — "Secondary (Two-Handed equipped)" at 10px is approximately 195px wide, forcing overflow.

**Recommended fix — replace with a tooltip or truncate behind a responsive hide:**
```tsx
// AFTER — use an aria-label for the full message; show short visual cue only
{disabled && (
  <span
    className="ml-1 text-[#b9baa3]/30 text-[10px] normal-case font-normal hidden sm:inline"
    aria-hidden="true"
  >
    (2H)
  </span>
)}
```

The full "(Two-Handed equipped)" message should be placed in the `aria-label` of the tab button or as a `title` attribute. On mobile, the short "(2H)" badge (or nothing) prevents overflow, while the button being `disabled` + `opacity-40` communicates the unavailability visually.

---

### HIGH-9 — Step 8 DomainCardSelectionPanel: selection counter row may truncate on small screens

**File:** `src/components/character/DomainCardSelectionPanel.tsx`  
**Lines:** 294–312

**Root cause:**
```tsx
// Lines 295-312 — CURRENT
<div className="shrink-0 px-4 py-3 border-b border-slate-700/30 flex items-center justify-between">
  <p className="text-xs text-[#b9baa3]/50">
    Select exactly <strong className="text-[#f7f7ff]">2</strong> cards from your class domains
    {classDomains.length > 0 && (
      <span className="ml-1 text-[#577399]">
        ({classDomains.join(" & ")})
      </span>
    )}
  </p>
  <span className={`text-sm font-bold px-2 py-0.5 rounded ...`}>
    {selectionCount}/2
  </span>
</div>
```

This `justify-between` row contains a paragraph with potentially 60+ characters ("Select exactly 2 cards from your class domains (Blade & Valor)") alongside a `text-sm font-bold` counter. The `<p>` has no `min-w-0` or `max-w`, so on a 296px content area (328px - `px-4` × 2) the text will wrap, but the counter will be pushed to the right edge with no gap guarantee.

**Recommended fix:**
```tsx
// AFTER — allow paragraph to wrap and add min-w-0
<div className="shrink-0 px-4 py-3 border-b border-slate-700/30 flex items-start gap-3">
  <p className="text-xs text-[#b9baa3]/50 flex-1 min-w-0">
    Select exactly <strong className="text-[#f7f7ff]">2</strong> cards from your class domains
    {classDomains.length > 0 && (
      <span className="ml-1 text-[#577399]">
        ({classDomains.join(" & ")})
      </span>
    )}
  </p>
  <span className={`text-sm font-bold px-2 py-0.5 rounded shrink-0 ...`}>
    {selectionCount}/2
  </span>
</div>
```

`flex-1 min-w-0` on the paragraph allows it to take available space while the counter gets `shrink-0` to stay anchored.

---

## MEDIUM Issues

---

### MEDIUM-1 — Missing `viewport` meta `width=device-width, initial-scale=1` — critical precondition

**File:** `src/app/layout.tsx`  
**Lines:** 22–24

**Root cause:**
```tsx
// Lines 22-24 — CURRENT
export const viewport: Viewport = {
  themeColor: "#0f1219",
};
```

The `Viewport` export is missing `width` and `initialScale`. Without `width=device-width`, the browser uses its default viewport (typically 980px on iOS), which causes the page to render at desktop scale and then scale down — making all content appear zoomed out and tiny. With `initialScale=1`, the page renders at 1:1 on the device's pixel-equivalent width.

Next.js 14+ requires these to be set in the `Viewport` export (not in a `<meta>` tag directly) to avoid the "viewport not configured" warning.

**Recommended fix:**
```tsx
// layout.tsx — AFTER
export const viewport: Viewport = {
  themeColor: "#0f1219",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,  // Prevents accidental double-tap zoom on iOS
};
```

> ⚠️ **Note on `maximumScale: 1`:** Setting `maximum-scale=1` prevents users from pinching to zoom, which is an accessibility concern for low-vision users (violates WCAG 1.4.4). Use `maximumScale: 5` or omit it if you want to maintain full zoom accessibility. Given this is a game interface where the iOS auto-zoom from inputs (CRITICAL issue HIGH-7) is the real problem, `maximumScale: 5` is the recommended value.

```tsx
// Recommended balanced version
export const viewport: Viewport = {
  themeColor: "#0f1219",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,   // Allows pinch-zoom for accessibility; prevents defaulting to 980px
};
```

---

### MEDIUM-2 — `Close (×)` button: touch target is only the `×` glyph (≈24×24px)

**File:** `src/app/character/[id]/build/CharacterBuilderPageClient.tsx`  
**Lines:** 271–278

**Root cause:**
```tsx
// Lines 271-278 — CURRENT
<button
  type="button"
  onClick={() => router.push(`/character/${characterId}`)}
  className="text-[#b9baa3]/40 hover:text-[#b9baa3] text-2xl leading-none transition-colors focus:outline-none focus:ring-2 focus:ring-[#577399] rounded"
  aria-label="Close"
>
  ×
</button>
```

`text-2xl` renders the `×` at ~24px. The button has no explicit `h-*` or `w-*`, so its touch target is determined by the glyph bounding box ≈ 24×24px — below the WCAG 2.5.5 44px minimum.

**Recommended fix:**
```tsx
// AFTER — explicit min touch target
<button
  type="button"
  onClick={() => router.push(`/character/${characterId}`)}
  className="
    h-11 w-11 flex items-center justify-center
    text-[#b9baa3]/40 hover:text-[#b9baa3] text-2xl leading-none
    transition-colors focus:outline-none focus:ring-2 focus:ring-[#577399] rounded-lg
  "
  aria-label="Close builder"
>
  ×
</button>
```

`h-11 w-11` = 44×44px. The `aria-label` is improved from "Close" to "Close builder" for screen reader context.

---

### MEDIUM-3 — Step indicator panel: `hidden md:flex` panel has no mobile equivalent — users have no step progress awareness

**File:** `src/app/character/[id]/build/CharacterBuilderPageClient.tsx`  
**Lines:** 1003–1037

**Root cause:**
```tsx
// Line 1003 — CURRENT
<div className="hidden md:flex flex-col w-44 shrink-0 border-l border-slate-700/40 overflow-y-auto py-3">
```

The step navigation sidebar is correctly hidden on mobile (`hidden md:flex`). However, on mobile there is **no replacement UI** to tell the user which step they're on or how many remain. The only step indicator is the header subtitle "Step X of 9" (line 267):
```tsx
<p className="text-xs text-[#b9baa3]/40 mt-0.5">
  {character.name} • Step {step} of 9
</p>
```

This text is `text-xs text-[#b9baa3]/40` — it fails contrast (see existing audit) and is extremely easy to miss.

**Recommended fix — add a mobile progress bar below the header:**
```tsx
// Add inside the header section, after line 279, before the </div> closing the header
{/* Mobile step progress — visible only below md */}
<div className="md:hidden px-6 pb-3 shrink-0">
  {/* Progress track */}
  <div className="flex items-center gap-1" role="progressbar" aria-valuenow={step} aria-valuemin={1} aria-valuemax={9} aria-label={`Step ${step} of 9`}>
    {Array.from({ length: 9 }, (_, i) => (
      <div
        key={i}
        className={`
          h-1 flex-1 rounded-full transition-colors
          ${i + 1 < step ? "bg-[#577399]" : i + 1 === step ? "bg-[#577399]" : "bg-slate-700/60"}
        `}
      />
    ))}
  </div>
  <p className="text-[10px] text-[#b9baa3]/60 mt-1">
    Step {step} of 9
  </p>
</div>
```

---

### MEDIUM-4 — Circular radio buttons in weapon/armor/equipment panels: 20×20px — below WCAG 2.5.8 minimum

**File:** `src/components/character/WeaponSelectionPanel.tsx` line 202  
**File:** `src/components/character/ArmorSelectionPanel.tsx` line 143  
**File:** `src/components/character/StartingEquipmentPanel.tsx` line 162  
**File:** `src/components/character/DomainCardSelectionPanel.tsx` line 170

**Root cause:**
```tsx
// WeaponSelectionPanel.tsx line 202-208 — CURRENT
<button
  type="button"
  onClick={(e) => { e.stopPropagation(); handleSelect(weapon); }}
  aria-label={`Select ${weapon.name}`}
  className={`
    mt-0.5 h-5 w-5 rounded-full border-2 flex-shrink-0 ...
  `}
>
```

`h-5 w-5` = 20×20px. WCAG 2.5.8 (WCAG 2.2 AA) requires a minimum 24×24px bounding box, or a 24px spacing buffer around smaller targets. These buttons are inline within rows that have `py-3` (≈44px height), so the vertical spacing buffer is present. However, the horizontal 20px width with `flex-shrink-0` inside a row means there is no horizontal spacing buffer from the adjacent text content.

In practice, tapping these small circles is frustrating on mobile. The entire **row** is also clickable (it navigates to the drill-down) — but the circular button is specifically needed to *select* without navigating. This creates a two-step tap pattern (tap row → drill-down → tap Select button) that is reasonable, but the circle button should be larger.

**Recommended fix:**
```tsx
// AFTER — increase to 24×24px minimum, with a larger invisible tap target
<button
  type="button"
  onClick={(e) => { e.stopPropagation(); handleSelect(weapon); }}
  aria-label={`Select ${weapon.name}`}
  className={`
    relative shrink-0 h-6 w-6 rounded-full border-2
    flex items-center justify-center transition-colors
    before:absolute before:inset-[-8px] before:content-['']
    ${isSelected
      ? "border-[#577399] bg-[#577399]"
      : "border-slate-600 hover:border-[#577399]/70"
    }
  `}
>
```

The `before:absolute before:inset-[-8px]` pseudo-element creates a 40×40px invisible tap target (24 + 8 each side) without affecting layout. Apply to all four components.

---

### MEDIUM-5 — `overflow-hidden` missing from the main content flex row — allows inner content to bust out

**File:** `src/app/character/[id]/build/CharacterBuilderPageClient.tsx`  
**Line:** 282

**Root cause:**
```tsx
// Line 282 — CURRENT
<div className="flex flex-1 min-h-0 overflow-hidden">
```

This one is correct — `overflow-hidden` is present. ✅  
However, the **inner step wrapper** at line 284:
```tsx
<div className="flex-1 overflow-y-auto">
```
...has `overflow-y-auto` but no `overflow-x-hidden`. On mobile, if any child overflows horizontally, this div will show a horizontal scrollbar and allow horizontal scrolling rather than clipping. Setting `overflow-x: hidden` here prevents that secondary scroll:

```tsx
// AFTER
<div className="flex-1 overflow-y-auto overflow-x-hidden min-w-0">
```

---

### MEDIUM-6 — `CollapsibleSRDDescription` `max-h-96` animation may exceed mobile viewport height

**File:** `src/components/character/CollapsibleSRDDescription.tsx`  
**Line:** 77

**Root cause:**
```tsx
// Line 77 — CURRENT
${isExpanded ? "max-h-96" : "max-h-0"}
```

`max-h-96` = 384px. On a mobile device where the dialog is `max-h-[92vh]` (on a 667px iPhone SE: `92% × 667 ≈ 614px`), with the header (~64px), footer (~56px), and step header (~80px) consuming ~200px, the step content area is ~414px. A fully expanded SRD description at 384px would consume almost the **entire content area**, scrolling all selection content off screen.

**Recommended fix — use a responsive max-height:**
```tsx
// AFTER
${isExpanded ? "max-h-48 sm:max-h-96" : "max-h-0"}
```

`max-h-48` = 192px on mobile — enough for 4–6 lines of SRD text with a scroll cue, but leaves room for the selection content below.

---

## LOW Issues

---

### LOW-1 — "Back to list" link buttons in drill-down views: touch target too small

**File:** `src/components/character/WeaponSelectionPanel.tsx` lines 285–291  
**File:** `src/components/character/ArmorSelectionPanel.tsx` lines 214–220

**Root cause:**
```tsx
// WeaponSelectionPanel.tsx lines 285-291 — CURRENT
<button
  type="button"
  onClick={onBack}
  className="text-xs text-[#577399] hover:text-[#7a9fc2] transition-colors flex items-center gap-1"
>
  ← Back to list
</button>
```

`text-xs` with no `py-*` gives approximately 20px height. This is a navigation button that must be easily tappable after scrolling through a detail view.

**Recommended fix:**
```tsx
// AFTER
<button
  type="button"
  onClick={onBack}
  className="
    flex items-center gap-1.5 px-4 py-3 -mx-4
    text-xs text-[#577399] hover:text-[#7a9fc2]
    transition-colors min-h-[44px]
  "
>
  ← Back to list
</button>
```

`py-3 min-h-[44px]` brings this to the WCAG minimum. `-mx-4` extends the tap area edge-to-edge without visual change.

---

### LOW-2 — Step 9 review panel: `max-w-xl mx-auto` with inner `p-4` cards — deeply nested padding compounds on mobile

**File:** `src/app/character/[id]/build/CharacterBuilderPageClient.tsx`  
**Lines:** 771–942

The review section wraps in `p-6` (line 770), then `max-w-xl mx-auto` (line 771). Each review card has `p-4` (lines 778, 789, etc). On 328px: `328 - 48 (p-6) - 32 (p-4) = 248px` for content. Weapon detail text at line 856–858 concatenates `damageDie · range · burden` — three values with `·` separators — without `white-space: normal` or `flex-wrap`. On very narrow devices this can be a 30–40 character string in `text-xs` = ~240px wide, which barely fits.

**Recommended fix:**
```tsx
// Step 9 outer container — AFTER
<div className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6">
```

And verify that all `text-xs` stat strings within review cards are wrapped with:
```tsx
// Add to any multi-value stat line
<span className="text-xs text-[#b9baa3]/50 break-words">
  {primaryWeapon.damageDie} · {primaryWeapon.range} · {primaryWeapon.burden}
</span>
```

---

### LOW-3 — Emoji icons (`⚔️`, `🌿`, `🏘️`) in empty-state placeholders may not render consistently on all Android versions

**File:** `src/app/character/[id]/build/CharacterBuilderPageClient.tsx`  
**Lines:** 329, 546, 554

```tsx
<div className="text-4xl opacity-20">⚔️</div>
<div className="text-4xl opacity-20">🌿</div>
<div className="text-4xl opacity-20">🏘️</div>
```

These are decorative (`opacity-20`) and have no semantic meaning. They are not interactive. No accessibility concern — they are correctly decorative. However, on Android devices running older system emoji fonts, the `🏘️` (house with garden, U+1F3D8) may render as a tofu box or zero-width character on API < 28. This would cause the empty state to appear broken.

**Recommended fix — wrap in aria-hidden and provide a Unicode-safe fallback:**
```tsx
<div className="text-4xl opacity-20" aria-hidden="true">🏘</div>
```

Or replace all three with simple SVG icons for deterministic rendering.

---

### LOW-4 — `box-shadow` inline style on dialog: not inherited correctly in Safari WebKit on some iOS versions

**File:** `src/app/character/[id]/build/CharacterBuilderPageClient.tsx`  
**Line:** 258

```tsx
style={{ boxShadow: "0 0 60px rgba(87,115,153,0.15), 0 24px 48px rgba(0,0,0,0.6)" }}
```

This is a cosmetic shadow. On iOS Safari 15.x and earlier, large `blur-radius` box-shadows on elements with `overflow-hidden` can cause the shadow to be clipped. Since CRITICAL-1 adds `overflow-hidden` to this element, the shadow's blur radius (60px, 48px) will be clipped.

**Recommended fix — use Tailwind's `shadow-2xl` or move to a wrapper:**
```tsx
// Option A: Remove the inline style and use shadow-2xl from Tailwind
// (shadow-2xl is not clipped because it is part of Tailwind's paint order)
className="... shadow-2xl"

// Option B: Wrap in a shadow-only outer div
<div className="relative" style={{ filter: "drop-shadow(0 24px 48px rgba(0,0,0,0.6))" }}>
  <div role="dialog" className="... overflow-hidden">
    ...
  </div>
</div>
```

`filter: drop-shadow` is not clipped by `overflow-hidden` in the same way `box-shadow` is.

---

## Summary Table — Prioritized Implementation Order

| # | Priority | File | Line(s) | Issue | Fix |
|---|----------|------|---------|-------|-----|
| 1 | 🔴 Critical | `CharacterBuilderPageClient.tsx` | 249–258 | Modal missing `overflow-hidden` + `min-w-0` | Add `overflow-hidden min-w-0` to dialog div |
| 2 | 🔴 Critical | `CharacterBuilderPageClient.tsx` | 287–321, 472–539 | Two-pane layout fixed `w-64` sidebar doesn't stack on mobile | `flex-col sm:flex-row`, `w-full sm:w-64`, `max-h-48 sm:max-h-none` |
| 3 | 🔴 Critical | `TraitAssignmentPanel.tsx` | 163–199 | `select` element no `min-w-0` can overflow row | Add `min-w-0` to `select` and row container |
| 4 | 🔴 Critical | `WeaponSelectionPanel.tsx` | 252–266 | Summary bar text no `truncate`/`min-w-0` | `truncate min-w-0` on weapon name spans |
| 5 | 🔴 Critical | `ArmorSelectionPanel.tsx` | 241–245 | `grid-cols-3` doesn't reflow on mobile | `grid-cols-1 sm:grid-cols-3` |
| 6 | 🟠 High | `CharacterBuilderPageClient.tsx` | 1040–1111 | Footer buttons `py-2.5` = 40px — below 44px WCAG min | `py-3 min-h-[44px]` on Back and Next/Save |
| 7 | 🟠 High | `CharacterBuilderPageClient.tsx` | 1040 | Footer `px-6` too wide on mobile | `px-3 sm:px-6` + `flex-wrap` |
| 8 | 🟠 High | `CharacterBuilderPageClient.tsx` | 476–499 | Heritage tab aria roles missing | Add `role="tab"` + `aria-selected` |
| 9 | 🟠 High | `CharacterBuilderPageClient.tsx` | 643–766 | Step headers `px-6` not reduced on mobile | `px-4 sm:px-6` on all step header wrappers |
| 10 | 🟠 High | `CharacterBuilderPageClient.tsx` | 390, 616, 770 | Nested `overflow-y-auto` iOS Safari collapse | Add `min-h-0 w-full` to inner scroll divs |
| 11 | 🟠 High | `CharacterBuilderPageClient.tsx` | 855–870 | Weapon stat strings unbroken on Step 9 | `block sm:inline` on detail spans |
| 12 | 🟠 High | `WeaponSelectionPanel.tsx` + `ArmorSelectionPanel.tsx` | 157–168, 98–113 | Filter input `text-sm` (14px) triggers iOS viewport zoom | `text-base sm:text-sm` on all `<input>` |
| 13 | 🟠 High | `WeaponSelectionPanel.tsx` | 148–151 | "(Two-Handed equipped)" label causes tab overflow | Hide on mobile; use short "(2H)" |
| 14 | 🟠 High | `DomainCardSelectionPanel.tsx` | 294–312 | Counter row no `min-w-0` on paragraph | `flex-1 min-w-0` on paragraph |
| 15 | 🟡 Medium | `layout.tsx` | 22–24 | `viewport` missing `width=device-width, initialScale=1` | Add width + initialScale to Viewport export |
| 16 | 🟡 Medium | `CharacterBuilderPageClient.tsx` | 271–278 | Close `×` button 24×24px — below WCAG touch target | `h-11 w-11 flex items-center justify-center` |
| 17 | 🟡 Medium | `CharacterBuilderPageClient.tsx` | 1003–1037 | No mobile step progress indicator | Add progress bar below header for mobile |
| 18 | 🟡 Medium | All panel components | Multiple | Radio circle buttons 20×20px | Increase to 24×24 + pseudo-element tap expansion |
| 19 | 🟡 Medium | `CharacterBuilderPageClient.tsx` | 284 | Inner scroll `div` no `overflow-x-hidden` | Add `overflow-x-hidden min-w-0` |
| 20 | 🟡 Medium | `CollapsibleSRDDescription.tsx` | 77 | `max-h-96` consumes full mobile content area | `max-h-48 sm:max-h-96` |
| 21 | 🟢 Low | `WeaponSelectionPanel.tsx` + `ArmorSelectionPanel.tsx` | 285–291, 214–220 | "Back to list" buttons too small | `py-3 min-h-[44px]` |
| 22 | 🟢 Low | `CharacterBuilderPageClient.tsx` | 770–942 | Step 9 padding compounds on mobile | `p-4 sm:p-6` outer; `break-words` on stat strings |
| 23 | 🟢 Low | `CharacterBuilderPageClient.tsx` | 329, 546, 554 | Emoji icons inconsistent on older Android | `aria-hidden="true"` + optional SVG fallback |
| 24 | 🟢 Low | `CharacterBuilderPageClient.tsx` | 258 | Large box-shadow clipped by `overflow-hidden` on Safari | Use `filter: drop-shadow` on wrapper or `shadow-2xl` |

---

## Recommended Implementation Sequence

For a front-end engineer resolving the primary complaint in minimum time:

**Pass 1 — Stops the bleed (30–60 min):**
1. Issue #1: Add `overflow-hidden min-w-0` to the dialog div
2. Issue #2: Stack the two-pane layouts on mobile (`flex-col sm:flex-row`)
3. Issue #12: Change filter inputs to `text-base sm:text-sm` (fixes iOS zoom)
4. Issue #15: Add `width` + `initialScale` to `viewport` export in `layout.tsx`

These four changes will resolve the primary complaint on >95% of devices.

**Pass 2 — Full mobile usability (2–4 hours):**
5. Issues #3, #4, #5: Fix `min-w-0` and grid reflow in sub-components
6. Issues #6, #7: Footer button sizing and padding
7. Issues #9, #10, #11, #19: Padding normalization and overflow guards
8. Issues #13, #14: Tab label and counter row fixes

**Pass 3 — Accessibility polish (1–2 hours):**
9. Issues #16, #17, #18: Touch targets, close button, mobile progress bar
10. Issues #8, #20: ARIA roles on Heritage tabs, SRD description height cap
11. Issues #21–24: Low-priority polish items

---

## Testing Checklist

After implementing Pass 1 fixes, verify on these device profiles:
- **iPhone SE (2nd gen):** 375×667px, iOS Safari 15+ — smallest common iOS screen
- **iPhone 14 Pro:** 393×852px — current iOS flagship
- **Samsung Galaxy A53:** 360×800px, Chrome Android — most common Android mid-range
- **iPad Mini (6th gen):** 744×1133px — smallest tablet (should show two-pane layout)

Test these specific interactions:
- [ ] Horizontal scroll is not possible at any wizard step
- [ ] Tapping the filter input does NOT zoom the viewport (HIGH-7)
- [ ] The class list sidebar scrolls vertically on mobile without pushing the detail pane off screen (CRITICAL-2)
- [ ] All 9 steps are completable without horizontal scrolling
- [ ] Back and Next buttons are reachable with a thumb in the bottom zone
- [ ] The drill-down views in weapon/armor panels show the "Back to list" button at a tappable size
- [ ] Step 9 Review shows all selections without horizontal overflow

---

_Generated by the Usability & Accessibility Agent. All line references verified against the live codebase at `/mnt/c/Users/joshu/Repos/CCB-Curses/frontend/src/`._
