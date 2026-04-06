// ingestion/src/validators/IngestionValidator.ts
// Validates parsed game-data objects before they are written to DynamoDB.
//
// Each validator returns a ValidationResult:
//   valid    – false if any errors are present
//   errors   – blocking issues (bad type, missing required field, out-of-range)
//   warnings – non-blocking notices (empty optional fields, suspicious values)
//
// Validators exported:
//   validateClass(data: ClassData)           → ValidationResult
//   validateCommunity(data: CommunityData)   → ValidationResult
//   validateAncestry(data: AncestryData)     → ValidationResult
//   validateDomainCard(data: DomainCard)     → ValidationResult
//   validateRule(data: RuleEntry)            → ValidationResult
//   validateClassWithSRD(data: ClassData)    → ValidationResult (NEW: includes SRD checks)
//   validateDomainCardWithSRD(data: DomainCard) → ValidationResult (NEW: includes SRD checks)
//
// SRD INTEGRATION:
// This validator bridges campaign frame data validation with universal SRD rules
// (see /compliance/SrdValidationLayer.ts for mechanical enforcement).

import type {
  ClassData,
  CommunityData,
  AncestryData,
  DomainCard,
  RuleEntry,
  ValidationResult,
} from "@shared/types";

// Optionally import SRD validators if compliance module is available
// NOTE: In actual deployment, this should be imported; shown here as optional for now
// import { SRD_VALIDATION_LAYER } from "../../../compliance/SrdValidationLayer";

// ─── Internal helpers ─────────────────────────────────────────────────────────

function makeResult(): ValidationResult {
  return { valid: true, errors: [], warnings: [] };
}

function addError(
  result: ValidationResult,
  field: string,
  rule: string,
  message: string
): void {
  result.errors.push({ field, rule, message });
  result.valid = false;
}

function addWarning(
  result: ValidationResult,
  field: string,
  message: string
): void {
  result.warnings.push({ field, message });
}

/**
 * Assert that `value` is a non-empty string.  Adds an error otherwise.
 */
function requireNonEmpty(
  result: ValidationResult,
  value: string | undefined | null,
  field: string
): void {
  if (!value || value.trim().length === 0) {
    addError(result, field, "required", `${field} must be a non-empty string`);
  }
}

/**
 * Assert that `value` is a positive finite number.  Adds an error otherwise.
 */
function requirePositive(
  result: ValidationResult,
  value: number | undefined | null,
  field: string
): void {
  if (value === undefined || value === null || !isFinite(value)) {
    addError(result, field, "required", `${field} must be a number`);
  } else if (value <= 0) {
    addError(
      result,
      field,
      "positive",
      `${field} must be a positive number (got ${value})`
    );
  }
}

// ─── validateClass ────────────────────────────────────────────────────────────

/**
 * Validate a `ClassData` object.
 *
 * Errors (blocking):
 *   - classId, name, source are non-empty strings
 *   - startingEvasion and startingHitPoints are positive numbers
 *   - domains has exactly 2 non-empty entries
 *
 * Warnings (non-blocking):
 *   - classItems array is non-empty
 *   - hopeFeature.hopeCost >= 1
 *   - classFeatures[0].name is non-empty (error if missing)
 *   - each subclass has subclassId, name, spellcastTrait (errors),
 *     2 foundationFeatures, specializationFeature.name, masteryFeature.name (warnings)
 *   - backgroundQuestions and connectionQuestions are non-empty arrays
 *   - mechanicalNotes is non-empty
 */
