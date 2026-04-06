/**
 * src/app/obs/dice/page.tsx
 *
 * OBS Browser Source — Live dice animation overlay.
 * Transparent background. Add as Browser Source at 800×400.
 *
 * This page renders the 3D dice animation (DiceRoller canvas) and shows
 * the last roll result. It receives roll events via BroadcastChannel from
 * the main character sheet (same browser, different tab).
 *
 * Usage in OBS:
 *   URL: https://<your-domain>/obs/dice
 *   Width: 800, Height: 400
 *   Custom CSS: body { background: transparent !important; }
 */

import type { Metadata } from "next";
import { Suspense } from "react";
import DiceOverlayClient from "./DiceOverlayClient";

export const metadata: Metadata = {
  title: "Dice Overlay — Daggerheart",
  robots: { index: false, follow: false },
};

export default function DiceOverlayPage() {
  return (
    <Suspense fallback={null}>
      <DiceOverlayClient />
    </Suspense>
  );
}
