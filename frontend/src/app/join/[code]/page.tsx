/**
 * Server shell for /join/[code]
 * generateStaticParams returns a placeholder — actual routing is client-side.
 * CloudFront rewrites all paths to index.html for SPA routing.
 */
import JoinCampaignClient from "./JoinCampaignClient";

export function generateStaticParams() {
  // Placeholder so Next.js accepts the dynamic route in static export.
  // The client router handles the actual param at runtime.
  return [{ code: "__placeholder__" }];
}

export default function JoinCampaignPage() {
  return <JoinCampaignClient />;
}
