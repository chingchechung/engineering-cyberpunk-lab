# Engineering Cyberpunk Lab — phased implementation plan

## Scope and review boundary

Target: `chingchechung/engineering-cyberpunk-lab`.
Upstream: `ektogamat/threejs-conference` (Threejs-Punk), pinned to
`8cc20593b2270e2ce832e7b7b44356705daddec4`.

Phase 0 is complete and merged through PR #1. Phase 1 is explicitly authorized
by the instructor on 2026-10-27; earlier Phase 0-only restrictions are historical.
Work from the latest `main` on `feature/phase-1-education-interaction` with a
Draft GitHub pull request. Finish Phase 1, report the checks, then stop for
Windows 11 Chrome/Edge acceptance before Phase 2.
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

## Phase 1 — stable mouse controls and educational terminals (implemented; acceptance pending)

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
  cross-reload persistence remain Phase 2; remote integrations remain Phase 3.

Progress: mouse/input logic and browser interaction/decoded-geometry regression
checks pass. Terminal locations, exact commands, build/startup results, remaining
cloud GPU limits, and the physical Windows acceptance checklist are recorded in
[docs/phase-1-results.md](docs/phase-1-results.md). Original visual effects and
assets are retained; physical visual/gameplay acceptance is still required.

Exit: create a Draft PR and stop. The instructor must verify mouse stability,
modal click blocking, readable Q01–Q05 labels, and original scene visuals on
Windows 11 Chrome/Edge before authorizing Phase 2. Asset redistribution remains
unresolved; no release or public deployment is authorized.

## Phase 2 — assignment JSON, validation, and quiz logic (not started)

- Obtain representative Engineering City Lab v1/v2 assignment JSON and define
  compatibility from actual fixtures. The schema and sample files are currently
  unavailable; do not invent compatibility or silently reinterpret fields.
- Load and validate data with clear errors; normalize supported versions into a
  small internal model. Treat titles, URLs, choices, and imported text as data.
- Extend the Phase 1 synthetic grading/progress to real assignments, explanation state, reload
  persistence, and reset behavior. Scope stored progress to assignment identity
  and version so different assignments cannot inherit completion accidentally.
- Test invalid/missing/duplicate questions, malformed input, scoring, reload,
  reset, and v1/v2 examples. Keep error and empty states usable.

## Phase 3 — videos, Google Forms, and UI (not started)

- Integrate YouTube question/explanation videos with validated supported URLs,
  lazy embed creation, and useful fallback links if embeds are unavailable.
- Unlock the configured Google Forms destination only after all five questions
  satisfy the agreed completion rule. Avoid credentials in the static bundle.
- Improve accessible modal focus/labels, progress UI, small-screen layouts, and
  assignment feedback while preserving the city and existing effects.
- Check keyboard/touch operation, autoplay restrictions, blocked/invalid video
  URLs, and external navigation. Determine exact remote destinations from the
  supplied assignments before extending network configuration.

## Phase 4 — regression and release preparation (not started)

- Run behavioral tests for mouse controls, collision, movement, terminals,
  modal isolation, assignment loading, grading, persistence, videos, and Forms.
- Verify real WebGPU gameplay and visual parity on supported desktop/mobile
  hardware. Software rendering smoke checks do not establish GPU performance.
- Build static `dist/`, test a production-like static host, and verify asset
  paths for the selected deployment base. Upstream currently assumes `/`.
- Resolve every asset redistribution issue and required third-party notices.
  Audit pinned dependency warnings separately from baseline import.
- Prepare packaging, project metadata, and release notes on a PR. Deployment,
  release publication, and merging require separate explicit approval.
