"use client";

/**
 * src/components/LoadingInterstitial.tsx
 *
 * Full-screen loading overlay that shows lore content while the app
 * initialises or a character is being fetched.
 *
 * Behaviour:
 * • Shows for a minimum of 3 seconds regardless of how fast loading finishes.
 * • If the user clicks the card before it auto-dismisses, it stays up and
 *   reveals a "Continue →" button. The destination page is already rendered
 *   beneath the overlay.
 * • When loading finishes (isVisible → false) and the card has been clicked,
 *   the overlay fades to 15 % opacity rather than fully disappearing — the
 *   user then clicks Continue to dismiss it.
 * • If the user has not clicked, it dismisses normally once both the 3 s
 *   minimum and loading are done.
 */

import React, { useCallback, useEffect, useRef, useState, useMemo } from "react";
import { useCmsContent } from "@/hooks/useCmsContent";
import { MarkdownContent } from "@/components/MarkdownContent";

// ─── Props ────────────────────────────────────────────────────────────────────

interface LoadingInterstitialProps {
  /** When true the overlay is shown; when false loading is done. */
  isVisible: boolean;
}

// ─── Minimum display duration ─────────────────────────────────────────────────

const MIN_VISIBLE_MS = 3000;

// ─── Animated dot row ─────────────────────────────────────────────────────────

