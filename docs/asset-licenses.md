# Upstream asset and license audit

Audit baseline: `ektogamat/threejs-conference` at
`8cc20593b2270e2ce832e7b7b44356705daddec4`.
This is an evidence inventory, not a grant of rights to third-party content.

## Code and attribution

The original [LICENSE](../LICENSE) grants MIT rights to the code with copyright
2026 Anderson Mancini and Sunag. Its complete text is retained unchanged.
[README.md](../README.md#license-and-assets) explicitly excludes the models,
textures, audio, and video under `public/` from that license. Original branding,
documentation, source credits, and notices are preserved. In particular,
`src/tsl/surfaceRain.js` credits `rocksdanister/rain`; keep that credit and confirm
the adapted code's license requirements before redistribution.

## All bundled 3D models

Each GLB was inspected as glTF 2.0: header, JSON chunk, `asset` metadata, extras,
and associated resources. None includes an `asset.copyright` field, author,
license declaration, or source URL. A Blender/glTF-Transform generator identifies
a tool, not ownership. Source paths and model history in the upstream repository
establish provenance of this import but do not establish redistribution rights.
Embedded textures are part of the same unresolved model review.

| Asset | Purpose | License finding |
| --- | --- | --- |
| `public/models/cyberpunk_compressed.glb` | Cyberpunk city; embedded textures | No model-specific license or rights-holder evidence found; unresolved |
| `public/models/colider.glb` | Invisible city collision geometry | No license or authorship evidence found; unresolved |
| `public/models/quadra.glb` | Quadra car; embedded textures | A node is named `Sketchfab_model`, but no model page, creator, or license is identified; upstream UV edits do not establish original model rights; unresolved |
| `public/models/plane.glb` | Flying vehicle; embedded textures | No license or rights-holder evidence found; unresolved |
| `public/models/billboards.glb` | Billboard geometry | No license or authorship evidence found; unresolved |

The imported About panel credits Anderson Mancini and Sunag but supplies no
model-specific source links or license terms. All five models therefore remain
**uncleared for public redistribution**. No license has been inferred from a
filename, public GitHub availability, or educational intent.

## Other public files

[assets-inventory.json](assets-inventory.json) records every public file, its
byte length, SHA-256 digest, and evidence status. It includes textures/noise,
HDR environment maps, audio, MP4 billboards, fonts, icons, preview image, and
decoder libraries. `.gitkeep` is an empty directory marker.

- `Minduka_Keyboard_ABNT2_Pt_Br.svg` embeds a public-domain declaration and an
  Openclipart source link. The original declaration is retained; this finding
  concerns that SVG only.
- `public/libs/basis/README.md` declares Apache-2.0 for Basis Universal. Retain
  this declaration; verify the exact binary distribution and full notice/license
  obligations before release.
- Draco decoder files have no adjacent license text in this snapshot. Establish
  the exact distribution and preserve its required notices before release.
- The other files lack sufficient local artifact-specific evidence. Names that
  resemble Poly Haven, Freesound, Google Fonts, or other sources are leads, not
  verified grants of rights. Do not label them MIT or CC0 by inference.

## Package dependencies

The unchanged lockfile records Three.js 0.185.1 (MIT), three-mesh-bvh 0.9.13
(MIT), Vite 6.4.2 (MIT), and Vercel 56.2.0 (Apache-2.0). GSAP 3.15.0 uses its
own standard license, **not MIT**; inspect `node_modules/gsap` and the linked
[GSAP standard license](https://gsap.com/standard-license/) for intended uses.
The Vercel CLI is preserved as an upstream dependency; installing it does not
authorize executing `npm run deploy`.

## Action before release or deployment

Obtain each unresolved asset's original source URL, creator/rights holder,
exact license or written permission, attribution text, and redistribution and
modification conditions. Match the evidence to the inventoried artifact and
embedded content. Record grants and supply required notices, or replace assets
through a separately reviewed change that preserves the intended visual quality.
Until resolved, this Phase 0 audit must not be described as license clearance.

## Phase 3.5 multilingual text font (separate from original public assets)

`src/world/matrix/fonts/lab-matrix-text.woff2` is a 9,964-byte renamed subset of
**Noto Sans CJK JP Regular 2.004**, copyright © 2014–2021 Adobe, licensed under
**SIL Open Font License 1.1**. The original outlines are subset to 96 curated
Latin/digit/symbol/Japanese/Hangul characters. Derivative font family/PostScript
names are **Lab Matrix Text / LabMatrixText-Regular**; copyright/license metadata
is retained. This font remains OFL, not MIT.

[Full license](../public/licenses/matrix-text/OFL.txt) and
[attribution/provenance](../public/licenses/matrix-text/NOTICE.txt) ship in the
production output. They record the pinned upstream commit/source SHA-256,
subset hash/modifications and the reproducible `scripts/subset-matrix-font.py`
workflow. No font CDN, system-font assumption, movie texture or glyph extraction
is used. The 96-character cmap and real browser rasterization are tested.

This addition provides font-specific redistribution evidence only. All original
54 public asset bytes and their inventory remain unchanged; the unresolved
original GLB/other-asset rights above remain release/deployment blockers.

## Phase 4 evidence and distribution notices

[release-inventory.json](release-inventory.json) and
[license-evidence.json](license-evidence.json) record the current per-artifact
status and authoritative notice sources. Original 54 public hashes remain
unchanged. Embedded Gloock/Orbitron OFL and Phosphor MIT declarations were verified;
full family notices now ship. Basis/Draco decoder hashes match the installed
Three 0.185.1 library distribution with adjacent Apache license declarations.
Full decoder licenses, runtime MIT notices, vendored ktx-parse/zstddec MIT and
Zstandard BSD notice now ship. The unmatched legacy encoder remains unresolved.
GSAP conditions and adapted shader permission chains still require review.

These findings supplement the original historical audit above. They do not clear
the five GLBs or 34 other incomplete-evidence artifacts. **Release Blocked — Asset
Rights Pending** remains the conclusion; see [release-readiness.md](release-readiness.md).
