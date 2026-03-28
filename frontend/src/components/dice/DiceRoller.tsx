"use client";

/**
 * src/components/dice/DiceRoller.tsx
 *
 * Renders the 3D dice animation canvas using dice.js (vendored Three.js + Cannon.js).
 *
 * Architecture:
 *  - Loads three.min.js → cannon.min.js → teal.js → dice.js SEQUENTIALLY via
 *    dynamic <script> injection. next/script "afterInteractive" loads all scripts
 *    concurrently, so dice.js would execute before THREE is defined. Instead we
 *    inject each script tag only after the previous one's onload fires.
 *  - Polls window.DICE after mounting so subsequent mounts (where scripts are
 *    already in the DOM and won't re-fire onload) still initialise correctly.
 *  - Uses DICE.dice_box — the vendored library exposes window.DICE.
 *  - Calls box.setDice(notationString) before each start_throw (required by the engine).
 *  - start_throw(before_roll, after_roll, dieColors):
 *      • before_roll is null (we don't pre-seed values)
 *      • after_roll receives the notation object: { result: number[], resultTotal, … }
 *      • dieColors is a string[] parallel to notation.set e.g. ['hope','fear']
 *  - Calls diceStore.resolveRoll(rawValues) with an array of integers.
 *  - Exposes NO swipe/click interaction — all rolls are programmatic.
 *
 * Color overrides (applied per-die inside dice.js via window.DICE._dieColors):
 *   hope      → { dice_color: "#DAA520", label_color: "#36454F" }
 *   fear      → { dice_color: "#36454F", label_color: "#DAA520" }
 *   advantage → { dice_color: "#202020", label_color: "#aaaaaa" }
 *   damage    → { dice_color: "#202020", label_color: "#aaaaaa" }
 *   generic   → { dice_color: "#202020", label_color: "#aaaaaa" }
 */

import React, {
  useEffect,
  useRef,
  useState,
} from "react";
import { useDiceStore } from "@/store/diceStore";
import type { DieRole, DieSize } from "@/types/dice";
import { buildColorOverrides, resolveDiceColors, resolveGmDiceColor } from "@/lib/diceColorResolver";

// ─── Globals injected by the vendored scripts ─────────────────────────────────
// dice.js assigns window.DICE = DICE at its bottom.

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    DICE: any;
  }
}

// ─── Color overrides ──────────────────────────────────────────────────────────

/** System-default color map; used when no custom colorOverrides prop is provided. */
const DEFAULT_COLOR_OVERRIDES: Record<DieRole, { dice_color: string; label_color: string }> =
  buildColorOverrides(resolveDiceColors(), resolveGmDiceColor());

// ─── Die notation mapping ─────────────────────────────────────────────────────

const DIE_NOTATION: Record<DieSize, string> = {
  d4:  "d4",
  d6:  "d6",
  d8:  "d8",
  d10: "d10",
  d12: "d12",
  d20: "d20",
};

// ─── Sequential script loader ─────────────────────────────────────────────────
// Injects scripts one at a time, waiting for each onload before the next.
// Skips a script if a <script src="..."> for it is already in the DOM.

// Bump this version string whenever dice-libs files change, to bust browser cache.
const DICE_LIBS_VERSION = "v19";
const SCRIPT_SRCS = [
  `/dice-libs/three.min.js?v=${DICE_LIBS_VERSION}`,
  `/dice-libs/cannon.min.js?v=${DICE_LIBS_VERSION}`,
  `/dice-libs/teal.js?v=${DICE_LIBS_VERSION}`,
  `/dice-libs/dice.js?v=${DICE_LIBS_VERSION}`,
];

