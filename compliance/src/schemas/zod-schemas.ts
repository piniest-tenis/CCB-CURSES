// compliance/src/schemas/zod-schemas.ts
//
// Runtime Zod schemas for all API input validation.
// These mirror the TypeScript types in @shared/types but are evaluated at
// runtime to provide detailed parse errors at Lambda entry points and
// React Hook Form field-level errors on the frontend.

import { z } from "zod";

// ─── Shared primitives ────────────────────────────────────────────────────────

const IsoDateString = z
  .string()
  .datetime({ offset: true })
  .describe("ISO 8601 timestamp with timezone offset, e.g. 2026-01-01T00:00:00Z");

const Slug = z
  .string()
  .min(1)
  .max(80)
  .regex(/^[a-z0-9-_]+$/, "Must be a lowercase alphanumeric slug")
  .describe("Lowercase alphanumeric slug used as a resource identifier");

const NonNegativeInt = z
  .number()
  .int("Must be an integer")
  .nonnegative("Must be non-negative");

// ─── Core Stats ───────────────────────────────────────────────────────────────

/**
 * The six core stats for a Daggerheart character.
 * At creation each stat is 0–5.  After level-up bonuses the max is 8.
 */
export const CoreStatsSchema = z.object({
  agility: z
    .number()
    .int()
    .min(0, "Agility cannot be negative")
    .max(8, "Agility cannot exceed 8")
    .describe("Agility stat (0–5 at creation, max 8 with bonuses)"),

  strength: z
    .number()
    .int()
    .min(0, "Strength cannot be negative")
    .max(8, "Strength cannot exceed 8")
    .describe("Strength stat (0–5 at creation, max 8 with bonuses)"),

  finesse: z
    .number()
    .int()
    .min(0, "Finesse cannot be negative")
    .max(8, "Finesse cannot exceed 8")
    .describe("Finesse stat (0–5 at creation, max 8 with bonuses)"),

  instinct: z
    .number()
    .int()
    .min(0, "Instinct cannot be negative")
    .max(8, "Instinct cannot exceed 8")
    .describe("Instinct stat (0–5 at creation, max 8 with bonuses)"),

  presence: z
    .number()
    .int()
    .min(0, "Presence cannot be negative")
    .max(8, "Presence cannot exceed 8")
    .describe("Presence stat (0–5 at creation, max 8 with bonuses)"),

  knowledge: z
    .number()
    .int()
    .min(0, "Knowledge cannot be negative")
    .max(8, "Knowledge cannot exceed 8")
    .describe("Knowledge stat (0–5 at creation, max 8 with bonuses)"),
});

export type CoreStatsInput = z.infer<typeof CoreStatsSchema>;

// ─── Weapon ───────────────────────────────────────────────────────────────────

/**
 * A single weapon slot (primary or secondary).
 * All fields are nullable — a character may not have a weapon in every slot.
 */
export const WeaponSchema = z.object({
  name: z
    .string()
    .max(100)
    .nullable()
    .describe("Weapon name, or null if slot is empty"),

  trait: z
    .string()
    .max(50)
    .nullable()
    .describe("The stat trait used for attack rolls with this weapon, or null"),

  damage: z
    .string()
    .max(20)
    .nullable()
    .describe("Damage expression (e.g. '1d8+2'), or null"),

  range: z
    .string()
    .max(30)
    .nullable()
    .describe("Range descriptor (e.g. 'Melee', 'Far'), or null"),

  type: z
    .enum(["physical", "magic"])
    .nullable()
    .describe("Damage type: physical or magic, or null"),

  burden: z
    .enum(["one-handed", "two-handed"])
    .nullable()
    .describe("Weapon burden: one-handed or two-handed, or null"),
});

export type WeaponInput = z.infer<typeof WeaponSchema>;

// ─── Experience ───────────────────────────────────────────────────────────────

/**
 * A single experience entry granting a named bonus to certain rolls.
 */
export const ExperienceSchema = z.object({
  name: z
    .string()
    .min(1, "Experience name cannot be empty")
    .max(100)
    .describe("Descriptive name for this experience (e.g. 'Former soldier')"),

  bonus: z
    .number()
    .int()
    .min(-5, "Experience bonus cannot be less than -5")
    .max(10, "Experience bonus cannot exceed 10")
    .describe("Numeric bonus applied when this experience is relevant"),
});

