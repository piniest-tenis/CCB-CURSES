# Curses! CCB -- Competitive Advantage Analysis

*Generated: 2026-04-08*

This document catalogs features that **Curses! CCB** offers that neither **Demiplane** nor **Heart of Daggers** currently provide. These are the differentiators that justify our positioning.

---

## Competitors at a Glance

| | **Curses! CCB** | **Demiplane** | **Heart of Daggers** |
|---|---|---|---|
| Focus | Daggerheart-only | Multi-system (Daggerheart is one of many) | Daggerheart-only |
| Pricing | Free + Patreon tiers | Subscription + content purchases | Free + marketplace + Vaultsmith Pro |
| Stage | Production | Production (officially licensed) | Beta (character creator) |

---

## Features Unique to Curses! CCB

### 1. 3D Physics-Based Dice Rolling

Neither competitor offers 3D dice. Demiplane uses flat 2D dice rendering. Heart of Daggers has no visible dice system at all.

- **Three.js + Cannon.js** real-time physics simulation
- d4, d6, d8, d10, d12, d20 all modeled
- Action rolls, reaction rolls, damage rolls, generic rolls
- Critical detection (matching Hope + Fear d12 values)
- Advantage/disadvantage mechanics (extra dice, keep best/worst)
- Dice staging panel for custom dice pools
- Customizable dice colors (10+ presets + full color picker, per-character and per-user defaults)
- Separate body and label colors for Hope, Fear, and damage dice
- Dice log (last 50 entries with timestamps)

### 2. Streaming & OBS Integration

No competitor has any streaming integration whatsoever.

- **OBS Dice Animation Overlay** (`/obs/dice`) -- browser source that renders 3D dice via BroadcastChannel
- **OBS Dice Log Overlay** (`/obs/dice-log`) -- scrolling roll results as browser source
- **Twitch Overlay Widget** (`/twitch-overlay`) -- compact character stats for stream display
- **Full Twitch Extension** (panel + video component surfaces, config page, live config)
  - No backend service required -- uses Twitch Configuration Service
  - Character card with portrait, name, class, domains, HP/Stress/Hope
  - "View full sheet" link to public character sheet
- **Public Character Sheet** (`/character/[id]/public`) -- permanent signed-token URL for stream links

### 3. Real-Time WebSocket Communication (GM-to-Player)

Neither competitor offers live GM-to-player communication within the character toolset.

- **Live WebSocket connection** per campaign session (API Gateway WebSocket)
- **Auto-reconnect** with exponential backoff
- **GM Ping** -- highlights a specific field on a player's character sheet in real time
- **Dice Roll Broadcast** -- roll results visible to all campaign participants
- **Force-Crit** -- GM arms a forced critical for a player's next roll
- **Roll Request** -- GM sends a roll prompt directly to a specific player's sheet
- **Connection status indicator** in campaign header

### 4. Command Center (Live GM Dashboard)

Demiplane has no GM encounter/party tools. Heart of Daggers has an Encounter Manager but no live party vitals dashboard.

- **Party vitals grid** -- all characters displayed simultaneously
- **Danger-state color coding** (Healthy > 50% green, Wounded 25-50% amber, Critical < 25% red with pulse, Down = 0 HP)
- **Auto-sort by danger** (most-hurt characters shown first)
- **Party Hope total** aggregation
- **Fear tracker** integration with real-time sync (0-12 range)
- **Tap card to navigate** to full character sheet

### 5. Live Interactive Character Sheet with Auto-Save

Heart of Daggers has a character creator (beta) but not a full live sheet. Demiplane has a character sheet, but without the depth of stat derivation transparency.

- **Auto-save** with 1500ms debounce
- **Stat tooltip breakdowns** showing full derivation of every stat value (base + ancestry + community + level-up advances + domain card bonuses + armor modifiers)
- **HP / Stress / Armor slot trackers** with individual mark/unmark and visual bars
- **Hope tracker** with gain/spend buttons
- **Domain Loadout** (up to 5 active cards) + **Domain Vault** (unlimited stored cards)
- **Card token tracking** (place/spend/clear tokens on individual cards)
- **Active aura toggle** for aura cards
- **Recall cost display** (stress cost for vault-to-loadout outside rest)
- **Weapons with damage roll buttons** integrated into the sheet
- **Conditions system** (SRD + Curses! custom + campaign + fully custom conditions)
- **Companion panel** with companion state tracking and actions
- **Downtime projects** (creation, tick progress, completion tracking)
- **Favors panel** (Curses! campaign frame mechanic)
- **Notes panel** with markdown rendering
- **Class feature state tracking** with Hope-cost action buttons

