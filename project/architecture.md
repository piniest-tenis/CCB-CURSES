# Daggerheart Character Platform — System Architecture

**Version**: 1.0  
**Date**: 2026-03-19  
**Author**: Architect Agent

---

## 1. Executive Summary

The Daggerheart Character Platform is a full-stack web application that lets players create, manage, and share character sheets for the Daggerheart tabletop RPG system. It ingests a Homebrew Kit of Markdown files (Classes, Communities, Domains, Rules & Definitions) into structured DynamoDB tables, enforces SRD rules at both the API and UI layers, and provides secure multi-user character management backed by AWS Cognito.

---

## 2. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                          CLIENT LAYER                                │
│  Next.js 14 (App Router) + React 18 + TypeScript                    │
│  Tailwind CSS + Radix UI  •  Zustand (state)  •  React Query        │
└────────────────────────────┬────────────────────────────────────────┘
                             │ HTTPS / WebSocket
┌────────────────────────────▼────────────────────────────────────────┐
│                        API LAYER                                     │
│  Amazon API Gateway (HTTP API v2) — JWT Authorizer                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐           │
│  │Characters│  │Game Data │  │ Media    │  │  Auth    │           │
│  │  Lambda  │  │  Lambda  │  │  Lambda  │  │ (Cognito)│           │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └──────────┘           │
└───────┼─────────────┼─────────────┼──────────────────────────────┘
        │             │             │
┌───────▼─────────────▼─────────────▼──────────────────────────────┐
│                       DATA LAYER                                   │
│  Amazon DynamoDB (on-demand)     Amazon S3 (media bucket)         │
│  Amazon Cognito User Pool        Amazon CloudWatch Logs           │
│  AWS Systems Manager (SSM)       AWS IAM Roles                   │
└───────────────────────────────────────────────────────────────────┘
```

---

## 3. AWS Service Selection & Justification

| Service | Role | Justification |
|---|---|---|
| **Amazon Cognito** | Authentication & user management | Managed, secure, supports JWT/OAuth2, MFA, social sign-in with no server code |
| **Amazon API Gateway (HTTP API v2)** | API routing & JWT authorization | Lower latency and cost than REST API; native JWT authorizer replaces custom Lambda auth |
| **AWS Lambda (Node.js 20.x)** | Business logic | Serverless scales to zero; each function group is independently deployable |
| **Amazon DynamoDB (on-demand)** | Primary data store | Schema-flexible, single-digit-ms reads, ideal for sparse character sheet data |
| **Amazon S3** | Image/media storage | Durable object store; pre-signed URLs keep credentials server-side |
| **AWS CloudFormation / CDK** | Infrastructure-as-Code | Reproducible deployments; CDK provides type-safe construct definitions |
| **Amazon CloudWatch** | Logging & metrics | Native Lambda integration, no agents required |
| **AWS Systems Manager Parameter Store** | Secrets & config | Secure, versioned, free tier adequate for this workload |

---

## 4. Authentication Architecture

### 4.1 Cognito User Pool Configuration

```
UserPool:
  PasswordPolicy:
    MinLength: 12
    RequireUppercase: true
    RequireNumbers: true
    RequireSymbols: true
  MFA: OPTIONAL (TOTP)
  AccountRecovery: EMAIL_ONLY
  StandardAttributes: [email, name]
  CustomAttributes:
    - custom:displayName (string)
    - custom:avatarKey    (string, S3 key)

UserPoolClient:
  AuthFlows: [USER_SRP_AUTH, REFRESH_TOKEN_AUTH]
  TokenValidity:
    AccessToken:  1 hour
    IdToken:      1 hour
    RefreshToken: 30 days
  PreventUserExistenceErrors: true
```

### 4.2 JWT Flow

```
Browser          Cognito         API Gateway        Lambda
   │──── SRP Auth ──▶│                │                │
   │◀── tokens ──────│                │                │
   │─── Bearer JWT ──────────────────▶│                │
   │                  │  JWT verify   │                │
   │                  │◀─────────────▶│                │
   │                  │               │──── invoke ───▶│
   │                  │               │◀─── response ──│
   │◀─────────────────────────────────│                │
