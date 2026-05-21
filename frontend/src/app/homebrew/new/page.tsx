"use client";

/**
 * src/app/homebrew/new/page.tsx
 *
 * Type-picker page — user selects which content type to create.
 * Routes to /homebrew/[type]/new for the actual creation form.
 *
 * Uses inline SVG icons instead of emojis for consistent rendering.
 */

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { AppHeader } from "@/components/AppHeader";
import { Footer } from "@/components/Footer";

// ─── SVG Icon Components ──────────────────────────────────────────────────────
// All icons are 24x24 viewBox inline SVGs. Using stroke-based designs for
// visual consistency across the set.

/** Crossed swords — Class */
function ClassIcon({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M14.5 17.5L3 6V3h3l11.5 11.5" />
      <path d="M13 19l6-6" />
      <path d="M16 16l4 4" />
      <path d="M9.5 17.5L21 6V3h-3L6.5 14.5" />
      <path d="M11 19l-6-6" />
      <path d="M8 16l-4 4" />
    </svg>
  );
}

/** DNA helix / tree branch — Ancestry */
function AncestryIcon({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 2v20" />
      <path d="M8 6c2 0 4 2 4 4" />
      <path d="M16 6c-2 0-4 2-4 4" />
      <path d="M7 14c2.5 0 5 2 5 4" />
      <path d="M17 14c-2.5 0-5 2-5 4" />
      <circle cx="8" cy="6" r="1.5" />
      <circle cx="16" cy="6" r="1.5" />
      <circle cx="7" cy="14" r="1.5" />
      <circle cx="17" cy="14" r="1.5" />
    </svg>
  );
}

/** People group — Community */
function CommunityIcon({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="7" r="3" />
      <path d="M5.5 21v-2a4 4 0 014-4h5a4 4 0 014 4v2" />
      <circle cx="5" cy="9" r="2" />
      <path d="M3 21v-1.5a3 3 0 013-3" />
      <circle cx="19" cy="9" r="2" />
      <path d="M21 21v-1.5a3 3 0 00-3-3" />
    </svg>
  );
}

/** Card with sparkle — Domain Card */
function DomainCardIcon({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="4" y="2" width="16" height="20" rx="2" />
      <path d="M12 8l1.5 3 3 .5-2.25 2 .75 3L12 15l-3 1.5.75-3L7.5 11.5l3-.5L12 8z" />
    </svg>
  );
}

/** Bag/satchel — Item */
function ItemIcon({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M8 8V5a4 4 0 018 0v3" />
      <path d="M5 8h14l-1.5 12a2 2 0 01-2 2h-7a2 2 0 01-2-2L5 8z" />
      <line x1="12" y1="12" x2="12" y2="16" />
    </svg>
  );
}

/** Flask/beaker — Consumable */
function ConsumableIcon({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M9 3h6" />
      <path d="M10 3v6.5L5 18a2 2 0 002 2h10a2 2 0 002-2l-5-8.5V3" />
      <path d="M7.5 15h9" />
    </svg>
  );
}

/** Shield — Armor */
function ArmorIcon({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 2l8 4v5c0 5.25-3.5 9.74-8 11-4.5-1.26-8-5.75-8-11V6l8-4z" />
      <path d="M12 8v4" />
      <path d="M10 10h4" />
    </svg>
  );
}

/** Blade — Weapon */
function WeaponIcon({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M14.5 3.5L20.5 9.5L10 20L4 14L14.5 3.5Z" />
      <path d="M14.5 3.5L20.5 3.5L20.5 9.5" />
      <path d="M6.5 17.5L3 21" />
      <path d="M14 10L10 14" />
    </svg>
  );
}

// ─── Icon lookup ──────────────────────────────────────────────────────────────

const TYPE_ICON_MAP: Record<string, React.FC<{ className?: string }>> = {
  class: ClassIcon,
  ancestry: AncestryIcon,
  community: CommunityIcon,
  domainCard: DomainCardIcon,
  item: ItemIcon,
  consumable: ConsumableIcon,
  armor: ArmorIcon,
  weapon: WeaponIcon,
};

// ─── Type Cards ───────────────────────────────────────────────────────────────

interface TypeOption {
  type: string;
  label: string;
  description: string;
  colorClasses: string;
  borderColor: string;
}

/** Character Options — existing markdown-based types. */
const CHARACTER_OPTIONS: TypeOption[] = [
  {
    type: "class",
    label: "Class",
    description:
      "Define a new character class with domains, subclasses, class features, and progression tables.",
    colorClasses: "border-burgundy-700/40 bg-burgundy-900/20 text-burgundy-400 hover:border-burgundy-700 hover:bg-burgundy-900/30",
    borderColor: "border-l-burgundy-700",
  },
  {
    type: "ancestry",
    label: "Ancestry",
    description:
      "Create a custom ancestry with unique features, mechanical bonuses, and flavor text.",
    colorClasses: "border-gold-500/40 bg-gold-500/10 text-gold-400 hover:border-gold-500 hover:bg-gold-500/20",
    borderColor: "border-l-gold-500",
  },
  {
    type: "community",
    label: "Community",
    description:
      "Design a community with cultural traits, mechanical bonuses, and background connections.",
    colorClasses: "border-emerald-500/40 bg-emerald-500/10 text-emerald-400 hover:border-emerald-500 hover:bg-emerald-500/20",
    borderColor: "border-l-emerald-500",
  },
  {
    type: "domainCard",
    label: "Domain Card",
    description:
      "Craft a domain card with abilities, thresholds, recall costs, and optional curse effects.",
    colorClasses: "border-steel-400/40 bg-steel-400/10 text-steel-400 hover:border-steel-400 hover:bg-steel-400/20",
    borderColor: "border-l-steel-400",
  },
];

