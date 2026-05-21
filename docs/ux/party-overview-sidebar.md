# Party Overview Sidebar — UX Plan
**Document type:** UX Architecture & Flow Specification  
**Feature:** Party Overview Sidebar (Player-visible vitals panel)  
**Author:** UX Architect Agent  
**Date:** 2026-04-13  
**Status:** Ready for Front-End implementation

---

## 1. Purpose & Problem Statement

Players currently have no at-a-glance view of their party's health during a session. The existing `CommandCenterTab` (party vitals grid) is **GM-only** and lives inside a full tab — it requires navigation away from the character sheet to consult. Players have no equivalent.

The Party Overview Sidebar solves this by giving **all roles** (GM and players alike) a persistent, toggleable panel that surfaces every party member's critical vitals — HP, Stress, Armor, Hope, Evasion, portrait, name — plus the GM's current Fear total. It is optimized for **quick scanning during active play**, not for deep inspection.

---

## 2. Feature Requirements (confirmed)

| # | Requirement |
|---|-------------|
| 1 | Visible to **all roles** — players and GMs alike |
| 2 | Each tile shows: **Stress, HP, Armor, Hope, Evasion, portrait, name** |
| 3 | Also shows the **GM's current Fear total** (read-only for players) |
| 4 | All values update in **real time** |
| 5 | Tiles must be **attractive, scannable, readable at a glance** |
| 6 | **Dangerous states** (full Stress, critical/down HP) must have **clear, attention-grabbing** warning visuals |

---

## 3. Information Architecture

### 3.1 Mental Model Alignment

Players think about their party in two modes:

- **Combat scan** (happening right now): "Is anyone down? Who's stressed? How much Fear does the GM have?"
- **Strategic scan** (between turns): "Who has Hope to spare? Who should take the next hit?"

The sidebar must serve both. This means **danger conditions dominate visually** while healthy stats remain readable without demanding attention.

### 3.2 Data Hierarchy Per Tile

Information priority within each member tile, ranked by urgency during play:

```
TIER 1 — Identity (always visible, instant recognition)
  ├── Portrait / avatar (40×40px circle)
  └── Character name

TIER 2 — Survival state (combat-critical, drives immediate decisions)
  ├── HP bar        → "Are they alive? How close to down?"
  └── Stress bar    → "Are they at risk of breaking?"

TIER 3 — Defensive posture (turn-level decisions)
  └── Armor bar     → "Can they take a hit?"

TIER 4 — Action economy (round-level decisions)
  ├── Hope          → "Can anyone spend Hope? Do we have enough for a push?"
  └── Evasion       → "Should we rely on them to dodge?"

TIER 5 — Conditions (situational, not always present)
  └── Active conditions (max 2 shown, +N overflow badge)
```

### 3.3 Fear Display

Fear belongs to **Tier 1** in the sidebar context — it is the GM's primary resource and a threat signal to the whole party.

- Displayed **above all character tiles**, in a dedicated Fear strip at the top of the sidebar panel body.
- Shown as a **read-only pip bar** (0–12) for players; the GM retains the full stepper control in the main view — the sidebar Fear display for the GM is also read-only (it mirrors the existing tracker).
- Fear color: `#fe5f55` (coral), matching the FearTracker's existing palette.
- Fear does **not** take up a tile slot. It is a campaign-level resource, not a character resource.

### 3.4 Panel-Level Information Architecture

```
Party Overview Sidebar
├── Panel Header
│   ├── Title: "Party"
│   └── Close button [✕]
│
├── Fear Strip (always present)
│   ├── Label: "Fear"
│   ├── Pip bar (0–12, read-only, coral fill)
│   └── Numeric: "N / 12"
│
└── Character Tiles (scrollable, sorted: most-hurt first)
    ├── Tile: [Portrait] [Name]         ← identity row
    │         [HP bar ─────────]        ← survival
    │         [Stress bar ─────]        ← survival
    │         [ARM bar ─────── ]        ← defense
    │         Hope: N   Eva: N          ← action economy
    │         [Condition badge] [+N]    ← situational (omitted if none)
    │
    ├── Tile: ...
    └── Tile: ...
```

