/**
 * Diagnostic script: navigates to the campaign page and reports what renders.
 */
import { chromium } from "@playwright/test";

const BASE_URL = "http://localhost:3000";
const FAKE_TOKEN = "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.fixture-token";
const FAR_FUTURE = Math.floor(new Date("2099-01-01").getTime() / 1000);

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });

await context.addInitScript(() => {
  try {
    const FAKE_TOKEN = "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.fixture-token";
    const FAR_FUTURE = Math.floor(new Date("2099-01-01").getTime() / 1000);
    const authState = {
      state: {
        user: { userId: "user-fixture-001", email: "gm@curses.show", username: "ManInJumpsuit", displayName: "ManInJumpsuit", tier: "gm", avatarUrl: null },
        idToken: FAKE_TOKEN,
        isAuthenticated: true,
        isReady: true,
      },
      version: 0,
    };
    sessionStorage.setItem("daggerheart-auth", JSON.stringify(authState));
    sessionStorage.setItem("dh_federated_id_token", FAKE_TOKEN);
    sessionStorage.setItem("dh_federated_expiry", String(FAR_FUTURE));
  } catch (e) {}
});

await context.route(/execute-api\.amazonaws\.com|localhost:3001/, async (route) => {
  const url = route.request().url();
  console.log(`  [api mock] ${url}`);
  if (url.includes("/users/me")) {
    return route.fulfill({ status: 200, contentType: "application/json",
      body: JSON.stringify({ data: { userId: "user-fixture-001", displayName: "ManInJumpsuit" } }) });
  }
  if (url.match(/\/campaigns\/[^/]+$/)) {
    return route.fulfill({ status: 200, contentType: "application/json",
      body: JSON.stringify({ data: {
        campaignId: "__placeholder__", name: "The Shattered Throne",
        callerRole: "gm", primaryGmId: "user-fixture-001",
        members: [
          { userId: "user-fixture-001", displayName: "ManInJumpsuit", avatarUrl: null, role: "gm", joinedAt: "2026-01-10T12:00:00Z", characterId: "char-fixture-001" },
        ],
        characters: [
          { characterId: "char-fixture-001", userId: "user-fixture-001", name: "Zara Nighthollow", className: "Sorcerer", level: 3, avatarUrl: null, portraitUrl: null },
        ],
        currentFear: 3, description: "A dark fantasy campaign.", invites: [],
      }}) });
  }
  return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data: null }) });
});
await context.route(/(cognito-idp\.amazonaws\.com|cognito\.amazonaws\.com)/, (route) => route.abort());
await context.route(/wss?:\/\//, (route) => route.abort());

const page = await context.newPage();

// Also intercept at page level (in case context-level isn't catching it)
await page.route("**/*execute-api*", async (route) => {
  const url = route.request().url();
  console.log(`  [page-level mock] ${url}`);
  if (url.includes("/users/me")) {
    return route.fulfill({ status: 200, contentType: "application/json",
      body: JSON.stringify({ data: { userId: "user-fixture-001", displayName: "ManInJumpsuit" } }) });
  }
  if (url.match(/\/campaigns\/[^/]+$/)) {
    return route.fulfill({ status: 200, contentType: "application/json",
      body: JSON.stringify({ data: {
        campaignId: "__placeholder__", name: "The Shattered Throne",
        callerRole: "gm", primaryGmId: "user-fixture-001",
        members: [], characters: [], currentFear: 3, description: "A dark fantasy campaign.", invites: [],
      }}) });
  }
  return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data: null }) });
});

const consoleMsgs = [];
page.on("console", (msg) => {
  consoleMsgs.push(`[${msg.type()}] ${msg.text()}`);
});

// Also track failed requests
page.on("requestfailed", (req) => {
  consoleMsgs.push(`[request-failed] ${req.url()} — ${req.failure()?.errorText}`);
});

page.on("response", (resp) => {
  if (resp.status() >= 400) {
    consoleMsgs.push(`[response-${resp.status()}] ${resp.url()}`);
  }
});

console.log("Navigating to campaign page...");
await page.goto(`${BASE_URL}/campaigns/__placeholder__`, { waitUntil: "load", timeout: 30000 });

// Check state at multiple intervals
for (const delay of [500, 1000, 2000, 3000, 5000]) {
  await page.waitForTimeout(delay === 500 ? 500 : delay - (delay === 1000 ? 500 : delay === 2000 ? 1000 : delay === 3000 ? 2000 : 3000));
  const snapshot = await page.evaluate(() => {
    const spinner = document.querySelector(".animate-spin");
    const tablist = document.querySelector('[role="tablist"]');
    const authRaw = sessionStorage.getItem("daggerheart-auth");
    const auth = authRaw ? JSON.parse(authRaw) : null;
    return {
      spinner: !!spinner,
      tablist: !!tablist,
      url: window.location.href,
      bodyText: document.body.innerText.slice(0, 200).replace(/\n/g, " "),
    };
  });
  console.log(`\n[t=${delay}ms]`, JSON.stringify(snapshot, null, 2));
}

console.log("\n--- Console messages ---");
consoleMsgs.forEach(m => console.log(m));

await browser.close();
