"use client";

/**
 * src/components/marketing/FantasyBgSection.tsx
 *
 * Section wrapper with a fantasy-themed gradient background and overlay.
 * Used for hero sections, CTA blocks, and feature spotlights.
 */

import React from "react";

export function FantasyBgSection({
  children,
  alt,
  className = "",
  overlayClassName = "",
  atmosphereStyle,
  id,
}: {
  children: React.ReactNode;
  alt: string;
  className?: string;
  overlayClassName?: string;
  /** Optional CSS background value for an atmospheric glow layer that covers
   *  the entire section (including the area behind a fixed nav). Renders as an
   *  absolute-positioned div between the gradient overlay and the content. */
  atmosphereStyle?: React.CSSProperties;
  id?: string;
}) {
  return (
    <section
      id={id}
      className={`relative overflow-hidden ${className}`}
      aria-label={alt}
    >
      {/* Background placeholder - to be replaced with actual fantasy painting */}
      <div
        className="absolute inset-0 bg-gradient-to-br from-burgundy-950 via-slate-950 to-slate-900"
        role="img"
        aria-label={alt}
      />
      {/* Gradient overlay */}
      <div
        className={`absolute inset-0 ${overlayClassName || "bg-gradient-to-b from-slate-950/70 via-slate-950/80 to-slate-950/95"}`}
      />
      {/* Atmospheric glow (optional) — covers full section incl. nav area */}
      {atmosphereStyle && (
        <div
          className="absolute inset-0 pointer-events-none"
          aria-hidden="true"
          style={atmosphereStyle}
        />
      )}
      {/* Content */}
      <div className="relative z-10 w-full">{children}</div>
    </section>
  );
}
