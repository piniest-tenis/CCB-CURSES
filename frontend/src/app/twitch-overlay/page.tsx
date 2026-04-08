/**
 * src/app/twitch-overlay/page.tsx
 *
 * Server shell for /twitch-overlay
 *
 * Usage in OBS / Twitch browser source:
 *   https://ccb.curses.show/twitch-overlay/?id=<characterId>&token=<shareToken>
 *
 * The overlay is a compact, transparent-background widget designed to sit
 * in the corner of a stream. It displays the character name prominently,
 * key at-a-glance stats (HP, Stress, Hope, Level, Class) and a clickable
 * "Full sheet ↗" link that opens the static public character sheet in a
 * new tab. No personal details (email, userId, etc.) are ever shown.
 */
import TwitchOverlayClient from "./TwitchOverlayClient";

export function generateStaticParams() {
  // Static export placeholder — actual id/token are read from the query string
  // at runtime by the client component.
  return [];
}

export default function TwitchOverlayPage() {
  return <TwitchOverlayClient />;
}
