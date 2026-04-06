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
 *   3. Choose Ancestry
 *   4. Choose Community
 *   5. Assign Traits
 *   6. Choose Starting Weapons
 *   7. Choose Starting Armor
 *   8. Take Starting Equipment
 *   9. Create Your Experiences
 *  10. Take Domain Deck Cards
 *  11. Review & Save
 *
 * After saving, redirects back to character sheet.
 */

import React, { useState, useEffect, useMemo, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useCharacter, useUpdateCharacter } from "@/hooks/useCharacter";
import { useClass, useClasses, useAncestries, useCommunities, useDomainCard } from "@/hooks/useGameData";
import type { Character, AncestryData, CommunityData, CoreStats, Experience } from "@shared/types";
import { MarkdownContent } from "@/components/MarkdownContent";
import { CollapsibleSRDDescription } from "@/components/character/CollapsibleSRDDescription";
import { SourceBadge } from "@/components/SourceBadge";
import { SourceFilter, type SourceFilterValue } from "@/components/SourceFilter";
import { TraitAssignmentPanel, type TraitBonuses } from "@/components/character/TraitAssignmentPanel";
import { WeaponSelectionPanel } from "@/components/character/WeaponSelectionPanel";
import { ArmorSelectionPanel } from "@/components/character/ArmorSelectionPanel";
import { StartingEquipmentPanel, type StartingEquipmentSelections } from "@/components/character/StartingEquipmentPanel";
import { DomainCardSelectionPanel } from "@/components/character/DomainCardSelectionPanel";
import { ALL_TIER1_WEAPONS, TIER1_ARMOR, UNIVERSAL_STARTING_ITEMS, STARTING_GOLD } from "@/lib/srdEquipment";
import { loadBuilderDraft, useBuilderSessionStorage } from "@/hooks/useBuilderSessionStorage";

// ─── DomainCardName ─────────────────────────────────────────────────────────
// Small component that resolves a "domain/cardId" string to a human-friendly name.

function DomainCardName({ cardId }: { cardId: string }) {
  const parts = cardId.includes("/") ? cardId.split("/") : null;
  const domain = parts?.[0];
  const id = parts?.[1] ?? cardId;
  const { data: card } = useDomainCard(domain, id);
  if (card) {
    return <>{card.name}</>;
  }
  // Fallback: title-case the slug while loading
  const fallback = id.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  return <span className="text-parchment-500">{fallback}</span>;
}

// ─── DomainCardSummary ────────────────────────────────────────────────────────
// Renders the full card with name, domain, recall cost, and description
// for use in the Step 11 review panel.