```

### 4.3 Authorization Rules

- All `/api/characters/*` routes require a valid Cognito JWT.
- The JWT `sub` claim is the canonical `userId`.
- Characters are **owned** by a userId; cross-user access is forbidden at the Lambda level (not just Gateway).
- Game data endpoints (`/api/classes`, `/api/domains`, etc.) are **public** (read-only, no auth required).
- Media upload endpoints require auth; the S3 key is namespaced `media/{userId}/{uuid}.{ext}`.

---

## 5. DynamoDB Schema

### Design Principles
- Single-table design per logical domain (not one giant table) to keep access patterns simple and avoid excessive fan-out.
- All tables use **on-demand billing** (no capacity planning required at this stage).
- GSIs enable secondary access patterns without duplicating data excessively.

---

### 5.1 Table: `Characters`

Stores all character sheet data. Supports multiple sheets per user.

| Attribute | Type | Description |
|---|---|---|
| `PK` | `STRING` | `USER#{userId}` |
| `SK` | `STRING` | `CHARACTER#{characterId}` |
| `characterId` | `STRING` | UUID |
| `userId` | `STRING` | Cognito sub |
| `name` | `STRING` | Character name |
| `classId` | `STRING` | FK → Classes table |
| `subclassId` | `STRING` | FK → Classes table |
| `communityId` | `STRING` | FK → Communities table |
| `ancestryId` | `STRING` | FK → Ancestries table |
| `level` | `NUMBER` | 1–10 |
| `domains` | `LIST<STRING>` | Up to 2 domain names |
| `stats` | `MAP` | agility, strength, finesse, instinct, presence, knowledge |
| `derivedStats` | `MAP` | evasion, armor (calculated) |
| `trackers` | `MAP` | hp, stress, armor, proficiency slots |
| `damageThresholds` | `MAP` | minor, major, severe |
| `weapons` | `MAP` | primary, secondary |
| `hope` | `NUMBER` | 0–6 |
| `experiences` | `LIST<MAP>` | [{name, bonus}] |
| `conditions` | `LIST<STRING>` | Active condition names |
| `domainLoadout` | `LIST<STRING>` | Active domain card IDs (max 5) |
| `domainVault` | `LIST<STRING>` | All unlocked domain card IDs |
| `classFeatureState` | `MAP` | Per-feature token/toggle state |
| `notes` | `STRING` | Free-form notes |
| `avatarKey` | `STRING` | S3 object key |
| `createdAt` | `STRING` | ISO 8601 |
| `updatedAt` | `STRING` | ISO 8601 |

**GSI 1 — `characterId-index`**  
`PK: characterId` — enables direct lookup by ID (e.g., for shared sheet links)

---

### 5.2 Table: `Classes`

Populated by the ingestion pipeline from `/markdown/Classes/`.

| Attribute | Type | Description |
|---|---|---|
| `PK` | `STRING` | `CLASS#{classId}` |
| `SK` | `STRING` | `METADATA` |
| `classId` | `STRING` | Slug (e.g., `devout`) |
| `name` | `STRING` | Display name |
| `domains` | `LIST<STRING>` | 2 domain names |
| `startingEvasion` | `NUMBER` | |
| `startingHitPoints` | `NUMBER` | |
| `classItems` | `LIST<STRING>` | 2 item options |
| `hopeFeature` | `MAP` | {name, description, hopeCost} |
| `classFeature` | `MAP` | {name, description, options: []} |
| `backgroundQuestions` | `LIST<STRING>` | |
| `connectionQuestions` | `LIST<STRING>` | |
| `subclasses` | `LIST<MAP>` | See SubclassFeatures |
| `mechanicalNotes` | `STRING` | |
| `source` | `STRING` | `homebrew` \| `srd` |

**SK pattern for subclasses**: `SUBCLASS#{subclassId}`  
Each subclass is a separate item under the same PK.

| Attribute | Type | Description |
|---|---|---|
| `PK` | `STRING` | `CLASS#{classId}` |
| `SK` | `STRING` | `SUBCLASS#{subclassId}` |
| `subclassId` | `STRING` | Slug |
| `name` | `STRING` | |
| `description` | `STRING` | Playstyle pitch |
| `spellcastTrait` | `STRING` | Trait name |
| `foundationFeatures` | `LIST<MAP>` | [{name, description}] |
| `specializationFeature` | `MAP` | {name, description} |
| `masteryFeature` | `MAP` | {name, description} |

---

### 5.3 Table: `GameData`

Stores Communities, Ancestries, Domains index, and Rules & Definitions. Uses a type-discriminated SK.

| Attribute | Type | Description |
|---|---|---|
| `PK` | `STRING` | `COMMUNITY#{id}` \| `ANCESTRY#{id}` \| `RULE#{id}` |
| `SK` | `STRING` | `METADATA` |
| `id` | `STRING` | Slug |
| `type` | `STRING` | `community` \| `ancestry` \| `rule` |
| `name` | `STRING` | |
| `flavorText` | `STRING` | Italic intro |
| `traitName` | `STRING` | Bold trait name (communities) |
| `traitDescription` | `STRING` | Mechanical effect |
| `body` | `STRING` | Full markdown body (rules blobs) |
| `source` | `STRING` | `homebrew` \| `srd` |

**GSI 1 — `type-index`**  
`PK: type` → list all items of a given type (communities, ancestries, etc.)

---

### 5.4 Table: `DomainCards`

One item per domain card. Populated from `/markdown/Domains/*/`.

| Attribute | Type | Description |
|---|---|---|
| `PK` | `STRING` | `DOMAIN#{domainName}` |
| `SK` | `STRING` | `CARD#{cardId}` |
| `cardId` | `STRING` | Slug (e.g., `bewitch`) |
| `domain` | `STRING` | Domain name |
| `level` | `NUMBER` | 1–5 |
| `name` | `STRING` | Display name |
| `isCursed` | `BOOL` | Has `★` in filename |
| `isLinkedCurse` | `BOOL` | Has `↔` in filename |
| `isGrimoire` | `BOOL` | Starts with `**Grimoire**` |
| `description` | `STRING` | Main rules text |
| `curseText` | `STRING` | Text after `***` |
| `linkedCardIds` | `LIST<STRING>` | Cross-references |
| `grimoire` | `LIST<MAP>` | [{name, description}] (if Grimoire) |
| `source` | `STRING` | `homebrew` \| `srd` |

