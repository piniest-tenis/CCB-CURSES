// backend/scripts/deploy-lambda.mjs
// Usage: node scripts/deploy-lambda.mjs <handlerName>
//
// Required env vars (set in repo-root .env or export in shell):
//   AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION (or AWS_DEFAULT_REGION)
// See .env.example at the repo root for documentation.

import { LambdaClient, UpdateFunctionCodeCommand } from "@aws-sdk/client-lambda";
import { readFileSync, existsSync, mkdirSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import JSZip from "jszip";
import { requireEnv } from "../../scripts/load-env.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));

const handlerName = process.argv[2];
if (!handlerName) {
  console.error("Usage: node deploy-lambda.mjs <handlerName>");
  process.exit(1);
}

const distFile = resolve(__dirname, `../dist/${handlerName}-handler/index.js`);
const functionName = `daggerheart-${handlerName}-dev`;
const tmpDir = resolve(__dirname, "../dist/tmp");

if (!existsSync(tmpDir)) mkdirSync(tmpDir, { recursive: true });
const zipPath = resolve(tmpDir, `${handlerName}.zip`);

const zip = new JSZip();
zip.file("index.js", readFileSync(distFile));
const zipBuffer = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
writeFileSync(zipPath, zipBuffer);
console.log(`Zipped ${distFile} → ${zipPath} (${zipBuffer.length} bytes)`);

const client = new LambdaClient({
  region: requireEnv("AWS_REGION", requireEnv("AWS_DEFAULT_REGION", "us-east-2")),
  credentials: {
    accessKeyId: requireEnv("AWS_ACCESS_KEY_ID"),
    secretAccessKey: requireEnv("AWS_SECRET_ACCESS_KEY"),
  },
});

console.log(`Deploying ${handlerName} → ${functionName} ...`);
const result = await client.send(
  new UpdateFunctionCodeCommand({ FunctionName: functionName, ZipFile: zipBuffer })
);
console.log(`Done. CodeSize=${result.CodeSize} LastModified=${result.LastModified}`);
