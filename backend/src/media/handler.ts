// backend/src/media/handler.ts
// Lambda handler for /media/* routes.
// Handles pre-signed S3 URL generation, upload confirmation, and deletion.

import type {
  APIGatewayProxyEventV2WithJWTAuthorizer,
  APIGatewayProxyResultV2,
} from "aws-lambda";
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";
import {
  AppError,
  createSuccessResponse,
  createNoContentResponse,
  createErrorResponse,
  extractUserId,
  parseBody,
  requirePathParam,
  withErrorHandling,
} from "../common/middleware";
import {
  getItem,
  putItem,
  updateItem,
  deleteItem,
  queryItems,
  MEDIA_TABLE,
  keys,
} from "../common/dynamodb";
import type { MediaLinkType } from "@shared/types";

// ─── S3 Client ────────────────────────────────────────────────────────────────

const s3Client = new S3Client({
  region: process.env["DYNAMODB_REGION"] ?? process.env["AWS_REGION"] ?? "us-east-1",
});

const MEDIA_BUCKET = process.env["S3_MEDIA_BUCKET"] ?? "daggerheart-media";
const CDN_BASE_URL =
  process.env["CDN_BASE_URL"] ?? "https://cdn.curses-ccb.example.com";
// Pre-signed URL validity window (5 minutes)
const PRESIGN_EXPIRY_SECONDS = 300;
// Maximum allowed file size: 5 MB
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

// ─── Allowed MIME Types ───────────────────────────────────────────────────────

const ALLOWED_CONTENT_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

type AllowedContentType = (typeof ALLOWED_CONTENT_TYPES)[number];

// ─── Zod Schemas ──────────────────────────────────────────────────────────────

const PresignSchema = z.object({
  filename: z.string().min(1).max(255),
  contentType: z.enum(ALLOWED_CONTENT_TYPES),
  linkedTo: z.object({
    type: z.enum(["character", "user"]),
    id: z.string().uuid(),
  }),
});

// ─── DynamoDB Record Shape ────────────────────────────────────────────────────

