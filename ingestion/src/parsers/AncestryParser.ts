// ingestion/src/parsers/AncestryParser.ts
// Parses Daggerheart ancestry markdown files into AncestryData objects.
//
// File structure is identical to community files:
//   Line 1: _Flavor text_
//   Line 3: **TraitName**: Trait description
//
// Edge cases:
//   - The Ancestries directory may be empty (no .md files) — returns [] with a warning.
//   - A file may have no content at all — returns a minimal record with a warning.
//   - ancestryId is derived via toSlug() from the filename stem.

import * as fs from "fs";
import * as path from "path";
import type { AncestryData, CharacterSource } from "@shared/types";
import { toSlug } from "../transformers/SlugTransformer";
import { extractMechanicalBonuses } from "../transformers/BonusExtractor";

/**
 * Parse a single ancestry `.md` file into an `AncestryData` object.
 *
 * @param filePath  Absolute path to the markdown file.
 * @param name      Display name override (defaults to filename stem without `.md`).
 * @param source    Content source — "srd" or "homebrew" (default: "homebrew")
 */
export function parseAncestryFile(
  filePath: string,
  name?: string,
  source: CharacterSource = "homebrew"
): AncestryData {
  const raw = fs.readFileSync(filePath, "utf-8");
  const lines = raw.split(/\r?\n/).map((l) => l.trim());

  const ancestryName = name ?? path.basename(filePath, path.extname(filePath));
  const ancestryId = toSlug(ancestryName);

  if (lines.every((l) => l.length === 0)) {
    console.warn(
      `[AncestryParser] File is empty: ${path.basename(filePath)}. ` +
        `Returning minimal AncestryData.`
    );
    return {
      ancestryId,
      name: ancestryName,
      flavorText: "",
      traitName: "",
      traitDescription: "",
      secondTraitName: "",
      secondTraitDescription: "",
      source,
    };
  }

  // ── Flavor text ────────────────────────────────────────────────────────────
  // First non-empty line that is italic (_..._) or is not a bold trait line.
  let flavorText = "";
  let flavorIdx = -1;

  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (l.length === 0) continue;

    if (l.startsWith("_") && l.endsWith("_")) {
      flavorText = l.replace(/^_/, "").replace(/_$/, "").trim();
      flavorIdx = i;
      break;
    }

    if (!/^\*\*/.test(l)) {
      flavorText = l;
      flavorIdx = i;
      break;
    }

    // Bold trait line encountered before any flavor — flavor is absent
    flavorIdx = i - 1;
    break;
  }

  // ── Traits ─────────────────────────────────────────────────────────────────
  // Collect all **Name**: description lines after the flavor text.
  const traits: Array<{ name: string; description: string }> = [];

  for (let i = Math.max(flavorIdx + 1, 0); i < lines.length; i++) {
    const l = lines[i];
    if (l.length === 0) continue;
    // Skip section headings like "# Ancestry"
    if (/^#+\s/.test(l)) continue;

    // **TraitName**: description (colon may be inside or outside bold span)
    const boldMatch = l.match(/^\*\*([^*]+?)\*\*:?\s*(.*)$/);
    if (boldMatch) {
      traits.push({
        name: boldMatch[1].replace(/:$/, "").trim(),
        description: boldMatch[2].trim(),
      });
    }
  }

  const traitName        = traits[0]?.name        ?? "";
  const traitDescription = traits[0]?.description ?? "";
  const secondTraitName        = traits[1]?.name        ?? "";
  const secondTraitDescription = traits[1]?.description ?? "";

  if (traits.length === 0) {
    console.warn(
      `[AncestryParser] No trait line found in ${path.basename(filePath)} — ` +
        `traitName and traitDescription will be empty.`
    );
  }

  const mechanicalBonuses = extractMechanicalBonuses(raw, traitDescription, secondTraitDescription);

  return {
    ancestryId,
    name: ancestryName,
    flavorText,
    traitName,
    traitDescription,
    secondTraitName,
    secondTraitDescription,
    source,
    ...(mechanicalBonuses ? { mechanicalBonuses } : {}),
  };
}

/**
 * Parse all ancestry files in a directory.
 *
 * Returns an empty array (with a warning) when:
 *   - the directory does not exist
 *   - the directory contains no `.md` files
 *
 * Index files whose filename matches the directory name are skipped.
 *
 * @param dirPath  Absolute path to the Ancestries directory.
 */
export function parseAncestryDirectory(dirPath: string): AncestryData[] {
  if (!fs.existsSync(dirPath)) {
    console.warn(
      `[AncestryParser] Directory not found: ${dirPath} — returning empty array.`
    );
    return [];
  }

  const dirName = path.basename(dirPath).toLowerCase();

  const files = fs
    .readdirSync(dirPath)
    .filter(
      (f) =>
        f.endsWith(".md") &&
        path.basename(f, ".md").toLowerCase() !== dirName
    )
    .map((f) => path.join(dirPath, f));

  if (files.length === 0) {
    console.warn(
      `[AncestryParser] No ancestry .md files found in ${dirPath} — returning empty array.`
    );
    return [];
  }

  const results: AncestryData[] = [];
  for (const fp of files) {
    try {
      results.push(parseAncestryFile(fp));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(
        `[AncestryParser] Failed to parse ${path.basename(fp)}: ${msg} — skipping.`
      );
    }
  }
  return results;
}
