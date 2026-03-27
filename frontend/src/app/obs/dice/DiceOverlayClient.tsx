"use client";

/**
 * src/app/obs/dice/DiceOverlayClient.tsx
 *
 * OBS transparent overlay — full-bleed 3D dice canvas, nothing else.
 *
 * Flow:
 *   1. Reads ?campaign= → subscribes to BroadcastChannel "dh-dice-<id>"
 *   2. ROLL_RESULT received → playAnimation(req, rawValues).
 *      The raw die values from the player's completed roll are passed as seeds
 *      so the overlay's dice land on exactly the same faces via start_throw_seeded.
 *      playAnimation does not broadcast, so there is no echo loop.
 *      DiceRoller calls finishAnimation() when physics settle — no result
 *      computed, no ROLL_RESULT emitted, log untouched.
 *   3. When animation completes: hold 3 s → 1 s CSS fade-out → opacity 0
 *
 * The DiceRoller canvas fills 100vw × 100vh with no border, no rounded corners.
 */

import React, { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { DiceRoller } from "@/components/dice/DiceRoller";
import { useDiceStore } from "@/store/diceStore";
import type { RollResult } from "@/types/dice";

type FadeState = "idle" | "rolling" | "holding" | "fading";

export default function DiceOverlayClient() {
  const searchParams = useSearchParams();
  const campaignId   = searchParams?.get("campaign") ?? null;
  const channelName  = campaignId ? `dh-dice-${campaignId}` : "dh-dice";

  const isRolling    = useDiceStore((s) => s.isRolling);
  const [fade, setFade] = useState<FadeState>("idle");
  const timerRef     = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevRolling  = useRef(false);

  // Subscribe to ROLL_RESULT so we replay with the player's exact die values.
  useEffect(() => {
    if (typeof window === "undefined" || !("BroadcastChannel" in window)) return;
    const ch = new BroadcastChannel(channelName);
    ch.onmessage = (evt) => {
      if (evt.data?.type === "ROLL_RESULT" && evt.data.result) {
        const result     = evt.data.result as RollResult;
        const rawValues  = result.dice.map((d) => d.value);
        useDiceStore.getState().playAnimation(result.request, rawValues);
      }
    };
    return () => ch.close();
  }, [channelName]);

  // Opacity lifecycle: idle(0) → rolling(1) → holding(1) → fading(0)
  useEffect(() => {
    if (isRolling && !prevRolling.current) {
      prevRolling.current = true;
      if (timerRef.current) clearTimeout(timerRef.current);
      setFade("rolling");
    }
    if (!isRolling && prevRolling.current) {
      prevRolling.current = false;
      setFade("holding");
      timerRef.current = setTimeout(() => {
        setFade("fading");
        timerRef.current = setTimeout(() => setFade("idle"), 1000);
      }, 3000);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRolling]);

  // Cleanup timers on unmount
  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  const opacity    = fade === "idle" ? 0 : 1;
  const transition = fade === "fading" ? "opacity 1s ease-out" : "none";

  return (
    <div
      style={{
        position:   "fixed",
        inset:      0,
        background: "transparent",
        overflow:   "hidden",
        opacity,
        transition,
      }}
    >
      <DiceRoller fullBleed transparent animationOnly />
    </div>
  );
}
