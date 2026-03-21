# SRD Compliance Integration Guide

**Date**: 2026-03-21  
**Authority**: Daggerheart SRD 1.0 (9-09-25) + Daggerheart Homebrew Kit v1.0  
**Status**: Complete & Ready for Integration

---

## Overview

This guide documents how the SRD Compliance system ensures that every part of the Daggerheart Character Platform strictly adheres to the official Daggerheart rules.

The system is built in **three layers**:

1. **Universal Rules Layer** (`srd-rules-specification.ts`) — core Daggerheart mechanics
2. **Campaign Frame Validation Layer** (`SrdValidationLayer.ts`) — validates custom content against SRD
3. **Integration Points** — how backend, frontend, and ingestion all enforce rules

---

## Layer 1: Universal Rules Specification

**File**: `/compliance/srd-rules-specification.ts` (~1097 lines)

### Purpose
Defines and validates **all universal Daggerheart mechanics** that apply equally to every character:

- Trait modifiers and assignment
- Starting resource calculations (HP, Stress, Hope)
- Combat mechanics (Duality Rolls, damage thresholds, armor)
- Progression rules (proficiency scaling by tier)
- Domain system mechanics (loadout/vault management)
- Rest economy (consecutive short rest limits)
- Death mechanics (scarring, outcome determination)

### Key Exports

**Error Types**:
```typescript
enum SRDErrorCode {
  INVALID_TRAIT_ASSIGNMENT,
  INVALID_STARTING_STATS,
  INVALID_ARMOR_SCORE,
  INVALID_DOMAIN_LOADOUT,
  // ... 20+ codes total
}

interface SRDValidationError {
  code: SRDErrorCode;
  message: string;
  srdPageCitation: string;  // Direct reference to SRD page
  severity: 'error' | 'warning';
  context?: Record<string, any>;
}
```

**Validation Functions** (20+):
- Character Creation: `validateCharacterCreation()`, `validateTraitAssignment()`, `validateStartingStats()`
- Combat: `evaluateDualityRoll()`, `determineDamageSeverity()`, `calculateDamageThresholds()`
- Resources: `validateHPSlots()`, `validateStressSlots()`, `validateHope()`, `validateArmorScore()`
- Advancement: `validateAdvancement()`, `calculateProficiency()`, `validateProficiencyProgression()`
- Domains: `validateDomainLoadout()`, `validateRecallCost()`
- Rest: `validateRest()`
- Death: `validateDeathOption()`, `validateScarCheck()`, `determineScarCheckOutcome()`

**Constants**:
```typescript
const TRAIT_MODIFIERS = [2, 1, 1, 0, 0, -1];  // Trait assignment pool
const TRAIT_MODIFIER_SUM = 2;                  // Total modifier sum
const TRAITS = ['Agility', 'Strength', 'Finesse', 'Instinct', 'Presence', 'Knowledge'];
const VALID_PROFICIENCY_BY_TIER = { 1: 1, 2: 2, 3: 3, 4: 4 };  // Proficiency by tier
const DEFAULT_STARTING_STRESS = 6;
const DEFAULT_STARTING_HOPE = 2;
const MULTICLASS_MINIMUM_LEVEL = 5;
const MAX_CONSECUTIVE_SHORT_RESTS = 3;
const DOMAIN_LOADOUT_MAX = 5;
```

### Citation Pattern

Every validation error includes an SRD page citation:

```typescript
// Example from validateDomainLoadout()
errors.push({
  code: SRDErrorCode.INVALID_LOADOUT_SIZE,
  message: `Domain loadout has ${activeCardIds.length} cards, but SRD max is 5.`,
  srdPageCitation: 'SRD page 5: Active domain loadout max is 5 cards',  // ← Direct SRD reference
  severity: 'error',
});
```

---

## Layer 2: Campaign Frame Validation

**File**: `/compliance/SrdValidationLayer.ts` (~450 lines)

### Purpose

Validates **campaign-specific content** (classes, domains, ancestries, communities) against SRD constraints. This ensures that custom content defined in `markdown/` cannot violate the universal rules.

### Key Exports

**Validation Functions**:

