# Curses! Sub-Pages — Narrative & Copy Framework

> **Purpose:** This document defines the emotional arc, headline direction, copy block guidance, proof points, CTA strategy, and voice calibration for four marketing sub-pages that expand on the landing page's feature sections. These pages deepen the story the landing page introduces. They do not repeat it.  
> **Version**: 1.0  
> **Date**: April 14, 2026  
> **Author**: Promotion & Growth Agent  
> **Depends on**: `LANDING_PAGE_NARRATIVE_FRAMEWORK.md` (brand voice), `landing-page-copy.md` (existing copy)

---

## Governing Principles

Before the page-by-page breakdown, four rules that apply to every sub-page:

**1. Deepen, don't echo.** The landing page gives each feature area a headline, a paragraph, and two to four bullet-level sub-features. These sub-pages exist to go further. Every section here should reveal something the landing page didn't have room to say. If a visitor reads both the landing page and a sub-page and encounters the same sentence twice, we've failed.

**2. Lead with the feeling, then deliver the spec.** Each page opens with an emotional hook that speaks to the reader's situation — their frustration, their ambition, their uncertainty. Technical detail follows as the proof that the feeling is justified. Specs without emotion are documentation. Emotion without specs is hype. We do both.

**3. Every page earns its own CTA.** The landing page funnels everyone toward "Create Your Character." Sub-pages can be more specific. A streamer visiting `/features/streaming` is further along the decision path than someone browsing the homepage. The CTAs here should reflect that specificity and intent.

**4. One voice, four registers.** All four pages share the Curses! brand voice defined in `LANDING_PAGE_NARRATIVE_FRAMEWORK.md`: confident without arrogance, warm without saccharine, fantasy-infused without corny, creator-forward and community-rooted. But each page shifts its register to match its audience. The shifts are defined per-page below.

---

## Page 1: `/features/streaming` — Streaming & Content Creation Tools

### Voice Calibration

**Register: Energetic insider.** This page speaks creator-to-creator. The reader runs a show, or wants to. They know what OBS browser sources are. They've wrestled with overlay sizing. They've felt the pain of their chat having no idea what's happening on screen. The tone is the confidence of someone who's solved those problems live, on stream, and is now handing over the solution. Think: a fellow streamer pulling you into a back channel to show you something that changed their workflow overnight.

**Vocabulary leans technical and production-aware.** Words like "browser source," "transparent background," "auto-refresh interval," and "WebSocket-synced" belong here. They're not jargon to this audience — they're proof of competence. But every technical term should be grounded in a benefit. We never say "380×220px" without also saying why that dimension matters.

**Energy level: High but controlled.** This page should feel like a production reel that also happens to be documentation. Kinetic, but never breathless.

---

### Emotional Arc

| Section | Emotional Beat | What the Reader Feels |
|---|---|---|
| **Hero** | Recognition + intrigue | "Finally, someone who understands what I actually need for my show." |
| **Origin story** | Credibility + trust | "Wait — this was built alongside a real weekly stream? They've actually used this under pressure." |
| **Twitch overlay deep-dive** | Desire + specificity | "That's exactly the overlay I've been trying to build manually. And it just... works?" |
| **OBS dice overlay deep-dive** | Escalating excitement | "3D dice on stream, synced to the campaign, with crit animations? My chat is going to lose it." |
| **Public sheet sharing** | Practical relief | "No more screenshotting my character sheet. Viewers can just browse it." |
| **Command HUD for streamers** | Professional ambition | "This is what a real production looks like behind the scenes." |
| **Stream-ready design system** | Confidence + personalization | "I can theme this to match my brand. This feels like mine." |
| **CTA** | Momentum | "I need to try this before my next session." |

---

### Headline & Sub-Headline Direction

**Hero headline options:**

1. "Your Show Deserves a Toolkit That Streams" — Positions the product as purpose-built, addresses the reader's ambition for production quality.
2. "Designed on Stream. Built for Yours." — Origin story in six words. Establishes credibility immediately.
3. "Every Roll. Every Hit Point. Live on Screen." — Concrete, visual, emphasizes the real-time nature.

**Hero sub-headline direction:** One sentence that grounds the headline. Something like: "Curses! was built alongside a weekly Daggerheart actual play. The streaming tools were forged under the same pressure you feel every session." The word "alongside" is doing heavy lifting — it communicates co-development, not afterthought.

