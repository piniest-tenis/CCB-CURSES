"use client";

/**
 * src/app/character/[id]/build/CharacterBuilderPageClient.tsx
 *
 * Character builder/editor page for existing characters.
 * Allows users to modify their character's class, ancestry, community,
 * weapons, armor, starting equipment, domain cards, and trait bonuses.
 *
 * Flow:
 *   1. Choose Class
 *   2. Choose Subclass
 *   3. Choose Heritage (Ancestry + Community)
 *   4. Assign Traits
 *   5. Choose Starting Weapons
 *   6. Choose Starting Armor
 *   7. Take Starting Equipment
 *   8. Take Domain Deck Cards
 *   9. Review & Save
 *
 * After saving, redirects back to character sheet.
 */

import React, { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useCharacter, useUpdateCharacter } from "@/hooks/useCharacter";
import { useClass, useClasses, useAncestries, useCommunities } from "@/hooks/useGameData";
import type { Character, AncestryData, CommunityData, CoreStats } from "@shared/types";
import { MarkdownContent } from "@/components/MarkdownContent";
import { CollapsibleSRDDescription } from "@/components/character/CollapsibleSRDDescription";
import { TraitAssignmentPanel, type TraitBonuses } from "@/components/character/TraitAssignmentPanel";
import { WeaponSelectionPanel } from "@/components/character/WeaponSelectionPanel";
import { ArmorSelectionPanel } from "@/components/character/ArmorSelectionPanel";
import { StartingEquipmentPanel, type StartingEquipmentSelections } from "@/components/character/StartingEquipmentPanel";
import { DomainCardSelectionPanel } from "@/components/character/DomainCardSelectionPanel";
import { ALL_TIER1_WEAPONS, TIER1_ARMOR, UNIVERSAL_STARTING_ITEMS, STARTING_GOLD } from "@/lib/srdEquipment";

interface CharacterBuilderPageProps {
  params: { id: string };
}

