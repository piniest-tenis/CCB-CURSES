"use client";

/**
 * src/app/features/streaming/page.tsx
 *
 * Streaming & Content Creation — full feature page.
 *
 * Sections:
 *   1. Hero (FantasyBgSection, lightest warm overlay, breadcrumb, CTA)
 *   2. Origin Story — "Built on Wednesday Nights"
 *   3. Deep-Dive: Live Character Cards (Twitch Overlay)
 *   4. Deep-Dive: OBS Dice Log Overlay
 *   5. Deep-Dive: Public Character Sheets & Share URLs
 *   6. Deep-Dive: Command HUD for Streamers (bridge to /features/campaigns)
 *   7. Social Proof placeholder
 *   8. Bottom CTA
 *
 * Voice: Energetic insider. Creator-to-creator. Technical + production-aware.
 * Gold accent emphasis (full opacity text-gold-400).
 * Mobile sticky CTA bar enabled.
 */

import React from "react";
import Link from "next/link";
import { MarketingNav } from "@/components/marketing/MarketingNav";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { FantasyBgSection } from "@/components/marketing/FantasyBgSection";
import { RevealSection } from "@/components/marketing/RevealSection";
import { FeatureDeepDive } from "@/components/marketing/FeatureDeepDive";
import { TechSpecList } from "@/components/marketing/TechSpecList";
import { CTABlock } from "@/components/marketing/CTABlock";
import { MobileStickyCtaBar } from "@/components/marketing/MobileStickyCtaBar";

/* ─── Page ─────────────────────────────────────────────────────────────────── */

