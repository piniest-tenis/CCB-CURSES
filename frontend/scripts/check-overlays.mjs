/**
 * Quick verification: capture one campaign screenshot to confirm Patreon gate is bypassed.
 */
import { chromium } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const FIXTURE_USER_PROFILE = {
  userId: "user-fixture-001",
  email: "gm@curses.show",
  username: "ManInJumpsuit",
  displayName: "ManInJumpsuit",
  tier: "gm",
  avatarUrl: null,
  preferences: {},
  patreon: null,
  createdAt: "2025-10-01T00:00:00Z",
  updatedAt: "2025-10-01T00:00:00Z",
};

const FIXTURE_CAMPAIGN = {
  campaignId: "campaign-fixture-001",
  name: "The Shattered Throne",
  description: "A dark fantasy campaign set in the ruins of an ancient empire.",
  primaryGmId: "user-fixture-001",
  schedule: null,
  currentFear: 3,
  cursesContentEnabled: false,
  createdAt: "2026-01-10T12:00:00Z",
  updatedAt: "2026-04-14T18:30:00Z",
  callerRole: "gm",
  members: [
    { userId: "user-fixture-001", displayName: "ManInJumpsuit", avatarUrl: null, role: "gm", joinedAt: "2026-01-10T12:00:00Z", characterId: "char-fixture-001" },
    { userId: "user-002", displayName: "CrimsonBard", avatarUrl: null, role: "player", joinedAt: "2026-01-11T09:00:00Z", characterId: "char-fixture-002" },
  ],
  characters: [
    { characterId: "char-fixture-001", userId: "user-fixture-001", name: "Zara Nighthollow", className: "Sorcerer", level: 3, avatarUrl: null, portraitUrl: null },
    { characterId: "char-fixture-002", userId: "user-002", name: "Bodrik Ironmantle", className: "Warrior", level: 3, avatarUrl: null, portraitUrl: null },
  ],
  invites: [],
};

const seedAuth = () => {
  try {
    const FAKE_TOKEN = "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.fixture-token";
    const FAR_FUTURE = Math.floor(new Date("2099-01-01").getTime() / 1000);
    sessionStorage.setItem("daggerheart-auth", JSON.stringify({
      state: {
        user: {
          userId: "user-fixture-001",
          email: "gm@curses.show",
          username: "ManInJumpsuit",
          displayName: "ManInJumpsuit",
          tier: "gm",
          avatarUrl: null,
          preferences: {},
          patreon: null,
          createdAt: "2025-10-01T00:00:00Z",
          updatedAt: "2025-10-01T00:00:00Z",
        },
        idToken: FAKE_TOKEN,
        isAuthenticated: true,
        isReady: true,
      },
      version: 0,
    }));
    sessionStorage.setItem("dh_federated_id_token", FAKE_TOKEN);
    sessionStorage.setItem("dh_federated_expiry", String(FAR_FUTURE));
  } catch (_) {}
};

const SUPPRESS_CSS = `
  nav[aria-label], header, [data-marketing-nav] { display: none !important; }
  footer { display: none !important; }
  div[style*="position: fixed"], div[style*="position:fixed"],
  [data-testid="modal"], .toast, [class*="toast"], [class*="Toast"] { display: none !important; }
  [class*="connection-banner"], [class*="ws-status"], [data-ws-status] { display: none !important; }
  *, *::before, *::after {
    animation-delay: -1ms !important; animation-duration: 1ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 1ms !important; transition-delay: 0ms !important;
  }
  [class*="opacity-0"]:not([class*="pointer-events-none"]) { opacity: 1 !important; }
  [role="dialog"], [aria-modal="true"] { display: none !important; }
`;

(async () => {
  const browser = await chromium.launch({ headless: true, args: ["--disable-web-security", "--force-device-scale-factor=2"] });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
  await context.addInitScript(seedAuth);

  await context.route("**/*", async (route) => {
    const url = route.request().url();
    if (!url.includes("execute-api")) return route.continue();
    if (url.includes("/users/me")) return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data: FIXTURE_USER_PROFILE }) });
    if (url.match(/\/campaigns\/[^/]+$/)) return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data: FIXTURE_CAMPAIGN }) });
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data: [] }) });
  });
  await context.route(/(cognito|auth\.curses)/, r => r.abort());
  await context.route(/wss?:\/\//, r => r.abort());

  const page = await context.newPage();
  await page.goto("http://localhost:3000/campaigns/__placeholder__", { waitUntil: "load" });
  await page.waitForTimeout(3000);
  await page.addStyleTag({ content: SUPPRESS_CSS });
  await page.waitForTimeout(500);

  const outFile = path.resolve(__dirname, "verify-campaign.png");
  await page.screenshot({ path: outFile, fullPage: true });
  console.log(`Screenshot saved to ${outFile}`);

  // Also check for any blur-related text
  const bodySnippet = await page.evaluate(() => document.body.innerText.slice(0, 300));
  console.log(`Body: ${bodySnippet.replace(/\n/g, " | ")}`);

  await browser.close();
})();
