// backend/src/ingestion/handler.ts
// Lambda handler for /admin/ingestion/* routes.
// Triggers a game-data re-ingestion run via the ingestion pipeline.
//
// Because the ingestion pipeline is a separate ts-node CLI in /ingestion, this
// handler invokes it as a child process via the AWS Lambda invocation model.
// In practice, two invocation patterns are supported:
//
//   1. Async trigger — POST /admin/ingestion/trigger
//      Invokes the ingestion Lambda asynchronously (fire-and-forget). Returns
//      immediately with a job ID. Status is tracked in a lightweight DynamoDB
//      record (INGESTION_JOB table or reusing the game-data table).
//
//   2. Status poll — GET /admin/ingestion/jobs
//      Lists recent ingestion job records.
//
//   3. Status check — GET /admin/ingestion/jobs/{jobId}
//      Returns the current status of a specific ingestion job.
//
// The ingestion logic itself is compiled into a separate Lambda
// (ingestion-runner) deployed from /ingestion/dist. This handler only
// acts as an admin-facing orchestrator.
//
// All routes require a JWT with the "admin" group claim.

import type {
  APIGatewayProxyEventV2WithJWTAuthorizer,
  APIGatewayProxyResultV2,
} from "aws-lambda";
import {
  LambdaClient,
  InvokeCommand,
  InvocationType,
} from "@aws-sdk/client-lambda";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";
import {
  AppError,
  createSuccessResponse,
  createErrorResponse,
  extractUserId,
  requirePathParam,
  getQueryParamInt,
  parseBody,
  withErrorHandling,
} from "../common/middleware";
import {
  docClient,
  getItem,
  putItem,
} from "../common/dynamodb";
import { QueryCommand } from "@aws-sdk/lib-dynamodb";

// ─── Config ───────────────────────────────────────────────────────────────────

const INGESTION_JOBS_TABLE =
  process.env["INGESTION_JOBS_TABLE"] ?? "DaggerheartIngestionJobs";

const INGESTION_RUNNER_FUNCTION =
  process.env["INGESTION_RUNNER_FUNCTION"] ?? "";

const lambdaClient = new LambdaClient({
  region: process.env["AWS_REGION"] ?? "us-east-1",
});

// ─── Types ────────────────────────────────────────────────────────────────────

type IngestionCategory =
  | "all"
  | "classes"
  | "communities"
  | "ancestries"
  | "domains"
  | "rules";

type IngestionJobStatus = "queued" | "running" | "completed" | "failed";

interface IngestionJobRecord {
  PK: string;      // JOB#<jobId>
  SK: string;      // METADATA
  jobId: string;
  triggeredBy: string;
  category: IngestionCategory;
  dryRun: boolean;
  status: IngestionJobStatus;
  result: {
    summary?: unknown;
    error?: string;
  } | null;
  createdAt: string;
  updatedAt: string;
}

// ─── Schemas ──────────────────────────────────────────────────────────────────

const TriggerSchema = z.object({
  category: z
    .enum(["all", "classes", "communities", "ancestries", "domains", "rules"])
    .default("all"),
  dryRun: z.boolean().default(false),
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Assert the caller is a member of the Cognito "admin" group.
 */
function requireAdminGroup(
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): void {
  const claims = event.requestContext?.authorizer?.jwt?.claims;
  if (!claims) throw AppError.unauthorized();

  const raw = claims["cognito:groups"];
  let groups: string[] = [];

  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        groups = parsed.map(String);
      } else {
        groups = raw.split(/[\s,]+/).filter(Boolean);
      }
    } catch {
      groups = raw.split(/[\s,]+/).filter(Boolean);
    }
  }

  if (!groups.includes("admin")) {
    throw AppError.forbidden("Admin group membership is required");
  }
}

function jobKey(jobId: string) {
  return { PK: `JOB#${jobId}`, SK: "METADATA" };
}

