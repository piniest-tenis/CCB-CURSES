# CCB-Curses — Daggerheart Character Platform

A full-stack web application for creating, managing, and sharing character sheets for the [Daggerheart](https://darringtonpress.com/daggerheart/) tabletop RPG. Game content is authored in Markdown, ingested into DynamoDB, and served through a serverless AWS backend to a Next.js frontend.

**Production:** https://curses-ccb.maninjumpsuit.com

---

## Repository structure

```
CCB-Curses/
├── backend/          Lambda handler source (TypeScript, esbuild-bundled)
├── cms/              CMS tooling / admin interface
├── compliance/       GDPR/CCPA compliance utilities
├── frontend/         Next.js 14 App Router SPA (TypeScript, Tailwind CSS)
├── infrastructure/   AWS CDK stacks (TypeScript)
├── ingestion/        CLI pipeline: Markdown → DynamoDB (TypeScript)
├── markdown/         Authoritative game content source files (Markdown)
│   ├── Ancestries/
│   ├── Classes/
│   ├── Communities/
│   ├── Domains/      (subdirectory per domain, e.g. Artistry/, Charm/, …)
│   └── Rules & Definitions/
├── scripts/          Miscellaneous operational scripts
├── shared/           Shared TypeScript types used by backend and ingestion
├── srd-compliance/   SRD language audit reports
└── usability/        Accessibility / UX audit reports
```

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14, React 18, TypeScript, Tailwind CSS, Zustand, TanStack Query, Radix UI |
| Backend | AWS Lambda (Node.js 20, ARM64/Graviton), TypeScript, esbuild, Zod |
| API | AWS API Gateway HTTP API v2 (JWT authorizer) |
| Auth | Amazon Cognito (email + Google SSO via OIDC), TOTP MFA optional |
| Database | Amazon DynamoDB (on-demand, 7 tables) |
| Storage | Amazon S3 + CloudFront (media CDN, portrait images, CMS assets) |
| Frontend hosting | S3 static export + CloudFront (custom domain in prod) |
| Infrastructure | AWS CDK v2 (TypeScript), 5 stacks |
| Ingestion | ts-node CLI, glob, DynamoDB BatchWrite |
| Testing | Jest (backend/ingestion), Playwright (frontend E2E) |

---

## AWS architecture

Five CDK stacks are deployed per environment (`dev` / `prod`):

| Stack | Resources |
|---|---|
| `AuthStack` | Cognito User Pool, SPA app client, CMS app client, Google IdP, Hosted UI domain |
| `DataStack` | 7 DynamoDB tables: Characters, Classes, GameData, DomainCards, Media, Users, CMS |
| `StorageStack` | S3 media bucket, CloudFront CDN distribution (OAC) |
| `ApiStack` | 8 Lambda functions, HTTP API Gateway v2, JWT authorizer, CloudWatch log groups |
| `FrontendStack` | S3 frontend bucket, CloudFront distribution, URL-rewrite CF Function, ACM cert (prod) |

### Lambda functions

| Function | Routes |
|---|---|
| `characters` | `GET/POST/PUT/PATCH/DELETE /characters/*`, `/admin/characters`, level-up, rest, downtime projects, portrait upload |
| `gamedata` | `GET /classes/*`, `/communities/*`, `/ancestries/*`, `/domains/*`, `/rules/*` (public) |
| `media` | `GET/POST/DELETE /media/*` — pre-signed S3 URL management |
| `users` | `GET/PUT/PATCH/DELETE /users/me` — user profile |
| `auth-admin` | `GET/POST/DELETE /admin/auth/users/*` — Cognito admin operations |
| `compliance` | `GET /compliance/export`, `DELETE /compliance/account` — GDPR/CCPA |
| `ingestion-admin` | `POST /admin/ingestion/trigger`, `GET /admin/ingestion/jobs/*` |
| `cms` | `GET/POST/PUT/DELETE /cms/*` — interstitials, splash screens |

### DynamoDB key schema

| Table | PK | SK |
|---|---|---|
| Characters | `USER#{userId}` | `CHARACTER#{characterId}` |
| Classes | `CLASS#{classId}` | `METADATA` or `SUBCLASS#{subclassId}` |
| GameData | `COMMUNITY#{id}` / `ANCESTRY#{id}` / `RULE#{id}` | `METADATA` |
| DomainCards | `DOMAIN#{domain}` | `CARD#{cardId}` or `METADATA` |
| Media | `USER#{userId}` | `MEDIA#{mediaId}` |
| Users | `USER#{userId}` | `PROFILE` |
| CMS | `CMS#{type}` | `ITEM#{id}` |

---

## Local development

### Prerequisites

- Node.js 20+
- AWS CLI v2 configured with credentials for the dev account
- AWS CDK v2 (`npm install -g aws-cdk`)

### Frontend

```bash
cd frontend
npm install
npm run dev        # http://localhost:3000
```

Copy `.env.local.example` → `.env.local` and populate `NEXT_PUBLIC_API_URL` with the dev API Gateway URL from CDK outputs.

### Backend

```bash
cd backend
npm install
npm run build              # bundle all Lambda handlers into dist/
npm run build:characters   # build a single handler
npm test                   # Jest unit tests
```

### Ingestion pipeline

The ingestion pipeline reads Markdown files from `markdown/` and writes parsed game data to DynamoDB.

```bash
cd ingestion
npm install

# Dev (reads ingestion/.env.ingestion)
npm run ingest

# Prod (invoke node directly with the prod env file)
"/mnt/c/Program Files/nodejs/node.exe" \
  --env-file=.env.ingestion.prod \
  ./node_modules/ts-node/dist/bin.js \
  -r tsconfig-paths/register \
  src/index.ts

# Dry-run (parse + validate without writing)
npm run ingest -- --dry-run --verbose

# Ingest a single category
npm run ingest -- --category=domains
```

**Environment files** (gitignored):
- `ingestion/.env.ingestion` — dev DynamoDB credentials and table names
- `ingestion/.env.ingestion.prod` — prod credentials

Copy `.env.example` at the repo root for the required variable names.

### Infrastructure

```bash
cd infrastructure
npm install
npm run build

# Deploy to dev
npm run deploy:dev

# Deploy to prod (requires approval for broadening changes)
npm run deploy:prod

# Preview changes
npm run diff
```

Google OAuth credentials must be exported before deploying:

```bash
export GOOGLE_CLIENT_ID_DEV=...
export GOOGLE_CLIENT_SECRET_DEV=...
export GOOGLE_CLIENT_ID_PROD=...
export GOOGLE_CLIENT_SECRET_PROD=...
```

---

## Game content authoring

All game content lives in `markdown/` and is the single source of truth. The ingestion pipeline parses these files and writes them to DynamoDB.

| Directory | Content |
|---|---|
| `markdown/Classes/` | One `.md` file per class (stats, features, subclasses, background questions) |
| `markdown/Communities/` | One `.md` file per community (trait, flavor text) |
| `markdown/Ancestries/` | One `.md` file per ancestry (traits, flavor text) |
| `markdown/Domains/<DomainName>/` | One `.md` file per domain card, named `(Level N) Card Name.md` |
| `markdown/Rules & Definitions/` | Glossary entries, rule definitions, special mechanics |

After editing any Markdown file, re-run the ingestion pipeline to sync changes to DynamoDB.

---

## Frontend deployment

```bash
cd frontend

# Deploy to dev (S3 sync + CloudFront invalidation)
npm run deploy:dev

# Deploy to prod
npm run deploy:prod
```

The frontend is a Next.js static export (`output: "export"` in `next.config.js`). The CloudFront distribution includes a viewer-request Function that rewrites clean URLs to the correct `index.html` paths in S3.

---

## Testing

```bash
# Backend unit tests
cd backend && npm test

# Ingestion unit tests
cd ingestion && npm test

# Frontend E2E tests (Playwright)
cd frontend && npm run test:e2e
cd frontend && npm run test:e2e:ui       # with Playwright UI
cd frontend && npm run test:e2e:report   # view last report
```

---

## Environment & secrets

| File | Purpose | Committed |
|---|---|---|
| `ingestion/.env.ingestion` | Dev DynamoDB region, endpoint, table names, AWS credentials | No |
| `ingestion/.env.ingestion.prod` | Prod credentials | No |
| `frontend/.env.local` | Local dev — `NEXT_PUBLIC_API_URL`, Cognito config | No |
| `frontend/.env.production` | Prod build env vars | No |
| `infrastructure/cdk-outputs.json` | CDK stack outputs (generated after deploy) | No |
| `.env.example` | Template showing required variable names | Yes |

---

## SRD compliance

Domain card, class, ancestry, and community text must conform to the Daggerheart SRD terminology. The audit report lives at `srd-compliance/language-audit.md`. After editing Markdown content, re-ingest and review the report before deploying.
