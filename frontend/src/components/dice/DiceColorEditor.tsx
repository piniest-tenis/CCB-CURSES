"use client";

/**
 * src/components/dice/DiceColorEditor.tsx
 *
 * Inline editor for customizing dice colors (Hope, Fear, General).
 * Each category shows:
 *   - Face color picker + hex input
 *   - Label (number) color picker + hex input
 *   - A static CSS d12 preview showing face "12"
 *
 * Validates Hope vs Fear face-color Delta-E >= 50.
 * Used on the character sheet header and the dashboard profile card.
 */

import React, { useState, useCallback, useEffect, useRef } from "react";
import type { DiceColorPrefs, DieColorPair } from "@shared/types";
import { deltaE, MIN_HOPE_FEAR_DELTA_E } from "@/lib/colorDistance";
import { SYSTEM_DEFAULTS, GM_SYSTEM_DEFAULTS } from "@/lib/diceColorResolver";

// ─── Types ────────────────────────────────────────────────────────────────────

interface DiceColorEditorProps {
  /** Current saved preferences (may be sparse). */
  value: DiceColorPrefs | undefined;
  /** Inherited defaults from the next level in the cascade (user prefs or system). */
  defaults: Required<DiceColorPrefs>;
  /** Called on every valid change. */
  onChange: (prefs: DiceColorPrefs) => void;
  /** If true, only shows the "General" category (for GM dice). */
  gmMode?: boolean;
}

type Category = "hope" | "fear" | "general";
type ColorField = "diceColor" | "labelColor";

const CATEGORY_META: Record<Category, { label: string; description: string }> = {
  hope:    { label: "Hope Die",     description: "d12 — determines Hope vs Fear" },
  fear:    { label: "Fear Die",     description: "d12 — determines Hope vs Fear" },
  general: { label: "General Dice", description: "All other dice (damage, action, etc.)" },
};

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

// ─── Static D12 Preview (CSS-only) ───────────────────────────────────────────

function D12Preview({ faceColor, labelColor }: { faceColor: string; labelColor: string }) {
  return (
    <div
      className="relative w-14 h-14 shrink-0"
      aria-hidden="true"
    >
      {/* Pentagon-ish d12 shape via clip-path */}
      <div
        className="absolute inset-0 rounded-md"
        style={{
          backgroundColor: faceColor,
          clipPath: "polygon(50% 0%, 93% 25%, 93% 75%, 50% 100%, 7% 75%, 7% 25%)",
          filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.4))",
        }}
      />
      {/* Number label */}
      <span
        className="absolute inset-0 flex items-center justify-center font-bold text-lg select-none"
        style={{ color: labelColor }}
      >
        12
      </span>
    </div>
  );
}

// ─── Color Input Row ──────────────────────────────────────────────────────────

interface ColorInputProps {
  label: string;
  value: string;
  onChange: (hex: string) => void;
  error?: string;
}

function ColorInput({ label, value, onChange, error }: ColorInputProps) {
  const [text, setText] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync external changes
  useEffect(() => { setText(value); }, [value]);

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let v = e.target.value;
    // Auto-prepend # if user types without it
    if (v.length > 0 && !v.startsWith("#")) v = "#" + v;
    setText(v);
    if (HEX_RE.test(v)) onChange(v.toLowerCase());
  };

  const handlePickerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const hex = e.target.value.toLowerCase();
    setText(hex);
    onChange(hex);
  };

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-[#b9baa3]/70 w-12 shrink-0">{label}</span>
      {/* Native color picker */}
      <label className="relative shrink-0 cursor-pointer">
        <input
          type="color"
          value={value}
          onChange={handlePickerChange}
          className="sr-only"
          aria-label={`${label} color picker`}
        />
        <div
          className="w-7 h-7 rounded border border-slate-600 cursor-pointer hover:border-[#577399] transition-colors"
          style={{ backgroundColor: value }}
        />
      </label>
      {/* Hex text input */}
      <input
        ref={inputRef}
        type="text"
        value={text}
        onChange={handleTextChange}
        maxLength={7}
        spellCheck={false}
        autoComplete="off"
        className={[
          "w-20 rounded border px-2 py-1 text-xs font-mono",
          "bg-slate-900/60 text-[#f7f7ff]",
          "focus:outline-none focus:ring-1 focus:ring-[#577399]",
          error ? "border-red-500/60" : "border-slate-700",
        ].join(" ")}
        aria-label={`${label} hex code`}
        aria-invalid={!!error}
      />
      {error && <span className="text-xs text-red-400">{error}</span>}
    </div>
  );
}

// ─── Category Editor ──────────────────────────────────────────────────────────

interface CategoryEditorProps {
  category: Category;
  pair: DieColorPair;
  defaults: DieColorPair;
  onFaceChange: (hex: string) => void;
  onLabelChange: (hex: string) => void;
  onReset: () => void;
  isCustomized: boolean;
  faceError?: string;
}

function CategoryEditor({
  category,
  pair,
  onFaceChange,
  onLabelChange,
  onReset,
  isCustomized,
  faceError,
}: CategoryEditorProps) {
  const meta = CATEGORY_META[category];

  return (
    <div className="flex items-start gap-3 py-3">
      {/* Preview die */}
      <D12Preview faceColor={pair.diceColor} labelColor={pair.labelColor} />

      {/* Controls */}
      <div className="flex-1 min-w-0 space-y-2">
        <div className="flex items-center gap-2">
          <h4 className="text-sm font-semibold text-[#f7f7ff]">{meta.label}</h4>
          {isCustomized && (
            <button
              type="button"
              onClick={onReset}
              className="text-xs text-[#577399] hover:text-[#f7f7ff] transition-colors"
              aria-label={`Reset ${meta.label} to default`}
            >
              Reset
            </button>
          )}
        </div>
        <p className="text-xs text-[#b9baa3]/50">{meta.description}</p>
        <ColorInput label="Face" value={pair.diceColor} onChange={onFaceChange} error={faceError} />
        <ColorInput label="Number" value={pair.labelColor} onChange={onLabelChange} />
      </div>
    </div>
  );
}

