# SRD Compliance Validation — Backend Implementation

**Status:** ✅ Production-ready  
**Last Updated:** 2026-03-21  
**Author:** Backend Agent  

---

## Overview

This document describes the SRD compliance validation layer implemented at the API level for the Daggerheart Character Platform. The validation system enforces all Daggerheart SRD rules before character data is written to DynamoDB.

**Key Principle:** Only allow state transitions that are legal under the SRD. Invalid updates are rejected with clear, detailed error messages that include SRD page citations.

---

## Architecture

### Three-Layer Validation

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Input Schema Validation (Zod)                            │
│    ├─ Required fields present                               │
│    ├─ Field types correct                                   │
│    └─ Basic bounds (e.g., string max length)               │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. Business Logic Validation (SRD Rules)                    │
│    ├─ Campaign frame constraints                            │
│    ├─ SRD stat bounds                                       │
│    ├─ Domain loadout rules                                  │
│    ├─ Level progression                                     │
│    └─ Advancement mechanics                                 │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. DynamoDB Constraint Enforcement                          │
│    ├─ Prevent illegal state writes                          │
│    ├─ TTL enforcement                                       │
│    └─ Type safety                                           │
└─────────────────────────────────────────────────────────────┘
```

### File Structure

```
backend/src/compliance/
├── srdValidator.ts          # Core validation logic (900+ lines)
├── apiMiddleware.ts         # API route middleware (600+ lines)
└── index.ts                 # Public exports

