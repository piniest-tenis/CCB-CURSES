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
 *   3. updateField("portraitUrl", confirmUrl) triggers the auto-save in CharacterSheet
 */

import React, { useCallback, useRef, useState } from "react";
import type { Character } from "@shared/types";
import { useCharacterStore } from "@/store/characterStore";
import { useAuthStore } from "@/store/authStore";

// ─── API helpers ──────────────────────────────────────────────────────────────

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "";

interface PortraitUploadUrlResponse {
  uploadUrl: string;
  confirmUrl: string;
  s3Key: string;
  expiresIn: number;
  maxBytes: number;
}

async function fetchPortraitUploadUrl(
  characterId: string,
  authToken: string,
  file: File,
): Promise<PortraitUploadUrlResponse> {
  const res = await fetch(
    `${API_BASE}/characters/${characterId}/portrait-upload-url`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${authToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ contentType: file.type, filename: file.name }),
    },
  );
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(
      (body as { error?: string })?.error ?? `HTTP ${res.status}`,
    );
  }
  const json = await res.json();
  return json.data;
}

async function uploadToS3(uploadUrl: string, file: File): Promise<void> {
  const res = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": file.type },
    body: file,
  });
  if (!res.ok) throw new Error(`S3 upload failed: HTTP ${res.status}`);
}

// ─── DragDropZone ─────────────────────────────────────────────────────────────

interface DragDropZoneProps {
  onFile: (file: File) => void;
  preview: string | null;
  disabled?: boolean;
}

