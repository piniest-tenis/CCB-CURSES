"use client";

/**
 * src/components/srd/SRDDetailCards.tsx
 *
 * Detail card components for SRD sub-entry types: weapons, armor, loot,
 * adversaries, environments, and subsections. Each card renders a structured,
 * tactile stat-block that matches the Daggerheart SRD visual language.
 *
 * Also exports `SRDDetailCard` — a router component that dispatches to the
 * correct card based on the sub-entry's discriminated type.
 *
 * Layout: mobile-first with responsive grid breakpoints.
 * Palette: gold accents for equipment, coral for adversaries/environments,
 *          slate backgrounds, parchment text hierarchy.
 */

import React from "react";
import { MarkdownContent } from "@/components/MarkdownContent";
import type {
  WeaponFields,
  ArmorFields,
  LootFields,
  AdversaryFields,
  EnvironmentFields,
  SubsectionFields,
  AdversaryFeature,
  SRDSubEntry,
  SRDSubEntryType,
} from "@shared/types/srd";

// ─── Shared: Breadcrumb Footer ───────────────────────────────────────────────

interface BreadcrumbFooterProps {
  breadcrumb: string;
  parentChunkId: string;
  onBreadcrumbClick?: () => void;
}

function BreadcrumbFooter({ breadcrumb, parentChunkId, onBreadcrumbClick }: BreadcrumbFooterProps) {
  return (
    <div className="mt-3 pt-2 border-t border-slate-700/50">
      <p className="text-xs text-parchment-600">
        from{" "}
        {onBreadcrumbClick ? (
          <button
            type="button"
            onClick={onBreadcrumbClick}
            className="text-gold-400 hover:text-gold-300 underline cursor-pointer transition-colors duration-150"
            aria-label={`Navigate to parent section: ${breadcrumb}`}
          >
            {breadcrumb}
          </button>
        ) : (
          <span
            className="text-gold-400"
            aria-label={`Navigate to parent section: ${breadcrumb}`}
          >
            {breadcrumb}
          </span>
        )}
      </p>
    </div>
  );
}

// ─── Shared: Helpers ─────────────────────────────────────────────────────────

/** Returns true if a feature string is empty / dash / null. */
function isEmptyFeature(feature: string | null | undefined): boolean {
  if (!feature) return true;
  const trimmed = feature.trim();
  return trimmed === "" || trimmed === "—" || trimmed === "-" || trimmed === "–";
}

// ─── 1. WeaponDetailCard ─────────────────────────────────────────────────────

interface WeaponDetailCardProps {
  name: string;
  fields: WeaponFields;
  breadcrumb: string;
  parentChunkId: string;
  onBreadcrumbClick?: () => void;
  className?: string;
}

