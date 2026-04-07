# SRD Compliance Report — Curses! Homebrew Content

**Date**: 2026-04-07
**SRD Version**: Daggerheart SRD 1.0 (2025)
**Homebrew Kit Version**: v1.0 (July 31, 2025)
**Scope**: All custom content in `markdown/` (excluding `markdown/SRD/`)

---

## Summary

| Category | Files Reviewed | Issues Found |
|---|---|---|
| Domains (11) | 130 card files | 52 |
| Classes (31) | 31 class files | 28 |
| Ancestries (11) | 11 ancestry files | 8 |
| Communities (17) | 17 community files | 5 |
| **TOTAL** | **189 files** | **93** |

| Severity | Count |
|---|---|
| CRITICAL | 18 |
| HIGH | 32 |
| MEDIUM | 27 |
| LOW | 16 |

---

## Severity Definitions

- **CRITICAL**: Mechanical error, wrong action economy, impossible/contradictory rules, D&D-ism that breaks the Daggerheart action model, wrong damage type usage, feature that references non-existent SRD mechanics
- **HIGH**: Terminology inconsistency, missing required card metadata (type, recall cost), non-standard damage types, conditions used but never defined, features that target adversary mechanics incorrectly
- **MEDIUM**: Balance concerns, features that are significantly over- or under-powered for their level, unclear stacking behavior
- **LOW**: Ambiguity, unclear wording, minor formatting inconsistencies, features that could benefit from clearer ending conditions

---

## DOMAIN ISSUES

### Study Domain

| # | File | Severity | Category | Description | SRD Reference | Suggested Fix |
|---|---|---|---|---|---|---|
| 1 | `(Level 2) Applied Entropy ★.md` | CRITICAL | Wrong Dice | "roll d20 dice using your Proficiency" — d20 is not a standard Daggerheart damage die. Standard dice are d4, d6, d8, d10, d12. Rolling multiple d20s with Proficiency is extremely swingy and off-scale. | Homebrew Kit p.8: damage scaling guidance; SRD p.5: Proficiency determines number of damage dice | Change to d12 or d10 for high-variance feel while remaining in the standard dice range |
| 2 | `(Level 2) Applied Entropy ★.md` | HIGH | Missing Damage Type | "d20 damage" — no damage type specified (physical or magic) | SRD p.6: all damage must be physical (phy) or magic (mag) | Specify damage type: "d20 magic damage" or "d20 physical damage" |
| 3 | `(Level 3) Combined Systems.md` | HIGH | Card Type at Wrong Level | Labeled as **Grimoire** at Level 3. Per Homebrew Kit guidance, grimoires are rare outside Codex domain. Having one at Level 3 is unusual. | Homebrew Kit p.8: "Cards with the grimoire type... are rare. In the core rulebook, only the Codex domain has grimoires." | Consider whether this truly needs to be a grimoire, or if the two spells could be split into separate cards |
| 4 | `(Level 3) Combined Systems.md` | CRITICAL | Wrong Dice | Deadfall Trap deals "d20 damage using your Proficiency" — same d20 issue as Applied Entropy | Same as #1 | Change to d12 or d10 |
| 5 | `(Level 3) Combined Systems.md` | HIGH | Missing Damage Type | Deadfall Trap: "d20 damage" — no physical/magic specified | Same as #2 | Specify damage type |
| 6 | `(Level 3) Combined Systems.md` | HIGH | Missing Damage Type | Harpoon: "d4 damage" — no physical/magic specified | Same as #2 | Specify "d4 physical damage" |
| 7 | `(Level 3) Combined Systems.md` | CRITICAL | D&D-ism / Action Economy | Harpoon: "At the start of your turn" — Daggerheart does not use traditional turns. The action economy is based on spotlight passing via Hope/Fear results. | SRD p.35-36: Daggerheart uses action rolls that generate Hope/Fear to pass spotlight; Homebrew Kit p.4: "GM Turn" is the only defined turn concept | Rewrite to "When you next have the spotlight" or "Once per scene" or use a token-based system |
| 8 | `(Level 3) Combined Systems.md` | HIGH | Custom Condition Undefined | "Tethered" condition created but the ending condition is unclear — can the target clear it? | Homebrew Kit p.5: "When homebrewing mechanics... include reaction rolls" | Add a clear ending condition (e.g., "cleared when the tethered creature succeeds on a Strength reaction roll (13)") |
| 9 | `(Level 4) Inventor ★ ↔.md` | HIGH | Homebrew System Reference | References `[[Etherotaxia]]` and `[[Adherent]]` — these are campaign-specific systems. The card text should be self-contained enough to understand mechanically. | Homebrew Kit p.7: community/domain features should be self-explanatory on their card | Consider adding brief inline description of what Etherotaxia interaction means mechanically |
| 10 | `(Level 5) Doomsday Device.md` | CRITICAL | Wrong Dice / Balance | "d20+5 damage using the sum of all party members' Proficiency scores" — uses d20 (non-standard) AND sums ALL party Proficiency scores. A 4-person party at Level 5 (Prof 3 each) would roll 12d20+5. Average: ~126 damage. This is far beyond any SRD damage scale. | Homebrew Kit p.10: Level 10 cards are "legendary heroes without reaching the power of gods"; SRD p.5: Proficiency scales from 1-6 | Drastically reduce: consider "d12+5 damage using your Proficiency" or similar single-character scaling |
| 11 | `(Level 5) Investigator ★ ↔.md` | CRITICAL | D&D-ism / Action Economy | "Dogged Pursuit: Move up to Far distance without it counting as your action for that turn" — Daggerheart does not have "turns" or "actions per turn" in this way | SRD p.35-36: spotlight-based action economy | Rewrite: "Move up to Far range without it counting as your action" or "Move up to Far range as part of another action" |

