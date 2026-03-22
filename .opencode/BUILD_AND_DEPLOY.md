# Build & Deploy Runbook

This is the canonical reference for building and deploying the Daggerheart character platform frontend. Read this at the start of any session that may involve shipping changes.

---

## Environment

| Layer | Technology | Location |
|-------|-----------|----------|
| Frontend | Next.js 14 (static export) | `frontend/` |
| Hosting | AWS S3 + CloudFront | `daggerheart-frontend-dev-625693792690` |
| CDN | CloudFront distribution | `E12V8PHM7C7JBP` |
| Deploy script | Node ESM | `frontend/scripts/deploy-s3.mjs` |

Credentials and environment variables live in `frontend/.env.local` (never committed). See `.env.example` at the repo root for documentation on every variable.

---

## Prerequisites

- `frontend/.env.local` must exist and contain:
  - `AWS_ACCESS_KEY_ID`
  - `AWS_SECRET_ACCESS_KEY`
  - `AWS_REGION` (defaults to `us-east-2`)
  - `FRONTEND_S3_BUCKET`
  - `CF_DISTRIBUTION_ID`

---

## Build

**Always run from `frontend/`.**

```bash
cd frontend
npm run build
```

- Compiles TypeScript, lints, and generates a static export into `frontend/out/`
- Build must exit cleanly (no type errors, no lint errors) before deploying
- If you get an `EPERM` error, **abort immediately** — do not retry or work around it

---

## Deploy

**Run from `frontend/` using the Windows Node binary** (the WSL shell does not have `node` on PATH):

```bash
"/mnt/c/Program Files/nodejs/node.exe" scripts/deploy-s3.mjs
```

What the script does:
1. Uploads all files from `frontend/out/` to S3, with correct `Content-Type` and `Cache-Control` headers
2. Deletes any stale S3 objects no longer present in `out/`
3. Creates a `/*` CloudFront invalidation — propagation takes ~30–60 seconds

---

## One-Shot Build + Deploy (from repo root, WSL)

```bash
cd /mnt/c/Users/joshu/Repos/CCB-Curses/frontend && \
  npm run build && \
  "/mnt/c/Program Files/nodejs/node.exe" scripts/deploy-s3.mjs
```

On Windows (from repo root), you can alternatively run:

```bat
deploy-frontend.bat
```

---

## Verifying a Deploy

After the deploy script prints `Deploy complete.`, wait ~60 seconds for CloudFront propagation, then check the live site. The invalidation ID printed by the script can be looked up in the AWS Console under CloudFront > Distributions > Invalidations if you need to confirm propagation status.

---

## Troubleshooting

| Symptom | Action |
|---------|--------|
| `EPERM` error during build | **Abort immediately.** Do not retry. Report to user. |
| `node: command not found` in WSL | Use the full Windows path: `"/mnt/c/Program Files/nodejs/node.exe"` |
| `AWS_ACCESS_KEY_ID not found` | Ensure `frontend/.env.local` exists and is populated |
| Build succeeds but site is stale | Check CloudFront invalidation status; wait up to 5 minutes |
| TypeScript errors in build | Fix errors before deploying — never use `--no-check` workarounds |

---

## Key File Locations

```
CCB-Curses/
├── .opencode/
│   └── BUILD_AND_DEPLOY.md        ← this file
├── frontend/
│   ├── .env.local                 ← credentials (not committed)
│   ├── next.config.mjs            ← Next.js config (static export)
│   ├── scripts/
│   │   └── deploy-s3.mjs          ← S3 sync + CloudFront invalidation
│   └── src/                       ← all application source
├── deploy-frontend.bat            ← Windows one-shot build+deploy
└── .env.example                   ← documents all required env vars
```
