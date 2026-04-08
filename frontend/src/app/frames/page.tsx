"use client";

/**
 * src/app/frames/page.tsx
 *
 * Campaign Frames list page. Auth-guarded.
 * Shows a grid of FrameCard components with loading skeletons,
 * empty state, error state, and a "New Frame" CTA.
 */

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/store/authStore";
import { useFrames } from "@/hooks/useFrames";
import { AppHeader } from "@/components/AppHeader";
import { FrameCard, FrameCardSkeleton } from "@/components/frames/FrameCard";

export default function FramesPage() {
  const router = useRouter();
  const { isAuthenticated, isReady, isLoading: authLoading } = useAuthStore();
  const { data: frames, isLoading, isError, error, refetch } = useFrames();

  // Auth guard
  useEffect(() => {
    if (isReady && !isAuthenticated) {
      router.replace("/auth/login");
    }
  }, [isReady, isAuthenticated, router]);

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

  const frameList = frames ?? [];

  return (
    <div className="min-h-screen bg-[#0a100d]">
      {/* Top bar */}
      <AppHeader />

      <main className="mx-auto max-w-6xl px-4 py-8">
        {/* Page header */}
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <h1 className="font-serif text-3xl font-semibold text-[#f7f7ff]">
              Campaign Frames
            </h1>
            {!isLoading && (
              <p className="mt-1 text-sm text-[#b9baa3]/40">
                {frameList.length} frame{frameList.length !== 1 ? "s" : ""}
              </p>
            )}
          </div>

          <Link
            href="/frames/new"
            className="
              shrink-0 flex items-center gap-2
              rounded-xl border border-[#577399]/60 bg-[#577399]/10
              px-5 py-2.5 font-semibold text-base text-[#577399]
              hover:bg-[#577399]/20 hover:border-[#577399]
              transition-all duration-150 shadow-sm
              focus:outline-none focus:ring-2 focus:ring-[#577399]
              focus:ring-offset-2 focus:ring-offset-[#0a100d]
            "
          >
            <span aria-hidden="true">+</span>
            New Frame
          </Link>
        </div>

        {/* Loading skeletons */}
        {isLoading && (
          <div
            aria-label="Loading campaign frames"
            aria-busy="true"
            className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
          >
            {Array.from({ length: 6 }).map((_, i) => (
              <FrameCardSkeleton key={i} />
            ))}
          </div>
        )}

        {/* Error state */}
        {isError && !isLoading && (
          <div
            role="alert"
            className="rounded-xl border border-[#fe5f55]/30 bg-slate-900/80 p-8 text-center"
          >
            <p className="font-serif text-lg text-[#fe5f55]/80">
              Failed to load campaign frames
            </p>
            <p className="mt-1 text-sm text-[#b9baa3]/50">
              {(error as Error)?.message ?? "An unexpected error occurred."}
            </p>
            <button
              type="button"
              onClick={() => refetch()}
              className="
                mt-4 rounded-lg px-4 py-2 text-sm font-semibold
                border border-[#fe5f55]/30 text-[#fe5f55]/80
                hover:bg-[#fe5f55]/10
                transition-colors
                focus:outline-none focus:ring-2 focus:ring-[#fe5f55]
                focus:ring-offset-2 focus:ring-offset-slate-900
              "
            >
              Retry
            </button>
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !isError && frameList.length === 0 && (
          <div
            className="rounded-2xl border border-dashed border-slate-700/60 p-16 text-center space-y-5"
            style={{ background: "rgba(87,115,153,0.03)" }}
          >
            <div className="space-y-2">
              <p className="font-serif text-xl text-[#f7f7ff]/70">
                No Campaign Frames Yet
              </p>
              <p className="text-base text-[#b9baa3]/40 max-w-xs mx-auto leading-relaxed">
                Campaign frames let you customize rules, restrict content, and
                add extensions for your table. Create one to get started.
              </p>
            </div>
            <Link
              href="/frames/new"
              className="
                mt-2 inline-flex items-center gap-2 rounded-xl
                border border-[#577399]/60 bg-[#577399]/10
                px-7 py-3 text-base font-semibold text-[#577399]
                hover:bg-[#577399]/20 hover:border-[#577399]
                transition-all duration-150
                focus:outline-none focus:ring-2 focus:ring-[#577399]
                focus:ring-offset-2 focus:ring-offset-[#0a100d]
              "
            >
              <span>+</span> Create Your First Frame
            </Link>
          </div>
        )}

        {/* Frame grid */}
        {!isLoading && !isError && frameList.length > 0 && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {frameList.map((frame) => (
              <FrameCard key={frame.frameId} frame={frame} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
