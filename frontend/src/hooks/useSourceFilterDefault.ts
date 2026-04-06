"use client";

/**
 * src/hooks/useSourceFilterDefault.ts
 *
 * Returns the user's preferred default source filter value from their profile.
 * Falls back to "srd" if the profile hasn't loaded yet or the preference is unset.
 */

import { useAuthStore } from "@/store/authStore";
import type { SourceFilterDefault } from "@/components/SourceFilter";

/** System-level fallback before user profile loads or for logged-out users. */
const SYSTEM_DEFAULT: SourceFilterDefault = "srd";

/**
 * Returns the user's preferred default source filter value.
 * Falls back to "srd" if profile hasn't loaded yet or preference is unset.
 */
export function useSourceFilterDefault(): SourceFilterDefault {
  const user = useAuthStore((s) => s.user);
  return user?.preferences?.defaultSourceFilter ?? SYSTEM_DEFAULT;
}
