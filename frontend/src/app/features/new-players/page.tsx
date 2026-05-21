"use client";

/**
 * src/app/features/new-players/page.tsx
 *
 * New Player Experience — full feature page.
 *
 * Sections:
 *   1. Hero (FantasyBgSection, warmest overlay, breadcrumb, CTA)
 *   2. Emotional Hook — reassurance, zero judgment
 *   3. Step Visualization — 3 macro steps with connectors
 *   4. In-Context Learning / SRD (deep-dive: inline rules, source badges)
 *   5. GM Teaching Tools (2-column: ping system + roll requests)
 *   6. Shareable Pitch Block (screenshotable 4-step card)
 *   7. Social Proof placeholder
 *   8. Bottom CTA
 *
 * Voice: Encouraging warmth. Accessible. Zero TTRPG literacy assumed.
 * ALL Daggerheart terms get inline definitions on first use.
 * Gold accent only — no steel-blue, no coral.
 * Mobile sticky CTA bar enabled.
 */

import React from "react";
import Link from "next/link";
import { MarketingNav } from "@/components/marketing/MarketingNav";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { FantasyBgSection } from "@/components/marketing/FantasyBgSection";
import { RevealSection } from "@/components/marketing/RevealSection";
import { StepVisualization } from "@/components/marketing/StepVisualization";
import { FeatureCard } from "@/components/marketing/FeatureCard";
import { ScreenshotContainer } from "@/components/marketing/ScreenshotContainer";
import { CTABlock } from "@/components/marketing/CTABlock";
import { MobileStickyCtaBar } from "@/components/marketing/MobileStickyCtaBar";

/* ─── Page ─────────────────────────────────────────────────────────────────── */

