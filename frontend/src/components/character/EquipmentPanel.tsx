"use client";

/**
 * src/components/character/EquipmentPanel.tsx
 *
 * Renders:
 * - Gold tracker (Handfuls / Bags / Chests) — slot trackers matching HP/Stress
 *   pattern. Rollover: 10 handfuls → 1 bag; 10 bags → 1 chest (SRD).
 * - Current inventory list (character.inventory[]).
 * - "Add Equipment" button that opens a slide-in panel listing SRD equipment.
 *
 * Gold state lives in character.gold (GoldAmount from shared types).
 * Inventory is character.inventory (string[]).
 * Both are persisted via the existing updateField → auto-save flow.
 */

import React, { useState } from "react";
import type { GoldAmount } from "@shared/types";
import { useCharacterStore } from "@/store/characterStore";
import { DiceRollButton } from "@/components/dice/DiceRollButton";
import type { RollRequest, DieSize } from "@/types/dice";
import {
  ALL_TIER1_WEAPONS,
  ALL_ARMOR,
} from "@/lib/srdEquipment";
import type { SRDWeapon, SRDArmor } from "@/lib/srdEquipment";

// ─── SRD Equipment Catalog ───────────────────────────────────────────────────
// Derived from the canonical srdEquipment.ts weapons + armor data, plus
// supplementary loot & consumable items. This ensures the Add Equipment
// sidebar uses the exact same names as the weapon/armor equip sidebars,
// so items can always be equipped after being added to inventory.

interface SrdEquipmentItem {
  name: string;
  category: string;
  description: string;
}

/** Build a concise description string from an SRDWeapon record. */
function weaponToDescription(w: SRDWeapon): string {
  const parts = [
    `${w.damageDie} ${w.damageType.toLowerCase()}`,
    w.range,
    w.burden === "Two-Handed" ? "Two-handed" : "One-handed",
    w.trait,
  ];
  if (w.feature) parts.push(w.feature.split(":")[0]); // e.g. "Reliable"
  return parts.join(", ");
}

/** Build a concise description string from an SRDArmor record. */
function armorToDescription(a: SRDArmor): string {
  const parts = [
    `Tier ${a.tier}`,
    `Score ${a.baseArmorScore}`,
    `Major ${a.baseMajorThreshold}+`,
    `Severe ${a.baseSevereThreshold}+`,
  ];
  if (a.feature) parts.push(a.feature.split(":")[0]);
  return parts.join(", ");
}

// Weapons grouped by category
const WEAPON_ITEMS: SrdEquipmentItem[] = ALL_TIER1_WEAPONS.map((w) => ({
  name: w.name,
  category:
    w.category === "Secondary"
      ? "Weapons — Secondary"
      : w.damageType === "Magic"
        ? "Weapons — Primary (Magic)"
        : "Weapons — Primary (Physical)",
  description: weaponToDescription(w),
}));

// Armor from all tiers
const ARMOR_ITEMS: SrdEquipmentItem[] = ALL_ARMOR.map((a) => ({
  name: a.name,
  category: `Armor — Tier ${a.tier}`,
  description: armorToDescription(a),
}));

