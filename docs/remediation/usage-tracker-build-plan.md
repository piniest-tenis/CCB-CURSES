# Build Plan — Usage / Exhaustion Tracker

**Date:** 2026-10-01
**Status:** Proposed
**Scope:** `shared/src/types.ts`, `backend/src/characters/helpers.ts`, `backend/src/characters/handler.ts`, `frontend/src/lib/usageUtils.ts` (new), `frontend/src/components/character/UsageTracker.tsx` (new), `frontend/src/components/character/DomainLoadout.tsx`, character sheet feature sections, `frontend/src/components/character/DowntimeModal.tsx`.

## Goal

Add a "usage tracker" so players can mark an ability, domain card, or class feature as **used/exhausted** (e.g. "once per rest / session / scene"), and reset it. The user requested: *"a check marker or something of that nature that we can use to signify that we already exhausted an ability."*

### Requirements

- A mechanic to **"use"** (mark exhausted) and a mechanic to **"reset"**.
- **Rest-reset features** auto-reset when the rest action is taken.
- **Scene/session-reset features** are reset manually by the user.

## Design summary (from UX + visual design)

- **Cognitive model:** a feature is either *available* or *spent*, with a **cadence** telling you when it returns.
- **One motif ("Seal Chip"):** a single toggle pill — empty circle `○` + "Mark used" when available; gold `✓` + "Used — tap to reset" when exhausted. Parent card dims + desaturates and strikes through the title.
- **Frequency tag:** gold pill with `⟳ REST` (auto-reset) vs bare slate text `SCENE` / `SESSION` (manual reset).
- **Single button** performs both mark and reset (toggle), matching `AuraToggle`.

---

## 1. Data model

### 1.1 Static metadata (`shared/src/types.ts`)

```ts
export type UsageFrequency =
  | "none"                // not tracked — no UI
  | "once-per-rest"       // any rest (short OR long)
  | "once-per-short-rest" // short rest (and long rest superset)
  | "once-per-long-rest"  // long rest only
  | "once-per-scene"      // manual reset only
  | "once-per-session";   // manual reset only
```

Add `usageFrequency?: UsageFrequency` to:
- `DomainCard`
- `GrimoireAbility`
- `ClassFeature`
- `NamedFeature`

### 1.2 Runtime state (`shared/src/types.ts`)

Sparse presence map (mirrors `cardTokens` / `activeAuras`):

```ts
export interface UsageEntry {
  frequency: UsageFrequency;   // denormalized at mark-time
  usedAt?: string;             // ISO timestamp
}
export type UsageState = Record<string, UsageEntry>;
```

On `Character` add:

```ts
usage: UsageState; // default {}
```

> Frequency is denormalized into the entry so the backend's pure `applyRest`/`applyAction` never needs to load card/class data (same pattern as `swap-loadout-card` passing `isLinkedCurse`/`recallCost`).

### 1.3 Stable `usageKey` scheme

| Entity | Key |
|---|---|
| Domain card (whole) | `{cardId}` (e.g. `Valiance/aura-of-bravery`) |
| Grimoire ability | `{cardId}#grimoire:{index}` (0-based) |
| Class feature | `class:{classId}:{feature.name}` |
| Subclass feature | `subclass:{subclassId}:{feature.name}` |
| Hope feature | `hope:{classId}` |
| Multiclass class feature | `class:{multiclassClassId}:{feature.name}` |

Generate keys from one shared helper (`usageKeyFor*` in `usageUtils.ts`) so they never drift.

---

## 2. Frequency detection (prose → metadata bridge)

Until ingestion emits `usageFrequency`, use a shared heuristic in `frontend/src/lib/usageUtils.ts` (with a backend/shared twin):

```ts
export function detectUsageFrequency(text: string): UsageFrequency {
  const t = text.toLowerCase();
  if (/(once|twice|three times)\s+per\s+long\s+rest/.test(t)) return "once-per-long-rest";
  if (/(once|twice)\s+per\s+short\s+rest/.test(t)) return "once-per-short-rest";
  if (/per\s+long\s+rest/.test(t)) return "once-per-long-rest";
  if (/per\s+short\s+rest/.test(t)) return "once-per-short-rest";
  if (/(once|twice)\s+per\s+rest|\bper\s+rest\b/.test(t)) return "once-per-rest";
  if (/(once|twice)\s+per\s+scene|\bper\s+scene\b/.test(t)) return "once-per-scene";
  if (/(once|twice)\s+per\s+session|\bper\s+session\b/.test(t)) return "once-per-session";
  return "none";
}
```

> Known limitation: "twice/N times per X" is treated as `once-per-X` for this release (binary tracker). Surface prose unchanged; label can read `1+/REST` if desired.

---

## 3. Backend changes

### 3.1 `backend/src/characters/helpers.ts`

Extend `ActionId`:

```ts
| "mark-usage"
| "clear-usage"
| "reset-rest-usages"
```

Extend `ActionParams`:

