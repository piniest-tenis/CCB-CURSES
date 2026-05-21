"use client";

/**
 * src/components/marketing/hooks.ts
 *
 * Shared hooks for marketing pages: scroll-reveal, sticky-nav detection,
 * and smooth scroll helper.
 */

import { useEffect, useState, useRef } from "react";

// ─── Scroll Reveal Hook ───────────────────────────────────────────────────────

export function useScrollReveal<T extends HTMLElement>(
  options: IntersectionObserverInit = {
    threshold: 0.12,
    rootMargin: "0px 0px -40px 0px",
  },
) {
  const ref = useRef<T>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Respect prefers-reduced-motion
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mq.matches) {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setIsVisible(true);
        observer.unobserve(el);
      }
    }, options);
    observer.observe(el);
    return () => observer.disconnect();
  }, [options.threshold, options.rootMargin]); // eslint-disable-line react-hooks/exhaustive-deps

  return { ref, isVisible };
}

// ─── Sticky Nav Hook ──────────────────────────────────────────────────────────

export function useScrolledPast(threshold = 80) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > threshold);
    handler();
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, [threshold]);
  return scrolled;
}

// ─── Smooth Scroll Helper ─────────────────────────────────────────────────────

export function scrollToId(id: string) {
  const el = document.getElementById(id);
  if (el) {
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    el.scrollIntoView({
      behavior: prefersReducedMotion ? "auto" : "smooth",
      block: "start",
    });
  }
}
