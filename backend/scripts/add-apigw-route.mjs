/**
 * scripts/add-apigw-route.mjs
 *
 * Adds GET /admin/characters to both dev and prod API Gateways,
 * pointing at the existing characters Lambda integration.
 *
 * Usage: node scripts/add-apigw-route.mjs
 */
import {
  ApiGatewayV2Client,
  CreateRouteCommand,
  GetRoutesCommand,
} from "@aws-sdk/client-apigatewayv2";
import { requireEnv } from "../../scripts/load-env.mjs";

const client = new ApiGatewayV2Client({
  region: "us-east-2",
  credentials: {
    accessKeyId: requireEnv("AWS_ACCESS_KEY_ID"),
    secretAccessKey: requireEnv("AWS_SECRET_ACCESS_KEY"),
  },
});

const APIS = [
  { name: "dev",  apiId: "uzai3cpj0j", integrationId: "270r5hh" },
  { name: "prod", apiId: "c0j1252asd", integrationId: "zhkc61i" },
];

const ROUTE_KEY = "GET /admin/characters";

for (const api of APIS) {
  console.log(`\n=== ${api.name} (${api.apiId}) ===`);

  // Check if route already exists
  const existing = await client.send(new GetRoutesCommand({ ApiId: api.apiId }));
  const already = (existing.Items ?? []).find((r) => r.RouteKey === ROUTE_KEY);
  if (already) {
    console.log(`  Route '${ROUTE_KEY}' already exists (${already.RouteId}) — skipping`);
    continue;
  }

  // Create the route pointing at the characters Lambda integration
  const result = await client.send(
    new CreateRouteCommand({
      ApiId: api.apiId,
      RouteKey: ROUTE_KEY,
      Target: `integrations/${api.integrationId}`,
      AuthorizationType: "JWT",
      AuthorizerId: await getJwtAuthorizerId(api.apiId),
    })
  );
  console.log(`  Created route: ${result.RouteId} → integrations/${api.integrationId}`);
}

async function getJwtAuthorizerId(apiId) {
  const { GetAuthorizersCommand } = await import("@aws-sdk/client-apigatewayv2");
  const resp = await client.send(new GetAuthorizersCommand({ ApiId: apiId }));
  const auth = (resp.Items ?? []).find((a) => a.AuthorizerType === "JWT");
  if (!auth) throw new Error(`No JWT authorizer found for API ${apiId}`);
  console.log(`  Using JWT authorizer: ${auth.AuthorizerId} (${auth.Name})`);
  return auth.AuthorizerId;
}

console.log("\nDone.");
