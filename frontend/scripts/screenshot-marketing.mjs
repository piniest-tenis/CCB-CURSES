/**
 * scripts/screenshot-marketing.mjs
 *
 * Marketing Screenshot Tool — App Screen Capture
 * ─────────────────────────────────────────────────────────────────────────────
 * Navigates to the REAL authenticated application pages with mock fixture data
 * and captures production-quality screenshots for use on the marketing site.
 *
 * Strategy
 * ────────
 * 1. Seed sessionStorage with a fake but structurally-valid auth token so the
 *    Zustand auth store boots as `isAuthenticated: true, isReady: true`.
 *
 * 2. Intercept ALL API calls (via page.route) and return rich fixture JSON so
 *    the app renders fully without a real backend.
 *
 * 3. Navigate directly to the target app route (e.g. /campaigns/demo-campaign-1).
 *
 * 4. Suppress extraneous chrome (nav, modals, loading spinners, websocket banners)
 *    with injected CSS.
 *
 * 5. Wait for the target content to appear, then screenshot the viewport (above-the-fold).
 *
 * Usage
 * ─────
 *   # Dev server must already be running on :3000
 *   npm run screenshot:marketing
 *
 *   # Mobile viewport (390 px wide):
 *   npm run screenshot:marketing:mobile
 *
 * Output files (desktop)
 * ──────────────────────
 *   home--campaign-command-center-desktop.png
 *
 *   streaming--live-character-cards-desktop.png
 *   streaming--obs-dice-log-overlay-desktop.png
 *   streaming--public-character-sheets-desktop.png
 *   streaming--command-hud-streamers-desktop.png
 *
 *   campaigns--campaign-creation-party-desktop.png
 *   campaigns--encounter-designer-desktop.png
 *   campaigns--session-logging-desktop.png
 *   campaigns--gm-command-hud-desktop.png
 *   campaigns--realtime-websocket-desktop.png
 *   campaigns--homebrew-workshop-desktop.png
 *
 *   new-players--srd-inline-learning-desktop.png
 *   new-players--gm-teaching-tools-desktop.png
 */

import { chromium } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

// ─── Config ──────────────────────────────────────────────────────────────────

const BASE_URL        = (process.env.BASE_URL ?? "http://localhost:3000").trim().replace(/\/+$/, "");
const MOBILE          = process.argv.includes("--mobile");
const VIEWPORT        = MOBILE
  ? { width: 390, height: 844 }   // iPhone 14 Pro
  : { width: 1440, height: 900 }; // Standard desktop
const VIEWPORT_SUFFIX = MOBILE ? "mobile" : "desktop";

const OUT_DIR = path.resolve(__dirname, "../public/images/marketing-screenshots");

// ─── Fixture IDs ─────────────────────────────────────────────────────────────

const FIXTURE = {
  userId:      "user-fixture-001",
  campaignId:  "campaign-fixture-001",
  charId:      "char-fixture-001",
  char2Id:     "char-fixture-002",
  char3Id:     "char-fixture-003",
  char4Id:     "char-fixture-004",
  shareToken:  "demo-share-token-abc123",
};

// ─── Rich fixture data ────────────────────────────────────────────────────────

function makeCharacter(overrides = {}) {
  return {
    characterId:    FIXTURE.charId,
    userId:         FIXTURE.userId,
    name:           "Zara Nighthollow",
    classId:        "sorcerer",
    className:      "Sorcerer",
    subclassId:     "sorcerer-warden-of-renewal",
    subclassName:   "Warden of Renewal",
    communityId:    "wandering-village",
    communityName:  "Wandering Village",
    ancestryId:     "dwarf",
    ancestryName:   "Dwarf",
    level:          3,
    avatarUrl:      null,
    portraitUrl:    null,
    campaignId:     FIXTURE.campaignId,
    isMixedAncestry: false,
    mixedAncestryBottomId: null,
    mixedAncestryDisplayName: null,
    multiclassClassId:        null,
    multiclassClassName:      null,
    multiclassSubclassId:     null,
    multiclassDomainId:       null,
    multiclassClassFeatureIndex: null,
    domains:    ["arcana", "codex"],
    stats: { agility: 0, strength: 1, finesse: 2, instinct: -1, presence: 3, knowledge: 1 },
    derivedStats: { evasion: 11, armor: 2, baseEvasion: 11 },
    trackers: {
      hp:     { max: 6, marked: 2 },
      stress: { max: 6, marked: 1 },
      armor:  { max: 3, marked: 1 },
    },
    damageThresholds: { major: 8, severe: 14 },
    weapons: {
      primary:   { weaponId: "staff-of-the-arcane" },
      secondary: { weaponId: null },
    },
    hope:       4,
    hopeMax:    6,
    proficiency: 2,
    experiences: [
      { name: "Ancient History", bonus: 2 },
      { name: "Street Performer", bonus: 1 },
    ],
    conditions:    ["Hidden"],
    domainLoadout: ["arcana/arcana-volatile-locus", "arcana/arcana-blink", "codex/codex-familiar", "codex/codex-recall-knowledge"],
    domainVault:   ["arcana/arcana-volatile-locus", "arcana/arcana-blink", "arcana/arcana-spell-ward", "codex/codex-familiar", "codex/codex-recall-knowledge"],
    classFeatureState: {},
    traitBonuses:      {},
    notes:             "Searching for the ruins of Aetherpeak. Doesn't trust imperial mages.",
    avatarKey:         null,
    portraitKey:       null,
    activeArmorId:     "mage-robes",
    gold:              { handfuls: 3, bags: 1, chests: 0 },
    inventory:         ["Arcane focus", "Spellbook (blank)", "50 feet of rope", "Minor Health Potion"],
    cardTokens:        {},
    downtimeProjects:  [],
    activeAuras:       [],
    companionState:    null,
    createdAt:         "2026-01-10T12:00:00Z",
    updatedAt:         "2026-04-14T18:30:00Z",
    source:            "srd",
    ...overrides,
  };
}

function makePartyCharacter(id, name, cls, subclass, hp, stress, hope, conditions = []) {
  return {
    ...makeCharacter({ characterId: id, name, classId: cls, className: cls,
      subclassId: null, subclassName: subclass,
      trackers: { hp: { max: 7, marked: hp }, stress: { max: 6, marked: stress }, armor: { max: 2, marked: 0 } },
      hope, conditions }),
    characterId: id,
    name,
  };
}

const FIXTURE_CHARACTERS = [
  makePartyCharacter(FIXTURE.charId,  "Zara Nighthollow", "Sorcerer",  "Warden of Renewal",  2, 1, 4, ["Hidden"]),
  makePartyCharacter(FIXTURE.char2Id, "Bodrik Ironmantle","Warrior",   "Call of the Brave",  5, 3, 2, ["Vulnerable"]),
  makePartyCharacter(FIXTURE.char3Id, "Leila Dawnwhisper","Rogue",     "Nightstalk",          1, 0, 6, []),
  makePartyCharacter(FIXTURE.char4Id, "Oryn Skywatcher",  "Seraph",    "Winged Sentinel",     6, 5, 0, ["Restrained", "Frightened"]),
];

