# Assignment component provenance

The instructor explicitly authorized this reuse for Engineering Cyberpunk Lab
Phase 2 on 2026-10-28 (Asia/Taipei).

- Approved consumer: [Engineering City Lab v1.0.0](https://github.com/chingchechung/engineering-city-lab/tree/v1.0.0),
  annotated tag object `257cade5bc7959d53bd1742bda0b29e5e8292155`, peeled commit
  **`38b1dfdd73d766ec1d01999216b24dfca2126fad`**.
- Original authoring/contract source: [ece_hw_webproject](https://github.com/chingchechung/ece_hw_webproject/tree/70cc35d9ce828bcd5357f16fe85f303aa2d30cd9),
  **`70cc35d9ce828bcd5357f16fe85f303aa2d30cd9`**.

Both reference checkouts remained read-only. The three schemas and two UMD
modules were also compared directly with the pinned authoring checkout and match.
No root LICENSE exists at that authoring revision. Reuse relies on the
instructor's explicit authorization; no blanket MIT license for these components
or the reference application is inferred. Original headers, schema comments and
synthetic-content notices remain. No reference city engine or third-party bundle
is copied. Existing Threejs-Punk credits and asset obligations remain in force.

## Unchanged artifacts

[assignment-reuse-files.json](assignment-reuse-files.json) records source paths,
destination paths and SHA-256 values for **15 byte-identical files**:

- Three published schemas under `schemas/`.
- `js/assignment-rules.js` and `js/assignment-validator.js`, relocated to
  `src/education/assignments/reference/` without changing their bytes.
- Independent Python validator and read-only CLI under `tools/`.
- `tests/contract_cases.py` and `tests/contract_cases_v2.py`.
- Six test-only v1/v2 unit/manifest fixtures under `tests/fixtures/`.

No teacher GUI, private draft, unreleased content or actual coursework is imported.
The Python CLI reads local exports; it does not publish or upload anything.

## Adaptations

- `assignment-contract.js` bridges the unchanged UMD modules to native ESM.
  This project's `type: module` consistently uses their global branch in both
  Node and the browser. It retains every original validation issue in `error.issues`.
- `assignment-loader.js` ports the approved consumer's allowlist, no-store and
  no-redirect fetch, generation/abort checks, precise errors and synchronous
  validation-before-commit. Its default base resolves `./assignments/` against
  the hosted document, including a subdirectory, rather than bundled JS assets.
- `assignment-session.js` retains validated immutable snapshots, one-label
  `acceptsAnswer`, in-memory passes, and atomic validated replacement. Its quiz
  adapter converts a single radio index to A–D. The existing five Phase 1 demo
  questions/answers are retained instead of importing the reference city's demo.
- `createAssignmentSelector.js` adapts the approved confirmation/refresh and
  cancellation lifecycle to this application's shared native-dialog barrier.
- `tests/assignment.test.js` ports loader/session checks, changing paths and
  demo-answer expectations to this project's unchanged demonstration content.
  Python parity and schema tests are adapted to the new paths.
- `tests/fixtures/contract-corpus.json` records all **364 validation cases and
  76 answer selections**, including exact errors and normalized results generated
  by the independent pinned Python implementation. `npm test` checks these
  without requiring Python. The copied generators and independent Python parity
  suite reproduce the same corpus; this JSON is a test input, never a public asset.

Validation algorithms, URL patterns, schemas, option order, supplied language,
strict fields, normalization and error objects are not redesigned or weakened.
No v1/v2 conversion is performed. Teacher-side exports remain compatible without
any authoring changes. Maze gameplay/reset rules and Phase 3 link UI are excluded.
