"use client";

/**
 * src/app/campaigns/layout.tsx
 *
 * Campaign section layout. Campaign access is no longer blocked behind Patreon;
 * individual pages still handle authentication and any feature-specific upsells.
 */

import React from "react";
import { useAuthStore } from "@/store/authStore";

export default function CampaignsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  // If not authenticated the individual pages handle their own auth guards
  // (redirect to login).
  if (!isAuthenticated) {
    return <>{children}</>;
  }

  return <>{children}</>;
}
