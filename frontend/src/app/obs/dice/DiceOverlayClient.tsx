"use client";

/**
 * src/app/obs/dice/DiceOverlayClient.tsx
 *
 * OBS-compatible transparent overlay — shows only the 3D dice animation.
 * No result panel. No placeholder text.
 *
 * Flow:
 *   1. Reads ?campaign= from the URL → subscribes to BroadcastChannel "dh-dice-<id>"
 *   2. On ROLL_REQUEST message → calls useDiceStore.requestRoll() locally, which
 *      triggers the local DiceRoller canvas to animate.
 *   3. After rolling completes (isRolling flips false) → 3-second hold then
 *      smooth 1-second fade-out.
 *
 * Add as OBS Browser Source at 800×400 with transparent background.
 */

import React, { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { DiceRoller } from "@/components/dice/DiceRoller";
import { useDiceStore } from "@/store/diceStore";
import type { RollRequest } from "@/types/dice";

type FadeState = "hidden" | "visible" | "fading";

export default function DiceOverlayClient() {
  const searchParams   = useSearchParams();
  const campaignId     = searchParams?.get("campaign") ?? null;
  const channelName    = campaignId ? `dh-dice-${campaignId}` : "dh-dice";

  const { isRolling }  = useDiceStore();
  const [fade, setFade] = useState<FadeState>("hidden");
  const fadeTimer      = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wasRolling     = useRef(false);

  // Subscribe to BroadcastChannel and trigger local roll when ROLL_REQUEST arrives
  useEffect(() => {
    if (typeof window === "undefined" || !("BroadcastChannel" in window)) return;

    const ch = new BroadcastChannel(channelName);
    ch.onmessage = (evt) => {
      if (evt.data?.type === "ROLL_REQUEST" && evt.data.request) {
        const req = evt.data.request as RollRequest;
        // Trigger local animation — clears staged and starts isRolling
        useDiceStore.getState().requestRoll(req);
      }
    };
    return () => ch.close();
  }, [channelName]);

  // Show canvas when rolling starts; start 3s fade-out timer when it finishes
  useEffect(() => {
    if (isRolling && !wasRolling.current) {
      // Roll just started — make visible, cancel any pending fade
      wasRolling.current = true;
      if (fadeTimer.current) clearTimeout(fadeTimer.current);
      setFade("visible");
    }

    if (!isRolling && wasRolling.current) {
      // Roll just finished — hold 3s then fade over 1s
      wasRolling.current = false;
      fadeTimer.current  = setTimeout(() => {
        setFade("fading");
        // After CSS transition (1s) mark fully hidden
        fadeTimer.current = setTimeout(() => setFade("hidden"), 1000);
      }, 3000);
    }

    return () => {
      if (fadeTimer.current) clearTimeout(fadeTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRolling]);

  return (
    <div
      className="w-screen h-screen overflow-hidden"
      style={{ background: "transparent" }}
    >
      {/* Canvas wrapper — always mounted so the DiceRoller can initialize,
          but opacity-controlled to hide/show it */}
      <div
        style={{
          opacity:    fade === "visible" ? 1 : 0,
          transition: fade === "fading" ? "opacity 1s ease-out" : "none",
          width:  "100%",
          height: "100%",
        }}
      >
        <DiceRoller width={800} height={400} transparent />
      </div>
    </div>
  );
}
