/**
 * scripts/list-apigw-routes.mjs
 * Lists all API Gateway HTTP API routes for both dev and prod.
 */
import { ApiGatewayV2Client, GetRoutesCommand, GetApisCommand } from "@aws-sdk/client-apigatewayv2";
import { requireEnv } from "../../scripts/load-env.mjs";

const client = new ApiGatewayV2Client({
  region: "us-east-2",
  credentials: {
    accessKeyId: requireEnv("AWS_ACCESS_KEY_ID"),
    secretAccessKey: requireEnv("AWS_SECRET_ACCESS_KEY"),
  },
});

const apis = await client.send(new GetApisCommand({}));
for (const api of (apis.Items ?? []).sort((a, b) => (a.Name ?? "").localeCompare(b.Name ?? ""))) {
  console.log(`\n[${api.Name}]  id=${api.ApiId}`);
  const routes = await client.send(new GetRoutesCommand({ ApiId: api.ApiId }));
  for (const r of (routes.Items ?? []).sort((a, b) => (a.RouteKey ?? "").localeCompare(b.RouteKey ?? ""))) {
    console.log(`  ${r.RouteKey?.padEnd(55)} target=${r.Target}`);
  }
}
