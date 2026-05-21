# Curses! Landing Page — Section-by-Section Visual Treatments

> **Purpose:** Pixel-precise visual specifications for every section of the Curses! marketing landing page. Each treatment maps directly to the existing Tailwind theme, component library, and narrative framework. Dark-mode only. Fantasy-meets-editorial. Griflan-informed vertical rhythm.

---

## Visual System Constants

| Token | Value | Notes |
|---|---|---|
| **Page background** | `bg-slate-950` (`#080d17`) | Constant across all "solid" sections |
| **Section vertical rhythm** | `py-[120px]` mobile → `py-[160px]` desktop | Griflan-scale dramatic breathing room |
| **Content max-width** | `max-w-7xl` (nav), `max-w-6xl` (features), `max-w-5xl` (pricing), `max-w-4xl` (hero/CTA) | Narrower = more intimate; wider = more structural |
| **Ornamental dividers** | `h-px bg-gradient-to-r from-transparent via-gold-400/20 to-transparent` | Between every major section pair |
| **Card base** | `rounded-xl border border-slate-700/40 bg-slate-900/60 backdrop-blur-sm shadow-card` | Unified card surface |
| **Gold gradient text** | `bg-gradient-to-r from-gold-300 via-gold-400 to-gold-500 bg-clip-text text-transparent` | Reserved for hero headline keyword + final CTA keyword |
| **Section label** | `text-sm font-sans font-semibold uppercase tracking-[0.2em] text-gold-400/80` | Every section gets one above the `<h2>` |
| **Scroll reveal** | `opacity-0 translate-y-8` → `opacity-100 translate-y-0`, `duration-700 ease-out` | Emerging-from-shadow feel, never bouncy |

---

## Section 1: Sticky Navigation Bar

**Background:** Transparent at top. On scroll past 80px: `bg-slate-950/95 backdrop-blur-md border-b border-slate-800/60 shadow-lg`. Transition: `duration-300`.
**Height:** `h-16` mobile, `h-20` desktop (`sm:h-20`). Fixed, `z-50`.
**Content max-width:** `max-w-7xl` with `px-4 sm:px-6 lg:px-8`.
**Layout:** Flexbox, `justify-between items-center`. Logo left, nav links center (hidden below `md`), CTA buttons right.
**Logo:** `width={130}` on desktop, Curses! isolated logo. `object-contain`. `priority` load.
**Nav links:** `text-sm font-semibold text-parchment-400 hover:text-gold-400 transition-colors`. Three items: Features, Pricing, Community. Smooth-scroll `onClick`.
**CTA cluster:** Ghost "Log In" button (`border border-parchment-500/30 text-parchment-400`) + solid "Start Free" button (`bg-gradient-to-r from-gold-400 to-gold-500 text-slate-950 shadow-glow-gold`). Both `rounded-lg`.
**Mobile:** Hamburger with animated three-bar → X morph (`rotate-45`, `opacity-0`, `-rotate-45`). Dropdown panel with `max-height` transition, `border-t border-slate-800/60`. Touch targets `min-h-[44px]`.
**Key visual accent:** The gold "Start Free" pill — only persistent gold element on screen during scroll. Acts as a lighthouse.

---

## Section 2: Hero Section

**Background:** Full-viewport (`min-h-screen`). Three-layer composite:
1. Base: `bg-gradient-to-br from-burgundy-950 via-slate-950 to-slate-900` (placeholder for future fantasy painting)
2. Vertical overlay: `bg-gradient-to-b from-slate-950/30 via-transparent to-slate-950` (grounds top/bottom)
3. Lateral overlay: `bg-gradient-to-r from-slate-950/60 via-transparent to-slate-950/60` (vignette)