### 6. Level-Up Wizard with Full Advancement Tracking

Neither competitor offers a guided, SRD-compliant level-up flow.

- **4-step wizard** (Overview, Advancement Choices, Domain Card Selection, Review & Confirm)
- **SRD-compliant advancement validation** (proficiency by tier, domain level gating)
- **Multiclass support** at Tier 3+ (level 5+)
- **Tier achievement display** (Foundation, Specialization, Mastery milestones)
- **Level-up history** tracking (all advancement choices stored per level)
- **Domain card exchange** during level-up

### 7. SRD Compliance Validation Engine

No competitor offers machine-readable rules validation.

- **`useCharacterValidation` hook** -- real-time compliance checking
- **Machine-readable SRD rules specification** (`srd-rules-specification.ts`)
- **25+ validation functions** with SRD page citations on every error
- **Covers:** trait validation, domain loadout capacity, armor score cap, resource bounds, advancement progression, multiclass rules, rest/downtime rules, death/scarring mechanics
- **SRD language audit** of 162 homebrew content files with 57 catalogued issues and prioritized action plan

### 8. Mixed Ancestry Builder Flow

Neither competitor supports mixed ancestry as a first-class builder step.

- Pick primary and secondary ancestry
- Choose one trait from each ancestry
- Name your custom mixed ancestry
- SRD p.16 compliant

### 9. Character Sharing via Signed Token URLs

- Permanent signed-token URLs for read-only character sheets
- No authentication required for viewers
- Designed for stream links, social sharing, and Twitch extension integration

### 10. GDPR/CCPA Compliance Tooling

Neither competitor advertises or offers self-service data compliance tools.

- **Full data export** (all user data, characters, campaigns)
- **Account deletion** (complete data removal)
- Dedicated compliance Lambda with integration guide

### 11. Encounter System with Environment Features

While Heart of Daggers has an encounter manager, Curses! CCB's is more deeply integrated with the campaign WebSocket and environment system.

- **Live encounter tracking** with status lifecycle (Preparing -> Active -> Completed)
- **Per-instance mutable state** (HP, stress, conditions, notes, defeated flag)
- **Round counter**
- **Adversary attack rolls** with critical detection
- **Environment catalog** with hazardous locations (tier, type, features)
- **Environment feature activation modes** (view-only, activate without roll, activate with player roll via WebSocket roll_request)
- **Potential adversary suggestions** per environment

### 12. Campaign Frames (Curated Homebrew Packages)

Heart of Daggers has a homebrew vault but not curated frame packages. Demiplane does not support homebrew.

- **Frame creation and editing** with content references
- **SRD restrictions/alterations** per frame
- **Custom type extensions** and conflict resolution rules
- **Campaign-level frame assignment**

### 13. Mobile-First Condensed Character Card

- **Condensed card view** as default mobile layout
- **Expand-to-full-sheet toggle**
- **SlotBar component** for compact HP/Stress/Armor visualization
- Touch-optimized 44px minimum targets (WCAG 2.5.5)

### 14. CMS-Driven Dynamic Content

- **Interstitials** (promotional/informational overlays)
- **Splash screens**
- **Loading interstitials with lore text**
- Served via dedicated CMS Lambda

---

## Features Where We Match Competitors

| Feature | Curses! CCB | Demiplane | Heart of Daggers |
|---|---|---|---|
| Character builder wizard | Yes (10-step) | Yes | Yes (beta) |
| Campaign management | Yes | Yes | Yes |
| Invite codes | Yes | Yes | Yes |
| Session scheduling | Yes | Unknown | Yes |
| Homebrew content | Yes (creation + frames) | No | Yes (vault + marketplace) |
| Rules reference | Partial (class/domain wiki) | Full compendium | Yes (compendium overlay) |
| Dark mode | No (parchment theme) | Yes | Yes |
| Multi-game support | No (Daggerheart only) | Yes | No (Daggerheart only) |

---

## Summary: Our Strongest Differentiators

1. **3D dice** -- visceral, physical-feeling dice that no competitor replicates
2. **Streaming integration** -- OBS overlays + Twitch extension = zero friction for content creators
3. **Real-time GM-to-player communication** -- force crits, roll requests, field pings
4. **Live Command Center** -- GM sees party health in real time with danger sorting
5. **SRD compliance engine** -- machine-readable validation with page citations
6. **Full character lifecycle** -- creation through level 10 with guided level-up wizard
7. **Stat transparency** -- hover any number to see its full derivation formula
8. **Mobile-first design** -- condensed card view purpose-built for phones at the table