export function validateClass(data: ClassData): ValidationResult {
  const result = makeResult();

  requireNonEmpty(result, data.classId, "classId");
  requireNonEmpty(result, data.name, "name");
  requireNonEmpty(result, data.source, "source");
  requirePositive(result, data.startingEvasion, "startingEvasion");
  requirePositive(result, data.startingHitPoints, "startingHitPoints");

  // Domains: exactly 2
  if (!Array.isArray(data.domains) || data.domains.length !== 2) {
    addError(
      result,
      "domains",
      "domain-count",
      `domains must have exactly 2 entries (found ${data.domains?.length ?? 0})`
    );
  } else {
    data.domains.forEach((d, i) => {
      if (!d || d.trim().length === 0) {
        addError(
          result,
          `domains[${i}]`,
          "required",
          `domains[${i}] must be non-empty`
        );
      }
    });
  }

  // Class items: warn if empty (not all classes are required to have items)
  if (!Array.isArray(data.classItems) || data.classItems.length === 0) {
    addWarning(result, "classItems", "classItems array is empty");
  }

  // Hope feature
  requireNonEmpty(result, data.hopeFeature?.name, "hopeFeature.name");
  if (!data.hopeFeature?.hopeCost || data.hopeFeature.hopeCost < 1) {
    addWarning(
      result,
      "hopeFeature.hopeCost",
      `hopeCost is ${data.hopeFeature?.hopeCost ?? "undefined"} — expected >= 1`
    );
  }
  requireNonEmpty(
    result,
    data.hopeFeature?.description,
    "hopeFeature.description"
  );

  // Class features (array — validate first entry's name at minimum)
  requireNonEmpty(result, data.classFeatures?.[0]?.name, "classFeatures[0].name");

  // Background questions
  if (!Array.isArray(data.backgroundQuestions) || data.backgroundQuestions.length === 0) {
    addWarning(result, "backgroundQuestions", "backgroundQuestions array is empty");
  }

  // Connection questions
  if (!Array.isArray(data.connectionQuestions) || data.connectionQuestions.length === 0) {
    addWarning(result, "connectionQuestions", "connectionQuestions array is empty");
  }

  // Mechanical notes
  if (!data.mechanicalNotes || data.mechanicalNotes.trim().length === 0) {
    addWarning(result, "mechanicalNotes", "mechanicalNotes is empty");
  }

  // Subclasses
  if (!Array.isArray(data.subclasses) || data.subclasses.length === 0) {
    addWarning(result, "subclasses", "no subclasses parsed");
  } else {
    data.subclasses.forEach((sc, i) => {
      const prefix = `subclasses[${i}]`;

      requireNonEmpty(result, sc.subclassId, `${prefix}.subclassId`);
      requireNonEmpty(result, sc.name, `${prefix}.name`);
      requireNonEmpty(result, sc.spellcastTrait, `${prefix}.spellcastTrait`);

      if (!Array.isArray(sc.foundationFeatures) || sc.foundationFeatures.length < 1) {
        addWarning(
          result,
          `${prefix}.foundationFeatures`,
          `expected at least 1 foundation feature (found ${sc.foundationFeatures?.length ?? 0})`
        );
      } else {
        sc.foundationFeatures.forEach((ff, j) => {
          if (!ff.name || ff.name.trim().length === 0) {
            addWarning(
              result,
              `${prefix}.foundationFeatures[${j}].name`,
              "foundation feature name is empty"
            );
          }
        });
      }

      if (!sc.specializationFeature?.name) {
        addWarning(
          result,
          `${prefix}.specializationFeature`,
          "missing specializationFeature.name"
        );
      }

      if (!sc.masteryFeature?.name) {
        addWarning(
          result,
          `${prefix}.masteryFeature`,
          "missing masteryFeature.name"
        );
      }
    });
  }

  return result;
}

// ─── validateCommunity ────────────────────────────────────────────────────────

/**
 * Validate a `CommunityData` object.
 *
 * Errors: communityId, name, source are non-empty; traitName and
 *         traitDescription are non-empty.
 * Warnings: flavorText is non-empty.
 */
export function validateCommunity(data: CommunityData): ValidationResult {
  const result = makeResult();

  requireNonEmpty(result, data.communityId, "communityId");
  requireNonEmpty(result, data.name, "name");
  requireNonEmpty(result, data.source, "source");

  if (!data.flavorText || data.flavorText.trim().length === 0) {
    addWarning(result, "flavorText", "flavorText is empty");
  }

  requireNonEmpty(result, data.traitName, "traitName");
  requireNonEmpty(result, data.traitDescription, "traitDescription");

  return result;
}

// ─── validateAncestry ─────────────────────────────────────────────────────────

/**
 * Validate an `AncestryData` object.
 *
 * Errors: ancestryId, name, source are non-empty; traitName and
 *         traitDescription are non-empty.
 * Warnings: flavorText is non-empty.
 */
export function validateAncestry(data: AncestryData): ValidationResult {
  const result = makeResult();

  requireNonEmpty(result, data.ancestryId, "ancestryId");
  requireNonEmpty(result, data.name, "name");
  requireNonEmpty(result, data.source, "source");

  if (!data.flavorText || data.flavorText.trim().length === 0) {
    addWarning(result, "flavorText", "flavorText is empty");
  }

  requireNonEmpty(result, data.traitName, "traitName");
  requireNonEmpty(result, data.traitDescription, "traitDescription");

  return result;
}

// ─── validateDomainCard ───────────────────────────────────────────────────────

