# NERO.SEC — Write-ups maintenance

## Single source and renderer

Canonical English reports live in `content/writeups/<canonical-slug>.md`.
`content/writeups/registry.json` contains validated metadata, evidence associations and explicit publication approval; summaries never replace article bodies.

The pipeline is:

`registry + Markdown → writeups-core.mjs (Zod validation + Marked) → Astro pages → dist/`

`src/data/writeups.mjs` imports raw Markdown through Vite so edits trigger local refresh. Article headings and the TOC come from the same Markdown parse. The index supports combined platform/search filters with shareable query URLs. Articles expose an approximate reading time, a reading shortcut, a native collapsible TOC and copy buttons for fenced code blocks. Reports longer than 20 minutes start with the TOC collapsed. These controls do not alter report content; reports and the native TOC remain readable without JavaScript. Do not add H1 titles to report bodies: the registry supplies the single page title. Use H2 chapters and H3 subsections. Fenced code blocks, GFM tables and Markdown links are supported. Raw HTML is escaped.

One HTB Academy module has one `unitId`, slug, file, card and route. Skills Assessments belong inside that module. One THM room has one article. The existing `thm-soc-level-1` entry is explicitly a path overview, not a room completion claim. CVE content stays in Research.

The previous scripts, data modules, drafts and static `preview/` are retained in `archive/writeups-legacy/` for provenance only. Existing hidden backup directories are also inactive. Never import them into active pages. `scripts/generate_static.py` is a compatibility wrapper for `npm run build`; it contains no renderer and does not recreate `preview/`.

## Local development and public output

Use Node.js 24 LTS (minimum 22.23.4) and `npm ci`.

```bash
npm run dev
```

Open **http://127.0.0.1:4321/writeups/**. All canonical drafts are visible with documentation/evidence labels; no environment flag is needed. All canonical routes end with `/`. A busy port causes an error and a process listing; commands never kill another service or select another port.

```bash
npm run check --if-present
npm test
npm run build
npm run preview
```

`build` writes only publication-approved reports to `dist/` and verifies actual emitted HTML. `preview` serves that production output on 4321, so unapproved drafts are intentionally absent. Stop the current server with Ctrl+C before switching workflows.

For a static review containing all reports:

```bash
npm run build:review
npm run preview:review
```

Review uses the same sources, routes and renderer, with isolated `.review/` output and draft `noindex` metadata. It never overwrites `dist/`. A normal build does not change which reports appear in `npm run dev`. Do not publish `.review/` or the archive.

## Resolve and update a module section

```bash
npm run writeups -- resolve htb-metasploit
```

Edit the returned canonical Markdown directly, or prepare the **body** of a chapter in a local Markdown file, then update its exact heading:

```bash
npm run writeups -- section htb-metasploit \
  --heading '11. Meterpreter' --file /tmp/meterpreter-section.md
```

This replaces that chapter and its subsections; include the findings you intend to retain. It never patches JavaScript or generated HTML. To add a new H2 chapter, use a new heading and `--append`. The file must contain the chapter body, with H3 or deeper headings. Repeating the same update produces the same file and card count. A missing or ambiguous heading is rejected. Source changes revoke publication approval.

Skills Assessment updates use the same module file. For example:

```bash
npm run writeups -- section htb-password-attacks \
  --heading 'Section 26 — Skills Assessment: NEXURA' \
  --file /tmp/nexura-chapter.md
```

Preserve terminal provenance, failures, reference-only outcomes and evidence limitations. Do not convert session establishment into a privilege, hash extraction or module-completion claim.

## Add an HTB module or THM room

Identify the official module ID/room identifier first. Resolve an existing unit before creating content:

```bash
npm run writeups -- new --platform HTB --unit-id 39 \
  --slug htb-metasploit --title 'Using the Metasploit Framework' \
  --source https://academy.hackthebox.com/app/module/39
```

This detects existing module 39 and returns its canonical file instead of creating a second card. For a new module, use its verified ID, title and a new `htb-*` slug. To add a THM room, use `--platform THM`, the official room identifier as `--unit-id`, and a `thm-*` slug. New entries start as Evidence Pending and unapproved. Verified difficulty may be set in the registry; otherwise retain `null`.

