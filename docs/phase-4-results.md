# Phase 4 — production compatibility and release preparation

## Scope and source range

Started `feature/phase-4-release-preparation` from latest merged main
**`85b07ff506dde3a58b0422340b2787f139ee17c2`**, verified PR #6 merged and complete
(including commit `6dbdf42` real multilingual text). The instructor reports
Windows 11 acceptance of Phase 0–3.5; this does not claim new Codex hardware tests.
Ending implementation commit: **789ce6ad8538b3ddd356a09cb77a725fee6225c4**. The final PR head
also includes the documentation/evidence follow-up; its immutable SHA is recorded
by GitHub/PR description. The clean-checkout test below uses the implementation SHA.

This phase adds static hosting compatibility, validation/CI, metadata, attribution
and private release preparation. No gameplay, camera/movement/collision algorithm,
city model, Matrix footprint/opening, terminal site, education contract or rendering
algorithm is redesigned. The repository remains Private; no external server,
visibility, release, deployment or upstream change is authorized/performed.

**Release Blocked — Asset Rights Pending.** Complete engineering work does not
clear asset licenses or constitute Phase 4 Windows production acceptance.

## Production architecture and asset strategy

The production deliverable is ordinary static Vite output. Apache serves only
HTML, compiled JS/CSS, font/models/decoders/images/HDR/audio/video, licenses and
approved static assignment JSON. There is no Node/Python/PHP/database/container
application service in production.

`src/platform/appAsset.js` resolves dynamic public loads against Vite's actual
`import.meta.env.BASE_URL`. URL-only edits cover city/bounds/car/planes/billboards,
wet maps, splash/smoke, HDR, cloud noise, videos, spatial/footstep/ambient audio,
Draco decoder and Basis transcoder directories. Original module-owned Matrix font
URLs retain `new URL(..., import.meta.url)`. Vite rewrites the original CSS imports
and their font URLs, plus HTML entries, for each configured base. Original public
file bytes remain unchanged; no hostname is hardcoded.

The approved assignment loader is byte-identical: document-relative
`assignments/manifest.json`, manifest version 1, allowlisted S01–S12, validated
relative files, no probing, no-store/redirect rejection, cancellation/generation
checks, validate-before-activate and failure preservation. Apache's ordinary
trailing-slash directory redirect is required; no HTML base/SPA router is added.

`index.html` identifies Engineering Cyberpunk Lab with the requested description,
original-author/source recognition, noindex metadata and no invented canonical,
social, screenshot or public deployment URL. README prominently retains Anderson
Mancini, Sunag and the original Threejs-Punk technical reference. The retained
Vercel script is never executed.

## Apache and production-like testing

The checked shared directory policy in `deployment/apache-common.conf` supplies
MIME types, nosniff, no-store HTML/JSON, immutable hashed assets, revalidated
unversioned assets, denied dotfiles, no indexes/MultiViews and normal 404 behavior.
`apache-vhost.example.conf` demonstrates **AllowOverride None**. `.htaccess` is
optional/admin-controlled and absent from dist; no rewrite/HTML fallback is used.
The guide includes a conventional Directory/VirtualHost alternative, HTTPS,
UserDir permissions and static copy/update/removal/rollback instructions.

The new `production-smoke.py` builds and copies three **actual dist variants**
into a private temporary document root, runs a real local **Apache 2.4.68** with a
specific generated/trusted loopback TLS certificate, and launches the compiled
application. No dev module transformer, Vite preview, production debug global or
test harness is served. TLS verification stays enabled; the browser trusts only
that certificate's SPKI, and HTTP checks use its public CA certificate.

| Variant | Build flag | Static + browser result |
| --- | --- | --- |
| Root | `--base=/` | Passed |
| Course subdirectory | `--base=/course/cyberpunk-lab/` | Passed |
| User-directory style | `--base=/~username/cyberpunk-lab/` | Passed |

Each variant verifies entry modules/CSS, every public/generated file hash and
relevant MIME/cache header, real 404 for missing JSON/model/JS, media Range 206,
correct Matrix WOFF2, secure context, ENTER/HUD reached after both world factories,
empty-manifest Demo, explicit synthetic v1 four-question and v2 five-question
selection, no S03/unlisted requests and failed replacement retaining S02.
Fixtures are written only to the temporary Apache document root, **never dist**;
manifest publication is last. Provider destinations are intercepted before native
navigation; no real YouTube/Forms fixture target is contacted.

