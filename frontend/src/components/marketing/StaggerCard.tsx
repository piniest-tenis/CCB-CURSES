"use client";

/**
 * src/components/marketing/StaggerCard.tsx
 *
 * Stagger-revealed card wrapper. Each card in a grid fades in with a
 * delay based on its index, creating a cascade effect.
 */

import React from "react";
import { useScrollReveal } from "./hooks";

export function StaggerCard({
  children,
  index,
  className = "",
}: {
  children: React.ReactNode;
  index: number;
  className?: string;
}) {
  const { ref, isVisible } = useScrollReveal<HTMLDivElement>();
  return (
    <div
      ref={ref}
      className={`transition-all duration-600 ease-out ${
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
      } ${className}`}
      style={{ transitionDelay: `${index * 120}ms` }}
    >
      {children}
    </div>
  );
}
