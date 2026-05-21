/**
 * Server shell for /campaigns/[id]
 * generateStaticParams returns a placeholder - actual routing is client-side.
 * CloudFront rewrites all paths to index.html for SPA routing.
 *
 * Note: The <Suspense> wrapper was removed because useCampaignNav no longer
 * uses useSearchParams(). In-page navigation state is managed via
 * history.pushState() + React useState, so no Next.js navigation cycles
 * are triggered and no Suspense boundary is needed.
 */
import CampaignDetailClient from "./CampaignDetailClient";

export function generateStaticParams() {
  // Placeholder so Next.js accepts the dynamic route in static export.
  // The client router handles the actual param at runtime.
  return [{ id: "__placeholder__" }];
}

export default function CampaignDetailPage() {
  return <CampaignDetailClient />;
}
