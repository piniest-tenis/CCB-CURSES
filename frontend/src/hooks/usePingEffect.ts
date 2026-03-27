/**
 * src/hooks/usePingEffect.ts
 *
 * Attaches to the receiving player's side.
 * When triggerPing(fieldKey) is called:
 *   1. Finds the DOM element with data-field-key="<fieldKey>"
 *   2. Scrolls it into view (smooth, centred)
 *   3. Applies .ping-active CSS class for the gold pulse animation
 *   4. Announces the ping to screen readers via an aria-live region
 *   5. Respects prefers-reduced-motion (CSS handles animation: none)
 *
 * The aria-live region is created once as a visually-hidden <div> appended
 * to document.body and reused across calls so there is never more than one.
 */

"use client";

import { useCallback, useEffect, useRef } from "react";

// ─── aria-live region ID ──────────────────────────────────────────────────────

const LIVE_REGION_ID = "daggerheart-ping-live-region";

function getOrCreateLiveRegion(): HTMLElement {
  let el = document.getElementById(LIVE_REGION_ID);
  if (!el) {
    el = document.createElement("div");
    el.id              = LIVE_REGION_ID;
    el.setAttribute("aria-live", "polite");
    el.setAttribute("aria-atomic", "true");
    el.setAttribute("role", "status");
    // Visually hidden but accessible
    Object.assign(el.style, {
      position:   "absolute",
      width:      "1px",
      height:     "1px",
      padding:    "0",
      margin:     "-1px",
      overflow:   "hidden",
      clip:       "rect(0, 0, 0, 0)",
      whiteSpace: "nowrap",
      borderWidth:"0",
    } as CSSStyleDeclaration);
    document.body.appendChild(el);
  }
  return el;
}

// ─── PING_DURATION matches the CSS animation: 1s × 3 iterations ───────────────
const PING_DURATION_MS = 3_000;

// ─── Hook ─────────────────────────────────────────────────────────────────────

export interface UsePingEffectReturn {
  triggerPing: (fieldKey: string, elementName?: string) => void;
}

export function usePingEffect(): UsePingEffectReturn {
  // Track cleanup timers per fieldKey so overlapping pings reset cleanly
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  // Cleanup all timers on unmount
  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      timers.forEach((timer) => clearTimeout(timer));
      timers.clear();
    };
  }, []);

  const triggerPing = useCallback(
    (fieldKey: string, elementName?: string) => {
      if (typeof document === "undefined") return;

      // Find target element via data-field-key attribute
      let el: Element | null;
      try {
        el = document.querySelector(`[data-field-key="${CSS.escape(fieldKey)}"]`);
      } catch {
        el = document.querySelector(`[data-field-key="${fieldKey}"]`);
      }

      if (!el) return;

      // Cancel any in-flight ping for this element
      const existingTimer = timersRef.current.get(fieldKey);
      if (existingTimer) {
        clearTimeout(existingTimer);
        el.classList.remove("ping-active");
      }

      // Scroll into view
      el.scrollIntoView({ behavior: "smooth", block: "center" });

      // Apply ping animation class
      el.classList.add("ping-active");

      // Announce to screen readers
      const liveRegion = getOrCreateLiveRegion();
      const label = elementName ?? fieldKeyToLabel(fieldKey);
      liveRegion.textContent = ""; // force re-announcement if same text
      // RAF ensures the DOM update is a discrete step
      requestAnimationFrame(() => {
        liveRegion.textContent = `GM highlighted ${label}`;
      });

      // Remove class after animation completes
      const timer = setTimeout(() => {
        el!.classList.remove("ping-active");
        timersRef.current.delete(fieldKey);
      }, PING_DURATION_MS);

      timersRef.current.set(fieldKey, timer);
    },
    []
  );

  return { triggerPing };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Convert a field key like "trackers.hp" → "HP tracker"
 * or "stats.agility" → "Agility stat".
 */
function fieldKeyToLabel(fieldKey: string): string {
  const LABELS: Record<string, string> = {
    // ── Tracker slots ──────────────────────────────────────────────────────
    "trackers.hp":                   "HP tracker",
    "trackers.stress":               "Stress tracker",
    "trackers.armor":                "Armor tracker",
    "trackers.hope":                 "Hope tracker",
    "trackers.proficiency":          "Proficiency",
    "trackers.damage":               "Damage Thresholds",
    "trackers.weapons.primary":      "Primary weapon",
    "trackers.weapons.secondary":    "Secondary weapon",
    "trackers.weapons.armor":        "Armor slot",
    "trackers.heritage":             "Heritage Features",
    "trackers.heritage.ancestry1":   "Ancestry feature 1",
    "trackers.heritage.ancestry2":   "Ancestry feature 2",
    "trackers.heritage.community":   "Community feature",
    // ── Stats ──────────────────────────────────────────────────────────────
    "stats.agility":                 "Agility stat",
    "stats.strength":                "Strength stat",
    "stats.finesse":                 "Finesse stat",
    "stats.instinct":                "Instinct stat",
    "stats.presence":                "Presence stat",
    "stats.knowledge":               "Knowledge stat",
    // ── Sheet header ───────────────────────────────────────────────────────
    "sheet.name":                    "character name",
    "sheet.evasion":                 "Evasion",
    "sheet.armor":                   "Armor score",
    "sheet.level":                   "Level",
    "sheet.conditions":              "Conditions",
    "sheet.downtime":                "Downtime / Rest button",
    "sheet.edit":                    "Character Builder",
    "sheet.share":                   "Share link",
    "sheet.experiences":             "Experiences",
    "sheet.notes":                   "Notes",
    // ── Features ───────────────────────────────────────────────────────────
    "features.class":                "Class features",
    "features.subclass":             "Subclass features",
    "features.hope":                 "Hope feature",
    // ── Domain Loadout ─────────────────────────────────────────────────────
    "loadout.domains":               "Domain loadout",
    "loadout.change":                "Change Loadout button",
    "loadout.card.0":                "Loadout card 1",
    "loadout.card.1":                "Loadout card 2",
    "loadout.card.2":                "Loadout card 3",
    "loadout.card.3":                "Loadout card 4",
    "loadout.card.4":                "Loadout card 5",
    // ── Equipment ──────────────────────────────────────────────────────────
    "equipment.gold":                "Gold tracker",
    "equipment.inventory":           "Inventory",
    "equipment.add":                 "Add Equipment button",
    // ── Favors ─────────────────────────────────────────────────────────────
    "favors":                        "Favors",
    // ── Downtime ───────────────────────────────────────────────────────────
    "downtime":                      "Downtime Projects",
  };

  return LABELS[fieldKey] ?? fieldKey.replace(/[._]/g, " ");
}
