"use client";

/**
 * src/components/homebrew/WorkshopLayout.tsx
 *
 * Two-panel workshop layout for creating and editing homebrew content.
 *
 * Desktop: side-by-side panels (60/40 split) — left for input, right for live preview.
 * Mobile:  vertically stacked with "Edit" / "Preview" tab toggle.
 *
 * Includes AppHeader, Footer, and an auth-guard redirect.
 */

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { AppHeader } from "@/components/AppHeader";
import { Footer } from "@/components/Footer";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface WorkshopLayoutProps {
  /** Page title displayed above the panels. */
  title: string;
  /** Optional subtitle / description below the title. */
  subtitle?: string;
  /** The input form panel (left on desktop). */
  inputPanel: React.ReactNode;
  /** The live preview panel (right on desktop). */
  previewPanel: React.ReactNode;
  /** Called when form should be submitted. */
  onSubmit?: () => void;
  /** Whether the form is currently submitting. */
  isSubmitting?: boolean;
  /** Back link href (defaults to /homebrew). */
  backHref?: string;
}

// ─── Mobile Tab Toggle ────────────────────────────────────────────────────────

type MobileTab = "edit" | "preview";

// ─── Component ────────────────────────────────────────────────────────────────

export function WorkshopLayout({
  title,
  subtitle,
  inputPanel,
  previewPanel,
  onSubmit,
  isSubmitting = false,
  backHref = "/homebrew",
}: WorkshopLayoutProps) {
  const router = useRouter();
  const { isAuthenticated, isReady, isLoading: authLoading } = useAuthStore();
  const [mobileTab, setMobileTab] = useState<MobileTab>("edit");

  // Auth guard
  useEffect(() => {
    if (isReady && !isAuthenticated) {
      router.replace("/auth/login");
    }
  }, [isReady, isAuthenticated, router]);

  // Loading state while auth initializes
  if (!isReady || authLoading || !isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a100d]">
        <div
          aria-label="Loading"
          className="h-8 w-8 animate-spin rounded-full border-2 border-coral-400 border-t-transparent"
        />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#0a100d]">
      <AppHeader />

      <main className="flex-1 mx-auto w-full max-w-[1400px] px-4 py-6">
        {/* ── Page header ──────────────────────────────────────────────── */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1">
            <Link
              href={backHref}
              className="
                inline-flex items-center gap-1.5 text-sm text-[#b9baa3]/50
                hover:text-[#b9baa3] transition-colors
                focus:outline-none focus:ring-2 focus:ring-coral-400 rounded
              "
              aria-label="Back to Homebrew Workshop"
            >
              <span aria-hidden="true">&larr;</span>
              Back
            </Link>
            <h1 className="font-serif text-2xl font-semibold text-[#f7f7ff] sm:text-3xl">
              {title}
            </h1>
            {subtitle && (
              <p className="text-sm text-[#b9baa3]/50 max-w-lg">
                {subtitle}
              </p>
            )}
          </div>

          {/* Submit button (desktop — visible above panels) */}
          {onSubmit && (
            <button
              type="button"
              onClick={onSubmit}
              disabled={isSubmitting}
              className="
                hidden sm:inline-flex shrink-0 items-center gap-2
                rounded-xl border border-coral-400/60 bg-coral-400/10
                px-5 py-2.5 font-semibold text-base text-coral-400
                hover:bg-coral-400/20 hover:border-coral-400
                disabled:opacity-40 disabled:cursor-not-allowed
                transition-all duration-150
                focus:outline-none focus:ring-2 focus:ring-coral-400
                focus:ring-offset-2 focus:ring-offset-[#0a100d]
              "
            >
              {isSubmitting ? (
                <>
                  <span
                    aria-hidden="true"
                    className="h-4 w-4 animate-spin rounded-full border-2 border-coral-400 border-t-transparent"
                  />
                  Saving&hellip;
                </>
              ) : (
                "Save Homebrew"
              )}
            </button>
          )}
        </div>

        {/* ── Mobile tab toggle (visible < lg) ─────────────────────── */}
        <div className="mb-4 flex items-center gap-1 lg:hidden">
          {(["edit", "preview"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setMobileTab(tab)}
              className={`
                flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors
                focus:outline-none focus:ring-2 focus:ring-coral-400 focus:ring-offset-2 focus:ring-offset-[#0a100d]
                ${
                  mobileTab === tab
                    ? "bg-coral-400/15 text-coral-400 border border-coral-400/50"
                    : "text-[#b9baa3]/50 hover:text-[#b9baa3]/80 hover:bg-slate-800/50 border border-transparent"
                }
              `}
            >
              {tab === "edit" ? "Edit" : "Preview"}
            </button>
          ))}
        </div>

        {/* ── Two-panel area ───────────────────────────────────────── */}
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
          {/* Left panel: Input form */}
          <div
            className={`
              w-full lg:w-[60%] lg:block
              ${mobileTab === "edit" ? "block" : "hidden"}
            `}
          >
            <div
              className="
                rounded-xl border border-slate-700/60 bg-slate-900/60
                overflow-y-auto max-h-[calc(100vh-200px)]
                scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent
              "
            >
              <div className="p-5 sm:p-6 space-y-6">
                {inputPanel}
              </div>
            </div>
          </div>

          {/* Right panel: Live preview */}
          <div
            className={`
              w-full lg:w-[40%] lg:block lg:sticky lg:top-20
              ${mobileTab === "preview" ? "block" : "hidden"}
            `}
          >
            <div
              className="
                rounded-xl border border-coral-400/30 bg-slate-900/80
                overflow-y-auto max-h-[calc(100vh-200px)]
                scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent
              "
            >
              {/* Preview header */}
              <div className="sticky top-0 z-[1] border-b border-coral-400/20 bg-slate-900/95 backdrop-blur-sm px-5 py-3">
                <h2 className="flex items-center gap-2 font-serif text-sm font-semibold text-coral-400">
                  <span
                    aria-hidden="true"
                    className="inline-block h-2 w-2 rounded-full bg-coral-400/60"
                  />
                  Live Preview
                </h2>
              </div>

              <div className="p-5">
                {previewPanel}
              </div>
            </div>
          </div>
        </div>

        {/* ── Mobile submit button (fixed bottom) ──────────────────── */}
        {onSubmit && (
          <div className="mt-5 sm:hidden">
            <button
              type="button"
              onClick={onSubmit}
              disabled={isSubmitting}
              className="
                w-full rounded-xl border border-coral-400/60 bg-coral-400/10
                px-5 py-3 font-semibold text-base text-coral-400
                hover:bg-coral-400/20 hover:border-coral-400
                disabled:opacity-40 disabled:cursor-not-allowed
                transition-all duration-150
                focus:outline-none focus:ring-2 focus:ring-coral-400
                focus:ring-offset-2 focus:ring-offset-[#0a100d]
              "
            >
              {isSubmitting ? "Saving\u2026" : "Save Homebrew"}
            </button>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