// Supplementary loot & consumable items (not in srdEquipment.ts)
const LOOT_AND_CONSUMABLE_ITEMS: SrdEquipmentItem[] = [
  // ── Loot / Reusables ──
  {
    category: "Loot & Reusables",
    name: "Healing Potion",
    description: "Restore 1d6 HP. Can be used in any scene.",
  },
  {
    category: "Loot & Reusables",
    name: "Ration Pack",
    description: "One day's food and water for one creature.",
  },
  {
    category: "Loot & Reusables",
    name: "Torch",
    description: "Provides bright light in Close range for 1 hour.",
  },
  {
    category: "Loot & Reusables",
    name: "Rope (50 ft)",
    description: "Hemp rope, can support up to 1,000 lbs.",
  },
  {
    category: "Loot & Reusables",
    name: "Grappling Hook",
    description: "Can be thrown to anchor rope in Far range.",
  },
  {
    category: "Loot & Reusables",
    name: "Crowbar",
    description: "+1 to Strength rolls to force open doors or chests.",
  },
  {
    category: "Loot & Reusables",
    name: "Healer's Kit",
    description: "10 uses. Spend 1 use to stabilize a fallen ally.",
  },
  {
    category: "Loot & Reusables",
    name: "Thieves' Tools",
    description: "+1 to Finesse rolls to pick locks or disarm traps.",
  },
  {
    category: "Loot & Reusables",
    name: "Lantern",
    description: "Provides bright light in Close range, burns oil.",
  },
  {
    category: "Loot & Reusables",
    name: "Flask of Oil",
    description: "Fuel for a lantern (4 hours) or improvised incendiary.",
  },
  {
    category: "Loot & Reusables",
    name: "Spellbook",
    description: "Required for Wizard spell preparation. 20 pages.",
  },
  {
    category: "Loot & Reusables",
    name: "Druidic Focus",
    description: "Wooden staff or bundle of herbs. Druid casting focus.",
  },
  {
    category: "Loot & Reusables",
    name: "Arcane Focus",
    description: "Crystal orb or wand. Wizard/Sorcerer casting focus.",
  },
  {
    category: "Loot & Reusables",
    name: "Holy Symbol",
    description: "Seraph divine focus. +1 to Presence healing rolls.",
  },
  {
    category: "Loot & Reusables",
    name: "Musical Instrument",
    description: "Bard performance tool. Required for some Bard features.",
  },
  {
    category: "Loot & Reusables",
    name: "Disguise Kit",
    description: "8 uses. Spend 1 use to adopt a convincing disguise.",
  },
  // ── Consumables ──
  {
    category: "Consumables",
    name: "Greater Healing Potion",
    description: "Restore 2d6+2 HP. Single use.",
  },
  {
    category: "Consumables",
    name: "Antitoxin",
    description: "Clear the Poisoned condition. Single use.",
  },
  {
    category: "Consumables",
    name: "Smoke Bomb",
    description:
      "Create a Close area of obscuring smoke for 1 round. Single use.",
  },
  {
    category: "Consumables",
    name: "Alchemist's Fire",
    description: "Ranged attack; target becomes Ignited. Single use.",
  },
  {
    category: "Consumables",
    name: "Calming Draught",
    description: "Clear 1 Stress. Single use.",
  },
  {
    category: "Consumables",
    name: "Scroll of Mending",
    description: "Cast Mending once without spell slots. Single use.",
  },
];

const SRD_EQUIPMENT: SrdEquipmentItem[] = [
  ...WEAPON_ITEMS,
  ...ARMOR_ITEMS,
  ...LOOT_AND_CONSUMABLE_ITEMS,
];

const EQUIPMENT_CATEGORIES = Array.from(
  new Set(SRD_EQUIPMENT.map((i) => i.category)),
);

// ─── Weapon Damage Parser ─────────────────────────────────────────────────────
// Looks up the canonical SRDWeapon record by name and parses its damageDie field
// to build a rollable damage request. Returns null for non-weapon items.
//
// SRDWeapon.damageDie examples: "d8", "d10+3", "d6+1", "d12+3"

interface WeaponDamage {
  dieCount: number;
  dieSize: DieSize;
  flatMod: number;
}

/** Parse a damageDie string like "d10+3" or "2d8" into structured data. */
function parseWeaponDamageDie(damageDie: string): WeaponDamage | null {
  const match = damageDie.match(/^(\d+)?d(\d+)(?:\+(\d+))?$/i);
  if (!match) return null;
  const dieCount = match[1] ? parseInt(match[1], 10) : 1;
  const size = parseInt(match[2], 10);
  const validSizes = [4, 6, 8, 10, 12, 20];
  if (!validSizes.includes(size)) return null;
  const flatMod = match[3] ? parseInt(match[3], 10) : 0;
  return { dieCount, dieSize: `d${size}` as DieSize, flatMod };
}

/** Find the SRDWeapon record for an inventory item name (case-insensitive). */
function findSrdWeapon(itemName: string): SRDWeapon | undefined {
  return ALL_TIER1_WEAPONS.find(
    (w) => w.name.toLowerCase() === itemName.toLowerCase(),
  );
}

