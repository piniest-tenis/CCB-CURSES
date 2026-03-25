"use client";

/**
 * src/components/dashboard/LorePanel.tsx
 *
 * World Lore carousel for the right rail.
 * Rotates through interstitial CMS cards every 12 s.
 * Pauses on hover. Respects prefers-reduced-motion.
 * "Read more in Tidwell Wiki ↗" links to Obsidian publish.
 */

import React, { useEffect, useRef, useState } from "react";
import { useCmsContent } from "@/hooks/useCmsContent";

// ─── helpers ──────────────────────────────────────────────────────────────────

function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

const WIKI_BASE = "https://publish.obsidian.md/tidwell";

// ─── LorePanel ────────────────────────────────────────────────────────────────

export function LorePanel() {
  const { data: items } = useCmsContent("interstitial");
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [reducedMotion, setReducedMotion] = useState(false);

  // Detect prefers-reduced-motion once on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // Auto-rotate
  useEffect(() => {
    if (!items || items.length <= 1 || paused || reducedMotion) return;

    intervalRef.current = setInterval(() => {
      setActiveIndex((i) => (i + 1) % items.length);
    }, 12_000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [items, paused, reducedMotion]);

  if (!items || items.length === 0) {
    return (
      <div className="rounded-xl border border-[#577399]/30 bg-slate-900/80 p-5 animate-pulse">
        <div className="h-3 w-24 rounded bg-slate-700/60 mb-4" />
        <div className="h-4 w-40 rounded bg-slate-700/50 mb-3" />
        <div className="h-3 w-full rounded bg-slate-700/40 mb-2" />
        <div className="h-3 w-3/4 rounded bg-slate-700/40" />
      </div>
    );
  }

  const card = items[activeIndex];

  return (
    <div
      className="rounded-xl border border-[#577399]/30 bg-slate-900/80 p-5 shadow-card-fantasy"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <p className="text-xs font-semibold uppercase tracking-widest text-[#b9baa3]/50 mb-4">
        World Lore
      </p>

      {/* Card body with animation key */}
      <div
        key={activeIndex}
        aria-live="polite"
        aria-atomic="true"
        className={reducedMotion ? undefined : "animate-lore-in"}
      >
        <h4 className="font-serif text-sm font-semibold text-[#f7f7ff] mb-2">
          {card?.title}
        </h4>
        <p className="text-xs text-[#b9baa3]/70 leading-relaxed line-clamp-6">
          {card?.body}
        </p>
        {card && (
          <a
            href={`${WIKI_BASE}/${slugify(card.title)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="
              mt-3 inline-block text-xs text-[#577399]/70
              hover:text-[#577399] transition-colors
            "
          >
            Read more in Tidwell Wiki ↗
          </a>
        )}
      </div>

      {/* Dot indicators */}
      {items.length > 1 && (
        <div
          className="mt-4 flex items-center gap-1.5"
          role="tablist"
          aria-label="Lore card navigation"
        >
          {items.map((item, i) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={i === activeIndex}
              aria-label={`Lore card ${i + 1}: ${item.title}`}
              onClick={() => setActiveIndex(i)}
              className={[
                "rounded-full bg-[#577399] transition-all duration-300",
                i === activeIndex
                  ? "w-4 h-1.5 opacity-80"
                  : "w-1.5 h-1.5 opacity-30 hover:opacity-50",
              ].join(" ")}
            />
          ))}
        </div>
      )}
    </div>
  );
}
