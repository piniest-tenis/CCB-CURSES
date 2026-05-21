"use client";

/**
 * src/app/features/campaigns/page.tsx
 *
 * Campaign Command Center — full feature page. LONGEST sub-page.
 *
 * Sections:
 *   1. Hero (FantasyBgSection, cool heavier overlay, breadcrumb, CTA)
 *   2. Problem Statement / Pain Framing
 *   3. Deep-Dive: Campaign Creation & Party Management
 *   4. Deep-Dive: Encounter Designer Console (DENSE)
 *   5. Deep-Dive: Session Logging & Scheduling
 *   6. Deep-Dive: GM Command HUD (DENSE)
 *   7. Deep-Dive: Real-Time WebSocket Features
 *   8. Deep-Dive: Homebrew Workshop (CORAL accent)
 *   9. Bottom CTA
 *
 * Voice: Authoritative depth. Measured and confident.
 * Steel-blue secondary accent for real-time/technical elements.
 * Coral accent for Homebrew section.
 * No social proof section on this page.
 */

import React from "react";
import Link from "next/link";
import { MarketingNav } from "@/components/marketing/MarketingNav";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { FantasyBgSection } from "@/components/marketing/FantasyBgSection";
import { RevealSection } from "@/components/marketing/RevealSection";
import { FeatureDeepDive } from "@/components/marketing/FeatureDeepDive";
import { ScreenshotContainer } from "@/components/marketing/ScreenshotContainer";
import { TechSpecList } from "@/components/marketing/TechSpecList";
import { CTABlock } from "@/components/marketing/CTABlock";
import { MobileStickyCtaBar } from "@/components/marketing/MobileStickyCtaBar";

/* ─── Page ─────────────────────────────────────────────────────────────────── */

