import { cves } from './cves.mjs';
import { profile } from './profile.mjs';

const repo = 'https://github.com/NeroPQ/CVE-Research-Lab';
const clean = (value = '') =>
  String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
const external = (url, label, cls = '') =>
  url
    ? `<a class="${cls}" href="${clean(url)}" target="_blank" rel="noopener noreferrer">${label} <span aria-hidden="true">↗</span></a>`
    : '';

const selectedProjects = profile.featuredProjects.map((p) => ({
  name: p.name,
  group: p.group,
  type: p.type,
  desc: p.summary,
  tags: p.tags,
  url: p.url,
  accent: p.accent,
}));

const badges = (items) => items.map((t) => `<span class="tag">${clean(t)}</span>`).join('');

const winBar = (label, theme = 'cyan') =>
  `<div class="pixel-win-bar win-${clean(theme)}" aria-hidden="true"><span class="win-title"><i class="win-dots"></i> ${clean(label)}</span><span class="win-controls"><i>–</i><i>□</i><i class="win-close">×</i></span></div>`;

/* Subtle, clean Pixel-Cyber Icons */
const pixelSpriteRce = `<svg class="pixel-sprite" viewBox="0 0 16 16" shape-rendering="crispEdges" aria-hidden="true">
  <path fill="#79e0e1" d="M5 2h6v1H5zM4 3h8v2H4zM3 5h10v4H3zM4 9h8v2H4zM5 11h2v2H5zM9 11h2v2H9zM2 4h1v2H2zM13 4h1v2h-1zM1 7h2v1H1zM13 7h2v1h-2z"/>
  <path fill="#0b1524" d="M5 6h2v2H5zM9 6h2v2H9zM6 9h4v1H6z"/>
  <path fill="#ff6b81" d="M5 6h1v1H5zM9 6h1v1H9z"/>
</svg>`;

const pixelSpriteLpe = `<svg class="pixel-sprite" viewBox="0 0 16 16" shape-rendering="crispEdges" aria-hidden="true">
  <path fill="#f7c177" d="M5 2h6v1H5zM4 3h2v4H4zM10 3h2v4h-2zM5 7h6v1H5zM7 8h2v6H7zM9 10h3v1H9zM9 12h3v2H9z"/>
  <path fill="#5ce8ad" d="M6 4h4v2H6z"/>
</svg>`;

const pixelSpriteShield = `<svg class="pixel-sprite-lg" viewBox="0 0 20 20" shape-rendering="crispEdges" aria-hidden="true">
  <path fill="#5c99ff" d="M4 2h12v2H4zM2 4h2v8H2zM16 4h2v8h-2zM4 12h2v3H4zM14 12h2v3h-2zM6 15h3v2H6zM11 15h3v2h-3zM9 17h2v2H9z"/>
  <path fill="#142847" d="M4 4h12v8H4zM6 12h8v3H6zM9 15h2v2H9z"/>
  <path fill="#79e0e1" d="M9 5h2v3H9zM7 8h6v2H7zM9 10h2v4H9z"/>
</svg>`;

const profileLinks = [
  { title: 'TryHackMe', sub: 'N3R0PH4N · Top 1% (resume)', label: 'THM', url: 'https://tryhackme.com/p/N3R0PH4N' },
  {
    title: 'Hack The Box',
    sub: 'User #3896988 · Hands-on labs',
    label: 'HTB',
    url: 'https://app.hackthebox.com/users/3896988?profile-top-tab=machines&ownership-period=1M&profile-bottom-tab=prolabs',
  },
  {
    title: 'PortSwigger Academy',
    sub: 'Web security learning · Public academy',
    label: 'PS',
    url: 'https://portswigger.net/web-security',
    note: 'Personal settings URL is private; public profile link not provided',
  },
];

