/**
 * src/hooks/useGameData.ts
 *
 * TanStack Query v5 hooks for public, read-only game data:
 * classes, communities, ancestries, domains, and individual domain cards.
 *
 * Game data changes only on deploy, so we use aggressive stale/gc times
 * to avoid unnecessary network traffic during a session.
 */

import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import type {
  ClassData,
  ClassSummary,
  CommunityData,
  AncestryData,
  DomainCard,
  DomainSummary,
  RuleEntry,
} from "@shared/types";

// ─── Cache configuration ──────────────────────────────────────────────────────

const STALE_TIME = 5  * 60 * 1000; // 5 minutes
const GC_TIME    = 30 * 60 * 1000; // 30 minutes

// ─── Query keys ───────────────────────────────────────────────────────────────

export const gameDataKeys = {
  classes: {
    all:    ["classes"] as const,
    list:   () => [...gameDataKeys.classes.all, "list"] as const,
    detail: (classId: string) =>
      [...gameDataKeys.classes.all, "detail", classId] as const,
  },
  communities: {
    all:    ["communities"] as const,
    list:   () => [...gameDataKeys.communities.all, "list"] as const,
    detail: (communityId: string) =>
      [...gameDataKeys.communities.all, "detail", communityId] as const,
  },
  ancestries: {
    all:    ["ancestries"] as const,
    list:   () => [...gameDataKeys.ancestries.all, "list"] as const,
    detail: (ancestryId: string) =>
      [...gameDataKeys.ancestries.all, "detail", ancestryId] as const,
  },
  domains: {
    all:    ["domains"] as const,
    list:   () => [...gameDataKeys.domains.all, "list"] as const,
    detail: (domain: string) =>
      [...gameDataKeys.domains.all, "detail", domain] as const,
    card:   (domain: string, cardId: string) =>
      [...gameDataKeys.domains.all, "card", domain, cardId] as const,
  },
} as const;

// ─── Response shapes (matching API contract) ──────────────────────────────────

export interface ClassListData {
  classes: ClassSummary[];
}

export interface CommunityListData {
  communities: CommunityData[];
}

export interface AncestryListData {
  ancestries: AncestryData[];
}

export interface DomainListData {
  domains: DomainSummary[];
}

export interface DomainCardsData {
  domain: string;
  cards:  DomainCard[];
}

export interface RulesListData {
  rules: RuleEntry[];
}

// ─── Classes ──────────────────────────────────────────────────────────────────

export function useClasses(): UseQueryResult<ClassListData> {
  return useQuery({
    queryKey: gameDataKeys.classes.list(),
    queryFn:  () => apiClient.get<ClassListData>("/classes"),
    staleTime: STALE_TIME,
    gcTime:    GC_TIME,
  });
}

export function useClass(
  classId: string | undefined
): UseQueryResult<ClassData> {
  return useQuery({
    queryKey: gameDataKeys.classes.detail(classId ?? ""),
    queryFn:  () => apiClient.get<ClassData>(`/classes/${classId}`),
    enabled:   Boolean(classId),
    staleTime: STALE_TIME,
    gcTime:    GC_TIME,
  });
}

// ─── Communities ──────────────────────────────────────────────────────────────

export function useCommunities(): UseQueryResult<CommunityListData> {
  return useQuery({
    queryKey: gameDataKeys.communities.list(),
    queryFn:  () => apiClient.get<CommunityListData>("/communities"),
    staleTime: STALE_TIME,
    gcTime:    GC_TIME,
  });
}

export function useCommunity(
  communityId: string | undefined
): UseQueryResult<CommunityData> {
  return useQuery({
    queryKey: gameDataKeys.communities.detail(communityId ?? ""),
    queryFn:  () =>
      apiClient.get<CommunityData>(`/communities/${communityId}`),
    enabled:   Boolean(communityId),
    staleTime: STALE_TIME,
    gcTime:    GC_TIME,
  });
}

// ─── Ancestries ───────────────────────────────────────────────────────────────

export function useAncestries(): UseQueryResult<AncestryListData> {
  return useQuery({
    queryKey: gameDataKeys.ancestries.list(),
    queryFn:  () => apiClient.get<AncestryListData>("/ancestries"),
    staleTime: STALE_TIME,
    gcTime:    GC_TIME,
  });
}

export function useAncestry(
  ancestryId: string | undefined
): UseQueryResult<AncestryData> {
  return useQuery({
    queryKey: gameDataKeys.ancestries.detail(ancestryId ?? ""),
    queryFn:  () => apiClient.get<AncestryData>(`/ancestries/${ancestryId}`),
    enabled:   Boolean(ancestryId),
    staleTime: STALE_TIME,
    gcTime:    GC_TIME,
  });
}

// ─── Domains ──────────────────────────────────────────────────────────────────

export function useDomains(): UseQueryResult<DomainListData> {
  return useQuery({
    queryKey: gameDataKeys.domains.list(),
    queryFn:  () => apiClient.get<DomainListData>("/domains"),
    staleTime: STALE_TIME,
    gcTime:    GC_TIME,
  });
}

export function useDomain(
  domainName: string | undefined,
  level?: number
): UseQueryResult<DomainCardsData> {
  const qs = level !== undefined ? `?level=${level}` : "";
  return useQuery({
    queryKey: level !== undefined
      ? [...gameDataKeys.domains.detail(domainName ?? ""), level]
      : gameDataKeys.domains.detail(domainName ?? ""),
    queryFn:  () =>
      apiClient.get<DomainCardsData>(
        `/domains/${encodeURIComponent(domainName ?? "")}${qs}`
      ),
    enabled:   Boolean(domainName),
    staleTime: STALE_TIME,
    gcTime:    GC_TIME,
  });
}

export function useDomainCard(
  domain:  string | undefined,
  cardId:  string | undefined
): UseQueryResult<DomainCard> {
  return useQuery({
    queryKey: gameDataKeys.domains.card(domain ?? "", cardId ?? ""),
    queryFn:  () =>
      apiClient.get<DomainCard>(
        `/domains/${encodeURIComponent(domain ?? "")}/cards/${cardId}`
      ),
    enabled:   Boolean(domain) && Boolean(cardId),
    staleTime: STALE_TIME,
    gcTime:    GC_TIME,
  });
}

// ─── Rules ────────────────────────────────────────────────────────────────────

export function useRules(): UseQueryResult<RulesListData> {
  return useQuery({
    queryKey: ["rules", "list"],
    queryFn:  () => apiClient.get<RulesListData>("/rules"),
    staleTime: STALE_TIME,
    gcTime:    GC_TIME,
  });
}

export function useRule(
  ruleId: string | undefined
): UseQueryResult<RuleEntry> {
  return useQuery({
    queryKey: ["rules", "detail", ruleId ?? ""],
    queryFn:  () => apiClient.get<RuleEntry>(`/rules/${ruleId}`),
    enabled:   Boolean(ruleId),
    staleTime: STALE_TIME,
    gcTime:    GC_TIME,
  });
}
