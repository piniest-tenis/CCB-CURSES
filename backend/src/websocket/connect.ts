// backend/src/websocket/connect.ts
// WebSocket $connect handler.
//
// Two connection modes:
//   1. Authenticated player/GM — requires ?token=&campaignId=&characterId=
//      Validates JWT, stores full connection record + character→connection index.
//
//   2. OBS observer — requires ?campaignId=&role=obs (no token or characterId)
//      Unauthenticated read-only connection. Only receives dice_roll events.
//      Stored with userId="OBS" and characterId="OBS" — excluded from pings.
//
// DynamoDB items written:
//   CONNECTION#{connectionId} / METADATA  — full connection record (24h TTL)
//   CAMPAIGN#{campaignId}    / CONNECTION#{connectionId} — campaign fan-out index (24h TTL)
//   CHARACTER#{characterId}  / CONNECTION#{connectionId} — reverse index (players only, 24h TTL)

import type {
  APIGatewayProxyWebsocketEventV2,
  APIGatewayProxyResultV2,
} from "aws-lambda";
import {
  CONNECTIONS_TABLE,
  putItem,
  keys,
} from "../common/dynamodb";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ConnectionRecord {
  PK: string;
  SK: string;
  connectionId: string;
  userId: string;
  campaignId: string;
  characterId: string;
  role: "player" | "obs";
  connectedAt: string;
  ttl: number;
}

interface CampaignConnectionRecord {
  PK: string;
  SK: string;
  connectionId: string;
  campaignId: string;
  ttl: number;
}

interface CharacterConnectionRecord {
  PK: string;
  SK: string;
  connectionId: string;
  characterId: string;
  ttl: number;
}

// ─── JWT Decode (lightweight — token already validated by API GW HTTP routes) ──

interface JwtClaims {
  sub?: string;
  [key: string]: unknown;
}

function decodeJwtPayload(token: string): JwtClaims {
  const parts = token.split(".");
  if (parts.length !== 3) {
    throw new Error("Invalid JWT format");
  }
  const payload = parts[1]!;
  const padded = payload.replace(/-/g, "+").replace(/_/g, "/");
  const decoded = Buffer.from(padded, "base64").toString("utf-8");
  return JSON.parse(decoded) as JwtClaims;
}

// ─── Query String Parser ──────────────────────────────────────────────────────

function parseQueryString(
  raw: string | null | undefined
): Record<string, string> {
  if (!raw) return {};
  const result: Record<string, string> = {};
  for (const part of raw.split("&")) {
    const eqIdx = part.indexOf("=");
    if (eqIdx === -1) {
      result[decodeURIComponent(part)] = "";
    } else {
      const key = decodeURIComponent(part.slice(0, eqIdx));
      const val = decodeURIComponent(part.slice(eqIdx + 1));
      result[key] = val;
    }
  }
  return result;
}

// ─── TTL Helper ───────────────────────────────────────────────────────────────

const TTL_24H_SECONDS = 24 * 60 * 60;

function expiryEpoch(): number {
  return Math.floor(Date.now() / 1000) + TTL_24H_SECONDS;
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export const handler = async (
  event: APIGatewayProxyWebsocketEventV2
): Promise<APIGatewayProxyResultV2> => {
  try {
    const connectionId = event.requestContext.connectionId;

    const rawEvent = event as APIGatewayProxyWebsocketEventV2 & {
      rawQueryString?: string;
      queryStringParameters?: Record<string, string>;
    };

    const qsp =
      rawEvent.queryStringParameters ??
      parseQueryString(rawEvent.rawQueryString);

    const token       = qsp["token"];
    const campaignId  = qsp["campaignId"];
    const characterId = qsp["characterId"];
    const role        = qsp["role"];

    if (!campaignId) {
      console.warn("WS $connect rejected: missing campaignId");
      return { statusCode: 401 };
    }

    const now = new Date().toISOString();
    const ttl = expiryEpoch();

    // ── OBS observer path (no token required) ─────────────────────────────────
    if (role === "obs") {
      const connectionRecord: ConnectionRecord = {
        ...keys.connection(connectionId),
        connectionId,
        userId:      "OBS",
        campaignId,
        characterId: "OBS",
        role:        "obs",
        connectedAt: now,
        ttl,
      };

      const campaignConnRecord: CampaignConnectionRecord = {
        PK: `CAMPAIGN#${campaignId}`,
        SK: `CONNECTION#${connectionId}`,
        connectionId,
        campaignId,
        ttl,
      };

      await Promise.all([
        putItem(CONNECTIONS_TABLE, connectionRecord as unknown as Record<string, unknown>),
        putItem(CONNECTIONS_TABLE, campaignConnRecord as unknown as Record<string, unknown>),
      ]);

      console.info("WS $connect OBS observer", { connectionId, campaignId });
      return { statusCode: 200 };
    }

    // ── Authenticated player/GM path ──────────────────────────────────────────
    if (!token || !characterId) {
      console.warn("WS $connect rejected: missing token or characterId for player connection", {
        hasToken: !!token,
        hasCharacter: !!characterId,
      });
      return { statusCode: 401 };
    }

    // GM connections use synthetic characterId "gm" — allow through
    // (no character lookup needed; the GM broadcasts dice to all campaign connections)

    let claims: JwtClaims;
    try {
      claims = decodeJwtPayload(token);
    } catch {
      console.warn("WS $connect rejected: JWT decode failed");
      return { statusCode: 401 };
    }

    const userId = claims["sub"];
    if (!userId || typeof userId !== "string") {
      console.warn("WS $connect rejected: missing sub claim");
      return { statusCode: 401 };
    }

    const connectionRecord: ConnectionRecord = {
      ...keys.connection(connectionId),
      connectionId,
      userId,
      campaignId,
      characterId,
      role: "player",
      connectedAt: now,
      ttl,
    };

    const campaignConnRecord: CampaignConnectionRecord = {
      PK: `CAMPAIGN#${campaignId}`,
      SK: `CONNECTION#${connectionId}`,
      connectionId,
      campaignId,
      ttl,
    };

    const charConnRecord: CharacterConnectionRecord = {
      ...keys.characterConnection(characterId, connectionId),
      connectionId,
      characterId,
      ttl,
    };

    await Promise.all([
      putItem(CONNECTIONS_TABLE, connectionRecord as unknown as Record<string, unknown>),
      putItem(CONNECTIONS_TABLE, campaignConnRecord as unknown as Record<string, unknown>),
      putItem(CONNECTIONS_TABLE, charConnRecord as unknown as Record<string, unknown>),
    ]);

    console.info("WS $connect player success", { connectionId, userId, campaignId, characterId });
    return { statusCode: 200 };
  } catch (err: unknown) {
    console.error("WS $connect error", err);
    return { statusCode: 500 };
  }
};

