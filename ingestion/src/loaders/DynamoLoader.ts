// ingestion/src/loaders/DynamoLoader.ts
// DynamoDB write utilities for the Daggerheart ingestion pipeline.
//
// Exports:
//   batchUpsert(tableName, items)  – chunk into 25-item batches, retry
//                                    unprocessed items with exponential back-off
//   upsertItem(tableName, item)    – single PutItem for low-volume writes
//
// Retry policy for batchUpsert:
//   Max retries : 5 (6 total attempts)
//   Back-off    : 100, 200, 400, 800, 1600 ms  (base 100 ms, factor 2×)
//
// Environment variables:
//   DYNAMODB_REGION    AWS region (default: us-east-1)
//   DYNAMODB_ENDPOINT  Override endpoint URL (e.g. for DynamoDB Local / LocalStack)

import {
  DynamoDBClient,
  type DynamoDBClientConfig,
} from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  BatchWriteCommand,
  type BatchWriteCommandInput,
  PutCommand,
  ScanCommand,
  type ScanCommandInput,
} from "@aws-sdk/lib-dynamodb";

// ─── Client singleton ─────────────────────────────────────────────────────────

function buildClient(): DynamoDBDocumentClient {
  const region =
    process.env["DYNAMODB_REGION"] ??
    process.env["AWS_REGION"] ??
    process.env["AWS_DEFAULT_REGION"] ??
    "us-east-1";

  const config: DynamoDBClientConfig = { region };

  // Support DynamoDB Local and LocalStack for development/CI
  const endpoint = process.env["DYNAMODB_ENDPOINT"];
  if (endpoint) {
    config.endpoint = endpoint;
  }

  // Explicitly pass credentials from environment if both key vars are present.
  // This is necessary when running via npm scripts in WSL where env vars from
  // the outer shell may not propagate to the spawned Windows node process.
  const accessKeyId = process.env["AWS_ACCESS_KEY_ID"];
  const secretAccessKey = process.env["AWS_SECRET_ACCESS_KEY"];
  const sessionToken = process.env["AWS_SESSION_TOKEN"];
  if (accessKeyId && secretAccessKey) {
    config.credentials = {
      accessKeyId,
      secretAccessKey,
      ...(sessionToken ? { sessionToken } : {}),
    };
  }

  console.log(`[DynamoLoader] Building client with region="${region}" endpoint="${endpoint ?? "(default)"}"`);

  const rawClient = new DynamoDBClient(config);
  return DynamoDBDocumentClient.from(rawClient, {
    marshallOptions: {
      // Omit undefined values rather than failing to serialize them
      removeUndefinedValues: true,
      // Serialize class instances as plain maps
      convertClassInstanceToMap: true,
    },
  });
}

let _client: DynamoDBDocumentClient | null = null;