### Artistry Domain

| # | File | Severity | Category | Description | SRD Reference | Suggested Fix |
|---|---|---|---|---|---|---|
| 12 | `(Level 1) Spark.md` | HIGH | Missing Damage Type | "d6 damage" — no physical/magic specified | SRD p.6 | Specify "d6 magic damage" |
| 13 | `(Level 2) Bewitch.md` | CRITICAL | D&D-ism / Action Economy | "duration of its next turn" — Daggerheart does not use traditional turns | SRD p.35-36 | Rewrite to "until the end of the scene" or "until they take an action" |
| 14 | `(Level 3) Aura of Sacrifice ★.md` | CRITICAL | D&D-ism / Action Economy | "make an additional Action Roll on their turn" and "for more than two turns" — multiple references to turn-based action economy that doesn't exist in Daggerheart | SRD p.35-36 | Rewrite entirely using Daggerheart language: "once per scene" or "when they next have the spotlight" |

### Charm Domain

| # | File | Severity | Category | Description | SRD Reference | Suggested Fix |
|---|---|---|---|---|---|---|
| 15 | `(Level 2) Calming Presence.md` | MEDIUM | Balance | "clear 2 Hit Points" at Level 2 on a Spellcast Roll (13) is extremely powerful healing. SRD healing at this level is typically 1 HP or equivalent. | Homebrew Kit p.8: feature power should scale with level | Consider reducing to "clear 1 Hit Point" or adding a higher cost (e.g., mark 2 Stress) |
| 16 | `(Level 3) Preternatural Healing.md` | CRITICAL | Balance / Missing Limits | "You can spend a Hope at any time to clear a Hit Point" with no usage limit — infinite healing at any time for 1 Hope each is extraordinarily powerful and has no precedent in SRD | Homebrew Kit p.10: "Usage Limits: Some powerful domain cards have a usage limit" | Add a usage limit: "Once per rest" or "Once per scene" |
| 17 | `(Level 4) Profundity.md` | CRITICAL | Mechanical Error | Creates "Shame" condition with "-2 penalty to their Difficulty" — lowering an adversary's Difficulty makes them EASIER to hit. If intended as a debuff, this is backwards. Lower Difficulty = easier target for PCs. | SRD p.35: Difficulty is the number PCs must meet/exceed on attack rolls | If intended as debuff: change to "+2 to their Difficulty" (harder to hit). If intended as a benefit to PCs: reword to clarify intent |

### Creature Domain

| # | File | Severity | Category | Description | SRD Reference | Suggested Fix |
|---|---|---|---|---|---|---|
| 18 | `(Level 3) Predator.md` | MEDIUM | Balance | "Attacks made against you gain Disadvantage so long as you have any Hope" — permanent Disadvantage on all incoming attacks with essentially no cost (you almost always have Hope) at Level 3 is extremely powerful | Homebrew Kit p.10: balance features relative to their level | Add a more meaningful condition or limit: "once per scene" or "while you have 3+ Hope" |
| 19 | `(Level 4) Abnormal Physiology.md` | HIGH | Custom Condition | Uses "Stunned" condition — not a standard SRD condition (SRD defines Hidden, Restrained, Vulnerable) | SRD p.37: standard conditions are Hidden, Restrained, Vulnerable | Define "Stunned" in the card text or use a standard condition |
| 20 | `(Level 5) Conjured Weapon.md` | HIGH | Missing Damage Type | "d8+2 damage" — no physical/magic specified | SRD p.6 | Specify damage type |

### Faithful Domain

| # | File | Severity | Category | Description | SRD Reference | Suggested Fix |
|---|---|---|---|---|---|---|
| 21 | `(Level 2) Aura of Penance.md` | LOW | Ambiguity | Aura Maintenance Difficulty not specified (other Auras in this project specify it) | Homebrew Kit p.8: features should include all needed mechanical info | Add Maintenance Difficulty |

### Oddity Domain