```ts
usageKey?: string;
frequency?: UsageFrequency;
```

New `applyAction` cases:

```ts
case "mark-usage": {
  const usageKey = params.usageKey;
  const frequency = params.frequency;
  if (!usageKey) invalidAction("usageKey is required for mark-usage", "usageKey");
  if (!frequency || frequency === "none")
    invalidAction("frequency is required for mark-usage", "frequency");
  return {
    ...character,
    usage: {
      ...(character.usage ?? {}),
      [usageKey]: { frequency, usedAt: new Date().toISOString() },
    },
  };
}

case "clear-usage": {
  const usageKey = params.usageKey;
  if (!usageKey) invalidAction("usageKey is required for clear-usage", "usageKey");
  const next = { ...(character.usage ?? {}) };
  delete next[usageKey];
  return { ...character, usage: next };
}

case "reset-rest-usages": {
  const restType = params.restType;
  if (restType !== "short" && restType !== "long")
    invalidAction("restType is required for reset-rest-usages", "restType");
  const next = { ...(character.usage ?? {}) };
  for (const [key, entry] of Object.entries(next)) {
    if (usageClearsOn(entry.frequency, restType)) delete next[key];
  }
  return { ...character, usage: next };
}
```

Helper:

```ts
export function usageClearsOn(frequency: UsageFrequency, restType: RestType): boolean {
  if (frequency === "none") return false;
  if (restType === "short")
    return frequency === "once-per-rest" || frequency === "once-per-short-rest";
  return (
    frequency === "once-per-rest" ||
    frequency === "once-per-short-rest" ||
    frequency === "once-per-long-rest"
  );
}
```

`once-per-scene` / `once-per-session` are **never** cleared by rest.

### 3.2 `backend/src/characters/handler.ts`

- Add `"mark-usage"`, `"clear-usage"`, `"reset-rest-usages"` to the action id enum/zod schema.
- Normalize `usageKey` / `frequency` in the params mapping (mirror `restType` normalization at `handler.ts:1628-1631`).
- Add `usage: {}` to the character-creation default object.
- Add `usage: {}` to zod `CharacterSchema`/patch schema and to `enrichCharacter` if it enumerates fields.

### 3.3 Fixtures/tests

- Add `usage: {}` to pregen fixtures (`shared/src/data/pregenCharacters.ts`) and backend/ingestion test fixtures.
- Unit tests in `backend/tests/unit/characters.helpers.test.ts`:
  - `mark-usage` sets an entry; `clear-usage` removes it.
  - `reset-rest-usages` short clears `once-per-rest` + `once-per-short-rest` only.
  - `reset-rest-usages` long also clears `once-per-long-rest`; never clears scene/session.

---

## 4. Frontend changes

### 4.1 `frontend/src/lib/usageUtils.ts` (new)

- `detectUsageFrequency(text)`
- `usageKeyForCard(cardId)`, `usageKeyForGrimoireAbility(cardId, index)`, `usageKeyForClassFeature(classId, name)`, `usageKeyForSubclassFeature(subclassId, name)`, `usageKeyForHopeFeature(classId)`.

### 4.2 `frontend/src/components/character/UsageTracker.tsx` (new)

Props:

```ts
interface UsageTrackerProps {
  characterId: string;
  usageKey: string;
  frequency: UsageFrequency;   // "none"/undefined → render null
  exhausted: boolean;          // character.usage[usageKey] != null
  label: string;
  variant?: "pill" | "inline";
  onMutated?: () => void;
}
```

Rendering:
- Frequency tag (left) + Seal Chip toggle (right).
- Frequency `⟳ REST`/`SHORT REST`/`LONG REST` = gold pill; `SCENE`/`SESSION` = bare slate text (manual reset).
- Seal Chip uses `useActionButton(characterId)`; fires `mark-usage` (available → exhausted) or `clear-usage` (exhausted → available), passing `usageKey` + `frequency`.
- `role="switch"` / `aria-pressed`, `aria-label="Mark {label} as used (once per rest)"`, and a `role="status" aria-live="polite"` confirmation line.
- Reuse `InlineActionError` for errors.

### 4.3 Seal Chip visual treatment

**Available:**
```
inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold
min-h-[44px] min-w-[6.5rem] transition-all duration-150
focus:outline-none focus:ring-2 focus:ring-gold-500
border border-gold-700/50 bg-gold-900/10 text-parchment-300
hover:border-gold-500/70 hover:bg-gold-900/20 hover:text-parchment-100
```
Glyph `○`, label `Mark used`.

**Exhausted:**
```
border border-burgundy-700/60 bg-burgundy-900/40 text-burgundy-300
hover:border-burgundy-500/70 hover:bg-burgundy-900/55
```
Glyph `✓` (slight glow `shadow-[0_0_6px_rgba(142,30,62,0.35)]`), label `Used — tap to reset`.

**Exhausted card container:** `opacity-75 saturate-[0.85] border-slate-600`, title `line-through decoration-slate-500/70 decoration-[1.5px] text-parchment-300`, plus a `USED` badge.

