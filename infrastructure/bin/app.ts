#!/usr/bin/env node

// Load infrastructure/.env so that process.env has Patreon credentials,
// Google OAuth secrets, etc. when CDK synthesises Lambda environment blocks.
// This is necessary because npx/Node on Windows does not inherit shell-exported
// env vars when invoked from WSL, and we don't want to rely on `source .env`.
import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(__dirname, "..", ".env") });

import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import * as acm from "aws-cdk-lib/aws-certificatemanager";
import { AuthStack } from "../lib/auth-stack";
import { DataStack } from "../lib/data-stack";
import { StorageStack } from "../lib/storage-stack";
import { ApiStack } from "../lib/api-stack";
import { CampaignStack } from "../lib/campaign-stack";
import { HomebrewStack } from "../lib/homebrew-stack";
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

// CORS origins mirror what ApiStack computes — keep them in sync.
const isProd = stage === "prod";
const corsAllowedOrigins = isProd
  ? [
      "https://ccb.curses.show",
      "https://localhost:8080",
      "https://ajls8isp75nequgerzql4vipnfrzzi.ext-twitch.tv",
    ]
  : [
      "http://localhost:3000",
      "http://localhost:3001",
      `https://${stage}.curses-ccb.example.com`,
      "https://d195iz9cwkg00c.cloudfront.net",
    ];

const campaignStack = new CampaignStack(app, `DaggerheartCampaign-${stage}`, {
  ...stackProps,
  authStack,
  dataStack,
  httpApi: apiStack.httpApi,
  corsAllowedOrigins,
});

new HomebrewStack(app, `DaggerheartHomebrew-${stage}`, {
  ...stackProps,
  authStack,
  dataStack,
  campaignStack,
  httpApi: apiStack.httpApi,
  corsAllowedOrigins,
});

// CloudFront requires ACM certificates to be in us-east-1 regardless of the
// stack's deployment region. The cert for ccb.curses.show was provisioned
// manually (ARN below) and is already attached to CloudFront. We import it
// by ARN so CDK can reference it without owning the resource lifecycle —
// this avoids the cross-region SSM export deadlock that occurs when CDK tries
// to replace a cert that a dependent stack is still consuming.
//
// If you ever need to rotate this cert, provision the new one in ACM first,
// update the ARN here, and redeploy.
const frontendCertificateArn: string | undefined = isProd
  ? "arn:aws:acm:us-east-1:625693792690:certificate/39f5284e-7163-4a95-aef1-f70390abd7b4"
  : undefined;

// The DaggerheartCert-prod stack previously managed the cert resource. It has
// been rolled back to UPDATE_ROLLBACK_COMPLETE and can be deleted once the
// DaggerheartFrontend-prod stack no longer imports from it.

new FrontendStack(app, `DaggerheartFrontend-${stage}`, {
  ...stackProps,
  // crossRegionReferences lets CDK pass the cert ARN from us-east-1 via SSM
  crossRegionReferences: true,
  apiStack,
  frontendCertificateArn,
});

cdk.Tags.of(app).add("Project", "DaggerheartCharacterPlatform");
cdk.Tags.of(app).add("Stage", stage);
cdk.Tags.of(app).add("ManagedBy", "CDK");
