"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/store/authStore";
import {
  useUserPregens,
  useCreateUserPregen,
  useDeleteUserPregen,
} from "@/hooks/usePregens";
import type { PregenManagementSummary } from "@/hooks/usePregens";
import type { Character } from "@shared/types";

export default function PregensPage() {
  const { isReady, isAuthenticated } = useAuthStore();
  const router = useRouter();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [jsonInput, setJsonInput] = useState("");
  const [parseError, setParseError] = useState<string | null>(null);

  const { data, isLoading, isError } = useUserPregens();
  const createMutation = useCreateUserPregen();
  const deleteMutation = useDeleteUserPregen();

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

  function handleCreate() {
    setParseError(null);
    let parsed: Character;
    try {
      parsed = JSON.parse(jsonInput);
    } catch {
      setParseError("Invalid JSON. Please check your input and try again.");
      return;
    }
    createMutation.mutate(
      { character: parsed },
      {
        onSuccess: () => {
          setShowCreateModal(false);
          setJsonInput("");
          setParseError(null);
        },
        onError: (err: Error) => {
          setParseError(err.message || "Failed to create pre-gen.");
        },
      }
    );
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
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 rounded bg-[#577399] text-[#f7f7ff] font-medium hover:brightness-110 transition-all shrink-0"
          >
            Create Pre-gen
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
                  <span className="text-xs font-medium px-2 py-0.5 rounded bg-slate-700 text-[#b9baa3] shrink-0">
                    Lvl {p.nativeLevel}
                  </span>
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

                <div className="mt-auto pt-2 border-t border-slate-700/60 flex justify-end">
                  <button
                    onClick={() => handleDelete(p.pregenId, p.name)}
                    disabled={deleteMutation.isPending}
                    className="text-sm text-[#fe5f55] hover:text-[#f7f7ff] transition-colors disabled:opacity-50"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-slate-800 border border-slate-700/60 rounded-lg w-full max-w-lg p-6">
            <h2 className="text-xl font-bold mb-1">Create Pre-gen</h2>
            <p className="text-sm text-[#b9baa3] mb-4">
              Paste a Character JSON object below.
            </p>

            <textarea
              value={jsonInput}
              onChange={(e) => setJsonInput(e.target.value)}
              rows={12}
              className="w-full rounded bg-slate-900 border border-slate-700/60 text-[#f7f7ff] text-sm font-mono p-3 focus:outline-none focus:border-[#577399] resize-y"
              placeholder='{ "name": "...", "class": "...", ... }'
            />

            {parseError && (
              <p className="text-sm text-[#fe5f55] mt-2">{parseError}</p>
            )}

            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setJsonInput("");
                  setParseError(null);
                }}
                className="px-4 py-2 text-sm rounded border border-slate-700/60 text-[#b9baa3] hover:text-[#f7f7ff] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={!jsonInput.trim() || createMutation.isPending}
                className="px-4 py-2 text-sm rounded bg-[#577399] text-[#f7f7ff] font-medium hover:brightness-110 transition-all disabled:opacity-50"
              >
                {createMutation.isPending ? "Creating..." : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
