import * as cdk from "aws-cdk-lib";
import * as cognito from "aws-cdk-lib/aws-cognito";
import { Construct } from "constructs";

export interface AuthStackProps extends cdk.StackProps {
  stage: string;
}

export class AuthStack extends cdk.Stack {
  public readonly userPool: cognito.UserPool;
  public readonly userPoolClient: cognito.UserPoolClient;
  public readonly cmsUserPoolClient: cognito.UserPoolClient;

  /** Cognito User Pool ID, exposed for cross-stack referencing */
  public readonly userPoolId: string;
  /** Cognito User Pool Client ID, exposed for cross-stack referencing */
  public readonly userPoolClientId: string;
  /** Cognito App Client ID for the CMS (Google SSO only) */
  public readonly cmsUserPoolClientId: string;

  constructor(scope: Construct, id: string, props: AuthStackProps) {
    super(scope, id, props);

    const { stage } = props;
    const isProd = stage === "prod";

    // -----------------------------------------------------------------------
    // Cognito User Pool
    // -----------------------------------------------------------------------
    this.userPool = new cognito.UserPool(this, "UserPool", {
      userPoolName: `daggerheart-users-${stage}`,

      // Self-service registration
      selfSignUpEnabled: true,

      // Sign-in options
      signInAliases: {
        email: true,
        username: false,
      },
      signInCaseSensitive: false,

      // Standard attributes
      standardAttributes: {
        email: {
          required: true,
          mutable: true,
        },
        fullname: {
          required: false,
          mutable: true,
        },
      },

      // Custom attributes — max 25; custom: prefix is applied automatically by CDK
      customAttributes: {
        displayName: new cognito.StringAttribute({
          minLen: 1,
          maxLen: 64,
          mutable: true,
        }),
        avatarKey: new cognito.StringAttribute({
          minLen: 0,
          maxLen: 512,
          mutable: true,
        }),
      },

      // Password policy (production-grade)
      passwordPolicy: {
        minLength: 12,
        requireUppercase: true,
        requireLowercase: true,
        requireDigits: true,
        requireSymbols: true,
        tempPasswordValidity: cdk.Duration.days(3),
      },

      // MFA — OPTIONAL lets users choose to enable TOTP
      mfa: cognito.Mfa.OPTIONAL,
      mfaSecondFactor: {
        sms: false,
        otp: true, // TOTP via authenticator app
      },

      // Account recovery via email only (no SMS dependency)
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,

      // Auto-verify email; require email verification before sign-in
      autoVerify: { email: true },
      userVerification: {
        emailSubject: "Verify your Daggerheart account",
        emailBody:
          "Welcome to Daggerheart Character Platform! Your verification code is {####}",
        emailStyle: cognito.VerificationEmailStyle.CODE,
      },

      // Email configuration — uses Cognito default sender for non-prod;
      // replace with SES configuration set for production send-from domain.
      email: cognito.UserPoolEmail.withCognito(),

      // Deletion protection: RETAIN in prod, DESTROY in dev/staging
      removalPolicy: isProd
        ? cdk.RemovalPolicy.RETAIN
        : cdk.RemovalPolicy.DESTROY,

      deletionProtection: isProd,
    });

    // -----------------------------------------------------------------------
    // Cognito User Pool Client (SPA — no client secret)
    // -----------------------------------------------------------------------
    this.userPoolClient = new cognito.UserPoolClient(this, "UserPoolClient", {
      userPool: this.userPool,
      userPoolClientName: `daggerheart-spa-client-${stage}`,

      // Never generate a secret for public SPA clients
      generateSecret: false,

      // Auth flows supported
      authFlows: {
        userSrp: true, // SRP (Secure Remote Password) — primary flow
        // refreshToken is always enabled implicitly when any other flow is
        // enabled. The CDK AuthFlow type does not expose it as a property.
      },

      // Token validity windows
      accessTokenValidity: cdk.Duration.hours(1),
      idTokenValidity: cdk.Duration.hours(1),
      refreshTokenValidity: cdk.Duration.days(30),

      // Prevent enumeration attacks
      preventUserExistenceErrors: true,

      // OAuth 2.0 / OIDC (configure callback URLs per environment)
      oAuth: {
        flows: {
          authorizationCodeGrant: true,
          implicitCodeGrant: false,
        },
        scopes: [
          cognito.OAuthScope.EMAIL,
          cognito.OAuthScope.OPENID,
          cognito.OAuthScope.PROFILE,
        ],
        callbackUrls: isProd
          ? ["https://app.daggerheart.example.com/auth/callback"]
          : [
              "http://localhost:3000/auth/callback",
              `https://${stage}.daggerheart.example.com/auth/callback`,
            ],
        logoutUrls: isProd
          ? ["https://app.daggerheart.example.com/auth/logout"]
          : [
              "http://localhost:3000/auth/logout",
              `https://${stage}.daggerheart.example.com/auth/logout`,
            ],
      },

      // Only read/write the attributes this client actually needs
      readAttributes: new cognito.ClientAttributes()
        .withStandardAttributes({ email: true, fullname: true })
        .withCustomAttributes("displayName", "avatarKey"),

      writeAttributes: new cognito.ClientAttributes()
        .withStandardAttributes({ email: true, fullname: true })
        .withCustomAttributes("displayName", "avatarKey"),
    });

    this.userPoolId = this.userPool.userPoolId;
    this.userPoolClientId = this.userPoolClient.userPoolClientId;

    // -----------------------------------------------------------------------
    // Google Identity Provider
    // -----------------------------------------------------------------------
    const googleIdp = new cognito.UserPoolIdentityProviderGoogle(this, "GoogleIdp", {
      userPool: this.userPool,
      clientId: "REDACTED_GOOGLE_CLIENT_ID",
      clientSecretValue: cdk.SecretValue.unsafePlainText(
        "REDACTED_GOOGLE_CLIENT_SECRET"
      ),
      scopes: ["email", "profile", "openid"],
      attributeMapping: {
        email: cognito.ProviderAttribute.GOOGLE_EMAIL,
        fullname: cognito.ProviderAttribute.GOOGLE_NAME,
      },
    });

    // -----------------------------------------------------------------------
    // Cognito Hosted UI Domain
    // -----------------------------------------------------------------------
    const hostedDomain = new cognito.UserPoolDomain(this, "HostedDomain", {
      userPool: this.userPool,
      cognitoDomain: {
        domainPrefix: `daggerheart-${stage}`,
      },
    });

    // -----------------------------------------------------------------------
    // CMS App Client (Google SSO only — no password auth)
    // -----------------------------------------------------------------------
    this.cmsUserPoolClient = new cognito.UserPoolClient(this, "CmsUserPoolClient", {
      userPool: this.userPool,
      userPoolClientName: `daggerheart-cms-client-${stage}`,
      generateSecret: false,
      supportedIdentityProviders: [
        cognito.UserPoolClientIdentityProvider.GOOGLE,
      ],
      authFlows: {},
      accessTokenValidity: cdk.Duration.hours(1),
      idTokenValidity: cdk.Duration.hours(1),
      refreshTokenValidity: cdk.Duration.days(1),
      preventUserExistenceErrors: true,
      oAuth: {
        flows: {
          authorizationCodeGrant: true,
        },
        scopes: [
          cognito.OAuthScope.EMAIL,
          cognito.OAuthScope.OPENID,
          cognito.OAuthScope.PROFILE,
        ],
        callbackUrls: isProd
          ? ["https://cms.daggerheart.example.com/auth/callback"]
          : [
              "http://localhost:3001/auth/callback",
            ],
        logoutUrls: isProd
          ? ["https://cms.daggerheart.example.com/auth/logout"]
          : [
              "http://localhost:3001/",
            ],
      },
    });
    // Ensure the IdP is created before the client that references it
    this.cmsUserPoolClient.node.addDependency(googleIdp);

    this.cmsUserPoolClientId = this.cmsUserPoolClient.userPoolClientId;

    // -----------------------------------------------------------------------
    // CloudFormation Outputs
    // -----------------------------------------------------------------------
    new cdk.CfnOutput(this, "UserPoolIdOutput", {
      exportName: `DaggerheartUserPoolId-${stage}`,
      value: this.userPool.userPoolId,
      description: "Cognito User Pool ID",
    });

    new cdk.CfnOutput(this, "UserPoolClientIdOutput", {
      exportName: `DaggerheartUserPoolClientId-${stage}`,
      value: this.userPoolClient.userPoolClientId,
      description: "Cognito User Pool Client ID (SPA, no secret)",
    });

    new cdk.CfnOutput(this, "UserPoolArnOutput", {
      exportName: `DaggerheartUserPoolArn-${stage}`,
      value: this.userPool.userPoolArn,
      description: "Cognito User Pool ARN",
    });

    new cdk.CfnOutput(this, "CognitoIssuerUrl", {
      exportName: `DaggerheartCognitoIssuer-${stage}`,
      value: `https://cognito-idp.${this.region}.amazonaws.com/${this.userPool.userPoolId}`,
      description: "JWT issuer URL for API Gateway JWT Authorizer",
    });

    new cdk.CfnOutput(this, "CmsUserPoolClientIdOutput", {
      exportName: `DaggerheartCmsUserPoolClientId-${stage}`,
      value: this.cmsUserPoolClient.userPoolClientId,
      description: "Cognito App Client ID for the CMS (Google SSO only)",
    });

    new cdk.CfnOutput(this, "CognitoHostedDomain", {
      exportName: `DaggerheartCognitoHostedDomain-${stage}`,
      value: `daggerheart-${stage}.auth.${this.region}.amazoncognito.com`,
      description: "Cognito Hosted UI domain for OAuth redirects",
    });
  }
}
