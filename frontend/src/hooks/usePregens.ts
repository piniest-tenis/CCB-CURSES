/**
 * src/hooks/usePregens.ts
 *
 * TanStack Query v5 hooks for Pre-generated Character management:
 *   - Admin: system-wide CRUD
 *   - User (GM): personal pregen CRUD
 *   - Campaign pool: associate/list/remove pregens from a campaign
 */

import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryResult,
  type UseMutationResult,
} from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import { campaignKeys } from "./useCampaigns";
import type { Character } from "@shared/types";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PregenManagementSummary {
  pregenId: string;
  scope: "system" | "user";
  ownerId: string | null;
  name: string;
  className: string;
  subclassName: string | null;
  ancestryName: string | null;
  communityName: string | null;
  domains: string[];
  nativeLevel: number;
  createdAt: string;
  updatedAt: string;
}

export interface PregenDetail extends PregenManagementSummary {
  character: Character;
}

export interface CreatePregenInput {
  character: Character;
}

export interface AddToPoolInput {
  pregenId: string;
  source: "system" | "user";
  ownerId?: string;
}

export interface CampaignPoolPregen extends PregenManagementSummary {
  addedAt: string;
}

// ─── Query Keys ───────────────────────────────────────────────────────────────

export const pregenKeys = {
  all: ["pregens"] as const,
  admin: () => [...pregenKeys.all, "admin"] as const,
  adminDetail: (id: string) => [...pregenKeys.all, "admin", id] as const,
  user: () => [...pregenKeys.all, "user"] as const,
  userDetail: (id: string) => [...pregenKeys.all, "user", id] as const,
  campaignPool: (campaignId: string) =>
    [...pregenKeys.all, "pool", campaignId] as const,
};

// ═══════════════════════════════════════════════════════════════════════════════
// Admin — System-wide Pregens
// ═══════════════════════════════════════════════════════════════════════════════

export function useAdminPregens(): UseQueryResult<{
  pregens: PregenManagementSummary[];
}> {
  return useQuery({
    queryKey: pregenKeys.admin(),
    queryFn: () =>
      apiClient.get<{ pregens: PregenManagementSummary[] }>("/admin/pregens"),
    staleTime: 60_000,
  });
}

export function useAdminPregenDetail(
  pregenId: string | undefined
): UseQueryResult<{ pregen: PregenDetail }> {
  return useQuery({
    queryKey: pregenKeys.adminDetail(pregenId ?? ""),
    queryFn: () =>
      apiClient.get<{ pregen: PregenDetail }>(`/admin/pregens/${pregenId}`),
    enabled: Boolean(pregenId),
    staleTime: 30_000,
  });
}

export function useCreateAdminPregen(): UseMutationResult<
  { pregen: PregenManagementSummary },
  Error,
  CreatePregenInput
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreatePregenInput) =>
      apiClient.post<{ pregen: PregenManagementSummary }>(
        "/admin/pregens",
        input
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: pregenKeys.admin() });
    },
  });
}

export function useDeleteAdminPregen(): UseMutationResult<
  void,
  Error,
  string
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (pregenId: string) =>
      apiClient.delete(`/admin/pregens/${pregenId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: pregenKeys.admin() });
    },
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// User — GM-scoped Pregens
// ═══════════════════════════════════════════════════════════════════════════════

export function useUserPregens(): UseQueryResult<{
  pregens: PregenManagementSummary[];
}> {
  return useQuery({
    queryKey: pregenKeys.user(),
    queryFn: () =>
      apiClient.get<{ pregens: PregenManagementSummary[] }>("/pregens"),
    staleTime: 60_000,
  });
}

export function useUserPregenDetail(
  pregenId: string | undefined
): UseQueryResult<{ pregen: PregenDetail }> {
  return useQuery({
    queryKey: pregenKeys.userDetail(pregenId ?? ""),
    queryFn: () =>
      apiClient.get<{ pregen: PregenDetail }>(`/pregens/${pregenId}`),
    enabled: Boolean(pregenId),
    staleTime: 30_000,
  });
}

export function useCreateUserPregen(): UseMutationResult<
  { pregen: PregenManagementSummary },
  Error,
  CreatePregenInput
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreatePregenInput) =>
      apiClient.post<{ pregen: PregenManagementSummary }>("/pregens", input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: pregenKeys.user() });
    },
  });
}

export function useDeleteUserPregen(): UseMutationResult<
  void,
  Error,
  string
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (pregenId: string) =>
      apiClient.delete(`/pregens/${pregenId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: pregenKeys.user() });
    },
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// Campaign Pool — Associate pregens with a campaign
// ═══════════════════════════════════════════════════════════════════════════════

export function useCampaignPregenPool(
  campaignId: string | undefined
): UseQueryResult<{ pregens: CampaignPoolPregen[]; campaignId: string }> {
  return useQuery({
    queryKey: pregenKeys.campaignPool(campaignId ?? ""),
    queryFn: () =>
      apiClient.get<{ pregens: CampaignPoolPregen[]; campaignId: string }>(
        `/campaigns/${campaignId}/pregens/pool`
      ),
    enabled: Boolean(campaignId),
    staleTime: 30_000,
  });
}

export function useAddToPregenPool(
  campaignId: string
): UseMutationResult<
  { added: true; pregenId: string; campaignId: string; source: string },
  Error,
  AddToPoolInput
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: AddToPoolInput) =>
      apiClient.post<{
        added: true;
        pregenId: string;
        campaignId: string;
        source: string;
      }>(`/campaigns/${campaignId}/pregens/pool`, input),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: pregenKeys.campaignPool(campaignId),
      });
      // Also invalidate the player-facing pregen list
      queryClient.invalidateQueries({
        queryKey: [...campaignKeys.detail(campaignId), "pregens"],
      });
    },
  });
}

export function useRemoveFromPregenPool(
  campaignId: string
): UseMutationResult<void, Error, string> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (pregenId: string) =>
      apiClient.delete(
        `/campaigns/${campaignId}/pregens/pool/${pregenId}`
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: pregenKeys.campaignPool(campaignId),
      });
      queryClient.invalidateQueries({
        queryKey: [...campaignKeys.detail(campaignId), "pregens"],
      });
    },
  });
}
