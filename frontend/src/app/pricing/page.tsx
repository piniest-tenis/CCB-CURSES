"use client";

/**
 * src/app/pricing/page.tsx
 *
 * Full pricing page — the decision page. Transparent, generous, no-nonsense.
 *
 * Sections:
 *   1. Hero (FantasyBgSection, heaviest overlay, NO CTA)
 *   2. Pricing Cards (expanded Player 14 + GM 20+ features)
 *   3. "What $5 Replaces" value block
 *   4. Feature Comparison Table (Player vs GM, category sub-headers)
 *   5. FAQ Accordion (7 questions)
 *   6. Competitor Comparison Table
 *   7. Bottom CTA
 */

import React from "react";
import Link from "next/link";
import { MarketingNav } from "@/components/marketing/MarketingNav";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { FantasyBgSection } from "@/components/marketing/FantasyBgSection";
import { RevealSection } from "@/components/marketing/RevealSection";
import { PricingCard } from "@/components/marketing/PricingCard";
import { ComparisonTable } from "@/components/marketing/ComparisonTable";
import { FAQAccordion } from "@/components/marketing/FAQAccordion";
import { CTABlock } from "@/components/marketing/CTABlock";

/* ─── Data ─────────────────────────────────────────────────────────────────── */

const PLAYER_FEATURES = [
  "Full character creation and editing",
  "Guided step-by-step builder with SRD descriptions",
  "All SRD classes, subclasses, domains, ancestries, and communities",
  "Mixed ancestry support",
  "Domain card loadout management with inline descriptions",
  "Weapon, armor, and equipment management",
  "Dice roller with custom colors and 3D animations",
  "Companion management",
  "Downtime project tracking",
  "Leveling and advancement",
  "Complete SRD rules reference with full-text search",
  "Join unlimited campaigns",
  "Public share URL for your character sheet",
  "Receive GM pings and roll requests during play",
];

const GM_FEATURES = [
  "Everything in the Player tier, plus:",
  "Create and manage unlimited campaigns with invite links",
  "Party overview dashboard with player sheet access",
  "Encounter designer with full adversary catalog (filterable by type, tier, difficulty)",
  "Environment systems with activatable features",
  "HP, condition, and threshold tracking per adversary",
  "Session logging with structured notes",
  "Session scheduling with availability coordination",
  "GM Command HUD with real-time party vitals",
  "Ping system — highlight any element on player sheets remotely",
  "Roll request system — pre-populate player dice rollers",
  "Forced critical rolls for dramatic moments",
  "Real-time WebSocket dice broadcasts",
  "Twitch character card overlay (380×220px, transparent bg, live-updating)",
  "OBS dice log overlay with 3D animations",
  "OBS browser source URLs for character sheets",
  "Homebrew workshop (custom classes, domains, weapons, armor, loot, ancestries, communities)",
  "Live markdown preview for homebrew content",
  "Source badge system (SRD vs. homebrew)",
  "Priority access to new features",
];

const REPLACES_ITEMS = [
  {
    icon: "fa-solid fa-swords",
    fallbackIcon: "fa-solid fa-crosshairs",
    label: "Encounter builder subscription",
  },
  {
    icon: "fa-solid fa-scroll",
    fallbackIcon: "fa-solid fa-clipboard-list",
    label: "Session tracker tool",
  },
  {
    icon: "fa-solid fa-signal-stream",
    fallbackIcon: "fa-solid fa-tower-broadcast",
    label: "Streaming overlay service",
  },
  {
    icon: "fa-solid fa-cauldron",
    fallbackIcon: "fa-solid fa-flask",
    label: "Homebrew hosting platform",
  },
  {
    icon: "fa-solid fa-users-gear",
    fallbackIcon: "fa-solid fa-users",
    label: "Campaign management app",
  },
];

/** Feature comparison: Player vs GM with category groupings */
interface FeatureRow {
  feature: string;
  player: string | boolean;
  gm: string | boolean;
  isCategory?: boolean;
}

