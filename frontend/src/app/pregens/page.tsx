"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/store/authStore";
import {
  useUserPregens,
  useDeleteUserPregen,
  useLevelUpUserPregen,
  useUserPregenDetail,
  type PregenManagementSummary,
} from "@/hooks/usePregens";
import { useCreateCharacter } from "@/hooks/useCharacter";
import { LevelUpWizard } from "@/components/character/LevelUpWizard";
import type { LevelUpInput } from "@/hooks/useCharacter";

export default function PregensPage() {
  const { isReady, isAuthenticated } = useAuthStore();
  const router = useRouter();

  const { data, isLoading, isError } = useUserPregens();
  const deleteMutation = useDeleteUserPregen();
  const levelUpMutation = useLevelUpUserPregen();
  const createCharacterMutation = useCreateCharacter();

  const [levelUpTarget, setLevelUpTarget] = useState<PregenManagementSummary | null>(null);

  useEffect(() => {
    if (isReady && !isAuthenticated)
      router.replace("/auth/login?return_to=/pregens");
  }, [isReady, isAuthenticated, router]);

  if (!isReady || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-[#b9baa3]">Loading...</div>
      </div>
    );
  }

  const pregens: PregenManagementSummary[] = data?.pregens ?? [];

  async function handleCreatePregen() {
    const char = await createCharacterMutation.mutateAsync({ name: "New Pre-gen" });
    router.push(`/character/${char.characterId}/build?pregenMode=user&returnTo=/pregens`);
  }

  function handleDelete(id: string, name: string) {
    if (!window.confirm(`Delete pre-gen "${name}"? This cannot be undone.`))
      return;
    deleteMutation.mutate(id);
  }

  return (
    <div className="min-h-screen bg-slate-900 text-[#f7f7ff]">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Back link */}
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1 text-sm text-[#577399] hover:text-[#f7f7ff] transition-colors mb-6"
        >
          &larr; Back to Dashboard
        </Link>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold">My Pre-generated Characters</h1>
            <p className="text-[#b9baa3] text-sm mt-1">
              Create reusable pre-gen templates for your campaigns
            </p>
          </div>
          <button
            onClick={handleCreatePregen}
            disabled={createCharacterMutation.isPending}
            className="px-4 py-2 rounded bg-[#577399] text-[#f7f7ff] font-medium hover:brightness-110 transition-all shrink-0 disabled:opacity-50"
          >
            {createCharacterMutation.isPending ? "Creating..." : "Create Pre-gen"}
          </button>
        </div>

        {/* Content */}
        {isLoading && (
          <div className="text-center py-16 text-[#b9baa3]">
            Loading pre-gens...
          </div>
        )}

        {isError && (
          <div className="text-center py-16 text-[#fe5f55]">
            Failed to load pre-generated characters. Please try again.
          </div>
        )}

        {!isLoading && !isError && pregens.length === 0 && (
          <div className="text-center py-16 border border-slate-700/60 rounded-lg bg-slate-800">
            <p className="text-[#b9baa3]">
              You haven&apos;t created any pre-generated characters yet.
            </p>
          </div>
        )}

        {!isLoading && !isError && pregens.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2">
            {pregens.map((p) => (
              <div
                key={p.pregenId}
                className="bg-slate-800 border border-slate-700/60 rounded-lg p-5 flex flex-col gap-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h2 className="text-lg font-semibold leading-tight">
                      {p.name}
                    </h2>
                    <p className="text-sm text-[#b9baa3] mt-0.5">
                      {[p.communityName, p.ancestryName, `${p.className}${p.subclassName ? ` (${p.subclassName})` : ""}`]
                        .filter(Boolean)
                        .join(" / ")}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className="text-xs font-medium px-2 py-0.5 rounded bg-slate-700 text-[#b9baa3]">
                      Lvl {p.nativeLevel}
                    </span>
                    {p.availableLevels && p.availableLevels.length > 1 && (
                      <span className="text-xs text-[#577399]">
                        Lvls {p.availableLevels.join(", ")}
                      </span>
                    )}
                  </div>
                </div>

                {p.domains && p.domains.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {p.domains.map((d) => (
                      <span
                        key={d}
                        className="text-xs px-2 py-0.5 rounded-full border border-[#577399] text-[#577399]"
                      >
                        {d}
                      </span>
                    ))}
                  </div>
                )}

                <div className="mt-auto pt-2 border-t border-slate-700/60 flex justify-between items-center gap-2">
                  {p.nativeLevel < 10 && (
                    <button
                      onClick={() => setLevelUpTarget(p)}
                      className="text-sm text-[#577399] hover:text-[#f7f7ff] transition-colors"
                    >
                      Level Up
                    </button>
                  )}
                  <div className="ml-auto">
                    <button
                      onClick={() => handleDelete(p.pregenId, p.name)}
                      disabled={deleteMutation.isPending}
                      className="text-sm text-[#fe5f55] hover:text-[#f7f7ff] transition-colors disabled:opacity-50"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Level Up Wizard */}
      {levelUpTarget && (
        <LevelUpWizardForPregen
          pregen={levelUpTarget}
          scope="user"
          levelUpMutation={levelUpMutation}
          onClose={() => setLevelUpTarget(null)}
        />
      )}
    </div>
  );
}

// ─── LevelUpWizardForPregen ───────────────────────────────────────────────────

function LevelUpWizardForPregen({
  pregen,
  scope,
  levelUpMutation,
  onClose,
}: {
  pregen: PregenManagementSummary;
  scope: "user" | "admin";
  levelUpMutation: ReturnType<typeof useLevelUpUserPregen>;
  onClose: () => void;
}) {
  const hookName = scope === "user" ? useUserPregenDetail : useUserPregenDetail;
  const { data, isLoading } = hookName(pregen.pregenId);

  if (isLoading || !data?.pregen.character) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#577399] border-t-transparent" />
      </div>
    );
  }

  async function handleSave(input: LevelUpInput) {
    await levelUpMutation.mutateAsync({ pregenId: pregen.pregenId, input });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm overflow-y-auto p-4">
      <div className="w-full max-w-2xl">
        <LevelUpWizard
          character={data.pregen.character}
          onClose={onClose}
          onSave={handleSave}
        />
      </div>
    </div>
  );
}
