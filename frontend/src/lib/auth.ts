/**
 * src/lib/auth.ts
 *
 * Cognito auth helpers using amazon-cognito-identity-js.
 * All Cognito configuration is read from Next.js public env vars at runtime.
 * Every Cognito callback is wrapped in a Promise for clean async/await usage.
 *
 * Google SSO uses the PKCE authorization code flow via the Cognito Hosted UI.
 * After Google SSO the SDK has no local SRP session, so refresh is handled
 * via the Cognito /oauth2/token endpoint with grant_type=refresh_token.
 */

import {
  AuthenticationDetails,
  CognitoUser,
  CognitoUserAttribute,
  CognitoUserPool,
  CognitoUserSession,
  CognitoRefreshToken,
} from "amazon-cognito-identity-js";

// ─── Pool singleton ───────────────────────────────────────────────────────────

const USER_POOL_ID    = process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID    ?? "";
const CLIENT_ID       = process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID       ?? "";
const HOSTED_DOMAIN   = process.env.NEXT_PUBLIC_COGNITO_HOSTED_DOMAIN   ?? "";

// Keys for sessionStorage persistence of federated (Google SSO) tokens.
const FEDERATED_ID_TOKEN_KEY      = "dh_federated_id_token";
const FEDERATED_REFRESH_TOKEN_KEY = "dh_federated_refresh_token";
const FEDERATED_EXPIRY_KEY        = "dh_federated_expiry";
const PKCE_VERIFIER_KEY           = "dh_pkce_verifier";

let _userPool: CognitoUserPool | null = null;

function getUserPool(): CognitoUserPool {
  if (!_userPool) {
    if (!USER_POOL_ID || !CLIENT_ID) {
      throw new Error(
        "Cognito env vars not configured: " +
          "NEXT_PUBLIC_COGNITO_USER_POOL_ID and NEXT_PUBLIC_COGNITO_CLIENT_ID are required."
      );
    }
    _userPool = new CognitoUserPool({
      UserPoolId: USER_POOL_ID,
      ClientId: CLIENT_ID,
    });
  }
  return _userPool;
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AuthTokens {
  /** Cognito ID token — sent as Bearer to the API */
  idToken: string;
  accessToken: string;
  refreshToken: string;
  /** Seconds until the access token expires */
  expiresIn: number;
}

// ─── signIn ───────────────────────────────────────────────────────────────────

export function signIn(email: string, password: string): Promise<AuthTokens> {
  return new Promise((resolve, reject) => {
    const pool = getUserPool();
    const user = new CognitoUser({ Username: email, Pool: pool });
    const authDetails = new AuthenticationDetails({
      Username: email,
      Password: password,
    });

    user.authenticateUser(authDetails, {
      onSuccess(session: CognitoUserSession) {
        resolve({
          idToken:      session.getIdToken().getJwtToken(),
          accessToken:  session.getAccessToken().getJwtToken(),
          refreshToken: session.getRefreshToken().getToken(),
          expiresIn:
            session.getAccessToken().getExpiration() -
            Math.floor(Date.now() / 1000),
        });
      },
      onFailure(err: Error) {
        reject(err);
      },
      newPasswordRequired(_userAttributes, _requiredAttributes) {
        reject(
          new Error(
            "NEW_PASSWORD_REQUIRED: A new password must be set for this account."
          )
        );
      },
      mfaRequired(_challengeName, _challengeParameters) {
        reject(
          new Error("MFA_REQUIRED: MFA authentication is not yet supported.")
        );
      },
    });
  });
}

// ─── signUp ───────────────────────────────────────────────────────────────────

export function signUp(
  email: string,
  password: string,
  displayName: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    const pool = getUserPool();

    const attributeList: CognitoUserAttribute[] = [
      new CognitoUserAttribute({ Name: "email",               Value: email }),
      new CognitoUserAttribute({ Name: "name",                Value: displayName }),
      new CognitoUserAttribute({ Name: "custom:displayName",  Value: displayName }),
    ];

    pool.signUp(email, password, attributeList, [], (err) => {
      if (err) {
        reject(err);
        return;
      }
      resolve();
    });
  });
}

