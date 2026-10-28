# Engineering Cyberpunk Lab — phased implementation plan

## Scope and review boundary

Target: `chingchechung/engineering-cyberpunk-lab`.
Upstream: `ektogamat/threejs-conference` (Threejs-Punk), pinned to
`8cc20593b2270e2ce832e7b7b44356705daddec4`.

Phase 0–2 and the walking-speed adjustment are complete, accepted and merged.
Phase 2 PR #4 merged at `3142bd30534519669f545e835a078c8f4739ed1f`.
Phase 3 is explicitly authorized on `feature/phase-3-learning-workflow` from
latest main: distribute five terminals across the existing reachable city,
complete native video/explanation/Form actions, and improve trusted quiz resume.
Finish tests/docs and open a Draft PR; stop for instructor acceptance before
Phase 4. Keep the repository Private; no public release/deployment is authorized.
Never modify the upstream repository, merge a PR, publish a release, or deploy
without explicit approval. Retain the city, walking, BVH collision, rain,
lighting, shaders, post-processing, and original visual quality.

## Phase 0 — import and establish the baseline (complete)

- Import the exact upstream tree without application or lockfile changes; keep
  the original MIT license, README, credits, and bundled asset bytes.
- Pin Node.js 22 LTS; install with `npm ci`; run the original build.
- Inspect architecture, controls, feature flags, runtime requirements, and
  upstream documentation. Record results in [docs/phase-0.md](docs/phase-0.md).
- Extend `AGENTS.md` with project requirements while retaining upstream guidance.
- Inventory every bundled public file and audit all five GLB models, including
  metadata and provenance. Record missing rights honestly in
  [docs/asset-licenses.md](docs/asset-licenses.md); missing evidence is not approval.
- Validate dev/preview asset serving and attempt a real browser startup.
- Save tested cloud installation and startup instructions. Open a Phase 0 PR
  for review when GitHub API access is available.

Exit: reproducible build, recorded runtime evidence and limitations, complete
asset inventory, reviewable changes, and an explicit stop before Phase 1.
Unresolved asset permissions block public distribution, release, and deployment.

## Phase 1 — stable mouse controls and educational terminals (accepted and merged)

The separately tested local prototype and mouse-fix files are **not available**
in this repository or the cloud workspace. Do not claim they were imported.
If they are supplied later, inspect and preserve the fix; otherwise reimplement
the intended behavior with focused regression tests before educational changes.

- Diagnose the reported severe upward camera rotation. Cover idle drift,
  horizontal-only movement, pitch bounds, rapid/spurious deltas, pointer-lock
  entry/exit/re-entry, focus loss, and orbit/walk transitions. Keep movement,
  collision, sprint/crouch, and touch controls working.
- Add a small independent educational system, composed from `src/main.js` and
  the existing loop/camera APIs; avoid renderer, physics, shader, and BVH rewrites.
- Add five terminals Q01–Q05 with visible labels **and** yellow indicator lights.
  Validate their world positions and reachability inside the actual scene.
- Open a quiz with X only within the terminal's interaction radius; prevent
  repeated opens and conflicts with editable fields or other UI.
- While a modal is open, make the entire background non-interactive: release
  pointer lock, stop movement/look, clear held input, block canvas and underlying
  UI clicks and global keyboard handlers, and contain keyboard focus. Test click
  through, Escape, held WASD, and explicit pointer-lock reacquisition on close.
- Preserve baseline visual effects and compare gameplay before/after.
- Provide synthetic multiple-choice questions, retry, retained session passes,
  and 0/5–5/5 progress for end-to-end terminal testing. Assignment JSON and
  in-memory unit management remain Phase 2; remote integrations remain Phase 3.

Progress: Phase 1 was accepted through instructor Windows 11 testing and merged
via PR #2. Its results remain historical in [docs/phase-1-results.md](docs/phase-1-results.md).
The speed adjustment was merged via PR #3 after automated validation; the
instructor explicitly waived another manual test for that minor adjustment.

## Phase 2 — assignment JSON integration and unit management (accepted and merged)

- Reuse the Engineering City Lab `v1.0.0` contract/loader/session patterns at
  `38b1dfdd73d766ec1d01999216b24dfca2126fad` and the approved authoring source
  `70cc35d9ce828bcd5357f16fe85f303aa2d30cd9`. Preserve exact v1/v2 schemas,
  URL/normalization/unknown-field rules and single-label accepted-answer logic.
