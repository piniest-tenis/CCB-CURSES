/**
 * scripts/load-env.mjs
 *
 * Shared environment loader for Node.js deploy/utility scripts.
 *
 * Usage:
 *   import { requireEnv } from "../../scripts/load-env.mjs";
 *   const bucket = requireEnv("FRONTEND_S3_BUCKET");
 *
 * Loads variables from the NEAREST .env file found by walking up from:
 *   1. The directory of the calling script  (process.env.SCRIPT_DIR if set)
 *   2. The repo root  (two dirs up from this file: scripts/../)
 *
 * Variable resolution order (highest priority first):
 *   1. Already-set process.env  (CI/CD injected vars, shell exports)
 *   2. <repo-root>/.env
 *   3. <repo-root>/frontend/.env.local   (if caller is in frontend/)
 *   4. Throws a clear error if a required var is missing
 *
 * SECURITY NOTES:
 *   - Never import this in browser/Lambda bundles — server/scripts only.
 *   - .env files must never be committed.  See .gitignore and .env.example.
 */

import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Locate the repo root (one level up from this file's scripts/ dir) ─────────
const REPO_ROOT = resolve(__dirname, "..");

/**
 * Parse a .env-style file and merge values into process.env.
 * Existing process.env values are NOT overwritten (CI wins over .env).
 */
function loadDotEnvFile(filePath) {
  if (!existsSync(filePath)) return;

  const raw = readFileSync(filePath, "utf8");
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    // Skip blank lines and comments
    if (!trimmed || trimmed.startsWith("#")) continue;

    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;

    const key = trimmed.slice(0, eqIdx).trim();
    // Strip inline comments from value (e.g. VAR=value # comment)
    let value = trimmed.slice(eqIdx + 1).trim();
    // Strip surrounding quotes
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    // Only set if not already in environment (process.env / CI wins)
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

// ── Load env files (lowest priority first so higher-priority wins) ─────────────

// 1. Repo-root .env  (shared deploy vars, AWS credentials for local use)
loadDotEnvFile(resolve(REPO_ROOT, ".env"));

// 2. frontend/.env.local  (Next.js public vars + per-app overrides)
loadDotEnvFile(resolve(REPO_ROOT, "frontend", ".env.local"));

// 3. ingestion/.env.ingestion  (ingestion-specific overrides)
loadDotEnvFile(resolve(REPO_ROOT, "ingestion", ".env.ingestion"));

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Return the value of an environment variable or throw a descriptive error.
 *
 * @param {string} name - The variable name
 * @param {string} [fallback] - Optional default; if omitted the var is required
 * @returns {string}
 */
export function requireEnv(name, fallback) {
  const value = process.env[name] ?? fallback;
  if (value === undefined || value === "") {
    throw new Error(
      `[load-env] Required environment variable "${name}" is not set.\n` +
        `  • For local dev: add it to .env (repo root) or frontend/.env.local\n` +
        `  • See .env.example for all required variables.\n` +
        `  • In CI/CD: inject it as a secret environment variable.`
    );
  }
  return value;
}

/**
 * Return the value of an environment variable or undefined if not set.
 * Use this for truly optional variables.
 */
export function optionalEnv(name) {
  return process.env[name];
}

/**
 * Validate that a set of required variables are all present.
 * Throws a single combined error listing all missing vars.
 *
 * @param {string[]} names
 */
export function assertEnv(names) {
  const missing = names.filter((n) => !process.env[n]);
  if (missing.length > 0) {
    throw new Error(
      `[load-env] Missing required environment variables:\n` +
        missing.map((n) => `  • ${n}`).join("\n") +
        `\n\nSee .env.example for documentation on each variable.`
    );
  }
}