function loadScriptsSequentially(
  srcs: string[],
  onAllLoaded: () => void,
  onError: () => void,
) {
  function loadNext(index: number) {
    if (index >= srcs.length) {
      onAllLoaded();
      return;
    }
    const src = srcs[index];
    // Already in the DOM → already executed, move on.
    if (document.querySelector(`script[src="${src}"]`)) {
      loadNext(index + 1);
      return;
    }
    const script    = document.createElement("script");
    script.src      = src;
    script.async    = false;
    script.onload   = () => loadNext(index + 1);
    script.onerror  = () => {
      console.error(`[DiceRoller] Failed to load: ${src}`);
      onError();
    };
    document.head.appendChild(script);
  }
  loadNext(0);
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface DiceRollerProps {
  width?: number;
  height?: number;
  transparent?: boolean;
  /** Fill the parent element 100% width/height — used by the OBS overlay. */
  fullBleed?: boolean;
  /**
   * Visual-only mode for the OBS dice overlay.
   * When true, the after_roll callback calls finishAnimation() instead of
   * resolveRoll(). If seededValues are present in the store, uses
   * start_throw_seeded so the overlay shows the exact same face values as
   * the player's roll. Never computes a result, never writes to the log,
   * never broadcasts ROLL_RESULT.
   */
  animationOnly?: boolean;
  /**
   * Multiplier applied to the horizontal throw boost for this dice_box instance.
   * 1.0 = default speed (already ×0.25 of the original library value).
   * Used to make the OBS overlay even slower (e.g. 0.4 = 1/10 of original).
   */
  boostFactor?: number;
  /**
   * Custom per-DieRole color overrides. When provided, replaces the system
   * defaults so dice display the user's chosen colors.
   */
  colorOverrides?: Record<DieRole, { dice_color: string; label_color: string }>;
  onReady?: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function DiceRoller({
  width,
  height = 320,
  transparent = false,
  fullBleed = false,
  animationOnly = false,
  boostFactor = 1.0,
  colorOverrides,
  onReady,
}: DiceRollerProps) {
  const containerRef      = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const boxRef            = useRef<any>(null);
  const readyRef          = useRef(false);
  const rollQueueRef      = useRef(false);
  const animationOnlyRef  = useRef(animationOnly);
  animationOnlyRef.current = animationOnly;
  const boostFactorRef    = useRef(boostFactor);
  boostFactorRef.current  = boostFactor;

  const [scriptsLoaded, setScriptsLoaded] = useState(false);
  const [scriptError,   setScriptError]   = useState(false);
  // Exit animation state: true → fade canvas out after dice fall through floor
  const [exiting,       setExiting]       = useState(false);
  const exitTimerRef    = useRef<ReturnType<typeof setTimeout> | null>(null);

  // For fullBleed mode: track the real viewport pixel size so dice_box.reinit()
  // sees non-zero clientWidth/clientHeight when it reads the container.
  const [viewport, setViewport] = useState<{ w: number; h: number } | null>(null);

  // Capture viewport size on client (window is not available during SSR).
  useEffect(() => {
    if (!fullBleed) return;
    setViewport({ w: window.innerWidth, h: window.innerHeight });
    const onResize = () => setViewport({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [fullBleed]);

  const pendingRequest = useDiceStore((s) => s.pendingRequest);

  // ── fireRoll — always accesses latest store state via getState() ────────────
  // Stored in a ref so initBox (and the pendingRequest effect) always call the
  // current version, avoiding stale-closure issues with useCallback deps.

  const fireRollRef = useRef(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const state = useDiceStore.getState() as any;
    const req: typeof state.pendingRequest = state.pendingRequest;
    if (!req) return;

    const box = boxRef.current;
    if (!box || !readyRef.current) {
      rollQueueRef.current = true;
      return;
    }

    // Reset exit animation for the new throw
    if (exitTimerRef.current) { clearTimeout(exitTimerRef.current); exitTimerRef.current = null; }
    setExiting(false);

    const notationStr = req.dice.map((d: { size: keyof typeof DIE_NOTATION }) => DIE_NOTATION[d.size]).join("+");
    const dieColors   = req.dice.map((d: { role: string }) => d.role);
    const seededValues: number[] | null = state.seededValues ?? null;

    box.setDice(notationStr);

    // Safety: if a previous throw left box.rolling stuck (e.g. emulate_throw
    // hit the iteration cap and after_roll never fired), reset it now.
    if (box.rolling) box.rolling = false;

    // Shared exit animation — called from both resolve paths below.
    // Only runs in animationOnly mode (OBS overlay). On the character sheet
    // the dice panel is dismissed by the parent, so no exit animation is needed.
    // Checks prefers-reduced-motion: if reduced, skip the fall and do a fast
    // 150ms fade instead of the full fall (600ms) + fade (300ms) sequence.
    function triggerExitAnimation() {
      if (!animationOnlyRef.current) return;
      const prefersReduced =
        typeof window !== "undefined" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (!prefersReduced && box.fall_through_floor) {
        box.fall_through_floor();
        // After dice have fallen through the floor (~600ms), fade canvas out
        exitTimerRef.current = setTimeout(() => setExiting(true), 600);
      } else {
        // Reduced motion: skip the fall, quick fade only
        exitTimerRef.current = setTimeout(() => setExiting(true), 0);
      }
    }

    try {
      if (animationOnlyRef.current && seededValues && seededValues.length > 0) {
        // Seeded replay: dice land on the exact same faces as the player's roll.
        box.start_throw_seeded(
          seededValues,
          () => {
            triggerExitAnimation();
            useDiceStore.getState().finishAnimation();
          },
          dieColors,
        );
      } else if (animationOnlyRef.current) {
        // No seeded values yet (shouldn't happen in normal flow) — free throw.
        box.start_throw(
          null,
          () => {
            triggerExitAnimation();
            useDiceStore.getState().finishAnimation();
          },
          dieColors,
        );
      } else {
        box.start_throw(
          null,
          (notation: { result: number[] }) => {
            triggerExitAnimation();
            useDiceStore.getState().resolveRoll(notation.result);
          },
          dieColors,
        );
      }
    } catch (err) {
      console.error("[DiceRoller] start_throw failed:", err);
      useDiceStore.getState().resetRolling();
    }
  });

  // ── Initialise dice box once all scripts are loaded ─────────────────────────

  useEffect(() => {
    if (!scriptsLoaded) return;
    if (readyRef.current) return;
    const container = containerRef.current;
    if (!container) return;
    if (typeof window === "undefined" || !window.DICE) return;
    // For fullBleed mode, wait until viewport state has resolved to real px values
    // so that dice_box.reinit() reads non-zero clientWidth/clientHeight.
    if (fullBleed && !viewport) return;

    try {
      const box = new window.DICE.dice_box(container, {
        transparentBackground: transparent,
        colorOverrides: colorOverrides ?? DEFAULT_COLOR_OVERRIDES,
        boostFactor: boostFactorRef.current,
      });
      boxRef.current   = box;
      readyRef.current = true;
      onReady?.();

      if (rollQueueRef.current) {
        rollQueueRef.current = false;
        fireRollRef.current();
      }
    } catch (err) {
      console.error("[DiceRoller] Failed to initialise DICE.dice_box:", err);
      useDiceStore.getState().resetRolling();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scriptsLoaded, transparent, height, width, fullBleed, viewport]);

  // ── Load scripts sequentially; poll as fallback for already-loaded scripts ───

  useEffect(() => {
    // Scripts already ran in a prior mount — go straight to init.
    if (typeof window !== "undefined" && window.DICE) {
      setScriptsLoaded(true);
      return;
    }

    loadScriptsSequentially(
      SCRIPT_SRCS,
      () => setScriptsLoaded(true),
      () => setScriptError(true),
    );

    // Fallback poll — covers races between script execution and React state.
    let elapsed = 0;
    const interval = setInterval(() => {
      elapsed += 100;
      if (typeof window !== "undefined" && window.DICE) {
        clearInterval(interval);
        setScriptsLoaded(true);
      } else if (elapsed >= 15_000) {
        clearInterval(interval);
        if (!window?.DICE) setScriptError(true);
      }
    }, 100);

    return () => clearInterval(interval);
  }, []);

  // ── Fire a throw when pendingRequest changes ─────────────────────────────────

  useEffect(() => {
    if (!pendingRequest) return;
    fireRollRef.current();
  }, [pendingRequest]);

  // ── Reinit box when viewport resizes (fullBleed mode only) ───────────────────

  useEffect(() => {
    if (!fullBleed || !viewport || !boxRef.current || !readyRef.current) return;
    const container = containerRef.current;
    if (!container) return;
    try { boxRef.current.reinit(container); } catch { /* ignore */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewport]);

  // ── Cleanup on unmount ───────────────────────────────────────────────────────

  useEffect(() => {
    return () => {
      if (exitTimerRef.current) clearTimeout(exitTimerRef.current);
      try { boxRef.current?.clear?.(); } catch { /* ignore */ }
      // Dispose the WebGL renderer to release GPU resources
      try { boxRef.current?.renderer?.dispose?.(); } catch { /* ignore */ }
      // Remove the renderer's canvas from the DOM if still attached
      try {
        const canvas = boxRef.current?.renderer?.domElement;
        if (canvas && canvas.parentNode) canvas.parentNode.removeChild(canvas);
      } catch { /* ignore */ }
      readyRef.current = false;
      boxRef.current   = null;
    };
  }, []);

  // ── Render ───────────────────────────────────────────────────────────────────

  const containerStyle: React.CSSProperties = fullBleed
    ? {
        width:      viewport ? `${viewport.w}px` : "100vw",
        height:     viewport ? `${viewport.h}px` : "100vh",
        background: "transparent",
        // Canvas-level opacity fade: 300ms ease-in after dice fall through floor.
        // The wrapper div (DiceOverlayClient) has its own 1s fade for the full panel.
        opacity:    exiting ? 0 : 1,
        transition: exiting ? "opacity 300ms ease-in" : "none",
      }
    : {
        width:      width ? `${width}px` : "100%",
        height:     `${height}px`,
        opacity:    exiting ? 0 : 1,
        transition: exiting ? "opacity 300ms ease-in" : "none",
      };

  return (
    <div
      ref={containerRef}
      style={containerStyle}
      className={[
        "relative",
        fullBleed ? "" : "overflow-hidden rounded-xl",
        (transparent || fullBleed) ? "bg-transparent" : "bg-[#101010]",
      ].join(" ")}
      aria-hidden="true"
      data-testid="dice-roller-canvas"
    >
      {!scriptsLoaded && !scriptError && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#577399] border-t-transparent" />
        </div>
      )}
      {scriptError && (
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="text-xs text-[#fe5f55] text-center px-4">
            Failed to load dice engine.
          </p>
        </div>
      )}
    </div>
  );
}