**Section headlines throughout the page:**

- Origin story section: "Built on Wednesday Nights" — References the actual stream schedule, implies real-world validation.
- Twitch overlay section: "Live Character Cards, Zero Configuration"
- OBS dice section: "Every Roll, Rendered and Broadcast"
- Public sheets section: "Your Build, Their Browser"
- Command HUD section: "Mission Control for Your Narrative"
- Theming section: "Your Stream's Colors. Your Stream's Identity."

---

### Key Copy Blocks

**Hero intro paragraph (2-4 sentences of direction):**
Establish that streaming tools in TTRPG platforms are almost always afterthoughts. They're bolted on after launch, designed by people who don't stream. Then pivot: Curses! was designed by a GM who streams a Daggerheart actual play every week. The streaming toolkit came first. The character builder grew around it. This inversion of the typical development story is the most differentiating thing about the platform for this audience. Let the reader feel that inversion.

**Origin story block:**
Tell the brief story of the Curses! stream — Wednesday nights, 8:30 PM ET, a cast of indie audio-fiction creators. The tools on this page are the same tools used live on that stream. Every pain point discovered during a session becomes a feature by the following week. The feedback loop between the stream and the platform is the competitive moat. Frame this as a production pedigree, not a sales pitch. Name the stream. Name the cast. Link to the Twitch channel.

**Twitch overlay deep-dive:**
Go beyond the landing page's "Live Character Cards" summary. Explain what viewers actually see: a compact card (380×220px, transparent background) showing the character's name, class, domains, HP, Stress, Hope, and active conditions. Explain that it auto-refreshes every 90 seconds over WebSocket, so stat changes appear on stream within moments of happening at the table. Emphasize the zero-config setup: one URL, pasted as a browser source, done. Contrast this with the manual alternative — updating a graphic by hand, or using a spreadsheet visible on a camera.

**OBS dice overlay deep-dive:**
Describe the full experience: 3D rendered dice, campaign-synced via WebSocket so every roll from every player appears on stream. Goldenrod glow on critical hits. Automatic fade-out timing so the overlay cleans itself up. Transparent background, designed to layer over any scene. Separate persistent dice log overlay for viewers who want to see roll history. Emphasize that this requires zero plugins — it's a browser source URL.

**Public sheet sharing:**
Explain the share system: expiring tokens so the URL is secure, no login required for viewers. Viewers can explore the full character sheet — stats, loadout, backstory, domain cards — on their own time. This turns every character into a piece of content that lives beyond the stream. Frame it as audience engagement between sessions.

**Command HUD for streamers:**
Reframe the Command HUD specifically for the streaming use case. This isn't about campaign management here — it's about having a second-monitor dashboard that shows you every player's HP, Stress, Hope, conditions, and danger state while you narrate. Color-coded. Sorted by who's hurting most. So you never have to break character to ask "wait, how much HP do you have?" Frame this as the difference between a home game and a production.

**Stream-ready design system:**
High-contrast sheets readable at 720p. Themeable colors to match a stream's brand identity. Dark mode only — because dark backgrounds stream better and photograph better. The entire visual system was designed with OBS scene composition in mind.

---

### Proof Points & Specificity

These are the concrete details that make this page credible. Use them inline, not as a separate list:

- Twitch overlay renders at 380×220px with transparent background
- Auto-refresh interval: 90 seconds over WebSocket
- Stats displayed live: HP, Stress, Hope, active conditions, class, domains
- OBS dice overlay: 3D rendered, goldenrod glow on crits, WebSocket-synced to campaign session
- Dice overlay auto-fade timing (no manual dismissal needed)
- Separate persistent dice log overlay for roll history
- Browser source URLs — no plugins, no extensions, no downloads
- Public share URLs use expiring security tokens
- Sheet design tested at 720p readability
- Command HUD color-codes by danger state: healthy → wounded → critical → down
- Command HUD sorts party members by who's hurting most
- Platform built alongside a weekly Wednesday night stream (8:30 PM ET / 5:30 PM PT)
- Cast includes creators from REDACTED, Quest Friends, Dungeons and Drimbus, Tales of the Ever After

---

### CTA Copy

