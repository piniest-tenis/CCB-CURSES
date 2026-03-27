// backend/src/websocket/diceRoll.ts
// WebSocket "dice_roll" action handler.
//
// Receives a dice roll result from a player/GM client and fans it out to every
// connection registered under the same campaignId — including OBS observer
// connections that cannot self-broadcast.
//
// Expected body: { action: "dice_roll", campaignId: string, result: RollResult }
//
// DynamoDB read pattern:
//   Query CONNECTIONS_TABLE where PK = "CAMPAIGN#{campaignId}" AND SK begins_with "CONNECTION#"
//   This returns all connection index records for the campaign (players + OBS).
//
// Fan-out:
//   PostToConnectionCommand to each connectionId.
//   GoneException → clean up stale connection + campaign index records.

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

interface CampaignConnectionIndexRecord {
  PK: string;  // CAMPAIGN#{campaignId}
  SK: string;  // CONNECTION#{connectionId}
  connectionId: string;
  campaignId: string;
  ttl: number;
}

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

// ─── Body Parser ──────────────────────────────────────────────────────────────

interface DiceRollBody {
  action: "dice_roll";
  campaignId: string;
  result: unknown;
}

function parseDiceRollBody(raw: string | null | undefined): DiceRollBody | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (
      typeof parsed["action"] === "string" &&
      parsed["action"] === "dice_roll" &&
      typeof parsed["campaignId"] === "string" &&
      parsed["result"] !== undefined
    ) {
      return {
        action: "dice_roll",
        campaignId: parsed["campaignId"] as string,
        result: parsed["result"],
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

    // Parse body
    const body = parseDiceRollBody(event.body);
    if (!body) {
      console.warn("WS dice_roll: invalid body", { senderConnectionId, rawBody: event.body });
      return { statusCode: 400 };
    }

    const { campaignId, result } = body;

    // Verify sender is actually connected to this campaign
    const senderConn = await getItem<ConnectionRecord>(
      CONNECTIONS_TABLE,
      keys.connection(senderConnectionId)
    );
    if (!senderConn || senderConn.campaignId !== campaignId) {
      console.warn("WS dice_roll: sender not authorized for campaignId", {
        senderConnectionId,
        campaignId,
      });
      return { statusCode: 403 };
    }

    // Query all connections for this campaign
    const campaignConnections = await queryItems<CampaignConnectionIndexRecord>(
      CONNECTIONS_TABLE,
      "PK = :pk AND begins_with(SK, :prefix)",
      {
        ":pk":     `CAMPAIGN#${campaignId}`,
        ":prefix": "CONNECTION#",
      }
    );

    // Build the outbound payload
    const outboundPayload = JSON.stringify({ type: "dice_roll", result });

    // Resolve API Gateway management endpoint
    const wsEndpoint =
      process.env["WS_API_ENDPOINT"] ??
      `https://${event.requestContext.apiId}.execute-api.us-east-1.amazonaws.com/${event.requestContext.stage}`;

    const mgmtClient = new ApiGatewayManagementApiClient({ endpoint: wsEndpoint });

    // Fan out to every connection (including the sender — echo is fine for OBS)
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
            // Stale connection — clean up campaign index + metadata records
            console.info("WS dice_roll: cleaning stale connection", { targetConnId });
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

    // Log non-GoneException failures without aborting
    for (const res of fanOutResults) {
      if (res.status === "rejected") {
        console.error("WS dice_roll: fan-out error", res.reason);
      }
    }

    console.info("WS dice_roll sent", {
      campaignId,
      senderConnectionId,
      recipientCount: campaignConnections.length,
    });

    return { statusCode: 200 };
  } catch (err: unknown) {
    console.error("WS dice_roll error", err);
    return { statusCode: 500 };
  }
};
