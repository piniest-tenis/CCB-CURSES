"use client";

/**
 * src/app/campaigns/new/page.tsx
 *
 * 4-step wizard campaign creation form matching the character builder pattern.
 * Step 1 — Basics: Campaign name + description
 * Step 2 — Frames: Frame selection with inline detail panel (lg+) / slide-over (mobile)
 * Step 3 — Conflicts: Conflict resolution (locked when no conflicts exist)
 * Step 4 — Review: Summary + Create Campaign
 */

import React, {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { useCreateCampaign } from "@/hooks/useCampaigns";
import { useFrames, useFrameDetail } from "@/hooks/useFrames";
import { apiClient } from "@/lib/api";
import type {
  CampaignFrameSummary,
  CampaignFrameDetail,
  FrameContentRef,
  FrameRestriction,
  FrameExtension,
  FrameComplexityRating,
} from "@shared/types";

// ─── Constants ──────────────────────────────────────────────────────────────────

const MAX_NAME_LENGTH = 80;
const MAX_DESCRIPTION_LENGTH = 500;
const OVERVIEW_COLLAPSE_THRESHOLD = 150;

type WizardStep = 1 | 2 | 3 | 4;

const STEP_NAMES: Record<WizardStep, string> = {
  1: "Basics",
  2: "Frames",
  3: "Conflicts",
  4: "Review",
};

function nextStepFor(s: WizardStep, hasConflicts: boolean): WizardStep {
  if (s === 2 && !hasConflicts) return 4;
  return Math.min(s + 1, 4) as WizardStep;
}

function prevStepFor(s: WizardStep, hasConflicts: boolean): WizardStep {
  if (s === 4 && !hasConflicts) return 2;
  return Math.max(s - 1, 1) as WizardStep;
}

// ─── Work Section Definitions ───────────────────────────────────────────────────

interface WorkSection {
  id: string;
  label: string;
  description: string;
  contentTypes: string[];
  restrictionTypes: string[];
  extensionTypes: string[];
}

const WORK_SECTIONS: WorkSection[] = [
  {
    id: "characterOptions",
    label: "Character Options",
    description: "Classes, ancestries, and communities",
    contentTypes: ["class", "ancestry", "community"],
    restrictionTypes: ["class", "ancestry", "community"],
    extensionTypes: [],
  },
  {
    id: "powersDomains",
    label: "Powers & Domains",
    description: "Domain cards and custom domain definitions",
    contentTypes: ["domainCard"],
    restrictionTypes: ["domainCard"],
    extensionTypes: ["domain"],
  },
  {
    id: "equipmentForge",
    label: "Equipment Forge",
    description: "Custom weapons, armor, items, and consumables",
    contentTypes: ["weapon", "armor", "item", "consumable"],
    restrictionTypes: [],
    extensionTypes: [],
  },
  {
    id: "threatsEncounters",
    label: "Threats & Encounters",
    description: "Custom adversary types",
    contentTypes: [],
    restrictionTypes: [],
    extensionTypes: ["adversaryType"],
  },
  {
    id: "worldRules",
    label: "World Rules",
    description: "Custom conditions, damage types",
    contentTypes: [],
    restrictionTypes: [],
    extensionTypes: ["condition", "damageType"],
  },
];

// ─── Conflict Detection Types ───────────────────────────────────────────────────

type ConflictKind = "restriction" | "content" | "extension";

interface Conflict {
  kind: ConflictKind;
  key: string;
  label: string;
  itemType: string;
  itemId: string;
  frameIds: string[];
  perFrame: Map<string, { frameName: string; description: string }>;
  workSectionId: string;
}

type ConflictLookup = {
  restrictionConflicts: Map<string, Conflict>;
  contentConflicts: Map<string, Conflict>;
  extensionConflicts: Map<string, Conflict>;
};

// ─── Conflict Detection (Pure) ──────────────────────────────────────────────────

function detectConflicts(
  detailMap: Map<string, CampaignFrameDetail>,
  selectedIds: Set<string>,
): Conflict[] {
  if (selectedIds.size < 2) return [];

  const selectedDetails: CampaignFrameDetail[] = [];
  Array.from(selectedIds).forEach((id) => {
    const d = detailMap.get(id);
    if (d) selectedDetails.push(d);
  });
  if (selectedDetails.length < 2) return [];

  const conflicts: Conflict[] = [];

  const restrictionMap = new Map<
    string,
    Map<string, { detail: CampaignFrameDetail; restriction: FrameRestriction }>
  >();
  const contentMap = new Map<
    string,
    Map<string, { detail: CampaignFrameDetail; content: FrameContentRef }>
  >();
  const extensionMap = new Map<
    string,
    Map<string, { detail: CampaignFrameDetail; extension: FrameExtension }>
  >();

  for (const detail of selectedDetails) {
    for (const r of detail.restrictions) {
      const key = `${r.contentType}:${r.contentId}`;
      if (!restrictionMap.has(key)) restrictionMap.set(key, new Map());
      restrictionMap.get(key)!.set(detail.frameId, { detail, restriction: r });
    }
    for (const c of detail.contents) {
      const key = `${c.contentType}:${c.contentId}`;
      if (!contentMap.has(key)) contentMap.set(key, new Map());
      contentMap.get(key)!.set(detail.frameId, { detail, content: c });
    }
    for (const e of detail.extensions) {
      const key = `${e.extensionType}:${e.slug}`;
      if (!extensionMap.has(key)) extensionMap.set(key, new Map());
      extensionMap.get(key)!.set(detail.frameId, { detail, extension: e });
    }
  }

  Array.from(restrictionMap.entries()).forEach(([key, frameMap]) => {
    if (frameMap.size < 2) return;
    const parts = key.split(":");
    const itemType = parts[0] ?? "";
    const itemId = parts[1] ?? "";
    const frameIds = Array.from(frameMap.keys());
    const perFrame = new Map<string, { frameName: string; description: string }>();
    let name = "";
    Array.from(frameMap.entries()).forEach(([fid, { detail, restriction }]) => {
      name = restriction.name;
      const desc =
        restriction.mode === "restricted"
          ? "Restricted (removed)"
          : `Altered: ${restriction.alterationNotes ?? "No notes"}`;
      perFrame.set(fid, { frameName: detail.name, description: desc });
    });
    const workSectionId =
      WORK_SECTIONS.find((ws) => ws.restrictionTypes.includes(itemType))?.id ??
      "characterOptions";
    conflicts.push({
      kind: "restriction",
      key: `restriction:${key}`,
      label: `${name} (${formatContentType(itemType)} Restriction)`,
      itemType,
      itemId,
      frameIds,
      perFrame,
      workSectionId,
    });
  });

  Array.from(contentMap.entries()).forEach(([key, frameMap]) => {
    if (frameMap.size < 2) return;
    const parts = key.split(":");
    const itemType = parts[0] ?? "";
    const itemId = parts[1] ?? "";
    const frameIds = Array.from(frameMap.keys());
    const perFrame = new Map<string, { frameName: string; description: string }>();
    let name = "";
    Array.from(frameMap.entries()).forEach(([fid, { detail, content }]) => {
      name = content.name;
      perFrame.set(fid, {
        frameName: detail.name,
        description: `Homebrew ${formatContentType(content.contentType)}`,
      });
    });
    const workSectionId =
      WORK_SECTIONS.find((ws) => ws.contentTypes.includes(itemType))?.id ??
      "equipmentForge";
    conflicts.push({
      kind: "content",
      key: `content:${key}`,
      label: `${name} (${formatContentType(itemType)} Content)`,
      itemType,
      itemId,
      frameIds,
      perFrame,
      workSectionId,
    });
  });

  Array.from(extensionMap.entries()).forEach(([key, frameMap]) => {
    if (frameMap.size < 2) return;
    const parts = key.split(":");
    const itemType = parts[0] ?? "";
    const slug = parts[1] ?? "";
    const frameIds = Array.from(frameMap.keys());
    const perFrame = new Map<string, { frameName: string; description: string }>();
    let name = "";
    Array.from(frameMap.entries()).forEach(([fid, { detail, extension }]) => {
      name = extension.name;
      perFrame.set(fid, {
        frameName: detail.name,
        description: extension.description ?? "No description",
      });
    });
    const workSectionId =
      WORK_SECTIONS.find((ws) => ws.extensionTypes.includes(itemType))?.id ??
      "worldRules";
    conflicts.push({
      kind: "extension",
      key: `extension:${key}`,
      label: `${name} (${formatExtensionType(itemType)} Extension)`,
      itemType,
      itemId: slug,
      frameIds,
      perFrame,
      workSectionId,
    });
  });

  return conflicts;
}

function buildConflictLookup(conflicts: Conflict[]): ConflictLookup {
  const restrictionConflicts = new Map<string, Conflict>();
  const contentConflicts = new Map<string, Conflict>();
  const extensionConflicts = new Map<string, Conflict>();

  for (const c of conflicts) {
    switch (c.kind) {
      case "restriction":
        restrictionConflicts.set(`${c.itemType}:${c.itemId}`, c);
        break;
      case "content":
        contentConflicts.set(`${c.itemType}:${c.itemId}`, c);
        break;
      case "extension":
        extensionConflicts.set(`${c.itemType}:${c.itemId}`, c);
        break;
    }
  }

  return { restrictionConflicts, contentConflicts, extensionConflicts };
}

// ─── Utility Helpers ────────────────────────────────────────────────────────────

function formatContentType(ct: string): string {
  const map: Record<string, string> = {
    class: "Class",
    ancestry: "Ancestry",
    community: "Community",
    domainCard: "Domain Card",
    weapon: "Weapon",
    armor: "Armor",
    item: "Item",
    consumable: "Consumable",
  };
  return map[ct] ?? ct;
}

function formatExtensionType(et: string): string {
  const map: Record<string, string> = {
    damageType: "Damage Type",
    adversaryType: "Adversary Type",
    condition: "Condition",
    domain: "Domain",
  };
  return map[et] ?? et;
}

function complexityColor(c: FrameComplexityRating): string {
  switch (c) {
    case "low":
      return "text-green-400 border-green-400/30 bg-green-400/10";
    case "moderate":
      return "text-[#577399] border-[#577399]/30 bg-[#577399]/10";
    case "high":
      return "text-amber-400 border-amber-400/30 bg-amber-400/10";
    case "extreme":
      return "text-[#fe5f55] border-[#fe5f55]/30 bg-[#fe5f55]/10";
    default:
      return "text-[#b9baa3] border-[#b9baa3]/30 bg-[#b9baa3]/10";
  }
}

// ─── Inline SVG Icons ───────────────────────────────────────────────────────────

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg className={className ?? "h-4 w-4"} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ChevronRightIcon({ className }: { className?: string }) {
  return (
    <svg className={className ?? "h-4 w-4"} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className ?? "h-3 w-3"} viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <path d="M2.5 6L5 8.5L9.5 3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg className={className ?? "h-4 w-4"} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function InfoIcon({ className }: { className?: string }) {
  return (
    <svg className={className ?? "h-3.5 w-3.5"} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.25" />
      <path d="M8 7v4" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
      <circle cx="8" cy="5.25" r="0.75" fill="currentColor" />
    </svg>
  );
}

function WarningIcon({ className }: { className?: string }) {
  return (
    <svg className={className ?? "h-4 w-4"} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M8 1.5L1 14h14L8 1.5z" stroke="currentColor" strokeWidth="1.25" strokeLinejoin="round" />
      <path d="M8 6v4" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
      <circle cx="8" cy="12" r="0.75" fill="currentColor" />
    </svg>
  );
}

function ExternalLinkIcon({ className }: { className?: string }) {
  return (
    <svg className={className ?? "h-3.5 w-3.5"} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M6.5 3.5H3.5v9h9v-3M9.5 2.5h4v4M13.5 2.5l-6 6" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ─── Complexity Badge ───────────────────────────────────────────────────────────

function ComplexityBadge({ complexity }: { complexity: FrameComplexityRating }) {
  return (
    <span className={`shrink-0 rounded-md border px-2 py-0.5 text-xs font-medium uppercase tracking-wider ${complexityColor(complexity)}`}>
      {complexity}
    </span>
  );
}

// ─── Skeleton Helpers ───────────────────────────────────────────────────────────

function FrameListSkeleton() {
  return (
    <div className="space-y-2" role="status" aria-label="Loading frames">
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-14 w-full rounded-lg bg-slate-700/40 animate-pulse" />
      ))}
      <span className="sr-only">Loading frames...</span>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="space-y-4 animate-pulse" role="status" aria-label="Loading frame details">
      <div className="h-5 w-2/3 rounded bg-slate-700/40" />
      <div className="h-3 w-1/3 rounded bg-slate-700/30" />
      <div className="h-3 w-full rounded bg-slate-700/30" />
      <div className="h-3 w-5/6 rounded bg-slate-700/30" />
      <div className="flex gap-2 pt-2">
        <div className="h-6 w-16 rounded-full bg-slate-700/30" />
        <div className="h-6 w-20 rounded-full bg-slate-700/30" />
        <div className="h-6 w-14 rounded-full bg-slate-700/30" />
      </div>
      <span className="sr-only">Loading frame details...</span>
    </div>
  );
}

