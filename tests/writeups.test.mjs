import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { marked } from 'marked';
import { loadReports, createReports, visibleReports, approvalDigest, sha256, reportSchema, renderReport } from '../src/lib/writeups-core.mjs';
import { writeupsBuild } from '../src/lib/writeups-build.mjs';

const reports = loadReports();
const registry = JSON.parse(fs.readFileSync('content/writeups/registry.json', 'utf8'));
const markdown = Object.fromEntries(reports.map(r => [r.slug, r.markdown]));
const copy = x => structuredClone(x);
const get = slug => reports.find(r => r.slug === slug);
const compact = s => s.replace(/\s+/g, ' ').trim();
const archive = 'archive/writeups-legacy/';

function body(s) {
  if (s.startsWith('---\n')) s = s.slice(s.indexOf('\n---', 4) + 4).trimStart();
  return s.replace(/^# [^\n]+\n/, '').trim();
}

test('A: all 17 Shells sections, full report, troubleshooting, defense and references survive', () => {
  const r = get('htb-shells-payloads');
  const source = fs.readFileSync(archive + 'notes/writeups/htb-shells-payloads.md', 'utf8');
  const expected = marked.lexer(source).filter(t => t.type === 'heading' && /^\d{2} — /.test(t.text));
  assert.equal(expected.length, 17);
  for (const h of expected) assert.equal(r.headings.filter(x => x.text === h.text).length, 1);
  for (const text of ['Troubleshooting and Technical Limitations', 'Security Implications', 'Lessons Learned', 'References', 'edgerouter-isp.yml', 'hostnameinfo.txt']) assert.ok(r.markdown.includes(text), text);
  assert.ok(r.markdown.split(/\s+/).length >= 3176);
});

test('B: full Metasploit report and independently labeled FortiLogger preserve verification limits', () => {
  const r = get('htb-metasploit');
  assert.equal(r.headings.filter(h => h.depth === 2 && /^(0[1-9]|1[0-5])\./.test(h.text)).length, 15);
  for (const text of ['Related Practical Case Study — FortiLogger / Meterpreter', 'independent related laboratory case', 'Meterpreter session 2 opened', 'Incorrect function', 'administrative/SYSTEM privileges remain unverified', 'EternalRomance', 'Apache Druid', 'elFinder', 'Baron Samedit']) assert.ok(r.markdown.includes(text), text);
  assert.ok(!reports.some(r => r.slug.includes('fortilogger')));
});

test('C: complete NEXURA assessment is inside Password Attacks, never a separate card', () => {
  const r = get('htb-password-attacks');
  assert.equal(r.headings.filter(h => h.depth === 2 && /^Section \d{2} —/.test(h.text)).length, 26);
  const start = r.markdown.indexOf('## Section 26 — Skills Assessment: NEXURA');
  const end = r.markdown.indexOf('## Cross-Module Technical Findings', start);
  const chapter = r.markdown.slice(start, end);
  for (const text of ['SMB Negotiation Troubleshooting', 'Successful SMB Access Through SSH Local Forwarding', 'Independent Reference Verification', 'Outcomes Not Verified Locally', 'NTDS', 'Defensive Perspective']) assert.ok(chapter.includes(text), text);
  assert.ok(chapter.split(/\s+/).length >= 2473);
  assert.ok(!reports.some(r => r.slug.includes('nexura')));
});

test('all substantive original Markdown blocks are retained, including supplementary notes', () => {
  const sources = {
    'htb-shells-payloads': ['notes/writeups/htb-shells-payloads.md'],
    'htb-metasploit': ['drafts/writeups/htb-metasploit/report.md', 'drafts/writeups/htb-metasploit/fortilogger-meterpreter.md', 'notes/writeups/htb-metasploit.md', 'src/data/writeups-drafts/htb-using-metasploit-framework-four-section-study-notes/report.md'],
    'htb-password-attacks': ['drafts/writeups/htb-academy-password-attacks-module-90/report.md', 'drafts/writeups/htb-password-attacks-skills-assessment-nexura/report.md'],
  };
  for (const [slug, files] of Object.entries(sources)) for (const file of files) {
    const canonical = compact(get(slug).markdown);
    for (const token of marked.lexer(body(fs.readFileSync(archive + file, 'utf8')))) {
      if (['space', 'heading', 'hr'].includes(token.type)) continue;
      assert.ok(canonical.includes(compact(token.raw)), `${file}: missing ${token.type}: ${token.raw.slice(0, 90)}`);
    }
  }
});

test('D: unique slugs and platform/module identities; missing and orphaned sources fail validation', () => {
  assert.equal(new Set(reports.map(r => r.slug)).size, reports.length);
  assert.throws(() => createReports([...registry, registry[0]], markdown), /Duplicate/);
  const duplicate = copy(registry); duplicate.push({ ...duplicate[0], slug: `${duplicate[0].platform.toLowerCase()}-duplicate` });
  assert.throws(() => createReports(duplicate, { ...markdown, [`${duplicate[0].platform.toLowerCase()}-duplicate`]: markdown[registry[0].slug] }), /Duplicate/);
  const absent = { ...markdown }; delete absent['htb-shells-payloads'];
  assert.throws(() => createReports(registry, absent), /Missing canonical/);
  assert.throws(() => createReports(registry, { ...markdown, 'htb-orphan': '## Lost report' }), /Orphaned/);
});

test('E/F: ordinary local visibility includes pending reports; production ignores old draft flags', () => {
  process.env.NERO_SHOW_DRAFTS = '1'; process.env.NERO_DRAFT_PREVIEW = '1';
  try {
    assert.equal(visibleReports(reports, true).length, reports.length);
    assert.deepEqual(visibleReports(reports, false), reports.filter(r => r.approved));
    const draft = { ...copy(registry[0]), evidenceStatus: 'pending', evidence: [], publication: { approved: false } };
    const sample = createReports([draft], { [draft.slug]: '## Overview\n\nPending evidence.\n' });
    assert.equal(visibleReports(sample, true).length, 1);
    assert.equal(visibleReports(sample, false).length, 0);
  } finally { delete process.env.NERO_SHOW_DRAFTS; delete process.env.NERO_DRAFT_PREVIEW; }
});

test('approval is explicit, disallows pending evidence, and becomes invalid after source/metadata changes', () => {
  const r = copy(registry[0]);
  r.evidenceStatus = 'pending'; r.evidence = [];
  r.publication = { approved: true, reviewer: 'test reviewer', date: '2026-11-02', sha256: approvalDigest(r, markdown[r.slug]) };
  assert.throws(() => createReports([r], { [r.slug]: markdown[r.slug] }), /approval/);
  r.evidenceStatus = 'not-required'; r.publication.sha256 = approvalDigest(r, markdown[r.slug]);
  assert.equal(visibleReports(createReports([r], { [r.slug]: markdown[r.slug] }), false).length, 1);
  assert.throws(() => createReports([r], { [r.slug]: markdown[r.slug] + '\nNew finding.\n' }), /approval/);
  r.summary += ' Changed.';
  assert.throws(() => createReports([r], { [r.slug]: markdown[r.slug] }), /approval/);
  const local = createReports([r], { [r.slug]: markdown[r.slug] }, { enforceApproval: false });
  assert.equal(visibleReports(local, true).length, 1);
  assert.equal(visibleReports(local, false).length, 0);
});

test('inline evidence requires verified association, file signature, checksum, caption and redaction review', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'nero-evidence-test-'));
  try {
    const r = copy(registry[0]);
    const src = `/writeups/evidence/${r.slug}/overview/test.png`;
    const file = path.join(root, 'public', src);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    // Synthetic 1px test fixture, never a lab screenshot or stored in public/.
    const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jXioAAAAASUVORK5CYII=', 'base64');
    fs.writeFileSync(file, png);
    r.evidence = [{ src, section: 'overview', alt: 'Test fixture', caption: 'Validation fixture only', sha256: sha256(png), verified: true, sensitiveReviewed: true }];
    const md = `## Overview\n\n![Test fixture](${src} "Validation fixture only")\n`;
    const result = createReports([r], { [r.slug]: md }, { root });
    assert.match(result[0].html, /<figure><img/);
    assert.match(result[0].html, /<figcaption>Validation fixture only<\/figcaption>/);
    r.evidence[0].section = 'other-section';
    assert.throws(() => createReports([r], { [r.slug]: md + '\n## Other section\n' }, { root }), /outside its associated section/);
    r.evidence[0].section = 'overview';
    r.evidence[0].alt = 'Wrong association';
    assert.throws(() => createReports([r], { [r.slug]: md }, { root }), /Unreviewed image/);
    r.evidence[0].alt = 'Test fixture'; r.evidence[0].sha256 = '0'.repeat(64);
    assert.throws(() => createReports([r], { [r.slug]: md }, { root }), /checksum/);
    r.evidence[0].sha256 = sha256(png); fs.writeFileSync(file, 'not an image');
    assert.throws(() => createReports([r], { [r.slug]: md }, { root }), /Invalid image/);
    fs.unlinkSync(file);
    assert.throws(() => createReports([r], { [r.slug]: md }, { root }), /Missing evidence/);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test('production build removes orphaned and draft evidence while leaving original files untouched', () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'nero-build-test-'));
  try {
    const dest = path.join(temp, 'writeups/evidence/unregistered/private.png');
    fs.mkdirSync(path.dirname(dest), { recursive: true }); fs.writeFileSync(dest, 'fixture');
    writeupsBuild().hooks['astro:build:done']({ dir: new URL('file://' + temp + '/') });
    assert.ok(!fs.existsSync(dest));
    assert.ok(fs.existsSync('public/writeups/evidence/htb-shells-payloads/evidence-manifest.json'));
  } finally { fs.rmSync(temp, { recursive: true, force: true }); }
});

