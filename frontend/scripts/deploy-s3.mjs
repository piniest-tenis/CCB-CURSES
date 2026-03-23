/**
 * deploy-s3.mjs
 * Syncs the Next.js static export (`out/`) to S3 and invalidates CloudFront.
 * Run via: node scripts/deploy-s3.mjs
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ WARNING: This script deploys to whichever S3 bucket is in the env.    │
 * │                                                                       │
 * │ When run directly, it loads .env.local via load-env.mjs, so it        │
 * │ targets the DEV bucket. This is correct for dev deployments.          │
 * │                                                                       │
 * │ For PRODUCTION deploys, NEVER run this script directly.               │
 * │ Use one of:                                                           │
 * │   • npm run deploy:prod     (build:prod + _deploy-prod.mjs)           │
 * │   • node scripts/_deploy-prod.mjs   (deploy only, build must exist)   │
 * │                                                                       │
 * │ _deploy-prod.mjs injects .env.production vars into this script's      │
 * │ environment so it targets the prod S3 bucket and CloudFront dist.     │
 * │ It also verifies the build contains prod Cognito/IDP values.          │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * Required env vars — set in frontend/.env.local (or repo-root .env) for local use:
 *   AWS_ACCESS_KEY_ID       — IAM deploy user access key
 *   AWS_SECRET_ACCESS_KEY   — IAM deploy user secret key
 *   AWS_REGION              — AWS region (e.g. us-east-2)
 *   FRONTEND_S3_BUCKET      — S3 bucket name for the static export
 *   CF_DISTRIBUTION_ID      — CloudFront distribution ID (for cache invalidation)
 *
 * In CI/CD these come from the runner's IAM role or injected secrets — never hardcode them.
 * See .env.example at the repo root for documentation on every variable.
 */

import { S3Client, PutObjectCommand, ListObjectsV2Command, DeleteObjectsCommand } from "@aws-sdk/client-s3";
import { CloudFrontClient, CreateInvalidationCommand } from "@aws-sdk/client-cloudfront";
import { readFileSync, readdirSync, statSync } from "fs";
import { join, relative } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { requireEnv, assertEnv } from "../../scripts/load-env.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ── Validate required env vars up front ───────────────────────────────────────
assertEnv(["AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY", "FRONTEND_S3_BUCKET", "CF_DISTRIBUTION_ID"]);

// ── Config ────────────────────────────────────────────────────────────────────
const BUCKET          = requireEnv("FRONTEND_S3_BUCKET");
const DISTRIBUTION_ID = requireEnv("CF_DISTRIBUTION_ID");
const REGION          = requireEnv("AWS_REGION", "us-east-2");
const OUT_DIR         = join(__dirname, "..", "out");

const credentials = {
  accessKeyId:     requireEnv("AWS_ACCESS_KEY_ID"),
  secretAccessKey: requireEnv("AWS_SECRET_ACCESS_KEY"),
};

const s3 = new S3Client({ region: REGION, credentials });
const cf = new CloudFrontClient({ region: "us-east-1", credentials }); // CF is global, endpoint is us-east-1

// ── Helpers ───────────────────────────────────────────────────────────────────
function walkDir(dir, base = dir) {
  const results = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      results.push(...walkDir(full, base));
    } else {
      results.push(full);
    }
  }
  return results;
}

function mimeType(filePath) {
  const ext = filePath.split(".").pop().toLowerCase();
  const map = {
    html: "text/html",
    css: "text/css",
    js: "application/javascript",
    json: "application/json",
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    gif: "image/gif",
    svg: "image/svg+xml",
    ico: "image/x-icon",
    woff: "font/woff",
    woff2: "font/woff2",
    ttf: "font/ttf",
    txt: "text/plain",
    xml: "application/xml",
    webp: "image/webp",
  };
  return map[ext] ?? "application/octet-stream";
}

// ── Upload all files from out/ ────────────────────────────────────────────────
async function uploadFiles() {
  const files = walkDir(OUT_DIR);
  console.log(`Uploading ${files.length} files to s3://${BUCKET} ...`);

  let uploaded = 0;
  for (const file of files) {
    const key = relative(OUT_DIR, file).replace(/\\/g, "/");
    const body = readFileSync(file);
    const contentType = mimeType(file);

    await s3.send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: key,
        Body: body,
        ContentType: contentType,
        // Cache immutable assets forever; HTML files should revalidate
        CacheControl: key.includes("/_next/static/") ? "public, max-age=31536000, immutable" : "public, max-age=0, must-revalidate",
      })
    );
    uploaded++;
    if (uploaded % 20 === 0) process.stdout.write(`  ${uploaded}/${files.length}\n`);
  }
  console.log(`  Uploaded ${uploaded}/${files.length} files.`);
}

// ── Delete stale keys (keys in S3 but not in out/) ───────────────────────────
async function deleteStale() {
  const localKeys = new Set(
    walkDir(OUT_DIR).map((f) => relative(OUT_DIR, f).replace(/\\/g, "/"))
  );

  let continuationToken;
  const staleKeys = [];

  do {
    const resp = await s3.send(
      new ListObjectsV2Command({
        Bucket: BUCKET,
        ContinuationToken: continuationToken,
      })
    );
    for (const obj of resp.Contents ?? []) {
      if (!localKeys.has(obj.Key)) {
        staleKeys.push({ Key: obj.Key });
      }
    }
    continuationToken = resp.IsTruncated ? resp.NextContinuationToken : undefined;
  } while (continuationToken);

  if (staleKeys.length === 0) {
    console.log("No stale objects to delete.");
    return;
  }

  console.log(`Deleting ${staleKeys.length} stale objects...`);
  // Delete in batches of 1000 (S3 limit)
  for (let i = 0; i < staleKeys.length; i += 1000) {
    await s3.send(
      new DeleteObjectsCommand({
        Bucket: BUCKET,
        Delete: { Objects: staleKeys.slice(i, i + 1000) },
      })
    );
  }
  console.log(`  Deleted ${staleKeys.length} stale objects.`);
}

// ── CloudFront invalidation ───────────────────────────────────────────────────
async function invalidateCloudFront(distributionId) {
  if (!distributionId) {
    console.warn("CF_DISTRIBUTION_ID not set — skipping CloudFront invalidation.");
    return;
  }
  console.log(`Invalidating CloudFront distribution ${distributionId} ...`);
  const resp = await cf.send(
    new CreateInvalidationCommand({
      DistributionId: distributionId,
      InvalidationBatch: {
        CallerReference: String(Date.now()),
        Paths: { Quantity: 1, Items: ["/*"] },
      },
    })
  );
  console.log(`  Invalidation created: ${resp.Invalidation.Id} (status: ${resp.Invalidation.Status})`);
}

// ── Main ──────────────────────────────────────────────────────────────────────
(async () => {
  try {
    await uploadFiles();
    await deleteStale();
    await invalidateCloudFront(DISTRIBUTION_ID);
    console.log("Deploy complete.");
  } catch (err) {
    console.error("Deploy failed:", err);
    process.exit(1);
  }
})();
