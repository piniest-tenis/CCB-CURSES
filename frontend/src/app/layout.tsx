/**
 * src/app/layout.tsx
 *
 * Next.js 14 root layout.
 * Sets up: QueryClientProvider, auth initialization on mount, dark-mode class.
 */

import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "Daggerheart Character Platform",
  description: "Create and manage your Daggerheart character sheets.",
  themeColor: "#0f1219",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-slate-950 text-parchment-200 antialiased font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
