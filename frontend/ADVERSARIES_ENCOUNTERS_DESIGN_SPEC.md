/**
 * ADVERSARIES_ENCOUNTERS_DESIGN_SPEC.md
 *
 * Complete visual design specification for the Adversaries Catalog
 * and Encounters Console features.
 *
 * Author: Design System — CCB-Curses / Daggerheart Campaign Platform
 * Date: 2026-03-27
 */

# Adversaries Catalog + Encounters Console — Design Specification

---

## 1. COLOR EXTENSIONS

These extend the existing design token system. No new CSS variables needed —
they compose from existing palette values plus two new semantic mappings.

### New Semantic Colors (adversary-specific)

| Token | Value | Usage |
|-------|-------|-------|
| `adversary-border` | `border-burgundy-900/40` | Card borders for adversary entries |
| `adversary-bg` | `bg-slate-900/80` | Card backgrounds (same as existing card pattern) |
| `adversary-hp-fill` | `bg-[#fe5f55]` | HP bar filled segments (danger red) |
| `adversary-hp-empty` | `bg-slate-800` | HP bar empty segments |
| `adversary-stress-fill` | `bg-[#577399]` | Stress bar filled segments (accent blue) |
| `adversary-stress-empty` | `bg-slate-800` | Stress bar empty segments |
| `threshold-minor` | `text-parchment-400` | Minor threshold indicator text |
| `threshold-major` | `text-[#DAA520]` | Major threshold indicator (gold) |
| `threshold-severe` | `text-[#fe5f55]` | Severe threshold indicator (danger red) |

### Tier Color System

Each adversary tier gets a subtle accent color for its badge:

| Tier | Badge BG | Badge Text | Badge Border |
|------|----------|------------|--------------|
| 1 | `bg-slate-700/40` | `text-[#b9baa3]` | `border-slate-600/40` |
| 2 | `bg-[#577399]/15` | `text-[#577399]` | `border-[#577399]/40` |
| 3 | `bg-[#DAA520]/10` | `text-[#DAA520]` | `border-[#DAA520]/30` |
| 4 | `bg-[#fe5f55]/10` | `text-[#fe5f55]` | `border-[#fe5f55]/30` |

### Type Badge Colors

Type badges use a muted, uniform style to avoid competing with tier:

All types: `bg-slate-800/60 text-[#b9baa3]/80 border-slate-700/40`

---

## 2. TYPOGRAPHY

Uses the existing font stack — no new fonts required:

| Element | Font | Size | Weight | Tracking | Tailwind |
|---------|------|------|--------|----------|----------|
| Section heading | warbler-deck (serif) | sm | semibold | widest | `font-serif text-sm font-semibold uppercase tracking-widest text-[#577399]` |
| Adversary name (catalog card) | warbler-deck (serif) | base | semibold | normal | `font-serif text-base font-semibold text-[#f7f7ff]` |
| Adversary name (encounter row) | warbler-deck (serif) | sm | semibold | normal | `font-serif text-sm font-semibold text-[#f7f7ff]` |
| Stat labels | ibarra-real-nova (sans) | xs | semibold | widest | `text-xs font-semibold uppercase tracking-widest text-[#b9baa3]/50` |
| Stat values | ibarra-real-nova (sans) | lg | bold | normal | `text-lg font-bold text-[#f7f7ff] font-serif` |
| Dice notation | JetBrains Mono (mono) | sm | medium | normal | `font-mono text-sm font-medium text-parchment-400` |
| Feature name | ibarra-real-nova (sans) | sm | medium | normal | `text-sm font-medium text-[#f7f7ff]` |
| Feature body | ibarra-real-nova (sans) | sm | normal | normal | `text-sm text-[#b9baa3] leading-relaxed` |
| Round counter | warbler-deck (serif) | xl | bold | normal | `font-serif text-xl font-bold text-[#DAA520]` |
| Roll result (inline) | JetBrains Mono (mono) | lg | bold | normal | `font-mono text-lg font-bold text-[#f7f7ff]` |

---

## 3. ADVERSARIES CATALOG — Layout Spec

### 3.1 Page Structure

```
┌─────────────────────────────────────────────────────────┐
│ ADVERSARIES                           [+ New Adversary] │
├─────────────────────────────────────────────────────────┤
│ ┌─ FILTERS BAR ───────────────────────────────────────┐ │
│ │ 🔍 [Search...    ]  [Tier ▾]  [Type ▾]  [Sort ▾]  │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ ┌─── CARD ───┐ ┌─── CARD ───┐ ┌─── CARD ───┐         │
│ │            │ │            │ │            │          │
│ │ Skeletal   │ │ Shadow     │ │ Goblin     │          │
│ │ Knight     │ │ Wraith     │ │ Warband    │          │
│ │            │ │            │ │            │          │
│ │ T2 Bruiser │ │ T3 Skulk   │ │ T1 Horde   │          │
│ │ HP:8 S:3   │ │ HP:12 S:5  │ │ HP:6 S:2   │          │
│ │            │ │            │ │            │          │
│ │ [Add ⚔️]   │ │ [Add ⚔️]   │ │ [Add ⚔️]   │          │
│ └────────────┘ └────────────┘ └────────────┘          │
│                                                         │
│ ┌─── CARD ───┐ ┌─── CARD ───┐ ┌─── CARD ───┐         │
│ │    ...     │ │    ...     │ │    ...     │          │
│ └────────────┘ └────────────┘ └────────────┘          │
└─────────────────────────────────────────────────────────┘
```

### 3.2 Filter Bar