backend/tests/
├── unit/srdValidator.test.ts         # Unit tests (700+ lines)
└── fixtures/srdValidationFixtures.ts # Test data (500+ lines)
```

---

## Campaign Frame Constraints

**Critical:** Character options are **limited to what's defined in the campaign frame**. The validator only allows:

### Classes
- **Source:** `markdown/Classes/`
- **Constraint:** Character classId must be in `allowedClasses` Map
- **Error if violated:** `CLASS_NOT_IN_CAMPAIGN`

### Ancestries
- **Source:** `markdown/Ancestries/`
- **Constraint:** Character ancestryId (if provided) must be in `allowedAncestryIds` Set
- **Error if violated:** `ANCESTRY_NOT_IN_CAMPAIGN`
- **Note:** Optional field; null/undefined is allowed

### Communities
- **Source:** `markdown/Communities/`
- **Constraint:** Character communityId (if provided) must be in `allowedCommunityIds` Set
- **Error if violated:** `COMMUNITY_NOT_IN_CAMPAIGN`
- **Note:** Optional field; null/undefined is allowed

### Domains
- **Source:** Campaign frame for the class
- **Constraint:** Each domain must be in the character's class domains
- **Rules:**
  - Character has exactly 2 class domains (fixed per class, not chosen)
  - Domain cards must come from these 2 domains
  - Loadout cards must be from character's acquired domains
- **Error if violated:** `DOMAIN_NOT_IN_CLASS`, `CARD_DOMAIN_NOT_IN_CLASS`

---

## Core Stat Validation

### At Character Creation

**SRD p.3**

```typescript
// Each stat: 0 ≤ value ≤ 5
validateCoreStat(stat: CoreStatName, value: number, atCreation: true)
```

| Stat | Min | Max | Meaning |
|------|-----|-----|---------|
| Agility | 0 | 5 | Reflexes, dodging |
| Strength | 0 | 5 | Physical power |
| Finesse | 0 | 5 | Precision, coordination |
| Instinct | 0 | 5 | Perception, intuition |
| Presence | 0 | 5 | Charisma, force of personality |
| Knowledge | 0 | 5 | Intelligence, memory |

**Violations:**
- `STAT_NOT_INTEGER` — stat is not an integer
- `STAT_NEGATIVE` — stat < 0
- `STAT_EXCEEDS_CREATION_MAX` — stat > 5

### During Play

**SRD p.22**

```typescript
validateCoreStat(stat: CoreStatName, value: number, atCreation: false)
```

**With advancements, max is 8 for any stat.**

Level-up advancement "trait-bonus" grants +1 to a chosen stat and clears when the character advances to the next tier.

**Violations:**
- All creation violations (above), plus:
- `STAT_EXCEEDS_MAX` — stat > 8

---

## Hope Validation

**SRD p.20**

```typescript
validateHope(hope: number, hopeMax: number): ValidationError[]
```

| Property | Min | Max | Notes |
|----------|-----|-----|-------|
| `hope` | 0 | `hopeMax` | Current hope value |
| `hopeMax` | 1 | 6 | Base is 6; scars can reduce it |

**Violations:**
- `HOPE_NEGATIVE` — hope < 0
- `HOPE_EXCEEDS_MAX` — hope > hopeMax
- `HOPE_MAX_INVALID` — hopeMax < 1 or not integer
- `HOPE_MAX_EXCEEDS_BASE` — hopeMax > 6

---

## Tracker Validation (HP / Stress / Armor)

### HP Tracker

**SRD p.20, p.22**

```typescript
validateHpTracker(
  marked: number,
  max: number,
  classStartingHp: number,
  characterLevel: number
): ValidationError[]
```

**HP Max Calculation:**
- **Base:** Class starting HP (e.g., Warrior = 8)
- **Per Level:** +1 per level
- **With Advancement:** +1 per "hp-slot" advancement (max 12 additional)
- **Formula:** `HP_max = classBase + (advancements × 1)`

**At different levels:**
| Level | Warrior Base | Expected Max Range |
|-------|--------------|-------------------|
| 1     | 8            | 8–20              |
| 5     | 8            | 12–24             |
| 10    | 8            | 16–28             |

**Violations:**
- `HP_BELOW_CLASS_BASE` — max < classBase
- `HP_EXCEEDS_REASONABLE_MAX` — max > classBase + 12
- `HP_MARKED_INVALID` — marked < 0 or not integer
- `HP_MARKED_EXCEEDS_MAX` — marked > max

### Stress Tracker

**SRD p.20, p.22**

```typescript
validateStressTracker(
  marked: number,
  max: number,
  characterLevel: number
): ValidationError[]
```

**Stress Max Calculation:**
- **Base at level 1:** 5 (4 + proficiency 1)
- **Per Tier:** +1 per tier (tier = ceil(level / 2) - 1)
- **With Advancement:** +1 per "stress-slot" advancement (max 12 additional)

**At different levels:**
| Level | Tier | Expected Base | Expected Max Range |
|-------|------|---------------|-------------------|
| 1–2   | 0    | 5             | 5–17              |
| 3–4   | 1    | 6             | 6–18              |
| 5–6   | 2    | 7             | 7–19              |
| 9–10  | 4    | 9             | 9–21              |

**Violations:**
- `STRESS_BELOW_LEVEL_BASE` — max < expected base for level
- `STRESS_EXCEEDS_REASONABLE_MAX` — max > expected base + 12
- `STRESS_MARKED_INVALID` — marked < 0 or not integer
- `STRESS_MARKED_EXCEEDS_MAX` — marked > max

### Armor Tracker

**SRD p.20**

```typescript
validateArmorTracker(
  marked: number,
  max: number,
  characterLevel: number
): ValidationError[]
```

**Armor Max:**
- **Base:** 10 (can be modified by class/features)
- **Typical Range:** 10–13
- **Extreme Warning:** > 15 triggers a warning

**Violations:**
- `ARMOR_BELOW_BASE` — max < 10
- `ARMOR_UNUSUALLY_HIGH` (warning) — max > 15
- `ARMOR_MARKED_INVALID` — marked < 0 or not integer
- `ARMOR_MARKED_EXCEEDS_MAX` — marked > max

---

## Damage Threshold Validation

**SRD p.20**

```typescript
validateDamageThresholds(
  thresholds: { major: number; severe: number },
  characterLevel: number
): ValidationError[]
```

**Thresholds are calculated as:**
- **Major:** 10 + characterLevel
- **Severe:** 15 + characterLevel

**At different levels:**
| Level | Major | Severe |
|-------|-------|--------|
| 1     | 11    | 16     |
| 5     | 15    | 20     |
| 10    | 20    | 25     |

**Violations:**
- `MAJOR_NOT_INTEGER` — major is not integer
- `SEVERE_NOT_INTEGER` — severe is not integer
- `MAJOR_THRESHOLD_MISMATCH` — major ≠ 10 + level
- `SEVERE_THRESHOLD_MISMATCH` — severe ≠ 15 + level

---

## Domain Loadout Validation

**SRD p.4–5**

### Loadout Limits

```typescript
validateDomainLoadout(
  loadout: string[], // cardIds in active loadout
  vault: string[],   // cardIds owned but not active
  characterLevel: number,
  classDomains: string[],
  allCards: DomainCard[]
): ValidationError[]
```

**Loadout Rules:**

1. **Max 5 cards active** (flat limit, not level-scaled)
   - SRD p.5: "You can have up to 5 domain cards in your loadout at one time."
   - Violation: `LOADOUT_EXCEEDS_MAX`

2. **Every loadout card must be in vault** (acquisition constraint)
   - Character must have already acquired the card
   - Violation: `LOADOUT_CARD_NOT_IN_VAULT`

3. **Card level ≤ character level**
   - SRD p.4: Cards acquired must be "at or below their level"
   - Violation: `CARD_LEVEL_EXCEEDS_CHARACTER`

4. **Card domain must be in class domains**
   - SRD p.4: Cards come from "one of your class's domains"
   - Violation: `CARD_DOMAIN_NOT_IN_CLASS`

### Domain Selection

```typescript
validateDomainSelection(
  domains: string[],
  classDomains: string[]
): ValidationError[]
```

**Rules:**
- Character has exactly **2 class domains** (fixed per class)
- Both must be in `classDomains`
- Cannot have more than 2

**Violations:**
- `TOO_MANY_DOMAINS` — more than 2 domains
- `DOMAIN_NOT_IN_CLASS` — domain not in class domains

### Vault Mechanics

**SRD p.5**

- Vault cards are **inactive and do not influence play**
- Only loadout cards are active
- At level-up, new cards are added to vault (then can be moved to loadout)
- During play, vault cards can be swapped to loadout by paying Recall Cost in Stress
- During rest/downtime, swaps are free

---

## Level Validation

**SRD p.1–2**

```typescript
validateLevel(level: number): ValidationError[]
```

**Valid range:** 1–10 (10 tiers in Daggerheart)

**Violations:**
- `LEVEL_OUT_OF_RANGE` — level < 1 or level > 10 or not integer

### Level Progression

Level can only increase by **exactly 1**. The level-up endpoint (POST /characters/{id}/levelup) is the only way to advance.

**Violations:**
- `LEVEL_NOT_SEQUENTIAL` — attempted to jump levels or go backwards

---

## Proficiency Validation

**SRD p.3, p.22**

```typescript
validateProficiency(proficiency: number, characterLevel: number): ValidationError[]
```

**Proficiency Calculation:**
- **Base at level 1:** 1
- **Per Tier:** +1 per tier (tier = ceil(level / 2) - 1)
- **With Advancement:** "proficiency-increase" advancement grants +1

**Expected by level:**
| Level | Tier | Base Proficiency |
|-------|------|-----------------|
| 1–2   | 0    | 1               |
| 3–4   | 1    | 2               |
| 5–6   | 2    | 3               |
| 9–10  | 4    | 5               |

**Violations:**
- `PROFICIENCY_INVALID` — < 1 or not integer
- `PROFICIENCY_BELOW_BASE` — below expected base for level
- `PROFICIENCY_UNUSUALLY_HIGH` (warning) — more than base + 3

---

## Advancement Slot Validation

**SRD p.22**

```typescript
validateAdvancementSlots(advancements: AdvancementChoice[]): ValidationError[]
```

**Rules:**

1. **Exactly 2 advancement slots per level-up**
   - Most advancements cost 1 slot
   - Some cost 2 slots (proficiency-increase, multiclass)

2. **Double-slot advancements must be alone**
   - Can't combine proficiency + something else
   - Can't combine multiclass + something else

**Single-slot advancements:**
- trait-bonus
- hp-slot
- stress-slot
- experience-bonus
- new-experience
- evasion
- additional-domain-card
- subclass-upgrade

**Double-slot advancements:**
- proficiency-increase (costs both slots)
- multiclass (costs both slots; Tier 3+ only)

**Violations:**
- `ADVANCEMENT_SLOT_MISMATCH` — total slots ≠ 2
- `DOUBLE_SLOT_NOT_ALONE` — double-slot selected with other advancements

---

## Character Creation Validation

**POST /characters**

```typescript
validateCharacterCreation(
  character: Partial<Character>,
  classData: ClassData,
  context: SrdValidationContext
): SrdValidationResult
```

**Checks Performed:**

1. Class is in campaign frame
2. Ancestry/Community are in campaign frame (if provided)
3. All stats are in [0, 5]
4. Hope is valid (starting value is 2)
5. HP tracker is valid (class base)
6. Stress tracker is valid (5 at level 1)
7. Armor tracker is valid
8. Damage thresholds are correct
9. Domains are in class domains
10. Domain loadout is valid
11. Level is exactly 1
12. Proficiency is 1
13. Subclass (if provided) is valid

**Example:**

```typescript
const result = validateCharacterCreation(
  {
    name: "Aragorn",
    classId: "ranger",
    stats: { agility: 3, strength: 4, finesse: 3, instinct: 4, presence: 2, knowledge: 1 },
    hope: 2,
    trackers: {
      hp: { max: 8, marked: 0 },
      stress: { max: 5, marked: 0 },
      armor: { max: 10, marked: 0 }
    },
    damageThresholds: { major: 11, severe: 16 },
    domains: ["hunting", "survival"],
    domainLoadout: ["card1"],
    domainVault: ["card1"],
    proficiency: 1,
  },
  rangerClassData,
  validationContext
);