export type ExperienceInput = z.infer<typeof ExperienceSchema>;

// ─── Character Create ─────────────────────────────────────────────────────────

/**
 * Request body accepted by POST /characters.
 *
 * Only fields that are provided by the player at creation time are required.
 * Derived fields (evasion, maxHP, etc.) are computed server-side.
 */
export const CharacterCreateSchema = z.object({
  name: z
    .string()
    .min(1, "Character name cannot be empty")
    .max(100, "Character name cannot exceed 100 characters")
    .describe("The character's display name"),

  classId: Slug.describe("Slug of the chosen class (e.g. 'devout', 'knave')"),

  subclassId: Slug.nullable()
    .optional()
    .describe("Slug of the chosen subclass, or null if not yet selected"),

  communityId: Slug.nullable()
    .optional()
    .describe("Slug of the chosen community, or null"),

  ancestryId: Slug.nullable()
    .optional()
    .describe("Slug of the chosen ancestry, or null"),

  stats: CoreStatsSchema.describe(
    "The six core stats assigned during character creation (each 0–5)"
  ),

  hope: z
    .number()
    .int()
    .min(0)
    .max(6)
    .default(2)
    .describe("Starting Hope value; defaults to 2 per SRD rules"),

  experiences: z
    .array(ExperienceSchema)
    .max(6, "A character may have at most 6 experiences")
    .default([])
    .describe("Named experiences that grant bonuses to relevant rolls"),

  notes: z
    .string()
    .max(5000, "Notes cannot exceed 5000 characters")
    .nullable()
    .optional()
    .describe("Free-form player notes attached to the character sheet"),
});

export type CharacterCreateInput = z.infer<typeof CharacterCreateSchema>;

// ─── Character Update ─────────────────────────────────────────────────────────

const SlotTrackerSchema = z.object({
  max: NonNegativeInt.describe("Maximum slots for this tracker"),
  marked: NonNegativeInt.describe("Currently marked / used slots"),
});

const DamageThresholdsSchema = z.object({
  minor: NonNegativeInt.describe("Minor damage threshold"),
  major: NonNegativeInt.describe("Major damage threshold (must be > minor)"),
  severe: NonNegativeInt.describe("Severe damage threshold (must be > major)"),
});

const WeaponsSchema = z.object({
  primary: WeaponSchema.describe("Primary weapon slot"),
  secondary: WeaponSchema.describe("Secondary weapon slot"),
});

const CharacterTrackersSchema = z.object({
  hp: SlotTrackerSchema.describe("Hit point tracker"),
  stress: SlotTrackerSchema.describe("Stress tracker"),
  armor: SlotTrackerSchema.describe("Armor slot tracker"),
  proficiency: SlotTrackerSchema.describe("Proficiency slot tracker"),
});

/**
 * Request body accepted by PUT/PATCH /characters/:id.
 *
 * All fields are optional to allow partial updates (PATCH semantics).
 * Fields not present in the payload are left unchanged.
 */
export const CharacterUpdateSchema = z
  .object({
    name: z
      .string()
      .min(1)
      .max(100)
      .optional()
      .describe("Updated character name"),

    subclassId: Slug.nullable()
      .optional()
      .describe("Updated subclass selection, or null to clear"),

    communityId: Slug.nullable()
      .optional()
      .describe("Updated community selection, or null to clear"),

    ancestryId: Slug.nullable()
      .optional()
      .describe("Updated ancestry selection, or null to clear"),

    level: z
      .number()
      .int()
      .min(1)
      .max(10)
      .optional()
      .describe("Updated character level (1–10)"),

    stats: CoreStatsSchema.optional().describe("Updated core stats"),

    trackers: CharacterTrackersSchema.optional().describe(
      "Updated HP, stress, armor, and proficiency trackers"
    ),

    damageThresholds: DamageThresholdsSchema.optional().describe(
      "Updated damage thresholds (minor < major < severe)"
    ),

    weapons: WeaponsSchema.optional().describe(
      "Updated primary and secondary weapon slots"
    ),

    hope: z
      .number()
      .int()
      .min(0)
      .max(6)
      .optional()
      .describe("Updated Hope value (0–6)"),

    experiences: z
      .array(ExperienceSchema)
      .max(6)
      .optional()
      .describe("Updated experiences list"),

    conditions: z
      .array(z.string().max(50))
      .max(20)
      .optional()
      .describe("Currently active condition names"),

    domainLoadout: z
      .array(Slug)
      .max(5, "Loadout cannot exceed 5 cards")
      .optional()
      .describe("Active domain card IDs (max 5)"),

    domainVault: z
      .array(Slug)
      .optional()
      .describe("All unlocked domain card IDs"),

    classFeatureState: z
      .record(
        z.object({
          tokens: NonNegativeInt.describe("Current token count for this feature"),
          active: z.boolean().describe("Whether the feature is toggled on"),
          extra: z.record(z.unknown()).optional().describe("Feature-specific extra state"),
        })
      )
      .optional()
      .describe("Per-class-feature token and toggle state"),

    notes: z
      .string()
      .max(5000)
      .nullable()
      .optional()
      .describe("Free-form player notes"),

    avatarKey: z
      .string()
      .max(500)
      .nullable()
      .optional()
      .describe("S3 key of the character's avatar image"),
  })
  .describe("Partial update payload for an existing character sheet");

