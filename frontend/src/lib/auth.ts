/**
 * src/lib/auth.ts
 *
 * Cognito auth helpers using amazon-cognito-identity-js.
 * All Cognito configuration is read from Next.js public env vars at runtime.
 * Every Cognito callback is wrapped in a Promise for clean async/await usage.
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

const USER_POOL_ID = process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID ?? "";
const CLIENT_ID    = process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID    ?? "";

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
