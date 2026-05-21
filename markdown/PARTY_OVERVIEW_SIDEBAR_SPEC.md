# Party Overview Sidebar — Visual Design Specification

> **Status:** Design spec — ready for engineering implementation  
> **Target:** `frontend/src/components/campaign/`  
> **Reviewed against:** existing design system in `tailwind.config.ts`, `globals.css`, `CommandCenterCard.tsx`, `CondensedCharacterCard.tsx`, `SlotBar.tsx`, `StatChip.tsx`

---

## 0. Design System Anchors

Pull directly from the already-established tokens. Do not introduce new color values unless specified below.

| Token | Resolved Value | Usage |
|---|---|---|
| `bg-slate-900` | `#0f172a` | Tile background (default) |
| `bg-slate-850` | `#151e2d` | Sidebar container background |
| `border-[#577399]/20` | steel-blue 12% | Default tile border |
| `text-[#f7f7ff]` | near-white | Primary value text |
| `text-parchment-500` | `#d4a94a` | Label text / metadata |
| `text-[#b9baa3]` | warm grey | Secondary body text |
| `text-[#DAA520]` | goldenrod | Hope stat, party Hope |
| `text-emerald-400` | `#34d399` | HP healthy fill |
| `text-amber-400` | `#fbbf24` | HP wounded fill |
| `text-[#fe5f55]` | coral-red | HP critical/down fill, Stress danger |
| `text-violet-400` | `#a78bfa` | Stress fill |
| `bg-[#577399]` | steel-blue | Armor fill |
| `font-serif` | `double-pica`, Georgia | Section headings, character name |
| `font-sans` | `Overpass`, Inter | All body / label text |
| `font-display` | `Heavitas` | Fear counter number only |
| `shadow-card` | `0 2px 8px rgba(0,0,0,.55), 0 0 0 1px rgba(74,10,20,.35)` | Tile resting shadow |

---

## 1. Sidebar Container

### Geometry

```
Desktop (≥1024px):
  Width:        280px fixed
  Height:       100vh (sticky, inset-y-0)
  Position:     fixed right-0 top-0  (z-index: 40)
  Collapsed:    width=0, toggle tab protrudes 32px on the left edge

Mobile (<1024px):
  Width:        100vw
  Height:       auto (slides up from bottom as a drawer)
  Max-height:   70vh
  Position:     fixed bottom-0 left-0  (z-index: 40)
  Collapsed:    height=0 (drawer hidden), floating toggle button visible
```

### Visual Treatment

```css
/* Sidebar shell */
background:   #151e2d;                                   /* slate-850 */
border-left:  1px solid rgba(87, 115, 153, 0.25);        /* steel-blue/25 */
box-shadow:   -4px 0 24px rgba(0, 0, 0, 0.6),
              -1px 0 0 rgba(74, 10, 20, 0.20);           /* burgundy inner rim */
backdrop-filter: none;                                   /* solid, not frosted */
```

### Internal Layout

```
[Sidebar Header]  — 56px tall, sticky at top of sidebar
  - "Party" label (font-display "Heavitas", 11px, letter-spacing 0.2em, uppercase, parchment-500)
  - Party member count badge ("4 adventurers" — 10px, steel-blue)
  - Close/collapse button — right-aligned (see §7)

[Fear Callout]    — 72px tall (see §5)

[Divider]         — 1px, rgba(87,115,153,0.15)

[Scrollable tile list]
  - overflow-y: auto
  - scrollbar: 4px wide, thumb #334155 (slate-700), track transparent
  - gap between tiles: 8px (gap-2)
  - padding: 8px 10px (px-2.5 py-2)

[Sidebar Footer]  — 40px, optional "View Full Party" link
```

### Open/Close Transition

```
Property:   transform (translateX on desktop, translateY on mobile)
Duration:   280ms
Easing:     cubic-bezier(0.25, 0.46, 0.45, 0.94)  (ease-out)
```

---

## 2. Party Member Tile — Full Anatomy

Each tile is a **vertical card**, `rounded-xl` (12px), with a fixed **internal layout of 4 zones**.

