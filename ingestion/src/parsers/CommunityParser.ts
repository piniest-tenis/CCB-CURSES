// ingestion/src/parsers/CommunityParser.ts
// Parses a single Daggerheart community markdown file into a CommunityData object.
//
// File structure (verified against Badlander.md and Davite.md):
//
//   _Flavor text describing the community._
//
//   **TraitName**: Trait description with mechanical effect.
//
// Edge cases handled:
//   - Files without a trait line (e.g. "Bent Trunkish.md") — traitName and
//     traitDescription are returned as empty strings with a console warning.
//   - Flavor text that spans more than one italic paragraph.
//   - Trait name containing a trailing colon inside the bold span.
//   - communityId derived via toSlug() from the filename stem.

import * as fs from "fs";
import * as path from "path";
import type { CommunityData, CharacterSource } from "@shared/types";
import { toSlug } from "../transformers/SlugTransformer";
import { extractMechanicalBonuses } from "../transformers/BonusExtractor";

/**
 * Parse a single community `.md` file into a `CommunityData` object.
 *
 * @param filePath  Absolute path to the markdown file.
 * @param name      Display name override (defaults to filename stem without `.md`).
 * @param source    Content source — "srd" or "homebrew" (default: "homebrew")
 */
export function parseCommunityFile(
  filePath: string,
  name?: string,
  source: CharacterSource = "homebrew"
): CommunityData {
  const raw = fs.readFileSync(filePath, "utf-8");
  const lines = raw.split(/\r?\n/).map((l) => l.trim());

  const communityName = name ?? path.basename(filePath, path.extname(filePath));
  const communityId = toSlug(communityName);

  // ── Flavor text ────────────────────────────────────────────────────────────
  // The flavor text is the first non-empty line that:
  //   (a) is wrapped in _..._ (italic), OR
  //   (b) does not start with ** (i.e. is not a trait line)
  let flavorText = "";
  let flavorIdx = -1;

  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (l.length === 0) continue;

    if (l.startsWith("_") && l.endsWith("_")) {
      // Italic flavor line — strip outer underscores
      flavorText = l.replace(/^_/, "").replace(/_$/, "").trim();
      flavorIdx = i;
      break;
    }

    // If it's not a bold trait line and not empty, treat it as bare flavor text
    if (!/^\*\*/.test(l)) {
      flavorText = l;
      flavorIdx = i;
      break;
    }

    // It's a bold trait line — flavor text is absent (unusual but possible)
    flavorIdx = i - 1; // position before first non-blank line
    break;
  }

  // ── Trait ──────────────────────────────────────────────────────────────────
  // The trait is the first non-empty line after the flavor text that matches
  // the pattern **TraitName**: description.
  let traitName = "";
  let traitDescription = "";
  let traitFound = false;

  for (let i = Math.max(flavorIdx + 1, 0); i < lines.length; i++) {
    const l = lines[i];
    if (l.length === 0) continue;

    // **TraitName**: description
    // Also handles **TraitName:** (colon inside the bold span)
    const boldMatch = l.match(/^\*\*([^*]+?)\*\*:?\s*(.*)$/);
    if (boldMatch) {
      traitName = boldMatch[1].replace(/:$/, "").trim();
      traitDescription = boldMatch[2].trim();
      traitFound = true;
      break;
    }
  }

  if (!traitFound) {
    console.warn(
      `[CommunityParser] No trait line found in ${path.basename(filePath)} — ` +
        `traitName and traitDescription will be empty.`
    );
  }

  const mechanicalBonuses = extractMechanicalBonuses(raw, traitDescription, "");

  return {
    communityId,
    name: communityName,
    flavorText,
    traitName,
    traitDescription,
    source,
    ...(mechanicalBonuses ? { mechanicalBonuses } : {}),
  };
}
