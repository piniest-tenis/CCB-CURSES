/**
 * Server shell for /classes/[classId]
 * generateStaticParams returns a placeholder — actual routing is client-side.
 */
import ClassDetailClient from "./ClassDetailClient";

export function generateStaticParams() {
  return [{ classId: "__placeholder__" }];
}

export default function ClassDetailPage() {
  return <ClassDetailClient />;
}
