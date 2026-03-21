# Daggerheart CCB — Authoritative SRD Rules Specification

**Produced by:** SRD Compliance Agent  
**Sources:**  
- `Daggerheart-SRD-digested.md` (SRD v1.0, © 2025 Critical Role LLC) — cited as **SRD p.N**  
- `Daggerheart-Homebrew-Kit-digested.md` (v1.0, © 2025 Critical Role LLC) — cited as **HBK p.N**  
- Campaign-specific markdown in `markdown/Rules & Definitions/` and `markdown/Domains/` — cited as **CC: filename**

> **Engineering note:** All citations map to `<!-- page N -->` markers in the digested source files. These page numbers match the original PDF page numbering.

---

## SECTION 1 — Domain Card Vault, Loadout, and Swap Rules

### 1.1 Loadout Slot Limits by Level

**SRD p.5 — LOADOUT & VAULT (exact text):**

> "Your loadout is the set of acquired domain cards whose effects your PC can use during play. **You can have up to 5 domain cards in your loadout at one time.** Once you've acquired six or more domain cards, you must choose five to keep in your loadout; the rest are considered to be in your vault."

**⚠️ There is NO per-level scaling of the loadout limit in the SRD.** The loadout cap is a flat **5 cards** for all levels, 1–10. The table below reflects the *number of cards a character has acquired* by level (based on the card-acquisition rules from SRD p.4–5 and p.22), and which of those are loadout-eligible:

| Level | Cards Acquired (cumulative) | Loadout Max | Vault (minimum) | Notes |
|-------|-----------------------------|-------------|-----------------|-------|
| 1     | 2                           | 2 (all)     | 0               | Start with 2 Level-1 cards (SRD p.4) |
| 2     | 3                           | 3 (all)     | 0               | +1 card from Step 4 of level-up (SRD p.22) |
| 3     | 4                           | 4 (all)     | 0               | +1 card from Step 4 |
| 4     | 5                           | 5 (all)     | 0               | +1 card from Step 4 |
| 5     | 6                           | 5           | **1**           | Vault kicks in; player chooses which 5 are active |
| 6     | 7                           | 5           | 2               | |
| 7     | 8                           | 5           | 3               | |
| 8     | 9                           | 5           | 4               | |
| 9     | 10                          | 5           | 5               | |
| 10    | 11                          | 5           | 6               | |

> **Important:** These counts are baseline — they do not include additional domain cards gained through advancements. At each level-up a player also chooses **two advancements** (SRD p.22), one of which can be "take an additional domain card" (repeatable within tier). Each additional domain card taken via advancement adds to the vault or loadout.

**SRD p.4 — Starting Cards (exact text):**

> "PCs acquire two 1st-level domain cards at character creation and **an additional domain card at or below their level each time they level up**."

**SRD p.22 — Step 4 of Level-Up (exact text):**

> "Acquire a new domain card at your level or lower from one of your class's domains and add it to your loadout or vault. If your loadout is already full, you can't add the new card to it until you move another into your vault. You can also **exchange one domain card you've previously acquired for a different domain card of the same level or lower**."

---

### 1.2 The Vault

**SRD p.5 — LOADOUT & VAULT (exact text):**

> "Once you've acquired six or more domain cards, you must choose five to keep in your loadout; the rest are considered to be in your **vault**. **Vault cards are inactive and do not influence play**."

There is no separate "vault sheet" mechanic defined in the SRD. The vault is simply the set of acquired-but-not-loadout-slotted cards. The character owns all cards in both loadout and vault; they are all part of their collection. **Subclass, ancestry, and community cards are NOT counted toward the loadout or vault** and are always active:

> "Note: Your subclass, ancestry, and community cards don't count toward your loadout or vault and are always active and available." (SRD p.5)

---

### 1.3 Standard Swap Cost (During Play)

**SRD p.5 — RECALL COST (exact text):**

> "The number and lightning bolt in the top right of the card shows its **Recall Cost**. This is the amount of **Stress a player must mark** to swap this card from their vault with a card from their loadout."

> "Note: A player can swap domain cards **during downtime without paying the domain card's Recall Cost**."

**SRD p.5 — Mid-Play Swap (exact text):**

> "To move a card from your vault to your loadout at **any other time** [i.e., outside of rest], you must mark a **number of Stress equal to the vaulted card's Recall Cost** (located in the top right of the card next to the lightning bolt symbol). If your loadout is already full, you must also move a card from your loadout to your vault to make space, **though you can do this at no cost**."

**SRD p.22 — Level-Up Free Placement (exact text):**

> "When you gain a new domain card at level-up, you can immediately move it into your loadout for free."

**Summary of swap rules:**

| Timing | Cost to bring vault card into loadout |
|--------|---------------------------------------|
| At start of rest (before downtime moves) | **Free** — no Recall Cost paid |
| Any time outside a rest | **Mark Stress = Recall Cost** of the incoming card |
| At level-up (new card only) | **Free** |

