/**
 * Server shell for /domains/[domain]
 * generateStaticParams returns a placeholder — actual routing is client-side.
 */
import DomainDetailClient from "./DomainDetailClient";

export function generateStaticParams() {
  return [{ domain: "__placeholder__" }];
}

export default function DomainDetailPage() {
  return <DomainDetailClient />;
}
