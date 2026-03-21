# SRD Validation — Quick Reference

**Use this document when integrating validators into API handlers.**

---

## Quick Start

### 1. Import validators

```typescript
import {
  validateCharacterCreation,
  validateCharacterUpdate,
  validateLevelUpEndpoint,
  buildValidationContext,
  formatValidationError,
} from "../compliance";
```

### 2. Build validation context (once per Lambda cold start)

```typescript
// Load campaign frame data
const classesMap = new Map<string, ClassData>();
const allCards: DomainCard[] = [];
const ancestryIds = new Set<string>();
const communityIds = new Set<string>();

// Populate from loaded campaign data...

const context: SrdValidationContext = buildValidationContext(
  characterPlaceholder,
  characterPlaceholder.classId, // classData
  {
    allowedClasses: classesMap,
    allowedDomainIds: new Set(allCards.map(c => c.domain)),
    allowedAncestryIds: ancestryIds,
    allowedCommunityIds: communityIds,
    allDomainCards: allCards,
  }
);
```

### 3. Validate at each endpoint

```typescript
// POST /characters — Creation
const result = await validateCreationRequest(
  body,
  classData,
  context
);
if (result !== true && "error" in result) {
  return result; // 400 with errors
}

// PUT /characters/{id} — Update
const result = await validateUpdateRequest(
  originalCharacter,
  body,
  classData,
  context
);

// POST /characters/{id}/levelup — Level-up
const result = await validateLevelUpRequest(
  character,
  body, // LevelUpChoices
  classData,
  context
);
```

---

## Validation Endpoints

### Character Creation

**POST /characters**

```typescript
const result = validateCharacterCreation(
  input: Partial<Character>,
  classData: ClassData,
  context: SrdValidationContext
): SrdValidationResult
```

**Requirements:**
- Level = 1 (always)
- Stats ∈ [0, 5]
- Hope = 2 (starting value)
- Proficiency = 1
- Class in campaign frame
- Domains in class domains
- Loadout valid

**Returns:** Object with `valid: boolean` and `errors: ValidationError[]`

**Example:**

```typescript
const result = validateCharacterCreation(
  {
    name: "Aragorn",
    classId: "ranger",
    stats: { agility: 3, strength: 3, finesse: 3, instinct: 3, presence: 2, knowledge: 1 },
    hope: 2,
    proficiency: 1,
    // ...
  },
  rangerClass,
  context
);

if (!result.valid) {
  return formatValidationError(result); // 400
}
// Proceed to DynamoDB write
```

---

### Character Update

**PUT /characters/{id}**

```typescript
const result = validateCharacterUpdate(
  originalCharacter: Character,
  updatedFields: Partial<Character>,
  classData: ClassData,
  context: SrdValidationContext
): SrdValidationResult
```

**Allows:**
- Stats up to 8 (with advancements)
- Level +1 only (else use levelup endpoint)
- Any tracker changes (HP/Stress/Armor)
- Subclass changes (if valid)

**Rejects:**
- Level jumps (non-sequential)
- Stats > 8
- Invalid trackers
- Invalid domains

**Example:**

```typescript
const result = validateCharacterUpdate(
  character,
  {
    stats: { ...character.stats, strength: 6 },
    hope: 3,
  },
  classData,
  context
);

if (!result.valid) {
  return formatValidationError(result); // 400
}
```

---

### Level-Up

**POST /characters/{id}/levelup**

```typescript
const result = validateLevelUpEndpoint(
  character: Character,
  choices: LevelUpChoices,
  classData: ClassData,
  context: SrdValidationContext
): SrdValidationResult
```

**Validates:**
- Target level = current + 1
- Advancement slots = 2
- Double-slots alone
- Domain card selection
- Exchange card rules

**Example:**

```typescript
const choices: LevelUpChoices = {
  targetLevel: 5,
  advancements: [
    { type: "trait-bonus", detail: "strength" },
    { type: "hp-slot" },
  ],
  newDomainCardId: "card-id",
  exchangeCardId: null,
};

const result = validateLevelUpEndpoint(character, choices, classData, context);

if (!result.valid) {
  return formatValidationError(result); // 400
}
```

