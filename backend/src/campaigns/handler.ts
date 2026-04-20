// backend/src/campaigns/handler.ts
// Lambda handler for all /campaigns/* and /invites/* routes.
// Route dispatch pattern on event.routeKey (HTTP API v2).

import { randomBytes } from "crypto";
import { v4 as uuidv4 } from "uuid";
import type {
  APIGatewayProxyEventV2WithJWTAuthorizer,
  APIGatewayProxyResultV2,
} from "aws-lambda";
import { z } from "zod";
import {
  AppError,
  createSuccessResponse,
  extractUserId,
  parseBody,
  requirePathParam,
  withErrorHandling,
} from "../common/middleware";
import {
  CAMPAIGNS_TABLE,
  CHARACTERS_TABLE,
  USERS_TABLE,
  getItem,
  putItem,
  updateItem,
  deleteItem,
  queryItems,
  keys,
} from "../common/dynamodb";
import {
  signCampaignShareToken,
  verifyCampaignShareToken,
  signShareToken,
} from "../characters/helpers";
import type {
  Campaign,
  CampaignMemberRole,
  CampaignSummary,
  CampaignDetail,
  CampaignMemberDetail,
  CampaignCharacterDetail,
  CampaignInvite,
  Character,
} from "@shared/types";
import {
  PREGEN_CHARACTERS,
  scalePregenToLevel,
} from "@shared/data/pregenCharacters";

// ─── Internal DynamoDB Record Types ──────────────────────────────────────────

interface CampaignRecord extends Campaign {
  PK: string;
  SK: string; // "METADATA"
}

interface CampaignMemberRecord {
  PK: string;
  SK: string; // "MEMBER#GM#{userId}" or "MEMBER#PLAYER#{userId}"
  campaignId: string;
  userId: string;
  role: CampaignMemberRole;
  joinedAt: string;
  // GSI fields
  userId_gsi: string; // = userId, used as GSI PK on userId-index
  campaignId_gsi: string; // = campaignId, used as GSI SK on userId-index
}

interface CampaignCharacterRecord {
  PK: string;
  SK: string; // "CHARACTER#{characterId}"
  campaignId: string;
  characterId: string;
  userId: string; // character owner
  addedAt: string;
}

interface CampaignInviteRecord {
  PK: string;
  SK: string; // "INVITE#{inviteCode}"
  campaignId: string;
  inviteCode: string;
  createdByUserId: string;
  maxUses: number | null;
  useCount: number;
  expiresAt: string | null;
  grantRole: CampaignMemberRole;
  createdAt: string;
  ttl?: number; // Unix epoch seconds — DynamoDB TTL
  // GSI field
  inviteCode_gsi: string; // = inviteCode, used as GSI PK on inviteCode-index
}

interface UserCampaignIndexRecord {
  PK: string; // "USER#{userId}"
  SK: string; // "CAMPAIGN#{campaignId}"
  userId: string;
  campaignId: string;
  role: CampaignMemberRole;
  joinedAt: string;
}

interface CharacterRecord {
  PK: string;
  SK: string;
  characterId: string;
  userId: string;
  name: string;
  classId: string;
  className: string;
  level: number;
  avatarKey?: string | null;
  portraitKey?: string | null;
  avatarUrl?: string | null;
  portraitUrl?: string | null;
  campaignId?: string | null;
}

interface UserRecord {
  PK: string;
  SK: string;
  userId: string;
  displayName: string;
  avatarUrl?: string | null;
}

// ─── DynamoDB partition item union (for buildCampaignDetail) ─────────────────

type CampaignPartitionItem =
  | (CampaignRecord & { SK: string })
  | (CampaignMemberRecord & { SK: string })
  | (CampaignCharacterRecord & { SK: string })
  | (CampaignInviteRecord & { SK: string });

// ─── Zod Schemas ──────────────────────────────────────────────────────────────

const CreateCampaignSchema = z.object({
  name: z.string().min(1, "Name is required").max(80, "Name must be 80 characters or fewer"),
  description: z.string().max(500).nullable().optional().default(null),
});

const SessionSlotSchema = z.object({
  day: z.enum(["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]),
  time: z.string().regex(/^\d{2}:\d{2}$/).nullable(),
  timezone: z.string().max(60).nullable(),
  description: z.string().max(200).nullable(),
});

const SessionScheduleSchema = z.object({
  frequency: z.enum(["weekly", "biweekly", "monthly"]),
  slots: z.array(SessionSlotSchema).min(1).max(7),
  reminderOffsetMinutes: z.number().int().min(0).max(10080), // max 1 week
  reminderEnabled: z.boolean(),
});

const PatchCampaignSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  description: z.string().max(500).nullable().optional(),
  schedule: SessionScheduleSchema.nullable().optional(),
  /** GM Fear counter (SRD). Clamped 0–12. */
  fear: z.number().int().min(0).max(12).optional(),
  /** Whether this campaign uses the Curses! campaign frame. */
  cursesContentEnabled: z.boolean().optional(),
  /** Restrict new characters joining to a specific level (1–10). Null to remove. */
  requiredLevel: z.number().int().min(1).max(10).nullable().optional(),
});

const CreateInviteSchema = z.object({
  maxUses: z.number().int().min(1).nullable().optional().default(null),
  expiresAt: z.string().datetime().nullable().optional().default(null),
  grantRole: z.enum(["gm", "player"] as const).default("player"),
});

const PatchMemberSchema = z.object({
  role: z.enum(["gm", "player"]),
});

const AddCharacterSchema = z.object({
  characterId: z.string().uuid("characterId must be a valid UUID"),
  // Optional: the character owner's userId. When supplied by an admin on behalf
  // of a player, this is used as the DynamoDB PK for the character lookup.
  ownerUserId: z.string().optional(),
});

// ─── Helper: compute nextSessionAt from SessionSchedule ──────────────────────

const DAY_ORDER: Record<string, number> = {
  sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
  thursday: 4, friday: 5, saturday: 6,
};

function computeNextSessionAt(
  schedule: import("@shared/types").SessionSchedule | null | undefined,
  fromMs: number = Date.now()
): string | null {
  if (!schedule || schedule.slots.length === 0) return null;

  let earliest: Date | null = null;

  for (const slot of schedule.slots) {
    const targetDow = DAY_ORDER[slot.day];
    if (targetDow === undefined) continue;

    // Parse time, defaulting to 00:00 if missing
    const [hh, mm] = (slot.time ?? "00:00").split(":").map(Number);

    // Start from today in the given timezone (or UTC as fallback)
    const tz = slot.timezone ?? "UTC";
    const now = new Date(fromMs);

    // Build a candidate date by finding the next occurrence of targetDow
    for (let dayOffset = 0; dayOffset <= 7; dayOffset++) {
      const candidate = new Date(now.getTime() + dayOffset * 86_400_000);

      // Get the candidate's wall-clock day of week in the target timezone
      let candidateDow: number;
      try {
        const parts = new Intl.DateTimeFormat("en-US", {
          timeZone: tz,
          weekday: "short",
        }).formatToParts(candidate);
        const wdStr = parts.find((p) => p.type === "weekday")?.value ?? "";
        const WD: Record<string, number> = {
          Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
        };
        candidateDow = WD[wdStr] ?? -1;
      } catch {
        // Intl not available or bad timezone — fall back to UTC
        candidateDow = candidate.getUTCDay();
      }

      if (candidateDow !== targetDow) continue;

      // Build ISO string for "this day at HH:MM in tz"
      try {
        const dateParts = new Intl.DateTimeFormat("en-CA", {
          timeZone: tz,
          year: "numeric", month: "2-digit", day: "2-digit",
        }).formatToParts(candidate);
        const year  = dateParts.find((p) => p.type === "year")?.value  ?? "1970";
        const month = dateParts.find((p) => p.type === "month")?.value ?? "01";
        const day   = dateParts.find((p) => p.type === "day")?.value   ?? "01";
        const h = String(hh ?? 0).padStart(2, "0");
        const m = String(mm ?? 0).padStart(2, "0");
        const isoLocal = `${year}-${month}-${day}T${h}:${m}:00`;
        // Convert local time to UTC via a dummy Date parse trick
        const utcMs = new Date(
          new Intl.DateTimeFormat("en-US", {
            timeZone: tz,
            year: "numeric", month: "2-digit", day: "2-digit",
            hour: "2-digit", minute: "2-digit", second: "2-digit",
            hour12: false,
          }).format(new Date(`${isoLocal}Z`))
        ).getTime();
        // A more reliable approach: offset calculation
        const localMs = new Date(isoLocal).getTime();
        const offsetMs = new Date(
          new Date(isoLocal + "Z").toLocaleString("en-US", { timeZone: tz })
        ).getTime() - new Date(isoLocal + "Z").getTime();
        void utcMs; // unused path above
        const sessionUtcMs = localMs - offsetMs;
        if (sessionUtcMs > fromMs) {
          const sessionDate = new Date(sessionUtcMs);
          if (earliest === null || sessionDate < earliest) {
            earliest = sessionDate;
          }
          break;
        }
      } catch {
        // Fallback: treat time as UTC
        const candidateUtc = new Date(candidate);
        candidateUtc.setUTCHours(hh ?? 0, mm ?? 0, 0, 0);
        if (candidateUtc.getTime() > fromMs) {
          if (earliest === null || candidateUtc < earliest) {
            earliest = candidateUtc;
          }
          break;
        }
      }
    }
  }

  return earliest ? earliest.toISOString() : null;
}

