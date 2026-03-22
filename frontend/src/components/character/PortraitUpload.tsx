"use client";

/**
 * src/components/character/PortraitUpload.tsx
 *
 * Renders a circular portrait display centered behind round-portrait-frame.svg,
 * and a slide-in side panel for uploading a new portrait.
 *
 * Upload flow:
 *   1. POST /characters/{id}/portrait-upload-url
 *        → { uploadUrl, confirmUrl, s3Key, expiresIn, maxBytes }
 *   2. PUT uploadUrl with raw image bytes (no auth header)
 *   3. PATCH /characters/{id} with { portraitUrl: confirmUrl }
 *      (the auto-save in CharacterSheet handles this once updateField is called)
 *
 * The component reads character.portraitUrl (string | null) and displays it.
 */

import React, { useRef, useState } from "react";
import type { Character } from "@shared/types";
import { useCharacterStore } from "@/store/characterStore";

// ─── API helpers ──────────────────────────────────────────────────────────────

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

interface PortraitUploadUrlResponse {
  uploadUrl:   string;
  confirmUrl:  string;
  s3Key:       string;
  expiresIn:   number;
  maxBytes:    number;
}

async function fetchPortraitUploadUrl(
  characterId: string,
  authToken:   string
): Promise<PortraitUploadUrlResponse> {
  const res = await fetch(`${API_BASE}/characters/${characterId}/portrait-upload-url`, {
    method:  "POST",
    headers: { Authorization: `Bearer ${authToken}` },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error ?? `HTTP ${res.status}`);
  }
  return res.json();
}

async function uploadToS3(uploadUrl: string, file: File): Promise<void> {
  const res = await fetch(uploadUrl, {
    method:  "PUT",
    headers: { "Content-Type": file.type },
    body:    file,
  });
  if (!res.ok) throw new Error(`S3 upload failed: HTTP ${res.status}`);
}

// ─── PortraitUploadSidebar ────────────────────────────────────────────────────

interface PortraitUploadSidebarProps {
  open:        boolean;
  onClose:     () => void;
  characterId: string;
  currentUrl:  string | null;
  onUploaded:  (url: string) => void;
}

