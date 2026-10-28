# Assignment integration

The supported data contract is the approved Engineering City Lab v1.0.0 contract.
See [provenance](assignment-reuse.md), the unchanged [v1 schema](../schemas/assignment-v1.schema.json),
[v2 schema](../schemas/assignment-v2.schema.json), and
[version-1 manifest schema](../schemas/manifest-v1.schema.json).

## Published files and authoring

The existing offline Python teacher GUI exports units unchanged. Only published,
validated files belong in `public/assignments/` during development, or
`assignments/` beside `index.html` in the built site. Unit IDs/filenames are
exactly S01–S12 / Sxx.json. The manifest is the only allowlist:

```json
{
  "schemaVersion": 1,
  "units": []
}
```

The committed manifest stays empty. No coursework or synthetic test fixtures are
published by this phase. For a future separately authorized publication, the
instructor manually places validated unit files first and the manifest last.
Never copy private drafts, teacher backups, GUI source or test fixtures into a
production web directory. No upload/synchronization feature is provided.

An allowlisted entry has exactly `unitId`, `title`, and `file`. A file must be
exactly `<unitId>.json`; traversal, remote filenames, duplicates, IDs outside
S01–S12 and unknown fields are rejected. Manifest schemaVersion stays 1 for both
assignment versions. An empty list is valid. No unpublished filename is probed.

## Assignment compatibility

Both versions require a unit title, supported HTTPS Google Form URL, four/five
sequential questions Q01–Q04/Q05, and the original required video URL fields.
Question title/prompt/explanation text remain optional strings. Exact supported
URL formats and placeholder rejection are defined by the unchanged rules/schema,
not by a looser URL check. Normalization trims the same content fields as the
reference and preserves option order/language, IDs, labels and version.

| Property | v1 | v2 |
| --- | --- | --- |
| Options | Exactly four, A–D | Three/four, A–C/A–D |
| Accepted answer | `correctOption` | Nonempty distinct `correctOptions` of existing labels |
| Student selection | One label | One label; any member passes |
| Version conversion | None | None |

A three-choice question has three radios, never a fabricated D. Mixed answer
fields, unknown fields, missing required fields, bad question order and invalid
URLs are rejected using the original ordered path/code/message diagnostics.
Phase 3 uses those validated URL fields for native explicit new-tab actions.
The required `explanationVideoUrl` field stays required even though watching an
explanation is optional. No schema or URL rule was changed.

## Runtime behavior

The HUD identifies Demo Mode or the active Sxx/title and passed/total progress.
Use **Assignments** to open the selector. **Refresh list** rereads the manifest
without changing the current attempt. **Load unit** presents an explicit warning;
**Replace and load** downloads and validates the entire unit before activating
an immutable normalized snapshot. **Keep current unit**, Close and Escape cancel.
Failed, canceled or stale requests preserve the old unit, passes and location.
A failed refresh revokes the obsolete allowlist while keeping active content.

Only a successful replacement resets question progress, including restarting
the same unit deliberately. The original city position, camera and movement
systems are not reset. Both dialogs share the Phase 1 native modal, inert
background, input suspension and focus barrier. A quiz opened while game Pointer
Lock was active offers **Close & Resume**,
which attempts one lock request synchronously from that trusted click/keyboard
activation. Escape and an originally unlocked opening never force lock. Browser
rejection or throttling leaves **Click to resume looking around**; there is no
retry loop. Assignments retains normal Close/Escape. External-tab focus return
never locks the mouse.

Q01 maps directly to the fixed Q01 terminal, etc. Four-question units hide Q05,
remove only its own casing from the collider list and exclude it from proximity
interaction; five-question units restore it at its fixed Phase 3 site. Passed
indicators become green; unpassed indicators remain yellow. Phase 3
redistributes the five fixed sites using the original reachable-city survey;
see [the layout report](phase-3-results.md). City/collision code is unchanged.
An incorrect choice permits retry and
never revokes an existing pass. Completion is 4/4 or 5/5 for the active unit.

Demo Mode retains the original synthetic questions, with no fabricated links.
It remains usable when no unit has been selected or the manifest is empty or
unavailable. Losing the publication list never evicts an active valid assignment.

## Paths, storage and privacy

Requests use `new URL('./assignments/', document.baseURI)` and validated relative
filenames with `cache: 'no-store'`, `redirect: 'error'` and AbortSignal. Bundling
into Vite `assets/` does not move the assignment base. Nested document paths such
as `/faculty/course/lab/` request that directory's `assignments/manifest.json`.
Original upstream absolute model/media paths remain unchanged; full-site Apache
subdirectory asset configuration and GPU verification are separate release work.

Progress exists only in memory for this page visit. Reload/reopen starts Demo
Mode at 0/5 and requires selecting a published unit again. No assignment state is
written to localStorage, sessionStorage, files or a backend. Existing unrelated
look/audio preferences are unaffected. No identities, answer collection, scores,
analytics or viewing-time records are added. Published static JSON exposes its
answer keys by design; it is not a secure exam/grade submission system.

## Tests and future boundary

Use Node 22.23.4, `npm ci`, `npm test`, and `npm run build`. The independent
parity/schema check is `python -m unittest tests.test_assignment_contract -v`
(Python `jsonschema` required). The read-only CLI can validate local export files:
`python tools/validate_assignments.py <path>`.

With the normal HTTPS Vite dev server and its exported public certificate, run
`python scripts/browser-phase-1.py --cafile <certificate>` and
`python scripts/browser-phase-2.py --cafile <certificate>`, followed by
`python scripts/browser-phase-3.py --cafile <certificate>`. Python Playwright and
system Chromium are required. Both trust only the specific certificate's SPKI.
Phase 2/3 tests intercept synthetic assignment responses. Phase 3 also intercepts
all fixture provider navigations before opening native new tabs; no fixture unit
or dummy provider destination is published or contacted. Geometry/DOM/input
checks are separate from GPU rendering and physical Windows acceptance.

Phase 3 now exposes **Watch Question Video** on real questions, **Watch English
Explanation** and literal multiline `explanationText` after a pass, and **Open
Google Form** in the HUD and completed quiz at 4/4 or 5/5. Video viewing is not a
prerequisite for answering or completion. All actions use the exact validated
URL, `target="_blank"` and `rel="noopener noreferrer"`. Native navigation needs
an explicit action; no autoplay, embeds, backend, submissions or viewing-time
tracking. Completed explanations/Form survive exploration and failed/canceled/
stale unit requests; valid replacement clears their old hrefs. Demo Mode has
none of these URLs. See [Phase 3 results](phase-3-results.md) for tests and browser
resume restrictions. Stop after its Draft PR; Phase 4, release and deployment
remain unapproved.
