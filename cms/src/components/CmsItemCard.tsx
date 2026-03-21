"use client";

// src/components/CmsItemCard.tsx
// Displays a single CMS item with edit/delete/activate controls.

import React, { useState } from "react";
import type { CmsContent } from "@/lib/api";
import CmsItemForm from "./CmsItemForm";
import { activateItem, deactivateItem, deleteItem, updateItem } from "@/lib/api";

interface CmsItemCardProps {
  item: CmsContent;
  onRefresh: () => void;
  showImageKey?: boolean;
  showOrder?: boolean;
}

export default function CmsItemCard({
  item,
  onRefresh,
  showImageKey = true,
  showOrder = true,
}: CmsItemCardProps) {
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function handleDelete() {
    if (!confirm(`Delete "${item.title}"?`)) return;
    setBusy(true);
    setError("");
    try {
      await deleteItem(item.type, item.id);
      onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleToggleActive() {
    setBusy(true);
    setError("");
    try {
      if (item.active) {
        await deactivateItem(item.type, item.id);
      } else {
        await activateItem(item.type, item.id);
      }
      onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Toggle failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleSave(data: {
    title: string;
    body: string;
    imageKey: string | null;
    active: boolean;
    order: number;
  }) {
    await updateItem(item.type, item.id, data);
    setEditing(false);
    onRefresh();
  }

  if (editing) {
    return (
      <div className="bg-[#111a16] border border-brand-blue/40 rounded-lg p-5">
        <h3 className="text-brand-light font-semibold mb-4 text-sm uppercase tracking-wide">
          Editing: {item.title}
        </h3>
        <CmsItemForm
          type={item.type}
          initial={item}
          onSave={handleSave}
          onCancel={() => setEditing(false)}
          showImageKey={showImageKey}
          showOrder={showOrder}
        />
      </div>
    );
  }

  return (
    <div
      className={`bg-[#111a16] border rounded-lg p-5 ${
        item.active ? "border-brand-muted/20" : "border-brand-muted/10 opacity-60"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {showOrder && (
              <span className="text-brand-muted/60 text-xs font-mono">#{item.order}</span>
            )}
            <h3 className="text-brand-light font-semibold truncate">{item.title}</h3>
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                item.active
                  ? "bg-green-900/40 text-green-400"
                  : "bg-brand-muted/10 text-brand-muted/60"
              }`}
            >
              {item.active ? "Active" : "Inactive"}
            </span>
          </div>
          <p className="text-brand-muted text-sm line-clamp-3 whitespace-pre-line">
            {item.body}
          </p>
          {item.imageKey && (
            <p className="text-brand-blue/70 text-xs mt-2 font-mono truncate">
              Image: {item.imageKey}
            </p>
          )}
          <p className="text-brand-muted/40 text-xs mt-2">
            ID: {item.id} &middot; Updated:{" "}
            {new Date(item.updatedAt).toLocaleString()}
          </p>
        </div>
        <div className="flex flex-col gap-1 shrink-0">
          <button
            onClick={() => setEditing(true)}
            disabled={busy}
            className="text-brand-blue hover:text-brand-light text-sm px-3 py-1 rounded border border-brand-blue/30 hover:border-brand-blue transition-colors"
          >
            Edit
          </button>
          <button
            onClick={handleToggleActive}
            disabled={busy}
            className="text-brand-muted hover:text-brand-light text-sm px-3 py-1 rounded border border-brand-muted/20 hover:border-brand-muted/40 transition-colors"
          >
            {item.active ? "Deactivate" : "Activate"}
          </button>
          <button
            onClick={handleDelete}
            disabled={busy}
            className="text-brand-red/70 hover:text-brand-red text-sm px-3 py-1 rounded border border-brand-red/20 hover:border-brand-red/40 transition-colors"
          >
            Delete
          </button>
        </div>
      </div>
      {error && <p className="text-brand-red text-xs mt-2">{error}</p>}
    </div>
  );
}
