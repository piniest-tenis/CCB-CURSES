"use client";

/**
 * src/components/character/DowntimeProjectsPanel.tsx
 *
 * Collapsible "Projects" panel on the character sheet.
 *
 * For each project in character.downtimeProjects:
 *   - Project name + source card name (looked up from vault/loadout cards)
 *   - Countdown progress pips: countdownCurrent / countdownMax filled
 *   - "Tick" button → tick-project { projectId } (disabled if completed)
 *   - Inline notes textarea (debounced 800ms PATCH)
 *   - Abandon button (trash icon) → DELETE /projects/{projectId} with confirm
 *   - Completed projects greyed out, hidden by default with "Show N completed" toggle
 *
 * "New Project" inline form:
 *   - Name (required)
 *   - Countdown steps (1–20)
 *   - Source card dropdown (from current loadout cards + free-text fallback)
 *   Calls POST /characters/{characterId}/projects
 *
 * Inline errors (role="alert") appear near the button that triggered them.
 */

import React, { useState, useRef, useCallback } from "react";
import type { DowntimeProject } from "@shared/types";
import { useCharacterStore } from "@/store/characterStore";
import { useDomainCard } from "@/hooks/useGameData";
import { apiClient, ApiError } from "@/lib/api";
import { useActionButton, InlineActionError } from "./ActionButton";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseCardId(cardId: string): { domain: string | undefined; id: string } {
  const parts = cardId.includes("/") ? cardId.split("/") : null;
  return { domain: parts?.[0], id: parts?.[1] ?? cardId };
}

function ProgressPips({ current, max }: { current: number; max: number }) {
  return (
    <div
      className="flex flex-wrap gap-1"
      role="meter"
      aria-valuenow={current}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-label={`Progress: ${current} of ${max}`}
    >
      {Array.from({ length: max }, (_, i) => {
        const filled = i < current;
        return (
          <span
            key={i}
            aria-hidden="true"
            className={`
              h-3 w-3 rounded-sm border transition-colors
              ${filled ? "bg-[#577399] border-[#577399]" : "bg-transparent border-slate-600"}
            `}
          />
        );
      })}
    </div>
  );
}

// ─── CardNameDisplay ──────────────────────────────────────────────────────────
// Resolves cardId → card name for project source display.

function CardNameDisplay({ cardId }: { cardId: string }) {
  const { domain, id } = parseCardId(cardId);
  const { data: card } = useDomainCard(domain, id);
  return <>{card?.name ?? cardId}</>;
}

// ─── ProjectNotesField ────────────────────────────────────────────────────────
// Debounced PATCH to /projects/{projectId} with 800ms delay.

interface ProjectNotesFieldProps {
  characterId:  string;
  projectId:    string;
  initialNotes: string | null;
}

function ProjectNotesField({ characterId, projectId, initialNotes }: ProjectNotesFieldProps) {
  const [value,    setValue]    = useState(initialNotes ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleUpdate = useCallback(
    (notes: string) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(async () => {
        setIsSaving(true);
        try {
          await apiClient.patch(
            `/characters/${characterId}/projects/${projectId}`,
            { notes }
          );
        } catch {
          // Non-fatal: notes save failure doesn't block the user
        } finally {
          setIsSaving(false);
        }
      }, 800);
    },
    [characterId, projectId]
  );

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setValue(e.target.value);
    scheduleUpdate(e.target.value);
  };

  return (
    <div className="relative">
      <textarea
        rows={2}
        value={value}
        onChange={handleChange}
        placeholder="Project notes…"
        aria-label="Project notes"
        className="
          w-full resize-none rounded border border-burgundy-800/60 bg-slate-950
          px-2 py-1.5 text-xs text-parchment-400 placeholder-parchment-700
          focus:outline-none focus:border-gold-600 transition-colors
        "
      />
      {isSaving && (
        <span
          aria-live="polite"
          aria-label="Saving notes"
          className="absolute bottom-2 right-2 h-2 w-2 animate-spin rounded-full border border-parchment-600 border-t-transparent"
        />
      )}
    </div>
  );
}

// ─── AbandonButton ────────────────────────────────────────────────────────────
// DELETE /characters/{characterId}/projects/{projectId} with inline confirm.

interface AbandonButtonProps {
  characterId: string;
  projectId:   string;
  projectName: string;
}

