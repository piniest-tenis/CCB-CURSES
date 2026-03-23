# SRD Language Audit — The Land of Tidwell
**Scope**: All 30 Class files + all 132 Domain Card files  
**Auditor**: SRD Compliance Agent  
**Reference**: Daggerheart SRD v1.0 (digested) + Daggerheart Homebrew Kit v1.0 (digested)  
**Date**: 2026-03-23

---

## Executive Summary

This audit covers every class feature file in `markdown/Classes/` and every domain card file in `markdown/Domains/` for the *Land of Tidwell* homebrew campaign. The content is rich, creative, and generally well-designed. However, **seven systemic issues** affect the majority of files, and **several individual cards contain critical rules violations**. These are organized below from most-to-least severe.

Key findings:
- **"As a reaction" / "immediate action" / "free action"** language is used for PC features — these terms do not exist in the SRD's PC action economy. This appears in ~10 files across both classes and domains.
- **Undefined die types** (d4, d20, flat roll values) are used in damage expressions — SRD PC damage always uses Proficiency-scaling dice.
- **"Heal" instead of "clear"** for Hit Point recovery — SRD consistently uses "clear."
- **Capitalisation inconsistency** for Advantage/Disadvantage, Attack Roll, range terms, and damage types.
- **Custom conditions** are used prolifically without consistent definition. A few (notably `_Slowed_` in Prizebreaker) are used without any inline definition.
- **"Spellcraft Roll"** (misspelling of "Spellcast Roll") appears in at least one domain card.
- **"Minor damage threshold"** used in Steadfast as a protective value — this is a rules error; the SRD has **Major** and **Severe** thresholds only (minor damage is simply below-Major, not a labelled threshold).
- **`1d20` flat damage dice** (not using Proficiency) appear in Study/Applied Entropy, Study/Combined Systems, and are referenced in Study/Doomsday Device with "Party's Combined Proficiency" — a non-standard term.

Total issues catalogued: **4 Critical, 22 Major, 31 Minor**.

---

## SRD Standards Reference

For auditors and authors, the confirmed SRD standards used as ground truth:

| Category | Standard |
|---|---|
| Conditions (standard) | Hidden, Restrained, Vulnerable (plus Temporary modifier) |
| Special conditions (SRD spells) | Cloaked, Dazed, Stunned, Horrified, Entranced (defined where they appear) |
| Range terms | Melee, Very Close, Close, Far, Very Far, Out of Range |
| Traits | Agility, Strength, Finesse, Instinct, Presence, Knowledge |
| Resources | Hope, Fear, Stress, Hit Points (HP), Armor Slots, Armor Score, Evasion, Proficiency |
| Roll types | Action Roll, Reaction Roll, Spellcast Roll, attack roll, damage roll |
| Damage thresholds | Major, Severe (not Minor — minor damage is damage below the Major threshold) |
| Tier | Tier 1–4 (numeric) |
| HP recovery | "clear" (not "heal") |
| PC action economy | No explicit reactions or free actions — features use trigger language |

---

## CRITICAL Issues

Critical issues represent mechanics that are rules-incorrect or will produce undefined/broken behaviour at the table.

---

### CRIT-01 — `_Slowed_` condition used without definition
**File**: `markdown/Classes/Prizebreaker.md`  
**Quoted text**: *"The target gains the Slowed condition."*  
**Problem**: `_Slowed_` is never defined anywhere in the Prizebreaker class file, the Prizebreaker subclass files, or in the SRD. There is no established mechanical meaning for Slowed in this system.  
**SRD basis**: Conditions must be defined where they appear per Homebrew Kit design guidance (p. 14). The SRD's three standard conditions are Hidden, Restrained, Vulnerable.  
**Fix**: Add an inline definition, e.g.: *"The target gains the _Slowed_ condition. While _Slowed_, the target may only move up to Very Close range on their turn. This condition is cleared at the end of their next turn."*

---

### CRIT-02 — "Minor damage threshold" used as a protective value
**File**: `markdown/Classes/Steadfast.md` (Hope Feature)  
**Quoted text**: *"…reduce incoming damage by your minor damage threshold."*  
**Problem**: In the SRD, "minor" is not a named damage threshold — it describes damage that falls **below** the Major threshold. The two named thresholds are **Major** and **Severe**. Using "minor damage threshold" as a numeric value is a rules error that has no calculable basis.  
**SRD basis**: SRD p. 36 — damage thresholds are Major and Severe; damage that does not meet the Major threshold is simply "minor" (descriptive, not a stat).  
**Fix**: Replace with a specific value or reference a defined stat. E.g.: *"…reduce incoming damage by your Proficiency."* Or if the intent is threshold-based: *"If incoming damage does not meet your Major damage threshold, you take no damage."*

---

### CRIT-03 — `1d20` flat damage (no Proficiency scaling)
**Files**: 
- `markdown/Domains/Study/(Level 2) Applied Entropy ★.md` — *"the target takes 1d20 damage"*  
- `markdown/Domains/Study/(Level 3) Combined Systems.md` — *"take d20 damage using your Proficiency"* (Deadfall Trap)  
**Problem**: `Applied Entropy` uses a bare `1d20` with no Proficiency modifier — a static flat damage roll that does not scale with the character. `Combined Systems` correctly adds "using your Proficiency" but inconsistently uses d20 at a Level 3 card, which is extremely high variance.  
**SRD basis**: Homebrew Kit p. 18 — PC damage dice should scale using Proficiency. Flat unscaled dice bypass the Proficiency system and produce inconsistent damage at all tiers.  
**Fix for Applied Entropy**: *"the target takes d10 damage using your Proficiency"* (or d12 if high-powered feel is intended).  
**Fix for Combined Systems**: d20 Proficiency is technically legal under the Homebrew Kit but is extreme — consider d12 using your Proficiency for a more balanced feel.

---

