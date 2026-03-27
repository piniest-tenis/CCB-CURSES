/**
 * src/components/campaign/MemberCard.tsx
 *
 * Card for an individual campaign member in the sidebar roster.
 * Shows: avatar, display name, role badge, assigned character name,
 * and a [Remove] button for GMs.
 *
 * Clicking the card selects that character in the main panel.
 */

"use client";

import React from "react";
import { RoleBadge } from "./RoleBadge";
import type { CampaignMemberDetail } from "@/types/campaign";

interface MemberCardProps {
  member: CampaignMemberDetail;
  primaryGmId: string;
  characterName: string | null;
  isSelected: boolean;
  isGm: boolean;
  /** Whether the current user is removing this member (shows spinner). */
  isRemoving?: boolean;
  /** Whether the GM is currently unassigning this member's character. */
  isUnassigning?: boolean;
  onSelect: () => void;
  onRemove?: () => void;
  /** GM only: remove the character assignment without removing the player. */
  onUnassignCharacter?: () => void;
}

export function MemberCard({
  member,
  primaryGmId,
  characterName,
  isSelected,
  isGm,
  isRemoving = false,
  isUnassigning = false,
  onSelect,
  onRemove,
  onUnassignCharacter,
}: MemberCardProps) {
  const isPrimaryGm = member.userId === primaryGmId;

  // Avatar: first letter of display name
  const initials = member.displayName.charAt(0).toUpperCase();

  return (
    <div
      className={[
        "rounded-lg border p-3 transition-all duration-150 cursor-pointer",
        isSelected
          ? "border-[#577399] bg-[#577399]/15"
          : "border-[#577399]/20 bg-slate-900/60 hover:border-[#577399]/50 hover:bg-slate-900/80",
      ].join(" ")}
      onClick={member.characterId ? onSelect : undefined}
      role={member.characterId ? "button" : undefined}
      tabIndex={member.characterId ? 0 : undefined}
      onKeyDown={(e) => {
        if (member.characterId && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onSelect();
        }
      }}
      aria-pressed={member.characterId ? isSelected : undefined}
      aria-label={
        member.characterId
          ? `Select ${member.displayName}${characterName ? ` — ${characterName}` : ""}`
          : `${member.displayName} — no character assigned`
      }
    >
      <div className="flex items-center gap-3">
        {/* Avatar */}
        <div
          aria-hidden="true"
          className="
            h-9 w-9 shrink-0 rounded-full
            border border-[#577399]/40 bg-slate-800
            flex items-center justify-center
            text-sm font-bold text-[#b9baa3] select-none
            overflow-hidden
          "
        >
          {member.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={member.avatarUrl}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            initials
          )}
        </div>

        {/* Info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-sm font-semibold text-[#f7f7ff] truncate">
              {member.displayName}
            </span>
            <RoleBadge
              role={member.role}
              isPrimaryGm={isPrimaryGm && member.role === "gm"}
            />
          </div>
          {characterName ? (
            <p className="mt-0.5 text-xs text-[#b9baa3]/70 truncate">
              {characterName}
            </p>
          ) : (
            <p className="mt-0.5 text-xs text-[#b9baa3]/40 italic">
              No character assigned
            </p>
          )}
        </div>

        {/* GM actions */}
        {isGm && (onUnassignCharacter || (!isPrimaryGm && onRemove)) && (
          <div className="flex flex-col items-end gap-1 shrink-0">
            {/* Unassign character — shown for any member with a character (including primary GM) */}
            {onUnassignCharacter && member.characterId && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onUnassignCharacter();
                }}
                disabled={isUnassigning}
                aria-label={`Unassign ${characterName ?? "character"} from ${member.displayName}`}
                title="Remove this character from the campaign without removing the player"
                className="
                  rounded px-2 py-1 text-xs
                  text-[#DAA520]/60 hover:text-[#DAA520] hover:bg-[#DAA520]/10
                  disabled:opacity-40 disabled:cursor-wait
                  transition-colors
                  focus:outline-none focus:ring-2 focus:ring-[#DAA520]/60
                "
              >
                {isUnassigning ? (
                  <span
                    aria-hidden="true"
                    className="inline-block h-3 w-3 animate-spin rounded-full border border-current border-t-transparent"
                  />
                ) : (
                  "Unassign"
                )}
              </button>
            )}
            {/* Remove player from campaign entirely */}
            {onRemove && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove();
                }}
                disabled={isRemoving}
                aria-label={`Remove ${member.displayName} from campaign`}
                className="
                  rounded px-2 py-1 text-xs
                  text-[#fe5f55]/60 hover:text-[#fe5f55] hover:bg-[#fe5f55]/10
                  disabled:opacity-40 disabled:cursor-wait
                  transition-colors
                  focus:outline-none focus:ring-2 focus:ring-[#fe5f55]/60
                "
              >
                {isRemoving ? (
                  <span
                    aria-hidden="true"
                    className="inline-block h-3 w-3 animate-spin rounded-full border border-current border-t-transparent"
                  />
                ) : (
                  "Remove"
                )}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
