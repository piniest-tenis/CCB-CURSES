/**
 * src/lib/srdSimilarityMap.ts
 *
 * Daggerheart SRD — Curated Canonical Similarity Map (119-chunk corpus)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * PURPOSE
 * ───────
 * Supplements the Jaccard tag-similarity in `srdSearch.ts` with hand-curated,
 * domain-knowledge-driven relationships between canonical SRD chunks. These
 * are connections that pure tag overlap cannot infer — class ↔ domain card
 * affinities, thematic ancestry ↔ community pairings, core mechanics
 * cross-references, and multi-part chunk continuations.
 *
 * CORPUS
 * ──────
 * This map covers ALL 119 canonical chunks from the Daggerheart SRD 1.0:
 *   Introduction (1), Character Creation (2), Classes (12), Ancestries (20),
 *   Communities (10), Domains (1), Core Mechanics (26),
 *   Running an Adventure (33), Appendix (14).
 *
 * USAGE
 * ─────
 * `getSimilarChunks()` in `srdSearch.ts` checks the canonical map first,
 * then falls back to Jaccard similarity for any remaining slots.
 *
 * @example
 * import { getCanonicalSimilar, CANONICAL_SIMILARITY_MAP } from "./srdSimilarityMap";
 * const related = getCanonicalSimilar("classes-guardian", 4);
 * // → ["appendix-blade-domain-cards", "appendix-valor-domain-cards",
 * //     "classes-warrior", "classes-seraph"]
 */

// ─── Canonical Similarity Map ─────────────────────────────────────────────────

/**
 * A curated mapping of chunk IDs → arrays of semantically related chunk IDs.
 *
 * Relationships are grouped by category. Each entry encodes high-value
 * connections that tag-based Jaccard similarity would miss or underrank.
 *
 * **Design principles:**
 * - Only IDs from the validated 119-chunk canonical corpus are used.
 * - Bidirectional relationships are encoded in both directions.
 * - Entries are ordered by relevance (strongest relationship first).
 * - Each entry has 3-5 related chunks.
 * - Every chunk ID in the corpus appears as a key.
 */
