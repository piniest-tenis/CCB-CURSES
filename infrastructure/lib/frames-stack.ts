// infrastructure/lib/frames-stack.ts
// CDK Stack for the Daggerheart Campaign Frames System.
// Provisions:
//   - DynamoDB Frames table (with GSI for creator listing)
//   - Frames Lambda (HTTP CRUD for campaign frames, content refs, restrictions,
//     extensions, campaign attachment, and conflict resolution)
//   - HTTP routes on the existing HttpApi from ApiStack

import * as cdk from "aws-cdk-lib";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as apigwv2 from "aws-cdk-lib/aws-apigatewayv2";
import * as apigwv2Integrations from "aws-cdk-lib/aws-apigatewayv2-integrations";
import * as apigwv2Authorizers from "aws-cdk-lib/aws-apigatewayv2-authorizers";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as logs from "aws-cdk-lib/aws-logs";
import { Construct } from "constructs";
import { AuthStack } from "./auth-stack";
import { DataStack } from "./data-stack";
import { CampaignStack } from "./campaign-stack";

export interface FramesStackProps extends cdk.StackProps {
  stage: string;
  authStack: AuthStack;
  dataStack: DataStack;
  campaignStack: CampaignStack;
  /** The existing HTTP API from ApiStack — frame routes are added here. */
  httpApi: apigwv2.HttpApi;
  /** CORS allowed origins (from ApiStack) — passed to Lambda env. */
  corsAllowedOrigins: string[];
}

export class FramesStack extends cdk.Stack {
  public readonly framesTable: dynamodb.Table;

