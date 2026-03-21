"use client";

import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { useCharacterStore } from "@/store/characterStore";
import { useUpdateCharacter } from "@/hooks/useCharacter";
import { useRule } from "@/hooks/useGameData";
import { ApiError } from "@/lib/api";
import {
  getFieldSrdHelpText,
  getFieldValue,
  type EditField,
} from "./editSidebarConfig";

interface EditSidebarContextValue {
  openField: (field: EditField, triggerElement?: HTMLElement) => void;
  closeField: () => void;
  activeField: EditField | null;
}

export const EditSidebarContext = React.createContext<EditSidebarContextValue>({
  openField: () => undefined,
  closeField: () => undefined,
  activeField: null,
});

export function useEditSidebar() {
  return React.useContext(EditSidebarContext);
}

interface EditSidebarProviderProps {
  characterId: string;
  children: React.ReactNode;
}

export function EditSidebarProvider({ characterId, children }: EditSidebarProviderProps) {
  const [activeField, setActiveField] = useState<EditField | null>(null);
  const triggerRef = useRef<HTMLElement | null>(null);

  const openField = useCallback((field: EditField, triggerElement?: HTMLElement) => {
    triggerRef.current = triggerElement ?? null;
    setActiveField(field);
  }, []);

  const closeField = useCallback(() => {
    setActiveField(null);
    requestAnimationFrame(() => {
      triggerRef.current?.focus();
      triggerRef.current = null;
    });
  }, []);

  return (
    <EditSidebarContext.Provider value={{ openField, closeField, activeField }}>
      {children}
      <EditSidebar characterId={characterId} />
    </EditSidebarContext.Provider>
  );
}

interface EditableFieldProps {
  field: EditField;
  children: React.ReactNode;
  className?: string;
  activeClassName?: string;
}

