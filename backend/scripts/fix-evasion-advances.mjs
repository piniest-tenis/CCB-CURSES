/**
 * scripts/fix-evasion-advances.mjs
 *
 * One-time migration: fix characters whose evasion advances were lost when
 * armor was changed.
 *
 * Root cause: the PATCH handler recomputed `evasion = baseEvasion + armorMod`,
 * but `applyLevelUp` only bumped `derivedStats.evasion` (not `baseEvasion`)
 * for "evasion" advances. Any subsequent armor change silently discarded those
 * advances.
 *
 * This script:
 *   1. Scans the Characters table for all CHARACTER# records
 *   2. For each, counts "evasion" advances in levelUpHistory
 *   3. Computes the expected baseEvasion (current baseEvasion + missing advances)
 *      and recomputes evasion = correctedBase + armorEvasionMod
 *   4. If the stored values differ, writes the corrected values back
 *
 * Usage:
 *   node backend/scripts/fix-evasion-advances.mjs            # dry-run (default)
 *   node backend/scripts/fix-evasion-advances.mjs --apply     # write changes
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

// ── SRD Armor Evasion Modifier (mirrors handler.ts) ──────────────────────────

const SRD_ARMOR_TABLE = [
  { id: "gambeson",            featureType: "Flexible"    },
  { id: "leather",             featureType: null          },
  { id: "chainmail",           featureType: "Heavy"       },
  { id: "full-plate",          featureType: "Very Heavy"  },
  { id: "improved-gambeson",   featureType: "Flexible"    },
  { id: "improved-leather",    featureType: null          },
  { id: "improved-chainmail",  featureType: "Heavy"       },
  { id: "improved-full-plate", featureType: "Very Heavy"  },
  { id: "elundrian-chain",     featureType: "Warded"      },
  { id: "harrowbone",          featureType: "Resilient"   },
  { id: "irontree-breastplate",featureType: "Reinforced"  },
  { id: "runetan-floating",    featureType: "Shifting"    },
  { id: "tyris-soft",          featureType: "Quiet"       },
  { id: "rosewild",            featureType: "Hopeful"     },
  { id: "advanced-gambeson",   featureType: "Flexible"    },
  { id: "advanced-leather",    featureType: null          },
  { id: "advanced-chainmail",  featureType: "Heavy"       },
  { id: "advanced-full-plate", featureType: "Very Heavy"  },
  { id: "bellamoi-fine",       featureType: "Gilded"      },
  { id: "dragonscale",         featureType: "Impenetrable"},
  { id: "spiked-plate",        featureType: "Sharp"       },
  { id: "bladefare",           featureType: "Physical"    },
  { id: "monetts-cloak",       featureType: "Magic"       },
  { id: "runes-of-fortification", featureType: "Painful"  },
  { id: "legendary-gambeson",  featureType: "Flexible"    },
  { id: "legendary-leather",   featureType: null          },
  { id: "legendary-chainmail", featureType: "Heavy"       },
  { id: "legendary-full-plate",featureType: "Very Heavy"  },
  { id: "dunamis-silkchain",   featureType: "Timeslowing" },
  { id: "channeling-armor",    featureType: "Channeling"  },
  { id: "emberwoven",          featureType: "Burning"     },
  { id: "full-fortified",      featureType: "Fortified"   },
  { id: "veritas-opal",        featureType: "Truthseeking"},
  { id: "savior-chainmail",    featureType: "Difficult"   },
];

function armorEvasionMod(featureType) {
  if (featureType === "Flexible")   return 1;
  if (featureType === "Heavy")      return -1;
  if (featureType === "Very Heavy") return -2;
  if (featureType === "Difficult")  return -1;
  return 0;
}

function getArmorFeatureType(armorId) {
  const entry = SRD_ARMOR_TABLE.find((a) => a.id === armorId);
  return entry ? entry.featureType : null;
}

// ── Count evasion advances in levelUpHistory ─────────────────────────────────

function countEvasionAdvances(levelUpHistory) {
  if (!levelUpHistory || typeof levelUpHistory !== "object") return 0;
  let count = 0;
  for (const choices of Object.values(levelUpHistory)) {
    if (!Array.isArray(choices)) continue;
    count += choices.filter((c) => c.type === "evasion").length;
  }
  return count;
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n=== fix-evasion-advances ${APPLY ? "(APPLYING)" : "(DRY RUN)"} ===\n`);
  console.log(`Table: ${TABLE}\n`);

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

  console.log(`Found ${characters.length} character record(s).\n`);

  let fixedCount = 0;
  let skippedCount = 0;

  for (const char of characters) {
    const charId = char.characterId ?? char.SK?.replace("CHARACTER#", "") ?? "?";
    const charName = char.name ?? "(unnamed)";
    const evasionAdvances = countEvasionAdvances(char.levelUpHistory);

    if (evasionAdvances === 0) {
      skippedCount++;
      continue;
    }

    const storedBase    = char.derivedStats?.baseEvasion;
    const storedEvasion = char.derivedStats?.evasion;

    if (storedBase === undefined || storedEvasion === undefined) {
      console.log(`  [SKIP] ${charName} (${charId}): no derivedStats.baseEvasion or evasion`);
      skippedCount++;
      continue;
    }

    // Figure out armor evasion mod
    const armorId = char.activeArmorId ?? null;
    const featureType = armorId ? getArmorFeatureType(armorId) : null;
    const evMod = armorId ? armorEvasionMod(featureType) : 0;

    // Expected: baseEvasion should already include evasion advances.
    // If armor-swap wiped them, baseEvasion = classBase + ancestry/community only.
    // The correct baseEvasion = storedBase + evasionAdvances  (iff advances are missing).
    // Check: if storedEvasion == storedBase + evMod (i.e. no advances in the evasion calc),
    // then advances were lost.
    const evasionFromBase = storedBase + evMod;

    if (storedEvasion === evasionFromBase) {
      // Evasion was recomputed from baseEvasion + armorMod, ignoring advances.
      // This confirms advances were lost.
      const correctedBase    = storedBase + evasionAdvances;
      const correctedEvasion = correctedBase + evMod;

      console.log(`  [FIX] ${charName} (${charId}):`);
      console.log(`         ${evasionAdvances} evasion advance(s)`);
      console.log(`         baseEvasion: ${storedBase} → ${correctedBase}`);
      console.log(`         evasion:     ${storedEvasion} → ${correctedEvasion}`);
      console.log(`         armor: ${armorId ?? "none"} (mod: ${evMod})`);

      if (APPLY) {
        await docClient.send(new UpdateCommand({
          TableName: TABLE,
          Key: { PK: char.PK, SK: char.SK },
          UpdateExpression: "SET derivedStats.baseEvasion = :base, derivedStats.evasion = :ev",
          ExpressionAttributeValues: {
            ":base": correctedBase,
            ":ev":   correctedEvasion,
          },
        }));
        console.log(`         ✓ Updated.`);
      } else {
        console.log(`         (dry run — no changes written)`);
      }

      fixedCount++;
    } else if (storedEvasion === evasionFromBase + evasionAdvances) {
      // Advances are already reflected — no fix needed.
      console.log(`  [OK]  ${charName} (${charId}): evasion advances already included (base=${storedBase}, ev=${storedEvasion}, advances=${evasionAdvances})`);
      skippedCount++;
    } else {
      // Some other discrepancy — log for manual inspection.
      console.log(`  [???] ${charName} (${charId}): unexpected evasion values`);
      console.log(`         base=${storedBase}, ev=${storedEvasion}, advances=${evasionAdvances}, armorMod=${evMod}`);
      console.log(`         expected ev = base+mod = ${evasionFromBase} or base+mod+advances = ${evasionFromBase + evasionAdvances}`);
      skippedCount++;
    }
  }

  console.log(`\n=== Summary ===`);
  console.log(`  Fixed:   ${fixedCount}`);
  console.log(`  Skipped: ${skippedCount}`);
  console.log(`  Total:   ${characters.length}`);
  if (!APPLY && fixedCount > 0) {
    console.log(`\n  → Re-run with --apply to write changes.`);
  }
  console.log();
}

main().catch((err) => {
  console.error("FATAL:", err);
  process.exit(1);
});
