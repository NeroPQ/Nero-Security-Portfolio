import { z } from 'zod';
import { Marked, Renderer } from 'marked';
import GithubSlugger from 'github-slugger';
import { decodeHTML } from 'entities';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, realpathSync } from 'node:fs';
import { resolve, sep } from 'node:path';

const slug = z.string().regex(/^(htb|thm)-[a-z0-9]+(?:-[a-z0-9]+)*$/);
const nonempty = z.string().trim().min(1);
const documentedDate = z.string().regex(/^\d{4}(?:-(?:0[1-9]|1[0-2]))?$/)
  .or(z.iso.date());
const webUrl = z.url({ protocol: /^https?$/ });
export const reportSchema = z.object({
  slug,
  platform: z.enum(['HTB', 'THM']),
  unitType: z.enum(['module', 'room', 'path-overview']),
  unitId: nonempty,
  title: nonempty,
  category: nonempty,
  summary: nonempty,
  documentationStatus: nonempty,
  evidenceStatus: z.enum(['pending', 'verified', 'not-required']),
  difficulty: z.enum(['Fundamental', 'Easy', 'Medium', 'Hard', 'Insane']).nullable(),
  date: documentedDate,
  dateVerification: z.enum(['source-reported', 'verified']).optional(),
  dateReference: nonempty.optional(),
  source: webUrl,
  tags: z.array(nonempty),
  publication: z.object({
    approved: z.boolean(),
    reviewer: nonempty.optional(),
    date: z.iso.date().optional(),
    sha256: z.string().regex(/^[a-f0-9]{64}$/).optional(),
  }).strict(),
  evidence: z.array(z.object({
    src: nonempty,
    section: nonempty,
    alt: nonempty,
    caption: nonempty,
    sha256: z.string().regex(/^[a-f0-9]{64}$/),
    verified: z.literal(true),
    sensitiveReviewed: z.literal(true),
  }).strict()),
}).strict().superRefine((r, ctx) => {
  if (r.dateVerification === 'verified' && !r.dateReference) {
    ctx.addIssue({ code: 'custom', message: 'A verified source date requires a reference to the original dated evidence' });
  }
  if ((r.platform === 'HTB' && r.unitType !== 'module') ||
      (r.platform === 'THM' && r.unitType === 'module') ||
      !r.slug.startsWith(r.platform.toLowerCase() + '-')) {
    ctx.addIssue({ code: 'custom', message: 'Platform, unit type and slug must agree' });
  }
});

export const esc = (v = '') => String(v).replaceAll('&', '&amp;').replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
export const sha256 = value => createHash('sha256').update(value).digest('hex');

// Approval covers the report and its metadata. Later edits require a fresh review.
export function approvalDigest(report, markdown) {
  const { publication, ...metadata } = report;
  const stable = value => Array.isArray(value) ? value.map(stable) : value && typeof value === 'object'
    ? Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])])) : value;
  return sha256(JSON.stringify(stable(metadata)) + '\n' + markdown);
}

export function isPublicationApproved(report, markdown) {
  const p = report.publication;
  return p.approved && report.evidenceStatus !== 'pending' && !!p.reviewer && !!p.date &&
    p.sha256 === approvalDigest(report, markdown);
}

export function renderReport(markdown) {
  /** @type {{depth: number, text: string, id: string}[]} */
  const headings = [];
  const slugger = new GithubSlugger();
  const parser = new Marked({ gfm: true, renderer: {
    heading({ tokens, depth }) {
      if (depth === 1) throw new Error('Article title belongs in the registry; use H2/H3 in Markdown');
      const text = this.parser.parseInline(tokens);
      const plain = decodeHTML(text.replace(/<[^>]*>/g, ''));
      const id = slugger.slug(plain);
      headings.push({ depth, text: plain, id });
      return `<h${depth} id="${esc(id)}">${text}</h${depth}>\n`;
    },
    paragraph({ tokens }) {
      if (tokens.length === 1 && tokens[0].type === 'image') {
        const img = tokens[0];
        if (!img.title || !img.text) throw new Error('Evidence images require alt text and a caption (image title)');
        return `<figure>${this.parser.parseInline(tokens)}<figcaption>${esc(img.title)}</figcaption></figure>\n`;
      }
      return `<p>${this.parser.parseInline(tokens)}</p>\n`;
    },
    image({ href, title, text }) {
      if (!href.startsWith('/writeups/evidence/')) throw new Error('Use local, reviewed evidence images');
      return `<img src="${esc(href)}" alt="${esc(text)}"${title ? ` title="${esc(title)}"` : ''} loading="lazy" decoding="async"/>`;
    },
    link({ href, title, tokens }) {
      const protocol = new URL(href, 'https://nero.invalid/').protocol;
      if (!['http:', 'https:', 'mailto:'].includes(protocol)) throw new Error('Unsupported Markdown link protocol');
      return `<a href="${esc(href)}"${title ? ` title="${esc(title)}"` : ''}>${this.parser.parseInline(tokens)}</a>`;
    },
    code({ text, lang }) {
      const language = (lang || '').trim().split(/\s+/)[0];
      return `<pre tabindex="0" aria-label="${esc(language || 'Text')} code block"><code${language ? ` class="language-${esc(language)}"` : ''}>${esc(text)}\n</code></pre>\n`;
    },
    table(token) {
      return Renderer.prototype.table.call(this, token).replace('<table>', '<table tabindex="0" aria-label="Report data table">');
    },
    html({ text }) { return esc(text); },
  } });
  const html = parser.parse(markdown);
  return { html, headings };
}

