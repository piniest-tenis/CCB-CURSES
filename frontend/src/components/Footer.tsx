import Image from "next/image";
import Link from "next/link";

/**
 * Shared site footer.
 *
 * Includes:
 *   - Discord community link
 *   - Legal page links (Terms, Privacy, Code of Conduct)
 *   - Man in Jumpsuit Productions logo
 *
 * WCAG AA compliant:
 *   - All text ≥ 4.5:1 contrast against #0a100d
 *   - text-parchment-500 = 8.76:1 on #0a100d (passes AAA)
 *   - Minimum 14px (text-sm) font size for legal links
 *   - Touch targets ≥ 44px via py-2 padding
 *   - Focus-visible rings on all interactive elements
 *   - Screen-reader hints for external links
 */
export function Footer() {
  const focusRing =
    "focus-visible:ring-2 focus-visible:ring-gold-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a100d] outline-none rounded-sm";

  return (
    <footer className="relative z-[1] mt-auto border-t border-slate-800/60 bg-[#0a100d] py-6">
      <div className="mx-auto max-w-[1200px] px-4 space-y-4">
        {/* Top row: Discord link + logo */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-0">
          <a
            href="https://discord.gg/KBqDAS4Tbv"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Get Support, Chat with Cast, and More on Discord (opens in new tab)"
            className={`min-h-[44px] flex items-center py-2 text-sm text-parchment-500 hover:text-parchment-400 transition-colors ${focusRing}`}
          >
            Get Support, Chat with Cast, and More on Discord
            <span className="sr-only"> (opens in new tab)</span>
          </a>
          <a
            href="https://maninjumpsuit.com"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Man in Jumpsuit Productions website (opens in new tab)"
            className={`min-h-[44px] flex items-center py-2 opacity-60 hover:opacity-80 transition-opacity ${focusRing}`}
          >
            <Image
              src="/images/man-in-jumpsuit-logo-white-transparent.png"
              alt="Man in Jumpsuit Productions"
              width={80}
              height={24}
              className="object-contain"
            />
            <span className="sr-only"> (opens in new tab)</span>
          </a>
        </div>
        {/* Bottom row: legal links + copyright */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-sm text-parchment-500 gap-2 sm:gap-0">
          <nav aria-label="Legal" className="flex flex-col sm:flex-row gap-1 sm:gap-6">
            <Link
              href="/terms"
              className={`min-h-[44px] flex items-center py-2 hover:text-parchment-400 transition-colors ${focusRing}`}
            >
              Terms of Service
            </Link>
            <Link
              href="/privacy"
              className={`min-h-[44px] flex items-center py-2 hover:text-parchment-400 transition-colors ${focusRing}`}
            >
              Privacy Policy
            </Link>
            <Link
              href="/conduct"
              className={`min-h-[44px] flex items-center py-2 hover:text-parchment-400 transition-colors ${focusRing}`}
            >
              Code of Conduct
            </Link>
          </nav>
          <small className="text-parchment-500 text-center sm:text-right">
            &copy; {new Date().getFullYear()} Man in Jumpsuit Productions
          </small>
        </div>
      </div>
    </footer>
  );
}