export default function CharacterBuilderPageClient({ params: _params }: CharacterBuilderPageProps) {
  const pathname = usePathname();
  // Extract the real character ID from the browser URL.
  // params.id is "__placeholder__" in a static export because Next.js only
  // pre-renders one HTML file per dynamic segment. usePathname() always
  // reflects the actual browser URL — identical pattern to CharacterPageClient.
  // Path shape: /character/{id}/build  → segments[2] is the id.
  const characterId = pathname?.split("/")[2] ?? "";
  const router = useRouter();
  
  // Queries
  const { data: character, isLoading: charLoading } = useCharacter(characterId);
  const { data: classesData } = useClasses();
  const { data: ancestriesData } = useAncestries();
  const { data: communitiesData } = useCommunities();
  
  // Builder state
  const updateMutation = useUpdateCharacter(characterId);
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9>(1);
  const [classId, setClassId] = useState(character?.classId ?? "");
  const [subclassId, setSubclassId] = useState(character?.subclassId ?? "");
  const [ancestryId, setAncestryId] = useState(character?.ancestryId ?? "");
  const [communityId, setCommunityId] = useState(character?.communityId ?? "");
  const [traitBonuses, setTraitBonuses] = useState<TraitBonuses>(character?.traitBonuses ?? {});
  const [primaryWeaponId, setPrimaryWeaponId] = useState<string | null>(
    character?.weapons?.primary?.name
      ? ALL_TIER1_WEAPONS.find((w) => w.name === character.weapons.primary.name)?.id ?? null
      : null
  );
  const [secondaryWeaponId, setSecondaryWeaponId] = useState<string | null>(
    character?.weapons?.secondary?.name
      ? ALL_TIER1_WEAPONS.find((w) => w.name === character.weapons.secondary.name)?.id ?? null
      : null
  );
  const [armorId, setArmorId] = useState<string | null>(() => {
    // Recover armor from inventory: we store the armor name there on save.
    const inv = character?.inventory ?? [];
    return TIER1_ARMOR.find((a) => inv.includes(a.name))?.id ?? null;
  });

  // Step 7: Starting Equipment
  const [equipmentSelections, setEquipmentSelections] = useState<StartingEquipmentSelections>(() => {
    const inv = character?.inventory ?? [];
    // Recover consumable
    const consumableId = inv.includes("Minor Health Potion")
      ? "minor-health-potion"
      : inv.includes("Minor Stamina Potion")
        ? "minor-stamina-potion"
        : null;
    // Recover class item: done via useEffect once selectedClassData loads.
    const classItem = null;
    return { consumableId, classItem };
  });

  // Step 8: Domain Cards
  const [selectedDomainCardIds, setSelectedDomainCardIds] = useState<string[]>(
    character?.domainLoadout ?? []
  );

  const [heritageTab, setHeritageTab] = useState<"ancestry" | "community">("ancestry");
  const [error, setError] = useState<string | null>(null);
  
  // Get full class data for currently selected class
  const { data: selectedClassData } = useClass(classId || undefined);

  // Recover saved class item from inventory once class data loads
  useEffect(() => {
    if (!selectedClassData || !character) return;
    const inv = character.inventory ?? [];
    const recovered = selectedClassData.classItems.find((ci) => inv.includes(ci)) ?? null;
    if (recovered) {
      setEquipmentSelections((prev) => prev.classItem ? prev : { ...prev, classItem: recovered });
    }
  }, [selectedClassData, character]);
  
  // Get selected subclass data
  const selectedSubclass = selectedClassData?.subclasses.find((s) => s.subclassId === subclassId);
  
  // Derived state
  const selectedAncestry: AncestryData | undefined =
    ancestriesData?.ancestries.find((a) => a.ancestryId === ancestryId);
  const selectedCommunity: CommunityData | undefined =
    communitiesData?.communities.find((c) => c.communityId === communityId);
  
  // Validators
  const canGoNext1 = Boolean(classId);
  const canGoNext2 = Boolean(subclassId);
  const canGoNext3 = Boolean(ancestryId && communityId);
  const canGoNext4 = Object.keys(traitBonuses).length === 4;
  const canGoNext5 = Boolean(primaryWeaponId); // secondary is optional
  const canGoNext6 = Boolean(armorId);
  const canGoNext7 = Boolean(equipmentSelections.consumableId && equipmentSelections.classItem);
  const canGoNext8 = selectedDomainCardIds.length === 2;

  // Helper: find selected weapon/armor data for save
  const primaryWeapon = ALL_TIER1_WEAPONS.find((w) => w.id === primaryWeaponId) ?? null;
  const secondaryWeapon = ALL_TIER1_WEAPONS.find((w) => w.id === secondaryWeaponId) ?? null;
  
  const handleSave = async () => {
    setError(null);
    try {
      // Build inventory array from selections
      const selectedArmor = TIER1_ARMOR.find((a) => a.id === armorId) ?? null;
      const inventory: string[] = [
        ...UNIVERSAL_STARTING_ITEMS,
        ...(selectedArmor ? [selectedArmor.name] : []),
        ...(equipmentSelections.consumableId === "minor-health-potion"
          ? ["Minor Health Potion"]
          : equipmentSelections.consumableId === "minor-stamina-potion"
            ? ["Minor Stamina Potion"]
            : []),
        ...(equipmentSelections.classItem ? [equipmentSelections.classItem] : []),
      ];

      // ── Compute stats from traitBonuses ──────────────────────────
      // traitBonuses only has the 4 assigned traits ({+2, +1, +1, −1}).
      // Unassigned traits default to 0.
      const stats: CoreStats = {
        agility:   traitBonuses.agility   ?? 0,
        strength:  traitBonuses.strength  ?? 0,
        finesse:   traitBonuses.finesse   ?? 0,
        instinct:  traitBonuses.instinct  ?? 0,
        presence:  traitBonuses.presence  ?? 0,
        knowledge: traitBonuses.knowledge ?? 0,
      };

      // ── Compute derivedStats (Evasion + Armor Score) ─────────────
      // SRD: Evasion = class startingEvasion + armor evasion modifier
      // SRD: Armor Score = armor.baseArmorScore
      const evasionMod =
        selectedArmor?.featureType === "Flexible"    ?  1 :
        selectedArmor?.featureType === "Heavy"        ? -1 :
        selectedArmor?.featureType === "Very Heavy"   ? -2 :
        0;
      const baseEvasion = selectedClassData?.startingEvasion ?? 0;
      const derivedStats = {
        baseEvasion,
        evasion: baseEvasion + evasionMod,
        armor: selectedArmor?.baseArmorScore ?? 0,
      };

      // ── Compute damageThresholds ─────────────────────────────────
      // SRD: major = armor.baseMajorThreshold + level
      // SRD: severe = armor.baseSevereThreshold + level
      const charLevel = character?.level ?? 1;
      const damageThresholds = {
        major:  (selectedArmor?.baseMajorThreshold  ?? 0) + charLevel,
        severe: (selectedArmor?.baseSevereThreshold ?? 0) + charLevel,
      };

      const updated = await updateMutation.mutateAsync({
        classId,
        subclassId: subclassId || undefined,
        ancestryId: ancestryId || undefined,
        communityId: communityId || undefined,
        traitBonuses,
        stats,
        derivedStats,
        damageThresholds,
        // Set activeArmorId so the live sheet and backend track which armor is equipped
        activeArmorId: armorId ?? null,
        weapons: {
          primary: primaryWeapon
            ? {
                name: primaryWeapon.name,
                trait: primaryWeapon.trait.toLowerCase() as Character["weapons"]["primary"]["trait"],
                damage: primaryWeapon.damageDie,
                range: primaryWeapon.range,
                type: primaryWeapon.damageType.toLowerCase() as "physical" | "magic",
                burden: (primaryWeapon.burden === "Two-Handed" ? "two-handed" : "one-handed") as "one-handed" | "two-handed",
                tier: 1,
                feature: primaryWeapon.feature,
              }
            : { name: null, trait: null, damage: null, range: null, type: null, burden: null, tier: null, feature: null },
          secondary: secondaryWeapon
            ? {
                name: secondaryWeapon.name,
                trait: secondaryWeapon.trait.toLowerCase() as Character["weapons"]["secondary"]["trait"],
                damage: secondaryWeapon.damageDie,
                range: secondaryWeapon.range,
                type: secondaryWeapon.damageType.toLowerCase() as "physical" | "magic",
                burden: (secondaryWeapon.burden === "Two-Handed" ? "two-handed" : "one-handed") as "one-handed" | "two-handed",
                tier: 1,
                feature: secondaryWeapon.feature,
              }
            : { name: null, trait: null, damage: null, range: null, type: null, burden: null, tier: null, feature: null },
        },
        gold: STARTING_GOLD,
        inventory,
        domainLoadout: selectedDomainCardIds,
        domainVault: selectedDomainCardIds,
      } as Partial<Character>);
      
      // Redirect back to character sheet
      router.push(`/character/${updated.characterId ?? characterId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update character");
    }
  };
  
  if (charLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a100d]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#577399] border-t-transparent" />
      </div>
    );
  }
  
  if (!character) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a100d] p-4">
        <div className="rounded-lg border border-[#fe5f55]/40 bg-[#fe5f55]/10 p-8 text-center">
          <p className="text-lg text-[#fe5f55]">Character not found</p>
          <button
            onClick={() => router.push("/dashboard")}
            className="mt-4 rounded-lg px-4 py-2 bg-[#577399] text-[#f7f7ff] hover:bg-[#577399]/80 transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-[#0a100d]">
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
        role="presentation"
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="builder-title"
          className="
            w-full max-w-5xl rounded-2xl border border-slate-700/60
            bg-[#0a100d] shadow-2xl flex flex-col
            max-h-[92vh]
          "
          style={{ boxShadow: "0 0 60px rgba(87,115,153,0.15), 0 24px 48px rgba(0,0,0,0.6)" }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700/40 shrink-0">
            <div>
              <h2 id="builder-title" className="font-serif text-xl font-semibold text-[#f7f7ff]">
                Edit Character
              </h2>
              <p className="text-xs text-[#b9baa3]/40 mt-0.5">
                {character.name} • Step {step} of 9
              </p>
            </div>
            
            <button
              type="button"
              onClick={() => router.push(`/character/${characterId}`)}
              className="text-[#b9baa3]/40 hover:text-[#b9baa3] text-2xl leading-none transition-colors focus:outline-none focus:ring-2 focus:ring-[#577399] rounded"
              aria-label="Close"
            >
              ×
            </button>
          </div>
          
          {/* Content */}
          <div className="flex flex-1 min-h-0 overflow-hidden">
            {/* Main step content */}
            <div className="flex-1 overflow-y-auto">
             {/* Step 1: Choose Class */}
            {step === 1 && (
              <div className="flex flex-1 min-h-0">
                {/* Left: class list */}
                <div className="w-64 sm:w-72 shrink-0 border-r border-slate-700/40 flex flex-col">
                  <div className="px-4 pt-3 pb-2 shrink-0">
                    <p className="text-xs font-medium uppercase tracking-wider text-[#b9baa3]/50">
                      Choose a Class
                    </p>
                  </div>
                  <div className="flex-1 overflow-y-auto">
                    {classesData?.classes.map((c) => (
                      <button
                        key={c.classId}
                        type="button"
                        onClick={() => {
                          setClassId(c.classId);
                          setSubclassId(""); // Reset subclass when changing class
                        }}
                        className={`
                          w-full text-left px-4 py-3 transition-colors
                          ${classId === c.classId
                            ? "bg-[#577399]/20 border-l-2 border-[#577399]"
                            : "border-l-2 border-transparent hover:bg-slate-800/60"
                          }
                        `}
                      >
                        <p className="text-sm font-semibold text-[#f7f7ff]">{c.name}</p>
                        {c.subclasses.length > 0 && (
                          <p className="text-xs italic text-[#b9baa3]/50 mt-0.5">
                            {c.subclasses.map((s) => s.name).join(" · ")}
                          </p>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
                
                {/* Right: preview */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                  {!classId ? (
                    <div className="flex h-full items-center justify-center">
                      <div className="text-center space-y-3">
                        <div className="text-4xl opacity-20">⚔️</div>
                        <p className="text-sm text-[#b9baa3]/40 italic">Select a class to see details</p>
                      </div>
                    </div>
                  ) : selectedClassData ? (
                    <>
                      <CollapsibleSRDDescription
                        title="What are Classes?"
                        content="Classes are role-based archetypes that determine which class features and domain cards a PC gains access to throughout play."
                      />
                      
                      <div>
                        <h3 className="font-serif text-2xl font-bold text-[#f7f7ff]">{selectedClassData.name}</h3>
                      </div>
                      
                      <div className="flex gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <span className="text-xs uppercase tracking-wider text-[#b9baa3]/50">Evasion</span>
                          <span className="rounded border border-slate-700 bg-slate-900 px-2.5 py-0.5 font-bold">
                            {selectedClassData.startingEvasion}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs uppercase tracking-wider text-[#b9baa3]/50">Hit Points</span>
                          <span className="rounded border border-slate-700 bg-slate-900 px-2.5 py-0.5 font-bold">
                            {selectedClassData.startingHitPoints}
                          </span>
                        </div>
                      </div>
                      
                      {selectedClassData.domains.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {selectedClassData.domains.map((d) => (
                            <span
                              key={d}
                              className="rounded border border-[#577399]/50 bg-[#577399]/10 px-2.5 py-0.5 text-sm text-[#577399]"
                            >
                              {d}
                            </span>
                          ))}
                        </div>
                      )}
                      
                      {selectedClassData.classFeature && (
                        <div>
                          <h4 className="font-semibold text-[#f7f7ff] mb-2">Class Feature</h4>
                          <div className="rounded-lg border border-slate-700/60 bg-slate-850/50 px-4 py-3">
                            <p className="text-sm font-semibold text-[#f7f7ff] mb-1">{selectedClassData.classFeature.name}</p>
                            <MarkdownContent className="text-sm text-[#b9baa3]/70">
                              {selectedClassData.classFeature.description}
                            </MarkdownContent>
                          </div>
                        </div>
                      )}
                    </>
                  ) : null}
                </div>
              </div>
            )}
            
            {/* Step 2: Choose Subclass */}
            {step === 2 && selectedClassData && (
              <div className="flex-1 overflow-y-auto p-6 space-y-6 max-w-2xl mx-auto">
                <div>
                  <h3 className="font-serif text-2xl font-bold text-[#f7f7ff] mb-1">
                    Choose Your {selectedClassData.name} Subclass
                  </h3>
                  <p className="text-sm text-[#b9baa3]/60">
                    Subclasses further refine your class and unlock unique features.
                  </p>
                </div>
                
                <CollapsibleSRDDescription
                  title="What are Subclasses?"
                  content="Subclasses further refine a class archetype and reinforce its expression by granting access to unique subclass features. Each class comprises two subclasses."
                />
                
                <div className="space-y-3">
                  {selectedClassData.subclasses.map((subclass) => (
                    <button
                      key={subclass.subclassId}
                      type="button"
                      onClick={() => setSubclassId(subclass.subclassId)}
                      className={`
                        w-full text-left p-4 rounded-lg transition-all
                        ${subclassId === subclass.subclassId
                          ? "bg-[#577399]/20 border-2 border-[#577399]"
                          : "border-2 border-slate-700/60 hover:border-slate-600 hover:bg-slate-850/30"
                        }
                      `}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <h4 className="font-semibold text-[#f7f7ff] mb-1">{subclass.name}</h4>
                          <MarkdownContent className="text-sm text-[#b9baa3]/70">
                            {subclass.description}
                          </MarkdownContent>
                        </div>
                        {subclassId === subclass.subclassId && (
                          <span className="text-[#577399] text-xl shrink-0">✓</span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
                
                {/* Show selected subclass features */}
                {selectedSubclass && (
                  <div className="space-y-4 mt-6 pt-6 border-t border-slate-700/40">
                    <h4 className="font-semibold text-[#f7f7ff]">Subclass Features</h4>
                    
                    {selectedSubclass.foundationFeatures.length > 0 && (
                      <div>
                        <p className="text-xs uppercase tracking-wider text-[#b9baa3]/50 mb-2">
                          Foundation Features
                        </p>
                        <div className="rounded-lg border border-slate-700/60 bg-slate-850/50 p-3 space-y-2">
                          {selectedSubclass.foundationFeatures.map((f) => (
                            <div key={f.name}>
                              <p className="text-sm font-semibold text-[#f7f7ff]">{f.name}</p>
                              <MarkdownContent className="text-xs text-[#b9baa3]/70">
                                {f.description}
                              </MarkdownContent>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    <div className="rounded-lg border border-[#577399]/50 bg-[#577399]/10 p-3">
                      <p className="text-xs uppercase tracking-wider text-[#577399] font-medium mb-1">
                        Spellcast Trait
                      </p>
                      <p className="text-sm font-semibold text-[#f7f7ff]">
                        {selectedSubclass.spellcastTrait.charAt(0).toUpperCase() + selectedSubclass.spellcastTrait.slice(1)}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {/* Step 3: Heritage */}
            {step === 3 && (
              <div className="flex flex-1 min-h-0">
                {/* Left pane: tab switcher + list */}
                <div className="w-64 sm:w-72 shrink-0 border-r border-slate-700/40 flex flex-col">
                  {/* Tab switcher */}
                  <div className="flex shrink-0 border-b border-slate-700/30">
                    {(["ancestry", "community"] as const).map((tab) => (
                      <button
                        key={tab}
                        type="button"
                        onClick={() => setHeritageTab(tab)}
                        className={`
                          flex-1 py-3 px-2 text-xs font-semibold uppercase tracking-wider transition-colors
                          ${heritageTab === tab
                            ? "text-[#577399] border-b-2 border-[#577399]"
                            : "text-[#b9baa3]/40 hover:text-[#b9baa3]/70 border-b-2 border-transparent"
                          }
                        `}
                      >
                        {tab === "ancestry" ? "Ancestry" : "Community"}
                        {tab === "ancestry" && ancestryId && (
                          <span className="ml-1.5 text-[#577399]">✓</span>
                        )}
                        {tab === "community" && communityId && (
                          <span className="ml-1.5 text-[#577399]">✓</span>
                        )}
                      </button>
                    ))}
                  </div>
                  
                  {/* List */}
                  <div className="flex-1 overflow-y-auto">
                    {heritageTab === "ancestry" && ancestriesData?.ancestries.map((a) => (
                      <button
                        key={a.ancestryId}
                        type="button"
                        onClick={() => setAncestryId(a.ancestryId)}
                        className={`
                          w-full text-left px-4 py-3 transition-colors
                          ${ancestryId === a.ancestryId
                            ? "bg-[#577399]/20 border-l-2 border-[#577399]"
                            : "border-l-2 border-transparent hover:bg-slate-800/60"
                          }
                        `}
                      >
                        <p className="text-sm font-semibold text-[#f7f7ff]">{a.name}</p>
                        <p className="text-xs text-[#b9baa3]/50 truncate">
                          {a.traitName}{a.secondTraitName ? ` · ${a.secondTraitName}` : ""}
                        </p>
                      </button>
                    ))}
                    {heritageTab === "community" && communitiesData?.communities.map((c) => (
                      <button
                        key={c.communityId}
                        type="button"
                        onClick={() => setCommunityId(c.communityId)}
                        className={`
                          w-full text-left px-4 py-3 transition-colors
                          ${communityId === c.communityId
                            ? "bg-[#577399]/20 border-l-2 border-[#577399]"
                            : "border-l-2 border-transparent hover:bg-slate-800/60"
                          }
                        `}
                      >
                        <p className="text-sm font-semibold text-[#f7f7ff]">{c.name}</p>
                      </button>
                    ))}
                  </div>
                </div>
                
                {/* Right pane: detail panel */}
                <div className="flex-1 overflow-y-auto p-6">
                  {heritageTab === "ancestry" && !ancestryId && (
                    <div className="flex h-full items-center justify-center">
                      <div className="text-center space-y-3">
                        <div className="text-4xl opacity-20">🌿</div>
                        <p className="text-sm text-[#b9baa3]/40 italic">Select an ancestry to see details</p>
                      </div>
                    </div>
                  )}
                  {heritageTab === "community" && !communityId && (
                    <div className="flex h-full items-center justify-center">
                      <div className="text-center space-y-3">
                        <div className="text-4xl opacity-20">🏘️</div>
                        <p className="text-sm text-[#b9baa3]/40 italic">Select a community to see details</p>
                      </div>
                    </div>
                  )}
                  
                  {heritageTab === "ancestry" && selectedAncestry && (
                    <div className="space-y-4">
                      <div>
                        <h3 className="font-serif text-2xl font-bold text-[#f7f7ff]">{selectedAncestry.name}</h3>
                        {selectedAncestry.flavorText && (
                          <MarkdownContent className="mt-2 text-sm italic text-[#b9baa3]/60">
                            {selectedAncestry.flavorText}
                          </MarkdownContent>
                        )}
                      </div>
                      <div className="rounded-lg border border-slate-700/60 bg-slate-850/50 px-4 py-3 space-y-2">
                        <p className="text-xs font-semibold uppercase text-[#577399]">Primary Trait</p>
                        <p className="text-sm font-semibold text-[#f7f7ff]">{selectedAncestry.traitName}</p>
                        <MarkdownContent className="text-sm text-[#b9baa3]/70">
                          {selectedAncestry.traitDescription}
                        </MarkdownContent>
                      </div>
                      {selectedAncestry.secondTraitName && (
                        <div className="rounded-lg border border-slate-700/60 bg-slate-850/50 px-4 py-3 space-y-2">
                          <p className="text-xs font-semibold uppercase text-[#577399]">Secondary Trait</p>
                          <p className="text-sm font-semibold text-[#f7f7ff]">{selectedAncestry.secondTraitName}</p>
                          {selectedAncestry.secondTraitDescription && (
                            <MarkdownContent className="text-sm text-[#b9baa3]/70">
                              {selectedAncestry.secondTraitDescription}
                            </MarkdownContent>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                  
                  {heritageTab === "community" && selectedCommunity && (
                    <div className="space-y-4">
                      <div>
                        <h3 className="font-serif text-2xl font-bold text-[#f7f7ff]">{selectedCommunity.name}</h3>
                        {selectedCommunity.flavorText && (
                          <MarkdownContent className="mt-2 text-sm italic text-[#b9baa3]/60">
                            {selectedCommunity.flavorText}
                          </MarkdownContent>
                        )}
                      </div>
                      <div className="rounded-lg border border-slate-700/60 bg-slate-850/50 px-4 py-3 space-y-2">
                        <p className="text-xs font-semibold uppercase text-[#577399]">Trait</p>
                        <p className="text-sm font-semibold text-[#f7f7ff]">{selectedCommunity.traitName}</p>
                        <MarkdownContent className="text-sm text-[#b9baa3]/70">
                          {selectedCommunity.traitDescription}
                        </MarkdownContent>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* Step 4: Assign Traits */}
            {step === 4 && (
              <div className="flex-1 overflow-y-auto p-6 space-y-6 max-w-2xl mx-auto">
                <div>
                  <h3 className="font-serif text-2xl font-bold text-[#f7f7ff] mb-1">
                    Assign Your Traits
                  </h3>
                  <p className="text-sm text-[#b9baa3]/60">
                    Your traits determine your aptitudes and abilities.
                  </p>
                </div>
                
                <CollapsibleSRDDescription
                  title="What are Traits?"
                   content="Your character has six traits: **Agility** (sprint, leap, maneuver), **Strength** (lift, break, grapple), **Finesse** (precise attacks, sleight of hand), **Instinct** (react, track, sense danger), **Presence** (inspire, intimidate, persuade), **Knowledge** (recall lore, investigate, deduce). Your subclass's spellcast trait is pre-set to +2."
                />
                
                <div className="rounded-lg border border-slate-700/60 bg-slate-850/50 p-6">
                  <TraitAssignmentPanel
                    traits={traitBonuses}
                    onTraitsChange={setTraitBonuses}
                    defaultPlus2Trait={selectedSubclass?.spellcastTrait}
                  />
                </div>
              </div>
            )}
            
            {/* Step 5: Choose Starting Weapons */}
            {step === 5 && (
              <div className="flex flex-1 min-h-0 flex-col">
                <div className="px-6 pt-5 pb-3 shrink-0 space-y-3">
                  <div>
                    <h3 className="font-serif text-xl font-semibold text-[#f7f7ff]">Choose Starting Weapons</h3>
                    <p className="text-sm text-[#b9baa3]/60 mt-0.5">Select a primary weapon. A secondary weapon is optional.</p>
                  </div>
                  <CollapsibleSRDDescription
                    title="About Starting Weapons"
                    content={
                      "Tier 1 weapons are the only legal choices at character creation. A **primary weapon** fills one or two hands. " +
                      "A **secondary weapon** occupies your second hand — unavailable if your primary is Two-Handed. " +
                      (selectedSubclass
                        ? `Your subclass (**${selectedSubclass.name}**) uses **${selectedSubclass.spellcastTrait}** as its spellcast trait — magic weapons matching that trait are marked as Suggested.`
                        : "Magic weapons require a matching spellcast trait.")
                    }
                  />
                </div>
                <div className="flex-1 min-h-0 overflow-hidden border-t border-slate-700/30">
                  <WeaponSelectionPanel
                    primaryWeaponId={primaryWeaponId}
                    secondaryWeaponId={secondaryWeaponId}
                    onPrimaryChange={setPrimaryWeaponId}
                    onSecondaryChange={setSecondaryWeaponId}
                    subclassId={subclassId}
                    hasSpellcastTrait={Boolean(selectedSubclass?.spellcastTrait)}
                  />
                </div>
              </div>
            )}

            {/* Step 6: Choose Starting Armor */}
            {step === 6 && selectedClassData && (
              <div className="flex flex-1 min-h-0 flex-col">
                <div className="px-6 pt-5 pb-3 shrink-0 space-y-3">
                  <div>
                    <h3 className="font-serif text-xl font-semibold text-[#f7f7ff]">Choose Starting Armor</h3>
                    <p className="text-sm text-[#b9baa3]/60 mt-0.5">Select one armor. Thresholds shown are base values; add your level to each.</p>
                  </div>
                  <CollapsibleSRDDescription
                    title="About Armor"
                    content={
                      "Armor provides **Armor Slots** you mark to reduce incoming damage. Each slot absorbs one threshold step. " +
                      "Your **damage thresholds** (Major and Severe) equal the armor's base values plus your level. " +
                      `Your class (**${selectedClassData.name}**) has Starting Evasion **${selectedClassData.startingEvasion}** — ` +
                      "lighter armor suits higher evasion classes, heavier armor suits lower evasion classes."
                    }
                  />
                </div>
                <div className="flex-1 min-h-0 overflow-hidden border-t border-slate-700/30">
                  <ArmorSelectionPanel
                    armorId={armorId}
                    onArmorChange={setArmorId}
                    startingEvasion={selectedClassData.startingEvasion}
                  />
                </div>
              </div>
            )}

            {/* Step 7: Starting Equipment */}
            {step === 7 && selectedClassData && (
              <div className="flex flex-1 min-h-0 flex-col">
                <div className="px-6 pt-5 pb-3 shrink-0 space-y-3">
                  <div>
                    <h3 className="font-serif text-xl font-semibold text-[#f7f7ff]">Take Your Starting Equipment</h3>
                    <p className="text-sm text-[#b9baa3]/60 mt-0.5">
                      Every adventurer begins with a set of standard gear, plus one consumable and one personal item.
                    </p>
                  </div>
                  <CollapsibleSRDDescription
                    title="About Starting Equipment"
                    content={
                      "**SRD page 3, Step 5:** Add the following items to your Inventory: a torch, 50 feet of rope, basic supplies, " +
                      "and a handful of gold. Then choose either a **Minor Health Potion** (clear 1d4 HP) or a **Minor Stamina Potion** (clear 1d4 Stress). " +
                      "Finally, take one of your **class-specific items** listed on your class guide.\n\n" +
                      "**Gold (SRD page 58):** Gold is tracked in three tiers — Handfuls → Bags (10:1) → Chests (10:1). " +
                      "You start with 1 handful. You cannot have more than 1 chest at once."
                    }
                  />
                </div>
                <div className="flex-1 min-h-0 overflow-hidden border-t border-slate-700/30">
                  <StartingEquipmentPanel
                    className={selectedClassData.name}
                    classItems={selectedClassData.classItems.length > 0 ? selectedClassData.classItems : null}
                    selections={equipmentSelections}
                    onChange={setEquipmentSelections}
                  />
                </div>
              </div>
            )}

            {/* Step 8: Domain Deck Cards */}
            {step === 8 && selectedClassData && (
              <div className="flex flex-1 min-h-0 flex-col">
                <div className="px-6 pt-5 pb-3 shrink-0 space-y-3">
                  <div>
                    <h3 className="font-serif text-xl font-semibold text-[#f7f7ff]">Take Domain Deck Cards</h3>
                    <p className="text-sm text-[#b9baa3]/60 mt-0.5">
                      Choose 2 Level 1 cards from your class domains: {selectedClassData.domains.join(" & ")}.
                    </p>
                  </div>
                  <CollapsibleSRDDescription
                    title="About Domain Cards"
                    content={
                      "**SRD page 4:** Each domain card provides features your PC can use during adventures — unique attacks, spells, " +
                      "passive effects, downtime abilities, or one-time benefits.\n\n" +
                      `Your class (**${selectedClassData.name}**) has access to two domains: **${selectedClassData.domains.join("** and **")}**. ` +
                      "You may take 1 card from each domain or 2 cards from a single domain — your choice.\n\n" +
                      "**Recall Cost (SRD page 5):** The lightning bolt number on each card shows how many Stress you must mark " +
                      "to swap it from your vault into your loadout outside of a rest. During a rest, swaps are free.\n\n" +
                      "**Shared Domains:** Multiple classes share domains (e.g., Blade is shared by Guardian and Warrior). " +
                      "This has no special mechanical effect — you always draw from your own class's two domains only."
                    }
                  />
                </div>
                <div className="flex-1 min-h-0 overflow-hidden border-t border-slate-700/30">
                  <DomainCardSelectionPanel
                    classDomains={selectedClassData.domains}
                    selectedCardIds={selectedDomainCardIds}
                    onSelectionChange={setSelectedDomainCardIds}
                    characterLevel={character?.level ?? 1}
                  />
                </div>
              </div>
            )}

            {/* Step 9: Review */}
            {step === 9 && (
              <div className="flex-1 overflow-y-auto p-6">
                <div className="max-w-xl mx-auto space-y-6">
                  <h3 className="font-serif text-xl font-semibold text-[#f7f7ff]">
                    Confirm Your Changes
                  </h3>
                  
                  <div className="space-y-4">
                    {/* Class */}
                    <div className="rounded-lg border border-slate-700/60 bg-slate-900/40 p-4">
                      <p className="text-xs uppercase tracking-wider text-[#b9baa3]/50 font-medium mb-1">
                        Class
                      </p>
                      <p className="text-lg font-semibold text-[#f7f7ff]">
                        {selectedClassData?.name ?? "Not selected"}
                      </p>
                    </div>
                    
                    {/* Subclass */}
                    {selectedSubclass && (
                      <div className="rounded-lg border border-slate-700/60 bg-slate-900/40 p-4">
                        <p className="text-xs uppercase tracking-wider text-[#b9baa3]/50 font-medium mb-1">
                          Subclass
                        </p>
                        <p className="text-lg font-semibold text-[#f7f7ff]">
                          {selectedSubclass.name}
                        </p>
                      </div>
                    )}
                    
                    {/* Ancestry */}
                    <div className="rounded-lg border border-slate-700/60 bg-slate-900/40 p-4">
                      <p className="text-xs uppercase tracking-wider text-[#b9baa3]/50 font-medium mb-1">
                        Ancestry
                      </p>
                      <p className="text-lg font-semibold text-[#f7f7ff]">
                        {selectedAncestry?.name ?? "Not selected"}
                      </p>
                    </div>
                    
                    {/* Community */}
                    <div className="rounded-lg border border-slate-700/60 bg-slate-900/40 p-4">
                      <p className="text-xs uppercase tracking-wider text-[#b9baa3]/50 font-medium mb-1">
                        Community
                      </p>
                      <p className="text-lg font-semibold text-[#f7f7ff]">
                        {selectedCommunity?.name ?? "Not selected"}
                      </p>
                    </div>
                    
                     {/* Traits */}
                    {Object.keys(traitBonuses).length > 0 && (
                       <div className="rounded-lg border border-slate-700/60 bg-slate-900/40 p-4">
                         <p className="text-xs uppercase tracking-wider text-[#b9baa3]/50 font-medium mb-3">
                           Trait Bonuses
                         </p>
                         <div className="space-y-1">
                           {Object.entries(traitBonuses)
                             .sort((a, b) => b[1] - a[1])
                             .map(([trait, bonus]) => (
                               <div key={trait} className="flex items-center justify-between">
                                 <span className="text-sm text-[#b9baa3]/70">
                                   {trait.charAt(0).toUpperCase() + trait.slice(1)}
                                 </span>
                                 <span className={`font-semibold ${
                                   bonus > 0 ? "text-[#4ade80]" : "text-[#fe5f55]"
                                 }`}>
                                   {bonus > 0 ? "+" : ""}{bonus}
                                 </span>
                               </div>
                             ))}
                         </div>
                       </div>
                     )}

                    {/* Weapons */}
                    <div className="rounded-lg border border-slate-700/60 bg-slate-900/40 p-4">
                      <p className="text-xs uppercase tracking-wider text-[#b9baa3]/50 font-medium mb-3">
                        Weapons
                      </p>
                      <div className="space-y-2">
                        <div>
                          <span className="text-xs text-[#b9baa3]/50">Primary: </span>
                          <span className="text-sm font-semibold text-[#f7f7ff]">
                            {primaryWeapon?.name ?? "Not selected"}
                          </span>
                          {primaryWeapon && (
                            <span className="text-xs text-[#b9baa3]/50 ml-2">
                              {primaryWeapon.damageDie} · {primaryWeapon.range} · {primaryWeapon.burden}
                            </span>
                          )}
                        </div>
                        <div>
                          <span className="text-xs text-[#b9baa3]/50">Secondary: </span>
                          <span className="text-sm font-semibold text-[#f7f7ff]">
                            {secondaryWeapon?.name ?? <span className="italic text-[#b9baa3]/40">None</span>}
                          </span>
                          {secondaryWeapon && (
                            <span className="text-xs text-[#b9baa3]/50 ml-2">
                              {secondaryWeapon.damageDie} · {secondaryWeapon.range}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                     {/* Armor */}
                    {armorId && (() => {
                      const armor = TIER1_ARMOR.find((a) => a.id === armorId);
                      return armor ? (
                        <div className="rounded-lg border border-slate-700/60 bg-slate-900/40 p-4">
                          <p className="text-xs uppercase tracking-wider text-[#b9baa3]/50 font-medium mb-1">
                            Armor
                          </p>
                          <p className="text-lg font-semibold text-[#f7f7ff]">{armor.name}</p>
                          <p className="text-xs text-[#b9baa3]/50 mt-0.5">
                            Score {armor.baseArmorScore} · Major {armor.baseMajorThreshold + 1}+ · Severe {armor.baseSevereThreshold + 1}+
                            {armor.featureType && ` · ${armor.featureType}`}
                          </p>
                        </div>
                      ) : null;
                    })()}

                    {/* Starting Equipment */}
                    <div className="rounded-lg border border-slate-700/60 bg-slate-900/40 p-4">
                      <p className="text-xs uppercase tracking-wider text-[#b9baa3]/50 font-medium mb-3">
                        Starting Equipment
                      </p>
                      <div className="space-y-1.5">
                        {UNIVERSAL_STARTING_ITEMS.map((item) => (
                          <p key={item} className="text-sm text-[#b9baa3]/70">{item}</p>
                        ))}
                        <p className="text-sm text-[#b9baa3]/70">
                          {STARTING_GOLD.handfuls} handful of gold
                        </p>
                        {equipmentSelections.consumableId && (
                          <p className="text-sm font-semibold text-[#f7f7ff]">
                            {equipmentSelections.consumableId === "minor-health-potion"
                              ? "Minor Health Potion"
                              : "Minor Stamina Potion"}
                          </p>
                        )}
                        {equipmentSelections.classItem && (
                          <p className="text-sm font-semibold text-[#f7f7ff]">
                            {equipmentSelections.classItem}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Domain Cards */}
                    {selectedDomainCardIds.length > 0 && (
                      <div className="rounded-lg border border-slate-700/60 bg-slate-900/40 p-4">
                        <p className="text-xs uppercase tracking-wider text-[#b9baa3]/50 font-medium mb-2">
                          Domain Cards ({selectedDomainCardIds.length}/2)
                        </p>
                        <div className="space-y-1">
                          {selectedDomainCardIds.map((cardId) => (
                            <p key={cardId} className="text-sm font-semibold text-[#f7f7ff]">
                              {cardId}
                            </p>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {error && (
                    <div className="rounded-lg border border-[#fe5f55]/40 bg-[#fe5f55]/10 p-4">
                      <p className="text-sm text-[#fe5f55]">{error}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
            </div>{/* end main step content */}

            {/* Right: Step Summary Panel */}
            {(() => {
              const selectedArmorData = TIER1_ARMOR.find((a) => a.id === armorId);
              const steps: { num: number; name: string; done: boolean; summary: string | null }[] = [
                {
                  num: 1, name: "Class",
                  done: Boolean(classId),
                  summary: selectedClassData?.name ?? null,
                },
                {
                  num: 2, name: "Subclass",
                  done: Boolean(subclassId),
                  summary: selectedSubclass?.name ?? null,
                },
                {
                  num: 3, name: "Heritage",
                  done: Boolean(ancestryId && communityId),
                  summary: (selectedAncestry && selectedCommunity)
                    ? `${selectedAncestry.name} · ${selectedCommunity.name}`
                    : selectedAncestry?.name ?? selectedCommunity?.name ?? null,
                },
                {
                  num: 4, name: "Traits",
                  done: Object.keys(traitBonuses).length === 4,
                  summary: Object.keys(traitBonuses).length === 4 ? "Assigned" : null,
                },
                {
                  num: 5, name: "Weapons",
                  done: Boolean(primaryWeaponId),
                  summary: primaryWeapon?.name ?? null,
                },
                {
                  num: 6, name: "Armor",
                  done: Boolean(armorId),
                  summary: selectedArmorData?.name.replace(" Armor", "") ?? null,
                },
                {
                  num: 7, name: "Equipment",
                  done: Boolean(equipmentSelections.consumableId && equipmentSelections.classItem),
                  summary: equipmentSelections.consumableId
                    ? (equipmentSelections.consumableId === "minor-health-potion" ? "Health Potion" : "Stamina Potion")
                    : null,
                },
                {
                  num: 8, name: "Domain Cards",
                  done: selectedDomainCardIds.length === 2,
                  summary: selectedDomainCardIds.length > 0
                    ? `${selectedDomainCardIds.length}/2 selected`
                    : null,
                },
                {
                  num: 9, name: "Review & Save",
                  done: false,
                  summary: null,
                },
              ];
              return (
                <div className="hidden md:flex flex-col w-44 shrink-0 border-l border-slate-700/40 overflow-y-auto py-3">
                  <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-wider text-[#b9baa3]/30">
                    Steps
                  </p>
                  {steps.map((s) => (
                    <button
                      key={s.num}
                      type="button"
                      onClick={() => setStep(s.num as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9)}
                      className={`
                        w-full text-left px-3 py-2 transition-colors rounded-none
                        ${step === s.num
                          ? "bg-[#577399]/15 border-r-2 border-[#577399]"
                          : "hover:bg-slate-800/40 border-r-2 border-transparent"
                        }
                      `}
                    >
                      <div className="flex items-center gap-1.5">
                        <span className={`text-xs shrink-0 ${s.done ? "text-[#577399]" : "text-[#b9baa3]/25"}`}>
                          {s.done ? "✓" : `${s.num}.`}
                        </span>
                        <span className={`text-xs font-medium truncate ${step === s.num ? "text-[#f7f7ff]" : "text-[#b9baa3]/60"}`}>
                          {s.name}
                        </span>
                      </div>
                      {s.summary && (
                        <p className="text-[10px] text-[#b9baa3]/35 truncate pl-4 mt-0.5 leading-tight">
                          {s.summary}
                        </p>
                      )}
                    </button>
                  ))}
                </div>
              );
            })()}
          </div>{/* end flex content row */}
          
           <div className="shrink-0 border-t border-slate-700/40 px-6 py-4 flex items-center justify-between gap-4">
             <button
               type="button"
               onClick={() => {
                 if (step === 1) {
                   router.push(`/character/${characterId}`);
                 } else {
                   setStep((s) => (s - 1) as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9);
                 }
               }}
               className="
                 rounded-lg px-4 py-2.5 text-sm font-medium
                 border border-slate-700/60 text-[#b9baa3]/60
                 hover:border-slate-600 hover:text-[#b9baa3]
                 transition-colors
               "
             >
               {step === 1 ? "Cancel" : "← Back"}
             </button>
             
             <div className="flex gap-3">
               {step < 9 && (
                 <button
                   type="button"
                   onClick={() => setStep((s) => (s + 1) as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9)}
                   disabled={
                     (step === 1 && !canGoNext1) ||
                     (step === 2 && !canGoNext2) ||
                     (step === 3 && !canGoNext3) ||
                     (step === 4 && !canGoNext4) ||
                     (step === 5 && !canGoNext5) ||
                     (step === 6 && !canGoNext6) ||
                     (step === 7 && !canGoNext7) ||
                     (step === 8 && !canGoNext8)
                   }
                   className="
                     rounded-lg px-6 py-2.5 font-semibold text-sm
                     bg-[#577399] text-[#f7f7ff]
                     hover:bg-[#577399]/80
                     disabled:opacity-40 disabled:cursor-not-allowed
                     transition-colors shadow-sm
                   "
                 >
                   Next →
                 </button>
               )}
               
               {step === 9 && (
                 <button
                   type="button"
                   onClick={handleSave}
                   disabled={updateMutation.isPending}
                   className="
                     rounded-lg px-6 py-2.5 font-semibold text-sm
                     bg-[#577399] text-[#f7f7ff]
                     hover:bg-[#577399]/80
                     disabled:opacity-40 disabled:cursor-not-allowed
                     transition-colors shadow-sm
                   "
                 >
                   {updateMutation.isPending ? (
                     <span className="flex items-center gap-2">
                       <span className="h-3.5 w-3.5 animate-spin rounded-full border border-[#f7f7ff] border-t-transparent" />
                       Saving…
                     </span>
                   ) : (
                     "Save Changes ✦"
                   )}
                 </button>
               )}
             </div>
           </div>
        </div>
      </div>
    </div>
  );
}

