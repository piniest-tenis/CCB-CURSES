# Feature Gaps: What Competitors Do That We Don't

*Generated: 2026-04-08*
*Purpose: Track features offered by Demiplane and/or Heart of Daggers that Curses! CCB does not yet offer, for roadmap prioritization.*

---

## Gap Summary

| # | Feature | Available In | Priority Recommendation | Effort Estimate |
|---|---------|-------------|------------------------|-----------------|
| 1 | Rules Compendium / Searchable SRD | Demiplane, Heart of Daggers | High | Medium |
| 2 | Homebrew Marketplace | Heart of Daggers | Medium | Large |
| 3 | Community Homebrew Vault (Browse/Upvote) | Heart of Daggers | Medium | Medium |
| 4 | Premade Character Templates | Heart of Daggers | Medium | Small |
| 5 | Dark Mode / Theme Toggle | Demiplane, Heart of Daggers | Low-Medium | Small |
| 6 | GM Screen (Customizable Reference Panels) | Heart of Daggers | Medium | Medium |
| 7 | Adventure Authoring & Sharing | Heart of Daggers | Low | Large |
| 8 | Forums / Community Discussion | Heart of Daggers | Low | Medium |
| 9 | Multi-System Support | Demiplane | None (by design) | N/A |
| 10 | Official Licensed Content | Demiplane | Uncertain | N/A |
| 11 | Actual Play Content Curation | Heart of Daggers | Low | Small |
| 12 | Artist Guild / Creator Community | Heart of Daggers | Low | Small |
| 13 | AI Content Filtering | Heart of Daggers | Low | Small |

---

## Detailed Gap Analysis

### 1. Rules Compendium / Searchable SRD

**What competitors offer:**
- **Demiplane:** Full hyperlinked rules compendium with searchable text, cross-referenced entries, and inline tooltips. This is one of Demiplane's flagship features.
- **Heart of Daggers:** Embedded rules reference overlay accessible from any page.

**What Curses! CCB has today:**
- Class wiki/browser (`/classes`, `/classes/[classId]`)
- Domain card wiki/browser (`/domains`, `/domains/[domain]`)
- Raw SRD markdown files in the `markdown/` directory (used for ingestion, not user-facing)
- Machine-readable SRD rules specification (backend validation, not a user-browsable reference)

**The gap:**
We have the raw SRD content and the class/domain browsers, but no comprehensive, searchable rules compendium that covers the full SRD (combat rules, rest mechanics, death/scarring, conditions, etc.). Players and GMs need quick in-session access to rules.

**Recommendation:** High priority. We already have the markdown source files. Building a searchable, hyperlinked rules reference from our existing content pipeline would be a natural extension. Could be implemented as a standalone route (`/rules`) with full-text search.

---

### 2. Homebrew Marketplace

**What Heart of Daggers offers:**
- Paid + pay-what-you-want + free homebrew products
- Categories: Campaign Frames, Adventure Modules, Classes, Domains, Adversaries, Equipment, Maps, Other
- Creator profiles with follower system
- Best seller badges (Diamond, Gold, Emerald, Quartz tiers)
- Review/rating system
- Creator analytics dashboard
- 85% revenue share (100% for Vaultsmith Pro subscribers)
- DRM-free downloads
- Shopping cart + checkout flow

**What Curses! CCB has today:**
- Homebrew creation forms for classes, communities, ancestries, domain cards, weapons, armor, items, consumables
- Campaign Frames (curated homebrew packages)
- But all homebrew is private to the creator -- no public sharing, no marketplace

**The gap:**
We have the homebrew creation infrastructure but no way for creators to share or monetize their content. This is a significant community-building feature.

**Recommendation:** Medium priority. This is a large effort involving payment processing, content moderation, creator tools, and legal considerations. Consider a phased approach: (1) public sharing first, (2) marketplace later.

---

### 3. Community Homebrew Vault (Browse & Upvote)

**What Heart of Daggers offers:**
- Public browseable homebrew repository
- Categories: Adversaries, Ancestries, Armor, Classes, Communities, Consumables, Domains, Environments, Items, Subclasses, Weapons
- Upvote system
- Weekly "most liked" showcase
- Filtering by tier, type, trait, range, rarity, source, campaign frame
- AI content toggle filter

