// backend/src/websocket/disconnect.ts
// WebSocket $disconnect handler.
// Deletes both DynamoDB items that were created on $connect:
//   CONNECTION#{connectionId} / METADATA
//   CHARACTER#{characterId}  / CONNECTION#{connectionId}

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
  connectedAt: string;
  ttl: number;
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export const handler = async (
  event: APIGatewayProxyWebsocketEventV2
): Promise<APIGatewayProxyResultV2> => {
  try {
    const connectionId = event.requestContext.connectionId;

    // Fetch connection metadata to find the characterId
    const connRecord = await getItem<ConnectionRecord>(
      CONNECTIONS_TABLE,
      keys.connection(connectionId)
    );

    if (connRecord) {
      const { characterId } = connRecord;

      // Delete the character→connection reverse index item
      await deleteItem(
        CONNECTIONS_TABLE,
        keys.characterConnection(characterId, connectionId)
      );
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
