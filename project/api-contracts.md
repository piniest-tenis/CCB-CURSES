# Daggerheart Character Platform — API Contracts

**Version**: 1.0  
**Date**: 2026-03-19  
**Author**: Architect Agent

---

## Overview

All API endpoints are served via Amazon API Gateway (HTTP API v2) at:
```
https://api.daggerheart.example.com/{stage}
```

### Authentication

| Header | Value |
|---|---|
| `Authorization` | `Bearer {cognitoIdToken}` |

Protected endpoints return `401 Unauthorized` if the token is missing or invalid.  
Protected endpoints return `403 Forbidden` if the authenticated user lacks permission for the resource.

### Common Response Envelope

**Success**
```json
{
  "data": { ... },
  "meta": {
    "requestId": "uuid",
    "timestamp": "ISO-8601"
  }
}
```

**Error**
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human-readable message",
    "details": [ { "field": "stats.agility", "issue": "Must be between 0 and 5" } ]
  },
  "meta": {
    "requestId": "uuid",
    "timestamp": "ISO-8601"
  }
}
```

### Error Codes

| HTTP Status | Code | Meaning |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Input failed schema validation |
| 401 | `UNAUTHORIZED` | Missing or invalid JWT |
| 403 | `FORBIDDEN` | JWT valid but resource not owned by caller |
| 404 | `NOT_FOUND` | Resource does not exist |
| 409 | `CONFLICT` | Duplicate resource |
| 422 | `SRD_VIOLATION` | Character data violates SRD rules |
| 429 | `RATE_LIMITED` | Too many requests |
| 500 | `INTERNAL_ERROR` | Unexpected server error |

---

## Auth Endpoints

These are thin pass-through helpers. The actual auth flows happen in the Cognito Hosted UI or directly via `amazon-cognito-identity-js` in the frontend. These endpoints handle server-side operations.

---

### `POST /auth/refresh`
Refresh access tokens using a refresh token.

**Auth**: None (refresh token in body)

**Request**
```json
{
  "refreshToken": "string"
}
```

**Response 200**
```json
{
  "data": {
    "accessToken": "string",
    "idToken": "string",
    "expiresIn": 3600
  }
}
```

---

### `POST /auth/logout`
Invalidate the current session.

**Auth**: Required

**Request**: Empty body

**Response 204**: No content

---

## User Endpoints

---

### `GET /users/me`
Get the current user's profile.

**Auth**: Required

**Response 200**
```json
{
  "data": {
    "userId": "uuid",
    "email": "user@example.com",
    "displayName": "string",
    "avatarUrl": "https://cdn.../avatar.jpg",
    "preferences": {
      "theme": "dark",
      "defaultDiceStyle": "standard"
    },
    "createdAt": "ISO-8601"
  }
}
```

---

### `PUT /users/me`
Update the current user's profile.

**Auth**: Required

**Request**
```json
{
  "displayName": "string (optional, 1-50 chars)",
  "preferences": {
    "theme": "dark | light | system (optional)",
    "defaultDiceStyle": "string (optional)"
  }
}
```

**Response 200**: Updated profile (same shape as GET)

---

## Character Endpoints

---

### `GET /characters`
List all character sheets for the authenticated user.

**Auth**: Required

**Query Parameters**
| Param | Type | Default | Description |
|---|---|---|---|
| `limit` | number | 20 | Max results (1–100) |
| `cursor` | string | — | Pagination cursor from previous response |

**Response 200**
```json
{
  "data": {
    "characters": [
      {
        "characterId": "uuid",
        "name": "string",
        "classId": "string",
        "className": "string",
        "subclassId": "string",
        "subclassName": "string",
        "level": 1,
        "avatarUrl": "string | null",
        "updatedAt": "ISO-8601"
      }
    ],
    "cursor": "string | null"
  }
}
```

---

### `POST /characters`
Create a new character sheet.

**Auth**: Required

**Request**
```json
{
  "name": "string (1-60 chars, required)",
  "classId": "string (required)",
  "subclassId": "string (optional — set later)",
  "communityId": "string (optional)",
  "ancestryId": "string (optional)",
  "level": 1
}
```

**Response 201**
```json
{
  "data": {
    "characterId": "uuid",
    "name": "string",
    "classId": "string",
    "level": 1,
    "stats": {
      "agility": 0, "strength": 0, "finesse": 0,
      "instinct": 0, "presence": 0, "knowledge": 0
    },
    "derivedStats": {
      "evasion": 10,
      "armor": 0
    },
    "trackers": {
      "hp": { "max": 6, "marked": 0 },
      "stress": { "max": 6, "marked": 0 },
      "armor": { "max": 3, "marked": 0 },
      "proficiency": { "max": 2, "marked": 0 }
    },
    "damageThresholds": {
      "minor": 0,
      "major": 0,
      "severe": 0
    },
    "hope": 2,
    "createdAt": "ISO-8601",
    "updatedAt": "ISO-8601"
  }
}
```

**Error 422**: SRD_VIOLATION if classId not found or constraints violated.

---

### `GET /characters/{characterId}`
Get a full character sheet.

**Auth**: Required (must own character)

**Response 200** — Full character object (see schema below)

#### Full Character Object Schema
```json
{
  "characterId": "uuid",
  "userId": "uuid",
  "name": "string",
  "classId": "string",
  "className": "string",
  "subclassId": "string | null",
  "subclassName": "string | null",
  "communityId": "string | null",
  "communityName": "string | null",
  "ancestryId": "string | null",
  "ancestryName": "string | null",
  "level": 1,
  "domains": ["string", "string"],
  "stats": {
    "agility": 0,
    "strength": 0,
    "finesse": 0,
    "instinct": 0,
    "presence": 0,
    "knowledge": 0
  },
  "derivedStats": {
    "evasion": 10,
    "armor": 0
  },
  "trackers": {
    "hp": { "max": 6, "marked": 0 },
    "stress": { "max": 6, "marked": 0 },
    "armor": { "max": 3, "marked": 0 },
    "proficiency": { "max": 2, "marked": 0 }
  },
  "damageThresholds": {
    "minor": 0,
    "major": 0,
    "severe": 0
  },
  "weapons": {
    "primary": {
      "name": "string | null",
      "trait": "string | null",
      "damage": "string | null",
      "range": "string | null",
      "type": "physical | magic | null",
      "burden": "one-handed | two-handed | null"
    },
    "secondary": { "same shape as primary" }
  },
  "hope": 2,
  "experiences": [
    { "name": "string", "bonus": 2 }
  ],
  "conditions": ["string"],
  "domainLoadout": ["cardId1", "cardId2"],
  "domainVault": ["cardId1", "cardId2", "cardId3"],
  "classFeatureState": {
    "featureKey": { "tokens": 0, "active": false }
  },
  "notes": "string | null",
  "avatarUrl": "string | null",
  "createdAt": "ISO-8601",
  "updatedAt": "ISO-8601"
}
```

---

### `PUT /characters/{characterId}`
Full replace of a character sheet (used for bulk saves).

**Auth**: Required (must own character)

**Request**: Same shape as full character object (characterId, userId, createdAt ignored if sent)

**Response 200**: Updated full character object

**Error 422**: SRD_VIOLATION with validation details

---

### `PATCH /characters/{characterId}`
Partial update of a character sheet (used for real-time field changes).

**Auth**: Required (must own character)

**Request**: Any subset of mutable character fields

```json
{
  "name": "string (optional)",
  "stats": { "agility": 2 },
  "trackers": { "hp": { "marked": 2 } },
  "hope": 3,
  "conditions": ["Stunned"],
  "domainLoadout": ["cardId1"],
  "notes": "string"
}
```

**Response 200**: Updated full character object

**Error 422**: SRD_VIOLATION

---

### `DELETE /characters/{characterId}`
Delete a character sheet.

**Auth**: Required (must own character)

**Response 204**: No content

---

### `POST /characters/{characterId}/rest`
Trigger a short or long rest, returning available downtime actions and clearing appropriate slots.

**Auth**: Required (must own character)

**Request**
```json
{
  "restType": "short | long"
}
```

**Response 200**
```json
{
  "data": {
    "restType": "short",
    "actionsAvailable": [
      {
        "id": "string",
        "name": "string",
        "description": "string",
        "available": true
      }
    ],
    "cleared": {
      "hp": 0,
      "stress": 2,
      "armor": 3
    },
    "character": { "...updated character object..." }
  }
}
```

---

### `GET /characters/{characterId}/share`
Get a read-only share token for the character sheet.

**Auth**: Required (must own character)

**Response 200**
```json
{
  "data": {
    "shareToken": "jwt-signed-token",
    "shareUrl": "https://app.example.com/character/{characterId}/view?token=...",
    "expiresAt": "ISO-8601 (7 days)"
  }
}
```

---

## Class Endpoints (Public)

---

### `GET /classes`
List all classes.

**Auth**: None

**Query Parameters**
| Param | Type | Default | Description |
|---|---|---|---|
| `domain` | string | — | Filter by domain name |
| `source` | string | — | `srd` or `homebrew` |

**Response 200**
```json
{
  "data": {
    "classes": [
      {
        "classId": "string",
        "name": "string",
        "domains": ["string", "string"],
        "startingEvasion": 10,
        "startingHitPoints": 6,
        "subclasses": [
          { "subclassId": "string", "name": "string", "description": "string" }
        ],
        "source": "homebrew"
      }
    ]
  }
}
```

---

### `GET /classes/{classId}`
Get full class data including all subclasses.

**Auth**: None

**Response 200**
```json
{
  "data": {
    "classId": "string",
    "name": "string",
    "domains": ["Artistry", "Faithful"],
    "startingEvasion": 10,
    "startingHitPoints": 6,
    "classItems": ["string", "string"],
    "hopeFeature": {
      "name": "string",
      "description": "string",
      "hopeCost": 3
    },
    "classFeature": {
      "name": "string",
      "description": "string",
      "options": ["string"]
    },
    "backgroundQuestions": ["string"],
    "connectionQuestions": ["string"],
    "subclasses": [
      {
        "subclassId": "string",
        "name": "string",
        "description": "string",
        "spellcastTrait": "string",
        "foundationFeatures": [
          { "name": "string", "description": "string" }
        ],
        "specializationFeature": { "name": "string", "description": "string" },
        "masteryFeature": { "name": "string", "description": "string" }
      }
    ],
    "mechanicalNotes": "string",
    "source": "homebrew"
  }
}
```

---

## Community Endpoints (Public)

---

### `GET /communities`
List all communities.

**Auth**: None

**Response 200**
```json
{
  "data": {
    "communities": [
      {
        "communityId": "string",
        "name": "string",
        "flavorText": "string",
        "traitName": "string",
        "traitDescription": "string",
        "source": "homebrew"
      }
    ]
  }
}
```

---

### `GET /communities/{communityId}`
Get a single community.

**Auth**: None

**Response 200**: Single community object

---

## Ancestry Endpoints (Public)

---

### `GET /ancestries`
List all ancestries.

**Auth**: None

**Response 200**: `{ "data": { "ancestries": [...] } }` (same shape as communities)

---

### `GET /ancestries/{ancestryId}`
Get a single ancestry.

**Auth**: None

---

## Domain Endpoints (Public)

---

### `GET /domains`
List all domains with card counts per level.

**Auth**: None

**Response 200**
```json
{
  "data": {
    "domains": [
      {
        "domain": "Artistry",
        "cardCount": 13,
        "cardsByLevel": { "1": 3, "2": 2, "3": 3, "4": 3, "5": 2 }
      }
    ]
  }
}
```

---

### `GET /domains/{domain}`
Get all cards for a domain, optionally filtered by level.

**Auth**: None

**Query Parameters**
| Param | Type | Default | Description |
|---|---|---|---|
| `level` | number | — | Filter to a specific level |

**Response 200**
```json
{
  "data": {
    "domain": "Artistry",
    "cards": [
      {
        "cardId": "string",
        "domain": "string",
        "level": 1,
        "name": "string",
        "isCursed": false,
        "isLinkedCurse": false,
        "isGrimoire": false,
        "description": "string",
        "curseText": "string | null",
        "linkedCardIds": [],
        "grimoire": []
      }
    ]
  }
}
```

---

### `GET /domains/{domain}/cards/{cardId}`
Get a single domain card.

**Auth**: None

---

## Media Endpoints

---

### `POST /media/presign`
Get a pre-signed S3 URL for uploading a file.

**Auth**: Required

**Request**
```json
{
  "filename": "string",
  "contentType": "image/jpeg | image/png | image/webp",
  "linkedTo": {
    "type": "character | user",
    "id": "uuid"
  }
}
```

**Validation**:
- `contentType` must be one of the allowed image types.
- File size communicated via `Content-Length` header on the subsequent S3 PUT; max 5 MB enforced by S3 bucket policy.

**Response 200**
```json
{
  "data": {
    "mediaId": "uuid",
    "uploadUrl": "https://s3.amazonaws.com/...?X-Amz-...",
    "s3Key": "media/{userId}/{uuid}.jpg",
    "expiresIn": 300
  }
}
```

---

### `POST /media/{mediaId}/confirm`
Confirm that an upload completed successfully (triggers metadata write to DynamoDB).

**Auth**: Required

**Response 200**
```json
{
  "data": {
    "mediaId": "uuid",
    "cdnUrl": "https://cdn.example.com/media/{userId}/{uuid}.jpg"
  }
}
```

---

### `DELETE /media/{mediaId}`
Delete a media asset (S3 object + DynamoDB record).

**Auth**: Required (must own asset)

**Response 204**: No content

---

## Rules & Definitions Endpoints (Public)

---

### `GET /rules`
List all rule definition entries.

**Auth**: None

**Response 200**
```json
{
  "data": {
    "rules": [
      {
        "ruleId": "string",
        "name": "string",
        "body": "string",
        "type": "rule | faction | reputation | curse"
      }
    ]
  }
}
```

---

### `GET /rules/{ruleId}`
Get a single rule definition.

**Auth**: None

---

## Websocket (Future Scope)

A WebSocket connection endpoint (`wss://api.../ws`) is reserved for real-time multi-user session support (e.g., GM view of party sheets). Not implemented in v1.

---

## Pagination

All list endpoints support cursor-based pagination:

```
GET /characters?limit=20&cursor=eyJQSyI6...
```

The `cursor` value is a base64-encoded DynamoDB `LastEvaluatedKey`. If `cursor` is `null` in a response, there are no more pages.

---

## Versioning

The API is currently at v1 (implicit). If breaking changes are required, a new `/v2/` prefix will be introduced. Existing `/` routes will remain supported for 12 months after a new version ships.
