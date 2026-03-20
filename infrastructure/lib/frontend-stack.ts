import * as cdk from "aws-cdk-lib";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";
import * as s3deploy from "aws-cdk-lib/aws-s3-deployment";
import * as iam from "aws-cdk-lib/aws-iam";
import * as logs from "aws-cdk-lib/aws-logs";
import { Construct } from "constructs";
import { ApiStack } from "./api-stack";

export interface FrontendStackProps extends cdk.StackProps {
  stage: string;
  apiStack: ApiStack;
}

/**
 * FrontendStack — Static hosting for the Next.js App Router frontend.
 *
 * DEPLOYMENT STRATEGY NOTE:
 * ─────────────────────────
 * Next.js 14 App Router with Server Components (RSC) and SSR requires a
 * Node.js runtime, which is NOT compatible with pure S3 + CloudFront static
 * hosting.
 *
 * Recommended production path: **AWS Amplify Hosting**
 *   - Supports Next.js SSR natively via managed compute
 *   - Git-connected CI/CD (push-to-deploy from GitHub)
 *   - Built-in preview branches per PR
 *   - `amplify.yml` controls build steps
 *
 * MVP / Static-export path (this stack):
 *   - Add `output: "export"` to next.config.js
 *   - Run `next build` → produces `out/` directory
 *   - Deploy `out/` to this S3 bucket via `aws s3 sync` or BucketDeployment
 *   - Trade-off: no SSR; all pages are pre-rendered at build time
 *
 * To migrate to Amplify Hosting, replace this stack with an
 * `aws-amplify` L1 Cfn resource or use the Amplify CLI outside CDK.
 */
export class FrontendStack extends cdk.Stack {
  public readonly frontendBucket: s3.Bucket;
  public readonly distribution: cloudfront.Distribution;