1. **`validateClassSRDCompliance(classData)`**
   - ✅ startingEvasion > 0 and ≤ 12 (armor cap)
   - ✅ startingHitPoints > 0
   - ✅ domains exactly 2 entries
   - Cites: SRD pages 3-4

2. **`validateDomainCardSRDCompliance(cardData)`**
   - ✅ level in range 1-5
   - ⚠ Cursed cards should have curse mechanics
   - Cites: SRD page 4

3. **`validateDomainLoadoutSRDCompliance(level, activeCardIds, domainCards)`**
   - ✅ activeCardIds.length ≤ 5
   - ✅ All cards ≤ character level
   - Cites: SRD pages 4-5

4. **`validateProficiencySRDCompliance(level, currentProficiency)`**
   - ✅ Proficiency matches tier (1→1, 2-4→2, 5-7→3, 8-10→4)
   - Cites: SRD page 42

5. **`validateFullClassCompliance(classData, domainCards, level)`**
   - Runs all checks combined (class + domains + proficiency)

6. **`validateDomainCardsSRDCompliance(cards[])`**
   - Batch validation for domain card sets

### Data Types

```typescript
interface ClassValidationData {
  classId: string;
  name: string;
  startingEvasion: number;
  startingHitPoints: number;
  domains: string[]; // [domain1, domain2]
  source?: string;
}

interface DomainCardValidationData {
  cardId: string;
  name: string;
  domain: string;
  level: number; // 1-5
  isCursed?: boolean;
  source?: string;
}
```

### Examples

**Validating a Class**:
```typescript
import { validateClassSRDCompliance } from './SrdValidationLayer';

const devoutClass: ClassValidationData = {
  classId: 'devout',
  name: 'Devout',
  startingEvasion: 10,
  startingHitPoints: 6,
  domains: ['Artistry', 'Faithful'],
  source: 'Curses, Blessings & Betrayal',
};

const result = validateClassSRDCompliance(devoutClass);
if (!result.valid) {
  console.error(result.errors);
  // Output: [{
  //   code: 'INVALID_ARMOR_SCORE',
  //   message: '...',
  //   srdPageCitation: 'SRD page 3: Armor Score cannot exceed 12',
  //   severity: 'error'
  // }]
}
```

**Validating Domain Loadout**:
```typescript
const result = validateDomainLoadoutSRDCompliance(
  3,  // character level
  ['card1', 'card2', 'card3'],  // active loadout
  domainCardMap  // Map<cardId, DomainCardValidationData>
);
```

---

## Layer 3: Enhanced Ingestion Validators

**File**: `/ingestion/src/validators/IngestionValidator.ts` (~450 lines, updated)

### Purpose

Bridge campaign frame data ingestion with SRD validation. Adds two new combined validators:

1. **`validateClassWithSRD(data: ClassData)`**
   - Runs structural checks (existing `validateClass()`)
   - Adds SRD compliance checks (evasion cap, HP plausibility)
   - Returns combined error list

2. **`validateDomainCardWithSRD(data: DomainCard)`**
   - Runs structural checks (existing `validateDomainCard()`)
   - Adds SRD compliance checks (level range, cursed card mechanics)
   - Returns combined error list

### Usage in Ingestion Pipeline

```typescript
import {
  validateClassWithSRD,
  validateDomainCardWithSRD,
} from './validators/IngestionValidator';

// During class markdown parsing
const classData = parseClassMarkdown('markdown/Classes/Devout.md');
const result = validateClassWithSRD(classData);

if (!result.valid) {
  console.error('Class validation failed:', result.errors);
  // Stop ingestion; emit error report
  return;
}

// Proceed to DynamoDB write
await dynamodb.putItem('Classes', classData);
```

---

## Integration Points

### 1. Data Ingestion Pipeline

**Flow**:
```
markdown/Classes/*.md
         ↓
   parseClassMarkdown()
         ↓
   validateClassWithSRD()  ← ← ← Combines structural + SRD validation
         ↓
   Store to DynamoDB Classes table
         ↓
Backend API can now assume all classes are SRD-compliant
```

**File**: `ingestion/src/index.ts`

