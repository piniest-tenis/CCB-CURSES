// backend/scripts/deploy-lambda-prod.mjs
// Usage: node scripts/deploy-lambda-prod.mjs <handlerName>
// Deploys to the -prod Lambda function instead of -dev.

import { LambdaClient, UpdateFunctionCodeCommand } from "@aws-sdk/client-lambda";
import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { requireEnv } from "../../scripts/load-env.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));

const handlerName = process.argv[2];
if (!handlerName) {
  console.error("Usage: node deploy-lambda-prod.mjs <handlerName>");
  process.exit(1);
}

const zipPath = resolve(__dirname, `../dist/tmp/${handlerName}.zip`);
if (!existsSync(zipPath)) {
  console.error(`Zip not found: ${zipPath} — run build:${handlerName} first`);
  process.exit(1);
}

const functionName = `daggerheart-${handlerName}-prod`;
const zipBuffer = readFileSync(zipPath);

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