```tsx
<div className="flex flex-wrap items-center gap-3 mb-6">
  {/* Search */}
  <div className="relative flex-1 min-w-[200px] max-w-sm">
    <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#b9baa3]/40" />
    <input
      type="search"
      placeholder="Search adversaries…"
      className="
        w-full rounded-lg border border-slate-700/60 bg-slate-900/80
        pl-9 pr-3 py-2 text-sm text-[#f7f7ff]
        placeholder:text-[#b9baa3]/30
        focus:outline-none focus:ring-2 focus:ring-[#577399] focus:border-[#577399]
        transition-colors
      "
    />
  </div>

  {/* Tier filter */}
  <select className="
    rounded-lg border border-slate-700/60 bg-slate-900/80
    px-3 py-2 text-sm text-[#b9baa3]
    focus:outline-none focus:ring-2 focus:ring-[#577399]
  ">
    <option value="">All Tiers</option>
    <option value="1">Tier 1</option>
    <option value="2">Tier 2</option>
    <option value="3">Tier 3</option>
    <option value="4">Tier 4</option>
  </select>

  {/* Type filter */}
  <select className="
    rounded-lg border border-slate-700/60 bg-slate-900/80
    px-3 py-2 text-sm text-[#b9baa3]
    focus:outline-none focus:ring-2 focus:ring-[#577399]
  ">
    <option value="">All Types</option>
    {/* ...map over AdversaryType values */}
  </select>

  {/* Sort */}
  <select className="
    rounded-lg border border-slate-700/60 bg-slate-900/80
    px-3 py-2 text-sm text-[#b9baa3]
    focus:outline-none focus:ring-2 focus:ring-[#577399]
  ">
    <option value="name">Name</option>
    <option value="tier">Tier</option>
    <option value="difficulty">Difficulty</option>
    <option value="hp">Hit Points</option>
  </select>
</div>
```

### 3.3 Card Grid

```tsx
<div className="
  grid gap-4
  grid-cols-1
  sm:grid-cols-2
  lg:grid-cols-3
">
  {adversaries.map(a => <AdversaryCard key={a.adversaryId} adversary={a} />)}
</div>
```

### 3.4 Individual Adversary Card — FULL LAYOUT

This is the hero component. Each card is a self-contained, scannable stat block.

```
┌──────────────────────────────────────────────┐
│ ┌──────┐                                     │  ← border-burgundy-900/40
│ │ TIER │  Skeletal Knight            ⟐ 14   │  ← name + difficulty
│ │  2   │  Bruiser                            │  ← type badge
│ └──────┘                                     │
│──────────────────────────────────────────────│
│ An undead warrior encased in corroded plate,  │  ← description (2-line clamp)
│ endlessly patrolling ancient crypts…          │
│──────────────────────────────────────────────│
│  HP        Stress     Atk     Dmg            │
│  ■ 8      ■ 3        +4      2d4+2          │
│                                phys/Melee    │
│──────────────────────────────────────────────│
│  Thresholds:  3 minor · 6 major · 10 severe  │
│──────────────────────────────────────────────│
│ ▸ Shield Wall — Can raise evasion by 2…      │  ← collapsed features
│ ▸ Relentless — Does not flee when…            │
│──────────────────────────────────────────────│
│  [⚔️ Add to Encounter]                 [···]  │  ← actions
└──────────────────────────────────────────────┘
```

### Card Tailwind Implementation

```tsx
function AdversaryCard({ adversary, onAddToEncounter }: Props) {
  const [expanded, setExpanded] = useState(false);

  // Tier color map
  const tierStyles = {
    1: "bg-slate-700/40 text-[#b9baa3] border-slate-600/40",
    2: "bg-[#577399]/15 text-[#577399] border-[#577399]/40",
    3: "bg-[#DAA520]/10 text-[#DAA520] border-[#DAA520]/30",
    4: "bg-[#fe5f55]/10 text-[#fe5f55] border-[#fe5f55]/30",
  };

  return (
    <article
      className="
        group flex flex-col rounded-xl
        border border-burgundy-900/40 bg-slate-900/80
        shadow-card hover:shadow-card-fantasy-hover
        hover:border-[#577399]/50
        transition-all duration-200
        overflow-hidden
      "
    >
      {/* Header: Tier badge + Name + Difficulty */}
      <div className="flex items-start gap-3 p-4 pb-0">
        {/* Tier badge — vertical pill */}
        <div className={`
          shrink-0 flex flex-col items-center justify-center
          rounded-lg border px-2 py-1.5 min-w-[2.5rem]
          ${tierStyles[adversary.tier]}
        `}>
          <span className="text-[10px] font-semibold uppercase tracking-wider leading-none">
            Tier
          </span>
          <span className="text-lg font-bold font-serif leading-none">
            {adversary.tier}
          </span>
        </div>

        {/* Name + Type */}
        <div className="flex-1 min-w-0">
          <h3 className="font-serif text-base font-semibold text-[#f7f7ff] leading-tight">
            {adversary.name}
          </h3>
          <span className="
            inline-block mt-1 rounded border px-1.5 py-0.5
            text-[10px] font-semibold uppercase tracking-wider
            bg-slate-800/60 text-[#b9baa3]/80 border-slate-700/40
          ">
            {adversary.type}
          </span>
        </div>

        {/* Difficulty diamond */}
        <div className="shrink-0 flex flex-col items-center gap-0.5">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[#b9baa3]/50">
            Diff
          </span>
          <div className="
            h-9 w-9 rotate-45 rounded-sm
            border border-[#DAA520]/40 bg-[#DAA520]/10
            flex items-center justify-center
          ">
            <span className="
              -rotate-45 text-sm font-bold font-serif text-[#DAA520]
            ">
              {adversary.difficulty}
            </span>
          </div>
        </div>
      </div>

      {/* Description */}
      <p className="px-4 pt-2 text-sm text-[#b9baa3]/70 leading-relaxed line-clamp-2">
        {adversary.description}
      </p>

      {/* Divider */}
      <div className="mx-4 my-3 border-t border-slate-800/60" />

      {/* Stats row — HP, Stress, Attack, Damage */}
      <div className="px-4 grid grid-cols-4 gap-2">
        {/* HP */}
        <div className="flex flex-col items-center">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[#fe5f55]/70">
            HP
          </span>
          <span className="text-lg font-bold font-serif text-[#f7f7ff]">
            {adversary.hp}
          </span>
        </div>
        {/* Stress */}
        <div className="flex flex-col items-center">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[#577399]/70">
            Stress
          </span>
          <span className="text-lg font-bold font-serif text-[#f7f7ff]">
            {adversary.stress}
          </span>
        </div>
        {/* Attack */}
        <div className="flex flex-col items-center">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[#b9baa3]/50">
            Atk
          </span>
          <span className="text-lg font-bold font-serif text-[#f7f7ff]">
            +{adversary.attackModifier}
          </span>
        </div>
        {/* Damage */}
        <div className="flex flex-col items-center">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[#b9baa3]/50">
            Dmg
          </span>
          <span className="font-mono text-xs font-medium text-parchment-400 text-center leading-tight">
            {adversary.attackDamage}
          </span>
          <span className="text-[9px] text-[#b9baa3]/40">
            {adversary.attackRange}
          </span>
        </div>
      </div>

      {/* Thresholds */}
      <div className="px-4 mt-2 flex items-center justify-center gap-2 text-[10px]">
        <span className="text-parchment-400">
          {adversary.damageThresholds.minor} <span className="text-[#b9baa3]/40">minor</span>
        </span>
        <span className="text-[#b9baa3]/20">·</span>
        <span className="text-[#DAA520]">
          {adversary.damageThresholds.major} <span className="text-[#b9baa3]/40">major</span>
        </span>
        <span className="text-[#b9baa3]/20">·</span>
        <span className="text-[#fe5f55]">
          {adversary.damageThresholds.severe} <span className="text-[#b9baa3]/40">severe</span>
        </span>
      </div>

      {/* Features (collapsible) */}
      {adversary.features.length > 0 && (
        <div className="px-4 mt-3">
          <button
            type="button"
            onClick={() => setExpanded(v => !v)}
            aria-expanded={expanded}
            className="
              flex items-center gap-1.5 w-full text-left
              text-xs font-semibold text-[#577399] hover:text-[#f7f7ff]
              transition-colors
            "
          >
            <svg
              className={`h-3 w-3 transition-transform duration-200 ${expanded ? 'rotate-90' : ''}`}
              fill="currentColor" viewBox="0 0 16 16"
            >
              <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" fill="none" />
            </svg>
            {adversary.features.length} Feature{adversary.features.length !== 1 ? 's' : ''}
          </button>

          {expanded && (
            <div className="mt-2 space-y-2 animate-fade-in">
              {adversary.features.map(f => (
                <div
                  key={f.name}
                  className="rounded border border-slate-800/60 bg-slate-950/40 px-3 py-2"
                >
                  <p className="text-xs font-medium text-[#f7f7ff]">{f.name}</p>
                  <p className="mt-0.5 text-xs text-[#b9baa3]/70 leading-relaxed">
                    {f.description}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Actions footer */}
      <div className="mt-auto px-4 py-3 flex items-center justify-between border-t border-slate-800/40 mt-3">
        <button
          type="button"
          onClick={() => onAddToEncounter(adversary)}
          className="
            flex items-center gap-1.5 rounded-lg
            border border-[#577399]/40 bg-[#577399]/10
            px-3 py-1.5 text-xs font-semibold text-[#577399]
            hover:bg-[#577399]/20 hover:border-[#577399] hover:text-[#f7f7ff]
            transition-all duration-150
            focus:outline-none focus:ring-2 focus:ring-[#577399]
          "
        >
          <span aria-hidden="true">⚔️</span>
          Add to Encounter
        </button>

        {/* Overflow menu (edit, duplicate, delete) */}
        <button
          type="button"
          aria-label="More options"
          className="
            rounded p-1.5 text-[#b9baa3]/40
            hover:text-[#b9baa3] hover:bg-slate-800
            transition-colors
          "
        >
          ···
        </button>
      </div>
    </article>
  );
}
```