---

### Resource Changes

**PATCH /characters/{id}/resources**

```typescript
const result = await validateResourceChange(
  character: Character,
  updatedTrackers: Partial<Character["trackers"]>,
  updatedHope?: number
): Promise<SrdValidationResult>
```

**Checks:**
- Marked ≤ max for all trackers
- Hope ≤ hopeMax

**Example:**

```typescript
// Character takes 3 damage
const result = await validateResourceChange(character, {
  hp: { max: 12, marked: 3 },
});

if (result !== true && "error" in result) {
  return result; // 400
}
```

---

### Combat Actions

**PATCH /characters/{id}/combat**

```typescript
const result = await validateCombatAction(
  character: Character,
  action: {
    type: "attack" | "defend" | "spellcast" | "item-use" | "other",
    stressSpent?: number,
    hopeSpent?: number,
  }
): Promise<SrdValidationResult>
```

**Checks:**
- Stress spent ≤ marked Stress
- Hope spent ≤ current Hope

**Example:**

```typescript
const result = await validateCombatAction(character, {
  type: "spellcast",
  stressSpent: 2,
  hopeSpent: 1,
});
```

---

### Domain Card Swaps

**PATCH /characters/{id}/domain-swap**

```typescript
const result = await validateDomainSwapRequest(
  character: Character,
  vaultCardId: string,
  loadoutCardIdToDisplace: string | null,
  duringRest: boolean,
  stressToDeduct?: number
): Promise<SrdValidationResult>
```

**SRD p.5 Rules:**
- During rest: free swap
- Mid-play: costs Stress (Recall Cost)
- Loadout max: 5 cards

**Example: Rest Swap (Free)**

```typescript
const result = await validateDomainSwapRequest(
  character,
  "vault-card-id",
  "loadout-card-id", // displace this
  true, // during rest
  0 // no cost
);
```

**Example: Mid-Play Swap (Costs Stress)**

```typescript
const result = await validateDomainSwapRequest(
  character,
  "vault-card-id",
  "loadout-card-id",
  false, // NOT during rest
  2 // Recall Cost = 2 Stress
);
```

---

### Rest/Downtime

**POST /characters/{id}/rest**

```typescript
const result = await validateRestRequest(
  character: Character,
  restType: "short" | "long"
): Promise<SrdValidationResult>
```

**Checks:**
- Rest type is valid
- Character can rest

---

## Error Handling

### Check Validity

```typescript
const result = validateCharacterCreation(...);

if (!result.valid) {
  // Has errors
  console.log(result.errors); // ValidationError[]
  return formatValidationError(result); // 400 response
} else {
  // No errors
  // Proceed to DynamoDB write
}
```

### Format for API Response

```typescript
if (!result.valid) {
  return formatValidationError(result);
}

// Returns:
// {
//   "error": {
//     "code": "SRD_VALIDATION_FAILED",
//     "message": "...",
//     "details": [...]
//   },
//   "meta": { "requestId": "...", "timestamp": "..." }
// }
// HTTP 400
```

### Check Specific Errors

```typescript
const result = validateCharacterUpdate(...);

if (result.errors.some(e => e.rule === "STAT_EXCEEDS_MAX")) {
  // Handle stat overflow specifically
}

if (result.errors.some(e => e.rule === "LEVEL_NOT_SEQUENTIAL")) {
  // Handle invalid level progression
}
```

---

## Common Patterns

### Character Creation Flow

```typescript
async function handlePostCharacter(event) {
  const userId = extractUserId(event);
  const body = parseBody(event);

  // 1. Schema validation (Zod)
  const input = CreateCharacterSchema.parse(body);

  // 2. Load class data
  const classData = await loadClass(input.classId);

  // 3. SRD validation
  const result = validateCharacterCreation(input, classData, context);
  if (!result.valid) {
    return formatValidationError(result);
  }

  // 4. Create in DynamoDB
  const character = await createCharacter(userId, input);

  return createSuccessResponse(character, 201);
}
```

