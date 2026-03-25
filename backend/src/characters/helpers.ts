// backend/src/characters/helpers.ts
// Pure helper functions extracted from handler.ts for unit testability.
// No I/O, no AWS SDK, no side-effects.

import { createHmac } from "crypto";
import { AppError } from "../common/middleware";
import type {
  Character,
  RestType,
  RestResult,
  Weapons,
  LevelUpChoices,
  AdvancementChoice,
  CoreStatName,
} from "@shared/types";

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
 * Tokens do not expire — they are permanently valid until the SHARE_TOKEN_SECRET rotates.
 */
export function signShareToken(
  characterId: string,
  userId: string
): string {
  const secret =
    process.env["SHARE_TOKEN_SECRET"] ?? "dev-secret-change-in-prod";
  const header = Buffer.from(
    JSON.stringify({ alg: "HS256", typ: "share" })
  ).toString("base64url");
  const payload = Buffer.from(
    JSON.stringify({ type: "share", characterId, userId })
  ).toString("base64url");
  const signature = createHmac("sha256", secret)
    .update(`${header}.${payload}`)
    .digest("base64url");
  return `${header}.${payload}.${signature}`;
}

/**
 * Verify a share token. Returns the decoded payload or throws an AppError.
 * Tokens do not carry an expiry claim — they are valid indefinitely.
 */
export function verifyShareToken(
  token: string,
  expectedCharacterId: string
): { characterId: string; userId: string } {
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

  let payload: { type: string; characterId: string; userId: string };
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

  return { characterId: payload.characterId, userId: payload.userId };
}

// ─── SRD Validation ───────────────────────────────────────────────────────────

export interface SrdError {
  field: string;
  issue: string;
}