**Frequency tag (auto):** `inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider bg-gold-900/20 border border-gold-800/40 text-gold-500` with `⟳` glyph.
**Frequency tag (manual):** `text-[11px] uppercase tracking-wider text-parchment-500`.

**Micro-interactions:** hover border brighten; `active:scale-[0.97]`; spinner swap on pending; `motion-reduce:transition-none motion-reduce:animate-none`; no infinite pulse animations.

### 4.4 Placement

- **Domain cards (non-grimoire):** inline in `LoadoutCardSlot`, in a new footer cluster below the description preview, ordered: divider → `UsageTracker` → `TokenTracker` → `AuraToggle`, using `space-y-2`.
- **Domain card detail sidebar:** a `UsageTracker` per card (and per grimoire ability, in the grimoire loop).
- **Grimoire slot aggregate:** show `N/M used` when any grimoire ability is exhausted.
- **Class features / hope / subclass / multiclass:** one `UsageTracker` per feature card, below the description, near any existing action button.

### 4.5 Manual reset for scene/session

- The Seal Chip itself is the manual reset (tap toggles back).
- The exhausted chip carries a hint: `"Resets on rest"` (rest frequencies) vs `"Reset manually"` (scene/session).
- Optional phase 2: a "Reset all" control in the Features section header firing `clear-usage-frequency`.

### 4.6 Rest auto-reset integration

- `DowntimeModal` fires `reset-rest-usages { restType }` when the player presses **Done** (or confirms the rest), so rest-reset usages clear while scene/session stay exhausted.
- Do **not** touch HP/stress/hope here (those remain the granular rest moves).

> Note: the existing `/rest` endpoint only applies community token effects today. Phase 2 recommends unifying rest into `applyRest` (also closes the domain-card token-rest gap from `missing-counters.md`). Not required for the usage tracker to ship.

---

## 5. Accessibility (WCAG 2.2)

1. Touch target ≥ 44×44px.
2. State never conveyed by color alone — always pair with text + `aria-pressed`.
3. `role="switch"` + `aria-pressed`; `aria-label` includes name + cadence.
4. `focus-visible:ring-2 ring-gold-500`.
5. `role="status" aria-live="polite"` confirmation; errors via `InlineActionError` (`role="alert"`).
6. Native `<button>` (Enter/Space); preserve sidebar Escape/tab-trap.
7. Keep title/control contrast ≥ 4.5:1 even on the dimmed card.
8. `motion-reduce` honored; no >3Hz flashing.
9. Viewer/public mode: wrap in `DisabledInViewerMode` (state visible, controls disabled).

---

## 6. Edge cases

| Case | Decision |
|---|---|
| Grimoire (many abilities) | Per-ability keys + trackers in sidebar; aggregate on slot |
| Linked-curse (↔) | Clear a card's usage keys when swapped out of loadout |
| Auras | Independent of usage; render both; rest resets usage but leaves aura off |
| Token pools | Orthogonal to usage; keep both trackers |
| Cursed (★) | Usage is additive and independent of token-tracker visibility |
| Viewer mode | Disabled wrapper |
| Legacy characters | `usage` defaults to `{}` (backward compatible) |
| "Twice per rest" | Treated as once-per-X; future N-use counter upgrade |

---

## 7. Phased implementation

- **Phase 1 (ship):** `usage` field + `mark-usage`/`clear-usage`/`reset-rest-usages` + `UsageTracker` component + prose heuristic + inline placement (domain cards + class features) + manual reset + rest auto-reset from `DowntimeModal`.
- **Phase 2:** unify rest into `applyRest` (fix domain-card token-rest gap); bulk scene/session reset; grimoire aggregate polish.
- **Phase 3:** N-use counters; "used at" display; ingestion emitting `usageFrequency`.

---

## Acceptance tests

- Mark a once-per-rest feature used → card dims, title struck through, `USED` badge; persists on reload.
- Tap again → resets to available.
- Short rest → once-per-rest and once-per-short-rest clear; long-rest/scene/session remain.
- Long rest → once-per-long-rest also clears; scene/session remain exhausted.
- Grimoire: each ability toggles independently; slot aggregate updates.
- Viewer mode: state visible, controls disabled with tooltip.
- Keyboard: Tab to toggle, Enter/Space toggles; screen reader announces state.
- Touch: ≥ 44px targets on mobile.

## References

- `shared/src/types.ts` — `Character` (cardTokens, activeAuras, classFeatureState)
- `backend/src/characters/helpers.ts` — `applyAction`, `applyRest`, `ActionId`/`ActionParams`
- `backend/src/characters/handler.ts:1628-1631` — params normalization
- `frontend/src/components/character/DomainLoadout.tsx` — LoadoutCardSlot/TokenTracker/AuraToggle
- `frontend/src/components/character/DowntimeModal.tsx` — rest flow
- `frontend/src/components/character/TrackersPanel.tsx` — tracker conventions