// CampaignDetail-shaped fixture (matches src/types/campaign.ts exactly)
const FIXTURE_CAMPAIGN = {
  // ── Campaign base fields ──────────────────────────────────────────────────
  campaignId:            FIXTURE.campaignId,
  name:                  "The Shattered Throne",
  description:           "A dark fantasy campaign set in the ruins of an ancient empire.",
  primaryGmId:           FIXTURE.userId,
  schedule:              null,
  currentFear:           3,
  cursesContentEnabled:  false,
  createdAt:             "2026-01-10T12:00:00Z",
  updatedAt:             "2026-04-14T18:30:00Z",

  // ── CampaignDetail extra fields ───────────────────────────────────────────
  // callerRole must be "gm" to trigger the GM tab bar + Command tab
  callerRole:            "gm",

  // members: CampaignMemberDetail[] — shape: { userId, displayName, avatarUrl, role, joinedAt, characterId }
  members: [
    { userId: FIXTURE.userId,  displayName: "ManInJumpsuit", avatarUrl: null, role: "gm",     joinedAt: "2026-01-10T12:00:00Z", characterId: FIXTURE.charId  },
    { userId: "user-002",      displayName: "CrimsonBard",   avatarUrl: null, role: "player",  joinedAt: "2026-01-11T09:00:00Z", characterId: FIXTURE.char2Id },
    { userId: "user-003",      displayName: "NightOwlTTRPG", avatarUrl: null, role: "player",  joinedAt: "2026-01-11T09:30:00Z", characterId: FIXTURE.char3Id },
    { userId: "user-004",      displayName: "SkyWatcher99",  avatarUrl: null, role: "player",  joinedAt: "2026-01-11T10:00:00Z", characterId: FIXTURE.char4Id },
  ],

  // characters: CampaignCharacterDetail[] — shape: { characterId, userId, name, className, level, avatarUrl, portraitUrl }
  characters: [
    { characterId: FIXTURE.charId,  userId: FIXTURE.userId, name: "Zara Nighthollow",  className: "Sorcerer", level: 3, avatarUrl: null, portraitUrl: null },
    { characterId: FIXTURE.char2Id, userId: "user-002",     name: "Bodrik Ironmantle", className: "Warrior",  level: 3, avatarUrl: null, portraitUrl: null },
    { characterId: FIXTURE.char3Id, userId: "user-003",     name: "Leila Dawnwhisper", className: "Rogue",    level: 3, avatarUrl: null, portraitUrl: null },
    { characterId: FIXTURE.char4Id, userId: "user-004",     name: "Oryn Skywatcher",   className: "Seraph",   level: 3, avatarUrl: null, portraitUrl: null },
  ],

  // invites (optional)
  invites: [
    {
      campaignId:        FIXTURE.campaignId,
      inviteCode:        "SHATTR7",
      createdByUserId:   FIXTURE.userId,
      maxUses:           null,
      useCount:          3,
      expiresAt:         null,
      grantRole:         "player",
      createdAt:         "2026-01-10T12:00:00Z",
    },
  ],
};

const FIXTURE_USER_PROFILE = {
  userId:        FIXTURE.userId,
  email:         "gm@curses.show",
  username:      "ManInJumpsuit",
  displayName:   "ManInJumpsuit",
  tier:          "gm",
  avatarUrl:     null,
  preferences:   {},
  patreon:       null,          // null triggers grandfathering check (createdAt < cutoff)
  createdAt:     "2025-10-01T00:00:00Z",  // well before the 2026-04-05 cutoff → grandfathered
  updatedAt:     "2025-10-01T00:00:00Z",
};

// Adversaries for encounter designer
const FIXTURE_ADVERSARIES = [
  { adversaryId: "pale-rider-soldier", name: "Pale Rider Soldier", tier: 1, type: "Standard",   difficulty: "Easy",   hp: 6,  attack: "Lance", damage: "1d6+2", role: "bruiser" },
  { adversaryId: "pale-rider-captain", name: "Pale Rider Captain", tier: 1, type: "Leader",     difficulty: "Medium", hp: 14, attack: "Blade", damage: "1d8+4", role: "leader" },
  { adversaryId: "thornwood-wraith",   name: "Thornwood Wraith",   tier: 1, type: "Standard",   difficulty: "Easy",   hp: 5,  attack: "Grasp", damage: "1d4",   role: "skirmisher" },
  { adversaryId: "shadow-shepherd",    name: "Shadow Shepherd",    tier: 2, type: "Solo",        difficulty: "Hard",   hp: 24, attack: "Void Pulse", damage: "2d8+3", role: "solo" },
  { adversaryId: "iron-golem",         name: "Iron Golem",         tier: 2, type: "Bruiser",     difficulty: "Hard",   hp: 20, attack: "Slam", damage: "2d6+5", role: "bruiser" },
  { adversaryId: "forest-troll",       name: "Forest Troll",       tier: 1, type: "Standard",   difficulty: "Medium", hp: 10, attack: "Claw", damage: "1d8+2", role: "tank" },
];

// Domain cards for the character loadout (full DomainCard shape)
const FIXTURE_DOMAIN_CARDS = [
  {
    cardId: "arcana-volatile-locus", name: "Volatile Locus",  domain: "arcana",
    level: 1, source: "srd", recallCost: 1,
    isCursed: false, isLinkedCurse: false, isGrimoire: false,
    curseText: null, linkedCardIds: [], grimoire: [],
    description: "Mark a Stress to unleash a burst of unstable arcane energy. All creatures within close range must make an Agility reaction roll or take 1d8 magic damage.",
  },
  {
    cardId: "arcana-blink", name: "Blink", domain: "arcana",
    level: 1, source: "srd", recallCost: 0,
    isCursed: false, isLinkedCurse: false, isGrimoire: false,
    curseText: null, linkedCardIds: [], grimoire: [],
    description: "Teleport yourself up to far range to an unoccupied space you can see. This movement doesn't provoke reactions.",
  },
  {
    cardId: "arcana-spell-ward", name: "Spell Ward", domain: "arcana",
    level: 2, source: "srd", recallCost: 1,
    isCursed: false, isLinkedCurse: false, isGrimoire: false,
    curseText: null, linkedCardIds: [], grimoire: [],
    description: "When an ally within close range would take magic damage, you can spend a Hope to halve that damage.",
  },
  {
    cardId: "codex-familiar", name: "Familiar Spirit", domain: "codex",
    level: 2, source: "srd", recallCost: 1,
    isCursed: false, isLinkedCurse: false, isGrimoire: false,
    curseText: null, linkedCardIds: [], grimoire: [],
    description: "Summon a spectral familiar that can scout, distract enemies, and relay simple messages. The familiar has Evasion 12 and vanishes if it takes any damage.",
  },
  {
    cardId: "codex-recall-knowledge", name: "Recall Knowledge", domain: "codex",
    level: 1, source: "srd", recallCost: 0,
    isCursed: false, isLinkedCurse: false, isGrimoire: false,
    curseText: null, linkedCardIds: [], grimoire: [],
    description: "Spend a Hope to recall a piece of lore that is directly relevant to your current situation. The GM must answer one concrete question truthfully.",
  },
];

// Class data for Sorcerer (full ClassData shape)
const FIXTURE_CLASS_SORCERER = {
  classId:          "sorcerer",
  name:             "Sorcerer",
  domains:          ["arcana", "codex"],
  startingEvasion:  10,
  startingHitPoints: 6,
  source:           "srd",
  classItems:       ["Arcane focus", "Spellbook (blank)"],
  hopeFeature: {
    name:        "Arcane Surge",
    description: "Spend 3 Hope to supercharge your next spell. Double the damage dice rolled on your next Arcana or Codex domain card this scene.",
    hopeCost:    3,
  },
  classFeatures: [
    {
      name:        "Spellcast",
      description: "When you make a spell attack, roll your Spellcast Trait die in addition to the normal 2d12 action roll. Use the highest two results.",
      options:     [],
    },
    {
      name:        "Arcane Sense",
      description: "You can feel the presence of magic within close range. Spend a Hope to identify the nature and strength of a magical effect.",
      options:     [],
    },
  ],
  backgroundQuestions: [
    "How did you first discover your magical ability?",
    "What is the source of your power?",
  ],
  connectionQuestions: [
    "Which party member have you shared a secret about your magic with?",
    "Who in the party are you most protective of?",
  ],
  mechanicalNotes: "Sorcerers use their Spellcast Trait for spell attacks and gain access to Arcana and Codex domain cards.",
  armorRec: ["mage-robes"],
  subclasses: [
    {
      subclassId:     "sorcerer-warden-of-renewal",
      name:           "Warden of Renewal",
      description:    "A sorcerer who channels life-giving magic, mending wounds and bolstering allies.",
      spellcastTrait: "presence",
      foundationFeatures: [
        { name: "Renewing Touch",    description: "When you succeed on a spell attack, an ally within close range can clear 1 Hit Point." },
        { name: "Vitality Reserve",  description: "Once per rest, you can spend 2 Hope to let an ally clear a Stress." },
      ],
      specializationFeature: {
        name:        "Life Surge",
        description: "When you use Arcane Surge, all allies within close range also clear 1 Hit Point.",
      },
      masteryFeature: {
        name:        "Wellspring of Life",
        description: "At the start of each scene, every ally within near range clears 1 Hit Point. This effect stacks with Renewing Touch.",
      },
    },
    {
      subclassId:     "sorcerer-elemental-origin",
      name:           "Elemental Origin",
      description:    "A sorcerer whose power flows from a primal elemental force — fire, ice, lightning, or stone.",
      spellcastTrait: "knowledge",
      foundationFeatures: [
        { name: "Elemental Affinity", description: "Choose an element at character creation. Your spell attacks of that element deal +1 damage." },
        { name: "Resist Element",     description: "You have resistance to damage from your chosen element." },
      ],
      specializationFeature: {
        name:        "Elemental Overload",
        description: "When you roll a critical success on a spell attack, the attack deals an additional 1d8 damage of your chosen element.",
      },
      masteryFeature: {
        name:        "Primordial Avatar",
        description: "Once per long rest, transform into an elemental avatar for the scene, gaining +2 to your Spellcast Trait and immunity to your element.",
      },
    },
  ],
};

