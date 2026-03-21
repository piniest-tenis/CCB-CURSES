# SRD Rules Specification & Compliance Documentation

**Status**: Complete - Comprehensive machine-readable ruleset for Daggerheart mechanics enforcement

**Generated**: 2026-03-21  
**Authority**: Daggerheart SRD 1.0 (9-09-25, © 2025 Critical Role LLC)  
**Version**: 1.0.0

---

## Table of Contents

1. [Overview](#overview)
2. [Scope & Constraints](#scope--constraints)
3. [Core Rules Enforced](#core-rules-enforced)
4. [Integration Points](#integration-points)
5. [Validation Error Categories](#validation-error-categories)
6. [Implementation Notes](#implementation-notes)
7. [Campaign Customization](#campaign-customization)

---

## Overview

The `srd-rules-specification.ts` file provides a **machine-readable, deterministic ruleset** that enforces all universal Daggerheart mechanics—combat, resources, progression, and rest rules—without prescribing character options (classes, domains, ancestries, communities).

**Key Design Principle**: Rules that apply to **all characters** are hardcoded here. Rules that vary by **campaign/character-choice** are validated against campaign frame data at ingestion time.

### What This File Does
- ✅ Validates character creation inputs
- ✅ Enforces combat roll evaluation
- ✅ Calculates damage and armor mechanics
- ✅ Validates advancement progression
- ✅ Enforces resource limits (HP, Stress, Hope, Armor Score)
- ✅ Validates domain system constraints
- ✅ Validates rest and downtime rules
- ✅ Validates death and scarring mechanics

### What This File Does NOT Do
- ❌ Define which classes/domains exist (comes from campaign frame)
- ❌ Define class-specific starting stats (comes from campaign frame via `CLASS_STARTING_STATS`)
- ❌ Enumerate class features or abilities
- ❌ Define ancestry/community features
- ❌ Provide narrative flavor or lore

---

## Scope & Constraints

### Universal Rules (Enforced Everywhere)

These rules apply to ALL characters in ALL campaigns and cannot be overridden:

#### Character Creation (SRD Page 3)
| Rule | Constraint | Citation |
|------|-----------|----------|
| Trait Modifiers | Must use [+2, +1, +1, +0, +0, -1] in any order | Page 3 |
| Trait Sum | Modifiers must sum to +2 | Page 3 |
| Starting Stress | Always 6 | Page 3 |
| Starting Hope | Always 2 | Page 4 |
| Starting Proficiency | Always 1 | Page 4 |
| Armor Score Cap | Never exceeds 12 | Page 29 |
| Starting Domains | Exactly 2 cards, all level ≤ 1 | Page 4 |

#### Combat (SRD Pages 35-42)
| Rule | Constraint | Citation |
|------|-----------|----------|
| Duality Roll | Roll Hope Die + Fear Die, compare to Difficulty | Page 35 |
| Critical Success | Both dice match AND both in upper half of die | Page 35 |
| Damage Severity | Minor(1 HP) / Major(2 HP) / Severe(3 HP) / Massive(4 HP) | Page 39 |
| Major Threshold | Level + Armor Base | Page 29 |
| Severe Threshold | 2 × (Level + Armor Base) | Page 29 |
| Armor Slot Reduction | Reduces severity by 1 threshold (Severe→Major, etc) | Page 29 |
| Armor Score Max | 0 HP marked if Score = 0 (unarmored) | Page 29 |

#### Resources (SRD Pages 3-4, 39)
| Rule | Constraint | Citation |
|------|-----------|----------|
| HP Range | 0 to class-max (varies by class) | Page 3 |
| Stress Range | 0 to 12 | Page 39 |
| Hope Range | 0 to 6 | Page 4 |
| Armor Score Range | 0 to 12 | Page 29 |

#### Progression (SRD Pages 42-43)
| Rule | Constraint | Citation |
|------|-----------|----------|
| Tier 1 Proficiency | 1 (Level 1) | Page 42 |
| Tier 2 Proficiency | 2 (Levels 2-4) | Page 42 |
| Tier 3 Proficiency | 3 (Levels 5-7) | Page 42 |
| Tier 4 Proficiency | 4 (Levels 8-10) | Page 42 |
| Domain Level Gate | card_level ≤ character_level | Page 5 |
| Multiclass Unlock | Available at level 5+ | Page 43 |
| Multiclass Domain Limit | domain_level ≤ ceil(character_level / 2) | Page 43 |

#### Domain System (SRD Pages 4-5)
| Rule | Constraint | Citation |
|------|-----------|----------|
| Loadout Max | 5 active cards | Page 5 |
| Vault Size | Unlimited | Page 5 |
| Downtime Swap | Free card swap at rest start | Page 5 |
| Recall Cost | Stress cost to move vault→loadout (outside rest) | Page 5 |

#### Rest & Downtime (SRD Page 41)
| Rule | Constraint | Citation |
|------|-----------|----------|
| Short Rest Duration | 1-2 hours | Page 41 |
| Long Rest Duration | 8 hours | Page 41 |
| Short Rest Fear | GM gains 1d4 Fear | Page 41 |
| Long Rest Fear | GM gains 1d4 + number of PCs Fear | Page 41 |
| Consecutive Short Rests | Max 3 before forced long rest | Page 41 |

#### Death (SRD Page 42)
| Rule | Constraint | Citation |
|------|-----------|----------|
| Death Options | Blaze, Avoid, Risk | Page 42 |
| Scar Check | Hope Die ≤ Level = survive + gain scar; > Level = die | Page 42 |

---

## Core Rules Enforced

### 1. Character Creation Validation

```typescript
validateCharacterCreation(input, classStats, allowedDomains)
```

**Validates**:
- ✓ Trait modifiers sum to +2
- ✓ Trait modifiers are [+2, +1, +1, +0, +0, -1]
- ✓ Starting Evasion matches class definition
- ✓ Starting HP matches class definition
- ✓ Stress = 6, Hope = 2, Proficiency = 1
- ✓ Armor Score ≤ 12
- ✓ Domain loadout = 2 cards, all level ≤ 1

**Error Codes**:
- `INVALID_TRAIT_ASSIGNMENT`
- `INVALID_STARTING_STATS`
- `INVALID_ARMOR_SCORE`
- `INVALID_DOMAIN_LOADOUT`

### 2. Combat Roll Evaluation

```typescript
evaluateDualityRoll(hopeDie, fearDie, difficulty)
```

**Returns**: `RollOutcome` enum with:
- `CRITICAL_SUCCESS`: Both dice match + both in upper half
- `SUCCESS_WITH_HOPE`: Hope Die ≥ Difficulty
- `SUCCESS_WITH_FEAR`: Fear Die ≥ Difficulty (Hope < Difficulty)
- `FAILURE_WITH_FEAR`: Both < Difficulty
- `FAILURE_WITH_HOPE`: (Internal tracking)

**Error Codes**: `INVALID_DUALITY_ROLL`

### 3. Damage Calculation

```typescript
calculateDamageThresholds(level, armorBase)
determineDamageSeverity(hpDamage, thresholds)
reduceArmorSeverity(severity)
validateArmorSlotMark(armorScore, remaining)
```

**Damage Severity Levels**:
- `0 (NONE)`: No damage
- `1 (MINOR)`: 1 HP marked
- `2 (MAJOR)`: 2 HP marked, threshold = Level + Base
- `3 (SEVERE)`: 3 HP marked, threshold = 2(Level + Base)
- `4 (MASSIVE)`: 4 HP marked (rare)

**Thresholds Calculation**:
```
Major = Level + ArmorBase
Severe = 2 × (Level + ArmorBase)
```

**Armor Reduction**:
- Marking 1 Armor Slot reduces severity by 1 step
- Severe → Major, Major → Minor, Minor → None

**Error Codes**: 
- `INVALID_DAMAGE_CALC`
- `INVALID_ARMOR_SLOT_MARK`

### 4. Resource Validation

```typescript
validateHPSlots(current, max)
validateStressSlots(current, max)
validateHope(current)
validateArmorScore(score)
```

**Constraints**:
- HP: 0 ≤ current ≤ max (class-determined max)
- Stress: 0 ≤ current ≤ 12
- Hope: 0 ≤ current ≤ 6
- Armor Score: 0 ≤ score ≤ 12

**Error Codes**:
- `INVALID_HP_SLOT`
- `INVALID_STRESS_SLOT`
- `INVALID_HOPE_VALUE`
- `INVALID_ARMOR_SCORE`

### 5. Advancement Validation

```typescript
calculateProficiency(level)
validateProficiencyProgression(level, proficiency)
validateAdvancement(oldLevel, newLevel, newDomainCards, multiclass)
```

**Proficiency Progression**:
| Tier | Levels | Proficiency |
|------|--------|-------------|
| 1 | 1 | 1 |
| 2 | 2-4 | 2 |
| 3 | 5-7 | 3 |
| 4 | 8-10 | 4 |

**Domain Level Gating**: Each new card must have level ≤ character_level

**Multiclass Rules**:
- Only available at level 5+
- Domain card must have level ≤ ceil(level / 2)
- Activating multiclass locks out future multiclass choices

**Error Codes**:
- `INVALID_PROFICIENCY_PROGRESSION`
- `INVALID_DOMAIN_LEVEL_GATE`
- `INVALID_MULTICLASS`

### 6. Domain System Validation

```typescript
validateDomainLoadout(cards, characterLevel)
validateRecallCost(cost, stress, isDuringRest)
```

**Loadout Constraints**:
- Maximum 5 active cards
- All cards must have level ≤ character level
- Subclass, ancestry, community cards don't count toward limit

**Recall (Vault → Loadout)**:
- Outside rest: costs Stress (card's recall cost)
- During rest: FREE (downtime swap)
- Unlimited cards in vault

**Error Codes**:
- `INVALID_LOADOUT_SIZE`
- `INVALID_DOMAIN_LEVEL_GATE`
- `INVALID_RECALL_COST`

### 7. Rest & Downtime Validation

```typescript
validateRest(restType, consecutiveShortRests)
```

**Rest Types**:
- `SHORT`: 1-2 hours, GM gains 1d4 Fear
- `LONG`: 8 hours, GM gains 1d4 + PC count Fear

**Consecutive Short Rest Limit**:
- Max 3 consecutive short rests
- 4th must be a long rest
- Long rest resets counter

**Error Codes**: `INVALID_CONSECUTIVE_SHORT_RESTS`

### 8. Death & Scarring Validation

```typescript
validateDeathOption(option)
validateScarCheck(hopeDieRoll, characterLevel)
determineScarCheckOutcome(hopeDieRoll, characterLevel)
```

**Death Options** (at last HP):
- `BLAZE`: Take one final dramatic action
- `AVOID`: Retreat/hide/flee scene
- `RISK`: Roll Hope Die for scar check

**Scar Check** (Risk option):
```
If (Hope Die Roll ≤ Character Level):
  → Character survives with 1 HP
  → Character gains a scar
  → Campaign continues

Else (Hope Die Roll > Character Level):
  → Character dies
  → Campaign ends for that character
```

**Error Codes**:
- `INVALID_DEATH_OPTION`
- `INVALID_SCAR_CHECK`

---

## Integration Points

### Backend API

Each API endpoint that modifies character state should invoke relevant validators:

```typescript
// POST /characters (creation)
const validation = validateCharacterCreation(input, classStats, allowedDomains);
if (!validation.valid) {
  return 400 { errors: validation.errors };
}

// POST /characters/:id/advance (level up)
const advCheck = validateAdvancement({
  oldLevel, newLevel, newDomainCards, multiclassActive
});
if (!advCheck.valid) {
  return 400 { errors: advCheck.errors };
}

// POST /characters/:id/action-roll (combat)
const roll = evaluateDualityRoll(hopeDie, fearDie, difficulty);
// Use roll.outcome to determine narrative result

// PATCH /characters/:id/damage (take damage)
const severity = determineDamageSeverity(hpDamage, thresholds);
const reduced = reduceArmorSeverity(severity); // if marking armor slot
// Apply reduced severity to HP

// PATCH /characters/:id/domains/:cardId/recall (recall domain card)
const recallValid = validateRecallCost(card.recallCost, char.stress, isDuringRest);
if (!recallValid.valid) {
  return 400 { errors: recallValid.errors };
}

// PATCH /characters/:id/rest (start rest)
const restValid = validateRest(restType, consecutiveShortRests);
if (!restValid.valid) {
  return 400 { errors: restValid.errors };
}

// POST /characters/:id/death (character reaches 0 HP)
const deathValid = validateDeathOption(option);
if (option === DeathOption.RISK) {
  const scarValid = validateScarCheck(hopeDieRoll, level);
  const outcome = determineScarCheckOutcome(hopeDieRoll, level);
  // Apply outcome to character
}
```

### Frontend Validation

Use these validators to prevent illegal UI actions:

```typescript
// Disable trait assignment UI if sum ≠ +2
const traitValid = validateTraitAssignment(traits);
if (!traitValid.valid) disableSubmit(); // Show errors

// Prevent adding >5 domain cards
if (loadout.length >= 5) {
  disableAddDomainButton();
}

// Prevent recalling cards when no stress or during rest
if (char.stress < card.recallCost) {
  disableDomainRecall();
}

// Prevent taking short rest when already at 3 consecutive
if (consecutiveShortRests >= 3) {
  disableShortRestButton();
  showMessage("Must take a long rest next");
}

// Prevent choosing multiclass before level 5
if (char.level < 5) {
  disableMulticlassOption();
}
```

### Data Ingestion

When ingesting campaign frame character options:

```typescript
// For each class in campaign frame:
const classStats = extractStats(classMarkdown);
// Validate this provides evasion and hp
ensureDefined(classStats.evasion, classStats.hp);

// For each domain in campaign frame:
const domain = extractDomain(domainMarkdown);
// Validate card-level matches
for (const card of domain.cards) {
  if (card.level < 1 || card.level > 10) {
    throw new Error(`Invalid card level: ${card.level}`);
  }
}

// Store in CLASS_STARTING_STATS, DOMAIN_DEFINITIONS, etc.
CLASS_STARTING_STATS[classStats.name] = classStats;
```

---

## Validation Error Categories

### Error Structure

```typescript
interface SRDValidationError {
  code: SRDErrorCode;                    // Machine-readable error code
  message: string;                       // Human-readable description
  srdPageCitation: string;               // SRD page reference
  severity: 'error' | 'warning';         // Error vs warning
  context?: Record<string, any>;         // Debugging context
}
```

### Error Codes by Category

#### Character Creation Errors (8 total)
- `INVALID_TRAIT_ASSIGNMENT` — Modifiers don't match [+2,+1,+1,+0,+0,-1] or don't sum to +2
- `INVALID_STARTING_STATS` — Starting Evasion/HP/Stress/Hope/Proficiency mismatch
- `INVALID_ARMOR_SCORE` — Armor Score < 0 or > 12
- `INVALID_DOMAIN_LOADOUT` — ≠2 cards or level > 1 at creation
- `INVALID_PROFICIENCY_START` — Starting Proficiency ≠ 1

#### Combat Errors (3 total)
- `INVALID_DUALITY_ROLL` — Invalid dice values or difficulty
- `INVALID_DAMAGE_CALC` — Invalid HP damage amount or threshold calculation
- `INVALID_ARMOR_SLOT_MARK` — Armor Score = 0 or no slots remaining

#### Resource Errors (4 total)
- `INVALID_HP_SLOT` — HP < 0 or > max
- `INVALID_STRESS_SLOT` — Stress < 0, > 12, or max > 12
- `INVALID_HOPE_VALUE` — Hope < 0 or > 6
- (Armor Score error in Character Creation section)

#### Advancement Errors (4 total)
- `INVALID_PROFICIENCY_PROGRESSION` — Proficiency doesn't match tier
- `INVALID_DOMAIN_LEVEL_GATE` — Domain card level > character level
- `INVALID_MULTICLASS` — Multiclass chosen before level 5, or domain level too high
- `INVALID_ADVANCEMENT_SLOT` — Too many advancement choices per level

#### Domain Errors (3 total)
- `INVALID_LOADOUT_SIZE` — > 5 cards in loadout
- `INVALID_DOMAIN_LEVEL_GATE` — (See advancement)
- `INVALID_RECALL_COST` — Insufficient Stress or invalid outside rest

#### Rest Errors (1 total)
- `INVALID_CONSECUTIVE_SHORT_RESTS` — > 3 consecutive short rests without long rest
- `INVALID_REST_TYPE` — Invalid rest type enum

#### Death Errors (2 total)
- `INVALID_DEATH_OPTION` — Death option not in [BLAZE, AVOID, RISK]
- `INVALID_SCAR_CHECK` — Invalid Hope Die roll (not 1-12) or character level (not 1-10)

---

## Implementation Notes

### Design Principles

1. **Deterministic**: All functions are pure (no side effects, same input = same output)
2. **Fail-fast**: Validation returns all errors at once (not one at a time)
3. **Explicit**: Every rule has a citation to SRD page number
4. **Separable**: Each rule area can be used independently (e.g., validate traits without validating armor)
5. **Extensible**: Homebrew rules can be added to separate validation layers

### Error Handling Strategy

```typescript
// Option 1: Throw on first error (fail-fast in strict mode)
if (!result.valid) {
  throw new SRDComplianceError(result.errors[0]);
}

// Option 2: Collect all errors (user-friendly UI)
if (!result.valid) {
  displayErrorsToUser(result.errors);
  return;
}

// Option 3: Log warnings (permissive mode)
result.errors.forEach(err => {
  if (err.severity === 'error') throw err;
  if (err.severity === 'warning') console.warn(err);
});
```

### Calculation Helpers

Common calculations are extracted into functions for reuse:

```typescript
getTier(level)                          // 1 → Tier 1, 5 → Tier 3, etc.
calculateProficiency(level)             // Level → Proficiency value
calculateDamageThresholds(level, base)  // → { major, severe }
determineDamageSeverity(hp, thresh)     // HP damage → severity enum
reduceArmorSeverity(severity)           // Severity after armor mark
determineScarCheckOutcome(roll, level)  // → { survives, gainsScar }
```

### Testing Strategy

Each validation function should have tests:

```typescript
describe('validateTraitAssignment', () => {
  it('accepts [2,1,1,0,0,-1]', () => {
    const result = validateTraitAssignment({
      Agility: 2, Strength: 1, Finesse: 1,
      Instinct: 0, Presence: 0, Knowledge: -1
    });
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('rejects [2,2,0,0,0,-1] (sum ≠ 2)', () => {
    // ... test code
    expect(result.valid).toBe(false);
    expect(result.errors[0].code).toBe(INVALID_TRAIT_ASSIGNMENT);
  });
});
```

---

## Campaign Customization

### What Can Be Customized

**Allowed customizations** (override campaign frame only, not SRD):

1. **Class Definitions**
   - Class names, themes, descriptions
   - Starting Evasion (9-12 range typical)
   - Starting HP (5-7 range typical)
   - Class features (abilities, mechanics)
   - Class Hope features
   - Subclass definitions
   - Domain access (e.g., Bard: Grace & Codex)

2. **Domain Definitions**
   - Domain names, themes, descriptions
   - Card levels (1-10)
   - Recall costs (1-3 typical)
   - Card mechanics and features
   - Card availability by class

3. **Ancestry Features**
   - Ancestry trait modifiers
   - Ancestry feature mechanics
   - Mixed ancestry rules

4. **Community Features**
   - Community feature mechanics
   - Community-specific bonuses

5. **Homebrew Content** (per Homebrew Kit)
   - Custom domains
   - Custom classes
   - Custom ancestries/communities
   - Campaign-specific conditions
   - Custom downtime moves
   - Custom damage types

### What CANNOT Be Customized

**Forbidden modifications** (hardcoded in SRD rules):

- ❌ Trait modifier set ([+2,+1,+1,+0,+0,-1] is fixed)
- ❌ Trait sum (+2 total is fixed)
- ❌ Starting Stress (always 6)
- ❌ Starting Hope (always 2)
- ❌ Armor Score cap (always 12)
- ❌ Proficiency progression (1→2→3→4 by tier)
- ❌ Tier structure (L1/2-4/5-7/8-10)
- ❌ Damage threshold formulas
- ❌ Damage severity system
- ❌ Domain loadout limit (5 cards)
- ❌ Rest consecutive short rest limit (3)
- ❌ Death option set (Blaze/Avoid/Risk)
- ❌ Scar check formula (Hope Die ≤ Level)

### Homebrew Pattern Support

The Homebrew Kit (Daggerheart-Homebrew-Kit-digested.md) defines official patterns for custom content. This specification includes hooks for:

- Custom domain mechanics ✓
- Custom class features ✓
- Custom conditions ✓
- Custom downtime moves ✓
- Campaign-specific rules ✓

**Future enhancements** to this spec:
- Homebrew class validator
- Homebrew domain validator
- Homebrew condition registry
- Custom advancement rule validator

---

## File Locations & Usage

### Source File
```
/compliance/srd-rules-specification.ts
```

### Exports (TypeScript)

```typescript
// Functions (validation & calculation)
export function validateCharacterCreation(...)
export function evaluateDualityRoll(...)
export function calculateDamageThresholds(...)
export function validateAdvancement(...)
// ... and 15+ more

// Types
export interface SRDValidationError
export interface ValidationResult
export interface CharacterCreationInput
export interface DamageThresholds
export enum SRDErrorCode
export enum Tier
export enum RestType
export enum DeathOption
export enum DiceType
export enum RollOutcome
export enum Condition
// ... and more

// Constants
export const TRAIT_MODIFIERS
export const RESOURCE_LIMITS
export const DOMAIN_SYSTEM
export const TIER_STRUCTURE
export const PROFICIENCY_PROGRESSION
export const REST_RULES
// ... and more
```

### Integration
```typescript
// Backend API (Node.js/Express)
import SRD from '/compliance/srd-rules-specification';

app.post('/characters', (req, res) => {
  const validation = SRD.validateCharacterCreation(
    req.body,
    CLASS_STARTING_STATS[req.body.class],
    ALLOWED_DOMAINS[req.body.campaign]
  );
  if (!validation.valid) return res.status(400).json(validation);
  // ... proceed
});

// Frontend (React/Vue/etc)
import SRD from '/compliance/srd-rules-specification';

function TraitAssignment({ traits }) {
  const validation = SRD.validateTraitAssignment(traits);
  return (
    <div>
      {validation.errors.map(err => (
        <Error key={err.code}>{err.message}</Error>
      ))}
      <button disabled={!validation.valid}>Next</button>
    </div>
  );
}

// Testing
import SRD from '/compliance/srd-rules-specification';
describe('SRD Rules', () => {
  it('validates traits correctly', () => {
    const result = SRD.validateTraitAssignment({...});
    expect(result.valid).toBe(true);
  });
});
```

---

## Authority & Versioning

**SRD Version**: 1.0 (Daggerheart-SRD-9-09-25.pdf)  
**Homebrew Kit Version**: 1.0 (July 31, 2025)  
**Specification Version**: 1.0.0  
**Status**: Complete & Ready for Integration

**SRD Copyright**: © 2025 Critical Role LLC. All rights reserved.  
**Licensed Under**: Darrington Press Community Gaming License

---

## Next Steps

1. **Backend Integration**: Import into API validation middleware
2. **Frontend Integration**: Integrate into character creation UI
3. **Data Ingestion**: Use for validating campaign frame content
4. **QA Automation**: Create test suite covering all 25+ validators
5. **Homebrew Extension**: Add validators for homebrew content patterns

---

**Maintained by**: SRD Compliance Agent  
**Last Updated**: 2026-03-21  
**Questions/Issues**: Refer to SRD page citations in error messages
