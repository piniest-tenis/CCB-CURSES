"use client";

/**
 * src/app/homebrew/frames/[id]/FrameDetailClient.tsx
 *
 * Campaign Frame Detail Page — redesigned with magazine-style layout,
 * inline editing for all metadata, and fully wired add/update/remove
 * hooks for contents, restrictions, and extensions.
 *
 * Layout:
 *   - Hero header with inline-editable title, author, pitch
 *   - Sidebar-style metadata panel (tone, overview, themes, touchstones)
 *   - Tabbed content sections with functional add forms
 *   - Owner actions (delete) in a discreet toolbar
 */

import React, {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { AppHeader } from "@/components/AppHeader";
import { Footer } from "@/components/Footer";
import {
  useFrameDetail,
  useUpdateFrame,
  useDeleteFrame,
  useAddFrameContent,
  useAddFrameRestriction,
  useAddFrameExtension,
  useRemoveFrameContent,
  useRemoveFrameRestriction,
  useRemoveFrameExtension,
  useUpdateFrameRestriction,
  useUpdateFrameExtension,
} from "@/hooks/useFrames";
import { useHomebrewList } from "@/hooks/useHomebrew";
import type {
  CampaignFrameDetail,
  FrameContentRef,
  FrameRestriction,
  FrameExtension,
  FrameComplexityRating,
  HomebrewContentType,
  HomebrewSummary,
  FrameRestrictableContentType,
  FrameExtensionType,
  UpdateCampaignFrameInput,
} from "@shared/types";

// ─── SVG Icons ───────────────────────────────────────────────────────────────

function ChevronLeftIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M10 12L6 8l4-4" />
    </svg>
  );
}

function XIcon({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 14 14"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M3 3l8 8M11 3l-8 8" />
    </svg>
  );
}

function PencilIcon({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M11.5 1.5l3 3L5 14H2v-3L11.5 1.5z" />
    </svg>
  );
}

function CheckIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 8.5l3.5 3.5L13 4" />
    </svg>
  );
}

function PlusIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M8 3v10M3 8h10" />
    </svg>
  );
}

function TrashIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M2 4h12M5.333 4V2.667a1.333 1.333 0 011.334-1.334h2.666a1.333 1.333 0 011.334 1.334V4m2 0v9.333a1.333 1.333 0 01-1.334 1.334H4.667a1.333 1.333 0 01-1.334-1.334V4h9.334z" />
    </svg>
  );
}

// ─── Constants ────────────────────────────────────────────────────────────────

type SectionId =
  | "identity"
  | "characterOptions"
  | "powersDomains"
  | "equipmentForge"
  | "worldRules";

interface WorkSection {
  id: SectionId;
  label: string;
  description: string;
  srdHint: string;
  /** Which homebrew content types belong in this section */
  contentTypes: HomebrewContentType[];
  /** Which restrictable content types belong in this section */
  restrictionTypes: FrameRestrictableContentType[];
  /** Which extension types belong in this section */
  extensionTypes: FrameExtensionType[];
}

const WORK_SECTIONS: WorkSection[] = [
  {
    id: "characterOptions",
    label: "Character Options",
    description: "Classes, ancestries, and communities available to players",
    srdHint:
      "Ancestry features must be physical and/or biological in nature. For communities, use the test: \"I'm from this community, so of course I know how to do this.\"",
    contentTypes: ["class", "ancestry", "community"],
    restrictionTypes: ["class", "ancestry", "community"],
    extensionTypes: [],
  },
  {
    id: "powersDomains",
    label: "Powers & Domains",
    description: "Domain cards and custom domain definitions",
    srdHint:
      "Creating a new domain is one of the most ambitious tasks for a designer. Refer to the Rule of Six and Twelve for class balance.",
    contentTypes: ["domainCard"],
    restrictionTypes: ["domainCard"],
    extensionTypes: ["domain"],
  },
  {
    id: "equipmentForge",
    label: "Equipment Forge",
    description: "Custom weapons, armor, items, and consumables",
    srdHint:
      "Daggerheart isn't designed to be driven by loot. Keep equipment focused on enabling interesting choices rather than raw power.",
    contentTypes: ["weapon", "armor", "item", "consumable"],
    restrictionTypes: [],
    extensionTypes: [],
  },
  {
    id: "worldRules",
    label: "World Rules",
    description: "Custom conditions, damage types, and mechanical additions",
    srdHint:
      "Streamline, then streamline again. If a rule doesn't fit in the space allotted, it's probably not right for Daggerheart. Limit the cognitive load.",
    contentTypes: [],
    restrictionTypes: [],
    extensionTypes: ["condition", "damageType", "houseRule"],
  },
];

const COMPLEXITY_OPTIONS: { value: FrameComplexityRating; label: string }[] = [
  { value: "low", label: "Low" },
  { value: "moderate", label: "Moderate" },
  { value: "high", label: "High" },
  { value: "extreme", label: "Extreme" },
];

const COMPLEXITY_STYLES: Record<
  FrameComplexityRating,
  { bg: string; text: string; border: string }
> = {
  low: {
    bg: "bg-green-500/10",
    text: "text-green-400",
    border: "border-green-500/30",
  },
  moderate: {
    bg: "bg-yellow-500/10",
    text: "text-yellow-400",
    border: "border-yellow-500/30",
  },
  high: {
    bg: "bg-orange-500/10",
    text: "text-orange-400",
    border: "border-orange-500/30",
  },
  extreme: {
    bg: "bg-[#fe5f55]/10",
    text: "text-[#fe5f55]",
    border: "border-[#fe5f55]/30",
  },
};

const CONTENT_TYPE_STYLES: Record<string, string> = {
  class: "bg-[#577399]/15 text-[#577399] border-[#577399]/30",
  ancestry: "bg-purple-500/15 text-purple-400 border-purple-500/30",
  community: "bg-teal-500/15 text-teal-400 border-teal-500/30",
  domainCard: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  weapon: "bg-red-500/15 text-red-400 border-red-500/30",
  armor: "bg-slate-500/15 text-slate-400 border-slate-500/30",
  item: "bg-green-500/15 text-green-400 border-green-500/30",
  consumable: "bg-pink-500/15 text-pink-400 border-pink-500/30",
};

const EXTENSION_TYPE_STYLES: Record<string, string> = {
  damageType: "bg-[#fe5f55]/15 text-[#fe5f55] border-[#fe5f55]/30",
  adversaryType: "bg-purple-500/15 text-purple-400 border-purple-500/30",
  condition: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  domain: "bg-[#577399]/15 text-[#577399] border-[#577399]/30",
  houseRule: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
};

const HOMEBREW_CONTENT_TYPES: {
  value: HomebrewContentType;
  label: string;
}[] = [
  { value: "class", label: "Class" },
  { value: "ancestry", label: "Ancestry" },
  { value: "community", label: "Community" },
  { value: "domainCard", label: "Domain Card" },
  { value: "weapon", label: "Weapon" },
  { value: "armor", label: "Armor" },
  { value: "item", label: "Item" },
  { value: "consumable", label: "Consumable" },
];

const RESTRICTABLE_CONTENT_TYPES: {
  value: FrameRestrictableContentType;
  label: string;
}[] = [
  { value: "class", label: "Class" },
  { value: "ancestry", label: "Ancestry" },
  { value: "community", label: "Community" },
  { value: "domainCard", label: "Domain Card" },
];

const EXTENSION_TYPES: { value: FrameExtensionType; label: string }[] = [
  { value: "damageType", label: "Damage Type" },
  { value: "adversaryType", label: "Adversary Type" },
  { value: "condition", label: "Condition" },
  { value: "domain", label: "Domain" },
  { value: "houseRule", label: "House Rule" },
];

const MAX_NAME_LENGTH = 100;
const MAX_AUTHOR_LENGTH = 100;
const MAX_PITCH_LENGTH = 200;
const MAX_TONE_LENGTH = 500;
const MAX_OVERVIEW_LENGTH = 2000;
const MAX_TAGS = 10;
const MAX_THEME_LENGTH = 30;
const MAX_TOUCHSTONE_LENGTH = 50;
const MAX_HOUSE_RULE_DESC_LENGTH = 1200;