const FEATURE_COMPARISON: FeatureRow[] = [
  // Character Building
  { feature: "Character Building", player: true, gm: true, isCategory: true },
  { feature: "Full character creation and editing", player: true, gm: true },
  { feature: "Guided step-by-step builder with SRD descriptions", player: true, gm: true },
  { feature: "All SRD classes, subclasses, domains, ancestries, and communities", player: true, gm: true },
  { feature: "Mixed ancestry support", player: true, gm: true },
  { feature: "Domain card loadout with inline descriptions", player: true, gm: true },
  { feature: "Weapon, armor, and equipment management", player: true, gm: true },
  { feature: "Dice roller with custom colors and 3D animations", player: true, gm: true },
  { feature: "Companion management", player: true, gm: true },
  { feature: "Downtime project tracking", player: true, gm: true },
  { feature: "Leveling and advancement", player: true, gm: true },
  { feature: "Complete SRD reference with full-text search", player: true, gm: true },
  { feature: "Public share URL for character sheet", player: true, gm: true },

  // Campaign Management
  { feature: "Campaign Management", player: true, gm: true, isCategory: true },
  { feature: "Join unlimited campaigns", player: true, gm: true },
  { feature: "Create and manage campaigns with invite links", player: false, gm: true },
  { feature: "Party overview dashboard with sheet access", player: false, gm: true },

  // Streaming & Overlays
  { feature: "Streaming & Overlays", player: true, gm: true, isCategory: true },
  { feature: "Twitch character card overlay (380×220px)", player: false, gm: true },
  { feature: "OBS dice log overlay with 3D animations", player: false, gm: true },
  { feature: "OBS browser source URLs for character sheets", player: false, gm: true },

  // Session Tools
  { feature: "Session Tools", player: true, gm: true, isCategory: true },
  { feature: "Encounter designer with full adversary catalog", player: false, gm: true },
  { feature: "Environment systems with activatable features", player: false, gm: true },
  { feature: "HP, condition, and threshold tracking per adversary", player: false, gm: true },
  { feature: "Session logging with structured notes", player: false, gm: true },
  { feature: "Session scheduling with availability coordination", player: false, gm: true },

  // Homebrew
  { feature: "Homebrew", player: true, gm: true, isCategory: true },
  { feature: "Homebrew workshop (classes, domains, weapons, armor, loot, ancestries, communities)", player: false, gm: true },
  { feature: "Live markdown preview for homebrew content", player: false, gm: true },
  { feature: "Source badge system (SRD vs. homebrew)", player: true, gm: true },

  // Real-Time Features
  { feature: "Real-Time Features", player: true, gm: true, isCategory: true },
  { feature: "Receive GM pings and roll requests", player: true, gm: true },
  { feature: "GM Command HUD with real-time party vitals", player: false, gm: true },
  { feature: "Ping system — highlight any element on player sheets", player: false, gm: true },
  { feature: "Roll request system — pre-populate player dice rollers", player: false, gm: true },
  { feature: "Forced critical rolls for dramatic moments", player: false, gm: true },
  { feature: "Real-time WebSocket dice broadcasts", player: false, gm: true },
];

const COMPETITOR_COLUMNS = [
  { label: "Curses! Free", highlighted: false },
  { label: "Curses! GM ($5/month)", highlighted: true },
  { label: "Demiplane", highlighted: false },
  { label: "Alchemy VTT", highlighted: false },
  { label: "DIY", highlighted: false },
];

const COMPETITOR_ROWS = [
  {
    feature: "Character builder",
    values: [true, true, true, false, false],
  },
  {
    feature: "Campaign management",
    values: [false, true, false, false, "Spreadsheets"],
  },
  {
    feature: "Encounter designer",
    values: [false, true, false, false, "Spreadsheets"],
  },
  {
    feature: "Streaming overlays",
    values: [false, true, false, false, false],
  },
  {
    feature: "Real-time sync",
    values: [true, true, false, true, false],
  },
  {
    feature: "Homebrew tools",
    values: [false, true, false, false, "Manual"],
  },
  {
    feature: "Session management",
    values: [false, true, false, false, "Discord"],
  },
  {
    feature: "Full SRD reference",
    values: [true, true, "Paywalled", false, "PDFs"],
  },
  {
    feature: "Price",
    values: ["Free", "$5/month", "Free+", "$10/month", "Free"],
  },
];

