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
        <link rel="stylesheet" href="https://use.typekit.net/zko4lko.css" />
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css" integrity="sha512-DTOQO9RWCH3ppGqcWaEA1BIZOC6xxalwEsw9c2QQeAIftl+Vegovlnee1c9QX4TctnWMn13TZye+giMm8e2LwA==" crossOrigin="anonymous" referrerPolicy="no-referrer" />
      </head>
      <body className="min-h-screen bg-background text-foreground antialiased font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
