/**
 * src/lib/homebrewUtils.ts
 *
 * Tiny utilities for detecting and handling homebrew content references.
 * Homebrew IDs follow the pattern "hb-{userId}-{slug}".
 */

/** Returns true if the given ID string is a homebrew content ID. */
export function isHomebrewId(id: string | null | undefined): boolean {
  return typeof id === "string" && id.startsWith("hb-");
}

/**
 * Returns a human-readable label when homebrew content has been deleted.
 * Falls back to the denormalized name if available, otherwise shows
 * a "[Deleted Homebrew]" message.
 */
export function deletedHomebrewLabel(
  denormalizedName: string | null | undefined,
  id: string | null | undefined,
): string {
  // If backend gave us a denormalized name that is NOT just the raw ID,
  // use it with a "(deleted)" suffix.
  if (denormalizedName && id && denormalizedName !== id) {
    return `${denormalizedName} (deleted)`;
  }
  return "[Deleted Homebrew]";
}
