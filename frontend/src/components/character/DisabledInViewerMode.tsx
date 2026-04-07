"use client";

/**
 * src/components/character/DisabledInViewerMode.tsx
 *
 * Wrapper component that makes owner-only actions visible but disabled
 * in viewer mode, instead of hiding them entirely. This gives the GM
 * visual context about what actions exist on the sheet while clearly
 * communicating that they cannot interact with them.
 *
 * Usage:
 *   <DisabledInViewerMode tooltip="Only the owner can level up">
 *     <button onClick={handleLevelUp}>Level Up</button>
 *   </DisabledInViewerMode>
 *
 * In viewer mode the children render at 40% opacity with pointer-events
 * disabled and a "not-allowed" cursor. A title tooltip explains why.
 *
 * Set hideInstead={true} for elements with no informational value to a
 * viewer (e.g. save status, edit button) — these are hidden entirely.
 */

import React from "react";
import { useViewerMode } from "./ViewerModeContext";

interface DisabledInViewerModeProps {
  children: React.ReactNode;
  /** Optional custom tooltip text */
  tooltip?: string;
  /** If true, hide entirely instead of showing disabled (for pure chrome with no info value) */
  hideInstead?: boolean;
}

export function DisabledInViewerMode({
  children,
  tooltip = "View only \u2014 this action is available to the character owner",
  hideInstead = false,
}: DisabledInViewerModeProps) {
  const viewerMode = useViewerMode();

  if (!viewerMode) return <>{children}</>;
  if (hideInstead) return null;

  return (
    <div
      className="opacity-40 cursor-not-allowed select-none"
      title={tooltip}
      aria-disabled="true"
    >
      <div className="pointer-events-none">
        {children}
      </div>
    </div>
  );
}
