# Mixed Ancestry — UX Architecture Design Specification

**Status:** Active  
**Created:** 2026-04-06  
**SRD Authority:** Daggerheart SRD p.4, p.14, p.16

---

## 1. Overview & Goals

Mixed Ancestry is a first-class, core ancestry option in the Daggerheart SRD. It allows a character to be descended from multiple ancestries and mechanically represent that by combining one **Top Feature** (first-listed) from one ancestry with one **Bottom Feature** (second-listed) from a different ancestry.

### Goals

- Implement mixed ancestry selection in the character builder (Step 2)
- Enforce SRD validation rules (MIX-001 through MIX-012)
- Provide an intuitive UX that hides "Top/Bottom" terminology from users
- Store mixed ancestry data alongside existing single-ancestry characters
- Display composite ancestry card on the character sheet

---

## 2. Entry Point — Mixed Ancestry Tile

Mixed Ancestry appears as a **19th tile** in the ancestry selection list (Step 2 of the builder), positioned **at the top** of the list with distinct visual treatment.

### Visual Treatment

- **Position:** First item in the ancestry list, before alphabetically-sorted base ancestries
- **Border/accent:** Dashed or gradient border to distinguish from standard ancestry tiles
- **Icon:** A blend/merge icon (e.g., `fa-code-merge` or similar)
- **Subtitle:** "Combine traits from two ancestries"
- **No source badge** — mixed ancestry is always SRD-native

### Behavior

When the user clicks/expands the Mixed Ancestry tile, instead of showing traits like a normal ancestry, it transitions into the **3-Phase Selection Flow** (see Section 3).

---

## 3. Three-Phase Selection Flow

The mixed ancestry selection uses a guided 3-phase flow that naturally enforces the Top/Bottom constraint without requiring users to understand that terminology.

### Phase A: Choose First Ancestry (Top Feature)

**Prompt:** "Choose the ancestry for your character's first trait"

