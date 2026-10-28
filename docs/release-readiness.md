# Release readiness

**Release Blocked — Asset Rights Pending.** Engineering preparation is distinct
from permission to publish. No release/deployment/upload or visibility change is
authorized. Windows Phase 0–3.5 acceptance is supplied by the instructor; Phase 4
production-root/nested acceptance is pending.

## Content and attribution inventory

[release-inventory.json](release-inventory.json) lists **every original public
artifact**, byte size/SHA-256, status, evidence, required notices and blocker flag,
plus added notices, the Matrix subset and generated runtime-code notices.
[license-evidence.json](license-evidence.json) records authoritative license URLs
and archived text hashes. The original Phase 0 inventory remains intact; all
**54 original public file hashes** are unchanged.

| Category | Evidence and treatment |
| --- | --- |
| Original code | Unchanged MIT notice, Anderson Mancini/Sunag credits and original Threejs-Punk source preserved; MIT copy ships |
| 5 GLB models | **Permission required**: no artifact-specific license/source grant in metadata. Obtain rights-holder evidence matching each model/embedded texture; do not replace major visuals without separate approval |
| 34 other original files | **Incomplete evidence**: media, textures/HDR/noise, preview, CSS and legacy encoder provenance. Some filenames are leads, not grants. Follow up individually using the JSON inventory |
| 7 original UI font binaries | Embedded copyright/OFL URL (Gloock/Orbitron) or explicit MIT (Phosphor) identifies license; official full OFL/MIT notices now included. Bytes/names unchanged |
| 6 original decoder/library files | Basis README's Apache declaration and byte matches to Three 0.185.1; Draco glTF decoder byte matches and adjacent official README Apache declaration. Full Apache notices included. The unmatched unused legacy encoder remains incomplete |
| Keyboard SVG | Original embedded public-domain declaration; preserved in the artifact |
| Empty directory marker | No substantive copyrighted content; no runtime role |
| Matrix text font | Renamed 96-character subset, 9,964 bytes, complete SIL OFL 1.1/Adobe attribution, pinned source/hash and independent cmap/browser verification |
| Runtime code bundle | Three 0.185.1, three-mesh-bvh 0.9.13 and GSAP 3.15.0 only, plus Three's vendored ktx-parse/zstddec. MIT/BSD/Apache notices included where applicable; GSAP retains its separate standard-license link/notice and needs conditions review |
| Adapted rain graph | Original rocksdanister/BigWings attribution retained in source and distribution notice; complete permission-chain review remains pending. No grant fabricated |

The font metadata was inspected with fontTools; full Google Fonts family notices
match the embedded copyright/license identities. Decoder comparisons use hashes,
not merely filenames. zstddec's authoritative README distinguishes its MIT JS
wrapper from Facebook/Meta's BSD-3-Clause WASM payload; both notices ship. All
new notice snapshots are local build inputs, not runtime network dependencies.
Some external evidence URLs use upstream branches; archived full text and hashes
record the reviewed snapshot without depending on future changes.

There are **39 original public blockers** (5 permission-required models and 34
incomplete-evidence files). Additional GSAP condition/adapted-shader review remains
explicit. The added notices do not clear unrelated assets, and educational or
noncommercial use is not automatic redistribution permission. Do not label the
whole repository or every media/font asset MIT. No original assets are replaced,
removed, relicensed or uploaded by this work.

## Dependency and security review (separate from functional tests)

`npm audit --json` and `npm audit --omit=dev --json` snapshots and advisory URLs
are in [dependency-audit.json](dependency-audit.json), reviewed 2026-10-28.
The full installed tree reports **57 affected package entries: 1 critical,
49 high, 4 moderate and 3 low**. Counts include propagated dependency paths;
they are not 57 independently confirmed browser exploits.