/** Equipment & Loot — new structured-form types. Ordered by complexity (simplest first). */
const EQUIPMENT_OPTIONS: TypeOption[] = [
  {
    type: "item",
    label: "Item",
    description:
      "Create a reusable item with a rarity and effect description for your campaigns.",
    colorClasses: "border-amber-500/40 bg-amber-500/10 text-amber-400 hover:border-amber-500 hover:bg-amber-500/20",
    borderColor: "border-l-amber-500",
  },
  {
    type: "consumable",
    label: "Consumable",
    description:
      "Design a limited-use consumable — potions, scrolls, and single-use items.",
    colorClasses: "border-rose-400/40 bg-rose-400/10 text-rose-400 hover:border-rose-400 hover:bg-rose-400/20",
    borderColor: "border-l-rose-400",
  },
  {
    type: "armor",
    label: "Armor",
    description:
      "Build custom armor with thresholds, armor score, tier, and an optional feature.",
    colorClasses: "border-sky-400/40 bg-sky-400/10 text-sky-400 hover:border-sky-400 hover:bg-sky-400/20",
    borderColor: "border-l-sky-400",
  },
  {
    type: "weapon",
    label: "Weapon",
    description:
      "Forge a weapon with tier, damage die, attack trait, range, burden, and an optional feature.",
    colorClasses: "border-violet-400/40 bg-violet-400/10 text-violet-400 hover:border-violet-400 hover:bg-violet-400/20",
    borderColor: "border-l-violet-400",
  },
];

// ─── Type Card ────────────────────────────────────────────────────────────────

function TypeCard({ opt, onClick }: { opt: TypeOption; onClick: () => void }) {
  const IconComponent = TYPE_ICON_MAP[opt.type];
  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        group text-left rounded-xl border border-l-[3px]
        p-5 transition-all duration-200
        focus:outline-none focus:ring-2 focus:ring-coral-400 focus:ring-offset-2 focus:ring-offset-[#0a100d]
        ${opt.colorClasses} ${opt.borderColor}
      `}
    >
      <div className="flex items-start gap-3">
        {IconComponent && (
          <div className="shrink-0 mt-0.5">
            <IconComponent className="h-6 w-6" />
          </div>
        )}
        <div className="space-y-1">
          <h3 className="font-serif text-lg font-semibold text-[#f7f7ff]">
            {opt.label}
          </h3>
          <p className="text-sm text-[#b9baa3]/50 leading-relaxed">
            {opt.description}
          </p>
        </div>
      </div>
    </button>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function HomebrewNewPage() {
  const router = useRouter();
  const { isAuthenticated, isReady, isLoading: authLoading } = useAuthStore();

  // Auth guard
  useEffect(() => {
    if (isReady && !isAuthenticated) {
      router.replace("/auth/login");
    }
  }, [isReady, isAuthenticated, router]);

  if (!isReady || authLoading || !isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a100d]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-coral-400 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#0a100d]">
      <AppHeader />

      <main className="flex-1 mx-auto max-w-3xl w-full px-4 py-8">
        {/* Page header */}
        <div className="mb-8 text-center">
          <h1 className="font-serif text-3xl font-semibold text-[#f7f7ff]">
            Create Homebrew Content
          </h1>
          <p className="mt-2 text-base text-[#b9baa3]/50 max-w-lg mx-auto">
            Choose what type of content you&apos;d like to create.
          </p>
        </div>

        {/* ── Character Options section ──────────────────────────────── */}
        <section className="mb-8">
          <h2 className="font-serif text-lg font-semibold text-[#b9baa3]/70 mb-3">
            Character Options
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {CHARACTER_OPTIONS.map((opt) => (
              <TypeCard key={opt.type} opt={opt} onClick={() => router.push(`/homebrew/${opt.type}/new`)} />
            ))}
          </div>
        </section>

        {/* ── Equipment & Loot section ─────────────────────────────────── */}
        <section>
          <h2 className="font-serif text-lg font-semibold text-[#b9baa3]/70 mb-3">
            Equipment &amp; Loot
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {EQUIPMENT_OPTIONS.map((opt) => (
              <TypeCard key={opt.type} opt={opt} onClick={() => router.push(`/homebrew/${opt.type}/new`)} />
            ))}
          </div>
        </section>

        {/* Markdown upload shortcut */}
        <div className="mt-8 text-center">
          <p className="text-sm text-[#b9baa3]/30">
            Have markdown ready?{" "}
            <button
              type="button"
              onClick={() => router.push("/homebrew/upload")}
              className="text-coral-400 hover:underline"
            >
              Upload markdown directly
            </button>
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
}