Runtime requests must stay within the actual configured app base and return
200/206. Unexpected network/console/page errors fail. Normal browser-canceled
preloads for the known local audio/video files (ERR_ABORTED) are recorded
separately and those exact files are independently HTTP/hash/MIME checked.
No arbitrary network failure is waived. Runtime request evidence is in
[phase-4-runtime-requests.json](phase-4-runtime-requests.json).

The explicit cloud-only `--allow-software-device-loss` admits only the already
recorded instance/device-loss messages, never missing resources or DOM errors.
All three builds reached the application HUD, but software WebGPU still reports
`A valid external Instance reference no longer exists`, `WebGPU Device Lost`
and `Instance dropped in popErrorScope`. This is **not a rendered visual pass**.
Both Matrix constructions precede that HUD; geometry and font behavior are tested
separately by the accepted suites, and actual look-back visibility/effects/FPS
remain physical Windows checks. No original effect was disabled to make tests pass.

## Exact validation and environment

Local environment: Debian 13, Node **22.23.4**, npm **10.9.9**, Python **3.12**,
Playwright **1.62.0**, system Chromium **154.0.8037.57** and Apache **2.4.68**.
Apache/needed APR libraries were extracted into the private tools directory;
no system or external Apache configuration was changed. The local network policy
blocked the pinned Playwright browser CDN with `403 Domain forbidden`; no proxy
bypass or TLS disable was used. Local tests use the recorded system Chromium.
CI installs Playwright's pinned Chromium **151.0.7922.34 / revision 1234** on its
standard runner; GitHub execution status is reported separately below.

| Check | Result |
| --- | --- |
| `npm ci` | Passed with pinned Node/npm and unchanged declarations/lockfile |
| `npm test` | **506/506 passed**, including preserved 364 validation/76 answer corpus and speed/mouse/education/Unicode tests; one base-URL regression added |
| `npm run build` and root/nested/UserDir builds | Passed; **208 modules** |
| `python -m unittest tests.test_assignment_contract -v` | **5/5 passed**, JS/Python/schema parity retained |
| `python -m unittest tests.test_release_artifacts -v` | **5/5 passed**, rejecting course/test/private files, changed assets/notices/manifest, secret markers and unsafe bases |
| `run-browser-regressions.py` | All **five** accepted suites passed: Phase 1/2/3/3.5 and multilingual text |
| Controller/geometry evidence | Original 15 terminal routes unchanged; 20,214 supported Matrix movement samples, 8,458 retained wall samples, all 18 exterior edges plus 8 corners, 20-resource disposal; original controls/car/modal regressions preserved |
| Unicode evidence | 96 real unique rasters, bundled font coverage, safe cells/UVs, single font load, deterministic mixed sequences, stable 600 updates, clean blocked-font failure; ratios 25.01/20.29/29.40/25.29% |
| Static Apache tests | All three bases passed, with base containment, real resources, types/cache/404/ranges, font and v1/v2 DOM switching; known cloud GPU failure recorded separately |
| Fresh clean checkout | Passed from a separate clean temporary clone at the implementation SHA: npm ci, 506 Node tests, root build, 10 Python tests, all five accepted browser suites and all three Apache variants; Git remained clean |
| Private candidate/ZIP validation | Two local internal ZIPs from the clean checkout are byte-identical; **80 site files**, **35,645,078 archive bytes**, clean source; CRC/content checks passed |
| Source/content audit | Original 54 public hashes, original geometry/controls/shaders/contracts and package lock preserved; full notices/font present, default manifest empty, no course/test/GUI/docs/Git/env/credential content in site output |
| Physical Windows Phase 4 acceptance | **Pending; instructor will perform it** |

Required local commands are `npm ci`, `npm test`, `npm run build`, the two Python
unittest modules, `check-dist.py`, `run-browser-regressions.py`, and
`production-smoke.py` (the known cloud adapter option was explicitly supplied).
The static smoke invokes Vite with each `--base` and private absolute `--outDir`.
All output/ZIP evidence remains in private temporary paths and is not uploaded.
The two private ZIPs have SHA-256 `92512a9517b851b0c49e0c06f3ed5da04d47d932c90cf2cc4ab492b1494f916a`.
The fresh root/course/UserDir Apache checks each verified 79 non-dot files over
HTTP (80 total site files including the denied empty marker). Observed runtime
responses numbered 52/53/57 respectively; counts vary with the existing shuffled
video pool/preload behavior, while every required file is independently verified.

