/**
 * Server shell for /campaign/[id]
 *
 * Public campaign view - no authentication or Patreon gate required.
 * This route lives outside /campaigns (plural) to bypass the Patreon
 * paywall layout. The campaign share token in the query string provides
 * authorization.
 *
 * generateStaticParams returns a placeholder for static export.
 */
import SharedCampaignClient from "./SharedCampaignClient";

export function generateStaticParams() {
  return [{ id: "__placeholder__" }];
}

export default function SharedCampaignPage() {
  return <SharedCampaignClient />;
}
