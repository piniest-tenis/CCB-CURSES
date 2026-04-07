# Domain Section UX Review

**Date:** 2026-04-07  
**Scope:** All domain-related components in the character sheet  

**Files reviewed:**
- `frontend/src/components/character/DomainLoadout.tsx`
- `frontend/src/components/character/DomainCardSelectionPanel.tsx`
- `frontend/src/components/character/CharacterSheet.tsx`
- `frontend/src/components/character/CollapsibleSRDDescription.tsx`
- `frontend/src/components/character/SelectionTile.tsx`
- `frontend/src/components/character/ActionButton.tsx`
- `frontend/src/components/character/LoadoutValidationIndicator.tsx`
- `frontend/src/app/domains/[domain]/DomainDetailClient.tsx`
- `frontend/src/store/characterStore.ts`
- `frontend/tailwind.config.ts`
- `frontend/src/app/globals.css`

---

## Goal 1: Minimize "Diving" Behavior

### 1.1 Card descriptions are completely hidden in loadout slots — requires clicking into a sidebar to see any card text

- **File:** `DomainLoadout.tsx:842-887`
- **Current behavior:** Each `LoadoutCardSlot` shows only the card name, domain, and level. The card's actual description/ability text is invisible. Users must click the card name to open `DomainCardDetailSidebar` (a full-screen slide-over panel) just to read what their card does.
- **Recommendation:** Add a 1-2 line truncated preview of the card description directly beneath the domain/level metadata row in each loadout slot. For grimoire cards, show the first ability name. The detail sidebar should remain available for full text, but the most critical information — what the card *does* — should be scannable at a glance.
- **Why:** This is the single biggest "diving" issue. During play, a player constantly needs to reference what their 5 active cards do. Forcing a sidebar open for every card read is disruptive to gameplay flow.

### 1.2 The "click to expand" affordance for card detail is a nearly invisible hover-only chevron

- **File:** `DomainLoadout.tsx:875-877`
- **Current behavior:** The only visual hint that a loadout card is clickable to view details is a `›` chevron that appears at `opacity-0` and only becomes visible on `group-hover:opacity-100`. On touch devices, this affordance is invisible.
- **Recommendation:** Make the chevron always visible at a muted opacity (e.g., `opacity-40 group-hover:opacity-100`), or add a subtle "View" text link. On mobile, a persistent "tap for details" cue is needed.
- **Why:** Users on mobile/tablet have zero indication that the card name is tappable for details.

### 1.3 Domain detail sidebar hides card description behind a second panel for DomainCardSelectionPanel locked mode

- **File:** `DomainCardSelectionPanel.tsx:357-366`
- **Current behavior:** In locked mode (post-creation), clicking the `›` button on a `LockedCardRow` replaces the entire card list with `LockedCardDetail`. The user loses their scroll position and context of all other cards.
- **Recommendation:** Use an inline expand (accordion) pattern instead of full-view replacement. When a locked card row is clicked, expand the card detail below it within the list, similar to the accordion pattern already used in creation mode's `SelectionTile`.
- **Why:** The drill-down-replace pattern forces users to lose context of the surrounding cards just to read one card's text, then they must navigate "Back to cards" to return.

### 1.4 Vault picker and Acquire picker are hidden behind a toggle button and mode tabs

- **File:** `DomainLoadout.tsx:1339-1359, 1408-1488`
- **Current behavior:** The vault/acquire picker is completely hidden until the user clicks "Swap Card" / "Change Loadout" / "Add Card", which reveals a panel with two mode-toggle tabs ("Swap from Vault" / "Acquire New Card"), then the actual card list appears. This is 2-3 clicks deep.
- **Recommendation:** When the loadout has fewer than 5 cards AND vault cards are available, show a compact "Vault" section below the loadout slots by default (not behind a toggle). The acquire flow can remain behind a button since it's a less frequent action. Alternatively, collapse the picker with a persistent summary line like "3 cards in vault" that expands inline.
- **Why:** Accessing the vault is a frequent gameplay action (especially during rests). Burying it behind a button + mode toggle + selection adds unnecessary friction.

### 1.5 CollapsibleSRDDescription defaults to collapsed when text exceeds 175px

- **File:** `CollapsibleSRDDescription.tsx:37-39`
- **Current behavior:** When the SRD explanation text (Vault & Loadout rules) exceeds 175px height, it auto-collapses. This text appears at `DomainLoadout.tsx:1412-1419` inside the picker and starts collapsed, requiring a click to read.
- **Recommendation:** Since this SRD description only appears when the picker is already open (an intentional user action), it should default to expanded. Set `heightThreshold` to a higher value (e.g., 400) for this usage, or pass an `initialExpanded` prop.
- **Why:** The user just opened the picker because they want to manage cards. Hiding the relevant rules explanation defeats its purpose.

