"use client";

/**
 * src/components/LoadingInterstitial.tsx
 *
 * Full-screen loading overlay that shows lore content while the app
 * initialises or a character is being fetched.
 *
 * The overlay frames CMS lore entries as "Tales of Tidwell" — short,
 * immersive world-building vignettes that give the user something
 * interesting to read while they wait.
 *
 * Behaviour:
 * • Shows for a minimum of 300 ms so the overlay doesn't flash.
 * • If the user clicks the card before it auto-dismisses, it stays up and
 *   reveals a "Continue →" button. The destination page is already rendered
 *   beneath the overlay.
 * • When loading finishes (isVisible → false) and the card has been clicked,
 *   the overlay fades to 15 % opacity rather than fully disappearing — the
 *   user then clicks Continue to dismiss it.
 * • If the user has not clicked, it dismisses normally once both the minimum
 *   time and loading are done.
 */

import React, { useCallback, useEffect, useRef, useState, useMemo } from "react";
import dynamic from "next/dynamic";
import { useCmsContent } from "@/hooks/useCmsContent";

// Lazy-load MarkdownContent so react-markdown + remark-gfm (~144 KB) are not
// in the critical path of every page.
const MarkdownContent = dynamic(
  () => import("@/components/MarkdownContent").then((m) => m.MarkdownContent),
  { ssr: false }
);

// ─── Props ────────────────────────────────────────────────────────────────────

interface LoadingInterstitialProps {
  /** When true the overlay is shown; when false loading is done. */
  isVisible: boolean;
}

// ─── Minimum display duration ─────────────────────────────────────────────────
// Keep just enough time to avoid a jarring flash; the overlay dismisses as
// soon as loading finishes (or after 300 ms, whichever is later).

const MIN_VISIBLE_MS = 300;

// ─── Animated loading bar ─────────────────────────────────────────────────────

function LoadingBar() {
  return (
    <div
      className="h-0.5 w-full overflow-hidden rounded-full bg-[#577399]/10"
      role="progressbar"
      aria-label="Loading"
    >
      <div
        className="h-full rounded-full bg-[#577399]/50"
        style={{
          animation: "interstitial-bar 2.4s ease-in-out infinite",
        }}
      />
    </div>
  );
}

// ─── Decorative separator ─────────────────────────────────────────────────────