- Display all 18 base ancestries as selectable cards/tiles
- Each tile shows: ancestry name, **first trait only** (name + description)
- The second trait is intentionally hidden (it's not available in this phase)
- User selects one ancestry → its Top Feature is locked in
- A confirmation chip appears: "{Ancestry Name} — {Top Feature Name}"

**State after Phase A:**
```
topAncestryId: "elf"
topFeatureName: "Quick Reactions"  
topFeatureDescription: "Mark Stress for advantage on reaction rolls"
```

### Phase B: Choose Second Ancestry (Bottom Feature)

**Prompt:** "Now choose a different ancestry for your character's second trait"

- Display all 18 base ancestries EXCEPT the one chosen in Phase A
- Each tile shows: ancestry name, **second trait only** (name + description)
- The first trait is intentionally hidden
- User selects one ancestry → its Bottom Feature is locked in
- A confirmation chip appears: "{Ancestry Name} — {Bottom Feature Name}"

**State after Phase B:**
```
bottomAncestryId: "goblin"  (must differ from topAncestryId)
bottomFeatureName: "Danger Sense"
bottomFeatureDescription: "1/rest, mark Stress to force adversary attack reroll"
```

### Phase C: Name Your Heritage

**Prompt:** "What does your character call their ancestry?"

- Free-text input field for the heritage display name
- Auto-populated default: "{topAncestryName}-{bottomAncestryName}" (e.g., "Elf-Goblin")
- Suggestion chips: hyphenated combo, single ancestry names, "Custom name"
- Helper text: "You can use a hyphenated name, a single ancestry name, or invent a new term."
- Max length: 60 characters

**State after Phase C:**
```
mixedAncestryDisplayName: "Elf-Goblin"  (or custom text)
```

### Navigation Within Phases

- **Back from Phase B** → returns to Phase A (clears Phase B selection)
- **Back from Phase C** → returns to Phase B (clears heritage name)
- **Back from Phase A** → collapses the Mixed Ancestry tile, returns to normal ancestry list
- Phase indicators (A/B/C dots or numbered steps) shown within the Mixed Ancestry expanded area

---

## 4. Heritage Name Input

### Placement
The heritage name input appears as Phase C of the mixed ancestry flow, and also on the Review step (Step 10) where it can be edited.

### Auto-Population
When both ancestries are selected, the field auto-fills with a hyphenated default: `"{TopAncestry}-{BottomAncestry}"`. The user can accept this or type their own.

### Suggestion Chips
Below the input, display tappable suggestion chips:
- `{TopAncestry}-{BottomAncestry}` (e.g., "Elf-Goblin")
- `{BottomAncestry}-{TopAncestry}` (reversed)
- `{TopAncestry}` (single name)
- `{BottomAncestry}` (single name)

### Validation
- Required field (cannot be empty)
- Max 60 characters
- No special character restrictions

---

## 5. Composite Ancestry Card

Mixed ancestry characters don't use a standard ancestry card — they use a composite virtual card.

### Card Layout

```
┌──────────────────────────────────────────┐
│  Mixed Ancestry                          │
│  "{Heritage Display Name}"               │
│                                          │
│  ┌── From {TopAncestryName} ──────────┐  │
│  │  PRIMARY TRAIT                      │  │
│  │  {TopFeatureName}                   │  │
│  │  {TopFeatureDescription}            │  │
│  └────────────────────────────────────┘  │
│                                          │
│  ┌── From {BottomAncestryName} ───────┐  │
│  │  SECONDARY TRAIT                    │  │
│  │  {BottomFeatureName}               │  │
│  │  {BottomFeatureDescription}        │  │
│  └────────────────────────────────────┘  │
│                                          │
│  Does not count against domain loadout   │
└──────────────────────────────────────────┘
```

### Visual Indicators
- Each trait section has a subtle colored accent indicating its source ancestry
- Source ancestry names shown as small labels above each trait block
- "PRIMARY TRAIT" / "SECONDARY TRAIT" labels replace the SRD's "Top/Bottom" terminology

---

## 6. Data Model

### New Fields on CharacterSummary

```typescript
// Added to CharacterSummary in shared/src/types.ts

/**
 * When true, this character uses mixed ancestry (SRD p.16).
 * ancestryId stores the topAncestryId; mixedAncestryBottomId stores the second.
 */
isMixedAncestry?: boolean;

/**
 * The ancestryId of the ancestry providing the Bottom Feature (second-listed).
 * Only meaningful when isMixedAncestry is true.
 * Null for single-ancestry characters.
 */
mixedAncestryBottomId?: string | null;

/**
 * Free-text heritage display name chosen by the player (SRD p.16).
 * Used as the display name instead of ancestryName when isMixedAncestry is true.
 * Examples: "Elf-Goblin", "Toothling", "Goblin"
 */
mixedAncestryDisplayName?: string | null;
```

### Interpretation

| Field | Single Ancestry | Mixed Ancestry |
|-------|----------------|----------------|
| `ancestryId` | The chosen ancestry | The Top Feature ancestry |
| `ancestryName` | Display name from AncestryData | Display name of the Top Feature ancestry |
| `isMixedAncestry` | `false` / `undefined` | `true` |
| `mixedAncestryBottomId` | `null` / `undefined` | The Bottom Feature ancestry ID |
| `mixedAncestryDisplayName` | `null` / `undefined` | Player-authored heritage name |

### Why Not a Separate ancestryId?

We reuse `ancestryId` for the Top Feature ancestry and add `mixedAncestryBottomId` for the Bottom Feature ancestry. This approach:
- Maintains backward compatibility (all existing single-ancestry queries still work)
- Minimizes API surface changes
- Allows incremental adoption (features that only check `ancestryId` still get a valid ancestry)

### Builder Draft Extension

```typescript
// Added to BuilderDraft in useBuilderSessionStorage.ts
isMixedAncestry?: boolean;
mixedAncestryBottomId?: string;
mixedAncestryDisplayName?: string;
mixedAncestryPhase?: "A" | "B" | "C" | "done";
```

---

## 7. Component Specifications

### 7.1 New: MixedAncestryFlow

**Location:** `frontend/src/components/character/MixedAncestryFlow.tsx`

**Props:**
```typescript
interface MixedAncestryFlowProps {
  ancestries: AncestryData[];
  topAncestryId: string;
  bottomAncestryId: string;
  displayName: string;
  phase: "A" | "B" | "C" | "done";
  onTopSelect: (ancestryId: string) => void;
  onBottomSelect: (ancestryId: string) => void;
  onDisplayNameChange: (name: string) => void;
  onPhaseChange: (phase: "A" | "B" | "C" | "done") => void;
  onCancel: () => void;
  sourceFilter: SourceFilterValue;
}
```

**Behavior:**
- Renders Phase A, B, or C based on `phase` prop
- Phase A: ancestry grid showing only Top Features, filtered by source
- Phase B: ancestry grid showing only Bottom Features, excluding Phase A selection
- Phase C: heritage name input with suggestion chips
- Phase indicator dots at the top
- Back/Cancel buttons to navigate between phases

### 7.2 Modified: CharacterBuilderPageClient

**Changes:**
- Add `isMixedAncestry`, `mixedAncestryBottomId`, `mixedAncestryDisplayName`, `mixedAncestryPhase` state
- Conditionally render `MixedAncestryFlow` when mixed ancestry tile is selected
- Update `canGoNext2` validation to account for mixed ancestry completion
- Update `handleSave` to include mixed ancestry fields
- Update Step 10 review to show mixed ancestry details

### 7.3 Modified: BuilderDraft / useBuilderSessionStorage

**Changes:**
- Add mixed ancestry fields to `BuilderDraft` interface
- Include in session storage serialization

### 7.4 Modified: useStatBreakdowns

**Changes:**
- When `isMixedAncestry` is true, fetch BOTH ancestry records
- Apply Top Feature's mechanical bonuses (traitIndex 0) from the top ancestry
- Apply Bottom Feature's mechanical bonuses (traitIndex 1) from the bottom ancestry
- Label breakdown lines accordingly (e.g., "Ancestry — Elf (Quick Reactions)" vs "Ancestry — Goblin (Danger Sense)")

### 7.5 Modified: CharacterValidator

**Changes:**
- Add mixed ancestry validation rules (MIX-001 through MIX-007)
- Validate that `mixedAncestryBottomId` differs from `ancestryId`
- Validate that both referenced ancestries exist in the SRD data

---

## 8. State Management

### Builder State (Zustand-free, local useState)

```
step: 2  (ancestry step)
ancestryId: ""                    → set to topAncestryId when Phase A completes
isMixedAncestry: false           → set to true when Mixed Ancestry tile selected
mixedAncestryBottomId: ""        → set when Phase B completes
mixedAncestryDisplayName: ""     → set when Phase C completes
mixedAncestryPhase: "A"          → tracks current phase within mixed flow
```

### Session Storage Persistence

All mixed ancestry fields are persisted to session storage via the existing `useBuilderSessionStorage` hook so that a page refresh doesn't lose progress.

### Reset Behavior

- If the user navigates back from Phase A or deselects mixed ancestry, all mixed ancestry fields are cleared
- If the user selects a single (non-mixed) ancestry, `isMixedAncestry` is set to false and mixed fields are cleared

---

## 9. Validation Rules

| Rule ID | Rule | UI Enforcement |
|---------|------|----------------|
| MIX-001 | Exactly 2 ancestry features | Phase A + Phase B flow structure guarantees this |
| MIX-002 | Feature 1 must be a Top Feature | Phase A only shows Top Features |
| MIX-003 | Feature 2 must be a Bottom Feature from a different ancestry | Phase B only shows Bottom Features and excludes Phase A ancestry |
| MIX-004 | Cannot take two Top Features | Structurally impossible in the 3-phase flow |
| MIX-005 | Cannot take two Bottom Features | Structurally impossible in the 3-phase flow |
| MIX-006 | Features from different ancestries | Phase B filters out Phase A ancestry |
| MIX-007 | Features from exactly 2 ancestries | Flow only allows 2 selections |
| MIX-008 | Heritage name is free-text | Text input field in Phase C |
| MIX-009 | Creation-time only | Mixed ancestry is only available in the builder |
| MIX-010 | Any pair of ancestries is valid | No pair restrictions in the UI |
| MIX-011 | No effect on community | Community step (3) is unchanged |
| MIX-012 | Composite card doesn't count against loadout | Loadout validator unchanged |

---

## 10. Accessibility

### Keyboard Navigation
- All ancestry tiles in Phase A/B are keyboard-navigable (Tab + Enter/Space)
- Phase indicator dots are not interactive (decorative only)
- Heritage name input is a standard text field with proper label

### ARIA
- Phase container has `role="group"` with `aria-label="Mixed ancestry selection, phase {n} of 3"`
- Each ancestry tile in Phase A/B uses the existing SelectionTile accessibility (radio group pattern)
- Phase transitions are announced via `aria-live="polite"` region

### Screen Reader
- Phase transitions announce: "Phase {n}: {description}"
- Selected ancestry announced: "{Ancestry} selected. {Feature name}: {Feature description}"
- Heritage name suggestions announced as a list

### Focus Management
- When transitioning between phases, focus moves to the phase heading
- When the mixed ancestry flow is cancelled, focus returns to the Mixed Ancestry tile

---

## 11. Mobile-First Considerations

- Phase A/B ancestry tiles use the same responsive grid as the existing ancestry list (full-width on mobile, multi-column on larger screens)
- Phase indicator dots are compact (don't take excessive vertical space)
- Heritage name suggestion chips wrap horizontally and are tappable (44px minimum touch target)
- The phase header + selected feature summary remain visible at the top of the scroll area
- Back/Cancel navigation is accessible at the bottom of the viewport (consistent with the existing wizard footer)

---

## 12. Edge Cases

1. **User selects mixed ancestry, completes Phase A, then goes back to change to single ancestry** — All mixed ancestry state is cleared; `isMixedAncestry` set to false
2. **User refreshes mid-Phase B** — Session storage restores the phase, top ancestry selection, and partial state
3. **Homebrew ancestry in mixed combo** — Homebrew ancestries follow the same Top/Bottom structure; source filter applies within each phase
4. **Ancestry with no second trait** — If an ancestry's `secondTraitName` is empty, it's excluded from Phase B (no Bottom Feature available)
5. **Ancestry with no first trait** — If an ancestry's `traitName` is empty, it's excluded from Phase A (no Top Feature available)
6. **Heritage name left at auto-generated default** — Valid; no action needed from the user
7. **Heritage name identical to an existing ancestry name** — Valid; the SRD explicitly permits this (e.g., naming yourself just "Goblin")
8. **Both mechanical bonuses from different ancestries stack** — System applies traitIndex 0 bonuses from top ancestry and traitIndex 1 bonuses from bottom ancestry; stacking is correct per SRD
9. **User changes class after setting mixed ancestry** — Mixed ancestry is independent of class; no interaction
10. **User in mixed ancestry flow clicks a step in the sidebar** — Mixed ancestry state is preserved; user can navigate away and back to Step 2
11. **Character already saved as single ancestry, re-opened in builder** — Builder loads as single ancestry; user can switch to mixed if desired

---

## 13. Integration Points

### Existing Character Creation Flow (10 Steps)

Mixed ancestry modifies **Step 2 only**. All other steps are unchanged:

| Step | Change |
|------|--------|
| 1. Class & Subclass | None |
| 2. Ancestry | Mixed ancestry tile + 3-phase flow added |
| 3. Community | None |
| 4. Traits | None (mechanical bonuses computed at save time) |
| 5. Weapons | None |
| 6. Armor | None |
| 7. Equipment | None |
| 8. Experiences | None |
| 9. Domain Cards | None |
| 10. Review & Save | Updated to show mixed ancestry details |

### Backend Integration

The `handleSave` function sends mixed ancestry fields to `PATCH /characters/{id}`:
- `isMixedAncestry: true`
- `ancestryId: topAncestryId`
- `ancestryName: topAncestryName`
- `mixedAncestryBottomId: bottomAncestryId`
- `mixedAncestryDisplayName: heritageDisplayName`

The backend stores these as additional fields on the Character document. No schema migration is required (DynamoDB is schemaless).

### Character Sheet Display

The character sheet's heritage/ancestry display should:
- Show `mixedAncestryDisplayName` instead of `ancestryName` when `isMixedAncestry` is true
- Render the composite ancestry card with both traits

---

## Appendix: Complete Ancestry Feature Catalog

| Ancestry | Top Feature (Phase A) | Bottom Feature (Phase B) |
|---|---|---|
| Clank | Purposeful Design | Efficient |
| Drakona | Scales | Elemental Breath |
| Dwarf | Thick Skin | Increased Fortitude |
| Elf | Quick Reactions | Celestial Trance |
| Faerie | Luckbender | Wings |
| Faun | Caprine Leap | Kick |
| Firbolg | Charge | Unshakable |
| Fungril | Fungril Network | Death Connection |
| Galapa | Shell | Retract |
| Giant | Endurance | Reach |
| Goblin | Surefooted | Danger Sense |
| Halfling | Luckbringer | Internal Compass |
| Human | High Stamina | Adaptability |
| Infernis | Fearless | Dread Visage |
| Katari | Feline Instincts | Retracting Claws |
| Orc | Sturdy | Tusks |
| Ribbet | Amphibious | Long Tongue |
| Simiah | Natural Climber | Nimble |

**306 valid mixed combinations** (18 top x 17 bottom, same ancestry excluded).
