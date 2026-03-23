"use client";

/**
 * src/components/character/ActionButton.tsx
 *
 * Reusable building blocks for the server-action pattern:
 *
 *   <ActionButton characterId={...} actionId="spend-hope" params={{ n: 1 }} label="−" />
 *
 * Design decisions:
 * - NEVER disables the button preemptively; lets the server decide validity.
 * - On 422 INVALID_ACTION, renders an inline role="alert" near the button.
 * - On success, the characterStore is updated by useCharacterAction's onSuccess.
 * - A pending spinner replaces the label while the request is in-flight.
 * - `InlineActionError` can be used standalone when the error belongs to a
 *   broader group of buttons (e.g., tracker slots).
 */

import React from "react";
import { ApiError } from "@/lib/api";
import {
  useCharacterAction,
  type CharacterActionInput,
} from "@/hooks/useCharacter";

// ─── InlineActionError ────────────────────────────────────────────────────────

interface InlineActionErrorProps {
  message: string | null;
  id?: string;
}

export function InlineActionError({ message, id }: InlineActionErrorProps) {
  if (!message) return null;
  return (
    <p
      id={id}
      role="alert"
      aria-live="assertive"
      className="mt-1 text-sm text-[#fe5f55] leading-snug"
    >
      {message}
    </p>
  );
}

// ─── useActionButton ──────────────────────────────────────────────────────────
// Hook that encapsulates the action mutation + inline error state.

export function useActionButton(characterId: string) {
  const mutation = useCharacterAction(characterId);
  const [inlineError, setInlineError] = React.useState<string | null>(null);

  const fire = React.useCallback(
    async (actionId: string, params?: Record<string, unknown>) => {
      setInlineError(null);
      try {
        await mutation.mutateAsync({ actionId, params } as CharacterActionInput);
      } catch (err) {
        if (err instanceof ApiError && err.status === 422) {
          setInlineError(err.message);
        } else if (err instanceof Error) {
          setInlineError(err.message);
        } else {
          setInlineError("An unexpected error occurred.");
        }
      }
    },
    [mutation]
  );

  return {
    fire,
    isPending: mutation.isPending,
    inlineError,
    clearError: () => setInlineError(null),
  };
}

// ─── ActionButton ─────────────────────────────────────────────────────────────

interface ActionButtonProps {
  characterId: string;
  actionId: string;
  params?: Record<string, unknown>;
  label: React.ReactNode;
  /** aria-label for accessibility */
  ariaLabel: string;
  /** Tailwind classes for the button element */
  className?: string;
  /** Show the inline error below the button (default true) */
  showError?: boolean;
  /** Extra callback after a successful action */
  onSuccess?: () => void;
}

export function ActionButton({
  characterId,
  actionId,
  params,
  label,
  ariaLabel,
  className = "",
  showError = true,
  onSuccess,
}: ActionButtonProps) {
  const mutation = useCharacterAction(characterId);
  const [inlineError, setInlineError] = React.useState<string | null>(null);
  const errorId = React.useId();

  const handleClick = async () => {
    setInlineError(null);
    try {
      await mutation.mutateAsync({ actionId, params } as CharacterActionInput);
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
    <div className="flex flex-col">
      <button
        type="button"
        onClick={handleClick}
        aria-label={ariaLabel}
        aria-busy={mutation.isPending}
        aria-describedby={inlineError ? errorId : undefined}
        className={className}
      >
        {mutation.isPending ? (
          <span
            aria-hidden="true"
            className="inline-block h-3 w-3 animate-spin rounded-full border border-current border-t-transparent"
          />
        ) : (
          label
        )}
      </button>
      {showError && <InlineActionError message={inlineError} id={errorId} />}
    </div>
  );
}
