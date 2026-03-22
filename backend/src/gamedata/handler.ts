// backend/src/gamedata/handler.ts
// Lambda handler for public game data routes (no authentication required):
//   GET /classes, GET /classes/{classId}
//   GET /communities, GET /communities/{communityId}
//   GET /ancestries, GET /ancestries/{ancestryId}
//   GET /domains, GET /domains/{domain}, GET /domains/{domain}/cards/{cardId}
//   GET /rules, GET /rules/{ruleId}

import type {
  APIGatewayProxyEventV2,
  APIGatewayProxyResultV2,
} from "aws-lambda";
import {
  AppError,
  createSuccessResponse,
  createErrorResponse,
  requirePathParam,
  getQueryParam,
  getQueryParamInt,
  withErrorHandling,
} from "../common/middleware";
import {
  docClient,
  CLASSES_TABLE,
  GAME_DATA_TABLE,
  DOMAIN_CARDS_TABLE,
  getItem,
  queryItems,
  scanItems,
  keys,
} from "../common/dynamodb";
import {
  QueryCommand,
  type QueryCommandInput,
} from "@aws-sdk/lib-dynamodb";
import type {
  ClassData,
  ClassSummary,
  SubclassData,
  CommunityData,
  AncestryData,
  MechanicalBonus,
  DomainCard,
  DomainSummary,
  RuleEntry,
} from "@shared/types";

// ─── DynamoDB Record Shapes ───────────────────────────────────────────────────

interface ClassMetaRecord {
  PK: string;
  SK: string;
  classId: string;
  name: string;
  domains: string[];
  startingEvasion: number;
  startingHitPoints: number;
  classItems: string[];
  hopeFeature: { name: string; description: string; hopeCost: number };
  classFeature: { name: string; description: string; options: string[] };
  backgroundQuestions: string[];
  connectionQuestions: string[];
  mechanicalNotes: string;
  armorRec?: string[];
  source: "homebrew" | "srd";
}

interface SubclassRecord {
  PK: string;
  SK: string;
  subclassId: string;
  name: string;
  description: string;
  spellcastTrait: string;
  foundationFeatures: Array<{ name: string; description: string }>;
  specializationFeature: { name: string; description: string };
  masteryFeature: { name: string; description: string };
}

interface GameDataRecord {
  PK: string;
  SK: string;
  id: string;
  type: string;
  name: string;
  flavorText: string;
  traitName: string;
  traitDescription: string;
  secondTraitName?: string;
  secondTraitDescription?: string;
  body: string;
  source: "homebrew" | "srd";
  mechanicalBonuses?: MechanicalBonus[];
}

interface DomainCardRecord {
  PK: string;
  SK: string;
  cardId: string;
  domain: string;
  level: number;
  recallCost?: number;
  name: string;
  isCursed: boolean;
  isLinkedCurse: boolean;
  isGrimoire: boolean;
  description: string;
  curseText: string | null;
  linkedCardIds: string[];
  grimoire: Array<{ name: string; description: string }>;
  source: "homebrew" | "srd";
}

// ─── Serializers ──────────────────────────────────────────────────────────────

function toClassSummary(
  record: ClassMetaRecord,
  subclasses: SubclassRecord[]
): ClassSummary {
  return {
    classId: record.classId,
    name: record.name,
    domains: record.domains ?? [],
    startingEvasion: record.startingEvasion,
    startingHitPoints: record.startingHitPoints,
    subclasses: subclasses.map((s) => ({
      subclassId: s.subclassId,
      name: s.name,
      description: s.description,
    })),
    source: record.source,
  };
}

function toClassData(
  record: ClassMetaRecord,
  subclasses: SubclassRecord[]
): ClassData {
  return {
    classId: record.classId,
    name: record.name,
    domains: record.domains ?? [],
    startingEvasion: record.startingEvasion,
    startingHitPoints: record.startingHitPoints,
    classItems: record.classItems ?? [],
    hopeFeature: record.hopeFeature,
    classFeature: record.classFeature,
    backgroundQuestions: record.backgroundQuestions ?? [],
    connectionQuestions: record.connectionQuestions ?? [],
    subclasses: subclasses.map((s) => ({
      subclassId: s.subclassId,
      name: s.name,
      description: s.description,
      spellcastTrait: s.spellcastTrait as SubclassData["spellcastTrait"],
      foundationFeatures: s.foundationFeatures ?? [],
      specializationFeature: s.specializationFeature,
      masteryFeature: s.masteryFeature,
    })),
    mechanicalNotes: record.mechanicalNotes ?? "",
    armorRec: record.armorRec ?? [],
    source: record.source,
  };
}

