"use client";

/**
 * src/app/homebrew/[type]/[id]/edit/HomebrewEditClient.tsx
 *
 * Edit page for an existing homebrew content item.
 *
 * Fetches the existing item, maps it to initialValues, and renders the
 * appropriate structured form component (AncestryForm, CommunityForm,
 * DomainCardForm, or ClassWizard) inside a WorkshopLayout -- identical
 * to the create page pattern but with pre-populated fields.
 */

import React, { useCallback, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  useHomebrewDetail,
  useUpdateHomebrew,
  useParsePreview,
  type HomebrewItemData,
} from "@/hooks/useHomebrew";
import type {
  HomebrewContentType,
  HomebrewMarkdownInput,
  AncestryData,
  CommunityData,
  DomainCard,
  ClassData,
} from "@shared/types";

import { WorkshopLayout } from "@/components/homebrew/WorkshopLayout";
import { MarkdownPreview } from "@/components/homebrew/MarkdownPreview";
import { AncestryForm } from "@/components/homebrew/AncestryForm";
import { CommunityForm } from "@/components/homebrew/CommunityForm";
import { DomainCardForm } from "@/components/homebrew/DomainCardForm";
import { ClassWizard } from "@/components/homebrew/ClassWizard";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const VALID_TYPES = new Set<string>(["class", "ancestry", "community", "domainCard"]);

function typeLabel(type: HomebrewContentType): string {
  switch (type) {
    case "class":      return "Class";
    case "ancestry":   return "Ancestry";
    case "community":  return "Community";
    case "domainCard": return "Domain Card";
  }
}

// ─── Initial-value mappers ────────────────────────────────────────────────────

function ancestryInitialValues(data: AncestryData) {
  return {
    name: data.name,
    flavorText: data.flavorText,
    traitName: data.traitName,
    traitDescription: data.traitDescription,
    secondTraitName: data.secondTraitName,
    secondTraitDescription: data.secondTraitDescription,
  };
}

function communityInitialValues(data: CommunityData) {
  return {
    name: data.name,
    flavorText: data.flavorText,
    traitName: data.traitName,
    traitDescription: data.traitDescription,
  };
}

function domainCardInitialValues(data: DomainCard) {
  return {
    name: data.name,
    domain: data.domain,
    level: data.level,
    description: data.description,
    recallCost: data.recallCost,
    isCursed: data.isCursed,
    curseText: data.curseText ?? undefined,
    isLinkedCurse: data.isLinkedCurse,
  };
}

