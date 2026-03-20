// compliance/src/validators/DomainLoadoutValidator.ts
//
// Validates domain card loadouts against SRD rules.
// Rules enforced:
//   1. Max 5 cards in the active loadout.
//   2. Every loadout card must exist in the character's vault.
//   3. Every loadout card's level must be ≤ the character's level.
//   4. Every loadout card's domain must be one of the character's 2 class domains.

import type { DomainCard, ValidationResult } from "@shared/types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function ok(): ValidationResult {
  return { valid: true, errors: [], warnings: [] };
}

function merge(...results: ValidationResult[]): ValidationResult {
  const errors = results.flatMap((r) => r.errors);
  const warnings = results.flatMap((r) => r.warnings);
  return { valid: errors.length === 0, errors, warnings };
}

// ─── Single card validation ───────────────────────────────────────────────────

/**
 * Validates a single domain card against the character's current level and
 * allowed class domains.
 *
 * @param card            The domain card to validate.
 * @param characterLevel  The character's current level (1–10).
 * @param classDomains    The two domain names belonging to the character's class.
 */
export function validateVaultCard(
  card: DomainCard,
  characterLevel: number,
  classDomains: string[]
): ValidationResult {
  const errors: ValidationResult["errors"] = [];
  const warnings: ValidationResult["warnings"] = [];

  // Domain must belong to one of the character's two class domains
  if (!classDomains.includes(card.domain)) {
    errors.push({
      field: `domainVault.${card.cardId}.domain`,
      rule: "CARD_DOMAIN_NOT_IN_CLASS",
      message: `Card "${card.cardId}" belongs to domain "${card.domain}" which is not one of the character's class domains (${classDomains.join(", ")})`,
    });
  }

  // Card level must not exceed character level
  if (card.level > characterLevel) {
    errors.push({
      field: `domainVault.${card.cardId}.level`,
      rule: "CARD_LEVEL_EXCEEDS_CHARACTER",
      message: `Card "${card.cardId}" is level ${card.level} but character is only level ${characterLevel}`,
    });
  }

  // Warn about cursed cards so consumers can surface appropriate UI affordances
  if (card.isCursed) {
    warnings.push({
      field: `domainVault.${card.cardId}`,
      message: `Card "${card.cardId}" is a Cursed card (★) — ensure the player has accepted the associated curse`,
    });
  }

  return { valid: errors.length === 0, errors, warnings };
}

// ─── Full loadout validation ──────────────────────────────────────────────────

/**
 * Validates the full domain loadout against all SRD constraints.
 *
 * @param loadout        Array of cardIds currently in the active loadout (max 5).
 * @param vault          Array of all unlocked cardIds owned by the character.
 * @param characterLevel The character's current level.
 * @param classDomains   The two domain names for the character's class.
 * @param allCards       Complete collection of DomainCard records used for
 *                       level/domain lookups.
 */
export function validateLoadout(
  loadout: string[],
  vault: string[],
  characterLevel: number,
  classDomains: string[],
  allCards: DomainCard[]
): ValidationResult {
  const results: ValidationResult[] = [];
  const errors: ValidationResult["errors"] = [];
  const warnings: ValidationResult["warnings"] = [];

  // ── Rule 1: max 5 cards active ───────────────────────────────────────────
  if (loadout.length > 5) {
    errors.push({
      field: "domainLoadout",
      rule: "LOADOUT_EXCEEDS_MAX",
      message: `Loadout contains ${loadout.length} cards; maximum allowed is 5`,
    });
  }

  // Build a lookup map for quick access
  const cardMap = new Map<string, DomainCard>(
    allCards.map((c) => [c.cardId, c])
  );
  const vaultSet = new Set(vault);

  // ── Per-card rules ───────────────────────────────────────────────────────
  for (const cardId of loadout) {
    // Rule 2: loadout card must be in vault
    if (!vaultSet.has(cardId)) {
      errors.push({
        field: `domainLoadout.${cardId}`,
        rule: "LOADOUT_CARD_NOT_IN_VAULT",
        message: `Card "${cardId}" is in the loadout but not in the character's vault`,
      });
      continue; // can't check further rules without vault membership
    }

    const card = cardMap.get(cardId);

    if (!card) {
      // Card is in vault but not found in master list — data integrity issue
      warnings.push({
        field: `domainLoadout.${cardId}`,
        message: `Card "${cardId}" was not found in the provided allCards collection — skipping level/domain checks`,
      });
      continue;
    }

    // Rules 3 & 4: delegate to validateVaultCard
    const cardResult = validateVaultCard(card, characterLevel, classDomains);
    results.push(cardResult);
  }

  // Merge inline errors/warnings with sub-validator results
  results.push({ valid: errors.length === 0, errors, warnings });

  return merge(...results);
}
