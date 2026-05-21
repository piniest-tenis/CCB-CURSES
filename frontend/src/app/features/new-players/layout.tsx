/**
 * src/app/features/new-players/layout.tsx
 *
 * Server-component layout that provides SEO metadata for the new-players
 * feature page.  The page component itself is "use client", so metadata
 * must be exported from a server layout.
 */

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "New to Daggerheart? Start Here — Curses!",
  description:
    "Build your first Daggerheart character in minutes with guided creation, built-in SRD rules, and GM teaching tools. No rulebook required. Free forever.",
  openGraph: {
    title: "New to Daggerheart? Start Here — Curses!",
    description:
      "Build your first Daggerheart character in minutes with guided creation, built-in SRD rules, and GM teaching tools. No rulebook required. Free forever.",
    url: "/features/new-players",
  },
};

export default function NewPlayersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
