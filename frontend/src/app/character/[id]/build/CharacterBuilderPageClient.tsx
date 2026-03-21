"use client";

/**
 * src/app/character/[id]/build/CharacterBuilderPageClient.tsx
 *
 * Character builder/editor page for existing characters.
 * Allows users to modify their character's class, ancestry, and community.
 * 
 * Flow:
 *   1. Choose Class — select class + subclass
 *   2. Heritage — select ancestry and community
 *   3. Review — confirm changes and save
 * 
 * After saving, redirects back to character sheet.
 */

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useCharacter, useUpdateCharacter } from "@/hooks/useCharacter";
import { useClass, useClasses, useAncestries, useCommunities } from "@/hooks/useGameData";
import type { Character, AncestryData, CommunityData } from "@shared/types";
import { MarkdownContent } from "@/components/MarkdownContent";
import { CollapsibleSRDDescription } from "@/components/character/CollapsibleSRDDescription";
import { TraitAssignmentPanel, type TraitBonuses } from "@/components/character/TraitAssignmentPanel";

interface CharacterBuilderPageProps {
  params: { id: string };
}

export default function CharacterBuilderPageClient({ params }: CharacterBuilderPageProps) {
  const { id: characterId } = params;
  const router = useRouter();
  
  // Queries
  const { data: character, isLoading: charLoading } = useCharacter(characterId);
  const { data: classesData } = useClasses();
  const { data: ancestriesData } = useAncestries();
  const { data: communitiesData } = useCommunities();
  
  // Builder state
  const updateMutation = useUpdateCharacter(characterId);
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [classId, setClassId] = useState(character?.classId ?? "");
  const [subclassId, setSubclassId] = useState(character?.subclassId ?? "");
  const [ancestryId, setAncestryId] = useState(character?.ancestryId ?? "");
  const [communityId, setCommunityId] = useState(character?.communityId ?? "");
  const [traitBonuses, setTraitBonuses] = useState<TraitBonuses>(character?.traitBonuses ?? {});
  const [heritageTab, setHeritageTab] = useState<"ancestry" | "community">("ancestry");
  const [error, setError] = useState<string | null>(null);
  
  // Get full class data for currently selected class
  const { data: selectedClassData } = useClass(classId || undefined);
  
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
  
  const handleSave = async () => {
    setError(null);
    try {
      const updated = await updateMutation.mutateAsync({
        classId,
        subclassId: subclassId || undefined,
        ancestryId: ancestryId || undefined,
        communityId: communityId || undefined,
        traitBonuses,
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
            w-full max-w-4xl rounded-2xl border border-slate-700/60
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
                {character.name} • Step {step} of 5
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
                        <p className="text-xs font-semibold uppercase text-[#577399]">Trait</p>
                        <p className="text-sm font-semibold text-[#f7f7ff]">{selectedAncestry.traitName}</p>
                        <MarkdownContent className="text-sm text-[#b9baa3]/70">
                          {selectedAncestry.traitDescription}
                        </MarkdownContent>
                      </div>
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
                  content="Your character has six traits that represent their physical, mental, and social aptitude: **Agility** (Sprint, Leap, Maneuver), **Cunning** (Finesse, Investigate, Deceive), **Presence** (Inspire, Intimidate, Persuade), **Spellcast** (magic rolls), **Toughness** (resist), **Wit** (wit rolls)."
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
            
            {/* Step 5: Review */}
            {step === 5 && (
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
                  </div>
                  
                  {error && (
                    <div className="rounded-lg border border-[#fe5f55]/40 bg-[#fe5f55]/10 p-4">
                      <p className="text-sm text-[#fe5f55]">{error}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          
           {/* Footer */}
           <div className="shrink-0 border-t border-slate-700/40 px-6 py-4 flex items-center justify-between gap-4">
             <button
               type="button"
               onClick={() => {
                 if (step === 1) {
                   router.push(`/character/${characterId}`);
                 } else {
                   setStep((s) => (s - 1) as 1 | 2 | 3 | 4 | 5);
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
               {step < 5 && (
                 <button
                   type="button"
                   onClick={() => setStep((s) => (s + 1) as 1 | 2 | 3 | 4 | 5)}
                   disabled={
                     (step === 1 && !canGoNext1) ||
                     (step === 2 && !canGoNext2) ||
                     (step === 3 && !canGoNext3) ||
                     (step === 4 && !canGoNext4)
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
               
               {step === 5 && (
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

