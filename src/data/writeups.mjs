import registry from '../../content/writeups/registry.json';
import { createReports, visibleReports } from '../lib/writeups-core.mjs';

// Eager raw imports let Vite track every source edit, including newly added reports.
const sources = import.meta.glob('../../content/writeups/*.md', { query: '?raw', import: 'default', eager: true });
const markdown = Object.fromEntries(Object.entries(sources).map(([file, text]) => [file.split('/').pop().slice(0, -3), text]));
export const localReview = import.meta.env.DEV || import.meta.env.MODE === 'review';
const reports = createReports(registry, markdown, { enforceApproval: !localReview });
/** @type {import('../lib/writeups-types').Writeup[]} */
export const writeups = visibleReports(reports, localReview);