### 1.6 Empty loadout slots are decorative only — not clickable to add cards

- **File:** `DomainLoadout.tsx:1397-1406`
- **Current behavior:** When fewer than 5 cards are in the loadout, empty dashed-border slots are rendered, but they are non-interactive `<div>` elements.
- **Recommendation:** Make the empty slots clickable buttons that open the card picker (equivalent to clicking "Add Card"). Add a `+` icon or "Add card" label.
- **Why:** Tapping an empty slot is the most intuitive way to add a card. The current empty slots look like they should be interactive but aren't.

---

## Goal 2: Colors Match Design Language (No Unnecessary Alarm)

### 2.1 Loadout card borders and remove button use `burgundy` — the design system's destructive/primary color — for routine UI

- **File:** `DomainLoadout.tsx:827` (card border), `DomainLoadout.tsx:922-931` (remove button)
- **Current behavior:** Every loadout card slot has `border-burgundy-800` and the hover state is `hover:border-burgundy-600`. The remove button uses `text-burgundy-500 hover:bg-burgundy-900/40 hover:text-burgundy-300`. Per `tailwind.config.ts:47-59` and `globals.css:32-33`, burgundy is mapped to `--destructive`, making these cards look alarming.
- **Recommendation:** Switch the default card slot border to `border-steel-400/30` (matching the Features section card border at `CharacterSheet.tsx:1275`), and hover to `hover:border-steel-400/50`. Keep burgundy ONLY for the remove button since removal is genuinely destructive. Better yet, use `text-parchment-500 hover:text-coral-400` for the remove button to differentiate "remove from loadout" (recoverable) from actual deletion.
- **Why:** Burgundy is the app's `--destructive` color. Using it as the default border color for every card makes the entire loadout section look like an error state. The rest of the character sheet uses `steel-400/30` for card borders.

### 2.2 "Change Loadout" / "Swap Card" button uses burgundy styling

- **File:** `DomainLoadout.tsx:1346-1351`
- **Current behavior:** The loadout management toggle button uses `bg-burgundy-800/60 text-parchment-300 border-burgundy-700 hover:bg-burgundy-700`.
- **Recommendation:** Change to `bg-steel-400/15 text-parchment-300 border-steel-400/40 hover:bg-steel-400/25 hover:border-steel-400` to match the "Downtime / Rest" button style at `CharacterSheet.tsx:1763-1768` and other action buttons throughout the sheet.
- **Why:** This is a neutral management action, not a destructive one. The burgundy styling makes it look like a warning/danger button.

### 2.3 AcquireCardPicker container border uses burgundy

- **File:** `DomainLoadout.tsx:283`
- **Current behavior:** `border-burgundy-800 bg-slate-900/50`
- **Recommendation:** Change to `border-steel-400/30 bg-slate-900/50` for consistency with the vault picker and other panels.
- **Why:** The acquire picker is a positive action (getting new cards). It shouldn't be framed with destructive-colored borders.

### 2.4 Acquire card selection items use burgundy borders and hover states

- **File:** `DomainLoadout.tsx:340-342`
- **Current behavior:** Selected state: `bg-burgundy-800 text-parchment-100 border border-burgundy-600`. Unselected hover: `hover:bg-slate-800/50 hover:border-burgundy-700`.
- **Recommendation:** Selected: `bg-steel-400/20 text-parchment-100 border border-steel-400`. Hover: `hover:bg-slate-800/50 hover:border-steel-400/50`. This matches the selection patterns in `SelectionTile.tsx:261` and the conditions sidebar.
- **Why:** Card selection is a positive action. The steel-blue selection color is used consistently elsewhere in the app for "selected/active" states.

### 2.5 LoadoutValidationIndicator uses red (`#fe5f55`) for "loadout full" — an expected, non-error state