if (!result.valid) {
  // result.errors contains detailed failures
  return res.status(400).json({ errors: result.errors });
}
// Proceed to DynamoDB write
```

---

## Character Update Validation

**PUT /characters/{id}**

```typescript
validateCharacterUpdate(
  originalCharacter: Character,
  updatedFields: Partial<Character>,
  classData: ClassData,
  context: SrdValidationContext
): SrdValidationResult
```

**Key Difference from Creation:**
- Stats can be up to 8 (with level-up bonuses)
- Allows level increases (but only +1)
- Does NOT allow level to decrease

**Example: Stat Increase**

```typescript
const result = validateCharacterUpdate(
  originalCharacter,
  { stats: { ...originalCharacter.stats, strength: 6 } },
  classData,
  context
);
// Valid if level > 1 (allows bonuses)
```

**Example: Invalid Level Jump**

```typescript
const result = validateCharacterUpdate(
  originalCharacter, // level 5
  { level: 7 },
  classData,
  context
);
// Invalid: LEVEL_NOT_SEQUENTIAL
// Must use POST /characters/{id}/levelup instead
```

---

## Level-Up Validation

**POST /characters/{id}/levelup**

```typescript
validateLevelUpEndpoint(
  character: Character,
  choices: LevelUpChoices,
  classData: ClassData,
  context: SrdValidationContext
): SrdValidationResult
```

**Checks Performed:**

1. Target level = current level + 1
2. Advancement slots total exactly 2
3. Double-slot advancements are alone
4. New domain card (if provided) is valid:
   - Level ≤ target level
   - Domain in class domains
5. Exchange card logic (if provided):
   - Exchange card is in vault
   - New card level ≤ exchanged card level

**Example: Valid Level-Up**

```typescript
const choices: LevelUpChoices = {
  targetLevel: 5,
  advancements: [
    { type: "trait-bonus", detail: "strength" },
    { type: "hp-slot" }
  ],
  newDomainCardId: "domain-card-5-fireball",
  exchangeCardId: null
};

