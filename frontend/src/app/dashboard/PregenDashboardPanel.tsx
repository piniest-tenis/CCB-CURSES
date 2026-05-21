"use client";

/**
 * src/app/dashboard/PregenDashboardPanel.tsx
 *
 * Compact paginated list of the user's personal pregens.
 * Parent is responsible for only rendering this when pregens exist.
 */

import React, { useState } from "react";
import { useUserPregens, useDeleteUserPregen } from "@/hooks/usePregens";

const PAGE_SIZE = 5;

export function PregenDashboardPanel() {
  const { data } = useUserPregens();
  const deletePregen = useDeleteUserPregen();

  const pregens = data?.pregens ?? [];

  const [page, setPage] = useState(0);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  const totalPages = Math.ceil(pregens.length / PAGE_SIZE);
  const pagePregens = pregens.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  const handleRemoveClick = (pregenId: string) => {
    if (confirmingId === pregenId) {
      // Second click — confirm deletion
      deletePregen.mutate(pregenId);
      setConfirmingId(null);
    } else {
      setConfirmingId(pregenId);
    }
  };

  const handleRemoveBlur = (pregenId: string) => {
    // Reset if the user clicks away from the confirming row
    if (confirmingId === pregenId) {
      setConfirmingId(null);
    }
  };

  return (
    <section aria-labelledby="personal-pregens-heading" className="space-y-3">
      <h2
        id="personal-pregens-heading"
        className="text-[#b9baa3] text-sm font-semibold uppercase tracking-wide"
      >
        Personal Pre-gens
      </h2>

      <div className="border border-slate-700/60 rounded-lg bg-slate-800/50 overflow-hidden">
        <ul role="list" className="divide-y divide-slate-700/40">
          {pagePregens.map((pregen) => {
            const isConfirming = confirmingId === pregen.pregenId;
            const isDeleting =
              deletePregen.isPending && deletePregen.variables === pregen.pregenId;

            const subtitle = [pregen.className, pregen.subclassName]
              .filter(Boolean)
              .join(" · ");

            return (
              <li
                key={pregen.pregenId}
                className="flex items-center justify-between gap-3 px-4 py-3"
              >
                {/* Left: name + class */}
                <div className="min-w-0 flex-1">
                  <p className="text-[#f7f7ff] text-sm font-medium truncate">
                    {pregen.name}
                  </p>
                  {subtitle && (
                    <p className="text-[#b9baa3] text-xs truncate">{subtitle}</p>
                  )}
                </div>

                {/* Right: level badge + remove button */}
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs border border-slate-700/60 px-1.5 py-0.5 rounded text-[#b9baa3]">
                    Lv {pregen.nativeLevel}
                  </span>

                  <button
                    type="button"
                    onClick={() => handleRemoveClick(pregen.pregenId)}
                    onBlur={() => handleRemoveBlur(pregen.pregenId)}
                    disabled={isDeleting}
                    aria-label={
                      isConfirming
                        ? `Confirm removal of pre-gen ${pregen.name}`
                        : `Remove pre-gen ${pregen.name}`
                    }
                    className={[
                      "rounded px-2 py-1 text-xs transition-colors",
                      "focus:outline-none focus:ring-2 focus:ring-[#fe5f55]/60",
                      "disabled:opacity-40 disabled:cursor-wait",
                      isConfirming
                        ? "text-[#fe5f55] hover:bg-[#fe5f55]/10"
                        : "text-[#b9baa3]/60 hover:text-[#b9baa3] hover:bg-slate-700/40",
                    ].join(" ")}
                  >
                    {isDeleting ? (
                      <span
                        aria-hidden="true"
                        className="inline-block h-3 w-3 animate-spin rounded-full border border-current border-t-transparent"
                      />
                    ) : isConfirming ? (
                      "Confirm?"
                    ) : (
                      "Remove"
                    )}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>

        {/* Pagination controls — only shown when there are more than PAGE_SIZE pregens */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-2.5 border-t border-slate-700/40">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              aria-label="Previous page"
              className="
                text-[#b9baa3] text-xs
                disabled:opacity-30 disabled:cursor-not-allowed
                hover:text-[#f7f7ff] transition-colors
                focus:outline-none focus:ring-2 focus:ring-[#577399] rounded
              "
            >
              &larr; Prev
            </button>

            <span className="text-[#b9baa3] text-xs" aria-live="polite" aria-atomic="true">
              Page {page + 1} of {totalPages}
            </span>

            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              aria-label="Next page"
              className="
                text-[#b9baa3] text-xs
                disabled:opacity-30 disabled:cursor-not-allowed
                hover:text-[#f7f7ff] transition-colors
                focus:outline-none focus:ring-2 focus:ring-[#577399] rounded
              "
            >
              Next &rarr;
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
