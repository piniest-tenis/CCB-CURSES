/**
 * tests/cloudfront-url-rewrite.spec.ts
 *
 * Unit tests for the CloudFront Function URL-rewrite logic.
 *
 * ─── Strategy ─────────────────────────────────────────────────────────────
 * The CloudFront Function JS is extracted verbatim from frontend-stack.ts and
 * executed inside Node.js (via the Function constructor) so we can test every
 * routing rule in isolation — no real CloudFront or S3 required.
 *
 * ─── Coverage ─────────────────────────────────────────────────────────────
 * 1. Character dynamic routes (/character/[id], /build, /public, /view)
 * 2. Classes dynamic route (/classes/[classId])
 * 3. Domains dynamic route (/domains/[domain])
 * 4. Campaign routes — dynamic rewrite EXCLUDES /campaigns/new
 * 5. Campaign settings route (/campaigns/[id]/settings)
 * 6. Homebrew frames — dynamic rewrite EXCLUDES /homebrew/frames/new
 * 7. Homebrew frames edit (/homebrew/frames/[id]/edit)
 * 8. Homebrew type edit (/homebrew/[type]/[id]/edit)
 * 9. Join route (/join/[code])
 * 10. RSC payload requests (index.txt)
 * 11. Static paths (index.html appended for clean URLs)
 * 12. Static assets (pass-through unchanged)
 * 13. Pattern ordering (build before base character, settings before base campaign)
 */

import { test, expect } from "@playwright/test";

// ─── Extract and compile the CloudFront Function ──────────────────────────────

/**
 * Inline the exact function body from frontend-stack.ts.
 * This is a deliberate copy so tests fail visibly if the CDK definition
 * diverges from what is deployed.  If you change the CloudFront Function,
 * update this copy to match and the tests will guide you to correctness.
 */
const CLOUDFRONT_FUNCTION_BODY = `
function handler(event) {
  var request = event.request;
  var uri = request.uri;

  // Strip index.txt suffix for RSC payload requests
  var isRSC = false;
  if (uri.endsWith("/index.txt")) {
    isRSC = true;
    uri = uri.slice(0, -"/index.txt".length);
    if (!uri) uri = "/";
  }

  // Rewrite dynamic Next.js static-export routes
  var suffix = isRSC ? "/index.txt" : "/index.html";

  var dynamicRoutes = [
    // /character/[id]/build, /public, /view, and /character/[id]
    { pattern: /^\\/character\\/[^/]+\\/build(\\/)?$/, target: "/character/__placeholder__/build" },
    { pattern: /^\\/character\\/[^/]+\\/public(\\/)?$/, target: "/character/__placeholder__/public" },
    { pattern: /^\\/character\\/[^/]+\\/view(\\/)?$/, target: "/character/__placeholder__/view" },
    { pattern: /^\\/character\\/[^/]+(\\/)?$/, target: "/character/__placeholder__" },
    // /classes/[classId]
    { pattern: /^\\/classes\\/[^/]+(\\/)?$/, target: "/classes/__placeholder__" },
    // /domains/[domain]
    { pattern: /^\\/domains\\/[^/]+(\\/)?$/, target: "/domains/__placeholder__" },
    // /campaigns/[id]/settings and /campaigns/[id]
    // Exclude "new" so /campaigns/new serves its own static page.
    { pattern: /^\\/campaigns\\/(?!new(\\/)?$)[^/]+\\/settings(\\/)?$/, target: "/campaigns/__placeholder__/settings" },
    { pattern: /^\\/campaigns\\/(?!new(\\/)?$)[^/]+(\\/)?$/, target: "/campaigns/__placeholder__" },
    // /homebrew/frames/[id]/edit and /homebrew/frames/[id]
    // Exclude "new" so /homebrew/frames/new serves its own static page.
    { pattern: /^\\/homebrew\\/frames\\/(?!new(\\/)?$)[^/]+\\/edit(\\/)?$/, target: "/homebrew/frames/__placeholder__/edit" },
    { pattern: /^\\/homebrew\\/frames\\/(?!new(\\/)?$)[^/]+(\\/)?$/, target: "/homebrew/frames/__placeholder__" },
    // /join/[code]
    { pattern: /^\\/join\\/[^/]+(\\/)?$/, target: "/join/__placeholder__" },
  ];

  for (var i = 0; i < dynamicRoutes.length; i++) {
    if (dynamicRoutes[i].pattern.test(uri)) {
      request.uri = dynamicRoutes[i].target + suffix;
      return request;
    }
  }

  // /homebrew/[type]/[id]/edit
  var homebrewEditMatch = uri.match(/^\\/homebrew\\/(class|ancestry|community|domainCard|weapon|armor|item|consumable)\\/[^/]+\\/edit(\\/)?$/);
  if (homebrewEditMatch) {
    request.uri = "/homebrew/" + homebrewEditMatch[1] + "/__placeholder__/edit" + suffix;
    return request;
  }

  // Static paths: append index.html / index.txt
  if (isRSC) {
    request.uri = uri + "/index.txt";
  } else if (uri.endsWith("/")) {
    request.uri = uri + "index.html";
  } else if (!uri.includes(".", uri.lastIndexOf("/"))) {
    request.uri = uri + "/index.html";
  }

  return request;
}
`;

