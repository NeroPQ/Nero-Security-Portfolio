import { spawnSync } from 'node:child_process';
import { loadReports } from '../src/lib/writeups-core.mjs';
import { cves } from '../src/data/cves.mjs';
const [directory = 'dist', mode = 'production'] = process.argv.slice(2);
if (!['production', 'review'].includes(mode)) throw new Error('Mode must be production or review');
const result = spawnSync('python3', ['scripts/verify_site.py', directory, mode], {
  input: JSON.stringify({ reports: loadReports(process.cwd(), { enforceApproval: mode !== 'review' }), research: cves.map(c => c.slug) }),
  encoding: 'utf8', maxBuffer: 10 * 1024 * 1024,
});
if (result.stdout) process.stdout.write(result.stdout);
if (result.stderr) process.stderr.write(result.stderr);
if (result.error) console.error(result.error);
process.exitCode = result.status ?? 1;
