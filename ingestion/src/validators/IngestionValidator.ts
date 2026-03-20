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

import type {
  ClassData,
  CommunityData,
  AncestryData,
  DomainCard,
  RuleEntry,
  ValidationResult,
} from "@shared/types";

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
 *   - classFeature.name is non-empty (error if missing)
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

  // Class feature
  requireNonEmpty(result, data.classFeature?.name, "classFeature.name");

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

      if (!Array.isArray(sc.foundationFeatures) || sc.foundationFeatures.length < 2) {
        addWarning(
          result,
          `${prefix}.foundationFeatures`,
          `expected 2 foundation features (found ${sc.foundationFeatures?.length ?? 0})`
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

const VALID_LEVELS = new Set([1, 2, 3, 4, 5]);

/**
 * Validate a `DomainCard` object.
 *
 * Errors:
 *   - cardId, name, domain, source are non-empty
 *   - level is in the range 1–5
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
      `level must be between 1 and 5 (got ${data.level})`
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