```typescript
import { validateClassWithSRD, validateDomainCardWithSRD } from './validators/IngestionValidator';
import { SRD_VALIDATION_LAYER } from '../../compliance/SrdValidationLayer';

export async function ingestCampaignFrame() {
  const classFiles = await globFiles('markdown/Classes/*.md');
  
  for (const filePath of classFiles) {
    const classData = await parseClassMarkdown(filePath);
    
    // Structural + SRD validation
    const result = validateClassWithSRD(classData);
    
    if (!result.valid) {
      console.error(`Invalid class ${classData.classId}:`, result.errors);
      throw new ValidationError(result.errors);
    }
    
    // Also run full SRD compliance check
    const srdResult = SRD_VALIDATION_LAYER.validateFullClassCompliance(
      {
        classId: classData.classId,
        name: classData.name,
        startingEvasion: classData.startingEvasion,
        startingHitPoints: classData.startingHitPoints,
        domains: classData.domains,
      },
      new Map(/* domain cards */),
      1  // starting at level 1
    );
    
    if (!srdResult.valid) {
      console.error(`Class fails SRD compliance:`, srdResult.errors);
      throw new ValidationError(srdResult.errors);
    }
    
    // Safe to store
    await dynamodb.putItem('Classes', classData);
  }
}
```

### 2. Backend API Layer

**File**: `backend/src/lambdas/characters/create.ts`

When creating a character, validate **every** advancement choice against SRD rules:

```typescript
import { validateAdvancement } from '../../../compliance/srd-rules-specification';
import { validateDomainLoadoutSRDCompliance } from '../../../compliance/SrdValidationLayer';

export async function createCharacter(event: APIGatewayProxyEvent) {
  const { classId, level, domains, stats, hope, stress } = JSON.parse(event.body);
  
  // 1. Check universal rules
  const levelUpResult = validateAdvancement(
    characterLevel,
    stats.proficiency,
    stats.traits,
    stats.evasion
  );
  
  if (!levelUpResult.valid) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        error: 'Character creation violates SRD rules',
        violations: levelUpResult.errors,
      }),
    };
  }
  
  // 2. Check domain loadout
  const domainResult = validateDomainLoadoutSRDCompliance(
    level,
    domains.active,
    new Map(/* domain cards from DB */)
  );
  
  if (!domainResult.valid) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        error: 'Domain loadout violates SRD rules',
        violations: domainResult.errors,
      }),
    };
  }
  
  // 3. Safe to persist
  const character = new Character(classId, level, stats, domains, hope, stress);
  await character.save();
  
  return {
    statusCode: 201,
    body: JSON.stringify(character),
  };
}
```

### 3. Frontend UI Layer

**File**: `frontend/src/hooks/useCharacterCreation.ts`

Use SRD validators to disable illegal UI options:

```typescript
import { calculateProficiency, calculateDamageThresholds } from '../../../compliance/srd-rules-specification';
import { validateProficiencySRDCompliance } from '../../../compliance/SrdValidationLayer';

export function useCharacterCreation(level: number, selectedClass: ClassData) {
  // Calculate expected proficiency for this level
  const expectedProficiency = calculateProficiency(level);
  
  // Disable proficiency selector if only one option is legal
  const isProficiencyLocked = true;  // Only one valid value for this level
  
  // Calculate damage thresholds and pre-fill form
  const thresholds = calculateDamageThresholds(level, selectedClass.baseHPModifier);
  
  // Disable domain selection if loadout is full
  const maxLoadoutReached = activeDomains.length >= 5;
  
  // Only show domain cards ≤ character level
  const availableCards = allDomainCards.filter(card => card.level <= level);
  
  return {
    expectedProficiency,
    isProficiencyLocked,
    thresholds,
    maxLoadoutReached,
    availableCards,
  };
}
```

---

## Error Handling Strategy

### Validation Result Structure

All validators return:
```typescript
interface ValidationResult {
  valid: boolean;
  errors: SRDValidationError[];
}

interface SRDValidationError {
  code: SRDErrorCode;              // Machine-readable
  message: string;                  // Human-readable
  srdPageCitation: string;          // Authority reference
  severity: 'error' | 'warning';    // Blocking vs. advisory
  context?: Record<string, any>;    // Debugging data
}
```

### Error Codes (Taxonomy)

