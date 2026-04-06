# Dice Exit Animation — UX & Accessibility Guide

**Date:** 2026-03-27
**Auditor:** Usability & Accessibility Agent
**Scope:** `DiceRoller.tsx` · `DiceRollerPanel.tsx` · `DiceRollerModal.tsx` · `diceStore.ts`
**Standards:** WCAG 2.1 AA (2.3.3), `prefers-reduced-motion`, RPG UI best practice

---

## Problem Statement

After physics settle in the Cannon.js world, `dice.js` fires the `after_roll` callback → `resolveRoll()` sets `isRolling: false` in `diceStore` → the React phase state transitions from `"rolling"` → `"result"` → the `DiceRoller` canvas wrapper transitions from height-full to `h-0` (in `DiceRollerPanel`) or is conditionally unmounted (in `DiceRollerModal`). The 3D dice disappear instantaneously — there is no exit animation on the dice themselves.

The outer wrapper has a `transition-all duration-500` CSS transition that animates the *container* collapsing, but the canvas and its rendered dice disappear the moment the WebGL scene is cleared or the element is hidden — before the container transition completes. The result: dice vanish, then the empty black box shrinks. This is jarring.

---

## Candidate Comparison

### Option A — CSS Opacity Fade on `<canvas>`

Apply an `opacity` CSS transition directly to the `<canvas>` element or its immediate wrapper before the scene is cleared.

**Mechanism:**
- When physics settle (`after_roll` fires), set a "fading" CSS class on the canvas wrapper
- After `duration` ms (e.g. 600ms), call `resolveRoll()` to advance state
- The canvas fades out while the dice are still in their final resting positions

**Pros:**
- Trivial to implement — pure CSS + a setTimeout before calling resolveRoll
- No physics engine changes required
- Zero risk of dice going off-screen unexpectedly
- Feels "settled" — dice come to rest, then gently dissolve
- `prefers-reduced-motion` implementation is trivial (just snap to 0ms duration)
- Fully decoupled from the Cannon.js/dice.js engine internals

**Cons:**
- Less "exciting" than a physics-based exit
- The dice just fade in place — no sense of being "swept away"
- Can feel anticlimactic after an exciting roll

**Best-fit contexts:** Result modals, panels where the result panel immediately replaces the dice. The dissolution communicates "the roll is over."

---

### Option B — Physics Gravity Fall Through Bottom

Apply a downward velocity impulse to all Cannon.js rigid bodies when physics settle, causing dice to slide/tumble off the bottom edge before the canvas hides.

**Mechanism:**
- When `after_roll` fires, iterate `box.diceObjects` (all Cannon.Body instances)
- Apply `body.velocity.set(0, -30, 0)` or equivalent downward impulse
- Resume the physics render loop for ~800ms (dice fall offscreen)
- Then call `resolveRoll()` and hide canvas

**Pros:**
- Dramatically more satisfying in an RPG context — dice are "swept away" by gravity
- Creates a strong sense of closure — the roll is definitively *over*
- Aligns with the game's physical dice metaphor (dice fall off the table)
- Gives the animation a strong directional narrative (down = done)

**Cons:**
- Requires modifying `dice.js` internals (or hooking into the physics loop after `after_roll`)
- If `after_roll` fires and the render loop has already stopped, you need to restart it
- Dice may clip through the canvas edge visually (the canvas has `overflow-hidden`)
- More complex to implement correctly, especially with the `animationOnly` / OBS overlay path
- `prefers-reduced-motion` handling is more complex (need to suppress the impulse entirely)

---

## Recommendation: **Option A for correctness; layered with Option B for delight**

