/**
 * src/hooks/useCampaigns.ts
 *
 * TanStack Query v5 hooks for Campaign CRUD, member management, invites,
 * and character assignment. Follows the exact patterns from useCharacter.ts.
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
  CampaignSummary,
  CampaignDetail,
  CampaignInvite,
  CreateCampaignInput,
  UpdateCampaignInput,
  CreateInviteInput,
  UpdateMemberRoleInput,
  AddCharacterInput,
} from "@/types/campaign";

// ─── Query keys ───────────────────────────────────────────────────────────────

export const campaignKeys = {
  all:    ["campaigns"] as const,
  lists:  () => [...campaignKeys.all, "list"] as const,
  detail: (id: string) => [...campaignKeys.all, "detail", id] as const,
};

// ─── useCampaigns ─────────────────────────────────────────────────────────────
// GET /campaigns — returns CampaignSummary[]

export function useCampaigns(): UseQueryResult<CampaignSummary[]> {
  return useQuery({
    queryKey: campaignKeys.lists(),
    queryFn:  () => apiClient.get<CampaignSummary[]>("/campaigns"),
    staleTime: 60_000,
  });
}

// ─── useCampaignDetail ────────────────────────────────────────────────────────
// GET /campaigns/{id} — returns CampaignDetail

export function useCampaignDetail(
  campaignId: string | undefined
): UseQueryResult<CampaignDetail> {
  return useQuery({
    queryKey: campaignKeys.detail(campaignId ?? ""),
    queryFn:  () => apiClient.get<CampaignDetail>(`/campaigns/${campaignId}`),
    enabled:  Boolean(campaignId),
    staleTime: 30_000,
  });
}

// ─── useCreateCampaign ────────────────────────────────────────────────────────
// POST /campaigns

export function useCreateCampaign(): UseMutationResult<
  CampaignSummary,
  Error,
  CreateCampaignInput
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateCampaignInput) =>
      apiClient.post<CampaignSummary>("/campaigns", input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: campaignKeys.lists() });
    },
  });
}

// ─── useUpdateCampaign ────────────────────────────────────────────────────────
// PATCH /campaigns/{id}

export function useUpdateCampaign(
  campaignId: string
): UseMutationResult<CampaignSummary, Error, UpdateCampaignInput> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (patch: UpdateCampaignInput) =>
      apiClient.patch<CampaignSummary>(`/campaigns/${campaignId}`, patch),
    onSuccess: (updated) => {
      // Optimistically update detail cache
      queryClient.setQueryData<CampaignDetail>(
        campaignKeys.detail(campaignId),
        (old) => (old ? { ...old, ...updated } : old)
      );
      queryClient.invalidateQueries({ queryKey: campaignKeys.lists() });
    },
  });
}

// ─── useDeleteCampaign ────────────────────────────────────────────────────────
// DELETE /campaigns/{id}

export function useDeleteCampaign(): UseMutationResult<void, Error, string> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (campaignId: string) =>
      apiClient.delete(`/campaigns/${campaignId}`),
    onSuccess: (_data, campaignId) => {
      queryClient.removeQueries({ queryKey: campaignKeys.detail(campaignId) });
      queryClient.invalidateQueries({ queryKey: campaignKeys.lists() });
    },
  });
}

// ─── useRemoveMember ──────────────────────────────────────────────────────────
// DELETE /campaigns/{id}/members/{userId}

export function useRemoveMember(
  campaignId: string
): UseMutationResult<void, Error, string> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) =>
      apiClient.delete(`/campaigns/${campaignId}/members/${userId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: campaignKeys.detail(campaignId) });
    },
  });
}

// ─── useUpdateMemberRole ──────────────────────────────────────────────────────
// PATCH /campaigns/{id}/members/{userId}

export function useUpdateMemberRole(
  campaignId: string
): UseMutationResult<void, Error, { userId: string } & UpdateMemberRoleInput> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, role }: { userId: string } & UpdateMemberRoleInput) =>
      apiClient.patch<void>(
        `/campaigns/${campaignId}/members/${userId}`,
        { role }
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: campaignKeys.detail(campaignId) });
    },
  });
}

// ─── useCreateInvite ──────────────────────────────────────────────────────────
// POST /campaigns/{id}/invites

export function useCreateInvite(
  campaignId: string
): UseMutationResult<CampaignInvite, Error, CreateInviteInput> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateInviteInput) =>
      apiClient.post<CampaignInvite>(`/campaigns/${campaignId}/invites`, input),
    onSuccess: () => {
      // Refresh the detail so the new invite appears in the list
      queryClient.invalidateQueries({ queryKey: campaignKeys.detail(campaignId) });
    },
  });
}

// ─── useRevokeInvite ──────────────────────────────────────────────────────────
// DELETE /campaigns/{id}/invites/{code}

export function useRevokeInvite(
  campaignId: string
): UseMutationResult<void, Error, string> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (inviteCode: string) =>
      apiClient.delete(`/campaigns/${campaignId}/invites/${inviteCode}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: campaignKeys.detail(campaignId) });
    },
  });
}

// ─── useAcceptInvite ──────────────────────────────────────────────────────────
// POST /invites/{code}/accept

export interface AcceptInviteResponse {
  joined: true;
  campaignId: string;
  role: "gm" | "player";
}

export function useAcceptInvite(): UseMutationResult<
  AcceptInviteResponse,
  Error,
  string
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (code: string) =>
      apiClient.post<AcceptInviteResponse>(`/invites/${code}/accept`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: campaignKeys.lists() });
    },
  });
}

// ─── useAddCharacterToCampaign ────────────────────────────────────────────────
// POST /campaigns/{id}/characters

export function useAddCharacterToCampaign(
  campaignId: string
): UseMutationResult<void, Error, AddCharacterInput> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: AddCharacterInput) =>
      apiClient.post<void>(`/campaigns/${campaignId}/characters`, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: campaignKeys.detail(campaignId) });
      queryClient.invalidateQueries({ queryKey: campaignKeys.lists() });
    },
  });
}

// ─── useRemoveCharacterFromCampaign ───────────────────────────────────────────
// DELETE /campaigns/{id}/characters/{charId}

export function useRemoveCharacterFromCampaign(
  campaignId: string
): UseMutationResult<void, Error, string> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (characterId: string) =>
      apiClient.delete(`/campaigns/${campaignId}/characters/${characterId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: campaignKeys.detail(campaignId) });
      queryClient.invalidateQueries({ queryKey: campaignKeys.lists() });
    },
  });
}

// ─── Pregen Types ─────────────────────────────────────────────────────────────

export interface PregenSummary {
  pregenId:      string;
  name:          string;
  className:     string;
  subclassName:  string | null;
  ancestryName:  string | null;
  communityName: string | null;
  domains:       string[];
  nativeLevel:   number;
}

export interface PregensResponse {
  pregens:          PregenSummary[];
  requiredLevel:    number | null;
  userHasCharacter: boolean;
}

export interface ImportPregenInput {
  pregenId: string;
  level?:   number;
}

export interface ImportPregenResponse {
  imported:    true;
  characterId: string;
  campaignId:  string;
  level:       number;
  pregenId:    string;
}

// ─── useCampaignPregens ───────────────────────────────────────────────────────
// GET /campaigns/{id}/pregens — list available pre-generated characters

export function useCampaignPregens(
  campaignId: string | undefined
): UseQueryResult<PregensResponse> {
  return useQuery({
    queryKey: [...campaignKeys.detail(campaignId ?? ""), "pregens"] as const,
    queryFn:  () => apiClient.get<PregensResponse>(`/campaigns/${campaignId}/pregens`),
    enabled:  Boolean(campaignId),
    staleTime: 30_000,
  });
}

// ─── useImportPregen ──────────────────────────────────────────────────────────
// POST /campaigns/{id}/pregens/import — import a pregen as a real character

export function useImportPregen(
  campaignId: string
): UseMutationResult<ImportPregenResponse, Error, ImportPregenInput> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: ImportPregenInput) =>
      apiClient.post<ImportPregenResponse>(`/campaigns/${campaignId}/pregens/import`, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: campaignKeys.detail(campaignId) });
      queryClient.invalidateQueries({ queryKey: campaignKeys.lists() });
      // Also invalidate the pregens list since one is now taken
      queryClient.invalidateQueries({
        queryKey: [...campaignKeys.detail(campaignId), "pregens"],
      });
    },
  });
}
