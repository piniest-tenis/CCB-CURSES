"use client";

/**
 * src/app/homebrew/[type]/[id]/edit/HomebrewEditClient.tsx
 *
 * Edit page for an existing homebrew content item.
 *
 * Fetches the existing item, maps it to initialValues, and renders the
 * appropriate form component inside a WorkshopLayout.
 *
 * Markdown types (class, ancestry, community, domainCard) use the preview panel.
 * Equipment types (weapon, armor, item, consumable) use structured forms without
 * a markdown preview panel.
 */

import React, { useCallback, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  useHomebrewDetail,
  useUpdateHomebrew,
  useParsePreview,
  type HomebrewItemData,
  type HomebrewInput,
} from "@/hooks/useHomebrew";
import { useUnsavedChanges } from "@/hooks/useUnsavedChanges";
import type {
  HomebrewContentType,
  HomebrewMarkdownInput,
  HomebrewEquipmentInput,
  AncestryData,
  CommunityData,
  DomainCard,
  ClassData,
  HomebrewWeaponData,
  HomebrewArmorData,
  HomebrewItemData as SharedItemData,
  HomebrewConsumableData,
} from "@shared/types";

import { WorkshopLayout } from "@/components/homebrew/WorkshopLayout";
import { MarkdownPreview, type PreviewData } from "@/components/homebrew/MarkdownPreview";
import { AncestryForm } from "@/components/homebrew/AncestryForm";
import { CommunityForm } from "@/components/homebrew/CommunityForm";
import { DomainCardForm } from "@/components/homebrew/DomainCardForm";
import { ClassWizard } from "@/components/homebrew/ClassWizard";
import { WeaponForm } from "@/components/homebrew/WeaponForm";
import { ArmorForm } from "@/components/homebrew/ArmorForm";
import { LootForm } from "@/components/homebrew/LootForm";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const VALID_TYPES = new Set<string>([
  "class", "ancestry", "community", "domainCard",
  "weapon", "armor", "item", "consumable",
]);

const MARKDOWN_TYPES = new Set<string>(["class", "ancestry", "community", "domainCard"]);

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

// ── Equipment initial-value mappers ───────────────────────────────────────────

function weaponInitialValues(data: HomebrewWeaponData) {
  return {
    name: data.name,
    tier: data.tier,
    category: data.category,
    trait: data.trait.charAt(0).toUpperCase() + data.trait.slice(1), // capitalize for display
    range: data.range,
    damageDie: data.damageDie,
    damageType: data.damageType,
    burden: data.burden,
    featureName: data.feature?.name,
    featureDescription: data.feature?.description,
  };
}

function armorInitialValues(data: HomebrewArmorData) {
  return {
    name: data.name,
    tier: data.tier,
    baseThresholdMajor: data.baseThresholds.major,
    baseThresholdSevere: data.baseThresholds.severe,
    baseArmorScore: data.baseArmorScore,
    featureName: data.feature?.name,
    featureDescription: data.feature?.description,
  };
}

function itemInitialValues(data: SharedItemData) {
  return {
    name: data.name,
    rarity: data.rarity,
    effect: data.effect,
    lootType: "item" as const,
  };
}

function consumableInitialValues(data: HomebrewConsumableData) {
  return {
    name: data.name,
    rarity: data.rarity,
    effect: data.effect,
    uses: data.uses,
    lootType: "consumable" as const,
  };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function HomebrewEditClient() {
  const { type, id } = useParams<{ type: string; id: string }>();
  const router = useRouter();

  const contentType = VALID_TYPES.has(type) ? (type as HomebrewContentType) : undefined;
  const isMarkdownType = contentType ? MARKDOWN_TYPES.has(contentType) : false;

  const detailQuery = useHomebrewDetail(contentType, id);
  const updateMutation = useUpdateHomebrew();
  const parseMutation = useParsePreview();
  const { markDirty, markClean } = useUnsavedChanges({
    storageKey: `hb-draft-edit-${type}-${id}`,
  });

  // Preview data state (markdown types only)
  const [previewData, setPreviewData] = useState<HomebrewItemData | null>(null);

  // ── Handle parse preview (markdown types) ───────────────────────────────
  const handleMarkdownPreview = useCallback(
    async (input: HomebrewMarkdownInput) => {
      markDirty(input);
      try {
        const result = await parseMutation.mutateAsync(input);
        setPreviewData(result.data);
      } catch {
        // Preview failures are non-fatal
      }
    },
    [parseMutation, markDirty]
  );

  // ── Handle equipment preview ────────────────────────────────────────────
  const handleEquipmentPreview = useCallback(
    (input: HomebrewEquipmentInput) => {
      markDirty(input);
    },
    [markDirty]
  );

  // ── Handle submit (all types) ───────────────────────────────────────────
  const handleSubmit = useCallback(
    async (input: HomebrewInput) => {
      if (!contentType) return;
      try {
        await updateMutation.mutateAsync({
          contentType,
          id,
          body: input,
        });
        markClean();
        router.push("/homebrew");
      } catch {
        // Error is displayed via updateMutation.isError
      }
    },
    [contentType, id, updateMutation, router, markClean]
  );

  // Narrowed submit callbacks for type-safety
  const handleMarkdownSubmit = useCallback(
    (input: HomebrewMarkdownInput) => handleSubmit(input),
    [handleSubmit]
  );
  const handleEquipmentSubmit = useCallback(
    (input: HomebrewEquipmentInput) => handleSubmit(input),
    [handleSubmit]
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

    if (isMarkdownType) {
      const formProps = {
        onSubmit: handleMarkdownSubmit,
        onPreview: handleMarkdownPreview,
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
    }

    // Equipment types
    const equipProps = {
      onSubmit: handleEquipmentSubmit,
      onPreview: handleEquipmentPreview,
      isSubmitting: updateMutation.isPending,
      submitLabel: "Save Changes",
    };

    switch (contentType) {
      case "weapon":
        return (
          <WeaponForm
            {...equipProps}
            initialValues={weaponInitialValues(detailQuery.data as HomebrewWeaponData)}
          />
        );
      case "armor":
        return (
          <ArmorForm
            {...equipProps}
            initialValues={armorInitialValues(detailQuery.data as HomebrewArmorData)}
          />
        );
      case "item":
        return (
          <LootForm
            {...equipProps}
            defaultType="item"
            initialValues={itemInitialValues(detailQuery.data as SharedItemData)}
          />
        );
      case "consumable":
        return (
          <LootForm
            {...equipProps}
            defaultType="consumable"
            initialValues={consumableInitialValues(detailQuery.data as HomebrewConsumableData)}
          />
        );
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

        <MarkdownPreview
          data={(previewData ?? detailQuery.data ?? null) as PreviewData}
          contentType={contentType}
        />
      </div>
    );
  };

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