**Atmospheric glow:** Centered radial blur element — `w-[600px] h-[600px] rounded-full opacity-20 blur-[120px]` with `radial-gradient(circle, rgba(251,191,36,0.3) 0%, rgba(170,32,71,0.15) 50%, transparent 70%)`. Positioned `top-1/4 left-1/2 -translate-x-1/2`. Pure CSS, no JS.
**Content max-width:** `max-w-4xl`, centered. `pt-24 pb-16` mobile, vertically centered desktop.
**Typography hierarchy:**
- Kicker: `font-sans text-sm sm:text-base font-semibold uppercase tracking-[0.2em] text-gold-400/80`
- H1: `font-display text-5xl sm:text-6xl md:text-7xl lg:text-8xl leading-[0.95] text-parchment-50`. Push `jetsam-collection-basilea` to maximum scale here — nowhere else in app goes this large.
- Gold keyword: "Starts Here" in `bg-gradient-to-r from-gold-300 via-gold-400 to-gold-500 bg-clip-text text-transparent`
- Subhead: `font-body text-lg sm:text-xl text-parchment-400 leading-relaxed max-w-xl mx-auto`

**CTAs:** Flex row on desktop, stack on mobile. Primary: gold gradient pill with shimmer hover (`via-white/20 translate-x-full duration-700`). Secondary: ghost border pill (`border-parchment-400/30 hover:border-gold-400/50`). Both `rounded-xl px-8 py-4`.
**Scroll indicator:** `absolute bottom-8`, centered. `animate-bounce opacity-50`. Chevron + "Scroll to explore" micro-text in `text-xs uppercase tracking-widest text-parchment-500`.
**Key visual accent:** The massive `jetsam-collection-basilea` headline with gold gradient fragment. This is the entire section — type IS the visual. Griflan-scale typographic dominance.

---

## Section 3: Marquee Ribbon

**Background:** `bg-gradient-to-r from-burgundy-900/60 via-burgundy-950/80 to-burgundy-900/60`. Top and bottom borders: `border-y border-burgundy-800/30`.
**Vertical spacing:** `py-3`. Intentionally tight — this is a connective tissue element, not a section.
**Layout:** Single-row infinite marquee. CSS `@keyframes` horizontal scroll. `overflow-hidden`.
**Typography:** `text-sm font-sans font-semibold tracking-wider uppercase text-gold-400/70`. Items separated by `◆` diamonds in `text-gold-400/30`.
**Content:** Feature keywords doubled for seamless loop: Character Builder, Twitch Overlays, Campaign Manager, Encounter Designer, Session Logs, Stream-Ready Sheets, Guided Creation, OBS Integration, Command HUD, Scheduling, Dice Roller, Domain Vault.
**Key visual accent:** The warm burgundy glow band breaking the dark vertical rhythm. Functions as a visual "breath" between hero gravitas and content sections. `aria-hidden="true"` — decorative only.

---

## Section 4: "What Is Curses?" (About/Overview)

**Background:** Solid `bg-slate-950`. No gradient, no image. Cleanest section on page — editorial restraint.
**Vertical spacing:** `py-20 sm:py-28` (80px mobile → 112px desktop). _Note: current values slightly below Griflan 120-160px target. Acceptable here because stats strip + screenshot add internal mass._
**Content max-width:** `max-w-6xl` outer container, `max-w-3xl` for centered text block, `max-w-4xl` for screenshot.
**Layout:** Center-aligned, single column. Three internal beats stacked vertically:
1. **Heading block:** `font-serif text-3xl sm:text-4xl font-bold text-parchment-50` + body paragraph in `font-body text-base sm:text-lg text-parchment-400 leading-relaxed`.
2. **Stats strip:** Horizontal flex on desktop, vertical stack on mobile. Three stat pods (`100% / $5 / Built`) in `font-display text-3xl text-gold-400` with `text-sm text-parchment-500 uppercase tracking-wider` labels. Separated by vertical gold gradient dividers: `w-px h-12 bg-gradient-to-b from-transparent via-gold-400/30 to-transparent`.
3. **App screenshot placeholder:** Faux browser chrome (`rounded-2xl border border-slate-700/30 bg-gradient-to-br from-slate-850 to-slate-900 shadow-sheet`). Three traffic-light dots (burgundy, gold, steel). URL bar in `text-xs text-slate-600`. 16:9 aspect ratio content area.