| # | File | Severity | Category | Description | SRD Reference | Suggested Fix |
|---|---|---|---|---|---|---|
| 22 | `(Level 2) Theoretical Magic ★.md` | CRITICAL | Wrong Dice | Uses "d20 damage" — same d20 issue. d20 is not a standard damage die. | Same as #1 | Change to d12 or d10 |
| 23 | `(Level 2) Theoretical Magic ★.md` | HIGH | Missing Damage Type | "d20 damage" — no physical/magic specified | SRD p.6 | Specify damage type |
| 24 | `(Level 4) Reality-Bent ★ ↔.md` | LOW | Ambiguity | "roll a d4 and store the result" — it's unclear when/how stored results expire | Homebrew Kit p.10: token mechanics should have clear ending conditions | Add "Clear stored results at the start of your next rest" |

### Violence Domain

| # | File | Severity | Category | Description | SRD Reference | Suggested Fix |
|---|---|---|---|---|---|---|
| 25 | `(Level 1) Any Means Necessary.md` | HIGH | Card Type at Wrong Level | Labeled as **Grimoire** at Level 1. Grimoires are rare and typically Codex-only. Having one at Level 1 is very unusual. | Homebrew Kit p.8: grimoires are rare, only Codex has them in core | Consider splitting into separate ability cards or relabeling as an ability with multiple options |
| 26 | `(Level 2) Dirty Fighter.md` | HIGH | Card Type at Wrong Level | Labeled as **Grimoire** at Level 2. Same concern as above. | Same as #25 | Same suggestion |
| 27 | `(Level 3) Dish It Out.md` | HIGH | Card Type at Wrong Level | Labeled as **Grimoire** at Level 3. Violence has 3 grimoires across Levels 1-3 which is highly unusual. | Same as #25 | Same suggestion |
| 28 | `(Level 5) Wrecking Machine.md` | CRITICAL | Wrong Dice | "use d20s for all damage dice" — converts all damage dice to d20s, which are not standard Daggerheart damage dice | Same as #1 | Change to d12 |

### Weird Domain

| # | File | Severity | Category | Description | SRD Reference | Suggested Fix |
|---|---|---|---|---|---|---|
| 29 | `(Level 3) Ensorcelled ★ ↔.md` | HIGH | Custom Condition | Creates "Ensorcelled" condition — should be described in card text | SRD p.37 | Ensure full mechanical description is present in card text (verify it is) |
| 30 | `(Level 4) Haunted ★ ↔.md` | LOW | Ambiguity | References homebrew-specific systems without inline explanation | Homebrew Kit p.7 | Add brief inline mechanical description |

### Thievery Domain

| # | File | Severity | Category | Description | SRD Reference | Suggested Fix |
|---|---|---|---|---|---|---|
| 31 | `(Level 1) Blinding Dust.md` | CRITICAL | D&D-ism / Action Economy | "they spend time on their turn to clear the dust" — Daggerheart does not have "turns" in the traditional sense | SRD p.35-36 | Rewrite: "they spend an action to clear the dust from their eyes" |
| 32 | `(Level 1) Blinding Dust.md` | HIGH | Custom Condition | Creates "Blinded" condition — not a standard SRD condition. It is properly described in the text, but should be checked for consistency with other uses. | SRD p.37 | Acceptable as custom condition since it's described; consider using "Vulnerable" with flavor text instead |
| 33 | `(Level 2) Takedown.md` | CRITICAL | D&D-ism / Action Economy | "lasts until the start of their next turn" — Daggerheart does not have turns | SRD p.35-36 | Rewrite: "lasts until the affected character next takes an action" or "until the end of the scene" |
| 34 | `(Level 2) Takedown.md` | HIGH | Custom Condition | Creates "Knocked Down" condition — not standard SRD. It IS described, but the self-application (you ALSO become Knocked Down) plus turn-based ending makes this awkward. | SRD p.37 | Consider reworking: perhaps only the target becomes Knocked Down, and use Daggerheart-compatible ending |
| 35 | `(Level 3) Fence.md` | LOW | Homebrew System Reference | References `[[Favor]]` and `[[Faction]]` — campaign-specific systems | N/A — these appear to be intentional Curses! mechanics | Acceptable for campaign-specific content; document these systems somewhere |
| 36 | `(Level 5) Ambitious Score.md` | MEDIUM | Balance | d6 tokens per long rest for item acquisition is heavily RNG-dependent. Rolling a 1 means you can only ever get a Common item, while rolling a 6 puts you near Uncommon territory. The 13-token cost for Tier 4 items means it could take 3+ long rests minimum, which seems appropriately gated. | Homebrew Kit p.10 | Consider a minimum token floor (e.g., "gain 1d6+2 tokens") to smooth variance |

### Trickery Domain