// ─── Helper: generate invite code ─────────────────────────────────────────────

function generateInviteCode(): string {
  // 12 random bytes → base64url → 16 chars
  return randomBytes(12).toString("base64url");
}

// ─── Helper: assert campaign membership ───────────────────────────────────────

async function assertCampaignMember(
  campaignId: string,
  userId: string
): Promise<CampaignMemberRecord> {
  // Try GM first, then Player
  const gmRecord = await getItem<CampaignMemberRecord>(
    CAMPAIGNS_TABLE,
    keys.campaignMember(campaignId, "GM", userId)
  );
  if (gmRecord) return gmRecord;

  const playerRecord = await getItem<CampaignMemberRecord>(
    CAMPAIGNS_TABLE,
    keys.campaignMember(campaignId, "PLAYER", userId)
  );
  if (playerRecord) return playerRecord;

  throw AppError.forbidden("You are not a member of this campaign");
}

// ─── Helper: assert GM role ───────────────────────────────────────────────────

async function assertCampaignGm(
  campaignId: string,
  userId: string
): Promise<CampaignMemberRecord> {
  const record = await getItem<CampaignMemberRecord>(
    CAMPAIGNS_TABLE,
    keys.campaignMember(campaignId, "GM", userId)
  );
  if (!record) {
    throw AppError.forbidden("You must be a GM of this campaign");
  }
  return record;
}

// ─── Helper: assert primary GM ───────────────────────────────────────────────

function assertPrimaryGm(
  campaignId: string,
  userId: string,
  campaign: CampaignRecord
): void {
  // campaignId unused directly but included for signature clarity
  void campaignId;
  if (campaign.primaryGmId !== userId) {
    throw AppError.forbidden("Only the primary GM can perform this action");
  }
}

// ─── Helper: fetch campaign (throws 404) ──────────────────────────────────────

async function getCampaignOrThrow(campaignId: string): Promise<CampaignRecord> {
  const campaign = await getItem<CampaignRecord>(
    CAMPAIGNS_TABLE,
    keys.campaign(campaignId)
  );
  if (!campaign) {
    throw AppError.notFound("Campaign", campaignId);
  }
  return campaign;
}

// ─── Helper: build full campaign detail ──────────────────────────────────────

async function buildCampaignDetail(
  campaignId: string,
  callerUserId: string
): Promise<CampaignDetail> {
  // Query all items in the campaign partition
  const allItems = await queryItems<CampaignPartitionItem>(
    CAMPAIGNS_TABLE,
    "PK = :pk",
    { ":pk": `CAMPAIGN#${campaignId}` }
  );

  let campaignMeta: CampaignRecord | null = null;
  const memberRecords: CampaignMemberRecord[] = [];
  const characterRecords: CampaignCharacterRecord[] = [];
  const inviteRecords: CampaignInviteRecord[] = [];

  for (const item of allItems) {
    if (item.SK === "METADATA") {
      campaignMeta = item as CampaignRecord;
    } else if (item.SK.startsWith("MEMBER#")) {
      memberRecords.push(item as CampaignMemberRecord);
    } else if (item.SK.startsWith("CHARACTER#")) {
      characterRecords.push(item as CampaignCharacterRecord);
    } else if (item.SK.startsWith("INVITE#")) {
      inviteRecords.push(item as CampaignInviteRecord);
    }
  }

  if (!campaignMeta) {
    throw AppError.notFound("Campaign", campaignId);
  }

  // Determine caller's role
  const callerMember = memberRecords.find((m) => m.userId === callerUserId) ?? null;
  const callerRole: CampaignMemberRole | null = callerMember?.role ?? null;

  // Collect all unique userIds to batch-fetch profiles
  const userIds = [...new Set(memberRecords.map((m) => m.userId))];

  // Fetch user profiles (parallel)
  const userProfiles = await Promise.all(
    userIds.map((uid) =>
      getItem<UserRecord>(USERS_TABLE, keys.user(uid)).then(
        (profile) => ({ uid, profile })
      )
    )
  );
  const userMap = new Map<string, UserRecord | null>(
    userProfiles.map(({ uid, profile }) => [uid, profile])
  );

  // Build character→member map (characterId → userId)
  const characterToUser = new Map<string, string>(
    characterRecords.map((cr) => [cr.characterId, cr.userId])
  );
  // Build member→character map (userId → characterId)
  const userToCharacter = new Map<string, string>();
  for (const cr of characterRecords) {
    userToCharacter.set(cr.userId, cr.characterId);
  }

  // Fetch character records for detail enrichment
  const characterDetails: CampaignCharacterDetail[] = [];
  for (const cr of characterRecords) {
    // Characters are stored under USER#{userId}/CHARACTER#{characterId}
    const charRecord = await getItem<CharacterRecord>(
      CHARACTERS_TABLE,
      { PK: `USER#${cr.userId}`, SK: `CHARACTER#${cr.characterId}` }
    );
    if (charRecord) {
      characterDetails.push({
        characterId: cr.characterId,
        userId: cr.userId,
        name: charRecord.name,
        className: charRecord.className,
        level: charRecord.level,
        avatarUrl: charRecord.avatarUrl ?? null,
        portraitUrl: charRecord.portraitUrl ?? null,
      });
    }
  }

  // Build member details
  const members: CampaignMemberDetail[] = memberRecords.map((m) => {
    const profile = userMap.get(m.userId);
    return {
      userId: m.userId,
      displayName: profile?.displayName ?? m.userId,
      avatarUrl: profile?.avatarUrl ?? null,
      role: m.role,
      joinedAt: m.joinedAt,
      characterId: userToCharacter.get(m.userId) ?? null,
    };
  });

  // Build response — only include invites for GMs
  const isGm = callerRole === "gm";

  const detail: CampaignDetail = {
    campaignId: campaignMeta.campaignId,
    name: campaignMeta.name,
    description: campaignMeta.description,
    primaryGmId: campaignMeta.primaryGmId,
    schedule: campaignMeta.schedule ?? null,
    createdAt: campaignMeta.createdAt,
    updatedAt: campaignMeta.updatedAt,
    currentFear: campaignMeta.currentFear ?? 0,
    cursesContentEnabled: campaignMeta.cursesContentEnabled ?? true,
    requiredLevel: campaignMeta.requiredLevel ?? null,
    members,
    characters: characterDetails,
    callerRole,
    ...(isGm
      ? {
          invites: inviteRecords.map((inv) => ({
            campaignId: inv.campaignId,
            inviteCode: inv.inviteCode,
            createdByUserId: inv.createdByUserId,
            maxUses: inv.maxUses,
            useCount: inv.useCount,
            expiresAt: inv.expiresAt,
            grantRole: inv.grantRole,
            createdAt: inv.createdAt,
          })),
        }
      : {}),
  };

  // suppress unused warning
  void characterToUser;

  return detail;
}