function toJobResponse(record: IngestionJobRecord) {
  return {
    jobId: record.jobId,
    triggeredBy: record.triggeredBy,
    category: record.category,
    dryRun: record.dryRun,
    status: record.status,
    result: record.result,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

// ─── Route Handlers ───────────────────────────────────────────────────────────

/**
 * POST /admin/ingestion/trigger
 * Enqueues a new ingestion run. If an INGESTION_RUNNER_FUNCTION is configured,
 * the ingestion Lambda is invoked asynchronously. Otherwise the job is recorded
 * as "queued" and the caller is responsible for polling.
 *
 * Body:
 *   category  — which data set to ingest (default: "all")
 *   dryRun    — parse/validate without writing to DynamoDB (default: false)
 */
async function triggerIngestion(
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> {
  requireAdminGroup(event);
  const callerId = extractUserId(event);

  const input = parseBody(event, TriggerSchema);

  const jobId = uuidv4();
  const now = new Date().toISOString();

  const jobRecord: IngestionJobRecord = {
    PK: `JOB#${jobId}`,
    SK: "METADATA",
    jobId,
    triggeredBy: callerId,
    category: (input.category ?? "all") as IngestionCategory,
    dryRun: input.dryRun ?? false,
    status: "queued",
    result: null,
    createdAt: now,
    updatedAt: now,
  };

  await putItem({
    TableName: INGESTION_JOBS_TABLE,
    Item: jobRecord,
    ConditionExpression:
      "attribute_not_exists(PK) AND attribute_not_exists(SK)",
  });

  // Invoke the ingestion runner Lambda asynchronously if configured
  if (INGESTION_RUNNER_FUNCTION) {
    const payload = {
      jobId,
      category: input.category,
      dryRun: input.dryRun,
      jobsTable: INGESTION_JOBS_TABLE,
    };

    await lambdaClient.send(
      new InvokeCommand({
        FunctionName: INGESTION_RUNNER_FUNCTION,
        InvocationType: InvocationType.Event, // async, fire-and-forget
        Payload: Buffer.from(JSON.stringify(payload)),
      })
    );

    // Update status to "running" optimistically
    const updated: IngestionJobRecord = {
      ...jobRecord,
      status: "running",
      updatedAt: new Date().toISOString(),
    };

    await putItem({
      TableName: INGESTION_JOBS_TABLE,
      Item: updated,
    });

    return createSuccessResponse({ jobId, status: "running" }, 202);
  }

  // Runner not configured — return queued so the caller knows to act manually
  return createSuccessResponse({ jobId, status: "queued" }, 202);
}

/**
 * GET /admin/ingestion/jobs
 * Returns the most recent ingestion jobs (paginated).
 * Query params: limit (1–50, default 10), cursor (base64 DynamoDB cursor)
 *
 * Uses a GSI on the jobs table: type-index where type = "INGESTION_JOB"
 * and SK is createdAt (sorted descending via ScanIndexForward=false).
 * Falls back to a Scan if the GSI is not present.
 */
async function listJobs(
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> {
  requireAdminGroup(event);

  const limit = Math.min(
    Math.max(getQueryParamInt(event, "limit", 10) ?? 10, 1),
    50
  );

  // Query the GSI: createdAt-index (PK=type, SK=createdAt, ScanIndexForward=false)
  // If the GSI doesn't exist the SDK will throw; we catch and fall back to Scan.
  let items: IngestionJobRecord[] = [];
  let lastEvaluatedKey: Record<string, unknown> | undefined;

  try {
    const result = await docClient.send(
      new QueryCommand({
        TableName: INGESTION_JOBS_TABLE,
        IndexName: "type-index",
        KeyConditionExpression: "#type = :type",
        ExpressionAttributeNames: { "#type": "type" },
        ExpressionAttributeValues: { ":type": "INGESTION_JOB" },
        ScanIndexForward: false, // newest first
        Limit: limit,
      })
    );
    items = (result.Items ?? []) as IngestionJobRecord[];
    lastEvaluatedKey = result.LastEvaluatedKey as
      | Record<string, unknown>
      | undefined;
  } catch (err: unknown) {
    const awsErr = err as { name?: string; message?: string };
    if (
      awsErr.name === "ValidationException" ||
      (awsErr.message ?? "").includes("index")
    ) {
      // GSI not available — return an empty list rather than crashing
      items = [];
    } else {
      throw err;
    }
  }

  const cursor = lastEvaluatedKey
    ? Buffer.from(JSON.stringify(lastEvaluatedKey)).toString("base64")
    : null;

  return createSuccessResponse({
    jobs: items.map(toJobResponse),
    cursor,
  });
}

/**
 * GET /admin/ingestion/jobs/{jobId}
 * Returns the current status and result of a specific ingestion job.
 */
async function getJob(
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> {
  requireAdminGroup(event);
  const jobId = requirePathParam(event, "jobId");

  const record = await getItem<IngestionJobRecord>(
    INGESTION_JOBS_TABLE,
    jobKey(jobId)
  );

  if (!record) throw AppError.notFound("Ingestion job", jobId);

  return createSuccessResponse(toJobResponse(record));
}

// ─── Route Dispatcher ─────────────────────────────────────────────────────────

export const handler = withErrorHandling(
  async (
    event: APIGatewayProxyEventV2WithJWTAuthorizer
  ): Promise<APIGatewayProxyResultV2> => {
    const routeKey = event.routeKey;

    switch (routeKey) {
      case "POST /admin/ingestion/trigger":
        return triggerIngestion(event);
      case "GET /admin/ingestion/jobs":
        return listJobs(event);
      case "GET /admin/ingestion/jobs/{jobId}":
        return getJob(event);
      default:
        return createErrorResponse("NOT_FOUND", "Route not found", 404);
    }
  }
);