export function sidebarMarkup() {
  return `<aside class="sidebar" aria-label="Profile and navigation">
  <section class="side-card identity-card pixel-window">
    ${winBar('OPERATOR // DEKA_MASTER', 'purple')}
    <div class="avatar-wrap">
      <div class="avatar avatar-dekamaster">
        <img src="/avatar-dekamaster.jpg" alt="Phan Thien Quang (Nero) — Deka Master avatar" width="96" height="96" loading="eager" />
      </div>
      <span class="avatar-orbit">SPD · NERO</span>
    </div>
    <h2>Phan Thien Quang</h2>
    <p class="handle">@NeroPQ · Ho Chi Minh City</p>
    <div class="telemetry-bar" aria-hidden="true">
      <span class="tel-chip chip-green"><i class="live-dot"></i> SOC &amp; Research Ready</span>
      <span class="tel-chip chip-gold">FPTU IA · GPA 3.4/4.0</span>
    </div>
    <p class="bio">Information Assurance student passionate about offensive and defensive cybersecurity, with hands-on experience in penetration testing, SOC operations, vulnerability research, and security engineering.</p>
    <div class="profile-actions">${external(profile.github, 'GitHub', 'mini-link')}${external(profile.linkedin, 'LinkedIn', 'mini-link')}</div>
  </section>
  <section class="side-card">
    <div class="side-title">QUICK NAVIGATION <span>01</span></div>
    <a class="side-nav" href="/research/"><span>Vulnerability Research</span><b>${cves.length.toString().padStart(2, '0')} CVEs</b></a>
    <a class="side-nav" href="/projects/"><span>Engineering &amp; Projects</span><b>${String(selectedProjects.length).padStart(2, '0')} Apps</b></a>
    <a class="side-nav" href="/writeups/"><span>Platform Write-ups</span><b>6 Labs ↗</b></a>
    <a class="side-nav" href="/about/"><span>Experience &amp; Skills</span><b>Profile ↗</b></a>
  </section>
  <section class="side-card">
    <div class="side-title">PRACTICE PLATFORMS <span>02</span></div>
    ${profileLinks
      .map((p) =>
        external(
          p.url,
          `<span class="platform-initial">${p.label}</span><span class="platform-item-text"><strong>${p.title}</strong><small>${p.sub}</small></span>`,
          'platform-row'
        )
      )
      .join('')}
    <p class="micro-note">Profile ranks can change. PortSwigger links to the public Academy, not account settings.</p>
  </section>
  <section class="side-card">
    <div class="side-title">KEY HIGHLIGHTS <span>03</span></div>
    <div class="side-achievement"><strong>Top 1%</strong><span>TryHackMe · SOC Level 1 path completed</span></div>
    <div class="side-achievement"><strong>Top 15</strong><span>THRYVE CTF 2026</span></div>
    <div class="side-achievement"><strong>46th Place</strong><span>CSCV 2026 · Team WannaLoSE</span></div>
    <a href="/about/#achievements" class="side-all">View all achievements <span>↗</span></a>
  </section>
</aside>`;
}

export function heroMarkup() {
  return `<section class="banner" id="top">
    <div class="banner-noise"></div>
    <div class="banner-circuit" aria-hidden="true"></div>
    <div class="banner-pixel-clusters" aria-hidden="true"></div>
    <div class="banner-content">
      <div class="eyebrow"><span class="live-dot"></span> RED TEAM • BLUE TEAM • SECURITY RESEARCH</div>
      <h1>Hi, I'm <span>Nero.</span></h1>
      <p>Researching critical vulnerabilities, engineering detection systems, and documenting reproducible lab evidence.</p>
      <div class="hero-quick-highlights" aria-label="Key portfolio metrics">
        <span><strong>4</strong> Verified CVE Case Studies</span>
        <span><strong>6</strong> Deep-Dive HTB &amp; THM Reports</span>
        <span><strong>Top 1%</strong> TryHackMe · SOC L1</span>
      </div>
      <div class="banner-actions">
        <a class="primary-action" href="/research/">Explore CVE Research <span>↗</span></a>
        <a class="secondary-action" href="/writeups/">Read Lab Write-ups <span>↗</span></a>
        <a class="secondary-action" href="/about/">About &amp; Skills <span>↗</span></a>
      </div>
    </div>
    <div class="banner-coordinate">PHAN THIEN QUANG (@NEROPQ)<br>HO CHI MINH CITY • FPT UNIVERSITY</div>
  </section>`;
}

function severityTag(score) {
  const num = Number(score);
  if (num >= 9.0) {
    return `<span class="tag tag-critical">CVSS ${num.toFixed(1)} · Critical</span>`;
  }
  return `<span class="tag tag-high">CVSS ${num.toFixed(1)} · High</span>`;
}

