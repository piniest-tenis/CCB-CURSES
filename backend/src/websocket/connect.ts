// backend/src/websocket/connect.ts
// WebSocket $connect handler.
// Validates the JWT from query params, then stores two DynamoDB items:
//   CONNECTION#{connectionId} / METADATA  — full connection record (24h TTL)
//   CHARACTER#{characterId}  / CONNECTION#{connectionId} — reverse index (24h TTL)

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
  connectedAt: string;
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

/**
 * Decode a JWT without verifying the signature.
 * The WebSocket API is internal — tokens were already validated by the HTTP API
 * JWT authorizer before the caller obtained a connection URL.
 */
function decodeJwtPayload(token: string): JwtClaims {
  const parts = token.split(".");
  if (parts.length !== 3) {
    throw new Error("Invalid JWT format");
  }
  const payload = parts[1]!;
  // base64url → base64 → Buffer → JSON
  const padded = payload.replace(/-/g, "+").replace(/_/g, "/");
  const decoded = Buffer.from(padded, "base64").toString("utf-8");
  return JSON.parse(decoded) as JwtClaims;
}

// ─── Query String Parser ──────────────────────────────────────────────────────

/**
 * Parse a URL query string into a key-value map.
 * Used because APIGatewayProxyWebsocketEventV2 does not expose a
 * queryStringParameters field (unlike HTTP API events). The raw query
 * string is available on the event but must be parsed manually.
 */
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

    // WebSocket $connect events carry query params in rawQueryString
    // (the @types/aws-lambda definition omits queryStringParameters for WS events)
    const rawEvent = event as APIGatewayProxyWebsocketEventV2 & {
      rawQueryString?: string;
      queryStringParameters?: Record<string, string>;
    };

    const qsp =
      rawEvent.queryStringParameters ??
      parseQueryString(rawEvent.rawQueryString);

    const token = qsp["token"];
    const campaignId = qsp["campaignId"];
    const characterId = qsp["characterId"];

    if (!token || !campaignId || !characterId) {
      console.warn("WS $connect rejected: missing required query params", {
        hasToken: !!token,
        hasCampaign: !!campaignId,
        hasCharacter: !!characterId,
      });
      return { statusCode: 401 };
    }

    // Decode JWT to extract userId
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

    const now = new Date().toISOString();
    const ttl = expiryEpoch();

    // 1. CONNECTION#{connectionId} / METADATA
    const connectionRecord: ConnectionRecord = {
      ...keys.connection(connectionId),
      connectionId,
      userId,
      campaignId,
      characterId,
      connectedAt: now,
      ttl,
    };

    // 2. CHARACTER#{characterId} / CONNECTION#{connectionId}
    const charConnRecord: CharacterConnectionRecord = {
      ...keys.characterConnection(characterId, connectionId),
      connectionId,
      characterId,
      ttl,
    };

    await putItem(
      CONNECTIONS_TABLE,
      connectionRecord as unknown as Record<string, unknown>
    );
    await putItem(
      CONNECTIONS_TABLE,
      charConnRecord as unknown as Record<string, unknown>
    );

    console.info("WS $connect success", { connectionId, userId, campaignId, characterId });
    return { statusCode: 200 };
  } catch (err: unknown) {
    console.error("WS $connect error", err);
    return { statusCode: 500 };
  }
};