const FAQ_ITEMS = [
  {
    question: "Is the free tier actually free?",
    answer:
      "Yes. No trial period. No credit card required. No feature gates that make the free tier feel like a demo. The Player tier is the full character builder with every SRD resource, campaign participation, dice roller, and more — free forever.",
  },
  {
    question: "Can I cancel anytime?",
    answer:
      "Yes. No contracts, no cancellation fees, no hoops to jump through. Cancel whenever you want. Your characters, campaign data, and everything you've built remain accessible.",
  },
  {
    question: "What happens to my campaigns if I downgrade?",
    answer:
      "Your campaigns remain viewable and your data is preserved. Players can still access their characters. You can re-subscribe to resume full GM features at any time — nothing is ever deleted.",
  },
  {
    question: "Do my players need to pay?",
    answer:
      "No. Players are always free. Only the GM needs a subscription to create and manage campaigns, run encounters, and use the streaming tools. Everyone else in the group plays for free.",
  },
  {
    question: "Is there a group or team discount?",
    answer:
      "Not currently — and here's why: at $5/month, only one person per group (the GM) pays. The effective cost per player at your table is $0. It's hard to discount lower than that.",
  },
  {
    question: "Will there be an annual plan?",
    answer:
      "Not at this time. We'd rather earn your subscription every month than lock you into an annual commitment. $5/month, cancel anytime — we believe in making it easy to stay and easy to leave.",
  },
  {
    question: "What payment methods do you accept?",
    answer:
      "We accept all major credit and debit cards through Stripe. Additional payment methods may be added based on demand.",
  },
];

/* ─── Components ───────────────────────────────────────────────────────────── */

/** "What $5 Replaces" — a single replaced-tool row */
function ReplacesItem({
  icon,
  label,
  index,
}: {
  icon: string;
  label: string;
  index: number;
}) {
  return (
    <RevealSection delay={index * 80}>
      <div className="flex items-center gap-4 rounded-xl border border-slate-700/30 bg-slate-900/40 px-5 py-4 transition-all duration-200 hover:border-gold-400/20 hover:bg-slate-900/60">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-burgundy-900/60 to-slate-900 border border-burgundy-800/30">
          <i className={`${icon} text-gold-400 text-sm`} aria-hidden="true" />
        </div>
        <span className="font-body text-sm text-parchment-300 leading-relaxed">
          {label}
        </span>
        <span className="ml-auto shrink-0 rounded-full bg-gold-400/10 border border-gold-400/20 px-3 py-0.5 text-xs font-sans font-semibold text-gold-400">
          Included
        </span>
      </div>
    </RevealSection>
  );
}

/** Feature comparison table with category sub-headers — desktop */
function FeatureComparisonDesktop() {
  return (
    <div className="hidden md:block overflow-x-auto rounded-2xl border border-slate-700/40 bg-slate-900/40 shadow-card">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-700/40 bg-slate-900/80">
            <th className="px-6 py-4 text-left font-sans text-xs font-semibold uppercase tracking-wider text-parchment-400">
              Feature
            </th>
            <th className="px-6 py-4 text-center font-serif-sc text-lg font-normal tracking-[0.12em] text-parchment-300">
              Player
              <span className="block text-xs font-sans font-semibold text-parchment-500 tracking-wider mt-0.5">
                Free
              </span>
            </th>
            <th className="px-6 py-4 text-center font-serif-sc text-lg font-normal tracking-[0.12em] text-gold-400 bg-gold-400/[0.03]">
              Game Master
              <span className="block text-xs font-sans font-semibold text-gold-400/70 tracking-wider mt-0.5">
                $5/month
              </span>
            </th>
          </tr>
        </thead>
        <tbody>
          {FEATURE_COMPARISON.map((row, i) =>
            row.isCategory ? (
              <tr key={`cat-${i}`}>
                <td
                  colSpan={3}
                  className="px-6 pt-6 pb-2 text-xs font-sans font-semibold uppercase tracking-[0.15em] text-gold-400/70 border-b border-gold-400/10"
                >
                  {row.feature}
                </td>
              </tr>
            ) : (
              <tr
                key={`row-${i}`}
                className="border-b border-slate-800/30 hover:bg-slate-850/50 transition-colors duration-150"
              >
                <td className="px-6 py-4 font-body text-sm text-parchment-300 leading-relaxed">
                  {row.feature}
                </td>
                <td className="px-6 py-3 text-center">
                  <CellCheck value={row.player} />
                </td>
                <td className="px-6 py-3 text-center bg-gold-400/[0.03]">
                  <CellCheck value={row.gm} />
                </td>
              </tr>
            ),
          )}
        </tbody>
      </table>
    </div>
  );
}