- **File:** `LoadoutValidationIndicator.tsx:40-44, 58-59`
- **Current behavior:** When loadout is at 5/5 capacity, the count text and capacity bar segments turn `text-[#fe5f55]` / `bg-[#fe5f55]` (bright red). Having 5 cards is completely normal gameplay.
- **Recommendation:** Use gold/amber (`text-gold-500` / `bg-gold-500`) for the "full" state to indicate "at capacity" without alarm. Reserve red for actual over-capacity errors (which shouldn't occur given the max-5 enforcement). The "3-4 cards" state at `text-[#f7b500]` (amber) is fine.
- **Why:** A full loadout is the expected, healthy state for most characters. Red makes it look like something is wrong.

### 2.6 Curse text container in DomainCardSelectionPanel uses raw `#fe5f55` red

- **File:** `DomainCardSelectionPanel.tsx:75-76`
- **Current behavior:** `border-[#fe5f55]/30 bg-[#fe5f55]/5` with `text-[#fe5f55]/70` for the label.
- **Recommendation:** Change to `border-steel-400/30 bg-slate-900/60` with `text-steel-accessible` for the "Curse" label, matching the sidebar's curse text container at `DomainLoadout.tsx:730-731` which correctly uses `border-steel-400/30 bg-slate-900/60`.
- **Why:** Curse cards are a normal game mechanic (especially in the "Curses!" expansion), not an error. Using alarm-red for their description container is needlessly alarming. The `DomainCardDetailSidebar` already handles this correctly with steel/slate colors.

### 2.7 `VaultPickerItem` shows "above level" cards with burgundy-red text for the level number

- **File:** `DomainLoadout.tsx:1194`
- **Current behavior:** `text-burgundy-500` for cards above character level.
- **Recommendation:** Use `text-parchment-600` (muted neutral) since these cards are already `opacity-40` and `disabled`. The burgundy adds an unnecessary "danger" signal to simply "not yet available" cards.
- **Why:** Cards above your level aren't dangerous; they're just locked. Muted gray communicates unavailability without alarm.

### 2.8 Inline error text color is hardcoded `#fe5f55` rather than using the design system

- **File:** `ActionButton.tsx:40`, `DomainLoadout.tsx:364`
- **Current behavior:** Error messages use `text-[#fe5f55]` as a hardcoded hex value.
- **Recommendation:** Use `text-coral-400` from the design system (`tailwind.config.ts:110`: coral-400 is `#f96854`), which is the designated "homebrew/alert" accent. Alternatively, define a semantic `text-error` utility. This is a minor consistency point but affects all domain action errors.
- **Why:** Hardcoded hex values bypass the design system and make future palette changes harder.

---

## Goal 3: Intuitive and Consistent Controls

### 3.1 Vault picker displacement section border uses inconsistent `burgundy-900/40` separator

- **File:** `DomainLoadout.tsx:1079`
- **Current behavior:** `border-t border-burgundy-900/40` separates the "choose card to displace" section.
- **Recommendation:** Use `border-t border-slate-700/30` to match all other horizontal dividers in the app (e.g., `CharacterSheet.tsx:526`, `SelectionTile.tsx:467`).
- **Why:** Inconsistent divider colors create a visual hierarchy that doesn't exist. All section dividers should use the same neutral color.

### 3.2 The close button style varies between pickers within the same component

- **File:** `DomainLoadout.tsx:289-295` (AcquireCardPicker close: `✕` icon button), `DomainLoadout.tsx:1033-1039` (VaultPicker close: text "Close" button)
- **Current behavior:** AcquireCardPicker has a minimal `✕` button. VaultPicker has a text "Close" link. Both are dismissing the same parent panel but look and behave differently.
- **Recommendation:** Standardize on the same pattern — either both use a text "Close" link (matching the `DomainCardDetailSidebar` pattern), or both use an `✕` icon button. The text "Close" is clearer and more accessible.
- **Why:** Two sub-components that serve the same function within the same section should not have different dismiss controls.

### 3.3 Drag-and-drop reorder has no keyboard alternative beyond arrow buttons

- **File:** `DomainLoadout.tsx:811-813`
- **Current behavior:** Cards have `draggable` for mouse reorder and `▲`/`▼` buttons for keyboard/accessible reorder. However, the arrow buttons at `DomainLoadout.tsx:894-918` use non-standard Unicode characters (`▲`/`▼`) and have very small click targets (`text-xs px-1 py-1`).
- **Recommendation:** Replace the Unicode arrows with proper SVG icons (chevron-up/chevron-down) or FontAwesome icons (matching the rest of the app). Increase the button size to at least 32x32px (`p-1.5 min-w-[2rem] min-h-[2rem]`) for reliable touch targets.
- **Why:** The current arrow buttons are hard to tap on mobile and visually inconsistent with the FontAwesome icon system used everywhere else in the sheet.

### 3.4 The remove button (✕) on loadout cards has no confirmation for cards with tokens or active auras

- **File:** `DomainLoadout.tsx:922-931`
- **Current behavior:** Clicking `✕` immediately calls `removeFromLoadout(cardId)` with no confirmation, even if the card has active tokens or an active aura.
- **Recommendation:** When a card has tokens > 0 or an active aura, show a brief inline confirmation (e.g., "Remove? Tokens will be lost." with Confirm/Cancel) before executing the removal.
- **Why:** Removing a card with tracked state is a semi-destructive action that should have a speed bump, consistent with how the rest of the app handles consequential actions (e.g., the Downtime Modal confirms rest actions).

### 3.5 Token tracker "clear all" (×) button has no differentiation from "remove one" (−)

- **File:** `DomainLoadout.tsx:454-511`
- **Current behavior:** Three token buttons (−, +, ×) are identically sized 24x24px squares with single Unicode characters. The "clear all tokens" button (×) is visually similar to "remove one" (−) and has no warning affordance.
- **Recommendation:** Visually distinguish the "clear all" button — either by making it smaller/more muted (it's a less frequent action), or by adding a brief tooltip/title. Consider moving it slightly apart from the +/− group with a small gap (`ml-1`).
- **Why:** Accidentally clicking "clear all" when intending "remove one" would lose all token progress. The three buttons look identical in size and spacing, making mis-taps likely.

### 3.6 The DomainDetailClient page (public browse) uses accordion-expand for every card — the opposite of the "minimize diving" goal

- **File:** `DomainDetailClient.tsx:43-141`
- **Current behavior:** Every card on the domain browse page starts collapsed and requires clicking to expand. The user must click each card individually to read its text.
- **Recommendation:** For the domain browse page (which is a reference/lookup context), show card descriptions inline by default (expanded). The collapse toggle can remain available for users who want a compact view, but the default should be "expanded" since users visit this page specifically to read card text.
- **Why:** The domain detail page exists for reference. Hiding all content behind accordions defeats the page's purpose.

### 3.7 The `DomainCardDetailSidebar` uses `inert` attribute with a type cast workaround

- **File:** `DomainLoadout.tsx:645`
- **Current behavior:** `inert={!open ? ("" as unknown as boolean) : undefined}` — This is a TypeScript workaround for the `inert` HTML attribute. While not a UX issue per se, it affects focus trapping behavior.
- **Recommendation:** This is fine functionally, but consider using a `ref`-based approach (`panelRef.current?.setAttribute('inert', '')`) to avoid the type cast. This is a minor code quality note, not a user-facing issue.

### 3.8 The acquire/swap mode toggle buttons don't indicate the currently active mode to screen readers

- **File:** `DomainLoadout.tsx:1424-1458`
- **Current behavior:** The mode toggle uses `aria-pressed` correctly, but visually the active/inactive states use color alone (gold vs slate). There's no text or icon indicator.
- **Recommendation:** Add an active indicator beyond color — a subtle underline, a checkmark icon, or bold text weight for the active tab. This helps users with color vision deficiencies.
- **Why:** Color-only differentiation fails WCAG 1.4.1 (Use of Color). The toggle tabs should have a non-color indicator of which mode is active.

---

## Summary Priority Matrix

| Priority | Issue | Impact |
|----------|-------|--------|
| **High** | 1.1 - No card descriptions in loadout slots | Core usability during play |
| **High** | 2.1 - Burgundy borders on all cards | Entire section looks like an error |
| **High** | 2.5 - Red for "full loadout" (normal state) | Misleading status signal |
| **Medium** | 1.4 - Vault buried behind toggle+tabs | Extra clicks for common action |
| **Medium** | 1.6 - Empty slots not clickable | Missed intuitive interaction |
| **Medium** | 2.2 - Burgundy "Change Loadout" button | Destructive styling for neutral action |
| **Medium** | 2.4 - Burgundy selection states in acquire | Inconsistent with rest of app |
| **Medium** | 3.3 - Small reorder arrow buttons | Mobile usability |
| **Medium** | 3.5 - Token "clear all" undifferentiated | Risk of accidental data loss |
| **Low** | 1.2 - Invisible expand chevron on mobile | Touch device affordance |
| **Low** | 1.3 - Locked mode full-view replacement | Context loss in builder |
| **Low** | 1.5 - SRD text defaults collapsed | Minor friction |
| **Low** | 2.3, 2.6, 2.7 - Misc burgundy/red usage | Design consistency |
| **Low** | 2.8 - Hardcoded hex error color | Maintainability |
| **Low** | 3.1, 3.2 - Inconsistent dividers/close buttons | Visual polish |
| **Low** | 3.4 - No confirmation for stateful removal | Edge case safety |
| **Low** | 3.6 - Browse page cards all collapsed | Reference page usability |
| **Low** | 3.8 - Color-only mode toggle indicator | Accessibility |