  constructor(scope: Construct, id: string, props: FramesStackProps) {
    super(scope, id, props);

    const { stage, authStack, dataStack, campaignStack, httpApi, corsAllowedOrigins } = props;
    const isProd = stage === "prod";
    const removalPolicy = isProd
      ? cdk.RemovalPolicy.RETAIN
      : cdk.RemovalPolicy.DESTROY;
    const logRetention = isProd
      ? logs.RetentionDays.THREE_MONTHS
      : logs.RetentionDays.ONE_WEEK;
    const pointInTimeRecoverySpecification = isProd
      ? { pointInTimeRecoveryEnabled: true }
      : undefined;

    const makeLambdaLogGroup = (fnName: string) =>
      new logs.LogGroup(this, `${fnName}LogGroup`, {
        logGroupName: `/aws/lambda/daggerheart-${fnName}-${stage}`,
        retention: logRetention,
        removalPolicy: isProd ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
      });

    // -------------------------------------------------------------------------
    // 1. DynamoDB: Frames Table
    //    PK: FRAME#{frameId}
    //    SK: METADATA | CONTENT#{contentType}#{contentId} |
    //        RESTRICTION#{contentType}#{contentId} |
    //        EXTENSION#{extensionType}#{slug}
    // -------------------------------------------------------------------------
    this.framesTable = new dynamodb.Table(this, "FramesTable", {
      tableName: `daggerheart-frames-${stage}`,
      partitionKey: { name: "PK", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "SK", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      pointInTimeRecoverySpecification,
      removalPolicy,
    });

    // GSI: creator-index — list all frames created by a user
    // PK=creatorUserId (STR), SK=updatedAt (STR)
    this.framesTable.addGlobalSecondaryIndex({
      indexName: "creator-index",
      partitionKey: { name: "creatorUserId", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "updatedAt", type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // -------------------------------------------------------------------------
    // 2. Shared Lambda environment
    // -------------------------------------------------------------------------
    const commonLambdaProps: Partial<lambda.FunctionProps> = {
      runtime: lambda.Runtime.NODEJS_20_X,
      architecture: lambda.Architecture.ARM_64,
      memorySize: 512,
      timeout: cdk.Duration.seconds(10),
      environment: {
        STAGE: stage,
        AWS_NODEJS_CONNECTION_REUSE_ENABLED: "1",
        COGNITO_USER_POOL_ID: authStack.userPool.userPoolId,
        FRAMES_TABLE: this.framesTable.tableName,
        CAMPAIGNS_TABLE: campaignStack.campaignsTable.tableName,
        CLASSES_TABLE: dataStack.classesTable.tableName,
        GAMEDATA_TABLE: dataStack.gameDataTable.tableName,
        DOMAINCARDS_TABLE: dataStack.domainCardsTable.tableName,
        CORS_ALLOWED_ORIGINS: corsAllowedOrigins.join(","),
      },
    };

    // -------------------------------------------------------------------------
    // 3. JWT Authorizer
    // -------------------------------------------------------------------------
    const jwtAuthorizer = new apigwv2Authorizers.HttpJwtAuthorizer(
      "FramesCognitoJwtAuthorizer",
      `https://cognito-idp.${this.region}.amazonaws.com/${authStack.userPool.userPoolId}`,
      {
        authorizerName: "FramesCognitoJWT",
        jwtAudience: [authStack.userPoolClient.userPoolClientId],
        identitySource: ["$request.header.Authorization"],
      }
    );

    // -------------------------------------------------------------------------
    // 4. Frames HTTP Lambda
    // -------------------------------------------------------------------------
    const framesHandler = new lambda.Function(this, "FramesHandler", {
      ...commonLambdaProps,
      functionName: `daggerheart-frames-${stage}`,
      description: "Campaign Frames CRUD — manage homebrew packages, restrictions, extensions, and campaign attachment",
      handler: "index.handler",
      code: lambda.Code.fromAsset("../backend/dist/frames-handler"),
      logGroup: makeLambdaLogGroup("frames"),
    } as lambda.FunctionProps);

    // Read/Write on Frames table (frame records)
    this.framesTable.grantReadWriteData(framesHandler);

    // Read/Write on Campaigns table (attachment + conflict resolution records)
    campaignStack.campaignsTable.grantReadWriteData(framesHandler);

    // Read-only on game-data tables (to validate homebrew content refs exist)
    dataStack.classesTable.grantReadData(framesHandler);
    dataStack.gameDataTable.grantReadData(framesHandler);
    dataStack.domainCardsTable.grantReadData(framesHandler);

    // -------------------------------------------------------------------------
    // 5. HTTP Routes for Frame endpoints
    // -------------------------------------------------------------------------
    const framesIntegration = new apigwv2Integrations.HttpLambdaIntegration(
      "FramesIntegration",
      framesHandler
    );

    const framesRoutes: Array<{ method: apigwv2.HttpMethod; path: string }> = [
      // ── Frame CRUD ──────────────────────────────────────────────────────
      // List frames created by the current user
      { method: apigwv2.HttpMethod.GET, path: "/frames" },
      // Create a new frame
      { method: apigwv2.HttpMethod.POST, path: "/frames" },
      // Get full frame detail
      { method: apigwv2.HttpMethod.GET, path: "/frames/{frameId}" },
      // Update frame metadata
      { method: apigwv2.HttpMethod.PATCH, path: "/frames/{frameId}" },
      // Delete a frame (and all its nested records)
      { method: apigwv2.HttpMethod.DELETE, path: "/frames/{frameId}" },

      // ── Frame Content References ────────────────────────────────────────
      // Add a homebrew content item to a frame
      { method: apigwv2.HttpMethod.POST, path: "/frames/{frameId}/contents" },
      // Remove a content item from a frame
      { method: apigwv2.HttpMethod.DELETE, path: "/frames/{frameId}/contents/{contentType}/{contentId}" },

      // ── Frame SRD Restrictions ──────────────────────────────────────────
      // Add an SRD restriction/alteration
      { method: apigwv2.HttpMethod.POST, path: "/frames/{frameId}/restrictions" },
      // Update an existing restriction
      { method: apigwv2.HttpMethod.PUT, path: "/frames/{frameId}/restrictions/{contentType}/{contentId}" },
      // Remove a restriction
      { method: apigwv2.HttpMethod.DELETE, path: "/frames/{frameId}/restrictions/{contentType}/{contentId}" },

      // ── Frame Custom Type Extensions ────────────────────────────────────
      // Add a custom type extension
      { method: apigwv2.HttpMethod.POST, path: "/frames/{frameId}/extensions" },
      // Update an extension
      { method: apigwv2.HttpMethod.PUT, path: "/frames/{frameId}/extensions/{extensionType}/{slug}" },
      // Remove an extension
      { method: apigwv2.HttpMethod.DELETE, path: "/frames/{frameId}/extensions/{extensionType}/{slug}" },

      // ── Campaign ↔ Frame Attachment ─────────────────────────────────────
      // Attach a frame to a campaign
      { method: apigwv2.HttpMethod.POST, path: "/campaigns/{campaignId}/frames" },
      // List frames attached to a campaign
      { method: apigwv2.HttpMethod.GET, path: "/campaigns/{campaignId}/frames" },
      // Detach a frame from a campaign
      { method: apigwv2.HttpMethod.DELETE, path: "/campaigns/{campaignId}/frames/{frameId}" },

      // ── Conflict Resolution ─────────────────────────────────────────────
      // List conflicts for a campaign
      { method: apigwv2.HttpMethod.GET, path: "/campaigns/{campaignId}/conflicts" },
      // Resolve a conflict
      { method: apigwv2.HttpMethod.POST, path: "/campaigns/{campaignId}/conflicts" },
      // Delete a conflict resolution (re-opens the conflict)
      { method: apigwv2.HttpMethod.DELETE, path: "/campaigns/{campaignId}/conflicts/{contentType}/{contentName}" },
    ];

    for (const route of framesRoutes) {
      httpApi.addRoutes({
        path: route.path,
        methods: [route.method],
        integration: framesIntegration,
        authorizer: jwtAuthorizer,
      });
    }

    // -------------------------------------------------------------------------
    // 6. CloudFormation Outputs
    // -------------------------------------------------------------------------
    new cdk.CfnOutput(this, "FramesTableName", {
      exportName: `DaggerheartFramesTable-${stage}`,
      value: this.framesTable.tableName,
    });

    new cdk.CfnOutput(this, "FramesHandlerArn", {
      exportName: `DaggerheartFramesHandlerArn-${stage}`,
      value: framesHandler.functionArn,
    });
  }
}