// Ancestry fixture (Dwarf — full AncestryData shape)
const FIXTURE_ANCESTRY_DWARF = {
  ancestryId:             "dwarf",
  name:                   "Dwarf",
  flavorText:             "Stout and enduring, dwarves are renowned for their craftsmanship and unshakeable resolve.",
  traitName:              "Sturdy",
  traitDescription:       "You have advantage on rolls to resist being knocked prone or moved against your will.",
  secondTraitName:        "Darkvision",
  secondTraitDescription: "You can see in dim light as if it were bright light, and in darkness as if it were dim light.",
  source:                 "srd",
  mechanicalBonuses: [
    { stat: "hp", amount: 1, traitIndex: 0 },
  ],
};

// Community fixture (Wandering Village — full CommunityData shape)
const FIXTURE_COMMUNITY_WANDERING_VILLAGE = {
  communityId:      "wandering-village",
  name:             "Wandering Village",
  flavorText:       "A nomadic community of traders and storytellers who carry their home wherever they go.",
  traitName:        "Wayfarer's Instinct",
  traitDescription: "You have advantage on rolls to navigate unfamiliar terrain and can always find true north.",
  source:           "srd",
  mechanicalBonuses: [
    { stat: "evasion", amount: 1, traitIndex: 0 },
  ],
};

// Homebrew content fixture
const FIXTURE_HOMEBREW = {
  contentType:  "class",
  name:         "Voidwalker",
  description:  "A warrior who channels the emptiness between stars to fuel devastating attacks.",
  source:       "homebrew",
  fields: {
    startingHP:      8,
    startingStress:  6,
    evasion:         10,
    primaryDomain:   "Weird",
    secondaryDomain: "Violence",
    startingGold:    "1 handful",
    classFeatures: [
      { name: "Void Step",    level: 1, description: "Once per rest, teleport a close distance as a reaction." },
      { name: "Null Aura",    level: 3, description: "Allies within near range cannot be Frightened." },
      { name: "Event Horizon",level: 5, description: "Mark 2 Stress to pull all enemies within far range close to you." },
    ],
  },
  markdownPreview: `# Voidwalker

*A warrior who channels the emptiness between stars.*

**Starting HP:** 8 | **Evasion:** 10 | **Stress:** 6  
**Domains:** Weird · Violence

## Class Features

### Void Step *(Level 1)*
Once per rest, teleport a close distance as a reaction. This movement does not provoke attack reactions.

### Null Aura *(Level 3)*
Allies within near range cannot gain the **Frightened** condition while you are conscious.

### Event Horizon *(Level 5)*
Mark 2 Stress. All enemies within far range are pulled to within close range of you simultaneously.
`,
};

// Dice log fixture — proper RollResult[] shape matching @/types/dice.ts
const DICE_LOG_FIXTURE = [
  {
    id: "roll-1", timestamp: new Date(Date.now() - 15000).toISOString(),
    request: { label: "Agility Check", type: "action", dice: [{ size: "d12", role: "hope" }, { size: "d12", role: "fear" }, { size: "d6", role: "advantage" }], modifier: 2, characterName: "Zara Nighthollow" },
    dice: [{ size: "d12", role: "hope", value: 11 }, { size: "d12", role: "fear", value: 5 }, { size: "d6", role: "advantage", value: 4 }],
    total: 22, hopeValue: 11, fearValue: 5,
  },
  {
    id: "roll-2", timestamp: new Date(Date.now() - 45000).toISOString(),
    request: { label: "Strength Attack", type: "action", dice: [{ size: "d12", role: "hope" }, { size: "d12", role: "fear" }], modifier: 3, characterName: "Bodrik Ironmantle" },
    dice: [{ size: "d12", role: "hope", value: 8 }, { size: "d12", role: "fear", value: 8 }],
    total: 19, outcome: "critical", hopeValue: 8, fearValue: 8,
  },
  {
    id: "roll-3", timestamp: new Date(Date.now() - 90000).toISOString(),
    request: { label: "Finesse", type: "action", dice: [{ size: "d12", role: "hope" }, { size: "d12", role: "fear" }], characterName: "Leila Dawnwhisper" },
    dice: [{ size: "d12", role: "hope", value: 9 }, { size: "d12", role: "fear", value: 6 }],
    total: 15, hopeValue: 9, fearValue: 6,
  },
  {
    id: "roll-4", timestamp: new Date(Date.now() - 120000).toISOString(),
    request: { label: "Arcane Blast", type: "damage", dice: [{ size: "d8", role: "damage" }, { size: "d8", role: "damage" }], modifier: 1, characterName: "Zara Nighthollow" },
    dice: [{ size: "d8", role: "damage", value: 7 }, { size: "d8", role: "damage", value: 3 }],
    total: 11,
  },
  {
    id: "roll-5", timestamp: new Date(Date.now() - 180000).toISOString(),
    request: { label: "Presence", type: "action", dice: [{ size: "d12", role: "hope" }, { size: "d12", role: "fear" }], modifier: 1, characterName: "Oryn Skywatcher" },
    dice: [{ size: "d12", role: "hope", value: 4 }, { size: "d12", role: "fear", value: 10 }],
    total: 15, hopeValue: 4, fearValue: 10,
  },
];

// ─── CSS injected into every page ────────────────────────────────────────────

