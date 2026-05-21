"use client";

/**
 * src/components/marketing/RevealSection.tsx
 *
 * Fade-in + slide-up reveal wrapper triggered by Intersection Observer.
 * Used across all marketing pages for scroll-driven content reveals.
 */

import React from "react";
import { useScrollReveal } from "./hooks";

export function RevealSection({
  children,
  className = "",
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const { ref, isVisible } = useScrollReveal<HTMLDivElement>();
  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ease-out ${
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
      } ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}
