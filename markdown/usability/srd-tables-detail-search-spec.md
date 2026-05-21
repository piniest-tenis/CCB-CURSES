# SRD Tables, Detail Cards & Search Precision — UX + Data Spec

**Author:** UX Architect Agent  
**Date:** 2026-04-12  
**Status:** Draft — Complete (Sections 1–6)  
**Depends on:** `rules-page-drill-down-spec.md`, `rules-page-ux-architecture.md`  
**Palette:** burgundy · gold · parchment · coral · steel · slate  
**Fonts:** serif (double-pica) · body (mestiza-sans) · display (jetsam-collection-basilea)

---

## Table of Contents

1. [Overview](#1-overview)
2. [Data Model](#2-data-model)
3. [Search Behavior Rules](#3-search-behavior-rules)
4. [Component Specifications](#4-component-specifications)
5. [Responsive Design](#5-responsive-design)
6. [Transitions & Accessibility](#6-transitions--accessibility)

---

## 1. Overview

The SRD index contains **119 chunks**, with 55 (46%) split into numbered parts:

| Content | Parts | Problem |
|---|---|---|
| Equipment | 10 | "Broadsword" → "Equipment (Part 2)" — meaningless |
| Adversaries & Environments | 22 | "Bloom Heart" → "Adversaries and Environments (Part 14)" |
| Core GM Mechanics | 4 | "Adversary Actions" → entire 8,000-char Part 1 |
| Domain Cards (various) | 2 each | "(Part 1)" obscures which cards are inside |

This creates opaque titles, no item-level search, and wasted screen space.

### Four Changes

**Change 1 — HTML Table Rendering.** Equipment chunks contain raw `<table>` HTML (weapons, armor, loot). Render as styled, accessible tables: `burgundy-800` headers, `parchment-100` text, `gold-400/10` alternating stripes, horizontal scroll on mobile.

**Change 2 — Detail Cards.** Individual weapons, armor, loot, and adversaries become first-class searchable entities via `SRDSubEntry`. Searching "Broadsword" shows a detail card — not the entire Equipment section.

**Change 3 — Search Precision.** Exact-before-fuzzy (suppress fuzzy when exact matches exist), sub-section precision (return only the H3 heading's content), table row precision (return the item card, not the parent chunk).

**Change 4 — Eliminate Part-Chunking.** Consolidate 55 part-chunks into logical parents. Extract individual items as `SRDSubEntry` records. Remove `"(Part N)"` from all titles permanently.

### Cognitive Alignment

```
Player thinks…                  Searches…            Expects…
"I need a one-handed sword"     "broadsword"         Broadsword's stats
"What does this armor do?"      "chainmail"          Chainmail's thresholds
"How tough is this enemy?"      "bloom heart"        Bloom Heart's stat block
"How do adversary turns work"   "adversary actions"  That rules sub-section
```

The current system returns containers. The new system returns **answers**.

---

## 2. Data Model

### 2.1 Current: SRDChunk (unchanged)

```typescript
interface SRDChunk {
  id: string;          // "core-mechanics-equipment-part-3"
  title: string;       // "Equipment (Part 3)"
  section: string;     // "Core Mechanics"
  subsection?: string; // unused — never populated
  content: string;     // Full markdown/HTML
  filePath: string;
  tags: string[];
  level: number;       // 1, 2, or 3
}
```

### 2.2 New: SRDSubEntry

```typescript
export interface SRDSubEntry {
  /** "{parentChunkId}--{slug}", e.g. "equipment--broadsword-t2" */
  id: string;
  parentChunkId: string;
  /** "Equipment → Primary Weapons → Tier 2" */
  breadcrumb: string;
  name: string;
  type: "weapon" | "armor" | "loot" | "adversary" | "subsection";
  fields: WeaponFields | ArmorFields | LootFields | AdversaryFields | SubsectionFields;
  tags: string[];
  section: string;
}
```

### 2.3 Field Variants

**Weapons** (from `<table>` rows: NAME, TRAIT, RANGE, DAMAGE, BURDEN, FEATURE):

```typescript
interface WeaponFields {
  trait: string;          // "Agility" | "Strength" | …
  range: string;          // "Melee" | "Very Close" | "Close" | "Far" | "Very Far"
  damage: string;         // "d8+3 phy" — raw SRD string
  burden: string;         // "One-Handed" | "Two-Handed"
  feature: string | null;
  tier: number;           // 1–4
  category: string;       // "Primary" | "Secondary"
  damageType: string;     // "Physical" | "Magic"
}
```

**Armor** (from `<table>` rows: NAME, BASE THRESHOLDS, BASE SCORE, FEATURE):

```typescript
interface ArmorFields {
  baseThresholds: string;      // "7 / 15"
  baseMajorThreshold: number;
  baseSevereThreshold: number;
  baseArmorScore: number;
  feature: string | null;
  featureType: string | null;  // "Heavy" | "Flexible" | …
  tier: number;
}
```

**Loot** (from `<table>` rows: ROLL, LOOT, DESCRIPTION — doubled per row in SRD):

```typescript
interface LootFields {
  roll: string;          // "01" | "24"
  description: string;
  lootTable: string;     // "Tier 1 Loot" | "Consumables"
  tier: number | null;
}
```

**Adversaries** (extracted from stat blocks across 22 part-chunks):

```typescript
interface AdversaryFields {
  tier: number;
  type: string;            // "Solo" | "Leader" | "Bruiser" | …
  description: string;
  motives: string;
  difficulty: number;
  thresholds: string;      // "Major 8 / Severe 15"
  hp: number;
  stress: number;
  attack: string;
  experiences: string[];
  features: string[];
}
```

**Sub-sections** (H3/H4 headings within large chunks):

```typescript
interface SubsectionFields {
  heading: string;        // "ADVERSARY ACTION ROLLS"
  headingLevel: number;   // 3, 4, or 5
  content: string;
  contentLength: number;
}
```

### 2.4 Index File Strategy

**Decision: Separate file.** Sub-entries go in `srd-sub-entries.json`:

```
frontend/public/
├── srd-index.json        ← Consolidated chunks (parts merged, ~73 chunks)
└── srd-sub-entries.json  ← Sub-entries (~247 entries)
```

**Why separate:** parallel fetch, independent caching, progressive enhancement (page renders from chunks immediately; sub-entries enhance search ~200ms later), backward-compatible (`srd-index.json` shape unchanged).

**Loading in `useSRDSearch`:**

```typescript
// Phase 1: chunks → section grid renders immediately
const chunks = await fetch("/srd-index.json").then(r => r.json());
initializeSRDSearch(chunks);
// Phase 2: sub-entries → search precision enhances
const subs = await fetch("/srd-sub-entries.json").then(r => r.json());
registerSubEntries(subs.entries);
```

**`srd-sub-entries.json` envelope:**

```json
{
  "version": 2,
  "generatedAt": "2026-04-12T00:00:00Z",
  "entries": [ { "id": "equipment--broadsword-t2", "type": "weapon", … } ]
}
```

### 2.5 Part-Chunk Migration

55 part-chunks consolidate into logical parents:

| Before | After |
|---|---|
| Equipment (Part 1–10) | Equipment _(single chunk)_ |
| Adversaries and Environments (Part 1–22) | Adversaries and Environments |
| Core GM Mechanics (Part 1–4) | Core GM Mechanics |
| Druid (Part 1–3) | Druid |
| Action Rolls (Part 1–2), Domain Cards (×3), Witherwild (Part 1–4) | One each |

**Chunk count:** 119 → ~73 (−38%). **Sub-entries extracted:** ~128 weapons + ~34 armor + ~50 loot + ~15 adversaries + ~20 sub-sections = **~247**. Total searchable items: **~320**.

---

## 3. Search Behavior Rules

### 3a. Exact vs. Fuzzy Trimming

> **When ≥1 non-fuzzy match exists, ALL fuzzy-only matches are removed.**

**"Exact" means any of:**

| Condition | Example |
|---|---|
| `normalize(title) === normalize(query)` | "broadsword" = "Broadsword" |
| `normalize(title).includes(normalize(query))` | "improved broadsword" ⊃ "broadsword" |
| `normalize(subEntry.name) === normalize(query)` | "chainmail armor" = "Chainmail Armor" |
| `normalize(subEntry.name).includes(normalize(query))` | "improved chainmail" ⊃ "chainmail" |
| H2/H3/H4 heading matches query | "adversary action rolls" matches `### ADVERSARY ACTION ROLLS` |
| `chunk.tags.includes(normalize(query))` | "evasion" in tags |

**"Fuzzy" means:** matched ONLY via Fuse.js edit-distance > 0, MiniSearch Levenshtein, or synonym expansion.

**Implementation — add `matchQuality` to `SearchResult`:**

```typescript
matchQuality: "exact" | "fuzzy";
subEntry?: SRDSubEntry;

// After scoring:
const hasExact = results.some(r => r.matchQuality === "exact");
const final = hasExact ? results.filter(r => r.matchQuality === "exact") : results;
```

**UI:** `"Showing 3 exact matches"` in `text-gold-400 font-semibold text-sm` above results. Escape hatch: `"Show all N results including fuzzy →"` link in `text-parchment-500 underline`. Clicking removes filter; next search re-applies.

### 3b. Sub-Section Precision

> **If a query matches an H3+ heading, return ONLY that sub-section — not the full parent. Show provenance link.**

Each H3/H4/H5 heading becomes a `subsection`-type sub-entry at build time. Matching algorithm:

```typescript
function matchesSubsectionHeading(query: string, heading: string): boolean {
  const q = normalize(query), h = normalize(heading);
  if (h === q || h.includes(q) || q.includes(h)) return true;
  // Word overlap ≥ 60%: "adversary actions" → "ADVERSARY ACTION ROLLS"
  const qw = new Set(q.split(/\s+/)), hw = h.split(/\s+/);
  const hits = hw.filter(w => qw.has(w) || [...qw].some(t => w.startsWith(t))).length;
  return hits / Math.max(hw.length, qw.size) >= 0.6;
}
```

**Provenance display:** `"from Core GM Mechanics →"` in `text-parchment-600 text-xs` with `gold-400` link. Clicking navigates to parent in drill-down, sub-section highlighted.

### 3c. Table Row Precision

> **Sub-entries always rank above their parent chunk for name-matched queries.**

Each `<table>` row becomes a sub-entry at build time (header row determines type). Sub-entries receive a **2.5× name-match boost**, stacking with existing title-exact (3.0×) for an effective **7.5× boost** over content-only parent matches.

| Rank | "Chainmail" results | Displayed as |
|---|---|---|
| 1 | `equipment--chainmail-armor-t1` | Chainmail Armor detail card (Tier 1) |
| 2 | `equipment--improved-chainmail-t2` | Improved Chainmail detail card (Tier 2) |
| 3 | `equipment--advanced-chainmail-t3` | Advanced Chainmail detail card (Tier 3) |
| 4 | `equipment--legendary-chainmail-t4` | Legendary Chainmail detail card (Tier 4) |
| ~~5~~ | ~~Equipment (parent)~~ | ~~Suppressed — see §3d~~ |

### 3d. Parent Suppression

> **If ≥1 sub-entry from a parent matches, suppress the parent — UNLESS the query is an exact title match on the parent.**

```typescript
function applyParentSuppression(results: SearchResult[], query: string): SearchResult[] {
  const suppressed = new Set(results.filter(r => r.subEntry).map(r => r.subEntry!.parentChunkId));
  return results.filter(r => {
    if (r.subEntry) return true;
    if (!suppressed.has(r.chunk.id)) return true;
    return r.matchQuality === "exact" && normalize(r.chunk.title) === normalize(query);
  });
}
```

**Examples:**

| Query | Parent shown? | Why |
|---|---|---|
| "Broadsword" | No | 4 sub-entries cover it |
| "Bloom Heart" | No | 1 adversary sub-entry |
| "Equipment" | **Yes** | Exact title match override |
| "Core GM Mechanics" | **Yes** | No sub-entry has this name |

**Grouped display:** When suppressed, show `"4 results from Equipment →"` breadcrumb in `text-parchment-600 text-xs` with `gold-400` link to drill-down view. Groups sub-entries visually (Tier 1→4 progression) to reduce cognitive load.

---

## 4. Component Specifications

Six components render SRD table data and detail cards across browse and search contexts.

### 4a. SRDTable

Renders raw `<table>` HTML from SRD Equipment chunks as styled, accessible, dark-themed tables. Used when browsing Equipment sections in drill-down view.

**Props:**

```typescript
interface SRDTableProps {
  /** Raw HTML string containing <table> markup from SRD content */
  html: string;
  /** "weapon" | "armor" | "loot" — determines column formatting rules */
  tableType: "weapon" | "armor" | "loot";
  /** Tier number for breadcrumb context */
  tier?: number;
  /** Category label for breadcrumb, e.g. "Primary Weapons" */
  category?: string;
  /** Callback when a row is clicked — opens detail card */
  onRowSelect?: (subEntryId: string) => void;
}
```

**Parsing:** Extract `<tr>` elements from the HTML string. First `<tr>` → header row. Remaining `<tr>` → data rows. Each `<td>` innerText becomes a cell value. Map header text to field keys via a column-name lookup (`NAME → name`, `TRAIT → trait`, `DAMAGE → damage`, etc.).

**Layout — Desktop (≥1024px):**

```
┌─────────────────────────────────────────────────────────────────┐
│  NAME         TRAIT       RANGE     DAMAGE    BURDEN   FEATURE  │  ← header
│  bg-slate-800/60  text-gold-400/80  uppercase  tracking-wider   │
├─────────────────────────────────────────────────────────────────┤
│  Broadsword   Agility     Melee     🎲 d8 phy  One-Hand  …     │  ← odd: bg-slate-900/30
│  Longbow      Agility     Far       🎲 d8 phy  Two-Hand  …     │  ← even: transparent
│  Warhammer    Strength    Melee     🎲 d10 phy Two-Hand  …     │  ← odd: bg-slate-900/30
└─────────────────────────────────────────────────────────────────┘
```

**Tailwind classes:**

| Element | Classes |
|---|---|
| Scroll wrapper | `overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0` |
| `<table>` | `w-full border-collapse text-sm text-parchment-200` |
| Header row | `bg-slate-800/60` |
| Header cell | `px-3 py-2.5 text-left text-xs font-semibold text-gold-400/80 uppercase tracking-wider` |
| Body row (odd) | `bg-slate-900/30 transition-colors duration-150` |
| Body row (even) | `bg-transparent transition-colors duration-150` |
| Body row (hover) | `hover:bg-gold-400/5 cursor-pointer group` |
| Body cell | `px-3 py-2 text-parchment-300 whitespace-nowrap` |
| NAME cell | `font-serif font-medium text-[#f7f7ff] sticky left-0 bg-inherit z-10` |
| "View detail" hint | `opacity-0 group-hover:opacity-100 text-gold-400 text-xs ml-2 transition-opacity` |

**Column-Specific Formatting:**

- **DAMAGE:** Prefix with die icon (`⚄` or inline SVG `w-3.5 h-3.5 text-gold-400/60 inline`) before the value. Parse `d8 phy` → `⚄ d8 physical`.
- **BURDEN:** Render as a pill/tag: `inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-700/50 text-parchment-400`. One-Handed = default, Two-Handed = `bg-coral-900/20 text-coral-300`.
- **FEATURE:** Truncate to 40 characters with `…` and `title` attribute for full text. Full text available in the detail card on click.

**Sticky First Column:** The NAME cell uses `sticky left-0 bg-inherit z-10` so it remains visible during horizontal scroll on tablet. A `shadow-[2px_0_4px_rgba(0,0,0,0.3)]` right edge shadow appears when scrolled.

---

### 4b. WeaponDetailCard

Shown in search results when a weapon name matches, and as an expandable row detail in table browse mode.

**Props:**

```typescript
interface WeaponDetailCardProps {
  name: string;
  fields: WeaponFields;
  breadcrumb: string;        // "Equipment → Primary Weapons → Tier 1"
  parentChunkId: string;
  onBreadcrumbClick?: () => void;
  className?: string;
}
```

**Layout:**

```
┌──────────────────────────────────────────────────┐
│ ▎ Broadsword                        [Tier 1]     │  ← gold left border
│ ▎                                                │
│ ▎  TRAIT          RANGE                          │
│ ▎  Agility        Melee                          │
│ ▎                                                │
│ ▎  DAMAGE         BURDEN                         │
│ ▎  ⚄ d8 physical  One-Handed                    │
│ ▎                                                │
│ ▎  ── Feature ──────────────────────             │
│ ▎  When you roll a critical success with this    │
│ ▎  weapon, deal an additional d8 damage.         │
│ ▎                                                │
│ ▎  from Equipment → Primary Weapons → Tier 1  → │  ← breadcrumb link
└──────────────────────────────────────────────────┘
```

**Tailwind classes:**

| Element | Classes |
|---|---|
| Card container | `rounded-lg border-l-4 border-l-gold-400 bg-slate-850 p-4 shadow-card hover:shadow-card-fantasy-hover transition-shadow duration-200` |
| Name heading | `font-serif text-lg text-[#f7f7ff] font-medium` |
| Tier badge | `inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-gold-400/10 text-gold-400 ml-2` |
| Stat grid | `grid grid-cols-2 gap-x-6 gap-y-3 mt-3` |
| Stat label | `text-xs uppercase tracking-wider text-parchment-600` |
| Stat value | `text-sm text-parchment-200 font-medium mt-0.5` |
| Feature divider | `border-t border-gold-400/20 mt-3 pt-3` |
| Feature text | `text-sm text-parchment-300 leading-relaxed` |
| Breadcrumb footer | `mt-3 pt-2 border-t border-slate-700/50` |
| Breadcrumb text | `text-xs text-parchment-600` |
| Breadcrumb link | `text-gold-400 hover:text-gold-300 underline cursor-pointer` |

---

### 4c. ArmorDetailCard

Same structural pattern as `WeaponDetailCard` but with armor-specific fields.

**Props:**

```typescript
interface ArmorDetailCardProps {
  name: string;
  fields: ArmorFields;
  breadcrumb: string;
  parentChunkId: string;
  onBreadcrumbClick?: () => void;
  className?: string;
}
```

**Layout:**

```
┌──────────────────────────────────────────────────┐
│ ▎ Chainmail Armor                   [Tier 1]     │
│ ▎                                                │
│ ▎  THRESHOLDS              ARMOR SCORE           │
│ ▎  Minor 7 / Major 15         3                  │  ← score is large
│ ▎                                                │
│ ▎  TYPE                                          │
│ ▎  Heavy                                         │
│ ▎                                                │
│ ▎  ── Feature ──────────────────────             │
│ ▎  While wearing this armor, reduce incoming     │
│ ▎  physical damage by 1.                         │
│ ▎                                                │
│ ▎  from Equipment → Armor → Tier 1            → │
└──────────────────────────────────────────────────┘
```

**Key differences from WeaponDetailCard:**

| Element | Classes |
|---|---|
| Armor Score value | `text-2xl font-serif font-bold text-[#f7f7ff]` — displayed as a large, prominent number |
| Threshold display | `text-sm text-parchment-200` — formatted as `"Minor 7 / Major 15"` with `/` separator in `text-parchment-600` |
| Feature type label | `text-xs uppercase tracking-wider text-parchment-600 mb-1` — shows "Heavy", "Flexible", etc. above the feature text |

All other classes (card container, gold left border, tier badge, breadcrumb) are identical to `WeaponDetailCard`.

---

### 4d. LootDetailCard

Compact card for loot table items. Optimized for scannability in search results where many loot items may appear.

**Props:**

```typescript
interface LootDetailCardProps {
  name: string;
  fields: LootFields;
  breadcrumb: string;
  parentChunkId: string;
  onBreadcrumbClick?: () => void;
  className?: string;
}
```

**Layout:**

```
┌──────────────────────────────────────────────────┐
│  [07]  Ring of Whispered Echoes     Uncommon     │
│                                                  │
│  A silver ring that hums faintly in the presence │
│  of hidden doors or secret passages.             │
│                                                  │
│  from Equipment → Tier 2 Loot                  → │
└──────────────────────────────────────────────────┘
```

**Tailwind classes:**

| Element | Classes |
|---|---|
| Card container | `rounded-lg bg-slate-850 p-3 shadow-card hover:shadow-card-fantasy-hover transition-shadow duration-200` |
| Roll badge | `inline-flex items-center justify-center w-8 h-8 rounded bg-slate-700/60 text-xs font-mono font-bold text-parchment-300 mr-3 shrink-0` |
| Name | `font-serif text-base text-[#f7f7ff] font-medium` |
| Rarity pill — Common | `px-2 py-0.5 rounded-full text-xs font-medium bg-parchment-900/20 text-parchment-400` |
| Rarity pill — Uncommon | `px-2 py-0.5 rounded-full text-xs font-medium bg-gold-400/10 text-gold-400` |
| Rarity pill — Rare | `px-2 py-0.5 rounded-full text-xs font-medium bg-burgundy-900/30 text-burgundy-300` |
| Description | `text-sm text-parchment-300 leading-relaxed mt-2` |
| Breadcrumb | Same as WeaponDetailCard |

---

### 4e. AdversaryStatCard

Full RPG stat block card with coral accent color. Renders adversary data in the traditional TTRPG stat block layout that players expect.

**Props:**

```typescript
interface AdversaryStatCardProps {
  name: string;
  fields: AdversaryFields;
  breadcrumb: string;
  parentChunkId: string;
  onBreadcrumbClick?: () => void;
  className?: string;
}
```

**Layout:**

```
┌──────────────────────────────────────────────────┐
│ ▎ Bloom Heart               [Tier 2]  [Solo]     │  ← coral left border
│ ▎                                                │
│ ▎  DIFFICULTY    THRESHOLDS     HP     STRESS    │
│ ▎     14        8 / 15          28       6       │
│ ▎                                                │
│ ▎  ⚔ ATTACK                                     │
│ ▎  Thorned Vine Lash — d12+4 phy, Very Close     │
│ ▎                                                │
│ ▎  ★ EXPERIENCES                                 │
│ ▎  • Hunting in overgrown ruins                  │
│ ▎  • Defending its spawning grounds              │
│ ▎                                                │
│ ▎  ◆ FEATURES                                    │
│ ▎  • Regeneration — Heals 4 HP at start of turn  │
│ ▎  • Rooted — Cannot be moved against its will   │
│ ▎                                                │
│ ▎  from Adversaries & Environments → Tier 2    → │
└──────────────────────────────────────────────────┘
```

**Tailwind classes:**

| Element | Classes |
|---|---|
| Card container | `rounded-lg border-l-4 border-l-coral-400 bg-slate-850 p-4 shadow-card hover:shadow-card-fantasy-hover transition-shadow duration-200` |
| Name heading | `font-serif text-lg text-[#f7f7ff] font-medium` |
| Tier badge | `inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-coral-400/10 text-coral-300 ml-2` |
| Type badge | `inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-slate-700/50 text-parchment-400 ml-1` |
| Stat row | `grid grid-cols-4 gap-x-4 gap-y-2 mt-3 text-center` |
| Stat label | `text-xs uppercase tracking-wider text-parchment-600` |
| Stat value | `text-base font-semibold text-parchment-100 mt-0.5` |
| Section heading (Attack, etc.) | `text-xs uppercase tracking-wider text-coral-400/80 font-semibold mt-4 mb-1` |
| Attack text | `text-sm text-parchment-200 font-medium` |
| List items (features, exp) | `text-sm text-parchment-300 leading-relaxed` |
| Bullet marker | `text-coral-400/60 mr-2` — uses `•` for experiences, `◆` for features |

---

### 4f. SubSectionCard

Generic card for non-table sub-section search results (rules text matched by heading). Reuses the existing `MarkdownContent` component for body rendering.

**Props:**

```typescript
interface SubSectionCardProps {
  title: string;
  fields: SubsectionFields;
  breadcrumb: string;
  parentChunkId: string;
  onBreadcrumbClick?: () => void;
  className?: string;
}
```

**Layout:**

```
┌──────────────────────────────────────────────────┐
│  ADVERSARY ACTION ROLLS                          │
│  from Core GM Mechanics →                        │  ← breadcrumb link
│                                                  │
│  When an adversary takes an action that could    │
│  fail, the GM makes an action roll using the     │
│  adversary's Difficulty as the modifier…         │
│                                                  │
│  [rendered markdown continues…]                  │
└──────────────────────────────────────────────────┘
```

**Tailwind classes:**

| Element | Classes |
|---|---|
| Card container | `rounded-lg bg-slate-850 p-4 shadow-card hover:shadow-card-fantasy-hover transition-shadow duration-200 border border-slate-700/30` |
| Title | `font-serif text-base text-[#f7f7ff] font-semibold` |
| Breadcrumb | `text-xs text-parchment-600 mt-0.5 mb-3` — link in `text-gold-400 hover:text-gold-300` |
| Body | Rendered via `<MarkdownContent content={fields.content} />` — inherits standard markdown styles |

---

## 5. Responsive Design

All components adapt across three breakpoints to maintain usability on every device.

### 5a. Breakpoint Definitions

| Breakpoint | Width | Layout Strategy |
|---|---|---|
| Desktop | `≥1024px` (`lg:`) | Full tables, multi-column grids, side-by-side detail cards |
| Tablet | `640–1023px` (`sm:` to `lg:`) | Horizontal-scroll tables with sticky NAME, 2-column search grid |
| Mobile | `<640px` (default) | Card-stack tables, single-column everything |

### 5b. SRDTable Responsive Behavior

**Desktop (≥1024px):**
- Full `<table>` renders with all columns visible
- No scroll wrapper needed (table fits viewport)
- Hover states fully active

**Tablet (640–1023px):**
- Horizontal scroll wrapper activates: `overflow-x-auto`
- NAME column becomes sticky: `sticky left-0 bg-inherit z-10`
- Right-edge shadow on NAME cell when scrolled: `shadow-[2px_0_4px_rgba(0,0,0,0.3)]`
- Scroll hint gradient on right edge: `after:absolute after:right-0 after:top-0 after:h-full after:w-8 after:bg-gradient-to-l after:from-slate-900 after:pointer-events-none`

**Mobile (<640px):**
- Table transforms to card-stack layout
- Each table row becomes a standalone card
- Class changes: replace `<table>` with `flex flex-col gap-2`
- Each row-card: `rounded-lg bg-slate-900/40 p-3 border border-slate-700/20`
- Field labels shown inline: `text-xs text-parchment-600 uppercase` above each value
- NAME becomes card header: `font-serif text-base text-[#f7f7ff] font-medium mb-2`

```
Mobile card-stack example:
┌──────────────────────┐
│  Broadsword          │  ← name as header
│                      │
│  TRAIT    Agility    │
│  RANGE    Melee      │
│  DAMAGE   ⚄ d8 phy  │
│  BURDEN   One-Handed │
│  FEATURE  When you…  │
└──────────────────────┘
┌──────────────────────┐
│  Longbow             │
│  …                   │
└──────────────────────┘
```

### 5c. Detail Cards Responsive Behavior

**Desktop (≥1024px):**
- Search results grid: `grid grid-cols-2 gap-4`
- Stat grids within cards: `grid grid-cols-2 gap-x-6 gap-y-3` (weapon/armor) or `grid grid-cols-4` (adversary)

**Tablet (640–1023px):**
- Search results grid: `grid grid-cols-2 gap-3`
- Adversary stat row collapses: `grid grid-cols-2` (2×2 instead of 4×1)

**Mobile (<640px):**
- Search results: `flex flex-col gap-3` (single column)
- All stat grids: `grid grid-cols-2 gap-x-4 gap-y-2` (weapon/armor stay 2×2, adversary becomes 2×2)
- Card padding reduces: `p-3` instead of `p-4`
- Font sizes reduce by one step: name `text-base` instead of `text-lg`

### 5d. Breakpoint Class Summary

```typescript
// Pattern used in all responsive components:
const tableClasses = {
  wrapper: "overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0",
  table:   "w-full border-collapse text-sm    sm:text-sm     lg:text-sm",
  // Mobile: hidden, replaced by card-stack
  mobileCardStack: "flex flex-col gap-2 sm:hidden",
  desktopTable:    "hidden sm:table",
};

const searchGridClasses = "flex flex-col gap-3 sm:grid sm:grid-cols-2 sm:gap-4";

const statGridClasses = {
  weapon:    "grid grid-cols-2 gap-x-4 gap-y-2 sm:gap-x-6 sm:gap-y-3",
  adversary: "grid grid-cols-2 gap-x-4 gap-y-2 lg:grid-cols-4",
};
```

---

## 6. Transitions & Accessibility

### 6a. Transitions

**Detail card mount animation:**

Cards use the existing `animate-fade-in` utility on mount. This provides a subtle opacity + translateY entrance.

```css
/* Already defined in tailwind config — reuse */
@keyframes fade-in {
  from { opacity: 0; transform: translateY(4px); }
  to   { opacity: 1; transform: translateY(0); }
}
.animate-fade-in {
  animation: fade-in 200ms ease-out both;
}
```

**Search result stagger:**

Cards in search results receive a staggered delay based on their index to create a cascade effect:

```tsx
{results.map((result, index) => (
  <DetailCard
    key={result.id}
    {...result}
    className="animate-fade-in"
    style={{ animationDelay: `${index * 30}ms` }}
  />
))}
```

Cap at `10 * 30 = 300ms` max delay. Items beyond index 10 all use `300ms`.

**Table row → detail expansion:**

When a table row is clicked to reveal a detail card, use the CSS grid `0fr → 1fr` trick (consistent with the existing accordion pattern in the drill-down view):

```css
.row-detail-wrapper {
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows 200ms ease-out;
}
.row-detail-wrapper[data-open="true"] {
  grid-template-rows: 1fr;
}
.row-detail-inner {
  overflow: hidden;
}
```

**Breadcrumb link hover:** `transition-colors duration-150` on `text-gold-400 → text-gold-300`.

---

### 6b. Accessibility

**Table semantics:**

All `SRDTable` instances must use proper ARIA table roles, whether rendered as native `<table>` elements or as card-stack `<div>` layouts:

| HTML Element / Role | Attribute | Value |
|---|---|---|
| Table container | `role="table"` | `aria-label="Tier 1 Primary Weapons"` |
| Header row | `role="row"` | — |
| Header cell | `role="columnheader"` | `scope="col"` |
| Body row | `role="row"` | `aria-rowindex={n}` |
| Body cell | `role="cell"` | — |
| NAME cell | `role="rowheader"` | `scope="row"` |

On mobile card-stack layout, the card container takes `role="table"` and each card takes `role="row"`. Labels inside each card use `role="cell"`.

**Detail card semantics:**

| Component | Attribute | Value |
|---|---|---|
| WeaponDetailCard | `role="article"` | `aria-label="Weapon: Broadsword, Tier 1"` |
| ArmorDetailCard | `role="article"` | `aria-label="Armor: Chainmail, Tier 1, Score 3"` |
| LootDetailCard | `role="article"` | `aria-label="Loot: Ring of Whispered Echoes, Uncommon"` |
| AdversaryStatCard | `role="article"` | `aria-label="Adversary: Bloom Heart, Tier 2, Solo"` |
| SubSectionCard | `role="article"` | `aria-label="Section: Adversary Action Rolls"` |

**Breadcrumb links:**

All breadcrumb navigation links include `aria-label="Navigate to parent section: {parentTitle}"`.

**Keyboard navigation:**

| Context | Key | Action |
|---|---|---|
| Table browse | `Tab` | Move focus between rows |
| Table browse | `Enter` | Open detail card for focused row |
| Table browse | `Escape` | Close open detail card, return focus to row |
| Table browse | `↑` / `↓` | Move between rows (when table is focused) |
| Search results | `Tab` | Move between result cards |
| Search results | `Enter` | Navigate to item / expand detail |
| Detail card open | `Escape` | Close card, return focus to trigger |
| Breadcrumb | `Enter` | Navigate to parent section |

**Focus management:** When a detail card opens (table row expansion or search result click), focus moves to the card's heading. When closed via `Escape`, focus returns to the trigger element.

**Screen reader announcements:**

When a detail card is opened, announce the full item summary via `aria-live="polite"`:

| Type | Announcement |
|---|---|
| Weapon | `"Weapon: Broadsword, Tier 1, Agility, Melee, d8 physical, One-Handed"` |
| Armor | `"Armor: Chainmail, Tier 1, Thresholds 7 slash 15, Score 3, Heavy"` |
| Loot | `"Loot: Ring of Whispered Echoes, Uncommon, roll 07"` |
| Adversary | `"Adversary: Bloom Heart, Tier 2, Solo, Difficulty 14, HP 28"` |
| Subsection | `"Section: Adversary Action Rolls, from Core GM Mechanics"` |

**Reduced motion:** All transitions respect `prefers-reduced-motion: reduce`. When active, `animate-fade-in` duration drops to `0ms` and row expansion transitions are instant.

```css
@media (prefers-reduced-motion: reduce) {
  .animate-fade-in { animation-duration: 0ms; }
  .row-detail-wrapper { transition-duration: 0ms; }
}
```

---

_End of specification._