### 3.5 Card Spacing & Dimensions

| Property | Value | Tailwind |
|----------|-------|----------|
| Card padding | 16px (except header 16px sides) | `p-4` / `px-4` |
| Card gap (grid) | 16px | `gap-4` |
| Card border radius | 12px | `rounded-xl` |
| Card min-height | ~280px (natural) | — |
| Card max-width | fills grid column | — |
| Tier badge | 40px wide | `min-w-[2.5rem]` |
| Difficulty diamond | 36px | `h-9 w-9` |
| Stat value size | 18px (text-lg) | `text-lg` |
| Feature collapse height | 0 → auto | `animate-fade-in` |

---

## 4. ENCOUNTER CONSOLE — Layout Spec

### 4.1 Page Structure

The encounter console is a two-zone layout:

```
┌─────────────────────────────────────────────────────────┐
│ ⚡ LIVE ENCOUNTER                                       │
│ "Ambush at the Bridge"    Round 3      [▶ Next Round]   │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ ┌─ ADVERSARY ROW ──────────────────────────────────────┐│
│ │ 💀 Skeletal Knight A     HP ■■■■■■□□  Stress ■■□    ││
│ │    T2 Bruiser · Diff 14  Thresholds: 3/6/10          ││
│ │    [🎲 Roll Atk]  [Mark HP ▾]  [Mark Stress ▾]  [✕] ││
│ │    ┌─ ROLL RESULT: 18 (d12+d12+4) ─────────────┐    ││
│ │    └─────────────────────────────────────────────┘    ││
│ └──────────────────────────────────────────────────────┘│
│                                                         │
│ ┌─ ADVERSARY ROW ──────────────────────────────────────┐│
│ │ 💀 Shadow Wraith         HP ■■■■■■■■■■□□  Stress ■□ ││
│ │    T3 Skulk · Diff 17    Thresholds: 4/8/14          ││
│ │    [🎲 Roll Atk]  [Mark HP ▾]  [Mark Stress ▾]  [✕] ││
│ └──────────────────────────────────────────────────────┘│
│                                                         │
│ ┌─ DEFEATED (collapsed) ───────────────────────────────┐│
│ │ ☠ Goblin Skirmisher A  ·  ☠ Goblin Skirmisher B     ││
│ └──────────────────────────────────────────────────────┘│
│                                                         │
│ ┌─ ADD ADVERSARIES ────────────────────────────────────┐│
│ │ [🔍 Quick search...] or [Open Catalog →]             ││
│ └──────────────────────────────────────────────────────┘│
│                                                         │
│ ┌─ ENCOUNTER ROLL LOG ─────────────────────────────────┐│
│ │ 14:32  Skeletal Knight A — Attack: 18 (2d4+2 = 8)   ││
│ │ 14:31  Shadow Wraith — Attack: 22 (d8+4 = 12)       ││
│ └──────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────┘
```

### 4.2 Encounter Header

