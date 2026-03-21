/**
 * playwright.config.ts
 *
 * Playwright configuration for the Daggerheart Character Builder.
 *
 * ─── Test server strategy ──────────────────────────────────────────────────
 * The app is a Next.js 14 static export (output: "export", trailingSlash: true).
 * In production, CloudFront rewrites dynamic paths to their __placeholder__
 * HTML files.  Locally we run `next dev` so the file-system routing still
 * works and we can navigate to real-looking paths like /character/abc123/build.
 *
 * We DO NOT use `next start` because it requires a standard Next.js build
 * (without `output: "export"`).  `next dev` serves the app on-the-fly and
 * correctly resolves /character/[id]/build to the right page component, which
 * is what we need to test.
 *
 * ─── Auth strategy ────────────────────────────────────────────────────────
 * The app uses Cognito (amazon-cognito-identity-js).  Tests bypass Cognito by
 * injecting a mock auth state into sessionStorage before each test navigation
 * (see tests/helpers/mockAuth.ts).  All API calls are intercepted by
 * Playwright's network mocking (route()) to return seeded fixture data without
 * hitting any real backend.
 *
 * ─── Running ───────────────────────────────────────────────────────────────
 *   npm run test:e2e            — headed-less run, all browsers
 *   npm run test:e2e -- --ui    — Playwright interactive UI
 *   npm run test:e2e -- --headed — watch tests run in a real browser
 */

import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",

  /* Glob for test files */
  testMatch: "**/*.spec.ts",

  /* Run tests in files in parallel */
  fullyParallel: false, // keep serial so the dev server is shared cleanly

  /* Fail the build on CI if you accidentally left test.only in a file. */
  forbidOnly: !!process.env.CI,

  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,

  /* One worker keeps the dev-server warm and avoids port conflicts */
  workers: 1,

  /* Reporter */
  reporter: [
    ["list"],
    ["html", { outputFolder: "playwright-report", open: "never" }],
  ],

  use: {
    /* Base URL used by page.goto() calls */
    baseURL: "http://localhost:3000",

    /* Collect trace on first retry */
    trace: "on-first-retry",

    /* Screenshot on failure */
    screenshot: "only-on-failure",

    /* Viewport — mobile-first as required by the spec */
    viewport: { width: 390, height: 844 }, // iPhone 14 Pro

    /* Don't persist any storage between tests unless explicitly set */
    storageState: undefined,
  },

  /* Start the Next.js dev server before running tests */
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    // Print dev server output in CI so failures are debuggable
    stdout: process.env.CI ? "pipe" : "ignore",
    stderr: "pipe",
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "mobile-chrome",
      use: { ...devices["Pixel 7"] },
    },
  ],
});
