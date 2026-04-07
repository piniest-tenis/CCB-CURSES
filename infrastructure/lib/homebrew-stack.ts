// infrastructure/lib/homebrew-stack.ts
// CDK Stack for the Daggerheart Homebrew Content System.
// Provisions:
//   - Homebrew Lambda (HTTP CRUD for homebrew content — classes, ancestries, communities, domain cards)
//   - HTTP routes on the existing HttpApi from ApiStack
//   - Permissions: read/write on Classes, GameData, DomainCards tables;
//                  read on Campaigns table (for visibility resolution)

import * as cdk from "aws-cdk-lib";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as apigwv2 from "aws-cdk-lib/aws-apigatewayv2";
import * as apigwv2Integrations from "aws-cdk-lib/aws-apigatewayv2-integrations";
import * as apigwv2Authorizers from "aws-cdk-lib/aws-apigatewayv2-authorizers";
import * as logs from "aws-cdk-lib/aws-logs";
import { Construct } from "constructs";
import { AuthStack } from "./auth-stack";
import { DataStack } from "./data-stack";
import { CampaignStack } from "./campaign-stack";

export interface HomebrewStackProps extends cdk.StackProps {
  stage: string;
  authStack: AuthStack;
  dataStack: DataStack;
  campaignStack: CampaignStack;
  /** The existing HTTP API from ApiStack — homebrew routes are added here. */
  httpApi: apigwv2.HttpApi;
  /** CORS allowed origins (from ApiStack) — passed to Lambda env. */
  corsAllowedOrigins: string[];
}

export class HomebrewStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: HomebrewStackProps) {
    super(scope, id, props);

    const { stage, authStack, dataStack, campaignStack, httpApi, corsAllowedOrigins } = props;
    const isProd = stage === "prod";
    const logRetention = isProd
      ? logs.RetentionDays.THREE_MONTHS
      : logs.RetentionDays.ONE_WEEK;

    const makeLambdaLogGroup = (fnName: string) =>
      new logs.LogGroup(this, `${fnName}LogGroup`, {
        logGroupName: `/aws/lambda/daggerheart-${fnName}-${stage}`,
        retention: logRetention,
        removalPolicy: isProd ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
      });

    // -------------------------------------------------------------------------
    // 1. Shared Lambda environment
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
        CLASSES_TABLE: dataStack.classesTable.tableName,
        GAMEDATA_TABLE: dataStack.gameDataTable.tableName,
        DOMAINCARDS_TABLE: dataStack.domainCardsTable.tableName,
        CAMPAIGNS_TABLE: campaignStack.campaignsTable.tableName,
        CORS_ALLOWED_ORIGINS: corsAllowedOrigins.join(","),
      },
    };

    // -------------------------------------------------------------------------
    // 2. JWT Authorizer (reuses the same Cognito User Pool as ApiStack)
    // -------------------------------------------------------------------------
    const jwtAuthorizer = new apigwv2Authorizers.HttpJwtAuthorizer(
      "HomebrewCognitoJwtAuthorizer",
      `https://cognito-idp.${this.region}.amazonaws.com/${authStack.userPool.userPoolId}`,
      {
        authorizerName: "HomebrewCognitoJWT",
        jwtAudience: [authStack.userPoolClient.userPoolClientId],
        identitySource: ["$request.header.Authorization"],
      }
    );

    // -------------------------------------------------------------------------
    // 3. Homebrew HTTP Lambda
    // -------------------------------------------------------------------------
    const homebrewHandler = new lambda.Function(this, "HomebrewHandler", {
      ...commonLambdaProps,
      functionName: `daggerheart-homebrew-${stage}`,
      description: "Homebrew content CRUD — create, read, update, delete custom game content",
      handler: "index.handler",
      code: lambda.Code.fromAsset("../backend/dist/homebrew-handler"),
      logGroup: makeLambdaLogGroup("homebrew"),
    } as lambda.FunctionProps);

    // Read/Write on game-data tables (homebrew items are stored alongside SRD data)
    dataStack.classesTable.grantReadWriteData(homebrewHandler);
    dataStack.gameDataTable.grantReadWriteData(homebrewHandler);
    dataStack.domainCardsTable.grantReadWriteData(homebrewHandler);

    // Read-only on Campaigns table (for visibility resolution — find GMs)
    campaignStack.campaignsTable.grantReadData(homebrewHandler);

    // -------------------------------------------------------------------------
    // 4. HTTP Routes for Homebrew endpoints
    // -------------------------------------------------------------------------
    const homebrewIntegration = new apigwv2Integrations.HttpLambdaIntegration(
      "HomebrewIntegration",
      homebrewHandler
    );

    const homebrewRoutes: Array<{ method: apigwv2.HttpMethod; path: string }> = [
      // List all homebrew by the current user
      { method: apigwv2.HttpMethod.GET, path: "/homebrew/mine" },
      // Parse preview — parse markdown without saving
      { method: apigwv2.HttpMethod.POST, path: "/homebrew/parse" },
      // Create homebrew content
      { method: apigwv2.HttpMethod.POST, path: "/homebrew" },
      // Get a single homebrew item
      { method: apigwv2.HttpMethod.GET, path: "/homebrew/{contentType}/{id}" },
      // Update a homebrew item
      { method: apigwv2.HttpMethod.PUT, path: "/homebrew/{contentType}/{id}" },
      // Delete a homebrew item
      { method: apigwv2.HttpMethod.DELETE, path: "/homebrew/{contentType}/{id}" },
    ];

    for (const route of homebrewRoutes) {
      httpApi.addRoutes({
        path: route.path,
        methods: [route.method],
        integration: homebrewIntegration,
        authorizer: jwtAuthorizer,
      });
    }

    // -------------------------------------------------------------------------
    // 5. CloudFormation Outputs
    // -------------------------------------------------------------------------
    new cdk.CfnOutput(this, "HomebrewHandlerArn", {
      exportName: `DaggerheartHomebrewHandlerArn-${stage}`,
      value: homebrewHandler.functionArn,
    });
  }
}
