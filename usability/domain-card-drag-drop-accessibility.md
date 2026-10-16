# Domain Card Drag-and-Drop — Accessibility & Keyboard Interaction Spec

Target: **WCAG 2.1 AA**, with **2.2 AA** success criteria applied where the feature involves dragging (2.5.7), pointer gestures (2.5.1), target size (2.5.8), and focus obscuring (2.4.11).

Scope: the Daggerheart character sheet's **Active Loadout (≤5 cards) ↔ Vault** drag-and-drop, the collapsible Vault drawer, the "Add a domain card" modal, and the reorder-within-loadout interaction. Built with `@dnd-kit`.

---

## 0. Current-state assessment (what exists today)

| Area | Today | Problem |
|---|---|---|
| Drag | Native HTML5 `draggable` + `onDragStart/Enter/End` on `LoadoutCardSlot` (`cursor-grab`) | Pointer-only. Zero keyboard path, zero ARIA. Hard-fails **2.5.7** and **2.1.1**. |
| Remove | Per-card `✕` button (`aria-label="Remove {card} from loadout"`) with an inline Confirm/Cancel for cards that have tokens or an active aura | Fine, but you're removing the `✕`; the move-out-of-loadout affordance must be preserved. Inline Confirm/Cancel swaps buttons in place without moving focus. |
| Reorder | `▲` / `▼` buttons with `aria-label="Move {card} up/down"` | Already keyboard-operable and discoverable — **keep these as the primary accessible reorder path**. |
| List semantics | `role="list"` + `role="listitem"` on `LoadoutCardSlot` | Acceptable for a plain list; see §2 for guidance. |
| Vault picker | `VaultPicker` (`role="listbox"`, `role="option"`, `aria-selected`), `AcquireCardPicker` (same) | Good patterns to reuse in the new modal/drawer. |
| Dialog patterns | `DomainCardDetailSidebar` and `ConditionsSidebar`: `role="dialog"`, `aria-modal="true"`, `aria-labelledby`, `aria-hidden={!open}`, `inert`, focus-first-element, Escape-to-close, `aria-hidden` backdrop | **Mirror these exactly** for the Vault drawer and Add-card modal. |
| Accordion | `SelectionTile` / `LockedCardRow` use `aria-expanded` | Reuse for the modal's collapsible domains. |
| Status messaging | `role="status"`, `aria-live="polite"`, `role="alert"` already used in `CharacterSheet.tsx` | Reuse for drag announcements. |

---

## 1. Keyboard-only alternatives for every drag operation

**Rule of thumb:** every pointer-drag operation has a *primary* explicit control (a real `<button>`) that never depends on `@dnd-kit`, plus an *optional* `KeyboardSensor` accelerator. The explicit controls are the WCAG-compliance path; the sensor is a power-user enhancement.

### 1.1 "Move card from loadout → vault" (replaces the removed `✕`)

**Replacement control:**

- A `<button>` (implicit `role="button"`, do **not** override).
- Accessible name: **`Move {Card Name} to Vault`** (dynamic, includes the card name — e.g. "Move Blade Ward to Vault").
- Placement: in the existing per-card action cluster where the `✕` lived, keeping the current `min-h/min-w` sizing (≥32 px; see §6 target size).
- Icon: a clear "out of loadout" glyph (e.g. box-arrow-down / archive), **with the visible text or an `aria-label`**, never icon-only without an accessible name.

**Confirmation behavior (preserve the existing guard):** moving a card out of the loadout clears its tokens and deactivates an active aura. Keep the inline Confirm/Cancel, but fix its focus management:

1. On first activation of "Move … to Vault", if the card has tokens or an active aura, do **not** immediately move — swap to an inline confirm state and **move focus to the "Confirm" button**.
2. "Cancel" returns focus to the "Move … to Vault" button.
3. Announce the confirmation with `role="alert"` (e.g. "Removing Blade Ward will clear 3 tokens. Confirm or cancel.").

