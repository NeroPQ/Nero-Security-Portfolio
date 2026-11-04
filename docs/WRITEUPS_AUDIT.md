# NERO.SEC — Write-ups audit and migration

Audit date: 2026-11-02. Repository inspected directly at `/home/kali/Nero-Security-Portfolio-v04-Updated/nero-security-portfolio`.

## Preservation and boundaries

The supplied workspace contains no `.git` directory, and `git status --short` returns `fatal: not a git repository`. Commit/uncommitted status cannot be established. No reset, commit, push, PR, deployment or remote hosting changes were performed.

Before edits, 91 relevant files, including source, reports, scripts, assets and both output trees, were copied to `../nero-writeups-audit-backup-20261102T200921Z/`. Its `sha256.json` records the originals. Superseded active inputs are retained, with their original relative paths, inside `archive/writeups-legacy/`. Existing hidden backups remain untouched and are outside active discovery.

`src/data/cves.mjs`, both Research page sources, Home/Projects/About page sources, `src/data/profile.mjs` and `public/site.js` retain the original SHA-256 values. Shared layout edits add a head slot for draft robots metadata and a working back-to-top target. The shared sidebar replaces an inaccurate fixed Write-ups count with its existing navigation-arrow style. No CVE route or technical Research content was rewritten.

## Root causes

- `src/data/writeups.mjs` combined six short `sections` arrays with imported report strings and mutable `push`/`Object.assign` patches. Conditional NEXURA and FortiLogger entries created separate cards for content belonging to existing modules.
- `NERO_NEXURA_DRAFT_PREVIEW_V1` and `NERO_FORTILOGGER_DRAFT_V1` depended on `NERO_SHOW_DRAFTS=1`; ordinary builds omitted those complete reports. `NERO_SHELLS_PAYLOADS_FULL_MODULE_V1` replaced only Shells with a generated Markdown string.
- `nero-nexura-generated.mjs` serialized the assessment back into sections; other generated modules copied full Markdown. Notes, drafts and generated data had no single ownership rule.
- `nero_metasploit_postbuild.py` introduced a third Markdown renderer and conditionally rewrote built `<main>` content under `NERO_DRAFT_PREVIEW=1`. It was registered as `postbuild`, so source pages and output could disagree.
- `generate_static.py` independently rendered a second site into `preview/`; `patch_writeups_static.py` added Write-ups and patched navigation afterward. Astro wrote `dist/`. The README/Cloudflare quickstart selected `exit 0` and `preview/`, so successful Astro builds did not establish which site would ship.
- `preview-drafts.sh` used port 4325 and built both trees. No active 4326 reference was found in the audited files. The original Astro configuration already requested trailing slashes; independent output scripts bypassed Astro routing.
- A staged four-topic Metasploit report in `src/data/writeups-drafts/` was not connected to the site. Complete Password Attacks and Metasploit Markdown drafts were also not the body used by the ordinary renderer.
- All image arrays were empty. Only manifests named screenshots unavailable in this workspace; there were no genuine raster evidence files in the project. The previous Shells sync script searched filenames, which is insufficient to establish section provenance.
- Build success did not compare canonical source headings, code blocks or complete body text with emitted HTML, allowing abbreviated Field Notes to pass unnoticed.

## Canonical inventory

| Canonical article | Sources consolidated | Result |
| --- | --- | --- |
| `htb-shells-payloads` / module 115 | `notes/writeups/htb-shells-payloads.md`; identical `nero-shells-payloads-report.mjs`; unique original field observations | All 17 walkthrough sections, overview/objectives/background/environment/methodology, troubleshooting, results, defensive analysis, lessons and references. About 3,362 words after retained observations. |
| `htb-metasploit` / module 39 | Complete `drafts/writeups/htb-metasploit/report.md` (5,930 words); full `fortilogger-meterpreter.md` (2,438 words); `notes/writeups/htb-metasploit.md`; staged four-section report; historical section-array variants | All 15 documented module topics plus unique earlier observations. Full FortiLogger report appears under **Related Practical Case Study**, with explicit correction of the original unverified attribution to an official module section. Successful session, failed hashdump and unverified administrative/SYSTEM privileges remain distinct. About 11,308 words. |
| `htb-password-attacks` / module 90 | Complete module draft (4,542 words); **entire NEXURA report (2,473 words)**; unique assessment summary/serialization and original SMB/SAM notes | All 26 documented chapters. NEXURA is inside Skills Assessment, including pivot failures, SMB negotiation, local forwarding, successful privileged authentication, reference-derived Administrator hash and unverified local extraction/submission. Original source dates later than the audit are retained with a chronology warning. About 7,806 words. |
| `htb-footprinting` | Original registry and identical historical copies | All recovered FTP/SMB/NFS/DNS/mail/SNMP/database/remote-management learning notes and mail-lab limitations. Only about 208 words of source material were recoverable; no extra walkthrough or completion evidence was invented. |
| `thm-flarevm-arsenal` | Original room entry and historical copies | Existing room slug and every documented observation retained; completion remains unverified. |
| `thm-soc-level-1` | Original path overview and historical copies | Preserved as `path-overview`, explicitly distinct from an individual room and without room-by-room completion claims. |

