# Hyperframes Composition Brief: Money OS

## Objective
Create a short launch-style brag video for Money OS — a personal finance operating system. This cut is a fast feature TOUR, not a single joke stretched thin: real dashboard, AI natural-language expense entry, a sci-fi "Pulse" spending HUD, a 3D "Money Universe," a "Crime Scene" spending-verdict dossier, and hands-free Apple Shortcuts/Siri logging.

## Output
- Composition directory: `brag-output/composition/`
- Rendered video: `brag-output/brag.mp4`
- Format: landscape — 1920x1080
- Duration: ~22.5 seconds

## Source Material
- Project root: `/Users/jaiparmani/Desktop/SELF/TECH/DEVELOPMENT/ToolBoxProject/ToolBoxFrontend/toolbox-frontend`
- Primary files read: `src/theme/tokens.js` (design tokens), `src/components/screens/CrimeScenePage.js`, `src/components/screens/MoneyUniversePage.js`, `src/components/screens/LandingPage.js` (home dashboard), `src/components/screens/CashFlowPulsePage.js` ("Pulse" HUD), `src/components/screens/SplitsPage.js`, `src/components/ui/Assistant.js` (AI assistant), `src/components/screens/ShareTargetPage.js`, `src/components/ui/ShortcutConnect.js`, `ToolBoxWebServices/toolboxservices/expenses/services.py` (AI system prompt), and the real `.shortcut` files under `ToolBoxProject/shortcuts/`
- Product name: Money OS
- Tagline / strongest claim: "Your money operating system." — this cut is built around *range* (six distinct real features) rather than one gag
- Key UI or visual moments to recreate: the Assistant's typed natural-language add ("20 aamras" → parsed card), the Pulse HUD boot sequence, the Money Universe 3D orbiting-bodies scene, the Crime Scene "PRIMARY SUSPECT" reveal, and the Shortcuts "Hey Siri, Log Expense" flow
- Copy that must appear verbatim:
  - "20 aamras" (real Assistant example chip text)
  - "READING PURCHASE HISTORY" and "DRAG TO ORBIT · SCROLL TO ZOOM" (real Pulse HUD copy)
  - "PRIMARY SUSPECT" and "TABLE FOR ONE. BILL FOR FIVE." (real Crime Scene copy)
  - "Hey Siri, Log Expense" and "What did you spend?" (real Shortcut prompt, from the shipped `.shortcut` file)
  - "Money OS"

## Creative Direction
- Tone preset: chaotic
- Creative direction: a feature-dense highlight reel played at full speed — "this app does WAY too much, and yes, all of it is real"
- Interpretation: fast cuts (≤3s per scene), hard/flash/zoom transitions, oversized all-caps type, short aggressive phrases, dense rhythmic music from frame 1. Nine scenes (more than the usual 6-8) because breadth is the point of this cut — keep pace snappy so it never drags.
- Angle: Money OS logs an expense from two typed words, turns your month into a spy-movie HUD and a 3D solar system, opens a case file on your worst habit, and does all of it hands-free via Siri. The humor and spectacle are 100% real product copy and real UI, nothing invented.
- Hook: hard cut to black, crime-tape flash, "PERSONAL FINANCE" / "WAS TOO CALM." slams in — a general "we made this weird" hook, not a promise about one specific feature.
- Outro / punchline: "MONEY OS" wordmark slams full-screen with a violet/blue glow, tagline "YOUR MONEY OPERATING SYSTEM. IT DOES A LOT."
- Avoid:
  - Generic SaaS language ("streamline your workflow" etc.)
  - Abstract filler visuals / stock motion graphics
  - Any redesign of the product's actual visual identity — use its real palette and type
  - Letting any single feature (especially Crime Scene) dominate runtime — six features get roughly equal weight

## Visual Identity
- Background: `#0b0b10` (ink, dark mode)
- Text: `#f5f6fa` (dark mode primary text); crime-tape yellow `#F5C518` and crime red `#FF3B30` for the Crime Scene beat specifically, on a warm off-white "paper" ink `rgba(240,232,210,0.92)`
- Accent: `#0A84FF` primary blue, `#7C5CFF` secondary violet, supporting mint `#30D6A5` and amber `#FF9F0A`
- Display font: "Geist Variable" (self-hosted via `@fontsource-variable/geist`) for headings and money figures — fall back to a heavy geometric sans if unavailable in the render environment
- Body font: -apple-system / BlinkMacSystemFont / "SF Pro Display" / Inter stack
- Visual references from the project: dark "calm futurism" surfaces with translucent glass panels (`rgba(20,20,26,0.86)`), money figures large and confident, the Crime Scene page's crime-tape-yellow-on-ink evidence-dossier styling, the Money Universe's orbiting glowing bodies on deep ink space

## Storyboard
Use the storyboard in `brag-output/brag-plan.md` as the creative contract.