### CRIT-04 — "Spellcraft Roll" (misspelling of Spellcast Roll)
**File**: `markdown/Domains/Trickery/(Level 3) Provocateur ★ ↔.md`  
**Quoted text**: *"Make a Spellcraft Roll (13)."*  
**Problem**: The correct SRD term is **Spellcast Roll**, not "Spellcraft Roll." This is likely a typo but will cause confusion at the table about which roll type applies and whether a Spellcast trait modifier is used.  
**SRD basis**: SRD p. 38 — the roll type is "Spellcast Roll."  
**Fix**: *"Make a Spellcast Roll (13)."*

---

## MAJOR Issues

Major issues represent significant terminology or rules deviations that could create confusion or unintended mechanical effects at the table.

---

### MAJ-01 — "As a reaction" used for PC features (multiple files)
**Scope**: ~10 files across classes and domains  
**Examples**:
- `markdown/Domains/Trickery/(Level 1) On the Lam.md`: *"As a reaction to an Attack, you can spend a Hope…"*
- `markdown/Domains/Valiance/(Level 3) Sudden Step ★.md`: *"Spend a Hope to move up to Close range as an immediate action. This can be used as a reaction."*
- `markdown/Domains/Violence/(Level 3) Scrapper ★ ↔.md` (Curse): *"you can immediately make an attack as a reaction roll."*
- `markdown/Domains/Valiance/(Level 2) Reactive.md`: Uses "reaction" framing throughout
- `markdown/Classes/Night Broker.md` (Acquisitor): *"use Between Places as a reaction"*
- `markdown/Classes/War Theorist.md` (Siege Scholar): *"direct an ally…as a reaction"*
- `markdown/Classes/Prizebreaker.md` (Houndtooth): *"move up to Very Close range as a reaction"*  
**Problem**: PCs do not have an explicit "reaction" action type in Daggerheart. Homebrew Kit p. 12 clarifies that PC features use trigger language, not reaction slots. "As a reaction" implies a formal action economy slot that does not exist for PCs.  
**SRD basis**: Homebrew Kit p. 12 — feature writing uses trigger → effect; no PC reaction slot.  
**Fix**: Replace "as a reaction" with trigger language. E.g.:  
- On the Lam: *"When you are the target of an incoming attack, you can spend a Hope to gain a +2 bonus to your Evasion until the attack resolves."*  
- Sudden Step: *"Spend a Hope to immediately move up to Close range. You may do this when you are the target of an incoming attack."*  
- Scrapper: *"you can immediately make an attack against that adversary."*

---

### MAJ-02 — "As a free action" / "as an immediate action" used for PC features
**Scope**: ~4 files  
**Examples**:
- `markdown/Domains/Valiance/(Level 3) Sudden Step ★.md`: *"as an immediate action"* (see MAJ-01 above)
- `markdown/Classes/War Theorist.md` (Front-Line Theorist): *"use Combat Assessment as a free action"*
- `markdown/Classes/Youthful Protagonist.md`: *"absorb it instead as a free action"*
- `markdown/Classes/Night Broker.md` (Fold-Walker): *"teleport to that point as an immediate action"*  
**Problem**: "Free action" and "immediate action" are not SRD terms. Daggerheart does not have a formal action taxonomy distinguishing action types in this way.  
**Homebrew Kit basis**: p. 12 — feature writing should describe what the feature does without referencing undefined action types.  
**Fix**: Rewrite to describe the effect without action-type labels. E.g.:  
- *"use Combat Assessment without expending your turn action"*  
- *"you may immediately teleport to that point without expending your turn action"*

---

### MAJ-03 — "Heal" used instead of "clear" for HP recovery (multiple files)
**Scope**: ~8 files  
**Examples**:
- `markdown/Domains/Violence/(Level 3) Preternatural Healing ★.md`: *"you can spend a Hope at any time to clear a Hit Point"* (correct) but then: *"you can use this ability to heal yourself even after your last Hit Point is marked"* (non-standard)
- `markdown/Classes/Oathbreaker Mystic.md` (Branded Penitent): *"heal 1 Hit Point"*
- `markdown/Domains/Charm/(Level 2) Calming Presence ★.md`: *"clear 2 Hit Points and Stress on the target"* (correct) — this card is fine; cited for contrast  
**Problem**: SRD uses "clear" a Hit Point for recovery. "Heal" is a natural-language synonym but creates inconsistency and may confuse players about whether the action differs mechanically from "clearing."  
**SRD basis**: SRD p. 37 — "clear a Hit Point" is the standard phrasing.  
**Fix**: Replace "heal [N] Hit Point[s]" with "clear [N] Hit Point[s]" throughout.

---

### MAJ-04 — Advantage/Disadvantage capitalisation inconsistency (systemic)
**Scope**: ~25+ files  
**Examples**:
- `markdown/Domains/Creature/(Level 3) Predator ★ ↔.md`: *"Attacks made against you gain Disadvantage"* (correct) — *"Make a Strength or Presence roll against a 15 difficulty"* (lowercase d in difficulty, also: see MAJ-09)
- `markdown/Domains/Faithful/(Level 4) Heretic ★ ↔.md`: *"you gain advantage on any rolls"* (lowercase — incorrect)
- `markdown/Domains/Charm/(Level 4) Diplomat ★ ↔.md`: *"Gain advantage on a roll to de-escalate"* (lowercase — incorrect)
- `markdown/Domains/Trickery/(Level 3) Conman ★ ↔.md`: *"You gain Advantage on all rolls"* (correct)  
**Problem**: "Advantage" and "Disadvantage" should always be capitalised as they are proper game terms in Daggerheart.  
**SRD basis**: SRD uses title-case "Advantage" and "Disadvantage" throughout.  
**Fix**: Global find-and-replace: `advantage` → `Advantage`, `disadvantage` → `Disadvantage` (when used as the game term, not general English adjectives).

---