**Recall Cost range in SRD cards:** 0–3 for most cards (HBK p.10: "Most cards have a Recall Cost between 0 and 2, but some domain cards in the core rulebook have a cost of 3 or 4 instead.").

**Homebrew Kit guidance on Recall Costs (HBK p.10):**

> "Basic Costs: Most cards have a Recall Cost between 0 and 2... Cards intended to be easily usable have a cost of 0. More specific or powerful cards have a cost of 2, making them more taxing to pull from the vault. **A cost of 3 or higher is saved for the most powerful, higher-level cards** in the domain, depending on their use and the domain's design intent."

> "Character Vault Tax: If a domain feature calls for the card to be placed in the player's vault, that card should probably have a **higher Recall Cost**, as a low Recall Cost would reduce the penalty of having to place the card in the vault."

**⚠️ Gap:** Neither the SRD nor the Homebrew Kit specifies a maximum possible Recall Cost as a hard cap. The SRD shows costs as high as 3–4 on specific cards in the Domain Card Reference appendix (SRD p.119+). The Homebrew Kit says "3 or higher is saved for most powerful" but does not prohibit higher values.

---

### 1.4 Linked Curse Swap Rules

**Campaign-Specific Definition (CC: `Linked Curse ↔.md`):**

> "Linked Curses are spells or effects which are part of a larger ecosystem of curses woven together at some point. These domain cards grant different abilities based on the presence of a Linked Curse listed in their description."

The ↔ symbol (Linked Curse) is a **campaign-specific homebrew mechanic**. It appears on starred (★) domain cards in the `Domains/Weird/` directory. Examples from the markdown files:

- `(Level 4) Gifted ★ ↔` — its Curse interacts with `(Level 4) Physicist ★ ↔` being in loadout
- `(Level 3) Psychic ★ ↔` — its Curse interacts with `(Level 3) Sharpshooter ★ ↔` being in loadout
- `(Level 4) Charlatan ★ ↔` — its Curse interacts with `(Level 3) Mugger ★ ↔` being in loadout
- `(Level 4) Curse-stricken ★ ↔` — explicitly restricts downtime swaps of Cursed cards

Note especially `(Level 4) Curse-stricken ★ ↔`:

> "**Curse**: You are laden with cursed items, and find them harder to shed than most. **You cannot freely change domain cards with a Curse feature during downtime.**"

This is already a homebrew example of a domain card that restricts the standard SRD swap behavior.

**Does the SRD or Homebrew Kit contradict the proposed "long rest only, 6 stress cost" Linked Curse rule?**

1. **SRD:** Does not reference Linked Curses at all. The SRD's standard swap rule is: free at any rest (short or long), Recall Cost in Stress outside of rest. Restricting a card to only long-rest swaps is **more restrictive than the SRD default** — this is legal to layer on top as a campaign rule.

2. **Homebrew Kit:** Does not address Linked Curses. It does affirm that domain cards can restrict their own swapping (the "vault tax" guidance) and that homebrew mechanics can diverge from defaults. The HBK explicitly notes that "Recall Costs" are the cost for versatility and that high costs (3+) are for the most powerful cards.

3. **Specific concern — "6 Stress cost":** The SRD defines Recall Cost as the swap cost. A 6 Stress Recall Cost is above any shown in the core SRD (max observed: 3–4 in appendix). The Homebrew Kit explicitly says costs of 3+ are "saved for the most powerful cards" but does not set an absolute cap. A 6 Stress cost is unusual but not rules-illegal as a custom mechanic.

4. **"Long rest only" restriction:** The SRD states swaps are free at "the start of a rest" (both short and long). Restricting Linked Curse cards to long-rest-only swaps adds a constraint not present in the SRD. This is permissible as a campaign rule; the card text on `Curse-stricken ★ ↔` already demonstrates this pattern.

**Conclusion for implementation:** The Linked Curse "long rest only + 6 Stress" rule is a **valid campaign-level homebrew modification**. It does not contradict any SRD text — it simply applies a stricter set of conditions than the default. It should be implemented as:
- Linked Curse (↔) cards: swap permitted only at the start of a **long rest** (not short rest)
- Swap cost: **6 Stress** (must be available at time of swap; Stress overflow → HP per SRD p.21)
- These restrictions override the standard "free at rest" rule for these specific cards only

---

### 1.5 Level Trimming — Which Cards Are Accessible by Level

**SRD p.5 — DOMAIN CARD ANATOMY — Level (exact text):**

> "The number in the top left of the card indicates the card's level. **You cannot acquire a domain card with a level higher than your PC's.**"

**SRD p.22 — Step 4 of Level-Up (exact text):**

> "Acquire a new domain card **at your level or lower** from one of your class's domains..."

**SRD p.22 — Advancement: Additional Domain Card (exact text):**

> "You can choose an additional domain card **at or below your level** or from your class's domains."

**SRD p.22 — Exchange rule:**

> "You can also exchange one domain card you've previously acquired for a **different domain card of the same level or lower**."

