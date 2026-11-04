# Nero Security — Personal Cybersecurity Portfolio v0.4

A curated, editorial-style security portfolio for **Phan Thien Quang (NeroPQ)**. This redesign draws inspiration from the **content hierarchy** of [nquangit.io.vn](https://nquangit.io.vn/) while using an original visual design (no copied artwork or code).

## What's changed

- Two-column desktop layout: editorial research feed on the left, concise personal sidebar on the right.
- Less content clutter: just **one featured project** on the homepage, four CVE research entries, and a shortlist of engineering work.
- **Research** `/research/` and its four detailed CVE case studies.
- **Projects** `/projects/` groups security engineering separately from academic web projects.
- **About** `/about/` houses education, internship training, student activities, achievements, learning history and tooling.
- Sidebar has the *user-provided* TryHackMe and Hack The Box profiles and a public PortSwigger Web Security Academy link.
- Links to GitHub evidence are clearly distinguished from projects still in progress or work with no source URL.
- Accessible labels, responsive typography and mobile layout tested at 390px.

## Profile links

- GitHub: https://github.com/NeroPQ
- LinkedIn: https://www.linkedin.com/in/phan-quang-nero/
- TryHackMe: https://tryhackme.com/p/N3R0PH4N
- Hack The Box: https://app.hackthebox.com/users/3896988?profile-top-tab=machines&ownership-period=1M&profile-bottom-tab=prolabs
- PortSwigger: https://portswigger.net/web-security

**PortSwigger note:** The supplied `https://portswigger.net/users/youraccount/personaldetails` is a personal account settings page, not a public profile. This site therefore links to the Academy itself without claiming to show the owner's private progress.

## Local development and builds

Use Node.js 24 LTS (minimum 22.23.4) and `npm ci`, then `npm run dev`.
Open http://127.0.0.1:4321/writeups/ to review all canonical reports, including Evidence Pending drafts.

`npm run build` creates the publication-approved production site in `dist/`; `npm run preview` serves it on port 4321. `npm run build:review` and `npm run preview:review` use isolated `.review/` output for draft review, also on port 4321. Stop the current server before switching modes. A busy port produces a process listing and an error.

Cloudflare Pages configuration: build command `npm run build`, output `dist` (also declared in `wrangler.toml`). No deployment is performed by these commands. The old prebuilt `preview/` workflow is retired; its files are preserved under `archive/writeups-legacy/`. The legacy Python generator now delegates to Astro.

## Content maintenance

- `content/writeups/*.md` — complete canonical English module/room reports.
- `content/writeups/registry.json` — validated metadata, evidence and explicit approval.
- `src/lib/writeups-core.mjs` — the single Markdown renderer and validator.
- `src/data/profile.mjs` — profile and curated projects.
- `src/data/cves.mjs` — the four reviewed Research cases; separate from Write-ups.
- `src/data/render.mjs` — shared editorial markup for the unchanged portfolio sections.
- `public/styles.css` — shared portfolio styles and accessible navigation.
- `public/writeups.css` and `src/scripts/writeups.ts` — Write-ups styles, search/filter controls and code copying.
- `public/site.js` — shared navigation/year behavior and read-only Research discovery.

Run `npm run check --if-present`, `npm test`, `npm run build` and `npm run build:review` for source, migration and real HTML checks. See [docs/WRITEUPS_WORKFLOW.md](docs/WRITEUPS_WORKFLOW.md) for section updates, evidence review and publication approval, and [docs/WRITEUPS_AUDIT.md](docs/WRITEUPS_AUDIT.md) for the migration inventory.

### GitHub CVE discovery

On page load, the site attempts to fetch the names of new `CVE-YYYY-NNNN` folders from `NeroPQ/CVE-Research-Lab` and appends neutral, **unreviewed** links. It does **not** automatically claim exploit validation. It does **not** parse new README text or enrich NVD/EPSS values. Curated case studies require editing the data source and rebuilding.

## Privacy and accuracy

- Phone numbers and original resume PDFs are intentionally excluded.
- CVE outcomes are based on the public, authorized lab reports.
- TryHackMe Top 1% and competition placements are resume-reported snapshots, not live ranking API checks.
- The two resumes give conflicting NetworkWalks month ranges; this portfolio uses only the year 2026 pending confirmation.
- CCNA is marked **in progress**, never certified.
- The local Python CVE collector works; hosted CTI analytics and Grafana are future features, not yet publicly deployed.

## v0.4 content changes

- The **FIA Workspace · Club Management** academic Flask team web app now appears in the Projects section. Original team repository: https://github.com/nitale143/PWD301_Webapp_ClubManagement
- Streamlined the experience timeline to the entries selected by the portfolio owner.
- Updated the FIA Club description to focus on broader cybersecurity learning and participation in security competitions/CTFs.
- Renamed the academic category **Academic Projects** to reflect web development rather than IoT.
