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
      "https://curses-ccb.maninjumpsuit.com",
      "https://localhost:8080",
      "https://ajls8isp75nequgerzql4vipnfrzzi.ext-twitch.tv",
    ]
  : [
      "http://localhost:3000",
      "http://localhost:3001",
      `https://${stage}.curses-ccb.example.com`,
      "https://dqt96kbhxdqy3.cloudfront.net",
    ];

new CampaignStack(app, `DaggerheartCampaign-${stage}`, {
  ...stackProps,
  authStack,
  dataStack,
  httpApi: apiStack.httpApi,
  corsAllowedOrigins,
});

// CloudFront requires ACM certificates to be in us-east-1 regardless of the
// stack's deployment region. We create the cert in a dedicated us-east-1 stack
// and pass the certificate ARN string into FrontendStack to avoid cross-region
// SSM references (which require bootstrapping in both regions).
let frontendCertificateArn: string | undefined;
if (stage === "prod") {
  const certStack = new cdk.Stack(app, `DaggerheartCert-${stage}`, {
    env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: "us-east-1" },
    crossRegionReferences: true,
  });

  const cert = new acm.Certificate(certStack, "FrontendCertificate", {
    domainName: "curses-ccb.maninjumpsuit.com",
    validation: acm.CertificateValidation.fromDns(),
  });
  // Export the ARN as a plain string output so the FrontendStack can consume
  // it without a cross-region reference (avoids SSM bootstrap requirement).
  new cdk.CfnOutput(certStack, "CertificateArn", {
    value: cert.certificateArn,
    exportName: `DaggerheartFrontendCertArn-${stage}`,
  });
  frontendCertificateArn = cert.certificateArn;
}

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
