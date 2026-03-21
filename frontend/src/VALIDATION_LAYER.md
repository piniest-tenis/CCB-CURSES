# SRD Compliance Validation Layer

## Overview

The frontend validation layer enforces SRD compliance rules and constraint violations in the character sheet UI in real-time. This prevents players from creating illegal character states and provides helpful guidance for fixing violations.

## Architecture

### Core Hook: `useCharacterValidation`

Located in `frontend/src/hooks/useCharacterValidation.ts`

```typescript
const validation = useCharacterValidation(character, classData);
// Returns:
// {
//   isValid: boolean,
//   violations: ValidationViolation[],
//   blockingSave: boolean  // true if any error-severity violations
// }
```

**Validation Violations Checked:**

1. **Trait Modifiers** — Must sum to +2 (SRD page 3)
   - Each of 6 traits gets one of: +2, +1, +0, −1
   - Exactly 4 traits assigned (sum must be +2)
   - **Error:** Blocking save if invalid

2. **Domain Loadout** — Max 5 cards (SRD page 22-23)
   - Current loadout ≤ 5 cards
   - No duplicate card IDs
   - **Error:** Blocking save if > 5

3. **Armor Score** — Max 12 (SRD page 20)
   - Formula: equipped armor base + level ≤ 12
   - **Error:** Blocking save if > 12

4. **Core Stats** — Range -5 to +8 (SRD page 3)
   - Values outside range are suspicious
   - **Warning:** Non-blocking, but suggests verification

5. **Resource Trackers** — Marked ≤ Max
   - HP marked ≤ HP max
   - Stress marked ≤ stress max
   - Armor marked ≤ armor max
   - **Warning:** Non-blocking

6. **Hope** — Range 0 to hopeMax
   - **Warning:** Non-blocking if out of range

7. **Level** — Must be integer 1-10
   - **Error:** Blocking save if invalid

8. **Domains** — Max 2, must match class
   - Character domains ⊆ class domains
   - Count ≤ 2
   - **Error:** Blocking save if invalid

9. **Advancement** — Level gates (SRD page 22-23)
   - Specialization at level 3+
   - Mastery at level 6+
   - Multiclass only at level 2
   - **Information:** Handled by LevelUpWizard

### Display Components

#### `ValidationDisplay`

Main violation display component. Shows errors and warnings with suggestions and SRD citations.

```typescript
<ValidationDisplay 
  violations={validation.violations}
  blockingSave={validation.blockingSave}
/>
```

**Features:**
- Color-coded by severity (red = error, yellow = warning)
- Includes fix suggestions
- Shows SRD page citations
- Compact mode for badges on buttons

#### `CharacterValidationBanner`

Prominent alert banner at top of character sheet. Shows when violations exist.

```typescript
<CharacterValidationBanner
  violations={validation.violations}
  blockingSave={validation.blockingSave}
  isDismissible={true}
/>
```

#### `LoadoutValidationIndicator`

Real-time feedback for domain loadout management.

```typescript
<LoadoutValidationIndicator
  loadout={character.domainLoadout}
  vault={character.domainVault}
  isFull={domainLoadout.length >= 5}
  canAdd={true}
/>
```

**Features:**
- Capacity bar (X/5 visual indicator)
- Full loadout warning with recall cost hint
- Slot availability counter

#### `ArmorValidationDisplay`

Shows armor score calculation and cap warnings.

```typescript
<ArmorValidationDisplay
  baseArmor={armorBase}
  level={character.level}
  selectedArmorName="Leather Armor"
/>
```

**Features:**
- Real-time score calculation (base + level)
- Over-cap warning (red) with explanation
- At-max indicator (yellow)
- Valid selection confirmation (blue)

### Specialized Validators

For use in individual forms:

#### `validateTraitsForAssignment`

```typescript
const result = validateTraitsForAssignment(traitBonuses);
// Returns: { isValid, message, sum, assigned }
```

Used in `TraitAssignmentPanel` to show real-time feedback as user assigns traits.

#### `validateLoadoutCapacity`

```typescript
const capacity = validateLoadoutCapacity(domainLoadout);
// Returns: { canAdd, current, max, available }
```

