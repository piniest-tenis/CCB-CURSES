# SRD Validation Layer — Testing & Examples

## Unit Tests for Validation Hooks

Create `frontend/src/hooks/__tests__/useCharacterValidation.test.ts`:

```typescript
import { renderHook } from "@testing-library/react";
import {
  useCharacterValidation,
  validateTraitsForAssignment,
  validateLoadoutCapacity,
  validateArmorForEquip,
} from "@/hooks/useCharacterValidation";
import type { Character, ClassData } from "@shared/types";

describe("useCharacterValidation", () => {
  describe("Trait Validation", () => {
    test("should accept valid trait assignment (+2, +1, +1, -1)", () => {
      const traits = {
        strength: 2,
        finesse: 1,
        presence: 1,
        knowledge: -1,
      };
      const result = validateTraitsForAssignment(traits);
      expect(result.isValid).toBe(true);
      expect(result.sum).toBe(2);
    });

    test("should reject traits that don't sum to +2", () => {
      const traits = {
        strength: 2,
        finesse: 1,
        presence: 1,
        knowledge: 0,
      };
      const result = validateTraitsForAssignment(traits);
      expect(result.isValid).toBe(false);
      expect(result.message).toContain("Sum is");
    });

    test("should reject fewer than 4 traits assigned", () => {
      const traits = {
        strength: 2,
        finesse: 1,
      };
      const result = validateTraitsForAssignment(traits);
      expect(result.isValid).toBe(false);
      expect(result.assigned).toBe(2);
    });

    test("should reject invalid bonus values", () => {
      const traits = {
        strength: 3, // invalid
        finesse: 1,
        presence: 1,
        knowledge: -2, // invalid
      };
      const result = validateTraitsForAssignment(traits);
      expect(result.isValid).toBe(false);
    });
  });

  describe("Loadout Validation", () => {
    test("should allow loadouts under max capacity", () => {
      const loadout = ["card1", "card2", "card3"];
      const result = validateLoadoutCapacity(loadout);
      expect(result.canAdd).toBe(true);
      expect(result.current).toBe(3);
      expect(result.available).toBe(2);
    });

    test("should prevent adding to full loadout", () => {
      const loadout = ["card1", "card2", "card3", "card4", "card5"];
      const result = validateLoadoutCapacity(loadout);
      expect(result.canAdd).toBe(false);
      expect(result.current).toBe(5);
    });

    test("should track available slots correctly", () => {
      for (let i = 0; i <= 5; i++) {
        const loadout = Array.from({ length: i }, (_, idx) => `card${idx}`);
        const result = validateLoadoutCapacity(loadout);
        expect(result.available).toBe(Math.max(0, 5 - i));
      }
    });
  });

  describe("Armor Validation", () => {
    test("should calculate armor score correctly", () => {
      // Base 10 + Level 1 = 11
      const result = validateArmorForEquip(10, 1);
      expect(result.score).toBe(11);
      expect(result.isValid).toBe(true);
    });

    test("should warn when armor score at max", () => {
      // Base 11 + Level 1 = 12 (exactly at cap)
      const result = validateArmorForEquip(11, 1);
      expect(result.score).toBe(12);
      expect(result.isValid).toBe(true);
      expect(result.warning).toBeUndefined();
    });

    test("should reject armor score over cap", () => {
      // Base 12 + Level 1 = 13 (over cap)
      const result = validateArmorForEquip(12, 1);
      expect(result.score).toBe(13);
      expect(result.isValid).toBe(false);
      expect(result.warning).toContain("exceed");
    });

    test("should track armor growth with levels", () => {
      const base = 9;
      for (let level = 1; level <= 10; level++) {
        const result = validateArmorForEquip(base, level);
        expect(result.score).toBe(base + level);
        expect(result.isValid).toBe(base + level <= 12);
      }
    });
  });

  describe("Full Character Validation", () => {
    test("should reject character with invalid traits", () => {
      const character: Character = {
        // ... base fields ...
        traitBonuses: {
          strength: 2,
          finesse: 1,
          presence: 0, // missing assignment
        },
      } as Character;

      const { result } = renderHook(() =>
        useCharacterValidation(character, mockClassData)
      );

      expect(result.current.isValid).toBe(false);
      expect(result.current.blockingSave).toBe(true);
      const traitViolation = result.current.violations.find(
        (v) => v.field === "traitBonuses"
      );
      expect(traitViolation).toBeDefined();
    });

    test("should reject character with overloaded domain", () => {
      const character: Character = {
        // ... base fields ...
        domainLoadout: ["card1", "card2", "card3", "card4", "card5", "card6"],
      } as Character;

      const { result } = renderHook(() =>
        useCharacterValidation(character, mockClassData)
      );

      expect(result.current.blockingSave).toBe(true);
      const violation = result.current.violations.find(
        (v) => v.id === "loadout-exceeds-max"
      );
      expect(violation).toBeDefined();
    });

    test("should warn on high armor score", () => {
      const character: Character = {
        // ... base fields ...
        level: 5,
        derivedStats: { armor: 15, evasion: 10 },
      } as Character;

      const { result } = renderHook(() =>
        useCharacterValidation(character, mockClassData)
      );

      const violation = result.current.violations.find(
        (v) => v.id === "armor-score-exceeds-max"
      );
      expect(violation?.severity).toBe("error");
    });

    test("should include SRD page citations", () => {
      const character: Character = {
        // ... base fields with trait error ...
        traitBonuses: { strength: 3 }, // sum ≠ 2
      } as Character;

      const { result } = renderHook(() =>
        useCharacterValidation(character, mockClassData)
      );

      const violation = result.current.violations.find(
        (v) => v.field === "traitBonuses"
      );
      expect(violation?.srdPage).toBe(3);
    });
  });
});

describe("validateTraitsForAssignment", () => {
  test("edge case: all traits to one stat", () => {
    const traits = { strength: 2 };
    const result = validateTraitsForAssignment(traits);
    expect(result.assigned).toBe(1);
    expect(result.isValid).toBe(false);
  });

  test("edge case: two +1 stats", () => {
    const traits = {
      strength: 1,
      finesse: 1,
    };
    const result = validateTraitsForAssignment(traits);
    expect(result.sum).toBe(2);
    expect(result.assigned).toBe(2);
    expect(result.isValid).toBe(false); // Missing -1 and 2
  });

  test("returns message describing progress", () => {
    const result = validateTraitsForAssignment({});
    expect(result.message).toContain("4");
    expect(result.message).toContain("assign");
  });
});
```

