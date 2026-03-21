// src/lib/api.ts
// API client for CMS admin frontend.
// All protected calls include the JWT token stored in sessionStorage.

export interface CmsContent {
  id: string;
  type: "interstitial" | "splash";
  title: string;
  body: string;
  imageKey: string | null;
  imageUrl: string | null;
  active: boolean;
  order: number;
  createdAt: string;
  updatedAt: string;
}

const API_URL =
  process.env["NEXT_PUBLIC_API_URL"] ?? "";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem("cms_jwt");
}

async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
  requireAuth = true
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> | undefined),
  };

  if (requireAuth) {
    const token = getToken();
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  }

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  if (res.status === 204) return undefined as T;

  const json = await res.json();

  if (!res.ok) {
    const msg =
      json?.error?.message ?? `API error ${res.status}: ${res.statusText}`;
    throw new Error(msg);
  }

  return json.data as T;
}

// ─── Public ───────────────────────────────────────────────────────────────────

export async function getActiveItems(
  type: "interstitial" | "splash"
): Promise<CmsContent[]> {
  const data = await apiFetch<{ items: CmsContent[] }>(
    `/cms/${type}`,
    {},
    false
  );
  return data.items;
}

// ─── Admin (Protected) ────────────────────────────────────────────────────────

export async function getAllItems(
  type: "interstitial" | "splash"
): Promise<CmsContent[]> {
  const data = await apiFetch<{ items: CmsContent[] }>(`/cms/${type}/all`);
  return data.items;
}

export async function createItem(
  type: "interstitial" | "splash",
  payload: {
    title: string;
    body: string;
    imageKey: string | null;
    active: boolean;
    order: number;
  }
): Promise<CmsContent> {
  return apiFetch<CmsContent>(`/cms/${type}`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateItem(
  type: "interstitial" | "splash",
  id: string,
  payload: {
    title: string;
    body: string;
    imageKey: string | null;
    active: boolean;
    order: number;
  }
): Promise<CmsContent> {
  return apiFetch<CmsContent>(`/cms/${type}/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function deleteItem(
  type: "interstitial" | "splash",
  id: string
): Promise<void> {
  return apiFetch<void>(`/cms/${type}/${id}`, { method: "DELETE" });
}

export async function activateItem(
  type: "interstitial" | "splash",
  id: string
): Promise<CmsContent> {
  return apiFetch<CmsContent>(`/cms/${type}/${id}/activate`, {
    method: "POST",
    body: "{}",
  });
}

export async function deactivateItem(
  type: "interstitial" | "splash",
  id: string
): Promise<CmsContent> {
  return apiFetch<CmsContent>(`/cms/${type}/${id}/deactivate`, {
    method: "POST",
    body: "{}",
  });
}

// ─── Image Upload ─────────────────────────────────────────────────────────────

export interface PresignResult {
  uploadUrl: string;
  s3Key: string;
  imageKey: string;
  cdnUrl: string;
  expiresIn: number;
}

/**
 * Request a pre-signed S3 PUT URL for a CMS image.
 * After calling this, PUT the file directly to uploadUrl, then use imageKey
 * as the imageKey field on the CMS item.
 */
export async function requestPresignedUpload(
  filename: string,
  contentType: string
): Promise<PresignResult> {
  return apiFetch<PresignResult>("/cms/presign", {
    method: "POST",
    body: JSON.stringify({ filename, contentType }),
  });
}

/**
 * Upload a file directly to S3 using a pre-signed PUT URL.
 * Returns true on success, throws on failure.
 */
export async function uploadToS3(
  uploadUrl: string,
  file: File
): Promise<void> {
  const res = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": file.type },
    body: file,
  });
  if (!res.ok) {
    throw new Error(`S3 upload failed: ${res.status} ${res.statusText}`);
  }
}