export default function StreamingFeaturesPage() {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      <MarketingNav activePage="features" />

      <main id="main-content" className="flex-1">
        {/* ═══════════════════════════════════════════════════════════════════
            SECTION 1 — Hero
        ═══════════════════════════════════════════════════════════════════ */}
        <FantasyBgSection
          alt="Fantasy painting: A stage bathed in golden spotlight, performers silhouetted against a celestial sky"
          className="min-h-[60vh] sm:min-h-[50vh] pt-32 pb-16 sm:pt-40 sm:pb-20 flex items-center"
          overlayClassName="bg-gradient-to-b from-slate-950/60 via-slate-950/75 to-slate-950"
          atmosphereStyle={{
            background:
              "radial-gradient(circle at 50% 33%, rgba(251,191,36,0.25) 0%, rgba(170,32,71,0.10) 50%, transparent 70%)",
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
                  Streaming
                </li>
              </ol>
            </nav>

            <RevealSection>
              <p className="font-serif-sc text-xs sm:text-sm font-normal leading-normal tracking-[0.2em] text-gold-400 mb-4">
                Streaming &amp; Content Creation
              </p>
            </RevealSection>

            <RevealSection delay={100}>
              <h1 className="font-display text-4xl sm:text-5xl md:text-6xl font-normal leading-[1.05] tracking-wide text-parchment-50">
                Built for the Spotlight
              </h1>
            </RevealSection>

            <RevealSection delay={200}>
              <p className="mx-auto max-w-xl text-lg sm:text-xl text-parchment-400 leading-relaxed mt-6 font-body">
                Curses! was built alongside a weekly Daggerheart actual play.
                The streaming tools were forged under the same pressure you
                feel every session.
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
                  <span className="relative">Start Streaming Free</span>
                </Link>
                <a
                  href="https://twitch.tv/maninjumpsuit"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center rounded-xl border border-parchment-400/30 px-10 py-4 text-lg font-semibold text-parchment-300 hover:border-gold-400/50 hover:text-gold-400 transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-400 w-full sm:w-auto"
                >
                  Watch Curses! Live
                  <span className="sr-only"> (opens in new tab)</span>
                </a>
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
            SECTION 2 — Origin Story: "Built on Wednesday Nights"
        ═══════════════════════════════════════════════════════════════════ */}
        <section
          className="bg-slate-950 py-20 sm:py-28"
          aria-labelledby="origin-heading"
        >
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
            <RevealSection>
              <div className="text-center">
                <p className="font-sans text-xs font-semibold uppercase tracking-[0.2em] text-gold-400 mb-3">
                  Origin Story
                </p>
                <h2
                  id="origin-heading"
                  className="font-serif text-2xl sm:text-3xl font-bold text-parchment-50 mb-6 leading-[1.15]"
                >
                  Built on Wednesday Nights
                </h2>
              </div>
            </RevealSection>

            <RevealSection delay={100}>
              <div className="mx-auto max-w-2xl text-center space-y-4">
                <p className="font-body text-base text-parchment-400 leading-relaxed">
                  Every Wednesday at 8:30 PM ET, a cast of indie audio-fiction
                  creators sits down to play Daggerheart live on Twitch. The
                  show is called{" "}
                  <span className="text-gold-400 font-semibold">Curses!</span>,
                  and the tools on this page are the same tools used on that
                  stream. These tools are tested under pressure, in front of an
                  audience, every single week.
                </p>
                <p className="font-body text-base text-parchment-300 leading-relaxed">
                  Every pain point discovered during a live session becomes a
                  feature by the following week. The feedback loop between the
                  stream and the platform is the reason these tools feel
                  different from anything else available for Daggerheart. Since
                  we use our own tools, we know exactly how they perform when it
                  matters most for your game.
                </p>
              </div>
            </RevealSection>

            <RevealSection delay={200}>
              <div className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-xs font-sans uppercase tracking-wider text-parchment-600">
                <span className="flex items-center gap-2">
                  <i
                    className="fa-brands fa-twitch text-gold-400/60"
                    aria-hidden="true"
                  />
                  Wednesdays 8:30 PM ET
                </span>
                <span
                  className="hidden sm:inline text-parchment-600/30"
                  aria-hidden="true"
                >
                  ·
                </span>
                <span>Cast from indie audio-fiction shows</span>
                <span
                  className="hidden sm:inline text-parchment-600/30"
                  aria-hidden="true"
                >
                  ·
                </span>
                <span>Launched 5/6/26</span>
              </div>
            </RevealSection>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════════════
            SECTION 3 — Deep-Dive: Live Character Cards (Twitch Overlay)
        ═══════════════════════════════════════════════════════════════════ */}
        <section className="bg-slate-950 py-16 sm:py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <FeatureDeepDive
              index={0}
              icon="fa-id-card"
              kicker="Twitch Overlay"
              headline="Live Character Cards, Zero Configuration"
              screenshot="Twitch character card overlay showing character name, class, domains, HP, Stress, Hope, and active conditions live on stream"
              screenshotDesktopSrc="/images/marketing-screenshots/streaming--live-character-cards-desktop.png"
              screenshotMobileSrc="/images/marketing-screenshots/streaming--live-character-cards-mobile.png"
              kickerColor="text-gold-400"
            >
              <p className="font-body text-base text-parchment-400 leading-relaxed max-w-xl">
                Your viewers see a compact card on screen showing the
                character&rsquo;s name, class, domains, HP, Stress, Hope, and
                active conditions, all updating in real time as conditions
                change at the table. No manual overlay updates. No spreadsheet
                visible on a webcam. Just live data, rendered cleanly.
              </p>
              <p className="font-body text-base text-parchment-300 leading-relaxed max-w-xl">
                Setup is one step: copy the overlay URL, paste it as an OBS
                browser source, and you&rsquo;re live. The overlay renders at
                380×220px with a transparent background, so it fits cleanly into
                any scene layout. It auto-refreshes over WebSocket every 90
                seconds so your changes appear on stream within moments of
                happening at the table.
              </p>

              <TechSpecList
                className="mt-6"
                specs={[
                  { label: "Overlay size", value: "380×220px" },
                  { label: "Background", value: "Transparent" },
                  { label: "Refresh interval", value: "90 seconds" },
                  { label: "Sync method", value: "WebSocket" },
                  { label: "Setup", value: "1 URL → OBS browser source" },
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
            SECTION 4 — Deep-Dive: OBS Dice Log Overlay
        ═══════════════════════════════════════════════════════════════════ */}
        <section className="bg-slate-900 py-16 sm:py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <FeatureDeepDive
              index={1}
              icon="fa-dice-d20"
              kicker="OBS Integration"
              headline="Every Roll, Rendered and Broadcast"
              screenshot="OBS dice overlay showing 3D dice with goldenrod critical hit glow, transparent background, layered over a stream scene"
              screenshotDesktopSrc="/images/marketing-screenshots/streaming--obs-dice-log-overlay-desktop.png"
              screenshotMobileSrc="/images/marketing-screenshots/streaming--obs-dice-log-overlay-mobile.png"
              kickerColor="text-gold-400"
            >
              <p className="font-body text-base text-parchment-400 leading-relaxed max-w-xl">
                3D rendered dice, synced to your campaign via WebSocket. Every
                roll from every player appears on stream, including features
                like a golden glow on critical hits that your audience will
                love. Automatic fade-out timing means the overlay cleans itself
                up. No manual dismissal, no plugins, no extensions.
              </p>
              <p className="font-body text-base text-parchment-300 leading-relaxed max-w-xl">
                Need a persistent log? A separate dice log overlay shows roll
                history so viewers who tune in late can catch up. Both overlays
                use transparent backgrounds designed to layer over any scene,
                and both are set up the same way, via a simple browser source
                URL in your preferred streaming software.
              </p>

              <TechSpecList
                className="mt-6"
                specs={[
                  { label: "Dice rendering", value: "3D animated" },
                  { label: "Critical hits", value: "Goldenrod glow" },
                  { label: "Sync", value: "WebSocket (campaign-wide)" },
                  { label: "Auto-fade", value: "Yes" },
                  { label: "Persistent log", value: "Separate overlay" },
                  { label: "Setup", value: "Browser source URL" },
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
            SECTION 5 — Deep-Dive: Public Character Sheets & Share URLs
        ═══════════════════════════════════════════════════════════════════ */}
        <section className="bg-slate-950 py-16 sm:py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <FeatureDeepDive
              index={2}
              icon="fa-share-nodes"
              kicker="Audience Engagement"
              headline="Your Build, Their Browser"
              screenshot="Public character sheet view showing stats, domain cards, loadout, and backstory — accessible via share URL with no login required"
              screenshotDesktopSrc="/images/marketing-screenshots/streaming--public-character-sheets-desktop.png"
              screenshotMobileSrc="/images/marketing-screenshots/streaming--public-character-sheets-mobile.png"
              kickerColor="text-gold-400"
            >
              <p className="font-body text-base text-parchment-400 leading-relaxed max-w-xl">
                Every character gets a public share URL protected by expiring
                security tokens. Viewers can explore the full character sheet,
                including stats, loadout, backstory, domain cards at any time,
                without creating an account. No more screenshotting your sheet
                and posting it in Discord.
              </p>
              <p className="font-body text-base text-parchment-300 leading-relaxed max-w-xl">
                This turns every character into a piece of content that lives
                beyond the stream. Share it in your show notes, pin it in your
                community Discord, or let viewers browse during the session.
                It&rsquo;s audience engagement that takes zero extra effort.
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
            SECTION 6 — Deep-Dive: Command HUD for Streamers (bridge)
        ═══════════════════════════════════════════════════════════════════ */}
        <section className="bg-slate-900 py-16 sm:py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <FeatureDeepDive
              index={3}
              icon="fa-satellite-dish"
              kicker="Second Monitor"
              headline="Mission Control for Your Narrative"
              screenshot="GM Command HUD dashboard showing party vitals color-coded by danger state: healthy, wounded, critical, down. All with ping and roll request controls"
              screenshotDesktopSrc="/images/marketing-screenshots/streaming--command-hud-streamers-desktop.png"
              screenshotMobileSrc="/images/marketing-screenshots/streaming--command-hud-streamers-mobile.png"
              kickerColor="text-gold-400"
            >
              <p className="font-body text-base text-parchment-400 leading-relaxed max-w-xl">
                The GM Command HUD is designed to live on your second monitor
                while you narrate. It shows every player&rsquo;s HP, Stress,
                Hope, conditions, and danger state, with each color-coded and
                sorted by who&rsquo;s hurting most. You never have to break
                character to ask &ldquo;wait, how much HP have you
                marked?&rdquo;
              </p>
              <p className="font-body text-base text-parchment-300 leading-relaxed max-w-xl">
                This is the difference between a home game and a production. One
                screen to monitor the entire party while you tell your story.
              </p>

              {/* Cross-link to campaigns page */}
              <div className="mt-6">
                <Link
                  href="/features/campaigns"
                  className="inline-flex items-center gap-2 text-sm font-semibold text-gold-400 hover:text-gold-300 transition-colors group focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-400 rounded"
                >
                  See the full GM toolkit
                  <i
                    className="fa-solid fa-arrow-right text-xs transition-transform duration-200 group-hover:translate-x-1"
                    aria-hidden="true"
                  />
                </Link>
              </div>
            </FeatureDeepDive>
          </div>
        </section>

        {/* Gold ornamental divider */}
        <div
          className="h-px bg-gradient-to-r from-transparent via-gold-400/20 to-transparent"
          aria-hidden="true"
        />

        {/* ═══════════════════════════════════════════════════════════════════
            SECTION 7 — Social Proof (placeholder)
        ═══════════════════════════════════════════════════════════════════ */}
        <section
          className="bg-slate-950 py-20 sm:py-28"
          aria-labelledby="social-proof-heading"
        >
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
            <RevealSection>
              <p className="font-sans text-xs font-semibold uppercase tracking-[0.2em] text-gold-400 mb-3">
                From the Stream
              </p>
              <h2
                id="social-proof-heading"
                className="font-serif text-2xl sm:text-3xl font-bold text-parchment-50 mb-10 leading-[1.15]"
              >
                Tested Live, Every Week
              </h2>
            </RevealSection>

            <RevealSection delay={100}>
              <div className="mx-auto max-w-2xl">
                <div className="rounded-2xl border border-slate-700/30 bg-slate-900/40 p-8 sm:p-10">
                  <blockquote>
                    <p className="font-serif text-lg sm:text-xl text-parchment-200 leading-relaxed italic mb-6">
                      &ldquo;Built alongside a weekly Daggerheart actual play,
                      meaning every feature is tested live, on stream, in front
                      of an audience. What you see here is what we use every
                      Wednesday night.&rdquo;
                    </p>
                    <footer className="flex items-center justify-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-burgundy-900/60 to-slate-900 border border-burgundy-800/30 flex items-center justify-center">
                        <i
                          className="fa-solid fa-user text-gold-400/60 text-xs"
                          aria-hidden="true"
                        />
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-semibold text-parchment-300">
                          The Curses! Team
                        </p>
                        <p className="text-xs text-parchment-600">
                          Wednesdays at 8:30 PM ET on Twitch
                        </p>
                      </div>
                    </footer>
                  </blockquote>
                </div>
              </div>
            </RevealSection>

            {/* <RevealSection delay={200}>
              <div className="mt-10 flex flex-wrap items-center justify-center gap-8">
                <div className="text-center">
                  <p className="font-display text-2xl sm:text-3xl text-gold-400">
                    52+
                  </p>
                  <p className="text-xs font-sans uppercase tracking-wider text-parchment-500 mt-1">
                    Episodes Streamed
                  </p>
                </div>
                <div
                  className="hidden sm:block h-8 w-px bg-gradient-to-b from-transparent via-slate-700/40 to-transparent"
                  aria-hidden="true"
                />
                <div className="text-center">
                  <p className="font-display text-2xl sm:text-3xl text-gold-400">
                    0
                  </p>
                  <p className="text-xs font-sans uppercase tracking-wider text-parchment-500 mt-1">
                    Plugins Required
                  </p>
                </div>
                <div
                  className="hidden sm:block h-8 w-px bg-gradient-to-b from-transparent via-slate-700/40 to-transparent"
                  aria-hidden="true"
                />
                <div className="text-center">
                  <p className="font-display text-2xl sm:text-3xl text-gold-400">
                    90s
                  </p>
                  <p className="text-xs font-sans uppercase tracking-wider text-parchment-500 mt-1">
                    Overlay Refresh
                  </p>
                </div>
              </div>
            </RevealSection> */}
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════════════
            SECTION 8 — Bottom CTA
        ═══════════════════════════════════════════════════════════════════ */}
        <div id="bottom-cta">
          <CTABlock
            headline={
              <>
                Your Audience Deserves a{" "}
                <span className="bg-gradient-to-r from-gold-400 to-gold-500 bg-clip-text text-transparent">
                  Front-Row Seat
                </span>
              </>
            }
            subtitle="Free to try. Streaming overlays unlock with the GM tier at $5/month. Your players join free."
            primaryCta="Start Your Stream Setup"
            primaryHref="/auth/register"
            secondaryCta="View Pricing"
            secondaryHref="/pricing"
            alt="Fantasy painting: A grand stage beneath a constellation-filled sky, golden light streaming through"
          />
        </div>
      </main>

      <MarketingFooter />

      {/* Mobile sticky CTA */}
      <MobileStickyCtaBar
        heroCtaId="hero-cta"
        bottomCtaId="bottom-cta"
        ctaText="Start Streaming Free"
        ctaHref="/auth/register"
      />
    </div>
  );
}
