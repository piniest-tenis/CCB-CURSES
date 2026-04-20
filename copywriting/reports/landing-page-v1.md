# Rewrite Report: Landing Page Copy

> **Record ID**: landing-page-v1  
> **Type**: Marketing landing page — all sections  
> **Date**: April 12, 2026  
> **Status**: New content (no prior version to diff against)

---

## Detected Issues (Pre-emptive)

This is new copy, not a rewrite of existing text. The following issues were identified in existing app copy that informed landing page decisions:

| Location                      | Issue                                                                                                       | Resolution                                                                                                |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `layout.tsx` meta description | "Build and manage your Daggerheart characters and campaigns." — functional but not compelling for marketing | Landing page subheadline provides the marketing-grade version                                             |
| `PatreonCTA.tsx`              | Uses "FREE Patreon" — all-caps FREE feels aggressive                                                        | Landing page pricing uses "Free" in title case, with tooltip "No credit card. No trial. Free means free." |
| `Footer.tsx`                  | "Get Support, Chat with Cast, and More on Discord" — good, reused in landing page footer                    | No change needed                                                                                          |
| Twitch extension README       | Uses "Curses! Daggerheart" as a compound name                                                               | Landing page keeps "Curses!" as the standalone product name, with "for Daggerheart" as a descriptor       |
| `LoadingInterstitial.tsx`     | "Preparing your adventure" — warm, on-brand                                                                 | Informed the voice tone for landing page CTAs                                                             |

---

## Dictionary Updates

New file created: `/copywriting/dictionary.json`

Key additions:

- All SRD terms with capitalization rules (Hope, Stress, Domain, Adversary, etc.)
- Brand terms (Curses!, Man in Jumpsuit, Chronicles of Tidwell)
- Platform feature names (Encounter Designer, GM Command HUD, Homebrew Workshop)
- Full Tidwell setting glossary (from CMS seed data)
- Formatting conventions (em dash, ellipsis, Oxford comma)

---

## SRD Terminology Conflicts

None. All landing page copy uses SRD-compliant terminology:

- "Adversary" (not "monster" or "enemy")
- "Ancestry" and "Community" (not "race" or "background")
- "Domain" and "Domain Card" (capitalized, per SRD)
- "Hope," "Stress," "HP" (capitalized as resources)

---

## Rationale for Major Decisions

### Hero Headline: "Your Adventure Starts Here"

- Considered: "Daggerheart Deserves Better," "Forge Your Legend," "The Daggerheart Toolkit"
- Chosen because it's welcoming to all three audiences (players, GMs, newcomers) without being exclusionary or competitive. Works with the display font's dramatic weight.

### Section headlines use mixed register

- Feature sections use sentence-case energy ("Built for the Spotlight," "New to Daggerheart? Start Here.")
- Structural sections use title case ("Simple, Honest Pricing," "Voices from the Table")
- This mirrors the app's existing pattern: serif headings for structural hierarchy, energetic phrasing for feature callouts.

### Final CTA: "Roll Initiative"

- Universal TTRPG phrase that every player recognizes as "the thing you say when it's time to begin"
- Double meaning: both a game action and a motivational call to action
- Short enough for the display font at large size

### 404 Page: "Curses! This Page Isn't Here Yet."

- The brand name IS the punchline — it's what you'd naturally exclaim when something goes wrong
- Avoids the cliché "you rolled a 1" or "critical fail" patterns common in TTRPG 404 pages
- Friendly tone ("still forging this one") signals active development

### Pricing: "Claim Your Seat" for GM CTA

- "Seat at the table" is a TTRPG metaphor that maps perfectly to a subscription action
- More evocative than "Subscribe" while remaining clear about what happens when you click
- The Player CTA ("Get Started Free") is deliberately more plain — removing friction for the free tier

---

## Recommended UI Explanations / Tooltips

Included in the copy document under "Additional Microcopy > Hover Tooltips":

- Price tag tooltips explaining no-trial / cancel-anytime
- Homebrew Workshop feature tooltip with full list of creatable content types
- Ping system tooltip explaining the gold-pulse mechanic

---

## Accessibility Notes for Front-End Implementation

- All CTA buttons use distinct, action-oriented text (no duplicate labels in the same viewport)
- Testimonials include role context in attribution for screen reader comprehension
- Scroll indicator includes text content ("Discover more") rather than relying solely on an arrow icon
- Stats strip items should be marked up as a list (`<ul>`) with appropriate ARIA, not decorative text
- Pricing cards should use `<section>` with `aria-labelledby` pointing to the card title