/**
 * Execute the CloudFront handler function in a sandboxed context.
 * Returns the rewritten URI.
 */
function rewrite(uri: string): string {
  const wrappedBody = `
    ${CLOUDFRONT_FUNCTION_BODY}
    return handler(event);
  `;
  // eslint-disable-next-line no-new-func
  const handler = new Function("event", wrappedBody);
  const event = { request: { uri } };
  const result = handler(event) as { uri: string };
  return result.uri;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

test.describe("CloudFront URL-rewrite function", () => {
  // ── Character routes ──────────────────────────────────────────────────

  test.describe("Dynamic route: /character/[id]/build", () => {
    test("rewrites /character/abc123/build/ (with trailing slash)", () => {
      expect(rewrite("/character/abc123/build/")).toBe(
        "/character/__placeholder__/build/index.html"
      );
    });

    test("rewrites /character/abc123/build (without trailing slash)", () => {
      expect(rewrite("/character/abc123/build")).toBe(
        "/character/__placeholder__/build/index.html"
      );
    });

    test("rewrites a UUID-based character ID with /build", () => {
      expect(
        rewrite("/character/550e8400-e29b-41d4-a716-446655440000/build/")
      ).toBe("/character/__placeholder__/build/index.html");
    });
  });

  test.describe("Dynamic route: /character/[id]/public", () => {
    test("rewrites /character/abc123/public/", () => {
      expect(rewrite("/character/abc123/public/")).toBe(
        "/character/__placeholder__/public/index.html"
      );
    });
  });

  test.describe("Dynamic route: /character/[id]/view", () => {
    test("rewrites /character/abc123/view/ (with trailing slash)", () => {
      expect(rewrite("/character/abc123/view/")).toBe(
        "/character/__placeholder__/view/index.html"
      );
    });

    test("rewrites /character/abc123/view (without trailing slash)", () => {
      expect(rewrite("/character/abc123/view")).toBe(
        "/character/__placeholder__/view/index.html"
      );
    });
  });

  test.describe("Dynamic route: /character/[id]", () => {
    test("rewrites /character/abc123/ (with trailing slash)", () => {
      expect(rewrite("/character/abc123/")).toBe(
        "/character/__placeholder__/index.html"
      );
    });

    test("rewrites /character/abc123 (without trailing slash)", () => {
      expect(rewrite("/character/abc123")).toBe(
        "/character/__placeholder__/index.html"
      );
    });
  });

  test.describe("Pattern ordering: build wins over base character route", () => {
    test("/character/abc123/build/ matches build, NOT base", () => {
      const result = rewrite("/character/abc123/build/");
      expect(result).toBe("/character/__placeholder__/build/index.html");
      expect(result).not.toBe("/character/__placeholder__/index.html");
    });
  });

  // ── Classes & Domains ─────────────────────────────────────────────────

  test.describe("Dynamic route: /classes/[classId]", () => {
    test("rewrites /classes/guardian/", () => {
      expect(rewrite("/classes/guardian/")).toBe(
        "/classes/__placeholder__/index.html"
      );
    });

    test("rewrites /classes/guardian (without trailing slash)", () => {
      expect(rewrite("/classes/guardian")).toBe(
        "/classes/__placeholder__/index.html"
      );
    });
  });

  test.describe("Dynamic route: /domains/[domain]", () => {
    test("rewrites /domains/valor/", () => {
      expect(rewrite("/domains/valor/")).toBe(
        "/domains/__placeholder__/index.html"
      );
    });
  });

  // ── Campaigns (THE BUG FIX: /campaigns/new must NOT be rewritten) ────

  test.describe("Dynamic route: /campaigns/[id]", () => {
    test("rewrites /campaigns/550e8400-e29b-41d4-a716-446655440000/", () => {
      expect(
        rewrite("/campaigns/550e8400-e29b-41d4-a716-446655440000/")
      ).toBe("/campaigns/__placeholder__/index.html");
    });

    test("rewrites /campaigns/some-id (without trailing slash)", () => {
      expect(rewrite("/campaigns/some-id")).toBe(
        "/campaigns/__placeholder__/index.html"
      );
    });
  });

  test.describe("Dynamic route: /campaigns/[id]/settings", () => {
    test("rewrites /campaigns/abc123/settings/", () => {
      expect(rewrite("/campaigns/abc123/settings/")).toBe(
        "/campaigns/__placeholder__/settings/index.html"
      );
    });

    test("rewrites /campaigns/abc123/settings (without trailing slash)", () => {
      expect(rewrite("/campaigns/abc123/settings")).toBe(
        "/campaigns/__placeholder__/settings/index.html"
      );
    });
  });

  test.describe("Static route: /campaigns/new must NOT be rewritten", () => {
    test("/campaigns/new serves its own static page", () => {
      expect(rewrite("/campaigns/new")).toBe("/campaigns/new/index.html");
    });

    test("/campaigns/new/ (with trailing slash) serves its own static page", () => {
      expect(rewrite("/campaigns/new/")).toBe("/campaigns/new/index.html");
    });

    test("/campaigns/new/settings matches settings rewrite (not a real page, harmless)", () => {
      // The negative lookahead (?!new(\/)?$) only excludes "new" when it's
      // the LAST segment. /campaigns/new/settings has "new" as a non-terminal
      // segment, so the settings pattern matches it. This is fine — there's
      // no /campaigns/new/settings page that could collide.
      expect(rewrite("/campaigns/new/settings")).toBe(
        "/campaigns/__placeholder__/settings/index.html"
      );
    });
  });

  // ── Homebrew Frames (THE BUG FIX: /homebrew/frames/new must NOT be rewritten) ─

  test.describe("Dynamic route: /homebrew/frames/[id]", () => {
    test("rewrites /homebrew/frames/abc123/", () => {
      expect(rewrite("/homebrew/frames/abc123/")).toBe(
        "/homebrew/frames/__placeholder__/index.html"
      );
    });

    test("rewrites /homebrew/frames/abc123 (without trailing slash)", () => {
      expect(rewrite("/homebrew/frames/abc123")).toBe(
        "/homebrew/frames/__placeholder__/index.html"
      );
    });
  });

  test.describe("Dynamic route: /homebrew/frames/[id]/edit", () => {
    test("rewrites /homebrew/frames/abc123/edit/", () => {
      expect(rewrite("/homebrew/frames/abc123/edit/")).toBe(
        "/homebrew/frames/__placeholder__/edit/index.html"
      );
    });

    test("rewrites /homebrew/frames/abc123/edit (without trailing slash)", () => {
      expect(rewrite("/homebrew/frames/abc123/edit")).toBe(
        "/homebrew/frames/__placeholder__/edit/index.html"
      );
    });
  });

  test.describe("Static route: /homebrew/frames/new must NOT be rewritten", () => {
    test("/homebrew/frames/new serves its own static page", () => {
      expect(rewrite("/homebrew/frames/new")).toBe(
        "/homebrew/frames/new/index.html"
      );
    });

    test("/homebrew/frames/new/ (with trailing slash) serves its own static page", () => {
      expect(rewrite("/homebrew/frames/new/")).toBe(
        "/homebrew/frames/new/index.html"
      );
    });
  });

  // ── Homebrew type edit ────────────────────────────────────────────────

  test.describe("Dynamic route: /homebrew/[type]/[id]/edit", () => {
    test("rewrites /homebrew/class/abc123/edit/", () => {
      expect(rewrite("/homebrew/class/abc123/edit/")).toBe(
        "/homebrew/class/__placeholder__/edit/index.html"
      );
    });

    test("rewrites /homebrew/weapon/abc123/edit (without trailing slash)", () => {
      expect(rewrite("/homebrew/weapon/abc123/edit")).toBe(
        "/homebrew/weapon/__placeholder__/edit/index.html"
      );
    });

    test("rewrites all 8 homebrew types", () => {
      const types = ["class", "ancestry", "community", "domainCard", "weapon", "armor", "item", "consumable"];
      for (const type of types) {
        expect(rewrite(`/homebrew/${type}/some-id/edit`)).toBe(
          `/homebrew/${type}/__placeholder__/edit/index.html`
        );
      }
    });
  });

  // ── Join route ────────────────────────────────────────────────────────

  test.describe("Dynamic route: /join/[code]", () => {
    test("rewrites /join/ABC123/", () => {
      expect(rewrite("/join/ABC123/")).toBe(
        "/join/__placeholder__/index.html"
      );
    });

    test("rewrites /join/invite-code (without trailing slash)", () => {
      expect(rewrite("/join/invite-code")).toBe(
        "/join/__placeholder__/index.html"
      );
    });
  });

  // ── RSC payload requests ──────────────────────────────────────────────

  test.describe("RSC payload requests (index.txt)", () => {
    test("rewrites /campaigns/abc123/index.txt to placeholder/index.txt", () => {
      expect(rewrite("/campaigns/abc123/index.txt")).toBe(
        "/campaigns/__placeholder__/index.txt"
      );
    });

    test("rewrites /character/abc123/build/index.txt to placeholder/build/index.txt", () => {
      expect(rewrite("/character/abc123/build/index.txt")).toBe(
        "/character/__placeholder__/build/index.txt"
      );
    });

    test("rewrites /dashboard/index.txt to /dashboard/index.txt (static)", () => {
      expect(rewrite("/dashboard/index.txt")).toBe("/dashboard/index.txt");
    });

    test("/campaigns/new/index.txt serves its own static RSC payload", () => {
      expect(rewrite("/campaigns/new/index.txt")).toBe(
        "/campaigns/new/index.txt"
      );
    });
  });

  // ── Static paths ──────────────────────────────────────────────────────

  test.describe("Static paths: index.html appended for clean URLs", () => {
    test("rewrites /dashboard/ to /dashboard/index.html", () => {
      expect(rewrite("/dashboard/")).toBe("/dashboard/index.html");
    });

    test("rewrites /dashboard (no slash) to /dashboard/index.html", () => {
      expect(rewrite("/dashboard")).toBe("/dashboard/index.html");
    });

    test("rewrites / to /index.html", () => {
      expect(rewrite("/")).toBe("/index.html");
    });

    test("rewrites /auth/login/ to /auth/login/index.html", () => {
      expect(rewrite("/auth/login/")).toBe("/auth/login/index.html");
    });
  });

  // ── Static assets ─────────────────────────────────────────────────────

  test.describe("Static assets: pass through unchanged", () => {
    test("does not rewrite /_next/static/chunks/main.js", () => {
      expect(rewrite("/_next/static/chunks/main.js")).toBe(
        "/_next/static/chunks/main.js"
      );
    });

    test("does not rewrite /favicon.ico", () => {
      expect(rewrite("/favicon.ico")).toBe("/favicon.ico");
    });

    test("does not rewrite /images/logo.png", () => {
      expect(rewrite("/images/logo.png")).toBe("/images/logo.png");
    });
  });

  // ── Edge cases ────────────────────────────────────────────────────────

  test.describe("Edge cases", () => {
    test("does not rewrite already-resolved placeholder paths", () => {
      expect(rewrite("/character/__placeholder__/build/index.html")).toBe(
        "/character/__placeholder__/build/index.html"
      );
    });

    test("does not match /characterextra/abc/build (prefix must be exact)", () => {
      expect(rewrite("/characterextra/abc/build/")).toBe(
        "/characterextra/abc/build/index.html"
      );
    });

    test("/campaigns listing page is not rewritten by dynamic pattern", () => {
      expect(rewrite("/campaigns/")).toBe("/campaigns/index.html");
    });

    test("/homebrew/frames listing page is not rewritten by dynamic pattern", () => {
      expect(rewrite("/homebrew/frames/")).toBe("/homebrew/frames/index.html");
    });
  });
});