**Key visual accent:** The gold stat numbers. Three large `font-display` numerals in gold — the only color in an otherwise monochrome section. Creates a scannable value anchor.

---

## Section 5: Streaming & Content Creation Features

**Background:** `FantasyBgSection` wrapper — base gradient `from-burgundy-950 via-slate-950 to-slate-900` with heavy overlay `bg-gradient-to-b from-slate-950 via-slate-950/85 to-slate-950`. This creates a *hint* of burgundy warmth bleeding through without competing with content. Future: replace base with actual fantasy painting.
**Vertical spacing:** `py-20 sm:py-28`. Followed by ornamental gold divider.
**Content max-width:** `max-w-6xl`, `max-w-3xl` for header text.
**Layout:** Center-aligned header → 3-column grid (`grid-cols-1 md:grid-cols-3 gap-6`) for feature cards → centered link below.
**Card style:** `FeatureCard` component. `rounded-xl border border-slate-700/40 bg-slate-900/60 p-6 backdrop-blur-sm shadow-card`. Hover: `hover:-translate-y-1 hover:border-gold-400/30 hover:shadow-glow-gold transition-all duration-300`. Icon container: `rounded-lg bg-gradient-to-br from-burgundy-900/60 to-slate-900 border border-burgundy-800/30` with `text-gold-400` FontAwesome icon.
**Stagger animation:** Cards reveal with `120ms` offset per index. Emerge-from-shadow, never bounce.
**Section link:** `text-gold-400 hover:text-gold-300` with arrow icon that `group-hover:translate-x-1`. Understated — not a button, an editorial "continue reading" gesture.
**Key visual accent:** The three card icons glowing gold against the burgundy-tinted background. The `backdrop-blur-sm` on cards creates a frosted glass depth layer against the fantasy bg.

---

## Section 6: Campaign Command Center Features

**Background:** Solid `bg-slate-950`. Clean surface — contrast with the previous FantasyBg section.
**Vertical spacing:** `py-20 sm:py-28`.
**Content max-width:** `max-w-6xl`.
**Layout:** **Two-column asymmetric grid** (`grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center`). Text-left, image-right on desktop. Reversed order on mobile (image first via `order-1 lg:order-2` / `order-2 lg:order-1`). This is the Griflan alternating-alignment pattern — Section 5 was centered, Section 6 is split, Section 7 will return to centered.
**Feature list style:** Not cards — inline rows. `flex items-start gap-4 p-4 rounded-lg border border-slate-800/40 bg-slate-900/30 hover:border-gold-400/20`. Icon in `rounded-lg bg-burgundy-900/40 border border-burgundy-800/30`. Stagger-revealed with `120ms` offset. Compact, scannable, list-like. Four items: Encounter Designer, Session Logs, Session Scheduling, Command HUD.
**Image placeholder:** `ImagePlaceholder` at `4/3` aspect ratio with `shadow-sheet`. Right column.
**Section link:** Same editorial arrow pattern as Section 5.
**Key visual accent:** The left-aligned text mass. This is the densest text section — the asymmetric layout and generous `gap-16` prevent it from feeling overwhelming. The four gold icons create a vertical rhythm down the left edge.

---

## Section 7: New Player Experience

