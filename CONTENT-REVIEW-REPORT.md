# Curses! Content Review Report

**Date**: 2026-04-07
**Reviewers**: @srd-compliance, @copywriter
**Scope**: All homebrew content in `markdown/` — Domains (9), Classes (30), Ancestries (11), Communities (17)

---

## Summary

| Severity | Count | Key Themes |
|----------|-------|------------|
| CRITICAL | 27 | D&D-isms (turn/round language), non-standard d20 damage dice, broken/garbled text, mechanical errors |
| HIGH | 38 | Missing damage types, grammar errors, missing card metadata, undefined custom conditions, malapropisms |
| MEDIUM | 45 | Balance concerns, formatting inconsistencies (curse separators), unbounded mechanics, style issues |
| LOW | 22 | Ambiguity, polish, terminology standardization, condition formatting |
| **TOTAL** | **132** |

---

## CRITICAL (27 issues)

These are outright errors — broken mechanics, garbled text, or D&D-isms that contradict Daggerheart's core systems.

### D&D Turn/Round Language (Daggerheart uses spotlight-based action economy, not turns)

| # | File | Current Text | Fix |
|---|------|-------------|-----|
| 1 | `Domains/Artistry/(Level 1) Bewitch.md` | "duration of its next turn" | "until they next take an action" or "until the end of the scene" |
| 2 | `Domains/Artistry/(Level 3) Aura of Sacrifice ★.md` | "make an additional Action Roll on their turn" / "for more than two turns" | Rewrite using "when they next have the spotlight" / "once per scene" |
| 3 | `Domains/Study/(Level 3) Combined Systems.md` | Harpoon: "At the start of your turn" | "When you next have the spotlight" or "Once per scene" |
| 4 | `Domains/Study/(Level 5) Investigator ★ ↔.md` | "without it counting as your action for that turn" | "without it counting as your action" |
| 5 | `Domains/Thievery/(Level 1) Blinding Dust.md` | "they spend time on their turn to clear the dust" | "they spend an action to clear the dust" |
| 6 | `Domains/Thievery/(Level 2) Takedown.md` | "lasts until the start of their next turn" | "lasts until the affected character next takes an action" |
| 7 | `Classes/Youthful Protagonist.md` | "until the end of your next turn" / "per round" / "until the start of your next turn" | Replace all with "until you next take an action" / "once per scene" |
| 8 | `Classes/Prizebreaker.md` | Hunt's End: "until the end of their next turn" / "on their turn" | "until they next take an action" |
| 9 | `Classes/Hex Raider.md` | Unbidden Activation: "Stunned for one turn" | "until they next take an action" |

### Non-Standard d20 Damage Dice (Daggerheart damage dice are d4–d12 only)

| # | File | Current Text | Fix |
|---|------|-------------|-----|
| 10 | `Domains/Study/(Level 2) Applied Entropy ★.md` | "roll d20 dice using your Proficiency" | Change to d12 or d10 |
| 11 | `Domains/Study/(Level 3) Combined Systems.md` | Deadfall Trap: "d20 damage" | Change to d12 or d10 |
| 12 | `Domains/Oddity/(Level 2) Theoretical Magic ★.md` | "d20 damage" | Change to d12 or d10 |
| 13 | `Domains/Violence/(Level 5) Wrecking Machine.md` | "use d20s for all damage dice" | Change to d12 |
| 14 | `Domains/Study/(Level 5) Doomsday Device.md` | "d20+5 damage using the sum of all party members' Proficiency scores" — average ~126 damage at Level 5 | Drastically reduce: "d12+5 damage using your Proficiency" |

### Mechanical Errors