### MAJ-05 — "Double damage" / "double your [Trait]" language (non-standard)
**Scope**: ~5 files  
**Examples**:
- `markdown/Domains/Violence/(Level 4) Dirty Fighter ★ ↔.md` (Sucker Punch): *"spend 2 Hope to double the total damage your target receives"*
- `markdown/Classes/Knave.md` (Pretty Face): *"deal double damage"*
- `markdown/Classes/Herder.md` (Culling the Herd): *"double damage to that adversary"*
- `markdown/Classes/Scavenger.md` (Needler): *"deal double damage to that adversary"*  
**Problem**: "Double damage" is not a defined SRD term. There is no standard rule for what doubling damage means (does it double the dice roll, the final result, the proficiency modifier?). This creates ambiguity at the table.  
**Homebrew Kit basis**: p. 18 — damage expressions should use specific dice and Proficiency scaling.  
**Fix**: Replace with an explicit additional damage roll. E.g.: *"deal an additional [dice] damage using your Proficiency"* or *"deal damage twice, rolling separately for each"* — discuss with GM and align the intent.

---

### MAJ-06 — "Maintenance Difficulty" used without SRD grounding (Aura cards)
**Scope**: All Aura cards — `Aura of Bravery`, `Aura of Destiny`, `Aura of Mercy`, `Aura of Sacrifice`, `Aura of Peace`, `Credo` (embedded Aura of Destiny)  
**Examples**:
- `markdown/Domains/Valiance/(Level 1) Aura of Bravery.md`: *"Maintenance Difficulty (13)."*
- `markdown/Domains/Faithful/(Level 3) Aura of Mercy ★.md`: *"Maintenance Difficulty (13)."*
- `markdown/Domains/Faithful/(Level 4) Aura of Sacrifice ★.md`: *"Maintenance Difficulty (15)."*  
**Problem**: "Maintenance Difficulty" is not an SRD term. There is no standard rule establishing what constitutes a Maintenance roll, which trait is used, when it is made, or what happens on failure. The mechanics for Auras appear to be a campaign frame system, but the rules for maintaining them are never defined in any of the audited files.  
**Homebrew Kit basis**: p. 19 — campaign frame mechanics must be defined somewhere accessible.  
**Fix**: Define the Aura maintenance mechanic either in a dedicated `Auras.md` campaign frame document (already referenced as `[[Aura]]`) or inline in the domain description file. The definition should specify: when the Maintenance roll is made, which trait is used, and what happens on failure.

---

### MAJ-07 — `[[Aura]]`, `[[Attitude]]`, `[[Reputation]]`, `[[Favor]]`, `[[Ranger Companions]]` are mechanically undefined in audited files
**Scope**: All 11 domain folders, ~20 class files  
**Problem**: These Obsidian wiki-links point to campaign frame mechanics that are frequently referenced but whose rules are not defined within any of the audited files. `[[Attitude]]`, `[[Reputation]]`, and `[[Favor]]` are used in dozens of cards to modify rolls, unlock effects, and determine character access. Without a definition, these mechanics cannot be adjudicated consistently.  
**Homebrew Kit basis**: p. 19 — campaign frame mechanics referenced in card text must have accessible rule definitions.  
**Fix**: Ensure `Attitude.md`, `Reputation.md`, `Favor.md`, `Aura.md`, and `Ranger Companions.md` exist in the vault and are complete with mechanical definitions. This audit cannot validate those documents since they were not in scope — but their existence is required for the domain/class cards to function.

---

### MAJ-08 — Undefined or incompletely defined homebrew conditions (proliferation)
**Scope**: ~30 conditions across classes and domains  
**Examples of undefined/incomplete conditions** (not defined inline or in SRD):
- `_Ensorcelled_` (Artistry/Bewitch) — effect is clear, duration stated, but ending condition is only "duration of next turn" — acceptable but terse
- `_Wracked with Doubt_` (Charm/Calming Presence) — well-defined inline ✓
- `_Unsteady_` (Creature/Menacing) — defined inline ✓
- `_Immersed_` (Oddity/Immersion) — defined inline ✓
- `_Tethered_` (Study/Combined Systems) — defined inline ✓
- `_Decaying_` (Study/Applied Entropy) — *"-2 penalty to Evasion score until after its next action"* — reasonably defined
- `_Knocked Down_` (Thievery/Takedown) — defined inline ✓
- `_Blinded_` (Thievery/Blinding Dust) — effect stated; "unable to see" is clear ✓
- `_Semi-Corporeal_` (Weird/Spectral Aspect) — defined inline ✓
- `_Blazing_` (Valiance/Righteous Fire, Trickery/Pig in a Poke) — defined in Righteous Fire but cross-referenced in Pig in a Poke without re-stating effect — **minor dependency issue**
- `_Trauma_` (Violence/Dish It Out) — defined inline ✓
- `_Endemic_` (Creature/Endemia) — defined inline ✓
- `_Altered_` (Creature/Metamorphosis) — effect is vague ("a key feature or ability of a Creature") — **major ambiguity**
- `_Exhausted_` (Charm/Logomancy) — defined inline ✓
- `_Stunned_` (Artistry/Profundity, Oddity/Abnormal Physiology) — *"cannot use reactions and cannot take other actions"* — uses "reactions" (see MAJ-01); also _Stunned_ appears in the SRD's Arcana spell with specific text; these definitions may not match
- `_Shamed_` (Artistry/Profundity) — defined inline as *"-2 penalty to their Difficulty"* — acceptable if PC-targeted Difficulty is defined as a campaign mechanic  
**Fix priority**:
- **High**: `_Altered_` — needs a concrete mechanical definition
- **Medium**: `_Stunned_` — reconcile definition with SRD Arcana spell text; remove "reactions" language
- **Medium**: `_Blazing_` — re-state definition wherever cross-referenced
- **Low**: All other inline-defined conditions are acceptable

---

### MAJ-09 — Lowercase "difficulty" used as a numeric target (inconsistent)
**Scope**: ~15 files  
**Examples**:
- `markdown/Domains/Creature/(Level 3) Predator ★ ↔.md`: *"Make a Strength or Presence roll against a 15 difficulty"*
- `markdown/Domains/Artistry/(Level 3) Profundity ★.md`: *"_Shamed_ characters gain a -2 penalty to their Difficulty"* (capitalised here — but does "Difficulty" refer to the adversary stat or a custom PC stat?)  
**Problem**: In the SRD, "Difficulty" is primarily an adversary stat (their defence/evasion equivalent for social/non-attack rolls). Its use as a general numeric target in domain cards is inconsistent in capitalisation and meaning.  
**Fix**: Use a capital "D" for Difficulty consistently when referencing it as a game term. When using it as a numeric target in a roll, format as *"against a Difficulty of 15"* for clarity.