export default function NewPlayerFeaturesPage() {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      <MarketingNav activePage="features" />

      <main id="main-content" className="flex-1">
        {/* ═══════════════════════════════════════════════════════════════════
            SECTION 1 — Hero
        ═══════════════════════════════════════════════════════════════════ */}
        <FantasyBgSection
          alt="Fantasy painting: A warm hearth in a welcoming tavern, golden light spilling through open doors"
          className="min-h-[60vh] sm:min-h-[50vh] pt-32 pb-16 sm:pt-40 sm:pb-20 flex items-center"
          overlayClassName="bg-gradient-to-b from-slate-950/50 via-slate-950/70 to-slate-950"
          atmosphereStyle={{
            background:
              "radial-gradient(circle at 50% 33%, rgba(251,191,36,0.20) 0%, rgba(170,32,71,0.20) 50%, transparent 70%)",
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
                  New Players
                </li>
              </ol>
            </nav>

            <RevealSection>
              <p className="font-serif-sc text-xs sm:text-sm font-normal leading-normal tracking-[0.2em] text-gold-400 mb-4">
                New to Daggerheart?
              </p>
            </RevealSection>

            <RevealSection delay={100}>
              <h1 className="font-display text-4xl sm:text-5xl md:text-6xl font-normal leading-[1.05] tracking-wide text-parchment-50">
                Your First Character, Ready in Minutes
              </h1>
            </RevealSection>

            <RevealSection delay={200}>
              <p className="mx-auto max-w-xl text-lg sm:text-xl text-parchment-400 leading-relaxed mt-6 font-body">
                Daggerheart is one of the most exciting new tabletop RPGs out
                there. You don&apos;t need to read a rulebook to start playing.
                Curses! walks you through character creation step by step and
                keeps every rule at your fingertips during play.
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
                  <span className="relative">Build Your First Character</span>
                </Link>
                <Link
                  href="/rules"
                  className="inline-flex items-center justify-center rounded-xl border border-parchment-400/30 px-10 py-4 text-lg font-semibold text-parchment-300 hover:border-gold-400/50 hover:text-gold-400 transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-400 w-full sm:w-auto"
                >
                  Browse the Rules
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
            SECTION 2 — Emotional Hook
        ═══════════════════════════════════════════════════════════════════ */}
        <section className="bg-slate-950 py-20 sm:py-28">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
            <RevealSection>
              <p className="font-body text-lg sm:text-xl text-parchment-300 leading-relaxed max-w-2xl mx-auto">
                Tabletop RPGs can feel intimidating from the outside — thick
                rulebooks, unfamiliar vocabulary, the fear of doing something
                wrong. That feeling is completely normal. Daggerheart was
                designed to be approachable, and Curses! was built to make that
                approach effortless. Pick what sounds cool. The app handles
                everything else.
              </p>
            </RevealSection>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════════════
            SECTION 3 — Step Visualization
        ═══════════════════════════════════════════════════════════════════ */}
        <section className="bg-slate-900 py-20 sm:py-28">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
            <RevealSection>
              <div className="text-center mb-12 sm:mb-16">
                <p className="font-serif-sc text-xs sm:text-sm font-normal leading-normal tracking-[0.2em] text-gold-400 mb-4">
                  How It Works
                </p>
                <h2 className="font-serif text-2xl sm:text-3xl font-bold text-parchment-50 leading-[1.15]">
                  From Blank Sheet to Ready to Play
                </h2>
              </div>
            </RevealSection>

            <StepVisualization
              steps={[
                {
                  step: 1,
                  title: "Choose Your Path",
                  icon: "fa-compass",
                  description:
                    "Pick your class — your character's role and fighting style. Choose your ancestry — your character's species and heritage. Each option comes with a plain-language description so you know exactly what you're choosing.",
                },
                {
                  step: 2,
                  title: "Build Your Character",
                  icon: "fa-wand-magic-sparkles",
                  description:
                    "The guided builder walks you through every decision: traits, weapons, armor, and your domain cards — the two magical traditions that shape your abilities. Curses! handles the math and flags anything that doesn't fit.",
                },
                {
                  step: 3,
                  title: "Show Up and Play",
                  icon: "fa-dice-d20",
                  description:
                    "Your character sheet has everything you need. Every rule, every feature, every term is explained right where you need it. Your GM can even highlight things on your screen during play.",
                },
              ]}
            />
          </div>
        </section>

        {/* Slate structural divider */}
        <div
          className="h-px bg-gradient-to-r from-transparent via-slate-700/30 to-transparent"
          aria-hidden="true"
        />

        {/* ═══════════════════════════════════════════════════════════════════
            SECTION 4 — In-Context Learning / SRD Integration
        ═══════════════════════════════════════════════════════════════════ */}
        <section className="bg-slate-950 py-16 sm:py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
              {/* Image column — first on mobile */}
              <div className="order-1 lg:order-2">
                <RevealSection delay={200}>
                  <ScreenshotContainer
                    alt="Character sheet with an expanded domain card description and SRD source badge visible"
                    desktopSrc="/images/marketing-screenshots/new-players--srd-inline-learning-desktop.png"
                    mobileSrc="/images/marketing-screenshots/new-players--srd-inline-learning-mobile.png"
                  />
                </RevealSection>
              </div>

              {/* Text column */}
              <div className="order-2 lg:order-1">
                <RevealSection>
                  {/* Icon badge */}
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-burgundy-900/60 to-slate-900 border border-burgundy-800/30">
                    <i
                      className="fa-solid fa-book-open text-gold-400 text-lg"
                      aria-hidden="true"
                    />
                  </div>
                  {/* Kicker */}
                  <p className="text-xs font-sans font-semibold uppercase tracking-[0.2em] text-gold-400/80 mb-2">
                    Learn as You Go
                  </p>
                  {/* Headline */}
                  <h3 className="font-serif text-2xl sm:text-3xl font-bold text-parchment-50 mb-4 leading-[1.15]">
                    Rules Where You Need Them, When You Need Them
                  </h3>

                  <div className="space-y-4">
                    <p className="font-body text-base text-parchment-300 leading-relaxed max-w-xl">
                      Every feature, trait, and condition on your character
                      sheet includes a collapsible description pulled straight
                      from the Daggerheart SRD — the official rules reference.
                      Tap to expand, read what it does, collapse it and keep
                      playing.
                    </p>

                    <p className="font-body text-base text-parchment-300 leading-relaxed max-w-xl">
                      Your domain cards — the abilities that define how your
                      character interacts with the world — display their full
                      descriptions inline. No flipping through a PDF. No
                      alt-tabbing. Everything is right there on your sheet.
                    </p>

                    <p className="font-body text-base text-parchment-300 leading-relaxed max-w-xl">
                      Source badges on every piece of content tell you
                      what&apos;s official SRD and what&apos;s custom homebrew
                      from your GM — so you never accidentally use something
                      that hasn&apos;t been approved for your game.
                    </p>
                  </div>
                </RevealSection>
              </div>
            </div>
          </div>
        </section>

        {/* Slate structural divider */}
        <div
          className="h-px bg-gradient-to-r from-transparent via-slate-700/30 to-transparent"
          aria-hidden="true"
        />

        {/* ═══════════════════════════════════════════════════════════════════
            SECTION 5 — GM Teaching Tools
        ═══════════════════════════════════════════════════════════════════ */}
        <section className="bg-slate-900 py-16 sm:py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
              {/* Image column — first on mobile */}
              <div className="order-1 lg:order-1">
                <RevealSection delay={200}>
                  <ScreenshotContainer
                    alt="Split view: GM sending a ping to highlight a player's Hope feature, player's screen showing the gold pulse highlight"
                    desktopSrc="/images/marketing-screenshots/new-players--gm-teaching-tools-desktop.png"
                    mobileSrc="/images/marketing-screenshots/new-players--gm-teaching-tools-mobile.png"
                  />
                </RevealSection>
              </div>

              {/* Text column */}
              <div className="order-2 lg:order-2">
                <RevealSection>
                  {/* Icon badge */}
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-burgundy-900/60 to-slate-900 border border-burgundy-800/30">
                    <i
                      className="fa-solid fa-hand-holding-heart text-gold-400 text-lg"
                      aria-hidden="true"
                    />
                  </div>
                  {/* Kicker */}
                  <p className="text-xs font-sans font-semibold uppercase tracking-[0.2em] text-gold-400/80 mb-2">
                    Never Get Lost
                  </p>
                  {/* Headline */}
                  <h3 className="font-serif text-2xl sm:text-3xl font-bold text-parchment-50 mb-4 leading-[1.15]">
                    Your GM Has Your Back (Literally)
                  </h3>

                  <div className="space-y-4">
                    <p className="font-body text-base text-parchment-300 leading-relaxed max-w-xl">
                      When your GM says &ldquo;use your Hope Feature&rdquo; and
                      you&apos;re not sure where that lives on your sheet, they
                      can tap it from their side. Your screen scrolls directly
                      to it with a gold highlight. No searching, no confusion.
                    </p>

                    <p className="font-body text-base text-parchment-300 leading-relaxed max-w-xl">
                      When it&apos;s time to roll dice, your GM can send a roll
                      request that loads the right dice into your dice panel
                      automatically. You tap &ldquo;Roll.&rdquo; That&apos;s it.
                      You don&apos;t need to know which dice to grab or where
                      the button is.
                    </p>

                    <p className="font-body text-base text-parchment-300 leading-relaxed max-w-xl">
                      Between the inline rules, the ping system, and the roll
                      requests, a GM can guide a brand-new player through an
                      entire session without that player ever opening a PDF or
                      feeling lost.
                    </p>

                    <p className="mt-2">
                      <Link
                        href="/features/campaigns"
                        className="group inline-flex items-center gap-1.5 text-sm font-semibold text-gold-400 hover:text-gold-300 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-400 rounded"
                      >
                        See your GM&apos;s full toolkit
                        <i
                          className="fa-solid fa-arrow-right text-xs group-hover:translate-x-1 transition-transform duration-200"
                          aria-hidden="true"
                        />
                      </Link>
                    </p>
                  </div>
                </RevealSection>
              </div>
            </div>
          </div>
        </section>

        {/* Slate structural divider */}
        <div
          className="h-px bg-gradient-to-r from-transparent via-slate-700/30 to-transparent"
          aria-hidden="true"
        />

        {/* ═══════════════════════════════════════════════════════════════════
            SECTION 6 — Shareable Pitch Block
        ═══════════════════════════════════════════════════════════════════ */}
        <section className="bg-slate-950 py-20 sm:py-28">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
            <RevealSection>
              <div className="text-center mb-10 sm:mb-12">
                <p className="font-serif-sc text-xs sm:text-sm font-normal leading-normal tracking-[0.2em] text-gold-400 mb-4">
                  Share This with Your Group
                </p>
                <h2 className="font-serif text-2xl sm:text-3xl font-bold text-parchment-50 leading-[1.15]">
                  Send This to a Friend
                </h2>
              </div>
            </RevealSection>

            <RevealSection delay={100}>
              <div className="mx-auto max-w-lg rounded-2xl border border-gold-400/20 bg-gradient-to-br from-slate-900 to-slate-900/80 p-8 sm:p-10 shadow-glow-gold">
                <p className="font-serif text-lg sm:text-xl font-semibold text-parchment-50 mb-6 text-center leading-snug">
                  Trying Daggerheart for the first time? Here&apos;s what you
                  need:
                </p>

                <ol className="space-y-5 mb-8">
                  {[
                    {
                      num: 1,
                      text: "Click the link your GM sent you",
                    },
                    {
                      num: 2,
                      text: "Create a free account",
                    },
                    {
                      num: 3,
                      text: "Build your character — the app walks you through it",
                    },
                    {
                      num: 4,
                      text: "Show up to the session. The app has everything else.",
                    },
                  ].map((item) => (
                    <li key={item.num} className="flex items-start gap-4">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-gold-400 to-gold-600 text-slate-950 font-display text-sm font-bold">
                        {item.num}
                      </span>
                      <span className="font-body text-base text-parchment-300 leading-relaxed pt-0.5">
                        {item.text}
                      </span>
                    </li>
                  ))}
                </ol>

                <p className="text-center font-serif text-base sm:text-lg font-semibold text-gold-400 leading-snug">
                  No books. No PDFs. No homework.
                </p>
              </div>
            </RevealSection>
          </div>
        </section>

        {/* Slate structural divider */}
        <div
          className="h-px bg-gradient-to-r from-transparent via-slate-700/30 to-transparent"
          aria-hidden="true"
        />

        {/* ═══════════════════════════════════════════════════════════════════
            SECTION 7 — SRD Reference (Feature Cards)
        ═══════════════════════════════════════════════════════════════════ */}
        <section className="bg-slate-900 py-20 sm:py-28">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
            <RevealSection>
              <div className="text-center mb-12 sm:mb-16">
                <p className="font-serif-sc text-xs sm:text-sm font-normal leading-normal tracking-[0.2em] text-gold-400 mb-4">
                  Built-in Reference
                </p>
                <h2 className="font-serif text-2xl sm:text-3xl font-bold text-parchment-50 leading-[1.15]">
                  The Complete Rulebook, Built In
                </h2>
                <p className="mx-auto max-w-xl text-base text-parchment-400 leading-relaxed mt-4 font-body">
                  The entire Daggerheart SRD — every class, every domain card,
                  every rule — is searchable and browsable without ever leaving
                  the app. No PDFs. No alt-tabbing. No &ldquo;hold on, let me
                  look that up.&rdquo;
                </p>
              </div>
            </RevealSection>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              <FeatureCard
                index={0}
                icon="fa-magnifying-glass"
                title="Full-Text Search"
                description="Type any keyword and find it instantly. Rules, classes, domain cards, conditions — everything is indexed and one search away."
              />
              <FeatureCard
                index={1}
                icon="fa-layer-group"
                title="Inline Descriptions"
                description="Every feature on your character sheet expands to show its full SRD description. Tap to learn, tap to collapse — no page-flipping required."
              />
              <FeatureCard
                index={2}
                icon="fa-shield-halved"
                title="Source Badges"
                description="A clear badge on every piece of content tells you if it's official SRD or custom homebrew from your GM. No surprises."
              />
            </div>
          </div>
        </section>

        {/* Slate structural divider */}
        {/* <div
          className="h-px bg-gradient-to-r from-transparent via-slate-700/30 to-transparent"
          aria-hidden="true"
        /> */}

        {/* ═══════════════════════════════════════════════════════════════════
            SECTION 8 — Social Proof (placeholder)
        ═══════════════════════════════════════════════════════════════════ */}
        {/* <section className="bg-slate-950 py-20 sm:py-28">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
            <RevealSection>
              <div className="text-center mb-10 sm:mb-12">
                <h2 className="font-serif text-2xl sm:text-3xl font-bold text-parchment-50 leading-[1.15]">
                  Ready in Minutes
                </h2>
              </div>
            </RevealSection>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <RevealSection delay={0}>
                <div className="rounded-xl border border-slate-700/40 bg-slate-900/60 p-6 sm:p-8">
                  <i
                    className="fa-solid fa-quote-left text-gold-400/20 text-2xl mb-4 block"
                    aria-hidden="true"
                  />
                  <p className="font-body text-base text-parchment-300 leading-relaxed mb-4 italic">
                    &ldquo;I&apos;ve never played a tabletop RPG before. I had
                    my first Daggerheart character ready in eight minutes. The
                    guided builder explained everything I needed to know — I
                    didn&apos;t have to open a single PDF.&rdquo;
                  </p>
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-gold-400/20 to-burgundy-900/30 border border-gold-400/20 text-sm font-bold text-gold-400">
                      A
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-parchment-200">
                        Alex R.
                      </p>
                      <p className="text-xs text-parchment-600">
                        First-Time Player
                      </p>
                    </div>
                  </div>
                </div>
              </RevealSection>

              <RevealSection delay={120}>
                <div className="rounded-xl border border-slate-700/40 bg-slate-900/60 p-6 sm:p-8">
                  <i
                    className="fa-solid fa-quote-left text-gold-400/20 text-2xl mb-4 block"
                    aria-hidden="true"
                  />
                  <p className="font-body text-base text-parchment-300 leading-relaxed mb-4 italic">
                    &ldquo;I sent the link to a friend who had never touched a
                    TTRPG. Ten minutes later, they had a character. During the
                    session, I pinged their features and sent roll requests —
                    they never once looked confused.&rdquo;
                  </p>
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-gold-400/20 to-burgundy-900/30 border border-gold-400/20 text-sm font-bold text-gold-400">
                      M
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-parchment-200">
                        Marcus T.
                      </p>
                      <p className="text-xs text-parchment-600">Forever GM</p>
                    </div>
                  </div>
                </div>
              </RevealSection>
            </div>

            <RevealSection delay={240}>
              <p className="text-center text-sm text-parchment-600 mt-8 font-body">
                First character built in under 10 minutes. Zero rulebooks
                required.
              </p>
            </RevealSection>
          </div>
        </section> */}

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
                Your Adventure{" "}
                <span className="bg-gradient-to-r from-gold-400 to-gold-500 bg-clip-text text-transparent">
                  Starts Now
                </span>
              </>
            }
            subtitle="Free. No credit card. No rulebook needed. Build your first character and be ready to play in minutes."
            primaryCta="Build Your First Character"
            primaryHref="/auth/register"
            secondaryCta="View Pricing"
            secondaryHref="/pricing"
            alt="Fantasy painting: A vast enchanted realm at golden hour, welcoming travelers toward a glowing horizon"
          />
        </div>
      </main>

      <MarketingFooter />

      {/* Mobile sticky CTA */}
      <MobileStickyCtaBar
        heroCtaId="hero-cta"
        bottomCtaId="bottom-cta"
        ctaText="Build Your First Character"
        ctaHref="/auth/register"
      />
    </div>
  );
}
