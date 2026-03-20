// backend/src/characters/helpers.ts
// Pure helper functions extracted from handler.ts for unit testability.
// No I/O, no AWS SDK, no side-effects.

import { createHmac } from "crypto";
import { AppError } from "../common/middleware";
import type { Character, RestType, RestResult, Weapons } from "@shared/types";

// ─── deepMerge ────────────────────────────────────────────────────────────────

/**
 * Deep-merge two plain objects. Arrays are replaced outright, objects merged
 * recursively, primitives overwritten. Undefined patch values are ignored.
 */
export function deepMerge<T extends Record<string, unknown>>(
  base: T,
  patch: Partial<T>
): T {
  const result = { ...base };
  for (const key of Object.keys(patch) as (keyof T)[]) {
    const patchVal = patch[key];
    const baseVal = base[key];
    if (
      patchVal !== null &&
      typeof patchVal === "object" &&
      !Array.isArray(patchVal) &&
      baseVal !== null &&
      typeof baseVal === "object" &&
      !Array.isArray(baseVal)
    ) {
      result[key] = deepMerge(
        baseVal as Record<string, unknown>,
        patchVal as Record<string, unknown>
      ) as T[keyof T];
    } else if (patchVal !== undefined) {
      result[key] = patchVal as T[keyof T];
    }
  }
  return result;
}

// ─── Cursor encoding ──────────────────────────────────────────────────────────

/** Encode a DynamoDB LastEvaluatedKey as a base64 pagination cursor. */
export function encodeCursor(key: Record<string, unknown>): string {
  return Buffer.from(JSON.stringify(key)).toString("base64");
}

/** Decode a base64 cursor back into a DynamoDB ExclusiveStartKey. */
export function decodeCursor(cursor: string): Record<string, unknown> {
  try {
    return JSON.parse(
      Buffer.from(cursor, "base64").toString("utf-8")
    ) as Record<string, unknown>;
  } catch {
    throw AppError.badRequest("Invalid pagination cursor");
  }
}

// ─── Share token ──────────────────────────────────────────────────────────────

/**
 * Sign a share token in JWT-like format: base64url(header).base64url(payload).HMAC
 */
export function signShareToken(
  characterId: string,
  userId: string,
  exp: number
): string {
  const secret =
    process.env["SHARE_TOKEN_SECRET"] ?? "dev-secret-change-in-prod";
  const header = Buffer.from(
    JSON.stringify({ alg: "HS256", typ: "share" })
  ).toString("base64url");
  const payload = Buffer.from(
    JSON.stringify({ type: "share", characterId, userId, exp })
  ).toString("base64url");
  const signature = createHmac("sha256", secret)
    .update(`${header}.${payload}`)
    .digest("base64url");
  return `${header}.${payload}.${signature}`;
}

/**
 * Verify a share token. Returns the decoded payload or throws an AppError.
 */
export function verifyShareToken(
  token: string,
  expectedCharacterId: string
): { characterId: string; userId: string; exp: number } {
  const parts = token.split(".");
  if (parts.length !== 3) {
    throw AppError.badRequest("Invalid share token format");
  }

  const [headerB64, payloadB64, signature] = parts as [string, string, string];
  const secret =
    process.env["SHARE_TOKEN_SECRET"] ?? "dev-secret-change-in-prod";

  const expectedSig = createHmac("sha256", secret)
    .update(`${headerB64}.${payloadB64}`)
    .digest("base64url");

  if (expectedSig !== signature) {
    throw AppError.unauthorized("Invalid share token");
  }

  let payload: { type: string; characterId: string; userId: string; exp: number };
  try {
    payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf8"));
  } catch {
    throw AppError.badRequest("Malformed share token payload");
  }

  if (payload.type !== "share") {
    throw AppError.unauthorized("Token is not a share token");
  }
  if (payload.characterId !== expectedCharacterId) {
    throw AppError.forbidden("Token does not match character");
  }
  if (payload.exp < Math.floor(Date.now() / 1000)) {
    throw AppError.unauthorized("Share token has expired");
  }

  return { characterId: payload.characterId, userId: payload.userId, exp: payload.exp };
}

// ─── SRD Validation ───────────────────────────────────────────────────────────

export interface SrdError {
  field: string;
  issue: string;
}

export function validateSrdRules(character: Partial<Character>): SrdError[] {
  const errors: SrdError[] = [];

  if (character.hope !== undefined) {
    if (character.hope < 0 || character.hope > 6) {
      errors.push({ field: "hope", issue: "Hope must be between 0 and 6" });
    }
  }

  if (character.domainLoadout !== undefined) {
    if (character.domainLoadout.length > 5) {
      errors.push({
        field: "domainLoadout",
        issue: "Domain loadout may contain at most 5 cards",
      });
    }
  }

  if (character.stats) {
    for (const [stat, val] of Object.entries(character.stats)) {
      if (val < 0 || val > 10) {
        errors.push({
          field: `stats.${stat}`,
          issue: "Stat value must be between 0 and 10",
        });
      }
    }
  }

  if (character.trackers) {
    for (const [key, tracker] of Object.entries(character.trackers)) {
      if (tracker.marked > tracker.max) {
        errors.push({
          field: `trackers.${key}.marked`,
          issue: `Marked slots (${tracker.marked}) cannot exceed max (${tracker.max})`,
        });
      }
    }
  }

  if (character.level !== undefined) {
    if (character.level < 1 || character.level > 10) {
      errors.push({ field: "level", issue: "Level must be between 1 and 10" });
    }
  }

  return errors;
}

// ─── Rest logic ───────────────────────────────────────────────────────────────

export function applyRest(
  character: Character,
  restType: RestType
): { character: Character; cleared: RestResult["cleared"] } {
  const cleared: RestResult["cleared"] = { hp: 0, stress: 0, armor: 0 };

  if (restType === "short") {
    const stressToClear = Math.min(2, character.trackers.stress.marked);
    cleared.stress = stressToClear;
    return {
      character: {
        ...character,
        trackers: {
          ...character.trackers,
          stress: {
            ...character.trackers.stress,
            marked: character.trackers.stress.marked - stressToClear,
          },
        },
        updatedAt: new Date().toISOString(),
      },
      cleared,
    };
  } else {
    cleared.hp = character.trackers.hp.marked;
    cleared.stress = character.trackers.stress.marked;
    cleared.armor = character.trackers.armor.marked;
    return {
      character: {
        ...character,
        trackers: {
          ...character.trackers,
          hp: { ...character.trackers.hp, marked: 0 },
          stress: { ...character.trackers.stress, marked: 0 },
          armor: { ...character.trackers.armor, marked: 0 },
        },
        hope: Math.min(character.hope + 1, 6),
        updatedAt: new Date().toISOString(),
      },
      cleared,
    };
  }
}

// ─── normalizeWeapons ─────────────────────────────────────────────────────────

export function normalizeWeapons(raw: {
  primary?: Partial<Weapons["primary"]>;
  secondary?: Partial<Weapons["secondary"]>;
}): Weapons {
  const normalizeSlot = (
    slot?: Partial<Weapons["primary"]>
  ): Weapons["primary"] => ({
    name: slot?.name ?? null,
    trait: slot?.trait ?? null,
    damage: slot?.damage ?? null,
    range: slot?.range ?? null,
    type: slot?.type ?? null,
    burden: slot?.burden ?? null,
  });

  return {
    primary: normalizeSlot(raw.primary),
    secondary: normalizeSlot(raw.secondary),
  };
}