**GSI 1 — `level-index`**  
`PK: domain`, `SK: level` → list all cards in a domain by level

---

### 5.5 Table: `Media`

| Attribute | Type | Description |
|---|---|---|
| `PK` | `STRING` | `USER#{userId}` |
| `SK` | `STRING` | `MEDIA#{mediaId}` |
| `mediaId` | `STRING` | UUID |
| `s3Key` | `STRING` | Full S3 object key |
| `contentType` | `STRING` | MIME type |
| `filename` | `STRING` | Original filename |
| `linkedTo` | `MAP` | {type: 'character', id: characterId} |
| `createdAt` | `STRING` | ISO 8601 |

---

### 5.6 Table: `Users`

Thin profile layer on top of Cognito. Cognito holds credentials; this table holds app-level preferences.

| Attribute | Type | Description |
|---|---|---|
| `PK` | `STRING` | `USER#{userId}` |
| `SK` | `STRING` | `PROFILE` |
| `userId` | `STRING` | Cognito sub |
| `email` | `STRING` | |
| `displayName` | `STRING` | |
| `avatarKey` | `STRING` | S3 key |
| `preferences` | `MAP` | UI preferences |
| `createdAt` | `STRING` | ISO 8601 |
| `updatedAt` | `STRING` | ISO 8601 |

---

## 6. API Layer

See `api-contracts.md` for full endpoint specifications.

### Lambda Function Groups