## Component Integration Tests

Create `frontend/src/components/character/__tests__/TraitAssignmentPanel.test.tsx`:

```typescript
import { render, screen, userEvent } from "@testing-library/react";
import { TraitAssignmentPanel } from "../TraitAssignmentPanel";

describe("TraitAssignmentPanel", () => {
  test("should show validation error when sum ≠ +2", () => {
    const { rerender } = render(
      <TraitAssignmentPanel
        traits={{
          strength: 2,
          finesse: 1,
          // sum = 3, missing traits
        }}
        onTraitsChange={() => {}}
      />
    );

    expect(screen.getByText(/⚠/)).toBeInTheDocument();
    expect(screen.getByText(/must be +2/)).toBeInTheDocument();
  });

  test("should show validation success when complete", () => {
    render(
      <TraitAssignmentPanel
        traits={{
          strength: 2,
          finesse: 1,
          presence: 1,
          knowledge: -1,
        }}
        onTraitsChange={() => {}}
      />
    );

    expect(screen.getByText(/✓/)).toBeInTheDocument();
    expect(screen.getByText(/All traits assigned correctly/)).toBeInTheDocument();
  });

  test("should update validation in real-time", async () => {
    const onTraitsChange = jest.fn();
    const { rerender } = render(
      <TraitAssignmentPanel traits={{}} onTraitsChange={onTraitsChange} />
    );

    const selects = screen.getAllByRole("combobox");
    await userEvent.selectOption(selects[0], "strength");

    rerender(
      <TraitAssignmentPanel
        traits={{ strength: 2 }}
        onTraitsChange={onTraitsChange}
      />
    );

    expect(screen.getByText(/3 more traits/)).toBeInTheDocument();
  });

  test("should show SRD citation", () => {
    render(
      <TraitAssignmentPanel
        traits={{
          strength: 2,
          finesse: 2, // Invalid: sum = 4
        }}
        onTraitsChange={() => {}}
      />
    );

    expect(screen.getByText(/SRD page 3/)).toBeInTheDocument();
  });
});
```

