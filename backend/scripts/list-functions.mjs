// backend/scripts/list-functions.mjs
// Lists all Lambda functions in the configured AWS region.
//
// Required env vars (set in repo-root .env or export in shell):
//   AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION (or AWS_DEFAULT_REGION)
// See .env.example at the repo root for documentation.

import { LambdaClient, ListFunctionsCommand } from "@aws-sdk/client-lambda";
import { requireEnv } from "../../scripts/load-env.mjs";

const client = new LambdaClient({
  region: process.env.AWS_REGION ?? process.env.AWS_DEFAULT_REGION ?? "us-east-2",
  credentials: {
    accessKeyId: requireEnv("AWS_ACCESS_KEY_ID"),
    secretAccessKey: requireEnv("AWS_SECRET_ACCESS_KEY"),
  },
});

const result = await client.send(new ListFunctionsCommand({}));
result.Functions.forEach(f => console.log(f.FunctionName));
