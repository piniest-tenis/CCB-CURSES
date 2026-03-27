/**
 * src/app/obs/dice-log/page.tsx
 *
 * OBS Browser Source — Dice log overlay.
 * Shows the last 10 rolls from BroadcastChannel. No dice animation.
 * Transparent background. Add as Browser Source at 380×500.
 *
 * Usage in OBS:
 *   URL: https://<your-domain>/obs/dice-log
 *   Width: 380, Height: 500
 *   Custom CSS: body { background: transparent !important; }
 */

import type { Metadata } from "next";
import { Suspense } from "react";
import DiceLogOverlayClient from "./DiceLogOverlayClient";

export const metadata: Metadata = {
  title: "Dice Log Overlay — Daggerheart",
  robots: { index: false, follow: false },
};

export default function DiceLogOverlayPage() {
  return (
    <Suspense fallback={null}>
      <DiceLogOverlayClient />
    </Suspense>
  );
}