### Overall Tile Dimensions

```
Width:        100% of sidebar content area (≈ 260px on desktop)
Height:       auto (min ~130px, max ~160px depending on HP max count)
Padding:      10px 12px (px-3 py-2.5)
Border-radius: 12px
```

### Zone 1 — Portrait + Name Header (top, 40px tall)

```
Layout: flex row, items-center, gap-2

[Portrait]
  Size:   38px × 38px circle (rounded-full)
  Border: 2px solid rgba(87,115,153,0.40)     default
          2px solid rgba(254,95,85,0.70)       when danger ≥ critical
          2px solid rgba(251,191,36,0.70)      when stress = max (stressed-out)
  Object-fit: cover
  Fallback (no portrait): monogram letter
    Background: rgba(87,115,153,0.20)
    Text:       font-sans font-bold 16px text-[#577399]

[Name block]  flex-1, min-w-0
  [Character name]
    Font:        font-serif (double-pica)
    Size:        13px
    Weight:      600
    Color:       #f7f7ff   (healthy)
                 #fe5f55   (down — add line-through)
    truncate:    yes

  [Class · Level]
    Font:        font-sans
    Size:        10px
    Color:       rgba(185,186,163,0.75)   (.sidebar-text-secondary)
    truncate:    yes

[Danger badge]  shrink-0, appears only when danger ≥ critical
  Icon:    ⚠ (Unicode U+26A0, aria-hidden + sr-only label)
  Size:    14px
  Color:   #fe5f55
  Also show: diagonal-striped overlay on portrait (see §4)
```

### Zone 2 — HP Row (segmented pip bar, most prominent tracker)

```
Layout: flex row, items-center, gap-2, mt-2

[Label]
  "HP"
  Font-sans, 9px, uppercase, tracking-widest
  Color: rgba(185,186,163,0.75)
  Width: 18px fixed, shrink-0

[Pip row]   flex-1
  Each pip:
    Height:   8px
    Width:    flex-1 (distributes evenly)
    Radius:   3px (rounded-sm)
    Gap:      2px
    Filled:   bg = DANGER_HP_FILL[dangerState]
    Empty:    border 1px solid rgba(87,115,153,0.25), bg transparent

  Max pips visible: if hpMax > 12, switch to mini segmented bar (1px pips, gap 1px)
  If hpMax > 20, collapse to single progress bar (see §3-HP)

[Numeric]   shrink-0
  "{remaining}/{max}"   — remaining = max - marked
  Font-sans, 10px, font-semibold, tabular-nums
  Color: matches DANGER_HP_FILL color class (emerald/amber/coral)
```

### Zone 3 — Secondary Trackers Row (Stress + Armor, side by side)

```
Layout: flex row, gap-3, mt-1.5

Each sub-tracker:
  Layout: flex row, items-center, gap-1

  [Label] 9px uppercase, tracking-widest, rgba(185,186,163,0.75), width 28px
  [Mini pips] each pip: 6px × 6px circle (rounded-full), gap 2px
    Stress filled:  bg-violet-500
    Stress empty:   border 1px rgba(167,139,250,0.25)
    Armor filled:   bg-[#577399]
    Armor empty:    border 1px rgba(87,115,153,0.25)
  [Count] 9px, tabular-nums, muted
    Stress count color: text-violet-400  (or text-[#fe5f55] when stress = max)
    Armor count color:  text-[#7a9ab5]   (.text-steel-accessible)
```

### Zone 4 — Hope + Evasion Chip Row (bottom, 24px)

```
Layout: flex row, items-center, gap-2, mt-1.5

[Hope chip]
  Layout: flex row, items-center, gap-1
  Icon:   ✦ (U+2726) — 9px, color #DAA520
  Value:  "{current}/{max}"
  Font:   font-sans, 11px, font-semibold, tabular-nums
  Color:  #DAA520
  Pulse animation: "pulse-glow-goldenrod" (already in keyframes) — applied when hope = max

[Evasion chip]
  Layout: rounded-md badge
  Padding: 1px 6px (px-1.5 py-0.5)
  Border: 1px solid rgba(87,115,153,0.30)
  Background: rgba(87,115,153,0.10)
  Content: "EVA {value}"
  Font:   font-sans, 10px, font-semibold, tabular-nums
  Color:  #f7f7ff
```

