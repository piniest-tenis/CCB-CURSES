/**
 * src/app/features/streaming/layout.tsx
 *
 * Server-component layout that provides SEO metadata for the streaming
 * feature page.  The page component itself is "use client", so metadata
 * must be exported from a server layout.
 */

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Streaming & OBS Tools for Daggerheart — Curses!",
  description:
    "Twitch overlays, OBS dice animations, and live character cards for your Daggerheart stream. The first TTRPG character platform with native streaming tools. Free to start.",
  openGraph: {
    title: "Streaming & OBS Tools for Daggerheart — Curses!",
    description:
      "Twitch overlays, OBS dice animations, and live character cards for your Daggerheart stream. The first TTRPG character platform with native streaming tools. Free to start.",
    url: "/features/streaming",
  },
};

export default function StreamingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
