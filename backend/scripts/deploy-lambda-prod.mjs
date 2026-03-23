// backend/scripts/deploy-lambda-prod.mjs
// Usage: node scripts/deploy-lambda-prod.mjs <handlerName>
// Builds from source and deploys to the -prod Lambda function.

import { LambdaClient, UpdateFunctionCodeCommand } from "@aws-sdk/client-lambda";
import { readFileSync, existsSync, mkdirSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import JSZip from "jszip";
import { requireEnv } from "../../scripts/load-env.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));

const handlerName = process.argv[2];
if (!handlerName) {
  console.error("Usage: node deploy-lambda-prod.mjs <handlerName>");
  process.exit(1);
}

const distFile = resolve(__dirname, `../dist/${handlerName}-handler/index.js`);
if (!existsSync(distFile)) {
  console.error(`Built file not found: ${distFile} — run build:${handlerName} first`);
  process.exit(1);
}

const tmpDir = resolve(__dirname, "../dist/tmp");
if (!existsSync(tmpDir)) mkdirSync(tmpDir, { recursive: true });
const zipPath = resolve(tmpDir, `${handlerName}-prod.zip`);

const zip = new JSZip();
zip.file("index.js", readFileSync(distFile));
const zipBuffer = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
writeFileSync(zipPath, zipBuffer);
console.log(`Zipped ${distFile} → ${zipPath} (${zipBuffer.length} bytes)`);

const functionName = `daggerheart-${handlerName}-prod`;

const client = new LambdaClient({
  region: requireEnv("AWS_REGION", "us-east-2"),
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
