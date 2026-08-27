---
name: toolbox-taste
description: >-
  The design-taste playbook for the ToolBox money app (React 19 + MUI 6 +
  framer-motion, in ToolBoxFrontend/toolbox-frontend). Use this WHENEVER you
  build, restyle, or polish any ToolBox UI — a new screen, component, card,
  chart, animation, empty/loading/error state, or "make it look better / crazier
  / more premium" request — even when the user doesn't say "design". It holds the
  one bar every surface must clear: crazy but classy, spectacle in service of
  meaning. Consult it before writing UI, and again before calling that UI done.
---

# ToolBox taste

ToolBox is a personal-finance "Money OS" whose whole promise is that money feels
**intelligent and alive**. The UI is a top-1% differentiator — treat it that way.
The job is never "add an effect." It's: make this surface something a person
would *screenshot*, without it ever lying, lagging, or locking anyone out.

One sentence to hold in your head: **spectacle in service of meaning.** Every wild
visual is driven by a real number and degrades to a calm, usable state. If a
choice can't pass that test, it's chintz, not taste — cut it.

## The bar (read first, apply always)

These six are non-negotiable. They're what keep "crazy" from becoming "cheap."

1. **Data-true.** No animation invents or distorts a figure. Every bar, orbit,
   particle count, star size, and color maps to real user data, and the exact
   number is reachable (hover readout, label, tooltip, or center readout). When
   in doubt, render nothing rather than a fake number. A finance app is a trust
   product; one made-up figure poisons the whole thing.
2. **One motion language.** All springs, durations, and easings come from
   `src/theme/tokens.js` (`motion`), not ad-hoc numbers. Cohesive, not a
   grab-bag. Animate **transform and opacity only** — they're GPU-composited;
   animating layout/color/filter per-frame drops frames.
3. **Performance budget.** 60fps target. Lazy/behind-interaction for anything
   heavy; pause offscreen and when the tab is hidden; cap `devicePixelRatio` at
   2 on canvas. First paint stays fast — never block it on spectacle.
4. **Graceful degradation, always.** Every effect needs three fallbacks wired
   from the start: `prefers-reduced-motion` (hold still / compose one frame),
   **no data** (render null; the plain 2D card carries on), and **no support**
   (no-op). The reduced experience must be fully functional — no dead ends.
5. **Accessibility survives the spectacle.** Focus states, contrast, keyboard
   nav, and screen-reader labels all still work. Canvas gets `role="img"` + an
   `aria-label` summary AND a visually-hidden list of the same figures, so
   nothing critical lives only inside an animation.
6. **Reuse, don't fork.** Extend the existing `src/components/ui/` kit, the
   `theme/tokens.js` system, the one `MoneyContext`, and the ONE assistant/agent.
   Add components; never duplicate the architecture or invent a second design
   system.

If you're about to write `ALWAYS`/`NEVER` rigidity or a raw hex or a magic
duration, stop — reach for a token and explain the intent instead.

## The token system (calm futurism)

Read `src/theme/tokens.js` before styling; consume **roles**, never raw hex.

- **Accents** (`accents`): `blue` #0A84FF (primary), `violet` #7C5CFF (accent),
  `cyan` #64D2FF (cool highlight), `mint` #30D6A5 (positive/on-track),
  `amber` #FF9F0A (caution), `red` #FF453A (danger), `purple` #BF5AF2. Money is
  positive=mint, negative=red — keep that mapping everywhere.
- **Motion** (`motion`): durations `instant 90 / fast 160 / normal 240 /
  slow 380 / slower 560` (ms); easings `ease` = settle
  `cubic-bezier(0.32,0.72,0,1)`, `emphasis` = overshoot
  `cubic-bezier(0.34,1.56,0.64,1)`, `standard`. Entrances/blooms use `emphasis`;
  settles/returns use `ease`.
- Chart palette lives in `chart.categorical[mode]` — use it for per-category
  color, not the accents.
- Theme is mode-aware (light/dark). Every color must resolve in both; verify both.

## Writing motion that doesn't stall

The subtle, load-bearing lesson from what's shipped:

- **Write transforms straight to the node on the pointer/drag event**, the way
  `ui/MoneyConstellation.js` and `motion/TiltCard.js` do — `el.style.transform =
  ...` in the handler, not through `requestAnimationFrame`. rAF is *frozen* in a
  hidden/background tab, so rAF-gated transforms silently stop (and can't be
  verified in a backgrounded preview). Direct writes always land; the browser
  already coalesces pointermove.
