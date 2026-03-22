/**
 * scripts/build-prod.mjs
 *
 * Runs `next build` with prod env vars injected into the child process
 * environment BEFORE Next.js loads any .env files. Because Next.js only
 * writes .env file values into process.env when the key is NOT already
 * present, pre-setting them here means .env.production wins over .env.local.
 *
 * Usage:
 *   node scripts/build-prod.mjs
 *   (or via: npm run build:prod)
 */

import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { spawnSync } from "child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FRONTEND_DIR = resolve(__dirname, "..");
const ENV_PROD_FILE = resolve(FRONTEND_DIR, ".env.production");

if (!existsSync(ENV_PROD_FILE)) {
  console.error(`[build-prod] ERROR: ${ENV_PROD_FILE} not found.`);
  process.exit(1);
}

// Parse .env.production into a key→value map
function parseDotEnv(filePath) {
  const vars = {};
  for (const line of readFileSync(filePath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    let value = trimmed.slice(eqIdx + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    vars[key] = value;
  }
  return vars;
}

const prodVars = parseDotEnv(ENV_PROD_FILE);

// Merge: prod vars take priority over current process.env
const env = { ...process.env, ...prodVars };

console.log("[build-prod] Building with prod env vars from .env.production");
console.log(`[build-prod]   NEXT_PUBLIC_STAGE=${env.NEXT_PUBLIC_STAGE}`);
console.log(`[build-prod]   NEXT_PUBLIC_COGNITO_HOSTED_DOMAIN=${env.NEXT_PUBLIC_COGNITO_HOSTED_DOMAIN}`);
console.log(`[build-prod]   NEXT_PUBLIC_API_URL=${env.NEXT_PUBLIC_API_URL}`);

const result = spawnSync(
  process.execPath, // the same node binary running this script
  [resolve(FRONTEND_DIR, "node_modules/next/dist/bin/next"), "build"],
  {
    cwd: FRONTEND_DIR,
    env,
    stdio: "inherit",
  }
);

process.exit(result.status ?? 1);
