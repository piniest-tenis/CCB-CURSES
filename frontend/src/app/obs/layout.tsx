/**
 * src/app/obs/layout.tsx
 *
 * Segment layout for all /obs/* pages.
 * Kills every background-color that could bleed through in OBS Browser Source.
 * The style tag is injected early (before children paint) and uses !important
 * to override Tailwind's bg-slate-950 on <html> and <body>.
 */

export default function ObsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* Must come before children so it applies before first paint */}
      <style
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{
          __html: `
            html, body {
              background: transparent !important;
              background-color: transparent !important;
            }
          `,
        }}
      />
      {children}
    </>
  );
}