// ─── Main Editor ──────────────────────────────────────────────────────────────

export function DiceColorEditor({ value, defaults, onChange, gmMode }: DiceColorEditorProps) {
  // Working copy — merge saved values over defaults
  const resolve = useCallback(
    (cat: Category): DieColorPair => value?.[cat] ?? defaults[cat],
    [value, defaults],
  );

  const [hopePair, setHopePair]       = useState<DieColorPair>(resolve("hope"));
  const [fearPair, setFearPair]       = useState<DieColorPair>(resolve("fear"));
  const [generalPair, setGeneralPair] = useState<DieColorPair>(resolve("general"));
  const [deltaError, setDeltaError]   = useState<string | undefined>();

  // Sync when external value changes (e.g. after save round-trip)
  useEffect(() => {
    setHopePair(resolve("hope"));
    setFearPair(resolve("fear"));
    setGeneralPair(resolve("general"));
  }, [resolve]);

  // Validate hope/fear Delta-E
  useEffect(() => {
    if (gmMode) { setDeltaError(undefined); return; }
    const d = deltaE(hopePair.diceColor, fearPair.diceColor);
    if (d < MIN_HOPE_FEAR_DELTA_E) {
      setDeltaError(`Too similar (${d.toFixed(0)}/${MIN_HOPE_FEAR_DELTA_E} min)`);
    } else {
      setDeltaError(undefined);
    }
  }, [hopePair.diceColor, fearPair.diceColor, gmMode]);

  // Emit changes upstream (only when valid)
  const emit = useCallback(
    (h: DieColorPair, f: DieColorPair, g: DieColorPair) => {
      if (!gmMode) {
        const d = deltaE(h.diceColor, f.diceColor);
        if (d < MIN_HOPE_FEAR_DELTA_E) return;
      }

      const prefs: DiceColorPrefs = {};
      // Only include categories that differ from defaults
      if (h.diceColor !== defaults.hope.diceColor || h.labelColor !== defaults.hope.labelColor) {
        prefs.hope = h;
      }
      if (f.diceColor !== defaults.fear.diceColor || f.labelColor !== defaults.fear.labelColor) {
        prefs.fear = f;
      }
      if (g.diceColor !== defaults.general.diceColor || g.labelColor !== defaults.general.labelColor) {
        prefs.general = g;
      }
      onChange(prefs);
    },
    [defaults, onChange, gmMode],
  );

  const updateCategory = (
    cat: Category,
    field: ColorField,
    hex: string,
  ) => {
    let h = hopePair, f = fearPair, g = generalPair;
    if (cat === "hope") {
      h = { ...h, [field]: hex };
      setHopePair(h);
    } else if (cat === "fear") {
      f = { ...f, [field]: hex };
      setFearPair(f);
    } else {
      g = { ...g, [field]: hex };
      setGeneralPair(g);
    }
    emit(h, f, g);
  };

  const resetCategory = (cat: Category) => {
    let h = hopePair, f = fearPair, g = generalPair;
    if (cat === "hope") { h = defaults.hope; setHopePair(h); }
    else if (cat === "fear") { f = defaults.fear; setFearPair(f); }
    else { g = defaults.general; setGeneralPair(g); }
    emit(h, f, g);
  };

  const isCustomized = (cat: Category): boolean => {
    const pair = cat === "hope" ? hopePair : cat === "fear" ? fearPair : generalPair;
    const def = defaults[cat];
    return pair.diceColor !== def.diceColor || pair.labelColor !== def.labelColor;
  };

  const categories: Category[] = gmMode ? ["general"] : ["hope", "fear", "general"];

  return (
    <div className="space-y-0 divide-y divide-[#577399]/15">
      {categories.map((cat) => {
        const pair = cat === "hope" ? hopePair : cat === "fear" ? fearPair : generalPair;
        const faceError = (cat === "hope" || cat === "fear") ? deltaError : undefined;
        return (
          <CategoryEditor
            key={cat}
            category={cat}
            pair={pair}
            defaults={defaults[cat]}
            onFaceChange={(hex) => updateCategory(cat, "diceColor", hex)}
            onLabelChange={(hex) => updateCategory(cat, "labelColor", hex)}
            onReset={() => resetCategory(cat)}
            isCustomized={isCustomized(cat)}
            faceError={faceError}
          />
        );
      })}
      {deltaError && !gmMode && (
        <p className="pt-2 text-xs text-red-400" role="alert">
          Hope and Fear dice face colors must be visually distinct (Delta-E &ge; {MIN_HOPE_FEAR_DELTA_E}).
        </p>
      )}
    </div>
  );
}

// ─── Defaults for GM mode ────────────────────────────────────────────────────

export const GM_DEFAULTS: Required<DiceColorPrefs> = {
  hope:    SYSTEM_DEFAULTS.hope,
  fear:    SYSTEM_DEFAULTS.fear,
  general: { diceColor: GM_SYSTEM_DEFAULTS.diceColor, labelColor: GM_SYSTEM_DEFAULTS.labelColor },
};
