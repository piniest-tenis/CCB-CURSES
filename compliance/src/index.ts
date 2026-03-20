// compliance/src/index.ts
//
// Public surface of the @daggerheart/compliance package.
// Re-exports all validators, calculators, and Zod schemas.

// ─── Calculators ──────────────────────────────────────────────────────────────

export {
  calculateDamageThresholds,
  calculateEvasion,
  calculateMaxArmor,
  calculateMaxHP,
  calculateMaxStress,
  calculateProficiency,
  getTier,
  isFeatureUnlocked,
} from "./calculators/DerivedStatCalculator";

// ─── Validators ───────────────────────────────────────────────────────────────

export {
  validateCoreStats,
  validateDamageThresholds,
  validateHP,
  validateHope,
  validateStress,
} from "./validators/StatValidator";

export {
  validateLoadout,
  validateVaultCard,
} from "./validators/DomainLoadoutValidator";

export {
  validateDomainCardUnlock,
  validateLevelUp,
  validateSubclassAccess,
} from "./validators/AdvancementValidator";

export {
  validateCharacter,
  validateCharacterCreate,
} from "./validators/CharacterValidator";

// ─── Zod Schemas ──────────────────────────────────────────────────────────────

export {
  CharacterCreateSchema,
  CharacterUpdateSchema,
  CoreStatsSchema,
  ExperienceSchema,
  MediaPresignSchema,
  RestRequestSchema,
  UserUpdateSchema,
  WeaponSchema,
} from "./schemas/zod-schemas";

// ─── Inferred schema types ────────────────────────────────────────────────────

export type {
  CharacterCreateInput,
  CharacterUpdateInput,
  CoreStatsInput,
  ExperienceInput,
  MediaPresignInput,
  RestRequestInput,
  UserUpdateInput,
  WeaponInput,
} from "./schemas/zod-schemas";
