/**
 * Server shell for /homebrew/[type]/[id]/edit
 * generateStaticParams returns a placeholder — actual routing is client-side.
 * CloudFront rewrites all paths to index.html for SPA routing.
 */
import HomebrewEditClient from "./HomebrewEditClient";

export function generateStaticParams() {
  return [{ type: "__placeholder__", id: "__placeholder__" }];
}

export default function HomebrewEditPage() {
  return <HomebrewEditClient />;
}