/** Look up the SRD catalog description for an inventory item by name. */
function srdDescriptionFor(itemName: string): string | null {
  return SRD_EQUIPMENT.find((e) => e.name === itemName)?.description ?? null;
}

/**
 * Build a damage RollRequest for a weapon.
 * SRD: damage dice = proficiency × weapon die; flat modifier is NOT multiplied.
 */
function buildWeaponRollRequest(
  itemName: string,
  proficiency: number,
): RollRequest | null {
  const weapon = findSrdWeapon(itemName);
  if (!weapon) return null;
  const parsed = parseWeaponDamageDie(weapon.damageDie);
  if (!parsed) return null;

  const { dieCount, dieSize, flatMod } = parsed;
  // Total dice = base die count × proficiency
  const totalDice = dieCount * proficiency;

  return {
    label: `${itemName} Damage`,
    type: "damage",
    proficiency,
    modifier: flatMod || undefined,
    dice: Array.from({ length: totalDice }, () => ({
      size: dieSize,
      role: "damage" as const,
      label: itemName,
    })),
  };
}

// ─── GoldSlotTracker ─────────────────────────────────────────────────────────
// Visual slot tracker for a single gold denomination.

interface GoldSlotTrackerProps {
  label: string;
  marked: number;
  maxSlots: number;
  color: string;
  onToggle: (index: number) => void;
}

function GoldSlotTracker({
  label,
  marked,
  maxSlots,
  color,
  onToggle,
}: GoldSlotTrackerProps) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-semibold uppercase tracking-wider text-[#b9baa3]">
        {label}
      </span>
      <div
        className="flex flex-wrap gap-1"
        role="group"
        aria-label={`${label} slots`}
      >
        {Array.from({ length: maxSlots }, (_, i) => {
          const filled = i < marked;
          return (
            <button
              key={i}
              type="button"
              onClick={() => onToggle(i)}
              aria-label={`${label} slot ${i + 1} — ${filled ? "filled" : "empty"}`}
              aria-pressed={filled}
              className={[
                "h-6 w-6 min-h-[32px] min-w-[32px] rounded-full border-2 transition-all duration-150",
                "focus:outline-none focus:ring-2 focus:ring-[#577399] focus:ring-offset-1 focus:ring-offset-slate-900",
                filled
                  ? `${color} border-transparent shadow-sm`
                  : "border-[#577399]/30 bg-transparent hover:border-[#577399]",
              ].join(" ")}
            />
          );
        })}
      </div>
    </div>
  );
}

// ─── GoldTracker ─────────────────────────────────────────────────────────────
// Handles the three denominations with rollover mechanics.

interface GoldTrackerProps {
  gold: GoldAmount;
  onChange: (gold: GoldAmount) => void;
}