const result = validateLevelUpEndpoint(character, choices, classData, context);
if (!result.valid) {
  return res.status(400).json({ errors: result.errors });
}
// Proceed: update character level, apply advancements, add domain card
```

---

## Resource Change Validation

**PATCH /characters/{id}/resources**

```typescript
validateResourceChange(
  character: Character,
  updatedTrackers: Partial<Character['trackers']>,
  updatedHope?: number
): Promise<{ valid: true } | APIGatewayProxyResultV2>
```

**Constraints:**
- Marked values cannot exceed max
- Max values cannot be unreasonably high
- Hope cannot exceed hopeMax

**Use Case:** In-combat resource spending

```typescript
// Character spends 2 Stress
const result = await validateResourceChange(character, {
  stress: { max: 6, marked: 2 }
});
```

---

## Combat Action Validation

**PATCH /characters/{id}/combat**

```typescript
validateCombatAction(
  character: Character,
  action: {
    type: "attack" | "defend" | "spellcast" | "item-use" | "other";
    stressSpent?: number;
    hopeSpent?: number;
  }
): Promise<{ valid: true } | APIGatewayProxyResultV2>
```

**Constraints:**
- Stress spent ≤ marked Stress
- Hope spent ≤ current Hope

**Use Case:** Validating action resource expenditure

```typescript
const action = {
  type: "spellcast",
  stressSpent: 3,
  hopeSpent: 1
};