---

### MAJ-10 — "d4s equal to your Tier" / "roll a d6" / "roll a d4" used as outcome dice (non-Proficiency)
**Scope**: ~8 files  
**Examples**:
- `markdown/Domains/Charm/(Level 5) Intelligence Network.md`: *"roll a number of d4s equal to your Tier"*
- `markdown/Domains/Thievery/(Level 5) Ambitious Score.md`: *"Roll a d6"*
- `markdown/Domains/Creature/(Level 4) Opportunistic ★ ↔.md`: *"roll a d6 and on a rolled 6 you ignore the cost"*
- `markdown/Domains/Trickery/(Level 4) Possessed ★ ↔.md` (Curse): *"you must roll a d4"*  
**Problem**: Rolling single die types (d4, d6) for outcome tables is a campaign frame mechanic pattern. These are not attack or damage dice, so Proficiency is not expected. However, this is a new mechanic type that should be flagged for awareness. These are acceptable as long as the intent is clearly for a table/outcome roll rather than a damage roll.  
**Verdict**: These uses are **acceptable** as non-damage outcome mechanics. No fix required, but they should be documented as campaign frame mechanics.

---

### MAJ-11 — "(Level 7) Weird-Touched" referenced but does not exist in Level 1–5 range
**File**: `markdown/Domains/Weird/(Level 4) Charlatan ★ ↔.md`  
**Quoted text**: *"If you have the [(Level 7) Weird-Touched] domain card in your loadout…"*  
**Problem**: Domain cards go up to Level 5. A "Level 7" card is outside the defined domain card level range per the SRD. This is either a dead reference (the card was planned but never written) or a mistake.  
**SRD basis**: SRD p. 12 — domain cards are acquired at character levels 1–9, but domain card levels are 1–5 in the loadout system.  
**Fix**: Either create the Level 7 card as a campaign-specific addition (and define the rules for how it is acquired), or update the reference to an existing card.

---

### MAJ-12 — "Party's Combined Proficiency" used as a damage scaling term
**File**: `markdown/Domains/Study/(Level 5) Doomsday Device.md`  
**Quoted text**: *"a single-use weapon that does d20+5 damage using your Party's Combined Proficiency"*  
**Problem**: "Party's Combined Proficiency" is not a defined SRD term. There is no rule for how to calculate or apply this value.  
**Homebrew Kit basis**: p. 18 — damage expressions should use defined values.  
**Fix**: Define what "Party's Combined Proficiency" means (sum of all PC Proficiency scores? Average?), or replace with a simpler scaling: *"d20+5 damage, adding your Proficiency to the result"*.

---

### MAJ-13 — "Armor slot" referenced in PC-targeting features
**Scope**: ~3 files  
**Examples**:
- `markdown/Domains/Charm/(Level 4) Fop ★ ↔.md` (Curse): *"When you mark a Hit Point or an Armor slot, you must mark a Stress."*  
**Problem**: Homebrew Kit p. 17 states that PC features should target adversary mechanics (Difficulty, damage thresholds) rather than Armor Slots when dealing with defensive effects. Referencing "Armor slot" as a tracking mechanic on a PC is fine — PCs do have armor slots — but it should be clear this is a narrative trigger, not a mechanical attack on PC defences.  
**Verdict**: This is **acceptable** — Fop's curse uses "Armor slot" as a trigger for marking Stress (narrative consequence), not as a target value. However, authors should be aware of the Homebrew Kit guidance when designing new features.

---

### MAJ-14 — "Gain resistance towards one type of damage" (undefined term)
**File**: `markdown/Domains/Faithful/(Level 4) Sacrifice ★ ↔.md`  
**Quoted text**: *"Gain resistance towards one type of damage until the end of the Scene"*  
**Problem**: "Resistance" to damage is not a defined SRD mechanic. There is no rule for what resistance means (half damage? threshold increase?).  
**Fix**: Replace with a defined effect: *"Add +[N] to your damage thresholds against one damage type until the end of the scene"* or *"When you would take damage of the chosen type, reduce it by [value]."*

---

### MAJ-15 — "Critically succeed" / "critical success" / "critical failure" used as triggerable states outside dice mechanics
**Scope**: ~6 files  
**Examples**:
- `markdown/Domains/Creature/(Level 4) Opportunistic ★ ↔.md`: *"Treat all successes on this roll as a critical success"*
- `markdown/Domains/Study/(Level 3) Philosopher ★ ↔.md`: *"Whenever you critically succeed in trait roll using Knowledge…"*
- `markdown/Domains/Creature/(Level 4) Opportunistic ★ ↔.md` (Curse): *"your next failure is treated as a critical failure"*  
**Problem**: "Critical success" and "critical failure" are valid SRD terms (rolling max on both dice). However, "treat all successes as a critical success" and "next failure is a critical failure" create fabricated critical states that circumvent the dice mechanic. This is technically a homebrew extension of the crit system; it needs to specify what mechanically changes (e.g., "treat as though you rolled maximum on both dice" or "the GM gains 2 Fear").  
**Fix**: Specify the mechanical effect: *"treat this roll as though both dice showed their maximum value"* or define what "critical success/failure" grants beyond the base narrative description.

---

### MAJ-16 — "Counts against" / "does not count against" the once-per-X limit language
**File**: `markdown/Domains/Oddity/(Level 4) Mad ★ ↔.md`  
**Quoted text**: *"This is distinct from all other effect limitations, (i.e. does not count against the 'once per session' limit of the base 'Mad' ability)."*  
**Problem**: This is a well-intentioned clarification but is clumsily worded — specifically the parenthetical "(i.e. does not count against the 'once per session' limit)" creates confusion about whether it is a separate use or a replacement. The card grants two "once per session" questions; this should be stated more cleanly.  
**Fix**: Rewrite as: *"This grants you an additional once-per-session question, separate from and in addition to the base ability of this card."*

