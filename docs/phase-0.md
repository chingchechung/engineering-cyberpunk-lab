# Phase 0 — baseline, architecture, and environment evidence

**Subsequent status:** Phase 0 was subsequently accepted and merged through PR #1. Earlier pending/stop statements below
are historical submission evidence. Current Phase 4 preparation and its separate
production acceptance gate are in [phase-4-results.md](phase-4-results.md). No
new physical test measurements are claimed here.

## Scope and provenance

Project: Engineering Cyberpunk Lab. Target:
`https://github.com/chingchechung/engineering-cyberpunk-lab`.
Source: `https://github.com/ektogamat/threejs-conference`.
Pinned upstream commit: `8cc20593b2270e2ce832e7b7b44356705daddec4`.

The target was an empty repository with no remote refs. A single empty commit
establishes `main`; the import and Phase 0 work live on
`chore/phase-0-upstream-baseline` for review. The dedicated import commit
`21943b7` has the same Git tree as the pinned upstream commit:
`674431a2fafcfbd5f918ca7ddf4c32782aa4a255` (156 files).
This imports the source snapshot without rewriting upstream or claiming authorship
of its code. The complete original LICENSE, README, credits, and public files are
retained. Original application source, package declarations, lockfile, feature
flags, HTML metadata, and Vite configuration remain unchanged.