  constructor(scope: Construct, id: string, props: FrontendStackProps) {
    super(scope, id, props);

    const { stage, apiStack } = props;
    const isProd = stage === "prod";

    // -----------------------------------------------------------------------
    // S3 Bucket — stores the Next.js static export (`out/` directory)
    // Never publicly accessible; served exclusively through CloudFront.
    // -----------------------------------------------------------------------
    this.frontendBucket = new s3.Bucket(this, "FrontendBucket", {
      bucketName: `daggerheart-frontend-${stage}-${this.account}`,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      publicReadAccess: false,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      versioned: isProd,
      removalPolicy: isProd ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: !isProd,
    });

    // -----------------------------------------------------------------------
    // CloudFront Response Headers Policy
    // Applies security headers to every response.
    // -----------------------------------------------------------------------
    const responseHeadersPolicy = new cloudfront.ResponseHeadersPolicy(
      this,
      "SecurityHeadersPolicy",
      {
        responseHeadersPolicyName: `daggerheart-security-headers-${stage}`,
        securityHeadersBehavior: {
          contentTypeOptions: { override: true },
          frameOptions: {
            frameOption: cloudfront.HeadersFrameOption.DENY,
            override: true,
          },
          referrerPolicy: {
            referrerPolicy:
              cloudfront.HeadersReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN,
            override: true,
          },
          strictTransportSecurity: {
            accessControlMaxAge: cdk.Duration.days(365),
            includeSubdomains: true,
            preload: true,
            override: true,
          },
          xssProtection: {
            protection: true,
            modeBlock: true,
            override: true,
          },
        },
        customHeadersBehavior: {
          customHeaders: [
            {
              header: "Permissions-Policy",
              value: "camera=(), microphone=(), geolocation=()",
              override: true,
            },
          ],
        },
      }
    );

    // -----------------------------------------------------------------------
    // CloudFront Distribution
    // -----------------------------------------------------------------------
    this.distribution = new cloudfront.Distribution(
      this,
      "FrontendDistribution",
      {
        comment: `Daggerheart frontend — ${stage}`,

        defaultBehavior: {
          origin: origins.S3BucketOrigin.withOriginAccessControl(
            this.frontendBucket,
            {
              originAccessLevels: [cloudfront.AccessLevel.READ],
            }
          ),
          viewerProtocolPolicy:
            cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
          responseHeadersPolicy,
          compress: true,
          allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
          cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD_OPTIONS,
        },

        // Additional cache behavior for static assets — long TTL
        additionalBehaviors: {
          "/_next/static/*": {
            origin: origins.S3BucketOrigin.withOriginAccessControl(
              this.frontendBucket,
              {
                originAccessLevels: [cloudfront.AccessLevel.READ],
              }
            ),
            viewerProtocolPolicy:
              cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
            // Immutable static assets can be cached for 1 year
            cachePolicy: new cloudfront.CachePolicy(
              this,
              "StaticAssetsCachePolicy",
              {
                cachePolicyName: `daggerheart-static-assets-${stage}`,
                defaultTtl: cdk.Duration.days(365),
                maxTtl: cdk.Duration.days(365),
                minTtl: cdk.Duration.days(365),
                enableAcceptEncodingGzip: true,
                enableAcceptEncodingBrotli: true,
              }
            ),
            compress: true,
          },
        },

        // SPA routing: return index.html for all 403/404s so Next.js
        // client-side router handles the path.
        errorResponses: [
          {
            httpStatus: 403,
            responseHttpStatus: 200,
            responsePagePath: "/index.html",
            ttl: cdk.Duration.seconds(0),
          },
          {
            httpStatus: 404,
            responseHttpStatus: 200,
            responsePagePath: "/index.html",
            ttl: cdk.Duration.seconds(0),
          },
        ],

        defaultRootObject: "index.html",

        priceClass: cloudfront.PriceClass.PRICE_CLASS_100,
        minimumProtocolVersion:
          cloudfront.SecurityPolicyProtocol.TLS_V1_2_2021,

        // Access logging in prod
        ...(isProd && {
          enableLogging: true,
          logBucket: new s3.Bucket(this, "FrontendCdnLogBucket", {
            bucketName: `daggerheart-frontend-cdn-logs-${stage}-${this.account}`,
            blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
            encryption: s3.BucketEncryption.S3_MANAGED,
            enforceSSL: true,
            lifecycleRules: [
              {
                id: "ExpireLogs",
                enabled: true,
                expiration: cdk.Duration.days(90),
              },
            ],
            removalPolicy: cdk.RemovalPolicy.RETAIN,
          }),
          logFilePrefix: "cloudfront-access-logs/",
        }),
      }
    );

    // Grant CloudFront read access to the frontend bucket
    this.frontendBucket.addToResourcePolicy(
      new iam.PolicyStatement({
        sid: "AllowCloudFrontFrontendAccess",
        effect: iam.Effect.ALLOW,
        principals: [new iam.ServicePrincipal("cloudfront.amazonaws.com")],
        actions: ["s3:GetObject"],
        resources: [this.frontendBucket.arnForObjects("*")],
        conditions: {
          StringEquals: {
            "AWS:SourceArn": `arn:aws:cloudfront::${this.account}:distribution/${this.distribution.distributionId}`,
          },
        },
      })
    );

    // -----------------------------------------------------------------------
    // Placeholder BucketDeployment — deploys the built static export.
    // In CI/CD, replace this with `aws s3 sync out/ s3://<bucket>` followed
    // by a CloudFront invalidation, which is faster than BucketDeployment for
    // large Next.js builds.
    //
    // NOTE: The source path `../frontend/out` must exist after `next build`
    // with `output: "export"` in next.config.js. CDK will fail at synth time
    // if the directory is absent; comment out during initial bootstrapping.
    // -----------------------------------------------------------------------
    // new s3deploy.BucketDeployment(this, "DeployFrontend", {
    //   sources: [s3deploy.Source.asset("../frontend/out")],
    //   destinationBucket: this.frontendBucket,
    //   distribution: this.distribution,
    //   distributionPaths: ["/*"],
    //   memoryLimit: 1024,
    //   prune: true,
    // });

    // -----------------------------------------------------------------------
    // CloudFormation Outputs
    // -----------------------------------------------------------------------
    new cdk.CfnOutput(this, "FrontendBucketName", {
      exportName: `DaggerheartFrontendBucketName-${stage}`,
      value: this.frontendBucket.bucketName,
      description: "S3 bucket holding the Next.js static export",
    });

    new cdk.CfnOutput(this, "FrontendDistributionId", {
      exportName: `DaggerheartFrontendDistributionId-${stage}`,
      value: this.distribution.distributionId,
      description: "CloudFront distribution ID for frontend",
    });

    new cdk.CfnOutput(this, "FrontendDomainName", {
      exportName: `DaggerheartFrontendDomain-${stage}`,
      value: this.distribution.distributionDomainName,
      description:
        "CloudFront domain for the frontend (add CNAME from your custom domain)",
    });

    new cdk.CfnOutput(this, "ApiUrlForFrontend", {
      exportName: `DaggerheartFrontendApiUrl-${stage}`,
      value: apiStack.apiUrl,
      description: "API Gateway URL — set as NEXT_PUBLIC_API_URL in build env",
    });

    new cdk.CfnOutput(this, "AmplifyHostingNote", {
      value:
        "For SSR support, migrate to AWS Amplify Hosting and set `output: 'export'` can be removed from next.config.js",
      description:
        "Reminder: this stack is MVP static export only. Use Amplify Hosting for full SSR.",
    });
  }
}
