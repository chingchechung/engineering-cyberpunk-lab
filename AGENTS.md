# Engineering Cyberpunk Lab project requirements

Read [Plan.md](Plan.md), [docs/phase-0.md](docs/phase-0.md), and
[docs/asset-licenses.md](docs/asset-licenses.md) before changing this fork.
The original upstream instructions are retained below.

## Authorized phase and Git workflow

- Phase 0 is complete and merged into `main` through PR #1. The instructor
  explicitly authorized Phase 1 on 2026-10-27; the earlier Phase 0-only stop is
  historical and superseded for this work.
- Phase 1 implements stable mouse look, R/P recovery, Q01–Q05 terminals,
  isolated quiz input/focus, and synthetic multiple-choice questions with
  session progress. See [docs/phase-1-results.md](docs/phase-1-results.md).
- Finish Phase 1 tests, open a **Draft PR** against `main`, and stop for the
  instructor's Windows 11 Chrome/Edge acceptance. Do not begin Phase 2,
  merge, tag, release, deploy, or change repository visibility.
- Use feature branches and GitHub pull requests against
  `chingchechung/engineering-cyberpunk-lab`. Do not modify or push to
  `ektogamat/threejs-conference`.
- Do not merge PRs, publish releases, or deploy without explicit user approval.
  In particular, do not execute the upstream `npm run deploy` script.
- Cloud tasks are already isolated. Use the existing checkout; do not create a
  Git worktree unless explicitly requested. Preserve existing local changes.

## Baseline and environment

- Baseline: `8cc20593b2270e2ce832e7b7b44356705daddec4` from Threejs-Punk.
  Its imported tree is recorded in the dedicated baseline import commit.
- Use Node.js **22.23.4**, pinned by `.nvmrc`, and npm. Use `npm ci`; keep the
  upstream dependency declarations and lockfile unchanged. Phase 1 adds only a
  test script to `package.json`.
- `bash scripts/cloud-install.sh` installs a checksum-verified Node runtime
  outside the checkout, installs dependencies, and runs the production build.
  Activate that runtime's `bin` directory in each new shell; PATH changes inside
  the install script do not persist in the caller.
- Start Vite with `BROWSER=none npm run dev -- --host 127.0.0.1 --port 5173 --strictPort`.
  Vite uses HTTPS. Trust its specific local certificate for automated requests;
  do not disable TLS verification. See the validation commands in the Phase 0 doc.
- Upstream has no test, lint, or typecheck script. Phase 1 adds `npm test`
  (Node regression tests) and `scripts/browser-phase-1.py` (Playwright with the
  real DOM/Pointer Lock and decoded GLB geometry, independent of GPU rendering).
  Build, HTTP, and geometry/input checks do not prove rendered visual parity.

## Requirements for later phases

- Preserve the original city, walking, collision, rain, lighting, shaders,
  post-processing, and visual quality. Prefer small factory modules composed
  through existing APIs; minimize changes to rendering, physics, and collision.
- The local prototype and separate mouse-control fix have not been supplied.
  Never assume they are in this workspace. Once Phase 1 is authorized, preserve
  a supplied fix or reimplement and regression-test stable mouse look, including
  the reported unwanted upward rotation and pointer-lock transitions.
- Q01–Q05 terminals require visible labels as well as yellow indicators; X opens
  the nearby terminal. An open quiz must block background clicks, global input,
  movement, mouse look, and underlying controls, with appropriate focus handling.
- JSON v1/v2 compatibility must be based on supplied Engineering City Lab
  fixtures. No assignment schema, YouTube IDs, or Google Forms URL is available
  yet. Do not invent them or implement assignment loading or external
  integrations in Phase 1. Synthetic examples are authorized for Phase 1 only.
- Retain the MIT notice, original author credits, and adapted shader attribution.
  Public assets have separate rights. All five GLB models currently lack
  sufficient license evidence; resolve redistribution rights before release or
  deployment. Never describe the entire repository as MIT-licensed.

---

# Instructions for coding agents

Use this file when you are asked to **modify**, **extend**, or **replicate** techniques from Threejs-Punk. Human-oriented narrative lives in [README.md](README.md). **If README or AGENTS disagree with source code, the code wins.**

## Project intent

WebGPU + Three.js **TSL** demo: cyberpunk alley, walk mode (BVH), GPU rain with a **collision height texture**, wet ground (ripples + planar reflection), TSL post stack. Not a general engine — factory wiring in [`src/main.js`](src/main.js).

## Read order (minimal context budget)

1. [README.md](README.md) — **Source map** table and **Collision rain** section (overview).
2. [docs/techniques/README.md](docs/techniques/README.md) — deep dives: [collision rain](docs/techniques/collision-rain.md), [wet ground](docs/techniques/wet-ground.md), [car droplets](docs/techniques/car-surface-rain.md).
3. [`src/world/features.js`](src/world/features.js) — what can be disabled; strip order in [STRIP.md](STRIP.md).
4. [`src/platform/performanceProfile.js`](src/platform/performanceProfile.js) — budgets before adding passes or instances.
5. Touch only the subtree you need (see **File routing** below).

## Hard constraints

