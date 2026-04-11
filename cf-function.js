function handler(event) {
  var request = event.request;
  var uri = request.uri;

  // ── Strip index.txt suffix for RSC payload requests ──────────────────
  // Next.js App Router client-side navigation fetches RSC payloads as
  // /path/index.txt?_rsc=... We strip the suffix, apply dynamic route
  // rewriting below, then re-append index.txt instead of index.html.
  var isRSC = false;
  if (uri.endsWith("/index.txt")) {
    isRSC = true;
    uri = uri.slice(0, -"/index.txt".length);
    if (!uri) uri = "/";
  }

  // ── Rewrite dynamic Next.js static-export routes ─────────────────────
  // The static export only generates one HTML/txt file per dynamic
  // segment (using __placeholder__); the client-side router handles
  // the actual param at runtime via usePathname().
  var suffix = isRSC ? "/index.txt" : "/index.html";

  var dynamicRoutes = [
    // /character/[id]/build, /public, /view, and /character/[id]
    { pattern: /^\/character\/[^/]+\/build(\/)?$/, target: "/character/__placeholder__/build" },
    { pattern: /^\/character\/[^/]+\/public(\/)?$/, target: "/character/__placeholder__/public" },
    { pattern: /^\/character\/[^/]+\/view(\/)?$/, target: "/character/__placeholder__/view" },
    { pattern: /^\/character\/[^/]+(\/)?$/, target: "/character/__placeholder__" },
    // /classes/[classId]
    { pattern: /^\/classes\/[^/]+(\/)?$/, target: "/classes/__placeholder__" },
    // /domains/[domain]
    { pattern: /^\/domains\/[^/]+(\/)?$/, target: "/domains/__placeholder__" },
    // /campaigns/[id]/settings and /campaigns/[id]
    // Exclude "new" so /campaigns/new serves its own static page.
    { pattern: /^\/campaigns\/(?!new(\/)?$)[^/]+\/settings(\/)?$/, target: "/campaigns/__placeholder__/settings" },
    { pattern: /^\/campaigns\/(?!new(\/)?$)[^/]+(\/)?$/, target: "/campaigns/__placeholder__" },
    // /homebrew/frames/[id]/edit and /homebrew/frames/[id]
    // Exclude "new" so /homebrew/frames/new serves its own static page.
    { pattern: /^\/homebrew\/frames\/(?!new(\/)?$)[^/]+\/edit(\/)?$/, target: "/homebrew/frames/__placeholder__/edit" },
    { pattern: /^\/homebrew\/frames\/(?!new(\/)?$)[^/]+(\/)?$/, target: "/homebrew/frames/__placeholder__" },
    // /join/[code]
    { pattern: /^\/join\/[^/]+(\/)?$/, target: "/join/__placeholder__" },
  ];

  for (var i = 0; i < dynamicRoutes.length; i++) {
    if (dynamicRoutes[i].pattern.test(uri)) {
      request.uri = dynamicRoutes[i].target + suffix;
      return request;
    }
  }

  // /homebrew/[type]/[id]/edit — the [type] segment is a real directory
  // name (class, ancestry, etc.); only the [id] segment needs rewriting.
  var homebrewEditMatch = uri.match(/^\/homebrew\/(class|ancestry|community|domainCard|weapon|armor|item|consumable)\/[^/]+\/edit(\/)?$/);
  if (homebrewEditMatch) {
    request.uri = "/homebrew/" + homebrewEditMatch[1] + "/__placeholder__/edit" + suffix;
    return request;
  }

  // ── Static paths: append index.html / index.txt ──────────────────────
  if (isRSC) {
    // RSC request for a non-dynamic route — restore the index.txt suffix
    request.uri = uri + "/index.txt";
  } else if (uri.endsWith("/")) {
    request.uri = uri + "index.html";
  } else if (!uri.includes(".", uri.lastIndexOf("/"))) {
    request.uri = uri + "/index.html";
  }

  return request;
}