---

### MAJ-17 — Typographical errors with mechanical implications
**Scope**: ~5 files  
**Examples**:
- `markdown/Domains/Study/(Level 1) Research.md`: *"whcih"* (typo for "which") — minor but audit-complete
- `markdown/Domains/Weird/(Level 2) Paranormal Attunement.md`: *"make a Knowledge or Instinct role"* — "role" should be "roll"
- `markdown/Domains/Charm/(Level 5) Logomancy ★.md`: *"or you or the target is sapient"* — grammatically garbled; likely means "or until the effect is ended" (the sentence fragment about sapience appears to be a leftover edit artifact)
- `markdown/Domains/Thievery/(Level 3) Mugger ★ ↔.md`: *"[[Character||Characters]]"* — double pipe in wiki-link
- `markdown/Domains/Study/(Level 4) Physicist ★ ↔.md`: *"Religious adherents treat you worse have a worsened attitude"* — run-on sentence error  
**Fix**: Proofread and correct all typographical errors.

---

### MAJ-18 — "Scientist domain cards" referenced in Philosopher
**File**: `markdown/Domains/Study/(Level 3) Philosopher ★ ↔.md`  
**Quoted text**: *"place a number of tokens equal to the number of Scientist domain cards in your loadout and vault"*  
**Problem**: There is no "Scientist" domain in the audited files. The correct domain is "Study." This appears to be a renamed domain where the naming wasn't updated in this card.  
**Fix**: Replace "Scientist domain cards" with "Study domain cards."

---

### MAJ-19 — "Spellcast Reaction Roll" — non-standard term
**File**: `markdown/Domains/Oddity/(Level 2) Parasitic Synergy.md`  
**Quoted text**: *"you can make a Spellcast Reaction Roll (13)."*  
**Problem**: "Spellcast Reaction Roll" is not a standard SRD roll type. The SRD has "Reaction Roll" (used when an adversary attacks and a PC reacts) and "Spellcast Roll" as distinct roll types. A "Spellcast Reaction Roll" conflates these into a third unnamed hybrid.  
**Fix**: Clarify the intended roll type. If this is triggered by an ally's action and uses the Spellcast trait, call it: *"make a Spellcast Roll (13) as a response to your ally's success."* If it is truly a Reaction Roll (adversary-triggered), reframe accordingly.

---

### MAJ-20 — "When you are involved in a Tag Team Roll" — undefined term
**File**: `markdown/Domains/Artistry/(Level 4) Grace Note.md`  
**Quoted text**: *"Whenever you are involved in a Tag Team Roll initiated by another player, gain a Hope. Tag Team Rolls initiated by you cost 2 Hope instead of 3."*  
**Problem**: "Tag Team Roll" is not an SRD term. There is an SRD mechanic for players assisting each other (spending Hope to add to a roll), but "Tag Team Roll" as a named mechanic with a 3 Hope cost is a campaign frame mechanic. It is referenced as if it's a standard rule, but it's not defined in any audited file.  
**Fix**: Define "Tag Team Roll" in a campaign frame document and add an inline note, or replace with the SRD standard phrasing: *"When you use your Hope to assist another player's roll…"*

---

### MAJ-21 — "Gain a bonus to ALL rolls equal to your Reputation" (unbounded scaling)
**File**: `markdown/Domains/Valiance/(Level 5) Champion.md`  
**Quoted text**: *"you gain a bonus to ALL rolls equal to your [[Reputation]] with the chosen Faction."*  
**Problem**: Applying a flat bonus to **all rolls** is extremely broad. If Reputation can reach +4 or +5, this becomes a +4/+5 to every single roll, which is significantly more powerful than any comparable SRD feature.  
**Homebrew Kit basis**: p. 16 — features should be bounded and balanced against comparable class features.  
**Fix**: Scope the bonus more narrowly: *"you gain a bonus to rolls made in pursuit of that Faction's Primary Goals equal to your Reputation with the chosen Faction."*

---

### MAJ-22 — "Gain advantage on any rolls to intimidate" (lowercase, and unscoped)
**File**: `markdown/Domains/Faithful/(Level 4) Heretic ★ ↔.md` (Curse)  
**Quoted text**: *"you gain advantage on any rolls to intimidate these characters"*  
**Problem**: Lowercase "advantage" (see MAJ-04). Additionally, "any rolls" is broader than intended — presumably this means attack rolls or Presence rolls, not all rolls.  
**Fix**: *"you gain Advantage on Presence rolls to intimidate these characters."*

---

## MINOR Issues

Minor issues represent phrasing inconsistencies, small terminology deviations, or style choices that deviate from SRD conventions but do not break mechanics.

---

### MIN-01 — "within close range" (lowercase range term)
**Files**: Multiple, including `markdown/Classes/Herder.md` (Animist)  
**Problem**: Range terms should be capitalised (Close, Far, Very Close, etc.) consistently.  
**Fix**: Capitalise all range terms: *"within Close range."*

---

### MIN-02 — "Far Range" (capitalised "Range" — inconsistent)
**Files**: `markdown/Classes/Devout.md` (True Believer)  
**Problem**: "Far Range" capitalises "Range" — the standard is to capitalise only the magnitude word: "Far range."  
**Fix**: *"within Far range"* (lowercase "range").

---

### MIN-03 — "investigation rolls" (non-standard roll type)
**Files**: `markdown/Classes/Hypnomancer.md` (Social Enchanter)  
**Problem**: "Investigation rolls" is not an SRD roll type. Rolls should reference a trait (e.g., "Instinct roll" or "Knowledge roll").  
**Fix**: Replace with the relevant trait: *"Instinct roll"* or *"Knowledge roll."*

---

