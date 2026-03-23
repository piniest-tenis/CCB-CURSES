import * as cdk from "aws-cdk-lib";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as apigwv2 from "aws-cdk-lib/aws-apigatewayv2";
import * as apigwv2Integrations from "aws-cdk-lib/aws-apigatewayv2-integrations";
import * as apigwv2Authorizers from "aws-cdk-lib/aws-apigatewayv2-authorizers";
import { AccessLogFormat } from "aws-cdk-lib/aws-apigateway";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as iam from "aws-cdk-lib/aws-iam";
import * as logs from "aws-cdk-lib/aws-logs";
import { Construct } from "constructs";
import { AuthStack } from "./auth-stack";
import { DataStack } from "./data-stack";
import { StorageStack } from "./storage-stack";

export interface ApiStackProps extends cdk.StackProps {
  stage: string;
  authStack: AuthStack;
  dataStack: DataStack;
  storageStack: StorageStack;
}

export class ApiStack extends cdk.Stack {
  public readonly httpApi: apigwv2.HttpApi;
  public readonly apiUrl: string;

  constructor(scope: Construct, id: string, props: ApiStackProps) {
    super(scope, id, props);

    const { stage, authStack, dataStack, storageStack } = props;
    const isProd = stage === "prod";

    const logRetention = isProd
      ? logs.RetentionDays.THREE_MONTHS
      : logs.RetentionDays.ONE_WEEK;

    // Helper: create a named log group for each Lambda function
    const makeLambdaLogGroup = (fnName: string) =>
      new logs.LogGroup(this, `${fnName}LogGroup`, {
        logGroupName: `/aws/lambda/daggerheart-${fnName}-${stage}`,
        retention: logRetention,
        removalPolicy: isProd ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
      });

    // -----------------------------------------------------------------------
    // CORS allowed origins — shared between API Gateway config and Lambda env
    // -----------------------------------------------------------------------
    const corsAllowOrigins = isProd
      ? ["https://curses-ccb.maninjumpsuit.com"]
      : [
          "http://localhost:3000",
          "http://localhost:3001",
          `https://${stage}.curses-ccb.example.com`,
          // CloudFront domain for the deployed dev frontend
          "https://dqt96kbhxdqy3.cloudfront.net",
        ];

    // -----------------------------------------------------------------------
    // Shared Lambda configuration
    // -----------------------------------------------------------------------
    const commonLambdaProps: Partial<lambda.FunctionProps> = {
      runtime: lambda.Runtime.NODEJS_20_X,
      architecture: lambda.Architecture.ARM_64, // Graviton — ~20% cheaper
      memorySize: 512,
      timeout: cdk.Duration.seconds(10),
      environment: {
        STAGE: stage,
        AWS_NODEJS_CONNECTION_REUSE_ENABLED: "1", // Reuse HTTP keep-alive
        COGNITO_USER_POOL_ID: authStack.userPool.userPoolId,
        S3_MEDIA_BUCKET: storageStack.mediaBucket.bucketName,
        CDN_DOMAIN: storageStack.cdnDistribution.distributionDomainName,
        // Key prefix used by the characters handler for portrait images.
        // Stored as an env var so it can be overridden without code changes.
        PORTRAITS_KEY_PREFIX: "portraits",
        CHARACTERS_TABLE: dataStack.charactersTable.tableName,
        CLASSES_TABLE: dataStack.classesTable.tableName,
        GAMEDATA_TABLE: dataStack.gameDataTable.tableName,
        DOMAINCARDS_TABLE: dataStack.domainCardsTable.tableName,
        MEDIA_TABLE: dataStack.mediaTable.tableName,
        USERS_TABLE: dataStack.usersTable.tableName,
        CMS_TABLE: dataStack.cmsTable.tableName,
        // CORS: Lambda responses must echo back the request Origin against this
        // allowlist to stay consistent with API Gateway's corsPreflight config.
        CORS_ALLOWED_ORIGINS: corsAllowOrigins.join(","),
      },
    };

    // -----------------------------------------------------------------------
    // 1. Characters Lambda
    //    Handles: GET|POST|PUT|PATCH|DELETE /characters/*
    //    Permissions: read/write Characters table; read Classes/GameData/DomainCards
    // -----------------------------------------------------------------------
    const charactersHandler = new lambda.Function(
      this,
      "CharactersHandler",
      {
        ...commonLambdaProps,
        functionName: `daggerheart-characters-${stage}`,
        description: "Character sheet CRUD + SRD validation",
        handler: "index.handler",
        code: lambda.Code.fromAsset("../backend/dist/characters-handler"),
        logGroup: makeLambdaLogGroup("characters"),
      } as lambda.FunctionProps
    );

    // Read+Write on Characters table
    dataStack.charactersTable.grantReadWriteData(charactersHandler);
    // Read-only on reference tables (for validation)
    dataStack.classesTable.grantReadData(charactersHandler);
    dataStack.gameDataTable.grantReadData(charactersHandler);
    dataStack.domainCardsTable.grantReadData(charactersHandler);

    // Allow the characters handler to generate presigned PUT URLs for portrait
    // images and (on confirmation) to read/delete them.
    // Portraits are stored under portraits/ in the shared media bucket.
    charactersHandler.addToRolePolicy(
      new iam.PolicyStatement({
        sid: "CharactersHandlerPortraitAccess",
        effect: iam.Effect.ALLOW,
        actions: ["s3:PutObject", "s3:GetObject", "s3:DeleteObject"],
        resources: [storageStack.mediaBucket.arnForObjects("portraits/*")],
      })
    );

    // -----------------------------------------------------------------------
    // 2. Game Data Lambda
    //    Handles: GET /classes/*, GET /communities/*, GET /ancestries/*, etc.
    //    Public endpoints — read-only reference data
    // -----------------------------------------------------------------------
    const gamedataHandler = new lambda.Function(
      this,
      "GameDataHandler",
      {
        ...commonLambdaProps,
        functionName: `daggerheart-gamedata-${stage}`,
        description: "Read-only game reference data (classes, domains, etc.)",
        handler: "index.handler",
        code: lambda.Code.fromAsset("../backend/dist/gamedata-handler"),
        logGroup: makeLambdaLogGroup("gamedata"),
      } as lambda.FunctionProps
    );

    dataStack.classesTable.grantReadData(gamedataHandler);
    dataStack.gameDataTable.grantReadData(gamedataHandler);
    dataStack.domainCardsTable.grantReadData(gamedataHandler);

    // -----------------------------------------------------------------------
    // 3. Media Lambda
    //    Handles: POST /media/presign, GET /media, DELETE /media/{mediaId}
    //    Permissions: read/write Media table; s3 PutObject/GetObject/DeleteObject
    // -----------------------------------------------------------------------
    const mediaHandler = new lambda.Function(
      this,
      "MediaHandler",
      {
        ...commonLambdaProps,
        functionName: `daggerheart-media-${stage}`,
        description: "S3 pre-signed URL generation and media record management",
        handler: "index.handler",
        code: lambda.Code.fromAsset("../backend/dist/media-handler"),
        logGroup: makeLambdaLogGroup("media"),
      } as lambda.FunctionProps
    );

    dataStack.mediaTable.grantReadWriteData(mediaHandler);

    // IAM role policy grants the Lambda access to the media bucket.
    // NOTE: We intentionally do NOT add a bucket resource policy here — doing so
    // would cross-reference the Lambda role ARN from ApiStack into StorageStack,
    // creating a CDK dependency cycle. The Lambda role policy alone is sufficient
    // for a non-public bucket (IAM identity policy is evaluated).
    mediaHandler.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ["s3:PutObject", "s3:GetObject", "s3:DeleteObject"],
        resources: [storageStack.mediaBucket.arnForObjects("media/*")],
      })
    );

    // -----------------------------------------------------------------------
    // 4. Users Lambda
    //    Handles: GET /users/me, PUT /users/me, PATCH /users/me, DELETE /users/me
    //    Permissions: read/write Users table only
    // -----------------------------------------------------------------------
    const usersHandler = new lambda.Function(
      this,
      "UsersHandler",
      {
        ...commonLambdaProps,
        functionName: `daggerheart-users-${stage}`,
        description: "User profile management",
        handler: "index.handler",
        code: lambda.Code.fromAsset("../backend/dist/users-handler"),
        logGroup: makeLambdaLogGroup("users"),
      } as lambda.FunctionProps
    );

    dataStack.usersTable.grantReadWriteData(usersHandler);

    // -----------------------------------------------------------------------
    // 5. Auth Admin Lambda
    //    Handles: GET|POST|DELETE /admin/auth/users/*
    //    Permissions: Cognito AdminGetUser, AdminConfirmSignUp,
    //                 AdminResetUserPassword, AdminDeleteUser, ListUsers
    //                 + read/write Users table (delete profile on admin user delete)
    // -----------------------------------------------------------------------
    const authAdminHandler = new lambda.Function(
      this,
      "AuthAdminHandler",
      {
        ...commonLambdaProps,
        functionName: `daggerheart-auth-admin-${stage}`,
        description: "Cognito admin operations (confirm, reset-password, delete user)",
        handler: "index.handler",
        code: lambda.Code.fromAsset("../backend/dist/auth-handler"),
        logGroup: makeLambdaLogGroup("auth-admin"),
      } as lambda.FunctionProps
    );

    // Cognito admin API permissions
    authAdminHandler.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          "cognito-idp:AdminGetUser",
          "cognito-idp:AdminConfirmSignUp",
          "cognito-idp:AdminResetUserPassword",
          "cognito-idp:AdminDeleteUser",
          "cognito-idp:ListUsers",
        ],
        resources: [authStack.userPool.userPoolArn],
      })
    );

    // Needs to delete the profile record when performing admin user deletion
    dataStack.usersTable.grantReadWriteData(authAdminHandler);

    // -----------------------------------------------------------------------
    // 6. Compliance Lambda
    //    Handles: GET /compliance/export, DELETE /compliance/account
    //    Permissions: read all user-scoped tables (export) +
    //                 delete from Characters, Media, Users tables +
    //                 Cognito AdminDeleteUser
    // -----------------------------------------------------------------------
    const complianceHandler = new lambda.Function(
      this,
      "ComplianceHandler",
      {
        ...commonLambdaProps,
        // GDPR export can be large — extend the timeout to 30 s
        timeout: cdk.Duration.seconds(30),
        functionName: `daggerheart-compliance-${stage}`,
        description: "GDPR/CCPA data export and account deletion",
        handler: "index.handler",
        code: lambda.Code.fromAsset("../backend/dist/compliance-handler"),
        logGroup: makeLambdaLogGroup("compliance"),
      } as lambda.FunctionProps
    );

    dataStack.usersTable.grantReadWriteData(complianceHandler);
    dataStack.charactersTable.grantReadWriteData(complianceHandler);
    dataStack.mediaTable.grantReadWriteData(complianceHandler);

    complianceHandler.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          "cognito-idp:AdminGetUser",
          "cognito-idp:AdminDeleteUser",
        ],
        resources: [authStack.userPool.userPoolArn],
      })
    );

    // -----------------------------------------------------------------------
    // 7. Ingestion Admin Lambda
    //    Handles: POST /admin/ingestion/trigger, GET /admin/ingestion/jobs/*
    //    Permissions: read/write IngestionJobs table +
    //                 lambda:InvokeFunction on the ingestion runner (if present)
    // -----------------------------------------------------------------------
    const ingestionJobsTable = new dynamodb.Table(
      this,
      "IngestionJobsTable",
      {
        tableName: `daggerheart-ingestion-jobs-${stage}`,
        partitionKey: { name: "PK", type: dynamodb.AttributeType.STRING },
        sortKey: { name: "SK", type: dynamodb.AttributeType.STRING },
        billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
        removalPolicy: isProd ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
      }
    );

    // GSI: query jobs by type + createdAt for ordered listing
    ingestionJobsTable.addGlobalSecondaryIndex({
      indexName: "type-index",
      partitionKey: { name: "type", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "createdAt", type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    const ingestionAdminHandler = new lambda.Function(
      this,
      "IngestionAdminHandler",
      {
        ...commonLambdaProps,
        functionName: `daggerheart-ingestion-admin-${stage}`,
        description: "Admin HTTP trigger for game-data re-ingestion",
        handler: "index.handler",
        code: lambda.Code.fromAsset("../backend/dist/ingestion-handler"),
        logGroup: makeLambdaLogGroup("ingestion-admin"),
        environment: {
          ...commonLambdaProps.environment,
          INGESTION_JOBS_TABLE: ingestionJobsTable.tableName,
          INGESTION_RUNNER_FUNCTION: `daggerheart-ingestion-runner-${stage}`,
        },
      } as lambda.FunctionProps
    );

    // Grant read/write on the jobs table via L2 helper
    ingestionJobsTable.grantReadWriteData(ingestionAdminHandler);

    // Allow invoking the ingestion runner Lambda (async trigger)
    ingestionAdminHandler.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ["lambda:InvokeFunction"],
        resources: [
          `arn:aws:lambda:${this.region}:${this.account}:function:daggerheart-ingestion-runner-${stage}`,
        ],
      })
    );

    // -----------------------------------------------------------------------
    // 8. CMS Lambda
    //    Handles: GET|POST|PUT|DELETE /cms/*
    //    Public: GET /cms/{type}
    //    Protected: all admin mutations + GET /cms/{type}/all
    // -----------------------------------------------------------------------
    const cmsHandler = new lambda.Function(
      this,
      "CmsHandler",
      {
        ...commonLambdaProps,
        functionName: `daggerheart-cms-${stage}`,
        description: "CMS content management (interstitials, splash screens)",
        handler: "index.handler",
        code: lambda.Code.fromAsset("../backend/dist/cms-handler"),
        logGroup: makeLambdaLogGroup("cms"),
      } as lambda.FunctionProps
    );

    dataStack.cmsTable.grantReadWriteData(cmsHandler);

    // CMS images are stored under cms/images/ in the media bucket.
    cmsHandler.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ["s3:PutObject"],
        resources: [storageStack.mediaBucket.arnForObjects("cms/*")],
      })
    );

    // -----------------------------------------------------------------------
    // HTTP API Gateway v2
    // -----------------------------------------------------------------------

    this.httpApi = new apigwv2.HttpApi(this, "HttpApi", {
      apiName: `daggerheart-api-${stage}`,
      description: "Daggerheart Character Platform API",
      corsPreflight: {
        allowOrigins: corsAllowOrigins,
        allowMethods: [
          apigwv2.CorsHttpMethod.GET,
          apigwv2.CorsHttpMethod.POST,
          apigwv2.CorsHttpMethod.PUT,
          apigwv2.CorsHttpMethod.PATCH,
          apigwv2.CorsHttpMethod.DELETE,
          apigwv2.CorsHttpMethod.OPTIONS,
        ],
        allowHeaders: [
          "Content-Type",
          "Authorization",
          "X-Amz-Date",
          "X-Api-Key",
          "X-Amz-Security-Token",
        ],
        allowCredentials: true,
        maxAge: cdk.Duration.hours(24),
      },
      // Disable default stage — we create a named stage below
      createDefaultStage: false,
    });

    // Named deployment stage with access logging
    const accessLogGroup = new logs.LogGroup(this, "ApiAccessLogs", {
      logGroupName: `/aws/apigateway/curses-ccb-${stage}`,
      retention: isProd ? logs.RetentionDays.THREE_MONTHS : logs.RetentionDays.ONE_WEEK,
      removalPolicy: isProd ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
    });

    new apigwv2.HttpStage(this, "ApiStage", {
      httpApi: this.httpApi,
      stageName: stage,
      autoDeploy: true,
      accessLogSettings: {
        destination: new apigwv2.LogGroupLogDestination(accessLogGroup),
        format: AccessLogFormat.custom(JSON.stringify({
          requestId: "$context.requestId",
          ip: "$context.identity.sourceIp",
          requestTime: "$context.requestTime",
          httpMethod: "$context.httpMethod",
          routeKey: "$context.routeKey",
          status: "$context.status",
          protocol: "$context.protocol",
          responseLength: "$context.responseLength",
          integrationLatency: "$context.integrationLatency",
          responseLatency: "$context.responseLatency",
        })),
      },
    });

    // -----------------------------------------------------------------------
    // JWT Authorizer — validates Cognito JWTs on protected routes
    // -----------------------------------------------------------------------
    const jwtAuthorizer = new apigwv2Authorizers.HttpJwtAuthorizer(
      "CognitoJwtAuthorizer",
      `https://cognito-idp.${this.region}.amazonaws.com/${authStack.userPool.userPoolId}`,
      {
        authorizerName: "CognitoJWT",
        jwtAudience: [
          authStack.userPoolClient.userPoolClientId,
          authStack.cmsUserPoolClient.userPoolClientId,
        ],
        identitySource: ["$request.header.Authorization"],
      }
    );

    // -----------------------------------------------------------------------
    // Lambda integrations
    // -----------------------------------------------------------------------
    const charactersIntegration = new apigwv2Integrations.HttpLambdaIntegration(
      "CharactersIntegration",
      charactersHandler
    );
    const gamedataIntegration = new apigwv2Integrations.HttpLambdaIntegration(
      "GameDataIntegration",
      gamedataHandler
    );
    const mediaIntegration = new apigwv2Integrations.HttpLambdaIntegration(
      "MediaIntegration",
      mediaHandler
    );
    const usersIntegration = new apigwv2Integrations.HttpLambdaIntegration(
      "UsersIntegration",
      usersHandler
    );
    const authAdminIntegration = new apigwv2Integrations.HttpLambdaIntegration(
      "AuthAdminIntegration",
      authAdminHandler
    );
    const complianceIntegration = new apigwv2Integrations.HttpLambdaIntegration(
      "ComplianceIntegration",
      complianceHandler
    );
    const ingestionAdminIntegration =
      new apigwv2Integrations.HttpLambdaIntegration(
        "IngestionAdminIntegration",
        ingestionAdminHandler
      );
    const cmsIntegration = new apigwv2Integrations.HttpLambdaIntegration(
      "CmsIntegration",
      cmsHandler
    );

    // -----------------------------------------------------------------------
    // Routes — PUBLIC (no auth required)
    // Game reference data is read-only and benefits from public cacheability.
    // -----------------------------------------------------------------------
    const publicRoutes: Array<{
      method: apigwv2.HttpMethod;
      path: string;
    }> = [
      // Classes
      { method: apigwv2.HttpMethod.GET, path: "/classes" },
      { method: apigwv2.HttpMethod.GET, path: "/classes/{classId}" },
      { method: apigwv2.HttpMethod.GET, path: "/classes/{classId}/subclasses" },
      { method: apigwv2.HttpMethod.GET, path: "/classes/{classId}/subclasses/{subclassId}" },
      // Communities
      { method: apigwv2.HttpMethod.GET, path: "/communities" },
      { method: apigwv2.HttpMethod.GET, path: "/communities/{communityId}" },
      // Ancestries
      { method: apigwv2.HttpMethod.GET, path: "/ancestries" },
      { method: apigwv2.HttpMethod.GET, path: "/ancestries/{ancestryId}" },
      // Domains & Cards
      { method: apigwv2.HttpMethod.GET, path: "/domains" },
      { method: apigwv2.HttpMethod.GET, path: "/domains/{domain}" },
      { method: apigwv2.HttpMethod.GET, path: "/domains/{domain}/cards" },
      { method: apigwv2.HttpMethod.GET, path: "/domains/{domain}/cards/{cardId}" },
      // Rules & Definitions
      { method: apigwv2.HttpMethod.GET, path: "/rules" },
      { method: apigwv2.HttpMethod.GET, path: "/rules/{ruleId}" },
    ];

    for (const route of publicRoutes) {
      this.httpApi.addRoutes({
        path: route.path,
        methods: [route.method],
        integration: gamedataIntegration,
        // No authorizer — public
      });
    }

    // Shared character view — public but served by the characters lambda
    // (token verification is handled inside the handler, not by API GW)
    this.httpApi.addRoutes({
      path: "/characters/{characterId}/view",
      methods: [apigwv2.HttpMethod.GET],
      integration: charactersIntegration,
      // No JWT authorizer — share token validated in-handler
    });

    // CMS public route — active items (read-only, no auth required)
    this.httpApi.addRoutes({
      path: "/cms/{type}",
      methods: [apigwv2.HttpMethod.GET],
      integration: cmsIntegration,
      // No JWT authorizer — public read
    });

    // -----------------------------------------------------------------------
    // Routes — PROTECTED (JWT required)
    // -----------------------------------------------------------------------

    // Characters — full CRUD + admin roster
    const characterRoutes: Array<{
      method: apigwv2.HttpMethod;
      path: string;
    }> = [
      // Admin — all characters (admin group only, enforced in handler)
      { method: apigwv2.HttpMethod.GET, path: "/admin/characters" },
      { method: apigwv2.HttpMethod.GET, path: "/characters" },
      { method: apigwv2.HttpMethod.POST, path: "/characters" },
      { method: apigwv2.HttpMethod.GET, path: "/characters/{characterId}" },
      { method: apigwv2.HttpMethod.PUT, path: "/characters/{characterId}" },
      { method: apigwv2.HttpMethod.PATCH, path: "/characters/{characterId}" },
      { method: apigwv2.HttpMethod.DELETE, path: "/characters/{characterId}" },
      { method: apigwv2.HttpMethod.POST, path: "/characters/{characterId}/rest" },
      { method: apigwv2.HttpMethod.GET, path: "/characters/{characterId}/share" },
      // Portrait image upload — returns a presigned S3 PUT URL
      { method: apigwv2.HttpMethod.POST, path: "/characters/{characterId}/portrait-upload-url" },
      // Level-up wizard
      { method: apigwv2.HttpMethod.POST, path: "/characters/{characterId}/levelup" },
      // Downtime projects
      { method: apigwv2.HttpMethod.POST, path: "/characters/{characterId}/projects" },
      { method: apigwv2.HttpMethod.PATCH, path: "/characters/{characterId}/projects/{projectId}" },
      { method: apigwv2.HttpMethod.DELETE, path: "/characters/{characterId}/projects/{projectId}" },
      // Actions (in-session)
      { method: apigwv2.HttpMethod.POST, path: "/characters/{characterId}/actions" },
    ];

    for (const route of characterRoutes) {
      this.httpApi.addRoutes({
        path: route.path,
        methods: [route.method],
        integration: charactersIntegration,
        authorizer: jwtAuthorizer,
      });
    }

    // Media — pre-signed URL management
    const mediaRoutes: Array<{
      method: apigwv2.HttpMethod;
      path: string;
    }> = [
      { method: apigwv2.HttpMethod.GET, path: "/media" },
      { method: apigwv2.HttpMethod.POST, path: "/media/presign" },
      { method: apigwv2.HttpMethod.GET, path: "/media/{mediaId}" },
      { method: apigwv2.HttpMethod.DELETE, path: "/media/{mediaId}" },
    ];

    for (const route of mediaRoutes) {
      this.httpApi.addRoutes({
        path: route.path,
        methods: [route.method],
        integration: mediaIntegration,
        authorizer: jwtAuthorizer,
      });
    }

    // Users — profile management
    const userRoutes: Array<{
      method: apigwv2.HttpMethod;
      path: string;
    }> = [
      { method: apigwv2.HttpMethod.GET, path: "/users/me" },
      { method: apigwv2.HttpMethod.PUT, path: "/users/me" },
      { method: apigwv2.HttpMethod.PATCH, path: "/users/me" },
      { method: apigwv2.HttpMethod.DELETE, path: "/users/me" },
    ];

    for (const route of userRoutes) {
      this.httpApi.addRoutes({
        path: route.path,
        methods: [route.method],
        integration: usersIntegration,
        authorizer: jwtAuthorizer,
      });
    }

    // Auth Admin — Cognito user management (admin group only, enforced in handler)
    const authAdminRoutes: Array<{
      method: apigwv2.HttpMethod;
      path: string;
    }> = [
      { method: apigwv2.HttpMethod.GET, path: "/admin/auth/users" },
      { method: apigwv2.HttpMethod.GET, path: "/admin/auth/users/{userId}" },
      {
        method: apigwv2.HttpMethod.POST,
        path: "/admin/auth/users/{userId}/confirm",
      },
      {
        method: apigwv2.HttpMethod.POST,
        path: "/admin/auth/users/{userId}/reset-password",
      },
      {
        method: apigwv2.HttpMethod.DELETE,
        path: "/admin/auth/users/{userId}",
      },
    ];

    for (const route of authAdminRoutes) {
      this.httpApi.addRoutes({
        path: route.path,
        methods: [route.method],
        integration: authAdminIntegration,
        authorizer: jwtAuthorizer,
      });
    }

    // Compliance — GDPR/CCPA self-service (caller acts on own account)
    const complianceRoutes: Array<{
      method: apigwv2.HttpMethod;
      path: string;
    }> = [
      { method: apigwv2.HttpMethod.GET, path: "/compliance/export" },
      { method: apigwv2.HttpMethod.DELETE, path: "/compliance/account" },
    ];

    for (const route of complianceRoutes) {
      this.httpApi.addRoutes({
        path: route.path,
        methods: [route.method],
        integration: complianceIntegration,
        authorizer: jwtAuthorizer,
      });
    }

    // Ingestion Admin — game-data re-ingestion trigger (admin group only)
    const ingestionAdminRoutes: Array<{
      method: apigwv2.HttpMethod;
      path: string;
    }> = [
      { method: apigwv2.HttpMethod.POST, path: "/admin/ingestion/trigger" },
      { method: apigwv2.HttpMethod.GET, path: "/admin/ingestion/jobs" },
      { method: apigwv2.HttpMethod.GET, path: "/admin/ingestion/jobs/{jobId}" },
    ];

    for (const route of ingestionAdminRoutes) {
      this.httpApi.addRoutes({
        path: route.path,
        methods: [route.method],
        integration: ingestionAdminIntegration,
        authorizer: jwtAuthorizer,
      });
    }

    // CMS Admin — protected content management
    const cmsAdminRoutes: Array<{
      method: apigwv2.HttpMethod;
      path: string;
    }> = [
      { method: apigwv2.HttpMethod.POST, path: "/cms/presign" },
      { method: apigwv2.HttpMethod.GET, path: "/cms/{type}/all" },
      { method: apigwv2.HttpMethod.POST, path: "/cms/{type}" },
      { method: apigwv2.HttpMethod.PUT, path: "/cms/{type}/{id}" },
      { method: apigwv2.HttpMethod.DELETE, path: "/cms/{type}/{id}" },
      { method: apigwv2.HttpMethod.POST, path: "/cms/{type}/{id}/activate" },
      { method: apigwv2.HttpMethod.POST, path: "/cms/{type}/{id}/deactivate" },
    ];

    for (const route of cmsAdminRoutes) {
      this.httpApi.addRoutes({
        path: route.path,
        methods: [route.method],
        integration: cmsIntegration,
        authorizer: jwtAuthorizer,
      });
    }

    this.apiUrl = `${this.httpApi.apiEndpoint}/${stage}`;

    // -----------------------------------------------------------------------
    // CloudFormation Outputs
    // -----------------------------------------------------------------------
    new cdk.CfnOutput(this, "ApiUrl", {
      exportName: `DaggerheartApiUrl-${stage}`,
      value: this.apiUrl,
      description: "HTTP API Gateway base URL",
    });

    new cdk.CfnOutput(this, "ApiId", {
      exportName: `DaggerheartApiId-${stage}`,
      value: this.httpApi.apiId,
      description: "HTTP API Gateway ID",
    });

    new cdk.CfnOutput(this, "CharactersHandlerArn", {
      exportName: `DaggerheartCharactersHandlerArn-${stage}`,
      value: charactersHandler.functionArn,
    });

    new cdk.CfnOutput(this, "GameDataHandlerArn", {
      exportName: `DaggerheartGameDataHandlerArn-${stage}`,
      value: gamedataHandler.functionArn,
    });

    new cdk.CfnOutput(this, "MediaHandlerArn", {
      exportName: `DaggerheartMediaHandlerArn-${stage}`,
      value: mediaHandler.functionArn,
    });

    new cdk.CfnOutput(this, "UsersHandlerArn", {
      exportName: `DaggerheartUsersHandlerArn-${stage}`,
      value: usersHandler.functionArn,
    });

    new cdk.CfnOutput(this, "AuthAdminHandlerArn", {
      exportName: `DaggerheartAuthAdminHandlerArn-${stage}`,
      value: authAdminHandler.functionArn,
    });

    new cdk.CfnOutput(this, "ComplianceHandlerArn", {
      exportName: `DaggerheartComplianceHandlerArn-${stage}`,
      value: complianceHandler.functionArn,
    });

    new cdk.CfnOutput(this, "IngestionAdminHandlerArn", {
      exportName: `DaggerheartIngestionAdminHandlerArn-${stage}`,
      value: ingestionAdminHandler.functionArn,
    });

    new cdk.CfnOutput(this, "IngestionJobsTableName", {
      exportName: `DaggerheartIngestionJobsTableName-${stage}`,
      value: ingestionJobsTable.tableName,
    });

    new cdk.CfnOutput(this, "CmsHandlerArn", {
      exportName: `DaggerheartCmsHandlerArn-${stage}`,
      value: cmsHandler.functionArn,
    });
  }
}
