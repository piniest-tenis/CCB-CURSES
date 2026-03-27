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

// ─── Globals injected by the vendored scripts ─────────────────────────────────
// dice.js assigns window.DICE = DICE at its bottom.

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    DICE: any;
  }
}

// ─── Color overrides ──────────────────────────────────────────────────────────

const COLOR_OVERRIDES: Record<DieRole, { dice_color: string; label_color: string }> = {
  hope:         { dice_color: "#DAA520", label_color: "#36454F" },
  fear:         { dice_color: "#36454F", label_color: "#DAA520" },
  advantage:    { dice_color: "#202020", label_color: "#aaaaaa" },
  disadvantage: { dice_color: "#202020", label_color: "#aaaaaa" },
  damage:       { dice_color: "#202020", label_color: "#aaaaaa" },
  generic:      { dice_color: "#202020", label_color: "#aaaaaa" },
};

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
const DICE_LIBS_VERSION = "v13";
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
  onReady?: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function DiceRoller({
  width,
  height = 320,
  transparent = false,
  fullBleed = false,
  onReady,
}: DiceRollerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const boxRef       = useRef<any>(null);
  const readyRef     = useRef(false);
  const rollQueueRef = useRef(false);

  const [scriptsLoaded, setScriptsLoaded] = useState(false);
  const [scriptError,   setScriptError]   = useState(false);

  const pendingRequest = useDiceStore((s) => s.pendingRequest);

  // ── fireRoll — always accesses latest store state via getState() ────────────
  // Stored in a ref so initBox (and the pendingRequest effect) always call the
  // current version, avoiding stale-closure issues with useCallback deps.

  const fireRollRef = useRef(() => {
    const { pendingRequest: req, resolveRoll, resetRolling } = useDiceStore.getState();
    if (!req) return;

    const box = boxRef.current;
    if (!box || !readyRef.current) {
      rollQueueRef.current = true;
      return;
    }

    const notationStr = req.dice.map((d) => DIE_NOTATION[d.size]).join("+");
    const dieColors   = req.dice.map((d) => d.role);

    box.setDice(notationStr);

    try {
      box.start_throw(
        null,
        (notation: { result: number[]; resultTotal: number }) => {
          useDiceStore.getState().resolveRoll(notation.result);
        },
        dieColors,
      );
    } catch (err) {
      console.error("[DiceRoller] start_throw failed:", err);
      resetRolling();
    }
  });

  // ── Initialise dice box once all scripts are loaded ─────────────────────────

  useEffect(() => {
    if (!scriptsLoaded) return;
    if (readyRef.current) return;
    if (!containerRef.current) return;
    if (typeof window === "undefined" || !window.DICE) return;

    try {
      const box = new window.DICE.dice_box(containerRef.current, {
        transparentBackground: transparent,
        colorOverrides: COLOR_OVERRIDES,
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
  }, [scriptsLoaded, transparent, height, width]);

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

  // ── Cleanup on unmount ───────────────────────────────────────────────────────

  useEffect(() => {
    return () => {
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
    ? { width: "100%", height: "100%", background: "transparent" }
    : { width: width ? `${width}px` : "100%", height: `${height}px` };

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
