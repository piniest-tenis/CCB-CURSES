/**
 * Server shell for /campaigns/[id]/settings
 * generateStaticParams returns a placeholder — actual routing is client-side.
 * CloudFront rewrites all paths to index.html for SPA routing.
 */
import CampaignSettingsClient from "./CampaignSettingsClient";

export function generateStaticParams() {
  // Placeholder so Next.js accepts the dynamic route in static export.
  // The client router handles the actual param at runtime.
  return [{ id: "__placeholder__" }];
}

export default function CampaignSettingsPage() {
  return <CampaignSettingsClient />;
}