## CI status and reproducibility

`.github/workflows/validation.yml` triggers on PRs targeting main, pushes to main,
and workflow_dispatch. It uses SHA-pinned checkout/setup actions, `.nvmrc`, npm ci,
Node/build, pinned Python validation dependencies, Playwright's browser installer,
contract/artifact checks, all five accepted browser suites and root/nested/UserDir
Apache smoke. It installs only Apache binaries/media types for local testing.
All browser checks are included in the normal job; none are silently omitted.

Permissions are contents:read; checkout does not persist credentials. No secrets,
pull_request_target, deployment, artifact upload or archive-publication job is
added. Npm cache is dependency cache, not a distribution upload. Geometry/DOM and
software-renderer results never stand in for real Windows visual/FPS acceptance.

Before Draft PR creation, no GitHub-hosted run for this new workflow is observable;
the same validation commands have been executed locally with the browser difference
noted above. The PR checks page records the first hosted run; the final handoff
reports its observed state rather than claiming it ran in advance. If hosted
execution is unavailable (billing/approval/runner/network policy), that is a CI
limitation, not a passing result.

## Packaging, rights and dependency review

`artifact_checks.py` restricts output to exact public assets/notices, expected
runtime licenses, HTML and hashed JS/CSS/font/known Three decoder binaries.
It checks baseline hashes, noindex/project identity, base entries, the local font,
empty assignment manifest, absence of course fixtures/private-key/token patterns
and no symlinks. `package-candidate.py` verifies before copying, records file
SHA-256 plus source commit/dirty state outside site/, refuses overwrite and
optionally writes a deterministic **private internal** ZIP. It never publishes.

The inventory distinguishes verified font/library declarations, incomplete media
provenance, permission-required GLBs, notices and blockers. **39 original public
artifacts remain blocked**, with GSAP condition and shader-adaptation permission
review also explicit. Full font/decoder/vendored-runtime notices now ship; original
MIT/author credits remain. See release-readiness.md, release-inventory.json and
license-evidence.json. No inferred model grant, major asset replacement or public
archive is part of this phase.

