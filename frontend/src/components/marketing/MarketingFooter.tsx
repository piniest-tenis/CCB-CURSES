"use client";

/**
 * src/components/marketing/MarketingFooter.tsx
 *
 * Shared footer for all marketing pages.
 * On the landing page, Product links (Features/Pricing) use scrollToId() buttons.
 * On sub-pages, they use <Link> for route navigation.
 */

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { scrollToId } from "./hooks";

interface MarketingFooterProps {
  /** If true, Features/Pricing become scrollToId buttons instead of Links */
  isLandingPage?: boolean;
}

export function MarketingFooter({ isLandingPage = false }: MarketingFooterProps) {
  return (
    <footer className="border-t border-slate-800/60 bg-slate-950 py-12">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        {/* Top row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-10">
          {/* Brand column */}
          <div className="lg:col-span-1">
            <Link href="/" aria-label="Curses! | Home">
              <Image
                src="/images/curses-isolated-logo.png"
                alt="Curses!"
                width={110}
                height={32}
                className="object-contain mb-4"
              />
            </Link>
            <p className="text-sm text-parchment-600 leading-relaxed">
              Built for Daggerheart.
            </p>
            <p className="mt-3 text-xs text-parchment-600/60">
              &copy; {new Date().getFullYear()} Man in Jumpsuit
            </p>
          </div>

          {/* Product links */}
          <div>
            <h4 className="font-sans text-sm font-semibold uppercase tracking-wider text-parchment-300 mb-4">
              Product
            </h4>
            <nav aria-label="Product links" className="space-y-2.5">
              {isLandingPage ? (
                <>
                  <button
                    type="button"
                    onClick={() => scrollToId("features")}
                    className="block text-sm text-parchment-500 hover:text-gold-400 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-400 rounded"
                  >
                    Features
                  </button>
                  <button
                    type="button"
                    onClick={() => scrollToId("pricing")}
                    className="block text-sm text-parchment-500 hover:text-gold-400 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-400 rounded"
                  >
                    Pricing
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/#features"
                    className="block text-sm text-parchment-500 hover:text-gold-400 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-400 rounded"
                  >
                    Features
                  </Link>
                  <Link
                    href="/pricing"
                    className="block text-sm text-parchment-500 hover:text-gold-400 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-400 rounded"
                  >
                    Pricing
                  </Link>
                </>
              )}
              <Link
                href="/features/streaming"
                className="block text-sm text-parchment-500 hover:text-gold-400 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-400 rounded"
              >
                Streaming
              </Link>
              <Link
                href="/features/campaigns"
                className="block text-sm text-parchment-500 hover:text-gold-400 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-400 rounded"
              >
                Campaign Tools
              </Link>
              <Link
                href="/features/new-players"
                className="block text-sm text-parchment-500 hover:text-gold-400 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-400 rounded"
              >
                New Players
              </Link>
            </nav>
          </div>

          {/* Community links */}
          <div>
            <h4 className="font-sans text-sm font-semibold uppercase tracking-wider text-parchment-300 mb-4">
              Community
            </h4>
            <nav aria-label="Community links" className="space-y-2.5">
              <a
                href="https://discord.gg/KBqDAS4Tbv"
                target="_blank"
                rel="noopener noreferrer"
                className="block text-sm text-parchment-500 hover:text-gold-400 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-400 rounded"
              >
                Discord
                <span className="sr-only"> (opens in new tab)</span>
              </a>
              <a
                href="https://twitter.com"
                target="_blank"
                rel="noopener noreferrer"
                className="block text-sm text-parchment-500 hover:text-gold-400 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-400 rounded"
              >
                Twitter / X
                <span className="sr-only"> (opens in new tab)</span>
              </a>
            </nav>
          </div>

          {/* Legal links */}
          <div>
            <h4 className="font-sans text-sm font-semibold uppercase tracking-wider text-parchment-300 mb-4">
              Legal
            </h4>
            <nav aria-label="Legal links" className="space-y-2.5">
              <Link
                href="/terms"
                className="block text-sm text-parchment-500 hover:text-gold-400 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-400 rounded"
              >
                Terms of Service
              </Link>
              <Link
                href="/privacy"
                className="block text-sm text-parchment-500 hover:text-gold-400 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-400 rounded"
              >
                Privacy Policy
              </Link>
              <Link
                href="/conduct"
                className="block text-sm text-parchment-500 hover:text-gold-400 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-400 rounded"
              >
                Code of Conduct
              </Link>
            </nav>
          </div>
        </div>

        {/* Divider */}
        <div
          className="h-px bg-gradient-to-r from-transparent via-slate-700/40 to-transparent mb-8"
          aria-hidden="true"
        />

        {/* Bottom row */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <a
              href="https://discord.gg/KBqDAS4Tbv"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Join our Discord server (opens in new tab)"
              className="flex items-center justify-center w-11 h-11 rounded-lg border border-slate-700/40 text-parchment-600 hover:text-gold-400 hover:border-gold-400/30 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-400"
            >
              <i
                className="fa-brands fa-discord text-sm"
                aria-hidden="true"
              />
            </a>
            <a
              href="https://twitter.com"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Follow us on Twitter (opens in new tab)"
              className="flex items-center justify-center w-11 h-11 rounded-lg border border-slate-700/40 text-parchment-600 hover:text-gold-400 hover:border-gold-400/30 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-400"
            >
              <i
                className="fa-brands fa-x-twitter text-sm"
                aria-hidden="true"
              />
            </a>
          </div>
          <div className="flex items-center gap-4">
            <a
              href="https://maninjumpsuit.com"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Man in Jumpsuit website (opens in new tab)"
              className="opacity-50 hover:opacity-70 transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-400 rounded"
            >
              <Image
                src="/images/man-in-jumpsuit-logo-white-transparent.png"
                alt="Man in Jumpsuit"
                width={70}
                height={20}
                className="object-contain"
              />
            </a>
          </div>
          <small className="text-parchment-600 text-center">
            &copy; {new Date().getFullYear()} Man in Jumpsuit. All rights
            reserved.
          </small>
        </div>
      </div>
    </footer>
  );
}
