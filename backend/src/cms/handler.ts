// backend/src/cms/handler.ts
// Lambda handler for all /cms/* routes.
// Route dispatch pattern on event.routeKey (HTTP API v2).
//
// Public routes (no auth):
//   GET /cms/{type}              — list active items of a type, sorted by order
//
// Protected routes (Cognito JWT required):
//   POST /cms/presign            — generate a pre-signed S3 PUT URL for a CMS image
//   GET /cms/{type}/all          — list ALL items (active + inactive) for admin
//   POST /cms/{type}             — create a new CMS item
//   PUT /cms/{type}/{id}         — update an existing item
//   DELETE /cms/{type}/{id}      — delete an item
//   POST /cms/{type}/{id}/activate   — set active=true
//   POST /cms/{type}/{id}/deactivate — set active=false

import type {
  APIGatewayProxyEventV2WithJWTAuthorizer,
  APIGatewayProxyResultV2,
} from "aws-lambda";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import {
  AppError,
  createSuccessResponse,
  createErrorResponse,
  parseBody,
  requirePathParam,
  withErrorHandling,
} from "../common/middleware";
import {
  CMS_TABLE,
  getItem,
  putItem,
  deleteItem,
  queryItems,
} from "../common/dynamodb";
import type { CmsContent, CmsContentType } from "@shared/types";

// ─── S3 Client ────────────────────────────────────────────────────────────────

const s3Client = new S3Client({
  region: process.env["DYNAMODB_REGION"] ?? process.env["AWS_REGION"] ?? "us-east-1",
});

const MEDIA_BUCKET = process.env["S3_MEDIA_BUCKET"] ?? "daggerheart-media";
const CDN_DOMAIN = process.env["CDN_DOMAIN"] ?? "cdn.example.com";
// Pre-signed URL validity — 10 minutes (CMS admin is trusted, less time pressure)
const PRESIGN_EXPIRY_SECONDS = 600;
// Max CMS image size: 10 MB
const MAX_CMS_IMAGE_BYTES = 10 * 1024 * 1024;

const ALLOWED_CMS_CONTENT_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

// ─── Constants ────────────────────────────────────────────────────────────────

const VALID_TYPES: CmsContentType[] = ["interstitial", "splash"];

// ─── Zod Schemas ──────────────────────────────────────────────────────────────

// (CmsTypeSchema removed; type validation is handled by validateType() helper below)

const CreateCmsItemSchema = z.object({
  title: z.string().min(1, "title is required").max(200),
  body: z.string().min(1, "body is required"),
  imageKey: z.string().nullable().default(null),
  active: z.boolean().default(true),
  order: z.number().int().min(0).default(0),
});

const UpdateCmsItemSchema = z.object({
  title: z.string().min(1).max(200),
  body: z.string().min(1),
  imageKey: z.string().nullable(),
  active: z.boolean(),
  order: z.number().int().min(0),
});

const PresignSchema = z.object({
  filename: z.string().min(1).max(255),
  contentType: z.enum(ALLOWED_CMS_CONTENT_TYPES),
});

// ─── DynamoDB Record Shape ────────────────────────────────────────────────────