| Function | Routes | Description |
|---|---|---|
| `auth-handler` | `/auth/*` | Cognito token exchange, refresh |
| `characters-handler` | `/characters/*` | Full CRUD + validation |
| `gamedata-handler` | `/classes/*`, `/communities/*`, `/domains/*`, `/ancestries/*` | Read-only game data |
| `media-handler` | `/media/*` | S3 pre-signed URL generation |
| `user-handler` | `/users/*` | Profile management |

### Lambda Configuration

```yaml
Runtime: nodejs20.x
Architecture: arm64  # Graviton — ~20% cheaper
MemorySize: 512
Timeout: 10s (standard)  /  30s (ingestion)
Environment:
  DYNAMODB_REGION: us-east-1
  COGNITO_USER_POOL_ID: !Ref UserPool
  S3_MEDIA_BUCKET: !Ref MediaBucket
  STAGE: !Ref Stage
```

---

## 7. Frontend Architecture

### Technology Stack

| Layer | Choice | Reason |
|---|---|---|
| Framework | Next.js 14 (App Router) | SSR for SEO on public pages; RSC for game data; CSR for character builder |
| Language | TypeScript 5.x | Type safety across the full stack |
| Styling | Tailwind CSS + Radix UI | Accessible primitives + utility-first rapid development |
| State | Zustand | Lightweight, no boilerplate; character sheet is local-first with sync |
| Server State | TanStack Query v5 | Caching, background sync, optimistic updates |
| Auth | `amazon-cognito-identity-js` | Official Cognito SDK |
| Forms | React Hook Form + Zod | Schema-driven validation mirroring backend rules |

### Key Page Routes

```
/                          → Landing / marketing
/auth/login                → Sign-in
/auth/register             → Sign-up
/auth/confirm              → Email confirmation
/dashboard                 → User's character list
/character/new             → Character creation wizard
/character/[id]            → Character sheet (edit mode)
/character/[id]/view       → Read-only / share view
/classes                   → Class browser (public)
/classes/[classId]         → Class detail
/domains                   → Domain card browser (public)
/domains/[domain]          → Domain detail + card list
```

### Character Sheet Component Tree

```
CharacterSheetPage
├── SheetHeader
│   ├── CharacterNameInput
│   ├── ClassSelector (→ API: /classes)
│   ├── SubclassSelector
│   ├── CommunitySelector (→ API: /communities)
│   ├── AncestrySelector
│   ├── LevelBadge
│   └── ConditionTracker
├── StatsPanel
│   ├── CoreStatInput × 6 (Agility, Strength, Finesse, Instinct, Presence, Knowledge)
│   ├── DerivedStatDisplay (Evasion — calculated)
│   └── DerivedStatDisplay (Armor — calculated)
├── TrackersPanel
│   ├── DamageThresholds (Minor / Major / Severe)
│   ├── SlotTracker (HP, Stress, Armor, Proficiency)
│   ├── WeaponCard × 2 (Primary / Secondary)
│   ├── HopeTracker
│   └── ExperienceList
├── FeaturesPanel
│   ├── ClassFeatureCard
│   ├── SubclassFeatureCards (Foundation / Specialization / Mastery)
│   ├── DomainLoadout (active, drag-reorderable, max 5)
│   └── DomainVault (all unlocked cards)
├── DowntimeModal (short/long rest actions)
└── AvatarUpload (→ API: /media/presign)
```

---

## 8. Ingestion Pipeline

### Source → Target Mapping

| Source Directory | Target DynamoDB Table | Parser |
|---|---|---|
| `/markdown/Classes/*.md` | `Classes` (PK: `CLASS#`, SK: `METADATA` or `SUBCLASS#`) | `ClassParser` |
| `/markdown/Communities/*.md` | `GameData` (PK: `COMMUNITY#`) | `CommunityParser` |
| `/markdown/Ancestries/*.md` | `GameData` (PK: `ANCESTRY#`) | `AncestryParser` |
| `/markdown/Domains/*/*.md` | `DomainCards` | `DomainCardParser` |
| `/markdown/Rules & Definitions/**/*.md` | `GameData` (PK: `RULE#`) | `RulesParser` |

