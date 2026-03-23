"use client";

/**
 * src/app/classes/[classId]/page.tsx
 *
 * Class detail page. Shows full class data including all subclasses,
 * hope feature, class feature, background questions, and class items.
 * No auth required.
 */

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useClass } from "@/hooks/useGameData";
import type { SubclassData, NamedFeature } from "@shared/types";
import { MarkdownContent } from "@/components/MarkdownContent";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const DOMAIN_COLOURS: Record<string, string> = {
  Artistry:  "border-purple-700  bg-purple-950/40  text-purple-300",
  Charm:     "border-pink-700    bg-pink-950/40    text-pink-300",
  Creature:  "border-green-700   bg-green-950/40   text-green-300",
  Faithful:  "border-yellow-700  bg-yellow-950/40  text-yellow-300",
  Oddity:    "border-teal-700    bg-teal-950/40    text-teal-300",
  Study:     "border-blue-700    bg-blue-950/40    text-blue-300",
  Thievery:  "border-orange-700  bg-orange-950/40  text-orange-300",
  Trickery:  "border-lime-700    bg-lime-950/40    text-lime-300",
  Valiance:  "border-red-700     bg-red-950/40     text-red-300",
  Violence:  "border-rose-800    bg-rose-950/40    text-rose-300",
  Weird:     "border-indigo-700  bg-indigo-950/40  text-indigo-300",
};

const DOMAIN_DESCRIPTIONS: Record<string, string> = {
  Artistry:  "Uses performance, craft, and influence to shape how others feel and act.",
  Charm:     "Gets things done through social leverage — flattery, deception, and presence.",
  Creature:  "Leans into raw instinct — keen senses, physical toughness, and predatory cunning.",
  Faithful:  "Draws power from devotion — divine grace, sacred oaths, and the weight of belief.",
  Oddity:    "Reflects bodies and minds that don't work like everyone else's.",
  Study:     "Applies research, invention, and analysis to solve problems.",
  Thievery:  "Covers burglary, pickpocketing, infiltration, and targeted takedowns.",
  Trickery:  "Cons, misdirection, and social sabotage.",
  Valiance:  "Projects courage and moral authority — inspiring allies and standing firm when others break.",
  Violence:  "About fighting dirty, fighting hard, and not stopping.",
  Weird:     "Taps into magic that doesn't follow the rules — conjured weapons, psychic abilities, and spectral forces.",
};

function DomainBadge({ domain }: { domain: string }) {
  const colour = DOMAIN_COLOURS[domain] ?? "border-burgundy-800 bg-burgundy-950/30 text-burgundy-400";
  const description = DOMAIN_DESCRIPTIONS[domain];
  return (
    <Link
      href={`/domains/${encodeURIComponent(domain)}`}
      className={`domain-badge-tip inline-block rounded border px-2.5 py-0.5 text-sm font-medium hover:opacity-80 transition-opacity ${colour}`}
    >
      {domain}
      {description && (
        <span className="domain-tip-popup" aria-hidden="true">
          <span className="block text-xs font-bold uppercase tracking-[0.18em] text-[#577399] mb-1">
            Domain Scope
          </span>
          <span className="block text-sm text-[#b9baa3] leading-relaxed">
            {description}
          </span>
        </span>
      )}
    </Link>
  );
}

// ---------------------------------------------------------------------------
// Feature block
// ---------------------------------------------------------------------------

