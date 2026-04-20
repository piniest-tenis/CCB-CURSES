"use client";

/**
 * src/components/srd/SRDScrollProgress.tsx
 *
 * Thin fixed progress bar at the top of the viewport showing scroll progress
 * through the current section. Section-colored. Only visible when a section
 * is drilled into (not on the grid or search view).
 */

import React, { useEffect, useState } from "react";

// ─── Section colours ──────────────────────────────────────────────────────────

const SECTION_BAR_COLOUR: Record<string, string> = {
  Introduction:           "bg-parchment-400",
  "Character Creation":   "bg-gold-400",
  Classes:                "bg-burgundy-400",
  Ancestries:             "bg-amber-400",
  Communities:            "bg-emerald-400",
  Domains:                "bg-violet-400",
  "Core Mechanics":       "bg-gold-400",
  "Running an Adventure": "bg-coral-400",
  Appendix:               "bg-parchment-500",
};

// ─── Props ────────────────────────────────────────────────────────────────────

interface SRDScrollProgressProps {
  section: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function SRDScrollProgress({ section }: SRDScrollProgressProps) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (docHeight <= 0) {
        setProgress(0);
        return;
      }
      setProgress(Math.min(100, Math.max(0, (scrollTop / docHeight) * 100)));
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll(); // initial
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const barColour = SECTION_BAR_COLOUR[section] ?? "bg-gold-400";

  return (
    <div
      className="fixed top-0 left-0 right-0 z-50 h-[2px]"
      role="progressbar"
      aria-valuenow={Math.round(progress)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label="Scroll progress"
    >
      <div
        className={`h-full ${barColour} transition-[width] duration-100 ease-out opacity-80`}
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}