const SUPPRESS_CSS = /* css */ `
  /* ── Sticky navigation + breadcrumbs (preserve mobile bottom tab bar) ── */
  nav[aria-label]:not([aria-label="Campaign tabs"]),
  header,
  [data-marketing-nav] {
    display: none !important;
  }

  /* ── Footer ── */
  footer {
    display: none !important;
  }

  /* ── Toast notifications and modals ── */
  [data-testid="modal"],
  [role="dialog"],
  [aria-modal="true"],
  .toast,
  [class*="toast"],
  [class*="Toast"] {
    display: none !important;
  }

  /* ── Mobile Party FAB (obscured by bottom bars, unnecessary for screenshots) ── */
  [aria-label="Open party overview"].sm\\:hidden,
  [aria-label="Close party overview"].sm\\:hidden,
  button[aria-label="Open party overview"][class*="sm:hidden"],
  button[aria-label="Close party overview"][class*="sm:hidden"] {
    display: none !important;
  }

  /* ── WebSocket connection banner ── */
  [class*="connection-banner"],
  [class*="ws-status"],
  [data-ws-status] {
    display: none !important;
  }

  /* ── Loading spinners / skeletons ── */
  [class*="animate-pulse"],
  [class*="skeleton"],
  [class*="Skeleton"] {
    animation: none !important;
  }

  /* ── Kill transitions for instant rendering ── */
  *,
  *::before,
  *::after {
    animation-delay:          -1ms !important;
    animation-duration:       1ms !important;
    animation-iteration-count: 1 !important;
    transition-duration:      1ms !important;
    transition-delay:         0ms !important;
  }

  /* ── Force all reveal / stagger elements visible ── */
  /* IMPORTANT: Do NOT override opacity on elements that use opacity-0 as a
     "closed" state for drawers/modals. Those elements also have
     "pointer-events-none" when hidden. We exclude them from this rule. */
  [class*="opacity-0"]:not([class*="pointer-events-none"]) {
    opacity: 1 !important;
  }
  [style*="opacity: 0"],
  [style*="opacity:0"] {
    opacity: 1 !important;
  }

  /* ── Hide drawer/modal scrims and backdrops (fixed overlays with blur) ── */
  [role="dialog"],
  [aria-modal="true"] {
    display: none !important;
  }

  /* ── Hide backdrop-blur scrims (siblings of dialogs, not caught above) ── */
  .fixed.inset-0.backdrop-blur-sm,
  [class*="backdrop-blur"][class*="fixed"][class*="inset-0"] {
    display: none !important;
  }

  [style*="transform: translate"],
  [style*="transform:translate"] {
    transform: none !important;
  }

  /* ── Parallax layers: freeze in place ── */
  .will-change-transform {
    transform: none !important;
    will-change: auto !important;
  }

  /* ── Scroll-hint chevron in hero ── */
  .animate-scroll-hint,
  [class*="scroll-hint"] {
    display: none !important;
  }

  /* ── Force Crit button (admin/debug tool, not for marketing) ── */
  button[aria-pressed][title*="Force"],
  button[aria-pressed][title*="force"],
  button[aria-pressed][title*="Disarm forced critical"] {
    display: none !important;
  }
`;

// ─── API route mocking ────────────────────────────────────────────────────────

/**
 * Registers fixture-based API route handlers on a Playwright BrowserContext.
 * All calls to /api/* or the configured API base URL return canned JSON.
 */