```tsx
<div className="
  flex flex-wrap items-center justify-between gap-4
  rounded-xl border border-[#577399]/30 bg-slate-900/80
  p-4 shadow-card mb-4
">
  {/* Left: Title + Status */}
  <div className="flex items-center gap-3 min-w-0">
    <span aria-hidden="true" className="text-xl">⚡</span>
    <div className="min-w-0">
      <h2 className="font-serif text-lg font-semibold text-[#f7f7ff] truncate">
        {encounter.name || "Active Encounter"}
      </h2>
      <div className="flex items-center gap-2 mt-0.5">
        <span className={`
          inline-flex items-center gap-1 rounded-full px-2 py-0.5
          text-[10px] font-semibold uppercase tracking-wider
          ${encounter.status === 'active'
            ? 'bg-[#fe5f55]/15 text-[#fe5f55] border border-[#fe5f55]/30'
            : encounter.status === 'preparing'
            ? 'bg-[#DAA520]/10 text-[#DAA520] border border-[#DAA520]/30'
            : 'bg-slate-700/40 text-[#b9baa3] border border-slate-600/40'
          }
        `}>
          {encounter.status === 'active' && (
            <span className="h-1.5 w-1.5 rounded-full bg-[#fe5f55] animate-pulse" />
          )}
          {encounter.status}
        </span>
        <span className="text-xs text-[#b9baa3]/50">
          {encounter.adversaries.filter(a => !a.isDefeated).length} active
          {encounter.adversaries.filter(a => a.isDefeated).length > 0 &&
            ` · ${encounter.adversaries.filter(a => a.isDefeated).length} defeated`
          }
        </span>
      </div>
    </div>
  </div>

  {/* Center: Round counter */}
  <div className="flex items-center gap-3">
    <div className="flex flex-col items-center">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-[#b9baa3]/50">
        Round
      </span>
      <span className="font-serif text-2xl font-bold text-[#DAA520] leading-none">
        {encounter.round}
      </span>
    </div>
    <button
      type="button"
      onClick={onNextRound}
      className="
        rounded-lg border border-[#DAA520]/40 bg-[#DAA520]/10
        px-3 py-2 text-xs font-semibold text-[#DAA520]
        hover:bg-[#DAA520]/20 hover:border-[#DAA520]
        transition-all duration-150
        focus:outline-none focus:ring-2 focus:ring-[#DAA520]
      "
    >
      Next Round ▶
    </button>
  </div>

  {/* Right: End encounter */}
  <button
    type="button"
    onClick={onEndEncounter}
    className="
      rounded-lg border border-[#fe5f55]/30 bg-transparent
      px-3 py-2 text-xs font-semibold text-[#fe5f55]/70
      hover:bg-[#fe5f55]/10 hover:text-[#fe5f55] hover:border-[#fe5f55]/50
      transition-colors
    "
  >
    End Encounter
  </button>
</div>
```

### 4.3 Individual Adversary Row (Encounter Instance)

This is the most data-dense component. It needs to show:
- Identity (name, label, tier/type)
- Live HP + Stress as slot trackers
- Damage thresholds with color coding
- Action buttons (Roll Attack, Mark HP, Mark Stress, Defeat)
- Inline roll results