test('future workflow updates a section idempotently and resolves existing module instead of creating a card', () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'nero-workflow-test-'));
  const cli = fileURLToPath(new URL('../scripts/writeups.mjs', import.meta.url));
  try {
    const fixture = registry.filter(r => ['htb-footprinting', 'htb-metasploit'].includes(r.slug))
      .map(r => ({ ...r, evidenceStatus: 'pending', evidence: [], publication: { approved: false } }));
    fs.mkdirSync(path.join(temp, 'content/writeups'), { recursive: true });
    fs.writeFileSync(path.join(temp, 'content/writeups/registry.json'), JSON.stringify(fixture));
    for (const r of fixture) fs.writeFileSync(path.join(temp, 'content/writeups', r.slug + '.md'), '## Overview\n\nRetained initial observation.\n');
    const section = path.join(temp, 'section.md'); fs.writeFileSync(section, 'A retained observation with evidence pending.\n');
    const run = args => { const r = spawnSync(process.execPath, [cli, ...args], { cwd: temp, encoding: 'utf8' }); assert.equal(r.status, 0, r.stderr); return r; };
    run(['section', 'htb-footprinting', '--heading', 'Additional service observations', '--file', section, '--append']);
    const before = fs.readFileSync(path.join(temp, 'content/writeups/htb-footprinting.md'), 'utf8');
    run(['section', 'htb-footprinting', '--heading', 'Additional service observations', '--file', section, '--append']);
    const after = fs.readFileSync(path.join(temp, 'content/writeups/htb-footprinting.md'), 'utf8');
    assert.equal(after, before);
    assert.equal(after.split('## Additional service observations').length, 2);
    const result = run(['new', '--platform', 'HTB', '--unit-id', '39', '--slug', 'htb-another-metasploit', '--title', 'Duplicate', '--source', 'https://example.com']);
    assert.match(result.stdout, /Existing module\/room: htb-metasploit/);
    assert.equal(JSON.parse(fs.readFileSync(path.join(temp, 'content/writeups/registry.json'))).length, fixture.length);
    run(['new', '--platform', 'THM', '--unit-id', 'test-room', '--slug', 'thm-test-room', '--title', 'Test room', '--source', 'https://tryhackme.com/room/test-room']);
    assert.equal(JSON.parse(fs.readFileSync(path.join(temp, 'content/writeups/registry.json'))).length, fixture.length + 1);
  } finally { fs.rmSync(temp, { recursive: true, force: true }); }
});

