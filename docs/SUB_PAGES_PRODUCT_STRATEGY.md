# Sub-Pages Product Strategy

> **Status**: Strategic brief — ready for copywriting and front-end execution  
> **Version**: 1.0  
> **Date**: April 14, 2026  
> **Author**: Product & Marketing Specialist Agent

---

## Table of Contents

1. [Strategic Overview](#1-strategic-overview)
2. [Page Purpose & Goals](#2-page-purpose--goals)
3. [Content Architecture per Page](#3-content-architecture-per-page)
4. [Competitive Positioning per Page](#4-competitive-positioning-per-page)
5. [Cross-linking & Funnel Strategy](#5-cross-linking--funnel-strategy)
6. [Social Proof Strategy per Page](#6-social-proof-strategy-per-page)
7. [SEO & Discoverability](#7-seo--discoverability)
8. [Implementation Priority](#8-implementation-priority)

---

## 1. Strategic Overview

### The Role of Sub-Pages in the Funnel

The main landing page at `/` is a **breadth** play: it introduces all four value pillars (streaming, campaigns, new players, pricing) at a high level, creates desire, and funnels toward a single primary action — "Create Your Character." It does this well. The sub-pages serve a different function: they are **depth** plays.

A visitor who clicks "Learn more about streaming features" or "Explore campaign tools" from the landing page has already passed the awareness stage. They're in **active consideration**. They've seen the headline pitch and they want specifics before committing. The sub-pages must close that gap — answering the question "Is this actually as good as it sounds?" with enough detail to convert interest into registration.

### The Funnel Model

```
Landing Page (/)          → Awareness + Desire    → "This looks great"
Sub-Pages (/features/*)   → Consideration + Trust  → "This actually does what I need"
Pricing Page (/pricing)   → Decision + Commitment  → "This is worth it"
Registration (/auth/reg)  → Action                 → "I'm in"
```

### Design Principle: Go Deeper, Don't Repeat

The landing page already contains the core pitch for each feature area — the headline, the 1-2 sentence description, and the 3-feature summary cards. The sub-pages must **not** parrot this content. They should assume the visitor has read the landing page summary and wants the next level of detail: how it actually works, what the workflow looks like, what specific problems it solves, and why it's better than the alternative. Think of the landing page as the trailer and each sub-page as the first 20 minutes of the film.

### Target Reading Time

Each feature sub-page should target **3-5 minutes of reading** (800-1200 words of body copy, supplemented with visuals and interactive elements). The pricing page should target **2-3 minutes** (shorter copy, heavier on scannable structure). These pages are not blog posts — they're product pages. Every sentence must earn its place.

---

## 2. Page Purpose & Goals

### 2a. `/features/streaming` — Streaming & Content Creation

| Dimension | Detail |
|---|---|
| **Primary Audience** | Actual play streamers, podcast producers, Daggerheart content creators (GM-weighted, 70/30 GM-to-player) |
| **Secondary Audience** | Players whose GMs stream; viewers considering starting their own stream |
| **Funnel Stage** | Consideration → Decision |
| **Key Conversion Goal** | GM tier registration (this is the page most likely to convert a $5/month subscriber) |
| **Objection Answered** | "Does this really integrate with OBS/Twitch, or is it just a link I paste?" |
| **Question Answered** | "What does the overlay look like? How do I set it up? What can my viewers actually see?" |
| **Emotional Arc** | Curiosity → "Oh, this is real" → "This would make my stream look so much better" → Register |
| **Success Metric** | Click-through to `/auth/register` with intent to create a campaign (GM funnel) |

**Why this page matters most strategically**: This is the platform's most defensible differentiator. No other Daggerheart tool offers native streaming integration. This page converts the landing page's strongest claim ("Built for the Spotlight") into proof. Every detail here widens the competitive moat.

---

### 2b. `/features/campaigns` — Campaign Command Center

| Dimension | Detail |
|---|---|
| **Primary Audience** | Active GMs running or planning a Daggerheart campaign |
| **Secondary Audience** | GMs evaluating whether to switch from spreadsheets/Discord/Alchemy VTT |
| **Funnel Stage** | Consideration → Decision |
| **Key Conversion Goal** | GM tier registration (this page validates the $5/month value proposition) |
| **Objection Answered** | "I already use Google Sheets / Alchemy / Demiplane. Why switch?" |
| **Question Answered** | "What can the encounter designer actually do? How does the Command HUD work in a live session?" |
| **Emotional Arc** | "I have a system that works" → "Wait, this does all of that in one place?" → "My current setup is duct tape" → Register |
| **Success Metric** | Click-through to `/auth/register` or `/pricing` |

**Why this page matters**: Campaign tools are the deepest feature set and the core of the GM subscription value. This is where the "$5 replaces five subscriptions" claim gets proven. The page must make a GM feel the weight of what they're getting.

---

### 2c. `/features/new-players` — New Player Experience

| Dimension | Detail |
|---|---|
| **Primary Audience** | Brand-new TTRPG players invited by a friend or GM; people who watched Daggerheart content and want to try |
| **Secondary Audience** | GMs looking for tools to onboard new players; experienced players evaluating the builder's quality |
| **Funnel Stage** | Awareness → Consideration (this audience is earlier in the funnel than the other pages) |
| **Key Conversion Goal** | Free player registration (character builder entry) |
| **Objection Answered** | "I've never played a TTRPG and I don't know the rules. Can I actually do this?" |
| **Question Answered** | "What does the step-by-step builder look like? Will I understand what I'm choosing? How long does it take?" |
| **Emotional Arc** | Intimidation → Reassurance → "That actually looks fun" → "I can do this" → Register |
| **Success Metric** | Click-through to `/auth/register` with intent to build a character (free funnel) |

**Why this page matters**: Daggerheart is a growing game. The total addressable market expands with every new player. This page reduces the barrier to zero and gives GMs a link they can send to their friends. It's also the page most likely to be shared on social media ("Hey, want to try Daggerheart? Start here").

---

### 2d. `/pricing` — Pricing Details

| Dimension | Detail |
|---|---|
| **Primary Audience** | Anyone who's seen the landing page pricing summary and wants the full breakdown before committing |
| **Secondary Audience** | GMs comparing Curses! against Demiplane or Alchemy VTT pricing; players wanting to confirm "free" means free |
| **Funnel Stage** | Decision (bottom of funnel) |
| **Key Conversion Goal** | Registration — either free (player) or paid (GM) |
| **Objection Answered** | "What's the catch with the free tier? Is $5/month really enough? What if I cancel?" |
| **Question Answered** | "What exactly do I get at each tier? How does this compare to competitors? Is there an annual discount?" |
| **Emotional Arc** | Scrutiny → "The free tier is genuinely full-featured" → "The GM tier is an obvious yes at $5" → Register |
| **Success Metric** | Registration click (primary), pricing page bounce rate < 40% |

**Why this page matters**: This is the final decision page. A visitor here has already decided they're interested — they're deciding whether to act. The page must remove every remaining objection with transparency, generosity, and clarity. No tricks, no dark patterns, no hidden costs.

---

## 3. Content Architecture per Page

### 3a. `/features/streaming` — Section Blueprint

**Target word count**: 900-1100 words  
**Target reading time**: 3-4 minutes  
**Visual density**: High (this page should be the most visual of the four — screenshots, animated demos, before/after comparisons)

#### Section 1: Hero Banner
- **Content**: Page-specific hero with headline, subheadline, and a single screenshot/mockup showing a Twitch stream with the Curses! overlay visible
- **Headline direction**: "Your Stream, Upgraded" or "Every Roll, Every Hit Point — Live on Stream"
- **Subheadline**: One sentence — what this page covers and why it matters
- **CTA**: "Start Streaming Free" → registration
- **Detail level**: Minimal — this is the hook

#### Section 2: The Problem Statement
- **Content**: 2-3 sentences framing the pain point — most TTRPG tools weren't built for cameras. Streamers currently juggle OBS scenes, manual overlays, Google Sheets on second monitors, and hope viewers can follow along. This section names the problem without being preachy.
- **Detail level**: Light — emotional framing, not technical

#### Section 3: Twitch Overlay Deep-Dive
- **Content**: Full walkthrough of the live character card overlay
  - What it shows: name, class, domains, HP, Stress, Hope — updating in real time
  - Technical specs: 380×220px, transparent background, 90-second refresh cycle
  - Setup process: copy URL → paste as OBS browser source → done
  - Customization: themeable, high-contrast design readable at 720p
- **Visual**: Annotated screenshot or animated GIF of the overlay in action, ideally showing a stat change happening live
- **Detail level**: High — this is the money feature. Go specific.

#### Section 4: OBS Dice Log Overlay Deep-Dive
- **Content**: Full walkthrough of the dice overlay
  - What it shows: 3D dice animations synced via WebSocket, roll results, critical-hit goldenrod glow
  - Behavior: auto-fade after display, persistent dice log option, campaign-synced (all players' rolls appear)
  - Setup: same OBS browser source workflow
- **Visual**: Animated preview or screenshot of a dice roll appearing on-stream
- **Detail level**: High

#### Section 5: Public Share URLs & Stream-Ready Sheets
- **Content**: Explain public character sheet links with expiring security tokens. Viewers can browse the full sheet — build, loadout, backstory — without an account. High-contrast character sheet design is readable at streaming resolution. GMs can share party links for audience engagement.
- **Visual**: Side-by-side — what the streamer sees vs. what the viewer sees
- **Detail level**: Medium

#### Section 6: The Command HUD for Streamers
- **Content**: Bridge to campaign tools — the GM Command HUD is designed to live on a second monitor during stream. Party vitals dashboard (HP%, stress, armor, Hope, conditions), color-coded by danger state, sorted by urgency. One screen to monitor the entire party while narrating.
- **Visual**: Screenshot or mockup of the Command HUD with annotations
- **Detail level**: Medium — enough to intrigue, with a cross-link to the full campaign tools page
- **Cross-link**: "See the full GM toolkit →" linking to `/features/campaigns`

#### Section 7: Social Proof Block
- **Content**: 1-2 testimonials from streamers (placeholder). A stat or proof point: "Built alongside a weekly Daggerheart actual play — every feature tested live, on stream, in front of an audience."
- **Detail level**: Light

#### Section 8: Bottom CTA
- **Content**: Strong closing line + primary CTA (registration) + secondary CTA (back to home or pricing)
- **Headline direction**: "Your Audience Deserves a Front-Row Seat"

---

### 3b. `/features/campaigns` — Section Blueprint

**Target word count**: 1000-1200 words  
**Target reading time**: 4-5 minutes  
**Visual density**: High (this page has the most features to showcase — needs visual anchoring to prevent wall-of-text fatigue)

#### Section 1: Hero Banner
- **Content**: Headline + subheadline + hero visual (Command HUD mockup or encounter designer screenshot)
- **Headline direction**: "Everything Between Session Zero and the Final Boss"
- **Subheadline**: One sentence framing — the unified GM toolkit for campaign creation, encounter design, session management, and live play
- **CTA**: "Start Your Campaign" → registration
- **Detail level**: Minimal

#### Section 2: The Problem Statement
- **Content**: 2-3 sentences — GMs currently scatter their campaign across five tools: a spreadsheet for encounters, a Discord bot for scheduling, a shared doc for session notes, a separate VTT for maps, and a PDF for adversary stats. Every tool solves one problem and creates two more. Frame this as the "duct-tape stack" problem.
- **Detail level**: Light — naming the pain

#### Section 3: Campaign Creation & Party Management
- **Content**: How campaigns work — create a campaign, get an invite link, share it, players join and their characters link automatically. Member roster, party overview, character sheet access for GMs. Real-time WebSocket connections between GM and players.
- **Visual**: Mockup of campaign dashboard with party roster
- **Detail level**: Medium

#### Section 4: Encounter Designer Console Deep-Dive
- **Content**: The flagship campaign feature. Full walkthrough:
  - Adversary catalog: filterable by type, tier, difficulty. Full stat blocks rendered inline.
  - Drag-and-drop encounter building: pull adversaries into the encounter, set quantities
  - Environment systems: activatable features that affect the battlefield, cost Fear, or require player rolls
  - Live tracking: HP per adversary, condition management, threshold tracking
  - Run mode: use the same encounter you designed as your live combat tracker
- **Visual**: Annotated screenshot of the encounter designer with adversaries staged and an environment loaded
- **Detail level**: High — this is the deepest individual feature and the strongest argument for the GM tier

#### Section 5: Session Logging & Scheduling
- **Content**: Session notes — structured logging for lore reveals, NPC introductions, player decisions, unresolved threads. Searchable history. Session scheduling with availability coordination, reminders, and calendar integration.
- **Visual**: Screenshot of session log interface
- **Detail level**: Medium

#### Section 6: GM Command HUD Deep-Dive
- **Content**: The live-session dashboard:
  - Party vitals: HP%, stress level, armor slots, Hope count, active conditions for every player
  - Color-coded by danger state: healthy → wounded → critical → down
  - Sorted by who needs attention most
  - Ping system: tap any element on a player's sheet → player's screen scrolls to it with gold highlight animation
  - Roll requests: pre-populate a player's dice roller with the correct dice pool
  - Forced critical rolls for dramatic moments
  - Dice broadcasts: see every roll from every player in real time
- **Visual**: Annotated Command HUD mockup showing danger-state color coding and the ping interaction
- **Detail level**: High

#### Section 7: Homebrew Workshop
- **Content**: Create custom classes, domains, weapons, armor, loot tables, ancestries, and communities. Live markdown preview. SRD source badges so players always know what's official vs. custom. Validated against SRD structure.
- **Visual**: Screenshot of the homebrew creation form with markdown preview
- **Detail level**: Medium
- **Cross-link**: This is a natural bridge — "Your homebrew creations appear alongside SRD content in the character builder, tagged with source badges so players always know what's official."

#### Section 8: Social Proof Block
- **Content**: 1-2 testimonials from GMs (placeholder). Proof point: "Designed by a GM who runs a weekly campaign. Every feature exists because it was needed at the table."
- **Detail level**: Light

#### Section 9: Bottom CTA
- **Content**: Closing line + dual CTA — "Start Your Campaign" (GM tier) + "Create Your Character" (free tier)
- **Headline direction**: "Run Your Table Like a Pro"

---

### 3c. `/features/new-players` — Section Blueprint

**Target word count**: 800-1000 words  
**Target reading time**: 3-4 minutes  
**Visual density**: Medium-high (this page should feel warm and approachable — fewer dense feature blocks, more visual storytelling)

#### Section 1: Hero Banner
- **Content**: Headline + subheadline + visual (character builder first step, showing class selection with SRD descriptions visible)
- **Headline direction**: "Your First Character, Built in Minutes" or "No Rulebook Required"
- **Subheadline**: One sentence — Curses! walks you through every step, explains everything along the way, and gets you ready to play
- **CTA**: "Build Your First Character" → registration
- **Detail level**: Minimal — reassuring, not overwhelming

#### Section 2: The Emotional Hook
- **Content**: 2-3 sentences acknowledging the intimidation factor. TTRPGs look complicated from the outside — thick rulebooks, unfamiliar terminology, fear of "doing it wrong." Daggerheart was designed to be approachable, and Curses! was designed to make that approach effortless. Tone: warm, zero judgment, encouraging.
- **Detail level**: Light — emotional, not technical

#### Section 3: The Guided Builder Walkthrough
- **Content**: Step-by-step visual walkthrough of the character creation flow:
  1. Choose your class (with collapsible SRD descriptions explaining what each class does)
  2. Choose your subclass
  3. Choose your ancestry (including mixed ancestry support — explained simply)
  4. Choose your community
  5. Assign traits
  6. Select weapons and armor
  7. Choose starting equipment
  8. Pick your domain cards (with inline descriptions)
  9. Review your complete character
- **Format**: This section should be visually presented as a numbered flow — not a wall of text. Each step gets a card or row with a title, one sentence, and optionally a small screenshot/illustration.
- **Key message**: "Curses! handles the math, validates your choices, and explains what everything means. You just pick what sounds cool."
- **Detail level**: Medium — show the flow, don't explain the rules

#### Section 4: Rules at Your Fingertips
- **Content**: During play, everything is explained in context:
  - Domain card descriptions appear inline on your character sheet
  - Class feature effects are described when you expand them
  - Condition definitions appear when a condition is applied
  - The full SRD reference is searchable and browsable without leaving the app
  - Source badges distinguish SRD content from homebrew — you never accidentally pick something your GM hasn't approved
- **Visual**: Screenshot of a character sheet with an expanded domain card description and a source badge visible
- **Detail level**: Medium

#### Section 5: GM Teaching Tools
- **Content**: For the GMs reading this page (and they will — GMs are the ones who share this link with new players):
  - Ping system: tap any element on a player's sheet to scroll + highlight it for them
  - Roll requests: send a roll request that pre-populates the player's dice roller — they just hit "Roll"
  - The combined effect: a GM can guide a new player through an entire session without that player ever opening a PDF
- **Key message**: "GMs can send this page to a new player, help them build a character in ten minutes, and then teach the entire game during play — from inside the app."
- **Visual**: Split-screen mockup — GM's view sending a ping / player's view receiving it
- **Detail level**: Medium

#### Section 6: The Shareable Pitch
- **Content**: A small, self-contained block designed to be screenshotted or linked:
  - "Trying Daggerheart for the first time? Here's what you need:"
  - Step 1: Click the link your GM sent you
  - Step 2: Create a free account
  - Step 3: Build your character (the app walks you through it)
  - Step 4: Show up to the session — the app has everything else
  - "That's it. No books, no PDFs, no homework."
- **Detail level**: Minimal — this is a shareable conversion block

#### Section 7: Social Proof Block
- **Content**: 1-2 testimonials from new players (placeholder). Proof point: "First character built in under 10 minutes, zero rulebook required."
- **Detail level**: Light

#### Section 8: Bottom CTA
- **Content**: Closing line + CTA
- **Headline direction**: "Your Adventure Starts Now"
- **CTA**: "Build Your First Character" → registration (free)
- **Secondary**: "Send This to a Friend" (native share or copy-link)

---

### 3d. `/pricing` — Section Blueprint

**Target word count**: 600-800 words of body copy + structured comparison content  
**Target reading time**: 2-3 minutes  
**Visual density**: Medium (structured, scannable — tables and cards over paragraphs)

#### Section 1: Hero Banner
- **Content**: Headline + subheadline. No background image — clean, focused.
- **Headline direction**: "Simple, Honest Pricing"
- **Subheadline**: "Players never pay. GMs get everything for less than a cup of coffee."
- **Detail level**: Minimal

#### Section 2: Pricing Cards (Enhanced)
- **Content**: Two-column pricing cards, identical structure to landing page but with **expanded feature lists**. The landing page cards show 7 (Player) and 9 (GM) features. These cards should show the complete feature inventory.
- **Player Card — Full Feature List**:
  - Full character creation and editing
  - Guided step-by-step builder with SRD descriptions
  - All SRD classes, subclasses, domains, ancestries, and communities
  - Mixed ancestry support
  - Domain card loadout management with inline descriptions
  - Weapon, armor, and equipment management
  - Dice roller with custom colors and 3D animations
  - Companion management
  - Downtime project tracking
  - Leveling and advancement
  - Complete SRD rules reference with full-text search
  - Join unlimited campaigns
  - Public share URL for your character sheet
  - Receive GM pings and roll requests during play
- **GM Card — Full Feature List**:
  - Everything in the Player tier, plus:
  - Create and manage unlimited campaigns with invite links
  - Party overview dashboard with player sheet access
  - Encounter designer with full adversary catalog (filterable by type, tier, difficulty)
  - Environment systems with activatable features
  - HP, condition, and threshold tracking per adversary
  - Session logging with structured notes
  - Session scheduling with availability coordination
  - GM Command HUD with real-time party vitals
  - Ping system — highlight any element on player sheets remotely
  - Roll request system — pre-populate player dice rollers
  - Forced critical rolls for dramatic moments
  - Real-time WebSocket dice broadcasts
  - Twitch character card overlay (380×220px, transparent bg, live-updating)
  - OBS dice log overlay with 3D animations
  - OBS browser source URLs for character sheets
  - Homebrew workshop (custom classes, domains, weapons, armor, loot, ancestries, communities)
  - Live markdown preview for homebrew content
  - Source badge system (SRD vs. homebrew)
  - Priority access to new features
- **Tooltip microcopy**: Preserve the landing page tooltips: "No credit card. No trial. Free means free." / "Cancel anytime. No contracts."
- **Detail level**: High — this is the full inventory

#### Section 3: Feature Comparison Table
- **Content**: A structured comparison table with three columns: Feature | Player (Free) | Game Master ($5/month)
- **Purpose**: Visual scanners skip prose and look for tables. This gives them what they need.
- **Format**: Checkmarks (included) / dashes (not included) / labels where nuance is needed
- **Categories**: Character Building, Campaign Management, Streaming & Overlays, Session Tools, Homebrew, Real-Time Features
- **Detail level**: Medium — structured data, not prose

#### Section 4: "What $5 Replaces" Block
- **Content**: A provocative value-framing section:
  - Encounter builder subscription → included
  - Session tracker tool → included
  - Streaming overlay service → included
  - Homebrew hosting platform → included
  - Campaign management app → included
  - "Five dollars. One platform. Everything you need."
- **Detail level**: Light — punchy, scannable

#### Section 5: Competitor Comparison Table
- **Content**: A fair, factual comparison table: Curses! vs. Demiplane vs. Alchemy VTT vs. DIY (Spreadsheets + Discord)
- **Columns**: Feature category | Curses! Free | Curses! GM ($5/mo) | Demiplane | Alchemy VTT | DIY
- **Rows**: Character builder, Campaign management, Encounter designer, Streaming overlays, Real-time sync, Homebrew tools, Session management, Full SRD reference, Price
- **Tone**: Factual, not snarky. Let the checkmarks speak.
- **Detail level**: Medium — structured comparison, not editorial

#### Section 6: FAQ
- **Content**: Anticipate and answer the top objections:
  - "Is the free tier actually free, or is it a trial?" → Free forever. No credit card. No time limit. No feature gates on the character builder.
  - "What payment methods do you accept?" → [Stripe/whatever is implemented]
  - "Can I cancel anytime?" → Yes. No contracts, no cancellation fees. Your characters and campaign data remain accessible.
  - "What happens to my campaigns if I downgrade?" → Your campaigns remain viewable. You can re-subscribe to resume GM features at any time.
  - "Do my players need to pay?" → No. Players are always free. Only the GM needs a subscription to create and manage campaigns.
  - "Is there a group/team discount?" → Not currently. At $5/month, only one person per group (the GM) pays. The effective cost per player is $0.
  - "Will there be an annual plan?" → [TBD — include if planned, omit if not]
- **Detail level**: Concise — question + 1-2 sentence answer

#### Section 7: Bottom CTA
- **Content**: Dual CTA — "Get Started Free" (player) + "Claim Your Seat" (GM)
- **Headline direction**: "Ready to Play?"

---

## 4. Competitive Positioning per Page

### 4a. Streaming Page — No Direct Competition

**Positioning strategy**: Category creation.

No other Daggerheart tool offers native streaming integration. Demiplane has no Twitch overlay. Alchemy VTT has no OBS dice log. D&D Beyond has limited streaming features, and nothing Daggerheart-specific. The streaming page doesn't need to position *against* competitors — it needs to position the *category* as essential.

**Key framing**:
- "The first Daggerheart platform built for the camera."
- "Streaming tools aren't a plugin or an add-on. They're foundational."
- "Built alongside a weekly live-streaming show. Every feature tested live, in front of an audience."

**Implied comparison**: Before Curses!, Daggerheart streamers used manual overlays, static images, or nothing. After Curses!, the overlay updates itself and the audience sees every roll. Don't compare to competitors — compare to the *before state*.

**Messaging tone**: Confident, pioneering. This is our moat. Lean into it.

---

### 4b. Campaign Page — Competing with Fragmentation

**Positioning strategy**: Consolidation narrative.

The campaign page competes against three categories:

1. **Demiplane**: Has a Daggerheart character builder and a rules reference, but limited campaign management tools. No encounter designer console, no real-time Command HUD, no WebSocket dice broadcasts, no ping system.

2. **Alchemy VTT**: A virtual tabletop focused on maps, tokens, and tactical movement. Daggerheart is theater-of-the-mind by default — Alchemy solves a problem most Daggerheart tables don't have. Complementary, not competitive, but if a GM is choosing where to invest, the framing matters.

3. **DIY tools (spreadsheets, Discord bots, Notion, Google Docs)**: The most common "competitor." GMs cobbling together a stack of free tools. Works, but fragile, unintegrated, and unprofessional for streaming.

**Key framing**:
- "Most Daggerheart tools stop at the character sheet. Curses! keeps going."
- "You've been building your GM toolkit from spare parts. Here's the real thing."
- "Daggerheart is theater-of-the-mind. Your toolkit should be too." (vs. VTT positioning)
- "Five dollars replaces five subscriptions."

**What NOT to do**: Don't name competitors directly on the page. The comparison table on the pricing page handles that. The campaign page should focus on what Curses! does, not what others don't. Let the feature density speak for itself.

**Messaging tone**: Authoritative, comprehensive. "This is what a complete GM toolkit looks like."

---

### 4c. New Player Page — Competing with Intimidation

**Positioning strategy**: Barrier destruction.

This page doesn't compete with other tools — it competes with the *perception* that TTRPGs are hard, that you need to read a rulebook before you can play, that you'll embarrass yourself at the table. The "competitor" is inertia and intimidation.

**Key framing**:
- "No rulebook required. Seriously."
- "Your first character is ready in minutes. The app explains everything along the way."
- "The barrier to entry for Daggerheart is now zero."

**Secondary positioning** (for GMs reading this page):
- "Send this link to your friend who's never played a TTRPG. They'll be ready in ten minutes."
- The page itself becomes a tool — a GM can share it as a recruitment asset.

**What NOT to do**: Don't use TTRPG jargon without explanation. Don't assume familiarity with Daggerheart terminology. This is the one page where we explain what "domains" and "ancestry" mean in plain language. Every other page can assume TTRPG literacy; this one cannot.

**Messaging tone**: Warm, encouraging, judgment-free. "You belong here."

---

### 4d. Pricing Page — Competing on Value

**Positioning strategy**: Radical generosity + transparent comparison.

The pricing page competes against:

1. **D&D Beyond ($5.99/month for the GM tier)**: Not Daggerheart, but it sets the *expectation* for what a TTRPG digital toolkit costs. Curses! is cheaper and more complete for its system.

2. **Demiplane (freemium model)**: Free character builder with paywalled rulebook content. Curses! includes the full SRD reference for free — no paywalled rules.

3. **"Free is fine" inertia**: Players who don't see the value of upgrading from free tools. The pricing page must make the free tier feel genuinely generous (because it is) and the GM tier feel like an absurd bargain (because it is).

**Key framing**:
- "Players are free. Not free-trial free. Not freemium free. Free."
- "The GM tier costs less than a single coffee and replaces five separate tools."
- "Only one person per table needs to subscribe. Everyone else plays free."
- No annual upsell, no hidden costs, no feature-gating on the character builder.

**Competitive comparison table approach**: Factual, not editorial. Show feature checkmarks. Let the reader draw their own conclusions. Include a "DIY" column (spreadsheets + Discord) to reframe the free-tools alternative as the compromise it is.

**Messaging tone**: Transparent, generous, no-nonsense.

---

## 5. Cross-linking & Funnel Strategy

### 5a. Page-to-Page Link Map

```
/features/streaming
  → /features/campaigns     (Command HUD bridge — "See the full GM toolkit")
  → /pricing                 (From bottom CTA — "See pricing details")
  → /auth/register           (Primary CTA — "Start Streaming Free")

/features/campaigns
  → /features/streaming      (Streaming overlay mention — "Stream your sessions")
  → /features/new-players    (Onboarding mention — "Bring new players to your table")
  → /pricing                 (From bottom CTA — "See pricing details")
  → /auth/register           (Primary CTA — "Start Your Campaign")

/features/new-players
  → /features/campaigns      (GM tools mention — "Your GM has tools to help")
  → /pricing                 (Optional, light — "Free for all players")
  → /auth/register           (Primary CTA — "Build Your First Character")

/pricing
  → /features/streaming      (Feature deep-link from GM tier card)
  → /features/campaigns      (Feature deep-link from GM tier card)
  → /features/new-players    (Feature deep-link from Player tier card)
  → /auth/register           (Dual CTA — Player and GM)
  → /                        (Breadcrumb / logo)
```

### 5b. CTA Strategy per Page

| Page | Primary CTA | Secondary CTA | Tertiary |
|---|---|---|---|
| `/features/streaming` | "Start Streaming Free" → register | "See the Full GM Toolkit" → `/features/campaigns` | "View Pricing" → `/pricing` |
| `/features/campaigns` | "Start Your Campaign" → register | "See Pricing Details" → `/pricing` | "Explore Streaming Tools" → `/features/streaming` |
| `/features/new-players` | "Build Your First Character" → register | "Send This to a Friend" → share/copy link | Back to home |
| `/pricing` | "Get Started Free" → register | "Claim Your Seat" → register (GM) | Feature page deep-links from tier cards |

### 5c. Navigation Strategy

All four sub-pages should share a consistent **sub-navigation bar** below the main header:

```
[Curses! Logo]  Streaming | Campaigns | New Players | Pricing  [Log In] [Start Free]
```

This allows visitors to move between sub-pages without returning to the landing page. The landing page's main nav (Features / Pricing / Community) scrolls to anchor sections. The sub-page nav links to the actual pages. The sub-nav should also include a "← Back to Home" breadcrumb or the logo should link home (already the case in stubs).

### 5d. Pricing Page Comparison Table: Yes

The pricing page should absolutely include a competitor comparison table. Rationale:

1. Visitors at the pricing page are in decision mode. They're comparing options.
2. A comparison table preempts the "let me check Demiplane first" tab-switch by giving them the comparison in-house.
3. It's honest — we're not hiding from comparison, we're inviting it.
4. It reinforces the streaming tools as a unique differentiator (every competitor cell in that row is empty).

---

## 6. Social Proof Strategy per Page

### 6a. General Approach

All testimonials are placeholders until real user feedback is collected. Structure them correctly now so they can be swapped in without layout changes. Each testimonial should include:

- Quote (1-2 sentences)
- Name (first name + last initial)
- Role descriptor (GM, Player, Streamer, New Player, Forever GM, etc.)
- Optional: avatar placeholder (initial-based, matching landing page pattern)

### 6b. Per-Page Proof Points

#### Streaming Page
- **Testimonial focus**: Streamers and content creators
- **Placeholder testimonial 1**: A streamer describing how the overlay changed their production quality
- **Placeholder testimonial 2**: A viewer who found the stream more engaging with live character cards
- **Stat proof point**: "Built alongside a weekly Daggerheart actual play on Twitch — battle-tested live, every Wednesday"
- **Credibility signal**: "Used by the Curses! cast — [cast show credits]"

#### Campaigns Page
- **Testimonial focus**: GMs
- **Placeholder testimonial 1**: A GM describing encounter designer time savings (before: 1 hour in spreadsheets → after: 5 minutes)
- **Placeholder testimonial 2**: A GM describing the Command HUD's impact on session flow
- **Stat proof point**: "Full adversary catalog with every SRD adversary, filterable by type, tier, and difficulty"
- **Credibility signal**: "Designed by a forever GM who uses these tools at their own table every week"

#### New Player Page
- **Testimonial focus**: First-time players
- **Placeholder testimonial 1**: A new player describing the ease of character creation
- **Placeholder testimonial 2**: A GM describing how they onboarded a complete beginner using Curses!
- **Stat proof point**: "First character built in under 10 minutes" / "Zero rulebooks required"
- **Credibility signal**: "SRD descriptions built into every step — official rules, always accessible, never mandatory"

#### Pricing Page
- **Testimonial focus**: Mixed — value-oriented quotes
- **Placeholder testimonial 1**: A GM describing the consolidation value ("replaced three subscriptions")
- **Placeholder testimonial 2**: A player confirming the free tier is genuinely complete
- **Stat proof point**: "Players: Free forever. GMs: $5/month. That's it."
- **Credibility signal**: "No credit card required. No trial period. No hidden fees."

---

## 7. SEO & Discoverability

### 7a. `/features/streaming`

| Element | Value |
|---|---|
| **Page title** | `Streaming & OBS Tools for Daggerheart — Curses!` |
| **Meta description** | `Twitch overlays, OBS dice animations, and live character cards for your Daggerheart stream. The first TTRPG character platform with native streaming tools. Free to start.` |
| **H1** | `Stream Your Daggerheart Campaign` (or variant) |
| **Target keywords** | `daggerheart streaming tools`, `daggerheart twitch overlay`, `daggerheart obs overlay`, `ttrpg streaming tools`, `daggerheart actual play tools`, `daggerheart obs browser source` |
| **URL slug** | `/features/streaming` (already correct) |
| **Schema markup** | SoftwareApplication (streaming tool), BreadcrumbList |

### 7b. `/features/campaigns`

| Element | Value |
|---|---|
| **Page title** | `Campaign Management & Encounter Designer for Daggerheart — Curses!` |
| **Meta description** | `Design encounters, manage sessions, track party vitals, and run your Daggerheart campaign from a single dashboard. The complete GM toolkit for $5/month.` |
| **H1** | `The Complete Daggerheart GM Toolkit` (or variant) |
| **Target keywords** | `daggerheart campaign manager`, `daggerheart encounter designer`, `daggerheart gm tools`, `daggerheart session tracker`, `daggerheart adversary catalog`, `daggerheart campaign tools` |
| **URL slug** | `/features/campaigns` (already correct) |
| **Schema markup** | SoftwareApplication (campaign management), BreadcrumbList |

### 7c. `/features/new-players`

| Element | Value |
|---|---|
| **Page title** | `New to Daggerheart? Start Here — Curses!` |
| **Meta description** | `Build your first Daggerheart character in minutes with guided creation, built-in SRD rules, and GM teaching tools. No rulebook required. Free forever.` |
| **H1** | `Your First Daggerheart Character, Built in Minutes` (or variant) |
| **Target keywords** | `daggerheart character creator`, `how to play daggerheart`, `daggerheart character builder free`, `daggerheart new player`, `daggerheart beginner guide`, `daggerheart character creation` |
| **URL slug** | `/features/new-players` (already correct) |
| **Schema markup** | SoftwareApplication (character builder), HowTo (character creation steps), BreadcrumbList |

### 7d. `/pricing`

| Element | Value |
|---|---|
| **Page title** | `Pricing — Free for Players, $5/month for GMs — Curses!` |
| **Meta description** | `Curses! is free for all Daggerheart players. GMs get campaigns, encounters, streaming overlays, and homebrew tools for $5/month. No trials, no hidden fees.` |
| **H1** | `Simple, Honest Pricing` |
| **Target keywords** | `curses pricing`, `daggerheart character builder free`, `daggerheart tools pricing`, `daggerheart gm subscription`, `daggerheart platform cost` |
| **URL slug** | `/pricing` (already correct) |
| **Schema markup** | Product (with Offer — free tier and paid tier), FAQPage, BreadcrumbList |

### 7e. Cross-Page SEO Notes

- Each sub-page should include `<link rel="canonical">` pointing to its own URL.
- The landing page sections that link to sub-pages create natural internal link equity.
- Consider adding `structured data` (JSON-LD) for FAQPage on the pricing page — this can generate rich snippets in Google search results.
- Open Graph and Twitter Card meta tags should be set per page with unique images (screenshot of the relevant feature area).
- Avoid duplicating the landing page's meta description on any sub-page.

---

## 8. Implementation Priority

### Build Order Recommendation

| Priority | Page | Rationale |
|---|---|---|
| **1** | `/pricing` | Bottom-of-funnel. Highest conversion impact. Visitors actively comparing options land here. Current stub is losing potential registrations. |
| **2** | `/features/streaming` | Strongest differentiator. No competition. Most shareable. Streamers are force-multipliers (they bring audiences). |
| **3** | `/features/campaigns` | Deepest feature set. Validates the GM subscription value. Required for GM conversion confidence. |
| **4** | `/features/new-players` | Important for growth but serves an audience that's less likely to arrive via direct navigation. GMs share this link — it converts passively. |

### Shared Components to Build First

Before building individual pages, extract and build these shared components:

1. **Sub-page layout shell**: Header with sub-nav, footer, consistent container widths, shared RevealSection animations (reuse from landing page)
2. **Feature detail block**: Reusable component for icon + title + description + screenshot — alternating left/right layout
3. **Testimonial card**: Already exists on landing page — extract and parameterize
4. **Pricing card (enhanced)**: Extended version of the landing page card with full feature lists and tooltip microcopy
5. **Comparison table component**: Responsive table with checkmarks, dashes, and category headers
6. **FAQ accordion**: Accessible expand/collapse for the pricing FAQ
7. **CTA block**: Reusable bottom-of-page CTA section with headline + dual buttons

---

## Appendix: Key Strategic Decisions Summary

1. **Sub-pages are depth plays, not copies** — they assume the visitor has read the landing page and go one level deeper into how things actually work.
2. **Streaming page leads with category creation** — no competitors to compare against, so we define the category and own it.
3. **Campaign page uses the consolidation narrative** — "five tools in one" framing to justify the GM subscription.
4. **New player page is a shareable recruitment tool** — designed to be sent by GMs to friends as an onboarding link.
5. **Pricing page includes a competitor comparison table** — factual, not editorial, letting checkmarks do the persuading.
6. **All pages share a consistent sub-nav** — visitors can move between sub-pages without returning to the landing page.
7. **CTAs are role-aware** — streaming and campaign pages push toward GM registration; new player page pushes toward free registration; pricing page offers both.
8. **Build order prioritizes conversion impact** — pricing first (bottom of funnel), streaming second (strongest differentiator), campaigns third, new players fourth.
9. **Testimonials are structured now, populated later** — placeholder content with correct formatting so real quotes can be swapped in without layout changes.
10. **SEO targets Daggerheart-specific keywords** — the platform is purpose-built for one game, so keyword strategy focuses on Daggerheart search intent rather than generic TTRPG terms.
