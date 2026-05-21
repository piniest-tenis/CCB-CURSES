# Roadmap: Custom Adversaries & Environments

## Context

The Campaign Frame detail page (`FrameDetailClient.tsx`) previously included a
**Threats & Encounters** section that allowed frame designers to define custom
`adversaryType` extensions. This section has been **temporarily removed** until
the underlying Homebrew system supports Adversary and Environment content types.

## Problem

The `adversaryType` extension type in `FrameExtensionType` is used to label
custom adversary categories (e.g. "Undead", "Construct") that homebrew authors
can reference when building monsters/adversaries. However, there is currently no
`HomebrewContentType` for adversaries or environments — meaning a frame designer
can define an adversary type label but cannot actually attach homebrew adversary
content to the frame.

The **Add Homebrew Content** form (refinement #4) uses `useHomebrewList()` to
show content already created by the user. Until `adversary` and `environment`
are valid `HomebrewContentType` values, the Threats & Encounters section would
show an empty picker with no usable content.

## Required New Homebrew Types

To restore the Threats & Encounters section, the following must be added:

### 1. `adversary` — Homebrew Adversary

A custom monster/NPC stat block. Fields:
- `name` (string, required)
- `adversaryType` (string — references a `FrameExtension` with `extensionType: "adversaryType"`)
- `tier` (1–4)
- `role` (e.g. "Bruiser", "Leader", "Minion", "Solo")
- `hp` (number)
- `stress` (number, optional)
- `attack` (name + damage expression)
- `features` (array of named feature blocks, similar to class abilities)
- `description` (markdown, optional)

### 2. `environment` — Homebrew Environment / Location

A setting or encounter location. Fields:
- `name` (string, required)
- `description` (markdown)
- `traits` (string array, e.g. ["dark", "flooded", "high-ground"])
- `hazards` (array of named hazard blocks)
- `suggestedAdversaries` (array of adversary references)

## What Needs to Happen (in order)

1. **Backend**: Add `adversary` and `environment` to `HomebrewContentType` in
   `shared/src/types.ts` and implement CRUD endpoints in `backend/src/homebrew/`.
2. **Homebrew creation flows**: Build `homebrew/new/adversary` and
   `homebrew/new/environment` pages with appropriate forms.
3. **Frame detail**: Re-add the `threatsEncounters` section to `WORK_SECTIONS`
   in `FrameDetailClient.tsx`, including:
   - `contentTypes: ["adversary", "environment"]`
   - `extensionTypes: ["adversaryType"]`
4. **SRD compliance**: Define canonical SRD adversary types so `AddRestrictionForm`
   can show a checklist (analogous to classes/ancestries for Character Options).

## Notes

- The `adversaryType` value in `FrameExtensionType` should be kept — it is still
  valid as a World Rules extension once adversary homebrew exists.
- The `houseRule` extension type (added in the current refinement pass) lives in
  World Rules and is unrelated to this work.
- Consider whether `environment` should be restrictable (probably not — frames
  typically add environments, not restrict them).
