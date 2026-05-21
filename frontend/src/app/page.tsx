"use client";

/**
 * src/app/page.tsx
 *
 * Marketing landing page for Curses! | Daggerheart character builder & campaign platform.
 *
 * Behaviour:
 *   - Authenticated users are redirected to /dashboard (preserves original behaviour).
 *   - Unauthenticated visitors see the full marketing landing page.
 *
 * Mobile-first, Tailwind CSS, scroll-reveal animations via Intersection Observer.
 * No heavy JS libraries; CSS-only animations where possible.
 */

import React, { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/store/authStore";
import { useScrollReveal, scrollToId } from "@/components/marketing/hooks";
import { RevealSection } from "@/components/marketing/RevealSection";
import { StaggerCard } from "@/components/marketing/StaggerCard";
import { FeatureCard } from "@/components/marketing/FeatureCard";
import { PricingCard } from "@/components/marketing/PricingCard";
import { ImagePlaceholder } from "@/components/marketing/ImagePlaceholder";
import { FantasyBgSection } from "@/components/marketing/FantasyBgSection";
import { MarketingNav } from "@/components/marketing/MarketingNav";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";

// ─── Parallax Hook ───────────────────────────────────────────────────────────
// Tracks how far the hero section has scrolled (0 = top of section in view,
// 1 = section fully scrolled past). Respects prefers-reduced-motion.

function useHeroParallax(sectionRef: React.RefObject<HTMLElement | null>) {
  const [progress, setProgress] = useState(0); // 0–1+
  const reducedMotion = useRef(false);

  useEffect(() => {
    reducedMotion.current = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (reducedMotion.current) return;

    const update = () => {
      const el = sectionRef.current;
      if (!el) return;
      const { top, height } = el.getBoundingClientRect();
      // progress: 0 when top of section is at top of viewport,
      //           1 when bottom of section has left the viewport.
      const raw = -top / height;
      setProgress(raw);
    };

    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return progress;
}

// ─── Parallax Hero Background ─────────────────────────────────────────────────

const PARALLAX_LAYERS = [
  {
    // Farthest; barely moves
    src: "/images/hero-parallax/layer-dragon-hero_0005_Background.webp",
    alt: "",
    speedY: 0.08,
    speedX: 0,
    scale: 1,
    zIndex: 0,
  },
  {
    // Far dragon; exaggerated downward lag to sell "taking off / flying away"
    src: "/images/hero-parallax/layer-dragon-hero_0004_Far-Distance-(dragon).webp",
    alt: "A dragon taking flight in the far distance",
    speedY: -0.08,
    speedX: 0.14,
    scale: 1,
    zIndex: 1,
  },
  {
    src: "/images/hero-parallax/layer-dragon-hero_0003_Middle-Distance-(ground).webp",
    alt: "",
    speedY: 0.14,
    speedX: 0,
    scale: 1.06,
    zIndex: 2,
  },
  {
    src: "/images/hero-parallax/layer-dragon-hero_0002_Far-Foreground-(dragon & rock).webp",
    alt: "",
    speedY: 0.22,
    speedX: 0,
    scale: 1.06,
    zIndex: 3,
  },
  {
    src: "/images/hero-parallax/layer-dragon-hero_0001_Near-Foreground.webp",
    alt: "",
    speedY: 0.032,
    speedX: 0,
    scale: 1.06,
    zIndex: 4,
  },
  {
    // Closest; most movement
    src: "/images/hero-parallax/layer-dragon-hero_0000_Foreground.webp",
    alt: "",
    speedY: 0.045,
    speedX: 0,
    scale: 1.08,
    zIndex: 5,
  },
] as const;

interface ParallaxHeroProps {
  progress: number;
}

function ParallaxHero({ progress }: ParallaxHeroProps) {
  return (
    <div
      className="absolute inset-0 overflow-hidden bg-white"
      role="img"
      aria-label="A dramatic fantasy scene: a dragon takes flight above a rugged landscape at dusk"
    >
      {PARALLAX_LAYERS.map((layer) => {
        // Translate in vh units - independent of element size, so horizontal
        // extent is never affected by the Y offset. The wrapper is sized to
        // exactly fill the container (100% × 100%) so object-cover on the img
        // always fills the viewport width first, then crops vertically.
        const ty = layer.speedY * progress * 100; // vh
        const tx = layer.speedX * progress * 100; // vw

        return (
          <div
            key={layer.src}
            aria-hidden={layer.alt === "" ? "true" : undefined}
            className="absolute inset-0 will-change-transform"
            style={{
              zIndex: layer.zIndex,
              // Use vw/vh units so translate never expands the element beyond
              // the viewport width - safe for both portrait and landscape images.
              transform: `translate3d(${tx}vw, ${ty}vh, 0)`,
              mixBlendMode: layer.src.includes("_0004_")
                ? "multiply"
                : undefined,
              opacity: layer.src.includes("_0004_") ? 0.4 : 1, // the "far dragon" layer gets a subtle opacity treatment to help it blend with the background and sell depth
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={layer.src}
              alt={layer.alt}
              draggable={false}
              className="absolute inset-0 w-full h-full object-cover object-center select-none pointer-events-none"
              loading="eager"
              decoding="async"
            />
          </div>
        );
      })}
    </div>
  );
}

// ─── Hooks & shared components imported from @/components/marketing/ ──────────

// ─── Interactive Video Hook ───────────────────────────────────────────────────
// Click-to-play video with looping. Pauses when scrolled out of view.
// Playback is fully manual — clicking the play button is the only way to start.
// Shows a play-button overlay when paused. Respects prefers-reduced-motion.

function useInteractiveVideo(
  observerOptions: IntersectionObserverInit = { threshold: 0.25 },
) {
  const ref = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  // Mirror actual video play/pause/ended events into state so the overlay
  // always reflects reality (handles scroll-pause, tab visibility, etc.)
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const onPlay  = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onEnded = () => setIsPlaying(false);

    el.addEventListener("play",   onPlay);
    el.addEventListener("pause",  onPause);
    el.addEventListener("ended",  onEnded);
    return () => {
      el.removeEventListener("play",   onPlay);
      el.removeEventListener("pause",  onPause);
      el.removeEventListener("ended",  onEnded);
    };
  }, []);

  // Pause when scrolled out of view — never auto-resume; playback is manual only
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mq.matches) return;

    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) {
        el.pause();
      }
    }, observerOptions);

    observer.observe(el);
    return () => observer.disconnect();
  }, [observerOptions.threshold, observerOptions.rootMargin]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = useCallback(() => {
    const el = ref.current;
    if (!el) return;

    if (el.paused) {
      // Optimistically hide the overlay immediately so it never "sticks"
      // if the play Promise resolves slightly after the click event.
      setIsPlaying(true);
      el.play().catch(() => {
        // play() was rejected (autoplay policy, load error, etc.) — roll back
        setIsPlaying(false);
      });
    } else {
      el.pause();
      // onPause event will fire and set isPlaying(false) — no need to set here
    }
  }, []);

  return { ref, isPlaying, toggle };
}

