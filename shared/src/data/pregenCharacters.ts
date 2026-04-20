// shared/src/data/pregenCharacters.ts
//
// Pre-generated Level 10 characters for the character import system.
// All characters are SRD-compliant per the Daggerheart SRD v1.0.
//
// SRD compliance notes:
//   - Level 10 = Tier 4 (levels 8-10)
//   - 18 advancement slots spent (levels 2-10, 2 slots each)
//   - Proficiency base = 4 (tier achievements at levels 2, 5, 8)
//   - Damage thresholds = base {major:3, severe:5} at level 1 + 9 level-ups = {major:12, severe:14}
//   - 5 experiences: 2 at creation (+2 each) + 3 from tier achievements (levels 2, 5, 8, +2 each)
//   - Subclass progressed to Mastery (2 subclass-upgrade advancements)
//   - Domain vault: 10+ cards (1 per level + additional-domain-card advancements)
//   - Domain loadout: 5 cards max
//   - markedTraits cleared at levels 5 and 8; Tier 4 trait-bonus marks are current
//   - Hope starts at 2, hopeMax = 6
//   - Stress base = 6
//   - HP base = class starting HP
//
// Placeholder IDs:
//   characterId, userId, campaignId = "PREGEN-*" (replaced at import time)

import type { Character } from "../types";

const NOW = "2026-04-19T00:00:00.000Z";

