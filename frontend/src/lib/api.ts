/**
 * src/lib/api.ts
 *
 * Typed API client for the Daggerheart Character Platform.
 * - Attaches Cognito id-token as a Bearer header automatically.
 * - On 401, refreshes the token once and retries the original request.
 * - Unwraps the { data, meta } success envelope or throws a typed ApiError.
 * - Token handlers are registered by the auth store to avoid circular imports.
 */

import type { ApiError as ApiErrorBody } from "@shared/types";

// ─── Base URL ────────────────────────────────────────────────────────────────

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

// ─── Typed error class ───────────────────────────────────────────────────────

export class ApiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details?: ApiErrorBody["error"]["details"];

  constructor(
    status: number,
    code: string,
    message: string,
    details?: ApiErrorBody["error"]["details"]
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

// ─── Token handler registration ──────────────────────────────────────────────
// The auth store calls registerTokenHandlers once during initialization.
// This pattern breaks the circular dependency that would arise if api.ts
// imported the store directly.

let getToken: (() => string | null) | null = null;
let doRefresh: (() => Promise<string | null>) | null = null;

export function registerTokenHandlers(
  tokenGetter: () => string | null,
  tokenRefresher: () => Promise<string | null>
): void {
  getToken = tokenGetter;
  doRefresh = tokenRefresher;
}

// ─── Internal fetch wrapper ───────────────────────────────────────────────────

interface RequestOptions {
  method: string;
  path: string;
  body?: unknown;
  /** True when this is a retry after a 401/refresh cycle — prevents infinite loops. */
  isRetry?: boolean;
}

async function request<T>(opts: RequestOptions): Promise<T> {
  const { method, path, body, isRetry = false } = opts;

  // Build headers
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };

  const token = getToken?.() ?? null;
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const url = `${API_BASE_URL}${path}`;

  const response = await fetch(url, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  // ── 401 handling: refresh once, then retry ───────────────────────────────
  if (response.status === 401 && !isRetry && doRefresh) {
    let newToken: string | null = null;
    try {
      newToken = await doRefresh();
    } catch {
      throw new ApiError(401, "UNAUTHORIZED", "Session expired. Please sign in again.");
    }
    if (!newToken) {
      throw new ApiError(401, "UNAUTHORIZED", "Session expired. Please sign in again.");
    }
    return request<T>({ ...opts, isRetry: true });
  }

  // ── 204 No Content ───────────────────────────────────────────────────────
  if (response.status === 204) {
    return undefined as unknown as T;
  }

  // ── Parse JSON ───────────────────────────────────────────────────────────
  let json: unknown;
  try {
    json = await response.json();
  } catch {
    throw new ApiError(
      response.status,
      "PARSE_ERROR",
      `Server returned non-JSON response for ${method} ${path} (HTTP ${response.status})`
    );
  }

  // ── Error envelope ───────────────────────────────────────────────────────
  if (!response.ok) {
    const errBody = json as ApiErrorBody;
    throw new ApiError(
      response.status,
      errBody?.error?.code ?? "UNKNOWN_ERROR",
      errBody?.error?.message ?? "An unexpected error occurred.",
      errBody?.error?.details
    );
  }

  // ── Unwrap success envelope: { data: T, meta: { ... } } ─────────────────
  const successBody = json as { data: T };
  return successBody.data;
}

// ─── Public API client ────────────────────────────────────────────────────────

class ApiClient {
  get<T>(path: string): Promise<T> {
    return request<T>({ method: "GET", path });
  }

  post<T>(path: string, body?: unknown): Promise<T> {
    return request<T>({ method: "POST", path, body });
  }

  put<T>(path: string, body?: unknown): Promise<T> {
    return request<T>({ method: "PUT", path, body });
  }

  patch<T>(path: string, body?: unknown): Promise<T> {
    return request<T>({ method: "PATCH", path, body });
  }

  delete(path: string): Promise<void> {
    return request<void>({ method: "DELETE", path });
  }
}

export const apiClient = new ApiClient();