- **Canvas scenes** (continuous animation) do use a rAF loop, but must:
  set `ctx.setTransform(dpr,0,0,dpr,0,0)` with `dpr = min(devicePixelRatio, 2)`;
  pause via `visibilitychange` + `IntersectionObserver`; and on
  `prefers-reduced-motion` draw exactly one still frame (no loop). See
  `ui/MoneyUniverse.js` as the reference implementation.
- **Reduced motion** is a live signal — subscribe to the media query, don't read
  it once. framer-motion's `useReducedMotion()` is the easy path for DOM.
- Springy "settle home" = a one-shot CSS transition with the `emphasis` curve
  (see the drag-release in `MoneyConstellation` / `BottomSheet`).

## The signature-moment catalog (reuse before you invent)

These already exist and define the house style. Extend or restyle them; only
build new when the moment is genuinely new. Read the file before touching it.

- `motion/AuroraBackground.js` — living backdrop keyed to Financial Weather
  (calm mint → stormy red). Drop behind a screen: `position:relative` root,
  `<AuroraBackground/>` first, content in a `zIndex:1` wrapper.
- `ui/MoneyUniverse.js` — hand-rolled 2D-canvas spatial scene; net-position star
  orbited by income/category/bill bodies sized by real amounts (sqrt so area
  tracks value). The template for any "data as a world" idea.
- `ui/AssistantOrb.js` + `ui/TypedLight.js` — the assistant as a presence:
  breathing/thinking/speaking orb, replies revealed as "typed light," result
  card emitted after the words land. Reuse for any AI surface.
- `motion/ParticleFlow.js` — one app-wide particle layer; fire money-in-motion
  with `window.dispatchEvent(new CustomEvent('toolbox:flow', {detail:{from,to,
  amount,color}}))`. Emission scales with the real amount.
- `motion/TiltCard.js` — pointer/gyro 3D tilt + glare for any card grid.
- `ui/CashFlowRiver.js` → `MoneyUniverse` — scrubbable time: dragging the river
  reflows the wider scene to that day's real projected balance (`onScrub`).
- `ui/feedback.js` — tactile finish: `feedback('success'|'error'|'send'|'open')`
  pairs haptics + synthesized sound (mutable, off-by-default sound). Fire on real
  user actions, never on load.
- `ui/FinancialWeather.js` (`deriveWeather`) — the shared "climate" signal many
  effects key off. Reuse it so the whole app shares one mood.

## Building a new UI piece — the checklist

Before writing:
- What real figure(s) does this show? Where does the exact number stay reachable?
- Which existing `ui/` component or signature moment can I extend instead?
- Which tokens (accent role, motion duration/easing) apply?

While writing:
- Transform/opacity only; tokens for all timing/easing; direct-write transforms
  on pointer events.
- Wire the three fallbacks (reduced-motion, no-data → null, no-support → no-op)
  as you go, not after.
- Accessible names + a text path to every figure that's shown visually.
- Mobile-first: it must feel native on a phone (touch targets ≥ ~40px,
  `touch-action` set for drags, magnetic/gesture sheets via `ui/BottomSheet.js`).

## Verification discipline (before calling ANY UI change done)

Verify in the browser preview — never ask the user to eyeball it. Run the full
matrix and screenshot proof:

- **Desktop AND mobile** viewport (resize to a phone width and reload).
- **Light AND dark** theme.
- **Motion on AND reduced** (temporarily force reduced-motion if the pane can't
  emulate the media query, screenshot, then revert).
- Console clean (no new errors); production build compiles.
- The exact real number is reachable and correct (hover/readout matches the API).

Note: the in-app preview tab is often backgrounded, so `requestAnimationFrame`
and `setInterval` are throttled/frozen there — screenshots still render the
current frame, and direct-write transforms still work, but time-based reveals
crawl. Verify those with a quick forced/short-path check rather than waiting.

## Anti-patterns (these read as cheap)

- Effects with no data behind them, or a figure that only exists inside motion.
- Raw hex / magic durations instead of tokens; a second, inconsistent motion feel.
- Animating layout/color/filter per frame; unthrottled offscreen canvas work.
- Spectacle that breaks keyboard/reduced-motion/no-data users.
- A new component that reimplements something already in `ui/`.
- Auto-playing sound; haptics/sound on page load instead of on a real action.

Crazy is the goal. Classy is the constraint. Data-true is the license. Hit all
three and it's ToolBox.
