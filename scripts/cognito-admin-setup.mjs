/**
 * scripts/cognito-admin-setup.mjs
 *
 * One-time setup: creates the 'admin' Cognito group in both dev and prod
 * user pools and adds the target user to it.
 *
 * Usage: node scripts/cognito-admin-setup.mjs
 */

import { CognitoIdentityProviderClient, CreateGroupCommand, AdminAddUserToGroupCommand, ListUsersCommand } from "@aws-sdk/client-cognito-identity-provider";
import { requireEnv } from "./load-env.mjs";

const client = new CognitoIdentityProviderClient({
  region: "us-east-2",
  credentials: {
    accessKeyId: requireEnv("AWS_ACCESS_KEY_ID"),
    secretAccessKey: requireEnv("AWS_SECRET_ACCESS_KEY"),
  },
});

const POOLS = [
  { id: "us-east-2_jU4LDQgnU", name: "prod" },
  { id: "us-east-2_fr2WQaYV4", name: "dev"  },
];
const TARGET_EMAIL = "josh@maninjumpsuit.com";

for (const pool of POOLS) {
  console.log(`\n=== ${pool.name} (${pool.id}) ===`);

  // 1. Create the group (idempotent)
  try {
    await client.send(new CreateGroupCommand({
      UserPoolId: pool.id,
      GroupName: "admin",
      Description: "Site administrators",
    }));
    console.log("  Created group 'admin'");
  } catch (e) {
    if (e.name === "GroupExistsException") {
      console.log("  Group 'admin' already exists — skipping");
    } else {
      throw e;
    }
  }

  // 2. Find the user by email
  const listResp = await client.send(new ListUsersCommand({
    UserPoolId: pool.id,
    Filter: `email = "${TARGET_EMAIL}"`,
  }));

  const users = listResp.Users ?? [];
  if (users.length === 0) {
    console.log(`  No user with email ${TARGET_EMAIL} found in ${pool.name} pool — skipping`);
    continue;
  }

  const username = users[0].Username;
  console.log(`  Found user: ${username}`);

  // 3. Add to admin group
  try {
    await client.send(new AdminAddUserToGroupCommand({
      UserPoolId: pool.id,
      Username: username,
      GroupName: "admin",
    }));
    console.log(`  Added ${username} to 'admin' group`);
  } catch (e) {
    console.log(`  Unexpected error adding to group: ${e.name} — ${e.message}`);
    throw e;
  }
}

console.log("\nDone.");
