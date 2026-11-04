import net from 'node:net';
import { spawn, spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';

const require = createRequire(import.meta.url);
const astroPackage = require.resolve('astro/package.json');
const astroCli = resolve(dirname(astroPackage), require(astroPackage).bin.astro);

const [command = 'dev', ...args] = process.argv.slice(2);
if (!['dev', 'preview'].includes(command) || args.some(a => /^--(port|host|background|force|ignore-lock)(=|$)/.test(a))) {
  console.error('Use dev or preview at http://127.0.0.1:4321/. Port/host overrides, background mode and forced restarts are disabled.');
  process.exit(1);
}
const probe = net.createServer();
probe.once('error', err => {
  console.error(`Cannot start ${command} at 127.0.0.1:4321: ${err.code}. No process was terminated.`);
  const result = spawnSync('ss', ['-ltnp', '( sport = :4321 )'], { encoding: 'utf8' });
  console.error(result.stdout || result.error?.message || 'Use ss -ltnp to identify the conflicting process.');
  process.exit(1);
});
probe.listen(4321, '127.0.0.1', () => probe.close(() => {
  // Astro 7 can auto-background under agents. The wrapper owns the port check and
  // foreground lifecycle, including Ctrl+C and Playwright shutdown.
  const child = spawn(process.execPath, [astroCli, command, ...args, '--ignore-lock', '--host', '127.0.0.1', '--port', '4321'], { stdio: 'inherit' });
  for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal));
  child.on('error', err => { console.error(err); process.exitCode = 1; });
  child.on('exit', (code, signal) => { process.exitCode = code ?? (signal ? 1 : 0); });
}));
