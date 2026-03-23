// scripts/deploy-auth-admin.mjs — deploys auth handler to both auth-admin lambdas
import { LambdaClient, UpdateFunctionCodeCommand } from "@aws-sdk/client-lambda";
import { readFileSync, existsSync, mkdirSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import JSZip from "jszip";
import { requireEnv } from "../../scripts/load-env.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const distFile = resolve(__dirname, "../dist/auth-handler/index.js");

const zip = new JSZip();
zip.file("index.js", readFileSync(distFile));
const zipBuffer = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });

const tmpDir = resolve(__dirname, "../dist/tmp");
if (!existsSync(tmpDir)) mkdirSync(tmpDir, { recursive: true });

const client = new LambdaClient({
  region: "us-east-2",
  credentials: {
    accessKeyId: requireEnv("AWS_ACCESS_KEY_ID"),
    secretAccessKey: requireEnv("AWS_SECRET_ACCESS_KEY"),
  },
});

for (const fnName of ["daggerheart-auth-admin-dev", "daggerheart-auth-admin-prod"]) {
  console.log(`Deploying → ${fnName} ...`);
  const result = await client.send(new UpdateFunctionCodeCommand({ FunctionName: fnName, ZipFile: zipBuffer }));
  console.log(`  Done. CodeSize=${result.CodeSize} LastModified=${result.LastModified}`);
}