function GoldTracker({ gold, onChange }: GoldTrackerProps) {
  const handleHandfulToggle = (index: number) => {
    let { handfuls, bags, chests } = gold;
    if (index < handfuls) {
      // Clear down to index
      handfuls = index;
    } else {
      handfuls = index + 1;
      // Rollover: 10 handfuls → 1 bag
      if (handfuls >= 10 && bags < 9) {
        handfuls = 0;
        bags = Math.min(9, bags + 1);
      } else if (handfuls >= 10) {
        handfuls = 9; // cap if bags are full
      }
    }
    onChange({ handfuls, bags, chests });
  };

  const handleBagToggle = (index: number) => {
    let { handfuls, bags, chests } = gold;
    if (index < bags) {
      bags = index;
    } else {
      bags = index + 1;
      // Rollover: 10 bags → 1 chest
      if (bags >= 10 && chests < 1) {
        bags = 0;
        chests = 1;
      } else if (bags >= 10) {
        bags = 9;
      }
    }
    onChange({ handfuls, bags, chests });
  };

  const handleChestToggle = () => {
    onChange({ ...gold, chests: gold.chests > 0 ? 0 : 1 });
  };

  return (
    <div className="space-y-3">
      <GoldSlotTracker
        label="Handfuls"
        marked={gold.handfuls}
        maxSlots={9}
        color="bg-[#aa7b1b]"
        onToggle={handleHandfulToggle}
      />
      <GoldSlotTracker
        label="Bags"
        marked={gold.bags}
        maxSlots={9}
        color="bg-[#c9952a]"
        onToggle={handleBagToggle}
      />
      {/* Chests: just 1 slot */}
      <div className="flex flex-col gap-1">
        <span className="text-xs font-semibold uppercase tracking-wider text-[#b9baa3]">
          Chests
        </span>
        <button
          type="button"
          onClick={handleChestToggle}
          aria-label={`Chest — ${gold.chests > 0 ? "filled" : "empty"}`}
          aria-pressed={gold.chests > 0}
          className={[
            "h-6 w-6 min-h-[32px] min-w-[32px] rounded-full border-2 transition-all duration-150",
            "focus:outline-none focus:ring-2 focus:ring-[#577399] focus:ring-offset-1 focus:ring-offset-slate-900",
            gold.chests > 0
              ? "bg-[#e8b94a] border-transparent shadow-sm"
              : "border-[#577399]/30 bg-transparent hover:border-[#577399]",
          ].join(" ")}
        />
        <p className="text-xs text-[#b9baa3]/60 italic">
          10 handfuls = 1 bag · 10 bags = 1 chest (SRD)
        </p>
      </div>
    </div>
  );
}

// ─── AddEquipmentSidebar ─────────────────────────────────────────────────────

interface AddEquipmentSidebarProps {
  open: boolean;
  onClose: () => void;
  onAdd: (name: string) => void;
  current: string[];
}