export const CANONICAL_SIMILARITY_MAP: Record<string, string[]> = {

  // ═══════════════════════════════════════════════════════════════════════════
  // INTRODUCTION & CHARACTER CREATION
  // ═══════════════════════════════════════════════════════════════════════════

  // Introduction → character creation, flow of the game, overview
  "introduction": [
    "character-creation-part-1",
    "core-mechanics-flow-of-the-game",
    "core-mechanics-core-gameplay-loop",
    "running-an-adventure-overview",
  ],

  // Character creation (2 parts) → ancestries, communities, classes, domains
  "character-creation-part-1": [
    "character-creation-part-2",
    "ancestries-overview",
    "communities-overview",
    "classes-overview",
    "domains-overview",
  ],
  "character-creation-part-2": [
    "character-creation-part-1",
    "core-mechanics-equipment-part-1",
    "core-mechanics-leveling-up",
    "domains-overview",
  ],

  // ═══════════════════════════════════════════════════════════════════════════
  // CLASSES ↔ DOMAIN CARDS
  // ═══════════════════════════════════════════════════════════════════════════
  //
  // Per SRD page 4: Each class grants access to two domains.
  //
  //   Bard: Grace & Codex        | Druid: Sage & Arcana
  //   Guardian: Valor & Blade    | Ranger: Bone & Sage
  //   Rogue: Midnight & Grace    | Seraph: Splendor & Valor
  //   Sorcerer: Arcana & Midnight| Warrior: Blade & Bone
  //   Wizard: Codex & Splendor

  // Classes overview → character creation, individual classes, domains
  "classes-overview": [
    "character-creation-part-1",
    "domains-overview",
    "classes-bard",
    "classes-guardian",
    "classes-wizard",
  ],

  // Bard → Grace & Codex domain cards + thematic class siblings
  "classes-bard": [
    "appendix-grace-domain-cards",
    "appendix-codex-domain-cards-part-1",
    "appendix-codex-domain-cards-part-2",
    "classes-rogue",
    "classes-wizard",
  ],

  // Druid (3 parts) → Sage & Arcana domain cards + thematic class siblings
  "classes-druid-part-1": [
    "classes-druid-part-2",
    "classes-druid-part-3",
    "appendix-sage-domain-cards-part-1",
    "appendix-arcana-domain-cards-part-1",
  ],
  "classes-druid-part-2": [
    "classes-druid-part-1",
    "classes-druid-part-3",
    "appendix-sage-domain-cards-part-2",
    "appendix-arcana-domain-cards-part-2",
  ],
  "classes-druid-part-3": [
    "classes-druid-part-1",
    "classes-druid-part-2",
    "appendix-sage-domain-cards-part-1",
    "appendix-arcana-domain-cards-part-1",
  ],

  // Guardian → Valor & Blade domain cards + tank class siblings
  "classes-guardian": [
    "appendix-valor-domain-cards",
    "appendix-blade-domain-cards",
    "classes-warrior",
    "classes-seraph",
  ],

  // Ranger → Bone & Sage domain cards + nature/martial class siblings
  "classes-ranger": [
    "appendix-bone-domain-cards",
    "appendix-sage-domain-cards-part-1",
    "appendix-sage-domain-cards-part-2",
    "classes-druid-part-1",
    "classes-warrior",
  ],

  // Rogue → Midnight & Grace domain cards + agile class siblings
  "classes-rogue": [
    "appendix-midnight-domain-cards-part-1",
    "appendix-midnight-domain-cards-part-2",
    "appendix-grace-domain-cards",
    "classes-bard",
    "classes-sorcerer",
  ],

  // Seraph → Splendor & Valor domain cards + divine/tank class siblings
  "classes-seraph": [
    "appendix-splendor-domain-cards",
    "appendix-valor-domain-cards",
    "classes-guardian",
    "classes-wizard",
  ],

  // Sorcerer → Arcana & Midnight domain cards + arcane class siblings
  "classes-sorcerer": [
    "appendix-arcana-domain-cards-part-1",
    "appendix-arcana-domain-cards-part-2",
    "appendix-midnight-domain-cards-part-1",
    "classes-wizard",
    "classes-rogue",
  ],

  // Warrior → Blade & Bone domain cards + martial class siblings
  "classes-warrior": [
    "appendix-blade-domain-cards",
    "appendix-bone-domain-cards",
    "classes-guardian",
    "classes-ranger",
  ],

  // Wizard → Codex & Splendor domain cards + scholarly class siblings
  "classes-wizard": [
    "appendix-codex-domain-cards-part-1",
    "appendix-codex-domain-cards-part-2",
    "appendix-splendor-domain-cards",
    "classes-bard",
    "classes-sorcerer",
  ],

  // ═══════════════════════════════════════════════════════════════════════════
  // DOMAIN CARD APPENDIX ↔ CLASSES (reverse links)
  // ═══════════════════════════════════════════════════════════════════════════

  // Arcana domain → Druid & Sorcerer
  "appendix-arcana-domain-cards-part-1": [
    "appendix-arcana-domain-cards-part-2",
    "classes-druid-part-1",
    "classes-sorcerer",
    "domains-overview",
  ],
  "appendix-arcana-domain-cards-part-2": [
    "appendix-arcana-domain-cards-part-1",
    "classes-druid-part-2",
    "classes-sorcerer",
    "domains-overview",
  ],

  // Blade domain → Guardian & Warrior
  "appendix-blade-domain-cards": [
    "classes-guardian",
    "classes-warrior",
    "appendix-valor-domain-cards",
    "appendix-bone-domain-cards",
    "domains-overview",
  ],

  // Bone domain → Ranger & Warrior
  "appendix-bone-domain-cards": [
    "classes-ranger",
    "classes-warrior",
    "appendix-blade-domain-cards",
    "appendix-sage-domain-cards-part-1",
    "domains-overview",
  ],

  // Codex domain → Bard & Wizard
  "appendix-codex-domain-cards-part-1": [
    "appendix-codex-domain-cards-part-2",
    "classes-bard",
    "classes-wizard",
    "domains-overview",
  ],
  "appendix-codex-domain-cards-part-2": [
    "appendix-codex-domain-cards-part-1",
    "classes-bard",
    "classes-wizard",
    "domains-overview",
  ],

  // Grace domain → Bard & Rogue
  "appendix-grace-domain-cards": [
    "classes-bard",
    "classes-rogue",
    "appendix-codex-domain-cards-part-1",
    "appendix-midnight-domain-cards-part-1",
    "domains-overview",
  ],

  // Midnight domain → Rogue & Sorcerer
  "appendix-midnight-domain-cards-part-1": [
    "appendix-midnight-domain-cards-part-2",
    "classes-rogue",
    "classes-sorcerer",
    "domains-overview",
  ],
  "appendix-midnight-domain-cards-part-2": [
    "appendix-midnight-domain-cards-part-1",
    "classes-rogue",
    "classes-sorcerer",
    "domains-overview",
  ],

  // Sage domain → Druid & Ranger
  "appendix-sage-domain-cards-part-1": [
    "appendix-sage-domain-cards-part-2",
    "classes-druid-part-1",
    "classes-ranger",
    "domains-overview",
  ],
  "appendix-sage-domain-cards-part-2": [
    "appendix-sage-domain-cards-part-1",
    "classes-druid-part-2",
    "classes-ranger",
    "domains-overview",
  ],

  // Splendor domain → Seraph & Wizard
  "appendix-splendor-domain-cards": [
    "classes-seraph",
    "classes-wizard",
    "appendix-valor-domain-cards",
    "appendix-codex-domain-cards-part-1",
    "domains-overview",
  ],

  // Valor domain → Guardian & Seraph
  "appendix-valor-domain-cards": [
    "classes-guardian",
    "classes-seraph",
    "appendix-blade-domain-cards",
    "appendix-splendor-domain-cards",
    "domains-overview",
  ],

  // Appendix overview → domain card appendix entries
  "appendix-overview": [
    "appendix-arcana-domain-cards-part-1",
    "appendix-blade-domain-cards",
    "appendix-codex-domain-cards-part-1",
    "appendix-grace-domain-cards",
    "appendix-midnight-domain-cards-part-1",
  ],

  // ═══════════════════════════════════════════════════════════════════════════
  // DOMAINS OVERVIEW ↔ DOMAIN CARD APPENDIX
  // ═══════════════════════════════════════════════════════════════════════════

  "domains-overview": [
    "appendix-arcana-domain-cards-part-1",
    "appendix-blade-domain-cards",
    "appendix-codex-domain-cards-part-1",
    "classes-overview",
    "character-creation-part-1",
  ],

  // ═══════════════════════════════════════════════════════════════════════════
  // ANCESTRIES ↔ CLASSES & COMMUNITIES (thematic affinities)
  // ═══════════════════════════════════════════════════════════════════════════

  // Ancestries overview → character creation + select individual ancestries
  "ancestries-overview": [
    "character-creation-part-1",
    "communities-overview",
    "ancestries-mixed-ancestry",
    "ancestries-human",
    "ancestries-elf",
  ],

  // Clank: mechanical, efficient → Wizard (knowledge/craft) & Warrior (utility)
  "ancestries-clank": [
    "classes-wizard",
    "classes-warrior",
    "ancestries-overview",
    "communities-loreborne",
  ],

  // Drakona: elemental breath, scales → Sorcerer (elemental) & Guardian (tankiness)
  "ancestries-drakona": [
    "classes-sorcerer",
    "classes-guardian",
    "ancestries-overview",
    "communities-ridgeborne",
  ],

  // Dwarf: thick skin, fortitude → Guardian (tank) & Warrior (melee fighter)
  "ancestries-dwarf": [
    "classes-guardian",
    "classes-warrior",
    "ancestries-overview",
    "communities-ridgeborne",
    "communities-underborne",
  ],

  // Elf: quick reactions, celestial trance → Ranger (agile) & Wizard (scholarly)
  "ancestries-elf": [
    "classes-ranger",
    "classes-wizard",
    "ancestries-overview",
    "communities-loreborne",
    "communities-wildborne",
  ],

  // Faerie: wings, luckbender → Rogue (trickster) & Bard (charisma)
  "ancestries-faerie": [
    "classes-rogue",
    "classes-bard",
    "ancestries-overview",
    "communities-wildborne",
  ],

  // Faun: leap, kick → Ranger (nature/physical) & Druid (nature)
  "ancestries-faun": [
    "classes-ranger",
    "classes-druid-part-1",
    "ancestries-overview",
    "communities-wildborne",
  ],

  // Firbolg: charge, unshakable → Guardian (tank) & Warrior (strength)
  "ancestries-firbolg": [
    "classes-guardian",
    "classes-warrior",
    "ancestries-overview",
    "communities-ridgeborne",
  ],

  // Fungril: death connection, mycelial network → Druid (nature) & Sorcerer (dark magic)
  "ancestries-fungril": [
    "classes-druid-part-1",
    "classes-sorcerer",
    "ancestries-overview",
    "communities-wildborne",
    "communities-underborne",
  ],

  // Galapa: shell, retract → Guardian (defense) & Ranger (nature)
  "ancestries-galapa": [
    "classes-guardian",
    "classes-ranger",
    "ancestries-overview",
    "communities-seaborne",
  ],

  // Giant: endurance, reach → Warrior (melee combat) & Guardian (HP tank)
  "ancestries-giant": [
    "classes-warrior",
    "classes-guardian",
    "ancestries-overview",
    "communities-ridgeborne",
  ],

  // Goblin: surefooted, danger sense → Rogue (agile) & Ranger (perception)
  "ancestries-goblin": [
    "classes-rogue",
    "classes-ranger",
    "ancestries-overview",
    "communities-slyborne",
    "communities-underborne",
  ],

  // Halfling: luckbringer, internal compass → Bard (support) & Rogue (luck)
  "ancestries-halfling": [
    "classes-bard",
    "classes-rogue",
    "ancestries-overview",
    "communities-wanderborne",
  ],

  // Human: high stamina, adaptability → Warrior (versatile) & any class
  "ancestries-human": [
    "classes-warrior",
    "classes-bard",
    "ancestries-overview",
    "communities-orderborne",
    "communities-highborne",
  ],

  // Infernis: fearless, dread visage → Sorcerer (dark magic) & Seraph (divine struggle)
  "ancestries-infernis": [
    "classes-sorcerer",
    "classes-seraph",
    "ancestries-overview",
    "communities-slyborne",
  ],

  // Katari: feline instincts, claws → Rogue (agile) & Ranger (hunter)
  "ancestries-katari": [
    "classes-rogue",
    "classes-ranger",
    "ancestries-overview",
    "communities-wildborne",
  ],

  // Mixed Ancestry → overview + character creation
  "ancestries-mixed-ancestry": [
    "ancestries-overview",
    "character-creation-part-1",
    "character-creation-part-2",
  ],

  // Orc: sturdy, tusks → Warrior (melee) & Guardian (resilience)
  "ancestries-orc": [
    "classes-warrior",
    "classes-guardian",
    "ancestries-overview",
    "communities-orderborne",
  ],

  // Ribbet: amphibious, long tongue → Ranger (nature) & Rogue (versatile)
  "ancestries-ribbet": [
    "classes-ranger",
    "classes-rogue",
    "ancestries-overview",
    "communities-seaborne",
    "communities-wildborne",
  ],

  // Simiah: natural climber, nimble → Rogue (agility/evasion) & Ranger (mobility)
  "ancestries-simiah": [
    "classes-rogue",
    "classes-ranger",
    "ancestries-overview",
    "communities-wildborne",
  ],

  // ═══════════════════════════════════════════════════════════════════════════
  // COMMUNITIES ↔ ANCESTRIES
  // ═══════════════════════════════════════════════════════════════════════════

  // Communities overview → character creation + ancestries overview
  "communities-overview": [
    "ancestries-overview",
    "character-creation-part-1",
    "communities-highborne",
    "communities-wildborne",
    "communities-wanderborne",
  ],

  // Highborne: privilege, wealth, nobility → Drakona (regal), Elf (prestige)
  "communities-highborne": [
    "communities-overview",
    "ancestries-drakona",
    "ancestries-elf",
    "ancestries-human",
    "communities-loreborne",
  ],

  // Loreborne: knowledge, academia → Elf (scholarly), Clank (purpose-built)
  "communities-loreborne": [
    "communities-overview",
    "ancestries-elf",
    "ancestries-clank",
    "ancestries-human",
    "classes-wizard",
  ],

  // Orderborne: discipline, faith → Orc (structured), Human (adaptable), Seraph class
  "communities-orderborne": [
    "communities-overview",
    "ancestries-orc",
    "ancestries-human",
    "ancestries-dwarf",
    "classes-seraph",
  ],

  // Ridgeborne: mountains, hardy → Dwarf (mountain folk), Firbolg (sturdy), Giant (large)
  "communities-ridgeborne": [
    "communities-overview",
    "ancestries-dwarf",
    "ancestries-firbolg",
    "ancestries-giant",
    "ancestries-drakona",
  ],

  // Seaborne: ocean, sailing → Ribbet (amphibious), Galapa (turtle/water)
  "communities-seaborne": [
    "communities-overview",
    "ancestries-ribbet",
    "ancestries-galapa",
    "ancestries-human",
    "classes-ranger",
  ],

  // Slyborne: criminal underworld → Goblin (cunning), Infernis (intimidation), Halfling (luck)
  "communities-slyborne": [
    "communities-overview",
    "ancestries-goblin",
    "ancestries-infernis",
    "ancestries-halfling",
    "classes-rogue",
  ],

  // Underborne: subterranean → Goblin (surefooted/dark), Dwarf (underground), Fungril (dark)
  "communities-underborne": [
    "communities-overview",
    "ancestries-goblin",
    "ancestries-dwarf",
    "ancestries-fungril",
    "classes-ranger",
  ],

  // Wanderborne: nomadic → Halfling (compass), Human (adaptable), Faun (travelers)
  "communities-wanderborne": [
    "communities-overview",
    "ancestries-halfling",
    "ancestries-human",
    "ancestries-faun",
    "classes-bard",
  ],

  // Wildborne: forest, nature → Faerie (nature), Katari (feline/wild), Simiah (climber)
  "communities-wildborne": [
    "communities-overview",
    "ancestries-faerie",
    "ancestries-katari",
    "ancestries-simiah",
    "classes-druid-part-1",
  ],

  // ═══════════════════════════════════════════════════════════════════════════
  // CORE MECHANICS CROSS-REFS
  // ═══════════════════════════════════════════════════════════════════════════

  // Action rolls (2 parts) — fundamental mechanic, links to combat, stress, equipment
  "core-mechanics-action-rolls-part-1": [
    "core-mechanics-action-rolls-part-2",
    "core-mechanics-core-gameplay-loop",
    "core-mechanics-flow-of-the-game",
    "core-mechanics-combat",
  ],
  "core-mechanics-action-rolls-part-2": [
    "core-mechanics-action-rolls-part-1",
    "core-mechanics-stress",
    "core-mechanics-conditions",
    "core-mechanics-combat",
  ],

  // Additional rules — catch-all, links to various core mechanics
  "core-mechanics-additional-rules": [
    "core-mechanics-conditions",
    "core-mechanics-action-rolls-part-1",
    "core-mechanics-maps-range-movement",
    "core-mechanics-equipment-part-1",
  ],

  // Attacking — combat, action rolls, equipment/weapons
  "core-mechanics-attacking": [
    "core-mechanics-combat",
    "core-mechanics-action-rolls-part-1",
    "core-mechanics-equipment-part-1",
    "core-mechanics-maps-range-movement",
    "core-mechanics-conditions",
  ],

  // Combat — attacking, turn order, action economy, conditions
  "core-mechanics-combat": [
    "core-mechanics-attacking",
    "core-mechanics-turn-order-action-economy",
    "core-mechanics-conditions",
    "core-mechanics-maps-range-movement",
    "core-mechanics-action-rolls-part-1",
  ],

  // Conditions — combat, stress, death, attacking
  "core-mechanics-conditions": [
    "core-mechanics-combat",
    "core-mechanics-stress",
    "core-mechanics-death",
    "core-mechanics-attacking",
    "core-mechanics-additional-rules",
  ],

  // Core gameplay loop — flow of the game, action rolls, the spotlight
  "core-mechanics-core-gameplay-loop": [
    "core-mechanics-flow-of-the-game",
    "core-mechanics-action-rolls-part-1",
    "core-mechanics-the-spotlight",
    "introduction",
  ],

  // Death — stress, conditions, action rolls (risk it all)
  "core-mechanics-death": [
    "core-mechanics-stress",
    "core-mechanics-conditions",
    "core-mechanics-action-rolls-part-1",
    "core-mechanics-combat",
  ],

  // Downtime — leveling up, stress recovery, flow of the game
  "core-mechanics-downtime": [
    "core-mechanics-leveling-up",
    "core-mechanics-stress",
    "core-mechanics-flow-of-the-game",
    "core-mechanics-equipment-part-1",
    "running-an-adventure-gm-guidance",
  ],

  // Equipment (10 parts) — heavily cross-linked chain
  "core-mechanics-equipment-part-1": [
    "core-mechanics-equipment-part-2",
    "core-mechanics-equipment-part-3",
    "core-mechanics-attacking",
    "core-mechanics-combat",
    "character-creation-part-2",
  ],
  "core-mechanics-equipment-part-2": [
    "core-mechanics-equipment-part-1",
    "core-mechanics-equipment-part-3",
    "core-mechanics-equipment-part-4",
    "core-mechanics-attacking",
  ],
  "core-mechanics-equipment-part-3": [
    "core-mechanics-equipment-part-2",
    "core-mechanics-equipment-part-4",
    "core-mechanics-equipment-part-1",
    "core-mechanics-attacking",
  ],
  "core-mechanics-equipment-part-4": [
    "core-mechanics-equipment-part-3",
    "core-mechanics-equipment-part-5",
    "core-mechanics-equipment-part-2",
    "core-mechanics-combat",
  ],
  "core-mechanics-equipment-part-5": [
    "core-mechanics-equipment-part-4",
    "core-mechanics-equipment-part-6",
    "core-mechanics-equipment-part-3",
    "core-mechanics-attacking",
  ],
  "core-mechanics-equipment-part-6": [
    "core-mechanics-equipment-part-5",
    "core-mechanics-equipment-part-7",
    "core-mechanics-equipment-part-4",
    "core-mechanics-combat",
  ],
  "core-mechanics-equipment-part-7": [
    "core-mechanics-equipment-part-6",
    "core-mechanics-equipment-part-8",
    "core-mechanics-equipment-part-5",
    "core-mechanics-equipment-part-1",
  ],
  "core-mechanics-equipment-part-8": [
    "core-mechanics-equipment-part-7",
    "core-mechanics-equipment-part-9",
    "core-mechanics-equipment-part-6",
    "core-mechanics-attacking",
  ],
  "core-mechanics-equipment-part-9": [
    "core-mechanics-equipment-part-8",
    "core-mechanics-equipment-part-10",
    "core-mechanics-equipment-part-7",
    "core-mechanics-combat",
  ],
  "core-mechanics-equipment-part-10": [
    "core-mechanics-equipment-part-9",
    "core-mechanics-equipment-part-8",
    "core-mechanics-equipment-part-1",
    "core-mechanics-attacking",
  ],

  // Flow of the game — core gameplay loop, action rolls, running an adventure
  "core-mechanics-flow-of-the-game": [
    "core-mechanics-core-gameplay-loop",
    "core-mechanics-action-rolls-part-1",
    "core-mechanics-the-spotlight",
    "running-an-adventure-overview",
    "running-an-adventure-core-gm-mechanics-part-1",
  ],

  // Leveling up — multiclassing, character creation, domains overview, downtime
  "core-mechanics-leveling-up": [
    "core-mechanics-multiclassing",
    "character-creation-part-2",
    "domains-overview",
    "core-mechanics-downtime",
  ],

  // Maps, range & movement — combat, attacking, turn order
  "core-mechanics-maps-range-movement": [
    "core-mechanics-combat",
    "core-mechanics-attacking",
    "core-mechanics-turn-order-action-economy",
    "core-mechanics-additional-rules",
  ],

  // Multiclassing — leveling up, character creation, domains, classes overview
  "core-mechanics-multiclassing": [
    "core-mechanics-leveling-up",
    "character-creation-part-1",
    "domains-overview",
    "classes-overview",
  ],

  // Stress — death, conditions, action rolls, downtime
  "core-mechanics-stress": [
    "core-mechanics-death",
    "core-mechanics-conditions",
    "core-mechanics-action-rolls-part-2",
    "core-mechanics-downtime",
  ],

  // The spotlight — core gameplay loop, flow of the game, turn order
  "core-mechanics-the-spotlight": [
    "core-mechanics-core-gameplay-loop",
    "core-mechanics-flow-of-the-game",
    "core-mechanics-turn-order-action-economy",
    "running-an-adventure-gm-guidance",
  ],

  // Turn order & action economy — combat, the spotlight, maps/range
  "core-mechanics-turn-order-action-economy": [
    "core-mechanics-combat",
    "core-mechanics-the-spotlight",
    "core-mechanics-maps-range-movement",
    "core-mechanics-attacking",
    "core-mechanics-action-rolls-part-1",
  ],

  // ═══════════════════════════════════════════════════════════════════════════
  // RUNNING AN ADVENTURE
  // ═══════════════════════════════════════════════════════════════════════════

  // Overview → GM guidance, core GM mechanics, flow of the game
  "running-an-adventure-overview": [
    "running-an-adventure-gm-guidance",
    "running-an-adventure-core-gm-mechanics-part-1",
    "core-mechanics-flow-of-the-game",
    "introduction",
  ],

  // GM Guidance → core GM mechanics, additional guidance, spotlight
  "running-an-adventure-gm-guidance": [
    "running-an-adventure-overview",
    "running-an-adventure-core-gm-mechanics-part-1",
    "running-an-adventure-additional-gm-guidance",
    "core-mechanics-the-spotlight",
  ],

  // Additional GM Guidance (consolidated) → GM guidance, core GM mechanics, adversaries
  "running-an-adventure-additional-gm-guidance": [
    "running-an-adventure-gm-guidance",
    "running-an-adventure-core-gm-mechanics-part-1",
    "running-an-adventure-adversaries-and-environments-part-1",
    "core-mechanics-leveling-up",
    "core-mechanics-downtime",
  ],

  // Core GM Mechanics (4 parts) → action rolls, adversary/environment rules
  "running-an-adventure-core-gm-mechanics-part-1": [
    "running-an-adventure-core-gm-mechanics-part-2",
    "running-an-adventure-core-gm-mechanics-part-3",
    "core-mechanics-action-rolls-part-1",
    "running-an-adventure-gm-guidance",
  ],
  "running-an-adventure-core-gm-mechanics-part-2": [
    "running-an-adventure-core-gm-mechanics-part-1",
    "running-an-adventure-core-gm-mechanics-part-3",
    "core-mechanics-stress",
    "core-mechanics-action-rolls-part-2",
  ],
  "running-an-adventure-core-gm-mechanics-part-3": [
    "running-an-adventure-core-gm-mechanics-part-2",
    "running-an-adventure-core-gm-mechanics-part-4",
    "running-an-adventure-adversaries-and-environments-part-1",
    "core-mechanics-maps-range-movement",
  ],
  "running-an-adventure-core-gm-mechanics-part-4": [
    "running-an-adventure-core-gm-mechanics-part-3",
    "running-an-adventure-core-gm-mechanics-part-2",
    "running-an-adventure-adversaries-and-environments-part-1",
    "core-mechanics-combat",
  ],

  // Adversaries and Environments (22 parts)
  "running-an-adventure-adversaries-and-environments-part-1": [
    "running-an-adventure-adversaries-and-environments-part-2",
    "running-an-adventure-core-gm-mechanics-part-3",
    "core-mechanics-combat",
    "core-mechanics-attacking",
  ],
  "running-an-adventure-adversaries-and-environments-part-2": [
    "running-an-adventure-adversaries-and-environments-part-1",
    "running-an-adventure-adversaries-and-environments-part-3",
    "core-mechanics-conditions",
    "core-mechanics-stress",
  ],
  "running-an-adventure-adversaries-and-environments-part-3": [
    "running-an-adventure-adversaries-and-environments-part-2",
    "running-an-adventure-adversaries-and-environments-part-4",
    "core-mechanics-maps-range-movement",
  ],
  "running-an-adventure-adversaries-and-environments-part-4": [
    "running-an-adventure-adversaries-and-environments-part-3",
    "running-an-adventure-adversaries-and-environments-part-5",
    "core-mechanics-combat",
  ],
  "running-an-adventure-adversaries-and-environments-part-5": [
    "running-an-adventure-adversaries-and-environments-part-4",
    "running-an-adventure-adversaries-and-environments-part-6",
    "core-mechanics-death",
  ],
  "running-an-adventure-adversaries-and-environments-part-6": [
    "running-an-adventure-adversaries-and-environments-part-5",
    "running-an-adventure-adversaries-and-environments-part-7",
    "running-an-adventure-adversaries-and-environments-part-8",
  ],
  "running-an-adventure-adversaries-and-environments-part-7": [
    "running-an-adventure-adversaries-and-environments-part-6",
    "running-an-adventure-adversaries-and-environments-part-8",
    "running-an-adventure-adversaries-and-environments-part-9",
  ],
  "running-an-adventure-adversaries-and-environments-part-8": [
    "running-an-adventure-adversaries-and-environments-part-7",
    "running-an-adventure-adversaries-and-environments-part-9",
    "running-an-adventure-adversaries-and-environments-part-6",
  ],
  "running-an-adventure-adversaries-and-environments-part-9": [
    "running-an-adventure-adversaries-and-environments-part-8",
    "running-an-adventure-adversaries-and-environments-part-10",
    "running-an-adventure-adversaries-and-environments-part-7",
  ],
  "running-an-adventure-adversaries-and-environments-part-10": [
    "running-an-adventure-adversaries-and-environments-part-9",
    "running-an-adventure-adversaries-and-environments-part-11",
    "running-an-adventure-adversaries-and-environments-part-12",
  ],
  "running-an-adventure-adversaries-and-environments-part-11": [
    "running-an-adventure-adversaries-and-environments-part-10",
    "running-an-adventure-adversaries-and-environments-part-12",
    "running-an-adventure-adversaries-and-environments-part-13",
  ],
  "running-an-adventure-adversaries-and-environments-part-12": [
    "running-an-adventure-adversaries-and-environments-part-11",
    "running-an-adventure-adversaries-and-environments-part-13",
    "running-an-adventure-adversaries-and-environments-part-10",
  ],
  "running-an-adventure-adversaries-and-environments-part-13": [
    "running-an-adventure-adversaries-and-environments-part-12",
    "running-an-adventure-adversaries-and-environments-part-14",
    "running-an-adventure-adversaries-and-environments-part-11",
  ],
  "running-an-adventure-adversaries-and-environments-part-14": [
    "running-an-adventure-adversaries-and-environments-part-13",
    "running-an-adventure-adversaries-and-environments-part-15",
    "running-an-adventure-adversaries-and-environments-part-16",
  ],
  "running-an-adventure-adversaries-and-environments-part-15": [
    "running-an-adventure-adversaries-and-environments-part-14",
    "running-an-adventure-adversaries-and-environments-part-16",
    "running-an-adventure-adversaries-and-environments-part-13",
  ],
  "running-an-adventure-adversaries-and-environments-part-16": [
    "running-an-adventure-adversaries-and-environments-part-15",
    "running-an-adventure-adversaries-and-environments-part-17",
    "running-an-adventure-adversaries-and-environments-part-14",
  ],
  "running-an-adventure-adversaries-and-environments-part-17": [
    "running-an-adventure-adversaries-and-environments-part-16",
    "running-an-adventure-adversaries-and-environments-part-18",
    "running-an-adventure-adversaries-and-environments-part-15",
  ],
  "running-an-adventure-adversaries-and-environments-part-18": [
    "running-an-adventure-adversaries-and-environments-part-17",
    "running-an-adventure-adversaries-and-environments-part-19",
    "running-an-adventure-adversaries-and-environments-part-16",
  ],
  "running-an-adventure-adversaries-and-environments-part-19": [
    "running-an-adventure-adversaries-and-environments-part-18",
    "running-an-adventure-adversaries-and-environments-part-20",
    "running-an-adventure-adversaries-and-environments-part-17",
  ],
  "running-an-adventure-adversaries-and-environments-part-20": [
    "running-an-adventure-adversaries-and-environments-part-19",
    "running-an-adventure-adversaries-and-environments-part-21",
    "running-an-adventure-adversaries-and-environments-part-18",
  ],
  "running-an-adventure-adversaries-and-environments-part-21": [
    "running-an-adventure-adversaries-and-environments-part-20",
    "running-an-adventure-adversaries-and-environments-part-22",
    "running-an-adventure-adversaries-and-environments-part-19",
  ],
  "running-an-adventure-adversaries-and-environments-part-22": [
    "running-an-adventure-adversaries-and-environments-part-21",
    "running-an-adventure-adversaries-and-environments-part-20",
    "running-an-adventure-additional-gm-guidance",
    "core-mechanics-maps-range-movement",
  ],

  // The Witherwild (4 parts) — adventure module, links to adversaries and GM mechanics
  "running-an-adventure-the-witherwild-part-1": [
    "running-an-adventure-the-witherwild-part-2",
    "running-an-adventure-overview",
    "running-an-adventure-gm-guidance",
    "running-an-adventure-adversaries-and-environments-part-1",
  ],
  "running-an-adventure-the-witherwild-part-2": [
    "running-an-adventure-the-witherwild-part-1",
    "running-an-adventure-the-witherwild-part-3",
    "running-an-adventure-adversaries-and-environments-part-1",
    "core-mechanics-combat",
  ],
  "running-an-adventure-the-witherwild-part-3": [
    "running-an-adventure-the-witherwild-part-2",
    "running-an-adventure-the-witherwild-part-4",
    "running-an-adventure-adversaries-and-environments-part-1",
    "core-mechanics-maps-range-movement",
  ],
  "running-an-adventure-the-witherwild-part-4": [
    "running-an-adventure-the-witherwild-part-3",
    "running-an-adventure-the-witherwild-part-1",
    "running-an-adventure-core-gm-mechanics-part-1",
    "running-an-adventure-adversaries-and-environments-part-1",
  ],
};

