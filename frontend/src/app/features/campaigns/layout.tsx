/**
 * src/app/features/campaigns/layout.tsx
 *
 * Server-component layout that provides SEO metadata for the campaigns
 * feature page.  The page component itself is "use client", so metadata
 * must be exported from a server layout.
 */

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Campaign Management & Encounter Designer for Daggerheart — Curses!",
  description:
    "Design encounters, manage sessions, track party vitals, and run your Daggerheart campaign from a single dashboard. The complete GM toolkit for $5/month.",
  openGraph: {
    title:
      "Campaign Management & Encounter Designer for Daggerheart — Curses!",
    description:
      "Design encounters, manage sessions, track party vitals, and run your Daggerheart campaign from a single dashboard. The complete GM toolkit for $5/month.",
    url: "/features/campaigns",
  },
};

export default function CampaignsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