**Primary CTA:** "Start Your Stream Setup" — More specific than the landing page's "Create Your Character." This reader is a creator. They want to see the streaming tools. The CTA should take them to registration with intent.

**Secondary CTA:** "Watch the Tools in Action" — Links to the Twitch channel or a VOD clip showing the overlays live. For visitors who want proof before commitment.

**Micro-copy beneath primary CTA:** "Free to try. Streaming overlays unlock with the GM tier at $5/month."

**Micro-copy beneath secondary CTA:** "Wednesdays at 8:30 PM ET on Twitch"

---

---

## Page 2: `/features/campaigns` — Campaign Management Tools

### Voice Calibration

**Register: Authoritative depth.** This page speaks to experienced GMs who have been managing campaigns with duct tape — Google Sheets, Notion databases, Discord bots, separate encounter builders, PDF adversary statblocks bookmarked across twenty tabs. The reader is competent and opinionated. They've built their own systems because nothing good enough existed. The tone should respect that competence while demonstrating that Curses! is the system they would have built if they'd had the time and engineering resources.

**Vocabulary leans toward workflow and systems thinking.** Words like "unified," "integrated," "real-time," "synchronized," "catalog," "filterable." This reader cares about how things connect. They've felt the friction of context-switching between tools. The copy should make them feel the relief of everything living in one place.

**Energy level: Measured and confident.** Less kinetic than the streaming page. This is a page that earns trust through thoroughness. The depth of the feature set is the selling point. Let it speak.

---

### Emotional Arc

| Section | Emotional Beat | What the Reader Feels |
|---|---|---|
| **Hero** | Recognition of pain | "They know. They actually know what it's like to prep a session with five different tools open." |
| **Unified overview** | Relief + ambition | "One place for everything. I can actually see how this all fits together." |
| **Encounter designer deep-dive** | "I need this" | "Full adversary catalog, drag-and-drop, environment system, inline stat blocks? I've been building this in a spreadsheet." |
| **Session tools deep-dive** | Practical satisfaction | "Searchable session logs. Scheduling with availability. This is the organizational backbone I've been missing." |
| **Command HUD deep-dive** | Power fantasy | "I can see every player's vitals at a glance and ping specific elements on their sheets. This changes how I run the table." |
| **Real-time connectivity** | Awe at integration | "WebSocket dice broadcasts, roll requests, forced crits for dramatic moments — everything is connected." |
| **Homebrew workshop** | Creative empowerment | "I can build custom classes, domains, weapons, ancestries — and my players see them with source badges? This is the workshop I've wanted." |
| **CTA** | Readiness | "I want to build my first campaign in this." |

---

### Headline & Sub-Headline Direction

**Hero headline options:**

1. "Everything Between Session Zero and the Final Boss" — Scope statement. Borrowed from the narrative framework's pillar 3 concepts, proven language.
2. "One Platform. Every Tool a GM Actually Needs." — Direct, benefit-forward, grounded.
3. "Campaign Management, Actually Designed" — Implies that everything else has been improvised. The word "actually" does a lot of work.

**Hero sub-headline direction:** One to two sentences that frame the problem before presenting the solution. Something like: "Most Daggerheart tools stop at the character sheet. Curses! keeps going — encounters, sessions, scheduling, real-time party monitoring, homebrew creation, all connected and all in one place."

**Section headlines throughout the page:**

- Unified overview: "The GM's Complete Toolkit"
- Encounter designer: "Encounters That Build Themselves"
- Session tools: "Your Campaign's Memory"
- Command HUD: "The Helm"
- Real-time connectivity: "Every Table, Connected in Real Time"
- Homebrew workshop: "Forge Your Own World"

---

### Key Copy Blocks

**Hero intro paragraph:**
Open with the pain of the multi-tool GM workflow. Don't mock it — honor it. These GMs have been resourceful. Acknowledge that they've made Google Sheets do things Google Sheets were never meant to do. Then pivot: Curses! was built by a GM who did exactly that, got frustrated, and decided to build the tool that should have existed. The campaign system is the product of that frustration, designed by someone who uses it at their own table every week.

