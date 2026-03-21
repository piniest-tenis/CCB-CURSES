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
  title: "Curses! Custom Character Builder",
  description: "Create and manage your character for the Tidwell campaign.",
  themeColor: "#0f1219",
  icons: {
    icon: "/images/curses-favicon-tilt.png",
    shortcut: "/images/curses-favicon-tilt.png",
    apple: "/images/curses-favicon-tilt.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="stylesheet" href="https://use.typekit.net/zko4lko.css" />
      </head>
      <body className="min-h-screen bg-slate-950 text-parchment-200 antialiased font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
