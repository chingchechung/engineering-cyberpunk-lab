# Engineering Cyberpunk Lab — phased implementation plan

## Scope and review boundary

Target: `chingchechung/engineering-cyberpunk-lab`.
Upstream: `ektogamat/threejs-conference` (Threejs-Punk), pinned to
`8cc20593b2270e2ce832e7b7b44356705daddec4`.

Phase 0, Phase 1 and the walking-speed adjustment are complete and merged
through PRs #1–#3. Phase 1 passed instructor Windows 11 acceptance; walking is
4.5 m/s and maximum sprint is 9 m/s. Phase 2 is explicitly authorized on
`feature/phase-2-assignment-integration` from merged `main` (`d6b6702`). Finish
Phase 2, open a Draft PR, then stop for instructor acceptance before Phase 3.
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

## Phase 2 — assignment JSON integration and unit management (implemented; acceptance pending)

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
checklist are in [docs/phase-2-results.md](docs/phase-2-results.md). Exit: open a
Draft PR and stop for instructor acceptance. No Phase 3, merge, release or deployment.

## Phase 3 — videos, Google Forms, and UI (not started)

- After separate authorization, expose question videos in a new browser tab
  only after an explicit learner action. After a pass, offer the optional English
  explanation video action and supplied explanation text. Preserve supplied URLs.
- Make that unit's Google Form available only after all required questions pass.
  Google Forms controls submission availability; no travel/exit requirement.
- No autoplay, required embeds, viewing-time checks or tracking. Use safe text
  and validated HTTPS links with `target="_blank"` and `rel="noopener noreferrer"`.
- Preserve Phase 2's in-memory state and failure/cancellation semantics. Test
  external actions with provider destinations mocked before navigation; do not
  treat fixture URLs as real coursework. These features are not implemented in Phase 2.

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
