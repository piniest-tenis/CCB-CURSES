/**
 * Server shell for /homebrew/[type]/new
 * generateStaticParams returns a placeholder — actual routing is client-side.
 * CloudFront rewrites all paths to index.html for SPA routing.
 */
import HomebrewCreateClient from "./HomebrewCreateClient";

export function generateStaticParams() {
  return [{ type: "__placeholder__" }];
}

export default function HomebrewCreatePage() {
  return <HomebrewCreateClient />;
}
