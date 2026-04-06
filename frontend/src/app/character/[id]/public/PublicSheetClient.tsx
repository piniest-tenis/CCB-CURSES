"use client";

/**
 * src/app/character/[id]/public/PublicSheetClient.tsx
 *
 * Fully-explorable public character sheet, linked from the Twitch overlay.
 * Token-gated (no auth required — the share JWT is validated server-side).
 *
 * Sections:
 *   1. Hero header — portrait, name (prominent), class/subclass/ancestry/community,
 *      level, domains (each a link to the wiki page), conditions
 *   2. Core stats + evasion / armor (derived)
 *   3. Resource trackers — HP, Stress, Armor, Hope, Proficiency
 *   4. Damage thresholds (Major / Severe per SRD p.20)
 *   5. Domain loadout — expandable cards with descriptions, curse text,
 *      and links to the domain wiki page
 *   6. Experiences
 *   7. Inventory + Gold
 *   8. Companion (if present)
 *   9. Downtime projects
 *  10. Notes (markdown)
 *  11. Footer with "create your own" CTA and overlay setup instructions
 *
 * PRIVACY: userId and email are NEVER shown. Only character-sheet fields
 * that a player would willingly share at a table are rendered.
 */

import React, { Suspense, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import type {
  Character,
  ClassData,
  CoreStatName,
  DomainCard,
} from "@shared/types";
import { computeTraitModifiers } from "@/hooks/useTraitModifiers";

// ─── Public API fetcher (no auth, bypasses apiClient to avoid global 401 redirect) ──

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

async function fetchPublic<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: { Accept: "application/json" },
  });
  const json = await res.json();
  if (!res.ok) {
    const msg = json?.error?.message ?? `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return (json as { data: T }).data;
}
import { MarkdownContent } from "@/components/MarkdownContent";

// ─── Constants ────────────────────────────────────────────────────────────────

const DOMAIN_STYLES: Record<string, React.CSSProperties> = {
  Artistry: {
    color: "#e9d5ff",
    borderColor: "rgba(167,139,250,0.55)",
    background: "rgba(88,28,135,0.22)",
  },
  Charm: {
    color: "#fce7f3",
    borderColor: "rgba(244,114,182,0.50)",
    background: "rgba(131,24,67,0.20)",
  },
  Creature: {
    color: "#bbf7d0",
    borderColor: "rgba(74,222,128,0.45)",
    background: "rgba(20,83,45,0.22)",
  },
  Faithful: {
    color: "#fef9c3",
    borderColor: "rgba(251,191,36,0.50)",
    background: "rgba(120,53,15,0.22)",
  },
  Oddity: {
    color: "#a5f3fc",
    borderColor: "rgba(34,211,238,0.40)",
    background: "rgba(14,116,144,0.18)",
  },
  Study: {
    color: "#bae6fd",
    borderColor: "rgba(56,189,248,0.50)",
    background: "rgba(12,74,110,0.22)",
  },
  Thievery: {
    color: "#fed7aa",
    borderColor: "rgba(251,146,60,0.50)",
    background: "rgba(154,52,18,0.20)",
  },
  Trickery: {
    color: "#bef264",
    borderColor: "rgba(163,230,53,0.50)",
    background: "rgba(54,83,20,0.20)",
  },
  Valiance: {
    color: "#fecaca",
    borderColor: "rgba(239,68,68,0.55)",
    background: "rgba(153,27,27,0.22)",
  },
  Violence: {
    color: "#fda4af",
    borderColor: "rgba(244,63,94,0.50)",
    background: "rgba(136,19,55,0.20)",
  },
  Weird: {
    color: "#a5b4fc",
    borderColor: "rgba(129,140,248,0.55)",
    background: "rgba(49,46,129,0.20)",
  },
};

function domainStyle(domain: string): React.CSSProperties {
  return (
    DOMAIN_STYLES[domain] ?? {
      color: "#fef9c3",
      borderColor: "rgba(251,191,36,0.35)",
      background: "rgba(120,53,15,0.15)",
    }
  );
}

// Domain left-border accent colors for DomainCardTile
const DOMAIN_ACCENT: Record<string, string> = {
  Artistry: "rgba(167,139,250,0.80)",
  Charm: "rgba(244,114,182,0.75)",
  Creature: "rgba(74,222,128,0.70)",
  Faithful: "rgba(251,191,36,0.80)",
  Oddity: "rgba(34,211,238,0.70)",
  Study: "rgba(56,189,248,0.75)",
  Thievery: "rgba(251,146,60,0.75)",
  Trickery: "rgba(163,230,53,0.75)",
  Valiance: "rgba(239,68,68,0.70)",
  Violence: "rgba(244,63,94,0.70)",
  Weird: "rgba(129,140,248,0.80)",
};

function domainAccent(domain: string): string {
  return DOMAIN_ACCENT[domain] ?? "rgba(251,191,36,0.65)";
}

// Keep domainClasses for DomainCardTile level badge colouring
const DOMAIN_TEXT: Record<string, string> = {
  Artistry: "text-purple-300  border-purple-700  bg-purple-950/20",
  Charm: "text-pink-300    border-pink-700    bg-pink-950/20",
  Creature: "text-green-300   border-green-700   bg-green-950/20",
  Faithful: "text-yellow-300  border-yellow-700  bg-yellow-950/20",
  Oddity: "text-teal-300    border-teal-700    bg-teal-950/20",
  Study: "text-blue-300    border-blue-700    bg-blue-950/20",
  Thievery: "text-orange-300  border-orange-700  bg-orange-950/20",
  Trickery: "text-lime-300    border-lime-700    bg-lime-950/20",
  Valiance: "text-red-300     border-red-700     bg-red-950/20",
  Violence: "text-rose-300    border-rose-800    bg-rose-950/20",
  Weird: "text-indigo-300  border-indigo-700  bg-indigo-950/20",
};

function domainClasses(domain: string): string {
  return DOMAIN_TEXT[domain] ?? "text-gold-300 border-gold-700 bg-gold-950/20";
}

// ─── Divider ──────────────────────────────────────────────────────────────────

const DIVIDER_MAP: Partial<Record<CoreStatName, string>> = {
  presence: "/images/ui-elements/divider-presence-agility.svg",
  agility: "/images/ui-elements/divider-presence-agility.svg",
  strength: "/images/ui-elements/divider-strength-finesse.svg",
  finesse: "/images/ui-elements/divider-strength-finesse.svg",
  knowledge: "/images/ui-elements/divider-knowledge-instinct.svg",
  instinct: "/images/ui-elements/divider-knowledge-instinct.svg",
};

function SheetDivider({
  spellcastTrait,
}: {
  spellcastTrait?: CoreStatName | null;
}) {
  const src = spellcastTrait ? DIVIDER_MAP[spellcastTrait] : null;
  if (!src) {
    return (
      <div className="border-t border-[#577399]/15 my-1" aria-hidden="true" />
    );
  }
  return (
    <div className="my-1 w-full overflow-hidden" aria-hidden="true">
      <img
        src={src}
        alt=""
        className="w-full object-contain opacity-70"
        draggable={false}
        style={{ maxHeight: 48 }}
      />
    </div>
  );
}

// ─── Lightweight stat tooltip for the public sheet ────────────────────────────

interface PublicTooltipLine {
  label: string;
  value: string;
  isTotal?: boolean;
}

function PublicStatTooltip({
  lines,
  ariaLabel,
  children,
}: {
  lines: PublicTooltipLine[];
  ariaLabel?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(false);
  const triggerRef = React.useRef<HTMLDivElement>(null);
  const popoverRef = React.useRef<HTMLDivElement>(null);
  const popoverId = React.useId();
  const inPopover = React.useRef(false);

  const handleMouseEnter = () => setOpen(true);
  const handleMouseLeave = () => {
    setTimeout(() => {
      if (!inPopover.current) setOpen(false);
    }, 80);
  };

  // Close on click-outside (mobile)
  React.useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (
        triggerRef.current?.contains(target) ||
        popoverRef.current?.contains(target)
      )
        return;
      setOpen(false);
    };
    document.addEventListener("mousedown", handler, true);
    document.addEventListener("touchstart", handler, true);
    return () => {
      document.removeEventListener("mousedown", handler, true);
      document.removeEventListener("touchstart", handler, true);
    };
  }, [open]);

  return (
    <div
      ref={triggerRef}
      className="relative cursor-default select-none"
      aria-describedby={open ? popoverId : undefined}
      aria-label={ariaLabel}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onTouchStart={() => setOpen((prev) => !prev)}
    >
      {children}
      {open && (
        <div
          ref={popoverRef}
          id={popoverId}
          role="tooltip"
          onMouseEnter={() => { inPopover.current = true; }}
          onMouseLeave={() => { inPopover.current = false; setOpen(false); }}
          className="
            absolute bottom-full left-1/2 mb-2 z-50
            -translate-x-1/2
            w-56
            rounded-lg border border-[#577399]/40 bg-slate-900 shadow-xl
            text-[#f7f7ff] text-xs
          "
        >
          <span
            aria-hidden="true"
            className="
              absolute -bottom-1.5 left-1/2 -translate-x-1/2
              h-3 w-3 rotate-45
              border-b border-r border-[#577399]/40 bg-slate-900
            "
          />
          <dl className="p-3 space-y-1.5">
            {lines.map((line, i) => (
              <div
                key={i}
                className={[
                  "flex items-baseline justify-between gap-2",
                  line.isTotal ? "mt-1.5 pt-1.5 border-t border-[#577399]/30" : "",
                ].join(" ")}
              >
                <dt className={line.isTotal ? "text-[#b9cfe8] font-semibold" : "text-[#b9baa3]"}>
                  {line.label}
                </dt>
                <dd
                  className={[
                    "tabular-nums font-mono shrink-0",
                    line.isTotal ? "text-[#f7f7ff] font-bold" : "text-[#f7f7ff]",
                  ].join(" ")}
                >
                  {line.value}
                </dd>
              </div>
            ))}
          </dl>
          <p className="px-3 pb-2.5 text-[11px] text-[#577399] border-t border-[#577399]/20 pt-1.5">
            SRD p. 3, 23, 29
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Stat card (read-only, mirrors builder's SVG card art) ────────────────────

const STAT_CARD_IMAGES: Record<CoreStatName, string> = {
  agility: "/images/ui-elements/agility-card.svg",
  strength: "/images/ui-elements/strength-card.svg",
  finesse: "/images/ui-elements/finesse-card.svg",
  instinct: "/images/ui-elements/instinct-card.svg",
  presence: "/images/ui-elements/presence-card.svg",
  knowledge: "/images/ui-elements/knowledge-card.svg",
};

const STAT_LABELS_FULL: Record<CoreStatName, string> = {
  agility: "Agility",
  strength: "Strength",
  finesse: "Finesse",
  instinct: "Instinct",
  presence: "Presence",
  knowledge: "Knowledge",
};

function StatCard({
  name,
  value,
  modTotal,
  modEntries,
}: {
  name: CoreStatName;
  value: number;
  modTotal?: number;
  modEntries?: { source: string; value: number }[];
}) {
  const label = STAT_LABELS_FULL[name];
  const cardImage = STAT_CARD_IMAGES[name];
  const total = modTotal ?? 0;
  const effectiveValue = value + total;
  const hasModifier = total !== 0;
  const isPenalty = total < 0;
  const isBonus = total > 0;

  // Nameplate — always white bg, left-border accent for modifier status
  const nameplateStyle: React.CSSProperties = isPenalty
    ? { background: "#f7f7ff", borderLeftWidth: "3px", borderLeftColor: "#f87171" }
    : isBonus
    ? { background: "#f7f7ff", borderLeftWidth: "3px", borderLeftColor: "#2dd4bf" }
    : { background: "#f7f7ff" };

  const nameplateColor = isPenalty
    ? "#dc2626"
    : isBonus
    ? "#0d9488"
    : "#0a100d";

  // Value color on the card face
  const valueColor = isPenalty
    ? "#dc2626"
    : isBonus
    ? "#0f766e"
    : "#0a100d";

  const card = (
    <div
      className="flex flex-col items-center"
      aria-label={`${label}: ${effectiveValue >= 0 ? "+" : ""}${effectiveValue}${hasModifier ? ` (base ${value >= 0 ? "+" : ""}${value}, modifier ${total >= 0 ? "+" : ""}${total})` : ""}`}
    >
      <div className="flex flex-col items-center w-full">
        {/* Card art with value */}
        <div
          className="relative w-full rounded-t-xl shadow-card overflow-hidden"
          style={{
            backgroundImage: `url(${cardImage})`,
            backgroundSize: "contain",
            backgroundRepeat: "no-repeat",
            backgroundPosition: "center",
            aspectRatio: "521.87 / 865.9",
          }}
          aria-hidden="true"
        >
          {/* Value centered in the card body */}
          <div className="absolute inset-0 flex items-center justify-center">
            <span
              className="font-bold leading-none select-none"
              style={{
                fontFamily: "'jetsam-collection-basilea', serif",
                fontSize: "6rem",
                color: valueColor,
                filter: "drop-shadow(0 1px 0 rgba(249,236,216,0.6))",
                transform: "translateY(-1.5rem)",
                display: "block",
              }}
            >
              {effectiveValue >= 0 ? `+${effectiveValue}` : effectiveValue}
            </span>
          </div>
        </div>
        {/* Label tab */}
        <div
          className="w-full rounded-b-xl border border-t-0 px-1 py-1"
          style={nameplateStyle}
          aria-hidden="true"
        >
          <span
            className="block text-center text-sm font-semibold leading-tight tracking-wide"
            style={{ color: nameplateColor }}
          >
            {label}
            {hasModifier && (
              <span style={{ marginLeft: "0.2em", fontSize: "0.75em", opacity: 0.8 }}>
                ({isPenalty ? "▾" : "▴"}{Math.abs(total)})
              </span>
            )}
          </span>
        </div>
      </div>
    </div>
  );

  // Wrap in tooltip when modified
  if (hasModifier && modEntries && modEntries.length > 0) {
    const lines = [
      { label: `Base ${label}`, value: String(value) },
      ...modEntries.map((e) => ({
        label: e.source,
        value: e.value >= 0 ? `+${e.value}` : String(e.value),
      })),
      {
        label: `= Effective ${label}`,
        value: String(effectiveValue),
        isTotal: true as const,
      },
    ];
    return (
      <PublicStatTooltip lines={lines} ariaLabel={`${label} breakdown`}>
        {card}
      </PublicStatTooltip>
    );
  }

  return card;
}

// ─── Data fetching ────────────────────────────────────────────────────────────

const POLL_INTERVAL_MS = 30_000; // refresh character data every 30 s

function useSharedCharacter(characterId: string, token: string | null) {
  return useQuery<Character>({
    queryKey: ["shared-character", characterId, token],
    queryFn: () =>
      fetchPublic<Character>(
        `/characters/${characterId}/view?token=${encodeURIComponent(token ?? "")}`,
      ),
    enabled: Boolean(characterId) && Boolean(token),
    retry: false,
    staleTime: POLL_INTERVAL_MS,
    refetchInterval: POLL_INTERVAL_MS,
    refetchIntervalInBackground: true,
  });
}

// Fetch class data to resolve spellcast trait for dividers.
function usePublicClassData(classId: string | undefined) {
  return useQuery<ClassData>({
    queryKey: ["public-class-data", classId],
    queryFn: () =>
      fetchPublic<ClassData>(`/classes/${encodeURIComponent(classId!)}`),
    enabled: Boolean(classId),
    staleTime: 10 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    retry: false,
  });
}

// Fetch the full card objects for each loadout entry.
// Loadout entries are "Domain/cardId" strings — the domain name is embedded,
// so we never need character.domains (which may be empty on older records).
function useDomainCards(loadout: string[]): {
  cards: DomainCard[];
  loading: boolean;
} {
  // Derive the unique set of domain names from the loadout strings.
  const domainsInLoadout = Array.from(
    new Set(loadout.map((entry) => entry.split("/")[0]).filter(Boolean)),
  );

  const queries = useQuery<DomainCard[]>({
    queryKey: ["domain-cards-for-loadout", loadout],
    queryFn: async () => {
      if (loadout.length === 0) return [];
      // Fetch each required domain in parallel.
      const domainFetches = await Promise.allSettled(
        domainsInLoadout.map((d) =>
          fetchPublic<{ domain: string; cards: DomainCard[] }>(
            `/domains/${encodeURIComponent(d)}`,
          ).then((r) => r.cards),
        ),
      );
      const allCards: DomainCard[] = domainFetches.flatMap((r) =>
        r.status === "fulfilled" ? r.value : [],
      );
      // Return cards in loadout order, matched by "Domain/cardId".
      return loadout
        .map((entry) => {
          const [, cardId] = entry.split("/");
          return allCards.find((c) => c.cardId === cardId);
        })
        .filter((c): c is DomainCard => Boolean(c));
    },
    enabled: loadout.length > 0,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
  return { cards: queries.data ?? [], loading: queries.isLoading };
}

// ─── Reusable display components ─────────────────────────────────────────────

function SectionCard({
  title,
  children,
  className = "",
  style,
}: {
  title?: string;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={`rounded-xl p-5 relative overflow-hidden ${className}`}
      style={{
        border: "1px solid rgba(142,30,62,0.45)",
        background:
          "linear-gradient(145deg, rgba(21,30,45,0.95) 0%, rgba(15,23,42,0.98) 60%, rgba(10,16,30,1) 100%)",
        boxShadow:
          "0 2px 8px rgba(0,0,0,0.4), 0 0 0 1px rgba(251,191,36,0.04), inset 0 1px 0 rgba(255,255,255,0.03)",
        ...style,
      }}
    >
      {title && (
        <div className="mb-4 flex items-center gap-2.5">
          {/* Left accent bar */}
          <div
            aria-hidden="true"
            className="shrink-0 rounded-full"
            style={{
              width: "3px",
              height: "18px",
              background:
                "linear-gradient(180deg, #fbbf24 0%, rgba(212,169,74,0.30) 100%)",
              boxShadow: "0 0 6px rgba(251,191,36,0.40)",
            }}
          />
          <h2
            className="font-serif-sc text-base font-semibold tracking-widest pb-1"
            style={{
              color: "#d4a94a",
              background:
                "linear-gradient(90deg, rgba(251,191,36,0.06) 0%, transparent 70%)",
              borderBottom: "1px solid",
              borderImageSource:
                "linear-gradient(90deg, rgba(251,191,36,0.45) 0%, rgba(251,191,36,0.10) 55%, transparent 100%)",
              borderImageSlice: "1",
              paddingLeft: "4px",
              paddingRight: "12px",
              textShadow: "0 0 12px rgba(251,191,36,0.25)",
              display: "inline-block",
            }}
          >
            {title}
          </h2>
        </div>
      )}
      {children}
    </div>
  );
}

function SlotRow({
  label,
  marked,
  max,
  filledStyle,
}: {
  label: string;
  marked: number;
  max: number;
  filledStyle?: React.CSSProperties;
}) {
  const defaultFilledStyle: React.CSSProperties = {
    background: "linear-gradient(135deg, #cb2d56 0%, #8e1e3e 100%)",
    border: "1.5px solid #cb2d56",
    boxShadow:
      "0 0 8px rgba(203,45,86,0.40), inset 0 1px 0 rgba(255,255,255,0.10)",
  };
  return (
    <div className="flex items-center gap-3">
      <span
        className="w-24 font-serif-sc text-xs tracking-widest"
        style={{ color: "#e8c96d" }}
      >
        {label}
      </span>
      <div
        className="flex gap-1.5"
        role="meter"
        aria-valuenow={marked}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-label={`${label}: ${marked} of ${max}`}
      >
        {Array.from({ length: max }).map((_, i) => (
          <span
            key={i}
            aria-hidden="true"
            className="h-5 w-5 rounded-[4px] transition-all duration-150"
            style={
              i < marked
                ? (filledStyle ?? defaultFilledStyle)
                : {
                    background: "rgba(30,42,62,0.85)",
                    border: "1.5px solid rgba(142,30,62,0.90)",
                    boxShadow:
                      "inset 0 1px 3px rgba(0,0,0,0.5), inset 0 -1px 0 rgba(255,255,255,0.03)",
                  }
            }
          />
        ))}
      </div>
      <span
        className="text-sm font-semibold"
        style={{ color: "#d4a94a" }}
        aria-hidden="true"
      >
        {marked}/{max}
      </span>
    </div>
  );
}

// ─── Expandable domain card tile (with wiki links) ────────────────────────────

function DomainCardTile({
  card,
  characterDomains,
}: {
  card: DomainCard;
  characterDomains: string[];
}) {
  const [expanded, setExpanded] = useState(false);
  const bodyId = `pub-card-body-${card.cardId}`;

  // Find which domain this card belongs to so we can link the wiki page.
  const cardDomain =
    characterDomains.find(
      (d) => d.toLowerCase() === card.domain?.toLowerCase(),
    ) ?? card.domain;

  const colour = domainClasses(cardDomain).split(" ");

  return (
    <div
      className="relative rounded-[10px] overflow-hidden transition-all duration-200 focus-within:ring-2 focus-within:ring-[#fbbf24]"
      style={{
        boxShadow: card.isCursed
          ? "inset 0 0 0 1px rgba(178,38,78,0.60), 0 1px 4px rgba(0,0,0,0.35)"
          : "inset 0 0 0 1px rgba(71,85,105,0.40), 0 1px 4px rgba(0,0,0,0.35)",
        background: `linear-gradient(105deg, ${domainStyle(cardDomain).background as string} 0%, rgba(15,23,42,0.60) 100%)`,
      }}
    >
      {/* Domain left accent bar */}
      <div
        aria-hidden="true"
        className="absolute left-0 top-0 bottom-0 rounded-l-[10px]"
        style={{
          width: "3px",
          background: `linear-gradient(180deg, ${domainAccent(cardDomain)} 0%, rgba(0,0,0,0) 100%)`,
          opacity: card.isCursed ? 0.6 : 1,
        }}
      />
      {/* Header row */}
      <button
        onClick={() => setExpanded((e) => !e)}
        aria-expanded={expanded}
        aria-controls={bodyId}
        className="w-full flex items-start justify-between gap-3 px-4 py-3 text-left transition-colors duration-200 focus:outline-none hover:[background:rgba(203,45,86,0.07)] active:[background:rgba(203,45,86,0.12)]"
      >
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
            <span className="font-semibold text-base text-parchment-100">
              {card.name}
            </span>
            {/* Level badge */}
            <span
              className={`
                rounded border px-1.5 py-0.5 text-xs font-medium
                ${colour[0] ?? "text-gold-400"} ${colour[1] ?? "border-gold-700"}
              `}
            >
              Lv {card.level}
            </span>
            {/* Recall cost */}
            {card.recallCost > 0 && (
              <span className="rounded border border-slate-700 px-1.5 py-0.5 text-xs text-parchment-600">
                Recall {card.recallCost}
              </span>
            )}
            {/* Type badges */}
            {card.isCursed && (
              <span className="rounded border border-burgundy-700 bg-burgundy-950/40 px-1.5 py-0.5 text-xs text-burgundy-300">
                ★ Cursed
              </span>
            )}
            {card.isLinkedCurse && (
              <span className="rounded border border-indigo-700 bg-indigo-950/40 px-1.5 py-0.5 text-xs text-indigo-300">
                ↔ Linked
              </span>
            )}
            {card.isGrimoire && (
              <span className="rounded border border-teal-700 bg-teal-950/40 px-1.5 py-0.5 text-xs text-teal-300">
                Grimoire
              </span>
            )}
          </div>
          {/* Domain link (wiki) */}
          {cardDomain && (
            <Link
              href={`/domains/${encodeURIComponent(cardDomain)}`}
              onClick={(e) => e.stopPropagation()}
              className={`
                text-xs font-medium underline underline-offset-2
                ${colour[0] ?? "text-gold-400"}
                hover:opacity-80 transition-opacity
                focus:outline-none focus:ring-1 focus:ring-[#fbbf24] rounded
              `}
              aria-label={`Go to ${cardDomain} domain wiki`}
            >
              {cardDomain} domain ↗
            </Link>
          )}
        </div>
        <span
          aria-hidden="true"
          className="shrink-0 select-none mt-0.5 transition-transform duration-200"
          style={{ color: "#b45309" }}
        >
          {expanded ? "▲" : "▼"}
        </span>
      </button>

      {/* Expanded body */}
      {expanded && (
        <div
          id={bodyId}
          className="px-4 pb-4 pt-3 space-y-3 border-t"
          style={{
            borderColor: "rgba(71,85,105,0.25)",
            background: "rgba(8,13,23,0.30)",
          }}
        >
          {/* Description */}
          {!card.isGrimoire && card.description && (
            <div style={{ color: "#d4a94a" }}>
              <MarkdownContent className="text-base leading-relaxed">
                {card.description}
              </MarkdownContent>
            </div>
          )}

          {/* Grimoire sub-abilities */}
          {card.isGrimoire && card.grimoire.length > 0 && (
            <div className="space-y-3">
              {card.grimoire.map((ability) => (
                <div
                  key={ability.name}
                  className="rounded border border-teal-900/50 bg-teal-950/10 px-3 py-2"
                >
                  <p className="text-sm font-semibold text-teal-300 mb-1">
                    {ability.name}
                  </p>
                  <MarkdownContent className="text-base text-parchment-400 leading-relaxed">
                    {ability.description}
                  </MarkdownContent>
                </div>
              ))}
            </div>
          )}

          {/* Curse text */}
          {card.isCursed && card.curseText && (
            <div className="rounded border border-burgundy-800/60 bg-burgundy-950/20 px-3 py-2">
              <p className="text-sm font-semibold text-burgundy-400 mb-1">
                Curse
              </p>
              <MarkdownContent
                className="text-base text-burgundy-300 leading-relaxed"
                linkClassName="underline decoration-burgundy-500/60 hover:decoration-burgundy-400 text-burgundy-200 hover:text-burgundy-100 transition-colors"
              >
                {card.curseText}
              </MarkdownContent>
            </div>
          )}

          {/* Linked cards */}
          {card.isLinkedCurse && card.linkedCardIds.length > 0 && (
            <p className="text-sm text-parchment-600">
              <span className="font-medium text-parchment-500">
                Linked to:{" "}
              </span>
              {card.linkedCardIds.join(", ")}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Full sheet page ──────────────────────────────────────────────────────────

function PublicSheetContent() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const token = searchParams?.get("token") ?? null;

  const characterId = pathname?.split("/")[2] ?? "";

  const {
    data: character,
    isLoading,
    isError,
    error,
  } = useSharedCharacter(characterId, token);

  const { cards: loadoutCards } = useDomainCards(
    character?.domainLoadout ?? [],
  );

  // Resolve spellcast trait for section dividers
  const { data: classData } = usePublicClassData(character?.classId);
  const spellcastTrait = (classData?.subclasses?.find(
    (sc) => sc.subclassId === character?.subclassId,
  )?.spellcastTrait ?? null) as CoreStatName | null;

  // Compute trait modifiers from equipped weapons + armor
  const traitMods = React.useMemo(() => {
    if (!character) return null;
    return computeTraitModifiers(
      character.weapons,
      character.activeArmorId ?? null,
    );
  }, [character]);

  // Determine error message
  const errorMessage = (() => {
    if (!token) return "This link is missing its share token.";
    if (!isError || !error) return null;
    const msg = (error as Error).message ?? "";
    if (msg.includes("expired")) return "This share link has expired.";
    if (msg.includes("Invalid") || msg.includes("Unauthorized"))
      return "This share link is invalid.";
    if (msg.includes("not found") || msg.includes("NOT_FOUND"))
      return "Character sheet not found.";
    return "Failed to load the character sheet.";
  })();

  // Gold display helper
  function goldLabel(handfuls: number, bags: number, chests: number): string {
    const parts: string[] = [];
    if (chests > 0) parts.push(`${chests} chest${chests > 1 ? "s" : ""}`);
    if (bags > 0) parts.push(`${bags} bag${bags > 1 ? "s" : ""}`);
    if (handfuls > 0)
      parts.push(`${handfuls} handful${handfuls > 1 ? "s" : ""}`);
    return parts.length > 0 ? parts.join(", ") : "0 handfuls";
  }

  return (
    <div className="min-h-screen bg-slate-950 relative">
      {/* Fixed background image */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/images/char-sheet-public-bg.webp"
        alt=""
        aria-hidden="true"
        className="fixed inset-0 h-full w-full object-cover object-[center_30%] pointer-events-none select-none z-0"
      />
      {/* Overlay layer 1: color tint */}
      <div
        aria-hidden="true"
        className="fixed inset-0 pointer-events-none z-0"
        style={{
          background:
            "linear-gradient(160deg, #0d1a24cc 0%, #0a100daa 50%, #1a0a10cc 100%)",
        }}
      />
      {/* Overlay layer 2: vignette */}
      <div
        aria-hidden="true"
        className="fixed inset-0 pointer-events-none z-0"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 30%, #0a100dee 100%)",
        }}
      />
      {/* Top bar */}
      <header className="relative z-10 border-b border-burgundy-900/50 bg-slate-900/90 backdrop-blur-sm sticky top-0 shadow-[0_1px_0_rgba(203,45,86,0.20),0_4px_20px_rgba(0,0,0,0.4)]">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
          <Link
            href="/"
            className="flex items-center hover:opacity-85 transition-opacity focus:outline-none focus:ring-2 focus:ring-[#fbbf24] rounded"
            aria-label="Curses! — home"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/curses-isolated-logo.png"
              alt="Curses!"
              className="h-8 w-auto"
            />
          </Link>
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-block text-sm text-parchment-500">
              Public character sheet
            </span>
            <Link
              href="/classes"
              className="text-sm text-parchment-500 hover:text-parchment-300 transition-colors focus:outline-none focus:ring-1 focus:ring-[#fbbf24] rounded"
            >
              Classes ↗
            </Link>
            <Link
              href="/domains"
              className="text-sm text-parchment-500 hover:text-parchment-300 transition-colors focus:outline-none focus:ring-1 focus:ring-[#fbbf24] rounded"
            >
              Domains ↗
            </Link>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-4xl px-4 py-6">
        {/* Loading */}
        {isLoading && (
          <div
            role="status"
            aria-label="Loading character sheet"
            className="flex items-center justify-center py-20"
          >
            <div
              aria-hidden="true"
              className="h-8 w-8 animate-spin rounded-full border-2 border-burgundy-500 border-t-transparent"
            />
            <span className="sr-only">Loading…</span>
          </div>
        )}

        {/* Error */}
        {(isError || !token) && !isLoading && (
          <div className="mx-auto max-w-md rounded-xl border border-burgundy-700 bg-slate-900 p-8 text-center">
            <p className="font-serif text-lg text-parchment-300 mb-2">
              Unable to load sheet
            </p>
            <p className="text-sm text-parchment-500 mb-4">{errorMessage}</p>
            <Link
              href="/"
              className="inline-block rounded-lg border border-burgundy-800 px-4 py-2 text-sm text-parchment-400 hover:text-parchment-200 transition-colors"
            >
              Go home
            </Link>
          </div>
        )}

        {/* Sheet */}
        {character && !isLoading && (
          <div className="space-y-6 animate-fade-in">
            {/* ── 1. Hero header ───────────────────────────────────────── */}
            <SectionCard
              className="relative overflow-hidden"
              style={{
                background:
                  "linear-gradient(180deg, rgba(203,45,86,0.18) 0%, rgba(21,30,45,0.97) 40%, rgba(10,16,30,1) 100%)",
                borderColor: "rgba(203,45,86,0.65)",
                boxShadow: [
                  "0 4px 16px rgba(0,0,0,0.5)",
                  "0 0 32px rgba(203,45,86,0.12)",
                  "inset 0 1px 0 rgba(255,255,255,0.04)",
                  "inset 0 3px 0 rgba(203,45,86,0.70)",
                ].join(", "),
              }}
            >
              <div className="flex flex-wrap items-start gap-4">
                {/* Portrait */}
                <div
                  aria-hidden="true"
                  className="h-24 w-24 shrink-0 rounded-full bg-slate-850 flex items-center justify-center text-3xl font-bold text-parchment-500 uppercase overflow-hidden"
                  style={{
                    border: "3px solid transparent",
                    outline: "2px solid #cb2d56",
                    outlineOffset: "3px",
                    boxShadow: [
                      "0 0 0 8px rgba(203,45,86,0.22)",
                      "0 0 28px rgba(203,45,86,0.35)",
                      "0 0 56px rgba(203,45,86,0.12)",
                      "0 6px 32px rgba(0,0,0,0.7)",
                      "inset 0 0 0 1px rgba(251,191,36,0.18)",
                    ].join(", "),
                  }}
                >
                  {character.portraitUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={character.portraitUrl}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : character.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={character.avatarUrl}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    character.name.charAt(0)
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  {/* Character name — the most prominent element */}
                  <h1
                    className="font-display font-bold text-parchment-100 leading-tight"
                    style={{
                      fontSize: "2.5rem",
                      letterSpacing: "-0.01em",
                      textShadow: [
                        "0 1px 3px rgba(0,0,0,0.8)",
                        "0 0 40px rgba(203,45,86,0.28)",
                        "0 0 80px rgba(203,45,86,0.10)",
                      ].join(", "),
                    }}
                  >
                    {character.name}
                  </h1>

                  {/* Class / subclass / community / ancestry — wiki-linked */}
                  <div className="mt-1.5 flex flex-wrap gap-1.5 text-base text-parchment-400">
                    {character.classId && character.className && (
                      <Link
                        href={`/classes/${encodeURIComponent(character.classId)}`}
                        className="hover:text-gold-300 transition-colors underline underline-offset-2 decoration-parchment-700 hover:decoration-gold-600"
                        aria-label={`${character.className} class wiki`}
                      >
                        {character.className}
                      </Link>
                    )}
                    {character.subclassName && (
                      <>
                        <span className="text-parchment-700">·</span>
                        <span>{character.subclassName}</span>
                      </>
                    )}
                    {character.communityName && (
                      <>
                        <span className="text-parchment-700">·</span>
                        <span>{character.communityName}</span>
                      </>
                    )}
                    {character.ancestryName && (
                      <>
                        <span className="text-parchment-700">·</span>
                        <span>{character.ancestryName}</span>
                      </>
                    )}
                  </div>

                  {/* Multiclass (if present) */}
                  {character.multiclassClassName && (
                    <div className="mt-1 text-sm text-parchment-600">
                      Multiclass:{" "}
                      {character.multiclassClassId ? (
                        <Link
                          href={`/classes/${encodeURIComponent(character.multiclassClassId)}`}
                          className="text-parchment-500 hover:text-gold-300 transition-colors underline underline-offset-2"
                        >
                          {character.multiclassClassName}
                        </Link>
                      ) : (
                        character.multiclassClassName
                      )}
                    </div>
                  )}
                </div>

                {/* Level — pill container */}
                <div
                  className="shrink-0 text-center flex flex-col items-center gap-0.5 px-3 py-2 rounded-[20px]"
                  style={{
                    background:
                      "linear-gradient(135deg, rgba(180,83,9,0.25) 0%, rgba(251,191,36,0.10) 100%)",
                    border: "1px solid rgba(251,191,36,0.35)",
                    boxShadow:
                      "0 0 12px rgba(251,191,36,0.12), inset 0 1px 0 rgba(251,191,36,0.08)",
                  }}
                >
                  <span
                    className="font-serif-sc text-xs font-semibold tracking-widest"
                    style={{ color: "#e8c96d" }}
                  >
                    LVL
                  </span>
                  <span
                    className="font-display font-bold text-gold-400 leading-none"
                    style={{ fontSize: "1.5rem" }}
                  >
                    {character.level}
                  </span>
                </div>
              </div>

              {/* Conditions */}
              {character.conditions.length > 0 && (
                <div
                  className="mt-4 flex flex-wrap gap-2"
                  role="list"
                  aria-label="Active conditions"
                >
                  {character.conditions.map((c) => (
                    <span
                      key={c}
                      role="listitem"
                      className="rounded border border-burgundy-700 bg-burgundy-950/40 px-2 py-0.5 text-sm text-burgundy-300"
                    >
                      {c}
                    </span>
                  ))}
                  {character.customConditions?.map((cc) => (
                    <span
                      key={cc.conditionId}
                      role="listitem"
                      title={cc.description}
                      className="rounded border border-purple-700 bg-purple-950/30 px-2 py-0.5 text-sm text-purple-300 cursor-help"
                    >
                      {cc.name}
                    </span>
                  ))}
                </div>
              )}

              {/* Domain tags — each links to the domain wiki */}
              {character.domains.length > 0 && (
                <div
                  className="mt-3 flex flex-wrap gap-1.5"
                  role="list"
                  aria-label="Domains"
                >
                  {character.domains.map((d) => {
                    return (
                      <Link
                        key={d}
                        href={`/domains/${encodeURIComponent(d)}`}
                        role="listitem"
                        className="rounded-[20px] border px-3 py-0.5 font-serif-sc text-xs tracking-wider font-semibold transition-all duration-150 hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-[#fbbf24] focus:ring-offset-1 focus:ring-offset-slate-900"
                        style={{ borderWidth: "1.5px", ...domainStyle(d) }}
                        aria-label={`${d} domain wiki`}
                      >
                        {d}
                      </Link>
                    );
                  })}
                </div>
              )}
            </SectionCard>

            {/* ── 1. Hero header → Stats divider ───────────────────── */}
            <SheetDivider spellcastTrait={spellcastTrait} />

            {/* ── 2. Core stats ─────────────────────────────────────────── */}
            <SectionCard
              title="Stats"
              style={{
                background:
                  "linear-gradient(145deg, rgba(15,28,50,0.97) 0%, rgba(12,20,38,0.98) 60%, rgba(8,15,30,1) 100%)",
                borderColor: "rgba(56,100,160,0.40)",
                boxShadow: [
                  "0 2px 8px rgba(0,0,0,0.4)",
                  "0 0 0 1px rgba(251,191,36,0.04)",
                  "inset 0 1px 0 rgba(255,255,255,0.03)",
                  "inset 0 3px 0 rgba(56,100,160,0.55)",
                ].join(", "),
              }}
            >
              {/* Derived stats as pills */}
              <div className="mb-4 flex flex-wrap gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm uppercase tracking-wider text-parchment-600">
                    Evasion
                  </span>
                  <span
                    className="rounded border px-2.5 py-0.5 font-bold text-parchment-100"
                    style={{
                      background: "rgba(87,115,153,0.15)",
                      borderColor: "rgba(87,115,153,0.30)",
                    }}
                  >
                    {character.derivedStats.evasion}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm uppercase tracking-wider text-parchment-600">
                    Armor Score
                  </span>
                  <span
                    className="rounded border px-2.5 py-0.5 font-bold text-parchment-100"
                    style={{
                      background: "rgba(87,115,153,0.15)",
                      borderColor: "rgba(87,115,153,0.30)",
                    }}
                  >
                    {character.derivedStats.armor}
                  </span>
                </div>
              </div>
              {/* Stat cards — grid matching builder, read-only */}
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
                {(
                  [
                    "agility",
                    "strength",
                    "finesse",
                    "instinct",
                    "presence",
                    "knowledge",
                  ] as CoreStatName[]
                ).map((stat) => (
                  <StatCard
                    key={stat}
                    name={stat}
                    value={character.stats[stat]}
                    modTotal={traitMods?.totals[stat] ?? 0}
                    modEntries={traitMods?.modifiers[stat]}
                  />
                ))}
              </div>
            </SectionCard>

            {/* ── 3 & 4. Trackers + thresholds ─────────────────────────── */}
            <SectionCard
              title="Resources"
              style={{
                background:
                  "linear-gradient(145deg, rgba(30,18,12,0.97) 0%, rgba(21,13,10,0.98) 60%, rgba(15,8,5,1) 100%)",
                borderColor: "rgba(180,80,20,0.45)",
                boxShadow: [
                  "0 2px 8px rgba(0,0,0,0.4)",
                  "0 0 0 1px rgba(251,191,36,0.04)",
                  "inset 0 1px 0 rgba(255,255,255,0.03)",
                  "inset 0 3px 0 rgba(180,80,20,0.65)",
                ].join(", "),
              }}
            >
              {/* Two-column layout: slot trackers left, stat cluster right */}
              <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-x-6 gap-y-4 items-start">
                {/* ── Left: HP / Stress / Armor trackers ── */}
                <div className="space-y-2.5">
                  <SlotRow
                    label="HP"
                    marked={character.trackers.hp.marked}
                    max={character.trackers.hp.max}
                  />
                  <SlotRow
                    label="Stress"
                    marked={character.trackers.stress.marked}
                    max={character.trackers.stress.max}
                    filledStyle={{
                      background:
                        "linear-gradient(135deg, #9333ea 0%, #7e22ce 100%)",
                      border: "1.5px solid #a855f7",
                      boxShadow:
                        "0 0 8px rgba(168,85,247,0.40), inset 0 1px 0 rgba(255,255,255,0.10)",
                    }}
                  />
                  <SlotRow
                    label="Armor"
                    marked={character.trackers.armor.marked}
                    max={character.trackers.armor.max}
                    filledStyle={{
                      background:
                        "linear-gradient(135deg, #475569 0%, #334155 100%)",
                      border: "1.5px solid #64748b",
                      boxShadow: "0 0 6px rgba(100,116,139,0.30)",
                    }}
                  />
                </div>

                {/* ── Right: stat cluster ── */}
                <div
                  className="flex flex-col gap-4 sm:min-w-[160px] sm:border-l sm:pl-5"
                  style={{ borderColor: "rgba(142,30,62,0.25)" }}
                >
                  {/* Proficiency */}
                  <div className="flex flex-col items-center gap-0.5">
                    <span
                      className="text-[11px] font-semibold uppercase tracking-[0.15em]"
                      style={{ color: "#b8872c" }}
                    >
                      Proficiency
                    </span>
                    <span
                      className="font-display font-bold leading-none"
                      style={{ fontSize: "2rem", color: "#e8c96d" }}
                    >
                      {character.proficiency ?? 1}
                    </span>
                  </div>

                  {/* Hope */}
                  <div className="flex flex-col items-center gap-1.5">
                    <span
                      className="text-[11px] font-semibold uppercase tracking-[0.15em]"
                      style={{ color: "#b8872c" }}
                    >
                      Hope
                    </span>
                    <div
                      className="flex gap-1 flex-wrap justify-center"
                      role="meter"
                      aria-valuenow={character.hope}
                      aria-valuemin={0}
                      aria-valuemax={character.hopeMax ?? 6}
                      aria-label={`Hope: ${character.hope} of ${character.hopeMax ?? 6}`}
                    >
                      {Array.from({ length: character.hopeMax ?? 6 }).map(
                        (_, i) => (
                          <span
                            key={i}
                            aria-hidden="true"
                            style={
                              i < character.hope
                                ? {
                                    width: "18px",
                                    height: "18px",
                                    borderRadius: "50%",
                                    border: "1.5px solid #fbbf24",
                                    background:
                                      "radial-gradient(circle at 40% 35%, #fde68a 0%, #fbbf24 45%, #b45309 100%)",
                                    boxShadow:
                                      "0 0 10px rgba(251,191,36,0.55), 0 0 4px rgba(251,191,36,0.30), inset 0 1px 0 rgba(255,255,255,0.25)",
                                    transition: "all 0.15s ease",
                                  }
                                : {
                                    width: "18px",
                                    height: "18px",
                                    borderRadius: "50%",
                                    border: "1.5px solid rgba(251,191,36,0.60)",
                                    background:
                                      "radial-gradient(circle at 40% 35%, rgba(251,191,36,0.06) 0%, rgba(8,13,23,0.85) 70%)",
                                    boxShadow:
                                      "inset 0 1px 3px rgba(0,0,0,0.5)",
                                    transition: "all 0.15s ease",
                                  }
                            }
                          />
                        ),
                      )}
                    </div>
                    <span
                      className="text-xs"
                      style={{ color: "#7a4f1c" }}
                      aria-hidden="true"
                    >
                      {character.hope}/{character.hopeMax ?? 6}
                    </span>
                  </div>

                  {/* Damage thresholds — promoted to hero stat format */}
                  <div className="flex gap-3 justify-center">
                    <div
                      className="flex flex-col items-center gap-0.5 rounded-lg px-3 py-2"
                      style={{
                        background: "rgba(154,52,18,0.15)",
                        border: "1px solid rgba(251,146,60,0.25)",
                      }}
                    >
                      <span
                        className="text-[11px] font-semibold uppercase tracking-[0.15em]"
                        style={{ color: "#fb923c" }}
                      >
                        Major
                      </span>
                      <span
                        className="font-display font-bold leading-none"
                        style={{ fontSize: "1.75rem", color: "#fed7aa" }}
                      >
                        {character.damageThresholds.major}
                      </span>
                      <span
                        className="text-[10px] uppercase tracking-wider"
                        style={{ color: "rgba(251,146,60,0.55)" }}
                      >
                        dmg
                      </span>
                    </div>
                    <div
                      className="flex flex-col items-center gap-0.5 rounded-lg px-3 py-2"
                      style={{
                        background: "rgba(153,27,27,0.20)",
                        border: "1px solid rgba(239,68,68,0.30)",
                      }}
                    >
                      <span
                        className="text-[11px] font-semibold uppercase tracking-[0.15em]"
                        style={{ color: "#f87171" }}
                      >
                        Severe
                      </span>
                      <span
                        className="font-display font-bold leading-none"
                        style={{ fontSize: "1.75rem", color: "#fecaca" }}
                      >
                        {character.damageThresholds.severe}
                      </span>
                      <span
                        className="text-[10px] uppercase tracking-wider"
                        style={{ color: "rgba(239,68,68,0.45)" }}
                      >
                        dmg
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </SectionCard>

            {/* ── 5. Domain loadout ─────────────────────────────────────── */}
            {character.domainLoadout.length > 0 && (
              <>
                <SheetDivider spellcastTrait={spellcastTrait} />
                <SectionCard title="Domain Loadout">
                  <p className="mb-3 text-sm text-parchment-600">
                    Click a card to expand its full description. Domain names
                    link to the wiki.
                  </p>
                  {loadoutCards.length > 0 ? (
                    <div className="space-y-2">
                      {loadoutCards.map((card) => (
                        <DomainCardTile
                          key={card.cardId}
                          card={card}
                          characterDomains={character.domains}
                        />
                      ))}
                    </div>
                  ) : (
                    /* Loading skeleton */
                    <div className="space-y-2">
                      {character.domainLoadout.map((entry) => (
                        <div
                          key={entry}
                          className="h-11 rounded-lg border border-slate-700/60 bg-slate-900/60 animate-pulse"
                        />
                      ))}
                    </div>
                  )}
                </SectionCard>
              </>
            )}

            {/* ── 6. Experiences ────────────────────────────────────────── */}
            {character.experiences.length > 0 && (
              <>
                <SheetDivider spellcastTrait={spellcastTrait} />
                <SectionCard title="Experiences">
                  <div className="space-y-1.5">
                    {character.experiences.map((exp, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-3 text-base"
                      >
                        <span className="text-parchment-300 flex-1">
                          {exp.name}
                        </span>
                        <span
                          className={`font-bold tabular-nums ${
                            exp.bonus >= 0
                              ? "text-gold-400"
                              : "text-burgundy-400"
                          }`}
                        >
                          {exp.bonus >= 0 ? `+${exp.bonus}` : exp.bonus}
                        </span>
                      </div>
                    ))}
                  </div>
                </SectionCard>
              </>
            )}

            {/* ── 7. Inventory + Gold ───────────────────────────────────── */}
            {(character.inventory?.length > 0 || character.gold) && (
              <SectionCard title="Inventory & Gold">
                {/* Gold */}
                {character.gold && (
                  <div className="mb-3 flex items-center gap-2">
                    <span className="text-sm uppercase tracking-wider text-parchment-600 w-24">
                      Gold
                    </span>
                    <span className="text-base text-gold-400 font-medium">
                      {goldLabel(
                        character.gold.handfuls,
                        character.gold.bags,
                        character.gold.chests,
                      )}
                    </span>
                  </div>
                )}
                {/* Items */}
                {character.inventory?.length > 0 && (
                  <ul
                    className="space-y-1 text-base text-parchment-400"
                    aria-label="Inventory items"
                  >
                    {character.inventory.map((item, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span
                          aria-hidden="true"
                          className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-burgundy-700"
                        />
                        {item}
                      </li>
                    ))}
                  </ul>
                )}
              </SectionCard>
            )}

            {/* ── 8. Companion ──────────────────────────────────────────── */}
            {character.companionState && (
              <>
                <SheetDivider spellcastTrait={spellcastTrait} />
                <SectionCard title="Companion">
                  <div className="space-y-2 text-base">
                    <div className="flex items-center gap-3">
                      <span className="w-24 text-sm text-parchment-500 uppercase tracking-wider">
                        Name
                      </span>
                      <span className="font-medium text-parchment-200">
                        {character.companionState.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="w-24 text-sm text-parchment-500 uppercase tracking-wider">
                        Evasion
                      </span>
                      <span className="text-parchment-300">
                        {character.companionState.evasion}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="w-24 text-sm text-parchment-500 uppercase tracking-wider">
                        Attack
                      </span>
                      <span className="text-parchment-300">
                        {character.companionState.attackDescription} (
                        {character.companionState.damagedie}{" "}
                        {character.companionState.damageType},{" "}
                        {character.companionState.range})
                      </span>
                    </div>
                    <SlotRow
                      label="Stress"
                      marked={character.companionState.stress.marked}
                      max={character.companionState.stress.max}
                      filledStyle={{
                        background:
                          "linear-gradient(135deg, #9333ea 0%, #7e22ce 100%)",
                        border: "1.5px solid #a855f7",
                        boxShadow:
                          "0 0 8px rgba(168,85,247,0.40), inset 0 1px 0 rgba(255,255,255,0.10)",
                      }}
                    />
                    {character.companionState.experiences.length > 0 && (
                      <div className="pt-1 space-y-1">
                        <p className="text-sm uppercase tracking-wider text-parchment-600">
                          Experiences
                        </p>
                        {character.companionState.experiences.map((exp, i) => (
                          <div key={i} className="flex items-center gap-3">
                            <span className="text-parchment-400">
                              {exp.name}
                            </span>
                            <span className="font-bold text-gold-400">
                              {exp.bonus >= 0 ? `+${exp.bonus}` : exp.bonus}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </SectionCard>
              </>
            )}

            {/* ── 9. Downtime projects ──────────────────────────────────── */}
            {character.downtimeProjects?.filter((p) => !p.completed).length >
              0 && (
              <>
                <SheetDivider spellcastTrait={spellcastTrait} />
                <SectionCard title="Downtime Projects">
                  <div className="space-y-3">
                    {character.downtimeProjects
                      .filter((p) => !p.completed)
                      .map((proj) => (
                        <div
                          key={proj.projectId}
                          className="rounded-lg border border-slate-700/60 bg-slate-850/40 px-4 py-3"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium text-base text-parchment-200">
                              {proj.name}
                            </span>
                            <span className="text-sm text-parchment-600">
                              {proj.countdownCurrent}/{proj.countdownMax}
                            </span>
                          </div>
                          {/* Progress bar */}
                          <div
                            className="h-1.5 rounded-full bg-slate-700 overflow-hidden"
                            role="progressbar"
                            aria-valuenow={proj.countdownCurrent}
                            aria-valuemin={0}
                            aria-valuemax={proj.countdownMax}
                            aria-label={`${proj.name}: ${proj.countdownCurrent} of ${proj.countdownMax} ticks`}
                          >
                            <div
                              className="h-full rounded-full bg-gold-600 transition-all"
                              style={{
                                width: `${Math.min(
                                  100,
                                  (proj.countdownCurrent / proj.countdownMax) *
                                    100,
                                )}%`,
                              }}
                            />
                          </div>
                          {proj.notes && (
                            <p className="mt-2 text-sm text-parchment-600">
                              {proj.notes}
                            </p>
                          )}
                        </div>
                      ))}
                  </div>
                </SectionCard>
              </>
            )}

            {/* ── 10. Notes ─────────────────────────────────────────────── */}
            {character.notes && (
              <SectionCard title="Notes">
                <MarkdownContent className="text-base text-parchment-400 leading-relaxed">
                  {character.notes}
                </MarkdownContent>
              </SectionCard>
            )}

            {/* ── Footer ────────────────────────────────────────────────── */}
            <div
              className="rounded-xl p-5 text-base space-y-4 text-center"
              style={{
                marginTop: "0.5rem",
                borderTop: "1px solid rgba(203,45,86,0.15)",
                background:
                  "linear-gradient(180deg, transparent 0%, rgba(74,10,20,0.08) 100%)",
              }}
            >
              <Link
                href="/auth/register"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-[10px] font-serif-sc text-base tracking-widest text-parchment-100 no-underline transition-all duration-200 hover:-translate-y-px active:translate-y-0"
                style={{
                  border: "1.5px solid rgba(203,45,86,0.70)",
                  background:
                    "linear-gradient(135deg, rgba(203,45,86,0.30) 0%, rgba(142,30,62,0.20) 100%)",
                  boxShadow:
                    "0 2px 12px rgba(203,45,86,0.20), inset 0 1px 0 rgba(255,255,255,0.06)",
                }}
              >
                Build Your Own Character
              </Link>
              <p className="text-sm" style={{ color: "#e8c96d" }}>
                Shared via{" "}
                <Link
                  href="/"
                  className="hover:text-gold-400 transition-colors"
                  style={{
                    color: "#e8c96d",
                    borderBottom: "1px solid rgba(232,201,109,0.40)",
                    paddingBottom: "1px",
                  }}
                >
                  Curses!
                </Link>
                {" · "}
                <Link
                  href="/classes"
                  className="hover:text-gold-400 transition-colors"
                  style={{
                    color: "#e8c96d",
                    borderBottom: "1px solid rgba(232,201,109,0.40)",
                    paddingBottom: "1px",
                  }}
                >
                  Classes
                </Link>
                {" · "}
                <Link
                  href="/domains"
                  className="hover:text-gold-400 transition-colors"
                  style={{
                    color: "#e8c96d",
                    borderBottom: "1px solid rgba(232,201,109,0.40)",
                    paddingBottom: "1px",
                  }}
                >
                  Domains
                </Link>
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

// ─── Root export ──────────────────────────────────────────────────────────────

export default function PublicSheetClient() {
  return (
    <Suspense
      fallback={
        <div
          role="status"
          aria-label="Loading character sheet"
          className="flex min-h-screen items-center justify-center bg-slate-950"
        >
          <div
            aria-hidden="true"
            className="h-8 w-8 animate-spin rounded-full border-2 border-burgundy-500 border-t-transparent"
          />
          <span className="sr-only">Loading character sheet…</span>
        </div>
      }
    >
      <PublicSheetContent />
    </Suspense>
  );
}