// ─── Helper: handoff or dissolve campaign ────────────────────────────────────

async function handoffOrDissolve(
  campaignId: string,
  departingUserId: string
): Promise<void> {
  // Query all GM members
  const gmItems = await queryItems<CampaignMemberRecord>(
    CAMPAIGNS_TABLE,
    "PK = :pk AND begins_with(SK, :prefix)",
    {
      ":pk": `CAMPAIGN#${campaignId}`,
      ":prefix": "MEMBER#GM#",
    }
  );

  // Exclude the departing user and sort by joinedAt ascending
  const remainingGms = gmItems
    .filter((m) => m.userId !== departingUserId)
    .sort((a, b) => a.joinedAt.localeCompare(b.joinedAt));

  if (remainingGms.length > 0) {
    // Promote the earliest-joined GM to primary GM
    const newPrimaryGm = remainingGms[0]!;
    const now = new Date().toISOString();
    await updateItem(
      CAMPAIGNS_TABLE,
      keys.campaign(campaignId),
      "SET primaryGmId = :uid, updatedAt = :now",
      { ":uid": newPrimaryGm.userId, ":now": now }
    );
  } else {
    // No GMs remain — check for any members (players could be promoted)
    const playerItems = await queryItems<CampaignMemberRecord>(
      CAMPAIGNS_TABLE,
      "PK = :pk AND begins_with(SK, :prefix)",
      {
        ":pk": `CAMPAIGN#${campaignId}`,
        ":prefix": "MEMBER#PLAYER#",
      }
    );

    const remainingPlayers = playerItems
      .filter((m) => m.userId !== departingUserId)
      .sort((a, b) => a.joinedAt.localeCompare(b.joinedAt));

    if (remainingPlayers.length > 0) {
      // Promote the earliest player to GM and then to primary GM
      const newPrimary = remainingPlayers[0]!;
      const now = new Date().toISOString();

      // Write new GM member record
      await putItem(CAMPAIGNS_TABLE, {
        ...keys.campaignMember(campaignId, "GM", newPrimary.userId),
        campaignId,
        userId: newPrimary.userId,
        role: "gm" as CampaignMemberRole,
        joinedAt: newPrimary.joinedAt,
        userId_gsi: newPrimary.userId,
        campaignId_gsi: campaignId,
      });

      // Delete old player record
      await deleteItem(
        CAMPAIGNS_TABLE,
        keys.campaignMember(campaignId, "PLAYER", newPrimary.userId)
      );

      // Update user-campaign index role
      await updateItem(
        CAMPAIGNS_TABLE,
        keys.userCampaignIndex(newPrimary.userId, campaignId),
        "SET #role = :role",
        { ":role": "gm" },
        { "#role": "role" }
      );

      // Update campaign metadata
      await updateItem(
        CAMPAIGNS_TABLE,
        keys.campaign(campaignId),
        "SET primaryGmId = :uid, updatedAt = :now",
        { ":uid": newPrimary.userId, ":now": now }
      );
    } else {
      // No members remain — delete the campaign METADATA
      await deleteItem(CAMPAIGNS_TABLE, keys.campaign(campaignId));
    }
  }
}

// ─── Helper: remove a member and their character from a campaign ──────────────

async function removeMemberAndCharacter(
  campaignId: string,
  targetUserId: string,
  targetRole: CampaignMemberRole
): Promise<void> {
  // Remove member record
  await deleteItem(
    CAMPAIGNS_TABLE,
    keys.campaignMember(campaignId, targetRole.toUpperCase(), targetUserId)
  );

  // Remove user-campaign index
  await deleteItem(
    CAMPAIGNS_TABLE,
    keys.userCampaignIndex(targetUserId, campaignId)
  );

  // Find and remove character assignment
  const characterItems = await queryItems<CampaignCharacterRecord>(
    CAMPAIGNS_TABLE,
    "PK = :pk AND begins_with(SK, :prefix)",
    {
      ":pk": `CAMPAIGN#${campaignId}`,
      ":prefix": "CHARACTER#",
    }
  );

  const ownedCharacters = characterItems.filter((c) => c.userId === targetUserId);
  for (const charRecord of ownedCharacters) {
    // Remove campaign assignment record
    await deleteItem(
      CAMPAIGNS_TABLE,
      keys.campaignCharacter(campaignId, charRecord.characterId)
    );

    // Clear campaignId on the character record in CHARACTERS_TABLE
    await updateItem(
      CHARACTERS_TABLE,
      { PK: `USER#${targetUserId}`, SK: `CHARACTER#${charRecord.characterId}` },
      "SET campaignId = :null, updatedAt = :now",
      { ":null": null, ":now": new Date().toISOString() }
    );
  }
}

// ─── Route Handlers ───────────────────────────────────────────────────────────