interface MediaDynamoRecord {
  PK: string;
  SK: string;
  mediaId: string;
  userId: string;
  s3Key: string;
  contentType: AllowedContentType;
  filename: string;
  linkedTo: { type: MediaLinkType; id: string };
  cdnUrl: string | null;
  status: "pending" | "confirmed";
  createdAt: string;
  updatedAt: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function extractFileExtension(filename: string): string {
  const lastDot = filename.lastIndexOf(".");
  if (lastDot < 0) return "";
  return filename.slice(lastDot + 1).toLowerCase();
}

function buildS3Key(userId: string, mediaId: string, filename: string): string {
  const ext = extractFileExtension(filename);
  return ext
    ? `media/${userId}/${mediaId}.${ext}`
    : `media/${userId}/${mediaId}`;
}

function buildCdnUrl(s3Key: string): string {
  return `${CDN_BASE_URL}/${s3Key}`;
}

// ─── Route Handlers ───────────────────────────────────────────────────────────

/**
 * POST /media/presign
 * Generate a pre-signed S3 PUT URL and create a pending DynamoDB record.
 */
async function presignUpload(
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> {
  const userId = extractUserId(event);
  const { filename, contentType, linkedTo } = parseBody(event, PresignSchema);

  const mediaId = uuidv4();
  const s3Key = buildS3Key(userId, mediaId, filename);
  const now = new Date().toISOString();

  // Build the pre-signed PUT command
  const putCommand = new PutObjectCommand({
    Bucket: MEDIA_BUCKET,
    Key: s3Key,
    ContentType: contentType,
    ContentLengthRange: [1, MAX_FILE_SIZE_BYTES],
    Metadata: {
      "x-userid": userId,
      "x-mediaid": mediaId,
    },
  } as ConstructorParameters<typeof PutObjectCommand>[0]);

  const uploadUrl = await getSignedUrl(s3Client, putCommand, {
    expiresIn: PRESIGN_EXPIRY_SECONDS,
  });

  // Write pending record to DynamoDB
  const record: MediaDynamoRecord = {
    PK: `USER#${userId}`,
    SK: `MEDIA#${mediaId}`,
    mediaId,
    userId,
    s3Key,
    contentType,
    filename,
    linkedTo: {
      type: linkedTo.type as MediaLinkType,
      id: linkedTo.id,
    },
    cdnUrl: null,
    status: "pending",
    createdAt: now,
    updatedAt: now,
  };

  await putItem({
    TableName: MEDIA_TABLE,
    Item: record,
  });

  return createSuccessResponse(
    {
      mediaId,
      uploadUrl,
      s3Key,
      expiresIn: PRESIGN_EXPIRY_SECONDS,
    },
    201
  );
}

/**
 * POST /media/{mediaId}/confirm
 * Verify the S3 object exists via HeadObject, mark the record as confirmed,
 * and return the CDN URL. Idempotent — safe to call multiple times.
 */
async function confirmUpload(
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> {
  const userId = extractUserId(event);
  const mediaId = requirePathParam(event, "mediaId");

  const record = await getItem<MediaDynamoRecord>({
    TableName: MEDIA_TABLE,
    Key: keys.media(userId, mediaId),
  });

  if (!record) throw AppError.notFound("Media record", mediaId);
  if (record.userId !== userId) throw AppError.forbidden();

  if (record.status === "confirmed" && record.cdnUrl) {
    // Already confirmed — idempotent
    return createSuccessResponse({ mediaId, cdnUrl: record.cdnUrl });
  }

  // Verify the S3 object actually exists
  try {
    await s3Client.send(
      new HeadObjectCommand({
        Bucket: MEDIA_BUCKET,
        Key: record.s3Key,
      })
    );
  } catch (err: unknown) {
    const awsErr = err as {
      name?: string;
      $metadata?: { httpStatusCode?: number };
    };
    if (
      awsErr.name === "NotFound" ||
      awsErr.$metadata?.httpStatusCode === 404
    ) {
      throw AppError.badRequest(
        "Upload not found in S3. Please re-upload the file."
      );
    }
    throw err;
  }

  const cdnUrl = buildCdnUrl(record.s3Key);
  const now = new Date().toISOString();

  await updateItem({
    TableName: MEDIA_TABLE,
    Key: keys.media(userId, mediaId),
    UpdateExpression:
      "SET #status = :status, cdnUrl = :cdnUrl, updatedAt = :now",
    ExpressionAttributeNames: { "#status": "status" },
    ExpressionAttributeValues: {
      ":status": "confirmed",
      ":cdnUrl": cdnUrl,
      ":now": now,
    },
    ConditionExpression: "attribute_exists(PK)",
  });

  return createSuccessResponse({ mediaId, cdnUrl });
}

/**
 * DELETE /media/{mediaId}
 * Delete the S3 object and remove the DynamoDB record.
 * S3 deletion is best-effort — DynamoDB record is always deleted.
 */
async function deleteMedia(
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> {
  const userId = extractUserId(event);
  const mediaId = requirePathParam(event, "mediaId");

  const record = await getItem<MediaDynamoRecord>({
    TableName: MEDIA_TABLE,
    Key: keys.media(userId, mediaId),
  });

  if (!record) throw AppError.notFound("Media record", mediaId);
  if (record.userId !== userId) throw AppError.forbidden();

  // Delete S3 object (best effort — don't fail if already gone)
  try {
    await s3Client.send(
      new DeleteObjectCommand({
        Bucket: MEDIA_BUCKET,
        Key: record.s3Key,
      })
    );
  } catch (err: unknown) {
    console.warn("Failed to delete S3 object:", record.s3Key, err);
  }

  // Delete DynamoDB record unconditionally
  await deleteItem({
    TableName: MEDIA_TABLE,
    Key: keys.media(userId, mediaId),
    ConditionExpression: "attribute_exists(PK)",
  });

  return createNoContentResponse();
}

/**
 * GET /media
 * Returns all confirmed media records for the authenticated user.
 */
async function listMedia(
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> {
  const userId = extractUserId(event);

  const records = await queryItems<MediaDynamoRecord>(
    MEDIA_TABLE,
    "PK = :pk AND begins_with(SK, :skPrefix)",
    { ":pk": `USER#${userId}`, ":skPrefix": "MEDIA#" }
  );

  // Only surface confirmed uploads — pending records are transient
  const confirmed = records
    .filter((r) => r.status === "confirmed")
    .map(({ PK: _PK, SK: _SK, ...rest }) => rest);

  return createSuccessResponse({ media: confirmed });
}

/**
 * GET /media/{mediaId}
 * Returns a single media record by ID.
 */
async function getMedia(
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> {
  const userId = extractUserId(event);
  const mediaId = requirePathParam(event, "mediaId");

  const record = await getItem<MediaDynamoRecord>({
    TableName: MEDIA_TABLE,
    Key: keys.media(userId, mediaId),
  });

  if (!record) throw AppError.notFound("Media record", mediaId);
  if (record.userId !== userId) throw AppError.forbidden();

  const { PK: _PK, SK: _SK, ...rest } = record;
  return createSuccessResponse(rest);
}

// ─── Route Dispatcher ─────────────────────────────────────────────────────────

export const handler = withErrorHandling(
  async (
    event: APIGatewayProxyEventV2WithJWTAuthorizer
  ): Promise<APIGatewayProxyResultV2> => {
    const routeKey = event.routeKey;

    switch (routeKey) {
      case "GET /media":
        return listMedia(event);
      case "GET /media/{mediaId}":
        return getMedia(event);
      case "POST /media/presign":
        return presignUpload(event);
      case "POST /media/{mediaId}/confirm":
        return confirmUpload(event);
      case "DELETE /media/{mediaId}":
        return deleteMedia(event);
      default:
        return createErrorResponse("NOT_FOUND", "Route not found", 404);
    }
  }
);