function OrnamentalDivider() {
  return (
    <div className="flex items-center gap-3 py-1" aria-hidden="true">
      <div className="h-px flex-1 bg-gradient-to-r from-transparent to-[#577399]/30" />
      <div className="h-1 w-1 rounded-full bg-[#577399]/40" />
      <div className="h-px flex-1 bg-gradient-to-l from-transparent to-[#577399]/30" />
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

  // Whether the minimum display time has elapsed.
  const [minElapsed, setMinElapsed] = useState(false);

  // Whether the interaction hint should be shown (fades in after a delay).
  const [showHint, setShowHint] = useState(false);

  // Whether the parent has signalled loading is done.
  const loadingDoneRef = useRef(!isVisible);

  const leaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const minTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
      if (hintTimerRef.current) {
        clearTimeout(hintTimerRef.current);
      }
      loadingDoneRef.current = false;
      setUserClicked(false);
      setMinElapsed(false);
      setShowHint(false);
      setPhase("entering");
      const enterT = setTimeout(() => setPhase("visible"), 350);
      minTimerRef.current = setTimeout(() => setMinElapsed(true), MIN_VISIBLE_MS);
      // Show the interaction hint after 1.8s — enough time to start reading
      hintTimerRef.current = setTimeout(() => setShowHint(true), 1800);
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
    setShowHint(false); // Hide the hint once they've interacted
  }, [phase, handleContinue]);

  // ── Clean up on unmount ───────────────────────────────────────────────────

  useEffect(() => {
    return () => {
      if (leaveTimerRef.current) clearTimeout(leaveTimerRef.current);
      if (minTimerRef.current) clearTimeout(minTimerRef.current);
      if (hintTimerRef.current) clearTimeout(hintTimerRef.current);
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
        @keyframes interstitial-bar {
          0%   { width: 0%;   margin-left: 0; }
          50%  { width: 40%;  margin-left: 30%; }
          100% { width: 0%;   margin-left: 100%; }
        }
        @keyframes interstitial-fade-in {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes interstitial-hint-in {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes interstitial-continue-in {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .interstitial-card-enter {
          animation: interstitial-fade-in 0.7s ease-out forwards;
        }
        .interstitial-hint-enter {
          animation: interstitial-hint-in 0.6s ease-out forwards;
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
        @media (prefers-reduced-motion: reduce) {
          .interstitial-card-enter,
          .interstitial-hint-enter,
          .interstitial-continue-enter {
            animation: none !important;
            opacity: 1 !important;
          }
          @keyframes interstitial-bar {
            0%, 100% { width: 30%; margin-left: 35%; }
          }
        }
      `}</style>

      {/* Full-screen overlay */}
      <div
        role="status"
        aria-live="polite"
        className="interstitial-overlay fixed inset-0 z-[9999] flex items-center justify-center px-4"
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
          className={`interstitial-card-dim relative w-full max-w-[620px] rounded-2xl border border-[#577399]/20 bg-slate-900/90 overflow-hidden${isEntering || phase === "visible" ? " interstitial-card-enter" : ""}`}
          style={{
            boxShadow:
              "0 0 80px rgba(87,115,153,0.08), 0 24px 64px rgba(0,0,0,0.7)",
            // Counteract the parent opacity when dimmed so the card stays readable.
            filter: isDimmed ? `brightness(${1 / 0.15})` : undefined,
          }}
          onClick={isDimmed ? undefined : (e) => e.stopPropagation()}
        >
          {/* ── Top accent line ─────────────────────────────────────────── */}
          <div className="h-px w-full bg-gradient-to-r from-transparent via-[#577399]/60 to-transparent" />

          {/* ── Atmospheric image header ────────────────────────────────── */}
          <div
            className="relative w-full overflow-hidden"
            style={{
              height: item?.imageUrl ? "160px" : "0px",
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
            {/* Gradient scrim over the image */}
            {item?.imageUrl && (
              <div
                className="absolute inset-0"
                style={{
                  background:
                    "linear-gradient(to bottom, transparent 20%, #0a100dee 90%, #0a100d 100%)",
                }}
              />
            )}
          </div>

          {/* ── Content area ────────────────────────────────────────────── */}
          <div className="px-7 sm:px-9 pt-7 pb-6 space-y-5">
            {/* Framing label — signals "here's something interesting while you wait" */}
            <div className="space-y-1.5 text-center">
              <p
                className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#577399]/70 select-none"
                aria-hidden="true"
              >
                Tales of Tidwell
              </p>
              <p className="text-[13px] text-[#b9baa3]/40 italic select-none">
                A piece of the world, while you wait&hellip;
              </p>
            </div>

            <OrnamentalDivider />

            {/* Title + Body */}
            {item ? (
              <div className="space-y-4">
                <h2
                  className="font-serif text-lg sm:text-xl font-semibold tracking-wide text-[#f7f7ff]/90 text-center"
                  style={{
                    textShadow: "0 1px 8px rgba(87,115,153,0.15)",
                  }}
                >
                  {item.title}
                </h2>
                <MarkdownContent
                  className="text-[15px] text-[#c8c9b5] leading-[1.85] sm:leading-[1.9]"
                  linkClassName="text-[#7a9fc2] underline decoration-[#577399]/50 underline-offset-2 hover:text-[#9bbddb] transition-colors"
                >
                  {item.body}
                </MarkdownContent>
              </div>
            ) : (
              /* Skeleton while CMS data loads */
              <div className="space-y-4">
                <div className="flex justify-center">
                  <div className="h-5 w-44 rounded bg-slate-800 animate-pulse" />
                </div>
                <div className="space-y-2.5">
                  <div className="h-3.5 w-full rounded bg-slate-800/60 animate-pulse" />
                  <div className="h-3.5 w-11/12 rounded bg-slate-800/60 animate-pulse" />
                  <div className="h-3.5 w-5/6 rounded bg-slate-800/60 animate-pulse" />
                  <div className="h-3.5 w-3/4 rounded bg-slate-800/60 animate-pulse" />
                </div>
              </div>
            )}
          </div>

          {/* ── Interaction hint — fades in after a delay ───────────────── */}
          {showHint && !userClicked && !isDimmed && (
            <div className="interstitial-hint-enter px-7 sm:px-9 pb-2 text-center">
              <p className="text-[11px] text-[#577399]/50 select-none">
                Tap anywhere to keep reading after loading
              </p>
            </div>
          )}

          {/* ── Footer ─────────────────────────────────────────────────── */}
          <div className="px-7 sm:px-9 pb-5 pt-3">
            {isDimmed ? (
              <div className="interstitial-continue-enter flex items-center justify-center">
                <button
                  className="
                    group flex items-center gap-2 rounded-lg
                    border border-[#577399]/30 bg-[#577399]/10
                    px-6 py-2.5
                    text-sm font-semibold tracking-wide text-[#b9baa3]
                    hover:border-[#577399]/50 hover:bg-[#577399]/20 hover:text-[#f7f7ff]
                    transition-all duration-200
                    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#577399]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900
                  "
                  onClick={handleContinue}
                >
                  Continue
                  <span className="transition-transform duration-200 group-hover:translate-x-0.5">
                    →
                  </span>
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <LoadingBar />
                <p className="text-center text-xs text-[#b9baa3]/30 tracking-wide select-none">
                  Preparing your adventure
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
