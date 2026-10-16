/**
 * scripts/fix-tosker-manifest.mjs
 *
 * One-time repair: restore the "Manifesting ★" (Oddity) domain card to the
 * "Tosker" character's vault.
 *
 * Root cause: the old `removeFromLoadout` store action removed a card from the
 * loadout WITHOUT returning it to the vault, permanently orphaning it. The card
 * could then not be re-acquired because the Acquire picker only listed cards at
 * exactly the current level. Both code bugs are now fixed; this script repairs
 * the affected character's data.
 *
 * This script:
 *   1. Scans the Characters table for CHARACTER# records
 *   2. Finds the record(s) named "Tosker" (case-insensitive)
 *   3. Reports domainVault / domainLoadout and whether "Oddity/manifesting"
 *      (or a casing variant) is already present
 *   4. With --apply, appends "Oddity/manifesting" to domainVault if missing
 *
 * Safety: aborts if zero or more than one "Tosker" record is found, so the
 * wrong character is never modified. No deletes, no loadout changes.
 *
 * Usage:
 *   node backend/scripts/fix-tosker-manifest.mjs            # dry-run (default)
 *   node backend/scripts/fix-tosker-manifest.mjs --apply     # write changes
 */
import {
  DynamoDBClient,
} from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  ScanCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import { requireEnv } from "../../scripts/load-env.mjs";

const APPLY = process.argv.includes("--apply");

// Optional positional arg overrides the character name (e.g. `node ... "Toskr Jay"`).
const NAME_ARG = process.argv.slice(2).find((a) => !a.startsWith("--"));
const CHARACTER_NAME = NAME_ARG ?? "Tosker";
const TARGET_CARD = "Oddity/manifesting"; // "Manifesting ★" (Oddity, Level 3)

const rawClient = new DynamoDBClient({
  region: "us-east-2",
  credentials: {
    accessKeyId: requireEnv("AWS_ACCESS_KEY_ID"),
    secretAccessKey: requireEnv("AWS_SECRET_ACCESS_KEY"),
  },
});

const docClient = DynamoDBDocumentClient.from(rawClient, {
  marshallOptions: { removeUndefinedValues: true },
  unmarshallOptions: { wrapNumbers: false },
});

const TABLE = requireEnv("CHARACTERS_TABLE", "daggerheart-characters-prod");

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n=== fix-tosker-manifest ${APPLY ? "(APPLYING)" : "(DRY RUN)"} ===\n`);
  console.log(`Table: ${TABLE}`);
  console.log(`Looking for character named: "${CHARACTER_NAME}"`);
  console.log(`Target card to restore:     "${TARGET_CARD}"\n`);

  // Scan all CHARACTER# records
  const characters = [];
  let lastKey;
  do {
    const result = await docClient.send(new ScanCommand({
      TableName: TABLE,
      FilterExpression: "begins_with(SK, :sk)",
      ExpressionAttributeValues: { ":sk": "CHARACTER#" },
      ExclusiveStartKey: lastKey,
    }));
    if (result.Items) characters.push(...result.Items);
    lastKey = result.LastEvaluatedKey;
  } while (lastKey);

  const matches = characters.filter(
    (c) => typeof c.name === "string" && c.name.toLowerCase() === CHARACTER_NAME.toLowerCase()
  );

  if (matches.length === 0) {
    console.log(`No character named "${CHARACTER_NAME}" found (scanned ${characters.length} character record(s)).`);
    console.log(`Existing character names:`);
    for (const c of characters) {
      console.log(`  - ${c.name ?? "(unnamed)"} (${c.characterId ?? "?"})`);
    }
    console.log(`\nAborting — nothing to repair.\n`);
    return;
  }

  if (matches.length > 1) {
    console.log(`Found ${matches.length} records named "${CHARACTER_NAME}" — refusing to proceed (ambiguous).`);
    for (const c of matches) {
      console.log(`  - ${c.name} (characterId=${c.characterId}, userId=${c.userId})`);
    }
    console.log(`\nAborting — no changes made.\n`);
    return;
  }

  const char = matches[0];
  const charId = char.characterId ?? char.SK?.replace("CHARACTER#", "") ?? "?";

  const vault = Array.isArray(char.domainVault) ? char.domainVault : [];
  const loadout = Array.isArray(char.domainLoadout) ? char.domainLoadout : [];

  console.log(`Found: "${char.name}" (characterId=${charId}, userId=${char.userId})`);
  console.log(`  domainVault (${vault.length}):`);
  for (const id of vault) console.log(`    - ${id}`);
  console.log(`  domainLoadout (${loadout.length}):`);
  for (const id of loadout) console.log(`    - ${id}`);

  const inVault = vault.some((id) => id.toLowerCase() === TARGET_CARD.toLowerCase());
  const inLoadout = loadout.some((id) => id.toLowerCase() === TARGET_CARD.toLowerCase());

  if (inVault) {
    console.log(`\n✓ "${TARGET_CARD}" is already present in domainVault — nothing to do.\n`);
    return;
  }
  if (inLoadout) {
    console.log(`\n✓ "${TARGET_CARD}" is already present in domainLoadout (not vault) — nothing to do.\n`);
    return;
  }

  console.log(`\n✗ "${TARGET_CARD}" is NOT present in vault or loadout.`);
  console.log(`  → Will append "${TARGET_CARD}" to domainVault.`);

  if (APPLY) {
    await docClient.send(new UpdateCommand({
      TableName: TABLE,
      Key: { PK: char.PK, SK: char.SK },
      UpdateExpression: "SET domainVault = list_append(if_not_exists(domainVault, :empty), :card)",
      ExpressionAttributeValues: {
        ":empty": [],
        ":card": [TARGET_CARD],
      },
    }));
    console.log(`  ✓ Updated — "${TARGET_CARD}" added to domainVault.\n`);
  } else {
    console.log(`  (dry run — no changes written; re-run with --apply to apply)\n`);
  }
}

main().catch((err) => {
  console.error("FATAL:", err);
  process.exit(1);
});
