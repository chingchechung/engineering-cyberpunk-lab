# Static Apache deployment and maintenance

**Release Blocked — Asset Rights Pending.** This is a preparation guide, not
permission to deploy. Keep candidates/ZIPs private. The instructor selects the
actual URL/directory and authorizes publication separately. The original models
and other media still lack redistribution evidence; see release-readiness.md.

## Build locally; run only Apache in production

Use Node **22.23.4** (`.nvmrc`) and npm **10.9.9** on the build machine. Python
**3.12** is used for validation/packaging only. The teacher GUI remains a separate,
unchanged local authoring tool. The production host needs Apache 2.4 with HTTPS,
static-file access and correct MIME/cache configuration. It needs **no Node,
Python, PHP, database, Docker or application service**.

From a fresh authorized checkout of this private repository:

```bash
git checkout <reviewed-commit>
node --version
npm --version
npm ci
npm test
python -m pip install -r requirements-validation.txt
python -m unittest tests.test_assignment_contract -v
```

Choose the final URL path **before** building. These are test examples, not
approved destinations. Keep the trailing slash and quote the user-directory path.

| Hosted application path | Build command |
| --- | --- |
| `/` | `npm run build -- --base=/` |
| `/course/cyberpunk-lab/` | `npm run build -- --base=/course/cyberpunk-lab/` |
| `/~username/cyberpunk-lab/` | `npm run build -- --base='/~username/cyberpunk-lab/'` |

Rebuild if that path changes. No hostname is embedded. Vite rewrites HTML/CSS
and module-owned URLs, including the Matrix WOFF2. Runtime public loads use
`src/platform/appAsset.js` with Vite's actual `BASE_URL`. Original font CSS is
processed into the compiled CSS, whose public-font URLs get the same base.
The original source/media bytes remain intact. Assignments deliberately retain
`new URL('./assignments/', document.baseURI)`; Apache's normal trailing-slash
directory redirect must stay enabled. Do not add an HTML `<base>` pointing elsewhere.

Validate and create a **private internal** candidate (use a new output directory):

```bash
python scripts/check-dist.py --dist dist --base /course/cyberpunk-lab/
python -m unittest tests.test_release_artifacts -v
python scripts/package-candidate.py --dist dist --base /course/cyberpunk-lab/ --output /tmp/lab-internal-candidate --zip
```

On Windows, replace `/tmp/...` with a new private local directory. The script
never overwrites a candidate, uploads, deploys or publishes. It checks all original
asset hashes, required notices/font, empty assignments, allowed output files,
fixture exclusion and high-confidence secret markers. The ZIP has deterministic
file order/timestamps/permissions; candidate.json records content hashes and the
source commit/dirty state. These checks do not establish asset rights. Keep the
`.internal.zip` and envelope outside all web roots and do not attach them to
GitHub Releases, Actions artifacts or this PR. After rights and deployment are
explicitly approved, this same procedure can generate a reviewed distribution;
the current procedure always marks its output internal/blocked.

## Apache mapping, HTTPS, types and caching

Copy **the contents of `dist/` or candidate `site/`**, including `assets/`, public
models/decoders/media/fonts, `licenses/` and `assignments/`, to the selected app
directory. Do not copy the repository, node_modules, tools, tests, reports,
candidate.json, ZIP, `.env`, `.git`, private keys or the teacher GUI. Do not use
`npm run dev`, Vite preview or `npm run deploy` as the production service.

The administrator can use an existing DocumentRoot, an Alias, or an enabled
Apache UserDir. `~username` in the URL alone does not enable mod_userdir; the
administrator must allow that user's directory, filesystem traversal/read access
and HTTPS first. The local smoke test also verifies the literal UserDir-style
URL path. It cannot approve the eventual institution's filesystem/access policy.

The preferred configuration uses **AllowOverride None**. Review
`deployment/apache-vhost.example.conf` and include `apache-common.conf` within
the actual application `<Directory>` block. Replace example paths; retain the
host's real VirtualHost/certificate/access policy. Enable mod_mime, mod_headers,
normal mod_dir DirectoryIndex support, and mod_ssl for HTTPS. No rewrite or SPA
fallback is required. Do not override missing assets/JSON with index.html.

The shared configuration sets:

- HTML/JSON: `no-store`, so index/allowlist updates are seen promptly.
- Hashed JS/CSS/WOFF2/WASM: one-year `immutable` caching; names change on rebuild.
- Other original, unversioned assets: one hour with revalidation. Purge/revalidate
  if their content changes while retaining a filename.
- JavaScript `text/javascript`, CSS `text/css`, JSON `application/json`, GLB
  `model/gltf-binary`, WASM `application/wasm`, HDR `image/vnd.radiance`, WOFF2
  `font/woff2`, WOFF/TTF font types, MP3 `audio/mpeg`, MP4 `video/mp4`.
- `X-Content-Type-Options: nosniff`, no directory listing/MultiViews, denied dotfiles.
- Missing resources: genuine 404, without silent HTML fallback. Apache's ordinary
  byte-range support serves media as 206 Partial Content.

Use a valid, trusted certificate in production. Full WebGPU needs a secure
context, supported Windows Chrome/Edge, GPU/driver and enabled hardware support.
Do not disable TLS verification or prescribe experimental browser flags as a
production fix. Cross-origin isolation headers are not required by this app's
current code; do not add restrictive policies blindly. Native educational links
open external tabs only when requested. The private repository and `noindex`
metadata do **not** enforce website access control: the institution must apply
its approved HTTPS authentication/network access policy if the hosted site is private.

`.htaccess` is optional, never assumed. Nothing is installed as `.htaccess` in
dist. If the administrator explicitly permits the directives (`AllowOverride
FileInfo Options Indexes AuthConfig`, relevant modules), the shared directory
policy may be adapted using `deployment/htaccess.example`. If overrides are not
available, apply it to the VirtualHost/Directory configuration or ask the server
administrator to supply the equivalent MIME/cache/404 behavior. Do not leave a
forbidden `.htaccess` causing 500 responses. An unprivileged content maintainer
should not change global Apache configuration.

## Verify a staged deployment after authorization

Before replacing a working site, keep a complete known-good static copy and its
approved assignment snapshot **outside the web root**. Stage a whole new version
at the same configured URL base through the administrator's mapping. Never blindly
overwrite a live approved manifest with the empty build default. Preserve/review
any previously approved assignment files explicitly before staging them in the new
version; do not copy test fixtures. Switch an Alias/current-directory pointer
atomically when permitted, or schedule a controlled file-copy maintenance window.
Keep previous hashed assets accessible to old open tabs during an upgrade, or ask
users to reload during that window. Do not delete old chunks mid-session.

Check with browser DevTools and ordinary HTTPS requests:

1. The directory URL redirects to its trailing-slash form; index/JS/CSS load.
2. Network requests stay under the app base (including models, HDR, noise,
   textures, media, Draco/Basis and the hashed Matrix font).
3. MIME/cache headers match the policy. Requests for a nonexistent JSON/model/JS
   return 404; media Range requests return 206, not an HTML error page with 200.
4. ENTER completes, both Matrix zones initialize, and the original city renders.
   Verify Unicode without tofu, Q01–Q05, controls, modal/Pointer Lock and all
   effects on real Windows 11 Chrome/Edge. No unexpected console/loading/GPU errors.
5. Empty default manifest retains Demo. A locally approved teacher export can be
   selected only after publication; 4/4 and 5/5 totals, videos/explanations/Forms
   and session-only progress behave as documented.

For automated local checks (Apache + OpenSSL + pinned Playwright Chromium are
build/test tools, not new production services):

```bash
python -m playwright install --with-deps chromium
python scripts/run-browser-regressions.py
python scripts/production-smoke.py
```

`APACHE_HTTPD`, `APACHE_MODULES` and `CHROMIUM_EXECUTABLE` can select local tool
paths. The automated Apache runner targets Linux/CI (Unix process/group APIs); Windows
maintainers can use WSL or a Linux build runner for it, then perform browser
acceptance against the approved Apache staging host. The runner is not required
on the production server. The static smoke builds `/`, `/course/cyberpunk-lab/` and
`/~username/cyberpunk-lab/` into private temp directories, starts **real Apache**
on loopback with a newly generated specific trusted test certificate, checks
files/types/cache/ranges/404 and uses actual compiled application modules. It
publishes synthetic v1/v2 files only to that temporary test document root, never
to dist. Test provider destinations are intercepted before navigation. No Vite
transformer/preview or runtime test harness is present in that static site.