// ─── Conflict Item Wrapper ──────────────────────────────────────────────────────

function ConflictItemWrapper({
  conflict,
  frameId,
  children,
}: {
  conflict: Conflict | undefined;
  frameId: string;
  children: React.ReactNode;
}) {
  if (!conflict || !conflict.frameIds.includes(frameId)) {
    return <>{children}</>;
  }

  const otherFrameNames = Array.from(conflict.perFrame.entries())
    .filter(([fid]) => fid !== frameId)
    .map(([, info]) => info.frameName);

  const infoText = `Conflicts with: ${otherFrameNames.join(", ")}. Resolve after creating.`;

  return (
    <div className="relative border-2 border-dashed border-[#fe5f55]/60 rounded-lg p-2">
      {children}
      <div className="mt-1.5 flex items-start gap-1.5 text-sm text-[#fe5f55]">
        <WarningIcon className="h-3.5 w-3.5 shrink-0 mt-0.5" />
        <span>{infoText}</span>
      </div>
    </div>
  );
}

// ─── Collapsible Section ────────────────────────────────────────────────────────

function CollapsibleSection({
  title,
  defaultOpen = false,
  children,
  itemCount,
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
  itemCount: number;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const contentId = useId();

  if (itemCount === 0) return null;

  return (
    <div>
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        aria-expanded={isOpen}
        aria-controls={contentId}
        className="flex items-center gap-2 w-full text-left py-1.5 text-sm font-semibold text-[#b9baa3] hover:text-[#f7f7ff] transition-colors focus:outline-none focus:ring-2 focus:ring-[#577399] rounded"
      >
        {isOpen ? (
          <ChevronDownIcon className="h-3.5 w-3.5 shrink-0" />
        ) : (
          <ChevronRightIcon className="h-3.5 w-3.5 shrink-0" />
        )}
        {title}
        <span className="ml-auto text-sm text-[#b9baa3]/70">{itemCount}</span>
      </button>
      {isOpen && (
        <div id={contentId} className="pl-5 space-y-1.5 pb-2">
          {children}
        </div>
      )}
    </div>
  );
}

// ─── Work Section Panel ─────────────────────────────────────────────────────────

function WorkSectionPanel({
  section,
  detail,
  conflictLookup,
  defaultOpen = false,
}: {
  section: WorkSection;
  detail: CampaignFrameDetail;
  conflictLookup: ConflictLookup;
  defaultOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const sectionId = useId();

  const sectionRestrictions = detail.restrictions.filter((r) =>
    section.restrictionTypes.includes(r.contentType),
  );
  const sectionContents = detail.contents.filter((c) =>
    section.contentTypes.includes(c.contentType),
  );
  const sectionExtensions = detail.extensions.filter((e) =>
    section.extensionTypes.includes(e.extensionType),
  );

  const totalItems =
    sectionRestrictions.length + sectionContents.length + sectionExtensions.length;

  if (totalItems === 0) return null;

  return (
    <div className="border border-slate-700/40 rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        aria-expanded={isOpen}
        aria-controls={sectionId}
        className="flex items-center gap-2 w-full text-left px-3 py-2.5 bg-slate-800/40 hover:bg-slate-800/60 transition-colors focus:outline-none focus:ring-2 focus:ring-[#577399] focus:ring-inset"
      >
        {isOpen ? (
          <ChevronDownIcon className="h-4 w-4 shrink-0 text-[#577399]" />
        ) : (
          <ChevronRightIcon className="h-4 w-4 shrink-0 text-[#577399]" />
        )}
        <span className="text-sm font-semibold text-[#f7f7ff]">{section.label}</span>
        <span className="ml-auto text-sm text-[#b9baa3]/70">{totalItems}</span>
      </button>

      {isOpen && (
        <div id={sectionId} className="px-3 py-3 space-y-4">
          <CollapsibleSection title="SRD Restrictions" itemCount={sectionRestrictions.length}>
            {sectionRestrictions.map((r) => {
              const conflictKey = `${r.contentType}:${r.contentId}`;
              const conflict = conflictLookup.restrictionConflicts.get(conflictKey);
              return (
                <ConflictItemWrapper key={conflictKey} conflict={conflict} frameId={detail.frameId}>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm text-[#f7f7ff]">{r.name}</span>
                    <span className={`rounded-md px-2 py-0.5 text-xs font-medium uppercase tracking-wider ${r.mode === "restricted" ? "bg-[#fe5f55]/15 text-[#fe5f55] border border-[#fe5f55]/30" : "bg-amber-400/15 text-amber-400 border border-amber-400/30"}`}>
                      {r.mode}
                    </span>
                    <span className="text-xs text-[#b9baa3]/70">{formatContentType(r.contentType)}</span>
                  </div>
                  {r.alterationNotes && (
                    <p className="mt-1 text-sm text-[#b9baa3]/80 pl-1">{r.alterationNotes}</p>
                  )}
                </ConflictItemWrapper>
              );
            })}
          </CollapsibleSection>

          <CollapsibleSection title="Homebrew Content" itemCount={sectionContents.length}>
            {sectionContents.map((c) => {
              const conflictKey = `${c.contentType}:${c.contentId}`;
              const conflict = conflictLookup.contentConflicts.get(conflictKey);
              return (
                <ConflictItemWrapper key={conflictKey} conflict={conflict} frameId={detail.frameId}>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm text-[#f7f7ff]">{c.name}</span>
                    <span className="rounded-md border border-[#577399]/30 bg-[#577399]/10 px-2 py-0.5 text-xs font-medium text-[#577399] uppercase tracking-wider">
                      {formatContentType(c.contentType)}
                    </span>
                  </div>
                </ConflictItemWrapper>
              );
            })}
          </CollapsibleSection>

          <CollapsibleSection title="Custom Extensions" itemCount={sectionExtensions.length}>
            {sectionExtensions.map((e) => {
              const conflictKey = `${e.extensionType}:${e.slug}`;
              const conflict = conflictLookup.extensionConflicts.get(conflictKey);
              return (
                <ConflictItemWrapper key={conflictKey} conflict={conflict} frameId={detail.frameId}>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm text-[#f7f7ff]">{e.name}</span>
                    <span className="rounded-md border border-slate-600/40 bg-slate-800/60 px-2 py-0.5 text-xs font-medium text-[#b9baa3] uppercase tracking-wider">
                      {formatExtensionType(e.extensionType)}
                    </span>
                  </div>
                  {e.description && (
                    <p className="mt-1 text-sm text-[#b9baa3]/80 pl-1">{e.description}</p>
                  )}
                </ConflictItemWrapper>
              );
            })}
          </CollapsibleSection>
        </div>
      )}
    </div>
  );
}

// ─── Frame Detail Panel Content ─────────────────────────────────────────────────

function FrameDetailPanelContent({
  frameId,
  detailMap,
  conflictLookup,
}: {
  frameId: string;
  detailMap: Map<string, CampaignFrameDetail>;
  conflictLookup: ConflictLookup;
}) {
  const { data: detail, isLoading, isError } = useFrameDetail(frameId);
  const [overviewExpanded, setOverviewExpanded] = useState(false);

  const resolvedDetail = detailMap.get(frameId) ?? detail;
  const showLoading = isLoading && !resolvedDetail;

  const overviewText = resolvedDetail?.overview ?? "";
  const isOverviewLong = overviewText.length > OVERVIEW_COLLAPSE_THRESHOLD;

  return (
    <>
      {showLoading && <DetailSkeleton />}

      {isError && !resolvedDetail && (
        <p className="text-sm text-[#fe5f55]">Failed to load frame details. Please try again.</p>
      )}

      {resolvedDetail && !showLoading && (
        <>
          {resolvedDetail.author && (
            <p className="text-sm text-[#b9baa3]">by {resolvedDetail.author}</p>
          )}

          {resolvedDetail.pitch && (
            <div className="rounded-xl border border-[#577399]/20 bg-[#577399]/8 px-4 py-3 text-sm text-[#b9baa3]">
              {resolvedDetail.pitch}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3">
            {resolvedDetail.complexity && <ComplexityBadge complexity={resolvedDetail.complexity} />}
            {resolvedDetail.toneAndFeel && (
              <span className="text-sm text-[#b9baa3]">{resolvedDetail.toneAndFeel}</span>
            )}
          </div>

          {overviewText && (
            <section className="space-y-1">
              <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-parchment-500">Overview</h3>
              <p className="text-base leading-relaxed text-[#f7f7ff] whitespace-pre-wrap">
                {isOverviewLong && !overviewExpanded
                  ? `${overviewText.slice(0, OVERVIEW_COLLAPSE_THRESHOLD)}...`
                  : overviewText}
              </p>
              {isOverviewLong && (
                <button
                  type="button"
                  onClick={() => setOverviewExpanded((v) => !v)}
                  className="mt-1 text-sm text-[#577399] hover:text-[#577399]/80 transition-colors focus:outline-none focus:ring-2 focus:ring-[#577399] rounded"
                >
                  {overviewExpanded ? "Show less" : "Show more"}
                </button>
              )}
            </section>
          )}

          {resolvedDetail.themes.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-parchment-500 mb-1.5">Themes</h3>
              <div className="flex flex-wrap gap-1.5">
                {resolvedDetail.themes.map((theme) => (
                  <span key={theme} className="rounded-full border border-[#577399]/30 bg-[#577399]/10 px-2.5 py-0.5 text-xs text-[#577399]">
                    {theme}
                  </span>
                ))}
              </div>
            </div>
          )}

          {resolvedDetail.touchstones.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-parchment-500 mb-1.5">Touchstones</h3>
              <div className="flex flex-wrap gap-1.5">
                {resolvedDetail.touchstones.map((ts) => (
                  <span key={ts} className="rounded-full border border-slate-700/60 bg-slate-800/60 px-2.5 py-0.5 text-xs text-[#b9baa3]">
                    {ts}
                  </span>
                ))}
              </div>
            </div>
          )}

          <section className="space-y-2 rounded-xl border border-[#577399]/20 bg-[#b9baa3]/[0.06] p-4">
            <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-parchment-500">Content</h3>
            {WORK_SECTIONS.map((section) => (
              <WorkSectionPanel
                key={section.id}
                section={section}
                detail={resolvedDetail}
                conflictLookup={conflictLookup}
                defaultOpen={false}
              />
            ))}
          </section>

          <div className="border-t border-[#577399]/25 pt-3 space-y-3">
            <p className="text-sm text-[#b9baa3]">
              {resolvedDetail.restrictions.length} restriction{resolvedDetail.restrictions.length !== 1 ? "s" : ""}
              {" · "}
              {resolvedDetail.contents.length} content item{resolvedDetail.contents.length !== 1 ? "s" : ""}
              {" · "}
              {resolvedDetail.extensions.length} extension{resolvedDetail.extensions.length !== 1 ? "s" : ""}
            </p>
            <Link
              href={`/homebrew/frames/${frameId}`}
              className="inline-flex items-center gap-1.5 text-sm text-[#577399] hover:text-[#577399]/80 transition-colors focus:outline-none focus:ring-2 focus:ring-[#577399] rounded"
            >
              View Full Frame
              <ExternalLinkIcon />
            </Link>
          </div>
        </>
      )}
    </>
  );
}

// ─── Frame Row ──────────────────────────────────────────────────────────────────

function FrameRow({
  frame,
  isSelected,
  isDetailActive,
  onToggleSelect,
  onToggleDetail,
}: {
  frame: CampaignFrameSummary;
  isSelected: boolean;
  isDetailActive: boolean;
  onToggleSelect: () => void;
  onToggleDetail: () => void;
}) {
  return (
    <div
      className={[
        "flex items-center gap-3 rounded-lg border px-4 py-2.5 transition-colors",
        isSelected ? "border-[#577399] bg-[#577399]/10" : "border-slate-700/60 bg-slate-950",
        isDetailActive ? "ring-1 ring-[#577399]/40" : "",
      ].join(" ")}
    >
      <button
        type="button"
        role="checkbox"
        aria-checked={isSelected}
        aria-label={`Select frame: ${frame.name}`}
        onClick={onToggleSelect}
        className="shrink-0 focus:outline-none focus:ring-2 focus:ring-[#577399] rounded"
      >
        <span
          aria-hidden="true"
          className={[
            "flex h-5 w-5 items-center justify-center rounded border transition-colors",
            isSelected
              ? "border-[#577399] bg-[#577399] text-white"
              : "border-slate-600 bg-slate-900 hover:border-slate-500",
          ].join(" ")}
        >
          {isSelected && <CheckIcon />}
        </span>
      </button>

      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-[#f7f7ff] truncate">{frame.name}</p>
      </div>

      {frame.pitch && (
        <span className="hidden sm:block max-w-[200px] truncate text-sm text-[#b9baa3]">
          {frame.pitch}
        </span>
      )}

      {frame.complexity && <ComplexityBadge complexity={frame.complexity} />}

      <button
        type="button"
        onClick={onToggleDetail}
        aria-expanded={isDetailActive}
        aria-label={`${isDetailActive ? "Hide" : "View"} details for ${frame.name}`}
        className={[
          "shrink-0 rounded-lg px-2.5 py-1.5 text-sm transition-colors",
          "focus:outline-none focus:ring-2 focus:ring-[#577399]",
          isDetailActive
            ? "bg-[#577399] text-[#f7f7ff]"
            : "text-[#b9baa3] hover:text-[#577399] hover:bg-slate-800/60",
        ].join(" ")}
      >
        <span className="flex items-center gap-1.5">
          <InfoIcon />
          <span className="hidden sm:inline">{isDetailActive ? "Hide" : "Details"}</span>
        </span>
      </button>
    </div>
  );
}

// ─── Frame Detail Fetcher ───────────────────────────────────────────────────────

function FrameDetailFetcher({
  frameId,
  onDetail,
}: {
  frameId: string;
  onDetail: (frameId: string, detail: CampaignFrameDetail) => void;
}) {
  const { data } = useFrameDetail(frameId);

  useEffect(() => {
    if (data) {
      onDetail(frameId, data);
    }
  }, [data, frameId, onDetail]);

  return null;
}

// ─── Main Page ──────────────────────────────────────────────────────────────────

export default function NewCampaignPage() {
  const router = useRouter();
  const { isAuthenticated, isReady, isLoading: authLoading } = useAuthStore();
  const createMutation = useCreateCampaign();
  const { data: frames, isLoading: framesLoading } = useFrames();

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedFrameIds, setSelectedFrameIds] = useState<Set<string>>(new Set());
  const [isAttaching, setIsAttaching] = useState(false);
  const [framesExpanded, setFramesExpanded] = useState(false);

  // Wizard step
  const [step, setStep] = useState<WizardStep>(1);

  // Frame detail panel state
  const [detailFrameId, setDetailFrameId] = useState<string | null>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);

  // Frame detail cache
  const [detailMap, setDetailMap] = useState<Map<string, CampaignFrameDetail>>(() => new Map());

  // Conflict resolution choices
  const [resolutions, setResolutions] = useState<Map<string, string>>(() => new Map());

  // Submission error
  const [resolveError, setResolveError] = useState<string | null>(null);

  const nameId = useId();
  const descId = useId();
  const nameErrorId = useId();

  const nameInputRef = useRef<HTMLInputElement>(null);
  const step2FocusRef = useRef<HTMLHeadingElement>(null);
  const step3FocusRef = useRef<HTMLHeadingElement>(null);
  const step4FocusRef = useRef<HTMLHeadingElement>(null);

  // Auth guard
  useEffect(() => {
    if (isReady && !isAuthenticated) {
      router.replace("/auth/login");
    }
  }, [isReady, isAuthenticated, router]);

  // Focus management on step change
  useEffect(() => {
    const t = setTimeout(() => {
      switch (step) {
        case 1: nameInputRef.current?.focus(); break;
        case 2: step2FocusRef.current?.focus(); break;
        case 3: step3FocusRef.current?.focus(); break;
        case 4: step4FocusRef.current?.focus(); break;
      }
    }, 50);
    return () => clearTimeout(t);
  }, [step]);

  // Close detail panel when leaving step 2
  useEffect(() => {
    if (step !== 2 && detailFrameId) {
      setDetailFrameId(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  // Body scroll lock for mobile when panel is open
  useEffect(() => {
    if (!detailFrameId) return;
    const mql = window.matchMedia("(min-width: 1024px)");
    if (mql.matches) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [detailFrameId]);

  // Close panel on Escape
  useEffect(() => {
    if (!detailFrameId) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setDetailFrameId(null);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [detailFrameId]);

  // Focus close button when panel opens
  useEffect(() => {
    if (detailFrameId) {
      const timer = setTimeout(() => closeBtnRef.current?.focus(), 50);
      return () => clearTimeout(timer);
    }
  }, [detailFrameId]);

  // Store loaded frame details
  const handleDetailLoaded = useCallback(
    (frameId: string, detail: CampaignFrameDetail) => {
      setDetailMap((prev) => {
        if (prev.get(frameId) === detail) return prev;
        const next = new Map(prev);
        next.set(frameId, detail);
        return next;
      });
    },
    [],
  );

  // Toggle frame selection
  const handleFrameToggle = useCallback((frameId: string) => {
    setSelectedFrameIds((prev) => {
      const next = new Set(prev);
      if (next.has(frameId)) {
        next.delete(frameId);
      } else {
        next.add(frameId);
      }
      return next;
    });
    setResolutions(new Map());
  }, []);

  // Toggle detail panel
  const handleToggleDetail = useCallback((frameId: string) => {
    setDetailFrameId((prev) => (prev === frameId ? null : frameId));
  }, []);

  // Close detail panel
  const handleCloseDetail = useCallback(() => {
    setDetailFrameId(null);
  }, []);

  // Compute conflicts reactively
  const conflicts = useMemo(
    () => detectConflicts(detailMap, selectedFrameIds),
    [detailMap, selectedFrameIds],
  );

  const conflictLookup = useMemo(
    () => buildConflictLookup(conflicts),
    [conflicts],
  );

  // Conflict resolution pick
  const handleResolve = useCallback(
    (conflictKey: string, winnerFrameId: string) => {
      setResolutions((prev) => {
        const next = new Map(prev);
        next.set(conflictKey, winnerFrameId);
        return next;
      });
    },
    [],
  );

  // stepDefs for sidebar
  const stepDefs = useMemo(() => [
    {
      num: 1 as WizardStep,
      label: "Basics",
      locked: false,
      done: name.trim().length > 0,
      summary: name.trim() || null,
    },
    {
      num: 2 as WizardStep,
      label: "Frames",
      locked: false,
      done: true,
      summary: selectedFrameIds.size > 0
        ? `${selectedFrameIds.size} frame${selectedFrameIds.size !== 1 ? "s" : ""}`
        : "No frames",
    },
    {
      num: 3 as WizardStep,
      label: "Conflicts",
      locked: conflicts.length === 0,
      done: conflicts.length > 0 && conflicts.every((c) => resolutions.has(c.key)),
      summary: conflicts.length > 0 ? `${resolutions.size}/${conflicts.length} resolved` : null,
    },
    {
      num: 4 as WizardStep,
      label: "Review",
      locked: false,
      done: false,
      summary: null,
    },
  ], [name, selectedFrameIds, conflicts, resolutions]);

  // Auth loading
  if (!isReady || authLoading || !isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a100d]">
        <div
          aria-label="Loading"
          className="h-8 w-8 animate-spin rounded-full border-2 border-[#577399] border-t-transparent"
        />
      </div>
    );
  }

  const nameValue = name.trim();
  const isNameEmpty = nameValue.length === 0;
  const canSubmit = !isNameEmpty && !createMutation.isPending && !isAttaching;
  const canGoNext1 = name.trim().length > 0;
  const canGoNext3 = conflicts.length === 0 || conflicts.every((c) => resolutions.has(c.key));

  const detailFrameName = detailFrameId
    ? (detailMap.get(detailFrameId)?.name ??
      frames?.find((f) => f.frameId === detailFrameId)?.name ??
      "Frame")
    : "";

  const isPanelOpen = detailFrameId !== null && step === 2;

  const displayFrames = framesExpanded ? (frames ?? []) : (frames ?? []).slice(0, 4);

  // The actual creation + attachment + conflict resolution flow
  const doCreate = async () => {
    if (!canSubmit) return;
    setResolveError(null);
    try {
      const campaign = await createMutation.mutateAsync({
        name: nameValue,
        description: description.trim() || null,
      });

      if (selectedFrameIds.size > 0) {
        setIsAttaching(true);
        try {
          await Promise.allSettled(
            Array.from(selectedFrameIds).map((frameId) =>
              apiClient.post(`/campaigns/${campaign.campaignId}/frames`, { frameId }),
            ),
          );

          if (conflicts.length > 0 && resolutions.size > 0) {
            const resolvePromises: Promise<void>[] = [];
            for (const conflict of conflicts) {
              const winningFrameId = resolutions.get(conflict.key);
              if (!winningFrameId) continue;
              resolvePromises.push(
                apiClient.post<void>(`/campaigns/${campaign.campaignId}/conflicts`, {
                  contentType: conflict.itemType,
                  contentName: conflict.itemId,
                  winningFrameId,
                  competingFrameIds: conflict.frameIds,
                }),
              );
            }
            await Promise.allSettled(resolvePromises);
          }
        } finally {
          setIsAttaching(false);
        }
      }

      router.push(`/campaigns/${campaign.campaignId}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to create campaign.";
      setResolveError(msg);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a100d]">
      {/* Invisible fetchers */}
      {Array.from(selectedFrameIds).map((fid) => (
        <FrameDetailFetcher key={fid} frameId={fid} onDetail={handleDetailLoaded} />
      ))}
      {detailFrameId && !selectedFrameIds.has(detailFrameId) && (
        <FrameDetailFetcher frameId={detailFrameId} onDetail={handleDetailLoaded} />
      )}

      {/* Modal overlay */}
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-2 sm:p-4"
        role="presentation"
      >
        {/* Dialog card */}
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="campaign-wizard-title"
          className="w-full max-w-4xl min-w-0 overflow-hidden rounded-2xl border border-slate-700/60 bg-[#0a100d] shadow-2xl flex flex-col max-h-[92vh]"
        >
          {/* ── ZONE 1: Header ── */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700/40 shrink-0">
            <div>
              <h2
                id="campaign-wizard-title"
                className="font-serif text-xl font-semibold text-[#f7f7ff]"
              >
                New Campaign
              </h2>
              <p className="text-sm text-parchment-500 mt-0.5">
                Step {step} of 4{name.trim() ? ` — ${name.trim()}` : ""}
              </p>
            </div>
            <button
              type="button"
              onClick={() => router.push("/campaigns")}
              aria-label="Cancel and return to campaigns"
              className="h-11 w-11 flex items-center justify-center rounded-lg text-parchment-500 hover:text-[#f7f7ff] focus:outline-none focus:ring-2 focus:ring-[#577399] transition-colors"
            >
              <CloseIcon className="h-5 w-5" />
            </button>
          </div>

          {/* ── ZONE 2: Mobile progress bar ── */}
          <div className="md:hidden px-4 sm:px-6 pt-3 pb-3 shrink-0">
            <div
              className="flex items-center gap-1"
              role="progressbar"
              aria-valuenow={step}
              aria-valuemin={1}
              aria-valuemax={4}
              aria-label={`Step ${step} of 4`}
            >
              {([1, 2, 3, 4] as WizardStep[]).map((i) => (
                <div
                  key={i}
                  aria-hidden="true"
                  className={`h-1 flex-1 rounded-full transition-colors ${i <= step ? "bg-[#577399]" : "bg-slate-700/60"}`}
                />
              ))}
            </div>
            <p className="text-xs text-parchment-500 mt-1">
              Step {step} of 4 · {STEP_NAMES[step]}
            </p>
          </div>

          {/* ── ZONE 3: Content row ── */}
          <div className="flex flex-1 min-h-0 overflow-hidden">

            {/* Main content column */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden min-w-0">

              {/* STEP 1: BASICS */}
              {step === 1 && (
                <div className="p-4 sm:p-6">
                  <div className="max-w-lg mx-auto space-y-6">
                    <div>
                      <h3 className="font-serif text-xl font-semibold text-[#f7f7ff]">
                        Name Your Campaign
                      </h3>
                      <p className="text-sm text-parchment-500 mt-0.5">
                        Give your campaign an identity. You can change these later.
                      </p>
                    </div>

                    <div>
                      <label htmlFor={nameId} className="block text-sm font-semibold text-[#f7f7ff] mb-1.5">
                        Campaign Name{" "}
                        <span className="text-[#fe5f55]" aria-hidden="true">*</span>
                        <span className="sr-only">(required)</span>
                      </label>
                      <input
                        ref={nameInputRef}
                        id={nameId}
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        maxLength={MAX_NAME_LENGTH}
                        required
                        aria-required="true"
                        aria-describedby={isNameEmpty && name !== "" ? nameErrorId : undefined}
                        placeholder='e.g. "The Shattered Realm"'
                        className="w-full rounded-lg border border-slate-700/60 bg-slate-950 px-4 py-2.5 font-serif text-base text-[#f7f7ff] placeholder:text-parchment-500 focus:outline-none focus:ring-2 focus:ring-[#577399] focus:border-[#577399] transition-colors"
                      />
                      <div className="mt-1 flex items-center justify-between">
                        {isNameEmpty && name !== "" ? (
                          <p id={nameErrorId} role="alert" className="text-sm text-[#fe5f55]">
                            Campaign name is required.
                          </p>
                        ) : (
                          <span />
                        )}
                        <span
                          className="text-xs text-parchment-500 ml-auto"
                          aria-label={`${name.length} of ${MAX_NAME_LENGTH} characters`}
                        >
                          {name.length}/{MAX_NAME_LENGTH}
                        </span>
                      </div>
                    </div>

                    <div>
                      <label htmlFor={descId} className="block text-sm font-semibold text-[#f7f7ff] mb-1.5">
                        Description{" "}
                        <span className="font-normal text-parchment-500">(optional)</span>
                      </label>
                      <textarea
                        id={descId}
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        maxLength={MAX_DESCRIPTION_LENGTH}
                        rows={4}
                        placeholder="Tell your players what this campaign is about..."
                        className="w-full rounded-lg border border-slate-700/60 bg-slate-950 px-4 py-2.5 text-sm text-[#f7f7ff] resize-none placeholder:text-parchment-500 focus:outline-none focus:ring-2 focus:ring-[#577399] focus:border-[#577399] transition-colors"
                      />
                      <p
                        className="mt-1 text-right text-xs text-parchment-500"
                        aria-label={`${description.length} of ${MAX_DESCRIPTION_LENGTH} characters`}
                      >
                        {description.length}/{MAX_DESCRIPTION_LENGTH}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 2: FRAMES */}
              {step === 2 && (
                <div className="flex flex-col h-full">
                  {/* Step header */}
                  <div className="px-4 sm:px-6 pt-4 sm:pt-5 pb-3 shrink-0 space-y-2">
                    <h3
                      ref={step2FocusRef}
                      tabIndex={-1}
                      className="font-serif text-xl font-semibold text-[#f7f7ff] focus:outline-none"
                    >
                      Attach Campaign Frames
                    </h3>
                    <p className="text-sm text-parchment-500">
                      Frames customize game content — classes, domains, equipment, and world rules.
                      This is optional; you can add frames later in settings.
                    </p>
                  </div>

                  {/* Split: frame list + inline detail panel */}
                  <div className="flex flex-1 min-h-0 border-t border-slate-700/30 overflow-hidden">

                    {/* LEFT: Frame list */}
                    <div className="flex-1 overflow-y-auto overflow-x-hidden min-w-0 p-4 sm:p-6 space-y-3">
                      {framesLoading && <FrameListSkeleton />}

                      {!framesLoading && (!frames || frames.length === 0) && (
                        <div className="rounded-lg border border-dashed border-slate-700/60 px-4 py-3">
                          <p className="text-sm text-parchment-500">
                            No frames yet.{" "}
                            <Link
                              href="/homebrew/frames/new"
                              className="text-[#577399] hover:text-[#577399]/80 underline underline-offset-2"
                            >
                              Create one
                            </Link>
                            {" "}in the Homebrew Workshop.
                          </p>
                        </div>
                      )}

                      {!framesLoading && frames && frames.length > 0 && (
                        <>
                          {conflicts.length > 0 && (
                            <div
                              role="alert"
                              className="flex items-start gap-2.5 rounded-lg border border-[#fe5f55]/40 bg-[#fe5f55]/10 px-4 py-3"
                            >
                              <WarningIcon className="h-4 w-4 shrink-0 mt-0.5 text-[#fe5f55]" />
                              <p className="text-sm text-[#fe5f55]">
                                {conflicts.length} conflict{conflicts.length !== 1 ? "s" : ""} detected.
                                {" "}You&apos;ll resolve them in the next step.
                              </p>
                            </div>
                          )}

                          <div className="space-y-2">
                            {displayFrames.map((frame) => (
                              <FrameRow
                                key={frame.frameId}
                                frame={frame}
                                isSelected={selectedFrameIds.has(frame.frameId)}
                                isDetailActive={detailFrameId === frame.frameId}
                                onToggleSelect={() => handleFrameToggle(frame.frameId)}
                                onToggleDetail={() => handleToggleDetail(frame.frameId)}
                              />
                            ))}
                          </div>

                          {frames.length > 4 && (
                            <button
                              type="button"
                              onClick={() => setFramesExpanded((v) => !v)}
                              className="text-sm text-[#577399] hover:text-[#577399]/80 transition-colors focus:outline-none focus:ring-2 focus:ring-[#577399] rounded"
                            >
                              {framesExpanded ? "Show fewer" : `Show all ${frames.length} frames`}
                            </button>
                          )}
                        </>
                      )}
                    </div>

                    {/* RIGHT: Inline detail panel (lg+ only) */}
                    {detailFrameId && (
                      <div className="hidden lg:flex flex-col w-80 xl:w-96 shrink-0 border-l border-[#577399]/25 bg-[#0f1713] overflow-hidden">
                        <div className="flex items-center justify-between border-b border-[#577399]/25 px-4 py-3 shrink-0">
                          <div className="min-w-0">
                            <p className="text-xs uppercase tracking-wider text-parchment-500">
                              Frame details
                            </p>
                            <h4 className="font-serif text-base font-semibold text-[#f7f7ff] truncate">
                              {detailFrameName || "Details"}
                            </h4>
                          </div>
                          <button
                            ref={closeBtnRef}
                            type="button"
                            onClick={handleCloseDetail}
                            aria-label="Close detail panel"
                            className="shrink-0 flex h-8 w-8 items-center justify-center rounded-lg border border-[#577399]/30 text-parchment-500 hover:bg-[#577399]/12 hover:text-[#f7f7ff] transition-colors focus:outline-none focus:ring-2 focus:ring-[#577399]"
                          >
                            <CloseIcon className="h-4 w-4" />
                          </button>
                        </div>

                        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
                          <FrameDetailPanelContent
                            key={detailFrameId}
                            frameId={detailFrameId}
                            detailMap={detailMap}
                            conflictLookup={conflictLookup}
                          />
                        </div>

                        <div className="border-t border-[#577399]/25 px-4 py-3 shrink-0">
                          <button
                            type="button"
                            onClick={handleCloseDetail}
                            className="w-full rounded-xl border border-[#577399]/40 bg-[#577399]/15 px-4 py-2.5 text-sm font-semibold text-[#f7f7ff] hover:bg-[#577399]/25 transition-colors focus:outline-none focus:ring-2 focus:ring-[#577399]"
                          >
                            Done
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* STEP 3: CONFLICTS */}
              {step === 3 && (
                <div className="p-4 sm:p-6">
                  <div className="max-w-2xl mx-auto space-y-6">
                    <div>
                      <h3
                        ref={step3FocusRef}
                        tabIndex={-1}
                        className="font-serif text-xl font-semibold text-[#f7f7ff] focus:outline-none"
                      >
                        Resolve Frame Conflicts
                      </h3>
                      <p className="text-sm text-parchment-500 mt-0.5">
                        {conflicts.length} conflict{conflicts.length !== 1 ? "s" : ""} found across
                        your selected frames. Choose which version to keep for each.
                      </p>
                    </div>

                    <div className="space-y-6">
                      {WORK_SECTIONS.map((section) => {
                        const sectionConflicts = conflicts.filter(
                          (c) => c.workSectionId === section.id,
                        );
                        if (!sectionConflicts.length) return null;

                        return (
                          <div
                            key={section.id}
                            className="rounded-xl border border-[#577399]/30 bg-slate-900/80 overflow-hidden"
                          >
                            <div className="px-5 py-3 border-b border-slate-700/40 bg-slate-800/40">
                              <h4 className="font-serif text-base font-semibold text-[#f7f7ff]">
                                {section.label}
                              </h4>
                              <p className="text-sm text-parchment-500 mt-0.5">
                                {section.description}
                              </p>
                            </div>

                            <div className="divide-y divide-slate-700/30">
                              {sectionConflicts.map((conflict) => (
                                <div key={conflict.key} className="px-5 py-4 space-y-3">
                                  <div className="flex items-center gap-2">
                                    <WarningIcon className="h-4 w-4 text-[#fe5f55] shrink-0" />
                                    <p className="text-sm font-semibold text-[#f7f7ff]">
                                      {conflict.label}
                                    </p>
                                  </div>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {conflict.frameIds.map((fid) => {
                                      const info = conflict.perFrame.get(fid);
                                      const isWinner = resolutions.get(conflict.key) === fid;
                                      return (
                                        <label
                                          key={fid}
                                          className={[
                                            "relative flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors",
                                            isWinner
                                              ? "border-[#577399] bg-[#577399]/10"
                                              : "border-slate-700/60 bg-slate-950 hover:border-slate-600",
                                          ].join(" ")}
                                        >
                                          <input
                                            type="radio"
                                            name={`conflict-${conflict.key}`}
                                            value={fid}
                                            checked={isWinner}
                                            onChange={() => handleResolve(conflict.key, fid)}
                                            className="sr-only"
                                          />
                                          <span
                                            aria-hidden="true"
                                            className={[
                                              "shrink-0 mt-0.5 flex h-4 w-4 items-center justify-center rounded-full border-2 transition-colors",
                                              isWinner
                                                ? "border-[#577399] bg-[#577399]"
                                                : "border-slate-600 bg-slate-900",
                                            ].join(" ")}
                                          >
                                            {isWinner && (
                                              <span className="block h-1.5 w-1.5 rounded-full bg-[#f7f7ff]" />
                                            )}
                                          </span>
                                          <div className="min-w-0 flex-1">
                                            <p className="text-sm font-medium text-[#f7f7ff]">
                                              {info?.frameName ?? fid}
                                            </p>
                                            <p className="text-sm text-parchment-500 mt-0.5">
                                              {info?.description ?? "No details available"}
                                            </p>
                                          </div>
                                        </label>
                                      );
                                    })}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {resolveError && (
                      <div
                        role="alert"
                        className="rounded-lg border border-[#fe5f55]/40 bg-[#fe5f55]/10 px-4 py-3"
                      >
                        <p className="text-sm text-[#fe5f55]">{resolveError}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* STEP 4: REVIEW */}
              {step === 4 && (
                <div className="p-4 sm:p-6">
                  <div className="max-w-lg mx-auto space-y-6">
                    <div>
                      <h3
                        ref={step4FocusRef}
                        tabIndex={-1}
                        className="font-serif text-xl font-semibold text-[#f7f7ff] focus:outline-none"
                      >
                        Review &amp; Create
                      </h3>
                      <p className="text-sm text-parchment-500 mt-0.5">
                        Everything looks good? Click Create Campaign to begin.
                      </p>
                    </div>

                    {/* Campaign card */}
                    <div className="rounded-lg border border-slate-700/60 bg-slate-900/40 p-4 space-y-3">
                      <p className="text-xs font-semibold uppercase tracking-wider text-parchment-500">
                        Campaign
                      </p>
                      <div>
                        <p className="text-lg font-serif font-semibold text-[#f7f7ff]">
                          {name.trim()}
                        </p>
                        {description.trim() && (
                          <p className="text-sm text-parchment-500 mt-1 leading-relaxed">
                            {description.trim()}
                          </p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => setStep(1)}
                        className="text-sm text-[#577399] hover:text-[#577399]/80 transition-colors focus:outline-none focus:ring-2 focus:ring-[#577399] rounded"
                      >
                        Edit name &amp; description
                      </button>
                    </div>

                    {/* Frames card */}
                    <div className="rounded-lg border border-slate-700/60 bg-slate-900/40 p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold uppercase tracking-wider text-parchment-500">
                          Frames
                        </p>
                        <button
                          type="button"
                          onClick={() => setStep(2)}
                          className="text-sm text-[#577399] hover:text-[#577399]/80 transition-colors focus:outline-none focus:ring-2 focus:ring-[#577399] rounded"
                        >
                          Edit
                        </button>
                      </div>
                      {selectedFrameIds.size === 0 ? (
                        <p className="text-sm text-parchment-500">No frames selected</p>
                      ) : (
                        <ul className="space-y-1.5">
                          {Array.from(selectedFrameIds).map((fid) => {
                            const frame = frames?.find((f) => f.frameId === fid);
                            const detail = detailMap.get(fid);
                            const complexity = detail?.complexity ?? frame?.complexity;
                            return (
                              <li key={fid} className="flex items-center gap-2">
                                <span className="text-sm font-medium text-[#f7f7ff]">
                                  {detail?.name ?? frame?.name ?? fid}
                                </span>
                                {complexity && <ComplexityBadge complexity={complexity} />}
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </div>

                    {/* Conflicts card */}
                    {conflicts.length > 0 && (
                      <div className="rounded-lg border border-slate-700/60 bg-slate-900/40 p-4 space-y-2">
                        <p className="text-xs font-semibold uppercase tracking-wider text-parchment-500">
                          Conflicts Resolved
                        </p>
                        <p className="text-sm text-[#f7f7ff]">
                          {resolutions.size} of {conflicts.length} resolved
                        </p>
                        {resolutions.size < conflicts.length && (
                          <div className="flex items-start gap-2 text-sm text-[#fe5f55]">
                            <WarningIcon className="h-4 w-4 shrink-0 mt-0.5" />
                            <span>
                              {conflicts.length - resolutions.size} conflict
                              {conflicts.length - resolutions.size !== 1 ? "s" : ""} still unresolved.{" "}
                              <button
                                type="button"
                                onClick={() => setStep(3)}
                                className="underline underline-offset-2 hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-[#577399] rounded"
                              >
                                Resolve now
                              </button>
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Submission error */}
                    {(createMutation.isError || resolveError) && (
                      <div
                        role="alert"
                        className="rounded-lg border border-[#fe5f55]/40 bg-[#fe5f55]/10 px-4 py-3"
                      >
                        <p className="text-sm text-[#fe5f55]">
                          {resolveError ?? createMutation.error?.message ?? "Failed to create campaign."}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

            </div>

            {/* ── Step sidebar (md+) ── */}
            <div className="hidden md:flex flex-col w-40 shrink-0 border-l border-slate-700/40 overflow-y-auto py-3">
              <p className="px-3 pb-2 text-xs font-semibold uppercase tracking-wider text-parchment-500">
                Steps
              </p>
              {stepDefs.map((s) => (
                <button
                  key={s.num}
                  type="button"
                  disabled={s.locked}
                  onClick={() => !s.locked && setStep(s.num)}
                  aria-current={step === s.num ? "step" : undefined}
                  className={[
                    "w-full text-left px-3 py-2.5 transition-colors rounded-none",
                    s.locked
                      ? "opacity-40 cursor-not-allowed border-r-2 border-transparent"
                      : step === s.num
                      ? "bg-[#577399]/15 border-r-2 border-[#577399]"
                      : "hover:bg-slate-800/40 border-r-2 border-transparent",
                  ].join(" ")}
                >
                  <div className="flex items-center gap-1.5">
                    <span className={`text-xs shrink-0 ${s.done ? "text-[#577399]" : "text-parchment-500"}`}>
                      {s.done ? <CheckIcon className="h-3 w-3" /> : `${s.num}.`}
                    </span>
                    <span
                      className={`text-xs font-medium truncate ${step === s.num ? "text-[#f7f7ff]" : "text-parchment-500"}`}
                    >
                      {s.label}
                    </span>
                  </div>
                  {s.summary && (
                    <p className="text-xs text-parchment-500 truncate pl-4 mt-0.5 leading-tight">
                      {s.summary}
                    </p>
                  )}
                </button>
              ))}
            </div>

          </div>

          {/* ── ZONE 4: Footer nav ── */}
          <div className="shrink-0 border-t border-slate-700/40 px-3 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-2 sm:gap-4 flex-wrap">
            {/* Left: Cancel / Back */}
            <button
              type="button"
              onClick={() => {
                if (step === 1) {
                  router.push("/campaigns");
                } else {
                  setStep(prevStepFor(step, conflicts.length > 0));
                }
              }}
              className="rounded-lg px-4 py-3 text-base font-medium min-h-[44px] border border-slate-700/60 text-parchment-500 hover:border-slate-600 hover:text-[#f7f7ff] transition-colors focus:outline-none focus:ring-2 focus:ring-[#577399]"
            >
              {step === 1 ? "Cancel" : "← Back"}
            </button>

            {/* Right: Next / Create Campaign */}
            <div className="flex gap-3">
              {step < 4 && (
                <button
                  type="button"
                  onClick={() => setStep(nextStepFor(step, conflicts.length > 0))}
                  disabled={(step === 1 && !canGoNext1) || (step === 3 && !canGoNext3)}
                  className="rounded-lg px-6 py-3 font-semibold text-base min-h-[44px] bg-[#577399] text-[#f7f7ff] hover:bg-[#577399]/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-[#577399] focus:ring-offset-2 focus:ring-offset-[#0a100d]"
                >
                  {step === 2 && conflicts.length > 0
                    ? `Next — Resolve ${conflicts.length} Conflict${conflicts.length !== 1 ? "s" : ""} →`
                    : "Next →"}
                </button>
              )}
              {step === 4 && (
                <button
                  type="button"
                  onClick={doCreate}
                  disabled={
                    !canSubmit ||
                    (conflicts.length > 0 && !conflicts.every((c) => resolutions.has(c.key)))
                  }
                  aria-label={
                    conflicts.length > 0 && !conflicts.every((c) => resolutions.has(c.key))
                      ? "Resolve all remaining conflicts to continue"
                      : "Create campaign"
                  }
                  className="rounded-lg px-6 py-3 font-semibold text-base min-h-[44px] bg-[#577399] text-[#f7f7ff] hover:bg-[#577399]/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-[#577399] focus:ring-offset-2 focus:ring-offset-[#0a100d]"
                >
                  {createMutation.isPending || isAttaching ? (
                    <span className="flex items-center gap-2">
                      <span
                        aria-hidden="true"
                        className="h-3.5 w-3.5 animate-spin rounded-full border border-[#f7f7ff] border-t-transparent"
                      />
                      <span aria-hidden="true">
                        {isAttaching ? "Attaching frames..." : "Creating..."}
                      </span>
                      <span className="sr-only">Creating campaign...</span>
                    </span>
                  ) : (
                    "Create Campaign ✦"
                  )}
                </button>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* ── Mobile slide-in detail panel (canonical EditSidebar pattern) ── */}
      {isPanelOpen && (
        <div
          aria-hidden="true"
          onClick={handleCloseDetail}
          className="fixed inset-0 z-[60] bg-slate-950/60 backdrop-blur-sm lg:hidden transition-opacity duration-300"
        />
      )}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="frame-detail-heading"
        aria-hidden={!isPanelOpen}
        inert={!isPanelOpen ? ("" as unknown as boolean) : undefined}
        className={[
          "fixed inset-y-0 right-0 z-[70] flex h-full w-full max-w-[28rem] flex-col py-12",
          "border-l border-[#577399]/35 bg-[#0f1713] shadow-2xl",
          "transition-transform duration-300 ease-in-out",
          isPanelOpen ? "translate-x-0" : "translate-x-full",
        ].join(" ")}
      >
        <div className="flex items-center justify-between border-b border-[#577399]/25 px-4 py-4 sm:px-5">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-parchment-500">
              Frame details
            </p>
            <h2
              id="frame-detail-heading"
              className="font-serif text-lg font-semibold text-[#f7f7ff]"
            >
              {detailFrameName || "Details"}
            </h2>
          </div>
          <button
            type="button"
            onClick={handleCloseDetail}
            aria-label="Close detail panel"
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#577399]/30 text-parchment-500 transition-colors hover:bg-[#577399]/12 hover:text-[#f7f7ff] focus:outline-none focus:ring-2 focus:ring-[#577399]"
          >
            <CloseIcon />
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-4 py-5 sm:px-5">
          {detailFrameId && (
            <FrameDetailPanelContent
              key={detailFrameId}
              frameId={detailFrameId}
              detailMap={detailMap}
              conflictLookup={conflictLookup}
            />
          )}
        </div>

        <div className="border-t border-[#577399]/25 px-4 py-4 sm:px-5">
          <button
            type="button"
            onClick={handleCloseDetail}
            className="w-full rounded-xl border border-[#577399]/40 bg-[#577399]/15 px-4 py-3 text-sm font-semibold text-[#f7f7ff] transition-colors hover:bg-[#577399]/25 focus:outline-none focus:ring-2 focus:ring-[#577399]"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