| # | File | Severity | Category | Description | SRD Reference | Suggested Fix |
|---|---|---|---|---|---|---|
| 37 | `(Level 1) On the Send.md` | HIGH | Non-Standard Term | "Spellcast trait" — the card says "place a number of tokens equal to your Spellcast trait." Spellcast trait is a subclass-specific trait assignment, not a universal stat. A character's Spellcast trait IS one of the six traits but it varies by subclass. This is technically correct but unusual for a domain card, which should be class-neutral. | Homebrew Kit p.8: "Domain cards should not rely on or refer to any class features" | Consider using a specific trait name (e.g., "Presence") or use "your Spellcast Roll modifier" for clarity, though "Spellcast trait" is technically valid |
| 38 | `(Level 2) Three Card Shuffle ★.md` | MEDIUM | Complex Mechanic | The stored-roll-plus-penalty mechanic (2 Stress per unspent token at scene end) is complex but mechanically coherent. The Fear-triggered activation is novel. | N/A | Acceptable but consider simplification for table speed |
| 39 | `(Level 3) Provocateur ★ ↔.md` | MEDIUM | Balance / Downtime | Curse: "During a short rest, you can only take one downtime action" — this is a significant penalty. The SRD gives 2 downtime actions per short rest. With the Sacrifice synergy it becomes 3, which is very strong. | SRD p.41: short rest actions | Acceptable as curse/reward tradeoff, but note the wide swing |
| 40 | `(Level 4) Pig in a Poke ★ ↔.md` | HIGH | Custom Condition | Creates "Blazing" condition via synergy with Righteous Fire card — but "Blazing" is defined on the Valiance card, not here. Cross-domain dependency. | Homebrew Kit p.8: "Domain cards should not rely on or refer to any class features" and should be self-contained | Either define Blazing inline or note that this effect only works with the specific synergy card |

### Valiance Domain

| # | File | Severity | Category | Description | SRD Reference | Suggested Fix |
|---|---|---|---|---|---|---|
| 41 | `(Level 1) Courageous Words.md` | MEDIUM | Balance | "each party member gains a Hope" with no cost or limit beyond "spend a few moments speaking" — giving Hope to the entire party for free is very strong at Level 1 | SRD p.3: PCs start with 2 Hope, max 6 | Add a cost (mark a Stress) or a usage limit (once per rest) |
| 42 | `(Level 2) Reactive.md` | LOW | Clarity | Counter option: "Successes with Hope on this attack do not retain the spotlight" — unique mechanic, well-described but unusual | SRD p.35-36: success with Hope normally retains spotlight | Acceptable; this is a novel and interesting mechanic |
| 43 | `(Level 3) Sharpshooter ★ ↔.md` | LOW | Clarity | Curse: "treat it as if it hit at a damage threshold one higher (e.g. Minor => Major)" — well-described, but what happens if already at Severe? | SRD p.6: damage thresholds are Minor/Major/Severe | Add: "If the damage is already Severe, mark an additional Hit Point" or specify the cap |
| 44 | `(Level 4) Righteous Fire ★ ↔.md` | HIGH | Custom Condition | Creates "Blazing" condition — properly described in the card text. However, "If the target acts while Blazing, they must take an extra 2d8 magic damage" uses "acts" which is vague — does using a reaction count? | SRD p.35-36 | Clarify: "If the target takes an action" or "If the target makes a roll" |
| 45 | `(Level 4) Stalwart ★ ↔.md` | MEDIUM | Balance / Curse Severity | Curse: "When an ally within Very Close range would mark a Hit Point, you must mark 1 Stress and take it instead" — this is mandatory with no opt-out, which could rapidly drain Stress AND force death via "must choose the Blaze of Glory death move" | SRD p.42: death moves | This is an extremely harsh curse; ensure players understand the severity during card selection |
| 46 | `(Level 5) Champion.md` | HIGH | Homebrew System Reference | "bonus to ALL rolls equal to your [[Reputation]]" — Reputation is a campaign-specific system not in the SRD. The bonus could be unbounded if Reputation scales high. | N/A — Curses!-specific | Document the Reputation scale/max. If Reputation can exceed +3, this is potentially overpowered |

---

## CROSS-DOMAIN SYSTEMIC ISSUES

| # | Severity | Category | Description | Affected Cards | Suggested Fix |
|---|---|---|---|---|---|
| 47 | HIGH | Missing Metadata | NO domain cards specify their **card type** (ability, spell, grimoire) consistently. Only Violence grimoires and Combined Systems are labeled. Per SRD, every domain card must have a type. | All ~130 cards | Add card type to every card file |
| 48 | HIGH | Missing Metadata | NO domain cards specify their **recall cost** (0-4 Stress). Per SRD and Homebrew Kit, every domain card must have a recall cost. | All ~130 cards | Add recall cost to every card file |
| 49 | MEDIUM | Homebrew System | Many cards reference `[[Attitude]]`, `[[Faction]]`, `[[Reputation]]`, `[[Favor]]`, `[[Adherent]]`, `[[Character]]`, `[[Creature]]` — these are Curses!-specific social mechanics not in the SRD. These need to be documented as a homebrew system. | ~30+ cards across all domains | Create a reference document for these campaign-specific systems |
| 50 | MEDIUM | Curse System | The ★ and ↔ symbols on cards indicate curse and synergy mechanics that are a Curses!-specific system. This is an intentional homebrew addition and appears consistently applied. Levels 3-4 cards with ↔ have cross-domain synergies with specific named cards. | All ★ ↔ cards | Document the curse/synergy system formally |
| 51 | LOW | Card Count | Homebrew domains have 11-13 cards (Levels 1-5 only) vs. SRD domains which have 21 cards (Levels 1-10). This is intentional for the campaign's level range but should be documented. | All 11 domains | Document that the campaign uses Levels 1-5 only |
| 52 | MEDIUM | Aura System | Several cards reference `[[Aura]]` with "Maintenance Difficulty" — this appears to be a Curses!-specific mechanic not in the SRD. Auras require concentration-like maintenance rolls. | Aura of Bravery, Aura of Destiny, Aura of Peace, Aura of Sacrifice, Aura of Penance, Fearless Stand, Warden's Challenge | Document the Aura system (trigger, maintenance roll frequency, failure consequences) |