export default function CampaignFeaturesPage() {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      <MarketingNav activePage="features" />

      <main id="main-content" className="flex-1">
        {/* ═══════════════════════════════════════════════════════════════════
            SECTION 1 — Hero
        ═══════════════════════════════════════════════════════════════════ */}
        <FantasyBgSection
          alt="Fantasy painting: A command table with maps spread across it, bathed in cool moonlight"
          className="min-h-[60vh] sm:min-h-[50vh] pt-32 pb-16 sm:pt-40 sm:pb-20 flex items-center"
          overlayClassName="bg-gradient-to-b from-slate-950/70 via-slate-950/85 to-slate-950"
          atmosphereStyle={{
            background:
              "radial-gradient(circle at 50% 33%, rgba(87,115,153,0.15) 0%, rgba(170,32,71,0.10) 50%, transparent 70%)",
          }}
        >
          <div className="relative z-10 mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
            {/* Breadcrumb */}
            <nav aria-label="Breadcrumb" className="mb-8">
              <ol className="flex items-center justify-center gap-2 text-xs font-sans uppercase tracking-[0.1em] text-parchment-600">
                <li>
                  <Link
                    href="/"
                    className="hover:text-gold-400 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-400 rounded"
                  >
                    Home
                  </Link>
                </li>
                <li aria-hidden="true" className="text-parchment-600/40">
                  ›
                </li>
                <li>
                  <Link
                    href="/#features"
                    className="hover:text-gold-400 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-400 rounded"
                  >
                    Features
                  </Link>
                </li>
                <li aria-hidden="true" className="text-parchment-600/40">
                  ›
                </li>
                <li className="text-gold-400" aria-current="page">
                  Campaigns
                </li>
              </ol>
            </nav>

            <RevealSection>
              <p className="font-serif-sc text-xs sm:text-sm font-normal leading-normal tracking-[0.2em] text-gold-400 mb-4">
                Campaign Management
              </p>
            </RevealSection>

            <RevealSection delay={100}>
              <h1 className="font-display text-4xl sm:text-5xl md:text-6xl font-normal leading-[1.05] tracking-wide text-parchment-50">
                Everything Between Session Zero and the Final Boss
              </h1>
            </RevealSection>

            <RevealSection delay={200}>
              <p className="mx-auto max-w-xl text-lg sm:text-xl text-parchment-400 leading-relaxed mt-6 font-body">
                Encounters, sessions, scheduling, real-time party monitoring,
                homebrew creation — all connected and all in one place.
              </p>
            </RevealSection>

            <RevealSection delay={300}>
              <div
                id="hero-cta"
                className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4"
              >
                <Link
                  href="/auth/register"
                  className="group relative inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-gold-400 to-gold-500 px-10 py-4 text-lg font-bold text-slate-950 shadow-glow-gold hover:from-gold-300 hover:to-gold-400 transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 overflow-hidden w-full sm:w-auto"
                >
                  <span
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-out"
                    aria-hidden="true"
                  />
                  <span className="relative">Start Your Campaign</span>
                </Link>
                <Link
                  href="/pricing"
                  className="inline-flex items-center justify-center rounded-xl border border-parchment-400/30 px-10 py-4 text-lg font-semibold text-parchment-300 hover:border-gold-400/50 hover:text-gold-400 transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-400 w-full sm:w-auto"
                >
                  See Pricing
                </Link>
              </div>
            </RevealSection>
          </div>
        </FantasyBgSection>

        {/* Gold ornamental divider */}
        <div
          className="h-px bg-gradient-to-r from-transparent via-gold-400/20 to-transparent"
          aria-hidden="true"
        />

        {/* ═══════════════════════════════════════════════════════════════════
            SECTION 2 — Problem Statement / Pain Framing
        ═══════════════════════════════════════════════════════════════════ */}
        <section
          className="bg-slate-950 py-20 sm:py-28"
          aria-labelledby="problem-heading"
        >
          <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 text-center">
            <RevealSection>
              <h2
                id="problem-heading"
                className="font-serif text-2xl sm:text-3xl font-bold text-parchment-50 mb-6 leading-[1.15]"
              >
                You&rsquo;ve been building your GM toolkit from spare parts.
              </h2>
            </RevealSection>

            <RevealSection delay={100}>
              <p className="font-body text-base text-parchment-400 leading-relaxed mb-4">
                A spreadsheet for encounters. A Discord bot for scheduling. A
                shared doc for session notes. A separate VTT for maps. A PDF
                for adversary stats bookmarked across twenty tabs. Every tool
                solves one problem and creates two more.
              </p>
              <p className="font-body text-base text-parchment-300 leading-relaxed">
                Curses! was built by a GM who did exactly that, got frustrated,
                and decided to build the system that should have existed.
                Everything on this page lives in one integrated platform.
              </p>
            </RevealSection>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════════════
            SECTION 3 — Deep-Dive: Campaign Creation & Party Management
        ═══════════════════════════════════════════════════════════════════ */}
        <section className="bg-slate-950 py-16 sm:py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <FeatureDeepDive
              index={0}
              icon="fa-users-gear"
              kicker="Campaign Setup"
              headline="Create, Invite, Play"
              screenshot="Campaign dashboard showing party roster with linked character sheets, invite link, and real-time WebSocket connection status"
              screenshotDesktopSrc="/images/marketing-screenshots/campaigns--campaign-creation-party-desktop.png"
              screenshotMobileSrc="/images/marketing-screenshots/campaigns--campaign-creation-party-mobile.png"
            >
              <p className="font-body text-base text-parchment-400 leading-relaxed max-w-xl">
                Create a campaign, get a shareable invite link, and send it to
                your players. When they join, their characters link
                automatically — no manual roster management, no copy-pasting
                character IDs.
              </p>
              <p className="font-body text-base text-parchment-300 leading-relaxed max-w-xl">
                The party overview dashboard gives you read access to every
                player&rsquo;s character sheet. See their loadout, their domain
                cards, their current HP — all from your GM view. Real-time
                WebSocket connections keep everything synchronized from the
                moment they join.
              </p>

              {/* Cross-link */}
              <div className="mt-6">
                <Link
                  href="/features/new-players"
                  className="inline-flex items-center gap-2 text-sm font-semibold text-gold-400 hover:text-gold-300 transition-colors group focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-400 rounded"
                >
                  Onboard new players with the guided builder
                  <i
                    className="fa-solid fa-arrow-right text-xs transition-transform duration-200 group-hover:translate-x-1"
                    aria-hidden="true"
                  />
                </Link>
              </div>
            </FeatureDeepDive>
          </div>
        </section>

        {/* Slate structural divider */}
        <div
          className="h-px bg-gradient-to-r from-transparent via-slate-700/30 to-transparent"
          aria-hidden="true"
        />

        {/* ═══════════════════════════════════════════════════════════════════
            SECTION 4 — Deep-Dive: Encounter Designer Console (DENSE)
        ═══════════════════════════════════════════════════════════════════ */}
        <section className="bg-slate-900 py-16 sm:py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <FeatureDeepDive
              index={1}
              icon="fa-dragon"
              kicker="Encounter Design"
              headline="Encounters That Build Themselves"
              screenshot="Encounter designer console showing adversary catalog sidebar with type/tier/difficulty filters, staged adversaries with inline stat blocks, and environment features panel"
              screenshotDesktopSrc="/images/marketing-screenshots/campaigns--encounter-designer-desktop.png"
              screenshotMobileSrc="/images/marketing-screenshots/campaigns--encounter-designer-mobile.png"
            >
              <p className="font-body text-base text-parchment-400 leading-relaxed max-w-xl">
                The full SRD adversary catalog — every creature, filterable by
                type, tier, and difficulty — with inline stat blocks rendered
                directly in the encounter designer. No switching tabs. No
                cross-referencing PDFs. Pull adversaries into your encounter,
                set quantities, and stage your fight.
              </p>
              <p className="font-body text-base text-parchment-300 leading-relaxed max-w-xl">
                Then layer in the environment system: activatable environmental
                features that cost Fear, add battlefield conditions, and require
                player interaction. The environment isn&rsquo;t set dressing —
                it&rsquo;s a mechanical participant in the encounter.
              </p>
              <p className="font-body text-base text-parchment-300 leading-relaxed max-w-xl">
                When session time arrives, the encounter you designed becomes
                your live combat tracker. Per-adversary HP tracking, condition
                management, and threshold monitoring — all on the same screen
                you used to build it. The prep-to-play pipeline has zero
                handoff.
              </p>

              <TechSpecList
                className="mt-6"
                specs={[
                  { label: "Adversary catalog", value: "Full SRD" },
                  { label: "Filter dimensions", value: "Type · Tier · Difficulty" },
                  { label: "Stat blocks", value: "Inline rendered" },
                  { label: "Environments", value: "Activatable features" },
                  { label: "Live tracking", value: "HP · Conditions · Thresholds" },
                  { label: "Mode", value: "Build → Run (same screen)" },
                ]}
              />
            </FeatureDeepDive>
          </div>
        </section>

        {/* Slate structural divider */}
        <div
          className="h-px bg-gradient-to-r from-transparent via-slate-700/30 to-transparent"
          aria-hidden="true"
        />

        {/* ═══════════════════════════════════════════════════════════════════
            SECTION 5 — Deep-Dive: Session Logging & Scheduling
        ═══════════════════════════════════════════════════════════════════ */}
        <section className="bg-slate-950 py-16 sm:py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <FeatureDeepDive
              index={2}
              icon="fa-book-open"
              kicker="Session Tools"
              headline="Your Campaign&rsquo;s Memory"
              screenshot="Session log interface showing structured entries for lore reveals, NPC introductions, player decisions, and unresolved threads — with full-text search"
              screenshotDesktopSrc="/images/marketing-screenshots/campaigns--session-logging-desktop.png"
              screenshotMobileSrc="/images/marketing-screenshots/campaigns--session-logging-mobile.png"
            >
              <p className="font-body text-base text-parchment-400 leading-relaxed max-w-xl">
                Session logs capture everything that matters: lore reveals,
                player decisions, NPC introductions, and unresolved threads.
                Every entry is searchable, so &ldquo;what happened with that
                NPC three sessions ago?&rdquo; is a question you can actually
                answer in seconds.
              </p>
              <p className="font-body text-base text-parchment-300 leading-relaxed max-w-xl">
                Scheduling lives in the same place. Set session dates with
                player availability coordination, so the group stays
                coordinated without leaving the app. No more &ldquo;when
                works for everyone?&rdquo; threads in Discord that spiral
                into fifty messages.
              </p>
            </FeatureDeepDive>
          </div>
        </section>

        {/* Slate structural divider */}
        <div
          className="h-px bg-gradient-to-r from-transparent via-slate-700/30 to-transparent"
          aria-hidden="true"
        />

        {/* ═══════════════════════════════════════════════════════════════════
            SECTION 6 — Deep-Dive: GM Command HUD (DENSE)
        ═══════════════════════════════════════════════════════════════════ */}
        <section className="bg-slate-900 py-16 sm:py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <FeatureDeepDive
              index={3}
              icon="fa-gauge-high"
              kicker="Live Session"
              headline="The Helm"
              screenshot="GM Command HUD showing party vitals dashboard with HP%, Stress, armor, Hope, and conditions per player — color-coded by danger state with ping and roll request controls"
              screenshotDesktopSrc="/images/marketing-screenshots/campaigns--gm-command-hud-desktop.png"
              screenshotMobileSrc="/images/marketing-screenshots/campaigns--gm-command-hud-mobile.png"
            >
              <p className="font-body text-base text-parchment-400 leading-relaxed max-w-xl">
                The Command HUD is your real-time party dashboard. HP
                percentage, Stress levels, armor slot status, Hope count, and
                active conditions for every player at the table — color-coded
                by danger state (healthy → wounded → critical → down) and sorted
                by who needs attention most.
              </p>
              <p className="font-body text-base text-parchment-300 leading-relaxed max-w-xl">
                Tap any element on a player&rsquo;s sheet to ping it — their
                screen scrolls directly to it with a gold highlight animation.
                Send roll requests that pre-populate the player&rsquo;s dice
                panel with the correct dice pool. Trigger forced critical rolls
                for those dramatic story moments where the dice need to
                cooperate. See every dice roll from every player in real time.
              </p>

              <TechSpecList
                className="mt-6"
                specs={[
                  { label: "Party vitals", value: "HP% · Stress · Armor · Hope · Conditions" },
                  { label: "Danger states", value: "Healthy → Wounded → Critical → Down" },
                  { label: "Ping system", value: "Tap → Scroll + gold pulse" },
                  { label: "Roll requests", value: "Pre-populated dice pool" },
                  { label: "Forced crits", value: "Dramatic moment trigger" },
                  { label: "Dice broadcast", value: "All rolls, real-time" },
                ]}
              />

              {/* Cross-link to streaming */}
              <div className="mt-6">
                <Link
                  href="/features/streaming"
                  className="inline-flex items-center gap-2 text-sm font-semibold text-gold-400 hover:text-gold-300 transition-colors group focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-400 rounded"
                >
                  See the streaming tools built on top of this
                  <i
                    className="fa-solid fa-arrow-right text-xs transition-transform duration-200 group-hover:translate-x-1"
                    aria-hidden="true"
                  />
                </Link>
              </div>
            </FeatureDeepDive>
          </div>
        </section>

        {/* Slate structural divider */}
        <div
          className="h-px bg-gradient-to-r from-transparent via-slate-700/30 to-transparent"
          aria-hidden="true"
        />

        {/* ═══════════════════════════════════════════════════════════════════
            SECTION 7 — Deep-Dive: Real-Time WebSocket Features
        ═══════════════════════════════════════════════════════════════════ */}
        <section className="bg-slate-950 py-16 sm:py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <FeatureDeepDive
              index={4}
              icon="fa-bolt"
              kicker="Real-Time Infrastructure"
              headline="Every Table, Connected in Real Time"
              screenshot="Diagram showing WebSocket connections between GM and players — dice broadcasts, pings, roll requests, and stat updates flowing in real time"
              screenshotDesktopSrc="/images/marketing-screenshots/campaigns--realtime-websocket-desktop.png"
              screenshotMobileSrc="/images/marketing-screenshots/campaigns--realtime-websocket-mobile.png"
            >
              <p className="font-body text-base text-parchment-400 leading-relaxed max-w-xl">
                Every player and the GM share a live WebSocket connection. Dice
                rolls broadcast to everyone in the campaign. GM pings scroll
                directly to specific sheet elements on a player&rsquo;s screen.
                Roll requests stage into the player&rsquo;s dice panel
                automatically. No one is ever out of sync.
              </p>
              <p className="font-body text-base text-parchment-300 leading-relaxed max-w-xl">
                This is the invisible infrastructure that makes everything else
                feel seamless. When the GM sends &ldquo;roll Agility,&rdquo;
                the player sees it in their dice panel, pre-loaded with the
                correct dice pool. When someone rolls a critical hit, the
                entire table sees it at the same moment. When a
                player&rsquo;s HP changes, the Command HUD updates instantly.
              </p>

              {/* Real-time badge — steel-blue accent for technical element */}
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="bg-steel-400/10 text-steel-300 border border-steel-400/20 rounded-full px-3 py-0.5 text-xs font-sans">
                  WebSocket-synced
                </span>
                <span className="bg-steel-400/10 text-steel-300 border border-steel-400/20 rounded-full px-3 py-0.5 text-xs font-sans">
                  Sub-second latency
                </span>
                <span className="bg-steel-400/10 text-steel-300 border border-steel-400/20 rounded-full px-3 py-0.5 text-xs font-sans">
                  Campaign-wide broadcast
                </span>
              </div>
            </FeatureDeepDive>
          </div>
        </section>

        {/* Slate structural divider */}
        <div
          className="h-px bg-gradient-to-r from-transparent via-slate-700/30 to-transparent"
          aria-hidden="true"
        />

        {/* ═══════════════════════════════════════════════════════════════════
            SECTION 8 — Deep-Dive: Homebrew Workshop (CORAL accent)
        ═══════════════════════════════════════════════════════════════════ */}
        <section className="bg-slate-900 py-16 sm:py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            {/* Custom deep-dive with coral accent instead of using FeatureDeepDive */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
              {/* Text column — index 5 is odd, so text on right in desktop */}
              <div className="order-2 lg:order-2">
                <RevealSection>
                  {/* Icon badge — coral treatment */}
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-coral-400/15 to-slate-900 border border-coral-400/20">
                    <i
                      className="fa-solid fa-hammer text-coral-400 text-lg"
                      aria-hidden="true"
                    />
                  </div>
                  {/* Kicker — coral */}
                  <div className="flex items-center gap-3 mb-2">
                    <p className="text-xs font-sans font-semibold uppercase tracking-[0.2em] text-coral-400">
                      Homebrew Workshop
                    </p>
                    <span className="bg-coral-400/10 text-coral-400 border border-coral-400/20 rounded-full px-3 py-0.5 text-xs font-sans">
                      GM Only
                    </span>
                  </div>
                  {/* Headline */}
                  <h3 className="font-serif text-2xl sm:text-3xl font-bold text-parchment-50 mb-4 leading-[1.15]">
                    Forge Your Own World
                  </h3>
                  {/* Body */}
                  <div className="space-y-4">
                    <p className="font-body text-base text-parchment-400 leading-relaxed max-w-xl">
                      Structured creation forms for every content type: custom
                      classes, subclasses, domains, weapons, armor, loot tables,
                      ancestries, and communities. Live markdown preview shows
                      exactly what your content will look like before you
                      publish it.
                    </p>
                    <p className="font-body text-base text-parchment-300 leading-relaxed max-w-xl">
                      Source badges distinguish SRD content from homebrew — so
                      your players always know what&rsquo;s official and
                      what&rsquo;s custom. Your homebrew creations appear
                      alongside SRD content in the character builder,
                      validated against the SRD structure so everything plays
                      nicely together. Creative freedom with guardrails.
                    </p>

                    <TechSpecList
                      className="mt-6"
                      specs={[
                        { label: "Content types", value: "Classes · Domains · Weapons · Armor · Loot · Ancestries · Communities" },
                        { label: "Preview", value: "Live markdown" },
                        { label: "Source badges", value: "SRD vs. Homebrew" },
                        { label: "Validation", value: "Against SRD structure" },
                      ]}
                    />
                  </div>
                </RevealSection>
              </div>

              {/* Image column */}
              <div className="order-1 lg:order-1">
                <RevealSection delay={200}>
                  <ScreenshotContainer
                    alt="Homebrew workshop showing a custom class creation form with live markdown preview and source badge system"
                    desktopSrc="/images/marketing-screenshots/campaigns--homebrew-workshop-desktop.png"
                    mobileSrc="/images/marketing-screenshots/campaigns--homebrew-workshop-mobile.png"
                  />
                </RevealSection>
              </div>
            </div>
          </div>
        </section>

        {/* Gold ornamental divider */}
        <div
          className="h-px bg-gradient-to-r from-transparent via-gold-400/20 to-transparent"
          aria-hidden="true"
        />

        {/* ═══════════════════════════════════════════════════════════════════
            SECTION 9 — Bottom CTA
        ═══════════════════════════════════════════════════════════════════ */}
        <div id="bottom-cta">
          <CTABlock
            headline={
              <>
                Run Your Table{" "}
                <span className="bg-gradient-to-r from-gold-400 to-gold-500 bg-clip-text text-transparent">
                  Like a Pro
                </span>
              </>
            }
            subtitle="$5/month. Cancel anytime. Your players join free."
            primaryCta="Start Your Campaign"
            primaryHref="/auth/register"
            secondaryCta="View Pricing"
            secondaryHref="/pricing"
            alt="Fantasy painting: A GM's table bathed in warm candlelight, maps and miniatures arrayed for battle"
          />
        </div>
      </main>

      <MarketingFooter />

      {/* Mobile sticky CTA */}
      <MobileStickyCtaBar
        heroCtaId="hero-cta"
        bottomCtaId="bottom-cta"
        ctaText="Start Your Campaign"
        ctaHref="/auth/register"
      />
    </div>
  );
}
