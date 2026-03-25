/**
 * src/types/campaign.ts
 *
 * Shared type definitions for the Campaign System.
 */

export type CampaignMemberRole = "gm" | "player";

// ─── Session Schedule ─────────────────────────────────────────────────────────

export type DayOfWeek =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";

export type RecurrenceFrequency = "weekly" | "biweekly" | "monthly";

export interface SessionSlot {
  day: DayOfWeek;
  /** 24-hour local time string ("HH:MM"), or null if no specific time is set. */
  time: string | null;
  /** IANA timezone identifier, e.g. "America/New_York". Null = unspecified. */
  timezone: string | null;
  /** Optional human-readable label, e.g. "Evening session". */
  description: string | null;
}

export interface SessionSchedule {
  frequency: RecurrenceFrequency;
  slots: SessionSlot[];
  /**
   * How many minutes before the session to send reminder emails.
   * 0 = midnight GMT the night before (default).
   */
  reminderOffsetMinutes: number;
  reminderEnabled: boolean;
}

// ─── Core Campaign ─────────────────────────────────────────────────────────────

export interface Campaign {
  campaignId: string;
  name: string;
  description: string | null;
  primaryGmId: string;
  /** Recurring session schedule, or null if none has been configured. */
  schedule: SessionSchedule | null;
  createdAt: string;
  updatedAt: string;
}

// ─── List-level summary (returned by GET /campaigns) ──────────────────────────

export interface CampaignSummary extends Campaign {
  memberCount: number;
  callerRole: CampaignMemberRole | null;
  callerCharacterId: string | null;
  /** ISO-8601 UTC timestamp of the next scheduled session, or null. */
  nextSessionAt: string | null;
}

// ─── Full detail (returned by GET /campaigns/{id}) ────────────────────────────

export interface CampaignDetail extends Campaign {
  members: CampaignMemberDetail[];
  characters: CampaignCharacterDetail[];
  callerRole: CampaignMemberRole | null;
  invites?: CampaignInvite[];
}

export interface CampaignMemberDetail {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  role: CampaignMemberRole;
  joinedAt: string;
  characterId: string | null;
}

export interface CampaignCharacterDetail {
  characterId: string;
  userId: string;
  name: string;
  className: string;
  level: number;
  avatarUrl: string | null;
  portraitUrl: string | null;
}

// ─── Invites ───────────────────────────────────────────────────────────────────

export interface CampaignInvite {
  campaignId: string;
  inviteCode: string;
  createdByUserId: string;
  maxUses: number | null;
  useCount: number;
  expiresAt: string | null;
  grantRole: CampaignMemberRole;
  createdAt: string;
}

// ─── WebSocket events ──────────────────────────────────────────────────────────

export interface PingEvent {
  type: "ping";
  campaignId: string;
  targetCharacterId: string;
  fieldKey: string;
  senderUserId: string;
  timestamp: string;
}

// ─── Mutation input shapes ─────────────────────────────────────────────────────

export interface CreateCampaignInput {
  name: string;
  description?: string | null;
}

export interface UpdateCampaignInput {
  name?: string;
  description?: string | null;
  schedule?: SessionSchedule | null;
}

export interface CreateInviteInput {
  maxUses?: number | null;
  expiresAt?: string | null;
  grantRole?: CampaignMemberRole;
}

export interface UpdateMemberRoleInput {
  role: CampaignMemberRole;
}

export interface AddCharacterInput {
  characterId: string;
}

