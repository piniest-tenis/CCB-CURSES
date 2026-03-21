/**
 * Server shell for /character/[id]/build
 * generateStaticParams returns a placeholder — actual routing is client-side.
 * CloudFront rewrites all paths to index.html for SPA routing.
 */
import CharacterBuilderPageClient from "./CharacterBuilderPageClient";

export function generateStaticParams() {
  // Placeholder so Next.js accepts the dynamic route in static export.
  // The client router handles the actual param at runtime.
  return [{ id: "__placeholder__" }];
}

interface CharacterBuilderPageProps {
  params: { id: string };
}

export default function CharacterBuilderPage({ params }: CharacterBuilderPageProps) {
  return <CharacterBuilderPageClient params={params} />;
}
