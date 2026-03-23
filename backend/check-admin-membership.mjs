/**
 * scripts/check-admin-membership.mjs
 * Verifies group membership for josh@maninjumpsuit.com in both pools.
 */
import { CognitoIdentityProviderClient, AdminListGroupsForUserCommand, ListUsersCommand } from "@aws-sdk/client-cognito-identity-provider";
import { requireEnv } from "../scripts/load-env.mjs";

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
    console.log(`  User: ${u.Username}  status=${u.UserStatus}`);
    const groups = await client.send(new AdminListGroupsForUserCommand({
      UserPoolId: pool.id,
      Username: u.Username,
    }));
    const names = (groups.Groups ?? []).map(g => g.GroupName).join(", ");
    console.log(`  Groups: ${names || "(none)"}`);
  }
}
