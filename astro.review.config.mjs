import { defineConfig } from 'astro/config';
import production from './astro.config.mjs';
import { writeupsBuild } from './src/lib/writeups-build.mjs';

// Same pages and renderer; separate output prevents review overwriting dist/.
export default defineConfig({ ...production, outDir: './.review/', integrations: [writeupsBuild({ review: true })] });
