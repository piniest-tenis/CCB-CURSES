/**
 * src/components/campaign/CampaignCard.tsx
 *
 * Card component for the campaign list grid.
 * Shows: name, truncated description, member count, role badge, "Open" button.
 */

"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { RoleBadge } from "./RoleBadge";
import type { CampaignSummary } from "@/types/campaign";

interface CampaignCardProps {
  campaign: CampaignSummary;
  currentUserId?: string;
}

export function CampaignCard({ campaign, currentUserId }: CampaignCardProps) {
  const router = useRouter();
  const isPrimaryGm = campaign.primaryGmId === currentUserId;

  return (
    <article
      className="
        group relative flex flex-col gap-4 rounded-xl
        border border-[#577399]/30 bg-slate-900/80
        p-5 shadow-card-fantasy
        hover:shadow-card-fantasy-hover hover:border-[#577399]/60
        transition-all duration-200
      "
    >
      {/* Header row: name + role badge */}
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-serif text-lg font-semibold text-[#f7f7ff] leading-tight min-w-0 truncate">
          {campaign.name}
        </h3>
        {campaign.callerRole && (
          <div className="shrink-0">
            <RoleBadge
              role={campaign.callerRole}
              isPrimaryGm={isPrimaryGm && campaign.callerRole === "gm"}
            />
          </div>
        )}
      </div>

      {/* Description */}
      {campaign.description ? (
        <p className="text-sm text-[#b9baa3] leading-relaxed line-clamp-2">
          {campaign.description}
        </p>
      ) : (
        <p className="text-sm text-[#b9baa3]/40 italic">No description</p>
      )}

      {/* Footer: member count + Open button */}
      <div className="mt-auto flex items-center justify-between gap-3">
        <span className="text-xs text-[#b9baa3]/50">
          <span aria-label={`${campaign.memberCount} member${campaign.memberCount !== 1 ? "s" : ""}`}>
            {campaign.memberCount} member{campaign.memberCount !== 1 ? "s" : ""}
          </span>
        </span>

        <button
          type="button"
          onClick={() => router.push(`/campaigns/${campaign.campaignId}`)}
          aria-label={`Open campaign: ${campaign.name}`}
          className="
            rounded-lg px-4 py-2 text-sm font-semibold
            bg-[#577399] text-[#f7f7ff]
            hover:bg-[#577399]/80
            transition-colors shadow-sm
            focus:outline-none focus:ring-2 focus:ring-[#577399]
            focus:ring-offset-2 focus:ring-offset-slate-900
          "
        >
          Open
        </button>
      </div>
    </article>
  );
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────

export function CampaignCardSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="
        flex flex-col gap-4 rounded-xl
        border border-[#577399]/20 bg-slate-900/60
        p-5 animate-pulse
      "
    >
      <div className="flex items-start justify-between gap-3">
        <div className="h-5 w-40 rounded bg-slate-700/60" />
        <div className="h-5 w-14 rounded-full bg-slate-700/60" />
      </div>
      <div className="space-y-2">
        <div className="h-3.5 w-full rounded bg-slate-700/40" />
        <div className="h-3.5 w-3/4 rounded bg-slate-700/40" />
      </div>
      <div className="flex items-center justify-between">
        <div className="h-3 w-16 rounded bg-slate-700/40" />
        <div className="h-8 w-16 rounded-lg bg-slate-700/60" />
      </div>
    </div>
  );
}
