"use client";

// src/components/Nav.tsx
// Simple top nav with links to each section.

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/lib/auth";

export default function Nav() {
  const pathname = usePathname();

  function handleLogout() {
    logout();
    window.location.reload();
  }

  const links = [
    { href: "/", label: "Dashboard" },
    { href: "/interstitial", label: "Interstitials" },
    { href: "/splash", label: "Splash" },
    { href: "/help", label: "Help" },
  ];

  return (
    <nav className="bg-[#0d1610] border-b border-brand-muted/20 px-6 py-3 flex items-center justify-between">
      <div className="flex items-center gap-6">
        <span className="text-brand-light font-bold text-lg tracking-tight">
          Curses! <span className="text-brand-red">CMS</span>
        </span>
        <div className="flex gap-1">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                pathname === link.href
                  ? "bg-brand-blue text-brand-light"
                  : "text-brand-muted hover:text-brand-light hover:bg-brand-muted/10"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>
      <button
        onClick={handleLogout}
        className="text-brand-muted hover:text-brand-red text-sm transition-colors"
      >
        Sign Out
      </button>
    </nav>
  );
}
