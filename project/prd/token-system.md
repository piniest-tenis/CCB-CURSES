# PRD: Unified Token System

**Status:** Ready for Implementation  
**Area:** Character Sheet — Domain Cards, Community Traits  
**Labels:** `ready-for-agent`  
**ADRs:** `docs/adr/0001`, `0002`, `0003`

---

## Problem Statement

Daggerheart SRD contains over 40 domain cards and several community traits whose mechanics rely on token tracking — a per-card resource that fills to a stat-derived cap and is spent during play. The current character sheet only shows a token tracker on cursed domain cards (★ suffix) or cards that already have tokens placed. Non-cursed cards with token mechanics (e.g. Sharpshooter, Ethereal Buddy, Inspiration) show no tracker at all, leaving players to manage counts outside the app. No cap is enforced — the system allows adding tokens indefinitely even when the card's rules say "tokens equal to your Presence." Token fills and clears that should happen automatically on rest (e.g. "after a long rest, add tokens equal to your Presence") require manual housekeeping by the player. The `POST /rest` endpoint exists but is never called by the frontend. Players cannot use the character sheet as a complete play surface without significant manual bookkeeping.

---

## Solution

Implement a unified token system across the character sheet that:

1. **Auto-detects** which domain cards and community traits use token mechanics by parsing SRD description text at ingestion time, storing `TokenConfig` on the card record in DynamoDB.
2. **Resolves stat-linked caps** at runtime (e.g. "tokens equal to your Presence" resolves to the character's current Presence value).
3. **Enforces caps** in the backend — `add-token` rejects when at cap.
4. **Automatically processes token Rest Actions** when a rest fires — `applyRest` fills or clears tokens for all cards with a matching trigger. The DowntimeModal calls `POST /rest` to trigger this.
5. **Surfaces token trackers** on every card with token mechanics, not just cursed cards.
6. **Extends to community traits** using the same token infrastructure.

---

## User Stories

1. As a player, I want a token tracker to appear on every domain card that uses tokens, so that I don't have to track resources on paper.
2. As a player, I want the token tracker to show the maximum number of tokens I can hold, so that I know when I've reached the cap.
3. As a player, I want the maximum token count to reflect my current character stats automatically, so that I don't have to calculate it myself.
4. As a player, I want to be prevented from adding tokens beyond the cap, so that I can't accidentally cheat.
5. As a player, I want tokens to fill or clear automatically when I take a rest, so that I never have to do token housekeeping manually.
6. As a player, I want tokens to fill to the correct cap after a long rest, so that I'm always ready to play after resting.
7. As a player, I want tokens that clear on long rest to be cleared automatically, so that curse mechanics work correctly without manual intervention.
8. As a player, I want to spend tokens one at a time with a decrement button, so that I can track individual expenditures during a scene.
9. As a player, I want to add tokens manually one at a time, so that I can track tokens gained mid-scene (e.g. on a roll success).
10. As a player, I want to clear all tokens from a card with a single button, so that I can handle one-off clear mechanics.
11. As a player, I want the token tracker to show a visual pip row, so that I can read my token count at a glance.
12. As a player, I want the pip row to scale to the current cap, so that the display doesn't show empty pips beyond what the card allows.
13. As a player, I want a token tracker on my community trait card when it uses tokens, so that community-based mechanics are tracked in the same place.
14. As a player, I want token state to persist across page reloads, so that I don't lose counts if I navigate away.
15. As a player, I want token mutations to be reflected in real time across multiple browser tabs, so that the session stays in sync.
16. As a player, I want to see a label indicating which stat drives the token cap (e.g. "Presence"), so that I understand why the cap is a given number.
17. As a player, I want spending the last token to be allowed (count goes to 0), so that cards that say "spend your last token" are playable.
18. As a player, I want the decrement button disabled at 0, so that I can't accidentally go negative.
19. As a player, I want the increment button disabled at cap, so that I can't accidentally exceed the card's limit.
20. As a player, I want the token tracker to remain on a card even after I clear to 0, so that I can add tokens again without the UI disappearing.
21. As a GM, I want to view a player's token counts on a shared campaign view, so that I can track party resources without interrupting the session.
22. As a homebrew author, I want to set a token configuration on a custom domain card, so that homebrew cards with token mechanics work like SRD cards.
23. As a homebrew author, I want to specify a fixed numeric cap instead of a stat-linked cap, so that homebrew cards with flat token limits are supported.
24. As a homebrew author, I want to specify the rest action for my card's tokens (fill on long rest, clear on long rest, etc.), so that homebrew token mechanics are fully playable without manual housekeeping.
25. As a player, I want token trackers to only appear on cards that actually use tokens, so that cards without token mechanics stay uncluttered.

---

## Implementation Decisions

### 1. TokenConfig Schema (Shared)

New `TokenConfig` type added to shared types. Single source of truth for token behavior on any card. `'spellcast'` is a special key that resolves via the character's denormalized `spellcastTrait` field. `'tier'` is a special key that resolves via `tierForLevel(character.level)`. Both are never stored as numbers — the resolution happens at runtime in the Token Cap Resolver.

```ts
// schema shape decision
interface TokenConfig {
  maxStat:
    | 'agility' | 'strength' | 'finesse' | 'instinct' | 'presence' | 'knowledge'
    | 'level' | 'tier' | 'spellcast'
    | number   // fixed numeric cap
    | null;    // uncapped — tracker shown but no cap enforced
  restAction?: {
    trigger: 'long-rest' | 'short-rest' | 'session-start';
    effect: 'fill-to-cap' | 'clear' | 'add-1';
  };
}
```

`tokenConfig?: TokenConfig` added to `DomainCard` and `CommunityData` types.

### 2. spellcastTrait Denormalized onto Character

`spellcastTrait: CoreStatName | null` is added to the `Character` type and written at character creation and subclass change (same events that write `subclassId`). The frontend builder includes it in the PUT payload. The level-up handler accepts it in the request body alongside `newSubclassId` rather than fetching `ClassData` from DynamoDB. This keeps `applyAction` and `applyRest` pure. See ADR 0001.

### 3. TokenExtractor — Deep Ingestion Module

Pure function: `(descriptionText: string) => TokenConfig | null`. Runs during SRD ingestion (`DomainCardParser`), output stored on the `DomainCard` record in DynamoDB. Also runs against `CommunityData.traitDescription` during community ingestion.

Detection uses action-verb patterns (not bare "token"): `place a token`, `spend a token`, `tokens equal`, `a number of tokens`, `tokens to this card`, `add N tokens`, `two/three tokens`. Cards matching these patterns but with no stat reference emit `{ maxStat: null }`.

Stat normalization map: display name → `CoreStatName | 'level' | 'tier' | 'spellcast'`. Compound formulas ("level + cursed cards in loadout") → `{ maxStat: null }`.

Rest trigger patterns: `"after a long rest"` / `"when you take a long rest"` → `long-rest`; `"at the beginning of a session"` / `"at the start of a session"` → `session-start`. No SRD cards use short-rest fill patterns — `short-rest` trigger is schema-only for homebrew.

Rest effect patterns: `"place/add/gain N tokens"` + trigger → `fill-to-cap`; `"clear"` + trigger → `clear`. "Once per rest" single-use cards → `{ maxStat: 1, restAction: { trigger: 'long-rest', effect: 'fill-to-cap' } }`.

`TokenConfig` is stored on `DomainCard` in DynamoDB, not in `srd-index.json`. See ADR 0003.

### 4. Token Cap Resolver — Deep Utility Module

Pure function: `(config: TokenConfig, character: Character) => number | null`.

- Core stat names → `character.coreStats[maxStat]`
- `'level'` → `character.level`
- `'tier'` → `tierForLevel(character.level)`
- `'spellcast'` → `character.coreStats[character.spellcastTrait]` (null if `spellcastTrait` is null)
- `number` → returned directly
- `null` → returns `null` (uncapped)

Lives in the shared package — used identically in backend (`applyAction` cap enforcement, `applyRest` token fills) and frontend (UI display).

### 5. Backend Action Changes

**Modified `add-token`:** After incrementing, resolves cap via Token Cap Resolver. Rejects with domain error if `newCount > resolvedCap` (when cap non-null).

**New `fill-tokens` action:** Sets `cardTokens[cardId]` to resolved cap. No-op if `maxStat` is null (uncapped). Called internally by `applyRest` — not a player-facing button.

**`clear-tokens` and `spend-token`:** Unchanged.

All actions remain pure functions in `applyAction`. Token cap resolver injected as a pure dependency.

### 6. applyRest Token Processing

`applyRest` is extended to iterate `character.cardTokens` (and community token keys) and apply Rest Actions for all cards where `tokenConfig.restAction.trigger` matches the rest type. For each match:
- `fill-to-cap` → calls `fill-tokens` logic (sets to resolved cap)
- `clear` → sets to 0
- `add-1` → increments by 1 (uncapped)

`applyRest` needs access to card `TokenConfig` data. The handler fetches `TokenConfig` for all cards in `character.domainLoadout` plus the community token config, and passes a `Record<cardId, TokenConfig>` to `applyRest` — not full card objects. `applyRest` only needs the token config, not names or descriptions. This minimal interface keeps `applyRest` fully testable in isolation. See ADR 0002.

### 7. Frontend: DowntimeModal calls POST /rest

The DowntimeModal currently dispatches individual `clear-stress`/`clear-hp`/`clear-armor` actions without ever calling `POST /rest`. This is fixed: when the player confirms their rest type in the modal, `POST /rest` is called first. `applyRest` processes token Rest Actions server-side. The individual downtime action buttons remain unchanged.

### 8. Token Visibility Rule

Condition for showing `TokenTracker` on a domain card changes from:
> `card.isCursed OR cardId in cardTokens`

to:
> `card.isCursed OR card.tokenConfig !== undefined OR cardId in cardTokens`

### 9. TokenTracker Component Upgrades

Existing component extended (not replaced). New props: `resolvedCap: number | null`, `tokenConfig: TokenConfig | undefined`.

- Displays resolved cap: `"3 / 5 (Presence)"` format when cap and stat name known.
- `+` button disabled when `current >= resolvedCap` (non-null cap).
- `−` button disabled at 0.
- No Refresh button — token fills/clears are automatic on rest. Manual `×` clear button remains.
- Pip row renders exactly `resolvedCap` pips (default 8 when uncapped).

### 10. Community Trait Token Tracking

Community traits gain `tokenConfig` support. Token count stored in `cardTokens` using namespaced key `"community/{communityId}"`. Reuses existing dict and action pathway — no schema migration.

### 11. Equipment Token Support

`SRDWeapon` and armor types gain `tokenConfig?: TokenConfig` field. No SRD entries populate it. Exists for homebrew use only.

### 12. Homebrew Admin UI

Homebrew card editor gains a TokenConfig section: stat dropdown (or "Fixed Number"), numeric cap input, optional rest action trigger + effect selectors.

### 13. Persistence and Real-time Sync

`Character.cardTokens` in DynamoDB unchanged. Real-time sync via existing WebSocket broadcast on character mutation.

---

## Testing Decisions

**What makes a good test:** Asserts external behavior — given inputs, what comes out? No assertions on internal variable names, call order, or implementation structure. Tests written against public interface only.

### TokenExtractor
- Unit tests. Pure function `(text) => TokenConfig | null`.
- Table-driven: one test case per known SRD card text pattern.
- Assert correct `maxStat` and `restAction` for each.
- Assert `null` for text with no token language.
- Assert `{ maxStat: null }` for compound formula text.
- Assert `{ maxStat: 1, restAction: ... }` for "once per rest" text.

### Token Cap Resolver
- Unit tests. Pure function `(config, character) => number | null`.
- Cases: each of the 6 core stat names, `'level'`, `'tier'`, `'spellcast'`, fixed number, null.
- Assert correct integer from a character fixture for each case.
- Assert null when `spellcastTrait` is null and maxStat is `'spellcast'`.

### Backend `applyAction` helpers
- Unit tests. Pattern: pass `Character` + action → assert returned `Character`.
- `add-token`: assert increment; assert rejection at cap; assert first-token (no prior entry) case.
- `fill-tokens`: assert sets to resolved cap; assert no-op on uncapped card.
- `clear-tokens`: assert sets to 0 (existing).
- `spend-token`: assert decrement; assert rejection at 0 (existing).

### `applyRest` token processing
- Unit tests. Pass `Character` with `cardTokens` and injected card configs → assert `cardTokens` after rest.
- Long rest, fill-to-cap: assert token count equals resolved cap.
- Long rest, clear: assert token count is 0.
- Short rest trigger on long rest: assert no change.
- Uncapped card with no restAction: assert no change.

### TokenTracker UI
- Component tests (React Testing Library).
- `+` disabled at cap; `−` disabled at 0; pip count matches `resolvedCap`.
- No Refresh button rendered under any props.
- Token count displays correctly with cap label.

### Token visibility rule
- Unit test on `cardHasTokens` logic.
- Assert true for: cursed card, card with `tokenConfig`, card with existing tokens in `cardTokens`.
- Assert false for: plain card with no config and no tokens.

### Community token namespace
- Unit test: key `"community/{communityId}"` used consistently for storage and retrieval.

**Prior art:** Existing `applyAction` tests in backend characters module; existing React component tests in frontend.

---

## Out of Scope

- **Class feature tokens** — `classFeatureState.tokens` is dead code; no SRD class features have token mechanics. Out of scope until a real use case exists.
- **Compound token formulas** — e.g. "tokens equal to your level + cursed cards in loadout." Treated as uncapped (`maxStat: null`) until a formula parser is built.
- **Adversary stat-block tokens** — Slow and Bramble tokens on adversary stat blocks. Separate encounter tracker feature.
- **Session-start token trigger automation** — `session-start` is in the schema for homebrew but has no app event to hook onto. Cards using this trigger will show their token tracker but require manual add on session start.
- **Token transfer between characters** — Ally-targeting token grants are out of scope.
- **Token usage history / analytics.**

---

## Further Notes

- **srd-index.json cleanup:** 24 entries had leaked `einstructions` frontmatter in their `content` field. Fixed by stripping YAML frontmatter blocks from all 211 affected entries. The root cause is that the markdown source files have `einstructions` frontmatter that the `chunk-srd` generation script was not stripping for these entries. The ingestion pipeline's `DomainCardParser` correctly strips frontmatter already.
- **POST /rest was never called:** The DowntimeModal bypassed the rest endpoint entirely. This is fixed as part of this PRD (Q16 decision). The rest endpoint and `applyRest` are fully implemented server-side and just needed to be wired into the frontend.
- **spellcastTrait on level-up:** The level-up request body must include `spellcastTrait` alongside `newSubclassId` when subclass changes. The frontend resolves it from `classData` at the time of selection.
