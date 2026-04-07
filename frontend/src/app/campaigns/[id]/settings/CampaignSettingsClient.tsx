"use client";

/**
 * src/app/campaigns/[id]/settings/CampaignSettingsClient.tsx
 *
 * Campaign Settings page — GM only.
 * Pre-filled edit form for name + description + session schedule.
 * Danger zone: Delete Campaign with confirm dialog.
 * Non-GMs are redirected to the campaign detail page.
 */

import React, { useEffect, useId, useState, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import {
  useCampaignDetail,
  useUpdateCampaign,
  useDeleteCampaign,
} from "@/hooks/useCampaigns";
import type {
  DayOfWeek,
  RecurrenceFrequency,
  SessionSlot,
  SessionSchedule,
} from "@/types/campaign";

const MAX_NAME_LENGTH        = 80;
const MAX_DESCRIPTION_LENGTH = 500;

const DAYS: { value: DayOfWeek; label: string }[] = [
  { value: "monday",    label: "Mon" },
  { value: "tuesday",   label: "Tue" },
  { value: "wednesday", label: "Wed" },
  { value: "thursday",  label: "Thu" },
  { value: "friday",    label: "Fri" },
  { value: "saturday",  label: "Sat" },
  { value: "sunday",    label: "Sun" },
];

const FREQUENCIES: { value: RecurrenceFrequency; label: string }[] = [
  { value: "weekly",    label: "Weekly" },
  { value: "biweekly",  label: "Every two weeks" },
  { value: "monthly",   label: "Monthly" },
];

// Common IANA timezones for the selector
const TIMEZONES = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Anchorage",
  "America/Honolulu",
  "America/Toronto",
  "America/Vancouver",
  "America/Sao_Paulo",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Europe/Amsterdam",
  "Europe/Moscow",
  "Asia/Tokyo",
  "Asia/Shanghai",
  "Asia/Kolkata",
  "Asia/Dubai",
  "Australia/Sydney",
  "Pacific/Auckland",
  "UTC",
];

function formatReminderOffset(minutes: number): string {
  if (minutes === 0) return "Night before (midnight GMT)";
  if (minutes < 60) return `${minutes} min before`;
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins === 0 ? `${hrs}h before` : `${hrs}h ${mins}m before`;
}

// ─── ScheduleSlotEditor ─────────────────────────────────────────────────────────

