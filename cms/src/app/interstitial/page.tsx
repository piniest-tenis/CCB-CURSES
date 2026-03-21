"use client";

// src/app/interstitial/page.tsx
// Admin page for managing loading interstitial slides.

import React, { useCallback, useEffect, useState } from "react";
import AuthGate from "@/components/AuthGate";
import Nav from "@/components/Nav";
import CmsItemCard from "@/components/CmsItemCard";
import CmsItemForm from "@/components/CmsItemForm";
import { getAllItems, createItem, type CmsContent } from "@/lib/api";

export default function InterstitialPage() {
  const [items, setItems] = useState<CmsContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCreate, setShowCreate] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getAllItems("interstitial");
      setItems(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load items");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleCreate(data: {
    title: string;
    body: string;
    imageKey: string | null;
    active: boolean;
    order: number;
  }) {
    await createItem("interstitial", data);
    setShowCreate(false);
    await load();
  }

  return (
    <AuthGate>
      <div className="min-h-screen bg-brand-bg">
        <Nav />
        <main className="max-w-4xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-brand-light text-2xl font-bold">Loading Interstitials</h1>
            <button
              onClick={() => setShowCreate(!showCreate)}
              className="bg-brand-blue hover:bg-brand-blue/80 text-brand-light text-sm font-semibold px-4 py-2 rounded transition-colors"
            >
              {showCreate ? "Cancel" : "+ New Slide"}
            </button>
          </div>
          <p className="text-brand-muted text-sm mb-6">
            Slides shown in rotation during app loading. Each can have a title, body text, and optional image.
          </p>

          {showCreate && (
            <div className="bg-[#111a16] border border-brand-blue/40 rounded-lg p-5 mb-6">
              <h2 className="text-brand-light font-semibold mb-4 text-sm uppercase tracking-wide">
                New Interstitial Slide
              </h2>
              <CmsItemForm
                type="interstitial"
                onSave={handleCreate}
                onCancel={() => setShowCreate(false)}
                showImageKey
                showOrder
              />
            </div>
          )}

          {loading && (
            <p className="text-brand-muted/60 text-sm">Loading...</p>
          )}
          {!loading && error && (
            <div className="bg-brand-red/10 border border-brand-red/30 rounded p-4 text-brand-red text-sm">
              {error}
            </div>
          )}
          {!loading && !error && items.length === 0 && (
            <div className="text-center py-16 text-brand-muted/50">
              <p>No interstitial slides yet.</p>
              <p className="text-xs mt-1">Click &ldquo;+ New Slide&rdquo; to create the first one.</p>
            </div>
          )}
          {!loading && !error && items.length > 0 && (
            <div className="space-y-4">
              {items.map((item) => (
                <CmsItemCard
                  key={item.id}
                  item={item}
                  onRefresh={load}
                  showImageKey
                  showOrder
                />
              ))}
            </div>
          )}
        </main>
      </div>
    </AuthGate>
  );
}