**Character Creation** (5):
- `INVALID_TRAIT_ASSIGNMENT` — modifiers don't sum to +2 (SRD page 3)
- `INVALID_STARTING_STATS` — evasion/HP out of range (SRD page 3)
- `INVALID_ARMOR_SCORE` — armor > 12 (SRD page 3)
- `INVALID_DOMAIN_LOADOUT` — wrong domain count or level mismatch (SRD page 4)
- `INVALID_PROFICIENCY_START` — starting proficiency ≠ 1 (SRD page 42)

**Combat** (3):
- `INVALID_DUALITY_ROLL` — roll values out of range (SRD page 35)
- `INVALID_DAMAGE_CALC` — damage amount invalid (SRD page 39)
- `INVALID_ARMOR_SLOT_MARK` — armor marks exceed capacity (SRD page 3)

**Resources** (3):
- `INVALID_HP_SLOT` — HP marked exceed slots (SRD page 3)
- `INVALID_STRESS_SLOT` — stress marked exceed 6 + modifiers (SRD page 3)
- `INVALID_HOPE_VALUE` — hope outside 0-6 range (SRD page 3)

**Advancement** (5):
- `INVALID_LEVEL_PROGRESSION` — level jump > 1 (SRD page 42)
- `INVALID_PROFICIENCY_PROGRESSION` — proficiency doesn't match tier (SRD page 42)
- `INVALID_DOMAIN_LEVEL_GATE` — domain card > character level (SRD page 4)
- `INVALID_MULTICLASS` — multiclass before level 5 or wrong domain cap (SRD page 43)
- `INVALID_ADVANCEMENT_SLOT` — wrong resource count after level-up (SRD page 42)

**Domain System** (2):
- `INVALID_LOADOUT_SIZE` — active loadout > 5 (SRD page 5)
- `INVALID_RECALL_COST` — recall stress cost wrong (SRD page 5)

**Rest & Death** (4):
- `INVALID_CONSECUTIVE_SHORT_RESTS` — > 3 short rests without long rest (SRD page 41)
- `INVALID_DEATH_OPTION` — not one of Blaze/Avoid/Risk (SRD page 42)
- `INVALID_SCAR_CHECK` — scar check roll out of range (SRD page 42)

### Best Practices

**For Backend Endpoints**:
```typescript
// Don't just check valid=true; map errors to HTTP status codes
if (!result.valid) {
  const hasBlockingError = result.errors.some(e => e.severity === 'error');
  
  if (hasBlockingError) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        error: 'Character violates SRD rules',
        violations: result.errors.map(e => ({
          code: e.code,
          message: e.message,
          srdPage: e.srdPageCitation,
        })),
      }),
    };
  }
  
  // Warnings are non-blocking; log but continue
  console.warn('Non-blocking warnings:', result.errors);
}
```

**For Frontend UI**:
```typescript
// Display errors with SRD citations for player education
result.errors.forEach(error => {
  if (error.severity === 'error') {
    ui.showError(error.message);
    ui.showHelp(`See ${error.srdPageCitation} for details`);
  }
});
```

---

## Campaign Customization

### What CAN Be Customized

✅ **Allowed**:
- Custom class definitions (following markdown template)
- Custom domain definitions and cards
- Custom ancestry/community traits
- Custom downtime moves (following Homebrew Kit patterns)
- Custom conditions (if following SRD condition mechanics)

### What CANNOT Be Customized

❌ **Fixed by SRD**:
- Trait modifiers (always [+2, +1, +1, +0, +0, -1])
- Damage severity thresholds (always Major = Level + Base, Severe = 2×(Level + Base))
- Armor cap (always ≤ 12)
- Domain loadout limit (always 5 cards max)
- Proficiency scaling (always 1→2→3→4 by tier)
- Rest economy (always 3 consecutive short rests max)
- Death outcome formula (always Hope Die roll vs. Level)

### Adding Custom Content

When adding custom content to `markdown/`:

1. **Classes**: Follow template in `markdown/Classes/Classes.md`
   - Define `startingEvasion` (must be > 0 and ≤ 12)
   - Define `startingHitPoints` (must be > 0)
   - Assign exactly 2 starting domains (names only; card selection happens at play time)

