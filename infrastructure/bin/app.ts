#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { AuthStack } from "../lib/auth-stack";
import { DataStack } from "../lib/data-stack";
import { StorageStack } from "../lib/storage-stack";
import { ApiStack } from "../lib/api-stack";
import { FrontendStack } from "../lib/frontend-stack";

const app = new cdk.App();

const stage = (app.node.tryGetContext("stage") ?? "dev") as string;

if (!["dev", "staging", "prod"].includes(stage)) {
  throw new Error(`Invalid stage "${stage}". Must be one of: dev, staging, prod`);
}

const env: cdk.Environment = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION ?? "us-east-1",
};

const stackProps = { env, stage };

const authStack = new AuthStack(app, `DaggerheartAuth-${stage}`, stackProps);

const dataStack = new DataStack(app, `DaggerheartData-${stage}`, stackProps);

const storageStack = new StorageStack(app, `DaggerheartStorage-${stage}`, stackProps);

const apiStack = new ApiStack(app, `DaggerheartApi-${stage}`, {
  ...stackProps,
  authStack,
  dataStack,
  storageStack,
});

new FrontendStack(app, `DaggerheartFrontend-${stage}`, {
  ...stackProps,
  apiStack,
});

cdk.Tags.of(app).add("Project", "DaggerheartCharacterPlatform");
cdk.Tags.of(app).add("Stage", stage);
cdk.Tags.of(app).add("ManagedBy", "CDK");
