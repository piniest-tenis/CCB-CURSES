// backend/src/common/dynamodb.ts
// DynamoDB DocumentClient setup and typed helper wrappers.

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  UpdateCommand,
  DeleteCommand,
  QueryCommand,
  BatchWriteCommand,
  ScanCommand,
  type GetCommandInput,
  type PutCommandInput,
  type UpdateCommandInput,
  type UpdateCommandOutput,
  type DeleteCommandInput,
  type QueryCommandInput,
  type ScanCommandInput,
} from "@aws-sdk/lib-dynamodb";

// ─── Table Name Constants ─────────────────────────────────────────────────────

export const CHARACTERS_TABLE =
  process.env["CHARACTERS_TABLE"] ?? "DaggerheartCharacters";
export const CLASSES_TABLE =
  process.env["CLASSES_TABLE"] ?? "DaggerheartClasses";
export const GAME_DATA_TABLE =
  process.env["GAMEDATA_TABLE"] ?? process.env["GAME_DATA_TABLE"] ?? "DaggerheartGameData";
export const DOMAIN_CARDS_TABLE =
  process.env["DOMAINCARDS_TABLE"] ?? process.env["DOMAIN_CARDS_TABLE"] ?? "DaggerheartDomainCards";
export const MEDIA_TABLE = process.env["MEDIA_TABLE"] ?? "DaggerheartMedia";
export const USERS_TABLE = process.env["USERS_TABLE"] ?? "DaggerheartUsers";

export const CMS_TABLE =
  process.env["CMS_TABLE"] ?? "daggerheart-cms-dev";

export const CAMPAIGNS_TABLE =
  process.env["CAMPAIGNS_TABLE"] ?? "daggerheart-campaigns-dev";

export const CONNECTIONS_TABLE =
  process.env["CONNECTIONS_TABLE"] ?? "daggerheart-connections-dev";

export const FRAMES_TABLE =
  process.env["FRAMES_TABLE"] ?? "daggerheart-frames-dev";



const rawClient = new DynamoDBClient({
  region: process.env["DYNAMODB_REGION"] ?? process.env["AWS_REGION"] ?? "us-east-1",
});

export const docClient = DynamoDBDocumentClient.from(rawClient, {
  marshallOptions: {
    removeUndefinedValues: true,
    convertEmptyValues: false,
  },
  unmarshallOptions: {
    wrapNumbers: false,
  },
});

// ─── Typed Helpers ────────────────────────────────────────────────────────────

/**
 * Get a single item from DynamoDB.
 * Returns `null` if the item does not exist.
 */
export async function getItem<T>(
  tableName: string,
  key: Record<string, unknown>
): Promise<T | null>;
/**
 * Overload: accepts a full GetCommandInput object for backward compat.
 */
export async function getItem<T>(params: GetCommandInput): Promise<T | null>;
export async function getItem<T>(
  tableNameOrParams: string | GetCommandInput,
  key?: Record<string, unknown>
): Promise<T | null> {
  let params: GetCommandInput;
  if (typeof tableNameOrParams === "string") {
    params = { TableName: tableNameOrParams, Key: key! };
  } else {
    params = tableNameOrParams;
  }
  const result = await docClient.send(new GetCommand(params));
  return (result.Item as T) ?? null;
}

/**
 * Put (create or replace) a single item.
 */
export async function putItem(
  tableNameOrParams: string | PutCommandInput,
  item?: Record<string, unknown>,
  conditionExpression?: string
): Promise<void> {
  let params: PutCommandInput;
  if (typeof tableNameOrParams === "string") {
    params = {
      TableName: tableNameOrParams,
      Item: item!,
      ...(conditionExpression ? { ConditionExpression: conditionExpression } : {}),
    };
  } else {
    params = tableNameOrParams;
  }
  await docClient.send(new PutCommand(params));
}

/**
 * Update an existing item and return the updated attributes.
 */
export async function updateItem(
  tableNameOrParams: string | UpdateCommandInput,
  key?: Record<string, unknown>,
  updateExpression?: string,
  expressionAttributeValues?: Record<string, unknown>,
  expressionAttributeNames?: Record<string, string>,
  conditionExpression?: string
): Promise<UpdateCommandOutput> {
  let params: UpdateCommandInput;
  if (typeof tableNameOrParams === "string") {
    params = {
      TableName: tableNameOrParams,
      Key: key!,
      UpdateExpression: updateExpression!,
      ExpressionAttributeValues: expressionAttributeValues,
      ...(expressionAttributeNames
        ? { ExpressionAttributeNames: expressionAttributeNames }
        : {}),
      ...(conditionExpression
        ? { ConditionExpression: conditionExpression }
        : {}),
      ReturnValues: "ALL_NEW",
    };
  } else {
    params = tableNameOrParams;
  }
  return docClient.send(new UpdateCommand(params));
}

