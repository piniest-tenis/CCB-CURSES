/**
 * src/app/layout.tsx
 *
 * Next.js 14 root layout.
 * Sets up: QueryClientProvider, auth initialization on mount, dark-mode class.
 */

import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "Curses!",
  description: "Build and manage your Daggerheart characters and campaigns.",
  icons: {
    icon: "/images/curses-favicon-tilt.png",
    shortcut: "/images/curses-favicon-tilt.png",
    apple: "/images/curses-favicon-tilt.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#0f1219",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5, // Allow pinch-zoom for accessibility; prevents 980px default iOS viewport
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        {/* Preconnect to font / icon CDNs so DNS + TLS happen early */}
        <link rel="preconnect" href="https://use.typekit.net" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://cdnjs.cloudflare.com" crossOrigin="anonymous" />

        {/*
          Load external stylesheets as preloads, then apply them once loaded.
          This prevents them from blocking first paint while still loading
          them with high priority. The <noscript> fallback ensures styles
          load without JS.
        */}
        <link
          rel="preload"
          href="https://use.typekit.net/zko4lko.css"
          as="style"
        />
        <link
          rel="preload"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/fontawesome.min.css"
          as="style"
          crossOrigin="anonymous"
        />
        <link
          rel="preload"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/solid.min.css"
          as="style"
          crossOrigin="anonymous"
        />
        <link
          rel="preload"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/regular.min.css"
          as="style"
          crossOrigin="anonymous"
        />

        {/* Inline script to upgrade preloads to stylesheets once they arrive */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              document.addEventListener('DOMContentLoaded', function() {
                var links = document.querySelectorAll('link[rel="preload"][as="style"]');
                links.forEach(function(link) {
                  link.rel = 'stylesheet';
                });
              });
            `,
          }}
        />

        <noscript>
          <link rel="stylesheet" href="https://use.typekit.net/zko4lko.css" />
          <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/fontawesome.min.css" />
          <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/solid.min.css" />
          <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/regular.min.css" />
        </noscript>
      </head>
      <body className="min-h-screen bg-background text-foreground antialiased font-body">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