function LoadingDots() {
  return (
    <div className="flex items-center justify-center gap-1.5" aria-label="Loading">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="inline-block h-1.5 w-1.5 rounded-full bg-[#577399]"
          style={{
            animation: `interstitial-dot 1.2s ease-in-out ${i * 0.2}s infinite`,
          }}
        />
      ))}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function LoadingInterstitial({ isVisible }: LoadingInterstitialProps) {
  const { data: items } = useCmsContent("interstitial");

  // Pick a stable random item per mount.
  const itemIndexRef = useRef<number | null>(null);
  const item = useMemo(() => {
    if (!items || items.length === 0) return null;
    if (itemIndexRef.current === null) {
      itemIndexRef.current = Math.floor(Date.now() % items.length);
    }
    return items[itemIndexRef.current];
  }, [items]);

  // ── State ──────────────────────────────────────────────────────────────────

  /**
   * Animation phase:
   *   "hidden"   — not in DOM
   *   "entering" — fading in
   *   "visible"  — fully opaque, loading still in progress
   *   "dimmed"   — loading done but user clicked; overlay at 15 % opacity
   *   "leaving"  — fading out to 0 (then unmount)
   */
  type Phase = "hidden" | "entering" | "visible" | "dimmed" | "leaving";
  const [phase, setPhase] = useState<Phase>(() => (isVisible ? "entering" : "hidden"));

  // Whether the user has clicked the card at least once.
  const [userClicked, setUserClicked] = useState(false);

  // Whether the 3 s minimum has elapsed.
  const [minElapsed, setMinElapsed] = useState(false);

  // Whether the parent has signalled loading is done.
  const loadingDoneRef = useRef(!isVisible);

  const leaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const minTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── React to isVisible changes ────────────────────────────────────────────

  useEffect(() => {
    if (isVisible) {
      // Loading restarted — cancel any outgoing transition and reset state.
      if (leaveTimerRef.current) {
        clearTimeout(leaveTimerRef.current);
        leaveTimerRef.current = null;
      }
      if (minTimerRef.current) {
        clearTimeout(minTimerRef.current);
      }
      loadingDoneRef.current = false;
      setUserClicked(false);
      setMinElapsed(false);
      setPhase("entering");
      const enterT = setTimeout(() => setPhase("visible"), 350);
      minTimerRef.current = setTimeout(() => setMinElapsed(true), MIN_VISIBLE_MS);
      return () => {
        clearTimeout(enterT);
      };
    } else {
      // Loading is done.
      loadingDoneRef.current = true;
      // Actual dismissal is handled below in the effect that watches
      // minElapsed + loadingDone + userClicked together.
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isVisible]);

  // ── Dismissal logic ───────────────────────────────────────────────────────

  // Runs whenever any of the three dismissal conditions change.
  useEffect(() => {
    if (phase === "hidden" || phase === "leaving") return;

    const loadingDone = loadingDoneRef.current;

    if (!loadingDone || !minElapsed) {
      // Not ready to dismiss yet — nothing to do.
      return;
    }

    if (userClicked) {
      // User has clicked — drop to 15 % and wait for them to press Continue.
      setPhase("dimmed");
    } else {
      // Auto-dismiss normally.
      dismiss();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [minElapsed, userClicked, isVisible]);

  // ── Dismiss helpers ───────────────────────────────────────────────────────

  const dismiss = useCallback(() => {
    setPhase("leaving");
    leaveTimerRef.current = setTimeout(() => {
      setPhase("hidden");
      leaveTimerRef.current = null;
    }, 400);
  }, []);

  const handleContinue = useCallback(() => {
    dismiss();
  }, [dismiss]);

  const handleCardClick = useCallback(() => {
    if (phase === "dimmed") {
      // They clicked Continue or the dimmed overlay — dismiss.
      handleContinue();
      return;
    }
    // Only register clicks once the card is fully visible.
    if (phase !== "visible") return;
    setUserClicked(true);
  }, [phase, handleContinue]);

  // ── Clean up on unmount ───────────────────────────────────────────────────

  useEffect(() => {
    return () => {
      if (leaveTimerRef.current) clearTimeout(leaveTimerRef.current);
      if (minTimerRef.current) clearTimeout(minTimerRef.current);
    };
  }, []);

  // ── Render ────────────────────────────────────────────────────────────────

  if (phase === "hidden") return null;

  const isDimmed = phase === "dimmed";
  const isLeaving = phase === "leaving";
  const isEntering = phase === "entering";

  const overlayOpacity = isEntering || isLeaving ? 0 : isDimmed ? 0.15 : 1;

  return (
    <>
      <style>{`
        @keyframes interstitial-dot {
          0%, 80%, 100% { opacity: 0.2; transform: scale(0.8); }
          40%            { opacity: 1;   transform: scale(1.15); }
        }
        @keyframes interstitial-fade-in {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes interstitial-continue-in {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .interstitial-card-enter {
          animation: interstitial-fade-in 0.7s ease-out forwards;
        }
        .interstitial-continue-enter {
          animation: interstitial-continue-in 0.3s ease-out forwards;
        }
        .interstitial-overlay {
          transition: opacity 0.4s ease;
        }
        .interstitial-card-dim {
          transition: opacity 0.4s ease;
        }
      `}</style>

      {/* Full-screen overlay */}
      <div
        role="status"
        aria-live="polite"
        className="interstitial-overlay fixed inset-0 z-[9999] flex items-center justify-center"
        style={{
          opacity: overlayOpacity,
          background:
            "radial-gradient(ellipse at center, #0f1a16 0%, #0a100d 65%, #060c09 100%)",
          boxShadow: "inset 0 0 120px rgba(0,0,0,0.7)",
          pointerEvents: isLeaving ? "none" : "all",
          cursor: isDimmed ? "default" : undefined,
        }}
        onClick={isDimmed ? undefined : handleCardClick}
      >
        {/* Inner card — stays at full opacity even when overlay is dimmed */}
        <div
          className={`interstitial-card-dim relative mx-4 w-full max-w-[560px] rounded-2xl border border-[#577399]/25 bg-slate-900/90 overflow-hidden${isEntering || phase === "visible" ? " interstitial-card-enter" : ""}`}
          style={{
            boxShadow:
              "0 0 60px rgba(87,115,153,0.12), 0 24px 56px rgba(0,0,0,0.7)",
            // Counteract the parent opacity when dimmed so the card stays readable.
            // opacity: 1 on the card alone isn't enough since it's a child of the
            // dimmed overlay — we use a CSS filter trick instead.
            filter: isDimmed ? `brightness(${1 / 0.15})` : undefined,
          }}
          onClick={isDimmed ? undefined : (e) => e.stopPropagation()}
        >
          {/* Steel-blue top accent */}
          <div className="h-0.5 w-full bg-gradient-to-r from-transparent via-[#577399] to-transparent" />

          {/* Atmospheric image with gradient overlay and header label */}
          <div
            className="relative w-full overflow-hidden flex items-end px-8 pb-5"
            style={{
              height: item?.imageUrl ? "180px" : "120px",
              background: "linear-gradient(160deg, #0d1a24 0%, #0a100d 50%, #111a10 100%)",
            }}
          >
            {item?.imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={item.imageUrl}
                alt=""
                aria-hidden="true"
                className="absolute inset-0 w-full h-full object-cover"
              />
            )}
            {/* Semi-transparent gradient scrim — same style regardless of image */}
            <div
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(160deg, #0d1a24cc 0%, #0a100d99 50%, #111a10cc 100%)",
              }}
            />
            {/* "Lore & Legend" label — sits above scrim */}
            <span
              className="relative text-xs font-semibold uppercase tracking-[0.25em] select-none"
              aria-hidden="true"
              style={{
                color: "#577399",
                textShadow: "0 1px 4px #0a100d, 0 0 12px #0a100d",
              }}
            >
              Lore &amp; Legend
            </span>
          </div>

          {/* Text content */}
          <div className="px-8 py-6 space-y-3">
            {item ? (
              <>
                <p className="text-xs font-bold tracking-[0.25em] text-[#577399] font-serif-sc">
                  {item.title}
                </p>
                <MarkdownContent
                  className="text-sm text-[#b9baa3] leading-[1.8]"
                  linkClassName="text-[#7a9fc2] underline decoration-[#577399]/60 hover:text-[#9bbddb]"
                >
                  {item.body}
                </MarkdownContent>
              </>
            ) : (
              <>
                <div className="h-3 w-28 rounded bg-slate-800 animate-pulse" />
                <div className="space-y-2 pt-1">
                  <div className="h-3 w-full rounded bg-slate-800/70 animate-pulse" />
                  <div className="h-3 w-5/6 rounded bg-slate-800/70 animate-pulse" />
                  <div className="h-3 w-4/6 rounded bg-slate-800/70 animate-pulse" />
                </div>
              </>
            )}
          </div>

          {/* Footer — loading dots or Continue button */}
          <div className="border-t border-slate-800/60 px-8 py-4 flex items-center justify-between min-h-[52px]">
            {isDimmed ? (
              <button
                className="interstitial-continue-enter ml-auto text-[#b9baa3] hover:text-[#f7f7ff] text-sm font-semibold tracking-wide transition-colors"
                onClick={handleContinue}
              >
                Continue →
              </button>
            ) : (
              <>
                <span className="text-xs uppercase tracking-[0.2em] text-[#b9baa3]/30 select-none">
                  Loading
                </span>
                <LoadingDots />
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