function researchEntry(c, index) {
  const isRce = c.family === 'Remote Code Execution';
  const subtitle = isRce ? 'Remote Code Execution' : 'Linux Privilege Escalation';
  const isCritical = Number(c.score) >= 9.0;
  return `<article class="entry-card" data-cve-id="${clean(c.id)}" data-severity="${isCritical ? 'critical' : 'high'}">
    <div class="entry-card-body">
      <div class="entry-index">${String(index + 1).padStart(2, '0')}</div>
      <div class="entry-main">
        <div class="entry-meta">
          <span class="meta-cve">${clean(c.id)}</span><i>•</i><span>${clean(subtitle)}</span><i>•</i><span class="meta-verified">✓ Lab verified</span>
        </div>
        <h3><a href="/research/${clean(c.slug)}/">${clean(c.name)} <span>↗</span></a></h3>
        <p>${clean(c.summary)}</p>
        <div class="entry-foot">
          ${severityTag(c.score)}
          <span class="tag tag-verified">Outcome: ${clean(c.impact)}</span>
          <a href="${repo}/tree/main/${clean(c.folder)}" target="_blank" rel="noopener noreferrer">Source report ↗</a>
        </div>
      </div>
      <div class="entry-art ${isRce ? 'art-rce' : 'art-lpe'}">
        ${isRce ? pixelSpriteRce : pixelSpriteLpe}
        <span>${isRce ? 'RCE' : 'LPE'}</span>
        <small>${clean(c.id)}</small>
      </div>
    </div>
  </article>`;
}

function projectEntry(p, index) {
  return `<article class="project-entry">
    <div class="project-entry-body">
      <div class="project-art ${clean(p.accent)}">${String(index + 1).padStart(2, '0')}</div>
      <div class="project-body">
        <div class="entry-meta"><span>${clean(p.type)}</span></div>
        <h3>${p.url ? external(p.url, clean(p.name), 'project-title') : clean(p.name)}</h3>
        <p>${clean(p.desc)}</p>
        <div class="tag-strip">${badges(p.tags)}</div>
      </div>
      ${p.url ? external(p.url, 'View repo', 'project-arrow') : '<span class="planned-mark">Lab notes</span>'}
    </div>
  </article>`;
}

export function homeMarkup() {
  const featured = selectedProjects[0];
  return `${heroMarkup()}<div class="page-shell two-column"><div class="content-column">
  <section class="feed-section" id="featured">
    <div class="section-heading"><div><div class="eyebrow">FEATURED ENGINEERING</div><h2>Selected work.</h2></div><a href="/projects/" class="quiet-link">All projects ↗</a></div>
    <article class="featured-story pixel-window">
      ${winBar('FEATURED_SYSTEM // RANSOMWARE_AI_DETECTION', 'cyan')}
      <div class="featured-story-grid">
        <div class="feature-illustration">
          <div class="feature-orbits"></div>
          <div class="radar-sweep" aria-hidden="true"></div>
          <div class="feature-top">DETECTION ENGINEERING <span>01 / 06</span></div>
          <div class="feature-center"><span class="pulse-ring"></span>${pixelSpriteShield}</div>
          <div class="feature-bottom">BEHAVIORAL ANALYTICS <span>TELEMETRY: ACTIVE</span></div>
        </div>
        <div class="feature-content">
          <div class="entry-meta">ACTIVE RESEARCH <i>•</i> PYTHON / TELEMETRY</div>
          <h3>${clean(featured.name)}</h3>
          <p>${clean(featured.desc)}</p>
          <div class="tag-strip">${badges(featured.tags)}</div>
          ${external(featured.url, 'Read project on GitHub', 'story-link')}
        </div>
      </div>
    </article>
  </section>
  <section class="feed-section" id="research">
    <div class="section-heading"><div><div class="eyebrow">VULNERABILITY RESEARCH</div><h2>From the lab.</h2><p>Four evidence-backed CVE reproductions with full root-cause analysis and verification boundaries.</p></div><a href="/research/" class="quiet-link">Research archive ↗</a></div>
    <div class="entry-list" id="research-grid">${cves.map(researchEntry).join('')}</div>
    <div class="feed-foot" id="live-note">Checking repository for newly published research…</div>
  </section>
  <section class="feed-section" id="projects">
    <div class="section-heading"><div><div class="eyebrow">SECURITY ENGINEERING &amp; LABS</div><h2>More than exploits.</h2><p>Defensive tooling, SIEM alert investigations, and academic web applications.</p></div><a href="/projects/" class="quiet-link">View all ↗</a></div>
    <div class="project-entry-list">${selectedProjects
      .filter((p) => p.group === 'Security Engineering' && p.name !== featured.name)
      .map((p, i) => projectEntry(p, i + 1))
      .join('')}</div>
    <div class="compact-feature">
      <div class="compact-feature-body">
        <div><small>ACADEMIC WEB PROJECTS</small><strong>AI Smart Campus · FIA Workspace</strong><p>Two academic web projects exploring responsible AI and club operations, including role-based access control and team workflows.</p></div>
        <a href="/projects/#academic" class="secondary-action">Explore ↗</a>
      </div>
    </div>
  </section>
  <section class="feed-section contact-strip">
    <div class="contact-strip-body">
      <div><div class="eyebrow">DIRECT CONTACT</div><h2>Interested in collaborating?</h2><p>I'm exploring SOC Analyst, Security Engineering, and Penetration Testing opportunities.</p></div>
      <a href="mailto:${clean(profile.email)}" class="primary-action">Get in touch ↗</a>
    </div>
  </section>
</div>${sidebarMarkup()}</div>`;
}