function evidencePath(root, src, reportSlug) {
  const prefix = `/writeups/evidence/${reportSlug}/`;
  if (!src.startsWith(prefix) || src.includes('..') || /[?#%\\]/.test(src)) {
    throw new Error(`Invalid evidence path: ${src}`);
  }
  const file = resolve(root, 'public', src.slice(1));
  const publicRoot = realpathSync(resolve(root, 'public')) + sep;
  if (!existsSync(file) || !realpathSync(file).startsWith(publicRoot)) throw new Error(`Missing evidence image: ${src}`);
  const data = readFileSync(file);
  const valid = (src.endsWith('.png') && data.subarray(0, 8).toString('hex') === '89504e470d0a1a0a') ||
    (/\.jpe?g$/.test(src) && data.subarray(0, 3).toString('hex') === 'ffd8ff') ||
    (src.endsWith('.webp') && data.subarray(0, 4).toString() === 'RIFF' && data.subarray(8, 12).toString() === 'WEBP') ||
    (src.endsWith('.gif') && /^GIF8[79]a$/.test(data.subarray(0, 6).toString()));
  if (!valid) throw new Error(`Invalid image signature: ${src}`);
  return data;
}

export function createReports(metadata, markdownBySlug, { root = process.cwd(), enforceApproval = true } = {}) {
  const registry = z.array(reportSchema).parse(metadata);
  const slugs = new Set(), units = new Set();
  const reports = registry.map(r => {
    const unit = `${r.platform}:${r.unitType}:${r.unitId.toLowerCase()}`;
    if (slugs.has(r.slug) || units.has(unit)) throw new Error(`Duplicate slug or module/room: ${r.slug}`);
    slugs.add(r.slug); units.add(unit);
    const markdown = markdownBySlug[r.slug];
    if (!markdown?.trim()) throw new Error(`Missing canonical Markdown: ${r.slug}`);
    const rendered = renderReport(markdown);
    const images = [], sections = [], standalone = new Set();
    let headingIndex = 0;
    new Marked().walkTokens(new Marked().lexer(markdown), t => {
      if (t.type === 'heading') {
        while (sections.length && sections.at(-1).depth >= t.depth) sections.pop();
        sections.push(rendered.headings[headingIndex++]);
      }
      if (t.type === 'paragraph' && t.tokens.length === 1 && t.tokens[0].type === 'image') standalone.add(t.tokens[0]);
      if (t.type === 'image') images.push({ token: t, sections: sections.map(h => h.id) });
    });
    const seen = new Set();
    for (const { token: img, sections: ancestors } of images) {
      if (!standalone.has(img)) throw new Error(`Evidence must be a standalone image paragraph with a visible caption: ${img.href}`);
      const e = r.evidence.find(e => e.src === img.href);
      if (!e || e.alt !== img.text || e.caption !== img.title) throw new Error(`Unreviewed image or mismatched caption: ${r.slug}: ${img.href}`);
      if (seen.has(img.href)) throw new Error(`Duplicate evidence image: ${img.href}`);
      seen.add(img.href);
      if (sha256(evidencePath(root, e.src, r.slug)) !== e.sha256) throw new Error(`Evidence checksum mismatch: ${e.src}`);
      if (!rendered.headings.some(h => h.id === e.section)) throw new Error(`Unknown evidence section: ${e.section}`);
      if (!ancestors.includes(e.section)) throw new Error(`Evidence is outside its associated section: ${e.src}`);
    }
    if (seen.size !== r.evidence.length) throw new Error(`Evidence must be attached inline: ${r.slug}`);
    if (r.evidenceStatus === 'verified' && !seen.size) throw new Error(`Verified evidence requires reviewed images: ${r.slug}`);
    if (enforceApproval && r.publication.approved && !isPublicationApproved(r, markdown)) {
      throw new Error(`Publication approval incomplete, pending, or stale: ${r.slug}. Revoke approval or review again.`);
    }
    const readingMinutes = Math.max(1, Math.ceil(markdown.trim().split(/\s+/).length / 200));
    return { ...r, markdown, ...rendered, readingMinutes, approved: isPublicationApproved(r, markdown) };
  });
  for (const key of Object.keys(markdownBySlug)) if (!slugs.has(key)) throw new Error(`Orphaned Markdown: ${key}`);
  return reports;
}

export function loadReports(root = process.cwd(), { enforceApproval = true } = {}) {
  const dir = resolve(root, 'content/writeups');
  const registry = JSON.parse(readFileSync(resolve(dir, 'registry.json'), 'utf8'));
  const markdown = Object.fromEntries(readdirSync(dir, { recursive: true }).filter(f => f.endsWith('.md'))
    .map(f => [f.slice(0, -3), readFileSync(resolve(dir, f), 'utf8')]));
  return createReports(registry, markdown, { root, enforceApproval });
}

export function visibleReports(reports, local) {
  return local ? reports : reports.filter(r => r.approved);
}
