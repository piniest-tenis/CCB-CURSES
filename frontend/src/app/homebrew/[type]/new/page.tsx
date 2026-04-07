/**
 * Server shell for /homebrew/[type]/new
 *
 * generateStaticParams enumerates every valid homebrew content type so that
 * Next.js static export produces an HTML file for each route. Without this,
 * S3 returns 404 for unknown paths and CloudFront's custom error page falls
 * back to root index.html — which redirects to /dashboard.
 */
import HomebrewCreateClient from "./HomebrewCreateClient";

const VALID_TYPES = [
  "class", "ancestry", "community", "domainCard",
  "weapon", "armor", "item", "consumable",
];

export function generateStaticParams() {
  return VALID_TYPES.map((type) => ({ type }));
}

export default function HomebrewCreatePage() {
  return <HomebrewCreateClient />;
}
