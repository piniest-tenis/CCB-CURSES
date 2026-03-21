// backend/src/compliance/index.ts
//
// Public exports for SRD compliance validation.
// Use this as the single import point for all validators.

// Core validators
export * from "./srdValidator";

// API middleware
export * from "./apiMiddleware";

// Re-export types for convenience
export type {
  SrdValidationContext,
  ValidationError,
  SrdValidationResult,
} from "./srdValidator";

// Convenience exports for Lambda handlers
export {
  validateCharacterCreation,
  validateCharacterUpdate,
  validateLevelUpEndpoint,
  validators,
} from "./srdValidator";

export {
  validateCreationRequest,
  validateUpdateRequest,
  validateLevelUpRequest,
  validateResourceChange,
  validateDomainSwapRequest,
  validateRestRequest,
  validateCombatAction,
  buildValidationContext,
  formatValidationError,
  apiMiddleware,
} from "./apiMiddleware";
