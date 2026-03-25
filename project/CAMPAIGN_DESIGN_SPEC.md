# Daggerheart Campaign System — Visual Design Specification

> **Version:** 1.0  
> **Author:** Campaign Design System (AI Design Lead)  
> **Date:** 2026-03-25  
> **Status:** Ready for Implementation  
>
> This spec is opinionated. Engineers should treat every Tailwind class string as the canonical
> implementation target. Deviations require explicit design sign-off.

---

## Table of Contents

1. [Design Principles & Rationale](#1-design-principles--rationale)
2. [Typography Scale](#2-typography-scale)
3. [Spacing & Layout System](#3-spacing--layout-system)
4. [Role Badge System](#4-role-badge-system)
5. [Campaign List Page (`/campaigns`)](#5-campaign-list-page-campaigns)
6. [Create Campaign Form (`/campaigns/new`)](#6-create-campaign-form-campaignsnew)
7. [Campaign Detail Page (`/campaigns/[id]`)](#7-campaign-detail-page-campaignsid)
8. [Invite Management Modal](#8-invite-management-modal)
9. [Join Page (`/join/[code]`)](#9-join-page-joincode)
10. [Ping Effect — Full CSS Spec](#10-ping-effect--full-css-spec)
11. [Animation & Micro-interaction Specs](#11-animation--micro-interaction-specs)
12. [Colorblind Safety Notes](#12-colorblind-safety-notes)
13. [Accessibility Checklist](#13-accessibility-checklist)

---

## 1. Design Principles & Rationale

The Campaign System introduces a **social, collaborative layer** on top of the solitary character
sheet. The design must communicate:

- **Authority** — The GM role has power; the UI must reflect that without being authoritarian.
- **Belonging** — Players should feel their character is *present* in the campaign world.
- **Legibility at a glance** — Role, status, and character assignment must be instantly readable.
- **Dark-fantasy atmosphere** — Consistent with the existing `#0a100d` deep-forest-black-green
  app background. Cold slate structures, warm gold accents, burgundy hero moments.

The two-pane campaign detail layout borrows from professional tools (Linear, Notion, Figma) — a
persistent contextual sidebar paired with a spacious content well. This is familiar to users and
requires zero learning curve while feeling purposeful and designed.

---

## 2. Typography Scale

All type follows the existing system. The campaign surfaces introduce no new fonts.

| Role | Font | Weight | Size | Tracking | Color |
|---|---|---|---|---|---|
| Page title (campaign name) | `warbler-deck` | 700 | `text-2xl` (1.5rem) | `tracking-wide` | `#f7f7ff` |
| Section subheader | `warbler-deck` | 600 | `text-lg` (1.125rem) | `tracking-normal` | `#f7f7ff` |
| Campaign card title | `warbler-deck` | 600 | `text-base` | `tracking-normal` | `#f7f7ff` |
| Body / description | `ibarra-real-nova` | 400 | `text-sm` (0.875rem) | — | `#b9baa3` |
| Label / meta | `ibarra-real-nova` | 500 | `text-xs` (0.75rem) | `tracking-wide uppercase` | `#b9baa3` |
| Badge text | `ibarra-real-nova` | 700 | `text-xs` | `tracking-widest uppercase` | varies |
| Input | `ibarra-real-nova` | 400 | `text-sm` | — | `#f7f7ff` |
| CTA button | `ibarra-real-nova` | 600 | `text-sm` | `tracking-wide` | `#f7f7ff` |
| Hero / empty state | `jetsam-collection-basilea` | 400 | `text-3xl` | `tracking-widest` | `#b9baa3` |

---

## 3. Spacing & Layout System

Uses Tailwind's default spacing scale. Key rhythm values:

- **Base unit:** 4px (Tailwind `1`)
- **Card internal padding:** `p-5` (20px)
- **Section gaps:** `gap-4` (16px) standard, `gap-6` (24px) between major sections
- **Page horizontal padding:** `px-6` desktop, `px-4` mobile
- **Sidebar width:** `w-[300px]` fixed (flex-shrink-0), collapsible to icon rail on `< lg`
- **Header strip height:** `h-16` (64px), fixed at top of campaign detail

---

## 4. Role Badge System

### Design Intent

Badges must be distinguishable by **shape, text, AND color** simultaneously — never by hue alone.
All three variants are `rounded-full` but differ in border weight, fill, and icon presence.

### 4.1 GM Badge (Primary GM)

The most visually prominent. Uses the gold accent to convey authority and primacy.

```
Visual: Solid gold fill, dark text, crown icon prefix
```

**Tailwind classes:**
```
inline-flex items-center gap-1.5
rounded-full
bg-gold-500 border-2 border-gold-400
px-3 py-1
text-xs font-bold tracking-widest uppercase
text-[#1a0f00]
shadow-glow-gold
```

**Icon:** `👑` (or SVG crown icon, 12×12px, `text-[#1a0f00]`) — appears before the text "GM"

**Color values:**
- Background: `#f59e0b` (gold-500)
- Border: `#fbbf24` (gold-400)
- Text: `#1a0f00` (very dark amber-brown)

**Contrast ratio (text on bg):** `#1a0f00` on `#f59e0b` = **8.4:1** ✅ WCAG AAA

**Non-hue distinguisher:** Solid fill + crown icon + `border-2` (thicker border)

---

### 4.2 Co-GM Badge

Present but visually subordinate. Uses a gold outline (unfilled) to echo the GM badge family
without competing.

```
Visual: Transparent fill, gold border, gold text, shield icon prefix
```

**Tailwind classes:**
```
inline-flex items-center gap-1.5
rounded-full
bg-gold-500/10 border border-gold-500/60
px-3 py-1
text-xs font-bold tracking-widest uppercase
text-gold-400
```

**Icon:** `🛡` (or SVG shield icon, 12×12px) — appears before "Co-GM"

**Color values:**
- Background: `rgba(245, 158, 11, 0.10)`
- Border: `rgba(245, 158, 11, 0.60)`
- Text: `#fbbf24` (gold-400)

**Contrast ratio:** `#fbbf24` on `#0a100d` (app bg, visible through transparent fill) = **8.1:1** ✅ WCAG AAA

**Non-hue distinguisher:** Outline style (unfilled) + shield icon + single-weight border

---

### 4.3 Player Badge

Minimal and unobtrusive. Uses the steel-blue accent, which is tonally distinct from the gold family.

```
Visual: Subtle blue tint fill, blue border, blue-white text, person icon prefix
```

**Tailwind classes:**
```
inline-flex items-center gap-1.5
rounded-full
bg-[#577399]/15 border border-[#577399]/50
px-3 py-1
text-xs font-bold tracking-widest uppercase
text-[#8aaed4]
```

**Icon:** `⚔` (or SVG person/sword icon, 12×12px) — appears before "Player"

**Color values:**
- Background: `rgba(87, 115, 153, 0.15)`
- Border: `rgba(87, 115, 153, 0.50)`
- Text: `#8aaed4` (light steel-blue, lightened from `#577399` for contrast)

**Contrast ratio:** `#8aaed4` on `#0a100d` = **6.9:1** ✅ WCAG AA (large text threshold: 3:1 ✅)

**Non-hue distinguisher:** Blue tonal family vs gold family + sword/person icon

---

### 4.4 Badge Quick Reference

| Badge | Fill | Border | Text | Icon | Shape Signal |
|---|---|---|---|---|---|
| GM | Solid gold | Thick gold | Dark | Crown | Bold solid |
| Co-GM | Transparent | Thin gold | Gold | Shield | Outline |
| Player | Subtle blue | Thin blue | Light blue | Sword | Subtle tint |

---

## 5. Campaign List Page (`/campaigns`)

### 5.1 Layout Sketch

```
┌─────────────────────────────────────────────────────────────────────┐
│  Page bg: #0a100d                                                   │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  HEADER STRIP (px-6 py-8)                                   │   │
│  │  ┌──────────────────────────────┐   ┌────────────────────┐  │   │
│  │  │  [warbler-deck 2xl bold]     │   │  [+ Create Campaign]│  │   │
│  │  │  Your Campaigns              │   │  [CTA button]       │  │   │
│  │  │  [text-xs weathered]         │   └────────────────────┘  │   │
│  │  │  3 campaigns                 │                           │   │
│  │  └──────────────────────────────┘                           │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐          │
│  │  Campaign Card│  │  Campaign Card│  │  Campaign Card│          │
│  │               │  │               │  │               │          │
│  └───────────────┘  └───────────────┘  └───────────────┘          │
│                                                                     │
│  3-column grid on desktop (lg+), 2-col md, 1-col mobile            │
└─────────────────────────────────────────────────────────────────────┘
```

### 5.2 Page Wrapper

```
min-h-screen bg-[#0a100d] px-6 py-8
```

### 5.3 Header Strip

```html
<div class="flex items-end justify-between mb-8">
  <div>
    <h1 class="font-[warbler-deck] text-2xl font-bold tracking-wide text-[#f7f7ff]">
      Your Campaigns
    </h1>
    <p class="mt-1 text-xs font-medium tracking-widest uppercase text-[#b9baa3]">
      3 campaigns
    </p>
  </div>
  <button class="
    inline-flex items-center gap-2
    bg-[#577399] hover:bg-[#577399]/80
    text-[#f7f7ff] text-sm font-semibold tracking-wide
    rounded-lg px-5 py-2.5
    transition-colors duration-150
    shadow-card
  ">
    <PlusIcon class="w-4 h-4" />
    Create Campaign
  </button>
</div>
```

### 5.4 Campaign Card Grid

```
grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5
```

### 5.5 Campaign Card

Each card is a self-contained unit showing: name, description excerpt, member count, role badge,
and last active date.

**Visual anatomy (top to bottom):**
1. **Top meta bar** — role badge floated right
2. **Campaign name** — warbler-deck, bold, moonlight white
3. **Description excerpt** — 2-line clamp, weathered parchment
4. **Divider** — `border-t border-slate-700/40 mt-4 pt-4`
5. **Footer row** — member count left, last active right

```html
<a href="/campaigns/{id}" class="
  group block
  rounded-xl border border-[#577399]/30
  bg-slate-900/80
  p-5
  shadow-card-fantasy
  hover:border-[#577399]/60
  hover:bg-slate-900
  hover:shadow-[0_0_20px_rgba(87,115,153,0.15)]
  transition-all duration-200 ease-out
  cursor-pointer
">
  <!-- Top meta bar -->
  <div class="flex items-center justify-between mb-3">
    <!-- Role badge slot (see §4) -->
    <RoleBadge role={callerRole} />
    <!-- Active indicator dot -->
    <span class="w-2 h-2 rounded-full bg-emerald-500/70" title="Active recently" />
  </div>

  <!-- Campaign name -->
  <h2 class="
    font-[warbler-deck] text-base font-semibold
    text-[#f7f7ff]
    group-hover:text-white
    transition-colors duration-150
    leading-snug mb-1.5
  ">
    The Shattered Throne
  </h2>

  <!-- Description excerpt -->
  <p class="
    font-[ibarra-real-nova] text-sm text-[#b9baa3]
    line-clamp-2 leading-relaxed
  ">
    A fractured kingdom on the edge of ruin. The party must navigate court intrigue...
  </p>

  <!-- Divider -->
  <div class="border-t border-slate-700/40 mt-4 pt-4 flex items-center justify-between">
    <!-- Member count -->
    <span class="
      inline-flex items-center gap-1.5
      text-xs font-medium text-[#b9baa3]
    ">
      <UsersIcon class="w-3.5 h-3.5" />
      5 members
    </span>
    <!-- Last active -->
    <span class="text-xs text-[#b9baa3]/60">
      2 days ago
    </span>
  </div>
</a>
```

**Hover state rationale:** The card brightens its border and adds a faint blue halo
(`shadow-[0_0_20px_rgba(87,115,153,0.15)]`) — echoing the steel-blue CTA family. This is subtle
enough not to overpower but clearly signals interactivity. No transform/scale is used; the app
aesthetic is grounded and weighty, not bouncy.

### 5.6 Empty State

Shown when the user belongs to no campaigns.

```html
<div class="
  flex flex-col items-center justify-center
  min-h-[60vh] text-center px-6
">
  <!-- Decorative glyph -->
  <div class="
    w-20 h-20 rounded-full
    border-2 border-dashed border-slate-700/60
    flex items-center justify-center
    mb-6
  ">
    <ScrollIcon class="w-8 h-8 text-[#b9baa3]/40" />
  </div>

  <h2 class="
    font-[jetsam-collection-basilea] text-3xl tracking-widest
    text-[#b9baa3]/50 mb-3
  ">
    No Campaigns Yet
  </h2>

  <p class="font-[ibarra-real-nova] text-sm text-[#b9baa3]/50 max-w-xs mb-8 leading-relaxed">
    Create a campaign to gather your party, or ask your GM for an invite link.
  </p>

  <button class="
    bg-[#577399] hover:bg-[#577399]/80
    text-[#f7f7ff] text-sm font-semibold tracking-wide
    rounded-lg px-6 py-3
    transition-colors duration-150
  ">
    Create Your First Campaign
  </button>
</div>
```

### 5.7 Loading Skeleton

3 skeleton cards matching the card dimensions. Use a shimmer animation.

```html
<!-- Skeleton card (repeat ×3) -->
<div class="
  rounded-xl border border-slate-800
  bg-slate-900/60
  p-5
  animate-pulse
">
  <!-- Badge placeholder -->
  <div class="flex justify-between mb-3">
    <div class="h-5 w-16 rounded-full bg-slate-800" />
    <div class="h-2 w-2 rounded-full bg-slate-800" />
  </div>
  <!-- Title placeholder -->
  <div class="h-5 w-3/4 rounded bg-slate-800 mb-2" />
  <!-- Description lines -->
  <div class="h-3.5 w-full rounded bg-slate-800/70 mb-1.5" />
  <div class="h-3.5 w-2/3 rounded bg-slate-800/70" />
  <!-- Footer -->
  <div class="border-t border-slate-800 mt-4 pt-4 flex justify-between">
    <div class="h-3 w-20 rounded bg-slate-800" />
    <div class="h-3 w-16 rounded bg-slate-800" />
  </div>
</div>
```

**Tailwind config addition (if not present):**
```js
// tailwind.config.js — keyframes already provided by Tailwind's animate-pulse
// No custom addition needed for skeleton shimmer.
```

---

## 6. Create Campaign Form (`/campaigns/new`)

### 6.1 Layout Sketch

```
┌─────────────────────────────────────────────────────────┐
│  #0a100d bg                                             │
│                                                         │
│  ← Back to Campaigns                (breadcrumb link)   │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │  FORM CARD  (max-w-lg mx-auto mt-16)            │   │
│  │  rounded-2xl border border-slate-700/60 p-8     │   │
│  │  bg-[#0a100d]                                   │   │
│  │                                                 │   │
│  │  Create a Campaign          [warbler-deck 2xl]  │   │
│  │  Gather your party and begin your legend.       │   │
│  │                                                 │   │
│  │  ─────────────────────────────────────────────  │   │
│  │                                                 │   │
│  │  Campaign Name *                                │   │
│  │  [________________________________]             │   │
│  │                                                 │   │
│  │  Description (optional)                         │   │
│  │  [________________________________]             │   │
│  │  [________________________________]             │   │
│  │  [________________________________]             │   │
│  │                          423 / 500 chars        │   │
│  │                                                 │   │
│  │  [Cancel]              [Create Campaign →]      │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

### 6.2 Form Card Wrapper

```
max-w-lg mx-auto mt-16 px-4
rounded-2xl border border-slate-700/60
bg-[#0a100d] shadow-2xl p-8
```

### 6.3 Form Header

```html
<div class="mb-8">
  <h1 class="font-[warbler-deck] text-2xl font-bold text-[#f7f7ff] tracking-wide">
    Create a Campaign
  </h1>
  <p class="mt-1.5 text-sm text-[#b9baa3] font-[ibarra-real-nova]">
    Gather your party and begin your legend.
  </p>
</div>
<div class="border-t border-slate-700/40 mb-8" />
```

### 6.4 Input — Campaign Name

**Base state:**
```html
<div class="mb-6">
  <label class="
    block text-xs font-bold tracking-widest uppercase
    text-[#b9baa3] mb-2
    font-[ibarra-real-nova]
  ">
    Campaign Name <span class="text-[#fe5f55]">*</span>
  </label>
  <input
    type="text"
    placeholder="The Shattered Throne"
    class="
      w-full
      bg-slate-900/80 border border-slate-700/60
      rounded-lg px-4 py-3
      text-sm text-[#f7f7ff] placeholder:text-[#b9baa3]/40
      font-[ibarra-real-nova]
      focus:outline-none focus:ring-2 focus:ring-[#577399]/60
      focus:border-[#577399]/60
      transition-colors duration-150
    "
  />
</div>
```

**Error state** (append/swap classes):
```html
<!-- Error state — border and ring shift to danger/ember -->
<input class="
  w-full
  bg-slate-900/80 border border-[#fe5f55]/60
  rounded-lg px-4 py-3
  text-sm text-[#f7f7ff] placeholder:text-[#b9baa3]/40
  font-[ibarra-real-nova]
  focus:outline-none focus:ring-2 focus:ring-[#fe5f55]/40
  focus:border-[#fe5f55]
  transition-colors duration-150
" />
<p class="mt-1.5 text-xs text-[#fe5f55] font-[ibarra-real-nova]">
  Campaign name is required.
</p>
```

### 6.5 Textarea — Description

```html
<div class="mb-8">
  <label class="
    block text-xs font-bold tracking-widest uppercase
    text-[#b9baa3] mb-2
    font-[ibarra-real-nova]
  ">
    Description
    <span class="ml-1 font-normal normal-case tracking-normal text-[#b9baa3]/50">
      (optional)
    </span>
  </label>
  <textarea
    rows="4"
    maxlength="500"
    placeholder="Describe your campaign setting, tone, or what players can expect..."
    class="
      w-full resize-none
      bg-slate-900/80 border border-slate-700/60
      rounded-lg px-4 py-3
      text-sm text-[#f7f7ff] placeholder:text-[#b9baa3]/40
      font-[ibarra-real-nova] leading-relaxed
      focus:outline-none focus:ring-2 focus:ring-[#577399]/60
      focus:border-[#577399]/60
      transition-colors duration-150
    "
  />
  <!-- Character counter -->
  <div class="flex justify-end mt-1.5">
    <span class="text-xs text-[#b9baa3]/50 font-[ibarra-real-nova]">
      {charCount} / 500
    </span>
  </div>
</div>
```

**Character counter near-limit state** (> 450 chars): change counter color to `text-gold-400`
**At limit** (= 500): change to `text-[#fe5f55]`

### 6.6 Form Actions

```html
<div class="flex items-center justify-end gap-3">
  <!-- Cancel -->
  <button type="button" class="
    px-5 py-2.5
    text-sm font-semibold text-[#b9baa3]
    hover:text-[#f7f7ff]
    transition-colors duration-150
    font-[ibarra-real-nova]
  ">
    Cancel
  </button>

  <!-- Submit -->
  <button type="submit" class="
    inline-flex items-center gap-2
    bg-[#577399] hover:bg-[#577399]/80
    disabled:opacity-50 disabled:cursor-not-allowed
    text-[#f7f7ff] text-sm font-semibold tracking-wide
    rounded-lg px-5 py-2.5
    transition-colors duration-150
    font-[ibarra-real-nova]
  ">
    Create Campaign
    <ArrowRightIcon class="w-4 h-4" />
  </button>
</div>
```

**Loading state (submit button):**
```html
<button disabled class="
  inline-flex items-center gap-2
  bg-[#577399]/60 cursor-wait
  text-[#f7f7ff]/80 text-sm font-semibold tracking-wide
  rounded-lg px-5 py-2.5
  font-[ibarra-real-nova]
">
  <SpinnerIcon class="w-4 h-4 animate-spin" />
  Creating...
</button>
```

### 6.7 Breadcrumb Link

```html
<a href="/campaigns" class="
  inline-flex items-center gap-1.5
  text-xs font-medium text-[#b9baa3]/60
  hover:text-[#b9baa3]
  transition-colors duration-150
  mb-10
  font-[ibarra-real-nova] tracking-wide
">
  <ChevronLeftIcon class="w-3.5 h-3.5" />
  Back to Campaigns
</a>
```

---

## 7. Campaign Detail Page (`/campaigns/[id]`)

### 7.1 Layout Sketch (Desktop)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  HEADER STRIP  h-16  bg-slate-900/90  border-b border-slate-700/40          │
│  px-6  backdrop-blur-sm  sticky top-0 z-40                                  │
│                                                                             │
│  ┌──────────────────────────────┐       ┌────────┐ ┌────────┐ ┌──────────┐ │
│  │  [warbler-deck]              │       │ Invite │ │Settings│ │[GM badge]│ │
│  │  The Shattered Throne        │       │  [btn] │ │  [btn] │ │          │ │
│  │  [text-xs description]       │       └────────┘ └────────┘ └──────────┘ │
│  └──────────────────────────────┘                                           │
├───────────────────────────────────────┬─────────────────────────────────────┤
│  SIDEBAR  w-[300px]  flex-shrink-0    │  MAIN PANEL  flex-1                 │
│  border-r border-slate-700/40         │  overflow-y-auto                    │
│  bg-slate-900/40  overflow-y-auto     │                                     │
│  h-[calc(100vh-4rem)]                 │  ┌─────────────────────────────┐   │
│                                       │  │  Character Sheet View       │   │
│  ┌───────────────────────────────┐    │  │  (full character sheet of   │   │
│  │  ROSTER HEADER                │    │  │   selected member)          │   │
│  │  Members · 5    [+ Invite]    │    │  │                             │   │
│  └───────────────────────────────┘    │  │  GM: middle-click hint bar  │   │
│                                       │  └─────────────────────────────┘   │
│  ┌───────────────────────────────┐    │                                     │
│  │  Member Card (selected)       │    │  [No selection empty state]         │
│  └───────────────────────────────┘    │                                     │
│  ┌───────────────────────────────┐    │                                     │
│  │  Member Card                  │    │                                     │
│  └───────────────────────────────┘    │                                     │
│  ┌───────────────────────────────┐    │                                     │
│  │  Member Card                  │    │                                     │
│  └───────────────────────────────┘    │                                     │
│                                       │                                     │
└───────────────────────────────────────┴─────────────────────────────────────┘

Proportions: Sidebar 300px fixed | Main panel fills remaining width (flex-1)
Total page: min-h-screen, no outer scroll — each panel scrolls independently
```

### 7.2 Page Shell

```html
<div class="min-h-screen bg-[#0a100d] flex flex-col">

  <!-- Header strip -->
  <header class="
    h-16 flex-shrink-0
    flex items-center justify-between
    px-6
    bg-slate-900/90 border-b border-slate-700/40
    backdrop-blur-sm
    sticky top-0 z-40
  ">
    <!-- Campaign identity -->
    <div class="flex flex-col justify-center min-w-0 mr-6">
      <h1 class="
        font-[warbler-deck] text-lg font-bold text-[#f7f7ff]
        tracking-wide truncate
      ">
        The Shattered Throne
      </h1>
      <p class="text-xs text-[#b9baa3]/70 font-[ibarra-real-nova] truncate">
        A fractured kingdom on the edge of ruin...
      </p>
    </div>

    <!-- GM-only controls (hidden for players) -->
    <div class="flex items-center gap-3 flex-shrink-0">
      <button class="
        inline-flex items-center gap-2
        bg-[#577399]/20 hover:bg-[#577399]/40
        border border-[#577399]/40
        text-[#8aaed4] text-xs font-semibold tracking-wide
        rounded-lg px-4 py-2
        transition-colors duration-150
        font-[ibarra-real-nova]
      ">
        <LinkIcon class="w-3.5 h-3.5" />
        Invite
      </button>
      <button class="
        inline-flex items-center gap-2
        bg-transparent hover:bg-slate-800/60
        border border-slate-700/50
        text-[#b9baa3] text-xs font-semibold tracking-wide
        rounded-lg px-4 py-2
        transition-colors duration-150
        font-[ibarra-real-nova]
      ">
        <SettingsIcon class="w-3.5 h-3.5" />
        Settings
      </button>
      <!-- Caller's role badge -->
      <RoleBadge role="gm" />
    </div>
  </header>

  <!-- Two-pane body -->
  <div class="flex flex-1 overflow-hidden">

    <!-- Sidebar -->
    <aside class="
      w-[300px] flex-shrink-0
      border-r border-slate-700/40
      bg-slate-900/40
      overflow-y-auto
      h-[calc(100vh-4rem)]
    ">
      <!-- Roster header -->
      <div class="
        px-4 py-3
        border-b border-slate-700/30
        flex items-center justify-between
        sticky top-0 bg-slate-900/80 backdrop-blur-sm z-10
      ">
        <span class="
          text-xs font-bold tracking-widest uppercase
          text-[#b9baa3]/70
          font-[ibarra-real-nova]
        ">
          Members · 5
        </span>
      </div>
      <!-- Member cards list -->
      <ul class="p-3 flex flex-col gap-2">
        <!-- MemberCard components rendered here -->
      </ul>
    </aside>

    <!-- Main panel -->
    <main class="flex-1 overflow-y-auto h-[calc(100vh-4rem)]">
      <!-- Content: character sheet OR no-selection state -->
    </main>

  </div>
</div>
```

---

### 7.3 Sidebar Member Card

Three states: **default**, **selected/active**, **GM-highlighted** (the primary GM).

#### 7.3.1 Default State

```html
<li>
  <button class="
    w-full text-left
    rounded-lg p-3
    flex items-start gap-3
    hover:bg-slate-800/60
    transition-colors duration-150
    group
  ">
    <!-- Avatar -->
    <div class="relative flex-shrink-0">
      <img
        src={avatarUrl ?? '/default-avatar.png'}
        alt=""
        class="w-9 h-9 rounded-full object-cover border border-slate-700/60"
      />
    </div>

    <!-- Member info -->
    <div class="flex-1 min-w-0">
      <div class="flex items-center gap-2 mb-0.5">
        <span class="text-sm font-semibold text-[#f7f7ff] truncate font-[ibarra-real-nova]">
          Aelindra Moonwhisper
        </span>
        <!-- Role badge (compact: icon only + abbreviated text) -->
        <RoleBadge role="player" compact />
      </div>
      <!-- Character name -->
      <p class="text-xs text-[#b9baa3]/70 font-[ibarra-real-nova] truncate">
        ⚔ Thornwick the Bold · Warrior
      </p>
    </div>

    <!-- GM-only: remove button (appears on hover) -->
    <button class="
      opacity-0 group-hover:opacity-100
      p-1 rounded
      text-[#b9baa3]/40 hover:text-[#fe5f55]
      hover:bg-[#fe5f55]/10
      transition-all duration-150
      flex-shrink-0
    " aria-label="Remove member">
      <XIcon class="w-3.5 h-3.5" />
    </button>
  </button>
</li>
```

#### 7.3.2 Selected / Active State

The selected card has a left accent bar and brightened background. This is the primary selection
indicator — shape-based, not color-only.

```html
<li>
  <button class="
    w-full text-left
    relative
    rounded-lg p-3
    flex items-start gap-3
    bg-slate-800/80
    border border-[#577399]/40
    shadow-[inset_0_0_0_1px_rgba(87,115,153,0.2)]
    transition-all duration-200
    group
  ">
    <!-- Left accent bar -->
    <div class="
      absolute left-0 top-2 bottom-2
      w-0.5 rounded-r-full
      bg-[#577399]
    " />

    <!-- Avatar (brightened ring) -->
    <div class="relative flex-shrink-0">
      <img
        src={avatarUrl}
        alt=""
        class="w-9 h-9 rounded-full object-cover border-2 border-[#577399]/70"
      />
    </div>

    <!-- Member info -->
    <div class="flex-1 min-w-0">
      <div class="flex items-center gap-2 mb-0.5">
        <span class="text-sm font-semibold text-white truncate font-[ibarra-real-nova]">
          Aelindra Moonwhisper
        </span>
        <RoleBadge role="player" compact />
      </div>
      <p class="text-xs text-[#b9baa3] font-[ibarra-real-nova] truncate">
        ⚔ Thornwick the Bold · Warrior
      </p>
    </div>
  </button>
</li>
```

**Selection transition:** `transition-all duration-200` — border and background fade in smoothly.

#### 7.3.3 GM-Highlighted State (Primary GM's own card)

The GM's own card gets a gold treatment to distinguish them from other members.

```html
<li>
  <button class="
    w-full text-left
    relative
    rounded-lg p-3
    flex items-start gap-3
    bg-gold-500/5
    border border-gold-500/25
    transition-all duration-200 hover:bg-gold-500/10
    group
  ">
    <!-- Left gold accent bar -->
    <div class="
      absolute left-0 top-2 bottom-2
      w-0.5 rounded-r-full
      bg-gold-500/70
    " />

    <!-- Avatar with gold ring -->
    <div class="relative flex-shrink-0">
      <img
        src={avatarUrl}
        alt=""
        class="w-9 h-9 rounded-full object-cover border-2 border-gold-500/50"
      />
      <!-- Crown pip on avatar -->
      <span class="
        absolute -top-1 -right-1
        w-4 h-4 rounded-full
        bg-gold-500 border border-[#0a100d]
        flex items-center justify-center
        text-[8px]
      ">
        👑
      </span>
    </div>

    <!-- Member info -->
    <div class="flex-1 min-w-0">
      <div class="flex items-center gap-2 mb-0.5">
        <span class="text-sm font-semibold text-[#f7f7ff] truncate font-[ibarra-real-nova]">
          Seraphel Voss
        </span>
        <RoleBadge role="gm" compact />
      </div>
      <p class="text-xs text-[#b9baa3]/70 font-[ibarra-real-nova] truncate">
        Game Master
      </p>
    </div>
  </button>
</li>
```

#### 7.3.4 "No Character Assigned" State (within Member Card)

Used when a player has joined but not yet assigned a character.

Replace the character name line with:

```html
<p class="
  text-xs text-[#b9baa3]/40
  font-[ibarra-real-nova] italic truncate
  flex items-center gap-1
">
  <GhostIcon class="w-3 h-3 flex-shrink-0" />
  No character assigned
</p>
```

The avatar also shows a dashed placeholder instead of an image:

```html
<div class="
  w-9 h-9 rounded-full
  border border-dashed border-slate-700/60
  flex items-center justify-center
  bg-slate-900/60
">
  <UserIcon class="w-4 h-4 text-[#b9baa3]/30" />
</div>
```

---

### 7.4 GM Ping Cursor Affordance

**Problem:** The GM must understand that middle-clicking any field on the character sheet sends a
ping. This must be communicated without cluttering the sheet.

**Solution — Three-layer approach:**

**Layer 1: Persistent hint bar (GM only)**

A thin banner pinned to the top of the main panel, just below the header strip:

```html
<!-- GM-only ping hint bar -->
<div class="
  flex items-center gap-2
  px-5 py-2
  bg-gold-500/8 border-b border-gold-500/15
  text-xs text-gold-400/70
  font-[ibarra-real-nova] font-medium
">
  <TargetIcon class="w-3.5 h-3.5 flex-shrink-0" />
  <span>
    <strong class="font-bold text-gold-400">Middle-click</strong> any field to ping
    the player.
  </span>
</div>
```

**Layer 2: Interactive element hover cursor**

Every `data-field-key` element gains a custom cursor class when the GM is viewing:

```css
/* global.css */
.ping-enabled [data-field-key] {
  cursor: crosshair;
}

.ping-enabled [data-field-key]:hover {
  /* Subtle gold tint appears on hover — communicates pingability */
  outline: 1px dashed rgba(251, 191, 36, 0.35);
  outline-offset: 3px;
  border-radius: 4px;
  transition: outline 100ms ease;
}
```

Apply `.ping-enabled` to the `<main>` panel wrapper when `viewerIsGM === true`.

**Layer 3: Tooltip on first hover**

On the GM's very first hover over a pingable field (tracked via `localStorage`), show a one-time
tooltip:

```html
<div class="
  absolute -top-8 left-1/2 -translate-x-1/2
  bg-slate-800 border border-gold-500/30
  rounded-md px-2 py-1
  text-xs text-gold-400
  font-[ibarra-real-nova]
  whitespace-nowrap
  pointer-events-none
  z-50
  animate-in fade-in duration-200
">
  Middle-click to ping
  <div class="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800" />
</div>
```

---

### 7.5 No-Character-Selected State (Main Panel)

When no member card is selected yet, the main panel shows:

```html
<div class="
  flex flex-col items-center justify-center
  h-full text-center px-8
">
  <div class="
    w-16 h-16 rounded-full
    border-2 border-dashed border-slate-700/50
    flex items-center justify-center
    mb-5
  ">
    <ScrollIcon class="w-7 h-7 text-[#b9baa3]/20" />
  </div>
  <p class="
    font-[jetsam-collection-basilea] text-2xl tracking-widest
    text-[#b9baa3]/30 mb-2
  ">
    Select a Member
  </p>
  <p class="text-xs text-[#b9baa3]/30 font-[ibarra-real-nova]">
    Choose a party member from the sidebar to view their character sheet.
  </p>
</div>
```

---

## 8. Invite Management Modal

### 8.1 Modal Shell

```html
<div class="
  fixed inset-0 z-50
  flex items-center justify-center
  bg-black/60 backdrop-blur-sm
  p-4
">
  <div class="
    relative w-full max-w-xl
    bg-[#0a100d] rounded-2xl
    border border-slate-700/60
    shadow-2xl
    overflow-hidden
    max-h-[85vh] flex flex-col
  ">
    <!-- Modal header -->
    <div class="
      flex items-center justify-between
      px-6 py-5
      border-b border-slate-700/40
      flex-shrink-0
    ">
      <div>
        <h2 class="font-[warbler-deck] text-lg font-bold text-[#f7f7ff] tracking-wide">
          Manage Invites
        </h2>
        <p class="text-xs text-[#b9baa3]/60 font-[ibarra-real-nova] mt-0.5">
          Create and manage invite links for your campaign.
        </p>
      </div>
      <button class="
        p-1.5 rounded-lg
        text-[#b9baa3]/50 hover:text-[#f7f7ff]
        hover:bg-slate-800/60
        transition-colors duration-150
      " aria-label="Close">
        <XIcon class="w-4 h-4" />
      </button>
    </div>

    <!-- Scrollable body -->
    <div class="overflow-y-auto flex-1 px-6 py-5 flex flex-col gap-6">

      <!-- Create invite section -->
      <!-- Active invites section -->

    </div>
  </div>
</div>
```

### 8.2 Create Invite Form (inside modal body)

```html
<section>
  <h3 class="
    text-xs font-bold tracking-widest uppercase
    text-[#b9baa3]/50 mb-4
    font-[ibarra-real-nova]
  ">
    Create New Invite
  </h3>

  <div class="
    rounded-xl border border-slate-700/40
    bg-slate-900/60 p-4
    flex flex-col gap-4
  ">
    <div class="grid grid-cols-2 gap-4">
      <!-- Max uses -->
      <div>
        <label class="block text-xs font-semibold text-[#b9baa3] mb-1.5 font-[ibarra-real-nova]">
          Max Uses
        </label>
        <select class="
          w-full
          bg-slate-900 border border-slate-700/60
          rounded-lg px-3 py-2.5
          text-sm text-[#f7f7ff]
          font-[ibarra-real-nova]
          focus:outline-none focus:ring-2 focus:ring-[#577399]/60
        ">
          <option value="">Unlimited</option>
          <option value="1">1 use</option>
          <option value="5">5 uses</option>
          <option value="10">10 uses</option>
          <option value="25">25 uses</option>
        </select>
      </div>

      <!-- Expiry -->
      <div>
        <label class="block text-xs font-semibold text-[#b9baa3] mb-1.5 font-[ibarra-real-nova]">
          Expires
        </label>
        <input type="date" class="
          w-full
          bg-slate-900 border border-slate-700/60
          rounded-lg px-3 py-2.5
          text-sm text-[#f7f7ff]
          font-[ibarra-real-nova]
          focus:outline-none focus:ring-2 focus:ring-[#577399]/60
          [color-scheme:dark]
        " />
      </div>
    </div>

    <button class="
      self-end
      inline-flex items-center gap-2
      bg-[#577399] hover:bg-[#577399]/80
      text-[#f7f7ff] text-sm font-semibold
      rounded-lg px-4 py-2
      transition-colors duration-150
      font-[ibarra-real-nova]
    ">
      <PlusIcon class="w-4 h-4" />
      Generate Link
    </button>
  </div>
</section>
```

### 8.3 Active Invites List

```html
<section>
  <h3 class="
    text-xs font-bold tracking-widest uppercase
    text-[#b9baa3]/50 mb-4
    font-[ibarra-real-nova]
  ">
    Active Links · {count}
  </h3>

  <ul class="flex flex-col gap-3">
    {invites.map(invite => (
      <li class="
        rounded-xl border border-slate-700/40
        bg-slate-900/40 p-4
      ">
        <!-- Invite URL (copyable) -->
        <div class="
          flex items-center gap-2
          bg-slate-950/60 border border-slate-800
          rounded-lg px-3 py-2 mb-3
        ">
          <span class="
            flex-1 text-xs text-[#577399] font-mono truncate
          ">
            https://app.curses-ccb.example.com/join/{invite.inviteCode}
          </span>
          <button class="
            flex-shrink-0
            p-1 rounded
            text-[#b9baa3]/50 hover:text-[#577399]
            hover:bg-[#577399]/10
            transition-colors duration-150
          " aria-label="Copy invite link">
            <CopyIcon class="w-3.5 h-3.5" />
          </button>
        </div>

        <!-- Invite meta row -->
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-4 text-xs text-[#b9baa3]/60 font-[ibarra-real-nova]">
            <!-- Uses remaining -->
            <span class="flex items-center gap-1">
              <UsersIcon class="w-3 h-3" />
              {invite.maxUses ? `${invite.maxUses - invite.useCount} / ${invite.maxUses} uses` : '∞ uses'}
            </span>
            <!-- Expiry -->
            {invite.expiresAt && (
              <span class="flex items-center gap-1">
                <ClockIcon class="w-3 h-3" />
                Expires {formatRelative(invite.expiresAt)}
              </span>
            )}
          </div>

          <!-- Revoke button -->
          <button class="
            inline-flex items-center gap-1.5
            text-xs font-semibold
            text-[#fe5f55]/70 hover:text-[#fe5f55]
            hover:bg-[#fe5f55]/10
            rounded-md px-2 py-1
            transition-colors duration-150
            font-[ibarra-real-nova]
          ">
            <XIcon class="w-3 h-3" />
            Revoke
          </button>
        </div>
      </li>
    ))}
  </ul>
</section>
```

### 8.4 Empty Invites State

```html
<li class="
  rounded-xl border border-dashed border-slate-700/40
  p-6 text-center text-xs text-[#b9baa3]/40
  font-[ibarra-real-nova]
">
  No active invite links. Generate one above.
</li>
```

---

## 9. Join Page (`/join/[code]`)

### 9.1 Layout Sketch

```
┌──────────────────────────────────────────────────┐
│  #0a100d bg  min-h-screen                        │
│                                                  │
│  ┌──────────────────────────────────────────┐   │
│  │  CARD  max-w-sm mx-auto mt-32            │   │
│  │  rounded-2xl border bg-[#0a100d] p-8     │   │
│  │                                          │   │
│  │  [Campaign crest / scroll icon]          │   │
│  │                                          │   │
│  │  You've been invited to                  │   │
│  │  [Campaign Name — warbler-deck 2xl]      │   │
│  │  [Description]                           │   │
│  │                                          │   │
│  │  [Join Campaign →]  (CTA)                │   │
│  └──────────────────────────────────────────┘   │
└──────────────────────────────────────────────────┘
```

### 9.2 Default Invite View

```html
<div class="min-h-screen bg-[#0a100d] flex items-start justify-center pt-24 px-4">
  <div class="
    w-full max-w-sm
    rounded-2xl border border-slate-700/60
    bg-[#0a100d] shadow-2xl
    p-8 text-center
  ">
    <!-- Crest icon -->
    <div class="
      w-16 h-16 rounded-full
      border-2 border-[#577399]/40
      bg-[#577399]/10
      flex items-center justify-center
      mx-auto mb-6
    ">
      <ShieldIcon class="w-7 h-7 text-[#577399]" />
    </div>

    <!-- Invite copy -->
    <p class="
      text-xs font-bold tracking-widest uppercase
      text-[#b9baa3]/50 mb-2
      font-[ibarra-real-nova]
    ">
      You've been invited to
    </p>
    <h1 class="
      font-[warbler-deck] text-2xl font-bold text-[#f7f7ff]
      tracking-wide mb-3
    ">
      The Shattered Throne
    </h1>
    <p class="
      text-sm text-[#b9baa3] font-[ibarra-real-nova] leading-relaxed mb-8
    ">
      A fractured kingdom on the edge of ruin. The party must navigate court
      intrigue and ancient magic...
    </p>

    <!-- Join CTA -->
    <button class="
      w-full
      inline-flex items-center justify-center gap-2
      bg-[#577399] hover:bg-[#577399]/80
      text-[#f7f7ff] text-sm font-semibold tracking-wide
      rounded-lg px-5 py-3
      transition-colors duration-150
      font-[ibarra-real-nova]
    ">
      Join Campaign
      <ArrowRightIcon class="w-4 h-4" />
    </button>
  </div>
</div>
```

### 9.3 Already-a-Member State

Replace CTA block with:

```html
<div class="
  w-full
  rounded-lg border border-[#577399]/30
  bg-[#577399]/10
  px-4 py-3 mb-4
  text-sm text-[#8aaed4] font-[ibarra-real-nova]
  flex items-center gap-2
">
  <CheckCircleIcon class="w-4 h-4 flex-shrink-0" />
  You're already a member of this campaign.
</div>

<a href="/campaigns/{campaignId}" class="
  w-full
  inline-flex items-center justify-center gap-2
  bg-slate-800 hover:bg-slate-700
  text-[#f7f7ff] text-sm font-semibold
  rounded-lg px-5 py-3
  transition-colors duration-150
  font-[ibarra-real-nova]
">
  Go to Campaign
  <ArrowRightIcon class="w-4 h-4" />
</a>
```

### 9.4 Expired / Invalid Invite State

Replace the card contents:

```html
<!-- Replace crest icon -->
<div class="
  w-16 h-16 rounded-full
  border-2 border-[#fe5f55]/30
  bg-[#fe5f55]/10
  flex items-center justify-center
  mx-auto mb-6
">
  <AlertIcon class="w-7 h-7 text-[#fe5f55]/70" />
</div>

<p class="
  text-xs font-bold tracking-widest uppercase
  text-[#fe5f55]/60 mb-2
  font-[ibarra-real-nova]
">
  Invalid Invite
</p>
<h1 class="
  font-[warbler-deck] text-2xl font-bold text-[#f7f7ff]
  tracking-wide mb-3
">
  This Link Has Expired
</h1>
<p class="
  text-sm text-[#b9baa3] font-[ibarra-real-nova] leading-relaxed mb-8
">
  This invite link is no longer valid. It may have expired or reached its maximum
  number of uses. Ask your GM for a new link.
</p>

<a href="/campaigns" class="
  w-full
  inline-flex items-center justify-center gap-2
  bg-slate-800 hover:bg-slate-700
  text-[#f7f7ff] text-sm font-semibold
  rounded-lg px-5 py-3
  transition-colors duration-150
  font-[ibarra-real-nova]
">
  Browse Your Campaigns
</a>
```

---

## 10. Ping Effect — Full CSS Spec

### 10.1 Design Intent

The ping must:
- Be **immediately attention-grabbing** without being seizure-triggering
- Feel **magical and deliberate** — not a browser-default focus ring
- Fade gracefully so it doesn't distract after drawing attention
- Work on **any element shape** (stat boxes, trackers, text fields)

**Chosen visual:** A dual-layer pulse — a gold outline that sharpens on trigger, paired with an
expanding box-shadow ring that pulses 3 times and fades. After pulses complete, a gentle persistent
glow lingers for 1 second before fading out. Total duration: ~3.5s.

### 10.2 Full Keyframe Definitions

```css
/* ========================================================================
   PING EFFECT — global.css (or styles/ping.css, imported in layout.tsx)
   ======================================================================== */

/* ── Outer ring: expands and fades (the "sonar" pulse) ── */
@keyframes ping-ring {
  0% {
    box-shadow:
      0 0 0 0px rgba(251, 191, 36, 0.80),   /* gold-400 */
      0 0 0 0px rgba(251, 191, 36, 0.40);
  }
  40% {
    box-shadow:
      0 0 0 6px  rgba(251, 191, 36, 0.50),
      0 0 0 14px rgba(251, 191, 36, 0.15);
  }
  100% {
    box-shadow:
      0 0 0 12px rgba(251, 191, 36, 0.00),
      0 0 0 24px rgba(251, 191, 36, 0.00);
  }
}

/* ── Outline flash: solid on trigger, fades to glow ── */
@keyframes ping-outline {
  0%   { outline-color: rgba(251, 191, 36, 1.00); }
  30%  { outline-color: rgba(251, 191, 36, 0.80); }
  100% { outline-color: rgba(251, 191, 36, 0.00); }
}

/* ── Background warmth: subtle amber wash, fades out ── */
@keyframes ping-fill {
  0%   { background-color: rgba(251, 191, 36, 0.12); }
  60%  { background-color: rgba(251, 191, 36, 0.06); }
  100% { background-color: transparent; }
}
```

### 10.3 The `.ping-active` Class

```css
.ping-active {
  position: relative;
  z-index: 10;

  /* Outline — applied instantly, fades over 3 pulses */
  outline: 2px solid rgba(251, 191, 36, 1.00);
  outline-offset: 3px;
  border-radius: 6px;   /* softened — looks intentional, not browser-default */

  /* Animation stack:
     - ping-ring:    1s per cycle, 3 iterations = 3s total, ease-out each
     - ping-outline: 3s total, linear fade, 1 iteration
     - ping-fill:    3s total, linear fade, 1 iteration
  */
  animation:
    ping-ring    1s ease-out 3,          /* 3 sonar pulses over 3 seconds */
    ping-outline 3s linear   1 forwards, /* outline fades over full duration */
    ping-fill    3s linear   1 forwards; /* warm wash fades over full duration */

  /* After animation completes (delay cleanup via JS timeout) */
}
```

### 10.4 Reduced Motion Variant

```css
@media (prefers-reduced-motion: reduce) {
  .ping-active {
    /* No animation — use static outline + color only */
    animation: none;
    outline: 2px solid rgba(251, 191, 36, 0.90);
    outline-offset: 3px;
    border-radius: 6px;
    background-color: rgba(251, 191, 36, 0.10);

    /* Fade out via transition after JS removes the class */
    transition: outline-color 600ms ease, background-color 600ms ease;
  }

  /* When class is removed, transition to transparent */
  .ping-active-exit {
    outline-color: transparent;
    background-color: transparent;
  }
}
```

### 10.5 JavaScript Handler (Updated from Architecture Doc)

```typescript
// hooks/usePingHandler.ts

const PING_DURATION_MS = 3000; // matches animation duration
const PING_EXIT_MS     = 600;  // matches reduced-motion transition

function handlePing(event: PingEvent) {
  const el = document.querySelector<HTMLElement>(
    `[data-field-key="${CSS.escape(event.fieldKey)}"]`
  );
  if (!el) return;

  // Smooth scroll to element
  el.scrollIntoView({ behavior: 'smooth', block: 'center' });

  // Apply ping class
  el.classList.remove('ping-active', 'ping-active-exit'); // clear any prior
  requestAnimationFrame(() => {
    el.classList.add('ping-active');
  });

  // Remove after animation completes
  setTimeout(() => {
    el.classList.add('ping-active-exit');   // triggers reduced-motion exit transition
    el.classList.remove('ping-active');
    setTimeout(() => {
      el.classList.remove('ping-active-exit');
    }, PING_EXIT_MS);
  }, PING_DURATION_MS);
}
```

### 10.6 Timing & Easing Summary

| Layer | Duration | Easing | Iterations | Purpose |
|---|---|---|---|---|
| `ping-ring` (box-shadow) | 1s per cycle | `ease-out` | 3 | Sonar-style expanding ring |
| `ping-outline` | 3s | `linear` | 1 (forwards) | Border fades gradually |
| `ping-fill` | 3s | `linear` | 1 (forwards) | Amber wash fades gradually |
| Scroll | `smooth` | Browser default | — | Brings element into view |
| Reduced-motion exit | 600ms | `ease` | — | Transition on class removal |

**Total visible duration:** 3.0s (animated) / 3.6s (reduced-motion with exit transition)

**Seizure safety:** No element flashes faster than 3 Hz (the ring pulses once per second, well
below the 3 Hz / 50% area threshold defined in WCAG 2.3.1). The reduced-motion variant eliminates
all animation entirely.

---

## 11. Animation & Micro-interaction Specs

### 11.1 Campaign Card Hover

```css
/* Via Tailwind on the <a> element: */

/* Border brightens: border-[#577399]/30 → border-[#577399]/60 */
/* Background brightens: bg-slate-900/80 → bg-slate-900 */
/* Shadow grows: shadow-card-fantasy → custom glow */
/* Transition: transition-all duration-200 ease-out */
```

No `scale` or `translate` transforms — the aesthetic is grounded and weighty.

**Tailwind string (complete card):**
```
transition-all duration-200 ease-out
hover:border-[#577399]/60
hover:bg-slate-900
hover:shadow-[0_0_20px_rgba(87,115,153,0.15)]
```

### 11.2 Sidebar Member Card Selection Transition

When a card moves from default → selected:

1. Background fades from transparent to `bg-slate-800/80` — `duration-200`
2. Left accent bar fades in — achieved via `opacity-0 → opacity-100` on the bar element,
   controlled by a `data-selected` attribute or `aria-selected`:

```css
/* global.css */
.member-card-bar {
  opacity: 0;
  transition: opacity 200ms ease;
}

[data-selected="true"] .member-card-bar {
  opacity: 1;
}
```

3. Border color transitions from `border-transparent` to `border-[#577399]/40` — `duration-200`
4. Avatar ring transitions from `border-slate-700/60` to `border-[#577399]/70` — `duration-200`

All transitions use the same `duration-200` so they feel unified and synchronous.

### 11.3 Ping Cursor Hover (GM side)

When the GM hovers a `[data-field-key]` element:

```css
.ping-enabled [data-field-key] {
  cursor: crosshair;
  transition: outline 100ms ease, background-color 100ms ease;
}

.ping-enabled [data-field-key]:hover {
  outline: 1px dashed rgba(251, 191, 36, 0.35);
  outline-offset: 3px;
  border-radius: 4px;
  background-color: rgba(251, 191, 36, 0.04);
}
```

`transition: 100ms` — fast enough to feel responsive, slow enough not to flash.

### 11.4 Toast Notifications

Toasts appear in the bottom-right corner (`fixed bottom-6 right-6 z-50`), stack upward, and
auto-dismiss after 4 seconds with a fade+slide exit.

**Toast shell:**
```html
<div class="
  flex items-start gap-3
  min-w-[280px] max-w-[360px]
  rounded-xl border
  px-4 py-3.5
  shadow-xl
  animate-in slide-in-from-bottom-2 fade-in duration-300
">
```

#### Toast: "You've joined!" (success)

```html
<div class="
  flex items-start gap-3
  min-w-[280px] max-w-[360px]
  rounded-xl
  border border-emerald-500/30
  bg-slate-900/95 backdrop-blur-sm
  px-4 py-3.5
  shadow-xl
  animate-in slide-in-from-bottom-2 fade-in duration-300
">
  <div class="
    w-8 h-8 rounded-full
    bg-emerald-500/20 border border-emerald-500/30
    flex items-center justify-center
    flex-shrink-0 mt-0.5
  ">
    <CheckIcon class="w-4 h-4 text-emerald-400" />
  </div>
  <div>
    <p class="text-sm font-semibold text-[#f7f7ff] font-[ibarra-real-nova]">
      Joined successfully!
    </p>
    <p class="text-xs text-[#b9baa3] font-[ibarra-real-nova] mt-0.5">
      Welcome to The Shattered Throne.
    </p>
  </div>
</div>
```

#### Toast: "Ping sent" (GM confirmation)

```html
<div class="
  flex items-start gap-3
  min-w-[280px] max-w-[360px]
  rounded-xl
  border border-gold-500/30
  bg-slate-900/95 backdrop-blur-sm
  px-4 py-3.5
  shadow-xl shadow-gold-500/5
  animate-in slide-in-from-bottom-2 fade-in duration-300
">
  <div class="
    w-8 h-8 rounded-full
    bg-gold-500/15 border border-gold-500/30
    flex items-center justify-center
    flex-shrink-0 mt-0.5
  ">
    <TargetIcon class="w-4 h-4 text-gold-400" />
  </div>
  <div>
    <p class="text-sm font-semibold text-[#f7f7ff] font-[ibarra-real-nova]">
      Ping sent
    </p>
    <p class="text-xs text-[#b9baa3] font-[ibarra-real-nova] mt-0.5">
      Aelindra's <strong class="text-gold-400">HP Tracker</strong> was highlighted.
    </p>
  </div>
</div>
```

**Toast dismiss animation:** On timeout or user click, add class:
```
animate-out slide-out-to-right-2 fade-out duration-200
```

Then remove from DOM after 200ms.

**Reduced-motion fallback:** Replace `animate-in`/`animate-out` with:
```css
@media (prefers-reduced-motion: reduce) {
  [data-toast] {
    animation: none;
    transition: opacity 200ms ease;
  }
  [data-toast][data-exiting] {
    opacity: 0;
  }
}
```

---

## 12. Colorblind Safety Notes

The three role badges are designed with **layered distinguishers** so no single person relying on
any form of color vision will fail to differentiate them:

| Distinguisher | GM | Co-GM | Player |
|---|---|---|---|
| Fill / outline | **Solid** (filled) | Outline only | Subtle tint |
| Icon | Crown 👑 | Shield 🛡 | Sword ⚔ |
| Border weight | `border-2` (thick) | `border` (thin) | `border` (thin) |
| Text content | "GM" | "Co-GM" | "Player" |
| Hue family | Gold/amber | Gold/amber (lighter) | Blue/steel |
| Luminance | Highest (solid gold) | Medium (transparent) | Lower (dark bg shows through) |

**Protanopia / Deuteranopia (red-green):** The gold vs. blue distinction holds because gold
(amber, yellow-dominant) and blue are not in the red-green confusion pair. Both are clearly
distinguishable to the most common colorblind profiles.

**Tritanopia (blue-yellow):** The gold badges use amber-warm hues; the player badge uses a
blue-steel hue. In tritanopia, blue and yellow can be confused. **However:** the icon (crown vs.
sword), fill style (solid vs. tint), and text content ("GM" vs. "Player") provide unambiguous
differentiation even if hue is indistinguishable.

**Achromatopsia (total color blindness):** Luminance differentiation — the GM solid gold badge is
the brightest element; the Co-GM outline is medium; the Player tint is the dimmest. Icons and
text remain the primary signal.

**Conclusion:** All three badges are distinguishable without relying on hue alone. ✅

---

## 13. Accessibility Checklist

| Item | Requirement | Implementation |
|---|---|---|
| Role badge contrast | WCAG AA ≥ 4.5:1 | GM: 8.4:1 ✅ Co-GM: 8.1:1 ✅ Player: 6.9:1 ✅ |
| Interactive controls | All buttons must have accessible names | `aria-label` on icon-only buttons |
| Sidebar member cards | Selectable items announced correctly | `role="button"` or `<button>`, `aria-selected` on list items |
| Ping effect | Must not trigger seizures | 1 Hz pulse × 3; WCAG 2.3.1 compliant |
| Reduced motion | All animations respect preference | `@media (prefers-reduced-motion)` on all keyframes |
| Form inputs | Labeled inputs | `<label>` with `for` / wrapping every `<input>` |
| Error states | Errors linked to inputs | `aria-describedby` pointing to error message element |
| Modal | Focus trap | Implement focus trap in modal shell component |
| Toast | Announced to screen readers | `role="status"` (non-urgent) or `role="alert"` (urgent) on toast container |
| Keyboard navigation | All interactive elements reachable | No `tabIndex={-1}` on interactive content; sidebar cards are `<button>` elements |

---

*End of Daggerheart Campaign System — Visual Design Specification v1.0*
