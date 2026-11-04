# NERO.SEC — Dependency upgrade and outstanding evidence

Date: 2026-11-02.

## Changes

- Astro **5.18.2 → 7.4.5**, pinned to the reviewed release.
- Zod **3.25.76 → 4.6.7**, pinned to the reviewed release and shared with Astro without a second vulnerable copy.
- Transitive dependency tree refreshed through npm; affected legacy packages removed or replaced by the new compatible tree. No advisory suppression, `--force`, arbitrary dependency overrides or disabled checks were used.
- Project Node requirement changed to **>=22.23.4**; `.node-version` pins the tested **24.15.0** runtime. Local/deployment maintenance documents now describe Astro 7 and the required Node version.
- Validation uses Zod 4 `z.iso.date()` and `z.url()` APIs, preserving partial-date precision and all existing metadata values.
- Local CLI resolves Astro's declared package `bin` rather than hardcoding the removed Astro 5 `astro.js` path. The wrapper forces foreground operation through the documented `--ignore-lock` flag after its own port-conflict probe; this prevents Astro 7 agent auto-backgrounding from outliving Playwright/Ctrl+C. Caller-supplied forced restarts/background flags are rejected. Port 4321 and localhost binding remain unchanged.
- Date display now explicitly says **Source date (unverified)** unless metadata provides `dateVerification: "verified"` plus a nonempty `dateReference`. Schema regression checks cover the reference requirement. This does not verify or alter historical lab dates.

## Validation

`docs/DEPENDENCY_UPGRADE_VALIDATION.txt` contains the actual clean `npm ci`, full `npm audit`, Astro/TypeScript/schema checks, 13 regression tests, production/review builds, 24 passing browser tests and two mobile-only skips. `docs/dependency-audit-current.json` preserves the latest full audit result: **0 low, 0 moderate, 0 high, 0 critical; total 0**, according to the registry at validation time.

HTML validation still checks complete report bodies, every heading/code span/block, unique cards/routes, internal links/assets and all four Research URLs. Production excludes all six unapproved reports. Review includes all six in isolated `.review/`; production output hashes remain unchanged by review builds.

## Preservation

Before upgrading, original source/content/package files were copied to:

`../nero-dependency-upgrade-backup-20261102T235446Z/`

SHA-256 checks confirm canonical English Markdown, registry metadata, Research/CVE content and profile sources are unchanged. Existing UI identity, canonical slugs, full Shells report, complete NEXURA chapter and FortiLogger verification boundaries are preserved. This workspace still has no `.git`; no commit, push, PR or deployment was performed.

## Outstanding evidence

All **six reports remain Evidence Pending and unapproved**. Only manifests are available under `public/writeups/`; original lab screenshots were not supplied or recovered. No screenshots or completion claims were invented, and no evidence/publication status was promoted to make the warnings disappear.

Source date contradictions, including retained 2026-11-03 dates inside original Password Attacks/NEXURA reports, remain documented as provenance limitations. Filesystem timestamps or this upgrade date are not substituted for an authenticated lab date.

Public deployment remains a separate action. Repository hosting configuration still selects `npm run build` and `dist/`; no remote dashboard or hosting service was changed.