function toCommunityData(record: GameDataRecord): CommunityData {
  const result: CommunityData = {
    communityId: record.id,
    name: record.name,
    flavorText: record.flavorText ?? "",
    traitName: record.traitName ?? "",
    traitDescription: record.traitDescription ?? "",
    source: record.source,
  };
  if (record.mechanicalBonuses && record.mechanicalBonuses.length > 0) {
    result.mechanicalBonuses = record.mechanicalBonuses;
  }
  return result;
}

function toAncestryData(record: GameDataRecord): AncestryData {
  const result: AncestryData = {
    ancestryId: record.id,
    name: record.name,
    flavorText: record.flavorText ?? "",
    traitName: record.traitName ?? "",
    traitDescription: record.traitDescription ?? "",
    secondTraitName: record.secondTraitName ?? "",
    secondTraitDescription: record.secondTraitDescription ?? "",
    source: record.source,
  };
  if (record.mechanicalBonuses && record.mechanicalBonuses.length > 0) {
    result.mechanicalBonuses = record.mechanicalBonuses;
  }
  return result;
}

function toDomainCard(record: DomainCardRecord): DomainCard {
  return {
    cardId: record.cardId,
    domain: record.domain,
    level: record.level,
    recallCost: record.recallCost ?? record.level,
    name: record.name,
    isCursed: record.isCursed ?? false,
    isLinkedCurse: record.isLinkedCurse ?? false,
    isGrimoire: record.isGrimoire ?? false,
    description: record.description ?? "",
    curseText: record.curseText ?? null,
    linkedCardIds: record.linkedCardIds ?? [],
    grimoire: record.grimoire ?? [],
    source: record.source,
  };
}

function toRuleEntry(record: GameDataRecord): RuleEntry {
  return {
    ruleId: record.id,
    name: record.name,
    body: record.body ?? "",
    type: record.type as RuleEntry["type"],
  };
}

// ─── Route Handlers ───────────────────────────────────────────────────────────