export function WeaponDetailCard({
  name,
  fields,
  breadcrumb,
  parentChunkId,
  onBreadcrumbClick,
  className = "",
}: WeaponDetailCardProps) {
  const isTwoHanded = fields.burden.toLowerCase().includes("two");

  return (
    <div
      role="article"
      aria-label={`Weapon: ${name}, Tier ${fields.tier}`}
      className={`
        rounded-lg border-l-4 border-l-gold-400 bg-slate-850 p-3 sm:p-4
        shadow-card hover:shadow-card-fantasy-hover transition-shadow duration-200
        ${className}
      `}
    >
      {/* ── Header: name + tier + category ── */}
      <div className="flex items-center flex-wrap gap-1">
        <h3 className="font-serif text-base sm:text-lg text-[#f7f7ff] font-medium">
          {name}
        </h3>
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-gold-400/10 text-gold-400 ml-2">
          Tier {fields.tier}
        </span>
        {fields.category && (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-slate-700/50 text-parchment-400 ml-1">
            {fields.category}
          </span>
        )}
      </div>

      {/* ── Stat grid ── */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 sm:gap-x-6 sm:gap-y-3 mt-3">
        {/* Trait */}
        <div>
          <p className="text-xs uppercase tracking-wider text-parchment-600">Trait</p>
          <p className="text-sm text-parchment-200 font-medium mt-0.5">{fields.trait}</p>
        </div>

        {/* Range */}
        <div>
          <p className="text-xs uppercase tracking-wider text-parchment-600">Range</p>
          <p className="text-sm text-parchment-200 font-medium mt-0.5">{fields.range}</p>
        </div>

        {/* Damage */}
        <div>
          <p className="text-xs uppercase tracking-wider text-parchment-600">Damage</p>
          <p className="text-sm text-parchment-200 font-medium mt-0.5">
            <span className="text-gold-400/60 mr-1">⚄</span>
            {fields.damage}
          </p>
        </div>

        {/* Burden */}
        <div>
          <p className="text-xs uppercase tracking-wider text-parchment-600">Burden</p>
          <p className="mt-0.5">
            <span
              className={`
                inline-flex items-center px-2 py-0.5 rounded text-xs font-medium
                ${isTwoHanded
                  ? "bg-coral-400/10 text-coral-300 border border-coral-400/20"
                  : "bg-slate-700/50 text-parchment-300"
                }
              `}
            >
              {fields.burden}
            </span>
          </p>
        </div>
      </div>

      {/* ── Feature (optional) ── */}
      {!isEmptyFeature(fields.feature) && (
        <div className="border-t border-gold-400/20 mt-3 pt-3">
          <p className="text-xs uppercase tracking-wider text-parchment-600 mb-1">Feature</p>
          <p className="text-sm text-parchment-300 leading-relaxed">{fields.feature}</p>
        </div>
      )}

      {/* ── Breadcrumb footer ── */}
      <BreadcrumbFooter
        breadcrumb={breadcrumb}
        parentChunkId={parentChunkId}
        onBreadcrumbClick={onBreadcrumbClick}
      />
    </div>
  );
}

// ─── 2. ArmorDetailCard ──────────────────────────────────────────────────────

interface ArmorDetailCardProps {
  name: string;
  fields: ArmorFields;
  breadcrumb: string;
  parentChunkId: string;
  onBreadcrumbClick?: () => void;
  className?: string;
}

export function ArmorDetailCard({
  name,
  fields,
  breadcrumb,
  parentChunkId,
  onBreadcrumbClick,
  className = "",
}: ArmorDetailCardProps) {
  return (
    <div
      role="article"
      aria-label={`Armor: ${name}, Tier ${fields.tier}, Score ${fields.baseArmorScore}`}
      className={`
        rounded-lg border-l-4 border-l-gold-400 bg-slate-850 p-3 sm:p-4
        shadow-card hover:shadow-card-fantasy-hover transition-shadow duration-200
        ${className}
      `}
    >
      {/* ── Header: name + tier ── */}
      <div className="flex items-center flex-wrap gap-1">
        <h3 className="font-serif text-base sm:text-lg text-[#f7f7ff] font-medium">
          {name}
        </h3>
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-gold-400/10 text-gold-400 ml-2">
          Tier {fields.tier}
        </span>
      </div>

      {/* ── Stat grid ── */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 sm:gap-x-6 sm:gap-y-3 mt-3">
        {/* Armor Score — prominent */}
        <div>
          <p className="text-xs uppercase tracking-wider text-parchment-600">Armor Score</p>
          <p className="text-2xl font-serif font-bold text-[#f7f7ff] mt-0.5">
            {fields.baseArmorScore}
          </p>
        </div>

        {/* Thresholds */}
        <div>
          <p className="text-xs uppercase tracking-wider text-parchment-600">Thresholds</p>
          <p className="text-sm text-parchment-200 mt-0.5">
            Major {fields.baseMajorThreshold}
            <span className="text-parchment-600 mx-1">/</span>
            Severe {fields.baseSevereThreshold}
          </p>
        </div>
      </div>

      {/* ── Feature (optional) ── */}
      {!isEmptyFeature(fields.feature) && (
        <div className="border-t border-gold-400/20 mt-3 pt-3">
          {fields.featureType && (
            <p className="text-xs uppercase tracking-wider text-parchment-600 mb-1">
              {fields.featureType}
            </p>
          )}
          <p className="text-sm text-parchment-300 leading-relaxed">{fields.feature}</p>
        </div>
      )}

      {/* ── Breadcrumb footer ── */}
      <BreadcrumbFooter
        breadcrumb={breadcrumb}
        parentChunkId={parentChunkId}
        onBreadcrumbClick={onBreadcrumbClick}
      />
    </div>
  );
}

// ─── 3. LootDetailCard ───────────────────────────────────────────────────────

/** Derive rarity label and pill classes from a loot roll number string. */
function getLootRarity(roll: string): { label: string; className: string } {
  const num = parseInt(roll, 10);
  if (isNaN(num) || num <= 12) {
    return {
      label: "Common",
      className: "px-2 py-0.5 rounded-full text-xs font-medium bg-parchment-900/20 text-parchment-400",
    };
  }
  if (num <= 36) {
    return {
      label: "Uncommon",
      className: "px-2 py-0.5 rounded-full text-xs font-medium bg-gold-400/10 text-gold-400",
    };
  }
  if (num <= 48) {
    return {
      label: "Rare",
      className: "px-2 py-0.5 rounded-full text-xs font-medium bg-burgundy-900/30 text-burgundy-300",
    };
  }
  return {
    label: "Legendary",
    className: "px-2 py-0.5 rounded-full text-xs font-medium bg-gold-400/20 text-gold-300 border border-gold-400/30",
  };
}

interface LootDetailCardProps {
  name: string;
  fields: LootFields;
  breadcrumb: string;
  parentChunkId: string;
  onBreadcrumbClick?: () => void;
  className?: string;
}

export function LootDetailCard({
  name,
  fields,
  breadcrumb,
  parentChunkId,
  onBreadcrumbClick,
  className = "",
}: LootDetailCardProps) {
  const rarity = getLootRarity(fields.roll);

  return (
    <div
      role="article"
      aria-label={`Loot: ${name}, ${rarity.label}, roll ${fields.roll}`}
      className={`
        rounded-lg bg-slate-850 p-3
        shadow-card hover:shadow-card-fantasy-hover transition-shadow duration-200
        ${className}
      `}
    >
      {/* ── Top row: roll badge + name + rarity ── */}
      <div className="flex items-center">
        <span className="inline-flex items-center justify-center w-8 h-8 rounded bg-slate-700/60 text-xs font-mono font-bold text-parchment-300 mr-3 shrink-0">
          {fields.roll}
        </span>
        <span className="font-serif text-base text-[#f7f7ff] font-medium min-w-0 truncate">
          {name}
        </span>
        <span className={`${rarity.className} ml-auto shrink-0`}>
          {rarity.label}
        </span>
      </div>

      {/* ── Description ── */}
      {fields.description && (
        <p className="text-sm text-parchment-300 leading-relaxed mt-2">
          {fields.description}
        </p>
      )}

      {/* ── Breadcrumb footer ── */}
      <BreadcrumbFooter
        breadcrumb={breadcrumb}
        parentChunkId={parentChunkId}
        onBreadcrumbClick={onBreadcrumbClick}
      />
    </div>
  );
}

// ─── 4. AdversaryStatCard ────────────────────────────────────────────────────

/** Render a list of adversary features with typed bullet markers. */
function FeatureList({ features }: { features: AdversaryFeature[] }) {
  if (features.length === 0) return null;

  return (
    <div>
      <p className="text-xs uppercase tracking-wider text-coral-400/80 font-semibold mt-4 mb-1">
        <span aria-hidden="true">◆ </span>Features
      </p>
      <ul className="space-y-1.5">
        {features.map((feat, idx) => (
          <li key={idx} className="flex text-sm leading-relaxed">
            <span className="text-coral-400/60 mr-2 shrink-0" aria-hidden="true">◆</span>
            <span>
              <span className="font-medium text-parchment-200">{feat.name}</span>
              {feat.type && (
                <span className="text-coral-400/80"> — {feat.type}</span>
              )}
              {feat.description && (
                <span className="text-parchment-300">: {feat.description}</span>
              )}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

interface AdversaryStatCardProps {
  name: string;
  fields: AdversaryFields;
  breadcrumb: string;
  parentChunkId: string;
  onBreadcrumbClick?: () => void;
  className?: string;
}

export function AdversaryStatCard({
  name,
  fields,
  breadcrumb,
  parentChunkId,
  onBreadcrumbClick,
  className = "",
}: AdversaryStatCardProps) {
  return (
    <div
      role="article"
      aria-label={`Adversary: ${name}, Tier ${fields.tier}, ${fields.type}`}
      className={`
        rounded-lg border-l-4 border-l-coral-400 bg-slate-850 p-3 sm:p-4
        shadow-card hover:shadow-card-fantasy-hover transition-shadow duration-200
        ${className}
      `}
    >
      {/* ── Header: name + tier + type ── */}
      <div className="flex items-center flex-wrap gap-1">
        <h3 className="font-serif text-base sm:text-lg text-[#f7f7ff] font-medium">
          {name}
        </h3>
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-coral-400/10 text-coral-300 ml-2">
          Tier {fields.tier}
        </span>
        {fields.type && (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-slate-700/50 text-parchment-400 ml-1">
            {fields.type}
          </span>
        )}
      </div>

      {/* ── Description ── */}
      {fields.description && (
        <p className="text-sm text-parchment-400 mt-1 italic">{fields.description}</p>
      )}

      {/* ── Motives ── */}
      {fields.motives && (
        <p className="text-xs text-parchment-500 mt-1">Motives: {fields.motives}</p>
      )}

      {/* ── Core stat row ── */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 lg:grid-cols-4 mt-3 text-center">
        <div>
          <p className="text-xs uppercase tracking-wider text-parchment-600">Difficulty</p>
          <p className="text-base font-semibold text-parchment-100 mt-0.5">{fields.difficulty}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wider text-parchment-600">Thresholds</p>
          <p className="text-base font-semibold text-parchment-100 mt-0.5">{fields.thresholds}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wider text-parchment-600">HP</p>
          <p className="text-base font-semibold text-parchment-100 mt-0.5">{fields.hp}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wider text-parchment-600">Stress</p>
          <p className="text-base font-semibold text-parchment-100 mt-0.5">{fields.stress}</p>
        </div>
      </div>

      {/* ── Attack ── */}
      {fields.attack && (
        <div>
          <p className="text-xs uppercase tracking-wider text-coral-400/80 font-semibold mt-4 mb-1">
            <span aria-hidden="true">⚔ </span>Attack
          </p>
          <p className="text-sm text-parchment-200 font-medium">{fields.attack}</p>
        </div>
      )}

      {/* ── Experiences ── */}
      {fields.experiences && fields.experiences.length > 0 && (
        <div>
          <p className="text-xs uppercase tracking-wider text-coral-400/80 font-semibold mt-4 mb-1">
            <span aria-hidden="true">★ </span>Experiences
          </p>
          <ul className="space-y-0.5">
            {fields.experiences.map((exp, idx) => (
              <li key={idx} className="flex items-baseline text-sm">
                <span className="text-coral-400/60 mr-2" aria-hidden="true">•</span>
                <span className="text-parchment-300">{exp}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ── Features ── */}
      <FeatureList features={fields.features} />

      {/* ── Breadcrumb footer ── */}
      <BreadcrumbFooter
        breadcrumb={breadcrumb}
        parentChunkId={parentChunkId}
        onBreadcrumbClick={onBreadcrumbClick}
      />
    </div>
  );
}

// ─── 5. EnvironmentStatCard ──────────────────────────────────────────────────

interface EnvironmentStatCardProps {
  name: string;
  fields: EnvironmentFields;
  breadcrumb: string;
  parentChunkId: string;
  onBreadcrumbClick?: () => void;
  className?: string;
}

export function EnvironmentStatCard({
  name,
  fields,
  breadcrumb,
  parentChunkId,
  onBreadcrumbClick,
  className = "",
}: EnvironmentStatCardProps) {
  return (
    <div
      role="article"
      aria-label={`Environment: ${name}, Tier ${fields.tier}, ${fields.type}`}
      className={`
        rounded-lg border-l-4 border-l-coral-400 bg-slate-850 p-3 sm:p-4
        shadow-card hover:shadow-card-fantasy-hover transition-shadow duration-200
        ${className}
      `}
    >
      {/* ── Header: name + tier + type ── */}
      <div className="flex items-center flex-wrap gap-1">
        <h3 className="font-serif text-base sm:text-lg text-[#f7f7ff] font-medium">
          {name}
        </h3>
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-coral-400/10 text-coral-300 ml-2">
          Tier {fields.tier}
        </span>
        {fields.type && (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-slate-700/50 text-parchment-400 ml-1">
            {fields.type}
          </span>
        )}
      </div>

      {/* ── Description ── */}
      {fields.description && (
        <p className="text-sm text-parchment-400 mt-1 italic">{fields.description}</p>
      )}

      {/* ── Impulses ── */}
      {fields.impulses && (
        <p className="text-xs text-parchment-500 mt-1">Impulses: {fields.impulses}</p>
      )}

      {/* ── Difficulty (single stat) ── */}
      <div className="mt-3 text-center">
        <p className="text-xs uppercase tracking-wider text-parchment-600">Difficulty</p>
        <p className="text-base font-semibold text-parchment-100 mt-0.5">
          {fields.difficultyRaw || fields.difficulty}
        </p>
      </div>

      {/* ── Potential Adversaries ── */}
      {fields.potentialAdversaries && (
        <div>
          <p className="text-xs uppercase tracking-wider text-coral-400/80 font-semibold mt-4 mb-1">
            Potential Adversaries
          </p>
          <p className="text-sm text-parchment-300 leading-relaxed">
            {fields.potentialAdversaries}
          </p>
        </div>
      )}

      {/* ── Features ── */}
      <FeatureList features={fields.features} />

      {/* ── Breadcrumb footer ── */}
      <BreadcrumbFooter
        breadcrumb={breadcrumb}
        parentChunkId={parentChunkId}
        onBreadcrumbClick={onBreadcrumbClick}
      />
    </div>
  );
}

// ─── 6. SubSectionCard ───────────────────────────────────────────────────────

interface SubSectionCardProps {
  title: string;
  fields: SubsectionFields;
  breadcrumb: string;
  parentChunkId: string;
  onBreadcrumbClick?: () => void;
  className?: string;
}

export function SubSectionCard({
  title,
  fields,
  breadcrumb,
  parentChunkId,
  onBreadcrumbClick,
  className = "",
}: SubSectionCardProps) {
  return (
    <div
      role="article"
      aria-label={`Section: ${title}`}
      className={`
        rounded-lg bg-slate-850 p-4
        shadow-card hover:shadow-card-fantasy-hover transition-shadow duration-200
        border border-slate-700/30
        ${className}
      `}
    >
      {/* ── Title ── */}
      <h3 className="font-serif text-base text-[#f7f7ff] font-semibold">
        {title}
      </h3>

      {/* ── Breadcrumb (inline, above body) ── */}
      <p className="text-xs text-parchment-600 mt-0.5 mb-3">
        from{" "}
        {onBreadcrumbClick ? (
          <button
            type="button"
            onClick={onBreadcrumbClick}
            className="text-gold-400 hover:text-gold-300 underline cursor-pointer transition-colors duration-150"
            aria-label={`Navigate to parent section: ${breadcrumb}`}
          >
            {breadcrumb}
          </button>
        ) : (
          <span
            className="text-gold-400"
            aria-label={`Navigate to parent section: ${breadcrumb}`}
          >
            {breadcrumb}
          </span>
        )}
      </p>

      {/* ── Markdown body ── */}
      {fields.content && (
        <MarkdownContent className="prose-srd text-sm">
          {fields.content}
        </MarkdownContent>
      )}
    </div>
  );
}

// ─── 7. SRDDetailCard — Router ───────────────────────────────────────────────

interface SRDDetailCardProps {
  subEntry: SRDSubEntry;
  onBreadcrumbClick?: () => void;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Dispatches to the correct detail card component based on the sub-entry's
 * discriminated `type` field. Passes through `className` and `style` for
 * virtualised-list positioning.
 */
export function SRDDetailCard({
  subEntry,
  onBreadcrumbClick,
  className,
  style,
}: SRDDetailCardProps) {
  const { name, fields, breadcrumb, parentChunkId, type } = subEntry;

  const sharedProps = {
    name,
    breadcrumb,
    parentChunkId,
    onBreadcrumbClick,
    className,
  };

  const wrapper = (card: React.ReactNode) =>
    style ? <div style={style}>{card}</div> : <>{card}</>;

  switch (type) {
    case "weapon":
      return wrapper(
        <WeaponDetailCard {...sharedProps} fields={fields as WeaponFields} />
      );

    case "armor":
      return wrapper(
        <ArmorDetailCard {...sharedProps} fields={fields as ArmorFields} />
      );

    case "loot":
      return wrapper(
        <LootDetailCard {...sharedProps} fields={fields as LootFields} />
      );

    case "adversary":
      return wrapper(
        <AdversaryStatCard {...sharedProps} fields={fields as AdversaryFields} />
      );

    case "environment":
      return wrapper(
        <EnvironmentStatCard {...sharedProps} fields={fields as EnvironmentFields} />
      );

    case "subsection":
      return wrapper(
        <SubSectionCard
          title={name}
          fields={fields as SubsectionFields}
          breadcrumb={breadcrumb}
          parentChunkId={parentChunkId}
          onBreadcrumbClick={onBreadcrumbClick}
          className={className}
        />
      );

    default: {
      // Exhaustiveness guard — should never reach here
      const _exhaustive: never = type;
      return null;
    }
  }
}