Prefer a small `role="alertdialog"` (nested) for this confirmation rather than a raw inline swap if there is room; the inline pattern is acceptable provided focus is managed as above.

**Keyboard sequence:** Tab to "Move {card} to Vault" → Enter/Space → (optional confirm) → card moves. This satisfies **2.5.7** (single-pointer-free operation) and **2.1.1**.

### 1.2 "Move card from vault → loadout" (vault → loadout, when not full)

**Replacement control:**

- A `<button>` per vault card.
- Accessible name: **`Add {Card Name} to Loadout`**.
- Behavior: same server action as the current swap/drop (`swap-loadout-card`); on success, announce via live region.

**Conveying the disabled (loadout full) state — the important part:**

There are two defensible patterns. Recommend the **hybrid** below because discovery of *why* an action is unavailable matters:

| State | Attributes | Tab order | Rationale |
|---|---|---|---|
| Not full | normal button | reachable | — |
| Full (loadout at 5/5) | `aria-disabled="true"` (NOT the HTML `disabled` attribute), `aria-describedby="<loadout-full-help-id>"` | **kept in tab order** | The user can still reach the button and hear *why* it's unavailable ("Loadout is full (5/5)"). Remove `href`/activation; swallow activation if reached programmatically. |

- The "Loadout is full" help text must be a persistent element with a stable `id`, referenced by `aria-describedby`, **and** duplicated in a `role="status"` live region so state changes are announced (e.g. the moment the 5th card enters the loadout).
- Visually: dim the disabled control but keep it distinguishable; add a lock/`5/5` label rather than relying on opacity alone (see §3, non-color cues).

**Acceptable simpler alternative** (documented, not preferred): use the native `disabled` attribute (removes from tab order) **only if** the reason is always programmatically available via `aria-describedby` on the vault section heading/help text. Native `disabled` alone (silently unfocusable, unexplained) is a failure of **3.3.2** (no instruction for the constraint).

### 1.3 Reordering within the loadout (retain)

**Primary (keep existing):** the `▲`/`▼` buttons. They already provide `aria-label`, disable at boundaries, and are discoverable. They are the WCAG-safe reorder mechanism and the no-JS/no-dnd fallback.

**Accelerator (add, via `@dnd-kit` KeyboardSensor):**

- Make the **drag handle** a focusable `<button>` (currently a decorative `<div>` of three bars) with accessible name **`Reorder {Card Name}`** and `aria-describedby` pointing at the live instructions ("To reorder, press Space or Enter to lift, arrow keys to move, Space or Enter to drop, Escape to cancel.").
- Pressing Space/Enter on the handle picks the card up; Arrow Up/Down move it; Space/Enter drops; Escape cancels.
- Keep `cursor-grab active:cursor-grabbing` on the handle for the pointer path; the handle is now dual-purpose (pointer drag handle + keyboard lift target).

**Recommended pattern choice:** the WAI-ARIA APG **"Listbox with rearrangement"** (roving tabindex) is *not* required here and would fight the multiple nested controls inside each card (view-details, move-up, move-down, move-to-vault, tokens, aura). **Recommendation: keep `role="list"`/`role="listitem"` and natural tab order; do not add roving tabindex.** Reordering is fully served by the `▲/▼` buttons + KeyboardSensor, neither of which needs listbox selection semantics. (See §2.2 for why listbox is a poorer fit.)

---

## 2. ARIA semantics

### 2.1 Container and item roles

