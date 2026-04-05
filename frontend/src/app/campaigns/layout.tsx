"use client";

/**
 * src/app/campaigns/layout.tsx
 *
 * Campaign section layout. Gates all campaign routes behind the paid
 * Patreon tier using a full-page overlay. Users who are grandfathered
 * or have an active paid Patreon membership pass through normally.
 *
 * Free Patreon members and non-Patreon users see the content greyed
 * out with a prominent upgrade CTA overlay.
 */

import React from "react";
import { usePatreonGate } from "@/hooks/usePatreonGate";
import { useAuthStore } from "@/store/authStore";
import { PatreonPaidGate } from "@/components/PatreonGateOverlay";

export default function CampaignsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { canAccessCampaigns } = usePatreonGate();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  // If not authenticated the individual pages handle their own auth guards
  // (redirect to login). Don't add the Patreon gate for unauthenticated users.
  if (!isAuthenticated) {
    return <>{children}</>;
  }

  // Users with paid Patreon or grandfathered accounts pass through
  if (canAccessCampaigns) {
    return <>{children}</>;
  }

  // Gate the entire campaign section
  return (
    <PatreonPaidGate className="min-h-screen">
      {children}
    </PatreonPaidGate>
  );
}