// GET /campaigns — list caller's campaigns
async function listCampaigns(
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> {
  const userId = extractUserId(event);

  // Query the user-campaign index items
  const indexItems = await queryItems<UserCampaignIndexRecord>(
    CAMPAIGNS_TABLE,
    "PK = :pk AND begins_with(SK, :prefix)",
    {
      ":pk": `USER#${userId}`,
      ":prefix": "CAMPAIGN#",
    }
  );

  // Fetch each campaign in parallel
  const campaigns = await Promise.all(
    indexItems.map(async (idx) => {
      const campaign = await getItem<CampaignRecord>(
        CAMPAIGNS_TABLE,
        keys.campaign(idx.campaignId)
      );
      if (!campaign) return null;

      // Count members
      const members = await queryItems<CampaignMemberRecord>(
        CAMPAIGNS_TABLE,
        "PK = :pk AND begins_with(SK, :prefix)",
        {
          ":pk": `CAMPAIGN#${idx.campaignId}`,
          ":prefix": "MEMBER#",
        }
      );

      // Find caller's character in this campaign
      const charItems = await queryItems<CampaignCharacterRecord>(
        CAMPAIGNS_TABLE,
        "PK = :pk AND begins_with(SK, :prefix)",
        {
          ":pk": `CAMPAIGN#${idx.campaignId}`,
          ":prefix": "CHARACTER#",
        }
      );
      const callerChar = charItems.find((c) => c.userId === userId);

      const summary: CampaignSummary = {
        campaignId: campaign.campaignId,
        name: campaign.name,
        description: campaign.description,
        primaryGmId: campaign.primaryGmId,
        schedule: campaign.schedule ?? null,
        createdAt: campaign.createdAt,
        updatedAt: campaign.updatedAt,
        cursesContentEnabled: campaign.cursesContentEnabled ?? true,
        requiredLevel: campaign.requiredLevel ?? null,
        memberCount: members.length,
        callerRole: idx.role,
        callerCharacterId: callerChar?.characterId ?? null,
        nextSessionAt: computeNextSessionAt(campaign.schedule),
      };
      return summary;
    })
  );

  return createSuccessResponse(campaigns.filter(Boolean));
}

// POST /campaigns — create a new campaign
async function createCampaign(
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> {
  const userId = extractUserId(event);
  const body = parseBody(event, CreateCampaignSchema);

  const campaignId = uuidv4();
  const now = new Date().toISOString();

  const campaignRecord: CampaignRecord = {
    PK: `CAMPAIGN#${campaignId}`,
    SK: "METADATA",
    campaignId,
    name: body.name,
    description: body.description ?? null,
    schedule: null,
    primaryGmId: userId,
    createdAt: now,
    updatedAt: now,
  };

  const memberRecord: CampaignMemberRecord = {
    PK: `CAMPAIGN#${campaignId}`,
    SK: `MEMBER#GM#${userId}`,
    campaignId,
    userId,
    role: "gm",
    joinedAt: now,
    userId_gsi: userId,
    campaignId_gsi: campaignId,
  };

  const indexRecord: UserCampaignIndexRecord = {
    PK: `USER#${userId}`,
    SK: `CAMPAIGN#${campaignId}`,
    userId,
    campaignId,
    role: "gm",
    joinedAt: now,
  };

  // Write all three atomically (DynamoDB doesn't support multi-item transactions
  // without TransactWrite — use sequential puts; if one fails the Lambda retries)
  await putItem(CAMPAIGNS_TABLE, campaignRecord as unknown as Record<string, unknown>);
  await putItem(CAMPAIGNS_TABLE, memberRecord as unknown as Record<string, unknown>);
  await putItem(CAMPAIGNS_TABLE, indexRecord as unknown as Record<string, unknown>);

  return createSuccessResponse({ ...campaignRecord }, 201);
}

// GET /campaigns/{campaignId} — full detail
async function getCampaign(
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> {
  const userId = extractUserId(event);
  const campaignId = requirePathParam(event, "campaignId");

  // Verify membership
  await assertCampaignMember(campaignId, userId);

  const detail = await buildCampaignDetail(campaignId, userId);
  return createSuccessResponse(detail);
}

// PATCH /campaigns/{campaignId} — update name/description (GM only)
async function patchCampaign(
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> {
  const userId = extractUserId(event);
  const campaignId = requirePathParam(event, "campaignId");
  const body = parseBody(event, PatchCampaignSchema);

  // Must be a GM
  await assertCampaignGm(campaignId, userId);

  const now = new Date().toISOString();
  const updates: string[] = ["updatedAt = :now"];
  const vals: Record<string, unknown> = { ":now": now };
  const names: Record<string, string> = {};

  if (body.name !== undefined) {
    updates.push("#n = :name");
    vals[":name"] = body.name;
    names["#n"] = "name";
  }
  if (body.description !== undefined) {
    updates.push("description = :desc");
    vals[":desc"] = body.description;
  }
  if (body.schedule !== undefined) {
    updates.push("schedule = :schedule");
    vals[":schedule"] = body.schedule;
  }
  if (body.fear !== undefined) {
    updates.push("currentFear = :fear");
    vals[":fear"] = body.fear;
  }
  if (body.cursesContentEnabled !== undefined) {
    updates.push("cursesContentEnabled = :cursesContent");
    vals[":cursesContent"] = body.cursesContentEnabled;
  }
  if (body.requiredLevel !== undefined) {
    updates.push("requiredLevel = :requiredLevel");
    vals[":requiredLevel"] = body.requiredLevel;
  }

  if (updates.length === 1) {
    throw AppError.badRequest("No updatable fields provided");
  }

  const updateExpr = `SET ${updates.join(", ")}`;
  await updateItem(
    CAMPAIGNS_TABLE,
    keys.campaign(campaignId),
    updateExpr,
    vals,
    Object.keys(names).length > 0 ? names : undefined
  );

  const updated = await getCampaignOrThrow(campaignId);
  return createSuccessResponse(updated);
}

// DELETE /campaigns/{campaignId} — delete (primary GM only)
async function deleteCampaign(
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> {
  const userId = extractUserId(event);
  const campaignId = requirePathParam(event, "campaignId");

  const campaign = await getCampaignOrThrow(campaignId);
  assertPrimaryGm(campaignId, userId, campaign);

  // Query all items in the campaign partition and delete them
  const allItems = await queryItems<{ PK: string; SK: string }>(
    CAMPAIGNS_TABLE,
    "PK = :pk",
    { ":pk": `CAMPAIGN#${campaignId}` }
  );

  // Also collect user-campaign index keys to delete
  const memberItems = allItems.filter((i) => i.SK.startsWith("MEMBER#"));
  const characterItems = allItems.filter((i) => i.SK.startsWith("CHARACTER#")) as CampaignCharacterRecord[];

  // Delete all campaign partition items
  for (const item of allItems) {
    await deleteItem(CAMPAIGNS_TABLE, { PK: item.PK, SK: item.SK });
  }

  // Delete user-campaign index entries
  for (const m of memberItems as CampaignMemberRecord[]) {
    await deleteItem(
      CAMPAIGNS_TABLE,
      keys.userCampaignIndex(m.userId, campaignId)
    );
  }

  // Clear campaignId on characters
  for (const cr of characterItems) {
    const charRecord = cr as CampaignCharacterRecord;
    await updateItem(
      CHARACTERS_TABLE,
      { PK: `USER#${charRecord.userId}`, SK: `CHARACTER#${charRecord.characterId}` },
      "SET campaignId = :null, updatedAt = :now",
      { ":null": null, ":now": new Date().toISOString() }
    );
  }

  return createSuccessResponse({ deleted: true });
}

// GET /campaigns/{campaignId}/members — list members
async function listMembers(
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> {
  const userId = extractUserId(event);
  const campaignId = requirePathParam(event, "campaignId");

  await assertCampaignMember(campaignId, userId);

  const memberRecords = await queryItems<CampaignMemberRecord>(
    CAMPAIGNS_TABLE,
    "PK = :pk AND begins_with(SK, :prefix)",
    {
      ":pk": `CAMPAIGN#${campaignId}`,
      ":prefix": "MEMBER#",
    }
  );

  // Fetch user profiles
  const profiles = await Promise.all(
    memberRecords.map((m) =>
      getItem<UserRecord>(USERS_TABLE, keys.user(m.userId)).then(
        (p) => ({ userId: m.userId, profile: p })
      )
    )
  );
  const profileMap = new Map(profiles.map((p) => [p.userId, p.profile]));

  // Fetch character assignments
  const charItems = await queryItems<CampaignCharacterRecord>(
    CAMPAIGNS_TABLE,
    "PK = :pk AND begins_with(SK, :prefix)",
    {
      ":pk": `CAMPAIGN#${campaignId}`,
      ":prefix": "CHARACTER#",
    }
  );
  const userToChar = new Map(charItems.map((c) => [c.userId, c.characterId]));

  const members: CampaignMemberDetail[] = memberRecords.map((m) => {
    const profile = profileMap.get(m.userId);
    return {
      userId: m.userId,
      displayName: profile?.displayName ?? m.userId,
      avatarUrl: profile?.avatarUrl ?? null,
      role: m.role,
      joinedAt: m.joinedAt,
      characterId: userToChar.get(m.userId) ?? null,
    };
  });

  return createSuccessResponse(members);
}

// DELETE /campaigns/{campaignId}/members/{userId} — remove member (GM only)
async function removeMember(
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> {
  const callerId = extractUserId(event);
  const campaignId = requirePathParam(event, "campaignId");
  const targetUserId = requirePathParam(event, "userId");

  const campaign = await getCampaignOrThrow(campaignId);

  // GM can remove any member; a member can remove themselves
  if (callerId !== targetUserId) {
    await assertCampaignGm(campaignId, callerId);
  }

  // Find the target member's record to get their role
  const targetMember = await assertCampaignMember(campaignId, targetUserId);

  // If the target is the primary GM, hand off or dissolve
  if (campaign.primaryGmId === targetUserId) {
    // Remove member + character first
    await removeMemberAndCharacter(campaignId, targetUserId, targetMember.role);
    // Then hand off
    await handoffOrDissolve(campaignId, targetUserId);
  } else {
    await removeMemberAndCharacter(campaignId, targetUserId, targetMember.role);
  }

  return createSuccessResponse({ removed: true });
}

// PATCH /campaigns/{campaignId}/members/{userId} — promote/demote role (primary GM only)
async function patchMemberRole(
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> {
  const callerId = extractUserId(event);
  const campaignId = requirePathParam(event, "campaignId");
  const targetUserId = requirePathParam(event, "userId");
  const body = parseBody(event, PatchMemberSchema);

  const campaign = await getCampaignOrThrow(campaignId);
  assertPrimaryGm(campaignId, callerId, campaign);

  if (targetUserId === callerId) {
    throw AppError.badRequest("Primary GM cannot change their own role");
  }

  // Find current role of target
  const currentMember = await assertCampaignMember(campaignId, targetUserId);
  const newRole = body.role;

  if (currentMember.role === newRole) {
    return createSuccessResponse({ unchanged: true });
  }

  const now = new Date().toISOString();

  // Delete old member record (role changes the SK)
  await deleteItem(
    CAMPAIGNS_TABLE,
    keys.campaignMember(campaignId, currentMember.role.toUpperCase(), targetUserId)
  );

  // Write new member record
  await putItem(CAMPAIGNS_TABLE, {
    ...keys.campaignMember(campaignId, newRole.toUpperCase(), targetUserId),
    campaignId,
    userId: targetUserId,
    role: newRole,
    joinedAt: currentMember.joinedAt,
    userId_gsi: targetUserId,
    campaignId_gsi: campaignId,
  } as unknown as Record<string, unknown>);

  // Update user-campaign index record
  await updateItem(
    CAMPAIGNS_TABLE,
    keys.userCampaignIndex(targetUserId, campaignId),
    "SET #role = :role, updatedAt = :now",
    { ":role": newRole, ":now": now },
    { "#role": "role" }
  );

  return createSuccessResponse({ updated: true, newRole });
}

// POST /campaigns/{campaignId}/invites — create invite (GM only)
async function createInvite(
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> {
  const userId = extractUserId(event);
  const campaignId = requirePathParam(event, "campaignId");
  const body = parseBody(event, CreateInviteSchema);

  await assertCampaignGm(campaignId, userId);
  // Verify campaign exists
  await getCampaignOrThrow(campaignId);

  const inviteCode = generateInviteCode();
  const now = new Date().toISOString();

  const ttl = body.expiresAt
    ? Math.floor(new Date(body.expiresAt).getTime() / 1000)
    : undefined;

  const grantRole: CampaignMemberRole = (body.grantRole ?? "player") as CampaignMemberRole;

  const inviteRecord: CampaignInviteRecord = {
    PK: `CAMPAIGN#${campaignId}`,
    SK: `INVITE#${inviteCode}`,
    campaignId,
    inviteCode,
    createdByUserId: userId,
    maxUses: body.maxUses ?? null,
    useCount: 0,
    expiresAt: body.expiresAt ?? null,
    grantRole,
    createdAt: now,
    inviteCode_gsi: inviteCode,
    ...(ttl !== undefined ? { ttl } : {}),
  };

  await putItem(CAMPAIGNS_TABLE, inviteRecord as unknown as Record<string, unknown>);

  const response: CampaignInvite = {
    campaignId,
    inviteCode,
    createdByUserId: userId,
    maxUses: body.maxUses ?? null,
    useCount: 0,
    expiresAt: body.expiresAt ?? null,
    grantRole,
    createdAt: now,
  };

  return createSuccessResponse(response, 201);
}

// GET /campaigns/{campaignId}/invites — list invites (GM only)
async function listInvites(
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> {
  const userId = extractUserId(event);
  const campaignId = requirePathParam(event, "campaignId");

  await assertCampaignGm(campaignId, userId);

  const inviteItems = await queryItems<CampaignInviteRecord>(
    CAMPAIGNS_TABLE,
    "PK = :pk AND begins_with(SK, :prefix)",
    {
      ":pk": `CAMPAIGN#${campaignId}`,
      ":prefix": "INVITE#",
    }
  );

  const invites: CampaignInvite[] = inviteItems.map((inv) => ({
    campaignId: inv.campaignId,
    inviteCode: inv.inviteCode,
    createdByUserId: inv.createdByUserId,
    maxUses: inv.maxUses,
    useCount: inv.useCount,
    expiresAt: inv.expiresAt,
    grantRole: inv.grantRole,
    createdAt: inv.createdAt,
  }));

  return createSuccessResponse(invites);
}

// DELETE /campaigns/{campaignId}/invites/{inviteCode} — revoke invite (GM only)
async function revokeInvite(
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> {
  const userId = extractUserId(event);
  const campaignId = requirePathParam(event, "campaignId");
  const inviteCode = requirePathParam(event, "inviteCode");

  await assertCampaignGm(campaignId, userId);

  const existing = await getItem<CampaignInviteRecord>(
    CAMPAIGNS_TABLE,
    keys.campaignInvite(campaignId, inviteCode)
  );
  if (!existing) {
    throw AppError.notFound("Invite", inviteCode);
  }

  await deleteItem(CAMPAIGNS_TABLE, keys.campaignInvite(campaignId, inviteCode));
  return createSuccessResponse({ revoked: true });
}

// POST /invites/{inviteCode}/accept — accept invite
async function acceptInvite(
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> {
  const userId = extractUserId(event);
  const inviteCode = requirePathParam(event, "inviteCode");

  // Look up the invite by inviteCode GSI
  const inviteItems = await queryItems<CampaignInviteRecord>(
    CAMPAIGNS_TABLE,
    "inviteCode_gsi = :code",
    { ":code": inviteCode },
    undefined,
    "inviteCode-index"
  );

  if (inviteItems.length === 0) {
    throw AppError.notFound("Invite", inviteCode);
  }

  const invite = inviteItems[0]!;

  // Check expiration
  if (invite.expiresAt && new Date(invite.expiresAt) < new Date()) {
    throw AppError.badRequest("This invite has expired");
  }

  // Check maxUses
  if (invite.maxUses !== null && invite.useCount >= invite.maxUses) {
    throw AppError.badRequest("This invite has reached its maximum uses");
  }

  const { campaignId } = invite;

  // Check if user is already a member
  try {
    await assertCampaignMember(campaignId, userId);
    // If we get here, they're already a member
    throw AppError.conflict("You are already a member of this campaign");
  } catch (err) {
    // If it's a 403, that means they're NOT a member — which is what we want
    if (err instanceof AppError && err.statusCode === 403) {
      // Good — fall through
    } else {
      throw err;
    }
  }

  // Add member
  const now = new Date().toISOString();
  const role = invite.grantRole;

  const memberRecord: CampaignMemberRecord = {
    PK: `CAMPAIGN#${campaignId}`,
    SK: `MEMBER#${role.toUpperCase()}#${userId}`,
    campaignId,
    userId,
    role,
    joinedAt: now,
    userId_gsi: userId,
    campaignId_gsi: campaignId,
  };

  const indexRecord: UserCampaignIndexRecord = {
    PK: `USER#${userId}`,
    SK: `CAMPAIGN#${campaignId}`,
    userId,
    campaignId,
    role,
    joinedAt: now,
  };

  await putItem(CAMPAIGNS_TABLE, memberRecord as unknown as Record<string, unknown>);
  await putItem(CAMPAIGNS_TABLE, indexRecord as unknown as Record<string, unknown>);

  // Increment useCount on the invite
  await updateItem(
    CAMPAIGNS_TABLE,
    keys.campaignInvite(campaignId, inviteCode),
    "SET useCount = useCount + :inc",
    { ":inc": 1 }
  );

  return createSuccessResponse({ joined: true, campaignId, role });
}

// POST /campaigns/{campaignId}/characters — add existing character to campaign
async function addCharacter(
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> {
  const userId = extractUserId(event);
  const campaignId = requirePathParam(event, "campaignId");
  const body = parseBody(event, AddCharacterSchema);

  const { characterId, ownerUserId } = body;

  // Caller must be a campaign member
  await assertCampaignMember(campaignId, userId);
  await getCampaignOrThrow(campaignId);

  // Determine whose user partition to look in.
  // - Normal player flow: ownerUserId is absent → look in the caller's own partition.
  // - Admin flow: ownerUserId is provided → look in that player's partition.
  //   The caller still must be a campaign member (checked above), but is not
  //   required to be the character's owner (e.g. a GM adding a player's character).
  const charOwnerUserId = ownerUserId ?? userId;

  // Load the character from the correct owner partition
  const charRecord = await getItem<CharacterRecord>(
    CHARACTERS_TABLE,
    { PK: `USER#${charOwnerUserId}`, SK: `CHARACTER#${characterId}` }
  );
  if (!charRecord) {
    throw AppError.notFound("Character", characterId);
  }

  // Ownership sanity check — the record's userId must match what we looked up
  if (charRecord.userId !== charOwnerUserId) {
    throw AppError.forbidden("You do not own this character");
  }

  // Character must not already be assigned to a campaign
  if (charRecord.campaignId) {
    throw AppError.conflict(
      `Character is already assigned to campaign ${charRecord.campaignId}`
    );
  }

  // Check the character owner doesn't already have a character in this campaign
  const existingChars = await queryItems<CampaignCharacterRecord>(
    CAMPAIGNS_TABLE,
    "PK = :pk AND begins_with(SK, :prefix)",
    {
      ":pk": `CAMPAIGN#${campaignId}`,
      ":prefix": "CHARACTER#",
    }
  );
  if (existingChars.some((c) => c.userId === charOwnerUserId)) {
    throw AppError.conflict("This player already has a character in this campaign");
  }

  const now = new Date().toISOString();

  // Write campaign-character record (userId = the character's owner, not the caller)
  const charAssignment: CampaignCharacterRecord = {
    PK: `CAMPAIGN#${campaignId}`,
    SK: `CHARACTER#${characterId}`,
    campaignId,
    characterId,
    userId: charOwnerUserId,
    addedAt: now,
  };
  await putItem(CAMPAIGNS_TABLE, charAssignment as unknown as Record<string, unknown>);

  // If the character owner is not already a campaign member, add them as a PLAYER.
  // This happens in the admin flow where a GM assigns a player's character directly
  // without the player having used an invite link.
  const existingMember = await getItem<CampaignMemberRecord>(
    CAMPAIGNS_TABLE,
    keys.campaignMember(campaignId, "PLAYER", charOwnerUserId)
  );
  const existingGmMember = existingMember
    ? existingMember
    : await getItem<CampaignMemberRecord>(
        CAMPAIGNS_TABLE,
        keys.campaignMember(campaignId, "GM", charOwnerUserId)
      );

  if (!existingGmMember) {
    // Player has no membership record — create one so they appear in the GM view
    const memberRecord: CampaignMemberRecord = {
      ...keys.campaignMember(campaignId, "PLAYER", charOwnerUserId),
      campaignId,
      userId: charOwnerUserId,
      role: "player" as CampaignMemberRole,
      joinedAt: now,
      userId_gsi: charOwnerUserId,
      campaignId_gsi: campaignId,
    };
    const indexRecord: UserCampaignIndexRecord = {
      ...keys.userCampaignIndex(charOwnerUserId, campaignId),
      userId: charOwnerUserId,
      campaignId,
      role: "player" as CampaignMemberRole,
      joinedAt: now,
    };
    await putItem(CAMPAIGNS_TABLE, memberRecord as unknown as Record<string, unknown>);
    await putItem(CAMPAIGNS_TABLE, indexRecord as unknown as Record<string, unknown>);
  }

  // Update the character record's campaignId using a condition expression
  // to guard against a race condition
  try {
    await updateItem(
      CHARACTERS_TABLE,
      { PK: `USER#${charOwnerUserId}`, SK: `CHARACTER#${characterId}` },
      "SET campaignId = :cid, updatedAt = :now",
      { ":cid": campaignId, ":now": now, ":null": null },
      undefined,
      "attribute_not_exists(campaignId) OR campaignId = :null"
    );
  } catch (err: unknown) {
    // Race condition — another process assigned this character
    const dynErr = err as { name?: string };
    if (dynErr.name === "ConditionalCheckFailedException") {
      // Roll back the campaign-character record
      await deleteItem(
        CAMPAIGNS_TABLE,
        keys.campaignCharacter(campaignId, characterId)
      );
      throw AppError.conflict("Character was concurrently assigned to another campaign");
    }
    throw err;
  }

  return createSuccessResponse({ added: true, characterId, campaignId }, 201);
}

// POST /campaigns/{campaignId}/characters/new — create + assign new character
async function createAndAssignCharacter(
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> {
  // This route delegates character creation to the characters handler logic
  // by constructing a minimal character record and assigning it.
  // We create a stub character here — the player can flesh it out in the builder.
  const userId = extractUserId(event);
  const campaignId = requirePathParam(event, "campaignId");

  const body = parseBody(
    event,
    z.object({
      name: z.string().min(1).max(60),
    })
  );

  await assertCampaignMember(campaignId, userId);
  await getCampaignOrThrow(campaignId);

  // Check the caller doesn't already have a character in this campaign
  const existingChars = await queryItems<CampaignCharacterRecord>(
    CAMPAIGNS_TABLE,
    "PK = :pk AND begins_with(SK, :prefix)",
    {
      ":pk": `CAMPAIGN#${campaignId}`,
      ":prefix": "CHARACTER#",
    }
  );
  if (existingChars.some((c) => c.userId === userId)) {
    throw AppError.conflict("You already have a character in this campaign");
  }

  const characterId = uuidv4();
  const now = new Date().toISOString();

  // Minimal stub character
  const stubCharacter = {
    PK: `USER#${userId}`,
    SK: `CHARACTER#${characterId}`,
    characterId,
    userId,
    name: body.name,
    classId: "",
    className: "",
    subclassId: null,
    subclassName: null,
    communityId: null,
    communityName: null,
    ancestryId: null,
    ancestryName: null,
    level: 1,
    avatarUrl: null,
    avatarKey: null,
    portraitUrl: null,
    portraitKey: null,
    campaignId,
    domains: [],
    stats: { agility: 0, strength: 0, finesse: 0, instinct: 0, presence: 0, knowledge: 0 },
    derivedStats: { evasion: 10, armor: 0 },
    trackers: {
      hp: { max: 6, marked: 0 },
      stress: { max: 4, marked: 0 },
      armor: { max: 0, marked: 0 },
    },
    damageThresholds: { major: 0, severe: 0 },
    weapons: { primary: { weaponId: null }, secondary: { weaponId: null } },
    hope: 0,
    hopeMax: 6,
    proficiency: 1,
    experiences: [],
    conditions: [],
    domainLoadout: [],
    domainVault: [],
    classFeatureState: {},
    traitBonuses: {},
    notes: null,
    activeArmorId: null,
    gold: { handfuls: 1, bags: 0, chests: 0 },
    inventory: [],
    cardTokens: {},
    downtimeProjects: [],
    activeAuras: [],
    companionState: null,
    reputationBonuses: {},
    favors: {},
    customConditions: [],
    levelUpHistory: {},
    markedTraits: [],
    multiclassClassId: null,
    multiclassClassName: null,
    multiclassSubclassId: null,
    multiclassDomainId: null,
    createdAt: now,
    updatedAt: now,
  };

  await putItem(CHARACTERS_TABLE, stubCharacter as unknown as Record<string, unknown>);

  // Write campaign-character record
  const charAssignment: CampaignCharacterRecord = {
    PK: `CAMPAIGN#${campaignId}`,
    SK: `CHARACTER#${characterId}`,
    campaignId,
    characterId,
    userId,
    addedAt: now,
  };
  await putItem(CAMPAIGNS_TABLE, charAssignment as unknown as Record<string, unknown>);

  return createSuccessResponse({ created: true, characterId, campaignId }, 201);
}

// DELETE /campaigns/{campaignId}/characters/{characterId} — remove character (GM or owner)
async function removeCharacter(
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> {
  const userId = extractUserId(event);
  const campaignId = requirePathParam(event, "campaignId");
  const characterId = requirePathParam(event, "characterId");

  await getCampaignOrThrow(campaignId);

  // Find the character assignment
  const charRecord = await getItem<CampaignCharacterRecord>(
    CAMPAIGNS_TABLE,
    keys.campaignCharacter(campaignId, characterId)
  );
  if (!charRecord) {
    throw AppError.notFound("Character assignment", characterId);
  }

  // Must be owner or GM
  const isOwner = charRecord.userId === userId;
  if (!isOwner) {
    await assertCampaignGm(campaignId, userId);
  }

  // Remove campaign-character record
  await deleteItem(
    CAMPAIGNS_TABLE,
    keys.campaignCharacter(campaignId, characterId)
  );

  // Clear campaignId on the character
  await updateItem(
    CHARACTERS_TABLE,
    { PK: `USER#${charRecord.userId}`, SK: `CHARACTER#${characterId}` },
    "SET campaignId = :null, updatedAt = :now",
    { ":null": null, ":now": new Date().toISOString() }
  );

  return createSuccessResponse({ removed: true });
}


// GET /invites/{inviteCode} — public preview (no membership required)
// Returns enough info for the join page to display the campaign name and invite details.
async function getInvitePreview(
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> {
  const inviteCode = requirePathParam(event, "inviteCode");

  // Look up the invite via the inviteCode GSI
  const inviteItems = await queryItems<CampaignInviteRecord>(
    CAMPAIGNS_TABLE,
    "inviteCode_gsi = :code",
    { ":code": inviteCode },
    undefined,
    "inviteCode-index"
  );

  if (inviteItems.length === 0) {
    throw AppError.notFound("Invite", inviteCode);
  }

  const invite = inviteItems[0]!;

  // Check expiration — return 410 Gone so the frontend can distinguish expired vs. not found
  if (invite.expiresAt && new Date(invite.expiresAt) < new Date()) {
    throw new AppError("INVITE_EXPIRED", "This invite link has expired", 410);
  }

  // Check maxUses
  if (invite.maxUses !== null && invite.useCount >= invite.maxUses) {
    throw new AppError("INVITE_EXPIRED", "This invite has reached its maximum uses", 410);
  }

  // Fetch campaign metadata for the name
  const campaign = await getCampaignOrThrow(invite.campaignId);

  const preview = {
    campaignId:   invite.campaignId,
    campaignName: campaign.name,
    description:  campaign.description,
    grantRole:    invite.grantRole,
    expiresAt:    invite.expiresAt,
    useCount:     invite.useCount,
    maxUses:      invite.maxUses,
  };

  return createSuccessResponse(preview);
}

// ─── Campaign Share Token ─────────────────────────────────────────────────────

/**
 * GET /campaigns/{campaignId}/share
 * Generate a campaign share token. Only callable by campaign GMs.
 * Returns { campaignToken, shareUrl } — the token grants read-only access to
 * all characters in the campaign without requiring authentication.
 */
async function getCampaignShareToken(
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> {
  const userId = extractUserId(event);
  const campaignId = requirePathParam(event, "campaignId");

  // Only GMs can generate campaign share tokens
  const member = await assertCampaignMember(campaignId, userId);
  if (member.role !== "gm") {
    throw AppError.forbidden("Only GMs can generate campaign share tokens");
  }

  const campaignToken = signCampaignShareToken(campaignId, userId);

  const frontendUrl =
    process.env["FRONTEND_URL"] ?? "https://ccb.curses.show";
  const shareUrl = `${frontendUrl}/campaign/${campaignId}?token=${campaignToken}`;

  return createSuccessResponse({ campaignToken, shareUrl });
}

// ─── Public Campaign View ─────────────────────────────────────────────────────

/**
 * GET /campaigns/{campaignId}/view?token=<campaign-share-token>
 * Public (no JWT required) endpoint. Verifies the campaign share token,
 * then returns the campaign name and all character summaries + per-character
 * share tokens so the Twitch Extension can render them without authentication.
 */
async function getSharedCampaign(
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> {
  const campaignId = requirePathParam(event, "campaignId");
  const token = event.queryStringParameters?.["token"];

  if (!token) {
    throw AppError.unauthorized("Campaign share token is required");
  }

  // Verify the token — throws on failure
  verifyCampaignShareToken(token, campaignId);

  // Query all items in the campaign partition
  const allItems = await queryItems<CampaignPartitionItem>(
    CAMPAIGNS_TABLE,
    "PK = :pk",
    { ":pk": `CAMPAIGN#${campaignId}` }
  );

  let campaignMeta: CampaignRecord | null = null;
  const characterRecords: CampaignCharacterRecord[] = [];

  for (const item of allItems) {
    if (item.SK === "METADATA") {
      campaignMeta = item as CampaignRecord;
    } else if (item.SK.startsWith("CHARACTER#")) {
      characterRecords.push(item as CampaignCharacterRecord);
    }
  }

  if (!campaignMeta) {
    throw AppError.notFound("Campaign", campaignId);
  }

  // Fetch character records and generate per-character share tokens
  const characters: Array<{
    characterId: string;
    userId: string;
    name: string;
    className: string;
    level: number;
    avatarUrl: string | null;
    portraitUrl: string | null;
  }> = [];
  const shareTokens: Record<string, string> = {};

  for (const cr of characterRecords) {
    const charRecord = await getItem<CharacterRecord>(
      CHARACTERS_TABLE,
      { PK: `USER#${cr.userId}`, SK: `CHARACTER#${cr.characterId}` }
    );
    if (charRecord) {
      characters.push({
        characterId: cr.characterId,
        userId: cr.userId,
        name: charRecord.name,
        className: charRecord.className,
        level: charRecord.level,
        avatarUrl: charRecord.avatarUrl ?? null,
        portraitUrl: charRecord.portraitUrl ?? null,
      });
      // Generate a character-level share token so the extension can
      // fetch live data for each character independently
      shareTokens[cr.characterId] = signShareToken(cr.characterId, cr.userId);
    }
  }

  return createSuccessResponse({
    campaign: {
      campaignId: campaignMeta.campaignId,
      name: campaignMeta.name,
    },
    characters,
    shareTokens,
  });
}

// ─── Pregen Endpoints ─────────────────────────────────────────────────────────
//
// Pregens are now stored in DynamoDB rather than hardcoded. The campaign pool
// (PREGENPOOL# records) determines which pregens are available in a given
// campaign. The hardcoded PREGEN_CHARACTERS array is used only as a fallback
// for backwards compatibility with campaigns that haven't adopted the pool yet.

const ImportPregenSchema = z.object({
  pregenId: z.string().min(1, "pregenId is required"),
  level: z.number().int().min(1).max(10).optional(),
});

/** DynamoDB record for a pregen stored via /admin/pregens or /pregens. */
interface PregenRecord {
  PK: string;
  SK: string;
  pregenId: string;
  scope: "system" | "user";
  ownerId: string | null;
  character: Character;
  name: string;
  className: string;
  subclassName: string | null;
  ancestryName: string | null;
  communityName: string | null;
  domains: string[];
  nativeLevel: number;
}

/** Campaign pool pointer record. */
interface CampaignPregenPoolRecord {
  PK: string;
  SK: string;
  campaignId: string;
  pregenId: string;
  source: "system" | "user";
  ownerId: string | null;
  addedAt: string;
}

/**
 * Resolve a pregen from the DB by looking up its pool pointer.
 * Falls back to the hardcoded PREGEN_CHARACTERS array for legacy compat.
 */
async function resolvePregenCharacter(
  poolRecord: CampaignPregenPoolRecord
): Promise<Character | null> {
  const lookupPk = poolRecord.source === "system"
    ? "PREGEN#SYSTEM"
    : `PREGEN#USER#${poolRecord.ownerId}`;

  const dbPregen = await getItem<PregenRecord>(
    CHARACTERS_TABLE,
    { PK: lookupPk, SK: `PREGEN#${poolRecord.pregenId}` }
  );
  if (dbPregen) return dbPregen.character;

  // Fallback: check the hardcoded array
  return PREGEN_CHARACTERS.find((p) => p.characterId === poolRecord.pregenId) ?? null;
}

// GET /campaigns/{campaignId}/pregens — list available pregens
async function listPregens(
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> {
  const userId = extractUserId(event);
  const campaignId = requirePathParam(event, "campaignId");

  await assertCampaignMember(campaignId, userId);
  const campaign = await getCampaignOrThrow(campaignId);

  // Get all character assignments in this campaign
  const campaignChars = await queryItems<CampaignCharacterRecord>(
    CAMPAIGNS_TABLE,
    "PK = :pk AND begins_with(SK, :prefix)",
    {
      ":pk": `CAMPAIGN#${campaignId}`,
      ":prefix": "CHARACTER#",
    }
  );

  // Check which pregens are already imported
  const usedPregenIds = new Set<string>();
  for (const cc of campaignChars) {
    const charRecord = await getItem<CharacterRecord & { pregenSourceId?: string }>(
      CHARACTERS_TABLE,
      { PK: `USER#${cc.userId}`, SK: `CHARACTER#${cc.characterId}` }
    );
    if (charRecord?.pregenSourceId) {
      usedPregenIds.add(charRecord.pregenSourceId);
    }
  }

  const userHasCharacter = campaignChars.some((c) => c.userId === userId);

  // ── Fetch pregens from the campaign pool ──────────────────────────────────
  const poolRecords = await queryItems<CampaignPregenPoolRecord>(
    CAMPAIGNS_TABLE,
    "PK = :pk AND begins_with(SK, :prefix)",
    {
      ":pk": `CAMPAIGN#${campaignId}`,
      ":prefix": "PREGENPOOL#",
    }
  );

  let available: Array<{
    pregenId: string;
    name: string;
    className: string;
    subclassName: string | null;
    ancestryName: string | null;
    communityName: string | null;
    domains: string[];
    nativeLevel: number;
  }> = [];

  if (poolRecords.length > 0) {
    // Campaign has an explicit pool — resolve each
    for (const pr of poolRecords) {
      if (usedPregenIds.has(pr.pregenId)) continue;

      const lookupPk = pr.source === "system"
        ? "PREGEN#SYSTEM"
        : `PREGEN#USER#${pr.ownerId}`;

      const rec = await getItem<PregenRecord>(
        CHARACTERS_TABLE,
        { PK: lookupPk, SK: `PREGEN#${pr.pregenId}` }
      );
      if (rec) {
        available.push({
          pregenId: rec.pregenId,
          name: rec.name,
          className: rec.className,
          subclassName: rec.subclassName,
          ancestryName: rec.ancestryName,
          communityName: rec.communityName,
          domains: rec.domains,
          nativeLevel: rec.nativeLevel,
        });
      }
    }
  } else {
    // Fallback: use hardcoded PREGEN_CHARACTERS for legacy campaigns
    available = PREGEN_CHARACTERS
      .filter((p) => !usedPregenIds.has(p.characterId))
      .map((p) => ({
        pregenId: p.characterId,
        name: p.name,
        className: p.className,
        subclassName: p.subclassName ?? null,
        ancestryName: p.ancestryName ?? null,
        communityName: p.communityName ?? null,
        domains: p.domains,
        nativeLevel: p.level,
      }));
  }

  return createSuccessResponse({
    pregens: available,
    requiredLevel: campaign.requiredLevel ?? null,
    userHasCharacter,
  });
}

// POST /campaigns/{campaignId}/pregens/import — import a pregen as a real character
async function importPregen(
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> {
  const userId = extractUserId(event);
  const campaignId = requirePathParam(event, "campaignId");
  const body = parseBody(event, ImportPregenSchema);

  await assertCampaignMember(campaignId, userId);
  const campaign = await getCampaignOrThrow(campaignId);

  // Check user doesn't already have a character in this campaign
  const existingChars = await queryItems<CampaignCharacterRecord>(
    CAMPAIGNS_TABLE,
    "PK = :pk AND begins_with(SK, :prefix)",
    {
      ":pk": `CAMPAIGN#${campaignId}`,
      ":prefix": "CHARACTER#",
    }
  );
  if (existingChars.some((c) => c.userId === userId)) {
    throw AppError.conflict("You already have a character in this campaign");
  }

  // ── Resolve pregen template ─────────────────────────────────────────────
  let pregen: Character | undefined;

  // First check the campaign pool
  const poolRecord = await getItem<CampaignPregenPoolRecord>(
    CAMPAIGNS_TABLE,
    { PK: `CAMPAIGN#${campaignId}`, SK: `PREGENPOOL#${body.pregenId}` }
  );

  if (poolRecord) {
    const resolved = await resolvePregenCharacter(poolRecord);
    if (resolved) pregen = resolved;
  }

  // Fallback: hardcoded array (legacy)
  if (!pregen) {
    pregen = PREGEN_CHARACTERS.find((p) => p.characterId === body.pregenId);
  }

  if (!pregen) {
    throw AppError.notFound("Pre-generated character", body.pregenId);
  }

  // Check this pregen isn't already in use in this campaign
  for (const cc of existingChars) {
    const charRecord = await getItem<CharacterRecord & { pregenSourceId?: string }>(
      CHARACTERS_TABLE,
      { PK: `USER#${cc.userId}`, SK: `CHARACTER#${cc.characterId}` }
    );
    if (charRecord?.pregenSourceId === body.pregenId) {
      throw AppError.conflict("This pre-generated character is already in use in this campaign");
    }
  }

  // Determine import level
  const importLevel = campaign.requiredLevel ?? body.level ?? pregen.level;
  if (importLevel < 1 || importLevel > 10) {
    throw new AppError("VALIDATION_ERROR", "Import level must be 1–10", 422, []);
  }

  // Scale the pregen to the target level
  const scaled = scalePregenToLevel(pregen, importLevel);

  // Create real character record
  const characterId = uuidv4();
  const now = new Date().toISOString();

  const characterRecord = {
    PK: `USER#${userId}`,
    SK: `CHARACTER#${characterId}`,
    ...scaled,
    characterId,
    userId,
    campaignId,
    pregenSourceId: body.pregenId,  // track which pregen this came from
    createdAt: now,
    updatedAt: now,
  };

  await putItem(CHARACTERS_TABLE, characterRecord as unknown as Record<string, unknown>);

  // Write campaign-character assignment
  const charAssignment: CampaignCharacterRecord = {
    PK: `CAMPAIGN#${campaignId}`,
    SK: `CHARACTER#${characterId}`,
    campaignId,
    characterId,
    userId,
    addedAt: now,
  };
  await putItem(CAMPAIGNS_TABLE, charAssignment as unknown as Record<string, unknown>);

  return createSuccessResponse({
    imported: true,
    characterId,
    campaignId,
    level: importLevel,
    pregenId: body.pregenId,
  }, 201);
}

// ─── Main Handler ─────────────────────────────────────────────────────────────

async function campaignsHandler(
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> {
  const routeKey = event.routeKey;

  switch (routeKey) {
    case "GET /campaigns":
      return listCampaigns(event);

    case "POST /campaigns":
      return createCampaign(event);

    case "GET /campaigns/{campaignId}":
      return getCampaign(event);

    case "PATCH /campaigns/{campaignId}":
      return patchCampaign(event);

    case "DELETE /campaigns/{campaignId}":
      return deleteCampaign(event);

    case "GET /campaigns/{campaignId}/members":
      return listMembers(event);

    case "DELETE /campaigns/{campaignId}/members/{userId}":
      return removeMember(event);

    case "PATCH /campaigns/{campaignId}/members/{userId}":
      return patchMemberRole(event);

    case "POST /campaigns/{campaignId}/invites":
      return createInvite(event);

    case "GET /campaigns/{campaignId}/invites":
      return listInvites(event);

    case "DELETE /campaigns/{campaignId}/invites/{inviteCode}":
      return revokeInvite(event);

    case "GET /invites/{inviteCode}":
      return getInvitePreview(event);

    case "POST /invites/{inviteCode}/accept":
      return acceptInvite(event);

    case "POST /campaigns/{campaignId}/characters":
      return addCharacter(event);

    case "POST /campaigns/{campaignId}/characters/new":
      return createAndAssignCharacter(event);

    case "DELETE /campaigns/{campaignId}/characters/{characterId}":
      return removeCharacter(event);

    case "GET /campaigns/{campaignId}/pregens":
      return listPregens(event);

    case "POST /campaigns/{campaignId}/pregens/import":
      return importPregen(event);

    case "GET /campaigns/{campaignId}/share":
      return getCampaignShareToken(event);

    case "GET /campaigns/{campaignId}/view":
      return getSharedCampaign(event);

    default:
      return {
        statusCode: 404,
        body: JSON.stringify({ error: { code: "NOT_FOUND", message: `Route not found: ${routeKey}` } }),
      };
  }
}

export const handler = withErrorHandling(campaignsHandler);
