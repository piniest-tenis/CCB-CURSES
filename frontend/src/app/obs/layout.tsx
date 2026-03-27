/**
 * src/app/obs/layout.tsx
 *
 * Layout override for all /obs/* pages.
 * Forces html + body to be fully transparent so OBS Browser Source
 * composites correctly without a dark background bleed-through.
 */

export default function ObsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <style>{`html, body { background: transparent !important; }`}</style>
      {children}
    </>
  );
}
