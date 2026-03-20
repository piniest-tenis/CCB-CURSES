// ingestion/src/parsers/RulesParser.ts
// Parses markdown files from the `Rules & Definitions` directory tree into
// RuleEntry objects.
//
// Directory → RuleType mapping (verified against actual file tree):
//
//   Rules & Definitions/                   → type = "rule"
//     Aura.md, Character.md, Creature.md,
//     Player.md, Ranger Companions.md
//
//   Rules & Definitions/Curses/            → type = "curse"
//     Curse.md, Linked Curse ↔.md
//
//   Rules & Definitions/Reputation/        → type = "reputation"
//     Adherent.md, Attitude.md, Reputation.md
//
//   Rules & Definitions/Reputation/Faction/ → type = "faction"
//     Faction.md, Favor.md, Figurehead.md, Primary Goals.md
//
// body = full file content, trimmed — preserved verbatim (tables, lists,
//   *** separators, etc.) so the frontend can render it as rich markdown.
//
// Index files whose filename matches their parent directory name are skipped.

import * as fs from "fs";
import * as path from "path";
import type { RuleEntry, RuleType } from "@shared/types";
import { toSlug } from "../transformers/SlugTransformer";

// ─── Type resolution ──────────────────────────────────────────────────────────

/**
 * Determine the `RuleType` from the file's path relative to the rules root.
 *
 * Path matching is case-insensitive and handles both forward and backward
 * slashes (for cross-platform compatibility on Windows WSL).
 *
 * @param filePath   Absolute path to the `.md` file.
 * @param rulesRoot  Absolute path to the `Rules & Definitions` directory.
 */
function determineRuleType(filePath: string, rulesRoot: string): RuleType {
  const relative = path
    .relative(rulesRoot, filePath)
    .replace(/\\/g, "/")
    .toLowerCase();

  if (relative.startsWith("curses/")) return "curse";
  if (relative.startsWith("reputation/faction/")) return "faction";
  if (relative.startsWith("reputation/")) return "reputation";
  return "rule";
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Parse a single rules/definitions `.md` file into a `RuleEntry`.
 *
 * The `body` field contains the full markdown content of the file with only
 * leading/trailing whitespace stripped.  Internal structure (tables,
 * `***` separators, bullet lists, bold scales in Attitude.md, etc.) is
 * preserved so that the frontend can render the content faithfully.
 *
 * @param filePath   Absolute path to the `.md` file.
 * @param rulesRoot  Absolute path to the `Rules & Definitions` root directory.
 */
export function parseRuleFile(filePath: string, rulesRoot: string): RuleEntry {
  const raw = fs.readFileSync(filePath, "utf-8");

  const name = path.basename(filePath, path.extname(filePath));
  const ruleId = toSlug(name);
  const type = determineRuleType(filePath, rulesRoot);
  const body = raw.trim();

  return { ruleId, name, body, type };
}

/**
 * Recursively walk `dirPath` and parse every `.md` file into a `RuleEntry`.
 *
 * Skipped files:
 *   - Any file whose filename stem (lower-cased) matches its parent directory
 *     name (lower-cased) — these are index/overview files.
 *   - Any file named exactly "rules & definitions.md" (top-level index).
 *
 * @param dirPath    Absolute path to the directory to walk.
 * @param rulesRoot  Absolute path to the `Rules & Definitions` root.
 *                   Defaults to `dirPath` when called for the first time.
 */
export function parseRulesDirectory(
  dirPath: string,
  rulesRoot?: string
): RuleEntry[] {
  const root = rulesRoot ?? dirPath;

  if (!fs.existsSync(dirPath)) return [];

  const results: RuleEntry[] = [];
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);

    if (entry.isDirectory()) {
      results.push(...parseRulesDirectory(fullPath, root));
      continue;
    }

    if (!entry.isFile() || !entry.name.endsWith(".md")) continue;

    const stem = path.basename(entry.name, ".md").toLowerCase();
    const dirName = path.basename(dirPath).toLowerCase();

    // Skip index files
    if (stem === dirName || stem === "rules & definitions") continue;

    results.push(parseRuleFile(fullPath, root));
  }

  return results;
}