function AddEquipmentSidebar({
  open,
  onClose,
  onAdd,
  current,
}: AddEquipmentSidebarProps) {
  const headingId = React.useId();
  const panelRef = React.useRef<HTMLDivElement>(null);
  const [search, setSearch] = React.useState("");
  const [activeCategory, setActiveCategory] = React.useState<string | null>(
    null,
  );

  // Focus first focusable element when opened
  React.useEffect(() => {
    if (!open) return;
    setSearch("");
    setActiveCategory(null);
    const t = setTimeout(() => {
      const first = panelRef.current?.querySelector<HTMLElement>(
        'button, input, [tabindex]:not([tabindex="-1"])',
      );
      first?.focus();
    }, 50);
    return () => clearTimeout(t);
  }, [open]);

  // Escape to close
  React.useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };
    document.addEventListener("keydown", handler, true);
    return () => document.removeEventListener("keydown", handler, true);
  }, [open, onClose]);

  const filteredItems = SRD_EQUIPMENT.filter((item) => {
    const matchSearch =
      !search ||
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.description.toLowerCase().includes(search.toLowerCase());
    const matchCat = !activeCategory || item.category === activeCategory;
    return matchSearch && matchCat;
  });

  const groupedItems: Record<string, SrdEquipmentItem[]> = {};
  for (const item of filteredItems) {
    if (!groupedItems[item.category]) groupedItems[item.category] = [];
    groupedItems[item.category].push(item);
  }

  return (
    <>
      {open && (
        <div
          aria-hidden="true"
          onClick={onClose}
          className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-sm lg:hidden"
        />
      )}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={headingId}
        aria-hidden={!open}
        inert={!open ? ("" as unknown as boolean) : undefined}
        className={[
          "fixed inset-y-0 right-0 z-50 flex h-full w-full max-w-[28rem] flex-col py-12",
          "border-l border-[#577399]/35 bg-[#0f1713] shadow-2xl",
          "transition-transform duration-300 ease-in-out",
          open ? "translate-x-0" : "translate-x-full",
        ].join(" ")}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#577399]/25 px-5 py-4">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-[#b9baa3]">
              Equipment
            </p>
            <h2
              id={headingId}
              className="font-serif text-lg font-semibold text-[#f7f7ff]"
            >
              Add Equipment
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close equipment panel"
            className="flex h-11 w-11 items-center justify-center rounded-lg border border-[#577399]/30 text-[#b9baa3] hover:bg-[#577399]/12 hover:text-[#f7f7ff] focus:outline-none focus:ring-2 focus:ring-[#577399]"
          >
            ✕
          </button>
        </div>

        {/* Search */}
        <div className="px-5 pt-4 pb-3 border-b border-[#577399]/15 space-y-3">
          <input
            type="search"
            placeholder="Search equipment…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-[#577399]/35 bg-[#f7f7ff] px-3 py-2 text-sm text-[#0a100d] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#577399]"
            aria-label="Search equipment"
          />
          {/* Category filter pills */}
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setActiveCategory(null)}
              className={[
                "rounded-full px-2.5 py-0.5 text-xs font-semibold border transition-colors",
                activeCategory === null
                  ? "bg-[#577399] border-[#577399] text-[#f7f7ff]"
                  : "border-[#577399]/30 text-[#b9baa3] hover:border-[#577399] hover:text-[#f7f7ff]",
              ].join(" ")}
            >
              All
            </button>
            {EQUIPMENT_CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() =>
                  setActiveCategory(cat === activeCategory ? null : cat)
                }
                className={[
                  "rounded-full px-2.5 py-0.5 text-xs font-semibold border transition-colors",
                  activeCategory === cat
                    ? "bg-[#577399] border-[#577399] text-[#f7f7ff]"
                    : "border-[#577399]/30 text-[#b9baa3] hover:border-[#577399] hover:text-[#f7f7ff]",
                ].join(" ")}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {Object.entries(groupedItems).map(([category, items]) => (
            <div key={category}>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#577399] mb-2">
                {category}
              </p>
              <ul className="space-y-1" role="list">
                {items.map((item) => {
                  const alreadyHave = current.includes(item.name);
                  return (
                    <li key={item.name}>
                      <button
                        type="button"
                        onClick={() => {
                          if (!alreadyHave) onAdd(item.name);
                        }}
                        disabled={alreadyHave}
                        aria-label={
                          alreadyHave
                            ? `${item.name} — already in inventory`
                            : `Add ${item.name}`
                        }
                        className={[
                          "w-full text-left rounded-lg px-3 py-2 border transition-colors",
                          alreadyHave
                            ? "border-[#577399]/20 bg-[#577399]/10 opacity-60 cursor-default"
                            : "border-transparent hover:border-[#577399]/40 hover:bg-[#577399]/10 cursor-pointer",
                        ].join(" ")}
                      >
                        <span className="flex items-center justify-between">
                          <span className="text-sm font-medium text-[#f7f7ff]">
                            {item.name}
                          </span>
                          {alreadyHave ? (
                            <span className="text-xs text-[#577399] font-semibold">
                              ✓ Have
                            </span>
                          ) : (
                            <span className="text-xs text-[#577399]/60">
                              + Add
                            </span>
                          )}
                        </span>
                        <span className="text-sm text-[#b9baa3] leading-snug block mt-0.5">
                          {item.description}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
          {Object.keys(groupedItems).length === 0 && (
            <p className="text-center text-sm text-[#b9baa3] italic pt-8">
              No equipment matches your search.
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-[#577399]/25 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-xl border border-[#577399]/40 bg-[#577399]/15 px-4 py-3 text-sm font-semibold text-[#f7f7ff] hover:bg-[#577399]/25 focus:outline-none focus:ring-2 focus:ring-[#577399]"
          >
            Done
          </button>
        </div>
      </div>
    </>
  );
}

// ─── EquipmentPanel ───────────────────────────────────────────────────────────

export function EquipmentPanel({
  onRollQueued,
}: {
  onRollQueued?: () => void;
}) {
  const { activeCharacter, updateField } = useCharacterStore();
  const [addOpen, setAddOpen] = useState(false);

  if (!activeCharacter) return null;

  const gold: GoldAmount = activeCharacter.gold ?? {
    handfuls: 1,
    bags: 0,
    chests: 0,
  };
  const inventory: string[] = activeCharacter.inventory ?? [];
  const proficiency: number = activeCharacter.proficiency ?? 1;

  const handleGoldChange = (next: GoldAmount) => {
    updateField("gold", next);
  };

  const handleAddItem = (name: string) => {
    if (!inventory.includes(name)) {
      updateField("inventory", [...inventory, name]);
    }
  };

  const handleRemoveItem = (name: string) => {
    // Auto-unequip: if the removed item is currently equipped as a weapon or
    // armor, clear that slot so the character sheet doesn't reference an item
    // that's no longer in inventory.
    const weapon = findSrdWeapon(name);
    if (weapon) {
      const weapons = activeCharacter.weapons;
      if (weapons?.primary?.weaponId === weapon.id) {
        updateField("weapons.primary.weaponId", null);
      }
      if (weapons?.secondary?.weaponId === weapon.id) {
        updateField("weapons.secondary.weaponId", null);
      }
    }

    const armor = ALL_ARMOR.find(
      (a) => a.name.toLowerCase() === name.toLowerCase(),
    );
    if (armor && activeCharacter.activeArmorId === armor.id) {
      updateField("activeArmorId", null);
    }

    updateField(
      "inventory",
      inventory.filter((i) => i !== name),
    );
  };

  return (
    <>
      <section
        className="rounded-xl border border-[#577399]/30 bg-slate-900/80 p-5 shadow-card space-y-6"
        aria-label="Equipment and Gold"
        data-field-key="equipment"
      >
        <h2 className="font-serif-sc text-sm font-semibold tracking-widest text-[#577399]">
          Equipment &amp; Gold
        </h2>

        {/* Gold tracker */}
        <div data-field-key="equipment.gold">
          <h3 className="mb-3 text-xs font-medium uppercase tracking-wider text-[#b9baa3]">
            Gold
          </h3>
          <GoldTracker gold={gold} onChange={handleGoldChange} />
        </div>

        {/* Divider */}
        <div className="border-t border-[#577399]/15" />

        {/* Inventory */}
        <div data-field-key="equipment.inventory">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-medium uppercase tracking-wider text-[#b9baa3]">
              Inventory
            </h3>
            <button
              type="button"
              onClick={() => setAddOpen(true)}
              aria-haspopup="dialog"
              aria-label="Add equipment item"
              data-field-key="equipment.add"
              className="
                rounded-lg border border-[#577399]/40 bg-[#577399]/15 px-3 py-1.5
                text-xs font-semibold text-[#f7f7ff]
                hover:bg-[#577399]/25 hover:border-[#577399]
                transition-colors
                focus:outline-none focus:ring-2 focus:ring-[#577399]
              "
            >
              + Add Equipment
            </button>
          </div>

          {inventory.length === 0 ? (
            <p className="text-xs text-[#b9baa3]/60 italic">
              No equipment yet. Click &ldquo;+ Add Equipment&rdquo; to browse
              the SRD catalog.
            </p>
          ) : (
            <ul
              className="space-y-1.5"
              role="list"
              aria-label="Inventory items"
            >
              {inventory.map((item) => {
                const rollReq = buildWeaponRollRequest(item, proficiency);
                return (
                  <li
                    key={item}
                    className="flex items-center justify-between rounded-lg border border-[#577399]/20 bg-slate-900/50 px-3 py-2 gap-2"
                  >
                    <span className="text-sm text-[#f7f7ff] flex-1 min-w-0 truncate">
                      {item}
                    </span>
                    {rollReq && (
                      <DiceRollButton
                        rollRequest={rollReq}
                        variant="icon"
                        onRollQueued={onRollQueued}
                      />
                    )}
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(item)}
                      aria-label={`Remove ${item} from inventory`}
                      className="h-8 w-8 flex items-center justify-center rounded text-[#577399]/50 hover:text-[#fe5f55] hover:bg-[#fe5f55]/10 transition-colors text-xs focus:outline-none focus:ring-2 focus:ring-[#577399] flex-shrink-0"
                    >
                      ✕
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>

      <AddEquipmentSidebar
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onAdd={handleAddItem}
        current={inventory}
      />
    </>
  );
}
