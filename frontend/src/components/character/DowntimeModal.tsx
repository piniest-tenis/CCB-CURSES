"use client";

/**
 * src/components/character/DowntimeModal.tsx
 *
 * Radix Dialog for short/long rest.
 * Uses useRest mutation and shows cleared slots in success state.
 */

import React, { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import type { RestResult, DowntimeAction } from "@shared/types";
import { useRest } from "@/hooks/useCharacter";
import { useCharacterStore } from "@/store/characterStore";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface DowntimeModalProps {
  characterId: string;
  open: boolean;
  onClose: () => void;
}

// ---------------------------------------------------------------------------
// Rest type toggle
// ---------------------------------------------------------------------------

interface RestTypeToggleProps {
  value: "short" | "long";
  onChange: (v: "short" | "long") => void;
}

function RestTypeToggle({ value, onChange }: RestTypeToggleProps) {
  return (
    <div className="flex rounded-lg border border-burgundy-800 overflow-hidden">
      {(["short", "long"] as const).map((type) => (
        <button
          key={type}
          onClick={() => onChange(type)}
          className={`
            flex-1 py-2 text-sm font-semibold capitalize transition-colors
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

// ---------------------------------------------------------------------------
// Success state — shows cleared slots
// ---------------------------------------------------------------------------

interface ClearedDisplayProps {
  result: RestResult;
}

function ClearedDisplay({ result }: ClearedDisplayProps) {
  const { cleared, actionsAvailable } = result;
  const anythingCleared = cleared.hp > 0 || cleared.stress > 0 || cleared.armor > 0;

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="rounded-lg border border-gold-700 bg-gold-950/30 p-4">
        <h3 className="mb-2 text-sm font-semibold text-gold-400">
          Rest Complete
        </h3>
        {anythingCleared ? (
          <div className="flex gap-4">
            {cleared.hp > 0 && (
              <div className="flex flex-col items-center">
                <span className="text-xl font-bold text-burgundy-400">
                  {cleared.hp}
                </span>
                <span className="text-xs text-parchment-500 uppercase tracking-wider">
                  HP cleared
                </span>
              </div>
            )}
            {cleared.stress > 0 && (
              <div className="flex flex-col items-center">
                <span className="text-xl font-bold text-gold-400">
                  {cleared.stress}
                </span>
                <span className="text-xs text-parchment-500 uppercase tracking-wider">
                  Stress cleared
                </span>
              </div>
            )}
            {cleared.armor > 0 && (
              <div className="flex flex-col items-center">
                <span className="text-xl font-bold text-parchment-400">
                  {cleared.armor}
                </span>
                <span className="text-xs text-parchment-500 uppercase tracking-wider">
                  Armor cleared
                </span>
              </div>
            )}
          </div>
        ) : (
          <p className="text-xs text-parchment-500 italic">
            Nothing was cleared by this rest.
          </p>
        )}
      </div>

      {actionsAvailable.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-semibold text-parchment-300">
            Downtime Actions Available
          </h3>
          <ul className="space-y-2">
            {actionsAvailable.map((action: DowntimeAction) => (
              <li
                key={action.id}
                className={`
                  rounded border p-3
                  ${
                    action.available
                      ? "border-burgundy-700 bg-slate-850"
                      : "border-slate-700 bg-slate-900 opacity-50"
                  }
                `}
              >
                <p className="text-sm font-medium text-parchment-200">
                  {action.name}
                  {!action.available && (
                    <span className="ml-2 text-xs text-parchment-600">
                      (unavailable)
                    </span>
                  )}
                </p>
                <p className="mt-0.5 text-xs text-parchment-500">
                  {action.description}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main modal
// ---------------------------------------------------------------------------

export function DowntimeModal({ characterId, open, onClose }: DowntimeModalProps) {
  const [restType, setRestType] = useState<"short" | "long">("short");
  const [result, setResult] = useState<RestResult | null>(null);

  const { setCharacter } = useCharacterStore();
  const restMutation = useRest(characterId);

  const handleTakeRest = async () => {
    setResult(null);
    try {
      const res = await restMutation.mutateAsync(restType);
      setResult(res);
      // Sync the character store with the updated character
      setCharacter(res.character);
    } catch {
      // Error displayed via mutation.error below
    }
  };

  const handleClose = () => {
    setResult(null);
    restMutation.reset();
    onClose();
  };

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
          "
        >
          {/* Header */}
          <div className="mb-5 flex items-start justify-between">
            <div>
              <Dialog.Title className="font-serif text-lg font-semibold text-parchment-100">
                Downtime
              </Dialog.Title>
              <Dialog.Description className="mt-0.5 text-xs text-parchment-500">
                Choose a rest type and take a break to recover.
              </Dialog.Description>
            </div>
            <Dialog.Close
              className="
                rounded p-1 text-parchment-600 hover:text-parchment-300
                hover:bg-slate-800 transition-colors
              "
              aria-label="Close"
            >
              ✕
            </Dialog.Close>
          </div>

          {/* Body */}
          <div className="space-y-4">
            {!result && (
              <>
                <RestTypeToggle value={restType} onChange={setRestType} />

                {/* Explanation */}
                <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-3 text-xs text-parchment-400 space-y-1">
                  {restType === "short" ? (
                    <>
                      <p className="font-medium text-parchment-300">Short Rest</p>
                      <p>Clear all Stress. Take any available short rest downtime actions.</p>
                    </>
                  ) : (
                    <>
                      <p className="font-medium text-parchment-300">Long Rest</p>
                      <p>Clear all HP, Stress, and Armor slots. Take available long rest downtime actions.</p>
                    </>
                  )}
                </div>

                {restMutation.isError && (
                  <div className="rounded border border-burgundy-600 bg-burgundy-950/40 px-3 py-2 text-xs text-burgundy-300">
                    {restMutation.error?.message ?? "Failed to take rest. Please try again."}
                  </div>
                )}

                <button
                  onClick={handleTakeRest}
                  disabled={restMutation.isPending}
                  className="
                    w-full rounded-lg py-2.5 font-semibold text-sm
                    bg-burgundy-700 text-parchment-100
                    hover:bg-burgundy-600 disabled:opacity-50 disabled:cursor-not-allowed
                    transition-colors shadow-glow-burgundy
                  "
                >
                  {restMutation.isPending ? "Taking rest…" : `Take ${restType === "short" ? "Short" : "Long"} Rest`}
                </button>
              </>
            )}

            {result && (
              <>
                <ClearedDisplay result={result} />
                <button
                  onClick={handleClose}
                  className="
                    w-full rounded-lg py-2.5 font-semibold text-sm
                    bg-slate-700 text-parchment-200 hover:bg-slate-600
                    transition-colors
                  "
                >
                  Done
                </button>
              </>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