export type CharacterUpdateInput = z.infer<typeof CharacterUpdateSchema>;

// ─── Rest Request ─────────────────────────────────────────────────────────────

/**
 * Request body for POST /characters/:id/rest.
 */
export const RestRequestSchema = z.object({
  restType: z
    .enum(["short", "long"])
    .describe("The type of rest: 'short' (clear some slots) or 'long' (full recovery)"),

  downtimeActions: z
    .array(
      z.object({
        actionId: z
          .string()
          .min(1)
          .max(80)
          .describe("Identifier of the chosen downtime action"),
      })
    )
    .max(4, "Cannot choose more than 4 downtime actions per rest")
    .default([])
    .describe("Downtime actions the player wants to perform during this rest"),
});

export type RestRequestInput = z.infer<typeof RestRequestSchema>;

// ─── Media Presign ────────────────────────────────────────────────────────────

const ALLOWED_CONTENT_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

/**
 * Request body for POST /media/presign.
 * Returns a pre-signed S3 URL the client uploads to directly.
 */
export const MediaPresignSchema = z.object({
  filename: z
    .string()
    .min(1)
    .max(255)
    .regex(
      /^[\w\-. ]+\.(jpg|jpeg|png|webp|gif)$/i,
      "Filename must be a valid image file name (jpg, jpeg, png, webp, gif)"
    )
    .describe("Original filename of the image being uploaded"),

  contentType: z
    .enum(ALLOWED_CONTENT_TYPES, {
      errorMap: () => ({
        message: `Content type must be one of: ${ALLOWED_CONTENT_TYPES.join(", ")}`,
      }),
    })
    .describe("MIME type of the file being uploaded"),

  fileSize: z
    .number()
    .int()
    .positive("File size must be positive")
    .max(
      MAX_FILE_SIZE_BYTES,
      `File size cannot exceed ${MAX_FILE_SIZE_BYTES / (1024 * 1024)} MB`
    )
    .describe("File size in bytes; maximum is 5 MB"),

  linkedTo: z
    .object({
      type: z
        .enum(["character", "user"])
        .describe("The type of resource this media is linked to"),
      id: z
        .string()
        .uuid("linkedTo.id must be a valid UUID")
        .describe("UUID of the resource this media is linked to"),
    })
    .describe("The resource (character or user profile) this image belongs to"),
});

export type MediaPresignInput = z.infer<typeof MediaPresignSchema>;

// ─── User Update ──────────────────────────────────────────────────────────────

/**
 * Request body for PUT/PATCH /users/:id.
 * Users can update their display name, avatar, and UI preferences.
 */
export const UserUpdateSchema = z
  .object({
    displayName: z
      .string()
      .min(1, "Display name cannot be empty")
      .max(60, "Display name cannot exceed 60 characters")
      .optional()
      .describe("The user's public display name shown on their profile"),

    avatarKey: z
      .string()
      .max(500)
      .nullable()
      .optional()
      .describe("S3 object key of the user's avatar image, or null to clear"),

    preferences: z
      .object({
        theme: z
          .enum(["dark", "light", "system"])
          .optional()
          .describe("UI colour theme preference"),

        defaultDiceStyle: z
          .string()
          .max(50)
          .optional()
          .describe("The default visual style used for dice rolls"),
      })
      .optional()
      .describe("User interface preferences"),
  })
  .describe("Partial update payload for a user profile");

export type UserUpdateInput = z.infer<typeof UserUpdateSchema>;