function ScheduleSlotEditor({
  slot,
  index,
  onChange,
  onRemove,
  canRemove,
}: {
  slot: SessionSlot;
  index: number;
  onChange: (index: number, updated: SessionSlot) => void;
  onRemove: (index: number) => void;
  canRemove: boolean;
}) {
  return (
    <div className="rounded-lg border border-slate-700/40 bg-slate-900/40 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-[#b9baa3]/50">
          Session {index + 1}
        </span>
        {canRemove && (
          <button
            type="button"
            onClick={() => onRemove(index)}
            className="text-xs text-[#fe5f55]/60 hover:text-[#fe5f55] transition-colors"
          >
            Remove
          </button>
        )}
      </div>

      {/* Day selector */}
      <div>
        <label className="block text-xs text-[#b9baa3]/50 mb-1.5">Day</label>
        <div className="flex flex-wrap gap-1.5">
          {DAYS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => onChange(index, { ...slot, day: value })}
              className={[
                "px-2.5 py-1 rounded text-xs font-medium transition-colors",
                slot.day === value
                  ? "bg-[#577399] text-[#f7f7ff] border border-[#577399]"
                  : "border border-slate-700/60 text-[#b9baa3]/50 hover:border-[#577399]/40 hover:text-[#577399]/80",
              ].join(" ")}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Time + timezone */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-[#b9baa3]/50 mb-1.5">
            Time <span className="text-[#b9baa3]/30">(optional)</span>
          </label>
          <input
            type="time"
            value={slot.time ?? ""}
            onChange={(e) =>
              onChange(index, { ...slot, time: e.target.value || null })
            }
            className="w-full rounded border border-slate-700/60 bg-slate-950 px-2.5 py-1.5 text-sm text-[#f7f7ff] focus:outline-none focus:ring-1 focus:ring-[#577399] transition-colors [color-scheme:dark]"
          />
        </div>
        <div>
          <label className="block text-xs text-[#b9baa3]/50 mb-1.5">
            Timezone <span className="text-[#b9baa3]/30">(optional)</span>
          </label>
          <select
            value={slot.timezone ?? ""}
            onChange={(e) =>
              onChange(index, { ...slot, timezone: e.target.value || null })
            }
            className="w-full rounded border border-slate-700/60 bg-slate-950 px-2.5 py-1.5 text-sm text-[#f7f7ff] focus:outline-none focus:ring-1 focus:ring-[#577399] transition-colors"
          >
            <option value="">No timezone</option>
            {TIMEZONES.map((tz) => (
              <option key={tz} value={tz}>{tz}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Description */}
      <div>
        <label className="block text-xs text-[#b9baa3]/50 mb-1.5">
          Label <span className="text-[#b9baa3]/30">(optional, e.g. "Evening session")</span>
        </label>
        <input
          type="text"
          value={slot.description ?? ""}
          onChange={(e) =>
            onChange(index, { ...slot, description: e.target.value || null })
          }
          maxLength={200}
          placeholder="e.g. Evening session"
          className="w-full rounded border border-slate-700/60 bg-slate-950 px-2.5 py-1.5 text-sm text-[#f7f7ff] placeholder:text-[#b9baa3]/25 focus:outline-none focus:ring-1 focus:ring-[#577399] transition-colors"
        />
      </div>
    </div>
  );
}

// ─── ScheduleEditor ─────────────────────────────────────────────────────────────

function ScheduleEditor({
  schedule,
  onChange,
}: {
  schedule: SessionSchedule | null;
  onChange: (schedule: SessionSchedule | null) => void;
}) {
  const enabled = schedule !== null;

  const defaultSchedule: SessionSchedule = {
    frequency: "weekly",
    slots: [{ day: "wednesday", time: null, timezone: null, description: null }],
    reminderOffsetMinutes: 0,
    reminderEnabled: false,
  };

  const handleToggle = useCallback(() => {
    onChange(enabled ? null : defaultSchedule);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, onChange]);

  const handleFrequency = useCallback(
    (frequency: RecurrenceFrequency) => {
      if (!schedule) return;
      onChange({ ...schedule, frequency });
    },
    [schedule, onChange]
  );

  const handleSlotChange = useCallback(
    (index: number, updated: SessionSlot) => {
      if (!schedule) return;
      const newSlots = schedule.slots.map((s, i) => (i === index ? updated : s));
      onChange({ ...schedule, slots: newSlots });
    },
    [schedule, onChange]
  );

  const handleAddSlot = useCallback(() => {
    if (!schedule) return;
    onChange({
      ...schedule,
      slots: [...schedule.slots, { day: "friday", time: null, timezone: null, description: null }],
    });
  }, [schedule, onChange]);

  const handleRemoveSlot = useCallback(
    (index: number) => {
      if (!schedule || schedule.slots.length <= 1) return;
      onChange({ ...schedule, slots: schedule.slots.filter((_, i) => i !== index) });
    },
    [schedule, onChange]
  );

  const handleReminderEnabled = useCallback(
    (val: boolean) => {
      if (!schedule) return;
      onChange({ ...schedule, reminderEnabled: val });
    },
    [schedule, onChange]
  );

  const REMINDER_OPTIONS = [0, 60, 120, 240, 480, 1440, 2880, 4320, 10080];

  return (
    <section
      aria-label="Session schedule"
      className="rounded-xl border border-[#577399]/30 bg-slate-900/80 p-6 shadow-card-fantasy space-y-5"
    >
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-serif text-lg font-semibold text-[#f7f7ff]">Session Schedule</h2>
          <p className="text-sm text-[#b9baa3]/50 mt-0.5">
            Set recurring session days and times for your campaign.
          </p>
        </div>
        {/* Enable/disable toggle */}
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          onClick={handleToggle}
          className={[
            "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full",
            "border-2 transition-colors duration-200",
            "focus:outline-none focus:ring-2 focus:ring-[#577399] focus:ring-offset-2 focus:ring-offset-slate-900",
            enabled
              ? "border-[#577399] bg-[#577399]"
              : "border-slate-600 bg-slate-700",
          ].join(" ")}
        >
          <span
            aria-hidden="true"
            className={[
              "pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transition-transform duration-200",
              enabled ? "translate-x-5" : "translate-x-0",
            ].join(" ")}
          />
        </button>
      </div>

      {enabled && schedule && (
        <div className="space-y-5">
          {/* Frequency */}
          <div>
            <label className="block text-sm font-semibold text-[#f7f7ff] mb-2">Frequency</label>
            <div className="flex flex-wrap gap-2">
              {FREQUENCIES.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => handleFrequency(value)}
                  className={[
                    "px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors",
                    schedule.frequency === value
                      ? "bg-[#577399] text-[#f7f7ff] border border-[#577399]"
                      : "border border-slate-700/60 text-[#b9baa3]/60 hover:border-[#577399]/40 hover:text-[#577399]/80",
                  ].join(" ")}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Slots */}
          <div className="space-y-3">
            <label className="block text-sm font-semibold text-[#f7f7ff]">
              Session {schedule.slots.length === 1 ? "Day" : "Days"}
            </label>
            {schedule.slots.map((slot, i) => (
              <ScheduleSlotEditor
                key={i}
                slot={slot}
                index={i}
                onChange={handleSlotChange}
                onRemove={handleRemoveSlot}
                canRemove={schedule.slots.length > 1}
              />
            ))}
            {schedule.slots.length < 7 && (
              <button
                type="button"
                onClick={handleAddSlot}
                className="text-sm text-[#577399]/70 hover:text-[#577399] border border-dashed border-[#577399]/30 hover:border-[#577399]/60 rounded-lg px-4 py-2 w-full transition-colors"
              >
                + Add another session day
              </button>
            )}
          </div>

          {/* Reminder settings */}
          <div className="rounded-lg border border-slate-700/40 bg-slate-900/40 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-[#f7f7ff]">Email Reminders</p>
                <p className="text-xs text-[#b9baa3]/40 mt-0.5">
                  Notify campaign members before each session.
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={schedule.reminderEnabled}
                onClick={() => handleReminderEnabled(!schedule.reminderEnabled)}
                className={[
                  "relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full",
                  "border-2 transition-colors duration-200",
                  "focus:outline-none focus:ring-2 focus:ring-[#577399] focus:ring-offset-2 focus:ring-offset-slate-900",
                  schedule.reminderEnabled
                    ? "border-[#daa520] bg-[#daa520]"
                    : "border-slate-600 bg-slate-700",
                ].join(" ")}
              >
                <span
                  aria-hidden="true"
                  className={[
                    "pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow transition-transform duration-200",
                    schedule.reminderEnabled ? "translate-x-5" : "translate-x-0",
                  ].join(" ")}
                />
              </button>
            </div>

            {schedule.reminderEnabled && (
              <div>
                <label className="block text-xs text-[#b9baa3]/50 mb-1.5">Send reminder</label>
                <select
                  value={schedule.reminderOffsetMinutes}
                  onChange={(e) =>
                    onChange({ ...schedule, reminderOffsetMinutes: Number(e.target.value) })
                  }
                  className="w-full rounded border border-slate-700/60 bg-slate-950 px-2.5 py-1.5 text-sm text-[#f7f7ff] focus:outline-none focus:ring-1 focus:ring-[#577399] transition-colors"
                >
                  {REMINDER_OPTIONS.map((min) => (
                    <option key={min} value={min}>
                      {formatReminderOffset(min)}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-[#b9baa3]/30">
                  Email delivery requires a session time to be set on each slot.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────────────────

export default function CampaignSettingsClient() {
  const pathname = usePathname();
  // Extract the real campaign ID from the browser URL.
  // useParams() returns "__placeholder__" in a static export; usePathname()
  // always reflects the actual browser URL path.
  // Path: /campaigns/[id]/settings → segment index 2
  const campaignId = pathname?.split("/")[2] ?? "";
  const router = useRouter();

  const { isAuthenticated, isReady, isLoading: authLoading } = useAuthStore();
  const { data: campaign, isLoading } = useCampaignDetail(campaignId);

  const updateMutation = useUpdateCampaign(campaignId);
  const deleteMutation = useDeleteCampaign();

  const [name,          setName]          = useState("");
  const [description,   setDescription]   = useState("");
  const [schedule,      setSchedule]      = useState<SessionSchedule | null>(null);
  const [cursesContent, setCursesContent] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [saveSuccess,   setSaveSuccess]   = useState(false);

  const nameId      = useId();
  const descId      = useId();
  const formErrorId = useId();
  const delErrorId  = useId();

  // Auth guard
  useEffect(() => {
    if (isReady && !isAuthenticated) router.replace("/auth/login");
  }, [isReady, isAuthenticated, router]);

  // Role guard: redirect non-GMs
  useEffect(() => {
    if (campaign && campaign.callerRole !== "gm") {
      router.replace(`/campaigns/${campaignId}`);
    }
  }, [campaign, campaignId, router]);

  // Pre-fill form once campaign loads
  useEffect(() => {
    if (campaign) {
      setName(campaign.name);
      setDescription(campaign.description ?? "");
      setSchedule(campaign.schedule ?? null);
      setCursesContent(campaign.cursesContentEnabled ?? true);
    }
  }, [campaign]);

  if (!isReady || authLoading || !isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a100d]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#577399] border-t-transparent" />
      </div>
    );
  }

  const nameValue = name.trim();
  const canSave   = nameValue.length > 0 && !updateMutation.isPending;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSave) return;

    await updateMutation.mutateAsync({
      name:        nameValue,
      description: description.trim() || null,
      schedule,
      cursesContentEnabled: cursesContent,
    });

    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3_000);
  };

  const handleDelete = async () => {
    await deleteMutation.mutateAsync(campaignId);
    router.replace("/campaigns");
  };

  return (
    <div className="min-h-screen bg-[#0a100d]">
      {/* Header */}
      <header className="border-b border-slate-800/60">
        <div className="mx-auto max-w-2xl px-4 py-4 flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.push(`/campaigns/${campaignId}`)}
            aria-label="Back to campaign"
            className="
              flex items-center gap-2 text-sm text-[#b9baa3]/60
              hover:text-[#b9baa3] transition-colors
              focus:outline-none focus:ring-2 focus:ring-[#577399] rounded
            "
          >
            <span aria-hidden="true">←</span>
            {isLoading ? "Campaign" : (campaign?.name ?? "Campaign")}
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-10 space-y-10">
        <div>
          <h1 className="font-serif text-3xl font-semibold text-[#f7f7ff]">
            Campaign Settings
          </h1>
          <p className="mt-2 text-sm text-[#b9baa3]/60">
            Edit campaign details. Only GMs can access this page.
          </p>
        </div>

        {/* Edit form */}
        <form onSubmit={handleSave} noValidate className="space-y-8">
          <section
            aria-label="Edit campaign"
            className="rounded-xl border border-[#577399]/30 bg-slate-900/80 p-6 shadow-card-fantasy space-y-6"
          >
            <h2 className="font-serif text-lg font-semibold text-[#f7f7ff]">
              General
            </h2>

            <div className="space-y-5">
              {/* Name */}
              <div>
                <label
                  htmlFor={nameId}
                  className="block text-sm font-semibold text-[#f7f7ff] mb-1.5"
                >
                  Campaign Name <span className="text-[#fe5f55]" aria-hidden="true">*</span>
                  <span className="sr-only">(required)</span>
                </label>
                <input
                  id={nameId}
                  type="text"
                  value={name}
                  onChange={(e) => { setName(e.target.value); setSaveSuccess(false); }}
                  maxLength={MAX_NAME_LENGTH}
                  required
                  aria-required="true"
                  disabled={isLoading}
                  className="
                    w-full rounded-lg border border-slate-700/60 bg-slate-950
                    px-4 py-2.5 font-serif text-base text-[#f7f7ff]
                    disabled:opacity-50
                    focus:outline-none focus:ring-2 focus:ring-[#577399]
                    focus:border-[#577399] transition-colors
                  "
                />
                <p className="mt-1 text-right text-xs text-[#b9baa3]/40">
                  {name.length}/{MAX_NAME_LENGTH}
                </p>
              </div>

              {/* Description */}
              <div>
                <label
                  htmlFor={descId}
                  className="block text-sm font-semibold text-[#f7f7ff] mb-1.5"
                >
                  Description <span className="font-normal text-[#b9baa3]/50">(optional)</span>
                </label>
                <textarea
                  id={descId}
                  value={description}
                  onChange={(e) => { setDescription(e.target.value); setSaveSuccess(false); }}
                  maxLength={MAX_DESCRIPTION_LENGTH}
                  rows={4}
                  disabled={isLoading}
                  className="
                    w-full rounded-lg border border-slate-700/60 bg-slate-950
                    px-4 py-2.5 text-sm text-[#f7f7ff] resize-none
                    disabled:opacity-50
                    focus:outline-none focus:ring-2 focus:ring-[#577399]
                    focus:border-[#577399] transition-colors
                  "
                />
                <p className="mt-1 text-right text-xs text-[#b9baa3]/40">
                  {description.length}/{MAX_DESCRIPTION_LENGTH}
                </p>
              </div>
            </div>
          </section>

          {/* Curses! Campaign Frame toggle */}
          <section
            aria-label="Curses! content settings"
            className="rounded-xl border border-coral-400/30 bg-slate-900/80 p-6 shadow-card-fantasy space-y-3"
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-serif text-lg font-semibold text-[#f7f7ff]">
                  Curses! Campaign Frame
                </h2>
                <p className="text-sm text-[#b9baa3]/50 mt-0.5">
                  Enable Curses! homebrew content for this campaign (Faction Favors, extra conditions, etc.).
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={cursesContent}
                onClick={() => { setCursesContent((v) => !v); setSaveSuccess(false); }}
                className={[
                  "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full",
                  "border-2 transition-colors duration-200",
                  "focus:outline-none focus:ring-2 focus:ring-coral-400 focus:ring-offset-2 focus:ring-offset-slate-900",
                  cursesContent
                    ? "border-coral-400 bg-coral-400"
                    : "border-slate-600 bg-slate-700",
                ].join(" ")}
              >
                <span
                  aria-hidden="true"
                  className={[
                    "pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transition-transform duration-200",
                    cursesContent ? "translate-x-5" : "translate-x-0",
                  ].join(" ")}
                />
              </button>
            </div>
            {!cursesContent && (
              <p className="text-xs text-[#b9baa3]/40 leading-snug">
                Curses! content (Faction Favors panel, Curses! conditions) will be hidden for all characters in this campaign.
              </p>
            )}
          </section>

          {/* Schedule editor */}
          <ScheduleEditor schedule={schedule} onChange={setSchedule} />

          {/* Error */}
          {updateMutation.isError && (
            <div id={formErrorId} role="alert" className="rounded-lg border border-[#fe5f55]/40 bg-[#fe5f55]/10 px-4 py-3">
              <p className="text-sm text-[#fe5f55]">
                {updateMutation.error?.message ?? "Failed to save changes."}
              </p>
            </div>
          )}

          {/* Success */}
          {saveSuccess && (
            <div role="status" aria-live="polite" className="rounded-lg border border-green-700/40 bg-green-900/20 px-4 py-3">
              <p className="text-sm text-green-400">Changes saved successfully.</p>
            </div>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={!canSave}
              aria-describedby={updateMutation.isError ? formErrorId : undefined}
              className="
                rounded-lg px-6 py-2.5 font-semibold text-sm
                bg-[#577399] text-[#f7f7ff]
                hover:bg-[#577399]/80
                disabled:opacity-40 disabled:cursor-not-allowed
                transition-colors shadow-sm
                focus:outline-none focus:ring-2 focus:ring-[#577399]
                focus:ring-offset-2 focus:ring-offset-slate-900
              "
            >
              {updateMutation.isPending ? (
                <span className="flex items-center gap-2">
                  <span aria-hidden="true" className="h-3.5 w-3.5 animate-spin rounded-full border border-[#f7f7ff] border-t-transparent" />
                  Saving…
                </span>
              ) : (
                "Save Changes"
              )}
            </button>
          </div>
        </form>

        {/* Danger zone */}
        <section
          aria-label="Danger zone"
          className="rounded-xl border border-[#fe5f55]/30 bg-slate-900/80 p-6 space-y-4"
        >
          <h2 className="font-serif text-lg font-semibold text-[#fe5f55]">
            Danger Zone
          </h2>
          <p className="text-sm text-[#b9baa3]/60">
            Permanently deletes this campaign and removes all members. This cannot be undone.
          </p>

          {deleteMutation.isError && (
            <div id={delErrorId} role="alert" className="rounded-lg border border-[#fe5f55]/40 bg-[#fe5f55]/10 px-4 py-3">
              <p className="text-sm text-[#fe5f55]">
                {deleteMutation.error?.message ?? "Failed to delete campaign."}
              </p>
            </div>
          )}

          {!showDeleteConfirm ? (
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              className="
                rounded-lg px-5 py-2.5 text-sm font-semibold
                border border-[#fe5f55]/50 text-[#fe5f55]
                hover:bg-[#fe5f55]/10
                transition-colors
                focus:outline-none focus:ring-2 focus:ring-[#fe5f55]
                focus:ring-offset-2 focus:ring-offset-slate-900
              "
            >
              Delete Campaign
            </button>
          ) : (
            <div
              role="alertdialog"
              aria-label="Confirm campaign deletion"
              className="rounded-lg border border-[#fe5f55]/40 bg-[#fe5f55]/10 p-4 space-y-3"
            >
              <p className="text-sm font-semibold text-[#fe5f55]">
                Are you absolutely sure? This will permanently delete{" "}
                <strong>&ldquo;{campaign?.name}&rdquo;</strong> and cannot be undone.
              </p>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleteMutation.isPending}
                  aria-describedby={deleteMutation.isError ? delErrorId : undefined}
                  className="
                    rounded-lg px-5 py-2.5 text-sm font-semibold
                    bg-[#fe5f55] text-white
                    hover:bg-[#fe5f55]/80
                    disabled:opacity-50 disabled:cursor-wait
                    transition-colors
                    focus:outline-none focus:ring-2 focus:ring-[#fe5f55]
                  "
                >
                  {deleteMutation.isPending ? (
                    <span className="flex items-center gap-2">
                      <span aria-hidden="true" className="h-3.5 w-3.5 animate-spin rounded-full border border-white border-t-transparent" />
                      Deleting…
                    </span>
                  ) : (
                    "Yes, Delete Forever"
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="
                    rounded-lg px-4 py-2.5 text-sm font-medium
                    border border-slate-700/60 text-[#b9baa3]/60
                    hover:border-slate-600 hover:text-[#b9baa3]
                    transition-colors
                    focus:outline-none focus:ring-2 focus:ring-[#577399]
                  "
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