---

## CLASS ISSUES

### Structural Compliance

All 31 homebrew classes follow the correct structural format:
- ✅ Domains table with Starting Evasion and Starting Hit Points
- ✅ Class Items (2 options)
- ✅ Hope Feature (costs 3 Hope — correct per SRD)
- ✅ Class Feature(s)
- ✅ Two Subclasses with Spellcast Trait, Foundation Features, Specialization Feature, Mastery Feature
- ✅ Background Questions
- ✅ Connections
- ✅ Mechanical Notes section (bonus — not SRD-required but excellent design practice)

All classes have HP + Evasion totaling 16 (either 9/7 or 10/6), which is consistent with SRD patterns (SRD classes total 15-16).

### Specific Class Issues

| # | File | Severity | Category | Description | SRD Reference | Suggested Fix |
|---|---|---|---|---|---|---|
| 53 | `Youthful Protagonist.md` | CRITICAL | D&D-ism | "until the end of your next turn" (Not Done Yet), "per round" (Mastery), "until the start of your next turn" (Just This Once) — multiple turn/round references | SRD p.35-36 | Replace all turn/round references with "until you next take an action" or "until the end of the scene" |
| 54 | `Youthful Protagonist.md` | MEDIUM | Balance | Running on Something: "gain a bonus to all damage rolls equal to the number of marked Hit Points" — at 4+ marked HP this is a very large persistent bonus | Homebrew Kit p.12 | Consider capping at Tier or Proficiency |
| 55 | `Steadfast.md` | CRITICAL | PC Mechanic Error | Hidewarden Specialization: "when you have one or more marked Armor Slots" and "clear one Armor slot" — Armor Slots are an ADVERSARY mechanic in Daggerheart. PCs do not have Armor Slots. PCs use Armor Score to modify Evasion. | SRD p.6: PCs have Armor Score; SRD p.35: Armor Slots are adversary-only | Rewrite to use PC armor mechanics (e.g., reference armor score, damage thresholds, or HP) |
| 56 | `Hypnomancer.md` | MEDIUM | Complex / Ambiguous | Sleepwalker combat mechanics: "remove a Sleepwalker for every point 2 points of damage" — apparent typo ("point 2 points"). Also, the Sleepwalker system is complex and needs clearer rules for how they function as a group. | N/A | Fix typo; clarify: "remove one Sleepwalker for every 2 points of damage dealt" |
| 57 | `Hypnomancer.md` | HIGH | Missing Damage Type | Sleepwalkers: "deal 2d6 damage for every Sleepwalker" — no damage type specified | SRD p.6 | Specify "2d6 magic damage" |
| 58 | `Obscuritan.md` | HIGH | Custom Condition | Ethereal Stalker creates "Overwhelmed" condition with "-2 penalty to Evasion and Damage Thresholds" — Evasion is a PC stat; adversaries have Difficulty. This doesn't work cleanly against adversaries. | SRD p.35: adversaries have Difficulty, not Evasion | Clarify: "gains a -2 penalty to Evasion (or Difficulty if an adversary) and Damage Thresholds" |
| 59 | `Obscuritan.md` | MEDIUM | Balance | Ethereal condition: "gains a bonus to its Evasion equal to its Proficiency" — at Proficiency 3 (Level 5), this is +3 Evasion plus immunity to physical damage. Very powerful for 1 Stress. | Homebrew Kit p.10 | Consider adding a duration limit or additional cost |
| 60 | `Obscuritan.md` | MEDIUM | Balance | Enraged condition: "gains a bonus to its attack rolls equal to its Proficiency" — at Proficiency 3 this is +3 to attacks with Advantage against you. The downside may be worth it but is very swingy. | N/A | Acceptable as risk/reward tradeoff |
| 61 | `Oathbreaker Mystic.md` | HIGH | Missing Damage Type / Vague | Alien Inheritance: "2d6 damage and count as that type damage" — "that type" refers to absorbed damage type, but the base feature doesn't specify what type the 2d6 is. Also grammatically awkward. | SRD p.6 | Rewrite: "your attacks deal an additional 2d6 magic damage. Until the end of the scene, your attacks also count as [absorbed type] damage." |
| 62 | `Oathbreaker Mystic.md` | MEDIUM | Ambiguity | Unsacred Ground: "at the start of each of their turns" — turn-adjacent language. In Daggerheart spotlight model, "start of turn" is ambiguous. | SRD p.35-36 | Rewrite: "each time they take an action while in that space" |
| 63 | `Knave.md` | HIGH | Mechanical Direction | Sending a Message: "+3 bonus per Level" — at Level 5, this is +15 to intimidate. This is extremely high and likely breaks bounded accuracy. | Homebrew Kit p.8: scaling guidance recommends Tier (1-4) or Proficiency (1-6) for moderate scaling | Change to "+3 bonus per Tier" (max +12) or "bonus equal to your Level" (max +5) |
| 64 | `Knave.md` | MEDIUM | Balance | Sharp Comeback: "roll your damage dice again and add the result" on a failed social roll that converts to an attack with Advantage — this is double damage on a reaction to a social failure, which is very strong | N/A | Acceptable as the Pretty Face's signature aggressive mechanic, but note power level |
| 65 | `Scholar.md` | HIGH | Homebrew System Reference | Multiple references to `[[Attitude]]`, `[[Faction]]`, `[[Adherent]]` — core mechanics of the class depend on the campaign's social system | N/A | Document the Attitude/Faction system; ensure these are defined |
| 66 | `Devout.md` | MEDIUM | Balance | Blistering Sermon: "-1 penalty to their Difficulty" — lowering Difficulty makes adversaries EASIER to hit, which benefits PCs. This appears intentionally designed as a debuff on adversaries (making them more vulnerable). Confirm this is the intended direction. | SRD p.35 | Verify intent: if the goal is to make adversaries harder to hit (a true debuff on PCs), this should be +1. If making them easier to hit (benefiting PCs), -1 is correct but the flavor of "debuff" is misleading |
| 67 | `Devout.md` | HIGH | Custom Condition | Polemic: "Stunned" condition — "cannot make action or reaction rolls" — this is extraordinarily powerful as it completely disables a character. Proper description is given but the condition is devastatingly strong. | SRD p.37 | Add a clear ending condition or limit (e.g., "for the rest of the scene or until you stop talking, whichever comes first" — which it does have, but consider duration concerns) |
| 68 | `Herder.md` | HIGH | Homebrew System Reference | References `[[Ranger Companions]]` rules for Creature Companion — this is a campaign-specific adaptation of the SRD Ranger companion mechanic applied to a non-Ranger class | SRD p.18-19: Ranger companion rules | Document the adapted Ranger Companion rules for non-Ranger classes |
| 69 | `Wraithcaller.md` | HIGH | Homebrew System Reference | Same issue — `[[Ranger Companions]]` rules referenced for Ghostly Companion | Same as #68 | Same suggestion |
| 70 | `Silver Tongue.md` | LOW | Clarity | Captive Audience (Dazzler): uses "Stunned" for one round — "round" is not a defined Daggerheart time unit | SRD p.35-36 | Replace "one round" with "until the end of the scene" or "until they take an action" |
| 71 | `Naturalist.md` | LOW | Clarity | Apex Form: "until the end of your next turn" — turn language | SRD p.35-36 | Replace with "until the end of the scene" or "until you next take an action" |
| 72 | `Naturalist.md` | LOW | Clarity | "ignore difficult terrain" — "difficult terrain" is not a defined Daggerheart term | SRD — no difficult terrain rules found | Define what "difficult terrain" means in this context or remove |
| 73 | `Starbound Sentinel.md` | LOW | Clarity | Fearless Stand: "At the end of each of your turns" — turn language in Aura description | SRD p.35-36 | Rewrite to trigger-based: "When you maintain this Aura, each ally within Very Close range..." |
| 74 | `War Theorist.md` | MEDIUM | Mechanical Direction | Expose Weakness: "-2 penalty to their Difficulty" — same as Charm/Profundity issue. Lowering Difficulty makes the adversary EASIER to hit. If this is intended to benefit PCs (which it appears to be based on context), it's correctly designed but the phrasing could confuse. | SRD p.35 | Add clarifying note: "making them easier to hit" |
| 75 | `War Theorist.md` | MEDIUM | Balance | Calculated Strike (Mastery): "automatically hits without a roll and deals maximum damage" — auto-hit + max damage is extremely powerful even for a Mastery, once per session feature | Homebrew Kit p.14 | Acceptable for Mastery level but note this is at the very top of the power scale |
| 76 | `Prizebreaker.md` | CRITICAL | D&D-ism | Hunt's End: "until the end of their next turn" (Slowed condition) — turn language. Also "on their turn" in Slowed definition. | SRD p.35-36 | Replace with "until they next take an action" |
| 77 | `Hex Raider.md` | CRITICAL | D&D-ism | Unbidden Activation: "Stunned for one turn" — turn language | SRD p.35-36 | Replace "one turn" with "until they next take an action" or "for the rest of the scene" |
| 78 | `Hex Raider.md` | MEDIUM | Balance | Ward the Body: "bonus to your Evasion equal to your Proficiency until the end of the scene" — at Proficiency 3+, this is a massive persistent Evasion boost for the entire scene | Homebrew Kit p.8 | Consider capping at Tier or adding a cost |
| 79 | `Cantor-Marshal.md` | HIGH | Mechanical Direction | Sacred Address Shamed condition: "-2 penalty to their Difficulty" — same Difficulty direction issue as #17 and #66 | SRD p.35 | If intended to benefit PCs (make adversary easier to hit), this is correct. Add clarity note. |
| 80 | `Mosaic Vessel.md` | LOW | Clarity | Living Canvas: "lasting until the end of your next turn" — turn language | SRD p.35-36 | Replace with "lasting briefly" or "until you next take an action" |