The separate experimental prototype and mouse-control patch have **not** been
supplied or imported. Phase 1 is not started. [Plan.md](../Plan.md) records the
review boundary and requirements for later work. The Phase 0 changes are
available in [draft PR #1](https://github.com/chingchechung/engineering-cyberpunk-lab/pull/1)
against the target repository's empty `main` baseline; it has not been merged.

## Runtime and dependencies

Use JavaScript ES modules, Node.js **22.23.4** LTS, and bundled npm **10.9.9**.
`.nvmrc` pins Node. The unchanged upstream lockfile resolves:

| Dependency | Installed version | Role |
| --- | --- | --- |
| Three.js | 0.185.1 | WebGPU renderer, TSL, loaders, scene graph |
| Vite | 6.4.2 | Vite 6 development and static build |
| GSAP | 3.15.0 | Camera/UI/intro animation |
| three-mesh-bvh | 0.9.13 | First-person collision acceleration |
| @vitejs/plugin-basic-ssl | From unchanged lockfile | Local HTTPS for dev/preview |
| Vercel CLI | 56.2.0 | Upstream deployment dependency; not executed |

There is no backend, database, Docker service, or required application secret for
the baseline. Assets, fonts, audio, video, and Draco/Basis resources are local.
WebGPU needs a secure context and a capable browser/GPU. The cloud instance has
5 CPUs, 32 GiB cgroup memory, and no `/dev/dri` hardware GPU device. Build
parallelism uses Vite's defaults; no high-cost multi-target build is needed.

Network destinations needed now: `nodejs.org`, `registry.npmjs.org`, `github.com`,
and `raw.githubusercontent.com` for tool/source inspection. `api.github.com` is
needed to create a GitHub PR. Git read/push access works through the platform's
existing HTTPS authentication. Initial GitHub API requests received a proxy
CONNECT 403; later PR creation and readback both succeeded using existing
authentication, without supplying a new token. The domain addition is saved in
the environment draft. Runtime policy observations still report an unknown
enforcement state and omit the domain, so those observations do not establish
that the saved policy was applied or published. The successful API operations
establish access for those operations only. No YouTube or Google Forms access is
needed until later phases have real inputs.

## Architecture and extension boundaries

The app uses plain factory modules composed in `src/main.js`, rather than an ECS
or a general-purpose engine. Existing technique docs remain authoritative.

| Concern | Files and behavior | Future educational integration |
| --- | --- | --- |
| Bootstrap | `src/main.js`, `bootstrap/createCamera.js`, `createRenderer.js`; WebGPU limits and renderer initialization | Compose small additional factories at the app root; retain the renderer |
| World/assets | `world/createWorld.js`, city/car/billboard loaders, `world/loaders/createGltfLoaders.js`; parallel GLTF + Draco/KTX2 | Add terminal objects independently; keep existing city, textures, and loaders |
| Walk/collision | `controls/createWalkControls.js`, `world/bvh.js`; ray-based BVH walls/ground, stepping, sprint, crouch | Reuse movement APIs; limit the mouse repair to the necessary input path |
| Camera ownership | `runtime/createCameraDirector.js`; orbit/walk switching, Euler sync, focus, intro gating | Explicitly suspend/resume input around educational UI; avoid competing camera writers |
| Frame lifecycle | `runtime/createRenderLoop.js`; camera, rain height map/compute, world effects, reflection, post | Add bounded terminal proximity work through composition; preserve existing order |
| Rain/shaders/post | `world/weather/`, `world/ground/`, `tsl/`, `post/`; collision rain, wet surfaces, bloom, grade | Preserve the graphs, layers, hide list, and original visual effects |
| UI/input | `app/createAppShell.js`, `ui/core/appUiState.js`, `ui/walk/`, `ui/chrome/` | A quiz needs a full input/focus barrier, not just a visual overlay |
| Budgets/features | `world/features.js`, `platform/performanceProfile.js`, device policy | Keep original defaults; do not disable effects to conceal a regression |

The existing mouse handler applies `movementX/Y` to a YXZ Euler with pitch
clamped to ±π/2, while the camera director synchronizes Euler state on mode
changes. This is an inspection finding, not a diagnosis or a fix for the reported
upward rotation. Phase 1 must regression-test the ownership and transition paths.
The existing editable-target checks do not provide a general quiz-modal input
barrier. The modal and terminal requirements are recorded in the plan, not
implemented here.

## Reproduce installation and startup

The managed task is already isolated. Use the existing checkout; do not create a
worktree unless the user explicitly requests one. Check and preserve local work.

From `/workspace/engineering-cyberpunk-lab`:

```bash
bash scripts/cloud-install.sh
export PATH=/workspace/.engineering-cyberpunk-tools/node-v22.23.4-linux-x64/bin:$PATH
BROWSER=none npm run dev -- --host 127.0.0.1 --port 5173 --strictPort
```

The install helper supports Linux x64 and arm64, downloads the exact Node archive
over verified HTTPS, checks a pinned SHA-256, installs outside the checkout,
executes frozen `npm ci`, then runs `npm run build`. On arm64, activate the
`node-v22.23.4-linux-arm64/bin` directory instead. The repository lockfile is not
regenerated. Files and dependencies persist in the environment snapshot; server
processes must be started in each new task.

Keep Vite in a persistent terminal. In a second shell, extract **only the public
certificate** and run the functional HTTP check with normal TLS verification:

```bash
cd /workspace/engineering-cyberpunk-lab
mkdir -p /workspace/.engineering-cyberpunk-tools/certs
openssl x509 -in node_modules/.vite/basic-ssl/_cert.pem \
  -out /workspace/.engineering-cyberpunk-tools/certs/vite-local.crt
python3 scripts/verify-baseline.py --origin https://127.0.0.1:5173 \
  --cafile /workspace/.engineering-cyberpunk-tools/certs/vite-local.crt
```

Never commit the generated local certificate/private key or disable TLS checks.
Regenerate the public certificate file when Vite regenerates its certificate.

For production preview, after a successful build, start in another persistent
terminal with the same Node PATH:

```bash
npm run preview -- --host 127.0.0.1 --port 4173 --strictPort
```

Run the same HTTP check using port 4173. `dist/` is the static output. Current
upstream asset paths assume deployment at `/`; subpath hosting and project
branding/metadata changes belong to reviewed release preparation. No deployment
command was run.

## Validation results (2026-10-27)

| Check | Outcome | Evidence and limit |
| --- | --- | --- |
| Exact snapshot import | Passed | Import tree equals the pinned upstream tree; app/assets/lockfile remain identical |
| Verified Node installation | Passed | Official Node 22.23.4 archive matched its pinned SHA-256; npm 10.9.9 |
| Frozen dependency installation | Passed twice | `npm ci` installed 331 packages without lockfile changes |
| Original production build | Passed twice | `npm run build`, Vite 6.4.2, 186 modules transformed; `dist/` produced |
| HTTPS development serving | Passed | Document, 2 entry resources, all 54 public file hashes checked |
| HTTPS production preview | Passed | Document, 2 entry resources, all 54 public file hashes checked |
| Installation/startup repeatability | Passed | Same helper rerun using retained Node/cache; dev/preview stopped and restarted and rechecked |
| Browser WebGPU probe | Adapter available only | Chromium 154 software adapter available on secure loopback; no hardware GPU device |
| Full 3D browser rendering | Failed in cloud software renderer | Intro and UI entered, but canvas stayed dark; device-lost errors occurred before browser teardown |
| Walk, collision, rain, visual parity | Unverified | Requires a functioning WebGPU GPU/browser; HTTP checks and intro UI do not validate gameplay |
| Unit tests/lint/typecheck | Not provided | Upstream has no scripts for these; no zero-test run claimed as validation |
| Asset license clearance | Unresolved | All five GLBs inventoried; no sufficient model-specific rights evidence |
| Target branches and draft PR | Passed | Target `main` and Phase 0 branch pushed; PR #1 read back as OPEN and draft |

Browser failure detail: production `dist/` was served by a loopback static
server. Playwright used system Chromium 154 with a SwiftShader software path.
The app reached ENTER and revealed its canvas/UI but reported
`THREE.WebGPURenderer: WebGPU Device Lost` with
`A valid external Instance reference no longer exists`, and
`Instance dropped in popErrorScope`. The screenshot showed a dark canvas with
walk UI. Disabling the GPU watchdog did not resolve it. A Vulkan/SwiftShader
diagnostic additionally reported missing `VK_KHR_surface` and
`VK_KHR_xcb_surface` extensions during GPU initialization. No cgroup OOM kill
occurred. The precise initial device-loss cause is not established; do not claim
this is a confirmed application defect or that full WebGPU rendering passed.
Do not rewrite shaders or disable features to work around cloud GPU limitations
inside this baseline import. Repeat visual/gameplay checks on supported hardware.

Non-fatal build/install observations: upstream Vite emits the large-chunk warning
(main JS approximately 1.55 MB before gzip), and npm warns that the pinned
transitive `tar@7.5.7` is deprecated with known vulnerabilities. Dependencies are
preserved for baseline fidelity; upgrading them and validating the effects is a
separate reviewed change. No dependency security audit was performed.

## Review and outstanding work

Review draft PR #1, `AGENTS.md`, `Plan.md`, the import provenance, and
[asset-licenses.md](asset-licenses.md). Installation/startup instructions, the
exact checkout commit/path, and the GitHub API domain addition are saved in the
environment draft. Review and save environment settings, then publish the
environment to retain the prepared snapshot for later tasks; draft persistence
does not establish publication or successful restoration in a fresh task.
Confirm rendering/gameplay on a capable WebGPU device and resolve asset
redistribution rights before release. These limits are separate from the
successful build and static-serving setup. Stop here for user review; do not
proceed into Phase 1 automatically.