---

## 3. Stat-Specific Visualization

### HP — Segmented Pip Row

| Condition | Fill color | Empty color | Numeric color |
|---|---|---|---|
| Healthy (>50% remaining) | `bg-emerald-500` | `rgba(87,115,153,0.25)` | `text-emerald-400` |
| Wounded (25–50% remaining) | `bg-amber-400` | `rgba(251,191,36,0.20)` | `text-amber-400` |
| Critical (<25% remaining) | `bg-[#fe5f55]` | `rgba(254,95,85,0.20)` | `text-[#fe5f55]` |
| Down (0 remaining) | `bg-[#fe5f55]` | `rgba(254,95,85,0.30)` | `text-[#fe5f55]` |

**Overflow rule:** If `hpMax > 20`, replace pip row with a CSS progress bar:
```
Height: 6px, rounded-full
Background track: rgba(87,115,153,0.15)
Fill: linear-gradient based on danger state
Transition: width 400ms ease-out
```

### Stress — Circle Pips

- Pip diameter: **6px circle** (rounded-full)
- Filled: `bg-violet-500`
- Empty: `border-1px border-violet-500/25 bg-transparent`
- **Danger trigger:** When `stress.marked === stress.max`:
  - All pips: `bg-[#fe5f55]` + `border-[#fe5f55]`
  - Label text: `text-[#fe5f55]`
  - Tile gets stress-maxed compound state (see §4)

### Armor — Circle Pips

- Pip diameter: **6px circle** (rounded-full)
- Filled: `bg-[#577399]`
- Empty: `border-1px border-[#577399]/25`
- No danger state for armor (depleted armor is expected)
- When `armor.max === 0`: hide entire armor row, do not render empty pips

### Hope — Icon + Fraction

