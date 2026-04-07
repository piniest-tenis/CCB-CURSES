"use client";

/**
 * src/components/homebrew/MarkdownPreview.tsx
 *
 * Read-only styled preview of parsed homebrew data.
 * Renders ClassData, CommunityData, AncestryData, or DomainCard
 * in a visually rich coral-accented card layout.
 *
 * Shows a placeholder when data is null (before any content has been entered).
 */

import React from "react";
import type {
  HomebrewContentType,
  ClassData,
  CommunityData,
  AncestryData,
  DomainCard,
} from "@shared/types";

// ─── Types ────────────────────────────────────────────────────────────────────

export type PreviewData = ClassData | CommunityData | AncestryData | DomainCard | null;

export interface MarkdownPreviewProps {
  /** The parsed homebrew data to render. Null = show placeholder. */
  data: PreviewData;
  /** The content type — determines which renderer is used. */
  contentType: HomebrewContentType;
}

// ─── Shared sub-components ────────────────────────────────────────────────────

function PreviewBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center rounded border border-coral-400/30 bg-coral-400/10 px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-coral-400">
      {label}
    </span>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="font-serif text-base font-semibold text-coral-400/80 border-b border-slate-700/40 pb-1.5">
      {children}
    </h3>
  );
}

function ProseBlock({ text }: { text: string }) {
  if (!text) return null;
  return (
    <p className="text-sm text-[#b9baa3]/80 leading-relaxed whitespace-pre-wrap">
      {text}
    </p>
  );
}

// ─── Placeholder ──────────────────────────────────────────────────────────────

function PreviewPlaceholder() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
      <div aria-hidden="true" className="text-4xl opacity-10 select-none">
        &#128065;
      </div>
      <p className="text-sm text-parchment-600 max-w-xs leading-relaxed">
        Enter content on the left to see a live preview of your homebrew here.
      </p>
    </div>
  );
}

// ─── Ancestry Preview ─────────────────────────────────────────────────────────

