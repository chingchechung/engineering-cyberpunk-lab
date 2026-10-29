# v1.0.1 hybrid laptop input compatibility

Base: latest main / accepted v1.0.0 **75f7e2af095c174e8d729698a30f0beeb774f638**.
Branch: `fix/hybrid-touchscreen-input`. The existing annotated v1.0.0 tag
(`a4c345ab3d63c9836dc7c8e3d883b9db02791311`) and published private Release remain
unchanged. This is a focused input correction, not a new development phase.

## Confirmed failure and reproduction

The instructor's affected Windows laptop renders the accepted production build,
but shows a joystick/DRAG prompt and cannot engage ordinary mouse look/WASD.
Its reported values are:

```text
(pointer: coarse) = false
(any-pointer: fine) = true
navigator.maxTouchPoints = 10
innerWidth = 1092
"pointerLockElement" in document = true
```

The v1.0.0 helper returned true whenever touch points exceeded zero, even when
pointer media queries indicated a fine pointer. Downstream input gates then
rejected mouse Pointer Lock/mouse look and expected touch engagement for movement.
The instructor verified the cause by temporarily setting maxTouchPoints to zero
without reloading. HTTPS, Apache and rendering were already functioning.

An automated comparison imports `deviceLayout.js` from the immutable v1.0.0 tag
and evaluates the exact values: old coarse classification **true**, corrected
classification **false**. Both versions return the same conservative rendering
budget classification (**true**); no GPU/deployment workaround is involved.

## Correction and interaction rules

- Touch capability, fine-pointer availability and preferred input UI are separate.
  Any fine pointer defaults to keyboard/mouse; touch-point fallback is used only
  without pointer media queries. Existing conservative rendering defaults remain
  independent of the input preference, preserving the original graphics budgets.
- Each walk controller owns a small `mouse`/`touch` input state. Actual touch/pen
  gestures enable drag look/joystick; actual mouse input restores desktop UI.
  Mouse hover changes mode only after touch look/axes are idle; an explicit mouse
  press or desktop control key can cancel an active touch gesture. Touch-generated
  compatibility mouse events do not select desktop input or request Pointer Lock.
- Mode changes clear old keys, external axes, velocity and look captures, release
  native Pointer Lock when needed, and synchronize from the actual camera pose.
  Returning to mouse requires another explicit eligible lock interaction; no
  automatic lock or retry is added. Fine-pointer keyboard movement needs native
  lock, without any prerequisite touch gesture.
- Native unlock is asynchronous. Touch handoff clears the old input immediately;
  its queued unlock notification preserves the new gesture. Chromium may report
  touch-down at the fixed locked mouse coordinates: the first unlocked touch
  sample anchors without rotation, and subsequent samples drive bounded drag
  look. This prevents a recentering jump. Original mouse filtering, first-event
  discard and 80 ms settling code are unchanged.
- Touch-only devices retain joystick/drag look and mobile hints. Joystick and look
  can use separate captured pointers; release, cancel, lost capture, blur, hidden
  tabs, mode changes, overlays and disposal clear the relevant input/captures.
  Idle timing follows actual activity, keeping the accepted 5 s mouse / 12 s touch
  values. No setting or additional mode-selection UI is introduced.
- All trusted Close & Resume eligibility, exactly-one-request checks, Escape,
  focus return, denial fallback and quiz/assignment barriers remain. The original
  Chromium 151 gesture pacing is retained unchanged.

No movement constants, acceleration/sprint/collision/ground/FOV algorithms,
camera recovery math, city/Matrix geometry, glyphs/font, shaders/effects, education
contracts/integrations, assets, Apache bases, packaging or dependencies change.

## Automated coverage and evidence

The original 506 Node tests remain; focused additions cover ordinary desktop,
the exact Windows values, coarse+fine hybrids, phone/tablet, narrow fine-pointer
layouts and media-query fallback. Controller tests cover mouse lock/keys without
prior touch, both method transitions, queued unlock/anchoring, stale keys/axes,
lost capture, touch-only movement, modal/blur/hidden cleanup and idle activity.

`browser-hybrid-input.py` uses real native Pointer Lock and browser-dispatched
touch events/capture under explicit capability emulation. It checks exact Windows
diagnostics, desktop/touch prompts and hints, mouse -> touch while locked, two
fingers for look/joystick, release, a held joystick during X/quiz/Escape, mouse
return and real filtered mouse look. It waits for actual delivered pointer moves
and capture release, rather than assuming an injected touch move is synchronous.
It also runs the **unchanged** Phase 3 resume/focus/denial checks with the exact
hybrid capabilities and existing request pacing. The five original browser suites
remain in the runner; the new sixth suite runs in Linux CI. Windows CI also runs
the new Node coverage, production build and all Python portability/integrity tests.