async function mockApiRoutes(context) {
  // Intercept ALL requests; only mock the ones going to the AWS API gateway.
  // Previous attempts with targeted patterns (regex and glob) failed to
  // intercept cross-origin HTTPS calls. This catch-all approach lets
  // non-API requests pass through via route.continue().
  await context.route("**/*", async (route) => {
    const url = route.request().url();

    // Only intercept AWS API gateway calls
    if (!url.includes("execute-api") && !url.includes("localhost:3001")) {
      return route.continue();
    }

    // ── Auth ─────────────────────────────────────────────────────────────────
    if (url.includes("/users/me")) {
      return route.fulfill({ status: 200, contentType: "application/json",
        body: JSON.stringify({ data: FIXTURE_USER_PROFILE }) });
    }

    // ── Characters ───────────────────────────────────────────────────────────
    if (url.includes("/characters") && url.includes("/view")) {
      // Shared character view (Twitch overlay, public sheet)
      return route.fulfill({ status: 200, contentType: "application/json",
        body: JSON.stringify({ data: FIXTURE_CHARACTERS[0] }) });
    }

    if (url.includes("/characters") && url.includes("/share")) {
      return route.fulfill({ status: 200, contentType: "application/json",
        body: JSON.stringify({ data: { token: FIXTURE.shareToken, expiresAt: "2026-04-21T00:00:00Z" } }) });
    }

    if (url.match(/\/characters\/[^/]+\/domain-cards/)) {
      return route.fulfill({ status: 200, contentType: "application/json",
        body: JSON.stringify({ data: FIXTURE_DOMAIN_CARDS }) });
    }

    if (url.match(/\/characters\/[^/]+$/)) {
      // Individual character fetch
      const charId = url.split("/characters/")[1].split("?")[0].split("/")[0];
      const char = FIXTURE_CHARACTERS.find(c => c.characterId === charId) ?? FIXTURE_CHARACTERS[0];
      return route.fulfill({ status: 200, contentType: "application/json",
        body: JSON.stringify({ data: char }) });
    }

    if (url.includes("/characters")) {
      // Character list
      return route.fulfill({ status: 200, contentType: "application/json",
        body: JSON.stringify({ data: FIXTURE_CHARACTERS }) });
    }

    // ── Campaigns ────────────────────────────────────────────────────────────
    if (url.match(/\/campaigns\/[^/]+\/members/)) {
      return route.fulfill({ status: 200, contentType: "application/json",
        body: JSON.stringify({ data: FIXTURE_CAMPAIGN.members }) });
    }

    if (url.match(/\/campaigns\/[^/]+\/sessions/)) {
      return route.fulfill({ status: 200, contentType: "application/json",
        body: JSON.stringify({ data: FIXTURE_CAMPAIGN.sessions }) });
    }

    if (url.match(/\/campaigns\/[^/]+\/encounters/)) {
      return route.fulfill({ status: 200, contentType: "application/json",
        body: JSON.stringify({ data: FIXTURE_CAMPAIGN.encounters }) });
    }

    if (url.match(/\/campaigns\/[^/]+$/)) {
      return route.fulfill({ status: 200, contentType: "application/json",
        body: JSON.stringify({ data: FIXTURE_CAMPAIGN }) });
    }

    if (url.includes("/campaigns")) {
      return route.fulfill({ status: 200, contentType: "application/json",
        body: JSON.stringify({ data: [FIXTURE_CAMPAIGN] }) });
    }

    // ── Adversaries ──────────────────────────────────────────────────────────
    if (url.includes("/adversaries")) {
      return route.fulfill({ status: 200, contentType: "application/json",
        body: JSON.stringify({ data: FIXTURE_ADVERSARIES }) });
    }

    // ── Homebrew ─────────────────────────────────────────────────────────────
    if (url.includes("/homebrew")) {
      return route.fulfill({ status: 200, contentType: "application/json",
        body: JSON.stringify({ data: [] }) });
    }

    // ── Classes (game data) ─────────────────────────────────────────────────
    if (url.match(/\/classes\/[^/?]+/)) {
      return route.fulfill({ status: 200, contentType: "application/json",
        body: JSON.stringify({ data: FIXTURE_CLASS_SORCERER }) });
    }
    if (url.match(/\/classes(\?|$)/)) {
      return route.fulfill({ status: 200, contentType: "application/json",
        body: JSON.stringify({ data: { classes: [FIXTURE_CLASS_SORCERER] } }) });
    }

    // ── Domain card detail (must be before /domains/<domain> catch) ───────
    if (url.match(/\/domains\/[^/]+\/cards\/[^/?]+/)) {
      const cardId = url.split("/cards/")[1]?.split("?")[0]?.split("/")[0];
      const card = FIXTURE_DOMAIN_CARDS.find(c => c.cardId === cardId) ?? FIXTURE_DOMAIN_CARDS[0];
      return route.fulfill({ status: 200, contentType: "application/json",
        body: JSON.stringify({ data: card }) });
    }

    // ── Domain cards list (GET /domains/<domain>) ────────────────────────
    if (url.match(/\/domains\/[^/?]+(\?|$)/)) {
      const domainName = url.split("/domains/")[1]?.split("?")[0]?.split("/")[0];
      const domainCards = FIXTURE_DOMAIN_CARDS.filter(c => c.domain === decodeURIComponent(domainName ?? ""));
      return route.fulfill({ status: 200, contentType: "application/json",
        body: JSON.stringify({ data: { domain: decodeURIComponent(domainName ?? ""), cards: domainCards } }) });
    }

    // ── Domains list ─────────────────────────────────────────────────────
    if (url.match(/\/domains(\?|$)/)) {
      return route.fulfill({ status: 200, contentType: "application/json",
        body: JSON.stringify({ data: { domains: [
          { domain: "arcana", description: "The domain of raw magical power and spellcraft.", cardCount: 12, cardsByLevel: { "1": 4, "2": 4, "3": 4 } },
          { domain: "codex",  description: "The domain of knowledge, lore, and scholarly magic.", cardCount: 12, cardsByLevel: { "1": 4, "2": 4, "3": 4 } },
        ] } }) });
    }

    // ── Ancestries ───────────────────────────────────────────────────────
    if (url.match(/\/ancestries\/[^/?]+/)) {
      return route.fulfill({ status: 200, contentType: "application/json",
        body: JSON.stringify({ data: FIXTURE_ANCESTRY_DWARF }) });
    }
    if (url.match(/\/ancestries(\?|$)/)) {
      return route.fulfill({ status: 200, contentType: "application/json",
        body: JSON.stringify({ data: { ancestries: [FIXTURE_ANCESTRY_DWARF] } }) });
    }

    // ── Communities ──────────────────────────────────────────────────────
    if (url.match(/\/communities\/[^/?]+/)) {
      return route.fulfill({ status: 200, contentType: "application/json",
        body: JSON.stringify({ data: FIXTURE_COMMUNITY_WANDERING_VILLAGE }) });
    }
    if (url.match(/\/communities(\?|$)/)) {
      return route.fulfill({ status: 200, contentType: "application/json",
        body: JSON.stringify({ data: { communities: [FIXTURE_COMMUNITY_WANDERING_VILLAGE] } }) });
    }

    // ── Domain cards catalog (legacy) ────────────────────────────────────
    if (url.includes("/domain-cards")) {
      return route.fulfill({ status: 200, contentType: "application/json",
        body: JSON.stringify({ data: FIXTURE_DOMAIN_CARDS }) });
    }

    // Default: empty success
    return route.fulfill({ status: 200, contentType: "application/json",
      body: JSON.stringify({ data: null }) });
  });

  // Block real Cognito / AWS auth calls (but NOT the execute-api URL — that's our mock above)
  await context.route(/(cognito-idp\.amazonaws\.com|cognito\.amazonaws\.com|auth\.curses\.show|cognito-idp)/, (route) =>
    route.abort()
  );

  // Block WebSocket upgrade requests (no real server)
  await context.route(/wss?:\/\//, (route) => route.abort());
}

/**
 * Seed sessionStorage with a fake auth state so Zustand boots as authenticated.
 * Must be called via context.addInitScript BEFORE the page navigates.
 *
 * Strategy:
 * 1. Seed the Zustand persist key ("daggerheart-auth") so the store hydrates
 *    with isAuthenticated: true, isReady: true on first render.
 *
 * 2. Seed the federated session keys ("dh_federated_id_token" + expiry) so
 *    that when authStore.initialize() runs it hits the `getFederatedIdToken()`
 *    branch first, finds a valid non-expired token, and returns immediately
 *    after calling /users/me — which is mocked to return the fixture profile.
 *    This prevents the Cognito SRP/refresh code path from running and
 *    overwriting isAuthenticated with false.
 */
function seedAuthScript() {
  return () => {
    try {
      const FAKE_TOKEN = "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.fixture-token";
      // Far-future expiry: year 2099 in seconds
      const FAR_FUTURE = Math.floor(new Date("2099-01-01").getTime() / 1000);

      // ── 1. Zustand persist state ───────────────────────────────────────────
      const authState = {
        state: {
          user: {
            userId:      "user-fixture-001",
            email:       "gm@curses.show",
            username:    "ManInJumpsuit",
            displayName: "ManInJumpsuit",
            tier:        "gm",
            avatarUrl:   null,
            preferences: {},
            patreon:     null,
            createdAt:   "2025-10-01T00:00:00Z",
            updatedAt:   "2025-10-01T00:00:00Z",
          },
          idToken:         FAKE_TOKEN,
          isAuthenticated: true,
          isReady:         true,
        },
        version: 0,
      };
      sessionStorage.setItem("daggerheart-auth", JSON.stringify(authState));

      // ── 2. Federated token keys (triggers the fast auth path in initialize) ─
      //    getFederatedIdToken() checks: token exists AND expiry > now.
      //    By seeding both we ensure initialize() returns early without
      //    ever touching the Cognito SRP / refreshTokens path.
      sessionStorage.setItem("dh_federated_id_token", FAKE_TOKEN);
      sessionStorage.setItem("dh_federated_expiry",   String(FAR_FUTURE));
    } catch (_) { /* ignore */ }
  };
}

// ─── Page helpers ─────────────────────────────────────────────────────────────

async function injectSuppressCSS(page) {
  await page.addStyleTag({ content: SUPPRESS_CSS });
}

/**
 * Hide the mobile dice log strip (fixed bottom bar, z-40) so it doesn't
 * intercept clicks on the party overview FAB behind it.
 * Only needed on mobile before clicking the party toggle.
 */
async function hideMobileDiceStrip(page) {
  await page.addStyleTag({ content: `
    div[aria-label="Dice roll log"].sm\\:hidden,
    div[aria-label="Dice roll log"][class*="sm:hidden"] {
      display: none !important;
    }
  `});
  await page.waitForTimeout(100);
}

/**
 * Hide the Party Overview toggle button (floating tab/FAB).
 * Call this AFTER any clicks on the toggle, since SUPPRESS_CSS must not hide it
 * before Playwright can interact with it.
 */
async function hidePartyToggle(page) {
  await page.addStyleTag({ content: `
    [aria-label="Open party overview"],
    [aria-label="Close party overview"] {
      display: none !important;
    }
  `});
}

/**
 * Open an app page URL, inject auth + CSS, wait for content to stabilise.
 */
async function openAppPage(page, url, { waitForSelector, timeout = 30_000 } = {}) {
  // Log browser console errors to help debug blank/wrong renders
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      console.warn(`  [browser error] ${msg.text()}`);
    } else if (msg.type() === "log" && msg.text().startsWith("[screenshot-debug]")) {
      console.log(`  [browser] ${msg.text()}`);
    }
  });

  await page.goto(url, { waitUntil: "load", timeout: 30_000 });
  // Give the app time to render after hydration (React + TanStack Query + lazy components)
  await page.waitForTimeout(2_500);

  // Emit auth/load state for diagnostics
  await page.evaluate(() => {
    try {
      const authRaw = sessionStorage.getItem("daggerheart-auth");
      const auth = authRaw ? JSON.parse(authRaw) : null;
      console.log(`[screenshot-debug] auth state: isAuth=${auth?.state?.isAuthenticated}, isReady=${auth?.state?.isReady}, hasToken=${!!auth?.state?.idToken}`);
      const fedToken = sessionStorage.getItem("dh_federated_id_token");
      console.log(`[screenshot-debug] fed token present: ${!!fedToken}`);
      // Check document for loading spinner vs real content
      const spinner = document.querySelector('.animate-spin');
      const tablist = document.querySelector('[role="tablist"]');
      console.log(`[screenshot-debug] spinner=${!!spinner}, tablist=${!!tablist}, bodyText=${document.body.innerText.slice(0, 100)}`);
    } catch(e) { console.log(`[screenshot-debug] eval error: ${e.message}`); }
  });

  // Log page title and URL after navigation for diagnostics
  const title = await page.title();
  const actualUrl = page.url();
  console.log(`  [nav] ${actualUrl}  (title: "${title}")`);

  await injectSuppressCSS(page);

  if (waitForSelector) {
    try {
      await page.waitForSelector(waitForSelector, { timeout: Math.min(timeout, 5_000), state: "visible" });
    } catch {
      // Not critical — content may still be present
    }
  }

  // Ensure we're at the top of the page for above-the-fold marketing shots
  await page.evaluate(() => window.scrollTo(0, 0));

  await injectSuppressCSS(page);
  await page.waitForTimeout(400);
}

/**
 * Take a viewport-only screenshot (above-the-fold marketing shot).
 * Marketing screenshots should show the hero view — NOT scroll the entire page.
 */
async function screenshotViewport(page, outFile) {
  await page.screenshot({ path: outFile, fullPage: false });
  console.log(`  ✓  ${path.basename(outFile)}`);
}

/**
 * Screenshot a specific CSS selector.
 */
