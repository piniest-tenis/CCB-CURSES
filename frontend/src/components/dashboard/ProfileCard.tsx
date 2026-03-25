"use client";

/**
 * src/components/dashboard/ProfileCard.tsx
 *
 * Right-rail profile card showing user avatar, display name, email,
 * and a sign-out button.
 */

import React from "react";
import type { UserProfile } from "@shared/types";

interface ProfileCardProps {
  user: UserProfile;
  onSignOut: () => void;
}

export function ProfileCard({ user, onSignOut }: ProfileCardProps) {
  const initial = (user.displayName || user.email).charAt(0).toUpperCase();

  return (
    <div className="rounded-xl border border-[#577399]/30 bg-slate-900/80 p-5 shadow-card-fantasy">
      <p className="text-xs font-semibold uppercase tracking-widest text-[#b9baa3]/50 mb-4">
        Your Profile
      </p>

      <div className="flex items-center gap-3">
        {/* Avatar */}
        <div className="h-11 w-11 shrink-0 rounded-full border-2 border-[#577399]/40 bg-slate-800 flex items-center justify-center overflow-hidden">
          {user.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.avatarUrl}
              alt={user.displayName || user.email}
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="text-lg font-bold text-[#577399]">{initial}</span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p className="font-semibold text-[#f7f7ff] text-sm truncate">
            {user.displayName || "Adventurer"}
          </p>
          <p className="text-xs text-[#b9baa3]/50 truncate">{user.email}</p>
        </div>
      </div>

      <button
        type="button"
        onClick={onSignOut}
        className="
          mt-4 w-full rounded-lg px-3 py-2 text-xs font-medium
          border border-slate-700/60 text-[#b9baa3]/50
          hover:border-slate-600 hover:text-[#b9baa3]
          transition-colors
          focus:outline-none focus:ring-2 focus:ring-[#577399] focus:ring-offset-2 focus:ring-offset-slate-900
        "
      >
        Sign out
      </button>
    </div>
  );
}