The critical entry is `tar@7.5.7`, including
[GHSA-23hp-3jrh-7fpw](https://github.com/advisories/GHSA-23hp-3jrh-7fpw)
(unlimited decompression/parse DoS), in the existing Vercel/tooling dependency
chain. Vite 6.4.2/dev-server/editor tooling, PostCSS and other transitive tool
packages also have reported advisories. The existing tar deprecation warning
persists. This phase does **not** run audit fix, large upgrades, a new Three.js
version, Vercel CLI/deployment, or untrusted archive extraction with that package.
A separate focused dependency-maintenance change should assess/pin fixes and
repeat the accepted graphics regressions. Review these findings before broader
build-tool use; use controlled checkouts and do not expose Vite publicly.

An inspected Vite module graph contains browser packages **three, three-mesh-bvh
and gsap**, not Vercel. The Apache output contains no node_modules, Node runtime,
server code or package install service. Therefore `--omit=dev` counts alone do
not identify what's executed in the static browser app: Vercel is declared a
production npm dependency but is unused tooling here. No advisory is reported for
the three browser packages in this snapshot; this is not a vulnerability-free
claim or a full source security audit. No lockfile/dependency declaration changes
were made to conceal warnings.

All automatic application resources are local in production smoke tests. Native
YouTube/Forms/author/source links are explicit actions. Three's optional inspector
TSL Graph extension references an external editor when deliberately enabled; it
is not required/default runtime content and is not loaded during normal smoke
startup. No analytics, identity/grade collection, new storage or backend is added.
The output verifier uses exact expected public/notices, a narrow hashed-bundle
allowlist, baseline hashes, empty manifest, fixture markers and high-confidence
credential/private-key patterns. It is a targeted content check, not proof that
arbitrary text can never contain a secret. JSON answer keys are public by design;
this is not a secure exam system.

## Candidate checklist and release-notes draft

Engineering candidate contents and SHA-256 inventory are generated privately by
`scripts/package-candidate.py`. It refuses contaminated output, leaves metadata
outside site/, and optionally writes a reproducible **internal** ZIP. No build
or ZIP is committed or uploaded to Actions/Release attachments. CI has no deployment
or artifact-upload job and uses a read-only token with checkout credentials disabled.

## Intended private v1.0.0 release workflow

After instructor acceptance, the intended formal release is **v1.0.0 while the
repository remains Private**. This task prepares that workflow only: no tag,
GitHub Release, attachment or deployment is created. Private access does not
grant redistribution rights or resolve the inventory's missing permissions.

| Item | Intended treatment and approval boundary |
| --- | --- |
| Private Git tag and GitHub Release metadata | After acceptance and explicit release authorization, identify the accepted commit with v1.0.0 and prepare release notes for authorized repository collaborators. Record unresolved rights and allowed audience/use; a tag/metadata approval does not authorize optional binaries or public deployment. |
| GitHub-generated source ZIP/tar.gz | GitHub exposes source archives for tags/releases to users with repository access. These can include the bundled models, textures, media and fonts already tracked in Git. A metadata-only Release is therefore not asset-free: review the exact tagged tree, recipient scope and applicable permissions before authorizing the release. |
| Optional release ZIP attachments | A separately reviewed distribution: inspect the exact compiled contents, asset grants/conditions, hashes, notices and recipient scope, then obtain explicit authorization before attaching/uploading. Local internal validation ZIPs are not approved Release attachments. |
| Public Apache deployment | A separate publication decision with its own asset-rights review, real HTTPS/access policy, Windows production acceptance, approved candidate/rollback plan and explicit deployment authorization. Private GitHub release approval does not authorize it. |

**Release Blocked — Asset Rights Pending** remains visible. The five GLBs and
34 other original artifacts are not cleared by repository privacy, educational
intent, a tag or passing CI. Resolve or explicitly review the outstanding
permissions/conditions for the proposed release's contents and audience before
release authorization. Do not publish or attach distribution archives without
the required review and explicit instructor authorization. Keep source-archive
exposure in that review even when no optional ZIP is attached.

## Release-notes draft

Draft notes for the future **separately approved private v1.0.0** release:

- Engineering Cyberpunk Lab, based on Threejs-Punk by Anderson Mancini and Sunag.
- Accepted city, stable 4.5/9 m/s movement and fixed educational terminals, native
  multimedia/Forms workflow, two seamless Matrix extensions and real multilingual text.
- Static Vite builds for root/course/UserDir bases, local resources/font/notices,
  Apache MIME/cache/404/range guidance, content integrity and automated regressions.
- Session-only progress; teacher v1/v2 exports/S01–S12 allowlist unchanged.
- Requires trusted HTTPS and supported Windows WebGPU/GPU drivers. No backend.
- **Not publishable yet**: asset/shader/GSAP rights review and Phase 4 physical
  acceptance remain open; cloud headless startup is not visual/FPS acceptance.

Before any public release/deployment: obtain the missing grants/conditions and
match them to artifact hashes; retain all notices; complete the Windows production
checklist; choose and approve the real URL/access policy; review the exact candidate
and rollback snapshot; obtain explicit instructor deployment/release authorization.
