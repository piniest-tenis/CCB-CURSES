"use client";

/**
 * src/app/campaigns/new/page.tsx
 *
 * Create new campaign form.
 * On success, redirects to /campaigns/{id}.
 * Full accessibility: labels, aria-describedby for errors, focus management.
 */

import React, { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { useCreateCampaign } from "@/hooks/useCampaigns";

const MAX_NAME_LENGTH        = 80;
const MAX_DESCRIPTION_LENGTH = 500;

export default function NewCampaignPage() {
  const router = useRouter();
  const { isAuthenticated, isReady, isLoading: authLoading } = useAuthStore();
  const createMutation = useCreateCampaign();

  const [name,        setName]        = useState("");
  const [description, setDescription] = useState("");

  const nameId        = useId();
  const descId        = useId();
  const nameErrorId   = useId();
  const formErrorId   = useId();

  const nameInputRef = useRef<HTMLInputElement>(null);

  // Auth guard
  useEffect(() => {
    if (isReady && !isAuthenticated) {
      router.replace("/auth/login?return_to=/campaigns/new");
    }
  }, [isReady, isAuthenticated, router]);

  // Focus name input on mount
  useEffect(() => {
    nameInputRef.current?.focus();
  }, []);

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

  const nameValue   = name.trim();
  const isNameEmpty = nameValue.length === 0;
  const canSubmit   = !isNameEmpty && !createMutation.isPending;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    const campaign = await createMutation.mutateAsync({
      name:        nameValue,
      description: description.trim() || null,
    });

    router.push(`/campaigns/${campaign.campaignId}`);
  };

  return (
    <div className="min-h-screen bg-[#0a100d] flex flex-col">
      {/* Back nav */}
      <header className="border-b border-slate-800/60">
        <div className="mx-auto max-w-2xl px-4 py-4">
          <button
            type="button"
            onClick={() => router.push("/campaigns")}
            className="
              flex items-center gap-2 text-sm text-[#b9baa3]/60
              hover:text-[#b9baa3] transition-colors
              focus:outline-none focus:ring-2 focus:ring-[#577399] rounded
            "
            aria-label="Back to campaigns"
          >
            <span aria-hidden="true">←</span>
            Campaigns
          </button>
        </div>
      </header>

      <main className="flex-1 mx-auto w-full max-w-2xl px-4 py-10">
        <div className="mb-8">
          <h1 className="font-serif text-3xl font-semibold text-[#f7f7ff]">
            New Campaign
          </h1>
          <p className="mt-2 text-sm text-[#b9baa3]/60">
            Create a campaign to invite players and run your sessions together.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          noValidate
          className="
            rounded-xl border border-[#577399]/30 bg-slate-900/80
            p-6 shadow-card-fantasy space-y-6
          "
        >
          {/* Campaign name */}
          <div>
            <label
              htmlFor={nameId}
              className="block text-sm font-semibold text-[#f7f7ff] mb-1.5"
            >
              Campaign Name <span className="text-[#fe5f55]" aria-hidden="true">*</span>
              <span className="sr-only">(required)</span>
            </label>
            <input
              ref={nameInputRef}
              id={nameId}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={MAX_NAME_LENGTH}
              required
              aria-required="true"
              aria-describedby={isNameEmpty && name !== "" ? nameErrorId : undefined}
              placeholder="e.g. The Shattered Realm"
              className="
                w-full rounded-lg border border-slate-700/60 bg-slate-950
                px-4 py-2.5 font-serif text-base text-[#f7f7ff]
                placeholder-[#b9baa3]/30
                focus:outline-none focus:ring-2 focus:ring-[#577399]
                focus:border-[#577399] transition-colors
              "
            />
            <div className="mt-1 flex items-center justify-between">
              {isNameEmpty && name !== "" ? (
                <p id={nameErrorId} role="alert" className="text-xs text-[#fe5f55]">
                  Campaign name is required.
                </p>
              ) : (
                <span />
              )}
              <span
                className="text-xs text-[#b9baa3]/40 ml-auto"
                aria-label={`${name.length} of ${MAX_NAME_LENGTH} characters`}
              >
                {name.length}/{MAX_NAME_LENGTH}
              </span>
            </div>
          </div>

          {/* Description */}
          <div>
            <label
              htmlFor={descId}
              className="block text-sm font-semibold text-[#f7f7ff] mb-1.5"
            >
              Description{" "}
              <span className="font-normal text-[#b9baa3]/50">(optional)</span>
            </label>
            <textarea
              id={descId}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={MAX_DESCRIPTION_LENGTH}
              rows={4}
              placeholder="Tell your players what this campaign is about…"
              className="
                w-full rounded-lg border border-slate-700/60 bg-slate-950
                px-4 py-2.5 text-sm text-[#f7f7ff] resize-none
                placeholder-[#b9baa3]/30
                focus:outline-none focus:ring-2 focus:ring-[#577399]
                focus:border-[#577399] transition-colors
              "
            />
            <p className="mt-1 text-right text-xs text-[#b9baa3]/40"
               aria-label={`${description.length} of ${MAX_DESCRIPTION_LENGTH} characters`}
            >
              {description.length}/{MAX_DESCRIPTION_LENGTH}
            </p>
          </div>

          {/* Submission error */}
          {createMutation.isError && (
            <div
              id={formErrorId}
              role="alert"
              className="rounded-lg border border-[#fe5f55]/40 bg-[#fe5f55]/10 px-4 py-3"
            >
              <p className="text-sm text-[#fe5f55]">
                {createMutation.error?.message ?? "Failed to create campaign. Please try again."}
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => router.push("/campaigns")}
              className="
                rounded-lg px-5 py-2.5 text-sm font-medium
                border border-slate-700/60 text-[#b9baa3]/60
                hover:border-slate-600 hover:text-[#b9baa3]
                transition-colors
                focus:outline-none focus:ring-2 focus:ring-[#577399]
              "
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={!canSubmit}
              aria-describedby={createMutation.isError ? formErrorId : undefined}
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
              {createMutation.isPending ? (
                <span className="flex items-center gap-2">
                  <span
                    aria-hidden="true"
                    className="h-3.5 w-3.5 animate-spin rounded-full border border-[#f7f7ff] border-t-transparent"
                  />
                  Creating…
                </span>
              ) : (
                "Create Campaign"
              )}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