export function validateSrdRules(character: Partial<Character>): SrdError[] {
  const errors: SrdError[] = [];

  // SRD page 20: Hope is 0–hopeMax (default 6).
  if (character.hope !== undefined) {
    const hopeMax = character.hopeMax ?? 6;
    if (character.hope < 0 || character.hope > hopeMax) {
      errors.push({ field: "hope", issue: `Hope must be between 0 and ${hopeMax}` });
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

  // SRD page 3: starting traits range from -1 to +2; allow -5 floor for penalty modifiers.
  if (character.stats) {
    for (const [stat, val] of Object.entries(character.stats)) {
      if (val < -5 || val > 8) {
        errors.push({
          field: `stats.${stat}`,
          issue: "Stat value must be between -5 and 8",
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
      // SRD page 20: HP and Stress cannot exceed 12.
      if ((key === "hp" || key === "stress") && tracker.max > 12) {
        errors.push({
          field: `trackers.${key}.max`,
          issue: `${key === "hp" ? "Hit Point" : "Stress"} max cannot exceed 12 (SRD page 20)`,
        });
      }
    }
  }

  if (character.level !== undefined) {
    if (character.level < 1 || character.level > 10) {
      errors.push({ field: "level", issue: "Level must be between 1 and 10" });
    }
  }

  for (const exp of character.experiences ?? []) {
    if (!exp.name || exp.name.trim() === "") {
      errors.push({
        field: "experiences",
        issue: "Experience name cannot be empty",
      });
    }
  }

  // ── Campaign mechanics ──────────────────────────────────────────────────────

  // cardTokens: all values must be non-negative integers.
  if (character.cardTokens) {
    for (const [cardId, count] of Object.entries(character.cardTokens)) {
      if (!Number.isInteger(count) || count < 0) {
        errors.push({
          field: `cardTokens.${cardId}`,
          issue: "Token count must be a non-negative integer",
        });
      }
    }
  }

  // downtimeProjects: countdownCurrent must be within [0, countdownMax].
  if (character.downtimeProjects) {
    for (const project of character.downtimeProjects) {
      if (project.countdownCurrent < 0) {
        errors.push({
          field: `downtimeProjects.${project.projectId}.countdownCurrent`,
          issue: "countdownCurrent must be >= 0",
        });
      }
      if (project.countdownMax < 1) {
        errors.push({
          field: `downtimeProjects.${project.projectId}.countdownMax`,
          issue: "countdownMax must be >= 1",
        });
      }
      if (project.countdownCurrent > project.countdownMax) {
        errors.push({
          field: `downtimeProjects.${project.projectId}.countdownCurrent`,
          issue: `countdownCurrent (${project.countdownCurrent}) cannot exceed countdownMax (${project.countdownMax})`,
        });
      }
    }
  }

  // activeAuras: at most one aura may be active at a time, and it must be in domainLoadout.
  if (character.activeAuras && character.domainLoadout) {
    if (character.activeAuras.length > 1) {
      errors.push({
        field: "activeAuras",
        issue: `Only one aura may be active at a time (found ${character.activeAuras.length})`,
      });
    }
    const loadoutSet = new Set(character.domainLoadout);
    for (const auraId of character.activeAuras) {
      if (!loadoutSet.has(auraId)) {
        errors.push({
          field: "activeAuras",
          issue: `Aura card '${auraId}' is not in domainLoadout`,
        });
      }
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
    const hopeMax = character.hopeMax ?? 6;
    return {
      character: {
        ...character,
        trackers: {
          ...character.trackers,
          hp: { ...character.trackers.hp, marked: 0 },
          stress: { ...character.trackers.stress, marked: 0 },
          armor: { ...character.trackers.armor, marked: 0 },
        },
        hope: Math.min(character.hope + 1, hopeMax),
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
    weaponId: slot?.weaponId ?? null,
  });

  return {
    primary: normalizeSlot(raw.primary),
    secondary: normalizeSlot(raw.secondary),
  };
}

// ─── Action Dispatch ──────────────────────────────────────────────────────────

export type ActionId =
  | "use-hope-feature"
  | "spend-token"
  | "add-token"
  | "clear-tokens"
  | "toggle-aura"
  | "tick-project"
  | "clear-stress"
  | "clear-hp"
  | "mark-stress"
  | "mark-hp"
  | "gain-hope"
  | "spend-hope"
  | "companion-clear-stress"
  | "companion-mark-stress"
  | "mark-armor"
  | "clear-armor"
  | "swap-loadout-card"
  | "acquire-domain-card"
  | "gain-favor"
  | "spend-favor";

export interface ActionParams {
  /** cardId for token / aura actions */
  cardId?: string;
  /** For swap-loadout-card: the card being moved from vault into loadout */
  vaultCardId?: string;
  /** For swap-loadout-card: the card being moved from loadout into vault (if loadout full) */
  loadoutCardId?: string;
  /** Amount to spend / clear / mark (defaults to 1) */
  n?: number;
  /** hopeCost for use-hope-feature */
  hopeCost?: number;
  /** projectId for tick-project */
  projectId?: string;
  /**
   * For swap-loadout-card: the rest context at time of swap.
   * "long" allows Linked Curse swaps; "none" means mid-play (Recall Cost applies).
   */
  restType?: "short" | "long" | "none";
  /** For swap-loadout-card: whether this is a Linked Curse (↔) card */
  isLinkedCurse?: boolean;
  /** factionId (or freeform source label) for gain-favor / spend-favor */
  factionId?: string;
}

/**
 * Thrown (as an AppError) when an action's validity check fails.
 * HTTP status: 422, code: "INVALID_ACTION".
 */
function invalidAction(message: string, field: string): never {
  throw new AppError("INVALID_ACTION", message, 422, [{ field, issue: message }]);
}

/**
 * Apply an actionable feature to a character and return the updated character.
 * Pure function — no I/O. Throws AppError (422) on validity failures.
 */
export function applyAction(
  character: Character,
  actionId: ActionId,
  params: ActionParams = {}
): Character {
  const n = params.n ?? 1;

  switch (actionId) {
    // ── Hope-feature spend ───────────────────────────────────────────────────
    case "use-hope-feature": {
      const cost = params.hopeCost ?? 1;
      if (character.hope < cost) {
        invalidAction(
          `Not enough Hope to use this feature (have ${character.hope}, need ${cost})`,
          "hope"
        );
      }
      return { ...character, hope: character.hope - cost };
    }

    // ── Token: decrement ────────────────────────────────────────────────────
    case "spend-token": {
      const cardId = params.cardId;
      if (!cardId) invalidAction("cardId is required for spend-token", "cardId");
      const current = character.cardTokens[cardId] ?? 0;
      if (current <= 0) {
        invalidAction(
          `No tokens remaining on card '${cardId}'`,
          `cardTokens.${cardId}`
        );
      }
      return {
        ...character,
        cardTokens: { ...character.cardTokens, [cardId]: current - 1 },
      };
    }

    // ── Token: increment ────────────────────────────────────────────────────
    case "add-token": {
      const cardId = params.cardId;
      if (!cardId) invalidAction("cardId is required for add-token", "cardId");
      const current = character.cardTokens[cardId] ?? 0;
      return {
        ...character,
        cardTokens: { ...character.cardTokens, [cardId]: current + 1 },
      };
    }

    // ── Token: reset to 0 ───────────────────────────────────────────────────
    case "clear-tokens": {
      const cardId = params.cardId;
      if (!cardId) invalidAction("cardId is required for clear-tokens", "cardId");
      return {
        ...character,
        cardTokens: { ...character.cardTokens, [cardId]: 0 },
      };
    }

    // ── Aura: toggle ────────────────────────────────────────────────────────
    // Only one aura may be active at a time (SRD / campaign rule).
    // Toggling an aura ON deactivates all other active auras.
    case "toggle-aura": {
      const cardId = params.cardId;
      if (!cardId) invalidAction("cardId is required for toggle-aura", "cardId");
      if (!character.domainLoadout.includes(cardId)) {
        invalidAction(
          `Card '${cardId}' is not in your domain loadout`,
          "domainLoadout"
        );
      }
      const isActive = character.activeAuras.includes(cardId);
      return {
        ...character,
        // Turning off: just remove this one.
        // Turning on: replace entire array with only this card.
        activeAuras: isActive ? character.activeAuras.filter((id) => id !== cardId) : [cardId],
      };
    }

    // ── Downtime project: tick ───────────────────────────────────────────────
    case "tick-project": {
      const projectId = params.projectId;
      if (!projectId) invalidAction("projectId is required for tick-project", "projectId");
      const idx = character.downtimeProjects.findIndex(
        (p) => p.projectId === projectId
      );
      if (idx === -1) {
        invalidAction(
          `Downtime project '${projectId}' not found`,
          "downtimeProjects"
        );
      }
      const project = character.downtimeProjects[idx]!;
      if (project.completed) {
        invalidAction(
          `Project '${project.name}' is already completed`,
          `downtimeProjects.${projectId}.completed`
        );
      }
      const newCurrent = project.countdownCurrent + 1;
      const nowCompleted = newCurrent >= project.countdownMax;
      const updatedProject = {
        ...project,
        countdownCurrent: newCurrent,
        completed: nowCompleted,
        completedAt: nowCompleted ? new Date().toISOString() : project.completedAt,
      };
      const updatedProjects = [...character.downtimeProjects];
      updatedProjects[idx] = updatedProject;
      return { ...character, downtimeProjects: updatedProjects };
    }

    // ── Stress: clear N marks ────────────────────────────────────────────────
    case "clear-stress": {
      const { marked, max } = character.trackers.stress;
      if (marked < n) {
        invalidAction(
          `Cannot clear ${n} stress mark(s) — only ${marked} marked`,
          "trackers.stress.marked"
        );
      }
      return {
        ...character,
        trackers: {
          ...character.trackers,
          stress: { max, marked: marked - n },
        },
      };
    }

    // ── HP: clear N marks ────────────────────────────────────────────────────
    case "clear-hp": {
      const { marked, max } = character.trackers.hp;
      if (marked < n) {
        invalidAction(
          `Cannot clear ${n} HP mark(s) — only ${marked} marked`,
          "trackers.hp.marked"
        );
      }
      return {
        ...character,
        trackers: {
          ...character.trackers,
          hp: { max, marked: marked - n },
        },
      };
    }

    // ── Stress: mark 1 ──────────────────────────────────────────────────────
    case "mark-stress": {
      const { marked, max } = character.trackers.stress;
      if (marked >= max) {
        invalidAction(
          `Stress is already at maximum (${max})`,
          "trackers.stress.marked"
        );
      }
      return {
        ...character,
        trackers: {
          ...character.trackers,
          stress: { max, marked: marked + 1 },
        },
      };
    }

    // ── HP: mark 1 ───────────────────────────────────────────────────────────
    case "mark-hp": {
      const { marked, max } = character.trackers.hp;
      if (marked >= max) {
        invalidAction(
          `HP is already at maximum (${max})`,
          "trackers.hp.marked"
        );
      }
      return {
        ...character,
        trackers: {
          ...character.trackers,
          hp: { max, marked: marked + 1 },
        },
      };
    }

    // ── Hope: gain 1 ─────────────────────────────────────────────────────────
    case "gain-hope": {
      const hopeMax = character.hopeMax ?? 6;
      if (character.hope >= hopeMax) {
        invalidAction(
          `Hope is already at maximum (${hopeMax})`,
          "hope"
        );
      }
      return { ...character, hope: character.hope + 1 };
    }

    // ── Hope: spend N ────────────────────────────────────────────────────────
    case "spend-hope": {
      if (character.hope < n) {
        invalidAction(
          `Not enough Hope (have ${character.hope}, need ${n})`,
          "hope"
        );
      }
      return { ...character, hope: character.hope - n };
    }

    // ── Companion: clear N stress marks ─────────────────────────────────────
    case "companion-clear-stress": {
      if (!character.companionState) {
        invalidAction("No companion is active on this character", "companionState");
      }
      const { marked, max } = character.companionState.stress;
      if (marked < n) {
        invalidAction(
          `Cannot clear ${n} companion stress mark(s) — only ${marked} marked`,
          "companionState.stress.marked"
        );
      }
      return {
        ...character,
        companionState: {
          ...character.companionState,
          stress: { max, marked: marked - n },
        },
      };
    }

    // ── Companion: mark 1 stress ─────────────────────────────────────────────
    case "companion-mark-stress": {
      if (!character.companionState) {
        invalidAction("No companion is active on this character", "companionState");
      }
      const { marked, max } = character.companionState.stress;
      if (marked >= max) {
        invalidAction(
          `Companion stress is already at maximum (${max})`,
          "companionState.stress.marked"
        );
      }
      return {
        ...character,
        companionState: {
          ...character.companionState,
          stress: { max, marked: marked + 1 },
        },
      };
    }

    // ── Armor: mark 1 ────────────────────────────────────────────────────────
    case "mark-armor": {
      const { marked, max } = character.trackers.armor;
      if (marked >= max) {
        invalidAction(
          `Armor is already at maximum (${max})`,
          "trackers.armor.marked"
        );
      }
      return {
        ...character,
        trackers: {
          ...character.trackers,
          armor: { max, marked: marked + 1 },
        },
      };
    }

    // ── Armor: clear N marks ──────────────────────────────────────────────────
    case "clear-armor": {
      const { marked, max } = character.trackers.armor;
      if (marked < n) {
        invalidAction(
          `Cannot clear ${n} armor mark(s) — only ${marked} marked`,
          "trackers.armor.marked"
        );
      }
      return {
        ...character,
        trackers: {
          ...character.trackers,
          armor: { max, marked: marked - n },
        },
      };
    }

    // ── Domain loadout: swap vault ↔ loadout ─────────────────────────────────
    //
    // Rules (SRD p.5 + campaign Linked Curse rules):
    //   restType = "long"  → Free swap. Linked Curse (↔) cards ARE allowed.
    //   restType = "short" → Free swap. Linked Curse (↔) cards NOT allowed.
    //   restType = "none"  → Mid-play. Recall Cost stress applies. Linked Curse NOT allowed.
    //
    // Linked Curse swap cost: 6 Stress (campaign rule).
    // Standard Recall Cost: card.recallCost stress (card data not available here;
    //   frontend passes n = recallCost for mid-play swaps).
    case "swap-loadout-card": {
      const { vaultCardId, loadoutCardId, restType = "none" } = params;
      if (!vaultCardId) {
        invalidAction("vaultCardId is required for swap-loadout-card", "vaultCardId");
      }

      // vaultCardId must be in the vault
      if (!character.domainVault.includes(vaultCardId)) {
        invalidAction(
          `Card '${vaultCardId}' is not in your vault`,
          "domainVault"
        );
      }
      // vaultCardId must not already be in loadout
      if (character.domainLoadout.includes(vaultCardId)) {
        invalidAction(
          `Card '${vaultCardId}' is already in your loadout`,
          "domainLoadout"
        );
      }

      // Detect Linked Curse cards by the ↔ marker in the cardId naming convention
      // or by the isLinkedCurse flag (passed via params.isLinkedCurse if available).
      // Since card metadata is not loaded in helpers, we rely on a flag passed by caller.
      const isLinkedCurse = params["isLinkedCurse"] === true;

      // Linked Curse restriction: only during long rests
      if (isLinkedCurse && restType !== "long") {
        invalidAction(
          "Linked Curse (↔) cards can only be swapped during a long rest",
          "domainLoadout"
        );
      }

      // Calculate stress cost
      let stressCost = 0;
      if (restType === "none") {
        // Mid-play: pay Recall Cost (caller passes n = recallCost)
        stressCost = isLinkedCurse ? 6 : (n ?? 0);
      } else if (restType === "short" || restType === "long") {
        // At start of rest: free — unless it's a Linked Curse on a short rest (blocked above)
        // Long rest Linked Curse swaps cost 6 stress (campaign rule)
        stressCost = isLinkedCurse && restType === "long" ? 6 : 0;
      }

      // Validate stress availability
      if (stressCost > 0) {
        const availableStress = character.trackers.stress.max - character.trackers.stress.marked;
        if (availableStress < stressCost) {
          invalidAction(
            `Not enough available stress for this swap (need ${stressCost}, have ${availableStress} free)`,
            "trackers.stress.marked"
          );
        }
      }

      // Build new loadout
      let newLoadout = [...character.domainLoadout];
      let newVault   = [...character.domainVault];

      if (newLoadout.length >= 5) {
        // Loadout full: must displace a card
        if (!loadoutCardId) {
          invalidAction(
            "Loadout is full (5/5). Specify loadoutCardId to move a card to the vault.",
            "domainLoadout"
          );
        }
        if (!newLoadout.includes(loadoutCardId)) {
          invalidAction(
            `Card '${loadoutCardId}' is not in your loadout`,
            "domainLoadout"
          );
        }
        // Linked Curse: cannot displace another Linked Curse for free — prevent confusion;
        // caller should never pass a Linked Curse as loadoutCardId unless intentional.
        newLoadout = newLoadout.filter((id) => id !== loadoutCardId);
        if (!newVault.includes(loadoutCardId)) newVault.push(loadoutCardId);
      }

      // Remove from vault, add to loadout
      newVault   = newVault.filter((id) => id !== vaultCardId);
      newLoadout = [...newLoadout, vaultCardId];

      // Apply stress cost
      const newStressMarked = character.trackers.stress.marked + stressCost;
      const newStressMax    = character.trackers.stress.max;

      // SRD p.21: stress overflow marks HP instead
      let newHpMarked = character.trackers.hp.marked;
      let actualStressMarked = newStressMarked;
      if (newStressMarked > newStressMax) {
        const overflow = newStressMarked - newStressMax;
        actualStressMarked = newStressMax;
        newHpMarked = Math.min(character.trackers.hp.marked + overflow, character.trackers.hp.max);
      }

      return {
        ...character,
        domainLoadout: newLoadout,
        domainVault:   newVault,
        trackers: {
          ...character.trackers,
          stress: { max: newStressMax, marked: actualStressMarked },
          hp:     { max: character.trackers.hp.max, marked: newHpMarked },
        },
      };
    }

    // ── Acquire domain card (add to vault) ────────────────────────────────
    case "acquire-domain-card": {
      const cardId = params.cardId;
      if (!cardId) {
        invalidAction("cardId is required for acquire-domain-card", "cardId");
      }
      // No-op if already in vault
      if (character.domainVault.includes(cardId)) {
        return character;
      }
      return {
        ...character,
        domainVault: [...character.domainVault, cardId],
      };
    }

    // ── Favor: gain N for a faction/source ────────────────────────────────
    case "gain-favor": {
      const factionId = params.factionId;
      if (!factionId) {
        invalidAction("factionId is required for gain-favor", "factionId");
      }
      const current = character.favors?.[factionId] ?? 0;
      return {
        ...character,
        favors: { ...character.favors, [factionId]: current + n },
      };
    }

    // ── Favor: spend N for a faction/source ───────────────────────────────
    case "spend-favor": {
      const factionId = params.factionId;
      if (!factionId) {
        invalidAction("factionId is required for spend-favor", "factionId");
      }
      const current = character.favors?.[factionId] ?? 0;
      if (current < n) {
        invalidAction(
          `Not enough Favors with '${factionId}' (have ${current}, need ${n})`,
          `favors.${factionId}`
        );
      }
      return {
        ...character,
        favors: { ...character.favors, [factionId]: current - n },
      };
    }

    default: {
      // Exhaustive check — TypeScript will error if a case is missing.
      const _exhaustive: never = actionId;
      invalidAction(`Unknown actionId: ${String(_exhaustive)}`, "actionId");
    }
  }
}

// ─── Level-Up System ──────────────────────────────────────────────────────────

/**
 * Tier for a given level (SRD p.22).
 * Tier 1 = creation only; Tier 2 = levels 2–4; Tier 3 = 5–7; Tier 4 = 8–10.
 */
export function tierForLevel(level: number): 1 | 2 | 3 | 4 {
  if (level <= 1) return 1;
  if (level <= 4) return 2;
  if (level <= 7) return 3;
  return 4;
}

/** True when leveling to this level triggers a Tier Achievement (SRD p.22). */
export function isTierAchievement(toLevel: number): boolean {
  return toLevel === 2 || toLevel === 5 || toLevel === 8;
}

/**
 * Count how many advancement slots a set of choices consumes.
 * "proficiency-increase" and "multiclass" cost 2 slots each.
 */
function advancementSlotCost(adv: AdvancementChoice): number {
  return adv.type === "proficiency-increase" || adv.type === "multiclass" ? 2 : 1;
}

/**
 * Helper: get which levels belong to a given tier.
 * Tier 1: level 1 only (no advancements)
 * Tier 2: levels 2–4
 * Tier 3: levels 5–7
 * Tier 4: levels 8–10
 */
function levelsInTier(tier: number): number[] {
  switch (tier) {
    case 1: return [1];
    case 2: return [2, 3, 4];
    case 3: return [5, 6, 7];
    case 4: return [8, 9, 10];
    default: return [];
  }
}

/**
 * Apply a level-up to a character. Pure function — no I/O.
 * Throws AppError (422) on any validation failure.
 *
 * Does NOT fetch new domain card data — caller is responsible for ensuring
 * newDomainCardId is a valid card for this character's domains. The card is
 * added to the vault (not the loadout) automatically.
 */
export function applyLevelUp(
  character: Character,
  choices: LevelUpChoices
): Character {
  const { targetLevel, advancements, newDomainCardId, exchangeCardId } = choices;

  // ── Validate target level ──────────────────────────────────────────────────
  if (targetLevel !== character.level + 1) {
    throw new AppError(
      "INVALID_LEVEL_UP",
      `targetLevel (${targetLevel}) must be exactly one above current level (${character.level})`,
      422,
      [{ field: "targetLevel", issue: "must equal character.level + 1" }]
    );
  }
  if (targetLevel < 2 || targetLevel > 10) {
    throw new AppError(
      "INVALID_LEVEL_UP",
      `Level must be between 2 and 10`,
      422,
      [{ field: "targetLevel", issue: "out of range" }]
    );
  }

  // ── Validate advancement slot count ───────────────────────────────────────
  // Level 1 is character creation (no advancements). Levels 2–10: exactly 2 slots.
  const totalSlots = advancements.reduce((sum, a) => sum + advancementSlotCost(a), 0);
  if (totalSlots !== 2) {
    throw new AppError(
      "INVALID_LEVEL_UP",
      `Advancements must total exactly 2 slots (got ${totalSlots})`,
      422,
      [{ field: "advancements", issue: "must total 2 slots" }]
    );
  }

  // ── Validate multiclass tier restriction ──────────────────────────────────
  const hasMulticlass = advancements.some((a) => a.type === "multiclass");
  if (hasMulticlass && targetLevel < 5) {
    throw new AppError(
      "INVALID_LEVEL_UP",
      "Multiclass is not available until Tier 3 (level 5+)",
      422,
      [{ field: "advancements", issue: "multiclass requires Tier 3" }]
    );
  }

  // ── Per-tier restrictions (SRD p.22) ──────────────────────────────────────
  const targetTier = tierForLevel(targetLevel);
  const history = character.levelUpHistory ?? {};
  const tierLevels = levelsInTier(targetTier);

  // Collect all advancements previously chosen in this tier
  const priorTierAdvancements: AdvancementChoice[] = [];
  for (const lv of tierLevels) {
    if (lv < targetLevel && history[lv]) {
      priorTierAdvancements.push(...history[lv]!);
    }
  }

  // trait-bonus: once per tier
  const traitBonusInTier = priorTierAdvancements.some((a) => a.type === "trait-bonus");
  const traitBonusInChoices = advancements.filter((a) => a.type === "trait-bonus").length;
  if (traitBonusInChoices > 1) {
    throw new AppError("INVALID_LEVEL_UP", "trait-bonus can only be selected once per level-up", 422,
      [{ field: "advancements", issue: "duplicate trait-bonus" }]);
  }
  if (traitBonusInTier && traitBonusInChoices > 0) {
    throw new AppError("INVALID_LEVEL_UP", "trait-bonus already used this tier — can only be taken once per tier", 422,
      [{ field: "advancements", issue: "trait-bonus once per tier" }]);
  }

  // subclass-upgrade and multiclass: mutually exclusive within a tier
  const hasSubclassInTier = priorTierAdvancements.some((a) => a.type === "subclass-upgrade");
  const hasMulticlassInTier = priorTierAdvancements.some((a) => a.type === "multiclass");
  const choosingSubclass = advancements.some((a) => a.type === "subclass-upgrade");
  const choosingMulticlass = advancements.some((a) => a.type === "multiclass");

  if (choosingSubclass && (hasMulticlassInTier || choosingMulticlass)) {
    throw new AppError("INVALID_LEVEL_UP", "subclass-upgrade and multiclass are mutually exclusive within a tier", 422,
      [{ field: "advancements", issue: "subclass/multiclass exclusion" }]);
  }
  if (choosingMulticlass && (hasSubclassInTier || choosingSubclass)) {
    throw new AppError("INVALID_LEVEL_UP", "multiclass and subclass-upgrade are mutually exclusive within a tier", 422,
      [{ field: "advancements", issue: "multiclass/subclass exclusion" }]);
  }

  // multiclass: permanently once only (check ALL history, not just this tier)
  if (choosingMulticlass) {
    const allHistory = Object.values(history).flat();
    if (allHistory.some((a) => a.type === "multiclass")) {
      throw new AppError("INVALID_LEVEL_UP", "multiclass can only be taken once (permanently)", 422,
        [{ field: "advancements", issue: "multiclass already taken" }]);
    }
  }

  // ── Start building updated character ─────────────────────────────────────
  let updated: Character = { ...character, level: targetLevel };

  // Ensure levelUpHistory and markedTraits exist
  updated = {
    ...updated,
    levelUpHistory: { ...(updated.levelUpHistory ?? {}) },
    markedTraits: [...(updated.markedTraits ?? [])],
  };

  // ── Step 1: Tier Achievement (automatic) ─────────────────────────────────
  if (isTierAchievement(targetLevel)) {
    // Proficiency +1 at tier achievement (SRD p.22)
    updated = {
      ...updated,
      proficiency: Math.min(6, (updated.proficiency ?? 1) + 1),
    };
    // Clear marked traits at levels 5 and 8 (SRD p.22)
    if (targetLevel === 5 || targetLevel === 8) {
      updated = { ...updated, markedTraits: [] };
    }
  }

  // ── Step 2: Damage Thresholds +1 (automatic, SRD p.22) ──────────────────
  updated = {
    ...updated,
    damageThresholds: {
      major:  updated.damageThresholds.major  + 1,
      severe: updated.damageThresholds.severe + 1,
    },
  };

  // ── Step 3: Apply Advancements ────────────────────────────────────────────
  for (const adv of advancements) {
    switch (adv.type) {
      case "trait-bonus": {
        // Detail is comma-separated pair of stat names, e.g. "agility,strength"
        const detail = adv.detail;
        if (!detail) {
          throw new AppError("INVALID_LEVEL_UP", "trait-bonus requires detail (two comma-separated stat names)", 422,
            [{ field: "advancements.detail", issue: "missing stat names" }]);
        }
        const statNames = detail.split(",").map((s) => s.trim()) as CoreStatName[];
        if (statNames.length !== 2) {
          throw new AppError("INVALID_LEVEL_UP", "trait-bonus detail must contain exactly two comma-separated stat names", 422,
            [{ field: "advancements.detail", issue: "must be two stats" }]);
        }
        for (const statName of statNames) {
          if (!(statName in updated.stats)) {
            throw new AppError("INVALID_LEVEL_UP", `trait-bonus: '${statName}' is not a valid stat name`, 422,
              [{ field: "advancements.detail", issue: `invalid stat name: ${statName}` }]);
          }
        }
        // Apply +1 to both stats and mark them
        const newStats = { ...updated.stats };
        const newMarked = [...updated.markedTraits];
        for (const statName of statNames) {
          newStats[statName] = (newStats[statName] ?? 0) + 1;
          if (!newMarked.includes(statName)) {
            newMarked.push(statName);
          }
        }
        updated = { ...updated, stats: newStats, markedTraits: newMarked };
        break;
      }

      case "hp-slot": {
        const newMax = Math.min(12, updated.trackers.hp.max + 1);
        updated = {
          ...updated,
          trackers: { ...updated.trackers, hp: { ...updated.trackers.hp, max: newMax } },
        };
        break;
      }

      case "stress-slot": {
        const newMax = Math.min(12, updated.trackers.stress.max + 1);
        updated = {
          ...updated,
          trackers: { ...updated.trackers, stress: { ...updated.trackers.stress, max: newMax } },
        };
        break;
      }

      case "evasion": {
        updated = {
          ...updated,
          derivedStats: { ...updated.derivedStats, evasion: updated.derivedStats.evasion + 1 },
        };
        break;
      }

      case "proficiency-increase": {
        // Double-slot; also checked for slot cost above
        updated = {
          ...updated,
          proficiency: Math.min(6, (updated.proficiency ?? 1) + 1),
        };
        break;
      }

      case "experience-bonus": {
        // Detail is comma-separated pair of experience names, e.g. "Stealth,Athletics"
        const detail = adv.detail;
        if (!detail) {
          throw new AppError("INVALID_LEVEL_UP", "experience-bonus requires detail (two comma-separated experience names)", 422,
            [{ field: "advancements.detail", issue: "missing experience names" }]);
        }
        const expNames = detail.split(",").map((s) => s.trim());
        if (expNames.length !== 2) {
          throw new AppError("INVALID_LEVEL_UP", "experience-bonus detail must contain exactly two comma-separated experience names", 422,
            [{ field: "advancements.detail", issue: "must be two experiences" }]);
        }
        const newExps = [...updated.experiences];
        for (const expName of expNames) {
          const idx = newExps.findIndex((e) => e.name === expName);
          if (idx === -1) {
            throw new AppError("INVALID_LEVEL_UP", `Experience '${expName}' not found on character`, 422,
              [{ field: "advancements.detail", issue: `experience not found: ${expName}` }]);
          }
          newExps[idx] = { ...newExps[idx]!, bonus: newExps[idx]!.bonus + 1 };
        }
        updated = { ...updated, experiences: newExps };
        break;
      }

      case "additional-domain-card": {
        const cardId = adv.detail;
        if (!cardId) {
          throw new AppError("INVALID_LEVEL_UP", "additional-domain-card requires detail (cardId)", 422,
            [{ field: "advancements.detail", issue: "missing cardId" }]);
        }
        if (!updated.domainVault.includes(cardId)) {
          updated = { ...updated, domainVault: [...updated.domainVault, cardId] };
        }
        break;
      }

      case "subclass-upgrade": {
        // The subclassId change is handled by the frontend selecting a new subclass;
        // this advancement just records that the slot was used.
        // No structural change needed here — subclass identity is in CharacterSummary.
        break;
      }

      case "multiclass": {
        // Detail format: "classId|domainId|subclassId" (SRD p.43)
        // Persist the three chosen identifiers on the character.
        // className and subclassName are resolved by the handler after looking
        // up the class record; here we store only the IDs.
        const detail = adv.detail;
        if (!detail) {
          throw new AppError("INVALID_LEVEL_UP",
            "multiclass requires detail in the format 'classId|domainId|subclassId'", 422,
            [{ field: "advancements.detail", issue: "missing multiclass detail" }]);
        }
        const parts = detail.split("|");
        if (parts.length !== 3 || parts.some((p) => !p.trim())) {
          throw new AppError("INVALID_LEVEL_UP",
            "multiclass detail must be 'classId|domainId|subclassId'", 422,
            [{ field: "advancements.detail", issue: "invalid multiclass detail format" }]);
        }
        const [mcClassId, mcDomainId, mcSubclassId] = parts as [string, string, string];
        updated = {
          ...updated,
          multiclassClassId:   mcClassId.trim(),
          multiclassClassName: null, // resolved by handler after class lookup
          multiclassSubclassId: mcSubclassId.trim(),
          multiclassDomainId:  mcDomainId.trim(),
        };
        break;
      }
    }
  }

  // ── Step 4: Record level-up history ───────────────────────────────────────
  updated = {
    ...updated,
    levelUpHistory: {
      ...updated.levelUpHistory,
      [targetLevel]: advancements,
    },
  };

  // ── Step 5: New Domain Card ───────────────────────────────────────────────
  if (newDomainCardId) {
    if (exchangeCardId) {
      // Exchange: remove old card from vault (and loadout if present), add new one
      if (!updated.domainVault.includes(exchangeCardId)) {
        throw new AppError("INVALID_LEVEL_UP", `exchangeCardId '${exchangeCardId}' is not in vault`, 422,
          [{ field: "exchangeCardId", issue: "card not in vault" }]);
      }
      updated = {
        ...updated,
        domainVault: [
          ...updated.domainVault.filter((id) => id !== exchangeCardId),
          newDomainCardId,
        ],
        domainLoadout: updated.domainLoadout.includes(exchangeCardId)
          ? updated.domainLoadout.map((id) => (id === exchangeCardId ? newDomainCardId : id))
          : updated.domainLoadout,
      };
    } else {
      // Add to vault if not already present
      if (!updated.domainVault.includes(newDomainCardId)) {
        updated = { ...updated, domainVault: [...updated.domainVault, newDomainCardId] };
      }
    }
  }

  return updated;
}
