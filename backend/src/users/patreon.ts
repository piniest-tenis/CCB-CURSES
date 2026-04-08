// backend/src/users/patreon.ts
// Patreon OAuth 2.0 and membership check utilities.
//
// Handles the "Link Patreon" flow:
//   1. Frontend opens the Patreon OAuth authorize URL in a new tab.
//   2. User authorises on Patreon and is redirected to our callback endpoint.
//   3. Callback exchanges the code for tokens, fetches the user's identity +
//      membership status on the CursesAP campaign, stores the result on the
//      user's DynamoDB record, and redirects back to the app.
//
// Required env vars:
//   PATREON_CLIENT_ID       — OAuth client ID from https://www.patreon.com/portal
//   PATREON_CLIENT_SECRET   — OAuth client secret
//   PATREON_REDIRECT_URI    — Fully-qualified callback URL registered with Patreon
//   PATREON_CAMPAIGN_ID     — Numeric campaign ID for the CursesAP Patreon page
//   FRONTEND_URL            — e.g. "https://ccb.curses.show"

import type { PatreonLink, PatreonMembershipStatus } from "@shared/types";

// ─── Config ───────────────────────────────────────────────────────────────────

const PATREON_CLIENT_ID            = process.env["PATREON_CLIENT_ID"]            ?? "";
const PATREON_CLIENT_SECRET        = process.env["PATREON_CLIENT_SECRET"]        ?? "";
const PATREON_REDIRECT_URI         = process.env["PATREON_REDIRECT_URI"]         ?? "";
const PATREON_CAMPAIGN_ID          = process.env["PATREON_CAMPAIGN_ID"]          ?? "";
const PATREON_CREATOR_ACCESS_TOKEN = process.env["PATREON_CREATOR_ACCESS_TOKEN"] ?? "";

const PATREON_AUTHORIZE_URL   = "https://www.patreon.com/oauth2/authorize";
const PATREON_TOKEN_URL       = "https://www.patreon.com/api/oauth2/token";
const PATREON_IDENTITY_URL    = "https://www.patreon.com/api/oauth2/v2/identity";
const PATREON_CAMPAIGN_MEMBERS_URL = `https://www.patreon.com/api/oauth2/v2/campaigns/${PATREON_CAMPAIGN_ID}/members`;

// ─── Grandfathering ───────────────────────────────────────────────────────────

/**
 * ISO 8601 cutoff date. Accounts created before this timestamp are exempt
 * from the Patreon requirement. Defaults to "never exempt" if not set,
 * meaning all accounts require Patreon. Set this to the deployment date.
 */
const PATREON_GATE_CUTOFF_DATE =
  process.env["PATREON_GATE_CUTOFF_DATE"] ?? "1970-01-01T00:00:00.000Z";

/**
 * Returns true if the user account was created before the Patreon gate
 * cutoff date and is therefore exempt from the Patreon linking requirement.
 */
export function isGrandfathered(createdAt: string): boolean {
  return new Date(createdAt) < new Date(PATREON_GATE_CUTOFF_DATE);
}

// ─── OAuth URL Builder ────────────────────────────────────────────────────────

/**
 * Builds the Patreon OAuth authorization URL. The `state` parameter encodes
 * the authenticated userId so the callback can associate the Patreon grant
 * with the correct DynamoDB user record.
 */
export function buildAuthorizeUrl(userId: string): string {
  const params = new URLSearchParams({
    response_type: "code",
    client_id:     PATREON_CLIENT_ID,
    redirect_uri:  PATREON_REDIRECT_URI,
    scope:         "identity identity.memberships",
    state:         userId,
  });
  return `${PATREON_AUTHORIZE_URL}?${params.toString()}`;
}

// ─── Token Exchange ───────────────────────────────────────────────────────────

interface PatreonTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
}

/**
 * Exchange an OAuth authorization code for Patreon access/refresh tokens.
 */