// SRD known items per restrictable content type (for the AddRestrictionForm checklist)
const SRD_ITEMS: Record<FrameRestrictableContentType, string[]> = {
  class: [
    "Bard",
    "Druid",
    "Guardian",
    "Ranger",
    "Rogue",
    "Seraph",
    "Sorcerer",
    "Warrior",
    "Wizard",
  ],
  ancestry: [
    "Clank",
    "Daemon",
    "Dwarf",
    "Elf",
    "Faun",
    "Fungril",
    "Galapa",
    "Giant",
    "Goblin",
    "Halfling",
    "Human",
    "Infernis",
    "Katari",
    "Orcs",
    "Ribbet",
    "Simiah",
  ],
  community: [
    "Loreborne",
    "Orderborne",
    "Ridgeborne",
    "Seaborne",
    "Slyborne",
    "Underborne",
    "Wanderborne",
    "Wildborne",
  ],
  domainCard: [
    "Arcana",
    "Blade",
    "Bone",
    "Codex",
    "Grace",
    "Midnight",
    "Sage",
    "Splendor",
    "Valor",
  ],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

function formatContentType(type: string): string {
  switch (type) {
    case "domainCard":
      return "Domain Card";
    case "damageType":
      return "Damage Type";
    case "adversaryType":
      return "Adversary Type";
    default:
      return type.charAt(0).toUpperCase() + type.slice(1);
  }
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// ─── Shared Input Class ──────────────────────────────────────────────────────

const inputClassName =
  "w-full rounded-lg border border-[#577399]/30 bg-[#0a100d] px-3 py-2 text-sm text-[#f7f7ff] placeholder-parchment-600 focus:border-[#577399] focus:outline-none focus:ring-1 focus:ring-[#577399] transition-colors";

const selectClassName =
  "w-full rounded-lg border border-[#577399]/30 bg-[#0a100d] px-3 py-2 text-sm text-[#f7f7ff] focus:border-[#577399] focus:outline-none focus:ring-1 focus:ring-[#577399] transition-colors appearance-none cursor-pointer";

// ─── Inline Editable Text ────────────────────────────────────────────────────

/**
 * A text field that displays as read-only and switches to an input on click.
 * Saves on blur or Enter, cancels on Escape.
 */
function InlineEditableText({
  value,
  onSave,
  placeholder,
  isOwner,
  isPending,
  className = "",
  inputClassName: inputCls = "",
  as: Tag = "span",
  maxLength,
  multiline = false,
}: {
  value: string;
  onSave: (val: string) => void;
  placeholder: string;
  isOwner: boolean;
  isPending: boolean;
  className?: string;
  inputClassName?: string;
  as?: "span" | "h1" | "p";
  maxLength?: number;
  multiline?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      // select all text on focus
      inputRef.current?.select();
    }
  }, [editing]);

  const save = () => {
    const trimmed = draft.trim();
    if (trimmed !== value) {
      onSave(trimmed);
    }
    setEditing(false);
  };

  const cancel = () => {
    setDraft(value);
    setEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      cancel();
    }
    if (e.key === "Enter" && !multiline) {
      e.preventDefault();
      save();
    }
    // For multiline, Ctrl/Cmd+Enter saves
    if (e.key === "Enter" && multiline && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      save();
    }
  };

  if (!isOwner) {
    return (
      <Tag className={className}>
        {value || (
          <span className="text-parchment-600">{placeholder}</span>
        )}
      </Tag>
    );
  }

  if (editing) {
    const sharedProps = {
      ref: inputRef as React.RefObject<HTMLInputElement & HTMLTextAreaElement>,
      value: draft,
      onChange: (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
      ) => setDraft(e.target.value),
      onBlur: save,
      onKeyDown: handleKeyDown,
      maxLength,
      disabled: isPending,
      className: `${inputCls || inputClassName} ${className}`,
      "aria-label": placeholder,
    };

    const nearLimit =
      maxLength != null && draft.length >= Math.floor(maxLength * 0.9);

    const counter =
      maxLength != null ? (
        <p
          className={`mt-0.5 text-xs text-right ${nearLimit ? "text-[#fe5f55]" : "text-parchment-500"}`}
        >
          {draft.length}/{maxLength}
        </p>
      ) : null;

    if (multiline) {
      return (
        <div>
          <textarea
            {...sharedProps}
            ref={inputRef as React.RefObject<HTMLTextAreaElement>}
            rows={3}
            className={`${sharedProps.className} resize-none`}
          />
          {counter}
        </div>
      );
    }

    return (
      <div>
        <input
          {...sharedProps}
          ref={inputRef as React.RefObject<HTMLInputElement>}
          type="text"
        />
        {counter}
      </div>
    );
  }

  return (
    <Tag
      className={`${className} group/edit cursor-pointer rounded-md transition-colors hover:bg-[#577399]/10`}
      onClick={() => setEditing(true)}
      onKeyDown={(e: React.KeyboardEvent) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          setEditing(true);
        }
      }}
      tabIndex={0}
      role="button"
      aria-label={`Edit ${placeholder}`}
    >
      {value || (
        <span className="text-parchment-600">{placeholder}</span>
      )}
      <PencilIcon className="ml-2 inline h-3 w-3 text-parchment-600 opacity-0 group-hover/edit:opacity-100 transition-opacity" />
    </Tag>
  );
}

// ─── Complexity Badge ─────────────────────────────────────────────────────────

