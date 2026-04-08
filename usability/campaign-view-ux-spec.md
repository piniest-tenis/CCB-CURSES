# Campaign View UX Architecture Specification

> **Date:** 2026-04-07
> **Scope:** Four campaign-view issues — two mobile usability fixes, one functional restriction, two new feature designs.
> **Key files:**
> - `frontend/src/app/campaigns/[id]/CampaignDetailClient.tsx` (1452 lines)
> - `frontend/src/components/dice/DiceLog.tsx` (452 lines)
> - `frontend/src/components/dice/DiceRollerPanel.tsx` (786 lines)
> - `frontend/src/components/character/CharacterSheet.tsx` (1466 lines)
> - `frontend/src/components/character/ViewerModeContext.tsx` (43 lines)
> - `frontend/src/components/campaign/CondensedCharacterCard.tsx` (279 lines, orphaned)
> - `frontend/src/components/campaign/MemberCard.tsx` (185 lines)
> - `frontend/src/store/campaignStore.ts` (50 lines)

---

## Table of Contents

1. [Mobile Dice Log Placement](#1-mobile-dice-log-placement)
2. [Viewer Mode Action Restrictions](#2-viewer-mode-action-restrictions)
3. [Condensed Mobile Character View](#3-condensed-mobile-character-view)
4. [Command Center View](#4-command-center-view)
5. [Implementation Order](#5-implementation-order)

---

## 1. Mobile Dice Log Placement

### Problem

The dice log overlay is partially hidden by the bottom bar on mobile and overlaps the party pillbox. Three elements fight for `bottom-left` on mobile:

- Dice log FAB: `z-40`, `fixed`, `bottom-[calc(56px+safe-area+12px)]`, `left-4` (`DiceLog.tsx:332`)
- Party drawer FAB: identical positioning (`CampaignDetailClient.tsx:1404`)
- Bottom nav: `z-50`, `fixed`, `bottom-0` (`CampaignDetailClient.tsx:428`)

The dice log panel expands upward from its FAB, overlapping the party pillbox and content area with no spatial boundaries.

### Recommended Approach: Docked Accordion Above Bottom Nav

The dice log becomes a **docked strip that lives directly above the bottom nav bar**, not a free-floating overlay. It is structurally part of the bottom-of-screen chrome, eliminating z-index fights and FAB collisions entirely.

**Why not other approaches:**

| Alternative | Rejection reason |
|---|---|
| Header placement | Too far from thumb zone; header is already dense (back, title, WS indicator, crit pill, actions, overflow) |
| Dedicated tab | Adds a 4th/5th nav item; dice log is ambient, not a destination |
| Slide-up drawer | Same z-index collision as current; adds a new overlay to manage |
| Keep floating, fix z-index | Doesn't solve the spatial collision with the party FAB; band-aid |

### Wireframe: Collapsed State (44px tall)

```
┌──────────────────────────────────┐
│  [main content scrollable area]  │
│                                  │
│                                  │
├──────────────────────────────────┤ ← dice strip: 44px tall
│ 🎲 Last: "Str Check = 14"  [▲]  │   bg-[#0d1610], border-t
├──────────────────────────────────┤
│  👤 Chars  │  👹 Adv  │  ⚔ Enc  │ ← bottom nav: 56px
└──────────────────────────────────┘
```

The collapsed strip shows:

- **Left:** die icon + label of most recent roll + result value (truncated)
- **Right:** chevron-up toggle + roll count badge
- **No rolls:** "🎲 Dice Log" in muted text

### Wireframe: Expanded State (44px header + 40vh list)

```
┌──────────────────────────────────┐
│  [content — pushed up or under]  │
├──────────────────────────────────┤
│  DICE LOG                [▼] [×] │ ← header: 36px
│  ┌────────────────────────────┐  │
│  │ Str Check     14    10:32  │  │ ← roll entries, scrollable
│  │ Damage Roll    8    10:31  │  │   max-height: 40vh
│  │ Action Roll   17    10:28  │  │
│  └────────────────────────────┘  │
│  [+ Custom]              [Clear] │ ← footer actions
├──────────────────────────────────┤
│  👤 Chars  │  👹 Adv  │  ⚔ Enc  │
└──────────────────────────────────┘
```

### Interaction Patterns

| Action | Result |
|---|---|
| Tap collapsed strip | Expand. Transition: `max-height` from 44px to `44px + 40vh`, 250ms ease-out. |
| Tap ▼ or × in expanded header | Collapse back to strip. |
| New roll arrives | Strip flashes briefly (100ms bg pulse to `#577399/20`), updates preview text. If expanded, auto-scrolls to newest entry. |
| Swipe down on expanded panel | Collapse (same gesture as party drawer swipe-to-close). |
| Custom roll tray | Opens inline within expanded panel, same as current behavior. |

### Mobile vs Desktop

- **Mobile (`< sm`):** Docked strip above bottom nav. Full-width. The party drawer FAB moves to `right-4` instead of `left-4` (dice strip replaces its left-side position).
- **Desktop (`sm`+):** Keep the current floating panel at bottom-left. No bottom nav on desktop, so no collision. The floating pattern is fine there.

### Visual Design

- Strip background: `bg-[#0d1610]` (matches current dice log panel)
- Border: `border-t border-[#577399]/30`
- Roll preview text: `text-xs font-semibold text-[#f7f7ff]` (value), `text-[#b9baa3]` (label)
- Minimum height: 44px (WCAG 2.5.5 touch target)
- Expanded panel: inherits all current DiceLog styling (entries, detail view, outcome badges)

### Edge Cases

- **No rolls:** Strip shows "🎲 Dice Log" muted. Tap opens expanded view with "No rolls yet" empty state + Custom Roll option.
- **Long roll labels:** Truncate with `truncate` class at ~60% of strip width. Full label in expanded view.
- **DiceRollerPanel open simultaneously:** The roller slides in from the right as a full-height overlay (`z-50`). The docked strip remains visible underneath. No conflict.
- **Player (non-GM) on mobile:** Players don't see the bottom nav (`CampaignDetailClient.tsx:1422`, GM-only). Dice strip docks to actual bottom with safe-area inset.
- **100+ rolls:** Badge shows "99+" per existing logic (`DiceLog.tsx:444`).

### Priority: **1st (Highest)**

Blocking usability bug on every mobile session.

---

## 2. Viewer Mode Action Restrictions

### Problem

GMs can attempt to change a player's dice colors from the campaign sheet viewer, but it's broken. More broadly, the viewer mode gating is inconsistent. Some actions are hidden, some are still interactive, and the user has no clear indication they're in a read-only context.

### Current State Audit

| Location | Action | Current behavior | Correct behavior |
|---|---|---|---|
| `CharacterSheet.tsx:616-712` | Dice Colors | Hidden via `{!viewerMode && ...}` | Should be visible-but-disabled (shows configured colors) |
| `CharacterSheet.tsx:405-430` | Edit / Share buttons | Hidden | Correct (no informational value) |
| `CharacterSheet.tsx:586-601` | Level Up button | Hidden | Should be visible-but-disabled |
| `CharacterSheet.tsx:714-724` | Conditions sidebar | Hidden | Should show conditions read-only, disable toggle |
| `FeatureActionButton:753` | Action buttons | Returns `null` | Should be visible-but-disabled |
| `CharacterSheet.tsx:1343-1361` | Save status + Downtime | Hidden | Correct for save; downtime should be visible-but-disabled |

**Root cause of dice color bug:** `CampaignDetailClient.tsx:214` passes `viewerMode={isGm}` — the GM *always* sees viewer mode, even for their own character. This should be `viewerMode={isGm && selectedCharacterId !== myCharId}`.

### Recommended Approach: Show Disabled + Contextual Banner

Actions requiring character-owner context are **visible but disabled** (not hidden). A persistent, compact **viewer mode banner** communicates the context.

### Three-Tier Action Classification

| Tier | Examples | Viewer mode behavior |
|---|---|---|
| **View** (pure display) | Stats, HP bars, features text, equipment list, conditions list | Normal rendering |
| **GM-Valid** (GM should use) | Ping, stat tooltips, expand/collapse sections | Normal rendering |
| **Owner-Only** (requires owner) | Dice colors, edit, share, level up, downtime, conditions toggle, action buttons, roll from sheet | Visible but disabled with tooltip |

### Viewer Mode Banner

Replace the current dismissible GM ping banner (lines 185-213) with a permanent, compact context bar:

```
┌────────────────────────────────────────────────┐
│ ♛ Viewing Kael's Sheet          [Ping Help ⓘ] │
├────────────────────────────────────────────────┤
│  [character sheet content below]               │
```

- Height: ~32px
- Background: `bg-[#DAA520]/5 border-b border-[#DAA520]/20`
- Text: `text-xs text-[#DAA520]/70` — "Viewing [Character Name]'s Sheet"
- Right side: "Ping Help" link that expands the ping instructions (replaces the separate dismissible banner)

### Disabled Action Treatment

Owner-only actions render with:

```
opacity-40
cursor-not-allowed
pointer-events-none  (on the button)
aria-disabled="true"
```

Wrapping `<div>` has `title="View only — this action is available to the character owner"` for desktop hover tooltip.

### Wireframe: Disabled Dice Colors

```
┌─ Dice Colors ──────────────────────────────┐
│  ▸ Dice Colors    [■][■][■]    🔒 View only│
│     (collapsed, non-interactive,            │
│      swatches visible, lock icon)           │
└─────────────────────────────────────────────┘
```

### Wireframe: Disabled Action Button

```
┌────────────────────────────────────────┐
│  [Use Veilstep]  1 Hope               │  ← 40% opacity, cursor-not-allowed
│                                        │     tooltip: "View only"
└────────────────────────────────────────┘
```

### Implementation Notes

1. **Create a `DisabledInViewerMode` wrapper component** that accepts children and, when `useViewerMode()` is true, wraps them with disabled styling + tooltip. Avoids scattering `viewerMode ? disabled : normal` ternaries everywhere.

2. **Audit every `{!viewerMode && ...}` gate** in `CharacterSheet.tsx` and children. Change from "hide" to "show disabled" for owner-only actions. Keep "hide" only for pure chrome with no informational value (e.g., `SaveStatus`).

3. **Fix the root bug:** In `CampaignDetailClient.tsx:214`, change:
   ```tsx
   // Before:
   <CharacterSheet characterId={characterId} viewerMode={isGm} />
   // After:
   <CharacterSheet characterId={characterId} viewerMode={isGm && selectedCharacterId !== myCharId} />
   ```

4. **Dual dice log rendering is fine:** `CampaignDetailClient.tsx:1440` renders `<DiceLog>` at the campaign level. `CharacterSheet.tsx:1463` renders `{!viewerMode && <DiceLog />}` inside the sheet. When GM views another player's sheet, the sheet's log is hidden (correct), and the campaign-level one persists. These are separate instances.

### Edge Cases

- **GM viewing own character:** `viewerMode` should be `false` (they own it). Current code is bugged — always passes `viewerMode={isGm}`.
- **Multiple GMs:** Same logic — if the viewing user owns the character, viewer mode is off.
- **Conditions display:** Read-only list remains visible. Only the toggle sidebar is disabled.

### Mobile vs Desktop

No difference. Viewer mode is the same across breakpoints.

### Priority: **2nd**

Active bug (dice colors) with straightforward fix. Existing `ViewerModeContext` infrastructure just needs to be made consistent.

---

## 3. Condensed Mobile Character View

### Problem

On mobile, the full character sheet (1466 lines of rendered content — stats, trackers, features, equipment, favors, companions, downtime, notes) requires extensive scrolling. GMs in combat need HP/Stress/Armor/Evasion at a glance, not a scroll expedition.

### Existing Asset

`CondensedCharacterCard.tsx` (279 lines, orphaned) has:
- Compact HP/Stress/Armor slot bars (`SlotBar` component)
- Stat value chips (`StatChip` component)
- Domain loadout pill display
- Conditions count
- Loading skeleton with fallback props
- `onExpand` callback

**Known issues with the existing component:**
- References `steel-400` and `coral-400` Tailwind tokens that **do not exist** in `tailwind.config.ts` — these will silently render with no color
- `slate-850` is fine (exists in the config)
- `parchment-*` tokens exist in the config and work correctly

### Recommended Approach: Condensed Card as Default Mobile View with Expand Toggle

On mobile, selecting a character shows the **condensed card first**. A "Full Sheet" button expands to the full `CharacterSheet`. Two-tier drill-down: roster → condensed card → full sheet.

### Wireframe: Condensed Card (~340-380px total height)

```
┌───────────────────────────────────────────┐
│ ┌─────┐  Kael the Swift                   │
│ │ AVA │  Firbolg Ranger · Lv 5            │
│ └─────┘                      [Full Sheet ▸]│
├───────────────────────────────────────────┤
│  EVASION   ARMOR    HOPE                  │
│  [ 14 ]    [ 12 ]   [ 4/6 ]              │
├───────────────────────────────────────────┤
│  HP      ████████░░░░░░    5/10           │
│  Stress  ███░░░░░░░░░░░    2/8            │
│  Armor   ██████░░░░░░░░    3/6            │
├───────────────────────────────────────────┤
│  Thresholds   Major 5  │  Severe 10       │
├───────────────────────────────────────────┤
│  Domains                                  │
│  [Blade: Whirlwind] [Bone: Rally]         │
│  [Sage: Arcane Ward]                      │
├───────────────────────────────────────────┤
│  Conditions                               │
│  [Vulnerable] [Restrained]                │
│                        (or "None active") │
└───────────────────────────────────────────┘
```

Fits on a 667px iPhone screen with header, dice strip, and bottom nav.

### Integration with Campaign View

**Mobile only** (`< sm`): Condensed card replaces `SheetPingWrapper > CharacterSheet` as default view.

**Desktop** (`sm`+): Always renders full sheet (desktop has the space).

**Toggle mechanism:** Local state `showFullSheet`. The "Full Sheet" button sets it to `true`, rendering the full `SheetPingWrapper`. A "← Summary" link returns to condensed. State resets to `false` when selecting a different character.

**Approximate code change in `CampaignDetailClient.tsx` (around line 1321):**

```tsx
{selectedCharacterId && (
  <>
    {/* Mobile: condensed view with expand option */}
    <div className="sm:hidden">
      {showFullSheet ? (
        <>
          <button onClick={() => setShowFullSheet(false)}>
            ← Summary
          </button>
          <SheetPingWrapper ... />
        </>
      ) : (
        <CondensedCharacterCard
          characterId={selectedCharacterId}
          onExpand={() => setShowFullSheet(true)}
        />
      )}
    </div>
    {/* Desktop: always full sheet */}
    <div className="hidden sm:block">
      <SheetPingWrapper ... />
    </div>
  </>
)}
```

### Visual Design: Color Token Fixes

The orphaned component must have its broken tokens replaced before use:

| Broken token | Replacement |
|---|---|
| `border-steel-400/30` | `border-[#577399]/30` |
| `border-steel-400/20` | `border-[#577399]/20` |
| `border-steel-400/40` | `border-[#577399]/40` |
| `bg-steel-400/10` | `bg-[#577399]/10` |
| `bg-steel-400/20` | `bg-[#577399]/20` |
| `bg-steel-400` | `bg-[#577399]` |
| `text-steel-accessible/40` | `text-[#b9baa3]/40` |
| `border-coral-400/40` | `border-[#fe5f55]/40` |
| `text-coral-400` | `text-[#fe5f55]` |
| `shadow-card` (on the card) | `shadow-card` (exists in tailwind config, fine) |

General styling (matching the rest of the app):
- Card: `bg-slate-900/80 border border-[#577399]/20 rounded-xl`
- Labels: `text-[10px] uppercase tracking-wider text-[#b9baa3]/60`
- Values: `text-lg font-bold tabular-nums text-[#f7f7ff]`
- Bar fills: HP `bg-emerald-500`, Stress `bg-violet-500`, Armor `bg-[#577399]`
- Domain pills: `rounded-full border border-[#577399]/20 bg-slate-850 px-2 py-0.5 text-[11px]`
- Condition pills: `border-[#fe5f55]/30` when active
- "Full Sheet" button: 44px min-height, `border border-[#577399]/30 bg-[#577399]/10`

### Edge Cases

| Case | Handling |
|---|---|
| No portrait/avatar | Hide avatar area, name takes full width |
| Long character name | `truncate`, full name in `title` attr, single line |
| No domain loadout | Hide domains section entirely |
| No active conditions | Show "None active" in muted text (conditions are combat-critical; GM needs to see zero) |
| Data still loading | Existing skeleton + fallback props from campaign member data for instant header |
| Broken color tokens | **Must be replaced before first use** (see table above) |

### Mobile vs Desktop

- Mobile: Condensed card is default, expand to full sheet via toggle.
- Desktop: Full sheet always. Condensed card is never shown on desktop.

### Priority: **3rd**

Quality-of-life improvement. Depends on Issue #1 (dice strip) and #2 (viewer mode) being stable. Enables Issue #4.

---

## 4. Command Center View

### Problem

No party-wide dashboard exists. GMs see one character at a time and must hold party state in their head during combat — exactly the cognitive load a digital tool should eliminate.

### Recommended Approach: New "Command Center" Tab with Party Vitals Grid

A new GM-only tab that displays all party members' vitals simultaneously in a responsive card grid with danger-state color coding and thematic visual treatment.

### Tab Bar Update

Add `"command"` to `CampaignTab` type in `campaignStore.ts`. Make it the default landing tab.

```typescript
// campaignStore.ts
export type CampaignTab =
  | "command"       // NEW
  | "characters"
  | "adversaries"
  | "encounter"
  | "environments";

// Default:
activeTab: "command",
```

```typescript
// CampaignDetailClient.tsx
const GM_TABS = [
  { id: "command",     label: "Command",     icon: "🏰" },  // NEW
  { id: "characters",  label: "Characters",  icon: "👤" },
  { id: "adversaries", label: "Adversaries", icon: "👹" },
  { id: "encounter",   label: "Encounter",   icon: "⚔️" },
];
```

### Wireframe: Mobile (Vertical Stack)

```
┌─────────────────────────────────────────┐
│ ♛ COMMAND CENTER           Fear: 3/12   │
│ Party Hope: 17                          │
├─────────────────────────────────────────┤
│ ┌─ Kael the Swift ──────────────────┐   │
│ │  ┌───┐  HP  ██████░░░░  5/10     │   │
│ │  │ K │  STR ████████░░  6/8      │   │
│ │  │   │  ARM ██░░░░░░░░  1/6      │   │
│ │  └───┘  Hope: 4   Evasion: 14    │   │
│ │         [Vulnerable]              │   │
│ └───────────────────────────────────┘   │
│ ┌─ Nia Thornbloom ──────────────────┐   │
│ │  ┌───┐  HP  ██████████  8/8      │   │
│ │  │ N │  STR ░░░░░░░░░░  0/6      │   │
│ │  │   │  ARM ████████░░  4/6      │   │
│ │  └───┘  Hope: 6   Evasion: 11    │   │
│ └───────────────────────────────────┘   │
│ ┌─ Brynn Ashveil ───────────────────┐   │  ← CRITICAL
│ │  ┌───┐  HP  ██░░░░░░░░  1/10  ⚠  │   │    state
│ │  │ B │  STR ████████░░  6/8      │   │
│ │  │   │  ARM ░░░░░░░░░░  0/6      │   │
│ │  └───┘  Hope: 2   Evasion: 9     │   │
│ │         [Stunned] [Vulnerable]    │   │
│ └───────────────────────────────────┘   │
├─────────────────────────────────────────┤
│ 🏰 Cmd │ 👤 Chars │ 👹 Adv │ ⚔ Enc   │
└─────────────────────────────────────────┘
```

### Wireframe: Desktop (Responsive Grid)

```
┌──────────────────────────────────────────────────────────────┐
│ ♛ COMMAND CENTER                                Fear: 3/12  │
│ Party Hope: 17                                              │
├──────────────────────┬──────────────────────┬────────────────┤
│  Kael the Swift      │  Nia Thornbloom      │  Brynn Ashveil │
│  ┌──┐ HP ████░░ 5/10 │  ┌──┐ HP ████ 8/8   │  ┌──┐ HP █░ ⚠ │
│  │K │ ST ██░░░ 6/8   │  │N │ ST ░░░░ 0/6   │  │B │ 1/10    │
│  │  │ AR ░░░░░ 1/6   │  │  │ AR ███░ 4/6   │  │  │ ST 6/8  │
│  └──┘ Hope:4 Eva:14  │  └──┘ Hope:6 Eva:11 │  └──┘ AR 0/6  │
│  [Vulnerable]        │                      │  Hope:2 Eva:9  │
│                      │                      │  [Stun][Vuln]  │
├──────────────────────┼──────────────────────┼────────────────┤
│  Dax Ironjaw         │  Mira Starweave      │                │
│  ┌──┐ HP ████ 7/8    │  ┌──┐ HP ██░░ 3/6   │                │
│  │D │ ST ██░░ 2/6    │  │M │ ST ████ 4/6   │                │
│  │  │ AR ███░ 3/4    │  │  │ AR ░░░░ 0/4   │                │
│  └──┘ Hope:5 Eva:12  │  └──┘ Hope:1 Eva:10 │                │
└──────────────────────┴──────────────────────┴────────────────┘
```

Desktop grid: `grid-cols-2 lg:grid-cols-3` with `gap-3`.

### Card Anatomy

```
┌─ [Character Name] ────────────────────────┐
│                                            │
│  [Avatar]   HP  [═══════░░░]  curr/max     │
│    40x40    STR [═══░░░░░░░]  curr/max     │
│             ARM [░░░░░░░░░░]  curr/max     │
│                                            │
│  Hope: N        Evasion: N                 │
│                                            │
│  [condition] [condition]                   │
└────────────────────────────────────────────┘
```

- **Header:** `font-serif text-sm font-semibold`, left-aligned. Entire card is tappable.
- **Avatar:** 40x40 `rounded-full`, falls back to initial letter (same as `MemberCard`).
- **Bars:** Label (2-3 char, `text-[10px] uppercase`, 28px fixed width) + segmented bar (fills remaining space) + value (`curr/max`, `text-xs tabular-nums font-semibold`, 40px right-aligned).
- **Hope:** Inline, `text-[#DAA520]`. Format: `Hope: N` (or `N/max` if `hopeMax` available).
- **Evasion:** Inline next to Hope, `text-[#f7f7ff]`. Format: `Eva: N`.
- **Conditions:** Compact pills, max 3 visible + `+N` overflow. `rounded-full border px-1.5 py-0.5 text-[10px]`.

### Danger-State Color Coding

| State | HP Threshold | Bar Color | Card Border | Extra |
|---|---|---|---|---|
| Healthy | > 50% | `bg-emerald-500` | `border-[#577399]/20` | None |
| Wounded | 25-50% | `bg-amber-400` | `border-amber-400/40` | None |
| Critical | < 25% | `bg-[#fe5f55]` | `border-[#fe5f55]/40` | Pulse animation on border |
| Down | 0 HP | `bg-[#fe5f55]` | `border-[#fe5f55]/60` | Card bg `bg-[#fe5f55]/5`, name `line-through` |

**Critical pulse animation:**

```css
@keyframes danger-pulse {
  0%, 100% { border-color: rgba(254, 95, 85, 0.4); }
  50%      { border-color: rgba(254, 95, 85, 0.7); }
}
/* 2s ease-in-out infinite. Respects prefers-reduced-motion. */
```

### Thematic Elements

1. **Card border glow on danger:** Critical HP cards get `box-shadow: 0 0 8px rgba(254,95,85,0.15)`.
2. **Header typography:** "COMMAND CENTER" in `font-display` (jetsam-collection-basilea), `tracking-[0.3em] uppercase`. War-room aesthetic.
3. **Fear tracker integration:** Full `FearTracker` component renders at top of Command Center tab. Puts party vitals + Fear on the same screen.
4. **Auto-sort by danger:** Cards sort by HP percentage ascending (most-hurt first). `transition-all duration-500` on grid items animates resorting.
5. **Party Hope total:** Summary line below header: "Party Hope: 17" — sum of all members' Hope.

### Interaction Patterns

| Action | Result |
|---|---|
| Tap a card | Navigate to Characters tab with that character selected. Mobile: condensed card (Issue #3). Desktop: full sheet. |
| Long-press a card (GM) | Open context menu for the "header" field key — sends ping to that player. |
| Pull down | Standard TanStack Query refetch. Data also updates in real-time via WebSocket. |

Cards are **read-only**. No HP/Stress/Armor modification from the command center. GM must tap through for that.

### Relationship to CondensedCharacterCard

The Command Center card is a **further condensation**. They share `SlotBar` and `StatChip` sub-components (extract into `components/campaign/shared/`).

**Command Center card omits** (vs. condensed card):
- Domain loadout
- Damage thresholds
- "Full View" button (replaced by tap-to-navigate)

**Command Center card adds:**
- Danger-state color coding
- Sort-by-danger behavior

**Component hierarchy:**

| Component | Purpose | Detail level |
|---|---|---|
| `CommandCenterCard` | Grid card in party dashboard | Minimal (HP/Stress/Armor/Hope/Eva/Conditions) |
| `CondensedCharacterCard` | Individual character summary | Medium (adds thresholds, domains) |
| `CharacterSheet` | Full character sheet | Full |

### Edge Cases

| Case | Handling |
|---|---|
| Solo campaign (1 player) | Single card, centered. Still useful. |
| Large party (6+) | Mobile: vertical scroll, each card ~120px, 6 fit in ~720px. Desktop: `grid-cols-3`, 2-row grid. Beyond 6: vertical scroll. |
| No characters assigned | Message: "No characters in this campaign yet. Invite players from the Characters tab." |
| Data loading | Skeleton cards at correct grid positions, using `fallbackName` from campaign member data. |
| Long character names | `truncate` with `max-w-[200px]`. Single line. |
| All healthy | No color-coded danger is itself information — "everyone's fine." |
| Missing Hope data | Default to `0`. Field exists on all characters. |
| GM has own character | Their card appears in grid like any other. |
| WebSocket disconnect | Cards show last-known data. Connection indicator in header handles this globally. |

### Visual Design

- Card size: min-width 280px, max-width 400px (desktop). Full-width (mobile).
- Card background: `bg-slate-900/80`, shifts on danger state.
- Card padding: `p-3` (tighter than condensed card's `p-4`).
- Bar height: `h-2.5` (shorter than condensed card's `h-3`).
- Labels: `text-[10px] uppercase tracking-wider text-[#b9baa3]/60`
- Values: `text-xs font-semibold text-[#f7f7ff]`
- Container: `shadow-card` for thematic weight.

### Priority: **4th (Last)**

New feature with highest GM impact but most work. Depends on all three prior issues.

---

## 5. Implementation Order

| Priority | Issue | Type | Effort | Rationale |
|---|---|---|---|---|
| **1** | Mobile Dice Log | UX fix | Medium | Blocking usability bug on every mobile session |
| **2** | Viewer Mode Actions | Functional fix | Small–Medium | Active bug (dice colors); straightforward fix with existing infra |
| **3** | Condensed Character View | New feature | Medium | Depends on fixed dice strip + viewer mode; enables Issue #4 |
| **4** | Command Center | New feature | Large | Depends on all three above; highest UX impact but most work |

### Dependency Graph

```
Issue #1 (Dice Log) ──────────┐
                               ├──→ Issue #3 (Condensed Card) ──→ Issue #4 (Command Center)
Issue #2 (Viewer Mode) ───────┘
```

Issues #1 and #2 are independent of each other and can be developed in parallel. Issue #3 requires both to be stable. Issue #4 requires Issue #3 for shared sub-components and the mobile drill-down target.
