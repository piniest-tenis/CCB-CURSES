import type { Character, RuleEntry } from "@shared/types";

export type FieldInputType = "text" | "textarea" | "number";

export interface EditField {
  path: string;
  label: string;
  inputType?: FieldInputType;
  placeholder?: string;
  rows?: number;
  min?: number;
  max?: number;
  helpText?: string;
  helpRuleId?: string;
  note?: string;
}

function getValueAtPath(character: Character, path: string): unknown {
  return path.split(".").reduce<unknown>((current, part) => {
    if (current == null || typeof current !== "object") return undefined;
    return (current as Record<string, unknown>)[part];
  }, character);
}

export function getFieldValue(character: Character, field: EditField): string {
  const value = getValueAtPath(character, field.path);
  return value == null ? "" : String(value);
}

export function getFieldSrdHelpText(
  field: EditField,
  rule: RuleEntry | null | undefined
): string | null {
  if (field.helpText?.trim()) return field.helpText.trim();
  if (rule?.body?.trim()) return rule.body.trim();
  return null;
}

export const CHARACTER_NAME_FIELD: EditField = {
  path: "name",
  label: "Character Name",
  inputType: "text",
  placeholder: "Enter character name…",
  helpRuleId: "character",
};

export const CHARACTER_NOTES_FIELD: EditField = {
  path: "notes",
  label: "Character Notes",
  inputType: "textarea",
  placeholder: "Free-form notes, backstory, session reminders…",
  rows: 6,
};

// ─── Weapon fields ────────────────────────────────────────────────────────────

export function weaponNameField(slot: "primary" | "secondary"): EditField {
  return {
    path: `weapons.${slot}.name`,
    label: slot === "primary" ? "Primary Weapon Name" : "Secondary Weapon Name",
    inputType: "text",
    placeholder: "e.g. Shortsword, Hunter's Bow…",
    helpText:
      "The name of your weapon. Choose something evocative — weapons in Daggerheart are defined by their narrative role as much as their mechanical stats. (SRD p. 23)",
  };
}

export function weaponTraitField(slot: "primary" | "secondary"): EditField {
  return {
    path: `weapons.${slot}.trait`,
    label: slot === "primary" ? "Primary Weapon Trait" : "Secondary Weapon Trait",
    inputType: "text",
    placeholder: "e.g. Agility, Strength…",
    helpText:
      "The core trait used when making an attack roll with this weapon. Most melee weapons use Strength or Agility; finesse weapons use Finesse. (SRD p. 23)",
  };
}

export function weaponDamageField(slot: "primary" | "secondary"): EditField {
  return {
    path: `weapons.${slot}.damage`,
    label: slot === "primary" ? "Primary Weapon Damage" : "Secondary Weapon Damage",
    inputType: "text",
    placeholder: "e.g. 2d6+2, 1d8…",
    helpText:
      "Dice expression for damage dealt on a successful attack, e.g. \"2d6+2\". Add your proficiency if the weapon is in your proficiency tier. (SRD p. 23)",
  };
}

export function weaponRangeField(slot: "primary" | "secondary"): EditField {
  return {
    path: `weapons.${slot}.range`,
    label: slot === "primary" ? "Primary Weapon Range" : "Secondary Weapon Range",
    inputType: "text",
    placeholder: "e.g. Melee, Close, Far…",
    helpText:
      "The effective range of this weapon: Melee (adjacent), Close (within the same zone), Far (across zones). Some weapons are Versatile, covering two range bands. (SRD p. 23)",
  };
}

export function weaponFeatureField(slot: "primary" | "secondary"): EditField {
  return {
    path: `weapons.${slot}.feature`,
    label: slot === "primary" ? "Primary Weapon Feature" : "Secondary Weapon Feature",
    inputType: "text",
    placeholder: "e.g. Reliable, Slow, Thrown…",
    helpText:
      "An optional keyword feature that modifies how the weapon is used in play. Examples: Reliable (re-roll lowest die), Slow (disadvantage if moved this turn), Thrown (can attack at Close range). (SRD p. 23)",
  };
}

// ─── Experience fields ────────────────────────────────────────────────────────

export function experienceNameField(index: number): EditField {
  return {
    path: `experiences.${index}.name`,
    label: `Experience Name`,
    inputType: "text",
    placeholder: "e.g. Former Sailor, Herbalist, Street Thief…",
    helpText:
      "A short phrase describing a formative experience your character has. When you attempt an action that could reasonably draw on this experience, you may add its bonus die to your roll. (SRD p. 3)",
  };
}
