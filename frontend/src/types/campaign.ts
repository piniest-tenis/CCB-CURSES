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
  /**
   * SRD Fear resource tracked by the GM. Range 0–12.
   * Starts at 1 per PC at the beginning of a session; max 12; min 0.
   * Defaults to 0 if never set.
   */
  currentFear?: number;
  /**
   * Whether this campaign uses the Curses! campaign frame (homebrew
   * extensions: Faction Favors, Curses! conditions, etc.).
   * Defaults to true for existing campaigns.
   */
  cursesContentEnabled?: boolean;
  /**
   * When set, new characters joining this campaign must be at this level.
   * Pre-generated characters are imported at this level; custom characters
   * that don't match see a validation prompt to use the level-up wizard.
   * Null means no level restriction (any level is allowed).
   */
  requiredLevel?: number | null;
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

/**
 * A serialisable roll request suitable for transmission over WebSocket.
 * Mirrors the RollRequest type but avoids importing frontend-only modules.
 */
export interface RollRequestPayload {
  label: string;
  type: "action" | "damage" | "reaction" | "generic";
  dice: Array<{ size: "d4" | "d6" | "d8" | "d10" | "d12" | "d20"; role: string; label?: string }>;
  modifier?: number;
  difficulty?: number;
  /** Optional flavor text shown as a subtitle in the roll modal. */
  flavorText?: string;
  characterName?: string;
}

/**
 * Sent by the GM to trigger a roll prompt on a specific player's character sheet.
 */
export interface RollRequestEvent {
  type: "roll_request";
  campaignId: string;
  targetCharacterId: string;
  senderUserId: string;
  timestamp: string;
  rollRequest: RollRequestPayload;
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
  /** GM Fear counter update. Clamped 0–12 server-side. */
  fear?: number;
  /** Whether this campaign uses Curses! content (Faction Favors, etc.). */
  cursesContentEnabled?: boolean;
  /** Restrict new characters to a specific level (null to remove restriction). */
  requiredLevel?: number | null;
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
  /** The character owner's userId. Required when an admin adds a player's character. */
  ownerUserId?: string;
}

