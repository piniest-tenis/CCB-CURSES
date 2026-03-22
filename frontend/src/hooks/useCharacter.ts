/**
 * src/hooks/useCharacter.ts
 *
 * TanStack Query v5 hooks for character CRUD and rest operations.
 * All mutations invalidate or update relevant query caches automatically.
 */

import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryResult,
  type UseMutationResult,
} from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import { useCharacterStore } from "@/store/characterStore";
import type { Character, CharacterSummary, LevelUpChoices } from "@shared/types";

// ─── Query keys ───────────────────────────────────────────────────────────────

export const characterKeys = {
  all:    ["characters"] as const,
  lists:  () => [...characterKeys.all, "list"] as const,
  list:   (params: CharacterListParams) =>
    [...characterKeys.lists(), params] as const,
  detail: (id: string) =>
    [...characterKeys.all, "detail", id] as const,
};

// ─── Input / response types ───────────────────────────────────────────────────

export interface CharacterListParams {
  limit?:  number;
  cursor?: string;
}

export interface CharacterListData {
  characters: CharacterSummary[];
  cursor: string | null;
}

export interface CreateCharacterInput {
  name:         string;
  classId?:     string;
  subclassId?:  string;
  communityId?: string;
  ancestryId?:  string;
  level?:       number;
  experiences?: Array<{ name: string; bonus: number }>;
}

// ─── useCharacters ────────────────────────────────────────────────────────────

export function useCharacters(
  params?: CharacterListParams
): UseQueryResult<CharacterListData> {
  const searchParams = new URLSearchParams();
  if (params?.limit  !== undefined) searchParams.set("limit",  String(params.limit));
  if (params?.cursor !== undefined) searchParams.set("cursor", params.cursor);
  const qs = searchParams.toString();

  return useQuery({
    queryKey: params ? characterKeys.list(params) : characterKeys.lists(),
    queryFn:  () =>
      apiClient.get<CharacterListData>(
        qs ? `/characters?${qs}` : "/characters"
      ),
    staleTime: 60_000,
  });
}

// ─── useCharacter ─────────────────────────────────────────────────────────────

export function useCharacter(
  characterId: string | undefined
): UseQueryResult<Character> {
  return useQuery({
    queryKey: characterKeys.detail(characterId ?? ""),
    queryFn:  () => apiClient.get<Character>(`/characters/${characterId}`),
    enabled:  Boolean(characterId),
    staleTime: 30_000,
  });
}

// ─── useCreateCharacter ───────────────────────────────────────────────────────

export function useCreateCharacter(): UseMutationResult<
  Character,
  Error,
  CreateCharacterInput
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateCharacterInput) =>
      apiClient.post<Character>("/characters", input),
    onSuccess: () => {
      // Invalidate all character lists so the new character appears
      queryClient.invalidateQueries({ queryKey: characterKeys.lists() });
    },
  });
}

// ─── useUpdateCharacter ───────────────────────────────────────────────────────

export function useUpdateCharacter(
  characterId: string
): UseMutationResult<Character, Error, Partial<Character>> {
  const queryClient = useQueryClient();
  const { setCharacter } = useCharacterStore();

  return useMutation({
    mutationFn: (patch: Partial<Character>) =>
      apiClient.patch<Character>(`/characters/${characterId}`, patch),
    onSuccess: (updated) => {
      // Update the detail cache directly (no refetch needed)
      queryClient.setQueryData(characterKeys.detail(characterId), updated);
      // Sync Zustand store with authoritative server state so the active
      // character sheet reflects the saved version and isDirty is cleared.
      // Without this, the useEffect([character, setCharacter]) in
      // CharacterSheet.tsx could overwrite concurrent changes (e.g. portrait
      // upload) when the stale TanStack cache propagates back to the store.
      setCharacter(updated);
      // Invalidate the list so the updatedAt timestamp refreshes
      queryClient.invalidateQueries({ queryKey: characterKeys.lists() });
    },
  });
}

// ─── useDeleteCharacter ───────────────────────────────────────────────────────

export function useDeleteCharacter(): UseMutationResult<void, Error, string> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (characterId: string) =>
      apiClient.delete(`/characters/${characterId}`),
    onSuccess: (_data, characterId) => {
      queryClient.removeQueries({
        queryKey: characterKeys.detail(characterId),
      });
      queryClient.invalidateQueries({ queryKey: characterKeys.lists() });
    },
  });
}

// ─── useCharacterAction ───────────────────────────────────────────────────────

export interface CharacterActionInput {
  actionId: string;
  params?: Record<string, unknown>;
}

/**
 * Mutation hook for POST /characters/{id}/actions.
 * On success, syncs the updated character into both the TanStack Query cache
 * and the Zustand character store so all UI reflects the server state immediately.
 *
 * The backend returns the enriched Character directly through the standard
 * { data: T } envelope, which apiClient.post unwraps to just Character.
 */
export function useCharacterAction(
  characterId: string
): UseMutationResult<Character, Error, CharacterActionInput> {
  const queryClient = useQueryClient();
  const { setCharacter } = useCharacterStore();

  return useMutation({
    mutationFn: ({ actionId, params }: CharacterActionInput) =>
      apiClient.post<Character>(
        `/characters/${characterId}/actions`,
        { actionId, ...(params ? { params } : {}) }
      ),
    onSuccess: (updated) => {
      // Sync both caches with authoritative server state
      queryClient.setQueryData(characterKeys.detail(characterId), updated);
      setCharacter(updated);
    },
  });
}

// ─── useCharacterLevelUp ──────────────────────────────────────────────────────

export interface LevelUpInput {
  targetLevel: number;
  advancements: LevelUpChoices["advancements"];
  newDomainCardId: string | null;
  exchangeCardId?: string | null;
  newSubclassId?: string | null;
  newClassId?: string | null;
}

/**
 * Mutation hook for POST /characters/{id}/levelup.
 * On success, syncs the updated character into both the TanStack Query cache
 * and the Zustand character store.
 */
export function useCharacterLevelUp(
  characterId: string
): UseMutationResult<Character, Error, LevelUpInput> {
  const queryClient = useQueryClient();
  const { setCharacter } = useCharacterStore();

  return useMutation({
    mutationFn: (input: LevelUpInput) =>
      apiClient.post<Character>(
        `/characters/${characterId}/levelup`,
        input
      ),
    onSuccess: (updated) => {
      queryClient.setQueryData(characterKeys.detail(characterId), updated);
      setCharacter(updated);
      queryClient.invalidateQueries({ queryKey: characterKeys.lists() });
    },
  });
}