function ComplexityBadge({
  complexity,
}: {
  complexity: FrameComplexityRating;
}) {
  const style = COMPLEXITY_STYLES[complexity];
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize ${style.bg} ${style.text} ${style.border}`}
    >
      {complexity}
    </span>
  );
}

// ─── Editable Complexity ──────────────────────────────────────────────────────

function EditableComplexity({
  value,
  isOwner,
  isPending,
  onSave,
}: {
  value: FrameComplexityRating | null;
  isOwner: boolean;
  isPending: boolean;
  onSave: (val: FrameComplexityRating | null) => void;
}) {
  const [editing, setEditing] = useState(false);

  if (!isOwner) {
    return value ? <ComplexityBadge complexity={value} /> : null;
  }

  if (editing) {
    return (
      <select
        value={value ?? ""}
        onChange={(e) => {
          const v = e.target.value as FrameComplexityRating | "";
          onSave(v || null);
          setEditing(false);
        }}
        onBlur={() => setEditing(false)}
        disabled={isPending}
        autoFocus
        className={`${selectClassName} w-auto text-xs py-1 px-2`}
        aria-label="Select complexity"
      >
        <option value="">No complexity</option>
        {COMPLEXITY_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className="group/badge flex items-center gap-1 transition-colors"
      aria-label="Edit complexity rating"
    >
      {value ? (
        <ComplexityBadge complexity={value} />
      ) : (
        <span className="inline-flex items-center rounded-full border border-dashed border-[#577399]/30 px-2.5 py-0.5 text-xs text-parchment-600 hover:border-[#577399]/50 hover:text-parchment-500 transition-colors">
          Set complexity
        </span>
      )}
      <PencilIcon className="h-2.5 w-2.5 text-parchment-600 opacity-0 group-hover/badge:opacity-100 transition-opacity" />
    </button>
  );
}

// ─── Tag Editor ───────────────────────────────────────────────────────────────

function TagEditor({
  tags,
  onSave,
  isOwner,
  isPending,
  label,
  placeholder,
  tagStyle = "bg-[#577399]/15 text-[#577399] border-[#577399]/25",
  maxTagLength,
  truncatePills = false,
}: {
  tags: string[];
  onSave: (tags: string[]) => void;
  isOwner: boolean;
  isPending: boolean;
  label: string;
  placeholder: string;
  tagStyle?: string;
  maxTagLength?: number;
  truncatePills?: boolean;
}) {
  const [inputValue, setInputValue] = useState("");
  const inputId = useId();

  const addTag = () => {
    const tag = inputValue.trim();
    if (
      tag.length > 0 &&
      tags.length < MAX_TAGS &&
      !tags.some((t) => t.toLowerCase() === tag.toLowerCase()) &&
      (!maxTagLength || tag.length <= maxTagLength)
    ) {
      onSave([...tags, tag]);
      setInputValue("");
    }
  };

  const removeTag = (index: number) => {
    onSave(tags.filter((_, i) => i !== index));
  };

  const inputTooLong =
    maxTagLength != null && inputValue.trim().length > maxTagLength;

  return (
    <div>
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5" role="list" aria-label={label}>
          {tags.map((tag, i) => (
            <span
              key={`${tag}-${i}`}
              role="listitem"
              className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${tagStyle}`}
              title={truncatePills ? tag : undefined}
            >
              <span
                className={
                  truncatePills
                    ? "max-w-[125px] overflow-hidden text-ellipsis whitespace-nowrap block"
                    : undefined
                }
              >
                {tag}
              </span>
              {isOwner && (
                <button
                  type="button"
                  onClick={() => removeTag(i)}
                  disabled={isPending}
                  className="ml-1 rounded-full p-0.5 hover:bg-white/10 transition-colors focus:outline-none focus:ring-1 focus:ring-[#577399]"
                  aria-label={`Remove ${label.toLowerCase()}: ${tag}`}
                >
                  <XIcon className="h-2.5 w-2.5" />
                </button>
              )}
            </span>
          ))}
        </div>
      )}
      {isOwner && tags.length < MAX_TAGS && (
        <div className="mt-2 space-y-1">
          <div className="flex gap-2">
            <input
              id={inputId}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addTag();
                }
              }}
              placeholder={placeholder}
              disabled={isPending}
              maxLength={maxTagLength}
              className={`${inputClassName} flex-1 text-sm py-1.5 ${inputTooLong ? "border-[#fe5f55] focus:ring-[#fe5f55]" : ""}`}
              aria-label={`Add ${label.toLowerCase()}`}
            />
            <button
              type="button"
              onClick={addTag}
              disabled={isPending || inputValue.trim().length === 0 || inputTooLong}
              className="rounded-lg px-3 py-1.5 text-sm font-medium bg-[#577399]/20 text-[#577399] hover:bg-[#577399]/30 disabled:opacity-40 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-1 focus:ring-[#577399]"
            >
              Add
            </button>
          </div>
          {maxTagLength != null && inputValue.length > 0 && (
            <p
              className={`text-xs text-right ${
                inputTooLong ? "text-[#fe5f55]" : "text-parchment-500"
              }`}
            >
              {inputValue.trim().length}/{maxTagLength}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Type Badge ───────────────────────────────────────────────────────────────

function TypeBadge({
  type,
  styleMap,
}: {
  type: string;
  styleMap: Record<string, string>;
}) {
  const style =
    styleMap[type] ?? "bg-slate-500/15 text-slate-400 border-slate-500/30";
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${style}`}
    >
      {formatContentType(type)}
    </span>
  );
}

// ─── Remove Button ────────────────────────────────────────────────────────────

function RemoveButton({
  label,
  onClick,
  isPending,
}: {
  label: string;
  onClick: () => void;
  isPending: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isPending}
      aria-label={label}
      className="ml-auto shrink-0 h-7 w-7 rounded-md flex items-center justify-center text-parchment-600 hover:text-[#fe5f55] hover:bg-[#fe5f55]/10 disabled:opacity-30 transition-colors focus:outline-none focus:ring-2 focus:ring-[#fe5f55]"
    >
      <XIcon className="h-3.5 w-3.5" />
    </button>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState({
  message,
  action,
}: {
  message: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-10 gap-3">
      <p className="text-sm text-parchment-600">{message}</p>
      {action}
    </div>
  );
}

// ─── Content Row ──────────────────────────────────────────────────────────────

function ContentRow({
  item,
  onRemove,
  isRemoving,
  isOwner,
}: {
  item: FrameContentRef;
  onRemove: () => void;
  isRemoving: boolean;
  isOwner: boolean;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-slate-700/30 bg-slate-800/30 px-4 py-3 transition-colors hover:bg-slate-800/50">
      <TypeBadge type={item.contentType} styleMap={CONTENT_TYPE_STYLES} />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-[#f7f7ff] truncate">
          {item.name}
        </p>
        <p className="text-sm text-parchment-600">
          Added {formatDate(item.addedAt)}
        </p>
      </div>
      {isOwner && (
        <RemoveButton
          label={`Remove ${item.name} from contents`}
          onClick={onRemove}
          isPending={isRemoving}
        />
      )}
    </div>
  );
}

// ─── Restriction Row ──────────────────────────────────────────────────────────

function RestrictionRow({
  item,
  onRemove,
  onUpdate,
  isRemoving,
  isUpdating,
  isOwner,
}: {
  item: FrameRestriction;
  onRemove: () => void;
  onUpdate: (update: {
    mode?: "restricted" | "altered";
    alterationNotes?: string;
  }) => void;
  isRemoving: boolean;
  isUpdating: boolean;
  isOwner: boolean;
}) {
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesDraft, setNotesDraft] = useState(
    item.alterationNotes ?? "",
  );
  const notesRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setNotesDraft(item.alterationNotes ?? "");
  }, [item.alterationNotes]);

  useEffect(() => {
    if (editingNotes) notesRef.current?.focus();
  }, [editingNotes]);

  const modeStyle =
    item.mode === "restricted"
      ? "bg-[#fe5f55]/10 text-[#fe5f55] border-[#fe5f55]/30"
      : "bg-yellow-500/10 text-yellow-400 border-yellow-500/30";

  return (
    <div className="rounded-lg border border-slate-700/30 bg-slate-800/30 px-4 py-3 transition-colors hover:bg-slate-800/50">
      <div className="flex items-center gap-3">
        <TypeBadge type={item.contentType} styleMap={CONTENT_TYPE_STYLES} />
        <p className="text-sm font-medium text-[#f7f7ff] truncate flex-1 min-w-0">
          {item.name}
        </p>
        {isOwner ? (
          <select
            value={item.mode}
            onChange={(e) =>
              onUpdate({
                mode: e.target.value as "restricted" | "altered",
              })
            }
            disabled={isUpdating}
            className={`shrink-0 rounded-full border px-2 py-0.5 text-xs font-semibold capitalize cursor-pointer bg-transparent ${modeStyle} focus:outline-none focus:ring-1 focus:ring-[#577399]`}
            aria-label={`Change restriction mode for ${item.name}`}
          >
            <option value="restricted">Restricted</option>
            <option value="altered">Altered</option>
          </select>
        ) : (
          <span
            className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold capitalize ${modeStyle}`}
          >
            {item.mode}
          </span>
        )}
        {isOwner && (
          <RemoveButton
            label={`Remove ${item.name} restriction`}
            onClick={onRemove}
            isPending={isRemoving}
          />
        )}
      </div>
      {/* Alteration notes */}
      {item.mode === "altered" && (
        <div className="mt-2 ml-1 border-l-2 border-yellow-500/30 pl-3">
          {editingNotes && isOwner ? (
            <div className="space-y-2">
              <textarea
                ref={notesRef}
                value={notesDraft}
                onChange={(e) => setNotesDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    setNotesDraft(item.alterationNotes ?? "");
                    setEditingNotes(false);
                  }
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                    e.preventDefault();
                    onUpdate({ alterationNotes: notesDraft.trim() });
                    setEditingNotes(false);
                  }
                }}
                rows={2}
                disabled={isUpdating}
                placeholder="Describe the alterations..."
                className={`${inputClassName} text-sm resize-none`}
                aria-label="Alteration notes"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onUpdate({ alterationNotes: notesDraft.trim() });
                    setEditingNotes(false);
                  }}
                  disabled={isUpdating}
                  className="rounded px-2 py-1 text-sm font-medium bg-[#577399]/20 text-[#577399] hover:bg-[#577399]/30 transition-colors disabled:opacity-40"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setNotesDraft(item.alterationNotes ?? "");
                    setEditingNotes(false);
                  }}
                  className="rounded px-2 py-1 text-sm text-parchment-600 hover:text-[#b9baa3] transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <p
              className={`text-sm text-[#b9baa3] ${isOwner ? "cursor-pointer hover:text-[#b9baa3] transition-colors" : ""}`}
              onClick={isOwner ? () => setEditingNotes(true) : undefined}
              role={isOwner ? "button" : undefined}
              tabIndex={isOwner ? 0 : undefined}
              onKeyDown={
                isOwner
                  ? (e: React.KeyboardEvent) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setEditingNotes(true);
                      }
                    }
                  : undefined
              }
              aria-label={
                isOwner ? "Click to edit alteration notes" : undefined
              }
            >
              {item.alterationNotes || (
                <span className="text-parchment-600">
                  {isOwner
                    ? "Click to add alteration notes..."
                    : "No alteration notes."}
                </span>
              )}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Extension Row ────────────────────────────────────────────────────────────

function ExtensionRow({
  item,
  onRemove,
  onUpdate,
  isRemoving,
  isUpdating,
  isOwner,
}: {
  item: FrameExtension;
  onRemove: () => void;
  onUpdate: (update: { name?: string; description?: string }) => void;
  isRemoving: boolean;
  isUpdating: boolean;
  isOwner: boolean;
}) {
  const [editingDesc, setEditingDesc] = useState(false);
  const [descDraft, setDescDraft] = useState(item.description ?? "");
  const descRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setDescDraft(item.description ?? "");
  }, [item.description]);

  useEffect(() => {
    if (editingDesc) descRef.current?.focus();
  }, [editingDesc]);

  return (
    <div className="rounded-lg border border-slate-700/30 bg-slate-800/30 px-4 py-3 transition-colors hover:bg-slate-800/50">
      <div className="flex items-center gap-3">
        <TypeBadge
          type={item.extensionType}
          styleMap={EXTENSION_TYPE_STYLES}
        />
        <p className="text-sm font-medium text-[#f7f7ff] truncate flex-1 min-w-0">
          {item.name}
        </p>
        {isOwner && (
          <RemoveButton
            label={`Remove ${item.name} extension`}
            onClick={onRemove}
            isPending={isRemoving}
          />
        )}
      </div>
      {/* Description */}
      <div className="mt-2">
        {editingDesc && isOwner ? (
          <div className="space-y-2">
            <textarea
              ref={descRef}
              value={descDraft}
              onChange={(e) => setDescDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  setDescDraft(item.description ?? "");
                  setEditingDesc(false);
                }
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  onUpdate({ description: descDraft.trim() || undefined });
                  setEditingDesc(false);
                }
              }}
              rows={2}
              disabled={isUpdating}
              placeholder="Optional description..."
              className={`${inputClassName} text-sm resize-none`}
              aria-label="Extension description"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  onUpdate({
                    description: descDraft.trim() || undefined,
                  });
                  setEditingDesc(false);
                }}
                disabled={isUpdating}
                className="rounded px-2 py-1 text-sm font-medium bg-[#577399]/20 text-[#577399] hover:bg-[#577399]/30 transition-colors disabled:opacity-40"
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => {
                  setDescDraft(item.description ?? "");
                  setEditingDesc(false);
                }}
                className="rounded px-2 py-1 text-sm text-parchment-600 hover:text-[#b9baa3] transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : item.description || isOwner ? (
          <p
            className={`text-sm text-[#b9baa3] ${isOwner ? "cursor-pointer hover:text-[#b9baa3] transition-colors" : ""}`}
            onClick={isOwner ? () => setEditingDesc(true) : undefined}
            role={isOwner ? "button" : undefined}
            tabIndex={isOwner ? 0 : undefined}
            onKeyDown={
              isOwner
                ? (e: React.KeyboardEvent) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setEditingDesc(true);
                    }
                  }
                : undefined
            }
            aria-label={
              isOwner ? "Click to edit extension description" : undefined
            }
          >
            {item.description || (
              <span className="text-parchment-600">
                Click to add a description...
              </span>
            )}
          </p>
        ) : null}
      </div>
    </div>
  );
}

