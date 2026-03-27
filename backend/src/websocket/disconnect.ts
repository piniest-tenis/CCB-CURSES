// backend/src/websocket/disconnect.ts
// WebSocket $disconnect handler.
// Deletes all DynamoDB items that were created on $connect:
//   CONNECTION#{connectionId} / METADATA
//   CAMPAIGN#{campaignId}    / CONNECTION#{connectionId}  (all connections)
//   CHARACTER#{characterId}  / CONNECTION#{connectionId}  (player connections only)

import type {
  APIGatewayProxyWebsocketEventV2,
  APIGatewayProxyResultV2,
} from "aws-lambda";
import {
  CONNECTIONS_TABLE,
  getItem,
  deleteItem,
  keys,
} from "../common/dynamodb";

// ─── Internal record type ─────────────────────────────────────────────────────

interface ConnectionRecord {
  PK: string;
  SK: string;
  connectionId: string;
  userId: string;
  campaignId: string;
  characterId: string;
  role?: "player" | "obs";
  connectedAt: string;
  ttl: number;
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export const handler = async (
  event: APIGatewayProxyWebsocketEventV2
): Promise<APIGatewayProxyResultV2> => {
  try {
    const connectionId = event.requestContext.connectionId;

    // Fetch connection metadata to find campaignId and characterId
    const connRecord = await getItem<ConnectionRecord>(
      CONNECTIONS_TABLE,
      keys.connection(connectionId)
    );

    if (connRecord) {
      const { campaignId, characterId, role } = connRecord;

      const cleanupOps: Promise<void>[] = [];

      // Always delete the campaign→connection fan-out index record
      if (campaignId) {
        cleanupOps.push(
          deleteItem(CONNECTIONS_TABLE, keys.campaignConnection(campaignId, connectionId))
        );
      }

      // Delete the character→connection reverse index for player connections
      if (role !== "obs" && characterId && characterId !== "OBS") {
        cleanupOps.push(
          deleteItem(CONNECTIONS_TABLE, keys.characterConnection(characterId, connectionId))
        );
      }

      await Promise.allSettled(cleanupOps);
    }
    // If connection metadata is missing (TTL-expired or race), we still
    // delete the metadata record below (no-op if already gone).

    // Always attempt to delete the connection metadata record
    await deleteItem(CONNECTIONS_TABLE, keys.connection(connectionId));

    console.info("WS $disconnect success", { connectionId });
    return { statusCode: 200 };
  } catch (err: unknown) {
    console.error("WS $disconnect error", err);
    // Return 200 regardless — API Gateway ignores the response for $disconnect
    return { statusCode: 200 };
  }
};