**Background:** `FantasyBgSection` — same treatment as Section 5. Warm burgundy bleeds through heavy slate overlay. Creates a visual "bookend" pattern: Sections 5 and 7 share the fantasy bg treatment while Section 6 (between them) sits on clean slate. This alternation is critical rhythm.
**Vertical spacing:** `py-20 sm:py-28`. Followed by ornamental gold divider.
**Content max-width:** `max-w-6xl` outer, `max-w-3xl` header, `max-w-4xl` card grid.
**Layout:** Center-aligned header → 3-column grid (`grid-cols-1 sm:grid-cols-3 gap-6`) for step cards → centered link.
**Step card style:** `StepCard` component. Same card base as feature cards. Numbered circle: `rounded-full bg-gradient-to-br from-gold-400 to-gold-600 text-slate-950 font-display text-xl font-bold` — `h-10 w-10`. The gold circles are the distinguishing element. Step 1, 2, 3 — clear sequential reading.
**Key visual accent:** The three gold numbered circles. They create a visual "1 → 2 → 3" progression that communicates simplicity before the visitor reads a word. The gold-on-dark gradient circles are the most concentrated gold elements on the page outside of CTA buttons.

---

## Section 8: Pricing

**Background:** Solid `bg-slate-950`. No ornament, no texture. Pricing demands maximum clarity — visual noise is the enemy of trust.
**Vertical spacing:** `py-20 sm:py-28`.
**Content max-width:** `max-w-5xl` outer, `max-w-3xl` header + card grid.
**Layout:** Center-aligned header → 2-column grid (`grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl mx-auto`).
**Card styles — Player (non-highlighted):** `rounded-2xl border border-slate-700/40 bg-slate-900/60 p-8 shadow-card`. Ghost CTA: `border border-parchment-500/30 text-parchment-300 hover:border-gold-400/50 hover:text-gold-400`.
**Card styles — GM (highlighted):** `border-gold-400/50 bg-gradient-to-b from-slate-850 to-slate-900 shadow-glow-gold`. "Recommended" badge: `absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-gold-400 to-gold-500 px-4 py-1 text-xs font-bold uppercase tracking-wider text-slate-950`. Solid CTA: `bg-gradient-to-r from-gold-400 to-gold-500 text-slate-950 shadow-glow-gold`.
**Price typography:** `font-display text-4xl text-gold-400` for the price, `text-sm text-parchment-600` for period. Checklist: `fa-check text-gold-400 text-xs` per item.
**Key visual accent:** The GM card's `shadow-glow-gold` — a soft 14px gold glow halo that makes the highlighted card *float* above its neighbor. The "Recommended" badge breaks the card's top edge, creating vertical interruption that draws the eye.

---

## Section 9: Social Proof / Community

