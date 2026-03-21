"use client";

/**
 * src/app/character/[id]/page.tsx
 *
 * Character sheet page — protected, loads the CharacterSheet component.
 */

import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { CharacterSheet } from "@/components/character/CharacterSheet";
import React, { useEffect } from "react";
import Link from "next/link";

export default function CharacterPage() {
  const pathname = usePathname();
  // Extract the real character ID from the browser URL.
  // useParams() returns "__placeholder__" in a static export because Next.js
  // only pre-renders one HTML file per dynamic segment; usePathname() always
  // reflects the actual browser URL path.
  const characterId = pathname?.split("/")[2] ?? "";
  const router = useRouter();
  const { isAuthenticated, isLoading, isReady } = useAuthStore();

  // Gate the redirect on isReady: isAuthenticated is false on initial hydration
  // (it isn't persisted) so we must wait for initialize() to complete first.
  useEffect(() => {
    if (isReady && !isAuthenticated) {
      router.replace("/auth/login");
    }
  }, [isReady, isAuthenticated, router]);

  if (!isReady || isLoading || !isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-burgundy-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Nav bar */}
      <header className="border-b border-burgundy-900/50 bg-slate-900/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="mx-auto flex max-w-4xl items-center gap-4 px-4 py-3">
          <Link
            href="/dashboard"
            className="text-sm text-parchment-500 hover:text-parchment-300 transition-colors"
          >
            ← Dashboard
          </Link>
          <span className="text-parchment-700">|</span>
          <span className="font-serif text-sm text-parchment-400">
            Character Sheet
          </span>
        </div>
      </header>

      <main className="px-4 py-6">
        <CharacterSheet characterId={characterId} />
      </main>
    </div>
  );
}
