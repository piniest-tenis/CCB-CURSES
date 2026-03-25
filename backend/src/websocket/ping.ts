// backend/src/websocket/ping.ts
// WebSocket "ping" action handler.
// Verifies the caller is a GM, looks up the target character's connections,
// and broadcasts a PingEvent to each active connection.

import type {
  APIGatewayProxyWebsocketEventV2,
  APIGatewayProxyResultV2,
} from "aws-lambda";
import {
  ApiGatewayManagementApiClient,
  PostToConnectionCommand,
  GoneException,
} from "@aws-sdk/client-apigatewaymanagementapi";
import {
  CONNECTIONS_TABLE,
  CAMPAIGNS_TABLE,
  getItem,
  queryItems,
  deleteItem,
  keys,
} from "../common/dynamodb";
import type { PingEvent } from "@shared/types";

// ─── Internal Types ───────────────────────────────────────────────────────────

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

interface CharacterConnectionIndexRecord {
  PK: string; // CHARACTER#{characterId}
  SK: string; // CONNECTION#{connectionId}
  connectionId: string;
  characterId: string;
  ttl: number;
}

interface CampaignMemberRecord {
  PK: string;
  SK: string;
  campaignId: string;
  userId: string;
  role: "gm" | "player";
  joinedAt: string;
}

interface CampaignCharacterRecord {
  PK: string;
  SK: string;
  campaignId: string;
  characterId: string;
  userId: string;
  addedAt: string;
}

// ─── Ping request body schema ─────────────────────────────────────────────────

interface PingBody {
  action: "ping";
  campaignId: string;
  targetCharacterId: string;
  fieldKey: string;
}

function parsePingBody(raw: string | null | undefined): PingBody | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (
      typeof parsed["action"] === "string" &&
      parsed["action"] === "ping" &&
      typeof parsed["campaignId"] === "string" &&
      typeof parsed["targetCharacterId"] === "string" &&
      typeof parsed["fieldKey"] === "string"
    ) {
      return {
        action: "ping",
        campaignId: parsed["campaignId"] as string,
        targetCharacterId: parsed["targetCharacterId"] as string,
        fieldKey: parsed["fieldKey"] as string,
      };
    }
    return null;
  } catch {
    return null;
  }
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export const handler = async (
  event: APIGatewayProxyWebsocketEventV2
): Promise<APIGatewayProxyResultV2> => {
  try {
    const connectionId = event.requestContext.connectionId;

    // Parse body
    const body = parsePingBody(event.body);
    if (!body) {
      console.warn("WS ping: invalid body", { connectionId, rawBody: event.body });
      return { statusCode: 400 };
    }

    const { campaignId, targetCharacterId, fieldKey } = body;

    // Get caller's connection record to find their userId
    const callerConn = await getItem<ConnectionRecord>(
      CONNECTIONS_TABLE,
      keys.connection(connectionId)
    );
    if (!callerConn) {
      console.warn("WS ping: caller connection not found", { connectionId });
      return { statusCode: 401 };
    }

    const callerUserId = callerConn.userId;

    // Assert caller is a GM in this campaign
    const gmRecord = await getItem<CampaignMemberRecord>(
      CAMPAIGNS_TABLE,
      keys.campaignMember(campaignId, "GM", callerUserId)
    );
    if (!gmRecord) {
      console.warn("WS ping: caller is not a GM", { callerUserId, campaignId });
      return { statusCode: 403 };
    }

    // Assert targetCharacterId is in the campaign
    const charRecord = await getItem<CampaignCharacterRecord>(
      CAMPAIGNS_TABLE,
      keys.campaignCharacter(campaignId, targetCharacterId)
    );
    if (!charRecord) {
      console.warn("WS ping: target character not in campaign", {
        targetCharacterId,
        campaignId,
      });
      return { statusCode: 404 };
    }

    // Find all active connections for this character
    const connIndexItems = await queryItems<CharacterConnectionIndexRecord>(
      CONNECTIONS_TABLE,
      "PK = :pk AND begins_with(SK, :prefix)",
      {
        ":pk": `CHARACTER#${targetCharacterId}`,
        ":prefix": "CONNECTION#",
      }
    );

    // Build the ping event payload
    const pingEvent: PingEvent = {
      type: "ping",
      campaignId,
      targetCharacterId,
      fieldKey,
      senderUserId: callerUserId,
      timestamp: new Date().toISOString(),
    };
    const payload = JSON.stringify(pingEvent);

    // Construct the API Gateway Management API endpoint from env var
    const wsEndpoint =
      process.env["WS_API_ENDPOINT"] ??
      `https://${event.requestContext.apiId}.execute-api.us-east-1.amazonaws.com/${event.requestContext.stage}`;

    const mgmtClient = new ApiGatewayManagementApiClient({
      endpoint: wsEndpoint,
    });

    // Broadcast to each connection — silently clean up stale ones
    const postResults = await Promise.allSettled(
      connIndexItems.map(async (item) => {
        const targetConnId = item.connectionId;
        try {
          await mgmtClient.send(
            new PostToConnectionCommand({
              ConnectionId: targetConnId,
              Data: Buffer.from(payload),
            })
          );
        } catch (err: unknown) {
          if (err instanceof GoneException) {
            // Stale connection — clean up both records
            console.info("WS ping: cleaning stale connection", { targetConnId });
            await deleteItem(
              CONNECTIONS_TABLE,
              keys.characterConnection(targetCharacterId, targetConnId)
            );
            await deleteItem(
              CONNECTIONS_TABLE,
              keys.connection(targetConnId)
            );
          } else {
            // Re-throw for Promise.allSettled to capture
            throw err;
          }
        }
      })
    );

    // Log any non-GoneException errors but don't fail the handler
    for (const result of postResults) {
      if (result.status === "rejected") {
        console.error("WS ping: failed to post to connection", result.reason);
      }
    }

    console.info("WS ping sent", {
      campaignId,
      targetCharacterId,
      fieldKey,
      connectionCount: connIndexItems.length,
    });

    return { statusCode: 200 };
  } catch (err: unknown) {
    console.error("WS ping error", err);
    return { statusCode: 500 };
  }
};
