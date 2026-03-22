/**
 * scripts/fix-admin-membership.mjs
 * Ensures the Google SSO account for josh@maninjumpsuit.com has the admin
 * group in both pools — adds it to any matching user that doesn't have it yet.
 */
import {
  CognitoIdentityProviderClient,
  AdminListGroupsForUserCommand,
  AdminAddUserToGroupCommand,
  ListUsersCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import { requireEnv } from "../../scripts/load-env.mjs";

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

for (const pool of POOLS) {
  console.log(`\n=== ${pool.name} (${pool.id}) ===`);

  const listResp = await client.send(new ListUsersCommand({
    UserPoolId: pool.id,
    Filter: `email = "josh@maninjumpsuit.com"`,
  }));

  for (const u of listResp.Users ?? []) {
    const groupsResp = await client.send(new AdminListGroupsForUserCommand({
      UserPoolId: pool.id,
      Username: u.Username,
    }));
    const currentGroups = (groupsResp.Groups ?? []).map(g => g.GroupName);
    console.log(`  ${u.Username}  groups=[${currentGroups.join(", ")}]`);

    if (!currentGroups.includes("admin")) {
      await client.send(new AdminAddUserToGroupCommand({
        UserPoolId: pool.id,
        Username: u.Username,
        GroupName: "admin",
      }));
      console.log(`    → Added to 'admin'`);
    } else {
      console.log(`    → Already in 'admin', nothing to do`);
    }
  }
}

console.log("\nDone.");