/**
 * Delete a single item.
 */
export async function deleteItem(
  tableNameOrParams: string | DeleteCommandInput,
  key?: Record<string, unknown>
): Promise<void> {
  let params: DeleteCommandInput;
  if (typeof tableNameOrParams === "string") {
    params = { TableName: tableNameOrParams, Key: key! };
  } else {
    params = tableNameOrParams;
  }
  await docClient.send(new DeleteCommand(params));
}

/**
 * Query DynamoDB with auto-pagination — returns all matching items.
 */
export async function queryItems<T>(
  tableNameOrParams: string | QueryCommandInput,
  keyConditionExpression?: string,
  expressionAttributeValues?: Record<string, unknown>,
  expressionAttributeNames?: Record<string, string>,
  indexName?: string,
  filterExpression?: string
): Promise<T[]> {
  let baseParams: QueryCommandInput;

  if (typeof tableNameOrParams === "string") {
    baseParams = {
      TableName: tableNameOrParams,
      KeyConditionExpression: keyConditionExpression!,
      ExpressionAttributeValues: expressionAttributeValues,
      ...(expressionAttributeNames
        ? { ExpressionAttributeNames: expressionAttributeNames }
        : {}),
      ...(indexName ? { IndexName: indexName } : {}),
      ...(filterExpression ? { FilterExpression: filterExpression } : {}),
    };
  } else {
    baseParams = tableNameOrParams;
  }

  const items: T[] = [];
  let lastKey: Record<string, unknown> | undefined;

  do {
    const result = await docClient.send(
      new QueryCommand({ ...baseParams, ExclusiveStartKey: lastKey })
    );
    if (result.Items) {
      items.push(...(result.Items as T[]));
    }
    lastKey = result.LastEvaluatedKey as Record<string, unknown> | undefined;
  } while (lastKey !== undefined);

  return items;
}

/**
 * Single-page query — respects Limit and ExclusiveStartKey for cursor pagination.
 */
export async function queryPage<T>(
  tableNameOrParams: string | QueryCommandInput,
  keyConditionExpression?: string,
  expressionAttributeValues?: Record<string, unknown>,
  expressionAttributeNames?: Record<string, string>,
  indexName?: string,
  limit?: number,
  exclusiveStartKey?: Record<string, unknown>
): Promise<{ items: T[]; lastEvaluatedKey?: Record<string, unknown> }> {
  let params: QueryCommandInput;

  if (typeof tableNameOrParams === "string") {
    params = {
      TableName: tableNameOrParams,
      KeyConditionExpression: keyConditionExpression!,
      ExpressionAttributeValues: expressionAttributeValues,
      ...(expressionAttributeNames
        ? { ExpressionAttributeNames: expressionAttributeNames }
        : {}),
      ...(indexName ? { IndexName: indexName } : {}),
      ...(limit !== undefined ? { Limit: limit } : {}),
      ...(exclusiveStartKey
        ? { ExclusiveStartKey: exclusiveStartKey }
        : {}),
    };
  } else {
    params = tableNameOrParams;
  }

  const result = await docClient.send(new QueryCommand(params));
  return {
    items: (result.Items ?? []) as T[],
    lastEvaluatedKey: result.LastEvaluatedKey as
      | Record<string, unknown>
      | undefined,
  };
}

/**
 * Batch write (put/delete) items. Splits into 25-item chunks and retries
 * unprocessed items with exponential backoff.
 */
export async function batchWrite(
  tableName: string,
  putRequests: Record<string, unknown>[],
  deleteRequests?: Record<string, unknown>[]
): Promise<void> {
  const CHUNK_SIZE = 25;

  const allRequests: Array<
    | { PutRequest: { Item: Record<string, unknown> } }
    | { DeleteRequest: { Key: Record<string, unknown> } }
  > = [
    ...putRequests.map((item) => ({ PutRequest: { Item: item } })),
    ...(deleteRequests ?? []).map((key) => ({
      DeleteRequest: { Key: key },
    })),
  ];

  for (let i = 0; i < allRequests.length; i += CHUNK_SIZE) {
    const chunk = allRequests.slice(i, i + CHUNK_SIZE);
    let unprocessed = chunk;
    let delay = 100;

    do {
      const result = await docClient.send(
        new BatchWriteCommand({
          RequestItems: { [tableName]: unprocessed },
        })
      );

      const leftover = result.UnprocessedItems?.[tableName];
      unprocessed = (leftover ?? []) as typeof chunk;

      if (unprocessed.length > 0) {
        await new Promise<void>((resolve) => setTimeout(resolve, delay));
        delay = Math.min(delay * 2, 3000);
      }
    } while (unprocessed.length > 0);
  }
}

