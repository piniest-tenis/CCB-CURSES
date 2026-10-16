# Remediation Plan — Manifest Counter (False Positive) & Token Tracker Eligibility Audit

**Date:** 2026-10-01
**Status:** Proposed
**Scope:** `frontend/src/lib/tokenUtils.ts`, `frontend/src/components/character/DomainLoadout.tsx`, `shared/src/types.ts`, `backend/src/gamedata/handler.ts`, ingestion pipeline.

## Reported symptom

"Manifest ability has a counter for tokens when it doesn't need to."

"Manifest" = `(Level 3) Manifesting ★` (Oddity domain). Its card text is a once-per-rest ability with a roleplay curse; it has **no token pool**.

## Root cause

`cardHasTokens` (`frontend/src/lib/tokenUtils.ts:18-25`) returns `true` when **any** of:

```ts
card.isCursed || card.tokenConfig !== undefined || cardId in cardTokens
```

`isCursed` is set for **every** ★ card (parsed from the filename in `ingestion/src/parsers/DomainCardParser.ts`). `Manifesting ★` is cursed, so it gets a `TokenTracker` even though it has no token mechanic. The `card.isCursed` clause was intended to surface tokens for cursed cards (e.g. linked-curse token pools like Inventor), but it over-applies to tokenless cursed cards.

Additionally, `toDomainCard` in `backend/src/gamedata/handler.ts:199-215` does **not** serialize `tokenConfig`, so `card.tokenConfig` is always `undefined` today — the only effective trigger is `isCursed`. This is why the bug is so broad.

## Correct rule

A `TokenTracker` should render only when a card has a **genuine token pool** (a spendable/generatable pool of tokens), not merely because it is cursed.

Recommended `cardHasTokens`:

```ts
export function cardHasTokens(
  card: DomainCard | undefined,
  cardTokens: Record<string, number>,
  cardId: string,
): boolean {
  if (!card) return false;
  return card.tokenConfig !== undefined || cardId in cardTokens;
}
```

The `cardId in cardTokens` fallback preserves the tracker for any card that already has tokens persisted (data hygiene during the transition). Cursed-but-tokenless cards (Manifesting ★, and others below) will no longer render a tracker.

## Why Manifest got the counter (context)

The token tracker visibility logic was introduced alongside the community/card token system. The `card.isCursed` clause was a heuristic meant to expose token pools on cursed cards, but the actual per-card `tokenConfig` was never wired through ingestion → gamedata → frontend. With `tokenConfig` unpopulated, `isCursed` became the *only* real trigger and swept in every ★ card.

## Full audit of tokenless-but-cursed cards (should NOT show a counter)

These ★ / ★↔ cards are cursed but have **no token pool on themselves** — they should render no `TokenTracker`:

- `(Level 3) Manifesting ★` (Oddity) — once-per-rest ability + roleplay curse.
- `(Level 4) Time-Bent ★ ↔` (Oddity) — own ability is "once per scene"; its curse *adds tokens to Inventor*, it does not hold its own pool.
- `(Level 3) Performer ★ ↔`, `(Level 3) Universalist ★ ↔`, `(Level 4) Orator ★ ↔`, `(Level 4) Writer ★ ↔` (Artistry) — token grants are to other cards / no self-pool where confirmed tokenless.
- `(Level 4) Mad ★ ↔`, `(Level 4) Possessed ★ ↔` (Oddity) — tokenless (confirm against card text before finalizing).
- `(Level 1) Divine Grace ★`, `(Level 2) Benevolence ★` (Faithful) — Benevolence grants a token to an *ally* (tracked by the ally, not this card).
- `(Level 1) Whispered Thoughts ★`, `(Level 2) Three Card Shuffle ★`, etc. — see note below; only those with a genuine self-pool should keep a tracker.

> This list is illustrative. The definitive determination per card is: does the card text say it **places/gains/holds/spends tokens on itself**? If not, no tracker. See the companion audit in `missing-counters.md` for the positive list.

## Token-like but NOT a spendable pool (no counter as a "pool")

These use a token as a *curse counter*, not a spendable pool. They should either render no token tracker or a distinct "curse counter" treatment (out of scope for this fix; do not reuse `TokenTracker`):

- `(Level 1) Conjured Weapon ★` / `Teleport ★` (Weird) — escalation counter ("put a token … roll d12; if result < tokens …").
- `(Level 3) Profundity ★` (Artistry) — curse debt ("mark Stress for every token on long rest, then clear").
- `(Level 2) Benevolence ★` (Faithful) — grants an ally a token (not self-tracked).

## Remediation steps

1. **Update `cardHasTokens`** (`frontend/src/lib/tokenUtils.ts`) to remove the `card.isCursed` clause (use `tokenConfig` + `cardId in cardTokens` only).
2. **Wire `tokenConfig` end-to-end** so the eligible cards (see `missing-counters.md`) actually receive a config:
   - `shared/src/types.ts` — `DomainCard.tokenConfig` already exists.
   - `ingestion` — parse `token_config` frontmatter (or a curated map) and emit `tokenConfig` per card.
   - `backend/src/gamedata/handler.ts` — serialize `record.tokenConfig` in `toDomainCard`.
3. **Update `tokenUtils` tests** (`frontend/src/lib/__tests__/tokenUtils.test.ts`) to assert that a cursed-but-tokenless card returns `false` and a `tokenConfig` card returns `true`.
4. **Regression check** — the cards that *should* have trackers (Research, Inventor, Theoretical Magic, etc.) must still render after the change; verify against the positive list in `missing-counters.md`.

## Verification

- Loadout with `Manifesting ★` → no `Tokens` row, no pips.
- Loadout with `Inventor ★ ↔` → token tracker renders with cap = Knowledge, long-rest clear.
- Loadout with `Research` → token tracker renders (see `research-token-reset.md`).
- Any card that already has persisted `cardTokens` continues to render its tracker during transition.

## References

- `frontend/src/lib/tokenUtils.ts:18-25` — `cardHasTokens`
- `frontend/src/components/character/DomainLoadout.tsx:1020-1030` — TokenTracker render gate
- `backend/src/gamedata/handler.ts:199-215` — `toDomainCard` (missing `tokenConfig`)
- `ingestion/src/parsers/DomainCardParser.ts:66-74` — `isCursed`/`isLinkedCurse` parsing
- `markdown/Domains/Oddity/(Level 3) Manifesting ★.md` — tokenless cursed card
