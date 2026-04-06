"use client";

/**
 * src/components/dashboard/SessionPanel.tsx
 *
 * Right-rail session panel. Derives next session date from CampaignSummary.
 * Shows placeholder "no session notes yet" for future Sprint 2 data.
 */

import React, { useMemo } from "react";
import Link from "next/link";
import type { CampaignSummary, SessionSchedule } from "@shared/types";

// ─── nextOccurrence helper ────────────────────────────────────────────────────

const DAY_NAMES: Record<string, number> = {
  sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
  thursday: 4, friday: 5, saturday: 6,
};

function nextOccurrence(schedule: SessionSchedule): Date | null {
  const now = Date.now();
  let earliest: Date | null = null;

  for (const slot of schedule.slots) {
    const targetDow = DAY_NAMES[slot.day];
    if (targetDow === undefined) continue;

    for (let offset = 0; offset <= 7; offset++) {
      const candidate = new Date(now + offset * 86_400_000);
      const tz = slot.timezone ?? "UTC";

      let candidateDow: number;
      try {
        const fmt = new Intl.DateTimeFormat("en-US", { timeZone: tz, weekday: "short" });
        const wdStr = fmt.format(candidate);
        const WD: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
        candidateDow = WD[wdStr] ?? candidate.getDay();
      } catch {
        candidateDow = candidate.getDay();
      }

      if (candidateDow !== targetDow) continue;

      const [hh, mm] = (slot.time ?? "00:00").split(":").map(Number);
      try {
        const parts = new Intl.DateTimeFormat("en-CA", {
          timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit",
        }).formatToParts(candidate);
        const y = parts.find((p) => p.type === "year")?.value  ?? "1970";
        const mo = parts.find((p) => p.type === "month")?.value ?? "01";
        const d = parts.find((p) => p.type === "day")?.value   ?? "01";
        const isoLocal = `${y}-${mo}-${d}T${String(hh ?? 0).padStart(2, "0")}:${String(mm ?? 0).padStart(2, "0")}:00`;
        const localMs = new Date(isoLocal).getTime();
        const offsetMs =
          new Date(new Date(isoLocal + "Z").toLocaleString("en-US", { timeZone: tz })).getTime() -
          new Date(isoLocal + "Z").getTime();
        const sessionMs = localMs - offsetMs;
        if (sessionMs > now) {
          const d2 = new Date(sessionMs);
          if (!earliest || d2 < earliest) earliest = d2;
          break;
        }
      } catch {
        // fallback: treat as UTC
        const d2 = new Date(candidate);
        d2.setUTCHours(hh ?? 0, mm ?? 0, 0, 0);
        if (d2.getTime() > now && (!earliest || d2 < earliest)) {
          earliest = d2;
          break;
        }
      }
    }
  }

  return earliest;
}

// ─── SessionPanel ─────────────────────────────────────────────────────────────

interface SessionPanelProps {
  /** The campaign whose schedule to display (or null for no active campaign). */
  campaign: CampaignSummary | null;
}

export function SessionPanel({ campaign }: SessionPanelProps) {
  const nextDate = useMemo(() => {
    // Prefer server-computed value if available
    if (campaign?.nextSessionAt) return new Date(campaign.nextSessionAt);
    if (campaign?.schedule) return nextOccurrence(campaign.schedule);
    return null;
  }, [campaign]);

  const nextDateLabel = useMemo(() => {
    if (!nextDate) return null;
    return nextDate.toLocaleDateString(undefined, {
      weekday: "long",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }, [nextDate]);

  return (
    <div className="rounded-xl border border-[#577399]/30 bg-slate-900/80 p-5 shadow-card-fantasy space-y-4">
      <p className="text-xs font-semibold uppercase tracking-widest text-parchment-500">
        Session
      </p>

      {/* Next session */}
      <div>
        <p className="text-xs text-parchment-500 mb-1">Next session</p>
        {campaign ? (
          nextDate ? (
            <time
              dateTime={nextDate.toISOString()}
              className="text-sm font-semibold text-[#f7f7ff]"
            >
              {nextDateLabel}
            </time>
          ) : (
            <p className="text-sm font-medium text-parchment-500">
              No schedule set.{" "}
              <Link
                href={`/campaigns/${campaign.campaignId}/settings`}
                className="text-steel-accessible hover:text-[#f7f7ff] underline-offset-2 hover:underline transition-colors"
              >
                Add one →
              </Link>
            </p>
          )
        ) : (
          <p className="text-sm font-medium text-parchment-600">Join a campaign to see sessions.</p>
        )}
      </div>

      {/* Last session / notes placeholder */}
      <div className="border-t border-slate-700/40 pt-4">
        <p className="text-xs text-parchment-500 mb-1">Last session recap</p>
        <p className="text-sm text-parchment-600 leading-relaxed">
          No session notes yet.
        </p>
        <p className="text-xs text-parchment-600 mt-1">
          Session recaps will appear here after each session.
        </p>
        {/* TODO: Replace with SessionNote[] from GET /campaigns/:id/sessions when available */}
      </div>
    </div>
  );
}