## Genuine evidence

Keep private originals outside `public/`. Place reviewed/redacted copies at:

`public/writeups/evidence/<canonical-slug>/<section>/image.png`

Inspect the actual pixels, source transcript, target, timestamp and section context. A matching filename does not establish provenance. Do not use generated screenshots, mockups or third-party images as first-party lab evidence. Review credentials, hashes, tokens and personal information before attaching anything. Preserve the original privately.

Place the screenshot near its associated step as its own paragraph:

```markdown
![Specific observation shown](/writeups/evidence/htb-metasploit/meterpreter/session.png "Caption explaining the observed result and its limits")
```

Add a matching item to the report's `evidence` array in `registry.json`:

```json
{
  "src": "/writeups/evidence/htb-metasploit/meterpreter/session.png",
  "section": "11-meterpreter",
  "alt": "Specific observation shown",
  "caption": "Caption explaining the observed result and its limits",
  "sha256": "<64 lowercase hex characters from sha256sum>",
  "verified": true,
  "sensitiveReviewed": true
}
```

Use the actual heading anchor from the article TOC for `section`; do not copy an example blindly. Paths, file signatures, checksums, nonempty alt/captions, section existence and inline registration are validated. No missing screenshot is replaced with invented evidence. Keep `evidenceStatus: "pending"` until the article's required evidence is reviewed; missing screenshots never hide the local report. Unregistered, draft and unused evidence is removed from build outputs, leaving originals in `public/` untouched.

## Publication approval

All migrated articles begin unapproved because no explicit approval was found. Currently all six are Evidence Pending, so a normal public build has zero Write-ups cards. That is intentional.

After reviewing genuine evidence, claims, redactions and platform publication rules, set `evidenceStatus` to `verified`. `not-required` is reserved for reviewed conceptual/overview articles requiring no lab screenshot, with a documented rationale; it is not a workaround for missing practical evidence.

```bash
npm run writeups -- approve htb-metasploit --reviewer 'NERO.SEC' --date YYYY-MM-DD
npm run build
```

Approval requires a named reviewer and date and records a SHA-256 over the exact report and metadata. Pending evidence cannot be approved. Later manual changes make approval stale and fail validation; revoke first, then review again:

```bash
npm run writeups -- revoke htb-metasploit
```

The automated section updater revokes approval on any changed report. This task does not grant publication approval or deploy anything.

## Validation

```bash
npm run validate:writeups
npm run check --if-present
npm test
npm run build
npm run build:review
npm run test:browser
```

The build verifier independently parses emitted HTML, compares every source heading/code block and the complete body, checks one card/route per visible canonical report, validates internal assets/links/fragments, checks draft exclusion and preserves all four Research URLs. Regression tests protect the 17 Shells sections, full NEXURA assessment, related FortiLogger case and idempotent updates. Browser tests also cover search/filter counts, keyboard navigation, 320px layouts, clipboard behavior, no-JavaScript reading and automated WCAG checks. `npm run check` includes TypeScript strict checks through `tsconfig.json`. Browser tests use normal `npm run dev`, port 4321, Chromium, desktop and mobile widths. Stop other local servers before running them. `PLAYWRIGHT_CHROMIUM_EXECUTABLE` can select an installed Chromium; the default on this Kali workspace is `/usr/bin/chromium`.

See `docs/WRITEUPS_AUDIT.md` and `docs/writeups-migration.json` for migration inventory and provenance.

## Dependency and date provenance maintenance

The current patched toolchain uses Astro 7.4.5 and Zod 4.6.7. Use the Node version in `.node-version` (24.15.0), `npm ci`, then run the existing check/test/build/browser commands before accepting an upgrade. `npm audit` checks the installed dependency tree against the advisories known to the registry at that time; a clean result is not a guarantee against future advisories.

Source dates are shown as **Source date (unverified)** unless `dateVerification: "verified"` and a nonempty `dateReference` identify original dated evidence. Do not infer a lab date from a filesystem timestamp or the date of a migration. Retain conflicting dates in the original text with their provenance note. Optional date fields belong in `registry.json`; changes revoke or invalidate publication approval just like other metadata changes.