- Render as `✦ {current}/{max}` inline, goldenrod (#DAA520)
- When `hope === 0`: color shifts to `rgba(218,165,32,0.35)` (muted)
- When `hope === max`: apply `animate-pulse-glow-goldenrod` (already defined)
- Max is always 6 per SRD; render 6 small pip dots above the number for a quick visual scan:

```
Optional secondary render: 6 mini pips (5px circles), filled goldenrod, empty transparent/border
Position: just above the ✦ numeric, in the Zone 4 row
Space budget: use only when sidebar is expanded to ≥300px width
```

### Evasion — Stat Badge Chip

- Numeric only, no pips
- Render as `[EVA 14]` badge
- Border, background: steel-blue tint (see Zone 4 above)
- No dynamic state changes (Evasion is static)

---

## 4. Danger States

All danger states must communicate through **three simultaneous channels** (color + shape + texture) for accessibility.

### State Table

| State | Trigger | Border | Tile BG tint | Portrait ring | Icon | Text style |
|---|---|---|---|---|---|---|
| `healthy` | HP > 50% remaining, stress < max | `rgba(87,115,153,0.20)` 1px | none | steel-blue 40% | — | Normal |
| `wounded` | HP 25–50% remaining | `rgba(251,191,36,0.40)` 1px | none | amber 40% | ⚠ sr-only only | Normal |
| `critical` | HP < 25% remaining | `rgba(254,95,85,0.55)` 1px + `animate-coral-pulse` | `rgba(254,95,85,0.04)` | coral-red 70% | ⚠ visible (#fe5f55) | Name stays white |
| `down` | HP = 0 | `rgba(254,95,85,0.70)` 2px | `rgba(254,95,85,0.07)` | coral-red 70%, dashed | ⚠ visible + skull pattern | Name: line-through, `text-[#fe5f55]/70` |
| `stressed-out` | Stress = max (compound with any HP state) | Adds violet inner shadow | light violet wash `rgba(167,139,250,0.04)` | Adds violet outer ring (secondary) | 🌀 sr-only label "Stressed out" | Stress label turns coral |

### `critical` — Pulse Animation

```css
@keyframes party-tile-danger-pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(254,95,85,0); }
  50%       { box-shadow: 0 0 10px 2px rgba(254,95,85,0.25),
                          0 0  4px 0   rgba(254,95,85,0.15); }
}
/* Duration: 2s, timing: ease-in-out, iteration: infinite */
/* Suppress under prefers-reduced-motion — keep static border change only */
```

### `down` — Portrait Overlay (shape/pattern channel)

```
Render a diagonal-stripes SVG mask over the portrait (CSS background-image).
Pattern: repeating-linear-gradient(
  -45deg,
  rgba(254,95,85,0.35) 0px,
  rgba(254,95,85,0.35) 2px,
  transparent 2px,
  transparent 8px
)
Border: 2px dashed rgba(254,95,85,0.70)
```

### `stressed-out` — Texture Channel

When stress is maxed, add a vertical left-edge accent bar to the tile:
```
Position: absolute left-0 top-0 bottom-0 w-[3px]
Background: linear-gradient(to bottom, rgba(167,139,250,0.7), rgba(167,139,250,0.2))
Border-radius: 12px 0 0 12px
aria-hidden: true
```

---

## 5. GM Fear Display

The Fear Callout lives **at the top of the sidebar**, just below the header bar, **above the tile list**. It is always visible — it does not scroll with the tile list.

### Visual Identity

The Fear section must look **categorically different** from player tiles — it belongs to the GM/world layer, not the party layer.

```
Layout:       Horizontal callout strip — full sidebar width, 68px tall
Background:   linear-gradient(135deg,
                rgba(74,10,20,0.55) 0%,      /* burgundy-900 dark */
                rgba(21,30,45,0.90) 100%)     /* slate-850 */
Border-bottom: 1px solid rgba(74,10,20,0.50)
Border-top:   none (flush with sidebar header border-bottom)
Padding:      10px 16px (px-4 py-2.5)
```

### Internal Layout

```
[Left section]  flex-col, justify-center
  [Eyebrow label]
    "GM · FEAR"
    Font: font-display "Heavitas", 9px, letter-spacing: 0.22em, uppercase
    Color: rgba(203,45,86,0.70)   (burgundy-600 at 70%)

  [Flavor text]
    "The world watches…" — italic, 9px, rgba(185,186,163,0.45)
    Only shown when fear > 0; hidden at fear = 0

[Right section]  flex-row, items-center, gap-3
  [Fear pips]   — 12 small diamond shapes (◆ U+25C6)
    Each diamond: 10px × 10px, rendered via SVG or CSS transform: rotate(45deg) on square
    Filled:   background #8e1e3e  (burgundy-800), border 1px solid #cb2d56 (burgundy-600)
    Empty:    background transparent, border 1px solid rgba(142,30,62,0.30)
    Gap:      3px
    Arrange in 2 rows of 6 (grid 6×2) or 1 row of 12 depending on sidebar width
    
    When fear ≥ 9:  filled pips switch to bg-[#cb2d56], add `animate-coral-pulse` (re-using existing keyframe)
    When fear = 12: all 12 filled + border becomes solid #e0486e (burgundy-500) pulsing

  [Fear counter]
    "{fear}"
    Font:   font-display "Heavitas", 28px
    Color:  #e0486e  (burgundy-500)  — healthy
            #cb2d56  (burgundy-600)  — fear ≥ 6
            #aa2047  (burgundy-700)  — fear ≥ 9 + animate-pulse-glow
    Line-height: 1
    Min-width: 28px, text-align: right
```

### Fear Accessibility

- The Fear counter must have `aria-label="GM Fear: {n} of 12"`
- The pip grid must have `role="img" aria-label="Fear tracker: {n} of 12 filled"`
- When fear changes, the counter element must have `aria-live="polite"`

---

## 6. Real-Time Update Animations

All animations respect `prefers-reduced-motion: reduce` — fall back to instant swap.

### Value Change — Number Pop

When any numeric value changes (HP remaining, Stress, Hope, Fear):

```css
@keyframes party-stat-pop {
  0%   { transform: scale(1);    opacity: 1; }
  25%  { transform: scale(1.25); opacity: 1; }
  100% { transform: scale(1);    opacity: 1; }
}
/* Duration: 250ms, timing: cubic-bezier(0.34, 1.56, 0.64, 1) (spring bounce) */
/* Apply: animate-party-stat-pop class toggled via JS, removed after 300ms */
```

### HP Decrease — Pip Flash

When an HP pip transitions from filled → empty (damage taken):

```css
@keyframes party-pip-clear {
  0%   { background-color: var(--pip-fill-color); opacity: 1; }
  30%  { background-color: rgba(254,95,85,0.8);  opacity: 1; }
  100% { background-color: transparent;           opacity: 1; }
}
/* Duration: 400ms, ease-out */
/* Only on the specific pip(s) being cleared */
```

### HP Increase (healing) — Pip Fill

When an HP pip transitions from empty → filled:

```css
@keyframes party-pip-fill {
  0%   { background-color: transparent; transform: scale(0.6); }
  60%  { background-color: var(--pip-fill-color); transform: scale(1.15); }
  100% { background-color: var(--pip-fill-color); transform: scale(1); }
}
/* Duration: 350ms, ease-out */
```

### Danger State Transition — Tile Border

When a tile transitions between danger states:
```
Transition: border-color 600ms ease-in-out, box-shadow 600ms ease-in-out
No jump — always cross-fades smoothly.
```

### Fear Counter Change

```css
@keyframes fear-count-flip {
  0%   { transform: translateY(0);    opacity: 1; }
  30%  { transform: translateY(-8px); opacity: 0; }
  31%  { transform: translateY(8px);  opacity: 0; }
  100% { transform: translateY(0);    opacity: 1; }
}
/* Duration: 300ms, ease-in-out */
/* Applied to the fear number span only */
```

### Tile Entry (new member joins)

```css
/* Reuse existing animate-fade-in (already defined in tailwind.config.ts) */
animation: fade-in 0.2s ease-out;
/* Plus: */
@keyframes party-tile-enter {
  from { transform: translateX(20px); opacity: 0; }
  to   { transform: translateX(0);    opacity: 1; }
}
/* Duration: 250ms, ease-out */
```

---

## 7. Toggle Button

### Desktop (sidebar collapsed)

```
Type:       Fixed tab protruding from the left edge of the sidebar
Position:   fixed right-0 top-1/2 transform -translate-y-1/2, translateX(-100%)
             When sidebar open:  right: 280px
             When sidebar closed: right: 0
Dimensions: 32px wide × 72px tall
Shape:      rounded-l-xl (left corners only)
Background: #151e2d (slate-850), matching sidebar
Border:     1px solid rgba(87,115,153,0.25), border-right: none
Shadow:     -2px 0 8px rgba(0,0,0,0.40)

Content (vertical stack, centered):
  [Icon]  — Sideways chevron (‹/›) OR custom party icon
           SVG: two overlapping person silhouettes
           Size: 16px × 16px
           Color: rgba(185,186,163,0.75)

  [Label] — "Party" rotated -90deg (writing-mode: vertical-rl; text-orientation: mixed)
           Font: font-sans, 9px, uppercase, letter-spacing 0.2em
           Color: rgba(185,186,163,0.50)

  [Count badge] — member count pill
           Background: rgba(87,115,153,0.20)
           Color: #f7f7ff, 9px, font-bold
           Padding: 1px 4px
           Border-radius: 9999px

Active state (sidebar open):
  Icon:    chevron points right (›) to indicate "collapse"
  Border:  1px solid rgba(87,115,153,0.40)
  BG:      rgba(87,115,153,0.08) tint

Hover:
  BG:      rgba(87,115,153,0.12)
  Border:  rgba(87,115,153,0.40)
  Transition: 150ms ease-out

Focus-visible:
  outline: 2px solid #fbbf24, offset: 2px (matches global focus ring)
```

### Mobile (bottom drawer)

```
Type:        Floating Action Button style
Position:    fixed bottom-20px right-16px (above any bottom nav)
Size:        48px × 48px circle
Background:  #151e2d
Border:      1px solid rgba(87,115,153,0.35)
Shadow:      0 4px 16px rgba(0,0,0,0.6), 0 0 0 1px rgba(74,10,20,0.20)
Icon:        Two-person party SVG, 20px, color #b9baa3

Active (drawer open):
  Background: rgba(87,115,153,0.20)
  Border:     1px solid rgba(87,115,153,0.60)
  Icon:       downward chevron (drawer close)

Badge:       Unread danger count — small red dot (8px circle, #fe5f55)
             Position: absolute -2px -2px top-right of button
             Shown when: any party member is in critical/down state
             Pulses via `animate-coral-pulse`
```

---

## 8. Color Palette and Typography

### Sidebar-Specific Color Assignments

```
Sidebar shell BG:           #151e2d   (slate-850)
Tile BG (default):          rgba(15,23,42,0.90)  (slate-900/90)
Tile BG (hovered):          rgba(30,41,59,0.80)  (slate-800/80)
Tile BG (selected/focused): rgba(87,115,153,0.12)
Tile border (default):      rgba(87,115,153,0.20)   1px
Tile border (hover):        rgba(87,115,153,0.40)   1px
Tile border (wounded):      rgba(251,191,36,0.40)   1px
Tile border (critical):     rgba(254,95,85,0.55)    1px + pulse
Tile border (down):         rgba(254,95,85,0.70)    2px dashed
Fear section BG:            gradient (burgundy tinted — see §5)
Scrollbar thumb:            #334155  (slate-700)
Sidebar header BG:          #151e2d with bottom border rgba(87,115,153,0.20)
```

### Typography Scale (sidebar only)

| Element | Font | Size | Weight | Color |
|---|---|---|---|---|
| Character name | `font-serif` (double-pica) | 13px | 600 | `#f7f7ff` |
| Class · Level | `font-sans` | 10px | 500 | `rgba(185,186,163,0.75)` |
| Stat label (HP, STR…) | `font-sans` uppercase | 9px | 500 | `rgba(185,186,163,0.75)` |
| Stat value numeric | `font-sans` tabular-nums | 10px | 700 | context-dependent |
| Hope value | `font-sans` tabular-nums | 11px | 700 | `#DAA520` |
| Evasion badge | `font-sans` tabular-nums | 10px | 700 | `#f7f7ff` |
| Sidebar header "Party" | `font-sans` uppercase | 11px | 700 | `rgba(185,186,163,0.90)` |
| Fear eyebrow "GM · FEAR" | `font-display` (Heavitas) | 9px | normal | `rgba(203,45,86,0.70)` |
| Fear counter | `font-display` (Heavitas) | 28px | normal | `#e0486e` |
| Sidebar footer link | `font-sans` | 11px | 600 | `rgba(87,115,153,0.80)` |

---

## 9. Responsive Behavior

### Desktop (≥1024px) — Primary Target

```
Sidebar:        Fixed right column, 280px, full-height
Main content:   Gets padding-right: 280px when sidebar is open
                Transition: padding-right 280ms ease-out (no layout jump)
Tiles:          Single column, 100% sidebar width
Fear callout:   Top of sidebar, full width strip
Toggle:         Left-edge tab (see §7 Desktop)
```

### Tablet (768px–1023px)

```
Sidebar:        Overlay mode (no main content push)
                Slides in from right, 280px wide
                Semi-transparent backdrop: rgba(10,16,13,0.70) behind sidebar
Toggle:         Same left-edge tab as desktop
Tiles:          Single column
```

### Mobile (<768px)

```
Sidebar:        Bottom drawer, slides up
                100vw wide, max-height: 72vh
                Background: #151e2d
                Top rounded: border-radius 16px 16px 0 0
                Drag handle: 36px×4px pill, rgba(87,115,153,0.30), centered at top, 8px margin

Fear callout:   Full-width strip at top of drawer (same design, condensed to 56px)
Tiles:          Horizontal scroll row OR vertical list (toggle via preference)
                Default: vertical list (same as desktop but narrower)
                Tile width: 100% of drawer width
Toggle:         FAB button bottom-right (see §7 Mobile)
Backdrop:       rgba(10,16,13,0.70) on open
```

---

## 10. Component Sketch — Pseudocode Structure

```tsx
<PartySidebar isOpen={bool} onToggle={fn}>

  {/* Sticky header */}
  <SidebarHeader memberCount={n} onClose={fn} />

  {/* Fear callout — always visible, non-scrolling */}
  <FearCallout fear={currentFear} maxFear={12} />

  {/* Divider */}
  <hr className="border-[#577399]/15" />

  {/* Scrollable tile list */}
  <div className="overflow-y-auto flex-1 space-y-2 px-2.5 py-2">
    {partyMembers.map(member => (
      <PartyMemberTile
        key={member.characterId}
        character={member}         /* live data from useCharacter hook */
        dangerState={computed}
        isStressedOut={computed}
        onAnimateStatChange={fn}   /* triggers pop animation */
      />
    ))}
  </div>

  {/* Optional footer */}
  <SidebarFooter campaignId={id} />

</PartySidebar>

<PartyToggleButton
  isOpen={bool}
  onToggle={fn}
  dangerCount={criticalOrDownCount}
/>
```

---

## 11. Tile Annotated Layout (ASCII reference for engineers)

```
┌────────────────────────────────────────────┐  ← rounded-xl border
│                                            │  ← 10px top padding
│  ○──  Aria Swiftblade       ⚠             │  ← Zone 1: portrait + name + badge
│       Ranger · Lv 3                        │
│  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─  │  ← 2px gap
│  HP ██████████░░░░  8/12                   │  ← Zone 2: HP pips
│  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─  │  ← 1.5px gap
│  STR ●●●○○  3/5     ARM ●●○  2/3         │  ← Zone 3: Stress + Armor
│  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─  │  ← 1.5px gap
│  ✦ 3/6              [EVA 14]              │  ← Zone 4: Hope + Evasion
│                                            │  ← 10px bottom padding
└────────────────────────────────────────────┘
```

```
Fear Callout (top of sidebar):
┌────────────────────────────────────────────┐  ← full width, burgundy gradient
│  GM · FEAR         ◆◆◆◆◆◆◆○○○○○    5    │
│  The world watches…                        │
└────────────────────────────────────────────┘
```

---

## 12. New CSS / Keyframes Required

Add these to `globals.css` alongside existing animations:

```css
/* ─── Party Overview Sidebar ──────────────────────────────────────────────── */

@keyframes party-stat-pop {
  0%   { transform: scale(1); }
  25%  { transform: scale(1.28); }
  100% { transform: scale(1); }
}
.animate-party-stat-pop {
  animation: party-stat-pop 250ms cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes party-pip-clear {
  0%   { background-color: var(--pip-fill); }
  30%  { background-color: rgba(254,95,85,0.8); }
  100% { background-color: transparent; }
}
.animate-party-pip-clear {
  animation: party-pip-clear 400ms ease-out forwards;
}

@keyframes party-pip-fill {
  0%   { transform: scale(0.6); opacity: 0.5; }
  60%  { transform: scale(1.15); opacity: 1; }
  100% { transform: scale(1); opacity: 1; }
}
.animate-party-pip-fill {
  animation: party-pip-fill 350ms ease-out forwards;
}

@keyframes party-tile-danger-pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(254,95,85,0); }
  50%       { box-shadow: 0 0 10px 2px rgba(254,95,85,0.25),
                          0 0  4px 0   rgba(254,95,85,0.12); }
}
.animate-party-tile-danger {
  animation: party-tile-danger-pulse 2s ease-in-out infinite;
}

@keyframes fear-count-flip {
  0%   { transform: translateY(0);    opacity: 1; }
  30%  { transform: translateY(-8px); opacity: 0; }
  31%  { transform: translateY(8px);  opacity: 0; }
  100% { transform: translateY(0);    opacity: 1; }
}
.animate-fear-flip {
  animation: fear-count-flip 300ms ease-in-out;
}

@keyframes party-tile-enter {
  from { transform: translateX(16px); opacity: 0; }
  to   { transform: translateX(0);    opacity: 1; }
}
.animate-party-tile-enter {
  animation: party-tile-enter 250ms ease-out;
}

@media (prefers-reduced-motion: reduce) {
  .animate-party-stat-pop,
  .animate-party-pip-clear,
  .animate-party-pip-fill,
  .animate-party-tile-danger,
  .animate-fear-flip,
  .animate-party-tile-enter {
    animation: none;
  }
}
```

---

## 13. Tailwind Config Additions

Add to `tailwind.config.ts` → `theme.extend`:

```ts
// In keyframes:
"party-stat-pop": {
  "0%":   { transform: "scale(1)" },
  "25%":  { transform: "scale(1.28)" },
  "100%": { transform: "scale(1)" },
},
"party-tile-danger-pulse": {
  "0%, 100%": { boxShadow: "0 0 0 0 rgba(254,95,85,0)" },
  "50%":      { boxShadow: "0 0 10px 2px rgba(254,95,85,0.25), 0 0 4px 0 rgba(254,95,85,0.12)" },
},
"fear-count-flip": {
  "0%":   { transform: "translateY(0)",   opacity: "1" },
  "30%":  { transform: "translateY(-8px)",opacity: "0" },
  "31%":  { transform: "translateY(8px)", opacity: "0" },
  "100%": { transform: "translateY(0)",   opacity: "1" },
},
"party-tile-enter": {
  from: { transform: "translateX(16px)", opacity: "0" },
  to:   { transform: "translateX(0)",    opacity: "1" },
},

// In animation:
"party-stat-pop":         "party-stat-pop 250ms cubic-bezier(0.34, 1.56, 0.64, 1)",
"party-tile-danger":      "party-tile-danger-pulse 2s ease-in-out infinite",
"fear-flip":              "fear-count-flip 300ms ease-in-out",
"party-tile-enter":       "party-tile-enter 250ms ease-out",

// In boxShadow:
"glow-fear":  "0 0 14px rgba(142,30,62,0.50), 0 0 4px rgba(142,30,62,0.30)",
"party-tile": "0 2px 6px rgba(0,0,0,0.45), 0 0 0 1px rgba(74,10,20,0.20)",
```

---

## 14. Accessibility Checklist

| Requirement | Implementation |
|---|---|
| All animations suppressible | `prefers-reduced-motion: reduce` block in §12 |
| Color not sole indicator | Danger states use border style (solid/dashed), icon (⚠), and portrait overlay pattern in addition to color |
| Stress maxed: not color-only | Left-edge accent bar (shape) + icon sr-only label + violet pips |
| Fear counter: screen reader | `aria-live="polite"` + explicit `aria-label` |
| Tile focus ring | `focus:outline-none focus:ring-2 focus:ring-[#577399]` (2px, #577399, offset 2) |
| Toggle button: keyboard operable | Standard `<button>` with `aria-expanded`, `aria-controls` |
| Portrait alt text | `alt=""` (decorative) — name already in tile |
| Min touch target | All interactive elements ≥ 44px × 44px (WCAG 2.5.5) |
| Contrast — tile labels | `rgba(185,186,163,0.75)` = 4.65:1 on slate-900 → passes AA |
| Contrast — stat values | `#f7f7ff` on slate-900 > 12:1 → passes AAA |
| Contrast — Fear counter | `#e0486e` on `#151e2d` ≈ 4.8:1 → passes AA |
| Danger icon sr text | `<span aria-hidden="true">⚠</span><span className="sr-only">Danger: {state}</span>` |
| Sidebar role | `role="complementary" aria-label="Party overview"` |
| Tile region | `role="article" aria-label="{name} — party vitals"` |