**Encounter designer deep-dive:**
This is the section that should make a GM's jaw drop. Go deep on the console: full adversary catalog (every SRD adversary, filterable by type, tier, and difficulty), inline stat blocks so you never leave the encounter screen, drag-and-drop adversary placement. Then the environment system — activatable environmental features that cost Fear, add battlefield conditions, and require player interaction. Per-adversary HP tracking, condition tracking, threshold monitoring. Frame this as the encounter prep tool that also runs the encounter live. The prep-to-play pipeline has zero handoff — you build it and run it from the same screen.

**Session tools deep-dive:**
Two components here: session logging and scheduling. Session logs capture lore reveals, player decisions, NPC introductions, and unresolved threads — all searchable. This becomes the campaign's institutional memory. Position it as the thing that prevents "wait, what happened with that NPC three sessions ago?" Scheduling handles session dates with player availability tracking, keeping the group coordinated without leaving the app. Keep this section practical and warm. GMs know the pain of scheduling. Acknowledge it.

**Command HUD deep-dive:**
The landing page describes this in four lines. This page should spend an entire section on it. Real-time party dashboard showing HP percentage, Stress levels, armor slot status, Hope count, and active conditions for every player. Color-coded by danger state (healthy, wounded, critical, down). Sorted by who's hurting most so the GM's eye naturally goes to the player who needs attention. Designed to live on a second monitor during narration. Includes the ping system — tap any element on a player's sheet and their screen scrolls to it with a gold highlight animation. Roll request system — GM sends "roll Agility" and the player's dice panel pre-populates with the correct dice pool. Forced critical rolls for dramatic story moments. This section should make the reader feel like a mission commander.

**Real-time connectivity:**
Explain the WebSocket architecture in benefit terms. Every player and the GM share a live connection. Dice rolls broadcast to everyone in the campaign. GM pings scroll directly to specific sheet elements on the player's screen. Roll requests stage into the player's dice panel. This means no one is ever out of sync. Frame this as the invisible infrastructure that makes everything else feel seamless.

**Homebrew workshop:**
Structured creation forms for every content type: custom classes, subclasses, domains, weapons, armor, loot tables, ancestries, communities. Live markdown preview so creators see exactly what their content will look like. Source badge differentiation — SRD content gets one badge, homebrew gets another — so players always know what's official and what's custom. Frame this as creative freedom with guardrails. The workshop validates against the SRD structure so homebrew content plays nicely with the rest of the system.

---

### Proof Points & Specificity

- Full SRD adversary catalog, filterable by type, tier, and difficulty
- Inline stat blocks rendered within the encounter designer
- Drag-and-drop adversary placement in encounter staging
- Environment system with activatable features that cost Fear
- Per-adversary HP, condition, and threshold tracking
- Session logs capture: lore reveals, decisions, NPC introductions, unresolved threads
- Session logs are fully searchable
- Session scheduling with player availability tracking
- Command HUD displays: HP%, Stress, armor slots, Hope, active conditions
- Danger-state color coding: healthy → wounded → critical → down
- Party sorted by severity (most hurt first)
- GM ping system: tap element → player's screen scrolls to it with gold pulse animation
- Roll request system: pre-populates player's dice panel with correct dice pool
- Forced critical rolls for dramatic moments
- WebSocket connections: real-time dice broadcasts, GM-to-player pings
- Homebrew workshop supports: classes, subclasses, domains, weapons, armor, loot tables, ancestries, communities
- Live markdown preview in homebrew creation forms
- Source badges distinguish SRD content from homebrew

---

### CTA Copy

**Primary CTA:** "Start Your Campaign" — Direct, high-intent. This reader is a GM ready to build. Links to registration or directly to campaign creation for authenticated users.

**Secondary CTA:** "Explore the Encounter Designer" — For visitors who want to see the deepest feature before committing. Could link to a walkthrough, a demo video, or a detailed screenshot gallery.

**Micro-copy beneath primary CTA:** "$5/month. Cancel anytime. Your players join free."

**Micro-copy beneath secondary CTA:** "Full adversary catalog. Drag-and-drop staging. Environment systems."

---

---

## Page 3: `/features/new-players` — New Player Experience

### Voice Calibration

**Register: Encouraging warmth.** This page has two audiences reading simultaneously: the new player themselves, and the experienced GM or friend who is about to send this link to a new player. The tone should make the new player feel safe and excited, while giving the GM confidence that they can hand this tool to a total beginner. No condescension. No oversimplification. The assumption is that the reader is smart but unfamiliar — they can learn anything, they just haven't learned *this* yet.