The npm audit snapshot reports **57 affected package entries (1 critical, 49 high,
4 moderate, 3 low)**, mainly unused Vercel/build tooling. The critical tar entry is
reported with advisory URL and reachability limits in release-readiness.md; it is
not used to extract untrusted archives in this work. The actual browser module
graph includes only Three, GSAP and three-mesh-bvh (and Three's vendored libraries),
not Vercel. No Node service/node_modules is shipped. No audit fix, large dependency
upgrade or Three/WebGPU change was made; this is not a vulnerability-free claim.
No analytics, identity/grade collection or persistent progress is added.

## Changed files

Exact changed/added files in this Phase 4 PR (generated reports/notices are
committed; no dist/ZIP/binary build output is committed):

- `.github/workflows/validation.yml`
- `AGENTS.md`
- `Plan.md`
- `README.md`
- `config/runtime-notices.json`
- `deployment/apache-common.conf`
- `deployment/apache-vhost.example.conf`
- `deployment/htaccess.example`
- `docs/apache-deployment.md`
- `docs/asset-licenses.md`
- `docs/dependency-audit.json`
- `docs/license-evidence.json`
- `docs/phase-0.md`
- `docs/phase-1-results.md`
- `docs/phase-2-results.md`
- `docs/phase-3-5-results.md`
- `docs/phase-3-results.md`
- `docs/phase-4-results.md`
- `docs/phase-4-runtime-requests.json`
- `docs/release-inventory.json`
- `docs/release-readiness.md`
- `index.html`
- `public/licenses/PROJECT-NOTICE.txt`
- `public/licenses/runtime/Basis-Apache-2.0.txt`
- `public/licenses/runtime/Draco-Apache-2.0.txt`
- `public/licenses/runtime/Zstandard-BSD.txt`
- `public/licenses/runtime/ktx-parse-MIT.txt`
- `public/licenses/runtime/zstddec-MIT.txt`
- `public/licenses/ui-fonts/Gloock-OFL.txt`
- `public/licenses/ui-fonts/Orbitron-OFL.txt`
- `public/licenses/ui-fonts/Phosphor-MIT.txt`
- `requirements-validation.txt`
- `scripts/apache_test_host.py`
- `scripts/artifact_checks.py`
- `scripts/browser-matrix-text.py`
- `scripts/browser-phase-1.py`
- `scripts/browser-phase-2.py`
- `scripts/browser-phase-3-5.py`
- `scripts/browser-phase-3.py`
- `scripts/check-dist.py`
- `scripts/package-candidate.py`
- `scripts/probe-webgpu.py`
- `scripts/production-smoke.py`
- `scripts/run-browser-regressions.py`
- `src/audio/createCarEngineAudio.js`
- `src/audio/createPlaneEngineAudio.js`
- `src/audio/createWetFootstepAudio.js`
- `src/clouds/noiseTextures.js`
- `src/platform/appAsset.js`
- `src/ui/chrome/createAudioButton.js`
- `src/world/billboards/loadBillboards.js`
- `src/world/billboards/materials/billboardVideos.js`
- `src/world/car/loadCar.js`
- `src/world/city/loadCity.js`
- `src/world/effects/createSmoke.js`
- `src/world/effects/loadPlane.js`
- `src/world/envMap.js`
- `src/world/ground/createGround.js`
- `src/world/loaders/createGltfLoaders.js`
- `src/world/weather/createCollisionRain.js`
- `tests/app-asset.test.js`
- `tests/test_release_artifacts.py`
- `vite.config.js`

## Windows 11 Chrome/Edge acceptance gate

Use the actual selected Apache HTTPS host/base only after explicit deployment
permission and rights review. Record browser/GPU/driver versions and failures.
Do not publish test fixtures or infer that the previous Phase 3.5 acceptance
already covers these new production URL/build configurations.

- [ ] Root and nested (and selected UserDir if applicable) URLs/trailing slash,
  compiled JS/CSS, model/texture/HDR/noise/decoder/audio/video/font paths all load
  under the correct app base, with no unexpected console/network/device errors.
- [ ] Original city/buildings/car, start, rain/roof collision, wet reflections,
  ripples, lights, clouds, billboards, smoke, flying planes, shaders/post retain
  the accepted appearance and frame pacing on actual GPU hardware.
- [ ] Both original end openings, 44 × 44 m Matrix plazas, transitions/ground,
  building/perimeter collisions and continuous return paths work; looking back
  reveals the original city and no boundary seam/camera jump occurs.
- [ ] Unicode rain is readable at close/medium distance, all four groups mix in
  columns, no tofu/replacement/clipping/UV bleed/flicker, normal green head/tail
  brightness/fades/culling and stable resource counts.
- [ ] Walk 4.5 m/s, Shift maximum 9 m/s, smooth acceleration/deceleration, crouch,
  WASD, filtered stable mouse/pitch, R/P, lock/unlock/focus/orbit and Escape work.
- [ ] Exact Q01–Q05 sites, readable labels, radius/line-of-sight X, yellow/green
  states, four-question Q05 hiding and five-question restoration remain.
- [ ] Use a locally approved **real S01 export from the unchanged teacher GUI**,
  publish only after approval with manifest last, then select/confirm/answer/retry.
  Check v1/v2, explanations/literal text, question-video new tab and Form gating
  at 4/4 or 5/5. No actual course file is committed/provided by this PR.
- [ ] Native links open exact URLs safely; Close & Resume makes one eligible
  trusted request, denial fallback is usable, Escape/tab return never force lock.
  Quiz/Assignments isolate background movement/input/focus.
- [ ] Failed/canceled/stale switches retain active state; valid replacement clears
  old resources/progress. Reload resets memory progress/Demo; no identity/grade
  backend or storage is introduced.
- [ ] Missing assets/JSON return 404 (no HTML masquerading as binaries), MIME/cache
  and media ranges work, no unsupported .htaccess requirement, and rollback of
  matching static/approved-assignment snapshots is understood.

Stop at the Draft PR. Phase 4 is not physically accepted, and actual deployment,
public release, archive upload, merge or visibility change remains unauthorized.
