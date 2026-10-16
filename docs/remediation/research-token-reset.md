# Remediation Plan — Research Token Cap & Rest Reset

**Date:** 2026-10-01
**Status:** Proposed
**Scope:** `markdown/Domains/Study/(Level 1) Research.md`, `shared/src/types.ts` (`TokenConfig`), token config wiring (see `missing-counters.md`).

## Context

Current Research text (`markdown/Domains/Study/(Level 1) Research.md`):

> You gain a short rest downtime move called _Research_ which replaces _Prepare_. … When you _Research_, gain the normal benefits of _Prepare_ and place two tokens on this card. Any number of tokens can be spent from this card. For each spent token, you can gain one of the following effects:
> - +1 bonus to the result of a Knowledge roll
> - +1 bonus to the result of a Damage roll
> - +1 temporary bonus to your Evasion which expires after being attacked

The user reports no cap and no expiration on the tokens generated from Research. The SRD text indeed specifies neither.

## SRD grounding

- SRD p.5 ("Usage Limits"): "If a domain card restricts how often it can be used, you can track such limits with whatever method you prefer, such as turning the card sideways, flipping it facedown, or using tokens."
- The SRD's own token cards use phrasings like "After a long rest, place a number of tokens equal to …" and "Clear unspent tokens at the beginning of a long rest."
- Research is a **short-rest** downtime move, so its reset cadence is the short rest; tokens are only generated when the player actually chooses the Research move.

## Compliant language (final wording)

> **Research (Study, Level 1)** — You gain a short rest downtime move called _Research_ which replaces _Prepare_. You can _Research_ with one or more members of your party who use _Prepare_ as if they were also doing _Research_, but only you gain the additional benefits.
>
> When you _Research_, gain the normal benefits of _Prepare_ and place two tokens on this card. This card can hold no more than **two** tokens. Any number of tokens can be spent from this card. For each spent token, you can gain one of the following effects:
> - +1 bonus to the result of a Knowledge roll
> - +1 bonus to the result of a Damage roll
> - +1 temporary bonus to your Evasion which expires after being attacked
>
> At the start of a short rest, clear all unspent tokens on this card.

### Rationale

- **Cap = 2** — matches the card's own "place two tokens" economy and prevents stockpiling; the pool is always bounded by one Research move's yield.
- **Reset = clear (not refill) on short rest** — tokens are earned only by *taking* the Research move; auto-refilling would grant two free tokens without spending the downtime move.

## TokenConfig mapping

```ts
// shared/src/types.ts TokenConfig
{ maxStat: 2, restAction: { trigger: "short-rest", effect: "clear" } }
```

Wire this config to the Research card via the mechanism in `missing-counters.md` (ingestion/frontmatter or a shared curated map), and ensure `takeRest` builds domain-card `tokenConfigs` so `applyRest` runs the short-rest `clear`.

## Remediation steps

1. Update `markdown/Domains/Study/(Level 1) Research.md` with the wording above.
2. Assign Research the `TokenConfig { maxStat: 2, restAction: { trigger: "short-rest", effect: "clear" } }`.
3. Re-run ingestion and confirm `toDomainCard` serializes `tokenConfig`.
4. Verify `takeRest` (short rest) clears Research tokens.
5. Add a unit test for `applyRest` clearing a card token on short rest.

## Verification

- Research shows a token tracker with cap 2 ("N / 2").
- Taking a short rest clears unspent Research tokens.
- Long rest does **not** clear Research tokens (short-rest trigger only) unless the "clear unspent at short rest" is deemed to also apply — confirm desired long-rest behavior; default is short-rest only.

## References

- `markdown/Domains/Study/(Level 1) Research.md`
- `shared/src/types.ts:395-407` — `TokenConfig`
- `backend/src/characters/helpers.ts:336-409` — `applyRest`
- SRD: `.opencode/supporting-docs/Daggerheart-SRD-digested.md` p.5
