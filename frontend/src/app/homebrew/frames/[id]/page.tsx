/**
 * Server shell for /frames/[id]
 * generateStaticParams returns a placeholder — actual routing is client-side.
 * CloudFront rewrites all paths to index.html for SPA routing.
 */
import FrameDetailClient from "./FrameDetailClient";

export function generateStaticParams() {
  // Placeholder so Next.js accepts the dynamic route in static export.
  // The client router handles the actual param at runtime.
  return [{ id: "__placeholder__" }];
}

export default function FrameDetailPage() {
  return <FrameDetailClient />;
}
