/**
 * Server shell for /frames/[id]/edit
 * generateStaticParams returns a placeholder -- actual routing is client-side.
 * CloudFront rewrites all paths to index.html for SPA routing.
 */
import FrameEditClient from "./FrameEditClient";

export function generateStaticParams() {
  // Placeholder so Next.js accepts the dynamic route in static export.
  // The client router handles the actual param at runtime.
  return [{ id: "__placeholder__" }];
}

export default function FrameEditPage() {
  return <FrameEditClient />;
}
