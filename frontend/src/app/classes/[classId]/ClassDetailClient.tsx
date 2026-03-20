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
import { useParams, useRouter } from "next/navigation";
import { useClass } from "@/hooks/useGameData";
import type { SubclassData, NamedFeature } from "@shared/types";

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

function DomainBadge({ domain }: { domain: string }) {
  const colour = DOMAIN_COLOURS[domain] ?? "border-burgundy-800 bg-burgundy-950/30 text-burgundy-400";
  return (
    <Link
      href={`/domains/${encodeURIComponent(domain)}`}
      className={`inline-block rounded border px-2.5 py-0.5 text-sm font-medium hover:opacity-80 transition-opacity ${colour}`}
    >
      {domain}
    </Link>
  );
}

// ---------------------------------------------------------------------------
// Feature block
// ---------------------------------------------------------------------------

function FeatureBlock({ name, description }: NamedFeature) {
  return (
    <div className="rounded-lg border border-burgundy-900/60 bg-slate-850/50 px-4 py-3">
      <p className="text-sm font-semibold text-parchment-200 mb-1">{name}</p>
      <p className="text-sm text-parchment-400 leading-relaxed whitespace-pre-wrap">{description}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Subclass panel
// ---------------------------------------------------------------------------

function SubclassPanel({ subclass }: { subclass: SubclassData }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-xl border border-burgundy-900 bg-slate-900/60">
      {/* Header / toggle */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-slate-850/30 transition-colors rounded-xl"
      >
        <div>
          <h4 className="font-serif text-base font-semibold text-parchment-100">
            {subclass.name}
          </h4>
          {subclass.description && (
            <p className="mt-0.5 text-xs text-parchment-500 line-clamp-1">
              {subclass.description}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="hidden sm:block text-xs text-parchment-600 uppercase tracking-wider">
            Spellcast: {subclass.spellcastTrait}
          </span>
          <span className="text-parchment-600 text-lg leading-none select-none">
            {open ? "▲" : "▼"}
          </span>
        </div>
      </button>

      {open && (
        <div className="px-5 pb-5 space-y-4 border-t border-burgundy-900/40">
          {subclass.description && (
            <p className="pt-4 text-sm text-parchment-400 italic">{subclass.description}</p>
          )}

          <p className="text-xs text-parchment-600 uppercase tracking-wider pt-2">
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
      <h2 className="mb-3 font-serif text-xl font-semibold text-parchment-100 border-b border-burgundy-900/50 pb-2">
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
  const params = useParams<{ classId: string }>();
  const router = useRouter();
  const { data: cls, isLoading, isError } = useClass(params?.classId ?? "");

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Top bar */}
      <header className="border-b border-burgundy-900/50 bg-slate-900/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-4">
          <button
            onClick={() => router.back()}
            className="text-parchment-600 hover:text-parchment-300 text-sm transition-colors"
          >
            ← Back
          </button>
          <span className="text-burgundy-800 select-none">/</span>
          <Link href="/classes" className="text-sm text-parchment-500 hover:text-parchment-300 transition-colors">
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
        {/* Loading */}
        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-burgundy-500 border-t-transparent" />
          </div>
        )}

        {/* Error */}
        {isError && !isLoading && (
          <div className="rounded-xl border border-burgundy-700 bg-slate-900 p-8 text-center">
            <p className="text-burgundy-300">Class not found.</p>
            <Link href="/classes" className="mt-3 inline-block text-sm text-gold-500 hover:text-gold-400">
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
                    <li key={i} className="flex items-start gap-2 text-sm text-parchment-400">
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
                <p className="text-sm text-parchment-400 leading-relaxed whitespace-pre-wrap">
                  {cls.hopeFeature.description}
                </p>
              </div>
            </Section>

            {/* Class Feature */}
            <Section title="Class Feature">
              <div className="rounded-lg border border-burgundy-900/60 bg-slate-850/50 px-4 py-4 space-y-2">
                <p className="text-sm font-semibold text-parchment-200">{cls.classFeature.name}</p>
                <p className="text-sm text-parchment-400 leading-relaxed whitespace-pre-wrap">
                  {cls.classFeature.description}
                </p>
                {cls.classFeature.options.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {cls.classFeature.options.map((opt, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-parchment-500">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-burgundy-600" />
                        {opt}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </Section>

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

            {/* Background Questions */}
            {cls.backgroundQuestions.length > 0 && (
              <Section title="Background Questions">
                <ol className="space-y-2 list-none">
                  {cls.backgroundQuestions.map((q, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm text-parchment-400">
                      <span className="shrink-0 rounded border border-burgundy-800 bg-slate-900 w-5 h-5 flex items-center justify-center text-xs font-bold text-parchment-600">
                        {i + 1}
                      </span>
                      {q}
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
                    <li key={i} className="flex items-start gap-3 text-sm text-parchment-400">
                      <span className="shrink-0 rounded border border-burgundy-800 bg-slate-900 w-5 h-5 flex items-center justify-center text-xs font-bold text-parchment-600">
                        {i + 1}
                      </span>
                      {q}
                    </li>
                  ))}
                </ol>
              </Section>
            )}

            {/* Mechanical Notes */}
            {cls.mechanicalNotes && (
              <Section title="Mechanical Notes">
                <div className="rounded-lg border border-burgundy-900/40 bg-slate-900/50 px-4 py-3">
                  <p className="text-sm text-parchment-500 italic leading-relaxed whitespace-pre-wrap">
                    {cls.mechanicalNotes}
                  </p>
                </div>
              </Section>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