### Pipeline Steps

```
1. FileDiscovery    → glob markdown files by category
2. Parse            → extract structured JSON from markdown AST
3. Validate         → check required fields, SRD compliance
4. Transform        → normalize slugs, resolve [[WikiLinks]]
5. Diff             → compare against existing DynamoDB items
6. Upsert           → BatchWriteItem (25-item chunks)
7. Report           → log counts, errors, warnings
```

---

## 9. SRD Compliance Layer

The compliance layer runs as:
1. **Lambda middleware** — validates character sheet writes before they persist.
2. **Frontend Zod schemas** — mirrors backend validation for immediate UI feedback.
3. **Ingestion validator** — checks game data items during ingestion.

### Key Validation Rules

| Rule Category | Checks |
|---|---|
| Stat bounds | All core stats: 0–5 at creation; level-up bonuses apply |
| Evasion formula | `evasion = startingEvasion + modifiers` |
| HP formula | `maxHP = startingHP + (level * hpPerLevel)` with class-specific base |
| Hope bounds | 0 ≤ hope ≤ 6 |
| Stress bounds | 0 ≤ stress ≤ maxStress |
| Domain loadout | Max 5 cards in loadout; card level ≤ character level |
| Class domains | Character's domain cards must belong to their class's 2 domains |
| Subclass access | Specialization unlocked at Tier 2; Mastery at Tier 3 |
| Advancement | Level 1→2: Foundation; 3→4: Specialization; 5+: Mastery |

---

## 10. Deployment Strategy

### Environments

| Environment | Purpose | Trigger |
|---|---|---|
| `dev` | Developer testing | Manual / PR branch |
| `staging` | Pre-production QA | Merge to `develop` |
| `prod` | Live | Merge to `main` + manual approval |

### IaC Structure (AWS CDK, TypeScript)

```
infrastructure/
├── bin/
│   └── app.ts                 # CDK App entry
├── lib/
│   ├── auth-stack.ts          # Cognito UserPool + Client
│   ├── api-stack.ts           # API Gateway + Lambda functions
│   ├── data-stack.ts          # DynamoDB tables + GSIs
│   ├── storage-stack.ts       # S3 buckets + policies
│   └── frontend-stack.ts      # S3 + CloudFront (static hosting)
├── scripts/
│   └── deploy.sh
└── cdk.json
```

### CI/CD (GitHub Actions)

```
on: push to main/develop/feature/*

jobs:
  test:      lint, type-check, unit tests
  build:     tsc compile backend + frontend
  deploy:    cdk deploy --require-approval never (dev/staging)
             cdk deploy --require-approval broadening (prod)
  ingest:    run ingestion pipeline post-deploy (non-prod: --dry-run)
```

---

## 11. Security Considerations

1. **No credentials in code** — all secrets in SSM Parameter Store; injected as Lambda env vars at deploy time.
2. **S3 pre-signed URLs** — clients never receive S3 credentials; URLs expire in 300 seconds.
3. **DynamoDB access** — Lambda IAM roles scoped to minimum required actions per table.
4. **CORS** — API Gateway CORS policy restricts origins to known frontend domains.
5. **Input validation** — all API inputs validated with Zod at Lambda entry point before any DB operation.
6. **userId enforcement** — all character operations verify JWT `sub` === stored `userId` in Lambda, not just at Gateway.
7. **Rate limiting** — API Gateway usage plans: 100 req/s burst, 50 req/s steady per user.

---

## 12. Non-Functional Requirements

| Requirement | Target |
|---|---|
| API latency (p95) | < 200 ms (DynamoDB reads), < 400 ms (writes) |
| Availability | 99.9% (achieved via serverless + managed services) |
| Character sheet load | < 1.5 s TTI on 4G |
| Image upload size | Max 5 MB per file |
| Concurrent users | 500 (auto-scales, no capacity planning) |
| Data retention | Indefinite for character sheets; 90 days CloudWatch logs |
