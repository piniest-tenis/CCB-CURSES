/**
 * frontend/src/components/character/CharacterSheet.integration.md
 *
 * Integration guide for adding validation to CharacterSheet.tsx
 *
 * This file shows the specific code changes needed to integrate
 * the validation layer into CharacterSheet.
 */

// ─── STEP 1: Add imports at the top of CharacterSheet.tsx ────────────────────

import { useCharacterValidation } from "@/hooks/useCharacterValidation";
import { CharacterValidationBanner } from "./CharacterValidationBanner";
import { SaveButtonValidationIndicator } from "./CharacterValidationBanner";

// ─── STEP 2: Inside CharacterSheet component, call the validation hook ───────

export function CharacterSheet({ characterId }: CharacterSheetProps) {
  // ... existing code ...

  const { data: character } = useCharacter(characterId);
  const { data: classData } = useClass(character?.classId);

  // NEW: Add validation hook
  const validation = useCharacterValidation(character, classData);

  // ... rest of component ...
}

// ─── STEP 3: Render validation banner before main content ──────────────────

return (
  <div className="space-y-4">
    {/* NEW: Validation banner at top */}
    <CharacterValidationBanner
      violations={validation.violations}
      blockingSave={validation.blockingSave}
      isDismissible={true}
    />

    {/* Existing sheet sections */}
    <SheetHeader character={character} />
    <StatsPanel />
    <TrackersPanel />
    {/* ... etc ... */}
  </div>
);

// ─── STEP 4: Disable save button if violations exist ──────────────────────────

<button
  onClick={handleSaveCharacter}
  disabled={validation.blockingSave}
  className={`
    px-4 py-2 rounded-lg font-semibold transition-all
    ${
      validation.blockingSave
        ? "opacity-50 cursor-not-allowed bg-slate-600 text-slate-400"
        : "bg-[#577399] text-[#f7f7ff] hover:bg-[#577399]/90"
    }
  `}
>
  <div className="flex items-center gap-2">
    <span>Save Character</span>
    {/* Show violation badges on button */}
    <SaveButtonValidationIndicator
      violations={validation.violations}
      blockingSave={validation.blockingSave}
    />
  </div>
</button>

// ─── STEP 5: Optional — show validation status in header ──────────────────────

<div className="flex items-center gap-2 text-xs">
  {validation.isValid ? (
    <span className="text-[#577399] font-semibold">✓ Valid</span>
  ) : (
    <span className="text-[#fe5f55] font-semibold">⚠ Invalid</span>
  )}
  {validation.violations.length > 0 && (
    <span className="text-[#b9baa3]/60">
      ({validation.violations.length} issue{validation.violations.length !== 1 ? "s" : ""})
    </span>
  )}
</div>

// ─── EXAMPLE: Full integration in save handler ──────────────────────────────

const handleSaveCharacter = async () => {
  // Check validation before sending to server
  if (validation.blockingSave) {
    console.warn("Cannot save: character has blocking violations");
    return;
  }

  try {
    await updateCharacter({
      characterId,
      updates: {
        // ... character updates ...
      },
    });
    // Show success message
  } catch (error) {
    console.error("Failed to save:", error);
  }
};

// ─── EXAMPLE: Show helpful message when user tries to save with errors ────────

const handleSaveAttempt = () => {
  if (validation.blockingSave) {
    const errorCount = validation.violations.filter(
      (v) => v.severity === "error"
    ).length;
    alert(
      `Cannot save: ${errorCount} error${errorCount !== 1 ? "s" : ""} must be fixed`
    );
    return;
  }

  handleSaveCharacter();
};

// ─── Integration checklist ─────────────────────────────────────────────────────

/*
 * [ ] Import validation hook and components
 * [ ] Call useCharacterValidation() in component
 * [ ] Render <CharacterValidationBanner /> at top
 * [ ] Disable save button if validation.blockingSave === true
 * [ ] Show validation badges on save button
 * [ ] Test: Try saving invalid character (should be blocked)
 * [ ] Test: Fix violations and verify save re-enabled
 * [ ] Test: Verify violation messages display correctly
 * [ ] Test: Verify SRD page citations are shown
 * [ ] Test: Verify fix suggestions are helpful
 */
