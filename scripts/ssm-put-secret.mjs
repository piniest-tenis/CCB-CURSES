// scripts/ssm-put-secret.mjs
// One-shot: generate SHARE_TOKEN_SECRET and store it in SSM Parameter Store.
// Usage: node scripts/ssm-put-secret.mjs  (run from repo root)
// Reads credentials from frontend/.env.local via load-env.mjs

import { createRequire } from "module";
import { createHash, randomBytes } from "crypto";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { requireEnv } from "./load-env.mjs";

// Resolve @aws-sdk/client-ssm from the backend's node_modules
const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(resolve(__dirname, "../backend/package.json"));
const { SSMClient, PutParameterCommand } = require("@aws-sdk/client-ssm");

const secret = randomBytes(32).toString("hex");

const client = new SSMClient({
  region: requireEnv("AWS_REGION"),
  credentials: {
    accessKeyId: requireEnv("AWS_ACCESS_KEY_ID"),
    secretAccessKey: requireEnv("AWS_SECRET_ACCESS_KEY"),
  },
});

const result = await client.send(
  new PutParameterCommand({
    Name: "/daggerheart/dev/SHARE_TOKEN_SECRET",
    Value: secret,
    Type: "SecureString",
    Overwrite: true,
  })
);

console.log(`Stored /daggerheart/dev/SHARE_TOKEN_SECRET`);
console.log(`  Version : ${result.Version}`);
console.log(`  Tier    : ${result.Tier}`);
console.log(`  SHA256  : ${createHash("sha256").update(secret).digest("hex").slice(0, 16)}...  (first 16 chars of hash for verification)`);
