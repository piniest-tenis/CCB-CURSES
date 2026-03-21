"use client";

/**
 * src/components/character/DowntimeModal.tsx
 *
 * Radix Dialog for short/long rest.
 *
 * Each rest action button calls POST /characters/{id}/actions with the
 * appropriate actionId. "Full Recovery" fires three sequential calls:
 *   clear-stress { n: all }, clear-hp { n: all }, clear-armor { n: all }
 * (or a single full-recovery actionId if the server supports it).
 *
 * On 422 INVALID_ACTION, an inline role="alert" appears near the button
 * that triggered it — never a toast.
 *
 * Action map:
 *   Clear Stress (short rest)  → clear-stress    { n: 2 }
 *   Tend Wounds  (short rest)  → clear-hp         { n: 1 }
 *   Full Recovery (long rest)  → full-recovery    (single call; server applies all three)
 *   Prepare      (short rest)  → roleplay only, no mechanical call
 */

import React, { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { useCharacterAction } from "@/hooks/useCharacter";
import { ApiError } from "@/lib/api";
import { InlineActionError } from "./ActionButton";
import { useCharacterStore } from "@/store/characterStore";

// ─── Props ────────────────────────────────────────────────────────────────────

interface DowntimeModalProps {
  characterId: string;
  open: boolean;
  onClose: () => void;
}

// ─── Rest type toggle ─────────────────────────────────────────────────────────

interface RestTypeToggleProps {
  value: "short" | "long";
  onChange: (v: "short" | "long") => void;
}

function RestTypeToggle({ value, onChange }: RestTypeToggleProps) {
  return (
    <div
      className="flex rounded-lg border border-burgundy-800 overflow-hidden"
      role="radiogroup"
      aria-label="Rest type"
    >
      {(["short", "long"] as const).map((type) => (
        <button
          key={type}
          type="button"
          role="radio"
          aria-checked={value === type}
          onClick={() => onChange(type)}
          className={`
            flex-1 py-2 text-sm font-semibold capitalize transition-colors
            focus:outline-none focus:ring-2 focus:ring-inset focus:ring-gold-500
            ${
              value === type
                ? "bg-burgundy-700 text-parchment-100"
                : "bg-slate-900 text-parchment-500 hover:text-parchment-300 hover:bg-slate-800"
            }
          `}
        >
          {type} Rest
        </button>
      ))}
    </div>
  );
}

// ─── RestActionButton ─────────────────────────────────────────────────────────
// A single action button with its own independent error state.

interface RestActionButtonProps {
  characterId: string;
  label: string;
  description: string;
  actionId: string;
  params?: Record<string, unknown>;
  /** When true, renders description text only — no action button. */
  roleplaysOnly?: boolean;
  onSuccess?: () => void;
}

function RestActionButton({
  characterId,
  label,
  description,
  actionId,
  params,
  roleplaysOnly = false,
  onSuccess,
}: RestActionButtonProps) {
  const mutation = useCharacterAction(characterId);
  const [inlineError, setInlineError] = useState<string | null>(null);
  const [succeeded, setSucceeded] = useState(false);
  const errorId = React.useId();

  const handleClick = async () => {
    setInlineError(null);
    setSucceeded(false);
    try {
      await mutation.mutateAsync({ actionId, params });
      setSucceeded(true);
      onSuccess?.();
    } catch (err) {
      if (err instanceof ApiError && err.status === 422) {
        setInlineError(err.message);
      } else if (err instanceof Error) {
        setInlineError(err.message);
      } else {
        setInlineError("An unexpected error occurred.");
      }
    }
  };

  return (
    <div
      className={`rounded border p-3 space-y-2 ${
        succeeded
          ? "border-gold-700 bg-gold-950/20"
          : "border-burgundy-800 bg-slate-850"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-parchment-200">{label}</p>
          <p className="text-xs text-parchment-500 mt-0.5">{description}</p>
        </div>

        {!roleplaysOnly && (
          <button
            type="button"
            onClick={handleClick}
            disabled={mutation.isPending}
            aria-label={`Perform action: ${label}`}
            aria-describedby={inlineError ? errorId : undefined}
            aria-busy={mutation.isPending}
            className={`
              shrink-0 rounded px-3 py-1.5 text-xs font-semibold transition-colors
              focus:outline-none focus:ring-2 focus:ring-gold-500 focus:ring-offset-1 focus:ring-offset-slate-900
              disabled:opacity-50 disabled:cursor-wait
              ${
                succeeded
                  ? "bg-gold-800 text-gold-200 cursor-default"
                  : "bg-burgundy-800 text-parchment-200 hover:bg-burgundy-700"
              }
            `}
          >
            {mutation.isPending ? (
              <span
                aria-hidden="true"
                className="inline-block h-3 w-3 animate-spin rounded-full border border-current border-t-transparent"
              />
            ) : succeeded ? (
              "✓ Done"
            ) : (
              "Use"
            )}
          </button>
        )}

        {roleplaysOnly && (
          <span className="shrink-0 rounded px-2 py-1 text-[10px] font-semibold bg-slate-800 text-parchment-600 border border-slate-700">
            Roleplay
          </span>
        )}
      </div>

      <InlineActionError message={inlineError} id={errorId} />
    </div>
  );
}

// ─── FullRecoveryButton ───────────────────────────────────────────────────────
// Fires a single full-recovery action (server applies all three clears).

function FullRecoveryButton({ characterId }: { characterId: string }) {
  const mutation = useCharacterAction(characterId);
  const [inlineError, setInlineError] = useState<string | null>(null);
  const [succeeded, setSucceeded] = useState(false);
  const errorId = React.useId();

  const handleClick = async () => {
    setInlineError(null);
    setSucceeded(false);
    try {
      await mutation.mutateAsync({ actionId: "full-recovery" });
      setSucceeded(true);
    } catch (err) {
      if (err instanceof ApiError && err.status === 422) {
        setInlineError(err.message);
      } else if (err instanceof Error) {
        setInlineError(err.message);
      } else {
        setInlineError("An unexpected error occurred.");
      }
    }
  };

  return (
    <div
      className={`rounded border p-3 space-y-2 ${
        succeeded
          ? "border-gold-700 bg-gold-950/20"
          : "border-burgundy-700 bg-burgundy-950/20"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-parchment-100">Full Recovery</p>
          <p className="text-xs text-parchment-500 mt-0.5">
            Clear all Stress, all HP, and all Armor slots. Full long rest benefit.
          </p>
        </div>
        <button
          type="button"
          onClick={handleClick}
          disabled={mutation.isPending}
          aria-label="Perform full recovery"
          aria-describedby={inlineError ? errorId : undefined}
          aria-busy={mutation.isPending}
          className={`
            shrink-0 rounded px-3 py-1.5 text-xs font-semibold transition-colors
            focus:outline-none focus:ring-2 focus:ring-gold-500 focus:ring-offset-1 focus:ring-offset-slate-900
            disabled:opacity-50 disabled:cursor-wait
            ${
              succeeded
                ? "bg-gold-800 text-gold-200"
                : "bg-burgundy-700 text-parchment-100 hover:bg-burgundy-600"
            }
          `}
        >
          {mutation.isPending ? (
            <span
              aria-hidden="true"
              className="inline-block h-3 w-3 animate-spin rounded-full border border-current border-t-transparent"
            />
          ) : succeeded ? (
            "✓ Done"
          ) : (
            "Recover"
          )}
        </button>
      </div>
      <InlineActionError message={inlineError} id={errorId} />
    </div>
  );
}

// ─── Main modal ───────────────────────────────────────────────────────────────

export function DowntimeModal({ characterId, open, onClose }: DowntimeModalProps) {
  const [restType, setRestType] = useState<"short" | "long">("short");
  const { activeCharacter } = useCharacterStore();

  const handleClose = () => {
    onClose();
  };

  const shortRestActions: RestActionButtonProps[] = [
    {
      characterId,
      label: "Clear Stress",
      description: "Clear 2 Stress (1d4+Tier). Helps recover from mental strain.",
      actionId: "clear-stress",
      params: { n: 2 },
    },
    {
      characterId,
      label: "Tend Wounds",
      description: "Clear 1 HP (1d4+Tier). Patch up injuries during a short break.",
      actionId: "clear-hp",
      params: { n: 1 },
    },
    {
      characterId,
      label: "Prepare",
      description:
        "Take time to prepare — commune with allies, review your notes, center yourself. Gain 1 Hope (or 2 with an ally).",
      actionId: "prepare-rest",
      roleplaysOnly: true,
    },
  ];

  const longRestActions: RestActionButtonProps[] = [
    {
      characterId,
      label: "Clear Stress",
      description: "Clear 2 Stress. Part of a long rest.",
      actionId: "clear-stress",
      params: { n: 2 },
    },
    {
      characterId,
      label: "Tend Wounds",
      description: "Clear 1 HP. Part of a long rest.",
      actionId: "clear-hp",
      params: { n: 1 },
    },
    {
      characterId,
      label: "Repair Armor",
      description: "Clear 1 Armor slot. Patch your armor during the rest.",
      actionId: "clear-armor",
      params: { n: 1 },
    },
    {
      characterId,
      label: "Prepare",
      description: "Gain 1 Hope (or 2 with an ally). Roleplay only.",
      actionId: "prepare-rest",
      roleplaysOnly: true,
    },
  ];

  const actions = restType === "short" ? shortRestActions : longRestActions;

  return (
    <Dialog.Root open={open} onOpenChange={(v) => !v && handleClose()}>
      <Dialog.Portal>
        <Dialog.Overlay
          className="
            fixed inset-0 z-50 bg-black/70 backdrop-blur-sm
            data-[state=open]:animate-fade-in
          "
        />
        <Dialog.Content
          className="
            fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2
            rounded-xl border border-burgundy-800 bg-slate-900 p-6 shadow-card-fantasy-hover
            data-[state=open]:animate-fade-in
            focus:outline-none
            max-h-[90vh] overflow-y-auto
          "
        >
          {/* Header */}
          <div className="mb-5 flex items-start justify-between">
            <div>
              <Dialog.Title className="font-serif text-lg font-semibold text-parchment-100">
                Downtime
              </Dialog.Title>
              <Dialog.Description className="mt-0.5 text-xs text-parchment-500">
                {activeCharacter?.name
                  ? `${activeCharacter.name} — choose rest actions below.`
                  : "Choose rest actions and apply their mechanical effects."}
              </Dialog.Description>
            </div>
            <Dialog.Close
              className="
                rounded p-1 text-parchment-600 hover:text-parchment-300
                hover:bg-slate-800 transition-colors
                focus:outline-none focus:ring-2 focus:ring-gold-500
              "
              aria-label="Close downtime modal"
            >
              ✕
            </Dialog.Close>
          </div>

          {/* Body */}
          <div className="space-y-4">
            <RestTypeToggle value={restType} onChange={setRestType} />

            {/* Contextual note */}
            <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-3 text-xs text-parchment-400">
              {restType === "short" ? (
                <p>
                  <span className="font-medium text-parchment-300">Short Rest (~1 hour).</span>{" "}
                  Choose 2 downtime moves. Domain cards may be freely swapped between loadout and vault.
                </p>
              ) : (
                <p>
                  <span className="font-medium text-parchment-300">Long Rest (several hours).</span>{" "}
                  Choose 2 downtime moves, or take a Full Recovery. Domain cards may be freely swapped.
                </p>
              )}
            </div>

            {/* Individual action buttons */}
            <div className="space-y-2">
              {actions.map((action) => (
                <RestActionButton key={action.label} {...action} />
              ))}
            </div>

            {/* Full Recovery — long rest only */}
            {restType === "long" && (
              <FullRecoveryButton characterId={characterId} />
            )}

            <button
              onClick={handleClose}
              className="
                w-full rounded-lg py-2.5 font-semibold text-sm
                bg-slate-700 text-parchment-200 hover:bg-slate-600
                transition-colors
                focus:outline-none focus:ring-2 focus:ring-gold-500 focus:ring-offset-2 focus:ring-offset-slate-900
              "
            >
              Done
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
