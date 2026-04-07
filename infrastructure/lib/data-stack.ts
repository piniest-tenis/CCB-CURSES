import * as cdk from "aws-cdk-lib";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import { Construct } from "constructs";

export interface DataStackProps extends cdk.StackProps {
  stage: string;
}

export class DataStack extends cdk.Stack {
  // Expose table references for use by ApiStack IAM grants
  public readonly charactersTable: dynamodb.Table;
  public readonly classesTable: dynamodb.Table;
  public readonly gameDataTable: dynamodb.Table;
  public readonly domainCardsTable: dynamodb.Table;
  public readonly mediaTable: dynamodb.Table;
  public readonly usersTable: dynamodb.Table;
  public readonly cmsTable: dynamodb.Table;

  constructor(scope: Construct, id: string, props: DataStackProps) {
    super(scope, id, props);

    const { stage } = props;
    const isProd = stage === "prod";
    const removalPolicy = isProd
      ? cdk.RemovalPolicy.RETAIN
      : cdk.RemovalPolicy.DESTROY;

    // -----------------------------------------------------------------------
    // Point-in-time recovery for production only (extra cost in dev/staging)
    // -----------------------------------------------------------------------
    const pointInTimeRecoverySpecification = isProd
      ? { pointInTimeRecoveryEnabled: true }
      : undefined;

    // -----------------------------------------------------------------------
    // 1. Characters Table
    //    PK: userId (HASH)   SK: characterId (RANGE)
    //    GSI: characterId-index — direct lookup by characterId (share links)
    // -----------------------------------------------------------------------
    this.charactersTable = new dynamodb.Table(this, "CharactersTable", {
      tableName: `daggerheart-characters-${stage}`,
      partitionKey: { name: "PK", type: dynamodb.AttributeType.STRING }, // USER#{userId}
      sortKey: { name: "SK", type: dynamodb.AttributeType.STRING }, // CHARACTER#{characterId}
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      pointInTimeRecoverySpecification,
      removalPolicy,
      // Enable streams for future event-driven features (e.g., real-time sync)
      stream: dynamodb.StreamViewType.NEW_AND_OLD_IMAGES,
    });

    // GSI: query a character by its bare characterId (for shared sheet links)
    this.charactersTable.addGlobalSecondaryIndex({
      indexName: "characterId-index",
      partitionKey: {
        name: "characterId",
        type: dynamodb.AttributeType.STRING,
      },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // -----------------------------------------------------------------------
    // 2. Classes Table
    //    PK: CLASS#{classId} (HASH)   SK: METADATA | SUBCLASS#{subclassId} (RANGE)
    // -----------------------------------------------------------------------
    this.classesTable = new dynamodb.Table(this, "ClassesTable", {
      tableName: `daggerheart-classes-${stage}`,
      partitionKey: { name: "PK", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "SK", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      pointInTimeRecoverySpecification,
      removalPolicy,
    });

    // GSI: creator-index — query homebrew classes by creatorUserId
    this.classesTable.addGlobalSecondaryIndex({
      indexName: "creator-index",
      partitionKey: { name: "creatorUserId", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "updatedAt", type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // -----------------------------------------------------------------------
    // 3. GameData Table
    //    PK: COMMUNITY#{id} | ANCESTRY#{id} | RULE#{id}   SK: METADATA
    //    GSI: type-index — list all items of a given type
    // -----------------------------------------------------------------------
    this.gameDataTable = new dynamodb.Table(this, "GameDataTable", {
      tableName: `daggerheart-gamedata-${stage}`,
      partitionKey: { name: "PK", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "SK", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      pointInTimeRecoverySpecification,
      removalPolicy,
    });

    // GSI: query by entity type (community, ancestry, rule)
    this.gameDataTable.addGlobalSecondaryIndex({
      indexName: "type-index",
      partitionKey: { name: "type", type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // GSI: creator-index — query homebrew communities/ancestries by creatorUserId
    this.gameDataTable.addGlobalSecondaryIndex({
      indexName: "creator-index",
      partitionKey: { name: "creatorUserId", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "updatedAt", type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // -----------------------------------------------------------------------
    // 4. DomainCards Table
    //    PK: DOMAIN#{domainName} (HASH)   SK: CARD#{cardId} (RANGE)
    //    GSI: level-index — list cards in a domain ordered by level
    //    Note: level is a NUMBER attribute stored on the item; the GSI SK is
    //    declared as NUMBER so DynamoDB can sort numerically.
    // -----------------------------------------------------------------------
    this.domainCardsTable = new dynamodb.Table(this, "DomainCardsTable", {
      tableName: `daggerheart-domaincards-${stage}`,
      partitionKey: { name: "PK", type: dynamodb.AttributeType.STRING }, // DOMAIN#{domainName}
      sortKey: { name: "SK", type: dynamodb.AttributeType.STRING }, // CARD#{cardId}
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      pointInTimeRecoverySpecification,
      removalPolicy,
    });

    // GSI: PK=domain (STRING), SK=level (NUMBER) for ordered card retrieval
    this.domainCardsTable.addGlobalSecondaryIndex({
      indexName: "level-index",
      partitionKey: { name: "domain", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "level", type: dynamodb.AttributeType.NUMBER },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // GSI: creator-index — query homebrew domain cards by creatorUserId
    this.domainCardsTable.addGlobalSecondaryIndex({
      indexName: "creator-index",
      partitionKey: { name: "creatorUserId", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "updatedAt", type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // -----------------------------------------------------------------------
    // 5. Media Table
    //    PK: USER#{userId} (HASH)   SK: MEDIA#{mediaId} (RANGE)
    // -----------------------------------------------------------------------
    this.mediaTable = new dynamodb.Table(this, "MediaTable", {
      tableName: `daggerheart-media-${stage}`,
      partitionKey: { name: "PK", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "SK", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      pointInTimeRecoverySpecification,
      removalPolicy,
      // TTL field — media records can be expired automatically after content
      // deletion; set "ttl" attribute to a Unix epoch timestamp to schedule.
      timeToLiveAttribute: "ttl",
    });

    // -----------------------------------------------------------------------
    // 6. Users Table
    //    PK: USER#{userId} (HASH)   SK: PROFILE (RANGE)
    // -----------------------------------------------------------------------
    this.usersTable = new dynamodb.Table(this, "UsersTable", {
      tableName: `daggerheart-users-${stage}`,
      partitionKey: { name: "PK", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "SK", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      pointInTimeRecoverySpecification,
      removalPolicy,
    });

    // -----------------------------------------------------------------------
    // 7. CMS Table
    //    PK: CMS#{type} (HASH)   SK: ITEM#{id} (RANGE)
    //    e.g. PK="CMS#interstitial", SK="ITEM#<uuid>"
    // -----------------------------------------------------------------------
    this.cmsTable = new dynamodb.Table(this, "CmsTable", {
      tableName: `daggerheart-cms-${stage}`,
      partitionKey: { name: "PK", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "SK", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      pointInTimeRecoverySpecification,
      removalPolicy,
    });

    // -----------------------------------------------------------------------
    // CloudFormation Outputs — table names and ARNs
    // -----------------------------------------------------------------------
    const tables: Array<{ table: dynamodb.Table; name: string }> = [
      { table: this.charactersTable, name: "Characters" },
      { table: this.classesTable, name: "Classes" },
      { table: this.gameDataTable, name: "GameData" },
      { table: this.domainCardsTable, name: "DomainCards" },
      { table: this.mediaTable, name: "Media" },
      { table: this.usersTable, name: "Users" },
      { table: this.cmsTable, name: "Cms" },
    ];

    for (const { table, name } of tables) {
      new cdk.CfnOutput(this, `${name}TableName`, {
        exportName: `Daggerheart${name}TableName-${stage}`,
        value: table.tableName,
        description: `DynamoDB ${name} table name`,
      });

      new cdk.CfnOutput(this, `${name}TableArn`, {
        exportName: `Daggerheart${name}TableArn-${stage}`,
        value: table.tableArn,
        description: `DynamoDB ${name} table ARN`,
      });
    }
  }
}
