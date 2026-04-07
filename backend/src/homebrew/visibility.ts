// backend/src/homebrew/visibility.ts
// Resolves which homebrew content a given user is allowed to see.
//
// Visibility rules:
//   1. Users always see their own homebrew content.
//   2. Users see homebrew content from GMs of campaigns they belong to.
//
// Resolution algorithm:
//   Step 1: Query campaigns the user belongs to (userId-index GSI on campaigns table).
//   Step 2: For each campaign, query MEMBER#GM#* items to find GM userIds.
//   Step 3: Deduplicate GM userIds (union with the requesting user's own userId).
//   Step 4: For each visible creatorUserId, query their homebrew items via
//           the creator-index GSI on each game-data table.
//
// Caching:
//   A simple in-memory TTL cache avoids redundant DynamoDB queries within the
//   same Lambda container for repeat requests. Cache is per-user, 5 minute TTL.

import {
  CAMPAIGNS_TABLE,
  queryItems,
} from "../common/dynamodb";

// ─── Types ────────────────────────────────────────────────────────────────────

interface CampaignMemberGsiRecord {
  userId_gsi: string;
  campaignId_gsi: string;
  role?: string;
}

interface CampaignMemberRecord {
  PK: string;
  SK: string;
  userId: string;
  role: string;
}

// ─── In-Memory Cache ──────────────────────────────────────────────────────────

interface CacheEntry {
  visibleCreatorIds: string[];
  expiresAt: number;
}

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const visibilityCache = new Map<string, CacheEntry>();

function getCachedVisibility(userId: string): string[] | null {
  const entry = visibilityCache.get(userId);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    visibilityCache.delete(userId);
    return null;
  }
  return entry.visibleCreatorIds;
}

function setCachedVisibility(userId: string, creatorIds: string[]): void {
  visibilityCache.set(userId, {
    visibleCreatorIds: creatorIds,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Resolve the set of creatorUserIds whose homebrew content is visible to
 * the given userId.  Always includes the userId themselves.
 *
 * @returns Array of creatorUserIds (deduplicated, always includes `userId`).
 */
export async function resolveVisibleCreatorIds(
  userId: string
): Promise<string[]> {
  // Check cache first
  const cached = getCachedVisibility(userId);
  if (cached) return cached;

  const creatorIds = new Set<string>([userId]);

  try {
    // Step 1: Get all campaigns the user belongs to via the userId-index GSI.
    const campaignMemberships = await queryItems<CampaignMemberGsiRecord>(
      CAMPAIGNS_TABLE,
      "userId_gsi = :userId",
      { ":userId": userId },
      undefined, // expressionAttributeNames
      "userId-index" // indexName
    );

    // Step 2: For each campaign, find the GM(s).
    // We query the campaign PK for MEMBER#GM# items.
    const gmQueries = campaignMemberships.map(async (membership) => {
      const campaignId = membership.campaignId_gsi;
      const members = await queryItems<CampaignMemberRecord>(
        CAMPAIGNS_TABLE,
        "PK = :pk AND begins_with(SK, :skPrefix)",
        {
          ":pk": `CAMPAIGN#${campaignId}`,
          ":skPrefix": "MEMBER#GM#",
        }
      );
      for (const member of members) {
        creatorIds.add(member.userId);
      }
    });

    await Promise.all(gmQueries);
  } catch (err) {
    // If campaign queries fail, fall back to user's own content only.
    // This is a graceful degradation — the user still sees their own homebrew.
    console.warn(
      "[visibility] Failed to resolve campaign GM visibility, falling back to own content only:",
      err
    );
  }

  const result = Array.from(creatorIds);
  setCachedVisibility(userId, result);
  return result;
}

/**
 * Query all homebrew items created by a specific user from a single table,
 * using the creator-index GSI (PK: creatorUserId, SK: updatedAt).
 *
 * Returns the raw DynamoDB items (untyped).
 */
export async function queryHomebrewByCreator<T = Record<string, unknown>>(
  tableName: string,
  creatorUserId: string
): Promise<T[]> {
  return queryItems<T>(
    tableName,
    "creatorUserId = :creator",
    { ":creator": creatorUserId },
    undefined,
    "creator-index"
  );
}

/**
 * Query visible homebrew items from a table for a given user.
 * Combines items from all visible creators (the user + their campaign GMs).
 *
 * @param tableName      The DynamoDB table to query.
 * @param userId         The requesting user's ID.
 * @param contentFilter  Optional function to filter results after fetching.
 * @returns Array of homebrew items visible to the user.
 */
export async function queryVisibleHomebrew<T = Record<string, unknown>>(
  tableName: string,
  userId: string,
  contentFilter?: (item: T) => boolean
): Promise<T[]> {
  const creatorIds = await resolveVisibleCreatorIds(userId);

  // Query each creator's homebrew in parallel
  const perCreatorResults = await Promise.all(
    creatorIds.map((creatorId) =>
      queryHomebrewByCreator<T>(tableName, creatorId)
    )
  );

  let items = perCreatorResults.flat();

  if (contentFilter) {
    items = items.filter(contentFilter);
  }

  return items;
}

/**
 * Clear the visibility cache for a specific user.
 * Call this when the user's campaign membership changes.
 */
export function clearVisibilityCache(userId?: string): void {
  if (userId) {
    visibilityCache.delete(userId);
  } else {
    visibilityCache.clear();
  }
}