export function EditableField({
  field,
  children,
  className = "",
  activeClassName = "ring-2 ring-gold-500/60 rounded",
}: EditableFieldProps) {
  const { openField, activeField } = useEditSidebar();
  const isActive = activeField?.path === field.path;

  return (
    <button
      type="button"
      onClick={(e) => openField(field, e.currentTarget)}
      aria-label={`Edit ${field.label}`}
      aria-haspopup="dialog"
      aria-expanded={isActive}
      className={[
        "cursor-pointer text-left transition-all duration-150",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-500/60 focus-visible:rounded",
        isActive ? activeClassName : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </button>
  );
}

interface EditSidebarProps {
  characterId: string;
}

function EditSidebar({ characterId }: EditSidebarProps) {
  const { activeField, closeField } = useEditSidebar();
  const { activeCharacter, updateField } = useCharacterStore();
  const updateMutation = useUpdateCharacter(characterId);
  const { data: fieldRule, isLoading: isRuleLoading } = useRule(activeField?.helpRuleId);

  const [localValue, setLocalValue] = useState("");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<"idle" | "typing" | "saving" | "saved">("idle");

  const headingId = useId();
  const descriptionId = useId();
  const noteId = useId();
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isOpen = activeField !== null;

  useEffect(() => {
    if (!activeField || !activeCharacter) return;
    const nextValue = getFieldValue(activeCharacter, activeField);
    setLocalValue(nextValue);
    setSaveError(null);
    setSaveState("idle");
  }, [activeField, activeCharacter]);

  useEffect(() => {
    if (!isOpen) return;
    const t = setTimeout(() => inputRef.current?.focus(), 50);
    return () => clearTimeout(t);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        closeField();
      }
    };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [isOpen, closeField]);

  useEffect(() => {
    if (!isOpen || !panelRef.current) return;
    const panel = panelRef.current;
    const selector = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const focusable = Array.from(panel.querySelectorAll<HTMLElement>(selector)).filter(
        (el) => !el.hasAttribute("disabled")
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      }

      if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    panel.addEventListener("keydown", handleTab);
    return () => panel.removeEventListener("keydown", handleTab);
  }, [isOpen]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const persistFieldValue = useCallback(
    async (field: EditField, raw: string) => {
      const current = useCharacterStore.getState().activeCharacter;
      if (!current) return;

      const topKey = field.path.split(".")[0];
      const patch: Record<string, unknown> = {
        [topKey]: (current as unknown as Record<string, unknown>)[topKey],
      };

      try {
        setSaveState("saving");
        await updateMutation.mutateAsync(patch);
        setSaveState("saved");
      } catch (err) {
        let message = "Save failed — changes are still shown locally.";
        if (err instanceof ApiError) message = err.message;
        else if (err instanceof Error) message = err.message;
        setSaveError(message);
        setSaveState("idle");
      }
    },
    [updateMutation]
  );

  const handleChange = useCallback(
    (raw: string) => {
      if (!activeField) return;

      setSaveError(null);
      setSaveState("typing");
      setLocalValue(raw);

      let coerced: unknown = raw;
      if (activeField.inputType === "number") {
        const parsed = parseFloat(raw);
        coerced = Number.isNaN(parsed) ? null : parsed;
      } else if (raw === "") {
        coerced = null;
      }

      updateField(activeField.path, coerced);

      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        void persistFieldValue(activeField, raw);
      }, 300);
    },
    [activeField, persistFieldValue, updateField]
  );

  const helpText = useMemo(
    () => (activeField ? getFieldSrdHelpText(activeField, fieldRule) : null),
    [activeField, fieldRule]
  );

  const describedBy = [helpText ? descriptionId : null, activeField?.note ? noteId : null]
    .filter(Boolean)
    .join(" ");

  return (
    <>
      {isOpen && (
        <div
          aria-hidden="true"
          onClick={closeField}
          className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-sm lg:hidden transition-opacity duration-300"
        />
      )}

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={headingId}
        aria-hidden={!isOpen}
        inert={!isOpen ? ("" as unknown as boolean) : undefined}
        className={[
          "fixed inset-y-0 right-0 z-50 flex h-full w-full max-w-[28rem] flex-col",
          "border-l border-[#577399]/35 bg-[#0f1713] shadow-2xl",
          "transition-transform duration-300 ease-in-out",
          isOpen ? "translate-x-0" : "translate-x-full",
        ].join(" ")}
      >
        <div className="flex items-center justify-between border-b border-[#577399]/25 px-4 py-4 sm:px-5">
          <div>
            <p className="text-[11px] uppercase tracking-[0.24em] text-[#b9baa3]/70">Field editor</p>
            <h2 id={headingId} className="font-serif text-lg font-semibold text-[#f7f7ff]">
              {activeField?.label ?? "Edit"}
            </h2>
          </div>
          <button
            type="button"
            onClick={closeField}
            aria-label="Close edit sidebar"
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#577399]/30 text-[#b9baa3] transition-colors hover:bg-[#577399]/12 hover:text-[#f7f7ff] focus:outline-none focus:ring-2 focus:ring-[#577399]"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-4 py-5 sm:px-5">
          {activeField?.note && (
            <div id={noteId} className="rounded-xl border border-[#577399]/20 bg-[#577399]/8 px-4 py-3 text-sm text-[#b9baa3]">
              {activeField.note}
            </div>
          )}

          <section className="space-y-2 rounded-xl border border-[#577399]/20 bg-[#b9baa3]/[0.06] p-4">
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#b9baa3]/70">
              SRD guidance
            </h3>
            {isRuleLoading && activeField?.helpRuleId ? (
              <p className="text-sm text-[#b9baa3]/70">Loading rules text…</p>
            ) : helpText ? (
              <p id={descriptionId} className="text-sm leading-relaxed text-[#f7f7ff] whitespace-pre-wrap">
                {helpText}
              </p>
            ) : (
              <p className="text-sm text-[#b9baa3]/70">No SRD explanation is available for this field.</p>
            )}
          </section>

          {activeField && (
            <div className="space-y-2">
              <label
                htmlFor="edit-sidebar-input"
                className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#b9baa3]/75"
              >
                {activeField.label}
              </label>

              {activeField.inputType === "textarea" ? (
                <textarea
                  id="edit-sidebar-input"
                  ref={inputRef as React.RefObject<HTMLTextAreaElement>}
                  value={localValue}
                  onChange={(e) => handleChange(e.target.value)}
                  rows={activeField.rows ?? 6}
                  placeholder={activeField.placeholder ?? ""}
                  aria-describedby={describedBy || undefined}
                  className="min-h-[12rem] w-full resize-y rounded-xl border border-[#577399]/35 bg-[#f7f7ff] px-4 py-3 text-sm text-[#0a100d] placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#577399]"
                />
              ) : (
                <input
                  id="edit-sidebar-input"
                  ref={inputRef as React.RefObject<HTMLInputElement>}
                  type={activeField.inputType === "number" ? "number" : "text"}
                  value={localValue}
                  onChange={(e) => handleChange(e.target.value)}
                  placeholder={activeField.placeholder ?? ""}
                  min={activeField.min}
                  max={activeField.max}
                  aria-describedby={describedBy || undefined}
                  className="w-full rounded-xl border border-[#577399]/35 bg-[#f7f7ff] px-4 py-3 text-sm text-[#0a100d] placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#577399]"
                />
              )}

              <div className="min-h-[1.25rem] text-[11px]">
                {saveError ? (
                  <p role="alert" className="text-[#fe5f55]">{saveError}</p>
                ) : saveState === "saving" ? (
                  <span className="text-[#b9baa3]">Saving…</span>
                ) : saveState === "saved" ? (
                  <span className="text-[#b9baa3]/80">Saved automatically</span>
                ) : saveState === "typing" ? (
                  <span className="text-[#b9baa3]/80">Updating…</span>
                ) : null}
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-[#577399]/25 px-4 py-4 sm:px-5">
          <button
            type="button"
            onClick={closeField}
            className="w-full rounded-xl border border-[#577399]/40 bg-[#577399]/15 px-4 py-3 text-sm font-semibold text-[#f7f7ff] transition-colors hover:bg-[#577399]/25 focus:outline-none focus:ring-2 focus:ring-[#577399]"
          >
            Done
          </button>
        </div>
      </div>
    </>
  );
}