### Character Update Flow

```typescript
async function handlePutCharacter(event) {
  const characterId = requirePathParam(event, "characterId");
  const userId = extractUserId(event);
  const body = parseBody(event);

  // 1. Load character
  const character = await getCharacter(userId, characterId);
  const classData = await loadClass(character.classId);

  // 2. Validate update
  const result = validateCharacterUpdate(character, body, classData, context);
  if (!result.valid) {
    return formatValidationError(result);
  }

  // 3. Merge and update
  const updated = { ...character, ...body };
  await updateCharacter(updated);

  return createSuccessResponse(updated, 200);
}
```

### Level-Up Flow

```typescript
async function handlePostLevelUp(event) {
  const characterId = requirePathParam(event, "characterId");
  const userId = extractUserId(event);
  const body = parseBody(event);

  // 1. Load character
  const character = await getCharacter(userId, characterId);
  const classData = await loadClass(character.classId);

  // 2. Validate level-up choices
  const result = validateLevelUpEndpoint(character, body, classData, context);
  if (!result.valid) {
    return formatValidationError(result);
  }

  // 3. Apply advancement
  const upgraded = await applyLevelUp(character, body);

  return createSuccessResponse(upgraded, 200);
}
```

---

## Test Usage

### Import fixtures

```typescript
import { fixtures } from "../fixtures/srdValidationFixtures";

// Valid characters at each level
const char1 = fixtures.valid.createValidCharacter(1);
const char10 = fixtures.valid.createValidCharacter(10);

// Invalid characters (for testing error paths)
const badChar = fixtures.invalid.createInvalidCharacterStatTooHigh();
```

### Write tests

```typescript
describe("POST /characters", () => {
  it("should accept valid character creation", async () => {
    const input = fixtures.valid.createValidCharacter(1);
    const result = validateCharacterCreation(input, mockClass, context);
    expect(result.valid).toBe(true);
  });

  it("should reject invalid stats", async () => {
    const input = fixtures.invalid.createInvalidCharacterStatTooHigh();
    const result = validateCharacterCreation(input, mockClass, context);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.rule === "STAT_EXCEEDS_CREATION_MAX")).toBe(true);
  });
});
```

---

## SRD References

**Core Rules:**
- Levels: 1–10 (SRD p.1)
- Stats: 0–5 creation, 0–8 with bonuses (SRD p.3)
- Hope: 0–6 (SRD p.20)
- HP: class base + advancements (SRD p.20)
- Stress: 5 + tier (SRD p.20, p.22)
- Domains: 2 class domains, max 5 loadout (SRD p.4–5)
- Proficiency: 1 + tier (SRD p.3)
- Level-up: 2 advancement slots (SRD p.22)
- Domain swap: free at rest, costs Stress mid-play (SRD p.5)

---

## Debugging Tips

### Enable debug logging

```typescript
const DEBUG = process.env.SRD_VALIDATION_DEBUG === "true";

if (DEBUG) {
  console.log("[SRD] Validation context loaded");
  console.log("[SRD] Validating character:", character.name);
}
```

### Inspect validation errors

```typescript
const result = validateCharacterCreation(...);

if (!result.valid) {
  result.errors.forEach(error => {
    console.log(`Field: ${error.field}`);
    console.log(`Rule: ${error.rule}`);
    console.log(`Message: ${error.message}`);
    console.log(`SRD Page: ${error.srdPage}`);
  });
}
```

### Print validation context

```typescript
console.log("Allowed classes:", Array.from(context.allowedClasses.keys()));
console.log("Allowed ancestries:", Array.from(context.allowedAncestryIds));
console.log("Available cards:", context.allDomainCards.length);
```

---

## Performance Notes

- **Validation time:** O(d) where d = number of domain cards
- **Memory:** ~100KB per campaign frame
- **Cache:** Reused across Lambda invocations
- **Typical validation:** <10ms per character

---

**For detailed documentation, see: `SRD_COMPLIANCE_VALIDATION.md`**