**Vocabulary stays accessible but never talks down.** Daggerheart terms (Ancestry, Community, Domain, Hope, Stress) should appear naturally and always with brief, friendly context the first time they're used. Never assume the reader knows what a domain card is. Never make them feel dumb for not knowing.

**Energy level: Warm, steady, reassuring.** This page is a hand extended. The pace should feel guided, not rushed. Shorter paragraphs. More whitespace. The visual rhythm itself should communicate "you can take your time here."

---

### Emotional Arc

| Section | Emotional Beat | What the Reader Feels |
|---|---|---|
| **Hero** | Welcome + curiosity | "I'm interested in Daggerheart and this seems like the place to start. Nobody's making me feel behind." |
| **Guided creation overview** | Relief + agency | "It walks me through everything? I don't have to figure out what to do first?" |
| **Step-by-step walkthrough** | Growing confidence | "Oh, I pick my class, then my ancestry, then my gear — and it explains each one. I can actually do this." |
| **In-context learning** | Empowerment | "Every rule, every feature, every term is explained right on my character sheet. I don't need a separate PDF." |
| **GM guidance tools** | Trust | "My GM can literally highlight things on my screen and send me the exact roll I need. I won't get lost." |
| **SRD reference** | Completeness | "The entire rules reference is built in? I can look up anything without leaving the app?" |
| **CTA** | Excitement | "I want to build my first character right now." |

---

### Headline & Sub-Headline Direction

**Hero headline options:**

1. "Your First Character, Ready in Minutes" — Promise of speed and ease. "First" implies a beginning, not a remedial experience.
2. "Every Rule Explained. Every Step Guided." — Double promise. Addresses the two biggest fears: not understanding the rules, and not knowing what to do next.
3. "The Fastest Path into Daggerheart" — Positions Curses! as the on-ramp. Active, forward-moving language.

**Hero sub-headline direction:** Something that names the fear and immediately dissolves it. Like: "Daggerheart is one of the most exciting new TTRPGs out there. You don't need to read a rulebook to start playing. Curses! walks you through character creation step by step and keeps every rule at your fingertips during play."

**Section headlines throughout the page:**

- Guided creation: "Pick Your Path, One Step at a Time"
- Step-by-step walkthrough: "From Blank Sheet to Ready to Play"
- In-context learning: "Rules Where You Need Them, When You Need Them"
- GM guidance tools: "Your GM Has Your Back (Literally)"
- SRD reference: "The Complete Rulebook, Built In"

---

### Key Copy Blocks

**Hero intro paragraph:**
Name the moment this page is for: you've heard about Daggerheart, you want to play, and you're staring at a blank character sheet wondering where to start. Acknowledge that TTRPGs can feel intimidating when you're new — not because they're hard, but because there's a lot to learn at once. Then offer the hand: Curses! was designed so that your very first character creation experience feels guided, clear, and genuinely fun. No prerequisite knowledge. No PDF open in another tab. You'll be playing in minutes.

**Guided creation overview:**
Describe the step-by-step flow at a high level: class → subclass → ancestry (with mixed ancestry support) → community → trait assignment → weapons → armor → starting equipment → domain cards → review. Emphasize that the order is deliberate — each step builds on the last, and Curses! validates every choice along the way. The math is handled. Incompatible options are flagged. The player makes creative decisions; the system handles the bookkeeping.

