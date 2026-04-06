#!/usr/bin/env ts-node
// ingestion/src/index.ts
// Daggerheart Ingestion Pipeline — CLI Entry Point
//
// Usage:
//   ts-node src/index.ts [--category=all|classes|communities|ancestries|domains|rules]
//                        [--dry-run]
//                        [--verbose]
//
// Options:
//   --category=<cat>  Which data category to ingest (default: all)
//   --dry-run         Parse + validate without writing to DynamoDB
//   --verbose         Print per-item validation details (including passes)
//   --help, -h        Show usage and exit
//
// Environment variables:
//   DYNAMODB_REGION     AWS region (default: us-east-1)
//   DYNAMODB_ENDPOINT   Override endpoint URL for DynamoDB Local / LocalStack
//   TABLE_CLASSES       DynamoDB table name (default: Classes)
//   TABLE_GAME_DATA     DynamoDB table name (default: GameData)
//   TABLE_DOMAIN_CARDS  DynamoDB table name (default: DomainCards)
//
// DynamoDB key schema:
//   Classes table:
//     class metadata  → PK: "CLASS#<classId>"  SK: "METADATA"
//     subclass        → PK: "CLASS#<classId>"  SK: "SUBCLASS#<subclassId>"
//   GameData table:
//     community       → PK: "COMMUNITY#<communityId>"  SK: "METADATA"
//     ancestry        → PK: "ANCESTRY#<ancestryId>"    SK: "METADATA"
//     rule/curse etc. → PK: "RULE#<ruleId>"            SK: "METADATA"
//   DomainCards table:
//     card            → PK: "DOMAIN#<domain>"  SK: "CARD#<cardId>"
//
// Exit codes:
//   0  All items parsed and validated without errors (warnings allowed)
//   1  One or more validation errors, or a fatal runtime exception

import * as fs from "fs";
import * as path from "path";
import { glob } from "glob";

import { parseClassFile } from "./parsers/ClassParser";
import { parseCommunityFile } from "./parsers/CommunityParser";
import { parseAncestryFile } from "./parsers/AncestryParser";
import { parseDomainCardFile } from "./parsers/DomainCardParser";
import { parseRuleFile } from "./parsers/RulesParser";

import {
  validateClass,
  validateCommunity,
  validateAncestry,
  validateDomainCard,
  validateRule,
} from "./validators/IngestionValidator";

import { batchUpsert, batchDelete, scanAllKeys } from "./loaders/DynamoLoader";

import type {
  ClassData,
  CommunityData,
  AncestryData,
  DomainCard,
  RuleEntry,
  ValidationResult,
  CharacterSource,
} from "@shared/types";

// ─── Configuration ────────────────────────────────────────────────────────────

const MARKDOWN_ROOT = path.resolve(__dirname, "../../markdown");
const RULES_ROOT = path.join(MARKDOWN_ROOT, "Rules & Definitions");

const TABLE_CLASSES = process.env["TABLE_CLASSES"] ?? "Classes";
const TABLE_GAME_DATA = process.env["TABLE_GAME_DATA"] ?? "GameData";
const TABLE_DOMAIN_CARDS = process.env["TABLE_DOMAIN_CARDS"] ?? "DomainCards";

// ─── CLI argument parsing ─────────────────────────────────────────────────────

type Category =
  | "all"
  | "classes"
  | "communities"
  | "ancestries"
  | "domains"
  | "rules";

interface CliOptions {
  category: Category;
  dryRun: boolean;
  verbose: boolean;
}

function parseArgs(argv: string[]): CliOptions {
  const opts: CliOptions = { category: "all", dryRun: false, verbose: false };
  const valid: Category[] = [
    "all",
    "classes",
    "communities",
    "ancestries",
    "domains",
    "rules",
  ];

  for (const arg of argv.slice(2)) {
    if (arg.startsWith("--category=")) {
      const val = arg.split("=")[1] as Category;
      if (!valid.includes(val)) {
        console.error(`Unknown category: "${val}". Valid: ${valid.join(", ")}`);
        process.exit(1);
      }
      opts.category = val;
    } else if (arg === "--dry-run") {
      opts.dryRun = true;
    } else if (arg === "--verbose") {
      opts.verbose = true;
    } else if (arg === "--help" || arg === "-h") {
      printUsage();
      process.exit(0);
    }
  }
  return opts;
}

