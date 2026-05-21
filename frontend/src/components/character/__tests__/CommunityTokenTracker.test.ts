/**
 * CommunityTokenTracker tests.
 *
 * Pure logic mirrors — no React mount needed.
 * Tests the key-naming contract, display helpers, and button-disabled rules
 * that CommunityTokenTracker uses internally.
 */

import { describe, it, expect } from "vitest";

// ─── Key contract ─────────────────────────────────────────────────────────────

function communityCardId(communityId: string): string {
  return `community/${communityId}`;
}

describe("CommunityTokenTracker — cardId key", () => {
  it("uses the 'community/{communityId}' namespace", () => {
    expect(communityCardId("seaborne")).toBe("community/seaborne");
    expect(communityCardId("wanderers")).toBe("community/wanderers");
  });

  it("does not collide with a bare communityId", () => {
    expect(communityCardId("seaborne")).not.toBe("seaborne");
  });

  it("does not collide with a domain card id that happens to share the name", () => {
    // Domain cards use their raw cardId (e.g. "seaborne-card-1"), not the community/ prefix
    expect(communityCardId("seaborne")).not.toBe("seaborne-card-1");
  });
});

// ─── Pure display helpers (mirrors CommunityTokenTracker internals) ───────────

function isAddDisabled(count: number, resolvedCap: number | null): boolean {
  return resolvedCap !== null && count >= resolvedCap;
}

function isMinusDisabled(count: number): boolean {
  return count <= 0;
}

function pipCount(resolvedCap: number | null | undefined): number {
  return resolvedCap != null ? resolvedCap : 8;
}

function countDisplay(
  count: number,
  resolvedCap: number | null | undefined,
  capLabel: string | null
): string {
  if (resolvedCap != null) {
    return capLabel
      ? `${count} / ${resolvedCap} (${capLabel})`
      : `${count} / ${resolvedCap}`;
  }
  return `${count}`;
}

describe("CommunityTokenTracker — + button disabled rule", () => {
  it("is disabled when count equals resolvedCap", () => {
    expect(isAddDisabled(4, 4)).toBe(true);
  });

  it("is enabled when count is below resolvedCap", () => {
    expect(isAddDisabled(3, 4)).toBe(false);
  });

  it("is never disabled when resolvedCap is null (uncapped)", () => {
    expect(isAddDisabled(99, null)).toBe(false);
  });
});

describe("CommunityTokenTracker — − button disabled rule", () => {
  it("is disabled at 0", () => {
    expect(isMinusDisabled(0)).toBe(true);
  });

  it("is enabled when count > 0", () => {
    expect(isMinusDisabled(1)).toBe(false);
  });
});

describe("CommunityTokenTracker — pip count", () => {
  it("equals resolvedCap when provided", () => {
    expect(pipCount(6)).toBe(6);
  });

  it("defaults to 8 when resolvedCap is null", () => {
    expect(pipCount(null)).toBe(8);
  });

  it("defaults to 8 when resolvedCap is undefined", () => {
    expect(pipCount(undefined)).toBe(8);
  });
});

describe("CommunityTokenTracker — count display format", () => {
  it("shows 'count / cap (Label)' when cap and label are known", () => {
    expect(countDisplay(2, 5, "Presence")).toBe("2 / 5 (Presence)");
  });

  it("shows 'count / cap' when cap is known but no label", () => {
    expect(countDisplay(2, 5, null)).toBe("2 / 5");
  });

  it("shows just count when uncapped", () => {
    expect(countDisplay(3, null, null)).toBe("3");
  });
});

// ─── Visibility rule ──────────────────────────────────────────────────────────

/**
 * CommunityTokenTracker is only rendered when communityData.tokenConfig is
 * present AND communityId is non-null. This mirrors the conditional in
 * HeritageSection.
 */
function shouldShowCommunityTracker(
  tokenConfig: object | undefined,
  communityId: string | undefined
): boolean {
  return tokenConfig !== undefined && communityId !== undefined;
}

describe("CommunityTokenTracker — visibility rule", () => {
  it("is shown when tokenConfig is present and communityId is set", () => {
    expect(shouldShowCommunityTracker({ maxStat: "presence" }, "seaborne")).toBe(true);
  });

  it("is hidden when tokenConfig is absent", () => {
    expect(shouldShowCommunityTracker(undefined, "seaborne")).toBe(false);
  });

  it("is hidden when communityId is absent", () => {
    expect(shouldShowCommunityTracker({ maxStat: "presence" }, undefined)).toBe(false);
  });
});
