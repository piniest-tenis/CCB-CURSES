import * as cdk from "aws-cdk-lib";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";
import * as iam from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";

export interface StorageStackProps extends cdk.StackProps {
  stage: string;
}

export class StorageStack extends cdk.Stack {
  public readonly mediaBucket: s3.Bucket;
  public readonly cdnDistribution: cloudfront.Distribution;

  constructor(scope: Construct, id: string, props: StorageStackProps) {
    super(scope, id, props);

    const { stage } = props;
    const isProd = stage === "prod";

    // -----------------------------------------------------------------------
    // Media S3 Bucket
    // -----------------------------------------------------------------------
    this.mediaBucket = new s3.Bucket(this, "MediaBucket", {
      bucketName: `daggerheart-media-${stage}-${this.account}`,

      // Never allow public access — all content served via CloudFront OAC
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      publicReadAccess: false,

      // Encryption at rest
      encryption: s3.BucketEncryption.S3_MANAGED,

      // Enforce HTTPS-only access
      enforceSSL: true,

      // Versioning — enabled in prod for accidental-delete recovery
      versioned: isProd,

      // CORS — allow pre-signed URL PUT/GET from frontend origins.
      // Covers all object prefixes in the bucket, including:
      //   media/     — generic user media (user avatars, CMS images)
      //   portraits/ — character portrait images (direct browser PUT via presigned URL)
      //   cms/       — CMS asset uploads
      cors: [
        {
          allowedMethods: [
            s3.HttpMethods.GET,
            s3.HttpMethods.PUT,
            s3.HttpMethods.HEAD,
          ],
          // Tightened per environment: restrict to known domain in prod
          allowedOrigins: isProd
            ? ["https://curses-ccb.maninjumpsuit.com"]
            : ["*"],
          allowedHeaders: ["*"],
          exposedHeaders: ["ETag"],
          maxAge: 3000,
        },
      ],

      // Lifecycle rules
      lifecycleRules: [
        {
          // Clean up incomplete multipart uploads promptly to avoid storage waste
          id: "AbortIncompleteMultipartUploads",
          enabled: true,
          abortIncompleteMultipartUploadAfter: cdk.Duration.days(1),
        },
        {
          // Transition non-current versions to cheaper storage in prod
          id: "NoncurrentVersionTransition",
          enabled: isProd,
          noncurrentVersionTransitions: [
            {
              storageClass: s3.StorageClass.INFREQUENT_ACCESS,
              transitionAfter: cdk.Duration.days(30),
            },
          ],
          noncurrentVersionExpiration: cdk.Duration.days(90),
        },
        {
          // Expire superseded portrait images after 180 days so storage
          // doesn't accumulate when users replace their portrait.
          // Only active in prod where versioning is enabled.
          id: "ExpireOldPortraitVersions",
          enabled: isProd,
          prefix: "portraits/",
          noncurrentVersionExpiration: cdk.Duration.days(180),
        },
      ],

      removalPolicy: isProd ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: !isProd, // Only auto-delete in non-prod
    });

    // -----------------------------------------------------------------------
    // CloudFront Origin Access Control (OAC)
    // OAC is the modern replacement for OAI; uses SigV4 for bucket requests.
    // -----------------------------------------------------------------------
    const oac = new cloudfront.CfnOriginAccessControl(this, "MediaBucketOAC", {
      originAccessControlConfig: {
        name: `daggerheart-media-oac-${stage}`,
        description: "OAC for Daggerheart media bucket",
        originAccessControlOriginType: "s3",
        signingBehavior: "always",
        signingProtocol: "sigv4",
      },
    });

    // -----------------------------------------------------------------------
    // CloudFront Distribution
    // -----------------------------------------------------------------------
    this.cdnDistribution = new cloudfront.Distribution(
      this,
      "MediaDistribution",
      {
        comment: `Daggerheart media CDN — ${stage}`,

        // Serve assets from the media bucket
        defaultBehavior: {
          // S3BucketOrigin with OAC support (CDK L2 for OAC)
          origin: origins.S3BucketOrigin.withOriginAccessControl(
            this.mediaBucket,
            {
              originAccessLevels: [
                cloudfront.AccessLevel.READ,
              ],
            }
          ),
          viewerProtocolPolicy:
            cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
          compress: true,
          allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD,
          cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD,
        },

        // PriceClass 100 — NA + Europe only (cheapest, covers primary users)
        priceClass: cloudfront.PriceClass.PRICE_CLASS_100,

        // HTTPS only; AWS-managed TLS certificate via ACM
        minimumProtocolVersion: cloudfront.SecurityPolicyProtocol.TLS_V1_2_2021,

        // Enable access logging in prod
        ...(isProd && {
          enableLogging: true,
          logBucket: new s3.Bucket(this, "CdnLogBucket", {
            bucketName: `daggerheart-cdn-logs-${stage}-${this.account}`,
            blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
            encryption: s3.BucketEncryption.S3_MANAGED,
            enforceSSL: true,
            // CloudFront access logging requires ACLs — BucketOwnerPreferred
            // is the minimum ownership setting that allows ACL grants.
            objectOwnership: s3.ObjectOwnership.BUCKET_OWNER_PREFERRED,
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

    // -----------------------------------------------------------------------
    // Grant CloudFront OAC permission to read from the bucket.
    // The L2 S3BucketOrigin.withOriginAccessControl handles the bucket policy
    // automatically; the explicit statement below is a belt-and-suspenders
    // guard for the Cfn-level OAC we also declared.
    // -----------------------------------------------------------------------
    this.mediaBucket.addToResourcePolicy(
      new iam.PolicyStatement({
        sid: "AllowCloudFrontServicePrincipal",
        effect: iam.Effect.ALLOW,
        principals: [new iam.ServicePrincipal("cloudfront.amazonaws.com")],
        actions: ["s3:GetObject"],
        resources: [this.mediaBucket.arnForObjects("*")],
        conditions: {
          StringEquals: {
            "AWS:SourceArn": `arn:aws:cloudfront::${this.account}:distribution/${this.cdnDistribution.distributionId}`,
          },
        },
      })
    );

    // -----------------------------------------------------------------------
    // CloudFormation Outputs
    // -----------------------------------------------------------------------
    new cdk.CfnOutput(this, "MediaBucketName", {
      exportName: `DaggerheartMediaBucketName-${stage}`,
      value: this.mediaBucket.bucketName,
      description: "S3 media bucket name",
    });

    new cdk.CfnOutput(this, "MediaBucketArn", {
      exportName: `DaggerheartMediaBucketArn-${stage}`,
      value: this.mediaBucket.bucketArn,
      description: "S3 media bucket ARN",
    });

    new cdk.CfnOutput(this, "CdnDomainName", {
      exportName: `DaggerheartCdnDomain-${stage}`,
      value: this.cdnDistribution.distributionDomainName,
      description: "CloudFront CDN domain name for media delivery",
    });

    new cdk.CfnOutput(this, "CdnDistributionId", {
      exportName: `DaggerheartCdnDistributionId-${stage}`,
      value: this.cdnDistribution.distributionId,
      description: "CloudFront distribution ID",
    });
  }
}