Scene summary:
1. Hook — 2.0s — black frame, crime-tape flash, "PERSONAL FINANCE / WAS TOO CALM." slams in
2. Reveal: the app — 2.0s — Home dashboard, net-balance hero number counts up, "MONEY OS" wordmark stamps in
3. AI auto-add — 3.0s — typed "20 aamras" in the Assistant, parsed card slides in with a "Saved" badge; caption "TYPE IT. AI ADDS IT."
4. Pulse (sci-fi HUD) — 2.8s — near-black mission-control screen, boot text "READING PURCHASE HISTORY," corner brackets, "DRAG TO ORBIT · SCROLL TO ZOOM"
5. Money Universe — 2.2s — 4 orbiting glowing bodies arrive beat-by-beat; caption "EVERY DOLLAR GETS A PLANET."
6. Crime Scene (verdict) — 2.8s — "PRIMARY SUSPECT" stamps in, suspect category slams, verdict line types out: "TABLE FOR ONE. BILL FOR FIVE."
7. Apple Shortcuts / Siri — 2.8s — "Hey Siri, Log Expense," typed "50 chai," a logged confirmation reply; caption "SAY IT. SIRI LOGS IT."
8. Splits settle — 1.8s — a "YOU OWE $—" figure snaps to "SETTLED $0.00"
9. Outro / punchline — 3.2s — "MONEY OS" wordmark slams full-screen with glow, tagline, hard cut to black

## Audio
- Audio role: dense rhythmic layer, driving the whole edit
- Audio arc: full energy from frame 1, dense through most scenes; drops to near-silent (just typing ticks) under the Crime Scene verdict line so it reads clean, then a hard stop on the final black frame
- Music: `happy-beats-business-moves-vol-1-by-ende-dot-app.mp3` (120.19 BPM)
- Music treatment: no fade-in, full volume (~0.35) from the first frame; hard cut/short tail at the very end
- Music cue guidance: bundled preset at `assets/music/cues/happy-beats-business-moves-vol-1-by-ende-dot-app.music-cues.json`. Two strong-cue locks: Splits settle-snap (~18.5s) and the outro wordmark slam (~20.0s). Money Universe's bodies snap to consecutive beats in their window.
- Audio-reactive treatment: subtle — let the Money Universe scene's orbital glow/presence breathe gently with RMS; nothing else reacts to audio; no waveform/equalizer visuals
- Audio-coupled moments:
  - Scene 3 (AI auto-add) — keypress ticks while typing "20 aamras"; success chime when the parsed card lands
  - Scene 4 (Pulse) — keypress ticks under the boot-text typing
  - Scene 5 (Money Universe) — soft whoosh per orbiting body arriving
  - Scene 6 (Crime Scene) — stamp/impact on "PRIMARY SUSPECT," then quiet randomized keypress ticks under the typed verdict line with no competing music swell
  - Scene 7 (Shortcuts) — keypress ticks typing "50 chai"; success chime on the logged reply
  - Scene 8 (Splits) — a snap/settle sound when the figure hits zero, beat-locked
  - Scene 9 (outro) — one closing impact hit on the wordmark slam, beat-locked
- SFX selection guidance: dense, chaotic-tone energy per `audio.md`'s tone table (`impactPunch_heavy`, `impactBell_heavy` for hard cuts and payoffs); keyboard ticks for every typed line; card/drop sounds for arrivals and settles
- SFX analysis guidance: `<skill-dir>/assets/sfx/sfx-analysis.md` / `.json` (skill dir: `/Users/jaiparmani/.claude/skills/brag`) — prefer lower high-frequency-risk files for the repeated keypress ticks; reserve higher-risk/aggressive files for the hard-cut transitions where the chaotic tone can carry them
- Exact SFX choice: Hyperframes should choose exact filenames, timestamps, density, and volume based on the implemented animation
- Audio files: copy the chosen music and any Hyperframes-selected SFX into `brag-output/composition/assets/`

## Hyperframes Instructions
Load the composition-building Hyperframes domain skills — `hyperframes-core` (composition contract + `data-*` timing), `hyperframes-animation` (motion), `hyperframes-creative` (design spec, beats, audio-reactive), `hyperframes-keyframes` (seek-safe keyframes), and `hyperframes-cli` (lint/check/render). `/brag` is its own workflow: do not enter the `hyperframes` entry-point intent interview and do not route into its generic promo / launch-video workflow. Prefer native Hyperframes conventions over anything in `/brag`.

Requirements:
- Show at least six distinct real UI/feature moments from the source project (dashboard, AI assistant, Pulse, Money Universe, Crime Scene, Shortcuts) — no single feature should dominate runtime.
- Keep all text readable in the final render — the Crime Scene verdict line and the AI-add/Shortcuts reply text especially need their full hold.
- Keep the video within 15-25 seconds (target ~22.5s).
- Include the planned music/SFX layer — audio was not disabled by the user.
- Treat the `/brag` audio notes above as guidance, not a fixed cue sheet. Choose SFX after the visual animation exists.
- Treat music cue metadata as optional timing hints; ignore cues that hurt readability, scene pacing, or the product story.
- Major reveals may move toward nearby strong cues within about 0.15s. Smaller entrances may align to nearby beat points within about 0.10s. Use only 1-3 strong cue locks in this video.
- Use SFX to support motion and interaction per the moment→sound heuristics in `audio.md`.
- Honor the planned music treatment (no fade-in, hard stop at the end, quiet pocket under the verdict line).
- Consider the Hyperframes audio-reactive workflow for the Money Universe scene's glow (subtle RMS-driven presence only) — skip and document if extraction is unavailable.
- Use local assets for audio and any required runtime/media dependencies when possible.
- Run `hyperframes check` before render — it is brag's single gate.