### MIN-04 — "Instinct Trait Roll" (redundant phrasing)
**Files**: `markdown/Classes/Pugilist.md` (Brutal Technician)  
**Problem**: "Instinct Trait Roll" is redundant — the SRD phrasing is simply "Instinct roll."  
**Fix**: *"Instinct roll."*

---

### MIN-05 — "Attack Roll" capitalised vs. "attack roll" lowercase (inconsistent)
**Scope**: ~15 files (both classes and domains)  
**Problem**: SRD uses lowercase "attack roll" and "damage roll" consistently. Some files capitalise one or both terms inconsistently.  
**Fix**: Normalise to lowercase "attack roll" and "damage roll" throughout (or pick a consistent convention and apply globally). The SRD standard is lowercase.

---

### MIN-06 — "d20 + your Knowledge score" (non-standard dice)
**Files**: `markdown/Classes/Hypnomancer.md`  
**Problem**: Daggerheart uses Duality Dice (2d12), not a d20. A "d20 + Knowledge" roll implies a d20 system mechanic.  
**Fix**: Replace with: *"make a Knowledge roll"* (which uses Duality Dice + Knowledge as standard).

---

### MIN-07 — "Countdown Tracker" vs "Completion Tracker" used interchangeably
**Scope**: Multiple downtime project files (Artistry, Creature, Study, Trickery, Valiance)  
**Examples**:
- *"Countdown Tracker of 5"* (Artistry/Masterwork)
- *"Completion Tracker of 6"* (Study/Doomsday Device)
- *"Completion Tracker of 4"* (Trickery/Infiltrate)  
**Problem**: The terms "Countdown Tracker" and "Completion Tracker" are used for identical mechanics but named differently across files. This is a campaign frame mechanic — pick one term and use it consistently.  
**Fix**: Standardise on one term. "Countdown Tracker" appears more frequently and is also used in class files — recommend that as the standard.

---

### MIN-08 — "Spend a token form this card" (typo)
**File**: `markdown/Domains/Artistry/(Level 1) Inspiration.md`  
**Quoted text**: *"You can spend a token form this card"*  
**Problem**: "form" should be "from."  
**Fix**: *"You can spend a token from this card"*

---

### MIN-09 — "Add a -1 penalty Difficulty of a roll" (missing word)
**File**: `markdown/Domains/Charm/(Level 1) Practiced Liar.md`  
**Quoted text**: *"Add a -1 penalty Difficulty of a roll to avoid scrutiny"*  
**Problem**: Missing word — should be *"Add a -1 penalty to the Difficulty of a roll"*  
**Fix**: *"Add a -1 penalty to the Difficulty of a roll to avoid scrutiny when you are disguised."*

---

### MIN-10 — "once per session" capitalisation inconsistency
**Scope**: ~20 files  
**Problem**: "Once per session" is sometimes written as "Once per Session" (capitalised) and sometimes lowercase. The SRD uses lowercase session consistently.  
**Fix**: Use lowercase "session" throughout.

---

### MIN-11 — "Presence roll" vs. "Presence Roll" capitalisation
**Scope**: ~10 files  
**Problem**: Trait rolls (Presence roll, Instinct roll, etc.) are sometimes capitalised inconsistently ("Presence Roll" vs. "Presence roll"). SRD uses lowercase for the word "roll" after a trait name.  
**Fix**: Lowercase "roll" after trait names: *"Presence roll," "Instinct roll," "Knowledge roll,"* etc.

---

### MIN-12 — "Gain advantage on any attack" vs "Gain Advantage on one attack"
**File**: `markdown/Domains/Faithful/(Level 2) Benevolence ★.md`  
**Quoted text**: *"Gain Advantage on one attack"*  
**Problem**: "One attack" scoping is clear but "attack" is slightly ambiguous — does this mean one attack roll, or one complete attack action? Likely intended as one attack roll.  
**Fix**: *"Gain Advantage on one attack roll."*

---

### MIN-13 — "using your proficiency" (lowercase) vs "using your Proficiency" (uppercase) inconsistency
**Scope**: ~8 files  
**Examples**:
- `markdown/Domains/Valiance/(Level 4) Righteous Fire ★ ↔.md`: *"deal your normal weapon damage plus d8 additional damage using your proficiency"* (lowercase — incorrect)
- Most other cards use uppercase "Proficiency" correctly  
**Fix**: Capitalise "Proficiency" consistently as a proper game term.

---

### MIN-14 — "on a rolled 6" (unusual phrasing)
**File**: `markdown/Domains/Creature/(Level 4) Opportunistic ★ ↔.md` (Curse)  
**Quoted text**: *"roll a d6 and on a rolled 6 you ignore the cost"*  
**Problem**: "On a rolled 6" is awkward phrasing.  
**Fix**: *"roll a d6; on a result of 6, you ignore this cost."*

---

### MIN-15 — "Aid: Before you roll, describe how your Ethereal Buddy sits you." (garbled text)
**File**: `markdown/Domains/Weird/(Level 2) Ethereal Buddy.md`  
**Quoted text**: *"describe how your Ethereal Buddy sits you. Lower the Difficulty of your roll by 1."*  
**Problem**: "sits you" is garbled — likely "assists you."  
**Fix**: *"describe how your Ethereal Buddy assists you. Lower the Difficulty of your roll by 1."*

---

### MIN-16 — "re-roll your Hope Die" (non-standard phrasing for a Duality Die)
**File**: `markdown/Domains/Weird/(Level 3) Crushing Intellect.md`  
**Quoted text**: *"After a failed roll with Fear, re-roll your Hope Die"*  
**Problem**: In Daggerheart, the dice are the Hope Die and the Fear Die (the two d12s). Re-rolling the Hope Die specifically is mechanically meaningful (the Hope die determines the total along with the Fear die). This phrasing is technically valid but unusual — typically the result is taken as-is. Confirm this is intentional.  
**Verdict**: This is mechanically interpretable. Flag for author confirmation that re-rolling only the Hope die (keeping the Fear die) is the intent.

---

