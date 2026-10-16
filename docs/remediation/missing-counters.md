# Remediation Plan — Missing Token Counters

**Date:** 2026-10-01
**Status:** Proposed
**Scope:** `shared/src/types.ts`, ingestion pipeline, `backend/src/gamedata/handler.ts`, `backend/src/characters/handler.ts` (rest token config wiring), `frontend/src/lib/tokenUtils.ts`.

## Reported symptoms

1. "Research ability needs a token tracker and doesn't have one."
2. "Idk if it was intended this way but there is currently no cap/expiration (other than being attacked) on the tokens generated from Research."

## Root cause

The token system's runtime infrastructure is complete (`TokenConfig` in `shared/src/types.ts`, `resolveTokenCap` in `shared/src/tokenResolver.ts`, `applyRest` token effects and `spend-token`/`add-token`/`clear-tokens` actions in `backend/src/characters/helpers.ts`), but **no `tokenConfig` is ever attached to a domain card**:

- Ingestion (`ingestion/src/parsers/DomainCardParser.ts`) does not emit `tokenConfig`.
- `toDomainCard` (`backend/src/gamedata/handler.ts:199-215`) does not serialize `tokenConfig`.
- The rest handler (`backend/src/characters/handler.ts:1330-1338`) builds `tokenConfigs` only from the **community** record, never from domain cards in the loadout.

Because `cardHasTokens` was keyed on `isCursed` (see `manifest-counter-and-token-audit.md`), tokenless cursed cards got trackers while genuine token cards like **Research** (which is *not* cursed) got none.

## Cards that need a token tracker (positive list)

Sourced from the SRD card text in `markdown/Domains/`. This is the set that must receive a `tokenConfig`.

### Priority cards from the bug report

| Card | Token mechanic | Cap | Reset |
|---|---|---|---|
| `(Level 1) Research` (Study) | "place two tokens … any number spent" | 2 (proposed) | clear on short rest (proposed) — see `research-token-reset.md` |
| `(Level 4) Inventor ★ ↔` (Study) | "after a long rest place tokens equal to Knowledge … clear unspent on long rest" | Knowledge | clear on long rest |

### Remaining cards with a genuine self-pool

| Domain | Card | Cap (stat) | Reset |
|---|---|---|---|
| Artistry | Inspiration | Presence | clear on long rest |
| Artistry | Iconoclast ★ | Proficiency | clear on long rest |
| Artistry | Influencer ★ | Presence | clear on long rest |
| Artistry | Masterwork | Tier | (none stated) |
| Charm | Practiced Liar | Presence | (none stated) |
| Creature | Cunning | — | clear on long rest |
| Creature | Aposematic Display | Proficiency | clear on long rest |
| Faithful | Acolyte | Instinct | clear on long rest |
| Faithful | Sacrifice ★↔ | Proficiency | fill at session start |
| Oddity | Interstices ★ | — | consumed as bonus downtime |
| Oddity | Reality-Bent ★↔ | 1 | clear at end of session |
| Study | Philosopher ★↔ | Study cards in loadout+vault | clear on long rest |
| Study | Physicist ★↔ | Knowledge | clear on long rest |
| Study | Investigator ★↔ | Proficiency | clear on long rest |
| Thievery | On the Send | Spellcast | clear at end of scene |
| Thievery | Ambitious Score | — | spent during rest |
| Trickery | Three Card Shuffle ★ | — | clear at end of scene (+2 Stress each) |
| Valiance | Reactive | Strength | (none stated) |
| Valiance | Sharpshooter ★↔ | Instinct | clear on long rest |
| Violence | Scrapper ★↔ | — | clears after next successful attack |
| Weird | Crushing Intellect | — | (none stated) |
| Weird | Psychic ★↔ | Hope die value | clear at end of scene |
| Weird | Charlatan ★↔ | Level | (none stated) |
| Weird | Curse-stricken ★↔ | Level + cursed cards in loadout | (none stated) |
| Weird | Gifted ★↔ | Level | (none stated) |
| Weird | Theoretical Magic | — | (none stated) |

> Cards whose cap/reset is "(none stated)" have a token pool but the card text does not specify a cap or reset cadence. For these, default to an uncapped pool (`maxStat: null`) with no `restAction` (manual spend/add/clear via the existing tracker buttons) until SRD/homebrew guidance is provided. Do **not** invent caps without approval.

### Cross-card feeders (no self-pool — do NOT add a tracker to these)

- `(Level 4) Time-Bent ★ ↔` — curse adds tokens **to Inventor** equal to Instinct.
- Other "spend a token from that card" clauses on ★↔ cards.

## Remediation steps

1. **Define `tokenConfig` per card** — add a curated mapping (recommend a shared constant, e.g. `shared/src/tokenConfigs.ts`, or ingestion frontmatter `token_config:` per card) so each card in the positive list gets the correct `maxStat` and optional `restAction`.
2. **Emit `tokenConfig` from ingestion** — `ingestion/src/parsers/DomainCardParser.ts` reads the frontmatter/curated value and `ingestion/src/index.ts` writes it to the `DomainCards` table.
3. **Serialize `tokenConfig`** — `toDomainCard` in `backend/src/gamedata/handler.ts` includes `tokenConfig: record.tokenConfig`.
4. **Rest handler applies domain-card token effects** — extend `takeRest` (`backend/src/characters/handler.ts:1330-1338`) to build `tokenConfigs` for every domain card in the loadout (look up each card's `tokenConfig` from game data), so `applyRest` can run `fill-to-cap` / `clear` / `add-1` for domain cards — not just the community.
5. **Tracker visibility** — with `cardHasTokens` fixed (see `manifest-counter-and-token-audit.md`) and `tokenConfig` serialized, the correct cards render trackers automatically via the existing `LoadoutCardSlot` logic.
6. **Tests** — extend `backend/tests/unit/characters.helpers.test.ts` for domain-card rest effects, and `frontend/src/lib/__tests__/tokenUtils.test.ts` for the new visibility rule.

## Verification

- `Research` in loadout shows a token tracker with cap 2, and clears on short rest (see `research-token-reset.md`).
- `Inventor` shows a tracker with cap = Knowledge, clears on long rest.
- Each card in the positive list shows the correct cap label (e.g. "N / Knowledge") and reset behavior.
- Tokenless cursed cards (Manifesting ★) show no tracker.

## References

- `shared/src/types.ts:395-407` — `TokenConfig` / `restAction`
- `shared/src/tokenResolver.ts` — `resolveTokenCap`
- `backend/src/characters/helpers.ts:336-409` — `applyRest` token effects
- `backend/src/characters/handler.ts:1330-1338` — rest token config (community-only today)
- `backend/src/gamedata/handler.ts:199-215` — `toDomainCard` (missing `tokenConfig`)
- `markdown/Domains/Study/(Level 1) Research.md`, `markdown/Domains/Study/(Level 4) Inventor ★ ↔.md`