function DragDropZone({ onFile, preview, disabled }: DragDropZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const processFile = useCallback(
    (file: File | undefined | null) => {
      if (!file) return;
      if (!file.type.startsWith("image/")) return;
      onFile(file);
    },
    [onFile],
  );

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) setIsDragging(true);
  };
  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled) return;
    processFile(e.dataTransfer.files[0]);
  };
  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    processFile(e.target.files?.[0]);
    // Reset so same file can be re-selected
    e.target.value = "";
  };

  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-label="Drag and drop an image or click to browse"
      onClick={() => !disabled && inputRef.current?.click()}
      onKeyDown={(e) => {
        if (!disabled && (e.key === "Enter" || e.key === " "))
          inputRef.current?.click();
      }}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={[
        "relative flex flex-col items-center justify-center gap-3",
        "rounded-xl border-2 border-dashed px-4 py-8 text-center",
        "transition-colors duration-200 cursor-pointer select-none",
        isDragging
          ? "border-[#577399] bg-[#577399]/12"
          : "border-[#577399]/35 bg-[#b9baa3]/[0.04] hover:border-[#577399]/60 hover:bg-[#577399]/08",
        disabled ? "opacity-50 pointer-events-none" : "",
      ].join(" ")}
    >
      {preview ? (
        /* Show a thumbnail when a file is selected */
        <img
          src={preview}
          alt="Selected portrait preview"
          className="h-28 w-28 rounded-full object-cover border-2 border-[#577399]/40 shadow-lg"
        />
      ) : (
        /* Upload icon */
        <svg
          aria-hidden="true"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-10 w-10 text-[#577399]/50"
        >
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" y1="3" x2="12" y2="15" />
        </svg>
      )}

      <div className="space-y-1">
        <p className="text-sm font-semibold text-[#f7f7ff]">
          {preview ? "Drop a different image to replace" : "Drop image here"}
        </p>
        <p className="text-xs text-[#b9baa3]">
          or{" "}
          <span className="text-[#577399] underline underline-offset-2">
            click to browse
          </span>{" "}
          · JPG, PNG, WebP · max 5 MB
        </p>
      </div>

      {isDragging && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-xl bg-[#577399]/10 border-2 border-[#577399] transition-all"
        />
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        tabIndex={-1}
        aria-hidden="true"
        className="sr-only"
        onChange={onInputChange}
      />
    </div>
  );
}

// ─── PortraitUploadSidebar ────────────────────────────────────────────────────

interface PortraitUploadSidebarProps {
  open: boolean;
  onClose: () => void;
  characterId: string;
  currentUrl: string | null;
  onUploaded: (url: string) => void;
}

function PortraitUploadSidebar({
  open,
  onClose,
  characterId,
  currentUrl,
  onUploaded,
}: PortraitUploadSidebarProps) {
  const headingId = React.useId();
  const panelRef = React.useRef<HTMLDivElement>(null);

  const idToken = useAuthStore((s) => s.idToken);

  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Reset when opened
  React.useEffect(() => {
    if (!open) return;
    setPreview(null);
    setFile(null);
    setError(null);
    setSuccess(false);
    const t = setTimeout(() => {
      panelRef.current
        ?.querySelector<HTMLElement>(
          'button, [role="button"], input, [tabindex]:not([tabindex="-1"])',
        )
        ?.focus();
    }, 50);
    return () => clearTimeout(t);
  }, [open]);

  // Escape to close
  React.useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };
    document.addEventListener("keydown", handler, true);
    return () => document.removeEventListener("keydown", handler, true);
  }, [open, onClose]);

  const handleFile = useCallback((selected: File) => {
    setFile(selected);
    setError(null);
    setSuccess(false);
    const reader = new FileReader();
    reader.onload = (ev) => setPreview(ev.target?.result as string);
    reader.readAsDataURL(selected);
  }, []);

  const handleUpload = async () => {
    if (!file) return;
    if (!idToken) {
      setError("You must be signed in to upload a portrait.");
      return;
    }
    setError(null);
    setIsPending(true);
    try {
      // 1. Get presigned upload URL from our API
      const { uploadUrl, confirmUrl, maxBytes } = await fetchPortraitUploadUrl(
        characterId,
        idToken,
        file,
      );

      // 2. Validate size client-side
      if (file.size > maxBytes) {
        setError(
          `File too large. Maximum size: ${Math.round(maxBytes / 1024 / 1024)} MB.`,
        );
        return;
      }

      // 3. PUT directly to S3 (presigned URL — no auth header)
      await uploadToS3(uploadUrl, file);

      // 4. Persist the public URL on the character
      onUploaded(confirmUrl);
      setSuccess(true);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Upload failed. Please try again.",
      );
    } finally {
      setIsPending(false);
    }
  };

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
            <p className="text-xs uppercase tracking-[0.24em] text-[#b9baa3]">
              Character
            </p>
            <h2
              id={headingId}
              className="font-serif text-lg font-semibold text-[#f7f7ff]"
            >
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
          {/* Current portrait (shown when no new file selected) */}
          {!preview && currentUrl && (
            <div className="flex justify-center">
              <div className="relative">
                <img
                  src={currentUrl}
                  alt="Current portrait"
                  className="h-28 w-28 rounded-full object-cover border-2 border-[#577399]/40"
                />
                <p className="mt-2 text-center text-xs text-[#b9baa3]">
                  Current portrait
                </p>
              </div>
            </div>
          )}

          {/* Drag-and-drop zone */}
          <DragDropZone
            onFile={handleFile}
            preview={preview}
            disabled={isPending}
          />

          {/* Clear selection */}
          {file && !isPending && (
            <button
              type="button"
              onClick={() => {
                setFile(null);
                setPreview(null);
                setError(null);
                setSuccess(false);
              }}
              className="w-full text-xs text-[#b9baa3] hover:text-[#f7f7ff] underline underline-offset-2 transition-colors"
            >
              Clear selection
            </button>
          )}

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
  const { activeCharacter, updateField, saveCharacter } = useCharacterStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (!activeCharacter) return null;

  const portraitUrl: string | null =
    (activeCharacter as Character).portraitUrl ?? null;

  const handleUploaded = (url: string) => {
    // Update the store immediately so the UI reflects the new portrait without
    // waiting for the debounced auto-save, then persist right away.
    updateField("portraitUrl", url);
    // Fire the PATCH immediately — don't rely on the 1500ms debounce.
    void saveCharacter();
    setSidebarOpen(false);
  };

  return (
    <>
      {/* Portrait area */}
      <div className="flex justify-center">
        <div
          role="button"
          tabIndex={0}
          onClick={() => setSidebarOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setSidebarOpen(true);
            }
          }}
          aria-label={
            portraitUrl
              ? "Change character portrait"
              : "Upload character portrait"
          }
          aria-haspopup="dialog"
          aria-expanded={sidebarOpen}
          className="
            relative group
            focus:outline-none focus:ring-2 focus:ring-[#577399] focus:ring-offset-2 focus:ring-offset-[#0a100d]
            rounded-full cursor-pointer transition-opacity duration-200 hover:opacity-90
          "
          style={{ width: 180, height: 180 }}
        >
          {/* Portrait image — circular crop */}
          {portraitUrl ? (
            <img
              src={portraitUrl}
              alt={`${activeCharacter.name}'s portrait`}
              style={{ padding: "20px" }} // Matches outer transparency on the SVG frame.
              className="
                absolute inset-0 w-full h-full
                rounded-full object-cover
              "
            />
          ) : (
            <div
              className="
                absolute inset-0 w-full h-full
                rounded-full flex items-center justify-center bg-[#577399]/10
              "
            >
              <span className="text-3xl text-[#577399]/30">⬡</span>
            </div>
          )}

          {/* SVG frame overlay */}
          <img
            src="/images/ui-elements/round-portrait-frame.svg"
            alt=""
            aria-hidden="true"
            className="absolute inset-0 w-full h-full rounded-full object-contain pointer-events-none"
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
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[#f7f7ff] bg-[#0a100d]/70 rounded px-1.5 py-0.5">
              {portraitUrl ? "Change" : "Upload"}
            </span>
          </div>
        </div>
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
