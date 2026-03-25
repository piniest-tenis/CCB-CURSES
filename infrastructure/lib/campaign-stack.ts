// infrastructure/lib/campaign-stack.ts
// CDK Stack for the Daggerheart Campaign System.
// Provisions:
//   - DynamoDB Campaigns table (with GSIs and stream)
//   - DynamoDB Connections table (WebSocket connection tracking, TTL)
//   - Campaign Lambda (HTTP CRUD for campaigns, members, invites, characters)
//   - WebSocket API (ApiGateway v2 WebSocket) + connect/disconnect/ping Lambdas
//   - HTTP routes on the existing HttpApi from ApiStack

import * as cdk from "aws-cdk-lib";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as apigwv2 from "aws-cdk-lib/aws-apigatewayv2";
import * as apigwv2Integrations from "aws-cdk-lib/aws-apigatewayv2-integrations";
import * as apigwv2Authorizers from "aws-cdk-lib/aws-apigatewayv2-authorizers";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as iam from "aws-cdk-lib/aws-iam";
import * as logs from "aws-cdk-lib/aws-logs";
import { Construct } from "constructs";
import { AuthStack } from "./auth-stack";
import { DataStack } from "./data-stack";

export interface CampaignStackProps extends cdk.StackProps {
  stage: string;
  authStack: AuthStack;
  dataStack: DataStack;
  /** The existing HTTP API from ApiStack — campaign routes are added here. */
  httpApi: apigwv2.HttpApi;
  /** CORS allowed origins (from ApiStack) — passed to Lambda env. */
  corsAllowedOrigins: string[];
}

export class CampaignStack extends cdk.Stack {
  public readonly campaignsTable: dynamodb.Table;
  public readonly connectionsTable: dynamodb.Table;
  public readonly wsApiUrl: string;

