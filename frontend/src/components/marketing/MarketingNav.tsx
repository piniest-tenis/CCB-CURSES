"use client";

/**
 * src/components/marketing/MarketingNav.tsx
 *
 * Shared navigation bar for all marketing pages.
 * On the landing page, nav links use scrollToId() for in-page anchors.
 * On sub-pages, nav links use <Link> for route navigation.
 * Active state: gold text with bottom border on the current page's nav item.
 */

import React, { useState, useRef, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { useScrolledPast, scrollToId } from "./hooks";

type ActivePage = "features" | "pricing" | "community" | null;

interface MarketingNavProps {
  /** Which nav item to highlight as active */
  activePage?: ActivePage;
  /** If true, nav links scroll to sections on the current page instead of navigating */
  isLandingPage?: boolean;
}

export function MarketingNav({
  activePage = null,
  isLandingPage = false,
}: MarketingNavProps) {
  const scrolled = useScrolledPast(80);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const hamburgerRef = useRef<HTMLButtonElement>(null);

  // ── Close mobile menu on outside click ──────────────────────────────────
  useEffect(() => {
    if (!mobileMenuOpen) return;
    const handler = (e: MouseEvent) => {
      if (
        mobileMenuRef.current &&
        !mobileMenuRef.current.contains(e.target as Node) &&
        hamburgerRef.current &&
        !hamburgerRef.current.contains(e.target as Node)
      ) {
        setMobileMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [mobileMenuOpen]);

  // ── Close mobile menu on Escape ─────────────────────────────────────────
  useEffect(() => {
    if (!mobileMenuOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMobileMenuOpen(false);
        hamburgerRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [mobileMenuOpen]);

  const handleNavClick = useCallback(
    (id: string) => {
      setMobileMenuOpen(false);
      if (isLandingPage) {
        setTimeout(() => scrollToId(id), 100);
      }
    },
    [isLandingPage],
  );

  const navItems: { label: string; id: string; href: string; page: ActivePage }[] = [
    { label: "Features", id: "features", href: "/#features", page: "features" },
    { label: "Pricing", id: "pricing", href: "/pricing", page: "pricing" },
    { label: "Community", id: "community", href: "/#community", page: "community" },
  ];

  const activeClass = "text-gold-400 border-b-2 border-gold-400 pb-1";
  const inactiveClass =
    "text-parchment-400 hover:text-gold-400 transition-colors";

  return (
    <>
      {/* Skip navigation link for keyboard users */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[60] focus:rounded-lg focus:bg-gold-400 focus:px-4 focus:py-2 focus:text-sm focus:font-bold focus:text-slate-950"
      >
        Skip to content
      </a>

      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? "bg-slate-950/95 backdrop-blur-md border-b border-slate-800/60 shadow-lg"
            : "bg-transparent border-b border-transparent"
        }`}
      >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          {/* Logo */}
          <Link href="/" aria-label="Curses! | Home" className="shrink-0">
            <Image
              src="/images/curses-isolated-logo.png"
              alt="Curses!"
              width={130}
              height={38}
              className="object-contain"
              priority
            />
          </Link>

          {/* Desktop Nav Links */}
          <nav
            aria-label="Main navigation"
            className="hidden md:flex items-center gap-8"
          >
            {navItems.map((item) =>
              isLandingPage ? (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => scrollToId(item.id)}
                  className={`text-sm font-semibold ${
                    activePage === item.page ? activeClass : inactiveClass
                  } focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-400 rounded`}
                >
                  {item.label}
                </button>
              ) : (
                <Link
                  key={item.id}
                  href={item.href}
                  className={`text-sm font-semibold ${
                    activePage === item.page ? activeClass : inactiveClass
                  } focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-400 rounded`}
                >
                  {item.label}
                </Link>
              ),
            )}
          </nav>

          {/* Desktop CTA Buttons */}
          <div className="hidden md:flex items-center gap-3">
            <Link
              href="/auth/login"
              className="rounded-lg border border-parchment-500/30 px-4 py-2 text-sm font-semibold text-parchment-400 hover:border-gold-400/50 hover:text-gold-400 transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-400"
            >
              Log In
            </Link>
            <Link
              href="/auth/register"
              className="rounded-lg bg-gradient-to-r from-gold-400 to-gold-500 px-5 py-2 text-sm font-bold text-slate-950 hover:from-gold-300 hover:to-gold-400 transition-all duration-200 shadow-glow-gold focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
            >
              Start Free
            </Link>
          </div>

          {/* Mobile Hamburger */}
          <button
            ref={hamburgerRef}
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-expanded={mobileMenuOpen}
            aria-controls="marketing-mobile-nav"
            aria-label={
              mobileMenuOpen
                ? "Close navigation menu"
                : "Open navigation menu"
            }
            className="md:hidden relative flex items-center justify-center w-11 h-11 rounded-lg border border-slate-700/60 hover:border-slate-600 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-400"
          >
            <span
              aria-hidden="true"
              className="flex flex-col items-center justify-center w-5 h-5 relative"
            >
              <span
                className={`block h-0.5 w-5 rounded-full bg-parchment-400 transition-all duration-300 absolute ${
                  mobileMenuOpen ? "rotate-45 top-[9px]" : "top-[3px]"
                }`}
              />
              <span
                className={`block h-0.5 w-5 rounded-full bg-parchment-400 transition-all duration-300 absolute top-[9px] ${
                  mobileMenuOpen ? "opacity-0 scale-0" : "opacity-100"
                }`}
              />
              <span
                className={`block h-0.5 w-5 rounded-full bg-parchment-400 transition-all duration-300 absolute ${
                  mobileMenuOpen ? "-rotate-45 top-[9px]" : "top-[15px]"
                }`}
              />
            </span>
          </button>
        </div>

        {/* Mobile Menu Panel */}
        <div
          ref={mobileMenuRef}
          id="marketing-mobile-nav"
          className="md:hidden overflow-hidden transition-[max-height] duration-300 ease-in-out"
          style={{ maxHeight: mobileMenuOpen ? "360px" : "0px" }}
        >
          <nav
            aria-label="Mobile navigation"
            className="border-t border-slate-800/60 py-4 space-y-1"
          >
            {navItems.map((item) =>
              isLandingPage ? (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleNavClick(item.id)}
                  className={`flex items-center w-full min-h-[44px] rounded-lg px-3 text-sm font-semibold ${
                    activePage === item.page
                      ? "text-gold-400"
                      : "text-parchment-400 hover:bg-slate-800/50 hover:text-gold-400"
                  } transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-400`}
                >
                  {item.label}
                </button>
              ) : (
                <Link
                  key={item.id}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center w-full min-h-[44px] rounded-lg px-3 text-sm font-semibold ${
                    activePage === item.page
                      ? "text-gold-400"
                      : "text-parchment-400 hover:bg-slate-800/50 hover:text-gold-400"
                  } transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-400`}
                >
                  {item.label}
                </Link>
              ),
            )}
            <div className="border-t border-slate-800/40 mt-3 pt-3 flex flex-col gap-2 px-3">
              <Link
                href="/auth/login"
                className="flex items-center justify-center min-h-[44px] rounded-lg border border-parchment-500/30 text-sm font-semibold text-parchment-400 hover:border-gold-400/50 hover:text-gold-400 transition-all"
              >
                Log In
              </Link>
              <Link
                href="/auth/register"
                className="flex items-center justify-center min-h-[44px] rounded-lg bg-gradient-to-r from-gold-400 to-gold-500 text-sm font-bold text-slate-950 hover:from-gold-300 hover:to-gold-400 transition-all"
              >
                Start Free
              </Link>
            </div>
          </nav>
        </div>
      </div>
      </header>
    </>
  );
}