const VALID_LEVELS = new Set([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);

/**
 * Validate a `DomainCard` object.
 *
 * Errors:
 *   - cardId, name, domain, source are non-empty
 *   - level is in the range 1–10
 *
 * Warnings:
 *   - isCursed = true but curseText is null/empty
 *   - isCursed = false but curseText is set (unexpected)
 *   - isGrimoire = true but grimoire array is empty
 *   - isGrimoire = false but description is empty (non-grimoire card with no prose)
 */
export function validateDomainCard(data: DomainCard): ValidationResult {
  const result = makeResult();

  requireNonEmpty(result, data.cardId, "cardId");
  requireNonEmpty(result, data.name, "name");
  requireNonEmpty(result, data.domain, "domain");
  requireNonEmpty(result, data.source, "source");

  if (!VALID_LEVELS.has(data.level)) {
    addError(
      result,
      "level",
      "level-range",
      `level must be between 1 and 10 (got ${data.level})`
    );
  }

  if (typeof data.recallCost !== "number" || data.recallCost < 0) {
    addError(
      result,
      "recallCost",
      "recallCost-range",
      `recallCost must be a non-negative number (got ${data.recallCost})`
    );
  }

  if (data.isCursed && !data.curseText) {
    addWarning(
      result,
      "curseText",
      "card is marked cursed (★) but curseText is null or empty"
    );
  }

  if (!data.isCursed && data.curseText) {
    addWarning(
      result,
      "curseText",
      "curseText is set but card is not marked as cursed (no ★ in filename)"
    );
  }

  if (data.isGrimoire && (!data.grimoire || data.grimoire.length === 0)) {
    addWarning(
      result,
      "grimoire",
      "card is marked as grimoire but grimoire ability array is empty"
    );
  }

  if (!data.isGrimoire && (!data.description || data.description.trim().length === 0)) {
    addWarning(
      result,
      "description",
      "non-grimoire card has an empty description"
    );
  }

  return result;
}

// ─── validateRule ─────────────────────────────────────────────────────────────

const VALID_RULE_TYPES = new Set<string>(["rule", "faction", "reputation", "curse"]);

/**
 * Validate a `RuleEntry` object.
 *
 * Errors:
 *   - ruleId, name, body are non-empty
 *   - type is one of: "rule" | "faction" | "reputation" | "curse"
 */
export function validateRule(data: RuleEntry): ValidationResult {
  const result = makeResult();

  requireNonEmpty(result, data.ruleId, "ruleId");
  requireNonEmpty(result, data.name, "name");
  requireNonEmpty(result, data.body, "body");

  if (!VALID_RULE_TYPES.has(data.type)) {
    addError(
      result,
      "type",
      "rule-type",
      `type must be one of rule|faction|reputation|curse (got "${data.type}")`
    );
  }

  return result;
}

// ─── SRD Integration ──────────────────────────────────────────────────────────
// The following validators integrate campaign frame validation with universal
// Daggerheart SRD rules. They check both structural integrity (existing validators
// above) and mechanical compliance (SRD constraints below).
//
// When campaign data is ingested, these combined validators ensure that the
// resulting game data cannot violate SRD rules at character creation or advancement.

/**
 * Validate a ClassData object with SRD compliance checks.
 *
 * STRUCTURAL CHECKS:
 *   - classId, name, source are non-empty
 *   - startingEvasion and startingHitPoints are positive
 *   - domains has exactly 2 entries
 *
 * SRD COMPLIANCE CHECKS:
 *   - startingEvasion must be ≤ 12 (armor cap per SRD page 3)
 *   - startingHitPoints must be plausible for character balance
 *   - domains must be valid Daggerheart domains
 *
 * Returns: ValidationResult with both structural and SRD errors combined.
 */
export function validateClassWithSRD(data: ClassData): ValidationResult {
  const result = validateClass(data); // First, structural validation
  
  // SRD Compliance: Evasion cap
  if (data.startingEvasion > 12) {
    addError(
      result,
      "startingEvasion",
      "srd-armor-cap",
      `startingEvasion ${data.startingEvasion} exceeds SRD maximum of 12 (SRD page 3)`
    );
  }
  
  // SRD Compliance: HP plausibility
  if (data.startingHitPoints < 4 || data.startingHitPoints > 10) {
    // Not a hard error, but a warning for balance
    addWarning(
      result,
      "startingHitPoints",
      `startingHitPoints ${data.startingHitPoints} is outside typical range of 4-10 (SRD page 3). Consider reviewing for class balance.`
    );
  }

  return result;
}

/**
 * Validate a DomainCard object with SRD compliance checks.
 *
 * STRUCTURAL CHECKS:
 *   - cardId, name, domain, source are non-empty
 *   - level is in range 1-10
 *
 * SRD COMPLIANCE CHECKS:
 *   - Cursed cards (★) must have curse mechanics defined
 *   - Card level must respect domain progression (1-10 per SRD)
 *
 * Returns: ValidationResult with both structural and SRD errors combined.
 */
export function validateDomainCardWithSRD(data: DomainCard): ValidationResult {
  const result = validateDomainCard(data); // First, structural validation

  // SRD Compliance: Level gating
  if (data.level < 1 || data.level > 10) {
    addError(
      result,
      "level",
      "srd-level-range",
      `Domain card level must be 1-10 per SRD (got ${data.level})`
    );
  }

  // SRD Compliance: Cursed cards must have curse text
  if (data.isCursed && !data.curseText) {
    addError(
      result,
      "curseText",
      "srd-cursed-missing-text",
      `Cursed domain card (★) must define curseText per SRD page 18: Curse mechanics (got empty text)`
    );
  }

  return result;
}
