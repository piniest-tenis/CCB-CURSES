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
//   FRONTEND_URL            — e.g. "https://curses-ccb.maninjumpsuit.com"

import type { PatreonLink, PatreonMembershipStatus } from "@shared/types";

// ─── Config ───────────────────────────────────────────────────────────────────

const PATREON_CLIENT_ID     = process.env["PATREON_CLIENT_ID"]     ?? "";
const PATREON_CLIENT_SECRET = process.env["PATREON_CLIENT_SECRET"] ?? "";
const PATREON_REDIRECT_URI  = process.env["PATREON_REDIRECT_URI"]  ?? "";
const PATREON_CAMPAIGN_ID   = process.env["PATREON_CAMPAIGN_ID"]   ?? "";

const PATREON_AUTHORIZE_URL = "https://www.patreon.com/oauth2/authorize";
const PATREON_TOKEN_URL     = "https://www.patreon.com/api/oauth2/token";
const PATREON_IDENTITY_URL  = "https://www.patreon.com/api/oauth2/v2/identity";

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
 * Fetch the Patreon user's identity and their membership status for the
 * CursesAP campaign. Uses the Patreon API v2 with JSON:API includes.
 *
 * Returns "free" if the user is a member with no active pledge or a
 * follower. Returns "active_patron" if they have an active paid pledge.
 * Returns "none" if no membership relationship exists.
 */
export async function fetchMembership(
  accessToken: string
): Promise<PatreonMembershipResult> {
  // Request identity with memberships included. The `fields[member]` parameter
  // ensures we get patron_status and currently_entitled_tiers.
  const params = new URLSearchParams({
    "include":                     "memberships,memberships.currently_entitled_tiers",
    "fields[user]":                "full_name",
    "fields[member]":              "patron_status,currently_entitled_amount_cents,campaign_lifetime_support_cents",
    "fields[tier]":                "title,amount_cents",
  });

  const res = await fetch(`${PATREON_IDENTITY_URL}?${params.toString()}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Patreon identity fetch failed (${res.status}): ${text}`);
  }

  const json = await res.json() as {
    data: { id: string };
    included?: Array<{
      type: string;
      id: string;
      attributes?: Record<string, unknown>;
      relationships?: {
        campaign?: { data?: { id: string } };
        currently_entitled_tiers?: { data?: Array<{ id: string }> };
      };
    }>;
  };

  const patreonUserId = json.data.id;

  // Find the membership record for our campaign
  const membership = json.included?.find(
    (inc) =>
      inc.type === "member" &&
      inc.relationships?.campaign?.data?.id === PATREON_CAMPAIGN_ID
  );

  if (!membership) {
    return {
      patreonUserId,
      membershipStatus: "none",
      tierTitle: null,
      tierAmountCents: null,
    };
  }

  const patronStatus = membership.attributes?.["patron_status"] as string | undefined;

  // patron_status values: "active_patron", "declined_patron", "former_patron", null (free member)
  if (patronStatus === "active_patron") {
    // Find the entitled tier details
    const entitledTierIds =
      membership.relationships?.currently_entitled_tiers?.data?.map((t) => t.id) ?? [];
    const tierRecord = json.included?.find(
      (inc) => inc.type === "tier" && entitledTierIds.includes(inc.id)
    );

    return {
      patreonUserId,
      membershipStatus: "active_patron",
      tierTitle: (tierRecord?.attributes?.["title"] as string) ?? null,
      tierAmountCents: (tierRecord?.attributes?.["amount_cents"] as number) ?? null,
    };
  }

  // Any other status (null, "former_patron", "declined_patron") — if they
  // have a membership record at all, they are at minimum a free follower.
  // However, former/declined patrons should be treated as free members
  // since they still have a membership relationship with the campaign.
  return {
    patreonUserId,
    membershipStatus: "free",
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
