"use client";

/**
 * src/app/homebrew/upload/page.tsx
 *
 * Markdown upload / paste page for homebrew content creation.
 *
 * Supports two input modes:
 *   1. Paste markdown into a textarea
 *   2. Upload a .md file via file picker or drag-and-drop
 *
 * Provides downloadable blank + filled example templates for each
 * content type (Class, Ancestry, Community, Domain Card).
 *
 * After selecting a content type and providing markdown, the user can
 * preview (parse without saving) and then create the homebrew item.
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/store/authStore";
import { AppHeader } from "@/components/AppHeader";
import { Footer } from "@/components/Footer";
import { MarkdownPreview } from "@/components/homebrew/MarkdownPreview";
import {
  useCreateHomebrew,
  useParsePreview,
  type HomebrewItemData,
} from "@/hooks/useHomebrew";
import type { HomebrewContentType, HomebrewMarkdownInput } from "@shared/types";

// ─── Template definitions ─────────────────────────────────────────────────────

interface TemplateDefinition {
  type: HomebrewContentType;
  label: string;
  blankFilename: string;
  blankContent: string;
  exampleFilename: string;
  exampleContent: string;
}

const TEMPLATES: TemplateDefinition[] = [
  {
    type: "ancestry",
    label: "Ancestry",
    blankFilename: "ancestry-template.md",
    blankContent: `A short paragraph describing this ancestry's appearance, culture, and history.

# Ancestry

**Feature Name:** Describe the first ancestry feature here.

**Second Feature Name:** Describe the second ancestry feature here (optional).
`,
    exampleFilename: "ancestry-example-crenshaw.md",
    exampleContent: `A small ratlike species of characters. Hairless. Large grey eyes and oversized hands. Live for exceptionally long times. Bear the stereotypes that come with longevity and their stunted physiques. This manifests in cultural attitudes towards the Crenshaw as ranging between patronizing tolerance to fetishization of their cultures and traditions.

As a people, they are insular and familial-oriented. Crenshaw often create large, intensely hierarchical societies within larger communities that operate on their own rules whose logic most outsiders consider impenetrable.

# Ancestry

**Experienced:** Mark a Stress to create a temporary Experience. This has the same bonus as your highest bonus experience. This lasts until the end of the Scene.

**Cagey:** Once per long rest, you can mark a Stress instead of taking Minor Damage.
`,
  },
  {
    type: "community",
    label: "Community",
    blankFilename: "community-template.md",
    blankContent: `_A short italic description of what this community is known for and where they are found._

**Trait Name**: Describe the cultural trait and its mechanical effect here.
`,
    exampleFilename: "community-example-varjalune-republic.md",
    exampleContent: `_You hail from one of the two major cities of the Varjalune Republic - either Alipinn or Taliga. You are accustomed to the harsh conditions of the wet season._

**Hardy Spirit**: Once per long rest, you may swap the values of your Hope and Fear Dice.
`,
  },
  {
    type: "domainCard",
    label: "Domain Card",
    blankFilename: "domain-card-template.md",
    blankContent: `Describe the card's ability or effect here. Include costs, targets, and duration.
`,
    exampleFilename: "domain-card-example-analysis.md",
    exampleContent: `When you spend a turn studying an adversary, gain Advantage on rolls against that target for the rest of the scene.
`,
  },
  {
    type: "class",
    label: "Class",
    blankFilename: "class-template.md",
    blankContent: `|     Domains      | Starting Evasion | Starting Hit Points |
| :--------------: | :--------------: | :-----------------: |
| [[Domain1]] & [[Domain2]] |        10         |          6          |

### Class Items

_A signature item_ or _an alternate signature item_

### Hope Feature

_Feature Name_: Spend N Hope to do something.

### Class Feature

**Feature Name**
Describe the class feature here.

- _Option 1:_ Description
- _Option 2:_ Description

### Subclasses

As a ClassName, choose between the following subclasses.

**Subclass 1 Name**
_Play this subclass if you want to..._

**Subclass 2 Name**
_Play this subclass if you want to..._

### Background Questions

_Answer any of the following background questions._

- Background question 1?
- Background question 2?

### Connections

_Ask your fellow players one of the following._

- Connection question 1?
- Connection question 2?

# Subclasses

## **Subclass 1 Name**

_Play this subclass if you want to..._

### Spellcast Trait

Trait Name

### Foundation Features

_Feature 1_: Description
_Feature 2_: Description

### Specialization Feature

**Feature Name**: Description

### Mastery Feature

**Feature Name**: Description
`,
    exampleFilename: "class-example-knave.md",
    exampleContent: `|         Domains          | Starting Evasion | Starting Hit Points |
| :----------------------: | :--------------: | :-----------------: |
| [[Charm]] & [[Violence]] |        9         |          7          |

### Class Items

_An intricate piece of headwear_ or _an aristocratic dress item_

### Hope Feature

_Roguish Charm_: Spend 3 Hope to double your Presence on your next roll.

### Class Feature

**Criminal Connections**
Once per session, you can call on your contacts in a local criminal organization that you know. Choose one of the following options when you do:

- _Item Drop_: Deliver a mundane item to a location of your choosing
- _Make a Ruckus:_ A flurry of activity happens at a time and place you designate. Characters caught up in this take a -2 Penalty to their Difficulty
- _Hideout:_ You and your party can go to ground with cover from the organization. Anyone pursuing you will temporarily lose your trail. Treat this time as a long rest.

### Subclasses

As a Knave, choose between the following subclasses.

**Enforcer**
_Play the Enforcer if you want to play a strong, willful character who uses their actions to back up their words._

**Pretty Face**
_Play the Pretty Face if you want to play a character whose worst crimes are far overshadowed by their legendary charisma._

### Background Questions

_Answer any of the following background questions. You can also create your own questions._

- How did I end up in this life? Was there a point where I could have made a different choice?
- What is the worst trouble I've been in, and how did I get out of it?
- Who have I had to leave behind in order to live the way I do now?

### Connections

_Ask your fellow players one of the following questions for their characters to answer, or create your own questions._

- I put you in a situation where you had no choice but to lie. What was it and how did you feel about me afterwards?
- As long as I've known you, we've had what I consider a friendly rivalry. Do you agree, or do you secretly resent me?
- I put on a very polished front, but you always see right through it. What do you know about me that makes you immune to my charm?

# Subclasses

## **Enforcer**

_Play the Enforcer if you want to play a strong, willful character who uses their actions to back up their words._

### Spellcast Trait

Presence

### Foundation Features

_Strong but Silent_: When you choose to influence a character without words, spend 2 Hope to add your Strength score as a bonus to the Presence roll.
_Sending a Message_: After you down an adversary, you can spend a Hope to gain a +3 bonus per Level to your next roll to intimidate a character.

### Specialization Feature

**Crusher**: After a successful hit on a target within Melee range of you, spend a Hope to give the target the Crushed condition. While Crushed, the target cannot move and attacks made against a Crushed adversary have Advantage. This condition ends when the target expires or you move beyond Melee range.

### Mastery Feature

**Underworld Reputation**: When you use Criminal Connections, choose two options instead of one. If either option directly harms an organized rival, gain 1 Hope.

## **Pretty Face**

_Play the Pretty Face if you want to play a character whose worst crimes are far overshadowed by their legendary charisma._

### Spellcast Trait

Presence

### Foundation Features

_Sharp Comeback_: If you fail a roll with Hope to influence a character, you can mark a Stress to immediately attack them. This attack is made with Advantage and, if it hits, you roll your damage dice again and add the result to the damage dealt.
_Wink and a Smile_: When you attempt to deceive a character, you can spend a Hope to gain Advantage on the roll.

### Specialization Feature

**Don't Fall in Love**: When you influence a character, you can spend a hope to roll a d6. On a 6, gain a +1 permanent bonus to that character's Attitude towards you.

### Mastery Feature

**Deadly Charm**: Once per scene, when you succeed on a Presence roll to influence a Character, you can immediately make an attack against that Character with Advantage. Treat any success as a Critical Success.
`,
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function downloadFile(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

const TYPE_LABELS: Record<HomebrewContentType, string> = {
  class: "Class",
  ancestry: "Ancestry",
  community: "Community",
  domainCard: "Domain Card",
};

// ─── Styling ──────────────────────────────────────────────────────────────────

const INPUT_CLS =
  "w-full rounded-lg border border-slate-700/60 bg-slate-900/60 px-3 py-2 text-sm text-[#f7f7ff] placeholder:text-parchment-600 focus:outline-none focus:ring-2 focus:ring-coral-400/50 focus:border-coral-400/50 transition-colors";

const LABEL_CLS = "block text-sm font-medium text-parchment-500 mb-1";

const BTN_SECONDARY =
  "rounded-lg border border-slate-700/60 px-4 py-2 text-sm text-parchment-500 hover:text-[#b9baa3] hover:border-slate-600 transition-colors focus:outline-none focus:ring-2 focus:ring-coral-400/50";

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function HomebrewUploadPage() {
  const router = useRouter();
  const { isAuthenticated, isReady, isLoading: authLoading } = useAuthStore();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [contentType, setContentType] = useState<HomebrewContentType>("ancestry");
  const [name, setName] = useState("");
  const [markdown, setMarkdown] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [previewData, setPreviewData] = useState<HomebrewItemData | null>(null);

  // Domain card-specific fields
  const [domain, setDomain] = useState("");
  const [level, setLevel] = useState(1);
  const [isCursed, setIsCursed] = useState(false);
  const [isLinkedCurse, setIsLinkedCurse] = useState(false);
  const [recallCost, setRecallCost] = useState(1);

  const createMutation = useCreateHomebrew();
  const parseMutation = useParsePreview();

  // Auth guard
  useEffect(() => {
    if (isReady && !isAuthenticated) {
      router.replace("/auth/login");
    }
  }, [isReady, isAuthenticated, router]);

  // ── Build input ─────────────────────────────────────────────────────────
  const buildInput = useCallback((): HomebrewMarkdownInput => {
    const input: HomebrewMarkdownInput = {
      contentType,
      name: name.trim(),
      markdown,
    };
    if (contentType === "domainCard") {
      input.domain = domain;
      input.level = level;
      input.isCursed = isCursed;
      input.isLinkedCurse = isLinkedCurse;
      input.recallCost = recallCost;
    }
    return input;
  }, [contentType, name, markdown, domain, level, isCursed, isLinkedCurse, recallCost]);

  // ── Preview ─────────────────────────────────────────────────────────────
  const handlePreview = useCallback(async () => {
    if (!name.trim() || !markdown.trim()) return;
    try {
      const result = await parseMutation.mutateAsync(buildInput());
      setPreviewData(result.data);
    } catch {
      // Preview failure is non-fatal
    }
  }, [name, markdown, parseMutation, buildInput]);

  // ── Submit ──────────────────────────────────────────────────────────────
  const handleSubmit = useCallback(async () => {
    if (!name.trim() || !markdown.trim()) return;
    try {
      await createMutation.mutateAsync(buildInput());
      router.push("/homebrew");
    } catch {
      // Error displayed via mutation state
    }
  }, [name, markdown, createMutation, buildInput, router]);

  // ── File reading ────────────────────────────────────────────────────────
  const readFile = useCallback((file: File) => {
    if (!file.name.endsWith(".md") && !file.name.endsWith(".txt") && !file.name.endsWith(".markdown")) {
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result;
      if (typeof text === "string") {
        setMarkdown(text);
        // Auto-detect name from first heading
        const headingMatch = text.match(/^#\s+(.+)$/m);
        if (headingMatch && !name.trim()) {
          setName(headingMatch[1].trim());
        }
      }
    };
    reader.readAsText(file);
  }, [name]);

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) readFile(file);
    },
    [readFile]
  );

  // ── Drag and drop ──────────────────────────────────────────────────────
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) readFile(file);
    },
    [readFile]
  );

  if (!isReady || authLoading || !isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a100d]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-coral-400 border-t-transparent" />
      </div>
    );
  }

  const currentTemplate = TEMPLATES.find((t) => t.type === contentType);

  return (
    <div className="flex min-h-screen flex-col bg-[#0a100d]">
      <AppHeader />

      <main className="flex-1 mx-auto w-full max-w-[1400px] px-4 py-6">
        {/* Page header */}
        <div className="mb-6 space-y-1">
          <Link
            href="/homebrew/new"
            className="inline-flex items-center gap-1.5 text-sm text-parchment-500 hover:text-[#b9baa3] transition-colors focus:outline-none focus:ring-2 focus:ring-coral-400 rounded"
          >
            <span aria-hidden="true">&larr;</span> Back
          </Link>
          <h1 className="font-serif text-2xl font-semibold text-[#f7f7ff] sm:text-3xl">
            Upload Markdown
          </h1>
          <p className="text-sm text-parchment-500 max-w-lg">
            Paste or upload markdown to create homebrew content. Download a
            template below to get started.
          </p>
        </div>

        {/* Two-panel layout */}
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
          {/* Left panel: Input */}
          <div className="w-full lg:w-[60%]">
            <div className="rounded-xl border border-slate-700/60 bg-slate-900/60 p-5 sm:p-6 space-y-5">
              {/* Content type + Name row */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className={LABEL_CLS}>
                    Content Type <span className="text-[#fe5f55]" aria-hidden="true">*</span>
                  </label>
                  <select
                    value={contentType}
                    onChange={(e) => {
                      setContentType(e.target.value as HomebrewContentType);
                      setPreviewData(null);
                    }}
                    className={INPUT_CLS}
                  >
                    {(Object.keys(TYPE_LABELS) as HomebrewContentType[]).map(
                      (t) => (
                        <option key={t} value={t}>
                          {TYPE_LABELS[t]}
                        </option>
                      )
                    )}
                  </select>
                </div>
                <div>
                  <label className={LABEL_CLS}>
                    Name <span className="text-[#fe5f55]" aria-hidden="true">*</span>
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Shadow Dancer"
                    maxLength={80}
                    className={INPUT_CLS}
                  />
                </div>
              </div>

              {/* Domain card fields (shown when type is domainCard) */}
              {contentType === "domainCard" && (
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  <div>
                    <label className={LABEL_CLS}>Domain</label>
                    <input
                      type="text"
                      value={domain}
                      onChange={(e) => setDomain(e.target.value)}
                      placeholder="e.g. Arcana"
                      className={INPUT_CLS}
                    />
                  </div>
                  <div>
                    <label className={LABEL_CLS}>Level</label>
                    <input
                      type="number"
                      min={1}
                      max={10}
                      value={level}
                      onChange={(e) => setLevel(Number(e.target.value))}
                      className={INPUT_CLS}
                    />
                  </div>
                  <div>
                    <label className={LABEL_CLS}>Recall Cost</label>
                    <input
                      type="number"
                      min={0}
                      max={20}
                      value={recallCost}
                      onChange={(e) => setRecallCost(Number(e.target.value))}
                      className={INPUT_CLS}
                    />
                  </div>
                  <div className="flex flex-col gap-2 justify-end">
                    <label className="flex items-center gap-2 cursor-pointer text-sm text-parchment-500">
                      <input
                        type="checkbox"
                        checked={isCursed}
                        onChange={(e) => {
                          setIsCursed(e.target.checked);
                          if (!e.target.checked) setIsLinkedCurse(false);
                        }}
                        className="h-4 w-4 rounded border-slate-600 bg-slate-900 accent-coral-400"
                      />
                      Cursed
                    </label>
                    {isCursed && (
                      <label className="flex items-center gap-2 cursor-pointer text-sm text-parchment-500">
                        <input
                          type="checkbox"
                          checked={isLinkedCurse}
                          onChange={(e) => setIsLinkedCurse(e.target.checked)}
                          className="h-4 w-4 rounded border-slate-600 bg-slate-900 accent-purple-400"
                        />
                        Linked
                      </label>
                    )}
                  </div>
                </div>
              )}

              {/* File upload / drop zone */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") fileInputRef.current?.click();
                }}
                className={`
                  cursor-pointer rounded-lg border-2 border-dashed p-6 text-center
                  transition-colors
                  ${
                    isDragging
                      ? "border-coral-400 bg-coral-400/5"
                      : "border-slate-700/40 hover:border-slate-600"
                  }
                  focus:outline-none focus:ring-2 focus:ring-coral-400/50
                `}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".md,.txt,.markdown"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <p className="text-sm text-parchment-500">
                  {isDragging
                    ? "Drop your file here..."
                    : "Drag & drop a .md file here, or click to browse"}
                </p>
              </div>

              {/* Markdown textarea */}
              <div>
                <label className={LABEL_CLS}>Markdown Content</label>
                <textarea
                  value={markdown}
                  onChange={(e) => setMarkdown(e.target.value)}
                  rows={16}
                  placeholder="Paste your markdown here, or upload a file above..."
                  className={`${INPUT_CLS} resize-y font-mono text-xs leading-relaxed`}
                />
              </div>

              {/* Error banner */}
              {createMutation.isError && (
                <div role="alert" className="rounded-lg border border-[#fe5f55]/30 bg-[#fe5f55]/10 px-4 py-3">
                  <p className="text-sm text-[#fe5f55]">
                    {createMutation.error?.message ?? "Failed to create homebrew. Please try again."}
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-700/40 pt-5">
                <button
                  type="button"
                  onClick={handlePreview}
                  disabled={!name.trim() || !markdown.trim() || parseMutation.isPending}
                  className={`${BTN_SECONDARY} disabled:opacity-30 disabled:cursor-not-allowed`}
                >
                  {parseMutation.isPending ? "Parsing..." : "Preview"}
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={
                    !name.trim() ||
                    !markdown.trim() ||
                    createMutation.isPending
                  }
                  className="rounded-xl border border-coral-400/60 bg-coral-400/10 px-5 py-2.5 font-semibold text-base text-coral-400 hover:bg-coral-400/20 hover:border-coral-400 disabled:opacity-40 disabled:cursor-not-allowed transition-all focus:outline-none focus:ring-2 focus:ring-coral-400 focus:ring-offset-2 focus:ring-offset-[#0a100d]"
                >
                  {createMutation.isPending ? "Creating\u2026" : "Create Homebrew"}
                </button>
              </div>
            </div>
          </div>

          {/* Right panel: Preview + Templates */}
          <div className="w-full lg:w-[40%] lg:sticky lg:top-20 space-y-5">
            {/* Live preview */}
            <div className="rounded-xl border border-coral-400/30 bg-slate-900/80 overflow-y-auto max-h-[calc(100vh-320px)]">
              <div className="sticky top-0 z-[1] border-b border-coral-400/20 bg-slate-900/95 backdrop-blur-sm px-5 py-3">
                <h2 className="flex items-center gap-2 font-serif text-sm font-semibold text-coral-400">
                  <span
                    aria-hidden="true"
                    className="inline-block h-2 w-2 rounded-full bg-coral-400/60"
                  />
                  Live Preview
                </h2>
              </div>
              <div className="p-5">
                {parseMutation.isPending && (
                  <div className="flex items-center gap-2 text-xs text-parchment-600 mb-3">
                    <span className="h-3 w-3 animate-spin rounded-full border border-coral-400 border-t-transparent" />
                    Parsing...
                  </div>
                )}
                {parseMutation.isError && (
                  <div className="rounded-lg border border-[#fe5f55]/20 bg-[#fe5f55]/5 px-3 py-2 mb-3">
                    <p className="text-xs text-[#fe5f55]/80">
                      Preview error: {parseMutation.error?.message ?? "Parse failed"}
                    </p>
                  </div>
                )}
                <MarkdownPreview data={previewData} contentType={contentType} />
              </div>
            </div>

            {/* Templates */}
            <div className="rounded-xl border border-slate-700/60 bg-slate-900/60 p-5 space-y-4">
              <h3 className="font-serif text-sm font-semibold text-[#f7f7ff]">
                Templates
              </h3>
              <p className="text-xs text-parchment-600 leading-relaxed">
                Download a template to get started. Each includes the expected
                markdown structure for the parser.
              </p>

              {currentTemplate && (
                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      downloadFile(
                        currentTemplate.blankFilename,
                        currentTemplate.blankContent
                      )
                    }
                    className={BTN_SECONDARY}
                  >
                    Blank {currentTemplate.label} Template
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      downloadFile(
                        currentTemplate.exampleFilename,
                        currentTemplate.exampleContent
                      )
                    }
                    className={BTN_SECONDARY}
                  >
                    Example: {currentTemplate.label}
                  </button>
                </div>
              )}

              <details className="group">
                <summary className="cursor-pointer text-xs text-parchment-600 hover:text-parchment-500 transition-colors">
                  All templates
                </summary>
                <div className="mt-2 space-y-2 pl-2">
                  {TEMPLATES.map((t) => (
                    <div key={t.type} className="flex flex-col gap-1">
                      <p className="text-xs font-medium text-parchment-500">
                        {t.label}
                      </p>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            downloadFile(t.blankFilename, t.blankContent)
                          }
                          className="text-xs text-coral-400 hover:underline"
                        >
                          Blank
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            downloadFile(t.exampleFilename, t.exampleContent)
                          }
                          className="text-xs text-coral-400 hover:underline"
                        >
                          Example
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </details>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