export async function exchangeCode(code: string): Promise<PatreonTokens> {
  const body = new URLSearchParams({
    code,
    grant_type:    "authorization_code",
    client_id:     PATREON_CLIENT_ID,
    client_secret: PATREON_CLIENT_SECRET,
    redirect_uri:  PATREON_REDIRECT_URI,
  });

  const res = await fetch(PATREON_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Patreon token exchange failed (${res.status}): ${text}`);
  }

  return res.json() as Promise<PatreonTokens>;
}

// ─── Identity + Membership Fetch ──────────────────────────────────────────────

interface PatreonMembershipResult {
  patreonUserId: string;
  membershipStatus: PatreonMembershipStatus;
  tierTitle: string | null;
  tierAmountCents: number | null;
}

/**
 * Fetch the Patreon user's identity (to get their patreonUserId) and then
 * check their membership status on the CursesAP campaign using the
 * **creator access token** via the campaign members endpoint.
 *
 * Why two steps?
 * The Patreon `/identity?include=memberships` endpoint does NOT reliably
 * return membership records for **free followers** — only paid patrons
 * show up there. The creator's `/campaigns/{id}/members` endpoint is the
 * only reliable way to detect free followers and their entitled tiers.
 *
 * Flow:
 *   1. GET /identity (user token) → patreonUserId
 *   2. GET /campaigns/{id}/members (creator token) → paginate to find
 *      the member whose `relationships.user.data.id` matches patreonUserId
 *
 * Returns "free" if the user is a follower/free member.
 * Returns "active_patron" if they have an active paid pledge.
 * Returns "none" if they are not a member of the campaign at all.
 */
export async function fetchMembership(
  accessToken: string
): Promise<PatreonMembershipResult> {
  // ── Step 1: Get the Patreon user ID from the identity endpoint ──────────
  const identityRes = await fetch(`${PATREON_IDENTITY_URL}?fields[user]=full_name`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!identityRes.ok) {
    const text = await identityRes.text();
    throw new Error(`Patreon identity fetch failed (${identityRes.status}): ${text}`);
  }

  const identityJson = await identityRes.json() as { data: { id: string } };
  const patreonUserId = identityJson.data.id;

  // ── Step 2: Look up this user in the campaign members list ──────────────
  // Uses the creator access token, which can see ALL members (free + paid).
  // Paginate through all members since the API returns max ~1000 per page.
  if (!PATREON_CREATOR_ACCESS_TOKEN) {
    console.warn("PATREON_CREATOR_ACCESS_TOKEN not set — cannot verify membership via creator API");
    return { patreonUserId, membershipStatus: "none", tierTitle: null, tierAmountCents: null };
  }

  let nextUrl: string | null = PATREON_CAMPAIGN_MEMBERS_URL +
    "?" +
    new URLSearchParams({
      "include":        "currently_entitled_tiers,user",
      "fields[member]": "patron_status,currently_entitled_amount_cents",
      "fields[tier]":   "title,amount_cents",
      "fields[user]":   "full_name",
      "page[count]":    "500",
    }).toString();

  while (nextUrl) {
    const membersRes = await fetch(nextUrl, {
      headers: { Authorization: `Bearer ${PATREON_CREATOR_ACCESS_TOKEN}` },
    });

    if (!membersRes.ok) {
      const text = await membersRes.text();
      throw new Error(`Patreon campaign members fetch failed (${membersRes.status}): ${text}`);
    }

    const membersJson = await membersRes.json() as {
      data: Array<{
        id: string;
        type: string;
        attributes?: Record<string, unknown>;
        relationships?: {
          user?: { data?: { id: string; type: string } };
          currently_entitled_tiers?: { data?: Array<{ id: string; type: string }> };
        };
      }>;
      included?: Array<{
        id: string;
        type: string;
        attributes?: Record<string, unknown>;
      }>;
      meta?: {
        pagination?: { cursors?: { next?: string | null }; total?: number };
      };
    };

    // Find the member record whose related user matches our patreonUserId
    const member = membersJson.data.find(
      (m) => m.relationships?.user?.data?.id === patreonUserId
    );

    if (member) {
      const patronStatus = member.attributes?.["patron_status"] as string | undefined | null;

      if (patronStatus === "active_patron") {
        // Paid patron — find the entitled tier details
        const entitledTierIds =
          member.relationships?.currently_entitled_tiers?.data?.map((t) => t.id) ?? [];
        const tierRecord = membersJson.included?.find(
          (inc) => inc.type === "tier" && entitledTierIds.includes(inc.id)
        );
        return {
          patreonUserId,
          membershipStatus: "active_patron",
          tierTitle: (tierRecord?.attributes?.["title"] as string) ?? null,
          tierAmountCents: (tierRecord?.attributes?.["amount_cents"] as number) ?? null,
        };
      }

      // patron_status is null (free follower), "former_patron", or "declined_patron"
      // If they appear in the members list at all, they have a relationship with
      // the campaign. Treat as "free" member — they followed/joined for free.
      const entitledTierIds =
        member.relationships?.currently_entitled_tiers?.data?.map((t) => t.id) ?? [];
      const tierRecord = membersJson.included?.find(
        (inc) => inc.type === "tier" && entitledTierIds.includes(inc.id)
      );
      return {
        patreonUserId,
        membershipStatus: "free",
        tierTitle: (tierRecord?.attributes?.["title"] as string) ?? null,
        tierAmountCents: (tierRecord?.attributes?.["amount_cents"] as number) ?? null,
      };
    }

    // Not found on this page — check for next page
    const nextCursor = membersJson.meta?.pagination?.cursors?.next;
    if (nextCursor) {
      const url = new URL(PATREON_CAMPAIGN_MEMBERS_URL);
      url.searchParams.set("include", "currently_entitled_tiers,user");
      url.searchParams.set("fields[member]", "patron_status,currently_entitled_amount_cents");
      url.searchParams.set("fields[tier]", "title,amount_cents");
      url.searchParams.set("fields[user]", "full_name");
      url.searchParams.set("page[count]", "500");
      url.searchParams.set("page[cursor]", nextCursor);
      nextUrl = url.toString();
    } else {
      nextUrl = null;
    }
  }

  // User not found in campaign members at all
  return {
    patreonUserId,
    membershipStatus: "none",
    tierTitle: null,
    tierAmountCents: null,
  };
}

// ─── PatreonLink Builder ──────────────────────────────────────────────────────

/**
 * Build a PatreonLink object from a membership check result.
 */
export function buildPatreonLink(result: PatreonMembershipResult): PatreonLink {
  const now = new Date().toISOString();
  return {
    patreonUserId:    result.patreonUserId,
    membershipStatus: result.membershipStatus,
    tierTitle:        result.tierTitle,
    tierAmountCents:  result.tierAmountCents,
    linkedAt:         now,
    lastCheckedAt:    now,
  };
}

/**
 * Returns true if the user has sufficient Patreon status to save characters.
 * Requires at minimum "free" membership (follower of CursesAP).
 */
export function canSaveWithPatreon(patreon: PatreonLink | null): boolean {
  if (!patreon) return false;
  return patreon.membershipStatus === "free" || patreon.membershipStatus === "active_patron";
}

/**
 * Returns true if the user can save characters, considering both Patreon
 * status and grandfathering.
 */
export function canSave(
  patreon: PatreonLink | null,
  createdAt: string
): boolean {
  return isGrandfathered(createdAt) || canSaveWithPatreon(patreon);
}