## E2E Test Scenarios

Create `frontend/tests/e2e/character-validation.spec.ts`:

```typescript
import { test, expect } from "@playwright/test";

test.describe("Character Validation", () => {
  test("prevents saving character with invalid traits", async ({ page }) => {
    await page.goto("/characters/new");

    // Try to select traits that don't sum to +2
    await page.selectOption('[data-testid="trait-slot-plus2"]', "strength");
    await page.selectOption('[data-testid="trait-slot-plus1a"]', "finesse");
    await page.selectOption('[data-testid="trait-slot-plus1b"]', "presence");
    // Don't set -1 slot

    // Validation banner should appear
    expect(await page.locator("[role=alert]")).toBeVisible();
    expect(
      await page.locator("[role=alert]").textContent()
    ).toContain("Invalid");

    // Save button should be disabled
    const saveButton = page.locator("button:has-text('Save')");
    expect(await saveButton.isDisabled()).toBe(true);
  });

  test("allows saving character with valid traits", async ({ page }) => {
    await page.goto("/characters/new");

    // Select valid traits
    await page.selectOption('[data-testid="trait-slot-plus2"]', "strength");
    await page.selectOption('[data-testid="trait-slot-plus1a"]', "finesse");
    await page.selectOption('[data-testid="trait-slot-plus1b"]', "presence");
    await page.selectOption('[data-testid="trait-slot-minus1"]', "knowledge");

    // Validation success should appear
    expect(
      await page.locator("text=All traits assigned correctly")
    ).toBeVisible();

    // Save button should be enabled
    const saveButton = page.locator("button:has-text('Save')");
    expect(await saveButton.isDisabled()).toBe(false);
  });

  test("prevents adding 6th card to loadout", async ({ page }) => {
    await page.goto("/characters/char-123");

    // Existing loadout has 5 cards
    expect(await page.locator("[data-testid=loadout-card]")).toHaveCount(5);

    // Add button should be disabled
    const addButton = page.locator("button:has-text('Add Card')");
    expect(await addButton.isDisabled()).toBe(true);

    // Validation message should show
    expect(await page.locator("text=/full.*swap/i")).toBeVisible();
  });

  test("shows armor score cap warning", async ({ page }) => {
    await page.goto("/characters/char-123");

    // Character at level 3
    // Select armor that would push score > 12
    await page.selectOption('[data-testid=armor-select]', "plate-armor"); // base 12

    // Warning should appear
    expect(
      await page.locator("text=/exceed.*cap/i").first()
    ).toBeVisible();

    // Cannot select
    // (button should be disabled or click prevented)
  });

  test("shows helpful fix suggestions", async ({ page }) => {
    await page.goto("/characters/char-123");

    // Create invalid state
    await page.evaluate(() => {
      // Directly set invalid state in store for testing
      window.characterStore.setTraits({ strength: 3 });
    });

    // Validation banner should show suggestion
    const suggestion = await page.locator("[role=alert] >> text=💡").first();
    expect(await suggestion.textContent()).toContain("Adjust");
  });
});
```

## Example Usage Scenarios

### Scenario 1: Player Creates Character with Invalid Traits

**Initial State:**
- User on character creation screen
- Traits unassigned

**Actions:**
1. User selects: Strength +2, Finesse +1, Presence +1
2. Sum is +4 (missing -1 assignment)
3. Validation fires

**Expected Behavior:**
```
✓ Trait validation error shows immediately
✓ Message: "Sum is 4; must be +2"
✓ Suggestion: "Assign a trait as −1"
✓ Save button disabled
✓ Validation banner visible at top
```

**Resolution:**
1. User assigns Knowledge −1
2. Sum now +2
3. Validation clears
4. Save button enabled
5. Validation banner disappears

### Scenario 2: Player Adds 6th Card to Loadout