test('heading text and anchors preserve decoded punctuation, entities and inline formatting', () => {
  const r = renderReport('## A & "B"\n\n## A &amp; "B"\n\n## Use `tool` with **care**\n');
  assert.equal(r.headings[0].text, 'A & "B"');
  assert.equal(r.headings[0].id, 'a--b');
  assert.equal(r.headings[1].text, 'A & "B"');
  assert.equal(r.headings[1].id, 'a--b-1');
  assert.equal(r.headings[2].text, 'Use tool with care');
});

test('metadata validates partial and full dates and platform URLs without inventing precision', () => {
  for (const date of ['2026', '2026-10', '2026-10-30']) assert.ok(reportSchema.safeParse({ ...registry[0], date }).success);
  for (const date of ['October 2026', '2026-13', '2026-02-30']) assert.ok(!reportSchema.safeParse({ ...registry[0], date }).success);
  assert.ok(!reportSchema.safeParse({ ...registry[0], source: 'about:blank' }).success);
  assert.ok(!reportSchema.safeParse({ ...registry[0], dateVerification: 'verified', dateReference: undefined }).success);
  assert.ok(reportSchema.safeParse({ ...registry[0], dateVerification: 'verified', dateReference: 'Original dated transcript retained privately: lab-2026-10-30.txt' }).success);
  assert.throws(() => renderReport('## Links\n\n[Invalid format](data:text/plain,example)\n'), /Unsupported Markdown link protocol/);
});

test('review config output is isolated from deployment output', async () => {
  const prod = (await import('../astro.config.mjs')).default;
  const review = (await import('../astro.review.config.mjs')).default;
  assert.equal(prod.outDir, './dist/'); assert.equal(review.outDir, './.review/');
  assert.equal(prod.trailingSlash, 'always'); assert.equal(prod.server.port, 4321);
});
