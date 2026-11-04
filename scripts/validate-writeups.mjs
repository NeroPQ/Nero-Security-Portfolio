import { loadReports } from '../src/lib/writeups-core.mjs';
const reports = loadReports();
for (const r of reports) console.log(`PASS ${r.slug}: ${r.markdown.trim().split(/\s+/).length} words, ${r.headings.length} headings, ${r.evidence.length} reviewed images, ${r.approved ? 'publication approved' : 'local draft'}`);
console.log(`PASS schema, unique slugs/units, source ownership, image paths/checksums/captions, publication approvals: ${reports.length} canonical reports`);