| Rule | Reason |
|------|--------|
| Import from `three/webgpu` and `three/tsl` | Project is WebGPU-first |
| Prefer TSL `Fn`, node materials, `RenderPipeline` | No custom GLSL under `src/` |
| Do not reintroduce SSR for wet ground | Removed in favor of planar RT + roughness ([README](README.md#the-ssr-fork-historical-important)) |
| Ground wetness ≠ car droplets | Ground: [`rainRipples.js`](src/tsl/rainRipples.js) + [`createGround.js`](src/world/ground/createGround.js). Car: [`surfaceRain.js`](src/tsl/surfaceRain.js) + [`applyCarSurfaceRain.js`](src/world/car/applyCarSurfaceRain.js) |
| Collision rain uses `useDedicatedPass: false` | [`createCollisionRain.js`](src/world/weather/createCollisionRain.js); do not assume a separate rain composite pass is active |
| Hide rain/sky/smoke/planes from height pass | [`collisionHideObjects.js`](src/world/weather/collisionHideObjects.js) |
| New expensive work: half-res, frame-skip, or distance fade | Match existing patterns in `performanceProfile` |
| Safari / mobile | Respect [`applyDevicePerformanceDefaults`](src/platform/performanceProfile.js) (DoF off on Safari, etc.) |

## File routing (where to edit)

| Task | Start here |
|------|------------|
| New world object / load asset | [`src/world/createWorld.js`](src/world/createWorld.js), [`createGltfLoaders.js`](src/world/loaders/createGltfLoaders.js) |
| Rain collision / splashes | [`createCollisionHeight.js`](src/world/weather/createCollisionHeight.js), [`createCollisionRain.js`](src/world/weather/createCollisionRain.js) |
| Wet pavement / reflection | [`createGround.js`](src/world/ground/createGround.js) |
| Car wet shader | [`applyCarSurfaceRain.js`](src/world/car/applyCarSurfaceRain.js), [`surfaceRain.js`](src/tsl/surfaceRain.js) |
| Post / grade / bloom / AO | [`postprocessing.js`](src/post/postprocessing.js), [`cyberpunkLook.js`](src/post/look/cyberpunkLook.js) |
| Reusable TSL node | [`src/tsl/`](src/tsl/) then wire from world or post |
| Per-frame order | [`createRenderLoop.js`](src/runtime/createRenderLoop.js) |
| Startup / compile hitches | [`warmup.js`](src/runtime/warmup.js) |
| Walk / collision | [`createWalkControls.js`](src/controls/createWalkControls.js), [`bvh.js`](src/world/bvh.js) |
| Feature toggle | [`features.js`](src/world/features.js) |

## Technique recipes (replicate elsewhere)

### A. GPU rain that respects geometry (height “hit” texture)

**Full spec:** [docs/techniques/collision-rain.md](docs/techniques/collision-rain.md) (diagrams, hide list, update order, tuning, port checklist).

Short version:

1. Ortho camera, top-down, RT stores **`positionWorld`** per texel ([`CollisionHeight.material.outputNode`](src/world/weather/createCollisionHeight.js)).
2. RT: half-float, **nearest** filter, no mipmaps; resolution from `collisionRainResolution` (default 512).
3. Volume follows camera (default 100×100 world units).
4. Before height render: hide particles, sky, smoke, planes ([`collectCollisionHideObjects`](src/world/weather/collisionHideObjects.js)).
5. Compute: integrate positions; `floorY = texture(heightMap, getUV(xz)).y`; respawn with TSL `If` when below floor.
6. Draw: one instanced billboard mesh; optional frame skip on height RT only.

Code entry points: `createCollisionHeight`, `createCollisionRain`. History: rain update commit `89e766f`.

### B. Procedural wet car paint (no simulation texture)

**Full spec:** [docs/techniques/car-surface-rain.md](docs/techniques/car-surface-rain.md).

1. Port or reuse drop graph in [`surfaceRain.js`](src/tsl/surfaceRain.js) (credit rocksdanister/rain).
2. Finite-difference normals from drop mask; drive `roughnessNode` / `normalNode` on `MeshStandardNodeMaterial`.
3. Separate rain UV channel (here: **UV1**) from PBR maps (UV0).
4. Fade by camera distance (`carSurfaceRainFadeStart/End`).

### C. Wet ground without SSR

**Full spec:** [docs/techniques/wet-ground.md](docs/techniques/wet-ground.md).

1. Tiled PBR + [`createRainRipples`](src/tsl/rainRipples.js) on world XZ.
2. Manual mirror camera → half-res RT; mix via emissive × `(1 - roughness)` in [`createGround.js`](src/world/ground/createGround.js).
3. Do not use `reflector()` inside TSL `PassNode` graph (WebGPU attachment issues — see README).

### D. New post effect

1. Add node in `src/tsl/` or inline in [`postprocessing.js`](src/post/postprocessing.js).
2. Hook into `buildBeautyInput` / `look.buildComposite` / `rebuildSteadyOutput` — follow existing bloom, DoF, intro rain-glass branches.
3. Add a `performanceProfile` flag and default off or half-res if costly.

## Composition pattern (do not break)

`main.js` builds plain objects: `world`, `pipeline` (post), `cameraDirector`, `renderLoop`, `appShell`. The loop calls world updates then `post.render()`. Optional features return `null` — keep using optional chaining when adding calls.

## Verification checklist

After shader or pipeline changes:

- [ ] `npm run build` succeeds
- [ ] Dev: WebGPU context (HTTPS dev server)
- [ ] Rain still collides (drops not falling through roofs)
- [ ] No rain/sky in height map (check hide list if new transparent layers added)
- [ ] Mobile profile: no new full-res passes without a scale knob

## What not to do

- Do not add CPU raycasts per rain drop.
- Do not duplicate the strip guide — link [STRIP.md](STRIP.md).
- Do not commit `.env` or secrets.
- Avoid large unrelated refactors when fixing a single effect; match existing factory style.

## Credits (context only)

Anderson Mancini · Sunag (TSL) · [TSL Workshop 2026](https://threejs.paris/). Live: https://threejspunk.vercel.app/