function AbandonButton({ characterId, projectId, projectName }: AbandonButtonProps) {
  const { setCharacter }                    = useCharacterStore();
  const [confirmOpen, setConfirmOpen]       = useState(false);
  const [isDeleting,  setIsDeleting]        = useState(false);
  const [deleteError, setDeleteError]       = useState<string | null>(null);
  const errorId = React.useId();

  const handleDelete = async () => {
    setIsDeleting(true);
    setDeleteError(null);
    try {
      // DELETE returns 204 No Content; we then reload the character to sync state.
      await apiClient.delete(`/characters/${characterId}/projects/${projectId}`);
      // Re-fetch the character to get the updated projects list.
      const updated = await apiClient.get<{ character: Parameters<typeof setCharacter>[0] }>(
        `/characters/${characterId}`
      );
      if (updated && "character" in updated) {
        setCharacter((updated as { character: Parameters<typeof setCharacter>[0] }).character);
      } else {
        // If the response itself is the character (unwrapped by apiClient):
        setCharacter(updated as unknown as Parameters<typeof setCharacter>[0]);
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setDeleteError(err.message);
      } else {
        setDeleteError("Failed to abandon project. Please try again.");
      }
    } finally {
      setIsDeleting(false);
      setConfirmOpen(false);
    }
  };

  if (confirmOpen) {
    return (
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm text-parchment-400">
          Abandon <span className="font-semibold text-parchment-200">{projectName}</span>?
        </span>
        <button
          type="button"
          onClick={handleDelete}
          disabled={isDeleting}
          aria-label={`Confirm abandon project: ${projectName}`}
          aria-busy={isDeleting}
          className="
            rounded px-2 py-0.5 text-xs font-semibold
            bg-[#fe5f55]/20 text-[#fe5f55] border border-[#fe5f55]/40
            hover:bg-[#fe5f55]/30 disabled:opacity-50 disabled:cursor-wait
            transition-colors focus:outline-none focus:ring-1 focus:ring-[#fe5f55]
          "
        >
          {isDeleting ? (
            <span
              aria-hidden="true"
              className="inline-block h-3 w-3 animate-spin rounded-full border border-current border-t-transparent"
            />
          ) : (
            "Abandon"
          )}
        </button>
        <button
          type="button"
          onClick={() => setConfirmOpen(false)}
          className="
            rounded px-2 py-0.5 text-xs text-parchment-500
            hover:text-parchment-300 transition-colors
            focus:outline-none focus:ring-1 focus:ring-gold-500
          "
        >
          Keep
        </button>
        {deleteError && (
          <p role="alert" className="w-full text-sm text-[#fe5f55]" id={errorId}>
            {deleteError}
          </p>
        )}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setConfirmOpen(true)}
      aria-label={`Abandon project: ${projectName}`}
      title="Abandon project"
      className="
        h-7 w-7 flex items-center justify-center rounded
        text-parchment-600 hover:text-[#fe5f55] hover:bg-[#fe5f55]/10
        transition-colors focus:outline-none focus:ring-1 focus:ring-[#fe5f55]
        shrink-0
      "
    >
      {/* Trash icon (SVG) */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 20 20"
        fill="currentColor"
        className="h-4 w-4"
        aria-hidden="true"
      >
        <path
          fillRule="evenodd"
          d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z"
          clipRule="evenodd"
        />
      </svg>
    </button>
  );
}

// ─── ProjectCard ──────────────────────────────────────────────────────────────

interface ProjectCardProps {
  project:     DowntimeProject;
  characterId: string;
}

function ProjectCard({ project, characterId }: ProjectCardProps) {
  const { fire, isPending, inlineError } = useActionButton(characterId);
  const errorId    = React.useId();
  const isCompleted = project.completed;

  return (
    <div
      className={`
        rounded-lg border p-3 space-y-2.5 transition-opacity
        ${
          isCompleted
            ? "opacity-50 border-slate-700 bg-slate-900/40"
            : "border-burgundy-800 bg-slate-850"
        }
      `}
    >
      {/* Header: name + source + tick + abandon */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            {isCompleted && (
              <span aria-label="Completed" className="text-emerald-500 text-sm font-bold shrink-0">
                ✓
              </span>
            )}
            <p
              className={`text-sm font-semibold truncate ${
                isCompleted ? "text-parchment-500 line-through" : "text-parchment-200"
              }`}
            >
              {project.name}
            </p>
          </div>

          {/* Source card name (resolved via hook if possible) */}
          {project.cardId && (
            <p className="text-sm text-parchment-600 mt-0.5">
              From card:{" "}
              <span className="text-parchment-500">
                <CardNameDisplay cardId={project.cardId} />
              </span>
            </p>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1 shrink-0">
          {/* Tick button (disabled when completed) */}
          {!isCompleted ? (
            <button
              type="button"
              onClick={() => fire("tick-project", { projectId: project.projectId })}
              disabled={isPending}
              aria-label={`Tick progress for project: ${project.name}`}
              aria-describedby={inlineError ? errorId : undefined}
              aria-busy={isPending}
              className="
                rounded px-2.5 py-1 text-xs font-semibold
                bg-[#577399]/20 text-[#577399] border border-[#577399]/40
                hover:bg-[#577399]/30 disabled:opacity-50 disabled:cursor-wait
                transition-colors focus:outline-none focus:ring-2 focus:ring-[#577399]
              "
            >
              {isPending ? (
                <span
                  aria-hidden="true"
                  className="inline-block h-3 w-3 animate-spin rounded-full border border-current border-t-transparent"
                />
              ) : (
                "Tick"
              )}
            </button>
          ) : (
            <span
              className="rounded px-2 py-1 text-xs font-semibold bg-slate-800 text-parchment-600 border border-slate-700"
              aria-label="Project completed — ticking disabled"
            >
              Done
            </span>
          )}

          {/* Abandon button */}
          <AbandonButton
            characterId={characterId}
            projectId={project.projectId}
            projectName={project.name}
          />
        </div>
      </div>

      {/* Progress pips */}
      <div className="space-y-1">
        <ProgressPips
          current={project.countdownCurrent}
          max={project.countdownMax}
        />
        <p className="text-sm text-parchment-600">
          {project.countdownCurrent}/{project.countdownMax}
          {isCompleted && " — Complete"}
        </p>
      </div>

      {/* Inline action error */}
      <InlineActionError message={inlineError} id={errorId} />

      {/* Notes (debounced PATCH) */}
      <ProjectNotesField
        characterId={characterId}
        projectId={project.projectId}
        initialNotes={project.notes}
      />
    </div>
  );
}

// ─── NewProjectForm ───────────────────────────────────────────────────────────

interface NewProjectFormProps {
  characterId: string;
  onCreated:   () => void;
  onCancel:    () => void;
}

function NewProjectForm({ characterId, onCreated, onCancel }: NewProjectFormProps) {
  const { setCharacter, activeCharacter } = useCharacterStore();
  const [name,         setName]         = useState("");
  const [countdownMax, setCountdownMax] = useState(3);
  // cardSource: "" means no source card
  const [cardSource,   setCardSource]   = useState("");
  // freeText fallback when cardId is not in loadout
  const [freeTextCard, setFreeTextCard] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error,        setError]        = useState<string | null>(null);
  const errorId = React.useId();

  // Build dropdown options from the character's current loadout
  const loadoutCards = activeCharacter?.domainLoadout ?? [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    // Resolve the cardId to submit
    const resolvedCardId =
      cardSource === "__freetext__"
        ? freeTextCard.trim() || null
        : cardSource || null;

    setIsSubmitting(true);
    setError(null);
    try {
      const updated = await apiClient.post<{ character: Parameters<typeof setCharacter>[0] }>(
        `/characters/${characterId}/projects`,
        {
          name: name.trim(),
          countdownMax,
          cardId: resolvedCardId,
        }
      );
      // Sync store with the returned character
      if (updated && "character" in updated) {
        setCharacter((updated as { character: Parameters<typeof setCharacter>[0] }).character);
      } else {
        setCharacter(updated as unknown as Parameters<typeof setCharacter>[0]);
      }
      onCreated();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Failed to create project. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-lg border border-gold-800/50 bg-slate-900 p-3 space-y-3"
      aria-label="New project form"
    >
      <h4 className="text-xs font-semibold uppercase tracking-wider text-gold-600">
        New Project
      </h4>

      <div className="space-y-2">
        {/* Name (required) */}
        <div>
          <label
            htmlFor="new-project-name"
            className="text-xs uppercase tracking-wider text-parchment-600 block mb-0.5"
          >
            Name *
          </label>
          <input
            id="new-project-name"
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Project name…"
            aria-required="true"
            className="
              w-full rounded bg-slate-850 px-2 py-1.5 text-sm text-parchment-200
              border border-burgundy-800 focus:outline-none focus:ring-2 focus:ring-gold-500
              placeholder-parchment-700 transition-colors
            "
          />
        </div>

        {/* Countdown steps (1–20) */}
        <div>
          <label
            htmlFor="new-project-countdown"
            className="text-xs uppercase tracking-wider text-parchment-600 block mb-0.5"
          >
            Countdown Steps
          </label>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCountdownMax((v) => Math.max(1, v - 1))}
              disabled={countdownMax <= 1}
              aria-label="Decrease countdown steps"
              className="
                h-8 w-8 rounded border border-burgundy-800 bg-slate-900
                text-xs text-parchment-500 hover:bg-burgundy-900/30
                disabled:opacity-25 disabled:cursor-not-allowed
                transition-colors flex items-center justify-center
                focus:outline-none focus:ring-1 focus:ring-gold-500
              "
            >
              −
            </button>
            <input
              id="new-project-countdown"
              type="number"
              min={1}
              max={20}
              value={countdownMax}
              onChange={(e) => {
                const v = parseInt(e.target.value, 10);
                if (!isNaN(v) && v >= 1 && v <= 20) setCountdownMax(v);
              }}
              aria-label="Countdown steps required"
              className="
                w-16 rounded bg-slate-850 px-2 py-1.5 text-sm text-center
                text-parchment-200 border border-burgundy-800
                focus:outline-none focus:ring-2 focus:ring-gold-500 transition-colors
                [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none
              "
            />
            <button
              type="button"
              onClick={() => setCountdownMax((v) => Math.min(20, v + 1))}
              disabled={countdownMax >= 20}
              aria-label="Increase countdown steps"
              className="
                h-8 w-8 rounded border border-burgundy-800 bg-slate-900
                text-xs text-parchment-500 hover:bg-gold-900/20 hover:text-gold-300
                disabled:opacity-25 disabled:cursor-not-allowed
                transition-colors flex items-center justify-center
                focus:outline-none focus:ring-1 focus:ring-gold-500
              "
            >
              +
            </button>
            <span className="text-xs text-parchment-600">steps</span>
          </div>
        </div>

        {/* Source card (optional) — dropdown from loadout, or free text */}
        <div>
          <label
            htmlFor="new-project-card"
            className="text-xs uppercase tracking-wider text-parchment-600 block mb-0.5"
          >
            Source Card (optional)
          </label>
          <select
            id="new-project-card"
            value={cardSource}
            onChange={(e) => {
              setCardSource(e.target.value);
              if (e.target.value !== "__freetext__") setFreeTextCard("");
            }}
            className="
               w-full rounded bg-slate-850 px-2 py-1.5 text-sm text-parchment-300
              border border-burgundy-800 focus:outline-none focus:ring-2 focus:ring-gold-500
              transition-colors
            "
          >
            <option value="">None</option>
            {loadoutCards.map((cardId) => (
              <LoadoutCardOption key={cardId} cardId={cardId} />
            ))}
            <option value="__freetext__">Other (enter ID)…</option>
          </select>

          {/* Free-text input when "Other" is selected */}
          {cardSource === "__freetext__" && (
            <input
              type="text"
              value={freeTextCard}
              onChange={(e) => setFreeTextCard(e.target.value)}
              placeholder="Card ID or name…"
              aria-label="Custom card source"
              className="
                mt-1.5 w-full rounded bg-slate-850 px-2 py-1.5 text-sm text-parchment-300
                border border-burgundy-800 focus:outline-none focus:ring-2 focus:ring-gold-500
                placeholder-parchment-700 transition-colors
              "
            />
          )}
        </div>
      </div>

      {error && <InlineActionError message={error} id={errorId} />}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isSubmitting || !name.trim()}
          aria-busy={isSubmitting}
          aria-describedby={error ? errorId : undefined}
          className="
            rounded px-3 py-1.5 text-sm font-semibold
            bg-burgundy-700 text-parchment-100 hover:bg-burgundy-600
            disabled:opacity-50 disabled:cursor-not-allowed
            transition-colors focus:outline-none focus:ring-2 focus:ring-gold-500
          "
        >
          {isSubmitting ? "Creating…" : "Create"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="
            rounded px-3 py-1.5 text-sm font-semibold
            bg-slate-700 text-parchment-400 hover:bg-slate-600
            transition-colors focus:outline-none focus:ring-2 focus:ring-gold-500
          "
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

// ─── LoadoutCardOption ────────────────────────────────────────────────────────
// Select <option> that resolves a cardId to a display name via useDomainCard.

function LoadoutCardOption({ cardId }: { cardId: string }) {
  const { domain, id } = parseCardId(cardId);
  const { data: card } = useDomainCard(domain, id);

  return (
    <option value={cardId}>
      {card ? `${card.name} (${card.domain} Lv${card.level})` : cardId}
    </option>
  );
}

// ─── DowntimeProjectsPanel ────────────────────────────────────────────────────

export function DowntimeProjectsPanel() {
  const { activeCharacter } = useCharacterStore();
  const [isExpanded,    setIsExpanded]    = useState(true);
  const [showCompleted, setShowCompleted] = useState(false);
  const [showNewForm,   setShowNewForm]   = useState(false);

  if (!activeCharacter) return null;

  const { downtimeProjects, characterId } = activeCharacter;
  const panelId = "projects-panel-content";

  const activeProjects    = downtimeProjects.filter((p) => !p.completed);
  const completedProjects = downtimeProjects.filter((p) => p.completed);
  const displayProjects   = showCompleted ? downtimeProjects : activeProjects;

  return (
    <section
      className="rounded-xl border border-burgundy-900 bg-slate-900/80 p-5 shadow-card"
      aria-label="Downtime Projects"
      data-field-key="downtime"
    >
      {/* Header row: toggle + count badge + "New" button */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setIsExpanded((v) => !v)}
          aria-expanded={isExpanded}
          aria-controls={panelId}
          className="flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-gold-500 rounded"
        >
          <h2 className="font-serif text-sm font-semibold uppercase tracking-widest text-gold-600">
            Projects
          </h2>

          {/* Active project count badge */}
          {activeProjects.length > 0 && (
            <span
              className="
                rounded-full bg-[#577399]/20 border border-[#577399]/40
                px-2 py-0 text-xs font-bold text-[#577399]
              "
              aria-label={`${activeProjects.length} active project${activeProjects.length !== 1 ? "s" : ""}`}
            >
              {activeProjects.length}
            </span>
          )}

          <span
            aria-hidden="true"
            className={`text-parchment-500 text-xs transition-transform duration-150 ${
              isExpanded ? "rotate-180" : ""
            }`}
          >
            ▼
          </span>
        </button>

        {isExpanded && !showNewForm && (
          <button
            type="button"
            onClick={() => setShowNewForm(true)}
            aria-label="Create new downtime project"
            className="
              rounded px-2.5 py-1 text-xs font-semibold
              bg-burgundy-800/60 text-parchment-300 border border-burgundy-700
              hover:bg-burgundy-700 transition-colors
              focus:outline-none focus:ring-2 focus:ring-gold-500
            "
          >
            + New
          </button>
        )}
      </div>

      {isExpanded && (
        <div id={panelId} className="mt-4 space-y-3">
          {/* New project inline form */}
          {showNewForm && (
            <NewProjectForm
              characterId={characterId}
              onCreated={() => setShowNewForm(false)}
              onCancel={() => setShowNewForm(false)}
            />
          )}

          {/* Empty state */}
          {displayProjects.length === 0 && !showNewForm && (
            <p className="text-sm text-parchment-600 italic">
              No active projects. Domain cards with downtime projects will appear here
              when added to your loadout.
            </p>
          )}

          {/* Project cards */}
          {displayProjects.map((project) => (
            <ProjectCard
              key={project.projectId}
              project={project}
              characterId={characterId}
            />
          ))}

          {/* Show/hide completed toggle */}
          {completedProjects.length > 0 && (
            <button
              type="button"
              onClick={() => setShowCompleted((v) => !v)}
              aria-pressed={showCompleted}
              className="
                text-sm text-parchment-600 hover:text-parchment-400
                transition-colors focus:outline-none focus:ring-1 focus:ring-gold-500 rounded
              "
            >
              {showCompleted
                ? `Hide ${completedProjects.length} completed project${completedProjects.length !== 1 ? "s" : ""}`
                : `Show ${completedProjects.length} completed project${completedProjects.length !== 1 ? "s" : ""}`}
            </button>
          )}
        </div>
      )}
    </section>
  );
}
