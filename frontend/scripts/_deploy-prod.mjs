/**
 * scripts/_deploy-prod.mjs
 *
 * Deploys the already-built static export (out/) to the PRODUCTION S3 bucket.
 *
 * IMPORTANT: The build in out/ must have been created with `npm run build:prod`
 * (i.e. node scripts/build-prod.mjs), NOT plain `npm run build`. A plain
 * `next build` bakes .env.local (dev) values into the JS bundle because
 * Next.js loads .env.local with higher priority than .env.production.
 *
 * This script verifies the build contains prod env vars before deploying.
 * If the build contains dev values, it will abort with a clear error.
 *
 * Usage:
 *   node scripts/_deploy-prod.mjs          (deploy only — build must exist)
 *   npm run deploy:prod                    (build:prod + deploy in one step)
 */

import { spawnSync } from "child_process";
import { readFileSync, existsSync, readdirSync } from "fs";
import { resolve, dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FRONTEND_DIR = resolve(__dirname, "..");
const OUT_DIR = resolve(FRONTEND_DIR, "out");

function parseDotEnv(filePath) {
  const vars = {};
  for (const line of readFileSync(filePath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    let value = trimmed.slice(eqIdx + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    vars[key] = value;
  }
  return vars;
}

// ── Verify the build output contains prod values, not dev ─────────────────────
function verifyBuildEnv(prodVars) {
  const prodDomain = prodVars.NEXT_PUBLIC_COGNITO_HOSTED_DOMAIN;
  const prodPoolId = prodVars.NEXT_PUBLIC_COGNITO_USER_POOL_ID;

  // Load dev values so we can detect if they leaked in
  const devEnvFile = resolve(FRONTEND_DIR, ".env.local");
  let devDomain = "";
  let devPoolId = "";
  if (existsSync(devEnvFile)) {
    const devVars = parseDotEnv(devEnvFile);
    devDomain = devVars.NEXT_PUBLIC_COGNITO_HOSTED_DOMAIN || "";
    devPoolId = devVars.NEXT_PUBLIC_COGNITO_USER_POOL_ID || "";
  }

  if (!existsSync(OUT_DIR)) {
    console.error("[deploy-prod] ERROR: out/ directory not found. Run `npm run build:prod` first.");
    process.exit(1);
  }

  // Walk out/_next/static/ for JS chunks and check for baked-in env values
  const staticDir = join(OUT_DIR, "_next", "static");
  if (!existsSync(staticDir)) {
    console.error("[deploy-prod] ERROR: out/_next/static/ not found — build may be corrupt.");
    process.exit(1);
  }

  function findJsFiles(dir) {
    const results = [];
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) results.push(...findJsFiles(full));
      else if (entry.name.endsWith(".js")) results.push(full);
    }
    return results;
  }

  const jsFiles = findJsFiles(staticDir);
  let foundProd = false;
  let foundDev = false;

  for (const file of jsFiles) {
    const content = readFileSync(file, "utf8");
    if (prodDomain && content.includes(prodDomain)) foundProd = true;
    if (prodPoolId && content.includes(prodPoolId)) foundProd = true;
    if (devDomain && content.includes(devDomain)) foundDev = true;
    if (devPoolId && content.includes(devPoolId)) foundDev = true;
  }

  if (foundDev) {
    console.error("");
    console.error("╔══════════════════════════════════════════════════════════════════╗");
    console.error("║  DEPLOY ABORTED — BUILD CONTAINS DEV ENVIRONMENT VALUES        ║");
    console.error("╠══════════════════════════════════════════════════════════════════╣");
    console.error("║                                                                ║");
    console.error("║  The JS bundle in out/ contains dev Cognito/IDP values.        ║");
    console.error("║  This happens when you run `npm run build` (plain next build)  ║");
    console.error("║  instead of `npm run build:prod`.                              ║");
    console.error("║                                                                ║");
    console.error("║  Next.js loads .env.local with HIGHER priority than            ║");
    console.error("║  .env.production, so dev values get baked into the bundle.     ║");
    console.error("║                                                                ║");
    console.error("║  FIX: Run `npm run deploy:prod` which builds correctly.        ║");
    console.error("║       Or: `npm run build:prod && node scripts/_deploy-prod.mjs`║");
    console.error("║                                                                ║");
    console.error("╚══════════════════════════════════════════════════════════════════╝");
    console.error("");
    if (devDomain) console.error(`  Found dev domain:  ${devDomain}`);
    if (devPoolId) console.error(`  Found dev pool ID: ${devPoolId}`);
    console.error(`  Expected prod domain: ${prodDomain}`);
    console.error(`  Expected prod pool ID: ${prodPoolId}`);
    console.error("");
    process.exit(1);
  }

  if (!foundProd) {
    console.warn("[deploy-prod] WARNING: Could not confirm prod env vars in build output.");
    console.warn("  This may be fine if auth pages are not statically exported.");
    console.warn(`  Expected to find: ${prodDomain} or ${prodPoolId}`);
  } else {
    console.log("[deploy-prod] ✓ Build output verified — contains prod env values.");
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

const prodVars = parseDotEnv(resolve(FRONTEND_DIR, ".env.production"));

// Verify the build before deploying
verifyBuildEnv(prodVars);

const env = { ...process.env, ...prodVars };
console.log(`[deploy-prod] → s3://${prodVars.FRONTEND_S3_BUCKET} (CF: ${prodVars.CF_DISTRIBUTION_ID})`);
const result = spawnSync(process.execPath, [resolve(FRONTEND_DIR, "scripts/deploy-s3.mjs")], { cwd: FRONTEND_DIR, env, stdio: "inherit" });
process.exit(result.status ?? 1);