| # | File | Issue | Fix |
|---|------|-------|-----|
| 15 | `Domains/Charm/(Level 4) Profundity.md` | "Shame" condition: "-2 penalty to their Difficulty" — lowering Difficulty makes adversaries EASIER to hit. If intended as a debuff this is backwards. | If debuff: "+2 to their Difficulty". If benefit to PCs: add clarifying note. |
| 16 | `Domains/Charm/(Level 3) Preternatural Healing ★.md` | "spend a Hope at any time to clear a Hit Point" — infinite healing, no usage limit | Add limit: "Once per rest" or "Once per scene" |
| 17 | `Domains/Violence/(Level 3) Preternatural Healing ★.md` | "If you use this ability to clear yourself even after your last Hit Point is marked." — broken sentence fragment | Rewrite: "You can spend a Hope at any time to clear a Hit Point, even after your last Hit Point is marked." |
| 18 | `Classes/Steadfast.md` | Hidewarden: "when you have one or more marked Armor Slots" / "clear one Armor slot" — Armor Slots are an ADVERSARY mechanic. PCs don't have them. | Rewrite using PC armor mechanics (Armor Score, damage thresholds, HP) |

### Garbled / Broken Text

| # | File | Current Text | Fix |
|---|------|-------------|-----|
| 19 | `Domains/Creature/(Level 3) Prey ★ ↔.md` | "If a creature that would eat you feels that could, it will try do so" | "If a creature that would eat you feels that it could, it will try to do so" |
| 20 | `Domains/Creature/(Level 3) Predator ★ ↔.md` | "you may attempt to use you heightened senses" | "you may attempt to use your heightened senses" |
| 21 | `Domains/Oddity/(Level 2) Abnormal Physiology.md` | "you succeed at at an attack roll" | "you succeed at an attack roll" |
| 22 | `Classes/Hypnomancer.md` | "gain specific of information" | "gain a specific piece of information" |
| 23 | `Classes/Hypnomancer.md` | "deal 2d6 damage for every Sleepwalker…for every point 2 points of damage" | "remove one Sleepwalker for every 2 points of damage dealt" |
| 24 | `Domains/Faithful/(Level 5) Credo.md` | "a permanent +1 bonus to either you Presence" | "a permanent +1 bonus to either your Presence" |
| 25 | `Classes/Evangelist.md` | "All witnesses within Very Close range have gain a temporary +1 bonus" | "All witnesses within Very Close range gain a temporary +1 bonus" |
| 26 | `Classes/Dossier Rogue.md` | "ask the GM a yes/no questions" | "ask the GM a yes/no question" |
| 27 | `Communities/Wastelander.md` | "it often allows you to peak behind the veil of reality" | "it often allows you to peek behind the veil of reality" |

---

## HIGH (38 issues)

### Missing Damage Types (SRD requires physical or magic on all damage)

| # | File | Current Text | Fix |
|---|------|-------------|-----|
| 28 | `Domains/Study/(Level 2) Applied Entropy ★.md` | "d20 damage" (no type) | Specify "magic damage" or "physical damage" |
| 29 | `Domains/Study/(Level 3) Combined Systems.md` | Deadfall: "d20 damage", Harpoon: "d4 damage" (no types) | Specify damage types |
| 30 | `Domains/Artistry/(Level 1) Spark.md` | "d6 damage" (no type) | "d6 magic damage" |
| 31 | `Domains/Oddity/(Level 2) Theoretical Magic ★.md` | "d20 damage" (no type) | Specify damage type |
| 32 | `Domains/Creature/(Level 5) Conjured Weapon.md` | "d8+2 damage" (no type) | Specify damage type |
| 33 | `Classes/Hypnomancer.md` | "2d6 damage" (no type) | "2d6 magic damage" |
| 34 | `Classes/Oathbreaker Mystic.md` | "2d6 damage and count as that type damage" — garbled | "your attacks deal an additional 2d6 magic damage" |

### Grammar & Syntax Errors