---

## ANCESTRY ISSUES

| # | File | Severity | Category | Description | SRD Reference | Suggested Fix |
|---|---|---|---|---|---|---|
| 81 | `Goran.md` | MEDIUM | Feature Complexity | Adaptable Physiology: AoE melee attack + weapon creation is more complex than typical ancestry features. SRD ancestries have 2 focused features. | Homebrew Kit p.6: "Distill the important parts of that ancestry down to two core ideas" | Consider simplifying to one of the two effects |
| 82 | `Isdaan.md` | MEDIUM | Unbounded Mechanic | Socially Practiced: "roll a d6, on a 6, add +5 and roll again" — this is an exploding die mechanic. Theoretically infinite, though practically limited. The +5 per explosion is very high. | Homebrew Kit p.6: ancestry features should be simple | Cap the explosions (max 2 additional rolls) or reduce the bonus per explosion |
| 83 | `Lothrian.md` | MEDIUM | Unbounded Mechanic | Lucky: "When you spend a Hope, roll a d6. On a 6, gain a Hope and re-roll" — exploding Hope recovery. Could theoretically loop indefinitely. | Same as #82 | Cap at "you can only trigger Lucky once per Hope spent" |
| 84 | `Spittletusk.md` | MEDIUM | Balance | Venomous: Restrained until end of Scene is extremely long for an ancestry feature. SRD Restrained ends when the source is dealt with. The provided Strength roll (13) escape is good but the scene-long default is harsh. | SRD p.37: Restrained condition | Consider reducing duration or making the Strength roll easier |
| 85 | `Allonaut.md` | LOW | Terminology | "attack against another player" — should be "attack against an ally" or "attack against another player character." "Player" refers to the person at the table. | SRD uses "PC" or "ally" | Change to "attack against an ally" |
| 86 | `Crenshaw.md` | HIGH | Non-Standard Term | "create a temporary Experience" with "same bonus as your highest bonus experience" — this creates a mechanical Experience. The SRD defines Experiences as narrative/background elements with +2 modifier. Creating one as a combat feature blurs the line. | SRD p.4: Experiences are narrative elements; Homebrew Kit p.6: ancestry features should be biological | Consider rewording: "gain a +2 bonus to one roll this scene" for clarity |
| 87 | `Ethereal (Community).md` | HIGH | Non-Standard Term | "Resistance to damage" — the SRD does not define "Resistance" as a mechanic for PCs. The Ring of Resistance item halves damage, but there's no general Resistance keyword. | SRD — no general Resistance mechanic for PCs | Define what "Resistance" means mechanically: "halve damage from creatures and characters of that type" |
| 88 | `Human (Tidwell).md` | LOW | Clarification | "Gain an additional Stress Slot" — SRD calls them "Stress slots" not "Stress Slot" (capitalization). Minor. | SRD p.3 | Standardize capitalization |

