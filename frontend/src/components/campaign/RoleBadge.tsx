/**
 * src/components/campaign/RoleBadge.tsx
 *
 * Displays a styled role badge for campaign members.
 * Roles: "gm" (primary GM) | "player"
 * All variants include visible text labels for screen reader accessibility.
 */

import React from "react";
import type { CampaignMemberRole } from "@/types/campaign";

interface RoleBadgeProps {
  role: CampaignMemberRole;
  /** Whether this member is the primary GM (has extra visual weight). */
  isPrimaryGm?: boolean;
  className?: string;
}

export function RoleBadge({ role, isPrimaryGm = false, className = "" }: RoleBadgeProps) {
  if (role === "gm") {
    return (
      <span
        className={[
          "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold",
          isPrimaryGm
            ? "bg-gold-950/30 border border-gold-700/60 text-gold-400"
            : "bg-burgundy-950/30 border border-burgundy-700/60 text-burgundy-400 font-semibold",
          className,
        ].join(" ")}
        aria-label={isPrimaryGm ? "Primary Game Master" : "Co-Game Master"}
      >
        {/* Icon is decorative — text label carries the meaning */}
        <span aria-hidden="true">{isPrimaryGm ? "♛" : "⚔"}</span>
        <span>{isPrimaryGm ? "GM" : "Co-GM"}</span>
      </span>
    );
  }

  // player role
  return (
    <span
      className={[
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs",
        "bg-slate-800/50 border border-slate-600/40 text-slate-300",
        className,
      ].join(" ")}
      aria-label="Player"
    >
      <span aria-hidden="true">◆</span>
      <span>Player</span>
    </span>
  );
}