async function screenshotSelector(page, selector, outFile, { padding = 0 } = {}) {
  const el = page.locator(selector).first();
  const count = await el.count();
  if (count === 0) {
    console.warn(`  ⚠  Selector not found: ${selector} — falling back to viewport`);
    await screenshotViewport(page, outFile);
    return;
  }
  await el.scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  await injectSuppressCSS(page);

  if (padding > 0) {
    const box = await el.boundingBox();
    if (box) {
      const vp = page.viewportSize();
      const x  = Math.max(0, box.x - padding);
      const y  = Math.max(0, box.y - padding);
      await page.screenshot({
        path:     outFile,
        clip: { x, y, width: Math.min(vp.width - x, box.width + padding * 2), height: box.height + padding * 2 },
        fullPage: false,
      });
      console.log(`  ✓  ${path.basename(outFile)}`);
      return;
    }
  }

  await el.screenshot({ path: outFile });
  console.log(`  ✓  ${path.basename(outFile)}`);
}

/**
 * Screenshot between two y positions (useful for mid-page panels).
 */
async function screenshotRegion(page, outFile, { yStart = 0, height } = {}) {
  const vp = page.viewportSize();
  const h  = height ?? vp.height;
  window.scrollTo?.(0, yStart);
  await page.waitForTimeout(200);
  await page.screenshot({
    path:     outFile,
    clip: { x: 0, y: yStart, width: vp.width, height: h },
    fullPage: false,
  });
  console.log(`  ✓  ${path.basename(outFile)}`);
}

// ─── Individual screenshot capture functions ──────────────────────────────────
// Each function is responsible for exactly one output file.
// They share a browser context that already has auth seeded + API mocked.

// ── home--campaign-command-center ────────────────────────────────────────────
//   Show: the GM Command Center tab content (party vitals, fear tracker)
//   Route: /campaigns/<id> (default tab = command)
//   Focus: #tabpanel-command panel
async function captureHomeCampaignCommandCenter(context, suffix) {
  const page = await context.newPage();
  try {
    const url = `${BASE_URL}/campaigns/__placeholder__/`;
    await openAppPage(page, url, { waitForSelector: "#tabpanel-command" });
    await page.keyboard.press("Escape");
    await hidePartyToggle(page);
    await injectSuppressCSS(page);

    const outFile = path.join(OUT_DIR, `home--campaign-command-center-${suffix}.png`);
    await screenshotSelector(page, "#tabpanel-command", outFile, { padding: 16 });
  } finally {
    await page.close();
  }
}

// ── streaming--live-character-cards ──────────────────────────────────────────
//   Show: the Twitch overlay widget at 380×220 (transparent bg)
//   Route: /twitch-overlay?id=<charId>&token=<token>
async function captureStreamingLiveCharacterCards(context, suffix) {
  const page = await context.newPage();
  try {
    const url = `${BASE_URL}/twitch-overlay/?id=${FIXTURE.charId}&token=${FIXTURE.shareToken}`;
    await openAppPage(page, url, { waitForSelector: "[class*='overlay'], [class*='Overlay'], [class*='twitch']" });

    // Twitch overlay should fill the viewport — screenshot full page
    const outFile = path.join(OUT_DIR, `streaming--live-character-cards-${suffix}.png`);
    if (MOBILE) {
      // On mobile, clip to 350px height for a compact card preview
      const vp = page.viewportSize();
      await page.screenshot({ path: outFile, clip: { x: 0, y: 0, width: vp.width, height: 350 }, fullPage: false });
      console.log(`  ✓  ${path.basename(outFile)}`);
    } else {
      await screenshotViewport(page, outFile);
    }
  } finally {
    await page.close();
  }
}

// ── streaming--obs-dice-log-overlay ──────────────────────────────────────────
//   Show: the OBS dice log overlay (transparent bg, roll history list)
//   Route: /obs/dice-log
async function captureStreamingObsDiceLog(context, suffix) {
  const page = await context.newPage();
  try {
    const url = `${BASE_URL}/obs/dice-log/`;
    await openAppPage(page, url, {});

    // The OBS overlay uses BroadcastChannel to receive roll results.
    // Post each fixture entry as a ROLL_RESULT message.
    await page.evaluate((entries) => {
      try {
        const ch = new BroadcastChannel("dh-dice");
        for (const result of entries) {
          ch.postMessage({ type: "ROLL_RESULT", result });
        }
        ch.close();
      } catch (_) {}
    }, DICE_LOG_FIXTURE);

    await page.waitForTimeout(800);
    await injectSuppressCSS(page);

    const outFile = path.join(OUT_DIR, `streaming--obs-dice-log-overlay-${suffix}.png`);
    await screenshotViewport(page, outFile);
  } finally {
    await page.close();
  }
}

// ── streaming--public-character-sheets ───────────────────────────────────────
//   Show: the public share view of a character sheet (no login required)
//   Route: /character/__placeholder__/public?token=<token>
//   Note: dev server only pre-renders the __placeholder__ param; CloudFront
//   handles real IDs in production. The client reads the ID from pathname.
async function captureStreamingPublicCharacterSheets(context, suffix) {
  const page = await context.newPage();
  try {
    const url = `${BASE_URL}/character/__placeholder__/public/?token=${FIXTURE.shareToken}`;
    await openAppPage(page, url, { waitForSelector: "[class*='public-sheet'], [class*='PublicSheet'], h1, [class*='character-name']" });

    const outFile = path.join(OUT_DIR, `streaming--public-character-sheets-${suffix}.png`);
    await screenshotViewport(page, outFile);
  } finally {
    await page.close();
  }
}

// ── streaming--command-hud-streamers ─────────────────────────────────────────
//   Show: GM Command Center tab — party vitals dashboard with fear tracker
//   Route: /campaigns/<id> (defaults to command tab)
//   Focus: #tabpanel-command panel (no sidebar, no toggle)
async function captureStreamingCommandHud(context, suffix) {
  const page = await context.newPage();
  try {
    const url = `${BASE_URL}/campaigns/__placeholder__/`;
    await openAppPage(page, url, { waitForSelector: "#tabpanel-command" });
    await page.keyboard.press("Escape");
    await hidePartyToggle(page);
    await injectSuppressCSS(page);

    const outFile = path.join(OUT_DIR, `streaming--command-hud-streamers-${suffix}.png`);
    await screenshotSelector(page, "#tabpanel-command", outFile, { padding: 16 });
  } finally {
    await page.close();
  }
}

// ── campaigns--campaign-creation-party ───────────────────────────────────────
//   Show: Campaign roster sidebar with member cards + invite link
//   Route: /campaigns/<id>?tab=characters
//   Focus: [aria-label="Campaign roster"] sidebar element
async function captureCampaignCreationParty(context, suffix) {
  const page = await context.newPage();
  try {
    const url = `${BASE_URL}/campaigns/__placeholder__/?tab=characters`;
    await openAppPage(page, url, { waitForSelector: "main" });
    await page.keyboard.press("Escape");
    await hidePartyToggle(page);
    await injectSuppressCSS(page);

    const outFile = path.join(OUT_DIR, `campaigns--campaign-creation-party-${suffix}.png`);

    if (MOBILE) {
      // On mobile, the roster is in a drawer — just capture viewport
      await screenshotViewport(page, outFile);
    } else {
      // Desktop: capture the roster sidebar
      await screenshotSelector(page, '[aria-label="Campaign roster"]', outFile, { padding: 8 });
    }
  } finally {
    await page.close();
  }
}