---

## COMMUNITY ISSUES

| # | File | Severity | Category | Description | SRD Reference | Suggested Fix |
|---|---|---|---|---|---|---|
| 89 | `Kybon Isle.md` | MEDIUM | Ambiguity | "If the new roll is rolled with Fear" — grammatically awkward and mechanically unclear. Does "rolled with Fear" mean the Fear die is higher? | SRD p.35: Fear result = Fear die is higher | Rewrite: "If the rerolled result is also with Fear, gain a Hope" |
| 90 | `Medilaac.md` | MEDIUM | Balance | "Choose another community. You gain the benefits of that community" + can swap per long rest — effectively getting 2 community features is more powerful than any other community | Homebrew Kit p.7: communities have one feature | Consider removing the ability to swap, or limiting to specific communities |
| 91 | `Reveille.md` | LOW | Ambiguity | "roll a d6 instead" during short rest — instead of what? The SRD short rest doesn't specify a die to roll as a default. This needs context for what it replaces. | SRD p.41: short rest downtime actions | Clarify what die/roll this replaces |
| 92 | `Varjalune Republic.md` | MEDIUM | Ambiguity / Balance | "swap the values of your Hope and Fear Dice" — this is mechanically novel. If your Fear die rolled higher, swapping means you now succeed (or vice versa). Once per long rest is appropriately limited but this is extremely powerful when used to convert a critical failure to a critical success. | SRD p.35: Hope/Fear dice | Acceptable given once-per-long-rest limit, but clarify exact timing (before or after seeing result?) |
| 93 | `Wastelander.md` | LOW | Clarity | "the GM can take an action on your behalf" — this gives GM control of a PC, which is unusual and could create consent issues | Homebrew Kit p.7: community features should be straightforward | Add consent framing: "With your permission, the GM may..." or note this is opt-in via card selection |