/**
 * Full table scan — returns all items matching an optional filter.
 */
export async function scanItems<T>(
  tableName: string,
  filterExpression?: string,
  expressionAttributeValues?: Record<string, unknown>,
  projectionExpression?: string,
  expressionAttributeNames?: Record<string, string>
): Promise<T[]> {
  const params: ScanCommandInput = {
    TableName: tableName,
    ...(filterExpression ? { FilterExpression: filterExpression } : {}),
    ...(expressionAttributeValues
      ? { ExpressionAttributeValues: expressionAttributeValues }
      : {}),
    ...(projectionExpression
      ? { ProjectionExpression: projectionExpression }
      : {}),
    ...(expressionAttributeNames
      ? { ExpressionAttributeNames: expressionAttributeNames }
      : {}),
  };

  const items: T[] = [];
  let lastKey: Record<string, unknown> | undefined;

  do {
    const result = await docClient.send(
      new ScanCommand({ ...params, ExclusiveStartKey: lastKey })
    );
    if (result.Items) {
      items.push(...(result.Items as T[]));
    }
    lastKey = result.LastEvaluatedKey as Record<string, unknown> | undefined;
  } while (lastKey !== undefined);

  return items;
}

// ─── Key Builders ─────────────────────────────────────────────────────────────

export const keys = {
  /** Full key for a specific character item. */
  character: (userId: string, characterId: string) => ({
    PK: `USER#${userId}`,
    SK: `CHARACTER#${characterId}`,
  }),

  /** Partial key for querying all characters belonging to a user (PK only). */
  charactersByUser: (userId: string) => ({
    PK: `USER#${userId}`,
    SK_prefix: "CHARACTER#",
  }),

  /** Key for a class METADATA item. */
  classMetadata: (classId: string) => ({
    PK: `CLASS#${classId}`,
    SK: "METADATA",
  }),

  /** Key for a specific subclass item within a class. */
  classSubclass: (classId: string, subclassId: string) => ({
    PK: `CLASS#${classId}`,
    SK: `SUBCLASS#${subclassId}`,
  }),

  /** Partial key prefix for querying all items belonging to a class. */
  classPrefix: (classId: string) => ({
    PK: `CLASS#${classId}`,
  }),

  /** Key for a community game-data item. */
  community: (id: string) => ({
    PK: `COMMUNITY#${id}`,
    SK: "METADATA",
  }),

  /** Key for an ancestry game-data item. */
  ancestry: (id: string) => ({
    PK: `ANCESTRY#${id}`,
    SK: "METADATA",
  }),

  /** Key for a rule/faction/reputation entry. */
  rule: (id: string) => ({
    PK: `RULE#${id}`,
    SK: "METADATA",
  }),

  /** Generic game-data key (used for communities, ancestries, rules). */
  gameData: (prefix: string, id: string) => ({
    PK: `${prefix}#${id}`,
    SK: "METADATA",
  }),

  /** Key for a specific domain card. */
  domainCard: (domain: string, cardId: string) => ({
    PK: `DOMAIN#${domain}`,
    SK: `CARD#${cardId}`,
  }),

  /** Partial key for querying all cards in a domain. */
  domainPrefix: (domain: string) => ({
    PK: `DOMAIN#${domain}`,
  }),

  /** Key for a media record. */
  media: (userId: string, mediaId: string) => ({
    PK: `USER#${userId}`,
    SK: `MEDIA#${mediaId}`,
  }),

  /** Key for a user profile record. */
  user: (userId: string) => ({
    PK: `USER#${userId}`,
    SK: "PROFILE",
  }),

  /** Key for a CMS content item. */
  cmsItem: (type: string, id: string) => ({
    PK: `CMS#${type}`,
    SK: `ITEM#${id}`,
  }),

  /** PK prefix for querying all CMS items of a given type. */
  cmsByType: (type: string) => ({
    PK: `CMS#${type}`,
  }),

  // ─── Campaign Key Builders ─────────────────────────────────────────────────

  /** Full key for a campaign's metadata record. */
  campaign: (campaignId: string) => ({
    PK: `CAMPAIGN#${campaignId}`,
    SK: "METADATA",
  }),

  /** Full key for a campaign member record. role should be "GM" or "PLAYER". */
  campaignMember: (campaignId: string, role: string, userId: string) => ({
    PK: `CAMPAIGN#${campaignId}`,
    SK: `MEMBER#${role.toUpperCase()}#${userId}`,
  }),

  /** Full key for a character assignment record within a campaign. */
  campaignCharacter: (campaignId: string, characterId: string) => ({
    PK: `CAMPAIGN#${campaignId}`,
    SK: `CHARACTER#${characterId}`,
  }),

  /** Full key for a campaign invite record. */
  campaignInvite: (campaignId: string, inviteCode: string) => ({
    PK: `CAMPAIGN#${campaignId}`,
    SK: `INVITE#${inviteCode}`,
  }),

  /** Full key for the user→campaign reverse index record. */
  userCampaignIndex: (userId: string, campaignId: string) => ({
    PK: `USER#${userId}`,
    SK: `CAMPAIGN#${campaignId}`,
  }),

  // ─── WebSocket Connection Key Builders ────────────────────────────────────

  /** Full key for a WebSocket connection metadata record. */
  connection: (connectionId: string) => ({
    PK: `CONNECTION#${connectionId}`,
    SK: "METADATA",
  }),

  /** Full key for a character→connection reverse index record. */
  characterConnection: (characterId: string, connectionId: string) => ({
    PK: `CHARACTER#${characterId}`,
    SK: `CONNECTION#${connectionId}`,
  }),

  /** Full key for a campaign→connection fan-out index record. */
  campaignConnection: (campaignId: string, connectionId: string) => ({
    PK: `CAMPAIGN#${campaignId}`,
    SK: `CONNECTION#${connectionId}`,
  }),

  // ─── Homebrew Key Builders ─────────────────────────────────────────────────

  /** Key for a homebrew class METADATA item. */
  homebrewClassMetadata: (userId: string, slug: string) => ({
    PK: `CLASS#hb-${userId}-${slug}`,
    SK: "METADATA",
  }),

  /** Key for a homebrew community item. */
  homebrewCommunity: (userId: string, slug: string) => ({
    PK: `COMMUNITY#hb-${userId}-${slug}`,
    SK: "METADATA",
  }),

  /** Key for a homebrew ancestry item. */
  homebrewAncestry: (userId: string, slug: string) => ({
    PK: `ANCESTRY#hb-${userId}-${slug}`,
    SK: "METADATA",
  }),

  /** Key for a homebrew domain card in an existing SRD domain. */
  homebrewDomainCard: (userId: string, domain: string, slug: string) => ({
    PK: `DOMAIN#${domain}`,
    SK: `CARD#hb-${userId}-${slug}`,
  }),

  /** Key for a homebrew domain card in a custom (non-SRD) domain. */
  homebrewCustomDomainCard: (userId: string, domain: string, slug: string) => ({
    PK: `DOMAIN#hb-${userId}-${domain}`,
    SK: `CARD#hb-${userId}-${slug}`,
  }),

  /** Key for a homebrew weapon item. */
  homebrewWeapon: (userId: string, slug: string) => ({
    PK: `WEAPON#hb-${userId}-${slug}`,
    SK: "METADATA",
  }),

  /** Key for a homebrew armor item. */
  homebrewArmor: (userId: string, slug: string) => ({
    PK: `ARMOR#hb-${userId}-${slug}`,
    SK: "METADATA",
  }),

  /** Key for a homebrew item (reusable). */
  homebrewItem: (userId: string, slug: string) => ({
    PK: `ITEM#hb-${userId}-${slug}`,
    SK: "METADATA",
  }),

  /** Key for a homebrew consumable. */
  homebrewConsumable: (userId: string, slug: string) => ({
    PK: `CONSUMABLE#hb-${userId}-${slug}`,
    SK: "METADATA",
  }),

  // ─── Campaign Frame Key Builders ──────────────────────────────────────────

  /** Full key for a campaign frame's metadata record. */
  frame: (frameId: string) => ({
    PK: `FRAME#${frameId}`,
    SK: "METADATA",
  }),

  /** Full key for a frame content reference record. */
  frameContent: (frameId: string, contentType: string, contentId: string) => ({
    PK: `FRAME#${frameId}`,
    SK: `CONTENT#${contentType}#${contentId}`,
  }),

  /** Full key for a frame SRD restriction/alteration record. */
  frameRestriction: (frameId: string, contentType: string, contentId: string) => ({
    PK: `FRAME#${frameId}`,
    SK: `RESTRICTION#${contentType}#${contentId}`,
  }),

  /** Full key for a frame custom type extension record. */
  frameExtension: (frameId: string, extensionType: string, slug: string) => ({
    PK: `FRAME#${frameId}`,
    SK: `EXTENSION#${extensionType}#${slug}`,
  }),

  /** Full key for a campaign↔frame attachment record (stored in Campaigns table). */
  campaignFrame: (campaignId: string, frameId: string) => ({
    PK: `CAMPAIGN#${campaignId}`,
    SK: `FRAME#${frameId}`,
  }),

  /** Full key for a per-item conflict resolution record (stored in Campaigns table). */
  campaignConflict: (campaignId: string, contentType: string, normalizedName: string) => ({
    PK: `CAMPAIGN#${campaignId}`,
    SK: `CONFLICT#${contentType}#${normalizedName}`,
  }),
};