function FeatureBlock({ name, description }: NamedFeature) {
  return (
    <div className="rounded-lg border border-burgundy-900/60 bg-slate-850/50 px-4 py-3">
      <p className="text-base font-semibold text-parchment-200 mb-1">{name}</p>
      <MarkdownContent className="text-base text-parchment-400 leading-relaxed">{description}</MarkdownContent>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Subclass panel
// ---------------------------------------------------------------------------

function SubclassPanel({ subclass }: { subclass: SubclassData }) {
  const [open, setOpen] = useState(false);
  const panelId = `subclass-panel-${subclass.subclassId}`;

  return (
    <div className="rounded-xl border border-burgundy-900 bg-slate-900/60">
      {/* Header / toggle */}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls={panelId}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-slate-850/30 transition-colors rounded-xl focus:outline-none focus:ring-2 focus:ring-inset focus:ring-gold-500"
      >
        <div>
          <h4 className="font-serif text-base font-semibold text-parchment-100">
            {subclass.name}
          </h4>
          {subclass.description && !open && (
            <p className="mt-0.5 text-sm text-parchment-500 line-clamp-1">
              {subclass.description}
            </p>
          )}        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="hidden sm:block text-sm text-parchment-600 uppercase tracking-wider">
            Spellcast: {subclass.spellcastTrait}
          </span>
          <span aria-hidden="true" className="text-parchment-600 text-lg leading-none select-none">
            {open ? "▲" : "▼"}
          </span>
        </div>
      </button>

      {open && (
        <div id={panelId} className="px-5 pb-5 space-y-4 border-t border-burgundy-900/40">
          {subclass.description && (
            <MarkdownContent className="pt-4 text-base text-parchment-400 italic">{subclass.description}</MarkdownContent>
          )}

          <p className="text-sm text-parchment-600 uppercase tracking-wider pt-2">
            Spellcast Trait:{" "}
            <span className="text-parchment-400 normal-case tracking-normal font-medium">
              {subclass.spellcastTrait}
            </span>
          </p>

          {/* Foundation */}
          {subclass.foundationFeatures.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wider text-gold-600">
                Foundation (Level 1)
              </p>
              <div className="space-y-2">
                {subclass.foundationFeatures.map((f) => (
                  <FeatureBlock key={f.name} {...f} />
                ))}
              </div>
            </div>
          )}

          {/* Specialization */}
          {subclass.specializationFeature && (
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wider text-gold-600">
                Specialization (Level 3)
              </p>
              <FeatureBlock {...subclass.specializationFeature} />
            </div>
          )}

          {/* Mastery */}
          {subclass.masteryFeature && (
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wider text-gold-600">
                Mastery (Level 5)
              </p>
              <FeatureBlock {...subclass.masteryFeature} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section wrapper
// ---------------------------------------------------------------------------

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-3 font-serif text-2xl font-semibold text-parchment-100 border-b border-burgundy-900/50 pb-2">
        {title}
      </h2>
      {children}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function ClassDetailPage() {
  const pathname = usePathname();
  const classId = pathname?.split("/")[2] ?? "";
  const router = useRouter();
  const { data: cls, isLoading, isError } = useClass(classId);

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Top bar */}
      <header className="border-b border-burgundy-900/50 bg-slate-900/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-4">
          <button
            onClick={() => router.back()}
            aria-label="Go back"
            className="text-parchment-600 hover:text-parchment-300 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-gold-500 rounded"
          >
            ← Back
          </button>
          <span className="text-burgundy-800 select-none">/</span>
          <Link href="/classes" className="text-sm text-parchment-500 hover:text-parchment-300 transition-colors focus:outline-none focus:ring-2 focus:ring-gold-500 rounded">
            Classes
          </Link>
          {cls && (
            <>
              <span className="text-burgundy-800 select-none">/</span>
              <span className="text-sm text-parchment-300">{cls.name}</span>
            </>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8">
        <style>{`
          .domain-badge-tip { position: relative; }
          .domain-badge-tip .domain-tip-popup {
            position: absolute;
            top: calc(100% + 8px);
            left: 0;
            pointer-events: none;
            opacity: 0;
            transition: opacity 0.15s ease;
            z-index: 50;
            width: 220px;
            background: #1e293b;
            border: 1px solid rgba(87,115,153,0.35);
            border-radius: 8px;
            padding: 8px 10px;
            box-shadow: 0 4px 16px rgba(0,0,0,0.5);
          }
          .domain-badge-tip .domain-tip-popup::before {
            content: "";
            position: absolute;
            bottom: 100%;
            left: 14px;
            border: 6px solid transparent;
            border-bottom-color: #1e293b;
          }
          .domain-badge-tip:hover .domain-tip-popup,
          .domain-badge-tip:focus .domain-tip-popup,
          .domain-badge-tip:focus-within .domain-tip-popup { opacity: 1; }
        `}</style>
        {/* Loading */}
        {isLoading && (
          <div role="status" className="flex items-center justify-center py-20">
            <div aria-hidden="true" className="h-8 w-8 animate-spin rounded-full border-2 border-burgundy-500 border-t-transparent" />
            <span className="sr-only">Loading class…</span>
          </div>
        )}

        {/* Error */}
        {isError && !isLoading && (
          <div role="alert" className="rounded-xl border border-burgundy-700 bg-slate-900 p-8 text-center">
            <p className="text-burgundy-300">Class not found.</p>
            <Link href="/classes" className="mt-3 inline-block text-sm text-gold-500 hover:text-gold-400 focus:outline-none focus:ring-2 focus:ring-gold-500 rounded">
              Back to classes
            </Link>
          </div>
        )}

        {cls && (
          <div className="space-y-8">
            {/* Hero */}
            <div>
              <div className="flex flex-wrap items-start gap-4 mb-3">
                <h1 className="font-serif text-4xl font-bold text-parchment-100">
                  {cls.name}
                </h1>
                <div className="flex gap-2 items-center pt-1">
                  {cls.domains.map((d) => (
                    <DomainBadge key={d} domain={d} />
                  ))}
                </div>
              </div>

              {/* Starting stats bar */}
              <div className="flex gap-6 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-xs uppercase tracking-wider text-parchment-600">Evasion</span>
                  <span className="rounded border border-burgundy-800 bg-slate-900 px-2.5 py-0.5 font-bold text-parchment-200">
                    {cls.startingEvasion}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs uppercase tracking-wider text-parchment-600">Hit Points</span>
                  <span className="rounded border border-burgundy-800 bg-slate-900 px-2.5 py-0.5 font-bold text-parchment-200">
                    {cls.startingHitPoints}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs uppercase tracking-wider text-parchment-600">Subclasses</span>
                  <span className="rounded border border-burgundy-800 bg-slate-900 px-2.5 py-0.5 font-bold text-parchment-200">
                    {cls.subclasses.length}
                  </span>
                </div>
              </div>
            </div>

            {/* Class Items */}
            {cls.classItems.length > 0 && (
              <Section title="Class Items">
                <ul className="space-y-1">
                  {cls.classItems.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-base text-parchment-400">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gold-700" />
                      {item}
                    </li>
                  ))}
                </ul>
              </Section>
            )}

            {/* Hope Feature */}
            <Section title="Hope Feature">
              <div className="rounded-lg border border-gold-900/50 bg-gold-950/20 px-4 py-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-base font-semibold text-gold-300">{cls.hopeFeature.name}</span>
                  <span className="rounded border border-gold-800 bg-gold-950/40 px-1.5 py-0.5 text-xs font-bold text-gold-400">
                    {cls.hopeFeature.hopeCost} Hope
                  </span>
                </div>
                <MarkdownContent className="text-base text-parchment-400 leading-relaxed">{cls.hopeFeature.description}</MarkdownContent>
              </div>
            </Section>

            {/* Class Features */}
            {(cls.classFeatures?.length ?? 0) > 0 && (
              <Section title={cls.classFeatures.length > 1 ? "Class Features" : "Class Feature"}>
                <div className="space-y-3">
                  {cls.classFeatures.map((feature) => (
                    <div key={feature.name} className="rounded-lg border border-burgundy-900/60 bg-slate-850/50 px-4 py-4 space-y-2">
                      <p className="text-base font-semibold text-parchment-200">{feature.name}</p>
                      <MarkdownContent className="text-base text-parchment-400 leading-relaxed">{feature.description}</MarkdownContent>
                      {feature.options.length > 0 && (
                        <ul className="mt-2 space-y-1">
                          {feature.options.map((opt, i) => (
                            <li key={i} className="flex items-start gap-2 text-base text-parchment-500">
                              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-burgundy-600" />
                              <MarkdownContent inline>{opt}</MarkdownContent>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {/* Subclasses */}
            {cls.subclasses.length > 0 && (
              <Section title="Subclasses">
                <div className="space-y-3">
                  {cls.subclasses.map((sub) => (
                    <SubclassPanel key={sub.subclassId} subclass={sub} />
                  ))}
                </div>
              </Section>
            )}

            {/* How to Play */}
            {cls.mechanicalNotes && (
              <aside
                aria-label={`How to Play ${cls.name}`}
                className="rounded-xl border border-[#577399]/30 bg-slate-900/70 px-5 py-4 space-y-2"
              >
                <h2 className="text-xs font-bold uppercase tracking-[0.18em] text-[#577399]">
                  How to Play {cls.name}
                </h2>
                <MarkdownContent className="text-base text-parchment-400 leading-relaxed">{cls.mechanicalNotes}</MarkdownContent>
              </aside>
            )}

            {/* Background Questions */}
            {cls.backgroundQuestions.length > 0 && (
              <Section title="Background Questions">
                <ol className="space-y-2 list-none">
                  {cls.backgroundQuestions.map((q, i) => (
                    <li key={i} className="flex items-start gap-3 text-base text-parchment-400">
                      <span className="shrink-0 rounded border border-burgundy-800 bg-slate-900 w-6 h-6 flex items-center justify-center text-sm font-bold text-parchment-600">
                        {i + 1}
                      </span>
                      <MarkdownContent inline className="text-base text-parchment-400">{q}</MarkdownContent>
                    </li>
                  ))}
                </ol>
              </Section>
            )}

            {/* Connection Questions */}
            {cls.connectionQuestions.length > 0 && (
              <Section title="Connection Questions">
                <ol className="space-y-2 list-none">
                  {cls.connectionQuestions.map((q, i) => (
                    <li key={i} className="flex items-start gap-3 text-base text-parchment-400">
                      <span className="shrink-0 rounded border border-burgundy-800 bg-slate-900 w-6 h-6 flex items-center justify-center text-sm font-bold text-parchment-600">
                        {i + 1}
                      </span>
                      <MarkdownContent inline className="text-base text-parchment-400">{q}</MarkdownContent>
                    </li>
                  ))}
                </ol>
              </Section>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