// ── campaigns--encounter-designer ────────────────────────────────────────────
//   Show: Encounter designer console with staged adversaries + stat blocks
//   Route: /campaigns/<id>?tab=encounter
//   Focus: #tabpanel-encounter panel
async function captureCampaignEncounterDesigner(context, suffix) {
  const page = await context.newPage();
  try {
    const url = `${BASE_URL}/campaigns/__placeholder__/?tab=encounter`;
    await openAppPage(page, url, { waitForSelector: "#tabpanel-encounter" });
    await page.keyboard.press("Escape");

    // Seed the encounter store with a populated encounter + adversaries
    await page.evaluate((campaignId) => {
      const store = window.__encounterStore;
      if (!store) return;
      const now = new Date().toISOString();
      store.setState({
        encounter: {
          encounterId: "enc-screenshot-001",
          campaignId,
          name: "Ambush at the Bridge",
          status: "active",
          round: 3,
          activeEnvironmentId: "hb-burning-creep",
          createdAt: now,
          updatedAt: now,
          adversaries: [
            {
              instanceId: "inst-1", adversaryId: "hb-hospitaller-knight", name: "Hospitaller Knight", label: "A",
              difficulty: 14, hpMarked: 2, hpMax: 5, stressMarked: 1, stressMax: 3,
              damageThresholds: { major: 7, severe: 13 }, attackModifier: 3, attackRange: "Melee",
              attackDamage: "2d6+2 physical", features: [{ name: "Creep-Hardened", description: "Resistance to Creep-Touched." }],
              conditions: [], isDefeated: false, notes: "",
            },
            {
              instanceId: "inst-2", adversaryId: "hb-hospitaller-knight", name: "Hospitaller Knight", label: "B",
              difficulty: 14, hpMarked: 4, hpMax: 5, stressMarked: 0, stressMax: 3,
              damageThresholds: { major: 7, severe: 13 }, attackModifier: 3, attackRange: "Melee",
              attackDamage: "2d6+2 physical", features: [{ name: "Creep-Hardened", description: "Resistance to Creep-Touched." }],
              conditions: ["Frightened"], isDefeated: false, notes: "",
            },
            {
              instanceId: "inst-3", adversaryId: "hb-hospitaller-purger", name: "Hospitaller Purger", label: "A",
              difficulty: 15, hpMarked: 0, hpMax: 9, stressMarked: 1, stressMax: 3,
              damageThresholds: { major: 9, severe: 17 }, attackModifier: 4, attackRange: "Melee",
              attackDamage: "2d8+3 physical", features: [{ name: "Cleave", description: "Free attack on adjacent target after defeating an adversary." }],
              conditions: [], isDefeated: false, notes: "",
            },
            {
              instanceId: "inst-4", adversaryId: "hb-tender-patrol", name: "Tender on Patrol", label: "A",
              difficulty: 11, hpMarked: 3, hpMax: 3, stressMarked: 2, stressMax: 3,
              damageThresholds: { major: 5, severe: 10 }, attackModifier: 1, attackRange: "Melee",
              attackDamage: "1d8 physical", features: [{ name: "Salt the Ground", description: "Scatter salt to damage Creep creatures." }],
              conditions: [], isDefeated: true, notes: "",
            },
          ],
        },
        rollLog: [
          { instanceId: "inst-1", label: "Attack — Hospitaller Knight A", diceValues: [17], diceNotation: "1d20+3", modifier: 3, total: 20, isCritical: false, timestamp: new Date(Date.now() - 5000).toISOString() },
          { instanceId: "inst-3", label: "Damage — Hospitaller Purger A", diceValues: [6, 5], diceNotation: "2d8+3", modifier: 3, total: 14, isCritical: false, timestamp: new Date(Date.now() - 15000).toISOString() },
        ],
      });
    }, FIXTURE.campaignId);
    await page.waitForTimeout(500);

    await hidePartyToggle(page);
    await injectSuppressCSS(page);

    const outFile = path.join(OUT_DIR, `campaigns--encounter-designer-${suffix}.png`);
    await screenshotSelector(page, "#tabpanel-encounter", outFile, { padding: 16 });
  } finally {
    await page.close();
  }
}

// ── campaigns--session-logging ────────────────────────────────────────────────
//   Show: Dice roll log showing broadcast session history
//   Route: /campaigns/<id> (command tab with dice log expanded)
//   Focus: [aria-label="Dice roll log"] panel
async function captureCampaignSessionLogging(context, suffix) {
  const page = await context.newPage();
  try {
    const url = `${BASE_URL}/campaigns/__placeholder__/`;
    await openAppPage(page, url, { waitForSelector: "main" });
    await page.keyboard.press("Escape");

    // Seed dice log via the exposed Zustand store on window
    await page.evaluate((entries) => {
      if (window.__diceStore) {
        window.__diceStore.setState({ log: entries, lastResult: entries[0] });
      }
    }, DICE_LOG_FIXTURE);
    await page.waitForTimeout(300);

    // Try to expand the dice log panel
    // Desktop: "Open dice log" is in DesktopDiceLog (hidden on mobile via sm:block wrapper)
    // Mobile: "Expand dice log" is in MobileDiceStrip (hidden on desktop via sm:hidden)
    if (MOBILE) {
      const mobileDiceToggle = page.locator('[aria-label="Expand dice log"]').first();
      if (await mobileDiceToggle.count() > 0 && await mobileDiceToggle.isVisible()) {
        await mobileDiceToggle.click();
        await page.waitForTimeout(500);
      }
    } else {
      const diceToggle = page.locator('[aria-label="Open dice log"]').first();
      if (await diceToggle.count() > 0 && await diceToggle.isVisible()) {
        await diceToggle.click();
        await page.waitForTimeout(500);
      }
    }

    await hidePartyToggle(page);
    await injectSuppressCSS(page);

    const outFile = path.join(OUT_DIR, `campaigns--session-logging-${suffix}.png`);
    // On mobile, dice log is the first [aria-label="Dice roll log"]; on desktop it's the second
    const diceLog = page.locator('[aria-label="Dice roll log"]').first();
    if (await diceLog.count() > 0 && await diceLog.isVisible()) {
      await diceLog.screenshot({ path: outFile });
      console.log(`  ✓  ${path.basename(outFile)}`);
    } else {
      // Fallback: viewport
      await screenshotViewport(page, outFile);
    }
  } finally {
    await page.close();
  }
}

// ── campaigns--gm-command-hud ─────────────────────────────────────────────────
//   Show: GM Command HUD — party overview sidebar with per-player danger tiles
//   Route: /campaigns/<id> (command tab default)
//   Focus: Party Overview sidebar with danger-state color-coded tiles
async function captureCampaignGmCommandHud(context, suffix) {
  const page = await context.newPage();
  try {
    const url = `${BASE_URL}/campaigns/__placeholder__/`;
    await openAppPage(page, url, { waitForSelector: "main" });
    await page.keyboard.press("Escape");

    // On mobile, the dice log strip (z-40) overlaps the party toggle FAB — hide it first
    if (MOBILE) await hideMobileDiceStrip(page);

    // Open the Party Overview sidebar to show per-player vitals
    // Desktop toggle: hidden sm:flex (first in DOM) — visible on desktop only
    // Mobile FAB: sm:hidden (second in DOM) — visible on mobile only
    const toggleIndex = MOBILE ? 1 : 0;
    const toggle = page.locator('[aria-label="Open party overview"]').nth(toggleIndex);
    if (await toggle.count() > 0 && await toggle.isVisible()) {
      await toggle.click();
      await page.waitForTimeout(500);
    }

    await hidePartyToggle(page);
    await injectSuppressCSS(page);

    const outFile = path.join(OUT_DIR, `campaigns--gm-command-hud-${suffix}.png`);
    // Target the desktop sidebar panel (index 1) or mobile bottom sheet (index 0)
    const sidebar = page.locator('[aria-label="Party Overview"]').nth(MOBILE ? 0 : 1);
    if (await sidebar.count() > 0 && await sidebar.isVisible()) {
      await sidebar.screenshot({ path: outFile });
      console.log(`  ✓  ${path.basename(outFile)}`);
    } else {
      await screenshotViewport(page, outFile);
    }
  } finally {
    await page.close();
  }
}

// ── campaigns--realtime-websocket ─────────────────────────────────────────────
//   Show: Adversary catalog — browsable bestiary with type/tier/difficulty
//   Route: /campaigns/<id>?tab=adversaries
//   Focus: #tabpanel-adversaries panel
async function captureCampaignRealtimeWebSocket(context, suffix) {
  const page = await context.newPage();
  try {
    const url = `${BASE_URL}/campaigns/__placeholder__/?tab=adversaries`;
    await openAppPage(page, url, { waitForSelector: "#tabpanel-adversaries" });
    await page.keyboard.press("Escape");
    await hidePartyToggle(page);
    await injectSuppressCSS(page);

    const outFile = path.join(OUT_DIR, `campaigns--realtime-websocket-${suffix}.png`);
    await screenshotSelector(page, "#tabpanel-adversaries", outFile, { padding: 16 });
  } finally {
    await page.close();
  }
}

