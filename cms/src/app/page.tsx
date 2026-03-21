"use client";

// src/app/page.tsx
// Dashboard — lists both content types with item counts and quick links.

import React, { useEffect, useState } from "react";
import Link from "next/link";
import AuthGate from "@/components/AuthGate";
import Nav from "@/components/Nav";
import { getAllItems, type CmsContent } from "@/lib/api";

interface TypeSummary {
  type: "interstitial" | "splash";
  label: string;
  href: string;
  description: string;
  items: CmsContent[];
  loading: boolean;
  error: string;
}

export default function DashboardPage() {
  const [summaries, setSummaries] = useState<TypeSummary[]>([
    {
      type: "interstitial",
      label: "Loading Interstitials",
      href: "/interstitial",
      description: "Slides shown during app loading — brief blurb + optional photo.",
      items: [],
      loading: true,
      error: "",
    },
    {
      type: "splash",
      label: "Campaign Frame Splash",
      href: "/splash",
      description: "Intro text block shown during character creation.",
      items: [],
      loading: true,
      error: "",
    },
  ]);

  useEffect(() => {
    summaries.forEach((s, i) => {
      getAllItems(s.type)
        .then((items) => {
          setSummaries((prev) =>
            prev.map((p, pi) =>
              pi === i ? { ...p, items, loading: false } : p
            )
          );
        })
        .catch((err: unknown) => {
          const msg = err instanceof Error ? err.message : "Load failed";
          setSummaries((prev) =>
            prev.map((p, pi) =>
              pi === i ? { ...p, loading: false, error: msg } : p
            )
          );
        });
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <AuthGate>
      <div className="min-h-screen bg-brand-bg">
        <Nav />
        <main className="max-w-4xl mx-auto px-6 py-8">
          <h1 className="text-brand-light text-2xl font-bold mb-1">Dashboard</h1>
          <p className="text-brand-muted text-sm mb-6">
            Manage CMS content for the Curses! platform.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {summaries.map((s) => (
              <Link
                key={s.type}
                href={s.href}
                className="block bg-[#111a16] border border-brand-muted/20 hover:border-brand-blue/50 rounded-lg p-6 transition-colors group"
              >
                <div className="flex items-start justify-between mb-3">
                  <h2 className="text-brand-light font-semibold text-lg group-hover:text-brand-blue transition-colors">
                    {s.label}
                  </h2>
                  {s.loading ? (
                    <span className="text-brand-muted/50 text-sm">...</span>
                  ) : s.error ? (
                    <span className="text-brand-red text-sm">Error</span>
                  ) : (
                    <span className="bg-brand-blue/20 text-brand-blue text-sm font-bold px-2 py-0.5 rounded">
                      {s.items.length} items
                    </span>
                  )}
                </div>
                <p className="text-brand-muted text-sm">{s.description}</p>
                {!s.loading && !s.error && (
                  <p className="text-brand-muted/50 text-xs mt-3">
                    {s.items.filter((i) => i.active).length} active &middot;{" "}
                    {s.items.filter((i) => !i.active).length} inactive
                  </p>
                )}
                {s.error && (
                  <p className="text-brand-red text-xs mt-2">{s.error}</p>
                )}
              </Link>
            ))}
          </div>
        </main>
      </div>
    </AuthGate>
  );
}