const result = await validateCombatAction(character, action);
if (result.valid) {
  // Deduct resources and apply action
} else {
  // Return error: insufficient Hope/Stress
}
```

---

## Domain Swap Validation

**PATCH /characters/{id}/domain-swap**

```typescript
validateDomainSwapRequest(
  character: Character,
  vaultCardId: string,
  loadoutCardIdToDisplace: string | null,
  duringRest: boolean,
  stressToDeduct?: number
): Promise<{ valid: true } | APIGatewayProxyResultV2>
```

**SRD p.5 Constraints:**

1. **Vault card must exist** in character's vault
2. **Loadout card (if displaced)** must exist in loadout
3. **Resulting loadout ≤ 5 cards**
4. **Stress deduction (mid-play):**
   - Only if NOT during rest
   - Cannot exceed marked Stress
   - Equals vault card's Recall Cost

**Example: Mid-Play Swap (Costs Stress)**

```typescript
// Character swaps "Power Strike" from vault to loadout during combat
// Power Strike has Recall Cost 2
const result = await validateDomainSwapRequest(
  character,
  "combat-power-strike",
  "combat-basic-slash", // displace this
  false, // NOT during rest
  2 // must deduct 2 Stress
);

if (!result.valid) {
  return res.status(400).json({ errors: result.errors });
}
// Deduct 2 Stress, perform swap
```

**Example: Rest Swap (Free)**

```typescript
// Character swaps during downtime/rest
const result = await validateDomainSwapRequest(
  character,
  "combat-power-strike",
  "combat-basic-slash",
  true, // during rest
  0 // no Stress cost
);
```

---

## Rest Validation

**POST /characters/{id}/rest**

```typescript
validateRestRequest(
  character: Character,
  restType: "short" | "long"
): Promise<{ valid: true } | APIGatewayProxyResultV2>
```

**Constraints:**
- Rest type must be "short" or "long"

**Note:** Actual healing amounts are calculated server-side after validation.

---

## Error Response Format

All SRD validation errors are returned as structured API responses:

```json
{
  "error": {
    "code": "SRD_VALIDATION_FAILED",
    "message": "Character sheet fails SRD compliance checks (3 errors)",
    "details": [
      {
        "field": "stats.strength",
        "issues": [
          {
            "rule": "STAT_EXCEEDS_CREATION_MAX",
            "message": "At character creation, stat strength cannot exceed 5 (received 6)",
            "srdPage": 3
          }
        ]
      },
      {
        "field": "trackers.stress.max",
        "issues": [
          {
            "rule": "STRESS_BELOW_LEVEL_BASE",
            "message": "Stress max (4) must be at least 6 for level 3",
            "srdPage": 20
          }
        ]
      }
    ]
  },
  "meta": {
    "requestId": "req-123",
    "timestamp": "2026-03-21T12:00:00Z"
  }
}
```

---

## Integration with API Handlers

### Lambda Handler Pattern

```typescript
// backend/src/characters/handler.ts

