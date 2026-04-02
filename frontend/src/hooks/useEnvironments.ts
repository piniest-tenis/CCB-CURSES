"use client";

/**
 * src/hooks/useEnvironments.ts
 *
 * Manages the environment catalog.
 * Currently backed by a Zustand store with seed data from
 * markdown/Environments/ — will migrate to TanStack Query + backend API
 * when environment CRUD endpoints exist.
 */

import { useCallback, useMemo } from "react";
import { create } from "zustand";
import type { Environment } from "@/types/adversary";

// ─── Seed Data ────────────────────────────────────────────────────────────────
// Imported from markdown/Environments/

const SEED_ENVIRONMENTS: Environment[] = [
  {
    environmentId: "hb-burning-creep",
    name: "Burning Creep",
    tier: 1,
    type: "Hazard",
    description:
      "Something here has lit the Creep on fire. The thick black acrid smoke is damaging to the lungs, and prolonged exposure may lead to onset of Creep sickness. The agitated Creep has led to a greater chance of encountering enraged Etherotaxia.",
    tone: ["Violent", "Mournful"],
    difficulty: 10,
    features: [
      {
        name: "Thick Smoke",
        description:
          "While in Burning Creep, players must make an Instinct roll (DC 10) to travel more than Close Range.",
        flavorText:
          "The thick black smoke obscures everything beyond a distance, making navigation impossible.",
        isPassive: true,
        rollSpec: {
          label: "Instinct — Navigate Thick Smoke",
          type: "action",
          dice: [
            { size: "d12", role: "hope",  label: "Hope" },
            { size: "d12", role: "fear",  label: "Fear" },
          ],
          difficulty: 10,
        },
      },
      {
        name: "Toxic Smoke",
        description:
          "While in Burning Creep, players take d6 magical damage before they make any action roll. This cannot be reduced by Armor.",
        flavorText:
          "The toxic fumes burn and scar tissues and the acidic accretions etch even hard carapaces. Staying too long is a dangerous proposition for all but the most hardy creatures.",
        isPassive: true,
      },
      {
        name: "Etherotaxic Defender",
        description:
          "Once per scene, spend 2 Fear to summon an enraged Creep-Bound Etherotaxic creature appropriate to the party's tier.",
        flavorText:
          "Disturbing the piles of matted, burning Creep can cause trapped Etherotaxia to spring free in an angered and panicked state.",
        isPassive: false,
        fearCost: 2,
      },
    ],
    potentialAdversaryNames: [
      "Madanikuputukas (Swarm)",
      "Kuputuka",
      "Creep-Bound Etherotaxic Entity (Lesser)",
      "Creep-Bound Etherotaxic Entity (Greater)",
    ],
    source: "homebrew",
    createdAt: "2026-03-29T00:00:00Z",
    updatedAt: "2026-03-29T00:00:00Z",
  },
  {
    environmentId: "hb-creep-infestation",
    name: "Creep Infestation",
    tier: 1,
    type: "Hazard",
    description:
      "The gnarled dark undergrowth of Forestdown has spread itself into this area, and it carries with it all the dangers of its progenitor.",
    tone: ["Otherworldly", "Psychedelic", "Quietly Threatening"],
    difficulty: 12,
    features: [
      {
        name: "Distortion Field",
        description:
          "While in a Creep Infestation, players must make a Presence roll (DC 13) or move further into the Creep.",
        flavorText:
          "Rescued children reported that they were walking out of the woods for hours, despite wandering the whole time ever deeper into Forestdown.",
        isPassive: true,
        rollSpec: {
          label: "Presence — Resist Distortion Field",
          type: "action",
          dice: [
            { size: "d12", role: "hope",  label: "Hope" },
            { size: "d12", role: "fear",  label: "Fear" },
          ],
          difficulty: 13,
        },
      },
      {
        name: "Ethereal Presence",
        description:
          "While in a Creep Infestation, players are unnaturally calm. For every two actions taken in the Creep, they clear 1 Stress.",
        flavorText:
          "The deeper the wanderers were found, the more at peace they seemed with their surroundings despite the horrible changes inflicted upon them.",
        isPassive: true,
      },
      {
        name: "Transformative Stab",
        description:
          "Spend a Fear. A target that has cleared 2 Stress while in a Creep Infestation must make a Presence roll (DC 15) or take 2d6 magical damage and gain a permanent alteration to their body.",
        flavorText:
          "Only after we'd burned out most of the incursion did we find Commander Orillee. Or, what we assumed was her. It wore her uniform, but the carcass resembled no living thing any of the Hospitallers present had ever seen.",
        isPassive: false,
        fearCost: 1,
        rollSpec: {
          label: "Presence — Resist Transformative Stab",
          type: "action",
          dice: [
            { size: "d12", role: "hope",  label: "Hope" },
            { size: "d12", role: "fear",  label: "Fear" },
          ],
          difficulty: 15,
        },
      },
    ],
    potentialAdversaryNames: [
      "Madanikuputukas (Swarm)",
      "Kuputuka",
    ],
    source: "homebrew",
    createdAt: "2026-03-29T00:00:00Z",
    updatedAt: "2026-03-29T00:00:00Z",
  },

  // ── The Mess Hall ─────────────────────────────────────────────────────────
  {
    environmentId: "hb-the-mess-hall",
    name: "The Mess Hall",
    tier: 1,
    type: "Social",
    description:
      "The central hall of Eskikale Keep where the four orders of the Hygiane Order take their meals together. In theory, it is a place of unity. In practice, the long stone tables are divided by invisible but absolute lines of allegiance.",
    tone: ["Tense", "Cliquish", "Passively Hostile"],
    difficulty: 11,
    features: [
      {
        name: "Pecking Order",
        description:
          "Any PC who does not belong to one of the four orders has Disadvantage on Presence rolls made to persuade, command, or impress members of the Hygiane Order while in the Mess Hall. A PC who has been formally inducted into an order loses this Disadvantage when interacting with members of their own order only.",
        flavorText:
          "You don't sit there. You don't talk to them. You certainly don't ask them for anything. Not until you've earned it.",
        isPassive: true,
      },
      {
        name: "Clique Loyalty",
        description:
          "Successfully gaining the trust or assistance of a member of one order (Presence Roll 11) causes members of a rival order to become Hostile toward the PCs for the remainder of the scene. The rivalries are: Hospitallers oppose Etherements; Medicaments oppose Tenders.",
        flavorText:
          "You're eating with the bone-readers now? Well. I suppose we know where your loyalties lie.",
        isPassive: true,
        rollSpec: {
          label: "Presence — Gain Trust",
          type: "action",
          dice: [
            { size: "d12", role: "hope", label: "Hope" },
            { size: "d12", role: "fear", label: "Fear" },
          ],
          difficulty: 11,
        },
      },
      {
        name: "Old Soldiers' Pride",
        description:
          "A Hospitaller veteran loudly challenges a PC's competence or right to be in the Keep. The targeted PC must make a Presence Roll (12) or mark a Stress. On a success, the PC earns grudging respect from the Hospitallers present.",
        flavorText:
          "Another batch of green recruits. Tell me, have any of you even seen the treeline?",
        isPassive: false,
        rollSpec: {
          label: "Presence — Endure Challenge",
          type: "reaction",
          dice: [
            { size: "d12", role: "hope", label: "Hope" },
            { size: "d12", role: "fear", label: "Fear" },
          ],
          difficulty: 12,
        },
      },
      {
        name: "Loose Tongues",
        description:
          "Spend a Fear. A Medicament, deep in the effects of prolonged Lanmaoa exposure, lets slip a dangerous secret — something about the Etherements' experiments, or the Grandmarshal's condition, or the declining tribute from the Varjalune Republic. The information is valuable but fragmentary, and the Medicament denies everything if confronted later.",
        flavorText:
          "The mushrooms tell me things, you know. They told me what Oramora keeps in those jars. They told me what it said to him.",
        isPassive: false,
        fearCost: 1,
      },
    ],
    potentialAdversaryNames: [
      "Frightened Villagers",
    ],
    source: "homebrew",
    createdAt: "2026-04-02T00:00:00Z",
    updatedAt: "2026-04-02T00:00:00Z",
  },

  // ── The Market ────────────────────────────────────────────────────────────
  {
    environmentId: "hb-the-market",
    name: "The Market",
    tier: 1,
    type: "Social",
    description:
      "A sprawling, semi-permanent market crowded along the outer walls of the Eskikale Keep gatehouse. Traders from Reveille hawk Carnithian goods alongside local vendors. Beneath the legitimate commerce, a somewhat-tolerated black market operates in plain sight.",
    tone: ["Bustling", "Opportunistic", "Underhanded"],
    difficulty: 11,
    features: [
      {
        name: "Open Trade",
        description:
          "PCs can purchase common supplies and equipment at standard prices. Unique or rare items require a Presence Roll (11) to locate a willing seller. On a failure, the item is available but at double cost.",
        flavorText:
          "Everything you need is here, friend. Everything you want costs extra.",
        isPassive: true,
        rollSpec: {
          label: "Presence — Find Rare Goods",
          type: "action",
          dice: [
            { size: "d12", role: "hope", label: "Hope" },
            { size: "d12", role: "fear", label: "Fear" },
          ],
          difficulty: 11,
        },
      },
      {
        name: "Black Market",
        description:
          "A PC seeking illicit, rare, or restricted goods must make a Presence Roll (13). On a success, they find what they need but attract the attention of one of the market's power brokers, who will expect a favor in return. On a failure, they are noticed by a member of the Hygiane Order and must explain themselves.",
        flavorText:
          "You didn't get that from me. In fact, you've never seen me. In fact, I was never here. Are we clear?",
        isPassive: false,
        rollSpec: {
          label: "Presence — Black Market Contact",
          type: "action",
          dice: [
            { size: "d12", role: "hope", label: "Hope" },
            { size: "d12", role: "fear", label: "Fear" },
          ],
          difficulty: 13,
        },
      },
      {
        name: "Pickpocket's Paradise",
        description:
          "When a PC rolls with Fear while in the Market, a thief lifts a small item from them. The PC may make an Instinct Roll (12) to notice the theft immediately. Otherwise, they discover the loss at a dramatically inconvenient moment.",
        flavorText:
          "The crowd presses in, and for a moment you feel a hand brush past you. Just the crowd. Probably.",
        isPassive: false,
        rollSpec: {
          label: "Instinct — Notice Pickpocket",
          type: "reaction",
          dice: [
            { size: "d12", role: "hope", label: "Hope" },
            { size: "d12", role: "fear", label: "Fear" },
          ],
          difficulty: 12,
        },
      },
      {
        name: "Rumor Mill",
        description:
          "Spend a Fear. A merchant or local shares a rumor — partially true, partially embellished. The PC must make a Knowledge Roll (11) to separate truth from embellishment.",
        flavorText:
          "My cousin's husband's sister works the north tower laundry. She says the Etherements haven't sent out their linens in three weeks. Three weeks! What are they doing in there?",
        isPassive: false,
        fearCost: 1,
        rollSpec: {
          label: "Knowledge — Parse Rumor",
          type: "action",
          dice: [
            { size: "d12", role: "hope", label: "Hope" },
            { size: "d12", role: "fear", label: "Fear" },
          ],
          difficulty: 11,
        },
      },
    ],
    potentialAdversaryNames: [
      "Frightened Villagers",
      "Lanmaoa",
    ],
    source: "homebrew",
    createdAt: "2026-04-02T00:00:00Z",
    updatedAt: "2026-04-02T00:00:00Z",
  },

  // ── The Ergantine Lake ────────────────────────────────────────────────────
  {
    environmentId: "hb-the-ergantine-lake",
    name: "The Ergantine Lake",
    tier: 1,
    type: "Exploration",
    description:
      "The crystal clear waters of Ergantine Lake stretch out before you, deceptively calm. Beneath the surface, massive shapes drift in the deep — creatures transformed by decades of proximity to Forestdown's corruption.",
    tone: ["Eerie", "Wondrous", "Treacherous"],
    difficulty: 12,
    features: [
      {
        name: "Crystal Depths",
        description:
          "The water of Ergantine Lake is unnaturally clear. PCs gain Advantage on Instinct rolls to spot submerged creatures or objects within Close range. However, submerged creatures can see the PCs just as easily.",
        flavorText:
          "You can see all the way to the bottom. Every stone, every weed, every shadow. That's the problem. The shadows can see you too.",
        isPassive: true,
      },
      {
        name: "Creep Currents",
        description:
          "Dark tendrils of Creep drift through the water in unpredictable currents. A PC who enters the water must make an Agility Reaction Roll (11) each time they take an action while submerged or mark a Stress. A PC who marks 2 Stress this way gains the Creep-Touched condition.",
        flavorText:
          "The water itself feels wrong against your skin — not cold exactly, but aware.",
        isPassive: true,
        rollSpec: {
          label: "Agility — Resist Creep Currents",
          type: "reaction",
          dice: [
            { size: "d12", role: "hope", label: "Hope" },
            { size: "d12", role: "fear", label: "Fear" },
          ],
          difficulty: 11,
        },
      },
      {
        name: "Something Stirs Below",
        description:
          "Spend a Fear. A massive shape passes beneath the party's position. All PCs must make a Presence Reaction Roll (12) or become Frightened, gaining Disadvantage on their next action roll.",
        flavorText:
          "For a moment the light changes. Something vast moves beneath you, and then it is gone, and the water is still again, and no one speaks.",
        isPassive: false,
        fearCost: 1,
        rollSpec: {
          label: "Presence — Resist Fear",
          type: "reaction",
          dice: [
            { size: "d12", role: "hope", label: "Hope" },
            { size: "d12", role: "fear", label: "Fear" },
          ],
          difficulty: 12,
        },
      },
      {
        name: "Lakebed Discovery",
        description:
          "A PC who investigates the lakebed (Knowledge or Instinct Roll, 12) discovers something of interest — a sunken Teetle Cart, an ancient Sallidean Stone carving, or the remains of a previous expedition.",
        flavorText:
          "Beneath the sediment, your fingers close around something smooth and carved. It is older than the Keep.",
        isPassive: false,
        rollSpec: {
          label: "Knowledge — Investigate Lakebed",
          type: "action",
          dice: [
            { size: "d12", role: "hope", label: "Hope" },
            { size: "d12", role: "fear", label: "Fear" },
          ],
          difficulty: 12,
        },
      },
    ],
    potentialAdversaryNames: [
      "Skelkandi",
      "Quaddadura",
      "Creep-Touched Deaconfish",
      "Glowfry School",
    ],
    source: "homebrew",
    createdAt: "2026-04-02T00:00:00Z",
    updatedAt: "2026-04-02T00:00:00Z",
  },

  // ── Pogg's Court ──────────────────────────────────────────────────────────
  {
    environmentId: "hb-poggs-court",
    name: "Pogg's Court",
    tier: 2,
    type: "Social",
    description:
      "The Grandmarshal's audience chamber is a long, cold room at the heart of Eskikale Keep. Grandmarshal Pogg sits at the far end, attended by two manservants who never leave his side. An elaborate system of protocol has calcified around these interactions that no one remembers establishing.",
    tone: ["Surreal", "Oppressive", "Darkly Absurd"],
    difficulty: 14,
    features: [
      {
        name: "The Protocol",
        description:
          "PCs who violate one of the court's arcane rules (speaking out of turn, addressing the Grandmarshal directly, using forbidden words, presenting gifts incorrectly) must make a Presence Reaction Roll (14). On a failure, the audience is suspended. On a success, one correction is allowed. A second violation ends the audience regardless.",
        flavorText:
          "His Excellency is composing his thoughts. You will wait. You will not look at him while he composes. This is the third rule.",
        isPassive: true,
        rollSpec: {
          label: "Presence — Recover from Protocol Violation",
          type: "reaction",
          dice: [
            { size: "d12", role: "hope", label: "Hope" },
            { size: "d12", role: "fear", label: "Fear" },
          ],
          difficulty: 14,
        },
      },
      {
        name: "The Manservants",
        description:
          "The two manservants control all access to the Grandmarshal. Any attempt to bypass them or speak to Pogg directly requires a Presence Roll (15). On a success, Pogg responds with a moment of startling lucidity. On a failure, the manservants intervene and the PC marks a Stress.",
        flavorText:
          "The Grandmarshal has heard your petition and finds it... He says the lake is singing again. He means he will consider it. Please, just — let us handle this.",
        isPassive: true,
        rollSpec: {
          label: "Presence — Bypass Manservants",
          type: "action",
          dice: [
            { size: "d12", role: "hope", label: "Hope" },
            { size: "d12", role: "fear", label: "Fear" },
          ],
          difficulty: 15,
        },
      },
      {
        name: "Pogg's Lucidity",
        description:
          "Spend a Fear. The Grandmarshal has a moment of terrible clarity. He looks directly at a PC and speaks coherently about something he should not know. The moment passes, and the manservants rush to redirect the conversation, visibly shaken.",
        flavorText:
          "He looked at me. Right at me. And he said, 'It's already inside the walls.' Then he asked his manservant for more tea.",
        isPassive: false,
        fearCost: 1,
      },
      {
        name: "Exposure",
        description:
          "When a PC succeeds on a Knowledge or Instinct Roll (13) while in the audience chamber, they notice signs of the Grandmarshal's Creep exposure. The manservants notice the PC noticing and become Hostile for the remainder of the scene.",
        flavorText:
          "You see it now. The way his hand twitches. The pattern in the veins at his temple. It's not age. It's not illness. You've seen this before, at the edge of the treeline.",
        isPassive: false,
        rollSpec: {
          label: "Knowledge — Notice Creep Signs",
          type: "action",
          dice: [
            { size: "d12", role: "hope", label: "Hope" },
            { size: "d12", role: "fear", label: "Fear" },
          ],
          difficulty: 13,
        },
      },
    ],
    potentialAdversaryNames: [
      "Frightened Villagers",
    ],
    source: "homebrew",
    createdAt: "2026-04-02T00:00:00Z",
    updatedAt: "2026-04-02T00:00:00Z",
  },

  // ── The Proving Ground ────────────────────────────────────────────────────
  {
    environmentId: "hb-the-proving-ground",
    name: "The Proving Ground",
    tier: 1,
    type: "Event",
    description:
      "A reinforced chamber deep within the destroyed northern tower of Eskikale Keep, rebuilt by the Etherements for containment and study of captured Etherotaxia. Iron-banded doors seal from the outside. Today, the party has been locked inside with a specimen.",
    tone: ["Claustrophobic", "Tense", "Morally Ambiguous"],
    difficulty: 12,
    features: [
      {
        name: "Sealed Chamber",
        description:
          "The iron-banded doors are sealed from the outside and cannot be forced open. The Sallidean Stone wards prevent the entity from passing through the walls. Breaking the wards requires a Knowledge or Finesse Roll (14) and renders the containment permanently useless.",
        flavorText:
          "The door shuts behind you with a sound like a coffin lid. Through the observation slit, you see Oramora's single visible eye watching.",
        isPassive: true,
        rollSpec: {
          label: "Knowledge — Break Wards",
          type: "action",
          dice: [
            { size: "d12", role: "hope", label: "Hope" },
            { size: "d12", role: "fear", label: "Fear" },
          ],
          difficulty: 14,
        },
      },
      {
        name: "Observation",
        description:
          "The Etherements are watching through observation slits. Any PC action is being cataloged. If the PCs resolve the encounter socially rather than through combat, the Etherements' reaction is one of disturbed fascination rather than approval.",
        flavorText:
          "You feel the weight of eyes on you from every angle. They are not watching to help. They are watching to learn.",
        isPassive: true,
      },
      {
        name: "Escalating Containment",
        description:
          "Spend a Fear. The Etherements activate a Sallidean Stone ward from outside. All creatures in the chamber take 1d6+1 magical damage.",
        flavorText:
          "The wards flare. The entity screams — not with sound, but with something you feel behind your eyes. Oramora's voice comes through the slit: 'Interesting. Again.'",
        isPassive: false,
        fearCost: 1,
      },
      {
        name: "The Choice",
        description:
          "Spend a Fear. A PC notices a release lever near the door. Using it opens the chamber. The Etherements will attempt to re-seal (Agility Reaction Roll 12 to hold it open), and the consequences of releasing the entity into the Keep unfold from there.",
        flavorText:
          "There. Behind the grime on the wall. A handle. They built a way out, once. Before Oramora decided the experiments were more important than safety protocols.",
        isPassive: false,
        fearCost: 1,
        rollSpec: {
          label: "Agility — Hold Door Open",
          type: "reaction",
          dice: [
            { size: "d12", role: "hope", label: "Hope" },
            { size: "d12", role: "fear", label: "Fear" },
          ],
          difficulty: 12,
        },
      },
    ],
    potentialAdversaryNames: [
      "Captured Etherotaxic Entity",
    ],
    source: "homebrew",
    createdAt: "2026-04-02T00:00:00Z",
    updatedAt: "2026-04-02T00:00:00Z",
  },

  // ── The Patrol ────────────────────────────────────────────────────────────
  {
    environmentId: "hb-the-patrol",
    name: "The Patrol",
    tier: 1,
    type: "Event",
    description:
      "The edge of Forestdown is not a line on a map. It is a feeling. Your patrol route runs along this edge, a well-salted path that has held the boundary for decades. Today, the salt line is gone. In its place, a wall of new growth has erupted overnight. The Creep is blooming.",
    tone: ["Urgent", "Overwhelming", "Unprecedented"],
    difficulty: 12,
    features: [
      {
        name: "Spreading Corruption",
        description:
          "The Creep Bloom expands in real time, tracked as a Progress Countdown (8). Each GM Fear spend or GM turn without PC progress marks a segment. When complete, the Bloom threatens Gatehouse's outer settlements and the scene shifts from containment to retreat.",
        flavorText:
          "You can see it moving. The dark tendrils creep across the salted earth as though the salt were nothing. This has never happened before.",
        isPassive: true,
      },
      {
        name: "Toxic Ground",
        description:
          "Newly Bloomed ground is saturated with concentrated Creep. A PC who moves through it takes 1d4 magical damage. A PC who ends their turn on it must make an Agility Reaction Roll (11) or mark a Stress.",
        flavorText:
          "The ground is soft underfoot and it clings to your boots. Where you step, small things wriggle in the disturbed soil.",
        isPassive: true,
        rollSpec: {
          label: "Agility — Resist Toxic Ground",
          type: "reaction",
          dice: [
            { size: "d12", role: "hope", label: "Hope" },
            { size: "d12", role: "fear", label: "Fear" },
          ],
          difficulty: 11,
        },
      },
      {
        name: "Call for Backup",
        description:
          "A PC can send a runner to Gatehouse for a Medicament burn team. Requires a Presence Roll (12). Reinforcements arrive when the Spreading Corruption countdown reaches 6.",
        flavorText:
          "Someone has to go. Someone has to tell them. But that means leaving the rest of us here with... this.",
        isPassive: false,
        rollSpec: {
          label: "Presence — Send Runner",
          type: "action",
          dice: [
            { size: "d12", role: "hope", label: "Hope" },
            { size: "d12", role: "fear", label: "Fear" },
          ],
          difficulty: 12,
        },
      },
      {
        name: "Creep Bloom Surge",
        description:
          "Spend 2 Fear. The Bloom accelerates violently. All PCs must make an Agility Reaction Roll (12) or be knocked prone and take 1d8+2 magical damage. Mark two segments on the Spreading Corruption countdown.",
        flavorText:
          "The earth splits open and the forest roars forward. It is not an attack. It is not malice. It is growth — mindless, unstoppable, hungry growth.",
        isPassive: false,
        fearCost: 2,
        rollSpec: {
          label: "Agility — Dodge Bloom Surge",
          type: "reaction",
          dice: [
            { size: "d12", role: "hope", label: "Hope" },
            { size: "d12", role: "fear", label: "Fear" },
          ],
          difficulty: 12,
        },
      },
    ],
    potentialAdversaryNames: [
      "Bloom Tendrils",
      "Bloom Heart",
      "Madanikuputukas (Swarm)",
      "Creep-Bound Etherotaxic Entity (Lesser)",
    ],
    source: "homebrew",
    createdAt: "2026-04-02T00:00:00Z",
    updatedAt: "2026-04-02T00:00:00Z",
  },
];

