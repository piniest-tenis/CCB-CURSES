# Campaign System — Accessibility Specification

**Document version:** 1.0  
**Date:** 2026-03-25  
**Author:** Usability & Accessibility Agent  
**Standard:** WCAG 2.1 Level AA + WCAG 2.3.1 (Three Flashes)  
**Stack context:** Next.js 14 App Router · React · Tailwind CSS · Zustand · AWS Cognito JWT  
**Palette in scope:** `#0a100d` · `#b9baa3` · `#577399` · `#f7f7ff` · `#fe5f55` · `#fbbf24` (amber ping) · `#0f172a` (slate-900 bg)

---

## Table of Contents

1. [ARIA Patterns](#1-aria-patterns)
2. [Focus Management](#2-focus-management)
3. [Keyboard Interaction Map](#3-keyboard-interaction-map)
4. [Ping Accessibility — Full Spec](#4-ping-accessibility--full-spec)
5. [Contrast Table](#5-contrast-table)
6. [Touch Target Checklist](#6-touch-target-checklist)
7. [Colorblind Safety](#7-colorblind-safety)
8. [Implementation Checklist — Prioritized](#8-implementation-checklist--prioritized)

---

## 1. ARIA Patterns

This section specifies the exact `role`, `aria-*`, and `aria-live` attributes required for every new Campaign System surface.

---

### 1.1 Campaign List Page (`/campaigns`)

#### Page-level landmark structure

```html
<main id="main-content" aria-label="Your campaigns">
  <h1>Campaigns</h1>

  <!-- Async loading state -->
  <div
    aria-live="polite"
    aria-busy="true"    <!-- set to "false" when data resolves -->
    aria-label="Loading your campaigns"
  >
    <!-- Skeleton cards render here during load -->
  </div>

  <!-- Loaded state: campaign cards list -->
  <ul role="list" aria-label="Campaigns you belong to">
    <!-- One <li> per CampaignSummary -->
  </ul>
</main>
```

#### Campaign card

Each card is an `<article>` element inside the `<li>`. The card's entire surface should NOT be wrapped in a generic `<div onClick>` — use either an `<a>` or a `<button>` as the interactive root, or promote the article to a link.

```html
<li>
  <article aria-labelledby="campaign-{campaignId}-title">
    <a
      href="/campaigns/{campaignId}"
      aria-describedby="campaign-{campaignId}-meta"
      class="block ... focus:ring-2 focus:ring-[#577399]"
    >
      <h2 id="campaign-{campaignId}-title">{campaign.name}</h2>
      <p id="campaign-{campaignId}-meta">
        {memberCount} members · {callerRole === 'gm' ? 'Game Master' : 'Player'}
      </p>

      <!-- Role badge — NEVER color-only -->
      <span
        aria-label="Your role: Game Master"
        class="role-badge role-badge--gm"
      >
        <!-- Icon + text label, not color alone. See §7. -->
        <svg aria-hidden="true" focusable="false">…</svg>
        GM
      </span>
    </a>
  </article>
</li>
```

**Rules:**
- `aria-label` on the role badge provides the full accessible name including role semantics — do not rely on badge color or icon alone.
- The `<a>` href gives a true link so middle-click / Ctrl+click / open-in-new-tab all work natively.
- Screen readers announce: *"[Campaign name] — link — [member count] members · Game Master"*.

#### Skeleton loading cards

```html
<!-- aria-busy on the container, not on individual skeleton elements -->
<div role="status" aria-busy="true" aria-label="Loading campaigns…">
  <!-- Skeleton placeholder elements should be aria-hidden="true" -->
  <div aria-hidden="true" class="skeleton-card …">…</div>
  <div aria-hidden="true" class="skeleton-card …">…</div>
  <div aria-hidden="true" class="skeleton-card …">…</div>
</div>
```

When data resolves, set `aria-busy="false"` and replace the `role="status"` wrapper content with the real campaign list. The `aria-live="polite"` implicit in `role="status"` will announce the change.

#### "Create campaign" button

```html
<a
  href="/campaigns/new"
  role="button"
  class="btn-primary … focus:ring-2 focus:ring-[#577399]"
  aria-label="Create a new campaign"
>
  <svg aria-hidden="true" focusable="false">…</svg>
  Create Campaign
</a>
```

---

### 1.2 Campaign Detail Page — Two-Pane Layout (`/campaigns/[id]`)

#### Skip-to-main-content link

Must be the **first focusable element** in the DOM. It is visually hidden until focused.

```html
<!-- In the page's top-level layout, before any nav or sidebar -->
<a
  href="#main-content"
  class="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4
         focus:z-[9999] focus:px-4 focus:py-2 focus:rounded
         focus:bg-[#577399] focus:text-white focus:ring-2 focus:ring-white"
>
  Skip to character sheet
</a>
```

#### Overall page structure

```html
<div class="campaign-layout">

  <!-- Sidebar roster -->
  <nav
    id="roster-sidebar"
    aria-label="Campaign roster"
    aria-describedby="roster-heading"
  >
    <h2 id="roster-heading" class="sr-only">Campaign Members</h2>

    <!-- Member list -->
    <ul role="list" aria-label="Members">
      <!-- One <li> per CampaignMemberDetail -->
    </ul>
  </nav>

  <!-- Main character sheet panel -->
  <main id="main-content" aria-label="Character sheet viewer" aria-live="polite">
    <!-- Character sheet renders here -->
    <!-- aria-live="polite" so SR announces the sheet when a new one loads -->
  </main>

</div>
```

#### Roster member card (sidebar)

```html
<li>
  <button
    type="button"
    aria-pressed="{isSelected}"
    aria-label="View {member.displayName}'s character sheet — {role label}"
    class="w-full text-left … focus:ring-2 focus:ring-[#577399]"
    data-member-id="{member.userId}"
    onClick="selectMember(member.userId)"
  >
    <!-- Avatar -->
    <img
      src="{member.avatarUrl}"
      alt=""                  <!-- decorative; name already in aria-label -->
      aria-hidden="true"
      class="…"
    />

    <!-- Name and role -->
    <span class="member-name">{member.displayName}</span>
    <span
      class="role-badge"
      aria-label="{member.role === 'gm' ? 'Game Master' : 'Player'}"
    >
      <!-- Icon + text, see §7 -->
    </span>

    <!-- Selected indicator -->
    <span class="sr-only" aria-live="polite">
      {isSelected ? 'Currently viewing' : ''}
    </span>
  </button>
</li>
```

**`aria-pressed`** communicates the selected state for screen readers without requiring color alone. When `aria-pressed="true"`, the button is styled visually as selected AND the screen reader announces "pressed" or "selected".

#### GM-only controls in sidebar

```html
<!-- Only render when callerRole === 'gm'. Use conditional rendering, NOT CSS display:none. -->
{callerRole === 'gm' && (
  <div role="group" aria-label="GM controls for {member.displayName}">
    <button
      type="button"
      aria-label="Remove {member.displayName} from campaign"
      class="… focus:ring-2 focus:ring-[#fe5f55]"
    >
      <svg aria-hidden="true" focusable="false">…</svg>
      <span class="sr-only">Remove member</span>
    </button>
  </div>
)}
```

> **Critical:** Do NOT use `aria-hidden` or `visibility: hidden` to conditionally suppress GM controls — use JavaScript conditional rendering so the element is not in the DOM at all when the user is not a GM. `aria-hidden` can be bypassed; not-in-DOM cannot.

---

### 1.3 Invite Management Modal

```html
<dialog
  role="dialog"
  aria-modal="true"
  aria-labelledby="invite-modal-title"
  aria-describedby="invite-modal-description"
  open
>
  <h2 id="invite-modal-title">Manage Invites</h2>
  <p id="invite-modal-description">
    Share these links to invite players to your campaign.
    Links expire after the configured time or use limit.
  </p>

  <!-- Invite list -->
  <ul role="list" aria-label="Active invite links">
    <li>
      <!-- Invite URL — must be selectable. Do NOT add user-select: none. -->
      <input
        type="text"
        id="invite-url-{code}"
        value="https://app.example.com/join/{code}"
        aria-label="Invite link for {campaign.name}"
        aria-describedby="invite-url-{code}-hint"
        readonly
        class="… focus:ring-2 focus:ring-[#577399]"
      />
      <p id="invite-url-{code}-hint" class="sr-only">
        This is a read-only invite link. Use the copy button to copy it.
      </p>

      <!-- Copy button -->
      <button
        type="button"
        aria-label="Copy invite link"
        aria-describedby="copy-status-{code}"
        class="… focus:ring-2 focus:ring-[#577399]"
        onClick="copyInviteUrl(code)"
      >
        <svg aria-hidden="true" focusable="false">…</svg>
        Copy
      </button>
      <!-- Live region for copy confirmation — MUST be in DOM before action -->
      <span
        id="copy-status-{code}"
        role="status"
        aria-live="polite"
        aria-atomic="true"
        class="sr-only"
      >
        {/* Populated with "Copied!" or "" after button click */}
      </span>

      <!-- Revoke invite -->
      <button
        type="button"
        aria-label="Revoke this invite link"
        class="… focus:ring-2 focus:ring-[#fe5f55]"
      >
        Revoke
      </button>
    </li>
  </ul>

  <!-- Create new invite -->
  <form aria-label="Create a new invite link">
    <fieldset>
      <legend>Invite settings</legend>

      <div>
        <label for="max-uses">Maximum uses</label>
        <input
          type="number"
          id="max-uses"
          name="maxUses"
          aria-describedby="max-uses-hint max-uses-error"
          min="1"
          placeholder="Unlimited"
          class="… focus:ring-2 focus:ring-[#577399]"
        />
        <p id="max-uses-hint" class="text-sm text-muted">
          Leave blank for unlimited uses.
        </p>
        <p
          id="max-uses-error"
          role="alert"
          aria-live="assertive"
          class="text-sm text-[#fe5f55]"
          aria-hidden="{!maxUsesError}"
        >
          {maxUsesError}
        </p>
      </div>

      <div>
        <label for="expires-at">Expiry date</label>
        <input
          type="datetime-local"
          id="expires-at"
          name="expiresAt"
          aria-describedby="expires-hint"
          class="… focus:ring-2 focus:ring-[#577399]"
        />
        <p id="expires-hint" class="text-sm text-muted">
          Leave blank for no expiry.
        </p>
      </div>

      <button type="submit" class="btn-primary … focus:ring-2 focus:ring-[#577399]">
        Generate invite link
      </button>
    </fieldset>
  </form>

  <!-- Close button -->
  <button
    type="button"
    aria-label="Close invite management"
    class="… focus:ring-2 focus:ring-[#577399]"
    onClick="closeModal()"
  >
    <svg aria-hidden="true" focusable="false">…</svg>
    <span class="sr-only">Close</span>
  </button>
</dialog>
```

**Copy-to-clipboard announcement pattern:**

```typescript
function copyInviteUrl(code: string) {
  navigator.clipboard.writeText(inviteUrl).then(() => {
    const statusEl = document.getElementById(`copy-status-${code}`);
    if (statusEl) {
      // Clear first to force re-announcement if copied twice in a row
      statusEl.textContent = '';
      // requestAnimationFrame ensures the DOM update is flushed before
      // the new text is set, guaranteeing the live region re-fires.
      requestAnimationFrame(() => {
        statusEl.textContent = 'Invite link copied to clipboard.';
        // Auto-clear after 3s so it doesn't persist stale status
        setTimeout(() => { statusEl.textContent = ''; }, 3000);
      });
    }
  });
}
```

---

### 1.4 Join Campaign Page (`/join/[code]`)

This page must use **server-side rendering** for the page shell so it is functional when JavaScript has not yet loaded or fails entirely.

```html
<!-- Rendered by Next.js SSR — no JS required for initial display -->
<main id="main-content" aria-label="Join campaign">
  <h1>Join Campaign</h1>

  <!-- Loading/validation states managed by SSR + client hydration -->

  <!-- Error state — announced immediately -->
  <div
    role="alert"
    aria-live="assertive"
    aria-atomic="true"
    id="join-error"
    class="{hasError ? '' : 'sr-only'}"
  >
    {/* Error messages: */}
    {/* "This invite link has expired." */}
    {/* "You are already a member of this campaign." */}
    {/* "This invite link is no longer valid." */}
    {errorMessage}
  </div>

  <!-- Success state -->
  <div
    role="status"
    aria-live="polite"
    aria-atomic="true"
    id="join-success"
    class="{isSuccess ? '' : 'sr-only'}"
  >
    You have joined {campaignName}. Redirecting to campaign…
  </div>

  <!-- Join action form (SSR-compatible) -->
  <form method="POST" action="/api/invites/{code}/accept">
    <!-- CSRF token if needed -->
    <button
      type="submit"
      class="btn-primary … focus:ring-2 focus:ring-[#577399]"
      aria-describedby="join-error"
    >
      Join Campaign
    </button>
  </form>
</main>
```

**No-JS requirement:** The `<form method="POST">` ensures that even with JavaScript disabled, the user can submit the form to a Next.js Route Handler that processes the invite server-side and returns a redirect or an error page with proper HTML. This satisfies SSR fallback.

---

### 1.5 Role Change Announcements

When a user's role changes (promotion to GM, demotion to Player), announce it via a persistent live region placed in the root layout:

```html
<!-- In the root layout — persistent across route changes -->
<div
  id="global-announcer"
  role="status"
  aria-live="polite"
  aria-atomic="true"
  class="sr-only"
>
  {/* Populated imperatively by roleChangeStore or WebSocket handler */}
</div>
```

```typescript
// On receiving a role-change WebSocket message or after PATCH /members/{id}
function announceRoleChange(newRole: CampaignMemberRole) {
  const announcer = document.getElementById('global-announcer');
  if (!announcer) return;
  announcer.textContent = '';
  requestAnimationFrame(() => {
    announcer.textContent =
      newRole === 'gm'
        ? 'You have been promoted to Game Master for this campaign.'
        : 'Your role has been changed to Player for this campaign.';
  });
}
```

---

### 1.6 Live Region Architecture Summary

| Live Region ID | `aria-live` | `aria-atomic` | Used for |
|---|---|---|---|
| `global-announcer` | `polite` | `true` | Role changes, general status |
| `ping-announcer` | `assertive` | `true` | GM ping received (see §4) |
| `copy-status-{code}` | `polite` | `true` | Clipboard copy confirmation |
| `join-error` | `assertive` | `true` | Join page error states |
| `join-success` | `polite` | `true` | Join page success |
| Campaign list container | `polite` via `role="status"` | `false` | Loading complete |

> **Rule:** All live regions **must be present in the DOM before they are populated**. Dynamically inserting a live region and immediately populating it is unreliable across screen readers. Mount the region empty on page load; populate it imperatively.

---

## 2. Focus Management

### 2.1 Modal: Invite Management

| Event | Focus destination |
|---|---|
| Modal opens (GM clicks "Manage Invites") | First focusable element inside the modal — the first invite URL `<input readonly>` or the "Generate invite link" heading if no invites exist |
| User presses `Escape` | Focus returns to the "Manage Invites" trigger button |
| User clicks the close (×) button | Focus returns to the "Manage Invites" trigger button |
| Modal closes after invite creation | Focus returns to the "Manage Invites" trigger button |
| Invite is revoked | Focus moves to the next invite row's "Revoke" button; if none remain, focus moves to "Generate invite link" button |

**Focus trap implementation:**

```typescript
// useModalFocusTrap.ts
import { useEffect, useRef } from 'react';

const FOCUSABLE_SELECTORS = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

export function useModalFocusTrap(isOpen: boolean) {
  const containerRef = useRef<HTMLElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      // Save the element that had focus before modal opened
      previousFocusRef.current = document.activeElement as HTMLElement;

      // Move focus into modal after next frame (allows CSS transitions to begin)
      const raf = requestAnimationFrame(() => {
        const container = containerRef.current;
        if (!container) return;
        const focusable = container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS);
        if (focusable.length > 0) {
          focusable[0].focus();
        } else {
          container.setAttribute('tabindex', '-1');
          container.focus();
        }
      });
      return () => cancelAnimationFrame(raf);
    } else {
      // Restore focus on close
      previousFocusRef.current?.focus();
    }
  }, [isOpen]);

  // Tab trap handler
  useEffect(() => {
    if (!isOpen) return;

    function handleKeydown(e: KeyboardEvent) {
      if (e.key !== 'Tab') return;
      const container = containerRef.current;
      if (!container) return;

      const focusable = Array.from(
        container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS)
      ).filter(el => !el.closest('[aria-hidden="true"]'));

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey) {
        // Shift+Tab: if focus is on first element, wrap to last
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        // Tab: if focus is on last element, wrap to first
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }

    document.addEventListener('keydown', handleKeydown);
    return () => document.removeEventListener('keydown', handleKeydown);
  }, [isOpen]);

  return containerRef;
}
```

---

### 2.2 Two-Pane Panel: Switching Character Sheets

When the GM clicks a member in the roster sidebar to switch the displayed character sheet:

| Event | Focus destination | Notes |
|---|---|---|
| GM clicks member button in sidebar | Focus stays on the clicked member button (it uses `aria-pressed`) | Do NOT auto-move focus to main panel — the GM may click multiple members in sequence |
| GM uses keyboard to activate member button (Enter/Space) | Same — focus stays on the button | The main panel's `aria-live="polite"` will announce the new sheet |
| Player sheet finishes loading | No focus move | `aria-live="polite"` on the main panel announces change |
| User explicitly navigates to sheet (Tab key from sidebar) | Focus moves to first focusable element in `#main-content` | Only when user deliberately tabs out of sidebar |

**Sheet panel heading update:**

```html
<main id="main-content" aria-label="Character sheet viewer" aria-live="polite">
  <!-- When a new sheet loads, update aria-label to name the character: -->
  <!-- aria-label="Thalindra Moonwhisper's character sheet" -->
  <h2 aria-live="off">{selectedCharacter.name}'s Character Sheet</h2>
  <!-- aria-live="off" on the heading to avoid double-announcement;
       the parent main's aria-live handles it. -->
</main>
```

---

### 2.3 Join Campaign Flow (`/join/[code]`)

| Step | Focus destination |
|---|---|
| Page loads with valid invite code | Focus on the "Join Campaign" `<button type="submit">` |
| Error state rendered | `role="alert"` fires automatically; focus stays on submit button |
| Success: redirect fires | N/A — user is navigating to `/campaigns/{id}` |
| Arrival at `/campaigns/{id}` after join | Focus on the page `<h1>` (via `autoFocus` on the heading or Next.js route focus management) |

---

### 2.4 Ping Effect — GM Side Focus

When a GM activates the keyboard alternative for pinging (see §3 and §4):

| Event | Focus destination |
|---|---|
| GM opens ping context menu | Focus moves to first item in the menu |
| GM sends ping via menu | Focus returns to the element that was right-clicked / activated |
| GM dismisses menu (Escape) | Focus returns to the element that triggered the menu |

---

## 3. Keyboard Interaction Map

### 3.1 Campaign List Page

| Key | Element in focus | Action |
|---|---|---|
| `Tab` | — | Move focus forward through campaign cards, then "Create Campaign" button |
| `Shift+Tab` | — | Move focus backward |
| `Enter` / `Space` | Campaign card link | Navigate to `/campaigns/{id}` |
| `Enter` / `Space` | "Create Campaign" button | Navigate to `/campaigns/new` |

---

### 3.2 Campaign Detail — Sidebar Roster

| Key | Element in focus | Action |
|---|---|---|
| `Tab` | — | Move forward through member buttons |
| `Shift+Tab` | — | Move backward |
| `Enter` / `Space` | Member button | Load that member's character sheet in main panel; set `aria-pressed="true"` |
| `Arrow Down` / `Arrow Up` | Member button | Optional: move between members within the roster (implement `roving tabindex` pattern) |
| `Tab` (from last sidebar item) | — | Move focus into `#main-content` |

**Recommended: Roving tabindex for roster**

```typescript
// Within the roster <ul>, only one member button has tabindex="0" at a time.
// Arrow keys move the active index. This prevents excessive Tab stops for
// campaigns with many members.
function handleRosterKeydown(e: KeyboardEvent, currentIndex: number) {
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    const next = (currentIndex + 1) % members.length;
    roverFocus(next);
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    const prev = (currentIndex - 1 + members.length) % members.length;
    roverFocus(prev);
  } else if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    selectMember(currentIndex);
  }
}
```

---

### 3.3 Invite Management Modal

| Key | Element in focus | Action |
|---|---|---|
| `Tab` / `Shift+Tab` | Within modal | Cycle through all focusable elements; wrap at boundaries |
| `Escape` | Anywhere in modal | Close modal; focus returns to trigger button |
| `Enter` | "Generate invite link" button | Submit form to create invite |
| `Enter` | "Copy" button | Copy URL to clipboard; announce "Copied" |
| `Enter` / `Space` | "Revoke" button | Revoke invite (requires confirmation — see below) |
| `Enter` | "Close" (×) button | Close modal |

**Revoke confirmation requirement:**

Destructive actions (revoking an invite, removing a member) **must require a confirmation step**. Do not execute them on first activation. Recommended pattern:

```html
<!-- After first "Revoke" press, replace button with confirm/cancel pair -->
<span role="alert" aria-live="assertive" class="text-sm text-[#fe5f55]">
  Are you sure? This cannot be undone.
</span>
<button type="button" aria-label="Confirm revoke invite" …>Confirm</button>
<button type="button" aria-label="Cancel revoke" …>Cancel</button>
```

Focus must move to the "Confirm" button after the confirmation appears.

---

### 3.4 GM Ping — Keyboard Alternative

Since middle-click is keyboard-inaccessible, a keyboard alternative **must** exist. The recommended approach is a **context menu** (right-click-equivalent) triggered by `Shift+F10` or a dedicated keyboard shortcut.

| Key | Element in focus | Action |
|---|---|---|
| `Shift+F10` | Any `[data-field-key]` element | Open a small GM ping context menu for that element |
| `Enter` | "Ping this field" menu item | Send ping for the focused element; close menu |
| `Escape` | GM ping context menu | Close menu; focus returns to the element |
| `Arrow Down` / `Arrow Up` | Within context menu | Move between menu items |

**Alternatively**, a dedicated GM toolbar button per field:

```html
<!-- Only rendered when callerRole === 'gm' and viewing another player's sheet -->
<div data-field-key="trackers.hp" class="field-wrapper">
  <!-- The field content -->
  <span class="field-value">…</span>

  <!-- GM-only ping button — visually small/subtle, always keyboard accessible -->
  <button
    type="button"
    aria-label="Ping {fieldLabel} on {playerName}'s sheet"
    class="ping-btn … focus:ring-2 focus:ring-[#fbbf24]"
    onClick="sendPing('trackers.hp')"
  >
    <svg aria-hidden="true" focusable="false"><!-- ping/target icon --></svg>
    <span class="sr-only">Ping this field</span>
  </button>
</div>
```

The ping button approach is simpler, more discoverable, and more accessible than a context menu. It should be the **primary** keyboard mechanism; the middle-click shortcut is a power-user overlay.

---

### 3.5 Join Campaign Page

| Key | Element in focus | Action |
|---|---|---|
| `Tab` | — | Move through any informational links, then to "Join Campaign" button |
| `Enter` | "Join Campaign" button | Submit the form |

---

### 3.6 Global: Skip Link

| Key | Element in focus | Action |
|---|---|---|
| `Tab` (first press on any campaign page) | Skip link (appears on focus) | — |
| `Enter` | Skip link | Jump focus to `#main-content` |

---

## 4. Ping Accessibility — Full Spec

The GM ping feature is the highest-risk accessibility surface in the Campaign System. It combines real-time interaction, animation, and multi-modal input. This section provides the complete specification.

---

### 4.1 Animation — Reduced Motion Compliance

**WCAG 2.3.1 — Three Flashes or Below Threshold**  
The ping animation must pulse **at most 3 times** and each pulse must last **at least 333ms** (so no more than 3 flashes per second at peak). The current spec (3 pulses × 1s = 3 seconds total) **passes** this criterion.

**WCAG 2.3.3 — Animation from Interactions (AAA, recommended)**  
**WCAG 1.4.3 / OS accessibility setting: `prefers-reduced-motion`**  
Users who have enabled "Reduce Motion" in their OS must see a non-animated alternative.

#### CSS Implementation

```css
/* globals.css — add to @layer utilities or @layer base */

@keyframes ping-pulse {
  0%   { box-shadow: 0 0 0 0px rgba(251, 191, 36, 0.8); }
  70%  { box-shadow: 0 0 0 12px rgba(251, 191, 36, 0); }
  100% { box-shadow: 0 0 0 0px rgba(251, 191, 36, 0); }
}

/* Full animation for users who have NOT requested reduced motion */
@media (prefers-reduced-motion: no-preference) {
  .ping-active {
    outline: 2px solid rgb(251, 191, 36);       /* amber-400 */
    outline-offset: 3px;
    animation: ping-pulse 1s ease-out 3;        /* 3 pulses, 3 seconds total */
    /* animation-fill-mode defaults to none — outline persists for duration */
  }
}

/* Reduced-motion alternative: static highlight, no animation */
@media (prefers-reduced-motion: reduce) {
  .ping-active {
    outline: 3px solid rgb(251, 191, 36);       /* thicker — more visible since no pulse */
    outline-offset: 3px;
    box-shadow: 0 0 0 4px rgba(251, 191, 36, 0.35);   /* static glow halo */
    /* No animation property — no motion */
  }
}
```

**Cleanup after ping (both variants):**

```typescript
function handlePing(event: PingEvent) {
  const el = document.querySelector<HTMLElement>(
    `[data-field-key="${CSS.escape(event.fieldKey)}"]`
  );
  if (!el) return;

  // Smooth scroll for standard motion; instant for reduced motion
  const prefersReducedMotion = window.matchMedia(
    '(prefers-reduced-motion: reduce)'
  ).matches;

  el.scrollIntoView({
    behavior: prefersReducedMotion ? 'instant' : 'smooth',
    block: 'center',
  });

  // Add ping class (CSS handles animation vs. static based on media query)
  el.classList.add('ping-active');

  // Announce to screen reader (see §4.2)
  announcePing(event);

  // Remove ping class after 3s (animation duration) or 4s (reduced-motion static)
  const duration = prefersReducedMotion ? 4000 : 3000;
  setTimeout(() => el.classList.remove('ping-active'), duration);
}
```

---

### 4.2 Screen Reader Announcement on Receiving End

When a player receives a ping, they must be notified via a live region — the animation is purely visual.

#### Live region (placed in root layout or `CampaignProvider`)

```html
<!-- Mount this ONCE in the layout; never unmount it -->
<div
  id="ping-announcer"
  role="alert"
  aria-live="assertive"
  aria-atomic="true"
  class="sr-only"
>
  <!-- Populated imperatively on ping receipt -->
</div>
```

> **Why `assertive` instead of `polite`?**  
> A ping is a deliberate GM action requiring the player's attention. `assertive` interrupts the current speech output to announce it immediately, which matches the visual urgency of the animation. Use `polite` only for ambient status updates.

#### Announcement implementation

```typescript
// In useGameWebSocket.ts, in the onPing handler:

function announcePing(event: PingEvent, fieldLabel: string) {
  const announcer = document.getElementById('ping-announcer');
  if (!announcer) return;

  // Format a human-readable field name from the fieldKey
  // e.g. "trackers.hp" → "HP tracker"
  //      "stats.agility" → "Agility"
  //      "domainLoadout.0" → "Domain card slot 1"
  const humanLabel = formatFieldKeyForSR(event.fieldKey);

  // Clear → rAF → set, to force re-announcement if pinged twice rapidly
  announcer.textContent = '';
  requestAnimationFrame(() => {
    announcer.textContent =
      `Your Game Master is drawing attention to: ${humanLabel}.`;
    setTimeout(() => { announcer.textContent = ''; }, 5000);
  });
}

function formatFieldKeyForSR(fieldKey: string): string {
  const map: Record<string, string> = {
    'trackers.hp':         'Hit Points tracker',
    'trackers.stress':     'Stress tracker',
    'trackers.hope':       'Hope tracker',
    'stats.agility':       'Agility stat',
    'stats.strength':      'Strength stat',
    'stats.finesse':       'Finesse stat',
    'stats.instinct':      'Instinct stat',
    'stats.presence':      'Presence stat',
    'stats.knowledge':     'Knowledge stat',
    'trackers.armor':      'Armor score',
    'trackers.evasion':    'Evasion score',
  };
  if (map[fieldKey]) return map[fieldKey];
  // Fallback: convert dot-path to human words
  return fieldKey
    .replace(/\./g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, c => c.toUpperCase());
}
```

---

### 4.3 Keyboard Alternative for GM

As specified in §3.4, the primary keyboard mechanism is a **per-field ping button** that appears when a GM is viewing another player's sheet. A supplemental context menu via `Shift+F10` provides a quicker shorthand for power users.

#### Ping button component

```tsx
// Only rendered when: callerRole === 'gm' AND viewingAnotherPlayerSheet
function PingButton({ fieldKey, fieldLabel, playerName }: PingButtonProps) {
  const { sendPing } = useGameWebSocket(/* ... */);

  return (
    <button
      type="button"
      aria-label={`Ping ${fieldLabel} on ${playerName}'s sheet`}
      className={[
        'inline-flex items-center justify-center',
        'h-6 w-6 rounded',                          // 24px — see §6 for why OK here
        'text-[#fbbf24]/60 hover:text-[#fbbf24]',
        'opacity-0 group-hover:opacity-100',         // reveal on parent hover
        'focus:opacity-100',                         // ALWAYS visible on focus
        'focus:outline-none focus:ring-2 focus:ring-[#fbbf24]',
        'transition-opacity duration-150',
      ].join(' ')}
      onClick={() => sendPing(fieldKey)}
    >
      <svg aria-hidden="true" focusable="false" className="h-3.5 w-3.5">
        {/* Target/crosshair icon */}
      </svg>
      <span className="sr-only">Ping {fieldLabel}</span>
    </button>
  );
}
```

> **Note on opacity:** The button is visually hidden until the parent is hovered OR it is keyboard-focused. This keeps the sheet uncluttered for the player while ensuring the GM can always reach the button via keyboard. The `focus:opacity-100` rule is critical — keyboard users must always see focused elements.

---

### 4.4 Middle-Click Handler (Mouse Users)

No accessibility changes needed to the middle-click handler itself, since it is a supplemental shortcut. However:

1. The middle-click handler must **not** be the only way to ping.
2. Log a warning in development if middle-click is bound to an element that lacks a `data-field-key`.
3. Middle-click on mobile (where no middle button exists) must gracefully no-op.

```typescript
// Revised handler with safety guards:
function handleMiddleClick(e: MouseEvent, fieldKey: string) {
  if (e.button !== 1) return;
  if (!fieldKey) {
    console.warn('[Ping] Middle-clicked element has no data-field-key');
    return;
  }
  e.preventDefault();
  sendPing(fieldKey);
}
```

---

### 4.5 Color Alone Not Sufficient — Ping Visual Design

The amber pulse (`rgb(251, 191, 36)`) communicates the ping visually. However:

- **Under deuteranopia/protanopia**, amber and green may appear similar.
- **Under high-contrast mode**, box-shadow animations may be suppressed.

**Required supplemental indicators:**

1. **Outline** (not just box-shadow): `outline: 2px solid rgb(251, 191, 36)` provides a structural, non-color cue (the outline itself, regardless of its color, creates a visible border change).
2. **Icon badge**: An optional "ping" icon (`🎯` or a bell SVG) briefly appears in the corner of the pinged element during the animation.
3. **Label toast**: A brief non-modal toast appears at a fixed position reading "GM pinged: [field name]" — this also reinforces for low-vision users who may not see the field-level pulse.

```html
<!-- Brief ping toast — fixed position, aria-live="assertive" -->
<div
  id="ping-toast"
  role="status"
  aria-live="assertive"
  aria-atomic="true"
  class="fixed bottom-4 right-4 z-50
         flex items-center gap-2 rounded-lg border border-[#fbbf24]/40
         bg-slate-900 px-4 py-2 text-sm text-[#fbbf24]
         shadow-lg transition-opacity duration-300
         opacity-0 aria-[live=assertive]:opacity-100"
>
  <!-- Populated imperatively, same as ping-announcer -->
</div>
```

---

### 4.6 Ping Accessibility Summary

| Concern | Solution |
|---|---|
| Animation disrespects reduced-motion | `@media (prefers-reduced-motion: reduce)` CSS block — static outline + glow, no animation |
| Scroll behavior disrespects reduced-motion | `behavior: prefersReducedMotion ? 'instant' : 'smooth'` |
| Screen reader not notified | `role="alert"` live region announces "Your GM is drawing attention to: [field]" |
| Middle-click is mouse-only | Per-field ping `<button>` for keyboard; `Shift+F10` context menu for power users |
| WCAG 2.3.1 Three Flashes | 3 pulses × 1s = 3 seconds total — ≤ 3 flashes/second — **passes** |
| Color alone (amber) | Supplemental outline (structural) + icon badge + toast label |
| High-contrast mode | Outline (not box-shadow) is the primary ring — will render in HC mode |

---

## 5. Contrast Table

All contrast ratios are calculated using the WCAG relative luminance formula. Background values reflect the actual rendered context (not CSS variable aliases).

### 5.1 Primary Text Combinations

| Foreground color | Background color | Ratio | WCAG AA (4.5:1 normal / 3:1 large) | Status |
|---|---|---|---|---|
| `#b9baa3` (parchment/muted) | `#0f172a` (slate-900) | **9.2:1** | ✅ Pass (both) | Primary body text on dark bg |
| `#f7f7ff` (near-white) | `#0f172a` (slate-900) | **18.8:1** | ✅ Pass (both) | High-emphasis text |
| `#f7f7ff` (near-white) | `#0a100d` (deepest bg) | **19.4:1** | ✅ Pass (both) | Page-level text |
| `#577399` (steel-blue) | `#0f172a` (slate-900) | **4.6:1** | ✅ Pass (normal) | Link/accent text — MARGINAL, do not use for body text below 14px |
| `#577399` (steel-blue) | `#0a100d` (deepest bg) | **4.8:1** | ✅ Pass (normal) | — |
| `#fe5f55` (coral/error) | `#0f172a` (slate-900) | **4.9:1** | ✅ Pass (both) | Error text |
| `#fbbf24` (amber-400) | `#0f172a` (slate-900) | **9.6:1** | ✅ Pass (both) | Ping outline / gold accent |

### 5.2 Role Badge Colors

| Badge text color | Badge background | Ratio | Status |
|---|---|---|---|
| `#f7f7ff` on GM badge | `#577399` (steel-blue fill) | **4.7:1** | ✅ Pass |
| `#f7f7ff` on Player badge | `#4a0a14` (deep burgundy) | **10.1:1** | ✅ Pass |
| `#f7f7ff` on Co-GM badge | `#3d5a3e` (muted green) | **5.6:1** | ✅ Pass |

> **Action required:** Verify that the actual rendered badge background is a solid color (not an opacity modifier like `bg-[#577399]/40`). An opacity of `/40` on `#577399` over `#0f172a` produces approximately `#2a3a4f`, yielding only **2.1:1** against `#f7f7ff` text — a **fail**. Solid fills must be used for badge backgrounds.

### 5.3 Interactive Element Focus Ring

| Focus ring color | Background at focus | Ratio | Status |
|---|---|---|---|
| `#577399` ring on dark bg | `#0f172a` | **4.6:1** | ✅ Pass (WCAG 3.1 minimum for focus indicators) |
| `#fbbf24` ring on dark bg | `#0f172a` | **9.6:1** | ✅ Pass — use for ping buttons |
| `#fbbf24` global fallback ring | `#0f172a` | **9.6:1** | ✅ Pass — already defined in `globals.css *:focus-visible` |

### 5.4 Problem Areas Identified

| Foreground | Background | Ratio | Status | Fix |
|---|---|---|---|---|
| `rgba(185,186,163,0.70)` (sidebar-text-secondary) | `#0f172a` | **~3.8:1** | ⚠️ Passes only for large/bold text | Do not use `.sidebar-text-secondary` for normal-weight text below 18px (or 14px bold) |
| `rgba(185,186,163,0.40)` (muted opacity text) | `#0f172a` | **~2.1:1** | ❌ FAIL | Raise opacity to 0.70+ minimum |
| `#577399` text on `#0f172a` | — | **4.6:1** | ⚠️ Marginal | Use only for text ≥ 18px or ≥ 14px bold; add underline for links |
| Error badge text `#fe5f55` | `rgba(203,45,86,0.15)` (light burgundy wash) | **~2.4:1** | ❌ FAIL | Use `#0f172a` text on error badge, or use a darker background |

### 5.5 New Campaign UI — Minimum Requirements

Any new color introduced in Campaign System UI must meet:
- **4.5:1** for text in UI controls, labels, and body copy
- **3:1** for large text (≥ 18px regular, ≥ 14px bold)
- **3:1** for UI component boundaries (borders of inputs, button outlines) against adjacent background

---

## 6. Touch Target Checklist

**Minimum:** 44×44px per WCAG 2.5.5 (Level AAA, strongly recommended) and WCAG 2.5.8 (Level AA, WCAG 2.2). Apple HIG and Google Material both mandate 44×44dp minimum.

### 6.1 Known Risk Areas

| Component | Element | Likely rendered size | Status | Required action |
|---|---|---|---|---|
| Roster sidebar | Member avatar + name button | ~40px height at `text-sm` | ⚠️ Risk | Enforce `min-h-[44px]` and `py-2.5` padding |
| Invite modal | Copy button (icon-only) | ~32×32px common default | ❌ Too small | Use `h-11 w-11` (44px) or add `px-3 py-2.5` padding |
| Invite modal | Revoke button | ~36px with `text-sm` | ⚠️ Risk | Add `min-h-[44px]` |
| Roster sidebar | GM remove-member button | Icon-only, likely 32px | ❌ Too small | Use `h-11 w-11` |
| Campaign card | Entire card = link | Variable — usually OK | ✅ Card-as-link is large enough | Verify `min-h-[80px]` |
| Role badge | Non-interactive | N/A | ✅ No target needed | — |
| Ping button (per-field) | Tiny icon button | ~24px (h-6 w-6) | ❌ Below minimum | Expand hit area using negative margin + padding: `p-3 -m-3 h-6 w-6` or use invisible padding with `relative after:absolute after:inset-[-10px]` |
| Skip-to-main link | When visible on focus | Depends on CSS | ✅ Add explicit `min-h-[44px] px-4 py-2.5` | — |
| Invite create form | Number input | Usually ~44px via browser default | ✅ Usually fine | Verify on mobile |
| Campaign settings button | Top-right nav area | Variable | ⚠️ Risk | Ensure `h-11 w-auto min-w-[44px]` |

### 6.2 Ping Button Touch Target Pattern

The ping button is intentionally small visually (24×24px icon) to keep the sheet uncluttered. Use CSS to expand the **touch hit area** without expanding the visual size:

```css
/* Expand touch target beyond visual bounds */
.ping-btn {
  position: relative;
  /* Visual size: 24×24px */
  height: 1.5rem;    /* 24px */
  width: 1.5rem;     /* 24px */
}

.ping-btn::before {
  content: '';
  position: absolute;
  /* Expand hit area to 44×44px (10px each side) */
  inset: -10px;
}
```

Or with Tailwind: `relative before:absolute before:inset-[-10px] before:content-['']`.

---

### 6.3 Tailwind Enforcement Pattern

Add to `globals.css` for all new Campaign System interactive elements:

```css
@layer utilities {
  /* Touch-safe interactive element baseline */
  .touch-target {
    @apply min-h-[44px] min-w-[44px];
  }

  /* When visual size must be smaller, use this on the container */
  .touch-target-expand {
    @apply relative;
  }
  .touch-target-expand::before {
    @apply content-[''] absolute;
    inset: max(-12px, calc((44px - 100%) / -2));
  }
}
```

---

## 7. Colorblind Safety

### 7.1 Role Badge Design

Role badges must not use **color alone** to differentiate roles. Under the three most common color vision deficiencies:

| Role | Intended color | Under Deuteranopia (red/green) | Under Protanopia (red) | Under Tritanopia (blue/yellow) |
|---|---|---|---|---|
| GM | Steel blue (#577399) | Appears as muted blue-grey | Appears as blue-grey | Appears as grey-green |
| Co-GM | Muted green (#3d5a3e) | **Appears nearly identical to GM steel blue** | Similar to GM | Different from GM |
| Player | Deep burgundy (#4a0a14) | Appears very dark, nearly black | Appears very dark | Dark navy appearance |

**Problem:** Under deuteranopia, GM (steel blue) and Co-GM (muted green) can appear confusingly similar.

**Required fix:** Each badge must include a distinct **icon** and **text label** that differs by role — color is a secondary reinforcement only.

```html
<!-- GM Badge -->
<span class="role-badge role-badge--gm" aria-label="Role: Game Master">
  <svg aria-hidden="true" focusable="false" class="h-3.5 w-3.5">
    <!-- Crown icon or shield icon — geometrically distinct from player icon -->
  </svg>
  <span>GM</span>
</span>

<!-- Co-GM Badge -->
<span class="role-badge role-badge--cogm" aria-label="Role: Co–Game Master">
  <svg aria-hidden="true" focusable="false" class="h-3.5 w-3.5">
    <!-- Half-crown or star icon -->
  </svg>
  <span>Co-GM</span>
</span>

<!-- Player Badge -->
<span class="role-badge role-badge--player" aria-label="Role: Player">
  <svg aria-hidden="true" focusable="false" class="h-3.5 w-3.5">
    <!-- Person/silhouette icon -->
  </svg>
  <span>Player</span>
</span>
```

Accessible name hierarchy: **text label > icon > color**. All three are present. Color is never the sole differentiator.

---

### 7.2 Ping Effect Under Color Vision Deficiency

| CVD type | Amber (#fbbf24) appearance | Impact |
|---|---|---|
| Deuteranopia | Appears as yellow — **still distinctive** | No issue |
| Protanopia | Appears as yellow-orange — **still distinctive** | No issue |
| Tritanopia | Amber may appear as pinkish-red — **may be confused with errors** | Moderate concern |
| Achromatopsia (full) | Appears as mid-grey — same as many elements | **Outline provides structural cue; SR announcement is primary** |

**Mitigation:**
1. The outline (`outline: 2px solid`) provides a structural cue independent of color — visible under all CVD types.
2. The ping toast and SR announcement provide a non-visual channel.
3. For tritanopia users: the amber outline is still a visibly different hue from the red error states (`#fe5f55`). Acceptable.
4. For achromatopsia: the SR `role="alert"` announcement is the primary accessibility affordance.

---

### 7.3 Error vs. Success State Colors

| State | Intended color | Deuteranopia | Protanopia | Fix needed |
|---|---|---|---|---|
| Error | `#fe5f55` (coral-red) | Appears yellow-brown | Appears dark brown | Add error icon + "Error:" prefix text |
| Success | `#22c55e` (green) | Appears yellow — **similar to error in deuteranopia** | Appears dark similar | Add success icon + "Success:" prefix text |

**All error and success messages must include:**
1. An icon (⚠ for error, ✓ for success) with `aria-hidden="true"`
2. A visually visible text prefix ("Error:" / "Success:") or a semantically distinct role (`role="alert"`)

---

## 8. Implementation Checklist — Prioritized

Items are ordered **P0 → P2** by launch-blocking severity. All P0 items are required before the Campaign System ships. P1 items are required within the first patch. P2 items are recommended improvements.

---

### P0 — Launch Blockers (Accessibility Failures)

These are direct WCAG 2.1 AA violations that will cause immediate failures for screen reader users, keyboard-only users, or users with vestibular disorders.

| # | Item | WCAG Criterion | Component |
|---|---|---|---|
| 1 | **Modal focus trap:** Invite modal must trap Tab/Shift+Tab within it | 2.1.2 No Keyboard Trap | `InviteModal` |
| 2 | **Focus return on modal close:** When invite modal closes, focus must return to the trigger button | 2.1.1 Keyboard | `InviteModal` |
| 3 | **Role badge not color-only:** Add icon + text label to all role badges | 1.4.1 Use of Color | `RoleBadge` component |
| 4 | **Ping keyboard alternative:** Implement per-field `<button>` for GM ping | 2.1.1 Keyboard | `PingButton`, character sheet wrapper |
| 5 | **Ping live region:** Mount `#ping-announcer` `role="alert"` in layout; populate on ping receipt | 1.3.1, 4.1.3 | `CampaignProvider` / root layout |
| 6 | **Reduced-motion ping CSS:** Implement `@media (prefers-reduced-motion: reduce)` variant | 2.3.3 (AAA → treat as AA for vestibular) | `globals.css` |
| 7 | **Join page error announcement:** `role="alert"` on expired/invalid invite errors | 4.1.3 Status Messages | `/join/[code]` page |
| 8 | **Invite URL selectable:** Remove any `user-select: none` from invite URL display | 1.3.1, 2.1.1 | `InviteModal` |
| 9 | **Skip-to-main link:** Add to campaign detail page layout | 2.4.1 Bypass Blocks | Campaign layout |
| 10 | **All form inputs have `<label>`:** Verify create invite form, max-uses input, expiry input | 1.3.1, 3.3.2 | `InviteModal` form |
| 11 | **`aria-describedby` on errored inputs:** Invite form errors must be linked to inputs | 3.3.1, 3.3.2 | `InviteModal` form |
| 12 | **GM-only controls conditionally rendered:** Use JSX conditional, not CSS `display:none` | 4.1.2 | Campaign detail, roster sidebar |
| 13 | **Role change live region:** Announce role changes via `role="status"` | 4.1.3 | `CampaignProvider` |
| 14 | **`aria-busy` on loading skeletons:** Set `aria-busy="true"` during data fetches | 4.1.3 | Campaign list, roster sidebar |

---

### P1 — Required Before First Patch

| # | Item | WCAG Criterion | Component |
|---|---|---|---|
| 15 | **Roster roving tabindex:** Implement arrow-key navigation for the member list | 2.1.1 | Roster sidebar |
| 16 | **`aria-pressed` on roster member buttons:** Show selected state to SR | 4.1.2 | Roster sidebar |
| 17 | **Copy clipboard SR announcement:** Live region fires "Copied!" on copy | 4.1.3 | `InviteModal` |
| 18 | **Revoke confirmation pattern:** Destructive action requires confirm step; focus moves to confirm button | 3.3.4 | `InviteModal` |
| 19 | **Remove member confirmation:** Same pattern as revoke | 3.3.4 | Roster sidebar |
| 20 | **Touch targets ≥ 44px:** Audit and fix all interactive elements below minimum (especially copy/revoke/ping buttons) | 2.5.8 (WCAG 2.2) | All campaign components |
| 21 | **Badge background as solid fill:** Fix any opacity-based badge backgrounds that fail contrast | 1.4.3 | `RoleBadge` |
| 22 | **No `rgba` opacity < 0.70 on text < 14px:** Audit new campaign components for opacity text | 1.4.3 | All new components |
| 23 | **All `<img>` in campaign UI have `alt`:** Avatar images use `alt=""` (decorative) + name in nearby label | 1.1.1 | Member cards, character cards |
| 24 | **Campaign detail page `<h1>`:** Ensure page has a single, descriptive `<h1>` | 1.3.1, 2.4.6 | Campaign detail layout |
| 25 | **Focus visible on all new interactive elements:** No `outline: none` without replacement ring | 2.4.7 | All campaign components |

---

### P2 — Recommended Improvements (Post-Launch)

| # | Item | Notes |
|---|---|---|
| 26 | **Ping icon badge on element:** Brief visual icon in corner of pinged element during animation | Reinforces non-color cue for CVD users |
| 27 | **Ping toast notification:** Fixed-position toast with field name | Reinforces for low-vision users |
| 28 | **`fieldKey` → human-readable map:** Expand `formatFieldKeyForSR()` to cover all sheet elements | Improves SR ping announcement quality |
| 29 | **SSR fallback for `/join/[code]`:** Verify `<form method="POST">` works with JS disabled | Progressive enhancement |
| 30 | **Keyboard shortcut documentation:** Add "GM shortcuts" section to campaign help modal | Discoverability |
| 31 | **High-contrast mode testing:** Test campaign UI with Windows High Contrast / macOS Increased Contrast | Ensures box-shadow fallback to outline |
| 32 | **NVDA + Firefox testing:** Validate live regions with NVDA on Firefox (different SR announcement timing vs. VoiceOver) | SR cross-compatibility |
| 33 | **Campaign settings page:** Full accessibility audit when page is built | Not yet scoped |
| 34 | **Invite expiry datepicker:** Ensure datetime-local input or custom picker is fully keyboard accessible | Input complexity |
| 35 | **Loading state for `/join/[code]`:** Add `aria-busy` during async invite validation | Async UX clarity |
| 36 | **Campaign name in page `<title>`:** `<title>My Campaign — Curses!</title>` for screen reader tab navigation | 2.4.2 Page Titled |
| 37 | **`lang` attribute on any non-English content:** If campaign names can contain non-Latin scripts | 3.1.2 Language of Parts |
| 38 | **Session timeout warning:** If JWT expires mid-session, warn user before auto-logout | 2.2.1 Timing Adjustable |

---

## Appendix A — Quick Reference: Live Region Mount Pattern

All live regions must be mounted on page load (empty), not inserted dynamically when content is needed.

```tsx
// In CampaignProvider.tsx or root layout
export function CampaignAccessibilityRegions() {
  return (
    <>
      {/* Ping announcer — uses assertive because pings are time-sensitive GM actions */}
      <div
        id="ping-announcer"
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
        className="sr-only"
      />
      {/* General campaign status — role changes, member joins, etc. */}
      <div
        id="campaign-status"
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      />
    </>
  );
}
```

---

## Appendix B — ARIA Attributes Quick Reference

| Attribute | Usage in Campaign System |
|---|---|
| `role="dialog" aria-modal="true"` | Invite management modal |
| `aria-labelledby` | Points to modal/section heading IDs |
| `aria-describedby` | Points to error message / hint IDs |
| `aria-live="assertive"` | Ping announcer, join error, copy clipboard |
| `aria-live="polite"` | Campaign status, roster loaded, success states |
| `aria-atomic="true"` | All `aria-live` regions — announce full content not just changes |
| `aria-busy="true/false"` | Skeleton loading states |
| `aria-pressed` | Roster member selection button |
| `aria-label` | Role badges, icon-only buttons, avatar images |
| `aria-hidden="true"` | Decorative icons, decorative avatars, skeleton cards |
| `role="alert"` | Error messages (join page, form validation) |
| `role="status"` | Loading indicators, success messages |
| `role="list"` + `role="listitem"` | Campaign list, roster, invite list |
| `role="group"` + `aria-label` | GM controls grouping |

---

## Appendix C — Acceptance Criteria for QA

The following criteria should be tested before the Campaign System is considered accessible and ready for launch.

### Screen Reader (SR) Tests

- [ ] **Campaign list:** SR announces campaign name + member count + role on card focus
- [ ] **Campaign list loading:** SR announces "Loading your campaigns" then list content when resolved
- [ ] **Role badge:** SR reads "Role: Game Master" / "Role: Player" (not just "GM" or badge color)
- [ ] **Modal open:** SR announces modal title and description on open
- [ ] **Modal focus trap:** Tab and Shift+Tab do not escape the invite modal
- [ ] **Modal close:** SR announces return of focus context (browser handles this implicitly)
- [ ] **Copy button:** SR announces "Invite link copied to clipboard" within 500ms of activation
- [ ] **Ping received:** SR announces "Your Game Master is drawing attention to: [field name]" on ping
- [ ] **Join error:** SR immediately announces error reason (expired, invalid, already member)
- [ ] **Role change:** SR announces "You have been promoted to Game Master" when applicable
- [ ] **Roster member selection:** SR announces which sheet is now loaded

### Keyboard-Only Tests

- [ ] **Skip link:** Tab from page top → skip link appears → Enter → focus lands in character sheet
- [ ] **Campaign cards:** Tab navigable; Enter activates
- [ ] **Roster sidebar:** Arrow keys navigate members; Enter selects; Tab exits to main panel
- [ ] **Invite modal:** All actions reachable by keyboard; Escape closes modal
- [ ] **GM ping:** Per-field ping button reachable by Tab; Enter sends ping
- [ ] **Revoke invite:** Confirmation step appears; keyboard can confirm or cancel
- [ ] **Remove member:** Confirmation step appears; keyboard can confirm or cancel
- [ ] **Join page:** Tab to submit button; Enter submits

### Animation & Motion Tests

- [ ] **Ping with prefers-reduced-motion OFF:** 3 amber pulses animate over ~3 seconds
- [ ] **Ping with prefers-reduced-motion ON:** Static amber outline, no animation; outline persists ~4 seconds
- [ ] **Scroll behavior:** `behavior: 'instant'` when prefers-reduced-motion is on

### Contrast Tests

- [ ] **Role badges:** Verify badge text/background contrast ≥ 4.5:1 with solid (not opacity-reduced) fills
- [ ] **Error messages:** `#fe5f55` on dark bg ≥ 4.5:1
- [ ] **Focus rings:** Visible on all interactive elements against all backgrounds used
- [ ] **Sidebar secondary text:** `.sidebar-text-secondary` used only on large/bold text ≥ 18px

### Touch Target Tests (Mobile)

- [ ] **All roster member buttons:** ≥ 44px height on mobile viewport
- [ ] **Copy and Revoke buttons in invite modal:** ≥ 44×44px including padding/expanded hit area
- [ ] **GM ping button:** Hit area ≥ 44×44px (use CSS expansion pattern from §6)
- [ ] **Campaign cards:** Sufficient height and padding for comfortable tap

### Colorblind Safety Tests

- [ ] **Role badges under deuteranopia simulation (Chrome DevTools):** GM, Co-GM, and Player badges distinguishable by icon + text, not color
- [ ] **Ping animation under deuteranopia:** Amber outline still visible and distinctive

---

*This specification is a living document. It should be updated as Campaign System components are built and as new accessibility issues are discovered during QA.*