// ─── scrollToId imported from @/components/marketing/hooks ────────────────────

// ─── RevealSection imported from @/components/marketing/RevealSection ─────────

// ─── StaggerCard imported from @/components/marketing/StaggerCard ─────────────

// ─── Marquee Ribbon ───────────────────────────────────────────────────────────

function MarqueeRibbon() {
  const items = [
    "Character Builder",
    "Twitch Overlays",
    "Campaign Manager",
    "Encounter Designer",
    "Session Logs",
    "Stream-Ready Sheets",
    "Guided Creation",
    "OBS Integration",
    "Command HUD",
    "Scheduling",
    "Dice Roller",
    "Domain Vault",
  ];
  // Double for seamless loop
  const doubled = [...items, ...items];

  return (
    <div
      className="overflow-hidden bg-gradient-to-r from-burgundy-900/60 via-burgundy-950/80 to-burgundy-900/60 border-y border-burgundy-800/30 py-3"
      aria-hidden="true"
    >
      <div className="marquee-track flex whitespace-nowrap gap-8 text-sm font-sans font-semibold tracking-wider uppercase text-gold-400/70">
        {doubled.map((item, i) => (
          <span key={i} className="flex items-center gap-8 shrink-0">
            <span>{item}</span>
            <span className="text-gold-400/30" aria-hidden="true">
              ◆
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── FeatureCard imported from @/components/marketing/FeatureCard ─────────────

// ─── Step Card (for New Player flow) ──────────────────────────────────────────

function StepCard({
  step,
  title,
  description,
  index,
}: {
  step: number;
  title: string;
  description: string;
  index: number;
}) {
  return (
    <StaggerCard index={index} className="relative">
      <div className="group rounded-xl border border-slate-700/40 bg-slate-900/60 p-6 hover:-translate-y-1 hover:border-gold-400/30 transition-all duration-300">
        <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-gold-400 to-gold-600 text-slate-950 font-display text-xl font-bold">
          {step}
        </div>
        <h3 className="font-serif text-lg font-semibold text-parchment-50 mb-2">
          {title}
        </h3>
        <p className="text-sm text-parchment-500 leading-relaxed">
          {description}
        </p>
      </div>
    </StaggerCard>
  );
}

// ─── PricingCard imported from @/components/marketing/PricingCard ─────────────

// ─── Testimonial Card ─────────────────────────────────────────────────────────

function TestimonialCard({
  quote,
  author,
  role,
  index,
}: {
  quote: string;
  author: string;
  role: string;
  index: number;
}) {
  return (
    <StaggerCard index={index}>
      <div className="rounded-xl border border-slate-700/40 bg-slate-900/60 p-6 shadow-card">
        <div className="mb-4 text-gold-400/40 text-2xl" aria-hidden="true">
          <i className="fa-solid fa-quote-left" />
        </div>
        <blockquote className="text-sm text-parchment-400 leading-relaxed mb-4 italic">
          &ldquo;{quote}&rdquo;
        </blockquote>
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-burgundy-800 to-slate-800 border border-slate-700/40 flex items-center justify-center text-parchment-500 text-sm font-bold">
            {author.charAt(0)}
          </div>
          <div>
            <div className="text-sm font-semibold text-parchment-300">
              {author}
            </div>
            <div className="text-xs text-parchment-600">{role}</div>
          </div>
        </div>
      </div>
    </StaggerCard>
  );
}

// ─── ImagePlaceholder imported from @/components/marketing/ImagePlaceholder ───

// ─── FantasyBgSection imported from @/components/marketing/FantasyBgSection ───

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export default function RootPage() {
  const router = useRouter();
  const { isAuthenticated, isReady } = useAuthStore();

  // ── Hero parallax ────────────────────────────────────────────────────────
  const heroSectionRef = useRef<HTMLElement>(null);
  const parallaxProgress = useHeroParallax(heroSectionRef);

  // ── Product video — click to play, pauses when scrolled away ─────────────
  const {
    ref: productVideoRef,
    isPlaying: productVideoPlaying,
    toggle: toggleProductVideo,
  } = useInteractiveVideo();

  // ── Auth redirect ───────────────────────────────────────────────────────
  useEffect(() => {
    if (isReady && isAuthenticated) {
      router.replace("/dashboard");
    }
  }, [isReady, isAuthenticated, router]);

  // ── Loading state while auth resolves ───────────────────────────────────
  if (!isReady) {
    return (
      <div
        role="status"
        className="flex min-h-screen items-center justify-center bg-slate-950"
      >
        <div
          aria-hidden="true"
          className="h-8 w-8 animate-spin rounded-full border-2 border-burgundy-500 border-t-transparent"
        />
        <span className="sr-only">Loading…</span>
      </div>
    );
  }

  // If authenticated, show spinner while redirect processes
  if (isAuthenticated) {
    return (
      <div
        role="status"
        className="flex min-h-screen items-center justify-center bg-slate-950"
      >
        <div
          aria-hidden="true"
          className="h-8 w-8 animate-spin rounded-full border-2 border-burgundy-500 border-t-transparent"
        />
        <span className="sr-only">Redirecting to dashboard…</span>
      </div>
    );
  }

  // ═════════════════════════════════════════════════════════════════════════
  // MARKETING LANDING PAGE
  // ═════════════════════════════════════════════════════════════════════════

  return (
    <div className="min-h-screen bg-slate-950 text-parchment-300">
      {/* ════════════════════════════════════════════════════════════════════
          1. STICKY NAVIGATION BAR
          ════════════════════════════════════════════════════════════════════ */}
      <MarketingNav isLandingPage />

      {/* ════════════════════════════════════════════════════════════════════
          2. HERO SECTION
          ════════════════════════════════════════════════════════════════════ */}
      <main id="main-content">
        <section
          ref={heroSectionRef}
          className="relative min-h-screen flex items-center justify-center overflow-hidden"
          aria-label="Hero"
        >
          {/* Background: layered parallax illustration */}
          <div className="absolute inset-0">
            <ParallaxHero progress={parallaxProgress} />
            {/* Atmospheric gradient overlays */}
            <div className="absolute inset-0 bg-gradient-to-b from-slate-950/30 via-transparent to-slate-950" />
            <div className="absolute inset-0 bg-gradient-to-r from-slate-950/60 via-transparent to-slate-950/60" />
          </div>

          {/* Atmospheric glow effect - CSS-only */}
          <div
            className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-20 blur-[120px] pointer-events-none"
            style={{
              background:
                "radial-gradient(circle, rgba(251,191,36,0.3) 0%, rgba(170,32,71,0.15) 50%, transparent 70%)",
            }}
            aria-hidden="true"
          />

          {/* Content */}
          <div className="relative z-10 mx-auto max-w-4xl px-4 sm:px-6 text-center pt-24 pb-16 sm:pt-0 sm:pb-0">
            <RevealSection>
              <p className="mb-4 font-serif-sc text-sm sm:text-base font-semibold uppercase tracking-[0.2em] text-gold-400/80 [-webkit-text-stroke:2.5px_rgba(10,16,13,0.75)] [paint-order:stroke_fill]">
                <img
                  src="/images/curses-isolated-logo.png"
                  alt="Curses! logo"
                  className="inline-block w-auto h-10 mr-3 -mt-1"
                />
                Daggerheart Custom Character Builder
              </p>
            </RevealSection>

            <RevealSection delay={100}>
              <h1 className="font-display text-5xl sm:text-6xl md:text-7xl lg:text-8xl leading-[0.95] text-parchment-50 mb-6 [-webkit-text-stroke:4.5px_rgba(10,16,13,0.75)] [paint-order:stroke_fill]">
                Your Adventure{" "}
                <span className="bg-gradient-to-r from-gold-300 via-gold-400 to-gold-500 bg-clip-text text-transparent [-webkit-text-stroke:2px_rgba(10,16,13,0.75)]">
                  Starts Here
                </span>
              </h1>
            </RevealSection>

            <RevealSection delay={200}>
              <p className="mx-auto max-w-xl text-lg sm:text-xl text-parchment-400 leading-relaxed mb-10 font-body [-webkit-text-stroke:2.5px_rgba(10,16,13,0.75)] [paint-order:stroke_fill]">
                The character builder, campaign manager, and streaming toolkit
                built from the ground up for Daggerheart.
              </p>
            </RevealSection>

            <RevealSection delay={300}>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                  href="/auth/register"
                  className="group relative inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-gold-400 to-gold-500 px-8 py-4 text-base font-bold text-slate-950 shadow-glow-gold hover:from-gold-300 hover:to-gold-400 transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 overflow-hidden w-full sm:w-auto"
                >
                  {/* Shimmer effect */}
                  <span
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-out"
                    aria-hidden="true"
                  />
                  <span className="relative">Create Your Character</span>
                </Link>
                <button
                  type="button"
                  onClick={() => scrollToId("features")}
                  className="inline-flex items-center justify-center rounded-xl border border-parchment-400/30 px-8 py-4 text-base font-semibold text-parchment-300 hover:border-gold-400/50 hover:text-gold-400 transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-400 w-full sm:w-auto [-webkit-text-stroke:2.5px_rgba(10,16,13,0.75)] [paint-order:stroke_fill]"
                >
                  See What&apos;s Inside
                </button>
              </div>
            </RevealSection>
          </div>

          {/* Scroll indicator */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 animate-scroll-hint opacity-50">
            <span className="text-xs font-sans uppercase tracking-widest text-parchment-500">
              Discover more
            </span>
            <i
              className="fa-solid fa-chevron-down text-parchment-500"
              aria-hidden="true"
            />
          </div>
        </section>

        {/* ════════════════════════════════════════════════════════════════════
          MARQUEE RIBBON
          ════════════════════════════════════════════════════════════════════ */}
        <MarqueeRibbon />

        {/* ════════════════════════════════════════════════════════════════════
          3. WHAT IS CURSES?
          ════════════════════════════════════════════════════════════════════ */}
        <section
          className="py-20 sm:py-28 bg-slate-950"
          aria-labelledby="about-heading"
        >
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <RevealSection>
              <div className="text-center max-w-3xl mx-auto mb-12">
                <h2
                  id="about-heading"
                  className="font-serif text-3xl sm:text-4xl font-bold text-parchment-50 mb-6"
                >
                  Everything You Need at the Table
                </h2>
                <p className="text-base sm:text-lg text-parchment-400 leading-relaxed font-body">
                  Curses! is a complete digital toolset for Daggerheart,
                  including character creation, campaign management, encounter
                  design, dice rolling, and live streaming overlays, all in one
                  place. Whether you&apos;re a first-time player building your
                  very first character or a GM running a weekly campaign for a
                  live audience, Curses! keeps everything organized so you can
                  focus on the story. No more juggling five different apps. No
                  more lost character sheets. Just your table, your dice, and
                  your next great adventure.
                </p>
              </div>
            </RevealSection>

            {/* Stats strip */}
            <RevealSection delay={150}>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-0 mb-16">
                <div className="text-center sm:px-8">
                  <div className="font-display text-3xl text-gold-400">
                    Free
                  </div>
                  <div className="text-sm text-parchment-500 font-sans uppercase tracking-wider mt-1">
                    For All Players
                  </div>
                </div>
                <div
                  className="hidden sm:block w-px h-12 bg-gradient-to-b from-transparent via-gold-400/30 to-transparent"
                  aria-hidden="true"
                />
                <div className="text-center sm:px-8">
                  <div className="font-display text-3xl text-gold-400">
                    Full SRD
                  </div>
                  <div className="text-sm text-parchment-500 font-sans uppercase tracking-wider mt-1">
                    Rules Reference
                  </div>
                </div>
                <div
                  className="hidden sm:block w-px h-12 bg-gradient-to-b from-transparent via-gold-400/30 to-transparent"
                  aria-hidden="true"
                />
                <div className="text-center sm:px-8">
                  <div className="font-display text-3xl text-gold-400">
                    Stream
                  </div>
                  <div className="text-sm text-parchment-500 font-sans uppercase tracking-wider mt-1">
                    Ready Out of the Box
                  </div>
                </div>
              </div>
            </RevealSection>

            {/* App product video */}
            <RevealSection delay={250}>
              <div className="mx-auto max-w-4xl">
                <div className="rounded-2xl border border-slate-700/30 bg-gradient-to-br from-slate-850 to-slate-900 shadow-sheet overflow-hidden">
                  <div className="px-4 py-3 border-b border-slate-700/30 flex items-center gap-2">
                    <div className="flex gap-1.5" aria-hidden="true">
                      <div className="w-2.5 h-2.5 rounded-full bg-burgundy-700/60" />
                      <div className="w-2.5 h-2.5 rounded-full bg-gold-600/40" />
                      <div className="w-2.5 h-2.5 rounded-full bg-steel-400/40" />
                    </div>
                    <div className="flex-1 text-center">
                      <span className="text-xs text-slate-600 font-sans">
                        ccb.curses.show/character/build
                      </span>
                    </div>
                  </div>
                  {/* Video + play-button overlay */}
                  <div
                    className="relative cursor-pointer group"
                    onClick={toggleProductVideo}
                    role="button"
                    tabIndex={0}
                    aria-label={
                      productVideoPlaying ? "Pause video" : "Play video"
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        toggleProductVideo();
                      }
                    }}
                  >
                    <video
                      ref={productVideoRef}
                      className="w-full block"
                      src="/videos/Curses-Product-Video-1.webm"
                      muted
                      loop
                      playsInline
                      preload="metadata"
                      aria-hidden="true"
                    />
                    {/* ── Premium play button overlay ── */}
                    <div
                      className={`absolute inset-0 flex items-center justify-center transition-opacity duration-300 ${
                        productVideoPlaying
                          ? "opacity-0 pointer-events-none"
                          : "opacity-100"
                      }`}
                      aria-hidden="true"
                    >
                      {/*
                        Dark vignette scrim — radial, heaviest at edges.
                        Pulls focus inward toward the button without
                        killing thumbnail legibility.
                      */}
                      <div
                        className="absolute inset-0 pointer-events-none"
                        style={{
                          background:
                            "radial-gradient(ellipse at center, transparent 30%, rgba(10,16,13,0.72) 100%)",
                        }}
                      />

                      {/*
                        Button shell — slight CCW tilt gives it character
                        (matches the brand's "jaunty" feel).
                        group-hover: snaps upright + scales — feels alive.
                        Layered box-shadows: deep drop shadow underneath,
                        gold halo on top → "lit from within" illusion.
                      */}
                      <div
                        className="relative flex items-center justify-center rounded-full rotate-[-5deg] group-hover:rotate-0 group-hover:scale-110 transition-all duration-300 ease-out"
                        style={{
                          width: "clamp(72px, 10vw, 112px)",
                          height: "clamp(72px, 10vw, 112px)",
                          // Gold fill — brand accent is the hero here
                          background:
                            "radial-gradient(circle at 38% 38%, #fcd34d 0%, #daa520 55%, #b45309 100%)",
                          // Outer ring: thin gold border catches the eye at distance
                          outline: "2px solid rgba(218,165,32,0.55)",
                          outlineOffset: "3px",
                          // Deep drop shadow + gold aura
                          boxShadow:
                            "0 8px 32px rgba(10,16,13,0.85), 0 2px 8px rgba(10,16,13,0.6), 0 0 22px rgba(218,165,32,0.5), 0 0 6px rgba(218,165,32,0.3)",
                        }}
                      >
                        {/*
                          Subtle inner specular highlight — small radial
                          white spot at top-left mimics a convex metal surface.
                          Layered on top of the gradient shell via absolute div.
                        */}
                        <div
                          className="absolute inset-0 rounded-full pointer-events-none"
                          style={{
                            background:
                              "radial-gradient(circle at 30% 28%, rgba(255,255,255,0.22) 0%, transparent 55%)",
                          }}
                        />

                        {/*
                          Pulsing gold ring — animates independently of the
                          button scale so the glow breathes even when idle.
                          Uses the existing coral-pulse keyframe timing
                          pattern but with a gold box-shadow value inline.
                        */}
                        <div
                          className="absolute inset-0 rounded-full pointer-events-none animate-gold-ring-pulse"
                        />

                        {/*
                          Play triangle — #0a100d on gold.
                          Dark-on-gold reads instantly as "play."
                          Slightly larger than the old version (40% of button)
                          and optically nudged right ~7% to compensate for
                          the triangle's visual center-of-mass bias.
                          Rounded stroke cap softens the fantasy-sharp feel.
                        */}
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          className="relative z-10"
                          style={{
                            width: "40%",
                            height: "40%",
                            marginLeft: "7%",
                            filter: "drop-shadow(0 1px 2px rgba(10,16,13,0.4))",
                          }}
                        >
                          {/*
                            Slightly rounded triangle via cubic path —
                            avoids the geometric harshness of a pure polygon.
                          */}
                          <path
                            d="M5.5 3.5 C5.5 3.5 5 3.8 5 4.5 L5 19.5 C5 20.2 5.5 20.5 5.5 20.5 C6 20.8 6.6 20.5 6.6 20.5 L20.2 13 C20.8 12.6 20.8 11.4 20.2 11 L6.6 3.5 C6.6 3.5 6 3.2 5.5 3.5 Z"
                            fill="#0a100d"
                          />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </RevealSection>
          </div>
        </section>

        {/* ════════════════════════════════════════════════════════════════════
          4. FEATURE SPOTLIGHT: STREAMING & CONTENT CREATION
          ════════════════════════════════════════════════════════════════════ */}
        <FantasyBgSection
          id="features"
          alt="Fantasy painting: A mystical observatory tower with streams of magical energy flowing outward like broadcast signals, crystals glowing with inner light"
          className="py-20 sm:py-28"
          overlayClassName="bg-gradient-to-b from-slate-950 via-slate-950/85 to-slate-950"
        >
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <RevealSection>
              <div className="text-center max-w-3xl mx-auto mb-14">
                <p className="text-sm font-sans font-semibold uppercase tracking-[0.2em] text-gold-400/80 mb-3">
                  Built for Content Creators
                </p>
                <h2 className="font-serif text-3xl sm:text-4xl font-bold text-parchment-50 mb-6">
                  Built for the Spotlight
                </h2>
                <p className="text-base sm:text-lg text-parchment-400 leading-relaxed font-body">
                  Running a Daggerheart actual play? Curses! was designed
                  alongside a live-streaming show, so streaming tools
                  aren&apos;t an afterthought. Plug into Twitch and OBS in
                  minutes and give your audience a front-row seat to every roll,
                  every hit point, and every dramatic moment.
                </p>
              </div>
            </RevealSection>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <FeatureCard
                icon="fa-tv"
                title="Live Character Cards"
                description="Your Twitch viewers see a real-time character card right on the stream with the character's name, class, domains, HP, Stress, and Hope, updating live as you play. One share link, zero setup headaches."
                index={0}
              />
              <FeatureCard
                icon="fa-video"
                title="OBS Dice Log Overlay"
                description="Drop a browser source into OBS and every dice roll your table makes appears on screen automatically. Customizable, transparent-background, stream-ready."
                index={1}
              />
              <FeatureCard
                icon="fa-scroll"
                title="Public Character Sheets"
                description="Generate a permanent public link to any character sheet. Viewers can explore your build, your loadout, and your backstory in their own time with no login required."
                index={2}
              />
            </div>

            <RevealSection delay={400}>
              <div className="mt-10 text-center">
                <Link
                  href="/features/streaming"
                  className="inline-flex items-center gap-2 text-sm font-semibold text-gold-400 hover:text-gold-300 transition-colors group focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-400 rounded"
                >
                  Learn more about streaming features
                  <i
                    className="fa-solid fa-arrow-right text-xs group-hover:translate-x-1 transition-transform"
                    aria-hidden="true"
                  />
                </Link>
              </div>
            </RevealSection>
          </div>
        </FantasyBgSection>

        {/* Ornamental divider */}
        <div
          className="relative h-px bg-gradient-to-r from-transparent via-gold-400/20 to-transparent"
          aria-hidden="true"
        />

        {/* ════════════════════════════════════════════════════════════════════
          5. FEATURE SPOTLIGHT: CAMPAIGN COMMAND CENTER
          ════════════════════════════════════════════════════════════════════ */}
        <section
          className="py-20 sm:py-28 bg-slate-950"
          aria-labelledby="campaigns-heading"
        >
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
              {/* Text content */}
              <div className="order-2 lg:order-1">
                <RevealSection>
                  <p className="text-sm font-sans font-semibold uppercase tracking-[0.2em] text-gold-400/80 mb-3">
                    Campaign Management
                  </p>
                  <h2
                    id="campaigns-heading"
                    className="font-serif text-3xl sm:text-4xl font-bold text-parchment-50 mb-6"
                  >
                    Your Campaign, Your Command Center
                  </h2>
                  <p className="text-base text-parchment-400 leading-relaxed mb-8 font-body">
                    Curses! gives Game Masters a unified hub for everything that
                    happens between sessions and at the table. Invite your
                    players, design encounters, log what happened, plan
                    what&apos;s next. When the session starts, take the helm
                    with a GM command HUD that puts all your tools one click
                    away.
                  </p>
                </RevealSection>

                <div className="space-y-4">
                  {[
                    {
                      icon: "fa-dragon",
                      title: "Encounter Designer",
                      desc: "Browse the full adversary catalog, build encounters by dragging in enemies and environments, and track HP, thresholds, and initiative in real time. Balanced encounters, no guesswork.",
                    },
                    {
                      icon: "fa-book-open",
                      title: "Session Logs",
                      desc: "Record what happened each session, whether it's lore reveals, player decisions, NPC introductions, or unresolved threads. Your campaign's memory is now searchable and always up to date.",
                    },
                    {
                      icon: "fa-calendar-days",
                      title: "Session Scheduling",
                      desc: "Set your next session date, send reminders, and keep your group on the same page without leaving the app.",
                    },
                    {
                      icon: "fa-display",
                      title: "GM Command HUD",
                      desc: "See every player's sheet at a glance, ping specific elements to draw attention during play, request rolls, and manage the action economy from a single dashboard. Run your table like a pro.",
                    },
                  ].map((item, i) => (
                    <StaggerCard key={item.title} index={i}>
                      <div className="flex items-start gap-4 p-4 rounded-lg border border-slate-800/40 bg-slate-900/30 hover:border-gold-400/20 transition-colors">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-burgundy-900/40 border border-burgundy-800/30">
                          <i
                            className={`fa-solid ${item.icon} text-gold-400`}
                            aria-hidden="true"
                          />
                        </div>
                        <div>
                          <h3 className="font-serif text-base font-semibold text-parchment-100 mb-1">
                            {item.title}
                          </h3>
                          <p className="text-sm text-parchment-500 leading-relaxed">
                            {item.desc}
                          </p>
                        </div>
                      </div>
                    </StaggerCard>
                  ))}
                </div>

                <RevealSection delay={500}>
                  <div className="mt-8">
                    <Link
                      href="/features/campaigns"
                      className="inline-flex items-center gap-2 text-sm font-semibold text-gold-400 hover:text-gold-300 transition-colors group focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-400 rounded"
                    >
                      Explore campaign tools
                      <i
                        className="fa-solid fa-arrow-right text-xs group-hover:translate-x-1 transition-transform"
                        aria-hidden="true"
                      />
                    </Link>
                  </div>
                </RevealSection>
              </div>

              {/* Visual placeholder */}
              <div className="order-1 lg:order-2">
                <RevealSection delay={200}>
                  <ImagePlaceholder
                    alt="Screenshot of the Curses! campaign command center showing the encounter designer, session scheduler, and real-time command HUD interface"
                    aspectRatio="4/3"
                    className="shadow-sheet"
                    desktopSrc="/images/marketing-screenshots/home--campaign-command-center-desktop.png"
                    mobileSrc="/images/marketing-screenshots/home--campaign-command-center-mobile.png"
                  />
                </RevealSection>
              </div>
            </div>
          </div>
        </section>

        {/* ════════════════════════════════════════════════════════════════════
          6. FEATURE SPOTLIGHT: NEW PLAYER EXPERIENCE
          ════════════════════════════════════════════════════════════════════ */}
        <FantasyBgSection
          alt="Fantasy painting: A warm, inviting study filled with floating spell books and gentle candlelight, an elder mentor guiding a young apprentice through ancient texts"
          className="py-20 sm:py-28"
          overlayClassName="bg-gradient-to-b from-slate-950 via-slate-950/85 to-slate-950"
        >
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <RevealSection>
              <div className="text-center max-w-3xl mx-auto mb-14">
                <p className="text-sm font-sans font-semibold uppercase tracking-[0.2em] text-gold-400/80 mb-3">
                  Perfect for Beginners
                </p>
                <h2 className="font-serif text-3xl sm:text-4xl font-bold text-parchment-50 mb-6">
                  New to Daggerheart? Start Here.
                </h2>
                <p className="text-base sm:text-lg text-parchment-400 leading-relaxed font-body">
                  Daggerheart is one of the most exciting TTRPGs to come along
                  in years and Curses! makes it effortless to jump in. Our
                  guided tools walk new players through character creation step
                  by step, and give GMs everything they need to teach the game
                  while they run it.
                </p>
              </div>
            </RevealSection>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-4xl mx-auto">
              <StepCard
                step={1}
                title="Pick, Click, Play"
                description="Choose your ancestry, community, class, and domains from curated SRD options. Curses! handles the math, validates your choices, and explains what everything means along the way. Your first character is ready in minutes."
                index={0}
              />
              <StepCard
                step={2}
                title="Rules at Your Fingertips"
                description="Every feature, trait, and domain card includes inline descriptions pulled straight from the SRD. Hover for a quick summary or tap through for the full rules text. No flipping through PDFs mid-session."
                index={1}
              />
              <StepCard
                step={3}
                title="Guide Your Table"
                description='GMs can ping any element on a player&apos;s sheet to highlight it during play, making it perfect for teaching new mechanics in context. "See that Hope Feature? Use it now." Learning by doing, guided by your GM.'
                index={2}
              />
            </div>

            <RevealSection delay={400}>
              <div className="mt-10 text-center">
                <Link
                  href="/features/new-players"
                  className="inline-flex items-center gap-2 text-sm font-semibold text-gold-400 hover:text-gold-300 transition-colors group focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-400 rounded"
                >
                  Learn about the new player experience
                  <i
                    className="fa-solid fa-arrow-right text-xs group-hover:translate-x-1 transition-transform"
                    aria-hidden="true"
                  />
                </Link>
              </div>
            </RevealSection>
          </div>
        </FantasyBgSection>

        {/* Ornamental divider */}
        <div
          className="relative h-px bg-gradient-to-r from-transparent via-gold-400/20 to-transparent"
          aria-hidden="true"
        />

        {/* ════════════════════════════════════════════════════════════════════
          7. PRICING SECTION
          ════════════════════════════════════════════════════════════════════ */}
        <section
          id="pricing"
          className="py-20 sm:py-28 bg-slate-950"
          aria-labelledby="pricing-heading"
        >
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
            <RevealSection>
              <div className="text-center max-w-3xl mx-auto mb-14">
                <p className="text-sm font-sans font-semibold uppercase tracking-[0.2em] text-gold-400/80 mb-3">
                  Simple Pricing
                </p>
                <h2
                  id="pricing-heading"
                  className="font-serif text-3xl sm:text-4xl font-bold text-parchment-50 mb-6"
                >
                  Simple, Honest Pricing
                </h2>
                <p className="text-base sm:text-lg text-parchment-400 leading-relaxed font-body">
                  Players never pay. GMs get everything for less than a cup of
                  coffee.
                </p>
              </div>
            </RevealSection>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl mx-auto">
              <PricingCard
                title="Player"
                price="Free"
                features={[
                  "Full character creation and editing",
                  "All SRD classes, domains, ancestries, and communities",
                  "Domain card loadout management",
                  "Dice roller with custom colors",
                  "Companion management",
                  "Downtime project tracking",
                  "Complete SRD rules reference with full-text search",
                ]}
                cta="Get Started Free"
                ctaHref="/auth/register"
                index={0}
              />
              <PricingCard
                title="Game Master"
                price="$5"
                period="/month"
                highlighted
                features={[
                  "Everything in the Player tier, plus:",
                  "Create and manage campaigns with invite links",
                  "Encounter designer with full adversary catalog",
                  "Session logging and scheduling",
                  "GM Command HUD with player sheet overview",
                  "Ping system: highlight elements on player sheets remotely",
                  "Twitch extension and OBS overlays",
                  "Homebrew workshop (custom classes, domains, weapons, armor, loot, ancestries, communities)",
                  "Priority access to new features",
                ]}
                cta="Claim Your Seat"
                ctaHref="/auth/register"
                index={1}
              />
            </div>
          </div>
        </section>

        {/* ════════════════════════════════════════════════════════════════════
          8. SOCIAL PROOF / COMMUNITY
          ════════════════════════════════════════════════════════════════════ */}
        <section
          id="community"
          className="py-20 sm:py-28 bg-slate-950 border-t border-slate-800/30"
          aria-labelledby="community-heading"
        >
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <RevealSection>
              <div className="text-center max-w-3xl mx-auto mb-14">
                <p className="text-sm font-sans font-semibold uppercase tracking-[0.2em] text-gold-400/80 mb-3">
                  Community
                </p>
                <h2
                  id="community-heading"
                  className="font-serif text-3xl sm:text-4xl font-bold text-parchment-50 mb-6"
                >
                  Voices from the Table
                </h2>
                <p className="text-base sm:text-lg text-parchment-400 leading-relaxed font-body">
                  Curses! is built by the Daggerheart community, for the
                  Daggerheart community. Come share your characters, find a
                  party, and help us shape the future of the platform.
                </p>
              </div>
            </RevealSection>

            {/* Testimonials */}
            {/* <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
              <TestimonialCard
                quote="I run a weekly Daggerheart stream and Curses! replaced three other tools overnight. The Twitch overlay alone is worth it. My chat actually knows what's happening now."
                author="Alex R."
                role="GM & Streamer"
                index={0}
              />
              <TestimonialCard
                quote="I'd never played a TTRPG before Daggerheart. Curses! walked me through my first character in about ten minutes. I didn't have to ask my GM a single rules question during creation."
                author="Sam T."
                role="New Player"
                index={1}
              />
              <TestimonialCard
                quote="The encounter designer is the thing I didn't know I needed. I used to spend an hour prepping combats in a spreadsheet. Now I build them in five minutes and run them from the same screen."
                author="Jordan M."
                role="Forever GM"
                index={2}
              />
            </div> */}

            {/* Community Links */}
            <RevealSection>
              <div className="rounded-2xl border border-slate-700/40 bg-slate-900/40 p-8 sm:p-12 text-center">
                <h3 className="font-serif text-2xl font-bold text-parchment-50 mb-4">
                  Join the Table
                </h3>
                <p className="text-base text-parchment-400 mb-8 max-w-lg mx-auto font-body">
                  The Curses! community lives on Discord. Join to share builds,
                  swap homebrew, get help, and hang out with GMs and players who
                  love Daggerheart as much as you do.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                  <a
                    href="https://discord.gg/KBqDAS4Tbv"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group relative inline-flex items-center justify-center gap-2 rounded-xl bg-[#5865F2] px-8 py-3.5 text-base font-bold text-white hover:bg-[#4752C4] transition-all duration-200 shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5865F2] focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 w-full sm:w-auto"
                  >
                    <i
                      className="fa-brands fa-discord text-lg"
                      aria-hidden="true"
                    />
                    Join the Discord
                    <span className="sr-only"> (opens in new tab)</span>
                  </a>
                </div>

                {/* Featured Streams placeholder */}
                <div className="mt-12 pt-8 border-t border-slate-700/30">
                  <p className="text-sm font-sans font-semibold uppercase tracking-[0.15em] text-parchment-600 mb-6">
                    Featured Streams
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto">
                    {[
                      "Featured stream: A Daggerheart actual play with Curses! overlay",
                      "Featured stream: Character creation session live on Twitch",
                      "Featured stream: Campaign session with the command HUD visible",
                    ].map((alt, i) => (
                      <div
                        key={i}
                        className="rounded-lg border border-slate-700/30 bg-slate-900/60 overflow-hidden"
                        style={{ aspectRatio: "16/9" }}
                        role="img"
                        aria-label={alt}
                      >
                        <div className="h-full flex items-center justify-center">
                          <i
                            className="fa-solid fa-play text-slate-700 text-xl"
                            aria-hidden="true"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </RevealSection>
          </div>
        </section>

        {/* ════════════════════════════════════════════════════════════════════
          9. FINAL CTA SECTION
          ════════════════════════════════════════════════════════════════════ */}
        <FantasyBgSection
          alt="Fantasy painting: An epic vista of a vast enchanted realm at golden hour, towering spires and floating islands, party of adventurers silhouetted against the horizon"
          className="py-24 sm:py-32"
          overlayClassName="bg-gradient-to-b from-slate-950/80 via-slate-950/90 to-slate-950"
        >
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
            <RevealSection>
              <h2 className="font-display text-4xl sm:text-5xl md:text-6xl leading-[0.95] text-parchment-50 mb-6">
                Roll{" "}
                <span className="bg-gradient-to-r from-gold-300 via-gold-400 to-gold-500 bg-clip-text text-transparent">
                  Initiative
                </span>
              </h2>
            </RevealSection>

            <RevealSection delay={100}>
              <p className="mx-auto max-w-xl text-lg text-parchment-400 leading-relaxed mb-10 font-body">
                Your next campaign deserves better tools. Curses! is free for
                players and ready right now.
              </p>
            </RevealSection>

            <RevealSection delay={200}>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                  href="/auth/register"
                  className="group relative inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-gold-400 to-gold-500 px-10 py-4 text-lg font-bold text-slate-950 shadow-glow-gold hover:from-gold-300 hover:to-gold-400 transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 overflow-hidden w-full sm:w-auto"
                >
                  <span
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-out"
                    aria-hidden="true"
                  />
                  <span className="relative">Create Your Character</span>
                </Link>
                <button
                  type="button"
                  onClick={() => scrollToId("features")}
                  className="inline-flex items-center justify-center rounded-xl border border-parchment-400/30 px-10 py-4 text-lg font-semibold text-parchment-300 hover:border-gold-400/50 hover:text-gold-400 transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-400 w-full sm:w-auto"
                >
                  Explore the Features
                </button>
              </div>
            </RevealSection>
          </div>
        </FantasyBgSection>
      </main>

      {/* ════════════════════════════════════════════════════════════════════
          10. FOOTER
          ════════════════════════════════════════════════════════════════════ */}
      <MarketingFooter isLandingPage />
    </div>
  );
}
