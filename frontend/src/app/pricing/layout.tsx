/**
 * src/app/pricing/layout.tsx
 *
 * Server-component layout that provides SEO metadata for the pricing page.
 * The page component itself is "use client", so metadata must be exported
 * from a server layout.
 */

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pricing — Free for Players, $5/month for GMs — Curses!",
  description:
    "Curses! is free for all Daggerheart players. GMs get campaigns, encounters, streaming overlays, and homebrew tools for $5/month. No trials, no hidden fees.",
  openGraph: {
    title: "Pricing — Free for Players, $5/month for GMs — Curses!",
    description:
      "Curses! is free for all Daggerheart players. GMs get campaigns, encounters, streaming overlays, and homebrew tools for $5/month. No trials, no hidden fees.",
    url: "/pricing",
  },
};

export default function PricingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