The explicit `--allow-software-device-loss` option is for a known headless/cloud
adapter diagnostic only. It admits only the recorded software instance/device-loss
messages and labels them separately; network/DOM failures still fail. It never
means rendered parity/FPS passed. Native media preloads canceled with ERR_ABORTED
are recorded separately for the known local audio/video files, whose bytes/MIME
are checked independently. Other request failures are rejected.

## Publish, replace or remove S01–S12 after explicit course approval

All JSON is static and publicly readable to whoever can access the site;
**answer keys are intentionally included**. This is a learning activity, not a
secure examination or grade-recording system. Do not put identities, credentials,
private drafts or unapproved materials in JSON. The app does not collect grades
or persist progress.

1. Export v1/v2 JSON using the **unchanged** teacher Python GUI locally. Validate
   it locally using the existing validator. Unit IDs/filenames must match S01–S12;
   do not rename/migrate schema fields or invent different filenames.
2. Back up the current approved manifest and units outside the web root. Prepare
   the final version-1 manifest with explicit `{unitId,title,file}` entries.
3. Upload only approved `S01.json` … `S12.json` beside
   `assignments/manifest.json`. Transfer under a temporary non-allowlisted name,
   then atomically rename to the final JSON filename when complete. Do not expose
   a partially written JSON file or publish private temporary files to a web directory.
4. **Update the manifest last**, atomically, only after every listed unit is in
   place and validated. The allowlist must never advertise a missing new file.
   Keep no-store behavior; users use Assignments → Refresh list to discover updates.
5. Test selection, explicit replacement confirmation, retry, 4/5 question count,
   optional explanation and Form gating with approved links. Failed/canceled/stale
   loads preserve the active unit and memory progress. No user is forcibly switched
   by replacing a server file; reload starts fresh Demo.

For a removal, remove its manifest entry **first**, publish that allowlist
atomically, then remove/archive its JSON outside the web root according to the
institution's retention/access decision. Old tabs may retain an old allowlist
until Refresh and already downloaded content cannot be revoked. A missing/invalid
unit yields an error and keeps current progress. For a correction to an existing
filename, atomically replace its complete validated JSON and then update the
manifest/title if needed. Never serve backups, GUI source or test fixtures.

## Rollback and troubleshooting

Restore the **complete previous static version** built for the same base, plus
its separately approved assignment snapshot. Switch the mapping back atomically
or use the controlled maintenance window; validate index/manifest/cache afterward.
Do not mix a previous HTML entry with another build's hashed assets. Keep rollback
copies out of public directories and retain the relevant licenses.

| Symptom | Check |
| --- | --- |
| Blank canvas/ENTER failure | Trusted HTTPS, WebGPU adapter/GPU driver, browser console, actual shader/device errors; DOM alone is insufficient |
| JS/CSS 404 or requests to `/models` from a nested app | Rebuild with the final `--base`, copy the entire output, trailing slash; do not patch minified files |
| JSON parse error starts with `<` | Apache rewrite/ErrorDocument wrongly returned HTML; restore genuine JSON/404 and MIME |
| Decoder or GLB fails | Correct base, all libs/models copied, WASM MIME, compression/cache/header rules; verify hashes |
| Missing/boxed Matrix text | Hashed WOFF2 copied, correct font MIME/base, no 404/HTML, FontFace load error; bundled font has all 96 characters |
| Assignments empty | Default is intentionally empty; verify approval, manifest version 1, files/IDs, Refresh and no-store headers |
| Unit fails or old unit remains | Full validated JSON, explicit allowlist, supported URLs; this preservation is expected on failed/canceled/stale loads |
| 500 after `.htaccess` upload | Unsupported directives/AllowOverride/modules; remove it and use administrator Directory configuration |
| Old HTML/chunks after update | Cache policy, complete version copy, previous tabs; restore matching files and perform a controlled reload |

Do not disable original graphics, change the validator or use insecure TLS flags
to conceal a hosting problem. Deployment, public ZIPs and GitHub Releases still
require explicit authorization **and** resolution of outstanding rights.
The intended private `v1.0.0` tag/Release is a separate workflow described in
[release readiness](release-readiness.md#intended-private-v100-release-workflow).
Review GitHub's automatically downloadable tagged source archives, which can
contain bundled assets, even if no optional distribution ZIP is attached.
Private release metadata approval never authorizes public Apache deployment.
