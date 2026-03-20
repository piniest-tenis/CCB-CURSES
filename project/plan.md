# Daggerheart Character Platform — Project Plan

**Version**: 1.0  
**Date**: 2026-03-19  
**Maintained by**: Coordinator Agent

---

## Project Overview

A full-stack web application for creating and managing Daggerheart character sheets, backed by AWS serverless infrastructure and populated from a Homebrew Kit of Markdown source files.

---

## Agent Roster

| Agent | Responsibility | Primary Output Paths |
|---|---|---|
| Coordinator | Orchestration, sequencing, conflict resolution | `/project/` |
| Architect | System design, DynamoDB schema, API contracts | `/project/architecture.md`, `/project/api-contracts.md` |
| Backend | Lambda functions, Cognito integration, CRUD | `/backend/` |
| Frontend | Next.js UI, character sheet builder | `/frontend/` |
| Data Ingestion | Markdown → DynamoDB pipeline | `/ingestion/` |
| SRD Compliance | Rule validation logic | `/compliance/` |

---

## Phase Breakdown

### Phase 0 — Foundation (COMPLETE)
- [x] Survey workspace and markdown source material
- [x] Create project directory structure
- [x] Produce `architecture.md`
- [x] Produce `api-contracts.md`
- [x] Write project plan

### Phase 1 — Infrastructure & Shared Types
- [ ] `infrastructure/` CDK stacks (Auth, API, Data, Storage, Frontend)
- [ ] Shared TypeScript types package (`/shared/types.ts`)
- [ ] Zod validation schemas mirroring API contracts (`/shared/schemas.ts`)
- [ ] Backend Lambda project scaffolding (`/backend/package.json`, tsconfig)
- [ ] Frontend Next.js project scaffolding (`/frontend/package.json`, tsconfig)
- [ ] Ingestion project scaffolding (`/ingestion/package.json`, tsconfig)

### Phase 2 — Data Ingestion Pipeline
- [ ] `ClassParser` — parse class + subclass markdown
- [ ] `CommunityParser` — parse community markdown
- [ ] `AncestryParser` — parse ancestry markdown (empty dir, scaffold for future)
- [ ] `DomainCardParser` — parse domain card markdown (simple, grimoire, cursed variants)
- [ ] `RulesParser` — parse Rules & Definitions flat blobs and nested subdirs
- [ ] `DynamoLoader` — BatchWriteItem with chunking and error handling
- [ ] `IngestionValidator` — field checks, slug normalization, WikiLink resolution
- [ ] CLI entry point: `npm run ingest -- --category=all --dry-run`
- [ ] Unit tests for each parser

### Phase 3 — Backend Lambda Functions
- [ ] `auth-handler` — token refresh, logout
- [ ] `user-handler` — GET/PUT /users/me
- [ ] `characters-handler` — full CRUD + rest endpoint + share token
- [ ] `gamedata-handler` — read-only class, community, ancestry, domain endpoints
- [ ] `media-handler` — S3 pre-sign, confirm, delete
- [ ] Middleware: JWT extraction, userId injection, error envelope
- [ ] SRD validation middleware (calls compliance layer)
- [ ] Integration tests (against local DynamoDB via `dynamodb-local`)

### Phase 4 — SRD Compliance Layer
- [ ] `StatValidator` — bounds checking on all core stats
- [ ] `DerivedStatCalculator` — evasion, armor, HP, stress max formulas
- [ ] `DomainLoadoutValidator` — level requirements, class domain restrictions
- [ ] `AdvancementValidator` — Foundation/Specialization/Mastery unlock tiers
- [ ] `HopeStressValidator` — bounds: 0–6
- [ ] `DamageThresholdCalculator` — per-class damage threshold formulas
- [ ] Export as middleware callable from Lambda and as importable Zod schemas for frontend

