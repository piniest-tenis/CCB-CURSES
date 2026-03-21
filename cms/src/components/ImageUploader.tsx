"use client";

// src/components/ImageUploader.tsx
// Drag-and-drop / click-to-browse image uploader for CMS items.
// Uploads directly to S3 via a pre-signed PUT URL, then calls onUploaded
// with the resulting imageKey and cdnUrl.
//
// Accepts JPEG, PNG, and WebP up to 10 MB.

import React, { useCallback, useRef, useState } from "react";
import { requestPresignedUpload, uploadToS3 } from "@/lib/api";

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
type AcceptedType = (typeof ACCEPTED_TYPES)[number];

function isAcceptedType(t: string): t is AcceptedType {
  return (ACCEPTED_TYPES as readonly string[]).includes(t);
}

interface ImageUploaderProps {
  /** Called after a successful upload with the S3 key and CDN URL. */
  onUploaded: (imageKey: string, cdnUrl: string) => void;
  /** Currently saved S3 key — shown as text label when no CDN URL is available. */
  currentImageKey?: string | null;
  /** Currently saved CDN URL — shown as an image preview before any new upload. */
  currentImageUrl?: string | null;
}

type UploadState =
  | { status: "idle" }
  | { status: "uploading"; progress: string }
  | { status: "done"; cdnUrl: string; imageKey: string }
  | { status: "error"; message: string };

export default function ImageUploader({
  onUploaded,
  currentImageKey,
  currentImageUrl,
}: ImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploadState, setUploadState] = useState<UploadState>({ status: "idle" });
  const [dragging, setDragging] = useState(false);

  const handleFile = useCallback(
    async (file: File) => {
      if (!isAcceptedType(file.type)) {
        setUploadState({
          status: "error",
          message: "Unsupported file type. Use JPEG, PNG, or WebP.",
        });
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        setUploadState({ status: "error", message: "File exceeds 10 MB limit." });
        return;
      }

      setUploadState({ status: "uploading", progress: "Requesting upload URL..." });

      let presign;
      try {
        presign = await requestPresignedUpload(file.name, file.type);
      } catch (err) {
        setUploadState({
          status: "error",
          message: err instanceof Error ? err.message : "Could not get upload URL.",
        });
        return;
      }

      setUploadState({ status: "uploading", progress: "Uploading to S3..." });

      try {
        await uploadToS3(presign.uploadUrl, file);
      } catch (err) {
        setUploadState({
          status: "error",
          message: err instanceof Error ? err.message : "Upload failed.",
        });
        return;
      }

      setUploadState({
        status: "done",
        cdnUrl: presign.cdnUrl,
        imageKey: presign.imageKey,
      });
      onUploaded(presign.imageKey, presign.cdnUrl);
    },
    [onUploaded]
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
      // Reset input so the same file can be re-selected after an error
      e.target.value = "";
    },
    [handleFile]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => setDragging(false), []);

  const previewUrl =
    uploadState.status === "done"
      ? uploadState.cdnUrl
      : currentImageUrl ?? null;

  const labelClass =
    "block text-brand-muted text-xs font-semibold uppercase tracking-wider mb-1";

  return (
    <div className="space-y-2">
      <label className={labelClass}>Image Upload</label>

      {/* Drop zone */}
      <div
        role="button"
        tabIndex={0}
        aria-label="Click or drag an image here to upload"
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`relative flex flex-col items-center justify-center gap-2 rounded border-2 border-dashed px-4 py-6 cursor-pointer transition-colors select-none
          ${dragging
            ? "border-brand-blue bg-brand-blue/10"
            : "border-brand-muted/30 hover:border-brand-blue/60 bg-[#0d1610]"
          }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          onChange={handleInputChange}
        />

        {uploadState.status === "uploading" ? (
          <p className="text-brand-muted text-sm">{uploadState.progress}</p>
        ) : uploadState.status === "done" ? (
          <>
            {previewUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={previewUrl}
                alt="Uploaded preview"
                className="max-h-40 rounded object-contain"
              />
            )}
            <p className="text-green-400 text-xs font-semibold">Upload complete</p>
            <p className="text-brand-muted/60 text-xs font-mono truncate max-w-full">
              {uploadState.imageKey}
            </p>
            <p className="text-brand-blue/70 text-xs">Click to replace</p>
          </>
        ) : (
          <>
            {previewUrl ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={previewUrl}
                  alt="Current image"
                  className="max-h-40 rounded object-contain"
                />
                <p className="text-brand-muted/50 text-xs">Click or drag to replace</p>
              </>
            ) : (
              <>
                <svg
                  className="w-8 h-8 text-brand-muted/40"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5"
                  />
                </svg>
                {currentImageKey ? (
                  <>
                    <p className="text-brand-muted/60 text-xs font-mono truncate max-w-full">
                      Current: {currentImageKey}
                    </p>
                    <p className="text-brand-muted/50 text-xs">Click or drag to replace</p>
                  </>
                ) : (
                  <>
                    <p className="text-brand-muted text-sm">Click or drag an image here</p>
                    <p className="text-brand-muted/50 text-xs">JPEG, PNG, WebP — max 10 MB</p>
                  </>
                )}
              </>
            )}
          </>
        )}
      </div>

      {uploadState.status === "error" && (
        <p className="text-brand-red text-xs">{uploadState.message}</p>
      )}
    </div>
  );
}