function classInitialValues(data: ClassData) {
  return {
    name: data.name,
    domains: data.domains,
    startingHitPoints: data.startingHitPoints,
    startingEvasion: data.startingEvasion,
    hopeFeature: data.hopeFeature
      ? {
          name: data.hopeFeature.name,
          description: data.hopeFeature.description,
          cost: data.hopeFeature.hopeCost,
        }
      : undefined,
    classFeatures: data.classFeatures?.map((f) => ({
      name: f.name,
      description: f.description,
      options: f.options,
    })),
    subclasses: data.subclasses?.map((sc) => ({
      name: sc.name,
      description: sc.description,
      spellcastTrait: sc.spellcastTrait,
      foundationFeatures: sc.foundationFeatures,
      specializationFeature: sc.specializationFeature,
      masteryFeature: sc.masteryFeature,
    })),
    backgroundQuestions: data.backgroundQuestions,
    connectionQuestions: data.connectionQuestions,
    classItems: data.classItems,
    mechanicalNotes: data.mechanicalNotes,
  };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function HomebrewEditClient() {
  const { type, id } = useParams<{ type: string; id: string }>();
  const router = useRouter();

  const contentType = VALID_TYPES.has(type) ? (type as HomebrewContentType) : undefined;

  const detailQuery = useHomebrewDetail(contentType, id);
  const updateMutation = useUpdateHomebrew();
  const parseMutation = useParsePreview();

  // Preview data state
  const [previewData, setPreviewData] = useState<HomebrewItemData | null>(null);

  // ── Handle parse preview ────────────────────────────────────────────────
  const handlePreview = useCallback(
    async (input: HomebrewMarkdownInput) => {
      try {
        const result = await parseMutation.mutateAsync(input);
        setPreviewData(result.data);
      } catch {
        // Preview failures are non-fatal
      }
    },
    [parseMutation]
  );

  // ── Handle submit ───────────────────────────────────────────────────────
  const handleSubmit = useCallback(
    async (input: HomebrewMarkdownInput) => {
      if (!contentType) return;
      try {
        await updateMutation.mutateAsync({
          contentType,
          id,
          body: input,
        });
        router.push("/homebrew");
      } catch {
        // Error is displayed via updateMutation.isError
      }
    },
    [contentType, id, updateMutation, router]
  );

  // ── Invalid type guard ──────────────────────────────────────────────────
  if (!contentType) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#0a100d] px-4 text-center space-y-4">
        <h1 className="font-serif text-2xl font-semibold text-[#f7f7ff]">
          Invalid Content Type
        </h1>
        <p className="text-sm text-parchment-500">
          &ldquo;{type}&rdquo; is not a valid type.
        </p>
        <Link
          href="/homebrew"
          className="rounded-xl border border-coral-400/60 bg-coral-400/10 px-5 py-2.5 font-semibold text-base text-coral-400 hover:bg-coral-400/20 hover:border-coral-400 transition-all focus:outline-none focus:ring-2 focus:ring-coral-400"
        >
          Back to Homebrew
        </Link>
      </div>
    );
  }

  const label = typeLabel(contentType);

  // ── Derive the item name for the title ──────────────────────────────────
  const itemName =
    detailQuery.data && "name" in detailQuery.data
      ? detailQuery.data.name
      : "";

  // ── Select the correct form component with initialValues ────────────────
  const renderForm = () => {
    // Show a loading spinner while data is still being fetched
    if (detailQuery.isLoading) {
      return (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-coral-400 border-t-transparent" />
        </div>
      );
    }

    // Show an error if the fetch failed
    if (detailQuery.isError) {
      return (
        <div className="rounded-lg border border-[#fe5f55]/30 bg-[#fe5f55]/10 px-4 py-3">
          <p className="text-sm text-[#fe5f55]">
            {detailQuery.error?.message ?? "Failed to load homebrew item."}
          </p>
        </div>
      );
    }

    // Wait for data before rendering the form (so initialValues are populated)
    if (!detailQuery.data) return null;

    const formProps = {
      onSubmit: handleSubmit,
      onPreview: handlePreview,
      isSubmitting: updateMutation.isPending,
      submitLabel: "Save Changes",
    };

    switch (contentType) {
      case "ancestry":
        return (
          <AncestryForm
            {...formProps}
            initialValues={ancestryInitialValues(detailQuery.data as AncestryData)}
          />
        );
      case "community":
        return (
          <CommunityForm
            {...formProps}
            initialValues={communityInitialValues(detailQuery.data as CommunityData)}
          />
        );
      case "domainCard":
        return (
          <DomainCardForm
            {...formProps}
            initialValues={domainCardInitialValues(detailQuery.data as DomainCard)}
          />
        );
      case "class":
        return (
          <ClassWizard
            {...formProps}
            initialValues={classInitialValues(detailQuery.data as ClassData)}
          />
        );
    }
  };

  // ── Build the preview panel ─────────────────────────────────────────────
  const renderPreview = () => (
    <div className="space-y-3">
      {/* Preview loading indicator */}
      {parseMutation.isPending && (
        <div className="flex items-center gap-2 text-xs text-[#b9baa3]/40">
          <span className="h-3 w-3 animate-spin rounded-full border border-coral-400 border-t-transparent" />
          Parsing...
        </div>
      )}

      {/* Parse error */}
      {parseMutation.isError && (
        <div className="rounded-lg border border-[#fe5f55]/20 bg-[#fe5f55]/5 px-3 py-2">
          <p className="text-xs text-[#fe5f55]/80">
            Preview error: {parseMutation.error?.message ?? "Failed to parse markdown"}
          </p>
        </div>
      )}

      <MarkdownPreview
        data={previewData ?? detailQuery.data ?? null}
        contentType={contentType}
      />
    </div>
  );

  return (
    <WorkshopLayout
      title={`Edit ${label}${itemName ? `: ${itemName}` : ""}`}
      subtitle={`Update your custom ${label.toLowerCase()}.`}
      inputPanel={
        <div className="space-y-4">
          {renderForm()}

          {/* Submission error banner */}
          {updateMutation.isError && (
            <div role="alert" className="rounded-lg border border-[#fe5f55]/30 bg-[#fe5f55]/10 px-4 py-3">
              <p className="text-sm text-[#fe5f55]">
                {updateMutation.error?.message ?? "Failed to update homebrew content. Please try again."}
              </p>
            </div>
          )}
        </div>
      }
      previewPanel={renderPreview()}
      backHref="/homebrew"
    />
  );
}