function AncestryPreview({ data }: { data: AncestryData }) {
  return (
    <div className="space-y-4 animate-fade-in">
      <div className="space-y-1.5">
        <PreviewBadge label="Ancestry" />
        <h2 className="font-serif text-xl font-bold text-[#f7f7ff]">
          {data.name}
        </h2>
      </div>

      {data.flavorText && <ProseBlock text={data.flavorText} />}

      {/* First trait */}
      {data.traitName && (
        <div className="space-y-1.5">
          <SectionHeading>{data.traitName}</SectionHeading>
          <ProseBlock text={data.traitDescription} />
        </div>
      )}

      {/* Second trait */}
      {data.secondTraitName && (
        <div className="space-y-1.5">
          <SectionHeading>{data.secondTraitName}</SectionHeading>
          <ProseBlock text={data.secondTraitDescription} />
        </div>
      )}

      {/* Mechanical bonuses */}
      {data.mechanicalBonuses && data.mechanicalBonuses.length > 0 && (
        <div className="space-y-1.5">
          <SectionHeading>Mechanical Bonuses</SectionHeading>
          <ul className="space-y-1">
            {data.mechanicalBonuses.map((b, i) => (
              <li
                key={i}
                className="flex items-center gap-2 text-sm text-parchment-500"
              >
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-coral-400/50" />
                <span className="capitalize">{b.stat}</span>
                <span className={b.amount > 0 ? "text-emerald-400" : "text-[#fe5f55]"}>
                  {b.amount > 0 ? `+${b.amount}` : b.amount}
                </span>
                {b.condition && (
                  <span className="text-parchment-600 text-xs">({b.condition})</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ─── Community Preview ────────────────────────────────────────────────────────

function CommunityPreview({ data }: { data: CommunityData }) {
  return (
    <div className="space-y-4 animate-fade-in">
      <div className="space-y-1.5">
        <PreviewBadge label="Community" />
        <h2 className="font-serif text-xl font-bold text-[#f7f7ff]">
          {data.name}
        </h2>
      </div>

      {data.flavorText && <ProseBlock text={data.flavorText} />}

      {data.traitName && (
        <div className="space-y-1.5">
          <SectionHeading>Cultural Trait: {data.traitName}</SectionHeading>
          <ProseBlock text={data.traitDescription} />
        </div>
      )}

      {data.mechanicalBonuses && data.mechanicalBonuses.length > 0 && (
        <div className="space-y-1.5">
          <SectionHeading>Mechanical Bonuses</SectionHeading>
          <ul className="space-y-1">
            {data.mechanicalBonuses.map((b, i) => (
              <li
                key={i}
                className="flex items-center gap-2 text-sm text-parchment-500"
              >
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-coral-400/50" />
                <span className="capitalize">{b.stat}</span>
                <span className={b.amount > 0 ? "text-emerald-400" : "text-[#fe5f55]"}>
                  {b.amount > 0 ? `+${b.amount}` : b.amount}
                </span>
                {b.condition && (
                  <span className="text-parchment-600 text-xs">({b.condition})</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ─── Domain Card Preview ──────────────────────────────────────────────────────

function DomainCardPreview({ data }: { data: DomainCard }) {
  return (
    <div className="space-y-4 animate-fade-in">
      <div className="space-y-1.5">
        <div className="flex items-center gap-2 flex-wrap">
          <PreviewBadge label="Domain Card" />
          {data.domain && (
            <span className="text-[11px] font-semibold uppercase tracking-wider text-steel-accessible border border-steel-400/30 rounded px-1.5 py-0.5">
              {data.domain}
            </span>
          )}
          {data.isCursed && (
            <span className="text-[11px] font-semibold text-[#fe5f55] border border-[#fe5f55]/30 rounded px-1.5 py-0.5">
              Cursed
            </span>
          )}
          {data.isLinkedCurse && (
            <span className="text-[11px] font-semibold text-purple-400 border border-purple-400/30 rounded px-1.5 py-0.5">
              Linked Curse
            </span>
          )}
        </div>
        <h2 className="font-serif text-xl font-bold text-[#f7f7ff]">
          {data.name}
        </h2>
      </div>

      <div className="flex items-center gap-4 text-sm text-parchment-500">
        <span>
          Level{" "}
          <strong className="text-[#f7f7ff]">{data.level}</strong>
        </span>
        <span>
          Recall{" "}
          <strong className="text-[#f7f7ff]">{data.recallCost}</strong>
        </span>
      </div>

      {data.description && (
        <div className="space-y-1.5">
          <SectionHeading>Ability</SectionHeading>
          <ProseBlock text={data.description} />
        </div>
      )}

      {data.curseText && (
        <div className="space-y-1.5">
          <SectionHeading>Curse</SectionHeading>
          <div className="rounded-lg border border-[#fe5f55]/20 bg-[#fe5f55]/5 p-3">
            <ProseBlock text={data.curseText} />
          </div>
        </div>
      )}

      {data.grimoire.length > 0 && (
        <div className="space-y-2">
          <SectionHeading>Grimoire</SectionHeading>
          {data.grimoire.map((g, i) => (
            <div key={i} className="space-y-1 pl-3 border-l-2 border-coral-400/20">
              <p className="text-sm font-semibold text-[#f7f7ff]">{g.name}</p>
              <ProseBlock text={g.description} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Class Preview ────────────────────────────────────────────────────────────

function ClassPreview({ data }: { data: ClassData }) {
  return (
    <div className="space-y-5 animate-fade-in">
      <div className="space-y-1.5">
        <PreviewBadge label="Class" />
        <h2 className="font-serif text-xl font-bold text-[#f7f7ff]">
          {data.name}
        </h2>
      </div>

      {/* Core stats bar */}
      <div className="flex flex-wrap items-center gap-3 text-sm text-parchment-500">
        <span>
          Domains:{" "}
          <strong className="text-[#f7f7ff]">{data.domains.join(", ") || "\u2014"}</strong>
        </span>
        <span className="text-slate-700">|</span>
        <span>
          HP{" "}
          <strong className="text-[#f7f7ff]">{data.startingHitPoints}</strong>
        </span>
        <span className="text-slate-700">|</span>
        <span>
          Evasion{" "}
          <strong className="text-[#f7f7ff]">{data.startingEvasion}</strong>
        </span>
      </div>

      {/* Hope feature */}
      {data.hopeFeature && (
        <div className="space-y-1.5">
          <SectionHeading>
            Hope Feature: {data.hopeFeature.name}
            {data.hopeFeature.hopeCost > 0 && (
              <span className="ml-2 text-xs font-normal text-gold-400">
                ({data.hopeFeature.hopeCost} Hope)
              </span>
            )}
          </SectionHeading>
          <ProseBlock text={data.hopeFeature.description} />
        </div>
      )}

      {/* Class features */}
      {data.classFeatures.length > 0 && (
        <div className="space-y-3">
          <SectionHeading>Class Features</SectionHeading>
          {data.classFeatures.map((f, i) => (
            <div key={i} className="space-y-1 pl-3 border-l-2 border-coral-400/20">
              <p className="text-sm font-semibold text-[#f7f7ff]">{f.name}</p>
              <ProseBlock text={f.description} />
              {f.options.length > 0 && (
                <ul className="mt-1 space-y-0.5 pl-4 list-disc list-outside text-xs text-parchment-500">
                  {f.options.map((opt, j) => (
                    <li key={j}>{opt}</li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Subclasses */}
      {data.subclasses.length > 0 && (
        <div className="space-y-3">
          <SectionHeading>Subclasses</SectionHeading>
          {data.subclasses.map((sc) => (
            <div
              key={sc.subclassId}
              className="rounded-lg border border-slate-700/40 bg-slate-900/40 p-3 space-y-2"
            >
              <p className="font-serif text-base font-semibold text-[#f7f7ff]">
                {sc.name}
              </p>
              <ProseBlock text={sc.description} />
              {sc.foundationFeatures.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-wider text-parchment-500">
                    Foundation
                  </p>
                  {sc.foundationFeatures.map((f, i) => (
                    <div key={i} className="pl-2">
                      <p className="text-sm font-medium text-[#f7f7ff]">{f.name}</p>
                      <ProseBlock text={f.description} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Background questions */}
      {data.backgroundQuestions.length > 0 && (
        <div className="space-y-1.5">
          <SectionHeading>Background Questions</SectionHeading>
          <ul className="space-y-1 list-disc list-outside pl-5 text-sm text-parchment-500">
            {data.backgroundQuestions.map((q, i) => (
              <li key={i}>{q}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Connection questions */}
      {data.connectionQuestions.length > 0 && (
        <div className="space-y-1.5">
          <SectionHeading>Connection Questions</SectionHeading>
          <ul className="space-y-1 list-disc list-outside pl-5 text-sm text-parchment-500">
            {data.connectionQuestions.map((q, i) => (
              <li key={i}>{q}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function MarkdownPreview({ data, contentType }: MarkdownPreviewProps) {
  if (!data) return <PreviewPlaceholder />;

  switch (contentType) {
    case "ancestry":
      return <AncestryPreview data={data as AncestryData} />;
    case "community":
      return <CommunityPreview data={data as CommunityData} />;
    case "domainCard":
      return <DomainCardPreview data={data as DomainCard} />;
    case "class":
      return <ClassPreview data={data as ClassData} />;
    default:
      return <PreviewPlaceholder />;
  }
}