function printUsage(): void {
  console.log(
    `
Daggerheart Ingestion Pipeline
================================
Reads Markdown files from ${MARKDOWN_ROOT}
and writes parsed game data to DynamoDB.

Usage:
  ts-node src/index.ts [options]

Options:
  --category=all|classes|communities|ancestries|domains|rules
               Which category to ingest (default: all)
  --dry-run    Parse and validate without writing to DynamoDB
  --verbose    Print per-item results including passing items
  --help, -h   Show this help

Environment variables:
  DYNAMODB_REGION     AWS region (default: us-east-1)
  DYNAMODB_ENDPOINT   Override endpoint URL (e.g. http://localhost:8000)
  TABLE_CLASSES       DynamoDB table name (default: Classes)
  TABLE_GAME_DATA     DynamoDB table name (default: GameData)
  TABLE_DOMAIN_CARDS  DynamoDB table name (default: DomainCards)
    `.trim()
  );
}

// ─── Summary accumulator ──────────────────────────────────────────────────────

interface CategorySummary {
  category: string;
  parsed: number;
  validationErrors: number;
  validationWarnings: number;
  loaded: number;
}

// ─── Validation reporting ─────────────────────────────────────────────────────

function printValidationResult(label: string, vr: ValidationResult): void {
  if (vr.valid && vr.warnings.length === 0) {
    console.log(`  ✓ ${label}`);
    return;
  }
  if (!vr.valid) {
    console.error(`  ✗ ${label} — ${vr.errors.length} error(s)`);
    for (const e of vr.errors) {
      console.error(`      ERROR [${e.field}] ${e.rule}: ${e.message}`);
    }
  }
  for (const w of vr.warnings) {
    console.warn(`      WARN  [${w.field}] ${w.message}`);
  }
}

// ─── Per-category pipeline functions ─────────────────────────────────────────

// Helper: define source roots to scan for each category.
// Each entry has a directory path and the source tag to apply.
interface SourceDir {
  dir: string;
  source: CharacterSource;
}

function getSourceDirs(subdir: string): SourceDir[] {
  const dirs: SourceDir[] = [];
  const homebrewDir = path.join(MARKDOWN_ROOT, subdir);
  if (fs.existsSync(homebrewDir)) dirs.push({ dir: homebrewDir, source: "homebrew" });
  const srdDir = path.join(MARKDOWN_ROOT, "SRD", subdir);
  if (fs.existsSync(srdDir)) dirs.push({ dir: srdDir, source: "srd" });
  return dirs;
}

// ── Classes ───────────────────────────────────────────────────────────────────

