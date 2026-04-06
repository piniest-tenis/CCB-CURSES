"use client";

/**
 * src/components/dashboard/CampaignRailWidget.tsx
 *
 * Right-rail compact widget showing the user's most recently active campaign
 * with a quick "View" link, member count, and role badge.
 */

import React from "react";
import Link from "next/link";
import type { CampaignSummary } from "@shared/types";

interface CampaignRailWidgetProps {
  campaigns: CampaignSummary[];
}

export function CampaignRailWidget({ campaigns }: CampaignRailWidgetProps) {
  const sorted = [...campaigns].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
  const top = sorted.slice(0, 3);

  return (
    <div className="rounded-xl border border-[#577399]/30 bg-slate-900/80 p-5 shadow-card-fantasy">
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-[#b9baa3]/50">
          Campaigns
        </p>
        <Link
          href="/campaigns"
          className="text-xs text-[#577399]/60 hover:text-[#577399] transition-colors"
        >
          All →
        </Link>
      </div>

      {top.length === 0 ? (
        <p className="text-sm text-[#b9baa3]/30 italic">No campaigns yet.</p>
      ) : (
        <div className="space-y-3">
          {top.map((c) => (
            <div key={c.campaignId} className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <Link
                  href={`/campaigns/${c.campaignId}`}
                  className="text-sm font-medium text-[#f7f7ff] hover:text-[#577399] transition-colors truncate block"
                >
                  {c.name}
                </Link>
                <p className="text-xs text-[#b9baa3]/40 mt-0.5">
                  {c.memberCount} member{c.memberCount !== 1 ? "s" : ""}
                  {c.callerRole && (
                    <span className={[
                      "ml-1.5 rounded px-1 py-px text-[11px] font-semibold",
                      c.callerRole === "gm"
                        ? "bg-gold-900/40 text-gold-400"
                        : "bg-[#577399]/10 text-[#577399]/70",
                    ].join(" ")}>
                      {c.callerRole === "gm" ? "GM" : "Player"}
                    </span>
                  )}
                </p>
              </div>
              <Link
                href={`/campaigns/${c.campaignId}`}
                className="shrink-0 text-xs text-[#577399]/50 hover:text-[#577399] transition-colors whitespace-nowrap"
                aria-label={`View campaign ${c.name}`}
              >
                View →
              </Link>
            </div>
          ))}
        </div>
      )}

      <Link
        href="/campaigns/new"
        className="
          mt-4 flex items-center justify-center gap-1.5
          rounded-lg border border-[#577399]/30 bg-transparent
          py-2 text-xs font-medium text-[#577399]/60
          hover:border-[#577399]/60 hover:text-[#577399]
          transition-colors
          focus:outline-none focus:ring-2 focus:ring-[#577399] focus:ring-offset-2 focus:ring-offset-slate-900
        "
      >
        <span aria-hidden="true">+</span> New Campaign
      </Link>
    </div>
  );
}
