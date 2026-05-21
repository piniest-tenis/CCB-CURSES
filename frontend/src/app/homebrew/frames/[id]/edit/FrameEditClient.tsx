"use client";

/**
 * src/app/frames/[id]/edit/FrameEditClient.tsx
 *
 * Edit form for an existing campaign frame.
 * Pre-populates all fields from the current frame data.
 * Validates ownership (creatorUserId === current user).
 * On success, redirects to /frames/{frameId}.
 */

import React, { useEffect, useId, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/store/authStore";
import { useFrameDetail, useUpdateFrame } from "@/hooks/useFrames";
import type { FrameComplexityRating } from "@shared/types";

// ── Constants ─────────────────────────────────────────────────────────────────

const MAX_NAME_LENGTH     = 100;
const MAX_AUTHOR_LENGTH   = 100;
const MAX_PITCH_LENGTH    = 200;
const MAX_TONE_LENGTH     = 500;
const MAX_OVERVIEW_LENGTH = 2000;
const MAX_TAGS            = 10;

const COMPLEXITY_OPTIONS: { value: FrameComplexityRating; label: string }[] = [
  { value: "low",      label: "Low" },
  { value: "moderate", label: "Moderate" },
  { value: "high",     label: "High" },
  { value: "extreme",  label: "Extreme" },
];

// ── Component ─────────────────────────────────────────────────────────────────

export default function FrameEditClient() {
  const pathname = usePathname();
  // useParams() returns "__placeholder__" in a static export; usePathname()
  // always reflects the actual browser URL path.
  // Path: /homebrew/frames/[id]/edit -> segment index 3
  const rawFrameId = pathname?.split("/")[3] ?? "";
  // Guard: only treat as a valid frame ID if it looks like a UUID.
  const frameId = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(rawFrameId) ? rawFrameId : "";

  const router = useRouter();
  const { user, isAuthenticated, isReady, isLoading: authLoading } = useAuthStore();

  const { data: frame, isLoading: frameLoading, isError: frameError, error: frameFetchError } =
    useFrameDetail(frameId || undefined);
  const updateMutation = useUpdateFrame(frameId);

  // ── Form state ────────────────────────────────────────────────────────────
  const [name, setName]               = useState("");
  const [author, setAuthor]           = useState("");
  const [complexity, setComplexity]   = useState<FrameComplexityRating | "">("");
  const [pitch, setPitch]             = useState("");
  const [toneAndFeel, setToneAndFeel] = useState("");
  const [overview, setOverview]       = useState("");
  const [themes, setThemes]           = useState<string[]>([]);
  const [themeInput, setThemeInput]   = useState("");
  const [touchstones, setTouchstones] = useState<string[]>([]);
  const [touchstoneInput, setTouchstoneInput] = useState("");
  const [initialized, setInitialized] = useState(false);

  // ── IDs for a11y ──────────────────────────────────────────────────────────
  const nameId        = useId();
  const authorId      = useId();
  const complexityId  = useId();
  const pitchId       = useId();
  const toneId        = useId();
  const overviewId    = useId();
  const themesId      = useId();
  const touchstonesId = useId();
  const nameErrorId   = useId();
  const formErrorId   = useId();

  // ── Auth guard ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (isReady && !isAuthenticated) {
      router.replace("/auth/login");
    }
  }, [isReady, isAuthenticated, router]);

  // ── Pre-fill form once frame data loads ───────────────────────────────────
  useEffect(() => {
    if (frame && !initialized) {
      setName(frame.name);
      setAuthor(frame.author ?? "");
      setComplexity(frame.complexity ?? "");
      setPitch(frame.pitch ?? "");
      setToneAndFeel(frame.toneAndFeel ?? "");
      setOverview(frame.overview ?? "");
      setThemes(frame.themes ?? []);
      setTouchstones(frame.touchstones ?? []);
      setInitialized(true);
    }
  }, [frame, initialized]);

  // ── Loading state ─────────────────────────────────────────────────────────
  if (!isReady || authLoading || !isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a100d]">
        <div
          aria-label="Loading"
          className="h-8 w-8 animate-spin rounded-full border-2 border-[#577399] border-t-transparent"
        />
      </div>
    );
  }

  if (frameLoading) {
    return (
      <div className="min-h-screen bg-[#0a100d] flex flex-col">
        <header className="border-b border-slate-800/60">
          <div className="mx-auto max-w-2xl px-4 py-4">
            <Link
              href={`/homebrew/frames/${frameId}`}
              className="
                flex items-center gap-2 text-sm text-[#b9baa3]/60
                hover:text-[#b9baa3] transition-colors
                focus:outline-none focus:ring-2 focus:ring-[#577399] rounded
              "
              aria-label="Back to frame"
            >
              <span aria-hidden="true">&larr;</span>
              Back to Frame
            </Link>
          </div>
        </header>
        <div className="flex flex-1 items-center justify-center">
          <div
            aria-label="Loading frame data"
            className="h-8 w-8 animate-spin rounded-full border-2 border-[#577399] border-t-transparent"
          />
        </div>
      </div>
    );
  }

  // ── Fetch error state ─────────────────────────────────────────────────────
  if (frameError) {
    return (
      <div className="min-h-screen bg-[#0a100d] flex flex-col">
        <header className="border-b border-slate-800/60">
          <div className="mx-auto max-w-2xl px-4 py-4">
            <Link
              href={`/homebrew/frames/${frameId}`}
              className="
                flex items-center gap-2 text-sm text-[#b9baa3]/60
                hover:text-[#b9baa3] transition-colors
                focus:outline-none focus:ring-2 focus:ring-[#577399] rounded
              "
              aria-label="Back to frame"
            >
              <span aria-hidden="true">&larr;</span>
              Back to Frame
            </Link>
          </div>
        </header>
        <main className="flex-1 mx-auto w-full max-w-2xl px-4 py-10">
          <div
            role="alert"
            className="rounded-lg border border-[#fe5f55]/40 bg-[#fe5f55]/10 px-4 py-3"
          >
            <p className="text-sm text-[#fe5f55]">
              {frameFetchError?.message ?? "Failed to load frame data. Please try again."}
            </p>
          </div>
        </main>
      </div>
    );
  }

  // ── Ownership check ───────────────────────────────────────────────────────
  if (frame && user && frame.creatorUserId !== user.userId) {
    return (
      <div className="min-h-screen bg-[#0a100d] flex flex-col">
        <header className="border-b border-slate-800/60">
          <div className="mx-auto max-w-2xl px-4 py-4">
            <Link
              href={`/homebrew/frames/${frameId}`}
              className="
                flex items-center gap-2 text-sm text-[#b9baa3]/60
                hover:text-[#b9baa3] transition-colors
                focus:outline-none focus:ring-2 focus:ring-[#577399] rounded
              "
              aria-label="Back to frame"
            >
              <span aria-hidden="true">&larr;</span>
              Back to Frame
            </Link>
          </div>
        </header>
        <main className="flex-1 mx-auto w-full max-w-2xl px-4 py-10">
          <div className="rounded-xl border border-[#577399]/30 bg-slate-900/80 p-6 shadow-card-fantasy text-center space-y-4">
            <h1 className="font-serif text-2xl font-semibold text-[#f7f7ff]">
              Permission Denied
            </h1>
            <p className="text-sm text-[#b9baa3]">
              You don&apos;t have permission to edit this frame.
            </p>
            <Link
              href={`/homebrew/frames/${frameId}`}
              className="
                inline-block rounded-lg px-5 py-2.5 text-sm font-medium
                border border-slate-700/60 text-[#b9baa3]/60
                hover:border-slate-600 hover:text-[#b9baa3]
                transition-colors
                focus:outline-none focus:ring-2 focus:ring-[#577399]
              "
            >
              Return to Frame
            </Link>
          </div>
        </main>
      </div>
    );
  }

  // ── Derived values ────────────────────────────────────────────────────────
  const nameValue   = name.trim();
  const isNameEmpty = nameValue.length === 0;
  const canSubmit   = !isNameEmpty && !updateMutation.isPending;

  // ── Tag helpers ───────────────────────────────────────────────────────────
  const addTheme = () => {
    const tag = themeInput.trim();
    if (
      tag.length > 0 &&
      themes.length < MAX_TAGS &&
      !themes.some((t) => t.toLowerCase() === tag.toLowerCase())
    ) {
      setThemes((prev) => [...prev, tag]);
      setThemeInput("");
    }
  };

  const removeTheme = (index: number) => {
    setThemes((prev) => prev.filter((_, i) => i !== index));
  };

  const addTouchstone = () => {
    const tag = touchstoneInput.trim();
    if (
      tag.length > 0 &&
      touchstones.length < MAX_TAGS &&
      !touchstones.some((t) => t.toLowerCase() === tag.toLowerCase())
    ) {
      setTouchstones((prev) => [...prev, tag]);
      setTouchstoneInput("");
    }
  };

  const removeTouchstone = (index: number) => {
    setTouchstones((prev) => prev.filter((_, i) => i !== index));
  };

  // ── Character counter helper ──────────────────────────────────────────────
  const charCountClass = (current: number, max: number) =>
    current >= max * 0.9
      ? "text-xs text-[#fe5f55]"
      : "text-xs text-[#b9baa3]";

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    await updateMutation.mutateAsync({
      name: nameValue,
      author:      author.trim()      || undefined,
      complexity:  complexity          || undefined,
      pitch:       pitch.trim()        || undefined,
      toneAndFeel: toneAndFeel.trim()  || undefined,
      overview:    overview.trim()     || undefined,
      themes:      themes.length > 0   ? themes      : undefined,
      touchstones: touchstones.length > 0 ? touchstones : undefined,
    });

    router.push(`/homebrew/frames/${frameId}`);
  };

  // ── Shared input class ────────────────────────────────────────────────────
  const inputClassName =
    "w-full rounded-lg border border-[#577399]/30 bg-[#0a100d] px-3 py-2 text-[#f7f7ff] placeholder-[#b9baa3]/50 focus:border-[#577399] focus:outline-none focus:ring-1 focus:ring-[#577399]";

  return (
    <div className="min-h-screen bg-[#0a100d] flex flex-col">
      {/* Back nav */}
      <header className="border-b border-slate-800/60">
        <div className="mx-auto max-w-2xl px-4 py-4">
          <Link
            href={`/homebrew/frames/${frameId}`}
            className="
              flex items-center gap-2 text-sm text-[#b9baa3]/60
              hover:text-[#b9baa3] transition-colors
              focus:outline-none focus:ring-2 focus:ring-[#577399] rounded
            "
            aria-label="Back to frame"
          >
            <span aria-hidden="true">&larr;</span>
            Back to Frame
          </Link>
        </div>
      </header>

      <main className="flex-1 mx-auto w-full max-w-2xl px-4 py-10">
        {/* Page heading */}
        <div className="mb-8">
          <h1 className="font-serif text-3xl font-semibold text-[#f7f7ff]">
            Edit Campaign Frame
          </h1>
          <p className="mt-2 text-sm text-[#b9baa3]/60">
            Update the metadata for your campaign frame.
          </p>
        </div>

        {/* Form card */}
        <form
          onSubmit={handleSubmit}
          noValidate
          className="
            rounded-xl border border-[#577399]/30 bg-slate-900/80
            p-6 shadow-card-fantasy space-y-6
          "
        >
          {/* ── Name (required) ──────────────────────────────────────────── */}
          <div>
            <label
              htmlFor={nameId}
              className="block text-sm font-medium text-[#f7f7ff] mb-1.5"
            >
              Name <span className="text-[#fe5f55]" aria-hidden="true">*</span>
              <span className="sr-only">(required)</span>
            </label>
            <input
              id={nameId}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={MAX_NAME_LENGTH}
              required
              aria-required="true"
              aria-describedby={isNameEmpty && name !== "" ? nameErrorId : undefined}
              placeholder="e.g. Dark Sun Conversion"
              className={inputClassName}
            />
            <div className="mt-1 flex items-center justify-between">
              {isNameEmpty && name !== "" ? (
                <p id={nameErrorId} role="alert" className="text-xs text-[#fe5f55]">
                  Frame name is required.
                </p>
              ) : (
                <span />
              )}
              <span
                className={`${charCountClass(name.length, MAX_NAME_LENGTH)} ml-auto`}
                aria-label={`${name.length} of ${MAX_NAME_LENGTH} characters`}
              >
                {name.length}/{MAX_NAME_LENGTH}
              </span>
            </div>
          </div>

          {/* ── Author (optional) ────────────────────────────────────────── */}
          <div>
            <label
              htmlFor={authorId}
              className="block text-sm font-medium text-[#f7f7ff] mb-1.5"
            >
              Author{" "}
              <span className="font-normal text-[#b9baa3]/50">(optional)</span>
            </label>
            <input
              id={authorId}
              type="text"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              maxLength={MAX_AUTHOR_LENGTH}
              placeholder="e.g. Your name or handle"
              className={inputClassName}
            />
            <div className="mt-1 flex justify-end">
              <span
                className={charCountClass(author.length, MAX_AUTHOR_LENGTH)}
                aria-label={`${author.length} of ${MAX_AUTHOR_LENGTH} characters`}
              >
                {author.length}/{MAX_AUTHOR_LENGTH}
              </span>
            </div>
          </div>

          {/* ── Complexity (optional) ────────────────────────────────────── */}
          <div>
            <label
              htmlFor={complexityId}
              className="block text-sm font-medium text-[#f7f7ff] mb-1.5"
            >
              Complexity{" "}
              <span className="font-normal text-[#b9baa3]/50">(optional)</span>
            </label>
            <select
              id={complexityId}
              value={complexity}
              onChange={(e) =>
                setComplexity(e.target.value as FrameComplexityRating | "")
              }
              className={`${inputClassName} appearance-none`}
            >
              <option value="">Select complexity...</option>
              {COMPLEXITY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* ── Pitch (optional) ─────────────────────────────────────────── */}
          <div>
            <label
              htmlFor={pitchId}
              className="block text-sm font-medium text-[#f7f7ff] mb-1.5"
            >
              Pitch{" "}
              <span className="font-normal text-[#b9baa3]/50">(optional)</span>
            </label>
            <input
              id={pitchId}
              type="text"
              value={pitch}
              onChange={(e) => setPitch(e.target.value)}
              maxLength={MAX_PITCH_LENGTH}
              placeholder="A one-line elevator pitch for this frame"
              className={inputClassName}
            />
            <div className="mt-1 flex items-center justify-between">
              <span className="text-xs text-[#b9baa3]">
                A one-line elevator pitch for this frame
              </span>
              <span
                className={charCountClass(pitch.length, MAX_PITCH_LENGTH)}
                aria-label={`${pitch.length} of ${MAX_PITCH_LENGTH} characters`}
              >
                {pitch.length}/{MAX_PITCH_LENGTH}
              </span>
            </div>
          </div>

          {/* ── Tone & Feel (optional) ───────────────────────────────────── */}
          <div>
            <label
              htmlFor={toneId}
              className="block text-sm font-medium text-[#f7f7ff] mb-1.5"
            >
              Tone &amp; Feel{" "}
              <span className="font-normal text-[#b9baa3]/50">(optional)</span>
            </label>
            <textarea
              id={toneId}
              value={toneAndFeel}
              onChange={(e) => setToneAndFeel(e.target.value)}
              maxLength={MAX_TONE_LENGTH}
              rows={3}
              placeholder="Describe the mood, atmosphere, and feel of this frame"
              className={`${inputClassName} resize-none`}
            />
            <div className="mt-1 flex items-center justify-between">
              <span className="text-xs text-[#b9baa3]">
                Describe the mood, atmosphere, and feel of this frame
              </span>
              <span
                className={charCountClass(toneAndFeel.length, MAX_TONE_LENGTH)}
                aria-label={`${toneAndFeel.length} of ${MAX_TONE_LENGTH} characters`}
              >
                {toneAndFeel.length}/{MAX_TONE_LENGTH}
              </span>
            </div>
          </div>

          {/* ── Overview (optional) ──────────────────────────────────────── */}
          <div>
            <label
              htmlFor={overviewId}
              className="block text-sm font-medium text-[#f7f7ff] mb-1.5"
            >
              Overview{" "}
              <span className="font-normal text-[#b9baa3]/50">(optional)</span>
            </label>
            <textarea
              id={overviewId}
              value={overview}
              onChange={(e) => setOverview(e.target.value)}
              maxLength={MAX_OVERVIEW_LENGTH}
              rows={6}
              placeholder="Detailed description of what this frame adds or changes"
              className={`${inputClassName} resize-none`}
            />
            <div className="mt-1 flex items-center justify-between">
              <span className="text-xs text-[#b9baa3]">
                Detailed description of what this frame adds or changes
              </span>
              <span
                className={charCountClass(overview.length, MAX_OVERVIEW_LENGTH)}
                aria-label={`${overview.length} of ${MAX_OVERVIEW_LENGTH} characters`}
              >
                {overview.length}/{MAX_OVERVIEW_LENGTH}
              </span>
            </div>
          </div>

          {/* ── Themes (tag input) ───────────────────────────────────────── */}
          <div>
            <label
              htmlFor={themesId}
              className="block text-sm font-medium text-[#f7f7ff] mb-1.5"
            >
              Themes{" "}
              <span className="font-normal text-[#b9baa3]/50">
                (optional, max {MAX_TAGS})
              </span>
            </label>
            <div className="flex gap-2">
              <input
                id={themesId}
                type="text"
                value={themeInput}
                onChange={(e) => setThemeInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addTheme();
                  }
                }}
                disabled={themes.length >= MAX_TAGS}
                placeholder={
                  themes.length >= MAX_TAGS
                    ? "Maximum themes reached"
                    : "e.g. political intrigue"
                }
                className={`${inputClassName} flex-1`}
              />
              <button
                type="button"
                onClick={addTheme}
                disabled={themes.length >= MAX_TAGS || themeInput.trim().length === 0}
                className="
                  rounded-lg px-4 py-2 text-sm font-medium
                  bg-[#577399]/20 text-[#577399]
                  hover:bg-[#577399]/30
                  disabled:opacity-40 disabled:cursor-not-allowed
                  transition-colors
                  focus:outline-none focus:ring-1 focus:ring-[#577399]
                "
              >
                Add
              </button>
            </div>
            {themes.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2" role="list" aria-label="Themes">
                {themes.map((theme, index) => (
                  <span
                    key={`${theme}-${index}`}
                    role="listitem"
                    className="
                      inline-flex items-center gap-1.5
                      bg-[#577399]/20 text-[#577399] rounded-full
                      px-3 py-1 text-sm
                    "
                  >
                    {theme}
                    <button
                      type="button"
                      onClick={() => removeTheme(index)}
                      className="
                        ml-0.5 rounded-full p-0.5
                        hover:bg-[#577399]/30 hover:text-[#f7f7ff]
                        transition-colors
                        focus:outline-none focus:ring-1 focus:ring-[#577399]
                      "
                      aria-label={`Remove theme: ${theme}`}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        className="h-3.5 w-3.5"
                        aria-hidden="true"
                      >
                        <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                      </svg>
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* ── Touchstones (tag input) ──────────────────────────────────── */}
          <div>
            <label
              htmlFor={touchstonesId}
              className="block text-sm font-medium text-[#f7f7ff] mb-1.5"
            >
              Touchstones{" "}
              <span className="font-normal text-[#b9baa3]/50">
                (optional, max {MAX_TAGS})
              </span>
            </label>
            <p className="mb-1.5 text-xs text-[#b9baa3]">
              Movies, books, games, etc. that inspired this frame
            </p>
            <div className="flex gap-2">
              <input
                id={touchstonesId}
                type="text"
                value={touchstoneInput}
                onChange={(e) => setTouchstoneInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addTouchstone();
                  }
                }}
                disabled={touchstones.length >= MAX_TAGS}
                placeholder={
                  touchstones.length >= MAX_TAGS
                    ? "Maximum touchstones reached"
                    : "e.g. Dark Souls, Attack on Titan"
                }
                className={`${inputClassName} flex-1`}
              />
              <button
                type="button"
                onClick={addTouchstone}
                disabled={touchstones.length >= MAX_TAGS || touchstoneInput.trim().length === 0}
                className="
                  rounded-lg px-4 py-2 text-sm font-medium
                  bg-[#577399]/20 text-[#577399]
                  hover:bg-[#577399]/30
                  disabled:opacity-40 disabled:cursor-not-allowed
                  transition-colors
                  focus:outline-none focus:ring-1 focus:ring-[#577399]
                "
              >
                Add
              </button>
            </div>
            {touchstones.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2" role="list" aria-label="Touchstones">
                {touchstones.map((touchstone, index) => (
                  <span
                    key={`${touchstone}-${index}`}
                    role="listitem"
                    className="
                      inline-flex items-center gap-1.5
                      bg-[#577399]/20 text-[#577399] rounded-full
                      px-3 py-1 text-sm
                    "
                  >
                    {touchstone}
                    <button
                      type="button"
                      onClick={() => removeTouchstone(index)}
                      className="
                        ml-0.5 rounded-full p-0.5
                        hover:bg-[#577399]/30 hover:text-[#f7f7ff]
                        transition-colors
                        focus:outline-none focus:ring-1 focus:ring-[#577399]
                      "
                      aria-label={`Remove touchstone: ${touchstone}`}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        className="h-3.5 w-3.5"
                        aria-hidden="true"
                      >
                        <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                      </svg>
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* ── Submission error ──────────────────────────────────────────── */}
          {updateMutation.isError && (
            <div
              id={formErrorId}
              role="alert"
              className="rounded-lg border border-[#fe5f55]/40 bg-[#fe5f55]/10 px-4 py-3"
            >
              <p className="text-sm text-[#fe5f55]">
                {updateMutation.error?.message ??
                  "Failed to save changes. Please try again."}
              </p>
            </div>
          )}

          {/* ── Actions ──────────────────────────────────────────────────── */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <Link
              href={`/homebrew/frames/${frameId}`}
              className="
                rounded-lg px-5 py-2.5 text-sm font-medium
                border border-slate-700/60 text-[#b9baa3]/60
                hover:border-slate-600 hover:text-[#b9baa3]
                transition-colors
                focus:outline-none focus:ring-2 focus:ring-[#577399]
              "
            >
              Cancel
            </Link>

            <button
              type="submit"
              disabled={!canSubmit}
              aria-describedby={updateMutation.isError ? formErrorId : undefined}
              className="
                rounded-lg px-6 py-2.5 font-semibold text-sm
                bg-[#577399] text-[#f7f7ff]
                hover:bg-[#577399]/80
                disabled:opacity-40 disabled:cursor-not-allowed
                transition-colors shadow-sm
                focus:outline-none focus:ring-2 focus:ring-[#577399]
                focus:ring-offset-2 focus:ring-offset-slate-900
              "
            >
              {updateMutation.isPending ? (
                <span className="flex items-center gap-2">
                  <span
                    aria-hidden="true"
                    className="h-3.5 w-3.5 animate-spin rounded-full border border-[#f7f7ff] border-t-transparent"
                  />
                  Saving...
                </span>
              ) : (
                "Save Changes"
              )}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
