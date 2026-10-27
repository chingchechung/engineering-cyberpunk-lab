# Phase 1 — stable controls and educational interaction

## Scope and review gate

Phase 0 was merged through [PR #1](https://github.com/chingchechung/engineering-cyberpunk-lab/pull/1).
Phase 1 starts from latest `origin/main`, `524bcda`, on
`feature/phase-1-education-interaction`, with the instructor's explicit approval.
The attached cloud environment initially contained the unrelated
`ece_hw_webproject` checkout. It was left untouched; the requested repository
was cloned into `/workspace/engineering-cyberpunk-lab`. No worktree was created.

Phase 1 implementation and available automated checks are complete. Submit as a
**Draft PR** and stop for Windows 11 Chrome/Edge acceptance. Phase 2 is not
authorized. No merge, tag, release, deployment, or visibility change is part of
this work. The separate local mouse patch remains unavailable and was not
imported. The original code/license/author credits are preserved.

## Implemented behavior

- Stable first-person look with bounded pitch/deltas and lifecycle resets;
  **R** restores a horizontal view, **P** toggles horizontal-only look. Ordinary
  input remains proportional with no smoothing queue or idle rotation.
- Five fixed question terminals, each with a yellow unlit-material indicator,
  readable camera-facing Q01–Q05 text, teal display, and compact metal casing.
  They use simple shared geometry/materials without added lights or shader passes.
- A nearby **X · Open Qxx** prompt. X or tapping the prompt opens the matching
  synthetic question in walking mode. Interaction checks distance, height, and
  city/car line of sight; it does not open from orbit, other panels, or afar.
- Multiple-choice questions with incorrect feedback/retry, retained passed
  questions, and **0/5–5/5** progress. Passing one question never erases another.
  Closing/reopening retains progress for this page visit. Reload starts fresh.
- Native modal focus/input isolation, visible Close and Escape, restored focus,
  and explicit click to reacquire Pointer Lock after closing.

Assignment JSON v1/v2 loading/validation and reload persistence remain Phase 2.
YouTube/Google Forms remain Phase 3. All examples here are synthetic; no real
course data, external integrations, student tracking, or new storage was added.

## Mouse stability correction

The prior handler accepted every `movementX/Y` event, allowed pitch at the Euler
poles (±90 degrees), and had no focus-loss reset or lock-entry settling guard.
These are confirmed input-path gaps; the unavailable instructor prototype's
exact original failure cause cannot be reconstructed conclusively.

`createMouseLook.js` now rejects non-finite values and deltas exceeding 180 pixels
on either axis, caps each accepted angular step at 0.12 radians (~6.9 degrees),
and clamps pitch to ±80 degrees. Normal small movements preserve the upstream
0.002-radian sensitivity. Yaw stays bounded and roll is removed when synchronizing
from the camera. Horizontal-only mode levels pitch and keeps yaw responsive.

Every Pointer Lock entry synchronizes from the actual camera, discards its first
movement event, and rejects movement during the first 80 ms. Unlock, blur, hidden
tab, deactivation, and panel/modal transitions clear held keys, external axes,
touch captures, velocity, sprint ramp, and look engagement. Input is rejected
while inactive, unfocused, hidden, or suspended. Late lock acquisition during
suspension is released. Pointer Lock request rejection is caught; another
explicit click can retry. No input accumulates for later playback.

The camera director suspends both walk and orbit input and stops footsteps while
panels are open. It drains pending OrbitControls damping through the public
update API while preserving the camera pose, preventing old orbit rotation from
replaying after a mode change. Walking retains the original acceleration,
sprint, crouch, step/ground selection, and BVH wall-ray algorithms. Touch look
and the joystick retain their original paths with the same lifecycle gating.

Automated tests cover the supplied upward-spike scenario, pitch bounds and
ordinary reversible movement. Physical high-DPI/rapid mouse behavior and the
instructor's original severe-rotation reproduction still require acceptance
on Windows; this report does not claim a hardware test passed.

## Modal isolation

The quiz uses `<dialog>.showModal()` in the browser's top layer. Its full
backdrop and explicit `inert` state cover all body siblings, including the
WebGPU canvas, header, audio, inspector, joystick, and other panels. A
MutationObserver also isolates newly appended background UI. Original inert
states are restored on close. This does not depend on CSS stacking order.

Opening first suspends the camera director, releases lock, clears input, and
sets the shared UI panel state to `quiz`. Window capture handlers reject
outside pointer/touch/wheel/click/key events, including dispatched clicks on
underlying controls. Events inside the dialog reach their controls and stop
before document/window bubble handlers. Escape closes; Tab/Shift+Tab and a
focus guard keep focus inside. The Close button stays usable across retries.

Closing clears suspension through the shared panel lifecycle and restores a
visible, focusable opener or the canvas (body is not a valid focus target).
Pointer Lock stays released until the player clicks again. Duplicate opens and
queued close events from earlier openings cannot close a newer quiz. Existing
Settings, About, and Controls panels also suspend player input while open.

## Terminal placement and geometry evidence

Coordinates are world-space `[x, y, z]` at each terminal's base. City offset is
unchanged at Y = -20; the original wet ground is Y = -5.4. Text is 2.12 m above
the base and yellow indicators are 1.62 m above it. Interaction radius is
**2.6 m** in three dimensions around the display at base Y + 1.2 m; this also
permits interaction while crouched and rejects access from roofs.

| Terminal | Base coordinates |
| --- | --- |
| Q01 | `[-136, -5.4, 29]` |
| Q02 | `[-130, -5.4, 27]` |
| Q03 | `[-123, -5.4, 27]` |
| Q04 | `[-116, -5.4, 30]` |
| Q05 | `[-111, -5.4, 34]` |

The browser test decodes the bundled city, bounds, and car GLBs with their
original transforms and builds the existing BVHs. It checks 1.05 m radial
clearance at four heights and 2.4 m vertical clearance at each site. Starting at
the original spawn, the production walk controls follow these XZ waypoints:

`[-137,32] → [-136,30.8] → [-133,28] → [-130,28.8] → [-123,28.8] → [-116,31.8] → [-111,35.8]`

All five interaction radii were reached with city/bounds/terminal collisions
enabled. The route passes north of the parked car. The fixture uses a
conservative world AABB containing the actual car instead of the production
oriented hitbox, and a flat ground mesh at the real ground height. It skips
textures/materials only in the test loader; no production asset/loader is changed.
An additional control-driven collision check stops at X = -131.511 before the
car. These are geometry/input checks, not rendered visual inspection. Label
readability through fog/rain and natural navigation need hardware acceptance.

Terminal casings join the existing collider array; no city geometry is changed.
Floating label sprites are excluded from the rain height pass so text does not
act as a physical roof. Terminal bodies remain ordinary height-pass geometry.

## Changed files

| Files | Purpose |
| --- | --- |
| `src/controls/createMouseLook.js` (new), `src/controls/createWalkControls.js` | Mouse filtering, recovery keys, lock/focus/panel lifecycle, shared input suspension |
| `src/runtime/createCameraDirector.js` | Camera ownership, suspension, orbit damping reset, cleanup |
| `src/app/createAppShell.js` | Expose shared UI state; suspend input for panels; synchronize walk prompts with camera mode |
| `src/main.js` | Compose educational system, append terminal colliders, call its update through the existing frame callback |
| `src/education/demoQuestions.js` (new) | Synthetic examples and independent in-memory progress logic |
| `src/education/terminalLayout.js`, `createTerminals.js` (new) | Coordinates/proximity, five labels/indicators/casings, shared resources and disposal |
| `src/education/createQuizModal.js`, `createEducationSystem.js`, `education.css` (new) | Modal barrier/focus, interaction/prompt/progress, responsive UI |
| `src/ui/walk/createWalkPrompt.js` | Use the gated Pointer Lock API |
| `src/ui/walk/createWalkControlsHint.js` | Document X/R/P and Escape controls |
| `src/ui/chrome/createUiVisibilityCoordinator.js` | Treat quiz as an open panel when hiding background chrome |
| `src/world/weather/collisionHideObjects.js` | Exclude nonphysical question label sprites from the existing height pass |
| `tests/mouse-look.test.js`, `walk-controls.test.js`, `education.test.js` (new) | Focused Node input/progress/proximity regressions |
| `tests/harness.html`, `tests/helpers/loadGeometry.js`, `scripts/browser-phase-1.py` (new) | Real DOM/Pointer Lock with original UI; actual GLB geometry/route validation without a renderer |
| `package.json` | Add `npm test`; dependency declarations/lockfile are unchanged |
| `scripts/verify-baseline.py` | Accept Vite's normal `main.js?t=...` hot-update suffix when finding entry scripts |
| `AGENTS.md`, `Plan.md`, this report | Current authorization, progress, results, and acceptance gate |

All 54 original public files retain their inventoried hashes. Renderer, city
loader, shaders, lighting, rain implementation, post-processing, performance
defaults, dependencies, and lockfile are unchanged. There is one animation loop.

## Verification (2026-10-27, Asia/Taipei)

Environment: checksum-verified Node **22.23.4**, npm **10.9.9**, Python Playwright
and system Chromium on Linux. The existing Phase 0 install helper ran frozen
`npm ci` (331 packages) and the original baseline build before changes.

| Check | Result |
| --- | --- |
| `npm test` | Passed: 3 files containing 13 regression cases; non-finite/spurious deltas, pitch/step bounds, lock transitions, idle, R/P, focus/visibility, modal suspension, WASD/sprint/crouch, touch, retry/progress, 3D radius |
| `python scripts/browser-phase-1.py --cafile …/vite-local.crt` | Passed: real Pointer Lock and explicit relock, normal/spurious look, R/P, all five reachable terminals/labels/indicators, car collision, X/radius, native modal isolation, physical clicks over original UI positions, dispatched background Settings click, dynamic inert background, focus trap/recovery, held-input clearing, retry, all five answers and 5/5 UI, 13 open/close cycles, orbit/walk with pending damping |
| `npm run build` | Passed: Vite 6.4.2, 193 modules, static `dist/` produced; existing large-chunk warning retained |
| HTTPS development verification | Passed: document, 2 entry resources, all 54 public asset hashes |
| HTTPS production preview verification | Passed: document, 2 entry resources, all 54 public asset hashes |
| Full unchanged-effects WebGPU startup attempt | Secure context, adapter, WebGPU backend, ENTER, educational HUD, and 5 scene terminal objects reached; device lost before reliable rendered gameplay |
| Visual/gameplay acceptance on Windows 11 | Pending instructor Chrome/Edge tests; no cloud visual pass claimed |
| `git diff --check` | Passed |

The full-app cloud attempt reproduced the Phase 0 software-renderer failure:
`WebGPU Device Lost: A valid external Instance reference no longer exists`,
followed by `Instance dropped in popErrorScope`; the canvas remained dark.
There is no hardware GPU (`/dev/dri`) in this cloud instance. The failure's
precise cause remains unestablished. No original effect was disabled and no
shader was changed to mask it. Automated input/geometry tests use the production
modules in a separate test fixture and do not assert WebGPU rendering parity.

The pinned upstream transitive `tar@7.5.7` deprecation and existing large-bundle
warning remain as documented in Phase 0. This phase does not upgrade dependencies.

## Reproduce checks

Use the Phase 0 install/startup instructions and the exact Node runtime:

```bash
cd /workspace/engineering-cyberpunk-lab
bash scripts/cloud-install.sh
export PATH=/workspace/.engineering-cyberpunk-tools/node-v22.23.4-linux-x64/bin:$PATH
npm test
BROWSER=none npm run dev -- --host 127.0.0.1 --port 5173 --strictPort
```

In another shell with that PATH, extract the local **public certificate**:

```bash
openssl x509 -in node_modules/.vite/basic-ssl/_cert.pem \
  -out /workspace/.engineering-cyberpunk-tools/certs/vite-local.crt
python scripts/browser-phase-1.py \
  --cafile /workspace/.engineering-cyberpunk-tools/certs/vite-local.crt
python scripts/verify-baseline.py --origin https://127.0.0.1:5173 \
  --cafile /workspace/.engineering-cyberpunk-tools/certs/vite-local.crt
```

The browser script requires Python Playwright and Chromium (`--chromium` can
select another executable). It trusts only that certificate's SPKI, not arbitrary
invalid certificates. Test fixtures are Vite dev resources and are excluded
from the production build. `npm run preview -- --host 127.0.0.1 --port 4173
--strictPort` serves built output; repeat the HTTPS verification on port 4173.

## Windows 11 Chrome/Edge manual acceptance checklist

Perform in **both current Chrome and Edge on capable physical WebGPU hardware**.
Record browser/GPU and any failure steps. None of these boxes was checked by
the cloud automation:

- [ ] Original city starts through ENTER with rain, lighting, wet ground,
  reflections, post effects, billboards, car, planes, and smoke intact.
- [ ] Click to lock; move slowly and rapidly in all directions for several
  minutes. Include diagonal/high-DPI movement. No severe unintended upward
  rotation or jumps; pitch stays bounded; resting the mouse gives no drift.
- [ ] Escape unlocks. Repeated click/relock and click after a long idle do not
  jump. Alt-Tab, tab switching, minimize/restore, and focus recovery never
  replay mouse motion or held movement keys.
- [ ] R levels without changing heading; P toggles horizontal look and its
  status updates. Turning P off restores normal vertical control.
- [ ] W/A/S/D, Shift sprint, C crouch, curbs/ground, walls, and the car work as
  before. No movement when unlocked or a panel is open. Touch/joystick operation
  can be checked separately on suitable touch hardware.
- [ ] In Settings → Development Mode → Inspector, switch orbit/walk repeatedly
  during/after orbit movement. No stale damping, view jumps, or idle drift.
- [ ] Walk from spawn around the north side of the car. Find all Q01–Q05 labels
  and yellow indicators, readable under the original fog/rain/post effects.
  No terminal is inside city/vehicle geometry; each can be approached normally.
- [ ] Nearby prompt appears; X opens only the nearby terminal. Moving beyond
  2.6 m removes access. A wall or height difference must not allow remote access.
- [ ] While holding W/Shift, press X. Movement and look stop immediately. Click
  over Settings/About/Source/audio/Controls/joystick/canvas positions beneath
  the modal; none activates or changes background state.
- [ ] Tab/Shift+Tab stay inside; radio choices work with keyboard; X/R/P/WASD
  do not act on the background. Close and Escape both work, repeatedly.
- [ ] Focus returns to the opener/canvas, movement stays stopped, and a new
  click explicitly reacquires Pointer Lock without jumping or stuck keys.
- [ ] Wrong answer shows feedback and permits retry. Correct advances progress;
  close/reopen retains passed state; other passes survive a wrong answer.
  Complete all five and confirm 5/5; reload intentionally resets the demo.
- [ ] Small-window quiz remains scrollable, with Close/answers reachable and no
  interaction leaking through the backdrop.

## Remaining limitations and licensing

Mouse device sensitivity and rendered labels/scene compatibility require the
instructor's physical acceptance. The cloud cannot establish GPU performance,
rendered parity, or Windows browser acceptance. Session-only demo progress,
synthetic questions, and no integrations are intentional Phase 1 limits.

[The original asset audit](asset-licenses.md) remains unresolved: all five GLBs
lack sufficient model-specific redistribution evidence; other public assets
also require their recorded rights/notice review. This work does **not** clear
them, label the entire repository MIT, or authorize public release/deployment.
Stop after the Draft PR and wait for acceptance before Phase 2.
