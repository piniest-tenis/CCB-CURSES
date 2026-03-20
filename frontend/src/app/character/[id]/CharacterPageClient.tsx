"use client";

/**
 * src/app/character/[id]/page.tsx
 *
 * Character sheet page — protected, loads the CharacterSheet component.
 */

import { useRouter, useParams } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { CharacterSheet } from "@/components/character/CharacterSheet";
import React, { useEffect } from "react";
import Link from "next/link";

export default function CharacterPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuthStore();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/auth/login");
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-burgundy-500 border-t-transparent" />
      </div>
    );
  }

  if (!isAuthenticated) return null;

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
        <CharacterSheet characterId={params?.id ?? ""} />
      </main>
    </div>
  );
}