**Step-by-step walkthrough:**
Go deeper on two or three individual steps to show what the experience actually feels like. For example: "When you choose your class, you'll see a brief description of what that class does and how it plays. Pick one that sounds exciting. Curses! will then show you the subclasses available for that class, each with their own description. You're never guessing — you're choosing from options you understand." Do the same for ancestry (mention mixed ancestry support, explain that it's built in and guided) and domain cards (explain what a loadout is, how the picker works, that each card has an inline description).

**In-context learning:**
This is the section that should make GMs excited to share this page. Explain that every feature, trait, domain card, and condition on the character sheet includes a collapsible SRD description. Tap to expand, read what it does, collapse it and keep playing. Source badges distinguish official SRD content from homebrew — so a new player never accidentally uses something their GM hasn't approved. The entire SRD rules reference is searchable and browsable without leaving the app. Frame this as: the character sheet is also the rulebook, and the rulebook is also the character sheet.

**GM guidance tools:**
Explain the ping system and roll request system from the new player's perspective. When the GM says "use your Hope Feature," they can tap that feature on the GM's side and the player's screen scrolls directly to it with a gold highlight. When the GM says "roll Agility," a roll request appears in the player's dice panel, already loaded with the right dice. The player taps "Roll." They don't need to know where Agility lives on their sheet or which dice to grab. Frame this as the safety net that lets someone play their very first session without ever feeling lost.

**SRD reference:**
Brief section confirming that the complete Daggerheart SRD is built into the app, searchable by keyword, browsable by category, and always one tap away. A new player can look up any rule, any term, any mechanic without ever leaving Curses!. No PDFs. No alt-tabbing. No "hold on, let me look that up."

---

### Proof Points & Specificity

- Guided creation flow: class → subclass → ancestry → community → traits → weapons → armor → equipment → domain cards → review
- Mixed ancestry support built into the creation flow
- Collapsible SRD descriptions on every feature, trait, domain card, and condition
- Source badges on all content: SRD vs. homebrew
- GM ping system: tap any element → player's screen scrolls to it with gold pulse animation
- Roll request system: GM sends roll type → player's dice panel pre-populates correct dice pool → player taps Roll
- Domain card descriptions inline on the character sheet
- Class feature explanations inline on the character sheet
- Condition definitions inline on the character sheet
- Full SRD rules reference: searchable, browsable, always accessible within the app
- Character creation validated at each step (incompatible choices flagged, math handled)
- First character buildable in under ten minutes

---

### CTA Copy

**Primary CTA:** "Build Your First Character" — The word "first" is essential. It's welcoming, it implies a beginning, and it mirrors the landing page's "Create Your Character" with a softer, more personal touch.

**Secondary CTA:** "Send This to a Friend" — This page will be shared by GMs inviting new players. Make that sharing action explicit. Could be a copy-link button or a share intent.

**Micro-copy beneath primary CTA:** "Free. No credit card. No rulebook needed."

**Micro-copy beneath secondary CTA:** "Know someone who wants to try Daggerheart? This is the link to send."

---

---

## Page 4: `/pricing` — Pricing Detail Page

### Voice Calibration

**Register: Transparent generosity.** The landing page's pricing section is clean and compact. This page exists for the reader who wants to understand exactly what they get. The tone is generous — we're proud of what the free tier includes and we believe the paid tier is an obvious value. There's no hard sell. There's no manufactured urgency. The price is what it is, and we explain why it's worth it by showing what it replaces.

**Vocabulary is plain and precise.** No marketing fluff. No weasel words. Feature names match exactly what the user sees in the app. Prices are stated in full ("$5/month," never "$5/mo" or "$4.99"). This page should read like a promise made in plain language.

**Energy level: Calm, confident, matter-of-fact.** The pricing page is not the place for hype. It's the place for clarity. The confidence comes from the completeness of the offering and the honesty of the framing. Let the value do the work.

---

### Emotional Arc

| Section | Emotional Beat | What the Reader Feels |
|---|---|---|
| **Hero** | Clarity + relief | "No tiers to decode. No gotchas. I can see exactly what I get." |
| **Philosophy statement** | Trust + respect | "They actually believe players should never pay. That's not a marketing line — the free tier is genuinely complete." |
| **Player tier deep-dive** | Surprised generosity | "All of this is free? Character builder, SRD reference, dice roller, domain loadout, companion management, downtime tracking? There's no catch?" |
| **GM tier deep-dive** | Value recognition | "Five dollars for campaigns, encounters, the Command HUD, session tools, streaming overlays, and the homebrew workshop? That replaces at least four other subscriptions." |
| **What $5 replaces** | Concrete value | "They're right. I was paying for a VTT, a separate encounter tool, a session tracker, and a homebrew host. This is all of them." |
| **FAQ / Common questions** | Final objection clearing | "No contracts. Cancel anytime. No feature degradation on the free tier. Okay, I'm in." |
| **CTA** | Decision confidence | "I know exactly what I'm getting. Let's go." |

---

### Headline & Sub-Headline Direction

**Hero headline options:**

1. "Players Play Free. GMs Get Everything." — Two-role split in one line. Clear, declarative, generous.
2. "Honest Pricing for an Honest Toolkit" — Echoes "Simple, Honest Pricing" from the landing page but goes further. "Honest" is the operative word — used intentionally.
3. "Two Roles. Two Price Points. Zero Surprises." — Structural clarity. The reader knows exactly what they're about to see.

**Hero sub-headline direction:** Reframe the pricing philosophy in one sentence. Something like: "We believe the barrier to playing Daggerheart should be zero. Players get the full character builder, every SRD resource, and complete campaign participation for free. GMs unlock the complete campaign management and streaming layer for $5/month."

**Section headlines throughout the page:**

- Philosophy: "Why Pricing Works This Way"
- Player tier: "The Player Tier — Complete and Free"
- GM tier: "The GM Tier — Your Entire Toolkit for $5/month"
- What $5 replaces: "What Five Dollars Replaces"
- FAQ: "Questions We Get Asked"

---

### Key Copy Blocks

**Hero intro paragraph:**
State the pricing model in the most plain language possible. Players: free, forever, no trial, no credit card, no feature gates. GMs: $5/month, cancel anytime, includes everything. No annual pricing tricks. No enterprise tier. Two roles, two prices. That's it. The simplicity is the point — let the reader feel the relief of encountering a pricing page that doesn't require a comparison spreadsheet.

**Philosophy statement:**
Explain why the free tier is genuinely complete. Curses! was built by people who play at their own table. They know that the biggest barrier to getting someone into a TTRPG is friction — cost, complexity, the feeling of needing to buy in before you can participate. So the player tier includes everything a player needs: full character creation, all SRD content, campaign participation, the dice roller, domain card management, companion tracking, downtime projects, and the complete SRD reference. This is a philosophical choice, not a marketing tactic. Frame it as: GMs already do the most work at the table. The platform's job is to make that work easier and more affordable.

**Player tier deep-dive:**
Expand every feature in the Player tier with one sentence of context. The landing page lists them as bullet points. This page should give each one a line that explains what it means in practice. For example: "Full character creation and editing" becomes "Build and manage as many characters as you want — guided creation, full editing, leveling, equipment management, trait reassignment." "Domain card loadout management" becomes "Browse, assign, and swap your domain cards with inline descriptions for every card in the SRD." Go through all seven features this way.

**GM tier deep-dive:**
Same treatment: expand every GM feature with one sentence of practical context. But also group them into functional clusters for scannability:

- **Campaign management**: creation, invite links, player roster
- **Encounter tools**: designer console, adversary catalog, environment system, live tracking
- **Session tools**: logging, scheduling, availability
- **Command & control**: Command HUD, ping system, roll requests, forced crits
- **Streaming**: Twitch overlay, OBS dice overlay, public sheet sharing
- **Homebrew**: workshop for classes, domains, weapons, armor, loot, ancestries, communities

This grouping helps the reader see the breadth and also helps them self-identify which clusters matter most to them.

**What $5 replaces:**
This is the value-comparison section. Don't name competitors — name categories. "A VTT subscription" (most are $5-10/month). "A separate encounter builder." "A homebrew hosting tool." "A session tracker." "A streaming overlay service." Five categories. Five things that $5/month from Curses! consolidates into one integrated platform. Let the reader do the math. If they're currently paying for even two of these categories, the GM tier pays for itself.

**FAQ section:**
Address the objections that prevent conversion:
- "Is the free tier really free?" → Yes. No trial period. No credit card. No feature gates that make the free tier feel like a demo.
- "What happens if I cancel the GM tier?" → You keep your characters and player features. Campaign data is preserved and read-only. You can re-subscribe anytime.
- "Is there an annual plan?" → Not currently. $5/month, cancel anytime. We'd rather earn your subscription every month.
- "Do my players need to pay to join my campaign?" → No. Players are free. Always.
- "What payment methods do you accept?" → [Standard answer based on payment processor.]

---

### Proof Points & Specificity

- Player tier — free forever, no credit card required, no trial period
- Player tier includes: full character builder, all SRD classes/domains/ancestries/communities, domain card loadout, dice roller with custom colors, companion management, downtime tracking, complete SRD reference with full-text search
- GM tier — $5/month, cancel anytime, no contracts
- GM tier includes: unlimited campaigns, encounter designer with full adversary catalog, environment system, session logging, session scheduling, Command HUD, ping system, roll requests, forced crits, Twitch overlay, OBS dice overlay, public sheet sharing, homebrew workshop (classes, subclasses, domains, weapons, armor, loot tables, ancestries, communities), priority feature access
- $5/month replaces: VTT subscription + encounter builder + homebrew host + session tracker + streaming overlay tool
- No feature degradation on free tier — it's the same feature set regardless of GM tier status
- Price stated as "$5/month" — never abbreviated, never rounded, never presented with annual conversion

---

### CTA Copy

**Primary CTA (Player):** "Get Started Free" — Identical to the landing page. Consistency matters here. The reader has just read the full breakdown and this CTA confirms: yes, it's free, yes, right now.

**Primary CTA (GM):** "Claim Your Seat" — Maintained from the landing page for consistency. The metaphor works: claiming a seat at the table, stepping into the GM role.

**Secondary CTA:** "Compare Features Side by Side" — If the page includes a comparison table, this anchor scrolls to it. For the detail-oriented reader who wants to see every difference in one view.

**Micro-copy beneath Player CTA:** "No credit card. No trial. Free means free."

**Micro-copy beneath GM CTA:** "$5/month. Cancel anytime. Your players join free."

---

---

## Cross-Page Considerations

### Navigation Between Sub-Pages

Each sub-page should include contextual links to related sub-pages. Suggested cross-links:

- `/features/streaming` → links to `/features/campaigns` ("See the full GM toolkit") and `/pricing` ("Streaming overlays included in the GM tier")
- `/features/campaigns` → links to `/features/streaming` ("See the streaming tools") and `/features/new-players` ("Onboarding new players to your campaign")
- `/features/new-players` → links to `/pricing` ("Free for all players") and `/features/campaigns` ("Your GM's toolkit")
- `/pricing` → links to all three feature pages as proof points under the GM tier

### Breadcrumb Strategy

Each sub-page should include a breadcrumb trail: Home → Features → [Page Name] (or Home → Pricing). This orients visitors who arrive via search or social media directly to a sub-page.

### SEO Title & Description Direction

- `/features/streaming`: Title: "Streaming Tools for Daggerheart Actual Plays | Curses!" — Description emphasizes Twitch overlay, OBS integration, built-by-streamers origin story.
- `/features/campaigns`: Title: "Campaign Management for Daggerheart GMs | Curses!" — Description emphasizes encounter designer, Command HUD, session tools, real-time connectivity.
- `/features/new-players`: Title: "New to Daggerheart? Start Here | Curses!" — Description emphasizes guided character creation, in-context rules, GM teaching tools.
- `/pricing`: Title: "Pricing — Free for Players, $5/month for GMs | Curses!" — Description states the price in the meta description so it appears in search results. No ambiguity.

### Visual Treatment Notes

All four sub-pages should inherit the landing page's design system: dark-mode-only, same typography stack (`double-pica` for serif headlines, `jetsam-collection-basilea` for display moments, `mestiza-sans` for body), same color palette (burgundy accents, gold highlights, parchment text, steel-blue secondary), same scroll-reveal animation pattern. The sub-pages should feel like natural extensions of the landing page, not separate microsites.

Each page should include at least one full-width visual moment (screenshot, animated demo, or interactive embed) that demonstrates the feature being described. The streaming page is the strongest candidate for an embedded video or Twitch clip. The campaigns page benefits from a simulated Command HUD. The new players page could embed a stripped-down version of the guided creation flow. The pricing page needs no visual gimmick — clarity and typography carry it.

---

## Appendix: Terminology Alignment

All sub-pages must follow the terminology conventions established in `landing-page-copy.md`:

- **Daggerheart SRD terms**: Hope, Stress, HP, Domain, Ancestry, Community, Class, Subclass, Domain Card, Loadout (capitalized per SRD convention)
- **Adversary** (never "monster" or "enemy") in encounter design contexts
- **SRD** used without expansion after first use
- **Player** and **Game Master** as tier names (never "tier" — they're roles)
- **Command HUD** (always capitalized, always spelled out on first use per page)
- **Homebrew workshop** (lowercase "workshop" — it's a feature name, not a proper noun)
- **$5/month** (never "$5/mo," never "$4.99," always the full form)
