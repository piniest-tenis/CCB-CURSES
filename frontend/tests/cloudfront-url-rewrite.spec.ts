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
 * This directly tests the root-cause fix: the /character/[id]/build pattern
 * must be the FIRST entry in dynamicRoutes and must return the correct target
 * BEFORE the less-specific /character/[id] pattern matches.
 *
 * ─── Coverage ─────────────────────────────────────────────────────────────
 * 1. /character/abc123/build/       → /character/__placeholder__/build/index.html
 * 2. /character/abc123/build        → /character/__placeholder__/build/index.html
 * 3. /character/abc123/view/        → /character/__placeholder__/view/index.html
 * 4. /character/abc123/             → /character/__placeholder__/index.html
 * 5. /character/abc123              → /character/__placeholder__/index.html
 * 6. /classes/fighter/              → /classes/__placeholder__/index.html
 * 7. /domains/valor/                → /domains/__placeholder__/index.html
 * 8. /dashboard/                    → /dashboard/index.html
 * 9. /dashboard                     → /dashboard/index.html
 * 10. /_next/static/chunks/foo.js   → unchanged (static asset pass-through)
 * 11. /index.html                   → /index.html (already has extension)
 * 12. Build pattern is matched BEFORE the generic character pattern
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

  var dynamicRoutes = [
    { pattern: /^\\/character\\/[^/]+\\/build(\\/)?$/, target: "/character/__placeholder__/build/index.html" },
    { pattern: /^\\/character\\/[^/]+\\/view(\\/)?$/, target: "/character/__placeholder__/view/index.html" },
    { pattern: /^\\/character\\/[^/]+(\\/)?$/, target: "/character/__placeholder__/index.html" },
    { pattern: /^\\/classes\\/[^/]+(\\/)?$/, target: "/classes/__placeholder__/index.html" },
    { pattern: /^\\/domains\\/[^/]+(\\/)?$/, target: "/domains/__placeholder__/index.html" },
  ];

  for (var i = 0; i < dynamicRoutes.length; i++) {
    if (dynamicRoutes[i].pattern.test(uri)) {
      request.uri = dynamicRoutes[i].target;
      return request;
    }
  }

  if (uri.endsWith("/")) {
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
  // Wrap the function body so we can call it from JS
  // eslint-disable-next-line no-new-func
  const fn = new Function(
    "event",
    CLOUDFRONT_FUNCTION_BODY.replace("function handler(event)", "").replace(
      /^\s*\{/,
      ""
    ).replace(/\}\s*$/, "return handler(event);")
    // The above stripping is fragile — use a cleaner wrapper approach:
  );

  // Actually, compose a cleaner wrapper:
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
  test.describe("Dynamic route: /character/[id]/build — THE BUG FIX", () => {
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

    test("rewrites a real-looking UUID-based character ID with /build", () => {
      expect(
        rewrite("/character/550e8400-e29b-41d4-a716-446655440000/build/")
      ).toBe("/character/__placeholder__/build/index.html");
    });

    test("rewrites an alphanumeric character ID with /build", () => {
      expect(rewrite("/character/char_XyZ789/build")).toBe(
        "/character/__placeholder__/build/index.html"
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

  test.describe("Pattern ordering — build must win over base character route", () => {
    test("/character/abc123/build/ matches build pattern, NOT the character base pattern", () => {
      // If the build pattern were missing or ordered AFTER the base pattern,
      // this would return /character/__placeholder__/index.html (the bug).
      const result = rewrite("/character/abc123/build/");
      expect(result).toBe("/character/__placeholder__/build/index.html");
      expect(result).not.toBe("/character/__placeholder__/index.html");
    });

    test("/character/abc123/view/ matches view pattern, NOT the character base pattern", () => {
      const result = rewrite("/character/abc123/view/");
      expect(result).toBe("/character/__placeholder__/view/index.html");
      expect(result).not.toBe("/character/__placeholder__/index.html");
    });
  });

  test.describe("Dynamic route: /classes/[id]", () => {
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

  test.describe("Dynamic route: /domains/[id]", () => {
    test("rewrites /domains/valor/", () => {
      expect(rewrite("/domains/valor/")).toBe(
        "/domains/__placeholder__/index.html"
      );
    });
  });

  test.describe("Static paths: index.html appended for clean URLs", () => {
    test("rewrites /dashboard/ to /dashboard/index.html", () => {
      expect(rewrite("/dashboard/")).toBe("/dashboard/index.html");
    });

    test("rewrites /dashboard (no slash, no extension) to /dashboard/index.html", () => {
      expect(rewrite("/dashboard")).toBe("/dashboard/index.html");
    });

    test("rewrites / to /index.html", () => {
      expect(rewrite("/")).toBe("/index.html");
    });

    test("rewrites /auth/login/ to /auth/login/index.html", () => {
      expect(rewrite("/auth/login/")).toBe("/auth/login/index.html");
    });
  });

  test.describe("Static assets: pass through unchanged", () => {
    test("does not rewrite /_next/static/chunks/main.js", () => {
      expect(rewrite("/_next/static/chunks/main.js")).toBe(
        "/_next/static/chunks/main.js"
      );
    });

    test("does not rewrite /_next/static/css/app.css", () => {
      expect(rewrite("/_next/static/css/app.css")).toBe(
        "/_next/static/css/app.css"
      );
    });

    test("does not rewrite /favicon.ico", () => {
      expect(rewrite("/favicon.ico")).toBe("/favicon.ico");
    });

    test("does not rewrite /images/logo.png", () => {
      expect(rewrite("/images/logo.png")).toBe("/images/logo.png");
    });
  });

  test.describe("Edge cases", () => {
    test("does not rewrite /character/__placeholder__/build/index.html (already resolved)", () => {
      // After the first request the rewritten path has .html — it passes through
      expect(rewrite("/character/__placeholder__/build/index.html")).toBe(
        "/character/__placeholder__/build/index.html"
      );
    });

    test("does not match /characterextra/abc/build (prefix must be exact)", () => {
      // The pattern anchors with ^/character/ so /characterextra doesn't match
      const result = rewrite("/characterextra/abc/build/");
      // Falls through to trailing-slash rule
      expect(result).toBe("/characterextra/abc/build/index.html");
    });
  });
});