/** Feature comparison table — mobile stacked cards */
function FeatureComparisonMobile() {
  // Filter out category rows for mobile display
  const categories: { name: string; features: FeatureRow[] }[] = [];
  let currentCat: { name: string; features: FeatureRow[] } | null = null;

  for (const row of FEATURE_COMPARISON) {
    if (row.isCategory) {
      if (currentCat) categories.push(currentCat);
      currentCat = { name: row.feature, features: [] };
    } else if (currentCat) {
      currentCat.features.push(row);
    }
  }
  if (currentCat) categories.push(currentCat);

  return (
    <div className="md:hidden space-y-6">
      {categories.map((cat) => (
        <div key={cat.name}>
          <h4 className="text-xs font-sans font-semibold uppercase tracking-[0.15em] text-gold-400/70 mb-3 px-1">
            {cat.name}
          </h4>
          <div className="space-y-3">
            {cat.features.map((row, fi) => (
              <div
                key={fi}
                className="rounded-xl border border-slate-700/40 bg-slate-900/60 p-4"
              >
                <p className="font-body text-sm text-parchment-300 font-medium mb-2">
                  {row.feature}
                </p>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5 text-xs">
                    <span className="text-parchment-500">Player:</span>
                    <CellCheck value={row.player} />
                  </div>
                  <div className="flex items-center gap-1.5 text-xs">
                    <span className="text-gold-400/70 font-semibold">GM:</span>
                    <CellCheck value={row.gm} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/** Check / X cell value */
function CellCheck({ value }: { value: string | boolean }) {
  if (typeof value === "boolean") {
    return value ? (
      <i
        className="fa-solid fa-check text-gold-400 text-sm"
        aria-label="Included"
      />
    ) : (
      <span className="text-slate-600" aria-label="Not included">
        —
      </span>
    );
  }
  return <span className="text-parchment-400 text-sm">{value}</span>;
}

/* ─── Page ─────────────────────────────────────────────────────────────────── */

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      <MarketingNav activePage="pricing" />

      <main id="main-content" className="flex-1">
        {/* ═══════════════════════════════════════════════════════════════════
            SECTION 1 — Hero
        ═══════════════════════════════════════════════════════════════════ */}
        <FantasyBgSection
          alt="Fantasy painting: A vast enchanted marketplace under twilight skies"
          className="min-h-[60vh] sm:min-h-[50vh] pt-32 pb-16 sm:pt-40 sm:pb-20 flex items-center"
          overlayClassName="bg-gradient-to-b from-slate-950/80 via-slate-950/90 to-slate-950"
          atmosphereStyle={{
            background:
              "radial-gradient(circle at 50% 40%, rgba(251,191,36,0.10) 0%, rgba(74,10,20,0.06) 50%, transparent 70%)",
          }}
        >
          <div className="relative z-10 mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
            <RevealSection>
              <p className="font-serif-sc text-xs sm:text-sm font-normal leading-normal tracking-[0.2em] text-gold-400 mb-4">
                Pricing
              </p>
            </RevealSection>

            <RevealSection delay={100}>
              <h1 className="font-display text-4xl sm:text-5xl md:text-6xl font-normal leading-[1.05] tracking-wide text-parchment-50">
                Simple, Honest Pricing
              </h1>
            </RevealSection>

            <RevealSection delay={200}>
              <p className="mx-auto max-w-xl text-lg sm:text-xl text-parchment-400 leading-relaxed mt-6 font-body">
                Players never pay. GMs get everything for less than a cup of
                coffee.
              </p>
            </RevealSection>
          </div>
        </FantasyBgSection>

        {/* Gold ornamental divider */}
        <div
          className="h-px bg-gradient-to-r from-transparent via-gold-400/20 to-transparent"
          aria-hidden="true"
        />

        {/* ═══════════════════════════════════════════════════════════════════
            SECTION 2 — Pricing Cards
        ═══════════════════════════════════════════════════════════════════ */}
        <section className="bg-slate-950 py-20 sm:py-28" aria-labelledby="pricing-cards-heading">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
            <RevealSection>
              <h2
                id="pricing-cards-heading"
                className="sr-only"
              >
                Pricing tiers
              </h2>
            </RevealSection>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-10">
              <PricingCard
                title="Player"
                price="Free"
                features={PLAYER_FEATURES}
                cta="Get Started Free"
                ctaHref="/auth/register"
                index={0}
              />
              <PricingCard
                title="Game Master"
                price="$5"
                period="/month"
                features={GM_FEATURES}
                cta="Claim Your Seat"
                ctaHref="/auth/register"
                highlighted
                index={1}
              />
            </div>

            {/* Microcopy beneath cards */}
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-6 text-xs text-parchment-600">
              <p className="flex items-center gap-2">
                <i
                  className="fa-solid fa-shield-check text-gold-400/50"
                  aria-hidden="true"
                />
                No credit card. No trial. Free means free.
              </p>
              <p className="flex items-center gap-2">
                <i
                  className="fa-solid fa-rotate-left text-gold-400/50"
                  aria-hidden="true"
                />
                $5/month. Cancel anytime. Your players join free.
              </p>
            </div>

            {/* Cross-links to feature pages */}
            <div className="mt-12 flex flex-wrap items-center justify-center gap-x-8 gap-y-4">
              <Link
                href="/features/new-players"
                className="inline-flex items-center gap-2 text-sm font-semibold text-gold-400 hover:text-gold-300 transition-colors group focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-400 rounded"
              >
                Guided builder for new players
                <i
                  className="fa-solid fa-arrow-right text-xs transition-transform duration-200 group-hover:translate-x-1"
                  aria-hidden="true"
                />
              </Link>
              <Link
                href="/features/campaigns"
                className="inline-flex items-center gap-2 text-sm font-semibold text-gold-400 hover:text-gold-300 transition-colors group focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-400 rounded"
              >
                Explore campaign tools
                <i
                  className="fa-solid fa-arrow-right text-xs transition-transform duration-200 group-hover:translate-x-1"
                  aria-hidden="true"
                />
              </Link>
              <Link
                href="/features/streaming"
                className="inline-flex items-center gap-2 text-sm font-semibold text-gold-400 hover:text-gold-300 transition-colors group focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-400 rounded"
              >
                See streaming tools
                <i
                  className="fa-solid fa-arrow-right text-xs transition-transform duration-200 group-hover:translate-x-1"
                  aria-hidden="true"
                />
              </Link>
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════════════
            SECTION 3 — "What $5 Replaces"
        ═══════════════════════════════════════════════════════════════════ */}
        <section className="bg-slate-900 py-20 sm:py-28" aria-labelledby="replaces-heading">
          <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
            <RevealSection>
              <div className="text-center mb-12">
                <p className="font-sans text-xs font-semibold uppercase tracking-[0.2em] text-gold-400/80 mb-3">
                  Value
                </p>
                <h2
                  id="replaces-heading"
                  className="font-serif text-2xl sm:text-3xl font-bold text-parchment-50 mb-4 leading-[1.15]"
                >
                  What Five Dollars Replaces
                </h2>
                <p className="mx-auto max-w-lg text-base text-parchment-400 leading-relaxed font-body">
                  Most GMs cobble together a stack of separate tools. The GM
                  tier consolidates all of them into one integrated platform.
                </p>
              </div>
            </RevealSection>

            <div className="space-y-3">
              {REPLACES_ITEMS.map((item, i) => (
                <ReplacesItem
                  key={i}
                  icon={item.fallbackIcon}
                  label={item.label}
                  index={i}
                />
              ))}
            </div>

            <RevealSection delay={REPLACES_ITEMS.length * 80 + 100}>
              <p className="mt-10 text-center font-serif text-lg sm:text-xl text-parchment-200 leading-relaxed">
                Five dollars. One platform. Everything you need.
              </p>
            </RevealSection>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════════════
            SECTION 4 — Feature Comparison Table (Player vs GM)
        ═══════════════════════════════════════════════════════════════════ */}
        <section className="bg-slate-950 py-20 sm:py-28" aria-labelledby="comparison-heading">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
            <RevealSection>
              <div className="text-center mb-12">
                <p className="font-sans text-xs font-semibold uppercase tracking-[0.2em] text-gold-400/80 mb-3">
                  Side by Side
                </p>
                <h2
                  id="comparison-heading"
                  className="font-serif text-2xl sm:text-3xl font-bold text-parchment-50 mb-4 leading-[1.15]"
                >
                  Feature Comparison
                </h2>
                <p className="mx-auto max-w-lg text-base text-parchment-400 leading-relaxed font-body">
                  Every feature at a glance. The Player tier is genuinely
                  complete. The GM tier adds the full campaign, streaming, and
                  homebrew layer.
                </p>
              </div>
            </RevealSection>

            <RevealSection delay={100}>
              <FeatureComparisonDesktop />
              <FeatureComparisonMobile />
            </RevealSection>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════════════
            SECTION 5 — FAQ Accordion
        ═══════════════════════════════════════════════════════════════════ */}
        <section className="bg-slate-900 py-20 sm:py-28" aria-labelledby="faq-heading">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
            <RevealSection>
              <div className="text-center mb-12">
                <p className="font-sans text-xs font-semibold uppercase tracking-[0.2em] text-gold-400/80 mb-3">
                  FAQ
                </p>
                <h2
                  id="faq-heading"
                  className="font-serif text-2xl sm:text-3xl font-bold text-parchment-50 mb-4 leading-[1.15]"
                >
                  Questions We Get Asked
                </h2>
              </div>
            </RevealSection>

            <FAQAccordion items={FAQ_ITEMS} />
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════════════
            SECTION 6 — Competitor Comparison Table
        ═══════════════════════════════════════════════════════════════════ */}
        <section className="bg-slate-950 py-20 sm:py-28" aria-labelledby="competitor-heading">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
            <RevealSection>
              <div className="text-center mb-12">
                <p className="font-sans text-xs font-semibold uppercase tracking-[0.2em] text-gold-400/80 mb-3">
                  Landscape
                </p>
                <h2
                  id="competitor-heading"
                  className="font-serif text-2xl sm:text-3xl font-bold text-parchment-50 mb-4 leading-[1.15]"
                >
                  How Curses! Compares
                </h2>
                <p className="mx-auto max-w-lg text-base text-parchment-400 leading-relaxed font-body">
                  A fair, factual look at the Daggerheart tool landscape. No
                  spin — just checkmarks.
                </p>
              </div>
            </RevealSection>

            <ComparisonTable
              columns={COMPETITOR_COLUMNS}
              rows={COMPETITOR_ROWS}
            />
          </div>
        </section>

        {/* Gold ornamental divider */}
        <div
          className="h-px bg-gradient-to-r from-transparent via-gold-400/20 to-transparent"
          aria-hidden="true"
        />

        {/* ═══════════════════════════════════════════════════════════════════
            SECTION 7 — Bottom CTA
        ═══════════════════════════════════════════════════════════════════ */}
        <CTABlock
          headline={
            <>
              Ready to{" "}
              <span className="bg-gradient-to-r from-gold-400 to-gold-500 bg-clip-text text-transparent">
                Play?
              </span>
            </>
          }
          subtitle="Players start free. GMs get the complete toolkit for $5/month. No contracts, no hidden fees, no surprises."
          primaryCta="Get Started Free"
          primaryHref="/auth/register"
          secondaryCta="Back to Home"
          secondaryHref="/"
          alt="Fantasy painting: An epic vista of a vast enchanted realm at golden hour"
        />
      </main>

      <MarketingFooter />
    </div>
  );
}
