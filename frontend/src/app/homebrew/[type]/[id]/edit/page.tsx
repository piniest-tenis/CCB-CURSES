/**
 * Server shell for /homebrew/[type]/[id]/edit
 *
 * generateStaticParams enumerates every valid homebrew content type with a
 * placeholder ID. Next.js static export produces an HTML file per type, and
 * CloudFront / S3 will serve the correct shell for any /homebrew/{type}/{id}/edit
 * path because the [id] segment doesn't affect the HTML (it's read client-side).
 *
 * NOTE: We still need a __placeholder__ ID because [id] is truly dynamic.
 * The key fix is that [type] is enumerated so each type gets its own directory.
 */
import HomebrewEditClient from "./HomebrewEditClient";

const VALID_TYPES = [
  "class", "ancestry", "community", "domainCard",
  "weapon", "armor", "item", "consumable",
];

export function generateStaticParams() {
  return VALID_TYPES.map((type) => ({ type, id: "__placeholder__" }));
}

export default function HomebrewEditPage() {
  return <HomebrewEditClient />;
}
