// src/lib/auth.ts
// Google SSO via Cognito Hosted UI (PKCE authorization code grant).
// No password form — the only way in is through Google.
//
// Only one user may ever use this CMS. The first Google account to sign in
// is recorded in localStorage. All subsequent sign-ins by a different account
// are rejected until that lock is cleared (requires manual intervention or
// Cognito token revocation causing GetUser to fail on the stored session).

const JWT_KEY = "cms_jwt";
const PKCE_VERIFIER_KEY = "cms_pkce_verifier";
const REGISTERED_SUB_KEY = "cms_registered_sub";

const HOSTED_DOMAIN =
  process.env["NEXT_PUBLIC_COGNITO_HOSTED_DOMAIN"] ?? "";

const CLIENT_ID =
  process.env["NEXT_PUBLIC_COGNITO_CMS_CLIENT_ID"] ?? "";

// ---------------------------------------------------------------------------
// Token storage
// ---------------------------------------------------------------------------

export function getJwt(): string {
  if (typeof window === "undefined") return "";
  return sessionStorage.getItem(JWT_KEY) ?? "";
}

export function isAuthenticated(): boolean {
  return getJwt().length > 0;
}

/**
 * Clears the active session token. The registered-user lock in localStorage
 * is NOT cleared — a new sign-in will only succeed for the same Cognito sub.
 */
export function logout(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(JWT_KEY);
  sessionStorage.removeItem(PKCE_VERIFIER_KEY);
}

// ---------------------------------------------------------------------------
// PKCE helpers
// ---------------------------------------------------------------------------

function base64UrlEncode(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

async function generateCodeVerifier(): Promise<string> {
  const array = crypto.getRandomValues(new Uint8Array(64));
  return base64UrlEncode(array.buffer);
}

async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoded = new TextEncoder().encode(verifier);
  const hash = await crypto.subtle.digest("SHA-256", encoded);
  return base64UrlEncode(hash);
}

// ---------------------------------------------------------------------------
// Redirect to Cognito Hosted UI (Google only)
// ---------------------------------------------------------------------------

export async function startGoogleLogin(callbackUrl: string): Promise<void> {
  const verifier = await generateCodeVerifier();
  const challenge = await generateCodeChallenge(verifier);
  sessionStorage.setItem(PKCE_VERIFIER_KEY, verifier);

  const params = new URLSearchParams({
    response_type: "code",
    client_id: CLIENT_ID,
    redirect_uri: callbackUrl,
    scope: "email openid profile",
    code_challenge_method: "S256",
    code_challenge: challenge,
    identity_provider: "Google",
  });

  window.location.assign(`https://${HOSTED_DOMAIN}/oauth2/authorize?${params}`);
}

// ---------------------------------------------------------------------------
// Exchange authorization code for tokens (called from /auth/callback)
// ---------------------------------------------------------------------------

export async function handleCallback(
  code: string,
  callbackUrl: string
): Promise<{ ok: boolean; error?: string }> {
  const verifier = sessionStorage.getItem(PKCE_VERIFIER_KEY);
  if (!verifier) {
    return { ok: false, error: "Missing PKCE verifier. Try signing in again." };
  }

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: CLIENT_ID,
    redirect_uri: callbackUrl,
    code,
    code_verifier: verifier,
  });

  let res: Response;
  try {
    res = await fetch(`https://${HOSTED_DOMAIN}/oauth2/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });
  } catch {
    return { ok: false, error: "Network error during token exchange." };
  }

  if (!res.ok) {
    const text = await res.text();
    console.error("[auth] token exchange failed:", text);
    return { ok: false, error: "Token exchange failed." };
  }

  const data = await res.json();
  const accessToken: string | undefined = data.access_token;
  if (!accessToken) {
    return { ok: false, error: "No access token in response." };
  }

  // Fetch the Cognito user record to get the stable sub identifier.
  const userInfo = await getCognitoUser(accessToken);
  if (!userInfo) {
    return { ok: false, error: "Could not verify user identity." };
  }

  // Enforce single-user lock.
  const registeredSub = localStorage.getItem(REGISTERED_SUB_KEY);
  if (registeredSub === null) {
    // First ever sign-in — register this user as the only allowed user.
    localStorage.setItem(REGISTERED_SUB_KEY, userInfo.sub);
  } else if (registeredSub !== userInfo.sub) {
    return {
      ok: false,
      error: "Access denied. Another user has already claimed this CMS.",
    };
  }

  sessionStorage.removeItem(PKCE_VERIFIER_KEY);
  sessionStorage.setItem(JWT_KEY, accessToken);
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Hosted UI userInfo — returns sub and email, or null on failure.
// The Cognito GetUser API does not accept tokens from federated (Google SSO)
// flows. The hosted UI /oauth2/userInfo endpoint handles both.
// ---------------------------------------------------------------------------

interface CognitoUserInfo {
  sub: string;
  email: string;
}

async function getCognitoUser(
  accessToken: string
): Promise<CognitoUserInfo | null> {
  try {
    const res = await fetch(`https://${HOSTED_DOMAIN}/oauth2/userInfo`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const sub: string = data?.sub ?? "";
    const email: string = data?.email ?? "";
    if (!sub) return null;
    return { sub, email };
  } catch {
    return null;
  }
}