---

## 4. Layout & Positioning

### 4.1 Sidebar Position: Bottom Sheet on Mobile, Right Panel on Desktop

**Problem:** The existing layout already uses:
- **Left** `aside` (280px, desktop): party roster
- **Left** `PartyDrawer` (280px, mobile): party roster
- **Right** panel: `EditSidebar` and `ConditionsSidebar` (both `fixed right-0`, `z-50`)

**Solution:**

| Breakpoint | Party Overview Sidebar position |
|---|---|
| Mobile (`< sm`, `< 640px`) | **Bottom sheet** — slides up from the bottom, above the bottom nav bar. Height: `max-h-[70vh]`. |
| Desktop (`≥ sm`, `≥ 640px`) | **Right panel** — slides in from the right at `z-40`, behind `EditSidebar`/`ConditionsSidebar` at `z-50`. Width: `max-w-[22rem]` (narrower than the EditSidebar's `28rem` to avoid collisions). |

This avoids all existing panel conflicts:
- On mobile, bottom-sheet does not conflict with the left `PartyDrawer`.
- On desktop, the party overview is `z-40` and the edit/conditions sidebars are `z-50` — if both are open simultaneously, the edit/conditions panel overlays on top. This is correct: editing is more urgent than overview.

### 4.2 Toggle Button Placement

The toggle button must be **always reachable** without navigating away from any tab or sheet view.

**Desktop:** A fixed vertical tab handle on the **right edge** of the viewport, centered vertically.

```
[ viewport right edge ]
        ┌──────────────┐
        │   Party      │  ← vertical text, tab handle
        │   Overview   │
        │   [icon]     │
        └──────────────┘
```

- Position: `fixed right-0 top-1/2 -translate-y-1/2 z-30`
- Appearance: Narrow pill tab (`w-8`, `h-28`), `bg-slate-900`, `border-l border-t border-b border-[#577399]/35`, `rounded-l-xl`
- Icon: party/group icon (e.g., `👥` or a simple SVG group icon) + text "Party" rotated `rotate-180` vertical
- When the sidebar is open, the tab handle transforms to sit flush against the sidebar's left edge, acting as a close handle

**Mobile:** A **floating action button (FAB)** in the bottom-right corner, above the bottom nav bar.

```
[ bottom nav bar ]
         ┌───┐
         │👥 │  ← FAB, 48×48px
         └───┘
```

- Position: `fixed bottom-[calc(56px+env(safe-area-inset-bottom)+12px)] right-4 z-30`
- Appearance: 48×48px circle, `bg-slate-800`, `border border-[#577399]/40`, `shadow-lg`
- Icon: group icon, `text-[#577399]`
- When bottom sheet is open, FAB changes to a close `✕` icon (no additional button needed)

### 4.3 Layout Diagram

**Desktop (sidebar open):**
```
┌────────────────────────────────────────────────────────────────────────┐
│  Header                                                                │
├──────────────┬─────────────────────────────────────────┬──────────────┤
│              │                                         │  Party       │
│  Roster      │  Main Content (character sheet, tabs)   │  Overview    │
│  (280px)     │                                         │  Sidebar     │
│              │                                         │  (22rem)     │
│              │                                         │              │
└──────────────┴─────────────────────────────────────────┴──────────────┘
                                                           ↑ slides in from right
```

**Mobile (bottom sheet open):**
```
┌────────────────────────────────────────────────────────────────────────┐
│  Header                                                                │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  Main Content (character sheet)                           [👥 FAB]    │
│                                                                        │
├────────────────────────────────────────────────────────────────────────┤
│  Party Overview Bottom Sheet (max-h-70vh, scrollable)                  │
│  ┌────────────────────────────────────────────────────────────────┐   │
│  │  ─── drag handle ───                                           │   │
│  │  Fear: ████████░░░░  8/12                                      │   │
│  │  [Tile] [Tile] [Tile]  (horizontal scroll or stacked)          │   │
│  └────────────────────────────────────────────────────────────────┘   │
├────────────────────────────────────────────────────────────────────────┤
│  Bottom Nav                                                            │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 5. Tile Design Specification

### 5.1 Tile Anatomy

Each tile reuses the existing `CommandCenterCard` pattern with the following adaptations:

```
┌────────────────────────────────────┐
│ [●] Aria Ashford          ⚠ [CRIT] │  ← identity row + danger badge
│ HP  ████████████░░░░░░  10/16      │  ← HP bar (emerald/amber/coral)
│ STR ████████░░░░░░░░░░   4/8       │  ← Stress bar (violet)
│ ARM ████░░░░░░░░░░░░░░   2/6       │  ← Armor bar (steel)
│ Hope: 3   Eva: 14                  │  ← stat row
│ [Frightened] [+1]                  │  ← conditions (omitted if none)
└────────────────────────────────────┘
```

- Tile width: `100%` of sidebar column (fills `22rem` minus `2×16px` padding = ~19.5rem)
- Tile border: color-coded by danger state (see §6)
- Tile background: `bg-slate-900/80` base, coral tint on "down" state
- Tap behavior: navigates to that character's sheet (same as `CommandCenterCard.onSelect`)

### 5.2 Portrait / Avatar

- 40×40px circle, `object-cover`, `border border-[#577399]/30`
- Fallback: initial letter on `bg-[#577399]/20` background (matches `CommandCenterCard`)
- On "down" state: portrait receives a coral overlay (`after:absolute after:inset-0 after:bg-[#fe5f55]/20 after:rounded-full`) + a subtle desaturation (`filter: grayscale(40%)`)

### 5.3 Bar Layout

All three bars (`HP`, `STR`, `ARM`) use the existing `SlotBar` component:
- `barHeight="h-2.5"` (standard)
- Labels: `HP`, `STR`, `ARM` (3 chars, monospaced alignment)
- Numeric suffix: `marked/max` format

**Color scheme (matches CommandCenterCard):**
| Bar | Fill color |
|---|---|
| HP (healthy) | `bg-emerald-500` |
| HP (wounded) | `bg-amber-400` |
| HP (critical/down) | `bg-[#fe5f55]` |
| Stress | `bg-violet-500` |
| Armor | `bg-[#577399]` |

### 5.4 Hope & Evasion Row

Single line: `Hope: N   Eva: N`
- Hope value: `text-[#DAA520] font-semibold` (gold, matches existing)
- Evasion value: `text-[#f7f7ff] font-semibold`
- Separator: 12px gap, no divider

### 5.5 Conditions Row

- Only rendered if `conditions.length > 0`
- Max **2** badges shown (reduced from CommandCenterCard's 3, because sidebar tiles are narrower and we want visual breathing room)
- Overflow: `+N` badge in `text-[#b9baa3]/60`
- Badge style: `rounded-full border border-[#fe5f55]/30 bg-[#fe5f55]/5 px-1.5 py-0.5 text-[10px] text-[#fe5f55] font-medium`

---

## 6. Danger State UX Rules

The danger state system is inherited directly from `CommandCenterCard.getDangerState()` — no new logic is needed. The sidebar tiles apply the same rules.

### 6.1 State Definitions

| State | Condition | HP bar color | Border | Background |
|---|---|---|---|---|
| `healthy` | >50% HP remaining | `bg-emerald-500` | `border-[#577399]/20` | `bg-slate-900/80` |
| `wounded` | 25%–50% HP remaining | `bg-amber-400` | `border-amber-400/40` | `bg-slate-900/80` |
| `critical` | <25% HP remaining | `bg-[#fe5f55]` | `border-[#fe5f55]/40` | `bg-slate-900/80` |
| `down` | 0 HP remaining | `bg-[#fe5f55]` | `border-[#fe5f55]/60` | `bg-[#fe5f55]/5` |

### 6.2 Animation Rules

| State | Animation |
|---|---|
| `critical` | `animate-danger-pulse` on the border — **must be added to `tailwind.config.ts`** (see §6.4) |
| `down` | `shadow-[0_0_8px_rgba(254,95,85,0.15)]` glow + name strikethrough |
| `healthy` / `wounded` | No animation |

### 6.3 Stress-Full Danger State (new, sidebar-specific)

The sidebar adds a **secondary danger signal** not present in `CommandCenterCard`: **Stress Full**.

When `stress.marked >= stress.max`:
- The STR bar fill changes from `bg-violet-500` to `bg-[#fe5f55]` (coral)
- A `⚠` icon appears inline after "STR" in the bar label row, `text-[#fe5f55] text-xs`, `aria-label="Stress full"`
- The tile border does **not** change (HP state governs border color) — Stress-full is a secondary signal surfaced within the bar, not at the tile level
- If the character is **both** critical HP and stress-full, both signals show independently

**Rationale:** In Daggerheart, filling your Stress track triggers a Break, which can have severe consequences. Players need to see this signal immediately — not just when HP is critical. This is distinct from HP danger but equally urgent.

### 6.4 Required Tailwind Addition

The `animate-danger-pulse` class is referenced in `CommandCenterCard.tsx` but **not defined** in `tailwind.config.ts`. The Front-End Agent must add:

```ts
// In tailwind.config.ts → theme.extend.keyframes:
"danger-pulse": {
  "0%, 100%": { borderColor: "rgba(254,95,85,0.2)" },
  "50%":      { borderColor: "rgba(254,95,85,0.7)" },
},

// In tailwind.config.ts → theme.extend.animation:
"danger-pulse": "danger-pulse 1.6s ease-in-out infinite",
```

This fixes an existing bug in `CommandCenterCard` as well as enabling the sidebar's critical state animation.

### 6.5 Non-Visual Danger Signals (Accessibility)

For users relying on screen readers or who cannot perceive color:

- Each tile's `aria-label` includes the danger state: e.g., `"Aria Ashford — Critical: 3 of 16 HP remaining"`
- The `⚠` warning icon has `aria-label="Danger"` (matches existing `CommandCenterCard` pattern)
- The Stress-full `⚠` icon has `aria-label="Stress full"`
- The `down` name strikethrough is paired with `aria-label` text change: `"Aria Ashford — Down: 0 of 16 HP"`
- Bars include numeric labels (`marked/max`) — color alone never conveys state

---

## 7. Fear Display Specification

### 7.1 Fear Strip Layout

```
┌────────────────────────────────────┐
│ 🔥 FEAR   ████████░░░░  8 / 12     │
└────────────────────────────────────┘
```

- Background: `bg-[#fe5f55]/5`, `border border-[#fe5f55]/25`, `rounded-xl`, `px-4 py-2.5`
- Label: `FEAR` in `text-xs uppercase tracking-widest text-[#fe5f55]/70`
- Pip bar: 12 pips, read-only (no click handlers in the sidebar). Filled pips: `bg-[#fe5f55]`. Empty pips: `bg-slate-700/60`.
- Numeric: `text-sm font-bold tabular-nums text-[#fe5f55]` — `N/12`
- Flame emoji `🔥` decorative prefix, `aria-hidden="true"`

### 7.2 Player vs GM Difference

- **Players:** Fear strip is fully read-only. No stepper, no click on pips. `aria-label="GM Fear: N of 12"`.
- **GMs:** Fear strip is also read-only **in the sidebar**. The GM modifies Fear in the main view (existing FearTracker component). The sidebar is a status mirror, not a control surface. This keeps the sidebar cognitively light — it observes, it doesn't operate.

### 7.3 Fear Threshold Signal

When `currentFear >= 10` (within 2 of maximum):
- The Fear strip border intensifies: `border-[#fe5f55]/60`
- The numeric label pulses: `animate-coral-pulse` (already defined in `tailwind.config.ts` as `coral-pulse`)
- This signals to the party that the GM is close to gaining a major advantage (Fear mechanics)

---

## 8. Real-Time Update UX

### 8.1 Current State

The existing WebSocket (`useGameWebSocket`) does not broadcast character stat changes. TanStack Query polls character data with `staleTime: 30,000ms` — 30-second staleness is too slow for combat.

### 8.2 Recommended Update Strategy (Two-Phase)

**Phase 1 (immediate, no backend changes):** Reduce `staleTime` for character queries to `0` when the Party Overview Sidebar is open, and trigger a `refetchInterval` of `5,000ms` (5 seconds). This is acceptable for a sidebar that is only mounted when open.

**Phase 2 (real-time, backend change required):** Add a new WebSocket event type `character_stat_update` that the server broadcasts whenever HP, Stress, Armor, Hope, or conditions change on any character in the campaign. The Front-End Agent should plan for this and use `queryClient.invalidateQueries(['character', characterId])` in the WS `onMessage` handler.

### 8.3 Value Change Animation (Flash)

When a stat value changes (detected by comparing previous vs current value in a `useEffect`), the affected bar briefly **flashes**:

- **Value decreased** (damage taken, stress added): bar flashes red/coral for 400ms, then returns to normal color. Use a CSS class toggled with `setTimeout`.
- **Value increased** (healing, stress cleared): bar flashes emerald/green for 400ms.

Implementation: a `data-flash="decrease" | "increase"` attribute on the bar wrapper, controlled by a `useState` that resets after 400ms. The CSS animation is a simple opacity pulse on a colored overlay.

```
// Pseudo-code for flash logic in PartyOverviewTile:
const prevHp = useRef(hp.marked);
useEffect(() => {
  if (hp.marked !== prevHp.current) {
    setFlashState(hp.marked > prevHp.current ? 'decrease' : 'increase');
    const t = setTimeout(() => setFlashState(null), 400);
    prevHp.current = hp.marked;
    return () => clearTimeout(t);
  }
}, [hp.marked]);
```

### 8.4 Tile Sort Stability

Tiles are sorted most-hurt first (matching `CommandCenterTab`'s `useSortedCharacters`). During combat, values change rapidly. To prevent jarring reorderings, sorting only updates **when the sidebar is closed and reopened**, or when the user has been idle for 3+ seconds (no stat changes). This is a **deferred sort** pattern — tiles animate into new positions smoothly when sort does update.

Implementation: use `useMemo` with a debounced key that only triggers a re-sort after 3 seconds of quiet.

---

## 9. Interaction Model

### 9.1 Open / Close Flow

```
TOGGLE BUTTON TAPPED / CLICKED
        │
        ▼
  isOpen = false?
        │
    ┌───┴────┐
   YES       NO
    │         │
    ▼         ▼
  OPEN      CLOSE
  sidebar   sidebar
    │         │
    ▼         ▼
 slide-in   slide-out
 animation  animation
 (300ms,    (250ms,
  ease-out)  ease-in)
    │         │
    ▼         ▼
 focus       focus
 first tile  toggle button
 (desktop)   (return focus)
```

### 9.2 Slide Animation

**Desktop (right panel):**
- Open: `translate-x-0` ← `translate-x-full`, `transition-transform duration-300 ease-out`
- Close: `translate-x-full` ← `translate-x-0`, `transition-transform duration-250 ease-in`
- Closed state uses `inert` attribute (matches `EditSidebar` pattern exactly)

**Mobile (bottom sheet):**
- Open: `translate-y-0` ← `translate-y-full`, `transition-transform duration-300 ease-out`
- Close: `translate-y-full` ← `translate-y-0`, `transition-transform duration-250 ease-in`
- Drag handle visible at top of sheet (visual affordance for swipe-down-to-close)

### 9.3 Swipe Gestures (Mobile)

- **Swipe down on the sheet:** closes the bottom sheet (same `touchStart` / `touchEnd` delta pattern as `PartyDrawer`)
- **Swipe up on the FAB area:** not applicable (FAB is a tap target, not a swipe zone)

### 9.4 Keyboard Navigation

| Key | Behavior |
|---|---|
| `Escape` | Closes sidebar, returns focus to toggle button |
| `Tab` | Cycles through tiles (each tile is a focusable button) |
| `Shift+Tab` | Reverse cycle |
| `Enter` / `Space` | Activates focused tile (navigates to character sheet) |
| `Tab` at last tile | Wraps to close button (tab trap while open, matching `EditSidebar`) |

### 9.5 Backdrop / Scrim

- **Desktop:** No scrim — the sidebar overlays main content without blocking it (players may want to read the sidebar AND the sheet simultaneously). The main content simply shifts or is partially obscured.
- **Mobile:** A semi-transparent scrim (`bg-black/50 backdrop-blur-sm`) appears behind the bottom sheet, tappable to close.

---

## 10. Responsive Behavior

| Breakpoint | Sidebar form | Toggle | Width / Height |
|---|---|---|---|
| `< 640px` (mobile) | Bottom sheet | FAB (bottom-right, above nav) | Full width, `max-h-[70vh]` |
| `640px–1024px` (tablet) | Right panel | Tab handle (right edge) | `max-w-[22rem]`, full height |
| `> 1024px` (desktop) | Right panel | Tab handle (right edge) | `max-w-[22rem]`, full height |

### 10.1 Mobile Bottom Sheet Tile Layout

On mobile, tiles stack **vertically** (same as desktop). The bottom sheet is scrollable. The Fear strip is pinned at the top of the scroll area (sticky within the sheet).

If there are many party members (4+), tiles remain compact — the sheet scrolls, it does not paginate.

### 10.2 Main Content Reflow (Desktop)

When the sidebar opens on desktop, the main content area **does not reflow** (no grid column change). The sidebar overlays the right portion of the main content. This is intentional:
- The character sheet is already wide enough to tolerate partial occlusion on the right edge.
- Reflow causes jarring layout shifts that break player focus during combat.
- Players who want full-width can close the sidebar.

---

## 11. Component Architecture Recommendation

### 11.1 New Components

```
src/components/campaign/
├── PartyOverviewSidebar.tsx      ← Main container (open/close state, Fear strip, tile list)
├── PartyOverviewTile.tsx         ← Individual character tile (wraps CommandCenterCard logic)
└── PartyOverviewToggle.tsx       ← Toggle button (tab handle on desktop, FAB on mobile)
```

### 11.2 Reused Components (no modification needed)

- `SlotBar` — used as-is for HP/Stress/Armor bars
- `useCharacter` hook — used per tile to fetch character data (same as `CommandCenterCard`)
- The `getDangerState` / `getHpPercentage` functions from `CommandCenterCard` — **export these** so `PartyOverviewTile` can import them without duplication

### 11.3 Modified Components

- `tailwind.config.ts` — add `danger-pulse` keyframe + animation (see §6.4)
- `CampaignDetailClient.tsx` — mount `<PartyOverviewSidebar>` and `<PartyOverviewToggle>` outside the main/aside layout, as fixed-position elements (same pattern as `DiceLog`)

### 11.4 State Management

The sidebar's open/close state lives in `CampaignDetailClient` local state (`useState<boolean>`), same as `gmDiceOpen`, `drawerOpen`, etc. No Zustand store needed — this is purely UI state.

```tsx
const [partyOverviewOpen, setPartyOverviewOpen] = useState(false);
```

Passed as props to both `PartyOverviewSidebar` and `PartyOverviewToggle`.

---

## 12. Accessibility Requirements

### 12.1 ARIA Roles & Attributes

```
<div role="dialog" aria-modal="true" aria-label="Party Overview" aria-hidden={!isOpen}>
  <!-- sidebar panel -->
</div>
```

- `role="dialog"` matches `EditSidebar` and `PartyDrawer` patterns
- `aria-modal="true"` on the bottom sheet (mobile) — it does block interaction with content behind the scrim
- **Desktop:** `aria-modal="false"` — the panel does not trap interaction with the rest of the page; it is supplemental
- `inert` attribute when closed (matches `EditSidebar`)

### 12.2 Focus Management

- On **open**: focus moves to the first character tile (desktop) or the drag handle / first tile (mobile)
- On **close**: focus returns to the toggle button that opened the panel
- Tab trap: **only on mobile** (bottom sheet is modal). Desktop panel does **not** trap focus — users can Tab out of it into the main content.

### 12.3 Live Region for Value Changes

```html
<div aria-live="polite" aria-atomic="false" class="sr-only" id="party-stat-updates">
  <!-- Updated by JS when a stat changes: "Aria Ashford HP changed to 10 of 16" -->
</div>
```

This live region announces stat changes to screen reader users without visual disruption. Updates are **debounced to 2 seconds** to avoid flooding screen readers during rapid combat exchanges.

### 12.4 Color Independence

Every danger state must be communicated through **at least two channels** (never color alone):

| Danger | Color | Non-color signal |
|---|---|---|
| Critical HP | Coral bar + coral border | `⚠` icon, "Critical" in `aria-label`, border animation |
| Down | Coral tint + coral border | `⚠` icon, strikethrough name, "Down" in `aria-label` |
| Stress full | Coral stress bar | `⚠` icon after STR label, "Stress full" in `aria-label` |
| Fear high | Coral pips + pulse | Numeric `N/12` always visible |

### 12.5 Touch Targets

All interactive elements meet **48×48px minimum touch target** (matching `FearTracker`'s pip buttons):
- Each character tile: full width, minimum 72px height
- Toggle FAB: 48×48px
- Close button: 40×40px (smaller, acceptable at edge of panel where precision is easier)

---

## 13. Integration Points in `CampaignDetailClient`

The following changes are needed in `CampaignDetailClient.tsx`:

### 13.1 New state
```tsx
const [partyOverviewOpen, setPartyOverviewOpen] = useState(false);
```

### 13.2 New render (outside the main/aside flex container, alongside DiceLog)
```tsx
{/* Party Overview Sidebar + Toggle */}
<PartyOverviewToggle
  isOpen={partyOverviewOpen}
  onToggle={() => setPartyOverviewOpen((v) => !v)}
/>
<PartyOverviewSidebar
  isOpen={partyOverviewOpen}
  onClose={() => setPartyOverviewOpen(false)}
  characters={campaign?.characters ?? []}
  currentFear={campaign?.currentFear ?? 0}
  onSelectCharacter={(charId) => {
    navigateToCharacter(charId);
    setPartyOverviewOpen(false); // close sidebar after navigation
  }}
/>
```

### 13.3 Role gating
None required — `PartyOverviewSidebar` is intentionally role-agnostic. Both players and GMs see it. The Fear strip is always read-only within the sidebar regardless of role.

---

## 14. Flows

### 14.1 Player Opens Party Overview During Combat

```
PLAYER is viewing character sheet
        │
        ▼
Notices party member in danger (no current signal)
        │
        ▼
Taps FAB [👥] (mobile) or tab handle (desktop)
        │
        ▼
PartyOverviewSidebar slides in
        │
        ▼
Player sees Fear: 8/12 (high! ⚠), 
party sorted: Finn (CRIT ⚠), Mira (Wounded), Aria (Healthy)
        │
        ▼
Player taps Finn's tile → navigates to Finn's sheet
        │
        ▼
Sidebar closes automatically
```

### 14.2 GM Monitors Party During Encounter

```
GM is on Encounter tab
        │
        ▼
GM taps tab handle → PartyOverviewSidebar opens (right panel)
        │
        ▼
GM can see party vitals WITHOUT switching to Command tab
(Command tab still exists and is richer — sidebar is quick-glance only)
        │
        ▼
GM spots Aria at full Stress → adjusts encounter pacing
        │
        ▼
GM taps Aria's tile → navigates to Aria's sheet
        │
        ▼
Sidebar closes
```

### 14.3 New Player Joins Mid-Session

```
Player joins campaign, no character assigned yet
        │
        ▼
PartyOverviewSidebar toggle button is still visible
        │
        ▼
Player opens sidebar → sees all existing party members' tiles
(Player's own tile not yet present — no character assigned)
        │
        ▼
Player can observe party state while assigning their character
```

---

## 15. Edge Cases

| Edge case | Behavior |
|---|---|
| Party of 1 | Single tile, Fear strip still shown |
| Party of 8 (max) | All 8 tiles scroll vertically, no truncation |
| Character has no portrait | Initial letter fallback (existing `CommandCenterCard` pattern) |
| Character data still loading | Show skeleton tile (existing `CommandCenterCard` loading skeleton) |
| All party members healthy | Sidebar looks calm — no red states, no animations. Fear strip still visible. |
| Fear = 0 | Fear strip still shown (empty bar, `0/12`). Fear at 0 is still useful information. |
| EditSidebar opens while Party Overview is open (desktop) | `EditSidebar` (`z-50`) overlays on top of `PartyOverviewSidebar` (`z-40`). Both remain open. When `EditSidebar` closes, `PartyOverviewSidebar` is visible again underneath. |
| Mobile: `PartyDrawer` + `PartyOverviewSidebar` both triggered | `PartyOverviewSidebar` (bottom sheet, `z-45`) and `PartyDrawer` (`z-60`) can coexist — they do not conflict spatially. However, UX recommendation: **close the Party Overview bottom sheet when the Party Drawer opens**, and vice versa, to avoid double-modal confusion on mobile. |

---

## 16. Out of Scope (This Feature)

The following are **intentionally excluded** from this sidebar:

- **Editing any stats** from the sidebar — it is read-only. Editing happens in the character sheet via `EditSidebar`.
- **Dice rolling** from the sidebar — use the existing `DiceRollerPanel`.
- **GM Fear modification** from the sidebar — use the existing `FearTracker` in the main view.
- **Domain/class feature display** — too much detail for a quick-glance panel.
- **Inventory** — not relevant to the sidebar's combat-scan purpose.

---

## 17. Design Tokens Summary

All tokens are already defined in `tailwind.config.ts` and `globals.css`. No new tokens needed except:

| Token | Type | Value | Purpose |
|---|---|---|---|
| `animate-danger-pulse` | Animation | `danger-pulse 1.6s ease-in-out infinite` | Critical HP border pulse (new — see §6.4) |

All other visual tokens (colors, fonts, shadows, existing animations) are reused from the existing design system without modification.

---

## 18. Acceptance Criteria (UX)

The following criteria define when this feature is UX-complete:

- [ ] Party Overview sidebar opens and closes smoothly with appropriate animation on both mobile and desktop
- [ ] Toggle button is always reachable from any tab / any character sheet view without scrolling
- [ ] Every party member in the campaign has a visible tile with correct HP, Stress, Armor, Hope, Evasion, portrait, and name
- [ ] Fear strip is visible at the top of the sidebar panel body and shows the correct `currentFear` value
- [ ] Tiles are sorted most-hurt first
- [ ] A character at critical HP shows coral border, coral HP bar, animated border pulse, and `⚠` icon
- [ ] A character that is Down shows coral tint background, glow shadow, and strikethrough name
- [ ] A character at full Stress shows coral Stress bar and inline `⚠` icon
- [ ] Fear at 10+ shows intensified border and pulsing numeric
- [ ] Tapping a tile navigates to that character's sheet (sidebar closes after navigation)
- [ ] All danger states are communicated by at least two channels (not color alone)
- [ ] Sidebar has correct ARIA role, label, and hidden/inert state when closed
- [ ] Escape key closes the sidebar and returns focus to the toggle button
- [ ] Tab navigation is correct: cycles through tiles, wraps at boundaries (mobile tab-trap, desktop no trap)
- [ ] `animate-danger-pulse` is defined in `tailwind.config.ts` and works in `CommandCenterCard` as well as the new tiles
- [ ] Bottom sheet on mobile sits above the bottom nav bar (`z-index` correctly layered)
- [ ] Desktop panel does not conflict with `EditSidebar` or `ConditionsSidebar` (lower `z-index`, overlaid correctly)
- [ ] Stat value changes flash the affected bar visually (red for decrease, green for increase)
- [ ] Screen reader live region announces stat changes (debounced, polite)