export function researchMarkup() {
  return `<div class="page-shell two-column"><div class="content-column">
  <section class="feed-section inner-intro pixel-window">
    ${winBar('RESEARCH_ARCHIVE // CVE_REPRODUCTIONS', 'cyan')}
    <div class="inner-intro-body">
      <div class="eyebrow"><span class="live-dot"></span> RESEARCH / ARCHIVE</div>
      <h1>CVE research journal.</h1>
      <p>Hands-on analysis, original evidence and documented limitations. All reproductions were conducted in authorized lab environments.</p>
    </div>
  </section>
  <section class="feed-section">
    <div class="section-heading"><div><div class="eyebrow">VERIFIED LAB CASE STUDIES</div><h2>Research archive</h2></div></div>
    <div id="research-grid" class="entry-list">${cves.map(researchEntry).join('')}</div>
    <div class="feed-foot" id="live-note">Checking GitHub repository…</div>
  </section>
  <a class="secondary-action in-content" href="${repo}" target="_blank" rel="noopener noreferrer">Full research repository ↗</a>
</div>${sidebarMarkup()}</div>`;
}

export function projectsMarkup() {
  const groups = ['Security Engineering', 'Academic Projects'];
  return `<div class="page-shell two-column"><div class="content-column">
  <section class="feed-section inner-intro pixel-window">
    ${winBar('ENGINEERING_INDEX // TOOLS_AND_SYSTEMS', 'purple')}
    <div class="inner-intro-body">
      <div class="eyebrow"><span class="live-dot"></span> BUILD / PROJECT INDEX</div>
      <h1>Selected engineering projects.</h1>
      <p>Case studies and source where available. Development prototypes and research-stage work are labeled accordingly.</p>
    </div>
  </section>
  ${groups
    .map(
      (g) => `<section class="feed-section" id="${g === 'Academic Projects' ? 'academic' : 'security'}">
    <div class="section-heading"><div><div class="eyebrow">${clean(g.toUpperCase())}</div><h2>${g === 'Academic Projects' ? 'Academic web applications.' : 'Research into systems.'}</h2></div></div>
    <div class="project-entry-list">${selectedProjects
      .filter((x) => x.group === g)
      .map((p, i) => projectEntry(p, i))
      .join('')}</div>
  </section>`
    )
    .join('')}
</div>${sidebarMarkup()}</div>`;
}

export function aboutMarkup() {
  return `<div class="page-shell two-column"><div class="content-column">
  <section class="feed-section inner-intro pixel-window">
    ${winBar('PROFILE_DOSSIER // PHAN_THIEN_QUANG', 'amber')}
    <div class="inner-intro-body">
      <div class="eyebrow"><span class="live-dot"></span> ABOUT / BACKGROUND</div>
      <h1>Curiosity with a paper trail.</h1>
      <p>I'm Phan Thien Quang, an Information Assurance student at FPT University (GPA 3.4/4.0). I work at the intersection of offensive research and defensive investigation, with an emphasis on clear documentation and reproducible evidence.</p>
    </div>
  </section>
  <section class="feed-section" id="experience">
    <div class="section-heading"><div><div class="eyebrow">EXPERIENCE &amp; EDUCATION</div><h2>Where I've learned.</h2></div></div>
    <div class="timeline">${profile.experience
      .map(
        (x) => `<article class="timeline-entry"><div class="timeline-entry-body"><small>${clean(x.label)}</small><h3>${clean(x.title)}</h3><p>${clean(x.detail)}</p></div></article>`
      )
      .join('')}</div>
  </section>
  <section class="feed-section" id="achievements">
    <div class="section-heading"><div><div class="eyebrow">MILESTONES &amp; CERTIFICATIONS</div><h2>Achievements &amp; training.</h2></div></div>
    <div class="achievement-list">
      ${profile.achievements
        .map(
          (a) => `<article class="achievement-row"><span>${clean(a.kicker)}</span><div><strong>${clean(a.title)}</strong><p>${clean(a.detail)}</p></div>${a.url ? external(a.url, 'View', 'text-arrow') : ''}</article>`
        )
        .join('')}
    </div>
    <p class="micro-note">CCNA (200-301) is in progress — not yet certified. Platform rankings reflect the resume snapshot and can change.</p>
  </section>
  <section class="feed-section" id="skills">
    <div class="section-heading"><div><div class="eyebrow">TECHNICAL TOOLBOX</div><h2>What I use.</h2></div></div>
    <div class="skill-catalog">${profile.skillGroups
      .map(
        (g) => `<div class="skill-card"><div class="skill-card-body"><h3>${clean(g.name)}</h3><div class="tag-strip">${badges(g.items)}</div></div></div>`
      )
      .join('')}</div>
  </section>
</div>${sidebarMarkup()}</div>`;
}

