# Remediation Plan — Domain Card Swapping

**Date:** 2026-10-01
**Status:** Proposed
**Scope:** Frontend `frontend/src/components/character/DomainLoadout.tsx`, `frontend/src/store/characterStore.ts`, `frontend/src/components/character/DowntimeModal.tsx`; Backend `backend/src/characters/helpers.ts`, `backend/src/characters/handler.ts`.

## Reported symptoms

1. "Having some troubles swapping abilities in and out of the vault."
2. "I accidentally deleted my Manifest ability while trying to swap it out for Inventor and I'm unable to get it back."
3. "When I click acquire new card, it currently only lists the level 4 ones as opposed to 4 and under."

## Root causes

### A. Removing a card from the loadout orphans it (card lost)

`removeFromLoadout` in `frontend/src/store/characterStore.ts:317` filters the card out of `domainLoadout` and marks the store dirty, but **does not add it back to `domainVault`**. A subsequent `saveCharacter()` PATCHes the full character to the server, and there is no server-side rule that a removed loadout card must remain in the vault. Result: the card is neither in the loadout nor the vault, so it is effectively "deleted."

This is exactly how the user lost "Manifest" (the `(Level 3) Manifesting ★` card). They likely used the per-slot ✕ **Remove** control (which is destructive) instead of the Swap flow (which properly returns the displaced card to the vault).

### B. Acquire picker only lists cards at exactly the current level

`AcquireCardPicker` (`frontend/src/components/character/DomainLoadout.tsx:216-221`) calls:

```ts
useDomain(domains[0] ?? undefined, characterLevel)
```

`useDomain` (`frontend/src/hooks/useGameData.ts:167`) appends `?level=${level}`, and the backend `getDomainCards` (`backend/src/gamedata/handler.ts:438`) uses the `level-index` GSI with an **equality** condition `#level = :level`. The frontend's own `eligibleCards` filter (`DomainLoadout.tsx:239`) does `card.level <= levelCap`, but by then the backend has already discarded every card whose level is *not* exactly `characterLevel`. So at level 4 a character only sees level-4 cards, never levels 1–3 (including "Manifesting ★", which is why the lost card could not be re-acquired).

### C. Rest context is never wired into swaps

`VaultPicker.handleSwap` (`DomainLoadout.tsx:1099-1108`) hardcodes `restType: "none"`:

```ts
swapAction.fire("swap-loadout-card", {
  vaultCardId: selectedVaultCard,
  loadoutCardId: isFull ? selectedLoadoutCard : undefined,
  restType: "none",        // <-- always mid-play
  n: recallCost,
  isLinkedCurse: selectedCardData?.isLinkedCurse ?? false,
});
```

The `DowntimeModal` (`frontend/src/components/character/DowntimeModal.tsx`) has no card-swap UI at all, so there is no path that swaps during a rest. The SRD states cards may be moved freely "at the start of a rest, before using downtime moves" (SRD p.5), but the app currently charges Recall-Cost Stress for every swap because every swap is treated as mid-play.

### D. No handling for Cursed (★) cards

`swap-loadout-card` in `backend/src/characters/helpers.ts:784-890` special-cases only `isLinkedCurse` (long-rest only, 6 Stress). It has no awareness of Cursed (★) cards, and rest swaps are unconditionally free (`stressCost = 0`).

## Rules (SRD + campaign)

Source: `.opencode/supporting-docs/Daggerheart-SRD-digested.md` (page 5, page 21); Homebrew Kit page 10. The ★ and ↔ markers themselves are **campaign homebrew** and do not exist in the SRD.

### SRD baseline

- **Recall Cost** = the Stress a player must mark to swap a vaulted card into the loadout outside downtime (SRD p.5).
- **Free swap during downtime/rest** — both short and long rest (SRD p.5 note, p.21).
- **Free level-up placement** of a *newly acquired* card (SRD p.5).
- Moving a card *out* of a full loadout to make room is free (SRD p.5).

### Campaign rule (deviation from SRD p.5/p.21) — must be documented as homebrew

> **Normal cards** — during a short or long rest, cards may be moved freely between loadout and vault with no Stress cost (loadout ≤ 5). Outside a rest, recalling a vaulted card costs Stress equal to its Recall Cost.
>
> **Cursed (★) cards** — a Cursed card must pay its Recall Cost (mark that much Stress) **even during a rest or a level-up**. This overrides the SRD's free-downtime swap and free level-up placement for Cursed cards only.
>
> **Linked Curse (↔) cards** — only swappable during a **long rest**, at **6 Stress** (campaign rule, already implemented). Cannot be swapped on a short rest or outside a rest.

Implementation caution: the ★ rule is scoped to *recalling an existing vaulted ★ card*. Placing a *brand-new* ★ card gained at level-up remains free per SRD unless explicitly overridden.

