"use client";

/**
 * src/app/campaigns/page.tsx
 *
 * Campaign list page. Auth-guarded.
 * Shows a grid of CampaignCard components with loading skeletons,
 * empty state, and a "New Campaign" CTA.
 */

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { useCampaigns } from "@/hooks/useCampaigns";
import { AppHeader } from "@/components/AppHeader";
import { CampaignCard, CampaignCardSkeleton } from "@/components/campaign/CampaignCard";

export default function CampaignsPage() {
  const router = useRouter();
  const { isAuthenticated, isReady, isLoading: authLoading, user } = useAuthStore();
  const { data: campaigns, isLoading, isError, error } = useCampaigns();

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

  const campaignList = campaigns ?? [];

  return (
    <div className="min-h-screen bg-[#0a100d]">
      {/* Top bar */}
      <AppHeader />

      <main className="mx-auto max-w-6xl px-4 py-8">
        {/* Page header */}
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <h1 className="font-serif text-3xl font-semibold text-[#f7f7ff]">
              Campaigns
            </h1>
            {!isLoading && (
              <p className="mt-1 text-sm text-[#b9baa3]/40">
                {campaignList.length} campaign{campaignList.length !== 1 ? "s" : ""}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={() => router.push("/campaigns/new")}
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
            New Campaign
          </button>
        </div>

        {/* Loading skeletons */}
        {isLoading && (
          <div
            aria-label="Loading campaigns"
            aria-busy="true"
            className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
          >
            {Array.from({ length: 6 }).map((_, i) => (
              <CampaignCardSkeleton key={i} />
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
              Failed to load campaigns
            </p>
            <p className="mt-1 text-sm text-[#b9baa3]/50">
              {(error as Error)?.message ?? "An unexpected error occurred."}
            </p>
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !isError && campaignList.length === 0 && (
          <div
            className="rounded-2xl border border-dashed border-slate-700/60 p-16 text-center space-y-5"
            style={{ background: "rgba(87,115,153,0.03)" }}
          >
            <div aria-hidden="true" className="text-5xl opacity-15 select-none">
              ⚔️
            </div>
            <div className="space-y-2">
              <p className="font-serif text-xl text-[#f7f7ff]/70">
                No campaigns yet
              </p>
              <p className="text-base text-[#b9baa3]/40 max-w-xs mx-auto leading-relaxed">
                Create a campaign to gather your party and manage your game session.
              </p>
            </div>
            <button
              type="button"
              onClick={() => router.push("/campaigns/new")}
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
              <span>+</span> Create Your First Campaign
            </button>
          </div>
        )}

        {/* Campaign grid */}
        {!isLoading && !isError && campaignList.length > 0 && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {campaignList.map((campaign) => (
              <CampaignCard
                key={campaign.campaignId}
                campaign={campaign}
                currentUserId={user?.userId}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