  constructor(scope: Construct, id: string, props: CampaignStackProps) {
    super(scope, id, props);

    const { stage, authStack, dataStack, httpApi, corsAllowedOrigins } = props;
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
    // 1. DynamoDB: Campaigns Table
    //    PK: CAMPAIGN#{campaignId} | USER#{userId}
    //    SK: METADATA | MEMBER#GM#{userId} | MEMBER#PLAYER#{userId} |
    //        CHARACTER#{characterId} | INVITE#{inviteCode} | CAMPAIGN#{campaignId}
    // -------------------------------------------------------------------------
    this.campaignsTable = new dynamodb.Table(this, "CampaignsTable", {
      tableName: `daggerheart-campaigns-${stage}`,
      partitionKey: { name: "PK", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "SK", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      pointInTimeRecoverySpecification,
      removalPolicy,
      stream: dynamodb.StreamViewType.NEW_AND_OLD_IMAGES,
      timeToLiveAttribute: "ttl",
    });

    // GSI: userId-index — lists all campaigns a user is a member of
    // PK=userId_gsi (STR), SK=campaignId_gsi (STR) — stored on CampaignMemberRecord
    this.campaignsTable.addGlobalSecondaryIndex({
      indexName: "userId-index",
      partitionKey: { name: "userId_gsi", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "campaignId_gsi", type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // GSI: inviteCode-index — resolve invite by code (for POST /invites/{code}/accept)
    this.campaignsTable.addGlobalSecondaryIndex({
      indexName: "inviteCode-index",
      partitionKey: { name: "inviteCode_gsi", type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // -------------------------------------------------------------------------
    // 2. DynamoDB: Connections Table
    //    PK: CONNECTION#{connectionId} | CHARACTER#{characterId}
    //    SK: METADATA | CONNECTION#{connectionId}
    // -------------------------------------------------------------------------
    this.connectionsTable = new dynamodb.Table(this, "ConnectionsTable", {
      tableName: `daggerheart-connections-${stage}`,
      partitionKey: { name: "PK", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "SK", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy,
      timeToLiveAttribute: "ttl",
    });

    // -------------------------------------------------------------------------
    // 3. Shared Lambda environment
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
        CHARACTERS_TABLE: dataStack.charactersTable.tableName,
        USERS_TABLE: dataStack.usersTable.tableName,
        CAMPAIGNS_TABLE: this.campaignsTable.tableName,
        CONNECTIONS_TABLE: this.connectionsTable.tableName,
        CORS_ALLOWED_ORIGINS: corsAllowedOrigins.join(","),
      },
    };

    // -------------------------------------------------------------------------
    // 4. JWT Authorizer (reuses the same Cognito User Pool as ApiStack)
    // -------------------------------------------------------------------------
    const jwtAuthorizer = new apigwv2Authorizers.HttpJwtAuthorizer(
      "CampaignCognitoJwtAuthorizer",
      `https://cognito-idp.${this.region}.amazonaws.com/${authStack.userPool.userPoolId}`,
      {
        authorizerName: "CampaignCognitoJWT",
        jwtAudience: [authStack.userPoolClient.userPoolClientId],
        identitySource: ["$request.header.Authorization"],
      }
    );

    // -------------------------------------------------------------------------
    // 5. Campaigns HTTP Lambda
    // -------------------------------------------------------------------------
    const campaignsHandler = new lambda.Function(this, "CampaignsHandler", {
      ...commonLambdaProps,
      functionName: `daggerheart-campaigns-${stage}`,
      description: "Campaign system CRUD — campaigns, members, invites, characters",
      handler: "index.handler",
      code: lambda.Code.fromAsset("../backend/dist/campaigns-handler"),
      logGroup: makeLambdaLogGroup("campaigns"),
    } as lambda.FunctionProps);

    this.campaignsTable.grantReadWriteData(campaignsHandler);
    dataStack.charactersTable.grantReadWriteData(campaignsHandler);
    dataStack.usersTable.grantReadData(campaignsHandler);

    // -------------------------------------------------------------------------
    // 6. HTTP Routes for Campaign endpoints
    // -------------------------------------------------------------------------
    const campaignsIntegration = new apigwv2Integrations.HttpLambdaIntegration(
      "CampaignsIntegration",
      campaignsHandler
    );

    const campaignRoutes: Array<{ method: apigwv2.HttpMethod; path: string }> = [
      // Campaign CRUD
      { method: apigwv2.HttpMethod.GET, path: "/campaigns" },
      { method: apigwv2.HttpMethod.POST, path: "/campaigns" },
      { method: apigwv2.HttpMethod.GET, path: "/campaigns/{campaignId}" },
      { method: apigwv2.HttpMethod.PATCH, path: "/campaigns/{campaignId}" },
      { method: apigwv2.HttpMethod.DELETE, path: "/campaigns/{campaignId}" },
      // Members
      { method: apigwv2.HttpMethod.GET, path: "/campaigns/{campaignId}/members" },
      { method: apigwv2.HttpMethod.DELETE, path: "/campaigns/{campaignId}/members/{userId}" },
      { method: apigwv2.HttpMethod.PATCH, path: "/campaigns/{campaignId}/members/{userId}" },
      // Invites
      { method: apigwv2.HttpMethod.POST, path: "/campaigns/{campaignId}/invites" },
      { method: apigwv2.HttpMethod.GET, path: "/campaigns/{campaignId}/invites" },
      { method: apigwv2.HttpMethod.DELETE, path: "/campaigns/{campaignId}/invites/{inviteCode}" },
      // Invite acceptance (no campaign in path)
      { method: apigwv2.HttpMethod.POST, path: "/invites/{inviteCode}/accept" },
      // Characters
      { method: apigwv2.HttpMethod.POST, path: "/campaigns/{campaignId}/characters" },
      { method: apigwv2.HttpMethod.POST, path: "/campaigns/{campaignId}/characters/new" },
      { method: apigwv2.HttpMethod.DELETE, path: "/campaigns/{campaignId}/characters/{characterId}" },
    ];

    for (const route of campaignRoutes) {
      httpApi.addRoutes({
        path: route.path,
        methods: [route.method],
        integration: campaignsIntegration,
        authorizer: jwtAuthorizer,
      });
    }

    // -------------------------------------------------------------------------
    // 7. WebSocket API
    // -------------------------------------------------------------------------
    const wsLogGroup = new logs.LogGroup(this, "WsApiAccessLogs", {
      logGroupName: `/aws/apigateway/daggerheart-ws-${stage}`,
      retention: logRetention,
      removalPolicy: isProd ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
    });

    // ── Connect Lambda ────────────────────────────────────────────────────────
    const wsConnectHandler = new lambda.Function(this, "WsConnectHandler", {
      ...commonLambdaProps,
      functionName: `daggerheart-ws-connect-${stage}`,
      description: "WebSocket $connect — validates JWT, writes connection records",
      handler: "index.handler",
      code: lambda.Code.fromAsset("../backend/dist/ws-connect-handler"),
      logGroup: makeLambdaLogGroup("ws-connect"),
    } as lambda.FunctionProps);

    this.connectionsTable.grantReadWriteData(wsConnectHandler);

    // ── Disconnect Lambda ─────────────────────────────────────────────────────
    const wsDisconnectHandler = new lambda.Function(this, "WsDisconnectHandler", {
      ...commonLambdaProps,
      functionName: `daggerheart-ws-disconnect-${stage}`,
      description: "WebSocket $disconnect — cleans up connection records",
      handler: "index.handler",
      code: lambda.Code.fromAsset("../backend/dist/ws-disconnect-handler"),
      logGroup: makeLambdaLogGroup("ws-disconnect"),
    } as lambda.FunctionProps);

    this.connectionsTable.grantReadWriteData(wsDisconnectHandler);

    // ── Ping Lambda ───────────────────────────────────────────────────────────
    const wsPingHandler = new lambda.Function(this, "WsPingHandler", {
      ...commonLambdaProps,
      functionName: `daggerheart-ws-ping-${stage}`,
      description: "WebSocket ping action — GM pings a player character field",
      handler: "index.handler",
      code: lambda.Code.fromAsset("../backend/dist/ws-ping-handler"),
      logGroup: makeLambdaLogGroup("ws-ping"),
    } as lambda.FunctionProps);

    this.connectionsTable.grantReadWriteData(wsPingHandler);
    this.campaignsTable.grantReadData(wsPingHandler);

    // ── WebSocket API ─────────────────────────────────────────────────────────
    const wsApi = new apigwv2.WebSocketApi(this, "WsApi", {
      apiName: `daggerheart-ws-${stage}`,
      description: "Daggerheart real-time WebSocket API",
      connectRouteOptions: {
        integration: new apigwv2Integrations.WebSocketLambdaIntegration(
          "WsConnectIntegration",
          wsConnectHandler
        ),
      },
      disconnectRouteOptions: {
        integration: new apigwv2Integrations.WebSocketLambdaIntegration(
          "WsDisconnectIntegration",
          wsDisconnectHandler
        ),
      },
    });

    // Add the ping route
    wsApi.addRoute("ping", {
      integration: new apigwv2Integrations.WebSocketLambdaIntegration(
        "WsPingIntegration",
        wsPingHandler
      ),
    });

    // Named stage with auto-deploy
    const wsStage = new apigwv2.WebSocketStage(this, "WsStage", {
      webSocketApi: wsApi,
      stageName: stage,
      autoDeploy: true,
    });

    // Access logging on API Gateway stages requires a CloudWatch Logs IAM role
    // to be configured at the AWS account level (a one-time account setting).
    // Enable it only in prod where that account setting is expected to exist;
    // skip it for dev/staging to avoid a deployment-blocking BadRequestException.
    if (isProd) {
      const cfnWsStage = wsStage.node.defaultChild as apigwv2.CfnStage;
      cfnWsStage.accessLogSettings = {
        destinationArn: wsLogGroup.logGroupArn,
        format: JSON.stringify({
          requestId: "$context.requestId",
          ip: "$context.identity.sourceIp",
          requestTime: "$context.requestTime",
          routeKey: "$context.routeKey",
          status: "$context.status",
          connectionId: "$context.connectionId",
          errorMessage: "$context.error.message",
          integrationError: "$context.integrationErrorMessage",
        }),
      };
    }

    // Compute the WS API URL
    this.wsApiUrl = `wss://${wsApi.apiId}.execute-api.${this.region}.amazonaws.com/${stage}`;

    // Grant the WS API permission to invoke Lambda functions
    wsApi.grantManageConnections(wsPingHandler);

    // Grant ping handler permission to post to connections (execute-api:ManageConnections)
    wsPingHandler.addToRolePolicy(
      new iam.PolicyStatement({
        sid: "WsPingManageConnections",
        effect: iam.Effect.ALLOW,
        actions: ["execute-api:ManageConnections"],
        resources: [
          `arn:aws:execute-api:${this.region}:${this.account}:${wsApi.apiId}/${stage}/POST/@connections/*`,
        ],
      })
    );

    // Set WS_API_ENDPOINT env var on ping handler after WS API is created
    wsPingHandler.addEnvironment(
      "WS_API_ENDPOINT",
      `https://${wsApi.apiId}.execute-api.${this.region}.amazonaws.com/${stage}`
    );

    // -------------------------------------------------------------------------
    // 8. CloudFormation Outputs
    // -------------------------------------------------------------------------
    new cdk.CfnOutput(this, "CampaignsTableName", {
      exportName: `DaggerheartCampaignsTableName-${stage}`,
      value: this.campaignsTable.tableName,
      description: "DynamoDB Campaigns table name",
    });

    new cdk.CfnOutput(this, "ConnectionsTableName", {
      exportName: `DaggerheartConnectionsTableName-${stage}`,
      value: this.connectionsTable.tableName,
      description: "DynamoDB WebSocket Connections table name",
    });

    new cdk.CfnOutput(this, "WsApiUrl", {
      exportName: `DaggerheartWsApiUrl-${stage}`,
      value: this.wsApiUrl,
      description: "WebSocket API endpoint URL",
    });

    new cdk.CfnOutput(this, "WsApiId", {
      exportName: `DaggerheartWsApiId-${stage}`,
      value: wsApi.apiId,
      description: "WebSocket API ID",
    });

    new cdk.CfnOutput(this, "CampaignsHandlerArn", {
      exportName: `DaggerheartCampaignsHandlerArn-${stage}`,
      value: campaignsHandler.functionArn,
    });

    new cdk.CfnOutput(this, "WsConnectHandlerArn", {
      exportName: `DaggerheartWsConnectHandlerArn-${stage}`,
      value: wsConnectHandler.functionArn,
    });

    new cdk.CfnOutput(this, "WsDisconnectHandlerArn", {
      exportName: `DaggerheartWsDisconnectHandlerArn-${stage}`,
      value: wsDisconnectHandler.functionArn,
    });

    new cdk.CfnOutput(this, "WsPingHandlerArn", {
      exportName: `DaggerheartWsPingHandlerArn-${stage}`,
      value: wsPingHandler.functionArn,
    });
  }
}