## Remediation steps

### 1. Fix `removeFromLoadout` to return the card to the vault

`frontend/src/store/characterStore.ts` — change the action so a removed loadout card is pushed back into `domainVault` (if not already present):

```ts
removeFromLoadout: (cardId: string) => {
  const { activeCharacter } = get();
  if (!activeCharacter) return;
  const domainVault = activeCharacter.domainVault.includes(cardId)
    ? activeCharacter.domainVault
    : [...activeCharacter.domainVault, cardId];
  set({
    activeCharacter: {
      ...activeCharacter,
      domainLoadout: activeCharacter.domainLoadout.filter((id) => id !== cardId),
      domainVault,
    },
    isDirty: true,
  });
},
```

Optionally (defense-in-depth): add a backend PATCH validation that every card removed from `domainLoadout` must still exist in `domainVault` (or explicitly be flagged as a deliberate removal). Prefer the store fix as the primary remediation; server validation is secondary.

### 2. Fix the acquire picker to show all cards at-or-below level

In `AcquireCardPicker` (`DomainLoadout.tsx:216-221`), stop passing the level to `useDomain` so the backend returns all cards in the domain; rely on the existing client-side `card.level <= levelCap` filter:

```ts
const domain0Result = useDomain(domains[0] ?? undefined);       // no level param
const domain1Result = useDomain(domains[1] ?? undefined);
const domain2Result = useDomain(multiclassDomainId ?? undefined); // client filter still caps at ceil(level/2)
```

Confirm `eligibleCards` already filters `card.level <= levelCap` (it does, at `DomainLoadout.tsx:239`). Keep the multiclass cap as a client-side `card.level <= multiclassLevelCap`.

> Note: `getDomainCards`'s `?level=` GSI equality query remains correct for any other caller that genuinely wants a single level; do not change the backend. The fix is purely to stop requesting the equality-filtered list from the acquire picker.

### 3. Wire rest context into the swap flow

- Add a `restType` prop to `VaultPicker` and thread it from `DomainLoadout` (default `"none"`).
- When the user is inside a rest, pass `restType: "short" | "long"` so the backend applies free-swap semantics. The `DowntimeModal` should either (a) expose a card-swap entry point that opens the picker in rest mode, or (b) set a temporary "rest mode" flag consumed by `DomainLoadout`. Recommend (a): add a "Swap cards" affordance inside the DowntimeModal that opens the same picker with `restType` set.

### 4. Enforce the Cursed (★) recall-cost rule in `swap-loadout-card`

Extend `ActionParams` and the `swap-loadout-card` case in `backend/src/characters/helpers.ts`:

- Add `isCursed?: boolean` (and continue using `n` as `recallCost`).
- Cost logic:

```
if (isLinkedCurse) {
  // long-rest only (already enforced), 6 stress
} else if (isCursed) {
  stressCost = n ?? 0;   // Recall Cost — even during rest/level-up
} else if (restType === "none") {
  stressCost = n ?? 0;   // Recall Cost — mid-play
} else {
  stressCost = 0;        // free during rest
}
```

- Frontend `VaultPicker.handleSwap` must pass `isCursed: selectedCardData?.isCursed ?? false` and the card's `recallCost` (already passes `n`).

### 5. Copy changes to `handler.ts`

- `backend/src/characters/handler.ts:1628-1631` (the params normalization for `swap-loadout-card`) must also carry `isCursed`.
- Extend `ActionSchema` (the allowed action param shape) with `isCursed`.

## Verification

- Remove a card from a full/partial loadout → it appears in the vault; no card is lost.
- Open "Acquire New Card" at level 4 → lists cards of levels 1–4 (from the class's domains), sorted.
- Swap during a normal rest (short/long) → non-cursed cards are free; cursed ★ cards still charge Recall Cost.
- Swap a Linked Curse (↔) card → blocked except on long rest; costs 6 Stress.
- Level-up placement of a newly acquired card remains free; recalling a vaulted ★ card at level-up charges Recall Cost.

## References

- `frontend/src/store/characterStore.ts:317` — `removeFromLoadout`
- `frontend/src/components/character/DomainLoadout.tsx:216-221` — acquire level filter
- `frontend/src/components/character/DomainLoadout.tsx:1099-1108` — hardcoded `restType: "none"`
- `frontend/src/hooks/useGameData.ts:167` — `useDomain` level query
- `backend/src/gamedata/handler.ts:438` — GSI equality level filter
- `backend/src/characters/helpers.ts:784-890` — `swap-loadout-card`
- `backend/src/characters/handler.ts:1628-1631` — params normalization
- SRD: `.opencode/supporting-docs/Daggerheart-SRD-digested.md` p.5, p.21
