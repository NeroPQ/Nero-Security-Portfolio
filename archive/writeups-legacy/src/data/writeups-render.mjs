import { marked } from 'marked';
import { writeups } from './writeups.mjs';
import { sidebarMarkup, heroMarkup } from './render.mjs';

const esc = (value = '') =>
  String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

const platformName = (platform) =>
  platform === 'THM' ? 'TryHackMe' : 'Hack The Box Academy';

const statusLabels = {
  reported: 'Reported completion',
  practice: 'Documented practice',
  notes: 'Learning notes'
};

function writeupCard(w) {
  return `
    <article class="wu-card" data-wu-platform="${esc(w.platform)}">
      <div class="wu-card-meta">
        <span class="wu-platform ${w.platform.toLowerCase()}">
          ${platformName(w.platform)}
        </span>
        <span>${esc(w.category)}</span>
      </div>

      <h3>
        <a href="/writeups/${esc(w.slug)}/">
          ${esc(w.title)} <span>↗</span>
        </a>
      </h3>

      <p>${esc(w.summary)}</p>

      <div class="wu-tags">
        ${w.tags.map(tag => `<span>${esc(tag)}</span>`).join('')}
      </div>

      <div class="wu-card-foot">
        <small>${esc(statusLabels[w.kind])}</small>
        <a href="/writeups/${esc(w.slug)}/">Read write-up →</a>
      </div>
    </article>
  `;
}

export function writeupIndexMarkup() {
  const thmCount = writeups.filter(w => w.platform === 'THM').length;
  const htbCount = writeups.filter(w => w.platform === 'HTB').length;

  return `
    ${heroMarkup()}

    <div class="page-shell two-column">
      <div class="content-column">

        <section class="feed-section inner-intro">
          <div class="eyebrow">PLATFORM LAB JOURNAL</div>
          <h2>Write-ups.</h2>
          <p>
            TryHackMe rooms and Hack The Box Academy modules,
            organized by platform.

            CVE case studies are maintained in the
            separate Research section.
          </p>
        </section>

        <section class="feed-section">
          <div class="section-heading">
            <div>
              <div class="eyebrow">LEARN / PRACTICE / DOCUMENT</div>
              <h2>Lab notes & walkthroughs.</h2>
            </div>
            <span class="wu-count">
              ${writeups.length} documented entries
            </span>
          </div>

          <div class="wu-filters" aria-label="Filter write-ups by platform">
            <button type="button" data-writeup-filter="ALL" aria-pressed="true">
              All (${writeups.length})
            </button>

            <button type="button" data-writeup-filter="THM" aria-pressed="false">
              TryHackMe (${thmCount})
            </button>

            <button type="button" data-writeup-filter="HTB" aria-pressed="false">
              HTB Academy (${htbCount})
            </button>
          </div>

          <div class="wu-grid">
            ${writeups.map(writeupCard).join('')}
          </div>
        </section>

      </div>

      ${sidebarMarkup()}
    </div>
  `;
}

function writeupSection(section, index) {
  return `
    <section class="wu-section">
      <div class="eyebrow">
        ${String(index + 1).padStart(2, '0')} / FIELD NOTES
      </div>

      <h2>${esc(section.heading)}</h2>
      <p>${esc(section.text)}</p>

      ${section.points?.length ? `
        <ul>
          ${section.points.map(point => `<li>${esc(point)}</li>`).join('')}
        </ul>
      ` : ''}

      ${section.code ? `
        <pre><code>${esc(section.code)}</code></pre>
      ` : ''}
    </section>
  `;
}

export function writeupDetailMarkup(writeup) {
  const w = writeup;

  return `
    <div class="page-shell two-column">
      <article class="content-column wu-article">

        <div class="detail-breadcrumb">
          <a href="/writeups/">← All write-ups</a>
          <span>${platformName(w.platform)}</span>
        </div>

        <header class="wu-article-header">
          <div class="eyebrow">
            ${esc(w.category.toUpperCase())}
            / ${platformName(w.platform).toUpperCase()}
          </div>

          <h1>${esc(w.title)}</h1>
          <p>${esc(w.summary)}</p>

          <div class="wu-detail-meta">
            <span>${esc(w.status)}</span>
            <span>Documented: ${esc(w.date)}</span>
          </div>

          <div class="wu-tags">
            ${w.tags.map(tag => `<span>${esc(tag)}</span>`).join('')}
          </div>

          <a
            class="wu-official"
            href="${esc(w.source)}"
            target="_blank"
            rel="noopener noreferrer"
          >
            Official platform page ↗
          </a>
        </header>

        <div class="wu-article-body">

          ${w.markdown ? `<div class="wu-markdown">${marked.parse(w.markdown)}</div>` : w.sections.map(writeupSection).join('')}

          <section class="wu-section wu-evidence">
            <div class="eyebrow">EVIDENCE</div>
            <h2>Supporting screenshots</h2>

            ${w.images.length
              ? w.images.map(img => `
                <figure>
                  <img
                    src="${esc(img.src)}"
                    alt="${esc(img.alt)}"
                    loading="lazy"
                  />
                  <figcaption>${esc(img.caption)}</figcaption>
                </figure>
              `).join('')
              : `
                <p>
                  No screenshots have been attached to this entry yet.
                  Additional evidence will be added only when recovered
                  and verified.
                </p>
              `
            }

            <p class="wu-disclaimer">
              All exercises were performed in authorized educational
              environments. Sensitive credentials, hashes and flags
              are intentionally excluded.
            </p>
          </section>

        </div>
      </article>

      ${sidebarMarkup()}
    </div>
  `;
}