### MIN-17 — "Gain a +1 bonus to [[Reputation]] score" in a domain card (major campaign frame effect)
**File**: `markdown/Domains/Charm/(Level 4) Diplomat ★ ↔.md`  
**Quoted text**: *"Once per scene, gain a +1 bonus to your [[Reputation]] score with a target [[Faction]]."*  
**Problem**: Granting a permanent (or per-scene-renewable) Reputation bonus is a significant social economy effect. If this stacks indefinitely across scenes, it could bypass campaign progression. This needs a maximum cap or duration clarification.  
**Fix**: Add a cap or clarify: *"Once per scene (maximum once per session), gain a +1 bonus to your Reputation score with a target Faction, up to a maximum of +3 above your starting Reputation with that Faction."*

---

### MIN-18 — "move up to Far distance without sacrificing your action for that turn" (Investigator)
**File**: `markdown/Domains/Study/(Level 5) Investigator ★ ↔.md`  
**Quoted text**: *"Move up to Far distance without sacrificing your action for that turn"*  
**Problem**: "Sacrificing your action" implies a formal action slot — slightly non-standard phrasing. The SRD describes movement as part of your turn narrative, not as a sacrificed action slot.  
**Fix**: *"Move up to Far range without it counting as your action for that turn."*

---

### MIN-19 — "effected" used where "affected" is correct
**File**: `markdown/Domains/Study/(Level 5) Investigator ★ ↔.md` (Curse)  
**Quoted text**: *"a character otherwise effected by this Curse"*  
**Problem**: "Effected" (caused) should be "affected" (impacted by).  
**Fix**: *"a character otherwise affected by this Curse."*

---

### MIN-20 — "Müllerian Display" — special character may cause display issues
**File**: `markdown/Domains/Creature/(Level 3) Aposematic Display.md`  
**Quoted text**: *"*Müllerian Display:*"*  
**Problem**: The umlaut in "Müllerian" is a Unicode character that may not render correctly in all character sheet display contexts, especially plain-text exporters or older Obsidian plugins.  
**Verdict**: Acceptable for Obsidian vault use. Flag for engineering if the character sheet platform exports to ASCII.

---

### MIN-21 — "Your [[Primary Goals]]" wiki-link used as a noun phrase mid-sentence
**File**: `markdown/Domains/Artistry/(Level 5) Sow Discontent.md`  
**Quoted text**: *"Work with your GM to set the new [[Primary Goals]] of this faction"*  
**Problem**: `[[Primary Goals]]` is used as both a wiki-link and a noun, which is fine in Obsidian but implies there is a `Primary Goals.md` note defining this mechanic. Confirm this note exists.  
**Verdict**: Minor dependency check — ensure `Primary Goals.md` exists and is mechanically complete.

---

### MIN-22 — "Gain a token" vs "place a token" — inconsistent phrasing
**Scope**: ~15 files  
**Problem**: Some cards say "gain a token on this card," others say "place a token on this card," and others say "add a token to this card." These all mean the same thing but should be standardised.  
**Fix**: Standardise on "place a token on this card" to match the most common phrasing.

---

### MIN-23 — "Send this card to your Vault" — vault mechanic undefined for non-class card users
**File**: `markdown/Domains/Trickery/(Level 2) Three Card Shuffle ★.md` (Curse)  
**Quoted text**: *"you must send this card to your Vault until your next rest."*  
**Problem**: "Vault" (the pool of owned but not equipped domain cards) is a standard Daggerheart concept. However, forcing a card into the Vault mid-session is a non-standard mechanic not described in the SRD. The SRD only changes loadouts between sessions or at rest. This creates an unexpected mid-session loadout change.  
**Fix**: Clarify whether this is intentional as a mid-session unequip, and whether other loadout rules (e.g., minimum loadout size) apply. If so, add: *"Immediately remove this card from your active loadout and add it to your Vault. You may re-equip it at your next rest."*

---

### MIN-24 — "This effect lasts until you dismiss it, you implant another thought…or you or the target is sapient" (garbled Logomancy condition)
**File**: `markdown/Domains/Charm/(Level 5) Logomancy ★.md`  
**Quoted text**: *"This effect lasts until you dismiss it, you implant another thought in this or another target, or you or the target is sapient."*  
**Problem**: "Until you or the target is sapient" is clearly garbled — the intended meaning is probably "until the target is no longer sapient" (i.e., incapacitated, dead) or "unless the target is non-sapient." The current text reads as if the effect ends when you become sapient, which makes no sense.  
**Fix**: Rewrite the ending clause clearly: *"This effect lasts until you dismiss it, you implant a new thought into any target, or the target is incapacitated."*

---

### MIN-25 — "for for more than two turns" (duplicate word)
**File**: `markdown/Domains/Faithful/(Level 4) Aura of Sacrifice ★.md` (Curse)  
**Quoted text**: *"you must mark a Stress for every player in range of this Aura for for more than two turns"*  
**Problem**: Duplicate "for for."  
**Fix**: *"you must mark a Stress for every player who has been in range of this Aura for more than two turns."*

---

### MIN-26 — "a player rolls with Fear" (should be "a player's roll results in Fear")
**File**: `markdown/Domains/Faithful/(Level 4) Aura of Sacrifice ★.md`  
**Quoted text**: *"if a player rolls with Fear, you may dismiss the Aura immediately to change the result to be with Hope"*  
**Problem**: Technically a roll doesn't "roll with Fear" — Fear is a *result* of a roll (when the Fear die is higher). The phrasing is colloquially understood but non-standard.  
**Fix**: *"if a player's roll results in Fear, you may dismiss the Aura immediately to change the result to Hope instead."*

---

### MIN-27 — "Gain a +1 bonus to Damage Thresholds" (plural — which threshold?)
**File**: `markdown/Domains/Valiance/(Level 1) Aura of Bravery.md`  
**Quoted text**: *"allies in Close range of you gain a +1 Bonus to their Damage Thresholds."*  
**Problem**: "Damage Thresholds" is plural, implying both Major and Severe are each increased by 1. This is likely intended but should be stated explicitly.  
**Fix**: *"allies in Close range gain a +1 bonus to both their Major and Severe damage thresholds."*