function PortraitUploadSidebar({
  open,
  onClose,
  characterId,
  currentUrl,
  onUploaded,
}: PortraitUploadSidebarProps) {
  const headingId  = React.useId();
  const panelRef   = React.useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [preview, setPreview]   = useState<string | null>(null);
  const [file, setFile]         = useState<File | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [success, setSuccess]   = useState(false);

  // Reset when opened
  React.useEffect(() => {
    if (!open) return;
    setPreview(null);
    setFile(null);
    setError(null);
    setSuccess(false);
    const t = setTimeout(() => {
      panelRef.current
        ?.querySelector<HTMLElement>('button, input, [tabindex]:not([tabindex="-1"])')
        ?.focus();
    }, 50);
    return () => clearTimeout(t);
  }, [open]);

  // Escape to close
  React.useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.stopPropagation(); onClose(); }
    };
    document.addEventListener("keydown", handler, true);
    return () => document.removeEventListener("keydown", handler, true);
  }, [open, onClose]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0] ?? null;
    setFile(selected);
    setError(null);
    setSuccess(false);
    if (selected) {
      const reader = new FileReader();
      reader.onload = (ev) => setPreview(ev.target?.result as string);
      reader.readAsDataURL(selected);
    } else {
      setPreview(null);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setError(null);
    setIsPending(true);
    try {
      // 1. Get auth token from session (Next.js /api/auth/token or similar)
      //    We'll pull it from the meta cookie pattern used elsewhere in this app.
      const tokenRes = await fetch("/api/auth/token");
      const { token } = tokenRes.ok ? await tokenRes.json() : { token: "" };

      // 2. Get presigned upload URL
      const { uploadUrl, confirmUrl, maxBytes } = await fetchPortraitUploadUrl(
        characterId,
        token
      );

      // 3. Validate size
      if (file.size > maxBytes) {
        setError(`File too large. Maximum size: ${Math.round(maxBytes / 1024 / 1024)} MB.`);
        return;
      }

      // 4. Upload to S3 (no auth header — presigned URL)
      await uploadToS3(uploadUrl, file);

      // 5. Confirm to the app
      onUploaded(confirmUrl);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed. Please try again.");
    } finally {
      setIsPending(false);
    }
  };

  const displayUrl = preview ?? currentUrl;

  return (
    <>
      {open && (
        <div
          aria-hidden="true"
          onClick={onClose}
          className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-sm lg:hidden"
        />
      )}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={headingId}
        aria-hidden={!open}
        inert={!open ? ("" as unknown as boolean) : undefined}
        className={[
          "fixed inset-y-0 right-0 z-50 flex h-full w-full max-w-[28rem] flex-col",
          "border-l border-[#577399]/35 bg-[#0f1713] shadow-2xl",
          "transition-transform duration-300 ease-in-out",
          open ? "translate-x-0" : "translate-x-full",
        ].join(" ")}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#577399]/25 px-5 py-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.24em] text-[#b9baa3]">Character</p>
            <h2 id={headingId} className="font-serif text-lg font-semibold text-[#f7f7ff]">
              Portrait
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close portrait panel"
            className="flex h-11 w-11 items-center justify-center rounded-lg border border-[#577399]/30 text-[#b9baa3] hover:bg-[#577399]/12 hover:text-[#f7f7ff] focus:outline-none focus:ring-2 focus:ring-[#577399]"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
          {/* Preview */}
          <div className="flex justify-center">
            <div
              className="relative h-40 w-40 rounded-full overflow-hidden border-2 border-[#577399]/40 bg-slate-900"
              aria-label="Portrait preview"
            >
              {displayUrl ? (
                <img
                  src={displayUrl}
                  alt="Portrait preview"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="h-full w-full flex items-center justify-center">
                  <span className="text-5xl text-[#577399]/30" aria-hidden="true">?</span>
                </div>
              )}
            </div>
          </div>

          {/* Help text */}
          <div className="rounded-xl border border-[#577399]/20 bg-[#b9baa3]/[0.06] px-4 py-3">
            <p className="text-sm text-[#f7f7ff] leading-relaxed">
              Upload a portrait image to personalize your character sheet. Square images work best. JPG or PNG, max 5 MB.
            </p>
          </div>

          {/* File input */}
          <div className="space-y-2">
            <label
              htmlFor="portrait-file-input"
              className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#b9baa3]"
            >
              Choose image
            </label>
            <input
              id="portrait-file-input"
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileChange}
              className="
                block w-full text-sm text-[#b9baa3]
                file:mr-4 file:rounded-lg file:border file:border-[#577399]/40
                file:bg-[#577399]/15 file:px-4 file:py-2
                file:text-sm file:font-semibold file:text-[#f7f7ff]
                file:cursor-pointer file:transition-colors
                hover:file:bg-[#577399]/25
                focus:outline-none
              "
            />
          </div>

          {/* Error */}
          {error && (
            <p
              role="alert"
              className="rounded-lg border border-[#fe5f55]/40 bg-[#fe5f55]/10 px-3 py-2 text-sm text-[#fe5f55]"
            >
              {error}
            </p>
          )}

          {/* Success */}
          {success && (
            <p
              role="status"
              aria-live="polite"
              className="rounded-lg border border-[#577399]/40 bg-[#577399]/15 px-3 py-2 text-sm text-[#f7f7ff]"
            >
              Portrait uploaded successfully.
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-[#577399]/25 px-5 py-4 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border border-[#577399]/30 bg-transparent px-4 py-3 text-sm font-semibold text-[#b9baa3] hover:bg-[#577399]/10 focus:outline-none focus:ring-2 focus:ring-[#577399]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleUpload}
            disabled={!file || isPending}
            aria-busy={isPending}
            className="
              flex-1 rounded-xl border border-[#577399]/40 bg-[#577399]/20 px-4 py-3
              text-sm font-semibold text-[#f7f7ff]
              hover:bg-[#577399]/30 hover:border-[#577399]
              disabled:opacity-40 disabled:cursor-not-allowed
              focus:outline-none focus:ring-2 focus:ring-[#577399]
              transition-colors
            "
          >
            {isPending ? (
              <span
                aria-hidden="true"
                className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
              />
            ) : (
              "Upload Portrait"
            )}
          </button>
        </div>
      </div>
    </>
  );
}

// ─── PortraitDisplay ──────────────────────────────────────────────────────────
// Circular portrait centered behind round-portrait-frame.svg.
// Clicking opens the upload sidebar.

interface PortraitDisplayProps {
  characterId: string;
}

export function PortraitDisplay({ characterId }: PortraitDisplayProps) {
  const { activeCharacter, updateField } = useCharacterStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (!activeCharacter) return null;

  const portraitUrl: string | null = (activeCharacter as Character).portraitUrl ?? null;

  const handleUploaded = (url: string) => {
    updateField("portraitUrl", url);
    setSidebarOpen(false);
  };

  return (
    <>
      {/* Portrait area */}
      <div className="flex justify-center">
        <button
          type="button"
          onClick={() => setSidebarOpen(true)}
          aria-label={portraitUrl ? "Change character portrait" : "Upload character portrait"}
          aria-haspopup="dialog"
          aria-expanded={sidebarOpen}
          className="
            relative group
            focus:outline-none focus:ring-2 focus:ring-[#577399] focus:ring-offset-2 focus:ring-offset-[#0a100d]
            rounded-full
          "
          style={{ width: 180, height: 162 }}  /* proportional to SVG viewBox 596.65 × 536.72 */
        >
          {/* Background portrait image — circular crop */}
          <div
            className="absolute"
            style={{
              /* Portrait sits centered and slightly higher than frame center */
              top: "8%", left: "16%", right: "16%", bottom: "4%",
              borderRadius: "50%",
              overflow: "hidden",
              background: "#0a100d",
            }}
          >
            {portraitUrl ? (
              <img
                src={portraitUrl}
                alt=""
                aria-hidden="true"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-[#577399]/10">
                <span className="text-3xl text-[#577399]/30" aria-hidden="true">
                  ⬡
                </span>
              </div>
            )}
          </div>

          {/* SVG frame overlay */}
          <img
            src="/images/ui-elements/round-portrait-frame.svg"
            alt=""
            aria-hidden="true"
            className="absolute inset-0 w-full h-full object-contain pointer-events-none"
            draggable={false}
          />

          {/* Hover hint */}
          <div
            aria-hidden="true"
            className="
              absolute inset-0 rounded-full flex items-end justify-center pb-3
              opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100
              transition-opacity duration-200
            "
          >
            <span className="text-[9px] font-semibold uppercase tracking-wider text-[#f7f7ff] bg-[#0a100d]/70 rounded px-1.5 py-0.5">
              {portraitUrl ? "Change" : "Upload"}
            </span>
          </div>
        </button>
      </div>

      <PortraitUploadSidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        characterId={characterId}
        currentUrl={portraitUrl}
        onUploaded={handleUploaded}
      />
    </>
  );
}
