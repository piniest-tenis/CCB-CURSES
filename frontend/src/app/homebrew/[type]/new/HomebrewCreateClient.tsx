"use client";

/**
 * src/app/homebrew/[type]/new/page.tsx
 *
 * Creation form page for homebrew content. Routes to the correct form component
 * based on the `params.type` URL segment:
 *
 *   - "ancestry"    → AncestryForm
 *   - "community"   → CommunityForm
 *   - "domainCard"  → DomainCardForm
 *   - "class"       → ClassWizard
 *   - "weapon"      → WeaponForm
 *   - "armor"       → ArmorForm
 *   - "item"        → LootForm (defaultType="item")
 *   - "consumable"  → LootForm (defaultType="consumable")
 *
 * Markdown-based types use useParsePreview() for a live preview panel.
 * Equipment types use structured form input and skip the markdown preview.
 */

import React, { useCallback, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCreateHomebrew, useParsePreview } from "@/hooks/useHomebrew";
import type { HomebrewInput } from "@/hooks/useHomebrew";
import { useUnsavedChanges } from "@/hooks/useUnsavedChanges";
import type { HomebrewContentType, HomebrewMarkdownInput, HomebrewEquipmentInput } from "@shared/types";
import type { HomebrewItemData } from "@/hooks/useHomebrew";

import { WorkshopLayout } from "@/components/homebrew/WorkshopLayout";
import { MarkdownPreview, type PreviewData } from "@/components/homebrew/MarkdownPreview";
import { AncestryForm } from "@/components/homebrew/AncestryForm";
import { CommunityForm } from "@/components/homebrew/CommunityForm";
import { DomainCardForm } from "@/components/homebrew/DomainCardForm";
import { ClassWizard } from "@/components/homebrew/ClassWizard";
import { WeaponForm } from "@/components/homebrew/WeaponForm";
import { ArmorForm } from "@/components/homebrew/ArmorForm";
import { LootForm } from "@/components/homebrew/LootForm";

// ─── Valid content types ──────────────────────────────────────────────────────

const VALID_TYPES = new Set<string>([
  "class", "ancestry", "community", "domainCard",
  "weapon", "armor", "item", "consumable",
]);

/** Content types that use markdown-based parsing and the preview panel. */
const MARKDOWN_TYPES = new Set<string>(["class", "ancestry", "community", "domainCard"]);

