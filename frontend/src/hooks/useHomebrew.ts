/**
 * src/hooks/useHomebrew.ts
 *
 * TanStack Query v5 hooks for Homebrew content CRUD.
 * Follows the same patterns as useCampaigns.ts.
 *
 * API Routes (all JWT-protected):
 *   GET    /homebrew/mine                — list all homebrew by current user
 *   POST   /homebrew/parse               — preview: parse markdown without saving
 *   POST   /homebrew                     — create homebrew content
 *   GET    /homebrew/{contentType}/{id}   — get a single homebrew item
 *   PUT    /homebrew/{contentType}/{id}   — update a homebrew item
 *   DELETE /homebrew/{contentType}/{id}   — delete a homebrew item
 */

import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryResult,
  type UseMutationResult,
} from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import type {
  HomebrewContentType,
  HomebrewSummary,
  HomebrewMarkdownInput,
  ClassData,
  CommunityData,
  AncestryData,
  DomainCard,
  ValidationResult,
} from "@shared/types";

// ─── Query keys ───────────────────────────────────────────────────────────────

export const homebrewKeys = {
  all:    ["homebrew"] as const,
  mine:   () => [...homebrewKeys.all, "mine"] as const,
  detail: (contentType: HomebrewContentType, id: string) =>
    [...homebrewKeys.all, "detail", contentType, id] as const,
};

// ─── Types ────────────────────────────────────────────────────────────────────

/** Full homebrew item data as returned by the detail endpoint. */
export type HomebrewItemData = ClassData | CommunityData | AncestryData | DomainCard;

/** Response from the parse preview endpoint. */
export interface ParsePreviewResponse {
  data: HomebrewItemData;
  validation: ValidationResult;
}

/** Response from the create endpoint. */
export interface CreateHomebrewResponse {
  contentType: HomebrewContentType;
  pk: string;
  sk: string;
  name: string;
}

/** Input for updating an existing homebrew item. */
export interface UpdateHomebrewInput {
  contentType: HomebrewContentType;
  id: string;
  body: HomebrewMarkdownInput;
}

/** Input for deleting an existing homebrew item. */
export interface DeleteHomebrewInput {
  contentType: HomebrewContentType;
  id: string;
  /** Required for domainCard items — the domain this card belongs to. */
  domain?: string;
}

// ─── useHomebrewList ──────────────────────────────────────────────────────────
// GET /homebrew/mine — returns { items: HomebrewSummary[] }

interface HomebrewListResponse {
  items: HomebrewSummary[];
}

export function useHomebrewList(): UseQueryResult<HomebrewSummary[]> {
  return useQuery({
    queryKey: homebrewKeys.mine(),
    queryFn:  async () => {
      const res = await apiClient.get<HomebrewListResponse>("/homebrew/mine");
      return res.items;
    },
    staleTime: 60_000,
  });
}

// ─── useHomebrewDetail ────────────────────────────────────────────────────────
// GET /homebrew/{contentType}/{id} — returns the full data item

export function useHomebrewDetail(
  contentType: HomebrewContentType | undefined,
  id: string | undefined,
): UseQueryResult<HomebrewItemData> {
  return useQuery({
    queryKey: homebrewKeys.detail(contentType ?? "class", id ?? ""),
    queryFn:  () =>
      apiClient.get<HomebrewItemData>(`/homebrew/${contentType}/${id}`),
    enabled: Boolean(contentType) && Boolean(id),
    staleTime: 30_000,
  });
}

// ─── useParsePreview ──────────────────────────────────────────────────────────
// POST /homebrew/parse — parse markdown without saving, returns preview data

export function useParsePreview(): UseMutationResult<
  ParsePreviewResponse,
  Error,
  HomebrewMarkdownInput
> {
  return useMutation({
    mutationFn: (input: HomebrewMarkdownInput) =>
      apiClient.post<ParsePreviewResponse>("/homebrew/parse", input),
  });
}

// ─── useCreateHomebrew ────────────────────────────────────────────────────────
// POST /homebrew — create homebrew content (markdown input)

export function useCreateHomebrew(): UseMutationResult<
  CreateHomebrewResponse,
  Error,
  HomebrewMarkdownInput
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: HomebrewMarkdownInput) =>
      apiClient.post<CreateHomebrewResponse>("/homebrew", input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: homebrewKeys.mine() });
    },
  });
}

// ─── useUpdateHomebrew ────────────────────────────────────────────────────────
// PUT /homebrew/{contentType}/{id}

export function useUpdateHomebrew(): UseMutationResult<
  CreateHomebrewResponse,
  Error,
  UpdateHomebrewInput
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ contentType, id, body }: UpdateHomebrewInput) =>
      apiClient.put<CreateHomebrewResponse>(
        `/homebrew/${contentType}/${id}`,
        body,
      ),
    onSuccess: (_data, { contentType, id }) => {
      queryClient.invalidateQueries({
        queryKey: homebrewKeys.detail(contentType, id),
      });
      queryClient.invalidateQueries({ queryKey: homebrewKeys.mine() });
    },
  });
}

// ─── useDeleteHomebrew ────────────────────────────────────────────────────────
// DELETE /homebrew/{contentType}/{id}

export function useDeleteHomebrew(): UseMutationResult<
  void,
  Error,
  DeleteHomebrewInput
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ contentType, id, domain }: DeleteHomebrewInput) => {
      const domainParam = domain ? `?domain=${encodeURIComponent(domain)}` : "";
      return apiClient.delete(`/homebrew/${contentType}/${id}${domainParam}`);
    },
    onSuccess: (_data, { contentType, id }) => {
      queryClient.removeQueries({
        queryKey: homebrewKeys.detail(contentType, id),
      });
      queryClient.invalidateQueries({ queryKey: homebrewKeys.mine() });
    },
  });
}
