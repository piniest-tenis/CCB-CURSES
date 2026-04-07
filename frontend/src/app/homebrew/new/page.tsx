"use client";

/**
 * src/app/homebrew/new/page.tsx
 *
 * Type-picker page — user selects which content type to create.
 * Routes to /homebrew/[type]/new for the actual creation form.
 */

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { AppHeader } from "@/components/AppHeader";
import { Footer } from "@/components/Footer";

// ─── Type Cards ───────────────────────────────────────────────────────────────

interface TypeOption {
  type: string;
  label: string;
  description: string;
  icon: string;
  colorClasses: string;
  borderColor: string;
}

const TYPE_OPTIONS: TypeOption[] = [
  {
    type: "class",
    label: "Class",
    description:
      "Define a new character class with domains, subclasses, class features, and progression tables.",
    icon: "⚔️",
    colorClasses: "border-burgundy-700/40 bg-burgundy-900/20 text-burgundy-400 hover:border-burgundy-700 hover:bg-burgundy-900/30",
    borderColor: "border-l-burgundy-700",
  },
  {
    type: "ancestry",
    label: "Ancestry",
    description:
      "Create a custom ancestry with unique features, mechanical bonuses, and flavor text.",
    icon: "🧬",
    colorClasses: "border-gold-500/40 bg-gold-500/10 text-gold-400 hover:border-gold-500 hover:bg-gold-500/20",
    borderColor: "border-l-gold-500",
  },
  {
    type: "community",
    label: "Community",
    description:
      "Design a community with cultural traits, mechanical bonuses, and background connections.",
    icon: "🏘️",
    colorClasses: "border-emerald-500/40 bg-emerald-500/10 text-emerald-400 hover:border-emerald-500 hover:bg-emerald-500/20",
    borderColor: "border-l-emerald-500",
  },
  {
    type: "domainCard",
    label: "Domain Card",
    description:
      "Craft a domain card with abilities, thresholds, recall costs, and optional curse effects.",
    icon: "🃏",
    colorClasses: "border-steel-400/40 bg-steel-400/10 text-steel-400 hover:border-steel-400 hover:bg-steel-400/20",
    borderColor: "border-l-steel-400",
  },
];

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
            Choose what type of content you&apos;d like to create. You can build
            it using a form or paste/upload markdown.
          </p>
        </div>

        {/* Type cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {TYPE_OPTIONS.map((opt) => (
            <button
              key={opt.type}
              type="button"
              onClick={() => router.push(`/homebrew/${opt.type}/new`)}
              className={`
                group text-left rounded-xl border border-l-[3px]
                p-5 transition-all duration-200
                focus:outline-none focus:ring-2 focus:ring-coral-400 focus:ring-offset-2 focus:ring-offset-[#0a100d]
                ${opt.colorClasses} ${opt.borderColor}
              `}
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl" aria-hidden="true">
                  {opt.icon}
                </span>
                <div className="space-y-1">
                  <h2 className="font-serif text-lg font-semibold text-[#f7f7ff]">
                    {opt.label}
                  </h2>
                  <p className="text-sm text-[#b9baa3]/50 leading-relaxed">
                    {opt.description}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>

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
