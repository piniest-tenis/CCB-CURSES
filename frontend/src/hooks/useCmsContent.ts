/**
 * src/hooks/useCmsContent.ts
 *
 * TanStack Query hook for fetching CMS content (splash / interstitial).
 *
 * Falls back to hardcoded default content if the API is unavailable, returns
 * an empty array, or hasn't been deployed yet.  This guarantees both features
 * work immediately regardless of CMS backend state.
 */

import { useQuery, type UseQueryResult } from "@tanstack/react-query";

// ─── CMS Content type ─────────────────────────────────────────────────────────

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

// ─── API base ─────────────────────────────────────────────────────────────────

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "";

// ─── Fallback content ─────────────────────────────────────────────────────────

/** Single splash fallback shown before the character-creation wizard. */
export const SPLASH_FALLBACK: CmsContent = {
  id: "fallback-splash-1",
  type: "splash",
  title: "Welcome to the 231st Andam",
  body: "It is the season of Eraldama in the only tamed part of The Waste. Across the Varjalune Republic, people are preparing for the upcoming season by turning out their linens, opening windows and letting the cool, dry Kuivatuul winds blow the damp from their homes. This is a time of celebration in the capital of Alipinn. However, it is also the time of the Andam.\n\nThe Andam occurs yearly, and is one of the only reasons that the Varjalune can exist. Each year, 150 adherents are drafted to be sent to the Hygiane Order in Gatehouse. There, they will replenish the ranks tasked with containing the Creep and dealing with the various Etherotaxia that live within Forestdown.\n\nAt its inception, sometimes as many as 700 young people from the city would be sent westward to Gatehouse. That was nearly two centuries ago. As the Hygiane Order found more success, the people of the Varjalune found ways to relax the cost of the Andam, sending fewer and fewer each year.\n\nToday, these 150 volunteers are being notified, assembled, and shipped off for the 231st Andam. Your characters are amongst them.",
  imageKey: null,
  imageUrl: null,
  active: true,
  order: 1,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

/** Eight interstitial lore cards, one is picked randomly while loading. */
export const INTERSTITIAL_FALLBACKS: CmsContent[] = [
  {
    id: "fallback-interstitial-1",
    type: "interstitial",
    title: "The Varjalune Republic",
    body: "The only major nation-state of The Wastes, thriving through trade with Kybon Isle. The Republic's cities of Alipinn and Taliga have negotiated their obligation to the Hygiane Order down to a trickle: 150 volunteers a year for the Andam, where once they sent seven hundred.",
    imageKey: null,
    imageUrl: null,
    active: true,
    order: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "fallback-interstitial-2",
    type: "interstitial",
    title: "Gatehouse",
    body: "A bustling border town on the edge of the Ergantine Lake. The Hygiane Order's fortress and monastery occupies an easily defensible outcropping into the lake, the last line between the tamed lands and the corrupted depths of Forestdown.",
    imageKey: null,
    imageUrl: null,
    active: true,
    order: 2,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "fallback-interstitial-3",
    type: "interstitial",
    title: "The Hygiane Order",
    body: "The Hygiane Order tends the corruption of Forestdown through four internal orders: The Hospitallers, The Medicaments, The Etherements, and The Tenders. Now at its weakest in living memory, the Order receives its dwindling annual tribute of volunteers from the Varjalune Republic.",
    imageKey: null,
    imageUrl: null,
    active: true,
    order: 3,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "fallback-interstitial-4",
    type: "interstitial",
    title: "The Creep",
    body: "The ever-present corrupting factor within Forestdown. The Creep describes both the rotted undergrowth that marks ground claimed by the forest and all the numerous lifeforms that reside within it. The Creep is distinct from the Etherotaxia, the spirits and semi-corporeal beings that also inhabit Forestdown.",
    imageKey: null,
    imageUrl: null,
    active: true,
    order: 4,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "fallback-interstitial-5",
    type: "interstitial",
    title: "Etherotaxia",
    body: "Any number of reported spirits, either of the dead or semi-corporeal manifestations of concepts within the forest. Most are poorly understood. Some, like the Madanikuputukas, have been studied enough to be named. They are one of the many reasons the Hygiane Order cannot simply abandon Forestdown to itself.",
    imageKey: null,
    imageUrl: null,
    active: true,
    order: 5,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "fallback-interstitial-6",
    type: "interstitial",
    title: "Forestdown",
    body: "A vast temperate rainforest, ancient beyond reckoning, and deeply corrupted. The Creep spreads beneath its canopy. Etherotaxia wander its depths. At its heart, rumor speaks of The Invisible City, ruled over by The Spirit Ichida, where wanderers end up when they enter the forest in a daze and do not return.",
    imageKey: null,
    imageUrl: null,
    active: true,
    order: 6,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "fallback-interstitial-7",
    type: "interstitial",
    title: "The Spirit Ichida",
    body: "An ancient ghost, old even before the first age. The Spirit Ichida is the embodiment of change, managing it through death and rebirth. Few have seen The Spirit Ichida, and those that have rarely survive the experience with their sanity intact. Its Invisible City is said to sit at the very heart of Forestdown.",
    imageKey: null,
    imageUrl: null,
    active: true,
    order: 7,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "fallback-interstitial-8",
    type: "interstitial",
    title: "A Child's Song of Forestdown",
    body: "Itchy itchy eyes-o-white, set down low and out of sight / Ragged his body and hot his head, lay him down, he's better dead / Sloppy sloppy mouth-o-teeth, push from out his jaw beneath / Sopping his stink and raw his skin, let him loose, he'll come again / Wibbly wibbly arms-so-long, those that's left and those that's gone / Mind is juice and cares are few, soon he's dead, but so are you.",
    imageKey: null,
    imageUrl: null,
    active: true,
    order: 8,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

// ─── Query key factory ────────────────────────────────────────────────────────

export const cmsKeys = {
  splash:       ["cms", "splash"]       as const,
  interstitial: ["cms", "interstitial"] as const,
} as const;

// ─── Raw fetch (no auth header — CMS endpoints are public) ───────────────────

async function fetchCms(type: "splash" | "interstitial"): Promise<CmsContent[]> {
  const res = await fetch(`${API_BASE}/cms/${type}`, {
    method: "GET",
    headers: { Accept: "application/json" },
    // Short timeout — we'd rather fall back quickly than block the UI
    signal: AbortSignal.timeout(5_000),
  });

  if (!res.ok) {
    throw new Error(`CMS fetch failed: ${res.status}`);
  }

  const json = (await res.json()) as unknown;

  // API may return { data: { items: [...] } } envelope or a bare array.
  if (Array.isArray(json)) return json as CmsContent[];
  const enveloped = json as { data?: { items?: CmsContent[] } };
  if (Array.isArray(enveloped?.data?.items)) return enveloped.data!.items!;

  return [];
}

// ─── useCmsContent ────────────────────────────────────────────────────────────

/**
 * Fetches CMS content of the given type with automatic fallback.
 *
 * Returns the items (active-filtered, sorted by order) from the API when
 * available, or the appropriate hardcoded fallback array when not.
 *
 * `data` is always a non-empty `CmsContent[]` — never undefined after the
 * query settles (the fallback guarantees at least one item).
 */
export function useCmsContent(
  type: "splash" | "interstitial"
): UseQueryResult<CmsContent[]> {
  return useQuery<CmsContent[]>({
    queryKey: type === "splash" ? cmsKeys.splash : cmsKeys.interstitial,
    queryFn: async () => {
      try {
        const items = await fetchCms(type);
        const active = items.filter((i) => i.active).sort((a, b) => a.order - b.order);
        if (active.length > 0) return active;
        // API returned empty — use fallback
        return type === "splash" ? [SPLASH_FALLBACK] : INTERSTITIAL_FALLBACKS;
      } catch {
        // Network / parse error — use fallback silently
        return type === "splash" ? [SPLASH_FALLBACK] : INTERSTITIAL_FALLBACKS;
      }
    },
    // CMS content changes rarely — cache aggressively
    staleTime: 10 * 60 * 1000, // 10 min
    gcTime:    30 * 60 * 1000, // 30 min
    // Never show error state — the queryFn always resolves with fallback
    retry: false,
  });
}
