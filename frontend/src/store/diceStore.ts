/**
 * src/store/diceStore.ts
 *
 * Zustand store for the 3D dice roller.
 * Manages the roll lifecycle: request → animation → resolve → log.
 *
 * SRD rules applied in resolveRoll:
 *   - Critical: both d12 dice (hope + fear) show the same value (SRD p.14)
 *   - Hope / Fear: shown as die values only — no success/failure judgement
 *     (the system does not know the GM's difficulty target)
 *   - Damage / generic rolls: no outcome classification
 */

import { create } from "zustand";
import type {
  DiceStore,
  RollRequest,
  RollResult,
  DieResult,
  ActionOutcome,
} from "@/types/dice";

// ─── Extended store shape (internal additions) ────────────────────────────────

interface DiceStoreExtended extends DiceStore {
  /** Active campaign id used to scope the BroadcastChannel name. */
  campaignId: string | null;
  /** Set the campaign id (call from CampaignDetailClient on mount). */
  setCampaignId: (id: string | null) => void;
  /**
   * Raw die values to replay on the OBS overlay.
   * Set by playAnimationSeeded; read by DiceRoller (animationOnly mode) to
   * pass as before_roll so the overlay lands on the exact same faces.
   */
  seededValues: number[] | null;
  /**
   * When true, the next resolveRoll call will force a critical outcome by
   * making both hope and fear dice land on the same random value (1–12).
   * Automatically cleared after resolveRoll consumes it.
   */
  forceCrit: boolean;
  /** Set/unset the force-crit flag (called from CharacterPageClient on WS event). */
  setForceCrit: (active: boolean) => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function nanoid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

function classifyOutcome(
  dice: DieResult[],
  total: number,
  difficulty: number | undefined,
  type: RollRequest["type"]
): { outcome?: ActionOutcome; hopeValue?: number; fearValue?: number } {
  if (type !== "action" && type !== "reaction") return {};

  const hopeDie = dice.find((d) => d.role === "hope");
  const fearDie = dice.find((d) => d.role === "fear");

  if (!hopeDie || !fearDie) return {};

  const hope = hopeDie.value;
  const fear = fearDie.value;

  // SRD p.14: Critical — both dice show the same value
  if (hope === fear) {
    return { outcome: "critical", hopeValue: hope, fearValue: fear };
  }

  // Return hope/fear values only — success/failure requires knowing the
  // GM's difficulty target which the client does not track.
  return { hopeValue: hope, fearValue: fear };
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useDiceStore = create<DiceStoreExtended>((set, get) => ({
  // ── State ──────────────────────────────────────────────────────────────────
  isRolling:      false,
  pendingRequest: null,
  stagedRequest:  null,
  lastResult:     null,
  log:            [],
  campaignId:     null,
  seededValues:   null,
  forceCrit:      false,

  // ── setCampaignId ──────────────────────────────────────────────────────────
  setCampaignId: (id: string | null) => set({ campaignId: id }),

  // ── setForceCrit ───────────────────────────────────────────────────────────
  setForceCrit: (active: boolean) => set({ forceCrit: active }),

  // ── stageRoll ──────────────────────────────────────────────────────────────
  // Sets the staged request so the pre-roll modal can display it (Phase 1).
  // Does NOT start the animation — that happens when the user clicks "Roll!".
  stageRoll: (req: RollRequest) => {
    set({ stagedRequest: req });
  },

  // ── clearStagedRoll ────────────────────────────────────────────────────────
  clearStagedRoll: () => {
    set({ stagedRequest: null });
  },

  // ── requestRoll ────────────────────────────────────────────────────────────
  requestRoll: (req: RollRequest) => {
    if (get().isRolling) return; // guard — only one roll at a time
    set({ isRolling: true, pendingRequest: req, stagedRequest: null });

    // Broadcast ROLL_REQUEST so the OBS dice overlay can trigger its own animation
    if (typeof window !== "undefined" && "BroadcastChannel" in window) {
      try {
        const channelName = get().campaignId
          ? `dh-dice-${get().campaignId}`
          : "dh-dice";
        const ch = new BroadcastChannel(channelName);
        ch.postMessage({ type: "ROLL_REQUEST", request: req });
        ch.close();
      } catch {
        // BroadcastChannel not available in this context — ignore
      }
    }
  },

  // ── resolveRoll ────────────────────────────────────────────────────────────
  // Called by DiceRoller once dice.js fires the "result" callback with raw values.
  // rawValues is an array parallel to req.dice (one int per die).
  resolveRoll: (rawValues: number[]) => {
    const { pendingRequest } = get();
    if (!pendingRequest) {
      set({ isRolling: false });
      return;
    }

    const req = pendingRequest;

    // ── Force-crit override ───────────────────────────────────────────────────
    // If the GM armed a force-crit for this character, override the raw values
    // so that both the hope and fear dice show the same random face (1–12).
    // All other dice keep their physics-engine values.
    // The flag is consumed (cleared) immediately so it fires exactly once.
    if (get().forceCrit) {
      set({ forceCrit: false });
      const critValue = Math.floor(Math.random() * 12) + 1; // 1–12 inclusive
      rawValues = rawValues.map((v, i) => {
        const role = req.dice[i]?.role;
        return role === "hope" || role === "fear" ? critValue : v;
      });
    }

    // Build per-die results
    // rawValues come from dice.js get_dice_value(). A value of -1 means the
    // physics engine couldn't determine the face (e.g. die not yet settled or
    // geometry was degenerate). Clamp to minimum 1 — die faces never show < 1.
    const diceResults: DieResult[] = req.dice.map((spec, i) => ({
      size:  spec.size,
      role:  spec.role,
      value: Math.max(1, rawValues[i] ?? 1),
      label: spec.label,
    }));

    // Sum all dice + flat modifier.
    // "disadvantage" dice are SUBTRACTED from the total (SRD p.20).
    const diceSum = diceResults.reduce((acc, d) => {
      return d.role === "disadvantage" ? acc - d.value : acc + d.value;
    }, 0);
    const total    = diceSum + (req.modifier ?? 0);

    // SRD outcome classification
    const { outcome, hopeValue, fearValue } = classifyOutcome(
      diceResults,
      total,
      req.difficulty,
      req.type
    );

    const result: RollResult = {
      id:        nanoid(),
      timestamp: new Date().toISOString(),
      request:   req,
      dice:      diceResults,
      total,
      outcome,
      hopeValue,
      fearValue,
    };

    // Keep log capped at 50 most-recent entries
    set((state) => ({
      isRolling:      false,
      pendingRequest: null,
      lastResult:     result,
      log:            [result, ...state.log].slice(0, 50),
    }));

    // Broadcast to OBS BroadcastChannel so dice-log overlay page receives it
    if (typeof window !== "undefined" && "BroadcastChannel" in window) {
      try {
        const channelName = get().campaignId
          ? `dh-dice-${get().campaignId}`
          : "dh-dice";
        const ch = new BroadcastChannel(channelName);
        ch.postMessage({ type: "ROLL_RESULT", result });
        ch.close();
      } catch {
        // BroadcastChannel not available in this context — ignore
      }
    }
  },

  // ── clearLog ──────────────────────────────────────────────────────────────
  clearLog: () => set({ log: [], lastResult: null }),

  // ── resetRolling ──────────────────────────────────────────────────────────
  resetRolling: () => set({ isRolling: false, pendingRequest: null }),

  // ── playAnimationSeeded ───────────────────────────────────────────────────
  // Visual-only animation driver for the OBS dice overlay.
  // Carries the exact raw die values from the player's completed roll so that
  // DiceRoller can pass them to start_throw_seeded — the overlay's dice land
  // on the same faces as the player's dice.
  // Does NOT broadcast. Expects finishAnimation() when the physics settle.
  playAnimation: (req: RollRequest, rawValues?: number[]) => {
    if (get().isRolling) return;
    set({ isRolling: true, pendingRequest: req, seededValues: rawValues ?? null });
  },

  // ── finishAnimation ───────────────────────────────────────────────────────
  // Clears animation state without computing a result or broadcasting anything.
  finishAnimation: () => set({ isRolling: false, pendingRequest: null, seededValues: null }),
}));