| # | File | Current Text | Fix |
|---|------|-------------|-----|
| 35 | `Domains/Violence/(Level 4) Dirty Fighter ★ ↔.md` | "Your reputation proceeds you" | "Your reputation precedes you" |
| 36 | `Domains/Charm/(Level 3) Intimidator ★ ↔.md` | "isn't attempting to frighten, intimidate, or negotiating via threat" | "…intimidate, or negotiate via threat" (parallel structure) |
| 37 | `Domains/Study/(Level 2) Applied Entropy ★.md` | "Whenever you use this class feature" | "Whenever you use this ability" (it's a domain card, not a class feature) |
| 38 | `Classes/Naturalist.md` | "Spend 3 Hope and until the end of the scene you may use your Presence and Instinct in place of one another until the end of the scene." | Remove duplicate "until the end of the scene" |
| 39 | `Domains/Trickery/(Level 4) Pig in a Poke ★ ↔.md` | "in addition to any other non-curse effects may worsen their attitude" | "…non-curse effects that may worsen their attitude" |
| 40 | `Communities/Kybon Isle.md` | "If the new roll is rolled with Fear" | "If the re-roll results in Fear, gain a Hope" |
| 41 | `Communities/Poireau Islands.md` | "the seafaring clans of the Poireau Island" | "…of the Poireau Islands" (plural) |
| 42 | `Communities/Reveille.md` | "the Capitol city of Tidwell" | "the capital city of Tidwell" (Capitol = building) |
| 43 | `Domains/Oddity/(Level 4) Mad ★ ↔.md` | Curse starts with lowercase "once per session" | Capitalize: "Once per session" |

### Missing Card Metadata (Systemic — affects ~130 domain cards)

| # | Scope | Issue | Fix |
|---|-------|-------|-----|
| 44 | All ~130 homebrew domain cards | No cards specify their **card type** (ability / spell / grimoire) | Add card type to every card file |
| 45 | All ~130 homebrew domain cards | No cards specify their **recall cost** (0–4 Stress) | Add recall cost to every card file |

### Grimoires Outside Codex Domain

| # | File | Issue | Fix |
|---|------|-------|-----|
| 46 | `Domains/Violence/(Level 1) Any Means Necessary.md` | Grimoire at Level 1 — grimoires are rare and typically Codex-only | Consider splitting into separate ability cards |
| 47 | `Domains/Violence/(Level 2) Dirty Fighter.md` | Grimoire at Level 2 | Same |
| 48 | `Domains/Violence/(Level 3) Dish It Out.md` | Grimoire at Level 3 — Violence has 3 grimoires in Levels 1–3 | Same |
| 49 | `Domains/Study/(Level 3) Combined Systems.md` | Grimoire at Level 3 in Study domain | Consider splitting |

### Undefined Custom Conditions

| # | File | Condition | Fix |
|---|------|-----------|-----|
| 50 | `Domains/Thievery/(Level 1) Blinding Dust.md` | "Blinded" — not in SRD | Define fully or use standard "Vulnerable" |
| 51 | `Domains/Thievery/(Level 2) Takedown.md` | "Knocked Down" — not in SRD, self-application awkward | Rework; only target affected |
| 52 | `Domains/Study/(Level 3) Combined Systems.md` | "Tethered" — no clear ending condition | Add escape condition (e.g., Strength roll 13) |
| 53 | `Domains/Creature/(Level 4) Abnormal Physiology.md` | "Stunned" — not standard SRD condition | Define in card text |
| 54 | `Classes/Obscuritan.md` | "Overwhelmed" — "-2 to Evasion" doesn't work against adversaries (they use Difficulty) | Clarify: "-2 to Evasion (or Difficulty if adversary)" |

### Homebrew System References (cards not self-contained)

| # | File | References | Fix |
|---|------|-----------|-----|
| 55 | `Domains/Study/(Level 4) Inventor ★ ↔.md` | `[[Etherotaxia]]`, `[[Adherent]]` | Add brief inline mechanical description |
| 56 | `Domains/Valiance/(Level 5) Champion.md` | `[[Reputation]]` — unbounded bonus to ALL rolls | Document Reputation scale/max; cap if needed |
| 57 | `Classes/Scholar.md` | `[[Attitude]]`, `[[Faction]]`, `[[Adherent]]` | Document social system |
| 58 | `Classes/Herder.md` / `Classes/Wraithcaller.md` | `[[Ranger Companions]]` on non-Ranger classes | Document adapted companion rules |

### Other HIGH Issues

| # | File | Issue | Fix |
|---|------|-------|-----|
| 59 | `Communities/Gatehouse.md` | Missing period at end of italic flavor text | Add period before closing `_` |
| 60 | `Communities/Monaster.md` | "stress" not capitalized (should be "Stress") | Capitalize: "Stress" |
| 61 | `Domains/Valiance/(Level 5) Champion.md` | "enters your load out" | "enters your loadout" (one word) |
| 62 | `Domains/Weird/(Level 5) Theoretical Magic.md` | "either created  via" (double space) | "either created via" |
| 63 | `Domains/Trickery/(Level 4) Pig in a Poke ★ ↔.md` | "Blazing" condition referenced but defined on a different domain's card (Valiance) | Define inline or note cross-domain dependency |
| 64 | `Domains/Valiance/(Level 4) Righteous Fire ★ ↔.md` | "If the target acts while Blazing" — "acts" is vague (does reaction count?) | Clarify: "takes an action" or "makes a roll" |
| 65 | `Classes/Knave.md` | Sending a Message: "+3 bonus per Level" — at Level 5 this is +15, breaks bounded accuracy | Change to "+3 per Tier" (max +12) or "bonus = Level" (max +5) |

---

## MEDIUM (45 issues)

### Formatting Inconsistencies — Curse Separators

The project uses two different separators before curse text: `***` and `---`. Three files have NO separator. Standardize on `***`.

**Files using `---` (should be `***`):**

| # | File |
|---|------|
| 66 | `Domains/Creature/(Level 3) Prey ★ ↔.md` |
| 67 | `Domains/Creature/(Level 4) Animalistic ★ ↔.md` |
| 68 | `Domains/Charm/(Level 3) Intimidator ★ ↔.md` |
| 69 | `Domains/Faithful/(Level 2) Benevolence ★.md` |
| 70 | `Domains/Faithful/(Level 3) Prophet ★ ↔.md` |
| 71 | `Domains/Faithful/(Level 4) Heretic ★ ↔.md` |
| 72 | `Domains/Faithful/(Level 4) Sacrifice ★ ↔.md` |
| 73 | `Domains/Study/(Level 3) Philosopher ★ ↔.md` |
| 74 | `Domains/Study/(Level 4) Inventor ★ ↔.md` |
| 75 | `Domains/Study/(Level 4) Physicist ★ ↔.md` |
| 76 | `Domains/Study/(Level 5) Investigator ★ ↔.md` |
| 77 | `Domains/Violence/(Level 3) Scrapper ★ ↔.md` |
| 78 | `Domains/Violence/(Level 4) Dirty Fighter ★ ↔.md` |
| 79 | `Domains/Valiance/(Level 3) Sharpshooter ★ ↔.md` |
| 80 | `Domains/Valiance/(Level 4) Stalwart ★ ↔.md` |
| 81 | `Domains/Oddity/(Level 4) Mad ★ ↔.md` |
| 82 | `Domains/Oddity/(Level 4) Time-Bent ★ ↔.md` |
| 83 | `Domains/Thievery/(Level 4) Burglar ★ ↔.md` |
| 84 | `Domains/Weird/(Level 4) Gifted ★ ↔.md` |
| 85 | `Domains/Weird/(Level 4) Charlatan ★ ↔.md` |

**Files with NO separator before curse text:**

| # | File |
|---|------|
| 86 | `Domains/Oddity/(Level 3) Reality-Bent ★ ↔.md` |
| 87 | `Domains/Trickery/(Level 3) Conman ★ ↔.md` |
| 88 | `Domains/Trickery/(Level 3) Provocateur ★ ↔.md` |

### Balance Concerns

| # | File | Issue | Fix |
|---|------|-------|-----|
| 89 | `Domains/Charm/(Level 2) Calming Presence.md` | "clear 2 Hit Points" at Level 2 on Spellcast (13) — very powerful | Reduce to 1 HP or increase cost |
| 90 | `Domains/Creature/(Level 3) Predator.md` | Permanent Disadvantage on all incoming attacks while you have any Hope | Add condition: "while you have 3+ Hope" or "once per scene" |
| 91 | `Domains/Valiance/(Level 1) Courageous Words.md` | Each party member gains Hope for free, no limit | Add cost (mark Stress) or limit (once per rest) |
| 92 | `Domains/Valiance/(Level 4) Stalwart ★ ↔.md` | Curse: mandatory damage redirect with no opt-out — can force death | Ensure players understand severity during card selection |
| 93 | `Classes/Youthful Protagonist.md` | Running on Something: bonus = marked HP — very large at 4+ HP | Cap at Tier or Proficiency |
| 94 | `Classes/Obscuritan.md` | Ethereal: +Proficiency to Evasion + physical immunity for 1 Stress | Add duration limit or higher cost |
| 95 | `Classes/War Theorist.md` | Calculated Strike: auto-hit + max damage (Mastery) | Acceptable for Mastery but at top of power scale |
| 96 | `Classes/Hex Raider.md` | Ward the Body: +Proficiency to Evasion for entire scene | Cap at Tier or add cost |
| 97 | `Communities/Medilaac.md` | Copy another community's feature + swap per long rest | Consider removing swap or limiting options |
| 98 | `Communities/Varjalune Republic.md` | Swap Hope/Fear die values — can convert failure to success | Acceptable (1/long rest) but clarify timing |

### Unbounded / Exploding Mechanics

| # | File | Issue | Fix |
|---|------|-------|-----|
| 99 | `Ancestries/Isdaan.md` | d6 exploding: on 6, add +5 and roll again — theoretically infinite | Cap at 2 additional rolls or reduce bonus |
| 100 | `Ancestries/Lothrian.md` | Hope recovery: on 6, gain Hope and re-roll — theoretically infinite | "Lucky triggers once per Hope spent" |
| 101 | `Ancestries/Spittletusk.md` | Restrained until end of scene — very long for ancestry feature | Reduce duration or ease escape |

### Mechanical Direction Issues (Difficulty Penalty Confusion)

| # | File | Issue | Fix |
|---|------|-------|-----|
| 102 | `Classes/Cantor-Marshal.md` | "-2 penalty to their Difficulty" — is this pro-PC or anti-PC? | Add clarifying note on intent |
| 103 | `Classes/Devout.md` | Blistering Sermon: "-1 to Difficulty" | Same |
| 104 | `Classes/War Theorist.md` | Expose Weakness: "-2 to Difficulty" | Same |

### Homebrew Systems Needing Documentation (Systemic)

| # | Scope | System | Fix |
|---|-------|--------|-----|
| 105 | ~30+ cards across all domains | `[[Attitude]]`, `[[Faction]]`, `[[Reputation]]`, `[[Favor]]`, `[[Adherent]]` | Create reference doc for campaign-specific social mechanics |
| 106 | ~8 cards across domains/classes | `[[Aura]]` with "Maintenance Difficulty" | Document Aura system (trigger, maintenance, failure) |
| 107 | All ★ and ↔ domain cards | Curse/synergy system (★ = cursed, ↔ = linked) | Document formally |

### Other MEDIUM Issues

| # | File | Issue | Fix |
|---|------|-------|-----|
| 108 | `Domains/Oddity/(Level 4) Mad ★ ↔.md` | Unnecessary comma before parenthetical; nested quotes may render oddly | Clean up punctuation |
| 109 | `Ancestries/Goran.md` | Adaptable Physiology: AoE melee + weapon creation — too complex for ancestry | Consider simplifying to one effect |
| 110 | `Domains/Thievery/(Level 5) Ambitious Score.md` | d6 tokens per long rest — rolling 1 means only Common items ever | Consider minimum floor: "1d6+2 tokens" |

---

## LOW (22 issues)

### Turn-Adjacent Language in Classes

| # | File | Current Text | Fix |
|---|------|-------------|-----|
| 111 | `Classes/Silver Tongue.md` | "Stunned for one round" | "until they take an action" |
| 112 | `Classes/Naturalist.md` | "until the end of your next turn" / "ignore difficult terrain" | Use Daggerheart language; define "difficult terrain" |
| 113 | `Classes/Starbound Sentinel.md` | "At the end of each of your turns" | "When you maintain this Aura…" |
| 114 | `Classes/Mosaic Vessel.md` | "lasting until the end of your next turn" | "until you next take an action" |
| 115 | `Classes/Oathbreaker Mystic.md` | "at the start of each of their turns" | "each time they take an action" |

### Ambiguity & Clarity

| # | File | Issue | Fix |
|---|------|-------|-----|
| 116 | `Domains/Faithful/(Level 2) Aura of Penance.md` | Maintenance Difficulty not specified (other Auras do specify it) | Add Maintenance Difficulty |
| 117 | `Domains/Oddity/(Level 4) Reality-Bent ★ ↔.md` | "roll a d4 and store the result" — no expiration | Add: "Clear at start of next rest" |
| 118 | `Domains/Valiance/(Level 3) Sharpshooter ★ ↔.md` | "damage threshold one higher (Minor => Major)" — what if already Severe? | Add: "If Severe, mark an additional Hit Point" |
| 119 | `Communities/Reveille.md` | "roll a d6 instead" — instead of what? | Clarify what default is replaced |

### Terminology & Formatting

| # | File | Current Text | Fix |
|---|------|-------------|-----|
| 120 | `Ancestries/Allonaut.md` | "attack against another player" | "attack against an ally" (player = person at table) |
| 121 | `Ancestries/Human (Tidwell).md` | "Stress Slot" capitalization | Standardize to match SRD ("Stress slot") |
| 122 | `Domains/Valiance/(Level 4) Stalwart ★ ↔.md` | "your last hit point" (lowercase) | "your last Hit Point" |
| 123 | `Domains/Charm/(Level 3) Intimidator ★ ↔.md` | `**Blind**` used as inline condition | Use `_Blind_` (italic, per SRD convention) |
| 124 | `Domains/Violence/(Level 4) Dirty Fighter ★ ↔.md` | `**Blind**` as condition name | Use `_Blind_` |

### Polish & Style

| # | File | Issue | Fix |
|---|------|-------|-----|
| 125 | `Classes/Evangelist.md` | "With it, a single Presence roll that can shift…" — sentence fragment | "With it, a single Presence roll can shift…" |
| 126 | `Communities/Davite.md` | "a seven year old boy" | "a seven-year-old boy" (hyphenated compound adjective) |
| 127 | `Communities/Carnithian.md` | "You are a part of a community" | "You are part of a community" |
| 128 | `Communities/Kybon Isle.md` | "As every former inhabitant" | "Like every former inhabitant" |
| 129 | `Communities/Medilaac.md` | "their adaptability" — unclear antecedent | "the city's adaptability" |
| 130 | `Communities/Wastelander.md` | "the GM can take an action on your behalf" — consent issue | "With your permission, the GM may…" |
| 131 | `Domains/Valiance/(Level 5) Champion.md` | Domain has only 11-13 cards (Levels 1-5) vs SRD's 21 (1-10) | Document that campaign uses Levels 1-5 only |
| 132 | `Communities/Reveille.md` | "roll a d6 instead" context unclear for short rest mechanic | Clarify default being replaced |

---

## Systemic Recommendations

1. **Standardize curse separators** — Use `***` everywhere (20 files use `---`, 3 have none)
2. **Add card type and recall cost** to all ~130 domain cards (currently none have either)
3. **Replace all D&D turn/round language** — Daggerheart uses spotlight-based action economy
4. **Replace all d20 damage dice** with d12 or d10 — d20 is not a standard Daggerheart damage die
5. **Specify damage type (physical/magic)** on every damage-dealing ability
6. **Document campaign-specific systems** — Attitude, Faction, Reputation, Favor, Adherent, Aura, Ranger Companions
7. **Audit Difficulty penalty direction** — Confirm whether "-X to Difficulty" is intentionally pro-PC or a mistake across 3+ files
8. **Define or standardize custom conditions** — Stunned, Blinded, Knocked Down, Tethered, Overwhelmed, Blazing, Ensorcelled