function getClient(): DynamoDBDocumentClient {
  if (!_client) _client = buildClient();
  return _client;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Split `arr` into consecutive sub-arrays of at most `size` elements. */
function chunk<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

/** Pause execution for `ms` milliseconds. */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── Public types ─────────────────────────────────────────────────────────────

/** Result returned by `batchUpsert` describing what happened during the write. */
export interface LoadResult {
  tableName: string;
  totalItems: number;
  successCount: number;
  errorCount: number;
  errors: string[];
}

// ─── batchUpsert ─────────────────────────────────────────────────────────────

/**
 * Batch-upsert items into a DynamoDB table using `BatchWriteItem`.
 *
 * DynamoDB's `BatchWriteItem` API accepts at most 25 `PutRequest` entries per
 * call.  This function:
 *   1. Splits `items` into chunks of 25.
 *   2. For each chunk, calls `BatchWriteCommand`.
 *   3. If the response contains `UnprocessedItems`, retries those items with
 *      exponential back-off (base 100 ms, ×2 per retry, max 5 retries).
 *   4. Hard errors (SDK exceptions) abort the current batch immediately;
 *      remaining items in that batch are counted as failures.
 *
 * @param tableName  Target DynamoDB table name.
 * @param items      Plain objects; `DynamoDBDocumentClient` handles marshalling.
 * @returns          A `LoadResult` describing success/failure counts.
 */
export async function batchUpsert(
  tableName: string,
  items: Record<string, unknown>[]
): Promise<LoadResult> {
  const client = getClient();
  const result: LoadResult = {
    tableName,
    totalItems: items.length,
    successCount: 0,
    errorCount: 0,
    errors: [],
  };

  if (items.length === 0) {
    console.log(`[DynamoLoader] No items to write to "${tableName}".`);
    return result;
  }

  console.log(
    `[DynamoLoader] Writing ${items.length} item(s) to "${tableName}" ` +
      `in batches of 25...`
  );

  const MAX_ATTEMPTS = 6; // 1 initial + 5 retries
  const BASE_DELAY_MS = 100;
  const batches = chunk(items, 25);

  for (let batchIdx = 0; batchIdx < batches.length; batchIdx++) {
    const batchNum = batchIdx + 1;
    type PutRequestItem = { PutRequest: { Item: Record<string, unknown> } };
    let pending: PutRequestItem[] = batches[batchIdx].map((item) => ({
      PutRequest: { Item: item },
    }));

    let attempt = 0;

    while (pending.length > 0 && attempt < MAX_ATTEMPTS) {
      if (attempt > 0) {
        const delayMs = BASE_DELAY_MS * Math.pow(2, attempt - 1);
        console.log(
          `[DynamoLoader] Batch ${batchNum}/${batches.length}: ` +
            `retrying ${pending.length} unprocessed item(s) ` +
            `(attempt ${attempt + 1}/${MAX_ATTEMPTS}, wait ${delayMs} ms)...`
        );
        await sleep(delayMs);
      }

      const input: BatchWriteCommandInput = {
        RequestItems: {
          [tableName]: pending,
        },
      };

      try {
        const response = await client.send(new BatchWriteCommand(input));
        const unprocessed =
          (response.UnprocessedItems?.[tableName] as PutRequestItem[] | undefined) ?? [];

        const processedCount = pending.length - unprocessed.length;
        result.successCount += processedCount;
        pending = unprocessed;

        if (pending.length === 0) {
          console.log(
            `[DynamoLoader] Batch ${batchNum}/${batches.length}: ` +
              `${processedCount} item(s) written successfully.`
          );
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(
          `[DynamoLoader] BatchWrite error on batch ${batchNum}, ` +
            `attempt ${attempt + 1}: ${message}`
        );
        result.errorCount += pending.length;
        result.errors.push(
          `Batch ${batchNum} attempt ${attempt + 1}: ${message}`
        );
        // Hard error — abort this batch
        pending = [];
        break;
      }

      attempt++;
    }

    // Retry budget exhausted without completing
    if (pending.length > 0) {
      const msg =
        `Batch ${batchNum}: ${pending.length} item(s) failed ` +
        `after ${MAX_ATTEMPTS} attempts`;
      console.error(`[DynamoLoader] ${msg}`);
      result.errorCount += pending.length;
      result.errors.push(msg);
    }
  }

  console.log(
    `[DynamoLoader] "${tableName}": ` +
      `${result.successCount} written, ${result.errorCount} failed.`
  );

  return result;
}

// ─── upsertItem ───────────────────────────────────────────────────────────────

/**
 * Upsert a single item into a DynamoDB table using `PutItem`.
 *
 * Throws on failure so the caller can handle or surface the error.
 *
 * @param tableName  Target DynamoDB table name.
 * @param item       Plain object to write.
 */
export async function upsertItem(
  tableName: string,
  item: Record<string, unknown>
): Promise<void> {
  const client = getClient();
  try {
    await client.send(
      new PutCommand({
        TableName: tableName,
        Item: item,
      })
    );
    console.log(`[DynamoLoader] Upserted 1 item to "${tableName}".`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(
      `[DynamoLoader] Failed to upsert item to "${tableName}": ${message}`
    );
    throw err;
  }
}

// ─── scanAllKeys ──────────────────────────────────────────────────────────────

/**
 * Scan a DynamoDB table and return all PK+SK pairs that match an optional
 * filter expression.  Uses pagination to handle tables larger than 1 MB.
 *
 * @param tableName        Target DynamoDB table name.
 * @param filterExpression Optional DynamoDB filter expression string.
 * @param expressionAttributeValues Optional map of expression attribute values.
 * @returns Array of `{ PK, SK }` objects.
 */
export async function scanAllKeys(
  tableName: string,
  filterExpression?: string,
  expressionAttributeValues?: Record<string, unknown>
): Promise<Array<{ PK: string; SK: string }>> {
  const client = getClient();
  const keys: Array<{ PK: string; SK: string }> = [];
  let lastEvaluatedKey: Record<string, unknown> | undefined;

  do {
    const input: ScanCommandInput = {
      TableName: tableName,
      ProjectionExpression: "PK, SK",
      ...(filterExpression ? { FilterExpression: filterExpression } : {}),
      ...(expressionAttributeValues
        ? { ExpressionAttributeValues: expressionAttributeValues }
        : {}),
      ...(lastEvaluatedKey ? { ExclusiveStartKey: lastEvaluatedKey } : {}),
    };

    const response = await client.send(new ScanCommand(input));
    for (const item of response.Items ?? []) {
      if (typeof item["PK"] === "string" && typeof item["SK"] === "string") {
        keys.push({ PK: item["PK"] as string, SK: item["SK"] as string });
      }
    }
    lastEvaluatedKey = response.LastEvaluatedKey as
      | Record<string, unknown>
      | undefined;
  } while (lastEvaluatedKey);

  return keys;
}

// ─── batchDelete ─────────────────────────────────────────────────────────────

/**
 * Batch-delete items from a DynamoDB table by PK+SK key pairs.
 *
 * Mirrors `batchUpsert` in chunking and retry behaviour.
 *
 * @param tableName  Target DynamoDB table name.
 * @param keys       Array of `{ PK, SK }` key pairs to delete.
 * @returns          A `LoadResult` describing success/failure counts.
 */
export async function batchDelete(
  tableName: string,
  keys: Array<{ PK: string; SK: string }>
): Promise<LoadResult> {
  const client = getClient();
  const result: LoadResult = {
    tableName,
    totalItems: keys.length,
    successCount: 0,
    errorCount: 0,
    errors: [],
  };

  if (keys.length === 0) {
    console.log(`[DynamoLoader] No items to delete from "${tableName}".`);
    return result;
  }

  console.log(
    `[DynamoLoader] Deleting ${keys.length} item(s) from "${tableName}" ` +
      `in batches of 25...`
  );

  const MAX_ATTEMPTS = 6;
  const BASE_DELAY_MS = 100;

  type DeleteRequestItem = {
    DeleteRequest: { Key: { PK: string; SK: string } };
  };

  const batches = chunk(keys, 25);

  for (let batchIdx = 0; batchIdx < batches.length; batchIdx++) {
    const batchNum = batchIdx + 1;
    let pending: DeleteRequestItem[] = batches[batchIdx].map((key) => ({
      DeleteRequest: { Key: key },
    }));

    let attempt = 0;

    while (pending.length > 0 && attempt < MAX_ATTEMPTS) {
      if (attempt > 0) {
        const delayMs = BASE_DELAY_MS * Math.pow(2, attempt - 1);
        console.log(
          `[DynamoLoader] Delete batch ${batchNum}/${batches.length}: ` +
            `retrying ${pending.length} unprocessed item(s) ` +
            `(attempt ${attempt + 1}/${MAX_ATTEMPTS}, wait ${delayMs} ms)...`
        );
        await sleep(delayMs);
      }

      const input: BatchWriteCommandInput = {
        RequestItems: {
          [tableName]: pending,
        },
      };

      try {
        const response = await client.send(new BatchWriteCommand(input));
        const unprocessed =
          (response.UnprocessedItems?.[tableName] as
            | DeleteRequestItem[]
            | undefined) ?? [];

        const processedCount = pending.length - unprocessed.length;
        result.successCount += processedCount;
        pending = unprocessed;

        if (pending.length === 0) {
          console.log(
            `[DynamoLoader] Delete batch ${batchNum}/${batches.length}: ` +
              `${processedCount} item(s) deleted successfully.`
          );
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(
          `[DynamoLoader] BatchDelete error on batch ${batchNum}, ` +
            `attempt ${attempt + 1}: ${message}`
        );
        result.errorCount += pending.length;
        result.errors.push(
          `Batch ${batchNum} attempt ${attempt + 1}: ${message}`
        );
        pending = [];
        break;
      }

      attempt++;
    }

    if (pending.length > 0) {
      const msg =
        `Delete batch ${batchNum}: ${pending.length} item(s) failed ` +
        `after ${MAX_ATTEMPTS} attempts`;
      console.error(`[DynamoLoader] ${msg}`);
      result.errorCount += pending.length;
      result.errors.push(msg);
    }
  }

  console.log(
    `[DynamoLoader] "${tableName}": ` +
      `${result.successCount} deleted, ${result.errorCount} failed.`
  );

  return result;
}