**Background:** `bg-slate-950` with `border-t border-slate-800/30` — subtle top border differentiates from Pricing above without a full ornamental divider. Understated transition.
**Vertical spacing:** `py-20 sm:py-28`.
**Content max-width:** `max-w-6xl`.
**Layout:** Center-aligned header → 3-column testimonial grid (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6`) → community CTA card.
**Testimonial card style:** Standard card base. Gold `fa-quote-left` at `text-2xl text-gold-400/40` (ghosted — atmospheric, not dominant). Quote in `text-sm text-parchment-400 italic`. Author avatar: `rounded-full bg-gradient-to-br from-burgundy-800 to-slate-800 border border-slate-700/40` with initial letter.
**Community CTA card:** Large container: `rounded-2xl border border-slate-700/40 bg-slate-900/40 p-8 sm:p-12 text-center`. Discord button: `bg-[#5865F2] text-white hover:bg-[#4752C4] rounded-xl shadow-lg` — Discord's own brand blue, the ONLY non-palette color on the entire page. Featured streams sub-section with `border-t border-slate-700/30` internal divider, 3-column `16/9` thumbnails.
**Key visual accent:** The Discord-blue button. It breaks the gold/burgundy/parchment palette with intentional brand-color contrast. One alien hue in an otherwise monochrome warm page — it demands attention precisely because it doesn't belong to the palette.

---

## Section 10: Final CTA

**Background:** `FantasyBgSection` — same base gradient as Sections 5 and 7, but with a *lighter* overlay: `bg-gradient-to-b from-slate-950/80 via-slate-950/90 to-slate-950`. More burgundy warmth bleeds through than any previous section. This is the emotional crescendo — the background should feel warmer, more inviting, less suppressed.
**Vertical spacing:** `py-24 sm:py-32` — the MOST generous padding on the page. 96px mobile → 128px desktop. This section breathes more than anything else. The extra space creates gravitas.
**Content max-width:** `max-w-4xl`, centered. Same intimate width as the hero — bookend symmetry.
**Typography:** `font-display text-4xl sm:text-5xl md:text-6xl leading-[0.95] text-parchment-50`. Gold gradient on "Roll?" — mirrors the hero's "Starts Here" treatment. `font-body text-lg text-parchment-400 max-w-xl` for supporting line.
**CTAs:** Same dual-button pattern as hero. Primary gold pill with shimmer effect. Secondary ghost "Log In" pill. Both `rounded-xl px-10 py-4 text-lg` — slightly larger than Section 2's buttons to create a sense of finality and commitment.
**Key visual accent:** The gold shimmer CTA against the warmest background on the page. The `shadow-glow-gold` creates a literal glow — a beacon. Combined with the `jetsam-collection-basilea` display font, this section should feel like the last page of a story that ends with an invitation.

---

## Section 11: Footer

**Background:** `bg-slate-950` with `border-t border-slate-800/60` — the strongest section border on the page. Signals structural end.
**Vertical spacing:** `py-12` (48px). Deliberately compact after the generous CTA section. Footer should feel grounded, not dramatic.
**Content max-width:** `max-w-6xl`.
**Layout:** 4-column grid on desktop (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8`). Column 1: logo + tagline. Columns 2-4: link groups (Product, Community, Legal).
**Typography:** Column headers in `font-sans text-sm font-semibold uppercase tracking-wider text-parchment-300`. Links in `text-sm text-parchment-500 hover:text-gold-400`. Tagline in `text-sm text-parchment-600 leading-relaxed`. Attribution in `text-xs text-parchment-600/60`.
**Internal divider:** `h-px bg-gradient-to-r from-transparent via-slate-700/40 to-transparent mb-8` between link grid and bottom row.
**Bottom row:** Social icons (`w-9 h-9 rounded-lg border border-slate-700/40 text-parchment-600 hover:text-gold-400 hover:border-gold-400/30`) + Man in Jumpsuit logo (`opacity-50 hover:opacity-70`) + copyright.
**Key visual accent:** None — intentionally. The footer is quiet. The gold hover states on links are the only warmth. This contrast makes the Final CTA section above feel even brighter by comparison.

---

## Visual Rhythm Summary

```
Section        Background          Alignment    Width      Divider After
─────────────────────────────────────────────────────────────────────────
Nav            Transparent→Frosted  —           max-w-7xl  —
Hero           Fantasy gradient     Center       max-w-4xl  —
Marquee        Burgundy band        —           full       —
What Is        Solid slate          Center       max-w-6xl  —
Streaming      Fantasy + overlay    Center       max-w-6xl  Gold line
Campaigns      Solid slate          Split L/R    max-w-6xl  —
New Player     Fantasy + overlay    Center       max-w-6xl  Gold line
Pricing        Solid slate          Center       max-w-5xl  —
Community      Solid slate + border Center       max-w-6xl  —
Final CTA      Fantasy (warm)       Center       max-w-4xl  —
Footer         Solid slate + border 4-col grid   max-w-6xl  —
```

**The alternation pattern:** Fantasy bg → Solid → Fantasy bg → Solid → Solid → Fantasy bg → Solid. Three fantasy sections at strategic emotional peaks (streaming showcase, new player hope, final invitation). Solid slate sections for trust and clarity (overview, campaigns, pricing, community). The background alternation creates a *breathing* rhythm — immersive → grounded → immersive — without ever being predictable.

**Gold divider placement:** Only between the two section pairs that transition from fantasy-bg to solid-bg (Streaming→Campaigns, NewPlayer→Pricing). These gold hairlines act as visual "exhales" — elegant resolution after atmospheric sections.