- Support exactly S01–S12, four/five questions, v1 four choices and v2 three/four
  choices. V2 accepts any one selected label in `correctOptions`; no hidden D,
  multiple selections or implicit schema migration. Teacher exports work unchanged.
- Use only relative, manifest-allowlisted files. Keep manifest version 1 and
  default public `units: []`; synthetic fixtures never enter production assets.
- Provide a unit selector and refresh, explicit replacement confirmation,
  validate-before-commit, abort/generation checks and useful errors. Canceled,
  failed and stale requests preserve active content, progress and player position.
- Reuse the quiz input/focus barrier for the selector. Preserve terminal
  coordinates, yellow indicators, labels and X. Four-question units hide Q05
  and remove its casing from the collider list; five-question units restore it.
- Show validated titles/prompts/options safely, permit immediate retry, keep
  prior passes, and reset progress only on a successful replacement. Keep the
  original five-question Demo Mode usable when no unit is selected/published.
- **Progress is session-only, in memory. Reload/reopen resets it.** Do not add
  localStorage, sessionStorage or backend progress, identity/answer collection,
  analytics or tracking. This explicitly supersedes the former reload-persistence
  plan; the active unit's progress does not survive a replacement or page refresh.
- Reproduce the reference's 364 validation and 76 answer cases, cross-language
  parity, schemas, loader/session/UI cases and original control/speed regressions.

Results, provenance, commands, remaining limits and the physical acceptance
checklist are in [docs/phase-2-results.md](docs/phase-2-results.md). The instructor
accepted this phase and merged PR #4; its earlier stop is historical.

## Phase 3 — complete workflow, terminal redistribution and resume (implemented; acceptance pending)

- Decode the original city/collision GLBs and determine a conservative connected
  walking region from the unchanged spawn using actual movement/BVH rules.
  Choose five safe fixed sites using walking-graph separation, then continuously
  verify five spawn routes and all ten terminal pairs at 60 Hz. Retain the
  interaction radius, labels, Q05 four/five-unit rules and original city bounds.
- Keep yellow indicators before a pass and show green afterward with simple
  shared materials. No new lights, expensive shaders, city geometry or districts.
- Use explicit native new-tab question videos from the validated original URL.
  Keep answering independent of video viewing. Offer the English explanation
  video/text only after a pass, including revisits; render text literally with
  line breaks preserved. No autoplay, embeds or viewing-time tracking.
- Unlock the active unit Form at 4/4 or 5/5 in both HUD and completed quiz, without
  a return-to-start requirement. Use `_blank` and `noopener noreferrer` for every
  external action. Clear stale links only on valid replacement; failed/canceled/
  stale requests preserve the old unit and completion. Demo Mode has no URLs.
- A trusted Close & Resume activation may make one synchronous gated lock request
  only if the quiz originally opened in game Pointer Lock. Keep orientation,
  filtering, pitch limits, settling and held-key cleanup. Escape closes safely;
  blocked requests show explicit click-to-resume, without automatic retries.
  Returning from a video/Form tab never locks. Assignments keeps its safe close.
- Preserve schemas/validation/answer logic, S01–S12 allowlisting, teacher GUI,
  empty public manifest, in-memory-only progress and all original rendering.
- Run Node/install/build, Python parity, all three browser suites and geometry
  checks; intercept synthetic provider URLs. Separate automated DOM/geometry
  evidence from physical Windows/WebGPU acceptance.

See [docs/phase-3-results.md](docs/phase-3-results.md) for final coordinates,
distance table/diagram, methods, source preservation, tests and Windows checklist.
Exit: a Draft PR and a stop for instructor acceptance. Phase 4 is not authorized.

## Phase 4 — regression and release preparation (not started)

- Run behavioral tests for mouse controls, collision, movement, terminals,
  modal isolation, assignment loading, grading, session-only progress, videos, and Forms.
- Verify real WebGPU gameplay and visual parity on supported desktop/mobile
  hardware. Software rendering smoke checks do not establish GPU performance.
- Build static `dist/`, test a production-like static host, and verify asset
  paths for the selected deployment base. Upstream currently assumes `/`.
- Resolve every asset redistribution issue and required third-party notices.
  Audit pinned dependency warnings separately from baseline import.
- Prepare packaging, project metadata, and release notes on a PR. Deployment,
  release publication, and merging require separate explicit approval.
