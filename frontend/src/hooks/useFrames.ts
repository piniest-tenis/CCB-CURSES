/**
 * src/hooks/useFrames.ts
 *
 * TanStack Query v5 hooks for Campaign Frames CRUD, content management,
 * restrictions, extensions, campaign attachment, and conflict resolution.
 * Follows the same patterns as useCampaigns.ts and useHomebrew.ts.
 *
 * API Routes (all JWT-protected):
 *   GET    /frames                                                — list caller's frames
 *   POST   /frames                                                — create a frame
 *   GET    /frames/{frameId}                                      — get frame detail
 *   PATCH  /frames/{frameId}                                      — update frame metadata
 *   DELETE /frames/{frameId}                                      — delete a frame
 *   POST   /frames/{frameId}/contents                             — add content ref
 *   DELETE /frames/{frameId}/contents/{contentType}/{contentId}   — remove content ref
 *   POST   /frames/{frameId}/restrictions                         — add SRD restriction
 *   PUT    /frames/{frameId}/restrictions/{contentType}/{contentId} — update restriction
 *   DELETE /frames/{frameId}/restrictions/{contentType}/{contentId} — remove restriction
 *   POST   /frames/{frameId}/extensions                           — add custom type extension
 *   PUT    /frames/{frameId}/extensions/{extensionType}/{slug}    — update extension
 *   DELETE /frames/{frameId}/extensions/{extensionType}/{slug}    — remove extension
 *   POST   /campaigns/{campaignId}/frames                         — attach frame to campaign
 *   GET    /campaigns/{campaignId}/frames                         — list campaign frames
 *   DELETE /campaigns/{campaignId}/frames/{frameId}               — detach frame
 *   GET    /campaigns/{campaignId}/conflicts                      — list conflicts
 *   POST   /campaigns/{campaignId}/conflicts                      — resolve a conflict
 *   DELETE /campaigns/{campaignId}/conflicts/{contentType}/{contentName} — delete resolution
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
  CampaignFrameSummary,
  CampaignFrameDetail,
  CampaignFrameAttachment,
  CampaignConflictResolution,
  CreateCampaignFrameInput,
  UpdateCampaignFrameInput,
  AddFrameContentInput,
  AddFrameRestrictionInput,
  AddFrameExtensionInput,
  AttachFrameToCampaignInput,
  ResolveConflictInput,
  FrameRestriction,
  FrameExtension,
} from "@shared/types";
import { campaignKeys } from "./useCampaigns";

// ─── Query keys ───────────────────────────────────────────────────────────────

export const frameKeys = {
  all:             ["frames"] as const,
  lists:           () => [...frameKeys.all, "list"] as const,
  detail:          (id: string) => [...frameKeys.all, "detail", id] as const,
  campaignFrames:  (campaignId: string) =>
    [...frameKeys.all, "campaign", campaignId] as const,
  campaignConflicts: (campaignId: string) =>
    [...frameKeys.all, "conflicts", campaignId] as const,
};

// ─── Frame CRUD ───────────────────────────────────────────────────────────────

// GET /frames — returns CampaignFrameSummary[]
export function useFrames(): UseQueryResult<CampaignFrameSummary[]> {
  return useQuery({
    queryKey: frameKeys.lists(),
    queryFn:  () => apiClient.get<CampaignFrameSummary[]>("/frames"),
    staleTime: 60_000,
  });
}

// GET /frames/{frameId} — returns CampaignFrameDetail
export function useFrameDetail(
  frameId: string | undefined,
): UseQueryResult<CampaignFrameDetail> {
  return useQuery({
    queryKey: frameKeys.detail(frameId ?? ""),
    queryFn:  () => apiClient.get<CampaignFrameDetail>(`/frames/${frameId}`),
    enabled:  Boolean(frameId),
    staleTime: 30_000,
  });
}

// POST /frames
export function useCreateFrame(): UseMutationResult<
  CampaignFrameSummary,
  Error,
  CreateCampaignFrameInput
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateCampaignFrameInput) =>
      apiClient.post<CampaignFrameSummary>("/frames", input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: frameKeys.lists() });
    },
  });
}

// PATCH /frames/{frameId}
export function useUpdateFrame(
  frameId: string,
): UseMutationResult<CampaignFrameSummary, Error, UpdateCampaignFrameInput> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (patch: UpdateCampaignFrameInput) =>
      apiClient.patch<CampaignFrameSummary>(`/frames/${frameId}`, patch),
    onSuccess: (updated) => {
      queryClient.setQueryData<CampaignFrameDetail>(
        frameKeys.detail(frameId),
        (old) => (old ? { ...old, ...updated } : old),
      );
      queryClient.invalidateQueries({ queryKey: frameKeys.lists() });
    },
  });
}

// DELETE /frames/{frameId}
export function useDeleteFrame(): UseMutationResult<void, Error, string> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (frameId: string) =>
      apiClient.delete(`/frames/${frameId}`),
    onSuccess: (_data, frameId) => {
      queryClient.removeQueries({ queryKey: frameKeys.detail(frameId) });
      queryClient.invalidateQueries({ queryKey: frameKeys.lists() });
    },
  });
}

// ─── Frame Content Refs ───────────────────────────────────────────────────────

// POST /frames/{frameId}/contents
export function useAddFrameContent(
  frameId: string,
): UseMutationResult<void, Error, AddFrameContentInput> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: AddFrameContentInput) =>
      apiClient.post<void>(`/frames/${frameId}/contents`, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: frameKeys.detail(frameId) });
    },
  });
}

// DELETE /frames/{frameId}/contents/{contentType}/{contentId}
export interface RemoveFrameContentInput {
  contentType: string;
  contentId: string;
}

export function useRemoveFrameContent(
  frameId: string,
): UseMutationResult<void, Error, RemoveFrameContentInput> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ contentType, contentId }: RemoveFrameContentInput) =>
      apiClient.delete(
        `/frames/${frameId}/contents/${contentType}/${contentId}`,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: frameKeys.detail(frameId) });
    },
  });
}

// ─── Frame Restrictions ───────────────────────────────────────────────────────

// POST /frames/{frameId}/restrictions
export function useAddFrameRestriction(
  frameId: string,
): UseMutationResult<void, Error, AddFrameRestrictionInput> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: AddFrameRestrictionInput) =>
      apiClient.post<void>(`/frames/${frameId}/restrictions`, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: frameKeys.detail(frameId) });
    },
  });
}

// PUT /frames/{frameId}/restrictions/{contentType}/{contentId}
export interface UpdateRestrictionInput {
  contentType: string;
  contentId: string;
  body: Partial<Pick<FrameRestriction, "mode" | "alterationNotes" | "alterationData">>;
}

export function useUpdateFrameRestriction(
  frameId: string,
): UseMutationResult<void, Error, UpdateRestrictionInput> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ contentType, contentId, body }: UpdateRestrictionInput) =>
      apiClient.put<void>(
        `/frames/${frameId}/restrictions/${contentType}/${contentId}`,
        body,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: frameKeys.detail(frameId) });
    },
  });
}

// DELETE /frames/{frameId}/restrictions/{contentType}/{contentId}
export interface RemoveFrameRestrictionInput {
  contentType: string;
  contentId: string;
}

export function useRemoveFrameRestriction(
  frameId: string,
): UseMutationResult<void, Error, RemoveFrameRestrictionInput> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ contentType, contentId }: RemoveFrameRestrictionInput) =>
      apiClient.delete(
        `/frames/${frameId}/restrictions/${contentType}/${contentId}`,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: frameKeys.detail(frameId) });
    },
  });
}

// ─── Frame Extensions ─────────────────────────────────────────────────────────

// POST /frames/{frameId}/extensions
export function useAddFrameExtension(
  frameId: string,
): UseMutationResult<void, Error, AddFrameExtensionInput> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: AddFrameExtensionInput) =>
      apiClient.post<void>(`/frames/${frameId}/extensions`, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: frameKeys.detail(frameId) });
    },
  });
}

// PUT /frames/{frameId}/extensions/{extensionType}/{slug}
export interface UpdateExtensionInput {
  extensionType: string;
  slug: string;
  body: Partial<Pick<FrameExtension, "name" | "description" | "data">>;
}

export function useUpdateFrameExtension(
  frameId: string,
): UseMutationResult<void, Error, UpdateExtensionInput> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ extensionType, slug, body }: UpdateExtensionInput) =>
      apiClient.put<void>(
        `/frames/${frameId}/extensions/${extensionType}/${slug}`,
        body,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: frameKeys.detail(frameId) });
    },
  });
}

// DELETE /frames/{frameId}/extensions/{extensionType}/{slug}
export interface RemoveFrameExtensionInput {
  extensionType: string;
  slug: string;
}

export function useRemoveFrameExtension(
  frameId: string,
): UseMutationResult<void, Error, RemoveFrameExtensionInput> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ extensionType, slug }: RemoveFrameExtensionInput) =>
      apiClient.delete(
        `/frames/${frameId}/extensions/${extensionType}/${slug}`,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: frameKeys.detail(frameId) });
    },
  });
}

// ─── Campaign Frame Attachment ────────────────────────────────────────────────

// GET /campaigns/{campaignId}/frames
export function useCampaignFrames(
  campaignId: string | undefined,
): UseQueryResult<CampaignFrameAttachment[]> {
  return useQuery({
    queryKey: frameKeys.campaignFrames(campaignId ?? ""),
    queryFn:  () =>
      apiClient.get<CampaignFrameAttachment[]>(
        `/campaigns/${campaignId}/frames`,
      ),
    enabled: Boolean(campaignId),
    staleTime: 30_000,
  });
}

/** Response from attach endpoint when conflicts are detected. */
export interface AttachFrameResponse {
  attached: true;
  conflicts?: Array<{
    contentType: string;
    contentName: string;
    competingFrameIds: string[];
  }>;
}