**What Curses! CCB has today:**
- Private homebrew only (creator's own content)

**The gap:**
No public homebrew browsing, discovery, or community curation. Even without a paid marketplace, a free sharing vault with upvotes would drive community engagement and content creation.

**Recommendation:** Medium priority. This is a prerequisite for a marketplace and a strong community driver on its own. Could be implemented before any monetization layer.

---

### 4. Premade Character Templates (Quick-Start)

**What Heart of Daggers offers:**
- 10+ premade character templates (Warrior, Ranger, Guardian, Seraph, Rogue, Sorcerer, etc.)
- One-click start from a template instead of going through the full builder

**What Curses! CCB has today:**
- Full 10-step builder wizard only; no premade starting points

**The gap:**
New players or players who want to jump in quickly have no shortcut. Templates reduce friction for onboarding and demo scenarios.

**Recommendation:** Medium priority, small effort. We could create a set of premade characters and offer them as a "Quick Start" option alongside the full builder. Could also serve as demo characters for non-authenticated visitors.

---

### 5. Dark Mode / Theme Toggle

**What competitors offer:**
- **Demiplane:** Dark theme by default
- **Heart of Daggers:** Explicit dark/light mode toggle

**What Curses! CCB has today:**
- Single parchment/warm theme with no toggle
- Custom Tailwind theme (parchment, slate-850, shadow-card tones)

**The gap:**
No dark mode option. The parchment aesthetic is distinctive and on-brand, but some users (especially those playing in dimly-lit rooms) prefer dark themes. Accessibility consideration: some users with light sensitivity need dark mode.

**Recommendation:** Low-Medium priority. The parchment theme is a brand differentiator, but offering a dark variant would improve accessibility and user preference coverage. Small-medium effort depending on how deeply the theme is embedded in component styles.

---

### 6. GM Screen (Customizable Reference Panels)

**What Heart of Daggers offers:**
- Customizable multi-screen layout (up to 5 screens)
- Section library for populating panels
- Sync across devices
- Shareable link
- Reset options

**What Curses! CCB has today:**
- Command Center (live party vitals + fear tracker) -- this is a GM tool, but focused on combat monitoring, not reference panels
- No customizable reference panel layout

**The gap:**
GMs often need quick-reference panels for rules, tables, NPC notes, etc. Our Command Center is excellent for combat tracking but doesn't serve the "reference at your fingertips" use case.

**Recommendation:** Medium priority. Could be implemented as tabs or panels within the existing campaign view. The rules compendium (Gap #1) would be a natural content source for GM Screen panels.

---

### 7. Adventure Authoring & Sharing

**What Heart of Daggers offers:**
- Write adventures with structured authoring tools
- "My Adventures" library
- "Explore Adventures" public browsing
- Available in the marketplace for sale

**What Curses! CCB has today:**
- Nothing in this space

**The gap:**
Adventure authoring is a substantial content creation feature. This is a different product category from character building.

**Recommendation:** Low priority. This is a large effort and moves away from our core competency (character building + live session tools). Monitor community demand before investing.

---

### 8. Forums / Community Discussion

**What Heart of Daggers offers:**
- Built-in Daggerheart community forums

**What Curses! CCB has today:**
- No community discussion features (Discord is the de facto community channel)

**The gap:**
No in-app community discussion. However, Discord serves this purpose for most gaming communities.

**Recommendation:** Low priority. Discord integration or a link to a Discord server is more effective and lower maintenance than building custom forums. Most TTRPG communities prefer Discord.

---

### 9. Multi-System Support

**What Demiplane offers:**
- Daggerheart, Marvel Multiverse, Pathfinder 2e, Vampire: The Masquerade, and many other systems on one platform

**What Curses! CCB has today:**
- Daggerheart only (by design)

**The gap:**
This is a strategic positioning choice, not a missing feature.

**Recommendation:** None. Daggerheart focus is our identity. Multi-system support would dilute the product and compete directly with Demiplane's core value proposition. Stay focused.

---

### 10. Official Licensed Content

**What Demiplane offers:**
- Official Darrington Press licensed content
- Digital sourcebook purchases

**What Curses! CCB has today:**
- SRD content (free, open) + Curses! homebrew extensions
- No official licensed content beyond the SRD

**The gap:**
We cannot offer non-SRD official content without a licensing agreement with Darrington Press.

**Recommendation:** Uncertain. Monitor whether Darrington Press opens additional licensing pathways. The SRD covers the vast majority of character building needs for the 1.0 ruleset.

---

### 11. Actual Play Content Curation

**What Heart of Daggers offers:**
- Curated actual play videos and shows

**What Curses! CCB has today:**
- Nothing in this space

**Recommendation:** Low priority, small effort. Could be a simple curated links page. Our streaming integration (OBS/Twitch) is a stronger play in this space -- we enable actual plays rather than just linking to them.

---

### 12. Artist Guild / Creator Community

**What Heart of Daggers offers:**
- Creator community hub for artists

**What Curses! CCB has today:**
- Nothing in this space

**Recommendation:** Low priority. Interesting community feature but not aligned with our core product.

---

### 13. AI Content Filtering

**What Heart of Daggers offers:**
- Toggle to filter out AI-generated homebrew content
- AI-free content pledge

**What Curses! CCB has today:**
- No AI content tagging or filtering

**Recommendation:** Low priority but worth noting. If we build a public homebrew vault (Gap #3), AI content filtering would be a valuable trust signal for the community. Small implementation effort (boolean flag on content + filter toggle).

---

## Priority Matrix

### High Priority (Address Soon)
1. **Rules Compendium** -- We have the content; we just need the UI. High user value.

### Medium Priority (Next Quarter)
3. **Community Homebrew Vault** -- Community driver, prerequisite for marketplace
4. **Premade Character Templates** -- Low effort, high onboarding impact
6. **GM Screen** -- Complements our existing GM tools

### Low Priority (Monitor & Evaluate)
2. **Homebrew Marketplace** -- Large effort, requires vault first
5. **Dark Mode** -- Accessibility improvement
7. **Adventure Authoring** -- Different product category
8. **Forums** -- Discord fills this role
11. **Actual Play Curation** -- Our streaming tools are the better play
12. **Artist Guild** -- Nice-to-have community feature
13. **AI Content Filtering** -- Needed only if we build the vault

### Not Applicable
9. **Multi-System Support** -- Strategic choice to stay Daggerheart-focused
10. **Official Licensed Content** -- Requires licensing agreement; SRD covers core needs
