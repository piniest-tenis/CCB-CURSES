# SRD Validation API Contract

## Overview

This document defines the API contract between the frontend validation layer and backend services for SRD compliance enforcement.

## HTTP Status Codes

When the backend receives invalid character data, it should respond with:

### 400 Bad Request — Validation Failure

The character data violates SRD rules. Response body:

```json
{
  "error": "VALIDATION_ERROR",
  "message": "Character creation failed due to SRD compliance violations",
  "violations": [
    {
      "field": "stats.presence",
      "rule": "STAT_OUT_OF_RANGE",
      "message": "Presence stat (9) exceeds maximum of 8 at creation; ensure this reflects valid level-up bonuses"
    },
    {
      "field": "traits",
      "rule": "TRAIT_SUM_INVALID",
      "message": "Trait modifiers sum to 3; must equal +2"
    }
  ]
}
```

### 409 Conflict — State Violation

Character data is inconsistent with server state. Examples:
- Attempting to multiclass after already using multiclass at a previous level
- Domain cards assigned that don't exist for the character's class
- Attempting advancement to a level that hasn't been reached

```json
{
  "error": "STATE_CONFLICT",
  "message": "Character state violates advancement rules",
  "conflict": {
    "reason": "MULTICLASS_ALREADY_USED",
    "level": 4,
    "details": "Multiclass can only be used once, at level 2. Current level: 4"
  }
}
```

### 422 Unprocessable Entity — Semantic Violation

Character data is structurally valid but semantically incorrect. Examples:
- Armor score calculated incorrectly on client
- Domain loadout references non-existent cards
- Trait assignment missing required fields

```json
{
  "error": "UNPROCESSABLE_ENTITY",
  "message": "Character data cannot be processed",
  "issues": [
    {
      "field": "derivedStats.armor",
      "reason": "CALCULATED_INCORRECTLY",
      "expected": 14,
      "received": 12,
      "formula": "baseArmor (10) + level (4) = 14"
    }
  ]
}
```

## Request/Response Payloads

### Character Creation — POST /characters

**Request:**

```json
{
  "name": "Thoren Blackshield",
  "classId": "warrior",
  "subclassId": "champion",
  "communityId": "orderborne",
  "ancestryId": "dwarf",
  "stats": {
    "agility": 0,
    "strength": 2,
    "finesse": 1,
    "instinct": 0,
    "presence": 1,
    "knowledge": -1
  },
  "traitBonuses": {
    "strength": 2,
    "presence": 1,
    "finesse": 1,
    "knowledge": -1
  }
}
```

**Response (Success):**

```json
{
  "characterId": "char_abc123",
  "name": "Thoren Blackshield",
  "classId": "warrior",
  "level": 1,
  "stats": {
    "agility": 0,
    "strength": 2,
    "finesse": 1,
    "instinct": 0,
    "presence": 1,
    "knowledge": -1
  },
  "derivedStats": {
    "evasion": 11,
    "armor": 12
  },
  "trackers": {
    "hp": { "max": 26, "marked": 0 },
    "stress": { "max": 6, "marked": 0 },
    "armor": { "max": 2, "marked": 0 }
  },
  "damageThresholds": {
    "major": 11,
    "severe": 16
  },
  "hope": 2,
  "hopeMax": 6,
  "proficiency": 1,
  "createdAt": "2025-03-21T18:00:00Z"
}
```

**Response (Validation Error):**

```json
{
  "error": "VALIDATION_ERROR",
  "message": "Character creation failed",
  "violations": [
    {
      "field": "stats",
      "rule": "TRAIT_SUM_INVALID",
      "message": "Trait modifiers sum to 4; must equal +2"
    }
  ]
}
```

### Character Update — PATCH /characters/{characterId}

**Request:**

```json
{
  "stats": {
    "agility": 1,
    "strength": 3,
    "finesse": 1,
    "instinct": 0,
    "presence": 0,
    "knowledge": -1
  },
  "level": 2
}
```

**Response (Success):**

```json
{
  "characterId": "char_abc123",
  "level": 2,
  "stats": { /* ... */ },
  "derivedStats": {
    "evasion": 12,
    "armor": 13
  },
  "updatedAt": "2025-03-21T19:30:00Z"
}
```

### Domain Loadout Update — PATCH /characters/{characterId}/domain-loadout

**Request:**

```json
{
  "loadout": [
    "divinity/card-blessing",
    "divinity/card-smite",
    "divinity/card-healing",
    "divinity/card-wrath"
  ]
}
```

**Validation Rules:**
- Loadout length ≤ 5
- All card IDs exist and belong to character's domains
- All cards have level ≤ character level
- No duplicate card IDs

**Response (Validation Error):**

```json
{
  "error": "VALIDATION_ERROR",
  "message": "Domain loadout update failed",
  "violations": [
    {
      "field": "domainLoadout",
      "rule": "LOADOUT_EXCEEDS_MAX",
      "message": "Loadout has 6 cards; maximum is 5"
    }
  ]
}
```

### Domain Card Acquisition — POST /characters/{characterId}/actions

**Request:**

```json
{
  "action": "acquire-domain-card",
  "cardId": "divinity/card-blessing"
}
```

**Validation Rules:**
- Card exists in database
- Card level ≤ character level
- Card belongs to one of character's class domains
- Character hasn't already acquired card
- Card is not already in loadout or vault

**Response (Success):**