// POST /campaigns/{campaignId}/frames
export function useAttachFrame(
  campaignId: string,
): UseMutationResult<AttachFrameResponse, Error, AttachFrameToCampaignInput> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: AttachFrameToCampaignInput) =>
      apiClient.post<AttachFrameResponse>(
        `/campaigns/${campaignId}/frames`,
        input,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: frameKeys.campaignFrames(campaignId),
      });
      queryClient.invalidateQueries({
        queryKey: frameKeys.campaignConflicts(campaignId),
      });
      queryClient.invalidateQueries({
        queryKey: campaignKeys.detail(campaignId),
      });
    },
  });
}

// DELETE /campaigns/{campaignId}/frames/{frameId}
export function useDetachFrame(
  campaignId: string,
): UseMutationResult<void, Error, string> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (frameId: string) =>
      apiClient.delete(`/campaigns/${campaignId}/frames/${frameId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: frameKeys.campaignFrames(campaignId),
      });
      queryClient.invalidateQueries({
        queryKey: frameKeys.campaignConflicts(campaignId),
      });
      queryClient.invalidateQueries({
        queryKey: campaignKeys.detail(campaignId),
      });
    },
  });
}

// ─── Conflict Resolution ──────────────────────────────────────────────────────

// GET /campaigns/{campaignId}/conflicts
export function useCampaignConflicts(
  campaignId: string | undefined,
): UseQueryResult<CampaignConflictResolution[]> {
  return useQuery({
    queryKey: frameKeys.campaignConflicts(campaignId ?? ""),
    queryFn:  () =>
      apiClient.get<CampaignConflictResolution[]>(
        `/campaigns/${campaignId}/conflicts`,
      ),
    enabled: Boolean(campaignId),
    staleTime: 30_000,
  });
}

// POST /campaigns/{campaignId}/conflicts
export function useResolveConflict(
  campaignId: string,
): UseMutationResult<void, Error, ResolveConflictInput> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: ResolveConflictInput) =>
      apiClient.post<void>(`/campaigns/${campaignId}/conflicts`, input),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: frameKeys.campaignConflicts(campaignId),
      });
    },
  });
}

// DELETE /campaigns/{campaignId}/conflicts/{contentType}/{contentName}
export interface DeleteConflictInput {
  contentType: string;
  contentName: string;
}

export function useDeleteConflictResolution(
  campaignId: string,
): UseMutationResult<void, Error, DeleteConflictInput> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ contentType, contentName }: DeleteConflictInput) =>
      apiClient.delete(
        `/campaigns/${campaignId}/conflicts/${contentType}/${encodeURIComponent(contentName)}`,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: frameKeys.campaignConflicts(campaignId),
      });
    },
  });
}
