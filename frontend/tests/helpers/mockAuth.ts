/**
 * tests/helpers/mockAuth.ts
 *
 * Helpers that inject a mock authenticated session into the browser's
 * sessionStorage before page navigation, bypassing Cognito entirely.
 *
 * How it works:
 * ─────────────
 * The authStore (Zustand + zustand/middleware/persist) reads its initial
 * state from sessionStorage under the key "daggerheart-auth".  By writing
 * a valid-looking persisted value before the page loads we make the store
 * start in an authenticated state (`isAuthenticated: true`, `isReady: true`)
 * without ever calling Cognito.
 *
 * Additionally, we intercept the GET /users/me request that initialize()
 * fires and return a fixture user profile, so the store never attempts a
 * real network call.
 *
 * Usage:
 *   import { injectMockAuth } from './helpers/mockAuth';
 *   await injectMockAuth(page);
 *   await page.goto('/dashboard');
 */

import type { Page } from "@playwright/test";
import { userProfileFixture } from "../fixtures/characters";

/** The sessionStorage key used by zustand/persist for the auth store. */
const AUTH_STORAGE_KEY = "daggerheart-auth";

/** The API base URL the frontend targets (matches next dev's NEXT_PUBLIC_API_URL env). */
const API_BASE = process.env.PLAYWRIGHT_API_BASE ?? "http://localhost:3001";

/**
 * Inject a mock auth session before navigating to a page.
 *
 * Call this BEFORE page.goto() — it uses addInitScript which runs before
 * any page JS, ensuring Zustand hydrates from the mock state.
 */
export async function injectMockAuth(page: Page): Promise<void> {
  const mockToken = "mock_id_token_for_testing";

  const persistedAuth = JSON.stringify({
    state: {
      user: userProfileFixture,
      idToken: mockToken,
    },
    version: 0,
  });

  // Write sessionStorage before ANY page script runs
  await page.addInitScript(
    ({ key, value }: { key: string; value: string }) => {
      try {
        sessionStorage.setItem(key, value);
      } catch {
        // In case sessionStorage is restricted
      }
    },
    { key: AUTH_STORAGE_KEY, value: persistedAuth }
  );

  // Also override the Zustand store's isReady/isAuthenticated flags directly
  // after the page has loaded (belt-and-suspenders for the initialize() call).
  await page.addInitScript(() => {
    // Patch window so that when initialize() is called it resolves immediately
    // without touching Cognito.  We monkey-patch the auth lib module by
    // intercepting fetch at the window level rather than the module level
    // (which we can't reach from addInitScript).
    const _originalFetch = window.fetch;
    window.fetch = async function patchedFetch(input, init) {
      const url = typeof input === "string" ? input : (input as Request).url;
      // Let all requests through — API mocking is handled by page.route()
      return _originalFetch.call(window, input, init);
    };
  });
}

/**
 * Mount all standard API intercepts on a Playwright page.
 *
 * This covers every endpoint the app touches during normal character
 * builder flows so tests never hit a real backend.
 */
export async function mountApiMocks(
  page: Page,
  overrides: {
    characterId?: string;
    characterData?: Record<string, unknown>;
    characterList?: Record<string, unknown>;
    newCharacterData?: Record<string, unknown>;
  } = {}
): Promise<void> {
  const {
    characterId,
    characterData,
    characterList,
    newCharacterData,
  } = overrides;

  // Helper: wrap in the standard { data } envelope
  const envelope = (data: unknown) => ({ data });

  // GET /users/me — called by initialize() after session restore
  await page.route(`${API_BASE}/users/me`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(envelope(userProfileFixture)),
    });
  });

  // GET /characters — dashboard list
  await page.route(`${API_BASE}/characters`, async (route) => {
    const method = route.request().method();
    if (method === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(
          envelope(characterList ?? {
            characters: [],
            cursor: null,
          })
        ),
      });
    } else if (method === "POST") {
      // Character creation
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify(envelope(newCharacterData ?? {})),
      });
    } else {
      await route.continue();
    }
  });

  // GET /characters/:id — individual character fetch
  if (characterId) {
    await page.route(`${API_BASE}/characters/${characterId}`, async (route) => {
      const method = route.request().method();
      if (method === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(envelope(characterData ?? {})),
        });
      } else if (method === "PATCH") {
        // Simulate successful save — echo back the sent body merged with fixture
        const body = route.request().postDataJSON() as Record<string, unknown>;
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(envelope({ ...(characterData ?? {}), ...body, characterId })),
        });
      } else {
        await route.continue();
      }
    });
  }

  // GET /classes — full list
  await page.route(`${API_BASE}/classes`, async (route) => {
    const { classesListFixture } = await import("../fixtures/characters");
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(envelope(classesListFixture)),
    });
  });

  // GET /classes/:id — single class detail
  await page.route(`${API_BASE}/classes/**`, async (route) => {
    const { classFixture } = await import("../fixtures/characters");
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(envelope(classFixture)),
    });
  });

  // GET /ancestries
  await page.route(`${API_BASE}/ancestries`, async (route) => {
    const { ancestriesFixture } = await import("../fixtures/characters");
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(envelope(ancestriesFixture)),
    });
  });

  // GET /communities
  await page.route(`${API_BASE}/communities`, async (route) => {
    const { communitiesFixture } = await import("../fixtures/characters");
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(envelope(communitiesFixture)),
    });
  });

  // GET /domains/cards or /domain-cards — domain card selection
  await page.route(`${API_BASE}/domain-cards**`, async (route) => {
    const { domainCardsFixture } = await import("../fixtures/characters");
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(envelope(domainCardsFixture)),
    });
  });

  // GET /cms/** — splash content
  await page.route(`${API_BASE}/cms/**`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(envelope({ items: [] })),
    });
  });

  // Catch-all: any other API request returns 200 empty
  await page.route(`${API_BASE}/**`, async (route) => {
    // Only intercept if not already handled
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ data: {} }),
    });
  });
}