Automated emulation does not establish physical Windows laptop acceptance.
Local validation (Node 22.23.4, Python 3.12, Playwright 1.62.0, Chromium
154.0.8037.57, loopback Apache 2.4.68) completed:

| Check | Result |
| --- | --- |
| Frozen install, Node, Vite | npm ci passed; **523/523 tests** (506 original + 17 focused), zero skipped/failed; **208 modules** built |
| Python contracts/artifacts/Windows portability | **13/13 passed**, including the 364 validation/76 answer corpus, real autocrlf checkout and CP950 defaults with UTF-8 mode off |
| Original five browser suites | All passed, retaining original 15 routes, car stop, modal/native-link/resume, Matrix geometry/return/perimeters/disposal and 96 unique Unicode raster checks |
| New hybrid browser suite | Exact laptop, coarse+fine hybrid, phone and tablet passed native lock, actual emulated pointer/capture/UI/transition/modal checks; unchanged Phase 3 resume/focus/denial checks also passed with the exact laptop media/touch values |
| Actual built HTTPS Apache | Root, nested and UserDir all passed: 79 non-dot/80 total files per base, original hashes, MIME/cache/range/404/font/assignment checks, runtime requests confined to each base |
| Preservation | All 15 imported reference/54 original public hashes unchanged; original physics/speed/filtering/geometry/rendering/education/base-path/dependency and packaging files preserved |

The known software WebGPU loss remains explicitly classified by production smoke;
no effects are disabled and no new hardware/FPS acceptance is claimed. CI uses its
pinned Chromium 151 with the accepted gesture pacing, runs all six suites plus the
headed Phase 3/Xvfb check, and separately validates Windows/Python 3.14.
The immutable PR head, hosted run URL and completed Linux/Windows results are
recorded in the Draft PR description and final handoff; see the
[branch's Actions runs](https://github.com/chingchechung/engineering-cyberpunk-lab/actions?query=branch%3Afix%2Fhybrid-touchscreen-input).

## Changed files

- `src/platform/deviceLayout.js`: input capability preference, separate render budget predicate.
- `src/controls/createWalkControls.js`: input ownership, safe transitions/capture and touch anchoring.
- `src/app/createAppShell.js`, `src/ui/walk/createWalkInputFacade.js`: pass input state to existing UI.
- `src/ui/walk/createWalkPrompt.js`, `createVirtualJoystick.js`, `createWalkControlsHint.js`, `createMoveHint.js`: input-aware existing controls and capture cleanup.
- `src/ui/chrome/createUiVisibilityCoordinator.js`: actual-input idle timing.
- `tests/device-layout.test.js`, `tests/hybrid-input.test.js`: focused Node regressions.
- `scripts/browser-hybrid-input.py`, `scripts/run-browser-regressions.py`: native/emulated input coverage alongside all existing suites.
- `AGENTS.md`, `Plan.md`, this report: current authorized scope, evidence and acceptance.

## Windows 11 physical acceptance (instructor)

Build the PR head with the pinned Node and normal production instructions, using
the correct existing private/local base. This task does not update the university
deployment. Use a normal browser session with no navigator overrides; perform the
same checklist on Computer A and the affected Computer B:

1. Confirm the actual media/touch diagnostics. Computer B must retain **10 touch
   points** and its fine pointer; do not set maxTouchPoints to zero. Desktop prompt
   and controls should appear initially, with no forced joystick-only interface.
2. Click the game/prompt to obtain native Pointer Lock. Verify stable mouse look,
   WASD/arrow movement, smooth 4.5 m/s walking / 9 m/s maximum Shift sprint, C,
   R, P and X. Escape releases lock; another explicit click reacquires without a
   jump, idle drift or stale held-key movement.
3. While locked and moving, touch-drag on the game. Lock should release, touch
   controls should appear, the handoff must not jump, and continued dragging must
   turn normally. Use joystick plus drag with separate fingers; release/cancel
   each gesture and check for stuck movement or capture.
4. Move/click the mouse again. Desktop hints/prompt return; explicitly activate
   lock and verify mouse look/WASD immediately work. Repeat both input transitions,
   including while a key or joystick gesture is held. No gesture should replay.
5. Open Q01–Q05 with X, answer/retry, and test Close & Resume by click and Enter.
   Each eligible close makes one request; browser denial leaves the explicit
   fallback. Escape, assignment overlay close, tab/focus return and an originally
   unlocked quiz must never force lock. Hold touch/movement while opening each
   overlay, blur the tab and return: background controls stay isolated and clear.
6. Traverse Matrix West/East and back, verify original city/effects/glyphs, terminal
   positions, v1/v2 unit switching, four/five-question behavior and resource/Form
   links. Touch-only phone/tablet checks should retain joystick and drag UI.

Stop at the Draft PR for this acceptance. No merge, university deployment,
v1.0.1 tag/Release, distribution ZIP upload or repository visibility change is
authorized. Existing asset-rights and private-use restrictions remain documented.