function DomainCardSummary({ cardId }: { cardId: string }) {
  const parts = cardId.includes("/") ? cardId.split("/") : null;
  const domain = parts?.[0];
  const id = parts?.[1] ?? cardId;
  const { data: card } = useDomainCard(domain, id);

  if (!card) {
    // Loading skeleton
    const fallback = id.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    return (
      <div className="rounded-lg border border-slate-700/60 bg-slate-900/40 p-3">
        <p className="text-sm font-semibold text-parchment-500">{fallback}</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-slate-700/60 bg-slate-900/40 p-3 space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm font-semibold text-[#f7f7ff]">{card.name}</span>
        <span className="text-xs text-parchment-600">{card.domain}</span>
        {card.isGrimoire && (
          <span className="text-xs text-[#daa520]/70 uppercase tracking-wider">Grimoire</span>
        )}
        <span className="ml-auto text-xs text-parchment-600 shrink-0">
          Recall {card.level}⚡
        </span>
      </div>
      <div className="text-sm text-[#b9baa3]/60 leading-relaxed">
        {card.isGrimoire && card.grimoire.length > 0 ? (
          <div className="space-y-2">
            {card.grimoire.map((ability, i) => (
              <div key={i}>
                <span className="font-semibold text-[#b9baa3]/80">{ability.name}: </span>
                <MarkdownContent className="inline text-sm text-[#b9baa3]/60">
                  {ability.description}
                </MarkdownContent>
              </div>
            ))}
          </div>
        ) : (
          <MarkdownContent className="text-sm text-[#b9baa3]/60">
            {card.description}
          </MarkdownContent>
        )}
      </div>
    </div>
  );
}

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

  // ── Session-storage draft ────────────────────────────────────────────────
  // Load any in-progress draft once (synchronously on first render) so the
  // useState initialisers below can use it.  We intentionally capture this
  // outside a useEffect so the values are available for the initial render.
  const sessionDraft = useMemo(
    () => (characterId ? loadBuilderDraft(characterId) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [] // run only on mount — characterId is stable for the lifetime of this page
  );
  
  // Queries
  const { data: character, isLoading: charLoading } = useCharacter(characterId);
  const { data: classesData } = useClasses();
  const { data: ancestriesData } = useAncestries();
  const { data: communitiesData } = useCommunities();
  
  // Builder state
  // Priority: session draft > server character data > empty defaults.
  // The session draft is only applied when it exists (i.e. the user was
  // mid-wizard and refreshed).  For a fresh builder or an already-saved
  // character the normal server-recovery path wins.
  const updateMutation = useUpdateCharacter(characterId);
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11>(
    () => (sessionDraft?.step as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11) ?? 1
  );
  const [classId, setClassId] = useState(
    sessionDraft?.classId ?? character?.classId ?? ""
  );
  const [subclassId, setSubclassId] = useState(
    sessionDraft?.subclassId ?? character?.subclassId ?? ""
  );
  const [ancestryId, setAncestryId] = useState(
    sessionDraft?.ancestryId ?? character?.ancestryId ?? ""
  );
  const [communityId, setCommunityId] = useState(
    sessionDraft?.communityId ?? character?.communityId ?? ""
  );
  const [traitBonuses, setTraitBonuses] = useState<TraitBonuses>(
    sessionDraft?.traitBonuses ?? character?.traitBonuses ?? {}
  );
  const [primaryWeaponId, setPrimaryWeaponId] = useState<string | null>(
    sessionDraft?.primaryWeaponId ?? character?.weapons?.primary?.weaponId ?? null
  );
  const [secondaryWeaponId, setSecondaryWeaponId] = useState<string | null>(
    sessionDraft?.secondaryWeaponId ?? character?.weapons?.secondary?.weaponId ?? null
  );
  const [armorId, setArmorId] = useState<string | null>(() => {
    if (sessionDraft?.armorId !== undefined) return sessionDraft.armorId;
    // Recover armor from inventory: we store the armor name there on save.
    const inv = character?.inventory ?? [];
    return TIER1_ARMOR.find((a) => inv.includes(a.name))?.id ?? null;
  });

  // Step 8: Starting Equipment
  const [equipmentSelections, setEquipmentSelections] = useState<StartingEquipmentSelections>(() => {
    if (sessionDraft?.equipmentSelections) return sessionDraft.equipmentSelections;
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

  // Step 10: Domain Cards
  const [selectedDomainCardIds, setSelectedDomainCardIds] = useState<string[]>(
    sessionDraft?.selectedDomainCardIds ?? character?.domainLoadout ?? []
  );

  // Step 9: Experiences (inserted before Domain Cards in the wizard flow)
  const [experiences, setExperiences] = useState<Experience[]>(() => {
    if (sessionDraft?.experiences) return sessionDraft.experiences;
    if (character?.experiences?.length) return character.experiences;
    return [{ name: "", bonus: 2 }, { name: "", bonus: 2 }];
  });

  // Character name (editable in Review step)
  const [characterName, setCharacterName] = useState(
    sessionDraft?.characterName ?? character?.name ?? ""
  );

  const [heritageTab, setHeritageTab] = useState<"ancestry" | "community">(
    sessionDraft?.heritageTab ?? "ancestry"
  );
  const [error, setError] = useState<string | null>(null);
  const [classSourceFilter, setClassSourceFilter] = useState<SourceFilterValue>("all");
  const [heritageSourceFilter, setHeritageSourceFilter] = useState<SourceFilterValue>("all");

  // ── Persist builder state to sessionStorage on every change ─────────────
  const builderDraft = useMemo(
    () => ({
      step,
      classId,
      subclassId,
      ancestryId,
      communityId,
      traitBonuses,
      primaryWeaponId,
      secondaryWeaponId,
      armorId,
      equipmentSelections,
      selectedDomainCardIds,
      experiences,
      heritageTab,
      characterName,
    }),
    [
      step, classId, subclassId, ancestryId, communityId,
      traitBonuses, primaryWeaponId, secondaryWeaponId,
      armorId, equipmentSelections, selectedDomainCardIds, experiences, heritageTab,
      characterName,
    ]
  );
  const { clearSession } = useBuilderSessionStorage(characterId, builderDraft);
  
  // Get full class data for currently selected class
  const { data: selectedClassData } = useClass(classId || undefined);

  // ── Backfill state from server character data once it loads ─────────────
  // The useState initialisers above run synchronously before `character` arrives
  // from the server, so they fall through to empty defaults.  This effect watches
  // for character to arrive and fills in any fields that are still at their
  // empty default — without clobbering values the user has already changed.
  useEffect(() => {
    if (!character) return;
    if (!classId   && character.classId)    setClassId(character.classId);
    if (!subclassId && character.subclassId) setSubclassId(character.subclassId);
    if (!ancestryId && character.ancestryId) setAncestryId(character.ancestryId);
    if (!communityId && character.communityId) setCommunityId(character.communityId);
    if (!characterName && character.name) setCharacterName(character.name);
    if (!primaryWeaponId && character.weapons?.primary?.weaponId)
      setPrimaryWeaponId(character.weapons.primary.weaponId);
    if (!secondaryWeaponId && character.weapons?.secondary?.weaponId)
      setSecondaryWeaponId(character.weapons.secondary.weaponId);
    if (!armorId) {
      const inv = character.inventory ?? [];
      const recovered = TIER1_ARMOR.find((a) => inv.includes(a.name))?.id ?? null;
      if (recovered) setArmorId(recovered);
    }
    if (!selectedDomainCardIds.length && character.domainLoadout?.length) {
      setSelectedDomainCardIds(character.domainLoadout);
    }
    // Consumable recovery from inventory
    setEquipmentSelections((prev) => {
      if (prev.consumableId) return prev;
      const inv = character.inventory ?? [];
      const consumableId = inv.includes("Minor Health Potion")
        ? "minor-health-potion"
        : inv.includes("Minor Stamina Potion")
          ? "minor-stamina-potion"
          : null;
      if (!consumableId) return prev;
      return { ...prev, consumableId };
    });
    // Trait bonuses backfill
    if (!Object.keys(traitBonuses).length && character.traitBonuses && Object.keys(character.traitBonuses).length) {
      setTraitBonuses(character.traitBonuses);
    }
    // Experiences backfill
    if (experiences.every((e) => !e.name) && character.experiences?.length) {
      setExperiences(character.experiences);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [character]);

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

  // ── Scroll-into-view refs for Step 1 (class list), Step 3 (ancestry list), Step 4 (community list) ──
  const classListRef = useRef<HTMLDivElement>(null);
  const ancestryListRef = useRef<HTMLDivElement>(null);
  const communityListRef = useRef<HTMLDivElement>(null);

  // When entering Step 1 with a pre-selected class, scroll it into view.
  useEffect(() => {
    if (step !== 1 || !classId || !classListRef.current) return;
    const el = classListRef.current.querySelector<HTMLElement>("[data-selected='true']");
    if (el) el.scrollIntoView({ block: "nearest", behavior: "instant" });
  }, [step, classId]);

  // When entering Step 3 with a pre-selected ancestry, scroll it into view.
  useEffect(() => {
    if (step !== 3 || !ancestryId || !ancestryListRef.current) return;
    const el = ancestryListRef.current.querySelector<HTMLElement>("[data-selected='true']");
    if (el) el.scrollIntoView({ block: "nearest", behavior: "instant" });
  }, [step, ancestryId]);

  // When entering Step 4 with a pre-selected community, scroll it into view.
  useEffect(() => {
    if (step !== 4 || !communityId || !communityListRef.current) return;
    const el = communityListRef.current.querySelector<HTMLElement>("[data-selected='true']");
    if (el) el.scrollIntoView({ block: "nearest", behavior: "instant" });
  }, [step, communityId]);
  
  // Validators
  const canGoNext1 = Boolean(classId);
  const canGoNext2 = Boolean(subclassId);
  const canGoNext3 = Boolean(ancestryId);
  const canGoNext4 = Boolean(communityId);
  const canGoNext5 = Object.keys(traitBonuses).length === 4;
  const canGoNext6 = Boolean(primaryWeaponId); // secondary is optional
  const canGoNext7 = Boolean(armorId);
  const canGoNext8 = Boolean(equipmentSelections.consumableId && equipmentSelections.classItem);
  // Step 9: Experiences — both experience names must be non-empty
  const canGoNext9 = experiences.length >= 2 && experiences.every((e) => e.name.trim().length > 0);
  // Post-Level-1: domain cards are managed via the level-up wizard — always allow Next.
  const isLockedDomainStep = Boolean(character && character.level > 1);
  const canGoNext10 = isLockedDomainStep || selectedDomainCardIds.length === 2;

  // ── Steps 6 (weapons) and 7 (armor): skip when already saved ────────────
  // Once weapons/armor have been selected and persisted via a previous builder run,
  // they are managed from the equipment page on the character sheet.
  // Detect from the server character data (not local draft state).
  const hasExistingWeapons = Boolean(character?.weapons?.primary?.weaponId);
  const hasExistingArmor = Boolean(
    character?.inventory && TIER1_ARMOR.some((a) => character.inventory!.includes(a.name))
  );

  // Build the ordered list of active steps (skipping locked equipment steps).
  const activeSteps = useMemo<Array<1|2|3|4|5|6|7|8|9|10|11>>(() => {
    const all: Array<1|2|3|4|5|6|7|8|9|10|11> = [1,2,3,4,5,6,7,8,9,10,11];
    return all.filter((s) => {
      if (s === 6 && hasExistingWeapons) return false;
      if (s === 7 && hasExistingArmor) return false;
      return true;
    });
  }, [hasExistingWeapons, hasExistingArmor]);

  function nextActiveStep(current: number): number {
    const idx = activeSteps.indexOf(current as 1|2|3|4|5|6|7|8|9|10|11);
    return idx !== -1 && idx < activeSteps.length - 1 ? activeSteps[idx + 1] : current;
  }
  function prevActiveStep(current: number): number {
    const idx = activeSteps.indexOf(current as 1|2|3|4|5|6|7|8|9|10|11);
    return idx > 0 ? activeSteps[idx - 1] : current;
  }

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
        // Add selected weapons to inventory so the character sheet can resolve them
        ...(primaryWeapon ? [primaryWeapon.name] : []),
        ...(secondaryWeapon ? [secondaryWeapon.name] : []),
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
        name: characterName.trim() || character?.name || "Unnamed Character",
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
          primary:   { weaponId: primaryWeaponId   ?? null },
          secondary: { weaponId: secondaryWeaponId ?? null },
        },
        gold: STARTING_GOLD,
        inventory,
        // Only write domain card fields at character creation (Level 1).
        // Post-Level-1, domain cards are managed exclusively via the level-up wizard.
        ...(isLockedDomainStep ? {} : {
          domainLoadout: selectedDomainCardIds,
          domainVault: selectedDomainCardIds,
        }),
        // Save experiences — filter out any empty entries just in case.
        experiences: experiences.filter((e) => e.name.trim()),
      } as Partial<Character>);
      
      // Redirect back to character sheet
      clearSession();
      router.push(`/character/${updated.characterId ?? characterId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update character");
    }
  };
  
  if (charLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a100d]">
        <div
          className="h-8 w-8 animate-spin rounded-full border-2 border-[#577399] border-t-transparent"
          role="status"
          aria-label="Loading character"
        >
          <span className="sr-only">Loading character…</span>
        </div>
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
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-2 sm:p-4"
        role="presentation"
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="builder-title"
          className="
            w-full max-w-5xl min-w-0 overflow-hidden rounded-2xl border border-slate-700/60
            bg-[#0a100d] shadow-2xl flex flex-col
            max-h-[92vh]
          "
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700/40 shrink-0">
            <div>
              <h2 id="builder-title" className="font-serif text-xl font-semibold text-[#f7f7ff]">
                Edit Character
              </h2>
              <p className="text-sm text-[#b9baa3]/60 mt-0.5">
                {characterName || character.name} • Step {step} of 11
              </p>
            </div>
            
            <button
              type="button"
              onClick={() => router.push(`/character/${characterId}`)}
              className="h-11 w-11 flex items-center justify-center text-parchment-600 hover:text-parchment-400 text-2xl leading-none transition-colors focus:outline-none focus:ring-2 focus:ring-[#577399] rounded-lg"
              aria-label="Close builder"
            >
              ×
            </button>
          </div>

          {/* Mobile step progress bar — hidden on md+ where the sidebar step panel is visible */}
          <div className="md:hidden px-4 sm:px-6 pb-3 shrink-0">
            <div
              className="flex items-center gap-1"
              role="progressbar"
              aria-valuenow={step}
              aria-valuemin={1}
              aria-valuemax={11}
              aria-label={`Step ${step} of 11`}
            >
              {Array.from({ length: 11 }, (_, i) => (
                <div
                  key={i}
                  aria-hidden="true"
                  className={`
                    h-1 flex-1 rounded-full transition-colors
                    ${i + 1 <= step ? "bg-[#577399]" : "bg-slate-700/60"}
                  `}
                />
              ))}
            </div>
            <p className="text-xs text-[#b9baa3]/60 mt-1">
              Step {step} of 11
            </p>
          </div>
          
          {/* Content */}
          <div className="flex flex-1 min-h-0 overflow-hidden">
            {/* Main step content */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden min-w-0">
             {/* Step 1: Choose Class */}
            {step === 1 && (
              <div className="flex flex-col sm:flex-row sm:h-full">
                {/* Left: class list — full width stacked on mobile, fixed sidebar on sm+ */}
                <div className="w-full sm:w-64 lg:w-72 shrink-0 border-b sm:border-b-0 sm:border-r border-slate-700/40 flex flex-col max-h-[40vh] sm:max-h-none overflow-y-auto">
                  <div className="px-4 pt-3 pb-2 shrink-0 space-y-2">
                    <p className="text-xs font-medium uppercase tracking-wider text-parchment-500">
                      Choose a Class
                    </p>
                    <SourceFilter value={classSourceFilter} onChange={setClassSourceFilter} />
                  </div>
                 <div className="flex-1 overflow-y-auto overflow-x-hidden min-w-0" ref={classListRef}>
                    {[...(classesData?.classes ?? [])]
                      .filter((c) => classSourceFilter === "all" || c.source === classSourceFilter)
                      .sort((a, b) => a.name.localeCompare(b.name)).map((c) => (
                       <button
                         key={c.classId}
                         type="button"
                         data-selected={classId === c.classId ? "true" : undefined}
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
                        <p className="text-sm font-semibold text-[#f7f7ff] flex items-center gap-1.5">
                          {c.name}
                          <SourceBadge source={c.source} size="xs" />
                        </p>
                        {c.subclasses.length > 0 && (
                          <p className="text-sm text-parchment-500 mt-0.5">
                            {c.subclasses.map((s) => s.name).join(" · ")}
                          </p>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
                
                {/* Right: preview */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 min-h-[120px]">
                  {!classId ? (
                    <div className="flex h-full items-center justify-center">
                      <div className="text-center space-y-3">
                        <div className="text-4xl opacity-20" aria-hidden="true">⚔️</div>
                        <p className="text-sm text-parchment-600">Select a class to see details</p>
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
                          <span className="text-xs uppercase tracking-wider text-parchment-500">Evasion</span>
                          <span className="rounded border border-slate-700 bg-slate-900 px-2.5 py-0.5 font-bold">
                            {selectedClassData.startingEvasion}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs uppercase tracking-wider text-parchment-500">Hit Points</span>
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
                      
                      {(selectedClassData.classFeatures?.length ?? 0) > 0 && (
                        <div>
                          <h4 className="font-semibold text-[#f7f7ff] mb-2">Class Feature{selectedClassData.classFeatures.length > 1 ? "s" : ""}</h4>
                          <div className="space-y-2">
                            {selectedClassData.classFeatures.map((feature) => (
                              <div key={feature.name} className="rounded-lg border border-slate-700/60 bg-slate-850/50 px-4 py-3">
                                <p className="text-sm font-semibold text-[#f7f7ff] mb-1">{feature.name}</p>
                                <MarkdownContent className="text-base text-[#b9baa3]/70">
                                  {[
                                    feature.description,
                                    ...feature.options.map((o) => `- ${o}`),
                                  ].filter(Boolean).join("\n\n")}
                                </MarkdownContent>
                              </div>
                            ))}
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
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 max-w-2xl mx-auto w-full min-h-0">
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
                          <MarkdownContent className="text-base text-[#b9baa3]/70">
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
                        <p className="text-xs uppercase tracking-wider text-parchment-500 mb-2">
                          Foundation Features
                        </p>
                        <div className="rounded-lg border border-slate-700/60 bg-slate-850/50 p-3 space-y-2">
                          {selectedSubclass.foundationFeatures.map((f) => (
                            <div key={f.name}>
                              <p className="text-sm font-semibold text-[#f7f7ff]">{f.name}</p>
                              <MarkdownContent className="text-sm text-[#b9baa3]/70">
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
            
            {/* Step 3: Choose Ancestry */}
            {step === 3 && (
              <div className="flex flex-col sm:flex-row sm:h-full">
                {/* Left pane: ancestry list — full width stacked on mobile, fixed sidebar on sm+ */}
                <div className="w-full sm:w-64 lg:w-72 shrink-0 border-b sm:border-b-0 sm:border-r border-slate-700/40 flex flex-col max-h-[40vh] sm:max-h-none overflow-y-auto">
                  <div className="px-4 pt-3 pb-2 shrink-0 space-y-2">
                    <p className="text-xs font-medium uppercase tracking-wider text-parchment-500">
                      Choose an Ancestry
                    </p>
                    <SourceFilter value={heritageSourceFilter} onChange={setHeritageSourceFilter} />
                  </div>
                  <div className="flex-1 overflow-y-auto overflow-x-hidden min-w-0" ref={ancestryListRef}>
                    {ancestriesData?.ancestries
                      .filter((a) => heritageSourceFilter === "all" || a.source === heritageSourceFilter)
                      .map((a) => (
                       <button
                         key={a.ancestryId}
                         type="button"
                         data-selected={ancestryId === a.ancestryId ? "true" : undefined}
                         onClick={() => setAncestryId(a.ancestryId)}
                        className={`
                          w-full text-left px-4 py-3 transition-colors
                          ${ancestryId === a.ancestryId
                            ? "bg-[#577399]/20 border-l-2 border-[#577399]"
                            : "border-l-2 border-transparent hover:bg-slate-800/60"
                          }
                        `}
                      >
                        <p className="text-sm font-semibold text-[#f7f7ff] flex items-center gap-1.5">
                          {a.name}
                          <SourceBadge source={a.source} size="xs" />
                        </p>
                        <p className="text-sm text-parchment-500 truncate">
                          {a.traitName}{a.secondTraitName ? ` · ${a.secondTraitName}` : ""}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
                
                {/* Right pane: ancestry detail */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 min-h-[120px]">
                  {!ancestryId && (
                    <div className="flex h-full items-center justify-center">
                      <div className="text-center space-y-3">
                        <div className="text-4xl opacity-20" aria-hidden="true">🌿</div>
                        <p className="text-sm text-parchment-600">Select an ancestry to see details</p>
                      </div>
                    </div>
                  )}
                  
                  {selectedAncestry && (
                    <div className="space-y-4">
                      <div>
                        <h3 className="font-serif text-2xl font-bold text-[#f7f7ff]">{selectedAncestry.name}</h3>
                        {selectedAncestry.flavorText && (
                          <MarkdownContent className="mt-2 text-base text-parchment-500">
                            {selectedAncestry.flavorText}
                          </MarkdownContent>
                        )}
                      </div>
                      <div className="rounded-lg border border-slate-700/60 bg-slate-850/50 px-4 py-3 space-y-2">
                        <p className="text-xs font-semibold uppercase text-[#577399]">Primary Trait</p>
                        <p className="text-sm font-semibold text-[#f7f7ff]">{selectedAncestry.traitName}</p>
                        <MarkdownContent className="text-base text-[#b9baa3]/70">
                          {selectedAncestry.traitDescription}
                        </MarkdownContent>
                      </div>
                      {selectedAncestry.secondTraitName && (
                        <div className="rounded-lg border border-slate-700/60 bg-slate-850/50 px-4 py-3 space-y-2">
                          <p className="text-xs font-semibold uppercase text-[#577399]">Secondary Trait</p>
                          <p className="text-sm font-semibold text-[#f7f7ff]">{selectedAncestry.secondTraitName}</p>
                          {selectedAncestry.secondTraitDescription && (
                            <MarkdownContent className="text-base text-[#b9baa3]/70">
                              {selectedAncestry.secondTraitDescription}
                            </MarkdownContent>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* Step 4: Choose Community */}
            {step === 4 && (
              <div className="flex flex-col sm:flex-row sm:h-full">
                {/* Left pane: community list — full width stacked on mobile, fixed sidebar on sm+ */}
                <div className="w-full sm:w-64 lg:w-72 shrink-0 border-b sm:border-b-0 sm:border-r border-slate-700/40 flex flex-col max-h-[40vh] sm:max-h-none overflow-y-auto">
                  <div className="px-4 pt-3 pb-2 shrink-0 space-y-2">
                    <p className="text-xs font-medium uppercase tracking-wider text-parchment-500">
                      Choose a Community
                    </p>
                    <SourceFilter value={heritageSourceFilter} onChange={setHeritageSourceFilter} />
                  </div>
                  <div className="flex-1 overflow-y-auto overflow-x-hidden min-w-0" ref={communityListRef}>
                    {communitiesData?.communities
                      .filter((c) => heritageSourceFilter === "all" || c.source === heritageSourceFilter)
                      .map((c) => (
                       <button
                         key={c.communityId}
                         type="button"
                         data-selected={communityId === c.communityId ? "true" : undefined}
                         onClick={() => setCommunityId(c.communityId)}
                        className={`
                          w-full text-left px-4 py-3 transition-colors
                          ${communityId === c.communityId
                            ? "bg-[#577399]/20 border-l-2 border-[#577399]"
                            : "border-l-2 border-transparent hover:bg-slate-800/60"
                          }
                        `}
                      >
                        <p className="text-sm font-semibold text-[#f7f7ff] flex items-center gap-1.5">
                          {c.name}
                          <SourceBadge source={c.source} size="xs" />
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
                
                {/* Right pane: community detail */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 min-h-[120px]">
                  {!communityId && (
                    <div className="flex h-full items-center justify-center">
                      <div className="text-center space-y-3">
                        <div className="text-4xl opacity-20" aria-hidden="true">🏘</div>
                        <p className="text-sm text-parchment-600">Select a community to see details</p>
                      </div>
                    </div>
                  )}
                  
                  {selectedCommunity && (
                    <div className="space-y-4">
                      <div>
                        <h3 className="font-serif text-2xl font-bold text-[#f7f7ff]">{selectedCommunity.name}</h3>
                        {selectedCommunity.flavorText && (
                          <MarkdownContent className="mt-2 text-base text-parchment-500">
                            {selectedCommunity.flavorText}
                          </MarkdownContent>
                        )}
                      </div>
                      <div className="rounded-lg border border-slate-700/60 bg-slate-850/50 px-4 py-3 space-y-2">
                        <p className="text-xs font-semibold uppercase text-[#577399]">Trait</p>
                        <p className="text-sm font-semibold text-[#f7f7ff]">{selectedCommunity.traitName}</p>
                        <MarkdownContent className="text-base text-[#b9baa3]/70">
                          {selectedCommunity.traitDescription}
                        </MarkdownContent>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* Step 5: Assign Traits */}
            {step === 5 && (
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 max-w-2xl mx-auto w-full min-h-0">
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
            
            {/* Step 6: Choose Starting Weapons */}
            {step === 6 && (
              <div className="flex flex-1 min-h-0 flex-col">
                <div className="px-4 sm:px-6 pt-4 sm:pt-5 pb-3 shrink-0 space-y-3">
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
                    traitBonuses={traitBonuses}
                  />
                </div>
              </div>
            )}

            {/* Step 7: Choose Starting Armor */}
            {step === 7 && selectedClassData && (
              <div className="flex flex-1 min-h-0 flex-col">
                <div className="px-4 sm:px-6 pt-4 sm:pt-5 pb-3 shrink-0 space-y-3">
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
                    armorRec={selectedClassData.armorRec ?? []}
                  />
                </div>
              </div>
            )}

            {/* Step 8: Starting Equipment */}
            {step === 8 && selectedClassData && (
              <div className="flex flex-1 min-h-0 flex-col">
                <div className="px-4 sm:px-6 pt-4 sm:pt-5 pb-3 shrink-0 space-y-3">
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

            {/* Step 9: Create Your Experiences */}
            {step === 9 && (
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 max-w-2xl mx-auto w-full min-h-0">
                <div>
                  <h3 className="font-serif text-2xl font-bold text-[#f7f7ff] mb-1">
                    Create Your Experiences
                  </h3>
                  <p className="text-sm text-[#b9baa3]/70">
                    Choose 2 experiences that reflect your character's background, skills, or training. Each starts at +2.
                  </p>
                </div>

                <CollapsibleSRDDescription
                  title="What are Experiences?"
                  content={
                    "**SRD Step 7:** Experiences represent your character's prior knowledge, training, or background. " +
                    "When an experience is relevant to a dice roll, you can spend **1 Hope** to add your experience bonus to the result.\n\n" +
                    "At character creation you choose **2 experiences**, each starting at **+2**. " +
                    "You'll gain additional experiences at tier achievement levels (2, 5, and 8), and can increase existing experience bonuses through advancement.\n\n" +
                    "Experiences are free-text — name them whatever fits your character. Here are some example categories:\n\n" +
                    "**Backgrounds:** Sailor, Blacksmith, Diplomat, Hermit, Soldier, Scholar\n\n" +
                    "**Characteristics:** Quick-witted, Eagle-eyed, Silver-tongued, Unshakeable\n\n" +
                    "**Specialties:** Lockpicking, Herbalism, Tracking, Cartography\n\n" +
                    "**Skills:** Athletics, Stealth, Persuasion, Arcana, Survival\n\n" +
                    "**Phrases:** \"I Know a Guy\", \"Nothing Surprises Me\", \"Read the Room\""
                  }
                />

                <div className="space-y-4">
                  {experiences.map((exp, i) => (
                    <div
                      key={i}
                      className="rounded-lg border border-slate-700/60 bg-slate-900/40 p-4 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <label
                          htmlFor={`experience-name-${i}`}
                          className="text-xs uppercase tracking-wider text-parchment-500 font-medium"
                        >
                          Experience {i + 1}
                        </label>
                        <span className="rounded border border-[#577399]/50 bg-[#577399]/10 px-2 py-0.5 text-xs font-semibold text-[#577399]">
                          +{exp.bonus}
                        </span>
                      </div>
                      <input
                        id={`experience-name-${i}`}
                        type="text"
                        value={exp.name}
                        onChange={(e) => {
                          const updated = [...experiences];
                          updated[i] = { ...updated[i], name: e.target.value };
                          setExperiences(updated);
                        }}
                        placeholder={i === 0 ? 'e.g. "Sailor" or "Herbalism"' : 'e.g. "Quick-witted" or "I Know a Guy"'}
                        maxLength={60}
                        className="
                          w-full rounded-lg border border-slate-700/60 bg-[#0a100d]
                          px-4 py-2.5 text-base text-[#f7f7ff]
                          placeholder:text-parchment-600
                          focus:outline-none focus:ring-2 focus:ring-[#577399] focus:border-transparent
                          transition-colors
                        "
                      />
                    </div>
                  ))}
                </div>

                <div className="rounded-lg border border-[#daa520]/30 bg-[#daa520]/5 p-4">
                  <p className="text-sm text-[#daa520]/90 font-medium mb-1">How Experiences Work</p>
                  <p className="text-sm text-[#b9baa3]/70 leading-relaxed">
                    When you make a roll where an experience is relevant, you may spend <strong className="text-[#f7f7ff]">1 Hope</strong> to
                    add your experience bonus to the result. Your GM decides if the experience applies.
                  </p>
                </div>
              </div>
            )}

            {/* Step 10: Domain Deck Cards */}
            {step === 10 && selectedClassData && (
              <div className="flex flex-1 min-h-0 flex-col">
                <div className="px-4 sm:px-6 pt-4 sm:pt-5 pb-3 shrink-0 space-y-3">
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
                     onSelectionChange={isLockedDomainStep ? () => {} : setSelectedDomainCardIds}
                     characterLevel={character?.level ?? 1}
                     lockedCardIds={isLockedDomainStep ? (character?.domainVault ?? character?.domainLoadout ?? []) : undefined}
                   />
                </div>
              </div>
            )}

            {/* Step 11: Review */}
            {step === 11 && (
              <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6 min-h-0">
                <div className="max-w-xl mx-auto space-y-6">
                  <h3 className="font-serif text-xl font-semibold text-[#f7f7ff]">
                    Confirm Your Changes
                  </h3>
                  
                  <div className="space-y-4">
                    {/* Character Name */}
                    <div className="rounded-lg border border-slate-700/60 bg-slate-900/40 p-4">
                      <label
                        htmlFor="character-name-input"
                        className="text-xs uppercase tracking-wider text-parchment-500 font-medium mb-2 block"
                      >
                        Character Name
                      </label>
                      <input
                        id="character-name-input"
                        type="text"
                        value={characterName}
                        onChange={(e) => setCharacterName(e.target.value)}
                        placeholder="Enter a name for your character"
                        maxLength={60}
                        className="
                          w-full rounded-lg border border-slate-700/60 bg-[#0a100d]
                          px-4 py-2.5 text-lg font-serif font-semibold text-[#f7f7ff]
                          placeholder:text-parchment-600
                          focus:outline-none focus:ring-2 focus:ring-[#577399] focus:border-transparent
                          transition-colors
                        "
                      />
                      <p className="text-xs text-parchment-600 mt-1.5">
                        You can always rename your character later.
                      </p>
                    </div>

                    {/* Class */}
                    <div className="rounded-lg border border-slate-700/60 bg-slate-900/40 p-4">
                      <p className="text-xs uppercase tracking-wider text-parchment-500 font-medium mb-1">
                        Class
                      </p>
                      <p className="text-lg font-semibold text-[#f7f7ff]">
                        {selectedClassData?.name ?? "Not selected"}
                      </p>
                    </div>
                    
                    {/* Subclass */}
                    {selectedSubclass && (
                      <div className="rounded-lg border border-slate-700/60 bg-slate-900/40 p-4">
                        <p className="text-xs uppercase tracking-wider text-parchment-500 font-medium mb-1">
                          Subclass
                        </p>
                        <p className="text-lg font-semibold text-[#f7f7ff]">
                          {selectedSubclass.name}
                        </p>
                      </div>
                    )}
                    
                    {/* Ancestry */}
                    <div className="rounded-lg border border-slate-700/60 bg-slate-900/40 p-4">
                      <p className="text-xs uppercase tracking-wider text-parchment-500 font-medium mb-1">
                        Ancestry
                      </p>
                      <p className="text-lg font-semibold text-[#f7f7ff]">
                        {selectedAncestry?.name ?? "Not selected"}
                      </p>
                    </div>
                    
                    {/* Community */}
                    <div className="rounded-lg border border-slate-700/60 bg-slate-900/40 p-4">
                      <p className="text-xs uppercase tracking-wider text-parchment-500 font-medium mb-1">
                        Community
                      </p>
                      <p className="text-lg font-semibold text-[#f7f7ff]">
                        {selectedCommunity?.name ?? "Not selected"}
                      </p>
                    </div>
                    
                     {/* Traits */}
                    {Object.keys(traitBonuses).length > 0 && (
                       <div className="rounded-lg border border-slate-700/60 bg-slate-900/40 p-4">
                         <p className="text-xs uppercase tracking-wider text-parchment-500 font-medium mb-3">
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
                      <p className="text-xs uppercase tracking-wider text-parchment-500 font-medium mb-3">
                        Weapons
                      </p>
                      <div className="space-y-2">
                        <div>
                          <span className="text-xs text-parchment-500">Primary: </span>
                          <span className="text-sm font-semibold text-[#f7f7ff]">
                            {primaryWeapon?.name ?? "Not selected"}
                          </span>
                          {primaryWeapon && (
                            <span className="text-xs text-parchment-500 ml-1 sm:ml-2 block sm:inline">
                              {primaryWeapon.damageDie} · {primaryWeapon.range} · {primaryWeapon.burden}
                            </span>
                          )}
                        </div>
                        <div>
                          <span className="text-xs text-parchment-500">Secondary: </span>
                          <span className="text-sm font-semibold text-[#f7f7ff]">
                            {secondaryWeapon?.name ?? <span className="text-parchment-600">None</span>}
                          </span>
                          {secondaryWeapon && (
                            <span className="text-xs text-parchment-500 ml-1 sm:ml-2 block sm:inline">
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
                          <p className="text-xs uppercase tracking-wider text-parchment-500 font-medium mb-1">
                            Armor
                          </p>
                          <p className="text-lg font-semibold text-[#f7f7ff]">{armor.name}</p>
                          <p className="text-sm text-parchment-500 mt-0.5">
                            Score {armor.baseArmorScore} · Major {armor.baseMajorThreshold + 1}+ · Severe {armor.baseSevereThreshold + 1}+
                            {armor.featureType && ` · ${armor.featureType}`}
                          </p>
                        </div>
                      ) : null;
                    })()}

                    {/* Starting Equipment */}
                    <div className="rounded-lg border border-slate-700/60 bg-slate-900/40 p-4">
                      <p className="text-xs uppercase tracking-wider text-parchment-500 font-medium mb-3">
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

                     {/* Experiences */}
                     {experiences.some((e) => e.name.trim()) && (
                       <div className="rounded-lg border border-slate-700/60 bg-slate-900/40 p-4">
                         <p className="text-xs uppercase tracking-wider text-parchment-500 font-medium mb-3">
                           Experiences
                         </p>
                         <div className="space-y-1.5">
                           {experiences.filter((e) => e.name.trim()).map((exp, i) => (
                             <div key={i} className="flex items-center justify-between">
                               <span className="text-sm text-[#f7f7ff]">{exp.name}</span>
                               <span className="text-sm font-semibold text-[#577399]">+{exp.bonus}</span>
                             </div>
                           ))}
                         </div>
                       </div>
                     )}

                     {/* Domain Cards */}
                     {(isLockedDomainStep || selectedDomainCardIds.length > 0) && (
                       <div className="rounded-lg border border-slate-700/60 bg-slate-900/40 p-4">
                         <p className="text-xs uppercase tracking-wider text-parchment-500 font-medium mb-3">
                           Domain Cards {isLockedDomainStep ? "(managed via level-up)" : `(${selectedDomainCardIds.length}/2)`}
                         </p>
                         {isLockedDomainStep ? (
                           <p className="text-sm text-parchment-500">
                             {(character?.domainVault ?? character?.domainLoadout ?? []).length} cards in vault — not modified here.
                           </p>
                         ) : (
                           <div className="space-y-2">
                             {selectedDomainCardIds.map((cardId) => (
                               <DomainCardSummary key={cardId} cardId={cardId} />
                             ))}
                           </div>
                         )}
                       </div>
                     )}
                  </div>
                  
                  {error && (
                    <div role="alert" className="rounded-lg border border-[#fe5f55]/40 bg-[#fe5f55]/10 p-4">
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
              const steps: { num: number; name: string; done: boolean; locked: boolean; summary: string | null }[] = [
                {
                  num: 1, name: "Class",
                  done: Boolean(classId), locked: false,
                  summary: selectedClassData?.name ?? null,
                },
                {
                  num: 2, name: "Subclass",
                  done: Boolean(subclassId), locked: false,
                  summary: selectedSubclass?.name ?? null,
                },
                {
                  num: 3, name: "Ancestry",
                  done: Boolean(ancestryId), locked: false,
                  summary: selectedAncestry?.name ?? null,
                },
                {
                  num: 4, name: "Community",
                  done: Boolean(communityId), locked: false,
                  summary: selectedCommunity?.name ?? null,
                },
                {
                  num: 5, name: "Traits",
                  done: Object.keys(traitBonuses).length === 4, locked: false,
                  summary: Object.keys(traitBonuses).length === 4 ? "Assigned" : null,
                },
                {
                  num: 6, name: "Weapons",
                  done: Boolean(primaryWeaponId),
                  locked: hasExistingWeapons,
                  summary: hasExistingWeapons ? "Via equipment page" : (primaryWeapon?.name ?? null),
                },
                {
                  num: 7, name: "Armor",
                  done: Boolean(armorId),
                  locked: hasExistingArmor,
                  summary: hasExistingArmor ? "Via equipment page" : (selectedArmorData?.name.replace(" Armor", "") ?? null),
                },
                {
                  num: 8, name: "Equipment",
                  done: Boolean(equipmentSelections.consumableId && equipmentSelections.classItem), locked: false,
                  summary: equipmentSelections.consumableId
                    ? (equipmentSelections.consumableId === "minor-health-potion" ? "Health Potion" : "Stamina Potion")
                    : null,
                },
                {
                  num: 9, name: "Experiences",
                  done: experiences.length >= 2 && experiences.every((e) => e.name.trim().length > 0), locked: false,
                  summary: experiences.filter((e) => e.name.trim()).length > 0
                    ? experiences.filter((e) => e.name.trim()).map((e) => e.name).join(" · ")
                    : null,
                },
                {
                  num: 10, name: "Domain Cards",
                  done: isLockedDomainStep || selectedDomainCardIds.length === 2, locked: false,
                  summary: isLockedDomainStep
                    ? "Via level-up wizard"
                    : selectedDomainCardIds.length > 0
                      ? `${selectedDomainCardIds.length}/2 selected`
                      : null,
                },
                {
                  num: 11, name: "Review & Save",
                  done: false, locked: false,
                  summary: null,
                },
              ];
              return (
                <div className="hidden md:flex flex-col w-44 shrink-0 border-l border-slate-700/40 overflow-y-auto py-3">
                  <p className="px-3 pb-2 text-xs font-semibold uppercase tracking-wider text-parchment-600">
                    Steps
                  </p>
                  {steps.map((s) => (
                    <button
                      key={s.num}
                      type="button"
                      disabled={s.locked}
                      onClick={() => !s.locked && setStep(s.num as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11)}
                      aria-current={step === s.num ? "step" : undefined}
                      className={`
                        w-full text-left px-3 py-2 transition-colors rounded-none
                        ${s.locked
                          ? "opacity-40 cursor-not-allowed border-r-2 border-transparent"
                          : step === s.num
                            ? "bg-[#577399]/15 border-r-2 border-[#577399]"
                            : "hover:bg-slate-800/40 border-r-2 border-transparent"
                        }
                      `}
                    >
                      <div className="flex items-center gap-1.5">
                        <span className={`text-xs shrink-0 ${s.done || s.locked ? "text-[#577399]" : "text-parchment-600"}`}>
                          {s.done || s.locked ? "✓" : `${s.num}.`}
                        </span>
                        <span className={`text-xs font-medium truncate ${step === s.num ? "text-[#f7f7ff]" : "text-[#b9baa3]/60"}`}>
                          {s.name}
                        </span>
                      </div>
                      {s.summary && (
                        <p className="text-xs text-parchment-600 truncate pl-4 mt-0.5 leading-tight">
                          {s.summary}
                        </p>
                      )}
                    </button>
                  ))}
                </div>
              );
            })()}
          </div>{/* end flex content row */}
          
           <div className="shrink-0 border-t border-slate-700/40 px-3 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-2 sm:gap-4 flex-wrap">
             <button
               type="button"
               onClick={() => {
                 if (step === activeSteps[0]) {
                   router.push(`/character/${characterId}`);
                 } else {
                    setStep(prevActiveStep(step) as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11);
                 }
               }}
               className="
                 rounded-lg px-4 py-3 text-base font-medium min-h-[44px]
                 border border-slate-700/60 text-[#b9baa3]/60
                 hover:border-slate-600 hover:text-[#b9baa3]
                 transition-colors
               "
             >
               {step === activeSteps[0] ? "Cancel" : "← Back"}
             </button>
             
             <div className="flex gap-3">
               {step !== activeSteps[activeSteps.length - 1] && (
                 <button
                   type="button"
                     onClick={() => setStep(nextActiveStep(step) as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11)}
                     disabled={
                       (step === 1 && !canGoNext1) ||
                       (step === 2 && !canGoNext2) ||
                       (step === 3 && !canGoNext3) ||
                       (step === 4 && !canGoNext4) ||
                       (step === 5 && !canGoNext5) ||
                       (step === 6 && !canGoNext6) ||
                       (step === 7 && !canGoNext7) ||
                       (step === 8 && !canGoNext8) ||
                       (step === 9 && !canGoNext9) ||
                       (step === 10 && !canGoNext10)
                     }
                    className="
                       rounded-lg px-6 py-3 font-semibold text-base min-h-[44px]
                      bg-[#577399] text-[#f7f7ff]
                      hover:bg-[#577399]/80
                      disabled:opacity-50 disabled:cursor-not-allowed
                      transition-colors shadow-sm
                    "
                  >
                    Next →
                  </button>
               )}
               
               {step === activeSteps[activeSteps.length - 1] && (
                 <button
                   type="button"
                   onClick={handleSave}
                   disabled={updateMutation.isPending}
                    className="
                       rounded-lg px-6 py-3 font-semibold text-base min-h-[44px]
                      bg-[#577399] text-[#f7f7ff]
                      hover:bg-[#577399]/80
                      disabled:opacity-50 disabled:cursor-not-allowed
                      transition-colors shadow-sm
                    "
                  >
                    {updateMutation.isPending ? (
                      <span className="flex items-center gap-2">
                        <span className="h-3.5 w-3.5 animate-spin rounded-full border border-[#f7f7ff] border-t-transparent" aria-hidden="true" />
                        <span className="sr-only">Saving…</span>
                        <span aria-hidden="true">Saving…</span>
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