All sources in this table are now under `archive/writeups-legacy/` unless they refer to untouched hidden backups. `docs/writeups-migration.json` maps each report/variant to its canonical unit, retained path, source hash and merge classification. Byte-identical generated Markdown was not rendered twice. Additional notes were parsed into blocks and unique blocks retained with source-specific labels; nested JavaScript objects were inspected structurally with the TypeScript AST, not edited by regex.

The old NEXURA, FortiLogger, four-section Metasploit and module-90 draft slugs have no active cards or article routes. No old draft becomes a second module. Existing canonical public slugs remain unchanged.

## Architecture and publication

The controlled migration uses centralized Markdown plus a small validated metadata registry rather than Astro's automatically inferred legacy collections. This fits the existing Marked renderer and avoids introducing a second Markdown engine.

`content/writeups/*.md` + `registry.json` → `src/lib/writeups-core.mjs` → Astro Write-ups pages.

Metadata validation rejects duplicate slugs/units, missing/orphaned report sources, invalid classifications, missing or unreviewed inline images and stale approvals. Vite raw imports track ordinary local edits. All drafts are visible under `npm run dev`; publication requires a named, dated approval tied to the exact content/metadata digest and resolved evidence status. Stale approval never promotes changed content; local review can still display the changed draft.

The only deployment output is `dist/`; `.review/` is isolated and never used by the deployment config. `wrangler.toml` selects `dist`, and both deployment documents now specify `npm run build`. The original Python generator is retained as a thin compatibility command delegating to Astro. No active postbuild patcher, draft environment gate, independent static renderer or alternative preview port remains.

Cloudflare's actual remote dashboard cannot be inferred from a source archive. No authenticated dashboard/deployment configuration was read or modified. A future approved deployment must update a dashboard still configured for `preview/`/`exit 0` to the new documented settings.

## Evidence findings

- Genuine screenshot files recovered in this project: **0**.
- Reviewed inline screenshot associations: **0**.
- Original NEXURA manifests mention `image(20261102-155951).png` and `image(20261102-160645).png`, with claimed hashes, but no corresponding local files. Their provenance cannot be authenticated from a manifest alone.
- FortiLogger has preserved terminal text showing session 2 and the exact failed `hashdump`; no original screenshot, account identity or successful hash retrieval was recovered.
- Password Attacks notes refer to earlier screenshots and terminal observations; these statements remain attributed historical claims, not newly verified image evidence.
- Shells/Footprinting/THM retain their original evidence limitations. All six entries remain Evidence Pending and unapproved.
- Browser-test screenshots in ignored `test-results/` show website layout only. They are **not lab evidence** and are never inserted into reports or `public/writeups/evidence/`.

The new evidence workflow requires actual visual/provenance/redaction review, a local file signature and checksum, exact alt/caption registration and placement under its associated heading. Builds remove unregistered/draft evidence from emitted output without touching originals.

## Verification

See `docs/WRITEUPS_VALIDATION.txt` for actual executed results. Verification includes Astro diagnostics, source/evidence schema checks, migration-preservation tests, actual output parsing, publication exclusion, isolated review output, preserved Research routes, browser desktop/mobile checks, local source refresh and occupied-port behavior.

An additional `npm audit` found five dependency advisories (1 low, 3 high, 1 critical) in the resolved existing Astro 5 ecosystem/direct Zod dependency. Its proposed fixes involve major upgrades, including Astro 7. They were not force-applied during this Astro 5 content refactor. This is a remaining dependency-maintenance issue, separate from the passing content/site acceptance checks.

See `docs/WRITEUPS_CHANGED_FILES.txt` for exact active/new/moved paths and `docs/WRITEUPS_WORKFLOW.md` for future updates.

## Subsequent dependency update

The advisory counts above describe the original migration audit. The later dependency update moved Astro to 7.4.5 and Zod to 4.6.7. See `docs/DEPENDENCY_UPGRADE.md` and `docs/DEPENDENCY_UPGRADE_VALIDATION.txt` for the current installation and executed validation. Original reports, dates, missing-image limitations and publication approvals remain unchanged.