Used in `DomainLoadout` to show capacity and enable/disable add button.

#### `validateArmorForEquip`

```typescript
const validation = validateArmorForEquip(baseArmor, level);
// Returns: { isValid, score, max, warning? }
```

Used in armor selection dropdowns to show score and cap warnings for each option.

## Component Integrations

### TraitAssignmentPanel

**Changes:**
- Import `validateTraitsForAssignment` hook
- Display real-time validation feedback
- Show running total of modifiers (+2, +1, +1, -1)
- Color-code: ✓ (green) when valid, ⚠ (red) when invalid

**File:** `frontend/src/components/character/TraitAssignmentPanel.tsx`

### DomainLoadout

**Changes:**
- Import `LoadoutValidationIndicator` component
- Show capacity bar (X/5)
- Disable "Add Card" button when full
- Show recall cost hint when swapping
- Show vault size in swap mode

**File:** `frontend/src/components/character/DomainLoadout.tsx`

### StatsPanel

**Changes:**
- Show current stat usage
- Warn if stats exceed typical ranges
- Show derived stats (evasion, armor) with calculated values

**File:** `frontend/src/components/character/StatsPanel.tsx`

### ArmorSelectionPanel

**Changes:**
- Import `ArmorValidationDisplay` component
- Show armor score calculation for each option
- Disable selection if would exceed cap
- Show score constraint in tooltips

**File:** `frontend/src/components/character/ArmorSelectionPanel.tsx`

### CharacterSheet

**Changes:**
- Import `CharacterValidationBanner` component
- Show validation errors at top of sheet
- Disable save button if `validation.blockingSave === true`
- Show violation badges on save button

**File:** `frontend/src/components/character/CharacterSheet.tsx`

### WeaponSelectionPanel

**Changes:**
- Show burden (one-handed vs two-handed)
- Show proficiency constraints
- Show tier constraints (cannot equip above character tier)

**File:** `frontend/src/components/character/WeaponSelectionPanel.tsx`

## Usage Examples

### Example 1: Character Sheet with Validation Banner

```typescript
import { useCharacterValidation } from "@/hooks/useCharacterValidation";
import { CharacterValidationBanner } from "@/components/character/CharacterValidationBanner";

function CharacterSheet({ characterId }: { characterId: string }) {
  const { data: character } = useCharacter(characterId);
  const { data: classData } = useClass(character?.classId);
  
  const validation = useCharacterValidation(character, classData);

  return (
    <div className="space-y-4">
      {/* Show validation banner if there are violations */}
      <CharacterValidationBanner
        violations={validation.violations}
        blockingSave={validation.blockingSave}
      />

      {/* Character details */}
      <CharacterDetails character={character} />

      {/* Save button — disabled if violations exist */}
      <button
        onClick={handleSave}
        disabled={validation.blockingSave}
        className={validation.blockingSave ? "opacity-50 cursor-not-allowed" : ""}
      >
        Save Character
      </button>
    </div>
  );
}
```

### Example 2: Trait Assignment with Real-Time Feedback

```typescript
import { validateTraitsForAssignment } from "@/hooks/useCharacterValidation";

function TraitAssignmentForm() {
  const [traits, setTraits] = useState({});
  const validation = useMemo(() => validateTraitsForAssignment(traits), [traits]);

  return (
    <div>
      {/* Trait selectors */}
      <TraitSlots traits={traits} onChange={setTraits} />

      {/* Validation feedback */}
      {validation.isValid ? (
        <div className="text-green-600">✓ {validation.message}</div>
      ) : (
        <div className="text-red-600">⚠ {validation.message}</div>
      )}

      {/* Submit button */}
      <button disabled={!validation.isValid}>Continue</button>
    </div>
  );
}
```

### Example 3: Domain Loadout with Capacity Indicator

```typescript
import { LoadoutValidationIndicator } from "@/components/character/LoadoutValidationIndicator";

function DomainLoadout() {
  const { domainLoadout, domainVault } = useCharacterStore();
  const isFull = domainLoadout.length >= 5;

  return (
    <div className="space-y-4">
      {/* Capacity indicator */}
      <LoadoutValidationIndicator
        loadout={domainLoadout}
        vault={domainVault}
        isFull={isFull}
        canAdd={!isFull}
      />

      {/* Add/Swap button — disabled when full */}
      <button disabled={isFull && domainVault.length === 0}>
        {isFull ? "Swap Card" : "Add Card"}
      </button>
    </div>
  );
}
```