- **Loadout list:** keep `role="list"` (the `<div role="list">` in `DomainLoadout.tsx`) with `role="listitem"` per card. This is correct for a *plain, non-selecting* list.
- **Vault list:** `role="list"` + `role="listitem"` (or reuse `VaultPicker`'s `role="listbox"` + `role="option"` if it is a single-select picker — see §2.2).
- Each `listitem` should have an `aria-label` naming the card (already present: `aria-label={card.name, domain card}`).

### 2.2 `listbox` vs `list` — when to use which

| Semantics | Use when | Implication |
|---|---|---|
| `role="list"` + `listitem` | The loadout (no "selected card" concept) | No `aria-selected`. Good. |
| `role="listbox"` + `option` | A *picker* where the user selects a card to act on (the Vault picker, the Acquire picker, the Add-card modal's per-domain lists) | Requires `aria-selected` on the focused/active option, roving tabindex recommended, `aria-activedescendant` or focus management on options. |

The current `VaultPicker`/`AcquireCardPicker` already use `listbox`/`option`/`aria-selected` — **keep that** for the pickers, and do **not** force it onto the loadout list.

If the Add-card modal presents each collapsible domain's cards as a select-then-confirm list, use `role="listbox"`/`option` per domain group. If instead each card is a direct toggle, use `aria-pressed` toggle buttons or checkboxes — do not mix the two patterns in one panel.

### 2.3 `aria-grabbed` / `aria-dropeffect` — deprecated; do not use

- `aria-grabbed` was dropped from WAI-ARIA 1.1 (was a 1.0 draft), was never reliably implemented, and is **removed in ARIA 1.2**. Do not emit it.
- `aria-dropeffect` (`copy|move|link|execute|popup`) was **deprecated in ARIA 1.1** and is effectively unsupported. Do not emit it.

**Use instead:**

1. **Lift state** → `aria-pressed` on the drag-handle button (`false` = at rest, `true` = lifted/dragging). Optional; the live region may be sufficient.
2. **Drop-target state** → `aria-live="polite"` announcements ("Dropping here inserts {Card} at position 3"; "Cannot drop — loadout is full") plus, for the vault drop area, a visible + announced state. The drop area itself can carry `aria-label` ("Vault — drop cards here to return them to the vault") and be included in the announcement, but it should **not** be given a synthetic `role` (it is not a widget; it is a region).
3. **HTML5 `draggable`** provides no ARIA semantics — never rely on it for accessibility. The accessible path is the explicit buttons + KeyboardSensor + announcements.

### 2.4 Help text and state announcements

- Full/not-full help text: `aria-describedby` on the relevant control(s) and section heading, plus a `role="status"` (or `aria-live="polite"`) counter that announces "Loadout has 3 of 5 cards" / "Loadout is full".
- Drag lifecycle announcements (see §3 and §4 for exact strings):
  - Drag start: "Picked up {Card}."
  - Drag over / move: "{Card} moved to position {n}." (polite, debounced)
  - Drop: "{Card} dropped at position {n} in the loadout." / "{Card} moved to Vault."
  - Cancel: "Move cancelled. {Card} returned to position {n}."
  - Invalid target: "Cannot drop here — loadout is full."

### 2.5 Selection state in the Add-card modal

- **Do not use `aria-current`** for selection. `aria-current` means "current item within a set" (current page/step/date) and is **not** the correct attribute for selectable cards.
- Use **`aria-selected`** on `role="option"` list items, or **`aria-pressed`** on toggle buttons, or a **checkbox** `<input>` — one pattern per panel.
- The "Add" / "Acquire" confirmation button reflects the current selection (matches existing `AcquireCardPicker` behavior: an option with `aria-selected`, then an "Acquire card" button with `aria-busy` while pending).

---

## 3. Non-visual equivalents for the drag-state visuals

The three visual states — **dashed drop border**, **darken-others**, **open-hand cursor** — must have non-visual equivalents, and none may be the *sole* means of conveying state.

| Visual | Non-visual equivalent |
|---|---|
| Dashed drop border on the drop target | Live-region announcement on drag-over ("Dropping here…") + a persistent accessible name on the drop area ("Vault — drop cards here"). The border must also meet **3:1 non-text contrast** (see §6). |
| Darken-others (dim non-dragging cards) | Live announcement of which card is lifted and current position; dimming is an *addition*, not the primary cue. Never use opacity alone to mean "disabled/unavailable." |
| Open-hand cursor (`cursor-grab`) | Pointer-only affordance; the keyboard equivalent is the focusable drag-handle button with `aria-label` + instructions. No ARIA maps to cursor. |

**The darken-others overlay (specific requirement #5 in scope):**

- Apply the dimming via a purely visual layer that is **`aria-hidden="true"`** and `pointer-events-none` — it must not introduce any focusable element, must not change the accessibility tree, and must not trap focus.
- **Do not put `inert` on the underlying cards during a pointer drag.** If you *must* suppress interaction with non-dragging cards during the pointer drag, suppress pointer events only (`pointer-events: none`) and leave them keyboard-reachable; a keyboard drag never enters the "darken-others" state anyway (the keyboard path operates card-by-card).
- Confirm: pointer-only dimming is **fine**, provided the underlying content stays keyboard-reachable (or is explicitly, temporarily disabled *with* a live announcement of that disabled state).

---

## 4. `@dnd-kit` keyboard support & announcement configuration

### 4.1 Sensors

```tsx
// conceptual — not a code change request; this is the intended shape
const sensors = useSensors(
  useSensor(PointerSensor),
  useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
);
```

- `KeyboardSensor` (from `@dnd-kit/core`) + `sortableKeyboardCoordinates` (from `@dnd-kit/sortable`).
- The keyboard activator must be the focusable **drag handle** button (§1.3). The sensor listens on the activator for Space/Enter (pick up), arrows (move), Space/Enter (drop), Escape (cancel).
- `sortableKeyboardCoordinates` yields the standard "first/last/increment" coordinate logic so Arrow keys move one slot at a time.

### 4.2 Accessibility prop (`accessibility` on `DndContext`)

`@dnd-kit` provides `screenReaderInstructions` and `announcements`, and internally maintains a live region. Configure both:

**`screenReaderInstructions`** (read once when a user focuses the handle):
- `draggable`: "To pick up this card, press Space or Enter. While dragging, use the arrow keys to move it, Space or Enter to drop, Escape to cancel."

**`announcements`** (routed to the live region on each event):
- `onDragStart(id, overIndex)`: "Picked up {Card Name}."
- `onDragOver(id, overId)`: "{Card Name} moved to position {n}."
- `onDragEnd(id, overId)`: "{Card Name} dropped at position {n} in the loadout."
- `onDragCancel(id)`: "Move cancelled. {Card Name} returned to its previous position."

Notes:
- Prefer **polite** announcements for `onDragOver` (they fire rapidly; assertive would be chatty). `onDragStart`/`onDragEnd` may be assertive.
- Ensure the live region is present **before** the first announcement (mount an empty `aria-live="polite"` container at the loadout root; `@dnd-kit` also renders its own — dedupe to avoid double-announcement).

### 4.3 Fallback non-dnd path (required)

The explicit controls — `Move {card} to Vault`, `Add {card} to Loadout`, and `▲`/`▼` — **do not depend on `@dnd-kit`**. They must:

- work with JavaScript present but `@dnd-kit` failed/missing;
- work when `prefers-reduced-motion` is set (skip the animated drop; the buttons are instantaneous);
- work when the KeyboardSensor is not loaded.

This is what actually satisfies **2.5.7** ("unless dragging is essential, provide a single-pointer alternative") and **2.1.1**. The `@dnd-kit` sensors are progressive enhancement, never the sole mechanism.

---

## 5. Focus management

Mirror the two existing sidebars (`DomainCardDetailSidebar`, `ConditionsSidebar`), which already implement focus-first, focus-trap, Escape, `aria-modal`, and `inert`.

### 5.1 After a drop (pointer or keyboard)

- **Reorder within loadout:** return focus to the **drag handle (activator) of the moved card** at its new position, so the user can continue reordering without hunting.
- **Loadout → Vault (via "Move to Vault"):** move focus to the moved card's **"Add to Loadout" button in the Vault** (makes the action reversible). If the Vault drawer is closed or the card is not visible, focus the **Vault toggle** button.
- **Vault → Loadout (via "Add to Loadout"):** move focus to the newly added card's **drag handle** (or its "Move to Vault" button) in the loadout.

### 5.2 Vault drawer (collapsible drop area)

- Toggle button: `aria-expanded` + `aria-controls` (mirror the existing `DomainLoadout` "Change Loadout" button and `ConditionsSidebar` trigger's `aria-haspopup`/`aria-expanded`).
- On open: move focus to the **first focusable element** in the drawer (or the first vault card's control).
- On close: return focus to the **toggle button**.
- The drawer is a `region` with an accessible name (`aria-labelledby` to the "Vault" heading); it is **not** modal, so it does **not** need `aria-modal` or a full focus trap — but Escape should close it when focus is inside, returning focus to the toggle.
- If the drawer is implemented as a slide-in overlay (like the sidebars), treat it as a `role="dialog"` `aria-modal="true"` with focus trap + `inert` on the closed/background content.

### 5.3 "Add a domain card" modal

Mirror `ConditionsSidebar` exactly:

1. `role="dialog"`, `aria-modal="true"`, `aria-labelledby` → the "Add a domain card" heading (a `useId()` heading id, as in both sidebars).
2. `aria-hidden={!open}` + `inert` when closed; backdrop `aria-hidden="true"` (click to close, but not in the tab order).
3. On open: focus the first focusable element (a heading-level button or the first card).
4. Focus trap: Tab/Shift+Tab cycle within the dialog (the sidebar implementations rely on `inert` for background; ensure a JS trap exists for full compliance — note the current sidebars have a gap here: they set `inert` but do not wrap Tab; recommend adding a small focus-trap helper and applying it to **all three** panels).
5. Escape: close and return focus to the **trigger button** ("Add Card" / the empty slot button). The Escape handler should `stopPropagation` (existing pattern uses capture-phase listener).
6. On close, reset the modal's selection state (mirror `ConditionsSidebar`'s reset-on-close effect).

### 5.4 Known gap to fix while you're here

`ConditionsSidebar` and `DomainCardDetailSidebar` set `inert` on the closed panel but do **not** wrap Tab (they rely on `inert` hiding the background content, which does prevent background tabbing, but the dialog itself has no wrap guard). Add a shared focus-trap (cycle Tab/Shift+Tab within the dialog) and use it in the Vault drawer, Add-card modal, **and** the two existing sidebars for consistency.

---

## 6. Color contrast & non-color cues (palette validation)

Palette: `#0a100d` (near-black bg), `#0f1713` (panel bg), `#b9baa3` (parchment), `#577399` (steel blue), `#f7f7ff` (near-white), `#fe5f55` (coral).

| Foreground | Background | Approx. ratio | Verdict |
|---|---|---|---|
| `#f7f7ff` (text) | `#0a100d` / `#0f1713` | ≈ 19:1 / ≈ 17:1 | Pass AAA |
| `#b9baa3` (text) | `#0a100d` | ≈ 9.7:1 | Pass AA/AAA |
| `#b9baa3` (text) | `#0f1713` | ≈ 9.2:1 | Pass AA/AAA |
| `#577399` (text) | `#0a100d` | ≈ **3.9:1** | **Fails AA for body text (< 4.5:1)**; passes for large text (≥ 3:1) and non-text (3:1) |
| `#fe5f55` (text) | `#0a100d` | ≈ 6.4:1 | Pass AA |
| `#f7f7ff` (text) | `#fe5f55` (bg) | ≈ **2.9:1** | **Fail** — never light text on coral |

**Drag-feature-specific requirements:**

- **Dashed drop border** (`border-steel-400/30` etc.): must be ≥ **3:1 against adjacent bg** (WCAG 1.4.11 non-text contrast). The current `steel-400/30` at 30% alpha is very low — when a drop target is *active*, raise it to a solid, ≥3:1 border.
- **"Loadout full" help text** and dimmed-state labels: ≥ **4.5:1**.
- **Dimmed cards** (`opacity-40`, `saturate-[0.85]`) must still meet 4.5:1 for any text they contain, or the text must be removed/hidden. Dimming a whole card (including its text) below 4.5:1 violates 1.4.3.
- **Focus indicators** on drag handle, move buttons, drop targets: ≥ **3:1** (1.4.11 / 2.4.7), and must not be the only cue that an element is focused.

**Non-color cues (WCAG 1.4.1, 1.3.3):**

- "Darkened = not droppable / not your card" → add an **icon or text** (e.g. a lock, "Full", "Unavailable") — never color/opacity alone.
- Dashed vs solid border → pair with text ("Drop here") or an icon.
- "Full loadout" → the text "5/5" or "Full" must be real text, not just a red/dimmed border.
- "Selected/active" state in the modal → `aria-selected`/`aria-pressed` + a check/radio glyph (the `DomainCardSelectionPanel`/`SelectionTile` already show a radio indicator; keep an `aria-hidden` glyph paired with the state attribute).

**Target size (WCAG 2.5.8, 2.2 AA):** drag handle, "Move to Vault", "Add to Loadout", and reorder buttons must be ≥ **24×24 CSS px** (44×44 preferred to match the codebase's `min-h-[44px]` convention). The existing reorder buttons are 32 px — acceptable; do not shrink the new controls below 24 px.

---

## 7. WCAG success-criteria checklist + acceptance criteria

| # | SC | Title | Applies to | Acceptance criteria |
|---|---|---|---|---|
| 1 | **1.1.1** | Non-text Content | `▲/▼`, `✕`→new icon, drag handle, drop-target glyphs | Every icon-only control has an accessible name; decorative glyphs are `aria-hidden`. |
| 2 | **1.3.1** | Info and Relationships | List/option roles, group headings, help-text association | Loadout = `list`/`listitem`; pickers = `listbox`/`option`; help text linked via `aria-describedby`/`aria-labelledby`. |
| 3 | **1.3.2** | Meaningful Sequence | Reorder buttons, card order | DOM order matches visual order; `▲/▼` and KeyboardSensor move in DOM order. |
| 4 | **1.3.3** | Sensory Characteristics | Drop targets, full/disabled states | No instruction relies on shape/color alone ("press the dashed box"); text/icons accompany every cue. |
| 5 | **1.4.1** | Use of Color | Darken-others, dashed border, full state | Every color-coded state has a non-color indicator (text/icon/pattern). |
| 6 | **1.4.3** | Contrast (Minimum) | Card text, help text, dimmed cards | All text ≥ 4.5:1; dimmed cards keep ≥ 4.5:1 or hide their text. |
| 7 | **1.4.11** | Non-text Contrast | Drop borders, focus rings, disabled indicators | Active drop border and focus indicators ≥ 3:1. |
| 8 | **2.1.1** | Keyboard | All move/add/reorder operations | Every operation performable by keyboard alone (explicit buttons + KeyboardSensor). |
| 9 | **2.1.2** | No Keyboard Trap | Modal & drawer | Tab/Shift+Tab cycle within modal; Escape exits; focus can reach and leave. |
| 10 | **2.4.3** | Focus Order | After drop, after move | Focus lands predictably per §5.1–5.3; no focus loss. |
| 11 | **2.4.7** | Focus Visible | Drag handle, move buttons, drop targets | Visible focus indicator (≥ 3:1) on every interactive element. |
| 12 | **2.4.11** (2.2) | Focus Not Obscured | Drawer/modal over content | Opening a drawer/modal never leaves the focused element permanently obscured; focus moves in/out correctly. |
| 13 | **2.5.1** (2.1) | Pointer Gestures | Drag | Drag uses a single pointer; no multipoint/path-dependent gestures required. |
| 14 | **2.5.7** (2.2) | Dragging Movements | Loadout↔Vault, reorder | A non-drag, single-pointer/keyboard alternative exists for every drag (the explicit buttons + keyboard sensor). |
| 15 | **2.5.8** (2.2) | Target Size (Minimum) | Handles & buttons | All drag/move controls ≥ 24×24 px (44 px preferred). |
| 16 | **3.2.1** | On Focus | Cards, buttons | Focusing a card/button never triggers a move/drop/context change. |
| 17 | **3.2.2** | On Input | Disabled full state | Pressing a disabled/`aria-disabled` control never causes a change; no surprise reloads. |
| 18 | **3.3.2** | Labels or Instructions | Full/not-full states, confirm dialog | "Loadout is full (5/5)" instruction is present and programmatically associated. |
| 19 | **4.1.2** | Name, Role, Value | All new controls | Every control has correct role + accessible name + state (`aria-pressed`, `aria-selected`, `aria-expanded`, `aria-disabled`). |
| 20 | **4.1.3** | Status Messages | Drag start/over/drop/cancel, full-state change | Status changes announced via `aria-live`/`role="status"` without moving focus. |

**Note on `aria-grabbed`/`aria-dropeffect`:** intentionally **not** listed — both are deprecated (ARIA 1.1/1.2); using them is a false positive for a11y tooling and provides no real support. See §2.3.

---

## 8. Implementation checklist (for the Front-End Agent)

1. Replace the `✕` with **"Move {card} to Vault"** button + fixed focus-managed confirm flow.
2. Add **"Add {card} to Loadout"** button per vault card, with `aria-disabled` + `aria-describedby` when full, and a live "Loadout full" status region.
3. Make the drag handle a **focusable button** (`Reorder {card}`) with `cursor-grab` retained for pointer users; wire `KeyboardSensor` + `sortableKeyboardCoordinates`.
4. Configure `DndContext` `accessibility` with `screenReaderInstructions` + `announcements` (§4.2); mount a dedicated `aria-live="polite"` region.
5. Keep `▲/▼` buttons as the always-available reorder path (they are the WCAG fallback).
6. Vault drawer: `aria-expanded`/`aria-controls` toggle, focus-in-on-open, focus-return-on-close, Escape, `region`/`dialog` semantics per §5.2.
7. Add-card modal: `role="dialog"` + `aria-modal` + `aria-labelledby` + focus trap + Escape + reset-on-close; collapsible domains as `aria-expanded` header buttons + `role="group"`/`region`; selection via `aria-selected`/`aria-pressed`.
8. Darken-others overlay `aria-hidden` + `pointer-events-none`; never `inert` the underlying cards during pointer drag.
9. Verify contrast (drop borders ≥ 3:1, text ≥ 4.5:1) and add non-color cues.
10. Add a shared focus-trap helper and apply it to the drawer, modal, **and** the two existing sidebars.
11. Respect `prefers-reduced-motion` (instantaneous moves, no animated drop).

## 9. QA automation handoff

Provide these as automated test cases to the QA Automation Agent:

- Keyboard completes loadout→vault and vault→loadout with `role`/name assertions.
- Full loadout: vault "Add" buttons expose `aria-disabled="true"` and the "full" help text is associated via `aria-describedby`.
- Modal: on open, focus moves to first focusable; Tab wraps; Escape closes and returns focus to trigger.
- Live region announces drag start/end/cancel (assert text content).
- No `aria-grabbed` / `aria-dropeffect` attributes in the DOM.
- Darken-others layer is `aria-hidden` and contributes no focusable nodes.
- Drop border and focus indicators meet 3:1 (via axe + computed style check).
- `prefers-reduced-motion` disables the animated drop.
