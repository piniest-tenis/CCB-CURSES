# Curses! Sub-Pages — Information Architecture & User Flows

> **Status**: Active specification  
> **Version**: 1.0  
> **Date**: April 14, 2026  
> **Author**: UX Architect Agent  
> **Scope**: `/features/streaming`, `/features/campaigns`, `/features/new-players`, `/pricing`  
> **Depends on**: `SUB_PAGES_PRODUCT_STRATEGY.md`, `SUB_PAGES_NARRATIVE_FRAMEWORK.md`, `SUB_PAGES_VISUAL_DESIGN.md`, `LANDING_PAGE_NARRATIVE_FRAMEWORK.md`

---

## Table of Contents

1. [Page Structure per Sub-Page](#1-page-structure-per-sub-page)
2. [Navigation Architecture](#2-navigation-architecture)
3. [Progressive Disclosure Strategy](#3-progressive-disclosure-strategy)
4. [User Flow Mapping](#4-user-flow-mapping)
5. [Cognitive Load Analysis](#5-cognitive-load-analysis)
6. [Mobile-First Considerations](#6-mobile-first-considerations)
7. [Reusable IA Patterns](#7-reusable-ia-patterns)

---

## 1. Page Structure per Sub-Page

Each section definition includes its position in the scroll order, content type, information density, and the primary user question it answers. These hierarchies are definitive — they specify exactly what the visitor encounters top-to-bottom and why each section earns its position.

### Design Principle: The Inverted Pyramid per Section

Every sub-page follows the same macro-rhythm inherited from the landing page: **orient → intrigue → prove → convert**. Within that rhythm, each section follows an inverted pyramid — the most important information for that section's purpose appears first, with supporting detail following. This lets scanners get value from headings alone while giving deep-readers the specificity they crave.

---

### 1a. `/features/streaming` — Streaming & Content Creation

**Total sections: 8 · Target scroll depth: 5–6 viewports · Reading time: 3–4 minutes**

| # | Section Name | Content Type | Density | Primary User Question Answered |
|---|---|---|---|---|
| 1 | **Hero** | Headline + subheadline + CTA | Light | "Is this a real streaming toolkit, or just a character builder with a share link?" |
| 2 | **Origin Story / Credibility Block** | Narrative paragraph + stream credit | Light | "Who built this? Do they actually stream?" |
| 3 | **Deep-Dive: Live Character Cards (Twitch Overlay)** | Feature walkthrough + screenshot + tech specs | Dense | "What does my audience actually see? How do I set it up?" |
| 4 | **Deep-Dive: OBS Dice Log Overlay** | Feature walkthrough + screenshot + tech specs | Dense | "Can my stream show dice rolls live? What does it look like?" |
| 5 | **Deep-Dive: Public Character Sheets & Share URLs** | Feature explanation + screenshot | Medium | "Can my viewers browse my character sheet on their own?" |
| 6 | **Deep-Dive: Command HUD for Streamers** | Feature bridge + screenshot + cross-link | Medium | "What does the GM see on their second monitor during a live stream?" |
| 7 | **Social Proof Block** | 1–2 testimonials + credibility stat | Light | "Do real streamers use this? Does it work under pressure?" |
| 8 | **Bottom CTA** | Headline + dual CTA buttons | Light | "How do I start? What does it cost?" |

**IA rationale:**

- **Sections 3–4 are the densest and highest-value.** They're positioned early-middle because the streamer audience arrives with a specific technical question ("Does this actually integrate with OBS?") and needs it answered before they'll invest in reading the rest. The product strategy doc identifies this as the page's core objection to clear.
- **Section 2 (Origin Story) before deep-dives** because the narrative framework establishes that credibility ("built alongside a real stream") is this page's strongest emotional hook. It transforms the deep-dives from feature marketing into testimony.
- **Section 6 (Command HUD) is a bridge section.** It's positioned last among the deep-dives because it's shared with the campaigns page. It introduces enough to intrigue, then cross-links to `/features/campaigns` for the full breakdown. This prevents content duplication and creates a natural page-to-page flow.
- **Section 5 (Public Sheets) is medium density** because it's a simpler feature that doesn't require the technical spec treatment. It answers a viewer-engagement question, not a production question.

---

### 1b. `/features/campaigns` — Campaign Command Center

**Total sections: 9 · Target scroll depth: 7–8 viewports · Reading time: 4–5 minutes**

| # | Section Name | Content Type | Density | Primary User Question Answered |
|---|---|---|---|---|
| 1 | **Hero** | Headline + subheadline + CTA | Light | "Is this a real campaign manager, or just a character builder with invite links?" |
| 2 | **Problem Statement / Pain Framing** | Short narrative paragraph (2–3 sentences) | Light | "Does this team understand the multi-tool pain I deal with every week?" |
| 3 | **Deep-Dive: Campaign Creation & Party Management** | Feature walkthrough + screenshot | Medium | "How do I set up a campaign and get my players in?" |
| 4 | **Deep-Dive: Encounter Designer Console** | Feature walkthrough + screenshot + tech specs | Dense | "Can I actually build and run encounters from one screen? What does the adversary catalog look like?" |
| 5 | **Deep-Dive: Session Logging & Scheduling** | Feature walkthrough + screenshot | Medium | "Can I keep session notes organized and schedule sessions without leaving the app?" |
| 6 | **Deep-Dive: GM Command HUD** | Feature walkthrough + screenshot + tech specs | Dense | "What do I see during a live session? How do I monitor my players in real time?" |
| 7 | **Deep-Dive: Real-Time WebSocket Features** | Feature explanation + interaction examples | Medium | "How does everything stay synced? What can I send to my players live?" |
| 8 | **Deep-Dive: Homebrew Workshop** | Feature walkthrough + screenshot | Medium | "Can I create custom content? Will it integrate with the character builder?" |
| 9 | **Bottom CTA** | Headline + dual CTA buttons | Light | "How do I start? What does it cost?" |

**IA rationale:**

- **This is the longest sub-page by design.** The product strategy doc notes this is the deepest feature set and the core justification for the $5/month GM tier. The information density must match the value density. Cutting sections here would undermine the "five tools in one" consolidation narrative.
- **Section 4 (Encounter Designer) is the centerpiece.** It's the most complex feature and the strongest argument for the GM subscription. It gets the deepest treatment — stat blocks, drag-and-drop, environment system, live tracking. Positioned third among deep-dives (after the simpler Campaign Creation) because the visitor needs context about how campaigns work before the encounter designer makes sense.
- **Section 6 (Command HUD) is the second anchor.** It's the live-session counterpart to the encounter designer's prep focus. Together, sections 4 and 6 tell the story: "Build it here, run it here."
- **Section 7 (Real-Time Features) is deliberately separated from the HUD.** WebSocket connectivity is an infrastructure story that underpins everything — dice broadcasts, pings, roll requests, forced crits. Folding it into the HUD section would overload that section. As a standalone section, it creates an "everything is connected" crescendo moment.
- **Section 8 (Homebrew) is last among deep-dives** because it's a creation tool, not a session tool. It's important for power users but not the first thing a GM evaluates. The coral accent treatment (per visual design spec) also provides a visual palette shift that refreshes attention before the final CTA.
- **No social proof section on this page** (unlike streaming and new players). The product strategy doc indicates the campaigns page converts through feature density, not testimonials. The depth of the feature set IS the proof. If testimonials are added later, they slot between Section 8 and the CTA.

---

### 1c. `/features/new-players` — New Player Experience

**Total sections: 8 · Target scroll depth: 4–5 viewports · Reading time: 3–4 minutes**

| # | Section Name | Content Type | Density | Primary User Question Answered |
|---|---|---|---|---|
| 1 | **Hero** | Headline + subheadline + CTA | Light | "I'm new to Daggerheart. Is this the right place to start?" |
| 2 | **Emotional Hook / Reassurance** | Short narrative paragraph (2–3 sentences) | Light | "Is this going to make me feel stupid for not knowing the rules?" |
| 3 | **Step Visualization: Guided Character Creation** | Numbered step cards (3–4 steps) with connectors | Medium | "What does the step-by-step process actually look like? How long will it take?" |
| 4 | **In-Context Learning / SRD Integration** | Feature explanation + screenshot | Medium | "Will I understand what I'm choosing? Where do I find the rules?" |
| 5 | **GM Teaching Tools** | Feature explanation + split-screen screenshot | Medium | "What if I get lost during the session? Can my GM help me in real time?" |
| 6 | **Shareable Pitch Block** | Self-contained 4-step instruction card | Light | "What's the shortest version I can send to my friend who wants to try?" |
| 7 | **Social Proof Block** | 1–2 testimonials + credibility stat | Light | "Have other beginners actually done this successfully?" |
| 8 | **Bottom CTA** | Headline + dual CTA (build + share) | Light | "I'm ready. How do I start?" |

**IA rationale:**

- **This page has the lightest information density of all four.** The audience is the least experienced and most likely to feel overwhelmed. The narrative framework specifies "shorter paragraphs, more whitespace" — the IA reflects this by using fewer dense sections and more light/medium ones.
- **Section 2 (Emotional Hook) appears before any feature content.** This is a deliberate cognitive load decision. The new player's primary barrier isn't lack of information — it's intimidation. Naming and dissolving the fear ("you don't need a rulebook") creates psychological safety that makes all subsequent sections feel approachable.
- **Section 3 (Step Visualization) is the visual centerpiece.** Numbered steps with connecting lines create a clear mental model of the journey. The product strategy doc specifies this should NOT be a wall of text — it's a flow diagram rendered as cards. 3–4 steps, not the full 9-step builder flow (that level of detail would overwhelm). The steps shown should be the macro decisions: Choose your class → Build your character → Learn as you play.
- **Section 6 (Shareable Pitch Block) is unique to this page.** It exists because this page has a dual audience: the new player themselves AND the GM who will share this link. The shareable block is designed to be screenshotted or copy-linked. It's the "TL;DR" version of the entire page in a self-contained card. The product strategy doc explicitly calls this page "a recruitment asset."
- **Section 5 (GM Teaching Tools) addresses the invisible reader.** GMs will read this page to decide whether to share it. The ping system and roll request system, described from the new player's perspective, reassure the GM that their new player won't be lost during play.

---

### 1d. `/pricing` — Pricing Details

**Total sections: 7 · Target scroll depth: 5–6 viewports · Reading time: 2–3 minutes**

| # | Section Name | Content Type | Density | Primary User Question Answered |
|---|---|---|---|---|
| 1 | **Hero** | Headline + subheadline (no CTA in hero) | Light | "Is this going to be complicated, or can I understand the pricing in 10 seconds?" |
| 2 | **Pricing Cards** | Two-column pricing cards with full feature lists | Dense | "What exactly do I get at each tier? What's the actual price?" |
| 3 | **"What $5 Replaces" Value Block** | Comparison list — tool categories replaced | Medium | "Is $5/month actually worth it compared to my current tools?" |
| 4 | **Feature Comparison Table** | Structured table with checkmarks (Player vs. GM) | Dense | "Let me see every feature side by side before I decide." |
| 5 | **FAQ Accordion** | Expandable Q&A pairs (6–8 questions) | Medium (expandable to dense) | "What's the catch? What if I cancel? Do my players need to pay?" |
| 6 | **Competitor Comparison Table** | Structured table (Curses! vs. Demiplane vs. Alchemy vs. DIY) | Dense | "How does this compare to other tools I'm considering?" |
| 7 | **Bottom CTA** | Headline + dual CTA (Player free + GM $5/month) | Light | "I've seen everything. How do I sign up?" |

**IA rationale:**

- **No CTA in the hero.** This is the only sub-page without a hero CTA. The pricing cards (Section 2) ARE the CTA — they contain the registration buttons. Adding a hero CTA would create a premature decision point before the visitor has seen the full breakdown. The visual design spec confirms this: "No CTA in hero. The pricing cards ARE the CTA."
- **Section 2 (Pricing Cards) appears immediately after the hero.** The visitor came to this page to see pricing. Don't make them scroll. The cards are enhanced versions of the landing page cards with expanded feature lists (14 Player features, 20+ GM features per product strategy spec).
- **Section 3 ("What $5 Replaces") before the comparison table** because value framing should precede detail scanning. The visitor should think "this replaces five subscriptions" before they see the feature-by-feature breakdown. This primes them to see the comparison table as confirmation rather than evaluation.
- **Section 4 (Feature Comparison) is for visual scanners** who skip prose and look for tables. The product strategy doc specifies this explicitly. It uses checkmarks and dashes — no editorial, just data.
- **Section 5 (FAQ) uses progressive disclosure.** Collapsed by default, each question expands to a 1–2 sentence answer. This keeps the page scannable while allowing deep-readers to find every objection addressed. The FAQ's position after the comparison table means it catches visitors who've seen the full breakdown and still have specific concerns.
- **Section 6 (Competitor Comparison) is positioned last before the CTA.** It's the most confrontational content on the page and should only be encountered by visitors who've already seen the value proposition. Placing it too early would shift the page's tone from generous to combative. At the bottom, it serves as the "final objection" for visitors who were about to leave to check Demiplane's pricing.

---

## 2. Navigation Architecture

### 2a. Shared Marketing Navigation Bar

All four sub-pages inherit the landing page's sticky header with one structural change: nav items become route links instead of scroll-anchor buttons.

#### Desktop Navigation Structure

```
┌─────────────────────────────────────────────────────────────────────────┐
│  [Curses! Logo → /]     Features  Pricing  Community     [Log In] [Start Free]  │
│                          ↓         ↓        ↓                                    │
│                     /#features   /pricing  /#community                            │
└─────────────────────────────────────────────────────────────────────────┘
```

**Key decisions:**

- **"Features" links to `/#features`** (landing page features anchor), NOT to a features index page. There is no `/features` index — the landing page serves this role. Clicking "Features" from a sub-page returns the visitor to the landing page's feature overview, which then links to each sub-page. This avoids creating a dead-end index page.
- **"Pricing" links to `/pricing`** (the dedicated pricing page), not the landing page pricing anchor. This is a direct route because the pricing page has significantly more content than the landing page's pricing section.
- **"Community" links to `/#community`** (landing page community anchor). Community features don't have their own sub-page.
- **Active state:** The current page's nav link gets `text-gold-400 border-b-2 border-gold-400 pb-1` treatment. On `/pricing`, the "Pricing" link is highlighted. On `/features/*` pages, the "Features" link is highlighted (even though it links to the landing page anchor — the visitor is still "in" features).

#### Mobile Navigation Structure

```
┌────────────────────────────────────────────┐
│  [Logo → /]                    [☰ Menu]    │
├────────────────────────────────────────────┤
│  (Expanded panel — identical items)        │
│  Features                                  │
│  Pricing                                   │
│  Community                                 │
│  ──────────                                │
│  [Log In]                                  │
│  [Start Free]                              │
└────────────────────────────────────────────┘
```

Same hamburger behavior as the landing page: `maxHeight` transition, outside-click close, Escape close, focus return to hamburger. Min touch target: 44px per item.

---

### 2b. Breadcrumb Navigation

Breadcrumbs provide wayfinding context for visitors who arrive via search, social media, or direct link (bypassing the landing page).

#### Feature Sub-Pages

```
Home  ›  Features  ›  Streaming
Home  ›  Features  ›  Campaigns
Home  ›  Features  ›  New Players
```

- "Home" links to `/`
- "Features" links to `/#features` (landing page anchor)
- Current page name is non-linked, displayed in `text-gold-400` with `aria-current="page"`

#### Pricing Page

**No breadcrumb.** `/pricing` is a top-level route, not nested under `/features`. The visual design spec confirms: "On `/pricing`: No breadcrumb needed. It's a top-level page, not nested under features."

#### Breadcrumb Placement

Rendered inside the hero section, above the kicker text. Positioned statically (not absolutely) so it participates in the content flow. Uses `pt-20 sm:pt-24` to clear the fixed nav. Typography: `text-xs font-sans uppercase tracking-[0.1em] text-parchment-600` with `hover:text-gold-400` on linked items.

---

### 2c. In-Page Anchor Navigation

None of the four sub-pages require in-page anchor navigation (e.g., a sticky table of contents or jump links).

**Rationale:**

- The streaming page (5–6 viewports) and new players page (4–5 viewports) are short enough that scrolling is trivially fast. Adding a TOC would increase cognitive load without reducing navigation friction.
- The campaigns page (7–8 viewports) is the longest but follows a predictable deep-dive rhythm. Each section's visual treatment (alternating image/text, background color shifts, ornamental dividers) provides sufficient wayfinding. A TOC would fragment the page's narrative flow — the product strategy doc specifies the page should read as a progressive discovery, not a reference manual.
- The pricing page has distinct visual sections (cards → table → FAQ → comparison) that are self-evident in structure.

**Exception:** If user testing reveals that visitors on the campaigns page struggle to find specific features (e.g., "I came for the homebrew workshop and couldn't find it"), revisit this decision with a lightweight sticky anchor bar.

---

### 2d. Cross-Page Links

Cross-page links create a navigation mesh that keeps visitors within the marketing funnel. Every cross-link is directional — it connects a related concept on the current page to a deeper treatment on another page.

#### Link Map

```
/features/streaming
  ├─→ /features/campaigns    (Section 6: "See the full GM toolkit →")
  ├─→ /pricing               (Bottom CTA: "View pricing")
  └─→ /auth/register         (Hero CTA + Bottom CTA)

/features/campaigns
  ├─→ /features/streaming    (Contextual: "Stream your sessions →")
  ├─→ /features/new-players  (Contextual: "Onboard new players →")
  ├─→ /pricing               (Bottom CTA: "See pricing")
  └─→ /auth/register         (Hero CTA + Bottom CTA)

/features/new-players
  ├─→ /features/campaigns    (Section 5: "Your GM has tools to guide you")
  ├─→ /pricing               (Contextual: "Free for all players")
  └─→ /auth/register         (Hero CTA + Bottom CTA)

/pricing
  ├─→ /features/streaming    (GM tier card: "Streaming tools" deep-link)
  ├─→ /features/campaigns    (GM tier card: "Campaign tools" deep-link)
  ├─→ /features/new-players  (Player tier card: "Guided builder" deep-link)
  └─→ /auth/register         (Both pricing card CTAs)
```

#### Cross-Link Pattern

All cross-page links use the same component pattern as the landing page: `inline-flex items-center gap-2 text-sm font-semibold text-gold-400 hover:text-gold-300 transition-colors group` with an animated right-arrow (`fa-arrow-right group-hover:translate-x-1`). This pattern is already established in the landing page's "Learn more about streaming features" and "Explore campaign tools" links.

---

### 2e. Back-to-Overview Affordance

- **Logo always links to `/`.** This is the primary back-to-home affordance and matches the landing page's behavior. No additional "← Back to Home" button is needed in the nav.
- **Breadcrumb "Home" link** provides a secondary text-based return path for visitors who don't think to click the logo.
- **The "← Back to Home" button in the current stubs should be removed** when the full pages are built. The stubs use it because they're dead-ends. The full pages have enough navigation (header nav, breadcrumbs, cross-links, footer) that a dedicated back button is redundant and visually clutters the CTA area.

---

### 2f. Footer Navigation

**Identical to the landing page footer.** Same 4-column layout (Brand, Product, Community, Legal), same links, same social icons. Reuse the exact same component.

The footer's "Product" column already includes links to `/features/streaming` and `/features/campaigns`. **Add:**

- `/features/new-players` → "New Players"
- `/pricing` → "Pricing"

This ensures all four sub-pages are discoverable from any page's footer.

---

## 3. Progressive Disclosure Strategy

Progressive disclosure is the single most important IA tool for these pages. Each sub-page serves two audiences simultaneously: **scanners** (who scroll fast, read headlines, and decide in 30 seconds) and **deep-readers** (who want every spec, every detail, every proof point). The disclosure strategy must satisfy both without penalizing either.

### 3a. Guiding Principle: Show the Promise, Reveal the Proof

Every section follows a two-layer structure:

- **Layer 1 (Always visible):** Headline, 1–2 sentence description, and primary screenshot/visual. This layer answers "What is this and why should I care?" in under 5 seconds. Scanners get full value from Layer 1 alone.
- **Layer 2 (Visible on scroll or interaction):** Technical specifications, detailed feature descriptions, interaction examples, edge cases. This layer answers "How does this actually work?" for deep-readers.

The distinction between layers is NOT implemented through show/hide toggles or accordions (except on the pricing FAQ). It's implemented through **information hierarchy** — Layer 1 is the heading, lede, and visual; Layer 2 is the body paragraphs and tech spec lists below them. Both are in the DOM, both are visible, but the visual hierarchy guides the eye to Layer 1 first.

### 3b. Page-by-Page Disclosure Decisions

#### `/features/streaming` — Show Everything, Specs Inline

**Disclosure mode: Fully open, technical detail inline.**

This audience (streamers) arrived with a specific technical question. They WANT the specs. Hiding overlay dimensions behind an accordion would feel hostile — it's the exact information they came for.

| Content Element | Visibility | Rationale |
|---|---|---|
| Overlay dimensions (380×220px) | Always visible in tech spec list | Core decision factor for streamers. Must be findable without clicking. |
| Refresh interval (90 seconds) | Always visible in tech spec list | Answers "how live is live?" immediately. |
| Setup steps (copy URL → paste in OBS) | Always visible as numbered mini-steps | Streamers evaluate setup friction before committing. If setup is hard, they bounce. |
| WebSocket sync details | Always visible in body text | Signals technical sophistication. Streamers respect this. |
| Browser compatibility notes | Always visible in requirements strip | Prevents "will this work with my setup?" abandonment. |

**No accordions on this page.** The streaming page's audience is the most technically literate of all four. They read fast and scan for specs. Hiding content behind toggles adds friction for the primary audience without helping the secondary audience (there is no "casual browser" for a streaming tools page — you either stream or you don't).

**SEO benefit:** Full content visibility means every technical term is crawlable. The target keyword set (`daggerheart twitch overlay`, `daggerheart obs overlay`) benefits from in-page content matching those exact queries.

---

#### `/features/campaigns` — Show Summaries, Depth Below the Fold

**Disclosure mode: Summary-first, deep content revealed through scroll.**

The campaigns page has the most content and the highest overwhelm risk. Six deep-dive sections stacked vertically could feel like documentation. The disclosure strategy uses **the fold itself as a progressive reveal** — each deep-dive section is a full viewport moment that reveals as the visitor scrolls.

| Content Element | Visibility | Rationale |
|---|---|---|
| Each deep-dive's headline + lede | Always visible when section scrolls into view | Scanners get the feature name and one-sentence pitch. |
| Each deep-dive's body paragraphs | Always visible below the lede | Deep-readers who paused on a section get the full explanation. |
| Tech spec lists (adversary catalog filters, HUD vitals) | Always visible within their section | These are proof points, not supplementary detail. |
| Environment system details (Fear cost, activatable features) | Visible in encounter designer body text | Important differentiator. Not hidden. |
| Homebrew content type list (classes, domains, weapons...) | Always visible in homebrew section | The breadth of content types IS the selling point. |

**No accordions on this page.** Despite the length, accordions would fragment the narrative. The campaigns page tells a progressive story: create → design → track → run → create homebrew. Hiding sections behind toggles breaks that flow. Instead, the page uses **visual pacing** (alternating image/text, background color shifts, ornamental dividers) to create breathing room and signal section boundaries.

**The scroll depth IS the progressive disclosure.** A visitor who scrolls past the encounter designer to reach the Command HUD has self-selected into the deep-reader path. A visitor who reads the hero and the first deep-dive headline, then bounces to the CTA, has self-selected into the scanner path. The page accommodates both without interactive toggles.

---

#### `/features/new-players` — Minimal Upfront, Expand for Curious

**Disclosure mode: Lighter density, no hidden content, visual progression.**

This page serves the most intimidation-prone audience. Every IA decision reduces cognitive load.

| Content Element | Visibility | Rationale |
|---|---|---|
| Step cards (3–4 steps of guided creation) | Always visible as visual flow | The visual structure (numbered badges, connecting lines) tells the story faster than text. |
| Step descriptions (1 sentence each) | Always visible under each step card | Brief enough to not overwhelm. Each sentence ends with a reassurance. |
| Full 9-step creation flow details | NOT shown | The product strategy doc specifies showing 3–4 macro steps, not the full 9-step flow. Showing all 9 steps (class → subclass → ancestry → community → traits → weapons → armor → equipment → domain cards) would trigger "this is complicated" reactions. The builder itself handles the full flow — the marketing page shows the concept. |
| SRD term definitions | Inline, brief, first use per page | "Domains" and "Ancestry" are explained in context the first time they appear. Not hidden behind tooltips. This is the one page where TTRPG literacy cannot be assumed. |
| GM teaching tools (ping, roll requests) | Always visible in dedicated section | GMs reading this page need to see these tools to feel confident sharing the link. |
| Shareable pitch block | Always visible, visually distinct | Designed to be screenshotted. Must not require interaction to read. |

**No accordions.** No expandable content of any kind. The new player page should feel like a single, uninterrupted guided path. If the visitor needs to click something to see more, the page has failed at its job — which is to say "you can do this, and here's how."

---

#### `/pricing` — Cards Visible, Details on Demand

**Disclosure mode: Pricing cards always visible. FAQ uses accordion. Tables are full-width.**

This is the only page that uses interactive progressive disclosure (the FAQ accordion). The rationale:

| Content Element | Visibility | Rationale |
|---|---|---|
| Pricing cards (Player + GM) | Always visible immediately after hero | The visitor came here to see the price. Show it instantly. |
| Full feature lists on cards | Always visible (expanded from landing page) | The landing page cards show 7/9 features. The pricing page cards show 14/20+. No truncation. |
| "What $5 Replaces" block | Always visible | Punchy value framing. Only 5 items. No reason to hide. |
| Feature comparison table | Always visible (desktop: table / mobile: stacked cards) | Visual scanners need this without interaction. |
| FAQ questions | Visible (collapsed) | Questions visible = scannable. The visitor sees all 6–8 question texts and can identify which ones matter to them. |
| FAQ answers | Hidden until clicked (accordion) | Answers are 1–2 sentences each. Showing all of them at once would create a wall of text that competes with the pricing cards for attention. The accordion concentrates attention on the question that matters to each individual visitor. |
| Competitor comparison table | Always visible | Positioned late (Section 6) so visitors encounter it only if they've scrolled past everything else. The scroll position is the disclosure gate. |

**FAQ accordion is the sole interactive disclosure element across all four pages.** This is intentional. Accordions are appropriate when: (a) the content is a collection of independent Q&A pairs, (b) most visitors only need 1–2 answers, not all of them, and (c) showing all answers simultaneously would create visual clutter. The pricing FAQ meets all three criteria. No other page does.

---

### 3c. SEO Impact of Disclosure Decisions

All content on all four pages is in the DOM and crawlable, regardless of visual state. The FAQ accordion content is rendered in the HTML — it's visually hidden with `grid-template-rows: 0fr` but NOT removed from the DOM with conditional rendering. This means:

- Google can index every FAQ answer
- FAQ schema markup (FAQPage structured data) references content that exists in the source
- No content is behind a "load more" button, lazy-loaded on interaction, or gated by JavaScript execution

This aligns with the product strategy doc's SEO recommendations: each page targets Daggerheart-specific keywords with full content visibility.

---

## 4. User Flow Mapping

Four flows, modeled on the four primary visitor types identified across the product strategy and narrative framework docs. Each flow traces the visitor's journey from entry point to conversion (or exit), with decision points and the IA elements that guide each decision.

### 4a. Flow 1: Streamer Evaluating Curses! for Their Show

**Entry point:** Direct link from a streaming community, Reddit post about Daggerheart actual plays, or Google search for "daggerheart twitch overlay."

**User profile:** Runs or plans a Daggerheart stream. Uses OBS. Knows what a browser source is. Has specific requirements (overlay dimensions, transparency, refresh rate). Will evaluate the tool against their current production workflow within 2 minutes.

```
ENTRY
  │
  ▼
/features/streaming (via direct link or landing page CTA)
  │
  ├─ Hero section loads
  │   → Reads headline: "Built for the Spotlight" (or variant)
  │   → Reads subheadline: confirms this is streaming-specific
  │   → DECISION POINT: "Is this real, or marketing fluff?"
  │
  ▼
Scrolls to Section 2 (Origin Story)
  │   → Reads: "Built alongside a weekly Daggerheart actual play"
  │   → TRUST UNLOCKED: "They actually stream. This isn't theoretical."
  │
  ▼
Scrolls to Section 3 (Twitch Overlay Deep-Dive)
  │   → Scans for: dimensions (380×220px), transparency, refresh rate (90s)
  │   → Sees tech spec list with monospace value pills
  │   → Reads setup steps: "Copy URL → paste as OBS browser source → done"
  │   → DESIRE: "This is exactly what I need and setup is trivial."
  │
  ├─── Fast path: ──────────────────────────────────┐
  │    Clicks hero CTA "Start Streaming Free"        │
  │    → /auth/register                              │
  │    → CONVERTED                                   │
  │                                                  │
  ▼                                                  │
Scrolls to Section 4 (OBS Dice Overlay)              │
  │   → "3D dice on stream, crit animations,         │
  │      campaign-synced"                             │
  │   → ESCALATION: "My chat is going to love this." │
  │                                                  │
  ▼                                                  │
Scrolls to Section 5 (Public Sheets)                 │
  │   → "Viewers can browse character sheets"         │
  │   → PRACTICAL VALUE: audience engagement          │
  │                                                  │
  ▼                                                  │
Scrolls to Section 6 (Command HUD Bridge)            │
  │   → Intrigued by second-monitor dashboard         │
  │   → Sees cross-link: "See the full GM toolkit →"  │
  │                                                  │
  ├─── Branch A: Clicks cross-link ─────────────────┐│
  │    → /features/campaigns                         ││
  │    → Continues evaluating campaign tools          ││
  │    → May return to streaming page or go to pricing││
  │                                                  ││
  ├─── Branch B: Continues scrolling ───────────────┐││
  │    → Section 7 (Social Proof)                    │││
  │    → Section 8 (Bottom CTA)                      │││
  │    → Clicks "Start Streaming Free"               │││
  │    → /auth/register                              │││
  │    → CONVERTED                                   │││
  │                                                  │││
  ├─── Branch C: Clicks "View Pricing" ─────────────┘││
  │    → /pricing                                     ││
  │    → Evaluates GM tier ($5/month for overlays)     ││
  │    → DECISION: "Is $5/month worth it for           ││
  │       streaming tools?"                            ││
  │    → Sees "What $5 Replaces" block                 ││
  │    → CONVERTED or BOOKMARKED                       ││
  └────────────────────────────────────────────────────┘│
```

**Key IA interventions in this flow:**

1. Tech spec lists visible without interaction (Section 3–4) — the streamer finds their answer in seconds
2. Origin story before deep-dives — establishes credibility before the specs
3. Command HUD as bridge section — naturally connects streaming to campaign tools
4. Bottom CTA includes pricing cross-link — catches the "how much does this cost?" question

---

### 4b. Flow 2: GM Comparing Campaign Tools

**Entry point:** Landing page's "Explore campaign tools →" link, Google search for "daggerheart campaign manager" or "daggerheart encounter designer," or referral from another GM.

**User profile:** Active or aspiring Daggerheart GM. Currently using a mix of Google Sheets, Discord, maybe Alchemy VTT. Wants to know: "Does this actually do more than my current setup?" Will evaluate breadth and depth of features. Likely to visit the pricing page before converting.

```
ENTRY
  │
  ▼
/features/campaigns (via landing page CTA or direct link)
  │
  ├─ Hero section loads
  │   → Reads headline: "Everything Between Session Zero and the Final Boss"
  │   → RECOGNITION: "They know the scope of what GMs need."
  │
  ▼
Section 2 (Problem Statement)
  │   → "GMs currently scatter their campaign across five tools"
  │   → VALIDATION: "That's literally my workflow right now."
  │
  ▼
Section 3 (Campaign Creation)
  │   → Invite links, player roster, character linking
  │   → QUICK SCAN: "Okay, standard campaign setup. What else?"
  │
  ▼
Section 4 (Encounter Designer) ← CRITICAL SECTION
  │   → Full adversary catalog, filterable by type/tier/difficulty
  │   → Inline stat blocks, drag-and-drop staging
  │   → Environment system with Fear-cost features
  │   → Per-adversary HP/condition tracking
  │   → "Build and run encounters from the same screen"
  │   → DESIRE: "This is what I've been building in spreadsheets."
  │
  ├─── Fast path: ──────────────────────────────────┐
  │    Scrolls to bottom → "Start Your Campaign"     │
  │    → /auth/register                              │
  │    → CONVERTED                                   │
  │                                                  │
  ▼                                                  │
Section 5 (Session Logging & Scheduling)             │
  │   → Searchable logs, scheduling, availability     │
  │   → "My campaign's memory, always up to date"     │
  │   → PRACTICAL RELIEF                              │
  │                                                  │
  ▼                                                  │
Section 6 (GM Command HUD) ← SECOND ANCHOR          │
  │   → Real-time party vitals, danger-state colors   │
  │   → Ping system, roll requests, forced crits       │
  │   → "Run your table like a pro"                    │
  │   → POWER FANTASY: "I want this during my session."│
  │                                                  │
  ▼                                                  │
Section 7 (Real-Time Features)                       │
  │   → WebSocket dice broadcasts, pings, sync         │
  │   → "Everything is connected"                      │
  │   → CRESCENDO                                      │
  │                                                  │
  ▼                                                  │
Section 8 (Homebrew Workshop)                        │
  │   → Custom classes, domains, weapons, ancestries   │
  │   → Source badges (SRD vs. homebrew)                │
  │   → CREATIVE EMPOWERMENT                           │
  │                                                  │
  ▼                                                  │
Section 9 (Bottom CTA)                               │
  │   → "Start Your Campaign" + "See Pricing"          │
  │                                                  │
  ├─── Most likely path: Clicks "See Pricing" ──────┐│
  │    → /pricing                                    ││
  │    → Reads GM tier card (full feature list)       ││
  │    → Scans "What $5 Replaces"                    ││
  │    → "Five tools in one for $5/month"             ││
  │    → Scans comparison table to confirm            ││
  │    → CONVERTED                                    ││
  └───────────────────────────────────────────────────┘│
```

**Key IA interventions in this flow:**

1. Problem statement (Section 2) validates the visitor's current pain before showing solutions
2. Encounter Designer positioned as fourth section (after context-setting campaign creation) — the visitor understands the ecosystem before seeing the flagship feature
3. Six deep-dives without accordions — the depth of the page IS the value proposition
4. Bottom CTA includes pricing cross-link — GMs almost always want to see pricing before committing

---

### 4c. Flow 3: New Player Invited by Their GM

**Entry point:** Direct link shared by a GM (via Discord, text, or email). This visitor has likely never been to curses.gg before. They may not know what Daggerheart is. They are the least qualified visitor of any flow.

**User profile:** TTRPG-curious or TTRPG-new. Was invited by a friend. Primary emotions: curiosity mixed with intimidation. Primary question: "Can I actually do this?" Will convert if the page makes them feel capable and excited.

```
ENTRY
  │
  ▼
/features/new-players (via GM's shared link)
  │
  ├─ Hero section loads
  │   → Reads headline: "Your First Character, Ready in Minutes"
  │   → Reads subheadline: "No rulebook required"
  │   → RELIEF: "This is for me. I don't need to know the rules first."
  │
  ▼
Section 2 (Emotional Hook)
  │   → "TTRPGs look complicated from the outside"
  │   → "You don't need a rulebook. Curses! walks you through it."
  │   → SAFETY: "They understand why I'm nervous."
  │
  ▼
Section 3 (Step Visualization)
  │   → 3–4 numbered steps with connecting lines
  │   → Step 1: "Choose your class" (with brief explanation)
  │   → Step 2: "Build your character" (app handles the math)
  │   → Step 3: "Show up and play" (rules are in the app)
  │   → CONFIDENCE: "Three steps? I can do three steps."
  │
  ├─── Fast path: ──────────────────────────────────┐
  │    Clicks hero CTA "Build Your First Character"   │
  │    → /auth/register                              │
  │    → CONVERTED (free registration)               │
  │                                                  │
  ▼                                                  │
Section 4 (In-Context Learning)                      │
  │   → "Every rule explained right on your sheet"     │
  │   → "Source badges show what's official"            │
  │   → "Full SRD rules reference built in"            │
  │   → EMPOWERMENT: "I can learn as I go."            │
  │                                                  │
  ▼                                                  │
Section 5 (GM Teaching Tools)                        │
  │   → "Your GM can highlight things on your screen"  │
  │   → "Roll requests pre-load your dice"             │
  │   → TRUST: "Even if I get lost, my GM can help."   │
  │                                                  │
  ▼                                                  │
Section 6 (Shareable Pitch Block)                    │
  │   → 4-step visual card:                            │
  │     1. Click GM's link                             │
  │     2. Create free account                         │
  │     3. Build character (app guides you)             │
  │     4. Show up to session                           │
  │   → "No books. No PDFs. No homework."              │
  │   → This block may be what the VISITOR shares       │
  │     with THEIR friend who also wants to try.        │
  │                                                  │
  ▼                                                  │
Section 7 (Social Proof)                             │
  │   → "First character built in under 10 minutes"    │
  │   → New player testimonial                         │
  │   → VALIDATION: "Others like me did this."         │
  │                                                  │
  ▼                                                  │
Section 8 (Bottom CTA)                               │
  │   → "Build Your First Character" (free)            │
  │   → "Send This to a Friend" (share/copy)           │
  │   → CONVERTED or SHARED                            │
  │                                                  │
  └──────────────────────────────────────────────────┘
```

**Key IA interventions in this flow:**

1. Emotional hook before any features — psychological safety first
2. Step visualization keeps the mental model simple (3 macro steps, not 9 detailed steps)
3. Shareable pitch block creates viral potential — the new player becomes a recruiter
4. "Send This to a Friend" secondary CTA — unique to this page, reflects the dual-audience nature
5. No pricing content on this page — the new player doesn't need to think about money (it's free)

---

### 4d. Flow 4: Price-Sensitive Visitor Evaluating Cost

**Entry point:** Landing page's pricing section (wants more detail), Google search for "curses daggerheart pricing," or direct navigation after seeing the product on social media.

**User profile:** Has already decided they're interested in Curses!. Coming to the pricing page to answer one of three questions: (a) "Is the free tier actually free?", (b) "Is $5/month worth it for the GM tools?", or (c) "How does this compare to Demiplane / other tools?" Will convert or leave within 2 minutes.

```
ENTRY
  │
  ▼
/pricing (via landing page link, direct URL, or search)
  │
  ├─ Hero section loads
  │   → Headline: "Simple, Honest Pricing"
  │   → Subheadline: "Players never pay. GMs get everything
  │      for less than a cup of coffee."
  │   → NO CTA in hero. Cards below are the action.
  │   → CLARITY: "Two prices. I can see both immediately."
  │
  ▼
Section 2 (Pricing Cards)
  │   → Player card: Free, 14 features listed
  │   → GM card: $5/month, 20+ features listed, "Recommended" badge
  │   → SELF-SELECTION POINT
  │
  ├─── Path A: "I'm a player" ──────────────────────┐
  │    → Scans Player card feature list               │
  │    → "Full character builder, all SRD,            │
  │       campaigns, dice — all free?"                │
  │    → Clicks "Get Started Free"                    │
  │    → /auth/register                              │
  │    → CONVERTED (free)                             │
  │                                                  │
  ├─── Path B: "I'm a GM evaluating $5/month" ──────┐│
  │    → Scans GM card feature list                   ││
  │    → Wants more detail                            ││
  │    → Scrolls to Section 3...                      ││
  │                                                  ││
  ▼                                                  ││
Section 3 ("What $5 Replaces")                       ││
  │   → Encounter builder → included                  ││
  │   → Session tracker → included                    ││
  │   → Streaming overlay → included                  ││
  │   → Homebrew host → included                      ││
  │   → Campaign manager → included                   ││
  │   → VALUE REFRAME: "This replaces 5 tools."       ││
  │                                                  ││
  ▼                                                  ││
Section 4 (Feature Comparison Table)                 ││
  │   → Player vs. GM: every feature with ✓ or ✗      ││
  │   → Categories: Building, Campaigns, Streaming,   ││
  │     Sessions, Homebrew, Real-Time                  ││
  │   → CONFIRMATION: "The GM tier includes            ││
  │     everything I need."                            ││
  │                                                  ││
  ├─── GM clicks "Claim Your Seat" → CONVERTED ──────┘│
  │                                                  │
  ├─── Path C: "How does this compare to others?" ──┐│
  │    → Scrolls to Section 6 (Competitor Table)     ││
  │    → Curses! vs. Demiplane vs. Alchemy vs. DIY   ││
  │    → Streaming row: only Curses! has checkmarks   ││
  │    → DIFFERENTIATION: "No one else has this."     ││
  │    → Scrolls back up or clicks CTA               ││
  │    → CONVERTED                                    ││
  │                                                  ││
  ├─── Path D: "I have specific questions" ──────────┘│
  │    → Section 5 (FAQ Accordion)                    │
  │    → Scans question texts, finds their concern     │
  │    → Expands: "Is the free tier actually free?"    │
  │    → Answer: "Yes. No trial. No credit card."      │
  │    → OBJECTION CLEARED                             │
  │    → Returns to pricing card → clicks CTA          │
  │    → CONVERTED                                     │
  └───────────────────────────────────────────────────┘
```

**Key IA interventions in this flow:**

1. No hero CTA — prevents premature decision before full evaluation
2. Pricing cards appear in the first scroll — the visitor came for the price, show it immediately
3. "What $5 Replaces" before comparison table — value framing before detail scanning
4. FAQ accordion — the only interactive disclosure element across all pages, appropriate because visitors have targeted questions
5. Competitor comparison last — only for visitors who need the final push
6. Multiple exit paths to registration — from pricing cards, after value block, after comparison table, after FAQ

---

## 5. Cognitive Load Analysis

Cognitive load is the total mental effort required to process a page. For marketing pages, excessive cognitive load produces bounce — the visitor leaves not because they're uninterested, but because the page demanded too much mental work to evaluate. This section identifies the highest cognitive load risks per page and prescribes specific mitigations.

### 5a. Cognitive Load Risk Matrix

| Page | Overall Risk | Primary Threat | Secondary Threat |
|---|---|---|---|
| `/features/streaming` | **Low** | Feature overlap with campaigns page (HUD appears on both) | Technical jargon alienating non-streamers |
| `/features/campaigns` | **High** | Feature volume — 6 deep-dive sections, each with multiple sub-features | Decision fatigue: "Which of these tools matters most to me?" |
| `/features/new-players` | **Medium** | Daggerheart-specific terminology (Domains, Ancestry, Hope, Stress) for TTRPG-unfamiliar readers | Paradox of reassurance: over-explaining "it's easy" makes it sound hard |
| `/pricing` | **Medium-High** | Two comparison tables + FAQ + expanded feature lists = data overload | Split-attention: trying to compare Player vs. GM while reading feature descriptions |

---

### 5b. `/features/streaming` — Low Risk, One Watchpoint

**Risk: Feature overlap with the campaigns page.** The Command HUD appears on both the streaming page (Section 6) and the campaigns page (Section 6). If the streaming page treats the HUD as a full deep-dive, visitors who then navigate to the campaigns page will encounter the same content — creating a sense of repetition that undermines trust ("are they padding the feature set?").

**Mitigation:** The streaming page's HUD section is a **bridge**, not a deep-dive. It shows 2–3 sentences about the HUD's streaming-specific value (second-monitor dashboard, danger-state colors, never breaking character to ask HP) and cross-links to the campaigns page for the full breakdown. The section heading should signal this: "Mission Control for Your Narrative" (streaming-specific framing) vs. "The Helm" (campaign-specific framing on the other page). Different headings, different emphasis, same feature.

**Risk: Technical jargon.** Terms like "WebSocket-synced," "browser source," and "transparent background" are native vocabulary for the streaming audience but could alienate a GM who stumbled onto this page looking for general campaign tools.

**Mitigation:** Every technical term is grounded in a benefit. "WebSocket-synced" appears next to "updates in real time on stream." "380×220px" appears next to "fits cleanly in any OBS scene." The tech spec list pattern (from the visual design doc) pairs monospace value pills with plain-language context. The jargon earns its place by serving the primary audience; the benefit context makes it parseable for the secondary audience.

---

### 5c. `/features/campaigns` — High Risk, Active Mitigation Required

This is the page most likely to overwhelm visitors. Six deep-dive sections covering encounter design, session logging, scheduling, real-time HUD, WebSocket connectivity, and homebrew creation. If presented poorly, it reads like a product requirements document.

**Threat 1: Feature volume.** A GM scanning this page encounters: adversary catalog, drag-and-drop staging, environment systems, Fear costs, HP tracking, condition tracking, threshold monitoring, session logging, NPC tracking, lore reveals, unresolved threads, scheduling, availability, Command HUD, party vitals, danger-state colors, ping system, roll requests, forced crits, dice broadcasts, homebrew workshop, markdown preview, source badges. That's 20+ discrete concepts across 6 sections.

**Mitigation — Chunking:**
- Group features into meaningful clusters that match how GMs think about their workflow:
  - **Prep** (encounter designer, homebrew workshop) — "Before the session"
  - **Play** (Command HUD, real-time features) — "During the session"
  - **Track** (session logging, scheduling) — "Between sessions"
- The section order (Create → Design → Track → Run → Connect → Create homebrew) follows a chronological campaign lifecycle. This temporal scaffolding gives the visitor a mental model for organizing the features: "I use this at this stage of my campaign."

**Mitigation — Visual pacing:**
- Alternating image/text zigzag prevents visual monotony
- Background color alternation (slate-950 → slate-900 → slate-950) creates implicit section boundaries
- Slate structural dividers between deep-dives + gold ornamental dividers between meta-sections
- Each deep-dive starts with a headline + lede that is scannable in 3 seconds — if the visitor doesn't care about that feature, they can scroll past the body text

**Mitigation — Entry-point variation:**
- Not every section needs to start with a paragraph. The encounter designer section can lead with an annotated screenshot. The Command HUD section can lead with a simulated dashboard visual. Visual entry points create variety that prevents the "wall of text" feeling even when total word count is high.

**Threat 2: Decision fatigue.** A GM reading this page might think: "This is great, but which of these tools should I care about most?" The page should NOT leave feature prioritization to the visitor.

**Mitigation — Signal hierarchy:**
- The encounter designer and Command HUD get **dense** treatment (longer copy, tech spec lists, detailed screenshots). Session logging and scheduling get **medium** treatment. The page's own density gradient tells the visitor which features are flagship.
- The hero subheadline names the top features: "encounters, sessions, scheduling, real-time party monitoring, homebrew creation" — this pre-loads a mental framework.

---

### 5d. `/features/new-players` — Medium Risk, Terminology Is the Danger

**Threat: Daggerheart jargon for a non-TTRPG audience.** The narrative framework doc explicitly warns: "Don't use TTRPG jargon without explanation. This is the one page where we explain what 'domains' and 'ancestry' mean in plain language."

**Mitigation — First-use definitions:**
Every Daggerheart term gets a brief, inline, conversational definition the first time it appears on this page. Not a tooltip (requires interaction). Not a glossary (requires navigation). Inline, parenthetical, natural.

Examples:
- "Choose your class — your character's role and fighting style"
- "Pick your ancestry — your character's species and heritage"
- "Select your domains — the two magical traditions that shape your abilities"
- "Track your Hope — a resource you spend to power your most dramatic moves"

After first use, the term appears without re-explanation. This follows the same pattern used in well-written TTRPG quickstart guides.

**Threat: The reassurance paradox.** If the page over-emphasizes "it's easy," it implies the opposite. "Don't worry, it's really simple" signals that there's something to worry about.

**Mitigation — Show, don't tell ease.**
- The step visualization (3 numbered steps) communicates simplicity visually without saying "it's simple"
- The shareable pitch block (4 steps: click link → create account → build character → show up) demonstrates brevity without claiming it
- The copy avoids words like "simple," "easy," and "don't worry." Instead, it uses action-oriented language: "Pick what sounds cool. Curses! handles the rest." This externalizes the complexity to the system rather than reassuring the visitor about their own capability.

---

### 5e. `/pricing` — Medium-High Risk, Data Overload Management

**Threat: Two comparison tables + FAQ + expanded feature lists.** The pricing page has the highest data density of any sub-page. The pricing cards alone show 14 (Player) + 20+ (GM) features. The feature comparison table repeats much of this data in tabular form. The competitor comparison table adds another dimension. The FAQ adds 6–8 Q&A pairs.

**Mitigation — Distinct visual treatment per section:**
- Pricing cards: Dark cards with gold accent, check-mark lists, large price display
- "What $5 Replaces": Punchy list with strikethrough tool names, distinct framing
- Feature comparison table: Structured table with category headers and checkmarks — visually distinct from the card format
- FAQ: Accordion with serif question headings — looks and feels different from the tables
- Competitor comparison: Wider table with multiple columns — differentiated by column count alone

Each section has a distinct visual form factor. The visitor never encounters two sections that look the same, which prevents the "I've already read this" confusion.

**Mitigation — Redundancy is intentional, not accidental.** The pricing cards and the feature comparison table contain overlapping information. This is deliberate: cards are for readers who make decisions from narrative lists, and tables are for readers who make decisions from structured data. Different cognitive styles, same information, different presentations. The key is that the table comes AFTER the cards — it's a confirmation tool, not a discovery tool.

**Threat: The "What $5 Replaces" block could feel like negative marketing if the visitor doesn't use the tools being compared.**

**Mitigation:** Frame as tool categories, not specific products. "An encounter builder subscription" (not "an Alchemy subscription"). "A streaming overlay service" (not "StreamElements"). This keeps the block universal and avoids alienating visitors who use different tools.

**How much pricing detail is too much?** The pricing page is the bottom of the funnel. Visitors here are actively deciding. MORE detail is better than less — the cost of over-explaining is a slightly longer page; the cost of under-explaining is a lost conversion. The comparison tables should err on the side of completeness. If a visitor has a question about whether a specific feature is included, the answer should be findable on this page without contacting support.

---

## 6. Mobile-First Considerations

Every IA decision in this document assumes mobile as the primary viewport. The pages are designed mobile-first and enhanced for desktop. This section specifies how the information architecture adapts on small screens.

### 6a. Mobile IA Principles

1. **Scroll is the interaction model.** Mobile visitors scroll, they don't click to reveal. Accordions should be minimal (pricing FAQ only). Everything else is in the scroll flow.
2. **One column, one idea at a time.** Desktop's alternating image/text zigzag collapses to a single column: image first, text second. The visitor processes one deep-dive section at a time.
3. **Touch targets are IA.** Any interactive element (CTA button, FAQ trigger, nav link, cross-page link) must have a 44px minimum touch target. This is not a visual spec — it's an IA constraint. If a cross-link has a touch target below 44px, it's effectively hidden on mobile.
4. **Sticky CTAs prevent scroll-to-convert friction.** On mobile, the distance between "I'm convinced" (somewhere mid-page) and "the CTA" (bottom of page) can be 3–4 swipes. Sticky CTAs bridge this gap.

### 6b. Card Restacking Rules

#### Feature Deep-Dive Blocks

Desktop: 2-column grid (text + image, alternating sides)
Mobile: 1-column stack. **Image always first, text second**, regardless of desktop order.

**Rationale:** On mobile, the image provides visual context for the text block below it. Leading with text on a narrow screen (no adjacent image to anchor the eye) creates a "wall of text" feeling. The image breaks the scroll visually and signals "new section."

#### Step Visualization (New Players Page)

Desktop: 5-column grid (Step 1 → Connector → Step 2 → Connector → Step 3)
Mobile: 1-column stack. Steps stack vertically with `gap-6`. Connectors hidden (`hidden lg:flex`).

**Rationale:** Numbered badges (1, 2, 3) provide sufficient sequential reading on mobile. Horizontal connector lines are meaningless in a vertical scroll. Hiding them is not a loss — it's a simplification.

#### Pricing Cards

Desktop: 2-column side-by-side
Mobile: 1-column stack. Player card first, GM card second.

**Rationale:** Player card first because the free tier is the universal entry point. The GM card's "Recommended" badge still signals priority even in a stacked layout. The visual design spec's `shadow-glow-gold` on the GM card provides sufficient emphasis without side-by-side comparison.

#### Comparison Tables

Desktop: Full table with columns
Mobile: Tables hidden (`hidden md:block`). Replaced with stacked feature cards (`md:hidden`). Each card shows feature name + Player status + GM status.

**Rationale:** Tables on mobile require horizontal scrolling, which breaks the vertical scroll model and hides data. Stacked cards preserve all information in the scroll flow. Each card is a self-contained unit — the visitor processes one feature at a time.

### 6c. Accordion Usage on Mobile

**Only the pricing FAQ uses accordions.** This holds on mobile. In fact, the accordion is MORE useful on mobile than desktop because the FAQ's expanded answers consume more relative viewport height on small screens. Keeping them collapsed preserves scannability.

**Accordion touch targets:** The FAQ trigger button (`w-full flex items-center justify-between py-5`) produces a touch target of full-width × ~56px (question text at `text-base` + `py-5`). This exceeds the 44px minimum.

**Accordion state on mobile page load:** All items collapsed. No auto-expansion. The visitor scans question texts and expands only the one they care about.

### 6d. Sticky CTA Strategy

On mobile, a **fixed-bottom CTA bar** should appear after the visitor scrolls past the hero section's CTA. This bar remains visible during the entire scroll through deep-dive sections, disappearing when the bottom CTA section enters the viewport (to avoid duplication).

#### Structure

```
┌──────────────────────────────────────────┐
│  [Primary CTA Button — full width]       │
│  Micro-copy beneath                      │
└──────────────────────────────────────────┘
```

#### Per-Page CTA

| Page | Sticky CTA Text | Micro-copy |
|---|---|---|
| `/features/streaming` | "Start Streaming Free" | "Free to try. Overlays at $5/month." |
| `/features/campaigns` | "Start Your Campaign" | "$5/month. Cancel anytime." |
| `/features/new-players` | "Build Your First Character" | "Free. No credit card." |
| `/pricing` | **No sticky CTA** | Pricing cards are visible early. A sticky CTA would compete with the in-page card CTAs. |

#### Show/Hide Logic

- **Appears:** When the hero section's CTA scrolls out of the viewport (intersection observer, `rootMargin: '-64px 0px 0px 0px'` to account for fixed nav)
- **Disappears:** When the bottom CTA section scrolls into the viewport
- **Animation:** Slide up from bottom, `duration-300 ease-out`. Reverse on hide.
- **Accessibility:** `aria-hidden="true"` when not visible. Not announced by screen readers when it appears (it duplicates content that's already in the DOM).

**Desktop: No sticky CTA.** On desktop, the page sections are visible alongside the CTA in the hero. The navigation path from any section to the bottom CTA is 1–2 scroll flicks. A sticky CTA on desktop would be redundant and consume viewport space that should go to content.

### 6e. Mobile-Specific Section Adaptations

| Page | Section | Mobile Adaptation |
|---|---|---|
| All | Hero | `min-h-[60vh]` (taller relative to screen). CTA buttons stack `flex-col w-full`. Headline scales down to `text-4xl`. |
| All | Breadcrumb | Remains above kicker. No truncation needed — paths are 3 levels max. |
| Streaming | Tech spec lists | No change. Single-column lists reflow naturally. Value pills may wrap — acceptable. |
| Campaigns | Deep-dive sections | Image always above text. Each section fills most of the viewport. The long scroll depth (7–8 viewports) is the primary risk — mitigated by visual pacing and clear section boundaries. |
| New Players | Step visualization | Cards stack vertically. Connectors hidden. Numbered badges provide sequence. |
| New Players | Shareable pitch block | Full-width card. No layout change needed — it's already a single-column card. |
| Pricing | Feature comparison table | Hidden. Replaced with stacked feature cards. |
| Pricing | Competitor comparison table | Hidden. Replaced with stacked cards or simplified summary (same pattern as feature comparison). |
| Pricing | FAQ accordion | No change. Accordions are inherently mobile-friendly. |

---

## 7. Reusable IA Patterns

These patterns are the structural building blocks shared across all four sub-pages. They create consistency, reduce learning curve between pages, and enable the front-end team to build once and deploy everywhere.

### 7a. The Universal Page Rhythm: Hero → Deep-Dive → Proof → CTA

Every sub-page follows the same four-act structure, varying only in the number and density of deep-dive sections:

```
ACT 1: ORIENT (Hero)
  ├─ Kicker (small caps, gold, identifies the page category)
  ├─ Headline (display font, emotional hook)
  ├─ Subheadline (body font, grounds the headline in specifics)
  └─ CTA (optional — not on pricing hero)

  ── Gold ornamental divider ──

ACT 2: PROVE (Deep-Dive Sections)
  ├─ Section N: Feature Deep-Dive
  │    ├─ Kicker (optional)
  │    ├─ Headline (H3, serif)
  │    ├─ Description (1–3 paragraphs, body font)
  │    ├─ Tech Spec List (optional, monospace value pills)
  │    └─ Screenshot / Visual
  ├─ ── Slate structural divider ──
  ├─ Section N+1: Feature Deep-Dive (alternating layout)
  └─ ... (repeat for each deep-dive)

  ── Gold ornamental divider ──

ACT 3: VALIDATE (Social Proof — optional)
  ├─ Testimonial(s)
  └─ Credibility stat

ACT 4: CONVERT (Bottom CTA)
  ├─ Closing headline (display font)
  ├─ Primary CTA button
  ├─ Secondary CTA button or cross-link
  └─ Micro-copy beneath CTAs
```

**Why this rhythm works:** It mirrors the visitor's decision process: "What is this?" (Hero) → "Show me the details" (Deep-Dives) → "Do others trust this?" (Proof) → "I'm ready" (CTA). Skipping any act creates an information gap.

### 7b. Shared Section Components

These components are extracted from the landing page and reused identically on all sub-pages:

| Component | Source | Reuse Pattern |
|---|---|---|
| **FantasyBgSection** | Landing page | Hero backgrounds, final CTA backgrounds. Page-specific overlay gradients per visual design spec. |
| **RevealSection** | Landing page | Every section wrapper. Same `duration-700 ease-out` animation, same intersection observer thresholds. |
| **StaggerCard** | Landing page | Card grids (feature cards, step cards, pricing cards). Same `120ms` stagger offset. |
| **FeatureCard** | Landing page | SRD feature grid on new players page. Same icon + title + description pattern. |
| **PricingCard** | Landing page | Pricing cards on pricing page. Enhanced with expanded feature lists but same visual structure. |
| **ImagePlaceholder** | Landing page | Screenshot containers until real screenshots exist. Same faux-browser-chrome frame. |

**Components NOT reused:**

| Component | Reason |
|---|---|
| **MarqueeRibbon** | Sub-pages don't have a marquee. It's a landing page monument. |
| **ParallaxHero** | Sub-pages use simpler gradient heroes. Parallax is reserved for the landing page's first impression. |
| **TestimonialCard** | Will be created as a variant if/when sub-page testimonials are added. The landing page version may not match sub-page needs (different layout contexts). |

### 7c. Shared Navigation Pattern

All four sub-pages share:

- **Same sticky header** (logo, nav links, Log In / Start Free buttons)
- **Same mobile hamburger** (same breakpoint, same animation, same close behaviors)
- **Same footer** (4-column layout, same links, same social icons)
- **Same breadcrumb format** (for `/features/*` pages)

The visitor's navigation experience is identical across pages. The only change is the active-state indicator on the nav links.

### 7d. Shared Divider System

Two divider types, used consistently:

| Divider | When Used | Classes |
|---|---|---|
| **Gold ornamental** | Between major sections (hero → content, content → CTA). Signals "new act." | `h-px bg-gradient-to-r from-transparent via-gold-400/20 to-transparent` |
| **Slate structural** | Between deep-dive blocks within the same section. Signals "new topic, same act." | `h-px bg-gradient-to-r from-transparent via-slate-700/30 to-transparent` |

**Rule:** Gold dividers appear at most twice per page (after hero, before final CTA). Slate dividers appear between every deep-dive block. This ratio prevents gold fatigue while maintaining structural clarity.

### 7e. Shared Typography Scale

All sub-pages inherit the landing page's typography stack without modification:

| Element | Font | Classes |
|---|---|---|
| Hero H1 | `jetsam-collection-basilea` (display) | `font-display text-4xl sm:text-5xl md:text-6xl` |
| Section H2/H3 | `double-pica` (serif) | `font-serif text-2xl sm:text-3xl font-bold` |
| Kicker | `sofia-pro-narrow` (sans) | `font-sans text-xs uppercase tracking-[0.2em] text-gold-400` |
| Body | `mestiza-sans` (body) | `font-body text-base text-parchment-300 leading-relaxed` |
| Tech spec | System mono | `font-mono text-xs text-parchment-200` |

**Sub-pages cap at `text-6xl` for hero headlines** (vs. `text-8xl` on the landing page). This signals that sub-pages are chapters, not the title page.

### 7f. Shared Background Alternation

```
Hero              → FantasyBgSection (page-specific overlay)
Section 1         → bg-slate-950 (clean)
Section 2         → bg-slate-900 (elevated)
Section 3         → bg-slate-950 (clean)
...alternate...
Final CTA         → FantasyBgSection (warm overlay)
Footer            → bg-slate-950 + border-t
```

The alternation creates implicit section boundaries without explicit visual separators. A background shift from `slate-950` to `slate-900` (a subtle 5% lightness increase) is enough to signal "new section" to the scanning eye.

### 7g. Shared CTA Block Pattern

The bottom CTA section on every sub-page uses the same structure:

```
FantasyBgSection (warm overlay)
  └─ max-w-4xl, centered
       ├─ Closing headline (display font, gold gradient text)
       ├─ Supporting sentence (body font, parchment text)
       └─ Button row
            ├─ Primary CTA (gold gradient, shimmer effect)
            └─ Secondary CTA (border outline) or cross-link
```

**Per-page variation is limited to:**
- CTA button text (page-specific per product strategy doc)
- Micro-copy beneath buttons (page-specific)
- Closing headline text (page-specific)

The visual structure is identical. This consistency trains the visitor: "I know what the bottom of a Curses! page looks like, and I know where the sign-up button is."

### 7h. Shared Scroll-Reveal Animation

Every section on every sub-page uses the `RevealSection` wrapper:
- Trigger: Intersection Observer, `threshold: 0.12`, `rootMargin: 0px 0px -40px 0px`
- Animation: `opacity-0 translate-y-8` → `opacity-100 translate-y-0`
- Duration: `700ms ease-out`
- Fires once (observer disconnects after first intersection)
- Respects `prefers-reduced-motion`: instantly visible, no animation

Card grids use `StaggerCard` with `120ms` delay per index. This creates the signature "cards appearing one by one" effect from the landing page.

**No page-transition animations.** Navigation between sub-pages is a standard Next.js `<Link>` route change. Adding cross-page transitions would require `framer-motion` or the experimental View Transitions API, which is not justified for marketing pages.

---

## Appendix: Key IA Decisions Summary

1. **Streaming page: fully open disclosure, no accordions.** Technical audience wants specs visible. Hiding dimensions and refresh rates behind toggles would be hostile to the primary user.

2. **Campaigns page: scroll-as-disclosure, no interactive reveals.** The page's length IS the value proposition. Six deep-dives without accordions, using visual pacing (zigzag layout, background alternation, dividers) to prevent overwhelm. Temporal scaffolding (Prep → Play → Track) gives the visitor a mental model for organizing 20+ features.

3. **New players page: lightest density, show-don't-tell simplicity.** 3 macro steps (not 9 detailed steps). First-use definitions for all Daggerheart terms. No accordions, no hidden content. The shareable pitch block makes this page a viral recruitment asset.

4. **Pricing page: only page with interactive disclosure (FAQ accordion).** Pricing cards immediately visible. FAQ collapsed by default because visitors have targeted questions, not a desire to read all answers. Competitor comparison table positioned last as a final-objection tool.

5. **No in-page anchor navigation on any page.** All four pages are short enough (4–8 viewports) that scrolling is trivially fast. Visual pacing creates wayfinding without a TOC.

6. **Consistent page rhythm across all four: Hero → Deep-Dive → Proof → CTA.** Same structural bones, different density and tone. A visitor who reads one sub-page knows the shape of all four.

7. **Mobile sticky CTA on feature pages (not pricing).** Bridges the gap between "I'm convinced" (mid-page) and "sign up" (bottom) on mobile, where scroll distance is significant.

8. **Cross-page links create a navigation mesh.** Every feature page links to at least one other feature page and to pricing. Pricing links back to all three feature pages. No dead ends.

9. **Footer adds `/features/new-players` and `/pricing` links.** Current footer only links to streaming and campaigns. Adding the other two ensures all sub-pages are discoverable from every page.

10. **Command HUD is a bridge on streaming, a deep-dive on campaigns.** Avoids content duplication while ensuring both pages address the feature. Different headings, different emphasis, same underlying tool.