## SRD Rule References

All validation rules are cited with SRD page numbers for easy reference:

- **SRD Page 3:** Character creation, trait assignment, core stats
- **SRD Page 20:** Armor Score calculation, cap rules, damage thresholds
- **SRD Page 22-23:** Domain cards, loadout management, recall rules
- **SRD Page 22:** Advancement gating (level 3 specialization, level 6 mastery)

## Error Severity Levels

### Error (Blocking Save)
- Trait modifiers don't sum to +2
- Domain loadout > 5 cards
- Armor score > 12
- Level outside [1, 10]
- Domains don't match class or count > 2

### Warning (Non-Blocking)
- Core stats outside typical range
- Resources marked > max
- Hope out of range
- Future feature constraints

## Testing

To test the validation layer:

1. **Trait Assignment:** Assign bonuses that sum ≠ +2; expect error banner
2. **Domain Loadout:** Add 6th card; expect error and "Add" button disabled
3. **Armor Selection:** Equip armor that would push score > 12; expect warning
4. **Save Button:** Expect disabled state when validation.blockingSave === true
5. **Real-Time Feedback:** Edit traits; observe immediate feedback updates

## Migration Guide

### For Existing Components

To add validation to an existing component:

1. Import the validation hook or component
2. Call the validation function/hook with character data
3. Display violations using `ValidationDisplay` or custom UI
4. Disable save/submit if `blockingSave === true`

### Example: Updating ArmorSelectionPanel

```diff
+ import { ArmorValidationDisplay } from "./ArmorValidationDisplay";
+ import { validateArmorForEquip } from "@/hooks/useCharacterValidation";

export function ArmorSelectionPanel() {
  const [selectedArmor, setSelectedArmor] = useState<Armor | null>(null);
+ const validation = useMemo(
+   () => validateArmorForEquip(selectedArmor?.base ?? 0, character.level),
+   [selectedArmor, character.level]
+ );

  return (
    <div>
+     <ArmorValidationDisplay
+       baseArmor={selectedArmor?.base ?? 0}
+       level={character.level}
+       selectedArmorName={selectedArmor?.name}
+     />
    </div>
  );
}
```

## Files Created/Modified

### New Files
- `frontend/src/hooks/useCharacterValidation.ts` — Main validation hook
- `frontend/src/components/character/ValidationDisplay.tsx` — Violation display
- `frontend/src/components/character/CharacterValidationBanner.tsx` — Banner alerts
- `frontend/src/components/character/LoadoutValidationIndicator.tsx` — Loadout UI
- `frontend/src/components/character/ArmorValidationDisplay.tsx` — Armor UI

### Modified Files
- `frontend/src/components/character/TraitAssignmentPanel.tsx` — Added validation display
- `frontend/src/components/character/CharacterSheet.tsx` — Added banner + disabled save
- `frontend/src/components/character/DomainLoadout.tsx` — Added capacity indicator
- `frontend/src/components/character/ArmorSelectionPanel.tsx` — Added armor validation
- `frontend/src/components/character/StatsPanel.tsx` — Added resource display
- `frontend/src/components/character/WeaponSelectionPanel.tsx` — Added tier/burden hints

## Future Enhancements

1. **Multiclass Enforcement:** Lock multiclass after first use
2. **Domain Level Gating:** Prevent acquiring cards above character level
3. **Experience Point Validation:** Ensure bonus stacking doesn't exceed limits
4. **Condition Validation:** Verify cursed card interaction with conditions
5. **Companion State Validation:** Validate companion health/resources
6. **Gear Burden Limits:** Enforce carrying capacity constraints

## Support

For questions or issues with the validation layer:
1. Check the SRD for rule specifics (pages cited in error messages)
2. Review violation.suggestion for fix guidance
3. Examine the specific validator function for implementation details
4. File an issue with the character state that triggers unexpected behavior