### Phase 5 — Frontend
- [ ] Next.js 14 App Router project with Tailwind + Radix UI
- [ ] Cognito auth context + `useAuth` hook
- [ ] Login / Register / Confirm pages
- [ ] Dashboard — character list with create button
- [ ] Character creation wizard (class → community → ancestry → stats)
- [ ] Character sheet page
  - [ ] SheetHeader (name, class, community, ancestry, level, conditions)
  - [ ] StatsPanel (6 core stats + derived evasion/armor)
  - [ ] TrackersPanel (HP, stress, armor, proficiency, weapons, hope, experiences)
  - [ ] FeaturesPanel (class features, subclass features)
  - [ ] DomainLoadout (active cards, drag-reorder)
  - [ ] DomainVault (all unlocked cards, add/remove)
  - [ ] DowntimeModal (short/long rest)
  - [ ] AvatarUpload (pre-signed URL flow)
- [ ] Class browser (public)
- [ ] Domain card browser (public)
- [ ] Read-only share view

### Phase 6 — Integration & Testing
- [ ] End-to-end: create user → create character → save sheet → reload
- [ ] End-to-end: ingest markdown → verify DynamoDB → verify API response
- [ ] SRD compliance edge case tests
- [ ] Performance: character sheet load < 1.5s TTI
- [ ] Security: verify cross-user access is blocked at Lambda layer

### Phase 7 — Deployment
- [ ] CDK bootstrap (dev environment)
- [ ] Deploy dev stack
- [ ] Run ingestion pipeline against dev DynamoDB
- [ ] Smoke test all API endpoints
- [ ] Deploy staging stack
- [ ] Deploy prod stack (manual approval gate)

---

## Source Material Summary

### Markdown Categories Found

| Category | Files | Notes |
|---|---|---|
| `/markdown/Classes/` | 30 class files + `Classes.md` index | Full schema: domains table, hope feature, class feature, subclasses, background questions |
| `/markdown/Communities/` | 17 community files + `Communities.md` index | Schema: flavor text (italic) + trait (bold name + description) |
| `/markdown/Ancestries/` | 0 files | Directory exists, no content yet — scaffold parser |
| `/markdown/Domains/` | 11 domain subdirs (Artistry, Charm, Creature, Faithful, Oddity, Study, Thievery, Trickery, Valiance, Violence, Weird) | Card variants: simple, grimoire (★), cursed (★), linked curse (↔) |
| `/markdown/Rules & Definitions/` | Flat files + `Curses/` + `Reputation/` + `Reputation/Faction/` subdirs | Short definitions, attitude scale, faction/reputation mechanics |

### Key Homebrew Mechanics (beyond base SRD)
- **Reputation system**: Factions, Adherents, Attitude (-6 to +6), Reputation score (-3 to +3), Favors, Figureheads, Primary Goals
- **Linked Curses (↔)**: Domain cards that interact with specific other domain cards by name — validated by cross-reference resolver
- **Grimoire cards**: Cards with multiple named sub-abilities instead of a single rules block
- **Aura rules**: Sustained spells with Maintenance Difficulty for Spellcast Roll on hit

---

## Key Design Decisions

1. **DynamoDB single-table per logical domain** (not one giant table) — Characters, Classes, GameData (Communities+Ancestries+Rules), DomainCards, Media, Users. This keeps access patterns simple while avoiding the complexity of true single-table design across unrelated entities.

2. **No API Gateway REST API** — HTTP API v2 is used for lower cost and latency; the only trade-off is no built-in request/response mapping (handled in Lambda).

3. **Ancestries directory is empty** — The parser is scaffolded to handle the same schema as Communities when content arrives, but no items will be ingested until files are present.

4. **Domain card level gating** — Cards are not "purchased" in a linear sense; the character sheet builder presents cards available up to the character's current level and enforces that loadout cards do not exceed level.

5. **classFeatureState map** — Class features like token pools (e.g., Artistry Inspiration tokens) are stored as a flexible map keyed by feature name to avoid a separate table.

---

## Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Markdown schema inconsistencies (e.g., Scholar.md missing section headers) | Parser uses graceful fallback with warnings; ingestion validator logs but doesn't block |
| WikiLink resolution (e.g., `[[The Land of Tidwell/...]]`) | Resolver normalizes to last path segment; ambiguous links logged as warnings |
| SRD rule gaps (homebrew expands base SRD) | Compliance layer is extensible; homebrew rules are flagged as `source: homebrew` and validated separately |
| Domain card cross-references (↔ linked curses) | CardId cross-reference table built during ingestion; broken links logged |
| Empty Ancestries directory | Parser scaffolded but no-op until files arrive; character sheet allows null ancestryId |