// ─── confirmSignUp ────────────────────────────────────────────────────────────

export function confirmSignUp(email: string, code: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const pool = getUserPool();
    const user = new CognitoUser({ Username: email, Pool: pool });

    user.confirmRegistration(code, true, (err) => {
      if (err) {
        reject(err);
        return;
      }
      resolve();
    });
  });
}

// ─── forgotPassword ───────────────────────────────────────────────────────────

export function requestPasswordReset(email: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const pool = getUserPool();
    const user = new CognitoUser({ Username: email, Pool: pool });

    user.forgotPassword({
      onSuccess() {
        resolve();
      },
      onFailure(err: Error) {
        reject(err);
      },
      inputVerificationCode() {
        resolve();
      },
    });
  });
}

export function confirmPasswordReset(
  email: string,
  code: string,
  newPassword: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    const pool = getUserPool();
    const user = new CognitoUser({ Username: email, Pool: pool });

    user.confirmPassword(code, newPassword, {
      onSuccess() {
        resolve();
      },
      onFailure(err: Error) {
        reject(err);
      },
    });
  });
}

// ─── signOut ──────────────────────────────────────────────────────────────────

export async function signOut(): Promise<void> {
  const pool = getUserPool();
  const currentUser = pool.getCurrentUser();
  if (currentUser) {
    currentUser.signOut();
  }
}

// ─── refreshTokens ────────────────────────────────────────────────────────────
// Retrieves the current session — Cognito SDK refreshes silently if needed.

export function refreshTokens(): Promise<AuthTokens | null> {
  return new Promise((resolve) => {
    let pool: CognitoUserPool;
    try {
      pool = getUserPool();
    } catch {
      resolve(null);
      return;
    }

    const currentUser = pool.getCurrentUser();
    if (!currentUser) {
      resolve(null);
      return;
    }

    currentUser.getSession(
      (err: Error | null, session: CognitoUserSession | null) => {
        if (err || !session || !session.isValid()) {
          // Try explicit refresh via the stored refresh token
          const refreshTokenStr = session?.getRefreshToken().getToken();
          if (!refreshTokenStr) {
            resolve(null);
            return;
          }

          const cognitoRefreshToken = new CognitoRefreshToken({
            RefreshToken: refreshTokenStr,
          });

          currentUser.refreshSession(cognitoRefreshToken, (refreshErr, newSession) => {
            if (refreshErr || !newSession) {
              resolve(null);
              return;
            }
            resolve({
              idToken:      newSession.getIdToken().getJwtToken(),
              accessToken:  newSession.getAccessToken().getJwtToken(),
              refreshToken: newSession.getRefreshToken().getToken(),
              expiresIn:
                newSession.getAccessToken().getExpiration() -
                Math.floor(Date.now() / 1000),
            });
          });
          return;
        }

        resolve({
          idToken:      session.getIdToken().getJwtToken(),
          accessToken:  session.getAccessToken().getJwtToken(),
          refreshToken: session.getRefreshToken().getToken(),
          expiresIn:
            session.getAccessToken().getExpiration() -
            Math.floor(Date.now() / 1000),
        });
      }
    );
  });
}

// ─── getIdToken ───────────────────────────────────────────────────────────────

export function getIdToken(): Promise<string | null> {
  return new Promise((resolve) => {
    let pool: CognitoUserPool;
    try {
      pool = getUserPool();
    } catch {
      resolve(null);
      return;
    }

    const currentUser = pool.getCurrentUser();
    if (!currentUser) {
      resolve(null);
      return;
    }

    currentUser.getSession(
      (err: Error | null, session: CognitoUserSession | null) => {
        if (err || !session || !session.isValid()) {
          resolve(null);
          return;
        }
        resolve(session.getIdToken().getJwtToken());
      }
    );
  });
}

