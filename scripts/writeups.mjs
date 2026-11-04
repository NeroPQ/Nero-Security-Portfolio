import { readFileSync, writeFileSync, renameSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { Marked } from 'marked';
import { loadReports, reportSchema, createReports, approvalDigest } from '../src/lib/writeups-core.mjs';

const { values, positionals } = parseArgs({ allowPositionals: true, options: {
  platform: { type: 'string' }, 'unit-id': { type: 'string' }, slug: { type: 'string' },
  title: { type: 'string' }, source: { type: 'string' }, heading: { type: 'string' },
  file: { type: 'string' }, reviewer: { type: 'string' }, date: { type: 'string' },
  append: { type: 'boolean', default: false },
} });
const [command = 'help', requested] = positionals;
const reports = loadReports(process.cwd(), { enforceApproval: false });
const dir = resolve('content/writeups');
const registry = JSON.parse(readFileSync(resolve(dir, 'registry.json'), 'utf8'));
const contents = Object.fromEntries(reports.map(r => [r.slug, r.markdown]));
function save(slug, markdown) {
  createReports(registry, { ...contents, [slug]: markdown });
  const target = resolve(dir, slug + '.md');
  // Validate the entire proposed change before touching canonical inputs.
  writeFileSync(target + '.tmp', markdown);
  renameSync(target + '.tmp', target);
  const metadata = resolve(dir, 'registry.json');
  writeFileSync(metadata + '.tmp', JSON.stringify(registry, null, 2) + '\n');
  renameSync(metadata + '.tmp', metadata);
}
function find() {
  const report = registry.find(r => r.slug === requested);
  if (!report) throw new Error('Unknown canonical slug: ' + requested);
  return report;
}
if (command === 'resolve') {
  const r = find();
  console.log(resolve(dir, r.slug + '.md'));
} else if (command === 'new') {
  const existing = registry.find(r => r.platform === values.platform && r.unitId.toLowerCase() === values['unit-id']?.trim().toLowerCase());
  if (existing) {
    console.log(`Existing module/room: ${existing.slug}. Update ${resolve(dir, existing.slug + '.md')}; no new card created.`);
  } else {
    const entry = reportSchema.parse({
      slug: values.slug, platform: values.platform, unitId: values['unit-id'],
      unitType: values.platform === 'HTB' ? 'module' : 'room', title: values.title,
      category: 'Learning Notes', summary: 'Work in progress; documented findings will be added as they are verified.',
      documentationStatus: 'Learning notes; completion not verified', evidenceStatus: 'pending',
      difficulty: null, date: new Date().toISOString().slice(0, 10), source: values.source,
      tags: [], publication: { approved: false }, evidence: [],
    });
    registry.push(entry);
    save(entry.slug, '## Overview\n\nDocumentation in progress. Completion and screenshot evidence are pending.\n');
    console.log('Created ' + resolve(dir, entry.slug + '.md'));
  }
} else if (command === 'section') {
  const r = find();
  if (!values.heading || !values.file) throw new Error('section requires --heading and --file');
  const replacement = readFileSync(resolve(values.file), 'utf8').trim();
  if (!replacement) throw new Error('Replacement section is empty');
  const parser = new Marked();
  const tokens = parser.lexer(contents[r.slug]);
  const matches = tokens.map((t, i) => t.type === 'heading' && t.text === values.heading ? i : -1).filter(i => i >= 0);
  if (matches.length > 1) throw new Error('Ambiguous section heading; edit the canonical Markdown with a unique heading');
  let updated;
  if (matches.length) {
    const start = matches[0], depth = tokens[start].depth;
    let end = start + 1;
    while (end < tokens.length && !(tokens[end].type === 'heading' && tokens[end].depth <= depth)) end++;
    if (parser.lexer(replacement).some(t => t.type === 'heading' && t.depth <= depth)) {
      throw new Error('Section body headings must be deeper than the updated section');
    }
    const tail = tokens.slice(end).map(t => t.raw).join('').trimStart();
    updated = tokens.slice(0, start).map(t => t.raw).join('') + '#'.repeat(depth) + ' ' + values.heading + '\n\n' + replacement + '\n' + (tail ? '\n' + tail : '');
  } else {
    if (!values.append) throw new Error('Heading not found. Use --append for a new chapter, or correct the heading.');
    if (parser.lexer(replacement).some(t => t.type === 'heading' && t.depth <= 2)) throw new Error('New chapter body must use H3 or deeper headings');
    updated = contents[r.slug].trimEnd() + '\n\n## ' + values.heading + '\n\n' + replacement + '\n';
  }
  if (updated === contents[r.slug]) console.log('Unchanged; no duplicate section or card created.');
  else {
    r.publication = { approved: false };
    save(r.slug, updated);
    console.log('Updated ' + resolve(dir, r.slug + '.md') + '; publication approval revoked.');
  }
} else if (command === 'approve') {
  const r = find();
  if (!values.reviewer || !values.date) throw new Error('approve requires --reviewer and --date YYYY-MM-DD');
  if (r.evidenceStatus === 'pending') throw new Error('Evidence Pending reports cannot be approved. Review genuine evidence first.');
  r.publication = { approved: true, reviewer: values.reviewer, date: values.date, sha256: approvalDigest(r, contents[r.slug]) };
  save(r.slug, contents[r.slug]);
  console.log('Approved reviewed revision: ' + r.slug);
} else if (command === 'revoke') {
  const r = find(); r.publication = { approved: false }; save(r.slug, contents[r.slug]);
  console.log('Publication approval revoked: ' + r.slug);
} else {
  console.log(`Usage: npm run writeups -- <command>
  resolve <slug>
  new --platform HTB|THM --unit-id ID --slug SLUG --title TITLE --source URL
  section <slug> --heading "Exact heading" --file section.md [--append]
  approve <slug> --reviewer NAME --date YYYY-MM-DD
  revoke <slug>

Canonical Markdown: content/writeups/<slug>.md
Metadata and evidence: content/writeups/registry.json
Validate: npm run validate:writeups`);
}