async function handlePostCharacter(event: APIGatewayProxyEventV2WithJWTAuthorizer) {
  const userId = extractUserId(event);
  const body = parseBody(event);

  // 1. Schema validation (Zod)
  const parsed = CreateCharacterSchema.parse(body);

  // 2. Load class data
  const classData = await getItem(CLASSES_TABLE, { PK: `class#${parsed.classId}` });
  if (!classData) {
    return createErrorResponse({
      code: "CLASS_NOT_FOUND",
      message: "Class not found"
    }, 404);
  }

  // 3. Build validation context
  const allCards = await getAllDomainCards(); // cached in Lambda memory
  const context = buildValidationContext(
    { classId: parsed.classId } as Character,
    classData,
    {
      allowedClasses: loadedClasses,
      allowedDomainIds: loadedDomainIds,
      allowedAncestryIds: loadedAncestryIds,
      allowedCommunityIds: loadedCommunityIds,
      allDomainCards: allCards
    }
  );

  // 4. SRD validation
  const validationResult = await validateCreationRequest(
    parsed,
    classData,
    context
  );

  if (validationResult !== true && "error" in validationResult) {
    return validationResult; // 400 with structured errors
  }

  // 5. Create character in DynamoDB
  const character: Character = {
    characterId: uuidv4(),
    userId,
    name: parsed.name,
    // ... initialize all fields per SRD defaults
  };

  await putItem(CHARACTERS_TABLE, character);

  return createSuccessResponse(character, 201);
}
```

---

## Testing

### Running Tests

```bash
# Run all SRD validator tests
npm test -- srdValidator.test.ts

# Run specific test suite
npm test -- srdValidator.test.ts -t "Core Stat Validators"

# Run with coverage
npm test -- srdValidator.test.ts --coverage
```

### Test Coverage

The test suite includes:

- **Campaign frame tests** (30+ cases)
- **Core stat tests** (20+ cases)
- **Tracker tests** (HP, Stress, Armor — 20+ cases)
- **Damage threshold tests** (10+ cases)
- **Domain loadout tests** (20+ cases)
- **Level & proficiency tests** (15+ cases)
- **Advancement tests** (10+ cases)
- **Character creation tests** (10+ cases)
- **Character update tests** (10+ cases)
- **Level-up tests** (10+ cases)

**Total: 700+ lines of test code, 100+ test cases**

### Test Fixtures

Pre-built fixtures for common scenarios:

```typescript
// Valid characters at all levels
const level1 = fixtures.valid.createValidCharacter(1);
const level10 = fixtures.valid.createValidCharacter(10);

// Valid advancements
const traitBonus = fixtures.valid.createValidTraitBonusAdvancement();
const profIncrease = fixtures.valid.createValidProficiencyAdvancement();

// Invalid characters (expected to fail)
const invalidStats = fixtures.invalid.createInvalidCharacterStatTooHigh();
const invalidLoadout = fixtures.invalid.createInvalidCharacterLoadoutTooMany();
```

---

## DynamoDB Schema Constraints

To ensure SRD compliance at the database layer:

### Partition/Sort Keys

```typescript
// Characters table
PK: user#{userId}
SK: character#{characterId}