**Implications for UI/backend:**

1. **Acquisition filter:** When a player selects a new domain card (at level-up or via advancement), the system must only show cards with `card.level <= character.level`.
2. **Loadout filter:** There is **no per-level restriction on which owned cards appear in the loadout** — the only restriction is acquisition. Once a card is owned (regardless of level it was acquired at), it can be in the loadout or vault freely.
3. **Vault content:** Cards in the vault are simply all acquired cards not in the loadout. Vault browsing should show all owned cards regardless of level, since they were validly acquired.
4. **Exchange:** On level-up, a player may exchange any previously acquired card for one of equal or lower level to the card being replaced (not to the character's current level).

---

## SECTION 2 — Leveling System — Per-Level Choices

### 2.1 XP / Level Threshold

**SRD p.22 — LEVELING UP (exact text):**

> "Your party levels up whenever the **GM decides you've reached a narrative milestone** (usually about every 3 sessions). All party members level up at the same time."

**⚠️ There is no XP table in the SRD.** Leveling is purely GM-narrative-driven. There are no XP points, no experience thresholds, and no numerical progression table. The "usually about every 3 sessions" is guidance only, not a rule. The character sheet system should **not** track XP numerically — or if it does for homebrew purposes, it must be clearly labeled as a campaign-custom feature, not an SRD mechanic.

---

### 2.2 Tier Structure

**SRD p.22 (exact text):**

> "Daggerheart has 10 PC levels divided into **4 tiers**:  
> → Tier 1 encompasses level 1 only.  
> → Tier 2 encompasses levels 2–4.  
> → Tier 3 encompasses levels 5–7.  
> → Tier 4 encompasses levels 8–10."

> "Your tier affects your damage thresholds, tier achievements, and access to advancements."

---

### 2.3 The Four Level-Up Steps

Every level-up (levels 2–10) follows this sequence (SRD p.22):

**Step 1 — Tier Achievements** (only when entering a new tier)  
**Step 2 — Advancements** (choose two per level-up)  
**Step 3 — Damage Thresholds** (automatic)  
**Step 4 — Domain Card** (automatic choice)

---

### 2.4 Per-Level Breakdown

#### LEVEL 1 — Character Creation (not a "level-up" event)

*Source: SRD p.3–4, Steps 1–9 of Character Creation*

| Choice | Constraint | Permanent? |
|--------|------------|-----------|
| Choose a Class | One of 9 classes (SRD p.3) | Yes — permanent |
| Choose a Subclass | One of 2 per class; take Foundation card | Yes — permanent (but can add Specialization/Mastery later) |
| Choose Ancestry | One of 18 (or mix); take ancestry features | Yes — permanent |
| Choose Community | One of 9; take community feature | Yes — permanent |
| Assign Traits | Distribute +2, +1, +1, +0, +0, −1 to 6 traits | Permanent base, but can be increased via advancements |
| Record Evasion | Copy class's starting Evasion to sheet | Derived; can be modified later |
| Record Starting HP | From class | Starting value; expandable |
| Record 6 Stress slots | Fixed at 6 for all classes | Expandable |
| Record 2 Hope | All PCs start with 2 Hope (but max is 6) | Starting state |
| Record Proficiency = 1 | Fixed at Level 1 | Expandable |
| Choose Starting Weapons | Tier 1 weapons (1H primary + 1H secondary, or 1 2H primary) | Changeable |
| Choose Starting Armor | Tier 1 armor; add Level (=1) to Base Thresholds | Changeable |
| Create 2 Experiences | Each at +2; no restricted list (must be specific, not mechanical) | Can be increased; 2 per PC at start |
| Choose 2 Domain Cards | From class's 2 domains; Level 1 cards only; 1 from each domain OR 2 from one | Permanent (cards owned; can be exchanged on level-up) |
| Choose Background, Connections | Narrative only; no mechanical constraint | Narrative |

---

#### LEVEL 2 — Tier 1 → Tier 2 Transition

*Source: SRD p.22*

**Step 1 — Tier Achievement (entering Tier 2):**
> "At level 2, you gain a new Experience at +2 and **permanently increase your Proficiency by 1**."

Proficiency becomes **2** at level 2.

**Step 2 — Advancements:** Choose **2 advancements** from the Tier 2 pool (any option with an unmarked slot, at your tier or below):

| Advancement Option | Constraint | Double-Slot? |
|--------------------|------------|--------------|
| Increase two character traits (+1 each) | Must be unmarked; can't increase again until next tier achievement clears marks | No |
| Add 1+ Hit Point slot(s) | Up to character sheet maximum (12 total) | No |
| Add 1+ Stress slot(s) | Up to 12 total | No |
| Increase an Experience (+1 to two Experiences) | Must be on character sheet | No |
| Take an additional domain card | At or below current level; from class's domains | No |
| Increase Evasion (+1) | Permanent | No |
| Take an upgraded subclass card (Foundation→Specialization) | Must not have Specialization yet; **crosses out multiclass option in this tier** | No |
| Increase Proficiency | Fills one circle on Proficiency track; +1 damage die | **Yes — costs both advancement slots** |
| Multiclass | Level 5+ only; not available at Level 2 | **Yes — costs both advancement slots** |

**Step 3 — Damage Thresholds:** +1 to all thresholds (automatic).

**Step 4 — Domain Card:** Acquire 1 new domain card at Level ≤2 from class's domains; add to loadout or vault. May also exchange any owned card for one of equal or lower level.

---

#### LEVEL 3

**Step 1 — Tier Achievement:** None (mid-tier; Tier 2 spans levels 2–4).

**Step 2 — Advancements:** 2 advancements from Tier 2 pool (same menu as Level 2; same constraints).

**Step 3 — Damage Thresholds:** +1 to all thresholds.

**Step 4 — Domain Card:** Acquire 1 new domain card at Level ≤3. May exchange.

---

#### LEVEL 4

**Step 1 — Tier Achievement:** None (still Tier 2).

**Step 2 — Advancements:** 2 advancements from Tier 2 pool.

**Step 3 — Damage Thresholds:** +1 to all thresholds.

**Step 4 — Domain Card:** Acquire 1 new domain card at Level ≤4. May exchange.

---

#### LEVEL 5 — Tier 2 → Tier 3 Transition

**Step 1 — Tier Achievement (entering Tier 3):**
> "At level 5, you gain a new Experience at +2, **permanently increase your Proficiency by 1**, and **clear any marked traits**."

Proficiency becomes **3** at level 5. Marked traits from Tier 2 advancement choices are cleared (i.e., the +1 trait advances become eligible to take again in Tier 3).

**Multiclassing becomes available** starting at Level 5 (SRD p.22).

**Step 2 — Advancements:** 2 advancements from Tier 3 pool. Multiclassing is now a legal option (costs both slots). Subclass Specialization can be upgraded to Mastery (if not already taken).

**Step 3 — Damage Thresholds:** +1 to all thresholds.

**Step 4 — Domain Card:** Acquire 1 new domain card at Level ≤5. May exchange.

---

#### LEVEL 6

**Step 1 — Tier Achievement:** None (Tier 3 spans levels 5–7).

**Step 2 — Advancements:** 2 advancements from Tier 3 pool.

**Step 3 — Damage Thresholds:** +1 to all thresholds.

**Step 4 — Domain Card:** Acquire 1 new domain card at Level ≤6. May exchange.

---

#### LEVEL 7

**Step 1 — Tier Achievement:** None (still Tier 3).

**Step 2 — Advancements:** 2 advancements from Tier 3 pool.

**Step 3 — Damage Thresholds:** +1 to all thresholds.

**Step 4 — Domain Card:** Acquire 1 new domain card at Level ≤7. May exchange. (Level 7 "X-Touched" loadout-bonus cards become accessible here.)

---

#### LEVEL 8 — Tier 3 → Tier 4 Transition

**Step 1 — Tier Achievement (entering Tier 4):**
> "At level 8, you gain a new Experience at +2, **permanently increase your Proficiency by 1**, and **clear any marked traits**."

Proficiency becomes **4** at level 8. Marked traits from Tier 3 clear.

**Step 2 — Advancements:** 2 advancements from Tier 4 pool. Multiclassing still requires both slots.

**Step 3 — Damage Thresholds:** +1 to all thresholds.

**Step 4 — Domain Card:** Acquire 1 new domain card at Level ≤8. May exchange.

---

#### LEVEL 9

**Step 1 — Tier Achievement:** None (Tier 4 spans levels 8–10).

**Step 2 — Advancements:** 2 advancements from Tier 4 pool.

**Step 3 — Damage Thresholds:** +1 to all thresholds.

**Step 4 — Domain Card:** Acquire 1 new domain card at Level ≤9. May exchange.

---

#### LEVEL 10

**Step 1 — Tier Achievement:** None (max level; no new tier to enter).

**Step 2 — Advancements:** 2 advancements from Tier 4 pool.

**Step 3 — Damage Thresholds:** +1 to all thresholds.

**Step 4 — Domain Card:** Acquire 1 new domain card at Level ≤10. May exchange.

---

### 2.5 Proficiency Progression Summary

Proficiency is tracked on the character sheet as a number between 1 and 6. The SRD specifies automatic increases at tier boundaries and optional increases via advancement.

| Level | Tier | Auto Proficiency Increase? | Baseline Proficiency (no advancements) |
|-------|------|---------------------------|----------------------------------------|
| 1     | 1    | —                          | **1**                                  |
| 2     | 2    | +1 (Tier Achievement)      | **2**                                  |
| 3–4   | 2    | —                          | 2                                      |
| 5     | 3    | +1 (Tier Achievement)      | **3**                                  |
| 6–7   | 3    | —                          | 3                                      |
| 8     | 4    | +1 (Tier Achievement)      | **4**                                  |
| 9–10  | 4    | —                          | 4                                      |

Additional Proficiency increases (up to a max of **6**) can be taken via the double-slot advancement option: "Fill in one of the open circles in the 'Proficiency' section... costs both advancement slots." (SRD p.22)

**SRD p.3 (exact text):**
> "At Level 1, your Proficiency is 1; write this number in the Proficiency field on your character sheet."

**HBK p.4 (exact text):**
> "Proficiency is a number between 1 and 6, so you can design elements of a feature (such as the number of rollable dice) that increase as a character levels up."

---

### 2.6 Advancement Menu Summary

Available at **every level-up (2–10)**. Choose **2** per level. Options marked with ★ cost **both slots** (i.e., they count as the sole advancement taken that level).

| Advancement | Effect | Multi-slot? | Tier restriction | Notes |
|-------------|--------|------------|-----------------|-------|
| +1 to two traits | Permanent; marks traits (can't repeat until tier clears them) | No | Any | Max once per trait per tier |
| +1 HP slot | Permanent; max 12 total | No | Any | |
| +1 Stress slot | Permanent; max 12 total | No | Any | |
| +1 to two Experiences | Permanent | No | Any | |
| Take additional domain card | 1 card at/below current level from class domains | No | Any | If multiclassed, can pick from multiclass domain at ≤half level |
| +1 Evasion | Permanent | No | Any | |
| Upgrade subclass card | Foundation→Specialization OR Specialization→Mastery; **removes multiclass option from this tier** | No | Any | Must have prior card in chain |
| +1 Proficiency ★ | Fills one Proficiency circle; +1 damage die | **Yes — both slots** | Any | Max 6 total |
| Multiclass ★ | Choose new class; access one domain; gain class feature; take Foundation of one subclass; **removes all other multiclass options AND subclass upgrade in this tier** | **Yes — both slots** | **Level 5+** | |

---

### 2.7 Cumulative vs. Non-Cumulative Choices

**Cumulative (everything stacks forward):**
- All advancements are permanent and additive
- Domain cards are owned permanently once acquired
- HP/Stress/Evasion/Proficiency/Experience increases persist

**Non-cumulative / Conditional:**
- Trait increases are gated per tier: you can only take each trait advancement once per tier (trait is marked), then clears at tier achievement at levels 5 and 8
- Subclass card upgrades are sequential (Foundation → Specialization → Mastery); you cannot skip a step

**Permanent/Irrevocable choices:**
- Class (SRD is silent on class changes; no mechanism is provided)
- Subclass (once chosen; upgrades are one-way)
- Ancestry and Community (SRD p.3; no change mechanism)
- Multiclass choice (once taken, crosses out future multiclass options and subclass upgrade option within the tier)

**Changeable choices:**
- Domain card loadout (can be exchanged at level-up; can be swapped with Recall Cost during play)
- Equipment (can be swapped during rests or at cost)
- Experiences (modifier can be increased but not the text, by implication of the rules)

---

## SECTION 3 — Calculated Fields — Formulas

### 3.1 Evasion

**Formula:**

```
Evasion = Class_Starting_Evasion
          + Advancement_Bonuses        (each "+1 Evasion" advancement taken)
          + Equipment_Bonuses          (e.g., Gambeson's "Flexible: +1 to Evasion")
          + Equipment_Penalties        (e.g., Chainmail's "Heavy: −1 to Evasion")
          + Domain_Card_Bonuses        (domain cards that grant Evasion bonuses while in loadout)
          + Ancestry_Bonuses           (e.g., Simiah "Nimble: +1 to Evasion at level 1")
          + Condition_Modifiers        (temporary; e.g., Cloaked, Vulnerable affect rolls but not Evasion directly)
          + Other_Temporary_Effects    (e.g., Beastform: "+Evasion bonus while transformed")
```

**SRD p.3 (exact text):**
> "Your character's starting Evasion is determined by their class and appears directly beneath the Evasion field on your character sheet; copy this number into the Evasion field."

**SRD p.21 (exact text):**
> "Evasion represents a character's ability to avoid attacks and other unwanted effects. Any roll made against a PC has a Difficulty equal to the target's Evasion. A **PC's base Evasion is determined by their class**, but can be **modified by domain cards, equipment, conditions, and other effects**."

**Class starting Evasion values (from SRD class sheets):**
- Bard: 10 | Druid: 10 | Guardian: 10 | Ranger: 10 | Rogue: 10 | Seraph: 10 | Sorcerer: 10 | Warrior: 10 | Wizard: 9

**Directly user-editable?** No — Evasion is always derived. The character sheet has a field to record the current Evasion, but any permanent change comes from an advancement, feature, or equipment change. Temporary modifiers during combat are tracked separately.

**Note on advancement:** "When you choose to increase your Evasion: Gain a permanent +1 bonus to your Evasion." (SRD p.22)

---

### 3.2 Armor Score

**Formula:**

```
Armor_Score = Armor_Base_Score
              + Permanent_Feature_Bonuses   (e.g., "Valor-Touched: +1 to Armor Score")
              + Temporary_Effect_Bonuses    (while effect is active only)
```

**SRD p.3 (exact text):**
> "Your Armor Score is equal to your **equipped armor's Base Score** plus any permanent bonuses your character has to their Armor Score from other abilities, features, or effects."

**SRD p.29 (exact text):**
> "An armor's base armor score indicates how many Armor Slots it provides its wearer before additional bonuses are added to calculate their total Armor Score. **A PC's Armor Score can't exceed 12.**"

**Unarmored state (SRD p.29):**
> "While unarmored, your character's base Armor Score is **0**, their Major threshold is equal to their level, and their Severe threshold is equal to **twice their level**."

**Armor Score ≠ number of active Armor Slots in current fight.** Armor Score defines how many slots are *available*. Slots are marked/unmarked during play.

**Tier 1 Armor Base Scores** (from SRD Armor Tables, p.29):
- Gambeson: Base Score not printed explicitly in digest (PDF layout issue — thresholds are "5/11" but Base Score column appears blank in digest, likely a column-parse artifact). However, the rule is clear: Base Score is a property of each named armor item.
- Leather: Base Score dash ("--") in digest = 0 (unspecified / no feature listed)
- Chainmail, Full Plate: similarly parsed

> **Engineering flag:** The armor table digest has a PDF-extraction artifact where the Base Score column values are missing for some armor entries. The source PDFs must be consulted for exact Base Score values for each named armor. The *formula* is clear; only the table data needs manual verification from the physical PDF.

**Homebrew Kit guidance (HBK p.23):**
> Armor Tier Base Score ranges: T1: 3–4 | T2: 4–5 | T3: 5–6 | T4: 6–8

**Directly user-editable?** No — Armor Score is derived from equipped armor plus bonuses. The character sheet records it, but it is recalculated whenever armor is equipped/unequipped.

---

### 3.3 Minor Damage Threshold

In Daggerheart the threshold system works differently from most systems. There is **no "Minor threshold" value** — "Minor" is a catch-all for any damage that does not reach the Major threshold. The SRD uses "below Major" as the implicit Minor bracket.

**SRD p.21 (exact text):**
> "- If the final damage is at or above the character's **Severe** damage threshold, they mark 3 HP.  
> - If the final damage is at or above the character's **Major** damage threshold but below their **Severe** damage threshold, they mark 2 HP.  
> - If the final damage is **below the character's Major** damage threshold, they mark 1 HP.  
> - If incoming damage is ever reduced to **0 or less**, no HP is marked."

**⚠️ Engineering implication:** There are only two thresholds with stored numeric values: Major and Severe. "Minor" is implicit: `damage < Major threshold → mark 1 HP`. The character sheet should store and display **Major** and **Severe** threshold values only (which happen to equal what players call "Minor," "Major," and "Severe" damage brackets by comparison).

The implicit "Minor" lower bound is effectively **1** (anything that deals at least 1 damage marks 1 HP if below Major).

---

### 3.4 Major Damage Threshold

**Formula:**

```
Major_Threshold = Armor_Base_Major_Threshold + Character_Level + Permanent_Bonuses
```

**SRD p.3 (exact text):**
> "Add your character's level to your equipped armor's Base Thresholds and record the total for both numbers in the corresponding fields."

**SRD p.29 (exact text):**
> "An armor's base thresholds determine its wearer's Major and Severe damage thresholds before adding bonuses to calculate their **final damage thresholds**. When recording your character's damage thresholds in the 'Damage & Health' section of your character sheet, **you always add your character's level to those values**."

**SRD p.22 — Level-Up Step 3 (exact text):**
> "Increase all damage thresholds by 1."

> **Note:** "Increase by 1 each level-up" = adding character level to the base threshold, which is exactly what SRD p.3/p.29 say. These are the same rule stated twice.

**Unarmored Major Threshold:**
> "their Major threshold is equal to their level" (SRD p.29) — this means `Armor_Base_Major = 0` when unarmored.

**Permanent bonus sources:**
- Advancement bonuses (⚠️ the SRD advancement menu does not list a direct damage threshold advancement, but class/ancestry/domain features can grant flat threshold bonuses — e.g., Druid Warden of Earth Beastform: "Gain a bonus to your damage thresholds equal to your Proficiency")
- Domain card effects while in loadout

**Directly user-editable?** No — it is always derived. The character sheet records the calculated value.

---

### 3.5 Severe Damage Threshold

**Formula:**

```
Severe_Threshold = Armor_Base_Severe_Threshold + Character_Level + Permanent_Bonuses
```

Same formula structure as Major (same SRD citations: p.3, p.29, p.22).

**Unarmored Severe Threshold:**
> "their Severe threshold is equal to **twice their level**" (SRD p.29) — `Armor_Base_Severe = 0` when unarmored, baseline value = level × 2.

**Example Tier 1 armor (SRD p.29):**
- Gambeson: Base 5/11 → at Level 1: Major = 6, Severe = 12
- Leather: Base 6/13 → at Level 1: Major = 7, Severe = 14
- Chainmail: Base 7/15 → at Level 1: Major = 8, Severe = 16
- Full Plate: Base 8/17 → at Level 1: Major = 9, Severe = 18

**Optional Massive Damage rule (SRD p.21):**
> "If a character ever takes damage equal to twice their Severe threshold, they mark 4 HP instead of 3."

This is labeled "Optional Rule" — the character sheet should track this only if the campaign uses this variant.

**Directly user-editable?** No — derived.

---

### 3.6 Proficiency

**Formula:**

```
Proficiency = Base_Proficiency_by_Tier_Achievement
              + Advancement_Increases    (each double-slot "Increase Proficiency" taken)
```

Where `Base_Proficiency_by_Tier_Achievement`:

| Tier Entry | Proficiency Auto-Increase |
|-----------|--------------------------|
| Level 1   | Starts at 1              |
| Level 2 (Tier 2) | +1 (becomes 2)  |
| Level 5 (Tier 3) | +1 (becomes 3)  |
| Level 8 (Tier 4) | +1 (becomes 4)  |

Maximum Proficiency: **6** (HBK p.4: "a character's Proficiency is a number between 1 and 6").

**What Proficiency does:**

**SRD p.3 (exact text):**
> "Proficiency only determines how many damage dice you roll, and does not affect any flat damage modifiers."

**SRD p.21 (exact text):**
> "For weapons, the **number of damage dice you roll is equal to your Proficiency**. Note that your Proficiency multiplies the number of dice you roll, but doesn't affect the modifier. For example, a PC with Proficiency 2 and wielding a weapon with a damage rating of 'd8+2' deals damage equal to '2d8+2' on a successful attack."

**Unarmed attacks (SRD p.21):**
> "Successful unarmed attacks inflict [Proficiency]d4 damage."

**Spellcast damage (SRD p.21):**
> "Any time an effect says to deal damage using your Spellcast trait, you roll a **number of dice equal to your Spellcast trait**." (Note: Spellcast uses the trait modifier value, not Proficiency, for the dice count.)

**HBK p.4 (exact text):**
> "Proficiency determines how many damage dice a player rolls on a successful weapon attack. Unlike popular d20 fantasy systems you may be familiar with, players **don't typically add their character's proficiency to action or reaction rolls**."

**Directly user-editable?** No — calculated. The character sheet has a Proficiency track that is filled in as the value increases.

---

### 3.7 Attack Modifier (Weapon Attack Rolls)

**Formula:**

```
Attack_Roll = d12 (Hope Die) + d12 (Fear Die)
              + Trait_Modifier           (the trait specified by the weapon, e.g., Agility, Strength, Finesse)
              + Experience_Modifier      (optional: spend Hope to add a relevant Experience)
              + Advantage/Disadvantage   (circumstantial: add/drop a d6)
```

**SRD p.21 (exact text):**
> "The trait that applies to an attack roll is specified by the weapon or spell being used. Unarmed attack rolls use either Strength or Finesse (GM's choice). An attack roll's Difficulty, unless otherwise noted, is equal to the **Difficulty score of its target**."

**SRD p.36 (general action roll rules):**
> "When you 'roll with a trait,' that trait's modifier is added to the roll's total." (From SRD p.3)

**Key distinction:** Players do **not** add Proficiency to attack rolls. Proficiency only affects the number of damage dice rolled on a hit. There is no attack bonus from Proficiency (unlike D&D 5e).

> "players don't typically add their character's proficiency to action or reaction rolls" (HBK p.4)

**Success/failure for attack rolls (SRD p.36):**
- Critical Success (matching Duality Dice): success with Hope + critical damage bonus
- Success with Hope: attack succeeds; player gains Hope
- Success with Fear: attack succeeds; GM gains Fear
- Failure with Hope: attack fails; player gains Hope
- Failure with Fear: attack fails; GM gains Fear

**Directly user-editable?** No — the formula is derived from equipped weapon's trait + character's trait modifier.

---

### 3.8 Spell / Ability Modifier (Spellcast Rolls)

**Formula:**

```
Spellcast_Roll = d12 (Hope Die) + d12 (Fear Die)
                 + Spellcast_Trait_Modifier   (the trait defined by the character's subclass)
                 + Experience_Modifier        (optional: spend Hope to add applicable Experience)
                 + Advantage/Disadvantage     (circumstantial)
```

**SRD p.5 (Subclass definition, exact text):**
> "Spellcast Trait: the trait used on **all Spellcast rolls**. Your Spellcast trait, if you have one, is determined by your subclass."

**SRD p.21 (exact text):**
> "Spellcast Rolls are trait rolls that require you to use your **Spellcast trait**... Spellcast Rolls are only made when a character uses a feature that requires one."

**SRD p.21 (exact text):**
> "A Spellcast Roll that can damage a target is also considered **an attack roll**."

**Spellcast damage formula (SRD p.21):**
> "Any time an effect says to deal damage using your Spellcast trait, you roll a **number of dice equal to your Spellcast trait**."
> "Note: If your Spellcast trait is +0 or lower, you don't roll anything."

So for spells with explicit damage dice (e.g., "1d8+2"), the format is straightforward. For spells that say "deal damage equal to your Spellcast trait," the damage dice count = the numeric value of the Spellcast trait modifier (e.g., if Spellcast is Presence and Presence is +2, you roll 2 dice of the specified size).

**Difference from weapon attacks:**

| Property | Weapon Attack | Spellcast Roll |
|----------|---------------|----------------|
| Roll type | Action roll using weapon's trait | Action roll using subclass's Spellcast trait |
| Damage dice count | = Proficiency | = Spellcast trait value (for "Spellcast trait damage" spells) OR fixed from card text |
| Proficiency applies? | Yes (# dice) | Only if card text explicitly references it |
| Success check | vs. target's Evasion/Difficulty | vs. target's Evasion/Difficulty |
| Generates Hope/Fear? | Yes | Yes |

**Multiclass Spellcast trait (SRD p.22):**
> "If your foundation cards specify different Spellcast traits, you can **choose which one to apply** when making a Spellcast roll."

**Directly user-editable?** No — Spellcast trait is defined by subclass choice; it is permanently the subclass's listed trait.

---

## APPENDIX A — Summary of Gaps and Ambiguities

| # | Topic | SRD Status | HBK Status | Engineering Recommendation |
|---|-------|-----------|-----------|---------------------------|
| 1 | XP/Level thresholds | **Silent** — GM narrative only | **Silent** | Do not implement XP tracking as SRD feature; treat as campaign-custom if needed |
| 2 | Loadout per-level scaling | **Silent** — flat 5 cards all levels | Consistent | Hard-code loadout cap = 5 |
| 3 | Armor Base Score per named armor in table | Probable PDF extraction artifact — numeric values missing from digest | Not in HBK | Manually verify from PDF source; do not trust digest for armor Base Score column |
| 4 | Max Recall Cost | Observed max in SRD: 3–4; no stated hard cap | "3 or higher for powerful cards" — no cap stated | Validate as integer ≥0; no enforced maximum; Linked Curse cost of 6 is legal |
| 5 | Linked Curse long-rest-only rule | **Silent** (no Linked Curse concept) | **Silent** | Campaign custom; implement as explicit card-level flag `swap_restriction: "long_rest_only"` |
| 6 | "Minor damage threshold" as a stored value | **Not a stored value** — implicit bracket | Not in HBK | Do not store; derive: `damage < Major_Threshold → mark 1 HP` |
| 7 | Advancement slots available per tier | SRD states "2 per level-up"; tier slots are shown on character sheet but counts per-tier not enumerated | Not in HBK | 2 advancements per level-up × levels in tier = T1: 0 adv slots (level 1 is creation), T2: 2×3=6 slots, T3: 2×3=6 slots, T4: 2×3=6 slots |
| 8 | Hope max (6 mentioned at creation) | SRD p.3: "All PCs start with 2 Hope"; max 6 stated at character creation context | "Rule of Six and Twelve" (HBK p.12) | Hope max = 6; Stress and HP max = 12 |
| 9 | Advancement repeatable limits within tier | "Options with multiple slots can be chosen more than once" (SRD p.22); some options have limited slots | Not in HBK | Track available slots per advancement option per tier; repeat until slots exhausted |
| 10 | Bard class starting Evasion | SRD lists "Starting Evasion: 10" for all classes except Wizard (9) | Not in HBK | Wizard = 9; all other SRD classes = 10 |

---

## APPENDIX B — Key Formulas Reference Card

```
Evasion          = Class_Base + Advancements + Equipment_Mods + Feature_Mods
Armor_Score      = Equipped_Armor_Base_Score + Feature_Bonuses (max 12)
Major_Threshold  = Armor_Base_Major + Level + Permanent_Bonuses
Severe_Threshold = Armor_Base_Severe + Level + Permanent_Bonuses
Proficiency      = Tier_Achievement_Base + Advancement_Increases (1–6)
Weapon_Damage    = [Proficiency]d[Weapon_Die] + Weapon_Flat_Modifier
Unarmed_Damage   = [Proficiency]d4
Spell_Damage     = Xd[Die] + Modifier  (where X is fixed by card text or = Spellcast_Trait_Value)
Attack_Roll      = 2d12 + Weapon_Trait_Modifier (no Proficiency added to roll)
Spellcast_Roll   = 2d12 + Spellcast_Trait_Modifier
HP_Slots         = Class_Starting_HP + HP_Advancements (max 12)
Stress_Slots     = 6 + Stress_Advancements (max 12)
```

> **Unarmored special case:**
> ```
> Major_Threshold  (unarmored) = Level
> Severe_Threshold (unarmored) = Level × 2
> Armor_Score      (unarmored) = 0  (no Armor Slots available)
> ```
