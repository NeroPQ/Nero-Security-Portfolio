import { readdirSync, rmSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, relative } from 'node:path';
import { loadReports, visibleReports } from './writeups-core.mjs';

export function writeupsBuild({ review = false } = {}) {
  return {
    name: 'canonical-writeups-validation',
    hooks: {
      'astro:build:start': () => { loadReports(process.cwd(), { enforceApproval: !review }); },
      'astro:build:done': ({ dir }) => {
        const root = fileURLToPath(dir);
        const evidenceRoot = join(root, 'writeups/evidence');
        const allowed = new Set(visibleReports(loadReports(process.cwd(), { enforceApproval: !review }), review).flatMap(r => r.evidence.map(e => e.src.slice(1))));
        // Astro copies public/. Keep only reviewed inline images for included reports.
        function prune(directory) {
          if (!existsSync(directory)) return;
          for (const entry of readdirSync(directory, { withFileTypes: true })) {
            const file = join(directory, entry.name);
            if (entry.isDirectory()) prune(file);
            else if (!allowed.has(relative(root, file))) rmSync(file);
          }
          if (!readdirSync(directory).length) rmSync(directory, { recursive: true });
        }
        prune(evidenceRoot);
      },
    },
  };
}
