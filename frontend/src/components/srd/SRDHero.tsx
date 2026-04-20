"use client";

/**
 * src/components/srd/SRDHero.tsx
 *
 * Hero section for the Rules of Daggerheart page.
 *
 * Layout:
 *   - Full-bleed background image (JeffBrown_ARCEMSPLASH.webp) with cover fit
 *   - Gradient overlay (.srd-hero-gradient) fades the image into the page bg
 *   - Title using font-display (Heavitas)
 *   - Subtitle in parchment neutral
 *   - Search bar slotted below the copy via the `searchSlot` prop
 *
 * The component is intentionally stateless — it receives the search bar as
 * a React child so that the parent page owns the search state.
 */

import React from "react";

interface SRDHeroProps {
  /** Optional slot rendered below the hero copy (e.g. the SRDSearchBar). */
  searchSlot?: React.ReactNode;
}

export function SRDHero({ searchSlot }: SRDHeroProps) {
  return (
    <div className="relative w-full overflow-hidden" style={{ minHeight: "340px" }}>
      {/* Background image */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/images/JeffBrown_ARCEMSPLASH.webp')" }}
      />

      {/* Gradient overlay: fades the image into the dark page background */}
      <div aria-hidden="true" className="absolute inset-0 srd-hero-gradient" />

      {/* Content */}
      <div className="relative z-10 mx-auto max-w-[1200px] px-4 pb-10 pt-16 sm:pt-20">
        {/* Eyebrow badge */}
        <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-gold-400/40 bg-gold-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-gold-400">
          <i className="fa-solid fa-book-open text-[10px] text-gold-500" aria-hidden="true" />
          System Reference Document
        </p>

        {/* Primary heading */}
        <h1
          className="font-display text-5xl sm:text-6xl font-bold leading-tight tracking-tight text-[#f7f7ff]"
        >
          Rules of Daggerheart
        </h1>

        {/* Subtitle */}
        <p className="mt-3 max-w-xl text-base text-[#b9baa3]/80 leading-relaxed">
          The complete Daggerheart System Reference Document — browse by section,
          or search across all 119 entries instantly.
        </p>

        {/* Search slot */}
        {searchSlot && (
          <div className="mt-8 max-w-2xl">
            {searchSlot}
          </div>
        )}
      </div>
    </div>
  );
}
