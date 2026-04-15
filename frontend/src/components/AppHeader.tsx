"use client";

/**
 * src/components/AppHeader.tsx
 *
 * Shared sticky top bar used across Dashboard, Campaigns, and Homebrew pages.
 *
 * Features:
 *   - Logo (links to /dashboard)
 *   - Nav links: Campaigns, Homebrew
 *   - User name + sign-out button
 *   - Active-route highlighting based on current pathname
 *   - Mobile hamburger menu (<640px) with slide-down panel
 */

import React, { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from "@/store/authStore";

// ─── Nav Link Definition ──────────────────────────────────────────────────────

interface NavLink {
  href: string;
  label: string;
  /** Color classes for the link (border, bg, text, hover, focus ring). */
  baseColor: string;
  activeColor: string;
}

const NAV_LINKS: NavLink[] = [
  {
    href: "/campaigns",
    label: "Campaigns",
    baseColor:
      "border-[#577399]/40 bg-[#577399]/10 text-[#577399] hover:bg-[#577399]/20 hover:border-[#577399] focus:ring-[#577399]",
    activeColor:
      "border-[#577399] bg-[#577399]/25 text-[#f7f7ff] focus:ring-[#577399]",
  },
  {
    href: "/homebrew",
    label: "Homebrew",
    baseColor:
      "border-coral-400/40 bg-coral-400/10 text-coral-400 hover:bg-coral-400/20 hover:border-coral-400 focus:ring-coral-400",
    activeColor:
      "border-coral-400 bg-coral-400/25 text-[#f7f7ff] focus:ring-coral-400",
  },
  {
    href: "/rules",
    label: "Rules",
    baseColor:
      "border-[#577399]/40 bg-[#577399]/10 text-[#577399] hover:bg-[#577399]/20 hover:border-[#577399] focus:ring-[#577399]",
    activeColor:
      "border-[#577399] bg-[#577399]/25 text-[#f7f7ff] focus:ring-[#577399]",
  },
];

// ─── Component ────────────────────────────────────────────────────────────────

export function AppHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, signOut } = useAuthStore();

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);

  // Close menu on route change
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  // Close menu on Escape key
  useEffect(() => {
    if (!menuOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMenuOpen(false);
        toggleRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [menuOpen]);

  // Close menu on click outside
  useEffect(() => {
    if (!menuOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        toggleRef.current &&
        !toggleRef.current.contains(e.target as Node)
      ) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [menuOpen]);

  const handleSignOut = useCallback(() => {
    signOut().then(() => router.replace("/auth/login"));
  }, [signOut, router]);

  return (
    <header
      className="border-b border-slate-800/60 sticky top-0 z-10 backdrop-blur-sm"
      style={{ backgroundColor: "rgba(10,16,13,0.90)" }}
    >
      <div className="mx-auto flex max-w-[1200px] items-center justify-between px-4 py-3">
        <div className="flex items-center gap-6">
          <Link href="/dashboard" aria-label="Curses! — Dashboard">
            <Image
              src="/images/curses-isolated-logo.png"
              alt="Curses!"
              width={140}
              height={40}
              className="object-contain"
              priority
            />
          </Link>

          {/* Desktop nav links (≥640px) */}
          <nav aria-label="Main navigation" className="hidden sm:flex items-center gap-2">
            {NAV_LINKS.map((link) => {
              const isActive = pathname?.startsWith(link.href) ?? false;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`
                    rounded-lg border px-3 py-1.5 text-sm font-semibold
                    transition-colors
                    focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900
                    ${isActive ? link.activeColor : link.baseColor}
                  `}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Desktop user controls (≥640px) */}
        {user && (
          <div className="hidden sm:flex items-center gap-3">
            <span className="text-sm text-parchment-500 truncate max-w-[160px]">
              {user.displayName || user.email}
            </span>
            <button
              type="button"
              onClick={handleSignOut}
              className="rounded px-2.5 py-1 min-h-[44px] text-xs font-medium text-parchment-500 border border-slate-700/60 hover:text-[#f7f7ff] hover:border-slate-600 transition-colors"
            >
              Sign out
            </button>
          </div>
        )}

        {/* Mobile hamburger toggle (<640px) */}
        <button
          ref={toggleRef}
          type="button"
          onClick={() => setMenuOpen((prev) => !prev)}
          aria-expanded={menuOpen}
          aria-controls="mobile-nav-panel"
          aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
          className="
            sm:hidden relative flex items-center justify-center
            w-[44px] h-[44px] min-h-[44px] min-w-[44px]
            rounded-lg border border-slate-700/60
            hover:border-slate-600 transition-colors
            focus:outline-none focus:ring-2 focus:ring-coral-400 focus:ring-offset-2 focus:ring-offset-slate-900
          "
        >
          {/* Animated hamburger bars → X */}
          <span className="sr-only">{menuOpen ? "Close menu" : "Open menu"}</span>
          <span aria-hidden="true" className="flex flex-col items-center justify-center w-5 h-5 relative">
            <span
              className={`
                block h-0.5 w-5 rounded-full bg-parchment-500 transition-all duration-300 ease-in-out absolute
                ${menuOpen ? "rotate-45 top-[9px]" : "rotate-0 top-[3px]"}
              `}
            />
            <span
              className={`
                block h-0.5 w-5 rounded-full bg-parchment-500 transition-all duration-300 ease-in-out absolute top-[9px]
                ${menuOpen ? "opacity-0 scale-0" : "opacity-100 scale-100"}
              `}
            />
            <span
              className={`
                block h-0.5 w-5 rounded-full bg-parchment-500 transition-all duration-300 ease-in-out absolute
                ${menuOpen ? "-rotate-45 top-[9px]" : "rotate-0 top-[15px]"}
              `}
            />
          </span>
        </button>
      </div>

      {/* Mobile slide-down nav panel (<640px) */}
      <div
        ref={menuRef}
        id="mobile-nav-panel"
        className="sm:hidden overflow-hidden transition-[max-height] duration-300 ease-in-out"
        style={{ maxHeight: menuOpen ? "400px" : "0px" }}
      >
        <nav
          aria-label="Mobile navigation"
          className="border-t border-slate-800/60 px-4 py-3 space-y-1"
        >
          {/* Dashboard link */}
          <Link
            href="/dashboard"
            className={`
              flex items-center min-h-[44px] rounded-lg px-3 text-sm font-semibold transition-colors
              focus:outline-none focus:ring-2 focus:ring-coral-400 focus:ring-offset-2 focus:ring-offset-slate-900
              ${
                pathname === "/dashboard"
                  ? "bg-slate-700/30 text-[#f7f7ff]"
                  : "text-parchment-500 hover:bg-slate-800/50 hover:text-[#f7f7ff]"
              }
            `}
          >
            Dashboard
          </Link>

          {/* Nav links */}
          {NAV_LINKS.map((link) => {
            const isActive = pathname?.startsWith(link.href) ?? false;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`
                  flex items-center min-h-[44px] rounded-lg border px-3 text-sm font-semibold transition-colors
                  focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900
                  ${isActive ? link.activeColor : link.baseColor}
                `}
              >
                {link.label}
              </Link>
            );
          })}

          {/* User display name + sign out */}
          {user && (
            <div className="border-t border-slate-800/40 mt-2 pt-2 space-y-1">
              <span className="flex items-center min-h-[44px] px-3 text-sm text-parchment-500 truncate">
                {user.displayName || user.email}
              </span>
              <button
                type="button"
                onClick={handleSignOut}
                className="
                  flex items-center w-full min-h-[44px] rounded-lg px-3 text-sm font-medium
                  text-parchment-500 border border-slate-700/60
                  hover:text-[#f7f7ff] hover:border-slate-600 transition-colors
                  focus:outline-none focus:ring-2 focus:ring-coral-400 focus:ring-offset-2 focus:ring-offset-slate-900
                "
              >
                Sign out
              </button>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}