// ─── getCurrentCognitoUser ────────────────────────────────────────────────────

export function getCurrentCognitoUser(): CognitoUser | null {
  try {
    return getUserPool().getCurrentUser();
  } catch {
    return null;
  }
}

// ─── Google SSO (PKCE Authorization Code Flow) ───────────────────────────────

// PKCE helpers ----------------------------------------------------------------

function base64UrlEncode(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(buf))))
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

// Federated session helpers ---------------------------------------------------

/** Returns true when the user authenticated via Google SSO (not SRP). */
export function isFederatedSession(): boolean {
  if (typeof window === "undefined") return false;
  return !!sessionStorage.getItem(FEDERATED_ID_TOKEN_KEY);
}

/** Store tokens obtained from a federated (Google) sign-in. */
function storeFederatedTokens(
  idToken: string,
  refreshToken: string,
  expiresIn: number,
): void {
  sessionStorage.setItem(FEDERATED_ID_TOKEN_KEY, idToken);
  sessionStorage.setItem(FEDERATED_REFRESH_TOKEN_KEY, refreshToken);
  sessionStorage.setItem(
    FEDERATED_EXPIRY_KEY,
    String(Math.floor(Date.now() / 1000) + expiresIn),
  );
}

/** Clear federated session state. */
function clearFederatedTokens(): void {
  sessionStorage.removeItem(FEDERATED_ID_TOKEN_KEY);
  sessionStorage.removeItem(FEDERATED_REFRESH_TOKEN_KEY);
  sessionStorage.removeItem(FEDERATED_EXPIRY_KEY);
  sessionStorage.removeItem(PKCE_VERIFIER_KEY);
}

/** Read the cached federated ID token, or null if expired / missing. */
export function getFederatedIdToken(): string | null {
  if (typeof window === "undefined") return null;
  const token = sessionStorage.getItem(FEDERATED_ID_TOKEN_KEY);
  if (!token) return null;
  const expiry = Number(sessionStorage.getItem(FEDERATED_EXPIRY_KEY) ?? "0");
  // Consider expired 60 s before real expiry to give a buffer for refresh.
  if (Math.floor(Date.now() / 1000) >= expiry - 60) return null;
  return token;
}

// Redirect to Google via Cognito Hosted UI ------------------------------------

/**
 * Begins the Google SSO flow by redirecting the user to the Cognito Hosted UI
 * with the Google identity provider pre-selected.
 *
 * Pass the caller's current `idToken` (from the auth store) so that an
 * existing SRP session in the same tab is detected and reused without
 * launching a redundant OAuth round-trip.
 *
 * Returns `"reused"` when a valid session already exists (the caller should
 * redirect to the dashboard instead of waiting for a new OAuth round-trip).
 * Returns `"redirecting"` when the browser is being sent to Google.
 */
export async function startGoogleLogin(
  existingStoreToken?: string | null,
): Promise<"reused" | "redirecting"> {
  if (!HOSTED_DOMAIN || !CLIENT_ID) {
    throw new Error(
      "Google SSO is not configured: " +
        "NEXT_PUBLIC_COGNITO_HOSTED_DOMAIN and NEXT_PUBLIC_COGNITO_CLIENT_ID are required.",
    );
  }

  // If the store already holds a valid token (e.g. the user is logged in via
  // SRP in this tab, or a federated token was loaded during initialize()),
  // skip the OAuth redirect entirely.
  if (existingStoreToken) {
    return "reused";
  }

  // Also check sessionStorage for a live federated token (covers the case
  // where the user opened a second tab without the store being hydrated yet).
  const existingToken = getFederatedIdToken();
  if (existingToken) {
    return "reused";
  }

  const verifier = await generateCodeVerifier();
  const challenge = await generateCodeChallenge(verifier);
  sessionStorage.setItem(PKCE_VERIFIER_KEY, verifier);

  const callbackUrl = `${window.location.origin}/auth/callback`;

  const params = new URLSearchParams({
    response_type: "code",
    client_id: CLIENT_ID,
    redirect_uri: callbackUrl,
    scope: "email openid profile",
    code_challenge_method: "S256",
    code_challenge: challenge,
    identity_provider: "Google",
  });

  window.location.assign(
    `https://${HOSTED_DOMAIN}/oauth2/authorize?${params}`,
  );
  return "redirecting";
}

