# Daggerheart Character Platform

A web application for creating, managing, and playing Daggerheart TTRPG characters. Covers character creation, character sheets, campaign management, and SRD reference.

## Language

### Character & Progression

**Character**:
A player's game entity. Stores core stats, level, loadout, token counts, and denormalized references to its class and subclass.
_Avoid_: player, hero, toon

**Core Stat**:
One of the six primary trait values on a Character: `agility`, `strength`, `finesse`, `instinct`, `presence`, `knowledge`. Stored as integers (typically −2 to +4).
_Avoid_: attribute, ability score, trait value (when referring to the stat itself)

**Spellcast Trait**:
The Core Stat designated as the casting stat for a Character's Subclass (e.g. `presence` for Bard, `knowledge` for Wizard). Stored as a `CoreStatName` on both `SubclassData` and — denormalized — on `Character` directly.
_Avoid_: spellcast stat, magic stat, casting attribute

**Tier**:
A derived progression bracket (1–4) computed from Character level: level 1 = Tier 1, levels 2–4 = Tier 2, levels 5–7 = Tier 3, levels 8–10 = Tier 4. Not stored on Character — always computed.
_Avoid_: rank, bracket

**Subclass**:
A specialization within a Class that defines the Spellcast Trait and class features. Stored as `SubclassData` embedded in `ClassData`; `subclassId`, `subclassName`, and `spellcastTrait` are denormalized onto Character.
_Avoid_: archetype, specialization

### Token System

**Token**:
A discrete, spendable resource attached to a specific Domain Card or Community Trait on a Character's loadout. Tracked as a non-negative integer. Distinct from auth/JWT tokens.
_Avoid_: charge, counter, resource (too generic)

**Token Cap**:
The maximum number of Tokens a Character may hold on a given card or feature. Typically derived from a Core Stat, the Character's Level, or Tier. Enforced server-side.
_Avoid_: max tokens, token limit

**Token Config**:
The metadata that describes how Tokens behave on a card or feature: what drives the Token Cap, and an optional Rest Action.
_Avoid_: token settings, token rules

**Rest Action**:
An optional part of Token Config specifying when Tokens refresh or clear (trigger: long rest / short rest / session start) and what happens (fill to cap / clear / add 1).
_Avoid_: refresh rule, token reset

**CardTokens**:
The `Record<string, number>` on Character that stores all runtime Token counts, keyed by a namespaced card identifier. Used for Domain Cards and Community Traits.
_Avoid_: token store, token map

### Cards & Loadout

**Domain Card**:
A gameplay card drawn from one of the character's chosen domains. May be Cursed (★), Linked (↔), or a Grimoire card. Token Config is optionally attached.
_Avoid_: ability card, domain ability

**Cursed Card**:
A Domain Card with the ★ suffix. Has a Curse feature that triggers negative effects. Always shows a Token tracker regardless of Token Config.
_Avoid_: cursed ability

**Loadout**:
The set of Domain Cards currently equipped by a Character.
_Avoid_: deck, hand, equipped cards

**Community Trait**:
The mechanical benefit granted by a Character's chosen community. May have Token Config attached. Stored in CardTokens using the key `community/{communityId}`.
_Avoid_: community ability, background trait

**Token Cap Resolver**:
A pure function that takes a Token Config and a Character and returns the resolved integer cap (or null if uncapped). Handles special keys: `spellcast` resolves via `character.spellcastTrait`; `tier` resolves via `tierForLevel(character.level)`. Lives in the shared package so backend and frontend use identical logic.
_Avoid_: cap calculator, max resolver

**TokenExtractor**:
A pure ingestion-time function that parses a card or trait description string and returns a Token Config (or null). Runs during SRD ingestion and writes Token Config onto the DomainCard or CommunityData record in DynamoDB. Not invoked at runtime.
_Avoid_: token parser, token detector

### Actions

**applyAction**:
The pure backend function that takes a Character and an action (e.g. `add-token`, `spend-token`, `fill-tokens`) and returns an updated Character. Has no I/O — all data it needs must be on the Character record.
_Avoid_: action handler, mutation function

**applyRest**:
The pure backend function that takes a Character, a rest type (`short` or `long`), and a map of `cardId → TokenConfig` and returns an updated Character. Clears trackers per the rest type and processes all token Rest Actions whose trigger matches. Called by the rest endpoint handler, which injects the card config map.
_Avoid_: rest handler, rest processor

## Example dialogue

> **Dev:** "I need the token cap for this card — do I fetch the subclass?"
> **Domain expert:** "No. The Spellcast Trait is denormalized onto the Character. Read `character.spellcastTrait`, then look up that Core Stat value."

> **Dev:** "What tier is a level 6 character?"
> **Domain expert:** "Tier 3. Tier is never stored — always compute it from level with `tierForLevel`."

> **Dev:** "Can a Community Trait have tokens?"
> **Domain expert:** "Yes. Its Token count lives in CardTokens under the key `community/{communityId}`, same mechanism as Domain Cards."

> **Dev:** "When do token Rest Actions fire? Do I add a button?"
> **Domain expert:** "No buttons. applyRest processes them automatically when the player takes a rest. The handler injects a map of cardId → TokenConfig so applyRest stays pure."

> **Dev:** "Where does TokenConfig come from at runtime?"
> **Domain expert:** "It's on the DomainCard record in DynamoDB, written once at ingestion by the TokenExtractor. Fetch it with the card — it's already there."