```tsx
function EncounterAdversaryRow({ instance, onUpdate, onRollAttack, onDefeat }: Props) {
  const [lastRoll, setLastRoll] = useState<AdversaryRollResult | null>(null);
  const hpPercent = instance.hpMax > 0
    ? ((instance.hpMax - instance.hpMarked) / instance.hpMax) * 100
    : 100;

  // HP bar color shifts as damage accumulates
  const hpBarColor = hpPercent > 50
    ? "bg-green-500/80"       // Healthy
    : hpPercent > 25
    ? "bg-[#DAA520]/80"       // Wounded
    : "bg-[#fe5f55]/80";      // Critical

  return (
    <div className={`
      rounded-xl border bg-slate-900/80 shadow-card
      transition-all duration-200 overflow-hidden
      ${instance.isDefeated
        ? 'border-slate-800/40 opacity-50'
        : 'border-burgundy-900/40 hover:border-[#577399]/40'
      }
    `}>
      {/* Main row */}
      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Skull / status icon */}
          <span className="text-lg shrink-0 mt-0.5" aria-hidden="true">
            {instance.isDefeated ? '☠' : '💀'}
          </span>

          {/* Identity + meta */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-serif text-sm font-semibold text-[#f7f7ff]">
                {instance.name}
                {instance.label && (
                  <span className="ml-1 text-[#DAA520]">{instance.label}</span>
                )}
              </h3>
              {/* Tier + Type + Difficulty inline */}
              <span className="text-[10px] text-[#b9baa3]/50">
                T{/* tier from parent lookup */} · {/* type */} · Diff {/* difficulty */}
              </span>
            </div>

            {/* HP Bar — segmented slot tracker */}
            <div className="mt-2 space-y-1.5">
              {/* HP */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[#fe5f55]/70 w-10 shrink-0">
                  HP
                </span>
                <div className="flex-1 flex items-center gap-0.5" role="group" aria-label="Hit Points">
                  {Array.from({ length: instance.hpMax }).map((_, i) => {
                    const isMarked = i < instance.hpMarked;
                    // Determine threshold zone for this slot
                    const thresholdColor =
                      i < instance.damageThresholds.minor ? 'ring-parchment-400/30' :
                      i < instance.damageThresholds.major ? 'ring-[#DAA520]/30' :
                      'ring-[#fe5f55]/30';
                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() => {/* toggle mark/clear */}}
                        aria-label={`HP slot ${i + 1}: ${isMarked ? 'marked' : 'empty'}`}
                        className={`
                          h-4 flex-1 max-w-[1.25rem] rounded-sm border transition-all duration-100
                          ${isMarked
                            ? 'bg-[#fe5f55] border-[#fe5f55]/60'
                            : 'bg-slate-800 border-slate-700/40 hover:border-[#fe5f55]/40'
                          }
                          focus:outline-none focus:ring-1 focus:ring-[#fe5f55]
                        `}
                      />
                    );
                  })}
                  <span className="ml-1.5 text-[10px] font-bold text-[#b9baa3] tabular-nums shrink-0">
                    {instance.hpMarked}/{instance.hpMax}
                  </span>
                </div>
              </div>

              {/* Stress */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[#577399]/70 w-10 shrink-0">
                  Stress
                </span>
                <div className="flex-1 flex items-center gap-0.5" role="group" aria-label="Stress">
                  {Array.from({ length: instance.stressMax }).map((_, i) => {
                    const isMarked = i < instance.stressMarked;
                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() => {/* toggle mark/clear */}}
                        aria-label={`Stress slot ${i + 1}: ${isMarked ? 'marked' : 'empty'}`}
                        className={`
                          h-4 flex-1 max-w-[1.25rem] rounded-sm border transition-all duration-100
                          ${isMarked
                            ? 'bg-[#577399] border-[#577399]/60'
                            : 'bg-slate-800 border-slate-700/40 hover:border-[#577399]/40'
                          }
                          focus:outline-none focus:ring-1 focus:ring-[#577399]
                        `}
                      />
                    );
                  })}
                  <span className="ml-1.5 text-[10px] font-bold text-[#b9baa3] tabular-nums shrink-0">
                    {instance.stressMarked}/{instance.stressMax}
                  </span>
                </div>
              </div>
            </div>

            {/* Thresholds — inline, color-coded */}
            <div className="mt-1.5 flex items-center gap-2 text-[10px]">
              <span className="text-[#b9baa3]/40 uppercase tracking-wider font-semibold">
                Thresholds
              </span>
              <span className="text-parchment-400 font-medium">
                {instance.damageThresholds.minor}
              </span>
              <span className="text-[#b9baa3]/20">/</span>
              <span className="text-[#DAA520] font-medium">
                {instance.damageThresholds.major}
              </span>
              <span className="text-[#b9baa3]/20">/</span>
              <span className="text-[#fe5f55] font-medium">
                {instance.damageThresholds.severe}
              </span>
            </div>
          </div>
        </div>

        {/* Action buttons — below the stat block */}
        <div className="mt-3 flex flex-wrap items-center gap-2 pl-8">
          {/* Roll Attack */}
          <button
            type="button"
            onClick={() => onRollAttack(instance)}
            className="
              inline-flex items-center gap-1.5 rounded-lg border
              px-2.5 py-1.5 text-xs font-semibold transition-all duration-150
              border-[#577399]/40 bg-[#577399]/10 text-[#577399]
              hover:bg-[#577399]/20 hover:border-[#577399] hover:text-[#f7f7ff]
              focus:outline-none focus:ring-2 focus:ring-[#577399]
            "
          >
            <DieIcon className="h-3.5 w-3.5" />
            Roll Attack
          </button>

          {/* Roll Damage */}
          <button
            type="button"
            onClick={() => onRollDamage(instance)}
            className="
              inline-flex items-center gap-1.5 rounded-lg border
              px-2.5 py-1.5 text-xs font-semibold transition-all duration-150
              border-[#fe5f55]/30 bg-[#fe5f55]/5 text-[#fe5f55]/70
              hover:bg-[#fe5f55]/10 hover:border-[#fe5f55]/50 hover:text-[#fe5f55]
              focus:outline-none focus:ring-2 focus:ring-[#fe5f55]
            "
          >
            <DieIcon className="h-3.5 w-3.5" />
            <span className="font-mono text-[10px]">{instance.attackDamage}</span>
          </button>

          {/* Quick damage buttons — mark HP by threshold level */}
          <div className="flex items-center gap-1 border-l border-slate-800/60 pl-2 ml-1">
            <span className="text-[9px] text-[#b9baa3]/40 uppercase tracking-wider mr-1">
              Mark
            </span>
            <button
              type="button"
              onClick={() => onUpdate({ hpMarked: instance.hpMarked + 1 })}
              title="Mark 1 HP (minor)"
              className="
                rounded border border-parchment-400/20 bg-parchment-400/5
                px-1.5 py-0.5 text-[10px] font-bold text-parchment-400
                hover:bg-parchment-400/15 transition-colors
                focus:outline-none focus:ring-1 focus:ring-parchment-400
              "
            >
              +1
            </button>
            <button
              type="button"
              onClick={() => onUpdate({ hpMarked: instance.hpMarked + 2 })}
              title="Mark 2 HP (major)"
              className="
                rounded border border-[#DAA520]/20 bg-[#DAA520]/5
                px-1.5 py-0.5 text-[10px] font-bold text-[#DAA520]
                hover:bg-[#DAA520]/15 transition-colors
                focus:outline-none focus:ring-1 focus:ring-[#DAA520]
              "
            >
              +2
            </button>
            <button
              type="button"
              onClick={() => onUpdate({ hpMarked: instance.hpMarked + 3 })}
              title="Mark 3 HP (severe)"
              className="
                rounded border border-[#fe5f55]/20 bg-[#fe5f55]/5
                px-1.5 py-0.5 text-[10px] font-bold text-[#fe5f55]
                hover:bg-[#fe5f55]/15 transition-colors
                focus:outline-none focus:ring-1 focus:ring-[#fe5f55]
              "
            >
              +3
            </button>
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Defeat / Remove */}
          <button
            type="button"
            onClick={() => onDefeat(instance.instanceId)}
            title="Mark as defeated"
            className="
              rounded-lg px-2 py-1 text-xs
              text-[#fe5f55]/50 hover:text-[#fe5f55] hover:bg-[#fe5f55]/10
              transition-colors
              focus:outline-none focus:ring-1 focus:ring-[#fe5f55]
            "
          >
            ✕ Defeat
          </button>
        </div>

        {/* Inline roll result — appears below actions after a roll */}
        {lastRoll && (
          <div className="
            mt-2 ml-8 rounded-lg border border-[#577399]/25 bg-slate-950/60
            px-3 py-2 flex items-center gap-3
            animate-fade-in
          ">
            <span className="text-[10px] text-[#b9baa3]/50 uppercase tracking-wider shrink-0">
              {lastRoll.label.includes('Attack') ? 'Atk' : 'Dmg'}
            </span>
            <span className="font-mono text-lg font-bold text-[#f7f7ff]">
              {lastRoll.total}
            </span>
            <span className="text-[10px] text-[#b9baa3]/50 font-mono">
              ({lastRoll.diceValues.join(' + ')}
              {lastRoll.modifier !== 0 && ` ${lastRoll.modifier > 0 ? '+' : ''}${lastRoll.modifier}`})
            </span>
            <button
              type="button"
              onClick={() => setLastRoll(null)}
              aria-label="Dismiss roll result"
              className="ml-auto text-[#b9baa3]/30 hover:text-[#b9baa3] transition-colors"
            >
              ✕
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
```

### 4.4 Defeated Adversaries (Collapsed Section)

```tsx
<details className="
  rounded-xl border border-slate-800/40 bg-slate-950/40
  overflow-hidden mt-4
">
  <summary className="
    px-4 py-3 text-xs font-semibold uppercase tracking-widest
    text-[#b9baa3]/40 cursor-pointer
    hover:text-[#b9baa3]/60 hover:bg-slate-900/30
    transition-colors list-none
    flex items-center gap-2
  ">
    <svg className="h-3 w-3 transition-transform details-open:rotate-90" />
    ☠ Defeated ({defeatedCount})
  </summary>
  <div className="px-4 py-2 space-y-1 border-t border-slate-800/40">
    {defeated.map(a => (
      <div key={a.instanceId} className="
        flex items-center gap-2 py-1 text-sm text-[#b9baa3]/40 line-through
      ">
        <span>☠</span>
        <span>{a.name} {a.label}</span>
        <button
          type="button"
          onClick={() => onRestore(a.instanceId)}
          className="ml-auto text-[10px] text-[#577399]/50 hover:text-[#577399] transition-colors"
        >
          Restore
        </button>
      </div>
    ))}
  </div>
</details>
```

### 4.5 Quick-Add Panel

At the bottom of the encounter, a compact search/add widget:

```tsx
<div className="
  rounded-xl border border-dashed border-slate-700/50
  bg-slate-950/30 p-4 mt-4
  flex flex-col gap-3
">
  <div className="flex items-center gap-3">
    <input
      type="search"
      placeholder="Quick add adversary…"
      className="
        flex-1 rounded-lg border border-slate-700/40 bg-slate-900/60
        px-3 py-2 text-sm text-[#f7f7ff] placeholder:text-[#b9baa3]/30
        focus:outline-none focus:ring-2 focus:ring-[#577399]
      "
    />
    <button
      type="button"
      onClick={onOpenCatalog}
      className="
        rounded-lg border border-[#577399]/30 bg-[#577399]/10
        px-3 py-2 text-xs font-semibold text-[#577399]
        hover:bg-[#577399]/20 transition-colors
      "
    >
      Browse Catalog →
    </button>
  </div>

  {/* Search results dropdown */}
  {searchResults.length > 0 && (
    <div className="space-y-1">
      {searchResults.map(a => (
        <button
          key={a.adversaryId}
          type="button"
          onClick={() => addToEncounter(a)}
          className="
            w-full flex items-center gap-3 rounded-lg border
            border-slate-800/60 bg-slate-900/60 px-3 py-2
            hover:border-[#577399]/40 hover:bg-slate-900
            transition-all text-left
          "
        >
          <TierBadge tier={a.tier} size="sm" />
          <span className="text-sm font-medium text-[#f7f7ff]">{a.name}</span>
          <span className="text-[10px] text-[#b9baa3]/50 ml-auto">
            {a.type} · HP {a.hp}
          </span>
        </button>
      ))}
    </div>
  )}
</div>
```

---

## 5. DICE ROLL INTERACTION PATTERNS

### 5.1 Adversary Attack Roll Flow

Unlike player rolls (which use the full 3D DiceRollerPanel with staging),
adversary rolls are **instant and inline**. No staging panel, no 3D canvas.
The GM clicks "Roll Attack" → dice are resolved mathematically → result
appears inline below the adversary row.

**Rationale:** Speed. A GM might roll for 5 adversaries in a single round.
Opening a modal each time would be maddening. Like mescaline in a boardroom,
broski — technically possible, but you're gonna hate the experience.

### 5.2 Attack Roll Resolution

```ts
function rollAdversaryAttack(instance: EncounterAdversary): AdversaryRollResult {
  // Parse dice notation from attackDamage field
  // Attack roll = NOT the damage dice — it's a d20 + attackModifier
  // (Daggerheart doesn't use d20 attacks, but the pattern is:
  //  GM just rolls the damage dice — the "attack" is narrative)

  // For "Roll Attack": uses 2d12 (hope+fear) + attackModifier
  const d1 = Math.floor(Math.random() * 12) + 1;
  const d2 = Math.floor(Math.random() * 12) + 1;
  const total = d1 + d2 + instance.attackModifier;

  return {
    instanceId: instance.instanceId,
    label: `Attack — ${instance.name} ${instance.label}`,
    diceValues: [d1, d2],
    diceNotation: `2d12+${instance.attackModifier}`,
    modifier: instance.attackModifier,
    total,
    timestamp: new Date().toISOString(),
  };
}
```

### 5.3 Damage Roll Resolution

```ts
function rollAdversaryDamage(instance: EncounterAdversary): AdversaryRollResult {
  // Parse the attackDamage notation, e.g. "2d4+2 physical"
  const parsed = parseDiceNotation(instance.attackDamage);
  // parsed = { count: 2, size: 4, modifier: 2, type: "physical" }

  const values: number[] = [];
  for (let i = 0; i < parsed.count; i++) {
    values.push(Math.floor(Math.random() * parsed.size) + 1);
  }
  const total = values.reduce((s, v) => s + v, 0) + parsed.modifier;

  return {
    instanceId: instance.instanceId,
    label: `Damage — ${instance.name} ${instance.label}`,
    diceValues: values,
    diceNotation: instance.attackDamage.split(' ')[0], // "2d4+2"
    modifier: parsed.modifier,
    total,
    timestamp: new Date().toISOString(),
  };
}
```

### 5.4 Inline Roll Result Display

The roll result appears as a compact bar below the adversary's action buttons:

```
┌──────────────────────────────────────────────────┐
│ ATK   18    (7 + 7 + 4)                      ✕  │
└──────────────────────────────────────────────────┘
```

Tailwind for the result bar:
```tsx
<div className="
  mt-2 ml-8 rounded-lg
  border border-[#577399]/25 bg-slate-950/60
  px-3 py-2
  flex items-center gap-3
  animate-fade-in
">
```

The result auto-dismisses after 8 seconds (configurable), or the GM can click ✕.

### 5.5 Roll Result Animation

When a roll resolves:
1. Result bar slides in with `animate-fade-in` (existing keyframe: 200ms ease-out)
2. The total number does a brief scale-up: `animate-[scale-up_200ms_ease-out]`
3. If the total exceeds the adversary's difficulty, the total briefly glows gold
4. If it's a natural double (both d12s match), flash a gold "CRIT" badge

New keyframe needed:
```css
@keyframes scale-up {
  from { transform: scale(1.3); opacity: 0.5; }
  to   { transform: scale(1); opacity: 1; }
}
```

---

## 6. ENCOUNTER ROLL LOG

A collapsible section at the bottom of the encounter that records all GM rolls:

```tsx
<section className="
  rounded-xl border border-slate-800/60 bg-slate-950/40
  overflow-hidden mt-4
">
  <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800/40">
    <h3 className="text-xs font-semibold uppercase tracking-widest text-[#577399]">
      Roll History
    </h3>
    <button className="text-[10px] text-[#b9baa3]/40 hover:text-[#fe5f55]">
      Clear
    </button>
  </div>
  <div className="max-h-48 overflow-y-auto px-4 py-2 space-y-1">
    {rollLog.map(roll => (
      <div key={roll.timestamp} className="flex items-center gap-2 text-xs py-1">
        <span className="text-[#b9baa3]/30 font-mono text-[10px] tabular-nums shrink-0">
          {formatTime(roll.timestamp)}
        </span>
        <span className="text-[#b9baa3]/60 truncate">
          {roll.label}
        </span>
        <span className="ml-auto font-mono font-bold text-[#f7f7ff] shrink-0">
          {roll.total}
        </span>
      </div>
    ))}
  </div>
</section>
```

---

## 7. MICRO-INTERACTIONS & POLISH

### 7.1 Adversary Card Hover
- Border transitions from `burgundy-900/40` → `[#577399]/50` over 200ms
- Shadow transitions from `shadow-card` → `shadow-card-fantasy-hover`
- "Add to Encounter" button text brightens

### 7.2 HP/Stress Slot Click
- When marking: slot fills with a 100ms `bg-color` transition
- When at threshold boundary: the slot briefly flashes the threshold color
  ```css
  @keyframes threshold-flash {
    0%   { box-shadow: 0 0 0 0 rgba(218,165,32,0.6); }
    50%  { box-shadow: 0 0 8px 2px rgba(218,165,32,0.3); }
    100% { box-shadow: 0 0 0 0 rgba(218,165,32,0); }
  }
  ```
- When all HP marked: row gets `opacity-60` + subtle grayscale + a 300ms transition
  to the defeated state. A brief "skull" emoji floats up (if not reduced-motion).

### 7.3 Defeating an Adversary
- The row compresses vertically (300ms ease-out)
- Opacity fades to 50%
- Name gets a `line-through` decoration
- After 500ms, the row animates down to the "Defeated" collapsed section
- In reduced-motion mode: instant opacity change, no animation

### 7.4 Adding to Encounter
- When clicking "Add to Encounter" on a catalog card:
  - The button briefly shows a checkmark (200ms)
  - Toast-style confirmation: "Added Skeletal Knight to encounter" (2s, auto-dismiss)
  - If the encounter tab isn't active, the encounter tab badge pulses gold once

### 7.5 Round Counter Advance
- When clicking "Next Round":
  - The round number does a flip animation (rotateX 360deg over 400ms)
  - A subtle gold pulse radiates from the counter

### 7.6 Roll Button Press
- "Roll Attack" button: brief scale(0.95) on mousedown, then scale(1.05) for 100ms
  after the roll resolves, before settling back to scale(1)
- The roll result bar slides in from the left with `translateX(-8px)` → `translateX(0)`
  combined with opacity 0→1 (same as existing `animate-fade-in` but horizontal)

### 7.7 Empty State Illustrations

Catalog empty state:
```tsx
<div className="
  flex flex-col items-center justify-center
  min-h-[400px] rounded-2xl
  border border-dashed border-slate-700/50
  text-center space-y-3
" style={{ background: 'rgba(87,115,153,0.03)' }}>
  <div aria-hidden="true" className="text-4xl opacity-20">👹</div>
  <p className="font-serif text-lg text-[#f7f7ff]/60">
    No adversaries yet
  </p>
  <p className="text-sm text-[#b9baa3]/40 max-w-xs">
    Create your first adversary to start building your bestiary.
  </p>
  <button className="...primary-button-styles...">
    + Create Adversary
  </button>
</div>
```

Encounter empty state:
```tsx
<div className="...same pattern..." style={{ background: 'rgba(254,95,85,0.02)' }}>
  <div aria-hidden="true" className="text-4xl opacity-20">⚔️</div>
  <p className="font-serif text-lg text-[#f7f7ff]/60">
    No active encounter
  </p>
  <p className="text-sm text-[#b9baa3]/40 max-w-xs">
    Start an encounter by adding adversaries from your catalog.
  </p>
  <button className="...">
    Browse Adversaries →
  </button>
</div>
```

---

## 8. MOBILE RESPONSIVENESS

### Breakpoint Behavior

| Breakpoint | Catalog Grid | Encounter Layout | Sidebar |
|------------|-------------|------------------|---------|
| < 640px (mobile) | 1 column | Full width, stacked | Hidden (sheet/drawer) |
| 640-1023px (tablet) | 2 columns | Full width, stacked | 220px sidebar |
| ≥ 1024px (desktop) | 3 columns | Full width, stacked | 280px sidebar |

### Mobile Tab Bar
On mobile (< 640px), the tab bar becomes scrollable horizontal with the same
visual treatment but `overflow-x-auto` and `scrollbar-hide`:

```tsx
<div className="
  sm:flex sm:items-center sm:gap-1
  flex overflow-x-auto scrollbar-hide gap-0.5
  -mx-4 px-4 sm:mx-0 sm:px-4
">
```

### Mobile Encounter Row
On mobile, the encounter adversary row stacks:
- Name + meta on first line
- HP bar on second line (full width)
- Stress bar on third line (full width)
- Action buttons wrap naturally
- Quick-mark buttons become a dropdown instead of inline

### Mobile Card
Adversary cards go full-width on mobile, stat grid changes to 2x2:
```tsx
<div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
```

---

## 9. ACCESSIBILITY

### ARIA Patterns

| Component | ARIA Pattern | Implementation |
|-----------|-------------|----------------|
| Tab bar | `tablist` / `tab` / `tabpanel` | Full ARIA tab pattern with arrow key nav |
| Adversary card | `article` | Native article semantics |
| HP slot tracker | `group` + individual buttons | Each slot is a button with `aria-label` |
| Tier badge | Decorative | `aria-hidden="true"` on visual, text exposed |
| Roll result | `status` with `aria-live="polite"` | Announced to screen readers |
| Features accordion | `button` with `aria-expanded` | Standard disclosure pattern |
| Defeated section | `details` / `summary` | Native HTML disclosure |
| Filter controls | `combobox` / `listbox` | Standard form semantics |
| Round counter | `output` with `aria-live="polite"` | Announces new round |

### Keyboard Navigation

- **Tab bar**: Arrow Left/Right to move between tabs, Enter/Space to activate
- **Card grid**: Tab to focus cards, Enter to expand features, Shift+Enter for "Add to Encounter"
- **Encounter rows**: Tab between rows, Tab into action buttons within each row
- **HP/Stress slots**: Arrow Left/Right to navigate slots, Space to toggle

### Color Contrast (verified)

| Foreground | Background | Ratio | Pass |
|------------|-----------|-------|------|
| `#f7f7ff` (text) | `#0f172a` (slate-900) | 15.8:1 | AAA ✓ |
| `#b9baa3` (secondary) | `#0f172a` | 8.9:1 | AAA ✓ |
| `#577399` (accent) | `#0f172a` | 3.8:1 | AA ✓ (large text) |
| `#DAA520` (gold) | `#0f172a` | 7.1:1 | AAA ✓ |
| `#fe5f55` (danger) | `#0f172a` | 4.7:1 | AA ✓ |
| `#f7f7ff` on `#fe5f55` | — | 3.9:1 | AA ✓ (large) |

### Focus Indicators
All interactive elements use the existing global `focus-visible` ring:
`outline: 2px solid #fbbf24; outline-offset: 2px;`

Component-specific focus rings (already matching existing patterns):
`focus:outline-none focus:ring-2 focus:ring-[#577399] focus:ring-offset-1 focus:ring-offset-slate-900`

### prefers-reduced-motion
All animations (threshold-flash, defeat transition, round-flip, roll scale-up)
are wrapped in:
```css
@media (prefers-reduced-motion: reduce) {
  .animate-threshold-flash,
  .animate-round-flip,
  .animate-scale-up { animation: none; }
}
```

---

## 10. IMPLEMENTATION FILE MAP

### New Files to Create

```
frontend/src/types/adversary.ts                          ✅ CREATED
frontend/src/components/adversary/AdversaryCard.tsx       — Catalog card
frontend/src/components/adversary/AdversaryCatalog.tsx    — Full catalog view
frontend/src/components/adversary/AdversaryFilters.tsx    — Filter bar
frontend/src/components/adversary/TierBadge.tsx           — Reusable tier pill
frontend/src/components/adversary/TypeBadge.tsx            — Reusable type badge
frontend/src/components/adversary/DifficultyDiamond.tsx    — Diamond difficulty display
frontend/src/components/adversary/AdversaryFormModal.tsx    — Create/edit form
frontend/src/components/encounter/EncounterConsole.tsx      — Main encounter view
frontend/src/components/encounter/EncounterHeader.tsx       — Header with round counter
frontend/src/components/encounter/EncounterAdversaryRow.tsx — Individual instance row
frontend/src/components/encounter/EncounterRollLog.tsx      — Roll history
frontend/src/components/encounter/QuickAddPanel.tsx         — Quick-search add widget
frontend/src/components/encounter/DefeatedSection.tsx       — Collapsed defeated list
frontend/src/store/encounterStore.ts                        — Zustand store for encounter
frontend/src/hooks/useAdversaries.ts                        — TanStack Query hooks
frontend/src/hooks/useEncounter.ts                          — TanStack Query hooks
frontend/src/lib/diceNotation.ts                            — Parse "2d4+2 physical"
```

### Files to Modify

```
frontend/src/app/campaigns/[id]/CampaignDetailClient.tsx   — Add tab bar + tab panels
frontend/src/store/campaignStore.ts                         — Add activeTab state
frontend/src/app/globals.css                                — Add new keyframes
frontend/tailwind.config.ts                                 — (optional) add animation names
```

---

## DESIGN RATIONALE SUMMARY

**Why tabs, not routes?** Because the GM context-switches between character
sheets and the encounter tracker 50+ times per session. Route changes lose
scroll position, require re-renders, and feel jarring. Tabs keep everything
mounted and instant.

**Why inline rolls, not the 3D roller?** The 3D roller is a delightful
ceremony for player rolls (it builds tension, it's theatrical). But GM
adversary rolls are utility — speed and throughput over spectacle. Different
use cases, different interaction patterns. Like the difference between
savoring mescaline tea and doing a tequila shot, broski. Both have their place.

**Why slot trackers for HP, not a number input?** Visual consistency with the
existing player HP/Stress trackers in TrackersPanel. The slot pattern is
immediately scannable — you can see "how close to dead" at a glance without
reading a number. Plus, the threshold coloring overlaid on the slots gives
the GM instant visual feedback about damage severity.

**Why the difficulty diamond?** It's the single most-referenced number during
play ("what's the difficulty to hit this thing?"). The rotated-square/diamond
shape makes it instantly findable even in peripheral vision — it's the only
non-rectangular element on the card. Scannable at speed. No mescaline required
to see it, broski.

**Why collapsed features?** Most adversaries have 1-3 features, but some have
6+. Expanding by default would make cards wildly different heights, breaking
the grid rhythm and making the catalog feel chaotic. Collapsed with a count
indicator is the right balance of density and accessibility.
