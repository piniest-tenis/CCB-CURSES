"use client";

// src/components/CmsItemForm.tsx
// Reusable create/edit form for a CMS item.

import React, { useState } from "react";
import type { CmsContent } from "@/lib/api";
import ImageUploader from "./ImageUploader";

interface CmsItemFormProps {
  type: "interstitial" | "splash";
  initial?: Partial<CmsContent>;
  onSave: (data: {
    title: string;
    body: string;
    imageKey: string | null;
    active: boolean;
    order: number;
  }) => Promise<void>;
  onCancel: () => void;
  showImageKey?: boolean;
  showOrder?: boolean;
}

export default function CmsItemForm({
  initial,
  onSave,
  onCancel,
  showImageKey = true,
  showOrder = true,
}: CmsItemFormProps) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [body, setBody] = useState(initial?.body ?? "");
  const [imageKey, setImageKey] = useState(initial?.imageKey ?? "");
  const [active, setActive] = useState(initial?.active ?? true);
  const [order, setOrder] = useState(initial?.order ?? 0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await onSave({
        title: title.trim(),
        body: body.trim(),
        imageKey: imageKey.trim() || null,
        active,
        order,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  const inputClass =
    "w-full bg-[#0d1610] border border-brand-muted/30 rounded px-3 py-2 text-brand-light placeholder-brand-muted/40 focus:outline-none focus:border-brand-blue text-sm";
  const labelClass = "block text-brand-muted text-xs font-semibold uppercase tracking-wider mb-1";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className={labelClass}>Title</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          maxLength={200}
          placeholder="Short heading"
          className={inputClass}
        />
      </div>

      <div>
        <label className={labelClass}>Body</label>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          required
          rows={8}
          placeholder="The text content (paragraph)"
          className={`${inputClass} resize-y`}
        />
      </div>

      {showImageKey && (
        <div className="space-y-3">
          <ImageUploader
            currentImageKey={imageKey || null}
            currentImageUrl={initial?.imageUrl ?? null}
            onUploaded={(key) => setImageKey(key)}
          />
          <div>
            <label className={labelClass}>Image Key (S3 key) — or paste manually</label>
            <input
              type="text"
              value={imageKey}
              onChange={(e) => setImageKey(e.target.value)}
              placeholder="e.g. cms/images/my-photo.jpg"
              className={inputClass}
            />
            <p className="text-brand-muted/50 text-xs mt-1">
              Leave blank for no image. Upload above sets this automatically.
            </p>
          </div>
        </div>
      )}

      {showOrder && (
        <div>
          <label className={labelClass}>Order</label>
          <input
            type="number"
            value={order}
            onChange={(e) => setOrder(parseInt(e.target.value, 10) || 0)}
            min={0}
            className={`${inputClass} w-24`}
          />
        </div>
      )}

      <div className="flex items-center gap-3">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={active}
            onChange={(e) => setActive(e.target.checked)}
            className="w-4 h-4 rounded accent-brand-blue"
          />
          <span className="text-brand-muted text-sm">Active (visible in app)</span>
        </label>
      </div>

      {error && <p className="text-brand-red text-sm">{error}</p>}

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={saving}
          className="bg-brand-blue hover:bg-brand-blue/80 disabled:opacity-50 text-brand-light font-semibold px-5 py-2 rounded transition-colors text-sm"
        >
          {saving ? "Saving..." : "Save"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="text-brand-muted hover:text-brand-light px-5 py-2 rounded border border-brand-muted/30 text-sm transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