**Initial State:**
- Character has 5 cards in active loadout
- 3 cards in vault

**Actions:**
1. User clicks "Add Card"
2. Tries to add 6th card

**Expected Behavior:**
```
✓ "Add Card" button disabled when loadout = 5
✓ Capacity bar shows 5/5 (filled, red)
✓ Message: "Loadout is full"
✓ Hint: "Swap a card (cost: Recall)"
```

**Resolution:**
1. User clicks "Swap Card" instead
2. Selects card to remove from loadout
3. Selects card to add from vault
4. Gets recall cost hint: "1 Hope"
5. Confirms swap
6. Loadout count shows 5/5 (no change, but card swapped)

### Scenario 3: Player Equips Armor That Exceeds Cap

**Initial State:**
- Character level 5
- Armor cap: 12
- Can select armor with base ≤ 7 (7 + 5 = 12)

**Actions:**
1. Player selects Plate Armor (base 10)
2. Score calculation: 10 + 5 = 15

**Expected Behavior:**
```
✓ Armor score shows: 15
✓ "max 12" warning appears
✓ Red error: "Armor Score exceeds cap"
✓ Cannot confirm selection
✓ Suggestion: "Select lower-tier armor"
✓ SRD citation: "page 20"
```

**Resolution:**
1. Player selects Leather Armor (base 7)
2. Score: 7 + 5 = 12
3. Yellow indicator: "At maximum armor"
4. Can confirm selection
5. Save button enabled

### Scenario 4: Player Forgets to Assign All Traits

**Initial State:**
- Trait assignment form open
- 2 traits assigned

**Actions:**
1. User tries to proceed to next step

**Expected Behavior:**
```
✓ Validation error: "2 more traits to assign"
✓ Cannot proceed (button disabled)
✓ UI hints show which traits are already selected
✓ Dropdown only shows unassigned traits
```

### Scenario 5: Player Views Validation on Save

**Initial State:**
- Character with multiple violations
- Armor score > 12
- Traits don't sum to +2
- Loadout has 6 cards

**Actions:**
1. User clicks "Save"

**Expected Behavior:**
```
✓ Save prevented
✓ Validation banner shown with all violations
✓ Errors highlighted in red
✓ SRD page citations included
✓ Fix suggestions for each
✓ Save button shows badge: "⚠ 3" (error count)
```

**Resolution:**
User fixes issues one by one:
1. Assign traits correctly → 1 error resolved
2. Remove loadout card → 1 error resolved
3. Select lower armor → 1 error resolved
4. All errors cleared → Save button enabled

## Manual Testing Checklist

- [ ] Create character with trait sum ≠ +2 → error
- [ ] Create character with armor > 12 → error
- [ ] Add 6th card to loadout → disabled + hint
- [ ] Show/hide validation banner when issues added/fixed
- [ ] Verify all SRD page citations present
- [ ] Verify suggestions are actionable
- [ ] Test on mobile (banner doesn't break layout)
- [ ] Test with real backend validation mismatch
- [ ] Test dismissing validation banner
- [ ] Test validation updates in real-time as user edits
- [ ] Verify disabled save button state transitions
- [ ] Test validation badge on save button
- [ ] Verify color contrast meets a11y standards
- [ ] Test with keyboard navigation
- [ ] Test with screen reader (NVDA/JAWS)

## Performance Testing

Ensure validation doesn't cause slowdowns:

```typescript
test("validation completes in < 50ms for typical character", () => {
  const character = createMockCharacter();
  const start = performance.now();

  const result = useCharacterValidation(character, mockClassData);

  const elapsed = performance.now() - start;
  expect(elapsed).toBeLessThan(50);
});

test("validation doesn't cause re-renders during typing", () => {
  let renderCount = 0;
  const MyComponent = () => {
    renderCount++;
    const validation = useCharacterValidation(character, classData);
    return <div>{validation.violations.length}</div>;
  };

  const { rerender } = render(<MyComponent />);

  // Simulate rapid trait changes
  for (let i = 0; i < 10; i++) {
    rerender(<MyComponent />);
  }

  // Should not re-render more than necessary
  expect(renderCount).toBeLessThan(15);
});
```