// ─── Environment Catalog Store ────────────────────────────────────────────────

interface EnvironmentCatalogState {
  environments: Environment[];
  add: (data: Omit<Environment, "environmentId" | "createdAt" | "updatedAt">) => void;
  update: (environmentId: string, data: Partial<Environment>) => void;
  remove: (environmentId: string) => void;
}

function nanoid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

const useEnvironmentCatalogStore = create<EnvironmentCatalogState>((set) => ({
  environments: SEED_ENVIRONMENTS,

  add: (data) => {
    const now = new Date().toISOString();
    const env: Environment = {
      ...data,
      environmentId: nanoid(),
      createdAt: now,
      updatedAt: now,
    };
    set((state) => ({
      environments: [...state.environments, env],
    }));
  },

  update: (environmentId, data) => {
    set((state) => ({
      environments: state.environments.map((e) =>
        e.environmentId === environmentId
          ? { ...e, ...data, updatedAt: new Date().toISOString() }
          : e
      ),
    }));
  },

  remove: (environmentId) => {
    set((state) => ({
      environments: state.environments.filter(
        (e) => e.environmentId !== environmentId
      ),
    }));
  },
}));

// ─── Public Hook ──────────────────────────────────────────────────────────────

export function useEnvironments() {
  const { environments, add, update, remove } = useEnvironmentCatalogStore();

  const addEnvironment = useCallback(
    (data: Omit<Environment, "environmentId" | "createdAt" | "updatedAt">) => {
      add(data);
    },
    [add]
  );

  const updateEnvironment = useCallback(
    (environmentId: string, data: Partial<Environment>) => {
      update(environmentId, data);
    },
    [update]
  );

  const deleteEnvironment = useCallback(
    (environmentId: string) => {
      remove(environmentId);
    },
    [remove]
  );

  return {
    environments,
    isLoading: false,
    addEnvironment,
    updateEnvironment,
    deleteEnvironment,
  };
}
