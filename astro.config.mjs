import { defineConfig } from 'astro/config';
import { writeupsBuild } from './src/lib/writeups-build.mjs';

export default defineConfig({
  site: 'https://nero-sec.pages.dev',
  output: 'static',
  trailingSlash: 'always',
  outDir: './dist/',
  server: { host: '127.0.0.1', port: 4321 },
  devToolbar: { enabled: false },
  vite: { server: { strictPort: true } },
  integrations: [writeupsBuild({ review: true })],
});
