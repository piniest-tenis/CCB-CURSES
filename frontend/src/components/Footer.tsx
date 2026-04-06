import Image from "next/image";
import Link from "next/link";

/**
 * Shared site footer.
 *
 * Includes:
 *   - Discord community link
 *   - Legal page links (Terms, Privacy, Code of Conduct)
 *   - Man in Jumpsuit Productions logo
 */
export function Footer() {
  return (
    <footer className="relative z-[1] mt-auto border-t border-slate-800/60 bg-[#0a100d] py-6">
      <div className="mx-auto max-w-[1200px] px-4 space-y-4">
        {/* Top row: Discord link + logo */}
        <div className="flex items-center justify-between">
          <a
            href="https://discord.gg/KBqDAS4Tbv"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-[#b9baa3]/40 hover:text-[#b9baa3]/70 transition-colors"
          >
            Get Support, Chat with Cast, and More on Discord
          </a>
          <a
            href="https://maninjumpsuit.com"
            target="_blank"
            rel="noopener noreferrer"
            className="opacity-30 hover:opacity-60 transition-opacity"
          >
            <Image
              src="/images/man-in-jumpsuit-logo-white-transparent.png"
              alt="Man in Jumpsuit Productions"
              width={80}
              height={24}
              className="object-contain"
            />
          </a>
        </div>
        {/* Bottom row: legal links + copyright */}
        <div className="flex items-center justify-between text-xs text-[#b9baa3]/25">
          <div className="flex gap-4">
            <Link href="/terms" className="hover:text-[#b9baa3]/50 transition-colors">
              Terms of Service
            </Link>
            <Link href="/privacy" className="hover:text-[#b9baa3]/50 transition-colors">
              Privacy Policy
            </Link>
            <Link href="/conduct" className="hover:text-[#b9baa3]/50 transition-colors">
              Code of Conduct
            </Link>
          </div>
          <span>&copy; {new Date().getFullYear()} Man in Jumpsuit Productions</span>
        </div>
      </div>
    </footer>
  );
}