// ─── Section Cross-References ─────────────────────────────────────────────────

/**
 * Section-level relationships. When browsing items in section X, items from
 * section Y are thematically relevant and may be worth surfacing.
 *
 * These are used as a fallback hint when neither curated entries nor
 * Jaccard similarity yield strong matches — the caller can prefer candidates
 * from cross-referenced sections.
 */
export const SECTION_CROSS_REFERENCES: Record<string, string[]> = {
  Classes: ["Appendix", "Domains", "Ancestries"],
  Domains: ["Classes", "Appendix"],
  Ancestries: ["Communities", "Classes"],
  Communities: ["Ancestries", "Classes"],
  "Core Mechanics": ["Running an Adventure", "Classes"],
  "Running an Adventure": ["Core Mechanics"],
  Appendix: ["Classes", "Domains"],
  "Character Creation": ["Classes", "Ancestries", "Communities", "Domains"],
  Introduction: ["Character Creation", "Core Mechanics"],
};

// ─── Lookup Function ──────────────────────────────────────────────────────────

/**
 * Retrieve curated similar chunk IDs for a given chunk.
 *
 * 1. Checks {@link CANONICAL_SIMILARITY_MAP} for hand-curated entries.
 * 2. Returns up to `limit` IDs (default 4).
 * 3. If curated entries < limit, the caller fills remaining slots from
 *    Jaccard similarity (this function does NOT pad results).
 *
 * @param chunkId - The ID of the source chunk to find similarities for.
 * @param limit   - Maximum number of similar IDs to return (default 4).
 * @returns An array of related chunk IDs, ordered by curated relevance.
 *          May be shorter than `limit` (or empty) if no curated data exists.
 *
 * @example
 * const ids = getCanonicalSimilar("classes-guardian", 4);
 * // → ["appendix-valor-domain-cards", "appendix-blade-domain-cards",
 * //     "classes-warrior", "classes-seraph"]
 *
 * @example
 * // Unknown chunk returns empty — caller falls back to Jaccard
 * const ids = getCanonicalSimilar("some-unknown-entry");
 * // → []
 */
export function getCanonicalSimilar(
  chunkId: string,
  limit: number = 4,
): string[] {
  const curated = CANONICAL_SIMILARITY_MAP[chunkId];

  if (!curated || curated.length === 0) {
    return [];
  }

  return curated.slice(0, limit);
}
