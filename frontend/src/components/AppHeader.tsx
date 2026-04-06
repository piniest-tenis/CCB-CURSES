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
 */

import React from "react";
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
];

// ─── Component ────────────────────────────────────────────────────────────────

export function AppHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, signOut } = useAuthStore();

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
          <nav aria-label="Main navigation" className="flex items-center gap-2">
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

        {user && (
          <div className="flex items-center gap-3">
            <span className="hidden sm:block text-sm text-parchment-500 truncate max-w-[160px]">
              {user.displayName || user.email}
            </span>
            <button
              type="button"
              onClick={() =>
                signOut().then(() => router.replace("/auth/login"))
              }
              className="rounded px-2.5 py-1 text-xs font-medium text-parchment-500 border border-slate-700/60 hover:text-[#f7f7ff] hover:border-slate-600 transition-colors"
            >
              Sign out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