interface CmsRecord extends CmsContent {
  PK: string;
  SK: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildImageUrl(imageKey: string | null): string | null {
  if (!imageKey) return null;
  const cdnBase =
    process.env["CDN_BASE_URL"] ??
    `https://${CDN_DOMAIN}`;
  return `${cdnBase}/${imageKey}`;
}

function validateType(raw: string | undefined): CmsContentType {
  if (!raw || !VALID_TYPES.includes(raw as CmsContentType)) {
    throw AppError.badRequest(
      `Invalid CMS type. Must be one of: ${VALID_TYPES.join(", ")}`
    );
  }
  return raw as CmsContentType;
}

function toResponse(record: CmsRecord): CmsContent {
  return {
    id: record.id,
    type: record.type,
    title: record.title,
    body: record.body,
    imageKey: record.imageKey,
    imageUrl: record.imageUrl,
    active: record.active,
    order: record.order,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

// ─── Route Handlers — Protected ───────────────────────────────────────────────

/**
 * POST /cms/presign
 * Generate a pre-signed S3 PUT URL for a CMS image upload.
 * The key is always under cms/images/ to keep CMS assets separate from user media.
 * Returns: { uploadUrl, s3Key, imageKey, cdnUrl, expiresIn }
 */
async function presignCmsImage(
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> {
  const { filename, contentType } = parseBody(event, PresignSchema);

  // Derive a clean file extension from the original filename
  const lastDot = filename.lastIndexOf(".");
  const ext = lastDot >= 0 ? filename.slice(lastDot + 1).toLowerCase() : "bin";

  const imageId = uuidv4();
  const s3Key = `cms/images/${imageId}.${ext}`;
  const cdnUrl = `https://${CDN_DOMAIN}/${s3Key}`;

  const putCommand = new PutObjectCommand({
    Bucket: MEDIA_BUCKET,
    Key: s3Key,
    ContentType: contentType,
    ContentLengthRange: [1, MAX_CMS_IMAGE_BYTES],
  } as ConstructorParameters<typeof PutObjectCommand>[0]);

  const uploadUrl = await getSignedUrl(s3Client, putCommand, {
    expiresIn: PRESIGN_EXPIRY_SECONDS,
  });

  return createSuccessResponse(
    { uploadUrl, s3Key, imageKey: s3Key, cdnUrl, expiresIn: PRESIGN_EXPIRY_SECONDS },
    201
  );
}

// ─── Route Handlers — Public ──────────────────────────────────────────────────

/**
 * GET /cms/{type}
 * Returns all ACTIVE items of the given type, sorted by order ascending.
 */
async function listActiveItems(
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> {
  const type = validateType(event.pathParameters?.["type"]);

  const items = await queryItems<CmsRecord>(
    CMS_TABLE,
    "PK = :pk AND begins_with(SK, :skPrefix)",
    { ":pk": `CMS#${type}`, ":skPrefix": "ITEM#" }
  );

  const active = items
    .filter((i) => i.active)
    .sort((a, b) => a.order - b.order)
    .map(toResponse);

  return createSuccessResponse({ items: active });
}

// ─── Route Handlers — Protected ───────────────────────────────────────────────

/**
 * GET /cms/{type}/all
 * Returns ALL items (active + inactive) for admin use.
 */
async function listAllItems(
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> {
  const type = validateType(event.pathParameters?.["type"]);

  const items = await queryItems<CmsRecord>(
    CMS_TABLE,
    "PK = :pk AND begins_with(SK, :skPrefix)",
    { ":pk": `CMS#${type}`, ":skPrefix": "ITEM#" }
  );

  const sorted = items.sort((a, b) => a.order - b.order).map(toResponse);

  return createSuccessResponse({ items: sorted });
}

/**
 * POST /cms/{type}
 * Create a new CMS item.
 */
async function createItem(
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> {
  const type = validateType(event.pathParameters?.["type"]);
  const input = parseBody(event, CreateCmsItemSchema);

  const id = uuidv4();
  const now = new Date().toISOString();

  const record: CmsRecord = {
    PK: `CMS#${type}`,
    SK: `ITEM#${id}`,
    id,
    type,
    title: input.title,
    body: input.body,
    imageKey: (input.imageKey ?? null) as string | null,
    imageUrl: buildImageUrl((input.imageKey ?? null) as string | null),
    active: input.active ?? true,
    order: input.order ?? 0,
    createdAt: now,
    updatedAt: now,
  };

  await putItem({
    TableName: CMS_TABLE,
    Item: record,
    ConditionExpression: "attribute_not_exists(PK) AND attribute_not_exists(SK)",
  });

  return createSuccessResponse(toResponse(record), 201);
}

/**
 * PUT /cms/{type}/{id}
 * Full update of an existing CMS item.
 */
async function updateItem(
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> {
  const type = validateType(event.pathParameters?.["type"]);
  const id = requirePathParam(event, "id");
  const input = parseBody(event, UpdateCmsItemSchema);

  const existing = await getItem<CmsRecord>({
    TableName: CMS_TABLE,
    Key: { PK: `CMS#${type}`, SK: `ITEM#${id}` },
  });
  if (!existing) throw AppError.notFound("CmsItem", id);

  const now = new Date().toISOString();

  const updated: CmsRecord = {
    ...existing,
    title: input.title,
    body: input.body,
    imageKey: (input.imageKey ?? null) as string | null,
    imageUrl: buildImageUrl((input.imageKey ?? null) as string | null),
    active: input.active ?? true,
    order: input.order ?? 0,
    updatedAt: now,
  };

  await putItem({
    TableName: CMS_TABLE,
    Item: updated,
    ConditionExpression: "attribute_exists(PK) AND attribute_exists(SK)",
  });

  return createSuccessResponse(toResponse(updated));
}

/**
 * DELETE /cms/{type}/{id}
 * Delete a CMS item.
 */
async function deleteItemHandler(
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> {
  const type = validateType(event.pathParameters?.["type"]);
  const id = requirePathParam(event, "id");

  const existing = await getItem<CmsRecord>({
    TableName: CMS_TABLE,
    Key: { PK: `CMS#${type}`, SK: `ITEM#${id}` },
  });
  if (!existing) throw AppError.notFound("CmsItem", id);

  await deleteItem({
    TableName: CMS_TABLE,
    Key: { PK: `CMS#${type}`, SK: `ITEM#${id}` },
    ConditionExpression: "attribute_exists(PK)",
  });

  return { statusCode: 204, body: "" };
}

/**
 * POST /cms/{type}/{id}/activate
 * Set active=true on a CMS item.
 */
async function activateItem(
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> {
  return setActive(event, true);
}

/**
 * POST /cms/{type}/{id}/deactivate
 * Set active=false on a CMS item.
 */
async function deactivateItem(
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> {
  return setActive(event, false);
}

async function setActive(
  event: APIGatewayProxyEventV2WithJWTAuthorizer,
  active: boolean
): Promise<APIGatewayProxyResultV2> {
  const type = validateType(event.pathParameters?.["type"]);
  const id = requirePathParam(event, "id");

  const existing = await getItem<CmsRecord>({
    TableName: CMS_TABLE,
    Key: { PK: `CMS#${type}`, SK: `ITEM#${id}` },
  });
  if (!existing) throw AppError.notFound("CmsItem", id);

  const updated: CmsRecord = {
    ...existing,
    active,
    updatedAt: new Date().toISOString(),
  };

  await putItem({
    TableName: CMS_TABLE,
    Item: updated,
    ConditionExpression: "attribute_exists(PK) AND attribute_exists(SK)",
  });

  return createSuccessResponse(toResponse(updated));
}

// ─── Route Dispatcher ─────────────────────────────────────────────────────────

export const handler = withErrorHandling(
  async (
    event: APIGatewayProxyEventV2WithJWTAuthorizer
  ): Promise<APIGatewayProxyResultV2> => {
    const routeKey = event.routeKey;

    switch (routeKey) {
      // Public
      case "GET /cms/{type}":
        return listActiveItems(event);

      // Protected — admin
      case "POST /cms/presign":
        return presignCmsImage(event);
      case "GET /cms/{type}/all":
        return listAllItems(event);
      case "POST /cms/{type}":
        return createItem(event);
      case "PUT /cms/{type}/{id}":
        return updateItem(event);
      case "DELETE /cms/{type}/{id}":
        return deleteItemHandler(event);
      case "POST /cms/{type}/{id}/activate":
        return activateItem(event);
      case "POST /cms/{type}/{id}/deactivate":
        return deactivateItem(event);

      default:
        return createErrorResponse("NOT_FOUND", "Route not found", 404);
    }
  }
);
