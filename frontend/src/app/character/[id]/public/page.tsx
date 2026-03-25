/**
 * src/app/character/[id]/public/page.tsx
 *
 * Server shell for /character/[id]/public
 *
 * A fully-explorable, static public character sheet — the full-detail view
 * that the Twitch overlay "Full sheet ↗" link points to. Like the existing
 * /view page it requires a share token (?token=...) but it exposes
 * significantly more detail:
 *
 *   • All stats, trackers, hope, damage thresholds
 *   • Full domain loadout with expandable card descriptions + wiki links
 *   • Experiences, conditions, inventory, gold
 *   • Companion state (if present)
 *   • Downtime projects
 *   • Notes (markdown-rendered)
 *   • Links to the wiki (/domains/<domain>, /classes/<classId>)
 *
 * No PII is ever rendered (no email, no userId, no Cognito sub).
 */
import PublicSheetClient from "./PublicSheetClient";

export function generateStaticParams() {
  // Static export placeholder — actual id/token are runtime query params.
  return [{ id: "__placeholder__" }];
}

export default function PublicCharacterSheetPage() {
  return <PublicSheetClient />;
}