async function runClasses(opts: CliOptions): Promise<CategorySummary> {
  const summary: CategorySummary = {
    category: "classes",
    parsed: 0,
    validationErrors: 0,
    validationWarnings: 0,
    loaded: 0,
  };

  const metadataItems: Record<string, unknown>[] = [];
  const subclassItems: Record<string, unknown>[] = [];

  for (const { dir: classesDir, source } of getSourceDirs("Classes")) {
    const allFiles = await glob("*.md", {
      cwd: classesDir,
      absolute: true,
      nocase: true,
    });

    // Skip any file whose stem matches the folder it lives in (e.g. Classes.md inside Classes/)
    const folderName = path.basename(classesDir).toLowerCase();
    const classFiles = allFiles.filter(
      (f) => path.basename(f, ".md").toLowerCase() !== folderName
    );

    for (const filePath of classFiles) {
      const className = path.basename(filePath, ".md");
      try {
        const data: ClassData = parseClassFile(filePath, className, source);
        summary.parsed++;

        const vr: ValidationResult = validateClass(data);
        summary.validationErrors += vr.errors.length;
        summary.validationWarnings += vr.warnings.length;

        if (opts.verbose) {
          printValidationResult(`Class: ${className} [${source}]`, vr);
        } else if (!vr.valid) {
          printValidationResult(`Class: ${className} [${source}]`, vr);
        }

        const pk = `CLASS#${data.classId}`;

        // Class metadata item
        const metaItem: Record<string, unknown> = {
          PK: pk,
          SK: "METADATA",
          classId: data.classId,
          name: data.name,
          domains: data.domains,
          startingEvasion: data.startingEvasion,
          startingHitPoints: data.startingHitPoints,
          classItems: data.classItems,
          hopeFeature: data.hopeFeature,
          classFeatures: data.classFeatures,
          backgroundQuestions: data.backgroundQuestions,
          connectionQuestions: data.connectionQuestions,
          mechanicalNotes: data.mechanicalNotes,
          armorRec: data.armorRec,
          source: data.source,
        };
        metadataItems.push(metaItem);

        // One item per subclass
        for (const sc of data.subclasses) {
          const subclassItem: Record<string, unknown> = {
            PK: pk,
            SK: `SUBCLASS#${sc.subclassId}`,
            subclassId: sc.subclassId,
            name: sc.name,
            description: sc.description,
            spellcastTrait: sc.spellcastTrait,
            foundationFeatures: sc.foundationFeatures,
            specializationFeature: sc.specializationFeature,
            masteryFeature: sc.masteryFeature,
          };
          subclassItems.push(subclassItem);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(
          `[classes] Error parsing ${path.basename(filePath)} [${source}]: ${msg}`
        );
        summary.validationErrors++;
      }
    }
  }

  const allClassItems = [...metadataItems, ...subclassItems];

  if (!opts.dryRun && allClassItems.length > 0) {
    // ── Stale-record cleanup ────────────────────────────────────────────────
    // Scan DynamoDB for all CLASS# METADATA records.  Any whose classId is NOT
    // in the current set of markdown files is orphaned and should be deleted
    // (along with all its SUBCLASS# children).
    const existingMetaKeys = await scanAllKeys(
      TABLE_CLASSES,
      "begins_with(PK, :prefix) AND SK = :sk",
      { ":prefix": "CLASS#", ":sk": "METADATA" }
    );

    const currentClassIds = new Set(
      metadataItems.map((item) => (item["classId"] as string) ?? "")
    );

    const staleClassPKs = existingMetaKeys
      .map((k) => k.PK)
      .filter((pk) => {
        const classId = pk.replace(/^CLASS#/, "");
        return !currentClassIds.has(classId);
      });

    if (staleClassPKs.length > 0) {
      console.log(
        `[classes] Found ${staleClassPKs.length} stale class PK(s) — scanning for all related items...`
      );

      // Fetch all items (METADATA + SUBCLASS#*) for each stale PK.
      // scanAllKeys with a filter on PK is a scan — for small tables this is fine.
      const staleKeys: Array<{ PK: string; SK: string }> = [];
      for (const pk of staleClassPKs) {
        const relatedKeys = await scanAllKeys(
          TABLE_CLASSES,
          "PK = :pk",
          { ":pk": pk }
        );
        staleKeys.push(...relatedKeys);
        console.log(
          `[classes]   Stale PK "${pk}": ${relatedKeys.length} item(s) to delete`
        );
      }

      const dr = await batchDelete(TABLE_CLASSES, staleKeys);
      console.log(
        `[classes] Stale-record cleanup: deleted ${dr.successCount}/${dr.totalItems} item(s).`
      );
    } else {
      console.log("[classes] No stale records found — nothing to delete.");
    }
    // ────────────────────────────────────────────────────────────────────────

    const lr = await batchUpsert(TABLE_CLASSES, allClassItems);
    summary.loaded = lr.successCount;
  } else if (opts.dryRun) {
    console.log(
      `[classes] Dry-run: would write ${metadataItems.length} metadata + ` +
        `${subclassItems.length} subclass items to "${TABLE_CLASSES}"`
    );
  }

  return summary;
}

// ── Communities ───────────────────────────────────────────────────────────────

async function runCommunities(opts: CliOptions): Promise<CategorySummary> {
  const summary: CategorySummary = {
    category: "communities",
    parsed: 0,
    validationErrors: 0,
    validationWarnings: 0,
    loaded: 0,
  };

  const items: Record<string, unknown>[] = [];

  for (const { dir: commDir, source } of getSourceDirs("Communities")) {
    const allFiles = await glob("*.md", { cwd: commDir, absolute: true });
    const commFolderName = path.basename(commDir).toLowerCase();
    const commFiles = allFiles.filter(
      (f) => path.basename(f, ".md").toLowerCase() !== commFolderName
    );

    for (const filePath of commFiles) {
      const name = path.basename(filePath, ".md");
      try {
        const data: CommunityData = parseCommunityFile(filePath, name, source);
        summary.parsed++;

        const vr = validateCommunity(data);
        summary.validationErrors += vr.errors.length;
        summary.validationWarnings += vr.warnings.length;

        if (opts.verbose || !vr.valid) {
          printValidationResult(`Community: ${name} [${source}]`, vr);
        }

        items.push({
          PK: `COMMUNITY#${data.communityId}`,
          SK: "METADATA",
          id: data.communityId,
          type: "community",
          name: data.name,
          flavorText: data.flavorText,
          traitName: data.traitName,
          traitDescription: data.traitDescription,
          source: data.source,
          ...(data.mechanicalBonuses ? { mechanicalBonuses: data.mechanicalBonuses } : {}),
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(
          `[communities] Error parsing ${path.basename(filePath)} [${source}]: ${msg}`
        );
        summary.validationErrors++;
      }
    }
  }

  if (!opts.dryRun && items.length > 0) {
    const lr = await batchUpsert(TABLE_GAME_DATA, items);
    summary.loaded = lr.successCount;
  } else if (opts.dryRun) {
    console.log(
      `[communities] Dry-run: would write ${items.length} items to "${TABLE_GAME_DATA}"`
    );
  }

  return summary;
}

// ── Ancestries ────────────────────────────────────────────────────────────────

async function runAncestries(opts: CliOptions): Promise<CategorySummary> {
  const summary: CategorySummary = {
    category: "ancestries",
    parsed: 0,
    validationErrors: 0,
    validationWarnings: 0,
    loaded: 0,
  };

  const items: Record<string, unknown>[] = [];

  for (const { dir: ancestryDir, source } of getSourceDirs("Ancestries")) {
    const allFiles = await glob("*.md", { cwd: ancestryDir, absolute: true });
    const ancestryFolderName = path.basename(ancestryDir).toLowerCase();
    const ancestryFiles = allFiles.filter(
      (f) => path.basename(f, ".md").toLowerCase() !== ancestryFolderName
    );

    if (ancestryFiles.length === 0) {
      console.log(`[ancestries] No files found in ${ancestryDir} — skipping.`);
      continue;
    }

    for (const filePath of ancestryFiles) {
      const name = path.basename(filePath, ".md");
      try {
        const data: AncestryData = parseAncestryFile(filePath, name, source);
        summary.parsed++;

        const vr = validateAncestry(data);
        summary.validationErrors += vr.errors.length;
        summary.validationWarnings += vr.warnings.length;

        if (opts.verbose || !vr.valid) {
          printValidationResult(`Ancestry: ${name} [${source}]`, vr);
        }

        items.push({
          PK: `ANCESTRY#${data.ancestryId}`,
          SK: "METADATA",
          id: data.ancestryId,
          type: "ancestry",
          name: data.name,
          flavorText: data.flavorText,
          traitName: data.traitName,
          traitDescription: data.traitDescription,
          secondTraitName: data.secondTraitName,
          secondTraitDescription: data.secondTraitDescription,
          source: data.source,
          ...(data.mechanicalBonuses ? { mechanicalBonuses: data.mechanicalBonuses } : {}),
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(
          `[ancestries] Error parsing ${path.basename(filePath)} [${source}]: ${msg}`
        );
        summary.validationErrors++;
      }
    }
  }

  if (items.length === 0) {
    console.log("[ancestries] No ancestry files found in any source — skipping.");
    return summary;
  }

  if (!opts.dryRun && items.length > 0) {
    const lr = await batchUpsert(TABLE_GAME_DATA, items);
    summary.loaded = lr.successCount;
  } else if (opts.dryRun) {
    console.log(
      `[ancestries] Dry-run: would write ${items.length} items to "${TABLE_GAME_DATA}"`
    );
  }

  return summary;
}

// ── Domain cards ──────────────────────────────────────────────────────────────

async function runDomains(opts: CliOptions): Promise<CategorySummary> {
  const summary: CategorySummary = {
    category: "domains",
    parsed: 0,
    validationErrors: 0,
    validationWarnings: 0,
    loaded: 0,
  };

  const items: Record<string, unknown>[] = [];

  for (const { dir: domainsDir, source } of getSourceDirs("Domains")) {
    // Each immediate sub-directory is a domain (Artistry, Charm, Violence, etc.)
    const domainDirs = fs
      .readdirSync(domainsDir, { withFileTypes: true })
      .filter((e) => e.isDirectory())
      .map((e) => ({ name: e.name, dir: path.join(domainsDir, e.name) }));

    for (const { name: domain, dir } of domainDirs) {
      const allFiles = await glob("*.md", { cwd: dir, absolute: true });

      // Parse the domain index file (e.g. Artistry.md) for a description.
      // The description is the text block that follows the Waypoint block.
      const indexFile = allFiles.find(
        (f) => path.basename(f, ".md").toLowerCase() === domain.toLowerCase()
      );
      let domainDescription: string | null = null;
      if (indexFile) {
        const raw = fs.readFileSync(indexFile, "utf-8");
        const waypointEnd = raw.indexOf("%% End Waypoint %%");
        if (waypointEnd >= 0) {
          const afterWaypoint = raw.slice(waypointEnd + "%% End Waypoint %%".length).trim();
          if (afterWaypoint.length > 0) {
            domainDescription = afterWaypoint;
          }
        }
      }

      // Store the domain metadata record (description + source)
      items.push({
        PK: `DOMAIN#${domain}`,
        SK: "METADATA",
        domain,
        description: domainDescription,
        source,
      });

      // Only process card files — filenames must start with "(Level N)".
      // Also skip any file whose stem matches the domain folder name (index files).
      const domainFolderName = domain.toLowerCase();
      const cardFiles = allFiles.filter(
        (f) =>
          /\(Level\s+\d+\)/i.test(path.basename(f)) &&
          path.basename(f, ".md").toLowerCase() !== domainFolderName
      );

      for (const filePath of cardFiles) {
        const cardFilename = path.basename(filePath);
        try {
          const data: DomainCard = parseDomainCardFile(filePath, domain, source);
          summary.parsed++;

          const vr = validateDomainCard(data);
          summary.validationErrors += vr.errors.length;
          summary.validationWarnings += vr.warnings.length;

          if (opts.verbose || !vr.valid) {
            printValidationResult(
              `DomainCard: ${domain}/${cardFilename} [${source}]`,
              vr
            );
          }

          items.push({
            PK: `DOMAIN#${domain}`,
            SK: `CARD#${data.cardId}`,
            cardId: data.cardId,
            domain: data.domain,
            level: data.level,
            recallCost: data.recallCost,
            name: data.name,
            isCursed: data.isCursed,
            isLinkedCurse: data.isLinkedCurse,
            isGrimoire: data.isGrimoire,
            description: data.description,
            curseText: data.curseText,
            linkedCardIds: data.linkedCardIds,
            grimoire: data.grimoire,
            source: data.source,
          });
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          console.error(
            `[domains] Error parsing ${domain}/${cardFilename} [${source}]: ${msg}`
          );
          summary.validationErrors++;
        }
      }
    }
  }

  if (!opts.dryRun && items.length > 0) {
    const lr = await batchUpsert(TABLE_DOMAIN_CARDS, items);
    summary.loaded = lr.successCount;
  } else if (opts.dryRun) {
    console.log(
      `[domains] Dry-run: would write ${items.length} items to "${TABLE_DOMAIN_CARDS}"`
    );
  }

  return summary;
}

// ── Rules & Definitions ───────────────────────────────────────────────────────

async function runRules(opts: CliOptions): Promise<CategorySummary> {
  const summary: CategorySummary = {
    category: "rules",
    parsed: 0,
    validationErrors: 0,
    validationWarnings: 0,
    loaded: 0,
  };

  if (!fs.existsSync(RULES_ROOT)) {
    console.log('[rules] "Rules & Definitions" directory not found — skipping.');
    return summary;
  }

  // Discover all .md files recursively
  const allFiles = await glob("**/*.md", {
    cwd: RULES_ROOT,
    absolute: true,
  });

  const items: Record<string, unknown>[] = [];

  for (const filePath of allFiles) {
    const stem = path.basename(filePath, ".md").toLowerCase();
    const dirName = path.basename(path.dirname(filePath)).toLowerCase();

    // Skip index files (filename stem matches parent directory name)
    if (stem === dirName || stem === "rules & definitions") continue;

    try {
      const data: RuleEntry = parseRuleFile(filePath, RULES_ROOT);
      summary.parsed++;

      const vr = validateRule(data);
      summary.validationErrors += vr.errors.length;
      summary.validationWarnings += vr.warnings.length;

      if (opts.verbose || !vr.valid) {
        printValidationResult(`Rule: ${data.name}`, vr);
      }

      items.push({
        PK: `RULE#${data.ruleId}`,
        SK: "METADATA",
        id: data.ruleId,
        type: data.type,
        name: data.name,
        body: data.body,
        source: "homebrew",
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(
        `[rules] Error parsing ${path.basename(filePath)}: ${msg}`
      );
      summary.validationErrors++;
    }
  }

  if (!opts.dryRun && items.length > 0) {
    const lr = await batchUpsert(TABLE_GAME_DATA, items);
    summary.loaded = lr.successCount;
  } else if (opts.dryRun) {
    console.log(
      `[rules] Dry-run: would write ${items.length} items to "${TABLE_GAME_DATA}"`
    );
  }

  return summary;
}

// ─── Summary table ────────────────────────────────────────────────────────────

function printSummary(summaries: CategorySummary[], dryRun: boolean): void {
  const SEP = "─".repeat(72);
  const title = "INGESTION SUMMARY" + (dryRun ? " (DRY RUN — nothing written)" : "");

  console.log("\n" + SEP);
  console.log(title);
  console.log(SEP);

  let totalParsed = 0;
  let totalErrors = 0;
  let totalWarnings = 0;
  let totalLoaded = 0;

  for (const s of summaries) {
    const icon = s.validationErrors > 0 ? "✗" : "✓";
    console.log(
      `  ${icon} ${s.category.padEnd(14)}` +
        `  parsed=${String(s.parsed).padStart(3)}` +
        `  errors=${String(s.validationErrors).padStart(3)}` +
        `  warnings=${String(s.validationWarnings).padStart(3)}` +
        `  loaded=${String(s.loaded).padStart(3)}`
    );
    totalParsed += s.parsed;
    totalErrors += s.validationErrors;
    totalWarnings += s.validationWarnings;
    totalLoaded += s.loaded;
  }

  console.log(SEP);
  console.log(
    `  ${"TOTAL".padEnd(15)}` +
      `  parsed=${String(totalParsed).padStart(3)}` +
      `  errors=${String(totalErrors).padStart(3)}` +
      `  warnings=${String(totalWarnings).padStart(3)}` +
      `  loaded=${String(totalLoaded).padStart(3)}`
  );
  console.log(SEP + "\n");
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const opts = parseArgs(process.argv);

  console.log(
    `\nDaggerheart Ingestion Pipeline` +
      ` | category=${opts.category}` +
      ` | dry-run=${opts.dryRun}` +
      ` | verbose=${opts.verbose}\n`
  );

  const run = (cat: Category): boolean =>
    opts.category === "all" || opts.category === cat;

  const summaries: CategorySummary[] = [];

  try {
    if (run("classes"))     summaries.push(await runClasses(opts));
    if (run("communities")) summaries.push(await runCommunities(opts));
    if (run("ancestries"))  summaries.push(await runAncestries(opts));
    if (run("domains"))     summaries.push(await runDomains(opts));
    if (run("rules"))       summaries.push(await runRules(opts));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`\nFatal error during ingestion: ${msg}`);
    if (err instanceof Error && err.stack) console.error(err.stack);
    process.exit(1);
  }

  printSummary(summaries, opts.dryRun);

  const totalErrors = summaries.reduce((acc, s) => acc + s.validationErrors, 0);
  if (totalErrors > 0) {
    console.error(
      `Ingestion completed with ${totalErrors} validation error(s). Exiting with code 1.`
    );
    process.exit(1);
  }

  console.log("Ingestion complete.");
}

main().catch((err) => {
  console.error("Unhandled error:", err);
  process.exit(1);
});