export function caseMarkup(c) {
  const isCritical = Number(c.score) >= 9.0;
  const directEvidence = c.evidenceFiles
    .map((file) =>
      external(
        `${repo}/blob/main/${c.folder}/${file}`,
        `${clean(file.split('/').at(-1))}`,
        'evidence-link'
      )
    )
    .join('');

  return `<div class="page-shell two-column detail-page"><div class="content-column">
  <div class="detail-breadcrumb"><a href="/research/">← Back to Research archive</a><span>${clean(c.id)}</span></div>
  <section class="detail-lead pixel-window" data-severity="${isCritical ? 'critical' : 'high'}">
    ${winBar(`CVE_CASE_STUDY // ${c.id} · ${c.level}`, isCritical ? 'red' : 'amber')}
    <div class="detail-lead-body">
      <div class="eyebrow"><span class="live-dot"></span> AUTHORIZED LAB · DOCUMENTED REPRODUCTION</div>
      <h1>${clean(c.name)}<small>${clean(c.id)}</small></h1>
      <p>${clean(c.summary)}</p>
      <div class="killchain-strip" aria-label="Reproduction workflow stages">
        <span>01. Vector Analysis</span>
        <i>→</i>
        <span>02. Controlled Trigger</span>
        <i>→</i>
        <span>03. Telemetry Capture</span>
        <i>→</i>
        <span>04. Scope Boundary</span>
      </div>
      <div class="detail-metrics">
        <div class="metric-box">
          <span>CVSS BASE SCORE</span>
          <strong class="${isCritical ? 'text-critical' : 'text-high'}">${Number(c.score).toFixed(1)} (${clean(c.level)})</strong>
        </div>
        <div class="metric-box">
          <span>VULNERABILITY CLASS</span>
          <strong>${clean(c.family)}</strong>
        </div>
        <div class="metric-box">
          <span>VERIFIED LAB OUTCOME</span>
          <strong class="text-verified">${clean(c.result || c.impact)}</strong>
        </div>
      </div>
    </div>
  </section>
  <article class="detail-prose">
    <div class="detail-prose-body">
      <section>
        <div class="eyebrow">01 / METHODOLOGY</div>
        <h2>Investigation approach</h2>
        <p>${clean(c.detail)}</p>
      </section>
      <section>
        <div class="eyebrow">02 / ROOT CAUSE</div>
        <h2>What made it possible</h2>
        <p>${clean(c.rootCause)}</p>
      </section>
      <section>
        <div class="eyebrow">03 / ARTIFACTS &amp; EVIDENCE</div>
        <h2>What the lab demonstrated</h2>
        <ul class="terminal-checklist">${c.evidence.map((x) => `<li>${clean(x)}</li>`).join('')}</ul>
      </section>
      <section>
        <div class="eyebrow">04 / VERIFICATION BOUNDARY</div>
        <h2>Limitations &amp; scope</h2>
        <p class="scope-callout">${clean(c.limits)}</p>
      </section>
      <div class="detail-sources">
        <h3>Original research files &amp; repository</h3>
        <p>Source material, lab logs and screenshots are preserved in the public GitHub repository.</p>
        ${external(`${repo}/blob/main/${c.folder}/README.md`, 'Read full technical report on GitHub', 'primary-action')}
        <div class="evidence-files">${directEvidence}</div>
        <div class="tag-strip">${badges(c.tags)}</div>
      </div>
    </div>
  </article>
</div>${sidebarMarkup()}</div>`;
}