My firm recommendation is to **implement Option A** as the baseline (it's safe, always correct, and handles reduced-motion trivially) and treat **Option B as a progressive enhancement** that activates only when `prefers-reduced-motion` is not set.

In practice, this means:

```
prefers-reduced-motion: reduce   →  No animation. Result appears immediately.
prefers-reduced-motion: no-pref  →  Option A (fade) as minimum; Option B (fall) if physics hook is available.
```

If only one approach can be shipped in this sprint, **ship Option A**. It is the safe, accessible, production-ready choice.

If both can be shipped, implement them in a layered way as described below.

---

## Implementation Plan — Option A (Opacity Fade)

### Architecture

The key constraint is that `resolveRoll()` is called from inside `dice.js`'s `after_roll` callback, which is synchronous and immediately sets `isRolling: false`. To add a delay, you need to:

1. Defer calling `resolveRoll()` from inside `DiceRoller.tsx`
2. First transition the canvas wrapper to `opacity: 0`
3. After the transition completes, call `resolveRoll()`

### Step 1 — Add CSS transition state to DiceRoller

In `DiceRoller.tsx`, add a `fading` state:

```tsx
const [fading, setFading] = useState(false);
```

Modify the `after_roll` callback inside `fireRollRef.current` to:
1. Call `setFading(true)` to trigger CSS fade
2. After `fadeDuration` ms, call `resolveRoll()`

```tsx
// Inside fireRollRef.current — replace the resolveRoll call:
box.start_throw(
  null,
  (notation: { result: number[] }) => {
    const values = notation.result;
    const shouldReduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    const fadeDuration = shouldReduceMotion ? 0 : 600;

    if (fadeDuration === 0) {
      // Reduced motion: resolve immediately, no fade
      useDiceStore.getState().resolveRoll(values);
    } else {
      // Start opacity fade, resolve after transition completes
      setFading(true);
      setTimeout(() => {
        useDiceStore.getState().resolveRoll(values);
      }, fadeDuration);
    }
  },
  dieColors,
);
```

### Step 2 — Apply fade class to container

In the `DiceRoller` render, pass `fading` to the container:

```tsx
<div
  ref={containerRef}
  style={containerStyle}
  className={[
    "relative",
    fullBleed ? "" : "overflow-hidden rounded-xl",
    (transparent || fullBleed) ? "bg-transparent" : "bg-[#101010]",
    // Fade transition — always on, duration controlled by state
    "transition-opacity",
    fading ? "opacity-0 duration-[600ms] ease-in" : "opacity-100 duration-0",
  ].join(" ")}
  aria-hidden="true"
  data-testid="dice-roller-canvas"
>
```

Reset `fading` when a new roll starts:

```tsx
// Add to the pendingRequest effect:
useEffect(() => {
  if (!pendingRequest) return;
  setFading(false); // reset before each new roll
  fireRollRef.current();
}, [pendingRequest]);
```

### Step 3 — Timing and easing

| Parameter | Value | Rationale |
|---|---|---|
| **Fade duration** | `600ms` | Long enough to feel intentional; short enough not to block the result |
| **Easing** | `ease-in` | Starts slow (dice appear to linger), accelerates to invisible (feels like they "sink away") |
| **Total animation** | `600ms` | By the time the result panel slides in (it also has `transition-all duration-500`), the dice are gone |
| **Reduced motion** | `0ms` / instant | No transition at all — result appears immediately |

```css
/* Tailwind classes for the fade: */
transition-opacity duration-[600ms] ease-in   /* fading state */
transition-opacity duration-0                  /* non-fading state */
```

Or in CSS custom properties for clarity:

```css
/* globals.css addition */
.dice-canvas-exit {
  transition: opacity 600ms ease-in;
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  .dice-canvas-exit {
    transition: none;
    opacity: 0;
  }
}
```

---

## Implementation Plan — Option B (Physics Fall, Progressive Enhancement)

Only implement if Option A is already shipped and stable.

### Architecture

After `after_roll` fires (dice have settled), you need to:
1. Record the raw values (so `resolveRoll` has them)
2. Apply downward velocity to all Cannon bodies
3. Resume rendering for `fallDuration` ms
4. Then call `resolveRoll(values)` and set `fading(true)`

### Step 1 — Hook into dice.js after after_roll

`dice.js` exposes `box.diceObjects` — an array of `{ body: CANNON.Body, mesh: THREE.Mesh }`. After `after_roll`, the render loop has stopped. You need to restart it briefly.

```tsx
// Inside fireRollRef.current — full Option B callback:
box.start_throw(
  null,
  (notation: { result: number[] }) => {
    const values = notation.result;
    const shouldReduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (shouldReduceMotion) {
      // No animation — resolve immediately
      useDiceStore.getState().resolveRoll(values);
      return;
    }

    // === Option B: physics fall ===
    const fallDuration = 800; // ms for dice to fall offscreen
    const fadeDuration = 400; // ms for opacity fade after fall

    // Apply downward impulse to all dice bodies
    try {
      const diceObjects: Array<{ body: { velocity: { set: (x: number, y: number, z: number) => void }; angularVelocity: { set: (x: number, y: number, z: number) => void } } }> = box.diceObjects ?? [];
      for (const obj of diceObjects) {
        if (obj?.body) {
          // Downward velocity in Y (Three.js Y-up coordinate system)
          obj.body.velocity.set(
            (Math.random() - 0.5) * 4,  // slight horizontal scatter
            -18,                          // strong downward velocity
            (Math.random() - 0.5) * 2,  // slight depth scatter
          );
          obj.body.angularVelocity.set(
            (Math.random() - 0.5) * 8,  // tumbling
            (Math.random() - 0.5) * 8,
            (Math.random() - 0.5) * 8,
          );
        }
      }

      // Restart the render loop for fallDuration
      if (typeof box._renderLoop === "function") {
        box._renderLoop(); // resume rendering
      }
    } catch (err) {
      console.warn("[DiceRoller] Physics fall failed, falling back to fade:", err);
    }

    // After fall, fade, then resolve
    setTimeout(() => {
      setFading(true);
      setTimeout(() => {
        useDiceStore.getState().resolveRoll(values);
      }, fadeDuration);
    }, fallDuration);
  },
  dieColors,
);
```

**⚠️ Implementation Warning:** The `box._renderLoop` internals of `dice.js` are not part of the public API. Inspect the vendored `dice.js` source to confirm the method name before using it. If it's not available, Option B's fall animation won't work — fall back to Option A.

### Step 2 — Canvas overflow during fall

The `DiceRoller` container has `overflow-hidden`. For the dice to appear to fall *off-screen*, you need to:

Option B1 — **Remove overflow-hidden during fall** (allow dice to exit the canvas visually):
```tsx
// Toggle overflow based on fading state
className={[
  "relative",
  fading ? "overflow-visible" : "overflow-hidden",  // allow exit
  "rounded-xl",
  ...
].join(" ")}
```

Option B2 — **Add CSS clip-path fade** (dice fall into a bottom gradient):
```tsx
// Apply bottom fade overlay during fall to make dice appear to "sink"
{falling && (
  <div
    aria-hidden="true"
    className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[#101010] to-transparent pointer-events-none z-10"
  />
)}
```

Option B2 is recommended — it looks like the dice are falling into darkness below the canvas floor, which is thematic and requires no overflow changes.

---

## Timing & Easing Reference

### Option A (Fade Only — Recommended)

```
Physics settle → after_roll fires
  ├─ prefers-reduced-motion: reduce  → resolveRoll() immediately (0ms delay)
  └─ no preference:
       t=0ms    Canvas opacity: 1.0 → 0.0 begins (ease-in, 600ms)
       t=600ms  resolveRoll() called → phase: "rolling" → "result"
       t=600ms  Result panel fades in (existing transition-all duration-500)
```

### Option A + B (Layered — Progressive Enhancement)

```
Physics settle → after_roll fires
  ├─ prefers-reduced-motion: reduce  → resolveRoll() immediately (0ms delay)
  └─ no preference:
       t=0ms    Velocity impulse applied to all Cannon bodies
       t=0ms    Bottom gradient overlay appears
       t=0ms–800ms  Dice tumble downward (physics render loop active)
       t=800ms  Canvas opacity: 1.0 → 0.0 begins (ease-in, 400ms)
       t=1200ms resolveRoll() called → phase transitions
       t=1200ms Result panel fades in
```

### Total Animation Budget

| Scenario | Total Time | Feel |
|---|---|---|
| Reduced motion | 0ms | Instant — accessible |
| Option A only | 600ms | Clean, calm |
| Option A + B | 1200ms | Dramatic, satisfying |
| Too long (avoid) | > 1500ms | Frustrating during play |

**1200ms is the maximum acceptable budget** for the exit animation in a game context. Players want to see their result. If the total exceeds 1200ms, shorten the fall phase.

---

## Accessibility — `prefers-reduced-motion`

### Why This Matters

The vestibular system processes motion. For users with vestibular disorders (BPPV, labyrinthitis, Meniere's disease), animations — especially large-scale motion like dice *falling* — can trigger dizziness, nausea, or disorientation. The W3C estimates ~35% of adults over 40 have some vestibular dysfunction.

**WCAG 2.1 Success Criterion 2.3.3 — Animation from Interactions (AAA):** Motion animation triggered by interaction can be disabled unless essential.

While 2.3.3 is AAA (not required for AA compliance), `prefers-reduced-motion` is widely considered a baseline implementation requirement for any interactive motion. The existing `globals.css` already respects this for `ping-pulse` and `lore-slide-in` animations — the dice must follow the same pattern.

### Required Behaviour

| `prefers-reduced-motion` | Dice Exit | Result Display |
|---|---|---|
| `reduce` | **No animation.** `resolveRoll()` fires immediately. Canvas hides instantly. | Result appears instantly |
| `no-preference` (default) | **Full animation** (Option A fade, or Option A+B layered) | Result fades in normally |

### Implementation

```tsx
// DiceRoller.tsx — detect preference at callback time (not at mount time)
// This ensures a user who changes their OS preference mid-session is respected.

const shouldReduceMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;
```

```css
/* globals.css — add alongside existing reduced-motion rules */
@media (prefers-reduced-motion: reduce) {
  .dice-canvas-exit {
    transition: none !important;
    opacity: 0 !important;
  }
}
```

### What `prefers-reduced-motion` Should NOT Do

It should **not** suppress the 3D dice roll animation entirely. The dice rolling is the core interactive feedback for the roll action — removing it entirely would eliminate meaningful feedback. The correct behaviour is:

- **Keep:** The 3D dice throw animation (user initiated, core feedback)
- **Reduce/remove:** The exit animation (cosmetic, non-informational)

This matches the Web Animations API best practice: preserve functional animation, remove decorative animation.

---

## Changes Required in Each File

### `DiceRoller.tsx`
- Add `fading` state (`useState(false)`)
- Add `falling` state (`useState(false)`) — Option B only
- Reset both states when new `pendingRequest` arrives
- Modify `fireRollRef.current` to delay `resolveRoll()` with fade/fall logic
- Apply `fading` class to container div (opacity transition)
- Apply `falling` overlay — Option B only

### `DiceRollerPanel.tsx`
- The panel's canvas wrapper already has `transition-all duration-500` — this handles the *container* collapse animation, which should remain
- No changes required if `DiceRoller.tsx` handles its own fade — the container transition will naturally follow after `resolveRoll()` sets `phase: "result"`

### `DiceRollerModal.tsx`
- Same as `DiceRollerPanel.tsx` — no changes required if `DiceRoller.tsx` owns the fade

### `diceStore.ts`
- No changes required — `resolveRoll()` is called with a delay from inside `DiceRoller.tsx`

### `globals.css`
- Add `.dice-canvas-exit` utility class with `prefers-reduced-motion` override (optional but cleaner than inline Tailwind)

---

## QA Acceptance Criteria

### Functional
- [ ] After physics settle, dice do NOT disappear instantaneously
- [ ] Canvas opacity transitions to 0 over 600ms (Option A) before result phase appears
- [ ] Result panel appears only after dice have fully faded
- [ ] Dice fall downward before fading (Option B, if implemented)
- [ ] A new roll correctly resets `fading` and `falling` states before animation begins
- [ ] `animationOnly` mode (OBS overlay) uses the same exit pattern

### Accessibility
- [ ] With `prefers-reduced-motion: reduce` set in OS: result appears immediately with no animation
- [ ] With `prefers-reduced-motion: reduce`: no `opacity` transition, no physics fall
- [ ] The CSS media query is checked at callback time (not mount time) to handle dynamic preference changes
- [ ] No flicker or double-transition between dice fade and result panel fade-in

### Performance
- [ ] No memory leak — `setTimeout` callbacks are cancelled if component unmounts during fade (use `useRef` to store timeout ID and clear in cleanup)
- [ ] `fading` state is reset before each new roll so it doesn't carry over
- [ ] WebGL render loop is properly stopped after fall animation (Option B) — no runaway rendering

### Timeout Cleanup Pattern

```tsx
// DiceRoller.tsx — prevent memory leaks
const exitTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

// In the after_roll callback:
exitTimeoutRef.current = setTimeout(() => {
  useDiceStore.getState().resolveRoll(values);
}, fadeDuration);

// In the cleanup useEffect:
useEffect(() => {
  return () => {
    if (exitTimeoutRef.current) clearTimeout(exitTimeoutRef.current);
    try { boxRef.current?.clear?.(); } catch { /* ignore */ }
    // ... existing cleanup
  };
}, []);
```