export const PREGEN_CHARACTERS: Character[] = [
  // ═══════════════════════════════════════════════════════════════════════════
  // 1. GUARDIAN (Stalwart) — Dwarf, Ridgeborne — Tanky Defender
  // ═══════════════════════════════════════════════════════════════════════════
  //
  // Class: Guardian — evasion 9, HP 7, domains [blade, valor], spellcast strength
  // Armor: Legendary Chainmail (Tier 4) — Heavy: -1 Evasion, armorScore 7, thresholds 15/40
  // Weapon: Warhammer (Strength, 2H, d12+3) + Tower Shield (Strength, +2 Armor, -1 Evasion)
  //
  // Advancement plan (18 slots):
  //   Lv2:  hp-slot + subclass-upgrade(specialization)     [tier achievement: +1 prof, new exp]
  //   Lv3:  hp-slot + trait-bonus(strength,instinct)
  //   Lv4:  stress-slot + evasion
  //   Lv5:  hp-slot + subclass-upgrade(mastery)            [tier achievement: +1 prof, new exp, clear marks]
  //   Lv6:  stress-slot + trait-bonus(strength,presence)
  //   Lv7:  hp-slot + evasion
  //   Lv8:  proficiency-increase                           [tier achievement: +1 prof, new exp, clear marks]
  //   Lv9:  hp-slot + stress-slot
  //   Lv10: trait-bonus(strength,agility) + additional-domain-card
  //
  // Stats at creation: str 2, agi 1, fin 0, ins 0, pre 1, kno -1
  // Trait bonuses applied:
  //   Lv3: +1 str, +1 ins (marked, cleared at lv5)
  //   Lv6: +1 str, +1 pre (marked, cleared at lv8)
  //   Lv10: +1 str, +1 agi (marked, current)
  // Final stats: str 5, agi 2, fin 0, ins 1, pre 2, kno -1
  //
  // Proficiency: 1(base) + 1(lv2) + 1(lv5) + 1(lv8) + 1(proficiency-increase lv8) = 5
  // HP: 7(base) + 5(hp-slot advancements) = 12
  // Stress: 6(base) + 3(stress-slot advancements) = 9
  // Evasion: 9(base) + 2(evasion adv) - 1(heavy armor) - 1(tower shield) = 9
  // Armor score: 7 (legendary chainmail) + 2 (tower shield barrier) = 9 — but armor tracker max = baseArmorScore
  // Damage thresholds with armor: 15+10=25 major, 40+10=50 severe
  //   Actually per the character model, damageThresholds = base + level increments
  //   Using fixture formula: {major: 12, severe: 14} at level 10
  {
    characterId: "PREGEN-GUARDIAN-001",
    userId: "PREGEN-USER",
    campaignId: null,
    name: "Thordak Ironhold",
    classId: "guardian",
    className: "Guardian",
    subclassId: "stalwart",
    subclassName: "Stalwart",
    communityId: "ridgeborne",
    communityName: "Ridgeborne",
    ancestryId: "dwarf",
    ancestryName: "Dwarf",
    isMixedAncestry: false,
    mixedAncestryBottomId: null,
    mixedAncestryDisplayName: null,
    level: 10,
    avatarUrl: null,
    portraitUrl: null,
    updatedAt: NOW,
    multiclassClassId: null,
    multiclassClassName: null,
    multiclassSubclassId: null,
    multiclassDomainId: null,
    multiclassClassFeatureIndex: null,

    domains: ["blade", "valor"],
    stats: {
      agility: 2,
      strength: 5,
      finesse: 0,
      instinct: 1,
      presence: 2,
      knowledge: -1,
    },
    derivedStats: {
      evasion: 9,  // 9 base + 2 evasion adv - 1 heavy armor - 1 tower shield
      armor: 7,
      baseEvasion: 11, // 9 base + 2 evasion advancements (before armor/shield mods)
    },
    trackers: {
      hp: { max: 12, marked: 0 },
      stress: { max: 9, marked: 0 },
      armor: { max: 7, marked: 0 },
    },
    damageThresholds: { major: 12, severe: 14 },
    weapons: {
      primary: { weaponId: "warhammer" },
      secondary: { weaponId: "tower-shield" },
    },
    hope: 2,
    hopeMax: 6,
    proficiency: 5,
    experiences: [
      { name: "Defending the Weak", bonus: 2 },
      { name: "Mountain Warfare", bonus: 2 },
      { name: "Shield Tactics", bonus: 2 },
      { name: "Dwarven Stonecraft", bonus: 2 },
      { name: "Battle Commander", bonus: 2 },
    ],
    conditions: [],
    domainLoadout: [
      "blade-1-war-cry",
      "blade-3-shield-wall",
      "valor-2-stand-firm",
      "valor-4-unbreakable",
      "blade-5-devastating-blow",
    ],
    domainVault: [
      "blade-1-war-cry",
      "blade-2-cleave",
      "blade-3-shield-wall",
      "blade-4-whirlwind",
      "blade-5-devastating-blow",
      "valor-1-rally",
      "valor-2-stand-firm",
      "valor-3-inspire",
      "valor-4-unbreakable",
      "valor-5-last-stand",
      "blade-6-executioner",
    ],
    classFeatureState: {},
    traitBonuses: {
      strength: 3,
      instinct: 1,
      presence: 1,
      agility: 1,
    },
    notes: null,
    avatarKey: null,
    portraitKey: null,
    createdAt: NOW,
    activeArmorId: "legendary-chainmail",
    gold: { handfuls: 1, bags: 0, chests: 0 },
    inventory: [
      "a torch",
      "50 feet of rope",
      "basic supplies",
      "Minor Health Potion",
      "A totem from your mentor",
    ],
    cardTokens: {},
    downtimeProjects: [],
    activeAuras: [],
    companionState: null,
    reputationBonuses: {},
    favors: {},
    customConditions: [],
    levelUpHistory: {
      2: [
        { type: "hp-slot" },
        { type: "subclass-upgrade", detail: "specialization" },
      ],
      3: [
        { type: "hp-slot" },
        { type: "trait-bonus", detail: "strength,instinct" },
      ],
      4: [
        { type: "stress-slot" },
        { type: "evasion" },
      ],
      5: [
        { type: "hp-slot" },
        { type: "subclass-upgrade", detail: "mastery" },
      ],
      6: [
        { type: "stress-slot" },
        { type: "trait-bonus", detail: "strength,presence" },
      ],
      7: [
        { type: "hp-slot" },
        { type: "evasion" },
      ],
      8: [
        { type: "proficiency-increase" },
      ],
      9: [
        { type: "hp-slot" },
        { type: "stress-slot" },
      ],
      10: [
        { type: "trait-bonus", detail: "strength,agility" },
        { type: "additional-domain-card", detail: "blade-6-executioner|6" },
      ],
    },
    markedTraits: ["strength", "agility"],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. ROGUE (Nightwalker) — Elf, Slyborne — Stealthy Striker
  // ═══════════════════════════════════════════════════════════════════════════
  //
  // Class: Rogue — evasion 12, HP 6, domains [grace, midnight], spellcast finesse
  // Armor: Legendary Gambeson (Tier 4) — Flexible: +1 Evasion, armorScore 5
  // Weapon: Dagger (Finesse, 1H, d8+1) + Small Dagger (Finesse, Paired: +2 dmg)
  //
  // Advancement plan (18 slots):
  //   Lv2:  evasion + subclass-upgrade(specialization)     [tier achievement]
  //   Lv3:  trait-bonus(finesse,agility) + stress-slot
  //   Lv4:  hp-slot + evasion
  //   Lv5:  subclass-upgrade(mastery) + additional-domain-card  [tier achievement, clear marks]
  //   Lv6:  trait-bonus(finesse,instinct) + stress-slot
  //   Lv7:  hp-slot + additional-domain-card
  //   Lv8:  proficiency-increase                           [tier achievement, clear marks]
  //   Lv9:  evasion + stress-slot
  //   Lv10: trait-bonus(finesse,agility) + hp-slot
  //
  // Stats at creation: fin 2, agi 1, ins 1, str 0, pre 0, kno -1
  // Final stats: fin 5, agi 3, ins 2, str 0, pre 0, kno -1
  //
  // Proficiency: 1 + 1(lv2) + 1(lv5) + 1(lv8) + 1(prof-increase) = 5
  // HP: 6 + 3 = 9
  // Stress: 6 + 3 = 9
  // Evasion: 12 + 3(evasion adv) + 1(flexible armor) = 16
  {
    characterId: "PREGEN-ROGUE-001",
    userId: "PREGEN-USER",
    campaignId: null,
    name: "Sylvara Nightwhisper",
    classId: "rogue",
    className: "Rogue",
    subclassId: "nightwalker",
    subclassName: "Nightwalker",
    communityId: "slyborne",
    communityName: "Slyborne",
    ancestryId: "elf",
    ancestryName: "Elf",
    isMixedAncestry: false,
    mixedAncestryBottomId: null,
    mixedAncestryDisplayName: null,
    level: 10,
    avatarUrl: null,
    portraitUrl: null,
    updatedAt: NOW,
    multiclassClassId: null,
    multiclassClassName: null,
    multiclassSubclassId: null,
    multiclassDomainId: null,
    multiclassClassFeatureIndex: null,

    domains: ["grace", "midnight"],
    stats: {
      agility: 3,
      strength: 0,
      finesse: 5,
      instinct: 2,
      presence: 0,
      knowledge: -1,
    },
    derivedStats: {
      evasion: 16,  // 12 + 3 evasion adv + 1 flexible armor
      armor: 5,
      baseEvasion: 15, // 12 + 3 evasion advancements
    },
    trackers: {
      hp: { max: 9, marked: 0 },
      stress: { max: 9, marked: 0 },
      armor: { max: 5, marked: 0 },
    },
    damageThresholds: { major: 12, severe: 14 },
    weapons: {
      primary: { weaponId: "dagger" },
      secondary: { weaponId: "small-dagger" },
    },
    hope: 2,
    hopeMax: 6,
    proficiency: 5,
    experiences: [
      { name: "Stealth & Infiltration", bonus: 2 },
      { name: "Lockpicking", bonus: 2 },
      { name: "Urban Navigation", bonus: 2 },
      { name: "Elven Lore", bonus: 2 },
      { name: "Poison Craft", bonus: 2 },
    ],
    conditions: [],
    domainLoadout: [
      "grace-1-nimble-dodge",
      "midnight-2-shadow-step",
      "midnight-4-assassinate",
      "grace-5-perfect-strike",
      "midnight-6-cloak-of-shadows",
    ],
    domainVault: [
      "grace-1-nimble-dodge",
      "grace-2-acrobatics",
      "grace-3-evasive-roll",
      "grace-4-blur",
      "grace-5-perfect-strike",
      "midnight-1-hide",
      "midnight-2-shadow-step",
      "midnight-3-backstab",
      "midnight-4-assassinate",
      "midnight-5-vanish",
      "midnight-6-cloak-of-shadows",
      "grace-6-untouchable",
    ],
    classFeatureState: {},
    traitBonuses: {
      finesse: 3,
      agility: 2,
      instinct: 1,
    },
    notes: null,
    avatarKey: null,
    portraitKey: null,
    createdAt: NOW,
    activeArmorId: "legendary-gambeson",
    gold: { handfuls: 1, bags: 0, chests: 0 },
    inventory: [
      "a torch",
      "50 feet of rope",
      "basic supplies",
      "Minor Stamina Potion",
      "A set of forgery tools",
    ],
    cardTokens: {},
    downtimeProjects: [],
    activeAuras: [],
    companionState: null,
    reputationBonuses: {},
    favors: {},
    customConditions: [],
    levelUpHistory: {
      2: [
        { type: "evasion" },
        { type: "subclass-upgrade", detail: "specialization" },
      ],
      3: [
        { type: "trait-bonus", detail: "finesse,agility" },
        { type: "stress-slot" },
      ],
      4: [
        { type: "hp-slot" },
        { type: "evasion" },
      ],
      5: [
        { type: "subclass-upgrade", detail: "mastery" },
        { type: "additional-domain-card", detail: "midnight-5-vanish|5" },
      ],
      6: [
        { type: "trait-bonus", detail: "finesse,instinct" },
        { type: "stress-slot" },
      ],
      7: [
        { type: "hp-slot" },
        { type: "additional-domain-card", detail: "grace-6-untouchable|6" },
      ],
      8: [
        { type: "proficiency-increase" },
      ],
      9: [
        { type: "evasion" },
        { type: "stress-slot" },
      ],
      10: [
        { type: "trait-bonus", detail: "finesse,agility" },
        { type: "hp-slot" },
      ],
    },
    markedTraits: ["finesse", "agility"],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. WIZARD (School of Knowledge) — Human, Loreborne — Arcane Scholar
  // ═══════════════════════════════════════════════════════════════════════════
  //
  // Class: Wizard — evasion 11, HP 5, domains [codex, splendor], spellcast knowledge
  // Armor: Channeling Armor (Tier 4) — +1 Spellcast, armorScore 6
  // Weapon: Greatstaff (Knowledge, 2H, d6 magic, Powerful) + none
  //
  // Advancement plan (18 slots):
  //   Lv2:  stress-slot + subclass-upgrade(specialization)  [tier achievement]
  //   Lv3:  trait-bonus(knowledge,instinct) + hp-slot
  //   Lv4:  stress-slot + additional-domain-card
  //   Lv5:  subclass-upgrade(mastery) + hp-slot             [tier achievement, clear marks]
  //   Lv6:  trait-bonus(knowledge,presence) + stress-slot
  //   Lv7:  additional-domain-card + hp-slot
  //   Lv8:  proficiency-increase                            [tier achievement, clear marks]
  //   Lv9:  stress-slot + evasion
  //   Lv10: trait-bonus(knowledge,instinct) + hp-slot
  //
  // Stats at creation: kno 2, ins 1, pre 1, agi 0, str -1, fin 0
  // Final stats: kno 5, ins 3, pre 2, agi 0, str -1, fin 0
  //
  // Proficiency: 1 + 1(lv2) + 1(lv5) + 1(lv8) + 1(prof-increase) = 5
  // HP: 5 + 4 = 9
  // Stress: 6 + 4 = 10
  // Evasion: 11 + 1(evasion adv) = 12
  {
    characterId: "PREGEN-WIZARD-001",
    userId: "PREGEN-USER",
    campaignId: null,
    name: "Aldric Quillsworth",
    classId: "wizard",
    className: "Wizard",
    subclassId: "school-of-knowledge",
    subclassName: "School of Knowledge",
    communityId: "loreborne",
    communityName: "Loreborne",
    ancestryId: "human",
    ancestryName: "Human",
    isMixedAncestry: false,
    mixedAncestryBottomId: null,
    mixedAncestryDisplayName: null,
    level: 10,
    avatarUrl: null,
    portraitUrl: null,
    updatedAt: NOW,
    multiclassClassId: null,
    multiclassClassName: null,
    multiclassSubclassId: null,
    multiclassDomainId: null,
    multiclassClassFeatureIndex: null,

    domains: ["codex", "splendor"],
    stats: {
      agility: 0,
      strength: -1,
      finesse: 0,
      instinct: 3,
      presence: 2,
      knowledge: 5,
    },
    derivedStats: {
      evasion: 12,  // 11 + 1 evasion adv
      armor: 6,
      baseEvasion: 12,
    },
    trackers: {
      hp: { max: 9, marked: 0 },
      stress: { max: 10, marked: 0 },
      armor: { max: 6, marked: 0 },
    },
    damageThresholds: { major: 12, severe: 14 },
    weapons: {
      primary: { weaponId: "greatstaff" },
      secondary: { weaponId: null },
    },
    hope: 2,
    hopeMax: 6,
    proficiency: 5,
    experiences: [
      { name: "Arcane Research", bonus: 2 },
      { name: "Ancient Languages", bonus: 2 },
      { name: "Magical Theory", bonus: 2 },
      { name: "Historical Knowledge", bonus: 2 },
      { name: "Planar Studies", bonus: 2 },
    ],
    conditions: [],
    domainLoadout: [
      "codex-2-arcane-ward",
      "codex-4-counterspell",
      "splendor-3-radiant-burst",
      "splendor-5-divine-light",
      "codex-6-grand-grimoire",
    ],
    domainVault: [
      "codex-1-minor-illusion",
      "codex-2-arcane-ward",
      "codex-3-dispel",
      "codex-4-counterspell",
      "codex-5-teleport",
      "codex-6-grand-grimoire",
      "splendor-1-light",
      "splendor-2-bless",
      "splendor-3-radiant-burst",
      "splendor-4-sanctuary",
      "splendor-5-divine-light",
      "codex-7-arcane-mastery",
    ],
    classFeatureState: {},
    traitBonuses: {
      knowledge: 3,
      instinct: 2,
      presence: 1,
    },
    notes: null,
    avatarKey: null,
    portraitKey: null,
    createdAt: NOW,
    activeArmorId: "channeling-armor",
    gold: { handfuls: 1, bags: 0, chests: 0 },
    inventory: [
      "a torch",
      "50 feet of rope",
      "basic supplies",
      "Minor Stamina Potion",
      "A book you're trying to translate",
    ],
    cardTokens: {},
    downtimeProjects: [],
    activeAuras: [],
    companionState: null,
    reputationBonuses: {},
    favors: {},
    customConditions: [],
    levelUpHistory: {
      2: [
        { type: "stress-slot" },
        { type: "subclass-upgrade", detail: "specialization" },
      ],
      3: [
        { type: "trait-bonus", detail: "knowledge,instinct" },
        { type: "hp-slot" },
      ],
      4: [
        { type: "stress-slot" },
        { type: "additional-domain-card", detail: "codex-3-dispel|3" },
      ],
      5: [
        { type: "subclass-upgrade", detail: "mastery" },
        { type: "hp-slot" },
      ],
      6: [
        { type: "trait-bonus", detail: "knowledge,presence" },
        { type: "stress-slot" },
      ],
      7: [
        { type: "additional-domain-card", detail: "codex-7-arcane-mastery|7" },
        { type: "hp-slot" },
      ],
      8: [
        { type: "proficiency-increase" },
      ],
      9: [
        { type: "stress-slot" },
        { type: "evasion" },
      ],
      10: [
        { type: "trait-bonus", detail: "knowledge,instinct" },
        { type: "hp-slot" },
      ],
    },
    markedTraits: ["knowledge", "instinct"],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 4. RANGER (Wayfinder) — Katari, Wildborne — Wilderness Tracker
  // ═══════════════════════════════════════════════════════════════════════════
  //
  // Class: Ranger — evasion 12, HP 6, domains [bone, sage], spellcast agility
  // Armor: Legendary Leather (Tier 4) — no feature, armorScore 6
  // Weapon: Longbow (Agility, 2H, d8+3, Very Far, Cumbersome: -1 Finesse)
  //
  // Advancement plan (18 slots):
  //   Lv2:  evasion + subclass-upgrade(specialization)      [tier achievement]
  //   Lv3:  trait-bonus(agility,instinct) + hp-slot
  //   Lv4:  stress-slot + additional-domain-card
  //   Lv5:  subclass-upgrade(mastery) + evasion             [tier achievement, clear marks]
  //   Lv6:  trait-bonus(agility,finesse) + hp-slot
  //   Lv7:  stress-slot + additional-domain-card
  //   Lv8:  proficiency-increase                            [tier achievement, clear marks]
  //   Lv9:  hp-slot + evasion
  //   Lv10: trait-bonus(agility,instinct) + stress-slot
  //
  // Stats at creation: agi 2, ins 1, fin 1, str 0, pre 0, kno -1
  // Final stats: agi 5, ins 3, fin 2, str 0, pre 0, kno -1
  //
  // Proficiency: 5
  // HP: 6 + 3 = 9
  // Stress: 6 + 3 = 9
  // Evasion: 12 + 3(evasion adv) = 15
  {
    characterId: "PREGEN-RANGER-001",
    userId: "PREGEN-USER",
    campaignId: null,
    name: "Kael Thornpaw",
    classId: "ranger",
    className: "Ranger",
    subclassId: "wayfinder",
    subclassName: "Wayfinder",
    communityId: "wildborne",
    communityName: "Wildborne",
    ancestryId: "katari",
    ancestryName: "Katari",
    isMixedAncestry: false,
    mixedAncestryBottomId: null,
    mixedAncestryDisplayName: null,
    level: 10,
    avatarUrl: null,
    portraitUrl: null,
    updatedAt: NOW,
    multiclassClassId: null,
    multiclassClassName: null,
    multiclassSubclassId: null,
    multiclassDomainId: null,
    multiclassClassFeatureIndex: null,

    domains: ["bone", "sage"],
    stats: {
      agility: 5,
      strength: 0,
      finesse: 2,
      instinct: 3,
      presence: 0,
      knowledge: -1,
    },
    derivedStats: {
      evasion: 15,  // 12 + 3 evasion adv
      armor: 6,
      baseEvasion: 15,
    },
    trackers: {
      hp: { max: 9, marked: 0 },
      stress: { max: 9, marked: 0 },
      armor: { max: 6, marked: 0 },
    },
    damageThresholds: { major: 12, severe: 14 },
    weapons: {
      primary: { weaponId: "longbow" },
      secondary: { weaponId: null },
    },
    hope: 2,
    hopeMax: 6,
    proficiency: 5,
    experiences: [
      { name: "Wilderness Survival", bonus: 2 },
      { name: "Tracking & Hunting", bonus: 2 },
      { name: "Animal Handling", bonus: 2 },
      { name: "Herbalism", bonus: 2 },
      { name: "Pathfinding", bonus: 2 },
    ],
    conditions: [],
    domainLoadout: [
      "bone-1-hunters-mark",
      "bone-3-snare",
      "sage-2-nature-sense",
      "sage-4-commune",
      "bone-5-death-arrow",
    ],
    domainVault: [
      "bone-1-hunters-mark",
      "bone-2-beast-call",
      "bone-3-snare",
      "bone-4-predator",
      "bone-5-death-arrow",
      "sage-1-guidance",
      "sage-2-nature-sense",
      "sage-3-restoration",
      "sage-4-commune",
      "sage-5-primal-fury",
      "bone-6-apex-predator",
      "sage-6-natures-wrath",
    ],
    classFeatureState: {},
    traitBonuses: {
      agility: 3,
      instinct: 2,
      finesse: 1,
    },
    notes: null,
    avatarKey: null,
    portraitKey: null,
    createdAt: NOW,
    activeArmorId: "legendary-leather",
    gold: { handfuls: 1, bags: 0, chests: 0 },
    inventory: [
      "a torch",
      "50 feet of rope",
      "basic supplies",
      "Minor Health Potion",
      "A trophy from your first kill",
    ],
    cardTokens: {},
    downtimeProjects: [],
    activeAuras: [],
    companionState: null,
    reputationBonuses: {},
    favors: {},
    customConditions: [],
    levelUpHistory: {
      2: [
        { type: "evasion" },
        { type: "subclass-upgrade", detail: "specialization" },
      ],
      3: [
        { type: "trait-bonus", detail: "agility,instinct" },
        { type: "hp-slot" },
      ],
      4: [
        { type: "stress-slot" },
        { type: "additional-domain-card", detail: "bone-4-predator|4" },
      ],
      5: [
        { type: "subclass-upgrade", detail: "mastery" },
        { type: "evasion" },
      ],
      6: [
        { type: "trait-bonus", detail: "agility,finesse" },
        { type: "hp-slot" },
      ],
      7: [
        { type: "stress-slot" },
        { type: "additional-domain-card", detail: "sage-6-natures-wrath|6" },
      ],
      8: [
        { type: "proficiency-increase" },
      ],
      9: [
        { type: "hp-slot" },
        { type: "evasion" },
      ],
      10: [
        { type: "trait-bonus", detail: "agility,instinct" },
        { type: "stress-slot" },
      ],
    },
    markedTraits: ["agility", "instinct"],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 5. BARD (Troubadour) — Faun, Wanderborne — Charismatic Performer
  // ═══════════════════════════════════════════════════════════════════════════
  //
  // Class: Bard — evasion 10, HP 5, domains [grace, codex], spellcast presence
  // Armor: Bellamoi Fine (Tier 3) — Gilded: +1 Presence, armorScore 5
  // Weapon: Scepter (Presence, 2H, d6 magic, Versatile) + Whip (Presence, Startling)
  //
  // Advancement plan (18 slots):
  //   Lv2:  stress-slot + subclass-upgrade(specialization)  [tier achievement]
  //   Lv3:  trait-bonus(presence,knowledge) + hp-slot
  //   Lv4:  stress-slot + evasion
  //   Lv5:  subclass-upgrade(mastery) + hp-slot             [tier achievement, clear marks]
  //   Lv6:  trait-bonus(presence,instinct) + stress-slot
  //   Lv7:  experience-bonus + hp-slot
  //   Lv8:  proficiency-increase                            [tier achievement, clear marks]
  //   Lv9:  stress-slot + evasion
  //   Lv10: trait-bonus(presence,agility) + additional-domain-card
  //
  // Stats at creation: pre 2, kno 1, ins 1, agi 0, str -1, fin 0
  // Final stats: pre 5, kno 2, ins 2, agi 1, str -1, fin 0
  //
  // Proficiency: 5
  // HP: 5 + 3 = 8
  // Stress: 6 + 4 = 10
  // Evasion: 10 + 2(evasion adv) = 12
  {
    characterId: "PREGEN-BARD-001",
    userId: "PREGEN-USER",
    campaignId: null,
    name: "Faelan Songweaver",
    classId: "bard",
    className: "Bard",
    subclassId: "troubadour",
    subclassName: "Troubadour",
    communityId: "wanderborne",
    communityName: "Wanderborne",
    ancestryId: "faun",
    ancestryName: "Faun",
    isMixedAncestry: false,
    mixedAncestryBottomId: null,
    mixedAncestryDisplayName: null,
    level: 10,
    avatarUrl: null,
    portraitUrl: null,
    updatedAt: NOW,
    multiclassClassId: null,
    multiclassClassName: null,
    multiclassSubclassId: null,
    multiclassDomainId: null,
    multiclassClassFeatureIndex: null,

    domains: ["grace", "codex"],
    stats: {
      agility: 1,
      strength: -1,
      finesse: 0,
      instinct: 2,
      presence: 5,
      knowledge: 2,
    },
    derivedStats: {
      evasion: 12,  // 10 + 2 evasion adv
      armor: 5,
      baseEvasion: 12,
    },
    trackers: {
      hp: { max: 8, marked: 0 },
      stress: { max: 10, marked: 0 },
      armor: { max: 5, marked: 0 },
    },
    damageThresholds: { major: 12, severe: 14 },
    weapons: {
      primary: { weaponId: "scepter" },
      secondary: { weaponId: "whip" },
    },
    hope: 2,
    hopeMax: 6,
    proficiency: 5,
    experiences: [
      { name: "Musical Performance", bonus: 3 },
      { name: "Persuasion & Deception", bonus: 3 },
      { name: "Bardic Lore", bonus: 2 },
      { name: "Faun Traditions", bonus: 2 },
      { name: "Diplomacy", bonus: 2 },
    ],
    conditions: [],
    domainLoadout: [
      "grace-1-inspiring-song",
      "codex-2-lore-recall",
      "grace-3-charm",
      "codex-4-mass-suggestion",
      "grace-5-grand-performance",
    ],
    domainVault: [
      "grace-1-inspiring-song",
      "grace-2-quick-step",
      "grace-3-charm",
      "grace-4-mesmerize",
      "grace-5-grand-performance",
      "codex-1-identify",
      "codex-2-lore-recall",
      "codex-3-tongues",
      "codex-4-mass-suggestion",
      "codex-5-legend-lore",
      "grace-6-encore",
    ],
    classFeatureState: {},
    traitBonuses: {
      presence: 3,
      knowledge: 1,
      instinct: 1,
      agility: 1,
    },
    notes: null,
    avatarKey: null,
    portraitKey: null,
    createdAt: NOW,
    activeArmorId: "bellamoi-fine",
    gold: { handfuls: 1, bags: 0, chests: 0 },
    inventory: [
      "a torch",
      "50 feet of rope",
      "basic supplies",
      "Minor Stamina Potion",
      "A romance novel",
    ],
    cardTokens: {},
    downtimeProjects: [],
    activeAuras: [],
    companionState: null,
    reputationBonuses: {},
    favors: {},
    customConditions: [],
    levelUpHistory: {
      2: [
        { type: "stress-slot" },
        { type: "subclass-upgrade", detail: "specialization" },
      ],
      3: [
        { type: "trait-bonus", detail: "presence,knowledge" },
        { type: "hp-slot" },
      ],
      4: [
        { type: "stress-slot" },
        { type: "evasion" },
      ],
      5: [
        { type: "subclass-upgrade", detail: "mastery" },
        { type: "hp-slot" },
      ],
      6: [
        { type: "trait-bonus", detail: "presence,instinct" },
        { type: "stress-slot" },
      ],
      7: [
        { type: "experience-bonus", detail: "Musical Performance,Persuasion & Deception" },
        { type: "hp-slot" },
      ],
      8: [
        { type: "proficiency-increase" },
      ],
      9: [
        { type: "stress-slot" },
        { type: "evasion" },
      ],
      10: [
        { type: "trait-bonus", detail: "presence,agility" },
        { type: "additional-domain-card", detail: "grace-6-encore|6" },
      ],
    },
    markedTraits: ["presence", "agility"],
  },
];

export default PREGEN_CHARACTERS;

// ─── Base (Level 1) Stats per Pregen ──────────────────────────────────────────
// These are the character's stats at level 1 before any advancements.
// Used by scalePregenToLevel to rebuild from scratch.

interface PregenBaseStats {
  stats: Character["stats"];
  hp: number;
  stress: number;
  baseEvasion: number;   // class evasion (before armor mods)
  proficiency: number;
  experiences: Character["experiences"];
  /** Domain vault at level 1 = 1 card per domain (level-1 cards). */
  baseDomainVault: string[];
  /** Base domain loadout at level 1. */
  baseDomainLoadout: string[];
  /** Damage thresholds at level 1 (base). */
  damageThresholds: { major: number; severe: number };
  /** Subclass at Foundation (level 1). */
  foundationSubclassId: string;
  foundationSubclassName: string;
  /** Armor evasion modifier (e.g. -1 for heavy, +1 for flexible, 0 for none). */
  armorEvasionMod: number;
}

const PREGEN_BASE_STATS: Record<string, PregenBaseStats> = {
  "PREGEN-GUARDIAN-001": {
    stats: { agility: 1, strength: 2, finesse: 0, instinct: 0, presence: 1, knowledge: -1 },
    hp: 7, stress: 6, baseEvasion: 9, proficiency: 1,
    experiences: [
      { name: "Defending the Weak", bonus: 2 },
      { name: "Mountain Warfare", bonus: 2 },
    ],
    baseDomainVault: ["blade-1-war-cry", "valor-1-rally"],
    baseDomainLoadout: ["blade-1-war-cry", "valor-1-rally"],
    damageThresholds: { major: 3, severe: 5 },
    foundationSubclassId: "stalwart",
    foundationSubclassName: "Stalwart",
    armorEvasionMod: -2, // -1 heavy armor, -1 tower shield
  },
  "PREGEN-ROGUE-001": {
    stats: { agility: 1, strength: 0, finesse: 2, instinct: 1, presence: 0, knowledge: -1 },
    hp: 6, stress: 6, baseEvasion: 12, proficiency: 1,
    experiences: [
      { name: "Stealth & Infiltration", bonus: 2 },
      { name: "Lockpicking", bonus: 2 },
    ],
    baseDomainVault: ["grace-1-nimble-dodge", "midnight-1-hide"],
    baseDomainLoadout: ["grace-1-nimble-dodge", "midnight-1-hide"],
    damageThresholds: { major: 3, severe: 5 },
    foundationSubclassId: "nightwalker",
    foundationSubclassName: "Nightwalker",
    armorEvasionMod: 1, // +1 flexible armor
  },
  "PREGEN-WIZARD-001": {
    stats: { agility: 0, strength: -1, finesse: 0, instinct: 1, presence: 1, knowledge: 2 },
    hp: 5, stress: 6, baseEvasion: 11, proficiency: 1,
    experiences: [
      { name: "Arcane Research", bonus: 2 },
      { name: "Ancient Languages", bonus: 2 },
    ],
    baseDomainVault: ["codex-1-minor-illusion", "splendor-1-light"],
    baseDomainLoadout: ["codex-1-minor-illusion", "splendor-1-light"],
    damageThresholds: { major: 3, severe: 5 },
    foundationSubclassId: "school-of-knowledge",
    foundationSubclassName: "School of Knowledge",
    armorEvasionMod: 0,
  },
  "PREGEN-RANGER-001": {
    stats: { agility: 2, strength: 0, finesse: 1, instinct: 1, presence: 0, knowledge: -1 },
    hp: 6, stress: 6, baseEvasion: 12, proficiency: 1,
    experiences: [
      { name: "Wilderness Survival", bonus: 2 },
      { name: "Tracking & Hunting", bonus: 2 },
    ],
    baseDomainVault: ["bone-1-hunters-mark", "sage-1-guidance"],
    baseDomainLoadout: ["bone-1-hunters-mark", "sage-1-guidance"],
    damageThresholds: { major: 3, severe: 5 },
    foundationSubclassId: "wayfinder",
    foundationSubclassName: "Wayfinder",
    armorEvasionMod: 0,
  },
  "PREGEN-BARD-001": {
    stats: { agility: 0, strength: -1, finesse: 0, instinct: 1, presence: 2, knowledge: 1 },
    hp: 5, stress: 6, baseEvasion: 10, proficiency: 1,
    experiences: [
      { name: "Musical Performance", bonus: 2 },
      { name: "Persuasion & Deception", bonus: 2 },
    ],
    baseDomainVault: ["grace-1-nimble-dodge", "codex-1-minor-illusion"],
    baseDomainLoadout: ["grace-1-nimble-dodge", "codex-1-minor-illusion"],
    damageThresholds: { major: 3, severe: 5 },
    foundationSubclassId: "troubadour",
    foundationSubclassName: "Troubadour",
    armorEvasionMod: 0,
  },
};

// ─── Tier / Achievement Helpers ───────────────────────────────────────────────

function tierForLevel(level: number): number {
  if (level <= 1) return 1;
  if (level <= 4) return 2;
  if (level <= 7) return 3;
  return 4;
}

function isTierAchievement(toLevel: number): boolean {
  return toLevel === 2 || toLevel === 5 || toLevel === 8;
}

// ─── Tier-appropriate armor/weapon helpers ───────────────────────────────────

/** Return a tier-appropriate armor ID for this pregen, or null for level 1. */
function armorForTier(pregenId: string, tier: number): string | null {
  const armorTiers: Record<string, string[]> = {
    "PREGEN-GUARDIAN-001": ["chainmail",       "fine-chainmail",       "superior-chainmail",    "legendary-chainmail"],
    "PREGEN-ROGUE-001":    ["gambeson",        "fine-gambeson",        "superior-gambeson",     "legendary-gambeson"],
    "PREGEN-WIZARD-001":   ["channeling-armor","channeling-armor",     "channeling-armor",      "channeling-armor"],
    "PREGEN-RANGER-001":   ["leather",         "fine-leather",         "superior-leather",      "legendary-leather"],
    "PREGEN-BARD-001":     ["bellamoi",        "bellamoi",             "bellamoi-fine",          "bellamoi-fine"],
  };
  const tiers = armorTiers[pregenId];
  if (!tiers) return null;
  return tiers[tier - 1] ?? tiers[0]!;
}

/** Return armor score for tier. */
function armorScoreForTier(pregenId: string, tier: number): number {
  const scores: Record<string, number[]> = {
    "PREGEN-GUARDIAN-001": [3, 4, 5, 7],
    "PREGEN-ROGUE-001":    [2, 3, 4, 5],
    "PREGEN-WIZARD-001":   [3, 4, 5, 6],
    "PREGEN-RANGER-001":   [3, 4, 5, 6],
    "PREGEN-BARD-001":     [3, 4, 5, 5],
  };
  const s = scores[pregenId];
  if (!s) return 0;
  return s[tier - 1] ?? s[0]!;
}

// ─── Domain card progression ─────────────────────────────────────────────────

/** Return domain vault cards earned per level (1 new card per level, from alternating domains). */
function domainVaultForLevel(pregen: Character, targetLevel: number, base: PregenBaseStats): string[] {
  // Start with base vault (level 1 cards)
  const vault = [...base.baseDomainVault];

  // Level 1 gets the base cards. Levels 2+ get one card per level from the full level 10 vault.
  // We derive the progression from the level-10 vault order, excluding base and additional-domain-card cards.
  const fullVault = pregen.domainVault;

  // Cards added via additional-domain-card advancements (extract from levelUpHistory)
  const advCards = new Set<string>();
  const history = pregen.levelUpHistory ?? {};
  for (const [, advs] of Object.entries(history)) {
    for (const adv of advs) {
      if (adv.type === "additional-domain-card" && adv.detail) {
        const pipeIdx = adv.detail.indexOf("|");
        const cardId = pipeIdx !== -1 ? adv.detail.slice(0, pipeIdx).trim() : adv.detail.trim();
        advCards.add(cardId);
      }
    }
  }

  // Natural progression cards = fullVault - base - advCards, in vault order
  const naturalCards = fullVault.filter(
    (c) => !base.baseDomainVault.includes(c) && !advCards.has(c)
  );

  // Add one natural card per level from 2 to targetLevel
  for (let lv = 2; lv <= targetLevel && lv - 2 < naturalCards.length; lv++) {
    const card = naturalCards[lv - 2];
    if (card && !vault.includes(card)) {
      vault.push(card);
    }
  }

  // Add additional-domain-card advancement cards that were earned at or below targetLevel
  for (let lv = 2; lv <= targetLevel; lv++) {
    const advs = history[lv];
    if (!advs) continue;
    for (const adv of advs) {
      if (adv.type === "additional-domain-card" && adv.detail) {
        const pipeIdx = adv.detail.indexOf("|");
        const cardId = pipeIdx !== -1 ? adv.detail.slice(0, pipeIdx).trim() : adv.detail.trim();
        if (!vault.includes(cardId)) {
          vault.push(cardId);
        }
      }
    }
  }

  return vault;
}

// ─── Experience progression ──────────────────────────────────────────────────

/** Tier achievement experience names per pregen (earned at levels 2, 5, 8). */
const TIER_ACHIEVEMENT_EXPERIENCES: Record<string, string[]> = {
  "PREGEN-GUARDIAN-001": ["Shield Tactics", "Dwarven Stonecraft", "Battle Commander"],
  "PREGEN-ROGUE-001":    ["Urban Navigation", "Elven Lore", "Poison Craft"],
  "PREGEN-WIZARD-001":   ["Magical Theory", "Historical Knowledge", "Planar Studies"],
  "PREGEN-RANGER-001":   ["Animal Handling", "Herbalism", "Pathfinding"],
  "PREGEN-BARD-001":     ["Storytelling", "Cultural Knowledge", "Bardic Inspiration"],
};

// ─── Scale Pregen to Level ───────────────────────────────────────────────────

/**
 * Scale a pre-generated character from level 10 down to a target level (1–10).
 * Rebuilds the character from base (level 1) stats, then forward-applies
 * levelUpHistory entries from level 2 through targetLevel.
 *
 * Returns a new Character object at the specified level.
 */
export function scalePregenToLevel(pregen: Character, targetLevel: number): Character {
  if (targetLevel < 1 || targetLevel > 10) {
    throw new Error(`targetLevel must be 1–10, got ${targetLevel}`);
  }
  if (targetLevel === 10) {
    // No scaling needed — return as-is (with a fresh copy)
    return { ...pregen };
  }

  const base = PREGEN_BASE_STATS[pregen.characterId];
  if (!base) {
    throw new Error(`No base stats found for pregen ${pregen.characterId}`);
  }

  const history = pregen.levelUpHistory ?? {};
  const targetTier = tierForLevel(targetLevel);

  // ── Start with level 1 base stats ───────────────────────────────────────
  let stats = { ...base.stats };
  let hp = base.hp;
  let stress = base.stress;
  let baseEvasion = base.baseEvasion;
  let proficiency = base.proficiency;
  let dmgMajor = base.damageThresholds.major;
  let dmgSevere = base.damageThresholds.severe;
  let markedTraits: string[] = [];
  const traitBonuses: Record<string, number> = {};
  let subclassId = base.foundationSubclassId;
  let subclassName = base.foundationSubclassName;

  // Experiences: start with base 2, add tier achievement experiences
  const experiences = [...base.experiences];

  // Tier achievement experience names for this pregen
  const tierExpNames = TIER_ACHIEVEMENT_EXPERIENCES[pregen.characterId] ?? [];

  // ── Forward-apply levels 2 through targetLevel ──────────────────────────
  const scaledHistory: Record<number, typeof history[number]> = {};

  for (let lv = 2; lv <= targetLevel; lv++) {
    // Tier achievement (automatic at levels 2, 5, 8)
    if (isTierAchievement(lv)) {
      proficiency = Math.min(6, proficiency + 1);

      // Add tier achievement experience
      const tierIdx = lv === 2 ? 0 : lv === 5 ? 1 : 2;
      const expName = tierExpNames[tierIdx];
      if (expName) {
        experiences.push({ name: expName, bonus: 2 });
      }

      // Clear marked traits at levels 5 and 8
      if (lv === 5 || lv === 8) {
        markedTraits = [];
      }
    }

    // Damage thresholds +1 each per level
    dmgMajor += 1;
    dmgSevere += 1;

    // Apply advancements from history
    const advs = history[lv];
    if (advs) {
      scaledHistory[lv] = advs;
      for (const adv of advs) {
        switch (adv.type) {
          case "hp-slot":
            hp = Math.min(12, hp + 1);
            break;
          case "stress-slot":
            stress = Math.min(12, stress + 1);
            break;
          case "evasion":
            baseEvasion += 1;
            break;
          case "proficiency-increase":
            proficiency = Math.min(6, proficiency + 1);
            break;
          case "trait-bonus": {
            const statNames = (adv.detail ?? "").split(",").map((s) => s.trim());
            for (const statName of statNames) {
              if (statName in stats) {
                (stats as Record<string, number>)[statName] = ((stats as Record<string, number>)[statName] ?? 0) + 1;
                traitBonuses[statName] = (traitBonuses[statName] ?? 0) + 1;
                if (!markedTraits.includes(statName)) {
                  markedTraits.push(statName);
                }
              }
            }
            break;
          }
          case "subclass-upgrade": {
            if (adv.detail === "specialization" || adv.detail === "mastery") {
              // subclass identity doesn't change (same subclassId), but
              // the stage progresses. We keep the same subclassId/Name.
              subclassId = pregen.subclassId!;
              subclassName = pregen.subclassName!;
            }
            break;
          }
          case "experience-bonus": {
            const expNames = (adv.detail ?? "").split(",").map((s) => s.trim());
            for (const expName of expNames) {
              const idx = experiences.findIndex((e) => e.name === expName);
              if (idx !== -1) {
                experiences[idx] = { ...experiences[idx]!, bonus: experiences[idx]!.bonus + 1 };
              }
            }
            break;
          }
          // additional-domain-card: handled by domainVaultForLevel
          // multiclass: not used by any current pregen
        }
      }
    }
  }

  // ── Build domain vault and loadout ──────────────────────────────────────
  const domainVault = domainVaultForLevel(pregen, targetLevel, base);
  // Loadout: take up to 5 cards from the vault, preferring the pregen's loadout order
  const maxLoadout = targetLevel >= 5 ? 5 : targetLevel >= 3 ? 4 : targetLevel >= 2 ? 3 : 2;
  const domainLoadout = pregen.domainLoadout
    .filter((c) => domainVault.includes(c))
    .slice(0, maxLoadout);
  // If we don't have enough from the pregen loadout, fill from vault
  if (domainLoadout.length < maxLoadout) {
    for (const card of domainVault) {
      if (domainLoadout.length >= maxLoadout) break;
      if (!domainLoadout.includes(card)) {
        domainLoadout.push(card);
      }
    }
  }

  // ── Armor for tier ──────────────────────────────────────────────────────
  const activeArmorId = armorForTier(pregen.characterId, targetTier);
  const armorScore = armorScoreForTier(pregen.characterId, targetTier);

  // ── Evasion with armor mod ──────────────────────────────────────────────
  const evasion = baseEvasion + base.armorEvasionMod;

  // ── Assemble scaled character ───────────────────────────────────────────
  return {
    ...pregen,
    level: targetLevel,
    stats,
    derivedStats: {
      evasion,
      armor: armorScore,
      baseEvasion,
    },
    trackers: {
      hp: { max: hp, marked: 0 },
      stress: { max: stress, marked: 0 },
      armor: { max: armorScore, marked: 0 },
    },
    damageThresholds: { major: dmgMajor, severe: dmgSevere },
    proficiency,
    experiences,
    domainVault,
    domainLoadout,
    levelUpHistory: scaledHistory,
    markedTraits,
    traitBonuses,
    subclassId,
    subclassName,
    activeArmorId,
    hope: 2,
    hopeMax: 6,
  };
}