2. **Domains & Cards**: Follow template structure
   - Cards must have `level` in range 1-5
   - Cursed cards (★) must define curse mechanics
   - Cards must be level-gated (player can only select ≤ their level)

3. **Test Locally**:
   ```bash
   npm run validate-campaign-frame
   ```
   This runs all validators against `markdown/` before ingestion.

---

## Testing

### Unit Test Pattern

**File**: `ingestion/tests/validators.test.ts`

```typescript
import { validateClassWithSRD } from '../src/validators/IngestionValidator';
import { validateDomainLoadoutSRDCompliance } from '../../../compliance/SrdValidationLayer';

describe('SRD Compliance Validators', () => {
  describe('validateClassWithSRD', () => {
    it('should pass valid class data', () => {
      const devout: ClassData = {
        classId: 'devout',
        name: 'Devout',
        startingEvasion: 10,
        startingHitPoints: 6,
        domains: ['Artistry', 'Faithful'],
      };
      
      const result = validateClassWithSRD(devout);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
    
    it('should fail if evasion exceeds 12', () => {
      const invalid: ClassData = {
        classId: 'invalid',
        name: 'Invalid',
        startingEvasion: 13,  // Too high!
        startingHitPoints: 6,
        domains: ['A', 'B'],
      };
      
      const result = validateClassWithSRD(invalid);
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          code: 'INVALID_ARMOR_SCORE',
          srdPageCitation: expect.stringContaining('page 3'),
        })
      );
    });
  });
  
  describe('validateDomainLoadoutSRDCompliance', () => {
    it('should fail if loadout > 5 cards', () => {
      const result = validateDomainLoadoutSRDCompliance(
        5,
        ['a', 'b', 'c', 'd', 'e', 'f'],  // 6 cards!
        new Map()
      );
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          code: 'INVALID_LOADOUT_SIZE',
        })
      );
    });
  });
});
```

---

## Deployment Checklist

- [ ] `/compliance/srd-rules-specification.ts` is deployed to Lambda layer
- [ ] `/compliance/SrdValidationLayer.ts` is deployed to Lambda layer
- [ ] `ingestion/src/validators/IngestionValidator.ts` imports SRD validators
- [ ] Backend API lambdas import and call validators on all character mutations
- [ ] Frontend imports validators and uses them for UI state management
- [ ] Ingestion pipeline runs validators before writing to DynamoDB
- [ ] Test suite covers all 25+ error codes
- [ ] Error messages include SRD page citations in responses
- [ ] Logging captures all validation violations for audit trail

---

## Troubleshooting

### "INVALID_ARMOR_SCORE: startingEvasion 13 exceeds SRD maximum of 12"

**Cause**: Class definition has armor score > 12  
**Fix**: Update markdown class file; set `startingEvasion ≤ 12`  
**Reference**: SRD page 3 — armor score cap is 12

### "INVALID_DOMAIN_LEVEL_GATE: Card level 6 must be 1-5"

**Cause**: Domain card has invalid level  
**Fix**: Update domain card metadata; rename to `(Level N)` where N ∈ [1,5]  
**Reference**: SRD page 4 — domain cards are levels 1-5 only

### "INVALID_LOADOUT_SIZE: Domain loadout has 6 cards, but SRD max is 5"

**Cause**: Character's active domain cards exceed 5-card limit  
**Fix**: Move excess cards to vault (unlimited); recall only when needed  
**Reference**: SRD page 5 — active loadout max is 5 cards

---

## References

- **Daggerheart SRD 1.0** (9-09-25): `.opencode/supporting-docs/Daggerheart-SRD-digested.md`
- **Daggerheart Homebrew Kit v1.0**: `.opencode/supporting-docs/Daggerheart-Homebrew-Kit-digested.md`
- **Compliance Spec**: `/compliance/SPECIFICATION.md`
- **Rules Engine**: `/compliance/srd-rules-specification.ts`
- **Campaign Frame Validator**: `/compliance/SrdValidationLayer.ts`
- **Ingestion Validator**: `/ingestion/src/validators/IngestionValidator.ts`

---

**Status**: ✅ Complete  
**Quality Gate**: All universal + campaign-specific rules documented and integrated  
**Maintained By**: SRD Compliance Agent