---

### MIN-28 — "Once per long rest, when you become inspired" (ambiguous trigger)
**File**: `markdown/Domains/Faithful/(Level 1) Inspired.md`  
**Quoted text**: *"Once per long rest, when you become inspired, you can proselytize…"*  
**Problem**: "When you become inspired" is mechanically ambiguous — there is no SRD trigger called "becoming inspired." This appears to be a narrative/flavour trigger left to GM discretion, but it should be clearer.  
**Fix**: Define the trigger: *"Once per long rest, when you spend a Hope or gain a Hope through a class feature, you can choose to proselytize…"* or *"Once per long rest, describe a moment of spiritual inspiration and proselytize…"*

---

### MIN-29 — "Treat this card as if it had the following text" (Credo conversion mechanic)
**File**: `markdown/Domains/Faithful/(Level 5) Credo.md`  
**Quoted text**: *"Treat this card as if it had the following text: (Level 5) Aura of Destiny"*  
**Problem**: This is a clever design, but "treat this card as if it had the following text" is unusual meta-language. Functionally, the card becomes the embedded Aura of Destiny at completion. The engineering implementation needs to handle this transformation.  
**Verdict**: Mechanically valid; flag for engineering as a special case (card transforms at project completion).

---

### MIN-30 — "Mark a Hope" used in a few places (should be "Gain a Hope")
**Scope**: ~3 files  
**Problem**: Some cards say "mark a Hope" where the SRD uses "gain a Hope." "Mark" in Daggerheart is typically associated with filling in a slot (marking a Hit Point = taking damage). "Gain a Hope" is the correct phrasing for receiving Hope tokens.  
**Fix**: Replace "mark a Hope" with "gain a Hope" where Hope is being gained, not spent.

---

### MIN-31 — "Gain advantage" (lowercase) on Familiar Domain Cards — cross-domain reference issues
**Scope**: Multiple cross-domain references (Artistry → Prophet, Creature → Safecracker, etc.)  
**Problem**: Cross-domain card references using `[[(Level N) Card Name]]` wiki-link format are a campaign design pattern. These are appropriate for Obsidian but engineering must ensure the character sheet can resolve these references for conditional features.  
**Verdict**: No fix needed for the markdown files themselves; flag for engineering as a dependency resolution requirement.

---

## Systemic Patterns Summary

The following patterns require global action across the vault rather than individual file fixes:

| # | Pattern | Frequency | Priority |
|---|---|---|---|
| S-01 | "as a reaction" / "immediate action" / "free action" language for PC features | ~10 files | **High** |
| S-02 | Lowercase advantage/disadvantage | ~25 files | **High** |
| S-03 | "heal" instead of "clear" for HP recovery | ~8 files | **High** |
| S-04 | Undefined or incompletely defined Maintenance Difficulty / Aura mechanics | ~6 Aura cards | **High** |
| S-05 | Undefined mechanical terms: Attitude, Reputation, Favor, Ranger Companions, Tag Team Roll | Pervasive | **High** |
| S-06 | Lowercase range terms ("close range" vs "Close range") | ~8 files | **Medium** |
| S-07 | "Countdown Tracker" vs "Completion Tracker" inconsistency | ~6 files | **Medium** |
| S-08 | Capitalisation of "Proficiency" | ~8 files | **Medium** |
| S-09 | Custom condition proliferation (~30 conditions) with variable quality of inline definitions | All domains | **Medium** |
| S-10 | "double damage" as a non-standard damage expression | ~5 files | **Medium** |
| S-11 | "gain/add a token" vs "place a token" inconsistency | ~15 files | **Low** |
| S-12 | Miscellaneous typos and grammatical errors | ~8 files | **Low** |

---

## Recommended Action Plan

### Immediate (Before Next Session)
1. Define `_Slowed_` condition in Prizebreaker (CRIT-01)
2. Fix "minor damage threshold" in Steadfast Hope Feature (CRIT-02)
3. Fix "Spellcraft Roll" → "Spellcast Roll" in Provocateur (CRIT-04)
4. Define Aura maintenance mechanic in a central `Auras.md` document (MAJ-06)

### Short Term (Within 2 Sessions)
5. Replace all "as a reaction" / "free action" / "immediate action" language with trigger phrasing (MAJ-01, MAJ-02)
6. Replace all "heal" with "clear" for HP recovery (MAJ-03)
7. Standardise Advantage/Disadvantage capitalisation (MAJ-04)
8. Fix "Scientist domain cards" → "Study domain cards" in Philosopher (MAJ-18)
9. Fix "Spellcast Reaction Roll" phrasing in Parasitic Synergy (MAJ-19)
10. Fix "(Level 7) Weird-Touched" dead reference in Charlatan (MAJ-11)
11. Fix `Applied Entropy` flat `1d20` damage (CRIT-03)

### Medium Term (Campaign Infrastructure)
12. Write / verify `Attitude.md`, `Reputation.md`, `Favor.md`, `Aura.md`, `Ranger Companions.md`, `Tag Team Roll.md`, `Primary Goals.md` (MAJ-07, MAJ-20)
13. Reconcile all `_Stunned_` definitions with SRD Arcana spell text (MAJ-08)
14. Define `_Altered_` condition in Metamorphosis (MAJ-08)
15. Add a cap to Champion's all-rolls Reputation bonus (MAJ-21)
16. Define "Resistance" mechanic in Sacrifice (MAJ-14)
17. Define "Party's Combined Proficiency" or simplify (MAJ-12)

### Ongoing (Style/Polish Pass)
18. Normalise all range term capitalisation (MIN-01, MIN-02)
19. Normalise "attack roll" to lowercase (MIN-05)
20. Standardise "place a token" phrasing (MIN-22)
21. Fix all typographical errors catalogued in MAJ-17 and MIN sections
22. Standardise "Countdown Tracker" (MIN-07)

---

*End of audit. Total files reviewed: 30 class files + 132 domain card files = 162 files.*