/** GET /classes — list all classes with optional ?domain= and ?source= filters */
async function listClasses(
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResultV2> {
  const domainFilter = getQueryParam(event, "domain");
  const sourceFilter = getQueryParam(event, "source");

  // Full scan for all METADATA items (classes table has modest row count)
  let records = await scanItems<ClassMetaRecord>(
    CLASSES_TABLE,
    "SK = :sk",
    { ":sk": "METADATA" }
  );

  if (domainFilter) {
    records = records.filter((r) =>
      (r.domains ?? []).some(
        (d) => d.toLowerCase() === domainFilter.toLowerCase()
      )
    );
  }
  if (sourceFilter) {
    records = records.filter(
      (r) => r.source?.toLowerCase() === sourceFilter.toLowerCase()
    );
  }

  // Fetch subclass stubs per class in parallel
  const classes = await Promise.all(
    records.map(async (classRecord) => {
      const subclassResult = await docClient.send(
        new QueryCommand({
          TableName: CLASSES_TABLE,
          KeyConditionExpression: "PK = :pk AND begins_with(SK, :skPrefix)",
          ExpressionAttributeValues: {
            ":pk": classRecord.PK,
            ":skPrefix": "SUBCLASS#",
          },
        })
      );
      const subclasses = (subclassResult.Items ?? []) as SubclassRecord[];
      return toClassSummary(classRecord, subclasses);
    })
  );

  return createSuccessResponse({ classes });
}

/** GET /classes/{classId} — full class data including all subclasses */
async function getClass(
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResultV2> {
  const classId = requirePathParam(event, "classId");

  // Fetch all items for this class PK in a single query
  const result = await docClient.send(
    new QueryCommand({
      TableName: CLASSES_TABLE,
      KeyConditionExpression: "PK = :pk",
      ExpressionAttributeValues: { ":pk": `CLASS#${classId}` },
    })
  );

  const items = result.Items ?? [];
  const metaItem = items.find((i) => i["SK"] === "METADATA") as
    | ClassMetaRecord
    | undefined;

  if (!metaItem) {
    throw AppError.notFound("Class", classId);
  }

  const subclasses = items.filter((i) =>
    (i["SK"] as string).startsWith("SUBCLASS#")
  ) as SubclassRecord[];

  return createSuccessResponse(toClassData(metaItem, subclasses));
}

/** GET /communities — list all communities */
async function listCommunities(
  _event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResultV2> {
  const result = await docClient.send(
    new QueryCommand({
      TableName: GAME_DATA_TABLE,
      IndexName: "type-index",
      KeyConditionExpression: "#type = :type",
      ExpressionAttributeNames: { "#type": "type" },
      ExpressionAttributeValues: { ":type": "community" },
    })
  );

  const communities = ((result.Items ?? []) as GameDataRecord[]).map(
    toCommunityData
  );
  return createSuccessResponse({ communities });
}

/** GET /communities/{communityId} — single community */
async function getCommunity(
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResultV2> {
  const communityId = requirePathParam(event, "communityId");

  const record = await getItem<GameDataRecord>({
    TableName: GAME_DATA_TABLE,
    Key: keys.gameData("COMMUNITY", communityId),
  });

  if (!record) throw AppError.notFound("Community", communityId);
  return createSuccessResponse(toCommunityData(record));
}

/** GET /ancestries — list all ancestries */
async function listAncestries(
  _event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResultV2> {
  const result = await docClient.send(
    new QueryCommand({
      TableName: GAME_DATA_TABLE,
      IndexName: "type-index",
      KeyConditionExpression: "#type = :type",
      ExpressionAttributeNames: { "#type": "type" },
      ExpressionAttributeValues: { ":type": "ancestry" },
    })
  );

  const ancestries = ((result.Items ?? []) as GameDataRecord[]).map(
    toAncestryData
  );
  return createSuccessResponse({ ancestries });
}

/** GET /ancestries/{ancestryId} — single ancestry */
async function getAncestry(
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResultV2> {
  const ancestryId = requirePathParam(event, "ancestryId");

  const record = await getItem<GameDataRecord>({
    TableName: GAME_DATA_TABLE,
    Key: keys.gameData("ANCESTRY", ancestryId),
  });

  if (!record) throw AppError.notFound("Ancestry", ancestryId);
  return createSuccessResponse(toAncestryData(record));
}

/** GET /domains — aggregate domain cards by domain, return summaries */
async function listDomains(
  _event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResultV2> {
  // Scan entire DomainCards table projecting only the fields we need
  const items = await scanItems<{ PK: string; SK: string; domain: string; level: number; description?: string }>(
    DOMAIN_CARDS_TABLE,
    undefined,
    undefined,
    "#domain, #level, #pk, #sk, #description",
    { "#domain": "domain", "#level": "level", "#pk": "PK", "#sk": "SK", "#description": "description" }
  );

  // Separate METADATA items (domain descriptions) from CARD items
  const metadataMap = new Map<string, string | null>();
  const cardItems: { domain: string; level: number }[] = [];

  for (const item of items) {
    if (item.SK === "METADATA") {
      metadataMap.set(item.domain, item.description ?? null);
    } else {
      cardItems.push(item);
    }
  }

  const domainMap = new Map<
    string,
    { cardCount: number; cardsByLevel: Record<string, number> }
  >();

  for (const item of cardItems) {
    if (!item.domain) continue;
    if (!domainMap.has(item.domain)) {
      domainMap.set(item.domain, { cardCount: 0, cardsByLevel: {} });
    }
    const agg = domainMap.get(item.domain)!;
    agg.cardCount += 1;
    const lvlKey = String(item.level);
    agg.cardsByLevel[lvlKey] = (agg.cardsByLevel[lvlKey] ?? 0) + 1;
  }

  const domains: DomainSummary[] = Array.from(domainMap.entries())
    .map(([domain, agg]) => ({
      domain,
      description: metadataMap.get(domain) ?? null,
      ...agg,
    }))
    .sort((a, b) => a.domain.localeCompare(b.domain));

  return createSuccessResponse({ domains });
}

/** GET /domains/{domain} — all cards for a domain, optional ?level= filter */
async function getDomainCards(
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResultV2> {
  const domain = requirePathParam(event, "domain");
  const levelFilter = getQueryParamInt(event, "level");

  let queryParams: QueryCommandInput;

  if (levelFilter !== undefined) {
    queryParams = {
      TableName: DOMAIN_CARDS_TABLE,
      IndexName: "level-index",
      KeyConditionExpression: "#domain = :domain AND #level = :level",
      ExpressionAttributeNames: { "#domain": "domain", "#level": "level" },
      ExpressionAttributeValues: {
        ":domain": domain,
        ":level": levelFilter,
      },
    };
  } else {
    queryParams = {
      TableName: DOMAIN_CARDS_TABLE,
      KeyConditionExpression: "PK = :pk AND begins_with(SK, :skPrefix)",
      ExpressionAttributeValues: {
        ":pk": `DOMAIN#${domain}`,
        ":skPrefix": "CARD#",
      },
    };
  }

  const items = await queryItems<DomainCardRecord>(queryParams);

  if (items.length === 0 && levelFilter === undefined) {
    throw AppError.notFound("Domain", domain);
  }

  items.sort(
    (a: DomainCardRecord, b: DomainCardRecord) =>
      a.level - b.level || a.name.localeCompare(b.name)
  );

  return createSuccessResponse({ domain, cards: items.map(toDomainCard) });
}

/** GET /domains/{domain}/cards/{cardId} — single domain card */
async function getDomainCard(
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResultV2> {
  const domain = requirePathParam(event, "domain");
  const cardId = requirePathParam(event, "cardId");

  const record = await getItem<DomainCardRecord>({
    TableName: DOMAIN_CARDS_TABLE,
    Key: keys.domainCard(domain, cardId),
  });

  if (!record) throw AppError.notFound("Domain card", cardId);
  return createSuccessResponse(toDomainCard(record));
}

/** GET /rules — list all rule entries */
async function listRules(
  _event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResultV2> {
  const result = await docClient.send(
    new QueryCommand({
      TableName: GAME_DATA_TABLE,
      IndexName: "type-index",
      KeyConditionExpression: "#type = :type",
      ExpressionAttributeNames: { "#type": "type" },
      ExpressionAttributeValues: { ":type": "rule" },
    })
  );

  const rules = ((result.Items ?? []) as GameDataRecord[]).map(toRuleEntry);
  return createSuccessResponse({ rules });
}

/** GET /rules/{ruleId} — single rule entry */
async function getRule(
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResultV2> {
  const ruleId = requirePathParam(event, "ruleId");

  const record = await getItem<GameDataRecord>({
    TableName: GAME_DATA_TABLE,
    Key: keys.gameData("RULE", ruleId),
  });

  if (!record) throw AppError.notFound("Rule", ruleId);
  return createSuccessResponse(toRuleEntry(record));
}

// ─── Route Dispatcher ─────────────────────────────────────────────────────────

export const handler = withErrorHandling(
  async (
    event: APIGatewayProxyEventV2
  ): Promise<APIGatewayProxyResultV2> => {
    const routeKey = event.routeKey;

    switch (routeKey) {
      // Classes
      case "GET /classes":
        return listClasses(event);
      case "GET /classes/{classId}":
        return getClass(event);

      // Communities
      case "GET /communities":
        return listCommunities(event);
      case "GET /communities/{communityId}":
        return getCommunity(event);

      // Ancestries
      case "GET /ancestries":
        return listAncestries(event);
      case "GET /ancestries/{ancestryId}":
        return getAncestry(event);

      // Domains
      case "GET /domains":
        return listDomains(event);
      case "GET /domains/{domain}":
        return getDomainCards(event);
      case "GET /domains/{domain}/cards/{cardId}":
        return getDomainCard(event);

      // Rules
      case "GET /rules":
        return listRules(event);
      case "GET /rules/{ruleId}":
        return getRule(event);

      default:
        return createErrorResponse("NOT_FOUND", "Route not found", 404);
    }
  }
);