// ─── Add Content Form ─────────────────────────────────────────────────────────

function AddContentForm({
  frameId,
  onClose,
  allowedTypes,
}: {
  frameId: string;
  onClose: () => void;
  allowedTypes: HomebrewContentType[];
}) {
  const addMutation = useAddFrameContent(frameId);
  const { data: homebrewList, isLoading: isLoadingHomebrew } = useHomebrewList();

  // Filter the user's homebrew to only types allowed in this section
  const filteredHomebrew: HomebrewSummary[] = (homebrewList ?? []).filter((h) =>
    allowedTypes.includes(h.contentType as HomebrewContentType),
  );

  const [selectedId, setSelectedId] = useState<string>("__other__");
  const [otherName, setOtherName] = useState("");
  const [contentType, setContentType] = useState<HomebrewContentType>(
    allowedTypes[0] ?? "class",
  );

  // Derive content type from selection when picking existing homebrew
  const selectedHomebrew = filteredHomebrew.find(
    (h) => `${h.contentType}::${h.slug}` === selectedId,
  );

  const effectiveContentType: HomebrewContentType =
    selectedHomebrew
      ? (selectedHomebrew.contentType as HomebrewContentType)
      : contentType;
  const effectiveName =
    selectedHomebrew ? selectedHomebrew.name : otherName.trim();
  const effectiveId = selectedHomebrew
    ? selectedHomebrew.slug
    : slugify(otherName.trim());

  const canSubmit =
    effectiveName.length > 0 && effectiveId.length > 0 && !addMutation.isPending;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    addMutation.mutate(
      {
        contentType: effectiveContentType,
        contentId: effectiveId,
        name: effectiveName,
      },
      {
        onSuccess: () => {
          setSelectedId("__other__");
          setOtherName("");
          onClose();
        },
      },
    );
  };

  const filteredTypes = HOMEBREW_CONTENT_TYPES.filter((t) =>
    allowedTypes.includes(t.value),
  );

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-lg border border-[#577399]/30 bg-[#0a100d]/80 p-4 space-y-3"
    >
      <h3 className="text-sm font-semibold text-[#f7f7ff]">
        Add Homebrew Content
      </h3>

      {/* Picker: existing homebrew or Other */}
      <div>
        <label className="block text-sm text-parchment-500 mb-1">
          Select from your homebrew
        </label>
        {isLoadingHomebrew ? (
          <p className="text-sm text-parchment-500">Loading your homebrew…</p>
        ) : (
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className={selectClassName}
            aria-label="Select homebrew item"
          >
            {filteredHomebrew.length === 0 && (
              <option value="__other__">No matching homebrew found — enter name below</option>
            )}
            {filteredHomebrew.map((h) => (
              <option key={`${h.contentType}::${h.slug}`} value={`${h.contentType}::${h.slug}`}>
                {h.name} ({formatContentType(h.contentType)})
              </option>
            ))}
            <option value="__other__">Other (enter name below)…</option>
          </select>
        )}
      </div>

      {/* "Other" fallback: manual type + name */}
      {selectedId === "__other__" && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {filteredTypes.length > 1 && (
            <div>
              <label className="block text-sm text-parchment-500 mb-1">
                Content Type
              </label>
              <select
                value={contentType}
                onChange={(e) =>
                  setContentType(e.target.value as HomebrewContentType)
                }
                className={selectClassName}
                aria-label="Content type"
              >
                {filteredTypes.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="block text-sm text-parchment-500 mb-1">
              Name
            </label>
            <input
              type="text"
              value={otherName}
              onChange={(e) => setOtherName(e.target.value)}
              placeholder={`e.g. ${contentType === "weapon" ? "Moonblade" : contentType === "armor" ? "Shadowmail" : "Shadow Weaver"}`}
              className={inputClassName}
              aria-label="Content name"
            />
          </div>
        </div>
      )}

      {addMutation.isError && (
        <p role="alert" className="text-sm text-[#fe5f55]">
          {(addMutation.error as Error)?.message ?? "Failed to add content."}
        </p>
      )}
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg px-3 py-1.5 text-sm text-parchment-500 hover:text-[#b9baa3] transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!canSubmit}
          className="rounded-lg px-4 py-1.5 text-sm font-semibold bg-[#577399] text-[#f7f7ff] hover:bg-[#577399]/80 disabled:opacity-40 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-[#577399]"
        >
          {addMutation.isPending ? "Adding..." : "Add Content"}
        </button>
      </div>
    </form>
  );
}

// ─── Add Restriction Form ─────────────────────────────────────────────────────

function AddRestrictionForm({
  frameId,
  onClose,
  allowedTypes,
}: {
  frameId: string;
  onClose: () => void;
  allowedTypes: FrameRestrictableContentType[];
}) {
  const addMutation = useAddFrameRestriction(frameId);
  const filteredTypes = RESTRICTABLE_CONTENT_TYPES.filter((t) =>
    allowedTypes.includes(t.value),
  );
  const [contentType, setContentType] =
    useState<FrameRestrictableContentType>(
      filteredTypes[0]?.value ?? "class",
    );
  const [selectedName, setSelectedName] = useState<string>("");
  const [otherName, setOtherName] = useState("");
  const [mode, setMode] = useState<"restricted" | "altered">("restricted");
  const [alterationNotes, setAlterationNotes] = useState("");

  // When content type changes, reset selection
  const handleContentTypeChange = (t: FrameRestrictableContentType) => {
    setContentType(t);
    setSelectedName("");
    setOtherName("");
  };

  const srdItems = SRD_ITEMS[contentType] ?? [];
  const effectiveName =
    selectedName === "__other__" ? otherName.trim() : selectedName;

  const canSubmit = effectiveName.length > 0 && !addMutation.isPending;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    addMutation.mutate(
      {
        contentType,
        contentId: slugify(effectiveName),
        name: effectiveName,
        mode,
        ...(mode === "altered" && alterationNotes.trim()
          ? { alterationNotes: alterationNotes.trim() }
          : {}),
      },
      {
        onSuccess: () => {
          setSelectedName("");
          setOtherName("");
          setAlterationNotes("");
          onClose();
        },
      },
    );
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-lg border border-[#577399]/30 bg-[#0a100d]/80 p-4 space-y-3"
    >
      <h3 className="text-sm font-semibold text-[#f7f7ff]">
        Add SRD Restriction
      </h3>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {/* Content type selector */}
        {filteredTypes.length > 1 && (
          <div>
            <label className="block text-sm text-parchment-500 mb-1">
              Content Type
            </label>
            <select
              value={contentType}
              onChange={(e) =>
                handleContentTypeChange(e.target.value as FrameRestrictableContentType)
              }
              className={selectClassName}
              aria-label="Content type"
            >
              {filteredTypes.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Mode selector */}
        <div>
          <label className="block text-sm text-parchment-500 mb-1">
            Mode
          </label>
          <select
            value={mode}
            onChange={(e) =>
              setMode(e.target.value as "restricted" | "altered")
            }
            className={selectClassName}
            aria-label="Restriction mode"
          >
            <option value="restricted">Restricted (removed)</option>
            <option value="altered">Altered (modified)</option>
          </select>
        </div>
      </div>

      {/* SRD item checklist */}
      <div>
        <label className="block text-sm text-parchment-500 mb-2">
          Select {formatContentType(contentType)}
        </label>
        <div className="flex flex-wrap gap-2">
          {srdItems.map((item) => {
            const checked = selectedName === item;
            return (
              <button
                key={item}
                type="button"
                onClick={() => setSelectedName(checked ? "" : item)}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors focus:outline-none focus:ring-1 focus:ring-[#577399] ${
                  checked
                    ? "bg-[#577399] text-[#f7f7ff] border-[#577399]"
                    : "border-[#577399]/30 text-parchment-500 hover:border-[#577399]/60 hover:text-[#b9baa3]"
                }`}
                aria-pressed={checked}
              >
                {item}
              </button>
            );
          })}
          {/* Other option */}
          <button
            type="button"
            onClick={() =>
              setSelectedName(selectedName === "__other__" ? "" : "__other__")
            }
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors focus:outline-none focus:ring-1 focus:ring-[#577399] ${
              selectedName === "__other__"
                ? "bg-[#577399] text-[#f7f7ff] border-[#577399]"
                : "border-[#577399]/30 text-parchment-500 hover:border-[#577399]/60 hover:text-[#b9baa3]"
            }`}
            aria-pressed={selectedName === "__other__"}
          >
            Other…
          </button>
        </div>
      </div>

      {/* "Other" name input */}
      {selectedName === "__other__" && (
        <div>
          <label className="block text-sm text-parchment-500 mb-1">
            Name
          </label>
          <input
            type="text"
            value={otherName}
            onChange={(e) => setOtherName(e.target.value)}
            placeholder={`Enter ${formatContentType(contentType)} name`}
            className={inputClassName}
            aria-label="Custom content name"
          />
        </div>
      )}

      {mode === "altered" && (
        <div>
          <label className="block text-sm text-parchment-500 mb-1">
            Alteration Notes (optional)
          </label>
          <textarea
            value={alterationNotes}
            onChange={(e) => setAlterationNotes(e.target.value)}
            rows={2}
            placeholder="Describe how this content is altered..."
            className={`${inputClassName} resize-none`}
            aria-label="Alteration notes"
          />
        </div>
      )}
      {addMutation.isError && (
        <p role="alert" className="text-sm text-[#fe5f55]">
          {(addMutation.error as Error)?.message ??
            "Failed to add restriction."}
        </p>
      )}
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg px-3 py-1.5 text-sm text-parchment-500 hover:text-[#b9baa3] transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!canSubmit}
          className="rounded-lg px-4 py-1.5 text-sm font-semibold bg-[#577399] text-[#f7f7ff] hover:bg-[#577399]/80 disabled:opacity-40 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-[#577399]"
        >
          {addMutation.isPending ? "Adding..." : "Add Restriction"}
        </button>
      </div>
    </form>
  );
}

// ─── Add Extension Form ───────────────────────────────────────────────────────

function AddExtensionForm({
  frameId,
  onClose,
  allowedTypes,
}: {
  frameId: string;
  onClose: () => void;
  allowedTypes: FrameExtensionType[];
}) {
  const addMutation = useAddFrameExtension(frameId);
  const filteredTypes = EXTENSION_TYPES.filter((t) =>
    allowedTypes.includes(t.value),
  );
  const [extensionType, setExtensionType] =
    useState<FrameExtensionType>(filteredTypes[0]?.value ?? "damageType");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const isHouseRule = extensionType === "houseRule";
  // House rules: description is the main content (required), name is the title
  const descMax = isHouseRule ? MAX_HOUSE_RULE_DESC_LENGTH : undefined;
  const descNearLimit =
    descMax != null && description.length >= Math.floor(descMax * 0.9);

  const canSubmit =
    name.trim().length > 0 &&
    !addMutation.isPending &&
    (!descMax || description.length <= descMax);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    addMutation.mutate(
      {
        extensionType,
        name: name.trim(),
        ...(description.trim()
          ? { description: description.trim() }
          : {}),
      },
      {
        onSuccess: () => {
          setName("");
          setDescription("");
          onClose();
        },
      },
    );
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-lg border border-[#577399]/30 bg-[#0a100d]/80 p-4 space-y-3"
    >
      <h3 className="text-sm font-semibold text-[#f7f7ff]">
        Add Custom Extension
      </h3>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {filteredTypes.length > 1 && (
          <div>
            <label className="block text-sm text-parchment-500 mb-1">
              Extension Type
            </label>
            <select
              value={extensionType}
              onChange={(e) => {
                setExtensionType(e.target.value as FrameExtensionType);
                setDescription("");
              }}
              className={selectClassName}
              aria-label="Extension type"
            >
              {filteredTypes.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
        )}
        <div>
          <label className="block text-sm text-parchment-500 mb-1">
            {isHouseRule ? "Rule Title" : "Name"}
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={isHouseRule ? "e.g. Cleaving Strike" : "e.g. Electric"}
            className={inputClassName}
            aria-label="Extension name"
          />
        </div>
      </div>
      <div>
        <div className="flex justify-between items-baseline mb-1">
          <label className="block text-sm text-parchment-500">
            {isHouseRule ? "Rule Text" : "Description (optional)"}
          </label>
          {descMax != null && (
            <span
              className={`text-xs ${descNearLimit ? "text-[#fe5f55]" : "text-parchment-500"}`}
            >
              {description.length}/{descMax}
            </span>
          )}
        </div>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={isHouseRule ? 4 : 2}
          maxLength={descMax}
          placeholder={
            isHouseRule
              ? "Describe the house rule in full..."
              : "Optional rules text or description..."
          }
          className={`${inputClassName} resize-none ${descNearLimit ? "border-[#fe5f55] focus:ring-[#fe5f55]" : ""}`}
          aria-label="Extension description"
        />
      </div>
      {addMutation.isError && (
        <p role="alert" className="text-sm text-[#fe5f55]">
          {(addMutation.error as Error)?.message ??
            "Failed to add extension."}
        </p>
      )}
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg px-3 py-1.5 text-sm text-parchment-500 hover:text-[#b9baa3] transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!canSubmit}
          className="rounded-lg px-4 py-1.5 text-sm font-semibold bg-[#577399] text-[#f7f7ff] hover:bg-[#577399]/80 disabled:opacity-40 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-[#577399]"
        >
          {addMutation.isPending ? "Adding..." : "Add Extension"}
        </button>
      </div>
    </form>
  );
}

// ─── Delete Confirmation ──────────────────────────────────────────────────────

function DeleteConfirmation({
  onConfirm,
  onCancel,
  isPending,
}: {
  onConfirm: () => void;
  onCancel: () => void;
  isPending: boolean;
}) {
  return (
    <div className="rounded-lg border border-[#fe5f55]/30 bg-[#fe5f55]/5 px-4 py-3">
      <p className="text-sm font-medium text-[#fe5f55]">
        Are you sure? This cannot be undone.
      </p>
      <div className="mt-3 flex items-center gap-3">
        <button
          type="button"
          onClick={onCancel}
          disabled={isPending}
          className="rounded-lg border border-slate-600 bg-transparent px-4 py-2 text-sm font-medium text-[#b9baa3] hover:bg-slate-800 disabled:opacity-40 transition-colors focus:outline-none focus:ring-2 focus:ring-[#577399]"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={isPending}
          className="rounded-lg bg-[#fe5f55] px-4 py-2 text-sm font-semibold text-white hover:bg-[#fe5f55]/80 disabled:opacity-40 transition-colors focus:outline-none focus:ring-2 focus:ring-[#fe5f55]"
        >
          {isPending ? "Deleting..." : "Delete Frame"}
        </button>
      </div>
    </div>
  );
}

// ─── SRD Hint ─────────────────────────────────────────────────────────────────

function SrdHint({ text }: { text: string }) {
  return (
    <div className="flex gap-3 rounded-lg border border-[#577399]/20 bg-[#577399]/5 px-4 py-3 mb-4">
      <svg
        className="h-5 w-5 shrink-0 text-[#577399] mt-0.5"
        viewBox="0 0 20 20"
        fill="currentColor"
        aria-hidden="true"
      >
        <path
          fillRule="evenodd"
          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z"
          clipRule="evenodd"
        />
      </svg>
      <p className="text-sm text-[#b9baa3] leading-relaxed">
        <span className="font-semibold text-[#577399]">SRD Guidance:</span>{" "}
        {text}
      </p>
    </div>
  );
}

// ─── Collapsible Work Section ─────────────────────────────────────────────────

function WorkSectionCard({
  section,
  isExpanded,
  onToggle,
  itemCount,
  children,
}: {
  section: WorkSection;
  isExpanded: boolean;
  onToggle: () => void;
  itemCount: number;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-[#577399]/20 bg-slate-900/40 overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between px-5 py-4 text-left transition-colors hover:bg-[#577399]/5 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[#577399]"
        aria-expanded={isExpanded}
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3">
            <h2 className="font-serif text-lg font-semibold text-[#f7f7ff]">
              {section.label}
            </h2>
            {itemCount > 0 && (
              <span className="inline-flex items-center justify-center h-5 min-w-[1.25rem] rounded-full bg-[#577399]/20 px-1.5 text-xs font-bold tabular-nums text-[#577399]">
                {itemCount}
              </span>
            )}
          </div>
          <p className="text-sm text-parchment-500 mt-0.5">
            {section.description}
          </p>
        </div>
        <svg
          className={`h-5 w-5 shrink-0 text-parchment-500 transition-transform ${isExpanded ? "rotate-180" : ""}`}
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
            clipRule="evenodd"
          />
        </svg>
      </button>
      {isExpanded && (
        <div className="border-t border-[#577399]/15 px-5 py-4">
          <SrdHint text={section.srdHint} />
          {children}
        </div>
      )}
    </section>
  );
}

// ─── Loading Skeleton ─────────────────────────────────────────────────────────

function FrameDetailSkeleton() {
  return (
    <div className="animate-pulse space-y-8">
      {/* Hero skeleton */}
      <div className="space-y-3">
        <div className="h-9 w-72 rounded bg-slate-700/60" />
        <div className="h-4 w-32 rounded bg-slate-700/40" />
        <div className="h-5 w-full max-w-lg rounded bg-slate-700/30" />
      </div>
      {/* Identity section skeleton */}
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="h-24 rounded-lg bg-slate-700/20" />
          <div className="h-24 rounded-lg bg-slate-700/20" />
        </div>
      </div>
      {/* Section skeletons */}
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="rounded-xl border border-slate-700/20 p-5 space-y-3">
          <div className="h-6 w-48 rounded bg-slate-700/40" />
          <div className="h-4 w-64 rounded bg-slate-700/20" />
        </div>
      ))}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function FrameDetailClient() {
  const pathname = usePathname();
  const rawFrameId = pathname?.split("/")[3] ?? "";
  // Guard: only treat as a valid frame ID if it looks like a UUID.
  // Prevents API calls when CloudFront SPA rewrite briefly renders this
  // component for static routes like /homebrew/frames/new.
  const frameId = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(rawFrameId) ? rawFrameId : "";
  const router = useRouter();

  const {
    isAuthenticated,
    isReady,
    isLoading: authLoading,
    user,
  } = useAuthStore();

  // ── Data hooks ──────────────────────────────────────────────────────────
  const {
    data: frame,
    isLoading,
    isError,
    error,
  } = useFrameDetail(frameId || undefined);

  const updateMutation = useUpdateFrame(frameId);
  const deleteMutation = useDeleteFrame();
  const removeContentMutation = useRemoveFrameContent(frameId);
  const removeRestrictionMutation = useRemoveFrameRestriction(frameId);
  const removeExtensionMutation = useRemoveFrameExtension(frameId);
  const updateRestrictionMutation = useUpdateFrameRestriction(frameId);
  const updateExtensionMutation = useUpdateFrameExtension(frameId);

  // ── Local state ─────────────────────────────────────────────────────────
  const [expandedSections, setExpandedSections] = useState<Set<SectionId>>(
    () => new Set<SectionId>(["characterOptions"]),
  );
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showAddFormFor, setShowAddFormFor] = useState<{
    sectionId: SectionId;
    formType: "content" | "restriction" | "extension";
  } | null>(null);

  // ── Auth guard ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (isReady && !isAuthenticated) router.replace("/auth/login");
  }, [isReady, isAuthenticated, router]);

  // ── Derived ─────────────────────────────────────────────────────────────
  const isOwner = Boolean(
    user?.userId && frame?.creatorUserId === user.userId,
  );

  const isUpdatePending = updateMutation.isPending;

  /** Count items in a section */
  const getSectionCount = useCallback(
    (section: WorkSection): number => {
      if (!frame) return 0;
      const contentCount = frame.contents.filter((c) =>
        section.contentTypes.includes(c.contentType as HomebrewContentType),
      ).length;
      const restrictionCount = frame.restrictions.filter((r) =>
        section.restrictionTypes.includes(
          r.contentType as FrameRestrictableContentType,
        ),
      ).length;
      const extensionCount = frame.extensions.filter((e) =>
        section.extensionTypes.includes(e.extensionType),
      ).length;
      return contentCount + restrictionCount + extensionCount;
    },
    [frame],
  );

  /** Toggle section expansion */
  const toggleSection = useCallback((sectionId: SectionId) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  }, []);

  // ── Inline update handler ───────────────────────────────────────────────
  const handleMetadataUpdate = useCallback(
    (patch: UpdateCampaignFrameInput) => {
      if (!frame) return;
      updateMutation.mutate({
        name: frame.name,
        ...patch,
      });
    },
    [frame, updateMutation],
  );

  // ── Delete handler ──────────────────────────────────────────────────────
  const handleDelete = useCallback(() => {
    if (!frameId) return;
    deleteMutation.mutate(frameId, {
      onSuccess: () => router.push("/homebrew/frames"),
    });
  }, [frameId, deleteMutation, router]);

  // ── Remove handlers ─────────────────────────────────────────────────────
  const handleRemoveContent = useCallback(
    (item: FrameContentRef) => {
      removeContentMutation.mutate({
        contentType: item.contentType,
        contentId: item.contentId,
      });
    },
    [removeContentMutation],
  );

  const handleRemoveRestriction = useCallback(
    (item: FrameRestriction) => {
      removeRestrictionMutation.mutate({
        contentType: item.contentType,
        contentId: item.contentId,
      });
    },
    [removeRestrictionMutation],
  );

  const handleRemoveExtension = useCallback(
    (item: FrameExtension) => {
      removeExtensionMutation.mutate({
        extensionType: item.extensionType,
        slug: item.slug,
      });
    },
    [removeExtensionMutation],
  );

  // ── Update handlers ─────────────────────────────────────────────────────
  const handleUpdateRestriction = useCallback(
    (
      item: FrameRestriction,
      update: { mode?: "restricted" | "altered"; alterationNotes?: string },
    ) => {
      updateRestrictionMutation.mutate({
        contentType: item.contentType,
        contentId: item.contentId,
        body: update,
      });
    },
    [updateRestrictionMutation],
  );

  const handleUpdateExtension = useCallback(
    (
      item: FrameExtension,
      update: { name?: string; description?: string },
    ) => {
      updateExtensionMutation.mutate({
        extensionType: item.extensionType,
        slug: item.slug,
        body: update,
      });
    },
    [updateExtensionMutation],
  );

  // ── Render guards ───────────────────────────────────────────────────────

  if (!isReady || authLoading || !isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a100d]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#577399] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#0a100d]">
      <AppHeader />

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        {/* ── Back link ────────────────────────────────────────────────── */}
        <Link
          href="/homebrew/frames"
          className="inline-flex items-center gap-1.5 text-sm text-parchment-600 hover:text-[#b9baa3] transition-colors mb-8 focus:outline-none focus:ring-2 focus:ring-[#577399] rounded"
        >
          <ChevronLeftIcon />
          Campaign Frames
        </Link>

        {/* ── Loading ──────────────────────────────────────────────────── */}
        {isLoading && <FrameDetailSkeleton />}

        {/* ── Error ────────────────────────────────────────────────────── */}
        {isError && !isLoading && (
          <div
            role="alert"
            className="rounded-xl border border-[#fe5f55]/30 bg-slate-900/80 p-8 text-center"
          >
            <p className="font-serif text-lg text-[#fe5f55]">
              Failed to load frame
            </p>
            <p className="mt-1 text-sm text-parchment-500">
              {(error as Error)?.message ?? "An unexpected error occurred."}
            </p>
            <Link
              href="/homebrew/frames"
              className="mt-4 inline-block text-sm text-[#577399] hover:text-[#577399] underline underline-offset-2 focus:outline-none focus:ring-2 focus:ring-[#577399] rounded"
            >
              Back to Campaign Frames
            </Link>
          </div>
        )}

        {/* ── Not found ────────────────────────────────────────────────── */}
        {!isLoading && !isError && !frame && frameId && (
          <div className="rounded-xl border border-slate-700/40 bg-slate-900/80 p-8 text-center">
            <p className="font-serif text-lg text-parchment-500">
              Frame not found
            </p>
            <p className="mt-1 text-sm text-parchment-600">
              This campaign frame may have been deleted or the link is
              invalid.
            </p>
            <Link
              href="/homebrew/frames"
              className="mt-4 inline-block text-sm text-[#577399] hover:text-[#577399] underline underline-offset-2 focus:outline-none focus:ring-2 focus:ring-[#577399] rounded"
            >
              Back to Campaign Frames
            </Link>
          </div>
        )}

        {/* ── Main detail content ──────────────────────────────────────── */}
        {!isLoading && !isError && frame && (
          <div className="space-y-8">
            {/* ═══════════════════════════════════════════════════════════
                HERO HEADER — Inline editable title, author, complexity, pitch
                ═══════════════════════════════════════════════════════════ */}
            <header className="border-b border-[#577399]/15 pb-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1 space-y-1">
                  {/* Frame name */}
                  <InlineEditableText
                    value={frame.name}
                    onSave={(name) => handleMetadataUpdate({ name })}
                    placeholder="Frame name"
                    isOwner={isOwner}
                    isPending={isUpdatePending}
                    className="font-serif text-3xl font-semibold text-[#f7f7ff] leading-tight block"
                    inputClassName="font-serif text-3xl font-semibold text-[#f7f7ff] leading-tight w-full rounded-lg border border-[#577399]/30 bg-[#0a100d] px-3 py-1 focus:border-[#577399] focus:outline-none focus:ring-1 focus:ring-[#577399]"
                    as="h1"
                    maxLength={MAX_NAME_LENGTH}
                  />
                  {/* Author */}
                  <InlineEditableText
                    value={frame.author ?? ""}
                    onSave={(author) =>
                      handleMetadataUpdate({
                        author: author || undefined,
                      })
                    }
                    placeholder="Add author"
                    isOwner={isOwner}
                    isPending={isUpdatePending}
                    className="text-sm text-parchment-600 block"
                    inputClassName="text-sm text-[#b9baa3] w-full rounded-lg border border-[#577399]/30 bg-[#0a100d] px-3 py-1 focus:border-[#577399] focus:outline-none focus:ring-1 focus:ring-[#577399]"
                    as="p"
                    maxLength={MAX_AUTHOR_LENGTH}
                  />
                </div>

                {/* Right side: complexity + owner actions */}
                <div className="flex items-center gap-3 shrink-0">
                  <EditableComplexity
                    value={frame.complexity}
                    isOwner={isOwner}
                    isPending={isUpdatePending}
                    onSave={(complexity) =>
                      handleMetadataUpdate({
                        complexity: complexity ?? undefined,
                      })
                    }
                  />
                  {isOwner && (
                    <button
                      type="button"
                      onClick={() => setShowDeleteConfirm(true)}
                      className="rounded-lg p-2 text-parchment-600 hover:text-[#fe5f55] hover:bg-[#fe5f55]/10 transition-colors focus:outline-none focus:ring-2 focus:ring-[#fe5f55]"
                      aria-label="Delete this frame"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Pitch */}
              <div className="mt-4">
                <InlineEditableText
                  value={frame.pitch ?? ""}
                  onSave={(pitch) =>
                    handleMetadataUpdate({
                      pitch: pitch || undefined,
                    })
                  }
                  placeholder="Add a short pitch for this frame..."
                  isOwner={isOwner}
                  isPending={isUpdatePending}
                  className="text-base text-[#b9baa3] leading-relaxed block"
                  inputClassName="text-base text-[#b9baa3] w-full rounded-lg border border-[#577399]/30 bg-[#0a100d] px-3 py-2 focus:border-[#577399] focus:outline-none focus:ring-1 focus:ring-[#577399]"
                  as="p"
                  maxLength={MAX_PITCH_LENGTH}
                />
              </div>

              {/* Dates + update feedback */}
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-parchment-600">
                <span>Created {formatDate(frame.createdAt)}</span>
                <span aria-hidden="true" className="hidden sm:inline">
                  /
                </span>
                <span>Updated {formatDate(frame.updatedAt)}</span>
                {updateMutation.isPending && (
                  <span className="text-[#577399] animate-pulse">
                    Saving...
                  </span>
                )}
                {updateMutation.isError && (
                  <span className="text-[#fe5f55]">
                    Save failed:{" "}
                    {(updateMutation.error as Error)?.message ?? "error"}
                  </span>
                )}
              </div>

              {/* Delete confirmation */}
              {showDeleteConfirm && (
                <div className="mt-4">
                  <DeleteConfirmation
                    onConfirm={handleDelete}
                    onCancel={() => setShowDeleteConfirm(false)}
                    isPending={deleteMutation.isPending}
                  />
                  {deleteMutation.isError && (
                    <p role="alert" className="mt-2 text-sm text-[#fe5f55]">
                      {(deleteMutation.error as Error)?.message ??
                        "Failed to delete frame."}
                    </p>
                  )}
                </div>
              )}
            </header>

            {/* ═══════════════════════════════════════════════════════════
                CAMPAIGN IDENTITY — Tone, Overview, Themes, Touchstones
                ═══════════════════════════════════════════════════════════ */}
            <section className="rounded-xl border border-[#577399]/20 bg-slate-900/40 p-5 space-y-6">
              <h2 className="font-serif text-lg font-semibold text-[#f7f7ff]">
                Campaign Identity
              </h2>
              <SrdHint text="Campaign frames are a lightweight approach to campaign creation. They are not exhaustive, but rather made to be a scaffolding or springboard for campaigns with specific subgenres." />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Tone & Feel */}
                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-parchment-600 mb-2">
                    Tone & Feel
                  </h3>
                  {isOwner ? (
                    <InlineEditableText
                      value={frame.toneAndFeel ?? ""}
                      onSave={(toneAndFeel) =>
                        handleMetadataUpdate({
                          toneAndFeel: toneAndFeel || undefined,
                        })
                      }
                      placeholder="Describe the mood and atmosphere..."
                      isOwner={isOwner}
                      isPending={isUpdatePending}
                      className="text-sm text-[#f7f7ff] leading-relaxed block border-l-2 border-[#577399]/30 pl-3"
                      inputClassName="text-sm text-[#f7f7ff] leading-relaxed w-full rounded-lg border border-[#577399]/30 bg-[#0a100d] px-3 py-2 focus:border-[#577399] focus:outline-none focus:ring-1 focus:ring-[#577399]"
                      as="p"
                      maxLength={MAX_TONE_LENGTH}
                      multiline
                    />
                  ) : frame.toneAndFeel ? (
                    <div className="border-l-2 border-[#577399]/30 pl-3">
                      <p className="text-sm text-[#f7f7ff] leading-relaxed">
                        {frame.toneAndFeel}
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm text-parchment-600">
                      No tone set
                    </p>
                  )}
                </div>

                {/* Overview */}
                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-parchment-600 mb-2">
                    Overview
                  </h3>
                  {isOwner ? (
                    <InlineEditableText
                      value={frame.overview ?? ""}
                      onSave={(overview) =>
                        handleMetadataUpdate({
                          overview: overview || undefined,
                        })
                      }
                      placeholder="Describe what this frame adds or changes..."
                      isOwner={isOwner}
                      isPending={isUpdatePending}
                      className="text-sm text-[#b9baa3] leading-relaxed whitespace-pre-wrap block"
                      inputClassName="text-sm text-[#b9baa3] leading-relaxed w-full rounded-lg border border-[#577399]/30 bg-[#0a100d] px-3 py-2 focus:border-[#577399] focus:outline-none focus:ring-1 focus:ring-[#577399]"
                      as="p"
                      maxLength={MAX_OVERVIEW_LENGTH}
                      multiline
                    />
                  ) : frame.overview ? (
                    <p className="text-sm text-[#b9baa3] leading-relaxed whitespace-pre-wrap">
                      {frame.overview}
                    </p>
                  ) : (
                    <p className="text-sm text-parchment-600">
                      No overview
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Themes */}
                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-parchment-600 mb-2">
                    Themes
                  </h3>
                  <TagEditor
                    tags={frame.themes}
                    onSave={(themes) =>
                      handleMetadataUpdate({ themes })
                    }
                    isOwner={isOwner}
                    isPending={isUpdatePending}
                    label="Themes"
                    placeholder="e.g. political intrigue"
                    tagStyle="bg-[#577399]/15 text-[#577399] border-[#577399]/25"
                    maxTagLength={MAX_THEME_LENGTH}
                  />
                  {!isOwner && frame.themes.length === 0 && (
                    <p className="text-sm text-parchment-600">
                      No themes
                    </p>
                  )}
                </div>

                {/* Touchstones */}
                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-parchment-600 mb-2">
                    Touchstones
                  </h3>
                  <TagEditor
                    tags={frame.touchstones}
                    onSave={(touchstones) =>
                      handleMetadataUpdate({ touchstones })
                    }
                    isOwner={isOwner}
                    isPending={isUpdatePending}
                    label="Touchstones"
                    placeholder="e.g. Dark Souls"
                    tagStyle="bg-[#b9baa3]/10 text-[#b9baa3] border-[#b9baa3]/25"
                    maxTagLength={MAX_TOUCHSTONE_LENGTH}
                    truncatePills
                  />
                  {!isOwner && frame.touchstones.length === 0 && (
                    <p className="text-sm text-parchment-600">
                      No touchstones
                    </p>
                  )}
                </div>
              </div>
            </section>

            {/* ═══════════════════════════════════════════════════════════
                WORK AREA SECTIONS — Collapsible, grouped by purpose
                ═══════════════════════════════════════════════════════════ */}
            {WORK_SECTIONS.map((section) => {
              const sectionContents = frame.contents.filter((c) =>
                section.contentTypes.includes(
                  c.contentType as HomebrewContentType,
                ),
              );
              const sectionRestrictions = frame.restrictions.filter(
                (r) =>
                  section.restrictionTypes.includes(
                    r.contentType as FrameRestrictableContentType,
                  ),
              );
              const sectionExtensions = frame.extensions.filter((e) =>
                section.extensionTypes.includes(e.extensionType),
              );
              const itemCount = getSectionCount(section);
              const isExpanded = expandedSections.has(section.id);
              const isAddingContent =
                showAddFormFor?.sectionId === section.id &&
                showAddFormFor?.formType === "content";
              const isAddingRestriction =
                showAddFormFor?.sectionId === section.id &&
                showAddFormFor?.formType === "restriction";
              const isAddingExtension =
                showAddFormFor?.sectionId === section.id &&
                showAddFormFor?.formType === "extension";
              const hasContentTypes = section.contentTypes.length > 0;
              const hasRestrictionTypes =
                section.restrictionTypes.length > 0;
              const hasExtensionTypes =
                section.extensionTypes.length > 0;

              return (
                <WorkSectionCard
                  key={section.id}
                  section={section}
                  isExpanded={isExpanded}
                  onToggle={() => toggleSection(section.id)}
                  itemCount={itemCount}
                >
                  {/* ── Restrictions subsection ──────────────────── */}
                  {hasRestrictionTypes && (
                    <div className="mb-6">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-semibold uppercase tracking-wider text-parchment-500">
                          SRD Restrictions
                        </h3>
                        {isOwner && !isAddingRestriction && (
                          <button
                            type="button"
                            onClick={() =>
                              setShowAddFormFor({
                                sectionId: section.id,
                                formType: "restriction",
                              })
                            }
                            className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-[#577399]/40 px-3 py-1.5 text-sm font-medium text-[#577399] hover:border-[#577399]/70 hover:bg-[#577399]/10 transition-colors focus:outline-none focus:ring-2 focus:ring-[#577399]"
                          >
                            <PlusIcon className="h-3.5 w-3.5" />
                            Add Restriction
                          </button>
                        )}
                      </div>

                      {isAddingRestriction && (
                        <div className="mb-3">
                          <AddRestrictionForm
                            frameId={frameId}
                            onClose={() => setShowAddFormFor(null)}
                            allowedTypes={section.restrictionTypes}
                          />
                        </div>
                      )}

                      {sectionRestrictions.length === 0 &&
                      !isAddingRestriction ? (
                        <EmptyState
                          message="No restrictions for this area."
                          action={
                            isOwner ? (
                              <button
                                type="button"
                                onClick={() =>
                                  setShowAddFormFor({
                                    sectionId: section.id,
                                    formType: "restriction",
                                  })
                                }
                                className="text-sm text-[#577399] hover:underline"
                              >
                                Add a restriction
                              </button>
                            ) : undefined
                          }
                        />
                      ) : (
                        <div className="space-y-2">
                          {sectionRestrictions.map((item) => (
                            <RestrictionRow
                              key={`${item.contentType}-${item.contentId}`}
                              item={item}
                              onRemove={() =>
                                handleRemoveRestriction(item)
                              }
                              onUpdate={(update) =>
                                handleUpdateRestriction(item, update)
                              }
                              isRemoving={
                                removeRestrictionMutation.isPending &&
                                removeRestrictionMutation.variables
                                  ?.contentType ===
                                  item.contentType &&
                                removeRestrictionMutation.variables
                                  ?.contentId === item.contentId
                              }
                              isUpdating={
                                updateRestrictionMutation.isPending &&
                                updateRestrictionMutation.variables
                                  ?.contentType ===
                                  item.contentType &&
                                updateRestrictionMutation.variables
                                  ?.contentId === item.contentId
                              }
                              isOwner={isOwner}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* ── Homebrew Content subsection ──────────────── */}
                  {hasContentTypes && (
                    <div className="mb-6">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-semibold uppercase tracking-wider text-parchment-500">
                          Homebrew Content
                        </h3>
                        {isOwner && !isAddingContent && (
                          <button
                            type="button"
                            onClick={() =>
                              setShowAddFormFor({
                                sectionId: section.id,
                                formType: "content",
                              })
                            }
                            className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-[#577399]/40 px-3 py-1.5 text-sm font-medium text-[#577399] hover:border-[#577399]/70 hover:bg-[#577399]/10 transition-colors focus:outline-none focus:ring-2 focus:ring-[#577399]"
                          >
                            <PlusIcon className="h-3.5 w-3.5" />
                            Add Content
                          </button>
                        )}
                      </div>

                      {isAddingContent && (
                        <div className="mb-3">
                          <AddContentForm
                            frameId={frameId}
                            onClose={() => setShowAddFormFor(null)}
                            allowedTypes={section.contentTypes}
                          />
                        </div>
                      )}

                      {sectionContents.length === 0 &&
                      !isAddingContent ? (
                        <EmptyState
                          message="No homebrew content in this area yet."
                          action={
                            isOwner ? (
                              <button
                                type="button"
                                onClick={() =>
                                  setShowAddFormFor({
                                    sectionId: section.id,
                                    formType: "content",
                                  })
                                }
                                className="text-sm text-[#577399] hover:underline"
                              >
                                Add homebrew content
                              </button>
                            ) : undefined
                          }
                        />
                      ) : (
                        <div className="space-y-2">
                          {sectionContents.map((item) => (
                            <ContentRow
                              key={`${item.contentType}-${item.contentId}`}
                              item={item}
                              onRemove={() =>
                                handleRemoveContent(item)
                              }
                              isRemoving={
                                removeContentMutation.isPending &&
                                removeContentMutation.variables
                                  ?.contentType ===
                                  item.contentType &&
                                removeContentMutation.variables
                                  ?.contentId === item.contentId
                              }
                              isOwner={isOwner}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* ── Extensions subsection ────────────────────── */}
                  {hasExtensionTypes && (
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-semibold uppercase tracking-wider text-parchment-500">
                          Custom Extensions
                        </h3>
                        {isOwner && !isAddingExtension && (
                          <button
                            type="button"
                            onClick={() =>
                              setShowAddFormFor({
                                sectionId: section.id,
                                formType: "extension",
                              })
                            }
                            className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-[#577399]/40 px-3 py-1.5 text-sm font-medium text-[#577399] hover:border-[#577399]/70 hover:bg-[#577399]/10 transition-colors focus:outline-none focus:ring-2 focus:ring-[#577399]"
                          >
                            <PlusIcon className="h-3.5 w-3.5" />
                            Add Extension
                          </button>
                        )}
                      </div>

                      {isAddingExtension && (
                        <div className="mb-3">
                          <AddExtensionForm
                            frameId={frameId}
                            onClose={() => setShowAddFormFor(null)}
                            allowedTypes={section.extensionTypes}
                          />
                        </div>
                      )}

                      {sectionExtensions.length === 0 &&
                      !isAddingExtension ? (
                        <EmptyState
                          message="No custom extensions in this area yet."
                          action={
                            isOwner ? (
                              <button
                                type="button"
                                onClick={() =>
                                  setShowAddFormFor({
                                    sectionId: section.id,
                                    formType: "extension",
                                  })
                                }
                                className="text-sm text-[#577399] hover:underline"
                              >
                                Add an extension
                              </button>
                            ) : undefined
                          }
                        />
                      ) : (
                        <div className="space-y-2">
                          {sectionExtensions.map((item) => (
                            <ExtensionRow
                              key={`${item.extensionType}-${item.slug}`}
                              item={item}
                              onRemove={() =>
                                handleRemoveExtension(item)
                              }
                              onUpdate={(update) =>
                                handleUpdateExtension(item, update)
                              }
                              isRemoving={
                                removeExtensionMutation.isPending &&
                                removeExtensionMutation.variables
                                  ?.extensionType ===
                                  item.extensionType &&
                                removeExtensionMutation.variables
                                  ?.slug === item.slug
                              }
                              isUpdating={
                                updateExtensionMutation.isPending &&
                                updateExtensionMutation.variables
                                  ?.extensionType ===
                                  item.extensionType &&
                                updateExtensionMutation.variables
                                  ?.slug === item.slug
                              }
                              isOwner={isOwner}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </WorkSectionCard>
              );
            })}

            {/* ── Quick stats summary ──────────────────────────────────── */}
            <div className="rounded-xl border border-[#577399]/15 bg-slate-900/30 p-5">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-parchment-600 mb-3">
                Frame Summary
              </h3>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <span className="block text-lg font-bold text-[#577399]">
                    {frame.contents.length}
                  </span>
                  <span className="text-sm text-parchment-500">
                    Content
                  </span>
                </div>
                <div>
                  <span className="block text-lg font-bold text-[#fe5f55]">
                    {frame.restrictions.length}
                  </span>
                  <span className="text-sm text-parchment-500">
                    Restrictions
                  </span>
                </div>
                <div>
                  <span className="block text-lg font-bold text-gold-400">
                    {frame.extensions.length}
                  </span>
                  <span className="text-sm text-parchment-500">
                    Extensions
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
