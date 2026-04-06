// backend/src/websocket/forceCrit.ts
// WebSocket "force_crit" action handler.
//
// Allows a GM to arm or disarm a force-crit flag for a specific character in
// their campaign. The flag is fanned out to all campaign connections so that:
//   - The targeted character's page receives it and primes the dice store.
//   - Other connections (OBS, other GM windows) can reflect UI state.
//
// Expected body: {
//   action: "force_crit",
//   campaignId: string,
//   targetCharacterId: string,
//   active: boolean,
// }
//
// Security:
//   - Sender must be connected to the given campaign.
//   - Sender's stored role must be "gm" (not "player" or "obs").
//   - If either check fails → 403, no fan-out.

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
  getItem,
  queryItems,
  deleteItem,
  keys,
} from "../common/dynamodb";

// ─── Internal Types ───────────────────────────────────────────────────────────

interface ConnectionRecord {
  PK: string;
  SK: string;
  connectionId: string;
  userId: string;
  campaignId: string;
  characterId: string;
  role: "gm" | "player" | "obs";
  connectedAt: string;
  ttl: number;
}

interface CampaignConnectionIndexRecord {
  PK: string;  // CAMPAIGN#{campaignId}
  SK: string;  // CONNECTION#{connectionId}
  connectionId: string;
  campaignId: string;
  ttl: number;
}

// ─── Body Parser ──────────────────────────────────────────────────────────────

interface ForceCritBody {
  action: "force_crit";
  campaignId: string;
  targetCharacterId: string;
  active: boolean;
}

function parseForceCritBody(raw: string | null | undefined): ForceCritBody | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (
      parsed["action"] === "force_crit" &&
      typeof parsed["campaignId"] === "string" &&
      typeof parsed["targetCharacterId"] === "string" &&
      typeof parsed["active"] === "boolean"
    ) {
      return {
        action: "force_crit",
        campaignId: parsed["campaignId"] as string,
        targetCharacterId: parsed["targetCharacterId"] as string,
        active: parsed["active"] as boolean,
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
    const senderConnectionId = event.requestContext.connectionId;

    const body = parseForceCritBody(event.body);
    if (!body) {
      console.warn("WS force_crit: invalid body", { senderConnectionId, rawBody: event.body });
      return { statusCode: 400 };
    }

    const { campaignId, targetCharacterId, active } = body;

    // Verify sender is connected to this campaign AND is a GM
    const senderConn = await getItem<ConnectionRecord>(
      CONNECTIONS_TABLE,
      keys.connection(senderConnectionId)
    );

    if (!senderConn || senderConn.campaignId !== campaignId) {
      console.warn("WS force_crit: sender not in campaign", { senderConnectionId, campaignId });
      return { statusCode: 403 };
    }

    if (senderConn.role !== "gm") {
      console.warn("WS force_crit: sender is not GM", {
        senderConnectionId,
        role: senderConn.role,
      });
      return { statusCode: 403 };
    }

    // Query all campaign connections for fan-out
    const campaignConnections = await queryItems<CampaignConnectionIndexRecord>(
      CONNECTIONS_TABLE,
      "PK = :pk AND begins_with(SK, :prefix)",
      {
        ":pk":     `CAMPAIGN#${campaignId}`,
        ":prefix": "CONNECTION#",
      }
    );

    const outboundPayload = JSON.stringify({
      type: "force_crit",
      campaignId,
      targetCharacterId,
      active,
    });

    const wsEndpoint =
      process.env["WS_API_ENDPOINT"] ??
      `https://${event.requestContext.apiId}.execute-api.us-east-1.amazonaws.com/${event.requestContext.stage}`;

    const mgmtClient = new ApiGatewayManagementApiClient({ endpoint: wsEndpoint });

    const fanOutResults = await Promise.allSettled(
      campaignConnections.map(async (item) => {
        const targetConnId = item.connectionId;
        try {
          await mgmtClient.send(
            new PostToConnectionCommand({
              ConnectionId: targetConnId,
              Data:         Buffer.from(outboundPayload),
            })
          );
        } catch (err: unknown) {
          if (err instanceof GoneException) {
            console.info("WS force_crit: cleaning stale connection", { targetConnId });
            await Promise.allSettled([
              deleteItem(CONNECTIONS_TABLE, keys.campaignConnection(campaignId, targetConnId)),
              deleteItem(CONNECTIONS_TABLE, keys.connection(targetConnId)),
            ]);
          } else {
            throw err;
          }
        }
      })
    );

    for (const res of fanOutResults) {
      if (res.status === "rejected") {
        console.error("WS force_crit: fan-out error", res.reason);
      }
    }

    console.info("WS force_crit sent", {
      campaignId,
      senderConnectionId,
      targetCharacterId,
      active,
      recipientCount: campaignConnections.length,
    });

    return { statusCode: 200 };
  } catch (err: unknown) {
    console.error("WS force_crit error", err);
    return { statusCode: 500 };
  }
};