// Exchange authorization code for tokens (called from /auth/callback) ---------

export interface GoogleCallbackResult {
  ok: boolean;
  tokens?: AuthTokens;
  error?: string;
}

/**
 * Exchanges the authorization code returned by Cognito for ID, access and
 * refresh tokens. Stores the federated tokens in sessionStorage for later
 * refresh.
 */
export async function handleGoogleCallback(
  code: string,
): Promise<GoogleCallbackResult> {
  const verifier = sessionStorage.getItem(PKCE_VERIFIER_KEY);
  if (!verifier) {
    return {
      ok: false,
      error: "Missing PKCE verifier. Please try signing in again.",
    };
  }

  const callbackUrl = `${window.location.origin}/auth/callback`;

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
    console.error("[auth] Google token exchange failed:", text);
    return { ok: false, error: "Token exchange failed. Please try again." };
  }

  const data = await res.json();
  const idToken: string | undefined = data.id_token;
  const accessToken: string | undefined = data.access_token;
  const fedRefreshToken: string | undefined = data.refresh_token;
  const expiresIn: number = data.expires_in ?? 3600;

  if (!idToken || !accessToken) {
    return { ok: false, error: "No tokens in response." };
  }

  // Persist federated tokens so we can refresh later.
  storeFederatedTokens(idToken, fedRefreshToken ?? "", expiresIn);
  sessionStorage.removeItem(PKCE_VERIFIER_KEY);

  return {
    ok: true,
    tokens: {
      idToken,
      accessToken,
      refreshToken: fedRefreshToken ?? "",
      expiresIn,
    },
  };
}

// Refresh federated tokens via Cognito /oauth2/token --------------------------

/**
 * Refreshes a federated (Google SSO) session using the stored refresh token.
 * Returns new AuthTokens or null if refresh is not possible.
 */
export async function refreshFederatedTokens(): Promise<AuthTokens | null> {
  if (typeof window === "undefined") return null;
  const storedRefresh = sessionStorage.getItem(FEDERATED_REFRESH_TOKEN_KEY);
  if (!storedRefresh || !HOSTED_DOMAIN || !CLIENT_ID) return null;

  const body = new URLSearchParams({
    grant_type: "refresh_token",
    client_id: CLIENT_ID,
    refresh_token: storedRefresh,
  });

  let res: Response;
  try {
    res = await fetch(`https://${HOSTED_DOMAIN}/oauth2/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });
  } catch {
    return null;
  }

  if (!res.ok) return null;

  const data = await res.json();
  const idToken: string | undefined = data.id_token;
  const accessToken: string | undefined = data.access_token;
  const expiresIn: number = data.expires_in ?? 3600;

  if (!idToken || !accessToken) return null;

  // Cognito refresh_token grant does not return a new refresh_token — the
  // original stays valid. Update the cached id token and expiry only.
  storeFederatedTokens(idToken, storedRefresh, expiresIn);

  return {
    idToken,
    accessToken,
    refreshToken: storedRefresh,
    expiresIn,
  };
}

// Sign-out cleanup for federated sessions ------------------------------------

/** Clears both SRP-based and federated session state. */
export async function signOutFederated(): Promise<void> {
  clearFederatedTokens();
  // Also sign out the SRP session in case it exists.
  await signOut();
}