---

## SYSTEMIC RECOMMENDATIONS

### Priority 1: Critical Fixes Required

1. **Replace all d20 damage dice** across Study, Oddity, and Violence domains with standard Daggerheart dice (d4-d12). This affects 5+ cards.
2. **Fix all turn/round language** across domains and classes. Replace with Daggerheart-compatible spotlight/action language. This affects 10+ cards/features.
3. **Fix Profundity's "Shame" condition** — the Difficulty penalty direction appears backwards.
4. **Fix Preternatural Healing** — add a usage limit to prevent infinite healing.
5. **Fix Doomsday Device** — the party-sum Proficiency scaling is catastrophically overpowered.
6. **Fix Steadfast Hidewarden** — remove Armor Slot references (adversary-only mechanic).

### Priority 2: High-Priority Metadata

7. **Add card type** (ability/spell/grimoire) to all domain card files.
8. **Add recall cost** (0-4 Stress) to all domain card files.
9. **Specify damage type** (physical/magic) on all cards that deal damage.
10. **Define all custom conditions** inline where they are introduced.

### Priority 3: Documentation Required

11. **Document the Curses! social systems**: Attitude, Faction, Reputation, Favor, Adherent.
12. **Document the Aura system**: trigger, maintenance, failure.
13. **Document the Curse (★) and Synergy (↔) card systems**.
14. **Document the adapted Ranger Companion rules** for non-Ranger classes.
15. **Document that homebrew domains use Levels 1-5** (not the full 1-10).

### Priority 4: Balance Review

16. Review all features granting **Evasion bonuses** (Slippery, Unburdened Grace, Ward the Body, Studied Threat) — several may stack to unreasonable levels.
17. Review all features with **no usage limit** or **no cost** (Predator, Courageous Words, Preternatural Healing).
18. Review **Sending a Message** (+3 per Level) scaling — likely needs to be per Tier.
19. Review **exploding die** mechanics (Isdaan, Lothrian) for unbounded potential.

---

## APPENDIX A: Difficulty Direction Reference

Several features in this content apply penalties to adversary **Difficulty**. In Daggerheart, PCs roll against adversary Difficulty — a LOWER Difficulty means the adversary is EASIER to hit. This means:

- **"-2 to Difficulty"** = adversary becomes EASIER to hit (benefits PCs)
- **"+2 to Difficulty"** = adversary becomes HARDER to hit (debuffs PCs)

Cards that appear to use this correctly as a PC benefit:
- War Theorist "Expose Weakness" (-2 to Difficulty = easier to hit ✅)
- Knave "Make a Ruckus" (-2 to Difficulty = characters disrupted ✅)
- Blistering Sermon (-1 to Difficulty = easier to hit ✅)
- Cantor-Marshal "Shamed" (-2 to Difficulty ✅ if intent is to make easier to hit)

Cards with potentially reversed intent:
- **Profundity "Shame"** (-2 to Difficulty) — described as a negative condition applied to a target, but mechanically benefits the PCs. If the intent is to debuff the target (make them harder), this is backwards. If the intent is to benefit PCs (make target easier to hit), the condition name "Shame" implies it should be negative for the target, which it technically is — they ARE easier to hit. **Verdict: Likely correct but confusing. Add clarifying text.**

---

## APPENDIX B: SRD Class Stat Comparison

| Class | Evasion | HP | Total |
|---|---|---|---|
| **SRD Classes** | | | |
| Bard | 10 | 5 | 15 |
| Druid | 10 | 6 | 16 |
| Guardian | 9 | 7 | 16 |
| Ranger | 12 | 6 | 18 |
| Rogue | 12 | 6 | 18 |
| Seraph | 9 | 7 | 16 |
| Sorcerer | 10 | 6 | 16 |
| Warrior | 11 | 6 | 17 |
| Wizard | 11 | 5 | 16 |
| **Homebrew Classes** | | | |
| All 9/7 classes | 9 | 7 | 16 |
| All 10/6 classes | 10 | 6 | 16 |

All homebrew classes total 16, which is within the SRD range (15-18). ✅

---

*Report generated by SRD Compliance Agent. All citations reference Daggerheart SRD v1.0 (2025) and Daggerheart Homebrew Kit v1.0 (July 2025).*
