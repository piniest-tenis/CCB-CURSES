/**
 * src/components/WarblerText.tsx
 *
 * WarblerText — JavaScript small-caps replacement for the warbler-deck font.
 *
 * Instead of relying on CSS `font-variant: small-caps` (which requires the
 * font to ship a true small-caps optical size), this component renders each
 * capital letter (A–Z) at 1.2em relative to the surrounding text size,
 * while lowercase letters remain at their natural size.
 *
 * Usage:
 *   <WarblerText>Daggerheart</WarblerText>
 *   // → <span>D</span>aggerheart  (D scaled to 1.2em)
 *
 * The component also accepts an optional `as` prop to control the wrapping
 * element (defaults to a React Fragment so it composes cleanly inside any
 * parent element).
 */

import React from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type WarblerTextProps = {
  children: string;
  /** Extra className forwarded to every capital-letter span (optional). */
  capClassName?: string;
};

// ---------------------------------------------------------------------------
// Helper — split a string into segments of capitals vs. non-capitals
// ---------------------------------------------------------------------------

type Segment = { text: string; isCap: boolean };

function splitIntoSegments(text: string): Segment[] {
  const segments: Segment[] = [];
  let current = "";
  let currentIsCap: boolean | null = null;

  for (const char of text) {
    const isCap = /[A-Z]/.test(char);
    if (currentIsCap === null) {
      current = char;
      currentIsCap = isCap;
    } else if (isCap === currentIsCap) {
      current += char;
    } else {
      segments.push({ text: current, isCap: currentIsCap });
      current = char;
      currentIsCap = isCap;
    }
  }

  if (current.length > 0 && currentIsCap !== null) {
    segments.push({ text: current, isCap: currentIsCap });
  }

  return segments;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function WarblerText({ children, capClassName }: WarblerTextProps) {
  const segments = splitIntoSegments(children);

  return (
    <>
      {segments.map((segment, index) =>
        segment.isCap ? (
          <span
            key={index}
            style={{ fontSize: "1.2em" }}
            className={capClassName}
          >
            {segment.text}
          </span>
        ) : (
          <React.Fragment key={index}>{segment.text}</React.Fragment>
        )
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Export default for convenience
// ---------------------------------------------------------------------------

export default WarblerText;