```json
{
  "characterId": "char_abc123",
  "domainVault": [
    "divinity/card-blessing"
  ],
  "message": "Card acquired successfully"
}
```

**Response (Validation Error):**

```json
{
  "error": "VALIDATION_ERROR",
  "message": "Cannot acquire card",
  "violations": [
    {
      "field": "cardId",
      "rule": "CARD_LEVEL_TOO_HIGH",
      "message": "Card level (5) exceeds character level (3)",
      "srdPage": 22
    }
  ]
}
```

## Backend Validation Rules

The backend should validate all character mutations against:

### Character Creation Constraints

```
1. Level = 1 (always start here)
2. Hope = 2 (always start here)
3. Stats: each in [-5, 5] range for creation
4. Trait modifiers: sum to +2, exactly 4 traits assigned
5. Class exists and is in campaign frame
6. Subclass exists for chosen class
7. Ancestry exists and is in campaign frame
8. Community exists and is in campaign frame
```

### Character Update Constraints

```
1. Level: integer in [1, 10]
2. Stats: each in [-5, 8] range (with warnings above 5)
3. Hope: in [0, hopeMax]
4. HP/Stress marked: ≤ max
5. Armor: score ≤ 12
6. Domains: ≤ 2, all in class.domains
7. Domain loadout: ≤ 5 cards, all acquired
8. Damage thresholds: calculated correctly
```

### Domain Card Acquisition Constraints

```
1. Card exists in database
2. Card level ≤ character.level
3. Card domain ∈ character.domains
4. Card not already in loadout or vault
5. Character doesn't exceed vault limit (if enforced)
```

### Advancement Constraints

```
1. Specialization: requires level ≥ 3
2. Mastery: requires level ≥ 6
3. Multiclass: only available at level 2, can only be used once
4. Subclass features unlock based on level
```

## Error Response Schema

All validation errors should follow this schema:

```typescript
interface ValidationError {
  error: "VALIDATION_ERROR";
  message: string;
  violations: Array<{
    field: string;              // dotted path to field (e.g., "stats.strength")
    rule: string;               // machine-readable rule code
    message: string;            // human-readable message
    srdPage?: number;           // SRD page number if applicable
    suggestion?: string;        // fix suggestion
    details?: Record<string, unknown>; // extra data (expected vs. received, etc.)
  }>;
}
```

## Conflict Resolution Strategy

When the frontend sends data that conflicts with server state:

### Multiclass Conflict (409)

```json
{
  "error": "STATE_CONFLICT",
  "message": "Multiclass selection conflicts with character history",
  "conflict": {
    "reason": "MULTICLASS_ALREADY_USED",
    "details": "Multiclass was selected at level 2; cannot be used again at level 5"
  }
}
```

**Frontend Response:**
- Show error banner explaining the restriction
- Provide UI to revert to previous class OR accept the constraint
- Do NOT allow saving with the conflict

### Domain Card Mismatch (422)

```json
{
  "error": "UNPROCESSABLE_ENTITY",
  "message": "Domain loadout references invalid cards",
  "issues": [
    {
      "field": "domainLoadout[2]",
      "cardId": "divinity/card-unknown",
      "reason": "CARD_NOT_FOUND"
    }
  ]
}
```

**Frontend Response:**
- Automatically remove invalid cards from loadout
- Show notification explaining what was removed
- Suggest acquiring valid cards

## Calculated Fields

The frontend may calculate these fields; backend MUST verify them:

### Derived Stats

```
evasion = class.startingEvasion + level + modifiers
armor = equippedArmor.base + level; max 12
maxHP = class.startingHitPoints + (2 × level) + modifiers
maxStress = 6 + (1 × level) + modifiers
proficiency = min(1 + floor((level - 1) / 3), 4)
```

### Damage Thresholds

```
majorThreshold = armorBase.major + level
severeThreshold = armorBase.severe + level
```

## Versioning

If validation rules change:
1. Bump API version (e.g., `/v2/characters`)
2. Keep old endpoint for backward compatibility
3. Document breaking changes
4. Provide migration path for old characters

## Campaign Frame Restrictions

The backend MUST enforce that character options are limited to the campaign frame:

```json
{
  "allowedClasses": ["warrior", "rogue", "wizard"],
  "allowedAncestries": ["human", "elf", "dwarf"],
  "allowedCommunities": ["orderborne", "loreborne"],
  "allowedDomains": ["warfare", "trickery", "knowledge"]
}
```

If a character tries to select an option outside the campaign frame:

```json
{
  "error": "VALIDATION_ERROR",
  "message": "Character option not available in this campaign",
  "violations": [
    {
      "field": "classId",
      "rule": "CLASS_NOT_IN_CAMPAIGN_FRAME",
      "message": "Class 'sorcerer' is not available in this campaign",
      "suggestion": "Choose from: warrior, rogue, wizard",
      "srdPage": 4
    }
  ]
}
```

## Testing Checklist

Backend developers should test:

- [ ] Creating character with invalid trait sum (400)
- [ ] Creating character with stats > 5 (400 or 422 warning)
- [ ] Updating to armor score > 12 (400)
- [ ] Updating to level > 10 (400)
- [ ] Adding 6th domain card to loadout (400)
- [ ] Acquiring card above character level (400)
- [ ] Attempting multiclass twice (409)
- [ ] All violations include SRD page numbers
- [ ] All error messages are actionable
- [ ] Calculated fields match expected values