/** Human-readable labels for each content type. */
function typeLabel(type: HomebrewContentType): string {
  switch (type) {
    case "class":      return "Class";
    case "ancestry":   return "Ancestry";
    case "community":  return "Community";
    case "domainCard": return "Domain Card";
    case "weapon":     return "Weapon";
    case "armor":      return "Armor";
    case "item":       return "Item";
    case "consumable": return "Consumable";
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function HomebrewCreateClient() {
  const { type } = useParams<{ type: string }>();
  const router = useRouter();
  const createMutation = useCreateHomebrew();
  const parseMutation = useParsePreview();
  const { markDirty, markClean } = useUnsavedChanges({
    storageKey: `hb-draft-new-${type}`,
  });

  const isMarkdownType = MARKDOWN_TYPES.has(type);

  // Preview data state (only used for markdown types)
  const [previewData, setPreviewData] = useState<HomebrewItemData | null>(null);

  // ── Handle parse preview (markdown types) ───────────────────────────────
  const handleMarkdownPreview = useCallback(
    async (input: HomebrewMarkdownInput) => {
      markDirty(input);
      try {
        const result = await parseMutation.mutateAsync(input);
        setPreviewData(result.data);
      } catch {
        // Preview failures are non-fatal — the user can still submit
      }
    },
    [parseMutation, markDirty]
  );

  // ── Handle equipment preview (equipment types) ──────────────────────────
  const handleEquipmentPreview = useCallback(
    (input: HomebrewEquipmentInput) => {
      markDirty(input);
      // Equipment types validate client-side; no server-side parse needed
    },
    [markDirty]
  );

  // ── Handle submit (all types) ───────────────────────────────────────────
  const handleSubmit = useCallback(
    async (input: HomebrewInput) => {
      try {
        await createMutation.mutateAsync(input);
        markClean();
        router.push("/homebrew");
      } catch {
        // Error is displayed via createMutation.isError
      }
    },
    [createMutation, router, markClean]
  );

  // Narrowed submit callbacks for type-safety with each form component
  const handleMarkdownSubmit = useCallback(
    (input: HomebrewMarkdownInput) => handleSubmit(input),
    [handleSubmit]
  );
  const handleEquipmentSubmit = useCallback(
    (input: HomebrewEquipmentInput) => handleSubmit(input),
    [handleSubmit]
  );

  // ── Invalid type guard ──────────────────────────────────────────────────
  if (!VALID_TYPES.has(type)) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#0a100d] px-4 text-center space-y-4">
        <div aria-hidden="true" className="text-5xl opacity-15 select-none">
          &#10060;
        </div>
        <h1 className="font-serif text-2xl font-semibold text-[#f7f7ff]">
          Invalid Content Type
        </h1>
        <p className="text-sm text-[#b9baa3]/50 max-w-sm">
          &ldquo;{type}&rdquo; is not a valid homebrew content type.
          Valid types are: class, ancestry, community, domainCard, weapon, armor, item, consumable.
        </p>
        <Link
          href="/homebrew/new"
          className="
            rounded-xl border border-coral-400/60 bg-coral-400/10
            px-5 py-2.5 font-semibold text-base text-coral-400
            hover:bg-coral-400/20 hover:border-coral-400
            transition-all
            focus:outline-none focus:ring-2 focus:ring-coral-400
            focus:ring-offset-2 focus:ring-offset-[#0a100d]
          "
        >
          &larr; Back to Content Picker
        </Link>
      </div>
    );
  }

  const contentType = type as HomebrewContentType;
  const label = typeLabel(contentType);

  // ── Select the correct form component ───────────────────────────────────
  const renderForm = () => {
    if (isMarkdownType) {
      const formProps = {
        onSubmit: handleMarkdownSubmit,
        onPreview: handleMarkdownPreview,
        isSubmitting: createMutation.isPending,
      };

      switch (contentType) {
        case "ancestry":
          return <AncestryForm {...formProps} />;
        case "community":
          return <CommunityForm {...formProps} />;
        case "domainCard":
          return <DomainCardForm {...formProps} />;
        case "class":
          return <ClassWizard {...formProps} />;
      }
    }

    // Equipment types
    const equipProps = {
      onSubmit: handleEquipmentSubmit,
      onPreview: handleEquipmentPreview,
      isSubmitting: createMutation.isPending,
    };

    switch (contentType) {
      case "weapon":
        return <WeaponForm {...equipProps} />;
      case "armor":
        return <ArmorForm {...equipProps} />;
      case "item":
        return <LootForm {...equipProps} defaultType="item" />;
      case "consumable":
        return <LootForm {...equipProps} defaultType="consumable" />;
    }
  };

  // ── Build the preview panel (markdown types only) ────────────────────────
  const renderPreview = () => {
    if (!isMarkdownType) return null;
    return (
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

        <MarkdownPreview data={previewData as PreviewData} contentType={contentType} />
      </div>
    );
  };

  return (
    <WorkshopLayout
      title={`New ${label}`}
      subtitle={`Create a custom ${label.toLowerCase()} for your Daggerheart campaigns.`}
      inputPanel={
        <div className="space-y-4">
          {renderForm()}

          {/* Submission error banner */}
          {createMutation.isError && (
            <div role="alert" className="rounded-lg border border-[#fe5f55]/30 bg-[#fe5f55]/10 px-4 py-3">
              <p className="text-sm text-[#fe5f55]">
                {createMutation.error?.message ?? "Failed to create homebrew content. Please try again."}
              </p>
            </div>
          )}
        </div>
      }
      previewPanel={renderPreview()}
      backHref="/homebrew/new"
    />
  );
}