// ── campaigns--homebrew-workshop ──────────────────────────────────────────────
//   Show: Homebrew creation form with live markdown preview
//   Route: /homebrew/class/new
async function captureCampaignHomebrewWorkshop(context, suffix) {
  const page = await context.newPage();
  try {
    const url = `${BASE_URL}/homebrew/class/new/`;
    await openAppPage(page, url, { waitForSelector: "main, form, [class*='homebrew']" });
    await page.keyboard.press("Escape");
    await injectSuppressCSS(page);

    const outFile = path.join(OUT_DIR, `campaigns--homebrew-workshop-${suffix}.png`);
    await screenshotViewport(page, outFile);
  } finally {
    await page.close();
  }
}

// ── new-players--srd-inline-learning ─────────────────────────────────────────
//   Show: Character sheet domain loadout with an expanded card detail panel
//   Route: /character/__placeholder__
//   Focus: Domain loadout section with the card drill-down sidebar open
async function captureNewPlayersSrdInlineLearning(context, suffix) {
  const page = await context.newPage();
  try {
    const url = `${BASE_URL}/character/__placeholder__/`;
    // Don't wait for loadout selector in openAppPage — it's below the fold
    await openAppPage(page, url, { waitForSelector: "main" });

    // Wait for the FeaturesPanel to render (depends on /classes/sorcerer mock)
    await page.waitForTimeout(1500);

    // Scroll down progressively to trigger lazy rendering of the loadout section
    for (let i = 0; i < 8; i++) {
      await page.evaluate((step) => window.scrollBy(0, 600), i);
      await page.waitForTimeout(400);
    }

    // Now check for the loadout selector
    const loadout = page.locator('[data-field-key="loadout.domains"]').first();
    try {
      await loadout.waitFor({ state: "attached", timeout: 5000 });
    } catch {
      console.warn("  ⚠  loadout.domains not found after scrolling — trying full scroll");
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(1000);
    }

    // Scroll to the domain loadout section so it's visible
    if (await loadout.count() > 0) {
      await loadout.scrollIntoViewIfNeeded();
      await page.waitForTimeout(300);
    }

    // Click "View details for …" on the first domain card to open the drill panel
    const detailBtn = page.locator('[aria-label^="View details for"]').first();
    if (await detailBtn.count() > 0) {
      await detailBtn.click();
      await page.waitForTimeout(500);
    }

    await injectSuppressCSS(page);

    const outFile = path.join(OUT_DIR, `new-players--srd-inline-learning-${suffix}.png`);
    // Screenshot the loadout section (cards + open detail panel provides context)
    await screenshotSelector(page, '[data-field-key="loadout.domains"]', outFile, { padding: 16 });
  } finally {
    await page.close();
  }
}

// ── new-players--gm-teaching-tools ───────────────────────────────────────────
//   Show: GM ping context menu on a character sheet field (teaching tool)
//   Route: /character/__placeholder__ (GM view)
//   Focus: Character sheet with the SheetContextMenu visible after right-click
async function captureNewPlayersGmTeachingTools(context, suffix) {
  const page = await context.newPage();
  try {
    const url = `${BASE_URL}/character/__placeholder__/`;
    await openAppPage(page, url, { waitForSelector: "main" });
    await page.waitForTimeout(1500);
    await page.keyboard.press("Escape");

    // Find a pingable field to right-click (e.g. HP tracker or any data-field-key)
    const targets = [
      '[data-field-key="trackers.hp"]',
      '[data-field-key="stats"]',
      '[data-field-key="header.name"]',
      '[data-field-key]',
    ];
    let clicked = false;
    for (const sel of targets) {
      const el = page.locator(sel).first();
      if (await el.count() > 0 && await el.isVisible()) {
        await el.scrollIntoViewIfNeeded();
        await page.waitForTimeout(300);
        await el.click({ button: "right" });
        clicked = true;
        break;
      }
    }

    if (clicked) {
      await page.waitForTimeout(500);
    }

    // Inject minimal CSS — avoid hiding the context menu (which may match role="dialog")
    await page.addStyleTag({ content: `
      nav[aria-label]:not([aria-label="Campaign tabs"]) { display: none !important; }
      header, footer, [data-marketing-nav] { display: none !important; }
      button[aria-pressed][title*="Force"], button[aria-pressed][title*="force"] { display: none !important; }
    `});

    const outFile = path.join(OUT_DIR, `new-players--gm-teaching-tools-${suffix}.png`);
    await screenshotViewport(page, outFile);
  } finally {
    await page.close();
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

(async () => {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  console.log(`\n🎬  Marketing Screenshot Tool — App Screen Capture`);
  console.log(`    Viewport : ${VIEWPORT.width}×${VIEWPORT.height} (${VIEWPORT_SUFFIX})`);
  console.log(`    Base URL : ${BASE_URL}`);
  console.log(`    Output   : ${OUT_DIR}`);
  console.log(`    Jobs     : 13\n`);

  let failCount = 0;
  let browser;

  try {
    browser = await chromium.launch({
      headless: true,
      args: [
        "--disable-web-security",
        "--font-render-hinting=none",
        "--force-device-scale-factor=2",
        "--disable-features=TranslateUI",
        "--disable-extensions",
      ],
    });

    // Create a single context with auth seeded and API mocked
    const context = await browser.newContext({
      viewport:          VIEWPORT,
      deviceScaleFactor: 2,
      ignoreHTTPSErrors: true,
    });

    // Seed auth before any page loads
    await context.addInitScript(seedAuthScript());

    // Mock all API routes
    await mockApiRoutes(context);

    const s = VIEWPORT_SUFFIX;

    const JOBS = [
      ["Home → Campaign Command Center",        () => captureHomeCampaignCommandCenter(context, s)],
      ["Streaming → Live Character Cards",       () => captureStreamingLiveCharacterCards(context, s)],
      ["Streaming → OBS Dice Log Overlay",       () => captureStreamingObsDiceLog(context, s)],
      ["Streaming → Public Character Sheets",    () => captureStreamingPublicCharacterSheets(context, s)],
      ["Streaming → Command HUD for Streamers",  () => captureStreamingCommandHud(context, s)],
      ["Campaigns → Campaign Creation & Party",  () => captureCampaignCreationParty(context, s)],
      ["Campaigns → Encounter Designer",         () => captureCampaignEncounterDesigner(context, s)],
      ["Campaigns → Session Logging",            () => captureCampaignSessionLogging(context, s)],
      ["Campaigns → GM Command HUD",             () => captureCampaignGmCommandHud(context, s)],
      ["Campaigns → Real-Time WebSocket",        () => captureCampaignRealtimeWebSocket(context, s)],
      ["Campaigns → Homebrew Workshop",          () => captureCampaignHomebrewWorkshop(context, s)],
      ["New Players → SRD Inline Learning",      () => captureNewPlayersSrdInlineLearning(context, s)],
      ["New Players → GM Teaching Tools",        () => captureNewPlayersGmTeachingTools(context, s)],
    ];

    for (const [label, fn] of JOBS) {
      console.log(`\n→ ${label}`);
      try {
        await fn();
      } catch (err) {
        console.error(`  ✗  ${err.message}`);
        failCount++;
      }
    }

    await context.close();
  } finally {
    await browser?.close();
  }

  console.log(`\n${"─".repeat(60)}`);
  if (failCount === 0) {
    console.log(`\n✅  All 13 screenshots complete.`);
    console.log(`   Output → ${OUT_DIR}\n`);
  } else {
    console.log(`\n⚠️  ${failCount} screenshot(s) failed. See output above.\n`);
    process.exit(1);
  }
})();