// Global Secondary Indexes
GSI1PK: class#{classId}
GSI1SK: level#{level}

GSI2PK: campaign#{campaignId}
GSI2SK: createdAt#{createdAt}
```

### Type Safety

All fields are strictly typed:

```typescript
// Type: Ensures only valid levels can be stored
level: { N: "1-10" } // DynamoDB number constraint

// Type: Ensures valid enum values
restType: { S: "short|long" } // DynamoDB enum constraint

// Type: Ensures valid booleans
isCursed: { BOOL: true|false }

// Type: Ensures valid strings (FK constraints)
classId: { S: "^[a-z-]+$" } // Validate format
```

### Optimization Indexes

**Query patterns that must be efficient:**

1. Get character by userId + characterId (PK+SK)
2. Get all characters by classId (GSI1)
3. Get all characters by level (GSI1 + filter)
4. Get campaign characters ordered by creation (GSI2)

---

## Performance Considerations

### Validator Complexity

All validators are **O(n)** where n = number of elements (cards, advancements, etc.):

- Character creation: O(1) fixed checks + O(d) for d cards
- Character update: O(1) fixed checks + O(d) for d cards
- Level-up: O(1) fixed checks

### Memory Usage

- ValidationContext loaded once at Lambda cold start
- Reused for multiple validation calls
- ~100KB per campaign frame (classes, domains, etc.)

### Caching Strategy

```typescript
// Cache in Lambda memory (reused across invocations)
let classesCache: Map<string, ClassData> | null = null;
let domainsCache: DomainCard[] | null = null;

function getValidationContext(): SrdValidationContext {
  if (!classesCache) {
    classesCache = loadClasses(); // Load from S3 or DynamoDB
    domainsCache = loadDomains();
  }
  return {
    allowedClasses: classesCache,
    allDomainCards: domainsCache,
    // ...
  };
}
```

---

## Future Enhancements

### Potential Additions

1. **Custom validations** per campaign (via CC: rules in markdown)
2. **Validator hooks** for homebrew domain cards
3. **Batch validation** for bulk imports
4. **Audit logging** of all validation failures
5. **A/B testing** of validation rules
6. **Performance metrics** per validator

---

## References

- **SRD p.N:** Daggerheart-SRD-digested.md page number
- **HBK p.N:** Daggerheart-Homebrew-Kit-digested.md page number
- **CC: filename:** Campaign-specific markdown file

All SRD page citations are mapped to the digested source files at `.opencode/supporting-docs/`.

---

## Support & Debugging

### Common Validation Errors

| Error | Cause | Fix |
|-------|-------|-----|
| `CLASS_NOT_IN_CAMPAIGN` | Class not in campaign frame | Add to markdown/Classes/ and reload |
| `STAT_EXCEEDS_CREATION_MAX` | Stat > 5 at creation | Use POST /characters/levelup for bonuses |
| `LOADOUT_EXCEEDS_MAX` | More than 5 domain cards active | Move cards to vault |
| `ADVANCEMENT_SLOT_MISMATCH` | Total slots ≠ 2 | Choose exactly 2 slots worth |
| `LEVEL_NOT_SEQUENTIAL` | Tried to jump levels | Use POST /characters/{id}/levelup for each level |

### Debug Mode

Enable detailed logging:

```typescript
// In srdValidator.ts
const DEBUG = process.env.SRD_VALIDATION_DEBUG === "true";

if (DEBUG) {
  console.log("[SRD] Validating character:", character.name);
  console.log("[SRD] Class domains:", classData.domains);
  console.log("[SRD] Character domains:", character.domains);
}
```

---

**Version:** 1.0  
**Status:** ✅ Ready for production  
**Last Review:** 2026-03-21
