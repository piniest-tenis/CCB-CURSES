// ingestion/src/transformers/SlugTransformer.ts
// Slug utilities for generating consistent identifiers from Markdown file
// names and Obsidian wiki-link syntax.
//
// Three exports:
//   toSlug(name)           – general-purpose lowercase hyphen slug
//   resolveWikiLink(link)  – Obsidian [[...]] → slug of the referenced item
//   toCardId(filename)     – domain-card filename → stable cardId slug

import slugify from "slugify";

// ─── toSlug ───────────────────────────────────────────────────────────────────

/**
 * Convert a display name to a URL-safe, lowercase, hyphen-separated slug.
 *
 * Uses the `slugify` library with strict mode so that accented characters and
 * all non-alphanumeric symbols (except hyphens) are removed.
 *
 * Examples:
 *   "Dirty Fighter"      → "dirty-fighter"
 *   "Don't Fall in Love" → "dont-fall-in-love"
 *   "Impactful Artist"   → "impactful-artist"
 *   "True Believer"      → "true-believer"
 */
export function toSlug(name: string): string {
  return slugify(name, { lower: true, strict: true, replacement: "-" });
}

// ─── resolveWikiLink ──────────────────────────────────────────────────────────

/**
 * Resolve an Obsidian-style wiki link into a slug that matches the canonical
 * identifier used in the database.
 *
 * Supported formats:
 *   [[Faction]]                            → "faction"
 *   [[Adherent|Adherents]]                 → "adherents"         (alias used as display)
 *   [[Path/To/Thing|Alias]]                → "alias"
 *   [[Path/To/Thing]]                      → "thing"             (last path segment)
 *   [[(Level 4) Fop ★ ↔]]                → "fop"               (card link)
 *   [[(Level 4) Fop ★ ↔|Fop]]            → "fop"
 *
 * Resolution order:
 *   1. Strip surrounding [[ and ]].
 *   2. If a pipe (|) is present, take everything AFTER it as the text to slug.
 *      (Obsidian convention: left = file path, right = display text.  We
 *       prefer the display alias when present because it is the human-readable
 *       name that matches domain-card names.)
 *      Exception: if the right side is empty, fall through to the left side.
 *   3. If no pipe, use the full inner string.
 *   4. Split on "/" and take the last path segment.
 *   5. Pass through toCardId() so that level prefixes and ★/↔ markers are
 *      stripped before slugifying — this ensures card cross-references
 *      (e.g. [[(Level 4) Fop ★ ↔]]) resolve to the same id as the card file.
 *
 * NOTE: For non-card links (e.g. [[Faction]], [[Character]]) toCardId() is
 * effectively a no-op because those strings contain no level prefix or symbols.
 */
export function resolveWikiLink(link: string): string {
  // Strip surrounding [[ ]]
  const inner = link.replace(/^\[\[/, "").replace(/\]\]$/, "");

  // Split on the first unescaped pipe character
  const pipeIdx = inner.indexOf("|");

  let target: string;
  if (pipeIdx !== -1) {
    const alias = inner.slice(pipeIdx + 1).trim();
    // Use alias when non-empty; otherwise fall back to the path part
    target = alias.length > 0 ? alias : inner.slice(0, pipeIdx).trim();
  } else {
    target = inner.trim();
  }

  // Take the last path segment (Obsidian nested vault paths use /)
  const slashIdx = target.lastIndexOf("/");
  const segment = slashIdx !== -1 ? target.slice(slashIdx + 1) : target;

  // toCardId handles level-prefix and symbol stripping before slugifying
  return toCardId(segment);
}

// ─── toCardId ─────────────────────────────────────────────────────────────────

/**
 * Convert a domain-card filename (with or without its ".md" extension) to a
 * stable cardId slug.
 *
 * Filename format: `(Level N) Card Name [★] [↔][.md]`
 *
 * Processing steps (in order):
 *   1. Strip the ".md" extension if present.
 *   2. Strip the leading "(Level N) " prefix (case-insensitive; N may be
 *      multi-digit).
 *   3. Strip the cursed marker ★ and the linked-curse marker ↔ together with
 *      any surrounding whitespace produced by their removal.
 *   4. Trim the result and pass through toSlug().
 *
 * Examples:
 *   "(Level 1) Bewitch.md"              → "bewitch"
 *   "(Level 2) Iconoclast ★.md"         → "iconoclast"
 *   "(Level 3) Performer ★ ↔.md"        → "performer"
 *   "(Level 4) Dirty Fighter ★ ↔.md"   → "dirty-fighter"
 *   "(Level 4) Grace Note.md"            → "grace-note"
 *   "Faction"                            → "faction"   (no-op for non-card strings)
 */
export function toCardId(filename: string): string {
  // 1. Strip .md extension
  let name = filename.replace(/\.md$/i, "");

  // 2. Strip "(Level N) " prefix — N may be one or more digits
  name = name.replace(/^\(Level\s+\d+\)\s*/i, "");

  // 3. Strip ★ and ↔ markers and collapse any extra whitespace they leave
  name = name.replace(/\s*[★↔]\s*/g, " ").trim();

  // 4. Slugify
  return toSlug(name);
}
