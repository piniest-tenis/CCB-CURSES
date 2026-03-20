/**
 * Server shell for /character/[id]/view
 * generateStaticParams returns a placeholder — actual routing is client-side.
 */
import SharedViewClient from "./SharedViewClient";

export function generateStaticParams() {
  return [{ id: "__placeholder__" }];
}

export default function SharedCharacterViewPage() {
  return <SharedViewClient />;
}
